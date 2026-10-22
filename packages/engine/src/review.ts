import { catalog, recommend, type RecommendInput } from './recommend.ts';
import type { CatalogEntry, Ranked } from './types.ts';

export type Verdict = 'good' | 'ok' | 'poor' | 'avoid' | 'unknown';

export interface Review {
  chart: string;
  verdict: Verdict;
  score?: number;
  rank?: number;
  summary: string;
  problems: { text: string; fix?: string; suggest?: string }[];
  /** Charts that fit this data clearly better. */
  better: Pick<Ranked, 'id' | 'name' | 'score'>[];
}

const CLOSE_TO_TOP = 10;
const POOR_BELOW = 40;
const CLEARLY_BETTER = 5;

/** "Is this chart a good choice for this data?" The question an agent asks before rendering. */
export function review(chart: string, input: RecommendInput, charts: CatalogEntry[] = catalog): Review {
  const rec = recommend(input, charts);
  const top = (n: number, above = -1) =>
    rec.ranked
      .filter((r) => r.id !== chart && r.score > above)
      .slice(0, n)
      .map(({ id, name, score }) => ({ id, name, score }));

  const avoided = rec.avoid.find((a) => a.id === chart);
  if (avoided) {
    return {
      chart,
      verdict: 'avoid',
      summary: `${avoided.name} doesn't suit this data.`,
      problems: avoided.reasons,
      better: top(3),
    };
  }

  const i = rec.ranked.findIndex((r) => r.id === chart);
  if (i < 0) {
    return {
      chart,
      verdict: 'unknown',
      summary: `Whichart has no rules for "${chart}" yet.`,
      problems: [],
      better: top(3),
    };
  }

  const r = rec.ranked[i];
  const best = rec.ranked[0];
  const verdict: Verdict = r.score >= best.score - CLOSE_TO_TOP ? 'good' : r.score < POOR_BELOW ? 'poor' : 'ok';
  const summary =
    verdict === 'good'
      ? `${r.name} is ${i === 0 ? 'the best' : 'a strong'} fit for this data.`
      : verdict === 'ok'
        ? `${r.name} works, but ${best.name} fits better.`
        : `${r.name} is a weak fit; ${best.name} fits much better.`;
  return { chart, verdict, score: r.score, rank: i + 1, summary, problems: r.warnings, better: top(3, r.score + CLEARLY_BETTER) };
}
