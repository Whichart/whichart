# @whichart/tokens

The single source for Whichart's colours, type and mark sizes, plus themes generated from it.

| File | Use |
|---|---|
| `tokens.json` | Source of truth. Edit this, then run `pnpm --filter @whichart/tokens build`. |
| `generated/whichart.css` | CSS variables (`--wc-series-1`, `--wc-grid`, …) with light and dark mode. |
| `generated/echarts-light.json`, `echarts-dark.json` | `echarts.registerTheme('whichart', theme)` |
| `generated/plotly-light.json`, `plotly-dark.json` | `fig.update_layout(template=…)` |
| `generated/recharts-theme.js` | Colours as CSS variables for Recharts props. |

## Using your own brand

Change the colours in `tokens.json` and run the build. It validates the palette first and refuses to generate themes if a check fails:

- **Lightness band and chroma floor:** every series colour is bright and saturated enough to read as a colour.
- **Colour-blind separation:** neighbouring colours stay distinct under simulated protanopia and deuteranopia (Machado et al. 2009), ΔE ≥ 8 in OKLab ×100, 6–8 only with direct labels.
- **Normal-vision separation:** neighbours at least ΔE 15 apart.
- **Contrast:** marks vs surface (3:1, or labels required), text vs surface (4.5:1), text on accent (4.5:1).
- **Ramps:** sequential steps get steadily darker in one hue; ordinal ramps keep their pale end visible.

Keep the categorical order: it is what keeps neighbours distinct. Scatter plots, maps and small multiples use only the first three colours.

`deltaConvention` switches change colours between `green-up` and `red-up` (as used in Chinese, Japanese and Korean finance).
