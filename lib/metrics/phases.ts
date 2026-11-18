import type { Conversation } from '../model';

// Fases: picos e vales do volume mensal (média móvel + desvio).
// TODO(Luiz): implementar. Hoje devolve valores vazios.

export interface Phase {
  date: string; // "2026-11"
  kind: 'peak' | 'valley';
  changePct: number;
}

export interface PhasesMetrics {
  phases: Phase[];
}

export function computePhases(conv: Conversation): PhasesMetrics {
  void conv;
  return { phases: [] };
}
