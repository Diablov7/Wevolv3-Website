// Avisa Bing, Yandex e demais motores do IndexNow que as URLs do site mudaram.
// Le o sitemap publicado (ja inclui os posts do Sanity via edge function) e envia
// tudo num POST so para api.indexnow.org, que repassa aos motores participantes.
// A chave e publica por definicao: o protocolo confere a posse lendo /<chave>.txt.
//
// Uso: node .github/scripts/indexnow-submit.mjs [url ...]
// Sem argumentos, envia todas as URLs do sitemap.

const HOST = 'wevolv3.com';
const KEY = '6fd16b2f03a461167135ab4a1ee219bc';
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;

async function sitemapUrls() {
  const res = await fetch(`https://${HOST}/sitemap.xml`);
  if (!res.ok) throw new Error(`sitemap.xml respondeu ${res.status}`);
  const xml = await res.text();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1].trim());
}

async function main() {
  const keyRes = await fetch(KEY_LOCATION);
  const keyBody = keyRes.ok ? (await keyRes.text()).trim() : '';
  if (keyBody !== KEY) throw new Error(`arquivo da chave nao confere em ${KEY_LOCATION}`);

  const args = process.argv.slice(2);
  const urls = [...new Set(args.length ? args : await sitemapUrls())]
    .filter(u => new URL(u).host === HOST);
  if (!urls.length) throw new Error('nenhuma URL para enviar');

  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: HOST, key: KEY, keyLocation: KEY_LOCATION, urlList: urls }),
  });
  const text = await res.text();
  console.log(`IndexNow: ${urls.length} URLs, HTTP ${res.status} ${text}`);
  // 200 = aceito, 202 = recebido e chave ainda em validacao. O resto e erro.
  if (res.status !== 200 && res.status !== 202) process.exit(1);
}

main().catch(err => { console.error(err.message); process.exit(1); });
