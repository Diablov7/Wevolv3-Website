#!/usr/bin/env node
/**
 * Gera llms-full.txt com o texto completo de todos os posts do blog.
 * Rede de seguranca para LLMs enquanto/alem do fix de SSR nas edge functions:
 * um crawler que so leia arquivos de texto plano (sem nenhum HTML) ainda
 * consegue o conteudo real de cada artigo.
 * Execute: node generate-llms-full.js
 */
const https = require('https');
const fs = require('fs');

const PROJECT_ID = 'sszuldy6';
const DATASET = 'production';
const API_VERSION = '2024-01-01';
const BASE_URL = 'https://wevolv3.com';

const query = encodeURIComponent(`
  *[_type == "post" && defined(slug.current) && (!defined(published) || published == true)] | order(publishedAt desc) {
    title,
    "slug": slug.current,
    excerpt,
    body,
    publishedAt,
    _updatedAt,
    "authorName": author->name,
    "categoryNames": categories[]->title
  }
`);

function portableTextToPlain(blocks) {
  if (!Array.isArray(blocks)) return '';
  const out = [];
  for (const b of blocks) {
    if (!b || typeof b !== 'object') continue;
    if (b._type === 'block' && Array.isArray(b.children)) {
      const text = b.children.map(c => (c && typeof c.text === 'string') ? c.text : '').join('');
      const prefix = b.listItem ? '- ' : (b.style && /^h[1-4]$/.test(b.style) ? '#'.repeat(Number(b.style[1])) + ' ' : '');
      if (text.trim()) out.push(prefix + text);
    }
  }
  return out.join('\n\n');
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

async function main() {
  const url = `https://${PROJECT_ID}.api.sanity.io/v${API_VERSION}/data/query/${DATASET}?query=${query}`;
  const data = await fetchJson(url);
  const posts = data.result || [];
  console.log(`Encontrados ${posts.length} posts publicados.`);

  const parts = [];
  parts.push('# Wevolv3 — Full Article Text');
  parts.push('');
  parts.push('> Safety-net for AI systems that only ingest plain text (no HTML/JS execution).');
  parts.push('> Each article below is also published, with full interactive formatting, at its canonical URL.');
  parts.push('');
  parts.push('---');

  for (const post of posts) {
    parts.push('');
    parts.push(`## ${post.title}`);
    parts.push('');
    parts.push(`URL: ${BASE_URL}/blog/${post.slug}`);
    if (post.authorName) parts.push(`Author: ${post.authorName}`);
    if (post.publishedAt) parts.push(`Published: ${post.publishedAt}`);
    if (post._updatedAt) parts.push(`Updated: ${post._updatedAt}`);
    if (Array.isArray(post.categoryNames) && post.categoryNames.length) parts.push(`Category: ${post.categoryNames.filter(Boolean).join(', ')}`);
    if (post.excerpt) { parts.push(''); parts.push(post.excerpt); }
    parts.push('');
    parts.push(portableTextToPlain(post.body));
    parts.push('');
    parts.push('---');
  }

  const out = parts.join('\n');
  fs.writeFileSync('llms-full.txt', out, 'utf8');
  console.log(`llms-full.txt gerado: ${(out.length / 1024).toFixed(1)} KB, ${posts.length} artigos.`);
}

main().catch(e => { console.error('Erro:', e); process.exit(1); });
