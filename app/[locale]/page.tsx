import { getTranslations, setRequestLocale } from 'next-intl/server';

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('home');
  return (
    <main>
      <h1>{t('title')}</h1>
      {/* TODO: a rodada 2 faz esta tela */}
    </main>
  );
}
