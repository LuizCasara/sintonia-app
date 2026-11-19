import { useLocale, useTranslations } from 'next-intl';
import { fmtNum } from '@/lib/format';
import type { Report } from '@/lib/metrics';
import { daysBetween, formatSpan, spanBetween } from '@/lib/span';

// Totais redondos que viram marco ("vocês chegaram a 100 mil mensagens").
const ROUND_TOTALS = [10_000, 50_000, 100_000, 250_000, 500_000, 1_000_000];
const MAX_ANNIVERSARIES = 30;

export type Kind = 'first' | 'peak' | 'valley' | 'mark';
type Params = Record<string, string | number>;

export interface Milestone {
  id: string;
  kind: Kind;
  titleKey: string;
  titleParams?: Params;
  date: string; // ISO, dia ("2026-11-15") ou mês ("2026-11")
  withDay: boolean;
  monthIndex: number;
  pct?: number;
  /** Texto próprio do cartão (marcos da jornada); os outros usam description(). */
  descKey?: string;
  descParams?: Params;
}

/**
 * Os marcos da linha do tempo e os textos de cada cartão (título, descrição e fatos).
 * Usado pela tela da linha do tempo e pelo relatório em PDF, para os dois dizerem o mesmo.
 */
export function useTimelineModel(report: Report) {
  const t = useTranslations('timeline');
  const locale = useLocale();
  const months = report.volume.perMonth;
  const total = report.volume.perPerson.A.messages + report.volume.perPerson.B.messages;
  const firstDate = report.firsts.firstMessage;

  const monthOf = (iso: string) =>
    Math.max(
      0,
      months.findIndex((x) => x.month === iso.slice(0, 7)),
    );

  // Marcos = primeiras vezes + fases (pico/vale) + marcos da jornada, em ordem de data.
  const milestones: Milestone[] = [];
  for (const key of ['firstMessage', 'firstILoveYou', 'firstPhoto', 'firstAudio'] as const) {
    const date = report.firsts[key];
    if (date) {
      milestones.push({
        id: key,
        kind: 'first',
        titleKey: key,
        date,
        withDay: true,
        monthIndex: 0,
      });
    }
  }
  for (const p of report.phases.phases) {
    milestones.push({
      id: `phase-${p.date}`,
      kind: p.kind,
      titleKey: p.kind,
      date: p.date,
      withDay: false,
      monthIndex: 0,
      pct: p.changePct,
    });
  }

  // Marcos da jornada: tudo sai do volume mensal e do período, sem nenhum dado novo.
  const cumulative: number[] = [];
  for (const x of months) cumulative.push((cumulative[cumulative.length - 1] ?? 0) + x.A + x.B);
  const totalMessages = cumulative[cumulative.length - 1] ?? 0;

  for (const n of ROUND_TOTALS) {
    const i = cumulative.findIndex((c) => c >= n);
    if (i >= 0 && n < totalMessages) {
      milestones.push({
        id: `total-${n}`,
        kind: 'mark',
        titleKey: 'messages',
        titleParams: { count: fmtNum(locale, n) },
        date: months[i]!.month,
        withDay: false,
        monthIndex: 0,
        descKey: 'messages',
      });
    }
  }

  const { start, end } = report.period;
  if (start && end) {
    const startYear = Number(start.slice(0, 4));
    for (let years = 1; years <= MAX_ANNIVERSARIES; years++) {
      const date = `${startYear + years}${start.slice(4)}`;
      if (date > end) break;
      const at = cumulative[monthOf(date)] ?? 0;
      milestones.push({
        id: `anniversary-${years}`,
        kind: 'mark',
        titleKey: 'anniversary',
        titleParams: { years },
        date,
        withDay: true,
        monthIndex: 0,
        descKey: 'anniversary',
        descParams: { count: fmtNum(locale, at), countRaw: at },
      });
    }
  }

  if (months.length >= 3) {
    // Mês mais movimentado (some se já existe um pico de fase nesse mês).
    let best = 0;
    for (let i = 1; i < months.length; i++) {
      if (months[i]!.A + months[i]!.B > months[best]!.A + months[best]!.B) best = i;
    }
    const bestMonth = months[best]!;
    if (!report.phases.phases.some((p) => p.kind === 'peak' && p.date === bestMonth.month)) {
      milestones.push({
        id: 'record',
        kind: 'mark',
        titleKey: 'record',
        date: bestMonth.month,
        withDay: false,
        monthIndex: 0,
        descKey: 'record',
        descParams: { count: fmtNum(locale, bestMonth.A + bestMonth.B) },
      });
    }

    // Primeiro mês em que o Telegram passa o WhatsApp (e continua à frente no mês seguinte).
    const lead = (i: number) => (months[i]?.telegram ?? 0) > (months[i]?.whatsapp ?? 0);
    const cross = months.findIndex(
      (_, i) => i > 0 && lead(i) && (i === months.length - 1 || lead(i + 1)),
    );
    if (cross > 0 && months.slice(0, cross).some((x) => x.whatsapp > x.telegram)) {
      milestones.push({
        id: 'telegram-lead',
        kind: 'mark',
        titleKey: 'telegram',
        date: months[cross]!.month,
        withDay: false,
        monthIndex: 0,
        descKey: 'telegram',
      });
    }
  }

  milestones.sort((a, b) => a.date.localeCompare(b.date));
  for (const ms of milestones) ms.monthIndex = monthOf(ms.date);

  const title = (ms: Milestone) => t(`milestones.${ms.titleKey}`, ms.titleParams);

  // "1 ano e 3 meses", "12 dias". Vazio se for o mesmo dia.
  const spanText = (from: string, to: string): string =>
    formatSpan(spanBetween(from, to), locale, (unit, n) => t(`span.${unit}`, { n }));
  const periodStart = report.period.start;
  const periodEnd = report.period.end;
  const sinceStart = (ms: Milestone) => (periodStart ? spanText(periodStart, ms.date) : '');
  const monthCount = (i: number) => (months[i] ? months[i]!.A + months[i]!.B : 0);

  function description(ms: Milestone): string {
    const count = fmtNum(locale, monthCount(ms.monthIndex));
    if (ms.descKey) {
      const extra: Params = { ...ms.descParams };
      if (ms.descKey === 'messages') extra.time = sinceStart(ms);
      return t(`desc.${ms.descKey}`, extra);
    }
    if (ms.kind === 'peak' || ms.kind === 'valley') {
      return t(`desc.${ms.kind}`, { pct: Math.abs(ms.pct ?? 0), count });
    }
    if (ms.id === 'firstMessage') {
      const time = periodEnd ? spanText(ms.date, periodEnd) : '';
      return t('desc.start', { total: fmtNum(locale, total), time });
    }
    const time = firstDate ? spanText(firstDate, ms.date) : '';
    return time ? t('desc.after', { time }) : t('desc.sameDay');
  }

  // Fatos curtos sob o texto do cartão: quem falou mais no mês, o que veio depois, quanto tempo desde o início.
  function facts(ms: Milestone): string[] {
    const out: string[] = [];
    const i = ms.monthIndex;
    const m = months[i];
    if (m && m.A + m.B > 0) {
      const shareA = m.A / (m.A + m.B);
      if (Math.abs(shareA - 0.5) < 0.04) {
        // "Meio a meio" só vale como destaque nos meses que já são marcos de volume.
        if (ms.kind === 'peak' || ms.kind === 'valley' || ms.id === 'record') {
          out.push(t('facts.even'));
        }
      } else {
        const aLeads = shareA > 0.5;
        out.push(
          t('facts.lead', {
            name: aLeads ? report.people.A : report.people.B,
            pct: Math.round((aLeads ? shareA : 1 - shareA) * 100),
          }),
        );
      }
    }
    if (ms.kind === 'peak' || ms.kind === 'valley') {
      const next = months[i + 1];
      const cur = monthCount(i);
      // O último mês costuma ser parcial: não vira "queda".
      if (next && i + 1 < months.length - 1 && cur > 0) {
        const delta = Math.round(((next.A + next.B) / cur - 1) * 100);
        if (Math.abs(delta) < 3) out.push(t('facts.nextSame'));
        else out.push(t(delta > 0 ? 'facts.nextUp' : 'facts.nextDown', { pct: Math.abs(delta) }));
      }
    }
    if (ms.id === 'record') {
      const avg = months.reduce((s, x) => s + x.A + x.B, 0) / Math.max(1, months.length);
      if (avg > 0) {
        const times = Math.round((monthCount(i) / avg) * 10) / 10;
        out.push(t('facts.vsAverage', { times: fmtNum(locale, times) }));
      }
    }
    if (ms.id.startsWith('anniversary')) {
      const days = periodStart ? daysBetween(periodStart, ms.date) : 0;
      const at = Number(ms.descParams?.countRaw ?? 0);
      if (days > 0 && at > 0) {
        const perDay = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(
          at / days,
        );
        out.push(t('facts.perDay', { count: perDay }));
      }
    }
    const since =
      ms.kind === 'peak' || ms.kind === 'valley' || ms.id === 'record' || ms.id === 'telegram-lead';
    if (since) {
      const time = sinceStart(ms);
      if (time) out.push(t('facts.since', { time }));
    }
    return out;
  }

  return { milestones, title, description, facts };
}
