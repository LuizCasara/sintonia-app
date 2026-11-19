import { describe, expect, it } from 'vitest';
import { daysBetween, spanBetween } from '../../lib/span';

describe('spanBetween', () => {
  it('anos, meses e dias entre datas com dia', () => {
    expect(spanBetween('2023-05-10', '2026-08-25')).toEqual({ years: 3, months: 3, days: 15 });
    expect(spanBetween('2023-05-10', '2024-05-10')).toEqual({ years: 1, months: 0, days: 0 });
  });

  it('dia anterior ao do início empresta um mês', () => {
    expect(spanBetween('2026-01-20', '2026-03-05')).toEqual({ years: 0, months: 1, days: 13 });
  });

  it('só dias quando passou menos de um mês', () => {
    expect(spanBetween('2026-01-20', '2026-02-02')).toEqual({ years: 0, months: 0, days: 13 });
    expect(spanBetween('2026-01-20', '2026-01-20')).toEqual({ years: 0, months: 0, days: 0 });
  });

  it('datas de mês contam só meses', () => {
    expect(spanBetween('2023-05-10', '2025-02')).toEqual({ years: 1, months: 9, days: 0 });
  });

  it('data antes do início vale zero', () => {
    expect(spanBetween('2026-05-10', '2025-01-01')).toEqual({ years: 0, months: 0, days: 0 });
  });
});

describe('daysBetween', () => {
  it('dias corridos', () => {
    expect(daysBetween('2026-01-01', '2026-01-31')).toBe(30);
    expect(daysBetween('2026-01', '2026-02')).toBe(31);
    expect(daysBetween('2026-02-01', '2026-01-01')).toBe(0);
  });
});

describe('mês anterior mais curto que o dia de início', () => {
  it('31 de jan → 1º de mar: 1 mês e 1 dia (e não 1 mês)', () => {
    expect(spanBetween('2026-01-31', '2026-03-01')).toEqual({ years: 0, months: 1, days: 1 });
  });
  it('30 de jan → 2 de mar (ano não bissexto)', () => {
    expect(spanBetween('2026-01-30', '2026-03-02')).toEqual({ years: 0, months: 1, days: 2 });
  });
});
