'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useState, type ReactNode } from 'react';
import { useReport } from '@/components/report/ReportProvider';
import { fmtDuration, fmtNum, fmtPct, weekdayName } from '@/lib/format';
import { DualBar, Heatmap, PersonTable, Spark, StackedBars } from './charts';
import { DetailPanel } from './DetailPanel';

type CardId =
  | 'volume'
  | 'perPerson'
  | 'response'
  | 'started'
  | 'heatmap'
  | 'emojis'
  | 'media'
  | 'streaks'
  | 'apps';

const BANDS = ['00', '04', '08', '12', '16', '20']; // faixas de 4 h

/** Painel: grid de cards; o clique abre o detalhe (drawer / bottom sheet). */
export function DashboardView() {
  const t = useTranslations('dashboard');
  const locale = useLocale();
  const { report: r } = useReport();
  const [open, setOpen] = useState<CardId | null>(null);
  const close = useCallback(() => setOpen(null), []);

  const n = (v: number) => fmtNum(locale, v);
  const { A: nameA, B: nameB } = r.people;
  const months = r.volume.perMonth;
  const m = (key: string) => t(`m.${key}`);
  // Linhas A × B para as tabelas de detalhe
  const rows = (items: [string, number | string, number | string][]) =>
    items.map(([key, a, b]) => ({
      label: m(key),
      a: typeof a === 'number' ? n(a) : a,
      b: typeof b === 'number' ? n(b) : b,
    }));
  const table = (items: [string, number | string, number | string][]) => (
    <PersonTable rows={rows(items)} nameA={nameA} nameB={nameB} />
  );

  const vol = r.volume.perPerson;
  const ses = r.sessions.perPerson;
  const res = r.response.perPerson;
  const lang = r.language.perPerson;
  const med = r.media.perPerson;
  const last12 = months.slice(-12).map((x) => ({ label: x.month, a: x.A, b: x.B }));
  const days = Array.from({ length: 7 }, (_, d) => weekdayName(locale, d));
  const bands = BANDS.map((b, i) => `${b}–${BANDS[i + 1] ?? '24'}`);

  const cards: { id: CardId; summary: ReactNode; detail: ReactNode }[] = [
    {
      id: 'volume',
      summary: (
        <>
          <p className="font-display text-3xl font-bold">{n(vol.A.messages + vol.B.messages)}</p>
          <Spark a={months.map((x) => x.A)} b={months.map((x) => x.B)} />
        </>
      ),
      detail: (
        <>
          <h3 className="mb-2 text-sm font-semibold text-muted">{m('lastMonths')}</h3>
          <StackedBars items={last12} />
        </>
      ),
    },
    {
      id: 'perPerson',
      summary: (
        <DualBar a={vol.A.messages} b={vol.B.messages} labelA={nameA} labelB={nameB} fmt={n} />
      ),
      detail: table([
        ['messages', vol.A.messages, vol.B.messages],
        ['words', vol.A.words, vol.B.words],
        ['characters', vol.A.characters, vol.B.characters],
        ['uniqueWords', vol.A.uniqueWords, vol.B.uniqueWords],
      ]),
    },
    {
      id: 'response',
      summary: (
        <div className="flex justify-between font-display text-2xl font-bold">
          <span className="text-a">{fmtDuration(res.A.avgFirstResponseSec)}</span>
          <span className="text-b">{fmtDuration(res.B.avgFirstResponseSec)}</span>
        </div>
      ),
      detail: table([
        [
          'avgResponse',
          fmtDuration(res.A.avgFirstResponseSec),
          fmtDuration(res.B.avgFirstResponseSec),
        ],
        ['within10', fmtPct(res.A.rateWithin10Min), fmtPct(res.B.rateWithin10Min)],
      ]),
    },
    {
      id: 'started',
      summary: (
        <DualBar a={ses.A.started} b={ses.B.started} labelA={nameA} labelB={nameB} fmt={n} />
      ),
      detail: table([
        ['started', ses.A.started, ses.B.started],
        ['ended', ses.A.ended, ses.B.ended],
        ['doubleMessages', ses.A.doubleMessages, ses.B.doubleMessages],
        ['unanswered', ses.A.unanswered, ses.B.unanswered],
      ]),
    },
    {
      id: 'heatmap',
      summary: (
        <Heatmap data={r.hours.heatmap} rows={days} cols={bands} label={t('cards.heatmap')} />
      ),
      detail: (
        <div className="space-y-5">
          {table([
            ['earliest', r.hours.earliest.A ?? '—', r.hours.earliest.B ?? '—'],
            ['latest', r.hours.latest.A ?? '—', r.hours.latest.B ?? '—'],
          ])}
          <h3 className="text-sm font-semibold text-muted">{m('lateNight')}</h3>
          <StackedBars
            items={r.hours.lateNightPerYear.map((y) => ({ label: String(y.year), a: y.A, b: y.B }))}
          />
        </div>
      ),
    },
    {
      id: 'emojis',
      summary: (
        <div className="flex justify-between text-2xl">
          <span>
            {lang.A.topEmojis
              .slice(0, 3)
              .map((e) => e.emoji)
              .join(' ')}
          </span>
          <span>
            {lang.B.topEmojis
              .slice(0, 3)
              .map((e) => e.emoji)
              .join(' ')}
          </span>
        </div>
      ),
      detail: (
        <div className="space-y-5">
          <PersonTable
            nameA={nameA}
            nameB={nameB}
            rows={[0, 1, 2, 3, 4].map((i) => ({
              label: `#${i + 1}`,
              a: `${lang.A.topEmojis[i]?.emoji ?? ''} ${n(lang.A.topEmojis[i]?.count ?? 0)}`,
              b: `${lang.B.topEmojis[i]?.emoji ?? ''} ${n(lang.B.topEmojis[i]?.count ?? 0)}`,
            }))}
          />
          {table([
            ['laughs', lang.A.laughs, lang.B.laughs],
            ['questions', lang.A.questions, lang.B.questions],
            ['apologies', lang.A.apologies, lang.B.apologies],
            ['affection', lang.A.affection, lang.B.affection],
          ])}
        </div>
      ),
    },
    {
      id: 'media',
      summary: <DualBar a={med.A.audios} b={med.B.audios} labelA={nameA} labelB={nameB} fmt={n} />,
      detail: table([
        ['audios', med.A.audios, med.B.audios],
        ['texts', med.A.texts, med.B.texts],
        ['images', med.A.images, med.B.images],
        ['videos', med.A.videos, med.B.videos],
        ['links', med.A.links, med.B.links],
      ]),
    },
    {
      id: 'streaks',
      summary: (
        <div className="flex justify-between font-display text-2xl font-bold text-ok">
          <span>☀ {r.streaks.goodMorningDays}</span>
          <span>☾ {r.streaks.goodNightDays}</span>
        </div>
      ),
      detail: (
        <ul className="space-y-3">
          <li className="flex justify-between">
            <span className="text-muted">{m('goodMorning')}</span>
            <b className="text-ok">{t('m.days', { count: r.streaks.goodMorningDays })}</b>
          </li>
          <li className="flex justify-between">
            <span className="text-muted">{m('goodNight')}</span>
            <b className="text-ok">{t('m.days', { count: r.streaks.goodNightDays })}</b>
          </li>
        </ul>
      ),
    },
    {
      id: 'apps',
      summary: (
        <DualBar
          a={r.apps.perYear.at(-1)?.whatsappPct ?? 0}
          b={r.apps.perYear.at(-1)?.telegramPct ?? 0}
          labelA="WhatsApp"
          labelB="Telegram"
          fmt={(v) => `${v}%`}
        />
      ),
      detail: (
        <table className="w-full text-sm">
          <tbody className="divide-y divide-line">
            {r.apps.perYear.map((y) => (
              <tr key={y.year}>
                <th scope="row" className="py-2 text-left font-normal text-muted">
                  {y.year}
                </th>
                <td className="py-2 text-right">WhatsApp {y.whatsappPct}%</td>
                <td className="py-2 text-right">Telegram {y.telegramPct}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      ),
    },
  ];

  const active = cards.find((c) => c.id === open);

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 pt-4 sm:px-6">
      <header>
        <h1 className="font-display text-3xl font-bold sm:text-4xl">{t('title')}</h1>
        <p className="mt-1 text-muted">{t('subtitle')}</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <button
            key={c.id}
            type="button"
            aria-haspopup="dialog"
            onClick={() => setOpen(c.id)}
            className="panel panel-hover flex min-h-36 flex-col gap-3 p-5 text-left"
          >
            <h2 className="text-sm font-semibold text-muted">{t(`cards.${c.id}`)}</h2>
            <div className="w-full">{c.summary}</div>
          </button>
        ))}

        {/* Equilíbrio: a fórmula ainda não foi decidida, então nada de número ou nota */}
        <section className="panel flex min-h-36 flex-col gap-3 p-5">
          <h2 className="text-sm font-semibold text-muted">{t('cards.balance')}</h2>
          <p className="font-display text-xl font-bold text-sync">{t('balancePending')}</p>
        </section>
      </div>

      {active && (
        <DetailPanel title={t(`cards.${active.id}`)} onClose={close}>
          {active.detail}
        </DetailPanel>
      )}
    </main>
  );
}
