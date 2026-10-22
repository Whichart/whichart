import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseCsv, parseDate, parseNumber, profile, recommend, review } from '../src/index.ts';
import type { CatalogEntry } from '../src/types.ts';

const fixture = (path: string) => readFileSync(new URL(`../../../charts/${path}`, import.meta.url), 'utf8');
const lineSample = fixture('line/data/sample.csv');
const kpiSample = fixture('kpi-tile-delta/data/sample.csv');

test('CSV: quotes, embedded commas and newlines, CRLF, BOM', () => {
  const { columns, rows } = parseCsv('﻿name,"note, with comma",x\r\n"Org ""A""","two\nlines",3\r\n');
  assert.deepEqual(columns, ['name', 'note, with comma', 'x']);
  assert.deepEqual(rows, [{ name: 'Org "A"', 'note, with comma': 'two\nlines', x: '3' }]);
});

test('CSV: semicolon-separated files and header-only files', () => {
  assert.deepEqual(parseCsv('a;b\n1;2\n').rows, [{ a: '1', b: '2' }]);
  assert.deepEqual(parseCsv('date,value\n'), { columns: ['date', 'value'], rows: [] });
});

test('numbers in the formats people export', () => {
  const cases: [string, number | null][] = [
    ['1,234.50', 1234.5],
    ['$1,234', 1234],
    ['৳1,20,000', 120000],
    ['(1,200)', -1200],
    ['12%', 0.12],
    ['1.234,56', 1234.56],
    ['EUR1200', 1200],
    ['N/A', null],
    ['Product A', null],
  ];
  for (const [s, n] of cases) assert.equal(parseNumber(s), n, s);
});

test('dates: ISO, quarters, month names; bare years and labels are not dates', () => {
  const iso = (s: string) => new Date(parseDate(s)!).toISOString().slice(0, 10);
  assert.equal(iso('2026-07-01'), '2026-07-01');
  assert.equal(iso('2026-Q3'), '2026-07-01');
  assert.equal(iso('Jul 2026'), '2026-07-01');
  assert.equal(parseDate('2026'), null);
  assert.equal(parseDate('Product A'), null);
});

test('profile: daily series, detects interval and gaps', () => {
  const p = profile(parseCsv(lineSample).rows);
  assert.deepEqual(p.columns.map((c) => [c.name, c.role]), [['date', 'time'], ['value', 'measure']]);
  assert.equal(p.columns[0].interval, 'day');
  assert.equal(p.metrics.hasTimeGaps, false);
  assert.equal(p.goals[0], 'trend');
  assert.equal(profile(parseCsv(fixture('line/data/states/timeGaps.csv')).rows).metrics.hasTimeGaps, true);
});

test('profile: a "previous" column is a comparison, not a second series', () => {
  const p = profile(parseCsv(kpiSample).rows);
  assert.equal(p.metrics.measureFields, 1);
  assert.equal(p.metrics.hasPrevious, true);
  assert.equal(p.columns.find((c) => c.name === 'previous')?.comparison, true);
  const fresh = profile(parseCsv(fixture('kpi-tile-delta/data/states/noPrevious.csv')).rows);
  assert.equal(fresh.metrics.hasPrevious, false);
});

test('profile: long format counts series from the category', () => {
  const csv = 'date,channel,revenue\n2026-07-01,Web,1\n2026-07-01,App,2\n2026-07-02,Web,3\n2026-07-02,App,4\n';
  const p = profile(parseCsv(csv).rows);
  assert.equal(p.metrics.series, 2);
  assert.equal(p.metrics.pointsPerSeries, 2);
});

test('profile: role overrides win', () => {
  const p = profile([{ zip: '10001', sales: '5' }], { roles: { zip: 'geo' } });
  assert.equal(p.columns[0].role, 'geo');
  assert.equal(p.columns[0].because, 'set by you');
});

test('profile: header-only file guesses roles from names', () => {
  const { columns, rows } = parseCsv('date,channel,revenue\n');
  const p = profile(rows, { columns });
  assert.deepEqual(p.columns.map((c) => c.role), ['time', 'category', 'measure']);
});

test('recommend: a daily series ranks the line chart first', () => {
  const r = recommend({ csv: lineSample });
  assert.equal(r.ranked[0].id, 'line');
  assert.deepEqual(r.ranked[0].encoding, { time: 'date', measures: ['value'] });
  assert.ok(r.ranked[0].reasons.length >= 2);
});

test('recommend: in a tile, the KPI tile beats the line chart', () => {
  const r = recommend({ csv: lineSample, context: { space: 'tile' } });
  assert.equal(r.ranked[0].id, 'kpi-tile-delta');
  const line = r.ranked.find((x) => x.id === 'line')!;
  assert.ok(line.warnings.some((w) => w.text.includes("don't fit in a KPI tile")));
});

test('recommend: a single value excludes the line chart, with a reason and suggestion', () => {
  const r = recommend({ csv: kpiSample });
  assert.equal(r.ranked[0].id, 'kpi-tile-delta');
  const line = r.avoid.find((a) => a.id === 'line');
  assert.ok(line);
  assert.match(line.reasons[0].text, /time field/);
});

test('recommend: several series are routed away from the single-series line', () => {
  const csv = 'date,channel,revenue\n2026-07-01,Web,1\n2026-07-01,App,2\n2026-07-02,Web,3\n2026-07-02,App,4\n2026-07-03,Web,3\n2026-07-03,App,4\n';
  const line = recommend({ csv }).avoid.find((a) => a.id === 'line')!;
  assert.equal(line.reasons[0].suggest, 'multi-line');
});

test('recommend: KPI tile on a time series asks to summarise first', () => {
  const kpi = recommend({ csv: lineSample }).ranked.find((x) => x.id === 'kpi-tile-delta')!;
  assert.ok(kpi.warnings.some((w) => w.text.startsWith('Shows one number')));
});

test('recommend: an explicit goal outweighs inferred ones', () => {
  const r = recommend({ csv: lineSample, goal: 'kpi' });
  assert.equal(r.ranked[0].id, 'kpi-tile-delta');
  assert.match(r.ranked[0].reasons[0], /Made for your goal: single-KPI/);
});

test('recommend: is deterministic', () => {
  assert.deepEqual(recommend({ csv: lineSample, goal: 'trend' }), recommend({ csv: lineSample, goal: 'trend' }));
});

test('recommend: never-suitable context excludes', () => {
  const entry: CatalogEntry = {
    id: 'x',
    name: 'X',
    summary: '',
    goals: ['trend'],
    data: { fields: [{ role: 'measure', count: { min: 1 } }] },
    rules: [],
    context: { space: { tile: 'never' }, audience: {}, medium: {} },
    alternatives: [],
    code: [],
  };
  const r = recommend({ csv: lineSample, context: { space: 'tile' } }, [entry]);
  assert.equal(r.avoid[0]?.id, 'x');
});

test('review: verdicts', () => {
  assert.equal(review('line', { csv: lineSample }).verdict, 'good');
  const bad = review('line', { csv: kpiSample });
  assert.equal(bad.verdict, 'avoid');
  assert.equal(bad.better[0].id, 'kpi-tile-delta');
  assert.equal(review('donut', { csv: lineSample }).verdict, 'unknown');
  const tile = review('line', { csv: lineSample, context: { space: 'tile' } });
  assert.ok(['ok', 'poor'].includes(tile.verdict));
  assert.equal(tile.better[0].id, 'kpi-tile-delta');
});
