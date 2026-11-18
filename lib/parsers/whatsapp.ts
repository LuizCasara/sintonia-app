import type { Kind, ParsedChat, RawMessage } from '../model';

/** Texto de mídia omitida (minúsculo, sem < > e sem ponto final) → tipo da mensagem. */
export const MEDIA_PLACEHOLDERS: Record<string, Kind> = {
  // pt
  'mídia oculta': 'image', // TODO(Luiz): o Android pt não diz o tipo; decidir o padrão
  'imagem ocultada': 'image',
  'imagem omitida': 'image',
  'vídeo ocultado': 'video',
  'vídeo omitido': 'video',
  'áudio ocultado': 'audio',
  'áudio omitido': 'audio',
  'figurinha omitida': 'sticker',
  'gif omitido': 'gif',
  'documento omitido': 'document',
  'cartão do contato omitido': 'document',
  'mensagem apagada': 'deleted',
  'esta mensagem foi apagada': 'deleted',
  'você apagou esta mensagem': 'deleted',
  // en
  'media omitted': 'image',
  'image omitted': 'image',
  'video omitted': 'video',
  'audio omitted': 'audio',
  'sticker omitted': 'sticker',
  'gif omitted': 'gif',
  'document omitted': 'document',
  'contact card omitted': 'document',
  'this message was deleted': 'deleted',
  'you deleted this message': 'deleted',
};

export interface WhatsAppOptions {
  /** Ordem da data; se faltar, usa guessDateOrder. */
  dateOrder?: 'DMY' | 'MDY';
}

/** Avisos que o parser pode devolver em `warnings`. */
export const WA_WARNINGS = {
  /** Nenhum número passou de 12: a ordem saiu da heurística de qual número muda mais. */
  dateOrderGuessed: 'whatsapp:date-order-guessed',
  /** Nem a heurística decidiu (ex.: um dia só); usamos DD/MM. */
  dateOrderDefault: 'whatsapp:date-order-default',
  noMessages: 'whatsapp:no-messages',
} as const;

// Marcas invisíveis de direção que o WhatsApp põe no começo de linhas e mídias.
const INVISIBLE = /[‎‏‪-‮⁦-⁩﻿]/g;
// Separador opcional antes de AM/PM: espaço, espaço fino (iOS 17+) ou espaço não quebrável.
const AMPM = String.raw`(?:[\s  ]?([AaPp])\.?\s?[Mm]\.?)?`;
const STAMP = String.raw`(\d{1,2})\/(\d{1,2})\/(\d{2,4}),? (\d{1,2}):(\d{2})(?::(\d{2}))?${AMPM}`;
// Android: "15/11/2026 22:10 - Nome: texto" | iOS: "[15/11/2026, 22:10:05] Nome: texto"
const ANDROID_LINE = new RegExp(String.raw`^${STAMP} - ([\s\S]*)$`);
const IOS_LINE = new RegExp(String.raw`^\[${STAMP}\] ([\s\S]*)$`);

const URL = /\bhttps?:\/\/\S+|\bwww\.\S+\.\S+/i;
const EDITED = /\s*<(?:mensagem editada|this message was edited)>$/i;
// Exportado "com mídia": iOS "<anexado: 00000012-PHOTO-2026-11-15.jpg>", Android "IMG-...jpg (arquivo anexado)".
const IOS_ATTACHED = /^<(?:anexado|attached): (.+)>$/i;
const ANDROID_ATTACHED = /^(\S.*\.\w{2,5}) \((?:arquivo anexado|file attached)\)$/i;

interface Entry {
  a: number; // 1º número da data
  b: number; // 2º número da data
  y: number;
  h: number;
  mi: number;
  s: number;
  pm: string | undefined;
  ios: boolean;
  author: string | null; // null = mensagem de sistema (Android, sem "Nome: ")
  body: string;
}

/**
 * Lê o texto exportado do WhatsApp (Android ou iOS).
 * Linhas sem cabeçalho de data continuam a mensagem anterior.
 * `ts` guarda o relógio local do export como se fosse UTC (o mesmo que o gerador de fixtures faz):
 * 22:10 no celular vira 22:10 em `getUTCHours()`, sem depender do fuso de quem abre o app.
 */
export function parseWhatsApp(text: string, opts?: WhatsAppOptions): ParsedChat {
  const warnings: string[] = [];
  const entries: Entry[] = [];

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/^[‎‏﻿]+/, '');
    const ios = line.startsWith('[');
    const m = (ios ? IOS_LINE : ANDROID_LINE).exec(line);
    if (!m) {
      const last = entries[entries.length - 1];
      if (last) last.body += '\n' + rawLine;
      continue;
    }
    const rest = m[8] ?? '';
    const sep = rest.indexOf(': ');
    // Android sem "Nome: " é aviso do sistema. No iOS, todo cabeçalho tem nome.
    const hasAuthor = sep > 0 && sep <= 80;
    entries.push({
      a: Number(m[1]),
      b: Number(m[2]),
      y: Number(m[3]),
      h: Number(m[4]),
      mi: Number(m[5]),
      s: Number(m[6] ?? 0),
      pm: m[7],
      ios,
      author: hasAuthor ? rest.slice(0, sep).replace(INVISIBLE, '').trim() : null,
      body: hasAuthor ? rest.slice(sep + 2) : rest,
    });
  }

  if (entries.length === 0) {
    return { source: 'whatsapp', authors: [], messages: [], warnings: [WA_WARNINGS.noMessages] };
  }

  let order = opts?.dateOrder;
  if (!order) {
    const guess = detectDateOrder(entries);
    if (guess.by === 'heuristic') warnings.push(WA_WARNINGS.dateOrderGuessed);
    if (guess.by === 'default') warnings.push(WA_WARNINGS.dateOrderDefault);
    order = guess.order;
  }

  const counts = new Map<string, number>();
  const messages: RawMessage[] = entries.map((e) => {
    const [day, month] = order === 'DMY' ? [e.a, e.b] : [e.b, e.a];
    const year = e.y < 100 ? 2000 + e.y : e.y;
    let hour = e.h;
    if (e.pm) hour = (hour % 12) + (e.pm.toLowerCase() === 'p' ? 12 : 0);
    const ts = Date.UTC(year, month - 1, day, hour, e.mi, e.s);

    const { kind, text: body } = classify(e.body, e.ios);
    if (e.author === null || kind === 'system') {
      return { ts, source: 'whatsapp', kind: 'system', authorName: '' };
    }
    counts.set(e.author, (counts.get(e.author) ?? 0) + 1);
    const msg: RawMessage = { ts, source: 'whatsapp', kind, authorName: e.author };
    if (body !== undefined) msg.text = body;
    return msg;
  });

  return { source: 'whatsapp', authors: byCount(counts), messages, warnings };
}

/** Decide o tipo a partir do corpo da mensagem. */
function classify(raw: string, ios: boolean): { kind: Kind; text?: string } {
  // No iOS, avisos do sistema e mídias começam com a marca invisível U+200E.
  const marked = raw.startsWith('‎');
  const body = raw.replace(INVISIBLE, '').replace(EDITED, '').trim();
  const key = body
    .replace(/^<(.*)>$/, '$1')
    .replace(/\.$/, '')
    .toLowerCase();

  const media = MEDIA_PLACEHOLDERS[key];
  if (media) return { kind: media };
  const attached = IOS_ATTACHED.exec(body) ?? ANDROID_ATTACHED.exec(body);
  if (attached) return { kind: kindFromFileName(attached[1] ?? '') };
  if (ios && marked) return { kind: 'system' };
  if (URL.test(body)) return { kind: 'link', text: body };
  return { kind: 'text', text: body };
}

/** Tipo pelo nome do arquivo anexado (padrões do WhatsApp: IMG-, VID-, PTT-, STK-...). */
function kindFromFileName(name: string): Kind {
  const n = name.toUpperCase();
  if (/PTT|AUDIO|AUD-|\.(OPUS|M4A|MP3|OGG|AAC)$/.test(n)) return 'audio';
  if (/STICKER|STK-|\.WEBP$/.test(n)) return 'sticker';
  if (/GIF/.test(n)) return 'gif';
  if (/VIDEO|VID-|\.(MP4|MOV|3GP)$/.test(n)) return 'video';
  if (/PHOTO|IMG-|\.(JPE?G|PNG|HEIC)$/.test(n)) return 'image';
  return 'document';
}

function byCount(counts: Map<string, number>): string[] {
  return [...counts.entries()].sort((x, y) => y[1] - x[1]).map(([name]) => name);
}

type Guess = { order: 'DMY' | 'MDY'; by: 'value' | 'heuristic' | 'default' };

/**
 * Ordem da data a partir dos dois primeiros números de cada cabeçalho.
 * 1) Um valor acima de 12 só pode ser o dia.
 * 2) Se nenhum passa de 12: o dia muda mais vezes que o mês entre mensagens seguidas.
 * 3) Empate (ex.: um dia só): DD/MM.
 */
function detectDateOrder(pairs: { a: number; b: number }[]): Guess {
  let firstChanges = 0;
  let secondChanges = 0;
  let prev: { a: number; b: number } | undefined;
  for (const p of pairs) {
    if (p.a > 12) return { order: 'DMY', by: 'value' };
    if (p.b > 12) return { order: 'MDY', by: 'value' };
    if (prev) {
      if (p.a !== prev.a) firstChanges++;
      if (p.b !== prev.b) secondChanges++;
    }
    prev = p;
  }
  if (firstChanges > secondChanges) return { order: 'DMY', by: 'heuristic' };
  if (secondChanges > firstChanges) return { order: 'MDY', by: 'heuristic' };
  return { order: 'DMY', by: 'default' };
}

/**
 * Descobre se a data é DD/MM ou MM/DD pela distribuição dos números.
 * Recebe os textos das datas (ex.: "15/11/2026"). Se um valor passa de 12, ele é o dia.
 * Sem valor acima de 12, usa o número que muda mais (o dia); empate vira DD/MM.
 */
export function guessDateOrder(lines: string[]): 'DMY' | 'MDY' {
  const pairs = lines.flatMap((l) => {
    const m = /(\d{1,2})\/(\d{1,2})\//.exec(l);
    return m ? [{ a: Number(m[1]), b: Number(m[2]) }] : [];
  });
  return detectDateOrder(pairs).order;
}
