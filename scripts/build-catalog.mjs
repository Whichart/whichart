#!/usr/bin/env node
// Compiles every ready chart.yaml into packages/engine/catalog.json, the rule set the
// recommender ships with. --check: fail if the committed catalog is stale (CI).
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'packages/engine/catalog.json');

const charts = readdirSync(join(root, 'charts'))
  .filter((id) => existsSync(join(root, 'charts', id, 'chart.yaml')))
  .sort()
  .map((id) => parse(readFileSync(join(root, 'charts', id, 'chart.yaml'), 'utf8')))
  .filter((doc) => doc.status === 'ready')
  .map((doc) => ({
    id: doc.id,
    name: doc.name,
    summary: doc.summary,
    goals: doc.goals,
    data: { fields: doc.data.fields.map(({ description, ...f }) => f), ...(doc.data.rows ? { rows: doc.data.rows } : {}) },
    rules: doc.fit.rules,
    context: doc.context,
    alternatives: doc.guidance.alternatives,
    code: Object.keys(doc.code),
  }));

const body = JSON.stringify({ version: 1, charts }, null, 2) + '\n';
if (process.argv.includes('--check')) {
  if (!existsSync(out) || readFileSync(out, 'utf8') !== body) {
    console.error('packages/engine/catalog.json is out of date. Run: pnpm catalog');
    process.exit(1);
  }
  console.log(`catalog.json is up to date (${charts.length} charts).`);
} else {
  writeFileSync(out, body);
  console.log(`Wrote packages/engine/catalog.json (${charts.length} charts).`);
}
