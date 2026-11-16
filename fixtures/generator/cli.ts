// Gera as fixtures fictícias: pnpm fixtures
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { generateConversation } from './generate';
import { toTelegramJson, toWhatsAppAndroid, toWhatsAppIos } from './serialize';

const root = join(import.meta.dirname, '..');
const people: [string, string] = ['Ana Lima', 'Bruno Reis'];
const base = {
  seed: 42,
  start: new Date('2026-01-05T00:00:00Z'),
  end: new Date('2026-03-01T00:00:00Z'),
  people,
};

const pt = generateConversation(base);
const en = generateConversation({ ...base, lang: 'en' });

mkdirSync(join(root, 'whatsapp'), { recursive: true });
mkdirSync(join(root, 'telegram'), { recursive: true });
writeFileSync(join(root, 'whatsapp/android-pt.txt'), toWhatsAppAndroid(pt, 'pt'));
writeFileSync(join(root, 'whatsapp/android-en.txt'), toWhatsAppAndroid(en, 'en'));
writeFileSync(join(root, 'whatsapp/ios-pt.txt'), toWhatsAppIos(pt, 'pt'));
writeFileSync(join(root, 'telegram/result.json'), toTelegramJson(pt));

console.log(`Fixtures geradas: ${pt.messages.length} mensagens (todos os apps).`);
