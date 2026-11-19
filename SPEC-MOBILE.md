# SPEC: Sintonia nativo (iOS e Android com Expo)

> Status: **rascunho / análise inicial**. Nada aqui foi implementado ainda.
> Data da análise: 19/11/2026. Branch de origem: `feat/polimento`.

## 1. Objetivo

Transformar o Sintonia (hoje um site estático Next.js que processa tudo no navegador) em um app nativo para iOS e Android, usando Expo, publicado nas duas lojas. Reaproveitar o máximo possível do código atual, mantendo a promessa central: **nenhuma mensagem sai do aparelho**.

### Fora do escopo (v1 mobile)

- Backend, contas, sincronização na nuvem.
- Partículas e animações decorativas (`components/fx`), a não ser que sobre tempo.
- Paridade pixel a pixel com o web.

## 2. Resumo da avaliação

**Dificuldade geral: 6/10.** Viável. O núcleo de lógica reaproveita quase tudo; o custo está em reescrever a UI e em quatro pontos de plataforma (worker, recebimento de arquivo, stories/PDF, armazenamento).

| Etapa | Nota (0 a 10) |
|---|---|
| Extrair `packages/core` e montar o monorepo | 3 |
| Compatibilidade do Hermes e performance da análise (sem worker) | 5 |
| Reescrever a UI (telas, gráficos, timeline) | 6 |
| Share intent, PDF, stories e salvamento | 5 |
| Publicação nas duas lojas | 4 |
| **Total** | **6** |

Estimativa grosseira: 2 a 3 meses de trabalho parcial para uma v1 enxuta. É palpite, a ser refinado depois do spike.

## 3. Descobertas sobre o código atual

Levantamento feito em 19/11/2026.

### 3.1 Tamanho e portabilidade

| Pasta | Linhas (ts/tsx) | Portável? |
|---|---|---|
| `lib/` | ~3.240 | Sim, quase tudo. Só `saved.ts` e `stories.ts` usam APIs de browser. |
| `components/` | ~4.960 | Não. JSX com DOM e Tailwind; precisa ser reescrito. A lógica de hooks e modelos (ex.: `useTimelineModel.ts`, `scoreRows.ts`) é aproveitável. |
| `app/` | ~160 | Rotas Next; trocam por `expo-router`. |
| `workers/` | ~30 | Wrapper fino sobre `lib/pipeline`; não existe no RN. |
| `messages/` | pt.json, en.json | Reaproveitável como dado, mas `next-intl` não roda fora do Next. |

Subpastas de `lib/`: `parsers/` (detect, telegram, whatsapp), `metrics/` (18 módulos), `lexicon/`, além de `pipeline.ts`, `merge.ts`, `model.ts`, `span.ts`, `books.ts`, `prompt*.ts`, `rename.ts`, `share.ts`.

### 3.2 Dependências atuais

Runtime: `comlink`, `fflate`, `next`, `next-intl`, `react`, `react-dom`. Todo o resto é dev (Tailwind 4, vitest, playwright, eslint, prettier, tsx).

Implicações:
- `fflate` é JS puro e deve funcionar no Hermes.
- `comlink` só existe por causa do Worker; sai no mobile.
- `next-intl` precisa de substituto; as mensagens em JSON ficam.
- Não há biblioteca de gráficos ou de PDF: os gráficos são SVG próprio (`components/dashboard/charts.tsx`), o PDF usa `window.print()` e os stories usam `<canvas>`.

### 3.3 Pontos de contato com APIs do navegador

| Arquivo | Uso | Substituto no mobile |
|---|---|---|
| `workers/analyze.worker.ts` + `lib/worker-client.ts` | Web Worker + Comlink | Rodar `inspect`/`analyze` na thread JS em fatias, ou thread separada (ver §5) |
| `lib/saved.ts` | `localStorage`, `indexedDB`, `document.cookie` (migração de cookie legado) | `expo-sqlite` ou `expo-file-system`; a migração de cookie não se aplica |
| `lib/stories.ts` | `document.createElement('canvas')`, `getComputedStyle`, download via `<a>` | `@shopify/react-native-skia` ou `react-native-view-shot` + `expo-sharing` |
| `components/share/ActionsView.tsx` | `window.print()` | `expo-print` |
| `components/share/StoryViewer.tsx` | `navigator.share({ files })` | `expo-sharing` |
| `components/share/PrintReport.tsx` | Relatório HTML/React para impressão (~36 KB) | Gerar HTML estático e passar ao `expo-print` |
| `components/fx/Particles.tsx` | Animação em canvas/DOM | Cortar da v1 ou refazer em Skia |

### 3.4 Observações sobre o worker

`workers/analyze.worker.ts` expõe só `inspect(files)` e `analyze(files, mapping, onProgress)`, ambos delegando a `lib/pipeline`. O contrato é simples, o que facilita criar um "runner" alternativo (mesma assinatura, sem Worker). O worker também abre `.zip` com `fflate` e lê apenas `.txt` e `.json` de dentro.

## 4. Estratégia de repositório

**Decisão proposta: monorepo no mesmo repositório** (pnpm workspaces), não um repo isolado.

Motivo: o core vai evoluir junto com os dois apps. Com dois repos, cada ajuste de métrica exigiria publicar pacote ou usar submodule.

```
sintonia/
  apps/web/            (o Next atual, movido)
  apps/mobile/         (Expo + expo-router)
  packages/core/       (lib/*, messages, tests/unit)
  packages/ui-tokens/  (cores e espaçamentos; opcional)
```

Cuidados conhecidos:
- Metro (Expo SDK 52+) entende monorepo; o risco é o pnpm com hoisting. Provavelmente será preciso `node-linker=hoisted` ou validar a instalação isolada na versão do SDK usada.
- Web e mobile precisam concordar na versão do React; o Expo fixa a do React Native.
- Fazer a extração do `packages/core` **só depois de fechar `feat/polimento`** (há muitas mudanças não commitadas; mover arquivos agora geraria conflito).
- Ordem segura: (1) extrair o core com o web funcionando e os testes verdes; (2) só então criar `apps/mobile`.

### Alternativa descartada como produto final: Capacitor

O site já é estático (`out/`), então dá para empacotar com Capacitor (esforço ~3/10; worker e canvas funcionam no WebView). Riscos: reprovação da Apple por "app que é só um site" (diretriz 4.2), experiência inferior, e o problema do share sheet continua. Pode servir como validação rápida de loja, mas não como destino.

## 5. Riscos e incógnitas

Ordenados por impacto.

1. **Memória e tempo de análise sem worker.** Exports de WhatsApp podem ter dezenas ou centenas de MB. O Hermes pode estourar memória ou travar a UI. Opções: fatiar o trabalho com `await` entre fatias; `react-native-worklets` ou similar para thread separada (mais complexo).
2. **Receber o arquivo de dentro do WhatsApp/Telegram.** O fluxo natural no celular é "Exportar conversa → Sintonia" pelo share sheet. Exige share extension (iOS) e intent filter (Android), via `expo-share-intent` ou config plugin próprio, e portanto dev build (não roda no Expo Go). Plano B: `expo-document-picker`.
3. **Compatibilidade do Hermes com os parsers.** A verificar: `TextDecoder` e encodings usados, `Intl` e formatação de datas por locale, regex com lookbehind ou `\p{…}`, `fflate` com buffers grandes, `structuredClone`, `Array.prototype.at` e afins.
4. **Stories (canvas → Skia).** Reescrita real, não adaptação.
5. **Regras das lojas.**
   - Apple: US$ 99/ano, ícones, screenshots, política de privacidade, App Privacy labels.
   - Google Play: US$ 25 (taxa única). Contas pessoais novas costumam exigir um período de teste fechado com número mínimo de testadores antes da produção; **confirmar a regra vigente** antes de montar o cronograma.
6. **Divergência de versões do React/pnpm no monorepo** (ver §4).

## 6. Spike

### 6.1 Propósito

Responder, em 1 a 2 dias e com o mínimo de código, se o núcleo atual roda de forma aceitável no Hermes, sem Worker, com dados reais. O resultado decide se seguimos para o monorepo e a reescrita de UI, ou se mudamos de estratégia.

### 6.2 O que queremos saber (perguntas e critérios)

| # | Pergunta | Como medir | Critério de sucesso |
|---|---|---|---|
| Q1 | `lib/pipeline` (`inspect` e `analyze`) roda no Hermes sem alterações? | Importar `lib/pipeline` num app Expo e rodar com fixture pequena | Mesmo `Report` que o Node/vitest gera (comparar JSON) |
| Q2 | Quais APIs faltam ou se comportam diferente no Hermes? | Rodar a suíte `tests/unit` de parsers, metrics e pipeline dentro do app (ou rodar as fixtures e diffar contra o resultado do Node) | Lista fechada de incompatibilidades; idealmente zero |
| Q3 | Qual o tempo e o pico de memória com exports grandes? | Usar `fixtures/generator` e `bench:generate` (ex.: 10 MB, 50 MB, 200 MB) em aparelho físico médio, iOS e Android | A definir com o dono: sugestão inicial é até 50 MB em < 30 s sem estourar memória; 200 MB sem crash |
| Q4 | A UI trava durante a análise? | Contador animado na tela durante o `analyze`; medir frames perdidos | Sem congelamento perceptível com fatiamento; se travar, avaliar worklets |
| Q5 | Dá para fatiar o trabalho (yield) sem reescrever o pipeline? | Inspecionar onde `lib/pipeline` itera e se `onProgress` permite pontos de yield | Mudança pequena e localizada |
| Q6 | O `.zip` do export abre e lê bem? | Abrir zip real do WhatsApp via `expo-document-picker` + `expo-file-system` + `fflate` | Funciona com zip de >50 MB sem estourar memória |
| Q7 | O share sheet entrega o arquivo ao app? | Dev build com `expo-share-intent` em iOS e Android, exportando uma conversa real do WhatsApp e do Telegram | Arquivo chega ao app nos dois sistemas; anotar limitações (iOS exige extension) |
| Q8 | O monorepo com pnpm funciona com Metro e Next ao mesmo tempo? | Mover `lib/` para `packages/core` em branch de teste e importar nos dois apps | Os dois apps compilam; testes do core continuam verdes |
| Q9 | Como fica o PDF e o story? | Prova de conceito curta: `expo-print` com HTML do `PrintReport` e um story simples em Skia | Gera um PDF legível e uma imagem compartilhável; estimar o custo do restante |

Prioridade: Q1, Q2, Q3 e Q4 são os **bloqueadores**. Q6 e Q7 vêm em seguida. Q8 e Q9 podem ser deixadas para a fase seguinte se as primeiras passarem.

### 6.3 Escopo mínimo do spike

- Um app Expo descartável (`spike-mobile/`, fora do código de produção), com uma única tela.
- Um botão "escolher arquivo", que lê o arquivo, chama `inspect` e `analyze` direto de `lib/pipeline` e mostra: tempo gasto, pico de memória aproximado, número de mensagens e o JSON do `Report` (ou um hash dele).
- Importação do `lib/` por caminho relativo ou cópia temporária; a extração formal para `packages/core` **não** faz parte do spike (é a Q8, opcional).
- Rodar em um iPhone e um Android reais, de gama média ou baixa (o pior caso importa mais).

### 6.4 Fora do escopo do spike

UI final, i18n, gráficos, timeline, publicação, ícones, `expo-router` completo.

### 6.5 Entregável

Um relatório curto (pode ser uma seção neste arquivo) com:
- Respostas de Q1 a Q9, com números medidos.
- Lista de incompatibilidades do Hermes e como contornar.
- Decisão: **seguir com Expo nativo**, **seguir com Capacitor como ponte** ou **abortar**.
- Estimativa revisada de esforço.

## 7. Plano proposto após o spike (se aprovado)

1. Fechar e mergear `feat/polimento`.
2. Converter para monorepo pnpm e extrair `packages/core`, com testes verdes e o web intacto.
3. Criar `apps/mobile` (Expo, `expo-router`, i18n com as mesmas mensagens).
4. Implementar o fluxo mínimo: receber arquivo → confirmar quem é quem → processar → dashboard.
5. Timeline, sessões salvas, PDF, stories e compartilhamento.
6. Dev build com share intent, TestFlight e teste fechado no Google Play.
7. Publicação nas duas lojas (EAS Build e Submit, integrando ao CI existente).

## 8. Decisões em aberto

- Limite de tamanho de export que queremos suportar no mobile.
- Aceitamos cortar partículas e simplificar os stories na v1?
- Qual biblioteca de i18n (i18next ou react-intl) para consumir `messages/*.json`.
- `expo-sqlite` ou arquivos para as sessões salvas?
- Conta de desenvolvedor: pessoal ou organização (afeta as regras do Google Play).
