# Charts

One folder per chart. `chart.yaml` is the source of truth; everything else is generated from it or tested against it.

```
charts/<id>/
  chart.yaml            # identity, goals, data shape, fit rules, use/avoid, all 10 states, a11y
  guide.md              # written guidance (CC BY 4.0)
  data.mjs              # seeded generator for the datasets below
  data/
    datasets.json       # generated: which file and options each dataset uses
    sample.csv          # generated, synthetic (CC0)
    states/<state>.csv  # generated, one per applicable edge-case state (CC0)
  code/                 # CC0
    echarts.ts          # charts: the reference implementation
    recharts.tsx
    vanilla.ts          # components with no chart library (KPI tiles, tables)
    react.tsx
    plotly_figure.py
```

`planned.yaml` lists every chart id in the catalogue. Entries can link to planned ids before those charts exist.

## Code contract

Every target takes the same inputs, so one dataset tests them all:

| Target | Shape |
|---|---|
| `echarts.ts` | `export default function (rows, options) → EChartsOption` |
| `recharts.tsx`, `react.tsx` | `export default function Component({ rows, ...options })` |
| `vanilla.ts` | `export default function (el, rows, options): void` |
| `plotly_figure.py` | `def figure(rows, options) -> go.Figure` (options keys in snake_case) |

Rules:

- **Self-contained.** Each file must work when copied on its own. Small helpers (formatters, gap filling) are repeated rather than shared.
- **No colour literals.** Colours come from the ECharts theme, `whichart.css` variables or the Plotly template. CI rejects hex, `rgb()` and `hsl()` in code files.
- **Messages match `chart.yaml`.** A state with `treatment: message` must show exactly that text by default.
- **Locale-aware numbers** via `Intl.NumberFormat` (Python: the bundled formatter), including lakh/crore for South Asian locales.

## Adding an entry

1. Add the id to `planned.yaml` if it isn't there.
2. Write `chart.yaml`. Every state needs a treatment; use `not-applicable` honestly.
3. Write `data.mjs`: a sample plus one dataset per applicable state. Run `pnpm data`.
4. Write the code targets and `guide.md`.
5. Check everything:

```sh
pnpm validate     # schema, links, colour literals, data up to date
pnpm typecheck    # TypeScript
pnpm sheets       # renders every target × dataset × light/dark; writes .render/sheets/*.png
```

`pnpm sheets` needs Python with `pip install -r requirements.txt`, and Chromium (`pnpm exec playwright install chromium`, or set `CHROMIUM_PATH`). It fails on render errors, empty output, `NaN`/`undefined` in the output, overflow, or a missing state message. **Then open the contact sheets and look at them.** The checks can't tell you a chart looks wrong.
