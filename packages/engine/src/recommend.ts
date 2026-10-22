import catalogJson from '../catalog.json' with { type: 'json' };
import { parseCsv } from './csv.ts';
import { profile as profileRows, type ProfileOptions } from './profile.ts';
import type { Avoided, CatalogEntry, Condition, Context, Encoding, Goal, Profile, Ranked, Recommendation, Role, Row, Suitability } from './types.ts';

export const catalog = catalogJson.charts as CatalogEntry[];

// Score = 50 + goal fit + context fit + rule effects, clamped to 0–100.
const BASE = 50;
const GOAL_PRIMARY = { given: 20, inferred: 10 };
const GOAL_SECONDARY = { given: 10, inferred: 5 };
const GOAL_MISS = -25;
const CONTEXT: Record<Suitability, number> = { good: 8, ok: 0, poor: -15, never: 0 };
const RULE_SCALE = 30;
const AGGREGATE_PENALTY = 0.15;

export interface RecommendInput {
  rows?: Row[];
  csv?: string;
  /** A profile built elsewhere, e.g. by an agent describing its data instead of sending it. */
  profile?: Profile;
  goal?: Goal;
  context?: Context;
  roles?: ProfileOptions['roles'];
}

const ROLE_WORD: Record<Role, [string, string]> = {
  time: ['date or time column', 'date or time columns'],
  measure: ['numeric column', 'numeric columns'],
  category: ['category column', 'category columns'],
  ordinal: ['ordered stage column', 'ordered stage columns'],
  geo: ['place column', 'place columns'],
  id: ['id column', 'id columns'],
};
const GOAL_LABEL: Record<Goal, string> = {
  trend: 'trend',
  compare: 'comparison',
  'part-of-whole': 'part-of-whole',
  ranking: 'ranking',
  flow: 'flow or funnel',
  distribution: 'distribution',
  relationship: 'relationship',
  kpi: 'single-KPI',
};
const word = (role: Role, n: number) => `${n} ${ROLE_WORD[role][n === 1 ? 0 : 1]}`;

function metricValue(name: string, p: Profile, goals: Goal[], ctx: Context): unknown {
  if (name === 'goal') return goals;
  if (name === 'space' || name === 'audience' || name === 'medium') return ctx[name];
  return p.metrics[name as keyof Profile['metrics']];
}

/** Evaluate a fit-rule condition. `goal = x` is true when x is among the effective goals. */
export function evaluate(c: Condition, p: Profile, goals: Goal[], ctx: Context): boolean {
  if ('all' in c) return c.all.every((x) => evaluate(x, p, goals, ctx));
  if ('any' in c) return c.any.some((x) => evaluate(x, p, goals, ctx));
  const v = metricValue(c.metric, p, goals, ctx);
  if (v === undefined) return false;
  if (Array.isArray(v)) {
    if (c.op === '=') return v.includes(c.value as Goal);
    if (c.op === '!=') return !v.includes(c.value as Goal);
    if (c.op === 'in') return (c.value as unknown[]).some((x) => v.includes(x as Goal));
    return false;
  }
  switch (c.op) {
    case '=':
      return v === c.value;
    case '!=':
      return v !== c.value;
    case '<':
      return (v as number) < (c.value as number);
    case '<=':
      return (v as number) <= (c.value as number);
    case '>':
      return (v as number) > (c.value as number);
    case '>=':
      return (v as number) >= (c.value as number);
    case 'in':
      return (c.value as unknown[]).includes(v);
  }
}

function count(p: Profile, role: Role): number {
  return role === 'measure' ? p.metrics.measureFields : p.columns.filter((c) => c.role === role).length;
}

/** Hard data-shape requirements from chart.yaml `data`. Returns reasons it doesn't fit. */
function shapeProblems(entry: CatalogEntry, p: Profile): { exclude: string[]; aggregate: boolean } {
  const exclude: string[] = [];
  for (const f of entry.data.fields) {
    const n = count(p, f.role);
    const { min = 0, max = Infinity } = f.count;
    if (n < min) exclude.push(min === 1 ? `Needs a ${ROLE_WORD[f.role][0]}; your data has none.` : `Needs at least ${word(f.role, min)}; your data has ${n}.`);
    else if (n > max) exclude.push(`Takes at most ${word(f.role, max)}; your data has ${n}.`);
    const col = p.columns.find((c) => c.role === f.role);
    if (col && f.cardinality?.max && col.distinct > f.cardinality.max) {
      exclude.push(`Handles up to ${f.cardinality.max} values in "${col.name}"; it has ${col.distinct}.`);
    }
  }
  let aggregate = false;
  const rows = entry.data.rows;
  if (rows?.max !== undefined && p.metrics.rows > rows.max) {
    // A time series can be summarised into one number (last 30 days vs the 30 before); anything else can't.
    if (p.metrics.timeFields) aggregate = true;
    else exclude.push(`Shows at most ${rows.max} row${rows.max === 1 ? '' : 's'}; your data has ${p.metrics.rows}.`);
  }
  return { exclude, aggregate };
}

function encodingFor(entry: CatalogEntry, p: Profile): Encoding {
  const wants = new Set(entry.data.fields.map((f) => f.role));
  const first = (role: Role) => p.columns.find((c) => c.role === role)?.name;
  const maxMeasures = entry.data.fields.find((f) => f.role === 'measure')?.count.max ?? Infinity;
  return {
    ...(wants.has('time') && first('time') ? { time: first('time') } : {}),
    measures: p.columns.filter((c) => c.role === 'measure' && !c.comparison).slice(0, maxMeasures).map((c) => c.name),
    ...(p.columns.find((c) => c.comparison) ? { comparison: p.columns.find((c) => c.comparison)!.name } : {}),
    ...(wants.has('category') && first('category') ? { category: first('category') } : {}),
    ...(wants.has('ordinal') && first('ordinal') ? { ordinal: first('ordinal') } : {}),
    ...(wants.has('geo') && first('geo') ? { geo: first('geo') } : {}),
  };
}

function shapeReason(entry: CatalogEntry, p: Profile): string {
  const parts = entry.data.fields
    .map((f) => [f.role, count(p, f.role)] as const)
    .filter(([, n]) => n > 0)
    .map(([role, n]) => word(role, n));
  return parts.length ? `Fits your data: ${parts.join(' and ')}.` : '';
}

export function recommend(input: RecommendInput, charts: CatalogEntry[] = catalog): Recommendation {
  let p = input.profile;
  if (!p) {
    const parsed = input.csv !== undefined ? parseCsv(input.csv) : { columns: undefined, rows: input.rows ?? [] };
    p = profileRows(parsed.rows, { roles: input.roles, columns: parsed.columns });
  }
  const ctx = input.context ?? {};
  const given = !!input.goal;
  const goals: Goal[] = input.goal ? [input.goal] : p.goals;

  const ranked: Ranked[] = [];
  const avoid: Avoided[] = [];

  for (const entry of charts) {
    const reasons: string[] = [];
    const warnings: Ranked['warnings'] = [];
    const blocks: Avoided['reasons'] = [];
    let score = BASE;

    // Explicit exclude rules first: they carry the best explanation and a suggestion.
    for (const rule of entry.rules) {
      if (!evaluate(rule.when, p, goals, ctx)) continue;
      const note = { text: rule.reason, ...(rule.fix ? { fix: rule.fix } : {}), ...(rule.suggest ? { suggest: rule.suggest } : {}) };
      if (rule.effect === 'exclude') blocks.push(note);
      else if (rule.effect === 'boost') {
        score += (rule.weight ?? 0) * RULE_SCALE;
        reasons.push(rule.reason);
      } else {
        score -= (rule.weight ?? 0) * RULE_SCALE;
        warnings.push(note);
      }
    }

    const shape = shapeProblems(entry, p);
    if (!blocks.length) blocks.push(...shape.exclude.map((text) => ({ text })));
    if (shape.aggregate) {
      score -= AGGREGATE_PENALTY * RULE_SCALE;
      warnings.push({ text: 'Shows one number: summarise your data first.', fix: 'For example, the last 30 days against the 30 before.' });
    }

    for (const dim of ['space', 'audience', 'medium'] as const) {
      const chosen = ctx[dim];
      if (!chosen) continue;
      const fit = (entry.context[dim] as Record<string, Suitability>)[chosen] ?? 'ok';
      if (fit === 'never') blocks.push({ text: `Doesn't work for ${dim} "${chosen}".` });
      score += CONTEXT[fit];
      if (fit === 'poor') warnings.push({ text: `A poor fit for ${dim} "${chosen}".` });
    }

    if (blocks.length) {
      avoid.push({ id: entry.id, name: entry.name, reasons: blocks });
      continue;
    }

    const primary = entry.goals[0];
    if (goals.includes(primary)) {
      score += given ? GOAL_PRIMARY.given : GOAL_PRIMARY.inferred * (goals[0] === primary ? 1 : 0.5);
      reasons.unshift(given ? `Made for your goal: ${GOAL_LABEL[primary]}.` : `Your data suggests a ${GOAL_LABEL[primary]} view.`);
    } else if (entry.goals.some((g) => goals.includes(g))) {
      score += given ? GOAL_SECONDARY.given : GOAL_SECONDARY.inferred;
    } else if (given) {
      score += GOAL_MISS;
      warnings.push({ text: `Not designed for a ${GOAL_LABEL[input.goal!]} view.` });
    }

    const fits = shapeReason(entry, p);
    if (fits) reasons.push(fits);
    ranked.push({
      id: entry.id,
      name: entry.name,
      score: Math.round(Math.max(0, Math.min(100, score))),
      reasons,
      warnings,
      encoding: encodingFor(entry, p),
    });
  }

  ranked.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  const notes = p.metrics.rows === 0 ? ['No rows yet, so column roles were guessed from their names. Add data for a better ranking.'] : [];
  return { profile: p, ...(input.goal ? { goal: input.goal } : {}), context: ctx, ranked, avoid, notes };
}
