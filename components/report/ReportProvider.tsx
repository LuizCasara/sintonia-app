'use client';

import { useLocale } from 'next-intl';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { getDemoReport } from '@/lib/demo';
import type { Report } from '@/lib/metrics';
import type { Format } from '@/lib/parsers/detect';

/** Arquivo escolhido pelo usuário (fica só na memória da aba). */
export interface UploadedFile {
  file: File;
  name: string;
  size: number;
  format: Format | 'zip';
}

interface ReportState {
  /** Report atual; se não houver dado, o demo fictício. */
  report: Report;
  isDemo: boolean;
  files: UploadedFile[];
  setFiles: (files: UploadedFile[]) => void;
  setReport: (report: Report) => void;
  /** Apaga tudo da memória. */
  clearAll: () => void;
}

const Ctx = createContext<ReportState | null>(null);

// Estado só em memória (nada de localStorage): fechar a aba apaga tudo.
export function ReportProvider({ children }: { children: ReactNode }) {
  const locale = useLocale() as 'pt' | 'en';
  const [real, setReal] = useState<Report | null>(null);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const demo = useMemo(() => getDemoReport(locale), [locale]);
  const clearAll = useCallback(() => {
    setReal(null);
    setFiles([]);
  }, []);

  const value: ReportState = {
    report: real ?? demo,
    isDemo: real === null,
    files,
    setFiles,
    setReport: setReal,
    clearAll,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useReport(): ReportState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useReport precisa estar dentro de ReportProvider');
  return ctx;
}
