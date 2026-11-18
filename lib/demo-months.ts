import type { Report } from './metrics';

type Months = Report['volume']['perMonth'];

/**
 * Série mensal fictícia e determinística (2019-03 a 2026-11).
 * Picos e vales marcados (índices = meses desde 2019-03): 1 (2019-04), 13 (2020-04),
 * 41 (2022-08, vale) e 58 (2024-01). Mais a sazonalidade, para a linha nunca ficar reta.
 */
export function demoMonths(): Months {
  const bump = (i: number, at: number, size: number) => size * Math.exp(-(((i - at) / 2) ** 2));
  const months: Months = [];
  for (let i = 0; i < 93; i++) {
    const year = 2019 + Math.floor((2 + i) / 12);
    const month = ((2 + i) % 12) + 1;
    const noise = Math.sin(i * 12.9898) * 0.5 + 0.5; // "aleatório" fixo
    const total = Math.round(
      800 +
        120 * Math.exp(-i / 35) +
        110 * Math.sin(i / 3.2) + // ondas de alguns meses
        bump(i, 1, 380) +
        bump(i, 13, 520) +
        bump(i, 58, 600) -
        bump(i, 41, 480) +
        noise * 90,
    );
    const a = Math.round(total * 0.53);
    const telegramShare = i < 30 ? 0 : Math.min(0.55, (i - 30) / 120);
    const telegram = Math.round(total * telegramShare);
    months.push({
      month: `${year}-${String(month).padStart(2, '0')}`,
      A: a,
      B: total - a,
      whatsapp: total - telegram,
      telegram,
    });
  }
  return months;
}
