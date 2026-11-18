'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Particles } from '@/components/fx/Particles';
import { useReport } from '@/components/report/ReportProvider';
import { Link, useRouter } from '@/i18n/navigation';
import { STEPS as WORKER_STEPS, errorCode } from '@/lib/pipeline';
import { analyzeFiles } from '@/lib/worker-client';

const STEPS = ['read', 'understand', 'merge', 'compute'] as const;

/** Tela de progresso. O progresso vem do Worker (4 etapas de 25%); só chega a 100% com o relatório pronto. */
export function ProcessingView() {
  const t = useTranslations('processing');
  const tErr = useTranslations('common.errors');
  const router = useRouter();
  const { files, mapping, setReport } = useReport();
  const [working, setWorking] = useState(0); // 0 a 99
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ready = files.length > 0 && mapping !== null;

  useEffect(() => {
    if (!ready) return;
    const { result, cancel } = analyzeFiles(
      files.map((f) => f.file),
      mapping,
      (step, fraction) => {
        const i = WORKER_STEPS.indexOf(step);
        setWorking(Math.min(99, ((i + fraction) / WORKER_STEPS.length) * 100));
      },
    );
    result
      .then((report) => {
        setReport(report);
        setDone(true);
      })
      .catch((err: unknown) => setError(tErr(errorCode(err) ?? 'unknown')));
    return cancel; // sair da tela encerra o Worker
  }, [ready, files, mapping, setReport, tErr]);

  const pct = done ? 100 : working;
  // ?auto=0 desliga o avanço automático (usado nos testes).
  useEffect(() => {
    if (!done || new URLSearchParams(window.location.search).get('auto') === '0') return;
    const id = setTimeout(() => router.push('/report/timeline'), 1500);
    return () => clearTimeout(id);
  }, [done, router]);

  const stepIndex = Math.min(STEPS.length - 1, Math.floor(pct / 25));
  const step = STEPS[stepIndex] as (typeof STEPS)[number];

  if (!ready || error) {
    return (
      <main className="mx-auto flex min-h-[50dvh] max-w-3xl flex-col justify-center gap-4 px-4 sm:px-6">
        <h1 className="font-display text-3xl font-bold sm:text-4xl">
          {error ? t('failed') : t('empty.title')}
        </h1>
        <p role={error ? 'alert' : undefined} className={error ? 'text-danger' : 'text-muted'}>
          {error ?? t('empty.body')}
        </p>
        <Link href="/" className="btn btn-primary self-start">
          {t('backHome')}
        </Link>
      </main>
    );
  }

  return (
    <>
      <div className="pointer-events-none fixed inset-0 -z-0 opacity-80">
        <Particles progress={pct / 100} />
      </div>
      <main className="relative z-10 mx-auto flex min-h-[70dvh] max-w-3xl flex-col justify-center px-4 sm:px-6">
        {/* Painel de vidro: o texto fica legível sobre as partículas */}
        <div className="flex flex-col gap-6 rounded-3xl border border-line bg-void/60 p-6 backdrop-blur-md sm:p-8">
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

          {/* Stepper: uma linha no desktop, vertical no mobile; ✓ nas etapas concluídas */}
          <ol className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:gap-2">
            {STEPS.map((s, i) => {
              const complete = i < stepIndex || done;
              return (
                <li key={s} className="flex items-center gap-2 sm:flex-1 sm:last:flex-none">
                  <span
                    aria-current={i === stepIndex && !done ? 'step' : undefined}
                    className={`flex items-center gap-2 whitespace-nowrap ${
                      complete ? 'text-ok' : i === stepIndex ? 'text-ink' : 'text-muted'
                    }`}
                  >
                    <span
                      className={`flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
                        complete
                          ? 'border-ok bg-ok/15'
                          : i === stepIndex
                            ? 'border-sync shadow-[0_0_10px_var(--color-sync)]'
                            : 'border-line'
                      }`}
                    >
                      {complete ? (
                        <>
                          ✓<span className="sr-only">{t('stepDone')}</span>
                        </>
                      ) : (
                        i + 1
                      )}
                    </span>
                    {t(`steps.${s}`)}
                  </span>
                  {i < STEPS.length - 1 && (
                    <span
                      aria-hidden="true"
                      className={`hidden h-px flex-1 sm:block ${complete ? 'bg-ok/50' : 'bg-line'}`}
                    />
                  )}
                </li>
              );
            })}
          </ol>

          {done && (
            <Link href="/report/timeline" className="btn btn-primary self-start">
              {t('open')}
            </Link>
          )}
        </div>
      </main>
    </>
  );
}
