import type { Conversation } from '../model';
import type { PerPerson } from './types';
import { talk, yearOf } from './util';

// Horários: heatmap dia x faixa, mais cedo/mais tarde, madrugada por ano.
// - heatmap[diaDaSemana 0-6 (0 = domingo)][faixa 0-5]: 6 faixas de 4 h
//   (0 madrugada 00-04, 1 manhã 04-08, 2 meio-dia 08-12... veja BANDS).
// - earliest/latest: o "dia" começa às 04:00. Mais cedo = primeira hora depois das 04:00;
//   mais tarde = a hora mais avançada na madrugada (ex.: 03:20 vale mais que 23:00).
// - lateNightPerYear: mensagens entre 00:00 e 03:59, um item por ano com conversa.

export const DAY_START_MIN = 4 * 60;

export interface HoursMetrics {
  /** heatmap[diaDaSemana 0-6][faixa]: faixas de 4 h a partir da meia-noite. */
  heatmap: number[][];
  earliest: PerPerson<string | null>; // "HH:MM"
  latest: PerPerson<string | null>;
  lateNightPerYear: { year: number; A: number; B: number }[];
}

const hhmm = (min: number) =>
  `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

export function computeHours(conv: Conversation): HoursMetrics {
  const heatmap = Array.from({ length: 7 }, () => Array<number>(6).fill(0));
  const earliest: { A: number | null; B: number | null } = { A: null, B: null };
  const latest: { A: number | null; B: number | null } = { A: null, B: null };
  const night = new Map<number, { A: number; B: number }>();
  let firstYear = Infinity;
  let lastYear = -Infinity;

  for (const m of talk(conv)) {
    const d = new Date(m.ts);
    const hour = d.getUTCHours();
    const min = hour * 60 + d.getUTCMinutes();
    heatmap[d.getUTCDay()]![Math.floor(hour / 4)]!++;

    // Minutos desde o começo do "dia" (04:00); madrugada vira o fim do dia.
    const shifted = (min - DAY_START_MIN + 1440) % 1440;
    const [e, l] = [earliest[m.authorId], latest[m.authorId]];
    if (e === null || shifted < (e - DAY_START_MIN + 1440) % 1440) earliest[m.authorId] = min;
    if (l === null || shifted > (l - DAY_START_MIN + 1440) % 1440) latest[m.authorId] = min;

    const year = yearOf(m.ts);
    firstYear = Math.min(firstYear, year);
    lastYear = Math.max(lastYear, year);
    if (hour < 4) {
      const row = night.get(year) ?? { A: 0, B: 0 };
      row[m.authorId]++;
      night.set(year, row);
    }
  }

  const lateNightPerYear: HoursMetrics['lateNightPerYear'] = [];
  for (let year = firstYear; year <= lastYear; year++) {
    lateNightPerYear.push({ year, ...(night.get(year) ?? { A: 0, B: 0 }) });
  }
  const fmt = (v: number | null) => (v === null ? null : hhmm(v));
  return {
    heatmap,
    earliest: { A: fmt(earliest.A), B: fmt(earliest.B) },
    latest: { A: fmt(latest.A), B: fmt(latest.B) },
    lateNightPerYear,
  };
}
