'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';

/** Seletor PT/EN: mantém a mesma página no outro idioma. */
export function LocaleSwitcher() {
  const t = useTranslations('common');
  const current = useLocale();
  const pathname = usePathname();
  return (
    <nav aria-label={t('language')} className="flex gap-1">
      {routing.locales.map((l) => (
        <Link
          key={l}
          href={pathname}
          locale={l}
          aria-current={l === current ? 'true' : undefined}
          className={`flex min-h-11 min-w-11 items-center justify-center rounded-full border px-3 text-sm font-semibold uppercase ${
            l === current
              ? 'border-sync bg-sync/20 text-ink'
              : 'border-line text-muted hover:text-ink'
          }`}
        >
          {l}
        </Link>
      ))}
    </nav>
  );
}
