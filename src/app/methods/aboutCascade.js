/* THE SETS THAT ARRIVED ALL AT ONCE.

   Audited against the rest of the page, three groups had no entrance of any kind: the six role
   cells, the six pills, and the ten rows of the contrast matrix. Every heading and paragraph on this
   page is masked in line by line, every figure's hairline is drawn from its leading edge, every
   photograph moves against its frame — and then a set of six or ten identical objects simply existed,
   fully formed, the moment it came into view. That is the difference the page reads as "not quite
   smooth": not a missing effect, an inconsistent one. Something arrives, something else is just there.

   ONE BEAT ACROSS THE SET, not one per element. The elements go up together on a stagger, which is
   the app's own list cascade — the same gesture the archive uses when its rows land, and the same
   tokens: the reveal duration and entrance ease handed in from renderVals, and the app's --dur-stagger
   as the beat between siblings. Nothing here invents a timing.

   WHY --dur-stagger AND NOT THE MASK STAGGER. The masked-line runs use 0.09s, deliberately wider than
   the app's own 0.05s, because lines of a sentence want to read in sequence. These are not lines of a
   sentence; they are a set the eye takes in as one object, and at 0.09 across ten matrix rows the
   last row lands nearly a second after the first, which stops being a cascade and starts being a
   queue. 0.05 is the token for siblings in a set, and that is what these are.

   THE FLOOR IS EVERYTHING VISIBLE. Nothing is hidden in CSS. The hidden state is applied by this
   module, and only after it has confirmed GSAP, ScrollTrigger and a willingness to animate — so no
   JS, no ScrollTrigger, or a reduced-motion preference all leave a grid of six cells and a table of
   ten rows exactly where the stylesheet puts them. */

function noop() { }

const FALLBACK = { duration: 0.62, ease: 'cubic-bezier(0.16, 1, 0.3, 1)' };

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
  const touched = [];

  sets.forEach((set) => {
    const kids = [].slice.call(set.children).filter((el) => el.nodeType === 1);
    if (kids.length < 2) return;

    /* 12px, and it is small on purpose. These are not entering from off-screen — they are already in
       their own layout, and the travel is only there to give the fade a direction. A larger rise on a
       six-cell grid reads as the grid assembling itself, which is a bigger claim than a set of
       swatches should be making. */
    gsap.set(kids, { autoAlpha: 0, y: 12 });
    touched.push(kids);

    let failsafe = null;

    const st = ScrollTrigger.create({
      trigger: set,
      // Late enough that the set is genuinely being looked at, early enough that the last sibling has
      // landed before the eye reaches it. Same band the section reveals use.
      start: 'top 88%',
      once: true,
      invalidateOnRefresh: true,
      onEnter: () => {
        const tw = gsap.to(kids, {
          autoAlpha: 1, y: 0,
          duration: MOTION.duration,
          ease: MOTION.ease,
          stagger: stagger,
          overwrite: 'auto',
        });
        /* THE FAILSAFE STARTS HERE, not at mount, and that distinction is the whole of it. Armed on a
           plain timer from build time it cannot tell "parked because the reader has not reached this
           yet" from "parked because the ticker never woke" — so it fired two and a half seconds into
           the page and un-parked every set below the fold, and the cascade never played for any of
           them. Measured: all four sets already visible at load. Started here it only ever guards a
           run that has actually begun. */
        failsafe = setTimeout(() => {
          if (!set.isConnected || tw.progress() >= 1) return;
          try { tw.kill(); } catch (e) { }
          /* y:0 rather than clearProps:'transform'. The six role cells are ALSO parallax triggers, and
             aboutParallax animates the trigger itself on yPercent when it finds no inner target — so
             clearing the whole transform here would drop a cell back to its unscrolled position mid
             scroll. Two systems, two properties, and only the one this module owns is put back. */
          try { gsap.set(kids, { autoAlpha: 1, y: 0 }); } catch (e) { }
        }, (MOTION.duration + stagger * kids.length) * 1000 + 900);
      },
    });
    triggers.push(st);
    triggers.push({ kill: () => clearTimeout(failsafe) });
  });

  return function destroy() {
    triggers.forEach((t) => { try { t.kill(); } catch (e) { } });
    triggers.length = 0;
    touched.forEach((kids) => { try { gsap.killTweensOf(kids); gsap.set(kids, { clearProps: 'opacity,visibility,y' }); } catch (e) { } });
    touched.length = 0;
  };
}
