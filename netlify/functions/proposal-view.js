// Serve /p/<slug>. Publica para quem tem o link, invisivel para quem nao tem.
//
// Tres camadas de "nao indexado", porque cada uma sozinha falha de um jeito:
// robots.txt e uma peticao que crawler pirata ignora, a meta tag so e lida por
// quem baixa a pagina, e o X-Robots-Tag e o unico que vale para um link
// compartilhado fora do site. O slug de 131 bits e o que realmente protege.

import { getStore } from '@netlify/blobs';
import { renderProposal, renderNotFound } from './_proposal-html.js';

const headers = {
  'Content-Type': 'text/html; charset=utf-8',
  'X-Robots-Tag': 'noindex, nofollow, noarchive, nosnippet',
  'Cache-Control': 'private, max-age=0, must-revalidate',
  'Referrer-Policy': 'no-referrer'
};

// O redirect manda ?slug=:splat de proposito. Dentro de um rewrite 200 o
// event.path nem sempre traz o caminho original, entao o query param e a fonte
// confiavel e o path fica de reserva.
function readSlug(event) {
  const q = (event.queryStringParameters && event.queryStringParameters.slug) || '';
  if (q) return q.split('/')[0];
  return (event.path || '').split('/').filter(Boolean).pop() || '';
}

export const handler = async (event) => {
  const slug = readSlug(event);

  if (!/^[A-Za-z0-9]{22}$/.test(slug)) {
    return { statusCode: 404, headers, body: renderNotFound() };
  }

  try {
    const store = getStore('proposals');
    const rec = await store.get(slug, { type: 'json' });
    if (!rec || !rec.data) return { statusCode: 404, headers, body: renderNotFound() };
    return { statusCode: 200, headers, body: renderProposal(rec.data, rec) };
  } catch (err) {
    console.error('[proposal-view] falha ao ler', slug, err);
    return { statusCode: 404, headers, body: renderNotFound() };
  }
};
