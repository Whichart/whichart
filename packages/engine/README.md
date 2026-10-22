# @whichart/engine

Deterministic, rule-based chart recommender. It profiles your data, scores every chart in the catalogue against it using the rules in each `chart.yaml`, and explains every decision. No AI at runtime: the same data always gets the same answer, and every reason traces back to a rule.

```ts
import { recommend, review } from '@whichart/engine';

const r = recommend({ csv, goal: 'trend', context: { space: 'card' } });
r.ranked[0];   // { id: 'line', score: 72, reasons: [...], warnings: [...], encoding: { time: 'date', measures: ['revenue'] } }
r.avoid;       // [{ id: 'kpi-tile-delta', reasons: [{ text, fix, suggest }] }]

review('line', { csv });  // { verdict: 'good' | 'ok' | 'poor' | 'avoid' | 'unknown', summary, problems, better }
```

Input is one of `csv` (text), `rows` (objects) or `profile` (for agents that describe data instead of sending it). Optional: `goal`, `context` (`space`, `audience`, `medium`) and `roles` to correct a column's detected role.

## How it works

1. **Profile.** Each column gets a role (`time`, `measure`, `category`, `ordinal`, `geo`, `id`) and a short `because` explaining why, so people can correct it. Numbers are read in the formats people export (`$1,234.50`, `৳1,20,000`, `(1,200)`, `12%`, `1.234,56`). A numeric column named `previous` or `prior` is treated as a comparison, not a second series. Time columns get an interval (day, week, month…) and a gap count.
2. **Rules.** Each chart's `fit.rules` test profile metrics (`series`, `pointsPerSeries`, `hasTimeGaps`, …) and the goal and context. `exclude` moves a chart to the avoid list; `boost` and `penalty` adjust its score.
3. **Shape.** The chart's `data.fields` must be satisfied (e.g. line needs exactly one time and one measure column). A chart that shows one row can still be suggested for a time series, with a "summarise first" warning.
4. **Score** = 50 + goal fit (±20) + context fit (+8 good, −15 poor) + rule effects (weight × 30), clamped to 0–100.

`catalog.json` is generated from `charts/*/chart.yaml` (`pnpm catalog`); CI fails if it is stale.

## CLI

```sh
pnpm whichart data.csv
pnpm whichart data.csv --goal trend --space tile
pnpm whichart data.csv --review donut
pnpm whichart data.csv --json
```
