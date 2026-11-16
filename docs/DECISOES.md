# Decisões — 16/11/2026

Registro das decisões do Luiz sobre a spec da V1. O que ainda falta ok ou análise fica no fim.

## Decidido

**Nota de Sintonia.** Só no fim da V1. Tirar do prompt da IA na V1.

**Equilíbrio vs Sintonia.** Ficam separados.

- Sintonia = fluidez da conversa: reciprocidade, tempo de resposta, tom.
- Equilíbrio = divisão do esforço: quem puxa assunto, volume, quem fecha.

Um casal pode ter sintonia alta e equilíbrio baixo (uma pessoa carrega, a outra responde bem). A fórmula das duas notas fica para o fim da V1.

**WhatsApp + Telegram.** Juntar como uma conversa só. Não comparar um app contra o outro. A origem talvez não precise ser controlada.

**Nomes no prompt da IA.** Usar 2 nomes inventados (Ana Lima e Bruno Reis). Nunca os nomes reais do export.

**Rotas.** Confirmadas, com slugs em inglês: `/confirm`, `/processing`, `/report/{timeline,dashboard,actions}`.

**Fuso horário.** Telegram usa o fuso que vem no export. WhatsApp usa o fuso do navegador (`Intl`).

**Links.** Tipo próprio (`kind: 'link'`). Entram nas estatísticas (quem manda mais link). Não contam como texto.

**Consentimento LGPD.** O texto é escrito pelo Akita.

**Primeira tela do relatório.** Abre na linha do tempo.

**Nome do repo.** `sintonia-app`. Onde a spec ainda diz `sintonia/`, ajustar o texto.

**Comparação de volume.** Pode ser no estilo livros, e também outras imagens (dias falando sem parar, cartas). A escolha do conjunto ainda está pendente.

## Pendente, aguardando ok

**Data ambígua (DD/MM vs MM/DD).** Vale ao carregar o export, não ao mudar o idioma. Proposta: escolher pela convenção do idioma do export; se todos os dias forem ≤ 12, mostrar 2 datas de exemplo e perguntar.

**Um app só ou grupo.** Proposta: se a pessoa subir um app só, pular a tela Confirmar. Se o export tiver mais de 2 autores, a pessoa escolhe 2 e o resto é ignorado.

**Intervalo de sessão.** São 6 h sem mensagem para começar uma conversa nova. Proposta: valor fixo no código, sem controle na tela.

**Performance (150 mil mensagens em menos de 5 s).** Proposta: um script gera a fixture e mede o tempo do parser e das métricas, fora da CI de cada push, para a CI continuar rápida.

**CI.** O workflow está em `ci/ci.yml`. Para ir para `.github/workflows/`, falta a permissão `workflow` no GitHub ou mover o arquivo pela interface.

## Pendente, análise

**Bibliotecas (visx, framer-motion/motion, fflate, react-pdf com lazy load, html-to-image).** Analisar cada uma por segurança, tamanho e manutenção, antes de confirmar no marco correspondente.

**Listas de palavras.** Carinho, desculpa e risada (pt e en) o próprio código pode trazer. O dicionário do casal precisa de uma lista pública de frequência de palavras, com licença livre. Fonte e licença ainda não escolhidas.
