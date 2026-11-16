// Tipos comuns do app (spec §5).

export type Source = 'whatsapp' | 'telegram';
export type Kind =
  | 'text'
  | 'image'
  | 'video'
  | 'audio'
  | 'sticker'
  | 'gif'
  | 'document'
  | 'link'
  | 'system'
  | 'deleted';

/** Uma "conversa" (sessão) começa depois de 6 h sem mensagem. */
export const SESSION_GAP_MS = 6 * 60 * 60 * 1000;

/** Mensagem depois do merge. */
export interface Message {
  ts: number; // epoch ms, já no fuso local
  source: Source;
  authorId: 'A' | 'B' | 'other'; // 'other' = terceiros/sistema
  kind: Kind;
  text?: string; // fica só na memória do navegador
  durationSec?: number; // áudio, quando o export trouxer
}

/** Mensagem como sai do parser (ainda com o nome do autor, antes do merge). */
export interface RawMessage extends Omit<Message, 'authorId'> {
  authorName: string;
}

export interface Person {
  id: 'A' | 'B';
  displayName: string;
  aliases: { source: Source; name: string }[];
}

export interface Conversation {
  people: [Person, Person];
  messages: Message[];
  sources: Source[];
}

/** Resultado de um parser (um arquivo). */
export interface ParsedChat {
  source: Source;
  authors: string[];
  messages: RawMessage[];
  warnings: string[];
}
