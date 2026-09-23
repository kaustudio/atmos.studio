/* MWG 001 — the pinned horizontal rail.

   The section pins, the card row travels left by exactly its own overflow, and every card carries a
   second ScrollTrigger that reads its position along that travel rather than down the page — which is
   what `containerAnimation` is for, and the reason each card can drift and un-rotate as it crosses
   the screen instead of all of them moving as one slab.

   On /about it carries "A gallery of possible atmospheres". A gallery is a thing you move ALONG, and
   the eight seeded palettes are the one place on this page with more items than a column wants: as a
   grid they were three cards and an implication, and as a rail they are the whole shelf, read the way
   you would read a shelf.

   Since 16.09.26 it carries the phone story's gallery too: the same scene, with the same statement and
   the close handed off the same way (_syncStory in PaletteApp). There the cards are buttons that open
   an example, and story.css hands them the pointer back from the stage.

   THE MECHANIC IS THE SOURCE'S, UNCHANGED. Every number below is mwg_001's own: the 120vw pad, the
   travel measured as the track's own clientWidth minus a viewport, the 'left 120%' / 'right -20%'
   card window, and the per-card drift drawn from Math.random() in the ranges the source states. An
   earlier pass here replaced the pad with 60vw, re-derived the travel from the last card, and swapped
   the random draw for a seeded table. Each of those was defensible on its own and together they
   changed what the effect IS — the source is a fly-through that opens and closes on empty screen, and
   the adaptation had turned it into a gallery that parks its last card by the right edge. It is back
   to the fly-through.

   WHAT 120vw AND THE TRIGGER OFFSETS ARE TO EACH OTHER. They are one number written twice. With
   `padding: 0 120vw`, at pin start the first card's left edge sits at exactly 120vw, which is exactly
   `start: 'left 120%'` — drift progress zero. At pin end the track has travelled its own width less a
   viewport, so the trailing pad closes flush with the right edge and the last card's right edge is at
   -20vw, which is exactly `end: 'right -20%'` — drift progress one. Every card gets the identical
   window, and both ends of the row are treated the same way. Halving the pad without halving the
   offsets is what broke that coupling.

   [ATMOS 1] The ONE retained deviation, and it is a measurement, not a behaviour. The source computes
   its distance once at DOMContentLoaded. Here the local Neue Montreal .otf lands after mount and the
   route can be resized, so a figure frozen at init is a figure measured against a document that no
   longer exists. The formula is the source's exactly — clientWidth minus a viewport — it is simply
   asked again on refresh instead of once, via a function-valued x and invalidateOnRefresh. On a page
   that never changes size after load the two are the same number.

   [ATMOS 2] Scoped to the root, init/destroy, floored under reduced motion. Without the effect the
   rail is an ordinary horizontally scrollable row — the CSS gives it overflow-x:auto at that point,
   so the content is reachable rather than clipped. A pinned section that cannot animate must not
   become a section you cannot read. */

import { splitChars } from './aboutStickyTitle.js';

function noop() { }

/* [ATMOS 4] 4.1'S HERO TEXT RIDES THIS PIN (15.09.26, by request: the paragraph is the section's hero
   text, with the Sticky Title Scroll Effect, and the images slide across with it, without making a long
   page longer).

   The statement spends the rail's lead-in. The track's leading pad is extended by --rail-lead
   (about.css), so the pin opens on an empty stage for a stretch of scroll, and that stretch is where
   the sentence assembles: the sticky title's reveal (its splitChars, every character's fade half the
   phase long, the starts spread over the other half from the start), then out again from the END as
   the first photograph flies in over it. No takeover section is added; the statement lives inside the
   pin the gallery already owns, in the page's own colours.

   A colour journey was tried on this same pin the same day (a gradient of the photographs' palettes,
   and a close painted to match) and reverted by request: the scene keeps the page's natural colours.

   DRAWN, NOT TWEENED. One ScrollTrigger over the pin's range calls draw(progress), which places every
   character from progress. Where the first card arrives depends on layout, so the phases are
   re-measured on every refresh (a font landing, a resize) rather than baked into a timeline once.
   Reduced motion never gets here: the module has already returned, and the statement is a statement
   above a row. */

export function initHorizontalRail(root) {
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  if (!gsap || !ScrollTrigger || !root) return noop;
  try { if (window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches) return noop; } catch (e) { }
  try { gsap.registerPlugin(ScrollTrigger); } catch (e) { return noop; }

  const container = root.querySelector('[data-rail]');
  const track = container && container.querySelector('[data-rail-track]');
  const cards = track ? [].slice.call(track.querySelectorAll('[data-rail-card]')) : [];
  if (!container || !track || !cards.length) return noop;

  // [ATMOS 1] The source's own formula — `cardsContainer.clientWidth - window.innerWidth` — asked on
  // every refresh rather than once at DOMContentLoaded. clientWidth includes the 120vw pad on both
  // sides, which is what makes the trailing pad close flush with the right edge at pin end.
  const distance = () => Math.max(0, track.clientWidth - window.innerWidth);

  container.setAttribute('data-rail-live', '1');
  // [ATMOS 4] Before the pin measures anything: the scene lengthens the track's lead-in and takes the
  // statement out of the flow, and the travel below must be measured with both already true.
  if (container.querySelector('[data-rail-statement]')) container.setAttribute('data-rail-scene', '1');
  /* [ATMOS 5] THE CLOSE UNDERLAPS THE LAST PHOTOGRAPHS' EXIT (15.09.26, by request: "Start with an image.
     Discover its palette." starts assembling as the images are about to leave, just as 4.1's statement
     gives way as they arrive). The close is marked [data-rail-handoff]; live, about.css pulls it up
     under the end of this pin by exactly its own height and the settle between them, so its sticky
     title's scrub ('top 40%' to 'bottom bottom') runs over the last stretch of this travel and resolves
     the moment the pin releases. This stage stays above it and lets the pointer through. Set here,
     before the pin, and before AboutPage builds the sticky title, so both measure the moved section. */
  const handoff = root.querySelector('[data-rail-handoff]');
  if (handoff) handoff.setAttribute('data-rail-handoff-live', '1');
  /* HOW FAR IT UNDERLAPS IS MEASURED, NOT FIXED (by request: the first cut started while the photographs
     still covered most of the words). The close's reveal starts when its top reaches the line its
     data-sticky-start names ('top top', see aboutStickyTitle.js [ATMOS 13]), so the overlap is chosen to
     put that moment where the last card's right edge clears the statement's left edge: nothing revealed
     is ever under a photograph, and the statement is already standing in place when it begins. Measured
     from layout, without the card's own drift, which carries it further left as it leaves, so the start
     errs late rather than early. It depends on the screen's shape (a phone's cards are a far larger share
     of its width), which is why it is computed rather than written as a figure in the stylesheet, and it
     is re-measured at the START of every refresh ('refreshInit'), so every trigger, the close's
     included, measures the section where it now is. Capped at the close's own height, which would end
     its reveal exactly as the pin releases; less overlap simply lets the statement finish on the empty
     stage after it. */
  const lastCard = cards[cards.length - 1];
  const placeHandoff = () => {
    if (!handoff) return;
    // The close's statement, by its role rather than its class: /about's .about-end__line and the phone
    // story's .story-cta__title are both the wrap's sticky-title heading.
    const line = handoff.querySelector('[data-sticky-title="heading"]');
    const d = distance();
    if (!line || !lastCard || !d) return;
    const vw = window.innerWidth, vh = window.innerHeight;
    const textLeft = vw / 2 - line.offsetWidth / 2;
    const clearFromEnd = (lastCard.offsetLeft + lastCard.offsetWidth - textLeft) - d;
    // Where on the screen the close's top must be for its reveal to begin: its own data-sticky-start
    // ('top top' on /about, so 0), or the resource's 40% when a wrap states none.
    const startAttr = handoff.getAttribute('data-sticky-start') || 'top 40%';
    const pct = /top\s+(\d+(?:\.\d+)?)%/.exec(startAttr);
    const startAt = /top\s+top/.test(startAttr) ? 0 : (pct ? parseFloat(pct[1]) / 100 : 0.4);
    const overlap = Math.max(0, Math.min(handoff.offsetHeight, vh * (1 - startAt) - clearFromEnd));
    handoff.style.setProperty('--handoff-overlap', Math.round(overlap) + 'px');
  };
  placeHandoff();
  if (handoff) ScrollTrigger.addEventListener('refreshInit', placeHandoff);

  const triggers = [];

  /* [ATMOS 6] THE STAGE HOLDS BY position:sticky, NOT BY ScrollTrigger's PIN (23.09.26, for the field
     CLS). The pin switched the stage to position:fixed as the travel began and back as it ended, and
     Chrome scores each switch as the whole screen moving: 0.95 to 0.9994 per switch, measured on /about
     and on the phone story, so every reader who scrolled through the rail scored a CLS of about 1 and
     the two surfaces were filed as poor. Nothing on screen moved; the metric cannot tell.

     So the stage is sticky while the scene is live (about.css, [data-rail-live]) and the scroll the pin
     used to add is a plain block after it, [data-rail-spacer], the travel's length. The section holds
     nothing else, so the stage sticks for exactly that length and lets go where the pin did, and the
     page is the same height. The browser holds a sticky box on its own scrolling thread, which is also
     what the iPhone's "jumps or shakes" at the close asked for (21.09.26): the anticipatePin that
     projected the switch ahead of Safari's momentum has nothing left to switch.

     The TRIGGER is the spacer, not the stage. A sticky box reports where it is stuck, so a refresh taken
     mid-travel (a font landing, a resize) would measure the stage at the top of the screen and move the
     start to wherever the reader happened to be. The spacer never moves: the stage meets the top of the
     screen when the spacer's top is one stage and the stage's margin below it. */
  const spacer = document.createElement('div');
  spacer.setAttribute('data-rail-spacer', '1');
  spacer.setAttribute('aria-hidden', 'true');
  container.after(spacer);
  const sizeSpacer = () => { spacer.style.height = distance() + 'px'; };
  sizeSpacer();
  ScrollTrigger.addEventListener('refreshInit', sizeSpacer);
  const stageStart = () => 'top ' + (container.offsetHeight + (parseFloat(getComputedStyle(container).marginBottom) || 0)) + 'px';

  const scrollTween = gsap.to(track, {
    x: () => -distance(),
    ease: 'none',
    scrollTrigger: {
      trigger: spacer,
      scrub: true,
      start: stageStart,
      end: () => '+=' + distance(),
      invalidateOnRefresh: true,
    },
  });
  if (scrollTween.scrollTrigger) triggers.push(scrollTween.scrollTrigger);

  cards.forEach((card) => {
    /* The source's draw — x between 30 and 50, y between 10 and 16, rotation between 10 and 20 — with
       ONE change, and it is the reason the last card no longer parks in the viewport.

       [ATMOS 3] x KEEPS ITS SIGN: it starts positive and ends negative, always. The source draws the
       sign at random, and a card whose x resolves POSITIVE is pushed to the right by up to half its
       own width at the very moment its window closes — which, for the last card, is the moment the
       track stops. Measured at 1091px: the trailing pad carried that card's right edge to -10vw and
       the drift handed 42% of it back, so a rotated sliver of it stood inside the left edge with
       nothing left to scroll. The first card has the mirror problem at pin start. Ending x on the
       negative side means every card is still moving left, ahead of the track, as it leaves, and
       the 10vw the pad has to spare is never spent. y and rotation keep the random sign; they are
       what the drift's variety was always made of. */
    const values = {
      x: (Math.random() * 20 + 30),
      y: (Math.random() * 6 + 10) * (Math.random() < 0.5 ? 1 : -1),
      rotation: (Math.random() * 10 + 10) * (Math.random() < 0.5 ? 1 : -1),
    };

    const tw = gsap.fromTo(card,
      { rotation: values.rotation, xPercent: values.x, yPercent: values.y },
      {
        rotation: -values.rotation, xPercent: -values.x, yPercent: -values.y,
        ease: 'none',
        scrollTrigger: {
          trigger: card,
          containerAnimation: scrollTween,
          // 110/-10, paired with the 110vw pad in about.css. See the note there for why all three
          // move together, what the old 120/-20 cost the reader, and why 105 was too far.
          start: 'left 110%',
          end: 'right -10%',
          scrub: true,
        },
      });
    if (tw.scrollTrigger) triggers.push(tw.scrollTrigger);
  });

  /* [ATMOS 4] the statement — see the note above initHorizontalRail. */
  const statement = container.querySelector('[data-rail-statement]');
  const split = statement ? splitChars(statement) : null;
  const chars = split ? split.chars : [];
  const shown = new Float32Array(chars.length).fill(-1);
  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  let revealA = 0, revealB = 0, fadeA = 0, fadeB = 0;
  const measure = () => {
    const d = distance();
    const vw = window.innerWidth;
    if (!d || !cards.length) return;
    // Where the first photograph's leading edge reaches the screen's right edge, and its centre the
    // screen's centre: the statement assembles before the one and has gone by the other.
    const first = cards[0];
    const enter = Math.max(0.0001, (first.offsetLeft - vw) / d);
    const firstMid = Math.max(enter, (first.offsetLeft + first.offsetWidth / 2 - vw / 2) / d);
    revealA = enter * 0.12;
    revealB = enter * 0.7;
    fadeA = enter * 0.9;
    fadeB = Math.max(fadeA + 0.0001, enter + (firstMid - enter) * 0.75);
  };
  const draw = (p) => {
    const n = chars.length, W = 0.5;
    const r = revealB > revealA ? clamp01((p - revealA) / (revealB - revealA)) : 1;
    const f = fadeB > fadeA ? clamp01((p - fadeA) / (fadeB - fadeA)) : 0;
    for (let c = 0; c < n; c++) {
      const slot = n > 1 ? c / (n - 1) : 0;
      const o = Math.min(clamp01((r - slot * (1 - W)) / W), 1 - clamp01((f - (1 - slot) * (1 - W)) / W));
      const q = Math.round(o * 100) / 100;
      if (q !== shown[c]) { shown[c] = q; chars[c].style.opacity = String(q); }
    }
  };
  if (chars.length) {
    const scene = ScrollTrigger.create({
      trigger: spacer,
      start: stageStart,
      end: () => '+=' + distance(),
      invalidateOnRefresh: true,
      onRefresh: (self) => { measure(); draw(self.progress); },
      onUpdate: (self) => draw(self.progress),
      // The characters are promoted only while the scene is being scrubbed, as the sticky title's are.
      onToggle: (self) => { try { if (self.isActive) container.setAttribute('data-st-active', '1'); else container.removeAttribute('data-st-active'); } catch (e) { } },
    });
    triggers.push(scene);
    measure();
    draw(scene.progress);
  }

  return function destroy() {
    if (split) { try { split.restore(); } catch (e) { } }
    if (handoff) {
      try { ScrollTrigger.removeEventListener('refreshInit', placeHandoff); } catch (e) { }
      try { handoff.removeAttribute('data-rail-handoff-live'); handoff.style.removeProperty('--handoff-overlap'); } catch (e) { }
    }
    try { ScrollTrigger.removeEventListener('refreshInit', sizeSpacer); } catch (e) { }
    try { spacer.remove(); } catch (e) { }
    container.removeAttribute('data-rail-scene');
    container.removeAttribute('data-st-active');
    container.removeAttribute('data-rail-live');
    triggers.forEach((t) => { try { t.kill(true); } catch (e) { } });
    triggers.length = 0;
    try { gsap.killTweensOf(cards.concat([track])); } catch (e) { }
    try { gsap.set(cards.concat([track]), { clearProps: 'all' }); } catch (e) { }
  };
}
