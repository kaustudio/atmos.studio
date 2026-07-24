// Ring landing (first-visit brand arrival, and the permanent small-screen surface): two concentric
// rings of colour orbs turning around the centred copy under one fixed room light, with a painted
// DOM floor + living gradient blobs and the raw-WebGL shader renderer (Part B) layered above it.
// The DOM stack is the permanent floor — no-WebGL, reduced-motion, phones and context-loss all
// resolve to the painted orbs. The motion model is frozen in the MOTION CONTRACT block in
// initOrbit(); the engine owns each orb's position, the inner layers own its light.
export const orbitMethods = {
  // Canvas gradient field from a seed palette's swatches → dataURL at tile size × DPR (crisp, no assets).
  _orbitTileURL(swatches, w, h) {
    const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
    const cv = document.createElement('canvas'); cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    const ctx = cv.getContext('2d'); const W = cv.width, H = cv.height;
    // lead with each palette's most chromatic swatches so the five tiles read as five distinct moods,
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
      const img = ctx.getImageData(0, 0, W, H), d = img.data;
      for (let q = 0; q < d.length; q += 4) { const nz = (Math.random() - 0.5) * 5; d[q] += nz; d[q + 1] += nz; d[q + 2] += nz; }
      ctx.putImageData(img, 0, 0);
    } catch (e) { }
    return cv.toDataURL('image/jpeg', 0.92);
  },
  // orbit tiles are driven by the reference palettes, not the archive seeds
  _orbitRefPalettes() {
    const P = (hexes) => ({ swatches: hexes.map((hex, i) => ({ hex, weight: 1 - (i * 0.15) })) });
    // one harmonious spectrum across the ring: five hues spaced evenly around the wheel
    // (amber → terracotta → sage → steel → plum), all at the same muted chroma register and the
    // same tonal spread (dominant mid / light lift / deep shadow) so the orbs complement, not clash
    return [
      P(['#b77743', '#dca96b', '#955c34', '#e7c79d', '#453424']),  // amber — warm anchor
      P(['#c76850', '#e39576', '#9f5141', '#eabda4', '#5a352d']),  // terracotta — dusk warmth
      P(['#7b8b62', '#9dab83', '#5c694a', '#cbd2b9', '#3f4733']),  // sage — quiet green bridge
      P(['#5a778a', '#8ba3b3', '#3f5562', '#c7d6dd', '#2b373e']),  // steel — cool counterweight
      P(['#896981', '#ad8fa7', '#644c60', '#d0bac9', '#40323d']),   // plum — closes the circle
    ];
  },
  orbitTileURLs() {
    if (this._orbitURLs) return this._orbitURLs;
    // shuffle which reference palette drives which tile — fresh assignment every arrival
    const seeds = this._orbitRefPalettes();
    for (let i = seeds.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [seeds[i], seeds[j]] = [seeds[j], seeds[i]]; }
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
    (this._orbitPalettes || []).slice(0, 4).forEach((p, i) => {
      const hex = p.swatches[0].hex, x = [104, 24, 110, 20][i], y = [100, 110, 30, 40][i];
      const gr = ctx.createRadialGradient(x, y, 0, x, y, 60);
      gr.addColorStop(0, this.hexA(hex, 0.18)); gr.addColorStop(1, this.hexA(hex, 0));
      ctx.fillStyle = gr; ctx.fillRect(0, 0, 128, 128);
    });
    this._envURL = cv.toDataURL(); return this._envURL;
  },
  // ---- The rings. Everything about the formation lives here: how many orbs, how far out, how big,
  // and where the ring starts. `phase` is what keeps the rings interleaved — the back ring is offset
  // half a step (360/(2·count)) so its orbs sit in the front ring's gaps and never align radially.
  // Depth is per RING, not per orb: size, blur, opacity and z are the parallax.
  // Radii are NOT configured here — they are solved per viewport in _ringGeom (outermost ring flush
  // to the screen edges, every radial gap equal). What is configured is each ring's population, its
  // size, and its depth treatment. Counts are deliberately unequal and roughly proportional to
  // circumference, so the ARC gap between neighbours comes out the same on both rings: at 1440×900
  // the front ring runs ~144px between orb edges and the back ring ~135px. Equal counts would leave
  // the outer ring's gaps more than twice the inner ring's — the whitespace this formation had.
  _rings() {
    return [
      // front — the formation's read: biggest, crisp, full key light, the only ring that floats
      { count: 12, size: 84, phase: 0, dir: 1, z: 30, op: 1, bright: 1, sat: 1, con: 1, blur: 0, dep: 1, fx: 2, float: 1 },
      // back — smaller, softer, dimmer; reads as depth, never as a second read. dir −1: the small
      // orbs run COUNTER-CLOCKWISE against the front ring (contract §3).
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
  // Ring geometry for the current viewport, solved rather than configured.
  //   1. BASE GAP — g is sized off the viewport width so the formation always spans it, floored so
  //      the hero keeps breathing room on viewports too tight to fit the whole set.
  //   2. WIDER BETWEEN RINGS — the ring→ring gap is ORB_RING_GAP_MUL× the copy→ring gap, so the
  //      rings read as separate depths rather than one thick band.
  //   3. OVERFLOW IS FINE — the outer ring is NOT pinned to the edges; it runs off both sides by
  //      design. True circles, so it leaves the top and bottom too. That overflow is the intended
  //      read, not a fit failure.
  // Orb sizes scale off the SMALLER edge — tied to width they would balloon on wide, short screens.
  _ringGeom(vw, vh) {
    const rings = this._rings(), edge = Math.min(vw, vh) || 720;
    const sizeK = Math.min(1.35, Math.max(0.66, edge / 720));
    const px = rings.map((r) => r.size * sizeK);
    const last = rings.length - 1;
    const reach = this._heroReach();
    const inner = px.slice(0, last).reduce((a, b) => a + b, 0);     // inner rings each eat a full diameter
    // The floor is a fraction of the ORB, not an absolute px: portrait tablets are narrow enough
    // that the width-derived g collapses onto it while their orbs stay near desktop size, and a flat
    // 24px there put the rings less than half an orb apart. Proportional, the floor reads the same
    // at every size.
    const g = Math.max(px[0] * this.ORB_MIN_GAP_MUL, (vw / 2 - px[last] - reach - inner) / rings.length);
    const R = []; let cursor = reach;                               // cursor tracks the last consumed edge
    rings.forEach((r, i) => {
      // copy→ring tight, ring→ring wide — but CAPPED in orb diameters. g is derived from the
      // viewport width, so without a ceiling the ring→ring gap grows with the screen and the rings
      // drift apart into two unrelated arcs on large displays (3.2 diameters on a 16" laptop, 3.9 at
      // 1080p). The floor and the ceiling are both expressed against the orb for the same reason.
      const gap = i === 0 ? g : Math.min(g * this.ORB_RING_GAP_MUL, px[0] * this.ORB_RING_GAP_MAX);
      R[i] = cursor + gap + px[i] / 2; cursor = R[i] + px[i] / 2;
    });
    // Capping the ring→ring gap can leave the outer ring short of the edges on a very wide screen,
    // which is the side whitespace this formation exists to avoid. Slide the whole set out until it
    // spans the width: a constant added to every radius moves the copy→ring gap only — the ring→ring
    // gaps, and so the cap above, are preserved exactly.
    const short = vw / 2 - (R[last] + px[last] / 2);
    if (short > 0) for (let i = 0; i <= last; i++) R[i] += short;
    return { edge, g, px, R, base: this._orbBase(vw) };
  },
  _paintOrbitTiles() {
    const urls = this.orbitTileURLs();
    const lum = (hx) => this.lumHex ? this.lumHex(hx) : 0.5;
    const L = this.ORB_LIGHT, Lpc = Math.round(L.x * 100) + '% ' + Math.round(L.y * 100) + '%';
    const fld = this._ringField(), rings = this._rings();
    [...document.querySelectorAll('[data-orbit-card]')].forEach((c, i) => {
      // the five reference tiles/palettes dress the whole formation — colour is what varies orb to
      // orb, so the bake stays five canvases however many orbs the rings hold
      if (urls.length) c.style.backgroundImage = 'url(' + urls[i % urls.length] + ')';
      c.querySelectorAll('[data-orb-fx]').forEach((el) => { try { el.remove(); } catch (e) { } });
      const item = c.parentElement;
      if (item) item.querySelectorAll('[data-orb-shadow]').forEach((el) => { try { el.remove(); } catch (e) { } });
      const pals = this._orbitPalettes; const pal = pals && pals[i % pals.length]; if (!pal) return;
      // fx budget by ring: the back ring is small, softened and dim — the costliest grazing-angle
      // layers (env, sheen) would buy compositing nobody can see. Uniform WITHIN a ring, always, and
      // identical on every viewport: an orb's shading must not change with the screen it's on.
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
  // masked line reveal on the landing statement — lines are pre-authored spans inside overflow:hidden
  // masks, so this is a pure from-tween: no split, no restore, static text is the no-GSAP floor
  _landingTextReveal(g) {
    g = g || window.gsap;
    const lines = [...document.querySelectorAll('[data-land-line]')];
    if (!g || !lines.length || this._reduce) return;
    if (this._landRevealed) return;   // once per landing arrival — loader/wipe/initOrbit may all call this
    this._landRevealed = true;
    g.killTweensOf(lines);
    g.fromTo(lines, { yPercent: 110 }, { yPercent: 0, duration: this.DUR ? this.DUR.reveal : 0.62, stagger: 0.09, ease: this.EASE ? this.EASE.entrance : 'power3.out', clearProps: 'transform' });
  },
  initOrbit() {
    if (!this._landingUp()) return;
    if (this._orbit) {   // already built — repainting here would orphan the render cache + drift tweens
      const g0 = window.gsap;
      if (g0 && !this.state.showLoader && !this._wipeRunning) this._landingTextReveal(g0);
      return;
    }
    this._paintOrbitTiles();   // canvas paint must NEVER wait on GSAP — do it first, always
    if (this._reduce) { requestAnimationFrame(() => this._staticOrbit()); return; }
    const g = window.gsap; const container = document.querySelector('[data-orbit]');
    if (!g || !container) { this._orbitRetry = (this._orbitRetry || 0) + 1; if (this._orbitRetry < 50) { setTimeout(() => this.initOrbit(), 100); } else { requestAnimationFrame(() => this._staticOrbit()); } return; }
    // reveal only when the landing is actually visible — under the loader or wipe cover the
    // covering timeline fires the reveal itself at its uncover moment
    if (!this.state.showLoader && !this._wipeRunning) this._landingTextReveal(g);
    const tiles = [...container.querySelectorAll('[data-orbit-item]')];
    const N = tiles.length; if (N < 2) return;
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
    /* ============================== MOTION CONTRACT — DO NOT MODIFY ==============================
       AMENDED (concentric rings): this replaces the scatter-field contract — seeded positions,
       per-orb headings, tangential centre-avoidance, edge wrap — which is retired in full, as the
       choreographed cylinder before it was. The sanctioned motion is now a PARAMETRIC RING SET, and
       the same rule applies: any pass touching this module must leave these five layers
       byte-identical unless a brief explicitly amends the contract again. Lighting/shading passes
       compose WITH this state — they never substitute their own angles for the ring formula.
       1. PARAMETRIC POSITION — nothing is seeded and nothing accumulates. For orb i of ring r:
          angle = (i/r.count)·360 + r.phase + rot·r.dir;  x = cos(angle)·R[r];  y = sin(angle)·R[r].
          Recomputed from the index EVERY frame, so spacing can never drift out of true.
       2. THE RINGS (_rings) — front: count 12, size 84, phase 0, dir +1, z 30, opacity 1, no blur,
          dep 1, floats. Back: count 21, size 56, phase 360/(2·21), dir −1, z 20, opacity .62, blur
          1.7px, brightness .95, saturate .76, dep .55, still. The angular step is exactly 360/count
          — no jitter — and every orb in a ring is the SAME size. Counts are UNEQUAL on purpose,
          roughly proportional to circumference, so the arc gap between neighbours matches across
          rings (~144px vs ~135px at 1440×900). Equal counts put more than twice the gap on the outer
          ring; that was the whitespace. A consequence worth keeping: with 12 against 21 the pairs no
          longer align all at once, so the counter-rotation has no global pulse.
       3. ONE CLOCK, COUNTER-ROTATION — ONE `rot`, advanced by ONE ticker: rot += (360/ROT_SECS)·dt,
          linear, continuous, ROT_SECS = 105. Both rings read that same variable; only the SIGN
          differs (r.dir), so the small back ring turns counter-clockwise against the front. One
          magnitude, so neither ring can drift away from the other's cadence.
          AMENDED, KNOWINGLY: the earliest contract locked both rings to the same direction so a
          half-step offset held permanently. Counter-rotation traded that away by design, which with
          equal counts made all pairs align together every 4.37s. The unequal counts of §2 dissolve
          even that: 12 against 21 never brings the pairs into step at once, so the formation has no
          global pulse — passings are staggered and continuous. Do not "fix" this by re-locking the
          directions or equalising the counts; both are load-bearing, and changing them is a contract
          amendment, not a tweak.
       4. GEOMETRY (_ringGeom) — radii are SOLVED, not configured. A base gap g is sized off the
          width: g = (vw/2 − px_last − _heroReach() − Σ inner diameters) / ringCount. The copy→ring0
          interval is g; every ring→ring interval is g · ORB_RING_GAP_MUL (1.75), so the rings read
          as separate depths rather than one thick band. Both bounds on g are expressed against the
          ORB, never in absolute px, because the same pixel count reads differently at 55px and
          113px: floor ORB_MIN_GAP_MUL (0.55 diameters, binds on phones and portrait tablets, where
          the width-derived g collapses), ceiling ORB_RING_GAP_MAX (2.2 diameters on the ring→ring
          gap, binds from ~1440px up, where g would otherwise track the width and pull the rings
          apart into two unrelated arcs). Finally, if the capped gap leaves the outer ring inside the
          viewport, every radius slides out by the shortfall — a constant, so the ring→ring gaps and
          the cap survive it and only the copy→ring gap grows. The outer ring is deliberately NOT
          pinned to the viewport: it runs off both sides, and being true circles it leaves the top
          and bottom too. That overflow is the intended read, not a fit failure. Sizes = size ·
          clamp(min(vw,vh)/720, .66, 1.35) — tied to width they would balloon on wide, short screens.
          Recomputed on resize.
       5. RING PARALLAX + FLOAT — depth is per ring (size, blur, opacity, brightness, saturate, z,
          dep), never per orb and never from cos(angle); written ONCE by _ringDress on build and
          resize, so the tick writes position only. Float is front-ring only and a whisper:
          --fy = dia·0.03, per-orb sine tween on --ph −1↔1 (5–9s, negative delays, never synced),
          [data-orb-float] applies translateY(calc(--fy · --ph)); tweens live in _blobTweens.
       INVARIANTS the ring model inherits and must keep: the engine owns each orb's transform and
       nothing else touches it; all life (sphere body, --la/--ldx/--ldy/--sx/--sy/--li lighting,
       atmosphere blobs, float) rides on INNER layers; orbs never rotate, so they and their
       light/shadow stay upright as they travel; the circular clip is the object exception; no
       per-frame canvas repaint.
       ACCEPTANCE: two concentric rings, uniform size and identical angular gaps within each ring,
       the back one smaller/dimmer, set a clearly wider gap out, counter-rotating, and running off
       both sides of the viewport; both turn continuously and smoothly at the same magnitude with no
       moment where the whole formation lines up; the centre stays clear and the hero unobstructed at
       any viewport; an orb's shading is identical on every screen size — same fx layers, same shader
       budget; resizing keeps the rings circular and proportionally gapped;
       positional lighting rides on top unchanged; reduced motion / no-GSAP = the same formation
       standing still at rot 0.
       ============================================================================================ */
    const fld = this._ringField(), rings = this._rings();
    const o = {
      fld, rings, active: false, frame: 0, N, rot: 0, rotSpeed: 360 / this.ORB_ROT_SECS,
      vw: window.innerWidth || 1440, vh: window.innerHeight || 800,
    };
    o.geom = this._ringGeom(o.vw, o.vh);
    // ring constants + a full placement at the current rotation. Runs on build and on resize; after
    // it, the tick writes nothing but position (+ light).
    const dress = () => tiles.forEach((tile, i) => {
      const s = o.fld[i]; if (!s) return;
      const a = (s.ang0 + o.rot * o.rings[s.ri].dir) * Math.PI / 180, R = o.geom.R[s.ri];
      const x = Math.cos(a) * R, y = Math.sin(a) * R;
      g.set(tile, { x, y, scale: o.geom.px[s.ri] / o.geom.base, rotate: 0 });
      this._ringDress(tile, o.rings[s.ri], o.geom, s.ri);
      this._ringLight(tile, o.rings[s.ri], o.geom.px[s.ri], x, y, o.vw, o.vh);
    });
    dress();
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
    this._landRevealed = false; this._killOrbGL(); this._killOrbitBlobs();
    this._rng = null; this._noiseURL = null; this._envURL = null;   // per-visit seeds/maps — a return to the intro re-seeds fresh (and re-reads the theme)
    this._orbitURLs = null; this._orbitPalettes = null;
    // the formation itself is parametric, so nothing about it needs re-seeding — only the palette
    // assignment above is per-visit. _ringFld/_orbSlots stay cached: they are pure config.
    const o = this._orbit;
    if (o) { o.active = false; if (o.added && window.gsap) { try { window.gsap.ticker.remove(o.tick); } catch (e) { } } this._orbit = null; }
    if (this._orbitVis) { document.removeEventListener('visibilitychange', this._orbitVis); this._orbitVis = null; }
  },
};
