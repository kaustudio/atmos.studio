/* THE LANDING'S FIELD, REBUILT AS ONE VOLUME.

   This replaces `orbField.js` — the single-context particle cloud that drew a hundred-odd colour
   orbs as sprites — and with it the whole per-orb renderer stack beneath it (`orb-shader.js`, the
   painted DOM orb tiles). The formation is no longer objects arranged in rings; it is gas, raymarched
   through a disc that turns around the middle of the screen with the brand copy sitting in its hole.

   WHAT THE ORBS WERE FOR AND WHAT SURVIVES. The ring set existed to put the product's subject on the
   screen before a word of it was read: colour arranged as a spectrum, turning, around the words.
   Every one of those properties is kept. What is given up is the ORB — a lit sphere with a
   terminator, a specular and a rim, answering to one room lamp. A volume has no surface, so it has
   none of those, and the lamp goes with them. What replaces the read is depth of a different kind:
   the camera is inside the same room the gas is in, so near gas occludes far gas and the disc has an
   inner wall you can see the far side of. That was accepted knowingly, and it is the whole trade.

   SIX THINGS ARE LOAD-BEARING, and each one is why a term in here looks the way it does.

   1. THE HOLE IS SOLVED, NOT DRAWN. The copy's clear radius is handed in as `inner`, in CSS pixels,
      exactly as `_ringGeom` handed the ring radii in. The camera is placed so that ONE scene unit on
      the disc's mid-plane is one `inner` on the screen: the ray through a pixel at screen radius r
      crosses y=0 at world radius r/inner. So "density is zero inside world radius 1" and "no gas
      within `inner` pixels of the centre" are the same sentence, and the guarantee survives every
      viewport without a second solve. It is the same guarantee the ring formation made — the copy is
      never painted over, by geometry rather than by a plate laid under the words.

   2. THE CAMERA IS ON THE AXIS; THE DISC IS WHAT TILTS. Looking straight down a flat annulus gives a
      clock face, and the two things that stop it being one are both here. The rays diverge from the
      middle, so a pixel far from the centre looks through the slab at an angle — a longer path
      through more gas, and a view of the inner wall of the far side. And the mid-plane is WARPED:
      one side of the ring rides high and the opposite side low, so the near half is seen face-on and
      the far half nearly edge-on, which is the read of a disc hanging in space rather than a ring
      drawn on the page. Tilting the CAMERA would have done the same job and moved the hole off the
      copy; warping the disc under a camera that stays on the axis keeps (1) exact. The warp is
      bounded rather than a true plane tilt, because the marching slab has to contain it.

   3. THE MARCH IS BOUNDED ANALYTICALLY. The gas lives in a slab |y| <= TH and the ray only ever
      travels downward, so the entry and exit are two divisions rather than a search — every pixel
      spends its whole sample budget inside the gas, and none of it stepping through vacuum. The two
      regions that hold no gas at all — the copy's hole and beyond the outer rim — are discarded
      before a single sample is taken, which is most of a widescreen viewport.

   4. THE NOISE IS FETCHED, NOT COMPUTED — AND IT IS FETCHED IN POLAR SPACE. Four octaves of tileable
      value noise are baked once into the RGBA channels of a 64^3 volume texture, so an octave is a
      texture read and four of them are one read and a dot product. Computing the same FBM from a
      hash — which is what the reference this grew out of does — is around forty ALU ops and eight
      dependent fetches per octave, per sample, per pixel, and at this screen coverage that is the
      difference between a landing that holds 60fps on integrated graphics and one that does not.
      What it is sampled IN matters as much as how. The axes are angle, height and radius rather than
      x, y and z: noise in x/z is isotropic, so a Cartesian field comes back as blobs, and a rotating
      disc does not contain blobs — shear stretches everything in it into arcs. Polar sampling gets
      those out of the geometry instead of out of a filter laid over it, and it costs nothing but a
      whole number of repeats per turn, which is what makes the seam at the back of the ring not
      exist. Two fetches at two vertical scales, for the reason written where they are.

   5. THE FIELD ANSWERS TO NOTHING BUT THE CLOCK. No pointer input of any kind — see the tombstone
      further down, where the interaction that was built and removed is recorded along with what went
      with it.

   6. THE COLOUR IS THE APP'S OWN OKLCH, BAKED. `ramp` is a strip built by the caller out of
      `gamutMap` — the same function every palette in the tool is mapped through — so the hue wheel
      the gas wears IS the reference wheel, at the tones the reference palettes were authored at,
      never an approximation of it in shader arithmetic. Hue is read off the SCREEN angle, so the
      spectrum stands still relative to the words and revolves as one wheel, while the gas swirls
      differentially through it. Neighbouring gas is neighbouring hue, which is the one property the
      twelve stations exist to protect.

   ROTATION IS RIGID, AND THE SPIRAL DOES NOT WIND UP. The twist is a fixed function of radius added
   to a single shared angle, so the arms hold their shape forever. Differential rotation — inner
   faster — is the physically honest version and it is wrong here: the landing can sit open for
   minutes, and any speed that varies with radius grinds the structure into a fine mush that arrives
   at a different image than the one it started as. The gas still evolves, but through the noise
   field's own slow churn, which has no accumulating geometry to destroy.

   NOTHING IS BLENDED. The quad covers the canvas exactly once, so the fragment is written straight
   over the framebuffer with premultiplied alpha and the BROWSER does the only compositing there is —
   source-over onto `--surface`. That is what lets one shader serve both themes: the volume emits and
   absorbs, and on paper the result is pigment suspended in the page while on a dark surface the same
   integration reads as light. It also means the output has to be premultiplied in ENCODED space, not
   linear — the page composites sRGB numbers — which is why the encode happens before the multiply. */

import * as THREE from 'three';

/* The volume texture. 64^3 x RGBA8 is 1MB and takes ~25ms to fill; both are paid once, inside the
   dynamically-imported chunk, well after the landing has painted. The four lattice sizes divide 64
   exactly, which is what makes each octave tile — a seam in an octave is a seam in the sky.

   AND NONE OF THEM IS FINER THAN A QUARTER OF THE GRID. 4/8/16/32 was here first and the last of
   those is the whole texture's worth of detail crammed into two voxels per lattice cell: the smooth
   interpolation it is supposed to have has nowhere to happen, so what gets baked is a checkerboard,
   and what came back on screen was a fine woven crosshatch through every dense region. 16 cells over
   64 voxels leaves four voxels a cell, which is the least that survives the bake and the hardware
   filter. The fine detail is bought by SAMPLING the volume at a higher frequency instead, which is
   free and has no such floor. */
const NOISE_N = 64;
const NOISE_OCTAVES = [2, 4, 8, 16];

/* Look. Every one of these is a number that was looked at rather than derived, so they are named and
   gathered instead of buried in the shader, and `setLook` can move any of them at runtime. */
const LOOK = {
  /** Camera height above the disc, in mid-plane units. It is ALSO the focal length — see (1); the two
      are one number and separating them would break the hole. Larger = flatter, less inner wall. */
  camera: 2.3,
  /** Half-thickness of the marched slab, mid-plane units. The march's whole budget lives in here. */
  slab: 0.46,
  /** The two vertical scales — see the shader's two-fetch comment. `squash` is the coarse pair's,
      and it is the layering you can see through; `flatten` is the fine pair's, and it is small
      because 48 samples cannot resolve fine vertical detail without turning it into a crosshatch. */
  squash: 1.4,
  flatten: 0.06,
  /* THE NOISE IS SAMPLED IN POLAR SPACE, and these three are its axes: how many times the field
     repeats around the ring, how fast it changes with radius, and how much the domain warp shears
     it. Cartesian sampling was here first and it is what made the field read as ink in water
     rather than as anything in the sky: noise in x/z is isotropic, so the gas came out as blobs, and
     a rotating disc does not contain blobs — shear stretches everything in it into arcs. Sampling
     (angle, height, radius) gets that for free, and the arcs come out of the geometry rather than
     out of a filter laid over it.
     `arcs` MUST BE A WHOLE NUMBER. The volume tiles at 1, so an integer number of repeats per turn
     is exactly what makes the seam at atan2's branch cut — a horizontal line running left from the
     centre of the screen — not exist. It is the COARSE fetch's count; the fine one takes four times
     it, so both stay whole. Anything that consumes the angle and is not invariant under a full turn
     will draw that line, which is also why `arms` below is an integer. */
  arcs: 3,
  radial: 0.55,
  warp: 0.88,
  /** The disc's mid-plane is not flat: one side of the ring rides high and the opposite side low, so
      the near half is seen face-on and the far half nearly edge-on. That difference is the whole
      read of a disc in space rather than a ring drawn on the page — and it is bought without tilting
      the camera, which would have put the hole off the copy. Bounded rather than a true plane tilt,
      because the marching slab has to contain it. */
  tilt: 0.34,
  /** The fixed twist: added angle = wind / (radius + 0.55). Sets how tightly the arms curl. */
  wind: 4.2,
  /** Log-spiral arms — count, pitch, and how deep the gaps between them cut. Subtle by intent: they
      organise the gas, they are not the subject, and a legible galaxy is a picture of a galaxy
      rather than an atmosphere. `armDepth` is the second thing that can fragment the field — at 0.55
      the inter-arm gaps were cutting more than half the density out and the arms read as separate
      objects, so it modulates the mass now rather than dividing it. */
  arms: 2.0,
  pitch: 5.0,
  armDepth: 0.30,
  /* Where the noise becomes gas, and over how wide a band — and the WIDTH is the single figure that
     decides whether this reads as one thing or as many. It was 0.16 and the field broke up into
     separate wisps with clear air between them: a narrow band is a switch, so the gas is either
     there or it is not, and a rotating body does not have edges like that. The reference this grew
     from runs a band half the height of its whole noise range for exactly this reason. Wide, and the
     density is a gradient the eye follows from one side of the disc to the other; that continuity is
     what makes it a mass rather than a scatter, and it is worth more than the extra definition a
     tighter band buys. */
  threshold: 0.32,
  soften: 0.44,
  /** Where the gas reaches full density and where it starts to go, both as fractions of the BAND
      between the hole and the rim. `rise` is the softness of the boundary the copy sits inside — the
      difference between an aperture and a horizon — and `fade` is how much of the band is spent
      running off the edges of the page. */
  rise: 0.40,
  fade: 0.58,
  /** Scale height at the hole, and how much it flares by the rim. */
  height: 0.15,
  flare: 0.85,
  /** Density and extinction — how much gas there is, and how fast it hides what is behind it. */
  density: 4.4,
  extinct: 3.0,
  /** Hue: how far the noise is allowed to pull a sample off its screen angle, in turns. A protractor
      is what this prevents; past about 0.06 neighbouring gas stops being neighbouring hue. */
  hueJitter: 0.045,
  /** The tone ladder: where in it the rim sits, how far the hole's edge climbs from there, and how
      much the noise itself moves a sample along it. 0 is the palette's lift, 1 its deepest.
      `toneNoise` is the third thing that fragments the field, and it does it in colour rather than in
      density: at 0.5 two neighbouring patches of gas were wearing tones far enough apart to read as
      two materials. Low, so the wheel — which is a function of WHERE the gas is — stays the thing
      that decides its colour, and the noise only shades it. */
  tone: 0.46,
  toneSlope: 0.30,
  toneNoise: 0.22,
  /* Exposure, coverage and the Reinhard shoulder. These were per-THEME until the ramp learned to
     solve its ladder against the page — three figures and a fourth (`tone`) all doing the same job,
     which was dragging a ramp authored for white paper onto a dark one. They are one set now, for
     both, because the ladder is symmetric about whatever surface it is sitting on. The shoulder is
     off: it exists to stop dense gas clipping toward white, and gas that is already anchored to the
     page's own lightness has nothing to clip. */
  gain: 1.12,
  cover: 1.0,
  toneMap: 0.0,
};

const VERT = `
void main() { gl_Position = vec4(position, 1.0); }`;

const FRAG = `
precision highp float;
precision highp sampler3D;

uniform sampler2D uRamp;
uniform sampler3D uNoise;
uniform vec2  uView;      // CSS px
uniform float uScale;     // drawing-buffer px per CSS px
uniform float uTime;      // seconds, from the engine's one ticker
uniform float uRot;       // radians, from the engine's one shared angle
uniform vec2  uInner;     // the copy's clear radii, CSS px — x and y, because the copy is not round
uniform float uOutN;      // the rim, in units of uInner (so the band scales with the hole)
uniform vec4  uMark;      // a second mark to clear: cx, cy in scene px, then its two radii
uniform float uMarkFade;  // how much of the gas that mark takes away; 0 disables the term exactly
uniform float uHue;       // per-visit rotation of the wheel, in turns
uniform float uDetail;    // how much of the finest octave the buffer can actually resolve, 0..1

uniform float uCamera, uSlab, uSquash, uFlatten, uArcs, uRadial, uWarp, uWind, uTilt;
uniform float uArms, uPitch, uArmDepth, uThreshold, uSoften, uRise, uFade;
uniform float uHeight, uFlare, uDensity, uExtinct, uHueJitter;
uniform float uTone, uToneSlope, uToneNoise, uGain, uCover, uToneMap;

out vec4 outColor;

const float TAU = 6.28318530718;
const int STEPS = 48;

/* Interleaved gradient noise, for the one place this shader needs a dither. A white-noise hash was
   here first and it is the wrong tool: its error is uncorrelated between neighbours, so the leftover
   integration error came out as speckle that reads as compression artefacts on flat gas. IGN spreads
   the same error over a fine ordered lattice the eye resolves as grain instead — which is what the
   stage is already wearing a layer of. Same cost, three constants. */
float dither(vec2 p) {
  return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715))));
}

vec3 srgbToLinear(vec3 c) {
  return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(vec3(0.04045), c));
}
vec3 linearToSrgb(vec3 c) {
  c = clamp(c, 0.0, 1.0);
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(vec3(0.0031308), c));
}

void main() {
  /* CSS pixels, centred, y up, then divided by the hole's two radii. THE HOLE IS AN ELLIPSE, and
     everything downstream lives in the space where it is a circle of radius 1. The copy is a wide,
     short block, and a round hole big enough to
     clear its corners wastes the whole top and bottom of a landscape viewport — measured at 800x500
     it left the gas a band 0.36 units wide with most of that off the screen. Matching the hole to the
     shape of what it is clearing is what puts the gas back on all four sides. The anisotropy is
     entirely in this one divide — the volume behind it is a clean round disc, so what the stretch
     costs is gas that is a little wider than it is tall, which is what a field around a wide block
     should look like anyway. */
  vec2 s = gl_FragCoord.xy / uScale - uView * 0.5;
  vec2 q = s / uInner;                       // the hole's boundary is exactly |q| = 1
  float qr = length(q);

  float outN = uOutN;
  /* The two dead regions, discarded before the march rather than marched and found empty — between
     them, most of a widescreen viewport. Both bounds are EXACT rather than generous: a ray falling
     from the camera keeps travelling outward, so by the bottom of the slab it is at world radius
     qr*(1 + slab/camera) and by the top at qr*(1 - slab/camera). Those two factors are the entire
     slack, and anything looser marches vacuum while anything tighter clips the gas. */
  float thick = uSlab + uTilt;                 // the warped mid-plane rides inside the same slab
  float spread = thick / uCamera;
  if (qr * (1.0 + spread) < 0.98 || qr * (1.0 - spread) > outN) discard;

  vec3 ro = vec3(0.0, uCamera, 0.0);
  // focal == camera height, so the mid-plane crossing lands at world radius qr. See (1).
  vec3 rd = normalize(vec3(q.x, -uCamera, q.y));
  float inv = -1.0 / rd.y;
  float t0 = (uCamera - thick) * inv;
  float t1 = (uCamera + thick) * inv;

  float dt = (t1 - t0) / float(STEPS);
  // Dithered start. Without it the step count bands visibly across gas this smooth; with it the
  // banding becomes grain, which the landing's own film-grain layer is already wearing.
  float t = t0 + dither(gl_FragCoord.xy) * dt;

  float churn = uTime * 0.014;

  vec3 acc = vec3(0.0);
  float trans = 1.0;

  for (int i = 0; i < STEPS; i++) {
    vec3 p = ro + rd * t;
    t += dt;
    float r0 = length(p.xz);
    if (r0 < 0.98 || r0 > outN) continue;

    float a = atan(p.z, p.x);
    // ONE shared angle plus a FIXED twist — rigid rotation, no winding. See the header.
    float ang = a - uRot - uWind / (r0 + 0.55);

    // The mid-plane, warped. Fixed in SCREEN space rather than carried round by uRot: it is standing
    // in for the angle the disc is being looked at from, and a camera does not orbit its subject.
    float hgt = p.y - uTilt * (p.z / max(r0, 1e-3));

    /* Polar sampling — angle, height, radius. The angle is carried in TURNS rather than pre-scaled,
       and that is the whole of what keeps the seam shut; see the two fetches below. */
    float turns = ang / TAU;
    float rad = r0 * uRadial;

    /* TWO FETCHES AT TWO VERTICAL SCALES, and the split is the whole reason this reads as a volume
       instead of as a painted gradient.

       The march takes 48 samples through the slab, so anything that varies vertically faster than
       about a tenth of a noise period per sample is being undersampled — and undersampled noise does
       not come back as texture, it comes back as a crosshatch. But vertical variation is ALSO the
       only thing that makes near gas different from far gas, which is the depth. One scale cannot
       serve both: squash it enough to be safe and the disc flattens into one sheet; open it enough
       to have layers and the fine octaves alias.

       So the coarse pair carries the layering, at a vertical scale the march can resolve, and the
       fine pair carries the filaments at a vertical scale that is nearly flat — its detail lives
       only in the two axes the ray crosses densely. The coarse fetch doubles as the domain warp for
       the fine one, which is the usual arrangement and costs nothing: two fetches, four octaves, and
       the weights still sum to one so the threshold below keeps its meaning. */
    /* AND EACH FETCH TAKES ITS OWN WHOLE NUMBER OF REPEATS, which is not a detail — it is the fix
       for a visible horizontal line running left from the centre of the screen.

       atan2's branch cut lies along the negative x axis, which in screen terms is exactly that line:
       crossing it, the angle jumps by a full turn. Every consumer of the angle here is invariant
       under that jump BY CONSTRUCTION — the arm term takes a whole number of cycles, the hue is read
       through fract() out of a texture that wraps — and the noise was supposed to be too, since the
       volume tiles at 1 and the angle was scaled to a whole number of repeats per turn. It was, and
       then each fetch multiplied the whole coordinate by its own scale: a jump of 4 repeats became
       2.48 tiles at 0.62 and 8.4 at 2.1, and a fetch that lands 0.48 of a tile away on one side of a
       line than the other draws that line. Scale the two axes that do not wrap and leave the one
       that does alone: the coarse pair takes uArcs repeats per turn and the fine pair four times
       that, an exact octave apart and both whole. */
    vec3 drift = vec3(churn, 0.0, -churn);
    vec4 lo = texture(uNoise, vec3(turns * uArcs, hgt * uSquash * 0.62, rad * 0.62) + drift);
    // Anisotropic, because the space is: angle and radius are the shear directions and want the whole
    // amplitude, height wants almost none of it for the reason above.
    vec3 warp = (lo.rgb - 0.5) * uWarp * vec3(1.0, 0.12, 1.0);
    vec4 hi = texture(uNoise, vec3(turns * uArcs * 4.0, hgt * uFlatten * 2.1, rad * 2.1) + warp - drift * 0.7);
    /* THE FINEST OCTAVE IS SPENT, NOT ASSUMED. Its weight moves into the one below it as the buffer
       gets smaller — a phone's hole is a third of a desktop's, so the same number of features around
       the ring lands on a third of the pixels, and detail the buffer cannot resolve does not come
       back as detail, it comes back as a moiré against the pixel grid. Shifting the weight rather
       than dropping it keeps the sum at one, so the threshold below keeps its meaning at every size.
       The angular repeat itself cannot be scaled for this: it has to stay a whole number per turn or
       the seam at the back of the ring reappears. */
    float n = dot(lo, vec4(0.44, 0.24, 0.0, 0.0))
            + dot(hi, vec4(0.0, 0.0, 0.20 + 0.12 * (1.0 - uDetail), 0.12 * uDetail));

    float dens = smoothstep(uThreshold, uThreshold + uSoften, n);
    /* Radial: rises out of the hole, falls away at the rim — and BOTH are measured against the band
       rather than against the disc. Fixed figures were the bug on a short viewport: the falloff
       started at 0.42 of the rim, which on a band running 1.0 to 1.36 is inside the hole, so the gas
       was fading out before it had begun. As fractions of the band the profile is the same picture
       at every viewport, which is the only way the artwork holds. */
    float band = max(outN - 1.0, 1e-3);
    dens *= smoothstep(1.0, 1.0 + uRise * band, r0);
    dens *= 1.0 - smoothstep(1.0 + uFade * band, outN, r0);
    // vertical: a scale height that flares outward, so the disc thickens as it leaves the middle
    float h = uHeight * (1.0 + uFlare * smoothstep(1.0, outN, r0));
    dens *= exp(-(hgt * hgt) / (h * h));
    // arms: a log spiral in the rotating frame
    float arm = 0.5 + 0.5 * cos(uArms * (a - uRot) + log(max(r0, 0.25)) * uPitch);
    dens *= mix(1.0 - uArmDepth, 1.0, arm);
    /* THE SECOND MARK. The hole clears the brand copy and nothing else, and the wordmark does not
       live in it — it is fixed at the top of the stage, in the middle of the densest gas. It carries
       mix-blend-mode:difference, which is a legibility mechanism that works against a light page and
       fails against a mid-luminance backdrop: |b − s| approaches b as b approaches a half, and a
       nebula on a dark surface spends most of its area right there. So the field thins behind it,
       the same way it is absent behind the copy — softly, over more than twice the mark's own box,
       so what it reads as is gas that happens to be thinner up there rather than a cut-out.
       The screen position of a sample is p.xz·uInner: exact on the mid-plane, and out by the slab's
       own thickness at its faces, which at this softness is nothing. */
    vec2 md = (p.xz * uInner - uMark.xy) / max(uMark.zw, vec2(1.0));
    dens *= 1.0 - uMarkFade * (1.0 - smoothstep(0.55, 1.0, length(md)));
    dens *= uDensity;
    if (dens < 0.002) continue;

    // Hue off the SCREEN angle (a, before the twist) so the wheel stands still against the words
    // and revolves as one body while the gas swirls through it.
    float hueU = fract((a + 3.14159265) / TAU + uHue + (n - 0.5) * uHueJitter);
    // The tone ladder runs outward: the palette's airy lift where the gas meets the copy, its deep
    // shadow out at the rim. That gradient is the annulus's near/far read, and it is also what keeps
    // the quietest colour against the words.
    float tone = clamp(uTone
      + (r0 - 1.0) / max(outN - 1.0, 1e-3) * uToneSlope
      + (n - 0.5) * uToneNoise, 0.0, 1.0);
    vec3 col = srgbToLinear(texture(uRamp, vec2(hueU, tone)).rgb);

    float alpha = 1.0 - exp(-dens * dt * uExtinct);
    acc += trans * alpha * col;
    trans *= 1.0 - alpha;
    if (trans < 0.012) break;
  }

  float cov = 1.0 - trans;
  if (cov < 0.004) discard;

  // The transmittance-weighted colour of the gas, then exposure and an optional Reinhard shoulder —
  // off on paper, where the volume is pigment and must not be lifted toward white.
  vec3 col = acc / cov * uGain;
  col = col / (1.0 + col * uToneMap);
  float a = clamp(cov * uCover, 0.0, 1.0);
  // Premultiplied in ENCODED space: the page composites sRGB numbers, not linear ones.
  outColor = vec4(linearToSrgb(col) * a, a);
}`;

/* Tileable value noise, four octaves, one per channel. The x pass is hoisted: for a given (z,y) row
   there are only `L` distinct lattice columns, so the row is blended in y and z once per lattice
   column and the 64 pixels across it are a single lerp each. That is the difference between ~25ms
   and a fifth of a second, and this runs on the main thread. */
function buildNoise(seed) {
  const N = NOISE_N;
  const data = new Uint8Array(N * N * N * 4);
  let state = (seed >>> 0) || 0x9e3779b9;
  const rnd = () => { state = (state * 1664525 + 1013904223) >>> 0; return state / 4294967296; };

  NOISE_OCTAVES.forEach((L, channel) => {
    const lat = new Float32Array(L * L * L);
    for (let i = 0; i < lat.length; i++) lat[i] = rnd();

    // per-axis lattice indices and smoothstep weights — exact, because L divides N
    const i0 = new Int32Array(N), i1 = new Int32Array(N), wt = new Float32Array(N);
    for (let x = 0; x < N; x++) {
      const u = (x / N) * L;
      const c = Math.floor(u);
      const f = u - c;
      i0[x] = c % L;
      i1[x] = (c + 1) % L;
      wt[x] = f * f * (3 - 2 * f);
    }

    const row = new Float32Array(L);
    for (let z = 0; z < N; z++) {
      const z0 = i0[z] * L * L, z1 = i1[z] * L * L, wz = wt[z];
      for (let y = 0; y < N; y++) {
        const y0 = i0[y] * L, y1 = i1[y] * L, wy = wt[y];
        for (let lx = 0; lx < L; lx++) {
          const a = lat[z0 + y0 + lx], b = lat[z0 + y1 + lx];
          const c = lat[z1 + y0 + lx], d = lat[z1 + y1 + lx];
          const m0 = a + (b - a) * wy, m1 = c + (d - c) * wy;
          row[lx] = m0 + (m1 - m0) * wz;
        }
        const base = ((z * N + y) * N) * 4 + channel;
        for (let x = 0; x < N; x++) {
          const v0 = row[i0[x]], v1 = row[i1[x]];
          data[base + x * 4] = (v0 + (v1 - v0) * wt[x]) * 255;
        }
      }
    }
  });

  const tex = new THREE.Data3DTexture(data, N, N, N);
  tex.format = THREE.RGBAFormat;
  tex.type = THREE.UnsignedByteType;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.wrapS = tex.wrapT = tex.wrapR = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}

/** Returns null when WebGL 2 will not start — the caller keeps its painted floor.
    `ramp` is { data: Uint8Array RGBA, width, height }: x is the hue wheel (wraps), y the tone ladder
    from the palette's lift at 0 to its deepest at 1. Built by the caller, out of the app's own OKLCH.
    The hole's radii and the rim come from the caller, per viewport — see setGeom. */
export function createNebulaField(canvas, ramp, options = {}) {
  if (!ramp || !ramp.data || !ramp.width || !ramp.height) return null;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: true,
      depth: false,
      stencil: false,
      powerPreference: 'high-performance',
    });
  } catch {
    return null;
  }
  // three has been WebGL 2 only since r163, so the constructor above is the real gate; this catches
  // a build where it is not.
  if (renderer.capabilities.isWebGL2 === false) { try { renderer.dispose(); } catch { } return null; }
  renderer.setClearAlpha(0);

  const look = { ...LOOK, ...(options.look || null) };
  const scene = new THREE.Scene();
  // The quad is written in clip space by the vertex shader, so the camera is a formality.
  const camera = new THREE.Camera();

  const rampTex = new THREE.DataTexture(ramp.data, ramp.width, ramp.height, THREE.RGBAFormat);
  rampTex.wrapS = THREE.RepeatWrapping;        // the wheel closes
  rampTex.wrapT = THREE.ClampToEdgeWrapping;   // the ladder does not
  rampTex.minFilter = THREE.LinearFilter;
  rampTex.magFilter = THREE.LinearFilter;
  rampTex.needsUpdate = true;

  const noiseTex = buildNoise(options.seed || 0x1f123bb5);

  const uniforms = {
    uRamp: { value: rampTex },
    uNoise: { value: noiseTex },
    uView: { value: new THREE.Vector2(1, 1) },
    uScale: { value: 1 },
    uTime: { value: 0 },
    uRot: { value: 0 },
    uInner: { value: new THREE.Vector2(options.innerX || 320, options.innerY || 200) },
    uOutN: { value: options.outN || 2.2 },
    uMark: { value: new THREE.Vector4(0, 0, 1, 1) },
    uMarkFade: { value: 0 },
    uHue: { value: options.hue || 0 },
    uDetail: { value: 1 },
  };
  // Every figure in LOOK becomes the uniform of the same name.
  const lookKey = (k) => 'u' + k[0].toUpperCase() + k.slice(1);
  Object.keys(LOOK).forEach((k) => { uniforms[lookKey(k)] = { value: look[k] }; });

  const material = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms,
    // The quad covers the canvas exactly once and nothing is drawn under it, so the fragment IS the
    // framebuffer. Blending would only re-derive what it already holds.
    transparent: true,
    blending: THREE.NoBlending,
    depthTest: false,
    depthWrite: false,
  });

  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  quad.frustumCulled = false;
  scene.add(quad);

  /* Render scale. Gas has no edges, so a drawing buffer below the CSS grid costs nothing the eye can
     find, and the march is the whole cost of this surface. DPR is deliberately NOT honoured: a 2x
     display would quadruple a per-pixel raymarch to sharpen something with no sharp part in it. */
  const SCALES = [0.8, 0.62, 0.46];
  let scaleIx = 0;

  /* How much of the finest octave this buffer can hold. Both terms matter and they are independent:
     the hole's size sets how many pixels a feature lands on, and the render scale sets how many of
     those are real. A machine the governor has stepped down loses the finest detail rather than
     aliasing it, which is the right way round. 210 is the geometric mean of the hole on a laptop —
     the size everything above was tuned at — so it is 1 there and falls from there. */
  function refreshDetail() {
    const v = uniforms.uInner.value;
    const d = (Math.sqrt(v.x * v.y) / 210) * (SCALES[scaleIx] / SCALES[0]);
    uniforms.uDetail.value = Math.min(1, Math.max(0.25, d));
  }

  function applySize() {
    const width = Math.max(canvas.clientWidth, 1);
    const height = Math.max(canvas.clientHeight, 1);
    renderer.setPixelRatio(SCALES[scaleIx]);
    renderer.setSize(width, height, false);
    uniforms.uView.value.set(width, height);
    uniforms.uScale.value = SCALES[scaleIx];
    refreshDetail();
  }

  const observer = new ResizeObserver(applySize);
  observer.observe(canvas);
  applySize();

  /* THE POINTER IS NOT AN INPUT HERE, and that is a decision rather than an omission.

     What stood in this block: a local advection — the sample read from where the gas came from, so
     it parted around the cursor and closed behind it, with the tangential term carrying pointer
     speed — plus a global lean of the whole field toward the pointer, eased and capped at 16px. Both
     worked, and both are gone by request. What they cost was a window-level pointermove listener, a
     speed integrator, two extra uniforms and about a dozen ALU on every one of the 48 samples per
     pixel; what they bought was a reading of the field as something being touched, which this
     surface does not need. The field is weather, and weather does not answer to a mouse.

     Nothing downstream is left half-wired: the uniforms, the listeners and the `pointer` accessor
     went with them, so a future pass adding an interaction back starts from a clean field rather
     than from a disabled one. */

  /* Quality governor. A single hitch is not a slow machine, so it takes a sustained run of long
     frames to step the buffer down, and it never steps back up: oscillating between two resolutions
     is more visible than the lower one. */
  let slow = 0;
  function govern(dt) {
    if (scaleIx >= SCALES.length - 1) return;
    if (dt > 0.024) { if (++slow > 90) { slow = 0; scaleIx++; applySize(); } }
    else if (slow) slow--;
  }

  let disposed = false;
  let tuner = null;

  return {
    resize: applySize,
    /** The hole's two radii in CSS pixels, and the rim as a multiple of them. Re-solved by the
        caller per viewport; nothing else about the field is per-viewport at all. */
    setGeom(innerX, innerY, outN) {
      uniforms.uInner.value.set(Math.max(innerX, 1), Math.max(innerY, 1));
      uniforms.uOutN.value = Math.max(outN, 1.15);
      refreshDetail();
    },
    /** A second, softer clearing — the wordmark's. Pass a falsy box to switch the term off entirely. */
    setMark(box) {
      if (!box) { uniforms.uMarkFade.value = 0; return; }
      uniforms.uMark.value.set(box.x, box.y, Math.max(box.rx, 1), Math.max(box.ry, 1));
      uniforms.uMarkFade.value = box.fade === undefined ? 0.82 : box.fade;
    },
    /* A NEW WHEEL, IN PLACE. The ramp is solved against the page it will sit on, so a theme switch
       is a different strip of colour rather than a different exposure on the same one — see the
       caller. Same dimensions every time, so this writes over the existing texture rather than
       allocating another: 32kB, one upload, no GPU churn, and nothing else about the field moves. */
    setRamp(next) {
      if (!next || !next.data || next.width !== ramp.width || next.height !== ramp.height) return;
      rampTex.image.data.set(next.data);
      rampTex.needsUpdate = true;
    },
    /* THE TUNER. Every figure in LOOK on a lil-gui panel, live, plus a button that prints the whole
       object as JSON so a tuned look can be pasted straight back into the LOOK block above — which
       is the only reason this exists. The reference shader this grew out of carried the same panel,
       and tuning a volumetric look by editing a constant and reloading is not tuning, it is guessing.

       DEV ONLY, AND OPT-IN INSIDE THAT. `import.meta.env.DEV` is a literal `false` in a production
       build, so the branch and the dynamic import both leave the bundle entirely — lil-gui is never
       fetched by a visitor and never appears in dist. The `?tune` in the URL is the second gate, so
       an ordinary `npm run dev` gets the landing rather than a control panel over it. */
    attachTuner(onChange) {
      if (!import.meta.env.DEV) return;
      import('lil-gui').then(({ default: GUI }) => {
        if (disposed) return;
        const gui = new GUI({ title: 'Landing field' });
        const apply = () => {
          Object.keys(look).forEach((k) => { const u = uniforms[lookKey(k)]; if (u) u.value = look[k]; });
          if (onChange) onChange(look);
        };
        const add = (folder, key, lo, hi, step) => folder.add(look, key, lo, hi, step).onChange(apply);
        const shape = gui.addFolder('Shape');
        add(shape, 'camera', 1.2, 6, 0.05);
        add(shape, 'slab', 0.1, 1.2, 0.01);
        add(shape, 'tilt', 0, 0.9, 0.01);
        add(shape, 'squash', 0.1, 3, 0.05);
        add(shape, 'flatten', 0.0, 0.6, 0.005);
        add(shape, 'arcs', 1, 8, 1);
        add(shape, 'radial', 0.05, 1.2, 0.01);
        add(shape, 'warp', 0, 2, 0.01);
        add(shape, 'wind', -6, 6, 0.05);
        const arms = gui.addFolder('Arms');
        add(arms, 'arms', 0, 6, 1);
        add(arms, 'pitch', -10, 10, 0.1);
        add(arms, 'armDepth', 0, 1, 0.01);
        const gas = gui.addFolder('Gas');
        add(gas, 'threshold', 0, 1, 0.01);
        add(gas, 'soften', 0.02, 0.8, 0.01);
        add(gas, 'density', 0.2, 10, 0.05);
        add(gas, 'extinct', 0.2, 8, 0.05);
        add(gas, 'height', 0.02, 0.6, 0.005);
        add(gas, 'flare', 0, 3, 0.05);
        const band = gui.addFolder('Band');
        add(band, 'rise', 0.02, 1, 0.01);
        add(band, 'fade', 0.02, 1, 0.01);
        const colour = gui.addFolder('Colour');
        add(colour, 'hueJitter', 0, 0.2, 0.005);
        add(colour, 'tone', 0, 1, 0.01);
        add(colour, 'toneSlope', -1, 1, 0.01);
        add(colour, 'toneNoise', -1, 1, 0.01);
        add(colour, 'gain', 0.1, 4, 0.01);
        add(colour, 'cover', 0.2, 2, 0.01);
        add(colour, 'toneMap', 0, 2, 0.01);
        gui.add({ copy: () => {
          const json = JSON.stringify(look, null, 2);
          try { navigator.clipboard.writeText(json); } catch (e) { }
          console.log(json);
        } }, 'copy').name('Copy LOOK as JSON');
        gui.close();
        tuner = gui;
      }, () => { });
    },
    /** Live handle on every figure in LOOK, by its own name. */
    setLook(next) {
      Object.keys(next || {}).forEach((k) => {
        if (!(k in look)) return;
        look[k] = next[k];
        const u = uniforms[lookKey(k)];
        if (u) u.value = next[k];
      });
    },
    get look() { return { ...look }; },
    /** One frame, from the engine's ticker: `rot` is the engine's one shared angle, in DEGREES, so
        the field never integrates a rotation of its own and the landing keeps exactly one clock. */
    update(delta, rot) {
      if (disposed) return;
      const dt = Math.min(Math.max(delta, 0), 1 / 30);
      uniforms.uTime.value += dt;
      uniforms.uRot.value = (rot || 0) * Math.PI / 180;
      govern(dt);
      renderer.render(scene, camera);
    },
    /** One frame at rest — the reduced-motion path, and the first frame under a cover. */
    renderStill(rot) {
      if (disposed) return;
      uniforms.uRot.value = (rot || 0) * Math.PI / 180;
      renderer.render(scene, camera);
    },
    onContextLost(handler) {
      canvas.addEventListener('webglcontextlost', (ev) => { ev.preventDefault(); handler(); }, false);
    },
    destroy() {
      disposed = true;
      if (tuner) { try { tuner.destroy(); } catch (e) { } tuner = null; }
      observer.disconnect();
      quad.geometry.dispose();
      material.dispose();
      rampTex.dispose();
      noiseTex.dispose();
      renderer.dispose();
    },
  };
}
