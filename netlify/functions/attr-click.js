// /k/<campanha>/<ref>: o link que o KOL posta. Conta o clique e manda para a
// DApp com ?ref=<ref>, que e o que o snippet do cliente le.
//
// O registro do clique nunca atrasa nem derruba o redirect: se o Blobs falhar,
// o seguidor do KOL chega na DApp do mesmo jeito e perdemos so a contagem.

import { getStore } from '@netlify/blobs';
import { CAMPANHAS, RE_REF, RE_ROBO, LOJA, aleatorio } from './_attr.js';

export const config = { path: '/k/:campanha/:ref' };

const base = {
  'X-Robots-Tag': 'noindex, nofollow',
  'Cache-Control': 'no-store'
};

const texto = (status, msg) =>
  new Response(msg, { status, headers: { ...base, 'Content-Type': 'text/plain; charset=utf-8' } });

export default async (req, context) => {
  const campanha = (context?.params?.campanha || '').toLowerCase();
  const ref = (context?.params?.ref || '').toLowerCase();
  const camp = CAMPANHAS[campanha];

  if (!camp || !RE_REF.test(ref)) return texto(404, 'Link not found');
  if (!camp.destino) return texto(503, 'This campaign is not live yet');

  const destino = new URL(camp.destino);
  destino.searchParams.set('ref', ref);
  // UTM ou qualquer outro parametro que o KOL tenha colado no link segue junto.
  for (const [k, v] of new URL(req.url).searchParams) {
    if (k !== 'ref' && !destino.searchParams.has(k)) destino.searchParams.set(k, v);
  }

  const ua = req.headers.get('user-agent') || '';
  const prefetch = /prefetch|prerender/i.test(req.headers.get('sec-purpose') || req.headers.get('purpose') || '');

  if (req.method === 'GET' && ua && !RE_ROBO.test(ua) && !prefetch) {
    let de = '';
    try { de = new URL(req.headers.get('referer') || '').hostname; } catch (e) {}
    const grava = getStore(LOJA)
      .setJSON(`clicks/${campanha}/${ref}/${Date.now().toString(36)}-${aleatorio()}`, {
        t: new Date().toISOString(),
        de,
        mobile: /Mobi|Android|iPhone|iPad/i.test(ua)
      })
      .catch((err) => console.error('[attr-click] falha ao gravar', campanha, ref, err));
    if (typeof context?.waitUntil === 'function') context.waitUntil(grava);
    else await grava;
  }

  return new Response(null, { status: 302, headers: { ...base, Location: destino.toString() } });
};
