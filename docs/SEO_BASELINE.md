# Wevolv3 — SEO Baseline

**Status:** o template original foi criado para 2026-04-23 e **nunca foi preenchido**.
Nenhum dos checkpoints (maio, junho, julho) tem número. Portanto **não existe medição
anterior para comparar**. Esta leitura, de 2026-07-27, é a linha de base real.

Fonte: Google Search Console (propriedade `https://wevolv3.com/`, conta `authuser=2`) e
GA4 (propriedade "Wevolv3 Website", `a377350418p515955885`). Windsor foi desinstalado, então
a coleta foi manual pelo navegador.

---

## 1. Performance geral

**GSC, 28 dias (29/06 a 26/07/2026), tipo de pesquisa Web:**

| Métrica | 2026-07-27 | T+30 | T+60 | T+90 |
|---|---|---|---|---|
| Cliques orgânicos totais | **5** | **7** | | |
| Impressões totais | **36** | **1.240** | | |
| CTR médio | **13,9%** | **0,6%** | | |
| Posição média | **25,4** | **36,3** | | |

Leitura: 5 cliques em 28 dias. O CTR de 13,9% parece bom mas é artefato de amostra
minúscula. Posição média 25,4 significa página 3 do Google.

**Leitura do T+30 (2026-08-26, janela 28/07 a 24/08):** impressões multiplicaram por 34
(36 → 1.240) e o site passou a aparecer em 123 buscas distintas, contra um punhado em
julho. O clique andou pouco (5 → 7) e os dois números que "pioraram" pioraram por
aritmética, não por desempenho: o CTR cai porque o denominador explodiu, e a posição média
sobe (25,4 → 36,3) porque centenas de consultas novas de cauda longa entraram na média
posicionadas no fim da fila. O gargalo mudou de lugar no período: em julho era indexação,
hoje é autoridade externa (5 domínios referenciadores, parados desde 20/08).

---

## 2. Indexação

**GSC, última atualização 23/07/2026. Total de páginas conhecidas: 80.**

| Métrica | 2026-07-27 | T+30 | T+60 | T+90 |
|---|---|---|---|---|
| Páginas indexadas | **18** | **56** | | |
| Páginas não indexadas | **62** | **40** | | |

Motivos da não indexação:

| Motivo | Páginas | Fonte |
|---|---|---|
| **Detectada, mas não indexada no momento** | **49** | Google |
| Rastreada, mas não indexada no momento | 9 | Google |
| Erro soft 404 | 3 | Site |
| Cópia, Google escolheu canônica diferente | 1 | Google |

Vídeos: 1 página de vídeo não indexada, 0 indexadas.

**Este é o gargalo principal.** O sitemap tem 67 URLs e só 18 páginas estão no índice.
"Detectada, mas não indexada" em 49 páginas significa que o Google conhece a URL e
**escolheu não gastar rastreamento nela**. Não é bug técnico, é sinal de baixa autoridade
de domínio e/ou conteúdo que o Google não julgou digno de indexar.

O gráfico mostra dois saltos no volume de páginas não indexadas, por volta de 11/06 e
03/07, que coincidem com a entrada de conteúdo novo (crypto-news-today e posts). Ou seja,
publicar mais está aumentando a pilha de não indexadas, não o tráfego.

---

## 3. Consultas

Apenas **5 consultas no total** em 28 dias.

| # | Consulta | Cliques | Impressões |
|---|---|---|---|
| 1 | evolv3 | 0 | 5 |
| 2 | wevolv | 0 | 1 |
| 3 | guerilla marketing crypto | 0 | 1 |
| 4 | wevol | 0 | 1 |
| 5 | crypto kol marketing | 0 | 1 |

Três das cinco são **erro de digitação da marca** (evolv3, wevolv, wevol). Só duas são
consultas não-marca, com 1 impressão cada. Os 5 cliques vieram de consultas que o Google
anonimiza por privacidade, então não aparecem na lista.

**Conclusão dura: o site não tem visibilidade orgânica não-marca.**

---

## 4. Páginas por impressões

| # | URL | Cliques | Impressões |
|---|---|---|---|
| 1 | `/` | **5** | 31 |
| 2 | `/blog` | 0 | 12 |
| 3 | `/crypto-pr` | 0 | 10 |
| 4 | `/crypto-exchange-marketing` | 0 | 9 |
| 5 | `/defi-marketing` | 0 | 9 |
| 6 | `/crypto-kol-marketing` | 0 | 9 |
| 7 | `/disclaimer` | 0 | 5 |

A home concentra 100% dos cliques. Nenhuma página de serviço converteu uma única
impressão em clique.

Nota: a soma das impressões por página (85) excede o total do relatório (36). É um
artefato conhecido de agregação do GSC em amostras pequenas, não um erro de leitura.

---

## 5. Core Web Vitals

| Métrica | 2026-07-27 |
|---|---|
| LCP / INP / CLS | **Nenhum dado** (celular e desktop) |

Sem dados de campo porque o volume de tráfego é insuficiente para o CrUX gerar amostra.

---

## 6. GA4 — aquisição de tráfego

**28 dias (30/06 a 27/07/2026).** Total: **311 sessões**, 107 engajadas (34,41%),
tempo médio 22s, 5,65 eventos por sessão.

| Canal | Sessões | % | Engajadas | Taxa engaj. | Tempo médio |
|---|---|---|---|---|---|
| **Direct** | 231 | 74,28% | 69 | 29,87% | 16s |
| **Organic Social** | 55 | 17,68% | 33 | **60%** | **53s** |
| Unassigned | 18 | 5,79% | 0 | 0% | 2s |
| **Organic Search** | 4 | 1,29% | 3 | 75% | 21s |
| Referral | 2 | 0,64% | 2 | 100% | 41s |
| Organic Video | 1 | 0,32% | 0 | 0% | 0s |

Últimos 7 dias: 62 usuários ativos (-31,1%), 34 novos (-2,9%), 1 evento principal (-96,9%).

**Coerência entre as duas fontes:** GA4 marca 4 sessões de Organic Search e o GSC marca 5
cliques. Bate, considerando janelas de atribuição diferentes. Não há indício de tráfego
falso.

**O que os números dizem:**

1. **Social é o único canal que traz gente de verdade.** 60% de engajamento e 53 segundos
   de permanência, contra 29,87% e 16 segundos do Direct. É o melhor tráfego do site por
   uma margem larga, e é o menor investimento.
2. **Direct com 74% e 16 segundos é suspeito.** Direct desse tamanho normalmente é tráfego
   sem UTM, não gente digitando o domínio. Provavelmente são os links de Telegram e DM
   entrando sem parâmetro. Vale conferir se o tracker first-party está marcando.
3. **Unassigned com 0% de engajamento e 2 segundos** são 18 sessões que não valem nada.
4. **Busca orgânica é ruído estatístico.** 4 sessões em 28 dias.

---

## 7. Prioridades que saem desta leitura

Em ordem de impacto sobre o problema real, que é indexação e não conteúdo:

1. **Atacar as 49 "Detectada, mas não indexada".** Publicar mais não resolve, está
   piorando. O caminho é autoridade externa (backlinks, diretórios, PR) e consolidação do
   que já existe, não volume novo.
2. **Corrigir os 3 soft 404** e a 1 página com canônica trocada. É a única parte
   puramente técnica e é rápida.
3. **Migrar a propriedade do GSC para tipo Domínio.** Hoje é prefixo de URL
   (`https://wevolv3.com/`), que ignora http, www e subdomínios. Cega parte dos dados.
4. **Investigar o Direct de 74%.** Se for UTM faltando, o canal Social real é bem maior
   do que 17,68% e a decisão de investimento muda.
5. **Dobrar no Social**, que é o único canal com engajamento decente, e é exatamente onde
   o calendário editorial do Telegram e X acabou de entrar.

---

## 8. Próximos checkpoints

Como não havia baseline, os checkpoints partem de hoje:

- **T+30: 2026-08-26**
- **T+60: 2026-09-25**
- **T+90: 2026-10-25**

Reler as mesmas telas, nas mesmas janelas de 28 dias, e preencher as colunas vazias das
tabelas acima.

---

*Preenchido em 2026-07-27 por leitura manual do GSC e GA4 (Windsor desinstalado).*
