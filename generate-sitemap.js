#!/usr/bin/env node

/**
 * Script para gerar sitemap.xml dinamicamente a partir dos posts do Sanity
 * Execute: node generate-sitemap.js
 * 
 * Requer: Node.js e acesso à API do Sanity
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const PROJECT_ID = 'sszuldy6';
const DATASET = 'production';
const API_VERSION = '2021-06-07';
const BASE_URL = 'https://wevolv3.com';

// Páginas estáticas
const staticPages = [
  { url: '/', priority: '1.0', changefreq: 'weekly', lastmod: new Date().toISOString().split('T')[0] },
  { url: '/about.html', priority: '0.8', changefreq: 'monthly', lastmod: new Date().toISOString().split('T')[0] },
  { url: '/works.html', priority: '0.9', changefreq: 'weekly', lastmod: new Date().toISOString().split('T')[0] },
  { url: '/blog.html', priority: '0.9', changefreq: 'daily', lastmod: new Date().toISOString().split('T')[0] },
  { url: '/contact.html', priority: '0.7', changefreq: 'monthly', lastmod: new Date().toISOString().split('T')[0] },
  { url: '/privacy.html', priority: '0.3', changefreq: 'yearly', lastmod: new Date().toISOString().split('T')[0] },
  { url: '/terms.html', priority: '0.3', changefreq: 'yearly', lastmod: new Date().toISOString().split('T')[0] },
  { url: '/disclaimer.html', priority: '0.3', changefreq: 'yearly', lastmod: new Date().toISOString().split('T')[0] },
];

// Query GROQ para buscar posts publicados
const postsQuery = encodeURIComponent(`
  *[_type == "post" && defined(slug.current) && (!defined(published) || published == true)] | order(_updatedAt desc) {
    "slug": slug.current,
    "updatedAt": _updatedAt,
    "publishedAt": publishedAt
  }
`);

// Query GROQ para buscar works (projetos) publicados
const worksQuery = encodeURIComponent(`
  *[_type == "work" && defined(slug.current) && (!defined(published) || published == true)] | order(_updatedAt desc) {
    "slug": slug.current,
    "updatedAt": _updatedAt,
    "publishedAt": publishedAt
  }
`);

const postsUrl = `https://${PROJECT_ID}.api.sanity.io/v${API_VERSION}/data/query/${DATASET}?query=${postsQuery}`;
const worksUrl = `https://${PROJECT_ID}.api.sanity.io/v${API_VERSION}/data/query/${DATASET}?query=${worksQuery}`;

console.log('🔄 Buscando posts e works do Sanity...');

// Função para buscar dados do Sanity
function fetchFromSanity(url, type) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';

      if (res.statusCode !== 200) {
        reject(new Error(`Erro HTTP ${res.statusCode} ao buscar ${type}`));
        return;
      }

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          
          if (result.error) {
            reject(new Error(`Erro na API do Sanity para ${type}: ${result.error}`));
            return;
          }
          
          resolve(result.result || []);
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

// Buscar posts e works em paralelo
Promise.all([
  fetchFromSanity(postsUrl, 'posts'),
  fetchFromSanity(worksUrl, 'works')
]).then(([posts, works]) => {
  console.log(`✅ Encontrados ${posts.length} posts`);
  console.log(`✅ Encontrados ${works.length} works`);

  // Gerar XML do sitemap
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
`;

  // Adicionar páginas estáticas
  staticPages.forEach(page => {
    xml += `  <url>
    <loc>${BASE_URL}${page.url}</loc>
    <lastmod>${page.lastmod}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>
`;
  });

  // Adicionar posts do blog
  posts.forEach(post => {
    const slug = post.slug;
    const updatedAt = post.updatedAt || post.publishedAt || new Date().toISOString();
    const lastmod = updatedAt.split('T')[0];
    const postUrl = `${BASE_URL}/blog/${slug}`;

    xml += `  <url>
    <loc>${postUrl}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
`;
  });

  // Adicionar works (projetos)
  works.forEach(work => {
    const slug = work.slug;
    const updatedAt = work.updatedAt || work.publishedAt || new Date().toISOString();
    const lastmod = updatedAt.split('T')[0];
    const workUrl = `${BASE_URL}/works/${slug}`;

    xml += `  <url>
    <loc>${workUrl}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
`;
  });

  xml += `</urlset>`;

  // Salvar sitemap.xml
  const sitemapPath = path.join(__dirname, 'sitemap.xml');
  fs.writeFileSync(sitemapPath, xml, 'utf8');

  console.log(`✅ Sitemap gerado com sucesso!`);
  console.log(`   📄 Arquivo: ${sitemapPath}`);
  console.log(`   📊 Total de URLs: ${staticPages.length + posts.length + works.length}`);
  console.log(`   📝 Posts incluídos: ${posts.length}`);
  console.log(`   💼 Works incluídos: ${works.length}`);
}).catch((error) => {
  console.error('❌ Erro ao gerar sitemap:', error.message);
  process.exit(1);
});

