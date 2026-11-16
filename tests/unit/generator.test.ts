import { describe, expect, it } from 'vitest';
import { generateConversation } from '../../fixtures/generator/generate';
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
});
