'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useSyncExternalStore, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useScoreRows } from '@/components/dashboard/scoreRows';
import { useReport } from '@/components/report/ReportProvider';
import { useTimelineModel, type Kind } from '@/components/timeline/useTimelineModel';
import { bookProgress, HARRY_POTTER_TOTAL, HARRY_POTTER_WORDS } from '@/lib/books';
import { fmtDate, fmtDuration, fmtNum, fmtPct, fmtScore, weekdayName } from '@/lib/format';
import { sharedDictionary, wordGroups, wordOwner } from '@/lib/share';
import { daysBetween, formatSpan, spanBetween } from '@/lib/span';

// Cores do relatório em papel: as da marca, um pouco mais escuras para ler no branco.
const C = {
  a: '#0aa8c0',
  b: '#d91d98',
  v: '#7c5cf0',
  ok: '#3fa30f',
  ink: '#14141f',
  muted: '#6b6b82',
  line: '#e4e4ee',
  soft: '#f5f4fb',
} as const;
const WHO = { A: C.a, B: C.b, both: C.v } as const;
const BANDS = ['00', '04', '08', '12', '16', '20'];
const noop = () => () => {};

/** As duas ondas da marca, entrando em fase e virando violeta. */
function Waves({ width, height, dark = false }: { width: number; height: number; dark?: boolean }) {
  const points = (dy: number) =>
    Array.from({ length: 41 }, (_, i) => {
      const t = i / 40;
      return `${(t * width).toFixed(1)},${(height / 2 + dy * (1 - t) * Math.sin(t * Math.PI * 4) * (height * 0.32)).toFixed(1)}`;
    }).join(' ');
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} aria-hidden="true">
      <polyline
        points={points(-1)}
        fill="none"
        stroke={C.a}
        strokeWidth={dark ? 3 : 2.5}
        strokeLinecap="round"
      />
      <polyline
        points={points(1)}
        fill="none"
        stroke={C.b}
        strokeWidth={dark ? 3 : 2.5}
        strokeLinecap="round"
      />
    </svg>
  );
}

function Section({
  title,
  children,
  hint,
  keep = false,
}: {
  title: string;
  children: ReactNode;
  hint?: string;
  /** Mantém a seção inteira na mesma página (para as curtas). */
  keep?: boolean;
}) {
  return (
    <section className={`mt-7 ${keep ? 'break-inside-avoid' : ''}`}>
      <h2
        className="mb-2 flex items-center gap-2 font-display text-[15px] font-bold"
        style={{ color: C.ink }}
      >
        <span
          className="h-4 w-1 rounded-full"
          style={{ background: `linear-gradient(${C.a}, ${C.b})` }}
          aria-hidden="true"
        />
        {title}
      </h2>
      {hint && (
        <p className="mb-2 text-[10px]" style={{ color: C.muted }}>
          {hint}
        </p>
      )}
      {children}
    </section>
  );
}

type Tone = 'A' | 'B' | undefined;

/** Tabela simples: a primeira coluna é o rótulo; `tones` pinta o cabeçalho de cada pessoa. */
function Table({
  head,
  rows,
  tones = [],
}: {
  head?: string[];
  rows: (string | number)[][];
  tones?: Tone[];
}) {
  return (
    <table className="w-full border-collapse text-[11px]">
      {head && (
        <thead>
          <tr className="text-left">
            {head.map((h, i) => (
              <th
                key={i}
                className={`py-1 font-semibold ${i > 0 ? 'text-right' : ''}`}
                style={{ color: tones[i] ? WHO[tones[i]!] : C.muted }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
      )}
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className="break-inside-avoid" style={{ borderTop: `1px solid ${C.line}` }}>
            {row.map((cell, k) => (
              <td
                key={k}
                className={`py-1 ${k > 0 ? 'text-right tabular-nums' : ''}`}
                style={tones[k] ? { color: WHO[tones[k]!], fontWeight: 600 } : undefined}
              >
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Barra dividida A × B com o valor de cada pessoa e a parte dela. */
function Dual({
  label,
  a,
  b,
  nameA,
  nameB,
  fmt,
}: {
  label: string;
  a: number;
  b: number;
  nameA: string;
  nameB: string;
  fmt: (v: number) => string;
}) {
  const total = a + b;
  const shareA = total > 0 ? a / total : 0.5;
  return (
    <div className="break-inside-avoid">
      <p className="mb-0.5 text-[10px] font-semibold" style={{ color: C.muted }}>
        {label}
      </p>
      <div className="flex h-2 overflow-hidden rounded-full">
        <div style={{ width: `${shareA * 100}%`, background: C.a }} />
        <div style={{ flex: 1, background: C.b }} />
      </div>
      <p className="mt-0.5 flex justify-between text-[10px] tabular-nums">
        <span style={{ color: C.a, fontWeight: 600 }}>
          {nameA} {fmt(a)} · {Math.round(shareA * 100)}%
        </span>
        <span style={{ color: C.b, fontWeight: 600 }}>
          {Math.round((1 - shareA) * 100)}% · {fmt(b)} {nameB}
        </span>
      </p>
    </div>
  );
}

/** Uma barra simples de 0 a 1. */
function Meter({
  value,
  color = C.v,
  height = 6,
}: {
  value: number;
  color?: string;
  height?: number;
}) {
  return (
    <div className="overflow-hidden rounded-full" style={{ background: C.soft, height }}>
      <div
        className="h-full rounded-full"
        style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%`, background: color }}
      />
    </div>
  );
}

function Tile({
  value,
  label,
  color = C.v,
  sub,
}: {
  value: ReactNode;
  label: string;
  color?: string;
  sub?: string;
}) {
  return (
    <div
      className="break-inside-avoid rounded-xl p-3"
      style={{ background: C.soft, borderTop: `3px solid ${color}` }}
    >
      <p className="font-display text-[22px] font-bold leading-tight" style={{ color }}>
        {value}
      </p>
      <p className="mt-0.5 text-[10px] font-semibold" style={{ color: C.ink }}>
        {label}
      </p>
      {sub && (
        <p className="text-[9px]" style={{ color: C.muted }}>
          {sub}
        </p>
      )}
    </div>
  );
}

const kindColor: Record<Kind, string> = { first: C.ok, peak: C.v, valley: C.b, mark: C.a };

/**
 * Relatório completo para imprimir ou salvar em PDF. Fica fora da tela (portal no <body>) e só
 * aparece na impressão; ver `#print-root` em globals.css. Só números e datas, nenhuma mensagem.
 */
export function PrintReport() {
  const mounted = useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
  const locale = useLocale();
  const t = useTranslations('print');
  const td = useTranslations('dashboard');
  const { report: r, hiddenWords } = useReport();
  const first = (full: string) => full.split(' ')[0] ?? full;
  const nameA = first(r.people.A);
  const nameB = first(r.people.B);
  const { sintoniaRows, balanceRows, balanceHint } = useScoreRows(r, nameA, nameB);
  const timeline = useTimelineModel(r);
  if (!mounted) return null;

  const n = (v: number) => fmtNum(locale, v);
  const m = (key: string) => td(`m.${key}`);
  const pair = (key: string, a: number | string, b: number | string): (string | number)[] => [
    m(key),
    typeof a === 'number' ? n(a) : a,
    typeof b === 'number' ? n(b) : b,
  ];
  const head = ['', nameA, nameB];
  const tones: Tone[] = [undefined, 'A', 'B'];
  const oneDecimal = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });

  const vol = r.volume.perPerson;
  const ses = r.sessions.perPerson;
  const res = r.response.perPerson;
  const lang = r.language.perPerson;
  const med = r.media.perPerson;
  const months = r.volume.perMonth;
  const totalMessages = vol.A.messages + vol.B.messages;
  const totalWords = vol.A.words + vol.B.words;
  const spanLabel = (unit: 'years' | 'months' | 'days', count: number) =>
    td(`time.span.${unit}`, { n: count });
  const together = r.period.start
    ? formatSpan(spanBetween(r.period.start, r.period.end), locale, spanLabel)
    : '';
  const totalDays = r.period.start ? daysBetween(r.period.start, r.period.end) + 1 : 0;
  const activeRate = totalDays > 0 ? Math.min(1, r.activity.activeDays / totalDays) : 0;
  const perDay = totalDays > 0 ? totalMessages / totalDays : 0;

  // Mês mais movimentado e os 6 primeiros
  const rankedMonths = [...months]
    .map((x) => ({ ...x, total: x.A + x.B }))
    .sort((x, y) => y.total - x.total)
    .slice(0, 6);
  const record = rankedMonths[0];
  const maxMonthTotal = Math.max(1, ...months.map((x) => x.A + x.B));

  // Emoji mais usado do casal (soma dos top 5 de cada um)
  const emojiTotals = new Map<string, number>();
  for (const who of ['A', 'B'] as const) {
    for (const e of lang[who].topEmojis)
      emojiTotals.set(e.emoji, (emojiTotals.get(e.emoji) ?? 0) + e.count);
  }
  const topEmoji = [...emojiTotals.entries()].sort((x, y) => y[1] - x[1])[0];

  // Mensagens por ano e por mês (matriz ano × mês)
  const byYear = new Map<string, { A: number; B: number }>();
  const matrix = new Map<string, number[]>();
  for (const mo of months) {
    const y = mo.month.slice(0, 4);
    const row = byYear.get(y) ?? { A: 0, B: 0 };
    row.A += mo.A;
    row.B += mo.B;
    byYear.set(y, row);
    const cells = matrix.get(y) ?? Array<number>(12).fill(-1);
    cells[Number(mo.month.slice(5, 7)) - 1] = mo.A + mo.B;
    matrix.set(y, cells);
  }
  const maxYearTotal = Math.max(1, ...[...byYear.values()].map((v) => v.A + v.B));
  const monthNames = Array.from({ length: 12 }, (_, i) =>
    new Intl.DateTimeFormat(locale, { month: 'short', timeZone: 'UTC' }).format(
      Date.UTC(2023, i, 1),
    ),
  );

  const chartW = 700;
  const chartH = 100;
  const barW = chartW / Math.max(1, months.length);

  const book = bookProgress(totalWords);
  const bookFill = (i: number) =>
    book.times >= 1 || i < book.full ? 1 : i === book.current.index ? book.current.fraction : 0;
  const dict = sharedDictionary(r, hiddenWords);
  const wordLists = wordGroups(dict);
  const wordTotal = wordLists.shared.length + wordLists.A.length + wordLists.B.length;
  const heatMax = Math.max(1, ...r.hours.heatmap.flat());
  const apps = r.apps.perYear;

  const dateOf = (ms: { date: string; withDay: boolean }) => fmtDate(locale, ms.date, ms.withDay);

  return createPortal(
    <div id="print-root" data-testid="print-report">
      {/* Capa */}
      <header
        className="relative overflow-hidden rounded-2xl px-6 pb-12 pt-6"
        style={{
          background: 'linear-gradient(125deg, #06060c 0%, #12102a 55%, #2a0f3a 100%)',
          color: '#fff',
        }}
      >
        <div className="flex items-center gap-3">
          <Waves width={64} height={28} dark />
          <span className="font-display text-xl font-bold tracking-wide">Sintonia</span>
          <span
            className="ml-auto text-[10px] uppercase tracking-[0.2em]"
            style={{ color: '#a9a9c8' }}
          >
            {t('cover.kicker')}
          </span>
        </div>
        <h1 className="mt-8 font-display text-[34px] font-bold leading-tight">
          <span style={{ color: '#2ee6ff' }}>{r.people.A}</span>
          <span style={{ color: '#b8b8d8' }}> &amp; </span>
          <span style={{ color: '#ff55c6' }}>{r.people.B}</span>
        </h1>
        <p className="mt-2 text-[13px]" style={{ color: '#d4d4ec' }}>
          {r.period.start &&
            `${fmtDate(locale, r.period.start)} – ${fmtDate(locale, r.period.end)}`}
          {together && ` · ${together}`}
        </p>
        <p className="mt-4 max-w-[560px] text-[13px] leading-snug" style={{ color: '#fff' }}>
          {t('headline', {
            count: n(totalMessages),
            time: together || td('time.span.days', { n: totalDays }),
            perDay: oneDecimal.format(perDay),
          })}
        </p>
        <div className="pointer-events-none absolute -bottom-2 right-0 opacity-80">
          <Waves width={420} height={64} dark />
        </div>
      </header>
      <p className="mt-2 text-[10px]" style={{ color: C.muted }}>
        {t('generated', { date: fmtDate(locale, new Date().toISOString().slice(0, 10)) })}
      </p>

      {/* Em destaque */}
      <Section title={t('s.highlights')}>
        <div className="grid grid-cols-4 gap-2.5">
          <Tile
            value={n(totalMessages)}
            label={t('stat.messages')}
            color={C.v}
            sub={t('stat.perDay', { count: oneDecimal.format(perDay) })}
          />
          <Tile
            value={together || '—'}
            label={t('stat.together')}
            color={C.a}
            sub={t('stat.since', {
              date: r.period.start ? fmtDate(locale, r.period.start, false) : '—',
            })}
          />
          <Tile
            value={fmtPct(activeRate)}
            label={t('stat.activeRate')}
            color={C.ok}
            sub={td('time.activeOf', { active: n(r.activity.activeDays), total: n(totalDays) })}
          />
          <Tile
            value={td('time.days', { n: r.activity.longestStreak })}
            label={t('stat.streak')}
            color={C.b}
            sub={t('stat.silence', { days: td('time.days', { n: r.activity.longestSilence }) })}
          />
          <Tile
            value={r.sintonia.score === null ? '—' : fmtScore(locale, r.sintonia.score)}
            label={td('cards.sintonia')}
            color={C.v}
            sub={td('sintonia.tagline')}
          />
          <Tile
            value={r.balance.score === null ? '—' : fmtScore(locale, r.balance.score)}
            label={td('cards.balance')}
            color={C.a}
            sub={balanceHint}
          />
          <Tile
            value={record ? n(record.total) : '—'}
            label={t('stat.record')}
            color={C.b}
            sub={record ? fmtDate(locale, record.month, false) : undefined}
          />
          <Tile
            value={topEmoji ? `${topEmoji[0]} ${n(topEmoji[1])}` : '—'}
            label={t('stat.topEmoji')}
            color={C.ok}
          />
        </div>
      </Section>

      {/* Notas */}
      <Section title={t('s.scores')}>
        <div className="grid grid-cols-2 gap-6">
          {(
            [
              [
                'sintonia',
                td('cards.sintonia'),
                r.sintonia.score,
                sintoniaRows,
                td('sintonia.tagline'),
                C.v,
              ],
              ['balance', td('cards.balance'), r.balance.score, balanceRows, balanceHint, C.a],
            ] as const
          ).map(([id, label, score, rows, hint, color]) => (
            <div key={id} className="break-inside-avoid">
              <p className="text-[12px] font-semibold">{label}</p>
              <p className="font-display text-[40px] font-bold leading-none" style={{ color }}>
                {score === null ? '—' : fmtScore(locale, score)}
                <span className="ml-1 font-sans text-[12px] font-normal" style={{ color: C.muted }}>
                  {td('score.outOf')}
                </span>
              </p>
              <p className="mb-2 mt-1 text-[10px]" style={{ color: C.muted }}>
                {id === 'sintonia' && score === null ? td('sintonia.short') : hint}
              </p>
              <ul className="space-y-2">
                {rows.map((row) => (
                  <li key={row.id}>
                    <p className="flex justify-between text-[10.5px]">
                      <span className="font-semibold">
                        {row.label} <span style={{ color: C.muted }}>({row.weight})</span>
                      </span>
                      <span className="font-bold tabular-nums" style={{ color }}>
                        {row.scoreText}
                      </span>
                    </p>
                    <Meter value={row.score} color={color} />
                    <p className="mt-0.5 text-[9.5px]" style={{ color: C.muted }}>
                      {row.detail}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[10px]" style={{ color: C.muted }}>
          {td('balance.note')}
        </p>
      </Section>

      {/* Volume */}
      <Section title={t('s.volume')}>
        <p className="mb-2 text-[12px]">{t('totalMessages', { count: n(totalMessages) })}</p>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
          <Dual
            label={m('messages')}
            a={vol.A.messages}
            b={vol.B.messages}
            nameA={nameA}
            nameB={nameB}
            fmt={n}
          />
          <Dual
            label={m('words')}
            a={vol.A.words}
            b={vol.B.words}
            nameA={nameA}
            nameB={nameB}
            fmt={n}
          />
          <Dual
            label={m('characters')}
            a={vol.A.characters}
            b={vol.B.characters}
            nameA={nameA}
            nameB={nameB}
            fmt={n}
          />
          <Dual
            label={m('uniqueWords')}
            a={vol.A.uniqueWords}
            b={vol.B.uniqueWords}
            nameA={nameA}
            nameB={nameB}
            fmt={n}
          />
        </div>
        <svg
          viewBox={`0 0 ${chartW} ${chartH + 14}`}
          className="mt-4 w-full"
          role="img"
          aria-label={t('perMonth')}
        >
          {months.map((mo, i) => {
            const hA = (mo.A / maxMonthTotal) * chartH;
            const hB = (mo.B / maxMonthTotal) * chartH;
            return (
              <g key={mo.month}>
                <rect x={i * barW} y={chartH - hA} width={barW * 0.88} height={hA} fill={C.a} />
                <rect
                  x={i * barW}
                  y={chartH - hA - hB}
                  width={barW * 0.88}
                  height={hB}
                  fill={C.b}
                />
                {mo.month.endsWith('-01') && (
                  <text x={i * barW} y={chartH + 11} fontSize="9" fill={C.muted}>
                    {mo.month.slice(0, 4)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
        <p className="text-[10px]" style={{ color: C.muted }}>
          {t('perMonth')} · <span style={{ color: C.a }}>■ {nameA}</span>{' '}
          <span style={{ color: C.b }}>■ {nameB}</span>
        </p>

        <div className="mt-4 grid grid-cols-2 gap-6">
          <div>
            <p className="mb-1 text-[10px] font-semibold" style={{ color: C.muted }}>
              {t('perYear')}
            </p>
            <ul className="space-y-1.5">
              {[...byYear.entries()].map(([y, v]) => (
                <li key={y} className="break-inside-avoid text-[10.5px]">
                  <div className="flex justify-between tabular-nums">
                    <span className="font-semibold">{y}</span>
                    <span>
                      <span style={{ color: C.a }}>{n(v.A)}</span> ·{' '}
                      <span style={{ color: C.b }}>{n(v.B)}</span>
                    </span>
                  </div>
                  <div
                    className="flex h-1.5 overflow-hidden rounded-full"
                    style={{ width: `${((v.A + v.B) / maxYearTotal) * 100}%` }}
                  >
                    <div style={{ flex: v.A, background: C.a }} />
                    <div style={{ flex: v.B, background: C.b }} />
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-1 text-[10px] font-semibold" style={{ color: C.muted }}>
              {t('s.topMonths')}
            </p>
            <Table
              head={[t('month'), nameA, nameB, t('total')]}
              tones={[undefined, 'A', 'B']}
              rows={rankedMonths.map((x) => [
                fmtDate(locale, x.month, false),
                n(x.A),
                n(x.B),
                n(x.total),
              ])}
            />
          </div>
        </div>
      </Section>

      {/* Linha do tempo */}
      <Section title={t('s.timeline')} hint={t('timelineHint')}>
        <ol className="space-y-2">
          {timeline.milestones.map((ms) => {
            const facts = timeline.facts(ms);
            return (
              <li key={ms.id} className="flex gap-2.5 break-inside-avoid">
                <span
                  aria-hidden="true"
                  className="mt-1 size-2.5 shrink-0 rounded-full"
                  style={{ background: kindColor[ms.kind] }}
                />
                <div className="min-w-0 text-[10.5px] leading-snug">
                  <p>
                    <span className="font-bold" style={{ color: kindColor[ms.kind] }}>
                      {dateOf(ms)}
                    </span>{' '}
                    <span className="font-semibold">{timeline.title(ms)}</span>
                  </p>
                  <p style={{ color: C.muted }}>{timeline.description(ms)}</p>
                  {facts.length > 0 && (
                    <ul className="mt-0.5 list-disc pl-4" style={{ color: C.muted }}>
                      {facts.map((f) => (
                        <li key={f}>{f}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </Section>

      {/* Mês a mês */}
      <Section title={t('s.matrix')} hint={t('matrixHint')} keep>
        <table className="w-full table-fixed border-collapse text-center text-[9px] tabular-nums">
          <thead>
            <tr style={{ color: C.muted }}>
              <th className="w-10 py-0.5 text-left font-semibold" />
              {monthNames.map((name) => (
                <th key={name} className="py-0.5 font-semibold">
                  {name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...matrix.entries()].map(([y, cells]) => (
              <tr key={y}>
                <th className="py-0.5 text-left font-semibold">{y}</th>
                {cells.map((v, i) => (
                  <td
                    key={i}
                    className="py-0.5"
                    style={
                      v < 0
                        ? { color: C.line }
                        : ({
                            background: `rgba(124, 92, 240, ${0.08 + (v / maxMonthTotal) * 0.62})`,
                          } as CSSProperties)
                    }
                  >
                    {v < 0 ? '·' : n(v)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      {/* Resposta */}
      <Section title={t('s.response')}>
        <Table
          head={head}
          tones={tones}
          rows={[
            pair(
              'avgResponse',
              fmtDuration(res.A.avgFirstResponseSec),
              fmtDuration(res.B.avgFirstResponseSec),
            ),
            pair(
              'medianResponse',
              fmtDuration(res.A.medianFirstResponseSec),
              fmtDuration(res.B.medianFirstResponseSec),
            ),
            pair('within10', fmtPct(res.A.rateWithin10Min), fmtPct(res.B.rateWithin10Min)),
          ]}
        />
        {r.sintonia.perYear.length > 0 && (
          <div className="mt-3 break-inside-avoid">
            <p className="mb-1 text-[10px] font-semibold" style={{ color: C.muted }}>
              {t('pace.title')}
            </p>
            <ul className="space-y-1">
              {r.sintonia.perYear.map((y) => {
                const pct = y.vsUsualPct;
                return (
                  <li
                    key={y.year}
                    className="grid grid-cols-[40px_70px_1fr_60px] items-center gap-2 break-inside-avoid text-[10.5px]"
                  >
                    <span className="font-semibold">{y.year}</span>
                    <span className="tabular-nums">
                      {y.medianResponseSec === null ? '—' : fmtDuration(y.medianResponseSec)}
                    </span>
                    <Meter
                      value={pct === null ? 0 : Math.min(1, Math.abs(pct) / 100)}
                      color={pct !== null && pct > 0 ? C.b : C.ok}
                    />
                    <span
                      className="text-right font-semibold tabular-nums"
                      style={{
                        color: pct === null ? C.muted : pct > 0 ? C.b : pct < 0 ? C.ok : C.muted,
                      }}
                    >
                      {pct === null ? '—' : `${pct > 0 ? '+' : ''}${pct}%`}
                    </span>
                  </li>
                );
              })}
            </ul>
            <p className="mt-1 text-[9.5px]" style={{ color: C.muted }}>
              {t('pace.note')}
            </p>
          </div>
        )}
      </Section>

      {/* Quem inicia */}
      <Section title={t('s.sessions')} keep>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
          <Dual
            label={m('started')}
            a={ses.A.started}
            b={ses.B.started}
            nameA={nameA}
            nameB={nameB}
            fmt={n}
          />
          <Dual
            label={m('ended')}
            a={ses.A.ended}
            b={ses.B.ended}
            nameA={nameA}
            nameB={nameB}
            fmt={n}
          />
          <Dual
            label={m('doubleMessages')}
            a={ses.A.doubleMessages}
            b={ses.B.doubleMessages}
            nameA={nameA}
            nameB={nameB}
            fmt={n}
          />
          <Dual
            label={m('unanswered')}
            a={ses.A.unanswered}
            b={ses.B.unanswered}
            nameA={nameA}
            nameB={nameB}
            fmt={n}
          />
        </div>
      </Section>

      {/* Linguagem */}
      <Section title={t('s.language')} keep>
        <div className="grid grid-cols-2 gap-6">
          {(['A', 'B'] as const).map((who) => (
            <div key={who} className="break-inside-avoid">
              <p className="mb-1 text-[11px] font-bold" style={{ color: WHO[who] }}>
                {who === 'A' ? nameA : nameB}
              </p>
              <p className="flex flex-wrap gap-x-3 gap-y-1">
                {lang[who].topEmojis.map((e) => (
                  <span key={e.emoji} className="text-[11px] tabular-nums">
                    <span className="text-[20px] leading-none">{e.emoji}</span> {n(e.count)}
                  </span>
                ))}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2.5">
          <Dual
            label={m('laughs')}
            a={lang.A.laughs}
            b={lang.B.laughs}
            nameA={nameA}
            nameB={nameB}
            fmt={n}
          />
          <Dual
            label={m('questions')}
            a={lang.A.questions}
            b={lang.B.questions}
            nameA={nameA}
            nameB={nameB}
            fmt={n}
          />
          <Dual
            label={m('apologies')}
            a={lang.A.apologies}
            b={lang.B.apologies}
            nameA={nameA}
            nameB={nameB}
            fmt={n}
          />
          <Dual
            label={m('affection')}
            a={lang.A.affection}
            b={lang.B.affection}
            nameA={nameA}
            nameB={nameB}
            fmt={n}
          />
        </div>
      </Section>

      {/* Mídia */}
      <Section title={t('s.media')} keep>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
          <Dual
            label={m('audios')}
            a={med.A.audios}
            b={med.B.audios}
            nameA={nameA}
            nameB={nameB}
            fmt={n}
          />
          <Dual
            label={m('texts')}
            a={med.A.texts}
            b={med.B.texts}
            nameA={nameA}
            nameB={nameB}
            fmt={n}
          />
          <Dual
            label={m('images')}
            a={med.A.images}
            b={med.B.images}
            nameA={nameA}
            nameB={nameB}
            fmt={n}
          />
          <Dual
            label={m('videos')}
            a={med.A.videos}
            b={med.B.videos}
            nameA={nameA}
            nameB={nameB}
            fmt={n}
          />
          <Dual
            label={m('links')}
            a={med.A.links}
            b={med.B.links}
            nameA={nameA}
            nameB={nameB}
            fmt={n}
          />
        </div>
      </Section>

      {/* Horários */}
      <Section title={t('s.hours')} keep>
        <table className="w-full table-fixed border-collapse text-center text-[10px] tabular-nums">
          <thead>
            <tr style={{ color: C.muted }}>
              <th className="py-0.5 text-left font-semibold">{t('heatmap')}</th>
              {BANDS.map((b, i) => (
                <th key={b} className="py-0.5 font-semibold">
                  {b}–{BANDS[i + 1] ?? '24'}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {r.hours.heatmap.map((row, d) => (
              <tr key={d}>
                <th className="py-0.5 text-left font-semibold">{weekdayName(locale, d)}</th>
                {row.map((v, i) => (
                  <td
                    key={i}
                    className="py-1"
                    style={{
                      background: `rgba(124, 92, 240, ${0.06 + (v / heatMax) * 0.7})`,
                      color: v / heatMax > 0.55 ? '#fff' : C.ink,
                    }}
                  >
                    {n(v)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-3 grid grid-cols-2 gap-6">
          <Table
            head={head}
            tones={tones}
            rows={[
              pair('earliest', r.hours.earliest.A ?? '—', r.hours.earliest.B ?? '—'),
              pair('latest', r.hours.latest.A ?? '—', r.hours.latest.B ?? '—'),
            ]}
          />
          <Table
            head={[m('lateNight'), nameA, nameB]}
            tones={tones}
            rows={r.hours.lateNightPerYear.map((y) => [String(y.year), n(y.A), n(y.B)])}
          />
        </div>
      </Section>

      {/* Sequências e tempo */}
      <Section title={t('s.streaks')} keep>
        <div className="grid grid-cols-2 gap-6">
          <Table
            rows={[
              [m('goodMorning'), td('m.days', { count: r.streaks.goodMorningDays })],
              [m('goodNight'), td('m.days', { count: r.streaks.goodNightDays })],
              [td('time.streak'), td('time.days', { n: r.activity.longestStreak })],
              [td('time.silence'), td('time.days', { n: r.activity.longestSilence })],
            ]}
          />
          <Table
            rows={[
              [td('time.start'), r.period.start ? fmtDate(locale, r.period.start) : '—'],
              [td('time.end'), r.period.end ? fmtDate(locale, r.period.end) : '—'],
              [td('time.totalDays'), n(totalDays)],
              [td('time.activeDays'), `${n(r.activity.activeDays)} (${fmtPct(activeRate)})`],
              [td('time.silentDays'), n(Math.max(0, totalDays - r.activity.activeDays))],
            ]}
          />
        </div>
      </Section>

      {/* Apps */}
      <Section title={t('s.apps')} keep>
        <ul className="space-y-1.5">
          {apps.map((y) => (
            <li
              key={y.year}
              className="grid grid-cols-[40px_1fr_110px] items-center gap-2 break-inside-avoid text-[10.5px]"
            >
              <span className="font-semibold">{y.year}</span>
              <div className="flex h-2 overflow-hidden rounded-full">
                <div style={{ width: `${y.whatsappPct}%`, background: C.v }} />
                <div style={{ flex: 1, background: C.line }} />
              </div>
              <span className="text-right tabular-nums" style={{ color: C.muted }}>
                WhatsApp {y.whatsappPct}% · Telegram {y.telegramPct}%
              </span>
            </li>
          ))}
        </ul>
      </Section>

      {/* Livros */}
      <Section title={td('cards.book')} keep>
        <p className="mb-2 text-[10.5px]" style={{ color: C.muted }}>
          {t('booksIntro', { total: n(HARRY_POTTER_TOTAL), words: n(totalWords) })}
        </p>
        <p className="mb-2 font-display text-[28px] font-bold leading-none" style={{ color: C.v }}>
          {book.times >= 1 ? `${oneDecimal.format(book.times)}×` : book.full}
          <span className="ml-2 font-sans text-[12px] font-normal" style={{ color: C.muted }}>
            {book.times >= 1 ? td('book.wholeSeries') : td('book.ofSeries')}
          </span>
        </p>
        <ul className="space-y-1.5">
          {HARRY_POTTER_WORDS.map((w, i) => (
            <li key={i} className="break-inside-avoid">
              <p className="flex justify-between text-[10.5px]">
                <span className="font-semibold">
                  {i + 1}. {td(`book.title.${i + 1}`)}
                </span>
                <span className="tabular-nums" style={{ color: C.muted }}>
                  {n(w)} · {Math.round(bookFill(i) * 100)}%
                </span>
              </p>
              <Meter value={bookFill(i)} color={C.v} />
            </li>
          ))}
        </ul>
        <div className="mt-3 grid grid-cols-2 gap-6 text-[10.5px]">
          {(['A', 'B'] as const).map((who) => (
            <p key={who} style={{ color: WHO[who], fontWeight: 600 }}>
              {td('book.person', {
                name: who === 'A' ? nameA : nameB,
                words: n(vol[who].words),
                share:
                  vol[who].words / HARRY_POTTER_TOTAL >= 1
                    ? td('book.times', {
                        n: oneDecimal.format(vol[who].words / HARRY_POTTER_TOTAL),
                      })
                    : td('book.part', {
                        pct: Math.round((vol[who].words / HARRY_POTTER_TOTAL) * 100),
                      }),
              })}
            </p>
          ))}
        </div>
      </Section>

      {/* Palavras */}
      {dict && wordTotal > 0 && (
        <Section title={td('cards.words')} keep>
          <div className="space-y-3">
            {(
              [
                {
                  id: 'shared',
                  title: td('words.groupShared'),
                  color: C.v,
                  words: wordLists.shared,
                },
                {
                  id: 'A',
                  title: td('words.groupOwn', { name: nameA }),
                  color: C.a,
                  words: wordLists.A,
                },
                {
                  id: 'B',
                  title: td('words.groupOwn', { name: nameB }),
                  color: C.b,
                  words: wordLists.B,
                },
              ] as const
            )
              .filter((g) => g.words.length > 0)
              .map((g) => (
                <div key={g.id} className="break-inside-avoid">
                  <p className="mb-1 text-[11px] font-bold" style={{ color: g.color }}>
                    {g.title}
                  </p>
                  <ul className="flex flex-wrap gap-2">
                    {g.words.map((w) => {
                      const u = dict.usage[w];
                      const who = wordOwner(u);
                      return (
                        <li
                          key={w}
                          className="break-inside-avoid rounded-full px-3 py-1"
                          style={{ border: `1.5px solid ${WHO[who]}`, color: WHO[who] }}
                        >
                          <span className="font-display text-[14px] font-bold">{w}</span>
                          {u && (
                            <span
                              className="ml-1.5 text-[10px] tabular-nums"
                              style={{ color: C.muted }}
                            >
                              {n(u.A + u.B)}× ({n(u.A)} · {n(u.B)})
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
          </div>
          {hiddenWords.length > 0 && (
            <p className="mt-1.5 text-[9.5px]" style={{ color: C.muted }}>
              {t('hiddenNote', { count: hiddenWords.length })}
            </p>
          )}
        </Section>
      )}

      <footer
        className="mt-9 flex items-center gap-3 pt-3 text-[10px]"
        style={{ borderTop: `1px solid ${C.line}`, color: C.muted }}
      >
        <Waves width={44} height={20} />
        <span>{t('footer')}</span>
      </footer>
    </div>,
    document.body,
  );
}
