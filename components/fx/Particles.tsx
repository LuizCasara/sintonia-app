'use client';

import { useEffect, useRef } from 'react';

const COUNT = 90; // menos de 120, para ficar leve

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  tx: number; // alvo na linha central
  side: 1 | -1; // A fica acima, B abaixo, até convergirem
  color: 'a' | 'b';
}

/**
 * Partículas em canvas. `progress` (0 a 1) é a atração: no fim, A e B se juntam numa linha.
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
    const colors = { a: css.getPropertyValue('--color-a'), b: css.getPropertyValue('--color-b') };

    let w = 0;
    let h = 0;
    let particles: Particle[] = [];
    let raf = 0;

    function targetY(p: Particle, prog: number) {
      return h / 2 + p.side * (1 - prog) * h * 0.18;
    }

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      w = canvas!.clientWidth;
      h = canvas!.clientHeight;
      canvas!.width = w * dpr;
      canvas!.height = h * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      particles = Array.from({ length: COUNT }, (_, i) => {
        const tx = Math.random() * w;
        const side = i % 2 === 0 ? 1 : -1;
        const p: Particle = {
          x: Math.random() * w,
          y: Math.random() * h,
          vx: 0,
          vy: 0,
          tx,
          side,
          color: side === 1 ? 'a' : 'b',
        };
        if (reduced) {
          p.x = tx;
          p.y = targetY(p, 1);
        }
        return p;
      });
      draw();
    }

    function draw() {
      ctx!.clearRect(0, 0, w, h);
      for (const p of particles) {
        ctx!.fillStyle = colors[p.color];
        ctx!.shadowColor = colors[p.color];
        ctx!.shadowBlur = 8;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, 1.8, 0, Math.PI * 2);
        ctx!.fill();
      }
    }

    function tick() {
      const prog = progressRef.current;
      const pull = 0.002 + 0.02 * prog;
      for (const p of particles) {
        p.vx = (p.vx + (p.tx - p.x) * pull * 0.2 + (Math.random() - 0.5) * 0.15) * 0.93;
        p.vy = (p.vy + (targetY(p, prog) - p.y) * pull + (Math.random() - 0.5) * 0.15) * 0.93;
        p.x += p.vx;
        p.y += p.vy;
      }
      draw();
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
