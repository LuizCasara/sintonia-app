'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { useReport } from '@/components/report/ReportProvider';
import { useRouter } from '@/i18n/navigation';
import { fmtDate, fmtNum } from '@/lib/format';
import { deleteSession, getSession, listSessions, type SavedSummary } from '@/lib/saved';

/** Sessões salvas neste navegador: abrir (carrega o relatório de novo) ou remover. */
export function SavedSessions({
  refreshKey = 0,
  onChange,
}: {
  /** Muda quando uma sessão nova é salva, para recarregar a lista. */
  refreshKey?: number;
  onChange?: () => void;
}) {
  const t = useTranslations('saved');
  const locale = useLocale();
  const router = useRouter();
  const { restore } = useReport();
  const [items, setItems] = useState<SavedSummary[] | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    listSessions()
      .then((rows) => {
        setItems(rows);
        setError(false);
      })
      .catch(() => setItems([]));
  }, []);
  useEffect(load, [load, refreshKey]);

  async function open(id: string) {
    setError(false);
    try {
      const session = await getSession(id);
      if (!session) throw new Error('missing');
      restore(session.report, session.hiddenWords);
      router.push('/report/timeline');
    } catch {
      setError(true);
    }
  }

  async function remove(id: string) {
    await deleteSession(id);
    load();
    onChange?.();
  }

  if (!items || items.length === 0) return null;
  const first = (full: string) => full.split(' ')[0] ?? full;
  const when = (ts: number) =>
    new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(ts);

  return (
    <section className="panel space-y-3 p-5" data-testid="saved-sessions">
      <h2 className="font-display text-xl font-semibold">{t('title')}</h2>
      <p className="text-sm text-muted">{t('body')}</p>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {t('openError')}
        </p>
      )}
      <ul className="divide-y divide-line">
        {items.map((s) => (
          <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <p className="font-semibold">
                <span className="text-a">{first(s.people.A)}</span>
                <span className="text-muted"> & </span>
                <span className="text-b">{first(s.people.B)}</span>
              </p>
              <p className="text-sm text-muted">
                {t('meta', {
                  messages: fmtNum(locale, s.messages),
                  from: s.start ? fmtDate(locale, s.start, false) : '—',
                  to: s.end ? fmtDate(locale, s.end, false) : '—',
                  saved: when(s.savedAt),
                })}
              </p>
            </div>
            <div className="flex gap-2">
              <button type="button" className="btn btn-primary" onClick={() => open(s.id)}>
                {t('open')}
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                aria-label={t('removeLabel', {
                  name: `${first(s.people.A)} & ${first(s.people.B)}`,
                })}
                onClick={() => remove(s.id)}
              >
                {t('remove')}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
