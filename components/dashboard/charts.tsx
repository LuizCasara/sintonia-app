// Gráficos simples em SVG/CSS (sem lib).
// Regra de cor: ciano = pessoa A, magenta = pessoa B. Nada mais usa essas cores.

import type { ReactNode } from 'react';

type Who = 'A' | 'B';
const DOT: Record<Who, string> = { A: 'bg-a', B: 'bg-b' };
const TEXT: Record<Who, string> = { A: 'text-a', B: 'text-b' };

/** Ponto colorido + nome da pessoa. */
export function PersonTag({ who, name, className = '' }: { who: Who; name: string; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 font-semibold ${TEXT[who]} ${className}`}>
      <span className={`size-2.5 shrink-0 rounded-full ${DOT[who]}`} aria-hidden="true" />
      {name}
    </span>
  );
}

/** Uma linha por pessoa: tag à esquerda, conteúdo à direita. */
export function PersonRow({ who, name, children }: { who: Who; name: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <PersonTag who={who} name={name} />
      <span className="tabular-nums">{children}</span>
    </div>
  );
}

/** Barra dividida A × B, com ponto + nome + valor embaixo. */
export function DualBar({
  a,
  b,
  nameA,
  nameB,
  fmt = String,
}: {
  a: number;
  b: number;
  nameA: string;
  nameB: string;
  fmt?: (n: number) => string;
}) {
  const share = (a / Math.max(1, a + b)) * 100;
  return (
    <div>
      <div
        className="flex h-3 overflow-hidden rounded-full bg-void"
        role="img"
        aria-label={`${nameA} ${fmt(a)}, ${nameB} ${fmt(b)}`}
      >
        <div className="bg-a glow-a" style={{ width: `${share}%` }} />
        <div className="bg-b glow-b flex-1" />
      </div>
      <div className="mt-2 flex justify-between gap-2 text-sm tabular-nums">
        <span className="inline-flex items-center gap-1.5">
          <PersonTag who="A" name={nameA} /> {fmt(a)}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <PersonTag who="B" name={nameB} /> {fmt(b)}
        </span>
      </div>
    </div>
  );
}

/** Barra de 2 partes em cores neutras (não são pessoas): violeta × cinza. */
export function NeutralBar({
  a,
  b,
  labelA,
  labelB,
}: {
  a: number;
  b: number;
  labelA: string;
  labelB: string;
}) {
  const share = (a / Math.max(1, a + b)) * 100;
  return (
    <div>
      <div
        className="flex h-3 overflow-hidden rounded-full bg-void"
        role="img"
        aria-label={`${labelA} ${a}%, ${labelB} ${b}%`}
      >
        <div className="bg-sync glow-sync" style={{ width: `${share}%` }} />
        <div className="flex-1 bg-muted" />
      </div>
      <div className="mt-2 flex justify-between text-sm font-semibold">
        <span className="text-sync">
          {labelA} {a}%
        </span>
        <span className="text-muted">
          {labelB} {b}%
        </span>
      </div>
    </div>
  );
}

/** Áudio × texto por pessoa: uma barra para cada um, nos tons da cor da pessoa. */
export function MediaBars({
  rows,
  audioLabel,
  textLabel,
}: {
  rows: { who: Who; name: string; audio: number; text: number }[];
  audioLabel: string;
  textLabel: string;
}) {
  return (
    <div className="space-y-3">
      {rows.map((r) => {
        const pct = Math.round((r.audio / Math.max(1, r.audio + r.text)) * 100);
        return (
          <div key={r.who}>
            <div className="mb-1 flex justify-between text-sm">
              <PersonTag who={r.who} name={r.name} />
              <span className="tabular-nums text-muted">
                {audioLabel} {pct}%
              </span>
            </div>
            <div
              className="flex h-3 overflow-hidden rounded-full"
              role="img"
              aria-label={`${r.name}: ${audioLabel} ${pct}%, ${textLabel} ${100 - pct}%`}
            >
              <div className={DOT[r.who]} style={{ width: `${pct}%` }} />
              <div className={`${DOT[r.who]} flex-1 opacity-30`} />
            </div>
          </div>
        );
      })}
      <p className="flex gap-4 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-4 rounded-sm bg-ink" aria-hidden="true" />
          {audioLabel}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-4 rounded-sm bg-ink opacity-30" aria-hidden="true" />
          {textLabel}
        </span>
      </p>
    </div>
  );
}

/** Sparkline das duas pessoas (A e B). */
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

/** Heatmap linhas × colunas (violeta = "sync": não é de nenhuma pessoa). */
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
        <HeatRow key={r} name={rows[r] ?? ''}>
          {row.map((v, c) => (
            <span
              key={c}
              className="h-5 rounded-sm bg-sync sm:h-6"
              style={{ opacity: 0.08 + 0.92 * (v / max) }}
            />
          ))}
        </HeatRow>
      ))}
    </div>
  );
}

function HeatRow({ name, children }: { name: string; children: ReactNode }) {
  return (
    <>
      <span className="self-center pr-1 text-right">{name}</span>
      {children}
    </>
  );
}

/** Tabela por pessoa: cabeçalho com ponto + nome de cada um. */
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
          <th scope="col" className="py-2 text-right">
            <PersonTag who="A" name={nameA} />
          </th>
          <th scope="col" className="py-2 text-right">
            <PersonTag who="B" name={nameB} />
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
            <span className="flex-1 bg-b" />
          </span>
          <span className="tabular-nums">{i.a + i.b}</span>
        </li>
      ))}
    </ul>
  );
}
