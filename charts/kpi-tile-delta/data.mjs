// One KPI: the current value and the previous period's. Columns: value, previous.
export default function generate() {
  const usd = { label: 'Revenue', locale: 'en-US', currency: 'USD' };
  return {
    columns: ['value', 'previous'],
    sample: { rows: [{ value: 48210, previous: 42890 }], options: usd },
    states: {
      empty: { rows: [], options: usd },
      allZeros: { rows: [{ value: 0, previous: 0 }], options: { label: 'Orders', locale: 'en-US' } },
      outlier: { rows: [{ value: 18420, previous: 1650 }], options: { ...usd, label: 'Flash-sale revenue' } },
      negative: { rows: [{ value: -1240, previous: 800 }], options: { ...usd, label: 'Net profit' } },
      longLabels: {
        rows: [{ value: 64.2, previous: 61.9 }],
        options: { ...usd, label: 'Average order value excluding refunds, shipping and taxes' },
      },
      largeNumbers: { rows: [{ value: 123456789, previous: 98765432 }], options: { label: 'Revenue', locale: 'en-IN', currency: 'BDT' } },
      noPrevious: { rows: [{ value: 5320, previous: null }], options: usd },
    },
  };
}
