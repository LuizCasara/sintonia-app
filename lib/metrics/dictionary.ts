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
// Ordem: mais usada primeiro.
//
// Além das palavras do casal (top 5), cada pessoa tem as suas: palavras que quase só ela diz
// (ao menos OWN_MIN_COUNT vezes e OWN_SHARE do total), fora das do casal. Top 5 de cada uma.

export interface DictionaryMetrics {
  /** As palavras do casal: usadas pelas duas pessoas (top 5). */
  topWords: string[];
  /** As palavras que quase só uma das pessoas usa (top 5 de cada). */
  own: { A: string[]; B: string[] };
  /** Quantas vezes cada pessoa disse cada palavra das listas acima. */
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
    // interjeições
    'uhum',
    'hum',
    'hmm',
    'hmmm',
    'hm',
    'ahn',
    'aham',
    'uhu',
    'etc',
    'iai',
    'noa',
    'naum',
  ].map((w) => foldLexeme(w)),
);
const TOP = 5;
export const OWN_MIN_COUNT = 8;
export const OWN_SHARE = 0.8;

let common: Set<string> | undefined;
/** Palavras comuns, sem acento (pt e en juntos). Monta uma vez por worker. */
function commonWords(): Set<string> {
  if (!common) {
    common = new Set<string>();
    for (const [w] of [...ptFreq.words, ...enFreq.words]) common.add(foldLexeme(String(w)));
  }
  return common;
}

/** Uma letra a mais, a menos, trocada ou duas letras invertidas. */
function oneEditApart(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  if (i === a.length && i === b.length) return false;
  const rest = (x: string, y: string) => x.slice(i) === y.slice(i);
  if (a.length === b.length) {
    return (
      rest(a.slice(0, i) + b[i], b) ||
      (a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2))
    );
  }
  return a.length > b.length ? a.slice(i + 1) === b.slice(i) : b.slice(i + 1) === a.slice(i);
}

/** "qndo" é "quando" sem vogais: as mesmas letras, na ordem, com a mesma primeira e última. */
function isAbbreviation(short: string, long: string): boolean {
  if (long.length <= short.length || long.length - short.length > 3) return false;
  if (short[0] !== long[0] || short.at(-1) !== long.at(-1)) return false;
  let at = 0;
  for (const ch of long) if (ch === short[at]) at++;
  return at === short.length;
}

/** Vício de digitação de uma pessoa (abreviação ou letra a mais/a menos de uma palavra comum). */
function looksLikeTypingVariant(folded: string, known: Set<string>): boolean {
  // Sem vogais ("zrg"), três consoantes seguidas ("qndo", "esqci") ou vogal repetida ("huum").
  if (!/[aeiou]/.test(folded) || /[^aeiou\W\d_]{3}/.test(folded) || /(?:aa|ii|uu)/.test(folded)) {
    return true;
  }
  if (folded.length < 3) return false;
  for (const c of known) {
    if (c.length < 3 || c[0] !== folded[0]) continue;
    // Palavras curtas são parecidas com muita coisa: só a abreviação conta para elas.
    if (isAbbreviation(folded, c) || (folded.length >= 4 && oneEditApart(folded, c))) return true;
  }
  return false;
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
  const candidates = [...counts.entries()]
    .map(([w, c]) => ({ w, c, n: c.A + c.B }))
    .filter(({ w, n }) => {
      const folded = foldLexeme(w);
      return (
        n >= DICT_MIN_COUNT &&
        !known.has(folded) &&
        !INFORMAL.has(folded) &&
        !LAUGH_LIKE.test(folded)
      );
    })
    .sort((a, b) => b.n - a.n || a.w.localeCompare(b.w));

  const shared = candidates
    .filter(({ c }) => c.A >= DICT_MIN_EACH && c.B >= DICT_MIN_EACH)
    .slice(0, TOP);
  const taken = new Set(shared.map(({ w }) => w));
  // Só dela(e): quase tudo é dessa pessoa. Ordena pela contagem da própria pessoa.
  const ownOf = (who: 'A' | 'B') =>
    candidates
      .filter(
        ({ w, c, n }) =>
          !taken.has(w) &&
          c[who] >= OWN_MIN_COUNT &&
          c[who] / n >= OWN_SHARE &&
          !looksLikeTypingVariant(foldLexeme(w), known),
      )
      .sort((x, y) => y.c[who] - x.c[who] || x.w.localeCompare(y.w))
      .slice(0, TOP);
  const ownA = ownOf('A');
  const ownB = ownOf('B');
  const shown = [...shared, ...ownA, ...ownB];
  return {
    topWords: shared.map(({ w }) => w),
    own: { A: ownA.map(({ w }) => w), B: ownB.map(({ w }) => w) },
    usage: Object.fromEntries(shown.map(({ w, c }) => [w, c])),
  };
}
