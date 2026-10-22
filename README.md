# Whichart

**The reference agents and researchers check before making a chart.**

Pick the right chart, design it well, handle the edge cases, ship working code.

- **Choose:** drop your data in and every chart is ranked against it, with reasons why and why not.
- **Edge cases:** see how each chart behaves with empty data, zeros, outliers, long labels, gaps in time, no previous period and more.
- **Code:** tested ECharts, Recharts and Plotly (Python) examples sharing one theme built from swappable design tokens.
- **For agents:** a JSON catalog, `llms.txt`, a local MCP server and an Agent Skill.

Site: <https://whichart.github.io> · Status: early development. See [PLAN.md](PLAN.md).

## Repository layout

```
site/        Astro site (GitHub Pages)
packages/    engine, mcp, tokens
charts/      one folder per chart
skill/       Agent Skill bundle
```

## Development

Requires Node 22+ and pnpm.

```sh
pnpm install
pnpm dev      # local site at http://localhost:4321
pnpm build    # static build in site/dist
```

## Licensing

Free for any purpose: individuals, businesses and AI agents.

| What | License |
|---|---|
| Chart code snippets (`charts/*/code/`) and sample data (`charts/*/data/`) | [CC0 1.0](LICENSES/CC0-1.0.txt): copy freely, no attribution needed |
| Engine, MCP server, site, `chart.yaml` rules, everything else | [MIT](LICENSE) |
| Written guides (`charts/*/guide.md`) | [CC BY 4.0](LICENSES/CC-BY-4.0.txt): credit Whichart when republishing |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).
