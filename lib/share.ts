import type { Report } from './metrics';
import type { DictionaryMetrics } from './metrics/dictionary';

/** Dicionário do casal sem as palavras que o usuário escondeu (é o que sai em qualquer compartilhamento). */
export function sharedDictionary(
  report: Report,
  hidden: readonly string[] = [],
): DictionaryMetrics | null {
  if (!report.dictionary) return null;
  if (hidden.length === 0) return report.dictionary;
  const skip = new Set(hidden);
  const topWords = report.dictionary.topWords.filter((w) => !skip.has(w));
  const usage = report.dictionary.usage ?? {};
  return {
    topWords,
    usage: Object.fromEntries(topWords.flatMap((w) => (usage[w] ? [[w, usage[w]]] : []))),
  };
}

/** Quem diz mais a palavra: a pessoa A ou B, ou "both" se for parelho (até 60/40). */
export function wordOwner(usage: { A: number; B: number } | undefined): 'A' | 'B' | 'both' {
  if (!usage || usage.A + usage.B === 0) return 'both';
  const a = usage.A / (usage.A + usage.B);
  return a > 0.6 ? 'A' : a < 0.4 ? 'B' : 'both';
}
