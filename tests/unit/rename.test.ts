import { describe, expect, it } from 'vitest';
import { getDemoReport } from '../../lib/demo';
import { MAX_NAME, applyNames } from '../../lib/rename';

describe('nomes no relatório', () => {
  const report = getDemoReport('pt');
  it('troca só o que foi preenchido e apara os espaços', () => {
    const r = applyNames(report, { A: '  Aninha ', B: '' });
    expect(r.people).toEqual({ A: 'Aninha', B: 'Bruno Reis' });
  });
  it('sem nomes (ou em branco) mantém o detectado', () => {
    expect(applyNames(report, null)).toBe(report);
    expect(applyNames(report, { A: '   ' }).people).toEqual(report.people);
  });
  it('limita o tamanho e não mexe no resto do relatório', () => {
    const r = applyNames(report, { A: 'x'.repeat(100) });
    expect(r.people.A).toHaveLength(MAX_NAME);
    expect({ ...r, people: report.people }).toEqual(report);
  });
});
