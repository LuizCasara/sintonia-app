import type { Conversation, ParsedChat, Source } from './model';

export interface PersonSuggestion {
  /** Nome em cada app que parece ser a mesma pessoa. */
  names: { source: Source; name: string; messageCount: number }[];
  /** 0 a 1; quanto maior, mais parecido. */
  score: number;
}

/** Distância de edição entre duas strings (quantas trocas/inserções/remoções). */
export function levenshtein(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min((prev[j] ?? 0) + 1, (row[j - 1] ?? 0) + 1, (prev[j - 1] ?? 0) + cost);
    }
    prev = row;
  }
  return prev[b.length] ?? 0;
}

/**
 * Sugere quais nomes (entre apps) são a mesma pessoa.
 * TODO(Luiz): comparar nomes com levenshtein (normalize: minúsculas, sem acento) + volume.
 */
export function suggestPeople(chats: ParsedChat[]): PersonSuggestion[] {
  void chats;
  return [];
}

/** mapping: nome no app → 'A' | 'B'. Quem não está no mapa vira 'other'. */
export type PersonMapping = Record<string, 'A' | 'B'>;

/**
 * Junta os chats numa Conversation só, ordenada por ts.
 * TODO(Luiz): aplicar o mapping, montar people/aliases, ordenar, preencher sources.
 */
export function mergeChats(chats: ParsedChat[], mapping: PersonMapping): Conversation {
  void chats;
  void mapping;
  throw new Error('TODO');
}
