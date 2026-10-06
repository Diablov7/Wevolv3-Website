# Pauta de SEO, 30 dias (06/10 a 05/11/2026)

Base: pesquisa "Wevolv3 SEO: volume vs nicho (out/2026)" no NotebookLM (56 fontes) cruzada
com o estado real do site em 06/10. Três ideias guiam tudo:

- **Limpar e conectar antes de publicar.** Rende mais que volume.
- **Fundo de funil.** Comparação, custo e decisão trazem lead; "o que é X" o resumo de IA responde sem clique.
- **Ritmo de 2 a 4 artigos no mês** enquanto a autoridade do site estiver abaixo de 10.

Ajustes que já entraram na rotina diária em 06/10:
1. Consultas de decisão medidas à parte.
2. Alerta se o blog passar de 4 posts no mês.
3. Fila de não indexadas tratada página por página toda segunda.

## O que a pesquisa sugeria e já existe (não refazer)

- **Páginas de serviço de listagem e crypto PR:** `/listings` e `/crypto-pr` já estão no ar e no
  sitemap, junto com `/token-launch-marketing` e `/crypto-exchange-marketing`. O trabalho é
  fortalecer, não criar.
- **Ritmo:** setembro teve 2 posts e outubro 1 até 05/10. Já está dentro de 2 a 4 por mês.

## As 18 páginas fora do índice (lidas no GSC em 06/10)

O relatório de Páginas do GSC está com "Última atualização: 20/09/2026", então parte da lista já
mudou. A situação de cada URL foi conferida no site ao vivo em 06/10.

| URL | Motivo no GSC | Situação real em 06/10 | Destino |
|---|---|---|---|
| `/singleblog.html?slug=galxe-vs-zealy-roi-platforms` | redirecionamento | 301 para a URL limpa | (a) técnica, não mexer |
| `/singleblog.html?slug=roi-overview` | redirecionamento | 301 para `/blog/galxe-vs-zealy-roi-platforms` | (a) |
| `/singleblog.html?slug=web-three-marketing-mistakes` | redirecionamento | 301 para a URL limpa | (a) |
| `/crypto-news-today` | redirecionamento | 301 para `/blog` | (a) |
| `/blog/roi-overview` | soft 404 | hoje 301 para `/blog/galxe-vs-zealy-roi-platforms` | (a) já corrigido, sai na próxima atualização |
| `/singleblog` | soft 404 | hoje responde 404 | (a) |
| `/crypto-news-today/2026-08-10` | rastreada, não indexada | 301 para `/blog` | (a) |
| `/singleblog.html?slug=when-ai-becomes-the-marketer-…` | rastreada, não indexada | 301 para a URL limpa | (a) |
| `/singleblog?slug=when-ai-becomes-the-marketer-…` | rastreada, não indexada | URL antiga | (a) |
| `/singleblog.html?slug=web3-community-playbook-for-builders` | rastreada, não indexada | 301 para a URL limpa | (a) |
| `/singleblog.html?slug=why-exchanges-need-marketing-to-win-in-2026` | rastreada, não indexada | 301 para a URL limpa | (a) |
| `/disclaimer.html`, `/privacy.html`, `/terms.html` | detectada, não indexada | 200 com canonical para a versão limpa (desde 28/09) | (a) |
| `/linktree/` | detectada, não indexada | 200, `index, follow`, 586 palavras, hub de links da bio | (c) `noindex` |
| `/for-funds/` | detectada, não indexada | 200, `index, follow`, 2.087 palavras, página para fundos de VC | **decisão do Rômulo**: hoje é escondida de propósito; se for para ranquear, precisa de link interno |
| `/blog/why-discord-support-works-better` | detectada, não indexada | 200, 3.482 palavras | (b) link interno + pedir indexação |
| `/blog/crypto-pr-builds-leadership-faster` | rastreada, não indexada | 200, 3.573 palavras, título "Why Everyone Is Wrong About Crypto PR vs Competitors" | (b) título descritivo + link de/para `/crypto-pr` + pedir indexação |

**Resumo:** 14 das 18 se resolvem sozinhas. Sobram 2 posts reais para recuperar, 1 `noindex` e 1
decisão sua.

## Links internos para as páginas de serviço

Hoje `/listings` e `/crypto-pr` recebem link só do menu e do rodapé (2 por página, em 14 páginas).
**Nenhum post do blog linka para elas no texto.** Link contextual de post relevante é o que a
pesquisa recomenda para levar autoridade a página de serviço.

| De (post) | Para | Onde no texto |
|---|---|---|
| `why-exchanges-need-marketing-to-win-in-2026` | `/listings` | no trecho sobre listagem |
| `best-web3-marketing-firms-2026` | `/crypto-pr` e `/listings` | nas seções de PR e de lançamento |
| `crypto-pr-builds-leadership-faster` | `/crypto-pr` | no primeiro parágrafo |
| `what-is-a-tge-in-crypto` | `/token-launch-marketing` | onde o texto fala do lançamento |
| `web-three-gtm-framework` | `/listings` e `/crypto-pr` | na etapa de go-to-market |

Cuidado técnico: o corpo dos posts no Sanity não pode ser editado pela tela do Studio (erro de
schema com `htmlTable`). A edição sai pela API, mexendo só em `markDefs` e `marks`, como no
conserto de links de 28/09.

## Semana a semana

**Semana 1: FEITA em 06/10**
- `/linktree/` com `noindex` e fora do sitemap.
- Título do post de crypto PR trocado para "Crypto PR for Web3 Founders: Building Credibility Faster".
- 5 links contextuais: crypto-pr-builds → `/crypto-pr`, best-web3-marketing-firms → `/crypto-pr`, why-exchanges → `/listings`, gtm-framework → `/listings` e `/token-launch-marketing`. O post de TGE já linkava `/token-launch-marketing`.
- O post do Discord estava órfão ("nenhuma página de referência" no GSC). Ganhou link a partir de `sovereign-communities-web-three`.
- Indexação pedida para os 2 posts.
- `/for-funds/` fica escondido de propósito (decisão do Rômulo, 06/10).
- Extra: o post "Why Cellframe Is the Best Post Quantum Blockchain" foi despublicado (cliente citado, erro reconhecido pelo Rômulo). O rascunho segue no Sanity e a URL faz 301 para `/blog/post-quantum-crypto-projects-2026`; a edge function exclui o caminho, no `netlify.toml`.

Plano original da semana 1 (06 a 12/10), limpar e conectar:
- `noindex` no `/linktree/`.
- Título novo para `crypto-pr-builds-leadership-faster`, sem o molde "Why Everyone Is Wrong About".
- Os 5 links contextuais da tabela acima.
- Pedir indexação de `why-discord-support-works-better` e `crypto-pr-builds-leadership-faster`.
- Decidir o `/for-funds/`.

**Semana 2 (13 a 19/10): artigo de decisão 1, apoia `/listings`**
"Crypto exchange listing in 2026: what it costs, how long it takes and what gets you approved".
- Resposta direta no primeiro parágrafo e tabela por nível de exchange (custo, prazo, exigências).
- Só números com fonte. Link para `/listings` no corpo.

**Semana 3 (20 a 26/10): artigo de decisão 2, apoia `/crypto-pr`**
"Crypto PR packages compared: what $5k, $10k and $25k actually buy".
- Usar os mínimos públicos do Clutch já levantados para os artigos comparativos: Outset PR US$ 5 mil e MarketAcross US$ 10 mil.
- Somar o que se compra em cada faixa. Link para `/crypto-pr`.

**Semana 4 (27/10 a 05/11): medir e distribuir**
- Conferir quantas das páginas da semana 1 entraram no índice.
- Comparar as consultas de decisão com a semana 1.
- Publicar o artigo 03 (DeFi) fora do site (Medium) para buscar menção e link.
- Avaliar os outros 4 títulos no molde "Why Everyone Is Wrong About…": web3-adoption-funnels-metrics, web3-failure-data-reality, web3-marketing-2026 e post-quantum-crypto-projects-2026. O 5º, de crypto PR, já é tratado na semana 1. Título repetido em série é sinal de conteúdo feito em lote.

Total no mês: o post de 05/10 mais os 2 artigos de decisão, ou seja, 3 artigos no site. Dentro do teto de 4.

## Ressalvas

- O "2 a 4 por mês" vem de fonte secundária, sem estudo original localizado.
- Boa parte das 42 fontes da pesquisa profunda é blog de quem vende SEO. As fontes primárias são a política do Google sobre conteúdo em escala e o estudo do Ahrefs sobre clique perdido para o resumo de IA.
