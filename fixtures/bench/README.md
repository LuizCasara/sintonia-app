# Fixture de benchmark (150 mil mensagens)

Dados **fictícios**, gerados com seed fixa `20261116`. Servem para medir a meta: processar 150 mil mensagens em menos de 5 segundos (parser + métricas).

## Comandos

- `pnpm bench:generate` — gera (ou regenera) os arquivos `.gz` e o `meta.json`. Mesma seed, mesma saída.
- `pnpm bench` — lê a fixture e imprime os tempos. **Não roda no `pnpm test`.**

Não coloque `pnpm bench` na CI de cada push: a fixture é grande e a medição varia de máquina para máquina.

## Arquivos

- `conversation.json.gz` — conversa já no modelo interno (para as métricas, sem depender do parser).
- `whatsapp-android-pt.txt.gz` e `telegram.json.gz` — exports para quando o parser existir.
- `meta.json` — seed, contagem, tamanhos e sha256.
- `baseline.json` — tempos de referência da primeira corrida (parsers ainda são stubs).
- `last-run.json` — último resultado desta máquina (ignorado pelo git; tempos variam).

Se algum `.gz` passar de 50 MB, ele **não entra no git**. Aí só o script e o `meta.json` ficam no repo; cada um gera a fixture localmente.

## Estado atual

Os parsers e as métricas ainda são stubs. O `pnpm bench` já mede o que existe e marca o que é stub. A meta de 5 s só passa a ser cobrada quando as implementações existirem.
