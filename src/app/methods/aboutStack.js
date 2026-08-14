/* MWG 031 — the falling card stack.

   Each slide pins for one viewport height; while it is pinned the card inside it tilts back on the X
   axis, shrinks, takes a small random Z rotation and fades out, so the next slide arrives over a card
   that is receding rather than one that simply scrolled away. The perspective lives on the wrapper,
   the transform on the card, and the two ScrollTriggers are the effect's own — one for the recede,
   one for the fade a little later.

   On /about it carries the three cards of "One model, read three ways" — hue from Cut Limestone,
   lightness from Sable & Bracken, chroma from Coral. Three cuts through one model, taken from three
   different photographs, and a card that recedes under the one arriving over it is a reading giving
   way to the next reading.

   THE MECHANIC IS THE SOURCE'S, UNCHANGED — and restoring that is the whole of this file's recent
   history. An earlier pass merged the two ScrollTriggers into one scrubbed timeline on the slide and
   moved the fade to 0.55–0.80 of the pin. The reasoning was that the source's second trigger uses
   `content` as its own trigger, which is the element the FIRST trigger pins, and that measuring
   against something another trigger positions is unsafe. It is not: ScrollTrigger resolves trigger
   positions in DOCUMENT space at refresh, with pins temporarily released, so `content`'s natural
   position is what both triggers see. The source's numbers work out exactly —

     pin start        scroll = slideTop
     pin end          scroll = slideTop + 100vh
     fade start       'top -80%'          = slideTop + 80vh   (80% of the pin)
     fade end         '+=' 0.2 × 100vh    = slideTop + 100vh  (the pin's last frame)

   — so the fade occupies the final fifth of the pin, which is when the incoming slide has already
   covered four fifths of the receding card. Fading at 0.55 instead meant the card was at zero while
   17vh of it was still uncovered, showing bare page ground through the gap on every handoff.

   [ATMOS 1] The ONE retained deviation, and it is a measurement, not a behaviour. The source writes
   `end: '+=' + window.innerHeight`, evaluated once at DOMContentLoaded. Here the route can be resized
   and the local .otf lands after mount, so that figure would be a pin length measured against a
   viewport that no longer exists. Same formula, asked again on refresh. On a page that never changes
   size after load the two are the same number.

   [ATMOS 2] Scoped to the mounted root, wrapped in init/destroy, floored under reduced motion — the
   three accommodations every effect on this page carries. Under reduced motion nothing is created and
   the slides are three ordinary blocks down the page, which is what the CSS renders on its own.

   [ATMOS 3] The pin is the reason this file is careful about teardown. A ScrollTrigger with `pin`
   rewrites its target's position and inserts a spacer into the document; leaving one alive after the
   route unmounts leaves that spacer measuring a detached element, and every other trigger on the next
   route is refreshed against it. */

function noop() { }

export function initStackSlides(root) {
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  if (!gsap || !ScrollTrigger || !root) return noop;
  try { if (window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches) return noop; } catch (e) { }
  try { gsap.registerPlugin(ScrollTrigger); } catch (e) { return noop; }

  const slides = [].slice.call(root.querySelectorAll('[data-stack-slide]'));
  if (!slides.length) return noop;

  const triggers = [];

  slides.forEach((slide) => {
    const contentWrapper = slide.querySelector('[data-stack-wrap]');
    const content = slide.querySelector('[data-stack-content]');
    if (!contentWrapper || !content) return;

    /* [ATMOS 2] THE `-live` CONTRACT. The card is absolutely positioned against a containing block
       that only exists once the pin has been built, so in CSS alone all three resolve against the
       section and overlay each other. The stylesheet holds the floor and waits for this attribute
       before stacking anything. Nothing about the animated state differs from the source. */
    slide.setAttribute('data-stack-live', '1');

    // The recede. The source's values exactly, including the per-load random Z rotation.
    const recede = gsap.to(content, {
      rotationZ: (Math.random() - 0.5) * 10,   // between -5 and 5 degrees
      scale: 0.7,
      rotationX: 40,
      ease: 'power1.in',
      scrollTrigger: {
        pin: contentWrapper,
        trigger: slide,
        start: 'top 0%',
        end: () => '+=' + window.innerHeight,   // [ATMOS 1]
        scrub: true,
        invalidateOnRefresh: true,
      },
    });
    if (recede.scrollTrigger) triggers.push(recede.scrollTrigger);

    // The fade, on its own trigger and its own window — the last fifth of the pin.
    const fade = gsap.to(content, {
      autoAlpha: 0,
      ease: 'power1.in',
      scrollTrigger: {
        trigger: content,
        start: 'top -80%',
        end: () => '+=' + (0.2 * window.innerHeight),   // [ATMOS 1]
        scrub: true,
        invalidateOnRefresh: true,
      },
    });
    if (fade.scrollTrigger) triggers.push(fade.scrollTrigger);
  });

  return function destroy() {
    triggers.forEach((t) => { try { t.kill(true); } catch (e) { } });
    triggers.length = 0;
    slides.forEach((s) => {
      try { s.removeAttribute('data-stack-live'); } catch (e) { }
      const c = s.querySelector('[data-stack-content]');
      if (c) { try { gsap.killTweensOf(c); gsap.set(c, { clearProps: 'all' }); } catch (e) { } }
    });
  };
}
