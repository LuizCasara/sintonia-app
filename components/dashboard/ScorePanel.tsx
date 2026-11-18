import type { ReactNode } from 'react';

/** Uma parte da nota, já com os textos prontos (a tradução fica no chamador). */
export interface ScoreRow {
  id: string;
  label: string;
  detail: string;
  /** "peso 40%" */
  weight: string;
  /** Nota da parte, de 0 a 1 (largura da barra). */
  score: number;
  /** Nota da parte de 0 a 10, formatada. */
  scoreText: string;
}

const TONE = { sync: 'text-sync', a: 'text-a', b: 'text-b' } as const;

/** A nota grande ("8,2 de 10") com uma linha de apoio. */
export function ScoreBadge({
  value,
  outOf,
  hint,
  tone = 'sync',
}: {
  value: string;
  outOf: string;
  hint: ReactNode;
  tone?: keyof typeof TONE;
}) {
  return (
    <div>
      <p className="flex items-baseline gap-2">
        <span className={`font-display text-4xl font-bold ${TONE[tone]}`}>{value}</span>
        <span className="text-sm text-muted">{outOf}</span>
      </p>
      <p className="mt-1 text-sm text-muted">{hint}</p>
    </div>
  );
}

/** Cada parte da nota: nome, o que foi medido, nota, peso e uma barra. */
export function ScoreBreakdown({ rows }: { rows: ScoreRow[] }) {
  return (
    <ul className="space-y-4">
      {rows.map((r) => (
        <li key={r.id}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-medium">{r.label}</span>
            <span className="font-display text-lg font-bold tabular-nums">
              {r.scoreText}
              <span className="text-xs font-normal text-muted"> /10</span>
            </span>
          </div>
          <p className="text-sm text-muted">{r.detail}</p>
          <div className="mt-1.5 flex items-center gap-3">
            <div aria-hidden="true" className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
              <div
                className="h-full rounded-full bg-sync"
                style={{ width: `${Math.round(r.score * 100)}%` }}
              />
            </div>
            <span className="text-xs text-muted">{r.weight}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}
