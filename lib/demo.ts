import { demoMonths } from './demo-months';
import type { Report } from './metrics';
import { computeBalance } from './metrics/balance';
import { computeSintonia, type SintoniaYear } from './metrics/sintonia';

/** Relatório fictício e fixo, para desenhar as telas sem dados reais. */
export function getDemoReport(locale: 'pt' | 'en'): Report {
  void locale; // por enquanto os dados são iguais nos dois idiomas
  const names = { A: 'Ana Lima', B: 'Bruno Reis' };

  const base: Omit<Report, 'balance' | 'sintonia'> = {
    period: { start: '2019-03-14', end: '2026-11-01', days: 2788 },
    activity: { activeDays: 2410, longestStreak: 214, longestSilence: 9 },
    people: names,
    volume: {
      perPerson: {
        A: { messages: 61840, words: 402300, characters: 2210500, uniqueWords: 18420 },
        B: { messages: 54210, words: 318900, characters: 1750200, uniqueWords: 15310 },
      },
      perMonth: demoMonths(),
    },
    sessions: {
      total: 9120,
      perPerson: {
        A: { started: 4710, ended: 4380, doubleMessages: 7320, unanswered: 410 },
        B: { started: 4410, ended: 4740, doubleMessages: 5980, unanswered: 530 },
      },
    },
    response: {
      perPerson: {
        A: { avgFirstResponseSec: 540, medianFirstResponseSec: 300, rateWithin10Min: 0.71 },
        B: { avgFirstResponseSec: 780, medianFirstResponseSec: 420, rateWithin10Min: 0.64 },
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
          warmMessages: 9100,
          textMessages: 49000,
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
          warmMessages: 6200,
          textMessages: 44600,
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
      topWords: ['pão', 'bolinho', 'jujuba', 'bora', 'dengo'],
      own: {
        A: ['miau', 'zap', 'chuchu', 'fofura', 'sapeca'],
        B: ['trem', 'sô', 'cafuné', 'uai', 'bão'],
      },
      usage: {
        pão: { A: 412, B: 388 },
        bolinho: { A: 530, B: 140 },
        jujuba: { A: 96, B: 410 },
        bora: { A: 240, B: 215 },
        dengo: { A: 51, B: 49 },
        miau: { A: 180, B: 12 },
        zap: { A: 90, B: 8 },
        chuchu: { A: 64, B: 5 },
        fofura: { A: 52, B: 3 },
        sapeca: { A: 41, B: 4 },
        trem: { A: 9, B: 160 },
        sô: { A: 8, B: 120 },
        cafuné: { A: 6, B: 150 },
        uai: { A: 4, B: 73 },
        bão: { A: 3, B: 58 },
      },
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

  // Evolução da resposta por ano contra o habitual do casal (mediana de 6 min): fictícia.
  const perYear: SintoniaYear[] = [
    { year: 2019, medianResponseSec: 240, vsUsualPct: -33 },
    { year: 2020, medianResponseSec: 270, vsUsualPct: -25 },
    { year: 2021, medianResponseSec: 330, vsUsualPct: -8 },
    { year: 2022, medianResponseSec: 420, vsUsualPct: 17 },
    { year: 2023, medianResponseSec: 360, vsUsualPct: 0 },
    { year: 2024, medianResponseSec: 330, vsUsualPct: -8 },
    { year: 2025, medianResponseSec: 390, vsUsualPct: 8 },
    { year: 2026, medianResponseSec: 480, vsUsualPct: 33 },
  ];

  return {
    ...base,
    // As notas saem das mesmas funções do relatório real, a partir dos números da demo.
    balance: computeBalance(base.volume, base.sessions),
    sintonia: computeSintonia({
      volume: base.volume,
      sessions: base.sessions,
      language: base.language,
      replies: { medianSec: 360, perYear },
    }),
  };
}
