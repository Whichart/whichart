// KPI tile with change. React, no chart library.
// Usage: <KpiTile rows={[{ value: 48210, previous: 42890 }]} label="Revenue" currency="USD" />
// Colours are CSS variables from @whichart/tokens/whichart.css.
// Public domain (CC0): copy, change and ship without attribution.
import type { CSSProperties } from 'react';

export interface KpiRow {
  value: number | null;
  previous?: number | null;
}

export interface KpiTileProps {
  rows: KpiRow[];
  label?: string;
  locale?: string;
  currency?: string;
  /** 'down' for metrics where lower is better (refund rate, churn). */
  goodDirection?: 'up' | 'down';
  comparisonLabel?: string;
  emptyMessage?: string;
  newLabel?: string;
}

type Tone = 'good' | 'bad' | 'neutral';
interface Change {
  text: string;
  arrow: '▲' | '▼' | '';
  tone: Tone;
  spoken: string;
  badge?: boolean;
}

const COMPACT_FROM = 100_000;
const MULTIPLE_FROM = 6;
const TONE: Record<Tone, string> = { good: 'var(--wc-delta-up)', bad: 'var(--wc-delta-down)', neutral: 'var(--wc-delta-neutral)' };

function formatters(locale: string, currency?: string) {
  const style = currency ? { style: 'currency' as const, currency, currencyDisplay: 'narrowSymbol' as const } : {};
  const decimal = new Intl.NumberFormat(locale, { ...style, maximumFractionDigits: 2 });
  const whole = new Intl.NumberFormat(locale, { ...style, maximumFractionDigits: 0 });
  const compact = new Intl.NumberFormat(locale, { ...style, notation: 'compact', minimumFractionDigits: 0, maximumFractionDigits: 1 });
  const full = (v: number) => (Number.isInteger(v) ? whole.format(v) : decimal.format(v));
  /** Full precision for small numbers, compact from 100,000. */
  const display = (v: number) => (Math.abs(v) >= COMPACT_FROM ? compact.format(v) : full(v));
  return { display, full };
}

/** The change line. Percent only when it means something; otherwise an absolute amount or a multiple. */
function describeChange(value: number, previous: number | null | undefined, p: KpiTileProps): Change {
  const { locale = 'en-US', currency, goodDirection = 'up', comparisonLabel = 'vs previous period', newLabel = 'New' } = p;
  const { display } = formatters(locale, currency);

  if (previous === null || previous === undefined) {
    return { text: newLabel, arrow: '', tone: 'neutral', spoken: `${newLabel}, no previous period to compare`, badge: true };
  }
  const diff = value - previous;
  if (diff === 0) return { text: `No change ${comparisonLabel}`, arrow: '', tone: 'neutral', spoken: `no change ${comparisonLabel}` };

  const up = diff > 0;
  const arrow = up ? '▲' : '▼';
  const tone: Tone = up === (goodDirection === 'up') ? 'good' : 'bad';
  const word = up ? 'up' : 'down';

  // From zero, or across a sign change, a percentage is meaningless: show the amount.
  if (previous === 0 || previous < 0 || Math.sign(value) !== Math.sign(previous)) {
    const amount = `${up ? '+' : '−'}${display(Math.abs(diff))}`;
    return { text: `${amount} ${comparisonLabel}`, arrow, tone, spoken: `${word} ${display(Math.abs(diff))} ${comparisonLabel}` };
  }

  const ratio = value / previous;
  if (ratio >= MULTIPLE_FROM) {
    const multiple = `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(ratio)}×`;
    return { text: `${multiple} ${comparisonLabel}`, arrow, tone, spoken: `${multiple} ${comparisonLabel}` };
  }

  const pct = new Intl.NumberFormat(locale, { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(
    Math.abs(diff / previous),
  );
  return { text: `${pct} ${comparisonLabel}`, arrow, tone, spoken: `${word} ${pct} ${comparisonLabel}` };
}

const tileStyle: CSSProperties = {
  fontFamily: 'var(--wc-font)',
  background: 'var(--wc-surface)',
  border: '1px solid var(--wc-border)',
  borderRadius: 12,
  padding: 16,
  display: 'grid',
  gap: 4,
  minWidth: 0,
};
const labelStyle: CSSProperties = {
  color: 'var(--wc-ink-secondary)',
  fontSize: 14,
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
};

export default function KpiTile(props: KpiTileProps) {
  const { rows, label = 'Value', locale = 'en-US', currency, emptyMessage = 'No data yet' } = props;
  const { display, full } = formatters(locale, currency);
  const row = rows[0];

  if (row === undefined || row.value === null) {
    return (
      <div role="group" aria-label={`${label}: ${emptyMessage}`} style={tileStyle}>
        <div title={label} style={labelStyle}>{label}</div>
        <div style={{ color: 'var(--wc-ink-primary)', fontSize: 32, fontWeight: 600, lineHeight: 1.2 }}>—</div>
        <div style={{ color: 'var(--wc-ink-secondary)', fontSize: 14 }}>{emptyMessage}</div>
      </div>
    );
  }

  const c = describeChange(row.value, row.previous, props);
  const badge: CSSProperties = c.badge ? { border: '1px solid var(--wc-border)', borderRadius: 999, padding: '0 8px', justifySelf: 'start' } : {};
  return (
    <div role="group" aria-label={`${label} ${full(row.value)}, ${c.spoken}`} style={tileStyle}>
      <div title={label} style={labelStyle}>{label}</div>
      <div title={full(row.value)} style={{ color: 'var(--wc-ink-primary)', fontSize: 32, fontWeight: 600, lineHeight: 1.2 }}>
        {display(row.value)}
      </div>
      <div style={{ color: TONE[c.tone], fontSize: 14, display: 'flex', gap: 4, alignItems: 'center', ...badge }}>
        {c.arrow ? `${c.arrow} ${c.text}` : c.text}
      </div>
    </div>
  );
}
