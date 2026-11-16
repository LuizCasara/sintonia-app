import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

// Link/useRouter/usePathname que já sabem o idioma da rota.
export const { Link, usePathname, useRouter } = createNavigation(routing);
