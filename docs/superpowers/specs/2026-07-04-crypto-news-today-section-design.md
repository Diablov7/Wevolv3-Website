# Crypto News Today — full-stories section (design)

Date: 2026-07-04
Status: approved (brainstorming) → implementation

## Problem

The daily "Crypto News Today" recap videos (built in `wv3-newsloop-test`, being
integrated into the ContentStudio copywriter pipeline) end with a CTA:
**"Read the full stories on Wevolv3.com"**. Today that CTA leads nowhere — the
site has no page hosting each day's stories. We need a destination on wevolv3.com
that lists each day's 5 ranked headlines with links to the original sources, so
every posted video has a matching full-writeup URL.

## Decision summary (from brainstorming)

- **Architecture:** static HTML generated and pushed to the site repo
  (`Diablov7/Wevolv3-Website`). Netlify auto-rebuilds on push. No runtime DB
  coupling; best SEO; matches the existing static architecture.
- **Page content (per story):** category tag + headline (the punchy `text`, with
  `em` highlighted) + an outbound **"Read at source →"** link to the original
  news site. **No hosted summary / no republished article text** (simplest, and
  copyright-safe). The page also shows the day's **hook**, **date**, and the
  **embedded recap video** (all first-party, safe to host).
- **Generation trigger:** the ContentStudio publish step emits the day's JSON +
  pushes it to the site repo; a daily cron also rebuilds the hub / backfills.

## URLs & navigation

- Hub: `https://wevolv3.com/crypto-news-today` (file `crypto-news-today/index.html`)
- Daily: `https://wevolv3.com/crypto-news-today/2026-07-04`
  (file `crypto-news-today/2026-07-04.html`; Netlify pretty-URLs serve it without `.html`)
- Add **NEWS** to the main nav (`.main-menu`) across pages and a link in the footer.
- Include hub + every daily page in `sitemap.xml`.

## Data contract (the seam between ContentStudio and the site)

One JSON file per day committed to the site repo at
`data/crypto-news-today/<YYYY-MM-DD>.json`:

```json
{
  "date": "2026-07-04",
  "dateLabel": "JUL 04, 2026",
  "hook": "5 things you missed in crypto today",
  "video": { "url": "crypto-news-today/assets/2026-07-04.mp4", "poster": "" },
  "stories": [
    { "cat": "MARKETS", "text": "Bitcoin reclaims $90K as shorts get liquidated",
      "em": "$90K", "url": "https://www.coindesk.com/...", "source": "CoinDesk" }
  ]
}
```

- `stories` is ordered by rank (story #1 = biggest), length 1–5.
- `cat`, `text`, `em` come straight from `script.headlines[]`.
- `url` = `winner.link` / `alternates[i].link`; `source` = host of that URL.
- `video.url` = a public URL (in production the Postiz media URL, or a copy of the
  rendered 16x9 committed under `crypto-news-today/assets/`). Optional — the
  template renders gracefully with no video.

## Components

### 1. `generate-news.js` (site repo, Node, no deps — mirrors `generate-sitemap.js`)
- Reads every `data/crypto-news-today/*.json`.
- Renders `crypto-news-today/<date>.html` for each day and `crypto-news-today/index.html` (hub),
  using shared header/nav/footer identical to the rest of the site.
- Sorts days descending; hub shows a card per day (date, hook, category chips, video thumb).
- Idempotent: safe to run every build. Skips malformed JSON with a warning.

### 2. Page templates (emitted by the generator)
- **Daily page:** hero (`Crypto News Today` + `dateLabel` + `hook`) → embedded
  video (`<video controls playsinline>` if `video.url`, else skipped) → ordered
  list of 5 story cards, each: `cat` chip, headline with `<span class="em">` on
  the `em` substring, and a `Read at {source} →` anchor
  (`target="_blank" rel="noopener nofollow"`). Footer CTA: follow @wevolv3 /
  previous day. Per-page SEO: title, description, canonical, OG/Twitter, and
  `NewsArticle` + `BreadcrumbList` JSON-LD.
- **Hub page:** hero + reverse-chronological grid of day cards linking to each daily page.

### 3. Sitemap integration
- `generate-sitemap.js` extended to include `/crypto-news-today` and each
  `/crypto-news-today/<date>` (scanning `data/crypto-news-today/`).

### 4. Nav/footer wiring
- Insert `<a href="crypto-news-today" class="menu-item w-nav-link">NEWS</a>` into
  `.main-menu` on all top-level pages (same pattern as the Adoption Check "TOOLS" link).
- Add a "news" link to the footer `.socials` block.

### 5. ContentStudio hook (separate, later)
- In `publishCopywriterVideo` (after a successful publish), build the day JSON from
  the `copywriter_videos` row and commit+push it to the site repo. Requires a
  GitHub fine-grained PAT (write access to `Diablov7/Wevolv3-Website`) in a Railway
  env var (`WEBSITE_REPO_TOKEN`). Documented; owner provisions the token to activate.
- Until the token is live, days can be produced by dropping JSON files into
  `data/crypto-news-today/` and pushing manually.

## Build order

1. Site side (this repo, now): generator + templates + nav/footer/sitemap wiring +
   seed one real example day (2026-07-04) with a committed 16x9 video → verify locally.
2. ContentStudio side (later): JSON emitter + git push in the publish step.

## Non-goals

- No hosted article text / no summaries (title + source link only).
- No comments, no client-side JS data fetching, no Sanity dependency for this section.
- No changes to news collection/ranking/video rendering.
