"""Line chart: one measure over time. Plotly (Python).

Usage:
    import json, plotly.io as pio
    fig = figure(rows, {"label": "Revenue", "currency": "USD"})
    fig.update_layout(template=json.load(open("plotly-light.json")))  # from @whichart/tokens
    fig.show()

Rows: [{"date": "2026-07-01", "value": 1722}, ...] at daily intervals. Colours come from the template.
Public domain (CC0): copy, change and ship without attribution.
"""
from datetime import date, timedelta
import math

import plotly.graph_objects as go

MAX_TITLE = 40
COMPACT_FROM = 100_000
SYMBOLS = {"USD": "$", "EUR": "€", "GBP": "£", "INR": "₹", "BDT": "৳", "JPY": "¥"}
# Locales that group in lakh and crore (1,00,000 and 1,00,00,000).
SOUTH_ASIAN = ("-IN", "-BD", "-NP", "-PK", "-LK")


def _indian_grouping(n: int) -> str:
    s = str(n)
    if len(s) <= 3:
        return s
    head, tail = s[:-3], s[-3:]
    groups = []
    while len(head) > 2:
        groups.insert(0, head[-2:])
        head = head[:-2]
    return ",".join([head, *groups, tail]) if head else ",".join([*groups, tail])


def _formatters(locale: str, currency: str | None):
    symbol = SYMBOLS.get(currency, f"{currency} ") if currency else ""
    south_asian = locale.endswith(SOUTH_ASIAN)
    steps = [(1e7, "Cr"), (1e5, "L"), (1e3, "K")] if south_asian else [(1e12, "T"), (1e9, "B"), (1e6, "M"), (1e3, "K")]

    def full(v: float) -> str:
        sign = "-" if v < 0 else ""
        n = round(abs(v))
        digits = _indian_grouping(n) if south_asian else f"{n:,}"
        return f"{sign}{symbol}{digits}"

    def compact(v: float) -> str:
        sign = "-" if v < 0 else ""
        a = abs(v)
        for size, suffix in steps:
            if a >= size:
                return f"{sign}{symbol}{a / size:.1f}".removesuffix(".0") + suffix
        return f"{sign}{symbol}{a:.1f}".removesuffix(".0")

    def point_label(v: float) -> str:
        """Full value when short, compact from 100,000 so it fits."""
        return compact(v) if abs(v) >= COMPACT_FROM else full(v)

    return full, compact, point_label


def _fill_daily_gaps(rows: list[dict]) -> list[tuple[str, float | None]]:
    """Sort by date and insert None for missing days, so the line breaks at gaps."""
    by_date = {r["date"]: r["value"] for r in rows if r.get("date")}
    if not by_date:
        return []
    start, end = date.fromisoformat(min(by_date)), date.fromisoformat(max(by_date))
    days = (end - start).days + 1
    return [((d := (start + timedelta(i)).isoformat()), by_date.get(d)) for i in range(days)]


def _nice_ticks(lo: float, hi: float, count: int = 5) -> list[float]:
    if hi <= lo:
        hi = lo + 1
    raw = (hi - lo) / count
    mag = 10 ** math.floor(math.log10(raw))
    step = next(m * mag for m in (1, 2, 2.5, 5, 10) if m * mag >= raw)
    ticks, t = [], math.floor(lo / step) * step
    while True:
        ticks.append(round(t, 10))
        if t >= hi - step * 1e-9:
            return ticks
        t += step


def figure(rows: list[dict], options: dict | None = None) -> go.Figure:
    o = {"label": "Value", "locale": "en-US", "currency": None, "empty_message": "No data for this period", **(options or {})}
    full, compact, point_label = _formatters(o["locale"], o["currency"])
    label = o["label"]
    title = label if len(label) <= MAX_TITLE else label[: MAX_TITLE - 1].rstrip() + "…"

    data = _fill_daily_gaps(rows)
    x = [d for d, _ in data]
    y = [v for _, v in data]
    values = [v for v in y if v is not None]
    all_zero = bool(values) and all(v == 0 for v in values)
    single = len(data) == 1

    # Mark the highest point (the one people ask about) on the same trace, so it keeps the line's colour.
    peak_i = y.index(max(values)) if values and not all_zero and len(values) >= 3 else None
    sizes = [8 if (single or i == peak_i) else 0 for i in range(len(data))]

    fig = go.Figure(
        go.Scatter(
            x=x,
            y=y,
            name=label,
            mode="lines+markers+text" if single else "lines+markers",
            marker={"size": sizes},
            text=[point_label(v) for v in values] if single else None,
            textposition="top center",
            connectgaps=False,
            customdata=[full(v) if v is not None else "—" for v in y],
            hovertemplate="%{x|%b %d}<br>%{customdata}<extra></extra>",
        )
    )
    if peak_i is not None:
        fig.add_annotation(x=x[peak_i], y=y[peak_i], text=point_label(y[peak_i]), showarrow=False, yshift=14)

    lo, hi = (min(0, *values), max(values)) if values and not all_zero else (0, 1)
    ticks = _nice_ticks(lo, hi) if values and not all_zero else [0, 1]
    fig.update_yaxes(tickvals=ticks, ticktext=[compact(t) for t in ticks], range=[ticks[0], ticks[-1]], zeroline=True)
    fig.update_xaxes(type="date", tickformat="%b %-d", showticklabels=bool(data))
    if single:
        # Daily data: one tick per day, centred on the point.
        d = date.fromisoformat(x[0])
        fig.update_xaxes(range=[(d - timedelta(1)).isoformat(), (d + timedelta(1)).isoformat()], dtick=86400000)

    if not data:
        fig.add_annotation(text=o["empty_message"], xref="paper", yref="paper", x=0.5, y=0.5, showarrow=False)

    fig.update_layout(
        title={"text": title, "x": 0, "xanchor": "left"},
        showlegend=False,
        hovermode="x unified",
        margin={"l": 8, "r": 16, "t": 48, "b": 8},
    )
    return fig
