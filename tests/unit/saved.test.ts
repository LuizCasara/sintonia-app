import { describe, expect, it } from 'vitest';
import { getDemoReport } from '../../lib/demo';
import { sharedDictionary } from '../../lib/share';
import {
  COOKIE_NAME,
  SAVED_VERSION,
  cookieString,
  isUsable,
  isUuid,
  readCookie,
  summarize,
} from '../../lib/saved';

describe('cookie do navegador', () => {
  const id = '3f2b8c1e-9d4a-4b6e-8a1f-0c7d5e2a9b34';
  it('lê o uuid no meio de outros cookies', () => {
    expect(readCookie(COOKIE_NAME, `a=1; ${COOKIE_NAME}=${id}; b=2`)).toBe(id);
    expect(readCookie(COOKIE_NAME, 'a=1')).toBeNull();
  });
  it('só aceita uuid de verdade', () => {
    expect(isUuid(id)).toBe(true);
    expect(isUuid('qualquer-coisa')).toBe(false);
    expect(isUuid(null)).toBe(false);
  });
  it('dura mais de 1 ano, vale para o site todo e só vai em https quando for o caso', () => {
    const c = cookieString(id, true);
    expect(c).toContain(`${COOKIE_NAME}=${id}`);
    expect(Number(/Max-Age=(\d+)/.exec(c)?.[1])).toBeGreaterThan(365 * 24 * 3600);
    expect(c).toContain('Path=/');
    expect(c).toContain('SameSite=Lax');
    expect(c).toContain('Secure');
    expect(cookieString(id, false)).not.toContain('Secure');
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
    expect(sharedDictionary(old, ['jujuba'])).toEqual({ topWords: [], usage: {} });
  });
});
