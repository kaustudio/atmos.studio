// THE LANDING STAGE — a volumetric colour field turning around the centred brand copy.
//
// WHAT THIS REPLACED, so the diff is legible: three concentric rings of colour orbs, drawn three
// ways in descending order of what a browser would allow (a single-context particle cloud, a raw
// per-orb WebGL shader, a painted DOM stack of ~116 elements carrying five shading layers each).
// All three are gone, along with the orb tiles, the env map, the living-gradient blobs, the per-orb
// float and the one room lamp every directional cue answered to. The formation is now GAS: one
// raymarched disc with the copy sitting in its hole (nebulaField.js), over a painted floor that is
// one element.
//
// WHAT DID NOT CHANGE, because it was never about orbs:
//   - The TWELVE OKLCH STATIONS. They are still the landing's palette and still the reason
//     neighbouring colour is neighbouring hue; they are baked into a ramp the shader reads instead
//     of into twelve tile textures. See _orbitStations.
//   - THE HOLE IS SOLVED FROM THE COPY. _heroReach measures the marks and _fieldGeom turns them into
//     a clear radius, exactly as _ringGeom turned them into ring radii. The words are never painted
//     over by geometry rather than by a plate laid under them.
//   - ONE CLOCK. One `rot`, advanced by one ticker, handed to the field. The field integrates
//     nothing of its own — and now nothing else either: the cursor layer the ring set carried is
//     retired with the orbs (contract §5).
//   - FLOOR FIRST. The painted floor is what the visitor looks at until the field's chunk lands, and
//     what they are handed back if the context is lost. It is a still of the same wheel in the same
//     place, so the arrival is a dissolve rather than a swap.
//
// nebulaField.js is NOT imported here. It pulls in three, and a static import puts three in the
// landing's own chunk — see _initNebula.
//
// The module and its four public methods keep their names. `initOrbit` / `playOrbit` / `pauseOrbit`
// / `killOrbit` are called from PaletteApp, wipe.js and the visibility handler, and they name the
// stage's ROLE — the landing's turning field — rather than the orbs that used to be in it.

import { rgb2oklab } from '../../lib/color.js';

export const orbitMethods = {
  /* ---- COLOUR ------------------------------------------------------------------------------
     THE TWELVE STATIONS, unchanged in every figure from the set that dressed the orbs. What changed
     is what they are baked into: twelve 290px tile textures then, one 256x32 ramp now.

     Two things are deliberately NOT flat across them:
       CHROMA — the warms stay the loudest voices and the cools sit back, but every station clears
         the chroma floor the old steel and plum fell through.
       LIGHTNESS (dL) — yellow and yellow-green carry their chroma high; run them on the same ramp as
         blue and they read as olive sludge rather than gold. Those two get the ramp lifted. That is
         a fact about the gamut, not a preference.

     WHY THE DEEP TONE NEVER CARRIES THE COUNTER-HUE. It is tempting to put the complement in the
     shadow — warm light, cool shadow, the oldest move in painting. In a volume it fails for the same
     reason it failed on the orb shader: the deepest tone is not an accent there, it is the entire
     far end of the ramp, and a complement in that slot turns the outer half of the disc a foreign
     colour with sludge in between. The counter-hue lives in the mid-dark or in the light tone at
     reduced chroma. The deep stays home. */
  _orbitStations() {
    return {
      /* THE TONAL LADDER, AS DISTANCE FROM THE PAGE RATHER THAN AS LIGHTNESS.

         It used to be five absolute OKLCH lightnesses — 0.86, 0.74, 0.62, 0.50, 0.34 — and those are
         five values authored against a near-white surface, which is the only surface half the site
         has. On the dark theme they put the whole ladder BELOW the page: gas at L 0.34 on a ground at
         L 0.19 is mud with no light in it, and the only way to see any of it was to push the exposure
         until the mid tones clipped toward white and the hue went with them. That is why the dark
         landing wanted its own gain, its own coverage and its own shoulder — three figures papering
         over a ramp that was pointing the wrong way.

         So the ladder is authored as five DISTANCES and the surface decides the direction: away from
         the page, always. On light that reproduces the original five to four decimal places (the
         surface is L 0.9696 and 0.9696 − 0.1096 is 0.86). On dark the same five run upward from
         L 0.1908 to 0.30 / 0.42 / 0.54 / 0.66 / 0.82 — the same tonal RELATIONSHIPS, the same order,
         the same near end, now made of light instead of shadow.

         Which is what makes the near end dissolve. Index 0 is the tone closest to the page in both
         themes, and it is also where TC takes the chroma down hardest — so the thinnest gas is both
         nearly the page's lightness and nearly its neutrality, and it goes into the surface instead
         of lying on top of it as a film. Index 4 is the furthest in both, and it is the one that
         carries the picture. Nothing about the authoring changed; what changed is that it is now
         relative to something. */
      SPREAD: [0.1096, 0.2296, 0.3496, 0.4696, 0.6296],
      // chroma as a fraction of the station's own. It falls off at BOTH ends: the tone nearest the
      // page has to be near-neutral to dissolve into it, and the one furthest away has to give up
      // chroma or it stops reading as the far end of one ramp and starts reading as a second colour.
      TC: [0.55, 0.90, 1.00, 0.85, 0.38],
      // per harmony: `h` rotates each tone off the base hue, `c` scales that tone's chroma again
      HARM: {
        analogWide:  { h: [-40, -20, 0, 24, 46],  c: [1, 1, 1, 1, 1] },     // 86° of drift — the richest gradient
        analogTight: { h: [-24, -12, 0, 14, 28],  c: [1, 1, 1, 1, 1] },     // 52° — the calm majority
        splitAccent: { h: [-28, -14, 0, 148, 32], c: [1, 1, 1, 0.55, 1] },  // split-complement in the mid-dark
        compAccent:  { h: [-26, -13, 0, 180, 30], c: [1, 1, 1, 0.50, 1] },  // the true complement, chroma halved
        triadAccent: { h: [-22, -11, 0, 120, 30], c: [1, 1, 1, 0.60, 1] },  // a third of the wheel, in the mid-dark
        triadLift:   { h: [-25, 112, 0, 20, 36],  c: [1, 0.60, 1, 1, 1] },  // a third of the wheel, in the airy tone
      },
      list: [
        { H: 30,  k: 'analogWide',  C: 0.125 },             // ember      — red, the warm anchor
        { H: 58,  k: 'splitAccent', C: 0.115, dL: 0.03 },   // amber      — orange with a teal accent
        { H: 88,  k: 'analogTight', C: 0.105, dL: 0.06 },   // ochre      — yellow
        { H: 118, k: 'compAccent',  C: 0.090, dL: 0.04 },   // moss       — green against its violet
        { H: 148, k: 'analogWide',  C: 0.095 },             // sage       — the quiet green bridge
        { H: 178, k: 'triadLift',   C: 0.080 },             // verdigris  — cyan
        { H: 205, k: 'analogTight', C: 0.078 },             // teal       — the coolest station
        { H: 235, k: 'triadAccent', C: 0.088 },             // steel      — blue, the cool counterweight
        { H: 265, k: 'analogWide',  C: 0.098 },             // indigo
        { H: 295, k: 'splitAccent', C: 0.088 },             // violet
        { H: 325, k: 'analogTight', C: 0.098 },             // plum
        { H: 355, k: 'compAccent',  C: 0.115 },             // rose       — closes the circle back onto ember
      ],
    };
  },
  /* ROTATE THE WHEEL, NEVER SHUFFLE IT. A shuffle was fresh every arrival and destroyed the one
     thing the twelve stations are for — neighbouring hues being neighbouring. Turning the whole
     wheel by a random amount, in a random direction, is just as unrepeatable and leaves the spectrum
     intact: the field always reads as one revolution, just not from the same place twice.
     Offset in TURNS (the shader adds it to a normalised angle); direction flips the ramp itself. */
  _orbitWheel() {
    if (this._wheel) return this._wheel;
    this._wheel = { turn: Math.random(), dir: Math.random() < 0.5 ? 1 : -1 };
    return this._wheel;
  },
  /* THE PAGE ITSELF, IN OKLAB. Read from the live `--surface` token rather than restated here, for
     the same reason themeColor.js reads it: the theme is a set of tokens and a second copy of one of
     them is a second source of truth that will disagree. It is the only input the ramp takes from
     outside the twelve stations, and it decides which way the ladder runs.
     Cached per theme; the fallback is the light token, which is the app's own default. */
  _surfaceLab() {
    /* Memoised on the theme, and that is not premature: _ladder() is called once per COLUMN of the
       ramp, so an un-memoised read here is 256 getComputedStyle calls — 256 forced style recalcs —
       inside a loop that already costs 8192 gamut maps. Keyed rather than cleared-on-write because
       the theme is the only thing that moves this token. */
    const key = this.state.theme;
    if (this._surfLab && this._surfKey === key) return this._surfLab;
    let hex = '#f5f5f3';
    try {
      const v = getComputedStyle(document.documentElement).getPropertyValue('--surface').trim();
      if (/^#[0-9a-f]{6}$/i.test(v)) hex = v;
    } catch (e) { }
    const c = this.hexToRgb(hex);
    this._surfLab = rgb2oklab(c[0] / 255, c[1] / 255, c[2] / 255);
    this._surfKey = key;
    return this._surfLab;
  },
  /* The ladder solved against the current page: five lightnesses running AWAY from the surface, and
     the near end is index 0 in both themes. `dL` is added upward in both — it exists because yellow
     and yellow-green carry their chroma high and go olive on a ramp that suits blue, which is a fact
     about the gamut rather than a direction on the page. */
  _ladder(dL) {
    const S = this._orbitStations(), surf = this._surfaceLab();
    const away = surf.L > 0.5 ? -1 : 1;
    return S.SPREAD.map((d) => Math.min(0.93, Math.max(0.06, surf.L + away * d + (dL || 0))));
  },
  /* THE RAMP. x is the hue wheel and it wraps; y is the tonal ladder, nearest the page at 0 and
     furthest from it at 1. Every pixel goes through `gamutMap` — the same function every palette in
     the tool is mapped through — so the gas wears the app's actual OKLCH space rather than a shader
     approximation of it, chroma walked down where sRGB cannot hold it and never faked.

     COLUMNS ARE STATIONS, NOT DEGREES. Each station owns exactly 1/12 of the wheel, which is the
     property the orb formation had when twelve orbs walked one revolution. The stations sit 27–35°
     apart, so this stretches the wheel by a couple of degrees in places; that is invisible, and an
     even share per station is what keeps the twelve authored moods legible as twelve.

     256x32 with a linear filter, which is finer than gas can show. 8192 gamut maps, ~10ms, paid once
     per landing arrival inside a module that is already off the critical path. */
  _orbitRampData() {
    // Keyed by THEME, not by visit: the ladder is solved against the page, so a theme switch is a
    // different ramp — see _ladder. Everything else about it, the wheel included, is unchanged.
    const key = this.state.theme;
    if (this._rampData && this._rampKey === key) return this._rampData;
    const S = this._orbitStations(), st = S.list, n = st.length;
    const wheel = this._orbitWheel();
    const W = 256, H = 32;
    const data = new Uint8Array(W * H * 4);
    const mix = (a, b, t) => a + (b - a) * t;
    for (let x = 0; x < W; x++) {
      // walk the stations in index space; `dir` reverses the wheel without disturbing its order
      const pos = (wheel.dir > 0 ? (x / W) : (1 - x / W)) * n;
      const i0 = Math.floor(pos) % n, i1 = (i0 + 1) % n, f = pos - Math.floor(pos);
      const s0 = st[i0], s1 = st[i1];
      // hue is interpolated the short way round, which for an ascending wheel means adding a turn
      // to the wrapping pair rather than sliding 325° backwards through every station between.
      const h1 = s1.H + (s1.H < s0.H ? 360 : 0);
      const hue = mix(s0.H, h1, f);
      const C = mix(s0.C, s1.C, f);
      const dL = mix(s0.dL || 0, s1.dL || 0, f);
      const A = S.HARM[s0.k], B = S.HARM[s1.k];
      const rung = this._ladder(dL);
      for (let y = 0; y < H; y++) {
        const t = (y / (H - 1)) * 4;
        const j0 = Math.min(Math.floor(t), 3), j1 = j0 + 1, g = t - j0;
        const L = mix(rung[j0], rung[j1], g);
        const cf = mix(S.TC[j0], S.TC[j1], g) * mix(mix(A.c[j0], A.c[j1], g), mix(B.c[j0], B.c[j1], g), f);
        const off = mix(mix(A.h[j0], A.h[j1], g), mix(B.h[j0], B.h[j1], g), f);
        const rad = (hue + off) * Math.PI / 180, chroma = C * cf;
        const v = parseInt(this.gamutMap(L, chroma * Math.cos(rad), chroma * Math.sin(rad)).slice(1), 16);
        const i = (y * W + x) * 4;
        data[i] = (v >> 16) & 255; data[i + 1] = (v >> 8) & 255; data[i + 2] = v & 255; data[i + 3] = 255;
      }
    }
    this._rampData = { data, width: W, height: H };
    this._rampKey = key;
    return this._rampData;
  },
  /* The wheel as twelve hexes at its MID tone — the painted floor's stops, and the bloom's tint.
     Same stations, same gamut map, read off the same ladder position the ramp's middle row holds. */
  _orbitFloorHexes() {
    const key = this.state.theme;
    if (this._floorHexes && this._floorKey === key) return this._floorHexes;
    const S = this._orbitStations(), wheel = this._orbitWheel();
    const list = wheel.dir > 0 ? S.list : S.list.slice().reverse();
    this._floorHexes = list.map((s) => {
      const L = this._ladder(s.dL)[2], c = s.C * S.TC[2], rad = s.H * Math.PI / 180;
      return this.gamutMap(L, c * Math.cos(rad), c * Math.sin(rad));
    });
    this._floorKey = key;
    return this._floorHexes;
  },

  /* ---- GEOMETRY ----------------------------------------------------------------------------
     How far the copy reaches from the stage centre — measured from the marks themselves (the
     statement block and the CTA), not from their padded container, so the field clears the ink. The
     h1 is measured rather than its [data-land-line] spans: those carry the reveal tween, and a
     measurement taken mid-reveal would bake a shifted hero into the geometry. DOM read: build and
     resize only, never in the tick. Unchanged from the ring formation — the hole is solved from the
     same number the radii were. */
  _heroReach() {
    // The gate's two buttons are marks too. They were not, so on a phone the formation was solved to
    // clear the heading and the sentence and then drawn straight through "Try an example" — it
    // cleared the words it was told about and sat on the one thing you are meant to press.
    // [data-glass-cta] does this job on desktop; [data-gate-actions] is its narrow twin.
    const marks = [...document.querySelectorAll('[data-landing] h1, [data-landing] p, [data-glass-cta], [data-gate-actions]')];
    if (!marks.length) return { x: 240, y: 100, r: 260 };            // pre-layout fallback: the 1280×720 measurement
    const cx = (window.innerWidth || 1440) / 2, cy = (window.innerHeight || 800) / 2;
    let dx = 0, dy = 0;
    marks.forEach((m) => {
      const b = m.getBoundingClientRect(); if (!b.width && !b.height) return;
      dx = Math.max(dx, Math.abs(b.left - cx), Math.abs(b.right - cx));
      dy = Math.max(dy, Math.abs(b.top - cy), Math.abs(b.bottom - cy));
    });
    /* BOTH HALF-EXTENTS, not just the corner. The ring formation only ever needed the corner, because
       a ring is round and the worst angle is the only one that matters. The field's hole is an
       ellipse and is solved from the block's actual shape: measured at 800×500 the copy is 222 wide
       by 94 tall from the centre, so a round hole clearing its corner opens to 241 and throws away
       every pixel of the top and bottom of the viewport. `r` is kept because the GAP is still solved
       against the worst angle — the copy needs the same clearance in every direction, it is only the
       hole itself that is not round. */
    return { x: dx || 240, y: dy || 100, r: Math.hypot(dx, dy) || 260 };
  },
  /* THE FIELD'S TWO RADII, SOLVED rather than configured. This is _ringGeom's job reduced to what a
     continuous field actually needs: where the gas starts, and where it has faded out.

       INNER — the copy's clear radius: _heroReach plus a gap that is a share of whatever half-span
         is left over once the copy has been paid for, floored and capped in PIXELS rather than in
         orb diameters, because there is no orb left to measure against. The floor keeps the gas off
         the words on a cramped viewport; the cap is why the hole does not open into a crater on a
         large one — the copy→formation gap grew without limit before FIELD_SPAN_MAX was added, and
         a fraction of a clamped span with a hard ceiling closes that for good.
       OUTER — the viewport's own half-diagonal with a little past it, so the disc runs off every
         edge instead of sitting on the page as a ring. It is NOT clamped by FIELD_SPAN_MAX: the rim
         is where the gas has finished, and finishing inside a wide viewport would put a visible
         circular edge on the artwork. The gas thins out to nothing there either way.

     NARROW IS THE ONE EXCEPTION, and it is bought rather than assumed. A 375px-wide gate leaves no
     radius that both clears the block and stays on screen, so on that one viewport geometry cannot
     win — which is why the gate carries a radial wash of the surface colour behind its copy. The
     wash is the ground; the hole is allowed to close in behind it, and the gas passes under the
     words dimmed rather than being pushed off the screen entirely. Desktop has no wash, and its
     guarantee stays absolute. */
  _fieldGeom(vw, vh) {
    const e = this._heroReach();
    const span = Math.min(Math.max(vw, vh) || 1440, this.FIELD_SPAN_MAX);
    const gap = Math.min(Math.max((span / 2 - e.r) * this.FIELD_GAP_FRAC, this.FIELD_GAP_MIN), this.FIELD_GAP_MAX);
    let ix = e.x + gap, iy = e.y + gap;
    // The hole follows the copy, but only so far: past FIELD_HOLE_ASPECT it stops being an ellipse
    // around a block and starts being a slot cut through the picture.
    iy = Math.max(iy, ix / this.FIELD_HOLE_ASPECT);
    ix = Math.max(ix, iy / this.FIELD_HOLE_ASPECT);
    if (this.state.narrow) {
      const cap = Math.min(vw, vh) * this.FIELD_NARROW_MUL;
      const k = Math.min(1, cap / Math.max(ix, iy));
      ix *= k; iy *= k;                                             // shrink the hole, keep its shape
    }
    /* The rim, as a multiple of the hole. Taken at the viewport's CORNER, so the gas has finished by
       the furthest point of the page and every edge is crossed well before that — which is the
       "runs off all four sides" the formation has always been drawn to do. Not clamped by
       FIELD_SPAN_MAX: that clamp exists to stop the HOLE opening into a crater on a large display,
       and applying it here would instead draw a circular edge inside the page. */
    const outN = Math.hypot((vw / 2) / ix, (vh / 2) / iy) * this.FIELD_RIM_MUL;
    return { ix, iy, outN, ox: ix * outN, oy: iy * outN, gap };
  },

  /* ---- THE PAINTED FLOOR -------------------------------------------------------------------
     One element, and it is a STILL OF THE SAME PICTURE rather than a different one. The old floor
     was a hundred-odd DOM orbs with five shading layers apiece — a second artwork that a visitor
     without WebGL saw instead of the first, and a build cost paid synchronously inside the arrival.
     A conic gradient through the same twelve stations, masked to the same annulus the field is
     solved to, is the honest floor: same wheel, same place, same hole.

     THE CONIC IS ALIGNED TO THE SHADER, which is why the angle arithmetic is here rather than a
     round number. CSS conic angles start at twelve o'clock and run clockwise; the shader reads hue
     off atan2 with the wheel's first station at the nine o'clock direction, running anticlockwise.
     Matching them costs one expression and buys the whole point of having a floor at all — the field
     arriving over it is a dissolve, not a swap. */
  _paintFloor(opacity) {
    const el = document.querySelector('[data-orbit-floor]');
    if (!el) return;
    const vw = window.innerWidth || 1440, vh = window.innerHeight || 800;
    const geom = (this._orbit && this._orbit.geom) || this._fieldGeom(vw, vh);
    const hexes = this._orbitFloorHexes(), n = hexes.length;
    const wheel = this._orbitWheel();
    /* hex[j] belongs at clockwise-from-noon angle 270 + 360*turn − (360/n)*j; listing the wheel
       backwards from that start is the same set of stops in the order CSS wants them.
       Exact on a round hole and approximate on an elliptical one — the shader spaces its hues evenly
       around the BAND, which on a wide hole is not the same as evenly around the protractor, and CSS
       has no conic that follows an ellipse. The drift is at most a few tens of degrees, between two
       soft layers at a quarter opacity, over a 0.8s crossfade; and where the floor is permanent
       there is nothing on screen for it to disagree with. */
    const from = (270 + 360 * wheel.turn) % 360;
    const step = 360 / n;
    const stops = [];
    for (let k = 0; k <= n; k++) stops.push(hexes[(n - (k % n)) % n] + ' ' + (k * step).toFixed(2) + 'deg');
    /* An ELLIPSE of the same two radii, with the stops written as percentages of it — which is how
       CSS makes one gradient describe both axes at once. The percentages are the field's own band
       fractions, so the floor rises out of the hole and fades at the rim in the same places. */
    const inPc = (100 / geom.outN).toFixed(2), fullPc = (100 / geom.outN * 1.35).toFixed(2);
    const mask = 'radial-gradient(ellipse ' + geom.ox.toFixed(0) + 'px ' + geom.oy.toFixed(0) + 'px at 50% 50%,'
      + ' transparent ' + inPc + '%, #000 ' + fullPc + '%, #000 62%, transparent 100%)';
    el.style.background = 'conic-gradient(from ' + from.toFixed(2) + 'deg at 50% 50%, ' + stops.join(',') + ')';
    el.style.webkitMaskImage = mask;
    el.style.maskImage = mask;
    /* OPACITY IS ONLY WRITTEN WHEN THE CALLER ASKS. The crossfade to and from the field is a tween on
       this exact property, and a re-solve on resize or a theme change happens while that tween is
       mid-flight often enough to matter: writing the resting value here would snap the floor back to
       full in the middle of its own dissolve, which is what it did. Callers that genuinely own the
       value pass it; everyone else leaves it where the crossfade put it. */
    if (opacity !== undefined) el.style.opacity = String(opacity);
    else if (!el.style.opacity) el.style.opacity = String(this._floorOpacity());
  },
  /** How strong the still is. It has two jobs and they want the same number: it is the crossfade
      partner the field dissolves over — so it should already be the picture — and it is the whole
      artwork where WebGL 2 never arrives. A quieter floor made the second job a whisper of a wheel
      nobody could read as one. */
  _floorOpacity() { return this.state.theme === 'dark' ? 0.5 : 0.42; },
  /* The air the field sits in: a wide, faint wash tinted off the wheel. It was the key light's bloom
     when there was a key light; there is no lamp in a volume, so what it does now is stop the
     surface reading as a flat plate behind the gas. Kept because that job was always the real one. */
  _paintBloom() {
    const bloom = document.querySelector('[data-orbit-bloom]');
    if (!bloom) return;
    const hexes = this._orbitFloorHexes();
    const warm = hexes[0], cool = hexes[Math.floor(hexes.length / 2)];
    bloom.style.background = 'radial-gradient(72% 62% at 34% 30%, ' + this.hexA(warm, 0.10) + ' 0%, transparent 68%),'
      + 'radial-gradient(66% 58% at 70% 74%, ' + this.hexA(cool, 0.09) + ' 0%, transparent 66%)';
  },
  // static film grain — unifies the gradients; generated once, tiled, never animated
  _paintGrain() {
    const grain = document.querySelector('[data-orbit-grain]');
    if (!grain || grain.style.backgroundImage) return;
    const gc = document.createElement('canvas'); gc.width = 96; gc.height = 96;
    const gx = gc.getContext('2d'); const gi = gx.createImageData(96, 96); const gd = gi.data;
    for (let q = 0; q < gd.length; q += 4) { const v = Math.floor(Math.random() * 256); gd[q] = gd[q + 1] = gd[q + 2] = v; gd[q + 3] = 255; }
    gx.putImageData(gi, 0, 0);
    grain.style.backgroundImage = 'url(' + gc.toDataURL() + ')';
  },

  /* ---- THE FIELD ---------------------------------------------------------------------------
     Can the volume run at all? WebGL 2 specifically: nebulaField.js's shader is GLSL 3 and it reads
     a 3D texture, neither of which WebGL 1 has. Probed once and cached — the answer cannot change
     within a visit.

     REDUCED MOTION IS NO LONGER A NO. It used to be, and the reason was population: the formation's
     orb COUNT was a function of whether the shaded renderer could run, so a reader who asked for
     less motion had to be given the smaller formation the painted floor was drawn around. A volume
     has no population. What reduced motion asks for is stillness, so it gets the same picture,
     rendered once and never again — which is a better answer than a different picture. */
  _fieldOK() {
    if (this._fieldSupported !== undefined) return this._fieldSupported;
    try {
      this._fieldSupported = !!document.createElement('canvas').getContext('webgl2');
    } catch (e) { this._fieldSupported = false; }
    return this._fieldSupported;
  },
  /* THE THEME NO LONGER OWNS AN EXPOSURE, and that is the point of the change above rather than a
     side effect of it. _fieldTheme() stood here and returned four figures per theme — gain, coverage,
     a Reinhard shoulder and a position in the tone ladder — every one of which existed to drag a
     ramp that pointed the wrong way back onto a dark page. Anchor the ladder to the surface and
     there is nothing left to drag: the same exposure produces the same contrast against the page in
     both themes, because the ladder is now symmetric about it. Verified as a true A/B — one visit,
     one wheel, one rotation, switched — and the two read as one artwork.
     The four figures live in nebulaField's LOOK now, once, where the rest of the look is. If a theme
     ever genuinely needs its own, this is the seam to put back; it is not one to keep empty. */

  /* LOADED ON DEMAND, and that is not an optimisation to be tidied away into a static import. The
     module pulls in three, which the build had kept entirely inside the 404's chunk — importing it
     at the top of this file put 130 kB gzipped of it in front of every landing visitor and doubled
     the landing's payload, on a page whose own headline is "In seconds." Dynamically, three stays a
     chunk that arrives AFTER the landing has painted, and the arrival is not a hole in the page: the
     painted floor is what the visitor is looking at until the field is ready to dissolve over it.

     Returns whether the field is up OR on its way — either answer means the caller should leave the
     floor alone rather than dressing it up as the permanent surface. */
  _initNebula() {
    if (!this._fieldOK() || this._nebula || this._fieldPending) return false;
    this._fieldPending = true;
    import('../nebulaField.js').then(
      (m) => { this._fieldPending = false; this._buildNebula(m.createNebulaField); },
      () => { this._fieldPending = false; },
    );
    return true;
  },
  _buildNebula(createNebulaField) {
    if (!this._landingUp() || this._nebula) return false;
    const host = document.querySelector('[data-orbit]');
    if (!host) return false;

    const cv = document.createElement('canvas');
    cv.setAttribute('data-orbit-field', '1'); cv.setAttribute('aria-hidden', 'true');
    // z-index 1: over the bloom and the floor, under the copy (2), the vignette (3) and the grain
    // (4). The canvas is the whole stage, so anything meant to sit above the gas sits above it too.
    cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;z-index:1;pointer-events:none;opacity:0;';
    host.appendChild(cv);

    const vw = window.innerWidth || 1440, vh = window.innerHeight || 800;
    const geom = (this._orbit && this._orbit.geom) || this._fieldGeom(vw, vh);
    const field = createNebulaField(cv, this._orbitRampData(), {
      innerX: geom.ix,
      innerY: geom.iy,
      outN: geom.outN,
      hue: this._orbitWheel().turn,
    });
    if (!field) { try { cv.remove(); } catch (e) { } return false; }

    this._nebula = field; this._fieldCanvas = cv;
    field.onContextLost(() => this._dropNebula());

    // First frame before anything is faded: a canvas that arrives empty and then fills is a flash of
    // the floor showing through the thing that is supposed to be covering it.
    field.setMark(this._markBox());
    /* The look panel, on `?tune` and in dev only — see nebulaField.attachTuner. The callback is what
       keeps the two surfaces honest while somebody is dragging sliders: the floor is painted from the
       same wheel, and a tuned field over an untuned floor would be two pictures again. */
    if (import.meta.env.DEV && /(^|[?&])tune(=|&|$)/.test(window.location.search)) {
      field.attachTuner(() => { if (this._floorLive()) this._paintFloor(); });
      window.atmosField = field;   // the same handle from a console, for anything the panel has no slider for
    }
    field.renderStill(this._orbit ? this._orbit.rot : 0);
    this._revealField();
    if (this._orbit && this._orbit.active) this.playOrbit();
    return true;
  },
  /* The dissolve. The floor and the field are the same wheel at the same radii, so this is a
     crossfade between two states of one picture rather than a swap between two pictures — which is
     the whole reason the floor was drawn to match. Nothing arrives instantly here; an instant swap
     at this size reads as a bug even when it is a success. */
  _revealField() {
    const cv = this._fieldCanvas, floor = document.querySelector('[data-orbit-floor]');
    if (!cv) return;
    const g = window.gsap;
    if (!g || this._reduce) {
      cv.style.opacity = '1';
      if (floor) floor.style.opacity = '0';
      return;
    }
    const dur = this.DUR ? this.DUR.overlay : 0.8;
    const ease = this.EASE ? this.EASE.standard : 'power2.out';
    g.to(cv, { opacity: 1, duration: dur, ease });
    if (floor) g.to(floor, { opacity: 0, duration: dur, ease });
  },
  _tearDownNebula() {
    if (!this._nebula) return false;
    try { this._nebula.destroy(); } catch (e) { }
    try { this._fieldCanvas.remove(); } catch (e) { }
    this._nebula = null; this._fieldCanvas = null;
    return true;
  },
  /* Context loss. The floor is still mounted and still holds the same wheel — it was only faded out
     — so handing it back is one opacity write and one re-solve, and the page keeps a landing. */
  _dropNebula() {
    if (!this._tearDownNebula()) return;
    // Nothing is moving any more, so the ticker comes off with the field. Left on, it would advance
    // the shared angle into an object that no longer exists for as long as the landing stays open.
    const o = this._orbit;
    if (o && o.added && window.gsap) { try { window.gsap.ticker.remove(o.tick); } catch (e) { } o.added = false; }
    const floor = document.querySelector('[data-orbit-floor]');
    this._paintFloor();
    if (!floor) return;
    const g = window.gsap;
    const target = this._floorOpacity();
    if (!g || this._reduce) { floor.style.opacity = String(target); return; }
    g.to(floor, { opacity: target, duration: this.DUR ? this.DUR.overlay : 0.8, ease: this.EASE ? this.EASE.standard : 'power2.out' });
  },
  /** The theme switch can be reached with the landing still behind it — the logo returns here at any
      time. Both surfaces answer, and neither is rebuilt: the ramp is theme-independent by design. */
  refreshOrbitTheme() {
    if (this._nebula) {
      /* The RAMP: the ladder is solved against the page, so the wheel itself is different on the
         other theme rather than the same wheel at a different exposure. Rebuilding it is 8192 gamut
         maps — about 10ms, on a switch the reader asked for — and the wheel's per-visit rotation is
         untouched, so the colour does not jump round the ring on the way.
         TODAY THIS IS A BELT AND BRACES. The only control that flips the theme lives in the tool,
         and the way back to the landing from there is the logo, which kills the stage and rebuilds
         it against the new page anyway. That is an accident of where the switch happens to sit, not
         a property of this module, and a landing that answers the theme only because something else
         tore it down first is one route change away from being wrong. */
      this._nebula.setRamp(this._orbitRampData());
      if (this._reduce) this._nebula.renderStill(this._orbit ? this._orbit.rot : 0);
    }
    // The floor is the same wheel and answers to the same switch, whether or not it is the surface
    // currently on screen — it is what a lost context would hand back.
    this._paintFloor(this._floorLive() ? this._floorOpacity() : undefined);
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
    if (this._orbit) {   // already built — repainting here would orphan the field and the crossfade
      const g0 = window.gsap;
      if (g0 && !this.state.showLoader && !this._wipeRunning) this._landingTextReveal(g0);
      return;
    }
    /* Floor first, in every case and before anything asynchronous is asked for. It is one element
       and three style writes, so there is no arrival cost worth deferring, and it is what the
       visitor looks at while three is still on the wire. */
    this._paintFloor(this._floorOpacity());
    this._paintBloom();
    this._paintGrain();
    const fieldUp = this._initNebula();

    /* ============================== MOTION CONTRACT — DO NOT MODIFY ==============================
       AMENDED (volumetric field): this supersedes the concentric-ring contract, which superseded the
       scatter field, which superseded the choreographed cylinder. Every clause below that reads the
       same as its predecessor reads the same ON PURPOSE — the medium changed, the motion model did
       not. As before: any pass touching this module must leave these layers byte-identical unless a
       brief explicitly amends the contract again.

       WHAT IS RETIRED IN FULL, so nobody restores half of it: the three rings and their populations,
       the per-orb angular formula, ring direction multipliers, ring parallax dressing (size, blur,
       opacity, brightness, saturate, z), the per-orb vertical float, the one global room lamp and
       every directional cue derived from it (terminator, specular, fresnel rim, drop shadow, env
       reflection, sheen), the orb tile textures and the living-gradient blobs inside them, and the
       per-orb WebGL renderer with its context budget. The formation is one volume now. None of the
       above has an equivalent in it, and faking one would be a second owner of the same picture.

       1. THE HOLE IS THE CONTRACT. _heroReach() measures the copy's marks; _fieldGeom() turns that
          into `inner`, the radius inside which there is no gas. The shader is set up so one
          mid-plane unit is one `inner` on the screen, which makes "density is zero below world
          radius 1" and "nothing within `inner` pixels of the centre" the same statement — the
          guarantee holds at every viewport without a second solve and cannot drift. The cursor may
          displace gas but the radial mask is taken from the UNDISPLACED radius, so nothing the
          reader does can push the field onto the words. Desktop has no wash behind the copy and is
          not to be given one; the geometry is the guarantee. Narrow is the single exception and it
          is bought, not assumed — see _fieldGeom.
       2. ONE CLOCK. One `rot`, advanced by ONE ticker: rot += (360/FIELD_ROT_SECS)·dt, linear,
          continuous, FIELD_ROT_SECS = 105 — the ring set's own figure, kept, because the speed the
          formation turns at is the landing's tempo and not a property of what is turning. The field
          integrates NO rotation of its own; it is handed `rot` every frame and does nothing with
          time but advance the noise field's slow churn.
       3. ROTATION IS RIGID. The disc turns as one body: the twist is a fixed function of radius
          added to the shared angle, so the spiral holds its shape forever. Differential rotation —
          inner faster, which is what a real disc does and what the reference this grew from does —
          is banned here, and the reason is the landing rather than the physics: it winds up without
          bound, so a page left open for two minutes is a different picture from the one that
          arrived, and neither the reader nor the next person to open the file can tell that was
          intended. Life comes from the noise field evolving in place, which has no geometry to
          destroy. Do not "fix" the arms by making the inner radius faster.
          THE MID-PLANE WARP IS FIXED IN SCREEN SPACE and is NOT carried round by `rot`. It stands in
          for the angle the disc is being looked at from — a camera does not orbit its subject — so
          the near half of the ring stays the near half while the gas turns through it.
       4. GEOMETRY (_fieldGeom) — two radii, SOLVED, not configured. inner = _heroReach() + gap,
          where gap = clamp((span/2 − reach)·FIELD_GAP_FRAC, FIELD_GAP_MIN, FIELD_GAP_MAX) and
          span = min(max(vw,vh), FIELD_SPAN_MAX). outer = the viewport half-diagonal ·FIELD_RIM_MUL,
          deliberately UNCLAMPED: the rim is where the gas has finished, and a clamped rim would draw
          a circular edge inside a wide viewport. Both bounds on the gap are in pixels rather than in
          orb diameters because there is no orb left to measure against. Recomputed on resize AND
          whenever the hero's own box changes, which is not the same event — see o.reachWatch.
       5. THE FIELD DOES NOT ANSWER TO THE POINTER. TOMBSTONE, not an omission: this clause held a
          two-layer cursor interaction — a local advection that parted the gas around the pointer and
          closed it behind, carrying pointer speed in its tangential term, and a global 16px lean of
          the whole field toward it. Both were built, both worked, and both were removed by request.
          The landing has exactly one thing to do with a pointer and it is the CTA. Nothing is left
          disabled behind a flag: the uniforms, the listeners and the accessor went with the clause
          (see nebulaField.js's own tombstone), so the surface holds no pointer state at all. If an
          interaction is ever wanted here it is a contract amendment and a fresh design, not a
          switch to flip.
       6. FLOOR FIRST, AND THE FLOOR IS THE SAME PICTURE. The painted annulus is solved to the same
          two radii off the same twelve stations, aligned to the same angle, so the field arriving is
          a crossfade within one image. No WebGL 2 leaves the floor up permanently; a lost context
          fades it back. Reduced motion gets the field STILL — one frame, no ticker, no cursor —
          because what was asked for is stillness, not a different artwork.
       7. THE FIELD IS SAMPLED IN POLAR SPACE — angle, height, radius — and the number of repeats per
          turn is a WHOLE NUMBER. Cartesian noise is isotropic and comes back as blobs; a rotating
          disc contains arcs, and sampling in the coordinates it actually turns in is what produces
          them. The whole number is what makes the seam at the back of the ring not exist. The
          vertical axis is read at two scales for one reason and it is written where they are: a
          48-step march cannot resolve fine vertical detail, and what it cannot resolve comes back as
          a woven crosshatch rather than as texture.
       8. THE COLOUR IS THE APP'S OKLCH, and it is baked rather than approximated. Every pixel of the
          ramp goes through gamutMap, chroma walked down where sRGB cannot hold it. Hue is read off
          the SCREEN angle, so the wheel stands still against the words and revolves as one body
          while the gas swirls through it; each of the twelve stations owns exactly one twelfth of
          it, which is the property twelve orbs walking one revolution used to hold. The wheel is
          ROTATED per visit, never shuffled.
       ACCEPTANCE: a turning disc of colour with the brand copy in a clear hole at its centre; the
       hole holds at every viewport and through a full resize drag, and no gas ever crosses onto the
       words; the wordmark keeps thinner air behind it than the gas around it; the whole spectrum is present around the copy at once and travels round it
       continuously, with no seam where the wheel closes; the disc runs off every edge rather than
       sitting on the page as a ring; the gas reads as pigment on the light theme and as light on the
       dark one, from the same shader; the cursor parts the gas it passes through and it closes
       behind; the field leans toward the cursor without ever reading as sliding; no WebGL 2 = the
       painted annulus, standing still, in the same place; reduced motion = the field, standing
       still. ============================================================================================ */
    const o = {
      active: false, rot: 0, t: 0, rotSpeed: 360 / this.FIELD_ROT_SECS,
      vw: window.innerWidth || 1440, vh: window.innerHeight || 800,
    };
    o.geom = this._fieldGeom(o.vw, o.vh);

    // Everything per-viewport, in one place. Runs on build, on resize, and when the hero's box
    // settles; after it the tick writes nothing but the shared angle.
    const dress = () => {
      if (this._nebula) {
        this._nebula.setGeom(o.geom.ix, o.geom.iy, o.geom.outN);
        this._nebula.setMark(this._markBox());
      }
      // The floor is only re-solved while it is still the thing on screen. Once the field has
      // dissolved over it, repainting a mask nobody can see is a style write per resize frame.
      if (!this._nebula || this._floorLive()) this._paintFloor();
    };
    o.dress = dress;
    this._orbit = o;
    dress();

    /* Re-solve when the HERO changes size, not only when the viewport does.
       §4's radii are built on _heroReach(), which is a DOM measurement, and the tick re-derives the
       geometry on a viewport change and on nothing else — so a reach taken before the copy has its
       final box is the reach the field keeps for the entire visit, with no event that will ever
       correct it. Measured on this machine the reach is 213 at build and 263 once the webfont has
       landed: a 50px error in the hole, silently kept, on the one number the copy's legibility
       depends on. The marks' own box changing IS the signal that the reach is stale, and watching
       them catches the font swap, a late reflow and a copy change alike, where a one-shot
       fonts.ready would only catch the first. src/notfound/main.js follows its heading for exactly
       this reason. The first callback fires immediately on observe and re-solves with the numbers we
       already have, which is harmless — dress() is idempotent. */
    const reachMarks = [...document.querySelectorAll('[data-landing] h1, [data-landing] p, [data-glass-cta]')];
    if (reachMarks.length && typeof ResizeObserver !== 'undefined') {
      o.reachWatch = new ResizeObserver(() => {
        if (this._orbit !== o) return;               // a rebuilt stage owns its own observer
        o.geom = this._fieldGeom(o.vw, o.vh);
        dress();
        if (this._nebula && this._reduce) this._nebula.renderStill(o.rot);
      });
      reachMarks.forEach((m) => o.reachWatch.observe(m));
    }

    /* Reduced motion stops here: the field renders one frame when it lands (_buildNebula) and the
       floor stands still under it. No ticker is added, so there is nothing to play or pause. */
    if (this._reduce) return;

    const g = window.gsap;
    if (!g) {
      // No GSAP yet. Give the stage back whole — the observer with it, or fifty retries leave fifty
      // live ResizeObservers on the same three marks — and try again; the field's own chunk is
      // already in flight and will find no _orbit to play, which the next pass corrects.
      this._orbitRetry = (this._orbitRetry || 0) + 1;
      if (o.reachWatch) { try { o.reachWatch.disconnect(); } catch (e) { } o.reachWatch = null; }
      this._orbit = null;
      if (this._orbitRetry < 50) setTimeout(() => this.initOrbit(), 100);
      return;
    }
    // reveal only when the landing is actually visible — under the loader or wipe cover the
    // covering timeline fires the reveal itself at its uncover moment
    if (!this.state.showLoader && !this._wipeRunning) this._landingTextReveal(g);

    // ONE ticker, ONE rotation value, and it is the ONLY thing the tick advances. The field derives
    // everything else from it, so there is no integrator anywhere that can drift.
    o.tick = (time, deltaMS) => {
      if (!o.active) return;
      const dt = Math.min(0.05, (deltaMS || 16.7) / 1000);   // clamp: a stalled tab must not jump the field
      const vw = window.innerWidth || 1440, vh = window.innerHeight || 800;
      if (vw !== o.vw || vh !== o.vh) { o.vw = vw; o.vh = vh; o.geom = this._fieldGeom(vw, vh); dress(); }
      o.rot = (o.rot + o.rotSpeed * dt) % 360;               // the one shared angle, ease:'none' by construction
      o.t += dt;
      if (this._nebula) this._nebula.update(dt, o.rot);
    };
    this.playOrbit();
    // _landingLit, not _landingUp: coming back to the tab with an example open should not restart the
    // field behind the panel covering it. The two questions are separate — see PaletteApp.
    if (!this._orbitVis) { this._orbitVis = () => { if (document.hidden) this.pauseOrbit(); else if (this._orbit && this._landingLit()) this.playOrbit(); }; document.addEventListener('visibilitychange', this._orbitVis); }
  },
  /* The wordmark's box, in the field's scene coordinates — centred, y counting up. It is fixed at
     the top of the stage, well outside the hole, and it is the one other mark on this surface whose
     legibility the field can take away; see the shader's second-mark term for why difference
     blending is not enough on its own. Generous and soft rather than tight: a clearing the size of
     the box would be a cut-out, and what is wanted is thinner air. Measured here rather than in the
     shader for the same reason the hero's box is — a DOM read belongs to build and resize. */
  _markBox() {
    const el = document.querySelector('[data-logo]');
    if (!el) return null;
    const b = el.getBoundingClientRect();
    if (!b.width && !b.height) return null;
    const vw = window.innerWidth || 1440, vh = window.innerHeight || 800;
    return {
      x: (b.left + b.right) / 2 - vw / 2,
      y: -((b.top + b.bottom) / 2 - vh / 2),
      rx: b.width * 0.95 + 40,
      ry: b.height * 1.7 + 34,
    };
  },
  /** Is the painted floor still the thing on screen? True until the field has dissolved over it. */
  _floorLive() {
    const el = document.querySelector('[data-orbit-floor]');
    return !!el && parseFloat(el.style.opacity || '1') > 0.001;
  },
  playOrbit() {
    const o = this._orbit; if (!o || this._reduce || !o.tick) return;
    o.active = true;
    // The ticker is added only once there is something for it to drive. Before the field's chunk
    // lands there is nothing moving on this stage, and a rAF that runs to do nothing is a rAF.
    if (!o.added && window.gsap && this._nebula) { window.gsap.ticker.add(o.tick); o.added = true; }
  },
  // hidden tab / dismissed landing: the shared angle stops advancing, so nothing runs
  pauseOrbit() {
    const o = this._orbit; if (!o) return;
    o.active = false;
  },
  killOrbit() {
    this._landRevealed = false;
    this._tearDownNebula();
    // per-visit seeds and bakes — a return to the landing re-rolls the wheel and re-reads the theme
    this._wheel = null; this._rampData = null; this._rampKey = null;
    this._floorHexes = null; this._floorKey = null;
    this._surfLab = null; this._surfKey = null;
    const o = this._orbit;
    if (o) {
      o.active = false;
      if (o.added && window.gsap) { try { window.gsap.ticker.remove(o.tick); } catch (e) { } }
      if (o.reachWatch) { try { o.reachWatch.disconnect(); } catch (e) { } o.reachWatch = null; }
      this._orbit = null;
    }
    if (this._orbitVis) { document.removeEventListener('visibilitychange', this._orbitVis); this._orbitVis = null; }
  },
};
