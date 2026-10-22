# Charts

One folder per chart. `chart.yaml` is the source of truth; everything else is generated from it or tested against it.

```
charts/<id>/
  chart.yaml        # identity, purpose, data-shape rules, use/avoid, per-state behaviour, a11y
  guide.md          # written guidance (CC BY 4.0)
  data/sample.csv   # synthetic data (CC0)
  data/states/      # the 10 edge-case datasets (CC0)
  code/             # echarts.ts, recharts.tsx, plotly.py (CC0)
```

The schema is `schema/chart.schema.json`; a full example is `schema/examples/line/chart.yaml`. Validate with `pnpm validate`. See [PLAN.md](../PLAN.md#4-content-model--one-folder-per-chart).
