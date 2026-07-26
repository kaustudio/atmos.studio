/* The landing's orbs, rebuilt as ONE particle cloud.

   This replaces the per-orb renderer stack (a raw-WebGL canvas per orb over a painted DOM stack,
   `public/vendor/orb-shader.js` + `_paintOrbitTiles`). The reason is a hard ceiling rather than a
   taste: browsers cap live WebGL contexts at roughly sixteen per page and silently kill the oldest
   past it, so `ORB_GL_MAX` capped the shaded formation at twelve orbs. Every orb added past that
   made the formation LESS shaded, not more. Consolidating onto one context makes the orb count a
   free parameter — which is what the dense, small formation the contract now describes needs — and
   it hands the whole formation to a single cursor-push pass instead of thirty-three isolated ones.

   The physics is `src/notfound/particleField.js`'s, which is `@canvas-ui/particle-object`'s: radial
   escape + tangential swirl + a shove along the direction of travel, a spring back home, damping,
   and per-particle drift. Those constants are the effect's own and are kept as-authored.

   The lighting is `orb-shader.js`'s, ported from a per-orb fragment shader to a per-PARTICLE vertex
   shader — same distance-graded key light, same depth gate, same specular pair, same fresnel rim.
   It survives the move because every term it needs is available per particle without a per-frame
   upload: the orb's centre is `position - aNormal * radius`, and the lamp is one global uniform.
   That keeps the invariant the contract calls load-bearing — the ONE global light is global, and
   every directional cue answers to where the orb actually is in the room.

   Three deliberate departures from the 404's field, all because the subject is a ring formation in
   screen space rather than one floating object:

   - THE CAMERA IS ORTHOGRAPHIC, and its frustum is the viewport in CSS pixels, so one scene unit is
     one pixel. `_ringGeom` already solves the formation in pixels; this way its output is fed in
     untouched. It also collapses the push field: under an ortho camera looking down −z, the ray
     through the cursor IS the line x=mx, y=my, so the ray-to-particle distance the original
     computes with a Raycaster and two matrix inversions is `hypot(px−mx, py−my)`, and the swirl
     cross-product against the ray direction (0,0,−1) reduces to (ry,−rx,0). Same field, no
     Raycaster, no inverse matrices, no world-per-pixel conversion.

   - HOMES MOVE. The original samples a still image once and springs to a fixed rest state; here the
     rest state is the turning ring set, so `update()` takes fresh orb centres every frame and the
     home is rebuilt per particle from a fixed unit offset on its orb's sphere. The engine stays the
     only owner of position (contract §1), and there is still exactly one clock.

   - NOTHING IS DEPTH-TESTED. The original leans on depthWrite to sort a solid; a ring set is
     already sorted — by ring — so the buffer is built deepest ring first and drawn in that order
     with the depth buffer off. Painter's order, one draw call, no sort artifacts on the soft dots. */

import * as THREE from 'three';

const DEFAULTS = {
  /** Push-field radius in CSS pixels — the cursor's reach into the formation. About three front-ring
      orbs across, so the cursor disturbs a neighbourhood rather than one orb or a whole arc. */
  radius: 145,
  strength: 1,
  swirl: 0.6,
  spring: 1,
  damping: 0.35,
  /** Idle wander amplitude, in CSS pixels. */
  drift: 1.1,
  /** How far the whole formation leans toward the cursor, in CSS pixels. A whisper by design. */
  lean: 14,
  /** Viewport fractions — the one room light every orb answers to. */
  light: { x: 0.3, y: 0.28 },
};

/* Accelerations are in px/s² because the scene is in pixels. The spring (60·spring) and the damping
   are rates, so they carry over from the original unchanged; these two are the only figures that had
   to be re-expressed, and they are sized against the spring: held at PUSH_ACCEL against stiffness
   60, a particle settles ~30px from home — over half an orb's diameter here, so the cloud plainly
   opens around the cursor, but it opens rather than disperses. The distinction matters more than it
   does on the 404, because a cursor left resting on an orb holds that state indefinitely: at the
   original's weight the orb nearest a PARKED pointer did not open, it vaporised into a comet, and
   an orb that can be deleted by leaving the mouse still is not an object.

   The shove — the component along the cursor's direction of travel — is a THIRD of the original's
   relative weight, and that is the one figure that had to be judged rather than converted. On the
   404 it smears a 900px word, where a 120px displacement is a detail; here it hits a 42px orb, and
   at the original's weight a fast sweep did not open an orb so much as drag it into a streak, which
   is a different object rather than a disturbed one. */
const PUSH_ACCEL = 1800;
const SHOVE_ACCEL = 700;

const VERT = `
in vec3 aNormal;
in vec3 aColor;
in vec4 aParams;   // x: orb radius px, y: point size px, z: opacity, w: ring depth
in float aSeed;
out vec3 vColor;
out float vAlpha;
out float vCore;
uniform float uTime;
uniform float uDrift;
uniform float uDpr;
uniform vec2 uLamp;
uniform float uFar;

void main() {
  vec3 p = position;

  // idle wander — the original's, re-expressed in pixels
  float t = uTime + aSeed * 39.0;
  p += uDrift * vec3(
    sin(t * 1.7 + aSeed * 61.0),
    cos(t * 1.3 + aSeed * 23.0),
    sin(t * 2.3 + aSeed * 47.0));

  float dep = aParams.w;
  // The orb this particle belongs to, recovered rather than uploaded. Under push the derived centre
  // drifts with the particle, which is what keeps a displaced particle carrying its own shading.
  vec3 center = position - aNormal * aParams.x;

  // ONE fixed room light. Near the lamp it sits high (frontal, soft terminator); far away it grazes
  // (low z, hard directional shading) and exposure falls off — two orbs across the ring are visibly
  // lit differently. Identical to orb-shader.js, with u_m computed here instead of passed in.
  vec2 toLamp = uLamp - center.xy;
  float dist = length(toLamp);
  float m = min(1.0, dist / max(uFar, 1.0));
  vec2 l2 = toLamp / max(dist, 1e-4);
  vec3 L = normalize(vec3(l2 * (0.55 + 0.80 * m), mix(0.95, 0.34, m)));
  float li = 1.0 - m * 0.25;

  float dif = clamp(dot(aNormal, L) * 0.5 + 0.5, 0.0, 1.0);
  dif = pow(dif, mix(1.15, 1.6, m));
  // ring depth gates the key light: at the back the lamp barely reaches — shading flattens toward
  // ambient and the terminator softens; the key belongs to the front of the room.
  dif = mix(0.48, dif, mix(0.30, 1.0, dep));
  vec3 col = aColor * (0.34 + 0.72 * dif) * (1.05 - 0.20 * m);

  /* Specular: one lobe rather than the original's anisotropic pair — the stretch term encoded a
     travel smear the ring speed evaluates to 1, and a point sprite has no axis to stretch along.
     Tighter and weaker than the solid's, because a highlight spread over a dotted surface is not a
     highlight: every dot inside it becomes a white speck, and enough white specks read as noise
     laid over the orb rather than as light falling on it. */
  vec3 H = normalize(L + vec3(0.0, 0.0, 1.0));
  float sp = pow(clamp(dot(aNormal, H), 0.0, 1.0), 64.0);
  col += vec3(1.0, 0.98, 0.94) * sp * 0.30 * li * dep * dep;

  /* Fresnel rim opposite the light, at the limb. Also pulled well back: on a solid the limb is a
     thin band, but under an orthographic camera |n.z| is small across the whole outer THIRD of the
     projected disc, so the original's mix carried its blue-grey over far more of the orb than it
     was ever meant to and took the palette down with it. */
  float fr = pow(1.0 - abs(aNormal.z), 3.4);
  float away = clamp(dot(normalize(aNormal.xy + 1e-4), -l2), 0.0, 1.0);
  col += mix(aColor, vec3(0.72, 0.79, 0.92), 0.26) * fr * away * (0.13 + 0.20 * m) * (0.35 + 0.65 * dep);

  /* The painted tile finished on saturate(1.25) contrast(1.04) — the palette's own cast, given a
     stronger voice so near-neutrals diverge instead of merging. The same correction is owed here
     and matters more: the shading terms above all pull toward white or grey, and dots average
     together in a way a continuous surface does not. */
  float grey = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = mix(vec3(grey), col, 1.24);

  vColor = col;
  vAlpha = aParams.z;
  // The back rings carried a CSS blur for depth; a point sprite gets the same read from a softer
  // falloff, which costs nothing and cannot be magnified by scale the way the blur could.
  vCore = mix(0.0, 0.15, dep);

  float jitter = 1.0 + (fract(aSeed * 7.13) - 0.5) * 0.3;
  gl_PointSize = clamp(aParams.y * uDpr * jitter, 0.0, 64.0);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`;

const FRAG = `
precision highp float;
in vec3 vColor;
in float vAlpha;
in float vCore;
out vec4 outColor;

void main() {
  vec2 c = gl_PointCoord - 0.5;
  float r2 = dot(c, c);
  float alpha = (1.0 - smoothstep(vCore, 0.25, r2)) * vAlpha;
  if (alpha < 0.01) discard;
  outColor = vec4(vColor, alpha);
}`;

const hexToRgb = (hex) => {
  const v = parseInt(String(hex).replace('#', ''), 16);
  return Number.isFinite(v) ? [(v >> 16 & 255) / 255, (v >> 8 & 255) / 255, (v & 255) / 255] : [0.5, 0.5, 0.5];
};

/* Unit offsets on a sphere. A Fibonacci lattice rather than a random shell because at these counts
   random clumps read as blemishes on something the formation is asking you to see as a solid; the
   lattice is even at every count. `pull` seats a minority of particles inside the surface so the orb
   has a little body under its skin instead of reading as a hollow shell at the limb. */
function sphereOffsets(count, rng) {
  const out = new Float32Array(count * 3);
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / Math.max(count - 1, 1)) * 2;
    const r = Math.sqrt(Math.max(1 - y * y, 0));
    const a = golden * i;
    // jitter along the lattice so the spiral itself never becomes the thing you see
    const pull = i % 4 === 0 ? 0.62 + rng() * 0.3 : 0.95 + rng() * 0.05;
    out[i * 3] = Math.cos(a) * r * pull;
    out[i * 3 + 1] = y * pull;
    out[i * 3 + 2] = Math.sin(a) * r * pull;
  }
  return out;
}

/** Returns null when WebGL is unavailable or there are no orbs — the caller keeps its painted floor.
    `orbs` is one entry per orb, deepest ring first:
      { hexes, radius, count, pointSize, opacity, depth, saturation } */
export function createOrbField(canvas, orbs, options = {}) {
  const config = { ...DEFAULTS, ...options };
  if (!Array.isArray(orbs) || !orbs.length) return null;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: true,
      powerPreference: 'high-performance',
    });
  } catch {
    return null;
  }
  // The landing's own surface is the background; the field never paints one of its own.
  renderer.setClearAlpha(0);

  const scene = new THREE.Scene();
  // Frustum in CSS pixels, origin at the viewport centre, y up. Set for real in resize().
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -4000, 4000);
  camera.position.set(0, 0, 1000);

  const material = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    uniforms: {
      uTime: { value: 0 },
      uDrift: { value: config.drift },
      uDpr: { value: 1 },
      uLamp: { value: new THREE.Vector2() },
      uFar: { value: 800 },
    },
  });

  // ---- Build. Everything here is static for the life of the field: only `position` is rewritten.
  const rng = (() => { let s = 0x9e3779b9; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; })();

  const orbCount = orbs.length;
  let total = 0;
  for (const o of orbs) total += Math.max(Math.round(o.count) || 0, 1);

  const positions = new Float32Array(total * 3);
  const offsets = new Float32Array(total * 3);   // the particle's fixed place on its orb, in px
  const normals = new Float32Array(total * 3);
  /* How deep under the skin this particle sits, as a fraction of its orb's radius. Kept because the
     shader recovers the orb's centre as `position − aNormal · aParams.x`: for a particle seated
     inside the surface that distance is NOT the orb's radius, and using the radius there would put
     the centre — and so every light direction derived from it — in the wrong place. */
  const pulls = new Float32Array(total);
  const colors = new Float32Array(total * 3);
  const params = new Float32Array(total * 4);
  const seeds = new Float32Array(total);
  const orbIndex = new Int32Array(total);

  let cursorIx = 0;
  orbs.forEach((orb, oi) => {
    const n = Math.max(Math.round(orb.count) || 0, 1);
    const radius = orb.radius || 20;
    const unit = sphereOffsets(n, rng);
    const palette = (orb.hexes && orb.hexes.length ? orb.hexes : ['#8a8a8a']).map(hexToRgb);
    const sat = orb.saturation === undefined ? 1 : orb.saturation;
    for (let j = 0; j < n; j++) {
      const i = cursorIx + j;
      const i3 = i * 3;
      const u3 = j * 3;
      const ux = unit[u3], uy = unit[u3 + 1], uz = unit[u3 + 2];
      const len = Math.hypot(ux, uy, uz) || 1;
      normals[i3] = ux / len; normals[i3 + 1] = uy / len; normals[i3 + 2] = uz / len;
      offsets[i3] = ux * radius; offsets[i3 + 1] = uy * radius; offsets[i3 + 2] = uz * radius;
      pulls[i] = len;

      /* The orb's MATERIAL, and nothing else — no highlight, no terminator, no rim, exactly as the
         painted tile was forbidden to carry them. Which colour a particle wears is a function of
         where it sits on the sphere, so hue TRAVELS across the body the way the reference palettes
         were chosen to make it (see _orbitRefPalettes) instead of the orb reading as one flat mood.

         It is a continuous RAMP through the palette, not a swatch per particle. Picking a discrete
         swatch is what the painted tile could afford, because there it was a region of a gradient;
         here it is one 2px dot next to another 2px dot holding a different swatch, and at this
         grain the eye does the averaging — five swatches dithered together came out as grey noise
         with the palette nowhere in it. Interpolating instead puts the same hue travel across the
         body as a gradient the eye can actually read, which is the whole point of the formation. */
      const ramp = Math.min(Math.max((ux * 0.55 + uy * 0.84) * 0.5 + 0.5 + (rng() - 0.5) * 0.1, 0), 1)
        * (palette.length - 1);
      const lo = Math.floor(ramp), hi = Math.min(lo + 1, palette.length - 1), mix = ramp - lo;
      const a = palette[lo], b = palette[hi];
      const c = [a[0] + (b[0] - a[0]) * mix, a[1] + (b[1] - a[1]) * mix, a[2] + (b[2] - a[2]) * mix];
      // Ring desaturation is per-ring and static, so it is baked here rather than costing a uniform.
      const grey = c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722;
      colors[i3] = grey + (c[0] - grey) * sat;
      colors[i3 + 1] = grey + (c[1] - grey) * sat;
      colors[i3 + 2] = grey + (c[2] - grey) * sat;

      params[i * 4] = radius * len;
      params[i * 4 + 1] = orb.pointSize || 2;
      params[i * 4 + 2] = orb.opacity === undefined ? 1 : orb.opacity;
      params[i * 4 + 3] = orb.depth === undefined ? 1 : orb.depth;
      seeds[i] = rng();
      orbIndex[i] = oi;
      // Start at home so the first frame is the formation, not an implosion from the origin.
      positions[i3] = offsets[i3];
      positions[i3 + 1] = offsets[i3 + 1];
      positions[i3 + 2] = offsets[i3 + 2];
    }
    cursorIx += n;
  });

  const geometry = new THREE.BufferGeometry();
  const positionAttr = new THREE.BufferAttribute(positions, 3);
  positionAttr.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('position', positionAttr);
  geometry.setAttribute('aNormal', new THREE.BufferAttribute(normals, 3));
  geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('aParams', new THREE.BufferAttribute(params, 4));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));

  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  scene.add(points);

  const velocities = new Float32Array(total * 3);
  // Written by update() before every simulate(); x,y in scene px, deepest ring first.
  const centers = new Float32Array(orbCount * 2);

  let viewW = 1;
  let viewH = 1;

  function resize() {
    const width = Math.max(canvas.clientWidth, 1);
    const height = Math.max(canvas.clientHeight, 1);
    const pr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(pr);
    renderer.setSize(width, height, false);
    material.uniforms.uDpr.value = pr;
    viewW = width; viewH = height;
    camera.left = -width / 2; camera.right = width / 2;
    camera.top = height / 2; camera.bottom = -height / 2;
    camera.updateProjectionMatrix();
    // Screen y counts down, scene y counts up.
    material.uniforms.uLamp.value.set((config.light.x - 0.5) * width, -(config.light.y - 0.5) * height);
    material.uniforms.uFar.value = width * 0.45;
  }

  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();

  // ---- Cursor. Tracked on window rather than on the canvas so the field can stay
  // pointer-events:none and still react as the cursor approaches from outside it.
  let pointerX = 0;
  let pointerY = 0;
  let pointerActive = false;
  let pointerSpeed = 0;
  let lastPointerX = 0;
  let lastPointerY = 0;
  let lastPointerTime = 0;
  let shoveX = 0;
  let shoveY = 0;
  let leanX = 0;
  let leanY = 0;

  function onPointerMove(event) {
    const rect = canvas.getBoundingClientRect();
    // straight into scene space: centred, y up
    pointerX = event.clientX - rect.left - rect.width / 2;
    pointerY = -(event.clientY - rect.top - rect.height / 2);
    const now = performance.now();
    if (pointerActive && lastPointerTime) {
      const dt = Math.max((now - lastPointerTime) / 1000, 1e-3);
      const dx = pointerX - lastPointerX;
      const dy = pointerY - lastPointerY;
      const speed = Math.hypot(dx, dy) / dt;
      pointerSpeed += (speed - pointerSpeed) * 0.35;
      if (speed > 1) {
        const inv = 1 / Math.max(Math.hypot(dx, dy), 1e-3);
        shoveX += (dx * inv - shoveX) * 0.4;
        shoveY += (dy * inv - shoveY) * 0.4;
      }
    }
    lastPointerX = pointerX;
    lastPointerY = pointerY;
    lastPointerTime = now;
    pointerActive = true;
  }

  function onPointerLeave() {
    pointerActive = false;
    pointerSpeed = 0;
    lastPointerTime = 0;
  }

  window.addEventListener('pointermove', onPointerMove, { passive: true });
  // Fires when the cursor leaves the window entirely; a touch that ends is the same thing here.
  document.addEventListener('pointerleave', onPointerLeave, { passive: true });
  window.addEventListener('pointercancel', onPointerLeave, { passive: true });

  function simulate(delta) {
    const p = positions;
    const v = velocities;
    const off = offsets;

    const stiffness = 60 * Math.max(config.spring, 0.05);
    const dampingRate = 3 + 12 * Math.min(Math.max(config.damping, 0), 1);
    const decay = Math.exp(-dampingRate * delta);
    const swirl = Math.min(Math.max(config.swirl, 0), 2);

    const pushing = pointerActive && config.strength > 0;
    const radius = Math.max(config.radius, 1);
    const r2max = radius * radius;
    const pushAccel = PUSH_ACCEL * config.strength;
    const shove = Math.min(pointerSpeed / 900, 2) * SHOVE_ACCEL * config.strength;

    for (let i = 0; i < total; i++) {
      const ix = i * 3;
      const iy = ix + 1;
      const iz = ix + 2;
      const c = orbIndex[i] * 2;
      const hx = centers[c] + off[ix];
      const hy = centers[c + 1] + off[iy];
      const hz = off[iz];

      let vx = v[ix];
      let vy = v[iy];
      let vz = v[iz];

      if (pushing) {
        /* Distance to the cursor's RAY, not to a point — the field is a cylinder through the scene,
           so it reaches every particle the cursor is over regardless of its depth. Under the ortho
           camera that ray is the line x=pointerX, y=pointerY, so the whole thing is 2D. */
        const rx = p[ix] - pointerX;
        const ry = p[iy] - pointerY;
        const dist2 = rx * rx + ry * ry;
        if (dist2 < r2max) {
          const dist = Math.sqrt(dist2);
          const inv = 1 / Math.max(dist, 1e-5);
          const nx = rx * inv;
          const ny = ry * inv;
          const fall = 1 - dist / radius;
          const f = fall * fall * delta;
          // tangential = cross(rayDir (0,0,−1), radial (nx,ny,0)) = (ny, −nx, 0)
          vx += (nx + ny * swirl) * pushAccel * f + shoveX * shove * f;
          vy += (ny - nx * swirl) * pushAccel * f + shoveY * shove * f;
          // a little toward the camera, so a disturbed orb opens rather than only spreading
          vz += 0.35 * pushAccel * f;
        }
      }

      vx += (hx - p[ix]) * stiffness * delta;
      vy += (hy - p[iy]) * stiffness * delta;
      vz += (hz - p[iz]) * stiffness * delta;
      vx *= decay;
      vy *= decay;
      vz *= decay;
      p[ix] += vx * delta;
      p[iy] += vy * delta;
      p[iz] += vz * delta;
      v[ix] = vx;
      v[iy] = vy;
      v[iz] = vz;
    }

    positionAttr.needsUpdate = true;
  }

  let disposed = false;

  return {
    /** Scene-space cursor, for callers that want to place something else against the same field. */
    get pointer() { return { x: pointerX, y: pointerY, active: pointerActive }; },
    /** Scene px per orb, deepest ring first — the engine's own ring formula, handed in untouched. */
    centers,
    resize,
    /* One frame. The engine writes `centers` and calls this from ITS ticker, so the formation keeps
       exactly one clock (contract §3) and the field never integrates a rotation of its own. */
    update(delta) {
      if (disposed) return;
      const dt = Math.min(Math.max(delta, 0), 1 / 30);
      material.uniforms.uTime.value += dt;
      pointerSpeed *= Math.exp(-3 * dt);
      /* The whole formation leans a little toward the cursor. The per-particle push is local — it
         opens the orbs the cursor is actually over — and on its own it leaves the rest of the ring
         set inert; this is the part that answers to the cursor everywhere, and it is deliberately
         small enough that the formation never reads as sliding. */
      const targetX = pointerActive ? (pointerX / Math.max(viewW / 2, 1)) * config.lean : 0;
      const targetY = pointerActive ? (pointerY / Math.max(viewH / 2, 1)) * config.lean : 0;
      const ease = 1 - Math.exp(-2.4 * dt);
      leanX += (targetX - leanX) * ease;
      leanY += (targetY - leanY) * ease;
      points.position.set(leanX, leanY, 0);
      if (dt > 0) simulate(dt);
      renderer.render(scene, camera);
    },
    /* Resize without a rebuild. Orb DIAMETERS track the viewport (contract §4) but particle COUNTS
       must not: re-sampling the cloud mid-drag is far too expensive, and a count that changes with
       the window would change how dense an orb reads from one screen to the next, which is the one
       thing the formation is not allowed to do. So the count is fixed at build and the two figures
       that are genuinely per-viewport — the orb's radius and its grain — are rewritten in place.
       `sizes` is per orb in the SAME order as the build list, deepest ring first. */
    setSizes(sizes) {
      if (disposed || !Array.isArray(sizes) || sizes.length !== orbCount) return;
      for (let i = 0; i < total; i++) {
        const s = sizes[orbIndex[i]];
        if (!s) continue;
        const i3 = i * 3;
        const seat = s.radius * pulls[i];
        offsets[i3] = normals[i3] * seat;
        offsets[i3 + 1] = normals[i3 + 1] * seat;
        offsets[i3 + 2] = normals[i3 + 2] * seat;
        params[i * 4] = seat;
        params[i * 4 + 1] = s.pointSize;
      }
      geometry.getAttribute('aParams').needsUpdate = true;
    },
    setOptions(next) {
      Object.assign(config, next);
      material.uniforms.uDrift.value = Math.max(config.drift, 0);
      resize();
    },
    /** Best-effort context teardown, so the caller can put the painted floor back. */
    onContextLost(handler) {
      canvas.addEventListener('webglcontextlost', (ev) => { ev.preventDefault(); handler(); }, false);
    },
    destroy() {
      disposed = true;
      observer.disconnect();
      window.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerleave', onPointerLeave);
      window.removeEventListener('pointercancel', onPointerLeave);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    },
  };
}
