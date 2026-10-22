// Generates library themes from tokens.json. Output goes to generated/ and is
// committed so people can copy it; CI fails if it is out of date.

const ARM = [3, 6, 9, 12]; // steps 250, 400, 550, 700

export function diverging(tokens, mode) {
  const { blue, red } = tokens.sequential;
  const mid = tokens.modes[mode].divergingMid;
  // negative (red) → neutral → positive (blue)
  return [...ARM.map((i) => red[i]).reverse(), mid, ...ARM.map((i) => blue[i])];
}

/** Low → high magnitude. Dark mode flips the anchor so "near zero" recedes into the dark surface. */
export function sequential(tokens, mode) {
  const ramp = tokens.sequential[tokens.sequential.hue];
  return mode === 'dark' ? [...ramp].reverse() : [...ramp];
}

/** Ordinal steps (funnel stages, tiers): never lighter than step 250 on light, darker than 600 on dark. */
export function ordinal(tokens, mode) {
  const ramp = tokens.sequential[tokens.sequential.hue];
  return mode === 'dark' ? ramp.slice(3, 11).reverse() : ramp.slice(3);
}

export function deltaColors(tokens, mode) {
  const d = tokens.modes[mode].delta;
  return tokens.deltaConvention === 'red-up'
    ? { up: d.bad, down: d.good, neutral: d.neutral }
    : { up: d.good, down: d.bad, neutral: d.neutral };
}

function cssBlock(tokens, mode) {
  const m = tokens.modes[mode];
  const delta = deltaColors(tokens, mode);
  const vars = {
    surface: m.surface,
    page: m.page,
    'ink-primary': m.ink.primary,
    'ink-secondary': m.ink.secondary,
    'ink-muted': m.ink.muted,
    grid: m.grid,
    axis: m.axis,
    border: m.border,
    accent: m.accent,
    'on-accent': m.onAccent,
    ...Object.fromEntries(m.categorical.map((c, i) => [`series-${i + 1}`, c])),
    ...Object.fromEntries(sequential(tokens, mode).map((c, i) => [`seq-${i + 1}`, c])),
    ...Object.fromEntries(diverging(tokens, mode).map((c, i) => [`div-${i + 1}`, c])),
    ...Object.fromEntries(Object.entries(tokens.status).map(([k, v]) => [`status-${k}`, v])),
    'delta-up': delta.up,
    'delta-down': delta.down,
    'delta-neutral': delta.neutral,
  };
  return Object.entries(vars)
    .map(([k, v]) => `  --wc-${k}: ${v};`)
    .join('\n');
}

export function css(tokens) {
  const shared = [
    `  --wc-font: ${tokens.font.family};`,
    `  --wc-line-width: ${tokens.marks.lineWidth}px;`,
    `  --wc-marker-size: ${tokens.marks.markerSize}px;`,
    `  --wc-bar-radius: ${tokens.marks.barRadius}px;`,
    `  --wc-gap: ${tokens.marks.gap}px;`,
  ].join('\n');
  const dark = cssBlock(tokens, 'dark');
  return `/* Generated from tokens.json. Do not edit by hand. */
:root {
  color-scheme: light;
${shared}
${cssBlock(tokens, 'light')}
}
@media (prefers-color-scheme: dark) {
  :root:where(:not([data-theme="light"])) {
    color-scheme: dark;
${dark.replace(/^/gm, '  ')}
  }
}
:root[data-theme="dark"] {
  color-scheme: dark;
${dark}
}
`;
}

export function echarts(tokens, mode) {
  const m = tokens.modes[mode];
  const axis = {
    axisLine: { show: true, lineStyle: { color: m.axis } },
    axisTick: { show: false },
    axisLabel: { color: m.ink.muted, fontSize: tokens.font.size.tick },
    splitLine: { show: true, lineStyle: { color: m.grid, width: tokens.marks.gridWidth } },
    nameTextStyle: { color: m.ink.secondary },
  };
  return {
    color: m.categorical,
    backgroundColor: 'transparent',
    textStyle: { fontFamily: tokens.font.family, color: m.ink.secondary },
    title: {
      textStyle: { color: m.ink.primary, fontSize: tokens.font.size.title, fontWeight: 600 },
      subtextStyle: { color: m.ink.secondary },
    },
    legend: { textStyle: { color: m.ink.secondary }, icon: 'roundRect', itemWidth: 12, itemHeight: 12 },
    tooltip: {
      backgroundColor: m.surface,
      borderColor: m.axis,
      textStyle: { color: m.ink.primary },
      axisPointer: { lineStyle: { color: m.axis }, crossStyle: { color: m.axis } },
    },
    categoryAxis: { ...axis, splitLine: { show: false } },
    valueAxis: { ...axis, axisLine: { show: false } },
    timeAxis: { ...axis, splitLine: { show: false } },
    line: { lineStyle: { width: tokens.marks.lineWidth }, symbolSize: tokens.marks.markerSize, symbol: 'circle', smooth: false },
    bar: { itemStyle: { borderRadius: [tokens.marks.barRadius, tokens.marks.barRadius, 0, 0] } },
    pie: { itemStyle: { borderColor: m.surface, borderWidth: tokens.marks.gap } },
    funnel: { itemStyle: { borderColor: m.surface, borderWidth: tokens.marks.gap } },
    visualMap: { inRange: { color: sequential(tokens, mode) }, textStyle: { color: m.ink.secondary } },
  };
}

export function plotly(tokens, mode) {
  const m = tokens.modes[mode];
  const scale = (colors) => colors.map((c, i) => [+(i / (colors.length - 1)).toFixed(4), c]);
  const axis = {
    gridcolor: m.grid,
    linecolor: m.axis,
    zerolinecolor: m.axis,
    tickfont: { color: m.ink.muted, size: tokens.font.size.tick },
    title: { font: { color: m.ink.secondary } },
    automargin: true,
  };
  return {
    layout: {
      colorway: m.categorical,
      paper_bgcolor: m.surface,
      plot_bgcolor: m.surface,
      font: { family: tokens.font.family, color: m.ink.secondary, size: tokens.font.size.body },
      title: { font: { color: m.ink.primary, size: tokens.font.size.title } },
      legend: { font: { color: m.ink.secondary } },
      xaxis: { ...axis, showgrid: false },
      yaxis: { ...axis, showgrid: true },
      hoverlabel: { bgcolor: m.surface, bordercolor: m.axis, font: { color: m.ink.primary } },
      colorscale: { sequential: scale(sequential(tokens, mode)), diverging: scale(diverging(tokens, mode)) },
    },
    data: {
      scatter: [{ line: { width: tokens.marks.lineWidth }, marker: { size: tokens.marks.markerSize } }],
      bar: [{ marker: { line: { width: 0 } } }],
    },
  };
}

export function recharts(tokens) {
  const v = (name) => `var(--wc-${name})`;
  const n = tokens.modes.light.categorical.length;
  const theme = {
    series: Array.from({ length: n }, (_, i) => v(`series-${i + 1}`)),
    surface: v('surface'),
    ink: { primary: v('ink-primary'), secondary: v('ink-secondary'), muted: v('ink-muted') },
    grid: v('grid'),
    axis: v('axis'),
    delta: { up: v('delta-up'), down: v('delta-down'), neutral: v('delta-neutral') },
    status: Object.fromEntries(Object.keys(tokens.status).map((k) => [k, v(`status-${k}`)])),
    marks: tokens.marks,
    font: { family: v('font'), tick: tokens.font.size.tick },
  };
  return `// Generated from tokens.json. Do not edit by hand.
// Colours are CSS variables from whichart.css, so light/dark switch automatically.
export const theme = ${JSON.stringify(theme, null, 2)};
`;
}

/** All generated files, keyed by path relative to generated/. */
export function buildAll(tokens) {
  const json = (o) => JSON.stringify(o, null, 2) + '\n';
  return {
    'whichart.css': css(tokens),
    'echarts-light.json': json(echarts(tokens, 'light')),
    'echarts-dark.json': json(echarts(tokens, 'dark')),
    'plotly-light.json': json(plotly(tokens, 'light')),
    'plotly-dark.json': json(plotly(tokens, 'dark')),
    'recharts-theme.js': recharts(tokens),
  };
}
