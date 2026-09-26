/* THE HERO'S PHOTOGRAPH ARRIVES (20.09.26, by request: "image should mask in from the bottom center on
   the current position with a slight parallax, so it's not already visible during page transition").

   Every other thing on this page arrives — the statement rises through its masks, the rules draw, the
   tiles cascade — and the photograph was simply there, whole, the instant the window opened on it. It is
   the largest object on the screen and the only one that did not answer the crossing.

   WHAT IT DOES. The plate's own box is masked and the mask opens from the bottom centre: a hairline at
   the foot, growing up and out to the frame, so the picture arrives out of its own bottom edge rather
   than fading or sliding as a rectangle. The photograph inside lifts a few pixels as that happens — the
   slight parallax the request asks for, and the reason the two read as one movement rather than a box
   uncovering a still. It stays exactly where it is: nothing about the layout moves.

   THE CLIP STRING IS WRITTEN HERE, FROM TWO PLAIN NUMBERS. Neither of the two obvious shortcuts survives
   contact with this element: a clip-path string tween pairs the wrong numbers, because GSAP takes a
   tween's start from the element and the browser shortens inset() as it shortens margin (measured on the
   result stage's wipe, which grew its corner from 0 to 12px that way, motion.js _bandWipe); and the
   custom-property version of the same idea, which the stage now uses happily, wrote its END value on every
   frame here — traced with the tween reporting progress 0.06 while the property already read 0%, which
   makes the substitution and therefore the whole clip-path invalid, so the picture simply stood there
   unmasked. So the numbers are tweened on a plain object and this writes the string: one writer, nothing
   to parse, and the corner stated once.

   ARMED, NOT PLAYED. The page hands this to the same controller its copy uses (AboutPage): on a wiped
   arrival the cover's trailing edge releases it, on a cold load it plays at once. That is the whole point
   of the request — under the cover, an arrival that has already finished is a page that was simply there.

   The drift on the photograph (aboutFlip.js, scrubbed on scroll) writes yPercent; this writes y in
   pixels, so the two compose on the same transform instead of fighting over one property.

   THE LANDING LEAVES THE TRANSFORM ALONE (26.09.26, by request: "the hero image on how it works jumps a
   few px after animation lands"). It used to clear `y` as it landed, and GSAP cannot clear one part of a
   transform: clearing any of it clears all of it, the drift's yPercent included. So the photograph
   dropped by the drift's 7% of its height the instant it landed, 21.7px at 1440×900, and sprang back on
   the first scroll when the drift wrote itself again. The lift ends at 0 and stays written as 0; only
   the mask is taken off. The lift is a fromTo for the same family of reason: on a direct load the
   arrival starts at mount and the flip's fonts.ready rebuild clears the photograph's transform a
   microtask later, so a tween that read its start from the element started from 0 and never rose.

   THE PARK IS HELD UNTIL THE ARRIVAL PLAYS (21.09.26, by request: "it doesn't animate correctly during
   the page transition"). The flip (aboutFlip.js) rebuilds on document.fonts.ready, and its rebuild is the
   resource's own `gsap.set(target, { clearProps: "all" })` — on the plate, which IS its target — while
   the drift's rebuild clears the photograph's transform. On a crossing the faces are already loaded, so
   that promise settles ~50ms after mount: the mask and the lift were wiped before the window had even
   started to open. Measured on the front page's How it Works: the photograph stood whole in the rising
   window for 0.65s, then snapped to 92% masked when the page released it, and opened again — a picture
   that appeared, vanished and arrived. The flip is Osmo's and keeps its clear; the park is this module's,
   so it is this module that holds it: a cleared mask is put straight back, at whatever the arrival has
   reached, and a cleared lift while it is still parked. A MutationObserver's callback runs before the
   next paint, so no frame shows the picture whole. It holds THROUGH the arrival, not just up to it: on a
   cold load the arrival starts at mount, the flip's clear lands inside it, and the mount's own work then
   stalls the ticker — measured, the photograph stood whole for 0.7s before the next frame masked it at
   70%. It lets go only as the arrival finishes, so its own landing at the end stands. */

function noop() { }

export function initPlateArrival(root, motion) {
  const gsap = window.gsap;
  const dead = { play: noop, destroy: noop };
  if (!gsap || !root) return dead;
  const box = root.querySelector('[data-plate-arrive]');
  if (!box) return dead;
  const img = box.querySelector('img');
  let reduce = false;
  try { reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches); } catch (e) { }

  const M = motion || { duration: 0.62, ease: 'expo.out' };
  let r = '28px';
  try { const v = getComputedStyle(document.documentElement).getPropertyValue('--radius-surface').trim(); if (v) r = v; } catch (e) { }

  // Parked before the first paint the cover hides, so the window never opens on a whole picture.
  const clipStr = (up, side) => 'inset(' + up + '% ' + side + '% 0% ' + side + '% round ' + r + ')';
  const at = { up: 100, side: 14 };
  // The lift: "a few pixels" of the request's slight parallax, the one number the park, the hold and the
  // arrival all start the photograph from.
  const LIFT = 18;
  const apply = () => { box.style.clipPath = clipStr(at.up, at.side); };
  const park = () => { at.up = 100; at.side = 14; apply(); if (img) gsap.set(img, { y: LIFT }); };
  const clear = () => { box.style.removeProperty('clip-path'); if (img) gsap.set(img, { clearProps: 'y' }); };
  if (reduce) return dead;                      // no mask at all: the picture is simply there
  park();

  let played = false, done = false;
  let hold = null;
  const reHold = () => {
    if (done) return;
    if (!box.style.clipPath) apply();
    // The lift is the timeline's to write once it plays; before that, the park's.
    if (!played && img && Math.abs(Number(gsap.getProperty(img, 'y')) || 0) < 0.5) gsap.set(img, { y: LIFT });
  };
  try {
    hold = new MutationObserver(reHold);
    hold.observe(box, { attributes: true, attributeFilter: ['style'] });
    if (img) hold.observe(img, { attributes: true, attributeFilter: ['style'] });
  } catch (e) { hold = null; }
  const letGo = () => { if (hold) { try { hold.disconnect(); } catch (e) { } hold = null; } };

  const play = () => {
    if (played || !box.isConnected) return;
    played = true;
    // Only the mask comes off: the lift has ended at 0, and clearing it would clear the drift with it.
    const land = () => { done = true; letGo(); box.style.removeProperty('clip-path'); };
    const tl = gsap.timeline({ onComplete: land });
    tl.to(at, { up: 0, duration: M.duration, ease: M.ease, onUpdate: apply }, 0);
    // The sides finish a breath sooner, so the last of the movement is the top edge rising rather
    // than the frame still widening under it.
    tl.to(at, { side: 0, duration: M.duration * 0.8, ease: M.ease, onUpdate: apply }, 0);
    if (img) tl.fromTo(img, { y: LIFT }, { y: 0, duration: M.duration * 1.15, ease: M.ease }, 0);
    // A stalled run (a backgrounded tab) is finished rather than left holding the picture back.
    setTimeout(() => { if (tl.progress() < 1) { try { tl.progress(1); } catch (e) { land(); } } }, (M.duration * 1.15 + 1.4) * 1000);
  };

  return {
    play,
    destroy: () => { done = true; letGo(); try { if (!played) clear(); } catch (e) { } },
  };
}
