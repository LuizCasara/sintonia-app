# Contribuindo

## Regra de ouro

**Nunca commite dado real.** Nada de exports de WhatsApp/Telegram (`.txt`, `.zip`, `result.json`) fora de `fixtures/`. Só fixtures fictícias geradas por `pnpm fixtures`. Para testar com dados reais, use `data/real/` (ignorada pelo git).

## Comandos

`pnpm dev` · `pnpm build` · `pnpm lint` · `pnpm typecheck` · `pnpm test` · `pnpm test:e2e` (precisa de `pnpm build` antes) · `pnpm format` · `pnpm fixtures`

Sem Chromium do Playwright? Aponte `PW_CHROME_PATH` para um Chrome instalado.

## Pastas

- `app/[locale]/` — páginas (pt e en), site estático
- `components/` — componentes de tela (rodada 2)
- `lib/` — `model.ts` (tipos), `parsers/`, `merge.ts`, `metrics/`, `prompt.ts`, `demo.ts`, `lexicon/` (listas e frequência)
- `workers/` — `analyze.worker.ts` (roda tudo fora da thread da tela)
- `fixtures/` — gerador e conversas fictícias
- `messages/` — textos pt e en · `i18n/` — config do next-intl
- `docs/` — decisões registradas (`DECISOES.md`)
- `tests/unit` (Vitest) · `tests/e2e` (Playwright)

## Fluxo de dados

arquivo → `detectFormat` → parser (`parseWhatsApp` / `parseTelegram`) → `mergeChats` → `computeReport` → `Report` → telas

Tudo roda no navegador, dentro do worker. O código de `lib/` e `workers/` nunca faz requisição de rede (há um teste que garante isso).

## Onde estão os `TODO(Luiz)`

Rode `rg "TODO\(Luiz\)"`. Principais:

- `lib/parsers/whatsapp.ts` e `telegram.ts`: os parsers
- `lib/merge.ts`: `suggestPeople` e `mergeChats`
- `lib/metrics/*.ts`: uma métrica por arquivo (`lexicon.ts` reexporta `lib/lexicon/`; listas ainda são rascunho)
- `workers/analyze.worker.ts`: ligar as etapas

Decisões: `docs/DECISOES.md`. Ainda em aberto: `rg "DECISÃO EM ABERTO"` (fórmula das notas). Data ambígua está adiada. CI não bloqueia o desenvolvimento. Lista de frequência: `lib/lexicon/frequency/SOURCES.md`.

## Estilo

Código simples e legível. Comentários curtos em pt-BR, nomes em inglês.
