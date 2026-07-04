/*
 * Wevolv3 — Adoption Diagnostic (v2, WeKOLnect stack)
 *
 * Scores the gap between ATTENTION (real X/Twitter reach) and ADOPTION (real
 * on-chain usage) for any token, then gates the full report behind an
 * email + Telegram capture and emails it via Resend.
 *
 * Data pipeline (CoinGecko-free — no more rate-limit hell):
 *   - GeckoTerminal (free, no key)  -> resolve token, on-chain volume/mcap/liquidity, project socials
 *   - DexScreener  (free, no key)   -> 24h transaction count, liquidity fallback
 *   - twitterapi.io (TWITTERAPI_IO_KEY) -> real followers / verified / activity = ATTENTION
 *   - OpenRouter or OpenAI (key)    -> 3 personalized recommendations
 *   - Resend (RESEND_API_KEY)       -> emails the report to the captured lead
 *   - Telegram (existing bot)       -> notifies the team of every new lead
 *
 * Every paid dependency degrades gracefully: no key => that layer is skipped,
 * the tool still returns a useful result. Scores are a directional heuristic on
 * public data, not financial advice.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// ---- env (all optional; graceful degradation) ------------------------------
const TWITTER_KEY = process.env.TWITTERAPI_IO_KEY || "";
const RESEND_KEY = process.env.RESEND_API_KEY || "";
const EMAIL_FROM = process.env.EMAIL_FROM || "Wevolv3 <onboarding@resend.dev>";
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY || "";
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "deepseek/deepseek-v4-flash";
const OPENAI_KEY = process.env.OPENAI_API_KEY || "";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
// lead notifications reuse the same Telegram bot the contact form uses.
// Both come from env only (no hardcoded credentials); if unset, the Telegram
// notify is skipped and the lead still gets the on-screen + emailed report.
const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const TG_CHATS = (process.env.TELEGRAM_CHAT_ID || "")
  .split(/[,;\n]/).map((s) => s.trim()).filter(Boolean);

const EVM_RE = /^0x[a-fA-F0-9]{40}$/;
const SOL_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const json = (statusCode, body) => ({
  statusCode,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
  body: JSON.stringify(body),
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const num = (v) => (v == null || v === "" || isNaN(Number(v)) ? null : Number(v));

async function getJson(url, opts = {}, retries = 2) {
  let lastErr;
  for (let i = 0; i <= retries; i++) {
    if (i) await sleep(500 * i);
    try {
      const res = await fetch(url, opts);
      if (res.ok) return res.json();
      if (res.status === 429 || res.status >= 500) { lastErr = new Error("HTTP " + res.status); continue; }
      throw new Error("HTTP " + res.status + " for " + url);
    } catch (e) { lastErr = e; }
  }
  throw lastErr || new Error("fetch failed");
}

// warm-instance cache (fresh 10 min; kept as last-known-good beyond that)
const CACHE = new Map();
const TTL = 10 * 60 * 1000;
const cacheGet = (k) => { const e = CACHE.get(k); return e && Date.now() - e.t < TTL ? e.v : null; };
const cacheStale = (k) => { const e = CACHE.get(k); return e ? e.v : null; };
const cacheSet = (k, v) => CACHE.set(k, { t: Date.now(), v });

// ---- scoring ---------------------------------------------------------------
const clamp = (n) => Math.max(0, Math.min(100, Math.round(n)));
const logScale = (v, ceil) => (!v || v <= 0 ? 0 : Math.min(100, (Math.log10(v + 1) / Math.log10(ceil)) * 100));

function weighted(parts) {
  let tw = 0, acc = 0;
  parts.forEach((p) => { if (p.has) { acc += p.score * p.weight; tw += p.weight; } });
  return tw === 0 ? null : clamp(acc / tw);
}

function attentionScore(a) {
  if (!a) return null;
  return weighted([
    { score: logScale(a.followers, 1000000), weight: 0.7, has: a.followers != null }, // 1M followers = ceiling
    { score: a.isVerified ? 100 : 45, weight: 0.15, has: a.isVerified != null },
    { score: logScale(a.tweetCount, 20000), weight: 0.15, has: a.tweetCount != null }, // account activity
  ]);
}

function adoptionScore(m) {
  const turnover = m.volume && m.mcap ? m.volume / m.mcap : 0;
  const liqRatio = m.liquidity && m.mcap ? m.liquidity / m.mcap : 0;
  return weighted([
    { score: Math.min(100, (turnover / 0.2) * 100), weight: 0.5, has: !!(m.volume && m.mcap) },
    { score: logScale(m.txns24h, 5000), weight: 0.3, has: m.txns24h != null },
    { score: Math.min(100, (liqRatio / 0.05) * 100), weight: 0.2, has: m.liquidity != null },
  ]);
}

function verdict(attention, adoption) {
  const gap = attention != null && adoption != null ? attention - adoption : null;
  if (gap == null)
    return { key: "adoption-only", headline: "Real adoption, limited attention data", body: "We can read on-chain usage, but this project has thin public social presence to score against. Getting the right eyes on it is where a growth partner moves the needle." };
  if (gap >= 25)
    return { key: "attention-heavy", headline: "High attention, low adoption", body: "People are watching, but far fewer are actually using or trading. The classic vanity-metrics trap: a big audience that never converts into sticky adoption. This is exactly the gap Wevolv3 closes." };
  if (gap <= -15)
    return { key: "adoption-heavy", headline: "Real adoption, under the radar", body: "You have genuine on-chain usage relative to your reach. The product works and people transact, but not enough of the market knows. More visibility would compound the growth you already have." };
  return { key: "balanced", headline: "Attention and adoption are roughly balanced", body: "Interest and real usage are moving together, which is healthy. The next step is compounding both at once so neither becomes the bottleneck as you scale." };
}

// ---- data fetchers ---------------------------------------------------------
// Canonical tokens usually live on a major EVM chain; bridged copies (often on
// other chains) can have deeper liquidity but no project socials. Rank by
// (network priority, reserve) so we resolve to the canonical token, not a bridge.
const NET_WEIGHT = { eth: 1.6, base: 1.4, bsc: 1.3, arbitrum: 1.2, polygon_pos: 1.15, optimism: 1.15, avax: 1.1, solana: 1.0 };

// GeckoTerminal search: name/symbol -> ranked list of distinct { network, address }
async function resolveCandidates(query) {
  const d = await getJson("https://api.geckoterminal.com/api/v2/search/pools?query=" + encodeURIComponent(query), { headers: { Accept: "application/json" } });
  const pools = (d && d.data) || [];
  if (!pools.length) return [];
  const seen = new Set();
  const parsed = [];
  for (const p of pools) {
    const id = p.relationships?.base_token?.data?.id || "";
    const i = id.indexOf("_");
    if (i < 0 || seen.has(id)) continue;
    seen.add(id);
    const network = id.slice(0, i);
    const reserve = num(p.attributes?.reserve_in_usd) || 0;
    parsed.push({ network, address: id.slice(i + 1), score: reserve * (NET_WEIGHT[network] || 0.9) });
  }
  parsed.sort((a, b) => b.score - a.score);
  return parsed.slice(0, 3);
}

// DexScreener: contract -> chain + adoption (multi-chain, generous limits)
async function fromDex(address) {
  const d = await getJson("https://api.dexscreener.com/latest/dex/tokens/" + encodeURIComponent(address));
  const pairs = (d && d.pairs) || [];
  if (!pairs.length) return null;
  pairs.sort((a, b) => (a.liquidity?.usd || 0) < (b.liquidity?.usd || 0) ? 1 : -1);
  const p = pairs[0];
  const tx = p.txns?.h24 || {};
  return {
    name: p.baseToken?.name || p.baseToken?.symbol || "Token",
    symbol: (p.baseToken?.symbol || "").toUpperCase(),
    image: p.info?.imageUrl || null,
    chain: p.chainId || null,
    dexNetwork: null,
    volume: num(p.volume?.h24) || 0,
    mcap: num(p.marketCap) || num(p.fdv) || 0,
    liquidity: num(p.liquidity?.usd) || 0,
    txns24h: (tx.buys || 0) + (tx.sells || 0),
    priceUsd: num(p.priceUsd),
  };
}

// GeckoTerminal token market data + info (socials)
async function fromGecko(network, address) {
  const base = "https://api.geckoterminal.com/api/v2/networks/" + network + "/tokens/" + address;
  const [tok, info] = await Promise.allSettled([
    getJson(base, { headers: { Accept: "application/json" } }),
    getJson(base + "/info", { headers: { Accept: "application/json" } }),
  ]);
  const a = tok.status === "fulfilled" ? tok.value?.data?.attributes || {} : {};
  const inf = info.status === "fulfilled" ? info.value?.data?.attributes || {} : {};
  return {
    name: a.name || inf.name || "Token",
    symbol: (a.symbol || inf.symbol || "").toUpperCase(),
    image: inf.image_url || a.image_url || null,
    chain: network,
    volume: num((a.volume_usd || {}).h24) || 0,
    mcap: num(a.market_cap_usd) || num(a.fdv_usd) || 0,
    liquidity: num(a.total_reserve_in_usd) || 0,
    priceUsd: num(a.price_usd),
    twitter: inf.twitter_handle || null,
    telegram: inf.telegram_handle || null,
    website: (inf.websites || [])[0] || null,
  };
}

// twitterapi.io: real X reach for the project handle = ATTENTION (key-gated)
async function fromTwitter(handle) {
  if (!TWITTER_KEY || !handle) return null;
  const clean = String(handle).replace(/^@/, "").split("/").pop();
  try {
    const d = await getJson("https://api.twitterapi.io/twitter/user/info?userName=" + encodeURIComponent(clean), { headers: { "x-api-key": TWITTER_KEY } });
    const u = d && d.data;
    if (!u) return null;
    return {
      handle: u.userName || clean,
      followers: num(u.followers),
      following: num(u.following),
      tweetCount: num(u.statusesCount),
      isVerified: !!(u.isBlueVerified || u.isVerified),
    };
  } catch (_) { return null; }
}

// AI recommendations (OpenRouter preferred, then OpenAI). Falls back to rules.
async function recommendations(ctx) {
  const prompt =
    "You are a senior Web3 growth strategist at Wevolv3. A project just ran an Adoption Check.\n" +
    "Token: " + ctx.name + " (" + ctx.symbol + ") on " + (ctx.chain || "unknown chain") + ".\n" +
    "Attention score: " + (ctx.attention ?? "n/a") + "/100. Adoption score: " + ctx.adoption + "/100. Gap: " + (ctx.gap ?? "n/a") + ".\n" +
    "Real signals: X followers " + (ctx.followers ?? "n/a") + ", 24h volume $" + Math.round(ctx.volume || 0) + ", market cap $" + Math.round(ctx.mcap || 0) + ", 24h txns " + (ctx.txns24h ?? "n/a") + ".\n" +
    "Give exactly 3 specific, concrete next actions this project should take to close its attention/adoption gap. " +
    "Each action: max 22 words, imperative, no fluff, no markdown. Return a JSON array of 3 strings only.";

  async function callOpenAILike(url, model, key) {
    const d = await getJson(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + key },
      body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }], temperature: 0.6, max_tokens: 320 }),
    }, 1);
    const txt = d.choices?.[0]?.message?.content || "";
    const match = txt.match(/\[[\s\S]*\]/);
    const arr = JSON.parse(match ? match[0] : txt);
    return Array.isArray(arr) ? arr.slice(0, 3).map(String) : null;
  }

  try {
    if (OPENROUTER_KEY) {
      const r = await callOpenAILike("https://openrouter.ai/api/v1/chat/completions", OPENROUTER_MODEL, OPENROUTER_KEY);
      if (r && r.length) return { items: r, source: "ai" };
    }
    if (OPENAI_KEY) {
      const r = await callOpenAILike("https://api.openai.com/v1/chat/completions", OPENAI_MODEL, OPENAI_KEY);
      if (r && r.length) return { items: r, source: "ai" };
    }
  } catch (_) { /* fall through to rules */ }

  // rule-based fallback so the report always has recommendations
  const gap = ctx.gap;
  let items;
  if (gap != null && gap >= 25)
    items = [
      "Convert reach into on-chain action: run KOL campaigns tied to a clear, trackable first transaction.",
      "Fix the funnel between social and wallet: audit where interested users drop before transacting.",
      "Add recurring reasons to transact (quests, incentives, utility) so attention compounds into retention.",
    ];
  else if (gap != null && gap <= -15)
    items = [
      "Amplify proven usage: your product works, now put it in front of the right audiences at scale.",
      "Turn real users into public proof with case studies, on-chain stats and creator content.",
      "Expand awareness through targeted PR and KOLs before competitors claim your narrative.",
    ];
  else
    items = [
      "Set one primary growth metric (holders, volume or active wallets) and align all campaigns to it.",
      "Layer KOL, PR and community so attention and usage grow together, not in isolation.",
      "Instrument attribution end-to-end so every campaign ties to a real on-chain outcome.",
    ];
  return { items, source: "rules" };
}

// ---- lead capture + email --------------------------------------------------
function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

async function notifyTelegram(lead, token, scores, verdictObj) {
  if (!TG_TOKEN || !TG_CHATS.length) return; // no creds configured -> skip quietly
  const lines = [
    "\u{1F3AF} <b>NEW ADOPTION CHECK LEAD</b>",
    "",
    "\u{1F464} <b>Lead</b>",
    "<b>Email:</b> " + esc(lead.email),
    "<b>Telegram:</b> " + esc(lead.telegram),
    "",
    "\u{1F4CA} <b>Their project</b>",
    "<b>Token:</b> " + esc(token.name) + " (" + esc(token.symbol) + ")",
    "<b>Attention:</b> " + (scores.attention ?? "n/a") + "/100  <b>Adoption:</b> " + scores.adoption + "/100",
    "<b>Verdict:</b> " + esc(verdictObj.headline),
    "",
    "Sent from wevolv3.com/adoption-check",
  ];
  const text = lines.join("\n");
  await Promise.allSettled(TG_CHATS.map((chat) =>
    fetch("https://api.telegram.org/bot" + TG_TOKEN + "/sendMessage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chat, text, parse_mode: "HTML" }),
    })
  ));
}

function reportEmailHtml(token, scores, verdictObj, recs) {
  const chartUrl = quickChartUrl(scores);
  const rec = recs.items
    .map((r) => `<li style="margin:0 0 10px;color:#1a1a1a;font-size:15px;line-height:1.5">${esc(r)}</li>`)
    .join("");
  const gapLabel = scores.gap != null ? `Gap: ${scores.gap > 0 ? "+" : ""}${scores.gap} points` : "Adoption read";
  return `
<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#ffffff;border-radius:12px;overflow:hidden">
  <div style="padding:28px 28px 8px">
    <div style="color:#10b981;font-size:12px;letter-spacing:2px;text-transform:uppercase">Wevolv3 &middot; Adoption Report</div>
    <h1 style="font-size:24px;margin:10px 0 2px;color:#ffffff">${esc(token.name)} (${esc(token.symbol)})</h1>
    <div style="color:#8a8a8a;font-size:13px">${esc(token.chain || "")}</div>
  </div>
  <div style="padding:12px 28px">
    <img src="${chartUrl}" alt="Attention vs Adoption" width="544" style="width:100%;border-radius:8px;border:1px solid #222222" />
  </div>
  <div style="padding:8px 28px">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td style="padding:14px;background:#0f0f0f;border:1px solid #222222;border-radius:8px">
        <div style="color:#6b8cff;font-size:11px;letter-spacing:1px;text-transform:uppercase">Attention</div>
        <div style="font-size:34px;font-weight:bold;color:#ffffff">${scores.attention == null ? "N/A" : scores.attention}<span style="font-size:14px;color:#666666"> /100</span></div>
      </td>
      <td width="12"></td>
      <td style="padding:14px;background:#0f0f0f;border:1px solid #222222;border-radius:8px">
        <div style="color:#10b981;font-size:11px;letter-spacing:1px;text-transform:uppercase">Adoption</div>
        <div style="font-size:34px;font-weight:bold;color:#ffffff">${scores.adoption}<span style="font-size:14px;color:#666666"> /100</span></div>
      </td>
    </tr></table>
  </div>
  <div style="padding:16px 28px">
    <div style="background:#0f1a15;border:1px solid #1f3a30;border-radius:8px;padding:20px">
      <div style="color:#10b981;font-size:12px;text-transform:uppercase;letter-spacing:1px">${gapLabel}</div>
      <h2 style="font-size:20px;margin:8px 0 8px;color:#ffffff">${esc(verdictObj.headline)}</h2>
      <p style="color:#c8c8c8;font-size:15px;line-height:1.6;margin:0">${esc(verdictObj.body)}</p>
    </div>
  </div>
  <div style="padding:8px 28px 20px">
    <h3 style="font-size:16px;color:#10b981">What we would do first</h3>
    <ol style="margin:12px 0 0;background:#ffffff;border-radius:8px;padding:18px 18px 18px 38px">${rec}</ol>
  </div>
  <div style="padding:8px 28px 32px;text-align:center">
    <a href="https://wevolv3.com/contact.html" style="display:inline-block;background:#10b981;color:#04120c;font-weight:bold;text-decoration:none;padding:14px 28px;border-radius:8px">Book a growth session</a>
    <p style="color:#666666;font-size:11px;margin-top:16px">Directional heuristic on public data (GeckoTerminal, DexScreener, X). Not financial advice.</p>
  </div>
</div>`;
}

// QuickChart renders a chart image for the email (emails can't run JS/SVG)
function quickChartUrl(scores) {
  const cfg = {
    type: "bar",
    data: {
      labels: ["Attention", "Adoption"],
      datasets: [{ data: [scores.attention ?? 0, scores.adoption], backgroundColor: ["#6b8cff", "#10b981"], borderRadius: 6, barThickness: 60 }],
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        y: { min: 0, max: 100, ticks: { color: "#888" }, grid: { color: "#222" } },
        x: { ticks: { color: "#ddd", font: { size: 14 } }, grid: { display: false } },
      },
    },
  };
  return "https://quickchart.io/chart?bkg=%230a0a0a&w=544&h=300&c=" + encodeURIComponent(JSON.stringify(cfg));
}

async function sendResend(lead, token, scores, verdictObj, recs) {
  if (!RESEND_KEY) return { sent: false, reason: "no-key" };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + RESEND_KEY },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: [lead.email],
        subject: "Your Adoption Report: " + token.name + " (" + token.symbol + ")",
        html: reportEmailHtml(token, scores, verdictObj, recs),
      }),
    });
    return { sent: res.ok };
  } catch (_) { return { sent: false }; }
}

// ---- resolve a token to a unified shape ------------------------------------
async function resolveToken(query) {
  const isContract = EVM_RE.test(query) || SOL_RE.test(query);
  let token = null;

  if (isContract) {
    const dex = await fromDex(query);
    if (dex) {
      token = { ...dex };
      // enrich socials via GeckoTerminal using the dex chain mapped to a GT network
      const gtNet = GT_NETWORK[dex.chain] || null;
      if (gtNet) {
        try {
          const g = await fromGecko(gtNet, query);
          token.twitter = g.twitter; token.telegram = g.telegram; token.website = g.website;
          if (!token.image) token.image = g.image;
          if (!token.mcap) token.mcap = g.mcap;
          if (!token.liquidity) token.liquidity = g.liquidity;
        } catch (_) {}
      }
    }
  } else {
    const candidates = await resolveCandidates(query);
    let chosen = null;
    // pick the first candidate that has a project Twitter handle (canonical token);
    // fall back to the highest-liquidity one if none expose socials.
    for (let i = 0; i < candidates.length; i++) {
      const g = await fromGecko(candidates[i].network, candidates[i].address);
      if (!chosen) chosen = { g, address: candidates[i].address };
      if (g.twitter) { chosen = { g, address: candidates[i].address }; break; }
    }
    if (chosen) {
      token = { ...chosen.g, txns24h: null };
      try {
        const dex = await fromDex(chosen.address);
        if (dex) { token.txns24h = dex.txns24h; if (!token.liquidity) token.liquidity = dex.liquidity; if (!token.image) token.image = dex.image; }
      } catch (_) {}
    }
  }
  return token;
}

// DexScreener chainId -> GeckoTerminal network id (common ones)
const GT_NETWORK = {
  ethereum: "eth", bsc: "bsc", polygon: "polygon_pos", arbitrum: "arbitrum",
  base: "base", optimism: "optimism", avalanche: "avax", solana: "solana",
  fantom: "ftm", cronos: "cro", pulsechain: "pulsechain",
};

// ---- handler ---------------------------------------------------------------
export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: corsHeaders };
  if (event.httpMethod !== "POST") return json(405, { error: "Method Not Allowed" });

  let body;
  try { body = JSON.parse(event.body || "{}"); } catch (_) { return json(400, { error: "Invalid request." }); }
  const query = (body.query || "").trim();
  const unlock = body.unlock || null; // { email, telegram } when the user submits the gate
  if (!query) return json(400, { error: "Enter a token name, symbol or contract address." });

  // validate the gate up front (before any expensive work)
  if (unlock) {
    if (!EMAIL_RE.test(String(unlock.email || "").trim())) return json(400, { error: "Enter a valid email address." });
    if (!String(unlock.telegram || "").trim()) return json(400, { error: "Enter your Telegram handle." });
  }

  const cacheKey = query.toLowerCase();
  let base = cacheGet(cacheKey);

  try {
    if (!base) {
      const token = await resolveToken(query);
      if (!token) return json(404, { error: "We couldn't find that token. Try a different name, symbol, or paste the contract address." });

      const attention = await fromTwitter(token.twitter); // null if no key / no handle
      const attScore = attentionScore(attention);
      const adoScore = adoptionScore(token);
      if (attScore == null && adoScore == null) return json(404, { error: "We found the token but there isn't enough public data to score it yet." });

      const gap = attScore != null && adoScore != null ? attScore - adoScore : null;
      base = {
        token: { name: token.name, symbol: token.symbol, image: token.image, chain: token.chain, priceUsd: token.priceUsd, twitter: token.twitter, telegram: token.telegram },
        scores: { attention: attScore, adoption: adoScore, gap },
        attentionAvailable: attScore != null,
        verdict: verdict(attScore, adoScore),
        metrics: {
          followers: attention ? attention.followers : null,
          xVerified: attention ? attention.isVerified : null,
          volume24h: token.volume, marketCap: token.mcap,
          turnover: token.volume && token.mcap ? token.volume / token.mcap : null,
          txns24h: token.txns24h, liquidity: token.liquidity,
        },
        rawForRecs: { name: token.name, symbol: token.symbol, chain: token.chain, attention: attScore, adoption: adoScore, gap, followers: attention ? attention.followers : null, volume: token.volume, mcap: token.mcap, txns24h: token.txns24h },
      };
      cacheSet(cacheKey, base);
    }

    // TEASER (no gate): only the two scores + the verdict headline
    if (!unlock) {
      return json(200, {
        ok: true, gated: true,
        token: { name: base.token.name, symbol: base.token.symbol, image: base.token.image, chain: base.token.chain },
        scores: base.scores,
        attentionAvailable: base.attentionAvailable,
        teaserVerdict: base.verdict.headline,
      });
    }

    // FULL REPORT (gate passed): recommendations + capture + email
    const lead = { email: String(unlock.email).trim(), telegram: String(unlock.telegram).trim() };
    const recs = await recommendations(base.rawForRecs);
    await notifyTelegram(lead, base.token, base.scores, base.verdict);
    const email = await sendResend(lead, base.token, base.scores, base.verdict, recs);

    return json(200, {
      ok: true, gated: false,
      token: base.token,
      scores: base.scores,
      attentionAvailable: base.attentionAvailable,
      verdict: base.verdict,
      metrics: base.metrics,
      recommendations: recs.items,
      emailed: email.sent === true,
      chartUrl: quickChartUrl(base.scores),
    });
  } catch (err) {
    const stale = cacheStale(cacheKey);
    if (stale && !unlock) {
      return json(200, { ok: true, gated: true, token: { name: stale.token.name, symbol: stale.token.symbol, image: stale.token.image, chain: stale.token.chain }, scores: stale.scores, attentionAvailable: stale.attentionAvailable, teaserVerdict: stale.verdict.headline, stale: true });
    }
    return json(503, { error: "The data provider is busy right now. Give it a few seconds and try again." });
  }
};
