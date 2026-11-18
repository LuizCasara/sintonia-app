import type { Conversation, Message, ParsedChat, Person, Source } from './model';

export interface PersonSuggestion {
  /** Nome em cada app que parece ser a mesma pessoa. */
  names: { source: Source; name: string; messageCount: number }[];
  /** 0 a 1; quanto maior, mais parecido. */
  score: number;
}

/** Distância de edição entre duas strings (quantas trocas/inserções/remoções). */
export function levenshtein(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min((prev[j] ?? 0) + 1, (row[j - 1] ?? 0) + 1, (prev[j - 1] ?? 0) + cost);
    }
    prev = row;
  }
  return prev[b.length] ?? 0;
}

/** Minúsculas, sem acento, sem pontuação, espaços colapsados. */
export function normalizeName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** 0 a 1. Prefixo ("bruno" × "bruno reis") conta como parecido; senão, distância de edição. */
export function nameSimilarity(a: string, b: string): number {
  const [x, y] = [normalizeName(a), normalizeName(b)];
  if (!x || !y) return 0;
  if (x === y) return 1;
  const edit = 1 - levenshtein(x, y) / Math.max(x.length, y.length);
  const [short, long] = x.length <= y.length ? [x, y] : [y, x];
  const prefix = long.startsWith(short + ' ') || long.startsWith(short) ? 0.85 : 0;
  // "ana l." × "ana lima": o primeiro nome igual já é um bom sinal.
  const first = x.split(' ')[0] === y.split(' ')[0] ? 0.8 : 0;
  return Math.max(edit, prefix, first);
}

interface Candidate {
  source: Source;
  name: string;
  messageCount: number;
}

function candidates(chats: ParsedChat[]): Candidate[] {
  const out: Candidate[] = [];
  for (const chat of chats) {
    const counts = new Map<string, number>();
    for (const m of chat.messages) {
      if (m.kind === 'system' || !m.authorName) continue;
      counts.set(m.authorName, (counts.get(m.authorName) ?? 0) + 1);
    }
    for (const [name, messageCount] of counts) out.push({ source: chat.source, name, messageCount });
  }
  return out;
}

/**
 * Sugere quais nomes (entre apps) são a mesma pessoa.
 * Cada sugestão é um grupo de nomes (no máximo um por app) com a similaridade mínima do grupo.
 * Ordem: maior volume primeiro. Nomes sem par viram sugestões de um nome só (score 0).
 * Com um app só, cada autor é uma sugestão de um nome.
 */
export function suggestPeople(chats: ParsedChat[]): PersonSuggestion[] {
  const all = candidates(chats).sort((a, b) => b.messageCount - a.messageCount);
  const groups: PersonSuggestion[] = [];
  const used = new Set<Candidate>();

  // Âncora: os maiores autores do primeiro app que aparece; os outros apps se encaixam nela.
  const anchorSource = all[0]?.source;
  const anchors = all.filter((c) => c.source === anchorSource);
  for (const anchor of anchors) {
    used.add(anchor);
    const group: PersonSuggestion = { names: [anchor], score: 1 };
    for (const source of new Set(all.map((c) => c.source))) {
      if (source === anchorSource) continue;
      let best: { c: Candidate; s: number } | undefined;
      for (const c of all) {
        if (c.source !== source || used.has(c)) continue;
        const s = nameSimilarity(anchor.name, c.name);
        if (!best || s > best.s) best = { c, s };
      }
      // Só pareia se parecer mesmo; o resto cai em "outros nomes" (usuário decide na tela).
      if (best && best.s >= 0.5) {
        used.add(best.c);
        group.names.push(best.c);
        group.score = Math.min(group.score, best.s);
      }
    }
    if (group.names.length === 1) group.score = 0;
    groups.push(group);
  }
  for (const c of all) {
    if (!used.has(c)) groups.push({ names: [c], score: 0 });
  }
  return groups;
}

/** mapping: nome no app → 'A' | 'B'. Quem não está no mapa vira 'other'. */
export type PersonMapping = Record<string, 'A' | 'B'>;

/** Chave do mapping: o nome do export pode repetir entre apps, então usamos "app:nome". */
export const mappingKey = (source: Source, name: string) => `${source}:${name}`;

/**
 * Junta os chats numa Conversation só, ordenada por ts.
 * O mapping aceita a chave "app:nome" ou só "nome" (vale para todos os apps).
 * Mensagens de sistema e de quem não está no mapping viram authorId 'other'.
 */
export function mergeChats(chats: ParsedChat[], mapping: PersonMapping): Conversation {
  const messages: Message[] = [];
  const aliases: Record<'A' | 'B', Person['aliases']> = { A: [], B: [] };
  const volume: Record<'A' | 'B', Map<string, number>> = { A: new Map(), B: new Map() };

  for (const chat of chats) {
    const seen = new Set<string>();
    for (const m of chat.messages) {
      const { authorName, ...rest } = m;
      const who =
        m.kind === 'system'
          ? undefined
          : (mapping[mappingKey(chat.source, authorName)] ?? mapping[authorName]);
      if (who) {
        volume[who].set(authorName, (volume[who].get(authorName) ?? 0) + 1);
        if (!seen.has(authorName)) {
          seen.add(authorName);
          aliases[who].push({ source: chat.source, name: authorName });
        }
      }
      messages.push({ ...rest, authorId: who ?? 'other' });
    }
  }
  messages.sort((a, b) => a.ts - b.ts);

  // Nome de exibição: o nome mais usado de cada pessoa.
  const person = (id: 'A' | 'B'): Person => {
    const top = [...volume[id].entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    return { id, displayName: top ?? id, aliases: aliases[id] };
  };

  return {
    people: [person('A'), person('B')],
    messages,
    sources: [...new Set(chats.map((c) => c.source))],
  };
}
