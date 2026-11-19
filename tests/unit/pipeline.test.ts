import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { defaultMapping } from '../../lib/merge';
import {
  AnalyzeError,
  analyze,
  errorCode,
  inspect,
  type InputFile,
  type Step,
} from '../../lib/pipeline';

const file = (name: string, content: string): InputFile => {
  const bytes = new TextEncoder().encode(content);
  return { name, data: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) };
};
const fx = (p: string) =>
  file(p.split('/').pop()!, readFileSync(join(__dirname, '../../fixtures', p), 'utf8'));

describe('inspect', () => {
  it('um app e 2 autores: não precisa de confirmação', () => {
    const r = inspect([fx('whatsapp/android-pt.txt')]);
    expect(r.sources).toEqual(['whatsapp']);
    expect(r.people).toHaveLength(2);
    expect(r.needsConfirm).toBe(false);
    expect(Object.values(r.mapping).sort()).toEqual(['A', 'B']);
  });

  it('dois apps: precisa confirmar, e o Telegram é pareado com o WhatsApp', () => {
    const r = inspect([fx('whatsapp/android-pt.txt'), fx('telegram/result.json')]);
    expect(r.needsConfirm).toBe(true);
    expect(r.people).toHaveLength(2);
    expect(r.people.every((p) => p.names.length === 2)).toBe(true);
  });

  it('mais de 2 autores: precisa confirmar e só 2 entram no mapping', () => {
    const txt = [
      '15/11/2026 22:10 - Ana: oi',
      '15/11/2026 22:11 - Bruno: oi',
      '15/11/2026 22:12 - Carla: oi',
      '15/11/2026 22:13 - Ana: oi',
    ].join('\n');
    const r = inspect([file('grupo.txt', txt)]);
    expect(r.needsConfirm).toBe(true);
    expect(Object.keys(defaultMapping(r.people))).toHaveLength(2);
  });

  it('erros com código: zip, formato desconhecido, uma pessoa só', () => {
    const code = (fn: () => unknown) => {
      try {
        fn();
      } catch (e) {
        return errorCode(e);
      }
    };
    expect(code(() => inspect([file('conversa.zip', 'PK')]))).toBe('zip');
    expect(code(() => inspect([zip('vazio.zip', { 'foto.jpg': 'x' })]))).toBe('zip');
    expect(code(() => inspect([file('foto.txt', 'não é uma conversa')]))).toBe('unknownFormat');
    expect(code(() => inspect([file('x.json', '{quebrado')]))).toBe('unknownFormat');
    expect(code(() => inspect([file('so.txt', '15/11/2026 22:10 - Ana: oi')]))).toBe(
      'needTwoPeople',
    );
    expect(errorCode(new Error('outra coisa'))).toBeNull();
    expect(new AnalyzeError('zip').message).toBe('zip');
  });
});

/** Monta um .zip em memória com os arquivos dados. */
function zip(name: string, entries: Record<string, string | Uint8Array>): InputFile {
  const raw = zipSync(
    Object.fromEntries(
      Object.entries(entries).map(([k, v]) => [
        k,
        typeof v === 'string' ? new TextEncoder().encode(v) : new Uint8Array(v),
      ]),
    ),
  );
  return {
    name,
    data: raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength) as ArrayBuffer,
  };
}

describe('.zip', () => {
  const chat = readFileSync(join(__dirname, '../../fixtures/whatsapp/android-pt.txt'));
  it('abre o .zip do WhatsApp e lê o _chat.txt de dentro, ignorando mídia e lixo do macOS', () => {
    const z = zip('WhatsApp Chat.zip', {
      '_chat.txt': chat,
      'IMG-0001.jpg': 'binario',
      '__MACOSX/._chat.txt': 'lixo',
    });
    const r = inspect([z]);
    expect(r.people).toHaveLength(2);
    expect(r.needsConfirm).toBe(false);
  });
  it('dá o mesmo relatório que o .txt solto', () => {
    const mapping = inspect([file('a.txt', chat.toString('utf-8'))]).mapping;
    const solto = analyze([file('a.txt', chat.toString('utf-8'))], mapping);
    const zipado = analyze([zip('a.zip', { '_chat.txt': chat })], mapping);
    expect(zipado).toEqual(solto);
  });
});

describe('analyze', () => {
  it('devolve o relatório com os nomes reais e avança pelas 4 etapas em ordem', () => {
    const files = [fx('whatsapp/android-pt.txt'), fx('telegram/result.json')];
    const { mapping } = inspect(files);
    const steps: Step[] = [];
    const report = analyze(files, mapping, (s) => {
      if (steps[steps.length - 1] !== s) steps.push(s);
    });
    expect(steps).toEqual(['read', 'parse', 'merge', 'metrics']);
    expect([report.people.A, report.people.B].sort()).toEqual(['Ana Lima', 'Bruno Reis']);
    expect(report.volume.perPerson.A.messages).toBeGreaterThan(0);
    expect(report.apps.perYear.length).toBeGreaterThan(0);
    expect(report.apps.perYear[0]?.telegramPct).toBeGreaterThan(0);
    expect(report.period.start).not.toBe('');
  });

  it('mapping sem uma das pessoas dá needTwoPeople', () => {
    const files = [fx('whatsapp/android-pt.txt')];
    const { mapping } = inspect(files);
    const only = Object.fromEntries(Object.entries(mapping).filter(([, v]) => v === 'A'));
    expect(() => analyze(files, only)).toThrow('needTwoPeople');
  });

  it('o relatório não carrega o texto das mensagens', () => {
    const files = [fx('whatsapp/android-pt.txt')];
    const json = JSON.stringify(analyze(files, inspect(files).mapping));
    expect(json).not.toContain('me liga quando puder');
    expect(json).not.toContain('chego em 10 minutos');
  });
});
