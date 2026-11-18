export type Format = 'whatsapp-android' | 'whatsapp-ios' | 'telegram-json' | 'unknown';

// Android pt: "15/11/2026 22:10 - Nome: texto"
// Android en: "11/15/26, 10:10 PM - Nome: texto"
const ANDROID = /^‎?\d{1,2}\/\d{1,2}\/\d{2,4},? \d{1,2}:\d{2}(?::\d{2})?(?:\s?[AP]M)? - /im;
// iOS: "[15/11/2026, 22:10:05] Nome: texto"
const IOS = /^‎?\[\d{1,2}\/\d{1,2}\/\d{2,4},? \d{1,2}:\d{2}(?::\d{2})?(?:\s?[AP]M)?\] /im;

/** Descobre o formato do arquivo olhando o nome e o começo do conteúdo. */
export function detectFormat(fileName: string, head: string): Format {
  const text = head.replace(/^﻿/, '');
  if (fileName.toLowerCase().endsWith('.json') || text.trimStart().startsWith('{')) {
    return text.includes('"messages"') ? 'telegram-json' : 'unknown';
  }
  if (IOS.test(text)) return 'whatsapp-ios';
  if (ANDROID.test(text)) return 'whatsapp-android';
  return 'unknown';
}
