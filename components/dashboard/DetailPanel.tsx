'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, type ReactNode } from 'react';

/** Detalhe do card: drawer no desktop, bottom sheet no mobile. Fecha com Esc ou clicando fora. */
export function DetailPanel({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const t = useTranslations('dashboard');
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') return onClose();
      if (e.key !== 'Tab') return;
      // Mantém o foco dentro do painel
      const items = panelRef.current?.querySelectorAll<HTMLElement>('button, [href], input');
      if (!items?.length) return;
      const first = items[0] as HTMLElement;
      const last = items[items.length - 1] as HTMLElement;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      opener?.focus(); // devolve o foco ao card
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-void/70 backdrop-blur-sm" onClick={onClose}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-title"
        onClick={(e) => e.stopPropagation()}
        className="panel absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-b-none p-5 shadow-[0_0_40px_color-mix(in_srgb,var(--color-sync)_40%,transparent)] md:inset-y-0 md:left-auto md:right-0 md:max-h-none md:w-[28rem] md:rounded-none md:rounded-l-2xl"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 id="detail-title" className="font-display text-xl font-bold">
            {title}
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={t('close')}
            className="btn btn-ghost size-11 shrink-0 !p-0"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
