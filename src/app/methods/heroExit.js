/* THE HERO LEAVES WITHOUT MOVING.

   The story's opening screen used to scroll away like any other block: the statement, the lead and
   the act travelled up and off the top edge while the orb formation stayed behind them, fixed. Two
   things were wrong with that. The copy raced the formation it is sitting in — one layer moving, one
   layer still — and the reader's first scroll was answered by the page taking the words away rather
   than by anything happening.

   So the block is STICKY and it dissolves in place: it holds at the top of the viewport for the
   length of the hero's own tail while its opacity falls and a blur opens under it. Nothing exits at
   the top; the screen it was on simply stops being about it.

   [ATMOS 0] IT FINISHES AS THE NEXT SECTION ARRIVES, NOT BEFORE IT. The range is the hero's own tail,
   and the first chapter is pulled back half a screen so it rises over the still-stuck block from the
   halfway point (see .story-hero in story.css). Opacity runs to 0.92 of the range rather than to the
   end: the last fraction is the blur alone, under a chapter that is already covering it, so the fade
   lands with the arrival instead of ahead of it.

   [ATMOS 1] SCRUBBED, NOT PLAYED. This answers the thumb continuously — the reader is doing the
   dissolving, which is the only reason a blur is worth its cost here. `ease:'none'` for the same
   reason every scrubbed tween on this site uses it: an eased scrub double-eases, once by the curve
   and once by the reader's own hand.

   [ATMOS 2] THE BLUR IS SMALL AND IT IS ON ONE ELEMENT. `filter: blur()` forces a repaint of what it
   covers on every frame, and this site's own brief says atmosphere should come from colour and
   movement rather than post-processing. 8px on a single text block for half a screen of travel is a
   different proposition from a blurred backdrop — but it is still the most expensive thing on this
   surface, so it is bounded here rather than tuned later, and `will-change` is deliberately NOT set:
   a permanent compositor promise on a block that is only in flight for 400px is the trade the house
   rule against standing `will-change` exists to refuse.

   [ATMOS 3] THE FORMATION IS NOT TOUCHED. It belongs to orbit.js, whose MOTION CONTRACT is frozen,
   and it is a WebGL field on the app's single ticker — reaching into it from here would be a second
   owner of its position and a second clock. The orbs stay exactly where they are; only the DOM block
   in front of them dissolves. If the particles are to leave step by step, that is a change inside the
   engine that owns them, not one this module may make.

   [ATMOS 4] THE FLOOR IS A FULLY VISIBLE HERO. Guarded on gsap, ScrollTrigger and reduced motion,
   and every value it writes is cleared on destroy. No JS, a 404'd vendor script, or a reader who
   asked for less motion all get an opening screen that is simply there. */

function noop() { }

export function initHeroExit(root) {
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  if (!gsap || !ScrollTrigger || !root) return noop;
  try { if (window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches) return noop; } catch (e) { }
  try { gsap.registerPlugin(ScrollTrigger); } catch (e) { return noop; }

  const hero = root.querySelector('[data-story-hero]');
  const inner = hero && hero.querySelector('[data-story-hero-inner]');
  if (!hero || !inner) return noop;

  /* The range is the hero's own tail — the distance between its full height and the one screen the
     sticky block occupies. Expressed as a function so invalidateOnRefresh re-measures it rather than
     repositioning a number taken against a viewport that has since changed. */
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: hero,
      start: 'top top',
      end: () => '+=' + Math.max(1, hero.offsetHeight - window.innerHeight),
      scrub: true,
      invalidateOnRefresh: true,
    },
  });

  /* Opacity leads the blur. They run over the same range but the fade is the honest signal — a block
     that is merely blurred still occupies the screen and still asks to be read, so the thing that
     says "this is over" has to be the one that finishes first. The blur is what makes the fade read
     as a dissolve rather than a dimmer. */
  tl.to(inner, { opacity: 0, ease: 'none', duration: 0.92 }, 0);
  tl.to(inner, { filter: 'blur(8px)', ease: 'none', duration: 1 }, 0);

  /* [ATMOS 5] THE FIELD DISSOLVES WITH THE WORDS, and this supersedes [ATMOS 3] above.

     [ATMOS 3] said the formation is not touched, and the reason it gave was right about the engine and
     wrong about the layer. orbit.js owns where every orb IS — the single ticker, the ring geometry,
     the per-orb depth — and none of that may be driven from here. But the field is DOM, not a canvas:
     `[data-orbit]` is an ordinary wrapper the engine only ever reads with querySelector, and
     compositing a wrapper is not the same act as moving what is inside it. So the copy dissolving
     while the atmosphere behind it stayed perfectly sharp was not a contract being respected, it was
     two layers of one image disagreeing about whether the screen was over.

     THE PER-ORB DEPTH SURVIVES BECAUSE IT IS NOT WHERE THIS WRITES. _ringDress stamps `opacity` and
     `filter` on each [data-orbit-item] once at build and resize — the back rings are dimmer and
     blurrier, and that difference IS the formation's depth. Writing either of those on a TILE would
     erase it. This writes them on the container instead, so the rings keep their relative dressing
     and the whole composited field gains the blur on top of it.

     THE Z-INDEX IS NOT DECORATION, IT IS THE PRICE OF THE FILTER. A filter makes an element a
     stacking context, and the rings carry z 20, 24 and 30 while the brand copy is z 2, the vignette 3
     and the grain 4 — all in [data-landing]'s context, so the field currently paints ABOVE all three.
     Contain it without saying where it goes and the whole formation drops underneath the vignette and
     the grain, which would darken and stipple the orbs that presently sit over them. 30 is the front
     ring's own value: the field lands exactly where it already was, and the rings keep their order
     among themselves inside the new context. Set once here rather than per frame, and cleared with
     everything else.

     IT LEAVES COMPLETELY, and 0.55 was wrong for two reasons that only showed up on a real phone.

     The argument for holding it at 0.55 was that a field of colour is atmosphere and may still be
     there when the chapter arrives over it. That reasoning assumed the chapter covers it, and the
     chapters do paint their own opaque surface — so after the hero the field is never legitimately
     seen at all. 0.55 bought nothing visible and cost two real things.

     IT LEAKED. `[data-landing]` is position:fixed and the sections are not, so "covered" holds only
     while the sections span what the reader can see. Pinch zoom out on a phone and the visual
     viewport grows past the layout viewport: the sections stop reaching the edges, and a half opaque
     blurred orb field appears beside the article for the whole length of the page. Reported from a
     device, and reproducible at any zoom below 1.

     AND IT COST A FRAME. A blurred, half opaque, full screen layer stays composited for every frame
     of every chapter, on the device least able to afford it, to be invisible.

     autoAlpha rather than opacity, so the end of the run is visibility:hidden and not merely
     transparent — nothing to paint, nothing to leak, and GSAP reverses both on the way back up so
     scrolling to the top restores the field exactly. */
  const field = document.querySelector('[data-orbit]');
  if (field) {
    field.style.zIndex = '30';
    tl.to(field, { autoAlpha: 0, ease: 'none', duration: 0.92 }, 0);
    tl.to(field, { filter: 'blur(8px)', ease: 'none', duration: 1 }, 0);
  }

  const trigger = tl.scrollTrigger;

  return function destroy() {
    try { if (trigger) trigger.kill(); } catch (e) { }
    try { tl.kill(); } catch (e) { }
    try { gsap.set(inner, { clearProps: 'opacity,filter' }); } catch (e) { }
    try { if (field) gsap.set(field, { clearProps: 'opacity,visibility,filter,zIndex' }); } catch (e) { }
  };
}
