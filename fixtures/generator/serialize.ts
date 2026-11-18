import type { Conversation, Kind, Message } from '../../lib/model';

type Lang = 'pt' | 'en';

// Placeholders de mídia por idioma (o iOS diz o tipo; o Android não).
const ANDROID_MEDIA: Record<Lang, string> = { pt: '<Mídia oculta>', en: '<Media omitted>' };
const IOS_MEDIA: Record<Lang, Partial<Record<Kind, string>>> = {
  pt: {
    image: 'imagem ocultada',
    video: 'vídeo ocultado',
    audio: 'áudio ocultado',
    sticker: 'figurinha omitida',
    document: 'documento omitido',
  },
  en: {
    image: 'image omitted',
    video: 'video omitted',
    audio: 'audio omitted',
    sticker: 'sticker omitted',
    document: 'document omitted',
  },
};
const SYSTEM_TEXT: Record<Lang, string> = {
  pt: 'As mensagens e ligações são protegidas com a criptografia de ponta a ponta.',
  en: 'Messages and calls are end-to-end encrypted.',
};

const pad = (n: number) => String(n).padStart(2, '0');

// Horários "locais" = relógio UTC (o gerador não depende do fuso da máquina).
function parts(ts: number) {
  const d = new Date(ts);
  return {
    y: d.getUTCFullYear(),
    mo: pad(d.getUTCMonth() + 1),
    d: pad(d.getUTCDate()),
    h: d.getUTCHours(),
    mi: pad(d.getUTCMinutes()),
    s: pad(d.getUTCSeconds()),
  };
}

function nameOf(conv: Conversation, m: Message): string {
  if (m.authorId === 'other') return '';
  return (m.authorId === 'A' ? conv.people[0] : conv.people[1]).displayName;
}

/** Texto da mensagem; mídia vira o placeholder dado por `media(kind)`. */
function body(m: Message, media: (k: Kind) => string): string {
  return m.kind === 'text' || m.kind === 'link' ? (m.text ?? '') : media(m.kind);
}

/** Export do WhatsApp Android. pt: `15/11/2026 22:10 - Nome: texto`; en: `11/15/26, 10:10 PM - Nome: text`. */
export function toWhatsAppAndroid(conv: Conversation, lang: Lang): string {
  const lines = conv.messages
    .filter((m) => m.source === 'whatsapp')
    .map((m) => {
      const p = parts(m.ts);
      const stamp =
        lang === 'pt'
          ? `${p.d}/${p.mo}/${p.y} ${pad(p.h)}:${p.mi}`
          : `${Number(p.mo)}/${Number(p.d)}/${pad(p.y % 100)}, ${p.h % 12 || 12}:${p.mi} ${p.h < 12 ? 'AM' : 'PM'}`;
      if (m.kind === 'system') return `${stamp} - ${SYSTEM_TEXT[lang]}`;
      return `${stamp} - ${nameOf(conv, m)}: ${body(m, () => ANDROID_MEDIA[lang])}`;
    });
  return lines.join('\n') + '\n';
}

/** Export do WhatsApp iOS: `[15/11/2026, 22:10:05] Nome: texto`. */
export function toWhatsAppIos(conv: Conversation, lang: Lang = 'pt'): string {
  const lines = conv.messages
    .filter((m) => m.source === 'whatsapp' && m.kind !== 'system')
    .map((m) => {
      const p = parts(m.ts);
      const stamp = `[${p.d}/${p.mo}/${p.y}, ${pad(p.h)}:${p.mi}:${p.s}]`;
      return `${stamp} ${nameOf(conv, m)}: ${body(m, (k) => IOS_MEDIA[lang][k] ?? '')}`;
    });
  return lines.join('\n') + '\n';
}

/** result.json do Telegram Desktop (só as mensagens do app 'telegram'). */
export function toTelegramJson(conv: Conversation): string {
  const msgs = conv.messages
    .filter((m) => m.source === 'telegram')
    .map((m, i) => {
      const p = parts(m.ts);
      const out: Record<string, unknown> = {
        id: i + 1,
        type: 'message',
        date: `${p.y}-${p.mo}-${p.d}T${pad(p.h)}:${p.mi}:${p.s}`,
        from: nameOf(conv, m),
        from_id: `user${m.authorId === 'A' ? 1 : 2}`,
        // kind 'link' (e texto com URL) vira array de entidades, como no export real.
        text:
          m.kind === 'link' || (m.kind === 'text' && m.text?.includes('https://'))
            ? (m.text ?? '')
                .split(/(https:\/\/\S+)/)
                .filter(Boolean)
                .map((t) => (t.startsWith('https://') ? { type: 'link', text: t } : t))
            : (m.text ?? ''),
      };
      if (m.kind === 'image') out.photo = `photos/photo_${i + 1}.jpg`;
      if (m.kind === 'audio') {
        out.media_type = 'voice_message';
        out.duration_seconds = m.durationSec ?? 5;
      }
      if (m.kind === 'video') out.media_type = 'video_file';
      if (m.kind === 'sticker') out.media_type = 'sticker';
      if (m.kind === 'document') out.file = `files/doc_${i + 1}.pdf`;
      return out;
    });
  const chat = { name: conv.people[1].displayName, type: 'personal_chat', id: 1, messages: msgs };
  return JSON.stringify(chat, null, 1) + '\n';
}
