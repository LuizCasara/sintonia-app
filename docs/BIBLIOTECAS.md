# Bibliotecas candidatas da V1

Análise de 16/11/2026 (America/Sao_Paulo). Nenhuma destas bibliotecas foi instalada no projeto neste passo: só entram no marco correspondente, depois desta leitura.

Critérios pedidos pelo Luiz: segurança, tamanho e manutenção.

## Resumo

| Biblioteca                             | Uso previsto                          | Segurança                                                                                                                                                                                                                               | Tamanho (min / gzip)                                                                           | Manutenção                                                                                                                               | Recomendação                                                                                                                                                                                    |
| -------------------------------------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@visx/*` (ex.: `@visx/xychart` 4.0.0) | gráficos do painel                    | Sem advisories no npm audit nem no OSV. MIT.                                                                                                                                                                                            | 152 KB / 50 KB o `xychart`; 16 deps diretas, pacote modular                                    | v4.0.0 em 11/06/2026. Último push em 22/06/2026. 161 issues abertas. Airbnb, 3 maintainers no npm.                                       | Usar só se um gráfico ficar difícil na mão. Importar o pacote mínimo, não o monorepo inteiro. O painel já tem gráficos próprios.                                                                |
| `motion` 14.14.0 (não `framer-motion`) | animação de tela                      | Sem advisories. MIT.                                                                                                                                                                                                                    | `motion`: 188 KB / 64 KB, 2 deps. `framer-motion` (mesmo autor, alias): 233 KB / 81 KB, 3 deps | Release 13/11/2026. 11 issues abertas. Commits no mesmo dia da análise. 2 maintainers.                                                   | Preferir o pacote `motion`, menor. Confirmar no marco de animação. Não é obrigatório para as telas de hoje.                                                                                     |
| `fflate` 0.8.3                         | abrir `.zip` do WhatsApp no navegador | Sem advisories. MIT. Zero dependências.                                                                                                                                                                                                 | 32 KB / 12 KB                                                                                  | v0.8.3 em 16/05/2026. 58 issues abertas. Um maintainer (101arrowz).                                                                      | Sim, no marco do parser. É a opção mais leve das cinco. Um único maintainer é o risco.                                                                                                          |
| `@react-pdf/renderer` 4.9.0            | baixar o relatório em PDF             | Sem advisories. MIT. Árvore larga (13 deps diretas, 14 pacotes `@react-pdf/*`).                                                                                                                                                         | 1,2 MB / 442 KB                                                                                | 4.9.0 em 27/08/2026. Repo ativo (commits em out–nov/2026). 369 issues abertas. Maintainer principal: diegomura.                          | Sim, **só com lazy load** no clique de "Baixar PDF". Não pode entrar no bundle inicial.                                                                                                         |
| `html-to-image` 1.11.13                | cards para stories                    | Sem advisories publicados no npm/OSV. MIT. Zero dependências. Há um report aberto de XSS ([issue 529](https://github.com/bubkoo/html-to-image/issues/529), desde 14/05/2025): `innerHTML` ao clonar `textarea`. Sem correção publicada. | 13 KB / 5 KB                                                                                   | Última versão no npm: 14/02/2025. O `master` teve commits em 15/11/2026 que ainda não viraram release. 187 issues abertas. 1 maintainer. | Sim, com ressalvas, e **lazy load**. Neste app os cards levam só números nossos, sem HTML de terceiros, então o XSS do `textarea` pesa pouco. Fixar a versão e rever o issue antes de instalar. |

## Detalhe por critério

### Segurança

Instalação isolada das 6 versões acima (fora deste repo), em 16/11/2026: `npm audit` com 0 vulnerabilidades (132 pacotes na árvore). Consulta ao [OSV](https://api.osv.dev/v1/querybatch): 0 registros.

O único ponto qualitativo é o issue 529 do `html-to-image`, ainda aberto e sem release. Não é uma advisory do npm. Não passar conteúdo de export (nem de `textarea`) por essa lib; só o card que nós desenhamos.

Nenhuma faz rede por conta própria de um jeito que quebre a regra "o processamento da conversa fica no navegador". PDF e imagem saem como download local. `html-to-image` lê o DOM e o CSS computado; em páginas nossas isso é aceitável.

### Tamanho

Números de [Bundlephobia](https://bundlephobia.com), consulta em 16/11/2026:

- `@visx/xychart@4.0.0`: 151 702 B min, 50 282 B gzip, 16 deps
- `motion@14.14.0`: 187 900 B min, 64 323 B gzip, 2 deps
- `framer-motion@14.14.0`: 232 879 B min, 80 826 B gzip, 3 deps
- `fflate@0.8.3`: 32 009 B min, 12 146 B gzip, 0 deps
- `@react-pdf/renderer@4.9.0`: 1 200 522 B min, 442 267 B gzip, 13 deps
- `html-to-image@1.11.13`: 13 452 B min, 5 266 B gzip, 0 deps

O PDF sozinho já passa de 400 KB gzip. Por isso o carregamento preguiçoso é condição, não um detalhe.

### Manutenção

Fontes: `npm view` (versão e data) e API do GitHub (push, release, issues), em 16/11/2026.

- `motion` é o mais vivo das cinco.
- `@react-pdf/renderer` e o repo `diegomura/react-pdf` também se mexem; o volume de issues é alto, típico de um projeto grande.
- `visx` e `fflate` tiveram release em 2026, mas o ritmo é mais espaçado.
- `html-to-image` está atrás no canal do npm (21 meses sem versão nova), ainda que o `master` tenha recebido commits ontem (15/11/2026).

## Fontes

- npm: `npm view <pacote> version license time maintainers`
- Bundlephobia: `https://bundlephobia.com/api/size?package=<pacote>`
- Audit: `npm audit` e `https://api.osv.dev/v1/querybatch` (16/11/2026)
- GitHub: `airbnb/visx`, `motiondivision/motion`, `101arrowz/fflate`, `diegomura/react-pdf`, `bubkoo/html-to-image`
- Issue de XSS: https://github.com/bubkoo/html-to-image/issues/529
