// Turn a user's rows + the engine's column encoding into the input each chart's code expects.
import { parseDate, parseNumber, type Encoding, type Row } from '@whichart/engine';

const SYMBOL_CURRENCY: [RegExp, string][] = [
  [/৳/, 'BDT'],
  [/₹/, 'INR'],
  [/€/, 'EUR'],
  [/£/, 'GBP'],
  [/¥/, 'JPY'],
  [/\$/, 'USD'],
];

/** Guess a currency from symbols in the raw values, e.g. "$1,234". */
function currencyOf(rows: Row[], column: string): string | undefined {
  const sample = rows.slice(0, 50).map((r) => String(r[column] ?? '')).join(' ');
  return SYMBOL_CURRENCY.find(([re]) => re.test(sample))?.[1];
}

const pretty = (s: string) => s.replace(/[_-]+/g, ' ').replace(/^./, (c) => c.toUpperCase());
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);
const DAY = 864e5;

export interface Adapted {
  rows: unknown[];
  options: Record<string, unknown>;
  note?: string;
}

/** Daily totals of one measure. */
function daily(rows: Row[], time: string, measure: string) {
  const sums = new Map<string, number>();
  for (const r of rows) {
    const t = parseDate(r[time]);
    const v = parseNumber(r[measure]);
    if (t === null || v === null) continue;
    const d = iso(t);
    sums.set(d, (sums.get(d) ?? 0) + v);
  }
  return [...sums].sort(([a], [b]) => a.localeCompare(b)).map(([date, value]) => ({ date, value }));
}

export function adapt(chart: string, rows: Row[], enc: Encoding): Adapted | null {
  const measure = enc.measures[0];
  if (!measure) return null;
  const base = { label: pretty(measure), locale: navigator.language || 'en-US', currency: currencyOf(rows, measure) };

  if (chart === 'line' && enc.time) {
    return { rows: daily(rows, enc.time, measure), options: base };
  }

  if (chart === 'kpi-tile-delta') {
    if (enc.comparison && rows.length <= 1) {
      const r = rows[0];
      return { rows: r ? [{ value: parseNumber(r[measure]), previous: parseNumber(r[enc.comparison]) }] : [], options: base };
    }
    if (enc.time) {
      // Summarise a daily series: the last 30 days against the 30 before.
      const series = daily(rows, enc.time, measure);
      if (!series.length) return { rows: [], options: base };
      const end = Date.parse(`${series[series.length - 1].date}T00:00:00Z`);
      const sum = (from: number, to: number) =>
        series.filter((d) => {
          const t = Date.parse(`${d.date}T00:00:00Z`);
          return t > from && t <= to;
        });
      const current = sum(end - 30 * DAY, end);
      const previous = sum(end - 60 * DAY, end - 30 * DAY);
      const total = (xs: { value: number }[]) => xs.reduce((a, d) => a + d.value, 0);
      return {
        rows: [{ value: total(current), previous: previous.length ? total(previous) : null }],
        options: { ...base, label: `${base.label}, last 30 days`, comparisonLabel: 'vs previous 30 days' },
        note: 'Summed: the last 30 days against the 30 before.',
      };
    }
  }
  return null;
}
