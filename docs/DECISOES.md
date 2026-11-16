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

**Consentimento LGPD.** O texto é escrito pelo Akita.

**Primeira tela do relatório.** Abre na linha do tempo.

**Nome do repo.** `sintonia-app`. Onde a spec ainda diz `sintonia/`, ajustar o texto.

**Comparação de volume.** Usar os dois: equivalente a livros e equivalente a dias falando sem parar. Tudo sai da contagem de palavras.

**Performance (150 mil mensagens em menos de 5 s).** Um script gera a fixture fictícia uma vez (seed fixa) e a salva. Um teste lê essa fixture e mede o tempo do parser e das métricas. Roda à parte (`pnpm bench`), fora da CI de cada push.

**Lista de frequência (dicionário do casal).** Leipzig Corpora Collection, corpora `por_news_2024_30K` e `eng_news_2024_30K`. Licença **CC BY 4.0**, compatível com o MIT do repo desde que a atribuição fique no arquivo. Lista derivada (as 10 mil palavras mais frequentes de cada idioma) em `lib/lexicon/frequency/`; atribuição em `SOURCES.md`. Fontes em CC BY-SA 4.0 (wordfreq, OpenSubtitles/FrequencyWords) foram descartadas por causa do ShareAlike.

## Adiado

**Data ambígua (DD/MM vs MM/DD).** Vale ao carregar o export, não ao mudar o idioma. Por agora não resolvemos. Vamos olhar o formato real dos exports (idioma do celular, cabeçalhos, exemplos) e decidir com base nisso.

## Pendente, não bloqueia

**CI.** O workflow está em `ci/ci.yml`. Para ir para `.github/workflows/`, falta a permissão `workflow` no GitHub ou mover o arquivo pela interface. Não impede o desenvolvimento.

## Pendente, análise

**Bibliotecas (visx, framer-motion/motion, fflate, react-pdf com lazy load, html-to-image).** Analisar cada uma por segurança, tamanho e manutenção, antes de confirmar no marco correspondente.
