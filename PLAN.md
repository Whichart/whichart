# Whichart — Project Plan

> **The reference agents and researchers check before making a chart.**
> Pick the right chart, design it well, handle the edge cases, ship working code.

Status: **Draft for review** · Owner: project creator · Site: <https://whichart.github.io>

---

## 1. Why this exists

Chart catalogs already exist (datavizproject.com, data-to-viz.com, the R/Python Graph Galleries, FT Visual Vocabulary, library galleries). They show *what a chart is* — one chart at a time, on perfect data.

What's still missing, especially now that AI agents generate most chart code:

- **Choosing** — agents and people pick the wrong chart for the data (14-slice pies, dual axes, rainbow scales).
- **Designing** — poor defaults: colour, contrast, number formatting, labels.
- **Edge cases** — nobody documents what a revenue card looks like when the store had zero orders, or when there's no previous period to compare with.
- **Implementation** — turning the right choice into working, consistent code in a real stack.

Whichart is a **decision layer + design standard + tested code**, usable by people *and* agents.

Origin: real pain designing the analytics dashboard for an eCommerce product.

## 2. Scope

- **Data model:** general enough for any chart type.
- **Launch content:** business & product analytics dashboards (eCommerce, SaaS, marketing, ops).
- **v1:** 15 core entries, complete. **After launch:** 19 more, added on a regular cadence.
- **v2:** dashboard layout templates (e.g. "eCommerce overview", "SaaS metrics", "Marketing funnel").
- **Non-goals:** a freeform drag-and-drop BI tool; hosting user data; runtime AI.

## 3. Product surfaces

### 3.1 Homepage — the gallery that responds to your data

One page, always showing the chart grid:

- **No input** → normal gallery, grouped by goal, rendered with sample data.
- **Data dropped** (CSV/JSON, in-browser only) → every card re-renders with *the user's data*, sorted by fit, with plain-language reasons. Unsuitable charts stay visible, greyed out, with a **"why not"** badge.
- **Filters:** Goal (trend, compare, part-of-whole, ranking, flow/funnel, distribution, relationship, KPI) · Space (tile, card, half, full) · **State** (normal + 10 edge cases) applied to the *whole grid*.
- Filters live in the URL (`?goal=trend&state=empty`) — every view is shareable.
- Agent hint on the page: `npx @whichart/mcp`.

### 3.2 Other pages

| Route | Purpose |
|---|---|
| `/charts/<id>` | Live playground first (keeps the user's data) → guidance, use/avoid, alternatives → code tabs (ECharts / Recharts / Plotly), copy, download SVG |
| `/charts/<id>.md` | Clean Markdown version for agents |
| `/goals/<goal>` | How to choose within a goal |
| `/theme` | Paste brand colours → preview everything → download `tokens.json` |
| `/agents` | MCP setup, Agent Skill, `llms.txt`, API reference |

## 4. Content model — one folder per chart

```
charts/<id>/
  chart.yaml            # source of truth
  guide.md              # human guidance (CC BY 4.0)
  data/
    sample.csv          # synthetic, realistic
    states/             # the 10 edge-case datasets
  code/
    echarts.ts          # reference implementation, also renders SVGs in CI
    recharts.tsx
    plotly.py
  (generated)           # previews per state × theme — never hand-edited
```

### 4.1 `chart.yaml` contains

- **Identity:** id, name, aliases, family
- **Purpose tags:** trend, comparison, part-to-whole, distribution, flow, relationship, ranking, geo, single-KPI
- **Data-shape rules** (consumed by the engine): required field roles and counts, cardinality limits, min/max points, penalties vs hard exclusions
- **Use when / avoid when / alternatives**
- **Per-state behaviour** for all 10 states
- **Accessibility notes:** colour-blind safety, text/table fallback

### 4.2 The 10 edge-case states

1. Empty
2. Single point
3. All zeros
4. Outlier
5. Negative values
6. Many series
7. Long labels
8. Large numbers & currencies
9. Gaps in time
10. No previous period

## 5. Recommender — `@whichart/engine`

Deterministic, rule-based TypeScript. **No AI at runtime.** Runs in the browser, in Node, and inside the MCP server — one engine, one rule set.

**Input**
1. **Data** (required) — auto-detects column roles (time, number, category, id, geo) and properties (cardinality, row count, negatives, gaps). User can correct roles.
2. **Goal** (optional) — one of 8; inferred if missing.
3. **Context** (optional) — space, audience (exec glance / analyst), medium (dashboard / report / slide).

**Output**
- Ranked suitable charts: score, plain-language reasons, warnings.
- **Avoid list** with reasons.
- Ready-to-use config for top picks, filled with the user's column names.

Every recommendation is traceable to a rule in a `chart.yaml`.

## 6. Agent access (all v1)

| Layer | Deliverable |
|---|---|
| Static files | `catalog.json` (versioned schema), `/charts/<id>.md`, `llms.txt`, `llms-full.txt` |
| npm | `@whichart/engine` |
| Local MCP | `npx @whichart/mcp` — tools: `recommend_chart`, `get_chart`, `list_charts`, **`review_chart`** |
| Agent Skill | `SKILL.md` bundle: "call `review_chart` before showing any chart" |

Later: hosted MCP (needs a server; out of scope for GitHub-only hosting).

## 7. Design system

- Single **`tokens.json`** → generated ECharts theme, CSS variables (Recharts), Plotly template. No hard-coded colours in examples (CI-enforced).
- 8-colour categorical palette, colour-blind safe, contrast-checked in light **and** dark (CI-enforced).
- Sequential + diverging palettes.
- Status colours (up/down/neutral) **configurable** — red = up in CN/JP/KR finance.
- Light + dark from day one.
- Number formatting via `Intl` — `$1.2M`, `€1.234,56`, `৳1,20,00,000`, compact forms ("1.2k", "12 lakh").
- Brand colour: neutral palette proposed at design-review stage.

## 8. Code targets

| Target | Role |
|---|---|
| **Apache ECharts** | Reference implementation; live playground renderer; server-side SVG export |
| **Recharts** | React / shadcn ecosystem |
| **Plotly (Python)** | Researchers & notebooks — copy-only on site, executed in CI |

KPI tiles, delta badges, tables: plain HTML/CSS + React component.
More libraries (Chart.js, Vega-Lite, matplotlib…) can be added by contributors in the same format.

## 9. Launch content — the core 15

| Group | Entries |
|---|---|
| Single KPI | KPI tile with change · KPI tile with sparkline · Progress / goal meter |
| Trend | Line · Multi-line · Area · Sparkline · Current vs previous period |
| Comparison & ranking | Horizontal bar · Stacked bar · Top-N table with inline bars |
| Part-to-whole | Donut |
| Flow | Funnel |
| Time patterns | Cohort retention heatmap |
| Table | Data table with conditional formatting |

**After launch (19):** bullet chart, gauge, stacked area, column over time, bar + line combo, grouped bar, 100% stacked bar, dot/lollipop, slope chart, treemap, waterfall, sankey, histogram, box plot, scatter, bubble, hour × weekday heatmap, calendar heatmap, choropleth map.

## 10. Tech stack & repo layout

- **Site:** Astro (static) + React islands for interactive parts.
- **Hosting:** GitHub Pages, built & deployed by GitHub Actions.
- **Monorepo** (pnpm workspaces):

```
/
  site/                 # Astro site
  packages/
    engine/             # @whichart/engine
    mcp/                # @whichart/mcp
    tokens/             # tokens.json + generated themes
  charts/               # one folder per chart
  skill/                # Agent Skill bundle
  scripts/              # data generators, SVG renderer, catalog builder
  .github/workflows/
```

## 11. Quality gates (CI)

- Every `chart.yaml` validates against the schema.
- Every code target renders on every state dataset (Plotly executed in Python).
- Contrast + colour-blind checks on tokens.
- No hard-coded colours in examples.
- Recommender test suite passes.
- Generated files are up to date.

## 12. Workflow

- **Claude builds; the owner reviews and decides.** Nothing goes live without the owner's merge.
- **One PR per chart entry**, containing:
  1. Contact-sheet image: 3 libraries × 10 states, light & dark
  2. Plain-language decision summary (use/avoid, state handling, alternatives)
  3. Recommender test cases ("with this data, ranks #2 because…")
  4. Review checklist
  5. Green CI
- Bigger decisions (schema, theme, homepage, scoring) get their own **design-review PRs** first.
- PR layout optimised for GitHub mobile.

## 13. Licensing & governance

| What | License |
|---|---|
| Chart code snippets, sample datasets | **CC0** — copy with no attribution |
| Engine, MCP, site, `chart.yaml` rules | **MIT** |
| Written guides (`guide.md`) | **CC BY 4.0** |

- Free for any purpose — individuals, businesses, AI agents.
- Personal project. **Synthetic data only**; no employer code, designs or data.
- Contributions under **DCO** (`Signed-off-by`), no CLA.
- No visitor tracking. Feedback via GitHub Discussions + "report an issue" link per chart.

## 14. Milestones

| # | Milestone | Contents |
|---|---|---|
| M0 | Foundation | This plan, repo skeleton, licenses, CI scaffold, Pages deploy of a placeholder |
| M1 | Design review | `chart.yaml` schema, `tokens.json` + themes, homepage wireframe |
| M2 | Pattern entries | KPI tile with change, Line — fully done, establishing the template |
| M3 | Engine | `@whichart/engine` + recommender tests |
| M4 | Site | Responsive gallery homepage, chart pages, playground, `/theme` |
| M5 | Remaining core | The other 13 core entries |
| M6 | Agents | Static files, MCP server, Agent Skill, `/agents` |
| M7 | Launch | Polish, accessibility pass, README, announcement |

## 15. Housekeeping (owner)

- [x] GitHub org **Whichart**
- [ ] Repo `whichart.github.io` in the org
- [ ] Claude GitHub App installed on the org with access to the repo
- [ ] Reserve npm org `@whichart`
- [ ] Reserve PyPI `whichart`
- [ ] Reserve GitHub org `whichchart` (misspelling guard → redirect page)
- [ ] Make org membership public; pin the repo on personal profile
