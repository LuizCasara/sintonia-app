import { useTranslations } from 'next-intl';
import { SyncWave } from '@/components/fx/SyncWave';
import { UploadPanel } from './UploadPanel';

/** Tela inicial: slogan, privacidade em destaque, como exportar e upload. */
export function HomeView() {
  const t = useTranslations('home');
  return (
    <main className="mx-auto max-w-5xl space-y-10 px-4 pb-16 pt-4 sm:px-6">
      <section className="text-center">
        <SyncWave className="mx-auto h-24 w-full max-w-2xl sm:h-32" />
        <h1 className="mx-auto mt-4 max-w-2xl bg-gradient-to-r from-a to-b bg-clip-text font-display text-4xl font-bold text-transparent sm:text-6xl">
          {t('title')}
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-muted">{t('subtitle')}</p>
      </section>

      <section className="rounded-2xl border border-sync/60 bg-sync/10 p-5 shadow-[0_0_32px_-6px_color-mix(in_srgb,var(--color-sync)_40%,transparent)] sm:p-6">
        <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
          <svg
            viewBox="0 0 24 24"
            className="size-6 text-sync"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <rect x="5" y="11" width="14" height="9" rx="2" />
            <path d="M8 11V8a4 4 0 018 0v3" />
          </svg>
          {t('privacy.title')}
        </h2>
        <ul className="mt-3 space-y-1 text-lg">
          <li>{t('privacy.p1')}</li>
          <li>{t('privacy.p2')}</li>
          <li>{t('privacy.p3')}</li>
        </ul>
      </section>

      <section>
        <h2 className="mb-3 font-display text-xl font-semibold">{t('how.title')}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {(['whatsapp', 'telegram'] as const).map((app) => (
            <article key={app} className="panel p-5">
              <h3 className="font-semibold">{t(`how.${app}.title`)}</h3>
              <p className="mt-1 text-sm text-muted">{t(`how.${app}.body`)}</p>
            </article>
          ))}
        </div>
      </section>

      <UploadPanel />
    </main>
  );
}
