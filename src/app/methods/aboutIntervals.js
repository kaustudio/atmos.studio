/* THE INTERVALS — the distances between colours, drawn as distance.

   The section argues that a palette's character lives in its gaps rather than its swatches, and this
   is that sentence performed: five colours stand in a row at even spacing, and as the section scrolls
   each gap grows or shrinks to the size of the step it actually represents. Even spacing is a
   convention; this replaces it with a measurement.

   The step is the perceptual distance between two neighbours in OKLab — the straight line between
   them through lightness and chroma — written into the markup as data-step by about.html, computed
   from the same seed table every other figure on this page quotes. A gap is therefore never a
   designer's spacing decision; it is a number the palette owns.

   The readouts inside each gap (ΔL, ΔC, Δh) arrive with the spacing, so what the reader sees widen is
   immediately labelled with why. They are the reason this is a diagram rather than an animation.

   THE FLOOR IS AN EVEN ROW. Without GSAP or under reduced motion the gaps keep the equal widths the
   CSS gives them and the readouts are simply present — a legible table of the same numbers, which is
   what the figure is for. */

function noop() { }

export function initIntervals(root) {
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  if (!gsap || !ScrollTrigger || !root) return noop;
  try { if (window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches) return noop; } catch (e) { }
  try { gsap.registerPlugin(ScrollTrigger); } catch (e) { return noop; }

  const rail = root.querySelector('[data-intervals]');
  if (!rail) return noop;
  const gaps = [].slice.call(rail.querySelectorAll('[data-step]'));
  if (!gaps.length) return noop;

  const steps = gaps.map((el) => parseFloat(el.getAttribute('data-step'))).filter(isFinite);
  if (steps.length !== gaps.length) return noop;

  rail.setAttribute('data-intervals-live', '1');

  /* Normalised against the MEAN rather than the maximum, so the row keeps roughly the width it had:
     scaling to the largest step would push every other gap toward nothing and the row would shrink
     away from its own container. A gap of average size stays average; the rest move around it.
     Clamped either side because a step of nearly zero must still leave room for its own readout. */
  const mean = steps.reduce((a, b) => a + b, 0) / steps.length || 1;
  const grow = steps.map((s) => Math.min(Math.max(s / mean, 0.35), 2.4));

  const readouts = [].slice.call(rail.querySelectorAll('[data-step-read]'));

  /* THE RANGE IS THE FEEL, and the range was the problem.

     'top 78%' to 'bottom 68%' spans the height of the rail plus about a tenth of the viewport, so on
     a 128px figure the whole transformation was compressed into roughly 230px of scrolling: two
     turns of a wheel and the gaps had snapped from even to true. It read as a state change rather
     than as a measurement being taken.

     Started earlier and ended later, the same animation is spread over most of a viewport, which is
     what lets a reader watch one gap overtake another rather than find that it already has. The
     scrub smoothing goes up with it: 0.5s of catch-up over a short range is a lag, over a long one
     it is the weight that stops the row twitching with every scroll tick. */
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: rail,
      start: 'top 92%',
      end: 'bottom 34%',
      scrub: 1.1,
      invalidateOnRefresh: true,
    },
  });

  gaps.forEach((el, i) => {
    gsap.set(el, { flexGrow: 1 });
    tl.to(el, { flexGrow: grow[i], ease: 'power2.inOut' }, 0);
  });
  if (readouts.length) {
    tl.fromTo(readouts, { autoAlpha: 0, y: 6 }, { autoAlpha: 1, y: 0, ease: 'none', stagger: 0.06, duration: 0.5 }, 0.08);
  }

  return function destroy() {
    try { rail.removeAttribute('data-intervals-live'); } catch (e) { }
    try { if (tl.scrollTrigger) tl.scrollTrigger.kill(); } catch (e) { }
    try { tl.kill(); } catch (e) { }
    try { gsap.set(gaps.concat(readouts), { clearProps: 'all' }); } catch (e) { }
  };
}
