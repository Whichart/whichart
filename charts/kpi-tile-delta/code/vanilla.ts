// KPI tile with change. Plain DOM, no framework.
// Usage: renderKpiTile(el, [{ value: 48210, previous: 42890 }], { label: 'Revenue', currency: 'USD' });
// Colours are CSS variables from @whichart/tokens/whichart.css.
// Public domain (CC0): copy, change and ship without attribution.

export interface KpiRow {
  value: number | null;
  previous?: number | null;
}

export interface KpiOptions {
  label?: string;
  locale?: string;
  currency?: string;
  /** 'down' for metrics where lower is better (refund rate, churn). */
  goodDirection?: 'up' | 'down';
  comparisonLabel?: string;
  emptyMessage?: string;
  newLabel?: string;
}

export interface Change {
  text: string;
  arrow: '▲' | '▼' | '';
  tone: 'good' | 'bad' | 'neutral';
  spoken: string;
  /** Show as a badge rather than a change line (no previous value). */
  badge?: boolean;
}

const COMPACT_FROM = 100_000;
const MULTIPLE_FROM = 6;

export function formatters(locale: string, currency?: string) {
  const style = currency ? { style: 'currency' as const, currency, currencyDisplay: 'narrowSymbol' as const } : {};
  const full = new Intl.NumberFormat(locale, { ...style, maximumFractionDigits: 2 });
  const whole = new Intl.NumberFormat(locale, { ...style, maximumFractionDigits: 0 });
  const compact = new Intl.NumberFormat(locale, { ...style, notation: 'compact', minimumFractionDigits: 0, maximumFractionDigits: 1 });
  /** Full precision for small numbers, compact from 100,000. */
  const display = (v: number) => (Math.abs(v) >= COMPACT_FROM ? compact.format(v) : Number.isInteger(v) ? whole.format(v) : full.format(v));
  return { display, full: (v: number) => (Number.isInteger(v) ? whole.format(v) : full.format(v)) };
}

/** The change line. Percent only when it means something; otherwise an absolute amount or a multiple. */
export function describeChange(value: number, previous: number | null | undefined, options: KpiOptions = {}): Change {
  const { locale = 'en-US', currency, goodDirection = 'up', comparisonLabel = 'vs previous period', newLabel = 'New' } = options;
  const { display } = formatters(locale, currency);

  if (previous === null || previous === undefined) {
    return { text: newLabel, arrow: '', tone: 'neutral', spoken: `${newLabel}, no previous period to compare`, badge: true };
  }
  const diff = value - previous;
  if (diff === 0) {
    return { text: `No change ${comparisonLabel}`, arrow: '', tone: 'neutral', spoken: `no change ${comparisonLabel}` };
  }

  const up = diff > 0;
  const arrow = up ? '▲' : '▼';
  const tone = up === (goodDirection === 'up') ? 'good' : 'bad';
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

const TONE = { good: 'var(--wc-delta-up)', bad: 'var(--wc-delta-down)', neutral: 'var(--wc-delta-neutral)' };

export default function renderKpiTile(el: HTMLElement, rows: KpiRow[], options: KpiOptions = {}): void {
  const { label = 'Value', locale = 'en-US', currency, emptyMessage = 'No data yet' } = options;
  const { display, full } = formatters(locale, currency);
  const row = rows[0];
  const hasValue = row !== undefined && row.value !== null;

  const tile = document.createElement('div');
  tile.setAttribute('role', 'group');
  Object.assign(tile.style, {
    fontFamily: 'var(--wc-font)',
    background: 'var(--wc-surface)',
    border: '1px solid var(--wc-border)',
    borderRadius: '12px',
    padding: '16px',
    display: 'grid',
    gap: '4px',
    minWidth: '0',
  });

  const name = document.createElement('div');
  name.textContent = label;
  name.title = label;
  Object.assign(name.style, {
    color: 'var(--wc-ink-secondary)',
    fontSize: '14px',
    display: '-webkit-box',
    webkitLineClamp: '2',
    webkitBoxOrient: 'vertical',
    overflow: 'hidden',
  });

  const number = document.createElement('div');
  number.textContent = hasValue ? display(row.value as number) : '—';
  if (hasValue) number.title = full(row.value as number);
  Object.assign(number.style, { color: 'var(--wc-ink-primary)', fontSize: '32px', fontWeight: '600', lineHeight: '1.2' });

  const change = document.createElement('div');
  Object.assign(change.style, { fontSize: '14px', display: 'flex', gap: '4px', alignItems: 'center' });

  if (!hasValue) {
    change.textContent = emptyMessage;
    change.style.color = 'var(--wc-ink-secondary)';
    tile.setAttribute('aria-label', `${label}: ${emptyMessage}`);
  } else {
    const c = describeChange(row.value as number, row.previous, options);
    change.style.color = TONE[c.tone];
    if (c.badge) {
      Object.assign(change.style, { border: '1px solid var(--wc-border)', borderRadius: '999px', padding: '0 8px', justifySelf: 'start' });
    }
    change.textContent = c.arrow ? `${c.arrow} ${c.text}` : c.text;
    tile.setAttribute('aria-label', `${label} ${full(row.value as number)}, ${c.spoken}`);
  }

  tile.append(name, number, change);
  el.replaceChildren(tile);
}
