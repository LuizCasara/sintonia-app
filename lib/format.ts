// Formatadores simples para as telas (números, datas, durações).

export const fmtNum = (locale: string, n: number) => new Intl.NumberFormat(locale).format(n);

export const fmtPct = (n: number) => `${Math.round(n * 100)}%`;

/** "2019-05-02" ou "2019-05" → "2 de mai. de 2019" / "mai. de 2019". */
export function fmtDate(locale: string, iso: string, withDay = true): string {
  const [y = 1970, m = 1, d = 1] = iso.split('-').map(Number);
  return new Intl.DateTimeFormat(locale, {
    timeZone: 'UTC',
    day: withDay ? 'numeric' : undefined,
    month: 'short',
    year: 'numeric',
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

/** 540 → "9 min"; 4500 → "1h 15min". */
export function fmtDuration(sec: number): string {
  if (sec < 60) return `${Math.round(sec)}s`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)}h ${min % 60}min`;
}

/** Nome curto do dia da semana (0 = domingo). */
export function weekdayName(locale: string, day: number): string {
  return new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' }).format(
    new Date(Date.UTC(2023, 0, 1 + day)),
  );
}
