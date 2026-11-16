import type { Conversation } from '../model';

// Dicionário do casal: palavras frequentes no casal e raras num corpus comum.
// TODO(Luiz): implementar. Hoje devolve valores vazios.

// Só entra no prompt com consentimento (caixa marcada). Precisa de lista de frequência pt/en.
export interface DictionaryMetrics {
  topWords: string[]; // top 10
}

export function computeDictionary(conv: Conversation): DictionaryMetrics {
  void conv;
  return { topWords: [] };
}
