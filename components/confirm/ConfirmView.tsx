'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useReport } from '@/components/report/ReportProvider';
import { Link, useRouter } from '@/i18n/navigation';
import { mappingKey, nameSimilarity, type PersonMapping } from '@/lib/merge';
import { MAX_NAME } from '@/lib/rename';
import type { Source } from '@/lib/model';

type Choice = 'A' | 'B' | 'ignore';
interface Detected {
  key: string;
  app: Source;
  name: string;
  count: number;
}

function AppBadge({ app }: { app: Source }) {
  return (
    <span
      aria-label={app === 'whatsapp' ? 'WhatsApp' : 'Telegram'}
      className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-line bg-void text-xs font-bold text-muted"
    >
      {app === 'whatsapp' ? 'WA' : 'TG'}
    </span>
  );
}

/** Tela "Confirmar": cada nome achado nos exports vai para a Pessoa A, a Pessoa B ou é ignorado. */
export function ConfirmView() {
  const t = useTranslations('confirm');
  const router = useRouter();
  const { inspection, setMapping, setNames } = useReport();

  const detected: Detected[] = (inspection?.people ?? []).flatMap((p) =>
    p.names.map((n) => ({
      key: mappingKey(n.source, n.name),
      app: n.source,
      name: n.name,
      count: n.messageCount,
    })),
  );
  // Começa com a sugestão do Worker; o que o usuário muda fica aqui.
  const [overrides, setOverrides] = useState<Record<string, Choice>>({});
  // Nome que aparece no relatório: começa com o nome mais usado do grupo e a pessoa pode trocar.
  const [typed, setTyped] = useState<{ A?: string; B?: string }>({});
  const choiceOf = (key: string): Choice => overrides[key] ?? inspection?.mapping[key] ?? 'ignore';

  if (!inspection) {
    return (
      <main className="mx-auto max-w-3xl space-y-6 px-4 pb-16 pt-4 sm:px-6">
        <h1 className="font-display text-3xl font-bold sm:text-4xl">{t('title')}</h1>
        <p className="text-muted">{t('empty')}</p>
        <Link href="/" className="btn btn-primary inline-flex">
          {t('backHome')}
        </Link>
      </main>
    );
  }

  const inGroup = (c: Choice) => detected.filter((d) => choiceOf(d.key) === c);
  const groups = [
    { id: 'A' as const, label: t('personA'), color: 'text-a', rows: inGroup('A') },
    { id: 'B' as const, label: t('personB'), color: 'text-b', rows: inGroup('B') },
  ];
  const ignored = inGroup('ignore');
  const ready = groups.every((g) => g.rows.length > 0);
  const defaultName = (id: 'A' | 'B') =>
    [...inGroup(id)].sort((x, y) => y.count - x.count)[0]?.name ?? '';
  const nameOf = (id: 'A' | 'B') => typed[id] ?? defaultName(id);

  function analyze() {
    const mapping: PersonMapping = {};
    for (const d of detected) {
      const c = choiceOf(d.key);
      if (c !== 'ignore') mapping[d.key] = c;
    }
    setMapping(mapping);
    setNames({ A: nameOf('A'), B: nameOf('B') });
    router.push('/processing');
  }

  function renderRow(d: Detected, base?: Detected) {
    return (
      <li key={d.key} className="flex flex-wrap items-center gap-3 py-2">
        <AppBadge app={d.app} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{d.name}</p>
          <p className="text-sm text-muted">
            {t('messages', { count: d.count })}
            {base &&
              base.app !== d.app &&
              ` · ${t('similarity', { pct: Math.round(nameSimilarity(base.name, d.name) * 100) })}`}
          </p>
        </div>
        <select
          aria-label={t('assignLabel', { name: d.name })}
          value={choiceOf(d.key)}
          onChange={(e) => setOverrides({ ...overrides, [d.key]: e.target.value as Choice })}
          className="min-h-11 rounded-lg border border-line bg-void px-3 text-sm"
        >
          <option value="A">{t('personA')}</option>
          <option value="B">{t('personB')}</option>
          <option value="ignore">{t('ignore')}</option>
        </select>
      </li>
    );
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 pb-16 pt-4 sm:px-6">
      <h1 className="font-display text-3xl font-bold sm:text-4xl">{t('title')}</h1>
      <p className="text-muted">{t('why')}</p>

      <div className="space-y-4">
        {groups.map((g) => (
          <section key={g.id} className="panel p-5">
            <h2 className={`font-display text-lg font-semibold ${g.color}`}>{g.label}</h2>
            <label className="mt-3 block text-sm">
              <span className="text-muted">{t('nameLabel')}</span>
              <input
                type="text"
                value={nameOf(g.id)}
                maxLength={MAX_NAME}
                onChange={(e) => setTyped({ ...typed, [g.id]: e.target.value })}
                data-testid={`display-name-${g.id}`}
                className="mt-1 block min-h-11 w-full rounded-lg border border-line bg-void px-3 text-base"
              />
              <span className="mt-1 block text-xs text-muted">{t('nameHint')}</span>
            </label>
            {g.rows.length === 0 ? (
              <p className="mt-2 text-sm text-danger">{t('needOne', { person: g.label })}</p>
            ) : (
              <ul className="mt-2 divide-y divide-line">
                {g.rows.map((d) => renderRow(d, g.rows[0]))}
              </ul>
            )}
          </section>
        ))}

        {ignored.length > 0 && (
          <section className="panel p-5">
            <h2 className="font-display text-lg font-semibold">{t('others')}</h2>
            <ul className="mt-2 divide-y divide-line">{ignored.map((d) => renderRow(d))}</ul>
          </section>
        )}
      </div>

      <button type="button" className="btn btn-primary" disabled={!ready} onClick={analyze}>
        {t('analyze')}
      </button>
    </main>
  );
}
