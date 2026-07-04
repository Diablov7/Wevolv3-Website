#!/usr/bin/env node
/**
 * sync-news.js — pull published "Crypto News Today" days from ContentStudio and
 * write them into data/crypto-news-today/<date>.json.
 *
 * Source: the public read-only feed on the ContentStudio app
 *   https://studio.wevolv3.com/public/crypto-news-today.json
 * (override with CONTENTSTUDIO_NEWS_URL). Runs in the GitHub Action before
 * generate-news.js; the Action then commits any changes (which triggers Netlify).
 *
 * Fail-soft: on any network/parse error it logs and exits 0, leaving the
 * already-committed day files untouched, so the site never breaks. Existing
 * day files are never deleted (the section is a permanent archive); only new or
 * changed days are written.
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const SRC = process.env.CONTENTSTUDIO_NEWS_URL || 'https://studio.wevolv3.com/public/crypto-news-today.json';
const DIR = path.join(__dirname, 'data', 'crypto-news-today');

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'wevolv3-site-sync' } }, (r) => {
      if (r.statusCode !== 200) { r.resume(); reject(new Error(`HTTP ${r.statusCode}`)); return; }
      let s = '';
      r.on('data', (d) => (s += d));
      r.on('end', () => { try { resolve(JSON.parse(s)); } catch (e) { reject(e); } });
    });
    req.on('error', reject);
    req.setTimeout(20000, () => req.destroy(new Error('timeout')));
  });
}

function validDay(d) {
  return d && typeof d.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d.date)
    && Array.isArray(d.stories) && d.stories.some((s) => s && s.url && s.text);
}

(async () => {
  let data;
  try {
    data = await fetchJson(SRC);
  } catch (e) {
    console.warn(`[sync] could not fetch ${SRC}: ${e.message} — keeping existing data.`);
    return; // exit 0
  }
  const days = (data && Array.isArray(data.days)) ? data.days : [];
  if (!days.length) { console.log('[sync] feed returned 0 days — nothing to do.'); return; }

  fs.mkdirSync(DIR, { recursive: true });
  let written = 0;
  for (const day of days) {
    if (!validDay(day)) { console.warn(`[sync] skipping malformed day: ${day && day.date}`); continue; }
    const file = path.join(DIR, `${day.date}.json`);
    const next = JSON.stringify(day, null, 2) + '\n';
    const prev = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
    if (prev !== next) { fs.writeFileSync(file, next); written++; console.log(`[sync] wrote ${day.date}`); }
  }
  console.log(`[sync] ${days.length} day(s) from source, ${written} new/changed.`);
})();
