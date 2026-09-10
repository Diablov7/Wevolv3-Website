// GET /a/report/<campanha>: cliques e carteiras por KOL.
// ?format=csv devolve uma linha por carteira, que e a entrada do filtro on-chain.
//
// Mesmo token das propostas (PROPOSAL_TOKEN, header X-Proposal-Token): e o token
// de administracao do site, e o relatorio tem carteira de cliente. So no header,
// nunca na URL, que fica em historico e em log.

import { getStore } from '@netlify/blobs';
import { CAMPANHAS, LOJA, sameToken } from './_attr.js';

export const config = { path: '/a/report/:campanha' };

const base = { 'X-Robots-Tag': 'noindex, nofollow', 'Cache-Control': 'no-store' };
const json = (status, body) =>
  new Response(JSON.stringify(body, null, 2), { status, headers: { ...base, 'Content-Type': 'application/json' } });

const csvCampo = (v) => {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export default async (req, context) => {
  if (req.method !== 'GET') return json(405, { error: 'Method Not Allowed' });

  const esperado = process.env.PROPOSAL_TOKEN;
  if (!esperado) return json(500, { error: 'Server misconfigured: missing PROPOSAL_TOKEN' });
  if (!sameToken(req.headers.get('x-proposal-token') || '', esperado)) return json(401, { error: 'Unauthorized' });

  const campanha = (context?.params?.campanha || '').toLowerCase();
  if (!CAMPANHAS[campanha]) return json(404, { error: 'Unknown campaign' });

  const loja = getStore(LOJA);

  // Clique nao tem conteudo que importe para a contagem: o ref esta na chave.
  const { blobs: cliques } = await loja.list({ prefix: `clicks/${campanha}/` });
  const { blobs: conexoes } = await loja.list({ prefix: `connects/${campanha}/` });

  const carteiras = [];
  for (let i = 0; i < conexoes.length; i += 50) {
    const lote = await Promise.all(conexoes.slice(i, i + 50).map((b) => loja.get(b.key, { type: 'json' }).catch(() => null)));
    carteiras.push(...lote.filter(Boolean));
  }

  if (new URL(req.url).searchParams.get('format') === 'csv') {
    const cab = ['carteira', 'ref', 'ref_em', 'ref_ultimo', 'primeira', 'ultima', 'vezes', 'chain'];
    const linhas = carteiras.map((c) => [c.carteira, c.ref, c.refEm, c.refUltimo, c.primeira, c.ultima, c.vezes, c.chain].map(csvCampo).join(','));
    return new Response([cab.join(','), ...linhas].join('\n'), {
      status: 200,
      headers: { ...base, 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${campanha}-carteiras.csv"` }
    });
  }

  const porKol = {};
  const kol = (ref) => (porKol[ref] ||= { cliques: 0, carteiras: 0, reativadas: 0 });
  for (const b of cliques) kol(b.key.split('/')[2]).cliques++;
  let organicas = 0;
  for (const c of carteiras) {
    if (c.ref) kol(c.ref).carteiras++;
    else organicas++;
    if (c.refUltimo && c.refUltimo !== c.ref) kol(c.refUltimo).reativadas++;
  }
  for (const k of Object.values(porKol)) k.conversao = k.cliques ? +(k.carteiras / k.cliques).toFixed(3) : null;

  const ordenado = Object.fromEntries(Object.entries(porKol).sort((a, b) => b[1].carteiras - a[1].carteiras || b[1].cliques - a[1].cliques));

  return json(200, {
    campanha,
    gerado: new Date().toISOString(),
    total: { cliques: cliques.length, carteiras: carteiras.length, viaKol: carteiras.length - organicas, organicas },
    porKol: ordenado,
    aviso: 'Carteira conectada ainda nao e usuario. Rode o filtro on-chain em cima do CSV (?format=csv) antes de pagar ou escalar KOL.'
  });
};
