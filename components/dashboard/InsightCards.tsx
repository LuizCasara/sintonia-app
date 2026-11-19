'use client';

import { useLocale, useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { bookProgress, HARRY_POTTER_TOTAL, HARRY_POTTER_WORDS } from '@/lib/books';
import { fmtDate, fmtNum } from '@/lib/format';
import type { Report } from '@/lib/metrics';
import { daysBetween, formatSpan, spanBetween } from '@/lib/span';

type Summary = { summary: ReactNode; detail: ReactNode };

/** Cartões "Tempo de conversa" e "Em livros" (Harry Potter): só leem o relatório. */
export function useInsightCards(r: Report, names: { A: string; B: string }) {
  const t = useTranslations('dashboard');
  const locale = useLocale();
  const n = (v: number) => fmtNum(locale, v);
  const oneDecimal = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });

  // --- Tempo de conversa
  const { activity, period } = r;
  const totalDays = period.start ? daysBetween(period.start, period.end) + 1 : 0;
  const rate = totalDays > 0 ? Math.min(1, activity.activeDays / totalDays) : 0;
  const ratePct = Math.round(rate * 100);
  const together =
    (period.start
      ? formatSpan(spanBetween(period.start, period.end), locale, (unit, count) =>
          t(`time.span.${unit}`, { n: count }),
        )
      : '') || t('time.span.days', { n: totalDays });
  const rows: [string, string][] = [
    ['start', period.start ? fmtDate(locale, period.start) : '—'],
    ['end', period.end ? fmtDate(locale, period.end) : '—'],
    ['totalDays', n(totalDays)],
    ['activeDays', `${n(activity.activeDays)} (${t('time.rate', { pct: ratePct })})`],
    ['silentDays', n(Math.max(0, totalDays - activity.activeDays))],
    ['streak', t('time.days', { n: activity.longestStreak })],
    ['silence', t('time.days', { n: activity.longestSilence })],
  ];

  const time: Summary = {
    summary: (
      <div className="space-y-3">
        <p className="font-display text-2xl font-bold">{together}</p>
        <div
          className="h-3 overflow-hidden rounded-full bg-void"
          role="img"
          aria-label={t('time.rate', { pct: ratePct })}
        >
          <div className="h-full bg-sync glow-sync" style={{ width: `${rate * 100}%` }} />
        </div>
        <p className="text-sm text-muted">
          {t('time.activeOf', { active: n(activity.activeDays), total: n(totalDays) })}
        </p>
      </div>
    ),
    detail: (
      <dl className="divide-y divide-line text-sm">
        {rows.map(([key, value]) => (
          <div key={key} className="flex justify-between gap-4 py-2.5">
            <dt className="text-muted">{t(`time.${key}`)}</dt>
            <dd className="font-semibold">{value}</dd>
          </div>
        ))}
      </dl>
    ),
  };

  // --- Em livros
  const words = { A: r.volume.perPerson.A.words, B: r.volume.perPerson.B.words };
  const totalWords = words.A + words.B;
  const book = bookProgress(totalWords);
  const whole = book.times >= 1;
  const title = (i: number) => t(`book.title.${i + 1}`);
  const fillOf = (i: number) =>
    whole || i < book.full ? 1 : i === book.current.index ? book.current.fraction : 0;
  const nextLine =
    whole || totalWords === 0
      ? null
      : book.current.fraction >= 0.5
        ? t('book.next', { count: n(book.missing), title: title(book.current.index) })
        : book.current.fraction > 0
          ? t('book.nextStart', {
              pct: Math.floor(book.current.fraction * 100),
              title: title(book.current.index),
            })
          : null;
  const shareOf = (w: number) => {
    const times = w / HARRY_POTTER_TOTAL;
    return times >= 1
      ? t('book.times', { n: oneDecimal.format(times) })
      : t('book.part', { pct: Math.round(times * 100) });
  };

  const bookCard: Summary = {
    summary: (
      <div className="space-y-3">
        <p className="flex flex-wrap items-baseline gap-x-2">
          <span className="font-display text-3xl font-bold text-sync">
            {whole ? `${oneDecimal.format(book.times)}×` : book.full}
          </span>
          <span className="text-sm text-muted">
            {whole ? t('book.wholeSeries') : t('book.ofSeries')}
          </span>
        </p>
        <div className="flex gap-1" role="img" aria-label={`${book.full}/7`}>
          {HARRY_POTTER_WORDS.map((_, i) => (
            <div key={i} className="h-3 flex-1 overflow-hidden rounded-full bg-void">
              <div className="h-full bg-sync glow-sync" style={{ width: `${fillOf(i) * 100}%` }} />
            </div>
          ))}
        </div>
        {nextLine && <p className="text-sm text-muted">{nextLine}</p>}
      </div>
    ),
    detail: (
      <div className="space-y-5">
        <p className="text-muted">{t('book.intro', { total: n(HARRY_POTTER_TOTAL) })}</p>
        <ol className="space-y-3">
          {HARRY_POTTER_WORDS.map((w, i) => (
            <li key={i}>
              <div className="flex justify-between gap-3 text-sm">
                <span>
                  {i + 1}. {title(i)}
                </span>
                <span className="text-muted">{n(w)}</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-void">
                <div className="h-full bg-sync" style={{ width: `${fillOf(i) * 100}%` }} />
              </div>
            </li>
          ))}
        </ol>
        <ul className="space-y-1 text-sm text-muted">
          {(['A', 'B'] as const).map((who) => (
            <li key={who} className={who === 'A' ? 'text-a' : 'text-b'}>
              {t('book.person', {
                name: names[who],
                words: n(words[who]),
                share: shareOf(words[who]),
              })}
            </li>
          ))}
        </ul>
      </div>
    ),
  };

  return { time, book: bookCard };
}
