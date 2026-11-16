import * as Comlink from 'comlink';
import type { Report } from '../lib/metrics';

export interface InputFile {
  name: string;
  data: ArrayBuffer;
}

/** Progresso real: etapa + fração de 0 a 1. */
export type OnProgress = (step: 'read' | 'parse' | 'merge' | 'metrics', fraction: number) => void;

const api = {
  /**
   * Fluxo: arquivo → detect → parser → merge → metrics → Report.
   * TODO(Luiz): ligar as etapas e chamar onProgress. Em .zip, ler o .txt de dentro (fflate, depois).
   * Tudo roda aqui no navegador: este arquivo NUNCA faz requisição de rede.
   */
  async analyze(files: InputFile[], onProgress: OnProgress): Promise<Report> {
    void files;
    onProgress('read', 0);
    throw new Error('TODO');
  },
};

export type AnalyzeApi = typeof api;

Comlink.expose(api);
