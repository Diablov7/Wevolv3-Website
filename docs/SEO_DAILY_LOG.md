# Wevolv3 — Log diário de SEO/aquisição

Uma linha por execução da rotina `wevolv3-daily-check`. Serve para dizer se está
melhorando, não só qual é o número de hoje.

GSC = janela de 28 dias do Search Console. GA4 = últimos 28 dias, aquisição de tráfego.

| Data | GSC cliques | GSC impr. | CTR | Pos. média | Indexadas | Não indexadas | GA4 sessões | Direct | Org. Social | Org. Search | Parecer |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 2026-07-27 (baseline) | 5 | 36 | 13,9% | 25,4 | 18 | 62 | 311 | 74,28% | 17,68% | 1,29% | Linha de base |
| 2026-07-29 | 5 | 36 | 13,9% | 23,8 | 18 | 62 | 307 | 74,59% | 17,26% | 1,30% | Parado. Mesma amostra do baseline (2 dias não movem janela de 28d). Único ganho: about/works/contact entraram no índice. Alerta novo: 30 dos 34 eventos principais vêm de "Unassigned", canal com 0% de engajamento e 2s de sessão — medição de conversão não confiável. |
| 2026-07-30 | 5 | 36 | 13,9% | 23,8 | 18 | 62 | 307 | 74,59% | 17,26% | 1,30% | Sem mudança — mesma janela de ontem, GA4 ainda não reflete o fix do `track.ts` (deploy foi 29/07 à noite, fora da janela 1–28/07 lida hoje). Unassigned e Direct seguem no mesmo patamar; é esperado, não é regressão. Bing Webmaster Tools configurado hoje (site verificado, sitemap enviado, status "Processing") — ainda sem dado, tratar como coletando. |
| 2026-07-30 (2ª leitura) | 5 | 39 | 12,8% | 25,0 | 18 | 62 | 279 | 73,12% | 17,92% | 1,43% | Parado, com um sinal fraco positivo. Janela GA4 rolou para 2–29/07 e perdeu dias antigos (311→307→279 sessões: efeito de janela, não queda de tráfego). GSC ganhou 3 impressões (36→39) sem clique novo, então CTR caiu por aritmética, não por perda de performance — ruído puro. Indexação travada em 18/80 pelo 4º dia. Unassigned em 6,81% (19 sessões, 0% de engajamento, 30 dos 34 eventos principais): acima do gatilho de 5%, mas a janela ainda é 100% pré-fix (deploy 29/07 à noite), então não é regressão — o teste real só começa quando a janela cobrir agosto. Direct em 73,12% vs 74,28% do baseline: variação dentro do ruído, ainda não confirma a hipótese. Bing: sitemap crawleado com sucesso, 70 URLs descobertas (ontem estava "Processing"); Search Performance ainda zerado. Acesso: GSC e GA4 migraram para `authuser=2` (o `u/0` agora é romulololico@gmail.com). |
| 2026-07-31 | 5 | 38 | 13,2% | 25,6 | 18 | 62 | 228 | 68,86% | 19,74% | 1,75% | Primeiro sinal real de que o fix funcionou. GA4 (3–30/07) inclui o primeiro dia inteiro pós-deploy: Unassigned ficou **congelado em 19 sessões absolutas** — mesma contagem de ontem, mesmos 30 eventos principais, apesar de a janela ter avançado um dia. Ou seja, o dia novo entrou sem gerar nenhum evento fantasma. O % subiu (6,81%→8,33%) só porque o denominador caiu (279→228 sessões, efeito de janela rolando e perdendo dias antigos), não porque apareceu Unassigned novo — não é regressão, apesar de estar acima do gatilho de 5%. Direct caiu pelo 2º dia seguido: 74,28% (baseline) → 73,12% → 68,86%, com Organic Social subindo 17,68%→19,74%: começa a sustentar a hipótese de que o Direct inflado era Unassigned mal atribuído. GSC: +2 impressões (36→38), 0 clique novo, posição 25,6 — ruído. Indexação travada em 18/80 pelo 5º dia (62 não indexadas) — é o gargalo real, não o CTR. Bing: "No pages found" em Search Performance, ainda coletando. GSC Platform Properties (IG/TikTok/X): as três seguem em "processando, volte em até 48h" — sem dado. |
| 2026-08-01 | 5 | 39 | 12,8% | 25,0 | 18 | 62 | 223 | 68,16% | 21,08% | 1,79% | Fix do Unassigned confirmado; indexação segue travada. GA4 (4–31/07): Unassigned caiu em números **absolutos**, 19→18 sessões, com a janela avançando um dia — o dia novo entrou com zero evento fantasma. Eventos principais congelados nos mesmos 30 desde 29/07 (33 no total, 90,91% ainda vindo do resíduo pré-fix, que vai sair sozinho quando a janela passar de 29/07). Direct cai pelo 3º dia: 74,28% (baseline) → 73,12% → 68,86% → 68,16%; Organic Social sobe 17,68% → 19,74% → 21,08%. Hipótese confirmada: o Direct inflado era Unassigned mal atribuído, e o Social real é maior do que o baseline dizia. Unassigned em 8,07% segue acima do gatilho de 5%, mas **não é regressão** — é resíduo histórico, não geração nova. GSC: +1 impressão (38→39), 0 clique, pos. 25 — ruído. Achado novo: o relatório de indexação está com "Última atualização: 23/07/2026", ou seja, defasado 9 dias — o fix de linkagem interna do commit `1672a60` (31/07) é **impossível** de aparecer nele hoje; não interpretar 18/62 parado como fix falhado até o relatório passar de 31/07. Motivos dos 62: 49 detectada-mas-não-indexada, 9 rastreada-mas-não-indexada, 3 soft 404, 1 canônica duplicada. Bing: Search Performance ainda zerado, coletando. GSC Platform Properties: as três **saíram de "processando"** e já reportam de verdade — IG, TikTok e X com 0 clique cada ("desde a coleta de dados, seu conteúdo não recebeu cliques na Pesquisa Google"). Baseline dessa fonte = zero. |

## 2026-08-01 — pendências herdadas

- ~~Ainda não submetidas pela Inspeção de URL~~ **FEITO em 01/08**: as duas pendentes de 31/07,
  `/blog/web3-community-playbook-for-builders` e `/blog/web3-adoption-funnels-metrics`,
  foram submetidas com "Indexação solicitada" confirmada nas duas. Com isso, as 10 URLs
  do lote pós-`1672a60` estão todas na fila de rastreamento prioritário.
  Nota: as duas ainda apareciam como "Página de referência: nenhuma página foi detectada" —
  é o estado do último rastreamento (anterior ao deploy do índice do `blog.html`),
  não uma indicação de que o fix de linkagem interna falhou.
## 2026-08-01 — investigação: os 3 soft 404 (JÁ CORRIGIDOS, GSC desatualizado)

As três URLs afetadas, todas do mesmo caso (o post `roi-overview` foi deletado do Sanity):

| URL | Último rastreamento |
|---|---|
| `/blog/roi-overview` | 20/07/2026 |
| `/singleblog.html?slug=roi-overview` | 20/07/2026 |
| `/singleblog` (sem slug) | 23/02/2026 |

**Causa:** `_redirects` serve `/blog/*` e `/singleblog` como `200` apontando pro shell
`singleblog.html`. Quando o slug não existe (ou não vem), o JS do shell só troca a tela pro
estado `Article not found` — mas o HTTP continua 200. Página que diz "não encontrado" e
responde sucesso = soft 404 pro Google.

**Já foi corrigido.** A edge function `inject-og-tags.js` hoje devolve `status: 404` de
verdade em dois pontos: slug ausente (linha ~82) e post inexistente no Sanity (linha ~146).
Commits `3d2ea45` (28/07) e `1b0057d` (29/07 — o primeiro tinha quebrado `/blog/<slug>` com
recursão infinita, então o comportamento só ficou correto a partir do segundo).

**Verificado em produção hoje** (curl):

- `/blog/roi-overview` → **404**
- `/singleblog` → **404**
- `/singleblog.html?slug=roi-overview` → **301** para `/blog/roi-overview` → **404**
- `/blog/nao-existe-teste-xyz` (controle) → **404**

Nenhuma das três está no `sitemap.xml` (72 `<loc>`), então não há nada realimentando o erro.

**Por que o GSC ainda acusa:** o último rastreamento das URLs foi 20/07 e 23/02, e o relatório
de indexação está com dados de 23/07 — os três são anteriores aos fixes de 28 e 29/07. O
Google simplesmente ainda não voltou lá.

**Ação executada em 01/08:** clicado "VALIDAR A CORREÇÃO" no relatório Erro soft 404.
O GSC confirmou **"Validação iniciado — Início: 01/08/2026"** para as 3 páginas afetadas.
Não houve mudança de código: o código já estava certo desde 29/07.

**Acompanhar nos próximos dias:** o status da validação deve sair de "Iniciada" para
"Aprovada" (o Google re-rastreia as 3 e confirma o 404) em tipicamente alguns dias. Se voltar
"Falha", aí sim há algo em produção divergindo do que foi verificado por curl hoje.

## 2026-07-31 — ação: causa-raiz da não indexação

Achado que explica os 49 "detectada, mas não indexada" com último rastreamento N/D:

- `blog.html` só linkava os artigos de dentro de um bloco `<noscript>`. Googlebot executa JS,
  logo nunca via link interno nenhum para post nenhum — as URLs só existiam no sitemap.
  O comentário no código dizia "ensures every post has a crawlable internal link"; era falso.
- `/kol-roi-calculator.html` não tinha um único link interno em todo o site.

Corrigido no commit `1672a60` (deploy Netlify confirmado em produção):
índice dos 31 posts renderizado de verdade no `blog.html`, e bloco "Resources" no rodapé da home
com o calculador + artigos-pilar.

Submetido pela Inspeção de URL (8 URLs distintas confirmadas com "Indexação solicitada"):
`/blog/web3-marketing-agency-growth-partner`, `/kol-roi-calculator.html`, `/community-building`,
`/web3-development`, `/blog/crypto-kol-marketing-evolution`, `/blog/web3-kol-attribution-2026`,
`/blog/web-three-gtm-framework`, `/blog/building-crypto-communities`.

**Pendente para amanhã** (cota diária do GSC estourou):
`/blog/web3-community-playbook-for-builders` e `/blog/web3-adoption-funnels-metrics`.
Nota: uma submissão foi gasta em duplicata do calculador (erro de automação), o que
consumiu uma vaga da cota do dia.
