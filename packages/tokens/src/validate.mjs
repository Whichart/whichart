import { contrast, deltaE, isHex, oklch } from './color.mjs';

// Thresholds. ΔE is OKLab distance ×100 (see color.mjs).
export const RULES = {
  band: { light: [0.43, 0.77], dark: [0.48, 0.67] }, // OKLCH L for categorical marks
  chromaFloor: 0.1,
  cvdTarget: 8,
  cvdFloor: 6, // 6–8 is legal only with secondary encoding (labels, gaps, texture)
  normalFloor: 15,
  markContrast: 3,
  textContrast: 4.5,
  mutedTextContrast: 3,
  ordinalLightEnd: 2,
  ordinalMinStep: 0.04,
  singleHueSpread: 40,
  allPairsSlots: 3, // scatter, bubble, maps, small multiples: max distinct series
};

const pairs = (n, all) =>
  all
    ? Array.from({ length: n }, (_, i) => Array.from({ length: n - i - 1 }, (_, k) => [i, i + 1 + k])).flat()
    : Array.from({ length: n - 1 }, (_, i) => [i, i + 1]);

function worstPair(colors, list, kinds) {
  let worst = { d: Infinity };
  for (const kind of kinds) {
    for (const [i, j] of list) {
      const d = deltaE(colors[i], colors[j], kind);
      if (d < worst.d) worst = { d, kind: kind ?? 'normal', a: colors[i], b: colors[j] };
    }
  }
  return worst;
}

const fmt = (w) => `${w.a}↔${w.b} ΔE ${w.d.toFixed(1)} (${w.kind})`;

/** Categorical palette checks for one mode. */
export function checkCategorical(colors, { mode, surface, allPairs = false }) {
  const out = [];
  const tag = allPairs ? 'all-pairs' : 'adjacent';
  const [lo, hi] = RULES.band[mode];

  const offBand = colors.filter((c) => {
    const { L } = oklch(c);
    return L < lo || L > hi;
  });
  out.push({
    check: 'Lightness band',
    level: offBand.length ? 'fail' : 'pass',
    detail: offBand.length ? `outside L ${lo}–${hi}: ${offBand.join(', ')}` : `all inside L ${lo}–${hi}`,
  });

  const grey = colors.filter((c) => oklch(c).C < RULES.chromaFloor);
  out.push({
    check: 'Chroma floor',
    level: grey.length ? 'fail' : 'pass',
    detail: grey.length ? `reads as grey: ${grey.join(', ')}` : `all ≥ ${RULES.chromaFloor}`,
  });

  const list = pairs(colors.length, allPairs);
  const cvd = worstPair(colors, list, ['protan', 'deutan']);
  out.push({
    check: `CVD separation (${tag})`,
    level: cvd.d >= RULES.cvdTarget ? 'pass' : cvd.d >= RULES.cvdFloor ? 'warn' : 'fail',
    detail: fmt(cvd),
  });

  const normal = worstPair(colors, list, [undefined]);
  out.push({
    check: `Normal-vision separation (${tag})`,
    level: normal.d >= RULES.normalFloor ? 'pass' : 'fail',
    detail: fmt(normal),
  });

  const low = colors.filter((c) => contrast(c, surface) < RULES.markContrast);
  out.push({
    check: 'Mark contrast vs surface',
    level: low.length ? 'warn' : 'pass',
    detail: low.length
      ? `below ${RULES.markContrast}:1, needs direct labels or a table view: ${low
          .map((c) => `${c} ${contrast(c, surface).toFixed(2)}`)
          .join(', ')}`
      : `all ≥ ${RULES.markContrast}:1`,
  });
  return out;
}

/** A one-hue ramp: monotone lightness, single hue. */
export function checkRamp(colors, name) {
  const lch = colors.map(oklch);
  const steps = lch.slice(1).map((c, i) => lch[i].L - c.L);
  const monotone = steps.every((s) => s > 0) || steps.every((s) => s < 0);
  const minStep = Math.min(...steps.map(Math.abs));
  const hues = lch.filter((c) => c.C > 0.03).map((c) => c.h);
  let spread = Math.max(...hues) - Math.min(...hues);
  if (spread > 180) spread = 360 - spread;
  return [
    {
      check: `${name}: monotone lightness`,
      level: monotone && minStep >= RULES.ordinalMinStep ? 'pass' : 'fail',
      detail: `smallest step ΔL ${minStep.toFixed(3)}`,
    },
    {
      check: `${name}: single hue`,
      level: spread <= RULES.singleHueSpread ? 'pass' : 'fail',
      detail: `hue spread ${spread.toFixed(0)}°`,
    },
  ];
}

function checkText(pairsToCheck, surface, min) {
  return pairsToCheck.map(([label, color]) => {
    const r = contrast(color, surface);
    return { check: `Text contrast: ${label}`, level: r >= min ? 'pass' : 'fail', detail: `${color} ${r.toFixed(2)}:1 (min ${min})` };
  });
}

/** Validate a whole tokens.json. Returns { ok, results, reliefSlots }. */
export function validateTokens(tokens) {
  const results = [];
  const reliefSlots = {};
  const hexes = [];

  const seq = tokens.sequential;
  hexes.push(...seq.blue, ...seq.red, ...Object.values(tokens.status));

  if (!['green-up', 'red-up'].includes(tokens.deltaConvention)) {
    results.push({ mode: '-', check: 'deltaConvention', level: 'fail', detail: 'must be "green-up" or "red-up"' });
  }

  for (const [mode, m] of Object.entries(tokens.modes)) {
    hexes.push(m.surface, m.page, m.grid, m.axis, m.accent, m.onAccent, m.divergingMid, ...m.categorical);
    hexes.push(...Object.values(m.ink), ...Object.values(m.delta));
    const add = (rs) => results.push(...rs.map((r) => ({ mode, ...r })));

    if (m.categorical.length !== 8) {
      add([{ check: 'Categorical slots', level: 'fail', detail: `expected 8, got ${m.categorical.length}` }]);
    }
    add(checkCategorical(m.categorical, { mode, surface: m.surface }));
    add(
      checkCategorical(m.categorical.slice(0, RULES.allPairsSlots), { mode, surface: m.surface, allPairs: true }).filter(
        (r) => r.check.includes('all-pairs'),
      ),
    );
    reliefSlots[mode] = m.categorical
      .map((c, i) => (contrast(c, m.surface) < RULES.markContrast ? i + 1 : null))
      .filter(Boolean);

    add(
      checkText(
        [
          ['primary ink', m.ink.primary],
          ['secondary ink', m.ink.secondary],
          ['delta good', m.delta.good],
          ['delta bad', m.delta.bad],
        ],
        m.surface,
        RULES.textContrast,
      ),
    );
    add(checkText([['muted ink', m.ink.muted]], m.surface, RULES.mutedTextContrast));
    add(checkText([['text on accent', m.onAccent]], m.accent, RULES.textContrast));

    // Ordinal ramps (funnel stages, tiers): the end nearest the surface must still read as a mark.
    const lightEnd = mode === 'light' ? seq.blue[3] : seq.blue[10];
    const r = contrast(lightEnd, m.surface);
    add([
      {
        check: 'Ordinal ramp light end',
        level: r >= RULES.ordinalLightEnd ? 'pass' : 'fail',
        detail: `${lightEnd} ${r.toFixed(2)}:1 (min ${RULES.ordinalLightEnd})`,
      },
    ]);
  }

  results.push(...checkRamp(seq.blue, 'Sequential blue').map((r) => ({ mode: '-', ...r })));
  results.push(...checkRamp(seq.red, 'Sequential red').map((r) => ({ mode: '-', ...r })));

  const bad = hexes.filter((h) => !isHex(h));
  if (bad.length) results.push({ mode: '-', check: 'Hex format', level: 'fail', detail: bad.join(', ') });

  return { ok: results.every((r) => r.level !== 'fail'), results, reliefSlots };
}
