import * as Comlink from 'comlink';
import type { AnalyzeApi } from '../workers/analyze.worker';

/** Cria o worker e devolve a API (chamar só no navegador). Use `terminate()` ao terminar. */
export function createAnalyzer() {
  const worker = new Worker(new URL('../workers/analyze.worker.ts', import.meta.url), {
    type: 'module',
  });
  const api = Comlink.wrap<AnalyzeApi>(worker);
  return { api, terminate: () => worker.terminate() };
}

// Dica: para passar o callback de progresso ao worker, use Comlink.proxy(fn):
//   await api.analyze(files, Comlink.proxy((step, fraction) => ...));
