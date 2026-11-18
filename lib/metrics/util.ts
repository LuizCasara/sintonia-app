import { foldLexeme } from '../lexicon';
import type { Conversation, Message } from '../model';
import type { PerPerson } from './types';

export type Who = 'A' | 'B';
/** Mensagem escrita por uma das duas pessoas (sem sistema, sem terceiros). */
export type Talk = Message & { authorId: Who };

const DAY_MS = 86_400_000;

/** Só as mensagens do casal, na ordem em que estão na conversa (já ordenada por ts). */
export function talk(conv: Conversation): Talk[] {
  return conv.messages.filter(
    (m): m is Talk => (m.authorId === 'A' || m.authorId === 'B') && m.kind !== 'system',
  );
}

/** `ts` guarda o relógio local como se fosse UTC, então os getters UTC dão a hora local. */
export const isoDay = (ts: number): string => new Date(ts).toISOString().slice(0, 10);
export const monthKey = (ts: number): string => isoDay(ts).slice(0, 7);
export const dayNumber = (ts: number): number => Math.floor(ts / DAY_MS);
export const yearOf = (ts: number): number => new Date(ts).getUTCFullYear();

export function perPerson<T>(make: () => T): PerPerson<T> {
  return { A: make(), B: make() };
}

/** Meses ("2026-01") de `from` a `to`, inclusive, sem buracos. */
export function monthRange(from: string, to: string): string[] {
  const out: string[] = [];
  let y = Number(from.slice(0, 4));
  let m = Number(from.slice(5, 7));
  const [ty, tm] = [Number(to.slice(0, 4)), Number(to.slice(5, 7))];
  while (y < ty || (y === ty && m <= tm)) {
    out.push(`${y}-${String(m).padStart(2, '0')}`);
    if (++m > 12) {
      m = 1;
      y++;
    }
  }
  return out;
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const BEFORE = String.raw`(?<![\p{L}\p{N}])`;
const AFTER = String.raw`(?![\p{L}\p{N}])`;

function alternation(phrases: string[], rawPatterns: string[]): string {
  const parts = [...new Set(phrases)]
    .sort((a, b) => b.length - a.length)
    .map((p) => escapeRe(p).replace(/\s+/g, String.raw`\s+`));
  return `${BEFORE}(?:${[...parts, ...rawPatterns].join('|')})${AFTER}`;
}

/**
 * Conta quantas vezes as frases aparecem num texto já passado por foldLexeme.
 * `rawPatterns` são pedaços de regex extras (ex.: risadas de tamanho livre).
 */
export function phraseCounter(
  phrases: string[],
  rawPatterns: string[] = [],
): (folded: string) => number {
  const re = new RegExp(alternation(phrases, rawPatterns), 'gu');
  return (folded) => folded.match(re)?.length ?? 0;
}

/** Diz se alguma das frases aparece no texto (já passado por foldLexeme). */
export function phraseTester(phrases: string[]): (folded: string) => boolean {
  const re = new RegExp(alternation(phrases, []), 'u');
  return (folded) => re.test(folded);
}

export { foldLexeme };
