#!/usr/bin/env node
// Renders every code target of every chart on every dataset, in light and dark mode,
// in headless Chromium, and fails if anything breaks.
//
//   node scripts/render/run.mjs            # check all charts
//   node scripts/render/run.mjs line       # check one chart
//   node scripts/render/run.mjs --sheet    # also write contact sheets to .render/sheets/
//   node scripts/render/run.mjs --previews=site/public/previews
//                                          # reference target only, one PNG per dataset and mode (no Python)
//
// Env: PYTHON (default python3) for Plotly figures; CHROMIUM_PATH to use a specific browser.
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { build } from 'esbuild';
import { chromium } from 'playwright';
import { parse } from 'yaml';
import { parseCsv } from '../lib/data.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const out = join(root, '.render');
const args = process.argv.slice(2);
const sheet = args.includes('--sheet');
const previews = args.find((a) => a.startsWith('--previews='))?.split('=')[1];
const only = args.filter((a) => !a.startsWith('--'));
const MODES = ['light', 'dark'];
const BROWSER_TARGETS = ['echarts', 'recharts', 'react', 'vanilla'];
const SIZE = { chart: { width: 480, height: 300 }, component: { width: 300, height: 170 } };

// -- discover ------------------------------------------------------------------
const charts = readdirSync(join(root, 'charts'))
  .filter((id) => existsSync(join(root, 'charts', id, 'data/datasets.json')))
  .filter((id) => !only.length || only.includes(id))
  .map((id) => {
    const dir = join(root, 'charts', id);
    const doc = parse(readFileSync(join(dir, 'chart.yaml'), 'utf8'));
    const index = JSON.parse(readFileSync(join(dir, 'data/datasets.json'), 'utf8'));
    const datasets = [['sample', index.sample], ...Object.entries(index.states)].map(([key, d]) => ({
      key,
      options: d.options,
      rows: parseCsv(readFileSync(join(dir, 'data', d.file), 'utf8')),
    }));
    const all = Object.keys(doc.code);
    // Previews show the reference implementation only: ECharts for charts, plain DOM for components.
    const targets = previews ? [doc.code.echarts ? 'echarts' : 'vanilla'] : all;
    return { id, dir, doc, datasets, targets, kind: doc.code.echarts ? 'chart' : 'component' };
  });

if (!charts.length) {
  console.error('No charts with data found.');
  process.exit(1);
}

const failures = [];
const fail = (where, msg) => failures.push(`${where}: ${msg}`);

// Every applicable state needs a dataset, and every dataset needs a state.
for (const c of charts) {
  for (const [state, s] of Object.entries(c.doc.states)) {
    const has = c.datasets.some((d) => d.key === state);
    if (s.treatment !== 'not-applicable' && !has) fail(`${c.id}/${state}`, 'state has no dataset in data.mjs');
    if (s.treatment === 'not-applicable' && has) fail(`${c.id}/${state}`, 'dataset exists for a not-applicable state');
  }
}

// -- Plotly figures (Python) -----------------------------------------------------
let figures = {};
const withPlotly = charts.filter((c) => c.targets.includes('plotly'));
if (withPlotly.length) {
  const python = process.env.PYTHON ?? 'python3';
  const json = execFileSync(python, [join(root, 'scripts/render/plotly_figures.py'), ...withPlotly.map((c) => `charts/${c.id}`)], {
    cwd: root,
    maxBuffer: 256 * 1024 * 1024,
  });
  figures = JSON.parse(json);
}

// -- browser bundle ----------------------------------------------------------------
mkdirSync(out, { recursive: true });
const imports = [];
const registry = [];
charts.forEach((c, i) => {
  const entries = [];
  for (const t of c.targets.filter((t) => BROWSER_TARGETS.includes(t))) {
    const name = `c${i}_${t}`;
    imports.push(`import ${name} from ${JSON.stringify(join(c.dir, c.doc.code[t]))};`);
    entries.push(`${t}: ${name}`);
  }
  registry.push(`${JSON.stringify(c.id)}: { ${entries.join(', ')} }`);
});
const tokens = (f) => JSON.stringify(join(root, 'packages/tokens/generated', f));
writeFileSync(
  join(out, 'entry.tsx'),
  `import * as echarts from 'echarts';
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import Plotly from 'plotly.js-dist-min';
import light from ${tokens('echarts-light.json')};
import dark from ${tokens('echarts-dark.json')};
${imports.join('\n')}
echarts.registerTheme('whichart-light', light);
echarts.registerTheme('whichart-dark', dark);
const targets = { ${registry.join(',\n')} };
(window as any).WC = {
  async render(target: string, id: string, el: HTMLElement, rows: any[], options: any, mode: string, figure?: any) {
    if (target === 'plotly') {
      if (figure.error) throw new Error(figure.error);
      await Plotly.newPlot(el, figure.data, { ...figure.layout, width: el.clientWidth, height: el.clientHeight }, { staticPlot: true });
      return;
    }
    const fn = (targets as any)[id][target];
    if (target === 'echarts') {
      // Animation off so screenshots show the finished chart.
      echarts.init(el, 'whichart-' + mode, { renderer: 'svg' }).setOption({ ...fn(rows, options), animation: false });
    } else if (target === 'recharts' || target === 'react') {
      const root = createRoot(el);
      flushSync(() => root.render(createElement(fn, { rows, ...options })));
    } else if (target === 'vanilla') {
      fn(el, rows, options);
    }
  },
};
`,
);
await build({
  entryPoints: [join(out, 'entry.tsx')],
  bundle: true,
  format: 'iife',
  outfile: join(out, 'bundle.js'),
  jsx: 'automatic',
  logLevel: 'error',
  define: { 'process.env.NODE_ENV': '"production"' },
});
writeFileSync(
  join(out, 'index.html'),
  `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="${join(root, 'packages/tokens/generated/whichart.css')}">
<style>
  body { margin: 0; padding: 24px; background: var(--wc-page); color: var(--wc-ink-primary); font: 13px/1.4 var(--wc-font); }
  h1 { font-size: 18px; margin: 0 0 16px; }
  table { border-collapse: separate; border-spacing: 12px; }
  th { text-align: left; font-weight: 600; color: var(--wc-ink-secondary); vertical-align: top; }
  .cell { background: var(--wc-surface); border: 1px solid var(--wc-border); border-radius: 8px; overflow: hidden; }
  .previews .cell { border: 0; border-radius: 0; display: grid; align-content: center; }
  .state { white-space: nowrap; }
  .state small { display: block; font-weight: 400; color: var(--wc-ink-muted); white-space: normal; max-width: 140px; }
</style></head><body><script src="bundle.js"></script></body></html>`,
);

// -- render & check ----------------------------------------------------------------
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
let cases = 0;
mkdirSync(join(out, 'sheets'), { recursive: true });

for (const c of charts) {
  for (const mode of MODES) {
    const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, colorScheme: mode, deviceScaleFactor: previews ? 2 : 1 });
    let current = null;
    page.on('pageerror', (e) => fail(current ?? `${c.id}/${mode}`, `page error: ${e.message}`));
    page.on('console', (m) => {
      if (m.type() === 'error') fail(current ?? `${c.id}/${mode}`, `console error: ${m.text()}`);
    });
    await page.goto(`file://${join(out, 'index.html')}`);
    await page.evaluate(
      ({ id, mode, targets, datasets, states, size, previewMode }) => {
        document.documentElement.dataset.theme = mode;
        if (previewMode) document.body.classList.add('previews');
        const title = document.createElement('h1');
        title.textContent = `${id} · ${mode}`;
        const table = document.createElement('table');
        const head = table.insertRow();
        head.insertCell().outerHTML = '<th></th>';
        for (const t of targets) head.insertCell().outerHTML = `<th>${t}</th>`;
        for (const d of datasets) {
          const row = table.insertRow();
          const th = document.createElement('th');
          th.className = 'state';
          th.textContent = d.key;
          const note = document.createElement('small');
          note.textContent = states[d.key]?.treatment ?? '';
          th.append(note);
          row.append(th);
          for (const t of targets) {
            const td = row.insertCell();
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.id = `${d.key}--${t}`;
            Object.assign(cell.style, { width: `${size.width}px`, height: `${size.height}px` });
            td.append(cell);
          }
        }
        document.body.append(title, table);
      },
      { id: c.id, mode, targets: c.targets, datasets: c.datasets, states: c.doc.states, size: SIZE[c.kind], previewMode: !!previews },
    );

    for (const d of c.datasets) {
      for (const t of c.targets) {
        current = `${c.id}/${d.key}/${t}/${mode}`;
        cases++;
        const figure = t === 'plotly' ? figures[c.id]?.[d.key]?.[mode] : undefined;
        try {
          await page.evaluate(
            async ({ t, id, key, rows, options, mode, figure }) => {
              const el = document.getElementById(`${key}--${t}`);
              await window.WC.render(t, id, el, rows, options, mode, figure);
            },
            { t, id: c.id, key: d.key, rows: d.rows, options: d.options, mode, figure },
          );
        } catch (e) {
          fail(current, `render threw: ${e.message.split('\n')[0]}`);
          continue;
        }
        await page.waitForTimeout(t === 'recharts' ? 120 : 20);
        const result = await page.evaluate((cellId) => {
          const el = document.getElementById(cellId);
          return {
            text: el.textContent ?? '',
            hasGraphics: !!el.querySelector('svg, canvas') || (el.textContent ?? '').trim().length > 0,
            overflow: el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1,
          };
        }, `${d.key}--${t}`);
        if (!result.hasGraphics) fail(current, 'rendered nothing');
        if (result.overflow) fail(current, 'content overflows its box');
        const bad = result.text.match(/\b(NaN|undefined|Infinity|null)\b/);
        if (bad) fail(current, `output contains "${bad[1]}"`);
        const state = c.doc.states[d.key];
        if (state?.treatment === 'message' && !result.text.includes(state.message)) {
          fail(current, `expected the message "${state.message}" from chart.yaml`);
        }
        if (previews) {
          const dir = join(root, previews, c.id);
          mkdirSync(dir, { recursive: true });
          await page.locator(`#${d.key}--${t}`).screenshot({ path: join(dir, `${d.key}-${mode}.png`) });
        }
      }
    }
    current = null;
    if (sheet) await page.screenshot({ path: join(out, 'sheets', `${c.id}-${mode}.png`), fullPage: true });
    await page.close();
  }
}
await browser.close();

console.log(`Rendered ${cases} cases across ${charts.length} charts.`);
if (sheet) console.log(`Contact sheets: ${join(out, 'sheets')}`);
if (failures.length) {
  console.error(`\n${failures.length} problems:\n${[...new Set(failures)].map((f) => `  ✗ ${f}`).join('\n')}`);
  process.exit(1);
}
console.log('All renders passed.');
