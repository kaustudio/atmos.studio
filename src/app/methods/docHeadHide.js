/* THE MASTHEAD, GETTING OUT OF THE WAY — /about, /privacy, /terms.

   Scroll down and the bar leaves; scroll back up and it returns. It is the only chrome on these
   three routes, and they are the pages people READ rather than operate: a 64px band pinned over a
   column of prose is 64px of the screen spent on a wordmark and a theme switch for the whole length
   of a long document. Going up is the gesture that means "I want to get somewhere", so that is when
   the way back appears.

   NOT ON THE TOOL. This is wired into DocHead, which is rendered by exactly these three routes (see
   chrome.jsx); the app's own header holds actions you reach for mid-task and must not move.

   NO GSAP, ON PURPOSE. Two states, no sequencing, nothing measured — which is what a transition is
   for, and the same argument [data-disc-chev] makes for turning rather than swapping. This file
   only toggles an attribute; doc.css owns the move and rides --dur-chrome / --ease-standard so the
   bar leaves on the same clock as every other piece of chrome.

   NO rAF EITHER. The handler reads window.scrollY and compares two numbers — it never measures the
   document — so there is nothing to batch, and going through requestAnimationFrame would only add a
   frame of lag to a motion whose whole job is to answer the scroll immediately.

   REDUCED MOTION TURNS IT OFF RATHER THAN SPEEDING IT UP. The blanket rule in global.css flattens
   every transition to .001ms, which would leave the bar blinking in and out of existence at each
   change of direction — the "surfaces arrive, never appear" rule failing in the loudest possible
   place. A reader who has asked for less motion gets a masthead that simply stays. */

function noop() { }

// Below this the bar always shows: the top of a document is where the mark belongs, and hiding it
// while the reader is still in the hero would read as the page eating its own header.
const FLOOR = 120;
// Direction has to be meaningful before it counts. Trackpad inertia and rubber-band at the ends of
// the document both produce a pixel or two the other way, and without this the bar flickers.
const THRESHOLD = 6;

export function initDocHeadHide(bar) {
  if (!bar || typeof window === 'undefined') return noop;
  try {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches) return noop;
  } catch (e) { }

  let last = Math.max(0, window.scrollY || 0);
  let hidden = false;

  const setHidden = (next) => {
    if (next === hidden) return;
    hidden = next;
    if (next) bar.setAttribute('data-nav-hidden', '1');
    else bar.removeAttribute('data-nav-hidden');
  };

  const onScroll = () => {
    const y = Math.max(0, window.scrollY || 0);
    const dy = y - last;
    // Deliberately does NOT update `last` below the threshold, so a slow drag accumulates into a
    // direction instead of being discarded a pixel at a time and never reaching it.
    if (Math.abs(dy) < THRESHOLD) return;
    last = y;
    if (y <= FLOOR) { setHidden(false); return; }
    setHidden(dy > 0);
  };

  /* A HIDDEN BAR STILL HOLDS TWO FOCUSABLE CONTROLS. Tab reaches the theme switch and the mark
     whether or not they are on screen, and a focus ring drawn 64px above the viewport is the
     textbook 2.4.11 failure. Anything inside the bar taking focus brings it back. */
  const onFocusIn = () => setHidden(false);

  window.addEventListener('scroll', onScroll, { passive: true });
  bar.addEventListener('focusin', onFocusIn);

  return () => {
    window.removeEventListener('scroll', onScroll);
    bar.removeEventListener('focusin', onFocusIn);
    bar.removeAttribute('data-nav-hidden');
  };
}

export default initDocHeadHide;
