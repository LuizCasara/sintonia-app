import { GOOD_MORNING, GOOD_NIGHT } from '../lexicon';
import type { Conversation } from '../model';
import { dayNumber, foldLexeme, phraseTester, talk } from './util';

// Streaks: maior sequência de dias seguidos com bom dia e com boa noite.
// Conta um dia se qualquer uma das duas pessoas escreveu o cumprimento nele (a sequência é do casal).

export interface StreaksMetrics {
  goodMorningDays: number;
  goodNightDays: number;
}

const isMorning = phraseTester([...GOOD_MORNING.pt, ...GOOD_MORNING.en]);
const isNight = phraseTester([...GOOD_NIGHT.pt, ...GOOD_NIGHT.en]);

/** Maior sequência de números consecutivos. */
export function longestRun(days: Set<number>): number {
  let best = 0;
  for (const d of days) {
    if (days.has(d - 1)) continue; // só começa a contar no início da sequência
    let n = 1;
    while (days.has(d + n)) n++;
    best = Math.max(best, n);
  }
  return best;
}

export function computeStreaks(conv: Conversation): StreaksMetrics {
  const morning = new Set<number>();
  const night = new Set<number>();
  for (const m of talk(conv)) {
    if (m.kind !== 'text' || !m.text) continue;
    const folded = foldLexeme(m.text);
    if (isMorning(folded)) morning.add(dayNumber(m.ts));
    if (isNight(folded)) night.add(dayNumber(m.ts));
  }
  return { goodMorningDays: longestRun(morning), goodNightDays: longestRun(night) };
}
