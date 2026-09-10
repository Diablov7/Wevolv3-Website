// Keeps the crawlable "All articles" index in blog.html in sync with Sanity.
//
// That index is the only server-rendered link most posts get, and until now it was
// a hand-maintained list: a post published from the Studio stayed out of it (an
// orphan reachable only through the sitemap) until someone synced blog.html by hand.
// This rewrites the list on every request from the same posts query the sitemap
// uses. The static list stays in blog.html as the fallback: if Sanity is slow or
// down, the page is served exactly as it was before this function existed.

// An edge function that builds its own Response does not inherit [[headers]] from
// netlify.toml, so the "/*" security headers are repeated here. Keep in sync.
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com https://us-assets.i.posthog.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https://cdn.sanity.io https://res.cloudinary.com https://www.google-analytics.com https://wevolv3.com; connect-src 'self' https://*.api.sanity.io https://*.apicdn.sanity.io https://*.google-analytics.com https://*.analytics.google.com https://us.i.posthog.com https://us-assets.i.posthog.com; media-src 'self' https://res.cloudinary.com https://uploads.postiz.com; frame-src 'self' https://www.youtube-nocookie.com https://www.youtube.com; base-uri 'self'; object-src 'none'; frame-ancestors 'self'",
};

const PROJECT_ID = 'sszuldy6';
const DATASET = 'production';
const API_VERSION = '2024-01-01';
const START_MARK = '<!-- ARCHIVE-INDEX:START -->';
const END_MARK = '<!-- ARCHIVE-INDEX:END -->';
const SANITY_TIMEOUT_MS = 2500;
const LINK_STYLE = 'color:#cfcfcf;text-decoration:none;font-size:15px;';

function htmlEscape(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Brand rule: visible copy never uses the word. Curated labels from the static list
// already avoid it; this only covers a new post whose Sanity title still carries the
// SEO keyword, which is allowed in the title but not in the index anchor text.
function visibleLabel(title) {
  return String(title || '')
    .replace(/\bagencies\b/gi, 'Vendors')
    .replace(/\bagency\b/gi, 'Vendor')
    .trim();
}

async function fetchPosts() {
  const query = `*[_type == "post" && defined(slug.current) && (!defined(published) || published == true)] | order(publishedAt desc) { title, "slug": slug.current }`;
  const url = `https://${PROJECT_ID}.apicdn.sanity.io/v${API_VERSION}/data/query/${DATASET}?query=${encodeURIComponent(query)}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), SANITY_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`Sanity responded ${res.status}`);
    const data = await res.json();
    return Array.isArray(data.result) ? data.result.filter((p) => p && p.slug && p.title) : [];
  } finally {
    clearTimeout(timer);
  }
}

function withHeaders(html, base) {
  const headers = new Headers(base.headers);
  // The body was decoded by .text(), so the original length/encoding no longer apply.
  headers.delete('content-length');
  headers.delete('content-encoding');
  headers.set('Content-Type', 'text/html; charset=UTF-8');
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) headers.set(k, v);
  return new Response(html, { status: base.status, headers });
}

export default async (request, context) => {
  const res = await context.next();
  if (res.status !== 200 || !(res.headers.get('content-type') || '').includes('text/html')) {
    return res;
  }

  const html = await res.text();
  const start = html.indexOf(START_MARK);
  const end = html.indexOf(END_MARK);
  if (start < 0 || end < start) return withHeaders(html, res);

  let posts;
  try {
    posts = await fetchPosts();
  } catch (e) {
    console.error('[blog-index] Sanity fetch failed, serving the static list:', e);
    return withHeaders(html, res);
  }
  if (!posts.length) return withHeaders(html, res);

  // Curated anchor text from the static list wins over the raw Sanity title.
  const staticList = html.slice(start + START_MARK.length, end);
  const curated = new Map();
  for (const m of staticList.matchAll(/href="\/blog\/([^"]+)"[^>]*>([^<]+)<\/a>/g)) {
    curated.set(decodeURIComponent(m[1]), m[2]);
  }

  const seen = new Set();
  const items = [];
  for (const p of posts) {
    if (seen.has(p.slug)) continue;
    seen.add(p.slug);
    const label = curated.has(p.slug) ? curated.get(p.slug) : htmlEscape(visibleLabel(p.title));
    items.push(`                        <li><a href="/blog/${encodeURIComponent(p.slug)}" style="${LINK_STYLE}">${label}</a></li>`);
  }

  const rebuilt = html.slice(0, start + START_MARK.length) + '\n' + items.join('\n') + '\n                        ' + html.slice(end);
  return withHeaders(rebuilt, res);
};
