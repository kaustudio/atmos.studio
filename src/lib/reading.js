// Compositional local reading engine — the guaranteed baseline interpretation.
//
// This replaces the old 5-archetype / ~25-name mock. Rather than snapping a palette to the nearest
// of five canned moods, it reads six independent axes off the palette's own OKLCH data and COMPOSES
// a name, descriptors and a rationale from vocabulary keyed to the resulting bands.
//
// Three properties the archetype mock did not have, and which the whole design hangs on:
//   1. Compositional — the axes are read independently, so the name space is the product of the
//      bands rather than a fixed list. Two palettes that differ on any axis can diverge.
//   2. Deterministic — the seed is an order-stable hash of the swatch hexes. The same palette reads
//      the same on every reload, every device, forever. The seed only ever chooses WITHIN the bands
//      the analysis already selected; it never randomises the reading itself.
//   3. Honest — vocabulary that names a colour carries a hue/temperature constraint, so a cool
//      palette can never be called "Ember" and a grey one can never be called "Jade". Nothing is
//      claimed that the numbers do not support.
//
// Pure, offline, no DOM, no network, no dependencies beyond the colour maths in ./color.js — which
// means scripts/reading-check.mjs can exercise it directly in Node.

import { contrastRatio } from './color.js';

// ============================================================================================
// Determinism: order-stable seed + a small PRNG
// ============================================================================================

import { rng } from './hash.js';

// FNV-1a over the SORTED hex list. Sorting is what makes it order-stable: k-means can hand back the
// same five colours in a different order between runs, and that must not change the reading.
export function paletteSeed(swatches) {
  const key = swatches.map((s) => String((s && s.hex) || '').toLowerCase()).sort().join('');
  let h = 2166136261 >>> 0;
  for (let i = 0; i < key.length; i++) { h ^= key.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}

// mulberry32 now lives in ./hash.js alongside the content hash, so the extraction side and the
// reading side cannot end up with two subtly different PRNGs. Same function, same sequence —
// paletteSeed above is deliberately untouched, because changing it would rename every palette
// already in every user's archive.

// Deterministic pick with a rotation offset — `nth` walks further into the pool without re-rolling,
// which is how collision handling asks for "the next candidate" rather than a different random one.
function pick(pool, r, nth) {
  if (!pool || !pool.length) return null;
  const base = Math.floor(r() * pool.length);
  return pool[(base + (nth || 0)) % pool.length];
}

// ============================================================================================
// Axis analysis — every axis returns a labelled BAND, never a bare number
// ============================================================================================

const DEG = 180 / Math.PI;

// OKLab a/b → chroma + hue angle. Hue is only meaningful once chroma clears the grey floor.
function polar(s) {
  const C = Math.sqrt(s.a * s.a + s.b * s.b);
  let H = Math.atan2(s.b, s.a) * DEG;
  if (H < 0) H += 360;
  return { C, H };
}

// Hue families, in OKLab hue-angle space (pure red ≈ 29°, yellow ≈ 100°, green ≈ 143°,
// cyan ≈ 195°, blue ≈ 264°, magenta ≈ 329°).
function hueFamily(H) {
  if (H < 15 || H >= 340) return 'pink';
  if (H < 45) return 'red';
  if (H < 80) return 'orange';
  if (H < 115) return 'yellow';
  if (H < 165) return 'green';
  if (H < 215) return 'teal';
  if (H < 290) return 'blue';
  return 'purple';
}

const CHROMA_FLOOR = 0.02;   // below this a swatch is a grey and its hue angle is noise

function band(v, cuts, names) {
  for (let i = 0; i < cuts.length; i++) if (v < cuts[i]) return names[i];
  return names[names.length - 1];
}

export function analysePalette(swatches) {
  const sw = (swatches || []).filter((s) => s && typeof s.L === 'number');
  if (!sw.length) return null;

  const totW = sw.reduce((a, s) => a + (s.weight || 0), 0) || 1;
  const parts = sw.map((s) => {
    const p = polar(s);
    return { hex: s.hex, w: (s.weight || 0) / totW, L: s.L, C: p.C, H: p.H };
  });

  // ---- chroma ----------------------------------------------------------------------------
  const meanC = parts.reduce((a, p) => a + p.C * p.w, 0);
  const cs = parts.map((p) => p.C).sort((a, b) => a - b);
  const maxC = cs[cs.length - 1], minC = cs[0], medC = cs[Math.floor(cs.length / 2)];
  const chromaBand = band(meanC, [0.018, 0.045, 0.09, 0.15], ['grey', 'muted', 'restrained', 'saturated', 'vivid']);
  // "accented" is the shape that matters editorially: greys carrying one loud colour.
  const spreadBand = (maxC > 0.06 && maxC > medC * 2.6) ? 'accented'
    : (maxC - minC < 0.03) ? 'uniform' : 'graded';

  // ---- temperature -----------------------------------------------------------------------
  // cos(H − 65°) is +1 at orange and −1 at its opposite (≈245°, blue), so it reads as a smooth
  // warm↔cool scalar. Weighted by chroma as well as area: a grey has no temperature to vote with.
  let wsum = 0, warmAcc = 0;
  parts.forEach((p) => { const k = p.w * p.C; wsum += k; warmAcc += k * Math.cos((p.H - 65) / DEG); });
  const warmth = wsum > 1e-6 ? warmAcc / wsum : 0;
  const tempBand = warmth > 0.35 ? 'warm' : warmth < -0.35 ? 'cool' : 'neutral';
  // A palette is temperature-SPLIT when both ends carry real area, not just a stray pixel.
  const hasWarm = parts.some((p) => p.C > 0.035 && Math.cos((p.H - 65) / DEG) > 0.45 && p.w >= 0.12);
  const hasCool = parts.some((p) => p.C > 0.035 && Math.cos((p.H - 65) / DEG) < -0.45 && p.w >= 0.12);
  const split = hasWarm && hasCool;

  // ---- lightness -------------------------------------------------------------------------
  const meanL = parts.reduce((a, p) => a + p.L * p.w, 0);
  const Ls = parts.map((p) => p.L);
  const lightBand = band(meanL, [0.30, 0.45, 0.62, 0.80], ['dark', 'low', 'mid', 'high', 'pale']);
  const rangeBand = band(Math.max(...Ls) - Math.min(...Ls), [0.18, 0.42], ['compressed', 'moderate', 'wide']);

  // ---- contrast structure ----------------------------------------------------------------
  // sRGB/WCAG, not OKLCH L — this is the axis a designer can actually act on.
  let maxRatio = 1;
  for (let i = 0; i < parts.length; i++) {
    for (let j = i + 1; j < parts.length; j++) {
      const r = contrastRatio(parts[i].hex, parts[j].hex);
      if (r > maxRatio) maxRatio = r;
    }
  }
  const contrastBand = band(maxRatio, [2, 4.5, 7], ['flat', 'gentle', 'structured', 'stark']);

  // ---- dominance -------------------------------------------------------------------------
  const ws = parts.map((p) => p.w).sort((a, b) => b - a);
  const domBand = ws[0] >= 0.42 ? 'dominant'
    : (ws[0] + (ws[1] || 0)) >= 0.66 ? 'paired'
      : (ws[0] - ws[ws.length - 1]) <= 0.10 ? 'even' : 'graded';

  // ---- hue relationship ------------------------------------------------------------------
  // Circular span = 360 − the largest empty arc between chromatic swatches.
  const chromatic = parts.filter((p) => p.C > CHROMA_FLOOR);
  let span = 0;
  if (chromatic.length >= 2) {
    const hs = chromatic.map((p) => p.H).sort((a, b) => a - b);
    let gap = (hs[0] + 360) - hs[hs.length - 1];
    for (let i = 1; i < hs.length; i++) gap = Math.max(gap, hs[i] - hs[i - 1]);
    span = 360 - gap;
  }
  const hueRel = chromatic.length < 2 ? 'mono' : band(span, [30, 90, 180], ['mono', 'analogous', 'broad', 'opposed']);

  // Dominant hue family, weighted by area × chroma — only trustworthy above the grey floor.
  let famW = {};
  chromatic.forEach((p) => { const f = hueFamily(p.H); famW[f] = (famW[f] || 0) + p.w * p.C; });
  let family = null, best = 0;
  Object.keys(famW).forEach((f) => { if (famW[f] > best) { best = famW[f]; family = f; } });
  if (chromaBand === 'grey') family = null;   // never name a hue a grey palette doesn't really have

  // When one swatch carries the colour and the rest are effectively grey, the palette is NOT
  // "greens" — it is greys with a green accent. Record the accent separately so the rationale can
  // say what is actually there.
  let accent = null;
  if (spreadBand === 'accented') {
    const loud = parts.slice().sort((x, y) => y.C - x.C)[0];
    accent = { family: hueFamily(loud.H), greyBase: medC < CHROMA_FLOOR };
  }

  const A = {
    temperature: { band: tempBand, warmth, split },
    chroma: { band: chromaBand, mean: meanC, spread: spreadBand, accent },
    lightness: { band: lightBand, mean: meanL, range: rangeBand },
    contrast: { band: contrastBand, max: maxRatio },
    dominance: { band: domBand, top: ws[0] },
    hue: { band: hueRel, span, family },
  };

  // ---- salience: which axes are actually distinctive about THIS palette --------------------
  // The rationale reads mechanical when it recites every axis every time. Ranking lets it speak
  // only to what is unusual here, which is also what a person would notice first.
  A.salience = [
    ['chroma', Math.abs(meanC - 0.07) / 0.07 + (spreadBand === 'accented' ? 0.9 : 0)],
    ['lightness', Math.abs(meanL - 0.55) / 0.30 + (rangeBand === 'wide' ? 0.4 : 0)],
    ['contrast', Math.abs(maxRatio - 4.5) / 4.5],
    ['temperature', Math.abs(warmth) + (split ? 1.1 : 0)],
    // dominance is real but rarely the FIRST thing anyone notices, so it sits low by design —
    // leading a descriptor set with "Anchored" reads like a readout, not a reading
    ['dominance', domBand === 'dominant' ? 0.42 : domBand === 'even' ? 0.26 : 0.15],
    ['hue', hueRel === 'opposed' ? 1.0 : hueRel === 'mono' ? 0.75 : hueRel === 'broad' ? 0.5 : 0.3],
  ].sort((x, y) => y[1] - x[1]).map((x) => x[0]);

  return A;
}

// ============================================================================================
// Vocabulary
//
// Entries are "Word" or "Word|temp" or "Word|temp|hue" ('-' = unconstrained). The constraints are
// the honesty guardrail: a word that names a colour only surfaces when the palette actually holds
// that colour. Everything unconstrained is material/neutral and always safe.
// ============================================================================================

function parseEntry(e) {
  const p = e.split('|');
  return { w: p[0], t: p[1] && p[1] !== '-' ? p[1] : null, h: p[2] && p[2] !== '-' ? p[2] : null };
}

// Substance — the noun. Keyed by chroma × lightness: what the colour is MADE of.
const SUBSTANCE = {
  grey: {
    dark: ['Basalt', 'Onyx', 'Pitch', 'Graphite', 'Soot', 'Anthracite', 'Char', 'Obsidian'],
    low: ['Slate', 'Flint', 'Iron', 'Pewter', 'Shale', 'Gunmetal', 'Cinder', 'Ash'],
    mid: ['Concrete', 'Limestone', 'Pewter', 'Driftwood', 'Putty', 'Zinc', 'Ash', 'Grit'],
    high: ['Chalk', 'Plaster', 'Linen', 'Bone', 'Paper', 'Porcelain', 'Gesso', 'Oat'],
    pale: ['Chalk', 'Porcelain', 'Muslin', 'Alabaster', 'Paper', 'Salt', 'Frost', 'Milkglass'],
  },
  muted: {
    dark: ['Basalt', 'Peat|warm', 'Umber|warm|orange', 'Tarn|cool', 'Soot', 'Bitumen', 'Graphite', 'Loam|warm'],
    low: ['Slate', 'Flint', 'Moss|-|green', 'Heather|-|purple', 'Sable|warm', 'Shale', 'Bracken|warm|orange', 'Pewter'],
    mid: ['Driftwood', 'Limestone', 'Sage|-|green', 'Putty', 'Sandstone|warm|orange', 'Lichen|-|green', 'Ash', 'Loess|warm|yellow'],
    high: ['Oat', 'Linen', 'Shell', 'Almond|warm', 'Parchment|warm', 'Buff|warm', 'Chamomile|warm|yellow', 'Sage|-|green'],
    pale: ['Muslin', 'Shell', 'Powder', 'Haze', 'Veil', 'Wash', 'Frost|cool', 'Blossom|-|pink'],
  },
  restrained: {
    dark: ['Ink|cool', 'Peat|warm', 'Umber|warm|orange', 'Tarn|cool', 'Bitumen', 'Loam|warm', 'Moss|-|green', 'Damson|-|purple'],
    low: ['Clay|warm|orange', 'Moss|-|green', 'Rust|warm|orange', 'Bracken|warm|orange', 'Heather|-|purple', 'Tannin|warm|orange', 'Sable|warm', 'Bramble|-|purple'],
    mid: ['Clay|warm|orange', 'Sandstone|warm|orange', 'Sage|-|green', 'Terracotta|warm|orange', 'Ochre|warm|yellow', 'Lichen|-|green', 'Adobe|warm|orange', 'Slate|cool'],
    high: ['Oat', 'Sage|-|green', 'Shell', 'Straw|warm|yellow', 'Almond|warm', 'Chamomile|warm|yellow', 'Parchment|warm', 'Buff|warm'],
    pale: ['Powder', 'Shell', 'Muslin', 'Blossom|-|pink', 'Meringue', 'Haze', 'Veil', 'Wash'],
  },
  saturated: {
    dark: ['Ember|warm|orange', 'Ink|cool', 'Garnet|warm|red', 'Cobalt|cool|blue', 'Bottle|-|green', 'Damson|-|purple', 'Oxblood|warm|red', 'Indigo|cool|blue'],
    low: ['Rust|warm|orange', 'Garnet|warm|red', 'Bottle|-|green', 'Cobalt|cool|blue', 'Teal|cool|teal', 'Amber|warm|yellow', 'Copper|warm|orange', 'Plum|-|purple'],
    mid: ['Amber|warm|yellow', 'Copper|warm|orange', 'Cobalt|cool|blue', 'Teal|cool|teal', 'Coral|warm|red', 'Jade|-|green', 'Saffron|warm|yellow', 'Cerise|-|pink'],
    high: ['Apricot|warm|orange', 'Coral|warm|red', 'Marigold|warm|yellow', 'Aqua|cool|teal', 'Peony|-|pink', 'Citron|-|yellow', 'Melon|warm|orange', 'Sorbet|warm'],
    pale: ['Sorbet|warm', 'Blossom|-|pink', 'Aqua|cool|teal', 'Sherbet|warm|orange', 'Peony|-|pink', 'Citron|-|yellow', 'Opal', 'Meringue'],
  },
  vivid: {
    dark: ['Ember|warm|orange', 'Cobalt|cool|blue', 'Garnet|warm|red', 'Ultramarine|cool|blue', 'Oxblood|warm|red', 'Viridian|-|green', 'Indigo|cool|blue', 'Magenta|-|pink'],
    low: ['Cobalt|cool|blue', 'Vermilion|warm|red', 'Viridian|-|green', 'Garnet|warm|red', 'Ultramarine|cool|blue', 'Emerald|-|green', 'Crimson|warm|red', 'Teal|cool|teal'],
    mid: ['Vermilion|warm|red', 'Cobalt|cool|blue', 'Viridian|-|green', 'Marigold|warm|yellow', 'Cerise|-|pink', 'Emerald|-|green', 'Tangerine|warm|orange', 'Ultramarine|cool|blue'],
    high: ['Marigold|warm|yellow', 'Tangerine|warm|orange', 'Cerise|-|pink', 'Chartreuse|-|green', 'Aqua|cool|teal', 'Flamingo|-|pink', 'Citron|-|yellow', 'Coral|warm|red'],
    pale: ['Sherbet', 'Chartreuse|-|green', 'Flamingo|-|pink', 'Aqua|cool|teal', 'Citron|-|yellow', 'Sorbet', 'Peony|-|pink', 'Opal'],
  },
};

// Qualifier — the adjective. Keyed by temperature × contrast: how the light is BEHAVING.
const QUALIFIER = {
  warm: {
    flat: ['Low', 'Still', 'Banked', 'Smouldering', 'Hushed', 'Dormant', 'Settled', 'Even'],
    gentle: ['Soft', 'Late', 'Mellow', 'Drifting', 'Waning', 'Gentle', 'Faded', 'Low'],
    structured: ['Struck', 'Kindled', 'Lit', 'Raked', 'Burnished', 'Cut', 'Banked', 'Falling'],
    stark: ['Struck', 'Scorched', 'Blazing', 'Cut', 'Hard', 'Forged', 'Raked', 'Fired'],
  },
  cool: {
    flat: ['Still', 'Flat', 'Becalmed', 'Overcast', 'Hushed', 'Sunken', 'Muffled', 'Even'],
    gentle: ['Drifting', 'Washed', 'Fading', 'Soft', 'Distant', 'Quiet', 'Veiled', 'Dim'],
    structured: ['Cut', 'Clear', 'Etched', 'Sharpened', 'Set', 'Raked', 'Drawn', 'Keen'],
    stark: ['Cut', 'Frozen', 'Stark', 'Hard', 'Etched', 'Glacial', 'Severed', 'Keen'],
  },
  neutral: {
    flat: ['Even', 'Still', 'Level', 'Hushed', 'Flat', 'Settled', 'Quiet', 'Plain'],
    gentle: ['Soft', 'Worn', 'Faded', 'Quiet', 'Muted', 'Drifting', 'Weathered', 'Low'],
    structured: ['Set', 'Cut', 'Drawn', 'Ruled', 'Marked', 'Raked', 'Struck', 'Clear'],
    stark: ['Stark', 'Cut', 'Hard', 'Split', 'Ruled', 'Severed', 'Bare', 'Sheer'],
  },
};

// Atmosphere — the place or hour. Keyed by lightness × hue relationship. Some entries are two
// words already, so patterns that combine them stay inside the 1–3 word budget.
const ATMOSPHERE = {
  dark: {
    mono: ['Nightfall', 'Deep Field', 'Undertow', 'Lowlight', 'Nocturne', 'Blackwater|cool'],
    analogous: ['Nightfall', 'Low Lamp|warm', 'Dusk', 'Undergrowth|-|green', 'Cellar', 'Emberfield|warm|orange'],
    broad: ['After Dark', 'Deep Field', 'Nightshift', 'Backlot', 'Understory|-|green'],
    opposed: ['After Dark', 'Nightshift', 'Eclipse', 'Counterlight', 'Crosscurrent'],
  },
  low: {
    mono: ['Dusk', 'Gloaming', 'Shadowline', 'Lowlight', 'Halflight'],
    analogous: ['Gloaming', 'Last Light|warm', 'Dusk', 'Firelight|warm|orange', 'Lamplight|warm', 'Hedgerow|-|green'],
    broad: ['Half Light', 'Twilight', 'Backcountry', 'Shorewatch|cool', 'Understory|-|green'],
    opposed: ['Twilight', 'Counterlight', 'Crossfade', 'Split Hour', 'Nightfall'],
  },
  mid: {
    mono: ['Overcast', 'Flat Day', 'Grey Weather', 'Stillwater|cool', 'Midfield'],
    analogous: ['Overcast', 'Low Tide|cool', 'Harbour|cool', 'Field Study', 'Quiet Coast|cool', 'Hedgerow|-|green', 'Late Afternoon|warm', 'Kiln|warm', 'Dry Season|warm', 'Open Country'],
    broad: ['Weather', 'Harbour|cool', 'Open Ground', 'Middle Distance', 'Crosswind', 'Open Country', 'Long Afternoon|warm'],
    opposed: ['Crosswind', 'Split Weather', 'Counterpoint', 'Open Ground', 'Crossfade'],
  },
  high: {
    mono: ['Daylight', 'Clear Morning', 'Whitewash', 'Open Sky|cool', 'High Room'],
    analogous: ['Morning', 'Daybreak', 'Sunwashed|warm', 'Meadow|-|green', 'Shoreline|cool', 'Open Sky|cool'],
    broad: ['Daylight', 'Open Air', 'Wide Morning', 'Seaboard|cool', 'Meadow|-|green'],
    opposed: ['Bright Weather', 'Counterlight', 'Open Air', 'Crosslight', 'Daybreak'],
  },
  pale: {
    mono: ['Whitewash', 'Snowlight', 'Bleach', 'High Key', 'Blank Weather'],
    analogous: ['Sun-Bleached|warm', 'Snowlight', 'Bloom', 'Sea Haze|cool', 'First Light'],
    broad: ['Sun-Bleached|warm', 'Wide Light', 'Sea Haze|cool', 'Bloom', 'Open Light'],
    opposed: ['Crosslight', 'Bright Haze', 'Wide Light', 'Bleach', 'Prism'],
  },
};

// Atmosphere words that assert an absence of colour. "Grey Weather" on a saturated red palette is
// as false as "Ember" on a cool one, so these are gated on the palette actually being low-chroma.
const ATMO_GREY = ['Grey Weather', 'Overcast', 'Flat Day', 'Whitewash', 'Bleach', 'Blank Weather', 'Snowlight', 'Stillwater', 'Lowlight', 'Halflight', 'Half Light'];

// Qualifiers that carry an implied light level of their own. "Smouldering" on a pale palette and
// "Blazing" on a dark one are contradictions the temperature×contrast key can't catch, so each of
// these is restricted to the lightness bands where it can be literally true.
const QUAL_LIGHT = {
  Smouldering: ['dark', 'low'], Banked: ['dark', 'low', 'mid'], Dormant: ['dark', 'low', 'mid'],
  Kindled: ['dark', 'low', 'mid'], Sunken: ['dark', 'low', 'mid'], Dim: ['dark', 'low', 'mid'],
  Waning: ['dark', 'low', 'mid'], Muffled: ['dark', 'low', 'mid'], Faded: ['low', 'mid', 'high', 'pale'],
  Blazing: ['mid', 'high', 'pale'], Fired: ['low', 'mid', 'high'], Scorched: ['low', 'mid', 'high'],
  Glacial: ['mid', 'high', 'pale'], Frozen: ['mid', 'high', 'pale'], Burnished: ['low', 'mid', 'high'],
  Lit: ['mid', 'high', 'pale'], Sheer: ['mid', 'high', 'pale'],
};

// Pairings that pass the constraint filters but still read badly together.
const BLOCKED = new Set([
  'Scorched|Frost', 'Blazing|Frost', 'Fired|Frost', 'Glacial|Ember', 'Frozen|Ember',
  'Blazing|Snowlight', 'Scorched|Salt', 'Glacial|Amber', 'Frozen|Amber', 'Scorched|Milkglass',
  'Blazing|Bleach', 'Glacial|Saffron', 'Frozen|Copper', 'Scorched|Porcelain',
]);

// Words that mean substantially the same thing. Two of them in one name reads as a stutter
// ("Whitewash Milkglass") even though each is individually correct for the bands.
const SYNONYMS = [
  ['whitewash', 'milkglass', 'chalk', 'alabaster', 'porcelain', 'salt', 'bleach', 'snowlight', 'gesso', 'plaster', 'paper', 'muslin', 'linen', 'blank'],
  ['pitch', 'soot', 'char', 'onyx', 'obsidian', 'basalt', 'anthracite', 'nightfall', 'nocturne', 'blackwater', 'lowlight', 'cinder'],
  ['daylight', 'daybreak', 'morning', 'gloaming', 'dusk', 'twilight', 'halflight', 'nightfall', 'sunwashed'],
  ['haze', 'veil', 'wash', 'bloom', 'blossom'],
  ['slate', 'flint', 'shale', 'limestone', 'concrete', 'grit', 'stone'],
  ['ember', 'firelight', 'lamplight', 'emberfield', 'kindled'],
  ['overcast', 'weather', 'becalmed', 'stillwater'],
];
const synGroup = (w) => SYNONYMS.findIndex((g) => g.indexOf(w) >= 0);

// A name is a stutter if two of its words repeat, share a long stem ("Weathered Grey Weather"),
// or belong to the same synonym group.
function stutters(name) {
  const ws = name.toLowerCase().replace(/&/g, ' ').split(/\s+/).filter(Boolean);
  for (let i = 0; i < ws.length; i++) {
    for (let j = i + 1; j < ws.length; j++) {
      if (ws[i] === ws[j]) return true;
      const n = Math.min(ws[i].length, ws[j].length, 6);
      if (n >= 5 && ws[i].slice(0, n) === ws[j].slice(0, n)) return true;
      const g = synGroup(ws[i]);
      if (g >= 0 && g === synGroup(ws[j])) return true;
    }
  }
  return false;
}

// Select from a pool, honouring the temperature/hue constraints, with graceful widening so the
// pool can never come back empty.
// `fallback` is where this widens to when the constraints empty the pool — and it must be a pool of
// UNCONSTRAINED words. Widening back to the full list is how a rainbow palette ends up called
// "Coral": the very words the constraints just rejected come back in through the last door.
function eligible(pool, temp, family, fallback) {
  const all = (pool || []).map(parseEntry);
  const strict = all.filter((e) => (!e.t || e.t === temp) && (!e.h || e.h === family));
  if (strict.length) return strict.map((e) => e.w);
  const loose = all.filter((e) => !e.h && (!e.t || e.t === temp));
  if (loose.length) return loose.map((e) => e.w);
  const bare = all.filter((e) => !e.t && !e.h);
  if (bare.length) return bare.map((e) => e.w);
  const fb = (fallback || []).map(parseEntry).filter((e) => !e.t && !e.h);
  const out = (fb.length ? fb : all.filter((e) => !e.h)).map((e) => e.w);
  out.widened = true;   // the caller uses this to prefer an atmosphere name over a bland material one
  return out;
}

// ============================================================================================
// Composition
// ============================================================================================

const CAP = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const words = (s) => s.trim().split(/\s+/).length;

function composeName(A, r, nth) {
  const temp = A.temperature.band, family = A.hue.family;
  // the grey pool of the same lightness is the safe widening target: pure material words, no
  // colour or temperature claims, so it can never reintroduce a hue the palette doesn't hold
  const subPool = eligible(SUBSTANCE[A.chroma.band][A.lightness.band], temp, family, SUBSTANCE.grey[A.lightness.band]);
  const qualAll = QUALIFIER[temp][A.contrast.band];
  const qualFit = qualAll.filter((q) => !QUAL_LIGHT[q] || QUAL_LIGHT[q].indexOf(A.lightness.band) >= 0);
  const qualPool = qualFit.length ? qualFit : qualAll.filter((q) => !QUAL_LIGHT[q]);
  // atmosphere carries the same honesty constraints as substance, plus a greyness gate
  const lowChroma = A.chroma.band === 'grey' || A.chroma.band === 'muted' || (A.chroma.accent && A.chroma.accent.greyBase);
  const atmoAll = eligible(ATMOSPHERE[A.lightness.band][A.hue.band], temp, family);
  const atmoFit = lowChroma ? atmoAll : atmoAll.filter((w) => ATMO_GREY.indexOf(w) < 0);
  const atmoPool = atmoFit.length ? atmoFit : atmoAll;

  const S = pick(subPool, r, nth);
  const S2 = pick(subPool, r, nth + 3);
  const Q = pick(qualPool, r, nth);
  const At = pick(atmoPool, r, nth);
  if (!S) return null;

  // Patterns, in a deterministic order chosen by the seed. Each is tried in turn until one
  // produces something legal, so a blocked pairing degrades to the next shape rather than failing.
  // Compound shapes are listed more than once: a bare noun is the narrowest space in the engine and
  // was where almost every collision came from, so it stays available but rare.
  const shapes = [
    () => Q + ' ' + S,
    () => Q + ' ' + At,
    () => (words(At) === 1 && At !== S) ? (At + ' ' + S) : null,
    () => Q + ' ' + S,
    () => (S2 && S2 !== S) ? (S + ' & ' + S2) : null,
    () => Q + ' ' + At,
    () => At,
    () => S,
  ];
  // When no substance survived the honesty filters the pool widened to plain material words, which
  // are safe but bland — "Oat" for a neon rainbow. Atmosphere carries those palettes far better,
  // so lead with the shapes built on it.
  const order = subPool.widened && A.chroma.band !== 'grey' ? [1, 2, 5, 6, 0, 3, 4, 7] : null;
  const start = Math.floor(r() * shapes.length);
  for (let i = 0; i < shapes.length; i++) {
    const idx = order ? order[i % order.length] : (start + i + nth) % shapes.length;
    const out = shapes[idx]();
    if (!out) continue;
    if (BLOCKED.has(Q + '|' + S) && out.indexOf(Q) === 0) continue;
    if (words(out) > 3 || out.length > 42) continue;
    if (stutters(out)) continue;
    return out;
  }
  // every shape was rejected — fall back to the bare noun, which can never stutter with itself
  return S;
}

// Descriptors — adjectives keyed to the active bands, ordered by how distinctive each axis is.
const ADJ = {
  temperature: { warm: 'Warm', cool: 'Cool', neutral: 'Neutral' },
  chroma: { grey: 'Achromatic', muted: 'Muted', restrained: 'Restrained', saturated: 'Saturated', vivid: 'Vivid' },
  lightness: { dark: 'Dark', low: 'Low-lit', mid: 'Even', high: 'Bright', pale: 'Pale' },
  contrast: { flat: 'Flat', gentle: 'Gentle', structured: 'Structured', stark: 'Stark' },
  dominance: { dominant: 'Anchored', paired: 'Paired', even: 'Balanced', graded: 'Graded' },
  hue: { mono: 'Monochrome', analogous: 'Harmonious', broad: 'Varied', opposed: 'Opposed' },
};

// A little colour on top of the mechanical labels, so the set doesn't read like a readout.
function moodAdj(A) {
  const L = A.lightness.band, C = A.chroma.band, T = A.temperature.band;
  const out = [];
  if (L === 'dark' && (C === 'muted' || C === 'grey')) out.push('Sombre');
  if (L === 'dark' && (C === 'saturated' || C === 'vivid')) out.push('Smouldering');
  if (L === 'pale' && C !== 'vivid') out.push('Weightless');
  if (L === 'high' && T === 'warm') out.push('Sunlit');
  if (T === 'cool' && A.contrast.band === 'flat') out.push('Becalmed');
  if (T === 'warm' && (C === 'saturated' || C === 'vivid')) out.push('Golden');
  if (A.temperature.split) out.push('Contrasted');
  if (A.chroma.spread === 'accented') out.push('Accented');
  if (A.contrast.band === 'stark') out.push('Graphic');
  if (C === 'grey' && A.contrast.band !== 'stark') out.push('Quiet');
  return out;
}

function composeDescriptors(A, r) {
  const out = [];
  const seen = new Set();
  const add = (w) => { if (w && !seen.has(w.toLowerCase())) { seen.add(w.toLowerCase()); out.push(w); } };
  // most-characteristic axis first
  A.salience.forEach((ax) => add(ADJ[ax][A[ax].band]));
  // then one or two mood words, seeded so consecutive palettes don't share the same tail
  const moods = moodAdj(A);
  if (moods.length) add(pick(moods, r, 0));
  const four = out.slice(0, 3);
  if (moods.length > 1) { const m = pick(moods, r, 1); if (m && four.indexOf(m) < 0) four.push(m); }
  while (four.length < 3 && out.length > four.length) four.push(out[four.length]);
  return four.slice(0, 4);
}

// ---- rationale ------------------------------------------------------------------------------
// Fragments describe only what was measured. The hue noun is the one place a colour gets named,
// and it falls back to "tones" whenever chroma is too low for a hue claim to be true.
const HUE_NOUN = { pink: 'pinks', red: 'reds', orange: 'oranges', yellow: 'yellows', green: 'greens', teal: 'teals', blue: 'blues', purple: 'violets' };

function frags(A) {
  const acc = A.chroma.accent;
  // Naming a single family is only honest when the palette actually sits in one. Spread across the
  // wheel it is "hues", not whichever family happened to win the weighting — a rainbow is not
  // "violets" just because the violet swatch carried the most chroma×area.
  const spreadOut = A.hue.band === 'opposed' || A.hue.band === 'broad';
  // "tones" rather than "hues" for the spread case: every hue-relationship clause already begins
  // with "hues", and the pair reads as a stutter in the same sentence.
  const noun = (acc && acc.greyBase) ? 'greys'
    : A.chroma.band === 'grey' ? 'greys'
      : spreadOut ? 'tones'
        : (A.hue.family ? HUE_NOUN[A.hue.family] : 'tones');
  return {
    noun,
    accent: acc ? ('one ' + HUE_NOUN[acc.family].replace(/s$/, '') + ' carrying the only real colour') : null,
    // "near-neutral" reads as "greyish", which is right for a grey palette and wrong for a green
    // one that simply sits on the warm/cool boundary — so the phrasing follows the chroma.
    temp: A.temperature.band !== 'neutral' ? A.temperature.band
      : ((A.chroma.band === 'grey' || (acc && acc.greyBase)) ? 'near-neutral' : 'neither warm nor cool'),
    // adjectival form, for the templates that put temperature in front of the noun — the long
    // predicative phrase reads badly there ("Neither warm nor cool hues lifted high")
    tempAdj: { warm: 'warm', cool: 'cool', neutral: 'balanced' }[A.temperature.band],
    chroma: { grey: 'achromatic', muted: 'low-chroma', restrained: 'restrained', saturated: 'saturated', vivid: 'high-chroma' }[A.chroma.band],
    light: { dark: 'held low', low: 'kept in shadow', mid: 'sitting at mid weight', high: 'lifted high', pale: 'washed almost to white' }[A.lightness.band],
    contrast: { flat: 'under a flat, even light', gentle: 'with gentle separation', structured: 'with clear structure between them', stark: 'split by stark contrast' }[A.contrast.band],
    dom: { dominant: 'one colour carrying the frame', paired: 'two colours sharing the weight', even: 'weight spread evenly across the set', graded: 'weight stepping down through the set' }[A.dominance.band],
    hue: { mono: 'hues held to a single note', analogous: 'hues sitting close together', broad: 'hues spread wide', opposed: 'hues pulled to opposite sides' }[A.hue.band],
    // same clause without the leading noun, so a palette whose noun IS "hues" doesn't say it twice
    hueTail: { mono: 'held to a single note', analogous: 'sitting close together', broad: 'spread wide', opposed: 'pulled to opposite sides' }[A.hue.band],
  };
}

const CLOSINGS = {
  dark: ['heavy and nocturnal', 'deep and unhurried', 'weighted, almost airless', 'sombre and deliberate'],
  low: ['restrained and quietly atmospheric', 'dim and unhurried', 'low and deliberate', 'shadowed but legible'],
  mid: ['steady and matter-of-fact', 'restrained and quietly atmospheric', 'even-tempered and workable', 'plain and unhurried'],
  high: ['open and lightly held', 'clean, exact, almost architectural', 'bright without insisting', 'airy and unforced'],
  pale: ['soft and weightless', 'barely there, and deliberate about it', 'washed and quiet', 'faint but not empty'],
};

function composeRationale(A, r) {
  const f = frags(A);
  const top = A.salience.slice(0, 3);
  const has = (ax) => top.indexOf(ax) >= 0;
  const close = pick(CLOSINGS[A.lightness.band], r, 0);

  // Several shapes so consecutive palettes don't share a silhouette. Each names two or three of
  // the most distinctive axes for THIS palette, never all six.
  //
  // The templates return the OBSERVATION only; the closing is joined on at the end. They used to
  // carry ' — ' + close themselves, and the accent/split clauses were spliced in by searching for
  // that dash — so the punctuation was load-bearing string state, and two of these shapes already
  // spend a colon earlier in the line. Building the parts and joining once is what lets the joint
  // become a full stop without the colon templates ending up with two of them.
  const templates = [
    () => CAP(f.tempAdj) + ', ' + f.chroma + ' ' + f.noun + ' ' + f.light + ' ' + f.contrast,
    () => CAP(f.chroma) + ' ' + f.noun + ' ' + f.contrast + ', ' + f.dom,
    () => CAP(f.hue) + ': ' + f.chroma + ' ' + f.noun + ', ' + f.temp,
    () => CAP(f.tempAdj) + ' ' + f.noun + ' ' + f.light + ', ' + f.hueTail,
    () => CAP(f.dom) + ': ' + f.chroma + ' ' + f.noun + ' ' + f.contrast,
    () => CAP(f.chroma) + ' ' + f.noun + ' ' + f.light + ', ' + f.hueTail,
  ];
  // Bias toward templates that lead with a salient axis, then let the seed choose among them.
  const preferred = [];
  if (has('temperature')) preferred.push(0, 3);
  if (has('chroma')) preferred.push(1, 5);
  if (has('hue')) preferred.push(2);
  if (has('dominance')) preferred.push(4);
  const poolIdx = preferred.length ? preferred : [0, 1, 2, 3, 4, 5];
  const idx = pick(poolIdx, r, 0);
  let body = templates[idx]();
  // Both of these are the single most distinctive thing about the palettes they apply to, so they
  // are appended to the observation rather than left to compete for a slot in it.
  if (f.accent) body += ', ' + f.accent;
  // …unless the sentence has already said as much: "neither warm nor cool, warm and cool both
  // holding ground" is the same fact twice.
  else if (A.temperature.split && body.indexOf('neither warm nor cool') < 0) body += ', warm and cool both holding ground';
  // Observation, then verdict, as two sentences. The closings are lowercase fragments by design
  // ("shadowed but legible"), so the join capitalises: a fragment set as its own sentence is the
  // register this voice already uses, and it survives being skimmed in a way a suspended clause
  // between dashes does not.
  return (body + '. ' + CAP(close) + '.').slice(0, 240);
}

// Archetype: a single lowercase mood keyword. Consumed as `mood` in the metrics readout
// (methods/motion.js), so it must stay one short word.
function composeArchetype(A) {
  if (A.chroma.spread === 'accented') return 'accented';
  if (A.temperature.split) return 'split';
  if (A.contrast.band === 'stark') return 'graphic';
  if (A.chroma.band === 'grey') return A.lightness.band === 'dark' ? 'nocturne' : 'neutral';
  if (A.lightness.band === 'dark') return A.temperature.band === 'warm' ? 'smouldering' : 'nocturne';
  if (A.lightness.band === 'pale') return 'washed';
  if (A.chroma.band === 'vivid') return 'vivid';
  return A.temperature.band;
}

// ============================================================================================
// Public entry point
// ============================================================================================

// swatches: [{hex, weight, L, a, b}] — the palette as extracted.
// taken:    optional array of names, or of palettes ({name, swatches}), already in the feed, so two
//           DIFFERENT palettes never ship the same name.
// Returns the SAME shape the live reading returns: {name, descriptors, rationale, archetype}.
// ===== WHAT THE PALETTE IS FOR ==================================================================
// The result view used to open with the poetic reading, which says what a palette IS. This says
// what it is good FOR, which is the question someone opening a palette tool is actually asking, and
// it takes that leading slot: the reading is not deleted, it moves behind More. The audit asked for
// a line like "Best for: dark editorial identity; accent-led UI".
//
// COMPOSED, never authored, and composed from the same analysis the reading uses — so a palette
// cannot be described one way and recommended another. No seed and no randomness: a recommendation
// that varied between two identical palettes would be advice nobody could trust.
//
// It reads: <register> <medium>, <capability>. The capability clause is the honest half — a palette
// with no usable text pairing must not be recommended for interface work, and aaState is the same
// verdict the AA badge shows, so the two can never disagree.
export function composeUse(A, aaState) {
  if (!A) return '';
  const lb = A.lightness.band;                       // dark low mid high pale
  const ground = (lb === 'dark' || lb === 'low') ? 'dark' : (lb === 'pale' || lb === 'high') ? 'light' : 'mid-toned';
  const accented = A.chroma.spread === 'accented';
  const cb = A.chroma.band;                          // grey muted restrained saturated vivid
  const stark = A.contrast.band === 'stark' || A.contrast.band === 'structured';

  // The register: how loud the palette is willing to be.
  const register = accented ? 'accent-led'
    : cb === 'grey' || cb === 'muted' ? 'restrained'
      : cb === 'vivid' || cb === 'saturated' ? 'expressive'
        : A.temperature.split ? 'contrasting'
          : 'quiet';

  // The medium it suits, from structure rather than taste: something that separates cleanly can
  // carry a reading interface; something flat is better at atmosphere than at hierarchy.
  //
  // None of these may name a lightness — the sentence already opens with one, and "Best for dark,
  // expressive dark interface work" was the first thing this composer produced. Nor may any of them
  // carry an internal comma: the line is built out of comma-separated parts, and a medium with one
  // of its own turns a three-part sentence into a list of five things.
  const medium = stark
    ? (ground === 'dark' ? 'interface work' : 'editorial layout')
    : A.dominance.band === 'dominant' ? 'brand and identity work'
      : A.hue.band === 'mono' ? 'tonal composition'
        : 'photography-led layout';

  // The limit, stated plainly. This is the clause that stops the line becoming a sales pitch.
  const capability = aaState === 'flexible' ? 'enough usable pairs to build type on'
    : aaState === 'limited' ? 'usable for accents rather than body text'
      : 'no usable text pairing, so treat it as imagery';

  return 'Best for ' + ground + ', ' + register + ' ' + medium + '. ' + CAP(capability) + '.';
}

export function composeReading(swatches, taken) {
  const A = analysePalette(swatches);
  if (!A) return { name: 'Untitled', descriptors: ['Neutral', 'Quiet', 'Even'], rationale: 'A palette with too little signal to read.', archetype: 'neutral' };

  const seed = paletteSeed(swatches);
  // Determinism outranks collision avoidance: the same palette must read the same every time, so a
  // palette already in the feed with THIS seed is not a collision with itself — it is itself.
  // Without this, regenerating the same image walks to the next candidate and renames it.
  const used = new Set((taken || []).map((t) => {
    if (t && typeof t === 'object') {
      if (Array.isArray(t.swatches) && paletteSeed(t.swatches) === seed) return null;
      return String(t.name || '').toLowerCase();
    }
    return String(t || '').toLowerCase();
  }).filter(Boolean));

  // Collision handling: walk further into the same pools rather than re-rolling the reading.
  let name = null;
  for (let nth = 0; nth < 24; nth++) {
    const candidate = composeName(A, rng(seed), nth);
    if (!candidate) break;
    if (!used.has(candidate.toLowerCase())) { name = candidate; break; }
    name = candidate;   // keep the last as a floor if every candidate is taken
  }
  if (!name) name = 'Untitled';

  return {
    name: name.trim().slice(0, 42),
    descriptors: composeDescriptors(A, rng(seed ^ 0x9e3779b9)).slice(0, 4),
    rationale: composeRationale(A, rng(seed ^ 0x85ebca6b)).trim().slice(0, 240),
    archetype: composeArchetype(A),
  };
}
