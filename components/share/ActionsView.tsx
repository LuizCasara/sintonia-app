'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { PrintReport } from './PrintReport';
import { SavedSessions } from './SavedSessions';
import { StoriesPanel } from './StoriesPanel';
import { useReport } from '@/components/report/ReportProvider';
import { useRouter } from '@/i18n/navigation';
import { buildPrompt } from '@/lib/prompt';
import { clearSessions, saveSession } from '@/lib/saved';

/** Ações: copiar prompt (funciona, em destaque), cards e PDF (em breve) e apagar tudo. */
export function ActionsView() {
  const t = useTranslations('actions');
  const locale = useLocale() as 'pt' | 'en';
  const router = useRouter();
  const { report, clearAll, hiddenWords, isDemo } = useReport();
  const [includeDictionary, setIncludeDictionary] = useState(false); // só com consentimento
  const [useRealNames, setUseRealNames] = useState(true);
  const [copy, setCopy] = useState<'idle' | 'copied' | 'error'>('idle');
  const [confirming, setConfirming] = useState(false);
  const [save, setSave] = useState<'idle' | 'saved' | 'error'>('idle');
  const [savedTick, setSavedTick] = useState(0);

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(
        buildPrompt(report, { locale, includeDictionary, hiddenWords, useRealNames }),
      );
      setCopy('copied');
      setTimeout(() => setCopy('idle'), 2500);
    } catch {
      setCopy('error');
    }
  }

  async function saveHere() {
    try {
      await saveSession(report, hiddenWords);
      setSave('saved');
      setSavedTick((n) => n + 1);
    } catch {
      setSave('error');
    }
  }

  /** Abre a janela de impressão; "Salvar como PDF" gera o arquivo. O título vira o nome do arquivo. */
  function printPdf() {
    const previous = document.title;
    const first = (full: string) => full.split(' ')[0] ?? full;
    document.title = `Sintonia - ${first(report.people.A)} e ${first(report.people.B)}`;
    window.addEventListener('afterprint', () => (document.title = previous), { once: true });
    window.print();
  }

  async function deleteAll() {
    clearAll();
    try {
      await clearSessions(); // inclui as sessões salvas neste navegador
    } catch {
      // sem IndexedDB: não há nada salvo para apagar
    }
    router.push('/');
  }

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
              checked={useRealNames}
              onChange={(e) => setUseRealNames(e.target.checked)}
              className="mt-0.5 size-5 shrink-0 accent-[var(--color-sync)]"
            />
            {t('prompt.realNames')}
          </label>
          <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={includeDictionary}
              onChange={(e) => setIncludeDictionary(e.target.checked)}
              className="mt-0.5 size-5 shrink-0 accent-[var(--color-sync)]"
            />
            {t('prompt.dictionary')}
          </label>
          {includeDictionary && hiddenWords.length > 0 && (
            <p className="text-sm text-muted">
              {t('prompt.hiddenWords', { count: hiddenWords.length })}
            </p>
          )}
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

        {/* 2. Cards para stories (imagens 9:16 feitas no navegador) */}
        <StoriesPanel />

        {/* 3. Salvar no navegador */}
        <section className="panel space-y-3 p-5">
          <h2 className="font-display text-lg font-semibold">{t('save.title')}</h2>
          <p className="text-sm text-muted">{t('save.body')}</p>
          <button type="button" className="btn btn-ghost" onClick={saveHere} disabled={isDemo}>
            {t('save.button')}
          </button>
          <p role="status" className={save === 'error' ? 'text-sm text-danger' : 'text-sm text-ok'}>
            {isDemo && t('save.demo')}
            {save === 'saved' && t('save.saved')}
            {save === 'error' && t('save.error')}
          </p>
        </section>

        {/* 3. PDF e 4. Apagar tudo, empilhados ao lado dos cards (sem espaço vazio) */}
        <div className="flex flex-col gap-4">
          <section className="panel space-y-3 p-5">
            <h2 className="font-display text-lg font-semibold">{t('pdf.title')}</h2>
            <p className="text-sm text-muted">{t('pdf.body')}</p>
            <button type="button" className="btn btn-primary" onClick={printPdf}>
              {t('pdf.button')}
            </button>
            <p className="text-xs text-muted">{t('pdf.hint')}</p>
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

      <SavedSessions refreshKey={savedTick} />
      <PrintReport />
    </main>
  );
}
