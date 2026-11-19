import type { Report } from './metrics';
import { sharedDictionary } from './share';
import { PROMPT_TEMPLATE } from './prompt-template';

export interface PromptOptions {
  locale: 'pt' | 'en';
  /** Só true se o usuário marcou a caixa do "dicionário do casal". */
  includeDictionary: boolean;
  /** Palavras que o usuário escondeu no painel: não saem em nada compartilhado. */
  hiddenWords?: readonly string[];
  /** Usa os nomes do relatório. Desmarcado, o prompt leva nomes inventados. */
  useRealNames?: boolean;
}

/** Nomes inventados do prompt, usados quando o usuário desmarca "usar os nomes do relatório". */
export const PROMPT_NAMES = { A: 'Ana Lima', B: 'Bruno Reis' } as const;

const LANGUAGE_NAME = { pt: 'português do Brasil', en: 'English' } as const;

/** Monta o texto do "Copiar prompt": template + JSON só com números. */
export function buildPrompt(report: Report, opts: PromptOptions): string {
  // Sem consentimento, o dicionário nunca entra no JSON.
  // people usa os nomes do relatório só se o usuário deixou a opção marcada.
  const names = opts.useRealNames
    ? { A: report.people.A, B: report.people.B }
    : { A: PROMPT_NAMES.A, B: PROMPT_NAMES.B };
  const data = {
    ...report,
    people: names,
    dictionary: opts.includeDictionary ? sharedDictionary(report, opts.hiddenWords) : null,
  };
  if (!opts.includeDictionary) delete (data as Partial<Report>).dictionary;
  // As notas do app (Sintonia e Equilíbrio) não vão no prompt na V1: a IA não deve dar nota própria.
  delete (data as Partial<Report>).sintonia;
  delete (data as Partial<Report>).balance;

  const years = Math.max(1, Math.round(report.period.days / 365));
  const values: Record<string, string> = {
    ANOS: String(years),
    PESSOA_A: names.A,
    PESSOA_B: names.B,
    IDIOMA: LANGUAGE_NAME[opts.locale],
    JSON: JSON.stringify(data, null, 2),
  };
  // TODO(Luiz): o template está só em pt; decidir se vale traduzir para locale 'en'.
  return PROMPT_TEMPLATE.replace(/\{\{(\w+)\}\}/g, (_, key: string) => values[key] ?? '');
}
