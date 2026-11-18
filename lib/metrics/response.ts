import type { Conversation } from '../model';
import type { PerPerson } from './types';
import { talk } from './util';
import { splitSessions } from './sessions';

// Resposta: tempo médio da primeira resposta, taxa em até 10 min.
// "Primeira resposta" = primeira mensagem de uma pessoa depois que a outra falou, medida a partir
// da última mensagem da outra. Só dentro da mesma sessão (menos de 6 h de intervalo).

export interface PersonResponse {
  avgFirstResponseSec: number;
  rateWithin10Min: number; // 0 a 1
}

export interface ResponseMetrics {
  perPerson: PerPerson<PersonResponse>;
}

const TEN_MIN_MS = 10 * 60 * 1000;

export function computeResponse(conv: Conversation): ResponseMetrics {
  const sum = { A: 0, B: 0 };
  const count = { A: 0, B: 0 };
  const quick = { A: 0, B: 0 };

  for (const s of splitSessions(talk(conv))) {
    for (let i = 1; i < s.length; i++) {
      const [prev, cur] = [s[i - 1]!, s[i]!];
      if (prev.authorId === cur.authorId) continue;
      const delta = cur.ts - prev.ts;
      sum[cur.authorId] += delta;
      count[cur.authorId]++;
      if (delta <= TEN_MIN_MS) quick[cur.authorId]++;
    }
  }
  const of = (w: 'A' | 'B'): PersonResponse => ({
    avgFirstResponseSec: count[w] ? Math.round(sum[w] / count[w] / 1000) : 0,
    rateWithin10Min: count[w] ? quick[w] / count[w] : 0,
  });
  return { perPerson: { A: of('A'), B: of('B') } };
}
