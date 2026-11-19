import * as Comlink from 'comlink';
import type { AnalyzeApi } from '../workers/analyze.worker';
import type { PersonMapping } from './merge';
import type { Report } from './metrics';
import type { InputFile, Inspection, OnProgress } from './pipeline';

/** Cria o worker e devolve a API (chamar só no navegador). Use `terminate()` ao terminar. */
export function createAnalyzer() {
  const worker = new Worker(new URL('../workers/analyze.worker.ts', import.meta.url), {
    type: 'module',
  });
  const api = Comlink.wrap<AnalyzeApi>(worker);
  return { api, terminate: () => worker.terminate() };
}

/** Lê os arquivos e os entrega ao worker sem copiar (os buffers são transferidos). */
async function toInput(files: File[]): Promise<{ input: InputFile[]; transfer: ArrayBuffer[] }> {
  const input = await Promise.all(
    files.map(async (f) => ({ name: f.name, data: await f.arrayBuffer() })),
  );
  return { input, transfer: input.map((f) => f.data) };
}

/** Inspeciona os arquivos num worker novo e o encerra ao terminar. */
export async function inspectFiles(files: File[]): Promise<Inspection> {
  const { api, terminate } = createAnalyzer();
  try {
    const { input, transfer } = await toInput(files);
    return await api.inspect(Comlink.transfer(input, transfer));
  } finally {
    terminate();
  }
}

/**
 * Roda a análise num worker novo. Devolve o relatório e uma função `cancel`
 * (chame no cleanup do efeito: encerra o worker e a promise nunca resolve).
 */
export function analyzeFiles(files: File[], mapping: PersonMapping, onProgress: OnProgress) {
  const { api, terminate } = createAnalyzer();
  const result: Promise<Report> = toInput(files)
    .then(({ input, transfer }) =>
      api.analyze(Comlink.transfer(input, transfer), mapping, Comlink.proxy(onProgress)),
    )
    .finally(terminate);
  return { result, cancel: terminate };
}
