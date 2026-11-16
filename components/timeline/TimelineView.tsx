'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useReport } from '@/components/report/ReportProvider';
import { fmtDate } from '@/lib/format';

const STEP = 24; // px por mês
const HEIGHT = 120; // altura da sparkline

interface Milestone {
  id: string;
  kind: 'first' | 'phase';
  titleKey: string;
  date: string; // ISO
  monthIndex: number;
  detail?: { pct: number };
}

/** Linha do tempo: trilho mensal com sparkline A/B e marcos navegáveis. */
export function TimelineView() {
  const t = useTranslations('timeline');
  const locale = useLocale();
  const { report } = useReport();
  const months = report.volume.perMonth;
  const [sel, setSel] = useState(0);
  const markerRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Marcos = primeiras vezes + fases, em ordem de data.
  const milestones: Milestone[] = [];
  const firsts = report.firsts;
  for (const key of ['firstMessage', 'firstILoveYou', 'firstPhoto', 'firstAudio'] as const) {
    const date = firsts[key];
    if (date) milestones.push({ id: key, kind: 'first', titleKey: key, date, monthIndex: 0 });
  }
  for (const p of report.phases.phases) {
    milestones.push({
      id: `phase-${p.date}`,
      kind: 'phase',
      titleKey: p.kind,
      date: p.date,
      monthIndex: 0,
      detail: { pct: p.changePct },
    });
  }
  milestones.sort((a, b) => a.date.localeCompare(b.date));
  for (const m of milestones) {
    m.monthIndex = Math.max(
      0,
      months.findIndex((x) => x.month === m.date.slice(0, 7)),
    );
  }

  const current = milestones[sel];

  function go(delta: number) {
    setSel((s) => Math.min(milestones.length - 1, Math.max(0, s + delta)));
  }

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

  // Mantém o marco selecionado no centro do trilho.
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    markerRefs.current[sel]?.scrollIntoView({
      inline: 'center',
      block: 'nearest',
      behavior: reduced ? 'auto' : 'smooth',
    });
  }, [sel]);

  // Sparkline: uma polyline por pessoa.
  const max = Math.max(1, ...months.map((m) => Math.max(m.A, m.B)));
  const line = (who: 'A' | 'B') =>
    months
      .map((m, i) => `${i * STEP},${(HEIGHT - (m[who] / max) * (HEIGHT - 10)).toFixed(1)}`)
      .join(' ');
  const width = (months.length - 1) * STEP;

  const title = current ? t(`milestones.${current.titleKey}`) : '';

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
        {/* Padding lateral deixa o primeiro e o último marco chegarem ao centro */}
        <div
          className="relative box-content py-6"
          style={{ width: width + 2 * STEP, paddingInline: '45%' }}
        >
          <svg
            width={width}
            height={HEIGHT}
            className="ml-3 block overflow-visible"
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
          <div className="relative mt-2 h-14 ml-3" style={{ width }}>
            <div className="absolute inset-x-0 top-5 h-px bg-line" />
            {months.map((m, i) =>
              m.month.endsWith('-01') || i === 0 ? (
                <span
                  key={m.month}
                  className="absolute top-9 -translate-x-1/2 text-xs text-muted"
                  style={{ left: i * STEP }}
                >
                  {m.month.slice(0, 4)}
                </span>
              ) : null,
            )}
            {milestones.map((m, i) => (
              <button
                key={m.id}
                ref={(el) => {
                  markerRefs.current[i] = el;
                }}
                type="button"
                aria-pressed={i === sel}
                aria-label={`${t(`milestones.${m.titleKey}`)} · ${fmtDate(locale, m.date)}`}
                onClick={() => setSel(i)}
                className="absolute top-0 flex size-11 -translate-x-1/2 snap-center items-center justify-center"
                style={{ left: m.monthIndex * STEP }}
              >
                <span
                  className={`block rounded-full ${m.kind === 'first' ? 'bg-ok' : 'bg-sync'} ${
                    i === sel ? 'size-5 ring-2 ring-ink' : 'size-3'
                  }`}
                  style={{
                    boxShadow: `0 0 ${i === sel ? 18 : 10}px color-mix(in srgb, ${
                      m.kind === 'first' ? 'var(--color-ok)' : 'var(--color-sync)'
                    } 40%, transparent)`,
                  }}
                />
              </button>
            ))}
          </div>
        </div>
      </div>

      {current && (
        <article aria-live="polite" className="panel p-6">
          <p className="text-sm text-muted">
            {t('counter', { current: sel + 1, total: milestones.length })}
          </p>
          <h2 className="mt-1 font-display text-2xl font-bold sm:text-3xl">{title}</h2>
          <p className="mt-1 text-lg text-sync">
            {fmtDate(locale, current.date, current.kind === 'first')}
          </p>
          <p className="mt-2 text-muted">
            {current.detail ? t('phaseDetail', { pct: current.detail.pct }) : t('firstDetail')}
          </p>
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
