import type { APIRoute } from 'astro';
import { routes } from '../lib/routes';
import { url } from '../lib/url';

// https://llmstxt.org: a Markdown index of the site for language models.
export const GET: APIRoute = ({ site }) => {
  const abs = (p: string) => new URL(url(p), site).href;
  const section = (kind: string) =>
    routes()
      .filter((r) => r.kind === kind)
      .map((r) => `- [${r.title}](${abs(r.path)})${r.summary ? `: ${r.summary}` : ''}`)
      .join('\n');
  const body = `# Whichart

> Modern data visualization examples, tested on real data. For each chart: when to use it, when not to, how it must behave with empty, zero, outlier, negative, long-label, large-number, gappy and new data, and ready code (ECharts, Recharts, plain JS, React, Plotly). Code and data are CC0.

Rules that apply everywhere: never use a dual y-axis; assign series colours in a fixed order and never more than 8; a percentage change from zero or across a sign change is meaningless, so show the absolute change; show "New" when there is no previous period; break lines at missing dates instead of joining across them.

Machine-readable rules for every chart: ${abs('catalog.json')}

## Patterns (builders' questions)
${section('pattern')}

## Charts
${section('chart')}

## Categories
${section('category')}

## Optional
- [Edge cases](${abs('edge-cases/')})
- [Theme and palette checks](${abs('theme/')})
- [Source on GitHub](https://github.com/Whichart/whichart.github.io)
`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
