/* Osmo Supply — Horizontal Scrolling Sections, carrying MWG 001's card move.

   Two resources, one pinned run: Osmo's wrapper does the pin and the translation, and mwg_001's
   per-card counter-drift rides it through `containerAnimation`. See [ATMOS 5] for why they compose
   rather than conflict.


   THE MECHANIC IS THE RESOURCE'S, UNCHANGED. `gsap.matchMedia()` with the resource's four
   breakpoints, a `data-horizontal-scroll-disable` opt-out read off the wrapper, panels collected
   with `gsap.utils.toArray`, `x: () => -(wrap.scrollWidth - window.innerWidth)`, `ease:'none'`,
   and a ScrollTrigger that pins the wrapper with `start:'top top'`,
   `end: () => '+=' + (wrap.scrollWidth - window.innerWidth)`, `scrub:true` and
   `invalidateOnRefresh:true`. Every one of those figures is the source's own, and every data-
   attribute keeps its name.

   [ATMOS 1] WRAPPED IN init/destroy, not run on DOMContentLoaded. The resource is written for a
   document; this is a route that mounts and unmounts, and a pin left alive after unmount holds a
   ScrollTrigger spacer measuring a detached element — which every other trigger on the next surface
   is then refreshed against. `mm.revert()` takes the matchMedia context down with it, which is the
   resource's own cleanup (`return () => ctx.revert()`), reached from a teardown the caller owns.

   [ATMOS 2] GUARDED, on the three things every scroll module here is guarded on: the vendored GSAP
   globals can 404, ScrollTrigger is not registered app-wide, and reduced motion is a hard floor
   rather than a preference. Bailing returns the shared inert `noop`, so the caller has nothing to
   branch on and the markup stays exactly where the stylesheet puts it — a horizontal wrapper that is
   never pinned is an ordinary flex row, which is what the CSS already describes.

   [ATMOS 3] THE PIN IS THE ONE THING ON THIS SITE THAT MOVES THE DOCUMENT'S HEIGHT, so it is built
   before anything that measures. See the build order in PaletteApp._syncStory, which follows
   AboutPage's for the same reason.

   [ATMOS 4] NESTED SCROLL ANIMATIONS INSIDE A PANEL MUST USE containerAnimation. The page is not
   scrolling horizontally — the wrapper is pinned while its panels translate — so a trigger inside a
   panel that measures against the page's vertical scroll will fire at the wrong moment or not at
   all. The tween is returned on the wrapper as `_hsTween` for exactly that: a nested module can read
   it and pass it as `containerAnimation` — which [ATMOS 5] below does for mwg_001's card move. */

function noop() { }

export function initHorizontalScroll(root) {
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  if (!gsap || !ScrollTrigger || !root) return noop;
  try { if (window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches) return noop; } catch (e) { }
  try { gsap.registerPlugin(ScrollTrigger); } catch (e) { return noop; }

  const wraps = [].slice.call(root.querySelectorAll('[data-horizontal-scroll-wrap]'));
  if (!wraps.length) return noop;

  const mm = gsap.matchMedia();

  mm.add(
    {
      isMobile: '(max-width:479px)',
      isMobileLandscape: '(max-width:767px)',
      isTablet: '(max-width:991px)',
      isDesktop: '(min-width:992px)',
    },
    (context) => {
      const { isMobile, isMobileLandscape, isTablet } = context.conditions;

      const ctx = gsap.context(() => {
        wraps.forEach((wrap) => {
          const disable = wrap.getAttribute('data-horizontal-scroll-disable');
          if (
            (disable === 'mobile' && isMobile) ||
            (disable === 'mobileLandscape' && isMobileLandscape) ||
            (disable === 'tablet' && isTablet)
          ) {
            return;
          }

          const panels = gsap.utils.toArray('[data-horizontal-scroll-panel]', wrap);
          if (panels.length < 2) return;

          /* [ATMOS 6] THE ROW ENTERS AND LEAVES FROM OUTSIDE THE VIEWPORT, ON THE SOURCE'S OWN FIGURE.

             This used to travel the full row width rather than mwg_001's `scrollWidth - innerWidth`,
             and the note here argued the departure was needed so the row would clear the screen
             instead of parking with two cards still on show. That was true of the symptom and wrong
             about the cause. The source parks nothing: its row carries 120vw of padding on each side
             (140vw under 900px), so at rest the first card is already a screen and a half off to the
             right, and `scrollWidth - innerWidth` then carries the last card exactly as far off to the
             left. Both ends are outside the viewport because of the PADDING, not because of the
             distance — and this port had dropped the padding and tried to buy the exit back with
             travel, which bought the exit and not the entrance.

             The padding is restored in story.css, so the formula goes back to the source's. rowWidth()
             measures the padding box (see [ATMOS 8]), which is the same quantity `clientWidth` is in
             the original, so this is that line with a transform-proof measurement behind it. */
          /* [ATMOS 8] THE TRAVEL IS MEASURED FROM LAYOUT, NEVER FROM scrollWidth, and this is the fix
             for a row that resets its position after scrolling.

             `wrap.scrollWidth` was the obvious measure and it is not a constant. It reports the
             element's scrollable extent RIGHT NOW, and this element's contents are being transformed
             by two different things: the row tween translating every panel, and mwg_001's drift
             pushing each card up to a quarter of its own width sideways inside its panel. Measured on
             this surface at 375px: 1880 at rest, 1838 the moment the panels start moving, against a
             true row width of 1841. The 39px surplus at rest is the drift's overhang; the 42px
             shortfall in flight is the row having left.

             Both `x` and `end` are functions, and `invalidateOnRefresh:true` re-evaluates them on
             every refresh — which is correct and is what makes a resize honest. The consequence was
             not. A refresh that lands while the reader is halfway across re-reads the shrunken figure
             and re-targets the tween, so the row snaps. Measured: one ScrollTrigger.refresh() at 50%
             moved x from -940 to -717, a 223px jump with no scroll input at all. On a phone that
             refresh is not hypothetical or rare — collapsing the URL bar resizes the viewport, which
             is exactly what fires it, and it fires while the reader's thumb is still on the glass.

             offsetWidth is layout width. Transforms do not touch it, so this returns the same 1841 at
             rest, in flight and after a refresh, while still re-measuring for a genuine resize. */
          /* [ATMOS 10] THE VIEWPORT IS documentElement.clientWidth, NOT window.innerWidth.

             The source uses innerWidth and is right to on a plain page. Here the lead-in and lead-out
             are expressed in `vw`, and `vw` resolves against the CSS viewport — which is what
             documentElement.clientWidth reports and what innerWidth does not always agree with. It
             excludes a classic scrollbar, and under a zoomed or scaled presentation the two diverge
             outright: measured in this project's own preview at the phone preset, innerWidth said 1050
             while 100vw, documentElement.clientWidth and visualViewport all said 375. The padding was
             therefore laid out in 375s and the travel computed against 1050, leaving the run 675px
             short and the row parked before it had left.

             Two quantities that must cancel have to be read in the same unit. */
          const viewportW = () => document.documentElement.clientWidth || window.innerWidth;
          // Same argument on the other axis, and the same measured divergence: 2274 against a real
          // 812. The catch-up below compares against it, so an inflated figure fires the arrival
          // roughly two and a half screens before the card is due.
          const viewportH = () => document.documentElement.clientHeight || window.innerHeight;

          const rowWidth = () => {
            const cs = getComputedStyle(wrap);
            const gap = parseFloat(cs.columnGap) || 0;
            const padL = parseFloat(cs.paddingLeft) || 0;
            const padR = parseFloat(cs.paddingRight) || 0;
            // offsetWidth excludes margins, and the lead in and lead out are margins on the first
            // and last panel (see story.css) — so they are added back explicitly here.
            const firstEl = panels[0], lastEl = panels[panels.length - 1];
            const leadIn = firstEl ? (parseFloat(getComputedStyle(firstEl).marginInlineStart) || 0) : 0;
            const leadOut = lastEl ? (parseFloat(getComputedStyle(lastEl).marginInlineEnd) || 0) : 0;
            return panels.reduce((sum, p) => sum + p.offsetWidth, 0)
              + gap * Math.max(0, panels.length - 1) + padL + padR + leadIn + leadOut;
          };

          const tween = gsap.to(panels, {
            x: () => -(rowWidth() - viewportW()),
            ease: 'none',
            scrollTrigger: {
              trigger: wrap,
              start: 'top top',
              end: () => '+=' + (rowWidth() - viewportW()),
              scrub: true,
              pin: true,
              invalidateOnRefresh: true,
            },
          });
          // See [ATMOS 4]: the handle a nested trigger needs for containerAnimation.
          wrap._hsTween = tween;

          /* [ATMOS 5] MWG 001's CARD MOVE, on this wrapper's container animation.

             The horizontal resource translates panels and stops there — a row of cards sliding past
             is correct and inert. mwg_001 is the one that gives them life: each card counter-moves
             through its own pass, `fromTo` a random offset to its exact opposite, so a card drifts
             one way while the row travels the other and no two cards drift alike. Its three ranges
             are the source's own — x between ±30 and ±50 percent, y between ±10 and ±16, rotation
             between ±10 and ±20 — as is `ease:'none'`, `start:'left 120%'`, `end:'right -20%'` and
             the scrub.

             THE RANGES ARE HALVED HERE, and that is the one number changed. The source's card is a
             tall slab on a desktop row where ±50% of its own width is a drift; ours is 280px on a
             375px screen, where the same figure walks a card most of the way off the panel it is
             meant to be in. Halved they read as the same gesture at the scale the phone actually
             draws it.

             `containerAnimation` is what makes any of it fire: the page is not scrolling sideways —
             the wrapper is pinned while its panels translate — so a trigger measuring the page's
             vertical scroll would never see a card cross its own start. Both the resource's docs and
             mwg_001 itself say this; it is the single thing that makes nested triggers work in here. */
          const rand = (min, max) => (Math.random() * (max - min) + min) * (Math.random() < 0.5 ? 1 : -1);
          panels.forEach((panel) => {
            const card = panel.firstElementChild;
            if (!card) return;
            const v = { x: rand(15, 25), y: rand(5, 8), rotation: rand(5, 10) };
            gsap.fromTo(card,
              { rotation: v.rotation, xPercent: v.x, yPercent: v.y },
              {
                rotation: -v.rotation, xPercent: -v.x, yPercent: -v.y,
                ease: 'none',
                scrollTrigger: {
                  trigger: card,
                  containerAnimation: tween,
                  start: 'left 120%',
                  end: 'right -20%',
                  scrub: true,
                },
              });
          });
          /* [ATMOS 7] THE ROW ARRIVES. Seven photographs may not simply be there.

             Every other block on this surface rises out of a mask: the headings split into lines, the
             body copy follows them, the figures cascade. The rail did not, because nothing selected
             it — the reveal groups are built from [data-sec-head] and [data-reveal], the cascade from
             [data-cascade], and the panels carry none of them. So the reader met a heading and a
             sentence arriving out of nothing over seven full-colour cards that had been sitting at
             opacity 1 since the page rendered. That is the standing note on this surface, verbatim:
             when there is a masked text reveal already, graphics that are visible before it look
             wrong.

             WHY IT IS HERE AND NOT data-cascade ON THE WRAP. initCascade is the right module and it
             would bind, but it asks whether the set is taller than 0.9 of the window and reveals
             child by child when it is. This set is a ROW: it is exactly one screen tall, so it trips
             that test, and each panel would then get its own trigger measured against the same
             vertical position — seven triggers firing on one frame, with the stagger that makes a
             cascade read as a cascade lost between them. A row is one object arriving, so it is one
             tween with a stagger inside it.

             THE PROPERTIES ARE CHOSEN TO NOT COLLIDE. The pin tween owns `x` on these same panels and
             the drift owns rotation, xPercent and yPercent on the CARD inside each one. This writes
             autoAlpha and `y` on the panel: a different element from the drift, and different
             properties from the tween, so nothing here can be overwritten by either.

             ONCE, AND BEFORE THE PIN. The start is above the pin's own `top top`, so it resolves
             while the wrap is still in normal flow and the reader is still reading the sentence above
             it. `once` because an arrival that replays every time the reader scrolls back up is not
             an arrival. The floor is a fully visible row: this is guarded on reduced motion by the
             matchMedia gate this whole context sits inside, and if the trigger never fires the set()
             below is the only thing that could hide them, so it is paired with a catch-up that runs
             on refresh. */
          gsap.set(panels, { autoAlpha: 0, y: 14 });
          const arrival = gsap.to(panels, {
            autoAlpha: 1,
            y: 0,
            duration: 0.62,
            ease: 'power3.out',
            stagger: 0.05,
            paused: true,
          });
          /* [ATMOS 9] IT ARRIVES WHERE THE READER CAN SEE IT ARRIVE.

             The trigger was the WRAP at `top 88%`, and that was wrong by roughly a quarter of a
             screen. The wrap is 100svh with its panels centred, so the first card's top sits about
             247px BELOW the wrap's own top. Firing when the wrap reached 88% of the viewport put the
             card at y ~961 on an 812 screen — off the bottom edge. The fade ran to completion in the
             dark and the cards then slid up already drawn, which is indistinguishable from never
             having animated at all, and is the exact complaint: the row is visible before scrolling
             continues.

             So the trigger is the CARD, not its wrapper, and it starts as the card's own top edge
             crosses the bottom of the viewport. Nothing of the row is drawn while the reader is still
             on 3.1's sentence; the first thing that happens to it happens in front of them. */
          const firstCard = panels[0] && panels[0].firstElementChild;
          const arriveTrigger = ScrollTrigger.create({
            trigger: firstCard || wrap,
            start: 'top 98%',
            once: true,
            onEnter: () => arrival.play(),
          });
          /* onEnter DOES NOT FIRE FOR A TRIGGER CREATED INSIDE ITS OWN RANGE — GSAP suppresses it so
             animations do not replay on resize, and a later refresh corrects the numbers without
             undoing the suppression. pageReveal.js and aboutCascade.js both carry this note and both
             answer it with a sweep; this is that sweep, for one set. Without it, a reader who lands
             deep in the page (a dock jump, a restored scroll position, a case change that rebuilds
             here) gets a permanently invisible row. */
          const catchUp = () => {
            if (arrival.progress() > 0 || !wrap.isConnected) return;
            const ref = firstCard || wrap;
            if (ref.getBoundingClientRect().top < viewportH() * 0.98) arrival.play();
          };
          ScrollTrigger.addEventListener('refresh', catchUp);
          const t1 = setTimeout(catchUp, 240);
          const t2 = setTimeout(catchUp, 1200);
          wrap._hsArrival = () => {
            clearTimeout(t1); clearTimeout(t2);
            try { ScrollTrigger.removeEventListener('refresh', catchUp); } catch (e) { }
            try { arriveTrigger.kill(); } catch (e) { }
            try { arrival.kill(); } catch (e) { }
            try { gsap.set(panels, { clearProps: 'opacity,visibility,y' }); } catch (e) { }
          };

          // The house's `-live` contract, so the stylesheet can describe the pinned state and the
          // un-pinned floor separately and neither has to guess which one is in force.
          wrap.setAttribute('data-horizontal-live', '1');
        });
      }, root);

      return () => ctx.revert();
    },
  );

  return function destroy() {
    try { mm.revert(); } catch (e) { }
    wraps.forEach((w) => {
      try { if (w._hsArrival) w._hsArrival(); } catch (e) { }
      try { delete w._hsArrival; } catch (e) { }
      try { w.removeAttribute('data-horizontal-live'); } catch (e) { }
      try { delete w._hsTween; } catch (e) { }
    });
  };
}
