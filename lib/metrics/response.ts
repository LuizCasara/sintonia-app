import type { Conversation } from '../model';
import type { PerPerson } from './types';
import { splitSessions } from './sessions';
import { median, talk, type Who } from './util';

// Resposta: tempo da primeira resposta (média, mediana) e taxa em até 10 min.
// "Primeira resposta" = primeira mensagem de uma pessoa depois que a outra falou, medida a partir
// da última mensagem da outra. Só dentro da mesma sessão (menos de 6 h de intervalo).
// A mediana é a base da nota de Sintonia: uma resposta de 5 h puxa a média, mas não a mediana.

export interface PersonResponse {
  avgFirstResponseSec: number;
  medianFirstResponseSec: number;
  rateWithin10Min: number; // 0 a 1
}

export interface ResponseMetrics {
  perPerson: PerPerson<PersonResponse>;
}

/** Uma resposta: quando foi dada, por quem, e quantos segundos depois da mensagem respondida. */
export interface Reply {
  ts: number;
  who: Who;
  sec: number;
}

const TEN_MIN_SEC = 10 * 60;

/** Todas as respostas da conversa, em ordem de tempo. */
export function collectReplies(conv: Conversation): Reply[] {
  const out: Reply[] = [];
  for (const s of splitSessions(talk(conv))) {
    for (let i = 1; i < s.length; i++) {
      const [prev, cur] = [s[i - 1]!, s[i]!];
      if (prev.authorId === cur.authorId) continue;
      out.push({ ts: cur.ts, who: cur.authorId, sec: (cur.ts - prev.ts) / 1000 });
    }
  }
  return out;
}

export function computeResponse(replies: Reply[]): ResponseMetrics {
  const of = (who: Who): PersonResponse => {
    const secs = replies.filter((r) => r.who === who).map((r) => r.sec);
    if (secs.length === 0) {
      return { avgFirstResponseSec: 0, medianFirstResponseSec: 0, rateWithin10Min: 0 };
    }
    return {
      avgFirstResponseSec: Math.round(secs.reduce((s, x) => s + x, 0) / secs.length),
      medianFirstResponseSec: Math.round(median(secs)),
      rateWithin10Min: secs.filter((x) => x <= TEN_MIN_SEC).length / secs.length,
    };
  };
  return { perPerson: { A: of('A'), B: of('B') } };
}
