"""KPI tile with change. Plotly (Python), for notebooks and Dash.

Usage:
    import json
    tokens = json.load(open("tokens.json"))  # from @whichart/tokens
    delta = tokens["modes"]["light"]["delta"]
    fig = figure([{"value": 48210, "previous": 42890}], {"label": "Revenue", "currency": "USD", "colors": delta})
    fig.update_layout(template=json.load(open("plotly-light.json")))
    fig.show()

Public domain (CC0): copy, change and ship without attribution.
"""
import plotly.graph_objects as go

COMPACT_FROM = 100_000
MULTIPLE_FROM = 6
MAX_LINE = 32
SYMBOLS = {"USD": "$", "EUR": "€", "GBP": "£", "INR": "₹", "BDT": "৳", "JPY": "¥"}
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
        a = abs(v)
        whole = int(a)
        digits = _indian_grouping(whole) if south_asian else f"{whole:,}"
        # Currency keeps two decimals (64.20); plain numbers drop trailing zeros (3.5).
        frac = "" if a == whole else f"{a - whole:.2f}"[1:] if currency else f"{a - whole:.2f}"[1:].rstrip("0")
        return f"{sign}{symbol}{digits}{frac}"

    def display(v: float) -> str:
        if abs(v) < COMPACT_FROM:
            return full(v)
        sign = "-" if v < 0 else ""
        a = abs(v)
        for size, suffix in steps:
            if a >= size:
                return f"{sign}{symbol}{a / size:.1f}".removesuffix(".0") + suffix
        return full(v)

    return full, display


def describe_change(value: float, previous: float | None, o: dict) -> tuple[str, str]:
    """Return (text, tone). Percent only when it means something; otherwise an amount or a multiple."""
    _, display = _formatters(o["locale"], o["currency"])
    label = o["comparison_label"]
    if previous is None:
        return o["new_label"], "neutral"
    diff = value - previous
    if diff == 0:
        return f"No change {label}", "neutral"
    up = diff > 0
    arrow = "▲" if up else "▼"
    tone = "good" if up == (o["good_direction"] == "up") else "bad"
    # From zero, or across a sign change, a percentage is meaningless: show the amount.
    if previous <= 0 or (value < 0) != (previous < 0) or value == 0:
        return f"{arrow} {'+' if up else '−'}{display(abs(diff))} {label}", tone
    ratio = value / previous
    if ratio >= MULTIPLE_FROM:
        return f"{arrow} {ratio:.1f}".removesuffix(".0") + f"× {label}", tone
    return f"{arrow} {abs(diff / previous) * 100:.1f}% {label}", tone


def _wrap(text: str) -> str:
    """At most two lines, then an ellipsis."""
    words, lines, line = text.split(), [], ""
    for w in words:
        if len(line) + len(w) + 1 > MAX_LINE and line:
            lines.append(line)
            line = w
        else:
            line = f"{line} {w}".strip()
    lines.append(line)
    if len(lines) > 2:
        lines = [lines[0], lines[1][: MAX_LINE - 1].rstrip() + "…"]
    return "<br>".join(lines)


def figure(rows: list[dict], options: dict | None = None) -> go.Figure:
    o = {
        "label": "Value",
        "locale": "en-US",
        "currency": None,
        "good_direction": "up",
        "comparison_label": "vs previous period",
        "empty_message": "No data yet",
        "new_label": "New",
        "colors": None,  # {"good": ..., "bad": ..., "neutral": ...} from tokens.json delta
        **(options or {}),
    }
    full, display = _formatters(o["locale"], o["currency"])
    colors = o["colors"] or {}
    row = rows[0] if rows else None
    has_value = row is not None and row.get("value") is not None

    if has_value:
        big = display(row["value"])
        change, tone = describe_change(row["value"], row.get("previous"), o)
    else:
        big, change, tone = "—", o["empty_message"], "neutral"

    fig = go.Figure()
    common = {"xref": "paper", "yref": "paper", "x": 0, "xanchor": "left", "showarrow": False, "align": "left"}
    fig.add_annotation(text=_wrap(o["label"]), y=1, yanchor="top", font={"size": 14, "color": colors.get("neutral")}, **common)
    fig.add_annotation(text=f"<b>{big}</b>", y=0.5, yanchor="middle", font={"size": 32}, hovertext=full(row["value"]) if has_value else None, **common)
    fig.add_annotation(text=change, y=0, yanchor="bottom", font={"size": 14, "color": colors.get(tone)}, **common)
    fig.update_xaxes(visible=False)
    fig.update_yaxes(visible=False)
    fig.update_layout(height=160, margin={"l": 16, "r": 16, "t": 16, "b": 16}, showlegend=False)
    return fig
