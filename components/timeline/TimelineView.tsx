'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useReport } from '@/components/report/ReportProvider';
import { fmtDate, fmtNum } from '@/lib/format';

const STEP = 24; // px por mês
const CHART_H = 120; // altura da sparkline
const TOP = 44; // espaço acima do gráfico (rótulo do marco)
const PAD_LEFT = 28; // padding pequeno à esquerda
const AXIS_H = 68; // eixo com marcos e anos abaixo do gráfico

type Kind = 'first' | 'peak' | 'valley';

interface Milestone {
  id: string;
  kind: Kind;
  titleKey: string;
  date: string; // ISO
  monthIndex: number;
  pct?: number;
}

/** Linha do tempo: trilho mensal com sparkline A/B e marcos navegáveis. */
export function TimelineView() {
  const t = useTranslations('timeline');
  const locale = useLocale();
  const { report } = useReport();
  const months = report.volume.perMonth;
  const [sel, setSel] = useState(0);
  const markerRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Marcos = primeiras vezes + fases (pico/vale), em ordem de data.
  const milestones: Milestone[] = [];
  for (const key of ['firstMessage', 'firstILoveYou', 'firstPhoto', 'firstAudio'] as const) {
    const date = report.firsts[key];
    if (date) milestones.push({ id: key, kind: 'first', titleKey: key, date, monthIndex: 0 });
  }
  for (const p of report.phases.phases) {
    milestones.push({
      id: `phase-${p.date}`,
      kind: p.kind,
      titleKey: p.kind,
      date: p.date,
      monthIndex: 0,
      pct: p.changePct,
    });
  }
  milestones.sort((a, b) => a.date.localeCompare(b.date));
  for (const ms of milestones) {
    ms.monthIndex = Math.max(
      0,
      months.findIndex((x) => x.month === ms.date.slice(0, 7)),
    );
  }

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
  const line = (who: 'A' | 'B') =>
    months
      .map(
        (x, i) =>
          `${i * STEP},${(CHART_H - ((x[who] - min) / (max - min)) * (CHART_H - 10)).toFixed(1)}`,
      )
      .join(' ');
  const width = (months.length - 1) * STEP;
  const total = report.volume.perPerson.A.messages + report.volume.perPerson.B.messages;
  const firstDate = report.firsts.firstMessage;

  function description(ms: Milestone): string {
    if (ms.kind === 'peak') return t('desc.peak', { pct: Math.abs(ms.pct ?? 0) });
    if (ms.kind === 'valley') return t('desc.valley', { pct: Math.abs(ms.pct ?? 0) });
    if (ms.id === 'firstMessage') return t('desc.start', { total: fmtNum(locale, total) });
    const days = firstDate
      ? Math.round((Date.parse(ms.date) - Date.parse(firstDate)) / 86_400_000)
      : 0;
    return t('desc.after', { days: fmtNum(locale, days) });
  }

  const dotClass = (kind: Kind) =>
    kind === 'first' ? 'rounded-full bg-ok' : 'rotate-45 rounded-[3px] bg-sync';
  const glowColor = (kind: Kind) => (kind === 'first' ? 'var(--color-ok)' : 'var(--color-sync)');
  const chipClass = (kind: Kind) =>
    kind === 'first' ? 'border-ok/60 text-ok' : 'border-sync/60 text-sync';

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
        role="group"
        tabIndex={0}
        aria-label={t('trackLabel')}
        onKeyDown={onKeyDown}
        className="panel snap-x snap-proximity overflow-x-auto overscroll-x-contain"
      >
        <div
          className="relative"
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
                {t(`milestones.${current.titleKey}`)}
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
              aria-label={`${t(`milestones.${ms.titleKey}`)} · ${fmtDate(locale, ms.date)}`}
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
      </p>

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
          <h2 className="mt-3 font-display text-2xl font-bold sm:text-3xl">
            {t(`milestones.${current.titleKey}`)}
          </h2>
          <p className="mt-1 text-lg text-sync">
            {fmtDate(locale, current.date, current.kind === 'first')}
          </p>
          <p className="mt-2 text-muted">{description(current)}</p>
        </article>
      )}

      <div className="flex gap-3">
        <button type="button" className="btn btn-ghost" onClick={() => go(-1)} disabled={sel === 0}>
          ← <span className="sr-only">{t('prev')}</span>
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => go(1)}
          disabled={sel >= milestones.length - 1}
        >
          → <span className="sr-only">{t('next')}</span>
        </button>
      </div>
    </main>
  );
}
