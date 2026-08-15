/* THE SPECTRUM PLOT — a palette, read as three measurements instead of five swatches.

   This is the page's science section made visible, and every number in it is the palette's own. Each
   dot carries the OKLCH coordinates of one real swatch, written into the markup by about.html:

     x  hue        where the colour sits on the hue circle, 0–360°
     y  lightness  0 at the floor, 1 at the ceiling
     r  chroma     the dot's diameter, so a muted colour is small and a vivid one large

   The three dimensions the copy names are therefore the three dimensions of the drawing, and nothing
   here is decorative: move a swatch in the seed table and the dot moves with it.

   THE ARRANGEMENT IS THE ARGUMENT. At rest the dots sit in a row along the bottom, evenly spaced and
   identically sized — a palette strip, which is how every other tool would show you this. As the
   section scrolls they travel to their real coordinates, and the strip becomes a measurement: the
   even spacing turns out to have been hiding a 126° hue gap, and the equal sizes were hiding a swatch
   with almost no chroma at all. The reader watches the flat row become the true shape.

   Scrubbed rather than played, so the reader controls it and can hold the transition half-finished —
   which is the state that actually makes the point, because both readings are on screen at once.

   THE FLOOR IS THE STRIP. No GSAP, no ScrollTrigger, reduced motion, or a plot that cannot measure
   itself → this returns an inert destroy and the dots stay exactly where the CSS puts them: a row of
   swatches under a spectrum band, correctly coloured and correctly labelled. The section still reads;
   it simply does not perform. */

function noop() { }

export function initSpectrum(root) {
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  if (!gsap || !ScrollTrigger || !root) return noop;
  try { if (window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches) return noop; } catch (e) { }
  try { gsap.registerPlugin(ScrollTrigger); } catch (e) { return noop; }

  const plot = root.querySelector('[data-spectrum]');
  if (!plot) return noop;
  const dots = [].slice.call(plot.querySelectorAll('[data-spec-dot]'));
  if (dots.length < 2) return noop;

  const field = plot.querySelector('[data-spectrum-field]') || plot;

  /* Read the palette off the markup. Anything missing a coordinate is left out rather than defaulted:
     a dot at a made-up position would be the one thing this section cannot afford. */
  const points = dots.map((el) => ({
    el,
    hue: parseFloat(el.getAttribute('data-hue')),
    L: parseFloat(el.getAttribute('data-l')),
    C: parseFloat(el.getAttribute('data-c')),
  })).filter((p) => isFinite(p.hue) && isFinite(p.L) && isFinite(p.C));
  if (points.length < 2) return noop;

  plot.setAttribute('data-spectrum-live', '1');

  // Chroma → diameter. Scaled against the plot's own widest swatch rather than an absolute maximum,
  // so a low-chroma palette still reads as having a range instead of collapsing to five identical
  // specks. MIN is what keeps the near-grey visible at all: it is a colour, not an absence.
  const maxC = Math.max.apply(null, points.map((p) => p.C)) || 1;

  /* THE MARK IS A SHARE OF THE FIELD, and 26 and 86 were a share of one particular field.

     Those two numbers are right at the width they were chosen on — 2.11% and 6.99% of the 1230px
     plot a desktop draws. Held as absolutes they do not survive the phone: at 375px the field is
     327px, so the same marks become 8% and 26% of it, and `pad` — which is half the largest mark —
     ate 98px of the 327, leaving 229px of usable axis.

     What that did to the reading is the point. The axis is the whole hue circle and this palette
     occupies 66° of it, which is the figure's own argument; across 229px that is 42px of spread,
     carrying five dots up to 86px wide. Measured: the five sat between x=68 and x=110 as a single
     blob, and the rightmost mark's edge reached x=132 of 327 — 60% of the plot permanently empty.
     The marks were larger than the data they were plotting.

     Read off the field instead, the desktop numbers come out unchanged to the pixel and a 327px
     plot draws 12–30px marks in 285px of usable axis: the same 66° now spans 52px, and five circles
     with 118px of lightness between them read as five. The cluster is still a cluster — the palette
     really is that narrow in hue, and flattering it by rescaling the axis would be the one lie this
     figure cannot tell. MAX floors at 30 and MIN at 12 so the smallest swatch stays a colour rather
     than a speck; .about-spectrum__dot carries the tap target separately, since a 12px button is
     under any thumb. */
  const marks = (width) => {
    const max = Math.max(30, Math.round(width * 0.0699));
    return { MIN: Math.max(12, Math.round(max * 0.302)), MAX: max };
  };

  let tl = null;

  function build() {
    if (tl) { try { if (tl.scrollTrigger) tl.scrollTrigger.kill(); } catch (e) { } try { tl.kill(); } catch (e) { } tl = null; }

    const box = field.getBoundingClientRect();
    if (!box.width || !box.height) return;

    const { MIN, MAX } = marks(box.width);
    // Inset so a dot at hue 0 or lightness 1 is drawn inside the field rather than half outside it.
    const pad = MAX / 2 + 6;
    const w = Math.max(box.width - pad * 2, 1);
    const h = Math.max(box.height - pad * 2, 1);

    tl = gsap.timeline({
      scrollTrigger: {
        trigger: plot,
        /* Widened for the same reason aboutIntervals was: the plot's whole argument is that you can
           hold it half-finished and see both readings at once, and a range barely taller than the
           figure gave the reader no room to do that. */
        start: 'top 90%',
        end: 'bottom 30%',
        scrub: 1.1,
        invalidateOnRefresh: true,
      },
    });

    points.forEach((p, i) => {
      const size = MIN + (p.C / maxC) * (MAX - MIN);
      // Where it belongs: hue across, lightness up from the floor.
      const x = pad + (p.hue / 360) * w;
      const y = pad + (1 - p.L) * h;
      // Where it starts: evenly spaced along the floor, all one size — the strip every other tool draws.
      const x0 = pad + ((i + 0.5) / points.length) * w;
      const y0 = pad + h;

      gsap.set(p.el, { xPercent: -50, yPercent: -50, x: x0, y: y0, width: MIN, height: MIN });
      tl.to(p.el, { x, y, width: size, height: size, ease: 'power2.inOut' }, i * 0.06);
    });

    // The axes arrive with the plot rather than being there to begin with — they describe a reading
    // that has not happened yet until the dots move.
    const axes = [].slice.call(plot.querySelectorAll('[data-spec-axis]'));
    if (axes.length) tl.fromTo(axes, { autoAlpha: 0 }, { autoAlpha: 1, ease: 'none' }, 0);
  }

  build();

  let resizeT;
  function onResize() {
    clearTimeout(resizeT);
    resizeT = setTimeout(() => { if (root.isConnected) build(); }, 120);
  }
  window.addEventListener('resize', onResize);
  // Neue Montreal lands after mount and changes the height of everything above the plot; the trigger
  // has to be re-measured against the document that results. Same trap the rest of the page records.
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => { if (root.isConnected) build(); });
  }

  return function destroy() {
    window.removeEventListener('resize', onResize);
    clearTimeout(resizeT);
    try { plot.removeAttribute('data-spectrum-live'); } catch (e) { }
    if (tl) {
      try { if (tl.scrollTrigger) tl.scrollTrigger.kill(); } catch (e) { }
      try { tl.kill(); } catch (e) { }
      tl = null;
    }
    // Put the dots back in the CSS's hands, or a remount inherits the last scroll position's geometry.
    try { gsap.set(dots, { clearProps: 'all' }); } catch (e) { }
  };
}
