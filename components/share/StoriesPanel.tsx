'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { StoryViewer } from './StoryViewer';
import { useReport } from '@/components/report/ReportProvider';
import { bookProgress, HARRY_POTTER_WORDS } from '@/lib/books';
import { fmtNum, fmtScore } from '@/lib/format';
import { sharedDictionary, wordOwner } from '@/lib/share';
import { daysBetween, formatSpan, spanBetween } from '@/lib/span';
import { canvasToBlob, download, renderStory, themeFromPage, type StorySpec } from '@/lib/stories';

interface Card {
  id: string;
  label: string;
  url: string;
  blob: Blob;
}

/** Cards 9:16 para stories: gerados aqui no navegador, só com números. */
export function StoriesPanel() {
  const t = useTranslations('actions.stories');
  const td = useTranslations('dashboard');
  const locale = useLocale();
  const { report: r, hiddenWords } = useReport();
  const [useNames, setUseNames] = useState(true);
  const [cards, setCards] = useState<Card[]>([]);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [viewing, setViewing] = useState<number | null>(null);
  const run = useRef(0); // só o último lote gerado vale (evita um lote antigo sobrescrever o novo)

  const n = (v: number) => fmtNum(locale, v);
  const first = (full: string) => full.split(' ')[0] ?? full;
  const nameA = useNames ? first(r.people.A) : t('personA');
  const nameB = useNames ? first(r.people.B) : t('personB');

  function specs(): { id: string; label: string; spec: StorySpec }[] {
    const vol = r.volume.perPerson;
    const total = vol.A.messages + vol.B.messages;
    const years = Math.max(1, Math.round(r.period.days / 365));
    const shareA = Math.round((vol.A.messages / Math.max(1, total)) * 100);
    const out: { id: string; label: string; spec: StorySpec }[] = [];

    out.push({
      id: 'messages',
      label: t('cards.messages'),
      spec: {
        kind: 'big',
        kicker: t('kickers.messages'),
        value: n(total),
        caption: t('messagesIn', { years }),
        series: { a: r.volume.perMonth.map((m) => m.A), b: r.volume.perMonth.map((m) => m.B) },
      },
    });
    out.push({
      id: 'split',
      label: t('cards.split'),
      spec: {
        kind: 'split',
        kicker: t('split'),
        a: { name: nameA, pct: shareA },
        b: { name: nameB, pct: 100 - shareA },
      },
    });

    const effortA = r.balance.items.reduce((sum, i) => sum + i.weight * i.shareA, 0);
    const balanceHint =
      r.balance.leaning === null
        ? td('balance.even')
        : td('balance.leans', {
            name: r.balance.leaning === 'A' ? nameA : nameB,
            pct: Math.round((r.balance.leaning === 'A' ? effortA : 1 - effortA) * 100),
          });
    out.push({
      id: 'scores',
      label: t('cards.scores'),
      spec: {
        kind: 'scores',
        kicker: t('kickers.scores'),
        items: [
          {
            label: td('cards.sintonia'),
            value: r.sintonia.score === null ? '—' : fmtScore(locale, r.sintonia.score),
            outOf: td('score.outOf'),
            hint: r.sintonia.score === null ? td('sintonia.short') : td('sintonia.tagline'),
          },
          {
            label: td('cards.balance'),
            value: r.balance.score === null ? '—' : fmtScore(locale, r.balance.score),
            outOf: td('score.outOf'),
            hint: balanceHint,
          },
        ],
      },
    });

    const book = bookProgress(vol.A.words + vol.B.words);
    const whole = book.times >= 1;
    out.push({
      id: 'books',
      label: t('cards.books'),
      spec: {
        kind: 'segments',
        kicker: t('kickers.books'),
        value: whole
          ? `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(book.times)}×`
          : String(book.full),
        caption: whole ? td('book.wholeSeries') : td('book.ofSeries'),
        segments: HARRY_POTTER_WORDS.map((_, i) =>
          whole || i < book.full ? 1 : i === book.current.index ? book.current.fraction : 0,
        ),
        note: t('wordsNote', { words: n(vol.A.words + vol.B.words) }),
      },
    });

    const together =
      formatSpan(spanBetween(r.period.start, r.period.end), locale, (unit, count) =>
        td(`time.span.${unit}`, { n: count }),
      ) || td('time.span.days', { n: r.period.days });
    out.push({
      id: 'time',
      label: t('cards.time'),
      spec: {
        kind: 'big',
        kicker: t('kickers.time'),
        value: together,
        caption: td('time.activeOf', {
          active: n(r.activity.activeDays),
          total: n(r.period.start ? daysBetween(r.period.start, r.period.end) + 1 : 0),
        }),
      },
    });

    const dict = sharedDictionary(r, hiddenWords);
    if (dict && dict.topWords.length > 0) {
      out.push({
        id: 'words',
        label: t('cards.words'),
        spec: {
          kind: 'words',
          kicker: td('cards.words'),
          words: dict.topWords.map((word) => {
            const u = dict.usage[word];
            return { word, count: u ? `${n(u.A + u.B)}×` : '', who: wordOwner(u) };
          }),
        },
      });
    }
    return out;
  }

  async function generate() {
    const mine = ++run.current;
    await document.fonts.ready;
    setBusy(true);
    setFailed(false);
    try {
      const theme = themeFromPage(t('footer'));
      const made: Card[] = [];
      for (const { id, label, spec } of specs()) {
        const blob = await canvasToBlob(renderStory(spec, theme));
        made.push({ id, label, blob, url: URL.createObjectURL(blob) });
      }
      if (mine !== run.current) {
        made.forEach((c) => URL.revokeObjectURL(c.url));
        return;
      }
      setCards(made);
      setViewing(null);
    } catch {
      if (mine === run.current) setFailed(true);
    } finally {
      if (mine === run.current) setBusy(false);
    }
  }

  // Trocar os nomes, o idioma ou as palavras escondidas refaz os cards que já estão na tela.
  useEffect(() => {
    // Efeito legítimo: refaz as imagens (trabalho assíncrono) quando uma entrada muda.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (cards.length > 0) void generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useNames, hiddenWords, locale]);
  // Libera as imagens ao sair da tela ou ao trocar de lote.
  useEffect(() => () => cards.forEach((c) => URL.revokeObjectURL(c.url)), [cards]);

  async function downloadAll() {
    for (const c of cards) {
      download(c.blob, `sintonia-${c.id}.png`);
      await new Promise((resolve) => setTimeout(resolve, 350));
    }
  }

  return (
    <section className="panel space-y-3 p-5 md:col-span-2" data-testid="stories-panel">
      <h2 className="font-display text-lg font-semibold">{t('title')}</h2>
      <p className="text-sm text-muted">{t('body')}</p>
      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
        <input
          type="checkbox"
          checked={useNames}
          onChange={(e) => setUseNames(e.target.checked)}
          className="size-5 shrink-0 accent-[var(--color-sync)]"
        />
        {t('useNames')}
      </label>
      <div className="flex flex-wrap gap-3">
        <button type="button" className="btn btn-primary" onClick={generate} disabled={busy}>
          {cards.length > 0 ? t('regenerate') : t('button')}
        </button>
        {cards.length > 0 && (
          <button type="button" className="btn btn-ghost" onClick={downloadAll}>
            {t('downloadAll')}
          </button>
        )}
      </div>
      {failed && (
        <p role="alert" className="text-sm text-danger">
          {t('error')}
        </p>
      )}
      {cards.length > 0 && (
        <ul className="flex gap-4 overflow-x-auto pb-2" aria-label={t('title')}>
          {cards.map((c, i) => (
            <li key={c.id} className="flex shrink-0 flex-col gap-2">
              <button
                type="button"
                aria-label={`${t('zoom')}: ${c.label}`}
                onClick={() => setViewing(i)}
                className="cursor-zoom-in rounded-xl focus-visible:outline-2"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={c.url}
                  alt={c.label}
                  className="aspect-[9/16] w-36 rounded-xl border border-line object-cover"
                />
              </button>
              <button
                type="button"
                className="btn btn-ghost !min-h-9 text-xs"
                onClick={() => download(c.blob, `sintonia-${c.id}.png`)}
              >
                {t('download')} · {c.label}
              </button>
            </li>
          ))}
        </ul>
      )}
      {viewing !== null && cards[viewing] && (
        <StoryViewer cards={cards} start={viewing} onClose={() => setViewing(null)} />
      )}
    </section>
  );
}
