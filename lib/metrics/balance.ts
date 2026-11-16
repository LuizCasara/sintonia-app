import type { Conversation } from '../model';
import type { PerPerson } from './types';

// Equilíbrio: pontos por pessoa.
// TODO(Luiz): implementar. Hoje devolve valores vazios.

// DECISÃO EM ABERTO (Luiz): fórmula dos pontos de equilíbrio (spec §11).
// Nenhuma nota/score é calculada até a fórmula ser decidida e documentada no repo.
export interface BalanceMetrics {
  points: PerPerson<number> | null; // null enquanto a fórmula não existe
}

export function computeBalance(conv: Conversation): BalanceMetrics {
  void conv;
  return { points: null };
}
