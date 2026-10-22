export type Role = 'time' | 'measure' | 'category' | 'ordinal' | 'geo' | 'id';
export type Goal = 'trend' | 'compare' | 'part-of-whole' | 'ranking' | 'flow' | 'distribution' | 'relationship' | 'kpi';
export type Space = 'tile' | 'card' | 'half' | 'full';
export type Audience = 'glance' | 'explore';
export type Medium = 'dashboard' | 'report' | 'slide';
export type Interval = 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year' | 'irregular';
export type Row = Record<string, unknown>;

export interface Column {
  name: string;
  role: Role;
  /** True for a measure that holds the previous period's value (previous, prior, last_period…). */
  comparison?: boolean;
  distinct: number;
  missing: number;
  /** Measures only. */
  min?: number;
  max?: number;
  /** Category/ordinal/geo/id only: longest value. */
  maxLength?: number;
  /** Time only. */
  interval?: Interval;
  gaps?: number;
  /** How the role was decided, shown to the user so they can correct it. */
  because: string;
}

export interface Metrics {
  rows: number;
  timeFields: number;
  measureFields: number;
  categoryFields: number;
  ordinalFields: number;
  geoFields: number;
  categories: number;
  series: number;
  pointsPerSeries: number;
  hasNegatives: boolean;
  allZeros: boolean;
  hasTimeGaps: boolean;
  hasPrevious: boolean;
  maxLabelLength: number;
  outlierRatio: number;
  sumsToWhole: boolean;
}

export interface Profile {
  columns: Column[];
  metrics: Metrics;
  /** Likely goals, most likely first. Used when the caller gives none. */
  goals: Goal[];
  summary: string;
}

export interface Context {
  space?: Space;
  audience?: Audience;
  medium?: Medium;
}

export type Condition =
  | { metric: keyof Metrics | 'goal' | 'space' | 'audience' | 'medium'; op: '=' | '!=' | '<' | '<=' | '>' | '>=' | 'in'; value: unknown }
  | { all: Condition[] }
  | { any: Condition[] };

export interface Rule {
  when: Condition;
  effect: 'exclude' | 'penalty' | 'boost';
  weight?: number;
  reason: string;
  fix?: string;
  suggest?: string;
}

export type Suitability = 'good' | 'ok' | 'poor' | 'never';

export interface CatalogEntry {
  id: string;
  name: string;
  summary: string;
  goals: Goal[];
  data: {
    fields: { role: Role; count: { min?: number; max?: number }; cardinality?: { min?: number; max?: number; ideal?: number } }[];
    rows?: { min?: number; max?: number };
  };
  rules: Rule[];
  context: { space: Partial<Record<Space, Suitability>>; audience: Partial<Record<Audience, Suitability>>; medium: Partial<Record<Medium, Suitability>> };
  alternatives: { id: string; when: string }[];
  code: string[];
}

export interface Encoding {
  time?: string;
  measures: string[];
  comparison?: string;
  category?: string;
  ordinal?: string;
  geo?: string;
}

export interface Ranked {
  id: string;
  name: string;
  score: number;
  reasons: string[];
  warnings: { text: string; fix?: string; suggest?: string }[];
  encoding: Encoding;
}

export interface Avoided {
  id: string;
  name: string;
  reasons: { text: string; fix?: string; suggest?: string }[];
}

export interface Recommendation {
  profile: Profile;
  goal?: Goal;
  context: Context;
  ranked: Ranked[];
  avoid: Avoided[];
  notes: string[];
}
