/* MWG 001 — the pinned horizontal rail.

   The section pins, the card row travels left by exactly its own overflow, and every card carries a
   second ScrollTrigger that reads its position along that travel rather than down the page — which is
   what `containerAnimation` is for, and the reason each card can drift and un-rotate as it crosses
   the screen instead of all of them moving as one slab.

   On /about it carries "A gallery of possible atmospheres". A gallery is a thing you move ALONG, and
   the eight seeded palettes are the one place on this page with more items than a column wants: as a
   grid they were three cards and an implication, and as a rail they are the whole shelf, read the way
   you would read a shelf.

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

function noop() { }

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

  const triggers = [];

  const scrollTween = gsap.to(track, {
    x: () => -distance(),
    ease: 'none',
    scrollTrigger: {
      trigger: container,
      pin: true,
      scrub: true,
      start: 'top top',
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

  return function destroy() {
    container.removeAttribute('data-rail-live');
    triggers.forEach((t) => { try { t.kill(true); } catch (e) { } });
    triggers.length = 0;
    try { gsap.killTweensOf(cards.concat([track])); } catch (e) { }
    try { gsap.set(cards.concat([track]), { clearProps: 'all' }); } catch (e) { }
  };
}
