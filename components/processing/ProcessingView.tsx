'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Particles } from '@/components/fx/Particles';
import { Link, useRouter } from '@/i18n/navigation';

const STEPS = ['read', 'understand', 'merge', 'compute'] as const;

/** Tela de progresso. Hoje o progresso é simulado por timer. */
export function ProcessingView() {
  const t = useTranslations('processing');
  const router = useRouter();
  const [pct, setPct] = useState(0);

  // TODO(Luiz): trocar o timer pelo progresso real do Worker (onProgress de analyze).
  useEffect(() => {
    const id = setInterval(() => setPct((p) => Math.min(100, p + 1.5)), 100);
    return () => clearInterval(id);
  }, []);

  const done = pct >= 100;
  // ?auto=0 desliga o avanço automático (usado nos testes).
  useEffect(() => {
    if (!done || new URLSearchParams(window.location.search).get('auto') === '0') return;
    const id = setTimeout(() => router.push('/report/timeline'), 1500);
    return () => clearTimeout(id);
  }, [done, router]);

  const stepIndex = Math.min(STEPS.length - 1, Math.floor(pct / 25));
  const step = STEPS[stepIndex] as (typeof STEPS)[number];

  return (
    <>
      <div className="pointer-events-none fixed inset-0 -z-0 opacity-80">
        <Particles progress={pct / 100} />
      </div>
      <main className="relative z-10 mx-auto flex min-h-[70dvh] max-w-xl flex-col justify-center gap-6 px-4 sm:px-6">
        <h1 className="font-display text-3xl font-bold sm:text-4xl">{t('title')}</h1>

        <div
          role="progressbar"
          aria-label={t('progressLabel')}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(pct)}
          className="h-3 overflow-hidden rounded-full border border-line bg-panel"
        >
          <div
            className="h-full rounded-full bg-sync shadow-[0_0_16px_var(--color-sync)]"
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="flex items-baseline justify-between">
          <p aria-live="polite" className="text-lg">
            {done ? t('done') : t(`steps.${step}`)}
          </p>
          <span className="font-display text-2xl font-bold text-sync">{Math.round(pct)}%</span>
        </div>

        <ol className="flex flex-wrap gap-2 text-sm">
          {STEPS.map((s, i) => (
            <li
              key={s}
              className={`rounded-full border px-3 py-1 ${
                i < stepIndex || done
                  ? 'border-ok/50 text-ok'
                  : i === stepIndex
                    ? 'border-sync text-ink'
                    : 'border-line text-muted'
              }`}
            >
              {t(`steps.${s}`)}
            </li>
          ))}
        </ol>

        {done && (
          <Link href="/report/timeline" className="btn btn-primary self-start">
            {t('open')}
          </Link>
        )}
      </main>
    </>
  );
}
