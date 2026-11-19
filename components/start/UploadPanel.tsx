'use client';

import { useTranslations } from 'next-intl';
import { useId, useState, type DragEvent } from 'react';
import { useReport, type UploadedFile } from '@/components/report/ReportProvider';
import { Link, useRouter } from '@/i18n/navigation';
import { detectFormat } from '@/lib/parsers/detect';
import { errorCode } from '@/lib/pipeline';
import { inspectFiles } from '@/lib/worker-client';

const ACCEPTED = /\.(txt|zip|json)$/i;

function fmtSize(bytes: number): string {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Consentimento + dropzone + chips dos arquivos. Nada é lido além dos primeiros 4 KB. */
export function UploadPanel() {
  const t = useTranslations('home');
  const router = useRouter();
  const tErr = useTranslations('common.errors');
  const { files, setFiles, setInspection, setMapping, setNames } = useReport();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const inputId = useId();

  async function addFiles(list: File[]) {
    const items: UploadedFile[] = await Promise.all(
      list
        .filter((f) => ACCEPTED.test(f.name))
        .map(async (file) => ({
          file,
          name: file.name,
          size: file.size,
          // .zip é binário: reconhecemos pela extensão; o resto, pelo começo do arquivo.
          format: /\.zip$/i.test(file.name)
            ? ('zip' as const)
            : detectFormat(file.name, await file.slice(0, 4096).text()),
        })),
    );
    setFiles([...files, ...items]);
  }

  /** Lê os arquivos no Worker. Sempre passa pela tela Confirmar (quem é quem e nome no relatório). */
  async function onContinue() {
    setBusy(true);
    setError(null);
    try {
      const inspection = await inspectFiles(files.map((f) => f.file));
      setInspection(inspection);
      setNames(null); // nomes de uma análise anterior não valem para esta
      setMapping(null);
      router.push('/confirm'); // sempre confirma quem é quem e deixa renomear
    } catch (err) {
      setError(tErr(errorCode(err) ?? 'unknown'));
    } finally {
      setBusy(false);
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    if (consent) void addFiles([...e.dataTransfer.files]);
  }

  return (
    <section className="panel space-y-4 p-5 sm:p-6">
      <div className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">
          {t('consent.draft')}
        </p>
        <p className="text-sm text-muted">{t('consent.body')}</p>
        <label className="flex min-h-11 cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-1 size-5 shrink-0 accent-[var(--color-sync)]"
          />
          <span>
            <span className="block font-medium">{t('consent.label')}</span>
            <span className="text-sm text-muted">{t('consent.hint')}</span>
          </span>
        </label>
      </div>

      <div onDragOver={(e) => e.preventDefault()} onDrop={onDrop}>
        <input
          id={inputId}
          type="file"
          multiple
          accept=".txt,.zip,.json"
          disabled={!consent}
          className="peer sr-only"
          data-testid="file-input"
          onChange={(e) => {
            void addFiles([...(e.target.files ?? [])]);
            e.target.value = '';
          }}
        />
        <label
          htmlFor={inputId}
          aria-disabled={!consent}
          className={`flex min-h-36 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed p-6 text-center peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-sync ${
            consent
              ? 'cursor-pointer border-sync/60 hover:bg-sync/10'
              : 'cursor-not-allowed border-line opacity-50'
          }`}
        >
          <span className="font-medium">{consent ? t('drop.idle') : t('drop.disabled')}</span>
          <span className="text-sm text-muted">{t('drop.formats')}</span>
        </label>
      </div>

      {files.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-semibold text-muted">{t('files.title')}</h2>
          <ul className="flex flex-wrap gap-2">
            {files.map((f, i) => (
              <li
                key={`${f.name}-${i}`}
                className="flex min-h-11 items-center gap-2 rounded-full border border-line bg-void py-1 pl-4 pr-1 text-sm"
              >
                <span className="max-w-48 truncate font-medium">{f.name}</span>
                <span className="text-muted">
                  {fmtSize(f.size)} · {t(`formats.${f.format}`)}
                </span>
                <button
                  type="button"
                  aria-label={t('files.remove', { name: f.name })}
                  onClick={() => setFiles(files.filter((_, j) => j !== i))}
                  className="flex size-9 items-center justify-center rounded-full text-muted hover:text-ink"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
        <button
          type="button"
          className="btn btn-primary"
          disabled={!consent || files.length === 0 || busy}
          onClick={() => void onContinue()}
        >
          {busy ? t('reading') : t('continue')}
        </button>
        <Link
          href="/report/timeline"
          className="flex min-h-11 items-center text-sm text-sync underline"
        >
          {t('demo')}
        </Link>
      </div>
    </section>
  );
}
