import type { Column, Goal, Interval, Metrics, Profile, Role, Row } from './types.ts';

const HINT = {
  time: /(^|_|\b)(date|time|day|week|month|quarter|year|period|timestamp|created|updated|at)(_|\b|$)/i,
  id: /(^|_|\b)(id|uuid|guid|sku|code|key)(_|\b|$)/i,
  geo: /(^|_|\b)(country|region|state|province|city|district|division|zip|postcode|postal|lat|lon|lng|latitude|longitude|geo)(_|\b|$)/i,
  ordinal: /(^|_|\b)(stage|step|tier|level|rank|band|bucket|phase|grade)(_|\b|$)/i,
  comparison: /(^|_|\b)(previous|prev|prior|last_?(period|month|week|year|quarter)|comparison|baseline)(_|\b|$)/i,
};
const MISSING = new Set(['', 'na', 'n/a', 'null', 'none', '-', '—', 'nan', '#n/a']);
const DAY = 864e5;

export interface ProfileOptions {
  /** Force a role for a column, e.g. a numeric ZIP code that should be geo. */
  roles?: Record<string, Role>;
  /** Column names, needed when there are no rows (a header-only export). */
  columns?: string[];
}

/** Parse "1,234.50", "$1,234", "৳1,20,000", "12%", "(1,200)", "1.234,56" into a number, or null. */
export function parseNumber(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v !== 'string') return null;
  let s = v.trim();
  if (!s || MISSING.has(s.toLowerCase())) return null;
  let sign = 1;
  if (/^\(.*\)$/.test(s)) {
    sign = -1;
    s = s.slice(1, -1);
  }
  const percent = s.endsWith('%');
  s = s.replace(/%$/, '').replace(/[\s $€£¥₹৳₨]|^[A-Z]{3}(?=[\d-])/g, '');
  if (/^[-+]?\d{1,3}(,\d{2,3})+(\.\d+)?$/.test(s)) s = s.replace(/,/g, ''); // 1,234,567 or 1,20,000
  else if (/^[-+]?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, '').replace(',', '.'); // 1.234,56
  else if (/^[-+]?\d+,\d+$/.test(s)) s = s.replace(',', '.'); // 12,5
  if (!/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(s)) return null;
  const n = sign * Number(s);
  return percent ? n / 100 : n;
}

/** Parse a date-like value to a UTC timestamp, or null. Bare numbers are not dates. */
export function parseDate(v: unknown): number | null {
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v.getTime();
  if (typeof v !== 'string') return null;
  const s = v.trim();
  let m = s.match(/^(\d{4})-(\d{2})(?:-(\d{2}))?(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (m) return Date.UTC(+m[1], +m[2] - 1, m[3] ? +m[3] : 1, m[4] ? +m[4] : 0, m[5] ? +m[5] : 0, m[6] ? +m[6] : 0);
  m = s.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (m) return Date.UTC(+m[1], +m[2] - 1, +m[3]);
  m = s.match(/^(\d{4})-?Q([1-4])$/i);
  if (m) return Date.UTC(+m[1], (+m[2] - 1) * 3, 1);
  // "Jul 2026", "1 July 2026", "07/01/2026": only with a 4-digit year, to avoid treating labels as dates.
  if (/\b\d{4}\b/.test(s) && /[a-z/]/i.test(s)) {
    const t = Date.parse(`${s} UTC`) || Date.parse(s);
    return Number.isNaN(t) ? null : t;
  }
  return null;
}

function interval(times: number[]): { interval: Interval; gaps: number } {
  if (times.length < 2) return { interval: 'irregular', gaps: 0 };
  const diffs = times.slice(1).map((t, i) => t - times[i]);
  const median = [...diffs].sort((a, b) => a - b)[Math.floor(diffs.length / 2)];
  const d = median / DAY;
  const kind: Interval =
    d <= 1 / 16 ? 'hour' : d <= 1.5 ? 'day' : d >= 6 && d <= 8 ? 'week' : d >= 27 && d <= 32 ? 'month' : d >= 85 && d <= 95 ? 'quarter' : d >= 360 && d <= 370 ? 'year' : 'irregular';
  const gaps = kind === 'irregular' ? 0 : diffs.filter((x) => x > median * 1.5).length;
  return { interval: kind, gaps };
}

function classify(name: string, values: unknown[], rows: number, forced?: Role): Omit<Column, 'name' | 'missing' | 'distinct'> {
  const present = values.filter((v) => !(v === null || v === undefined || (typeof v === 'string' && MISSING.has(v.trim().toLowerCase()))));
  const share = (f: (v: unknown) => unknown) => (present.length ? present.filter((v) => f(v) !== null).length / present.length : 0);
  const numeric = share(parseNumber);
  const dates = share(parseDate);
  const distinct = new Set(present.map(String)).size;

  if (forced) return { role: forced, because: 'set by you' };
  if (!present.length) {
    // No values (an empty export): guess from the name so the empty state still gets the right chart.
    const guess: Role = HINT.time.test(name)
      ? 'time'
      : HINT.geo.test(name)
        ? 'geo'
        : HINT.ordinal.test(name)
          ? 'ordinal'
          : HINT.id.test(name)
            ? 'id'
            : /(^|_|\b)(name|label|channel|category|type|segment|source|product|status)(_|\b|$)/i.test(name)
              ? 'category'
              : 'measure';
    return { role: guess, ...(guess === 'measure' && HINT.comparison.test(name) ? { comparison: true } : {}), because: 'no values yet; guessed from the name' };
  }
  if (dates >= 0.9 && numeric < 0.9) return { role: 'time', because: 'values are dates' };
  if (numeric >= 0.9) {
    const nums = present.map(parseNumber) as number[];
    const years = nums.every((n) => Number.isInteger(n) && n >= 1900 && n <= 2100);
    if (years && /year/i.test(name)) return { role: 'time', because: 'a column of years' };
    if (HINT.id.test(name) && distinct === present.length) return { role: 'id', because: 'name looks like an identifier and every value is unique' };
    if (HINT.geo.test(name)) return { role: 'geo', because: 'name looks like a place (numeric codes)' };
    if (HINT.comparison.test(name)) return { role: 'measure', comparison: true, because: "numbers for the previous period" };
    return { role: 'measure', because: 'values are numbers' };
  }
  if (HINT.geo.test(name)) return { role: 'geo', because: 'name looks like a place' };
  if (HINT.ordinal.test(name)) return { role: 'ordinal', because: 'name suggests ordered stages or tiers' };
  if (HINT.id.test(name) && distinct === present.length) return { role: 'id', because: 'name looks like an identifier and every value is unique' };
  if (distinct === present.length && rows >= 20 && distinct > 50) return { role: 'id', because: 'every value is unique' };
  return { role: 'category', because: 'text labels' };
}

export function profile(rows: Row[], options: ProfileOptions = {}): Profile {
  const names = [...new Set([...(options.columns ?? []), ...rows.flatMap((r) => Object.keys(r))])];
  const columns: Column[] = names.map((name) => {
    const values = rows.map((r) => r[name]);
    const c = classify(name, values, rows.length, options.roles?.[name]);
    const present = values.filter((v) => v !== null && v !== undefined && !(typeof v === 'string' && MISSING.has(v.trim().toLowerCase())));
    const col: Column = { name, ...c, distinct: new Set(present.map(String)).size, missing: values.length - present.length } as Column;
    if (col.role === 'measure') {
      const nums = present.map(parseNumber).filter((n): n is number => n !== null);
      if (nums.length) {
        col.min = Math.min(...nums);
        col.max = Math.max(...nums);
      }
    } else if (col.role === 'time') {
      const times = [...new Set(present.map(parseDate).filter((t): t is number => t !== null))].sort((a, b) => a - b);
      Object.assign(col, interval(times));
    } else {
      col.maxLength = Math.max(0, ...present.map((v) => String(v).length));
    }
    return col;
  });

  const of = (role: Role) => columns.filter((c) => c.role === role);
  const time = of('time')[0];
  const measures = of('measure').filter((c) => !c.comparison);
  const category = of('category')[0] ?? of('geo')[0];
  const ordinal = of('ordinal')[0];
  const primary = measures[0];
  const values = primary ? rows.map((r) => parseNumber(r[primary.name])).filter((n): n is number => n !== null) : [];
  const allMeasureValues = measures.flatMap((m) => rows.map((r) => parseNumber(r[m.name])).filter((n): n is number => n !== null));
  const abs = values.map(Math.abs).filter((v) => v > 0).sort((a, b) => a - b);
  const median = abs.length ? abs[Math.floor(abs.length / 2)] : 0;
  const series = time && category ? category.distinct : Math.max(1, measures.length);
  const pointsPerSeries = time ? time.distinct : category ? category.distinct : ordinal ? ordinal.distinct : rows.length;

  const metrics: Metrics = {
    rows: rows.length,
    timeFields: of('time').length,
    measureFields: measures.length,
    categoryFields: of('category').length,
    ordinalFields: of('ordinal').length,
    geoFields: of('geo').length,
    categories: category?.distinct ?? ordinal?.distinct ?? 0,
    series,
    pointsPerSeries,
    hasNegatives: allMeasureValues.some((v) => v < 0),
    allZeros: allMeasureValues.length > 0 && allMeasureValues.every((v) => v === 0),
    hasTimeGaps: (time?.gaps ?? 0) > 0,
    hasPrevious: of('measure').some((c) => c.comparison && c.distinct > 0) || (time?.distinct ?? 0) >= 2,
    maxLabelLength: Math.max(0, ...columns.filter((c) => c.maxLength !== undefined).map((c) => c.maxLength as number)),
    outlierRatio: median ? Math.max(...abs) / median : 1,
    sumsToWhole: !!category && measures.length > 0 && !allMeasureValues.some((v) => v < 0),
  };

  return { columns, metrics, goals: inferGoals(metrics), summary: summarise(columns, rows.length) };
}

function inferGoals(m: Metrics): Goal[] {
  const goals: Goal[] = [];
  if (m.measureFields === 0 && m.rows === 0) return ['kpi'];
  if (m.timeFields && m.measureFields) goals.push('trend');
  if (!m.timeFields && m.rows <= 1 && m.measureFields) goals.push('kpi');
  if (m.ordinalFields && m.measureFields) goals.push('flow');
  if (m.categoryFields && m.measureFields) goals.push('compare', 'ranking');
  if (m.series > 1 && m.timeFields) goals.push('compare');
  if (m.sumsToWhole && m.categories <= 6 && m.categories >= 2) goals.push('part-of-whole');
  if (!m.timeFields && !m.categoryFields && m.measureFields >= 2 && m.rows >= 10) goals.push('relationship');
  if (!m.timeFields && !m.categoryFields && m.measureFields === 1 && m.rows >= 20) goals.push('distribution');
  if (m.timeFields && m.measureFields) goals.push('kpi');
  return [...new Set(goals)];
}

function summarise(columns: Column[], rows: number): string {
  const parts = columns.map((c) => {
    if (c.role === 'time') return `${c.name} (${c.interval === 'irregular' ? 'dates' : `${c.interval}ly`.replace('dayly', 'daily')})`;
    if (c.role === 'measure') return c.comparison ? `${c.name} (previous)` : c.name;
    if (c.role === 'id') return `${c.name} (id)`;
    return `${c.name} (${c.distinct} ${c.role === 'geo' ? 'places' : 'values'})`;
  });
  return [`${rows} row${rows === 1 ? '' : 's'}`, ...parts].join(' · ');
}
