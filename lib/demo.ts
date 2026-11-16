import type { Report } from './metrics';

/** Relatório fictício e fixo, para desenhar as telas sem dados reais. */
export function getDemoReport(locale: 'pt' | 'en'): Report {
  void locale; // por enquanto os dados são iguais nos dois idiomas
  const names = { A: 'Ana Lima', B: 'Bruno Reis' };

  return {
    period: { start: '2019-03-14', end: '2026-11-01', days: 2788 },
    people: names,
    volume: {
      perPerson: {
        A: { messages: 61840, words: 402300, characters: 2210500, uniqueWords: 18420 },
        B: { messages: 54210, words: 318900, characters: 1750200, uniqueWords: 15310 },
      },
      perMonth: [
        { month: '2019-03', A: 820, B: 760, whatsapp: 1580, telegram: 0 },
        { month: '2019-04', A: 1210, B: 1100, whatsapp: 2310, telegram: 0 },
        { month: '2019-05', A: 1050, B: 990, whatsapp: 2040, telegram: 0 },
        { month: '2024-06', A: 540, B: 480, whatsapp: 600, telegram: 420 },
        { month: '2024-07', A: 610, B: 520, whatsapp: 450, telegram: 680 },
      ],
    },
    // Equilíbrio: decisão em aberto, então a demo também fica sem pontos.
    balance: { points: null },
    sessions: {
      total: 9120,
      perPerson: {
        A: { started: 4710, ended: 4380, doubleMessages: 7320, unanswered: 410 },
        B: { started: 4410, ended: 4740, doubleMessages: 5980, unanswered: 530 },
      },
    },
    response: {
      perPerson: {
        A: { avgFirstResponseSec: 540, rateWithin10Min: 0.71 },
        B: { avgFirstResponseSec: 780, rateWithin10Min: 0.64 },
      },
    },
    language: {
      perPerson: {
        A: {
          topEmojis: [
            { emoji: '😂', count: 5210 },
            { emoji: '❤️', count: 4120 },
            { emoji: '😘', count: 2980 },
            { emoji: '🥹', count: 1450 },
            { emoji: '🙏', count: 990 },
          ],
          laughs: 9800,
          questions: 7400,
          apologies: 610,
          affection: 6200,
        },
        B: {
          topEmojis: [
            { emoji: '😂', count: 3980 },
            { emoji: '❤️', count: 2870 },
            { emoji: '👍', count: 2410 },
            { emoji: '😅', count: 1330 },
            { emoji: '😘', count: 1180 },
          ],
          laughs: 8100,
          questions: 6100,
          apologies: 480,
          affection: 4300,
        },
      },
    },
    hours: {
      // 7 dias x 6 faixas de 4 h (madrugada, manhã, meio-dia, tarde, noite, tarde da noite)
      heatmap: [
        [900, 3100, 4200, 5200, 7800, 2100],
        [800, 3600, 4500, 5600, 7200, 1500],
        [700, 3500, 4400, 5500, 7100, 1400],
        [700, 3400, 4300, 5400, 7300, 1600],
        [900, 3300, 4200, 5300, 7600, 2300],
        [1500, 2800, 4800, 5900, 8400, 4100],
        [1700, 2600, 4600, 5700, 8100, 3800],
      ],
      earliest: { A: '05:40', B: '06:10' },
      latest: { A: '03:20', B: '02:50' },
      lateNightPerYear: [
        { year: 2019, A: 1900, B: 1700 },
        { year: 2021, A: 1100, B: 980 },
        { year: 2023, A: 420, B: 360 },
        { year: 2025, A: 210, B: 150 },
      ],
    },
    streaks: { goodMorningDays: 212, goodNightDays: 187 },
    media: {
      perPerson: {
        A: { audios: 5400, images: 4100, videos: 380, links: 1900, texts: 49000 },
        B: { audios: 3100, images: 3600, videos: 510, links: 2400, texts: 44600 },
      },
    },
    firsts: {
      firstMessage: '2019-03-14',
      firstILoveYou: '2019-05-02',
      firstPhoto: '2019-03-15',
      firstAudio: '2019-03-29',
    },
    phases: {
      phases: [
        { date: '2019-04', kind: 'peak', changePct: 48 },
        { date: '2020-04', kind: 'peak', changePct: 35 },
        { date: '2022-08', kind: 'valley', changePct: -42 },
        { date: '2024-01', kind: 'peak', changePct: 27 },
      ],
    },
    dictionary: {
      topWords: [
        'pão',
        'bolinho',
        'jujuba',
        'bora',
        'miau',
        'cafuné',
        'trem',
        'sô',
        'zap',
        'dengo',
      ],
    },
    apps: {
      perYear: [
        { year: 2019, whatsappPct: 100, telegramPct: 0 },
        { year: 2021, whatsappPct: 92, telegramPct: 8 },
        { year: 2023, whatsappPct: 71, telegramPct: 29 },
        { year: 2025, whatsappPct: 48, telegramPct: 52 },
      ],
    },
  };
}
