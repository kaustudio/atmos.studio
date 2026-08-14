/* Osmo Supply — Global Parallax Setup.
   Used verbatim except for the integration accommodations marked [ATMOS] below. The whole data-*
   attribute contract, the matchMedia breakpoints, the clamp()ed scroll positions and every default
   value are the resource's own and are left alone — those attributes are the API this page is
   written against, so renaming or "tidying" one would break markup rather than improve code.

   Three uses on /about, which is why the flexible version is the right one to take:
     · the section band     — an image inside a mask, moving against its frame (the resource's own
                              "Tip for backgrounds": a 120%-tall [data-parallax="target"] inside an
                              overflow-clipped trigger)
     · the role grid        — six cells at staggered start/end, disabled on mobileLandscape
     · the gallery cards    — three columns at 20/30/40, the demo's own row values

   [ATMOS 4] is the same accommodation legalToc.js records: the resource runs itself once on
   DOMContentLoaded, which is all a static document ever needs. /about is a route — it mounts,
   unmounts and can mount again inside one document — so the body is wrapped in an init that takes
   the mounted root and hands back a destroy. */

/* [ATMOS 1] Guarded, and reduced motion is a hard floor rather than a preference.
   The original registers the plugin at the top level and animates unconditionally. On this site the
   vendored scripts are plain <script> tags that can 404, and every surface honours
   prefers-reduced-motion (see PaletteApp._reduce) — a page whose images drift under a reader who has
   asked for stillness is not a page with a nice effect, it is a page ignoring an instruction. Both
   failure paths return the same inert destroy, so the caller has nothing to branch on. */
function noop() { }

export function initGlobalParallax(root) {
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  if (!gsap || !ScrollTrigger || !root) return noop;
  try { if (window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches) return noop; } catch (e) { }
  try { gsap.registerPlugin(ScrollTrigger); } catch (e) { return noop; }

  const mm = gsap.matchMedia();

  mm.add(
    {
      isMobile: "(max-width:479px)",
      isMobileLandscape: "(max-width:767px)",
      isTablet: "(max-width:991px)",
      isDesktop: "(min-width:992px)"
    },
    (context) => {
      const { isMobile, isMobileLandscape, isTablet } = context.conditions

      const ctx = gsap.context(() => {
        // [ATMOS 2] `root` was `document`. It is the mounted route's element now, so a build can
        // never reach markup belonging to a route that is on its way out — and, on the way in, can
        // never bind to the tool's own DOM if a swap leaves both in the tree for a frame.
        root.querySelectorAll('[data-parallax="trigger"]').forEach((trigger) => {
            // Check if this trigger has to be disabled on smaller breakpoints
            const disable = trigger.getAttribute("data-parallax-disable")
            if (
              (disable === "mobile" && isMobile) ||
              (disable === "mobileLandscape" && isMobileLandscape) ||
              (disable === "tablet" && isTablet)
            ) {
              return
            }

            // Optional: you can target an element inside a trigger if necessary
            const target = trigger.querySelector('[data-parallax="target"]') || trigger

            // Get the direction value to decide between xPercent or yPercent tween
            const direction = trigger.getAttribute("data-parallax-direction") || "vertical"
            const prop = direction === "horizontal" ? "xPercent" : "yPercent"

            // Get the scrub value, our default is 'true' because that feels nice with Lenis
            const scrubAttr = trigger.getAttribute("data-parallax-scrub")
            const scrub = scrubAttr ? parseFloat(scrubAttr) : true

            // Get the start position in %
            const startAttr = trigger.getAttribute("data-parallax-start")
            const startVal = startAttr !== null ? parseFloat(startAttr) : 20

            // Get the end position in %
            const endAttr = trigger.getAttribute("data-parallax-end")
            const endVal = endAttr !== null ? parseFloat(endAttr) : -20

            // Get the start value of the ScrollTrigger
            const scrollStartRaw = trigger.getAttribute("data-parallax-scroll-start") || "top bottom"
            const scrollStart = `clamp(${scrollStartRaw})`

           // Get the end value of the ScrollTrigger
            const scrollEndRaw = trigger.getAttribute("data-parallax-scroll-end") || "bottom top"
            const scrollEnd = `clamp(${scrollEndRaw})`

            gsap.fromTo(
              target,
              { [prop]: startVal },
              {
                [prop]: endVal,
                ease: "none",
                scrollTrigger: {
                  trigger,
                  start: scrollStart,
                  end: scrollEnd,
                  scrub,
                },
              }
            )
          })
      })

      return () => ctx.revert()
    }
  )

  /* [ATMOS 3] The way back out. matchMedia().revert() runs every context's own cleanup — the
     `() => ctx.revert()` returned above — which kills the tweens AND the ScrollTriggers they created.
     Leaving them alive would not merely be wasteful: unkilled triggers stay in ScrollTrigger's global
     list measuring detached elements, and the next route's refresh() recalculates against them. */
  return function destroy() {
    try { mm.revert(); } catch (e) { }
  };
}
