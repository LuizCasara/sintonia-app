import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';

/** Prévias fictícias das telas do relatório. Só dados de exemplo, nada vem da conversa. */

function Card({
  title,
  body,
  className = '',
  children,
}: {
  title: string;
  body: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <article className={`panel panel-hover flex flex-col p-5 ${className}`}>
      <div className="flex-1" aria-hidden="true">
        {children}
      </div>
      <h3 className="mt-4 font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted">{body}</p>
    </article>
  );
}

interface Props {
  className?: string;
}

export function PeekScore({ className }: Props) {
  const t = useTranslations('landing.score');
  const parts = [
    { k: 'p1', v: 88 },
    { k: 'p2', v: 76 },
    { k: 'p3', v: 91 },
  ] as const;
  return (
    <Card title={t('title')} body={t('body')} className={className}>
      <p className="flex items-baseline gap-2">
        <span className="glow-sync font-display text-5xl font-bold text-sync">8,2</span>
        <span className="text-sm text-muted">{t('out')}</span>
      </p>
      <ul className="mt-4 space-y-2">
        {parts.map((p) => (
          <li key={p.k} className="text-xs text-muted">
            {t(p.k)}
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line">
              <div className="h-full rounded-full bg-sync" style={{ width: `${p.v}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function PeekTimeline({ className }: Props) {
  const t = useTranslations('landing.timeline');
  const marks = [
    { k: 'm1', left: '10%', color: 'bg-a' },
    { k: 'm2', left: '50%', color: 'bg-sync' },
    { k: 'm3', left: '90%', color: 'bg-b' },
  ] as const;
  return (
    <Card title={t('title')} body={t('body')} className={className}>
      <div className="relative mt-4 h-24">
        <div className="absolute inset-x-0 top-[22px] h-0.5 bg-gradient-to-r from-a via-sync to-b" />
        {marks.map((m) => (
          <div
            key={m.k}
            className="absolute top-3 flex w-24 -translate-x-1/2 flex-col items-center gap-2 text-center"
            style={{ left: m.left }}
          >
            <span className={`size-4 rounded-full ring-4 ring-panel ${m.color}`} />
            <span className="text-xs text-muted">{t(m.k)}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

// 24 horas: [pessoa A, pessoa B] em % da altura
const HOURS: [number, number][] = [
  [4, 2],
  [2, 1],
  [1, 1],
  [1, 0],
  [1, 1],
  [3, 2],
  [8, 5],
  [14, 10],
  [20, 14],
  [18, 16],
  [16, 18],
  [22, 20],
  [30, 24],
  [26, 22],
  [20, 20],
  [18, 24],
  [22, 28],
  [28, 34],
  [36, 42],
  [48, 60],
  [70, 84],
  [90, 100],
  [64, 72],
  [24, 30],
];

export function PeekRhythm({ className }: Props) {
  const t = useTranslations('landing.rhythm');
  return (
    <Card title={t('title')} body={t('body')} className={className}>
      <div className="flex h-28 items-end gap-0.5">
        {HOURS.map(([a, b], i) => (
          <div key={i} className="flex h-full flex-1 items-end gap-px">
            <div className="w-1/2 rounded-t-sm bg-a/80" style={{ height: `${a}%` }} />
            <div className="w-1/2 rounded-t-sm bg-b/80" style={{ height: `${b}%` }} />
          </div>
        ))}
      </div>
      <p className="mt-2 flex gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-a" />
          {t('a')}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-b" />
          {t('b')}
        </span>
      </p>
    </Card>
  );
}

export function PeekBalance({ className }: Props) {
  const t = useTranslations('landing.balance');
  return (
    <Card title={t('title')} body={t('body')} className={className}>
      <div className="flex h-full flex-col justify-center gap-3 py-4">
        <div className="flex justify-between font-display text-3xl font-bold">
          <span className="text-a">52%</span>
          <span className="text-b">48%</span>
        </div>
        <div className="flex h-3 overflow-hidden rounded-full">
          <div className="bg-a" style={{ width: '52%' }} />
          <div className="bg-b" style={{ width: '48%' }} />
        </div>
      </div>
    </Card>
  );
}

// Cor e tamanho de cada palavra; o texto vem de landing.words.list (mesma ordem, por idioma).
const WORD_STYLES = [
  'text-b text-3xl',
  'text-sync text-2xl',
  'text-a text-4xl',
  'text-ink text-xl',
  'text-b text-2xl',
  'text-a text-lg',
  'text-sync text-xl',
  'text-muted text-lg',
  'text-b text-xl',
] as const;

// Quantas vezes cada palavra aparece (exemplo fictício).
const WORD_COUNTS = [412, 388, 1204, 96, 530, 240, 177, 85, 310] as const;

export function PeekWords({ className }: Props) {
  const t = useTranslations('landing.words');
  const words = t.raw('list') as string[];
  return (
    <Card title={t('title')} body={t('body')} className={className}>
      <p className="flex flex-wrap items-baseline justify-center gap-x-5 gap-y-2 py-2 font-display font-bold">
        {words.map((w, i) => (
          <span key={w} className={WORD_STYLES[i]}>
            {w}
            <span className="ml-1 font-sans text-xs font-normal tabular-nums text-muted">
              {WORD_COUNTS[i]}×
            </span>
          </span>
        ))}
      </p>
    </Card>
  );
}

export function PeekBooks({ className }: Props) {
  const t = useTranslations('landing.books');
  const segments = [1, 1, 1, 1, 1, 0.02, 0] as const;
  return (
    <Card title={t('title')} body={t('body')} className={className}>
      <p className="flex flex-wrap items-baseline gap-x-2">
        <span className="glow-sync font-display text-5xl font-bold text-sync">5</span>
        <span className="text-sm text-muted">{t('of')}</span>
      </p>
      <div className="mt-4 flex gap-1">
        {segments.map((fill, i) => (
          <div key={i} className="h-3 flex-1 overflow-hidden rounded-full bg-void">
            <div className="h-full bg-sync" style={{ width: `${fill * 100}%` }} />
          </div>
        ))}
      </div>
    </Card>
  );
}

/** PDF, cards para stories e sessões salvas: o que dá para levar do relatório. */
export function PeekShare({ className }: Props) {
  const t = useTranslations('landing.share');
  return (
    <article className={`panel panel-hover p-5 ${className ?? ''}`}>
      <h3 className="font-semibold">{t('title')}</h3>
      <p className="mt-1 text-sm text-muted">{t('body')}</p>
      <ul className="mt-4 grid gap-4 sm:grid-cols-3">
        {(
          [
            ['pdf', 'pdfBody'],
            ['stories', 'storiesBody'],
            ['save', 'saveBody'],
          ] as const
        ).map(([title, body]) => (
          <li key={title} className="flex gap-3">
            <span aria-hidden="true" className="mt-0.5 shrink-0">
              {title === 'pdf' && (
                <span className="flex h-12 w-9 flex-col gap-1 rounded-sm bg-ink/90 p-1.5">
                  <span className="h-1 w-full rounded bg-void/70" />
                  <span className="h-1 w-3/4 rounded bg-void/40" />
                  <span className="h-1 w-full rounded bg-void/40" />
                  <span className="mt-auto h-3 w-full rounded-sm bg-gradient-to-r from-a to-b" />
                </span>
              )}
              {title === 'stories' && (
                <span className="flex h-12 w-7 items-center justify-center rounded-md border border-line bg-gradient-to-b from-a/40 via-void to-b/40 font-display text-[9px] font-bold text-ink">
                  8,2
                </span>
              )}
              {title === 'save' && (
                <span className="flex h-12 w-9 flex-col justify-center gap-1.5">
                  <span className="h-2 w-full rounded bg-sync/70" />
                  <span className="h-2 w-full rounded bg-sync/40" />
                  <span className="h-2 w-full rounded bg-sync/20" />
                </span>
              )}
            </span>
            <span>
              <span className="block text-sm font-semibold">{t(title)}</span>
              <span className="block text-sm text-muted">{t(body)}</span>
            </span>
          </li>
        ))}
      </ul>
    </article>
  );
}
