/*
 * Wevolv3 — Adoption Diagnostic (v2, WeKOLnect stack)
 *
 * Scores the gap between ATTENTION (real X/Twitter reach) and ADOPTION (real
 * on-chain usage) for any token, then gates the full report behind an
 * email + Telegram capture and emails it via Resend.
 *
 * Data pipeline (curated resolution + aggregate on-chain usage):
 *   - CoinGecko    (free; optional key) -> CANONICAL token (kills fakes), real market cap,
 *                                          real total 24h volume, X handle, contract
 *   - DexScreener  (free, no key)   -> aggregate on-chain 24h txns/volume/liquidity across all pools
 *   - GeckoTerminal (free, no key)  -> socials / last-resort fallback for un-indexed tokens
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

// composite health grade (A+ .. D). Adoption weighs most (it's the thing that
// lasts), then attention, then how healthy the conversation is. A wide gap in
// either direction costs a few points: imbalance is itself a risk.
function healthGrade(attention, adoption, sentiment) {
  const sentHealth = sentiment && sentiment.total
    ? sentiment.positivePct + sentiment.neutralPct * 0.5
    : null;
  let score = weighted([
    { score: adoption ?? 0, weight: 0.5, has: adoption != null },
    { score: attention ?? 0, weight: 0.3, has: attention != null },
    { score: sentHealth ?? 0, weight: 0.2, has: sentHealth != null },
  ]);
  if (score == null) return null;
  const gap = attention != null && adoption != null ? Math.abs(attention - adoption) : 0;
  if (gap >= 40) score -= 8; else if (gap >= 25) score -= 4;
  score = clamp(score);
  const letter =
    score >= 90 ? "A+" : score >= 80 ? "A" : score >= 70 ? "B+" :
    score >= 58 ? "B" : score >= 46 ? "C+" : score >= 34 ? "C" : "D";
  return { letter, score };
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

// DexScreener AGGREGATE: contract -> summed on-chain usage across ALL pairs.
// Reading a single pair badly undercounts a multi-pool token; real adoption is
// the sum of every pool's 24h transactions, volume and liquidity.
async function dexAggregate(address) {
  const d = await getJson("https://api.dexscreener.com/latest/dex/tokens/" + encodeURIComponent(address));
  const pairs = (d && d.pairs) || [];
  if (!pairs.length) return null;
  let txns = 0, dexVol = 0, liq = 0, mcap = 0;
  let bestLiq = -1, image = null, chain = null, name = null, symbol = null, price = null;
  for (const p of pairs) {
    const t = p.txns?.h24 || {};
    txns += (t.buys || 0) + (t.sells || 0);
    dexVol += num(p.volume?.h24) || 0;
    const l = num(p.liquidity?.usd) || 0;
    liq += l;
    const pm = num(p.marketCap) || num(p.fdv) || 0;
    if (pm && !mcap) mcap = pm;
    if (l > bestLiq) { // deepest pool = canonical read for the display fields
      bestLiq = l;
      image = p.info?.imageUrl || image;
      chain = p.chainId || chain;
      name = p.baseToken?.name || name;
      symbol = (p.baseToken?.symbol || "").toUpperCase() || symbol;
      price = num(p.priceUsd);
    }
  }
  return { txns24h: txns, dexVolume: dexVol, liquidity: liq, mcap, image, chain, name, symbol, priceUsd: price };
}

// ---- CoinGecko: the curated source of truth --------------------------------
// CoinGecko's /search returns the CANONICAL coin (ranked by market cap), which
// is what kills the "fake token with the same name/symbol" problem that pure-DEX
// search suffers from. From the coin id we read real market cap, real total 24h
// volume (the number that matches CMC/exchanges, not just one DEX pool), the
// project's X handle and its contract. An optional key lifts the rate limits;
// without one we still work via caching + retry + the DEX/GeckoTerminal fallbacks.
const CG_KEY = process.env.COINGECKO_API_KEY || process.env.CG_API_KEY || "";
const CG_PRO = CG_KEY.startsWith("CG-") && CG_KEY.includes("PRO");
const CG_BASE = CG_PRO ? "https://pro-api.coingecko.com/api/v3" : "https://api.coingecko.com/api/v3";
const cgHeaders = () => {
  const h = { Accept: "application/json" };
  if (CG_KEY) h[CG_PRO ? "x-cg-pro-api-key" : "x-cg-demo-api-key"] = CG_KEY;
  return h;
};

// CoinGecko asset-platform id -> our display chain (matches DexScreener chainId)
const CG_PLATFORM = {
  ethereum: "ethereum", "binance-smart-chain": "bsc", "polygon-pos": "polygon",
  "arbitrum-one": "arbitrum", base: "base", "optimistic-ethereum": "optimism",
  "avalanche": "avalanche", solana: "solana", fantom: "fantom",
};
const CG_PLATFORM_FOR_CHAIN = Object.fromEntries(Object.entries(CG_PLATFORM).map(([k, v]) => [v, k]));

// name / symbol -> canonical coin id (curated, no fakes)
async function cgSearchId(query) {
  try {
    const q = query.replace(/^\$/, "");
    const d = await getJson(CG_BASE + "/search?query=" + encodeURIComponent(q), { headers: cgHeaders() });
    const coins = (d && d.coins) || [];
    if (!coins.length) return null;
    const sym = q.toUpperCase();
    const exact = coins.find((c) => (c.symbol || "").toUpperCase() === sym);
    return (exact || coins[0]).id; // search is market-cap ordered
  } catch (_) { return null; }
}

function fromCgCoin(d) {
  if (!d) return null;
  const md = d.market_data || {};
  const pl = d.platforms || {};
  let contract = null, platform = null;
  for (const [k, v] of Object.entries(pl)) {
    if (v && String(v).length > 20) { contract = String(v); platform = k; break; }
  }
  const links = d.links || {};
  return {
    name: d.name || "Token",
    symbol: (d.symbol || "").toUpperCase(),
    image: (d.image && (d.image.large || d.image.small)) || null,
    chain: CG_PLATFORM[platform] || platform || null,
    contract, platform,
    mcap: num((md.market_cap || {}).usd) || num((md.fully_diluted_valuation || {}).usd) || 0,
    volume: num((md.total_volume || {}).usd) || 0,
    priceUsd: num((md.current_price || {}).usd),
    mcapRank: num(d.market_cap_rank),
    priceChange: {
      h24: num(md.price_change_percentage_24h),
      d7: num(md.price_change_percentage_7d),
      d30: num(md.price_change_percentage_30d),
    },
    sparkline: downsample(((md.sparkline_7d || {}).price) || [], 40),
    twitter: links.twitter_screen_name || null,
    telegram: links.telegram_channel_identifier || null,
    website: (links.homepage || []).filter(Boolean)[0] || null,
    source: "coingecko",
  };
}

// keep the 7d sparkline payload small: ~40 evenly spaced points is plenty
function downsample(arr, n) {
  const src = (arr || []).filter((v) => typeof v === "number" && isFinite(v));
  if (src.length <= n) return src.length ? src : null;
  const out = [];
  for (let i = 0; i < n; i++) out.push(src[Math.round((i * (src.length - 1)) / (n - 1))]);
  return out;
}

// median 24h turnover (volume/mcap) of the top-100 coins — the honest baseline
// the report compares a token's turnover against. One markets call, cached like
// everything else; null on failure (the comparison line is simply omitted).
async function peerMedianTurnover() {
  const hit = cacheGet("__peers");
  if (hit != null) return hit;
  try {
    const rows = await getJson(CG_BASE + "/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=false", { headers: cgHeaders() }, 1);
    const ratios = (rows || [])
      .map((r) => (r.total_volume && r.market_cap ? r.total_volume / r.market_cap : null))
      .filter((v) => v != null && isFinite(v) && v > 0)
      .sort((a, b) => a - b);
    if (ratios.length < 20) return cacheStale("__peers");
    const median = ratios[Math.floor(ratios.length / 2)];
    cacheSet("__peers", median);
    return median;
  } catch (_) { return cacheStale("__peers"); }
}

const CG_COIN_QS = "?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=true";
async function cgCoinById(id) {
  if (!id) return null;
  try { return fromCgCoin(await getJson(CG_BASE + "/coins/" + encodeURIComponent(id) + CG_COIN_QS, { headers: cgHeaders() })); }
  catch (_) { return null; }
}
async function cgCoinByContract(platform, address) {
  if (!platform || !address) return null;
  try { return fromCgCoin(await getJson(CG_BASE + "/coins/" + platform + "/contract/" + address.toLowerCase() + CG_COIN_QS, { headers: cgHeaders() })); }
  catch (_) { return null; }
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

// shared LLM caller (OpenRouter preferred, then OpenAI) -> raw text or null.
// Reasoning is disabled on OpenRouter: deepseek-v4-flash otherwise burns the
// token budget on hidden reasoning and returns empty content (intermittent nulls).
async function llmText(prompt, maxTokens, temperature) {
  const call = async (url, model, key, isOR) => {
    const payload = { model, messages: [{ role: "user", content: prompt }], temperature: temperature == null ? 0.5 : temperature, max_tokens: maxTokens || 400 };
    if (isOR) payload.reasoning = { enabled: false };
    const d = await getJson(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + key },
      body: JSON.stringify(payload),
    }, 1);
    return (d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content) || "";
  };
  try {
    if (OPENROUTER_KEY) { const t = await call("https://openrouter.ai/api/v1/chat/completions", OPENROUTER_MODEL, OPENROUTER_KEY, true); if (t) return t; }
    if (OPENAI_KEY) { const t = await call("https://api.openai.com/v1/chat/completions", OPENAI_MODEL, OPENAI_KEY, false); if (t) return t; }
  } catch (_) {}
  return null;
}

// twitterapi.io advanced search -> top RECENT mentions of the token by reach.
// The `since:` window is essential: without it, queryType=Top returns all-time
// viral tweets (e.g. Uniswap's 2020 airdrop giveaways) instead of current mood.
async function fetchMentions(token) {
  if (!TWITTER_KEY) return [];
  const sym = String(token.symbol || "").replace(/[^A-Za-z0-9]/g, "");
  if (!sym) return [];
  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const q = "$" + sym + " lang:en -is:retweet min_faves:3 since:" + since;
  try {
    const d = await getJson(
      "https://api.twitterapi.io/twitter/tweet/advanced_search?query=" + encodeURIComponent(q) + "&queryType=Top",
      { headers: { "x-api-key": TWITTER_KEY } }, 1);
    const raw = (d && d.tweets) || [];
    const mapped = raw.map((t) => {
      const a = t.author || {};
      return {
        text: String(t.text || "").replace(/https?:\/\/\S+/g, "").replace(/\s+/g, " ").trim(),
        author: a.userName || null,
        followers: num(a.followers) || 0,
        likes: num(t.likeCount) || 0,
        rts: num(t.retweetCount) || 0,
        url: t.url || t.twitterUrl || null,
      };
    }).filter((m) => m.text.length > 4);
    mapped.sort((a, b) => (b.likes + 2 * b.rts) - (a.likes + 2 * a.rts)); // reach-weighted
    return mapped.slice(0, 30);
  } catch (_) { return []; }
}

// classify mention sentiment + extract themes; picks top pos/neg by reach
async function analyzeSentiment(mentions, token) {
  if (!mentions || !mentions.length) return null;
  const numbered = mentions.map((m, i) => i + ". " + m.text.slice(0, 200)).join("\n");
  const prompt =
    "Classify each numbered tweet about the crypto token " + token.name + " ($" + token.symbol + ") as pos, neu, or neg from a token-holder perspective " +
    "(price optimism or community praise = pos; FUD, scam, rug, dump, loss = neg; news or neutral = neu). " +
    "Then give up to 3 short themesUp (what drives positive sentiment) and up to 3 short themesDown (what drives negative). Each theme is 2-5 words, plain text. " +
    'Return ONLY JSON: {"sentiments":["pos"|"neu"|"neg", one per tweet in order],"themesUp":["..."],"themesDown":["..."]}\n\nTWEETS:\n' + numbered;
  const txt = await llmText(prompt, 700, 0.2);
  if (!txt) return null;
  let obj;
  try { obj = JSON.parse((txt.match(/\{[\s\S]*\}/) || [txt])[0]); } catch (_) { return null; }
  const labels = Array.isArray(obj.sentiments) ? obj.sentiments : [];
  let pos = 0, neu = 0, neg = 0;
  mentions.forEach((m, i) => {
    const l = String(labels[i] || "neu").toLowerCase();
    m.sentiment = l.startsWith("pos") ? "pos" : l.startsWith("neg") ? "neg" : "neu";
    if (m.sentiment === "pos") pos++; else if (m.sentiment === "neg") neg++; else neu++;
  });
  const total = pos + neu + neg || 1;
  const pick = (s) => mentions.filter((m) => m.sentiment === s).slice(0, 3)
    .map((m) => ({ text: m.text.slice(0, 180), author: m.author, likes: m.likes, rts: m.rts, url: m.url }));
  return {
    breakdown: {
      positive: pos, neutral: neu, negative: neg, total,
      positivePct: Math.round((pos / total) * 100),
      neutralPct: Math.round((neu / total) * 100),
      negativePct: Math.round((neg / total) * 100),
    },
    top: { positive: pick("pos"), negative: pick("neg") },
    themesUp: (obj.themesUp || []).slice(0, 3).map(String),
    themesDown: (obj.themesDown || []).slice(0, 3).map(String),
    sampleSize: mentions.length,
  };
}

// Wevolv3's actual service roster — every recommended action maps to one of
// these, so the report reads as a plan Wevolv3 can literally execute.
const SERVICES = {
  kol: { name: "Crypto KOL Marketing", url: "https://wevolv3.com/crypto-kol-marketing" },
  pr: { name: "Crypto PR & Media Coverage", url: "https://wevolv3.com/crypto-pr" },
  community: { name: "Community Building", url: "https://wevolv3.com/community-building" },
  ads: { name: "Crypto Ads & On-Chain Placements", url: "https://wevolv3.com/ads-placement" },
  growth: { name: "Growth Hacking (Reddit & Trending)", url: "https://wevolv3.com/growth-hacking" },
  guerrilla: { name: "Guerrilla Marketing", url: "https://wevolv3.com/guerrilla-marketing" },
  listings: { name: "Listings (CMC, CoinGecko & Exchanges)", url: "https://wevolv3.com/listings" },
  design: { name: "Design & Motion", url: "https://wevolv3.com/design-motion" },
  dev: { name: "Web3 Development", url: "https://wevolv3.com/web3-development" },
  launch: { name: "Token Launch Marketing", url: "https://wevolv3.com/token-launch-marketing" },
};
const svc = (key) => {
  const s = SERVICES[key] || SERVICES.kol;
  return { key: SERVICES[key] ? key : "kol", name: s.name, url: s.url };
};

// AI analysis: a natural-language read of the data + 3 actions, each mapped to
// a real Wevolv3 service. Falls back to a rule-based version so the report is
// never empty.
async function buildAnalysis(ctx) {
  const fmtUsd = (v) => (v == null || !v ? "unknown" : "$" + Number(v).toLocaleString("en-US", { maximumFractionDigits: 0 }));
  const turnoverPct = ctx.turnover != null
    ? (ctx.turnover * 100).toFixed(1) + "% of market cap trades daily" + (ctx.peerTurnover ? " vs " + (ctx.peerTurnover * 100).toFixed(1) + "% top-100 median" : "")
    : "unknown turnover";
  const catalog = Object.entries(SERVICES).map(([k, s]) => k + " = " + s.name).join("; ");
  const prompt =
    "You are a senior growth strategist at Wevolv3 (a Web3 marketing agency) writing a short diagnostic for this project's team. Use ONLY the numbers below — never invent metrics, prices, partnerships or events.\n\n" +
    "TOKEN: " + ctx.name + " (" + ctx.symbol + ")" + (ctx.mcapRank ? ", CoinGecko market-cap rank #" + ctx.mcapRank : "") + " on " + (ctx.chain || "unknown chain") + ".\n" +
    "SCORES: Attention " + (ctx.attention ?? "n/a") + "/100, Adoption " + ctx.adoption + "/100, Gap " + (ctx.gap ?? "n/a") + " (positive = more attention than real usage).\n" +
    "ATTENTION DATA: X followers " + (ctx.followers != null ? Number(ctx.followers).toLocaleString("en-US") : "unknown") + (ctx.xVerified ? " (verified account)" : "") + ".\n" +
    "ADOPTION DATA: market cap " + fmtUsd(ctx.mcap) + ", 24h volume " + fmtUsd(ctx.volume) + " (" + turnoverPct + "), on-chain DEX volume " + fmtUsd(ctx.dexVolume) + ", pooled liquidity " + fmtUsd(ctx.liquidity) + ", 24h on-chain transactions " + (ctx.txns24h != null ? Number(ctx.txns24h).toLocaleString("en-US") : "unknown") + ".\n" +
    (ctx.sentiment ? "SENTIMENT (of people talking about it on X): " + ctx.sentiment.positivePct + "% positive, " + ctx.sentiment.neutralPct + "% neutral, " + ctx.sentiment.negativePct + "% negative" + (ctx.themesDown && ctx.themesDown.length ? "; negative themes: " + ctx.themesDown.join(", ") : "") + ".\n" : "") +
    "\nWEVOLV3 SERVICES (use these exact keys): " + catalog + ".\n\n" +
    "Return ONLY JSON with this shape:\n" +
    '{"analysis":"...", "actions":[{"text":"...","service":"<key>"}, {"text":"...","service":"<key>"}, {"text":"...","service":"<key>"}]}\n' +
    "analysis: 2 short paragraphs (separated by \\n\\n, 120 words total max) written in plain, direct second person to the team. Paragraph 1: what the data actually says about them — cite 2-3 specific numbers and what they mean together. Paragraph 2: the single most important thing to fix first and why now. Sound like a sharp human strategist, not a report generator. No headings, no bullets, no hype words.\n" +
    "actions: exactly 3, each max 22 words, imperative, each grounded in a cited number, each mapped to the ONE service key that would execute it. Use 3 different services.";

  try {
    const txt = await llmText(prompt, 900, 0.6);
    if (txt) {
      const obj = JSON.parse((txt.match(/\{[\s\S]*\}/) || [txt])[0]);
      const actions = Array.isArray(obj.actions) ? obj.actions.slice(0, 3) : [];
      if (obj.analysis && actions.length) {
        return {
          analysis: String(obj.analysis).trim(),
          items: actions.map((a) => ({ text: String(a.text || a).trim(), service: svc(String(a.service || "").toLowerCase()) })),
          source: "ai",
        };
      }
    }
  } catch (_) { /* fall through to rules */ }

  // rule-based fallback so the report always has an analysis
  const gap = ctx.gap;
  const fols = ctx.followers != null ? Number(ctx.followers).toLocaleString("en-US") + " X followers" : "your social reach";
  const turn = ctx.turnover != null ? (ctx.turnover * 100).toFixed(1) + "% daily turnover" : "your trading activity";
  let analysis, items;
  if (gap != null && gap >= 25) {
    analysis = "The market is watching you — " + fols + " and an attention score of " + ctx.attention + " prove that — but " + turn + " says far fewer people actually transact. That mismatch is the classic vanity-metrics trap: reach that never converts into usage.\n\nThe first thing to fix is the funnel between social interest and the first on-chain action. Until that path converts, more visibility just makes the leak bigger.";
    items = [
      { text: "Run KOL campaigns tied to one trackable first transaction, not impressions.", service: svc("kol") },
      { text: "Give your " + fols + " a recurring on-chain reason to act: quests, incentives, utility drops.", service: svc("community") },
      { text: "Retarget engaged social audiences with on-chain placements that deep-link to the swap.", service: svc("ads") },
    ];
  } else if (gap != null && gap <= -15) {
    analysis = "Your on-chain numbers (" + turn + ", adoption " + ctx.adoption + "/100) are stronger than your visibility (attention " + (ctx.attention ?? "n/a") + "/100). People who find you, use you — the market just hasn't found you at scale yet.\n\nThat is the cheapest growth problem to have. Amplifying proof that already exists converts far better than manufacturing hype, and it should happen before a louder competitor claims your narrative.";
    items = [
      { text: "Turn real usage into public proof: case studies and on-chain stats pushed through crypto media.", service: svc("pr") },
      { text: "Put working product in front of new audiences with KOLs who demo, not shill.", service: svc("kol") },
      { text: "Seed organic conversation on Reddit and trending channels where researchers actually look.", service: svc("growth") },
    ];
  } else {
    analysis = "Attention (" + (ctx.attention ?? "n/a") + "/100) and adoption (" + ctx.adoption + "/100) are moving together, which is the healthy pattern — interest is converting into " + turn + ". Nothing is broken; the question is which side compounds faster from here.\n\nThe risk at this stage is plateau: growth that stays proportional instead of accelerating. Pick one primary metric and force every campaign to answer to it.";
    items = [
      { text: "Set one primary growth metric (holders, volume or active wallets) and align every campaign to it.", service: svc("launch") },
      { text: "Layer KOL and PR in the same window so attention spikes land on a warm audience.", service: svc("kol") },
      { text: "Strengthen community programs so each new wave of attention has somewhere to stay.", service: svc("community") },
    ];
  }
  return { analysis, items, source: "rules" };
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

function sentimentDonutUrl(b) {
  const cfg = {
    type: "doughnut",
    data: {
      labels: ["Positive", "Neutral", "Negative"],
      datasets: [{ data: [b.positivePct, b.neutralPct, b.negativePct], backgroundColor: ["#10b981", "#4a4a4a", "#ef4444"], borderWidth: 0 }],
    },
    options: { plugins: { legend: { position: "right", labels: { color: "#ddd", font: { size: 13 } } }, doughnutlabel: null }, cutout: "65%" },
  };
  return "https://quickchart.io/chart?bkg=%230f0f0f&w=380&h=180&c=" + encodeURIComponent(JSON.stringify(cfg));
}

function sentimentEmailBlock(sentiment) {
  if (!sentiment || !sentiment.total) return "";
  const b = sentiment;
  return `
  <div style="padding:8px 28px">
    <div style="background:#0f0f0f;border:1px solid #222222;border-radius:8px;padding:16px">
      <div style="color:#8a8a8a;font-size:11px;letter-spacing:1px;text-transform:uppercase;margin-bottom:10px">Community sentiment on X &middot; ${b.total} recent mentions</div>
      <img src="${sentimentDonutUrl(b)}" alt="Sentiment: ${b.positivePct}% positive, ${b.neutralPct}% neutral, ${b.negativePct}% negative" width="380" style="max-width:100%;border-radius:6px" />
    </div>
  </div>`;
}

function reportEmailHtml(token, scores, verdictObj, recs, sentiment, grade) {
  const chartUrl = quickChartUrl(scores);
  const rec = recs.items
    .map((r) => {
      const text = typeof r === "string" ? r : r.text;
      const service = r && r.service ? `<br/><a href="${esc(r.service.url)}" style="color:#0a8a5f;font-size:12px;text-decoration:none">&rarr; ${esc(r.service.name)}</a>` : "";
      return `<li style="margin:0 0 12px;color:#1a1a1a;font-size:15px;line-height:1.5">${esc(text)}${service}</li>`;
    })
    .join("");
  const analysisBlock = recs.analysis
    ? `<div style="padding:8px 28px"><div style="background:#0f0f0f;border:1px solid #222222;border-radius:8px;padding:20px">
        <div style="color:#8a8a8a;font-size:11px;letter-spacing:1px;text-transform:uppercase;margin-bottom:10px">Our read</div>
        ${recs.analysis.split(/\n\n+/).map((p) => `<p style="color:#d8d8d8;font-size:15px;line-height:1.65;margin:0 0 12px">${esc(p)}</p>`).join("")}
      </div></div>`
    : "";
  const gapLabel = scores.gap != null ? `Gap: ${scores.gap > 0 ? "+" : ""}${scores.gap} points` : "Adoption read";
  const gradeBadge = grade
    ? `<td align="right" valign="top"><div style="display:inline-block;background:#0f1a15;border:2px solid #10b981;border-radius:10px;padding:10px 16px;text-align:center"><div style="font-size:30px;font-weight:bold;color:#10b981;line-height:1">${esc(grade.letter)}</div><div style="color:#8a8a8a;font-size:10px;letter-spacing:1px;text-transform:uppercase;margin-top:4px">Health grade</div></div></td>`
    : "";
  return `
<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#ffffff;border-radius:12px;overflow:hidden">
  <div style="padding:28px 28px 8px">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td>
        <div style="color:#10b981;font-size:12px;letter-spacing:2px;text-transform:uppercase">Wevolv3 &middot; Adoption Report</div>
        <h1 style="font-size:24px;margin:10px 0 2px;color:#ffffff">${esc(token.name)} (${esc(token.symbol)})</h1>
        <div style="color:#8a8a8a;font-size:13px">${esc(token.chain || "")}</div>
      </td>
      ${gradeBadge}
    </tr></table>
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
  ${analysisBlock}
  ${sentimentEmailBlock(sentiment)}
  <div style="padding:8px 28px 20px">
    <h3 style="font-size:16px;color:#10b981">What we would do first</h3>
    <ol style="margin:12px 0 0;background:#ffffff;border-radius:8px;padding:18px 18px 18px 38px">${rec}</ol>
  </div>
  <div style="padding:8px 28px 32px;text-align:center">
    <a href="https://wevolv3.com/contact.html" style="display:inline-block;background:#10b981;color:#04120c;font-weight:bold;text-decoration:none;padding:14px 28px;border-radius:8px">Book a growth session</a>
    <p style="color:#666666;font-size:11px;margin-top:16px">Directional heuristic on public data (CoinGecko, DexScreener, X). Not financial advice.</p>
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

async function sendResend(lead, token, scores, verdictObj, recs, sentiment, grade) {
  if (!RESEND_KEY) return { sent: false, reason: "no-key" };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + RESEND_KEY },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: [lead.email],
        subject: "Your Adoption Report: " + token.name + " (" + token.symbol + ")",
        html: reportEmailHtml(token, scores, verdictObj, recs, sentiment, grade),
      }),
    });
    return { sent: res.ok };
  } catch (_) { return { sent: false }; }
}

// ---- resolve a token to a unified shape ------------------------------------
// Merge the three sources into one shape. Priority: CoinGecko for the "reality"
// numbers (market cap, total volume, X handle), DexScreener aggregate for the
// on-chain usage numbers (transactions, pooled liquidity), GeckoTerminal only as
// a socials/last-resort fallback for tokens CoinGecko has never indexed.
function mergeToken({ cg, gt, agg, chain }) {
  const base = cg || gt || {};
  const cgVol = cg ? cg.volume : 0;
  const dexVol = agg ? agg.dexVolume : 0;
  return {
    name: base.name || (agg && agg.name) || "Token",
    symbol: base.symbol || (agg && agg.symbol) || "",
    image: base.image || (agg && agg.image) || null,
    chain: chain || base.chain || (agg && agg.chain) || null,
    priceUsd: (base.priceUsd != null ? base.priceUsd : null) || (agg && agg.priceUsd) || null,
    twitter: (cg && cg.twitter) || (gt && gt.twitter) || null,
    telegram: (cg && cg.telegram) || (gt && gt.telegram) || null,
    website: (cg && cg.website) || (gt && gt.website) || null,
    // reality: CoinGecko total (CEX+DEX) is the number that matches exchanges;
    // fall back to the on-chain DEX aggregate when CoinGecko has no record.
    volume: cgVol || dexVol || 0,
    dexVolume: dexVol || null,
    mcap: (cg && cg.mcap) || (gt && gt.mcap) || (agg && agg.mcap) || 0,
    mcapRank: cg ? cg.mcapRank : null,
    priceChange: cg ? cg.priceChange : null,
    sparkline: cg ? cg.sparkline : null,
    // on-chain usage: prefer the DEX aggregate, fall back to GT reserves
    liquidity: (agg && agg.liquidity) || (gt && gt.liquidity) || 0,
    txns24h: agg ? agg.txns24h : null,
    source: cg ? "coingecko" : (gt ? "geckoterminal" : "dexscreener"),
  };
}

async function resolveToken(query) {
  const isContract = EVM_RE.test(query) || SOL_RE.test(query);

  if (isContract) {
    // on-chain truth first (works for brand-new tokens CoinGecko hasn't indexed)
    const agg = await dexAggregate(query).catch(() => null);
    const chain = agg ? agg.chain : null;
    const platform = chain ? CG_PLATFORM_FOR_CHAIN[chain] : null;
    const cg = platform ? await cgCoinByContract(platform, query) : null;
    let gt = null;
    if (!cg && chain && GT_NETWORK[chain]) gt = await fromGecko(GT_NETWORK[chain], query).catch(() => null);
    if (!agg && !cg && !gt) return null;
    return mergeToken({ cg, gt, agg, chain: chain || (cg && cg.chain) });
  }

  // name / symbol -> CoinGecko canonical (curated, kills fake tokens)
  const id = await cgSearchId(query);
  const cg = id ? await cgCoinById(id) : null;
  if (cg) {
    const agg = cg.contract ? await dexAggregate(cg.contract).catch(() => null) : null;
    return mergeToken({ cg, agg, chain: cg.chain });
  }

  // last resort: the old GeckoTerminal path if CoinGecko whiffed entirely
  const candidates = await resolveCandidates(query);
  for (let i = 0; i < candidates.length; i++) {
    const g = await fromGecko(candidates[i].network, candidates[i].address).catch(() => null);
    if (g && g.twitter) {
      const agg = await dexAggregate(candidates[i].address).catch(() => null);
      return mergeToken({ gt: g, agg, chain: g.chain });
    }
  }
  return null;
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

      // the three lookups are independent — run them in parallel to stay well
      // under Netlify's 10s synchronous function limit on cold queries
      const [attention, mentions, peerTurnover] = await Promise.all([
        fromTwitter(token.twitter), // null if no key / no handle
        fetchMentions(token),
        peerMedianTurnover(),
      ]);
      const attScore = attentionScore(attention);
      const adoScore = adoptionScore(token);
      if (attScore == null && adoScore == null) return json(404, { error: "We found the token but there isn't enough public data to score it yet." });

      // sentiment: real mentions -> classified breakdown (teaser) + samples/themes (full)
      const sentiment = await analyzeSentiment(mentions, token);

      const gap = attScore != null && adoScore != null ? attScore - adoScore : null;
      base = {
        token: { name: token.name, symbol: token.symbol, image: token.image, chain: token.chain, priceUsd: token.priceUsd, twitter: token.twitter, telegram: token.telegram, priceChange: token.priceChange, sparkline: token.sparkline },
        scores: { attention: attScore, adoption: adoScore, gap },
        attentionAvailable: attScore != null,
        verdict: verdict(attScore, adoScore),
        grade: healthGrade(attScore, adoScore, sentiment ? sentiment.breakdown : null),
        sentiment: sentiment ? sentiment.breakdown : null, // teaser + full
        sentimentDetail: sentiment ? { top: sentiment.top, themesUp: sentiment.themesUp, themesDown: sentiment.themesDown, sampleSize: sentiment.sampleSize } : null, // full only
        metrics: {
          followers: attention ? attention.followers : null,
          xVerified: attention ? attention.isVerified : null,
          volume24h: token.volume, dexVolume24h: token.dexVolume,
          marketCap: token.mcap, marketCapRank: token.mcapRank,
          turnover: token.volume && token.mcap ? token.volume / token.mcap : null,
          peerTurnover: peerTurnover || null,
          txns24h: token.txns24h, liquidity: token.liquidity,
          source: token.source,
        },
        rawForRecs: {
          name: token.name, symbol: token.symbol, chain: token.chain,
          attention: attScore, adoption: adoScore, gap,
          followers: attention ? attention.followers : null,
          xVerified: attention ? attention.isVerified : null,
          volume: token.volume, dexVolume: token.dexVolume,
          mcap: token.mcap, mcapRank: token.mcapRank,
          turnover: token.volume && token.mcap ? token.volume / token.mcap : null,
          peerTurnover: peerTurnover || null,
          txns24h: token.txns24h, liquidity: token.liquidity,
          sentiment: sentiment ? sentiment.breakdown : null,
          themesDown: sentiment ? sentiment.themesDown : null,
        },
      };
      cacheSet(cacheKey, base);
    }

    // TEASER (no gate): only the two scores + the verdict headline
    if (!unlock) {
      return json(200, {
        ok: true, gated: true,
        token: { name: base.token.name, symbol: base.token.symbol, image: base.token.image, chain: base.token.chain, priceUsd: base.token.priceUsd, priceChange: base.token.priceChange, sparkline: base.token.sparkline },
        scores: base.scores,
        attentionAvailable: base.attentionAvailable,
        grade: base.grade,
        sentiment: base.sentiment,
        teaserVerdict: base.verdict.headline,
      });
    }

    // FULL REPORT (gate passed): recommendations + capture + email
    const lead = { email: String(unlock.email).trim(), telegram: String(unlock.telegram).trim() };
    const recs = await buildAnalysis(base.rawForRecs);
    await notifyTelegram(lead, base.token, base.scores, base.verdict);
    const email = await sendResend(lead, base.token, base.scores, base.verdict, recs, base.sentiment, base.grade);

    return json(200, {
      ok: true, gated: false,
      token: base.token,
      scores: base.scores,
      attentionAvailable: base.attentionAvailable,
      verdict: base.verdict,
      grade: base.grade,
      metrics: base.metrics,
      sentiment: base.sentiment,
      sentimentDetail: base.sentimentDetail,
      analysis: recs.analysis,
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

