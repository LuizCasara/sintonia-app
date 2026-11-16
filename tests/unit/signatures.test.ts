import { describe, expect, it } from 'vitest';
import { levenshtein, mergeChats, suggestPeople } from '../../lib/merge';
import { computeReport } from '../../lib/metrics';
import { parseTelegram } from '../../lib/parsers/telegram';
import { MEDIA_PLACEHOLDERS, guessDateOrder, parseWhatsApp } from '../../lib/parsers/whatsapp';
import { buildPrompt } from '../../lib/prompt';
import { getDemoReport } from '../../lib/demo';

describe('smoke das assinaturas', () => {
  it('as funções existem', () => {
    for (const fn of [parseWhatsApp, parseTelegram, guessDateOrder, suggestPeople, mergeChats]) {
      expect(typeof fn).toBe('function');
    }
    expect(typeof computeReport).toBe('function');
    expect(Object.keys(MEDIA_PLACEHOLDERS).length).toBeGreaterThan(0);
  });

  it('parseWhatsApp aceita string', () => {
    const chat = parseWhatsApp('15/11/2026 22:10 - Ana: oi');
    expect(chat.source).toBe('whatsapp');
  });
});

describe('levenshtein', () => {
  it('calcula a distância', () => {
    expect(levenshtein('', '')).toBe(0);
    expect(levenshtein('ana', 'ana')).toBe(0);
    expect(levenshtein('kitten', 'sitting')).toBe(3);
    expect(levenshtein('ana', '')).toBe(3);
  });
});

describe('buildPrompt', () => {
  it('troca os placeholders e respeita o dicionário', () => {
    const report = getDemoReport('pt');
    const without = buildPrompt(report, { locale: 'pt', includeDictionary: false });
    expect(without).not.toContain('{{');
    expect(without).toContain('Ana Lima');
    expect(without).not.toContain('jujuba');
    const withDict = buildPrompt(report, { locale: 'pt', includeDictionary: true });
    expect(withDict).toContain('jujuba');
  });

  it('usa nomes inventados, nunca os do relatório', () => {
    const report = { ...getDemoReport('pt'), people: { A: 'Nome Real A', B: 'Nome Real B' } };
    const text = buildPrompt(report, { locale: 'pt', includeDictionary: false });
    expect(text).toContain('Ana Lima');
    expect(text).toContain('Bruno Reis');
    expect(text).not.toContain('Nome Real');
  });

});
