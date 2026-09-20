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
   pixels, so the two compose on the same transform instead of fighting over one property. Both are
   cleared when the arrival lands, which leaves the element exactly as the flip expects to find it. */

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
  const apply = () => { box.style.clipPath = clipStr(at.up, at.side); };
  const park = () => { at.up = 100; at.side = 14; apply(); if (img) gsap.set(img, { y: 18 }); };
  const clear = () => { box.style.removeProperty('clip-path'); if (img) gsap.set(img, { clearProps: 'y' }); };
  if (reduce) return dead;                      // no mask at all: the picture is simply there
  park();

  let played = false;
  const play = () => {
    if (played || !box.isConnected) return;
    played = true;
    const tl = gsap.timeline({ onComplete: clear });
    tl.to(at, { up: 0, duration: M.duration, ease: M.ease, onUpdate: apply }, 0);
    // The sides finish a breath sooner, so the last of the movement is the top edge rising rather
    // than the frame still widening under it.
    tl.to(at, { side: 0, duration: M.duration * 0.8, ease: M.ease, onUpdate: apply }, 0);
    if (img) tl.to(img, { y: 0, duration: M.duration * 1.15, ease: M.ease }, 0);
    // A stalled run (a backgrounded tab) is finished rather than left holding the picture back.
    setTimeout(() => { if (tl.progress() < 1) { try { tl.progress(1); } catch (e) { clear(); } } }, (M.duration * 1.15 + 1.4) * 1000);
  };

  return {
    play,
    destroy: () => { try { if (!played) clear(); } catch (e) { } },
  };
}
