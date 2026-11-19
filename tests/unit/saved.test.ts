import { describe, expect, it } from 'vitest';
import { getDemoReport } from '../../lib/demo';
import { sharedDictionary } from '../../lib/share';
import { SAVED_VERSION, isUsable, isUuid, readCookie, summarize } from '../../lib/saved';

describe('identificador do navegador', () => {
  const id = '3f2b8c1e-9d4a-4b6e-8a1f-0c7d5e2a9b34';
  it('lê o uuid do cookie antigo no meio de outros cookies (migração)', () => {
    expect(readCookie('sintonia_id', `a=1; sintonia_id=${id}; b=2`)).toBe(id);
    expect(readCookie('sintonia_id', 'a=1')).toBeNull();
  });
  it('só aceita uuid de verdade', () => {
    expect(isUuid(id)).toBe(true);
    expect(isUuid('qualquer-coisa')).toBe(false);
    expect(isUuid(null)).toBe(false);
  });
});

describe('sessão salva', () => {
  const report = getDemoReport('pt');
  const session = {
    ...summarize(report),
    id: 'x',
    savedAt: 1,
    version: SAVED_VERSION,
    owner: 'o',
    report,
    hiddenWords: ['jujuba'],
  };
  it('resume nomes, total e período', () => {
    expect(summarize(report)).toMatchObject({
      messages: 116050,
      start: '2019-03-14',
      end: '2026-11-01',
    });
  });
  it('aceita uma sessão completa', () => {
    expect(isUsable(session)).toBe(true);
  });
  it('recusa versão antiga, relatório sem campos e lixo', () => {
    expect(isUsable({ ...session, version: 0 })).toBe(false);
    const old = { ...report, activity: undefined };
    expect(isUsable({ ...session, report: old as unknown as typeof report })).toBe(false);
    expect(isUsable({ ...session, hiddenWords: undefined })).toBe(false);
    expect(isUsable(null)).toBe(false);
    expect(isUsable('texto')).toBe(false);
  });
  it('não guarda nenhum texto de mensagem (só números e datas)', () => {
    expect(JSON.stringify(session.report)).not.toMatch(/"text"/);
  });
});

describe('relatórios antigos', () => {
  it('dicionário sem contagem por pessoa não abre (e não quebra o compartilhamento)', () => {
    const report = getDemoReport('pt');
    const old = { ...report, dictionary: { topWords: ['jujuba'] } } as unknown as typeof report;
    expect(
      isUsable({
        ...summarize(report),
        id: 'x',
        savedAt: 1,
        version: SAVED_VERSION,
        owner: 'o',
        report: old,
        hiddenWords: [],
      }),
    ).toBe(false);
    expect(sharedDictionary(old, ['jujuba'])).toEqual({
      topWords: [],
      own: { A: [], B: [] },
      usage: {},
    });
  });
  it('dicionário sem as listas de cada pessoa também não abre', () => {
    const report = getDemoReport('pt');
    const { own: _own, ...rest } = report.dictionary!;
    void _own;
    const old = { ...report, dictionary: rest } as unknown as typeof report;
    expect(
      isUsable({
        ...summarize(report),
        id: 'x',
        savedAt: 1,
        version: SAVED_VERSION,
        owner: 'o',
        report: old,
        hiddenWords: [],
      }),
    ).toBe(false);
  });
});
