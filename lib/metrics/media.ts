import type { Conversation } from '../model';
import type { PerPerson } from './types';
import { perPerson, talk } from './util';

// Mídia: áudio x texto, fotos, vídeos, links.
// Links têm tipo próprio: somam em `links`, não em `texts`.
// Figurinhas, gifs, documentos e mensagens apagadas não entram em nenhuma coluna.

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

export function computeMedia(conv: Conversation): MediaMetrics {
  const per = perPerson<PersonMedia>(() => ({
    audios: 0,
    images: 0,
    videos: 0,
    links: 0,
    texts: 0,
  }));
  for (const m of talk(conv)) {
    const p = per[m.authorId];
    if (m.kind === 'audio') p.audios++;
    else if (m.kind === 'image') p.images++;
    else if (m.kind === 'video') p.videos++;
    else if (m.kind === 'link') p.links++;
    else if (m.kind === 'text') p.texts++;
  }
  return { perPerson: per };
}
