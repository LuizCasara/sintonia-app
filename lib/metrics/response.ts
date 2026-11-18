import type { Conversation } from '../model';
import type { PerPerson } from './types';

// Resposta: tempo médio da primeira resposta, taxa em até 10 min.
// TODO(Luiz): implementar. Hoje devolve valores vazios.

export interface PersonResponse {
  avgFirstResponseSec: number;
  rateWithin10Min: number; // 0 a 1
}

export interface ResponseMetrics {
  perPerson: PerPerson<PersonResponse>;
}

const empty: PersonResponse = { avgFirstResponseSec: 0, rateWithin10Min: 0 };

export function computeResponse(conv: Conversation): ResponseMetrics {
  void conv;
  return { perPerson: { A: empty, B: empty } };
}
