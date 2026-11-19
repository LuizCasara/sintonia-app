'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Particles } from '@/components/fx/Particles';
import { useReport } from '@/components/report/ReportProvider';
import { Link, useRouter } from '@/i18n/navigation';
import { STEPS as WORKER_STEPS, errorCode } from '@/lib/pipeline';
import { applyNames } from '@/lib/rename';
import { analyzeFiles } from '@/lib/worker-client';

const STEPS = ['read', 'understand', 'merge', 'compute'] as const;

// Ritmo "cinematográfico": cada etapa leva no mínimo STEP_MS na tela e segura HOLD_MS ao
// concluir, mesmo que o Worker termine antes. Com "reduzir movimento" ligado, não há espera.
const STEP_MS = 1500;
const HOLD_MS = 450;
const RATE = 25 / STEP_MS; // pontos percentuais por ms

const REDUCED = '(prefers-reduced-motion: reduce)';
function watchReduced(onChange: () => void) {
  const mq = window.matchMedia(REDUCED);
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
}

/** Tela de progresso. O progresso vem do Worker (4 etapas de 25%); só chega a 100% com o relatório pronto. */
export function ProcessingView() {
  const t = useTranslations('processing');
  const tErr = useTranslations('common.errors');
  const router = useRouter();
  const { files, mapping, names, setReport } = useReport();
  const [working, setWorking] = useState(0); // 0 a 99
  const [done, setDone] = useState(false); // relatório pronto
  const [shown, setShown] = useState(0); // o que a tela mostra: alcança o real no seu ritmo
  const reduced = useSyncExternalStore(
    watchReduced,
    () => window.matchMedia(REDUCED).matches,
    () => false,
  );
  const target = useRef(0);
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
        setReport(applyNames(report, names));
        setDone(true);
      })
      .catch((err: unknown) => setError(tErr(errorCode(err) ?? 'unknown')));
    return cancel; // sair da tela encerra o Worker
  }, [ready, files, mapping, names, setReport, tErr]);

  useEffect(() => {
    target.current = done ? 100 : working;
  }, [done, working]);

  // Anima o valor mostrado até o progresso real, no máximo RATE por ms, parando em cada etapa.
  useEffect(() => {
    if (!ready || reduced || error) return;
    let value = 0;
    let hold = 0;
    let last = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      // Teto de 1 s por quadro: em máquina lenta a animação não se arrasta, e com a aba escondida
      // as pausas de cada etapa impedem que ela pule direto ao fim.
      const dt = Math.min(1000, now - last);
      last = now;
      if (hold > 0) {
        hold -= dt;
      } else if (value < target.current) {
        const next = Math.min(target.current, value + RATE * dt);
        const boundary = Math.floor(value / 25) * 25 + 25;
        if (next >= boundary && boundary < 100) {
          value = boundary;
          hold = HOLD_MS;
        } else {
          value = next;
        }
        setShown(value);
      }
      if (value < 100) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [ready, reduced, error]);

  const pct = reduced ? (done ? 100 : working) : shown;
  const finished = done && pct >= 100;
  // ?auto=0 desliga o avanço automático (usado nos testes).
  useEffect(() => {
    if (!finished || new URLSearchParams(window.location.search).get('auto') === '0') return;
    const id = setTimeout(() => router.push('/report/timeline'), 1500);
    return () => clearTimeout(id);
  }, [finished, router]);

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
              {finished ? t('done') : t(`steps.${step}`)}
            </p>
            <span className="font-display text-2xl font-bold text-sync">{Math.round(pct)}%</span>
          </div>

          {/* Stepper: uma linha no desktop, vertical no mobile; ✓ nas etapas concluídas */}
          <ol className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:gap-2">
            {STEPS.map((s, i) => {
              const complete = i < stepIndex || finished;
              return (
                <li key={s} className="flex items-center gap-2 sm:flex-1 sm:last:flex-none">
                  <span
                    aria-current={i === stepIndex && !finished ? 'step' : undefined}
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

          {finished && (
            <Link href="/report/timeline" className="btn btn-primary self-start">
              {t('open')}
            </Link>
          )}
        </div>
      </main>
    </>
  );
}
