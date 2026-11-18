import type { Conversation } from '../model';
import type { PerPerson } from './types';

// Conversas (sessões): iniciadas, encerradas, mensagens duplas, sem resposta.
// TODO(Luiz): implementar. Hoje devolve valores vazios.

export interface PersonSessions {
  started: number;
  ended: number;
  doubleMessages: number;
  unanswered: number;
}

export interface SessionsMetrics {
  total: number;
  perPerson: PerPerson<PersonSessions>;
}

const empty: PersonSessions = { started: 0, ended: 0, doubleMessages: 0, unanswered: 0 };

export function computeSessions(conv: Conversation): SessionsMetrics {
  void conv;
  return { total: 0, perPerson: { A: empty, B: empty } };
}
