import { describe, expect, it } from 'vitest';
import { generateConversation } from '../../fixtures/generator/generate';
import { getDemoReport } from '../../lib/demo';
import { computeReport } from '../../lib/metrics';
import { buildPrompt } from '../../lib/prompt';
import { computeBalance } from '../../lib/metrics/balance';
import type { LanguageMetrics, PersonLanguage } from '../../lib/metrics/language';
import type { Reply } from '../../lib/metrics/response';
import type { SessionsMetrics } from '../../lib/metrics/sessions';
import {
  computeSintonia,
  responseScore,
  summarizeReplies,
  type ReplySummary,
} from '../../lib/metrics/sintonia';
import type { VolumeMetrics } from '../../lib/metrics/volume';

type Pair = [number, number];
const volume = (messages: Pair, words: Pair, months = 12): VolumeMetrics => ({
  perPerson: {
    A: { messages: messages[0], words: words[0], characters: 0, uniqueWords: 0 },
    B: { messages: messages[1], words: words[1], characters: 0, uniqueWords: 0 },
  },
  perMonth: Array.from({ length: months }, (_, i) => ({
    month: `2026-${String(i + 1).padStart(2, '0')}`,
    A: 0,
    B: 0,
    whatsapp: 0,
    telegram: 0,
  })),
});
const sessions = (started: Pair, ended: Pair, unanswered: Pair = [0, 0]): SessionsMetrics => ({
  total: started[0] + started[1],
  perPerson: {
    A: { started: started[0], ended: ended[0], doubleMessages: 0, unanswered: unanswered[0] },
    B: { started: started[1], ended: ended[1], doubleMessages: 0, unanswered: unanswered[1] },
  },
});
const lang = (text: number, warm: number): PersonLanguage => ({
  topEmojis: [],
  laughs: 0,
  questions: 0,
  apologies: 0,
  affection: 0,
  warmMessages: warm,
  textMessages: text,
});
const language = (a: PersonLanguage, b: PersonLanguage): LanguageMetrics => ({
  perPerson: { A: a, B: b },
});

describe('Equilíbrio', () => {
  it('50/50 em tudo vale 10 e ninguém "puxa"', () => {
    const r = computeBalance(volume([100, 100], [500, 500]), sessions([10, 10], [10, 10]));
    expect(r.score).toBe(10);
    expect(r.leaning).toBeNull();
    expect(r.items.map((i) => i.id).sort()).toEqual(['closes', 'messages', 'opens', 'words']);
  });

  it('70/30 só em quem abre: item vale 0,6 e a nota 8,4 (peso 40%)', () => {
    const r = computeBalance(volume([100, 100], [500, 500]), sessions([70, 30], [50, 50]));
    const opens = r.items.find((i) => i.id === 'opens')!;
    expect(opens.shareA).toBeCloseTo(0.7);
    expect(opens.score).toBeCloseTo(0.6);
    expect(r.score).toBe(8.4);
    expect(r.leaning).toBe('A'); // média ponderada 0,58
  });

  it('uma pessoa fazendo tudo vale 0', () => {
    const r = computeBalance(volume([100, 0], [500, 0]), sessions([10, 0], [10, 0]));
    expect(r.score).toBe(0);
    expect(r.leaning).toBe('A');
  });

  it('pende para B quando B puxa mais', () => {
    const r = computeBalance(volume([30, 70], [300, 700]), sessions([30, 70], [40, 60]));
    expect(r.leaning).toBe('B');
  });

  it('item sem dados sai da conta e os pesos se redistribuem (soma 1)', () => {
    const r = computeBalance(volume([100, 100], [0, 0]), sessions([10, 10], [10, 10]));
    expect(r.items.map((i) => i.id)).not.toContain('words');
    expect(r.items.reduce((s, i) => s + i.weight, 0)).toBeCloseTo(1);
    expect(r.score).toBe(10);
  });

  it('sem nenhum dado: sem nota', () => {
    const r = computeBalance(volume([0, 0], [0, 0]), sessions([0, 0], [0, 0]));
    expect(r).toEqual({ score: null, leaning: null, items: [] });
  });
});

describe('Sintonia', () => {
  const summary: ReplySummary = { medianSec: 600, perYear: [] };

  it('escala do tempo de resposta: 1 até 10 min, 0 a partir de 3 h, log no meio', () => {
    expect(responseScore(30)).toBe(1);
    expect(responseScore(600)).toBe(1);
    expect(responseScore(1800)).toBeCloseTo(0.62, 2);
    expect(responseScore(3600)).toBeCloseTo(0.38, 2);
    expect(responseScore(10_800)).toBe(0);
    expect(responseScore(86_400)).toBe(0);
  });

  it('nota = média ponderada das 3 partes × 10 (40% / 40% / 20%)', () => {
    const r = computeSintonia({
      volume: volume([600, 600], [0, 0]),
      sessions: sessions([50, 50], [50, 50], [3, 2]), // 5% sem resposta
      language: language(lang(500, 30), lang(500, 70)), // 10% das mensagens com tom
      replies: summary,
    });
    const part = (id: string) => r.parts.find((p) => p.id === id)!;
    expect(part('reciprocity').score).toBeCloseTo(0.8); // 1 - 0,05 / 0,25
    expect(part('reciprocity').value).toBeCloseTo(0.95);
    expect(part('responseTime').score).toBe(1);
    expect(part('tone').score).toBeCloseTo(0.5); // 0,10 / teto de 0,20
    expect(r.score).toBe(8.2); // 10 × (0,4×0,8 + 0,4×1 + 0,2×0,5)
    expect(r.reason).toBeNull();
  });

  it('o teto do tom impede que rir demais infle a nota', () => {
    const r = computeSintonia({
      volume: volume([600, 600], [0, 0]),
      sessions: sessions([50, 50], [50, 50]),
      language: language(lang(500, 400), lang(500, 500)), // 90% das mensagens
      replies: summary,
    });
    expect(r.parts.find((p) => p.id === 'tone')!.score).toBe(1);
    expect(r.score).toBe(10);
  });

  it('histórico curto não recebe nota (menos de 500 mensagens ou 3 meses)', () => {
    const base = {
      sessions: sessions([5, 5], [5, 5]),
      language: language(lang(50, 5), lang(50, 5)),
      replies: summary,
    };
    const fewMessages = computeSintonia({ ...base, volume: volume([100, 100], [0, 0]) });
    expect(fewMessages).toMatchObject({ score: null, reason: 'short' });
    const fewMonths = computeSintonia({ ...base, volume: volume([600, 600], [0, 0], 2) });
    expect(fewMonths).toMatchObject({ score: null, reason: 'short' });
    expect(fewMessages.parts.length).toBe(3); // as partes continuam disponíveis
  });

  it('parte sem dados sai da conta e os pesos se redistribuem', () => {
    const r = computeSintonia({
      volume: volume([600, 600], [0, 0]),
      sessions: sessions([50, 50], [50, 50]),
      language: language(lang(500, 100), lang(500, 100)),
      replies: { medianSec: null, perYear: [] },
    });
    expect(r.parts.map((p) => p.id)).toEqual(['reciprocity', 'tone']);
    expect(r.parts.reduce((s, p) => s + p.weight, 0)).toBeCloseTo(1);
  });

  it('evolução por ano: mediana do ano contra a mediana do próprio casal', () => {
    const at = (year: number) => Date.UTC(year, 5, 1);
    const replies: Reply[] = [
      ...Array.from({ length: 40 }, () => ({ ts: at(2025), who: 'A' as const, sec: 600 })),
      ...Array.from({ length: 40 }, () => ({ ts: at(2026), who: 'B' as const, sec: 1200 })),
      ...Array.from({ length: 5 }, () => ({ ts: at(2024), who: 'A' as const, sec: 60 })),
    ];
    const s = summarizeReplies(replies);
    expect(s.medianSec).toBe(600);
    expect(s.perYear).toEqual([
      { year: 2024, medianResponseSec: null, vsUsualPct: null }, // poucas respostas
      { year: 2025, medianResponseSec: 600, vsUsualPct: 0 },
      { year: 2026, medianResponseSec: 1200, vsUsualPct: 100 },
    ]);
    expect(summarizeReplies([])).toEqual({ medianSec: null, perYear: [] });
  });
});

describe('notas no relatório', () => {
  it('conversa gerada: as duas notas ficam entre 0 e 10 e as partes somam 100%', () => {
    const conv = generateConversation({
      seed: 3,
      start: new Date('2026-01-05T00:00:00Z'),
      end: new Date('2026-08-01T00:00:00Z'),
      people: ['Ana Lima', 'Bruno Reis'],
    });
    const r = computeReport(conv);
    for (const score of [r.balance.score, r.sintonia.score]) {
      expect(score).not.toBeNull();
      expect(score!).toBeGreaterThanOrEqual(0);
      expect(score!).toBeLessThanOrEqual(10);
    }
    expect(r.sintonia.parts.reduce((s, p) => s + p.weight, 0)).toBeCloseTo(1);
    expect(r.response.perPerson.A.medianFirstResponseSec).toBeGreaterThan(0);
    expect(r.sintonia.perYear[0]?.year).toBe(2026);
  });

  it('a demo calcula as notas com as mesmas funções', () => {
    const r = getDemoReport('pt');
    expect(r.balance.score).not.toBeNull();
    expect(r.sintonia.score).not.toBeNull();
    expect(r.sintonia.perYear.length).toBeGreaterThan(3);
  });
});

describe('prompt da IA', () => {
  it('não leva as notas do app (Sintonia e Equilíbrio)', () => {
    const text = buildPrompt(getDemoReport('pt'), { locale: 'pt', includeDictionary: true });
    expect(text).not.toContain('"sintonia"');
    expect(text).not.toContain('"balance"');
    expect(text).toContain('"medianFirstResponseSec"'); // os números brutos continuam
  });
});
