// Mede parser + métricas na fixture de 150 mil mensagens. Fora do pnpm test: pnpm bench
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { computeReport } from '../lib/metrics';
import type { Conversation } from '../lib/model';
import { parseTelegram } from '../lib/parsers/telegram';
import { parseWhatsApp } from '../lib/parsers/whatsapp';

const root = join(import.meta.dirname, '..');
const benchDir = join(root, 'fixtures', 'bench');
const TARGET_MS = 5_000;

function readGzip(name: string): Buffer {
  return gunzipSync(readFileSync(join(benchDir, name)));
}

function timeMs(fn: () => void): number {
  const t0 = performance.now();
  fn();
  return performance.now() - t0;
}

function isStubParse(label: string, gotMessages: number, sourceBytes: number): boolean {
  // Parser ainda é stub se o arquivo tem conteúdo e quase não sai mensagem.
  return sourceBytes > 100 && gotMessages === 0;
}

try {
  readFileSync(join(benchDir, 'conversation.json.gz'));
} catch {
  console.error('Fixture ausente. Rode primeiro: pnpm bench:generate');
  process.exit(1);
}

const convBuf = readGzip('conversation.json.gz');
const waBuf = readGzip('whatsapp-android-pt.txt.gz');
const tgBuf = readGzip('telegram.json.gz');

let conv: Conversation | undefined;
const loadMs = timeMs(() => {
  conv = JSON.parse(convBuf.toString('utf8')) as Conversation;
});
if (!conv) throw new Error('falha ao ler a conversa');

const waText = waBuf.toString('utf8');
const tgJson = JSON.parse(tgBuf.toString('utf8')) as unknown;

let waMessages = 0;
const parseWaMs = timeMs(() => {
  waMessages = parseWhatsApp(waText).messages.length;
});
const waStub = isStubParse('whatsapp', waMessages, waBuf.length);

let tgMessages = 0;
const parseTgMs = timeMs(() => {
  tgMessages = parseTelegram(tgJson).messages.length;
});
const tgStub = isStubParse('telegram', tgMessages, tgBuf.length);

let reportMessages = 0;
const metricsMs = timeMs(() => {
  const report = computeReport(conv as Conversation);
  reportMessages = report.volume.perPerson.A.messages + report.volume.perPerson.B.messages;
});
// computeReport ainda é stub (volume zero). Medimos mesmo assim; a fixture é a mesma quando a métrica existir.
const metricsStub = reportMessages === 0;

const parseMetricsMs = parseWaMs + parseTgMs + metricsMs;
const stubs = [
  waStub ? 'parseWhatsApp' : null,
  tgStub ? 'parseTelegram' : null,
  metricsStub ? 'computeReport' : null,
].filter(Boolean);

const result = {
  ranAt: new Date().toISOString(),
  messages: conv.messages.length,
  timingsMs: {
    loadConversation: round(loadMs),
    parseWhatsApp: round(parseWaMs),
    parseTelegram: round(parseTgMs),
    computeReport: round(metricsMs),
    parseAndMetrics: round(parseMetricsMs),
  },
  stubs,
  targetMs: TARGET_MS,
  // Só avaliamos a meta de 5 s quando parser e métricas existirem.
  targetApplied: stubs.length === 0,
  underTarget: stubs.length === 0 ? parseMetricsMs < TARGET_MS : null,
};

writeFileSync(join(benchDir, 'last-run.json'), JSON.stringify(result, null, 2) + '\n');

console.log(`Mensagens na fixture: ${conv.messages.length}`);
console.log(`  load conversation: ${result.timingsMs.loadConversation} ms`);
console.log(
  `  parseWhatsApp:     ${result.timingsMs.parseWhatsApp} ms` +
    (waStub ? '  (stub: ainda não lê o export)' : `  (${waMessages} msgs)`),
);
console.log(
  `  parseTelegram:     ${result.timingsMs.parseTelegram} ms` +
    (tgStub ? '  (stub: ainda não lê o export)' : `  (${tgMessages} msgs)`),
);
console.log(
  `  computeReport:     ${result.timingsMs.computeReport} ms` +
    (metricsStub ? '  (stub: métricas ainda vazias)' : ''),
);
console.log(`  parser + métricas: ${result.timingsMs.parseAndMetrics} ms`);
if (stubs.length > 0) {
  console.log(`Meta de ${TARGET_MS} ms: ainda não vale. Falta implementar: ${stubs.join(', ')}.`);
  console.log('TODO: quando parser e métricas existirem, falhar se parser+métricas >= 5000 ms.');
} else if (parseMetricsMs >= TARGET_MS) {
  console.error(`Meta falhou: ${round(parseMetricsMs)} ms (limite ${TARGET_MS} ms).`);
  process.exit(2);
} else {
  console.log(`Meta de ${TARGET_MS} ms: ok.`);
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}
