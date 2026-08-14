/* Osmo Supply — Scaling Element on Scroll (GSAP Flip).
   The mechanic is the resource's own and is kept exactly: two or more [data-flip-element="wrapper"]
   waypoints, one [data-flip-element="target"] living inside the first, and a scrubbed timeline of
   Flip.fit tweens whose durations are the PIXEL distances between the wrappers' centres — which is
   what makes one scroll of the page map linearly onto the whole journey.

   On /about it carries the page's subject: the reference photograph starts as a plate in the hero
   and, as you scroll, becomes the full-width image the rest of the page argues about. It is the one
   piece of motion here that is not decoration — the growth IS the sentence "we read its light and
   atmosphere", performed before the words arrive.

   [ATMOS 1] Scoped to the mounted root, and wrapped in init/destroy. Same two reasons as the other
   two resources: this is a route rather than a document, and the resource's own querySelector was
   over `document`. Note the resource's rule survives the change — ONE target per page — it is simply
   one target per mounted route now.

   [ATMOS 2] Guarded on gsap, ScrollTrigger, Flip and reduced motion, and on there being at least two
   wrappers and a target. Without JS or under reduced motion the target simply sits in the first
   wrapper at its authored size, which is a photograph in a plate: the floor is the design, not a
   broken version of it. That is also what the no-JS prerender of this page renders.

   [ATMOS 3] Rebuilt on document.fonts.ready as well as on resize. The resource rebuilds on resize
   because the wrappers' rects decide everything; on this site Neue Montreal is a local .otf loaded
   with font-display:swap, so every heading above the plate moves when the real face lands and the
   measured distance between the two wrappers is wrong until it does. Same trap the TOC and the
   reveal both record — see [ATMOS 2] in legalToc.js. */

function noop() { }

export function initFlipOnScroll(root) {
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  const Flip = window.Flip;
  if (!gsap || !ScrollTrigger || !Flip || !root) return noop;
  try { if (window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches) return noop; } catch (e) { }
  try { gsap.registerPlugin(ScrollTrigger, Flip); } catch (e) { return noop; }

  let wrapperElements = root.querySelectorAll("[data-flip-element='wrapper']");
  let targetEl = root.querySelector("[data-flip-element='target']");
  if (wrapperElements.length < 2 || !targetEl) return noop;

  let tl;
  function flipTimeline() {
    if (tl) {
      // The ScrollTrigger too, explicitly. A rebuild that killed only the timeline would leave its
      // trigger measuring a timeline that no longer exists, once per resize tick.
      try { if (tl.scrollTrigger) tl.scrollTrigger.kill(); } catch (e) { }
      tl.kill();
      gsap.set(targetEl, { clearProps: "all" });
    }

    // Use the first and last wrapper elements for the scroll trigger.
    tl = gsap.timeline({
      scrollTrigger: {
        trigger: wrapperElements[0],
        start: "center center",
        endTrigger: wrapperElements[wrapperElements.length - 1],
        end: "center center",
        scrub: 0.25
      }
    });

    // Loop through each wrapper element.
    wrapperElements.forEach(function(element, index) {
      let nextIndex = index + 1;
      if (nextIndex < wrapperElements.length) {
        let nextWrapperEl = wrapperElements[nextIndex];
        // Calculate vertical center positions relative to the document.
        let nextRect = nextWrapperEl.getBoundingClientRect();
        let thisRect = element.getBoundingClientRect();
        let nextDistance = nextRect.top + window.pageYOffset + nextWrapperEl.offsetHeight / 2;
        let thisDistance = thisRect.top + window.pageYOffset + element.offsetHeight / 2;
        let offset = nextDistance - thisDistance;
        // Add the Flip.fit tween to the timeline.
        tl.add(
          Flip.fit(targetEl, nextWrapperEl, {
            duration: offset,
            ease: "none"
          })
        );
      }
    });
  }

  /* [ATMOS 4] The same `-live` signal aboutRail and aboutStream set, and for the same reason: the
     plates are drawn as visible frames so the destination is not a hole in the page, and that is only
     true when nothing is going to arrive in it. Once the flip is running the destination must recede
     into the background — an empty bordered panel that a photograph is about to land in is a hierarchy
     element competing with the argument around it. CSS owns the appearance; this just says which of
     the two situations we are in, so no-JS, no-GSAP and reduced motion all keep the drawn frame. */
  root.setAttribute('data-flip-live', '1');

  flipTimeline();

  let resizeTimer;
  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      if (root.isConnected) flipTimeline();
    }, 100);
  }
  window.addEventListener("resize", onResize);

  // [ATMOS 3] — see the note above.
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { if (root.isConnected) flipTimeline(); });
  }

  return function destroy() {
    try { root.removeAttribute('data-flip-live'); } catch (e) { }
    window.removeEventListener("resize", onResize);
    clearTimeout(resizeTimer);
    if (tl) {
      try { if (tl.scrollTrigger) tl.scrollTrigger.kill(); } catch (e) { }
      try { tl.kill(); } catch (e) { }
      // The target has to be put back where the markup puts it, or a route that mounts again inherits
      // the width, height and transform the last scroll position happened to leave behind.
      try { gsap.set(targetEl, { clearProps: "all" }); } catch (e) { }
      tl = null;
    }
  };
}
