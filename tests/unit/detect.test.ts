import { describe, expect, it } from 'vitest';
import { detectFormat } from '../../lib/parsers/detect';

describe('detectFormat', () => {
  it('Android pt', () => {
    expect(detectFormat('chat.txt', '15/11/2026 22:10 - Ana: oi')).toBe('whatsapp-android');
  });

  it('Android en', () => {
    expect(detectFormat('chat.txt', '11/15/26, 10:10 PM - Ana: hi')).toBe('whatsapp-android');
  });

  it('iOS', () => {
    expect(detectFormat('_chat.txt', '[15/11/2026, 22:10:05] Ana: oi')).toBe('whatsapp-ios');
  });

  it('Telegram JSON', () => {
    expect(detectFormat('result.json', '{ "name": "Ana", "messages": [] }')).toBe('telegram-json');
  });

  it('desconhecido', () => {
    expect(detectFormat('foto.txt', 'qualquer coisa')).toBe('unknown');
  });
});
