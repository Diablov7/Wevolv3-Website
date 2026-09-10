// Atribuicao KOL -> carteira. Compartilhado por attr-click, attr-connect e
// attr-report.
//
// O fluxo inteiro:
//   1. o KOL posta wevolv3.com/k/<campanha>/<ref>; attr-click conta o clique e
//      manda para a DApp com ?ref=<ref>
//   2. o snippet no front da DApp guarda o ref e, quando a carteira conecta,
//      manda {carteira, ref} para attr-connect
//   3. attr-report junta cliques e carteiras por KOL
//
// Carteira conectada ainda nao e usuario. O filtro on-chain (transacionou com o
// contrato?) roda depois, em cima do CSV do relatorio. E ele que torna inofensivo
// alguem postar carteira falsa no endpoint, que por definicao e publico: o front
// de um cliente nao tem como guardar segredo.

export const CAMPANHAS = {
  hmc: {
    nome: 'HMC',
    // URL da DApp. Vazio ate a HMC mandar: sem destino, /k/hmc/* responde 503 em
    // vez de levar o clique do KOL para lugar nenhum.
    destino: '',
    // Origens que podem gravar conexao, ex.: ['https://app.hmc.xyz']. Vazio aceita
    // qualquer uma. Preencher com o dominio da DApp antes do primeiro post.
    origens: []
  },
  // Para testar o fluxo sem sujar os dados de cliente.
  teste: {
    nome: 'Teste interno',
    destino: 'https://wevolv3.com/',
    origens: []
  }
};

export const RE_CARTEIRA = /^0x[0-9a-fA-F]{40}$/;
export const RE_REF = /^[A-Za-z0-9_-]{1,40}$/;

// Preview de link (o card do X, do Telegram, do WhatsApp) busca a URL sozinho e
// inflaria o clique de todo KOL. Nao entra "telegram" nem "discord" soltos: o
// navegador interno desses apps e gente de verdade.
export const RE_ROBO = /bot\b|bot\/|crawl|spider|preview|facebookexternalhit|WhatsApp\/|embedly|headless|curl\/|wget\/|python-requests|node-fetch|axios\//i;

// Consistencia forte: attr-connect le e regrava o registro da carteira, e com a
// consistencia eventual padrao duas conexoes seguidas se atropelariam.
export const LOJA = { name: 'attribution', consistency: 'strong' };

export function sameToken(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function aleatorio(n = 6) {
  const bytes = new Uint8Array(n);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => (b % 36).toString(36)).join('');
}
