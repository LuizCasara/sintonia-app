import type { Conversation } from '../model';

// Primeiras vezes: primeira mensagem, "te amo", foto, áudio.
// TODO(Luiz): implementar. Hoje devolve valores vazios.

/** Datas ISO ("2026-11-15") ou null se nunca aconteceu. */
export interface FirstsMetrics {
  firstMessage: string | null;
  firstILoveYou: string | null;
  firstPhoto: string | null;
  firstAudio: string | null;
}

export function computeFirsts(conv: Conversation): FirstsMetrics {
  void conv;
  return { firstMessage: null, firstILoveYou: null, firstPhoto: null, firstAudio: null };
}
