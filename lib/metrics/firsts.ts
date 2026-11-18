import { I_LOVE_YOU } from '../lexicon';
import type { Conversation } from '../model';
import { foldLexeme, isoDay, phraseTester, talk } from './util';

// Primeiras vezes: primeira mensagem, "te amo", foto, áudio.

/** Datas ISO ("2026-11-15") ou null se nunca aconteceu. */
export interface FirstsMetrics {
  firstMessage: string | null;
  firstILoveYou: string | null;
  firstPhoto: string | null;
  firstAudio: string | null;
}

const isLove = phraseTester([...I_LOVE_YOU.pt, ...I_LOVE_YOU.en]);

export function computeFirsts(conv: Conversation): FirstsMetrics {
  const out: FirstsMetrics = {
    firstMessage: null,
    firstILoveYou: null,
    firstPhoto: null,
    firstAudio: null,
  };
  // As mensagens já vêm ordenadas por ts: a primeira que bate é a primeira vez.
  for (const m of talk(conv)) {
    out.firstMessage ??= isoDay(m.ts);
    if (m.kind === 'image') out.firstPhoto ??= isoDay(m.ts);
    if (m.kind === 'audio') out.firstAudio ??= isoDay(m.ts);
    if (m.kind === 'text' && m.text && out.firstILoveYou === null && isLove(foldLexeme(m.text))) {
      out.firstILoveYou = isoDay(m.ts);
    }
  }
  return out;
}
