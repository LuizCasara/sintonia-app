import { describe, expect, it } from 'vitest';
import { mappingKey, mergeChats, nameSimilarity, normalizeName, suggestPeople } from '../../lib/merge';
import type { ParsedChat, RawMessage } from '../../lib/model';

const msg = (authorName: string, ts: number, extra: Partial<RawMessage> = {}): RawMessage => ({
  ts,
  source: 'whatsapp',
  kind: 'text',
  authorName,
  ...extra,
});

const wa: ParsedChat = {
  source: 'whatsapp',
  authors: ['Ana Lima', 'Bruno Reis'],
  warnings: [],
  messages: [
    msg('Ana Lima', 1000),
    msg('Ana Lima', 3000),
    msg('Bruno Reis', 2000),
    msg('', 500, { kind: 'system' }),
  ],
};
const tg: ParsedChat = {
  source: 'telegram',
  authors: ['Ana L.', 'Bruno', 'Canal de promoções'],
  warnings: [],
  messages: [
    msg('Ana L.', 1500, { source: 'telegram' }),
    msg('Bruno', 2500, { source: 'telegram' }),
    msg('Bruno', 2600, { source: 'telegram' }),
    msg('Canal de promoções', 2700, { source: 'telegram' }),
  ],
};

describe('nameSimilarity', () => {
  it('ignora acento, caixa e pontuação', () => {
    expect(normalizeName('  José  da Silva! ')).toBe('jose da silva');
    expect(nameSimilarity('José', 'jose')).toBe(1);
  });
  it('nome abreviado é parecido; nome diferente não', () => {
    expect(nameSimilarity('Ana Lima', 'Ana L.')).toBeGreaterThanOrEqual(0.8);
    expect(nameSimilarity('Bruno Reis', 'Bruno')).toBeGreaterThanOrEqual(0.8);
    expect(nameSimilarity('Ana Lima', 'Bruno')).toBeLessThan(0.5);
    expect(nameSimilarity('Ana Lima', 'Canal de promoções')).toBeLessThan(0.5);
  });
});

describe('suggestPeople', () => {
  it('pareia os nomes entre apps e deixa o resto sem par', () => {
    const s = suggestPeople([wa, tg]);
    expect(s).toHaveLength(3);
    expect(s[0]?.names.map((n) => n.name)).toEqual(['Ana Lima', 'Ana L.']);
    expect(s[1]?.names.map((n) => n.name)).toEqual(['Bruno Reis', 'Bruno']);
    expect(s[1]?.names[1]).toMatchObject({ source: 'telegram', messageCount: 2 });
    expect(s[2]?.names.map((n) => n.name)).toEqual(['Canal de promoções']);
    expect(s[2]?.score).toBe(0);
  });
  it('um app só: um nome por sugestão, mais volumoso primeiro', () => {
    const s = suggestPeople([wa]);
    expect(s.map((x) => x.names[0]?.name)).toEqual(['Ana Lima', 'Bruno Reis']);
  });
  it('sem chats, sem sugestões', () => {
    expect(suggestPeople([])).toEqual([]);
  });
});

describe('mergeChats', () => {
  const mapping = {
    'Ana Lima': 'A',
    'Ana L.': 'A',
    [mappingKey('whatsapp', 'Bruno Reis')]: 'B',
    Bruno: 'B',
  } as const;

  it('junta, ordena por ts e aplica o mapping', () => {
    const conv = mergeChats([wa, tg], mapping);
    expect(conv.messages.map((m) => m.ts)).toEqual([500, 1000, 1500, 2000, 2500, 2600, 2700, 3000]);
    expect(conv.messages.map((m) => m.authorId)).toEqual([
      'other',
      'A',
      'A',
      'B',
      'B',
      'B',
      'other', // canal fora do mapping
      'A',
    ]);
    expect(conv.sources).toEqual(['whatsapp', 'telegram']);
    expect(conv.messages.every((m) => !('authorName' in m))).toBe(true);
  });

  it('monta people com o nome mais usado e os aliases', () => {
    const conv = mergeChats([wa, tg], mapping);
    expect(conv.people[0].displayName).toBe('Ana Lima');
    expect(conv.people[1].displayName).toBe('Bruno'); // 2 msgs no Telegram contra 1 no WhatsApp
    expect(conv.people[0].aliases).toEqual([
      { source: 'whatsapp', name: 'Ana Lima' },
      { source: 'telegram', name: 'Ana L.' },
    ]);
  });

  it('sistema nunca vira A ou B', () => {
    const conv = mergeChats([wa], { '': 'A', 'Ana Lima': 'A', 'Bruno Reis': 'B' });
    expect(conv.messages[0]?.authorId).toBe('other');
  });
});
