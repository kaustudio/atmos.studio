/* THE ATMOSPHERE WHILE A PHOTOGRAPH IS READ (17.09.26, by request).

   The processing stage shows a small, colourless version of the landing's field (nebulaField.js):
   the same turning disc with the same eye, about 140px across, floating on the page with no
   frame around it. Three decisions shaped it, each asked for directly.

   IT LIVES ON ITS OWN. It is not a picture in a box. The stage keeps its 380x250 slot for layout, but
   the slot has no ground and no rule, and the disc finishes inside it: the gas thins out to nothing at
   its own rim instead of being cut by an edge. The field's canvas overhangs the slot by FREE.margin so
   the far rim, which perspective pushes outward, is never clipped either.

   IT HAS NO COLOUR, AND IT IS MADE OF THE PAGE AND ITS INK. While the reading runs the tool has not
   said anything about colour yet, so the atmosphere does not either. Its strip runs in OKLab from
   `--surface` to `--on-surface` (_procRamp): the thinnest gas is the page and the deepest is the
   primary — the black the type is set in on paper, the white it is set in on the dark page — so one
   rule serves both modes and the darkest smoke is a colour the reader already knows. It replaced the
   landing's five-rung ladder, which stopped at tones NEAR the primary. The colour of the PHOTOGRAPH
   arrives with the result, never here.

   IT GROWS IN, AND IT SITS. It scales up from half size as it arrives (EASE.fold, the system's curve
   for a change of size). When the reading is done it does nothing at all: the bar completes under it
   and the result takes the stage DUR.settle later, while the atmosphere keeps its size, its flow and
   its full strength to the last frame (_procClose). It contracted to 0 and dissolved for part of one
   afternoon; what the user asked for instead, in two steps, was "let it not scale down at the end, let
   it sit" and then "just let it sit and not dissolve at the end". The last frame of it is a live one.

   Tried and set aside on the way, with recordings shown to the user: the palette's own colours filling
   the frame (too strong), and several blends of those over the old blobs (either too faint to
   recognise, or still a colour field in a box).

   THE 2D CANVAS IS THE FLOOR, in the landing's sense: neutral blobs turning round a soft ellipse of the
   same footprint (pipeline.js startCanvas). It is what shows where WebGL 2 never arrives, if the
   field is slow to build, and if the context is lost. When the field is expected the floor starts
   empty, so the disc arrives from nothing rather than over something else.

   ONE FIELD FOR THE SESSION. Created on the first generation and moved into each new slot after that,
   so a context, the 1MB noise volume and a shader link are paid once. The ramp depends only on the
   theme, so a later generation usually uploads nothing at all. Destroyed on unmount and on context
   loss, never between generations.

   OFF THE FIRST FRAME. The chunk is fetched on intent (hover, drag or browse on the dropzone), the build
   waits for the stage's first paint, and the shader links through the field's compile(), so the one
   long task this adds lands behind a frame that is already moving.

   ================================================================================================
   IT FLOWS, AND IT ANSWERS THE READING (17.09.26, second pass, by request: "more lively and
   expressive … the feeling that something special is being generated").

   The disc above was calm and it was dead. Its structure was a fixed noise pattern carried round by
   one angle, so nothing it did could be about the photograph being read underneath it: the same
   sixty seconds of turning played whether the reading took two seconds or nine, and the four steps
   of the status line went by over an image that did not know they existed.

   THE GAS IS SIMULATED NOW (smokeFlow.js). A density field on a polar grid over the disc's own plane
   is advected every frame by a swirl, curl noise and any number of point vortices; gas is emitted
   into a ring, carried, and decays. The renderer is unchanged — same camera, same warped mid-plane,
   same march, same ladder — so what is new is what the gas is DOING, not what it is made of. The
   difference that matters is that the flow has a memory: an impulse delivered now is still legible a
   second later as the shape it left behind, which is the whole reason a simulation is worth its
   render target here.

   THE FOUR STEPS ARE FOUR BEATS (_procStep, called from pipeline.js _readPhotograph).
     0 Reading light      a light passes once round the ring — a band a shade deeper than the gas it
                          crosses, so it reads on paper as well as on a dark page — and it LIGHTS
                          the gas as it goes, leaving a trail that outlives it, while the disc winds
                          up underneath.
     1 Sampling the field taps: small bright injections at points around the ring, each drawn out
                          into a streak by the shear inside its own lifetime, over a burst of
                          turbulence. The field is being read, not shown.
     2 Grouping           the two arms the gas is normally born on fade out and the flow splits into
                          as many eddies as the palette has swatches, each one sized and spaced by
                          that swatch's share of the image, each carrying that swatch's LIGHTNESS as
                          a place on the page's neutral ladder. Turbulence drops away and the ring
                          draws together: chaos resolving into order is the picture of the step.
     3 Naming the mood    the cells stop being cells, the ring condenses, and then the whole band
                          BREATHES — out and in by a seventh of its own radius on DUR.breathe — for
                          as long as the live reading takes. It is the only step of the four whose
                          length nobody knows, so it is the only one whose beat is a cycle rather
                          than an arrival; nothing in it comes to rest, because the moment the
                          reader is waiting hardest is the one moment the atmosphere must not stop.
                          A memory of the tones stays in the gas.
   THE COLOUR IS STILL NOT THERE. Step 2 is handed the palette's STRUCTURE — how many swatches, their
   weights, their lightness order — and never a hue: the atmosphere does not know what colour the
   photograph is while it works, so it says nothing about it. The tones it wears are the same ladder
   solved against `--surface` that the rest of this file is written in, and they run darker than the
   page on paper and lighter on a dark one, exactly as the gas around them does.

   EVERY BEAT IS AN ENVELOPE ON THE SYSTEM'S OWN CURVES (P.env, motion.js DUR/EASE). The simulation
   is given parameters, never keyframes: a beat tweens a multiplier and the flow does the rest, which
   is why a beat interrupted halfway — a short step, a reset, a second drop — leaves gas that settles
   rather than a motion that snaps. Reduced motion takes none of them: one warmed still frame. */

const FREE = {
  /** The eye's radii and the rim as a multiple of them, in CSS pixels. The FOOTPRINT is the figure
      that was set by eye and must not move — about 140x80, picked from three sizes shown side by
      side on 17.09.26 after "more compact and smaller" — and it is ix x outN x 2 across, measured at
      140x80 on a resting frame with the emission's own falloff taken into account.
      THE SPLIT BETWEEN THE TWO MOVED FOR THE FLOW AND MOVED MOST OF THE WAY BACK. It was a 30x18 eye
      inside a rim at 2.3 — a wreath, with barely more band than hole — and the flow's first pass
      took it to 25 inside 3.1 to give the gas somewhere to happen. That went too far: at 3.1 the
      hole is a sixth of the footprint, and the recordings came back reading as a lumpy cloud with a
      small faceted puncture rather than as an atmosphere. The hole is what makes it one. 27 inside
      2.6 keeps a band half again as wide as the wreath's, which is all the flow needs, and gives the
      eye back its share of the picture. Footprint 140 x 83, which is the figure that must not move. */
  ix: 27,
  iy: 16,
  outN: 2.6,
  /** How far past the rim a thrown wisp is still marched. The RESTING footprint is still outN — the
      ring is emitted inside it and the look is written against it — but gas is flowing now, and a
      kick that throws a filament outward has to be drawn or the disc would wear a clean circular
      edge at exactly the moment it is meant to be loosest. The fade from outN to here is what makes
      a wisp end in the air. */
  outMax: 3.05,
  /** How far the field's canvas overhangs the 380x250 slot on every side. The slab's perspective
      pushes the far side of a wisp at outMax out to outMax / (1 - spread) of the eye, about 146px
      wide and 88 high, both still inside a slot of 190 by 125, so at this size the canvas is the
      slot and nothing the flow can throw is clipped. */
  margin: 0,
  /** The floor's soft ellipse, the same footprint as the disc. */
  floorRx: 70,
  floorRy: 41,
};

const PROC = {
  /** Seconds for one revolution of the RIGID turn. The landing takes 105, a page's tempo; this took
      60 while it was the only motion the disc had. It is not any more — the flow's own shear runs
      the inner gas most of a turn past the outer inside a single reading — so the rigid part can sit
      where a body of gas of this size wants to sit and the liveliness comes from the flow rather
      than from spinning the picture. It costs the simulation nothing: the rigid turn is added by the
      renderer and is not in the grid at all (smokeFlow.js (1)).
      It went to 26 seconds on the flow's first pass and that was over-correcting for gas that was
      not yet moving on its own; now that it is, 34 sits where a body of this size wants to sit and
      the disc no longer reads as being spun. */
  rotSecs: 34,
  /** How much faster the noise churns than on the landing, for the same reason — and more of it,
      because the volume is what GRAINS the flowed gas (nebulaField, uFlowGrain) and a grain that
      does not move is a texture painted on a moving body. */
  churn: 1.9,
  /** The near half of the ladder only (see the header), and the figures the flow rewrites.
      `rise` is how softly the gas comes out of the eye, against the resting band.
      `threshold`/`soften` keep their names and change their subject: with a flow they are where the
      SIMULATION's density becomes gas rather than where the noise does (nebulaField), and they are
      what stops the field's own haze rendering as a flat wash over the whole disc.
      `density` is set against the simulation's resting weight (emit/decay), so the two move
      together. `fade` is the outer shoulder and it is LOAD-BEARING in flow mode too: the first pass
      left it unused and held the gas at full weight out to the rim, which drew a clean circular edge
      on the one object in the app that must end at its own soft edge. Everything else in LOOK is the
      landing's, with `armDepth` off — a fixed log spiral drawn over a flowing field is the one
      structure in here that could not answer to anything, so the two arms live in the EMISSION
      instead (smokeFlow REST.arm), where the flow winds them and the grouping step can take them
      away. */
  /* `gain: 1` IS THE EXPOSURE THIS STRIP CAN TAKE, and it is not the landing's. LOOK's 1.12 was
     written for a ladder whose near end sits a step INSIDE `--surface`; _procRamp's near end IS the
     page, so an exposure above 1 has nothing to expose into and lifts the thinnest gas PAST the page
     — measured on the grouping beat, where a swatch's own lightness offset can drive a parcel onto
     row 0: 283 to 1038 pixels per frame rendering lighter than `--surface` and peaking at pure white
     (review of 18.09.26; zero such pixels at 1.0, and zero anywhere on the build before the ink
     strip). It is the same reason `toneMap` is off. */
  look: { tone: 0.2, toneSlope: 0.28, fade: 0.62, rise: 0.42, armDepth: 0, density: 3.0, threshold: 0.17, soften: 0.30, gain: 1 },
  /** How much of a parcel's carried tone reaches the ladder, and how much of the volume's own
      filament texture still grains the flowed gas. THE GRAIN CARRIES THE CRAFT: the simulation's
      grid is about a texel to the CSS pixel, so everything it holds is at the scale of the picture
      and nothing at the scale of texture. At 0.55 the disc read as cotton wool beside the field it
      replaced; the volume is the only thing finer than the grid, so it is given most of the say in
      what the gas is made of while the flow keeps all of the say in what it is doing. */
  flowTone: 0.75,
  flowGrain: 0.85,
  /** Buffer scale, as a multiple of the device pixel ratio (capped at 2). The disc is small enough
      that full density costs a fraction of one landing frame; the governor steps down from here. */
  scales: [1, 0.75, 0.5],
  /** How long the floor waits for the field before it shows itself, in ms. The field is usually on
      within 150ms of the drop; this only fires on a slow first download. */
  floorWait: 600,
  /** The share of the natural end (DUR.settle) the bar takes to complete, so it is full before the
      gas has finished going. */
  barShare: 0.6,
  /** THE ATMOSPHERE GROWS IN (17.09.26, by request): it scales up from `scaleFrom` about its own
      centre, which is the slot's, as a reading starts. A CSS scale on the canvas, so it is composited
      and the shader's geometry never moves.
      IT DOES NOT SCALE OUT. It did, all the way to 0, for an hour of the same afternoon; the ask that
      replaced it was "let it not scale down at the end, let it sit". So the ending takes the gas and
      leaves the body alone: same size, same flow, still turning, until it has dissolved. */
  scaleFrom: 0.5,
  /** How long the simulation is run forward before anything is shown, in seconds of its own clock.
      Emission needs about a gas lifetime to fill the band, and an atmosphere that arrives as an
      empty ring filling in reads as a loading state rather than as weather. It is also the whole of
      what reduced motion ever sees. 72 ticks of a 60Hz grid, once per generation. */
  warm: 1.2,
  /** Two lost contexts in one session and the stage stops asking: the floor is a complete picture. */
  maxFails: 2,
};

/* THE ATMOSPHERE WITHOUT A SIMULATION, which is the field this file described before 17.09.26's
   second pass: the rigid disc, its structure a fixed noise pattern carried round by one angle. It is
   what a machine that has WebGL 2 but cannot allocate the flow's grid gets, and it is kept as a
   complete set of figures rather than as an absence, because almost every figure in PROC.look above
   means something DIFFERENT once a flow is driving the mass — `threshold` and `soften` read the
   simulation's density rather than the noise's, and `density` is set against the simulation's
   resting weight. Handing the rigid shader the flowed figures would draw a solid dark lump. The
   geometry goes with them: the wide band exists so a flow has somewhere to happen, and the rigid
   field wants the compact wreath it was tuned as. */
const RIGID = {
  ix: 30, iy: 18, outN: 2.3, rotSecs: 60,
  look: { tone: 0.2, toneSlope: 0.25, fade: 0.7, rise: 0.34, armDepth: 0.30, density: 4.4, threshold: 0.32, soften: 0.44, gain: 1 },
};

/* THE BEATS. Every figure here was looked at in a recording rather than derived, so they are named
   and gathered the way LOOK is. The envelope values are MULTIPLIERS on the simulation's own resting
   parameters (smokeFlow.js REST) — one source of truth for what the atmosphere does when nothing is
   happening, and one for what each step does to it. */
/* The envelope at rest: a multiplier of 1 on everything the simulation does by itself, and nothing
   of anything a beat adds. One object, written in two places — the field's first build and the start
   of every reading after it — because "back to nothing happening" has to mean the same thing both
   times or a second generation opens in the middle of the first one's last beat.
   `arm` and `rc` are multipliers on the simulation's resting spiral depth and ring radius; `breath`
   is a FRACTION of that radius rather than a radial velocity, because the ring breathing is the band
   itself moving in and out, and a velocity of the amplitude the first pass used integrated to under
   four CSS pixels of displacement over half a period — a motion nobody could see. */
const ENV0 = { spin: 0, shear: 1, turb: 1, radial: 0, tighten: 1, emit: 1, decay: 1, split: 0, lobes: 0, arm: 1, rc: 1, breath: 0, tap: 0, sweep: 0, sweepAmt: 0 };

const BEAT = {
  /** The arrival: the gas comes in already moving, over the same DUR.overlay the disc grows on. */
  arriveSpin: 30,     // extra degrees a second, dying away — the disc is spun up as it is handed over
  arriveTurb: 1.9,
  arriveEmit: 0.3,    // where the emission starts before it comes up to its resting rate
  /** Step 0, the reading light: how far round the ring the pass goes, how strong it is, and the
      wind-up under it. The band is a screen-space one (nebulaField, uSweep) and it also LIGHTS THE
      GAS: `lightN` injection points across the band at the pass's own angle, at `lightRate`, so what
      the light crossed is still brighter behind it after the light has gone. That trail is what
      makes it a reading rather than a highlight, and it is the one part of this beat the flow keeps.
      It was 1.3 with no injection at all on the first pass, and on the light page it was invisible. */
  sweep: 1.8,
  sweepTurns: 1,
  lightN: 3,
  lightBand: [1.25, 2.30],
  lightRate: 0.7,
  lightCore: 0.22,
  kick0: 22,
  shear0: 1.9,
  /** Step 1, the sampling taps: how often one lands, how long it lives, how hard and how wide it is,
      and where in the band it may fall. Each is drawn into a streak by the shear inside its life.
      FEWER AND BIGGER than the first pass's nine a second: at that rate no single tap was ever a
      thing you saw land, and the step read as a general brightening. One every fifth of a second,
      each half again as wide, and each one is a legible event. */
  tapGap: 0.22,
  tapLife: 0.60,
  tapRate: 8.0,
  tapCore: 0.42,
  tapBand: [1.20, 2.35],
  tapTurb: 3.0,
  tapOpen: 0.15,      // the brief outward breath under the taps, radii a second
  /** Step 2, the grouping: what radius the eddies sit at (outside the eye — see smokeFlow's window,
      which is what keeps five cells from cutting a five-pointed star out of the hole), how fast they
      turn at their own core radius, how much of their size follows the palette's shares, and how far
      a swatch's lightness carries on the ladder. They are spaced EVENLY (_procShape).
      Turbulence drops to `groupTurb` as they take hold — the step's whole read is order arriving —
      and the two arms the gas is normally born on go with it (`groupArm`), so what the eye follows
      is one structure handing over to another rather than two structures at once. */
  eddyR: 1.95,
  eddyCore: 0.42,
  eddySpin: 9.0,
  eddyWeight: 0.28,   // the share of the core's size that follows the swatch's weight
  eddyPhase: 1.9,     // where the first swatch sits, radians in the simulation's frame
  toneGain: 1.7,
  groupTurb: 0.35,
  groupArm: 0.15,
  /** The ring draws together as the cells form, which is the same sentence as the turbulence
      dropping: the gas is being gathered. */
  groupTighten: 4.5,
  /** The grouping turns the gas over fast enough to SHOW: at the resting lifetime the cells would
      still be forming when the step's line had gone. Emission rises WITH it — the product of the two
      is the ring's weight, and the first pass raised the decay further than the emission, so the
      disc lost a third of its substance at exactly the step where it is meant to be gathering. */
  groupDecay: 1.7,
  groupEmit: 1.8,
  /** STEP 3, THE NAMING, AND IT IS THE ONE THAT HAS TO CARRY A WAIT. The other three are as long as
      a line needs to be read; this one is as long as the live reading takes, which is two seconds on
      a good connection and can be many. The first pass wrote it as an arrival — the cells dissolve,
      the ring tightens, done in under a second — and then left the gas at rest with a breath too
      small to see. Measured, that stretch had the LOWEST frame-to-frame change in the whole run: the
      longest step of the reading was the moment the atmosphere stopped.
      So this beat is a CYCLE, not an arrival. The ring condenses (`nameTighten`, `nameRc`) and then
      breathes in and out by `breath` of its own radius on DUR.breathe for as long as the wait lasts,
      the gas keeps being carried past its neighbours (`nameShear` is above 1, never below it — see
      smokeFlow REST.shear), and the disc keeps a small sustained drift of its own (`nameSpin`) on
      top of the rigid turn. `hold` and `nameLobes` are how much of the palette's structure survives
      as a memory: the cells stop being cells, their tones stay in the gas. */
  hold: 0.18,
  nameLobes: 0.22,
  kick3: 14,
  nameSpin: 7,
  nameTighten: 3.2,
  nameRc: 0.92,
  nameEmit: 1.35,
  nameTurb: 0.95,
  nameShear: 1.15,
  nameArm: 0.75,
  breath: 0.14,
  /* THE NATURAL END HAS NO FIGURES OF ITS OWN ANY MORE. `drain` (-0.62), `closeRc` (0.72) and
     `kickEnd` (58) lived here: the ring was pulled into its own eye and spun up as it left. The ending
     leaves the body alone now — see _procClose — so the flow simply carries on at whatever the last
     beat left it doing while the gas dissolves. */
};

export const procFieldMethods = {
  /* The chunk, on intent. Idempotent, and the promise is the cache. Returns null when there will be
     no field this session (no WebGL 2, or it has failed too often), which is how the floor knows to
     show itself at once. */
  /* Both halves of the atmosphere in one promise: the field and the simulation that flows it. They
     are two modules rather than one import because the LANDING takes the field alone — the flow is
     handed in as a factory (nebulaField's `options.flow`) — and they are fetched together because
     this caller has never wanted one without the other. */
  _procFieldPrefetch() {
    if (this._procMod) return this._procMod;
    if ((this._procFails || 0) >= PROC.maxFails || !this._fieldOK()) return null;
    this._procMod = Promise.all([import('../nebulaField.js'), import('../smokeFlow.js')])
      .then(([f, s]) => ({ createNebulaField: f.createNebulaField, createSmokeFlow: s.createSmokeFlow }))
      .catch(() => { this._procMod = null; return null; });
    return this._procMod;
  },
  /* The same ask from an input that counts toward responsiveness (a click, a tap, Enter), posted past
     the next paint. The first prefetch probes WebGL 2 by making a context, which measured 5-6ms at 1x
     and 12-29ms at 4x CPU, and in a click or a tap's compatibility mouseover that time is the
     interaction's own (review of 17.09.26). The picker or the drag takes far longer than a frame, and
     a stage that mounts first runs the probe itself in _procFieldStart. Drag events call the
     prefetch directly: they are not counted. */
  _procFieldIntent() {
    if (this._procMod || this._procIntent) return;
    const go = () => {
      if (!this._procIntent) return;
      clearTimeout(this._procIntent);
      this._procIntent = null;
      this._procFieldPrefetch();
    };
    this._procIntent = setTimeout(go, 250);
    requestAnimationFrame(() => setTimeout(go, 0));
  },

  /* THE PAGE AND ITS INK, THE ONLY TWO COLOURS THE ATMOSPHERE IS MADE OF (17.09.26, by request: the
     tone should "match the primary black and primary white in both modes"). `--on-surface` IS that
     primary — #1a1a1a on paper, #f3f3ef on the dark page — so one rule serves both modes, and the
     deepest smoke is the ink the type is set in rather than a grey near it. Read from the live tokens,
     as the landing's ladder reads `--surface`, so a theme change moves both ends together and there is
     no second copy of either colour to drift. */
  _procInk() {
    const key = this.state.theme;
    if (this._procInkLab && this._procInkKey === key) return this._procInkLab;
    let hex = key === 'dark' ? '#f3f3ef' : '#1a1a1a';
    try {
      const v = getComputedStyle(document.documentElement).getPropertyValue('--on-surface').trim();
      if (/^#[0-9a-f]{6}$/i.test(v)) hex = v;
    } catch (e) { }
    const c = this.hexToRgb(hex);
    this._procInkLab = this.rgb2oklab(c[0] / 255, c[1] / 255, c[2] / 255);
    this._procInkKey = key;
    return this._procInkLab;
  },
  /* The strip the flow is painted through, 4x32: row 0 is the page itself and row 1 is the ink, walked
     in OKLab and mapped through the app's own gamutMap. Every column is the same, because a colourless
     wheel is one colour all the way round, and the texture wraps. It replaces the landing's five-rung
     ladder (_ladder), which ran to a mid charcoal on paper and a near-white on the dark page — tones
     NEAR the primary rather than the primary. The near end still dissolves: at row 0 the smoke is the
     page, so the thinnest wisp is not there at all, and the tone each parcel carries (smokeFlow's
     signed offset) now rides between the page and the ink. The ink's own faint warmth rides along,
     which is what "matching" it means; the photograph's colours still never reach this strip.
     Memoised on the theme, the only input it has. */
  _procRamp() {
    const key = this.state.theme;
    if (this._procRampData && this._procRampKey === key) return this._procRampData;
    const page = this._surfaceLab(), ink = this._procInk(), W = 4, H = 32;
    const data = new Uint8Array(W * H * 4);
    for (let y = 0; y < H; y++) {
      const t = y / (H - 1);
      const v = parseInt(this.gamutMap(page.L + (ink.L - page.L) * t, page.a + (ink.a - page.a) * t, page.b + (ink.b - page.b) * t).slice(1), 16);
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        data[i] = (v >> 16) & 255; data[i + 1] = (v >> 8) & 255; data[i + 2] = v & 255; data[i + 3] = 255;
      }
    }
    this._procRampData = { data, width: W, height: H };
    this._procRampKey = key;
    return this._procRampData;
  },
  /* The floor's three tones, from the same two colours at a third, a half and two thirds of the way to
     the ink. Read by the floor on every paint, so they follow a theme switch. */
  _procGreys() {
    const key = this.state.theme;
    if (this._procGreysData && this._procGreysKey === key) return this._procGreysData;
    const page = this._surfaceLab(), ink = this._procInk();
    this._procGreysData = [0.34, 0.5, 0.68].map((t) => this.gamutMap(page.L + (ink.L - page.L) * t, page.a + (ink.a - page.a) * t, page.b + (ink.b - page.b) * t));
    this._procGreysKey = key;
    return this._procGreysData;
  },
  _procFloorShape() { return { floorRx: FREE.floorRx, floorRy: FREE.floorRy, rotSecs: PROC.rotSecs }; },

  /* Called by startCanvas once the floor is running. Everything below is asynchronous and checks, at
     every step, that the generation it was started for is still the one on screen. */
  _procFieldStart(pal) {
    const floorCv = this.canvasRef.current, floor = this._procFloor;
    if (!pal || !floorCv) return;
    const token = this._procToken = (this._procToken || 0) + 1;
    /* NOT ONCE THE CLOSE HAS BEGUN. A first build that lands during the natural end would fade the gas
       in at full speed while everything else is settling, and the commit would then cut it off at
       most of its opacity (review of 17.09.26, reproduced with a slow chunk). The build waits for the
       next generation instead, with the chunk already here. */
    const live = () => token === this._procToken && !this._procCloseCall && this.state.stage === 'processing'
      && this.state.pending === pal && floorCv.isConnected;
    const mod = this._procFieldPrefetch();
    if (!mod) { this._procFloorTo(1, false, null, 'grow'); return; }
    // Floor first, if the field is slow: a slot with nothing in it for more than a moment reads as
    // broken. The field dissolves over it when it does arrive.
    clearTimeout(this._procFloorT);
    this._procFloorT = setTimeout(() => {
      if (live() && !(this._proc && this._proc.on) && floor === this._procFloor) this._procFloorTo(1, false, null, 'grow');
    }, PROC.floorWait);
    mod.then((m) => {
      if (!live()) return;
      if (!m) { this._procFloorTo(1, false, null, 'grow'); return; }
      /* After the stage's first paint. rAF alone is enough here: a hidden document has no frame to
         dress, the build runs when it is shown, and the floor timer above covers the wait. */
      requestAnimationFrame(() => setTimeout(() => { if (live()) this._procFieldMount(m, floorCv, live); }, 0));
    });
  },

  _procFieldMount(m, floorCv, live) {
    const ramp = this._procRamp();
    let P = this._proc;
    if (!P) {
      const cv = document.createElement('canvas');
      cv.setAttribute('data-proc-field', '1'); cv.setAttribute('aria-hidden', 'true');
      const o = FREE.margin;
      cv.style.cssText = 'position:absolute;left:' + -o + 'px;top:' + -o + 'px;width:calc(100% + ' + 2 * o + 'px);height:calc(100% + ' + 2 * o + 'px);pointer-events:none;opacity:0;';
      floorCv.after(cv);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      /* A COPY OF THE RAMP, for the reason _buildNebula gives: the field keeps the array it is handed
         as the texture's own buffer and setRamp writes into it, so handing over the memo would let a
         theme switch rewrite the bytes this module still files under the other theme. */
      const f = m.createNebulaField(cv, { data: new Uint8Array(ramp.data), width: ramp.width, height: ramp.height }, {
        innerX: FREE.ix, innerY: FREE.iy, outN: FREE.outN, outMax: FREE.outMax,
        look: PROC.look, sample: false, timeScale: PROC.churn,
        scales: PROC.scales.map((s) => s * dpr),
        flow: m.createSmokeFlow, flowTone: PROC.flowTone, flowGrain: PROC.flowGrain,
      });
      if (!f) { try { cv.remove(); } catch (e) { } this._procFails = PROC.maxFails; this._procMod = null; this._procFloorTo(1, false, null, 'grow'); return; }
      // No grid, no flow: the disc goes back to the figures it was tuned as. See RIGID.
      if (!f.flow) { f.setLook(RIGID.look); f.setGeom(RIGID.ix, RIGID.iy, RIGID.outN); }
      /* `env` is the beats' whole surface on the simulation: multipliers on its resting parameters,
         tweened by _procImpulse and read into the flow once a frame by the tick below. Nothing here
         is a keyframe — the gas is given a condition and left to answer it. */
      P = this._proc = {
        f, cv, rot: 0, t: 0, theme: this.state.theme, on: false, added: false, tick: null,
        flow: f.flow, taps: [], tapT: 0, ready: f.compile(),
        env: { ...ENV0 },
      };
      f.onContextLost(() => this._procFieldLost(P));
      P.tick = (time, deltaMS) => {
        if (!P.on || this._proc !== P) return;
        const dt = Math.min(0.05, (deltaMS || 16.7) / 1000);
        const F = P.env;
        P.t += dt;
        // The rigid turn is the whole of the motion where there is no flow, and it was set at a
        // body's tempo for exactly that; with a flow under it the liveliness comes from the gas.
        P.rot = (P.rot + (360 / (P.flow ? PROC.rotSecs : RIGID.rotSecs) + F.spin) * dt) % 360;
        if (P.flow) {
          const R = P.flow.rest, p = P.flow.params;
          p.shear = R.shear * F.shear;
          p.turb = R.turb * F.turb;
          p.tighten = R.tighten * F.tighten;
          p.emit = R.emit * F.emit;
          p.decay = R.decay * F.decay;
          p.split = F.split;
          p.lobes = F.lobes;
          p.arm = R.arm * F.arm;
          p.radial = F.radial;
          /* The one term that is not an envelope: the breath the ring takes while the live reading
             is out, which has no end to tween toward because the wait has no length. It moves the
             ring's own RADIUS — the band the gas is emitted into, with the spring dragging what is
             already there after it — rather than pushing a radial velocity, which is what the first
             pass did and why it could not be seen: the displacement a velocity of that amplitude
             integrates to over half a period was under four CSS pixels. */
          p.rc = R.rc * F.rc * (1 + F.breath * Math.sin(P.t * 6.2832 / this.DUR.breathe));
          this._procSparks(P, dt);
          P.f.setSweep(F.sweep, F.sweepAmt);
        }
        P.f.update(dt, P.rot);
      };
    } else {
      if (P.theme !== this.state.theme) { P.f.setRamp(ramp); P.theme = this.state.theme; }
      floorCv.after(P.cv);
      // The canvas was detached since the last slot it sat in, and its observer measured it at nothing
      // on the way out. Re-measure now rather than on the observer's next frame, or the first render
      // lands in a 1x1 buffer.
      P.f.resize();
    }
    P.ready.then(() => {
      if (!live() || this._proc !== P) return;
      // A theme thrown while the shader was still linking, reconciled before anything is shown.
      if (P.theme !== this.state.theme) { P.f.setRamp(this._procRamp()); P.theme = this.state.theme; }
      if (P.flow) this._procFlowReset(P);
      P.f.renderStill(P.rot);
      this._procFieldReveal(P);
    });
  },

  /* A NEW READING STARTS FROM AN EMPTY GRID, and then from gas that has already been flowing for
     most of a second: the previous generation's eddies and wisps are not this photograph's, and a
     ring filling in from nothing in front of the reader is a loading bar with weather on it. Both
     halves are GPU work inside the one task that ends with the first frame anyone sees. */
  _procFlowReset(P) {
    P.flow.reset();
    P.rot = 0; P.t = 0; P.shape = null;
    P.taps.length = 0; P.tapsOn = false; P.tapT = 0;
    Object.assign(P.env, ENV0);
    P.f.setSweep(0, 0);
    P.flow.warm(PROC.warm);
  },

  /* EVERYTHING THE BEATS INJECT INTO THE GAS, in the six slots the shader carries (smokeFlow.js
     SIM.maxSparks). Two beats use them and they never overlap for long, so they share one list with
     the reading light first — it is the one whose absence would be noticed.

     THE READING LIGHT'S TRAIL (step 0). The band itself is drawn in screen space by the renderer,
     which is what makes its edge crisp; these are the points where it actually LIGHTS the gas, three
     of them strung across the band at the pass's own angle. The light's angle is a screen angle and
     the simulation's frame is the screen's minus the rigid turn, so the turn comes off here.

     THE SAMPLING TAPS (step 1). One lands every BEAT.tapGap while the step's envelope is up, at a
     random angle and a random place across the band, and fades over its own life on the system's
     standard curve — the same curve a thing arriving anywhere else in the app settles on, read
     backwards. The oldest is overwritten, which is what a slot IS. */
  _procSparks(P, dt) {
    const F = P.env, live = [];
    if (F.sweepAmt > 0.02) {
      const a = F.sweep - P.rot * Math.PI / 180, amp = Math.min(1, F.sweepAmt / BEAT.sweep);
      const [r0, r1] = BEAT.lightBand;
      for (let i = 0; i < BEAT.lightN; i++) {
        const r = r0 + (r1 - r0) * ((i + 0.5) / BEAT.lightN);
        live.push({ x: Math.cos(a) * r, z: Math.sin(a) * r, rate: BEAT.lightRate * amp, radius: BEAT.lightCore });
      }
    }
    if (F.tap > 0) {
      P.tapT -= dt;
      if (P.tapT <= 0) {
        P.tapT = BEAT.tapGap;
        const th = Math.random() * 6.2832, r = BEAT.tapBand[0] + Math.random() * (BEAT.tapBand[1] - BEAT.tapBand[0]);
        P.taps.push({ x: Math.cos(th) * r, z: Math.sin(th) * r, age: 0, amp: F.tap });
        if (P.taps.length > 6) P.taps.shift();
      }
    }
    let alive = 0;
    for (let i = 0; i < P.taps.length; i++) {
      const t = P.taps[i];
      t.age += dt;
      const p = t.age / BEAT.tapLife;
      if (p >= 1) continue;
      alive++;
      live.push({ x: t.x, z: t.z, rate: BEAT.tapRate * t.amp * (1 - this.EASE.standard(p)), radius: BEAT.tapCore });
    }
    // One last call with an empty list clears the slots; after that there is nothing to say until
    // something lands again.
    if (live.length || P.tapsOn) P.flow.setSparks(live);
    P.tapsOn = live.length > 0;
    if (!alive && P.taps.length) P.taps.length = 0;
  },

  /* The arrival: the gas in on the landing's own figures (_revealField), and the floor out if it had
     come up while the field was on its way. Reduced motion takes the picture without the motion: one
     still frame, no ticker, no fade. */
  _procFieldReveal(P) {
    const g = window.gsap;
    if (this._procCloseCall) return;
    P.on = true;
    if (!g || this._reduce) {
      P.cv.style.opacity = '1';
      if (g) g.set(P.cv, { scale: 1 }); else P.cv.style.transform = '';
      this._procFloorTo(0, true);
      return;
    }
    /* THE SYSTEM'S CURVES, BY WHAT EACH MOTION IS (motion.js initMotion). The gas arriving is a fade
       into place: EASE.standard, the landing field's own reveal. The disc growing is a change of
       SIZE, which the system puts on EASE.fold, because an expo-out snaps a size open and then
       creeps. The same split runs the natural end below. */
    const dur = this.DUR.overlay, E = this.EASE;
    g.killTweensOf(P.cv);
    g.fromTo(P.cv, { opacity: 0 }, { opacity: 1, duration: dur, ease: E.standard });
    g.fromTo(P.cv, { scale: PROC.scaleFrom }, { scale: 1, duration: dur, ease: E.fold, transformOrigin: '50% 50%' });
    this._procFloorTo(0);
    if (!P.added) { g.ticker.add(P.tick); P.added = true; }
    /* THE GAS ARRIVES ALREADY MOVING: spun up and loose, settling to its resting flow over the same
       beat the disc grows on. An atmosphere that appears at rest and then starts is two events where
       there should be one. The step it lands in takes its own beat immediately afterwards —
       usually 0, but a slow first chunk can put the field on screen inside a later one. */
    if (P.flow) {
      const F = P.env;
      g.killTweensOf(F);
      g.fromTo(F, { spin: BEAT.arriveSpin }, { spin: 0, duration: this.DUR.swirl, ease: E.standard, overwrite: 'auto' });
      g.fromTo(F, { turb: BEAT.arriveTurb }, { turb: 1, duration: this.DUR.swirl, ease: E.standard, overwrite: 'auto' });
      g.fromTo(F, { emit: BEAT.arriveEmit }, { emit: 1, duration: dur, ease: E.standard, overwrite: 'auto' });
      /* The palette first, then the beat. _procFlowReset (one task earlier) empties the grid and
         nulls P.shape, so this has to run after it; `again` once the arriving step is past the
         grouping, which sets the eddies and their tones without re-opening a beat that is over. */
      const pal = this._procShapeAt;
      if (pal && !P.shape) this._procShape(pal, (this._procStepAt || 0) > 2);
      this._procImpulse(this._procStepAt || 0, this._procStepSecs || this.DUR.think);
    }
  },

  /* ONE STEP OF THE READING, ONE BEAT IN THE GAS. Called by pipeline.js _readPhotograph as each step
     goes up, with how long that step is expected to hold the screen (_thought), because two of the
     four stretch with the photograph and a beat that outlasts its own line reads as a beat about
     nothing. Recorded even when there is no field yet: a build that lands mid-reading takes the beat
     it arrives in rather than starting at the beginning of a reading that is half over. */
  _procStep(i, secs) {
    this._procStepAt = i;
    this._procStepSecs = secs || this.DUR.think;
    const P = this._proc;
    if (!P || !P.on || !P.flow) return;
    this._procImpulse(i, this._procStepSecs);
  },

  /* THE PALETTE'S STRUCTURE, AS EDDIES (step 2, from _readPhotograph the moment the grouping has
     run). WHAT IS TAKEN AND WHAT IS NOT: how many swatches there are, what share of the image each
     one holds, and their lightness ORDER. Not one hue — the atmosphere has said nothing about colour
     all the way through and it is not going to start two seconds before the palette itself arrives.

     Each swatch becomes a vortex evenly spaced round the ring — so what the step SAYS first is how
     many groups the colours fell into — and its size is its share of the image, so a colour holding
     two fifths of it stirs the most gas. Its LIGHTNESS becomes a signed
     offset on the page's neutral ladder — away from the surface for a swatch darker than the
     palette's mean on paper, and toward the light for one lighter than it on a dark page, which is
     the same sentence in both themes. The gas each eddy emits carries that tone with it. */
  _procShape(pal, again) {
    /* RECORDED EVEN WHEN THERE IS NO FIELD YET, exactly as _procStep records its beat. The grouping
       step hands the palette over ONCE, inside its own work (pipeline.js), so a field that finishes
       building after that — a slow chunk on a cold cache, a slow first link — used to spend the rest
       of the reading with no eddies at all: the one beat that carries the photograph's structure, and
       step 3's memory of its tones, silently missing (review of 18.09.26, reproduced by delaying the
       module 2.6s). The reveal replays it. */
    if (!again) this._procShapeAt = pal;
    const P = this._proc, sw = (pal && pal.swatches) || [];
    if (!P || !P.flow || sw.length < 2) return;
    let tot = 0;
    sw.forEach((s) => { tot += Math.max(+s.weight || 0, 0); });
    if (!(tot > 0)) return;
    const parts = sw.map((s) => ({ share: Math.max(+s.weight || 0, 0) / tot, L: +s.L || 0 })).sort((a, b) => a.L - b.L);
    const n = parts.length;
    let meanL = 0;
    parts.forEach((q) => { meanL += q.share * q.L; });
    // Which way the ladder runs from here: darker than the mean goes AWAY from a light page, lighter
    // than the mean goes away from a dark one. _ladder solves the same question for the ramp itself.
    const away = this._surfaceLab().L > 0.5 ? 1 : -1;
    const eddies = parts.map((q, i) => {
      /* EVENLY ROUND THE RING, AND SIZED BY THE SHARE. The arc each cell occupied was its share of
         the image to begin with, the way a band's width is its share everywhere else in the tool —
         and on a photograph with one dominant colour that is a single cell alone in half the ring
         with the other four crowded into the rest, which on screen reads as an accident rather than
         as the palette. Spacing them evenly says the one thing this step is about (the colours have
         separated, and there are THIS many of them) and leaves the share to say the other (this one
         is the big one), through the cell's size and the gas it gathers. */
      const mid = (i + 0.5) / n;
      // 1 for a swatch holding its equal share of the image, and it moves with the square root of
      // the share rather than with the share: an eddy is an area, and a dominant colour that took
      // the whole ring would leave the others with no gas to stir.
      const w = Math.sqrt(Math.max(q.share * n, 0.04));
      const core = BEAT.eddyCore * (1 - BEAT.eddyWeight + BEAT.eddyWeight * w);
      return {
        angle: mid * 6.2832 + BEAT.eddyPhase,
        radius: BEAT.eddyR,
        // Circulation for a fixed turn rate at the core: the kernel's speed there is about Γ/2c, so
        // Γ ~ spin·c² makes a big eddy turn at the same tempo as a small one instead of faster.
        circulation: BEAT.eddySpin * core * core,
        core,
        tone: Math.max(-0.5, Math.min(0.5, (meanL - q.L) * away * BEAT.toneGain)),
      };
    });
    P.flow.setEddies(eddies);
    P.shape = pal;
    // `again` is the theme switch re-solving the tones of a structure that is already in the gas
    // (_procFieldTheme). The cells are where they were; only the ladder moved, and re-running the
    // split would open them a second time in the middle of a later step.
    const g = window.gsap;
    if (again || !g || this._reduce || !P.on) return;
    /* The split is a change of STRUCTURE, so it runs on EASE.fold for the reason every size change
       in the system does: an expo-out would have the cells fully formed in the first fifth of the
       beat and then creep, which is a cut with a tail on it rather than gas organising. */
    g.to(P.env, { split: 1, lobes: 1, duration: this.DUR.fold, ease: this.EASE.fold, overwrite: 'auto' });
  },

  /* THE FOUR BEATS, AND THE ONE RULE THEY SHARE: a beat sets a CONDITION and lets the flow answer.
     Each tween carries overwrite:'auto' rather than killing the whole envelope, so a beat that moves
     turbulence leaves a spin still dying away from the one before it — which is what makes the four
     read as one continuous atmosphere being worked rather than as four animations in a row. */
  _procImpulse(i, secs) {
    const P = this._proc, g = window.gsap;
    if (!P || !P.flow || !g || this._reduce) return;
    const F = P.env, E = this.EASE, D = this.DUR;
    if (i === 0) {
      /* READING LIGHT. A band of deeper tone passes once round the ring while the disc winds up
         under it. EASE.fold on the pass itself: it leaves, travels and arrives, which is the one
         motion in the system that is not an entrance. */
      g.fromTo(F, { sweep: BEAT.eddyPhase }, { sweep: BEAT.eddyPhase + 6.2832 * BEAT.sweepTurns, duration: secs, ease: E.fold, overwrite: 'auto' });
      const tl = g.timeline();
      tl.fromTo(F, { sweepAmt: 0 }, { sweepAmt: BEAT.sweep, duration: D.state, ease: E.standard, overwrite: 'auto' }, 0);
      tl.to(F, { sweepAmt: 0, duration: D.overlayOut, ease: E.exit, overwrite: 'auto' }, Math.max(D.state, secs - D.overlayOut));
      g.fromTo(F, { spin: F.spin + BEAT.kick0 }, { spin: 0, duration: D.swirl, ease: E.standard, overwrite: 'auto' });
      g.fromTo(F, { shear: BEAT.shear0 }, { shear: 1, duration: D.swirl, ease: E.standard, overwrite: 'auto' });
      return;
    }
    if (i === 1) {
      /* SAMPLING THE FIELD. Taps land while the envelope is up and the field is stirred to take
         them; it opens outward a little as it does, which is the gas making room to be read. */
      const tl = g.timeline();
      tl.to(F, { turb: BEAT.tapTurb, duration: D.state, ease: E.entrance, overwrite: 'auto' }, 0);
      tl.to(F, { turb: 1, duration: D.swirl, ease: E.standard, overwrite: 'auto' }, D.state);
      tl.to(F, { radial: BEAT.tapOpen, duration: D.state, ease: E.entrance, overwrite: 'auto' }, 0);
      tl.to(F, { radial: 0, duration: D.overlay, ease: E.standard, overwrite: 'auto' }, D.state);
      g.fromTo(F, { tap: 1 }, { tap: 0, duration: Math.max(secs, D.swap), ease: E.exit, overwrite: 'auto' });
      return;
    }
    if (i === 2) {
      /* GROUPING. The turbulence drops away, the two arms the gas is normally born on go with it,
         the ring draws together and the gas turns over faster — so what is left of the sampling
         clears, one structure is visibly leaving, and the cells the palette is about to hand over
         have room to form. The split itself is not here: it waits for the swatches (_procShape),
         which are a frame away. */
      g.to(F, { turb: BEAT.groupTurb, decay: BEAT.groupDecay, emit: BEAT.groupEmit, arm: BEAT.groupArm, duration: D.overlay, ease: E.standard, overwrite: 'auto' });
      const tl = g.timeline();
      tl.to(F, { tighten: BEAT.groupTighten, duration: D.overlay, ease: E.fold, overwrite: 'auto' }, 0);
      tl.to(F, { tighten: 1, duration: D.swirl, ease: E.standard, overwrite: 'auto' }, D.overlay);
      return;
    }
    /* NAMING THE MOOD, AND A WAIT OF UNKNOWN LENGTH. The cells stop being cells and their tones stay
       in the gas, the ring condenses onto a slightly smaller radius — the reading closing on an
       answer — and then the atmosphere BREATHES: the band itself moving out and in by a seventh of
       its radius, for as long as it takes, on a period nothing else in the app shares.
       Three things deliberately do NOT come to rest here, because the first pass brought all three
       to rest and the result was a still picture under the longest line of the reading: the shear
       stays above 1, so gas keeps moving past its neighbours and the streaks keep changing; a small
       drift stays on the turn; and the emission stays up, so the ring does not thin while it waits.
       An atmosphere that runs down while you wait for an answer is telling you the wrong thing. */
    const tl = g.timeline();
    /* The STRUCTURE goes first and on its own beat: the cells have to be visibly leaving inside this
       line, or the grouping's picture is still on screen while a different step is being named. What
       the gas is DOING settles more slowly behind it, on the curve an impulse always leaves on. */
    tl.to(F, { split: BEAT.hold, lobes: BEAT.nameLobes, duration: D.overlay, ease: E.fold, overwrite: 'auto' }, 0);
    tl.to(F, { turb: BEAT.nameTurb, shear: BEAT.nameShear, arm: BEAT.nameArm, decay: 1, emit: BEAT.nameEmit, duration: D.swirl, ease: E.fold, overwrite: 'auto' }, 0);
    tl.fromTo(F, { spin: F.spin + BEAT.kick3 }, { spin: BEAT.nameSpin, duration: D.swirl, ease: E.standard, overwrite: 'auto' }, 0);
    tl.to(F, { tighten: BEAT.nameTighten, rc: BEAT.nameRc, duration: D.overlay, ease: E.fold, overwrite: 'auto' }, 0);
    tl.to(F, { breath: BEAT.breath, duration: D.overlayArrive, ease: E.standard, overwrite: 'auto' }, D.overlay);
  },

  /* The floor's share, eased on the same figures as the field (or over `dur`), or set at once.
     A tween toward the other value is killed BEFORE the value is compared: a tween started this frame
     has not rendered yet, so the floor still reads its old value, and returning early on that left
     the blobs coming up under a field that had just arrived (review of 17.09.26). */
  /* `shape` makes the floor arrive as the field does: 'grow' scales it up from PROC.scaleFrom. There is
     no departing shape any more — the floor, like the atmosphere, sits until the stage is swapped
     (see _procClose) — so the only other call is the crossfade to 0 under an arriving field. */
  _procFloorTo(v, now, dur, shape) {
    const floor = this._procFloor, g = window.gsap, el = this.canvasRef.current;
    if (!floor) return;
    if (g) g.killTweensOf(floor);
    if (floor.v === v) return;
    if (now || !g || this._reduce || document.hidden) { floor.v = v; floor.dirty = true; if (g && el) g.set(el, { scale: 1 }); return; }
    const d = dur || this.DUR.overlay, E = this.EASE;
    g.to(floor, { v, duration: d, ease: E.standard, onUpdate: () => { floor.dirty = true; } });
    if (el && shape === 'grow') { g.killTweensOf(el); g.fromTo(el, { scale: floor.v > 0.01 ? g.getProperty(el, 'scale') : PROC.scaleFrom }, { scale: 1, duration: d, ease: E.fold, transformOrigin: '50% 50%' }); }
  },

  /* THE NATURAL END, WHICH THE ATMOSPHERE ITSELF NO LONGER TAKES PART IN. Called by commitGenerated
     with the commit itself as `done`; returns false when it cannot take the commit over, and the
     caller commits at once.

     WHAT IS LEFT OF IT: the bar completes, and the reading is given DUR.settle to be over before the
     result replaces the stage. The atmosphere is not touched — it keeps its size, its flow, its turn
     and its full strength until the stage is swapped under it. Three endings were tried on the same
     afternoon and each was asked for in turn: a contraction to 0 with the gas dissolving, then "let it
     not scale down at the end, let it sit", and finally "just let it sit and not dissolve at the end".
     So what ends the atmosphere is the result arriving, not a fade — the last frame of it is a live
     one. The floor (the no-WebGL fallback) sits for the same reason.

     Not under reduced motion, where nothing was moving, and not in a hidden document, where the
     ticker the bar rides is asleep. The timer is the backstop for a document hidden halfway: `done`
     runs exactly once whichever way it arrives. */
  _procClose(done) {
    const g = window.gsap;
    if (!g || this._reduce || document.hidden || this.state.stage !== 'processing' || this._procCloseCall) return false;
    const dur = this.DUR.settle, E = this.EASE;
    // The bar completes on its own curve, the one it filled on (EASE.progress, pipeline.js _readBar).
    const bar = this.progRef.current;
    if (bar) { g.killTweensOf(bar); g.to(bar, { scaleX: 1, duration: dur * PROC.barShare, ease: E.progress }); }
    const finish = () => {
      if (!this._procCloseCall) return;
      this._procCloseEnd();
      done();
    };
    this._procCloseCall = g.delayedCall(dur, finish);
    this._procCloseT = setTimeout(finish, dur * 1000 + 250);
    return true;
  },
  _procCloseEnd() {
    if (this._procCloseCall) { try { this._procCloseCall.kill(); } catch (e) { } this._procCloseCall = null; }
    clearTimeout(this._procCloseT); this._procCloseT = null;
  },

  /* Takes the field out of play without destroying it: no tick, no tweens, not in the document. */
  _procDetach(P) {
    P.on = false;
    const g = window.gsap;
    if (P.added && g) { try { g.ticker.remove(P.tick); } catch (e) { } P.added = false; }
    // The envelope goes with the tick that reads it. A beat left running against a detached field
    // would be writing parameters into a simulation nobody is stepping, and would still be running
    // when the next generation mounts the same field into a new slot.
    try { if (g) g.killTweensOf([P, P.cv, P.env]); } catch (e) { }
    P.cv.style.opacity = '0';
    try { P.cv.remove(); } catch (e) { }
  },

  /* Called by stopCanvas, on every way out of the processing stage. Invalidates anything still in
     flight (a build, the floor's wait, a close) and detaches the field from a slot that is being, or has
     been, unmounted. The field itself is kept for the next generation. */
  _procFieldStop() {
    this._procToken = (this._procToken || 0) + 1;
    clearTimeout(this._procFloorT); this._procFloorT = null;
    this._procCloseEnd();
    // The step this reading had reached is not the next one's: a field mounting into a new slot asks
    // for the beat it lands in, and a stale answer would open the next atmosphere mid-reading.
    this._procStepAt = 0; this._procStepSecs = 0; this._procShapeAt = null;
    if (this._proc) this._procDetach(this._proc);
  },

  /* A lost context mid-generation hands the slot back to its floor. The next generation builds a new
     field, up to PROC.maxFails. Only the field goes: a close already under way still commits. */
  _procFieldLost(P) {
    if (this._proc !== P) return;
    this._procFails = (this._procFails || 0) + 1;
    if (this._procFails >= PROC.maxFails) this._procMod = null;
    this._procFieldDispose();
    if (this.state.stage === 'processing' && !this._procCloseCall) this._procFloorTo(1, false, null, 'grow');
  },

  /* The field's compile() ends its own poll when the field is destroyed, so this can tear down at once,
     even with the first link still running. */
  _procFieldDispose() {
    if (this._procIntent) { clearTimeout(this._procIntent); this._procIntent = null; }
    const P = this._proc;
    if (!P) return;
    this._procDetach(P);
    this._proc = null;
    try { P.f.destroy(); } catch (e) { }
  },

  /* The ramp is solved against the page, so a theme thrown mid-generation is a new strip, as it is on
     the landing (refreshOrbitTheme). It applies whenever the field sits in the current slot, not only
     once it is on, and the reveal reconciles it again in case the switch landed mid-link. The floor
     reads its greys per paint, so it only needs a repaint. */
  _procFieldTheme() {
    if (this.state.stage !== 'processing') return;
    if (this._procFloor) this._procFloor.dirty = true;
    const P = this._proc;
    if (!P || !P.cv.isConnected || P.theme === this.state.theme) return;
    P.f.setRamp(this._procRamp());
    P.theme = this.state.theme;
    // The eddies' tones are solved against the page as well (a swatch darker than the palette's mean
    // runs away from a light surface and toward a dark one), so a theme thrown after the grouping
    // has to re-solve them. Same strip, same structure, the other direction.
    if (P.shape) this._procShape(P.shape, true);
    if (P.on && (this._reduce || !window.gsap)) P.f.renderStill(P.rot);
  },
};
