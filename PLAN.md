# Whichart — Project Plan

> **Modern data visualization examples, tested on real data.**
> Find the right chart for your dashboard, see how it handles empty, messy and edge-case data, and copy code that works: ECharts, Recharts and Plotly.

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

Origin: real pain designing the analytics dashboard for an eCommerce product. Conversations with other builders confirmed it: **it's hard to find data viz examples that are both solid and modern**; the well-known catalogues haven't been updated in years.

### 1.1 Who it's for

| Audience | How they think | What they need from Whichart |
|---|---|---|
| **Builders**: product designers and frontend developers making analytics pages and admin dashboards | In metrics and questions: "this month vs last", "where do users drop off" | Modern examples, the right chart for the question, edge cases, ready code |
| **AI coding agents** working for builders | Whatever the builder asks for | Machine-readable rules, `review_chart`, code. Reached through builders (MCP, Agent Skill) |
| **Researchers and university groups** | In figures for results: comparison with uncertainty, distributions | Shared chart types now; scientific charts and matplotlib/ggplot2 in a later phase, plus listings in library research guides |

The real gap: **the step between "I have this metric" and "a chart that ships and survives real data"**, increasingly taken by an agent on someone's behalf.

## 2. Scope

- **Data model:** general enough for any chart type.
- **Launch content:** business & product analytics dashboards (eCommerce, SaaS, marketing, ops).
- **v1:** 15 core entries, complete. **After launch:** 19 more, added on a regular cadence.
- **v2:** dashboard layout templates (e.g. "eCommerce overview", "SaaS metrics", "Marketing funnel").
- **Non-goals:** a freeform drag-and-drop BI tool; hosting user data; runtime AI.

## 3. Product surfaces

### 3.1 Homepage: browse first

Modelled on reference libraries like Mobbin (visual-first, search-first, dense grid of modern previews), but free with no account.

```
whichart      Patterns · Charts · Edge cases · For agents
Modern data visualization examples, tested on real data
[ Search "funnel", "stat card", "show drop-off"…  ]  [Try your data]
eCommerce · SaaS · Marketing · Finance · Operations
Patterns grid → Edge cases grid → Charts A–Z → For agents: npx @whichart/mcp
```

- **Search** understands chart names, synonyms ("stat card", "doughnut") and questions ("drop off" → funnel).
- **Patterns lead** the grid (see 4.3). Charts are the second tab.
- **Try your data** is a mode, not the front door: drop a CSV and the same grid re-ranks with reasons and a "not a good fit" section.
- **Edge-case filter** switches every card to one state at once (empty, new store, zeros…).
- Filters live in the URL, so every view is shareable.

### 3.2 Pages

| Route | Purpose |
|---|---|
| `/patterns/<id>/` | A builder's question, the recommended chart in context, alternatives, why, edge cases, code |
| `/charts/<id>/` | Live playground → guidance, use/avoid, alternatives → code tabs, copy, download SVG |
| `/charts/<id>.md` | Clean Markdown version for agents |
| `/categories/<goal>/` | How to choose within a category |
| `/industries/<id>/` | Patterns for eCommerce, SaaS, Marketing, Finance, Operations (Research later) |
| `/theme/` | Paste brand colours → preview everything → download `tokens.json` |
| `/agents/` | Copy-paste setup for Claude Code, Cursor, Windsurf, VS Code; MCP, Agent Skill, `llms.txt`, API |

### 3.3 Vocabulary

Visible labels use the terms library guides and textbooks use; internal ids stay as they are.

| id | Label | Synonyms |
|---|---|---|
| `trend` | Change over time | trend, time series |
| `compare` | Comparison | compare |
| `part-of-whole` | Parts of a whole | composition, share |
| `ranking` | Ranking | top N, leaderboard |
| `flow` | Flow & funnels | conversion, drop-off |
| `distribution` | Distribution | spread, histogram |
| `relationship` | Relationship | correlation |
| `kpi` | Single number | KPI, metric, big number |

Every chart has **at least 3 synonyms**, including the "graph"/"plot" form of its name (e.g. KPI tile: stat card, scorecard, big number, metric card; cohort heatmap: retention chart, cohort analysis).

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

### 4.2 Patterns

A pattern is a builder's question answered with charts. It holds no code; it references chart entries and adds framing.

```yaml
id: where-users-drop-off
question: Where do users drop off?
industries: [ecommerce, saas]
recommended: funnel
alternatives: [bar-horizontal]
why: Ordered stages with shrinking counts; the gaps are the story.
```

Launch set (about 15–20), e.g. *Show a KPI and how it changed · This period vs the last · Where do users drop off? · Are customers coming back? · What sells best? · Where does revenue come from? · Are we on track for the target? · How is revenue trending?*

### 4.3 The 10 edge-case states

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
- Default palette: 8 categorical colours validated in both modes (see `/preview/theme/`). UI accent is blue step 500 in light mode so white text passes 4.5:1.
- Never a dual-axis chart. Two measures on different scales become two charts, small multiples, or both indexed to 100.

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

**After launch (19):** bullet chart, gauge, stacked area, column over time, bar + line on one shared axis (never a second y-axis), grouped bar, 100% stacked bar, dot/lollipop, slope chart, treemap, waterfall, sankey, histogram, box plot, scatter, bubble, hour × weekday heatmap, calendar heatmap, choropleth map.

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

## 13a. Discoverability (all free)

**Titles and descriptions**

| Where | Text |
|---|---|
| Site title | Whichart: Modern data visualization examples, tested on real data |
| Homepage sub-line | Find the right chart for your dashboard, see how it handles empty, messy and edge-case data, and copy code that works: ECharts, Recharts and Plotly. |
| Meta description | Modern chart examples for product dashboards, tested on real data. Pick the right chart, handle edge cases, and copy ready code for ECharts, Recharts and Plotly. |
| GitHub / npm | Modern data visualization examples, tested on real data. Chart guidance, edge cases and ready code for people and AI agents. |
| Chart page | `{Name}: when to use it, examples & code \| Whichart` |
| Pattern page | `{Question} {chart} example \| Whichart` |
| Category page | `{Label} charts: which to use \| Whichart` |

Every page: clean URL, its own preview image for link sharing, structured data, synonyms in the visible text, sitemap.

**For people:** Google (chart names and synonyms), link previews, university library research guides (submit once content is live), dataviz communities.

**For agents:** official MCP Registry plus Smithery, Glama and mcp.so; npm keywords; GitHub topics; `llms.txt` / `llms-full.txt`; Agent Skill directories; the `/agents/` setup page.

## 14. Milestones

| # | Milestone | Contents |
|---|---|---|
| M0 | Foundation | This plan, repo skeleton, licenses, CI scaffold, Pages deploy of a placeholder |
| M1 | Design review | `chart.yaml` schema, `tokens.json` + themes, homepage wireframe |
| M2 | Pattern entries | KPI tile with change, Line — fully done, establishing the template |
| M3 | Engine | `@whichart/engine` + recommender tests |
| M4 | Site | Browse-first homepage with search, patterns (incl. pattern entries and vocabulary), chart pages, playground, "Try your data", `/theme`, titles, preview images, sitemap |
| M5 | Remaining core | The other 13 core entries and the launch patterns |
| M6 | Agents | Static files, MCP server, Agent Skill, `/agents` |
| M7 | Launch | Polish, accessibility pass, README, announcement, directory and library-guide submissions |

## 15. Housekeeping (owner)

- [x] GitHub org **Whichart**
- [ ] Repo `whichart.github.io` in the org
- [ ] Claude GitHub App installed on the org with access to the repo
- [ ] Reserve npm org `@whichart`
- [ ] Reserve PyPI `whichart`
- [ ] Reserve GitHub org `whichchart` (misspelling guard → redirect page)
- [ ] Make org membership public; pin the repo on personal profile
- [ ] Repo description, website and topics (see 13a; settings can't be changed from Claude's session)
