'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { useReport } from '@/components/report/ReportProvider';
import { Link } from '@/i18n/navigation';
import { fmtDate, fmtDuration, fmtNum } from '@/lib/format';
import { daysBetween, formatSpan, spanBetween } from '@/lib/span';

const STEP = 24; // px por mês
const CHART_H = 120; // altura da sparkline
const TOP = 44; // espaço acima do gráfico (rótulo do marco)
const PAD_LEFT = 28; // padding pequeno à esquerda
const AXIS_H = 100; // eixo com marcos, anos e a faixa de ritmo de resposta abaixo do gráfico
const PACE_TOP = 70; // início da faixa de ritmo, abaixo do eixo
const TIP_W = 176; // largura da dica ao passar o mouse (w-44)

// Totais redondos que viram marco ("vocês chegaram a 100 mil mensagens").
const ROUND_TOTALS = [10_000, 50_000, 100_000, 250_000, 500_000, 1_000_000];
const MAX_ANNIVERSARIES = 30;

type Kind = 'first' | 'peak' | 'valley' | 'mark';
type Params = Record<string, string | number>;

interface Milestone {
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

/** Linha do tempo: trilho mensal com sparkline A/B, marcos navegáveis e leitura ao passar o mouse. */
export function TimelineView() {
  const t = useTranslations('timeline');
  const locale = useLocale();
  const { report } = useReport();
  const months = report.volume.perMonth;
  const [sel, setSel] = useState(0);
  const [hover, setHover] = useState<{ i: number; flip: boolean } | null>(null);
  const markerRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const scrollerRef = useRef<HTMLDivElement>(null);

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

  const current = milestones[sel];
  const go = (delta: number) =>
    setSel((s) => Math.min(milestones.length - 1, Math.max(0, s + delta)));

  function onKeyDown(e: KeyboardEvent) {
    const keys: Record<string, () => void> = {
      ArrowRight: () => go(1),
      ArrowLeft: () => go(-1),
      Home: () => setSel(0),
      End: () => setSel(milestones.length - 1),
    };
    const action = keys[e.key];
    if (action) {
      e.preventDefault();
      action();
    }
  }

  // Traz o marco selecionado para a vista, com scroll suave.
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    markerRefs.current[sel]?.scrollIntoView({
      inline: 'center',
      block: 'nearest',
      behavior: reduced ? 'auto' : 'smooth',
    });
  }, [sel]);

  // Sparkline: uma polyline por pessoa.
  // Escala entre o mínimo e o máximo (não parte de zero), para picos e vales aparecerem.
  const max = Math.max(1, ...months.map((x) => Math.max(x.A, x.B)));
  const min = Math.min(...months.map((x) => Math.min(x.A, x.B))) * 0.9;
  const yOf = (value: number) => CHART_H - ((value - min) / (max - min || 1)) * (CHART_H - 10);
  const line = (who: 'A' | 'B') =>
    months.map((x, i) => `${i * STEP},${yOf(x[who]).toFixed(1)}`).join(' ');
  const width = (months.length - 1) * STEP;
  const total = report.volume.perPerson.A.messages + report.volume.perPerson.B.messages;
  const firstDate = report.firsts.firstMessage;

  // Passar o mouse (ou tocar) lê o mês sob o cursor. A caixa inclui o deslocamento do scroll.
  function readMonth(e: PointerEvent<HTMLDivElement>) {
    const box = e.currentTarget.getBoundingClientRect();
    const i = Math.round((e.clientX - box.left - PAD_LEFT) / STEP);
    if (i < 0 || i >= months.length) {
      setHover(null);
      return;
    }
    const sc = scrollerRef.current;
    const flip = sc ? PAD_LEFT + i * STEP + TIP_W + 16 > sc.scrollLeft + sc.clientWidth : false;
    setHover((h) => (h && h.i === i && h.flip === flip ? h : { i, flip }));
  }

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

  const dotClass = (kind: Kind) =>
    kind === 'first'
      ? 'rounded-full bg-ok'
      : kind === 'mark'
        ? 'rounded-full border-2 border-ink bg-panel'
        : 'rotate-45 rounded-[3px] bg-sync';
  const glowColor = (kind: Kind) =>
    kind === 'first'
      ? 'var(--color-ok)'
      : kind === 'mark'
        ? 'var(--color-ink)'
        : 'var(--color-sync)';
  const chipClass = (kind: Kind) =>
    kind === 'first'
      ? 'border-ok/60 text-ok'
      : kind === 'mark'
        ? 'border-ink/40 text-ink'
        : 'border-sync/60 text-sync';

  const hovered = hover ? months[hover.i] : undefined;

  // Faixa de ritmo de resposta: um bloco por ano, com a mediana do ano contra o habitual do casal.
  const paceByYear = new Map(report.sintonia.perYear.map((y) => [y.year, y]));
  const paceBlocks: { year: number; start: number; count: number; pct: number }[] = [];
  for (let i = 0; i < months.length; i++) {
    const year = Number(months[i]!.month.slice(0, 4));
    const pct = paceByYear.get(year)?.vsUsualPct;
    if (pct === null || pct === undefined) continue;
    const last = paceBlocks[paceBlocks.length - 1];
    if (last && last.year === year) last.count++;
    else paceBlocks.push({ year, start: i, count: 1, pct });
  }
  const usualSec = report.sintonia.parts.find((p) => p.id === 'responseTime')?.value;

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 pt-4 sm:px-6">
      <header>
        <h1 className="font-display text-3xl font-bold sm:text-4xl">{t('title')}</h1>
        <p className="mt-1 text-muted">{t('subtitle')}</p>
        <p className="mt-2 flex gap-4 text-sm font-semibold">
          <span className="text-a">● {report.people.A}</span>
          <span className="text-b">● {report.people.B}</span>
        </p>
      </header>

      <div
        ref={scrollerRef}
        role="group"
        tabIndex={0}
        aria-label={t('trackLabel')}
        onKeyDown={onKeyDown}
        className="timeline-scroll panel snap-x snap-proximity overflow-x-auto overscroll-x-contain"
      >
        <div
          className="relative"
          onPointerMove={readMonth}
          onPointerDown={readMonth}
          onPointerLeave={(e) => {
            if (e.pointerType === 'mouse') setHover(null);
          }}
          style={{
            width: PAD_LEFT + width + 24,
            height: TOP + CHART_H + AXIS_H,
            // espaço à direita para o último marco poder chegar ao centro
            boxSizing: 'content-box',
            paddingRight: '45%',
          }}
        >
          <svg
            width={width}
            height={CHART_H}
            className="absolute overflow-visible"
            style={{ left: PAD_LEFT, top: TOP }}
            aria-hidden="true"
          >
            <polyline
              points={line('A')}
              fill="none"
              stroke="var(--color-a)"
              strokeWidth={2}
              className="glow-a"
            />
            <polyline
              points={line('B')}
              fill="none"
              stroke="var(--color-b)"
              strokeWidth={2}
              className="glow-b"
            />
            {hover && hovered && (
              <>
                <line
                  x1={hover.i * STEP}
                  x2={hover.i * STEP}
                  y1={0}
                  y2={CHART_H}
                  stroke="var(--color-ink)"
                  strokeOpacity={0.25}
                  strokeDasharray="3 4"
                />
                <circle
                  cx={hover.i * STEP}
                  cy={yOf(hovered.A)}
                  r={4.5}
                  fill="var(--color-a)"
                  stroke="var(--color-panel)"
                  strokeWidth={2}
                />
                <circle
                  cx={hover.i * STEP}
                  cy={yOf(hovered.B)}
                  r={4.5}
                  fill="var(--color-b)"
                  stroke="var(--color-panel)"
                  strokeWidth={2}
                />
              </>
            )}
          </svg>

          {/* Eixo e anos (todo ano tem rótulo) */}
          <div
            className="absolute h-px bg-line"
            style={{ left: PAD_LEFT, width, top: TOP + CHART_H + 22 }}
          />
          {months.map((x, i) =>
            x.month.endsWith('-01') || i === 0 ? (
              <span
                key={x.month}
                className="absolute text-xs text-muted"
                style={{
                  left: PAD_LEFT + i * STEP,
                  top: TOP + CHART_H + 46,
                  transform: 'translateX(-50%)',
                }}
              >
                {x.month.slice(0, 4)}
              </span>
            ) : null,
          )}

          {/* Ritmo de resposta por ano contra o habitual do casal (não é nota) */}
          {paceBlocks.length > 0 && (
            <div role="list" aria-label={t('pace.label')}>
              {paceBlocks.map((b) => {
                const usual = Math.abs(b.pct) < 10;
                const text = usual
                  ? t('pace.usual')
                  : b.pct < 0
                    ? t('pace.faster', { pct: Math.abs(b.pct) })
                    : t('pace.slower', { pct: b.pct });
                const tone = usual
                  ? 'border-line bg-line/40 text-muted'
                  : b.pct < 0
                    ? 'border-ok/40 bg-ok/10 text-ok'
                    : 'border-sync/40 bg-sync/10 text-sync';
                return (
                  <div
                    key={b.year}
                    role="listitem"
                    title={`${b.year}: ${text}`}
                    className={`absolute flex h-6 items-center justify-center overflow-hidden rounded-md border px-1 text-[11px] font-semibold ${tone}`}
                    style={{
                      left: PAD_LEFT + (b.start - 0.5) * STEP + 1.5,
                      width: b.count * STEP - 3,
                      top: TOP + CHART_H + PACE_TOP,
                    }}
                  >
                    <span className="sr-only">{b.year}: </span>
                    <span className="truncate">{text}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Linha vertical + rótulo curto do marco selecionado */}
          {current && (
            <>
              <div
                aria-hidden="true"
                className="absolute w-px"
                style={{
                  left: PAD_LEFT + current.monthIndex * STEP,
                  top: TOP - 8,
                  height: CHART_H + 30,
                  background: `linear-gradient(${glowColor(current.kind)}, transparent)`,
                }}
              />
              <span
                aria-hidden="true"
                className={`absolute whitespace-nowrap rounded-full border bg-panel px-2.5 py-0.5 text-xs font-semibold ${chipClass(current.kind)}`}
                style={{
                  left: PAD_LEFT + current.monthIndex * STEP,
                  top: 6,
                  // perto da borda esquerda o rótulo não pode ser cortado
                  transform: current.monthIndex < 3 ? 'translateX(-12px)' : 'translateX(-50%)',
                }}
              >
                {title(current)}
              </span>
            </>
          )}

          {milestones.map((ms, i) => (
            <button
              key={ms.id}
              ref={(el) => {
                markerRefs.current[i] = el;
              }}
              type="button"
              aria-pressed={i === sel}
              aria-label={`${title(ms)} · ${fmtDate(locale, ms.date, ms.withDay)}`}
              onClick={() => setSel(i)}
              className="absolute flex size-11 -translate-x-1/2 snap-center items-center justify-center"
              style={{ left: PAD_LEFT + ms.monthIndex * STEP, top: TOP + CHART_H }}
            >
              <span
                className={`block ${dotClass(ms.kind)} ${
                  i === sel ? 'size-6 ring-2 ring-ink ring-offset-2 ring-offset-panel' : 'size-3'
                }`}
                style={{
                  boxShadow: `0 0 ${i === sel ? 22 : 10}px color-mix(in srgb, ${glowColor(ms.kind)} 40%, transparent)`,
                }}
              />
            </button>
          ))}

          {/* Dica com os números do mês sob o cursor (decorativa: os marcos têm o texto acessível) */}
          {hover && hovered && (
            <div
              data-testid="timeline-tooltip"
              aria-hidden="true"
              className="pointer-events-none absolute z-10 w-44 rounded-xl border border-line bg-panel/95 p-3 text-sm shadow-lg backdrop-blur"
              style={{
                left: PAD_LEFT + hover.i * STEP,
                top: TOP + 4,
                transform: hover.flip ? 'translateX(calc(-100% - 12px))' : 'translateX(12px)',
              }}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                {fmtDate(locale, hovered.month, false)}
              </p>
              <p className="mt-1.5 flex items-baseline justify-between gap-2">
                <span className="min-w-0 truncate text-a">{report.people.A}</span>
                <span className="font-semibold tabular-nums">{fmtNum(locale, hovered.A)}</span>
              </p>
              <p className="flex items-baseline justify-between gap-2">
                <span className="min-w-0 truncate text-b">{report.people.B}</span>
                <span className="font-semibold tabular-nums">{fmtNum(locale, hovered.B)}</span>
              </p>
              <p className="mt-1.5 border-t border-line pt-1.5 text-xs text-muted">
                {t('hover.total', { count: fmtNum(locale, hovered.A + hovered.B) })}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Legenda dos marcos (forma + cor distintas) */}
      <p className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
        <span className="inline-flex items-center gap-2">
          <span className="size-3 rounded-full bg-ok" aria-hidden="true" />
          {t('legend.firsts')}
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="size-2.5 rotate-45 rounded-[3px] bg-sync" aria-hidden="true" />
          {t('legend.phases')}
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="size-3 rounded-full border-2 border-ink bg-panel" aria-hidden="true" />
          {t('legend.marks')}
        </span>
      </p>

      {paceBlocks.length > 0 && usualSec !== undefined && (
        <p className="text-sm text-muted">{t('pace.note', { time: fmtDuration(usualSec) })}</p>
      )}

      {current && (
        <article aria-live="polite" className="panel p-6">
          <div className="flex items-center justify-between gap-3">
            <span
              className={`rounded-full border px-3 py-0.5 text-xs font-semibold uppercase tracking-wide ${chipClass(current.kind)}`}
            >
              {t(`chip.${current.kind}`)}
            </span>
            <span className="text-sm text-muted">
              {t('counter', { current: sel + 1, total: milestones.length })}
            </span>
          </div>
          <h2 className="mt-3 font-display text-2xl font-bold sm:text-3xl">{title(current)}</h2>
          <p className="mt-1 text-lg text-sync">{fmtDate(locale, current.date, current.withDay)}</p>
          <p className="mt-2 text-muted">{description(current)}</p>
          <ul data-testid="timeline-facts" className="mt-4 space-y-1.5 text-sm text-muted">
            {facts(current).map((f) => (
              <li key={f} className="flex gap-2">
                <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-sync" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </article>
      )}

      <div className="flex gap-3">
        <button type="button" className="btn btn-ghost" onClick={() => go(-1)} disabled={sel === 0}>
          ← <span className="sr-only">{t('prev')}</span>
        </button>
        {sel >= milestones.length - 1 ? (
          <Link href="/report/dashboard" className="btn btn-primary">
            {t('toDashboard')} →
          </Link>
        ) : (
          <button type="button" className="btn btn-ghost" onClick={() => go(1)}>
            → <span className="sr-only">{t('next')}</span>
          </button>
        )}
      </div>
    </main>
  );
}
