import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

// Carrega as mensagens do idioma da rota (sem middleware, tudo estático).
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = routing.locales.find((l) => l === requested) ?? routing.defaultLocale;
  return { locale, messages: (await import(`../messages/${locale}.json`)).default };
});
