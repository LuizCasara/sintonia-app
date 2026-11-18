'use client';

import { useEffect, useRef } from 'react';

const PER_FLOW = 56; // 2 fluxos x 56 = 112 partículas (menos de 120)

interface Particle {
  x: number;
  y: number;
  speed: number; // px por frame
  jitter: number; // espalhamento vertical
  flow: 0 | 1; // 0 = A (ciano), 1 = B (magenta)
}

/**
 * Dois fluxos de partículas (A ciano, B magenta) em forma de onda.
 * `progress` (0 a 1): no começo os fluxos estão separados e defasados;
 * conforme sobe, eles se aproximam e entram em fase (uma onda só).
 * Para quando a aba some; com prefers-reduced-motion desenha só o estado final.
 */
export function Particles({ progress = 0 }: { progress?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const progressRef = useRef(progress);
  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const css = getComputedStyle(document.documentElement);
    const colors = [css.getPropertyValue('--color-a'), css.getPropertyValue('--color-b')];

    let w = 0;
    let h = 0;
    let time = 0;
    let raf = 0;
    let particles: Particle[] = [];

    // Altura da onda do fluxo `flow` na posição x.
    function waveY(flow: 0 | 1, x: number, prog: number) {
      const apart = 1 - prog; // 1 = separados e defasados, 0 = juntos e em fase
      const phase = flow === 1 ? Math.PI * apart : 0;
      const side = flow === 0 ? -1 : 1;
      const amp = h * 0.16;
      return (
        h / 2 + side * apart * h * 0.2 + amp * Math.sin((x / w) * Math.PI * 4 + time * 0.03 + phase)
      );
    }

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      w = canvas!.clientWidth;
      h = canvas!.clientHeight;
      canvas!.width = w * dpr;
      canvas!.height = h * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      particles = Array.from({ length: PER_FLOW * 2 }, (_, i) => {
        const flow = (i % 2) as 0 | 1;
        const x = Math.random() * w;
        return {
          x,
          y: reduced ? waveY(flow, x, 1) : Math.random() * h,
          speed: 0.5 + Math.random() * 1.2,
          jitter: (Math.random() - 0.5) * 14,
          flow,
        };
      });
      draw(reduced ? 1 : progressRef.current);
    }

    function draw(prog: number) {
      ctx!.clearRect(0, 0, w, h);
      ctx!.globalCompositeOperation = 'lighter'; // A + B juntos clareiam
      // Fio fino de cada onda, para o fluxo ficar legível
      for (const flow of [0, 1] as const) {
        ctx!.strokeStyle = colors[flow] as string;
        ctx!.globalAlpha = 0.22;
        ctx!.lineWidth = 1.5;
        ctx!.beginPath();
        for (let x = 0; x <= w; x += 10) {
          const y = waveY(flow, x, prog);
          if (x === 0) ctx!.moveTo(x, y);
          else ctx!.lineTo(x, y);
        }
        ctx!.stroke();
      }
      ctx!.globalAlpha = 1;
      for (const p of particles) {
        ctx!.fillStyle = colors[p.flow] as string;
        ctx!.shadowColor = colors[p.flow] as string;
        ctx!.shadowBlur = 8;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, 1.9, 0, Math.PI * 2);
        ctx!.fill();
      }
      ctx!.shadowBlur = 0;
    }

    function tick() {
      const prog = progressRef.current;
      time += 1;
      for (const p of particles) {
        p.x += p.speed;
        if (p.x > w) p.x -= w;
        const target = waveY(p.flow, p.x, prog) + p.jitter * (1 - prog * 0.7);
        p.y += (target - p.y) * 0.12; // acompanha a onda suavemente
      }
      draw(prog);
      raf = requestAnimationFrame(tick);
    }

    function start() {
      if (!reduced && !raf) raf = requestAnimationFrame(tick);
    }
    function stop() {
      cancelAnimationFrame(raf);
      raf = 0;
    }
    function onVisibility() {
      if (document.hidden) stop();
      else start();
    }

    resize();
    start();
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stop();
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return <canvas ref={canvasRef} className="h-full w-full" aria-hidden="true" />;
}
