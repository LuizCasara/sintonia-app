'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { levenshtein } from '@/lib/merge';

type App = 'whatsapp' | 'telegram';
interface Detected {
  id: string;
  app: App;
  name: string;
  count: number;
}

// TODO(Luiz): trocar por suggestPeople(chats) quando o Worker devolver as pessoas reais.
const WHATSAPP: [Detected, Detected] = [
  { id: 'wa-ana', app: 'whatsapp', name: 'Ana Lima', count: 3120 },
  { id: 'wa-bruno', app: 'whatsapp', name: 'Bruno Reis', count: 2890 },
];
const TELEGRAM: [Detected, Detected] = [
  { id: 'tg-ana', app: 'telegram', name: 'Ana L.', count: 1040 },
  { id: 'tg-bruno', app: 'telegram', name: 'Bruno', count: 910 },
];
const OTHERS: Detected[] = [
  { id: 'tg-promo', app: 'telegram', name: 'Canal de promoções', count: 14 },
];

/** 0 a 1, a partir da distância de edição (nomes em minúsculas). */
function similarity(a: string, b: string): number {
  const [x, y] = [a.toLowerCase(), b.toLowerCase()];
  return 1 - levenshtein(x, y) / Math.max(x.length, y.length);
}

function AppBadge({ app }: { app: App }) {
  return (
    <span
      aria-label={app === 'whatsapp' ? 'WhatsApp' : 'Telegram'}
      className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-line bg-void text-xs font-bold text-muted"
    >
      {app === 'whatsapp' ? 'WA' : 'TG'}
    </span>
  );
}

export function ConfirmView() {
  const t = useTranslations('confirm');
  const router = useRouter();
  const [swapped, setSwapped] = useState(false);
  const [ignored, setIgnored] = useState<Set<string>>(new Set(OTHERS.map((o) => o.id)));

  // Telegram pareado com cada pessoa (o botão "Trocar" inverte).
  const tgForA = swapped ? TELEGRAM[1] : TELEGRAM[0];
  const tgForB = swapped ? TELEGRAM[0] : TELEGRAM[1];
  const pairs = [
    { id: 'A', label: t('personA'), color: 'text-a', rows: [WHATSAPP[0], tgForA] },
    { id: 'B', label: t('personB'), color: 'text-b', rows: [WHATSAPP[1], tgForB] },
  ];

  function toggleIgnore(id: string) {
    const next = new Set(ignored);
    if (!next.delete(id)) next.add(id);
    setIgnored(next);
  }

  function Row({ d, base }: { d: Detected; base?: Detected }) {
    const off = ignored.has(d.id);
    return (
      <li className={`flex flex-wrap items-center gap-3 py-2 ${off ? 'opacity-50' : ''}`}>
        <AppBadge app={d.app} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{d.name}</p>
          <p className="text-sm text-muted">
            {t('messages', { count: d.count })}
            {base &&
              ` · ${t('similarity', { pct: Math.round(similarity(base.name, d.name) * 100) })}`}
          </p>
        </div>
        <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            checked={off}
            onChange={() => toggleIgnore(d.id)}
            className="size-5 accent-[var(--color-sync)]"
          />
          {t('ignore')}
        </label>
      </li>
    );
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 pb-16 pt-4 sm:px-6">
      <h1 className="font-display text-3xl font-bold sm:text-4xl">{t('title')}</h1>
      <p className="text-muted">{t('why')}</p>

      <div className="space-y-4">
        {pairs.map((p) => (
          <section key={p.id} className="panel p-5">
            <div className="flex items-center justify-between">
              <h2 className={`font-display text-lg font-semibold ${p.color}`}>{p.label}</h2>
              <button type="button" className="btn btn-ghost" onClick={() => setSwapped(!swapped)}>
                {t('swap')}
              </button>
            </div>
            <ul className="mt-2 divide-y divide-line">
              <Row d={p.rows[0] as Detected} />
              <Row d={p.rows[1] as Detected} base={p.rows[0] as Detected} />
            </ul>
          </section>
        ))}

        <section className="panel p-5">
          <h2 className="font-display text-lg font-semibold">{t('others')}</h2>
          <ul className="mt-2 divide-y divide-line">
            {OTHERS.map((o) => (
              <Row key={o.id} d={o} />
            ))}
          </ul>
        </section>
      </div>

      <p className="text-sm text-muted">{t('demoNote')}</p>
      <button type="button" className="btn btn-primary" onClick={() => router.push('/processing')}>
        {t('analyze')}
      </button>
    </main>
  );
}
