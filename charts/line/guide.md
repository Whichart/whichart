# Line chart

A line chart shows how **one measure changes over time**. It is the default answer to "how are we doing?" on any dashboard: daily revenue, weekly sign-ups, monthly active users.

## When to use it

- One measure, at regular periods (days, weeks, months).
- The reader cares about **direction and shape**: rising, falling, seasonal, a sudden jump.
- At least 3 periods. With fewer, show the number and its change as a [KPI tile](../kpi-tile-delta/).

## When not to

| Situation | Use instead |
|---|---|
| Categories with no order (products, channels) | Horizontal bar |
| 2–5 measures or segments to compare | Multi-line |
| Two measures on different scales | Two charts, or index both to 100. **Never a second y-axis**: the alignment of two scales is arbitrary and invents correlations |
| "This month vs last month" | Current vs previous period |
| The exact numbers matter | A table, or label the points you talk about |

## Anatomy

- **Title is the measure name.** One series means no legend; the title does that job.
- **Y-axis** starts at zero for currency and counts. Compact ticks (`$1.2K`, `৳1.3Cr`) in the reader's locale.
- **X-axis** is real time, not evenly spaced labels, so gaps show as gaps.
- **2px line**, no markers except the highest point, which is labelled with its full value.
- **Crosshair tooltip** with the date and the full value.

## Edge cases

| State | What the chart does |
|---|---|
| Empty | Keeps the axes and frame; shows "No data for this period" in the plot area |
| Single point | One dot with its value labelled |
| All zeros | Flat line on the baseline; y-axis fixed to 0–1 instead of an invented scale |
| Outlier | Linear scale kept; the highest point is labelled. Never clipped, never a silent log scale |
| Negative values | Axis extends below zero; the x-axis sits on zero |
| Long label | Title truncated to 40 characters with "…"; full name in the tooltip |
| Large numbers | Locale-aware compact ticks: `$12.3M` (en-US), `৳1.2Cr` (en-IN, BDT) |
| Gaps in time | Missing days are filled with empty values and the line breaks; it never joins across a closure |
| Many series, no previous period | Not applicable to this chart |

## Accessibility

- A single series in slot 1 (blue) passes 3:1 contrast in both modes.
- Offer the data as a table next to the chart.
- Don't rely on the line's slope alone in text: say "revenue rose 18% over 90 days".

## Code

| Target | File | Notes |
|---|---|---|
| ECharts | `code/echarts.ts` | Returns an option; register the Whichart theme first |
| Recharts | `code/recharts.tsx` | React component; needs `whichart.css` for colours |
| Plotly | `code/plotly_figure.py` | `figure(rows, options)`; apply the Whichart template |

All three take rows of `{ date: 'YYYY-MM-DD', value }` at **daily** intervals, plus `label`, `locale` and `currency`. For weekly or monthly data, change the gap-filling step.
