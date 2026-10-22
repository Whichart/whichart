// Line chart: one measure over time. Apache ECharts.
// Usage:
//   import * as echarts from 'echarts';
//   import theme from '@whichart/tokens/echarts-light.json';
//   echarts.registerTheme('whichart', theme);
//   echarts.init(el, 'whichart').setOption(lineOption(rows, { label: 'Revenue', currency: 'USD' }));
// Rows: [{ date: '2026-07-01', value: 1722 }, ...] at daily intervals. Colours come from the theme.
// Public domain (CC0): copy, change and ship without attribution.
import type { EChartsOption } from 'echarts';

export interface LineRow {
  date: string;
  value: number | null;
}

export interface LineOptions {
  label?: string;
  locale?: string;
  currency?: string;
  emptyMessage?: string;
}

const DAY = 864e5;
const MAX_TITLE = 40;
const COMPACT_FROM = 100_000;

/** Sort by date and insert null for missing days, so the line breaks at gaps instead of joining across them. */
function fillDailyGaps(rows: LineRow[]): [string, number | null][] {
  const sorted = rows.filter((r) => r.date).sort((a, b) => a.date.localeCompare(b.date));
  if (!sorted.length) return [];
  const byDate = new Map(sorted.map((r) => [r.date, r.value]));
  const out: [string, number | null][] = [];
  const last = Date.parse(`${sorted[sorted.length - 1].date}T00:00:00Z`);
  for (let t = Date.parse(`${sorted[0].date}T00:00:00Z`); t <= last; t += DAY) {
    const d = new Date(t).toISOString().slice(0, 10);
    out.push([d, byDate.get(d) ?? null]);
  }
  return out;
}

export default function lineOption(rows: LineRow[], options: LineOptions = {}): EChartsOption {
  const { label = 'Value', locale = 'en-US', currency, emptyMessage = 'No data for this period' } = options;
  const style = currency ? { style: 'currency' as const, currency, currencyDisplay: 'narrowSymbol' as const } : {};
  const compact = new Intl.NumberFormat(locale, { ...style, notation: 'compact', minimumFractionDigits: 0, maximumFractionDigits: 1 });
  const full = new Intl.NumberFormat(locale, { ...style, maximumFractionDigits: 0 });
  // Point labels: full value when short, compact from 100,000 so they fit.
  const pointLabel = (v: number) => (Math.abs(v) >= COMPACT_FROM ? compact.format(v) : full.format(v));
  const title = label.length > MAX_TITLE ? `${label.slice(0, MAX_TITLE - 1).trimEnd()}…` : label;

  const data = fillDailyGaps(rows);
  const values = data.map(([, v]) => v).filter((v): v is number => v !== null);
  const allZero = values.length > 0 && values.every((v) => v === 0);
  const max = values.length ? Math.max(...values) : null;
  const peak = data.find(([, v]) => v === max);

  return {
    title: [
      { text: title, left: 0, top: 0 },
      // Empty state: keep the frame so the layout doesn't jump, and say why it's blank.
      ...(data.length ? [] : [{ subtext: emptyMessage, left: 'center', top: 'middle' }]),
    ],
    grid: { left: 8, right: 24, top: 40, bottom: 4, containLabel: true },
    tooltip: {
      trigger: 'axis',
      valueFormatter: (v) => (typeof v === 'number' ? full.format(v) : '—'),
    },
    // Daily data: never tick by the hour.
    xAxis: { type: 'time', minInterval: DAY, axisLabel: { hideOverlap: true } },
    yAxis: {
      type: 'value',
      // No values to scale to: show 0 and 1 rather than inventing a range.
      ...(allZero || !data.length ? { min: 0, max: 1, interval: 1 } : {}),
      axisLabel: { formatter: (v: number) => compact.format(v) },
    },
    series: [
      {
        type: 'line',
        name: label,
        data,
        connectNulls: false,
        showSymbol: data.length === 1,
        symbolSize: 8,
        label: { show: data.length === 1, formatter: (p) => pointLabel((p.value as [string, number])[1]) },
        // Label the highest point: the one people ask about.
        markPoint:
          peak && values.length >= 3 && !allZero
            ? {
                symbol: 'circle',
                symbolSize: 8,
                data: [{ name: 'Highest', coord: peak as [string, number], value: pointLabel(max as number) }],
                label: { show: true, position: 'top' },
              }
            : undefined,
      },
    ],
  };
}
