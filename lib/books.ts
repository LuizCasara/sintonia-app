// Palavras em livros: quantos livros de Harry Potter cabem no que o casal escreveu.
// Contagens das edições originais em inglês (a tradução muda um pouco). Ordem de leitura.

export const HARRY_POTTER_WORDS = [
  76_944, // 1. A Pedra Filosofal
  85_141, // 2. A Câmara Secreta
  107_253, // 3. O Prisioneiro de Azkaban
  190_637, // 4. O Cálice de Fogo
  257_045, // 5. A Ordem da Fênix
  168_923, // 6. O Enigma do Príncipe
  198_227, // 7. As Relíquias da Morte
] as const;

export const HARRY_POTTER_TOTAL = HARRY_POTTER_WORDS.reduce((sum, w) => sum + w, 0);

export interface BookProgress {
  /** Livros completos na ordem de leitura (0 a 7). */
  full: number;
  /** Quantas vezes a série inteira coube nas palavras (0,67 = dois terços). */
  times: number;
  /** Índice (0 a 6) do livro em andamento e quanto dele já foi (0 a 1). */
  current: { index: number; fraction: number };
  /** Palavras que faltam para fechar o livro em andamento. */
  missing: number;
}

/** Em que ponto da série as palavras chegam, lendo os livros em ordem (e recomeçando a série). */
export function bookProgress(words: number): BookProgress {
  const safe = Math.max(0, Math.floor(words));
  const times = safe / HARRY_POTTER_TOTAL;
  const rest = safe % HARRY_POTTER_TOTAL; // sobra depois das séries inteiras
  let left = rest;
  let index = 0;
  while (index < HARRY_POTTER_WORDS.length - 1 && left >= HARRY_POTTER_WORDS[index]!) {
    left -= HARRY_POTTER_WORDS[index]!;
    index++;
  }
  const size = HARRY_POTTER_WORDS[index]!;
  const full = safe >= HARRY_POTTER_TOTAL ? 7 : index;
  return { full, times, current: { index, fraction: left / size }, missing: size - left };
}
