# Portfolio — rascunho dos cases para diretório B2B

Rascunho criado em 2026-08-22. **Não foi submetido em lugar nenhum.** É o insumo do item que a
auditoria aponta como o de maior peso ainda vazio: portfolio nos perfis do Clutch, GoodFirms,
DesignRush e Sortlist.

**Docs relacionados:**
[`CLUTCH_GOODFIRMS_OTIMIZACAO.md`](CLUTCH_GOODFIRMS_OTIMIZACAO.md),
[`DIRECTORY_PACK_DESIGNRUSH_SORTLIST.md`](DIRECTORY_PACK_DESIGNRUSH_SORTLIST.md) (valores comuns de
perfil, distribuição de serviços),
[`DIRECTORY_SUBMISSIONS_LOG.md`](DIRECTORY_SUBMISSIONS_LOG.md) (registrar quando colar).

## De onde veio cada coisa

Os 5 cases são os 5 que já estão públicos no site, com URL própria e no sitemap. **O conteúdo
integral foi puxado do CMS** (dataset público do Sanity, `sszuldy6` / `production`, consultado por
GROQ sem token, do mesmo jeito que o próprio `works.html` consulta). Ou seja, os números abaixo não
são reconstrução: são o texto que já está no ar.

| Case | URL pública | Ano no CMS | Tipo no CMS |
|---|---|---|---|
| L0 blockchain (NDA) | `/works/blockhain-l0-under-nda` | 2025 | Brand Strategy |
| L1 blockchain (NDA) | `/works/l1-blockchain-under-nda` | 2023-2025 | Brand Strategy |
| AI infrastructure (NDA) | `/works/ai-infrastructure-nda` | 2025 | Brand Strategy |
| Meme token (NDA) | `/works/meme-token-nda` | 2025 | (não preenchido) |
| SUBBD | `/works/subbd` | 2024 | Community Building |

Como já são públicos, reusar o texto em diretório **não cria risco novo de NDA**. SUBBD é o único
nomeado, porque o CMS o traz no campo `client` e o site já o exibe. Os outros quatro seguem
anonimizados por categoria.

## Regras aplicadas

- Texto dos cases em inglês, é o que vai para o diretório. Anotações e lacunas em português.
- Zero travessão e zero meia risca.
- A palavra "agency" não aparece em texto visível.
- **Nenhum número foi inventado.** Todo número abaixo está marcado com a origem `[CMS]`. Onde o CMS
  não tem o dado, o campo continua como `[FALTA: ...]`.
- Services used usa a distribuição já padronizada e salva no Clutch: Blockchain Marketing,
  Social Media Marketing, Public Relations, Content Marketing, Marketing Strategy.

---

## Case 1 — Developer acquisition for an L0 blockchain

**Project title:** Hackathon Campaign for an L0 Blockchain

**Client:** L0 blockchain infrastructure (NDA)

**Industry / vertical:** Blockchain infrastructure, Cryptocurrency

**Project size:** `[FALTA: faixa em USD]`
**Duration:** `[FALTA: duração em meses. O CMS só traz o ano: 2025]`

**The challenge:**
An infrastructure project needed developers, not followers. Reach in crypto is easy to buy and
almost never lands on the people who actually build on a chain. The goal was qualified technical
adoption, measured in developers onboarded.

**The solution:**
- Blockchain marketing: a full cycle Web3 campaign built around a hackathon, so the entry point for
  the audience was building something rather than watching an announcement. `[CMS: shortDescription "Hackathon Campaign"]`
- Social media and KOL: a coordinated creator push through voices whose audiences include
  developers, selected on audience fit rather than follower count.
- Community: community driven distribution, so the message travelled through builder groups
  instead of only paid placements.
- Content and strategy: positioning and content cadence supporting the campaign end to end.

**The results:**
- Over 340K reach. `[CMS]`
- Around 60 developers onboarded. `[CMS]`
- `[FALTA: quantos desses devs seguiam ativos depois de 30 ou 90 dias. O CMS não tem retenção]`

> **Atenção antes de colar, divergência dentro do próprio CMS:** o corpo do case diz
> **"Over 340K reach"** e o card de resultado do mesmo case diz **"340k Impressions"**. Alcance e
> impressão não são a mesma métrica, e diretório com moderação compara o texto com o site.
> **Romulo, decida qual das duas é a verdadeira e alinhe o CMS e o diretório na mesma palavra.**
> Acima usei "reach", que é o que está no corpo.

**Services used:** Blockchain Marketing, Social Media Marketing, Content Marketing, Marketing Strategy

---

## Case 2 — Growth through a bear market for an L1 blockchain

**Project title:** Holder Growth Through a Bear Market for an L1 Blockchain

**Client:** L1 blockchain (NDA)

**Industry / vertical:** Blockchain infrastructure, Cryptocurrency

**Project size:** `[FALTA: faixa em USD]`
**Duration:** 2023 to 2025, a multi year engagement across a full market cycle. `[CMS: year "2023-2025"]`

**The challenge:**
While most projects slowed down or went quiet through the bear market, this one chose to keep
building. The goal was real user adoption, long term validator support and sustainable growth
rather than short lived hype, at the exact point in the cycle when budgets shrink and attention
disappears.

**The solution:**
- Marketing strategy: growth strategy defined by Wevolv3 together with the project team, with
  positioning and execution aligned from day one.
- Community: community driven distribution and ongoing communication as the main engine, so growth
  did not depend on constant paid spend.
- Public relations and KOL: PR and carefully selected KOLs brought in at key moments to amplify the
  narrative and extend reach without diluting audience quality. `[CMS]`
- Measurement: growth tracked on the BEP20 network from day one, so every claim was tied to on
  chain behaviour instead of engagement metrics.

**The results:**
- Holder base grew from roughly 1.8K to around 5.57K on BEP20, approximately 209% growth. `[CMS]`
- The ecosystem later expanded beyond the initial deployment, with a native network alongside an
  ERC20 version. Combined across all networks, the ecosystem now exceeds 20,000 holders. `[CMS]`

> Anotação: o card de resultado do CMS mostra "200+%", o corpo mostra "approximately 209%". As duas
> batem, não é divergência. Usei o número do corpo, que é mais forte e verificável.

**Services used:** Blockchain Marketing, Public Relations, Social Media Marketing, Content Marketing, Marketing Strategy

---

## Case 3 — Reputation recovery for an AI infrastructure project

**Project title:** Reputation Recovery in a High Pressure Social Environment

**Client:** AI infrastructure project (NDA)

**Industry / vertical:** AI infrastructure, Blockchain

**Project size:** `[FALTA: faixa em USD]`
**Duration:** The acute recovery ran in under 72 hours. `[CMS]` `[FALTA: se houve retainer antes ou depois dessa janela, e por quanto tempo]`

**The challenge:**
A wave of confusion escalated into thousands of negative mentions, overwhelming the public
conversation and creating an atmosphere of uncertainty. Analysis showed it was not organic
frustration: a coordinated FUD team was driving the narrative, and a competing project was
deliberately amplifying the misinformation to weaken the brand's position. The project was no
longer being judged by facts but by noise.

**The solution:**
- Public relations: structured communication patterns and controlled message flow to reintroduce
  context where speculation had taken over, aiming at strategic realignment rather than aggressive
  confrontation.
- Social and community: work inside the channels where the misinformation was actually spreading,
  restoring balance, consistency and authenticity in the conversation.
- Content: narrative correction under live pressure, so the recovery followed a steady organic
  curve instead of an artificial spike in activity.

**The results:**
- FUD volume reduced by 89 percent. `[CMS]`
- Full recovery in less than 72 hours. `[CMS]`
- Coordinated FUD impact neutralized, with sentiment stabilizing and the brand regaining control of
  its narrative space. `[CMS]`

**Services used:** Public Relations, Social Media Marketing, Content Marketing, Marketing Strategy

---

## Case 4 — YouTube activation for a meme token

**Project title:** YouTube Creator Activation for a Meme Token

**Client:** Meme token (NDA)

**Industry / vertical:** Cryptocurrency, Consumer token `[CMS: category "token launch"]`

**Project size:** `[FALTA: faixa em USD]`
**Duration:** `[FALTA: duração, provavelmente em semanas. O CMS só traz o ano: 2025]`

**The challenge:**
`[FALTA: o desafio em uma ou duas frases. O CMS descreve só o que foi feito e o que saiu, nunca o problema de partida. Pergunta: o token estava pré lançamento sem atenção, pós lançamento sem tração, ou perdendo atenção depois de um pico?]`

**The solution:**
- Content: neuromarketing driven content built for the way people actually watch and decide on
  YouTube, not repurposed from X posts. `[CMS]`
- Search: strong SEO signals, so the videos kept pulling views after the campaign week. `[CMS]`
- KOL and social: a coordinated push across creators, timed so the pieces reinforced each other
  instead of firing on the same day and dying. `[CMS]`

**The results:**
The activation produced awareness, organic traction and a clear market reaction: the audience
expanded and the token moved. `[CMS, mas sem número]`

`[FALTA: pelo menos um número. Este é o único dos 5 cases sem nenhum campo de resultado preenchido no CMS. O que serve: views totais ou por vídeo, novos holders no período, variação de volume de negociação, ou inscritos ganhos. Se houver reação de preço, cuidado: prometer preço num perfil de diretório é ruim, prefira holders ou volume]`

**Services used:** Social Media Marketing, Content Marketing, Blockchain Marketing, Marketing Strategy

---

## Case 5 — Community acquisition for a fundraising campaign (SUBBD)

**Project title:** Community Acquisition for a Fundraising Campaign

**Client:** SUBBD (cliente nomeado, já público no site e no campo `client` do CMS)

**Industry / vertical:** `[FALTA: em que vertical a SUBBD entra? O CMS classifica como "crypto marketing", que é o nosso serviço, não a indústria dela. Web3 consumer, creator economy, outra?]`

**Project size:** `[FALTA: faixa em USD]`
**Duration:** `[FALTA: duração da campanha de captação. O CMS só traz o ano: 2024]`

**The challenge:**
`[FALTA: o desafio em uma ou duas frases. O CMS diz o objetivo (fortalecer a campanha de captação com membros comprometidos) mas não o problema de partida. Pergunta concreta: a comunidade estava pequena demais, ou grande e cheia de caçador de airdrop e bot?]`

**The solution:**
- Community: a strategic and tailored acquisition effort run alongside the SUBBD team, focused on
  attracting new members who were committed and aligned with the project values, rather than on raw
  group size. `[CMS]`
- Marketing strategy: acquisition tied directly to the fundraising campaign, so the community was
  built for a moment with a deadline instead of as an open ended growth exercise. `[CMS]`
- Social media: `[FALTA: em quais canais isso rodou? Telegram, Discord, X? O CMS não registra canal]`

**The results:**
`[FALTA: pelo menos um número. Achado do CMS: o case tem um campo de resultado criado com as métricas "Community Growth; TVL increase", mas o valor foi deixado em branco. Ou seja, alguém sabia quais eram as métricas certas e nunca preencheu. Preencher esses dois valores fecha este case: crescimento de comunidade (membros, ou %) e aumento de TVL]`

**Services used:** Social Media Marketing, Content Marketing, Marketing Strategy, Blockchain Marketing

---

## Como usar este arquivo

1. **Três cases já podem ser colados hoje** (1, 2 e 3), todos com número real vindo do CMS. Isso
   já satisfaz o mínimo de 3 cases que os diretórios pedem, então o portfolio **deixou de estar
   bloqueado**.
2. Responder as perguntas abaixo destrava os cases 4 e 5 e completa os campos de formulário dos
   três primeiros.
3. Substituir cada `[FALTA: ...]` pelo valor real. Se algum número não existir mesmo, **apagar a
   linha de resultado inteira** em vez de inventar. Case sem resultado ainda é aceito; case com
   número falso derruba o perfil na verificação do Clutch, que liga para o cliente.
4. Colar o mesmo texto em Clutch, GoodFirms, DesignRush e Sortlist, para manter consistência.
5. Registrar em `DIRECTORY_SUBMISSIONS_LOG.md` a data em que o portfolio entrou em cada perfil.

Regra que continua valendo em tudo que for colado: zero travessão, zero meia risca, e a palavra
"agency" nunca em texto visível.

---

## Perguntas para o Romulo

O CMS fechou 6 das 20 lacunas e encurtou outras 4. Sobraram 10, e a nº 3 foi resolvida em 22/08.
**Restam 9 perguntas**, e só 2 delas são bloqueantes.

**Nota operacional descoberta em 22/08:** o Studio publicado em `wevolv3.com/studio` é um build de
23/04 que não conhece o tipo `work`, então os cases não são editáveis por lá (a ferramenta de
estrutura crasha). O único editor que enxerga `work` é o Studio local, rodando de `wevolv3/` com
`npx sanity dev`. Enquanto o build da pasta `studio/` não for regerado, toda edição de case depende
de subir o Studio local.

### A. Resultados que ainda faltam (bloqueante, só afeta os cases 4 e 5)

1. **Meme token (case 4):** um número da ativação. Views, novos holders, variação de volume ou
   inscritos ganhos. É o único dos 5 cases sem nenhum resultado preenchido no CMS.
2. **SUBBD (case 5):** os dois valores que já estão criados no CMS e ficaram em branco:
   **crescimento de comunidade** e **aumento de TVL**. Basta preencher.

### B. Divergência a resolver (RESOLVIDA em 22/08)

3. ~~**L0 (case 1): é "340K reach" ou "340K impressions"?**~~ **Resolvido: "reach" nos dois lugares.**
   O Romulo decidiu por alcance, e o campo `results[0].value` do documento
   `a8e6f5a0-9a81-448f-a2f5-e89fe9c0671d` foi de `340k Impressions` para `340k Reach` e publicado.
   Confirmado na API pública. Reforça a escolha: a própria arte do case já dizia "340k Total reach".
   Reach é a métrica mais conservadora das duas, então o site passa a afirmar menos do que poderia,
   que é a postura certa para moderação de diretório.

### C. Escopo comercial (o que mais falta, 5 campos)

4. **Faixa de valor de cada um dos 5 projetos**, na escala dos diretórios: menos de $10.000 /
   $10.000 a $49.999 / $50.000 a $199.999 / $200.000+. Nenhum dos 5 tem esse dado em lugar nenhum,
   e é campo obrigatório em quase todo formulário. A faixa basta.
5. **Duração dos cases 1, 4 e 5**, em meses ou semanas. Os cases 2 e 3 já estão resolvidos pelo CMS
   (2023-2025 e menos de 72 horas).

### D. Contexto que falta em dois cases

6. **Meme token (case 4): qual era o problema?** Pré lançamento sem atenção, pós lançamento sem
   tração, ou perda de atenção depois de um pico?
7. **SUBBD (case 5): qual era o problema?** Comunidade pequena demais, ou grande e cheia de caçador
   de airdrop e bot?
8. **SUBBD: qual a vertical da empresa** (Web3 consumer, creator economy, outra)? O CMS só tem
   "crypto marketing", que é o nosso serviço, não a indústria dela.
9. **SUBBD: em quais canais** rodou a aquisição (Telegram, Discord, X)?

### E. Decisão de exposição

10. **Algum dos quatro cases sob NDA pode ser nomeado?** Nomear cliente vale mais que categoria em
    diretório B2B. O case 2 é o candidato mais forte: 1.8K para 5.57K holders com 20.000+ no
    ecossistema combinado é o melhor número do portfolio inteiro, e o contrato é de 2023-2025.

### Fechado pelo CMS, não precisa mais perguntar

- Resultado do L1 (case 2): holders de ~1,8K para ~5,57K, ~209%, e 20.000+ somando as redes.
- Resultado do AI infrastructure (case 3): FUD reduzido em 89%, recuperação total em menos de 72h.
- Duração do case 2 (2023-2025) e do case 3 (menos de 72h na fase aguda).
- Houve PR no case 2? Sim, PR e KOLs selecionados em momentos chave.
- Os números do L0 (340K e ~60 devs) estão confirmados no CMS, resta só a palavra certa (item 3).
- Desafio do case 3, que agora tem contexto real: time de FUD coordenado mais um projeto
  concorrente amplificando de propósito.

*Criado em 2026-08-22, enriquecido no mesmo dia com o conteúdo puxado do CMS. Nenhum conteúdo daqui
foi publicado ou submetido.*
