import type { Report } from './metrics';

export interface DisplayNames {
  A?: string;
  B?: string;
}

export const MAX_NAME = 40;

/** Troca os nomes que aparecem no relatório (painel, PDF, cards). Vazio mantém o nome detectado. */
export function applyNames(report: Report, names: DisplayNames | null): Report {
  if (!names) return report;
  const clean = (value: string | undefined, fallback: string) =>
    value?.trim().slice(0, MAX_NAME) || fallback;
  return {
    ...report,
    people: { A: clean(names.A, report.people.A), B: clean(names.B, report.people.B) },
  };
}
