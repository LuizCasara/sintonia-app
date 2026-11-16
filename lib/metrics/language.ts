import type { Conversation } from '../model';
import type { PerPerson } from './types';

// Linguagem: top emojis, risadas, perguntas, desculpas, carinho (usa lexicon.ts).
// TODO(Luiz): implementar. Hoje devolve valores vazios.

export interface PersonLanguage {
  topEmojis: { emoji: string; count: number }[]; // top 5
  laughs: number;
  questions: number;
  apologies: number;
  affection: number;
}

export interface LanguageMetrics {
  perPerson: PerPerson<PersonLanguage>;
}

const empty: PersonLanguage = { topEmojis: [], laughs: 0, questions: 0, apologies: 0, affection: 0 };

export function computeLanguage(conv: Conversation): LanguageMetrics {
  void conv;
  return { perPerson: { A: empty, B: empty } };
}
