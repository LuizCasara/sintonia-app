import type { Conversation, Kind, Message, Person } from '../../lib/model';
import { createRng } from './prng';

export interface GenerateOptions {
  seed: number;
  start: Date;
  end: Date;
  /** Nomes fictícios, ex.: ['Ana Lima', 'Bruno Reis']. */
  people: [string, string];
  /** Idioma dos textos gerados (padrão 'pt'). */
  lang?: 'pt' | 'en';
}

const TEXTS = {
  pt: [
    'oi, tudo bem?',
    'bom dia!',
    'boa noite, até amanhã',
    'chego em 10 minutos',
    'vamos jantar fora hoje?',
    'kkkkk essa foi boa',
    'viu o jogo ontem?',
    'preciso comprar pão',
    'me liga quando puder',
    'que saudade',
    'tá bom, combinado',
    'amanhã a gente se fala',
    'primeira linha\nsegunda linha da mesma mensagem',
  ],
  en: [
    'hi, how are you?',
    'good morning!',
    'good night, see you tomorrow',
    'I will be there in 10 minutes',
    'dinner out tonight?',
    'haha that was good',
    'did you see the game last night?',
    'I need to buy bread',
    'call me when you can',
    'I miss you',
    'ok, deal',
    'talk tomorrow',
    'first line\nsecond line of the same message',
  ],
};

const LINK_TEXTS = {
  pt: ['olha isso: https://exemplo.com/post/123', 'https://exemplo.com/video/456'],
  en: ['look at this: https://example.com/post/123', 'https://example.com/video/456'],
};

const DAY_MS = 24 * 60 * 60 * 1000;
// Horas em que as conversas costumam começar (repetir = mais chance).
const START_HOURS = [7, 8, 9, 12, 13, 18, 19, 20, 21, 21, 22, 22, 23, 0, 1];

/** Gera uma conversa fictícia. Mesma seed e mesmos parâmetros = mesma saída. */
export function generateConversation(opts: GenerateOptions): Conversation {
  const rng = createRng(opts.seed);
  const lang = opts.lang ?? 'pt';
  const texts = TEXTS[lang];
  const linkTexts = LINK_TEXTS[lang];
  const startMs = opts.start.getTime();
  const endMs = opts.end.getTime();
  // Os horários são "locais": usamos o relógio UTC como se fosse o fuso local.
  const telegramFrom = startMs + (endMs - startMs) * 0.6;

  const messages: Message[] = [];
  // Uma mensagem de sistema no começo, como o WhatsApp faz.
  messages.push({ ts: startMs, source: 'whatsapp', authorId: 'other', kind: 'system' });

  for (let day = startMs; day < endMs; day += DAY_MS) {
    if (!rng.chance(0.8)) continue;
    const sessions = rng.int(1, 2);
    for (let s = 0; s < sessions; s++) {
      let ts = day + rng.pick(START_HOURS) * 3600_000 + rng.int(0, 59) * 60_000;
      let author: 'A' | 'B' = rng.chance(0.5) ? 'A' : 'B';
      const count = rng.int(2, 9);
      for (let i = 0; i < count; i++) {
        if (rng.chance(0.7)) author = author === 'A' ? 'B' : 'A';
        ts += rng.int(5, 300) * 1000;
        const source = ts > telegramFrom && rng.chance(0.4) ? 'telegram' : 'whatsapp';
        const kind = pickKind(rng.next());
        const msg: Message = { ts, source, authorId: author, kind };
        if (kind === 'text') msg.text = rng.pick(texts);
        if (kind === 'link') msg.text = rng.pick(linkTexts);
        if (kind === 'audio') msg.durationSec = rng.int(3, 90);
        messages.push(msg);
      }
    }
  }
  messages.sort((a, b) => a.ts - b.ts);

  const [nameA, nameB] = opts.people;
  const person = (id: 'A' | 'B', name: string): Person => ({
    id,
    displayName: name,
    aliases: [
      { source: 'whatsapp', name },
      { source: 'telegram', name },
    ],
  });
  return {
    people: [person('A', nameA), person('B', nameB)],
    messages,
    sources: ['whatsapp', 'telegram'],
  };
}

/** Sorteia o tipo da mensagem: maioria texto, o resto mídia. */
function pickKind(r: number): Kind {
  if (r < 0.8) return 'text';
  if (r < 0.82) return 'link';
  if (r < 0.9) return 'image';
  if (r < 0.95) return 'audio';
  if (r < 0.97) return 'sticker';
  if (r < 0.99) return 'video';
  return 'document';
}

export const BENCH_SEED = 20261116;
export const BENCH_COUNT = 150_000;
export const BENCH_PEOPLE: [string, string] = ['Ana Lima', 'Bruno Reis'];
export const BENCH_START = new Date('2016-01-01T00:00:00Z');

export interface BenchGenerateOptions {
  seed?: number;
  count?: number;
  start?: Date;
  people?: [string, string];
  lang?: 'pt' | 'en';
}

/**
 * Conversa fictícia com um número exato de mensagens (para o benchmark de 150 mil).
 * Mais densa que o gerador normal, para caber em poucos anos. Seed fixa = mesma saída.
 */
export function generateBenchConversation(opts: BenchGenerateOptions = {}): Conversation {
  const seed = opts.seed ?? BENCH_SEED;
  const count = opts.count ?? BENCH_COUNT;
  const start = opts.start ?? BENCH_START;
  const people = opts.people ?? BENCH_PEOPLE;
  const lang = opts.lang ?? 'pt';
  if (count < 1) throw new Error('count precisa ser pelo menos 1');

  const rng = createRng(seed);
  const texts = TEXTS[lang];
  const linkTexts = LINK_TEXTS[lang];
  const startMs = start.getTime();
  const telegramFromIndex = Math.floor(count * 0.6);

  const messages: Message[] = [];
  messages.push({ ts: startMs, source: 'whatsapp', authorId: 'other', kind: 'system' });

  for (let day = startMs; messages.length < count; day += DAY_MS) {
    const sessions = rng.int(2, 4);
    for (let s = 0; s < sessions && messages.length < count; s++) {
      let ts = day + rng.pick(START_HOURS) * 3600_000 + rng.int(0, 59) * 60_000;
      let author: 'A' | 'B' = rng.chance(0.5) ? 'A' : 'B';
      const n = rng.int(8, 20);
      for (let i = 0; i < n && messages.length < count; i++) {
        if (rng.chance(0.7)) author = author === 'A' ? 'B' : 'A';
        ts += rng.int(5, 180) * 1000;
        const source =
          messages.length >= telegramFromIndex && rng.chance(0.4) ? 'telegram' : 'whatsapp';
        const kind = pickKind(rng.next());
        const msg: Message = { ts, source, authorId: author, kind };
        if (kind === 'text') msg.text = rng.pick(texts);
        if (kind === 'link') msg.text = rng.pick(linkTexts);
        if (kind === 'audio') msg.durationSec = rng.int(3, 90);
        messages.push(msg);
      }
    }
  }
  messages.sort((a, b) => a.ts - b.ts);

  const [nameA, nameB] = people;
  const person = (id: 'A' | 'B', name: string): Person => ({
    id,
    displayName: name,
    aliases: [
      { source: 'whatsapp', name },
      { source: 'telegram', name },
    ],
  });
  return {
    people: [person('A', nameA), person('B', nameB)],
    messages,
    sources: ['whatsapp', 'telegram'],
  };
}
