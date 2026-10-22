// Helpers for synthetic chart data. Everything is seeded so output is identical on every run.

/** Mulberry32: small, fast, deterministic PRNG. */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** ISO dates (YYYY-MM-DD) for n consecutive days from start. */
export function days(start, n) {
  const d = new Date(`${start}T00:00:00Z`);
  return Array.from({ length: n }, (_, i) => new Date(d.getTime() + i * 864e5).toISOString().slice(0, 10));
}

/** Daily store revenue: weekend uplift, slow growth, noise. */
export function dailyRevenue(random, dates, { base = 1800, growth = 0.004, weekend = 0.25, noise = 0.12 } = {}) {
  return dates.map((date, i) => {
    const dow = new Date(`${date}T00:00:00Z`).getUTCDay();
    const season = dow === 0 || dow === 6 ? 1 + weekend : 1;
    const jitter = 1 + (random() * 2 - 1) * noise;
    return { date, value: Math.round(base * (1 + growth) ** i * season * jitter) };
  });
}

/** Serialise rows to CSV. Columns come from the first row, or `columns` when rows is empty. */
export function toCsv(rows, columns = Object.keys(rows[0] ?? {})) {
  const cell = (v) => (v === null || v === undefined ? '' : String(v));
  for (const r of rows) {
    for (const c of columns) {
      if (/[",\n]/.test(cell(r[c]))) throw new Error(`Value for ${c} contains a delimiter: ${r[c]}`);
    }
  }
  return [columns.join(','), ...rows.map((r) => columns.map((c) => cell(r[c])).join(','))].join('\n') + '\n';
}

/** Parse CSV written by toCsv. `date` and `label` stay strings; other columns become numbers (blank → null). */
export function parseCsv(text) {
  const [head, ...lines] = text.trim().split('\n');
  const cols = head.split(',');
  return lines.map((line) => {
    const cells = line.split(',');
    return Object.fromEntries(
      cols.map((c, i) => {
        const v = cells[i] ?? '';
        if (c === 'date' || c === 'label') return [c, v];
        return [c, v === '' ? null : Number(v)];
      }),
    );
  });
}
