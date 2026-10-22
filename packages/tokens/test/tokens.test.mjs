import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { contrast, deltaE } from '../src/color.mjs';
import { checkCategorical, validateTokens } from '../src/validate.mjs';
import { buildAll, deltaColors, diverging } from '../src/build.mjs';

const tokens = JSON.parse(readFileSync(new URL('../tokens.json', import.meta.url), 'utf8'));

test('contrast matches WCAG reference values', () => {
  assert.equal(contrast('#000000', '#ffffff').toFixed(2), '21.00');
  assert.equal(contrast('#777777', '#ffffff').toFixed(2), '4.48');
});

test('deltaE is zero for identical colours and symmetric', () => {
  assert.equal(deltaE('#2a78d6', '#2a78d6'), 0);
  assert.equal(deltaE('#2a78d6', '#eb6834', 'protan'), deltaE('#eb6834', '#2a78d6', 'protan'));
});

test('default tokens pass validation', () => {
  const { ok, results, reliefSlots } = validateTokens(tokens);
  assert.ok(ok, results.filter((r) => r.level === 'fail').map((r) => r.check).join(', '));
  assert.deepEqual(reliefSlots.light, [3, 4, 5]);
});

test('red/green neighbours fail the CVD check', () => {
  const r = checkCategorical(['#d03b3b', '#3a9a3a'], { mode: 'light', surface: '#fcfcfb' });
  assert.equal(r.find((x) => x.check.startsWith('CVD')).level, 'fail');
});

test('near-identical neighbours fail the normal-vision check', () => {
  const r = checkCategorical(['#2a78d6', '#2f7ddb'], { mode: 'light', surface: '#fcfcfb' });
  assert.equal(r.find((x) => x.check.startsWith('Normal')).level, 'fail');
});

test('red-up convention swaps delta colours', () => {
  const green = deltaColors(tokens, 'light');
  const red = deltaColors({ ...tokens, deltaConvention: 'red-up' }, 'light');
  assert.equal(red.up, green.down);
  assert.equal(red.down, green.up);
});

test('diverging scale has a neutral midpoint and equal arms', () => {
  const d = diverging(tokens, 'light');
  assert.equal(d.length, 9);
  assert.equal(d[4], tokens.modes.light.divergingMid);
});

test('generated files contain no colour outside tokens.json', () => {
  const allowed = new Set(JSON.stringify(tokens).match(/#[0-9a-fA-F]{6}/g).map((h) => h.toLowerCase()));
  for (const [name, body] of Object.entries(buildAll(tokens))) {
    for (const h of body.match(/#[0-9a-fA-F]{6}/g) ?? []) {
      assert.ok(allowed.has(h.toLowerCase()), `${name} uses ${h}`);
    }
  }
});
