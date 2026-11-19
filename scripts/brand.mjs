// Gera a identidade visual: ícone (SVG + PNG + ICO) e imagens OpenGraph (pt/en).
// Uso: node scripts/brand.mjs   (precisa de Chrome; PW_CHROME_PATH sobrescreve o caminho)
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

const C = {
  void: '#06060c',
  a: '#22e5ff',
  b: '#ff3dbd',
  sync: '#b18cff',
  ink: '#e8e8f4',
  muted: '#8a8aa6',
};

/** Duas senoides que começam defasadas (A ciano, B magenta) e entram em fase (violeta). */
function waves({ w, h, amp, cycles, step = 2 }) {
  const mk = (sign) => {
    const pts = [];
    for (let x = 0; x <= w; x += step) {
      const t = x / w;
      const delta = Math.PI * (1 - t) ** 1.4; // defasagem some até o fim
      const y = h / 2 + amp * Math.sin(2 * Math.PI * cycles * t + sign * delta * 0.5);
      pts.push(`${pts.length ? 'L' : 'M'}${x} ${y.toFixed(1)}`);
    }
    return pts.join(' ');
  };
  return { a: mk(1), b: mk(-1), s: mk(0) };
}

const stroke = (d, color, sw, extra = '') =>
  `<path d="${d}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" ${extra}/>`;

function iconSvg() {
  const s = 64;
  const w = 44;
  const { a, b, s: sync } = waves({ w, h: 64, amp: 13, cycles: 1 });
  const g = 'transform="translate(10 0)"';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${s} ${s}">
<defs><clipPath id="r"><rect x="${w * 0.74}" y="0" width="${w}" height="${s}"/></clipPath></defs>
<rect width="${s}" height="${s}" rx="14" fill="${C.void}"/>
<g ${g}>${stroke(a, C.a, 3.6)}${stroke(b, C.b, 3.6)}<g clip-path="url(#r)">${stroke(sync, C.sync, 4)}</g></g>
</svg>
`;
}

function ogHtml(lang) {
  const t =
    lang === 'pt'
      ? {
          tag: 'Veja o quanto vocês estão em sintonia',
          sub: 'A história, os ritmos e os números da conversa de vocês dois.',
          foot: '100% no seu navegador · nenhuma mensagem sai do seu aparelho',
        }
      : {
          tag: 'See how in sync you two are',
          sub: 'The story, the rhythms and the numbers of your chat together.',
          foot: '100% in your browser · no message ever leaves your device',
        };
  const { a, b, s: sy } = waves({ w: 1200, h: 200, amp: 52, cycles: 3.2, step: 4 });
  const glow = (c) => `filter:drop-shadow(0 0 10px ${c}99)`;
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500&family=Space+Grotesk:wght@700&display=swap" rel="stylesheet">
<style>
*{margin:0;box-sizing:border-box}
body{width:1200px;height:630px;overflow:hidden;color:${C.ink};font-family:Inter,'Segoe UI',system-ui,sans-serif;
background:radial-gradient(900px 420px at 50% -8%,${C.sync}30,transparent),${C.void};position:relative}
.wave{position:absolute;left:0;top:118px}
.wm{position:absolute;left:80px;top:56px;font:700 40px 'Space Grotesk','Segoe UI',sans-serif;letter-spacing:-.01em}
h1{position:absolute;left:80px;right:80px;top:352px;font:700 64px/1.05 'Space Grotesk','Segoe UI',sans-serif;letter-spacing:-.02em}
.sub{position:absolute;left:80px;right:80px;top:508px;font-size:26px;color:${C.muted}}
.foot{position:absolute;left:80px;bottom:36px;font-size:20px;color:${C.muted}}
.dot{display:inline-block;width:10px;height:10px;border-radius:50%;background:${C.ok ?? '#a3ff5c'};margin-right:10px}
</style></head><body>
<div class="wm">Sintonia</div>
<svg class="wave" width="1200" height="200" viewBox="0 0 1200 200">
<g style="${glow(C.a)}">${stroke(a, C.a, 5)}</g>
<g style="${glow(C.b)}">${stroke(b, C.b, 5)}</g>
<g style="${glow(C.sync)}" clip-path="inset(0 0 0 86%)">${stroke(sy, C.sync, 6)}</g>
</svg>
<h1>${t.tag}</h1><div class="sub">${t.sub}</div>
<div class="foot"><span class="dot"></span>${t.foot}</div>
</body></html>`;
}

function ico(pngs) {
  // ICO com PNGs embutidos: [{size, buf}]
  const head = Buffer.alloc(6);
  head.writeUInt16LE(1, 2);
  head.writeUInt16LE(pngs.length, 4);
  let offset = 6 + 16 * pngs.length;
  const dir = pngs.map(({ size, buf }) => {
    const e = Buffer.alloc(16);
    e[0] = size;
    e[1] = size;
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(buf.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += buf.length;
    return e;
  });
  return Buffer.concat([head, ...dir, ...pngs.map((p) => p.buf)]);
}

mkdirSync('public/og', { recursive: true });
const svg = iconSvg();
writeFileSync('app/icon.svg', svg);

const browser = await chromium.launch({
  executablePath:
    process.env.PW_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
});
const shot = async (html, size, opts = {}) => {
  const page = await browser.newPage({ viewport: size });
  await page.setContent(html, { waitUntil: 'networkidle' }).catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  const buf = await page.screenshot({ type: 'png', ...opts });
  await page.close();
  return buf;
};

const iconHtml = (px) =>
  `<body style="margin:0;background:transparent">${svg.replace('<svg ', `<svg width="${px}" height="${px}" `)}</body>`;
const png = (px) => shot(iconHtml(px), { width: px, height: px }, { omitBackground: true });

writeFileSync('app/apple-icon.png', await png(180));
writeFileSync(
  'app/favicon.ico',
  ico(await Promise.all([16, 32, 48].map(async (size) => ({ size, buf: await png(size) })))),
);
for (const lang of ['pt', 'en']) {
  writeFileSync(`public/og/og-${lang}.png`, await shot(ogHtml(lang), { width: 1200, height: 630 }));
}
await browser.close();
console.log('ok');
