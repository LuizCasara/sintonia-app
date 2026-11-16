import type { Report } from './metrics';

type Months = Report['volume']['perMonth'];

/** Série mensal fictícia e determinística (2019-03 a 2026-11), com picos e um vale. */
export function demoMonths(): Months {
  const bump = (i: number, at: number, size: number) => size * Math.exp(-(((i - at) / 2.5) ** 2));
  const months: Months = [];
  for (let i = 0; i < 93; i++) {
    const year = 2019 + Math.floor((2 + i) / 12);
    const month = ((2 + i) % 12) + 1;
    const noise = Math.sin(i * 12.9898) * 0.5 + 0.5; // "aleatório" fixo
    const total = Math.round(
      900 +
        700 * Math.exp(-i / 30) +
        bump(i, 1, 700) +
        bump(i, 13, 400) +
        bump(i, 58, 300) -
        bump(i, 41, 550) +
        noise * 160,
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
