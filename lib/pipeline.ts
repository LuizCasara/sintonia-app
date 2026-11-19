import { unzipSync } from 'fflate';
import {
  defaultMapping,
  mergeChats,
  suggestPeople,
  type PersonMapping,
  type PersonSuggestion,
} from './merge';
import { computeReport, type Report } from './metrics';
import type { ParsedChat, Source } from './model';
import { detectFormat } from './parsers/detect';
import { parseTelegram } from './parsers/telegram';
import { parseWhatsApp } from './parsers/whatsapp';

// Fluxo: arquivo → detect → parser → merge → metrics → Report.
// Lógica pura (sem Worker, sem rede): o worker só expõe estas funções.

export interface InputFile {
  name: string;
  data: ArrayBuffer;
}

/** Etapas do progresso, na ordem. */
export const STEPS = ['read', 'parse', 'merge', 'metrics'] as const;
export type Step = (typeof STEPS)[number];
/** Progresso real: etapa + fração de 0 a 1. */
export type OnProgress = (step: Step, fraction: number) => void;

/** O `message` do erro é o próprio código (é o que sobrevive à travessia do Worker). */
export type AnalyzeErrorCode = 'zip' | 'unknownFormat' | 'noMessages' | 'needTwoPeople';
export class AnalyzeError extends Error {
  constructor(public readonly code: AnalyzeErrorCode) {
    super(code);
  }
}
const CODES: AnalyzeErrorCode[] = ['zip', 'unknownFormat', 'noMessages', 'needTwoPeople'];
/** Lê o código de um erro que veio do Worker; desconhecido vira null. */
export function errorCode(err: unknown): AnalyzeErrorCode | null {
  const message = err instanceof Error ? err.message : '';
  return CODES.find((c) => c === message) ?? null;
}

/** O que a tela "Confirmar" precisa saber, sem nenhum texto de mensagem. */
export interface Inspection {
  sources: Source[];
  people: PersonSuggestion[];
  warnings: string[];
  /** Sugestão de quem é A e B (as duas pessoas com mais mensagens). */
  mapping: PersonMapping;
  /** false = um app só e exatamente 2 autores: dá para pular a tela Confirmar. */
  needsConfirm: boolean;
}

/** Teto de cada arquivo lido de dentro de um .zip (protege contra zip bomba). */
const MAX_ENTRY_BYTES = 400 * 1024 * 1024; // abaixo do maior texto que o navegador monta numa string
const MAX_ZIP_BYTES = 800 * 1024 * 1024; // soma de tudo que sai de um .zip
const CHAT_ENTRY = /\.(txt|json)$/i;

/** Troca cada .zip pelos .txt e .json de dentro dele (a mídia, se houver, fica de fora). */
export function expandZips(files: InputFile[]): InputFile[] {
  return files.flatMap((f): InputFile[] => {
    if (!/\.zip$/i.test(f.name)) return [f];
    let entries: Record<string, Uint8Array>;
    let budget = MAX_ZIP_BYTES;
    try {
      entries = unzipSync(new Uint8Array(f.data), {
        filter: (e) => {
          const ok =
            CHAT_ENTRY.test(e.name) &&
            !/(^|\/)(__MACOSX|\.)/.test(e.name) &&
            e.originalSize <= MAX_ENTRY_BYTES &&
            e.originalSize <= budget;
          if (ok) budget -= e.originalSize;
          return ok;
        },
      });
    } catch {
      throw new AnalyzeError('zip');
    }
    const found = Object.entries(entries).map(([name, bytes]) => ({
      name: name.split('/').pop() ?? name,
      data: bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength,
      ) as ArrayBuffer,
    }));
    if (found.length === 0) throw new AnalyzeError('zip');
    return found;
  });
}

/** Lê e interpreta os arquivos (.zip é aberto antes). */
export function parseInputs(input: InputFile[], onProgress?: OnProgress): ParsedChat[] {
  const files = expandZips(input);
  const decoder = new TextDecoder('utf-8');
  const texts = files.map((f, i) => {
    onProgress?.('read', i / files.length);
    try {
      return decoder.decode(f.data);
    } catch {
      throw new AnalyzeError('unknownFormat'); // grande demais para virar texto
    }
  });
  onProgress?.('read', 1);

  const chats = texts.map((text, i) => {
    onProgress?.('parse', i / files.length);
    const name = files[i]!.name;
    const format = detectFormat(name, text.slice(0, 4096));
    if (format === 'telegram-json') {
      let json: unknown;
      try {
        json = JSON.parse(text);
      } catch {
        throw new AnalyzeError('unknownFormat');
      }
      return parseTelegram(json);
    }
    if (format === 'whatsapp-android' || format === 'whatsapp-ios') return parseWhatsApp(text);
    throw new AnalyzeError('unknownFormat');
  });
  onProgress?.('parse', 1);
  return chats;
}

/** Descobre os autores e sugere quem é quem (usado antes de "Analisar"). */
export function inspect(files: InputFile[]): Inspection {
  const chats = parseInputs(files);
  const people = suggestPeople(chats);
  if (people.length < 2) {
    throw new AnalyzeError(
      chats.some((c) => c.messages.length > 0) ? 'needTwoPeople' : 'noMessages',
    );
  }
  const sources = [...new Set(chats.map((c) => c.source))];
  return {
    sources,
    people,
    warnings: [...new Set(chats.flatMap((c) => c.warnings))],
    mapping: defaultMapping(people),
    needsConfirm: sources.length > 1 || people.length !== 2,
  };
}

/** Roda o fluxo inteiro e devolve o relatório (só números; as mensagens não saem daqui). */
export function analyze(
  files: InputFile[],
  mapping: PersonMapping,
  onProgress: OnProgress = () => {},
): Report {
  const chats = parseInputs(files, onProgress);

  onProgress('merge', 0);
  const conv = mergeChats(chats, mapping);
  const has = { A: false, B: false };
  for (const m of conv.messages)
    if (m.authorId !== 'other' && m.kind !== 'system') has[m.authorId] = true;
  if (!has.A && !has.B) throw new AnalyzeError('noMessages');
  if (!has.A || !has.B) throw new AnalyzeError('needTwoPeople');
  onProgress('merge', 1);

  onProgress('metrics', 0);
  const report = computeReport(conv);
  onProgress('metrics', 1);
  return report;
}
