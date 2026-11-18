import { describe, expect, it } from 'vitest';
import {
  AFFECTION,
  APOLOGIES,
  GOOD_MORNING,
  GOOD_NIGHT,
  I_LOVE_YOU,
  LAUGHS,
  foldLexeme,
} from '../../lib/lexicon';
import type { LocaleLists } from '../../lib/lexicon';
import ptFreq from '../../lib/lexicon/frequency/pt.json';
import enFreq from '../../lib/lexicon/frequency/en.json';

const lists: [string, LocaleLists][] = [
  ['LAUGHS', LAUGHS],
  ['APOLOGIES', APOLOGIES],
  ['AFFECTION', AFFECTION],
  ['GOOD_MORNING', GOOD_MORNING],
  ['GOOD_NIGHT', GOOD_NIGHT],
  ['I_LOVE_YOU', I_LOVE_YOU],
];

describe('léxicos', () => {
  it.each(lists)('%s tem itens em pt e en, em minúsculas e sem acento', (_name, list) => {
    expect(list.pt.length).toBeGreaterThan(3);
    expect(list.en.length).toBeGreaterThan(3);
    for (const lang of ['pt', 'en'] as const) {
      const seen = new Set<string>();
      for (const item of list[lang]) {
        expect(item).toBe(item.toLowerCase());
        expect(item).toBe(foldLexeme(item));
        expect(item.length).toBeGreaterThan(0);
        expect(seen.has(item)).toBe(false);
        seen.add(item);
      }
    }
  });

  it('foldLexeme tira acento e minúsculas', () => {
    expect(foldLexeme('Você')).toBe('voce');
    expect(foldLexeme('PERDÃO')).toBe('perdao');
    expect(foldLexeme('Good Night')).toBe('good night');
  });
});

describe('lista de frequência', () => {
  it('traz 10 mil palavras em pt e en, a começar pelas mais comuns', () => {
    expect(ptFreq.language).toBe('pt');
    expect(enFreq.language).toBe('en');
    expect(ptFreq.words).toHaveLength(10000);
    expect(enFreq.words).toHaveLength(10000);
    const pt0 = ptFreq.words[0];
    const pt1 = ptFreq.words[1];
    const en0 = enFreq.words[0];
    const en1 = enFreq.words[1];
    expect(pt0?.[0]).toBe('de');
    expect(en0?.[0]).toBe('the');
    expect(pt0?.[1]).toBeGreaterThan(Number(pt1?.[1]));
    expect(en0?.[1]).toBeGreaterThan(Number(en1?.[1]));
  });
});
