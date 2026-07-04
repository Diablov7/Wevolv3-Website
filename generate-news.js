#!/usr/bin/env node
/**
 * generate-news.js — renders the "Crypto News Today" section as static HTML.
 *
 * Reads one JSON per day from data/crypto-news-today/*.json and writes:
 *   - crypto-news-today/index.html         (hub, newest first)
 *   - crypto-news-today/<YYYY-MM-DD>.html   (one page per day)
 *
 * No dependencies. Idempotent — safe to run on every Netlify build (it runs
 * from netlify.toml build command, alongside generate-sitemap.js). Pages reuse
 * the site's header/nav/footer and css via ROOT-ABSOLUTE paths (/css/…, /about.html)
 * because they live under /crypto-news-today/.
 *
 * Data contract per day file:
 *   { date, dateLabel, hook, video:{url,poster}, stories:[{cat,text,em,url,source}] }
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data', 'crypto-news-today');
const OUT_DIR = path.join(ROOT, 'crypto-news-today');
const BASE_URL = 'https://wevolv3.com';

/** Cache-busting version for /css/news.css — short hash of its content, so the
 *  link changes only when the CSS changes (returning visitors never get stale CSS). */
function cssVersion() {
  try {
    return crypto.createHash('sha1').update(fs.readFileSync(path.join(ROOT, 'css', 'news.css'))).digest('hex').slice(0, 8);
  } catch {
    return '1';
  }
}
const CSS_VER = cssVersion();

// ── helpers ────────────────────────────────────────────────────────────────
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** Wrap the first occurrence of `em` inside `text` with <span class="em">. */
function highlight(text, em) {
  const t = esc(text);
  if (!em) return t;
  const e = esc(em);
  const i = t.indexOf(e);
  if (i === -1) return t;
  return t.slice(0, i) + '<span class="em">' + e + '</span>' + t.slice(i + e.length);
}

/** Normalize a repo-relative asset path to a root-absolute URL. */
function absUrl(u) {
  if (!u) return '';
  if (/^https?:\/\//i.test(u) || u.startsWith('/')) return u;
  return '/' + u.replace(/^\.?\//, '');
}

function sourceLabel(story) {
  if (story.source) return story.source;
  try { return new URL(story.url).hostname.replace(/^www\./, ''); }
  catch { return 'source'; }
}

const ARROW = '<img src="/images/arrow-right.png" alt="" loading="lazy" />';

// ── shared chrome (header/nav + footer), root-absolute links ────────────────
function head(opts) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <meta content="width=device-width, initial-scale=1" name="viewport" />
    <title>${esc(opts.title)}</title>
    <meta name="description" content="${esc(opts.description)}">
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="${esc(opts.canonical)}">

    <meta property="og:type" content="${opts.ogType || 'website'}">
    <meta property="og:url" content="${esc(opts.canonical)}">
    <meta property="og:title" content="${esc(opts.title)}">
    <meta property="og:description" content="${esc(opts.description)}">
    <meta property="og:image" content="${esc(opts.ogImage || (BASE_URL + '/images/og-image.png'))}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${esc(opts.title)}">
    <meta name="twitter:description" content="${esc(opts.description)}">
    <meta name="twitter:image" content="${esc(opts.ogImage || (BASE_URL + '/images/og-image.png'))}">
${opts.jsonLd ? opts.jsonLd.map(j => '    <script type="application/ld+json">\n' + JSON.stringify(j, null, 2) + '\n    </script>').join('\n') : ''}

    <!-- Google Analytics -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-E7E4GJ0QP9"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'G-E7E4GJ0QP9');
    </script>

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
    <link href="/css/normalize.css" rel="stylesheet" type="text/css" />
    <link href="/css/layout.css" rel="stylesheet" type="text/css" />
    <link href="/css/style.css" rel="stylesheet" type="text/css" />
    <link href="/css/news.css?v=${CSS_VER}" rel="stylesheet" type="text/css" />
    <link href="/images/favicon.png" rel="shortcut icon" type="image/png" />
    <link href="/images/favicon.png" rel="apple-touch-icon" />
    <style>
      .cursor-wrapp,.cursor,.cursor-emmbed,[data-w-id="darkyn-cursor"],.project-cursor-text{display:none!important}
      body{cursor:auto!important;background:#000}
    </style>
</head>
<body>
    <div class="header">
        <div class="w-layout-blockcontainer main-container w-container">
            <div id="home" role="banner" class="header-inner w-nav">
                <div class="logo-wrapper">
                    <a href="/index.html" class="logo w-inline-block">
                        <img src="/images/LOGO.PNG?v=4" alt="Wevolv3" class="logo-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />
                        <span class="logo-text-fallback" style="display:none; color: white; font-family: 'Orbitron', monospace; font-weight: 900; font-size: 28px; text-transform: uppercase; letter-spacing: 0.1em;">WEVOLV3</span>
                    </a>
                </div>
                <a href="/contact.html" class="lets-talk-btn">LET'S TALK</a>
                <nav role="navigation" class="main-menu w-nav-menu">
                    <a href="/index.html" class="menu-item w-nav-link">HOME</a>
                    <a href="/about.html" class="menu-item w-nav-link">ABOUT</a>
                    <a href="/works.html" class="menu-item w-nav-link">WORK</a>
                    <a href="/blog.html" class="menu-item w-nav-link">BLOG</a>
                    <a href="/crypto-news-today" aria-current="page" class="menu-item w-nav-link w--current">NEWS</a>
                    <a href="/adoption-check" class="menu-item w-nav-link">TOOLS</a>
                    <a href="/contact.html" class="menu-item w-nav-link">CONTACT</a>
                </nav>
                <div class="menu-button w-nav-button"><div class="icon w-icon-nav-menu"></div></div>
            </div>
        </div>
    </div>
`;
}

function footer() {
  return `
    <div class="footer">
        <div class="w-layout-blockcontainer main-container w-container">
            <div class="inner-footer">
                <a href="mailto:contact@wevolv3.com" class="mail-link">contact@wevolv3.com</a>
                <a href="https://t.me/wevolv3" target="_blank" class="phone-link">@wevolv3</a>
                <div class="socials">
                    <a href="https://x.com/wevolv3_media" target="_blank" class="social-link w-inline-block"><div class="social-text">X</div><img src="/images/arrow-down-right.png" alt="External link arrow" class="social-arrow" loading="lazy" /></a>
                    <a href="https://www.linkedin.com/company/wevol3-web3-marketing" target="_blank" class="social-link w-inline-block"><div class="social-text">linkedin</div><img src="/images/arrow-down-right.png" alt="External link arrow" class="social-arrow" loading="lazy" /></a>
                    <a href="/crypto-news-today" class="social-link w-inline-block"><div class="social-text">news</div><img src="/images/arrow-down-right.png" alt="External link arrow" class="social-arrow" loading="lazy" /></a>
                    <a href="https://t.me/wevolv3" target="_blank" class="social-link w-inline-block"><div class="social-text">telegram</div><img src="/images/arrow-down-right.png" alt="External link arrow" class="social-arrow" loading="lazy" /></a>
                    <a href="/blog" class="social-link last-social w-inline-block"><div class="social-text">blog</div><img src="/images/arrow-down-right.png" alt="External link arrow" class="social-arrow" loading="lazy" /></a>
                </div>
            </div>
            <div class="footer-legal-links">
                <a href="/privacy.html" class="legal-link">Privacy Policy</a>
                <span class="legal-separator">|</span>
                <a href="/terms.html" class="legal-link">Terms &amp; Conditions</a>
                <span class="legal-separator">|</span>
                <a href="/disclaimer.html" class="legal-link">Legal Disclaimer</a>
            </div>
            <div class="copyright">
                <div class="copyright-text"><span class="copyright-year">2026</span> Wevolv3. All rights reserved.</div>
                <div class="right-copyright"><a href="#home" class="backtotop w-inline-block"><img src="/images/back-top_1back-top.png" alt="Back to top" loading="lazy" /></a></div>
            </div>
        </div>
    </div>
    <script src="/js/jquery.min.js" type="text/javascript"></script>
    <script src="/js/plugins.js" type="text/javascript"></script>
    <script>document.querySelectorAll('.copyright-year').forEach(function(e){e.textContent=new Date().getFullYear();});</script>
    <script src="/js/track-events.js" defer></script>
</body>
</html>`;
}

// ── daily page ──────────────────────────────────────────────────────────────
function renderDay(day, prevDay) {
  const url = `${BASE_URL}/crypto-news-today/${day.date}`;
  const top = (day.stories && day.stories[0]) || {};
  const desc = `Crypto News Today, ${day.dateLabel}: ${day.hook}. The day's top ${(day.stories || []).length} crypto stories with links to every source.`;
  const jsonLd = [
    {
      '@context': 'https://schema.org', '@type': 'NewsArticle',
      headline: `Crypto News Today — ${day.dateLabel}`,
      description: day.hook,
      datePublished: day.date, dateModified: day.date,
      url,
      publisher: { '@type': 'Organization', name: 'Wevolv3', url: BASE_URL, logo: { '@type': 'ImageObject', url: BASE_URL + '/images/LOGO.png' } },
      mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    },
    {
      '@context': 'https://schema.org', '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL + '/' },
        { '@type': 'ListItem', position: 2, name: 'Crypto News Today', item: BASE_URL + '/crypto-news-today' },
        { '@type': 'ListItem', position: 3, name: day.dateLabel, item: url },
      ],
    },
  ];

  const videoHtml = day.video && day.video.url
    ? `        <div class="cnt-video"><video controls playsinline preload="metadata"${day.video.poster ? ` poster="${esc(absUrl(day.video.poster))}"` : ''} src="${esc(absUrl(day.video.url))}"></video></div>\n`
    : '';

  const stories = (day.stories || []).map((s) => {
    const label = sourceLabel(s);
    return `                <li class="cnt-story">
                    <div class="cnt-num"></div>
                    <div class="cnt-body">
                        <span class="cnt-cat">${esc(s.cat || 'NEWS')}</span>
                        <h2 class="cnt-headline">${highlight(s.text, s.em)}</h2>
                        <a class="cnt-source" href="${esc(s.url)}" target="_blank" rel="noopener nofollow"><span>Read at ${esc(label)}</span>${ARROW}</a>
                    </div>
                </li>`;
  }).join('\n');

  const prevBtn = prevDay
    ? `<a class="cnt-btn cnt-ghost" href="/crypto-news-today/${prevDay.date}">&larr; ${esc(prevDay.dateLabel)}</a>`
    : '';

  const body = `
    <div class="cnt-page">
        <div class="w-layout-blockcontainer main-container w-container">
            <div class="cnt-hero">
                <div class="cnt-eyebrow">Crypto News Today</div>
                <h1 class="cnt-heading">${esc(day.dateLabel)}</h1>
                <p class="cnt-hook">${esc(day.hook)}</p>
            </div>
${videoHtml}            <div class="cnt-section-label">Today's stories</div>
            <ol class="cnt-stories">
${stories}
            </ol>
            <div class="cnt-cta">
                <p>The full stories, every day. Follow along and never miss the alpha.</p>
                <a class="cnt-btn" href="https://t.me/wevolv3" target="_blank" rel="noopener">Follow @wevolv3</a>
                <a class="cnt-btn cnt-ghost" href="/crypto-news-today">All days</a>
                ${prevBtn}
            </div>
        </div>
    </div>
`;
  return head({ title: `Crypto News Today — ${day.dateLabel} | Wevolv3`, description: desc, canonical: url, ogType: 'article', jsonLd }) + body + footer();
}

// ── hub page ────────────────────────────────────────────────────────────────
function renderHub(days) {
  const url = `${BASE_URL}/crypto-news-today`;
  const desc = "Wevolv3's daily crypto news recap. The 5 stories that actually mattered each day, with links to every source. Updated daily.";
  const jsonLd = [{
    '@context': 'https://schema.org', '@type': 'CollectionPage',
    name: 'Crypto News Today', url, description: desc,
    isPartOf: { '@type': 'WebSite', name: 'Wevolv3', url: BASE_URL },
  }];

  const cards = days.length ? days.map((d) => {
    const chips = (d.stories || []).slice(0, 5).map(s => `<span class="cnt-chip">${esc(s.cat || 'NEWS')}</span>`).join('');
    return `                <a class="cnt-day" href="/crypto-news-today/${d.date}">
                    <div class="cnt-day-date">${esc(d.dateLabel)}</div>
                    <div class="cnt-day-hook">${esc(d.hook)}</div>
                    <div class="cnt-chips">${chips}</div>
                </a>`;
  }).join('\n') : '<p class="cnt-empty">The first daily recap lands soon. Check back shortly.</p>';

  const body = `
    <div class="cnt-page">
        <div class="w-layout-blockcontainer main-container w-container">
            <div class="cnt-hero">
                <div class="cnt-eyebrow">Daily Recap</div>
                <h1 class="cnt-heading">Crypto News Today</h1>
                <p class="cnt-hook">The 5 stories that actually mattered, every day, with links to every source.</p>
            </div>
            <div class="cnt-section-label">All days</div>
            <div class="cnt-grid">
${cards}
            </div>
        </div>
    </div>
`;
  return head({ title: 'Crypto News Today — Daily Crypto Recap | Wevolv3', description: desc, canonical: url, jsonLd }) + body + footer();
}

// ── build ───────────────────────────────────────────────────────────────────
function loadDays() {
  if (!fs.existsSync(DATA_DIR)) return [];
  const days = [];
  for (const f of fs.readdirSync(DATA_DIR)) {
    if (!f.endsWith('.json')) continue;
    try {
      const d = JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), 'utf8'));
      if (!d.date) { console.warn(`[news] skip ${f}: no date`); continue; }
      days.push(d);
    } catch (e) {
      console.warn(`[news] skip ${f}: ${e.message}`);
    }
  }
  // Newest first.
  days.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  return days;
}

function build() {
  const days = loadDays();
  fs.mkdirSync(OUT_DIR, { recursive: true });

  fs.writeFileSync(path.join(OUT_DIR, 'index.html'), renderHub(days));

  days.forEach((day, i) => {
    const prevDay = days[i + 1]; // next-oldest
    fs.writeFileSync(path.join(OUT_DIR, `${day.date}.html`), renderDay(day, prevDay));
  });

  console.log(`[news] generated hub + ${days.length} day page(s) → crypto-news-today/`);
  return days;
}

if (require.main === module) build();
module.exports = { build, loadDays };
