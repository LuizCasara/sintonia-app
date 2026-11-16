import type { Conversation } from '../model';
import type { PerPerson } from './types';

// Horários: heatmap dia x faixa, mais cedo/mais tarde, madrugada por ano.
// TODO(Luiz): implementar. Hoje devolve valores vazios.

export interface HoursMetrics {
  /** heatmap[diaDaSemana 0-6][faixa]. TODO(Luiz): definir as faixas (ex.: 6 faixas de 4 h). */
  heatmap: number[][];
  earliest: PerPerson<string | null>; // "HH:MM"
  latest: PerPerson<string | null>;
  lateNightPerYear: { year: number; A: number; B: number }[];
}

export function computeHours(conv: Conversation): HoursMetrics {
  void conv;
  return { heatmap: [], earliest: { A: null, B: null }, latest: { A: null, B: null }, lateNightPerYear: [] };
}
