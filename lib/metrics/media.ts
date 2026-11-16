import type { Conversation } from '../model';
import type { PerPerson } from './types';

// Mídia: áudio x texto, fotos, vídeos, links.
// Links têm tipo próprio: somam em `links`, não em `texts`.
// TODO(Luiz): implementar. Hoje devolve valores vazios.

export interface PersonMedia {
  audios: number;
  images: number;
  videos: number;
  links: number;
  texts: number;
}

export interface MediaMetrics {
  perPerson: PerPerson<PersonMedia>;
}

const empty: PersonMedia = { audios: 0, images: 0, videos: 0, links: 0, texts: 0 };

export function computeMedia(conv: Conversation): MediaMetrics {
  void conv;
  return { perPerson: { A: empty, B: empty } };
}
