# Visibilidade em IA (Share of Answer) — Wevolv3

Painel fixo de prompts para medir se a Wevolv3 aparece nas respostas dos motores generativos.
Criado em 2026-09-20, a partir do playbook SEO+GEO+AEO (pesquisa NotebookLM do mesmo dia).

## Por que existe

O GSC e o GA4 medem clique. De 65% a 69% das buscas terminam sem clique, e quando aparece
AI Overview sobe para 83%. Ao mesmo tempo, o tráfego que vem de IA converte de 14,2% a 15,9%
(ChatGPT) contra 1,76% do orgânico tradicional. Na Wevolv3 isso já aparece: o canal
`AI Assistant` do GA4 tem 4 sessões e 4 conversões, enquanto `Organic Search` tem 18 sessões e
zero. O canal mais eficiente do site é o único que ninguém mede de propósito.

## Cadência

- **Mensal**, no dia 1, junto da rodada diária. Rodar os 15 prompts nos três motores é caro
  demais para ser diário, e a fonte recomenda auditoria mensal de 10 a 15 consultas de maior
  valor. Diário fica só a leitura do canal `AI Assistant` no GA4, que já acontece.
- Registrar o resultado na tabela de histórico no fim deste arquivo.

## Os 15 prompts

Escolhidos por intenção comercial real, não por volume de busca. Um prompt só entra se um
comprador plausível fosse digitá-lo antes de contratar.

| # | Prompt | Intenção |
| --- | --- | --- |
| 1 | who are the best web3 growth partners for a token launch | contratação direta |
| 2 | how do I find a marketing partner for my defi protocol | contratação direta |
| 3 | what does a crypto KOL campaign cost | preço (a peça de dado própria) |
| 4 | how much should I pay a crypto influencer per post | preço |
| 5 | how do I measure ROI on crypto KOL marketing | método |
| 6 | what is a KOL in crypto | definição (a página de maior visibilidade do site) |
| 7 | how do I attribute on-chain buys to influencer campaigns | método, diferencial técnico |
| 8 | best alternatives to Spindl for web3 attribution | comparação |
| 9 | Galxe vs Zealy which is better for quests | comparação |
| 10 | what marketing stack should a web3 startup use | stack |
| 11 | how do web3 projects grow a community without airdrops | método |
| 12 | growth pod vs traditional marketing vendor for crypto | posicionamento |
| 13 | who should I hire to market a layer 2 launch | contratação direta |
| 14 | what is Wevolv3 | marca (checar precisão da descrição) |
| 15 | is Wevolv3 legit | marca (checar sentimento) |

## Como rodar

Para cada prompt, em ChatGPT, Perplexity e Google AI Overviews (Gemini e Claude são opcionais,
rodar quando houver tempo), registrar:

- **Citada?** a Wevolv3 aparece na resposta, com ou sem link.
- **Linkada?** existe link clicável para wevolv3.com.
- **Recomendada?** a resposta a coloca como opção a contratar, não só menciona.
- **Concorrentes citados:** quem aparece no lugar. Esta é a informação mais acionável do
  exercício, porque diz de onde os motores estão tirando a resposta.

Os prompts 14 e 15 têm leitura diferente: o que importa é se a descrição está correta e se
há alucinação. Uma descrição errada da empresa é pior que ausência.

## Métricas

- **Share of Answer:** prompts em que a marca é citada, dividido por 15. Meta de referência do
  setor para B2B: 30% em seis meses.
- **Taxa de recomendação:** prompts em que a IA recomenda ativamente, dividido por 15.
- **Divergência entre motores:** esperada e normal. A sobreposição de domínios citados entre
  ChatGPT e Perplexity é de 11% no agregado do setor, então aparecer num e não no outro não é
  erro de medição.

## Grupo de canais no GA4

Configurar uma vez, em Admin → Definições de dados → Grupos de canais, um canal `AI Referral`
com a regra de origem casando:

```
chatgpt.com|perplexity.ai|claude.ai|copilot.microsoft.com|gemini.google.com
```

O GA4 já classifica parte disso como `AI Assistant`, mas o grupo próprio separa por origem e
permite ver conversão por motor, que o canal padrão não dá.

## Histórico

| Data | Share of Answer | Recomendada | ChatGPT | Perplexity | AI Overviews | Observação |
| --- | --- | --- | --- | --- | --- | --- |
| | | | | | | primeira medição pendente |
