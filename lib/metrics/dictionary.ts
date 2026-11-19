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
// Regra: palavra de texto que o casal usa pelo menos MIN_COUNT vezes, que as DUAS pessoas usam
// (cada uma ao menos MIN_EACH vezes: vício de digitação de uma só, como "oque", não é do casal), que
// NÃO está entre as 10 mil mais comuns do corpus (pt nem en) e não é gíria de internet comum.
// Ordem: mais usada primeiro. Top 10.

export interface DictionaryMetrics {
  topWords: string[]; // top 10
  /** Quantas vezes cada pessoa disse cada palavra do top. */
  usage: Record<string, { A: number; B: number }>;
}

export const DICT_MIN_COUNT = 5;
export const DICT_MIN_LENGTH = 3;
export const DICT_MIN_EACH = 3;

// Abreviações e gírias de chat: o corpus de frequência é formal e não as conhece.
const INFORMAL = new Set(
  [
    'tava',
    'tavam',
    'tamo',
    'tamos',
    'neh',
    'vcs',
    'tbm',
    'tmb',
    'tmbm',
    'blz',
    'mto',
    'mt',
    'mtt',
    'qro',
    'qr',
    'oq',
    'oque',
    'fds',
    'sdds',
    'obg',
    'vlw',
    'flw',
    'aff',
    'pqp',
    'pls',
    'plz',
    'thx',
    'gonna',
    'wanna',
    'gotta',
    'kinda',
    'lol',
    'omg',
    'idk',
    'tbh',
    'yeah',
    'yep',
    'nope',
    'cuz',
  ].map((w) => foldLexeme(w)),
);
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
  const counts = new Map<string, { A: number; B: number }>();
  for (const m of talk(conv)) {
    if (m.kind !== 'text' || !m.text) continue;
    for (const w of m.text.toLowerCase().match(WORD) ?? []) {
      if (w.length < DICT_MIN_LENGTH || /\d/.test(w)) continue;
      const c = counts.get(w) ?? { A: 0, B: 0 };
      c[m.authorId]++;
      counts.set(w, c);
    }
  }
  const top = [...counts.entries()]
    .map(([w, c]) => ({ w, c, n: c.A + c.B }))
    .filter(({ w, c, n }) => {
      const folded = foldLexeme(w);
      return (
        n >= DICT_MIN_COUNT &&
        c.A >= DICT_MIN_EACH &&
        c.B >= DICT_MIN_EACH &&
        !known.has(folded) &&
        !INFORMAL.has(folded) &&
        !LAUGH_LIKE.test(folded)
      );
    })
    .sort((a, b) => b.n - a.n || a.w.localeCompare(b.w))
    .slice(0, TOP);
  return {
    topWords: top.map(({ w }) => w),
    usage: Object.fromEntries(top.map(({ w, c }) => [w, c])),
  };
}
