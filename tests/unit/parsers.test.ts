import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseTelegram } from '../../lib/parsers/telegram';
import { WA_WARNINGS, guessDateOrder, parseWhatsApp } from '../../lib/parsers/whatsapp';

const fx = (p: string) => readFileSync(join(__dirname, '../../fixtures', p), 'utf8');
const utc = (y: number, mo: number, d: number, h: number, mi: number, s = 0) =>
  Date.UTC(y, mo - 1, d, h, mi, s);

describe('parseWhatsApp', () => {
  it('lê o Android pt das fixtures', () => {
    const chat = parseWhatsApp(fx('whatsapp/android-pt.txt'));
    expect(chat.source).toBe('whatsapp');
    expect(chat.authors.sort()).toEqual(['Ana Lima', 'Bruno Reis']);
    expect(chat.messages[0]).toMatchObject({ kind: 'system', authorName: '' });
    expect(chat.messages[1]).toMatchObject({
      authorName: 'Bruno Reis',
      kind: 'image',
      ts: utc(2026, 1, 5, 23, 43),
    });
    expect(chat.warnings).toEqual([]);
  });

  it('lê o Android en (M/D/AA e AM/PM)', () => {
    const chat = parseWhatsApp(fx('whatsapp/android-en.txt'));
    expect(chat.messages[1]?.ts).toBe(utc(2026, 1, 5, 23, 43));
    expect(chat.messages.find((m) => m.text === 'hi, how are you?')).toBeDefined();
    expect(chat.messages[0]?.ts).toBe(utc(2026, 1, 5, 0, 0)); // 12:00 AM
  });

  it('lê o iOS e distingue o tipo da mídia', () => {
    const chat = parseWhatsApp(fx('whatsapp/ios-pt.txt'));
    expect(chat.messages[0]).toMatchObject({ kind: 'image', ts: utc(2026, 1, 5, 23, 43, 9) });
    expect(chat.messages.some((m) => m.kind === 'audio')).toBe(true);
  });

  it('junta linhas sem cabeçalho na mensagem anterior', () => {
    const chat = parseWhatsApp(
      '15/11/2026 22:10 - Ana: primeira linha\nsegunda linha\n15/11/2026 22:11 - Bruno: oi',
    );
    expect(chat.messages).toHaveLength(2);
    expect(chat.messages[0]?.text).toBe('primeira linha\nsegunda linha');
  });

  it('link vira kind link, não text', () => {
    const chat = parseWhatsApp('15/11/2026 22:10 - Ana: olha https://exemplo.com/x');
    expect(chat.messages[0]?.kind).toBe('link');
  });

  it('mensagem apagada e aviso do sistema', () => {
    const chat = parseWhatsApp(
      '15/11/2026 22:10 - Ana: Esta mensagem foi apagada\n15/11/2026 22:11 - Ana criou o grupo',
    );
    expect(chat.messages[0]?.kind).toBe('deleted');
    expect(chat.messages[1]?.kind).toBe('system');
  });

  it('respeita dateOrder e avisa quando adivinha', () => {
    const txt = '01/02/2026 10:00 - Ana: oi\n01/02/2026 10:05 - Bruno: oi';
    expect(parseWhatsApp(txt, { dateOrder: 'MDY' }).messages[0]?.ts).toBe(utc(2026, 1, 2, 10, 0));
    const guessed = parseWhatsApp(txt);
    expect(guessed.messages[0]?.ts).toBe(utc(2026, 2, 1, 10, 0));
    expect(guessed.warnings).toContain(WA_WARNINGS.dateOrderDefault);
  });

  it('texto vazio não quebra', () => {
    expect(parseWhatsApp('').messages).toEqual([]);
  });
});

describe('guessDateOrder', () => {
  it('valor acima de 12 é o dia', () => {
    expect(guessDateOrder(['15/11/2026'])).toBe('DMY');
    expect(guessDateOrder(['11/15/2026'])).toBe('MDY');
  });
  it('sem valor acima de 12, o número que muda mais é o dia', () => {
    expect(guessDateOrder(['01/05/26', '02/05/26', '03/05/26'])).toBe('DMY');
    expect(guessDateOrder(['5/01/26', '5/02/26', '5/03/26'])).toBe('MDY');
  });
  it('empate vira DMY', () => {
    expect(guessDateOrder(['01/02/26'])).toBe('DMY');
  });
});

describe('parseTelegram', () => {
  it('lê o result.json das fixtures', () => {
    const chat = parseTelegram(JSON.parse(fx('telegram/result.json')));
    expect(chat.authors.sort()).toEqual(['Ana Lima', 'Bruno Reis']);
    expect(chat.messages[0]).toMatchObject({
      authorName: 'Bruno Reis',
      kind: 'text',
      ts: utc(2026, 2, 7, 19, 49, 9),
    });
    expect(chat.messages[1]).toMatchObject({ kind: 'audio', durationSec: 65 });
  });

  it('texto em array: junta as partes e detecta link', () => {
    const chat = parseTelegram({
      messages: [
        {
          id: 1,
          type: 'message',
          date: '2026-01-01T10:00:00',
          from: 'Ana',
          text: ['olha ', { type: 'link', text: 'https://a.com' }],
        },
        {
          id: 2,
          type: 'message',
          date: '2026-01-01T10:01:00',
          from: 'Ana',
          text: ['oi ', { type: 'bold', text: 'você' }],
        },
      ],
    });
    expect(chat.messages[0]).toMatchObject({ kind: 'link', text: 'olha https://a.com' });
    expect(chat.messages[1]).toMatchObject({ kind: 'text', text: 'oi você' });
  });

  it('foto, sticker, gif e serviço', () => {
    const base = { type: 'message', date: '2026-01-01T10:00:00', from: 'Ana', text: '' };
    const chat = parseTelegram({
      messages: [
        { ...base, id: 1, photo: 'p.jpg' },
        { ...base, id: 2, media_type: 'sticker' },
        { ...base, id: 3, media_type: 'animation' },
        { id: 4, type: 'service', date: '2026-01-01T10:00:00', text: '' },
      ],
    });
    expect(chat.messages.map((m) => m.kind)).toEqual(['image', 'sticker', 'gif', 'system']);
  });

  it('entrada inválida não quebra', () => {
    expect(parseTelegram(null).messages).toEqual([]);
    expect(parseTelegram({}).warnings.length).toBeGreaterThan(0);
  });
});
