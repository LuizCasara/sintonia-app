import { describe, expect, it } from 'vitest';
import { HARRY_POTTER_TOTAL, HARRY_POTTER_WORDS, bookProgress } from '../../lib/books';
import { getDemoReport } from '../../lib/demo';
import { sharedDictionary } from '../../lib/share';

describe('palavras em livros (Harry Potter)', () => {
  it('a série inteira tem 1.084.170 palavras', () => {
    expect(HARRY_POTTER_TOTAL).toBe(1_084_170);
  });

  it('sem palavras: nenhum livro e o primeiro em 0%', () => {
    const p = bookProgress(0);
    expect(p.full).toBe(0);
    expect(p.current).toEqual({ index: 0, fraction: 0 });
    expect(p.missing).toBe(HARRY_POTTER_WORDS[0]);
  });

  it('conta livros completos em ordem e a fração do próximo', () => {
    const p = bookProgress(HARRY_POTTER_WORDS[0] + HARRY_POTTER_WORDS[1] + 10_725);
    expect(p.full).toBe(2);
    expect(p.current.index).toBe(2);
    expect(p.current.fraction).toBeCloseTo(0.1, 2);
    expect(p.missing).toBe(HARRY_POTTER_WORDS[2] - 10_725);
  });

  it('exatamente um livro fechado já conta', () => {
    expect(bookProgress(HARRY_POTTER_WORDS[0]).full).toBe(1);
    expect(bookProgress(HARRY_POTTER_WORDS[0] - 1).full).toBe(0);
  });

  it('a série inteira ou mais: 7 livros e quantas vezes coube', () => {
    const p = bookProgress(HARRY_POTTER_TOTAL * 2.5);
    expect(p.full).toBe(7);
    expect(p.times).toBeCloseTo(2.5);
  });

  it('a demo fecha 5 livros', () => {
    const v = getDemoReport('pt').volume.perPerson;
    expect(bookProgress(v.A.words + v.B.words).full).toBe(5);
  });
});

describe('dicionário compartilhado', () => {
  const report = getDemoReport('pt');
  it('sem escondidas, sai igual', () => {
    expect(sharedDictionary(report)).toEqual(report.dictionary);
  });
  it('palavra escondida some do que é compartilhado', () => {
    const words = sharedDictionary(report, ['jujuba', 'dengo'])!.topWords;
    expect(words).not.toContain('jujuba');
    expect(words).not.toContain('dengo');
    expect(words).toContain('bolinho');
  });
});

describe('uso das palavras por pessoa', () => {
  it('o compartilhado mantém as contagens só das palavras visíveis', () => {
    const d = sharedDictionary(getDemoReport('pt'), ['jujuba'])!;
    expect(d.usage.jujuba).toBeUndefined();
    expect(d.usage.bolinho).toEqual({ A: 530, B: 140 });
    expect(Object.keys(d.usage).sort()).toEqual([...d.topWords, ...d.own.A, ...d.own.B].sort());
  });
  it('palavras escondidas saem também das listas de cada pessoa', () => {
    const d = sharedDictionary(getDemoReport('pt'), ['miau', 'trem'])!;
    expect(d.own.A).not.toContain('miau');
    expect(d.own.B).not.toContain('trem');
    expect(d.own.A).toContain('zap');
    expect(d.usage.miau).toBeUndefined();
  });
});
