'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useSyncExternalStore, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useScoreRows } from '@/components/dashboard/scoreRows';
import { useReport } from '@/components/report/ReportProvider';
import { bookProgress, HARRY_POTTER_TOTAL, HARRY_POTTER_WORDS } from '@/lib/books';
import { fmtDate, fmtDuration, fmtNum, fmtPct, fmtScore, weekdayName } from '@/lib/format';
import { sharedDictionary } from '@/lib/share';
import { daysBetween, formatSpan, spanBetween } from '@/lib/span';

const BANDS = ['00', '04', '08', '12', '16', '20'];
const noop = () => () => {};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-6 break-inside-avoid">
      <h2 className="mb-2 border-b border-neutral-300 pb-1 text-base font-bold">{title}</h2>
      {children}
    </section>
  );
}

/** Tabela simples: a primeira coluna é o rótulo. */
function Table({ head, rows }: { head?: string[]; rows: (string | number)[][] }) {
  return (
    <table className="w-full border-collapse text-[11px]">
      {head && (
        <thead>
          <tr className="text-left text-neutral-600">
            {head.map((h, i) => (
              <th key={i} className={`py-1 font-semibold ${i > 0 ? 'text-right' : ''}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
      )}
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className="border-t border-neutral-200">
            {row.map((cell, k) => (
              <td key={k} className={`py-1 ${k > 0 ? 'text-right tabular-nums' : ''}`}>
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

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
  if (!mounted) return null;

  const n = (v: number) => fmtNum(locale, v);
  const m = (key: string) => td(`m.${key}`);
  const pair = (key: string, a: number | string, b: number | string): (string | number)[] => [
    m(key),
    typeof a === 'number' ? n(a) : a,
    typeof b === 'number' ? n(b) : b,
  ];
  const head = ['', nameA, nameB];

  const vol = r.volume.perPerson;
  const ses = r.sessions.perPerson;
  const res = r.response.perPerson;
  const lang = r.language.perPerson;
  const med = r.media.perPerson;
  const totalMessages = vol.A.messages + vol.B.messages;
  const spanLabel = (unit: 'years' | 'months' | 'days', count: number) =>
    td(`time.span.${unit}`, { n: count });
  const together = r.period.start
    ? formatSpan(spanBetween(r.period.start, r.period.end), locale, spanLabel)
    : '';
  const totalDays = r.period.start ? daysBetween(r.period.start, r.period.end) + 1 : 0;

  // Mensagens por ano (soma dos meses)
  const byYear = new Map<string, { A: number; B: number }>();
  for (const mo of r.volume.perMonth) {
    const y = mo.month.slice(0, 4);
    const row = byYear.get(y) ?? { A: 0, B: 0 };
    row.A += mo.A;
    row.B += mo.B;
    byYear.set(y, row);
  }

  const maxMonth = Math.max(1, ...r.volume.perMonth.map((x) => x.A + x.B));
  const months = r.volume.perMonth;
  const chartW = 700;
  const chartH = 90;
  const barW = chartW / Math.max(1, months.length);

  const book = bookProgress(vol.A.words + vol.B.words);
  const dict = sharedDictionary(r, hiddenWords);
  const firstsRows = (
    ['firstMessage', 'firstILoveYou', 'firstPhoto', 'firstAudio'] as const
  ).flatMap((key) => {
    const date = r.firsts[key];
    return date ? [[t(`firsts.${key}`), fmtDate(locale, date)]] : [];
  });

  return createPortal(
    <div id="print-root" data-testid="print-report">
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500">Sintonia</p>
        <h1 className="mt-1 text-2xl font-bold">{t('title')}</h1>
        <p className="mt-1 text-sm">
          {t('subtitle', { a: r.people.A, b: r.people.B })}
          {r.period.start &&
            ` · ${fmtDate(locale, r.period.start)} – ${fmtDate(locale, r.period.end)}`}
          {together && ` (${together})`}
        </p>
        <p className="mt-1 text-[11px] text-neutral-500">
          {t('generated', { date: fmtDate(locale, new Date().toISOString().slice(0, 10)) })}
        </p>
      </header>

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
              ],
              ['balance', td('cards.balance'), r.balance.score, balanceRows, balanceHint],
            ] as const
          ).map(([id, label, score, rows, hint]) => (
            <div key={id}>
              <p className="text-sm font-semibold">{label}</p>
              <p className="text-3xl font-bold">
                {score === null ? '—' : fmtScore(locale, score)}
                <span className="ml-1 text-sm font-normal text-neutral-500">
                  {td('score.outOf')}
                </span>
              </p>
              <p className="mb-1 text-[11px] text-neutral-600">
                {id === 'sintonia' && score === null ? td('sintonia.short') : hint}
              </p>
              <Table
                rows={rows.map((row) => [`${row.label} (${row.weight})`, `${row.scoreText}`])}
              />
              {rows.map((row) => (
                <p key={row.id} className="text-[10px] text-neutral-500">
                  {row.label}: {row.detail}
                </p>
              ))}
            </div>
          ))}
        </div>
        <p className="mt-2 text-[10px] text-neutral-500">{td('balance.note')}</p>
      </Section>

      <Section title={t('s.volume')}>
        <p className="mb-1 text-sm">{t('totalMessages', { count: n(totalMessages) })}</p>
        <Table
          head={head}
          rows={[
            pair('messages', vol.A.messages, vol.B.messages),
            pair('words', vol.A.words, vol.B.words),
            pair('characters', vol.A.characters, vol.B.characters),
            pair('uniqueWords', vol.A.uniqueWords, vol.B.uniqueWords),
          ]}
        />
        <svg
          viewBox={`0 0 ${chartW} ${chartH}`}
          className="mt-3 w-full"
          role="img"
          aria-label={t('perMonth')}
        >
          {months.map((mo, i) => {
            const hA = (mo.A / maxMonth) * chartH;
            const hB = (mo.B / maxMonth) * chartH;
            return (
              <g key={mo.month}>
                <rect x={i * barW} y={chartH - hA} width={barW * 0.9} height={hA} fill="#0aa5bd" />
                <rect
                  x={i * barW}
                  y={chartH - hA - hB}
                  width={barW * 0.9}
                  height={hB}
                  fill="#d81b9a"
                />
              </g>
            );
          })}
        </svg>
        <p className="text-[10px] text-neutral-500">
          {t('perMonth')} ({months[0]?.month} – {months.at(-1)?.month})
        </p>
        <div className="mt-3">
          <Table
            head={[t('perYear'), nameA, nameB]}
            rows={[...byYear.entries()].map(([y, v]) => [y, n(v.A), n(v.B)])}
          />
        </div>
      </Section>

      <Section title={t('s.response')}>
        <Table
          head={head}
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
          <div className="mt-3">
            <Table
              head={[t('perYear'), t('pace.median'), t('pace.vsUsual')]}
              rows={r.sintonia.perYear.map((y) => [
                String(y.year),
                y.medianResponseSec === null ? '—' : fmtDuration(y.medianResponseSec),
                y.vsUsualPct === null ? '—' : `${y.vsUsualPct > 0 ? '+' : ''}${y.vsUsualPct}%`,
              ])}
            />
          </div>
        )}
      </Section>

      <Section title={t('s.sessions')}>
        <Table
          head={head}
          rows={[
            pair('started', ses.A.started, ses.B.started),
            pair('ended', ses.A.ended, ses.B.ended),
            pair('doubleMessages', ses.A.doubleMessages, ses.B.doubleMessages),
            pair('unanswered', ses.A.unanswered, ses.B.unanswered),
          ]}
        />
      </Section>

      <Section title={t('s.language')}>
        <Table
          head={head}
          rows={[
            ...[0, 1, 2, 3, 4].map((i) => [
              `${td('cards.emojis')} #${i + 1}`,
              `${lang.A.topEmojis[i]?.emoji ?? ''} ${n(lang.A.topEmojis[i]?.count ?? 0)}`,
              `${lang.B.topEmojis[i]?.emoji ?? ''} ${n(lang.B.topEmojis[i]?.count ?? 0)}`,
            ]),
            pair('laughs', lang.A.laughs, lang.B.laughs),
            pair('questions', lang.A.questions, lang.B.questions),
            pair('apologies', lang.A.apologies, lang.B.apologies),
            pair('affection', lang.A.affection, lang.B.affection),
          ]}
        />
      </Section>

      <Section title={t('s.media')}>
        <Table
          head={head}
          rows={[
            pair('audios', med.A.audios, med.B.audios),
            pair('texts', med.A.texts, med.B.texts),
            pair('images', med.A.images, med.B.images),
            pair('videos', med.A.videos, med.B.videos),
            pair('links', med.A.links, med.B.links),
          ]}
        />
      </Section>

      <Section title={t('s.hours')}>
        <Table
          head={[t('heatmap'), ...BANDS.map((b, i) => `${b}–${BANDS[i + 1] ?? '24'}`)]}
          rows={r.hours.heatmap.map((row, d) => [weekdayName(locale, d), ...row.map(n)])}
        />
        <div className="mt-3 grid grid-cols-2 gap-6">
          <Table
            head={head}
            rows={[
              pair('earliest', r.hours.earliest.A ?? '—', r.hours.earliest.B ?? '—'),
              pair('latest', r.hours.latest.A ?? '—', r.hours.latest.B ?? '—'),
            ]}
          />
          <Table
            head={[m('lateNight'), nameA, nameB]}
            rows={r.hours.lateNightPerYear.map((y) => [String(y.year), n(y.A), n(y.B)])}
          />
        </div>
      </Section>

      <Section title={t('s.streaks')}>
        <Table
          rows={[
            [m('goodMorning'), td('m.days', { count: r.streaks.goodMorningDays })],
            [m('goodNight'), td('m.days', { count: r.streaks.goodNightDays })],
            [td('time.streak'), td('time.days', { n: r.activity.longestStreak })],
            [td('time.silence'), td('time.days', { n: r.activity.longestSilence })],
          ]}
        />
      </Section>

      <Section title={t('s.time')}>
        <Table
          rows={[
            [td('time.start'), r.period.start ? fmtDate(locale, r.period.start) : '—'],
            [td('time.end'), r.period.end ? fmtDate(locale, r.period.end) : '—'],
            [td('time.totalDays'), n(totalDays)],
            [td('time.activeDays'), n(r.activity.activeDays)],
            [td('time.silentDays'), n(Math.max(0, totalDays - r.activity.activeDays))],
          ]}
        />
      </Section>

      <Section title={t('s.apps')}>
        <Table
          head={[t('perYear'), 'WhatsApp', 'Telegram']}
          rows={r.apps.perYear.map((y) => [
            String(y.year),
            `${y.whatsappPct}%`,
            `${y.telegramPct}%`,
          ])}
        />
      </Section>

      <Section title={t('s.journey')}>
        {firstsRows.length > 0 && <Table rows={firstsRows} />}
        {r.phases.phases.length > 0 && (
          <div className="mt-3">
            <Table
              rows={r.phases.phases.map((p) => [
                fmtDate(locale, p.date, false),
                t(`phase.${p.kind}`, { pct: Math.abs(p.changePct) }),
              ])}
            />
          </div>
        )}
      </Section>

      <Section title={td('cards.book')}>
        <p className="mb-1 text-[11px] text-neutral-600">
          {t('booksIntro', { total: n(HARRY_POTTER_TOTAL), words: n(vol.A.words + vol.B.words) })}
        </p>
        <Table
          head={[td('cards.book'), t('words'), t('read')]}
          rows={HARRY_POTTER_WORDS.map((w, i) => {
            const fill =
              book.times >= 1 || i < book.full
                ? 1
                : i === book.current.index
                  ? book.current.fraction
                  : 0;
            return [td(`book.title.${i + 1}`), n(w), `${Math.round(fill * 100)}%`];
          })}
        />
      </Section>

      {dict && dict.topWords.length > 0 && (
        <Section title={td('cards.words')}>
          <Table
            head={[t('word'), nameA, nameB]}
            rows={dict.topWords.map((w) => [w, n(dict.usage[w]?.A ?? 0), n(dict.usage[w]?.B ?? 0)])}
          />
          {hiddenWords.length > 0 && (
            <p className="mt-1 text-[10px] text-neutral-500">
              {t('hiddenNote', { count: hiddenWords.length })}
            </p>
          )}
        </Section>
      )}

      <footer className="mt-8 border-t border-neutral-300 pt-2 text-[10px] text-neutral-500">
        {t('footer')}
      </footer>
    </div>,
    document.body,
  );
}
