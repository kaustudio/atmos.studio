/* THE SETS THAT ARRIVED ALL AT ONCE.

   Audited against the rest of the page, three groups had no entrance of any kind: the six role
   cells, the six pills, and the ten rows of the contrast matrix. Every heading and paragraph on this
   page is masked in line by line, every figure's hairline is drawn from its leading edge, every
   photograph moves against its frame — and then a set of six or ten identical objects simply existed,
   fully formed, the moment it came into view. That is the difference the page reads as "not quite
   smooth": not a missing effect, an inconsistent one. Something arrives, something else is just there.

   ONE BEAT ACROSS THE SET, not one per element — WHERE THE SET IS ONE THING TO LOOK AT.

   The elements go up together on a stagger, which is the app's own list cascade — the same gesture
   the archive uses when its rows land, and the same tokens: the reveal duration and entrance ease
   handed in from renderVals, and the app's --dur-stagger as the beat between siblings. Nothing here
   invents a timing.

   That argument holds while the set is a GRID the eye takes in at once, which is what these are on a
   wide screen. It stops holding the moment the grid becomes a column taller than the window, which
   is what every one of them does on a phone. Measured at 375x812: the role cells stack to 933px and
   the axes to 753px, so when the set's own top crosses the enter line the LAST child is 836px and
   656px below the fold respectively — a full screen further on. One trigger at the set's top was
   therefore playing the whole cascade off-screen, and the reader arrived at content that had already
   finished arriving. Worse, it made the set all-or-nothing: one trigger, one tween, six or ten
   elements parked at autoAlpha 0 behind it, so anything that interrupted that single tween left the
   entire set invisible with nothing to un-park it. Reported from a phone as "only the first one
   shows up", on six different figures.

   So a set that does not fit the viewport is revealed CHILD BY CHILD, each on its own trigger as it
   genuinely arrives. That is not a second design — it is the same one, told the truth about its
   shape: a column you scroll through is a sequence, and a sequence arrives in sequence.

   WHY --dur-stagger AND NOT THE MASK STAGGER. The masked-line runs use 0.09s, deliberately wider than
   the app's own 0.05s, because lines of a sentence want to read in sequence. These are not lines of a
   sentence; they are a set the eye takes in as one object, and at 0.09 across ten matrix rows the
   last row lands nearly a second after the first, which stops being a cascade and starts being a
   queue. 0.05 is the token for siblings in a set, and that is what these are.

   NOTHING HERE MAY DEPEND ON onEnter, and that is the second half of the same bug. A ScrollTrigger
   created inside its own range never fires its enter callback — GSAP suppresses it deliberately, so
   animations do not replay on resize — and a later refresh() corrects the numbers without undoing
   the suppression. pageReveal.js carries a long note on this and a catch-up sweep to answer it; this
   file had neither, and its failsafe was armed INSIDE onEnter, which is the one place that cannot
   help when onEnter is the thing that never happened. The sweep below is pageReveal's, in miniature:
   the trigger and the catch-up read one ENTER constant so they can never disagree about when a unit
   is due, the sweep reveals only what is already above that line so it can never pre-empt anything
   still below the fold, and it runs on every event that moves the ground — creation, fonts, load, and
   any ScrollTrigger refresh — plus two plain timers, because a stalled ticker is exactly the case a
   requestAnimationFrame-throttled rescue cannot cover.

   THE FLOOR IS EVERYTHING VISIBLE. Nothing is hidden in CSS. The hidden state is applied by this
   module, and only after it has confirmed GSAP, ScrollTrigger and a willingness to animate — so no
   JS, no ScrollTrigger, or a reduced-motion preference all leave a grid of six cells and a table of
   ten rows exactly where the stylesheet puts them. */

function noop() { }

const FALLBACK = { duration: 0.62, ease: 'cubic-bezier(0.16, 1, 0.3, 1)' };

/* Read by the trigger AND by the catch-up sweep. One number, for the reason pageReveal.js records at
   length: when the two disagreed about what "due" meant, which of them revealed a block depended on
   a 120ms throttle, and the composition the cascade exists to impose was won or lost by a race. */
const ENTER = 0.88;

export function initCascade(root, motion) {
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  if (!gsap || !ScrollTrigger || !root) return noop;
  try { if (window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches) return noop; } catch (e) { }
  try { gsap.registerPlugin(ScrollTrigger); } catch (e) { return noop; }

  const sets = [].slice.call(root.querySelectorAll('[data-cascade]'));
  if (!sets.length) return noop;

  const MOTION = motion || FALLBACK;
  // The beat between siblings, read from the stylesheet so it cannot drift from the token.
  let stagger = 0.05;
  try {
    const v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--dur-stagger'));
    if (isFinite(v) && v > 0) stagger = v;
  } catch (e) { }

  const triggers = [];
  const timers = [];
  const touched = [];
  /* Every unit still owing an entrance. A unit is one tween's worth of targets — the whole set on a
     screen it fits, one child on a screen it does not — and it is what both the trigger and the
     sweep act on, so the two cannot reveal the same thing twice or disagree about what is left. */
  const units = [];

  sets.forEach((set) => {
    const kids = [].slice.call(set.children).filter((el) => el.nodeType === 1);
    if (kids.length < 2) return;

    /* 12px, and it is small on purpose. These are not entering from off-screen — they are already in
       their own layout, and the travel is only there to give the fade a direction. A larger rise on a
       six-cell grid reads as the grid assembling itself, which is a bigger claim than a set of
       swatches should be making. */
    gsap.set(kids, { autoAlpha: 0, y: 12 });
    touched.push(kids);

    /* 0.9 rather than 1: a set a hair shorter than the window still puts its last child against the
       bottom edge, where "arrives as you reach it" and "arrived before you got here" are the same
       frame. Measured at build — these sets are type and swatches, so their height does not depend on
       an image that has yet to load, and the ones that DO change with the viewport change because the
       viewport changed, which is a reload-shaped event on the device this matters on. */
    const perChild = set.getBoundingClientRect().height > window.innerHeight * 0.9;
    const groups = perChild ? kids.map((k) => [k]) : [kids];

    groups.forEach((targets) => {
      const unit = { targets, host: targets[0], done: false };

      unit.run = () => {
        if (unit.done || !unit.host.isConnected) return;
        unit.done = true;
        const tw = gsap.to(targets, {
          autoAlpha: 1, y: 0,
          duration: MOTION.duration,
          ease: MOTION.ease,
          stagger: stagger,
          overwrite: 'auto',
        });
        /* The per-run failsafe, which is now a second line of defence rather than the only one: the
           sweep below already guarantees a stranded unit is reached. This one covers the narrower
           case of a run that STARTS and then stalls — a tab backgrounded mid-cascade, a ticker that
           stops between the first sibling and the last — and it only ever touches what this module
           owns. y:0 rather than clearProps:'transform': the six role cells are ALSO parallax
           triggers, and aboutParallax animates the trigger itself on yPercent when it finds no inner
           target, so clearing the whole transform here would drop a cell back to its unscrolled
           position mid scroll. Two systems, two properties. */
        timers.push(setTimeout(() => {
          if (!unit.host.isConnected || tw.progress() >= 1) return;
          try { tw.kill(); } catch (e) { }
          try { gsap.set(targets, { autoAlpha: 1, y: 0 }); } catch (e) { }
        }, (MOTION.duration + stagger * targets.length) * 1000 + 900));
      };

      units.push(unit);
      triggers.push(ScrollTrigger.create({
        trigger: unit.host,
        // Late enough that the unit is genuinely being looked at, early enough that the last sibling
        // has landed before the eye reaches it. Same band the section reveals use.
        start: 'top ' + (ENTER * 100) + '%',
        once: true,
        invalidateOnRefresh: true,
        onEnter: unit.run,
      }));
    });
  });

  if (!units.length) return noop;

  /* THE SWEEP. Anything whose enter line has already passed and which onEnter never announced. It
     reveals through unit.run, so a caught-up set cascades exactly as a scrolled-to one does rather
     than snapping on; unit.done is what stops the two paths ever running the same unit twice. */
  function catchUp() {
    const limit = window.innerHeight * ENTER;
    units.forEach((u) => {
      if (u.done || !u.host.isConnected) return;
      if (u.host.getBoundingClientRect().top >= limit) return;   // genuinely still below — leave it
      u.run();
    });
  }

  catchUp();
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => { if (root.isConnected) catchUp(); });
  }
  const onLoad = () => { if (root.isConnected) catchUp(); };
  window.addEventListener('load', onLoad);
  /* A refresh is precisely when a start is recomputed, which is precisely when a trigger can end up
     sitting inside a range it never announced entering. Cheap: the sweep is a rect read per unit
     still owing one, and units retire permanently as they run. */
  try { ScrollTrigger.addEventListener('refresh', catchUp); } catch (e) { }
  /* setTimeout, not requestAnimationFrame. The failure these cover is a ticker that never woke, and
     a backgrounded tab reports zero rAF callbacks — the one clock that still runs is this one. Two
     of them: one after the first paint has settled, one late enough to outlast a slow font or a slow
     image. Both go through the same viewport-aware sweep, so neither can reveal anything the reader
     has not reached. */
  timers.push(setTimeout(catchUp, 1200));
  timers.push(setTimeout(catchUp, 4000));

  return function destroy() {
    try { ScrollTrigger.removeEventListener('refresh', catchUp); } catch (e) { }
    window.removeEventListener('load', onLoad);
    triggers.forEach((t) => { try { t.kill(); } catch (e) { } });
    triggers.length = 0;
    timers.forEach(clearTimeout);
    timers.length = 0;
    units.length = 0;
    touched.forEach((kids) => { try { gsap.killTweensOf(kids); gsap.set(kids, { clearProps: 'opacity,visibility,y' }); } catch (e) { } });
    touched.length = 0;
  };
}
