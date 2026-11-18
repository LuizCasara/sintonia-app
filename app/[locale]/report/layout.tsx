import type { ReactNode } from 'react';
import { ReportShell } from '@/components/shell/ReportShell';

export default function ReportLayout({ children }: { children: ReactNode }) {
  return <ReportShell>{children}</ReportShell>;
}
