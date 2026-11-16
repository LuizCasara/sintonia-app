// Gráficos simples em SVG/CSS (sem lib). Pessoa A = ciano, B = magenta.

import type { ReactNode } from 'react';

/** Barra dividida A × B, com os valores embaixo. */
export function DualBar({
  a,
  b,
  labelA,
  labelB,
  fmt = String,
}: {
  a: number;
  b: number;
  labelA: string;
  labelB: string;
  fmt?: (n: number) => string;
}) {
  const share = (a / Math.max(1, a + b)) * 100;
  return (
    <div>
      <div
        className="flex h-3 overflow-hidden rounded-full bg-void"
        role="img"
        aria-label={`${labelA} ${fmt(a)}, ${labelB} ${fmt(b)}`}
      >
        <div className="bg-a glow-a" style={{ width: `${share}%` }} />
        <div className="bg-b glow-b flex-1" />
      </div>
      <div className="mt-2 flex justify-between text-sm font-semibold tabular-nums">
        <span className="text-a">{fmt(a)}</span>
        <span className="text-b">{fmt(b)}</span>
      </div>
    </div>
  );
}

/** Sparkline com uma ou mais séries (A e B). */
export function Spark({ a, b, height = 48 }: { a: number[]; b: number[]; height?: number }) {
  const w = 200;
  const max = Math.max(1, ...a, ...b);
  const pts = (s: number[]) =>
    s
      .map(
        (v, i) =>
          `${((i / Math.max(1, s.length - 1)) * w).toFixed(1)},${(height - (v / max) * (height - 4) - 2).toFixed(1)}`,
      )
      .join(' ');
  return (
    <svg
      viewBox={`0 0 ${w} ${height}`}
      className="h-12 w-full"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <polyline
        points={pts(a)}
        fill="none"
        stroke="var(--color-a)"
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
      />
      <polyline
        points={pts(b)}
        fill="none"
        stroke="var(--color-b)"
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/** Heatmap linhas × colunas; a cor violeta fica mais forte com o valor. */
export function Heatmap({
  data,
  rows,
  cols,
  label,
}: {
  data: number[][];
  rows: string[];
  cols: string[];
  label: string;
}) {
  const max = Math.max(1, ...data.flat());
  return (
    <div
      role="img"
      aria-label={label}
      className="grid gap-1 text-[10px] text-muted"
      style={{ gridTemplateColumns: `auto repeat(${cols.length}, 1fr)` }}
    >
      <span />
      {cols.map((c) => (
        <span key={c} className="text-center">
          {c}
        </span>
      ))}
      {data.map((row, r) => (
        <Row key={r} name={rows[r] ?? ''}>
          {row.map((v, c) => (
            <span
              key={c}
              className="aspect-[3/2] rounded-sm bg-sync"
              style={{ opacity: 0.08 + 0.92 * (v / max) }}
            />
          ))}
        </Row>
      ))}
    </div>
  );
}

function Row({ name, children }: { name: string; children: ReactNode }) {
  return (
    <>
      <span className="pr-1 text-right">{name}</span>
      {children}
    </>
  );
}

/** Tabela por pessoa: linhas com rótulo, valor de A e valor de B. */
export function PersonTable({
  rows,
  nameA,
  nameB,
}: {
  rows: { label: string; a: string; b: string }[];
  nameA: string;
  nameB: string;
}) {
  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="text-muted">
          <th scope="col" className="py-2 font-normal" />
          <th scope="col" className="py-2 text-right font-semibold text-a">
            {nameA}
          </th>
          <th scope="col" className="py-2 text-right font-semibold text-b">
            {nameB}
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-line">
        {rows.map((r) => (
          <tr key={r.label}>
            <th scope="row" className="py-2 font-normal text-muted">
              {r.label}
            </th>
            <td className="py-2 text-right tabular-nums">{r.a}</td>
            <td className="py-2 text-right tabular-nums">{r.b}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Barras horizontais empilhadas A/B por item (ex.: por mês). */
export function StackedBars({ items }: { items: { label: string; a: number; b: number }[] }) {
  const max = Math.max(1, ...items.map((i) => i.a + i.b));
  return (
    <ul className="space-y-1.5 text-xs">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-2">
          <span className="w-16 shrink-0 text-muted">{i.label}</span>
          <span
            className="flex h-3 overflow-hidden rounded-full bg-void"
            style={{ width: `${((i.a + i.b) / max) * 100}%` }}
          >
            <span className="bg-a" style={{ width: `${(i.a / Math.max(1, i.a + i.b)) * 100}%` }} />
            <span className="bg-b flex-1" />
          </span>
          <span className="tabular-nums">{i.a + i.b}</span>
        </li>
      ))}
    </ul>
  );
}
