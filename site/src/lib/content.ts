// Reads charts/, patterns/ and their data at build time. The repo is the single source of truth.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parse } from 'yaml';
import { marked } from 'marked';

const root = resolve(process.cwd(), '..');

export type GoalId = 'trend' | 'compare' | 'part-of-whole' | 'ranking' | 'flow' | 'distribution' | 'relationship' | 'kpi';

export const GOALS: { id: GoalId; label: string; synonyms: string[]; description: string }[] = [
  { id: 'trend', label: 'Change over time', synonyms: ['trend', 'time series'], description: 'How a measure moves across days, weeks or months.' },
  { id: 'compare', label: 'Comparison', synonyms: ['compare', 'versus'], description: 'How values differ between categories or groups.' },
  { id: 'part-of-whole', label: 'Parts of a whole', synonyms: ['composition', 'share', 'breakdown'], description: 'How a total splits into its parts.' },
  { id: 'ranking', label: 'Ranking', synonyms: ['top N', 'leaderboard', 'best sellers'], description: 'What comes first, and by how much.' },
  { id: 'flow', label: 'Flow & funnels', synonyms: ['conversion', 'drop-off', 'funnel'], description: 'How people or money move through steps.' },
  { id: 'distribution', label: 'Distribution', synonyms: ['spread', 'histogram'], description: 'How values are spread out.' },
  { id: 'relationship', label: 'Relationship', synonyms: ['correlation', 'scatter'], description: 'Whether two measures move together.' },
  { id: 'kpi', label: 'Single number', synonyms: ['KPI', 'metric', 'big number'], description: 'One headline value and how it changed.' },
];
export const goalLabel = (id: string) => GOALS.find((g) => g.id === id)?.label ?? id;

export const INDUSTRIES = [
  { id: 'ecommerce', label: 'eCommerce' },
  { id: 'saas', label: 'SaaS' },
  { id: 'marketing', label: 'Marketing' },
  { id: 'finance', label: 'Finance' },
  { id: 'operations', label: 'Operations' },
  { id: 'research', label: 'Research' },
] as const;

export const STATES = [
  { id: 'empty', label: 'Empty', question: 'What if there’s no data yet?' },
  { id: 'singlePoint', label: 'Single point', question: 'What if there’s only one value?' },
  { id: 'allZeros', label: 'All zeros', question: 'What if every value is zero?' },
  { id: 'outlier', label: 'Outlier', question: 'What if one value is huge?' },
  { id: 'negative', label: 'Negative values', question: 'What if values go below zero?' },
  { id: 'manySeries', label: 'Many series', question: 'What if there are too many series?' },
  { id: 'longLabels', label: 'Long labels', question: 'What if names are very long?' },
  { id: 'largeNumbers', label: 'Large numbers', question: 'What about millions, crores and currencies?' },
  { id: 'timeGaps', label: 'Gaps in time', question: 'What if days are missing?' },
  { id: 'noPrevious', label: 'No previous period', question: 'What if there’s nothing to compare with?' },
] as const;
export type StateId = (typeof STATES)[number]['id'];

const TARGETS: Record<string, { label: string; lang: string }> = {
  echarts: { label: 'ECharts', lang: 'ts' },
  recharts: { label: 'Recharts', lang: 'tsx' },
  vanilla: { label: 'JavaScript', lang: 'ts' },
  react: { label: 'React', lang: 'tsx' },
  plotly: { label: 'Plotly (Python)', lang: 'python' },
};

export interface Dataset {
  key: string;
  options: Record<string, unknown>;
  rows: Record<string, string | number | null>[];
}

export interface Chart {
  id: string;
  name: string;
  aliases: string[];
  summary: string;
  goals: GoalId[];
  doc: any;
  guideHtml: string;
  code: { target: string; label: string; lang: string; file: string; source: string }[];
  reference: 'echarts' | 'vanilla';
  datasets: Dataset[];
}

export interface Pattern {
  id: string;
  question: string;
  summary: string;
  goal: GoalId;
  industries: string[];
  keywords: string[];
  recommended: string;
  alternatives: { id: string; when: string }[];
  why: string;
  example?: string;
  /** False until the recommended chart is written. */
  ready: boolean;
}

function parseCsv(text: string): Dataset['rows'] {
  const [head, ...lines] = text.trim().split('\n');
  const cols = head.split(',');
  return lines.map((line) => {
    const cells = line.split(',');
    return Object.fromEntries(cols.map((c, i) => [c, c === 'date' || c === 'label' ? cells[i] : cells[i] === '' ? null : Number(cells[i])]));
  });
}

let chartCache: Chart[] | undefined;
export function charts(): Chart[] {
  if (chartCache) return chartCache;
  const dir = join(root, 'charts');
  chartCache = readdirSync(dir)
    .filter((id) => existsSync(join(dir, id, 'chart.yaml')))
    .map((id) => {
      const base = join(dir, id);
      const doc = parse(readFileSync(join(base, 'chart.yaml'), 'utf8'));
      const index = JSON.parse(readFileSync(join(base, 'data/datasets.json'), 'utf8'));
      const datasets: Dataset[] = [['sample', index.sample], ...Object.entries(index.states)].map(([key, d]: any) => ({
        key,
        options: d.options,
        rows: parseCsv(readFileSync(join(base, 'data', d.file), 'utf8')),
      }));
      return {
        id,
        name: doc.name,
        aliases: doc.aliases,
        summary: doc.summary,
        goals: doc.goals,
        doc,
        guideHtml: marked.parse(readFileSync(join(base, 'guide.md'), 'utf8').replace(/^# .*\n/, ''), { async: false }) as string,
        code: Object.entries(doc.code as Record<string, string>).map(([target, file]) => ({
          target,
          ...TARGETS[target],
          file,
          source: readFileSync(join(base, file), 'utf8'),
        })),
        reference: doc.code.echarts ? 'echarts' : 'vanilla',
        datasets,
      } satisfies Chart;
    })
    .filter((c) => c.doc.status === 'ready')
    .sort((a, b) => a.name.localeCompare(b.name));
  return chartCache;
}

export const chartById = (id: string) => charts().find((c) => c.id === id);

/** Readable name for any planned id, written or not. */
export function chartName(id: string): string {
  return chartById(id)?.name ?? planned().names?.[id] ?? id.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase());
}

let plannedCache: { core: string[]; later: string[]; names: Record<string, string> } | undefined;
export function planned() {
  return (plannedCache ??= parse(readFileSync(join(root, 'charts/planned.yaml'), 'utf8')));
}

export const plannedCount = () => planned().core.length + planned().later.length;

let patternCache: Pattern[] | undefined;
export function patterns(): Pattern[] {
  if (patternCache) return patternCache;
  const dir = join(root, 'patterns');
  patternCache = readdirSync(dir)
    .filter((f) => f.endsWith('.yaml'))
    .map((f) => {
      const doc = parse(readFileSync(join(dir, f), 'utf8'));
      return { keywords: [], alternatives: [], ...doc, ready: !!chartById(doc.recommended) } as Pattern;
    })
    // Ready patterns first, then by goal order, so the grid leads with what works today.
    .sort((a, b) => Number(b.ready) - Number(a.ready) || GOALS.findIndex((g) => g.id === a.goal) - GOALS.findIndex((g) => g.id === b.goal));
  return patternCache;
}

/** Applicable states for a chart, in the canonical order, with their yaml treatment. */
export function chartStates(c: Chart) {
  return STATES.filter((s) => c.doc.states[s.id]?.treatment !== 'not-applicable').map((s) => ({ ...s, ...c.doc.states[s.id] }));
}

export const catalogJson = () => readFileSync(join(root, 'packages/engine/catalog.json'), 'utf8');
