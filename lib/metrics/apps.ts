import type { Conversation } from '../model';

// Apps: participação de WhatsApp e Telegram por ano.
// TODO(Luiz): implementar. Hoje devolve valores vazios.

export interface AppsMetrics {
  perYear: { year: number; whatsappPct: number; telegramPct: number }[];
}

export function computeApps(conv: Conversation): AppsMetrics {
  void conv;
  return { perYear: [] };
}
