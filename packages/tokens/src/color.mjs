// Colour maths for palette validation: sRGB, OKLab/OKLCH, WCAG contrast and
// colour-vision-deficiency simulation (Machado, Oliveira & Fernandes 2009,
// severity 1.0). The thresholds in validate.mjs are calibrated to these models.

const MACHADO = {
  protan: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deutan: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
  tritan: [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.691367, 0.3039],
  ],
};

export const isHex = (v) => typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v);

const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const clamp01 = (c) => Math.max(0, Math.min(1, c));

export function linearRgb(hex) {
  if (!isHex(hex)) throw new Error(`Expected #rrggbb, got ${JSON.stringify(hex)}`);
  return [1, 3, 5].map((i) => toLinear(parseInt(hex.slice(i, i + 2), 16) / 255));
}

function oklabFromLinear([r, g, b]) {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

export const oklab = (hex) => oklabFromLinear(linearRgb(hex));

export function oklch(hex) {
  const [L, a, b] = oklab(hex);
  const h = ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360;
  return { L, C: Math.hypot(a, b), h };
}

export function simulate(hex, kind) {
  const [r, g, b] = linearRgb(hex);
  return MACHADO[kind].map(([x, y, z]) => clamp01(x * r + y * g + z * b));
}

/** Euclidean OKLab distance ×100. `kind` simulates a CVD type; omit for normal vision. */
export function deltaE(a, b, kind) {
  const pa = oklabFromLinear(kind ? simulate(a, kind) : linearRgb(a));
  const pb = oklabFromLinear(kind ? simulate(b, kind) : linearRgb(b));
  return 100 * Math.hypot(pa[0] - pb[0], pa[1] - pb[1], pa[2] - pb[2]);
}

function luminance(hex) {
  const [r, g, b] = linearRgb(hex);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2 contrast ratio. */
export function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
