# Inserir um link interno num post do Sanity sem reescrever o corpo

Usado em 06/10/2026 para os 6 links da pauta de SEO, e citado pela rotina diária (item 1b, posts órfãos).

**Onde rodar:** no console (ou `javascript_tool`) de uma aba aberta em `https://wevolv3.com/studio`, com o
Studio logado. Fora dessa origem a API do Sanity recusa a requisição (CORS). Antes, conferir o login com
`fetch('https://sszuldy6.api.sanity.io/v2021-10-21/users/me',{credentials:'include'})`: precisa voltar um `id`.

**O que faz:** acha o primeiro span de um bloco `normal` que contém a frase-âncora (e que ainda não é
link), quebra o span em três (antes, âncora, depois) e soma um `markDef` de link. Grava com
`ifRevisionID`, então não sobrescreve edição feita por outra pessoa no meio do caminho. Não toca em
`htmlTable` nem nos outros blocos.

```js
const base = 'https://sszuldy6.api.sanity.io/v2021-10-21/data';
const key = () => Math.random().toString(16).slice(2, 14);
// [id do documento publicado, frase-âncora exata do texto, destino]
const plano = [
  ['<docId>', '<frase que já existe no post>', '/blog/<slug-do-post-novo>'],
];
const out = [];
for (const [id, frase, href] of plano) {
  const doc = (await (await fetch(base + '/doc/production/' + id, { credentials: 'include' })).json()).documents[0];
  let feito = false;
  const body = doc.body.map(b => {
    if (feito || b._type !== 'block' || (b.style && b.style !== 'normal')) return b;
    const i = (b.children || []).findIndex(c => c._type === 'span' && typeof c.text === 'string'
      && c.text.includes(frase) && !(c.marks || []).some(m => (b.markDefs || []).some(d => d._key === m)));
    if (i < 0) return b;
    const c = b.children[i], p = c.text.indexOf(frase), mk = key(), novos = [];
    if (p > 0) novos.push({ ...c, _key: key(), text: c.text.slice(0, p) });
    novos.push({ ...c, _key: key(), text: frase, marks: [...(c.marks || []), mk] });
    const resto = c.text.slice(p + frase.length);
    if (resto) novos.push({ ...c, _key: key(), text: resto });
    feito = true;
    return { ...b, _key: b._key || key(), markDefs: [...(b.markDefs || []), { _key: mk, _type: 'link', href }],
      children: [...b.children.slice(0, i), ...novos, ...b.children.slice(i + 1)] };
  });
  if (!feito) { out.push([id, frase, 'NAO ACHOU A FRASE']); continue; }
  const r = await fetch(base + '/mutate/production', { method: 'POST', credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mutations: [{ patch: { id, ifRevisionID: doc._rev, set: { body } } }] }) });
  const j = await r.json();
  out.push([doc.slug && doc.slug.current, frase, href, r.status, j.error && j.error.description]);
}
out
```

**Depois:** conferir no HTML ao vivo (`/blog/<origem>`) se o `href` apareceu e pedir indexação do
destino no Search Console (a inspeção só carrega com a aba visível).

**Achar a frase-âncora:** a API pública devolve o texto de cada bloco sem login:
`*[_type=="post" && slug.current=="<origem>"][0]{_id,"b":body[_type=="block"]{"t":pt::text(@)}}`.
Escolher uma frase curta que descreva o assunto do destino ("exchange listing strategy", "Crypto PR").
