import { AFFECTION, APOLOGIES, LAUGHS } from '../lexicon';
import type { Conversation } from '../model';
import type { PerPerson } from './types';
import { foldLexeme, perPerson, phraseCounter, talk } from './util';

// Linguagem: top emojis, risadas, perguntas, desculpas, carinho (usa lexicon.ts).
// - topEmojis: só emojis escritos em mensagens de texto e link (figurinhas e reações ficam de fora).
// - laughs/apologies/affection: quantas vezes aparecem (pt e en juntos, o idioma do export é incerto).
// - questions: mensagens com "?".

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

const EMOJI =
  /\p{Extended_Pictographic}(?:\ufe0f|[\u{1F3FB}-\u{1F3FF}]|\u200d\p{Extended_Pictographic}\ufe0f?)*/gu;

// Risadas de tamanho livre, além da lista ("kkkkkkkkkkkkkk", "hahahahahaha", "rsrsrs").
const countLaughs = phraseCounter(
  [...LAUGHS.pt, ...LAUGHS.en],
  ['k{2,}', '(?:ha|he){2,}h?', '(?:rs){2,}'],
);
const countApologies = phraseCounter([...APOLOGIES.pt, ...APOLOGIES.en]);
const countAffection = phraseCounter([...AFFECTION.pt, ...AFFECTION.en]);

/** ❤ e ❤️ são o mesmo emoji: guardamos sem o seletor e devolvemos com ele quando precisa. */
function display(key: string): string {
  const cp = key.codePointAt(0) ?? 0;
  const single = [...key].length === 1;
  return single && cp < 0x1f000 && !/\p{Emoji_Presentation}/u.test(key) ? key + '\ufe0f' : key;
}

export function computeLanguage(conv: Conversation): LanguageMetrics {
  const emojis = perPerson(() => new Map<string, number>());
  const per = perPerson<PersonLanguage>(() => ({
    topEmojis: [],
    laughs: 0,
    questions: 0,
    apologies: 0,
    affection: 0,
  }));

  for (const m of talk(conv)) {
    if ((m.kind !== 'text' && m.kind !== 'link') || !m.text) continue;
    const p = per[m.authorId];
    if (m.text.includes('?')) p.questions++;
    for (const e of m.text.match(EMOJI) ?? []) {
      const cp = e.codePointAt(0);
      if (cp === 0xa9 || cp === 0xae) continue; // © e ® não são emoji de conversa
      const key = e.replace(/\ufe0f/g, '');
      emojis[m.authorId].set(key, (emojis[m.authorId].get(key) ?? 0) + 1);
    }
    if (m.kind === 'text') {
      const folded = foldLexeme(m.text);
      p.laughs += countLaughs(folded);
      p.apologies += countApologies(folded);
      p.affection += countAffection(folded);
    }
  }
  for (const w of ['A', 'B'] as const) {
    per[w].topEmojis = [...emojis[w].entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 5)
      .map(([key, count]) => ({ emoji: display(key), count }));
  }
  return { perPerson: per };
}
