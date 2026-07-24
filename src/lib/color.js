// Colour science — Björn Ottosson OKLab transforms, k-means extraction, WCAG luminance/contrast,
// OKLCH harmonies with sRGB gamut mapping, and the honest per-swatch format model.
// Ported verbatim from the design comp; pure functions, no DOM.

export function rgb2oklab(r, g, b) {
  const f = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  r = f(r); g = f(g); b = f(b);
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;
  const L = Math.cbrt(l), M = Math.cbrt(m), S = Math.cbrt(s);
  return {
    L: 0.2104542553 * L + 0.7936177850 * M - 0.0040720468 * S,
    a: 1.9779984951 * L - 2.4285922050 * M + 0.4505937099 * S,
    b: 0.0259040371 * L + 0.7827717662 * M - 0.8086757660 * S,
  };
}

export function oklab2rgb(L, a, b) {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b,
    m_ = L - 0.1055613458 * a - 0.0638541728 * b,
    s_ = L - 0.0894841775 * a - 1.2914855480 * b;
  const l = l_ * l_ * l_, m = m_ * m_ * m_, s = s_ * s_ * s_;
  let r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  let g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  let bb = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;
  const d = (c) => { c = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055; return Math.max(0, Math.min(1, c)); };
  return [Math.round(d(r) * 255), Math.round(d(g) * 255), Math.round(d(bb) * 255)];
}

export function hex(r, g, b) { return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join(''); }
export function hexToRgb(h) { h = h.replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
export function hexA(h, a) { const c = hexToRgb(h); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }

// WCAG relative luminance + on-colour chosen for guaranteed AA against the actual swatch
function _lin(c) { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
export function lumHex(h) { const c = hexToRgb(h); return 0.2126 * _lin(c[0]) + 0.7152 * _lin(c[1]) + 0.0722 * _lin(c[2]); }
export function onColor(h) { const L = lumHex(h); const cBlack = (L + 0.05) / 0.05, cWhite = 1.05 / (L + 0.05); return cBlack >= cWhite ? '#000000' : '#ffffff'; }
export function dist2(p, c) { const dL = p.L - c.L, da = p.a - c.a, db = p.b - c.b; return dL * dL + da * da + db * db; }
export function contrastRatio(h1, h2) { const a = lumHex(h1), b = lumHex(h2); return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); }
export function relLum(hexStr) { return lumHex(hexStr); }

export function rgb2hsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (mx + mn) / 2, d = mx - mn;
  if (d) {
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    if (mx === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return [Math.round(h), Math.round(s * 100), Math.round(l * 100)];
}

export function kmeans(pts, k) {
  const cents = [pts[Math.floor(Math.random() * pts.length)]];
  while (cents.length < k) {
    const d2 = pts.map((p) => Math.min.apply(null, cents.map((c) => dist2(p, c))));
    const sum = d2.reduce((a, b) => a + b, 0) || 1;
    let r = Math.random() * sum, idx = 0;
    for (let i = 0; i < pts.length; i++) { r -= d2[i]; if (r <= 0) { idx = i; break; } idx = i; }
    cents.push(pts[idx]);
  }
  const assign = new Array(pts.length).fill(0);
  for (let it = 0; it < 14; it++) {
    for (let i = 0; i < pts.length; i++) { let best = 0, bd = Infinity; for (let c = 0; c < k; c++) { const d = dist2(pts[i], cents[c]); if (d < bd) { bd = d; best = c; } } assign[i] = best; }
    const acc = Array.from({ length: k }, () => ({ L: 0, a: 0, b: 0, n: 0 }));
    for (let i = 0; i < pts.length; i++) { const c = assign[i], p = pts[i]; acc[c].L += p.L; acc[c].a += p.a; acc[c].b += p.b; acc[c].n++; }
    for (let c = 0; c < k; c++) { if (acc[c].n > 0) cents[c] = { L: acc[c].L / acc[c].n, a: acc[c].a / acc[c].n, b: acc[c].b / acc[c].n }; }
  }
  const counts = new Array(k).fill(0); assign.forEach((a) => counts[a]++);
  return cents.map((c, i) => ({ L: c.L, a: c.a, b: c.b, weight: counts[i] / pts.length }))
    .filter((c) => c.weight > 0).sort((a, b) => b.weight - a.weight);
}

// ===== OKLCH colour harmonies (hue rotation + gamut-map to sRGB) =====
export function oklabToLinear(L, a, b) {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b, m_ = L - 0.1055613458 * a - 0.0638541728 * b, s_ = L - 0.0894841775 * a - 1.2914855480 * b;
  const l = l_ * l_ * l_, m = m_ * m_ * m_, s = s_ * s_ * s_;
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
  -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
  -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s];
}
export function inSrgb(lin) { return lin.every((v) => v >= -0.0002 && v <= 1.0002); }
export function labToHex(L, a, b) { const rgb = oklab2rgb(L, a, b); return hex(rgb[0], rgb[1], rgb[2]); }
// Preserve L & hue; if out of sRGB gamut, reduce chroma (binary search) until it fits — never a faked hex.
export function gamutMap(L, a, b) {
  if (inSrgb(oklabToLinear(L, a, b))) return labToHex(L, a, b);
  let lo = 0, hi = 1;
  for (let i = 0; i < 22; i++) { const mid = (lo + hi) / 2; if (inSrgb(oklabToLinear(L, a * mid, b * mid))) lo = mid; else hi = mid; }
  return labToHex(L, a * lo, b * lo);
}
export function rotateHue(hexStr, deg) {
  const c = hexToRgb(hexStr), lab = rgb2oklab(c[0] / 255, c[1] / 255, c[2] / 255);
  const C = Math.sqrt(lab.a * lab.a + lab.b * lab.b); let H = Math.atan2(lab.b, lab.a) + deg * Math.PI / 180;
  return gamutMap(lab.L, C * Math.cos(H), C * Math.sin(H));
}
export function shadeSet(hexStr) {
  const c = hexToRgb(hexStr), lab = rgb2oklab(c[0] / 255, c[1] / 255, c[2] / 255);
  return [0.88, 0.72, 0.56, 0.40, 0.24].map((L) => gamutMap(L, lab.a, lab.b));
}
export function harmonyGroups(hexStr) {
  const R = (d) => rotateHue(hexStr, d), base = hexStr.toUpperCase();
  return [
    { name: 'Analogous', hexes: [R(-30), base, R(30)] },
    { name: 'Complementary', hexes: [base, R(180)] },
    { name: 'Split Complementary', hexes: [base, R(150), R(210)] },
    { name: 'Triadic', hexes: [base, R(120), R(240)] },
    { name: 'Tetradic', hexes: [base, R(60), R(180), R(240)] },
    { name: 'Square', hexes: [base, R(90), R(180), R(270)] },
    { name: 'Shades', hexes: shadeSet(hexStr) },
  ];
}

// ================= value model (honest formats only) =================
// Each swatch resolves to a format map. HEX + RGB + HSL are deterministic → shipped, copyable.
// CMYK is a naive approximation, labelled 'approx' — the colour-managed engine phase can swap
// resolveCmyk without restructuring the interface. No values faked.
export function swatchFormats(hexStr) {
  const [r, g, b] = hexToRgb(hexStr);
  const k = 1 - Math.max(r, g, b) / 255;
  const ch = (x) => (k >= 1 ? 0 : Math.round(((1 - x / 255 - k) / (1 - k)) * 100));
  const cmyk = [ch(r), ch(g), ch(b), Math.round(k * 100)];
  const p = rgb2hsl(r, g, b);
  return {
    hex: { label: 'HEX', display: hexStr.toUpperCase(), copy: hexStr.toUpperCase(), confidence: 'authoritative', caveat: null },
    rgb: { label: 'RGB', display: r + ' ' + g + ' ' + b, copy: 'rgb(' + r + ', ' + g + ', ' + b + ')', confidence: 'authoritative', caveat: null },
    cmyk: { label: 'CMYK', display: cmyk.join(' '), copy: 'cmyk(' + cmyk[0] + '%, ' + cmyk[1] + '%, ' + cmyk[2] + '%, ' + cmyk[3] + '%)', confidence: 'approx', caveat: 'approx' },
    hsl: { label: 'HSL', display: p[0] + '° ' + p[1] + '% ' + p[2] + '%', copy: 'hsl(' + p[0] + ', ' + p[1] + '%, ' + p[2] + '%)', confidence: 'authoritative', caveat: null },
  };
}

// representative sRGB approximations — a labelled MOCK for nearest-match only.
// Replaced by licensed Pantone Connect lookups in the engine phase.
export function pantoneTable() {
  return [
    ['186 C', '#c8102e'], ['199 C', '#d50032'], ['032 C', '#ef3340'], ['1788 C', '#e4002b'], ['485 C', '#da291c'],
    ['021 C', '#fe5000'], ['165 C', '#ff6720'], ['151 C', '#ff8200'], ['1375 C', '#ff9e1b'], ['137 C', '#ffa300'],
    ['123 C', '#ffc72c'], ['116 C', '#ffcd00'], ['102 C', '#fce300'], ['3945 C', '#fdda24'], ['100 C', '#f6eb61'],
    ['375 C', '#97d700'], ['368 C', '#6cc24a'], ['355 C', '#009639'], ['348 C', '#00843d'], ['342 C', '#006f51'],
    ['3272 C', '#00b2a9'], ['326 C', '#00b398'], ['3242 C', '#71dbd3'], ['317 C', '#a5dfd3'],
    ['3125 C', '#00a9ce'], ['306 C', '#00b5e2'], ['2995 C', '#00a3e0'], ['Cyan C', '#009fda'], ['300 C', '#005eb8'],
    ['286 C', '#0033a0'], ['072 C', '#10069f'], ['2736 C', '#1e22aa'], ['2685 C', '#330072'], ['267 C', '#5f259f'],
    ['2612 C', '#6a1b9a'], ['259 C', '#6e267b'], ['248 C', '#af1685'], ['219 C', '#da1884'], ['226 C', '#d0006f'],
    ['476 C', '#4e3629'], ['469 C', '#603311'], ['168 C', '#6e3219'], ['7527 C', '#d6d2c4'], ['468 C', '#dfd1a7'],
    ['7401 C', '#f5e1a4'], ['Warm Gray 11 C', '#6e6259'], ['Cool Gray 11 C', '#53565a'], ['Cool Gray 8 C', '#888b8d'],
    ['Cool Gray 4 C', '#bbbcbc'], ['Cool Gray 1 C', '#d9d9d6'], ['429 C', '#a2aaad'], ['430 C', '#7e8083'],
    ['431 C', '#5b6770'], ['432 C', '#333f48'], ['Black 6 C', '#101820'], ['419 C', '#212721'], ['White', '#ffffff'],
  ];
}
let _pantoneLab = null;
export function nearestPantone(hexStr) {
  if (!_pantoneLab) {
    _pantoneLab = pantoneTable().map((p) => { const c = hexToRgb(p[1]); const lab = rgb2oklab(c[0] / 255, c[1] / 255, c[2] / 255); return { code: p[0], hex: p[1], L: lab.L, a: lab.a, b: lab.b }; });
  }
  const c = hexToRgb(hexStr), t = rgb2oklab(c[0] / 255, c[1] / 255, c[2] / 255);
  let best = _pantoneLab[0], bd = Infinity;
  _pantoneLab.forEach((p) => { const d = dist2(t, p); if (d < bd) { bd = d; best = p; } });
  return { code: best.code, hex: best.hex };
}

// exact cubic-bezier eases as functions (no CustomEase plugin needed); reveal & hover share DNA.
export function cubicBezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx, cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const fx = (t) => ((ax * t + bx) * t + cx) * t, fy = (t) => ((ay * t + by) * t + cy) * t, dfx = (t) => (3 * ax * t + 2 * bx) * t + cx;
  return (p) => { let t = p; for (let i = 0; i < 8; i++) { const x = fx(t) - p; if (Math.abs(x) < 1e-5) break; const d = dfx(t); if (Math.abs(d) < 1e-6) break; t -= x / d; } return fy(Math.max(0, Math.min(1, t))); };
}
