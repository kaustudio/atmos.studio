// Dev-only harness for the compositional local reading engine. Not bundled — vite's entry is
// /src/main.tsx, so nothing under scripts/ ever reaches the client.
//
//   node scripts/reading-check.mjs            summary + a 20-row sample
//   node scripts/reading-check.mjs --all      every generated reading
//   node scripts/reading-check.mjs --dupes    only the colliding names
//
// Proves the engine over the axis space rather than over three photos: it sweeps lightness ×
// chroma × hue × spread × weight profile, then reports collisions, band coverage and determinism.

import { rgb2oklab, oklab2rgb, hex } from '../src/lib/color.js';
import { analysePalette, composeReading, paletteSeed } from '../src/lib/reading.js';

const args = new Set(process.argv.slice(2));
const DEG = Math.PI / 180;

// ---- synthetic palettes -----------------------------------------------------------------------
// Build a swatch from OKLCH, then ROUND-TRIP through hex so the L/a/b we hand the engine are the
// in-gamut values a real extraction would produce (clamping otherwise makes the analysis lie).
function swatch(L, C, H, weight) {
  const a = C * Math.cos(H * DEG), b = C * Math.sin(H * DEG);
  const rgb = oklab2rgb(L, a, b);
  const h = hex(rgb[0], rgb[1], rgb[2]);
  const lab = rgb2oklab(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255);
  return { hex: h, weight, L: lab.L, a: lab.a, b: lab.b };
}

const WEIGHTS = {
  dominant: [0.52, 0.20, 0.13, 0.09, 0.06],
  paired: [0.36, 0.32, 0.14, 0.10, 0.08],
  even: [0.22, 0.21, 0.20, 0.19, 0.18],
  graded: [0.34, 0.25, 0.19, 0.13, 0.09],
};

function makePalette(Lc, Cc, Hc, spread, hueSpan, wKey) {
  const W = WEIGHTS[wKey];
  return [0, 1, 2, 3, 4].map((i) => {
    const t = (i / 4) - 0.5;                                  // −0.5 … +0.5
    const L = Math.min(0.97, Math.max(0.05, Lc + t * spread));
    const C = Math.max(0, Cc * (1 - Math.abs(t) * 0.35));
    const H = (Hc + t * hueSpan + 360) % 360;
    return swatch(L, C, H, W[i]);
  });
}

// Sweep the axis space. Deliberately includes near-grey, accented and opposed-hue shapes.
const palettes = [];
const Ls = [0.22, 0.38, 0.55, 0.72, 0.88];
const Cs = [0.008, 0.035, 0.07, 0.12, 0.19];
const Hs = [25, 95, 145, 200, 265, 330];
const spreads = [0.12, 0.34, 0.55];
const spans = [10, 60, 200];
const wKeys = ['dominant', 'paired', 'even', 'graded'];

let n = 0;
for (const L of Ls) for (const C of Cs) for (const H of Hs) {
  const spread = spreads[n % spreads.length];
  const span = spans[(n >> 1) % spans.length];
  const wk = wKeys[n % wKeys.length];
  palettes.push({ label: `L${L} C${C} H${H} s${spread} span${span} ${wk}`, sw: makePalette(L, C, H, spread, span, wk) });
  n++;
}
// a handful of accented palettes: greys carrying one loud colour
for (const H of Hs) {
  const base = makePalette(0.55, 0.01, H, 0.4, 10, 'graded');
  base[0] = swatch(0.55, 0.20, H, 0.30);
  palettes.push({ label: `accented H${H}`, sw: base });
}

// ---- run --------------------------------------------------------------------------------------
const rows = palettes.map((p) => {
  const A = analysePalette(p.sw);
  const R = composeReading(p.sw, []);      // no `taken` — measures the engine's RAW distinctiveness
  return { ...p, A, R };
});

// determinism: same palette, fresh call, and a shuffled swatch order (seed must be order-stable)
let nondet = 0, orderUnstable = 0;
rows.forEach((r) => {
  if (composeReading(r.sw, []).name !== r.R.name) nondet++;
  const shuffled = r.sw.slice().reverse();
  if (paletteSeed(shuffled) !== paletteSeed(r.sw)) orderUnstable++;
  if (composeReading(shuffled, []).name !== r.R.name) orderUnstable++;
});

// ---- report -----------------------------------------------------------------------------------
const names = rows.map((r) => r.R.name);
const counts = names.reduce((m, x) => (m[x] = (m[x] || 0) + 1, m), {});
const dupes = Object.entries(counts).filter(([, c]) => c > 1).sort((a, b) => b[1] - a[1]);
const collisions = dupes.reduce((a, [, c]) => a + (c - 1), 0);

const dist = (key, sub) => {
  const m = {};
  rows.forEach((r) => { const v = sub ? r.A[key][sub] : r.A[key].band; m[v] = (m[v] || 0) + 1; });
  return Object.entries(m).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}:${v}`).join('  ');
};

const bad = rows.filter((r) => {
  const R = r.R;
  return !R.name || !R.name.trim() || R.name === 'Untitled'
    || R.name.length > 42 || R.name.trim().split(/\s+/).length > 3
    || !Array.isArray(R.descriptors) || R.descriptors.length < 3 || R.descriptors.length > 4
    || R.descriptors.some((d) => !d || !d.trim())
    || new Set(R.descriptors.map((d) => d.toLowerCase())).size !== R.descriptors.length
    || !R.rationale || R.rationale.length > 240 || !/[.]$/.test(R.rationale)
    || !R.archetype || /\s/.test(R.archetype);
});

const show = args.has('--all') ? rows : args.has('--dupes') ? rows.filter((r) => counts[r.R.name] > 1) : rows.filter((_, i) => i % Math.ceil(rows.length / 20) === 0);

console.log('\n══ sample ══════════════════════════════════════════════════════════════════════\n');
show.forEach((r) => {
  console.log(`  ${r.R.name}`);
  console.log(`    ${r.R.descriptors.join(' · ')}`);
  console.log(`    ${r.R.rationale}`);
  console.log(`    \x1b[2m${r.A.temperature.band}/${r.A.chroma.band}/${r.A.lightness.band}/${r.A.contrast.band}/${r.A.dominance.band}/${r.A.hue.band}  ${r.sw.map((s) => s.hex).join(' ')}\x1b[0m\n`);
});

console.log('══ coverage ════════════════════════════════════════════════════════════════════\n');
console.log('  temperature  ', dist('temperature'));
console.log('  chroma       ', dist('chroma'));
console.log('  chroma spread', dist('chroma', 'spread'));
console.log('  lightness    ', dist('lightness'));
console.log('  L range      ', dist('lightness', 'range'));
console.log('  contrast     ', dist('contrast'));
console.log('  dominance    ', dist('dominance'));
console.log('  hue relation ', dist('hue'));

console.log('\n══ quality ═════════════════════════════════════════════════════════════════════\n');
console.log(`  palettes            ${rows.length}`);
console.log(`  distinct names      ${Object.keys(counts).length}`);
console.log(`  collisions          ${collisions}${collisions ? '  →  ' + dupes.map(([nm, c]) => `${nm}×${c}`).join(', ') : ''}`);
console.log(`  distinct rationales ${new Set(rows.map((r) => r.R.rationale)).size}`);
console.log(`  non-deterministic   ${nondet}`);
console.log(`  order-unstable      ${orderUnstable}`);
console.log(`  malformed           ${bad.length}${bad.length ? '  →  ' + bad.slice(0, 5).map((b) => JSON.stringify(b.R.name)).join(', ') : ''}`);
console.log('');

if (nondet || orderUnstable || bad.length) process.exitCode = 1;
