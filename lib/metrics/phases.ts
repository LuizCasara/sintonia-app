import type { Conversation } from '../model';
import { computeVolume } from './volume';

// Fases: picos e vales do volume mensal (média móvel + desvio).
//
// Método (valores iniciais, a confirmar com o Luiz):
// 1. Série = mensagens por mês, sem o primeiro e o último mês (costumam ser parciais).
// 2. Para cada mês, média e desvio dos outros meses da janela (±6 meses, sem o próprio mês).
//    Um pico grande não esconde o vale ao lado, porque cada mês é comparado com a sua vizinhança.
// 3. Pico/vale se o mês passa de PHASE_SIGMA desvios da média local (desvio mínimo de 10% da média)
//    e a diferença é de pelo menos PHASE_MIN_PCT.
// 4. Meses vizinhos do mesmo tipo (a menos de 3 meses) viram um só: fica o mais forte.
// 5. No máximo 8 fases, as mais fortes, em ordem de data.
// Menos de 12 meses de dados: sem fases.

export interface Phase {
  date: string; // "2026-11"
  kind: 'peak' | 'valley';
  changePct: number;
}

export interface PhasesMetrics {
  phases: Phase[];
}

export const PHASE_HALF_WINDOW = 6;
export const PHASE_SIGMA = 2;
export const PHASE_MIN_PCT = 25;
export const PHASE_MIN_GAP = 3;
export const PHASE_MAX = 8;
const MIN_MONTHS = 12;

export function computePhases(conv: Conversation): PhasesMetrics {
  const all = computeVolume(conv).perMonth;
  const series = all.slice(1, -1).map((m) => ({ month: m.month, v: m.A + m.B }));
  if (series.length < MIN_MONTHS) return { phases: [] };

  type Cand = { i: number; kind: Phase['kind']; z: number; pct: number };
  const cands: Cand[] = [];
  series.forEach((x, i) => {
    const from = Math.max(0, i - PHASE_HALF_WINDOW);
    const to = Math.min(series.length - 1, i + PHASE_HALF_WINDOW);
    const others: number[] = [];
    for (let j = from; j <= to; j++) if (j !== i) others.push(series[j]!.v);
    const mean = others.reduce((s, v) => s + v, 0) / others.length;
    if (mean === 0) return;
    const sd = Math.sqrt(others.reduce((s, v) => s + (v - mean) ** 2, 0) / others.length);
    const z = (x.v - mean) / Math.max(sd, 0.1 * mean);
    const pct = ((x.v - mean) / mean) * 100;
    if (Math.abs(z) > PHASE_SIGMA && Math.abs(pct) >= PHASE_MIN_PCT) {
      cands.push({ i, kind: z > 0 ? 'peak' : 'valley', z, pct });
    }
  });

  // Junta vizinhos do mesmo tipo, ficando com o mais forte.
  const merged: Cand[] = [];
  for (const c of cands) {
    const last = merged[merged.length - 1];
    if (last && last.kind === c.kind && c.i - last.i < PHASE_MIN_GAP) {
      if (Math.abs(c.z) > Math.abs(last.z)) merged[merged.length - 1] = c;
    } else merged.push(c);
  }

  const phases = merged
    .sort((a, b) => Math.abs(b.z) - Math.abs(a.z))
    .slice(0, PHASE_MAX)
    .sort((a, b) => a.i - b.i)
    .map((c) => ({ date: series[c.i]!.month, kind: c.kind, changePct: Math.round(c.pct) }));
  return { phases };
}
