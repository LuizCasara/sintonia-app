import { describe, expect, it } from 'vitest';
import { generateConversation } from '../../fixtures/generator/generate';
import {
  toTelegramJson,
  toWhatsAppAndroid,
  toWhatsAppIos,
} from '../../fixtures/generator/serialize';
import { mergeChats } from '../../lib/merge';
import { computeReport } from '../../lib/metrics';
import { computePhases } from '../../lib/metrics/phases';
import type { Conversation, Kind, Message } from '../../lib/model';
import { parseTelegram } from '../../lib/parsers/telegram';
import { parseWhatsApp } from '../../lib/parsers/whatsapp';

const HOUR = 3_600_000;
const MIN = 60_000;
const t0 = Date.UTC(2026, 0, 5, 9, 0); // segunda, 09:00

function conv(msgs: Partial<Message>[]): Conversation {
  const person = (id: 'A' | 'B') => ({ id, displayName: id, aliases: [] });
  return {
    people: [person('A'), person('B')],
    messages: msgs.map((m) => ({
      ts: t0,
      source: 'whatsapp' as const,
      authorId: 'A' as const,
      kind: 'text' as Kind,
      ...m,
    })),
    sources: ['whatsapp'],
  };
}

describe('métricas (conversa montada à mão)', () => {
  const c = conv([
    { ts: t0, authorId: 'A', text: 'Bom dia! 😂😂 ❤️' },
    { ts: t0 + 2 * MIN, authorId: 'B', text: 'bom dia, amor kkkkkkkkk' },
    { ts: t0 + 3 * MIN, authorId: 'B', text: 'dormiu bem?' },
    { ts: t0 + 30 * MIN, authorId: 'A', text: 'te amo muito, desculpa pelo ontem 😂' },
    { ts: t0 + 31 * MIN, authorId: 'A', kind: 'image' },
    { ts: t0 + 32 * MIN, authorId: 'A', kind: 'audio', durationSec: 10 },
    { ts: t0 + 33 * MIN, authorId: 'A', kind: 'link', text: 'https://x.com' },
    { ts: t0 + 34 * MIN, authorId: 'other', kind: 'system' },
    // outra sessão (10 h depois): só A fala
    { ts: t0 + 10 * HOUR, authorId: 'A', text: 'alguem ai?' },
    // terceira sessão no dia seguinte, 03:30 da madrugada
    { ts: Date.UTC(2026, 0, 7, 3, 30), authorId: 'B', text: 'boa noite' },
    { ts: Date.UTC(2026, 0, 7, 3, 31), authorId: 'A', text: 'boa noite' },
  ]);
  const r = computeReport(c);

  it('período', () => {
    expect(r.period.start).toBe('2026-01-05');
    expect(r.period.end).toBe('2026-01-07');
    expect(r.period.days).toBe(2);
  });

  it('atividade: dias com mensagem, maior sequência e maior pausa', () => {
    expect(r.activity).toEqual({ activeDays: 2, longestStreak: 1, longestSilence: 1 });
  });

  it('volume: link conta como mensagem, mas não como texto', () => {
    const a = r.volume.perPerson.A;
    // A: texto, texto, imagem, áudio, link, "alguem ai?", "boa noite" = 7 (sistema fora)
    expect(a.messages).toBe(7);
    // "Bom dia!" (2) + "te amo muito, desculpa pelo ontem" (6) + "alguem ai?" (2) + "boa noite" (2).
    // O link não conta como texto.
    expect(a.words).toBe(12);
  });

  it('sessões', () => {
    expect(r.sessions.total).toBe(3);
    expect(r.sessions.perPerson.A.started).toBe(2);
    expect(r.sessions.perPerson.B.started).toBe(1);
    expect(r.sessions.perPerson.A.unanswered).toBe(1); // sessão do "alguem ai?"
    expect(r.sessions.perPerson.A.doubleMessages).toBe(3); // imagem, áudio, link
    expect(r.sessions.perPerson.B.doubleMessages).toBe(1); // "dormiu bem?"
  });

  it('tempo de resposta', () => {
    // B respondeu A em 2 min; A respondeu B em 27 min (de 09:03 a 09:30) e em 1 min (03:30→03:31).
    expect(r.response.perPerson.B.avgFirstResponseSec).toBe(120);
    expect(r.response.perPerson.B.rateWithin10Min).toBe(1);
    expect(r.response.perPerson.A.rateWithin10Min).toBe(0.5);
  });

  it('emojis: ❤ e ❤️ juntos, por pessoa', () => {
    expect(r.language.perPerson.A.topEmojis[0]).toEqual({ emoji: '😂', count: 3 });
    expect(r.language.perPerson.A.topEmojis[1]).toEqual({ emoji: '❤️', count: 1 });
  });

  it('emoji de figurinha do Telegram soma ao top', () => {
    const t = c.messages[0]!.ts;
    const extra: Message[] = [
      { ts: t, source: 'telegram', authorId: 'B', kind: 'sticker', stickerEmoji: '🥰' },
      { ts: t + 1, source: 'telegram', authorId: 'B', kind: 'sticker', stickerEmoji: '🥰' },
      { ts: t + 2, source: 'whatsapp', authorId: 'B', kind: 'sticker' }, // sem emoji: ignorada
    ];
    const withStickers = computeReport({ ...c, messages: [...c.messages, ...extra] });
    const top = withStickers.language.perPerson.B.topEmojis;
    expect(top.find((e) => e.emoji === '🥰')?.count).toBe(
      (r.language.perPerson.B.topEmojis.find((e) => e.emoji === '🥰')?.count ?? 0) + 2,
    );
  });

  it('risadas, perguntas, desculpas e carinho', () => {
    expect(r.language.perPerson.B.laughs).toBe(1);
    expect(r.language.perPerson.B.questions).toBe(1);
    expect(r.language.perPerson.A.apologies).toBeGreaterThanOrEqual(1);
    expect(r.language.perPerson.A.affection).toBeGreaterThanOrEqual(0);
  });

  it('mídia', () => {
    expect(r.media.perPerson.A).toMatchObject({ audios: 1, images: 1, videos: 0, links: 1 });
    expect(r.media.perPerson.A.texts).toBe(4);
  });

  it('primeiras vezes', () => {
    expect(r.firsts).toEqual({
      firstMessage: '2026-01-05',
      firstILoveYou: '2026-01-05',
      firstPhoto: '2026-01-05',
      firstAudio: '2026-01-05',
    });
  });

  it('horários: madrugada, mais cedo e mais tarde', () => {
    expect(r.hours.heatmap).toHaveLength(7);
    expect(r.hours.heatmap[1]?.[2]).toBeGreaterThan(0); // segunda, 08-12
    expect(r.hours.latest.B).toBe('03:30');
    expect(r.hours.earliest.A).toBe('09:00');
    expect(r.hours.lateNightPerYear).toEqual([{ year: 2026, A: 1, B: 1 }]);
  });

  it('streaks: sequência de dias seguidos com o cumprimento', () => {
    expect(r.streaks.goodMorningDays).toBe(1);
    expect(r.streaks.goodNightDays).toBe(1);
    const days = conv([5, 6, 7, 9].map((d) => ({ ts: Date.UTC(2026, 0, d, 8), text: 'bom dia' })));
    expect(computeReport(days).streaks.goodMorningDays).toBe(3);
  });

  it('apps: percentuais somam 100', () => {
    expect(r.apps.perYear).toEqual([{ year: 2026, whatsappPct: 100, telegramPct: 0 }]);
  });

  it('conversa curta: sem nota de Sintonia, mas com o Equilíbrio', () => {
    expect(r.sintonia.score).toBeNull();
    expect(r.sintonia.reason).toBe('short');
    expect(r.balance.score).not.toBeNull();
  });
});

describe('conversa vazia', () => {
  it('não quebra e devolve zeros', () => {
    const r = computeReport(conv([]));
    expect(r.period).toEqual({ start: '', end: '', days: 0 });
    expect(r.volume.perMonth).toEqual([]);
    expect(r.hours.earliest.A).toBeNull();
    expect(r.phases.phases).toEqual([]);
  });
});

describe('fases', () => {
  it('acha o pico e o vale e ignora os meses parciais das pontas', () => {
    const msgs: Partial<Message>[] = [];
    // 30 meses a partir de 2024-01, ~40 msgs/mês; pico no mês 10 (200) e vale no mês 22 (2).
    for (let i = 0; i < 30; i++) {
      const n = i === 10 ? 200 : i === 22 ? 2 : 40;
      for (let k = 0; k < n; k++) {
        msgs.push({ ts: Date.UTC(2024, i, 1 + (k % 27), 10, k % 60), authorId: k % 2 ? 'A' : 'B' });
      }
    }
    const { phases } = computePhases(conv(msgs));
    expect(phases.map((p) => [p.date, p.kind])).toEqual([
      ['2024-11', 'peak'],
      ['2025-11', 'valley'],
    ]);
    expect(phases[0]!.changePct).toBeGreaterThan(100);
    expect(phases[1]!.changePct).toBeLessThan(-80);
  });
  it('pouco histórico: sem fases', () => {
    expect(computePhases(conv([{ ts: t0 }, { ts: t0 + HOUR }])).phases).toEqual([]);
  });
});

describe('dicionário do casal', () => {
  const said = (authorId: 'A' | 'B', text: string, n: number, from = 0) =>
    Array.from({ length: n }, (_, i) => ({ ts: t0 + (from + i) * MIN, authorId, text }));

  it('só palavras raras no corpus, usadas várias vezes e pelas duas pessoas', () => {
    const msgs = [
      ...said('A', 'oi jujuba, o tempo hoje', 3),
      ...said('B', 'oi jujuba, o tempo hoje', 3, 10),
      ...said('A', 'kkkkkkkk bolinho', 3, 20),
      ...said('B', 'kkkkkkkk bolinho', 3, 30),
      { ts: t0 + 60 * MIN, authorId: 'A' as const, text: 'raridade' },
      ...said('A', 'xibiu xibiu', 5, 70), // só uma pessoa usa
    ];
    const words = computeReport(conv(msgs)).dictionary?.topWords ?? [];
    expect(words).toEqual(expect.arrayContaining(['jujuba', 'bolinho']));
    expect(computeReport(conv(msgs)).dictionary?.usage.jujuba).toEqual({ A: 3, B: 3 });
    expect(words).not.toContain('tempo'); // comum no corpus
    expect(words).not.toContain('raridade'); // só 1 vez
    expect(words).not.toContain('xibiu'); // vício de digitação de uma pessoa só
    expect(words.some((w) => /^k+$/.test(w))).toBe(false);
  });

  it('palavras de cada pessoa: quase só dela, sem vício de digitação nem as do casal', () => {
    const msgs = [
      ...said('A', 'oi jujuba', 6), // do casal
      ...said('B', 'oi jujuba', 6, 10),
      ...said('A', 'chuchu fofura', 9, 20), // só da A
      ...said('B', 'chuchu', 1, 40), // 90%: ainda é da A
      ...said('B', 'trenzinho cafuné', 9, 50), // só da B
      ...said('A', 'qndo siim', 12, 80), // abreviação e letra repetida: não contam
      ...said('B', 'bolachinha', 4, 100), // poucas vezes
    ];
    const d = computeReport(conv(msgs)).dictionary!;
    expect(d.topWords).toEqual(['jujuba']);
    expect(d.own.A).toEqual(expect.arrayContaining(['chuchu', 'fofura']));
    expect(d.own.B).toEqual(expect.arrayContaining(['trenzinho', 'cafuné']));
    expect(d.own.A).not.toContain('jujuba');
    expect([...d.own.A, ...d.own.B]).not.toContain('qndo');
    expect([...d.own.A, ...d.own.B]).not.toContain('siim');
    expect(d.own.B).not.toContain('bolachinha');
    expect(d.usage.chuchu).toEqual({ A: 9, B: 1 });
  });

  it('as listas têm no máximo 5 palavras cada', () => {
    const words = ['abacaxi', 'bergamota', 'cambuci', 'damasco', 'embaúba', 'framboesa', 'goiaba'];
    const msgs = words.flatMap((w, i) => [
      ...said('A', w, 12, i * 30),
      ...said('B', w, 12, i * 30 + 15),
    ]);
    const d = computeReport(conv(msgs)).dictionary!;
    expect(d.topWords).toHaveLength(5);
  });

  it('gíria de chat não é palavra do casal', () => {
    const msgs = [...said('A', 'tava tmbm', 4), ...said('B', 'tava tmbm', 4, 10)];
    const words = computeReport(conv(msgs)).dictionary?.topWords ?? [];
    expect(words).not.toContain('tava');
    expect(words).not.toContain('tmbm');
  });
});

describe('round-trip: gerar → exportar → parsear → juntar → métricas', () => {
  const base = generateConversation({
    seed: 11,
    start: new Date('2026-01-05T00:00:00Z'),
    end: new Date('2026-06-01T00:00:00Z'),
    people: ['Ana Lima', 'Bruno Reis'],
  });
  const mapping = { 'Ana Lima': 'A', 'Bruno Reis': 'B' } as const;
  const strip = (cv: Conversation, source: 'whatsapp' | 'telegram') =>
    cv.messages.filter((m) => m.source === source && m.kind !== 'system');

  it('iOS: o parser devolve as mesmas mensagens que o gerador exportou', () => {
    const parsed = parseWhatsApp(toWhatsAppIos(base, 'pt'), { dateOrder: 'DMY' });
    const merged = mergeChats([parsed], mapping);
    const expected = strip(base, 'whatsapp');
    expect(merged.messages).toHaveLength(expected.length);
    merged.messages.forEach((m, i) => {
      const e = expected[i]!;
      expect([m.ts, m.authorId, m.kind]).toEqual([e.ts, e.authorId, e.kind]);
      if (e.kind === 'text' || e.kind === 'link') expect(m.text).toBe(e.text);
    });
  });

  it('Android pt e en: mesmas mensagens e horários (o tipo da mídia vira imagem)', () => {
    for (const lang of ['pt', 'en'] as const) {
      const cv = generateConversation({
        seed: 11,
        start: new Date('2026-01-05T00:00:00Z'),
        end: new Date('2026-06-01T00:00:00Z'),
        people: ['Ana Lima', 'Bruno Reis'],
        lang,
      });
      const parsed = parseWhatsApp(toWhatsAppAndroid(cv, lang));
      const expected = cv.messages.filter((m) => m.source === 'whatsapp');
      // o Android não grava segundos
      expect(parsed.messages.map((m) => m.ts)).toEqual(
        expected.map((m) => Math.floor(m.ts / 60_000) * 60_000),
      );
      expect(parsed.messages.filter((m) => m.kind === 'system')).toHaveLength(1);
    }
  });

  it('Telegram: mesmas mensagens, tipos e duração do áudio', () => {
    const parsed = parseTelegram(JSON.parse(toTelegramJson(base)));
    const merged = mergeChats([parsed], mapping);
    const expected = strip(base, 'telegram');
    expect(merged.messages).toHaveLength(expected.length);
    merged.messages.forEach((m, i) => {
      const e = expected[i]!;
      expect([m.ts, m.authorId, m.kind]).toEqual([e.ts, e.authorId, e.kind]);
      if (e.kind === 'audio') expect(m.durationSec).toBe(e.durationSec ?? 5);
    });
  });
});
