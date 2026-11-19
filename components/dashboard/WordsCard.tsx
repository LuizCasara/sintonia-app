'use client';

import { useLocale, useTranslations } from 'next-intl';
import { fmtNum } from '@/lib/format';
import { wordOwner } from '@/lib/share';

const TEXT = { A: 'text-a', B: 'text-b', both: 'text-sync' } as const;

function Eye({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
      {!open && <path d="M4 4l16 16" />}
    </svg>
  );
}

/** Palavras só do casal; o olho decide se a palavra sai em qualquer compartilhamento. */
export function WordsCard({
  words,
  usage,
  names,
  hidden,
  onToggle,
}: {
  words: string[];
  usage: Record<string, { A: number; B: number }>;
  names: { A: string; B: string };
  hidden: string[];
  onToggle: (word: string) => void;
}) {
  const t = useTranslations('dashboard');
  const locale = useLocale();
  const n = (v: number) => fmtNum(locale, v);
  return (
    <section
      className="panel flex flex-col gap-3 p-5 sm:col-span-2 lg:col-span-3"
      data-testid="words-card"
    >
      <h2 className="text-sm font-semibold text-muted">{t('cards.words')}</h2>
      {words.length === 0 ? (
        <p className="text-sm text-muted">{t('words.empty')}</p>
      ) : (
        <>
          <p className="text-xs text-muted">{t('words.hint')}</p>
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
            <span className="text-a">{t('words.mostly', { name: names.A })}</span>
            <span className="text-b">{t('words.mostly', { name: names.B })}</span>
            <span className="text-sync">{t('words.both')}</span>
          </p>
          <ul className="flex flex-wrap gap-2">
            {words.map((word) => {
              const off = hidden.includes(word);
              const label = t(off ? 'words.show' : 'words.hide', { word });
              const u = usage[word];
              const who = wordOwner(u);
              const detail = u ? `${names.A} ${n(u.A)} · ${names.B} ${n(u.B)}` : undefined;
              return (
                <li
                  key={word}
                  title={detail}
                  className="flex items-center gap-1 rounded-full border border-line bg-void/60 py-0.5 pl-3 pr-0.5"
                >
                  <span
                    className={`font-display text-base font-semibold ${
                      off ? 'text-muted line-through decoration-muted/60' : TEXT[who]
                    }`}
                  >
                    {word}
                  </span>
                  {u && (
                    <span className="text-xs tabular-nums text-muted" data-testid="word-count">
                      {n(u.A + u.B)}×
                    </span>
                  )}
                  <button
                    type="button"
                    aria-pressed={off}
                    aria-label={label}
                    title={label}
                    onClick={() => onToggle(word)}
                    className="flex size-9 items-center justify-center rounded-full text-muted transition hover:bg-white/5 hover:text-foreground focus-visible:outline-2 focus-visible:outline-sync"
                  >
                    <Eye open={!off} />
                  </button>
                </li>
              );
            })}
          </ul>
          {hidden.length > 0 && (
            <p className="text-xs text-muted" role="status">
              {t('words.hidden', { count: hidden.length })}
            </p>
          )}
        </>
      )}
    </section>
  );
}
