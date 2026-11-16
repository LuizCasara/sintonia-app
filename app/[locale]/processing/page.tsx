import { setRequestLocale } from 'next-intl/server';
import { ProcessingView } from '@/components/processing/ProcessingView';

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ProcessingView />;
}
