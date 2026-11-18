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

export function PeekWords({ className }: Props) {
  const t = useTranslations('landing.words');
  const words = t.raw('list') as string[];
  return (
    <Card title={t('title')} body={t('body')} className={className}>
      <p className="flex flex-wrap items-baseline justify-center gap-x-5 gap-y-2 py-2 font-display font-bold">
        {words.map((w, i) => (
          <span key={w} className={WORD_STYLES[i]}>
            {w}
          </span>
        ))}
      </p>
    </Card>
  );
}
