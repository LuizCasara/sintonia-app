import { SyncWave } from '@/components/fx/SyncWave';
import { Link } from '@/i18n/navigation';
import { LocaleSwitcher } from './LocaleSwitcher';

/** Topo comum: logo (wordmark + SyncWave mini) e seletor PT/EN. */
export function Header() {
  return (
    <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
      <Link href="/" className="flex min-h-11 items-center gap-2">
        <span className="font-display text-xl font-bold tracking-tight">Sintonia</span>
        <SyncWave className="h-5 w-12" amp={30} />
      </Link>
      <LocaleSwitcher />
    </header>
  );
}
