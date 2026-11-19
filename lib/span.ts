// Tempo decorrido entre duas datas ISO, em anos, meses e dias ("1 ano e 3 meses").
// Datas com dia ("2026-11-15") contam até o dia; datas de mês ("2026-11") contam só meses.

export interface Span {
  years: number;
  months: number;
  days: number;
}

const parse = (iso: string) => {
  const [y = 1970, m = 1, d] = iso.split('-').map(Number);
  return { y, m, d: d ?? null };
};

export function spanBetween(fromIso: string, toIso: string): Span {
  const a = parse(fromIso);
  const b = parse(toIso);
  if (b.y < a.y || (b.y === a.y && b.m < a.m)) return { years: 0, months: 0, days: 0 };

  const withDays = a.d !== null && b.d !== null;
  let total = (b.y - a.y) * 12 + (b.m - a.m);
  let days = 0;
  if (withDays) {
    if (b.d! < a.d!) {
      total -= 1;
      const prevDays = new Date(Date.UTC(b.y, b.m - 1, 0)).getUTCDate();
      const anchor = Date.UTC(b.y, b.m - 2, Math.min(a.d!, prevDays));
      days = Math.max(0, Math.round((Date.UTC(b.y, b.m - 1, b.d!) - anchor) / 86_400_000));
    } else {
      days = b.d! - a.d!;
    }
    if (total < 0) return { years: 0, months: 0, days: Math.max(0, days) };
  }
  return { years: Math.floor(total / 12), months: total % 12, days };
}

/** Quantidade de dias corridos entre duas datas com dia. */
export function daysBetween(fromIso: string, toIso: string): number {
  const a = parse(fromIso);
  const b = parse(toIso);
  return Math.max(
    0,
    Math.round((Date.UTC(b.y, b.m - 1, b.d ?? 1) - Date.UTC(a.y, a.m - 1, a.d ?? 1)) / 86_400_000),
  );
}

/** "1 ano e 3 meses" (ou "12 dias" se não passou de um mês); vazio se for o mesmo dia. */
export function formatSpan(
  sp: Span,
  locale: string,
  label: (unit: 'years' | 'months' | 'days', n: number) => string,
): string {
  const parts: string[] = [];
  if (sp.years > 0) parts.push(label('years', sp.years));
  if (sp.months > 0) parts.push(label('months', sp.months));
  if (parts.length === 0 && sp.days > 0) parts.push(label('days', sp.days));
  return new Intl.ListFormat(locale, { style: 'long', type: 'conjunction' }).format(parts);
}
