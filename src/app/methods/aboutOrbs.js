/* THE ORBS, ON /about — the landing's own particle field, borrowed rather than rebuilt.

   createOrbField (src/app/orbField.js) is the WebGL cloud the front page's ring formation is made
   of: one draw call, one lit sphere per orb, and a cursor push field that opens the cloud where the
   pointer goes. It takes centres in scene pixels and is told nothing about rings — the landing owns
   that formula and hands it results. So a second caller costs nothing but a different formula, and
   the formula here is the simplest one there is: an orb sits wherever the layout put its slot.

   WHY IT BELONGS ON THIS PAGE. /about argues that a palette is an atmosphere rather than a list of
   values, and the page has to show that, not assert it. Each orb wears the palette of the photograph
   beside it, on a body that is lit, turning and slightly alive — the same object the front page
   opens with, standing next to the image it was read from. Between the photograph and the row of hex
   values, it is the middle term: the picture, the feeling, the numbers.

   ONE CONTEXT, ANY NUMBER OF SLOTS. The canvas is a single fixed, full-viewport, pointer-transparent
   layer on document.body, and every frame each orb's centre is recomputed from its slot's live
   getBoundingClientRect. That is what lets orbs sit in ordinary flow boxes anywhere down the page,
   scroll with them exactly (the rect IS the scroll position — there is nothing to synchronise, and
   nothing for Lenis's smoothed scroll to fall out of step with), and still share one WebGL context.
   Browsers cap live contexts at roughly sixteen per page; one canvas per orb is the ceiling the
   landing itself had to consolidate away from, and there is no reason to walk back into it here.

   Fixed on BODY rather than inside the route, deliberately: a transform or an opacity below 1 on any
   ancestor makes that ancestor the containing block for position:fixed, and the wipe tweens both on
   the route's own wrapper. Inside the tree the layer would be dragged with the page mid-transition.

   THE FLOOR IS THE PAGE WITHOUT IT. No WebGL 2, no GSAP, reduced motion, a lost context, or no slots
   at all → nothing is inserted and the destroy is inert. The slots are empty boxes; the photograph
   above them and the palette below them carry the section on their own.

   LOADED ON DEMAND, and — as orbit.js's own note on this says at length — that is not an optimisation
   to be tidied away into a static import. orbField.js pulls in three, ~130 kB gzipped, which the
   build otherwise keeps out of the main chunk entirely; importing it at the top of this file puts it
   in front of every visitor to every route, including the tool, for the sake of nine orbs on one
   page. Dynamically, three arrives after /about has painted and the orbs fade up when it lands. That
   is also why reveal() below has to tolerate being called before the field exists: the page's own
   arrival will usually beat the chunk, and it must not wait for it. */

function noop() { }

// Particles per orb, and their size as a fraction of the orb's radius. Both are the landing's front
// ring restated at this scale: it runs 760 particles at grain 2.3 on a 42px orb, which is a grain of
// 0.11 radii. Coverage is what the eye reads, and coverage holds when the grain tracks the radius —
// so the count is a constant and only the grain is per-viewport. DENSER than the landing's, because
// these orbs are static and much larger: a formation of 116 turning orbs can afford to be sparse in
// a way one orb standing still beside a photograph cannot.
const COUNT = 1800;
const GRAIN = 0.075;

export function initAboutOrbs(root) {
  const gsap = window.gsap;
  if (!gsap || !root) return noop;
  try { if (window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches) return noop; } catch (e) { }
  // WebGL 2 specifically — orbField's shader is GLSL 3. Probed before the import rather than after,
  // so a browser that cannot draw the orbs never downloads three at all.
  try { if (!document.createElement('canvas').getContext('webgl2')) return noop; } catch (e) { return noop; }

  const slots = [].slice.call(root.querySelectorAll('[data-orb-slot]'));
  if (!slots.length) return noop;

  // Each slot names its own palette. The hexes are the ones the strip under it draws, written into
  // the markup rather than looked up, because the markup is also what the no-JS prerender ships —
  // one place says what this palette is, and it is the place a reader can see.
  const built = slots.map((el) => {
    const hexes = (el.getAttribute('data-orb-hexes') || '')
      .split(',').map((s) => s.trim()).filter((s) => /^#[0-9a-fA-F]{6}$/.test(s));
    return { el, hexes };
  }).filter((s) => s.hexes.length);
  if (!built.length) return noop;

  const sizeOf = (el) => {
    const r = el.getBoundingClientRect();
    const radius = Math.max(Math.min(r.width, r.height) / 2, 8);
    return { radius, pointSize: Math.max(radius * GRAIN, 1.4) };
  };

  let alive = true;
  let wanted = null;     // a reveal() that arrived before the chunk did
  let canvas = null;
  let field = null;
  let lastW = window.innerWidth, lastH = window.innerHeight;

  import('../orbField.js').then((m) => {
    // Torn down while the chunk was in flight — a route swap is faster than a 130 kB download more
    // often than not, and building here would leak a canvas onto the page we just left.
    if (!alive || !root.isConnected) return;

    canvas = document.createElement('canvas');
    canvas.setAttribute('data-about-orbs', '1');
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:5;pointer-events:none;opacity:0';
    document.body.appendChild(canvas);

    field = m.createOrbField(canvas, built.map((s) => {
      const size = sizeOf(s.el);
      return {
        hexes: s.hexes,
        radius: size.radius,
        count: COUNT,
        pointSize: size.pointSize,
        opacity: 1,
        depth: 1,
        saturation: 1,
      };
    }));
    if (!field) { try { canvas.remove(); } catch (e) { } canvas = null; return; }

    /* [ATMOS] THE `-live` SIGNAL, and this module is late to it. Every other effect on this page says
       in the DOM when it is actually running, so CSS can hold a floor until then; the orbs never did,
       because until now their slots were decoration and an empty slot cost nothing. The lens bodies
       changed that: their slots ARE the swatch, painted as a disc so the figure still states two
       colours without WebGL, and that disc has to step back the moment a real sphere is drawing over
       it. Set here rather than at init, because everything above this line can still fail — no WebGL
       2, a lost context, or the orbField chunk never arriving. */
    try { root.setAttribute('data-orbs-live', '1'); } catch (e) { }

    gsap.ticker.add(tick);
    field.onContextLost(() => { destroy(); });
    // Whether the page's arrival has already run or is still to come, the orbs come up on the same
    // token — they are simply late by however long the chunk took.
    if (wanted) fade(wanted);
  }, () => { /* the chunk never arrived; the page is already complete without it */ });

  /* One frame. Centres are written in the field's own scene space — origin at the viewport centre,
     y counting UP — from each slot's rect, which is already in viewport coordinates. An orb whose
     slot is well off-screen is parked far away rather than skipped: the cloud springs toward its
     home every frame, so leaving a home stale would have the orb drift, and moving it back would
     then be a visible flight across the page the moment you scrolled to it. */
  function tick(time, deltaMS) {
    if (!alive || !field) return;
    const dt = Math.min(0.05, (deltaMS || 16.7) / 1000);
    const vw = window.innerWidth || 1, vh = window.innerHeight || 1;
    if (vw !== lastW || vh !== lastH) {
      lastW = vw; lastH = vh;
      field.setSizes(built.map((s) => sizeOf(s.el)));
    }
    const ctr = field.centers;
    for (let i = 0; i < built.length; i++) {
      const r = built[i].el.getBoundingClientRect();
      ctr[i * 2] = (r.left + r.width / 2) - vw / 2;
      ctr[i * 2 + 1] = -((r.top + r.height / 2) - vh / 2);
    }
    field.update(dt);
  }

  function destroy() {
    if (!alive) return;
    alive = false;
    // The discs come back as the spheres go, including on a lost context — otherwise the lens
    // figure is left holding two boxes with nothing drawn in them.
    try { root.removeAttribute('data-orbs-live'); } catch (e) { }
    try { gsap.ticker.remove(tick); } catch (e) { }
    if (canvas) { try { gsap.killTweensOf(canvas); } catch (e) { } }
    if (field) { try { field.destroy(); } catch (e) { } field = null; }
    if (canvas) { try { canvas.remove(); } catch (e) { } canvas = null; }
  }

  function fade(motion) {
    if (!alive || !canvas) return;
    const m = motion || {};
    gsap.to(canvas, { opacity: 1, duration: m.duration || 0.62, ease: m.ease || 'power3.out' });
  }

  /* Nothing on this site simply appears. The layer is inserted at opacity 0 and brought up on the
     page's own arrival token, released by the same call that plays the reveal — so on a wiped
     arrival the orbs come up behind the cover's trailing edge with the copy, rather than being
     already there when it lifts. Latched, because the chunk usually lands after that call. */
  return Object.assign(destroy, {
    reveal(motion) {
      if (!alive) return;
      wanted = motion || {};
      fade(wanted);
    },
  });
}
