// Mock data for the homepage wireframe. The real ranking comes from
// @whichart/engine in milestone M3; these numbers only demonstrate the layout.

export const GOALS = [
  ['trend', 'Trend'],
  ['compare', 'Compare'],
  ['part-of-whole', 'Part of whole'],
  ['ranking', 'Ranking'],
  ['flow', 'Flow / funnel'],
  ['distribution', 'Distribution'],
  ['relationship', 'Relationship'],
  ['kpi', 'Single KPI'],
];

export const SPACES = [
  ['any', 'Any'],
  ['tile', 'Tile'],
  ['card', 'Card'],
  ['full', 'Full width'],
];

export const STATES = [
  ['normal', 'Normal data'],
  ['empty', 'Empty'],
  ['singlePoint', 'Single point'],
  ['allZeros', 'All zeros'],
  ['outlier', 'Outlier'],
  ['negative', 'Negative values'],
  ['manySeries', 'Many series'],
  ['longLabels', 'Long labels'],
  ['largeNumbers', 'Large numbers'],
  ['timeGaps', 'Gaps in time'],
  ['noPrevious', 'No previous period'],
];

// space: which space filters the chart fits.
export const CHARTS = [
  { id: 'kpi-tile-delta', name: 'KPI tile with change', goals: ['kpi'], thumb: 'kpi', space: ['tile', 'card'] },
  { id: 'kpi-tile-sparkline', name: 'KPI tile with sparkline', goals: ['kpi', 'trend'], thumb: 'kpiSpark', space: ['tile', 'card'] },
  { id: 'progress-meter', name: 'Progress / goal meter', goals: ['kpi'], thumb: 'meter', space: ['tile', 'card'] },
  { id: 'line', name: 'Line', goals: ['trend', 'compare'], thumb: 'line', space: ['card', 'full'] },
  { id: 'multi-line', name: 'Multi-line', goals: ['trend', 'compare'], thumb: 'multiLine', space: ['card', 'full'] },
  { id: 'area', name: 'Area', goals: ['trend'], thumb: 'area', space: ['card', 'full'] },
  { id: 'sparkline', name: 'Sparkline', goals: ['trend', 'kpi'], thumb: 'sparkline', space: ['tile'] },
  { id: 'period-comparison', name: 'Current vs previous period', goals: ['trend', 'compare'], thumb: 'period', space: ['card', 'full'] },
  { id: 'bar-horizontal', name: 'Horizontal bar', goals: ['compare', 'ranking'], thumb: 'barH', space: ['card', 'full'] },
  { id: 'stacked-bar', name: 'Stacked bar', goals: ['part-of-whole', 'compare'], thumb: 'stacked', space: ['card', 'full'] },
  { id: 'top-n-table', name: 'Top-N table', goals: ['ranking'], thumb: 'topN', space: ['card', 'full'] },
  { id: 'donut', name: 'Donut', goals: ['part-of-whole'], thumb: 'donut', space: ['tile', 'card'] },
  { id: 'funnel', name: 'Funnel', goals: ['flow'], thumb: 'funnel', space: ['card', 'full'] },
  { id: 'cohort-heatmap', name: 'Cohort retention heatmap', goals: ['distribution', 'trend'], thumb: 'heatmap', space: ['full'] },
  { id: 'data-table', name: 'Data table', goals: ['compare', 'ranking'], thumb: 'table', space: ['card', 'full'] },
];

// Sample dataset: daily store orders: date, revenue, orders, channel (4 values).
export const SAMPLE = {
  label: 'store-orders.csv',
  profile: '90 rows · date · revenue · orders · channel (4 values)',
  ranked: [
    ['multi-line', 94, 'Date + revenue split by 4 channels: one line per channel.'],
    ['line', 90, 'Date + revenue: the classic trend view.', '4 channels share one total line unless split.'],
    ['period-comparison', 82, 'Date column covers two full months: this month vs last.'],
    ['area', 76, 'Total revenue over time; volume under the line reads as size.'],
    ['stacked-bar', 70, 'Channel share of revenue per week.', 'Fine for 4 channels; avoid beyond 6.'],
    ['kpi-tile-sparkline', 66, 'Headline revenue with a 90-day shape.'],
    ['sparkline', 61, 'Shape of revenue for a tile.'],
    ['kpi-tile-delta', 58, 'Headline revenue vs previous period.'],
    ['data-table', 52, 'Exact values per channel.'],
    ['bar-horizontal', 44, 'Total revenue per channel.', 'Loses the time dimension.'],
    ['top-n-table', 40, 'Ranks the 4 channels.', 'Only 4 rows: a bar chart says it faster.'],
  ],
  avoid: [
    ['donut', 'Your data is a time series. A donut throws time away.'],
    ['funnel', 'No ordered stages (visit → cart → purchase) in your data.'],
    ['cohort-heatmap', 'Needs a signup-cohort column and a period column.'],
    ['progress-meter', 'Needs a target to measure progress against.'],
  ],
};

// How each state is handled. Specific entries override the default text.
export const STATE_TEXT = {
  empty: { default: ['message', 'No data for this period'] },
  singlePoint: {
    default: ['adapt', 'One value: shown with its label'],
    line: ['fallback', 'Switches to a KPI tile'],
    'multi-line': ['fallback', 'Switches to a KPI tile'],
    area: ['fallback', 'Switches to a KPI tile'],
    sparkline: ['message', 'Not enough data yet'],
  },
  allZeros: {
    default: ['adapt', 'Flat at zero, axis fixed 0–1'],
    donut: ['message', 'Nothing to split yet'],
    funnel: ['message', 'No visits yet'],
  },
  outlier: { default: ['adapt', 'Outlier labelled, never clipped'] },
  negative: {
    default: ['render', 'Axis extends below zero'],
    donut: ['fallback', 'Negative parts: switches to a bar chart'],
    funnel: ['message', 'Stages can’t be negative'],
  },
  manySeries: {
    default: ['adapt', 'Top 5 highlighted, rest grey'],
    donut: ['adapt', 'Smallest folded into “Other”'],
    'stacked-bar': ['adapt', 'Smallest folded into “Other”'],
  },
  longLabels: { default: ['adapt', 'Truncated at 24 chars, full in tooltip'] },
  largeNumbers: { default: ['adapt', 'Compact: $1.2M · ৳12 lakh'] },
  timeGaps: { default: ['adapt', 'Line breaks at missing days'], donut: ['not-applicable', 'No time axis'] },
  noPrevious: {
    default: ['not-applicable', 'No comparison in this chart'],
    'kpi-tile-delta': ['adapt', 'Shows “New”, hides the change'],
    'period-comparison': ['fallback', 'Switches to a single line'],
    'kpi-tile-sparkline': ['adapt', 'Shows “New”, hides the change'],
  },
};

const v = (n) => `var(--wc-series-${n})`;
const ink = 'var(--wc-ink-muted)';
const grid = 'var(--wc-grid)';
const axis = `<path d="M14 78H150" style="stroke:var(--wc-axis)" />`;

const SHAPES = {
  line: `${axis}<polyline points="14,62 40,50 66,56 92,34 118,40 146,22" style="fill:none;stroke:${v(1)};stroke-width:2" />`,
  multiLine: `${axis}
    <polyline points="14,62 40,50 66,56 92,34 118,40 146,22" style="fill:none;stroke:${v(1)};stroke-width:2" />
    <polyline points="14,70 40,62 66,64 92,58 118,50 146,46" style="fill:none;stroke:${v(2)};stroke-width:2" />
    <polyline points="14,44 40,46 66,38 92,42 118,30 146,34" style="fill:none;stroke:${v(3)};stroke-width:2" />`,
  area: `${axis}<path d="M14 62L40 50 66 56 92 34 118 40 146 22V78H14Z" style="fill:${v(1)};opacity:.25" />
    <polyline points="14,62 40,50 66,56 92,34 118,40 146,22" style="fill:none;stroke:${v(1)};stroke-width:2" />`,
  sparkline: `<polyline points="14,56 34,48 54,52 74,36 94,42 114,28 146,30" style="fill:none;stroke:${v(1)};stroke-width:2" />
    <circle cx="146" cy="30" r="3" style="fill:${v(1)}" />`,
  period: `${axis}
    <polyline points="14,58 40,54 66,60 92,48 118,50 146,44" style="fill:none;stroke:${ink};stroke-width:2;stroke-dasharray:4 3" />
    <polyline points="14,60 40,48 66,50 92,34 118,36 146,22" style="fill:none;stroke:${v(1)};stroke-width:2" />`,
  barH: [70, 54, 40, 26]
    .map((w, i) => `<rect x="14" y="${14 + i * 17}" width="${w * 1.8}" height="11" rx="3" style="fill:${v(1)}" />`)
    .join(''),
  stacked: [[50, 30, 20], [40, 35, 25], [55, 25, 20], [35, 40, 25]]
    .map((parts, i) => {
      let x = 14;
      return parts
        .map((p, j) => {
          const w = p * 1.3;
          const r = `<rect x="${x}" y="${14 + i * 17}" width="${w - 2}" height="11" style="fill:${v(j + 1)}" />`;
          x += w;
          return r;
        })
        .join('');
    })
    .join(''),
  topN: [90, 72, 55, 38]
    .map(
      (w, i) => `<rect x="14" y="${16 + i * 17}" width="40" height="5" rx="2" style="fill:${grid}" />
      <rect x="70" y="${14 + i * 17}" width="${w * 0.8}" height="9" rx="2" style="fill:${v(1)};opacity:.85" />`,
    )
    .join(''),
  donut: `<circle cx="80" cy="45" r="28" style="fill:none;stroke:${v(1)};stroke-width:12;stroke-dasharray:88 88" transform="rotate(-90 80 45)" />
    <circle cx="80" cy="45" r="28" style="fill:none;stroke:${v(2)};stroke-width:12;stroke-dasharray:50 126;stroke-dashoffset:-90" transform="rotate(-90 80 45)" />
    <circle cx="80" cy="45" r="28" style="fill:none;stroke:${v(3)};stroke-width:12;stroke-dasharray:32 144;stroke-dashoffset:-142" transform="rotate(-90 80 45)" />`,
  funnel: [130, 96, 62, 34]
    .map((w, i) => `<rect x="${80 - w / 2}" y="${10 + i * 18}" width="${w}" height="14" rx="3" style="fill:var(--wc-seq-${12 - i * 2})" />`)
    .join(''),
  heatmap: Array.from({ length: 5 }, (_, r) =>
    Array.from({ length: 6 - r }, (_, c) => `<rect x="${20 + c * 21}" y="${10 + r * 15}" width="19" height="13" rx="2" style="fill:var(--wc-seq-${Math.max(2, 12 - c * 2 - r)})" />`).join(''),
  ).join(''),
  table: Array.from({ length: 5 }, (_, r) =>
    `<rect x="14" y="${12 + r * 14}" width="132" height="1" style="fill:${grid}" />
     <rect x="16" y="${16 + r * 14}" width="${r ? 46 : 36}" height="5" rx="2" style="fill:${r ? grid : ink}" />
     <rect x="106" y="${16 + r * 14}" width="${r ? 36 : 28}" height="5" rx="2" style="fill:${r ? 'var(--wc-ink-secondary)' : ink}" />`,
  ).join(''),
  kpi: `<text x="14" y="34" style="fill:var(--wc-ink-secondary);font-size:11px">Revenue</text>
    <text x="14" y="62" style="fill:var(--wc-ink-primary);font-size:26px;font-weight:600">$48.2k</text>
    <text x="14" y="80" style="fill:var(--wc-delta-up);font-size:11px">▲ 12.4% vs last month</text>`,
  kpiSpark: `<text x="14" y="30" style="fill:var(--wc-ink-secondary);font-size:11px">Orders</text>
    <text x="14" y="56" style="fill:var(--wc-ink-primary);font-size:24px;font-weight:600">1,284</text>
    <polyline points="92,58 104,50 116,54 128,40 140,44 150,32" style="fill:none;stroke:${v(1)};stroke-width:2" />
    <text x="14" y="76" style="fill:var(--wc-delta-down);font-size:11px">▼ 3.1%</text>`,
  meter: `<text x="14" y="34" style="fill:var(--wc-ink-secondary);font-size:11px">Monthly target</text>
    <rect x="14" y="46" width="132" height="10" rx="5" style="fill:var(--wc-seq-1)" />
    <rect x="14" y="46" width="92" height="10" rx="5" style="fill:${v(1)}" />
    <text x="14" y="76" style="fill:var(--wc-ink-primary);font-size:12px">70% · $35k of $50k</text>`,
};

export function thumbnail(chart, state = 'normal') {
  const svg = (body) => `<svg viewBox="0 0 160 90" role="img" aria-label="${chart.name} preview">${body}</svg>`;
  if (state === 'normal') return svg(SHAPES[chart.thumb]);
  const [treatment, text] = STATE_TEXT[state][chart.id] ?? STATE_TEXT[state].default;
  if (treatment === 'message') {
    return svg(`${axis}<text x="80" y="48" text-anchor="middle" style="fill:${ink};font-size:11px">${text}</text>`);
  }
  // Other treatments keep the shape, dimmed, with the treatment described in the caption.
  return svg(`<g style="opacity:${treatment === 'not-applicable' ? 0.35 : 0.8}">${SHAPES[chart.thumb]}</g>`);
}

export function stateCaption(chart, state) {
  if (state === 'normal') return null;
  const [treatment, text] = STATE_TEXT[state][chart.id] ?? STATE_TEXT[state].default;
  return { treatment, text };
}
