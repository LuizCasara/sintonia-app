import type { ParsedChat } from '../model';

// Tipos mínimos do result.json do Telegram Desktop (só o que usamos).
export type TelegramText = string | (string | { type: string; text: string })[];

export interface TelegramMessage {
  id: number;
  type: 'message' | 'service';
  date: string; // "2026-11-15T22:10:05"
  from?: string;
  text: TelegramText;
  photo?: string;
  media_type?:
    'voice_message' | 'video_message' | 'video_file' | 'sticker' | 'animation' | 'audio_file';
  duration_seconds?: number;
}

export interface TelegramExport {
  name?: string;
  type?: string;
  messages: TelegramMessage[];
}

/**
 * Converte o result.json já lido (JSON.parse) em ParsedChat.
 * TODO(Luiz): text pode ser string ou array; media_type/photo definem o kind.
 */
export function parseTelegram(json: unknown): ParsedChat {
  void json;
  return { source: 'telegram', authors: [], messages: [], warnings: [] };
}
