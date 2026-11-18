import type { Conversation } from '../model';
import { talk, yearOf } from './util';

// Apps: participação de WhatsApp e Telegram por ano (percentuais inteiros que somam 100).

export interface AppsMetrics {
  perYear: { year: number; whatsappPct: number; telegramPct: number }[];
}

export function computeApps(conv: Conversation): AppsMetrics {
  const years = new Map<number, { whatsapp: number; telegram: number }>();
  for (const m of talk(conv)) {
    const y = yearOf(m.ts);
    const row = years.get(y) ?? { whatsapp: 0, telegram: 0 };
    row[m.source]++;
    years.set(y, row);
  }
  const perYear = [...years.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([year, { whatsapp, telegram }]) => {
      const whatsappPct = Math.round((whatsapp / (whatsapp + telegram)) * 100);
      return { year, whatsappPct, telegramPct: 100 - whatsappPct };
    });
  return { perYear };
}
