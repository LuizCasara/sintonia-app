'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useState, type ReactNode } from 'react';
import { useReport } from '@/components/report/ReportProvider';
import { fmtDuration, fmtNum, fmtPct, fmtScore, weekdayName } from '@/lib/format';
import {
  DualBar,
  Heatmap,
  MediaBars,
  NeutralBar,
  PersonRow,
  PersonTable,
  Spark,
  StackedBars,
} from './charts';
import { DetailPanel } from './DetailPanel';
import { ScoreBadge, ScoreBreakdown, type ScoreRow } from './ScorePanel';

type CardId =
  | 'volume'
  | 'perPerson'
  | 'response'
  | 'started'
  | 'heatmap'
  | 'emojis'
  | 'media'
  | 'streaks'
  | 'apps'
  | 'sintonia'
  | 'balance';

const BANDS = ['00', '04', '08', '12', '16', '20']; // faixas de 4 h
const firstName = (full: string) => full.split(' ')[0] ?? full;

/** Painel: grid de cards; o clique abre o detalhe (drawer / bottom sheet). */
export function DashboardView() {
  const t = useTranslations('dashboard');
  const locale = useLocale();
  const { report: r } = useReport();
  const [open, setOpen] = useState<CardId | null>(null);
  const close = useCallback(() => setOpen(null), []);

  const n = (v: number) => fmtNum(locale, v);
  const nameA = firstName(r.people.A);
  const nameB = firstName(r.people.B);
  const months = r.volume.perMonth;
  const m = (key: string) => t(`m.${key}`);
  // Linhas A × B para as tabelas de detalhe
  const table = (items: [string, number | string, number | string][]) => (
    <PersonTable
      nameA={nameA}
      nameB={nameB}
      rows={items.map(([key, a, b]) => ({
        label: m(key),
        a: typeof a === 'number' ? n(a) : a,
        b: typeof b === 'number' ? n(b) : b,
      }))}
    />
  );

  const vol = r.volume.perPerson;
  const ses = r.sessions.perPerson;
  const res = r.response.perPerson;
  const lang = r.language.perPerson;
  const med = r.media.perPerson;
  const years = Math.max(1, Math.round(r.period.days / 365));
  const lastApps = r.apps.perYear.at(-1);
  const last12 = months.slice(-12).map((x) => ({ label: x.month, a: x.A, b: x.B }));
  const days = Array.from({ length: 7 }, (_, d) => weekdayName(locale, d));
  const bands = BANDS.map((b, i) => `${b}–${BANDS[i + 1] ?? '24'}`);
  const emojis = (who: 'A' | 'B', count: number) =>
    lang[who].topEmojis
      .slice(0, count)
      .map((e) => e.emoji)
      .join(' ');

  const pct = (v: number) => Math.round(v * 100);
  const sintonia = r.sintonia;
  const balance = r.balance;
  const sintoniaRows: ScoreRow[] = sintonia.parts.map((p) => ({
    id: p.id,
    label: t(`sintonia.parts.${p.id}`),
    detail:
      p.id === 'responseTime'
        ? t('sintonia.detail.responseTime', { time: fmtDuration(p.value) })
        : t(`sintonia.detail.${p.id}`, { pct: fmtPct(p.value) }),
    weight: t('score.weight', { pct: pct(p.weight) }),
    score: p.score,
    scoreText: fmtScore(locale, p.score * 10),
  }));
  const balanceRows: ScoreRow[] = balance.items.map((i) => ({
    id: i.id,
    label: t(`balance.items.${i.id}`),
    detail: `${nameA} ${pct(i.shareA)}% · ${nameB} ${pct(1 - i.shareA)}%`,
    weight: t('score.weight', { pct: pct(i.weight) }),
    score: i.score,
    scoreText: fmtScore(locale, i.score * 10),
  }));
  // Parte do esforço de quem puxa mais (média ponderada dos itens).
  const effortA = balance.items.reduce((sum, i) => sum + i.weight * i.shareA, 0);
  const balanceHint =
    balance.leaning === null
      ? t('balance.even')
      : t('balance.leans', {
          name: balance.leaning === 'A' ? nameA : nameB,
          pct: pct(balance.leaning === 'A' ? effortA : 1 - effortA),
        });

  const cards: { id: CardId; span?: string; summary: ReactNode; detail: ReactNode }[] = [
    {
      id: 'volume',
      span: 'sm:col-span-2',
      summary: (
        <>
          <p className="font-display text-3xl font-bold">{n(vol.A.messages + vol.B.messages)}</p>
          <p className="mb-1 text-sm text-muted">{t('m.inYears', { years })}</p>
          <Spark a={months.map((x) => x.A)} b={months.map((x) => x.B)} />
          <p className="mt-1 text-xs text-muted">{m('perMonth')}</p>
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
        <div className="space-y-4">
          <DualBar a={vol.A.messages} b={vol.B.messages} nameA={nameA} nameB={nameB} fmt={n} />
          <div className="space-y-1 text-sm text-muted">
            <PersonRow who="A" name={nameA}>
              {n(vol.A.words)} {m('words').toLowerCase()}
            </PersonRow>
            <PersonRow who="B" name={nameB}>
              {n(vol.B.words)} {m('words').toLowerCase()}
            </PersonRow>
          </div>
        </div>
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
        <div className="space-y-2 font-display text-xl font-bold">
          <PersonRow who="A" name={nameA}>
            {fmtDuration(res.A.avgFirstResponseSec)}
          </PersonRow>
          <PersonRow who="B" name={nameB}>
            {fmtDuration(res.B.avgFirstResponseSec)}
          </PersonRow>
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
      summary: <DualBar a={ses.A.started} b={ses.B.started} nameA={nameA} nameB={nameB} fmt={n} />,
      detail: table([
        ['started', ses.A.started, ses.B.started],
        ['ended', ses.A.ended, ses.B.ended],
        ['doubleMessages', ses.A.doubleMessages, ses.B.doubleMessages],
        ['unanswered', ses.A.unanswered, ses.B.unanswered],
      ]),
    },
    {
      id: 'emojis',
      summary: (
        <div className="space-y-2 text-xl">
          <PersonRow who="A" name={nameA}>
            {emojis('A', 3)}
          </PersonRow>
          <PersonRow who="B" name={nameB}>
            {emojis('B', 3)}
          </PersonRow>
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
      summary: (
        <MediaBars
          audioLabel={m('audioLegend')}
          textLabel={m('textLegend')}
          rows={[
            { who: 'A', name: nameA, audio: med.A.audios, text: med.A.texts },
            { who: 'B', name: nameB, audio: med.B.audios, text: med.B.texts },
          ]}
        />
      ),
      detail: table([
        ['audios', med.A.audios, med.B.audios],
        ['texts', med.A.texts, med.B.texts],
        ['images', med.A.images, med.B.images],
        ['videos', med.A.videos, med.B.videos],
        ['links', med.A.links, med.B.links],
      ]),
    },
    {
      id: 'heatmap',
      span: 'sm:col-span-2',
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
            items={r.hours.lateNightPerYear.map((y) => ({
              label: String(y.year),
              a: y.A,
              b: y.B,
            }))}
          />
        </div>
      ),
    },
    {
      id: 'streaks',
      summary: (
        <ul className="space-y-2 text-ok">
          <li className="flex items-baseline justify-between gap-2">
            <span className="text-sm text-muted">☀ {m('morning')}</span>
            <span className="font-display text-xl font-bold">
              {t('m.days', { count: r.streaks.goodMorningDays })}
            </span>
          </li>
          <li className="flex items-baseline justify-between gap-2">
            <span className="text-sm text-muted">☾ {m('night')}</span>
            <span className="font-display text-xl font-bold">
              {t('m.days', { count: r.streaks.goodNightDays })}
            </span>
          </li>
        </ul>
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
        <NeutralBar
          a={lastApps?.whatsappPct ?? 0}
          b={lastApps?.telegramPct ?? 0}
          labelA="WhatsApp"
          labelB="Telegram"
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
                <td className="py-2 text-right text-sync">WhatsApp {y.whatsappPct}%</td>
                <td className="py-2 text-right text-muted">Telegram {y.telegramPct}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      ),
    },
    {
      id: 'sintonia',
      summary:
        sintonia.score === null ? (
          <p className="text-sm text-muted">{t('sintonia.short')}</p>
        ) : (
          <ScoreBadge
            value={fmtScore(locale, sintonia.score)}
            outOf={t('score.outOf')}
            hint={t('sintonia.tagline')}
          />
        ),
      detail: (
        <div className="space-y-5">
          {sintonia.score !== null && (
            <ScoreBadge
              value={fmtScore(locale, sintonia.score)}
              outOf={t('score.outOf')}
              hint={t('sintonia.tagline')}
            />
          )}
          <p className="text-muted">{t('sintonia.explain')}</p>
          {sintonia.score === null ? (
            <p className="text-sm text-sync">{t('sintonia.short')}</p>
          ) : (
            <>
              <ScoreBreakdown rows={sintoniaRows} />
              <p className="text-sm text-muted">{t('sintonia.toneNote')}</p>
            </>
          )}
        </div>
      ),
    },
    {
      id: 'balance',
      summary:
        balance.score === null ? (
          <p className="text-sm text-muted">—</p>
        ) : (
          <ScoreBadge
            value={fmtScore(locale, balance.score)}
            outOf={t('score.outOf')}
            hint={balanceHint}
            tone={balance.leaning === 'A' ? 'a' : balance.leaning === 'B' ? 'b' : 'sync'}
          />
        ),
      detail: (
        <div className="space-y-5">
          {balance.score !== null && (
            <ScoreBadge
              value={fmtScore(locale, balance.score)}
              outOf={t('score.outOf')}
              hint={balanceHint}
              tone={balance.leaning === 'A' ? 'a' : balance.leaning === 'B' ? 'b' : 'sync'}
            />
          )}
          <p className="text-muted">{t('balance.explain')}</p>
          <ScoreBreakdown rows={balanceRows} />
          <p className="text-sm text-muted">{t('balance.note')}</p>
        </div>
      ),
    },
  ];

  const active = cards.find((c) => c.id === open);

  function renderCard(id: CardId) {
    const c = cards.find((x) => x.id === id);
    if (!c) return null;
    return (
      <button
        key={c.id}
        type="button"
        aria-haspopup="dialog"
        onClick={() => setOpen(c.id)}
        className={`panel panel-hover flex flex-col gap-3 p-5 text-left ${c.span ?? ''}`}
      >
        <h2 className="text-sm font-semibold text-muted">{t(`cards.${c.id}`)}</h2>
        <div className="w-full">{c.summary}</div>
      </button>
    );
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 pt-4 sm:px-6">
      <header>
        <h1 className="font-display text-3xl font-bold sm:text-4xl">{t('title')}</h1>
        <p className="mt-1 text-muted">{t('subtitle')}</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(['volume', 'perPerson', 'response', 'started', 'emojis', 'heatmap'] as const).map(
          renderCard,
        )}

        {/* Mídia e sequências empilhados ao lado do heatmap (sem espaço morto) */}
        <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2 lg:col-span-1 lg:grid-cols-1">
          {(['media', 'streaks'] as const).map(renderCard)}
        </div>

        {renderCard('apps')}

        {renderCard('sintonia')}
        {renderCard('balance')}
      </div>

      {active && (
        <DetailPanel title={t(`cards.${active.id}`)} onClose={close}>
          {active.detail}
        </DetailPanel>
      )}
    </main>
  );
}
