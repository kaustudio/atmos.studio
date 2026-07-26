// Ring landing (first-visit brand arrival, and the permanent small-screen surface): concentric
// rings of colour orbs turning around the centred copy under one fixed room light.
//
// THREE renderers, in descending order of what a browser will let us have. Part C (orbField.js) is
// the one that normally runs: a single WebGL 2 canvas holding every orb as particles, cursor-
// reactive, and the only one whose cost does not scale with the orb count. Part B (orb-shader.js)
// is the per-orb raw-WebGL renderer it superseded, kept because it is the better floor when Part C
// cannot start. Under both sits the painted DOM stack + living gradient blobs — the permanent
// floor, which no-WebGL, reduced-motion and context-loss all resolve to.
//
// The motion model is frozen in the MOTION CONTRACT block in initOrbit(); the engine owns each
// orb's position, the inner layers own its light.
// orbField.js is NOT imported here — see _initOrbField. It pulls in three, and a static import puts
// three in the landing's own chunk.

export const orbitMethods = {
  // Canvas gradient field from a seed palette's swatches → dataURL at tile size × DPR (crisp, no assets).
  _orbitTileURL(swatches, w, h) {
    const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
    const cv = document.createElement('canvas'); cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    const ctx = cv.getContext('2d'); const W = cv.width, H = cv.height;
    // lead with each palette's most chromatic swatches so the tiles read as distinct moods,
    // and amplify the palette's own cast (same hues, stronger voice) — near-neutrals diverge instead of merging
    const chroma = (hx) => { const c = this.hexToRgb(hx); return Math.max(...c) - Math.min(...c); };
    const lum = (hx) => this.lumHex ? this.lumHex(hx) : 0.5;
    const hexes = swatches.slice().sort((a, b) => chroma(b.hex) - chroma(a.hex)).map((s) => s.hex);
    if (ctx.filter !== undefined) ctx.filter = 'saturate(1.25) contrast(1.04)';
    // The tile is the orb's MATERIAL, not its lighting: a non-directional colour field, no highlight,
    // no terminator, no rim. Every one of those used to be baked here at a fixed spot, which is why
    // an orb on the far right looked lit from its own upper-left just like one on the far left — the
    // baked cues outvoted the positional layers. Direction now lives entirely in the layers above
    // (limb / diffuse / spec / rim, all placed from --ldx/--ldy) and in the shader, both of which
    // answer to the orb's position under the ONE global light.
    const byLum = hexes.slice().sort((a, b) => lum(a) - lum(b));
    const mid = byLum[Math.floor(byLum.length / 2)] || hexes[0] || '#8a8a8a';
    ctx.fillStyle = mid; ctx.fillRect(0, 0, W, H);
    // per-visit jitter: the palette's colours pooled across the surface — never the same arrangement twice
    const jit = (v) => v + (Math.random() - 0.5) * 0.16;
    const pts = [[0.22, 0.26], [0.80, 0.20], [0.72, 0.74], [0.26, 0.80], [0.52, 0.50]].map((p) => [jit(p[0]), jit(p[1])]);
    hexes.forEach((hex, i) => {
      const p = pts[i % pts.length]; const cx = p[0] * W, cy = p[1] * H; const r = Math.max(W, H) * (0.45 + Math.random() * 0.15);
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, this.hexA(hex, 0.5)); g.addColorStop(1, this.hexA(hex, 0));
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    });
    if (ctx.filter !== undefined) ctx.filter = 'none';
    // dither — subtle noise so the baked gradients never band
    try {
      ctx.fillStyle = ctx.createPattern(this._orbitDitherTile(), 'repeat'); ctx.fillRect(0, 0, W, H);
    } catch (e) { }
    return cv.toDataURL('image/jpeg', 0.92);
  },
  // The dither field, built ONCE per visit and tiled onto every orb. It used to be a per-pixel JS
  // pass over each tile's ImageData, which is fine for five tiles and not fine for twelve: at DPR 2
  // that loop is ~340k pixels per orb, and it runs synchronously inside the arrival, ahead of GSAP.
  // Measured on this machine, twelve tiles cost 129ms that way and 57ms this way — less than the
  // FIVE old tiles cost (40ms) plus what the seven new ones would have added. Same ±2.5/255 speckle,
  // same job (break the gradient banding); it is simply generated once instead of twelve times.
  // Sharing one field across orbs is safe because the orbs are never adjacent copies of each other.
  _orbitDitherTile() {
    if (this._ditherTile) return this._ditherTile;
    const n = document.createElement('canvas'); n.width = n.height = 256;
    const nx = n.getContext('2d'), im = nx.createImageData(256, 256), d = im.data;
    for (let q = 0; q < d.length; q += 4) {
      d[q] = d[q + 1] = d[q + 2] = Math.random() < 0.5 ? 255 : 0;   // half lift, half sink…
      d[q + 3] = Math.round(Math.random() * 10);                     // …at up to 4% alpha ⇒ ±2.5 at mid grey
    }
    nx.putImageData(im, 0, 0);
    this._ditherTile = n; return n;
  },
  // ---- The reference palettes. Orbit tiles are driven by these, not by the archive seeds.
  //
  // THE RING IS THE TOOL'S OWN HARMONY ENGINE, RUN IN PUBLIC. Every hex below is generated in
  // OKLCH and gamut-mapped through the same `gamutMap` the Harmonies drawer uses, so the landing
  // cannot drift from what the tool actually does. Nothing here is hand-picked.
  //
  // What the five hand-authored palettes got wrong, measured. Their hues sat at 58/35/125/237/335:
  // two of the five were orange and a third of the wheel — yellow, cyan, violet — never appeared at
  // all. The cool ones ran at a third of the warm ones' chroma (steel peaked at C 0.045, and its
  // lift at 0.019 fell below the 0.02 floor `reading.js` calls a grey), so the ring read warm and
  // dusty rather than spectral. And each palette moved less than 20° of hue end to end, which makes
  // an orb a tonal ramp of ONE colour. Five brightnesses of brown is not a palette, and the ring is
  // the first thing this tool says about itself.
  //
  // Colour now travels on two axes:
  //   ACROSS the ring — 12 stations 30° apart, one full revolution. The front ring holds exactly
  //     12 orbs, so it wears the whole wheel once, in order (see `orbitTileURLs`).
  //   WITHIN an orb — a named harmony out of `harmonyGroups`' own vocabulary, so hue TRAVELS
  //     46–150° inside a single orb instead of standing still. That travel IS the palette the tile
  //     bake pools; without it the gradient has nothing to be made of.
  //
  // The one rule the counter-hue obeys: it is never both large AND fully chromatic. A 180° rotation
  // at full chroma blends through neutral wherever it meets the base and turns the orb to mud —
  // that was built and it looked it. So the counter-hue is always given a small slot at reduced
  // chroma (see HARM below, and the note on which slots are small): a cast in the orb's atmosphere,
  // never a second subject competing with the first.
  _orbitRefPalettes() {
    const P = (hexes) => ({ swatches: hexes.map((hex, i) => ({ hex, weight: 1 - (i * 0.15) })) });
    const oklch = (L, C, deg) => { const H = deg * Math.PI / 180; return this.gamutMap(L, C * Math.cos(H), C * Math.sin(H)); };
    // The tonal spread, unchanged in shape from the hand-authored set it replaces: a dominant mid,
    // a light lift, a deep shadow. Chroma falls off at both ends — a lift that stays saturated
    // reads as a second colour, and a shadow that does never sits behind the light.
    const TL = [0.86, 0.74, 0.62, 0.50, 0.34];        // lift, light, MID, mid-dark, deep
    const TC = [0.55, 0.90, 1.00, 0.85, 0.38];        // chroma as a fraction of the palette's own
    // Per harmony: `h` rotates each tone off the base hue, `c` scales that tone's chroma again.
    //
    // WHY THE DEEP TONE NEVER CARRIES THE COUNTER-HUE. It is tempting to put the complement in the
    // shadow — warm light, cool shadow, the oldest move in painting — and on the DOM floor it works.
    // On the shader it does not: `orb-shader.js` resolves the deepest swatch as the ambient floor
    // (`col=mix(u_c4*.9,col,…)`), so it is not an accent there, it is the entire unlit hemisphere.
    // A complement in that slot paints half the orb a foreign colour and the terminator turns to
    // sludge — built, looked at, reverted. The counter-hue lives in the mid-dark (u_c2, a
    // domain-warped patch) or in the light tone at reduced chroma. The deep stays home.
    const HARM = {
      analogWide:  { h: [-40, -20, 0, 24, 46],  c: [1, 1, 1, 1, 1] },     // 86° of drift — the richest gradient
      analogTight: { h: [-24, -12, 0, 14, 28],  c: [1, 1, 1, 1, 1] },     // 52° — the calm majority
      splitAccent: { h: [-28, -14, 0, 148, 32], c: [1, 1, 1, 0.55, 1] },  // split-complement in the mid-dark
      compAccent:  { h: [-26, -13, 0, 180, 30], c: [1, 1, 1, 0.50, 1] },  // the true complement, chroma halved
      triadAccent: { h: [-22, -11, 0, 120, 30], c: [1, 1, 1, 0.60, 1] },  // a third of the wheel, in the mid-dark
      triadLift:   { h: [-25, 112, 0, 20, 36],  c: [1, 0.60, 1, 1, 1] },  // a third of the wheel, in the airy tone
    };
    // 12 stations. Two things are deliberately NOT flat across them:
    //   CHROMA — the warms stay the loudest voices (the surface and the key light are both warm)
    //     and the cools sit back, but every station now clears the chroma floor the old steel and
    //     plum fell through.
    //   LIGHTNESS (dL) — yellow and yellow-green carry their chroma high; run them on the same ramp
    //     as blue and they read as olive sludge rather than gold. Those two stations get the ramp
    //     lifted. This is a fact about the gamut, not a preference.
    return [
      { H: 30,  k: 'analogWide',  C: 0.125 },             // ember      — red, the warm anchor
      { H: 58,  k: 'splitAccent', C: 0.115, dL: 0.03 },   // amber      — orange with a teal accent
      { H: 88,  k: 'analogTight', C: 0.105, dL: 0.06 },   // ochre      — yellow, absent from the old set
      { H: 118, k: 'compAccent',  C: 0.090, dL: 0.04 },   // moss       — green against its violet
      { H: 148, k: 'analogWide',  C: 0.095 },             // sage       — the quiet green bridge, kept
      { H: 178, k: 'triadLift',   C: 0.080 },             // verdigris  — cyan, absent from the old set
      { H: 205, k: 'analogTight', C: 0.078 },             // teal       — the coolest station
      { H: 235, k: 'triadAccent', C: 0.088 },             // steel      — blue, the cool counterweight
      { H: 265, k: 'analogWide',  C: 0.098 },             // indigo     — absent from the old set
      { H: 295, k: 'splitAccent', C: 0.088 },             // violet     — absent from the old set
      { H: 325, k: 'analogTight', C: 0.098 },             // plum       — kept, with the chroma it never had
      { H: 355, k: 'compAccent',  C: 0.115 },             // rose       — closes the circle back onto ember
    ].map((st) => {
      const hm = HARM[st.k], dL = st.dL || 0;
      const t = (i) => oklch(Math.min(0.93, TL[i] + dL), st.C * TC[i] * hm.c[i], st.H + hm.h[i]);
      return P([t(2), t(1), t(3), t(0), t(4)]);   // [mid, light, mid-dark, lift, deepest] — the authoring
    });                                          // order every consumer re-sorts from (see _paintOrbitTiles)
  },
  orbitTileURLs() {
    if (this._orbitURLs) return this._orbitURLs;
    // ROTATE the wheel, never shuffle it. A shuffle was fresh every arrival but destroyed the one
    // thing the 12 stations are for — neighbouring orbs being neighbouring hues. Turning the whole
    // wheel by a random number of stations, in a random direction, is just as unrepeatable and
    // leaves the spectrum intact: the ring always reads as one revolution, just not from the same
    // place twice.
    const ref = this._orbitRefPalettes(), n = ref.length;
    const start = Math.floor(Math.random() * n), dir = Math.random() < 0.5 ? 1 : -1;
    const seeds = Array.from({ length: n }, (_, i) => ref[((start + i * dir) % n + n) % n]);
    this._orbitPalettes = seeds;
    this._orbitURLs = seeds.map((p) => this._orbitTileURL(p.swatches, 290, 290));
    return this._orbitURLs;
  },
  // env map — the "room" the orbs live in, pre-rendered ONCE per arrival from the current theme's
  // tokens: surface tone, the key-light bloom at ORB_LIGHT, faint hues from the ring's palettes
  _orbitEnvURL() {
    if (this._envURL) return this._envURL;
    const cs = getComputedStyle(document.documentElement);
    const surf = (cs.getPropertyValue('--surface') || '#faf9f5').trim();
    const cv = document.createElement('canvas'); cv.width = 128; cv.height = 128; const ctx = cv.getContext('2d');
    ctx.fillStyle = surf; ctx.fillRect(0, 0, 128, 128);
    const L = this.ORB_LIGHT;
    const bl = ctx.createRadialGradient(L.x * 128, L.y * 128, 0, L.x * 128, L.y * 128, 110);
    bl.addColorStop(0, 'rgba(255,250,240,0.55)'); bl.addColorStop(0.4, 'rgba(255,250,240,0.16)'); bl.addColorStop(1, 'rgba(255,250,240,0)');
    ctx.fillStyle = bl; ctx.fillRect(0, 0, 128, 128);
    // four tints, sampled a QUARTER-WHEEL apart rather than off the front of the list — the four
    // corners of the room should carry four different parts of the spectrum, not four neighbours.
    const pals = this._orbitPalettes || [];
    [0, 0.25, 0.5, 0.75].map((f) => pals[Math.round(f * pals.length) % (pals.length || 1)]).forEach((p, i) => {
      if (!p) return;
      const hex = p.swatches[0].hex, x = [104, 24, 110, 20][i], y = [100, 110, 30, 40][i];
      const gr = ctx.createRadialGradient(x, y, 0, x, y, 60);
      gr.addColorStop(0, this.hexA(hex, 0.18)); gr.addColorStop(1, this.hexA(hex, 0));
      ctx.fillStyle = gr; ctx.fillRect(0, 0, 128, 128);
    });
    this._envURL = cv.toDataURL(); return this._envURL;
  },
  // ---- The rings. Radii are NOT configured here — they are solved per viewport in _ringGeom.
  // What is configured is each ring's population, its size, its direction and its depth treatment.
  // Counts are deliberately unequal and roughly proportional to circumference, so the ARC gap
  // between neighbours comes out the same on both rings: at 1440×900 the front ring runs ~134px
  // between orb edges and the back ring ~135px. Equal counts leave the outer ring's gaps more than
  // twice the inner ring's — that was the whitespace.
  // Can the particle renderer run? The formation's POPULATION is a function of the answer, which is
  // why this is asked here and not at mount. One canvas holds a hundred-odd orbs for the price of
  // one context; the painted DOM floor cannot — that is a hundred-odd elements carrying five
  // shading layers each, built synchronously inside the arrival. So the dense formation is offered
  // only where it can actually be drawn, and no-WebGL / reduced-motion get the formation the floor
  // was designed around, at the size it was drawn at, rather than a dense one it would choke on.
  // WebGL 2 specifically: orbField.js's shader is GLSL 3.
  // Probed once and cached — the answer cannot change within a visit.
  _orbFieldOK() {
    if (this._fieldOK !== undefined) return this._fieldOK;
    if (this._reduce) return (this._fieldOK = false);
    try {
      this._fieldOK = !!document.createElement('canvas').getContext('webgl2');
    } catch (e) { this._fieldOK = false; }
    return this._fieldOK;
  },
  _rings() { return this._orbFieldOK() ? this._particleRings() : this._paintedRings(); },
  /* The formation as the particle renderer draws it: three rings, many more orbs, each roughly half
     the diameter it used to be. `dens` is particles per orb and `grain` their size in CSS pixels at
     sizeK 1 — see _initOrbField.
     The counts are SOLVED against §4's radii, not chosen: at 1440×900 the solver puts the rings at
     403.9 / 563.8 / 709.3 with diameters 52.5 / 36.3 / 23.8, and 24 / 40 / 58 are the populations
     that bring the arc gap between neighbours out at 53.2 / 52.3 / 53.1px — matched to within a
     pixel across all three, which is the property §2 is protecting. 24 rather than the 23 that
     would fit marginally better, because the front ring wears the 12 reference palettes and 2×12
     means it walks the whole colour wheel exactly twice with no seam. */
  _particleRings() {
    return [
      // front — the formation's read: biggest, crisp, full key light, the only ring that floats
      { count: 24, size: 42, phase: 0, dir: 1, z: 30, op: 1, bright: 1, sat: 1, con: 1, blur: 0, dep: 1, fx: 2, float: 1, dens: 760, grain: 2.3 },
      { count: 40, size: 29, phase: 360 / (2 * 40), dir: -0.72, z: 24, op: 0.8, bright: 0.97, sat: 0.86, con: 0.98, blur: 1.1, dep: 0.68, fx: 1, float: 0, dens: 400, grain: 2 },
      // back — smallest, softest, dimmest; reads as depth, never as a second read.
      { count: 58, size: 19, phase: 360 / (3 * 58), dir: 0.46, z: 20, op: 0.55, bright: 0.95, sat: 0.7, con: 0.96, blur: 1.7, dep: 0.4, fx: 1, float: 0, dens: 220, grain: 1.6 },
    ];
  },
  // The painted floor's formation, unchanged: two rings sized for DOM orbs with five shading layers
  // apiece. This is what a visitor gets with no WebGL 2 or with reduced motion, and it is the same
  // design it always was — a degraded population, not a degraded one at the wrong size.
  _paintedRings() {
    return [
      { count: 12, size: 84, phase: 0, dir: 1, z: 30, op: 1, bright: 1, sat: 1, con: 1, blur: 0, dep: 1, fx: 2, float: 1 },
      // dir −1: the small orbs run COUNTER-CLOCKWISE against the front ring (contract §3).
      { count: 21, size: 56, phase: 360 / (2 * 21), dir: -1, z: 20, op: 0.62, bright: 0.95, sat: 0.76, con: 0.96, blur: 1.7, dep: 0.55, fx: 1, float: 0 },
    ];
  },
  // one flat orb list, ring-major: ring 0 takes the first count slots, ring 1 the next, and so on.
  // ang0 is the orb's fixed place in its ring — the tick only ever adds the one shared rotation.
  _ringField() {
    if (this._ringFld) return this._ringFld;
    const out = [];
    this._rings().forEach((r, ri) => {
      for (let i = 0; i < r.count; i++) out.push({ ri, i, ang0: (i / r.count) * 360 + r.phase });
    });
    this._ringFld = out; return out;
  },
  _ringSlots() { return this._orbSlots || (this._orbSlots = this._ringField().map((_, i) => i)); },
  // the orb's CSS diameter, derived not measured — clamp(56px,6vw,104px). Lets the formation size
  // itself before layout and keeps the tick free of offsetWidth reads.
  _orbBase(vw) { return Math.min(104, Math.max(56, (vw || window.innerWidth || 1440) * 0.06)); },
  // How far the hero reaches from the stage centre — measured from the marks themselves (the
  // statement block and the CTA), not from their padded container, so the ring clears the ink. The
  // h1 is measured rather than its [data-land-line] spans: those carry the reveal tween, and a
  // measurement taken mid-reveal would bake a shifted hero into the geometry. DOM read: build and
  // resize only, never in the tick.
  _heroReach() {
    const marks = [...document.querySelectorAll('[data-landing] h1, [data-landing] p, [data-glass-cta]')];
    if (!marks.length) return 265;                                  // pre-layout fallback: the 1280×720 measurement
    const cx = (window.innerWidth || 1440) / 2, cy = (window.innerHeight || 800) / 2;
    let dx = 0, dy = 0;
    marks.forEach((m) => {
      const b = m.getBoundingClientRect(); if (!b.width && !b.height) return;
      dx = Math.max(dx, Math.abs(b.left - cx), Math.abs(b.right - cx));
      dy = Math.max(dy, Math.abs(b.top - cy), Math.abs(b.bottom - cy));
    });
    return Math.hypot(dx, dy) || 265;                               // corner reach — the worst angle a ring can pass
  },
  /* Ring geometry for the current viewport, SOLVED rather than configured.
       1. BASE GAP — g is sized off the viewport's LONGER edge, so the formation spans it.
       2. WIDER BETWEEN RINGS — the ring→ring gap is ORB_RING_GAP_MUL× the copy→ring gap, so the
          rings read as separate depths rather than one thick band.
       3. BOUNDS IN ORB DIAMETERS, never absolute px — the same pixel count reads completely
          differently at 55px and 113px. Ceiling binds from ~1440px up, where g would otherwise
          track the viewport and pull the rings apart.
       4. OVERFLOW IS FINE — the outer ring is not pinned to the edges; it runs off the long axis
          by design, and being true circles it leaves the short one too.

     `span` is the longer edge and not the width, which is the whole of what makes this work in
     portrait. Against the width, the numerator (vw/2 − …) is what is left over after the hero and
     the orbs have been paid for — and on a phone the hero alone is most of the half-width, so it
     went NEGATIVE and g fell to its floor. That floor is a minimum, not a fit: the rings ended up
     crowding the copy at 0.55 diameters while the tall viewport sat empty above and below them,
     which is both halves of the same bug. In landscape the longer edge IS the width, so every
     desktop and landscape-tablet geometry is unchanged to the pixel; only portrait moves, and it
     moves to the arrangement the rule always described. */
  _ringGeom(vw, vh) {
    const rings = this._rings(), edge = Math.min(vw, vh) || 720;
    const span = Math.max(vw, vh) || 1440;
    const sizeK = Math.min(1.35, Math.max(0.66, edge / 720));
    const px = rings.map((r) => r.size * sizeK);
    const last = rings.length - 1;
    const reach = this._heroReach();
    const inner = px.slice(0, last).reduce((a, b) => a + b, 0);     // inner rings each eat a full diameter
    const g = Math.max(px[0] * this.ORB_MIN_GAP_MUL, (span / 2 - px[last] - reach - inner) / rings.length);
    const R = []; let cursor = reach;                               // cursor tracks the last consumed edge
    rings.forEach((r, i) => {
      const gap = i === 0 ? g : Math.min(g * this.ORB_RING_GAP_MUL, px[0] * this.ORB_RING_GAP_MAX);
      R[i] = cursor + gap + px[i] / 2; cursor = R[i] + px[i] / 2;
    });
    // Capping the ring→ring gap can leave the outer ring short of the edges on a very large screen,
    // which is the whitespace this formation exists to avoid. Slide the whole set out until it
    // spans: a constant added to every radius moves the copy→ring gap only — the ring→ring gaps,
    // and so the cap above, survive it exactly. Measured against the same `span` as g, or the two
    // would disagree about which edge the formation is supposed to reach.
    const short = span / 2 - (R[last] + px[last] / 2);
    if (short > 0) for (let i = 0; i <= last; i++) R[i] += short;
    return { edge, g, px, R, base: this._orbBase(vw) };
  },
  /* `bodyOnly` paints each orb's MATERIAL and stops — no terminator, no diffuse, no rim, env or
     sheen. That is what the floor needs while the particle field is the thing on screen: the tiles
     are hidden, and the shading layers are ~5 elements per orb across a hundred-odd orbs, built
     synchronously inside the arrival. The material alone is one style write against a cached URL,
     so the floor is still one call away if the context is lost — it just isn't lit until then. */
  _paintOrbitTiles(bodyOnly) {
    const urls = this.orbitTileURLs();
    const lum = (hx) => this.lumHex ? this.lumHex(hx) : 0.5;
    const L = this.ORB_LIGHT, Lpc = Math.round(L.x * 100) + '% ' + Math.round(L.y * 100) + '%';
    const fld = this._ringField(), rings = this._rings();
    [...document.querySelectorAll('[data-orbit-card]')].forEach((c, i) => {
      if (bodyOnly) { if (urls.length) c.style.backgroundImage = 'url(' + urls[i % urls.length] + ')'; return; }
      // The 12 reference tiles dress the whole formation, and the count is not arbitrary: the front
      // ring holds exactly 12 orbs, so `i % urls.length` walks it round one full revolution of the
      // wheel — neighbouring orbs are neighbouring hues, and the ring reads as a spectrum rather
      // than as a bag of colours. The back ring's 21 keep cycling the same 12.
      if (urls.length) c.style.backgroundImage = 'url(' + urls[i % urls.length] + ')';
      c.querySelectorAll('[data-orb-fx]').forEach((el) => { try { el.remove(); } catch (e) { } });
      const item = c.parentElement;
      if (item) item.querySelectorAll('[data-orb-shadow]').forEach((el) => { try { el.remove(); } catch (e) { } });
      const pals = this._orbitPalettes; const pal = pals && pals[i % pals.length]; if (!pal) return;
      // fx budget by ring: the back ring is small, softened and dim — the costliest grazing-angle
      // layers (env, sheen) would buy compositing nobody can see. Uniform WITHIN a ring, always.
      // Phones drop a rung further: at 55px and no shader, the blend-mode stack is pure battery.
      const fx = rings[(fld[i] || fld[0]).ri].fx;
      const deep = pal.swatches.map((s) => s.hex).sort((a, b) => lum(a) - lum(b))[0] || '#000';
      // THE TERMINATOR. The gradient's origin is the orb's lit pole — 38% of the radius toward the
      // lamp — so the darkening always falls on the side facing away from it. This is the layer that
      // makes two orbs on opposite sides of the room read as lit by the same lamp.
      const LP = 'calc(50% + 38% * var(--ldx, 0)) calc(50% + 38% * var(--ldy, 0))';
      const limb = document.createElement('div');
      limb.setAttribute('data-orb-fx', 'limb'); limb.setAttribute('aria-hidden', 'true');
      limb.style.cssText = 'position:absolute;inset:0;z-index:2;pointer-events:none;border-radius:50%;'
        + 'background:radial-gradient(circle at ' + LP + ', transparent 30%, ' + this.hexA(deep, 0.14) + ' 55%, ' + this.hexA(deep, 0.40) + ' 78%, ' + this.hexA(deep, 0.72) + ' 100%)';
      c.appendChild(limb);
      // diffuse bias — the lit hemisphere, centred on the same pole
      const dif = document.createElement('div');
      dif.setAttribute('data-orb-fx', 'diffuse'); dif.setAttribute('aria-hidden', 'true');
      dif.style.cssText = 'position:absolute;z-index:2;pointer-events:none;border-radius:50%;mix-blend-mode:soft-light;'
        + 'inset:0;'
        + 'background:radial-gradient(circle at ' + LP + ', rgba(255,255,255,0.72) 0%, rgba(255,255,255,0.30) 34%, rgba(255,255,255,0) 62%)';
      c.appendChild(dif);
      // fresnel rim — a directionally-masked bright arc that always sits OPPOSITE the light
      if (fx >= 1) {
        const rim = document.createElement('div');
        rim.setAttribute('data-orb-fx', 'rim'); rim.setAttribute('aria-hidden', 'true');
        rim.style.cssText = 'position:absolute;inset:0;z-index:2;pointer-events:none;border-radius:50%;mix-blend-mode:screen;opacity:0.18;will-change:transform;'
          + 'background:linear-gradient(90deg, transparent 55%, rgba(255,255,255,0.55) 100%);'
          + '-webkit-mask:radial-gradient(circle, transparent 74%, #000 86%, #000 95%, transparent 99%);'
          + 'mask:radial-gradient(circle, transparent 74%, #000 86%, #000 95%, transparent 99%);'
          + 'transform:rotate(calc(var(--la, -144deg) + 180deg))';
        c.appendChild(rim);
      }
      if (fx >= 2) {
        // env reflection — the room mirrored faintly in the glass: world-locked and parallax-shifted
        // AGAINST the highlight vector so the reflection slides over the surface as the orb travels.
        const env = document.createElement('div');
        env.setAttribute('data-orb-fx', 'env'); env.setAttribute('aria-hidden', 'true');
        env.style.cssText = 'position:absolute;z-index:2;pointer-events:none;border-radius:50%;mix-blend-mode:screen;opacity:0.10;will-change:transform;'
          + 'width:130%;height:130%;left:-15%;top:-15%;'
          + 'background-image:url(' + this._orbitEnvURL() + ');background-size:cover;'
          + 'transform:translate(calc(-9% * var(--ldx, 0)), calc(-9% * var(--ldy, 0)))';
        c.appendChild(env);
        // thin-film sheen — iridescence hint at grazing angles: conic band confined to the rim
        const mid = pal.swatches.map((s) => s.hex).sort((a, b) => lum(b) - lum(a));
        const sheen = document.createElement('div');
        sheen.setAttribute('data-orb-fx', 'sheen'); sheen.setAttribute('aria-hidden', 'true');
        sheen.style.cssText = 'position:absolute;inset:0;z-index:2;pointer-events:none;border-radius:50%;mix-blend-mode:screen;opacity:0.09;will-change:transform;'
          + 'background:conic-gradient(from 90deg, transparent 0 30%, color-mix(in srgb, ' + (mid[1] || '#888') + ' 60%, #7fb0d8) 42%, color-mix(in srgb, ' + (mid[mid.length - 2] || '#666') + ' 55%, #d8a67f) 56%, transparent 70%);'
          + '-webkit-mask:radial-gradient(circle, transparent 72%, #000 86%, #000 94%, transparent 99%);'
          + 'mask:radial-gradient(circle, transparent 72%, #000 86%, #000 94%, transparent 99%);'
          + 'transform:rotate(var(--la, -144deg))';
        c.appendChild(sheen);
      }
      // specular — the reflection of the lamp itself, so it sits ON the lit pole and swings the full
      // width of the body as the orb crosses the room (it used to be pinned near the upper-left with
      // a ±12% nudge, which is what made every orb look individually lit)
      const spec = document.createElement('div');
      spec.setAttribute('data-orb-fx', 'spec'); spec.setAttribute('aria-hidden', 'true');
      spec.style.cssText = 'position:absolute;z-index:3;pointer-events:none;border-radius:50%;will-change:transform;'
        + 'width:34%;height:34%;left:calc(50% + 34% * var(--ldx, 0));top:calc(50% + 34% * var(--ldy, 0));'
        + 'background:radial-gradient(circle, rgba(255,250,240,0.62) 0%, rgba(255,250,240,0.18) 38%, rgba(255,250,240,0) 68%);'
        + 'transform:translate(-50%, -50%) scale(var(--tsx, 1), var(--tsy, 1));opacity:var(--li, 1)';
      c.appendChild(spec);
      // specular breakup — a secondary micro-highlight offset along the light vector at ~40% intensity
      if (fx >= 1) {
        const spec2 = document.createElement('div');
        spec2.setAttribute('data-orb-fx', 'spec2'); spec2.setAttribute('aria-hidden', 'true');
        spec2.style.cssText = 'position:absolute;z-index:3;pointer-events:none;border-radius:50%;will-change:transform;'
          + 'width:14%;height:14%;left:calc(50% + 46% * var(--ldx, 0));top:calc(50% + 46% * var(--ldy, 0));'
          + 'background:radial-gradient(circle, rgba(255,250,240,0.22) 0%, rgba(255,250,240,0) 70%);'
          + 'transform:translate(-50%, -50%);opacity:var(--li, 1)';
        c.appendChild(spec2);
      }
      // floorless drop shadow — pre-blurred radial layer offset OPPOSITE the light (transform-only)
      if (item && fx >= 1) {
        const sh = document.createElement('div');
        sh.setAttribute('data-orb-shadow', '1'); sh.setAttribute('aria-hidden', 'true');
        sh.style.cssText = 'position:absolute;z-index:0;pointer-events:none;will-change:transform;'
          + 'width:110%;height:110%;left:-5%;top:-5%;'
          + 'transform:translate(var(--sx, 7%), var(--sy, 8%));'
          + 'background:radial-gradient(circle, color-mix(in srgb, ' + deep + ' 34%, transparent) 0%, color-mix(in srgb, ' + deep + ' 15%, transparent) 34%, transparent 62%)';
        item.insertBefore(sh, c);
      }
    });
    // background bloom — a hint of the key light in the air, faintly tinted from the seed palettes
    const bloom = document.querySelector('[data-orbit-bloom]');
    if (bloom && this._orbitPalettes) {
      const p0 = this._orbitPalettes[0];
      const bright = p0.swatches.map((s) => s.hex).sort((a, b) => lum(b) - lum(a))[0] || '#fff';
      bloom.style.background = 'radial-gradient(56% 48% at ' + Lpc + ', ' + this.hexA(bright, 0.14) + ' 0%, color-mix(in srgb, var(--surface-raised) 30%, transparent) 45%, transparent 72%)';
    }
    // static film grain — unifies the gradients; generated once, tiled, never animated
    const grain = document.querySelector('[data-orbit-grain]');
    if (grain && !grain.style.backgroundImage) {
      const gc = document.createElement('canvas'); gc.width = 96; gc.height = 96;
      const gx = gc.getContext('2d'); const gi = gx.createImageData(96, 96); const gd = gi.data;
      for (let q = 0; q < gd.length; q += 4) { const v = Math.floor(Math.random() * 256); gd[q] = gd[q + 1] = gd[q + 2] = v; gd[q + 3] = 255; }
      gx.putImageData(gi, 0, 0);
      grain.style.backgroundImage = 'url(' + gc.toDataURL() + ')';
    }
  },
  // seeded PRNG — one seed per visit so every arrival's flow field differs but is internally coherent
  _orbitRng() {
    if (this._rng) return this._rng;
    let a = (Date.now() ^ (Math.random() * 0x7fffffff)) >>> 0;
    this._rng = () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    return this._rng;
  },
  // pre-blurred neutral noise tile (FBM stand-in) — generated ONCE per visit, reused by every orb
  _orbitNoiseURL() {
    if (this._noiseURL) return this._noiseURL;
    const cv = document.createElement('canvas'); cv.width = 160; cv.height = 160; const ctx = cv.getContext('2d');
    const r = this._orbitRng();
    for (let k = 0; k < 14; k++) {
      const x = r() * 160, y = r() * 160, rad = 20 + r() * 46, v = Math.round(90 + r() * 110), al = 0.10 + r() * 0.14;
      const gr = ctx.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, 'rgba(' + v + ',' + v + ',' + v + ',' + al + ')'); gr.addColorStop(1, 'rgba(' + v + ',' + v + ',' + v + ',0)');
      ctx.fillStyle = gr; ctx.fillRect(0, 0, 160, 160);
    }
    this._noiseURL = cv.toDataURL(); return this._noiseURL;
  },
  // Living gradients: 2–3 soft blob layers drift INSIDE each card (the orbit engine owns the tile's
  // transform/filter — blobs only ever touch inner elements). Transform/opacity only, GPU-composited.
  _spawnOrbitBlobs() {
    const g = window.gsap; if (!g || this._reduce || !this._orbitPalettes) return;
    this._killOrbitBlobs();
    this._blobTweens = [];
    const rng = this._orbitRng(), noise = this._orbitNoiseURL();
    // flow-field wander: each blob follows waypoints from a seeded field — heading turns gently,
    // position clamped to a safe box, ease:'none' waypoint-to-waypoint so motion is continuous.
    const wander = (el, st) => {
      const turn = (rng() - 0.5) * 1.6;                              // gentle heading change per leg
      st.h += turn;
      const step = 14 + rng() * 14;                                  // xPercent units per leg
      let nx = st.x + Math.cos(st.h) * step, ny = st.y + Math.sin(st.h) * step;
      if (nx > 35 || nx < -35) { st.h = Math.PI - st.h; nx = Math.max(-35, Math.min(35, nx)); }
      if (ny > 35 || ny < -35) { st.h = -st.h; ny = Math.max(-35, Math.min(35, ny)); }
      st.x = nx; st.y = ny;
      const tw = g.to(el, {
        xPercent: nx, yPercent: ny, duration: 3.2 + rng() * 2.8, ease: 'none',
        onComplete: () => { if (this._blobTweens) wander(el, st); },
      });
      this._blobTweens.push(tw);
    };
    const fld = this._ringField(), rings = this._rings();
    [...document.querySelectorAll('[data-orbit-card]')].forEach((card, i) => {
      const pals = this._orbitPalettes; const pal = pals[i % pals.length]; if (!pal) return;
      const fx = rings[(fld[i] || fld[0]).ri].fx;
      const chroma = (hx) => { const c = this.hexToRgb(hx); return Math.max(...c) - Math.min(...c); };
      const hexes = pal.swatches.slice().sort((a, b) => chroma(b.hex) - chroma(a.hex)).map((s) => s.hex);
      // atmosphere budget by ring: the front ring churns fully, the back ring carries two blobs and
      // one noise layer — at 56px behind 1.7px of blur the rest is compositing nobody can see
      const nBlobs = fx >= 2 ? 2 + Math.floor(rng() * 2) : 2;
      for (let b = 0; b < nBlobs; b++) {
        const hex = hexes[b % Math.min(3, hexes.length)] || hexes[0];
        const el = document.createElement('div');
        el.setAttribute('data-orbit-blob', '1');
        const size = 75 + rng() * 40;                                // % of card
        el.style.cssText = 'position:absolute;pointer-events:none;border-radius:50%;will-change:transform;'
          + 'width:' + size + '%;padding-top:' + size + '%;'
          + 'left:' + (-25 + rng() * 70) + '%;top:' + (-25 + rng() * 70) + '%;'
          + 'background:radial-gradient(circle, ' + this.hexA(hex, 0.9) + ' 0%, ' + this.hexA(hex, 0) + ' 70%)';
        card.appendChild(el);
        wander(el, { x: 0, y: 0, h: rng() * Math.PI * 2 });
        this._blobTweens.push(g.to(el, { scale: 0.85 + rng() * 0.45, duration: 4 + rng() * 3, delay: -rng() * 4, repeat: -1, yoyo: true, ease: 'sine.inOut' }));
        if (b === 0) this._blobTweens.push(g.to(el, { opacity: 0.55, duration: 4.5 + rng() * 2.5, delay: -rng() * 5, repeat: -1, yoyo: true, ease: 'sine.inOut' }));
      }
      // two counter-drifting pre-blurred noise layers — the surface itself slowly churns (FBM layering)
      [[220, 0.05, 26, 1], [340, 0.04, 34, -1]].slice(0, fx).forEach(([bs, op, dur, dir], k) => {
        const nl = document.createElement('div');
        nl.setAttribute('data-orbit-blob', '1'); nl.setAttribute('aria-hidden', 'true');
        nl.style.cssText = 'position:absolute;pointer-events:none;will-change:transform;z-index:1;'
          + 'width:300%;height:300%;left:-100%;top:-100%;'
          + 'mix-blend-mode:' + (k === 0 ? 'soft-light' : 'overlay') + ';opacity:' + op + ';'
          + 'background-image:url(' + noise + ');background-size:' + bs + 'px;background-repeat:repeat';
        card.appendChild(nl);
        this._blobTweens.push(g.to(nl, { xPercent: dir * 10, yPercent: -dir * 7, duration: dur + rng() * 8, repeat: -1, yoyo: true, ease: 'sine.inOut', delay: -rng() * dur }));
      });
      // specular stays PINNED at the global light position — a sphere's highlight must not wander
    });
  },
  /* ---- Part C: the particle renderer. ONE canvas, ONE cloud, every orb in it (orbField.js).
     Where this runs, Part B's per-orb contexts and the blob layers do not — they would be animating
     hidden elements for nobody.

     LOADED ON DEMAND, and that is not an optimisation to be tidied away into a static import. The
     module pulls in three, which the build had kept entirely inside the 404's chunk (see the
     2026-07-26 DECISIONS entry); importing it at the top of this file put 130 kB gzipped of it in
     front of every landing visitor and doubled the landing's payload, on a page whose own headline
     is "In seconds." Dynamically, three stays a chunk that arrives AFTER the landing has painted,
     and the arrival is not a hole in the page: the painted floor is what the visitor is looking at
     until the cloud is ready to replace it, which is the same floor-first arrangement Parts A and B
     already use, just extended across time as well as capability.

     Returns whether the field is up OR on its way — either answer means the caller must not build
     the LIT floor, since that work is thrown away the moment the cloud lands. */
  _initOrbField() {
    if (!this._orbFieldOK() || this._orbField || this._fieldPending) return false;
    this._fieldPending = true;
    import('../orbField.js').then(
      (m) => { this._fieldPending = false; if (!this._buildOrbField(m.createOrbField)) this._orbFieldUnavailable(); },
      () => { this._fieldPending = false; this._orbFieldUnavailable(); },
    );
    return true;
  },
  /* The chunk never arrived, or the context did not open. The ring POPULATION cannot be walked back
     here — _ringField and the rendered slot list were both decided from _orbFieldOK long before
     this — so the floor takes the dense formation, lit, which is the same place context loss lands.
     Do NOT "fix" this by clearing _fieldOK: _rings would start answering with two rings while
     _ringFld still holds three rings' worth of slots, and every index into it would be wrong. */
  _orbFieldUnavailable() {
    if (!this._landingUp()) return;
    this._paintOrbitTiles();
    this._spawnOrbitBlobs();
    if (this._orbit && this._orbit.dress) this._orbit.dress();
  },
  _buildOrbField(createOrbField) {
    if (!this._landingUp() || this._reduce || this._orbField) return false;
    const host = document.querySelector('[data-orbit]');
    const pals = this._orbitPalettes;
    if (!host || !pals || !pals.length) return false;

    const cv = document.createElement('canvas');
    cv.setAttribute('data-orbit-field', '1'); cv.setAttribute('aria-hidden', 'true');
    // z-index 1: over the bloom, under the copy (2), the vignette (3) and the grain (4). The canvas
    // is the whole stage, so anything meant to sit above the orbs has to sit above it too.
    cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;z-index:1;pointer-events:none;';
    host.appendChild(cv);

    const fld = this._ringField(), rings = this._rings();
    // Deepest ring FIRST. The cloud is one draw call with the depth buffer off, so buffer order IS
    // paint order and the front ring has to land last. `_fieldOrder` maps back to _ringField
    // indices — the tick writes centres through it.
    const order = fld.map((_, i) => i).sort((a, b) => fld[b].ri - fld[a].ri);
    const geom = this._ringGeom(window.innerWidth || 1440, window.innerHeight || 800);
    /* Ordered by HUE, which is not what the per-orb shader wanted and is the whole difference.
       That shader took five slots by ROLE — mid, light, mid-dark, lift, deepest — because each fed
       a different term. The field walks them as one continuous ramp across the sphere, and handing
       a ramp the role order puts the palette's brightest swatch immediately beside its darkest:
       every orb came out with a bright band butting a dark one, which at this grain is not a band
       at all, it is speckle. Hue order gives the ramp the thing the reference palettes were chosen
       for — hue TRAVELLING 46–150° inside one orb (see _orbitRefPalettes) — and it deliberately
       does NOT sort by luminance, because a tonal ramp across the body is a direction, and
       direction belongs to the one global lamp, never to the material. */
    const hue = (hx) => {
      const c = this.hexToRgb(hx), r = c[0] / 255, g = c[1] / 255, b = c[2] / 255;
      const mx = Math.max(r, g, b), d = mx - Math.min(r, g, b);
      if (!d) return 0;
      const h = mx === r ? (g - b) / d : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
      return (h * 60 + 360) % 360;
    };

    const orbs = order.map((i) => {
      const s = fld[i], r = rings[s.ri], pal = pals[i % pals.length];
      return {
        hexes: pal.swatches.map((w) => w.hex).sort((a, b) => hue(a) - hue(b)),
        radius: geom.px[s.ri] / 2,
        count: r.dens,
        pointSize: r.grain * (geom.px[s.ri] / r.size),
        opacity: r.op,
        depth: r.dep,
        saturation: r.sat,
      };
    });

    const field = createOrbField(cv, orbs, { light: this.ORB_LIGHT });
    if (!field) { try { cv.remove(); } catch (e) { } return false; }

    // §5's float, moved off the CSS vars onto the centre the field is handed: same per-orb 5–9s
    // period, same negative-phase scatter, same refusal to let any two orbs sync. The amplitude is
    // NOT stored — it is dia·0.03, and dia is per viewport, so the tick derives it each frame.
    const bob = { w: new Float32Array(order.length), ph: new Float32Array(order.length) };
    for (let k = 0; k < order.length; k++) {
      bob.w[k] = (2 * Math.PI) / (5 + Math.random() * 4);
      bob.ph[k] = Math.random() * Math.PI * 2;
    }

    this._orbField = field; this._fieldOrder = order; this._fieldBob = bob; this._fieldCanvas = cv;
    /* The floor is taken out of layout, not just made invisible — it is a hundred-odd elements the
       field is drawing over. The previous value is CAPTURED rather than cleared on the way back:
       this element's display comes from AppView's inline style object, so `display = ''` does not
       restore it, it deletes it, and React will not re-apply a style prop it does not think has
       changed. The list fell back to `block` and stacked all 116 orbs in a 10,000px column. */
    const list = document.querySelector('[data-orbit-list]');
    if (list) { this._listDisplay = list.style.display; list.style.display = 'none'; }
    field.onContextLost(() => this._dropOrbField());
    return true;
  },
  // Per-viewport figures for the current geometry, in the field's build order. Only these two change
  // on resize; the cloud itself is never rebuilt (see orbField.setSizes).
  _fieldSizes() {
    const fld = this._ringField(), rings = this._rings(), ord = this._fieldOrder || [];
    const geom = (this._orbit && this._orbit.geom) || this._ringGeom(window.innerWidth || 1440, window.innerHeight || 800);
    return ord.map((i) => {
      const s = fld[i], dia = geom.px[s.ri];
      return { radius: dia / 2, pointSize: rings[s.ri].grain * (dia / rings[s.ri].size) };
    });
  },
  _tearDownOrbField() {
    if (!this._orbField) return false;
    try { this._orbField.destroy(); } catch (e) { }
    try { this._fieldCanvas.remove(); } catch (e) { }
    this._orbField = null; this._fieldOrder = null; this._fieldBob = null; this._fieldCanvas = null;
    const list = document.querySelector('[data-orbit-list]');
    if (list) list.style.display = this._listDisplay || 'grid';
    return true;
  },
  /* Context loss. The floor was painted body-only while the field held the stage, so light it now
     and hand the formation back to the DOM tick, which needs no telling — it simply finds no field.
     The dense formation is heavier on the floor than the floor was drawn for; that is the price of a
     path nobody should reach, and it beats an empty stage.
     The re-dress is not optional: the tick writes position and nothing else (§5), so every per-ring
     constant — scale above all — is applied by dress(), which has been taking its field branch and
     leaving the tiles at their unscaled CSS size this whole time. */
  _dropOrbField() {
    if (!this._tearDownOrbField()) return;
    this._paintOrbitTiles();
    this._spawnOrbitBlobs();
    if (this._orbit && this._orbit.dress) this._orbit.dress();
    else requestAnimationFrame(() => this._staticOrbit());
  },
  // ---- Part B: raw-WebGL orb renderer. The shader REPLACES the painted base + inner shading
  // layers when available; the DOM stack stays mounted (display:none) as the permanent floor.
  _initOrbGL() {
    if (this._reduce || this._orbGL || !window.OrbShader || !window.OrbShader.supported()) return;
    const lum = (hx) => this.lumHex ? this.lumHex(hx) : 0.5;
    const rng = this._orbitRng();
    const recs = [];
    // WebGL context budget: browsers hard-cap live contexts (~16/page) and silently kill the oldest
    // past it. Rings are taken WHOLE, front first, and only if the whole ring fits the budget — a
    // ring half on the shader and half on the painted floor would break the one thing the formation
    // is for. Rings that don't fit keep the DOM stack, which is the same look by design.
    const fld = this._ringField(), rings = this._rings();
    const glSet = new Set(); let budget = this.ORB_GL_MAX;
    rings.forEach((r, ri) => {
      if (r.count > budget) return;
      budget -= r.count;
      fld.forEach((s, i) => { if (s.ri === ri) glSet.add(i); });
    });
    [...document.querySelectorAll('[data-orbit-card]')].forEach((card, i) => {
      if (!glSet.has(i)) return;
      const pals = this._orbitPalettes; const pal = pals && pals[i % pals.length]; if (!pal) return;
      const sorted = pal.swatches.map((s) => s.hex).sort((a, b) => lum(b) - lum(a));   // bright → dark
      const hexes = [sorted[2], sorted[1], sorted[3], sorted[0], sorted[4]];      // mid, light, mid-dark, lift, deepest
      const cv = document.createElement('canvas');
      cv.setAttribute('data-orb-gl', '1'); cv.setAttribute('aria-hidden', 'true');
      const px = Math.min(384, Math.round((card.offsetWidth || 290) * (window.devicePixelRatio || 1)));
      cv.width = px; cv.height = px;
      cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border-radius:50%;pointer-events:none;z-index:1;';
      const o = window.OrbShader.create(cv, hexes, rng() * 100);
      if (!o) return;                                          // compile/link failure → floor stays visible
      card.appendChild(cv);
      const hid = [...card.querySelectorAll('[data-orbit-blob],[data-orb-fx]')];
      hid.forEach((e) => { e.style.display = 'none'; });              // hidden, not removed — instant floor on loss
      const rec = { o, cv, hid, tile: card.closest('[data-orbit-item]') || card.parentElement };
      cv.addEventListener('webglcontextlost', (ev) => { ev.preventDefault(); this._dropOrbGL(rec); }, false);
      recs.push(rec);
    });
    if (!recs.length) return;
    this._orbGL = recs; this._glPaused = false; this._glT0 = performance.now();
    this._glTick = () => {
      if (!this._orbGL || this._glPaused) return;
      const t = (performance.now() - this._glT0) / 1000;
      this._orbGL.forEach((r) => {
        const st = r.tile.style;
        const la = (parseFloat(st.getPropertyValue('--la')) || -144) * Math.PI / 180;
        const li = parseFloat(st.getPropertyValue('--li')) || 1;
        const str = parseFloat(st.getPropertyValue('--tsx')) || 1;
        const lm = st.getPropertyValue('--lm'); const m = lm ? parseFloat(lm) : 0.5;
        const ld = st.getPropertyValue('--ld'); const d = ld ? parseFloat(ld) : 1;
        r.o.render(t, [Math.cos(la), -Math.sin(la)], li, str, m, d); // CSS y-down → GL y-up; m = dist to lamp, d = ring depth
      });
    };
    if (window.gsap) window.gsap.ticker.add(this._glTick);
  },
  _dropOrbGL(rec) {   // one orb loses its context → its DOM floor returns, others keep rendering
    try { rec.cv.remove(); } catch (e) { }
    rec.hid.forEach((el) => { try { el.style.display = ''; } catch (err) { } });
    if (this._orbGL) { this._orbGL = this._orbGL.filter((x) => x !== rec); if (!this._orbGL.length) { this._orbGL = null; this._killOrbGL(); } }
  },
  _killOrbGL() {
    if (this._glTick) { if (window.gsap) window.gsap.ticker.remove(this._glTick); this._glTick = null; }
    if (this._orbGL) { this._orbGL.slice().forEach((r) => { try { r.o.lose(); } catch (e) { } try { r.cv.remove(); } catch (e) { } r.hid.forEach((el) => { try { el.style.display = ''; } catch (err) { } }); }); this._orbGL = null; }
  },
  _killOrbitBlobs() {
    if (this._blobTweens) { this._blobTweens.forEach((t) => { try { t.kill(); } catch (e) { } }); this._blobTweens = null; }
    document.querySelectorAll('[data-orbit-blob]').forEach((el) => { try { el.remove(); } catch (e) { } });
  },
  // Positional lighting: ONE fixed room light (ORB_LIGHT). Given an orb's screen offset from the
  // stage centre, return the light relationship the shading layers consume — pure math, no DOM reads.
  _lightTargets(px, py, tw, vw, vh) {
    const lx = (this.ORB_LIGHT.x - 0.5) * vw, ly = (this.ORB_LIGHT.y - 0.5) * vh;
    const dxr = lx - px, dyr = ly - py, dist = Math.hypot(dxr, dyr) || 1;
    const dx = dxr / dist, dy = dyr / dist, m = Math.min(1, dist / (vw * 0.45));
    return {
      la: Math.atan2(dyr, dxr) * 180 / Math.PI,
      // the UNIT vector from this orb toward the lamp, in screen axes (+x right, +y down). Every
      // directional layer places itself as a fraction of the orb from this — which is what makes the
      // lit pole swing right across the body as an orb crosses the room, instead of nudging.
      dx, dy,
      sx: -dx * (6 + m * 6), sy: -dy * (6 + m * 6), li: 1 - m * 0.25, m,
    };
  },
  _applyLightVars(el, v) {
    const st = el.style;
    st.setProperty('--la', v.la.toFixed(1) + 'deg');
    st.setProperty('--ldx', v.dx.toFixed(3)); st.setProperty('--ldy', v.dy.toFixed(3));
    st.setProperty('--sx', v.sx.toFixed(1) + '%'); st.setProperty('--sy', v.sy.toFixed(1) + '%'); st.setProperty('--li', v.li.toFixed(3)); st.setProperty('--lm', (v.m === undefined ? 0.5 : v.m).toFixed(3)); st.setProperty('--ld', (v.d === undefined ? 1 : v.d).toFixed(3));
  },
  // Per-orb dressing the engine writes ONCE (build + resize), never per tick: within a ring every
  // one of these is identical — that uniformity IS the formation. Depth is the difference BETWEEN
  // rings. Keeping it off the tick is what leaves the tick writing nothing but position.
  _ringDress(tile, r, geom, ri) {
    const st = tile.style, dia = geom.px[ri];
    st.opacity = String(r.op);
    // blur is authored in FINAL px; the engine's scale would otherwise magnify it with the orb
    st.filter = (r.blur || r.bright !== 1 || r.sat !== 1 || r.con !== 1)
      ? 'blur(' + (r.blur / (dia / geom.base)).toFixed(2) + 'px) brightness(' + r.bright + ') saturate(' + r.sat + ') contrast(' + r.con + ')'
      : 'none';
    st.zIndex = String(r.z);
    // a whisper of bob on the front ring only — any more and the even spacing starts to read as wobble
    st.setProperty('--fy', (r.float ? dia * 0.03 : 0).toFixed(1) + 'px');
    // gloss anisotropy rests at 1 — it encoded the old stepped whip's horizontal smear, and the same
    // speed formula evaluates to ~1 at ring speed. The vars, and the layers reading them, stay.
    st.setProperty('--tsx', '1'); st.setProperty('--tsy', '1');
  },
  // The light relationship for an orb at its current screen position: same one global lamp, same
  // formula — only the position feeding it changed. Depth thins the key light per RING instead of
  // by cos(angle): the back ring sits deeper in the room and falls back toward ambient.
  _ringLight(tile, r, dia, x, y, vw, vh) {
    const t = this._lightTargets(x, y, dia, vw, vh);
    t.li *= (0.34 + 0.66 * r.dep); t.d = r.dep;
    this._applyLightVars(tile, t);
  },
  // Reduced-motion / no-gsap floor: the same formation at rotation 0 — correctly spaced, correctly
  // interleaved, correctly lit, standing still.
  _staticOrbit() {
    const tiles = [...document.querySelectorAll('[data-orbit-item]')]; if (!tiles.length) return;
    const vw = window.innerWidth || 1440, vh = window.innerHeight || 800;
    const fld = this._ringField(), rings = this._rings(), geom = this._ringGeom(vw, vh);
    tiles.forEach((t, i) => {
      const s = fld[i]; if (!s) return; const r = rings[s.ri];
      const a = s.ang0 * Math.PI / 180, R = geom.R[s.ri];
      const x = Math.cos(a) * R, y = Math.sin(a) * R;
      t.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) scale(' + (geom.px[s.ri] / geom.base).toFixed(4) + ')';
      this._ringDress(t, r, geom, s.ri);
      this._ringLight(t, r, geom.px[s.ri], x, y, vw, vh);
    });
  },
  // ── THE MASKED-LINE MOVE, factored. Pre-authored spans inside overflow:hidden masks: parked below
  // them before any cover lifts, then tweened home. Two surfaces use it — the landing's statement
  // and the tool's dropzone copy — and an arrival should not look like a different product
  // depending on which one you land on, so they share the mechanism rather than each keeping a copy.
  //
  // Park BEFORE the cover starts lifting. Without that the lines sit at their final position under
  // the loader/wipe and are readable for the beat between the cover clearing them and the tween
  // starting. Parking is skipped on a hidden page: there is no flash to prevent, the ticker is
  // asleep there, and arming would only risk stranding them.
  _maskArm(lines) {
    const g = window.gsap;
    if (!g || this._reduce || document.hidden || !lines.length) return;
    g.set(lines, { yPercent: 110 });
  },
  // A pure from-tween: no split, no restore. Static visible text is the no-GSAP floor.
  _maskReveal(lines, timerKey) {
    const g = window.gsap;
    if (!g || this._reduce || !lines.length) return;
    g.killTweensOf(lines);
    const tw = g.fromTo(lines, { yPercent: 110 }, { yPercent: 0, duration: this.DUR ? this.DUR.reveal : 0.62, stagger: 0.09, ease: this.EASE ? this.EASE.entrance : 'power3.out', clearProps: 'transform' });
    // rAF-stall failsafe. Because the lines are PARKED before the cover lifts, a ticker that never
    // wakes (backgrounded tab, throttled frame) would leave them below their masks forever — the
    // reveal is the only thing that brings them back. Static, visible text is the floor: force it.
    clearTimeout(this[timerKey]);
    this[timerKey] = setTimeout(() => {
      this[timerKey] = null;
      if (tw.progress() >= 1) return;
      try { tw.kill(); } catch (e) { }
      try { g.set(lines, { clearProps: 'transform' }); } catch (e) { }
    }, 2500);
  },
  _landingTextArm() {
    if (this._landRevealed) return;
    this._maskArm([...document.querySelectorAll('[data-land-line]')]);
  },
  _landingTextReveal(g) {
    g = g || window.gsap;
    const lines = [...document.querySelectorAll('[data-land-line]')];
    if (!g || !lines.length || this._reduce) return;
    if (this._landRevealed) return;   // once per landing arrival — loader/wipe/initOrbit may all call this
    this._landRevealed = true;
    this._maskReveal(lines, '_landRevealT');
  },
  initOrbit() {
    if (!this._landingUp()) return;
    if (this._orbit) {   // already built — repainting here would orphan the render cache + drift tweens
      const g0 = window.gsap;
      if (g0 && !this.state.showLoader && !this._wipeRunning) this._landingTextReveal(g0);
      return;
    }
    /* The renderer decides how much floor is worth building, so it is asked first — but the orbs'
       MATERIAL is painted either way, and never behind GSAP. _initOrbField answers false under
       reduced motion and without WebGL 2, which is also what sized the formation (see _rings). */
    this.orbitTileURLs();                        // seeds _orbitPalettes, which the field reads
    const fieldUp = this._initOrbField();
    this._paintOrbitTiles(fieldUp);
    if (this._reduce) { requestAnimationFrame(() => this._staticOrbit()); return; }
    const g = window.gsap; const container = document.querySelector('[data-orbit]');
    if (!g || !container) { this._orbitRetry = (this._orbitRetry || 0) + 1; if (this._orbitRetry < 50) { setTimeout(() => this.initOrbit(), 100); } else { requestAnimationFrame(() => this._staticOrbit()); } return; }
    // reveal only when the landing is actually visible — under the loader or wipe cover the
    // covering timeline fires the reveal itself at its uncover moment
    if (!this.state.showLoader && !this._wipeRunning) this._landingTextReveal(g);
    const tiles = [...container.querySelectorAll('[data-orbit-item]')];
    const N = tiles.length; if (N < 2) return;
    // Everything below dresses the DOM floor, which the field is standing on top of when it is up:
    // blobs and per-orb contexts animating hidden elements is work for nobody. The field carries its
    // own equivalents — atmosphere in the cloud's own colour spread, float folded into the centres.
    if (!fieldUp) {
      this._spawnOrbitBlobs();   // living gradients — same lifecycle as the orbit, inner layers only
      this._initOrbGL();         // Part B: shader renderer over the DOM floor (self-gating; floor stays live)
      // free vertical float: one phase tween per FRONT-RING orb (--ph −1↔1), per-orb random duration
      // + negative delay so no two sync. The back ring is left still — its job is to hold the
      // interleave. Joins _blobTweens → pause/play/kill with the formation.
      const fld0 = this._ringField(), rings0 = this._rings();
      tiles.forEach((t, i) => {
        const s = fld0[i]; if (!s || !rings0[s.ri].float) return;
        const fl = t.querySelector('[data-orb-float]'); if (!fl) return;
        this._blobTweens = this._blobTweens || [];
        this._blobTweens.push(g.fromTo(fl, { '--ph': -1 }, { '--ph': 1, duration: 5 + Math.random() * 4, repeat: -1, yoyo: true, ease: 'sine.inOut', delay: -Math.random() * 9 }));
      });
    }
    /* ============================== MOTION CONTRACT — DO NOT MODIFY ==============================
       AMENDED (concentric rings): this replaces the scatter-field contract — seeded positions,
       per-orb headings, tangential centre-avoidance, edge wrap — which is retired in full, as the
       choreographed cylinder before it was. The sanctioned motion is now a PARAMETRIC RING SET, and
       the same rule applies: any pass touching this module must leave these layers byte-identical
       unless a brief explicitly amends the contract again. Lighting/shading passes compose WITH
       this state — they never substitute their own angles for the ring formula.

       AMENDED AGAIN (particle renderer — §2, §3, §5, and a new §6): the orbs are no longer one DOM
       element apiece. Part C draws every orb as particles in a single WebGL 2 cloud (orbField.js),
       which removes the per-orb context budget that had capped the shaded formation at twelve orbs
       and made every orb added past that a DOWNGRADE. What the amendment buys is population: three
       rings and a hundred-odd orbs at roughly half the diameter, with the cursor pushing the cloud
       around. What it costs is that an orb is a dotted sphere rather than a solid one — the
       terminator, the specular, the fresnel rim and the depth gate all survive (per particle, in
       orbField.js's vertex shader, off the same one global lamp), but the continuous surface
       between them does not. That was accepted knowingly. §1 and §4 are untouched, and the painted
       floor keeps the two-ring formation it was drawn for — see _paintedRings.
       1. PARAMETRIC POSITION — nothing is seeded and nothing accumulates. For orb i of ring r:
          angle = (i/r.count)·360 + r.phase + rot·r.dir;  x = cos(angle)·R[r];  y = sin(angle)·R[r].
          Recomputed from the index EVERY frame, so spacing can never drift out of true.
       2. THE RINGS (_particleRings) — AMENDED to three rings. Front: count 24, size 42, phase 0,
          dir +1, z 30, opacity 1, dep 1, 760 particles at 2.3px, floats. Middle: count 40, size 29,
          phase 360/(2·40), dir −.72, z 24, opacity .8, saturate .86, dep .68, 400 at 2px, still.
          Back: count 58, size 19, phase 360/(3·58), dir +.46, z 20, opacity .55, saturate .7, dep
          .4, 220 at 1.6px, still. Radii are NOT here — §4 solves them, unamended.
          The angular step is exactly 360/count — no jitter — and every orb in a ring is the SAME
          size. Counts stay UNEQUAL and proportional to circumference, which is the rule the old
          12/21 followed and the reason it worked: measured at 1440×900, where §4 puts the rings at
          403.9 / 563.8 / 709.3, the arc gap between neighbours comes out 53.2 / 52.3 / 53.1px —
          matched to within a pixel. Equal counts put more than twice the gap on the outer ring;
          that was the whitespace, and it is still the whitespace. Change a ring's SIZE and the
          counts have to be re-solved against the new radii or that match is gone.
          The population is only available where Part C can draw it. Without WebGL 2, or under
          reduced motion, _rings returns _paintedRings — the original 12 at 84 and 21 at 56 — and it
          is not a downgrade of this one but the formation the DOM floor was actually designed
          around. A hundred-odd painted orbs carrying five shading layers each is not a floor.
       3. ONE CLOCK — ONE `rot`, advanced by ONE ticker: rot += (360/ROT_SECS)·dt, linear,
          continuous, ROT_SECS = 105. Every ring reads that same variable through its own r.dir.
          AMENDED: r.dir was ±1 — a pure sign, one shared magnitude — and is now a signed multiplier
          (+1, −.72, +.46). With only a sign available, a third ring must share a direction AND a
          speed with one of the other two, which means those two hold a CONSTANT relative angle
          forever: a fixed alignment pattern standing still inside a turning formation, which is
          precisely the global pulse §3 has always existed to prevent. Three distinct magnitudes in
          no simple ratio give no two rings a repeating relationship at all.
          The magnitudes were shared to stop the rings drifting apart. That guard is now redundant
          rather than discarded: §1 recomputes every angle from its index each frame, so there is no
          integrator to drift and no error to accumulate — differing speeds change the relationship
          between the rings, never their trueness. Do not "fix" this by re-locking the magnitudes or
          equalising the counts; both are load-bearing, and changing them is a contract amendment,
          not a tweak.
       4. GEOMETRY (_ringGeom) — radii are SOLVED, not configured. A base gap g is sized off the
          LONGER edge: span = max(vw,vh), g = (span/2 − px_last − _heroReach() − Σ inner diameters)
          / ringCount. The copy→ring0 interval is g; every ring→ring interval is g ·
          ORB_RING_GAP_MUL (1.75), so the rings read as separate depths rather than one thick band.
          Both bounds on g are expressed against the ORB, never in absolute px, because the same
          pixel count reads differently at 55px and 113px: floor ORB_MIN_GAP_MUL (0.55 diameters),
          ceiling ORB_RING_GAP_MAX (2.2 diameters on the ring→ring gap, binds from ~1440px up, where
          g would otherwise track the viewport and pull the rings apart into unrelated arcs).
          Finally, if the capped gap leaves the outer ring inside the viewport, every radius slides
          out by the shortfall — a constant, so the ring→ring gaps and the cap survive it and only
          the copy→ring gap grows. The outer ring is deliberately NOT pinned to the viewport: it runs
          off the long axis, and being true circles it leaves the short one too. That overflow is
          the intended read, not a fit failure.
          AMENDED: span was vw. Against the width the numerator is what remains after the hero and
          the orbs are paid for, and in PORTRAIT the hero alone is most of the half-width, so it went
          negative and g fell to its floor — the rings crowded the copy at 0.55 diameters while the
          tall viewport sat empty above and below, which is two symptoms of one bug. In landscape the
          longer edge IS the width, so every landscape geometry is unchanged to the pixel (1440×900
          solves to 403.9 / 563.8 / 709.3 either way); only portrait moves, and it moves to the
          arrangement this clause always described.
          Sizes = size · clamp(min(vw,vh)/720, .66, 1.35) — off the SHORTER edge, since tied to the
          longer they would balloon on wide, short screens.
          Recomputed on resize AND whenever the hero's own box changes, which is not the same event:
          _heroReach() is a DOM measurement, and a reach taken before the webfont lands is one no
          viewport event will ever correct. See o.reachWatch.
       5. RING PARALLAX + FLOAT — depth is per ring (size, blur, opacity, brightness, saturate, z,
          dep), never per orb and never from cos(angle); written ONCE on build and resize, so the
          tick writes position only. Float is front-ring only and a whisper: amplitude dia·0.03,
          per-orb sine at a 5–9s period with a scattered phase, never synced.
          AMENDED for Part C, in mechanism only: a particle cloud has no element to hang --fy/--ph
          on, so the float is added to the orb's CENTRE in the tick and the per-ring constants are
          vertex attributes rather than styles (_fieldSizes rewrites the two that are genuinely per
          viewport; the cloud is never rebuilt, because a particle count that changed with the
          window would change how dense an orb reads from one screen to the next). Blur has no
          equivalent and is not faked with one: the back rings get the same softening from a wider
          falloff on the sprite, which cannot be magnified by scale the way the CSS blur could.
          The floor's mechanism is unchanged — _ringDress, [data-orb-float], tweens in _blobTweens.

       6. THE CURSOR (Part C only) — NEW. Two layers, and they are different sizes on purpose.
          LOCAL: the 404's push field, unchanged in physics — radial escape + tangential swirl + a
          shove along the direction of travel, against a spring home and damping (see orbField.js,
          which documents what the ortho camera lets it drop). It is genuinely local: it opens the
          orbs the cursor is actually over and leaves the rest of the formation alone.
          GLOBAL: the whole cloud leans toward the cursor, eased, capped at `lean` (14px). This is
          the layer that makes the formation answer to the cursor everywhere rather than only where
          it happens to be, and it is deliberately small — the ring set must never read as sliding.
          Neither layer touches `rot`, the radii or the angular step: the cursor DISPLACES the
          formation, it does not steer it. §1 still owns where an orb is.
       INVARIANTS the ring model inherits and must keep: the engine owns each orb's transform and
       nothing else touches it; all life (sphere body, --la/--ldx/--ldy/--sx/--sy/--li lighting,
       atmosphere blobs, float) rides on INNER layers; orbs never rotate, so they and their
       light/shadow stay upright as they travel; the circular clip is the object exception; no
       per-frame canvas repaint. And the ONE global light is global: the tile carries the orb's
       material only — never a highlight, terminator or rim — so that every directional cue is
       placed from --ldx/--ldy and answers to where the orb actually is in the room.
       ACCEPTANCE: three concentric rings, uniform size and identical angular gaps within each ring,
       matching ARC gaps between them, each one outward smaller/dimmer, set a clearly wider gap out,
       and running off both sides of the viewport; all three turn continuously and smoothly with no
       moment where the whole formation lines up and no pair holding a fixed relative angle; the
       centre stays clear and the hero unobstructed at any viewport; an orb's shading is identical
       on every screen size; the specular sits on the side facing the lamp, so orbs left of it are
       lit from their right and orbs right of it from their left; resizing keeps the rings circular
       and proportionally gapped, and does not re-grain the orbs; the cursor opens the orbs it
       passes through and they settle back without overshoot piling up; the formation leans toward
       the cursor without ever reading as sliding; no WebGL 2 / reduced motion / no-GSAP = the
       painted two-ring formation, standing still at rot 0.
       ============================================================================================ */
    const fld = this._ringField(), rings = this._rings();
    const o = {
      fld, rings, active: false, frame: 0, N, rot: 0, t: 0, rotSpeed: 360 / this.ORB_ROT_SECS,
      vw: window.innerWidth || 1440, vh: window.innerHeight || 800,
    };
    o.geom = this._ringGeom(o.vw, o.vh);
    // ring constants + a full placement at the current rotation. Runs on build and on resize; after
    // it, the tick writes nothing but position (+ light).
    const dress = () => {
      // On the field the per-orb constants are attributes rather than styles, and only the two that
      // are genuinely per-viewport get rewritten. Position needs no dressing either way — it falls
      // out of the formula on the next tick.
      if (this._orbField) { this._orbField.setSizes(this._fieldSizes()); return; }
      tiles.forEach((tile, i) => {
        const s = o.fld[i]; if (!s) return;
        const a = (s.ang0 + o.rot * o.rings[s.ri].dir) * Math.PI / 180, R = o.geom.R[s.ri];
        const x = Math.cos(a) * R, y = Math.sin(a) * R;
        g.set(tile, { x, y, scale: o.geom.px[s.ri] / o.geom.base, rotate: 0 });
        this._ringDress(tile, o.rings[s.ri], o.geom, s.ri);
        this._ringLight(tile, o.rings[s.ri], o.geom.px[s.ri], x, y, o.vw, o.vh);
      });
    };
    dress();
    o.dress = dress;   // _dropOrbField needs it: losing the field means the DOM tiles need dressing
    /* Re-solve when the HERO changes size, not only when the viewport does.
       §4's radii are built on _heroReach(), which is a DOM measurement, and the tick re-derives the
       geometry on a viewport change and on nothing else — so a reach taken before the copy has its
       final box is the reach the formation keeps for the entire visit, with no event that will ever
       correct it. On a portrait tablet that landed as every ring collapsed onto the copy; a 1px
       resize snapped it right, which is the whole diagnosis. The marks' own box changing IS the
       signal that the reach is stale, and watching them catches the webfont swap, a late reflow and
       a copy change alike, where a one-shot fonts.ready would only catch the first.
       src/notfound/main.js follows its heading for exactly this reason. The first callback fires
       immediately on observe and re-solves with the numbers we already have, which is harmless —
       dress() is idempotent and the radii fall out of the formula on the next tick regardless. */
    const reachMarks = [...document.querySelectorAll('[data-landing] h1, [data-landing] p, [data-glass-cta]')];
    if (reachMarks.length && typeof ResizeObserver !== 'undefined') {
      o.reachWatch = new ResizeObserver(() => {
        if (this._orbit !== o) return;               // a rebuilt orbit owns its own observer
        o.geom = this._ringGeom(o.vw, o.vh);
        dress();
      });
      reachMarks.forEach((m) => o.reachWatch.observe(m));
    }
    // ONE ticker for the whole formation, ONE rotation value. Position is derived, not integrated:
    // every orb's angle is recomputed from its index each frame, so no error can accumulate and the
    // two rings cannot drift apart no matter how long the landing sits open.
    o.tick = (time, deltaMS) => {
      if (!o.active) return;
      const dt = Math.min(0.05, (deltaMS || 16.7) / 1000);   // clamp: a stalled tab must not jump the formation
      const vw = window.innerWidth || 1440, vh = window.innerHeight || 800;
      // resize: re-derive the geometry and re-dress. Positions need no fixing — they fall out of the
      // formula on the very next line.
      if (vw !== o.vw || vh !== o.vh) { o.vw = vw; o.vh = vh; o.geom = this._ringGeom(vw, vh); dress(); }
      o.rot = (o.rot + o.rotSpeed * dt) % 360;               // the one shared angle, ease:'none' by construction
      o.t += dt;
      /* Part C. The SAME formula, resolved to centres instead of transforms and handed to the field
         from this ticker — so the formation still has exactly one clock (§3) and the field never
         integrates a rotation of its own. Two conversions and nothing else: the ring formula's y
         counts down the screen where the field's scene counts up, and §5's float is added here
         rather than through --fy/--ph, which have no meaning inside a particle cloud. */
      if (this._orbField) {
        const ctr = this._orbField.centers, ord = this._fieldOrder, bb = this._fieldBob;
        for (let k = 0; k < ord.length; k++) {
          const s = o.fld[ord[k]], r = o.rings[s.ri];
          const a = (s.ang0 + o.rot * r.dir) * Math.PI / 180, R = o.geom.R[s.ri];
          const fy = r.float ? o.geom.px[s.ri] * 0.03 * Math.sin(o.t * bb.w[k] + bb.ph[k]) : 0;
          ctr[k * 2] = Math.cos(a) * R;
          ctr[k * 2 + 1] = -(Math.sin(a) * R) + fy;
        }
        this._orbField.update(dt);
        return;
      }
      const f = ++o.frame;
      for (let i = 0; i < tiles.length; i++) {
        const s = o.fld[i]; if (!s) continue;
        // ONE rot, read through the ring's own direction — the rings counter-rotate off a single clock
        const a = (s.ang0 + o.rot * o.rings[s.ri].dir) * Math.PI / 180, R = o.geom.R[s.ri];
        const x = Math.cos(a) * R, y = Math.sin(a) * R;
        g.set(tiles[i], { x, y });
        // the light answers to the orb's new screen position. Refreshed on a 1-in-3 rotation: at ring
        // speed the relationship moves fractions of a pixel per frame, so a third of the property
        // writes is visually identical and keeps two dozen orbs off the main thread's back.
        if ((f + i) % 3 === 0) this._ringLight(tiles[i], o.rings[s.ri], o.geom.px[s.ri], x, y, vw, vh);
      }
    };
    this._orbit = o;
    this.playOrbit();
    if (!this._orbitVis) { this._orbitVis = () => { if (document.hidden) this.pauseOrbit(); else if (this._orbit && this._landingUp()) this.playOrbit(); }; document.addEventListener('visibilitychange', this._orbitVis); }
  },
  playOrbit() {
    this._glPaused = false; const o = this._orbit; if (!o || this._reduce) return;
    o.active = true;
    if (!o.added && window.gsap) { window.gsap.ticker.add(o.tick); o.added = true; }
    if (this._blobTweens) this._blobTweens.forEach((t) => { try { t.play(); } catch (e) { } });
  },
  // hidden tab / dismissed landing: the drift stops integrating and the blobs stop, so nothing runs
  pauseOrbit() {
    this._glPaused = true; const o = this._orbit; if (!o) return;
    o.active = false;
    if (this._blobTweens) this._blobTweens.forEach((t) => { try { t.pause(); } catch (e) { } });
  },
  killOrbit() {
    this._landRevealed = false; this._tearDownOrbField(); this._killOrbGL(); this._killOrbitBlobs();
    this._rng = null; this._noiseURL = null; this._envURL = null; this._ditherTile = null;   // per-visit seeds/maps — a return to the intro re-seeds fresh (and re-reads the theme)
    this._orbitURLs = null; this._orbitPalettes = null;
    // the formation itself is parametric, so nothing about it needs re-seeding — only the palette
    // assignment above is per-visit. _ringFld/_orbSlots stay cached: they are pure config.
    const o = this._orbit;
    if (o) { o.active = false; if (o.added && window.gsap) { try { window.gsap.ticker.remove(o.tick); } catch (e) { } } if (o.reachWatch) { try { o.reachWatch.disconnect(); } catch (e) { } o.reachWatch = null; } this._orbit = null; }
    if (this._orbitVis) { document.removeEventListener('visibilitychange', this._orbitVis); this._orbitVis = null; }
  },
};
