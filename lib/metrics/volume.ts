import type { Conversation } from '../model';
import type { PerPerson } from './types';
import { monthKey, monthRange, perPerson, talk } from './util';

// Volume: mensagens, palavras, caracteres, palavras únicas, por pessoa e por mês.
// Mensagens `link` entram na contagem de mensagens, mas palavras/caracteres delas não contam como texto.

export interface PersonVolume {
  messages: number;
  words: number;
  characters: number;
  uniqueWords: number;
}

export interface VolumeMetrics {
  perPerson: PerPerson<PersonVolume>;
  /** Mensagens por mês ("2026-11"), por pessoa e por app. Meses sem mensagem entram com zero. */
  perMonth: { month: string; A: number; B: number; whatsapp: number; telegram: number }[];
}

/** Palavras = sequências de letras/números (com apóstrofo e hífen no meio), em minúsculas. */
export const WORD = /[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu;

export function computeVolume(conv: Conversation): VolumeMetrics {
  const per = perPerson<PersonVolume>(() => ({
    messages: 0,
    words: 0,
    characters: 0,
    uniqueWords: 0,
  }));
  const unique = perPerson(() => new Set<string>());
  const months = new Map<string, { A: number; B: number; whatsapp: number; telegram: number }>();

  for (const m of talk(conv)) {
    const p = per[m.authorId];
    p.messages++;
    if (m.kind === 'text' && m.text) {
      const words = m.text.toLowerCase().match(WORD);
      if (words) {
        p.words += words.length;
        for (const w of words) unique[m.authorId].add(w);
      }
      p.characters += [...m.text].length;
    }
    const key = monthKey(m.ts);
    let row = months.get(key);
    if (!row) months.set(key, (row = { A: 0, B: 0, whatsapp: 0, telegram: 0 }));
    row[m.authorId]++;
    row[m.source]++;
  }
  per.A.uniqueWords = unique.A.size;
  per.B.uniqueWords = unique.B.size;

  const keys = [...months.keys()].sort();
  const first = keys[0];
  const last = keys[keys.length - 1];
  const perMonth =
    first && last
      ? monthRange(first, last).map((month) => ({
          month,
          ...(months.get(month) ?? { A: 0, B: 0, whatsapp: 0, telegram: 0 }),
        }))
      : [];
  return { perPerson: per, perMonth };
}
