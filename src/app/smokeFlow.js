/* THE GAS ACTUALLY FLOWS: A SMOKE SIMULATION UNDER THE PROCESSING ATMOSPHERE (17.09.26, by request).

   The atmosphere over the reading was the landing's field with the colour taken out — the same
   raymarched disc, turning rigidly, its structure a fixed noise pattern carried round by one angle.
   It was calm and it was dead: nothing about it answered to the four steps of the reading underneath
   it, and "more lively and expressive … the feeling that something special is being generated" is
   the ask this module exists for.

   WHAT IT IS. A density field on a polar grid over the disc's own plane, advected every frame by a
   velocity field that is the sum of four things — the differential swirl around the eye, curl noise,
   a radial drift, and any number of point vortices. Gas is emitted into a ring-shaped band, carried
   by that flow, and decays; what you see is therefore a history of the flow rather than a pattern
   translated across the screen. Wisps genuinely shed off the rim, filaments genuinely wind up round
   the eye, and a kick delivered now is still visible a second later as the shape it left behind.
   The reading's four steps each deliver one (procField.js): that is the whole point of paying for a
   simulation rather than animating a parameter of the noise.

   FIVE THINGS ARE LOAD-BEARING.

   1. THE GRID IS POLAR, AND THE RIGID TURN IS NOT IN IT. Semi-Lagrangian advection blurs: every step
      resamples the field with a bilinear filter, so the variance a parcel accumulates goes with the
      DISTANCE it has travelled across the grid, whatever the resolution. The disc's dominant motion
      is a rigid turn, and a rigid turn moves every parcel a long way while changing the picture not
      at all. So it is kept OUT of the simulation entirely — the caller adds it when it samples this
      texture (nebulaField's `a - uRot`) — and what the grid carries is only the RESIDUAL: shear,
      curl, vortices, drift. The field can then turn as fast as the stage wants for nothing, and the
      only blur paid for is the blur of gas genuinely moving relative to its neighbours.
      Polar also spends every texel on gas: the eye and the corners are not in the domain at all, the
      angle axis wraps exactly (REPEAT, and the seam is arithmetic rather than a texel), and the two
      axes come out at about the same world size, 0.026 to 0.029 of the eye's radius, which at the
      compact size the disc is drawn is about one CSS pixel. That is the fineness limit of everything
      the SIMULATION can say: it is why the volume, and not the grid, is what the gas is made of.

   2. THE VELOCITY IS KINEMATIC, NOT SOLVED. There is no pressure projection and no velocity state:
      the velocity at a point is a closed-form function of the point, the clock and a handful of
      parameters. A projection would cost a dozen passes to buy incompressibility, and the one thing
      incompressibility is FOR — that gas is neither manufactured nor destroyed by the flow — is
      bought here instead by construction: the curl of a stream function is divergence-free by
      definition, a point vortex is divergence-free, and the shear is a rotation. Only the radial
      drift is not, and it is the one term that is meant to compress (a tightening) or rarefy (an
      expansion) the ring.

   3. THE VOLUME TEXTURE IS THE ONE THE FIELD ALREADY HAS, AND IT IS ALSO WHAT THE GAS IS MADE OF.
      The stream function and the emission pattern are both fetched out of nebulaField's 64³ noise — four octaves in four channels, built
      once per session — so this module allocates no texture of its own but the two it ping-pongs.
      The emission is sampled in POLAR space for the reason the landing's gas is (see nebulaField (4)):
      a whole number of repeats per turn, so the pattern closes on itself at the back of the ring.

   4. IT RUNS ON ITS OWN CLOCK, AT 60Hz. The look of a semi-Lagrangian field depends on how many
      times it has been resampled, so a 120Hz machine would otherwise show visibly softer gas than a
      60Hz one. The accumulator below fixes the step, which also halves the simulation's cost on a
      120Hz display and makes the rest of this file's numbers mean one thing everywhere.

   5. HALF-FLOAT, WITH A HONEST 8-BIT FALLBACK. RGBA16F is what this wants and what WebGL 2 gives it
      on anything current. Where the colour-buffer-float extensions are missing it runs in 8 bits,
      where the difficulty is that a multiplicative decay of a small value rounds back to itself and
      gas never dies; `uQuant` is a FLOOR under that decay — where a tick's multiplicative loss is
      smaller than half a quantisation step, the difference is taken off as well — so every parcel
      still reaches zero without the flat per-tick drain that cost the 8-bit path a third of its gas
      (review of 18.09.26). Verified: 30 seconds at no emission read back exactly zero.

   WHAT IS IN THE TEXTURE. R is density. G is density x (tone + 0.5) — the tone a parcel is wearing,
   carried WITH it and premultiplied so that advection and decay treat the two channels alike, which
   is what lets a swatch's lightness stay with the eddy it belongs to instead of smearing across the
   ring. Tone is a position on the page's own neutral ladder, never a hue: this field knows nothing
   about the photograph's colour and is not told any (procField.js). B and A are unused. */

import * as THREE from 'three';

const SIM = {
  /** The grid: angle x radius. At the ring's own radius 384 columns put a texel 0.029 of the eye's
      radius apart and the 96 rows put one 0.026 apart across the band — an isotropic grid, to within
      a tenth, in the space the gas actually flows in, and 37k texels in total. At the size the disc
      is drawn that is about one texel to the CSS pixel, which is why the volume rather than the grid
      is what grains the gas (nebulaField, uFlowGrain). */
  cols: 384,
  rows: 96,
  /** The domain. It starts inside the eye (the render clears the eye itself) and reaches well past
      the resting rim, because the whole point is that a kick can throw gas outside the ring; what
      leaves has somewhere to go and dies there (`edgeKill`) rather than piling up on the last row.
      IT FOLLOWS THE GEOMETRY. The band was widened for the flow's first pass and the disc came back
      as a lumpy wreath with a small faceted hole in it; the proportions the user actually approved
      are the narrower ones (procField FREE), and the grid follows them. The 96 rows now cover 2.45
      radii instead of 3.05, which is also a fortieth of a radius finer per row. */
  rMin: 0.85,
  rMax: 3.30,
  /** The resting ring: where the gas is emitted, as a Gaussian band, so the gas runs from about 1.1
      to 2.5 radii with its weight at 1.8. Everything in this file is in units of the eye's radius,
      which is what keeps it independent of the size the caller draws the disc at (procField FREE).
      `rc` is a RESTING value rather than a constant now: the caller moves it (params.rc) to make the
      ring breathe while the live reading is out, which is the one motion the atmosphere has during
      a wait that has no length. The emission band moves with it and the spring below drags the gas
      after it, so the breath is the body moving rather than a brightness changing. */
  rc: 1.80,
  width: 0.66,
  /** Simulation rate, and the most catch-up steps one frame may pay for. See (4). */
  hz: 60,
  maxSteps: 3,
  /** How hard gas fades once it is past the resting rim, per second, so a shed wisp thins out in the
      air instead of reaching the edge of the grid. */
  edgeKill: 2.2,
  /** And how hard the eye takes what drifts into it, per second. See the shader's note: without it
      the grid's inner row is a source rather than a boundary. */
  eyeKill: 4.5,
  /** The most vortices and injection points the shader carries. The palette is five swatches by
      default and the app's own maximum is well under eight; the taps are a rate rather than a count,
      and six slots hold every one that is still alive at the beat step 1 asks for (one every 220ms,
      each living six tenths of a second), with room for the three the reading light carries. */
  maxEddies: 8,
  maxSparks: 6,
};

/* The resting parameters — one revolution's worth of behaviour with nothing happening. Every one of
   these is moved at runtime by the caller's envelopes (procField.js), so they are the FLOOR the
   atmosphere returns to between beats rather than constants. */
const REST = {
  /** Differential rotation, rad/s, as the residual of a Keplerian profile about the ring's radius:
      inner gas laps outer gas, which is what shears an emitted patch into an arc. Zero AT the ring's
      radius by construction, so the band as a whole does not drift against the rigid turn.
      IT IS THE ATMOSPHERE'S PULSE. The first pass eased the shear DOWN to 0.72 of this while the
      live reading was out, and that is what killed the picture: with the flow near steady and the
      emission steady, a semi-Lagrangian field reaches a fixed point and the streaks stop moving. The
      measured frame-to-frame change over that stretch was the lowest of the whole run — the longest
      step of the reading had the deadest gas. Shear is the one term that keeps gas moving RELATIVE
      to its neighbours, so no beat takes it below 1 any more. */
  shear: 0.92,
  /** Curl-noise amplitude. The units are the stream function's own; at 1 the gas moves about 2.5
      radii a second, which is a gale, so the resting value is a fifth of that and the loudest beat
      asks for three times it. */
  turb: 0.22,
  /** Radial drift (+ outward) and the pull of the band back onto its own radius, both in radii per
      second. `tighten` is what a step uses to condense the ring; at rest it is a whisper. */
  radial: 0,
  tighten: 0.15,
  /** Where the ring wants to be, in the same units, and the depth of the two-arm spiral the gas is
      born on. THE ARMS ARE IN THE EMISSION, NOT IN THE RENDER. The first pass turned the field's own
      log-spiral arms off (procField PROC.look armDepth) on the correct argument that a fixed spiral
      painted over a flowing field is a structure that cannot answer to anything. Putting the same
      spiral in the EMISSION answers that: gas is BORN on the arms and then advected, so the shear
      winds them, a vortex tears them, and the grouping step can fade them out as the palette's cells
      take the ring over — arms giving way to cells is the picture of chaos resolving into order. Two
      arms rather than three or five because two is symmetric: the disc stays balanced however hard
      the arms are driven, and the first pass's worst frames were the lopsided ones. */
  rc: SIM.rc,
  arm: 0.55,
  /** Emission per second and the decay that balances it. THE LIFETIME IS A CHOREOGRAPHY FIGURE, not
      a physical one: it is how long the field takes to answer a beat, and a step of the reading is
      three quarters of a second. At a 2.8s life the grouping step handed the gas five eddies and the
      picture on screen was still mostly the gas from the sampling step; at 1.6s a beat is legible
      inside its own line and a filament still runs a good arc of the ring before it goes. The two
      figures are set together, because emit/decay IS the resting density and that is what the
      renderer's knee is written against (nebulaField, uThreshold). */
  emit: 0.75,
  decay: 0.62,
  /** How much of the eddies is in play, and how much the emission gathers into them. Both are zero
      until the grouping step has swatches to build them from. */
  split: 0,
  lobes: 0,
};

const VERT = `
out vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position, 1.0); }`;

/* One tick of the field. Every fragment is one (angle, radius) cell: it works out where the gas in
   this cell came from, reads it there, decays it and adds this cell's own emission. */
const FRAG = `
precision highp float;
precision highp sampler3D;

uniform sampler2D uState;
uniform sampler3D uNoise;
uniform vec2  uR;          // rMin, rMax
uniform float uDt, uTime;
uniform float uRc, uWidth;
uniform float uShear, uTurb, uRadial, uTighten;
uniform float uEmit, uDecay, uSplit, uLobes, uArm, uEdge, uEye, uQuant;
uniform int   uEddyN;
uniform vec4  uEddy[MAX_EDDIES];      // x, z, circulation, core radius
uniform float uEddyTone[MAX_EDDIES];  // the swatch's place on the neutral ladder, -0.5..0.5
uniform vec4  uSpark[MAX_SPARKS];     // x, z, rate, radius
uniform float uSparkTone;

in vec2 vUv;
out vec4 outState;

const float TAU = 6.28318530718;

/* THE STREAM FUNCTION, out of the field's own volume. Two octaves at two scales, with the third
   texture axis walked as time, so the turbulence evolves rather than translating. The curl of it is
   taken below by central difference, which is four fetches — the one place in here that costs
   anything, and it buys a velocity field that is divergence-free by construction (see (2)). */
float pot(vec2 x) {
  /* THE THIRD AXIS IS TIME, AND ITS RATE IS THE WHOLE DIFFERENCE BETWEEN GAS AND A PATTERN. A field
     emitted steadily into a steady flow reaches a steady state: the streaks stop moving, because
     everything the advection does is already done. It looked exactly like that at 0.05 — a shape
     that turned and did not live. At 0.17 the volume walks a lattice cell of the coarse octave in
     something under two seconds, so an eddy forms, carries gas and is gone inside a beat or two of
     the reading and the density never catches the flow up; at 0.3 the gas broke into scraps too
     small to follow. The emission below churns at 0.12 for the same reason and by the same test. */
  vec4 n = texture(uNoise, vec3(x * 0.30 + 0.5, uTime * 0.17));
  return n.g + n.b * 0.55;
}

void main() {
  float th = vUv.x * TAU;
  float r  = mix(uR.x, uR.y, vUv.y);
  vec2 rh = vec2(cos(th), sin(th));
  vec2 tg = vec2(-rh.y, rh.x);
  vec2 x  = rh * r;

  const float E = 0.05;
  vec2 vel = vec2(pot(x + vec2(0.0, E)) - pot(x - vec2(0.0, E)),
                 -(pot(x + vec2(E, 0.0)) - pot(x - vec2(E, 0.0)))) * (uTurb / (2.0 * E));
  // The radial terms: a drift the beats push outward or inward, and a weak spring that holds the
  // band on its own radius so an expansion recovers instead of leaving the ring hollow.
  vel += rh * (uRadial - uTighten * (r - uRc));

  /* THE VORTICES, and the gas they gather. Each one is a swirl whose speed rises to a peak at its
     core radius and falls away outside it (the 1/(q + c²) form, windowed so a vortex on one side of
     the ring does not stir the other side), plus a bell of emission around the same centre. The
     windows are what make "as many eddies as there are swatches" read as separate cells rather than
     as one lumpy ring. */
  /* AND THEY DO NOT STIR THE EYE. Five point vortices spaced round a ring superpose, near the middle
     of that ring, into a five-fold radial pattern: gas pushed outward at five angles and inward
     between them, which carves a five-pointed star out of the hole. On a light page that reads as a
     rosette on the ring's outer edge and is rather beautiful; on a dark page the hole IS the picture
     and what comes back is a symbol. The cells' velocity is faded out toward the inner edge so the
     eye stays an eye in both themes, and what the palette's structure shapes is the body of the
     ring. The term is not divergence-free any more once it is windowed, which costs nothing here:
     every velocity in this file is kinematic and the ring's own spring is what conserves the band. */
  float ew = smoothstep(1.05, 1.85, r);
  float lobe = 0.0, toneW = 0.0, toneSum = 0.0;
  for (int i = 0; i < uEddyN; i++) {
    vec2 d = x - uEddy[i].xy;
    float c = uEddy[i].w, cc = c * c;
    float q = dot(d, d);
    vel += (uSplit * uEddy[i].z * ew) * vec2(-d.y, d.x) / (q + cc) * exp(-q / (9.0 * cc));
    float g = exp(-q / (2.25 * cc));
    lobe = max(lobe, g);
    toneSum += g * uEddyTone[i];
    toneW += g;
  }

  /* THE BACKWARD TRACE, in the grid's own axes. The angular velocity is the shear plus whatever the
     rest of the field contributes tangentially; the rigid turn is deliberately absent (see (1)). */
  float omega = uShear * (pow(uRc / r, 1.5) - 1.0) + dot(vel, tg) / r;
  float vr = dot(vel, rh);
  vec2 from = vUv - vec2(omega * uDt / TAU, vr * uDt / (uR.y - uR.x));
  vec2 s = texture(uState, from).rg;

  /* THE EMISSION. A Gaussian band, cleared out of the eye, laid on two spiral arms, broken up by
     noise fetched in polar space at a whole number of repeats per turn so the pattern closes at the
     back of the ring, and gathered into the eddies as the grouping step asks for it. */
  /* The inner cut is a RAMP, not a lip. It ran 0.92 to 1.16 — a quarter of a radius — and against a
     renderer whose own inner softening is measured in the same units that is a wall: the gas arrived
     at the eye with an edge on it, which on a dark page is the whole picture, since there the hole
     is what you look at. Over 0.90 to 1.32 the emission thins into the eye instead. */
  float band = exp(-pow((r - uRc) / uWidth, 2.0)) * smoothstep(0.90, 1.32, r);
  /* FOUR REPEATS PER TURN, and the octave weights are a SIZE decision rather than a taste one. The
     ring is about 220 CSS pixels round at the size this is drawn, so a feature the eye can follow is
     a tenth of it: the coarse octave puts eight of them round the turn, the next sixteen, and the
     last two are detail rather than structure. It was four times finer again for one recording and
     the disc came back reading as a dotted gear rather than as gas.
     AND IT HAS A FLOOR, which is the correction the first pass most needed. A smoothstep from 0.30
     to 0.78 over noise is a SWITCH: two thirds of the ring is emitting nothing at any moment, and
     with the shear carrying those holes round they became permanent gaps — the recording shows a
     crescent with a clot on one side rather than a body. The field's own LOOK says this in as many
     words about its threshold ("a narrow band is a switch, so the gas is either there or it is not,
     and a rotating body does not have edges like that"); the emission has to obey the same sentence.
     A third of the weight everywhere, the rest on the noise, and the ring is continuous with a
     gradient running through it. */
  vec4 pn = texture(uNoise, vec3(vUv.x * 4.0, r * 3.4, uTime * 0.12));
  // Named mottle rather than the obvious thing: patch is a reserved word in GLSL ES 3.00.
  float mottle = 0.34 + 0.86 * smoothstep(0.18, 0.86, pn.r * 0.40 + pn.g * 0.30 + pn.b * 0.20 + pn.a * 0.10);
  /* THE TWO ARMS (see REST.arm). A log spiral in the SIMULATION's own frame, so it turns with the
     ring and the shear winds it: gas born on an arm is carried, stretched and eventually torn off
     it, which is the feathering the disc had before a flow drove it and could not have kept by
     painting the spiral over the top. cos(2θ) is invariant under a full turn, so the seam at the
     back of the ring does not exist here either. */
  float arm = 0.60 + 0.40 * cos(2.0 * (th + 1.30 * log(r)));
  mottle *= mix(1.0, arm, uArm);
  /* THE CELLS MARK THE RING, THEY DO NOT REPLACE IT. The gather ran as lobe x 2.2 for one recording,
     which is emission ONLY where an eddy is: the ring emptied between the cells and the grouping
     step read as the atmosphere dying rather than as it organising. Nearly two thirds of the weight
     between cells and most of it again on top of them says the same thing about where the gas is
     gathering and keeps the body it is gathering from. The TONE rides uSplit rather than this, so a
     swatch's lightness arrives with its eddy at full strength however gently the gas gathers. */
  /* AND THEY DO NOT REACH THE EYE. On a light page the cells read as bulges on the ring's outer
     edge; on a dark one the eye is the shape you actually see, and a gather that thins the emission
     BETWEEN the cells all the way to the inner rim cuts five points into it — the recording came
     back with a five-pointed star in the middle of the disc, which is a symbol rather than gas. The
     gather is faded out toward the inner edge, so the eye stays an eye in both themes and the
     palette's structure is written on the body of the ring where it belongs. */
  float gather = mix(1.0, 0.62 + 0.85 * lobe, uLobes * ew);
  float em = uEmit * band * mottle * gather;
  float tone = (toneW > 1e-4 ? toneSum / toneW : 0.0) * uSplit;

  /* THE SAMPLING TAPS (step 1). Small, brief, bright injections at points the caller picks around
     the ring; the shear draws each one out into a streak within its own lifetime, which is the whole
     read of the field being sampled rather than shown. They arrive further along the ladder than the
     gas around them, so they tell on a light page as well as on a dark one. */
  float spark = 0.0;
  for (int i = 0; i < MAX_SPARKS; i++) {
    vec2 d = x - uSpark[i].xy;
    float w = max(uSpark[i].w, 1e-3);
    spark += uSpark[i].z * exp(-dot(d, d) / (w * w));
  }
  float emT = em * tone + spark * uSparkTone;
  em += spark;

  /* WHAT THE TWO EDGES OF THE GRID DO, and one of them is not cosmetic. Gas past the resting rim
     thins out in the air (uEdge). Gas carried INTO the eye is taken by it (uEye), and that term is
     load-bearing: the backward trace clamps at the bottom row, so any inward drift there reads its
     own value back for ever — a row that never empties and, through the bilinear filter, a source of
     gas nobody emitted. It showed as a hard black lip around the eye. Killing the density at the lip
     is both the honest picture (the eye swallows what reaches it) and the fix. */
  float k = exp(-(uDecay + uEdge * smoothstep(uR.y - 0.7, uR.y, r)
                  + uEye * (1.0 - smoothstep(uR.x + 0.06, uR.x + 0.40, r))) * uDt);
  // The tone channel is premultiplied by density and carries +0.5 so it never goes negative — the
  // 8-bit fallback has no sign, and the half-float path costs nothing for the same convention.
  vec2 next = vec2(s.r * k + em * uDt, s.g * k + (emT + em * 0.5) * uDt);
  /* THE 8-BIT DRAIN IS A FLOOR UNDER THE DECAY, NOT A RATE ON TOP OF IT. Subtracting uQuant from
     every parcel every tick is 0.141 density a second at 60Hz, which against a resting decay of
     0.62/s costs about a sixth of the gas where the ring is densest and nearly half where the mottle
     floors: measured at a third less gas on screen than the half-float path (review of 18.09.26).
     What the fallback actually needs is only to stop a small value rounding back to itself, so the
     drain now tops the multiplicative decay up to uQuant where that decay moved less than one
     quantisation step, and is zero everywhere else. Both channels are scaled by the same fraction, so
     a parcel's tone — g/r, which the renderer divides out — survives the floor untouched. */
  float dq = max(uQuant - s.r * (1.0 - k), 0.0);
  float fr = next.r > 1e-6 ? max(next.r - dq, 0.0) / next.r : 0.0;
  outState = vec4(next * fr, 0.0, 1.0);
}`;

/** Returns null when the grid cannot be allocated at all — the caller then runs the field without a
    flow, which is the rigid atmosphere it had before this module existed and which it still keeps a
    set of figures for (procField RIGID). A machine with no float colour buffer is NOT that case: it
    gets the same simulation in 8 bits, see (5).
    `renderer` and `noise` are nebulaField's own, so nothing here allocates a second context or a
    second copy of the 1MB volume. */
export function createSmokeFlow(renderer, noise) {
  const ext = renderer.extensions;
  const half = ext.has('EXT_color_buffer_half_float') || ext.has('EXT_color_buffer_float');
  // 8 bits is a real fallback rather than a refusal (see (5)); only a context with neither is out.
  const type = half ? THREE.HalfFloatType : THREE.UnsignedByteType;

  const make = () => {
    const rt = new THREE.WebGLRenderTarget(SIM.cols, SIM.rows, {
      type,
      format: THREE.RGBAFormat,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      // The angle axis closes on itself and the radius does not — the same pair the ramp wears.
      wrapS: THREE.RepeatWrapping,
      wrapT: THREE.ClampToEdgeWrapping,
      depthBuffer: false,
      stencilBuffer: false,
    });
    return rt;
  };
  let a, b;
  try { a = make(); b = make(); } catch (e) { return null; }

  const params = { ...REST };
  const eddy = [], eddyTone = new Array(SIM.maxEddies).fill(0), spark = [];
  for (let i = 0; i < SIM.maxEddies; i++) eddy.push(new THREE.Vector4(0, 0, 0, 1));
  for (let i = 0; i < SIM.maxSparks; i++) spark.push(new THREE.Vector4(0, 0, 0, 1));

  const uniforms = {
    uState: { value: a.texture },
    uNoise: { value: noise },
    uR: { value: new THREE.Vector2(SIM.rMin, SIM.rMax) },
    uDt: { value: 1 / SIM.hz },
    uTime: { value: 0 },
    uRc: { value: SIM.rc },
    uWidth: { value: SIM.width },
    uShear: { value: REST.shear },
    uTurb: { value: REST.turb },
    uRadial: { value: REST.radial },
    uTighten: { value: REST.tighten },
    uEmit: { value: REST.emit },
    uDecay: { value: REST.decay },
    uSplit: { value: REST.split },
    uLobes: { value: REST.lobes },
    uArm: { value: REST.arm },
    uEdge: { value: SIM.edgeKill },
    uEye: { value: SIM.eyeKill },
    // Half a quantisation step and a little, in the 8-bit path only. See (5).
    uQuant: { value: half ? 0 : 0.6 / 255 },
    uEddyN: { value: 0 },
    uEddy: { value: eddy },
    uEddyTone: { value: eddyTone },
    uSpark: { value: spark },
    uSparkTone: { value: 0.3 },
  };

  const material = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms,
    defines: { MAX_EDDIES: SIM.maxEddies, MAX_SPARKS: SIM.maxSparks },
    depthTest: false,
    depthWrite: false,
  });
  const scene = new THREE.Scene();
  const camera = new THREE.Camera();
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  quad.frustumCulled = false;
  scene.add(quad);

  let acc = 0, disposed = false;

  function tick(dt) {
    uniforms.uDt.value = dt;
    uniforms.uTime.value += dt;
    uniforms.uShear.value = params.shear;
    uniforms.uTurb.value = params.turb;
    uniforms.uRadial.value = params.radial;
    uniforms.uTighten.value = params.tighten;
    uniforms.uEmit.value = params.emit;
    uniforms.uDecay.value = params.decay;
    uniforms.uSplit.value = params.split;
    uniforms.uLobes.value = params.lobes;
    uniforms.uArm.value = params.arm;
    uniforms.uRc.value = params.rc;
    uniforms.uState.value = a.texture;
    const prev = renderer.getRenderTarget();
    renderer.setRenderTarget(b);
    renderer.render(scene, camera);
    renderer.setRenderTarget(prev);
    const t = a; a = b; b = t;
  }

  return {
    material,
    /** The live parameter block. The caller's envelopes write into it every frame; it is read into
        the uniforms at the top of each tick rather than on every write, so a beat can move six of
        these in one frame for the cost of six property sets. */
    params,
    /** What those parameters are when nothing is happening. The caller's beats are multipliers on
        these rather than absolute figures, so the resting atmosphere is described in exactly one
        place and a beat says what it CHANGES. */
    rest: { ...REST },
    /** Where the grid's two edges are, in the same units the renderer measures radius in. */
    range: [SIM.rMin, SIM.rMax],
    get texture() { return a.texture; },

    /** The reading's structure, as vortices. `list` is [{ angle, radius, circulation, core, tone }]
        in the SIMULATION's frame — which is the disc's frame minus the rigid turn, so a vortex given
        a fixed angle rides round with the ring exactly as the gas does. `tone` is a signed offset on
        the page's neutral ladder. Beyond SIM.maxEddies is dropped rather than folded in. */
    setEddies(list) {
      const n = Math.min((list || []).length, SIM.maxEddies);
      for (let i = 0; i < n; i++) {
        const e = list[i];
        eddy[i].set(Math.cos(e.angle) * e.radius, Math.sin(e.angle) * e.radius, e.circulation, Math.max(e.core, 0.06));
        eddyTone[i] = Math.max(-0.5, Math.min(0.5, e.tone || 0));
      }
      uniforms.uEddyN.value = n;
    },
    /** The sampling taps, as [{ x, z, rate, radius }] in the same frame. Empty slots carry a rate of
        zero, which costs the shader an exp it throws away rather than a branch it cannot predict. */
    setSparks(list) {
      for (let i = 0; i < SIM.maxSparks; i++) {
        const s = (list || [])[i];
        if (s) spark[i].set(s.x, s.z, s.rate, s.radius);
        else spark[i].set(0, 0, 0, 1);
      }
    },

    /** One frame's worth of simulation, at the fixed rate (4). `dt` is the ticker's, in seconds. */
    step(dt) {
      if (disposed) return;
      const h = 1 / SIM.hz;
      acc = Math.min(acc + Math.max(dt, 0), h * SIM.maxSteps);
      let n = 0;
      while (acc >= h && n++ < SIM.maxSteps) { acc -= h; tick(h); }
    },
    /** Runs the field forward without showing it, so the first frame anyone sees is gas that has
        already been flowing rather than an empty ring filling in. Paid once per generation, inside
        the mount, and it is also the whole of what the reduced-motion still frame shows. */
    warm(seconds) {
      if (disposed) return;
      const h = 1 / SIM.hz, n = Math.max(0, Math.round(seconds * SIM.hz));
      for (let i = 0; i < n; i++) tick(h);
    },
    /** Back to an empty grid and the resting parameters: a new generation starts from nothing, the
        way the disc scaling up from half size says it does. */
    reset() {
      Object.assign(params, REST);
      uniforms.uEddyN.value = 0;
      uniforms.uTime.value = 0;
      acc = 0;
      this.setSparks(null);
      const prev = renderer.getRenderTarget();
      const c = renderer.getClearColor(new THREE.Color()), ca = renderer.getClearAlpha();
      renderer.setClearColor(0x000000, 0);
      [a, b].forEach((rt) => { renderer.setRenderTarget(rt); renderer.clear(true, false, false); });
      renderer.setClearColor(c, ca);
      renderer.setRenderTarget(prev);
    },
    /** Links this program with the field's own, for the reason nebulaField.compile() exists — and
        with the render target BOUND, because three keys a program on the target's colour space and a
        compile against the canvas would be linked again the first time it ran into a float target. */
    compile() {
      if (disposed) return;
      const prev = renderer.getRenderTarget();
      renderer.setRenderTarget(b);
      try { renderer.compile(scene, camera); } catch (e) { }
      renderer.setRenderTarget(prev);
    },
    destroy() {
      disposed = true;
      quad.geometry.dispose();
      material.dispose();
      a.dispose(); b.dispose();
    },
  };
}
