import type { Conversation } from '../model';
import { computeApps, type AppsMetrics } from './apps';
import { computeBalance, type BalanceMetrics } from './balance';
import { computeDictionary, type DictionaryMetrics } from './dictionary';
import { computeFirsts, type FirstsMetrics } from './firsts';
import { computeHours, type HoursMetrics } from './hours';
import { computeLanguage, type LanguageMetrics } from './language';
import { computeMedia, type MediaMetrics } from './media';
import { computePhases, type PhasesMetrics } from './phases';
import { collectReplies, computeResponse, type ResponseMetrics } from './response';
import { computeSessions, type SessionsMetrics } from './sessions';
import { computeSintonia, summarizeReplies, type SintoniaMetrics } from './sintonia';
import { computeStreaks, type StreaksMetrics } from './streaks';
import { isoDay, talk } from './util';
import { computeVolume, type VolumeMetrics } from './volume';

/** Relatório completo: um bloco por grupo da spec §7 (espelha os campos do PROMPT-IA). */
export interface Report {
  /** periodo */
  period: { start: string; end: string; days: number };
  people: { A: string; B: string };
  volume: VolumeMetrics;
  /** Divisão do esforço (nota 0 a 10 do casal). */
  balance: BalanceMetrics;
  /** Fluidez da conversa (nota 0 a 10 do casal). Fora do prompt da IA na V1. */
  sintonia: SintoniaMetrics;
  sessions: SessionsMetrics;
  response: ResponseMetrics;
  language: LanguageMetrics;
  hours: HoursMetrics;
  streaks: StreaksMetrics;
  media: MediaMetrics;
  firsts: FirstsMetrics;
  phases: PhasesMetrics;
  /** Só preenchido com consentimento do usuário. */
  dictionary: DictionaryMetrics | null;
  apps: AppsMetrics;
}

/** Primeira e última mensagem do casal; dias = diferença entre as duas datas (mínimo 1). */
export function computePeriod(conv: Conversation): Report['period'] {
  const msgs = talk(conv);
  const first = msgs[0];
  const last = msgs[msgs.length - 1];
  if (!first || !last) return { start: '', end: '', days: 0 };
  const days = Math.max(1, Math.round((last.ts - first.ts) / 86_400_000));
  return { start: isoDay(first.ts), end: isoDay(last.ts), days };
}

/** Roda todos os grupos de métricas. Volume, sessões, linguagem e respostas são calculados uma vez só. */
export function computeReport(conv: Conversation): Report {
  const volume = computeVolume(conv);
  const sessions = computeSessions(conv);
  const language = computeLanguage(conv);
  const replies = collectReplies(conv);
  return {
    period: computePeriod(conv),
    people: { A: conv.people[0].displayName, B: conv.people[1].displayName },
    volume,
    balance: computeBalance(volume, sessions),
    sintonia: computeSintonia({ volume, sessions, language, replies: summarizeReplies(replies) }),
    sessions,
    response: computeResponse(replies),
    language,
    hours: computeHours(conv),
    streaks: computeStreaks(conv),
    media: computeMedia(conv),
    firsts: computeFirsts(conv),
    phases: computePhases(conv, volume),
    dictionary: computeDictionary(conv),
    apps: computeApps(conv),
  };
}
