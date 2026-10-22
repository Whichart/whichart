// Every public page, for the sitemap and llms.txt.
import { GOALS, INDUSTRIES, charts, patterns } from './content';

export function routes(): { path: string; title: string; summary?: string; kind: string }[] {
  return [
    { path: '', title: 'Whichart: Modern data visualization examples, tested on real data', kind: 'home' },
    ...patterns()
      .filter((p) => p.ready)
      .map((p) => ({ path: `patterns/${p.id}/`, title: p.question, summary: p.summary, kind: 'pattern' })),
    { path: 'charts/', title: 'All charts', kind: 'index' },
    ...charts().map((c) => ({ path: `charts/${c.id}/`, title: c.name, summary: `${c.summary} Also called: ${c.aliases.join(', ')}.`, kind: 'chart' })),
    ...GOALS.map((g) => ({ path: `categories/${g.id}/`, title: `${g.label} charts`, summary: g.description, kind: 'category' })),
    ...INDUSTRIES.filter((i) => i.id !== 'research').map((i) => ({ path: `industries/${i.id}/`, title: `${i.label} dashboards`, kind: 'industry' })),
    { path: 'edge-cases/', title: 'Edge cases', summary: 'How charts handle empty, zero, outlier, negative, long-label, large-number, gappy and new data.', kind: 'page' },
    { path: 'theme/', title: 'Theme', summary: 'Colour-blind-safe palette for light and dark, and a checker for your own colours.', kind: 'page' },
    { path: 'agents/', title: 'For AI agents', kind: 'page' },
  ];
}
