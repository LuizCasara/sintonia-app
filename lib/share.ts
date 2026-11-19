import type { Report } from './metrics';
import type { DictionaryMetrics } from './metrics/dictionary';

/** As listas de palavras (do casal e de cada pessoa) sem o que o usuário escondeu. */
export interface WordGroups {
  shared: string[];
  A: string[];
  B: string[];
}

export function wordGroups(
  dictionary: DictionaryMetrics | null,
  hidden: readonly string[] = [],
): WordGroups {
  const skip = new Set(hidden);
  const keep = (words: string[] | undefined) => (words ?? []).filter((w) => !skip.has(w));
  return {
    shared: keep(dictionary?.topWords),
    A: keep(dictionary?.own?.A), // relatórios antigos não têm as listas por pessoa
    B: keep(dictionary?.own?.B),
  };
}

/** Dicionário do casal sem as palavras que o usuário escondeu (é o que sai em qualquer compartilhamento). */
export function sharedDictionary(
  report: Report,
  hidden: readonly string[] = [],
): DictionaryMetrics | null {
  if (!report.dictionary) return null;
  if (hidden.length === 0) return report.dictionary;
  const groups = wordGroups(report.dictionary, hidden);
  const usage = report.dictionary.usage ?? {};
  const all = [...groups.shared, ...groups.A, ...groups.B];
  return {
    topWords: groups.shared,
    own: { A: groups.A, B: groups.B },
    usage: Object.fromEntries(all.flatMap((w) => (usage[w] ? [[w, usage[w]]] : []))),
  };
}

/** Quem diz mais a palavra: a pessoa A ou B, ou "both" se for parelho (até 60/40). */
export function wordOwner(usage: { A: number; B: number } | undefined): 'A' | 'B' | 'both' {
  if (!usage || usage.A + usage.B === 0) return 'both';
  const a = usage.A / (usage.A + usage.B);
  return a > 0.6 ? 'A' : a < 0.4 ? 'B' : 'both';
}
