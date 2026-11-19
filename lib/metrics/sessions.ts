import { SESSION_GAP_MS, type Conversation } from '../model';
import type { PerPerson } from './types';
import { perPerson, talk, type Talk } from './util';

// Conversas (sessões): iniciadas, encerradas, mensagens duplas, sem resposta.
// Sessão = mensagens separadas por menos de 6 h (SESSION_GAP_MS).
// - started/ended: quem escreveu a primeira/última mensagem da sessão.
// - doubleMessages: mensagens que seguem outra da mesma pessoa, dentro da sessão.
// - unanswered: sessões em que só uma pessoa escreveu (conta para ela).

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

/** Quebra as mensagens do casal em sessões. */
export function splitSessions(messages: Talk[]): Talk[][] {
  const sessions: Talk[][] = [];
  let current: Talk[] = [];
  for (const m of messages) {
    const prev = current[current.length - 1];
    if (prev && m.ts - prev.ts >= SESSION_GAP_MS) {
      sessions.push(current);
      current = [];
    }
    current.push(m);
  }
  if (current.length > 0) sessions.push(current);
  return sessions;
}

export function computeSessions(conv: Conversation): SessionsMetrics {
  const per = perPerson<PersonSessions>(() => ({
    started: 0,
    ended: 0,
    doubleMessages: 0,
    unanswered: 0,
  }));
  const sessions = splitSessions(talk(conv));
  for (const s of sessions) {
    const first = s[0];
    const last = s[s.length - 1];
    if (!first || !last) continue;
    per[first.authorId].started++;
    per[last.authorId].ended++;
    for (let i = 1; i < s.length; i++) {
      if (s[i]?.authorId === s[i - 1]?.authorId) per[s[i]!.authorId].doubleMessages++;
    }
    if (s.every((m) => m.authorId === first.authorId)) per[first.authorId].unanswered++;
  }
  return { total: sessions.length, perPerson: per };
}
