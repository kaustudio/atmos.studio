/* The dividers, drawing.

   Every hairline on this page arrives by being DRAWN from its leading edge rather than by being
   there — the same gesture the legal documents' section rules already make, and the loader's own
   progress bar before them. It is the smallest motion on the site and the one that does the most to
   make a long page read as something assembling itself in front of you rather than a wall of blocks
   that happens to have lines in it.

   The section rules are not here: those are the reveal engine's, drawn as part of a section's cascade
   so the rule leads its own heading (see drawRule in pageReveal.js). This covers the ones that belong
   to no section — the rules between figures, above a caption, under a readout — which have no cascade
   to join and would otherwise be the only lines on the page already finished when you reach them.

   THE FLOOR IS A DRAWN LINE. --rule defaults to 1 in the stylesheet, exactly as it does for the
   section rules, so no JS, no GSAP or reduced motion leaves every divider simply present. This file
   only ever removes something already correct and then puts it back. */

function noop() { }

export function initDividers(root, options) {
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  if (!gsap || !ScrollTrigger || !root) return noop;
  try { if (window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches) return noop; } catch (e) { }
  try { gsap.registerPlugin(ScrollTrigger); } catch (e) { return noop; }

  const motion = (options && options.motion) || {};
  const ease = motion.ease || 'power3.out';
  const lines = [].slice.call(root.querySelectorAll('[data-divider]'));
  if (!lines.length) return noop;

  const triggers = [];
  const timers = [];

  lines.forEach((el) => {
    gsap.set(el, { '--rule': 0 });
    let drawn = false;
    const draw = () => {
      if (drawn) return;
      drawn = true;
      gsap.to(el, {
        '--rule': 1,
        duration: 0.8,
        ease,
        onComplete: () => el.style.removeProperty('--rule'),
      });
    };
    /* 92% rather than the sections' 88: a divider is a single line with no cascade behind it, so it
       has nothing to wait for and should already be complete by the time the eye arrives. */
    triggers.push(ScrollTrigger.create({ trigger: el, start: 'top 92%', once: true, onEnter: draw }));
    /* The same stall failsafe every reveal on this site carries, and for the same reason: the line is
       set to scaleX(0) the instant this runs, so a ticker that never wakes — a backgrounded tab, a
       trigger suppressed because it was created inside its own range before the fonts landed — would
       leave it permanently invisible. setTimeout, not rAF: rAF is the first thing a stalled ticker
       takes away. */
    timers.push(setTimeout(() => { if (!drawn) { drawn = true; el.style.removeProperty('--rule'); } }, 4000));
  });

  return function destroy() {
    triggers.forEach((t) => { try { t.kill(); } catch (e) { } });
    triggers.length = 0;
    timers.forEach(clearTimeout);
    timers.length = 0;
    lines.forEach((el) => { try { gsap.killTweensOf(el); } catch (e) { } el.style.removeProperty('--rule'); });
  };
}
