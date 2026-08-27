// Token export (Workstream B) — HEX/RGB only; never the labelled CMYK-approx or Pantone-nearest
// (those stay on-screen display). Five formats: Tailwind v4 @theme, W3C design tokens, Figma
// variables JSON, plain CSS custom properties, and binary Adobe Swatch Exchange (ASEF).
import { hexToRgb } from './color.js';

export function slugName(name) { return (name || 'palette').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'palette'; }

// `slug` overrides the one derived from the name, and exists for ONE reason: a project can hold two
// palettes called Untitled, and two identical slugs in one file means two identical token names —
// the second silently wins and a colour disappears. See uniqueSlugs. Absent, nothing changes.
export function primitiveEntries(pal, slug) {
  slug = slug || slugName(pal.name);
  return pal.swatches.slice().sort((a, b) => b.weight - a.weight).map((s, i) => {
    const n = String(i + 1).padStart(2, '0');
    return { key: n, cssName: 'palette-' + slug + '-' + n, hex: s.hex.toUpperCase(), rgb: hexToRgb(s.hex) };
  });
}

// THE ROLE VOCABULARY — one definition, read by the exporters and the persistence validator.
// Order is the order they are offered in and exported in: the two ground tones,
// then the two that carry meaning, then the accent, then the ink.
//
// These replaced an earlier internal set (surface / surface-raised / on-surface / on-surface-muted
// / accent) which was this app's own CSS-token vocabulary leaking into somebody else's design
// system. THE KEY NAMES IN EVERY SEMANTIC EXPORT CHANGED WITH THEM — tokens exported before this
// deploy do not match tokens exported after it. That was a deliberate call (see DECISIONS); it is
// also the reason to think twice before renaming any of these again.
export const ROLE_IDS = ['background', 'surface', 'primary', 'secondary', 'accent', 'text'];
export const ROLE_LABEL = {
  background: 'Background', surface: 'Surface', primary: 'Primary',
  secondary: 'Secondary', accent: 'Accent', text: 'Text',
};

// Role-mapped scaffold from lightness + chroma — a starting point to refine, NOT a finished system.
//
// ORIENTED BY THE PALETTE, not by an assumption. The previous version always handed Background the
// lightest swatch and Text the darkest, which is exactly backwards for a dark palette — and this
// tool reads a great many dark photographs. The mean lightness decides which end is the ground:
// weighted by area, so a palette is "dark" when most of its surface is dark, not when it merely
// contains something dark.
//
// `override` is the user's sparse map of role → swatch index. It wins where present and the
// heuristic fills the rest, so every export always emits all six roles and a partly-refined palette
// is never half-empty.
export function semanticRoles(pal, override) {
  const sw = pal.swatches.map((s, i) => ({ i, hex: s.hex.toUpperCase(), L: s.L, w: s.weight || 0, C: Math.sqrt(s.a * s.a + s.b * s.b) }));
  const byL = sw.slice().sort((a, b) => b.L - a.L);      // lightest first
  const byC = sw.slice().sort((a, b) => b.C - a.C);      // most chromatic first
  const n = byL.length;
  const totW = sw.reduce((a, s) => a + s.w, 0) || 1;
  const meanL = sw.reduce((a, s) => a + s.L * (s.w / totW), 0);
  const dark = meanL < 0.5;
  // The ground end and the ink end, whichever way round this palette runs.
  const ground = dark ? byL.slice().reverse() : byL;     // ground[0] is the ground, ground[1] its lift
  const ink = dark ? byL : byL.slice().reverse();        // ink[0] is the ink, ink[1] its muted step

  // ASSIGNED GREEDILY, PREFERRING DISTINCTNESS. Six roles over (usually) five swatches means some
  // doubling is unavoidable, but it must be the last resort rather than an accident of ordering: a
  // first pass that simply took "second most chromatic" for Secondary handed it the same swatch as
  // Accent whenever the palette had one loud colour and greys — which is the commonest shape this
  // tool produces, and precisely the palette where two identical roles are most useless.
  //
  // Order matters: the three structural roles claim first, because a palette with no spare colour
  // should still have a legible ground and ink; the chromatic roles then take what is left.
  const used = new Set();
  const take = (cand, fallback) => {
    for (const s of cand) if (s && !used.has(s.i)) { used.add(s.i); return s.i; }
    return fallback;   // everything is spoken for: double up rather than leave a role empty
  };
  const chromatic = byC.filter((s) => s.C > 0.02);
  // Mid-tones: nearest the palette's own mean lightness. The useful fallback for a role that wants
  // a colour when the palette has none to give — better than handing Primary the white the
  // background is already using.
  const mid = sw.slice().sort((a, b) => Math.abs(a.L - meanL) - Math.abs(b.L - meanL));

  const background = take([ground[0]], ground[0].i);
  const text = take([ink[0]], ink[0].i);
  // Surface is a QUIET NEIGHBOUR of the background, not merely the next one along. On a dark
  // palette the second-darkest swatch is very often the loud accent, and a raised surface wearing
  // the accent colour is the one assignment guaranteed to be wrong. Two wants pull against each
  // other — sit near the ground, stay out of the way — so they are scored rather than filtered: a
  // threshold on chroma alone picked whichever quiet swatch happened to exist, even one at the far
  // end of the lightness range. Chroma is weighted double because a loud surface is a worse mistake
  // than a slightly distant one.
  const bgL = sw[background].L;
  const surface = take(ground.slice(1).sort((a, b) => (Math.abs(a.L - bgL) + a.C * 2) - (Math.abs(b.L - bgL) + b.C * 2)), background);
  // Accent wants real colour even at the cost of doubling: a greyscale palette has no accent, and
  // pointing the role at an off-white would be a worse answer than repeating its most chromatic
  // swatch, which is at least the closest thing to one.
  const accent = take(chromatic, (chromatic[0] || mid[0]).i);
  const primary = take(chromatic.concat(mid), accent);
  const secondary = take(chromatic.concat(mid), primary);
  const derived = { background, surface, primary, secondary, accent, text };
  const map = Object.assign({}, derived, override || {});
  return ROLE_IDS.map((role) => {
    const i = (typeof map[role] === 'number' && pal.swatches[map[role]]) ? map[role] : derived[role];
    return { role, hex: pal.swatches[i].hex.toUpperCase(), index: i };
  });
}
export function semanticEntries(pal, override, slug) {
  slug = slug || slugName(pal.name);
  return semanticRoles(pal, override).map((r) => ({ key: r.role, cssName: 'palette-' + slug + '-' + r.role, hex: r.hex.toUpperCase(), rgb: hexToRgb(r.hex) }));
}

export function buildTailwind(pal, entries, semantic) {
  let out = '/* ' + pal.name + '. Tailwind v4 @theme' + (semantic ? ', semantic scaffold: refine before shipping' : ', primitive palette') + '. HEX only. */\n@theme {\n';
  entries.forEach((e) => { out += '  --color-' + e.cssName + ': ' + e.hex + ';\n'; });
  return out + '}\n';
}
export function buildCssFile(pal, entries, semantic) {
  let out = '/* ' + pal.name + (semantic ? '. Semantic scaffold: refine before shipping' : '. Primitive palette') + '. HEX only. */\n:root {\n';
  entries.forEach((e) => { out += '  --' + e.cssName + ': ' + e.hex + ';\n'; });
  return out + '}\n';
}
export function buildW3CTokens(pal, entries, semantic) {
  const group = { '$type': 'color' };
  if (semantic) group['$description'] = 'Semantic scaffold: a role-mapped starting point to refine, not a finished system.';
  entries.forEach((e) => { group[e.key] = { '$value': e.hex, '$type': 'color' }; });
  const obj = {}; obj[slugName(pal.name)] = group;
  return JSON.stringify(obj, null, 2) + '\n';
}
export function buildFigmaTokens(pal, entries) {
  const group = {};
  entries.forEach((e) => { group[e.key] = { value: e.hex, type: 'color' }; });
  const obj = {}; obj[slugName(pal.name)] = group;
  return JSON.stringify(obj, null, 2) + '\n';
}
// Adobe Swatch Exchange (ASEF) — RGB float entries.
//
// Split into three pieces so the flat file and the grouped one below cannot drift in how a byte is
// written: a name payload, a colour block, and the container that frames whatever blocks it is
// handed. The flat output is unchanged by the split — same blocks, same order, same header.
const ASE_NAME = (name) => {
  const len = name.length + 1;                       // the null terminator counts
  const buf = new ArrayBuffer(2 + len * 2); const dv = new DataView(buf); let o = 0;
  dv.setUint16(o, len); o += 2;
  for (let i = 0; i < name.length; i++) { dv.setUint16(o, name.charCodeAt(i)); o += 2; }   // UTF-16BE
  dv.setUint16(o, 0);
  return buf;
};
const ASE_COLOR = (e) => {
  const nm = ASE_NAME(e.cssName);
  const body = new ArrayBuffer(nm.byteLength + 4 + 12 + 2); const dv = new DataView(body);
  new Uint8Array(body, 0, nm.byteLength).set(new Uint8Array(nm));
  let o = nm.byteLength;
  [0x52, 0x47, 0x42, 0x20].forEach((b) => { dv.setUint8(o, b); o += 1; });   // 'RGB '
  dv.setFloat32(o, e.rgb[0] / 255); o += 4; dv.setFloat32(o, e.rgb[1] / 255); o += 4; dv.setFloat32(o, e.rgb[2] / 255); o += 4;
  dv.setUint16(o, 0x0002);   // colour type: normal
  return body;
};
// blocks: [{ type, body }] — 0x0001 colour, 0xC001 group start, 0xC002 group end.
const ASE_FILE = (blocks) => {
  let total = 12; blocks.forEach((b) => { total += 6 + b.body.byteLength; });
  const out = new ArrayBuffer(total); const dv = new DataView(out); let o = 0;
  [0x41, 0x53, 0x45, 0x46].forEach((b) => { dv.setUint8(o, b); o += 1; });   // 'ASEF'
  dv.setUint16(o, 1); o += 2; dv.setUint16(o, 0); o += 2; dv.setUint32(o, blocks.length); o += 4;
  blocks.forEach((b) => {
    dv.setUint16(o, b.type); o += 2; dv.setUint32(o, b.body.byteLength); o += 4;
    if (b.body.byteLength) { new Uint8Array(out, o, b.body.byteLength).set(new Uint8Array(b.body)); o += b.body.byteLength; }
  });
  return new Blob([out], { type: 'application/octet-stream' });
};
export function buildASE(entries) {
  return ASE_FILE(entries.map((e) => ({ type: 0x0001, body: ASE_COLOR(e) })));
}

/* ================================ A WHOLE PROJECT, IN ONE FILE ================================
   A project is a folder of palettes, and the thing a folder is FOR is being taken somewhere as a
   set. Exporting it one palette at a time — five presses per palette, forty for a folder of eight —
   was the tool refusing to do the only job the folder had.

   ONE FILE, not a zip of many. A zip needs a compressor this app does not ship and does not want,
   browsers throw a multi-download prompt at eight separate saves, and the destination is a single
   @theme block or a single tokens.json anyway. So the set is written the way it will be read: one
   file, palettes as named groups inside it.

   Every token name is already namespaced by palette slug, so the only way one file can collide with
   itself is two palettes sharing a NAME. uniqueSlugs closes that: the second Untitled becomes
   untitled-2, deterministically and in library order, before a single entry is built. Nothing is
   silently overwritten and nothing is silently dropped. */
export function uniqueSlugs(names) {
  const seen = {}, out = [];
  for (const nm of names) {
    const base = slugName(nm);
    seen[base] = (seen[base] || 0) + 1;
    out.push(seen[base] === 1 ? base : base + '-' + seen[base]);
  }
  return out;
}
// The one place a project's palettes become exportable entries. Both layers go through it, so the
// primitive file and the semantic file group and name their contents identically.
export function projectEntryGroups(palettes, semantic) {
  const slugs = uniqueSlugs(palettes.map((p) => p.name));
  return palettes.map((p, i) => ({
    name: p.name, slug: slugs[i],
    entries: semantic ? semanticEntries(p, p.roles, slugs[i]) : primitiveEntries(p, slugs[i]),
  }));
}
const setHead = (title, groups, semantic, format) => '/* ' + title + ' — ' + groups.length + ' palette' + (groups.length === 1 ? '' : 's')
  + '. ' + format + (semantic ? ', semantic scaffold: refine before shipping' : ', primitive palettes') + '. HEX only. */\n';
export function buildTailwindSet(title, groups, semantic) {
  let out = setHead(title, groups, semantic, 'Tailwind v4 @theme') + '@theme {\n';
  // The palette's own name in a comment above its block — the slug is what code reads, the name is
  // what the person who made the folder recognises, and a file of eight anonymous slugs is not one
  // anybody can edit later.
  groups.forEach((g, i) => { out += (i ? '\n' : '') + '  /* ' + g.name + ' */\n'; g.entries.forEach((e) => { out += '  --color-' + e.cssName + ': ' + e.hex + ';\n'; }); });
  return out + '}\n';
}
export function buildCssFileSet(title, groups, semantic) {
  let out = setHead(title, groups, semantic, 'CSS custom properties') + ':root {\n';
  groups.forEach((g, i) => { out += (i ? '\n' : '') + '  /* ' + g.name + ' */\n'; g.entries.forEach((e) => { out += '  --' + e.cssName + ': ' + e.hex + ';\n'; }); });
  return out + '}\n';
}
// NESTED GROUPS, which is what both JSON formats already have a place for: the project is the outer
// group and each palette a group inside it, so the folder survives the trip instead of flattening
// into one bag of colours the moment it leaves.
export function buildW3CTokensSet(title, groups, semantic) {
  const root = { '$type': 'color' };
  if (semantic) root['$description'] = 'Semantic scaffold: a role-mapped starting point to refine, not a finished system.';
  groups.forEach((g) => { const grp = { '$type': 'color', '$description': g.name }; g.entries.forEach((e) => { grp[e.key] = { '$value': e.hex, '$type': 'color' }; }); root[g.slug] = grp; });
  const obj = {}; obj[slugName(title)] = root;
  return JSON.stringify(obj, null, 2) + '\n';
}
export function buildFigmaTokensSet(title, groups) {
  const root = {};
  groups.forEach((g) => { const grp = {}; g.entries.forEach((e) => { grp[e.key] = { value: e.hex, type: 'color' }; }); root[g.slug] = grp; });
  const obj = {}; obj[slugName(title)] = root;
  return JSON.stringify(obj, null, 2) + '\n';
}
// ASE has real folders (0xC001 opens, 0xC002 closes) and Adobe's apps show them as swatch groups —
// so a project lands in Illustrator looking like the project it came from.
export function buildASESet(groups) {
  const blocks = [];
  groups.forEach((g) => {
    blocks.push({ type: 0xC001, body: ASE_NAME(g.name) });
    g.entries.forEach((e) => blocks.push({ type: 0x0001, body: ASE_COLOR(e) }));
    blocks.push({ type: 0xC002, body: new ArrayBuffer(0) });   // group end carries no payload
  });
  return ASE_FILE(blocks);
}

export function paletteHexList(pal) { return pal.swatches.map((s) => s.hex.toUpperCase()).join('\n'); }
export function paletteCss(pal) {
  const slug = slugName(pal.name);
  let out = '/* ' + pal.name + '. Generated by Atmos Gallery */\n:root {\n';
  pal.swatches.forEach((s, i) => { out += '  --' + slug + '-' + (i + 1) + ': ' + s.hex.toUpperCase() + ';\n'; });
  return out + '}\n';
}
