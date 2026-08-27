/* THE HERO LEAVES WITHOUT MOVING.

   The story's opening screen used to scroll away like any other block: the statement, the lead and
   the act travelled up and off the top edge while the landing's field stayed behind them, fixed. Two
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
   owner of its position and a second clock. The field stays exactly as it is; only the DOM block in
   front of it dissolves. If it is to leave step by step, that is a change inside the engine that owns
   it, not one this module may make.

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
     wrong about the layer. orbit.js owns what the field IS — the single ticker, the solved hole, the
     one shared angle — and none of that may be driven from here. But `[data-orbit]` is an ordinary
     DOM wrapper the engine only ever reads with querySelector, and compositing a wrapper is not the
     same act as reaching into what it holds. So the copy dissolving while the atmosphere behind it
     stayed perfectly sharp was not a contract being respected, it was two layers of one image
     disagreeing about whether the screen was over.

     THE FIELD'S OWN COMPOSITING SURVIVES BECAUSE IT IS NOT WHERE THIS WRITES. Inside the wrapper sit
     the painted floor and, over it, the canvas — and the crossfade between those two is an opacity
     the engine owns and re-runs on a lost context. Writing opacity on EITHER of them would fight it.
     This writes on the container instead, so whatever state that crossfade is in survives and the
     whole composited field gains the fade and the blur on top of it.

     THE Z-INDEX IS NOT DECORATION, IT IS THE PRICE OF THE FILTER. A filter makes an element a
     stacking context, and everything inside [data-orbit] currently participates in [data-landing]'s
     instead: the canvas is z 1 and the floor z 0, under the brand copy at 2, the vignette at 3 and
     the grain at 4. Contain them without saying where the container goes and the field jumps to the
     top of the pile — over the vignette and the grain that are meant to be lying across it. 1 is the
     canvas's own value, so the field lands exactly where it already was and the floor keeps its place
     underneath it inside the new context. Set once here rather than per frame, and cleared with
     everything else.

     IT LEAVES COMPLETELY, and 0.55 was wrong for two reasons that only showed up on a real phone.

     The argument for holding it at 0.55 was that a field of colour is atmosphere and may still be
     there when the chapter arrives over it. That reasoning assumed the chapter covers it, and the
     chapters do paint their own opaque surface — so after the hero the field is never legitimately
     seen at all. 0.55 bought nothing visible and cost two real things.

     IT LEAKED. `[data-landing]` is position:fixed and the sections are not, so "covered" holds only
     while the sections span what the reader can see. Pinch zoom out on a phone and the visual
     viewport grows past the layout viewport: the sections stop reaching the edges, and a half opaque
     blurred colour field appears beside the article for the whole length of the page. Reported from a
     device, and reproducible at any zoom below 1.

     AND IT COST A FRAME. A blurred, half opaque, full screen layer stays composited for every frame
     of every chapter, on the device least able to afford it, to be invisible.

     autoAlpha rather than opacity, so the end of the run is visibility:hidden and not merely
     transparent — nothing to paint, nothing to leak, and GSAP reverses both on the way back up so
     scrolling to the top restores the field exactly. */
  const field = document.querySelector('[data-orbit]');
  if (field) {
    field.style.zIndex = '1';
    tl.to(field, { autoAlpha: 0, ease: 'none', duration: 0.92 }, 0);
    tl.to(field, { filter: 'blur(8px)', ease: 'none', duration: 1 }, 0);
  }

  /* [ATMOS 6] THE WORDMARK GOES AS SOON AS THE READER MOVES.

     It is position:fixed at z-155 with mix-blend-mode:difference and nothing clears a band for it, so
     every chapter scrolls underneath it. Measured across the story at 21 scroll positions, it printed
     over live content at 5 of them — section headings, the OKLCH readouts, a chapter's lead. The blend
     mode keeps it LEGIBLE over anything, which is why it never looked broken; it does nothing for the
     sentence underneath, which had a wordmark through it.

     It belongs to the opening screen. That is the one place it is the subject rather than an overlay:
     the hero is the brand's own address, and the eight chapters after it are a document with a dock of
     its own for orientation. So it leaves with the screen it belongs to.

     0.25 AGAINST THE OTHERS' 0.92, and the short duration is the whole point. The copy and the field
     dissolve across the hero's full tail because the reader is doing the dissolving and should watch
     it. The wordmark is not being dissolved, it is getting out of the way — 0.25 of the range is about
     200px, which is the first flick of a thumb. Anything longer and it is still half printed over the
     first chapter, which is the state being fixed.

     autoAlpha, so it ends hidden rather than transparent: a fixed layer at opacity 0 still takes the
     tap that belongs to the chapter under it, and this one is a button. Scrubbed like everything else
     here, so scrolling back to the top brings it with the hero it left with. */
  const mark = document.querySelector('[data-logo]');
  if (mark) tl.to(mark, { autoAlpha: 0, ease: 'none', duration: 0.25 }, 0);

  const trigger = tl.scrollTrigger;

  return function destroy() {
    try { if (trigger) trigger.kill(); } catch (e) { }
    try { tl.kill(); } catch (e) { }
    try { gsap.set(inner, { clearProps: 'opacity,filter' }); } catch (e) { }
    try { if (field) gsap.set(field, { clearProps: 'opacity,visibility,filter,zIndex' }); } catch (e) { }
    try { if (mark) gsap.set(mark, { clearProps: 'opacity,visibility' }); } catch (e) { }
  };
}
