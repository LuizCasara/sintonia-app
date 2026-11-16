import { setRequestLocale } from 'next-intl/server';
import { TimelineView } from '@/components/timeline/TimelineView';

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <TimelineView />;
}
