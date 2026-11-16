# Lista de frequência — fonte e licença

Usada pelo dicionário do casal (palavras comuns vs. palavras típicas da conversa).

## Fonte escolhida

[Leipzig Corpora Collection](https://wortschatz.uni-leipzig.de/), Universität Leipzig, Sächsische Akademie der Wissenschaften zu Leipzig e InfAI.

- Português: `por_news_2024_30K` (notícias em português, 30 mil frases, gerado em 2025-02-12). Download: `https://downloads.wortschatz-leipzig.de/corpora/por_news_2024_30K.tar.gz`
- Inglês: `eng_news_2024_30K` (notícias em inglês, 30 mil frases, gerado em 2025-01-18). Download: `https://downloads.wortschatz-leipzig.de/corpora/eng_news_2024_30K.tar.gz`

Arquivo de origem em cada pacote: `*-words.txt` (coluna: id, palavra, frequência).

Citação pedida pelo projeto: D. Goldhahn, T. Eckart and U. Quasthoff (2012): Building Large Monolingual Dictionaries at the Leipzig Corpora Collection: From 100 to 200 Languages. In: Proceedings of the 8th International Language Resources and Evaluation Conference (LREC'12).

## Licença

Os corpora para download da Leipzig Corpora Collection são oferecidos sob **Creative Commons Attribution 4.0 (CC BY 4.0)**. Texto da licença: https://creativecommons.org/licenses/by/4.0/

CC BY 4.0 exige atribuição. Não tem cláusula ShareAlike, então os arquivos derivados podem viver neste repositório MIT, desde que a atribuição acima permaneça visível.

Baixado em 16/11/2026.

## O que mudamos

A partir de `*-words.txt`:

- descarta tokens sem nenhuma letra (pontuação, números puros);
- passa tudo para minúsculas e junta frequências da mesma forma;
- fica só com as 10 mil palavras mais frequentes de cada idioma.

Os JSON daqui (`pt.json`, `en.json`) são essa lista derivada e também estão sob CC BY 4.0, com a atribuição deste arquivo.

## Por que não outras fontes

- **wordfreq** (Robyn Speer) e **FrequencyWords / OpenSubtitles 2018**: os dados são **CC BY-SA 4.0**. A cláusula ShareAlike não combina bem com um repo só MIT: a lista derivada teria de continuar SA.
- Lista curta feita à mão: ficaria 100% MIT, mas seria fraca demais para o dicionário do casal.

## Limite

A base é de notícias, não de conversa informal. Serve como linha de "palavra comum da língua". Gíria, apelido e vício do casal devem aparecer como atípicos, que é o que o dicionário precisa. Não importar esses JSON na interface; só no worker das métricas.
