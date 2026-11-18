import type { Conversation } from '../model';
import type { PerPerson } from './types';

// Equilíbrio: pontos por pessoa.
// Pendente de decisão: a fórmula fica para o fim da V1 (docs/DECISOES.md). Hoje devolve points: null.

// DECISÃO EM ABERTO (Luiz): fórmula dos pontos de equilíbrio (docs/DECISOES.md).
// Equilíbrio fica separado da nota de Sintonia; as duas fórmulas vão no fim da V1.
// Nenhuma nota/score é calculada até a fórmula ser decidida e documentada no repo.
export interface BalanceMetrics {
  points: PerPerson<number> | null; // null enquanto a fórmula não existe
}

export function computeBalance(conv: Conversation): BalanceMetrics {
  void conv;
  return { points: null };
}
