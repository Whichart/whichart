// Build-time search index: everything people might type for each page.
import { GOALS, charts, chartName, goalLabel, patterns } from './content';
import { url } from './url';

export interface SearchItem {
  title: string;
  kind: 'Pattern' | 'Chart' | 'Category' | 'Coming soon';
  url?: string;
  text: string;
}

export function searchIndex(): SearchItem[] {
  const goalWords = (id: string) => {
    const g = GOALS.find((x) => x.id === id);
    return g ? [g.label, ...g.synonyms] : [];
  };
  return [
    ...patterns().map((p) => ({
      title: p.question,
      kind: p.ready ? ('Pattern' as const) : ('Coming soon' as const),
      ...(p.ready ? { url: url(`patterns/${p.id}/`) } : {}),
      text: [p.summary, ...p.keywords, chartName(p.recommended), ...goalWords(p.goal), ...p.industries].join(' '),
    })),
    ...charts().map((c) => ({
      title: c.name,
      kind: 'Chart' as const,
      url: url(`charts/${c.id}/`),
      text: [c.summary, ...c.aliases, ...c.goals.flatMap(goalWords), c.name.replace(/chart/i, 'graph'), c.name.replace(/chart/i, 'plot')].join(' '),
    })),
    ...GOALS.map((g) => ({
      title: `${g.label} charts`,
      kind: 'Category' as const,
      url: url(`categories/${g.id}/`),
      text: [g.description, ...g.synonyms, goalLabel(g.id)].join(' '),
    })),
  ];
}
