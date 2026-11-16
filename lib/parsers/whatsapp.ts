import type { Kind, ParsedChat } from '../model';

/** Texto de mídia omitida (minúsculo, sem < >) → tipo da mensagem. */
export const MEDIA_PLACEHOLDERS: Record<string, Kind> = {
  // pt
  'mídia oculta': 'image', // TODO(Luiz): o Android pt não diz o tipo; decidir o padrão
  'imagem ocultada': 'image',
  'vídeo ocultado': 'video',
  'áudio ocultado': 'audio',
  'figurinha omitida': 'sticker',
  'gif omitido': 'gif',
  'documento omitido': 'document',
  'mensagem apagada': 'deleted',
  // en
  'media omitted': 'image',
  'image omitted': 'image',
  'video omitted': 'video',
  'audio omitted': 'audio',
  'sticker omitted': 'sticker',
  'gif omitted': 'gif',
  'document omitted': 'document',
  'this message was deleted': 'deleted',
};

export interface WhatsAppOptions {
  /** Ordem da data; se faltar, usa guessDateOrder. */
  dateOrder?: 'DMY' | 'MDY';
}

/**
 * Lê o texto exportado do WhatsApp (Android ou iOS).
 * TODO(Luiz): 1) regex do cabeçalho; 2) juntar linhas sem cabeçalho; 3) MEDIA_PLACEHOLDERS.
 */
export function parseWhatsApp(text: string, opts?: WhatsAppOptions): ParsedChat {
  void text;
  void opts;
  return { source: 'whatsapp', authors: [], messages: [], warnings: [] };
}

/**
 * Descobre se a data é DD/MM ou MM/DD pela distribuição dos números.
 * Recebe os textos das datas (ex.: "15/11/2026"). Se um valor passa de 12, ele é o dia.
 * TODO(Luiz): implementar.
 */
export function guessDateOrder(lines: string[]): 'DMY' | 'MDY' {
  void lines;
  throw new Error('TODO');
}
