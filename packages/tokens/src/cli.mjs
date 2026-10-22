#!/usr/bin/env node
// Usage: node src/cli.mjs build   → validate tokens.json and write generated/
//        node src/cli.mjs check   → validate and fail if generated/ is stale (CI)
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateTokens } from './validate.mjs';
import { buildAll } from './build.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const tokens = JSON.parse(readFileSync(join(root, 'tokens.json'), 'utf8'));
const cmd = process.argv[2] ?? 'check';

const { ok, results, reliefSlots } = validateTokens(tokens);
const icon = { pass: 'PASS', warn: 'WARN', fail: 'FAIL' };
for (const r of results) {
  console.log(`[${icon[r.level]}] ${r.mode.padEnd(5)} ${r.check.padEnd(42)} ${r.detail}`);
}
console.log(`\nSlots needing direct labels or a table view: light ${JSON.stringify(reliefSlots.light)}, dark ${JSON.stringify(reliefSlots.dark)}`);
if (!ok) {
  console.error('\nPalette validation failed.');
  process.exit(1);
}

const files = buildAll(tokens);
const out = join(root, 'generated');
if (cmd === 'build') {
  mkdirSync(out, { recursive: true });
  for (const [name, body] of Object.entries(files)) writeFileSync(join(out, name), body);
  console.log(`\nWrote ${Object.keys(files).length} files to generated/`);
} else {
  const stale = Object.entries(files)
    .filter(([name, body]) => !existsSync(join(out, name)) || readFileSync(join(out, name), 'utf8') !== body)
    .map(([name]) => name);
  if (stale.length) {
    console.error(`\ngenerated/ is out of date (${stale.join(', ')}). Run: pnpm --filter @whichart/tokens build`);
    process.exit(1);
  }
  console.log('\ngenerated/ is up to date.');
}
