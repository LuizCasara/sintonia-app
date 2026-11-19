import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Inter, Space_Grotesk } from 'next/font/google';
import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { ReportProvider } from '@/components/report/ReportProvider';
import { Header } from '@/components/shell/Header';
import { routing } from '@/i18n/routing';

const space = Space_Grotesk({ subsets: ['latin'], variable: '--font-space', display: 'swap' });
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

// Endereço público do site (necessário para o link absoluto da imagem de compartilhamento).
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export const viewport: Viewport = { themeColor: '#06060c', colorScheme: 'dark' };

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });
  const image = { url: `/og/og-${locale}.png`, width: 1200, height: 630, alt: t('ogAlt') };
  return {
    metadataBase: new URL(SITE_URL),
    title: t('title'),
    description: t('description'),
    applicationName: 'Sintonia',
    alternates: {
      canonical: `/${locale}/`,
      languages: Object.fromEntries(routing.locales.map((l) => [l, `/${l}/`])),
    },
    openGraph: {
      type: 'website',
      siteName: 'Sintonia',
      title: t('title'),
      description: t('description'),
      locale: locale === 'pt' ? 'pt_BR' : 'en_US',
      images: [image],
    },
    twitter: {
      card: 'summary_large_image',
      title: t('title'),
      description: t('description'),
      images: [image],
    },
  };
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale); // necessário para export estático
  return (
    <html lang={locale} className={`${space.variable} ${inter.variable}`}>
      <body className="min-h-dvh antialiased">
        <NextIntlClientProvider>
          <ReportProvider>
            <Header />
            {children}
          </ReportProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
