#!/usr/bin/env node
// whichart data.csv [--goal trend] [--space tile] [--audience glance] [--medium dashboard] [--review line] [--json]
import { readFileSync } from 'node:fs';
import { recommend, review } from './index.ts';
import type { Context, Goal } from './types.ts';

// Exit quietly when piped into head or similar.
process.stdout.on('error', (e: NodeJS.ErrnoException) => process.exit(e.code === 'EPIPE' ? 0 : 1));

const args = process.argv.slice(2);
const flag = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const file = args.find((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--'));
if (!file) {
  console.error('usage: whichart <data.csv> [--goal g] [--space s] [--audience a] [--medium m] [--review chart-id] [--json]');
  process.exit(2);
}

const input = {
  csv: readFileSync(file, 'utf8'),
  goal: flag('goal') as Goal | undefined,
  context: Object.fromEntries((['space', 'audience', 'medium'] as const).filter((k) => flag(k)).map((k) => [k, flag(k)])) as Context,
};
const chart = flag('review');

if (chart) {
  const r = review(chart, input);
  if (args.includes('--json')) console.log(JSON.stringify(r, null, 2));
  else {
    console.log(`${r.verdict.toUpperCase()}: ${r.summary}`);
    for (const p of r.problems) console.log(`  ! ${p.text}${p.fix ? ` ${p.fix}` : ''}`);
    if (r.better.length) console.log(`  Better: ${r.better.map((b) => `${b.name} (${b.score})`).join(', ')}`);
  }
} else {
  const rec = recommend(input);
  if (args.includes('--json')) console.log(JSON.stringify(rec, null, 2));
  else {
    console.log(rec.profile.summary);
    console.log(rec.profile.columns.map((c) => `  ${c.name}: ${c.role}${c.comparison ? ' (previous)' : ''}, ${c.because}`).join('\n'));
    for (const n of rec.notes) console.log(`\nNote: ${n}`);
    console.log(`\nRecommended${rec.goal ? ` for "${rec.goal}"` : ''}:`);
    rec.ranked.forEach((r, i) => {
      console.log(`  ${i + 1}. ${r.name}  ${r.score}`);
      for (const why of r.reasons) console.log(`       + ${why}`);
      for (const w of r.warnings) console.log(`       ! ${w.text}${w.fix ? ` ${w.fix}` : ''}`);
    });
    if (rec.avoid.length) {
      console.log('\nNot a good fit:');
      for (const a of rec.avoid) console.log(`  ✕ ${a.name}: ${a.reasons.map((r) => r.text).join(' ')}`);
    }
  }
}
