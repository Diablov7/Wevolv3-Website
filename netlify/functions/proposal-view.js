// Serve /p/<slug>. Publica para quem tem o link, invisivel para quem nao tem.
//
// Funcao v2 (export default + Request/Response), nao o formato antigo de
// handler. No formato antigo o Netlify nao injeta o contexto do Blobs e
// getStore falha com "The environment has not been configured to use Netlify
// Blobs". Foi exatamente o que aconteceu no primeiro deploy.
//
// config.path faz o roteamento aqui, entao nao existe redirect para /p/* no
// netlify.toml: com os dois, o rewrite vence e o :slug se perde.
//
// Tres camadas de "nao indexado", porque cada uma sozinha falha de um jeito:
// robots.txt e uma peticao que crawler pirata ignora, a meta tag so vale para
// quem baixa a pagina, e o X-Robots-Tag e o unico que vale para um link
// compartilhado fora do site. O slug de 131 bits e o que realmente protege.

import { getStore } from '@netlify/blobs';
import { renderProposal, renderNotFound } from './_proposal-html.js';

export const config = { path: '/p/:slug' };

const headers = {
  'Content-Type': 'text/html; charset=utf-8',
  'X-Robots-Tag': 'noindex, nofollow, noarchive, nosnippet',
  'Cache-Control': 'private, max-age=0, must-revalidate',
  'Referrer-Policy': 'no-referrer'
};

export default async (req, context) => {
  const slug = (context?.params?.slug || new URL(req.url).pathname.split('/').filter(Boolean).pop() || '').trim();

  if (!/^[A-Za-z0-9]{22}$/.test(slug)) {
    return new Response(renderNotFound(), { status: 404, headers });
  }

  try {
    const store = getStore('proposals');
    const rec = await store.get(slug, { type: 'json' });
    if (!rec || !rec.data) return new Response(renderNotFound(), { status: 404, headers });
    return new Response(renderProposal(rec.data, rec), { status: 200, headers });
  } catch (err) {
    console.error('[proposal-view] falha ao ler', slug, err);
    return new Response(renderNotFound(), { status: 404, headers });
  }
};
