import enFreq from '../lexicon/frequency/en.json';
import ptFreq from '../lexicon/frequency/pt.json';
import { foldLexeme } from '../lexicon';
import type { Conversation } from '../model';
import { talk } from './util';
import { WORD } from './volume';

// Dicionário do casal: palavras frequentes no casal e raras num corpus comum.
// Só entra no prompt com consentimento (caixa marcada).
// Lista de frequência: lib/lexicon/frequency/ (Leipzig, CC BY 4.0). Importar só no worker.
//
// Regra: palavra de texto que o casal usa pelo menos MIN_COUNT vezes e que NÃO está entre as
// 10 mil mais comuns do corpus (pt nem en). Ordem: mais usada primeiro. Top 10.

export interface DictionaryMetrics {
  topWords: string[]; // top 10
}

export const DICT_MIN_COUNT = 5;
export const DICT_MIN_LENGTH = 3;
const TOP = 10;

let common: Set<string> | undefined;
/** Palavras comuns, sem acento (pt e en juntos). Monta uma vez por worker. */
function commonWords(): Set<string> {
  if (!common) {
    common = new Set<string>();
    for (const [w] of [...ptFreq.words, ...enFreq.words]) common.add(foldLexeme(String(w)));
  }
  return common;
}

// Risadas escritas não são "palavras do casal".
const LAUGH_LIKE = /^(?:k{2,}|(?:ha|he|hu|ah|rs|ks){2,}h?|[a-z]*(?:ahah|uhuh)[a-z]*)$/;

export function computeDictionary(conv: Conversation): DictionaryMetrics {
  const known = commonWords();
  const counts = new Map<string, number>();
  for (const m of talk(conv)) {
    if (m.kind !== 'text' || !m.text) continue;
    for (const w of m.text.toLowerCase().match(WORD) ?? []) {
      if (w.length < DICT_MIN_LENGTH || /\d/.test(w)) continue;
      counts.set(w, (counts.get(w) ?? 0) + 1);
    }
  }
  const topWords = [...counts.entries()]
    .filter(([w, n]) => {
      const folded = foldLexeme(w);
      return n >= DICT_MIN_COUNT && !known.has(folded) && !LAUGH_LIKE.test(folded);
    })
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, TOP)
    .map(([w]) => w);
  return { topWords };
}
