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
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https://cdn.sanity.io https://res.cloudinary.com https://www.google-analytics.com https://wevolv3.com; connect-src 'self' https://*.api.sanity.io https://*.google-analytics.com https://*.analytics.google.com; frame-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'self'",
};

export default async (request, context) => {
  const url = new URL(request.url);
  
  console.log('Edge Function called for:', url.pathname, url.search);
  
  // Process both clean blog URLs (/blog/<slug>) and legacy singleblog URLs
  const isBlogPath = url.pathname.startsWith('/blog/') && url.pathname !== '/blog/';
  const isSingleblog = url.pathname.includes('singleblog');
  if (!isBlogPath && !isSingleblog) {
    console.log('Not a blog article page, skipping');
    return context.next();
  }

  // Get slug from clean path (/blog/<slug>) first, then fall back to ?slug=
  let slug = null;
  if (isBlogPath) {
    slug = decodeURIComponent(url.pathname.replace(/^\/blog\//, '').replace(/\/+$/, ''));
  }
  if (!slug) {
    slug = url.searchParams.get('slug');
  }

  // 301 legacy singleblog URLs (?slug=) to the clean /blog/<slug> URL
  if (isSingleblog && slug) {
    return Response.redirect(new URL('/blog/' + encodeURIComponent(slug), url.origin).toString(), 301);
  }

  if (!slug) {
    console.log('No slug found');
    return context.next();
  }

  console.log('Processing slug:', slug);

  // Fetch the article shell (singleblog.html). Clean /blog/<slug> URLs have no static
  // file at that path, so we fetch the shell explicitly rather than using context.next()
  // (which, when an edge function owns the path, hits the SPA fallback and returns index.html).
  let html;
  try {
    const shellResp = await fetch(new URL('/singleblog.html?__shell=1', url.origin).toString());
    html = await shellResp.text();
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
    "authorName": author->name,
    "categoryNames": categories[]->title,
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
      // Serve the shell unmodified so the client-side JS can render / show its error state
      return new Response(html, { status: 200, headers: { 'Content-Type': 'text/html; charset=UTF-8', ...SECURITY_HEADERS } });
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

    const imageUrl = sanityImageUrl(post.mainImage);
    const title = post.title;
    const description = post.excerpt || 'Read this article about Web3 marketing and growth strategies.';
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

    // Convert Portable Text to a *minimal* HTML version (headings, paragraphs,
    // basic lists). This is rendered ONLY inside <noscript> so users with JS
    // never see it, but crawlers that don't execute JS (GPTBot, ClaudeBot,
    // PerplexityBot, archive bots) get a clean HTML article. The client-side
    // JS still owns the visible rendering, so there is zero divergence risk.
    function htmlEscape(s) {
      return String(s == null ? '' : s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }
    function portableTextToBasicHtml(blocks) {
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
        if (block._type !== 'block') continue;
        const text = htmlEscape(
          (block.children || []).map(c => (c && typeof c.text === 'string') ? c.text : '').join('')
        );
        if (!text.trim()) continue;
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
    const articleBodyHtml = portableTextToBasicHtml(post.body);

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
      "author": { "@type": "Person", "@id": "https://wevolv3.com/about.html#team-${jsonEscape(authorSlug)}", "name": "${safeAuthor}" },
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

      <title>${title.replace(/</g, '&lt;').replace(/>/g, '&gt;')} | Wevolv3 Blog</title>
      <meta name="description" content="${description.replace(/"/g, '&quot;').substring(0, 160)}">
      <link rel="canonical" href="${pageUrl}">

      <script id="article-schema-edge" type="application/ld+json">${blogPostingSchema}</script>
      <script id="breadcrumb-schema-edge" type="application/ld+json">${breadcrumbSchema}</script>
      ${faqSchema ? `<script id="faq-schema-edge" type="application/ld+json">${faqSchema}</script>` : ''}
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

    const bylineHtml = `<p class="post-byline" style="margin:8px 0 16px;font-size:14px;color:#999;">By ${htmlEscape(authorName)}${datePublished ? ` · <time datetime="${htmlEscape(datePublished)}">${htmlEscape(new Date(datePublished).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }))}</time>` : ''}${dateModified && dateModified !== datePublished ? ` (updated <time datetime="${htmlEscape(dateModified)}">${htmlEscape(new Date(dateModified).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }))}</time>)` : ''}</p>`;

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
        `<img id="post-image" src="${htmlEscape(imageUrl)}" alt="${htmlEscape(title)}" class="single-post-img"${imageDims ? ` width="${imageDims.width}" height="${imageDims.height}"` : ''} loading="eager" />`
      )
      // The actual article body, in the same container the client JS also writes to.
      // Whitespace-tolerant regex (not an exact string match) since the shell's
      // indentation isn't a contract we control.
      .replace(
        /<div id="post-body" class="w-richtext">\s*<!-- Post content will be rendered here -->\s*<\/div>/,
        `<div id="post-body" class="w-richtext">${articleBodyHtml}</div>`
      );

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

