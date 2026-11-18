import type { Kind, ParsedChat, RawMessage } from '../model';

// Tipos mínimos do result.json do Telegram Desktop (só o que usamos).
export type TelegramTextPart = string | { type: string; text: string; href?: string };
export type TelegramText = string | TelegramTextPart[];

export interface TelegramMessage {
  id: number;
  type: 'message' | 'service';
  date: string; // "2026-11-15T22:10:05", relógio local de quem exportou
  from?: string | null;
  from_id?: string;
  text: TelegramText;
  photo?: string;
  file?: string;
  media_type?:
    'voice_message' | 'video_message' | 'video_file' | 'sticker' | 'animation' | 'audio_file';
  duration_seconds?: number;
  poll?: unknown;
  location_information?: unknown;
  contact_information?: unknown;
}

export interface TelegramExport {
  name?: string;
  type?: string;
  messages: TelegramMessage[];
}

export const TG_WARNINGS = {
  noMessages: 'telegram:no-messages',
  badDate: 'telegram:bad-date',
} as const;

const URL = /\bhttps?:\/\/\S+|\bwww\.\S+\.\S+/i;
const DATE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/;

const MEDIA_KIND: Record<NonNullable<TelegramMessage['media_type']>, Kind> = {
  voice_message: 'audio',
  video_message: 'video', // vídeo redondo
  video_file: 'video',
  sticker: 'sticker',
  animation: 'gif',
  audio_file: 'document', // arquivo de música, não é áudio gravado
};

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

/** Junta o texto (string ou lista de partes) e diz se alguma parte é link. */
function flatten(text: unknown): { text: string; hasLink: boolean } {
  if (typeof text === 'string') return { text, hasLink: false };
  if (!Array.isArray(text)) return { text: '', hasLink: false };
  let out = '';
  let hasLink = false;
  for (const part of text as unknown[]) {
    if (typeof part === 'string') out += part;
    else if (isObj(part)) {
      out += typeof part.text === 'string' ? part.text : '';
      if (part.type === 'link' || part.type === 'text_link') hasLink = true;
    }
  }
  return { text: out, hasLink };
}

/**
 * Converte o result.json já lido (JSON.parse) em ParsedChat.
 * `ts` guarda o relógio local do export como se fosse UTC (igual ao parser do WhatsApp).
 */
export function parseTelegram(json: unknown): ParsedChat {
  const warnings: string[] = [];
  if (!isObj(json) || !Array.isArray(json.messages)) {
    return { source: 'telegram', authors: [], messages: [], warnings: [TG_WARNINGS.noMessages] };
  }

  const counts = new Map<string, number>();
  const messages: RawMessage[] = [];
  for (const item of json.messages as unknown[]) {
    if (!isObj(item)) continue;
    const m = item as unknown as TelegramMessage;
    const d = DATE.exec(typeof m.date === 'string' ? m.date : '');
    if (!d) {
      if (!warnings.includes(TG_WARNINGS.badDate)) warnings.push(TG_WARNINGS.badDate);
      continue;
    }
    const ts = Date.UTC(+d[1]!, +d[2]! - 1, +d[3]!, +d[4]!, +d[5]!, +d[6]!);

    if (m.type === 'service') {
      messages.push({ ts, source: 'telegram', kind: 'system', authorName: '' });
      continue;
    }

    const { text, hasLink } = flatten(m.text);
    let kind: Kind;
    if (m.photo) kind = 'image';
    else if (m.media_type && m.media_type in MEDIA_KIND) kind = MEDIA_KIND[m.media_type];
    else if (m.file || m.poll || m.location_information || m.contact_information) kind = 'document';
    else if (hasLink || URL.test(text)) kind = 'link';
    else kind = 'text';

    const authorName = typeof m.from === 'string' ? m.from : '';
    const msg: RawMessage = { ts, source: 'telegram', kind, authorName };
    if (text) msg.text = text;
    if (kind === 'audio' && typeof m.duration_seconds === 'number') {
      msg.durationSec = m.duration_seconds;
    }
    messages.push(msg);
    if (authorName) counts.set(authorName, (counts.get(authorName) ?? 0) + 1);
  }

  const authors = [...counts.entries()].sort((x, y) => y[1] - x[1]).map(([name]) => name);
  if (messages.length === 0) warnings.push(TG_WARNINGS.noMessages);
  return { source: 'telegram', authors, messages, warnings };
}
