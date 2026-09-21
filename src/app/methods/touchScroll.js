/* NORMALIZED TOUCH SCROLLING, for the two surfaces that pin (21.09.26, by request: "try normalizescroll",
   after anticipatePin for the iPhone report on the close: it "jumps or shakes" scrolling to the footer
   and back up, in Safari).

   WHAT IT DOES. ScrollTrigger.normalizeScroll takes a touch scroll off the browser's own thread and runs
   it in JavaScript, with GSAP's momentum. The pins and the scrubs then move in the same frame as the
   page, rather than a frame behind a scroll Safari has already drawn, and the address bar stops
   collapsing and reappearing under the reader, since it is the native pan that drives it. Pinch-zoom is
   kept: on a touch device the normalizer's touch-action is "pan-x pinch-zoom".

   WHO HOLDS IT. Only a touch-only device (ScrollTrigger.isTouch === 1), never under reduced motion (the
   pins are not built there), and only while a surface that pins is on screen: the phone story, which
   lets go while its image chooser is open (the chooser takes its own swipes, and the story under it
   must not scroll), and /about while its gallery is built. Holders are counted, so the two can overlap
   across a page transition, and it is switched off, normalizeScroll(false), the moment nothing holds
   it: the rest of the site keeps the browser's own scrolling. */

const holders = new Set();
let on = false;

function apply() {
  const ST = window.ScrollTrigger;
  if (!ST || typeof ST.normalizeScroll !== 'function') return;
  let reduce = false;
  try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { }
  const want = holders.size > 0 && ST.isTouch === 1 && !reduce;
  if (want === on) return;
  on = want;
  // Touch only: the wheel belongs to Lenis, and a touch-only device has none to take.
  try { ST.normalizeScroll(want ? { type: 'touch', allowNestedScroll: true } : false); } catch (e) { on = false; }
}

/** Hold normalized touch scrolling on behalf of `owner`; returns the release, which is idempotent. */
export function holdTouchScroll(owner) {
  holders.add(owner);
  apply();
  let held = true;
  return () => {
    if (!held) return;
    held = false;
    holders.delete(owner);
    apply();
  };
}
