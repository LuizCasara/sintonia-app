import * as Comlink from 'comlink';
import type { PersonMapping } from '../lib/merge';
import type { Report } from '../lib/metrics';
import {
  analyze,
  inspect,
  type InputFile,
  type Inspection,
  type OnProgress,
} from '../lib/pipeline';

export type { InputFile, Inspection, OnProgress };

const api = {
  /** Descobre os autores e sugere quem é quem. Não calcula métricas. */
  inspect(files: InputFile[]): Inspection {
    return inspect(files);
  },

  /**
   * Fluxo: arquivo → detect → parser → merge → metrics → Report (ver lib/pipeline.ts).
   * Em .zip ainda devolve o erro 'zip' (a leitura do .zip depende do fflate, depois).
   * Tudo roda aqui no navegador: este arquivo NUNCA faz requisição de rede.
   */
  analyze(files: InputFile[], mapping: PersonMapping, onProgress: OnProgress): Report {
    return analyze(files, mapping, onProgress);
  },
};

export type AnalyzeApi = typeof api;

Comlink.expose(api);
