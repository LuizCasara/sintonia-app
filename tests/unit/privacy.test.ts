import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Spec §9: o código que processa as conversas nunca faz requisição de rede.
const FORBIDDEN = /\b(fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon)\b/;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return path.endsWith('.ts') ? [path] : [];
  });
}

// Tira os comentários para o teste não reclamar de texto como "NUNCA faz fetch".
const stripComments = (code: string) =>
  code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

describe('privacidade', () => {
  const root = join(__dirname, '../..');
  const files = [...sourceFiles(join(root, 'lib')), ...sourceFiles(join(root, 'workers'))];

  it('encontra os arquivos de lib/ e workers/', () => {
    expect(files.length).toBeGreaterThan(10);
  });

  it.each(files.map((f) => [f.replace(root + '/', ''), f]))('%s não usa rede', (_name, file) => {
    const code = stripComments(readFileSync(file as string, 'utf8'));
    expect(code).not.toMatch(FORBIDDEN);
  });
});
