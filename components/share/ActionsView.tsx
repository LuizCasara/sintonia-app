'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { useReport } from '@/components/report/ReportProvider';
import { useRouter } from '@/i18n/navigation';
import { fmtNum } from '@/lib/format';
import { buildPrompt } from '@/lib/prompt';

/** Ações: copiar prompt (funciona, em destaque), cards e PDF (em breve) e apagar tudo. */
export function ActionsView() {
  const t = useTranslations('actions');
  const locale = useLocale() as 'pt' | 'en';
  const router = useRouter();
  const { report, clearAll } = useReport();
  const [includeDictionary, setIncludeDictionary] = useState(false); // só com consentimento
  const [copy, setCopy] = useState<'idle' | 'copied' | 'error'>('idle');
  const [confirming, setConfirming] = useState(false);

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(buildPrompt(report, { locale, includeDictionary }));
      setCopy('copied');
      setTimeout(() => setCopy('idle'), 2500);
    } catch {
      setCopy('error');
    }
  }

  function deleteAll() {
    clearAll();
    router.push('/');
  }

  const total = report.volume.perPerson.A.messages + report.volume.perPerson.B.messages;
  const years = Math.max(1, Math.round(report.period.days / 365));
  const shareA = Math.round((report.volume.perPerson.A.messages / total) * 100);
  const nameA = report.people.A.split(' ')[0];
  const nameB = report.people.B.split(' ')[0];

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 pt-4 sm:px-6">
      <h1 className="font-display text-3xl font-bold sm:text-4xl">{t('title')}</h1>

      <div className="grid gap-4 md:grid-cols-2">
        {/* 1. Copiar prompt: o único que funciona hoje, em destaque */}
        <section className="space-y-3 rounded-2xl border border-sync/60 bg-sync/10 p-5 shadow-[0_0_32px_-6px_color-mix(in_srgb,var(--color-sync)_40%,transparent)] md:col-span-2 sm:p-6">
          <h2 className="font-display text-xl font-semibold">{t('prompt.title')}</h2>
          <p className="text-muted">{t('prompt.body')}</p>
          <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={includeDictionary}
              onChange={(e) => setIncludeDictionary(e.target.checked)}
              className="mt-0.5 size-5 shrink-0 accent-[var(--color-sync)]"
            />
            {t('prompt.dictionary')}
          </label>
          <div className="flex flex-wrap items-center gap-4">
            <button type="button" className="btn btn-primary" onClick={copyPrompt}>
              {t('prompt.copy')}
            </button>
            <p role="status" className={copy === 'error' ? 'text-danger' : 'text-ok'}>
              {copy === 'copied' && t('prompt.copied')}
              {copy === 'error' && t('prompt.error')}
            </p>
          </div>
        </section>

        {/* 2. Cards para stories */}
        <section className="panel space-y-3 p-5">
          <h2 className="font-display text-lg font-semibold">{t('stories.title')}</h2>
          <p className="text-sm text-muted">{t('stories.body')}</p>
          <div className="flex gap-3">
            <div className="flex aspect-[9/16] w-28 flex-col items-center justify-center rounded-xl border border-line bg-void p-2 text-center">
              <span className="font-display text-xl font-bold text-sync">
                {fmtNum(locale, total)}
              </span>
              <span className="text-[10px] text-muted">{t('stories.messagesIn', { years })}</span>
            </div>
            <div className="flex aspect-[9/16] w-28 flex-col items-center justify-center gap-1 rounded-xl border border-line bg-void p-2 text-center">
              <span className="text-[10px] text-muted">{t('stories.split')}</span>
              <span className="font-display text-xl font-bold text-a">{shareA}%</span>
              <span className="text-[10px] text-a">{nameA}</span>
              <span className="font-display text-xl font-bold text-b">{100 - shareA}%</span>
              <span className="text-[10px] text-b">{nameB}</span>
            </div>
          </div>
          <button type="button" className="btn btn-ghost" disabled>
            {t('stories.button')}
          </button>
        </section>

        {/* 3. PDF e 4. Apagar tudo, empilhados ao lado dos cards (sem espaço vazio) */}
        <div className="flex flex-col gap-4">
          <section className="panel space-y-3 p-5">
            <h2 className="font-display text-lg font-semibold">{t('pdf.title')}</h2>
            <p className="text-sm text-muted">{t('pdf.body')}</p>
            <button type="button" className="btn btn-ghost" disabled>
              {t('pdf.button')}
            </button>
          </section>

          <section className="flex-1 space-y-3 rounded-2xl border border-danger/40 bg-danger/5 p-5">
            <h2 className="font-display text-lg font-semibold text-danger">{t('delete.title')}</h2>
            <p className="text-sm text-muted">{t('delete.body')}</p>
            {confirming ? (
              <div
                role="alertdialog"
                aria-labelledby="del-title"
                className="space-y-3 rounded-xl border border-danger/60 p-4"
              >
                <p id="del-title" className="font-semibold">
                  {t('delete.confirmTitle')}
                </p>
                <p className="text-sm text-muted">{t('delete.confirmBody')}</p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    className="btn border-danger bg-danger/20"
                    onClick={deleteAll}
                  >
                    {t('delete.confirm')}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setConfirming(false)}
                  >
                    {t('delete.cancel')}
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="btn border-danger/60 text-danger hover:bg-danger/10"
                onClick={() => setConfirming(true)}
              >
                {t('delete.button')}
              </button>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
