'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { useReport } from '@/components/report/ReportProvider';
import { Link } from '@/i18n/navigation';
import { fmtDate, fmtDuration, fmtNum } from '@/lib/format';
import { useTimelineModel, type Kind } from './useTimelineModel';

const STEP = 24; // px por mês
const CHART_H = 120; // altura da sparkline
const TOP = 44; // espaço acima do gráfico (rótulo do marco)
const PAD_LEFT = 28; // padding pequeno à esquerda
const AXIS_H = 100; // eixo com marcos, anos e a faixa de ritmo de resposta abaixo do gráfico
const PACE_TOP = 70; // início da faixa de ritmo, abaixo do eixo
const TIP_W = 176; // largura da dica ao passar o mouse (w-44)

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

  const { milestones, title, description, facts } = useTimelineModel(report);

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
