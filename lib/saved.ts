import type { Report } from './metrics';

// Sessões salvas NESTE navegador (só quando a pessoa pede). O que vai para o IndexedDB é o
// relatório, que tem só números e datas (nunca o texto das mensagens), mais as palavras escondidas.
// Um cookie com um uuid identifica o navegador e fica por mais de um ano.
// Nada sai do dispositivo.

export const SAVED_VERSION = 1;
const DB_NAME = 'sintonia';
const STORE = 'sessions';
export const COOKIE_NAME = 'sintonia_id';
const COOKIE_MAX_AGE = 400 * 24 * 60 * 60; // o teto que o Chrome aceita

export interface SavedSummary {
  id: string;
  savedAt: number;
  people: { A: string; B: string };
  messages: number;
  start: string;
  end: string;
}

export interface SavedSession extends SavedSummary {
  version: number;
  owner: string;
  report: Report;
  hiddenWords: string[];
}

// ---------- cookie ----------

export function readCookie(name: string, cookie: string): string | null {
  for (const part of cookie.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const isUuid = (v: string | null): v is string => v !== null && UUID.test(v);

export function cookieString(id: string, secure: boolean): string {
  return `${COOKIE_NAME}=${id}; Max-Age=${COOKIE_MAX_AGE}; Path=/; SameSite=Lax${secure ? '; Secure' : ''}`;
}

/** O uuid deste navegador, se já existir (só ler nunca cria cookie). */
function readOwner(): string | null {
  const current = readCookie(COOKIE_NAME, document.cookie);
  return isUuid(current) ? current : null;
}

/** O uuid deste navegador: lê o cookie ou cria um e renova o prazo (só ao salvar). */
export function ownerId(): string {
  const id = readOwner() ?? crypto.randomUUID();
  document.cookie = cookieString(id, location.protocol === 'https:');
  return id;
}

// ---------- sessões ----------

export function summarize(report: Report): Omit<SavedSummary, 'id' | 'savedAt'> {
  return {
    people: { ...report.people },
    messages: report.volume.perPerson.A.messages + report.volume.perPerson.B.messages,
    start: report.period.start,
    end: report.period.end,
  };
}

const REQUIRED: (keyof Report)[] = [
  'period',
  'activity',
  'people',
  'volume',
  'balance',
  'sintonia',
  'sessions',
  'response',
  'language',
  'hours',
  'streaks',
  'media',
  'firsts',
  'phases',
  'apps',
];

/** Confere o formato: uma sessão de uma versão antiga do app não é aberta (faltariam campos). */
export function isUsable(value: unknown): value is SavedSession {
  if (typeof value !== 'object' || value === null) return false;
  const s = value as Partial<SavedSession>;
  if (s.version !== SAVED_VERSION || typeof s.id !== 'string' || !s.report) return false;
  const dictionary = s.report.dictionary;
  if (dictionary && !dictionary.usage) return false; // relatório de antes da contagem por pessoa
  return REQUIRED.every((key) => s.report![key] !== undefined) && Array.isArray(s.hiddenWords);
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const store = req.result.createObjectStore(STORE, { keyPath: 'id' });
      store.createIndex('owner', 'owner');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('indexeddb'));
  });
}

function run<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const req = fn(tx.objectStore(STORE));
        tx.oncomplete = () => {
          db.close();
          resolve(req.result);
        };
        tx.onerror = tx.onabort = () => {
          db.close();
          reject(tx.error ?? new Error('indexeddb'));
        };
      }),
  );
}

async function all(): Promise<SavedSession[]> {
  const owner = readOwner();
  if (!owner) return [];
  const rows = await run('readonly', (s) => s.index('owner').getAll(owner));
  return rows.filter(isUsable);
}

/** Salva (ou atualiza) a sessão. A mesma conversa, com o mesmo período e total, reaproveita o id. */
export async function saveSession(report: Report, hiddenWords: string[]): Promise<SavedSummary> {
  const owner = ownerId();
  const info = summarize(report);
  const same = (await all()).find(
    (s) => s.start === info.start && s.end === info.end && s.messages === info.messages,
  );
  const session: SavedSession = {
    ...info,
    id: same?.id ?? crypto.randomUUID(),
    savedAt: Date.now(),
    version: SAVED_VERSION,
    owner,
    report,
    hiddenWords,
  };
  await run('readwrite', (s) => s.put(session));
  return toSummary(session);
}

const toSummary = ({ id, savedAt, people, messages, start, end }: SavedSession): SavedSummary => ({
  id,
  savedAt,
  people,
  messages,
  start,
  end,
});

/** Sessões deste navegador, da mais recente para a mais antiga. */
export async function listSessions(): Promise<SavedSummary[]> {
  return (await all()).sort((a, b) => b.savedAt - a.savedAt).map(toSummary);
}

export async function getSession(id: string): Promise<SavedSession | null> {
  const row = await run('readonly', (s) => s.get(id));
  return isUsable(row) && row.owner === readOwner() ? row : null;
}

export async function deleteSession(id: string): Promise<void> {
  const row = await run('readonly', (s) => s.get(id));
  if (row && (row as SavedSession).owner === readOwner())
    await run('readwrite', (s) => s.delete(id));
}

/** Remove todas as sessões deste navegador e o cookie do uuid. */
export async function clearSessions(): Promise<void> {
  for (const s of await all()) await run('readwrite', (st) => st.delete(s.id));
  document.cookie = `${COOKIE_NAME}=; Max-Age=0; Path=/; SameSite=Lax`;
}
