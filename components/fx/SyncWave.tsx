// Duas senoides (A ciano, B magenta) que entram em fase e formam o sinal violeta.
// A animação é só CSS (ver globals.css); com prefers-reduced-motion mostra o estado final.

const PERIOD = 120; // largura de um ciclo (o loop CSS anda exatamente 1 ciclo)
const WIDTH = 720;
const HEIGHT = 140; // sobra espaço em cima e embaixo para o glow

function wavePath(amp: number): string {
  const points: string[] = [];
  for (let x = -PERIOD; x <= WIDTH + PERIOD; x += 6) {
    const y = HEIGHT / 2 + amp * Math.sin((x / PERIOD) * 2 * Math.PI);
    points.push(`${points.length === 0 ? 'M' : 'L'}${x} ${y.toFixed(1)}`);
  }
  return points.join(' ');
}

export function SyncWave({ className = '', amp = 34 }: { className?: string; amp?: number }) {
  const common = {
    fill: 'none',
    strokeLinecap: 'round',
    vectorEffect: 'non-scaling-stroke',
  } as const;
  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="none"
      className={`wave-fade ${className}`}
      aria-hidden="true"
    >
      <g className="glow-a">
        <path
          className="sync-flow"
          d={wavePath(amp)}
          stroke="var(--color-a)"
          strokeWidth={2.5}
          {...common}
        />
      </g>
      <g className="sync-align glow-b" style={{ mixBlendMode: 'screen' }}>
        <path
          className="sync-flow"
          d={wavePath(amp)}
          stroke="var(--color-b)"
          strokeWidth={2.5}
          {...common}
        />
      </g>
      {/* Sinal em fase: aparece quando A e B se alinham */}
      <g className="sync-appear glow-sync">
        <path
          className="sync-flow"
          d={wavePath(amp * 1.1)}
          stroke="var(--color-sync)"
          strokeWidth={3.5}
          {...common}
        />
      </g>
    </svg>
  );
}
