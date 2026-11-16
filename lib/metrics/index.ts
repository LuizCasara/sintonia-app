import type { Conversation } from '../model';
import { computeApps, type AppsMetrics } from './apps';
import { computeBalance, type BalanceMetrics } from './balance';
import { computeDictionary, type DictionaryMetrics } from './dictionary';
import { computeFirsts, type FirstsMetrics } from './firsts';
import { computeHours, type HoursMetrics } from './hours';
import { computeLanguage, type LanguageMetrics } from './language';
import { computeMedia, type MediaMetrics } from './media';
import { computePhases, type PhasesMetrics } from './phases';
import { computeResponse, type ResponseMetrics } from './response';
import { computeSessions, type SessionsMetrics } from './sessions';
import { computeStreaks, type StreaksMetrics } from './streaks';
import { computeVolume, type VolumeMetrics } from './volume';

/** Relatório completo: um bloco por grupo da spec §7 (espelha os campos do PROMPT-IA). */
export interface Report {
  /** periodo */
  period: { start: string; end: string; days: number };
  people: { A: string; B: string };
  volume: VolumeMetrics;
  balance: BalanceMetrics;
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

/** Roda todos os grupos de métricas. */
export function computeReport(conv: Conversation): Report {
  // TODO(Luiz): calcular period a partir da primeira e da última mensagem.
  return {
    period: { start: '', end: '', days: 0 },
    people: { A: conv.people[0].displayName, B: conv.people[1].displayName },
    volume: computeVolume(conv),
    balance: computeBalance(conv),
    sessions: computeSessions(conv),
    response: computeResponse(conv),
    language: computeLanguage(conv),
    hours: computeHours(conv),
    streaks: computeStreaks(conv),
    media: computeMedia(conv),
    firsts: computeFirsts(conv),
    phases: computePhases(conv),
    dictionary: computeDictionary(conv),
    apps: computeApps(conv),
  };
}
