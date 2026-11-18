import { setRequestLocale } from 'next-intl/server';
import { ConfirmView } from '@/components/confirm/ConfirmView';

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ConfirmView />;
}
