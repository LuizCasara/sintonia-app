import { describe, expect, it } from 'vitest';
import { generateBenchConversation, generateConversation } from '../../fixtures/generator/generate';
import {
  toTelegramJson,
  toWhatsAppAndroid,
  toWhatsAppIos,
} from '../../fixtures/generator/serialize';

const base = {
  seed: 1,
  start: new Date('2026-01-01T00:00:00Z'),
  end: new Date('2026-02-01T00:00:00Z'),
  people: ['Ana Lima', 'Bruno Reis'] as [string, string],
};

describe('gerador de fixtures', () => {
  it('mesma seed gera a mesma saída', () => {
    const a = generateConversation(base);
    const b = generateConversation(base);
    expect(a).toEqual(b);
    expect(toWhatsAppAndroid(a, 'pt')).toBe(toWhatsAppAndroid(b, 'pt'));
  });

  it('seed diferente gera saída diferente', () => {
    const a = generateConversation(base);
    const b = generateConversation({ ...base, seed: 2 });
    expect(a).not.toEqual(b);
  });

  it('serializadores devolvem texto não vazio', () => {
    const conv = generateConversation(base);
    expect(toWhatsAppAndroid(conv, 'en').length).toBeGreaterThan(0);
    expect(toWhatsAppIos(conv).length).toBeGreaterThan(0);
    expect(() => JSON.parse(toTelegramJson(conv))).not.toThrow();
  });

  it('gera mensagens do tipo link, separadas de texto', () => {
    const conv = generateConversation({ ...base, seed: 7, end: new Date('2026-06-01T00:00:00Z') });
    const links = conv.messages.filter((m) => m.kind === 'link');
    expect(links.length).toBeGreaterThan(0);
    expect(links.every((m) => m.text?.includes('https://'))).toBe(true);
    const serialized = toTelegramJson(conv);
    expect(serialized).toContain('"type": "link"');
  });

  it('o gerador de benchmark é determinístico e respeita o count', () => {
    const opts = {
      seed: 1,
      count: 80,
      start: new Date('2020-01-01T00:00:00Z'),
      people: base.people,
    };
    const a = generateBenchConversation(opts);
    const b = generateBenchConversation(opts);
    expect(a).toEqual(b);
    expect(a.messages).toHaveLength(80);
  });
});
