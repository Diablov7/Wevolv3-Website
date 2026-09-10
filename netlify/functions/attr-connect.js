// POST /a/connect: o snippet no front da DApp avisa que uma carteira conectou.
//
// O snippet manda Content-Type text/plain de proposito: assim o navegador nao faz
// preflight OPTIONS e a chamada custa uma ida so. O OPTIONS continua respondido
// para quem integrar com outro Content-Type.
//
// Regra de atribuicao: o primeiro KOL que trouxe a carteira fica com ela (ref).
// O ultimo fica guardado a parte (refUltimo), para saber quem reativou. Carteira
// que chegou sem ref e depois voltou por um KOL passa a ser desse KOL: organico
// e so a ausencia de KOL, nao um dono.

import { getStore } from '@netlify/blobs';
import { CAMPANHAS, RE_CARTEIRA, RE_REF, LOJA } from './_attr.js';

export const config = { path: '/a/connect' };

function corsPara(camp, origem) {
  const liberada = !camp?.origens?.length ? '*' : camp.origens.includes(origem) ? origem : '';
  return {
    ...(liberada ? { 'Access-Control-Allow-Origin': liberada } : {}),
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
    'X-Robots-Tag': 'noindex, nofollow',
    'Cache-Control': 'no-store'
  };
}

const resposta = (status, headers, body) =>
  new Response(body ? JSON.stringify(body) : null, {
    status,
    headers: body ? { ...headers, 'Content-Type': 'application/json' } : headers
  });

export default async (req) => {
  const origem = req.headers.get('origin') || '';

  if (req.method === 'OPTIONS') return resposta(204, corsPara(null, origem));
  if (req.method !== 'POST') return resposta(405, corsPara(null, origem), { error: 'Method Not Allowed' });

  // Um aviso legitimo tem uns 150 bytes.
  const bruto = await req.text();
  if (bruto.length > 2000) return resposta(413, corsPara(null, origem), { error: 'Payload too large' });

  let p;
  try { p = JSON.parse(bruto); } catch (e) { return resposta(400, corsPara(null, origem), { error: 'Invalid JSON' }); }

  const campanha = String(p?.c || '').toLowerCase();
  const camp = CAMPANHAS[campanha];
  const cors = corsPara(camp, origem);
  if (!camp) return resposta(404, cors, { error: 'Unknown campaign' });
  if (camp.origens.length && !camp.origens.includes(origem)) return resposta(403, cors, { error: 'Origin not allowed' });

  const carteira = String(p.w || '');
  if (!RE_CARTEIRA.test(carteira)) return resposta(400, cors, { error: 'Invalid wallet' });

  const ref = p.r ? String(p.r).toLowerCase() : '';
  if (ref && !RE_REF.test(ref)) return resposta(400, cors, { error: 'Invalid ref' });

  const chain = Number.isSafeInteger(p.chain) && p.chain > 0 ? p.chain : null;
  // Quando o ref foi capturado no navegador. Serve para medir o tempo entre
  // clique e conexao; so aceita um horario plausivel.
  const rt = Number.isFinite(p.rt) && p.rt > Date.parse('2026-01-01') && p.rt <= Date.now() + 60000 ? new Date(p.rt).toISOString() : null;

  const agora = new Date().toISOString();
  const chave = `connects/${campanha}/${carteira.toLowerCase()}`;

  try {
    const loja = getStore(LOJA);
    const antes = await loja.get(chave, { type: 'json' }).catch(() => null);
    const rec = antes
      ? {
          ...antes,
          ref: antes.ref || ref,
          refEm: antes.ref ? antes.refEm : (ref ? rt : null),
          refUltimo: ref || antes.refUltimo,
          ultima: agora,
          vezes: (antes.vezes || 1) + 1,
          chain: chain || antes.chain
        }
      : {
          carteira: carteira.toLowerCase(),
          ref,
          refEm: ref ? rt : null,
          refUltimo: ref,
          primeira: agora,
          ultima: agora,
          vezes: 1,
          chain
        };
    await loja.setJSON(chave, rec);
    return resposta(204, cors);
  } catch (err) {
    console.error('[attr-connect] falha ao gravar', campanha, err);
    return resposta(500, cors, { error: 'Storage error' });
  }
};
