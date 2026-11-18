import { round1 } from './util';
import type { SessionsMetrics } from './sessions';
import type { VolumeMetrics } from './volume';

// Equilíbrio: a divisão do esforço entre as duas pessoas (nota de 0 a 10 do casal).
//
// Para cada item, p = parte da Pessoa A (0 a 1). Nota do item: e = 1 - 2·|p - 0,5|.
// 50/50 vale 1; uma pessoa fazendo tudo vale 0. Nota final = média ponderada × 10.
// Itens (docs/DECISOES.md): quem abre as conversas 40%, mensagens 30%, palavras 20%, quem fecha 10%.
// Item sem dados (total zero) sai da conta e os pesos se redistribuem.
// `leaning` = quem puxa mais (média ponderada das partes); null se a diferença for pequena.

export type BalanceItemId = 'opens' | 'messages' | 'words' | 'closes';

export const BALANCE_WEIGHTS: Record<BalanceItemId, number> = {
  opens: 0.4,
  messages: 0.3,
  words: 0.2,
  closes: 0.1,
};

/** Diferença mínima da média ponderada para 50% para dizer que alguém "puxa". */
export const LEANING_MIN = 0.05;

export interface BalanceItem {
  id: BalanceItemId;
  /** Peso já redistribuído entre os itens com dados (soma 1). */
  weight: number;
  /** Parte da Pessoa A, de 0 a 1. */
  shareA: number;
  /** Nota do item, de 0 a 1. */
  score: number;
}

export interface BalanceMetrics {
  /** 0 a 10, uma casa decimal; null sem dados. */
  score: number | null;
  leaning: 'A' | 'B' | null;
  items: BalanceItem[];
}

const share = (a: number, b: number): number | null => (a + b > 0 ? a / (a + b) : null);

export function computeBalance(volume: VolumeMetrics, sessions: SessionsMetrics): BalanceMetrics {
  const v = volume.perPerson;
  const s = sessions.perPerson;
  const shares: Record<BalanceItemId, number | null> = {
    opens: share(s.A.started, s.B.started),
    messages: share(v.A.messages, v.B.messages),
    words: share(v.A.words, v.B.words),
    closes: share(s.A.ended, s.B.ended),
  };

  const present = (Object.keys(shares) as BalanceItemId[]).filter((id) => shares[id] !== null);
  const totalWeight = present.reduce((sum, id) => sum + BALANCE_WEIGHTS[id], 0);
  if (present.length === 0 || totalWeight === 0) return { score: null, leaning: null, items: [] };

  const items: BalanceItem[] = present.map((id) => {
    const p = shares[id]!;
    return {
      id,
      weight: BALANCE_WEIGHTS[id] / totalWeight,
      shareA: p,
      score: 1 - 2 * Math.abs(p - 0.5),
    };
  });
  const score = round1(10 * items.reduce((sum, i) => sum + i.weight * i.score, 0));
  const avgShare = items.reduce((sum, i) => sum + i.weight * i.shareA, 0);
  const leaning = Math.abs(avgShare - 0.5) < LEANING_MIN ? null : avgShare > 0.5 ? 'A' : 'B';
  return { score, leaning, items };
}
