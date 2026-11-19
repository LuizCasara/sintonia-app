// Cards 9:16 para stories, desenhados num <canvas> no navegador (sem biblioteca, sem rede).
// Só números e palavras escolhidas pela pessoa: nenhuma mensagem entra aqui.

export const STORY_W = 1080;
export const STORY_H = 1920;

const C = {
  void: '#06060c',
  panel: '#0e0e1a',
  ink: '#e8e8f4',
  muted: '#8a8aa6',
  a: '#22e5ff',
  b: '#ff3dbd',
  sync: '#b18cff',
  line: '#ffffff1f',
} as const;

export type Who = 'A' | 'B' | 'both';
const COLOR: Record<Who, string> = { A: C.a, B: C.b, both: C.sync };

export type StorySpec =
  | {
      kind: 'big';
      kicker: string;
      value: string;
      caption: string;
      series?: { a: number[]; b: number[] };
    }
  | {
      kind: 'split';
      kicker: string;
      a: { name: string; pct: number };
      b: { name: string; pct: number };
    }
  | {
      kind: 'scores';
      kicker: string;
      items: { label: string; value: string; outOf: string; hint: string }[];
    }
  | {
      kind: 'segments';
      kicker: string;
      value: string;
      caption: string;
      /** Preenchimento de cada segmento, de 0 a 1. */
      segments: number[];
      note?: string;
    }
  | {
      kind: 'words';
      kicker: string;
      words: { word: string; count: string; who: Who }[];
    };

export interface StoryTheme {
  display: string; // família da fonte dos títulos
  body: string;
  footer: string; // "Sintonizados desde a primeira mensagem."
}

/** Lê as fontes do app (Space Grotesk e Inter) para o canvas usar as mesmas. */
export function themeFromPage(footer: string): StoryTheme {
  const css = getComputedStyle(document.body);
  return {
    display: css.getPropertyValue('--font-display').trim() || 'system-ui, sans-serif',
    body: css.getPropertyValue('--font-sans').trim() || 'system-ui, sans-serif',
    footer,
  };
}

function background(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = C.void;
  ctx.fillRect(0, 0, STORY_W, STORY_H);
  const glow = (x: number, y: number, r: number, color: string) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color + '33');
    g.addColorStop(1, color + '00');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, STORY_W, STORY_H);
  };
  glow(180, 260, 900, C.a);
  glow(900, 1650, 1000, C.b);
  glow(540, 960, 700, C.sync);
}

function text(
  ctx: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  font: string,
  color: string,
  align: CanvasTextAlign = 'left',
) {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(value, x, y);
}

/** Reduz o corpo da fonte até o texto caber na largura. */
function fit(
  ctx: CanvasRenderingContext2D,
  value: string,
  family: string,
  weight: number,
  size: number,
  maxWidth: number,
): string {
  let s = size;
  for (; s > 24; s -= 4) {
    ctx.font = `${weight} ${s}px ${family}`;
    if (ctx.measureText(value).width <= maxWidth) break;
  }
  return `${weight} ${s}px ${family}`;
}

/** Quebra o texto em linhas que cabem na largura. */
function wrap(ctx: CanvasRenderingContext2D, value: string, font: string, maxWidth: number) {
  ctx.font = font;
  const lines: string[] = [];
  let line = '';
  for (const word of value.split(/\s+/)) {
    const test = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(test).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function chrome(ctx: CanvasRenderingContext2D, spec: StorySpec, theme: StoryTheme) {
  background(ctx);
  // Marca no topo: duas ondas que se juntam em violeta
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  for (const [color, dy] of [
    [C.a, -14],
    [C.b, 14],
  ] as const) {
    ctx.strokeStyle = color;
    ctx.beginPath();
    for (let x = 0; x <= 150; x += 4) {
      const t = x / 150;
      ctx.lineTo(90 + x, 150 + dy * (1 - t) * Math.sin(t * Math.PI * 3));
    }
    ctx.stroke();
  }
  text(ctx, 'Sintonia', 270, 166, `700 56px ${theme.display}`, C.ink);
  text(ctx, spec.kicker, 90, 330, `600 44px ${theme.body}`, C.muted);
  text(ctx, theme.footer, STORY_W / 2, STORY_H - 90, `500 30px ${theme.body}`, C.muted, 'center');
}

function drawSeries(ctx: CanvasRenderingContext2D, a: number[], b: number[]) {
  const n = Math.max(a.length, b.length);
  if (n < 2) return;
  const max = Math.max(1, ...a, ...b);
  const x0 = 90;
  const w = STORY_W - 180;
  const y0 = 1500;
  const h = 360;
  for (const [data, color] of [
    [a, C.a],
    [b, C.b],
  ] as const) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 6;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    data.forEach((v, i) => {
      const x = x0 + (i / (n - 1)) * w;
      const y = y0 - (v / max) * h;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }
}

export function renderStory(spec: StorySpec, theme: StoryTheme): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = STORY_W;
  canvas.height = STORY_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  chrome(ctx, spec, theme);
  const cx = STORY_W / 2;

  if (spec.kind === 'big') {
    text(
      ctx,
      spec.value,
      cx,
      880,
      fit(ctx, spec.value, theme.display, 700, 260, 900),
      C.ink,
      'center',
    );
    wrap(ctx, spec.caption, `600 56px ${theme.body}`, 860).forEach((l, i) =>
      text(ctx, l, cx, 990 + i * 74, `600 56px ${theme.body}`, C.sync, 'center'),
    );
    if (spec.series) drawSeries(ctx, spec.series.a, spec.series.b);
  }

  if (spec.kind === 'split') {
    const rows = [
      { ...spec.a, color: C.a, y: 720 },
      { ...spec.b, color: C.b, y: 1180 },
    ];
    for (const r of rows) {
      text(ctx, `${r.pct}%`, 90, r.y + 200, `700 260px ${theme.display}`, r.color);
      text(ctx, r.name, 90, r.y + 290, fit(ctx, r.name, theme.body, 600, 64, 900), r.color);
      ctx.fillStyle = '#ffffff12';
      ctx.fillRect(90, r.y + 330, 900, 22);
      ctx.fillStyle = r.color;
      ctx.fillRect(90, r.y + 330, (900 * r.pct) / 100, 22);
    }
  }

  if (spec.kind === 'scores') {
    spec.items.forEach((it, i) => {
      const y = 560 + i * 580;
      text(ctx, it.label, 90, y + 70, `600 64px ${theme.body}`, C.muted);
      text(ctx, it.value, 90, y + 330, `700 300px ${theme.display}`, C.sync);
      ctx.font = `700 300px ${theme.display}`;
      const w = ctx.measureText(it.value).width;
      text(ctx, it.outOf, 90 + w + 30, y + 330, `500 64px ${theme.body}`, C.muted);
      wrap(ctx, it.hint, `500 46px ${theme.body}`, 880)
        .slice(0, 2)
        .forEach((l, k) => text(ctx, l, 90, y + 445 + k * 58, `500 46px ${theme.body}`, C.ink));
    });
  }

  if (spec.kind === 'segments') {
    text(
      ctx,
      spec.value,
      cx,
      860,
      fit(ctx, spec.value, theme.display, 700, 320, 900),
      C.sync,
      'center',
    );
    wrap(ctx, spec.caption, `600 56px ${theme.body}`, 860).forEach((l, i) =>
      text(ctx, l, cx, 980 + i * 74, `600 56px ${theme.body}`, C.ink, 'center'),
    );
    const n = spec.segments.length;
    const gap = 14;
    const w = (900 - gap * (n - 1)) / n;
    spec.segments.forEach((fill, i) => {
      const x = 90 + i * (w + gap);
      ctx.fillStyle = '#ffffff14';
      ctx.fillRect(x, 1240, w, 56);
      ctx.fillStyle = C.sync;
      ctx.fillRect(x, 1240, w * Math.max(0, Math.min(1, fill)), 56);
    });
    if (spec.note) {
      wrap(ctx, spec.note, `500 46px ${theme.body}`, 900).forEach((l, i) =>
        text(ctx, l, cx, 1400 + i * 60, `500 46px ${theme.body}`, C.muted, 'center'),
      );
    }
  }

  if (spec.kind === 'words') {
    const words = spec.words.slice(0, 8);
    const step = Math.min(150, 1250 / Math.max(1, words.length));
    words.forEach((w, i) => {
      const y = 520 + i * step + 90;
      text(ctx, w.word, 90, y, fit(ctx, w.word, theme.display, 700, 110, 640), COLOR[w.who]);
      text(ctx, w.count, STORY_W - 90, y, `500 56px ${theme.body}`, C.muted, 'right');
      ctx.fillStyle = C.line;
      ctx.fillRect(90, y + 28, 900, 2);
    });
  }
  return canvas;
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('png'))), 'image/png'),
  );
}

/** Baixa um arquivo gerado no navegador. */
export function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
