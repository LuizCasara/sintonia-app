import { useTranslations } from 'next-intl';
import { SyncWave } from '@/components/fx/SyncWave';
import { Link } from '@/i18n/navigation';
import {
  PeekBalance,
  PeekBooks,
  PeekRhythm,
  PeekScore,
  PeekShare,
  PeekTimeline,
  PeekWords,
} from './Peeks';

function Cta({ className = '' }: { className?: string }) {
  const t = useTranslations('landing');
  return (
    <Link href="/start" className={`btn btn-primary text-lg ${className}`}>
      {t('cta')}
    </Link>
  );
}

/** Tela inicial: gancho visual, prévias fictícias das telas e CTA para /start. */
export function HomeView() {
  const t = useTranslations('landing');
  return (
    <main className="mx-auto max-w-5xl space-y-16 px-4 pb-20 pt-4 sm:px-6">
      <section className="text-center">
        <SyncWave className="mx-auto h-24 w-full max-w-2xl sm:h-32" />
        <h1 className="mx-auto mt-4 max-w-2xl bg-gradient-to-r from-a to-b bg-clip-text font-display text-4xl font-bold text-transparent sm:text-6xl">
          {t('title')}
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-muted">{t('subtitle')}</p>
        <div className="mt-8 flex flex-col items-center gap-3">
          <Cta />
          <Link
            href="/report/timeline"
            className="flex min-h-11 items-center text-sm text-sync underline"
          >
            {t('demo')}
          </Link>
          <p className="text-xs text-muted">{t('trust')}</p>
        </div>
      </section>

      <section aria-labelledby="peek-title">
        <p className="text-center text-xs font-medium uppercase tracking-widest text-sync">
          {t('peek.kicker')}
        </p>
        <h2
          id="peek-title"
          className="mt-2 text-center font-display text-2xl font-semibold sm:text-3xl"
        >
          {t('peek.title')}
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          <PeekScore className="lg:col-span-2" />
          <PeekTimeline className="lg:col-span-4" />
          <PeekRhythm className="lg:col-span-3" />
          <PeekBalance className="lg:col-span-3" />
          <PeekBooks className="lg:col-span-2" />
          <PeekWords className="sm:col-span-2 lg:col-span-4" />
          <PeekShare className="sm:col-span-2 lg:col-span-6" />
        </div>
        <p className="mt-4 text-center text-xs text-muted">{t('peek.note')}</p>
      </section>

      <section className="panel mx-auto max-w-2xl p-8 text-center">
        <h2 className="font-display text-2xl font-semibold">{t('final.title')}</h2>
        <p className="mt-2 text-muted">{t('final.body')}</p>
        <Cta className="mt-6" />
      </section>
    </main>
  );
}
