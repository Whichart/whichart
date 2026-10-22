"""Build every Plotly figure for every dataset and mode, and print them as JSON.

Usage: python scripts/render/plotly_figures.py charts/line charts/kpi-tile-delta > figures.json
Each chart's code/plotly_figure.py must define figure(rows, options).
"""
import csv
import importlib.util
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
TOKENS = json.loads((ROOT / "packages/tokens/tokens.json").read_text())
TEMPLATES = {m: json.loads((ROOT / f"packages/tokens/generated/plotly-{m}.json").read_text()) for m in ("light", "dark")}


def snake(key: str) -> str:
    return re.sub(r"(?<!^)(?=[A-Z])", "_", key).lower()


def read_rows(path: Path) -> list[dict]:
    rows = []
    with path.open(newline="", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            rows.append({k: (v if k in ("date", "label") else (None if v == "" else float(v))) for k, v in r.items()})
    return rows


def delta_colors(mode: str) -> dict:
    d = TOKENS["modes"][mode]["delta"]
    red_up = TOKENS["deltaConvention"] == "red-up"
    return {"good": d["bad"] if red_up else d["good"], "bad": d["good"] if red_up else d["bad"], "neutral": d["neutral"]}


def load(chart_dir: Path):
    spec = importlib.util.spec_from_file_location(f"wc_{chart_dir.name.replace('-', '_')}", chart_dir / "code/plotly_figure.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.figure


def main(dirs: list[str]) -> None:
    out = {}
    for d in dirs:
        chart_dir = ROOT / d
        figure = load(chart_dir)
        index = json.loads((chart_dir / "data/datasets.json").read_text())
        datasets = {"sample": index["sample"], **index["states"]}
        out[chart_dir.name] = {}
        for key, ds in datasets.items():
            rows = read_rows(chart_dir / "data" / ds["file"])
            out[chart_dir.name][key] = {}
            for mode in ("light", "dark"):
                options = {snake(k): v for k, v in ds["options"].items()}
                options["colors"] = delta_colors(mode)
                try:
                    fig = figure(rows, options)
                    fig.update_layout(template=TEMPLATES[mode])
                    out[chart_dir.name][key][mode] = json.loads(fig.to_json())
                except Exception as e:  # reported by the harness, not fatal here
                    out[chart_dir.name][key][mode] = {"error": f"{type(e).__name__}: {e}"}
    json.dump(out, sys.stdout)


if __name__ == "__main__":
    main(sys.argv[1:])
