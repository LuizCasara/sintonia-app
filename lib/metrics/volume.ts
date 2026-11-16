import type { Conversation } from '../model';
import type { PerPerson } from './types';

// Volume: mensagens, palavras, caracteres, palavras únicas, por pessoa e por mês.
// TODO(Luiz): implementar. Hoje devolve valores vazios.

export interface PersonVolume {
  messages: number;
  words: number;
  characters: number;
  uniqueWords: number;
}

export interface VolumeMetrics {
  perPerson: PerPerson<PersonVolume>;
  /** Mensagens por mês ("2026-11"), por pessoa e por app. */
  perMonth: { month: string; A: number; B: number; whatsapp: number; telegram: number }[];
}

const empty: PersonVolume = { messages: 0, words: 0, characters: 0, uniqueWords: 0 };

export function computeVolume(conv: Conversation): VolumeMetrics {
  void conv;
  return { perPerson: { A: empty, B: empty }, perMonth: [] };
}
