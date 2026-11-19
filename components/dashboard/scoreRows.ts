import { useLocale, useTranslations } from 'next-intl';
import { fmtDuration, fmtPct, fmtScore } from '@/lib/format';
import type { Report } from '@/lib/metrics';
import type { ScoreRow } from './ScorePanel';

const pct = (v: number) => Math.round(v * 100);

/** As linhas de detalhe de Sintonia e Equilíbrio (usadas no painel e no PDF). */
export function useScoreRows(r: Report, nameA: string, nameB: string) {
  const t = useTranslations('dashboard');
  const locale = useLocale();
  const { sintonia, balance } = r;

  const sintoniaRows: ScoreRow[] = sintonia.parts.map((p) => ({
    id: p.id,
    label: t(`sintonia.parts.${p.id}`),
    detail:
      p.id === 'responseTime'
        ? t('sintonia.detail.responseTime', { time: fmtDuration(p.value) })
        : t(`sintonia.detail.${p.id}`, { pct: fmtPct(p.value) }),
    weight: t('score.weight', { pct: pct(p.weight) }),
    score: p.score,
    scoreText: fmtScore(locale, p.score * 10),
  }));
  const balanceRows: ScoreRow[] = balance.items.map((i) => ({
    id: i.id,
    label: t(`balance.items.${i.id}`),
    detail: `${nameA} ${pct(i.shareA)}% · ${nameB} ${pct(1 - i.shareA)}%`,
    weight: t('score.weight', { pct: pct(i.weight) }),
    score: i.score,
    scoreText: fmtScore(locale, i.score * 10),
  }));
  // Parte do esforço de quem puxa mais (média ponderada dos itens).
  const effortA = balance.items.reduce((sum, i) => sum + i.weight * i.shareA, 0);
  const balanceHint =
    balance.leaning === null
      ? t('balance.even')
      : t('balance.leans', {
          name: balance.leaning === 'A' ? nameA : nameB,
          pct: pct(balance.leaning === 'A' ? effortA : 1 - effortA),
        });
  return { sintoniaRows, balanceRows, balanceHint };
}
