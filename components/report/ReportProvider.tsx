'use client';

import { useLocale } from 'next-intl';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { getDemoReport } from '@/lib/demo';
import type { PersonMapping } from '@/lib/merge';
import type { DisplayNames } from '@/lib/rename';
import type { Report } from '@/lib/metrics';
import type { Inspection } from '@/lib/pipeline';
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
  /** Resultado da leitura dos arquivos (só nomes e contagens), usado na tela Confirmar. */
  inspection: Inspection | null;
  setInspection: (inspection: Inspection | null) => void;
  /** Quem é A e B: definido na home (app único) ou na tela Confirmar. */
  mapping: PersonMapping | null;
  setMapping: (mapping: PersonMapping | null) => void;
  /** Nomes escolhidos na tela Confirmar para aparecer no relatório (null = os detectados). */
  names: DisplayNames | null;
  setNames: (names: DisplayNames | null) => void;
  setFiles: (files: UploadedFile[]) => void;
  setReport: (report: Report) => void;
  /** Palavras do dicionário escondidas do compartilhamento (só em memória). */
  /** Abre uma sessão salva: o relatório e as palavras escondidas daquela vez. */
  restore: (report: Report, hiddenWords: string[]) => void;
  hiddenWords: string[];
  toggleWord: (word: string) => void;
  /** Apaga tudo da memória. */
  clearAll: () => void;
}

const Ctx = createContext<ReportState | null>(null);

// Estado só em memória (nada de localStorage): fechar a aba apaga tudo.
export function ReportProvider({ children }: { children: ReactNode }) {
  const locale = useLocale() as 'pt' | 'en';
  const [real, setReal] = useState<Report | null>(null);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [mapping, setMapping] = useState<PersonMapping | null>(null);
  const [names, setNames] = useState<DisplayNames | null>(null);
  const [hiddenWords, setHiddenWords] = useState<string[]>([]);
  const demo = useMemo(() => getDemoReport(locale), [locale]);
  const clearAll = useCallback(() => {
    setReal(null);
    setFiles([]);
    setInspection(null);
    setMapping(null);
    setNames(null);
    setHiddenWords([]);
  }, []);
  const setReport = useCallback((report: Report) => {
    setReal(report);
    setHiddenWords([]); // outro relatório, outras palavras
  }, []);
  const restore = useCallback((report: Report, hidden: string[]) => {
    setReal(report);
    setHiddenWords(hidden);
  }, []);
  const toggleWord = useCallback((word: string) => {
    setHiddenWords((list) =>
      list.includes(word) ? list.filter((w) => w !== word) : [...list, word],
    );
  }, []);

  const value: ReportState = {
    report: real ?? demo,
    isDemo: real === null,
    files,
    inspection,
    setInspection,
    mapping,
    setMapping,
    names,
    setNames,
    setFiles,
    setReport,
    restore,
    hiddenWords,
    toggleWord,
    clearAll,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useReport(): ReportState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useReport precisa estar dentro de ReportProvider');
  return ctx;
}
