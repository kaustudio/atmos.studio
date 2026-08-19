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

/* A CSS TIME IS NOT A NUMBER, and parseFloat is not a parser for one.

   This line used to read `parseFloat(getPropertyValue('--dur-stagger'))`, and in development it was
   right: the stylesheet says `--dur-stagger:.05s`, getPropertyValue hands back the string it was
   authored with, and parseFloat gives 0.05. The production bundle is minified, and a CSS minifier
   rewrites `.05s` as `50ms` because it is two characters shorter and means the same thing to CSS.
   parseFloat drops the unit. The stagger became FIFTY SECONDS.

   Which is exactly, and only, what the reader was seeing. Every cascade set showed its first child
   and nothing else: the second arrived fifty seconds later, the third at a hundred, the tenth row of
   the contrast matrix seven and a half minutes in. The reported list — 1.2 without its WCAG lens,
   1.3 without chroma or hue, 1.4 without large text or meaningful graphics, 2.1 without the reading
   under the swatch, 3.1 with only Background, 3.2 without its rows — is that arithmetic, figure by
   figure, and it is identical in Safari and Chrome on every viewport because it is arithmetic and
   not a browser. It never once appeared in the dev server, which is the only place it was tested.

   So: parse the unit. `s` and `ms` are the only two CSS accepts, a bare number is treated as seconds
   because that is what GSAP means by one, and anything unparseable falls back rather than poisoning
   a timeline. */
function cssSeconds(name, fallback) {
  try {
    const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    if (!raw) return fallback;
    const n = parseFloat(raw);
    if (!isFinite(n) || n <= 0) return fallback;
    return /ms$/i.test(raw) ? n / 1000 : n;
  } catch (e) { return fallback; }
}

/* AND A CEILING OVER THE ANSWER, because the failure above was not that the number was wrong — it
   was that a wrong number could strand a whole figure indefinitely and still look like a working
   page. A beat between siblings in one set is a tenth of a second at the outside; anything larger is
   a mistake somewhere upstream, and this file should degrade to "arrives slightly oddly" rather than
   to "never arrives". */
const MAX_STAGGER = 0.2;
// The longest a set may sit half-arrived before the rescue below stops waiting for it. Comfortably
// past an honest run of the longest set on the page (ten matrix rows) and nowhere near a reader's
// patience.
const MAX_RESCUE_MS = 4000;

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
  const stagger = Math.min(cssSeconds('--dur-stagger', 0.05), MAX_STAGGER);

  const triggers = [];
  const timers = [];
  const touched = [];
  /* Every unit still owing an entrance. A unit is one tween's worth of targets — the whole set on a
     screen it fits, one child on a screen it does not — and it is what both the trigger and the
     sweep act on, so the two cannot reveal the same thing twice or disagree about what is left. */
  const units = [];

  sets.forEach((set) => {
    /* `data-cascade="self"` PARKS THE BLOCK, NOT ITS CHILDREN, and it exists for the sets this module
       could not otherwise touch.

       Audited on /about, eight graphic blocks had no entrance at all and sat fully drawn while the
       copy around them rose out of masks. Four take the ordinary form below. The other three cannot:
       `.pills` is an accordion whose buttons and panels aboutPills.js holds references to, `.about-split`
       has its two faces and its handle positioned by aboutSplitter.js, and `.about-figure__media` wraps
       a single `.about-shot` that aboutParallax.js drives. Parking the CHILDREN of any of those means
       writing autoAlpha and y onto elements another module owns and is mid-way through positioning.

       `data-reveal` is not the alternative either: it routes through pageReveal's revealMasked, which
       calls splitLines, which calls wrapWords and rewrites innerHTML. On an accordion that discards
       the very nodes its own script is holding.

       So the block arrives as one box. Everything else here is unchanged — the same trigger, the same
       catch-up sweep, the same reduced-motion floor — because the only thing that differs is what the
       unit IS. A set of six swatches is six things arriving in sequence; a splitter is one thing. */
    const asSelf = set.getAttribute('data-cascade') === 'self';
    const kids = asSelf
      ? [set]
      : [].slice.call(set.children).filter((el) => el.nodeType === 1);
    if (!asSelf && kids.length < 2) return;

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
    // A self unit is one box by definition, so the tall-set split below does not apply to it: there
    // is nothing to stagger, and splitting a single target into "one group of one" is the same tween
    // with more bookkeeping.
    const perChild = !asSelf && set.getBoundingClientRect().height > window.innerHeight * 0.9;
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
           position mid scroll. Two systems, two properties.

           CAPPED, and the cap is the lesson from the stagger bug rather than a spare precaution. The
           delay is derived from the run's own length, so when the stagger came back a thousand times
           too large this timer scaled with it: ten matrix rows put the rescue eight and a half
           minutes out, and the one mechanism that existed to notice the figure was empty waited
           longer than any reader would. A rescue whose deadline is computed from the thing it is
           rescuing has to be bounded, or it inherits that thing's failure. */
        timers.push(setTimeout(() => {
          if (!unit.host.isConnected || tw.progress() >= 1) return;
          try { tw.kill(); } catch (e) { }
          try { gsap.set(targets, { autoAlpha: 1, y: 0 }); } catch (e) { }
        }, Math.min((MOTION.duration + stagger * targets.length) * 1000 + 900, MAX_RESCUE_MS)));
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
