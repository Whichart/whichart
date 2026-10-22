#!/usr/bin/env node
// Writes charts/<id>/data/*.csv and datasets.json from each chart's data.mjs.
// --check: fail if the committed files differ (CI).
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { toCsv } from './lib/data.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const check = process.argv.includes('--check');
let stale = 0;

for (const id of readdirSync(join(root, 'charts'))) {
  const gen = join(root, 'charts', id, 'data.mjs');
  if (!existsSync(gen)) continue;
  const { default: generate } = await import(pathToFileURL(gen));
  const { columns, sample, states } = generate();
  const files = {};
  const index = { columns, sample: { file: 'sample.csv', options: sample.options ?? {} }, states: {} };
  files['sample.csv'] = toCsv(sample.rows, columns);
  for (const [state, d] of Object.entries(states)) {
    files[`states/${state}.csv`] = toCsv(d.rows, columns);
    index.states[state] = { file: `states/${state}.csv`, options: d.options ?? {} };
  }
  files['datasets.json'] = JSON.stringify(index, null, 2) + '\n';

  const dir = join(root, 'charts', id, 'data');
  for (const [name, body] of Object.entries(files)) {
    const path = join(dir, name);
    if (check) {
      if (!existsSync(path) || readFileSync(path, 'utf8') !== body) {
        console.error(`✗ charts/${id}/data/${name} is out of date`);
        stale++;
      }
    } else {
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, body);
    }
  }
  if (!check) {
    // Remove state files that are no longer generated.
    const statesDir = join(dir, 'states');
    for (const f of existsSync(statesDir) ? readdirSync(statesDir) : []) {
      if (!files[`states/${f}`]) rmSync(join(statesDir, f));
    }
  }
  console.log(`${check ? 'checked' : 'wrote'} charts/${id}/data (${Object.keys(files).length} files)`);
}

if (stale) {
  console.error('\nRun: pnpm data');
  process.exit(1);
}
