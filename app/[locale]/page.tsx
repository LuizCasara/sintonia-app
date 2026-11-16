import { setRequestLocale } from 'next-intl/server';
import { HomeView } from '@/components/home/HomeView';

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <HomeView />;
}
