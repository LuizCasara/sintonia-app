import './globals.css';
import type { ReactNode } from 'react';

// Layout raiz mínimo; <html> e <body> ficam em app/[locale]/layout.tsx.
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
