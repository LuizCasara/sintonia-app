<div align="center">

<img src="docs/assets/logo.svg" alt="Logo do Sintonia: duas ondas, ciano e magenta, que entram em fase" width="96" height="96" />

# Sintonia

**Veja o quanto vocês estão em sintonia.**

Envie o histórico de conversa do casal e descubra a história, os ritmos e os números de vocês dois.
Tudo roda no seu navegador. Nenhuma mensagem sai do seu aparelho.

![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white)
![pnpm](https://img.shields.io/badge/pnpm-10-F69220?logo=pnpm&logoColor=white)
![Privacidade](https://img.shields.io/badge/privacidade-100%25%20no%20navegador-b18cff)
![Idiomas](https://img.shields.io/badge/idiomas-pt--BR%20%7C%20en-22e5ff)
![Licença](https://img.shields.io/badge/licen%C3%A7a-MIT-a3ff5c)
![Status](https://img.shields.io/badge/status-V1%20em%20constru%C3%A7%C3%A3o-ff3dbd)

<img src="docs/assets/preview.png" alt="Pré-visualização do Sintonia" width="720" />

</div>

---

## Sumário

- [O que é](#o-que-é)
- [Como funciona para quem usa](#como-funciona-para-quem-usa)
- [O que o app mostra](#o-que-o-app-mostra)
- [Privacidade e LGPD](#privacidade-e-lgpd)
- [Como rodar](#como-rodar)
- [Scripts](#scripts)
- [Como funciona por dentro](#como-funciona-por-dentro)
- [Estrutura de pastas](#estrutura-de-pastas)
- [Testes](#testes)
- [Dados fictícios](#dados-fictícios)
- [Documentação](#documentação)
- [Status e roadmap](#status-e-roadmap)
- [Contribuindo](#contribuindo)
- [Licença](#licença)

## O que é

O Sintonia analisa exports de conversa de casal (WhatsApp e Telegram) e transforma o histórico em uma leitura da relação: uma linha do tempo com os marcos da jornada, um painel com ritmos e números, e notas que ajudam a enxergar como a conversa flui e como o esforço é dividido.

Não há cadastro, servidor de análise nem banco de dados. O site é estático e o processamento acontece no próprio navegador, dentro de um Web Worker.

## Como funciona para quem usa

O fluxo tem duas telas de entrada e três de resultado:

| Rota                | Tela        | O que faz                                                                                   |
| ------------------- | ----------- | ------------------------------------------------------------------------------------------- |
| `/`                 | Home        | Apresenta o app com prévias fictícias das telas e um botão para começar.                    |
| `/start`            | Começar     | Explica a privacidade, ensina a exportar a conversa, pede o consentimento e recebe o envio. Mostra as **sessões salvas** neste navegador, se houver. |
| `/confirm`          | Confirmar   | Só aparece quando o app precisa de ajuda para saber quem é quem. Dá para escolher o **nome que aparece no relatório**. |
| `/processing`       | Processando | Lê e analisa os arquivos no Worker, com o andamento real.                                   |
| `/report/timeline`  | Linha do tempo | Marcos da jornada, com leitura ao passar o mouse e ritmo de resposta por ano.            |
| `/report/dashboard` | Painel      | Notas, gráficos e detalhes de cada métrica.                                                 |
| `/report/actions`   | Ações       | PDF completo, cards para stories, salvar no navegador, copiar o prompt para uma IA e apagar tudo. |

Todas as rotas existem em português (`/pt/...`) e inglês (`/en/...`). Quem quer só espiar pode abrir a demonstração com dados fictícios, sem enviar nada.

### Como exportar a conversa

- **WhatsApp:** na conversa, menu ⋮ → Mais → Exportar conversa → Sem mídia. Envie o `.txt` ou o `.zip` (o app abre o `.zip` no navegador e lê só o texto de dentro).
- **Telegram Desktop:** menu ⋮ → Exportar histórico → formato JSON. Envie o `result.json`.

É possível enviar os dois apps juntos: o Sintonia junta tudo como uma conversa só, sem comparar um app contra o outro.

## O que o app mostra

- **Nota de Sintonia:** a fluidez da conversa, com três partes: reciprocidade (40%), tempo de resposta (40%) e tom (20%). Histórico curto demais não recebe nota.
- **Nota de Equilíbrio:** a divisão do esforço (quem puxa assunto, volume, quem fecha). As duas notas são separadas de propósito: um casal pode ter sintonia alta e equilíbrio baixo.
- **Linha do tempo:** primeira mensagem, picos e vales de atividade, fases da relação e o tempo de conversa em cada marco.
- **Ritmos:** horários do dia, sequências de dias seguidos, sessões de conversa e tempo de resposta (com a evolução por ano).
- **Tempo de conversa:** quanto tempo e quantos dias tiveram mensagem, a maior sequência e a maior pausa.
- **Em livros:** as palavras de vocês viram livros de Harry Potter (contagens reais das edições originais).
- **Palavras:** carinho, desculpas, risadas e as palavras só dos dois, na cor de quem mais diz cada uma, com a contagem. Cada palavra tem um olho para esconder do que for compartilhado.
- **Textos dos marcos:** cada cartão da linha do tempo diz quem falou mais no mês, o que veio depois e quanto tempo de conversa já havia.

### O que dá para levar

- **PDF:** relatório completo e colorido, feito pela impressão do navegador (“Salvar como PDF”): capa com a marca, destaques, notas com barras, volume mês a mês, a linha do tempo inteira, horários em mapa de calor, livros e palavras. Dá para trocar o idioma antes de gerar.
- **Cards para stories:** 6 imagens 1080×1920 desenhadas num `<canvas>`, só com números.
- **Salvar no navegador:** guarda o relatório (números e datas, nunca as mensagens) no IndexedDB, com um cookie `sintonia_id` (uuid) de 400 dias. Na tela `/start` aparecem as “Sessões salvas”, que reabrem o relatório sem reenviar os arquivos.
- **Prompt para IA:** um texto pronto, com nomes inventados no lugar dos reais, para colar na IA de sua preferência.

> As fórmulas das notas estão implementadas ([docs/DECISOES.md](docs/DECISOES.md)). Falta calibrar duas constantes (`RECIPROCITY_CEIL` e `TONE_CAP`, em `lib/metrics/sintonia.ts`) com exports reais.

## Privacidade e LGPD

- Tudo acontece no navegador. Nenhuma mensagem, nome ou arquivo é enviado a um servidor.
- Por padrão, fechar ou recarregar a aba apaga tudo. Só é guardado algo se a pessoa clicar em **Salvar neste navegador**: aí o relatório (só números e datas) vai para o IndexedDB e um cookie com um uuid identifica o navegador. “Apagar tudo” remove isso também.
- O envio de arquivos só é liberado depois que a pessoa declara que tem o direito de analisar a conversa, com o acordo da outra pessoa.
- O código de `lib/` e `workers/` nunca faz requisição de rede, e há um teste que garante isso.

O texto do termo de consentimento ainda é um **rascunho para revisão**: [docs/LGPD.md](docs/LGPD.md).

## Como rodar

Pré-requisitos: **Node 22 ou mais novo** e **pnpm 10** (o `packageManager` do projeto fixa a versão).

```bash
pnpm install
pnpm dev
```

Abra <http://localhost:3000>. A rota raiz leva para o idioma padrão (português).

Defina `NEXT_PUBLIC_SITE_URL` (o endereço público do site, por exemplo `https://sintonia.exemplo.com`) no ambiente de build. Ela monta os links absolutos da imagem de compartilhamento (Open Graph); sem ela o padrão é `http://localhost:3000`.

Para gerar o site estático (pasta `out/`):

```bash
pnpm build
```

## Scripts

| Comando                | O que faz                                                                  |
| ---------------------- | -------------------------------------------------------------------------- |
| `pnpm dev`             | Servidor de desenvolvimento.                                               |
| `pnpm build`           | Gera o site estático em `out/`.                                            |
| `pnpm lint`            | ESLint.                                                                    |
| `pnpm typecheck`       | TypeScript sem emitir arquivos.                                            |
| `pnpm test`            | Testes unitários (Vitest).                                                 |
| `pnpm test:e2e`        | Testes de ponta a ponta (Playwright). **Precisa de `pnpm build` antes.**   |
| `pnpm format`          | Prettier.                                                                  |
| `pnpm fixtures`        | Gera as conversas fictícias de `fixtures/`.                                |
| `pnpm bench:generate`  | Gera a fixture grande de benchmark.                                        |
| `pnpm bench`           | Benchmark com 150 mil mensagens (fora do `pnpm test`).                     |
| `node scripts/brand.mjs` | Regenera o ícone (`app/icon.svg`, `favicon.ico`, `apple-icon.png`) e as imagens de compartilhamento (`public/og/`). Precisa de Chrome e de rede (fontes). |

## Como funciona por dentro

```text
arquivo → detectFormat → parser (parseWhatsApp / parseTelegram) → mergeChats → computeReport → Report → telas
```

1. **Detecção:** `detectFormat` olha só os primeiros 4 KB do arquivo para reconhecer WhatsApp (Android ou iPhone) ou Telegram. Um `.zip` é aberto antes (com [fflate](https://github.com/101arrowz/fflate)), e só os `.txt` e `.json` de dentro são lidos.
2. **Parsers:** transformam cada formato no modelo comum de `lib/model.ts`.
3. **Junção:** `mergeChats` junta vários arquivos e apps em uma conversa só; `suggestPeople` sugere quem é quem.
4. **Métricas:** `computeReport` calcula uma métrica por arquivo em `lib/metrics/`.
5. **Telas:** o `ReportProvider` guarda o relatório em memória e as telas só leem dele. As ações (PDF, stories, salvar) também só leem o relatório.

Tudo isso roda em um Web Worker (comunicação via [Comlink](https://github.com/GoogleChromeLabs/comlink)), para não travar a interface.

**Stack:** Next.js (App Router, export estático), React, TypeScript, Tailwind CSS 4 e next-intl para os idiomas. Os gráficos são próprios, em SVG, e os cards para stories são desenhados em `<canvas>`.

**Convenção de componentes:** tudo é Server Component por padrão. O `"use client"` fica só nas folhas que precisam de estado, eventos ou APIs do navegador (por exemplo, o `UploadPanel`).

## Estrutura de pastas

```text
app/[locale]/     páginas (pt e en), site estático
components/       telas e peças visuais (home, start, confirm, processing, timeline, dashboard, share, fx, shell)
lib/              model, parsers, merge, metrics, prompt, demo, lexicon, pipeline, books, span, stories, saved, share, rename
workers/          analyze.worker.ts: roda tudo fora da thread da tela
public/og/        imagens de compartilhamento (pt e en)
scripts/          brand.mjs (ícone e imagens de compartilhamento) e bench.ts
fixtures/         gerador, conversas fictícias e fixture de benchmark
messages/         textos em pt e en (next-intl)
i18n/             configuração de rotas e idiomas
docs/             decisões, bibliotecas e termo LGPD
tests/            unit (Vitest) e e2e (Playwright)
```

## Testes

```bash
pnpm test         # unitários
pnpm build && pnpm test:e2e
```

Os testes e2e servem a pasta `out/` na porta 3100, por isso o `pnpm build` vem antes. Se a 3100 estiver ocupada, use `PW_PORT=3187`. Sem o Chromium do Playwright instalado, aponte `PW_CHROME_PATH` para um Chrome que você já tenha.

## Dados fictícios

Este repositório só tem dados fictícios, gerados por script (`pnpm fixtures`). **Nunca faça commit de um export real.** Para testar com uma conversa de verdade, use `data/real/`, que o git ignora.

## Documentação

| Arquivo                                  | Conteúdo                                                  |
| ---------------------------------------- | --------------------------------------------------------- |
| [docs/DECISOES.md](docs/DECISOES.md)     | Decisões da V1 e dúvidas em aberto, com opções.           |
| [docs/BIBLIOTECAS.md](docs/BIBLIOTECAS.md) | Bibliotecas candidatas, com segurança, tamanho e manutenção. |
| [docs/LGPD.md](docs/LGPD.md)             | Rascunho do termo de consentimento.                       |
| [CONTRIBUTING.md](CONTRIBUTING.md)       | Regras, pastas e onde ficam os `TODO(Luiz)`.              |

## Status e roadmap

Versão **V1, em construção**.

- [x] Parsers de WhatsApp e Telegram
- [x] Junção de apps e métricas da V1
- [x] Pipeline real no Worker, telas Confirmar e Processando
- [x] Linha do tempo e painel
- [x] Home com prévias e tela Começar separada
- [x] Notas de Sintonia e Equilíbrio, evolução de resposta por ano e textos ricos nos marcos
- [x] Painel com tempo de conversa, livros de Harry Potter e palavras só de vocês
- [x] Leitura de `.zip` do WhatsApp
- [x] Relatório em PDF, cards para stories e sessões salvas no navegador
- [x] Favicon e imagem de compartilhamento
- [ ] Calibrar `RECIPROCITY_CEIL` e `TONE_CAP` com exports reais
- [ ] Definir o domínio público (`NEXT_PUBLIC_SITE_URL`)
- [ ] Revisão jurídica do termo de consentimento
- [ ] Revisão das listas de palavras (pt-BR e en)

## Contribuindo

Leia o [CONTRIBUTING.md](CONTRIBUTING.md). A regra de ouro: nunca commite dado real.

## Licença

[MIT](LICENSE).
