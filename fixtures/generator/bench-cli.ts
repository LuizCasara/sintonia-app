// Gera a fixture de benchmark (150 mil mensagens fictícias) uma vez: pnpm bench:generate
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { BENCH_COUNT, BENCH_PEOPLE, BENCH_SEED, generateBenchConversation } from './generate';
import { toTelegramJson, toWhatsAppAndroid } from './serialize';

const outDir = join(import.meta.dirname, '..', 'bench');

function writeGzip(name: string, data: string | Buffer): { bytes: number; gzipBytes: number } {
  const buf = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8');
  const gz = gzipSync(buf, { level: 9 });
  writeFileSync(join(outDir, name), gz);
  return { bytes: buf.length, gzipBytes: gz.length };
}

function sha256(buf: Buffer): string {
  return createHash('sha256').update(buf).digest('hex');
}

const conv = generateBenchConversation();
if (conv.messages.length !== BENCH_COUNT) {
  throw new Error(`esperava ${BENCH_COUNT} mensagens, vieram ${conv.messages.length}`);
}

mkdirSync(outDir, { recursive: true });

const conversationJson = JSON.stringify(conv);
const wa = toWhatsAppAndroid(conv, 'pt');
const tg = toTelegramJson(conv);

const files = {
  'conversation.json.gz': writeGzip('conversation.json.gz', conversationJson),
  'whatsapp-android-pt.txt.gz': writeGzip('whatsapp-android-pt.txt.gz', wa),
  'telegram.json.gz': writeGzip('telegram.json.gz', tg),
};

const tooBig = Object.entries(files).filter(([, s]) => s.gzipBytes > 50 * 1024 * 1024);
if (tooBig.length > 0) {
  console.error(
    'Fixture maior que 50 MB gzip. Não commitar. Arquivos:',
    tooBig.map(([n, s]) => `${n}=${s.gzipBytes}`).join(', '),
  );
}

const start = conv.messages[0]?.ts ?? 0;
const end = conv.messages[conv.messages.length - 1]?.ts ?? 0;
const meta = {
  seed: BENCH_SEED,
  count: BENCH_COUNT,
  people: BENCH_PEOPLE,
  startIso: new Date(start).toISOString(),
  endIso: new Date(end).toISOString(),
  sha256: {
    conversation: sha256(Buffer.from(conversationJson, 'utf8')),
    whatsapp: sha256(Buffer.from(wa, 'utf8')),
    telegram: sha256(Buffer.from(tg, 'utf8')),
  },
  sizes: files,
  note: 'Dados fictícios. Regenerar com pnpm bench:generate (mesma seed, mesma saída). Se um gzip passar de 50 MB, não commitar e documentar neste meta.json.',
};

writeFileSync(join(outDir, 'meta.json'), JSON.stringify(meta, null, 2) + '\n');
console.log(`Fixture de benchmark: ${BENCH_COUNT} mensagens.`);
for (const [name, s] of Object.entries(files)) {
  console.log(
    `  ${name}: ${(s.bytes / 1e6).toFixed(2)} MB crú, ${(s.gzipBytes / 1e6).toFixed(2)} MB gzip`,
  );
}
