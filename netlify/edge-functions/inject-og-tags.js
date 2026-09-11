// Netlify Edge Function to inject Open Graph and Twitter Card meta tags
// This runs BEFORE the page is served, so Twitter/Facebook crawlers see the correct tags

// Security headers duplicated from netlify.toml's "/*" rule. An edge function that
// builds its own Response does NOT inherit headers from [[headers]] in netlify.toml
// (confirmed live: only Netlify's own default HSTS showed up here, none of the rest) —
// so every Response this function returns must carry them explicitly.
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com https://us-assets.i.posthog.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https://cdn.sanity.io https://res.cloudinary.com https://www.google-analytics.com https://wevolv3.com; connect-src 'self' https://*.api.sanity.io https://*.apicdn.sanity.io https://*.google-analytics.com https://*.analytics.google.com https://us.i.posthog.com https://us-assets.i.posthog.com; media-src 'self' https://res.cloudinary.com https://uploads.postiz.com; frame-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'self'",
};

// Fetch the article shell (singleblog.html) from our own origin.
// IMPORTANT: a fetch() from an edge function to the same site starts a NEW request
// chain, so every edge function matching that path runs again — including this one.
// The ?__shell=1 marker is what breaks that: the re-entrant invocation bails out at
// the top of the handler with context.next() and serves the static file untouched.
// Never fetch this shell without the marker.
const SHELL_PATH = '/singleblog.html?__shell=1';

async function fetchShell(origin) {
  const resp = await fetch(new URL(SHELL_PATH, origin).toString());
  if (!resp.ok) {
    throw new Error(`Shell request failed with status ${resp.status}`);
  }
  const html = await resp.text();
  // Sanity check: if what came back isn't the article shell (an error page, an empty
  // body, index.html from a redirect fallback), every replace() below silently no-ops
  // and we'd serve a blank page. Better to bail out and let the normal pipeline serve
  // the page so the client-side JS can still render the article.
  if (!html || !html.includes('id="post-body"')) {
    throw new Error('Shell response does not look like singleblog.html');
  }
  return html;
}

export default async (request, context) => {
  const url = new URL(request.url);

  console.log('Edge Function called for:', url.pathname, url.search);

  // Re-entrant call from fetchShell() above: serve the static shell as-is.
  // Without this the /singleblog.html?__shell=1 request re-enters this function,
  // which fetches the shell again, and so on until Netlify kills the request chain.
  if (url.searchParams.has('__shell')) {
    console.log('Shell request, serving static file');
    return context.next();
  }

  // Process both clean blog URLs (/blog/<slug>) and legacy singleblog URLs
  const isBlogPath = url.pathname.startsWith('/blog/') && url.pathname !== '/blog/';
  const isSingleblog = url.pathname.includes('singleblog');
  if (!isBlogPath && !isSingleblog) {
    console.log('Not a blog article page, skipping');
    return context.next();
  }

  // Slugs that were renamed or merged. The legacy 301 below rewrites the path but
  // keeps the slug, so a slug that no longer exists in Sanity lands on a real 404.
  // Search Console flagged exactly that on 29/08/2026 with
  // /singleblog.html?slug=roi-overview. Map the dead slug to the article that
  // replaced it instead of losing whatever link equity points at the old URL.
  const RENAMED_SLUGS = {
    'roi-overview': 'galxe-vs-zealy-roi-platforms',
  };

  // Get slug from clean path (/blog/<slug>) first, then fall back to ?slug=
  let slug = null;
  if (isBlogPath) {
    slug = decodeURIComponent(url.pathname.replace(/^\/blog\//, '').replace(/\/+$/, ''));
  }
  if (!slug) {
    slug = url.searchParams.get('slug');
  }

  // A renamed slug 301s to its replacement, whichever URL shape it arrived in.
  if (slug && Object.prototype.hasOwnProperty.call(RENAMED_SLUGS, slug)) {
    return Response.redirect(
      new URL('/blog/' + encodeURIComponent(RENAMED_SLUGS[slug]), url.origin).toString(),
      301
    );
  }

  // 301 legacy singleblog URLs (?slug=) to the clean /blog/<slug> URL
  if (isSingleblog && slug) {
    return Response.redirect(new URL('/blog/' + encodeURIComponent(slug), url.origin).toString(), 301);
  }

  if (!slug) {
    console.log('No slug found');
    // Bare /singleblog (no slug at all) has no article to show. Serve a real 404 instead
    // of a 200'd empty shell, which Google flags as a soft 404.
    try {
      const html = await fetchShell(url.origin);
      return new Response(html, { status: 404, headers: { 'Content-Type': 'text/html; charset=UTF-8', ...SECURITY_HEADERS } });
    } catch (e) {
      console.error('Failed to fetch article shell for bare /singleblog:', e);
      return new Response('<!doctype html><meta charset="utf-8"><title>Not found | Wevolv3</title><p>Article not found. <a href="/blog.html">Back to all articles</a>.</p>', {
        status: 404,
        headers: { 'Content-Type': 'text/html; charset=UTF-8', ...SECURITY_HEADERS },
      });
    }
  }

  console.log('Processing slug:', slug);

  // Clean /blog/<slug> URLs have no static file at that path, so we fetch the shell
  // explicitly rather than using context.next() (which, when an edge function owns the
  // path, hits the SPA fallback and returns index.html).
  let html;
  try {
    html = await fetchShell(url.origin);
  } catch (e) {
    console.error('Failed to fetch article shell:', e);
    return context.next();
  }

  // Fetch post data from Sanity
  const projectId = 'sszuldy6';
  const dataset = 'production';
  const apiVersion = '2024-01-01';
  
  const query = `*[_type == "post" && slug.current == "${slug}"][0] {
    title,
    excerpt,
    body,
    mainImage {
      asset {
        _ref
      }
    },
    publishedAt,
    _updatedAt,
    seoTitle,
    seoDescription,
    "authorName": author->name,
    "authorBio": author->bio,
    "categoryNames": categories[]->title,
    socialImage {
      asset {
        _ref
      }
    },
    keyTakeaways,
    slug
  }`;

  const sanityUrl = `https://${projectId}.api.sanity.io/v${apiVersion}/data/query/${dataset}?query=${encodeURIComponent(query)}`;

  try {
    const sanityResponse = await fetch(sanityUrl);
    const data = await sanityResponse.json();
    
    // Log for debugging (will appear in Netlify logs)
    console.log('Sanity response:', JSON.stringify({ 
      hasResult: !!data.result, 
      hasTitle: !!data.result?.title,
      hasImage: !!data.result?.mainImage 
    }));
    
    const post = data.result;

    if (!post || !post.title) {
      console.log('Post not found or missing title, slug:', slug);
      // Serve the shell so the client-side JS can render its error state, but with a real
      // 404 status. A 200 here is a soft 404 (Google flags pages that look like "not found"
      // but return success) and gets the URL stuck in limbo instead of cleanly dropped.
      return new Response(html, { status: 404, headers: { 'Content-Type': 'text/html; charset=UTF-8', ...SECURITY_HEADERS } });
    }

    // Generate image URL from Sanity reference
    function sanityImageUrl(source) {
      if (!source || !source.asset) {
        console.log('No image source or asset found');
        return 'https://wevolv3.com/images/LOGO.PNG';
      }
      
      const ref = source.asset._ref;
      if (!ref) {
        console.log('No _ref in asset');
        return 'https://wevolv3.com/images/LOGO.PNG';
      }
      
      // Parse Sanity image reference: image-{id}-{width}x{height}-{format}
      // Example: image-abc123-1920x1080-jpg
      const parts = ref.split('-');
      if (parts.length < 4) {
        console.log('Invalid image ref format:', ref);
        return 'https://wevolv3.com/images/LOGO.PNG';
      }
      
      const id = parts[1];
      const dimensions = parts[2];
      const format = parts.slice(3).join('-'); // Handle formats like 'webp' or 'jpg'
      
      const baseUrl = `https://cdn.sanity.io/images/${projectId}/${dataset}/${id}-${dimensions}.${format}`;
      return `${baseUrl}?w=1200&h=630&fit=crop&auto=format`;
    }

    // Duas capas (09/2026): mainImage é a arte limpa que aparece no site; socialImage,
    // quando existe, é a versão com texto que vai no preview das redes (og/twitter).
    const hasSocialImage = !!(post.socialImage && post.socialImage.asset && post.socialImage.asset._ref);
    const imageUrl = sanityImageUrl(hasSocialImage ? post.socialImage : post.mainImage);
    const coverUrl = sanityImageUrl(post.mainImage);
    const title = post.title;
    // Cut at the last word boundary instead of mid-word (12 posts had descriptions
    // ending in half a word in the results).
    function trimAtWord(text, max) {
      const t = String(text || '').replace(/\s+/g, ' ').trim();
      if (t.length <= max) return t;
      const cut = t.slice(0, max - 1);
      const i = cut.lastIndexOf(' ');
      return (i > max * 0.6 ? cut.slice(0, i) : cut).replace(/[\s,;:.\-]+$/, '') + '…';
    }
    // Search snippet: the dedicated SEO field, then the excerpt, then the opening of
    // the article itself. The old fallback was one generic sentence shared by every
    // post without an excerpt, which search engines flag as a duplicate description.
    const description = trimAtWord(
      post.seoDescription || post.excerpt || portableTextToPlain(post.body) || 'Read this article about Web3 marketing and growth strategies.',
      160
    );
    // <title>: the SEO field or the article title, with the brand suffix only when it
    // still fits in ~60 characters (24 of 33 titles were being cut off in results).
    const titleBase = String(post.seoTitle || title || '').trim();
    const titleTag = `${titleBase} | Wevolv3 Blog`.length <= 60 ? `${titleBase} | Wevolv3 Blog` : titleBase;
    // Always use the clean canonical URL for OG/canonical/JSON-LD, regardless of how the page was reached
    const pageUrl = `https://wevolv3.com/blog/${encodeURIComponent(slug)}`;
    const datePublished = post.publishedAt || post._updatedAt || null;
    const dateModified = post._updatedAt || post.publishedAt || null;
    const authorName = post.authorName || 'Wevolv3';
    const categories = Array.isArray(post.categoryNames) ? post.categoryNames.filter(Boolean) : [];

    // Convert Sanity Portable Text (block content) to plain text for the
    // BlogPosting JSON-LD `articleBody` field. AI crawlers (GPTBot, ClaudeBot,
    // PerplexityBot) read JSON-LD aggressively, so this gives them the full
    // article without affecting any visible UI.
    function portableTextToPlain(blocks) {
      if (!Array.isArray(blocks)) return '';
      const out = [];
      for (const b of blocks) {
        if (!b || typeof b !== 'object') continue;
        if (b._type === 'block' && Array.isArray(b.children)) {
          const text = b.children.map(c => (c && typeof c.text === 'string') ? c.text : '').join('');
          if (text.trim()) out.push(text);
        }
      }
      return out.join('\n\n');
    }
    const articleBodyPlain = portableTextToPlain(post.body);
    // Cap to keep payload reasonable; very long articles are rare here.
    const articleBodyForSchema = articleBodyPlain.length > 25000
      ? articleBodyPlain.slice(0, 25000)
      : articleBodyPlain;
    const wordCount = articleBodyPlain ? articleBodyPlain.split(/\s+/).filter(Boolean).length : 0;

    // Convert Portable Text to the same HTML the client renderer in singleblog.html
    // produces: inline marks and links, tables (htmlTable), charts (htmlEmbed) and
    // body images included. It used to keep plain text only, so every link, table
    // and chart in an article was missing from the served HTML: Google only saw them
    // after rendering JS, and crawlers that don't run JS (GPTBot, ClaudeBot,
    // PerplexityBot) never did. That also left every post with zero crawlable
    // in-body links. The client JS still re-renders the same container.
    function htmlEscape(s) {
      return String(s == null ? '' : s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }
    function safeHref(href) {
      const h = String(href || '').trim();
      return /^(https?:|mailto:|tel:|\/|#)/i.test(h) ? h : null;
    }
    // htmlTable/htmlEmbed are raw HTML from our own CMS. The Studio already strips
    // scripts and inline handlers when it stores them; this repeats the same hardening
    // because anything with Sanity write access can put HTML here.
    function sanitizeRawHtml(html) {
      return String(html || '')
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
        .replace(/(href|src)\s*=\s*(["'])\s*javascript:[^"']*\2/gi, '$1="#"');
    }
    function renderSpans(block) {
      const defs = Array.isArray(block.markDefs) ? block.markDefs : [];
      return (block.children || []).map(child => {
        let content = htmlEscape(child && typeof child.text === 'string' ? child.text : '');
        const marks = child && Array.isArray(child.marks) ? child.marks : [];
        // Same order as the client: decorators first, links wrap them.
        for (const mark of marks) {
          if (mark === 'strong') content = `<strong>${content}</strong>`;
          else if (mark === 'em') content = `<em>${content}</em>`;
          else if (mark === 'code') content = `<code>${content}</code>`;
          else if (mark === 'underline') content = `<u>${content}</u>`;
        }
        for (const mark of marks) {
          const def = defs.find(d => d && d._key === mark);
          if (def && def._type === 'link') {
            const href = safeHref(def.href);
            if (href) content = `<a href="${htmlEscape(href)}" target="_blank" rel="noopener noreferrer">${content}</a>`;
          }
        }
        return content;
      }).join('');
    }
    function bodyImageUrl(block) {
      const ref = block && block.asset && block.asset._ref;
      const parts = ref ? ref.split('-') : [];
      if (parts.length < 4) return null;
      return `https://cdn.sanity.io/images/${projectId}/${dataset}/${parts[1]}-${parts[2]}.${parts.slice(3).join('-')}?w=1000&auto=format&q=75&fit=max`;
    }
    function portableTextToHtml(blocks) {
      if (!Array.isArray(blocks)) return '';
      let out = '';
      let inList = false;
      let listType = '';
      const closeList = () => {
        if (inList) {
          out += listType === 'bullet' ? '</ul>' : '</ol>';
          inList = false;
        }
      };
      for (const block of blocks) {
        if (!block || typeof block !== 'object') continue;
        if (block._type === 'image') {
          closeList();
          const src = bodyImageUrl(block);
          if (src) {
            const dims = sanityImageDims(block);
            out += `<img src="${htmlEscape(src)}"${dims ? ` width="${dims.width}" height="${dims.height}"` : ''} alt="${htmlEscape(block.alt || title)}" loading="lazy" decoding="async" style="max-width: 100%; height: auto; border-radius: 10px; margin: 30px 0;" />`;
          }
          continue;
        }
        if (block._type === 'htmlTable' && block.html) {
          closeList();
          out += `<div class="post-table-wrap">${sanitizeRawHtml(block.html)}</div>`;
          continue;
        }
        if (block._type === 'htmlEmbed' && block.html) {
          closeList();
          out += sanitizeRawHtml(block.html);
          continue;
        }
        if (block._type !== 'block') continue;
        const text = renderSpans(block);
        if (!text.replace(/<[^>]*>/g, '').trim()) continue;
        if (block.listItem) {
          const t = block.listItem === 'number' ? 'number' : 'bullet';
          if (!inList || listType !== t) {
            closeList();
            out += t === 'bullet' ? '<ul>' : '<ol>';
            inList = true;
            listType = t;
          }
          out += `<li>${text}</li>`;
          continue;
        }
        closeList();
        const style = block.style;
        if (style === 'h1') out += `<h1>${text}</h1>`;
        else if (style === 'h2') out += `<h2>${text}</h2>`;
        else if (style === 'h3') out += `<h3>${text}</h3>`;
        else if (style === 'h4') out += `<h4>${text}</h4>`;
        else if (style === 'blockquote') out += `<blockquote>${text}</blockquote>`;
        else out += `<p>${text}</p>`;
      }
      closeList();
      return out;
    }
    const articleBodyHtml = portableTextToHtml(post.body);

    // The client injects these two stylesheets into <head> the first time it renders a
    // table or chart, and skips it when the id already exists. Serving them in <head>
    // styles the server-rendered table and stays compatible with that check (inside
    // #post-body they would be wiped when the client re-renders the container).
    const bodyBlocks = Array.isArray(post.body) ? post.body : [];
    const bodyCss =
      (bodyBlocks.some(b => b && b._type === 'htmlTable' && b.html)
        ? '<style id="post-table-css">.post-table-wrap{overflow-x:auto;margin:28px 0}.post-table-wrap table{width:100%;border-collapse:collapse;font-size:15px}.post-table-wrap th,.post-table-wrap td{border:1px solid rgba(128,128,128,.35);padding:10px 14px;text-align:left;vertical-align:top}.post-table-wrap th{background:rgba(128,128,128,.14);font-weight:700}</style>'
        : '') +
      (bodyBlocks.some(b => b && b._type === 'htmlEmbed' && b.html)
        ? '<style id="post-embed-css">.post-chart{margin:28px 0;text-align:center}.post-chart img{max-width:100%;height:auto}.post-chart figcaption{font-size:13px;opacity:.7;margin-top:8px}.post-chart figcaption a{color:inherit;text-decoration:underline}</style>'
        : '');

    // Extract Q&A pairs from a "Frequently Asked Questions" section (articles already
    // write these in prose) so we can emit FAQPage schema for AI Overviews / rich results.
    function extractFaqPairs(blocks) {
      if (!Array.isArray(blocks)) return [];
      const faqs = [];
      let inFaq = false;
      let question = null;
      let answerParts = [];
      const flush = () => {
        if (question && answerParts.length) {
          faqs.push({ q: question, a: answerParts.join(' ').trim() });
        }
        question = null;
        answerParts = [];
      };
      for (const b of blocks) {
        if (!b || b._type !== 'block') continue;
        const text = (b.children || []).map(c => (c && c.text) || '').join('').trim();
        if (!text) continue;
        const style = b.style || 'normal';
        if (/^h[12]$/.test(style)) {
          if (/frequently asked questions|^faq\b/i.test(text)) {
            inFaq = true;
          } else if (inFaq) {
            flush();
            inFaq = false;
          }
          continue;
        }
        if (!inFaq) continue;
        const looksLikeQuestion = /^h[34]$/.test(style) || (style === 'normal' && /\?\s*$/.test(text) && answerParts.length === 0 && !question);
        if (looksLikeQuestion) {
          flush();
          question = text;
        } else if (question) {
          answerParts.push(text);
        }
      }
      flush();
      return faqs.slice(0, 12);
    }
    const faqPairs = extractFaqPairs(post.body);

    // Log injected values for debugging
    console.log('Injecting OG tags:', { title, imageUrl, description: description.substring(0, 50) });

    // Helper to JSON-escape values safely for embedding inside a <script type="application/ld+json"> block.
    // We then HTML-escape any '<' to keep the script tag from being terminated early.
    const jsonEscape = (s) => JSON.stringify(s == null ? '' : String(s)).slice(1, -1);
    const safeTitle = jsonEscape(title);
    const safeDescription = jsonEscape(description);
    const safeAuthor = jsonEscape(authorName);
    // Slugify the author name the same way team members are keyed on about.html
    // (#team-<slug>), so BlogPosting.author @id resolves to a real Person entity
    // whenever the Sanity author matches a listed team member. Harmless no-op
    // (an unresolved fragment, same as today) when it doesn't match.
    const authorSlug = authorName.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

    const blogPostingSchema = `{
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "headline": "${safeTitle}",
      "description": "${safeDescription}",
      "image": "${jsonEscape(imageUrl)}",
      "url": "${jsonEscape(pageUrl)}",
      "mainEntityOfPage": { "@type": "WebPage", "@id": "${jsonEscape(pageUrl)}" }${datePublished ? `,
      "datePublished": "${jsonEscape(datePublished)}"` : ''}${dateModified ? `,
      "dateModified": "${jsonEscape(dateModified)}"` : ''},
      "author": ${/^wevolv3$/i.test(authorName.trim())
        // The only author document today is the brand itself. It used to go out as a
        // Person named "Wevolv3", which is wrong; a real person author keeps Person.
        ? `{ "@type": "Organization", "name": "Wevolv3", "url": "https://wevolv3.com" }`
        : `{ "@type": "Person", "@id": "https://wevolv3.com/about.html#team-${jsonEscape(authorSlug)}", "name": "${safeAuthor}" }`},
      "publisher": {
        "@type": "Organization",
        "name": "Wevolv3",
        "url": "https://wevolv3.com",
        "logo": { "@type": "ImageObject", "url": "https://wevolv3.com/images/LOGO.PNG" }
      },
      "isPartOf": { "@type": "Blog", "name": "Wevolv3 Blog", "url": "https://wevolv3.com/blog.html" }${categories.length ? `,
      "articleSection": ${JSON.stringify(categories[0])},
      "keywords": ${JSON.stringify(categories.join(', '))}` : ''}${wordCount ? `,
      "wordCount": ${wordCount}` : ''}${articleBodyForSchema ? `,
      "articleBody": "${jsonEscape(articleBodyForSchema)}"` : ''},
      "inLanguage": "en"
    }`.replace(/</g, '\\u003c');

    const breadcrumbSchema = `{
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://wevolv3.com/" },
        { "@type": "ListItem", "position": 2, "name": "Blog", "item": "https://wevolv3.com/blog.html" },
        { "@type": "ListItem", "position": 3, "name": "${safeTitle}", "item": "${jsonEscape(pageUrl)}" }
      ]
    }`.replace(/</g, '\\u003c');

    // FAQPage schema, only emitted when the article actually has a detectable
    // FAQ section (see extractFaqPairs above) — never fabricated.
    const faqSchema = faqPairs.length >= 2 ? `{
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [${faqPairs.map(f => `{
        "@type": "Question",
        "name": "${jsonEscape(f.q)}",
        "acceptedAnswer": { "@type": "Answer", "text": "${jsonEscape(f.a)}" }
      }`).join(',')}]
    }`.replace(/</g, '\\u003c') : null;

    // Inject meta tags + JSON-LD schemas
    const metaTags = `
      <!-- Injected by Edge Function for Social Sharing + AI Crawlers -->
      <meta property="og:type" content="article">
      <meta property="og:title" content="${title.replace(/"/g, '&quot;')}">
      <meta property="og:description" content="${description.replace(/"/g, '&quot;').substring(0, 200)}">
      <meta property="og:url" content="${pageUrl}">
      <meta property="og:image" content="${imageUrl}">
      <meta property="og:image:width" content="1200">
      <meta property="og:image:height" content="630">
      <meta property="og:site_name" content="Wevolv3">
      ${datePublished ? `<meta property="article:published_time" content="${datePublished}">` : ''}
      ${dateModified ? `<meta property="article:modified_time" content="${dateModified}">` : ''}
      <meta property="article:author" content="${authorName.replace(/"/g, '&quot;')}">

      <meta name="twitter:card" content="summary_large_image">
      <meta name="twitter:title" content="${title.replace(/"/g, '&quot;')}">
      <meta name="twitter:description" content="${description.replace(/"/g, '&quot;').substring(0, 200)}">
      <meta name="twitter:image" content="${imageUrl}">

      <title>${titleTag.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</title>
      <meta name="description" content="${description.replace(/"/g, '&quot;').substring(0, 160)}">
      <link rel="canonical" href="${pageUrl}">

      <script id="article-schema-edge" type="application/ld+json">${blogPostingSchema}</script>
      <script id="breadcrumb-schema-edge" type="application/ld+json">${breadcrumbSchema}</script>
      ${faqSchema ? `<script id="faq-schema-edge" type="application/ld+json">${faqSchema}</script>` : ''}
      ${bodyCss}
    `;

    // <noscript> kept as a defensive extra fallback (zero cost, zero visible impact
    // with JS on). The REAL fix is below: the article is now rendered visibly in the
    // initial HTML response, because many crawlers' text-extraction pipelines strip
    // <noscript> content the same way they strip <script>/<style> — relying on it
    // alone was not enough (confirmed live: GPTBot/ClaudeBot/PerplexityBot and even
    // WebFetch-style fetchers were seeing "Loading article..." with no real text).
    const noscriptArticle = articleBodyHtml ? `
<noscript>
  <article>
    <h1>${htmlEscape(title)}</h1>
    ${categories.length ? `<p><strong>Category:</strong> ${htmlEscape(categories[0])}</p>` : ''}
    ${datePublished ? `<p><strong>Published:</strong> <time datetime="${htmlEscape(datePublished)}">${htmlEscape(datePublished)}</time></p>` : ''}
    <p><strong>Author:</strong> ${htmlEscape(authorName)}</p>
    <p><img src="${htmlEscape(imageUrl)}" alt="${htmlEscape(title)}" /></p>
    ${articleBodyHtml}
    <p><a href="https://wevolv3.com/blog.html">Back to all articles</a></p>
  </article>
</noscript>
` : '';

    // Parse width/height from the Sanity asset ref (image-{id}-{w}x{h}-{format})
    // so the server-rendered <img> carries explicit dimensions — helps CLS and
    // costs nothing since we already have the ref for the URL above.
    function sanityImageDims(source) {
      const ref = source && source.asset && source.asset._ref;
      const m = ref && /-(\d+)x(\d+)-/.exec(ref);
      return m ? { width: m[1], height: m[2] } : null;
    }
    const imageDims = sanityImageDims(post.mainImage);

    // Linha do autor do layout de coluna unica (09/2026): quem escreveu, data e tempo
    // de leitura a esquerda; compartilhar a direita. O estilo (.wv-meta) mora no
    // singleblog.html, e o "Copy link" e tratado pelo script de la.
    const fmtDate = (d) => new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    const sameDay = (a, b) => String(a).slice(0, 10) === String(b).slice(0, 10);
    const readMinutes = wordCount ? Math.max(1, Math.round(wordCount / 230)) : 0;
    const authorInitials = authorName.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('') || 'W';
    const shareUrl = encodeURIComponent(pageUrl);
    const shareText = encodeURIComponent(title);
    const bylineHtml = `<div class="wv-meta post-byline">
      <div class="wv-author"><span class="wv-avatar" aria-hidden="true">${htmlEscape(authorInitials)}</span><span><strong>${htmlEscape(authorName)}</strong>${datePublished ? `<time datetime="${htmlEscape(datePublished)}">${htmlEscape(fmtDate(datePublished))}</time>` : ''}${readMinutes ? ` · ${readMinutes} min read` : ''}${dateModified && datePublished && !sameDay(dateModified, datePublished) ? ` · Updated <time datetime="${htmlEscape(dateModified)}">${htmlEscape(fmtDate(dateModified))}</time>` : ''}</span></div>
      <div class="wv-share" aria-label="Share this article"><span class="wv-share-label">Share</span><a href="https://twitter.com/intent/tweet?url=${shareUrl}&amp;text=${shareText}" target="_blank" rel="noopener">X</a><a href="https://t.me/share/url?url=${shareUrl}&amp;text=${shareText}" target="_blank" rel="noopener">Telegram</a><a href="https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}" target="_blank" rel="noopener">LinkedIn</a><button type="button" data-copy="${htmlEscape(pageUrl)}" data-label="Copy link">Copy link</button></div>
    </div>`;

    // Pontos principais (keyTakeaways) logo depois do primeiro parágrafo. Só no
    // HTML da página: o JSON-LD e o <noscript> seguem com o corpo puro.
    const takeaways = Array.isArray(post.keyTakeaways)
      ? post.keyTakeaways.map(t => String(t || '').trim()).filter(Boolean).slice(0, 5)
      : [];
    const takeawaysHtml = takeaways.length
      ? `<section class="wv-takeaways" aria-label="Key takeaways"><p class="wv-takeaways-label">Key takeaways</p><ul>${takeaways.map(t => `<li>${htmlEscape(t)}</li>`).join('')}</ul></section>`
      : '';
    const bodyForPage = takeawaysHtml ? articleBodyHtml.replace('</p>', `</p>${takeawaysHtml}`) : articleBodyHtml;

    // "Written by" no fim do artigo: só para autor pessoa com bio (a marca não ganha bloco).
    const authorBio = String(post.authorBio || '').trim();
    const authorBoxHtml = authorBio && !/^wevolv3$/i.test(authorName.trim())
      ? `<section id="author-box" class="wv-author-box" aria-label="About the author"><span class="wv-avatar" aria-hidden="true">${htmlEscape(authorInitials)}</span><div class="wv-who"><span class="wv-kicker">Written by</span><strong>${htmlEscape(authorName)}</strong><p>${htmlEscape(authorBio)}</p></div></section>`
      : '';

    // Replace existing meta tags (including those with IDs) or inject before </head>
    // Use more aggressive regex to catch all variations
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
      .replace('</head>', `${metaTags}</head>`)
      .replace('</body>', `${noscriptArticle}</body>`);

    // --- The actual GEO/SEO fix: render the article body VISIBLY in the initial
    // HTML response instead of only inside <noscript> or a client-side-populated
    // empty div. The client JS still runs and re-populates the same elements from
    // its own fetch (harmless, purely redundant) — this is additive, not a rewrite
    // of the client rendering path, so there is no risk of visual regression for
    // real users with JS enabled.
    updatedHtml = updatedHtml
      // Hide the loading spinner by default (we already have real content ready).
      .replace(
        '<div id="post-loading" class="post-loading">',
        '<div id="post-loading" class="post-loading" style="display:none;">'
      )
      // Show the content section by default instead of display:none.
      .replace(
        '<div id="post-content" class="single-post-section" style="display: none;">',
        '<div id="post-content" class="single-post-section">'
      )
      // Real category instead of the static "Web3" placeholder.
      .replace(
        /<span id="post-category" class="blog-category-2 single-category w--current">[^<]*<\/span>/,
        `<span id="post-category" class="blog-category-2 single-category w--current">${htmlEscape(categories[0] || 'Web3')}</span>`
      )
      // Real title instead of "Loading...", plus a visible byline (author + date)
      // right under it — the E-E-A-T signal every blog post was missing.
      .replace(
        /<h1 id="post-title" class="single-blog-heading">Loading\.\.\.<\/h1>/,
        `<h1 id="post-title" class="single-blog-heading">${htmlEscape(title)}</h1>${bylineHtml}`
      )
      // Real hero image instead of the generic post1.jpg placeholder, with
      // explicit width/height when known (CLS).
      .replace(
        /<img\s+id="post-image"\s+src="images\/post1\.jpg"\s+alt="Article image"\s+class="single-post-img"\s*\/>/,
        // Com socialImage, a capa do site é a arte limpa e pode ser cortada mais baixa
        // (.wv-cover-clean); sem ela, a capa ainda tem texto e fica inteira.
        `<img id="post-image" src="${htmlEscape(coverUrl)}" alt="${htmlEscape(title)}" class="single-post-img${hasSocialImage ? ' wv-cover-clean' : ''}"${imageDims ? ` width="${imageDims.width}" height="${imageDims.height}"` : ''} loading="eager" />`
      )
      // The actual article body, in the same container the client JS also writes to.
      // Whitespace-tolerant regex (not an exact string match) since the shell's
      // indentation isn't a contract we control.
      .replace(
        /<div id="post-body" class="w-richtext">\s*<!-- Post content will be rendered here -->\s*<\/div>/,
        `<div id="post-body" class="w-richtext">${bodyForPage}</div>`
      )
      .replace('<div id="author-box" hidden></div>', authorBoxHtml || '<div id="author-box" hidden></div>');

    return new Response(updatedHtml, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=UTF-8',
        ...SECURITY_HEADERS,
      },
    });
  } catch (error) {
    console.error('Error injecting OG tags:', error);
    // On error, serve page as-is
    return context.next();
  }
};

