// Line chart: one measure over time. Recharts (React).
// Usage: <LineChartCard rows={rows} label="Revenue" currency="USD" />
// Rows: [{ date: '2026-07-01', value: 1722 }, ...] at daily intervals.
// Colours are CSS variables from @whichart/tokens/whichart.css, so light and dark mode switch automatically.
// Public domain (CC0): copy, change and ship without attribution.
import { CartesianGrid, Line, LineChart, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export interface LineRow {
  date: string;
  value: number | null;
}

export interface LineChartCardProps {
  rows: LineRow[];
  label?: string;
  locale?: string;
  currency?: string;
  emptyMessage?: string;
  height?: number;
}

const DAY = 864e5;
const MAX_TITLE = 40;
const COMPACT_FROM = 100_000;

/** Round-number axis ticks covering lo..hi (0, 1K, 2K… rather than 0, 900, 1.8K…). */
function niceTicks(lo: number, hi: number, count = 5): number[] {
  if (hi <= lo) hi = lo + 1;
  const raw = (hi - lo) / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) as number;
  const ticks = [];
  for (let t = Math.floor(lo / step) * step; ; t += step) {
    ticks.push(Math.round(t * 1e10) / 1e10);
    if (t >= hi - step * 1e-9) return ticks;
  }
}

/** Sort by date and insert null for missing days, so the line breaks at gaps instead of joining across them. */
function fillDailyGaps(rows: LineRow[]): LineRow[] {
  const sorted = rows.filter((r) => r.date).sort((a, b) => a.date.localeCompare(b.date));
  if (!sorted.length) return [];
  const byDate = new Map(sorted.map((r) => [r.date, r.value]));
  const out: LineRow[] = [];
  const last = Date.parse(`${sorted[sorted.length - 1].date}T00:00:00Z`);
  for (let t = Date.parse(`${sorted[0].date}T00:00:00Z`); t <= last; t += DAY) {
    const date = new Date(t).toISOString().slice(0, 10);
    out.push({ date, value: byDate.get(date) ?? null });
  }
  return out;
}

export default function LineChartCard({
  rows,
  label = 'Value',
  locale = 'en-US',
  currency,
  emptyMessage = 'No data for this period',
  height = 260,
}: LineChartCardProps) {
  const style = currency ? { style: 'currency' as const, currency, currencyDisplay: 'narrowSymbol' as const } : {};
  const compact = new Intl.NumberFormat(locale, { ...style, notation: 'compact', minimumFractionDigits: 0, maximumFractionDigits: 1 });
  const full = new Intl.NumberFormat(locale, { ...style, maximumFractionDigits: 0 });
  // Point labels: full value when short, compact from 100,000 so they fit.
  const pointLabel = (v: number) => (Math.abs(v) >= COMPACT_FROM ? compact.format(v) : full.format(v));
  const day = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', timeZone: 'UTC' });
  const fmtDate = (d: string) => day.format(new Date(`${d}T00:00:00Z`));
  const title = label.length > MAX_TITLE ? `${label.slice(0, MAX_TITLE - 1).trimEnd()}…` : label;

  const data = fillDailyGaps(rows);
  const values = data.map((d) => d.value).filter((v): v is number => v !== null);
  const allZero = values.length > 0 && values.every((v) => v === 0);
  const max = values.length ? Math.max(...values) : null;
  const peak = data.find((d) => d.value === max);
  // No values to scale to: show 0 and 1 rather than inventing a range.
  const ticks = allZero || !values.length ? [0, 1] : niceTicks(Math.min(0, ...values), Math.max(...values));
  const axis = { stroke: 'var(--wc-axis)', tick: { fill: 'var(--wc-ink-muted)', fontSize: 12 }, tickLine: false };

  return (
    <figure style={{ margin: 0, fontFamily: 'var(--wc-font)', position: 'relative' }}>
      <figcaption title={label} style={{ color: 'var(--wc-ink-primary)', fontWeight: 600, fontSize: 16, marginBottom: 8 }}>
        {title}
      </figcaption>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 20, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--wc-grid)" />
          <XAxis dataKey="date" tickFormatter={fmtDate} minTickGap={24} {...axis} />
          <YAxis
            width={64}
            tickFormatter={(v: number) => compact.format(v)}
            domain={[ticks[0], ticks[ticks.length - 1]]}
            ticks={ticks}
            axisLine={false}
            {...axis}
          />
          <Tooltip
            labelFormatter={(d) => fmtDate(String(d))}
            formatter={(v) => [typeof v === 'number' ? full.format(v) : '—', label]}
            contentStyle={{ background: 'var(--wc-surface)', border: '1px solid var(--wc-axis)', color: 'var(--wc-ink-primary)' }}
          />
          <Line
            type="linear"
            dataKey="value"
            name={label}
            stroke="var(--wc-series-1)"
            strokeWidth={2}
            dot={data.length === 1 ? { r: 4, fill: 'var(--wc-series-1)' } : false}
            label={data.length === 1 ? { position: 'top', fill: 'var(--wc-ink-primary)', formatter: (v: unknown) => pointLabel(Number(v)) } : undefined}
            connectNulls={false}
            isAnimationActive={false}
          />
          {peak && values.length >= 3 && !allZero && (
            <ReferenceDot
              x={peak.date}
              y={max as number}
              r={4}
              fill="var(--wc-series-1)"
              stroke="var(--wc-surface)"
              label={{ value: pointLabel(max as number), position: 'top', fill: 'var(--wc-ink-primary)', fontSize: 12 }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
      {!data.length && (
        <p style={{ position: 'absolute', inset: '40px 0 0 0', display: 'grid', placeItems: 'center', margin: 0, color: 'var(--wc-ink-secondary)' }}>
          {emptyMessage}
        </p>
      )}
    </figure>
  );
}
