// Netlify Edge Function: clean URLs for the Works / case-study pages.
// Serves the singlework.html shell for /works/<slug> and 301-redirects the legacy
// /singlework(.html)?slug=<slug> URLs to the clean path. Mirrors the blog approach.
export default async (request, context) => {
  const url = new URL(request.url);

  const isWorkPath = url.pathname.startsWith('/works/') && url.pathname !== '/works/';
  const isSinglework = url.pathname.includes('singlework');
  if (!isWorkPath && !isSinglework) {
    return context.next();
  }

  // slug from clean path first, then legacy ?slug=
  let slug = null;
  if (isWorkPath) {
    slug = decodeURIComponent(url.pathname.replace(/^\/works\//, '').replace(/\/+$/, ''));
  }
  if (!slug) {
    slug = url.searchParams.get('slug');
  }

  // 301 legacy singlework URLs (?slug=) -> clean /works/<slug>
  if (isSinglework && slug) {
    return Response.redirect(new URL('/works/' + encodeURIComponent(slug), url.origin).toString(), 301);
  }

  if (!slug) {
    return context.next();
  }

  // Serve the case-study shell for the clean /works/<slug> URL. There is no static file
  // at that path, so fetch the shell explicitly (context.next() would hit the SPA fallback).
  if (isWorkPath) {
    try {
      const shellResp = await fetch(new URL('/singlework.html?__shell=1', url.origin).toString());
      const html = await shellResp.text();
      return new Response(html, { status: 200, headers: { 'Content-Type': 'text/html; charset=UTF-8' } });
    } catch (e) {
      return context.next();
    }
  }

  return context.next();
};
