import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { Inter, Space_Grotesk } from 'next/font/google';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { ReportProvider } from '@/components/report/ReportProvider';
import { Header } from '@/components/shell/Header';
import { routing } from '@/i18n/routing';

const space = Space_Grotesk({ subsets: ['latin'], variable: '--font-space', display: 'swap' });
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

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
