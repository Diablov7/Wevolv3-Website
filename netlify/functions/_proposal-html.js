// Renderiza a proposta hospedada em /p/<slug>.
//
// Sem JavaScript de propósito. A CSP global do site é default-src 'self' com
// style-src 'unsafe-inline', então CSS inline passa, script inline não passaria,
// e a página precisa abrir para um cliente que talvez esteja num navegador
// corporativo travado. Fonte e logo vêm de /fonts e /images, que são 'self'.
//
// O prefixo _ mantém o arquivo fora dos entrypoints de função do Netlify. Ele é
// empacotado por ser importado, não por ser descoberto.

const esc = (s) =>
  String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
@font-face{font-family:'ClashDisplay';src:url('/fonts/ClashDisplay-Extralight.otf') format('opentype');font-weight:200;font-display:swap}
@font-face{font-family:'ClashDisplay';src:url('/fonts/ClashDisplay-Regular.otf') format('opentype');font-weight:400;font-display:swap}
@font-face{font-family:'ClashDisplay';src:url('/fonts/ClashDisplay-Semibold.otf') format('opentype');font-weight:600;font-display:swap}
:root{--black:#000;--surface:#191919;--border:#292929;--emerald:#10b981;--white:#fff;--body:#c8c8c8;--muted:#8a8a8a;--blue:#3b82f6}
*{box-sizing:border-box}
html{background:var(--black)}
body{margin:0;background:var(--black);color:var(--body);font-family:'ClashDisplay','Helvetica Neue',Arial,sans-serif;font-weight:400;font-size:15px;line-height:1.6;-webkit-font-smoothing:antialiased}
.sheet{max-width:52rem;margin:0 auto;padding:clamp(1.5rem,5vw,4rem)}
.top{display:flex;align-items:center;gap:.7rem;padding-bottom:1.4rem;border-bottom:1px solid var(--border)}
.mark{width:30px;height:30px;object-fit:contain}
.wordmark{font-weight:600;font-size:1.3rem;color:var(--white);letter-spacing:-.03em}
.tag{margin-left:auto;font-size:.7rem;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:var(--blue)}
h1{font-weight:200;font-size:clamp(2rem,1.2rem + 2.6vw,3.1rem);line-height:1.05;letter-spacing:-.025em;color:var(--white);margin:2.2rem 0 1rem;max-width:22ch}
.meta{font-size:.78rem;color:var(--muted);letter-spacing:.04em;margin-bottom:2rem}
.lede{font-size:1.08rem;color:var(--body);max-width:56ch;margin:0 0 2.4rem}
h2{font-size:.72rem;font-weight:600;letter-spacing:.2em;text-transform:uppercase;color:var(--blue);margin:2.4rem 0 1rem;display:flex;align-items:center;gap:.9rem}
h2::after{content:"";flex:1;height:1px;background:var(--border)}
.tw{overflow-x:auto}
table{width:100%;border-collapse:collapse;margin:.4rem 0 1rem;font-size:.92rem}
th{text-align:left;font-weight:600;color:var(--muted);font-size:.7rem;letter-spacing:.12em;text-transform:uppercase;padding:.55rem .7rem;border-bottom:1px solid var(--border)}
td{padding:.7rem;border-bottom:1px solid #1c1c1c;vertical-align:top}
td:last-child{text-align:right;color:var(--white);white-space:nowrap}
tr:last-child td{border-bottom:0}
ul{margin:.3rem 0 1rem;padding-left:1.1rem}
li{margin:.4rem 0}
li::marker{color:var(--blue)}
.out{color:var(--muted)}
.out li::marker{color:#6b3b3b}
.total{background:var(--surface);border:1px solid var(--border);padding:1.2rem 1.4rem;margin-top:.6rem;display:flex;justify-content:space-between;align-items:baseline;gap:1rem;flex-wrap:wrap}
.total b{color:var(--white);font-size:1.5rem;font-weight:200;letter-spacing:-.02em}
.total span{font-size:.82rem;color:var(--muted)}
.next{background:var(--surface);border-left:2px solid var(--emerald);padding:1.1rem 1.3rem;margin-top:.5rem;color:var(--white)}
footer{margin-top:3rem;padding-top:1.4rem;border-top:1px solid var(--border);font-size:.76rem;color:var(--muted);display:flex;gap:1.4rem;flex-wrap:wrap}
footer a{color:var(--muted);text-decoration:none;border-bottom:1px solid var(--border)}
footer a:hover{color:var(--white)}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.sheet{padding:1.4cm;max-width:none}}
`;

export function renderProposal(d, meta) {
  const date = meta && meta.created
    ? new Date(meta.created).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

  const list = (arr, cls) =>
    arr && arr.length ? `<ul class="${cls || ''}">${arr.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : '';

  const phases = (d.escopo || [])
    .map(
      (f) => `<tr><td><strong style="color:#fff">${esc(f.fase)}</strong><br>
      <span style="color:#8a8a8a;font-size:.86rem">${esc(f.entrega)}</span></td><td>${esc(f.prazo)}</td></tr>`
    )
    .join('');

  const lines = (d.investimento?.linhas || [])
    .map(
      (l) => `<tr><td>${esc(l.item)}${l.base ? `<br><span style="color:#8a8a8a;font-size:.78rem">${esc(l.base)}</span>` : ''}</td>
      <td>${esc(l.preco)}</td></tr>`
    )
    .join('');

  const title = `${d.cliente ? d.cliente + ' · ' : ''}Wevolv3 Proposal`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow, noarchive, nosnippet, noimageindex">
<meta name="googlebot" content="noindex, nofollow">
<title>${esc(title)}</title>
<link rel="icon" href="/images/favicon.png">
<style>${CSS}</style>
</head>
<body>
<div class="sheet">
  <div class="top">
    <img class="mark" src="/images/LOGO.png" alt="">
    <span class="wordmark">Wevolv3</span>
    <span class="tag">Proposal</span>
  </div>

  <h1>${esc(d.titulo || 'Proposal')}</h1>
  <div class="meta">${esc(d.cliente || '')}${d.contato ? ' · ' + esc(d.contato) : ''} · ${date}</div>

  <p class="lede">${esc(d.resumo || '')}</p>

  ${phases ? `<h2>Scope</h2><div class="tw"><table><thead><tr><th>Phase</th><th style="text-align:right">Timeline</th></tr></thead><tbody>${phases}</tbody></table></div>` : ''}

  ${d.inclui?.length ? `<h2>What is included</h2>${list(d.inclui)}` : ''}
  ${d.nao_inclui?.length ? `<h2>What is not included</h2>${list(d.nao_inclui, 'out')}` : ''}

  <h2>Investment</h2>
  ${lines ? `<div class="tw"><table><thead><tr><th>Item</th><th style="text-align:right">Price</th></tr></thead><tbody>${lines}</tbody></table></div>` : ''}
  <div class="total">
    <span>${esc(d.investimento?.condicoes || '')}</span>
    <b>${esc(d.investimento?.total || 'Scoped per project')}</b>
  </div>

  ${d.metrica ? `<h2>How we measure it</h2><p>${esc(d.metrica)}</p>` : ''}
  ${d.proximo_passo ? `<h2>Next step</h2><div class="next">${esc(d.proximo_passo)}</div>` : ''}

  <footer>
    <a href="https://wevolv3.com">wevolv3.com</a>
    <a href="mailto:info@wevolv3.com">info@wevolv3.com</a>
    <a href="https://t.me/wevolv3">t.me/wevolv3</a>
    <span style="margin-left:auto">200+ projects since 2020</span>
  </footer>
</div>
</body>
</html>`;
}

export function renderNotFound() {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Wevolv3</title>
<style>${CSS}</style>
</head>
<body>
<div class="sheet">
  <div class="top"><img class="mark" src="/images/LOGO.png" alt=""><span class="wordmark">Wevolv3</span></div>
  <h1>This link is not valid.</h1>
  <p class="lede">The proposal you are looking for does not exist at this address. If you were sent this link,
  reply to whoever shared it and ask for a new one.</p>
  <footer><a href="https://wevolv3.com">wevolv3.com</a><a href="mailto:info@wevolv3.com">info@wevolv3.com</a></footer>
</div>
</body>
</html>`;
}
