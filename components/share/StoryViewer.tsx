'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { download } from '@/lib/stories';

export interface ViewerCard {
  id: string;
  label: string;
  url: string;
  blob: Blob;
}

/** Visualização ampliada dos cards, como um carrossel: setas, teclado, baixar e compartilhar. */
export function StoryViewer({
  cards,
  start,
  onClose,
}: {
  cards: ViewerCard[];
  start: number;
  onClose: () => void;
}) {
  const t = useTranslations('actions.stories');
  const [index, setIndex] = useState(start);
  const [shareFailed, setShareFailed] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const touchX = useRef<number | null>(null);

  const count = cards.length;
  const current = cards[index];
  const go = (delta: number) => {
    setShareFailed(false);
    setIndex((i) => (i + delta + count) % count);
  };

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
      previousFocus?.focus?.();
    };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, onClose]);

  if (!current) return null;

  const file = () => new File([current.blob], `sintonia-${current.id}.png`, { type: 'image/png' });
  // Compartilhar o arquivo só aparece onde o navegador sabe fazer isso (celulares, Safari, Edge).
  const canShare =
    typeof navigator !== 'undefined' &&
    typeof navigator.canShare === 'function' &&
    typeof File !== 'undefined' &&
    navigator.canShare({ files: [file()] });

  async function share() {
    try {
      await navigator.share({ files: [file()] });
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setShareFailed(true); // fechar a folha não é erro
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('viewer')}
      data-testid="story-viewer"
      className="fixed inset-0 z-50 flex flex-col items-center gap-3 bg-black/90 p-4"
      onClick={onClose}
    >
      <div className="flex w-full max-w-md items-center justify-between text-white">
        <p className="text-sm" aria-live="polite">
          {current.label} · {index + 1}/{count}
        </p>
        <button
          ref={closeRef}
          type="button"
          className="btn btn-ghost !min-h-10 text-white"
          onClick={onClose}
        >
          {t('close')}
        </button>
      </div>

      <div
        className="relative flex min-h-0 flex-1 items-center justify-center"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => (touchX.current = e.touches[0]?.clientX ?? null)}
        onTouchEnd={(e) => {
          const start = touchX.current;
          touchX.current = null;
          const end = e.changedTouches[0]?.clientX;
          if (start === null || end === undefined || Math.abs(end - start) < 50) return;
          go(end < start ? 1 : -1);
        }}
      >
        {count > 1 && (
          <button
            type="button"
            aria-label={t('prev')}
            onClick={() => go(-1)}
            className="absolute left-0 z-10 grid size-11 -translate-x-1/2 place-items-center rounded-full bg-white/20 text-xl text-white backdrop-blur hover:bg-white/30 max-sm:translate-x-0"
          >
            ←
          </button>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={current.url}
          alt={current.label}
          className="max-h-full max-w-full rounded-2xl object-contain shadow-2xl"
          style={{ aspectRatio: '9 / 16' }}
        />
        {count > 1 && (
          <button
            type="button"
            aria-label={t('next')}
            onClick={() => go(1)}
            className="absolute right-0 z-10 grid size-11 translate-x-1/2 place-items-center rounded-full bg-white/20 text-xl text-white backdrop-blur hover:bg-white/30 max-sm:translate-x-0"
          >
            →
          </button>
        )}
      </div>

      <div
        className="flex flex-wrap items-center justify-center gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => download(current.blob, `sintonia-${current.id}.png`)}
        >
          {t('download')}
        </button>
        {canShare && (
          <button type="button" className="btn btn-ghost text-white" onClick={share}>
            {t('share')}
          </button>
        )}
      </div>
      {shareFailed && (
        <p role="alert" className="text-sm text-white">
          {t('shareError')}
        </p>
      )}
    </div>
  );
}
