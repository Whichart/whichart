# KPI tile with change

One headline number and how it moved since the previous period. A row of 3–5 of these usually leads an analytics dashboard: revenue, orders, conversion rate, average order value.

## When to use it

- The reader needs **one number at a glance**, plus whether it went up or down.
- Space is small: a dashboard tile or a card.

## When not to

| Situation | Use instead |
|---|---|
| The shape of recent history matters | KPI tile with sparkline, or a line chart |
| The number is measured against a target | Progress / goal meter |
| Several categories to compare | Bar chart or table |

## The change line: rules

A percentage change is the default, but it is often wrong. The tile picks the honest form:

| Situation | Shows | Why |
|---|---|---|
| Normal | `▲ 12.4% vs previous period` | |
| No previous value (new store, new metric) | `New` badge | There is nothing to compare with; "+∞%" or "0%" would mislead |
| No change | `No change vs previous period`, grey | "0.0%" in green or red implies movement |
| Previous was zero, or the sign flipped (profit → loss) | `▼ −$2,040 vs previous period` | A percentage from zero is undefined; across a sign change it's meaningless |
| 6× or more | `▲ 11.2× vs previous period` | "+1,016%" is hard to read |
| No current value | `—` and `No data yet` | A dash, not zero: zero is a real value |

**Colour follows meaning, not direction.** Set `goodDirection: 'down'` for metrics where lower is better (refund rate, churn, cost per order), and a rise turns red. The arrow and sign are always shown, so colour is never the only cue.

## Anatomy

- **Label** in secondary ink; wraps to two lines, then truncates. Full text in the tooltip.
- **Value** large (32px) and in primary ink. Below 100,000 it shows in full (`$48,210`); above, compact in the reader's locale (`$1.2M`, `৳12.3Cr`), with the full value in the tooltip.
- **Change** with arrow, sign and comparison period.

## Edge cases

| State | What the tile does |
|---|---|
| Empty | `—` with "No data yet" |
| All zeros | `0` and "No change" in grey |
| Outlier | Multiple instead of percentage from 6× |
| Negative values | Value keeps its sign; a sign flip shows the absolute change |
| Long label | Two lines, then ellipsis; full label in tooltip |
| Large numbers | Locale-aware compact value; full value in tooltip |
| No previous period | `New` badge |
| Single point, many series, gaps in time | Not applicable |

## Accessibility

- The tile has an accessible name that reads as a sentence: "Revenue $48,210, up 12.4% vs previous period".
- Change colours meet 4.5:1 text contrast in both modes.

## Code

| Target | File | Notes |
|---|---|---|
| Plain DOM | `code/vanilla.ts` | `renderKpiTile(el, rows, options)` |
| React | `code/react.tsx` | `<KpiTile rows={…} />`, no chart library |
| Plotly | `code/plotly_figure.py` | For notebooks and Dash; pass the delta colours from `tokens.json` |

`rows` is `[{ value, previous }]`: aggregate the period first. Options: `label`, `locale`, `currency`, `goodDirection`, `comparisonLabel`, `emptyMessage`, `newLabel`.
