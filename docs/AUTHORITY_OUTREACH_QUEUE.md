# Fila de outreach de autoridade

Criado em 2026-08-29, a partir da medição do gap de autoridade contra os concorrentes.
Substitui "submeter mais diretório" como próxima ação, porque a medição mostrou que
submeter diretório grátis não está convertendo.

**Docs relacionados:** [`DIRECTORY_SUBMISSIONS_LOG.md`](DIRECTORY_SUBMISSIONS_LOG.md),
[`CLUTCH_REVIEW_OUTREACH.md`](CLUTCH_REVIEW_OUTREACH.md),
[`DIRECTORY_SUBMISSIONS_PLAYBOOK.md`](DIRECTORY_SUBMISSIONS_PLAYBOOK.md),
[`SEO_DAILY_LOG.md`](SEO_DAILY_LOG.md).

---

## O tamanho real do buraco (medido em 29/08 no Ahrefs)

| Domínio | DR | Backlinks | Sites que linkam | % dofollow |
|---|---|---|---|---|
| **wevolv3.com** | **6** | 433 | 363 (só ~5 contam) | **8%** |
| seocircular.com | 39 | 4.0K | 892 | 48% |
| marketacross.com | n/d | 3.9K | 1.4K | 40% |
| coinbound.io | 62 | n/d | n/d | n/d |

DR é escala logarítmica: 6 contra 62 não é "10x pior", é outra ordem de grandeza.

**Os 363 são miragem.** A amostra do Ahrefs mostra que a esmagadora maioria é PBN de venda de
backlink (`siterankexpress.shop`, `thebacklinks.shop`, `seoexpress-*.store`, `pbnseolinks.shop`,
`googleseocraft.shop`, `toprankprovider.shop` e dezenas iguais), usando wevolv3.com como
depoimento falso, com o mesmo texto repetido domínio a domínio. Por isso o Search Console conta
5: o Google descarta o resto. Os 8% de dofollow são a assinatura desse tipo de rede.

**Link legítimo de maior valor identificado:** `wevolv3.hashnode.dev` (DR 83), o espelho do
próprio blog. Ele apontava para `singleblog.html?slug=roi-overview`, que era 404 até 29/08 e
agora faz 301 para o artigo certo.

---

## Por que a fila mudou de forma

O programa de diretório rodou e **não converteu em 27 dias**. Das 5 submissões de 02/08:

| Diretório | Status registrado | Verificado em 29/08 |
|---|---|---|
| The Business of Crypto | "em moderação" | **Não publicado.** Varri o diretório, ~60 empresas, nenhuma menção |
| AMW Blockchain & Web3 | "em revisão editorial" | **Não publicado.** 20 listagens, nenhuma menção |
| ChainHire | "em revisão, 7 dias úteis" | Prazo estourado, sem confirmação |
| GBA Global Web3 | descartado | — |
| CryptoDirectories | descartado, sem plano grátis | — |

Conclusão prática: fila de moderação de diretório pequeno e grátis tem rendimento perto de zero.
O que já funcionou de verdade foi **GoodFirms (4 links) e Crunchbase (1)**, os dois grandes, e nos
dois o perfil está publicado.

---

## A fila, em ordem de retorno

### 1. Disparar o pedido de review do Clutch (pronto desde 22/08, nunca enviado)

Este é o item mais alavancado da lista e não precisa de trabalho novo, o texto já existe em
[`CLUTCH_REVIEW_OUTREACH.md`](CLUTCH_REVIEW_OUTREACH.md).

**Por que é o primeiro:** na varredura de 21/08, seis páginas de `clutch.co/agencies/blockchain-marketing/web3`,
cerca de 96 empresas, a Wevolv3 não aparece em nenhuma. O perfil foi recategorizado corretamente
em 02/08 e mesmo assim não ranqueia dentro do Clutch. O que falta é review, e são zero. Enquanto
forem zero, todo o resto do perfil é investimento parado.

**O que destrava:** o Clutch aceita review anônimo (identidade verificada por dentro, nome não
publicado). É exatamente isso que permite os 4 clientes sob NDA participarem.

- Esforço: 1 hora, 5 mensagens
- Bloqueio atual: aprovação do Rômulo no texto, e a faixa de valor de cada projeto
  (pergunta 4 do `PORTFOLIO_CASES_DRAFT.md`), que define se o cliente cai no formulário
  ou na ligação com analista

### 2. Cobrar as 3 submissões paradas, uma vez, e depois enterrar

Um follow-up curto para The Business of Crypto, AMW e ChainHire. Se não responderem em uma
semana, marcar como mortos no log e parar de contá-los como pendência aberta.

- Esforço: 30 minutos
- Expectativa honesta: baixa. É higiene de tracking, não alavanca

### 3. Listicles que já linkam vários concorrentes ao mesmo tempo

Estas páginas ranqueiam para as buscas comerciais que a Wevolv3 persegue e já linkam Coinbound,
MarketAcross e companhia. Entrar em uma vale mais que dez diretórios pequenos, porque são páginas
com tráfego real e link contextual.

| Página | Por que entra na fila |
|---|---|
| `coinlaunch.space/blog/top-10-web3-marketing-agency-picks/` | lista curada, aceita sugestão |
| `eakdigital.com/best-web3-marketing-agencies-pricing-case-studies/` | 17 posições, formato expansível |
| `ventureburn.com/best-crypto-marketing-agency/` | veículo editorial, aceita pitch |
| `blockchain-ads.com/post/crypto-marketing-agencies` | 24 posições, atualiza a lista |
| `radarblock.xyz/blogs/top-10-web3-marketing-agencies-in-2026` | player pequeno, mais acessível |
| `marketerhire.com/blog/best-web3-marketing-agencies` | ranking por fit de startup |
| `superbcompanies.com/categories/crypto-marketing-agencies/` | top 100, barreira baixa |
| `coingape.com/top-7-crypto-marketing-firms-of-the-year/` | veículo cripto grande, difícil |
| `coinbureau.com/analysis/crypto-marketing-agencies` | veículo cripto grande, difícil |

**Não pitchar:** `coinbound.io/top-web3-marketing-agencies/` e
`surgence.io/blog/top-10-web3-marketing-agencies-2025`. São dos concorrentes diretos.

**O gancho não é "me adiciona".** É o estudo de preço de KOL publicado em 21/08, que é dado
próprio e é a única coisa que a Wevolv3 tem que essas páginas não têm. O pitch oferece o dado
para o autor citar, e a inclusão na lista vem como consequência, não como pedido principal.

- Esforço: 4 horas para 9 pitches personalizados
- Expectativa honesta: taxa de resposta de listicle frio é baixa. 1 a 3 inclusões de 9 já
  seria bom, e cada uma vale mais que a fila inteira de diretório

### 4. Parceiros reais do ecossistema

`wekolnect.com` já linka (2 links). A planilha de 20 empresas do pipeline de parceiros
(workflow n8n `2m2bwMI5QA9pF6BD`) é a fonte, e o pedido é página de case conjunto onde
existir relação real, nunca troca de link.

- Esforço: contínuo
- Regra: só onde existe relação de verdade. Troca artificial é link spam pela definição do Google

---

## O que NÃO fazer

- **Não submeter mais diretório grátis pequeno** até algum dos 3 parados publicar. O rendimento
  medido é zero em 27 dias e cada submissão custa tempo real.
- **Não comprar link**, inclusive dos que já estão fabricando depoimento falso com o domínio.
  É exatamente a rede que o Google descarta, e é o motivo de os 363 valerem 5.
- **Não tratar o disavow como prioridade.** A posição oficial do Google é que ele ignora spam
  óbvio sem disavow. É higiene, não alavanca, e não move a posição 36,3.

---

## Como saber se funcionou

O número a acompanhar é **domínios referenciadores no relatório Links do Search Console**,
hoje em 5, parado há 10 leituras. O `wevolv3-daily-check` já lê isso todo dia.

Meta honesta: sair de 5 e chegar a 10 até o fim de setembro. Qualquer coisa acima disso é
sinal de que os listicles pegaram.
