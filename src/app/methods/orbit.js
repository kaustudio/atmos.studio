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

import { rgb2oklab, gamutMap, hexToRgb } from '../../lib/color.js';

/* THE FIGURES THE PALETTE WHEEL IS BUILT WITH — gathered here, next to the authored stations they
   replace, for the same reason nebulaField's LOOK is gathered: every one was looked at against the
   eight examples rather than derived, so they are named and movable instead of buried in the
   derivation. The geometry figures stay in PaletteApp with the rest of the stage's dimensions;
   these are colour, and colour lives with the stations. */
const PAL = {
  /** Below this OKLab chroma a swatch's hue angle is noise (reading.js calls the same floor
      CHROMA_FLOOR at the same value). Such a swatch keeps its chroma and borrows the palette's
      dominant hue, rather than being dropped: a washed cream holding three quarters of High Key IS
      that palette, and throwing it away would leave the field reading as the accent.
      `greyTrust` is where that stops being a cliff. A swatch just above the floor has a hue that is
      barely more trustworthy than one just below it, and the fan multiplies exactly that error:
      Frozen Slate's 1.6% slate at chroma 0.025 was opened into a magenta arc off a hue angle that
      was mostly rounding. Between the two figures a swatch's offset from the dominant hue is scaled
      by how much of a hue it actually has, so the step becomes a ramp and the fan only amplifies
      what was really measured. */
  greyFloor: 0.02,
  greyTrust: 0.06,
  /** THE FAN. The least arc, in degrees, the palette's hues are opened out to. Garnet's five sit
      inside TWELVE DEGREES of each other — true to the photograph, and as a wheel it is one flat
      note with nothing to travel through; the field came back a single terracotta wash that could
      have been read off any warm picture. Fanning the offsets from the dominant hue opens that into
      a red-through-orange sweep that is still unmistakably Garnet: the palette decides WHERE on the
      wheel it sits and in what order, this decides that there is a wheel at all. Palettes already
      wider than this are not touched — `fan` bottoms out at 1.

      AND THE FAN IS CAPPED IN DEGREES, NOT ONLY IN RATIO, which is the whole difference between a
      spread and an invention. A multiplier moves the OUTERMOST swatch furthest, so at 5x Garnet's
      one deep red 9° off the centre landed at 47° — a gold sector in a field of reds, a colour
      nobody photographed. `addMax` is the most degrees the fan may ADD to a swatch's own offset, so
      the amplification is bounded wherever it is largest and the palette's true spacing survives
      underneath it. A wide palette (fan = 1) adds nothing and is untouched by this too.

      MEASURED, ACROSS ALL EIGHT SEEDS, and this is the acceptance test for any change to these
      three figures: no derived station lands more than 20° from a hue that is actually IN its
      palette, and six of the eight stay inside 16°. The one 20° is Ruled Open Country's near-black,
      which is under the grey floor and therefore sits at the dominant hue by rule rather than by
      fan. Before the cap the worst was 49°. */
  spanMin: 40,
  fanMax: 3.2,
  addMax: 16,
  /** CHROMA IS SCALED, NOT NORMALISED, and the exponent is the whole argument. Mapping every
      palette's loudest swatch onto one target would make Midfield's restrained blues shout exactly
      as loudly as Garnet's reds, which is the one thing the eight examples differ in most. Raising
      the correction to `soft` applies a fraction of it: a quiet palette is lifted enough to survive
      being drawn as thin gas, a loud one is brought down enough not to scream, and the gap between
      them survives. `top` is where the authored wheel's loudest station already sits. */
  cTop: 0.135,
  cSoft: 0.6,
  cGainMin: 0.55,
  cGainMax: 3.2,
  /** The ceiling no station clears, whatever the gain did. Past this the gas stops reading as
      pigment suspended in the page and starts reading as a filter laid over it. */
  cMax: 0.17,
  /** HOW MUCH OF THE WHEEL A SWATCH IS OWED. 0 gives every swatch an equal share, 1 gives it exactly
      the share it holds in the palette. The app already has one rule for this — swatchGrow, which
      the list strip, the detail bands and the 3D card all read — and the wheel honours it by
      more than half so that a palette carrying three quarters of one colour LOOKS like it does,
      while a 4% accent still gets an arc you can see rather than a hairline. */
  weightBias: 0.55,
  shareMin: 0.5,          // x the even share: the floor under the smallest arc
  /** Which harmony the tonal ladder wears, by how wide the fanned wheel already is. Only the two
      ANALOGOUS patterns are reachable from a palette, and that is a rule rather than a shortlist:
      splitAccent, compAccent and triadAccent each put a complement in the mid-dark, which is exactly
      the colour a palette-derived field must not contain — "based on Garnet" cannot mean a teal
      nobody photographed. A narrow wheel takes the wider drift so the ladder carries the interest
      the wheel is not carrying; a broad one takes the tighter, because the wheel already has it. */
  harmSplit: 70,
  /** The gamut lift, as a function of hue rather than a per-station figure. Yellow and yellow-green
      carry their chroma high and go olive on a ramp that suits blue — the authored table states this
      three times (58° +0.03, 88° +0.06, 118° +0.04) and this is the same curve, continuous, so a
      palette landing anywhere in that arc gets the same correction. */
  liftPeak: 0.06,
  liftHue: 88,
  liftSpan: 60,
};

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

  /* ---- THE WHEEL THE FIELD ACTUALLY WEARS ---------------------------------------------------
     THE LANDING IS A READING OF ONE OF THE EIGHT EXAMPLES, chosen per visit, and the twelve authored
     stations above are what it falls back to. This is an amendment to §8 of the contract below and
     it is written there too; the short version is that the field used to be a demonstration of the
     hue wheel and is now a demonstration of the PRODUCT — what this tool does to a photograph, at
     the size of the whole screen, before a word of the page has been read. A visitor who arrives
     twice sees two different landings because the tool returns two different palettes, which is the
     truest thing the front page can say about it.

     WHAT IS GIVEN UP, stated so nobody restores half of it by accident: the whole spectrum is no
     longer present around the copy at once. Garnet is a red field. High Key is a pale one. That was
     §8's acceptance criterion and it is deliberately spent — the twelve stations were an authored
     wheel that no palette in the archive matches, and a landing that shows every hue is a landing
     that shows none of the tool's actual output. Everything else §8 protects is kept exactly:
     neighbouring gas is neighbouring hue, each station owns a contiguous arc, the wheel closes with
     no seam, every pixel still goes through gamutMap, and the tonal ladder is still solved against
     the page rather than taken from the photograph.

     WHICH PALETTE. Held on the instance rather than in state so the ramp can be baked synchronously
     inside initOrbit; mirrored into state by _setFieldPalette for the credit under the footer.
     Cleared by killOrbit alongside the wheel's rotation, so a return to the landing re-rolls both.
     The live archive leads and the seed table is the floor, so a reader whose storage is blocked
     still gets a wheel. IT CANNOT TELL BLOCKED FROM EMPTIED, and that is a known limit rather than
     an oversight: deleting all eight examples reaches the same branch as storage refusing to load
     them, so the footer would credit a record the archive no longer holds, with a bundled thumbnail.
     Distinguishing them needs a reseed signal the feed does not carry. The alternative — no wheel
     at all — costs every storage-blocked visitor the landing to spare one reader who deleted the
     whole example set a stale name. */
  _fieldPool() {
    const live = this._examples ? this._examples() : [];
    if (live.length) return live;
    // makeSeed() is the same eight, freshly built — it reads no storage, so this survives the one
    // case _examples() cannot cover. Cached because it allocates forty swatches and converts them.
    if (!this._seedPool) { try { this._seedPool = this.makeSeed(); } catch (e) { this._seedPool = []; } }
    return this._seedPool;
  },
  _fieldPalette() {
    const pool = this._fieldPool();
    if (!pool.length) return null;
    let p = this._fieldPalId ? pool.find((x) => x.id === this._fieldPalId) : null;
    /* THE FIRST PICK IS RANDOM ON DESKTOP AND FOLLOWS THE STORY ON A PHONE, and the asymmetry is
       the surface rather than a preference. The desktop landing says nothing about which palette it
       is showing except the credit under the footer, so a different one per arrival is free variety
       — the front page demonstrating that the tool returns a different reading of every picture.
       A phone's front page is the STORY, whose first chapter is transparent onto this very field and
       whose copy names its case out loud two screens later ("Atmos reads Dry Season from a
       photograph"). A field rolled independently of that would have the words and the artwork
       describing two different palettes on one screen, which is not variety, it is a bug. So on
       narrow the story's case leads, and every later change to it comes through setFieldPalette. */
    if (!p && this.state.narrow && this._storyCase) {
      const st = this._storyCase();
      if (st) p = pool.find((x) => x.id === st.id) || null;
    }
    if (!p) p = pool[Math.floor(Math.random() * pool.length)];
    this._fieldPalId = p.id;
    return p;
  },
  /* THE GAMUT LIFT AS A CURVE. See PAL.liftPeak — the authored table's three dL figures, restated as
     a function of hue so a palette landing between them gets the correction they describe rather
     than the nearest one's. Triangular rather than a cosine because the three figures it has to
     reproduce are themselves linear in distance from the peak. */
  _hueLift(H) {
    const d = Math.abs(((H - PAL.liftHue + 540) % 360) - 180);
    return d >= PAL.liftSpan ? 0 : PAL.liftPeak * (1 - d / PAL.liftSpan);
  },
  /* THE WHEEL, BUILT OUT OF A PALETTE. Returns the same station shape `list` holds — H, C, an
     optional dL and a harmony key — plus a `share` of the wheel, or null if the palette has no
     colour in it to build one from.

     WHAT IS TAKEN FROM THE PALETTE AND WHAT IS NOT. Hue, chroma and proportion are taken. LIGHTNESS
     IS NOT, and that one line is what keeps the artwork legible: the tonal ladder is solved against
     `--surface` (see _ladder), which is what makes the thinnest gas dissolve into the page in both
     themes. A palette's own five lightnesses are authored against a photograph — Garnet opens on
     L 0.09 and High Key on L 0.93 — and dropping either set in here would put the near end of the
     ladder on the wrong side of the page. So a palette supplies WHICH COLOURS the field is made of;
     the page still decides how far from itself they stand. That is also why one shader serves both
     themes with one exposure, which is the property this must not spend.

     THE DOMINANT HUE IS SUMMED AS A VECTOR, not averaged as an angle: Garnet's swatches sit at 28°
     and 355°, whose arithmetic mean is 191° — the opposite side of the wheel from every colour in
     the palette. Weighted by area x chroma, which is analysePalette's own weighting for the same
     question, so the landing and the reading agree about what colour a palette mostly is. */
  _paletteStations(p) {
    const sw = (p && p.swatches) || [];
    if (sw.length < 2) return null;
    const DEG = 180 / Math.PI;
    const parts = sw.map((s) => {
      const a = +s.a || 0, b = +s.b || 0;
      let H = Math.atan2(b, a) * DEG; if (H < 0) H += 360;
      return { C: Math.hypot(a, b), H, w: Math.max(+s.weight || 0, 0) };
    });
    let vx = 0, vy = 0;
    parts.forEach((q) => {
      if (q.C <= PAL.greyFloor) return;
      const r = q.w * q.C, t = q.H / DEG;
      vx += r * Math.cos(t); vy += r * Math.sin(t);
    });
    if (!vx && !vy) return null;      // a wholly achromatic palette has no wheel in it
    let domH = Math.atan2(vy, vx) * DEG; if (domH < 0) domH += 360;
    // The greys join the wheel at the dominant hue rather than at their own noise angle: they keep
    // their (tiny) chroma and their share, so they read as the near-neutral the palette actually
    // holds instead of as a stray hue nobody photographed.
    parts.forEach((q) => { if (q.C <= PAL.greyFloor) q.H = domH; });
    // Offset from the dominant hue, scaled by how much hue the swatch actually has — see greyTrust.
    parts.forEach((q) => {
      const conf = Math.max(0, Math.min(1, (q.C - PAL.greyFloor) / (PAL.greyTrust - PAL.greyFloor)));
      q.d = (((q.H - domH + 540) % 360) - 180) * conf;
    });
    let lo = Infinity, hi = -Infinity, maxC = 0, totW = 0;
    parts.forEach((q) => { lo = Math.min(lo, q.d); hi = Math.max(hi, q.d); maxC = Math.max(maxC, q.C); totW += q.w; });
    const span = hi - lo;
    const fan = Math.min(PAL.fanMax, Math.max(1, PAL.spanMin / Math.max(span, 1)));
    const gain = Math.min(PAL.cGainMax, Math.max(PAL.cGainMin, Math.pow(PAL.cTop / Math.max(maxC, 1e-4), PAL.cSoft)));
    // Ascending signed offset, so consecutive stations are consecutive hues and the one long step is
    // the wheel closing — which the ramp walks the short way round, back through the same arc. A
    // palette does not contain a full revolution and the wheel does not invent one for it.
    const open = (d) => d + Math.max(-PAL.addMax, Math.min(PAL.addMax, (fan - 1) * d));
    /* The harmony is chosen off the wheel that will actually be drawn — open(hi) − open(lo), not
       span × fan. Those two are only equal while the fan is unbounded, and it is not: addMax bites
       hardest on exactly the outermost swatch, which is the one the raw product was measuring. They
       agree on all eight seeds today; they would not on a palette with one far outlier, which is the
       case this term exists to answer. */
    const k = (open(hi) - open(lo)) < PAL.harmSplit ? 'analogWide' : 'analogTight';
    const n = parts.length, even = 1 / n;
    return parts.slice().sort((x, y) => x.d - y.d).map((q) => {
      const H = ((domH + open(q.d)) % 360 + 360) % 360;
      const w = totW > 0 ? q.w / totW : even;
      return {
        H,
        C: Math.min(PAL.cMax, q.C * gain),
        dL: this._hueLift(H),
        k,
        share: Math.max(even * PAL.shareMin, even + (w - even) * PAL.weightBias),
      };
    });
  },
  /* THE ONE WHEEL EVERY SURFACE READS — the ramp, the painted floor and the bloom. Stations arrive
     with a `share`; this is where those become CONTIGUOUS ARCS, normalised and given a start `at`,
     so the three readers cannot disagree about where a colour sits. The authored twelve come through
     here too, at an even twelfth each, which reproduces the old wheel exactly.
     Memoised on the palette rather than on the theme: nothing in a station answers to the surface —
     the ladder does, and that is applied per ROW when the ramp is baked. */
  _wheelStations() {
    /* THE PALETTE IS RESOLVED BEFORE THE KEY IS READ, for the reason its two readers state at
       length: _fieldPalette PICKS on its way through, so a key taken first is stamped with the empty
       id the wheel was not built from. Unreachable today — _ensureFieldPalette is initOrbit's first
       statement, and setFieldPalette assigns the id before anything asks — and the worst it could do
       is one redundant rebuild returning identical stations. It matches its siblings anyway: three
       memos keyed off one id should not be ordered three different ways. */
    const S = this._orbitStations();
    const list = this._paletteStations(this._fieldPalette())
      || S.list.map((s) => ({ ...s, share: 1 / S.list.length }));
    const key = this._fieldPalId || '';
    if (this._wheelList && this._wheelKey === key) return this._wheelList;
    let tot = 0; list.forEach((s) => { tot += s.share; });
    if (!(tot > 0)) tot = list.length;
    let run = 0;
    list.forEach((s) => { s.share = s.share / tot; s.at = run; run += s.share; });
    this._wheelList = list; this._wheelKey = key;
    return list;
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

     COLUMNS ARE STATIONS, NOT DEGREES, AND A STATION'S ARC IS ITS SHARE. The authored twelve take an
     even twelfth each — the property the orb formation had when twelve orbs walked one revolution,
     and the reason the twelve moods stay legible as twelve. A palette's stations take the share
     _paletteStations gave them, which is most of the way to the proportion the swatch holds in the
     palette: three quarters of High Key is one washed cream, and three quarters of the wheel is what
     that has to look like. Both walk the same cumulative `at`, so there is one rule, not two.

     HUE IS INTERPOLATED THE SHORT WAY ROUND, as a signed delta wrapped into ±180 rather than by
     adding a turn to the ascending pair. The old form assumed a wheel whose stations climb through
     360° and close once, which the twelve do and a palette's five do not — the closing step of a
     palette wheel runs BACKWARDS through the arc it just crossed. The delta form is the general
     statement of the same rule and reproduces the authored wheel exactly (30→58 is +28, 355→30 is
     +35), so nothing about the fallback moved.

     THAT IS MEASURED, NOT ASSERTED: the old index walk and this share walk were baked side by side
     over the twelve authored stations and compared byte for byte — 0 of 32768 bytes differ, in BOTH
     wheel directions. The interesting edge is dir < 0 at x = 0, where u lands exactly on 1: the old
     form wrapped to station 0 at f = 0 and this one holds station 11 at f = 1, which are the same
     colour because every term — hue, chroma, dL and both harmony blends — is interpolated to its
     endpoint. Re-run that comparison before changing anything in this loop.

     256x32 with a linear filter, which is finer than gas can show. 8192 gamut maps — measured at 6ms
     warm and 9ms cold. It used to be paid once per landing arrival, inside a module already off the
     critical path, and that sentence stood here after it had stopped being true: a reader can change
     the palette now, and each change invalidates this memo. It is still never paid on a frame that
     matters, but the reason is different and it lives in setFieldPalette rather than here — the
     rebuild is deferred a frame off the press that asked for it. Anything that calls this
     synchronously from an event handler is putting 6ms of gamut mapping in front of a tap. */
  _orbitRampData() {
    /* Keyed by THEME AND BY PALETTE. The ladder is solved against the page, so a theme switch is a
       different ramp (see _ladder); the wheel is now solved against a palette, so choosing another
       example on a phone is a different ramp too. The wheel's per-visit ROTATION is in neither key
       and must not be — it is what stops the spectrum arriving from the same place twice, and
       rebuilding it on a theme switch would spin the colour round the ring on the way.
       THE WHEEL IS RESOLVED BEFORE THE KEY IS READ. _wheelStations may PICK the visit's palette on
       its way through _fieldPalette, so a key taken first would be stamped with the empty id the
       bake did not use — one wasted 8192-gamut-map rebuild on the next call, and a cache line that
       says the wrong thing about what it holds. Ordering, not defensiveness: everything below reads
       `st` anyway. */
    const S = this._orbitStations(), st = this._wheelStations(), n = st.length;
    const key = this.state.theme + '|' + (this._fieldPalId || '');
    if (this._rampData && this._rampKey === key) return this._rampData;
    const wheel = this._orbitWheel();
    const W = 256, H = 32;
    const data = new Uint8Array(W * H * 4);
    const mix = (a, b, t) => a + (b - a) * t;
    for (let x = 0; x < W; x++) {
      // Walk the stations by ARC, not by index: `at` is where each one starts and `share` is how much
      // of the wheel it owns. `dir` reverses the wheel without disturbing its order.
      const u = wheel.dir > 0 ? (x / W) : (1 - x / W);
      let i0 = n - 1;
      for (let i = 1; i < n; i++) { if (u >= st[i].at) i0 = i; else { i0 = i - 1; break; } }
      const i1 = (i0 + 1) % n;
      const s0 = st[i0], s1 = st[i1];
      const f = s0.share > 0 ? Math.min(1, Math.max(0, (u - s0.at) / s0.share)) : 0;
      const hue = s0.H + (((s1.H - s0.H + 540) % 360) - 180) * f;
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
  /* The wheel as one hex per station at its MID tone — the painted floor's stops, and the bloom's
     tint. Same stations, same gamut map, read off the same ladder position the ramp's middle row
     holds. Each entry carries `v`: WHERE ON THE SCREEN WHEEL that station starts, in the same
     normalised coordinate the ramp's columns run in, `dir` already applied. The floor used to
     reverse the list for an anticlockwise wheel and space the stops evenly, which was exact only
     while every station owned the same arc — a palette's do not, and the still has to hold the same
     proportions the gas does or the dissolve between them is a swap between two pictures. */
  _orbitFloorHexes() {
    // Wheel first, key second — see _orbitRampData: resolving the wheel is what settles the palette
    // id the key is made of.
    const S = this._orbitStations(), st = this._wheelStations(), wheel = this._orbitWheel();
    const key = this.state.theme + '|' + (this._fieldPalId || '');
    if (this._floorHexes && this._floorKey === key) return this._floorHexes;
    this._floorHexes = st.map((s) => {
      const L = this._ladder(s.dL)[2], c = s.C * S.TC[2], rad = s.H * Math.PI / 180;
      return {
        hex: this.gamutMap(L, c * Math.cos(rad), c * Math.sin(rad)),
        /* WHERE THE RAMP SHOWS THIS STATION'S PURE COLOUR, which is not the same question as where
           its arc begins — and the difference is a whole arc on half of all visits.
           The ramp reads column x at wheel position u = dir > 0 ? x/W : 1 − x/W, and a station is
           un-mixed at u = at (f = 0). So on a clockwise wheel that is screen position at, and on an
           anticlockwise one it is 1 − at. Taking the arc's lower screen edge (1 − at − share)
           instead put every hex one station along: measured over both share regimes and both counts,
           all n stations mismatched at dir < 0 and none at dir > 0.
           HEAD had the same error, uniformly — an even twelfth is 30°, small enough between two soft
           layers at a quarter opacity to have never been noticed. It does not stay small once the
           arcs are the palette's own: a 38%-share dominant swatch turns 30° into 137°, which is the
           floor and the field disagreeing about which colour is where, right through the 0.8s
           crossfade that exists because they are supposed to be the same picture.
           `% 1` because at = 0 gives 1, and the wheel closes: the conic wants that stop at 0deg. */
        v: wheel.dir > 0 ? s.at : (1 - s.at) % 1,
      };
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
    // [data-land-nomark] is the opt-out, and the landing's footer is what needs it: it is inside
    // [data-landing] and it contains <p>, so without this the hole would be solved to clear a row
    // of meta text pinned to the bottom edge of the viewport. In the subtree, not of the copy.
    const marks = [...document.querySelectorAll('[data-landing] h1, [data-landing] p, [data-glass-cta], [data-gate-actions]')]
      .filter((m) => !m.closest('[data-land-nomark]'));
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
      // ...then give the vertical axis back a tenth. The shrink is uniform on purpose, but the block
      // this hole clears on a phone is stacked rather than wide — heading, lead, action — so an
      // even shrink takes the air off the top and bottom first. See FIELD_NARROW_VLIFT.
      iy *= this.FIELD_NARROW_VLIFT;
      // Re-guard rather than assume: the lift is the one step here that can make the hole TALLER
      // than it is wide, and past FIELD_HOLE_ASPECT that is a slot cut through the picture rather
      // than an ellipse around a block. It does not bind at today's figures; it will if either moves.
      ix = Math.max(ix, iy / this.FIELD_HOLE_ASPECT);
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
    /* A station that starts at screen-wheel position `v` belongs at clockwise-from-noon angle
       270 + 360*turn − 360*v; listing the wheel backwards from that start — decreasing v, therefore
       increasing CSS angle — is the same set of stops in the order CSS wants them. The station at
       v = 0 lands on the conic's own `from`, so it is repeated at 0deg and 360deg and the wheel
       closes on itself.
       Exact on a round hole and approximate on an elliptical one — the shader spaces its hues evenly
       around the BAND, which on a wide hole is not the same as evenly around the protractor, and CSS
       has no conic that follows an ellipse. The drift is at most a few tens of degrees, between two
       soft layers at a quarter opacity, over a 0.8s crossfade; and where the floor is permanent
       there is nothing on screen for it to disagree with. */
    const from = (270 + 360 * wheel.turn) % 360;
    const walk = hexes.slice().sort((a, b) => b.v - a.v);
    const stops = [walk[n - 1].hex + ' 0deg'];
    walk.forEach((e) => stops.push(e.hex + ' ' + (360 * (1 - e.v)).toFixed(2) + 'deg'));
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
    // The two ends of the wheel in STATION order — first and opposite — rather than of the sorted
    // walk above: what this wants is two colours from different parts of the palette, which is what
    // the station order gives whatever arc each one owns.
    const warm = hexes[0].hex, cool = hexes[Math.floor(hexes.length / 2)].hex;
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
    /* A COPY OF THE RAMP, NOT THE RAMP. createNebulaField keeps the array it is handed BY REFERENCE
       as the texture's own buffer, and setRamp writes into that buffer — so handing over the
       memoised _rampData would make every later swap silently rewrite the bytes this module still
       believes are the first wheel. Nothing depended on that while the only swap was a theme change
       (which allocates a fresh array anyway); the palette crossfade below reads the current wheel
       back out, and a shared buffer would have it fading from a colour to itself. One 32kB copy,
       once per field, buys the two owners their own memory. */
    const bake = this._orbitRampData();
    const field = createNebulaField(cv, { data: new Uint8Array(bake.data), width: bake.width, height: bake.height }, {
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
      this._applyRamp();
    }
    // The floor is the same wheel and answers to the same switch, whether or not it is the surface
    // currently on screen — it is what a lost context would hand back. The bloom is the same wheel
    // too and was being left behind here: it is painted once at build out of _orbitFloorHexes, which
    // is solved against the page, so a theme switch left the air around the field tinted off the
    // OTHER theme's ladder for the rest of the visit.
    this._paintFloor(this._floorLive() ? this._floorOpacity() : undefined);
    this._paintBloom();
  },

  /* ===== THE VISIT'S PALETTE ======================================================================

     The landing is a reading of one of the eight examples (see _wheelStations). Two things move it:
     the visit itself, which picks one at random, and the reader, who picks one by opening it.

     WHY THE READER'S PICK REACHES ALL THE WAY HERE. On a phone the tool is not in the DOM — what the
     small screen offers instead is the eight examples, read-only — and the field is not replaced by
     those surfaces, it is COVERED by them (see LandingStage's `covered`). So the stage the reader
     comes back to is the same one they left, and having it come back wearing the palette they just
     looked at is the one thing that ties the two surfaces together. It costs one ramp.

     THE SWAP IS A CUT, AND THAT IS A MEASUREMENT RATHER THAN A PREFERENCE. This carried a
     crossfade: the 256x32 strip lerped byte by byte over DUR.overlay and pushed with setRamp each
     frame, so the gas drained of colour and refilled instead of changing between two frames. It was
     removed because it was never once seen. Instrumented on the live app, per call site:

       showExample      the commit one line later flips _mobileShare, componentDidUpdate parks the
                        ticker, and update() — the only thing that calls renderer.render — stops.
                        Measured: 10 setRamp calls, ZERO renders. The dissolve was written into a
                        texture nobody drew, for 0.8s, on the same frames _shareIn's entrance needs.
       chooseStoryCase  runs entirely underneath [data-wipe], alongside buildStoryMasks (15-34ms),
                        ScrollTrigger.refresh and lenis.scrollTo — the busiest frames the phone has,
                        and the wipe exists precisely so nobody watches them.
       setStoryCase     the field is lit and rendering, and the reader is at chapter 7 being scrolled
                        to chapter 1.1 — past the hero, never onto it. The one path that drew the
                        dissolve is the one path where it is off screen.

     So all three paid ~48 frames of a 32kB lerp plus a texture upload to animate something with no
     viewer. A dissolve nobody can see is not a dissolve. THE HOUSE RULE IS NOT SUSPENDED — surfaces
     still arrive rather than appear; this one has no arrival because the surface is not on screen.
     It also removed a real inconsistency rather than only cost: _paintBloom and _paintFloor are
     single style writes and always were, so while the gas dissolved the air around it cut. Three
     instant writes agree with each other; two and a tween did not.

     IF A VISIBLE PALETTE CHANGE IS EVER ADDED — a re-roll control on the desktop landing is the
     obvious one — the crossfade is what it needs, and it belongs back HERE rather than at the call
     site. Two ramp textures and a mix uniform is the wrong answer: that puts a second sampler inside
     a forty-eight step march, per pixel, forever, to pay for eight tenths of a second. Lerping the
     strip on the CPU is the right shape and costs 0.19ms a frame; it was only the trigger that was
     wrong. The bloom has to join it, or the air will cut while the gas dissolves.

     THE BAKE IS OFF THE TAP. Changing palette invalidates the ramp, and rebuilding it is ~8000 gamut
     maps — measured at 6ms here, and 7ms of wall time inside showExample, 20ms inside setStoryCase
     once the floor and the bloom are repainted too. Scaled to a mid-range phone that is 30-80ms of
     latency added to the press that asked for it, on a module whose own note says the bake is paid
     "once per landing arrival inside a module that is already off the critical path" — no longer
     true the moment a reader can change the palette. So the id and the state mirror are written
     synchronously, because React needs them for the credit, and every pixel of consequence is
     deferred one frame. Nothing can see the difference: on all three paths the field is covered,
     wiped or scrolled away. */
  _ensureFieldPalette() {
    const p = this._fieldPalette();
    const id = p ? p.id : null;
    if (this.state.fieldPalId !== id) this.setState({ fieldPalId: id });
    return p;
  },
  setFieldPalette(p) {
    const id = p && p.id;
    if (!id || id === this._fieldPalId) return false;
    /* THE STAGE HAS TO BE UP BEFORE THE ID IS WRITTEN. It used to be written first and the gate
       applied after, which left a caller reached with the landing down — none today, a desktop one
       tomorrow — setting a preference nothing would ever paint. _fieldPalette honours an id it
       finds, so the next arrival would have silently stopped re-rolling: "random per visit" defeated
       by a write that did nothing else. */
    if (!this._landingUp()) return false;
    // Only palettes the landing would have picked itself. A generated palette reaching this would
    // put a name under the footer that credits an image the visitor cannot open from here.
    if (!this._fieldPool().some((x) => x.id === id)) return false;
    this._fieldPalId = id;
    this._wheelList = null; this._wheelKey = null;
    this._rampData = null; this._rampKey = null;
    this._floorHexes = null; this._floorKey = null;
    if (this.state.fieldPalId !== id) this.setState({ fieldPalId: id });
    // One frame later, and coalesced: two changes inside one frame bake once. See the note above.
    if (this._repaintReq) return true;
    this._repaintReq = requestAnimationFrame(() => {
      this._repaintReq = 0;
      if (!this._landingUp()) return;
      this._paintBloom();
      this._applyRamp();
      if (this._floorLive()) this._paintFloor();
    });
    return true;
  },
  /** Hand the field the wheel it should be wearing. Writes, never draws — setRamp only marks the
      texture dirty, so a running ticker picks it up on its next frame and a stage held still by
      reduced motion has to be told. */
  _applyRamp() {
    const f = this._nebula; if (!f) return;
    f.setRamp(this._orbitRampData());
    if (this._reduce) f.renderStill(this._orbit ? this._orbit.rot : 0);
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
    /* THE VISIT'S PALETTE, BEFORE ANYTHING IS BAKED FROM IT. The floor, the bloom and the ramp are
       all solved against it two lines down, and the credit under the footer reads it out of state —
       so it is settled here, once, rather than picked by whichever of them asks for the wheel first.
       initOrbit is only ever reached from a rAF, a lifecycle callback or the GSAP-ready kick, never
       from render, so the setState inside is safe. */
    this._ensureFieldPalette();
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
          while the gas swirls through it. The wheel is ROTATED per visit, never shuffled.
          AMENDED — THE WHEEL IS A PALETTE, NOT A SPECTRUM. The twelve authored stations, each owning
          exactly one twelfth of the wheel, were the property twelve orbs walking one revolution used
          to hold, and they are now the FALLBACK rather than the picture: the field is built from one
          of the eight example palettes, chosen at random per visit, and named under the footer. What
          this spends is the old acceptance line "the whole spectrum is present around the copy at
          once" — Garnet is a red field, High Key a pale one, and a landing that showed every hue was
          a landing that showed none of the tool's actual output. What it keeps, and what any pass
          here still has to keep: neighbouring gas is neighbouring hue; every station owns one
          CONTIGUOUS arc (now its share of the palette rather than an even twelfth); the wheel closes
          with no seam; the tonal ladder is solved against `--surface` and never taken from the
          photograph, which is what keeps one exposure serving both themes; and only ANALOGOUS
          harmonies are reachable from a palette, because a complement in the mid-dark would be a
          colour the palette does not contain. See _wheelStations and _paletteStations.
       9. THE PALETTE IS ALSO THE READER'S, and changing it is a DISSOLVE. On a phone the tool is not
          in the DOM and the eight examples are what the small screen offers instead; opening one
          re-bases the field on it (setFieldPalette), so the stage the reader comes back to is
          wearing what they just looked at. The strip is crossfaded on the CPU — never a second
          sampler in the march — and skipped outright while the stage is covered, which is where
          every reader-driven change happens.
       ACCEPTANCE: a turning disc of colour with the brand copy in a clear hole at its centre; the
       hole holds at every viewport and through a full resize drag, and no gas ever crosses onto the
       words; the wordmark keeps thinner air behind it than the gas around it; the palette the credit
       names is the palette on screen, present around the copy at once and travelling round it
       continuously, with no seam where the wheel closes; the disc runs off every edge rather than
       sitting on the page as a ring; the gas reads as pigment on the light theme and as light on the
       dark one, from the same shader; the cursor parts the gas it passes through and it closes
       behind; the field leans toward the cursor without ever reading as sliding; no WebGL 2 = the
       painted annulus, standing still, in the same place; reduced motion = the field, standing
       still. ============================================================================================ */
    const o = {
      active: false, rot: 0, t: 0, rotSpeed: 360 / this.FIELD_ROT_SECS,
      vw: window.innerWidth || 1440, vh: window.innerHeight || 800,
      /* THE NODE THIS STAGE WAS BUILT AGAINST. Held so somebody can ask whether it is still in the
         document: a route change unmounts LandingStage without killing the orbit, and an object
         pointing at detached DOM answers every other question exactly as a live one does. See the
         staleness check in PaletteApp's componentDidUpdate. */
      host: document.querySelector('[data-orbit]'),
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
    const reachMarks = [...document.querySelectorAll('[data-landing] h1, [data-landing] p, [data-glass-cta]')]
      .filter((m) => !m.closest('[data-land-nomark]'));   // same opt-out as _heroReach's marks
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
      if (this._nebula) { this._nebula.update(dt, o.rot); this._reflectCtas(); }
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
  /* ===== THE GLASS CONTROLS REFLECT THE FIELD =====================================================

     WHAT IS ACTUALLY REFLECTED, and why it is not what is behind the button. The obvious reading of
     "the button reflects the field" is: sample the gas under it. That returns almost nothing here,
     and for a designed reason — these controls stand in the HOLE, which is the one region the
     formation exists to keep clear (see _heroReach). Sampling the centre would have every control
     reporting the same cleared near-neutral, and the effect would be invisible in exactly the place
     it was asked for.

     So it samples a RING around each control instead, which is both what reads and what is
     physically honest: a glass object takes its colour from its surroundings, not from the wall
     directly behind it. Eight points on an ellipse scaled off the control's own box, accumulated
     PREMULTIPLIED — sum(rgb x alpha), sum(alpha), divide at the end. That is a coverage-weighted
     average rather than a mean of hues, so dense gas pulls the colour and a thin wisp barely
     registers, which is the weighting a reflection actually has. Averaging un-premultiplied hues
     would let an almost-empty sample shout as loudly as a bright one.

     ONLY THE HUE SURVIVES. The sampled lightness is thrown away and replaced with --cta-reflect-l,
     the measured lightness of the control's own rest composite. Every contrast figure in global.css
     was solved against those fills, and this is what keeps them true while the gas moves: the tint
     can change what colour the pill is, never how light it is. Chroma is gained by
     --cta-reflect-chroma (a box average is far flatter than the gas looks) and then clamped, so the
     token is a dial that cannot reach neon.

     IT IS LERPED, NOT WRITTEN RAW. The field reads back roughly ten times a second, and a custom
     property inside a gradient cannot be transitioned by CSS — so the smoothing is done here, in
     OKLab, toward the new sample. Interpolating in Lab rather than sRGB is what stops two
     neighbouring hues from travelling through grey on the way between them.

     COST. One readback for the whole field (nebulaField's 32x18 grid), then pure arithmetic per
     control — no per-control GPU work. getBoundingClientRect on a handful of elements at 10Hz is
     the only layout read, and the element list is re-queried every thirtieth sample rather than
     every one, because React can swap the landing's acts underneath this. */
  _reflectCtas() {
    const f = this._nebula; if (!f || !f.sampleAt) return;
    const st = this._reflect || (this._reflect = { els: [], n: 0, theme: null, cfg: null });
    if (--st.n <= 0) { st.n = 30; st.els = [...document.querySelectorAll('[data-landing] .glass-cta')]; }
    if (!st.els.length) return;
    // The four dials live in CSS with the fills they answer to; re-read only when the theme moves,
    // because getComputedStyle on the root is a style flush and this runs on a ticker.
    const theme = document.documentElement.getAttribute('data-theme') || 'light';
    if (theme !== st.theme || !st.cfg) {
      const cs = getComputedStyle(document.documentElement);
      const num = (n, d) => { const v = parseFloat(cs.getPropertyValue(n)); return isFinite(v) ? v : d; };
      st.cfg = { L: num('--cta-reflect-l', 0.93), gain: num('--cta-reflect-chroma', 2.6),
                 cmax: num('--cta-reflect-cmax', 0.08), alpha: num('--cta-edge-a', 0.3),
                 reach: num('--cta-reflect-reach', 0.18), knee: num('--cta-reflect-knee', 0.035) };
      st.theme = theme;
    }
    const { L: targetL, gain, cmax, alpha: edgeAlpha, reach, knee } = st.cfg;
    const vw = window.innerWidth || 1, vh = window.innerHeight || 1;
    const K = 0.34;             // lerp toward the new sample, per readback
    for (const el of st.els) {
      const b = el.getBoundingClientRect();
      if (!b.width || !b.height) continue;
      const cx = (b.left + b.right) / 2, cy = (b.top + b.bottom) / 2;
      /* TWO RINGS, and the outer one is the reason this reads at all. A ring scaled off the
         control's own box never leaves the hole — measured on the landing it returns coverage
         around 0.006, which is the formation doing exactly its job and the reflection getting
         nothing to reflect. The outer ring is a fraction of the VIEWPORT (--cta-reflect-reach), so
         it reaches the gas the hole is cut out of.

         BOTH ARE ACCUMULATED INTO ONE SUM rather than picked between, and the premultiplied
         weighting is what makes that correct without a rule: the inner ring contributes in
         proportion to the gas it actually finds, so it adds locality when a wisp drifts across the
         control and falls silent when it does not. No branch decides which ring wins — the gas
         does. */
      const rings = [[b.width * 1.25, b.height * 2.5], [vw * reach, vh * reach * 0.9]];
      let sr = 0, sg = 0, sb = 0, sa = 0, n = 0;
      for (const [rx, ry] of rings) {
        for (let i = 0; i < 8; i++) {
          const t = i * Math.PI / 4;
          const p = f.sampleAt((cx + Math.cos(t) * rx) / vw, (cy + Math.sin(t) * ry) / vh);
          n++;
          if (!p) continue;
          sr += p[0] * p[3]; sg += p[1] * p[3]; sb += p[2] * p[3]; sa += p[3];
        }
      }
      const prev = el._ctaReflect || (el._ctaReflect = { a: 0, b: 0, cov: 0 });
      let na = 0, nb = 0;
      const cov = n ? sa / n : 0;
      if (sa > 0.002) {
        const lab = rgb2oklab(sr / sa / 255, sg / sa / 255, sb / sa / 255);
        na = lab.a; nb = lab.b;
      }
      prev.a += (na - prev.a) * K; prev.b += (nb - prev.b) * K; prev.cov += (cov - prev.cov) * K;
      let ca = prev.a * gain, cb = prev.b * gain;
      const c = Math.hypot(ca, cb);
      if (c > cmax) { ca *= cmax / c; cb *= cmax / c; }
      // Nothing to say: no gas, or gas with no colour in it. Removing the property rather than
      // writing a colourless one is what lets --cta-edge's own fallback in global.css apply.
      if (c < 0.0015 || prev.cov < 0.0015) { el.style.removeProperty('--cta-reflect'); continue; }
      /* MIXED FROM WHITE, NOT WRITTEN FLAT, and the alpha never moves. The edge is the boundary in
         dark and its strength is what carries WCAG 1.4.11, so --cta-edge-a is the one number this
         must not touch — only the hue inside it changes. `m` is how much gas there is, and it drives
         the mix rather than the alpha: no gas gives back exactly the pure white of --cta-edge, so
         the ramp's bottom is continuous with the untinted rim instead of stepping to a grey. */
      const g = hexToRgb(gamutMap(targetL, ca, cb));
      const m = Math.min(1, prev.cov / knee);
      const mix = (v) => Math.round(255 + (v - 255) * m);
      el.style.setProperty('--cta-reflect', 'rgba(' + mix(g[0]) + ',' + mix(g[1]) + ',' + mix(g[2]) + ',' + edgeAlpha + ')');
    }
  },
  /** Drop every tint this wrote. The field going away must not leave a colour behind on a control
      that is now standing on the plain surface. */
  _clearCtaReflect() {
    const st = this._reflect; if (!st) return;
    for (const el of st.els) { try { el.style.removeProperty('--cta-reflect'); delete el._ctaReflect; } catch (e) { } }
    this._reflect = null;
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
    this._clearCtaReflect();
    this._tearDownNebula();
    /* Per-visit seeds and bakes — a return to the landing re-rolls the wheel AND the palette it is
       built from, and re-reads the theme.
       state.fieldPalId is deliberately NOT reset here. killOrbit is one of the paths out of
       componentWillUnmount, so this method must not touch state at all; and it does not need to —
       _ensureFieldPalette is the first thing initOrbit does, so the mirror is corrected before the
       rebuilt stage has painted. What it leaves behind in the meantime is a name under a footer that
       is either unmounted or under the wipe. */
    // The deferred repaint holds no reference to anything being torn down, but it would bake a ramp
    // for a stage that is going away — and on a breakpoint crossing it would land between killOrbit
    // and the initOrbit that follows it.
    if (this._repaintReq) { try { cancelAnimationFrame(this._repaintReq); } catch (e) { } this._repaintReq = 0; }
    this._wheel = null; this._rampData = null; this._rampKey = null;
    this._fieldPalId = null; this._wheelList = null; this._wheelKey = null;
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
