// Proves the claims taxonomy/vocabulary.json makes about itself.
//
// Two independent checks, because "every palette resolves to exactly one value" can fail two ways:
//   1 STRUCTURAL — the buckets must tile their dimension with no gap and no overlap. A gap means
//     some palette resolves to nothing; an overlap means some palette resolves to two things.
//     Proved over the definition, so it holds for every possible input, not just the ones on hand.
//   2 EMPIRICAL — resolve real palettes (the five shipped seeds) and a large randomised sweep,
//     and assert exactly one value per dimension every time.
//
// The resolver here is deliberately re-implemented from the artifact's numbers rather than imported
// from reading.js: if it shared code with the thing it checks, it would only prove self-consistency.
// It is checked against reading.js's own band() semantics instead — first cut the value falls under.
//
//   node scripts/taxonomy-check.mjs

import { readFileSync } from 'fs';

const vocab = JSON.parse(readFileSync(new URL('../taxonomy/vocabulary.json', import.meta.url)));
let failures = 0;
const fail = (m) => { failures++; console.error('  ✗ ' + m); };
const ok = (m) => console.log('  ✓ ' + m);

// ---------- colour maths, mirroring src/lib/color.js + reading.js ----------
const hexToRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
function rgb2oklab(r, g, b) {
  const f = (v) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  r = f(r); g = f(g); b = f(b);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return {
    L: 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s,
  };
}
const relLum = (hex) => {
  const [r, g, b] = hexToRgb(hex).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrastRatio = (x, y) => { const a = relLum(x), b = relLum(y); return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); };

// ---------- measures, from the formulas the artifact documents ----------
const CHROMA_FLOOR = 0.02, DEG = 180 / Math.PI;
function measures(sw) {
  const parts = sw.map((s) => {
    const C = Math.sqrt(s.a * s.a + s.b * s.b);
    let H = Math.atan2(s.b, s.a) * DEG; if (H < 0) H += 360;
    return { hex: s.hex, w: s.weight, L: s.L, C, H };
  });
  let wsum = 0, warmAcc = 0;
  parts.forEach((p) => { const k = p.w * p.C; wsum += k; warmAcc += k * Math.cos((p.H - 65) / DEG); });
  let maxRatio = 1;
  for (let i = 0; i < parts.length; i++) for (let j = i + 1; j < parts.length; j++) maxRatio = Math.max(maxRatio, contrastRatio(parts[i].hex, parts[j].hex));
  const chromatic = parts.filter((p) => p.C > CHROMA_FLOOR);
  let span = 0;
  if (chromatic.length >= 2) {
    const hs = chromatic.map((p) => p.H).sort((a, b) => a - b);
    let gap = (hs[0] + 360) - hs[hs.length - 1];
    for (let i = 1; i < hs.length; i++) gap = Math.max(gap, hs[i] - hs[i - 1]);
    span = 360 - gap;
  }
  const ws = parts.map((p) => p.w).sort((a, b) => b - a);
  return {
    warmth: wsum > 1e-6 ? warmAcc / wsum : 0,
    meanL: parts.reduce((a, p) => a + p.L * p.w, 0),
    meanC: parts.reduce((a, p) => a + p.C * p.w, 0),
    maxRatio,
    hueSpan: chromatic.length < 2 ? -1 : span,   // -1 ⇒ forced monochrome, per the artifact's note
    topWeight: ws[0], secondWeight: ws[1] || 0, minWeight: ws[ws.length - 1],
  };
}

// Resolve by RANGE MEMBERSHIP, not by first-match — so an overlap surfaces as two hits rather than
// being silently hidden by ordering. That is the whole point of the exactly-one assertion.
function resolveAll(dim, m) {
  const f = vocab.facets[dim];
  if (f.rule) {                                   // dominance: ordered rule, evaluated as written
    const hits = [];
    if (m.topWeight >= 0.42) hits.push('dominant');
    else if (m.topWeight + m.secondWeight >= 0.66) hits.push('paired');
    else if (m.topWeight - m.minWeight <= 0.10) hits.push('even');
    else hits.push('graded');
    return hits;
  }
  if (dim === 'hue' && m.hueSpan < 0) return ['mono'];
  const v = m[f.measure];
  return f.buckets.filter((b) => v >= b.min && v < b.max).map((b) => b.value);
}

// ---------- 1 · structural: do the buckets tile their domain? ----------
console.log('\nSTRUCTURAL — bucket ranges tile each dimension');
for (const [dim, f] of Object.entries(vocab.facets)) {
  if (f.rule) { ok(dim + ': ordered rule with an "otherwise" arm — exhaustive by construction'); continue; }
  const bs = f.buckets;
  let clean = true;
  for (let i = 1; i < bs.length; i++) {
    if (bs[i].min > bs[i - 1].max) { fail(dim + ': gap between ' + bs[i - 1].value + ' and ' + bs[i].value); clean = false; }
    if (bs[i].min < bs[i - 1].max) { fail(dim + ': overlap between ' + bs[i - 1].value + ' and ' + bs[i].value); clean = false; }
  }
  if (clean) ok(dim + ': ' + bs.length + ' buckets, contiguous ' + bs[0].min + ' → ' + bs[bs.length - 1].max);
}

// ---------- 2 · no term lives in both systems ----------
console.log('\nCLASSIFICATION — no term is both a facet value and a tag');
const facetLabels = new Set();
Object.values(vocab.facets).forEach((f) => f.buckets.forEach((b) => facetLabels.add(b.label.toLowerCase())));
const tagList = [...vocab.tags.fromGenerator, ...vocab.tags.fromSeeds];
const collisions = tagList.filter((t) => facetLabels.has(t.toLowerCase()));
if (collisions.length) fail('terms in both systems: ' + collisions.join(', '));
else ok(facetLabels.size + ' facet values, ' + tagList.length + ' tags, zero overlap');

const retiredAll = { ...vocab.retired.computed, ...vocab.retired.synonym };
const stillTagged = Object.keys(retiredAll).filter((t) => tagList.some((x) => x.toLowerCase() === t.toLowerCase()));
if (stillTagged.length) fail('retired but still listed as tags: ' + stillTagged.join(', '));
else ok(Object.keys(retiredAll).length + ' retired terms, none still tagged');

// ---------- 3 · empirical: real seeds ----------
const W = [0.30, 0.24, 0.20, 0.16, 0.10];
const mk = (name, hexes) => ({ name, swatches: hexes.map((h, i) => { const [r, g, b] = hexToRgb(h); const lab = rgb2oklab(r / 255, g / 255, b / 255); return { hex: h, weight: W[i] || 0.1, L: lab.L, a: lab.a, b: lab.b }; }) });
const seeds = [
  mk('Harbour Mist', ['#c4ccca', '#a3afb0', '#828f92', '#62706f', '#dfe3e1']),
  mk('Last Light', ['#f0d3a4', '#e2a85f', '#c87d3c', '#9a5128', '#5c3220']),
  mk('Poured Concrete', ['#d3d5d4', '#b4b7b6', '#949897', '#74797a', '#585d5e']),
  mk('Powder', ['#ece2e8', '#dccfdb', '#cdbfd2', '#d7d4e4', '#c4c2b8']),
  mk('Ink & Ember', ['#221f28', '#3a3340', '#5c3a38', '#7c4a39', '#15131a']),
];
const dims = Object.keys(vocab.facets);
console.log('\nEMPIRICAL — the five shipped seed palettes');
for (const p of seeds) {
  const m = measures(p.swatches);
  const row = [];
  let bad = false;
  for (const d of dims) {
    const hits = resolveAll(d, m);
    if (hits.length !== 1) { fail(p.name + ' / ' + d + ' resolved to ' + hits.length + ' values: [' + hits + ']'); bad = true; }
    row.push(vocab.facets[d].buckets.find((b) => b.value === hits[0]).label);
  }
  if (!bad) ok(p.name.padEnd(16) + row.join(' · '));
}

// ---------- 4 · empirical: randomised sweep over the whole input space ----------
console.log('\nEMPIRICAL — randomised sweep');
let seed = 12345;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const N = 4000;
let swept = 0;
const seen = Object.fromEntries(dims.map((d) => [d, new Set()]));
for (let i = 0; i < N; i++) {
  const n = 2 + Math.floor(rnd() * 6);
  const hexes = Array.from({ length: n }, () => '#' + Array.from({ length: 3 }, () => Math.floor(rnd() * 256).toString(16).padStart(2, '0')).join(''));
  const raw = hexes.map(() => rnd());
  const tot = raw.reduce((a, b) => a + b, 0);
  const p = { swatches: hexes.map((h, k) => { const [r, g, b] = hexToRgb(h); const lab = rgb2oklab(r / 255, g / 255, b / 255); return { hex: h, weight: raw[k] / tot, L: lab.L, a: lab.a, b: lab.b }; }) };
  const m = measures(p.swatches);
  for (const d of dims) {
    const hits = resolveAll(d, m);
    if (hits.length !== 1) { fail('sweep #' + i + ' / ' + d + ' resolved to ' + hits.length + ' values'); }
    else seen[d].add(hits[0]);
  }
  swept++;
}
ok(swept + ' random palettes × ' + dims.length + ' dimensions, exactly one value every time');
for (const d of dims) {
  const total = vocab.facets[d].buckets.length;
  console.log('    ' + d.padEnd(12) + seen[d].size + '/' + total + ' buckets reached: ' + [...seen[d]].join(', '));
}

console.log(failures ? '\nFAILED — ' + failures + ' problem(s)\n' : '\nAll checks passed.\n');
process.exit(failures ? 1 : 0);
