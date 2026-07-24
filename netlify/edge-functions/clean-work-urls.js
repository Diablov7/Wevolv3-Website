// Netlify Edge Function: clean URLs for the Works / case-study pages.
// Serves the singlework.html shell for /works/<slug> and 301-redirects the legacy
// /singlework(.html)?slug=<slug> URLs to the clean path. Mirrors the blog approach
// in inject-og-tags.js: fetch the case-study data from Sanity and render it
// VISIBLY into the initial HTML response (not just as meta tags), because
// GPTBot/ClaudeBot/PerplexityBot/OAI-SearchBot don't execute the client-side JS
// that normally populates this page. Before this fix, every /works/<slug> URL
// returned only the raw shell — literally "Project not found" text — to any
// crawler that doesn't run JavaScript.
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

  // Fetch the case-study shell (singlework.html). Clean /works/<slug> URLs have no
  // static file at that path, so fetch the shell explicitly rather than using
  // context.next() (which, when an edge function owns the path, hits the SPA
  // fallback and returns index.html).
  let html;
  try {
    const shellResp = await fetch(new URL('/singlework.html?__shell=1', url.origin).toString());
    html = await shellResp.text();
  } catch (e) {
    console.error('Failed to fetch work shell:', e);
    return context.next();
  }

  const projectId = 'sszuldy6';
  const dataset = 'production';
  const apiVersion = '2024-01-01';

  const query = `*[_type == "work" && slug.current == "${slug}"][0] {
    title,
    shortDescription,
    description,
    mainImage { asset { _ref } },
    category,
    projectType,
    year,
    client,
    results,
    _createdAt,
    _updatedAt,
    slug
  }`;

  const sanityUrl = `https://${projectId}.api.sanity.io/v${apiVersion}/data/query/${dataset}?query=${encodeURIComponent(query)}`;

  try {
    const sanityResponse = await fetch(sanityUrl);
    const data = await sanityResponse.json();
    const work = data.result;

    if (!work || !work.title) {
      console.log('Work not found or missing title, slug:', slug);
      return new Response(html, { status: 200, headers: { 'Content-Type': 'text/html; charset=UTF-8' } });
    }

    function sanityImageUrl(source) {
      const ref = source && source.asset && source.asset._ref;
      if (!ref) return 'https://wevolv3.com/images/LOGO.PNG';
      const parts = ref.split('-');
      if (parts.length < 4) return 'https://wevolv3.com/images/LOGO.PNG';
      const id = parts[1];
      const dimensions = parts[2];
      const format = parts.slice(3).join('-');
      return `https://cdn.sanity.io/images/${projectId}/${dataset}/${id}-${dimensions}.${format}?w=1200&h=630&fit=crop&auto=format`;
    }
    function sanityImageDims(source) {
      const ref = source && source.asset && source.asset._ref;
      const m = ref && /-(\d+)x(\d+)-/.exec(ref);
      return m ? { width: m[1], height: m[2] } : null;
    }

    function htmlEscape(s) {
      return String(s == null ? '' : s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    function portableTextToPlain(blocks) {
      if (!Array.isArray(blocks)) return '';
      const out = [];
      for (const b of blocks) {
        if (b && b._type === 'block' && Array.isArray(b.children)) {
          const text = b.children.map(c => (c && c.text) || '').join('');
          if (text.trim()) out.push(text);
        }
      }
      return out.join('\n\n');
    }
    function portableTextToBasicHtml(blocks) {
      if (!Array.isArray(blocks)) return '';
      let out = '';
      let inList = false, listType = '';
      const closeList = () => { if (inList) { out += listType === 'bullet' ? '</ul>' : '</ol>'; inList = false; } };
      for (const block of blocks) {
        if (!block || block._type !== 'block') continue;
        const text = htmlEscape((block.children || []).map(c => (c && c.text) || '').join(''));
        if (!text.trim()) continue;
        if (block.listItem) {
          const t = block.listItem === 'number' ? 'number' : 'bullet';
          if (!inList || listType !== t) { closeList(); out += t === 'bullet' ? '<ul>' : '<ol>'; inList = true; listType = t; }
          out += `<li>${text}</li>`;
          continue;
        }
        closeList();
        const style = block.style;
        if (style === 'h2') out += `<h2>${text}</h2>`;
        else if (style === 'h3') out += `<h3>${text}</h3>`;
        else if (style === 'h4') out += `<h4>${text}</h4>`;
        else if (style === 'blockquote') out += `<blockquote>${text}</blockquote>`;
        else out += `<p>${text}</p>`;
      }
      closeList();
      return out;
    }

    const imageUrl = sanityImageUrl(work.mainImage);
    const imageDims = sanityImageDims(work.mainImage);
    const title = work.title;
    const description = work.shortDescription || 'A Wevolv3 Web3 growth case study.';
    const pageUrl = `https://wevolv3.com/works/${encodeURIComponent(slug)}`;
    const descriptionPlain = portableTextToPlain(work.description);
    const descriptionHtml = portableTextToBasicHtml(work.description);
    const results = Array.isArray(work.results) ? work.results.filter(r => r && (r.metric || r.value)) : [];

    const jsonEscape = (s) => JSON.stringify(s == null ? '' : String(s)).slice(1, -1);
    const safeTitle = jsonEscape(title);
    const safeDescription = jsonEscape(description);
    const bodyForSchema = descriptionPlain.length > 25000 ? descriptionPlain.slice(0, 25000) : descriptionPlain;

    const articleSchema = `{
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "${safeTitle}",
      "description": "${safeDescription}",
      "image": "${jsonEscape(imageUrl)}",
      "url": "${jsonEscape(pageUrl)}",
      "mainEntityOfPage": { "@type": "WebPage", "@id": "${jsonEscape(pageUrl)}" },
      "dateModified": "${jsonEscape(work._updatedAt || work._createdAt)}",
      "author": { "@type": "Organization", "name": "Wevolv3" },
      "publisher": {
        "@type": "Organization",
        "name": "Wevolv3",
        "url": "https://wevolv3.com",
        "logo": { "@type": "ImageObject", "url": "https://wevolv3.com/images/LOGO.PNG" }
      },
      "isPartOf": { "@type": "CollectionPage", "name": "Wevolv3 Works", "url": "https://wevolv3.com/works.html" }${work.category ? `,
      "articleSection": ${JSON.stringify(work.category)}` : ''}${bodyForSchema ? `,
      "articleBody": "${jsonEscape(bodyForSchema)}"` : ''},
      "inLanguage": "en"
    }`.replace(/</g, '\\u003c');

    const breadcrumbSchema = `{
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://wevolv3.com/" },
        { "@type": "ListItem", "position": 2, "name": "Works", "item": "https://wevolv3.com/works.html" },
        { "@type": "ListItem", "position": 3, "name": "${safeTitle}", "item": "${jsonEscape(pageUrl)}" }
      ]
    }`.replace(/</g, '\\u003c');

    const metaTags = `
      <meta property="og:type" content="article">
      <meta property="og:title" content="${htmlEscape(title)}">
      <meta property="og:description" content="${htmlEscape(description).substring(0, 200)}">
      <meta property="og:url" content="${pageUrl}">
      <meta property="og:image" content="${imageUrl}">
      <meta property="og:image:width" content="1200">
      <meta property="og:image:height" content="630">
      <meta property="og:site_name" content="Wevolv3">
      <meta name="twitter:card" content="summary_large_image">
      <meta name="twitter:title" content="${htmlEscape(title)}">
      <meta name="twitter:description" content="${htmlEscape(description).substring(0, 200)}">
      <meta name="twitter:image" content="${imageUrl}">
      <title>${htmlEscape(title)} | Wevolv3 Works</title>
      <meta name="description" content="${htmlEscape(description).substring(0, 160)}">
      <link rel="canonical" href="${pageUrl}">
      <script id="work-schema-edge" type="application/ld+json">${articleSchema}</script>
      <script id="work-breadcrumb-schema-edge" type="application/ld+json">${breadcrumbSchema}</script>
    `;

    let updatedHtml = html
      .replace(/<meta\s+property=["']og:title["'][^>]*>/gi, '')
      .replace(/<meta\s+property=["']og:description["'][^>]*>/gi, '')
      .replace(/<meta\s+property=["']og:url["'][^>]*>/gi, '')
      .replace(/<meta\s+property=["']og:image["'][^>]*>/gi, '')
      .replace(/<meta\s+name=["']twitter:title["'][^>]*>/gi, '')
      .replace(/<meta\s+name=["']twitter:description["'][^>]*>/gi, '')
      .replace(/<meta\s+name=["']twitter:image["'][^>]*>/gi, '')
      .replace(/<title[^>]*>.*?<\/title>/gi, '')
      .replace(/<meta\s+name=["']description["'][^>]*>/gi, '')
      .replace(/<link\s+rel=["']canonical["'][^>]*>/gi, '')
      .replace('</head>', `${metaTags}</head>`);

    // Render the case study VISIBLY in the initial HTML (this is the actual fix —
    // meta tags alone don't help a crawler that only extracts body text).
    updatedHtml = updatedHtml
      .replace(
        '<div id="work-loading" class="work-loading" style="text-align: center; padding: 100px 20px;">',
        '<div id="work-loading" class="work-loading" style="display:none;">'
      )
      .replace(
        /<div id="work-content" class="sigle-work-section" style="display: none;">/,
        '<div id="work-content" class="sigle-work-section">'
      )
      .replace(
        /<h4 id="work-title" class="single-main-title-heading">Loading\.\.\.<\/h4>/,
        `<h4 id="work-title" class="single-main-title-heading">${htmlEscape(title)}</h4>`
      )
      .replace(
        /<div id="work-year" class="single-details-text">-<\/div>/,
        `<div id="work-year" class="single-details-text">${htmlEscape(work.year || '-')}</div>`
      )
      .replace(
        /<div id="work-description" class="single-details-text" style="margin-top: 30px;">Loading\.\.\.<\/div>/,
        `<div id="work-description" class="single-details-text" style="margin-top: 30px;">${descriptionHtml}</div>`
      );

    if (work.projectType) {
      updatedHtml = updatedHtml
        .replace(/<div id="work-type-item" class="single-left-item" style="display: none;">/, '<div id="work-type-item" class="single-left-item">')
        .replace(/<div id="work-type" class="single-details-text"><\/div>/, `<div id="work-type" class="single-details-text">${htmlEscape(work.projectType)}</div>`);
    }
    if (work.client) {
      updatedHtml = updatedHtml
        .replace(/<div id="work-client-item" class="single-left-item" style="display: none;">/, '<div id="work-client-item" class="single-left-item">')
        .replace(/<div id="work-client" class="single-details-text"><\/div>/, `<div id="work-client" class="single-details-text">${htmlEscape(work.client)}</div>`);
    }
    if (results.length) {
      const resultsHtml = results.map(r => `${htmlEscape(r.metric || '')}: ${htmlEscape(r.value || '')}`).join('<br>');
      updatedHtml = updatedHtml
        .replace(/<div id="work-results-item" class="single-left-item" style="display: none;">/, '<div id="work-results-item" class="single-left-item">')
        .replace(/<div id="work-results" class="single-details-text"><\/div>/, `<div id="work-results" class="single-details-text">${resultsHtml}</div>`);
    }
    if (work.mainImage && work.mainImage.asset) {
      updatedHtml = updatedHtml.replace(
        /<img\s+id="work-image"\s+src="data:image\/svg\+xml[^"]*"/,
        `<img id="work-image" src="${htmlEscape(imageUrl)}"${imageDims ? ` width="${imageDims.width}" height="${imageDims.height}"` : ''} loading="eager"`
      );
    }

    return new Response(updatedHtml, { status: 200, headers: { 'Content-Type': 'text/html; charset=UTF-8' } });
  } catch (error) {
    console.error('Error rendering work page:', error);
    return new Response(html, { status: 200, headers: { 'Content-Type': 'text/html; charset=UTF-8' } });
  }
};
