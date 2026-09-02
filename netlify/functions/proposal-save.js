// Grava uma proposta e devolve o link permanente em wevolv3.com/p/<slug>.
//
// Funcao v2 (export default + Request/Response): no formato antigo de handler o
// Netlify nao injeta o contexto do Blobs e getStore falha com "The environment
// has not been configured to use Netlify Blobs".
//
// Autenticacao por token no header, nunca por origem: quem chama e uma extensao
// do Chrome, e chrome-extension:// nao e uma origem que de para verificar do
// lado do servidor. Sem PROPOSAL_TOKEN configurado a funcao se recusa a gravar,
// pelo mesmo motivo que sendTelegram nao tem fallback de credencial: endpoint de
// escrita aberto e pior que endpoint quebrado, e quebrado pelo menos aparece.

import { getStore } from '@netlify/blobs';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Proposal-Token',
  'X-Robots-Tag': 'noindex, nofollow'
};

const json = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

// 22 caracteres de base62 sao ~131 bits. O link nao expira, entao ele precisa
// ser inadivinhavel, e nao apenas dificil de adivinhar.
const ALPHABET = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function newSlug() {
  const bytes = new Uint8Array(22);
  crypto.getRandomValues(bytes);
  let s = '';
  for (const b of bytes) s += ALPHABET[b % ALPHABET.length];
  return s;
}

// Compara o token inteiro sempre, sem sair no primeiro caractere diferente.
function sameToken(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return json(405, { error: 'Method Not Allowed' });

  const expected = process.env.PROPOSAL_TOKEN;
  if (!expected) {
    console.error('[proposal-save] MISCONFIGURED: PROPOSAL_TOKEN ausente');
    return json(500, {
      error: 'Server misconfigured: missing PROPOSAL_TOKEN',
      hint: 'Set PROPOSAL_TOKEN in the Netlify project settings and redeploy.'
    });
  }

  if (!sameToken(req.headers.get('x-proposal-token') || '', expected)) {
    console.warn('[proposal-save] token invalido');
    return json(401, { error: 'Unauthorized' });
  }

  let payload;
  try {
    payload = await req.json();
  } catch (e) {
    return json(400, { error: 'Invalid JSON' });
  }

  const data = payload?.data;
  if (!data || typeof data !== 'object' || !data.titulo) {
    return json(400, { error: 'Missing proposal data' });
  }

  // Um blob de proposta nao passa de uns poucos KB. Um payload de megabytes so
  // pode ser engano ou abuso.
  if (JSON.stringify(data).length > 200000) return json(413, { error: 'Proposal too large' });

  // Reaproveita o slug quando a extensao manda um: republicar a mesma proposta
  // corrigida mantem o link que ja foi enviado ao cliente.
  const pedido = typeof payload.slug === 'string' ? payload.slug : '';
  const slug = /^[A-Za-z0-9]{22}$/.test(pedido) ? pedido : newSlug();

  try {
    const store = getStore('proposals');
    const existing = pedido ? await store.get(slug, { type: 'json' }).catch(() => null) : null;
    await store.setJSON(slug, {
      data,
      created: existing?.created || new Date().toISOString(),
      updated: new Date().toISOString(),
      cliente: data.cliente || '',
      contato: data.contato || ''
    });
    console.log('[proposal-save] gravada', { slug, cliente: data.cliente || '(sem nome)', republicada: !!existing });
    return json(200, { ok: true, slug, url: `https://wevolv3.com/p/${slug}` });
  } catch (err) {
    console.error('[proposal-save] falha ao gravar', err);
    return json(500, { error: 'Storage error', details: String(err?.message || err) });
  }
};
