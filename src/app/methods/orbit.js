// Orbit landing (first-visit brand arrival): five colour orbs on a stepped Osmo orbit with one
// fixed room light, painted DOM floor + living gradient blobs, and the raw-WebGL shader renderer
// (Part B) layered above it. The DOM stack is the permanent floor — no-WebGL, reduced-motion and
// context-loss all resolve to the painted orbs.
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
    // ONE GLOBAL LIGHT (ORB_LIGHT) — highlight, shading, rim, spec all derive from it.
    const L = this.ORB_LIGHT;
    const deep = hexes.slice().sort((a, b) => lum(a) - lum(b))[0] || hexes[hexes.length - 1] || '#333';
    const bright = hexes.slice().sort((a, b) => lum(b) - lum(a))[0] || hexes[0] || '#bbb';
    const cool = hexes.slice().sort((a, b) => { const ca = this.hexToRgb(a), cb = this.hexToRgb(b); return (cb[2] - cb[0]) - (ca[2] - ca[0]); })[0] || bright;
    ctx.fillStyle = deep; ctx.fillRect(0, 0, W, H);
    const lx = W * (L.x + (Math.random() - 0.5) * 0.04), ly = H * (L.y + (Math.random() - 0.5) * 0.04);
    // non-linear diffuse falloff (Lambert-ish): bright core, accelerating darkening away from the light
    const core = ctx.createRadialGradient(lx, ly, 0, lx, ly, Math.max(W, H) * 1.05);
    core.addColorStop(0, this.hexA(bright, 0.96)); core.addColorStop(0.22, this.hexA(bright, 0.72));
    core.addColorStop(0.45, this.hexA(hexes[0] || bright, 0.45)); core.addColorStop(0.70, this.hexA(deep, 0.25)); core.addColorStop(1, this.hexA(deep, 0));
    ctx.fillStyle = core; ctx.fillRect(0, 0, W, H);
    // per-visit jitter: the palette's colours pooled across the surface — never the same arrangement twice
    const jit = (v) => v + (Math.random() - 0.5) * 0.16;
    const pts = [[0.22, 0.26], [0.80, 0.20], [0.72, 0.74], [0.26, 0.80], [0.52, 0.50]].map((p) => [jit(p[0]), jit(p[1])]);
    hexes.forEach((hex, i) => {
      const p = pts[i % pts.length]; const cx = p[0] * W, cy = p[1] * H; const r = Math.max(W, H) * (0.45 + Math.random() * 0.15);
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, this.hexA(hex, 0.5)); g.addColorStop(1, this.hexA(hex, 0));
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    });
    // Fresnel rim — faint cool light wrap on the shadow-side edge (strongest single realism cue)
    const rx = W * (1 - L.x), ry = H * (1 - L.y);
    const rim = ctx.createRadialGradient(rx, ry, Math.max(W, H) * 0.30, rx, ry, Math.max(W, H) * 0.62);
    rim.addColorStop(0, this.hexA(cool, 0)); rim.addColorStop(0.82, this.hexA(cool, 0)); rim.addColorStop(0.95, this.hexA(cool, 0.22)); rim.addColorStop(1, this.hexA(cool, 0.34));
    ctx.fillStyle = rim; ctx.fillRect(0, 0, W, H);
    // specular pair aligned to the light: tight warm dot + broad soft sheen (never pure white)
    if (ctx.filter !== undefined) ctx.filter = 'none';
    const s1 = ctx.createRadialGradient(lx, ly, 0, lx, ly, Math.max(W, H) * 0.10);
    s1.addColorStop(0, 'rgba(255,250,240,0.75)'); s1.addColorStop(1, 'rgba(255,250,240,0)');
    ctx.fillStyle = s1; ctx.fillRect(0, 0, W, H);
    const s2 = ctx.createRadialGradient(lx * 1.15, ly * 1.15, 0, lx * 1.15, ly * 1.15, Math.max(W, H) * 0.34);
    s2.addColorStop(0, 'rgba(255,248,238,0.22)'); s2.addColorStop(1, 'rgba(255,248,238,0)');
    ctx.fillStyle = s2; ctx.fillRect(0, 0, W, H);
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
  _paintOrbitTiles() {
    const urls = this.orbitTileURLs();
    const lum = (hx) => this.lumHex ? this.lumHex(hx) : 0.5;
    const L = this.ORB_LIGHT, Lpc = Math.round(L.x * 100) + '% ' + Math.round(L.y * 100) + '%';
    [...document.querySelectorAll('[data-orbit-card]')].forEach((c, i) => {
      if (urls[i]) c.style.backgroundImage = 'url(' + urls[i] + ')';
      c.querySelectorAll('[data-orb-fx]').forEach((el) => { try { el.remove(); } catch (e) { } });
      const item = c.parentElement;
      if (item) item.querySelectorAll('[data-orb-shadow]').forEach((el) => { try { el.remove(); } catch (e) { } });
      const pal = this._orbitPalettes && this._orbitPalettes[i]; if (!pal) return;
      const deep = pal.swatches.map((s) => s.hex).sort((a, b) => lum(a) - lum(b))[0] || '#000';
      // non-linear limb / ambient occlusion — gentle to ~80% radius, then deepening; never pure black
      const limb = document.createElement('div');
      limb.setAttribute('data-orb-fx', 'limb'); limb.setAttribute('aria-hidden', 'true');
      limb.style.cssText = 'position:absolute;inset:0;z-index:2;pointer-events:none;border-radius:50%;'
        + 'background:radial-gradient(circle at ' + Lpc + ', transparent 55%, ' + this.hexA(deep, 0.10) + ' 72%, ' + this.hexA(deep, 0.30) + ' 84%, ' + this.hexA(deep, 0.58) + ' 97%)';
      c.appendChild(limb);
      // diffuse bias — the DIRECTIONAL component of the lighting, separated from the baked base
      const dif = document.createElement('div');
      dif.setAttribute('data-orb-fx', 'diffuse'); dif.setAttribute('aria-hidden', 'true');
      dif.style.cssText = 'position:absolute;z-index:2;pointer-events:none;border-radius:50%;mix-blend-mode:soft-light;will-change:transform;'
        + 'width:120%;height:120%;left:-10%;top:-10%;'
        + 'background:radial-gradient(circle, rgba(255,255,255,0.60) 0%, rgba(255,255,255,0.18) 42%, rgba(255,255,255,0) 66%);'
        + 'transform:translate(calc(var(--hx, 0px) * 1.5), calc(var(--hy, 0px) * 1.5))';
      c.appendChild(dif);
      // fresnel rim — a directionally-masked bright arc that always sits OPPOSITE the light
      const rim = document.createElement('div');
      rim.setAttribute('data-orb-fx', 'rim'); rim.setAttribute('aria-hidden', 'true');
      rim.style.cssText = 'position:absolute;inset:0;z-index:2;pointer-events:none;border-radius:50%;mix-blend-mode:screen;opacity:0.18;will-change:transform;'
        + 'background:linear-gradient(90deg, transparent 55%, rgba(255,255,255,0.55) 100%);'
        + '-webkit-mask:radial-gradient(circle, transparent 74%, #000 86%, #000 95%, transparent 99%);'
        + 'mask:radial-gradient(circle, transparent 74%, #000 86%, #000 95%, transparent 99%);'
        + 'transform:rotate(calc(var(--la, -144deg) + 180deg))';
      c.appendChild(rim);
      // env reflection — the room mirrored faintly in the glass: world-locked and parallax-shifted
      // AGAINST the highlight vector so the reflection slides over the surface as the orb travels.
      const env = document.createElement('div');
      env.setAttribute('data-orb-fx', 'env'); env.setAttribute('aria-hidden', 'true');
      env.style.cssText = 'position:absolute;z-index:2;pointer-events:none;border-radius:50%;mix-blend-mode:screen;opacity:0.10;will-change:transform;'
        + 'width:130%;height:130%;left:-15%;top:-15%;'
        + 'background-image:url(' + this._orbitEnvURL() + ');background-size:cover;'
        + 'transform:translate(calc(var(--hx, 0px) * -0.6), calc(var(--hy, 0px) * -0.6))';
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
      const spec = document.createElement('div');
      spec.setAttribute('data-orb-fx', 'spec'); spec.setAttribute('aria-hidden', 'true');
      spec.style.cssText = 'position:absolute;z-index:3;pointer-events:none;border-radius:50%;will-change:transform;'
        + 'width:34%;height:34%;left:' + Math.round(L.x * 100 - 16) + '%;top:' + Math.round(L.y * 100 - 16) + '%;'
        + 'background:radial-gradient(circle, rgba(255,250,240,0.5) 0%, rgba(255,250,240,0.16) 38%, rgba(255,250,240,0) 68%);'
        + 'transform:translate(var(--hx, 0px), var(--hy, 0px)) scale(var(--tsx, 1), var(--tsy, 1));opacity:var(--li, 1)';
      c.appendChild(spec);
      // specular breakup — a secondary micro-highlight offset along the light vector at ~40% intensity
      const spec2 = document.createElement('div');
      spec2.setAttribute('data-orb-fx', 'spec2'); spec2.setAttribute('aria-hidden', 'true');
      spec2.style.cssText = 'position:absolute;z-index:3;pointer-events:none;border-radius:50%;will-change:transform;'
        + 'width:14%;height:14%;left:' + Math.round(L.x * 100 + 4) + '%;top:' + Math.round(L.y * 100 + 6) + '%;'
        + 'background:radial-gradient(circle, rgba(255,250,240,0.22) 0%, rgba(255,250,240,0) 70%);'
        + 'transform:translate(calc(var(--hx, 0px) * 1.3), calc(var(--hy, 0px) * 1.3));opacity:var(--li, 1)';
      c.appendChild(spec2);
      // floorless drop shadow — pre-blurred radial layer offset OPPOSITE the light (transform-only)
      if (item) {
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
    [...document.querySelectorAll('[data-orbit-card]')].forEach((card, i) => {
      const pal = this._orbitPalettes[i]; if (!pal) return;
      const chroma = (hx) => { const c = this.hexToRgb(hx); return Math.max(...c) - Math.min(...c); };
      const hexes = pal.swatches.slice().sort((a, b) => chroma(b.hex) - chroma(a.hex)).map((s) => s.hex);
      const nBlobs = 2 + Math.floor(rng() * 2);
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
      [[220, 0.05, 26, 1], [340, 0.04, 34, -1]].forEach(([bs, op, dur, dir], k) => {
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
    [...document.querySelectorAll('[data-orbit-card]')].forEach((card, i) => {
      const pal = this._orbitPalettes && this._orbitPalettes[i]; if (!pal) return;
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
      la: Math.atan2(dyr, dxr) * 180 / Math.PI, hx: dx * m * tw * 0.12, hy: dy * m * tw * 0.12,
      sx: -dx * (6 + m * 6), sy: -dy * (6 + m * 6), li: 1 - m * 0.25, m,
    };
  },
  _applyLightVars(el, v) {
    const st = el.style;
    st.setProperty('--la', v.la.toFixed(1) + 'deg'); st.setProperty('--hx', v.hx.toFixed(1) + 'px'); st.setProperty('--hy', v.hy.toFixed(1) + 'px');
    st.setProperty('--sx', v.sx.toFixed(1) + '%'); st.setProperty('--sy', v.sy.toFixed(1) + '%'); st.setProperty('--li', v.li.toFixed(3)); st.setProperty('--lm', (v.m === undefined ? 0.5 : v.m).toFixed(3)); st.setProperty('--ld', (v.d === undefined ? 1 : v.d).toFixed(3));
  },
  // Reduced-motion / no-gsap floor: a calm, static fanned arrangement (no orbit, no rotation).
  _staticOrbit() {
    const tiles = [...document.querySelectorAll('[data-orbit-item]')]; const N = tiles.length; if (!N) return;
    const vw = window.innerWidth || 1440, vh = window.innerHeight || 800;
    tiles.forEach((t, i) => {
      const o = i - (N - 1) / 2; const tw = t.offsetWidth || 240;
      t.style.transform = 'translate(' + (o * tw * 0.46) + 'px,0) scale(' + (1 - Math.abs(o) * 0.15) + ')';
      t.style.opacity = '1'; t.style.filter = 'brightness(' + (1 - Math.abs(o) * 0.20) + ')'; t.style.zIndex = String(100 - Math.abs(Math.round(o)));
      this._applyLightVars(t, this._lightTargets(o * tw * 0.46, 0, tw, vw, vh));
    });
  },
  _orbitActiveIndex(o) {
    const N = o.N, st = o.states;
    const wd = (k) => { const m = (((k - st[k].progress) % N) + N) % N; return Math.min(m, N - m); };
    return st.reduce((closest, _, i) => wd(i) < wd(closest) ? i : closest, 0);
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
    if (this.state.landingDismissed) return;
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
    const list = container.querySelector('[data-orbit-list]');
    const tiles = [...container.querySelectorAll('[data-orbit-item]')];
    const N = tiles.length; if (N < 2) return;
    this._paintOrbitTiles();
    this._spawnOrbitBlobs();   // living gradients — same lifecycle as the orbit, inner layers only
    this._initOrbGL();         // Part B: shader renderer over the DOM floor (self-gating; floor stays live)
    // free vertical float: one phase tween per orb (--ph −1↔1), per-orb random duration + negative
    // delay so no two sync. Joins _blobTweens → pause/play/kill with the orbit.
    tiles.forEach((t) => {
      const fl = t.querySelector('[data-orb-float]'); if (!fl) return;
      this._blobTweens = this._blobTweens || [];
      this._blobTweens.push(g.fromTo(fl, { '--ph': -1 }, { '--ph': 1, duration: 5 + Math.random() * 4, repeat: -1, yoyo: true, ease: 'sine.inOut', delay: -Math.random() * 9 }));
    });
    /* ============================== MOTION CONTRACT — DO NOT MODIFY ==============================
       Any pass touching this module must leave these four layers byte-identical unless the brief
       explicitly amends the motion contract. Lighting/shading passes compose WITH this state —
       they never substitute their own time-based angles for the stepped progress.
       1. FLAT ELLIPSE  — angle=((i−states[i].progress)/N)·2π; x=sin·rx, y=0 (radiusY:0);
          depth=((cos+1)/2)^1.3 → scale 0.2→1, blur 0.04·tw→0, brightness 0.3→1,
          saturate 0.72→1, contrast 0.93→1, zIndex.
       2. STEPPED ADVANCE — every orb's progress +1 per step; moveDur 2.5, stagger moveDur·0.03,
          pauseDuration 0, looping delayed-call chain; ease --ease-orbit-step
          cubic-bezier(0.625,0.05,0,1) — dwell→whip→settle, NEVER ease-entrance/uniform.
       3. DUAL ROTATION — list rotate:+360 & each tile rotate:−360, duration 24, ease:'none',
          repeat:-1, together: the ring sweeps the ellipse while orbs stay upright.
       4. FREE FLOAT — engine writes --fy=(1−depth^1.3)·(tw·0.08) (0 at front); per-orb sine tween
          oscillates --ph −1↔1 (5–9s, negative delays, never synced); the [data-orb-float] wrapper
          applies translateY(calc(--fy · --ph)); float tweens live in the _blobTweens lifecycle.
       ACCEPTANCE: the advance visibly dwells and whips; out-of-focus orbs sweep vertically with
       the ring AND float on their own phases; the front orb holds steady; positional lighting
       rides on top unchanged; reduced motion = static fan.
       ============================================================================================ */
    const cfg = { radiusX: 1, radiusY: 0, blurMul: 0.04, minScale: 0.2, minDark: 0.3, moveDur: 2.5, rotDur: 24 };
    cfg.stagger = cfg.moveDur * 0.03;
    const states = tiles.map(() => ({ progress: 0 }));
    this._lightSm = tiles.map(() => null);   // smoothed light state, reset per build
    const render = () => {
      const tw = tiles[0].offsetWidth || 260; const rx = tw * cfg.radiusX, ry = tw * cfg.radiusY, maxBlur = tw * cfg.blurMul;
      // positional lighting: analytic screen position (ellipse x rotated by the ring angle θ) vs the
      // fixed room light. No rect/computed-style reads in the tick.
      const th = (Number(g.getProperty(list, 'rotation')) || 0) * Math.PI / 180;
      const vw = window.innerWidth || 1440, vh = window.innerHeight || 800;
      tiles.forEach((tile, i) => {
        const angle = ((i - states[i].progress) / N) * Math.PI * 2;
        const depth = (Math.cos(angle) + 1) / 2; const ad = Math.pow(depth, 1.3);
        const xl = Math.sin(angle) * rx;
        g.set(tile, {
          x: xl, y: Math.cos(angle) * ry,
          scale: g.utils.interpolate(cfg.minScale, 1, ad), opacity: 1,
          filter: 'blur(' + g.utils.interpolate(maxBlur, 0, ad) + 'px) brightness(' + g.utils.interpolate(cfg.minDark, 1, ad) + ') saturate(' + g.utils.interpolate(0.72, 1, ad) + ') contrast(' + g.utils.interpolate(0.93, 1, ad) + ')',
          zIndex: Math.round(ad * 1000),
        });
        // depth → float amplitude: full breath at the back, 0 at the front (focused orb holds steady).
        tile.style.setProperty('--fy', ((1 - ad) * tw * 0.08).toFixed(1) + 'px');
        // engine computes the light relationship; layers consume the vars. Lerp ~0.15/tick so nothing
        // jitters at step boundaries (angle lerp wraps at ±180).
        const t = this._lightTargets(xl * Math.cos(th), xl * Math.sin(th), tw, vw, vh);
        // depth gates the key light: the lamp lives at the FRONT of the room — orbs receding to the
        // back drop out of it into ambient (spec dies, shading flattens).
        t.li *= (0.12 + 0.88 * ad); t.d = ad;
        const s = this._lightSm[i] || (this._lightSm[i] = { ...t });
        let dla = t.la - s.la; if (dla > 180) dla -= 360; if (dla < -180) dla += 360;
        s.la += dla * 0.15; s.hx += (t.hx - s.hx) * 0.15; s.hy += (t.hy - s.hy) * 0.15;
        s.sx += (t.sx - s.sx) * 0.15; s.sy += (t.sy - s.sy) * 0.15; s.li += (t.li - s.li) * 0.15; s.m += (t.m - s.m) * 0.15; s.d += ((t.d === undefined ? 1 : t.d) - (s.d === undefined ? 1 : s.d)) * 0.15;
        this._applyLightVars(tile, s);
        // specular anisotropy: horizontal travel speed (Δx per tick, smoothed) stretches the
        // highlight along the travel axis — clamped hard so it reads as gloss, never smear.
        const spd = Math.abs(xl - (s.px === undefined ? xl : s.px)); s.px = xl;
        s.v = (s.v === undefined ? 0 : s.v) + ((Math.min(1, spd / (tw * 0.06))) - (s.v || 0)) * 0.12;
        const str = 1 + s.v * 0.16;
        tile.style.setProperty('--tsx', str.toFixed(3)); tile.style.setProperty('--tsy', (1 / str).toFixed(3));
      });
    };
    const rotations = [
      g.to(list, { rotate: 360, duration: cfg.rotDur, ease: 'none', repeat: -1, paused: true }),
      g.to(tiles, { rotate: -360, duration: cfg.rotDur, ease: 'none', repeat: -1, paused: true }),
    ];
    const o = { states, render, rotations, tl: null, delayed: null, active: false, N, cfg };
    o.next = () => {
      if (!o.active) return;
      const ai = this._orbitActiveIndex(o);
      const ordered = states.map((state, index) => ({ state, offset: (index - ai + N) % N })).sort((a, b) => a.offset - b.offset);
      o.tl = g.timeline({ paused: true, onComplete: () => { if (o.active) o.delayed = g.delayedCall(0, o.next); } });
      // --ease-orbit-step (landing-scoped token): the Osmo curve's dwell→whip→settle IS the step's character
      ordered.forEach(({ state }, index) => { o.tl.to(state, { progress: state.progress + 1, duration: cfg.moveDur, ease: this._orbitStepEase || (this._orbitStepEase = this.cubicBezier(0.625, 0.05, 0, 1)), onUpdate: render }, index * cfg.stagger); });
      o.tl.play();
    };
    this._orbit = o;
    render();
    this.playOrbit();
    if (!this._orbitVis) { this._orbitVis = () => { if (document.hidden) this.pauseOrbit(); else if (this._orbit && !this.state.landingDismissed) this.playOrbit(); }; document.addEventListener('visibilitychange', this._orbitVis); }
  },
  playOrbit() { this._glPaused = false; const o = this._orbit; if (!o || this._reduce) return; o.active = true; o.rotations.forEach((r) => r.play()); if (o.tl && o.tl.progress() < 1) { o.tl.play(); } else { o.next(); } if (this._blobTweens) this._blobTweens.forEach((t) => { try { t.play(); } catch (e) { } }); },
  pauseOrbit() { this._glPaused = true; const o = this._orbit; if (!o) return; o.active = false; if (o.tl) o.tl.pause(); if (o.delayed) o.delayed.pause(); o.rotations.forEach((r) => r.pause()); if (this._blobTweens) this._blobTweens.forEach((t) => { try { t.pause(); } catch (e) { } }); },
  killOrbit() {
    this._landRevealed = false; this._killOrbGL(); this._killOrbitBlobs();
    this._rng = null; this._noiseURL = null; this._envURL = null;   // per-visit seeds/maps — a return to the intro re-seeds fresh (and re-reads the theme)
    this._orbitURLs = null; this._orbitPalettes = null;
    const o = this._orbit; if (o) { o.active = false; if (o.tl) { try { o.tl.kill(); } catch (e) { } } if (o.delayed) { try { o.delayed.kill(); } catch (e) { } } o.rotations.forEach((r) => { try { r.kill(); } catch (e) { } }); this._orbit = null; }
    if (this._orbitVis) { document.removeEventListener('visibilitychange', this._orbitVis); this._orbitVis = null; }
  },
};
