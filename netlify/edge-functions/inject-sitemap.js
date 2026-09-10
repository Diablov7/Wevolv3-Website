// Serves /sitemap.xml with the blog posts read live from Sanity.
//
// sitemap.xml in the repo is regenerated once a day by a GitHub Action (02:00 UTC),
// so a post published from the Studio stayed out of it for up to 24 hours. This keeps
// every static page and work entry from that file exactly as generated and swaps only
// the /blog/ entries for the live list. If Sanity is slow or down, the committed file
// is served untouched.

const PROJECT_ID = 'sszuldy6';
const DATASET = 'production';
const API_VERSION = '2024-01-01';
const BASE_URL = 'https://wevolv3.com';
const SANITY_TIMEOUT_MS = 2500;

async function fetchPosts() {
  // Same filter as generate-sitemap.js and the blog index, so the three never disagree.
  const query = `*[_type == "post" && defined(slug.current) && (!defined(published) || published == true)] | order(_updatedAt desc) { "slug": slug.current, "updatedAt": _updatedAt, publishedAt }`;
  const url = `https://${PROJECT_ID}.apicdn.sanity.io/v${API_VERSION}/data/query/${DATASET}?query=${encodeURIComponent(query)}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), SANITY_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`Sanity responded ${res.status}`);
    const data = await res.json();
    return Array.isArray(data.result) ? data.result.filter((p) => p && p.slug) : [];
  } finally {
    clearTimeout(timer);
  }
}

function xmlResponse(xml, base) {
  const headers = new Headers(base.headers);
  // The body was decoded by .text(), so the original length/encoding no longer apply.
  headers.delete('content-length');
  headers.delete('content-encoding');
  headers.set('Content-Type', 'application/xml; charset=UTF-8');
  headers.set('X-Content-Type-Options', 'nosniff');
  return new Response(xml, { status: base.status, headers });
}

export default async (request, context) => {
  const res = await context.next();
  if (res.status !== 200) return res;
  const xml = await res.text();
  if (!xml.includes('</urlset>')) return xmlResponse(xml, res);

  let posts;
  try {
    posts = await fetchPosts();
  } catch (e) {
    console.error('[sitemap] Sanity fetch failed, serving the committed sitemap:', e);
    return xmlResponse(xml, res);
  }
  if (!posts.length) return xmlResponse(xml, res);

  const withoutPosts = xml.replace(/\s*<url>\s*<loc>https:\/\/wevolv3\.com\/blog\/[^<]*<\/loc>[\s\S]*?<\/url>/g, '');
  const entries = posts.map((p) => {
    const date = String(p.updatedAt || p.publishedAt || '').split('T')[0];
    return `  <url>\n    <loc>${BASE_URL}/blog/${encodeURIComponent(p.slug)}</loc>\n${date ? `    <lastmod>${date}</lastmod>\n` : ''}    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>`;
  });
  return xmlResponse(withoutPosts.replace('</urlset>', `${entries.join('\n')}\n</urlset>`), res);
};
