# Decisões — 16/11/2026

Registro das decisões do Luiz sobre a spec da V1. O que ainda falta ok, está adiado ou pede análise fica no fim.

## Decidido

**Nota de Sintonia.** Só no fim da V1. Tirar do prompt da IA na V1.

**Equilíbrio vs Sintonia.** Ficam separados. O app precisa explicar bem as duas notas (requisito de UX).

- Sintonia = fluidez da conversa: reciprocidade, tempo de resposta, tom.
- Equilíbrio = divisão do esforço: quem puxa assunto, volume, quem fecha.

Um casal pode ter sintonia alta e equilíbrio baixo (uma pessoa carrega, a outra responde bem). A fórmula das duas notas fica para o fim da V1.

**Listas de palavras.** Akita monta as listas (carinho, desculpa, risada e o que as métricas usarem, em pt-BR e en). Luiz valida no final, quando o resto estiver pronto.

**WhatsApp + Telegram.** Juntar como uma conversa só. Não comparar um app contra o outro. A origem talvez não precise ser controlada.

**Nomes no prompt da IA.** Usar 2 nomes inventados (Ana Lima e Bruno Reis). Nunca os nomes reais do export.

**Rotas.** Confirmadas, com slugs em inglês: `/confirm`, `/processing`, `/report/{timeline,dashboard,actions}`.

**Fuso horário.** Telegram usa o fuso que vem no export. WhatsApp usa o fuso do navegador (`Intl`).

**Um app só ou grupo.** Se a pessoa subir um app só, pular a tela Confirmar. Se o export tiver mais de 2 autores, a pessoa escolhe 2 e o resto é ignorado.

**Intervalo de sessão.** São 6 h sem mensagem para começar uma conversa nova. Valor fixo no código, sem controle na tela.

**Links.** Tipo próprio (`kind: 'link'`). Entram nas estatísticas (quem manda mais link). Não contam como texto.

**Consentimento LGPD.** O texto é escrito pelo Akita. Rascunho em `docs/LGPD.md` e nas chaves `home.consent` (pt e en), à espera da revisão do Luiz.

**Primeira tela do relatório.** Abre na linha do tempo.

**Nome do repo.** `sintonia-app`. Onde a spec ainda diz `sintonia/`, ajustar o texto.

**Comparação de volume.** Usar os dois: equivalente a livros e equivalente a dias falando sem parar. Tudo sai da contagem de palavras.

**Performance (150 mil mensagens em menos de 5 s).** Um script gera a fixture fictícia uma vez (seed fixa) e a salva. Um teste lê essa fixture e mede o tempo do parser e das métricas. Roda à parte (`pnpm bench`), fora da CI de cada push.

**Lista de frequência (dicionário do casal).** Leipzig Corpora Collection, corpora `por_news_2024_30K` e `eng_news_2024_30K`. Licença **CC BY 4.0**, compatível com o MIT do repo desde que a atribuição fique no arquivo. Lista derivada (as 10 mil palavras mais frequentes de cada idioma) em `lib/lexicon/frequency/`; atribuição em `SOURCES.md`. Fontes em CC BY-SA 4.0 (wordfreq, OpenSubtitles/FrequencyWords) foram descartadas por causa do ShareAlike.

## Adiado

**Data ambígua (DD/MM vs MM/DD).** Vale ao carregar o export, não ao mudar o idioma. Por agora não resolvemos. Vamos olhar o formato real dos exports (idioma do celular, cabeçalhos, exemplos) e decidir com base nisso.

## Pendente, não bloqueia

**CI.** O workflow está em `ci/ci.yml`. Para ir para `.github/workflows/`, falta a permissão `workflow` no GitHub ou mover o arquivo pela interface. Não impede o desenvolvimento.

## Análise feita, confirmação no marco

**Bibliotecas.** Análise em `docs/BIBLIOTECAS.md` (16/11/2026): `fflate` sim; `motion` (não `framer-motion`) no marco de animação; `@react-pdf/renderer` e `html-to-image` só com lazy load; `visx` só se o gráfico feito à mão não bastar. Nenhuma foi instalada ainda. Confirmar de novo no marco de cada uma.

# Em aberto, para decidir junto (18/11/2026)

Tudo o que não dependia de decisão foi implementado: parsers, junção dos apps, as métricas da V1 e a ligação do Worker com as telas (benchmark: 150 mil mensagens em cerca de 2 s, meta de 5 s). O que ficou em dúvida está abaixo, com opções e a recomendação de cada item.

## 1. `.zip` do WhatsApp (bloqueia usuários de iPhone)

O iPhone sempre exporta em `.zip`. Hoje o app mostra o erro "Arquivos .zip ainda não são aceitos", porque a leitura depende do `fflate`.

- **A. Instalar o `fflate` agora (recomendado).** Já foi aprovado em `docs/BIBLIOTECAS.md` ("sim, no marco do parser"). Custa 12 KB gzip e o código fica pronto em poucas linhas no `lib/pipeline.ts`.
- **B. Deixar para depois da V1** e tirar `.zip` da lista de formatos aceitos. Quem usa iPhone teria de extrair o `.txt` sozinho.

## 2. `<Mídia oculta>` do WhatsApp Android

O Android não diz o tipo da mídia. Hoje ela conta como foto (`image`), o que infla "Fotos" e a "primeira foto".

- **A. Manter como foto.** Simples, mas os números de foto ficam errados.
- **B. Criar o tipo `media` (recomendado).** Não entra em foto, vídeo nem áudio, e conta só no total de mensagens. O iOS e o Telegram continuam com o tipo certo.
- **C. Tentar adivinhar** pelo horário e pelo contexto. Frágil.

## 3. Reações no "Top emojis"

Hoje o top conta só emojis escritos em mensagens de texto e de link. O WhatsApp não exporta reações; o Telegram pode exportar (campo `reactions`, a confirmar com um export real).

- **A. Deixar de fora na V1 (recomendado).** Combina com a decisão de não comparar um app contra o outro.
- **B. Somar às mensagens.** Quem usa Telegram pareceria usar mais emoji.
- **C. Métrica separada "reações"**, só quando houver Telegram. Pede um campo novo no modelo; fica para depois da V1.

## 4. Data ambígua (DD/MM × MM/DD)

O parser decide sozinho: um número acima de 12 define o dia; sem isso, vence o número que mais muda entre mensagens; empate vira DD/MM e o parser devolve o aviso `whatsapp:date-order-default` (a tela ainda não mostra esse aviso).

- **A. Manter a heurística, sem aviso na tela.** Acerta nos históricos longos.
- **B. Mostrar o aviso na tela Confirmar, com um botão "Trocar para MM/DD" (recomendado)**, só nos casos de empate.
- **C. Perguntar sempre.** Mais um passo para todo mundo.

## 5. Fases (picos e vales)

Valores iniciais: cada mês é comparado com os outros 12 meses ao redor; vira pico ou vale acima de 2 desvios e pelo menos 25% de diferença; no máximo 8 fases; o primeiro e o último mês ficam de fora (costumam ser parciais).

- **A. Sensível:** 1,5 desvio e 20%. Mais marcos na linha do tempo, com mais ruído.
- **B. Padrão (recomendado):** 2 desvios e 25%, como está.
- **C. Conservador:** 2,5 desvios e 40%. Só os eventos grandes.

Os valores são constantes no topo de `lib/metrics/phases.ts`. Vale ajustar com um export real.

## 6. Definições das métricas de conversa

Escolhi estas definições (estão nos comentários de cada arquivo em `lib/metrics/`). Confirmar ou trocar:

- **Sem resposta:** sessão em que só uma pessoa escreveu (conta para quem escreveu).
- **Mensagem dupla:** mensagem que vem logo depois de outra da mesma pessoa, dentro da sessão.
- **Tempo de resposta:** da última mensagem da outra pessoa até a primeira resposta, só dentro da mesma sessão (menos de 6 h).
- **Mais cedo e mais tarde:** o "dia" começa às 04:00. Mais tarde = a hora mais avançada na madrugada (03:20 vale mais que 23:00).
- **Sequência de bom dia e boa noite:** conta o dia se qualquer um dos dois escreveu o cumprimento (a sequência é do casal). A alternativa é exigir os dois, ou separar por pessoa.

Recomendação: manter como está.

## 7. Dicionário do casal

Regra atual: palavra de texto com pelo menos 3 letras, usada 5 vezes ou mais, que não está entre as 10 mil mais comuns do corpus (pt e en) e que não é risada. Top 10, mais usada primeiro.

- **A. Manter (recomendado)** e validar com dados reais.
- **B. Subir o mínimo para 10 usos** em históricos grandes, para tirar palavras de uma conversa só.

## 8. Prompt em inglês

O template está em pt, mas já tem `Responda em {{IDIOMA}}`: com o app em inglês, o prompt pede a resposta em inglês.

- **A. Manter só em pt (recomendado).** Funciona hoje e evita manter dois textos.
- **B. Traduzir o template** para a pessoa que lê o prompt antes de colar.

## 9. Mesmo nome nos dois apps, pessoas diferentes

Na tela Confirmar, cada nome tem um seletor (Pessoa A, Pessoa B ou ignorar). Isso resolve grupos com mais de 2 autores e erros de pareamento. O nome de exibição de cada pessoa é o mais usado entre os apps. Nada a decidir, só registrando a mudança em relação ao desenho antigo (botões "Trocar" e "Ignorar").

## Já pendentes (sem mudança)

- **Fórmulas de Sintonia e de Equilíbrio:** fim da V1. `balance.points` continua `null` e o prompt não pede nota.
- **CI:** mover `ci/ci.yml` para `.github/workflows/` (falta a permissão `workflow`).
- **Listas de palavras:** o Luiz valida no final.
