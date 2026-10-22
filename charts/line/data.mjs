import { rng, days, dailyRevenue } from '../../scripts/lib/data.mjs';

// Daily store revenue. Columns: date, value.
export default function generate() {
  const random = rng(20261001);
  const dates = days('2026-07-01', 90);
  const sample = dailyRevenue(random, dates);
  const usd = { label: 'Revenue', locale: 'en-US', currency: 'USD' };

  const outlier = sample.map((r) => (r.date === '2026-09-12' ? { ...r, value: r.value * 6 } : r));
  const negative = dailyRevenue(rng(7), days('2026-09-01', 30), { base: 260, growth: 0, weekend: 0.1, noise: 0 }).map((r, i) => ({
    ...r,
    value: Math.round(r.value + Math.sin(i * 1.7) * 520 - (i % 9 === 4 ? 900 : 0)),
  }));
  const closed = new Set([...days('2026-08-05', 5), ...days('2026-09-17', 2)]);

  return {
    columns: ['date', 'value'],
    sample: { rows: sample, options: usd },
    states: {
      empty: { rows: [], options: usd },
      singlePoint: { rows: [{ date: '2026-09-28', value: 2140 }], options: usd },
      allZeros: { rows: days('2026-09-01', 30).map((date) => ({ date, value: 0 })), options: usd },
      outlier: { rows: outlier, options: usd },
      negative: { rows: negative, options: { ...usd, label: 'Net revenue after refunds' } },
      longLabels: { rows: sample, options: { ...usd, label: 'Net revenue after refunds, discounts and marketplace fees (all channels)' } },
      largeNumbers: {
        rows: sample.map((r) => ({ ...r, value: r.value * 7300 })),
        options: { label: 'Revenue', locale: 'en-IN', currency: 'BDT' },
      },
      timeGaps: { rows: sample.filter((r) => !closed.has(r.date)), options: usd },
    },
  };
}
