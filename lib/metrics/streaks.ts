import type { Conversation } from '../model';

// Streaks: maior sequência de dias com bom dia e com boa noite.
// TODO(Luiz): implementar. Hoje devolve valores vazios.

export interface StreaksMetrics {
  goodMorningDays: number;
  goodNightDays: number;
}

export function computeStreaks(conv: Conversation): StreaksMetrics {
  void conv;
  return { goodMorningDays: 0, goodNightDays: 0 };
}
