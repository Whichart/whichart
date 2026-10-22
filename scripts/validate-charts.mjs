#!/usr/bin/env node
// Validates every chart.yaml against schema/chart.schema.json plus checks the
// schema can't express: id matches folder, code files exist, linked ids exist.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import { parse } from 'yaml';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const schema = JSON.parse(readFileSync(join(root, 'schema/chart.schema.json'), 'utf8'));
const validate = new Ajv2020({ allErrors: true, strict: true, strictRequired: false, allowUnionTypes: true }).compile(schema);

const dirs = (base) =>
  existsSync(base)
    ? readdirSync(base, { withFileTypes: true })
        .filter((d) => d.isDirectory() && existsSync(join(base, d.name, 'chart.yaml')))
        .map((d) => ({ dir: join(base, d.name), folder: d.name }))
    : [];

// Examples are checked against the schema only; real entries must also ship their code.
const entries = [
  ...dirs(join(root, 'charts')).map((e) => ({ ...e, example: false })),
  ...dirs(join(root, 'schema/examples')).map((e) => ({ ...e, example: true })),
];

let errors = 0;
const warnings = [];
const charts = new Map();
const fail = (where, msg) => {
  errors++;
  console.error(`✗ ${where}: ${msg}`);
};

for (const e of entries) {
  const where = e.dir.slice(root.length + 1) + '/chart.yaml';
  let doc;
  try {
    doc = parse(readFileSync(join(e.dir, 'chart.yaml'), 'utf8'));
  } catch (err) {
    fail(where, `invalid YAML: ${err.message}`);
    continue;
  }
  if (!validate(doc)) {
    for (const err of validate.errors) fail(where, `${err.instancePath || '/'} ${err.message}`);
    continue;
  }
  if (doc.id !== e.folder) fail(where, `id "${doc.id}" must match folder "${e.folder}"`);
  if (!e.example) {
    for (const file of Object.values(doc.code)) {
      if (!existsSync(join(e.dir, file))) fail(where, `missing ${file}`);
    }
    if (!existsSync(join(e.dir, 'guide.md'))) fail(where, 'missing guide.md');
  }
  charts.set(doc.id, { doc, where });
  console.log(`✓ ${where}`);
}

// Links to other charts. Warnings until the catalogue is complete; errors for ready entries.
for (const [, { doc, where }] of charts) {
  const linked = [
    ...doc.guidance.alternatives.map((a) => a.id),
    ...doc.fit.rules.map((r) => r.suggest).filter(Boolean),
    ...Object.values(doc.states).map((s) => s.fallback).filter(Boolean),
    ...(doc.related ?? []),
  ];
  for (const id of new Set(linked)) {
    if (charts.has(id)) continue;
    if (doc.status === 'ready') fail(where, `links to unknown chart "${id}"`);
    else warnings.push(`${where}: links to "${id}", which doesn't exist yet`);
  }
}

for (const w of warnings) console.warn(`! ${w}`);
console.log(`\n${charts.size} entries, ${errors} errors, ${warnings.length} warnings`);
process.exit(errors ? 1 : 0);
