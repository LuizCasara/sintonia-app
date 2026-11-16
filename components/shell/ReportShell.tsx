'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { Link, usePathname } from '@/i18n/navigation';
import { useReport } from '@/components/report/ReportProvider';

const TABS = [
  { href: '/report/timeline', key: 'timeline' },
  { href: '/report/dashboard', key: 'dashboard' },
  { href: '/report/actions', key: 'actions' },
] as const;

/** Moldura das telas de relatório: faixa de demo + abas (topo no desktop, barra fixa no mobile). */
export function ReportShell({ children }: { children: ReactNode }) {
  const t = useTranslations('common');
  const { isDemo } = useReport();
  const pathname = usePathname().replace(/\/$/, '');

  return (
    <>
      {isDemo && (
        <div className="border-y border-line bg-sync/10 py-1 text-center text-xs text-muted">
          {t('demoBanner')}
        </div>
      )}
      <nav
        aria-label={t('reportNav')}
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-panel/95 backdrop-blur md:static md:border-0 md:bg-transparent"
      >
        <ul className="mx-auto flex max-w-5xl justify-around gap-1 px-2 md:justify-start md:px-6 md:pt-3">
          {TABS.map(({ href, key }) => {
            const active = pathname === href;
            return (
              <li key={key} className="flex-1 md:flex-none">
                <Link
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={`flex min-h-12 items-center justify-center rounded-full px-4 text-sm font-semibold md:min-h-11 md:border ${
                    active
                      ? 'text-sync md:border-sync md:bg-sync/15'
                      : 'text-muted hover:text-ink md:border-line'
                  }`}
                >
                  {t(`nav.${key}`)}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="pb-24 md:pb-10">{children}</div>
    </>
  );
}
