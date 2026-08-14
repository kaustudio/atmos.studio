/* MWG 050 — the image stream.

   Eight stacked frames, each scaling out from nothing to fill the stage over eight beats, staggered
   one beat apart and repeating forever. On every repeat the frame that has finished is sent to the
   back, given the next photograph in the list and the next z-index, so the sequence is endless in
   both directions out of eight elements and one timeline.

   On /about it stands under "The idea behind Atmos": the last section before the close is the one
   with no demonstration to make, and putting every reference the page has used through it — the
   photographs, one after another, wordless, while the belief statement resolves over them — is the
   only place on this page where an image should be doing nothing but existing.

   [ATMOS 1] WHY THIS IS NOT DRIVEN BY Observer, which is the source's own drive and was tried here.

   The source integrates scroll VELOCITY into the playhead: Observer reads a wheel delta, a quickTo
   smooths it over two seconds on power1, and `incr += delta` every frame. Nothing bounds it, because
   the source's page sets body{overflow:hidden} and never scrolls again — the effect has no beginning
   and no end, so an unbounded integrator is exactly right for it.

   Put that same integrator inside a section a reader scrolls THROUGH and the two quantities come
   apart. The playhead advances by ∫delta·dt — a function of how fast and how long you scroll — while
   the pin ends after a fixed DISTANCE. They are independent, so how much of the sequence you see
   depends on your input device. Measured on this page, a realistic mouse wheel (100px every 50ms)
   taken across the whole 1720px pin recycled 3 of 8 frames: three photographs out of eight, and the
   other five arrived during the two-second coast, after the section had already scrolled away. A
   trackpad, whose per-event deltas are an order of magnitude smaller, is worse.

   So the playhead is bound to the section instead. The pin's progress sets a TARGET time, and the
   timeline eases toward that target on the source's own curve — which keeps the part of the source
   that a plain scrub throws away. A scrub stops dead the instant the reader stops; this still coasts,
   because the easing goes on running toward wherever the target was left. What it gives up is the
   source's raw velocity coupling, and that is the thing that cannot survive a bounded scroll: a
   sequence can be complete, or it can be paced by how hard you push, and it cannot be both.

   SPAN is 8 because 8 frames × 1 beat is exactly one full cycle, so crossing the section shows every
   photograph once — on every device, at every scroll speed. The target reaches the end of that cycle
   at 85% of the pin, leaving the last 15% for the easing to land in rather than finishing after the
   section has gone.

   `BASE` starts far along the timeline's own infinite length so that travelling backwards can never
   reach time 0, where there is nothing behind the first frame to show. The source's comment calls
   this "keeping a base of 8 to never reach the beginning".

   [ATMOS 2] Scoped, init/destroy, floored under reduced motion — and the floor is the whole reason
   the markup carries a real <img> for the first frame rather than eight empty ones the script fills.
   Without JS or with motion off, the section is one photograph, centred. */

function noop() { }

const mod = (n, m) => (n % m + m) % m;

// The source's own base, unchanged: far enough along that travelling back never reaches time 0.
const BASE = 800000;
// 8 frames × 1 beat = one full cycle, so crossing the section shows every photograph exactly once.
const SPAN = 8;
// The cycle is complete by here, leaving the rest of the pin for the easing to land in.
const LAND = 0.85;

export function initImageStream(root) {
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  if (!gsap || !ScrollTrigger || !root) return noop;
  try { if (window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches) return noop; } catch (e) { }
  try { gsap.registerPlugin(ScrollTrigger); } catch (e) { return noop; }

  const stage = root.querySelector('[data-stream]');
  if (!stage) return noop;
  const realImages = [].slice.call(stage.querySelectorAll('[data-stream-frame]'));
  const medias = [].slice.call(stage.querySelectorAll('[data-stream-src]')).map((n) => n.getAttribute('data-stream-src'));
  if (realImages.length < 2 || !medias.length) return noop;

  stage.setAttribute('data-stream-live', '1');

  /* What the markup shipped with, so an unmount can hand the DOM back as it found it. The first
     frame carries a real src in the prerendered document and the other seven carry none — that is
     the no-JS floor, and a remount should re-seed from it rather than from wherever the recycling
     happened to stop. */
  const originalSrc = realImages.map((im) => im.getAttribute('src'));

  // Per-instance, so a remount starts clean. `head.t` is the playhead the easing chases; `delta` is
  // its per-frame travel, which is what the recycling below reads for direction — the same quantity
  // the source reads, arrived at from position rather than from a wheel.
  let zIndex = 0;
  let newIndex = 0;
  const head = { t: BASE };
  const settings = { delta: 0 };
  let lastT = BASE;

  realImages.forEach((image) => {
    image.setAttribute('data-index', zIndex);
    image.setAttribute('src', medias[zIndex % medias.length]);
    image.style.zIndex = String(zIndex);
    zIndex++;
  });

  const tl = gsap.timeline({ paused: true });

  /* The source's easing, kept: power1, applied to the playhead rather than to a wheel delta. This is
     what makes it coast — the reader stops, the target stops moving, and the timeline goes on easing
     toward wherever it was left. 0.3s rather than the source's 2s because the target is bounded now:
     two seconds of catch-up against a 1720px pin would still be arriving long after the section had
     gone, and every 100ms of it is a photograph that blooms off-screen. */
  /* NOTHING WRITES A SCALE EXCEPT THE TIMELINE, and that is the whole of the fix.

     Two bookends used to live here: one lifting every frame behind the front to full on the way in,
     one finishing the front's bloom on the way out, each writing gsap.set(scale) over the timeline
     every frame inside its zone. Between them and the four zone handlers that drove them, the section
     had two systems writing the same property, and the reader saw the argument.

     The source has one. Its expo.inOut over an eight-beat stagger already resolves itself: the curve
     spends almost all of its range near 0 or near 1, so at any instant most frames are collapsed or
     full-bleed and only one or two are in transit. Measured mid-pin, three of eight — which is the
     look the bookends were trying to manufacture. It was already there. */
  let prog = 0;

  const timeTo = gsap.quickTo(head, 't', {
    duration: 0.3,
    ease: 'power1',
    onUpdate: () => {
      settings.delta = head.t - lastT;
      lastT = head.t;
      tl.time(head.t);
    },
  });

  /* NO LAG CLAMP HERE, and the reason is worth keeping. A fixed-duration ease can be outrun — a hard
     fling crosses the whole 1720px pin in about 230ms while the catch-up needs its full duration — so
     the obvious fix is to cap how far behind the head may fall and carry it forward when it exceeds
     that. Tried, measured, removed: carrying the head forward means writing tl.time() discontinuously,
     and a timeline that JUMPS does not render what it skipped. The frames that would have bloomed in
     the skipped interval simply never appear. It cost more photographs than the lag did — the ordinary
     wheel case went from 8 of 8 to 5 of 8. Lag is recoverable; a skipped bloom is gone. */

  tl.to(realImages, {
    scale: 1.005,   // 1.005 instead of 1 to prevent a tiny jump on the edge when complete
    ease: 'expo.inOut',
    duration: 8,
    stagger: {
      each: 1,        // 1 × 8 frames = 8 = duration
      repeat: -1,
      onRepeat() {
        const el = this.targets()[0];
        // The source's own read — the sign of the playhead's travel this frame. Same quantity it
        // uses, just derived from the head's own movement rather than from a wheel event.
        const movingForward = settings.delta >= 0;

        zIndex += movingForward ? 1 : -1;
        el.style.zIndex = String(movingForward ? zIndex : zIndex - (realImages.length - 1));

        const referenceEl = movingForward
          ? el.previousElementSibling || realImages[realImages.length - 1]
          : el.nextElementSibling || realImages[0];

        newIndex = mod(
          parseInt(referenceEl.getAttribute('data-index'), 10) + (movingForward ? 1 : -1),
          medias.length
        );

        el.setAttribute('data-index', newIndex);
        el.setAttribute('src', medias[newIndex]);
      },
    },
  }).time(head.t);

  /* [ATMOS 1] The takeover window, and the thing the cycle is now bound to. Two viewport heights of
     pin; the target crosses one whole cycle by LAND and holds there, so a reader who reaches the end
     of this section has seen all eight photographs whatever they scrolled with. */
  const st = ScrollTrigger.create({
    trigger: stage,
    pin: true,
    start: 'top top',
    end: () => '+=' + (window.innerHeight * 2),
    invalidateOnRefresh: true,
    onUpdate: (self) => {
      prog = self.progress;
      timeTo(BASE + Math.min(prog / LAND, 1) * SPAN);
    },
  });

  return function destroy() {
    stage.removeAttribute('data-stream-live');
    try { st.kill(true); } catch (e) { }
    try { gsap.killTweensOf(head); } catch (e) { }
    try { tl.kill(); } catch (e) { }
    try { gsap.set(realImages, { clearProps: 'all' }); } catch (e) { }
    realImages.forEach((el, i) => {
      el.style.zIndex = '';
      el.removeAttribute('data-index');
      if (originalSrc[i] === null) el.removeAttribute('src');
      else el.setAttribute('src', originalSrc[i]);
    });
  };
}
