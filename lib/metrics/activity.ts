import type { Conversation } from '../model';
import { longestRun } from './streaks';
import { dayNumber, talk } from './util';

// Atividade por dia: em quantos dias do período alguém escreveu e as maiores sequências.

export interface ActivityMetrics {
  /** Dias do calendário com pelo menos uma mensagem. */
  activeDays: number;
  /** Maior sequência de dias seguidos com mensagem. */
  longestStreak: number;
  /** Maior pausa: dias seguidos sem nenhuma mensagem, entre duas mensagens. */
  longestSilence: number;
}

export function computeActivity(conv: Conversation): ActivityMetrics {
  const days = new Set<number>();
  for (const m of talk(conv)) days.add(dayNumber(m.ts));
  const sorted = [...days].sort((a, b) => a - b);
  let silence = 0;
  for (let i = 1; i < sorted.length; i++)
    silence = Math.max(silence, sorted[i]! - sorted[i - 1]! - 1);
  return { activeDays: days.size, longestStreak: longestRun(days), longestSilence: silence };
}
