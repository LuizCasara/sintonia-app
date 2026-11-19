import type { LanguageMetrics } from './language';
import type { Reply } from './response';
import type { SessionsMetrics } from './sessions';
import { clamp01, median, round1, yearOf } from './util';
import type { VolumeMetrics } from './volume';

// Sintonia: se a conversa flui (nota de 0 a 10 do casal), em 3 partes (docs/DECISOES.md).
//
// - Reciprocidade (40%): conversas em que as DUAS pessoas falaram. Conversa sem resposta = só uma
//   pessoa escreveu. A nota da parte cai linearmente de 1 (nenhuma sem resposta) a 0 (a partir de
//   RECIPROCITY_CEIL das conversas sem resposta).
// - Tempo de resposta (40%): MEDIANA do tempo de resposta (as duas pessoas juntas), em escala
//   logarítmica: até 10 min vale 1, a partir de 3 h vale 0.
// - Tom (20%): parte das mensagens de texto com carinho ou risada, com teto (TONE_CAP) para que
//   rir demais não infle a nota. Desculpa não entra: sinaliza conflito, não calor.
// Nota final = média ponderada × 10. Parte sem dados sai da conta (pesos se redistribuem).
// Histórico curto (menos de 500 mensagens ou 3 meses) não recebe nota: reason = 'short'.
//
// Evolução por ano (perYear): a mediana de resposta de cada ano contra a mediana do PRÓPRIO casal.
// Não é uma nota: mostra "neste ano vocês responderam mais devagar que de costume".

export type SintoniaPartId = 'reciprocity' | 'responseTime' | 'tone';

export const SINTONIA_WEIGHTS: Record<SintoniaPartId, number> = {
  reciprocity: 0.4,
  responseTime: 0.4,
  tone: 0.2,
};

export const RESPONSE_FAST_SEC = 10 * 60;
export const RESPONSE_SLOW_SEC = 3 * 60 * 60;
/** Constantes a calibrar com exports reais (valores iniciais). */
export const RECIPROCITY_CEIL = 0.25;
export const TONE_CAP = 0.2;

export const MIN_MESSAGES = 500;
export const MIN_MONTHS = 3;
/** Respostas mínimas num ano para mostrar a evolução dele. */
export const YEAR_MIN_REPLIES = 30;
/** Diferença mínima (s) entre o ano e o ritmo habitual para contar como mudança: 44 s → 72 s não é "64% mais lento". */
export const PACE_MIN_DELTA_SEC = 120;
/** ...e a proporção também precisa ser pequena: 30 s → 140 s é 4,7 vezes mais lento, mesmo com só 110 s de diferença. */
export const PACE_MAX_RATIO = 2;

export interface SintoniaPart {
  id: SintoniaPartId;
  /** Peso já redistribuído entre as partes com dados (soma 1). */
  weight: number;
  /** Nota da parte, de 0 a 1. */
  score: number;
  /** Valor medido: reciprocity = fração de conversas com resposta; responseTime = mediana em
   *  segundos; tone = fração das mensagens de texto com carinho ou risada. */
  value: number;
}

export interface SintoniaYear {
  year: number;
  /** Mediana de resposta do ano; null com poucas respostas. */
  medianResponseSec: number | null;
  /** Variação contra a mediana do casal (negativo = mais rápido); null com poucas respostas. */
  vsUsualPct: number | null;
}

export interface SintoniaMetrics {
  /** 0 a 10, uma casa decimal; null se faltar dado. */
  score: number | null;
  /** 'short' = histórico curto demais para uma nota confiável. */
  reason: 'short' | null;
  parts: SintoniaPart[];
  perYear: SintoniaYear[];
}

/** O que sai das respostas coletadas: a mediana do casal e a evolução por ano. */
export interface ReplySummary {
  medianSec: number | null;
  perYear: SintoniaYear[];
}

/** Escala logarítmica do tempo de resposta: 1 até 10 min, 0 a partir de 3 h. */
export function responseScore(sec: number): number {
  if (sec <= RESPONSE_FAST_SEC) return 1;
  return clamp01(
    1 - Math.log(sec / RESPONSE_FAST_SEC) / Math.log(RESPONSE_SLOW_SEC / RESPONSE_FAST_SEC),
  );
}

export function summarizeReplies(replies: Reply[]): ReplySummary {
  if (replies.length === 0) return { medianSec: null, perYear: [] };
  const usual = median(replies.map((r) => r.sec));
  const byYear = new Map<number, number[]>();
  for (const r of replies) {
    const y = yearOf(r.ts);
    const list = byYear.get(y);
    if (list) list.push(r.sec);
    else byYear.set(y, [r.sec]);
  }
  const perYear = [...byYear.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([year, secs]): SintoniaYear => {
      if (secs.length < YEAR_MIN_REPLIES || usual <= 0) {
        return { year, medianResponseSec: null, vsUsualPct: null };
      }
      const m = median(secs);
      const same =
        Math.abs(m - usual) < PACE_MIN_DELTA_SEC &&
        m < usual * PACE_MAX_RATIO &&
        usual < m * PACE_MAX_RATIO;
      return {
        year,
        medianResponseSec: Math.round(m),
        vsUsualPct: same ? 0 : Math.round((m / usual - 1) * 100),
      };
    });
  return { medianSec: usual, perYear };
}

export function computeSintonia(input: {
  volume: VolumeMetrics;
  sessions: SessionsMetrics;
  language: LanguageMetrics;
  replies: ReplySummary;
}): SintoniaMetrics {
  const { volume, sessions, language, replies } = input;
  const raw: { id: SintoniaPartId; score: number; value: number }[] = [];

  const unanswered = sessions.perPerson.A.unanswered + sessions.perPerson.B.unanswered;
  if (sessions.total > 0) {
    const rate = unanswered / sessions.total;
    raw.push({ id: 'reciprocity', score: clamp01(1 - rate / RECIPROCITY_CEIL), value: 1 - rate });
  }

  if (replies.medianSec !== null) {
    raw.push({
      id: 'responseTime',
      score: responseScore(replies.medianSec),
      value: Math.round(replies.medianSec),
    });
  }

  const la = language.perPerson.A;
  const lb = language.perPerson.B;
  const texts = la.textMessages + lb.textMessages;
  if (texts > 0) {
    const warm = (la.warmMessages + lb.warmMessages) / texts;
    raw.push({ id: 'tone', score: clamp01(warm / TONE_CAP), value: warm });
  }

  const totalWeight = raw.reduce((sum, p) => sum + SINTONIA_WEIGHTS[p.id], 0);
  const parts: SintoniaPart[] = raw.map((p) => ({
    ...p,
    weight: SINTONIA_WEIGHTS[p.id] / totalWeight,
  }));

  const messages = volume.perPerson.A.messages + volume.perPerson.B.messages;
  const short = messages < MIN_MESSAGES || volume.perMonth.length < MIN_MONTHS;
  if (parts.length === 0 || short) {
    return { score: null, reason: short ? 'short' : null, parts, perYear: replies.perYear };
  }
  const score = round1(10 * parts.reduce((sum, p) => sum + p.weight * p.score, 0));
  return { score, reason: null, parts, perYear: replies.perYear };
}
