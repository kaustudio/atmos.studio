# 007 — The phone gets a product, not a refusal

**Commit:** landed across `3791395`, `0687cea`, `32f910d`, `26bf981`
**Revised:** after the surface was rebuilt on /about's components. The chapter table, the
verification and the open list below describe what SHIPPED, not the first architecture.
**Severity:** HIGH · **Category:** Product / Mobile
**Depends on:** none
**Risk:** medium — a new phone surface, a new stylesheet, a new ScrollTrigger module. Desktop untouched by construction.

## Problem

Below 720px (and on a phone turned sideways) the site said:

> **Atmos Gallery is a Desktop Experience.**
> Reading an image means weighing colours, roles and contrast side by side. That needs room.

with one act, `Try an Example`. Every sentence of that is true. It is still the wrong screen, for one
reason that outranks the rest: **most shared links are opened on a phone**, so the surface that met
the largest share of first-time visitors was an apology. It stated a limitation before it had shown
anything worth being limited by.

The brief (`atmos-mobile-product-story.md`) puts it as three questions a reader should be able to
answer after 15–30 seconds: what does Atmos do, how is it different from a palette generator, and why
should I open it on a desktop. The gate answered none of them.

## The change

Eight chapters, one photograph, native scroll. `See the image → discover the colours → understand
their roles → read the atmosphere → explore more → continue on desktop.`

The desktop sentence is not deleted. It is chapter 8, where it is an invitation rather than a refusal.

| Shown as | Section | What it shows | Where the data comes from |
|---|---|---|---|
| — | `story-hero` | The orb formation and the brand statement, sticky, dissolving in place | the landing stage, showing through |
| 1.1 | `story-image` | The case photograph, whole | `dispUrl(p)` → bundled `EXAMPLE_SRC` |
| 1.2 | `story-structure` | Five fields at their real shares, then the key as a tally | `swatch.weight` |
| 1.3 | `story-where` | Where each colour lives in the frame | `src/lib/masks.js`, computed at runtime |
| 2.1 | `story-relationships` | Character / Role / Contrast, on one segmented control | `analysePalette`, `semanticRoles`, `paletteMetrics` |
| 2.2 | `story-interpretation` | The reading, and what it is for | `p.rationale`, `composeUse()` |
| 3.1 | `story-gallery` | The other seven cases, as a pinned horizontal row | `_examples()` |
| 3.2 | `story-handoff` | The desktop invitation, as a full-screen takeover | `handoffLine` |

The numbers are the reader's, and they are the dock's: `.about-sec__num` was removed from every
heading, so the numbering lives in the anchor dock where it is navigational rather than printed twice.

## The surface is /about's components, not its own

This is the single largest departure from the first draft, which built bespoke markup and a bespoke
`methods/story.js`. Both are gone. The story is assembled from the components `/about` already ships
— `.about-sec`, `.about-grid`, `.about-col`, `.about-figure`, `.about-weights`, `.about-role`,
`.about-checks`, `.about-rail`, `.section-dock` — and driven by that page's own modules, each of
which takes a root: `initPageReveal`, `initCascade`, `initHighlightText`, `initStickyTitle`,
`initSectionDock`. `about.css` is already in this route's bundle, and where a rule was route-scoped
its scope was widened to name this surface rather than being copied.

Four resources were ported for what /about had no equivalent of, each with its departures recorded
in its own header:

| Module | Resource | Departures |
|---|---|---|
| `horizontalScroll.js` | Osmo Horizontal Scrolling Sections + mwg_001's card drift | `[ATMOS 5-10]` — halved drift ranges, layout-measured travel, the 140vw lead in, `documentElement` as the viewport |
| `layeredSlider.js` | Osmo Layered Image Slider | `[ATMOS 1-4]` — the vendored ease instead of CustomEase, and the picture commits as well as the title |
| `toggleSwitch.js` | Osmo Toggle Switch | `[ATMOS 1-3]` — React owns the selection, the module owns the pill and the arrow keys |
| `heroExit.js` | this surface's own | the hero dissolves in place, and takes the field and the wordmark with it |

## The picker cycle

The close offers another palette. Choosing one re-tells all eight chapters about a different
photograph and lands the reader back at the top, and it plays the site's own curved wipe to say so —
`_wipeCover` in `methods/wipe.js`, extracted out of `navigateTo` so a route change is no longer the
only thing that can raise the cover. The hero names the chosen palette from that point on, because a
new document that opens with the same sentence gives the reader nothing to confirm their choice
landed.

## The four decisions worth arguing

### 1. The masks are computed, not shipped

The brief asks for "three to five precomputed mask textures, one for each main colour" per case — 40
new binaries and a build step. They are not needed. `kmeans` does not return its per-pixel `assign`
array, but nothing has to recover it: **re-classifying the image against the palette's stored OKLab
coordinates is a fresh computation that needs nothing stored.** `src/lib/masks.js` does it at 256px
in 15–34ms per case.

It is faithful, and that is measurable rather than asserted. Measured coverage against the palettes'
own stated weights, across all eight seeds:

| case | max drift | regions offered |
|---|---|---|
| Garnet | 0.3pp | 5 of 5 |
| Dry Season | 0.7pp | 4 of 5 |
| Forged Midfield | 2.4pp | 5 of 5 |
| Scorched Clear Morning | 0.5pp | 5 of 5 |
| High Key | 0.8pp | 5 of 5 |
| Ruled Open Country | 0.2pp | 5 of 5 |
| Midfield | 1.6pp | 5 of 5 |
| **Frozen Slate** | **14.6pp** | **3 of 5** |

Frozen Slate is the case that justifies the second gate. Its `#000000` is stated at 20.8% and
measures 6.5; its `#090606` is stated at 9.0 and measures 23.6. They swapped, because they are 0.127
apart in OKLab — the same black, twice — and between two centroids that close the boundary is
arbitrary. Neither mask is wrong about *where the dark is*; both are wrong about which swatch owns
it, and that is exactly the claim the chapter would be making.

So two refusals, both in `masks.js`, both leading to the same graceful state — the swatch is shown
but is not offered as a control:

- `MIN_COVERAGE = 0.012` — too little of the frame to be a region at all.
- `MAX_DRIFT = 0.05` — the classification contradicts the palette's own weight.

**Distance alone would not have caught it.** Frozen Slate's two *blues* are 0.121 apart — closer than
the blacks — and classify almost perfectly, because they occupy genuinely separate parts of the
frame. The test has to be the disagreement itself, not the geometry that might cause it.

The edge is feathered when the mask is generated (`blur(1.5px)` at 256). The first version relied on
the browser's scaling to soften it; it does not, and the boundary came back visibly stair-stepped.
It should be soft for a better reason than tidiness anyway: every pixel on that boundary is a
near-tie, and a hard line claims a precision the classification has not got.

### 2. The story scrolls the document; it is not a fixed scrollport

The other two phone surfaces are `position:fixed` boxes that scroll internally, because each is one
screen that has to cover the landing. A story is taller than the screen, so it is the document: the
browser collapses its own URL bar, the momentum is the platform's, and ScrollTrigger stays on its
default scroller — the configuration all fifteen `/about` modules are written against.

It follows that the surface carries no `data-lenis-prevent`. Only the gallery's horizontal card row
does, being the one genuine internal scrollport on the page.

### 3. `svh` and `lvh`, deliberately not `dvh`

Every other full-height box on this site is `100dvh`, and that is right for them — each is one fixed
screen. This surface is the first that is **taller than the screen**, and `dvh` is actively wrong for
it: it changes continuously as iOS collapses its URL bar (~100px on an iPhone 15), so eight chapters
sized that way would change the document's height by ~800px during a single flick, under a reader
whose scroll position is measured against it, while scrubbed triggers re-resolve.

Chapters are `100svh` (the smallest the viewport gets — the size at which a chapter is guaranteed to
fit whole). The scene is `100lvh` (the largest — so the picture still covers when the bar has gone).
Neither moves when the bar does.

### 4. The landing stays lit, but goes quiet

The story is the one phone branch that does **not** pass `covered`. `covered` means "an opaque
surface is over this" and its callers fall out of `_landingLit()`, which parks the orbit ticker. The
prologue is transparent *by design* — the orb formation showing through it is the chapter's visual —
so the field has to keep running.

What the story does need is for the gate's copy to stop existing: it is the same screen, so the old
heading and `Try an Example` would sit behind chapter 1's own words, and the button would still take
a Tab from behind an opaque chapter further down. Hence `quiet`: the block is hidden and the landing
is `inert` + `aria-hidden`, while `_landingLit()` — which does not know about the story — keeps the
formation turning.

**Hidden by opacity, never by display or a transform.** `reachWatch` is a ResizeObserver on the gate
marks and `_heroReach()` measures them to solve every ring radius; removing them, or changing any of
their boxes, re-solves the formation under a scrolling reader. Opacity changes no box.

## What was NOT built, and why

- **§12's analytics events.** Forbidden outright at `AppView.jsx:10-13`: "Do not add track() / custom
  events… the privacy statement currently promises the analytics 'doesn't see anything you do inside
  the tool', and a single custom event makes that false." This is a product decision with copy
  consequences, not an engineering task to schedule.
- **A Three.js texture plane (ch. 2) and a shader mask blend (ch. 4).** There is no texture pipeline
  in any WebGL path in this repo — no `THREE.Texture`, no atlas, no image upload. Both chapters are
  DOM and CSS, which the brief explicitly permits ("The canvas enhances the experience; it is not the
  content itself") and which is what makes them survive reduced motion and a lost context for free.
- **§9's adaptive "Reduced" quality tier.** Particle counts are fixed at build by contract
  (`orbField.js:498-503`) and there is no device-tier detection anywhere in the repo. Adding one is a
  subsystem, not a chapter.

## Verified

Dev server at 375x812, Chromium. Document 8179px: hero 1624 (sticky, two screens of travel),
1.1 246, 1.2 480, 1.3 873, 2.1 465, 2.2 246, 3.1 3027 (a 1991px pin inside it), 3.2 1624.
Nineteen ScrollTriggers, exactly one pin, `documentElement.scrollWidth` 375 — no sideways scroll.

- Every section reveals as it is reached; none stranded invisible after a wiped case change.
- The rail enters from outside the viewport (first panel at +525 on a 375 screen, zero panels on
  screen) and leaves completely (last panel at -153, zero on screen).
- Two palette cards to a screen, so the row is a comparison rather than a carousel.
- 1.2's key: all five readouts on one left edge, all five shares on one right edge, nothing clipped.
- The wordmark overlaps live content at **0 of 21** scroll positions, down from 5.
- The orb field ends the hero at opacity 0 AND `visibility:hidden`, so it neither leaks under pinch
  zoom nor composites for the rest of the page.
- `/about` unchanged by every shared-component edit: its weights key still `display:flex`, chip
  10x10, share 9px/400/start.
- Zero console errors across a full picker cycle, a `/about` round trip, and three repeat cycles
  (one pin and 19 triggers each time — no accumulation).

Defects found and fixed during the build, each recorded at its site:

- The takeover heading carried `data-sec-head` as well as `data-sticky-title`, so pageReveal split it
  into lines over a module that had split it into characters. One engine per element now.
- `_syncStory` re-entered and built a second set of modules over the same DOM.
- Arming the page reveal behind the cover broke arrival at `/`, because `navigateTo` released the
  desktop tool's reveals rather than the story's. Released from `_wipeCover` now, on every path.
- The rail measured its travel from `scrollWidth`, which is not constant while its own contents are
  being transformed — 1880 at rest, 1838 in flight, against a true 1841. A refresh mid-travel moved
  the row 223px.
- The 140vw lead in was on the wrap, which is `width:100%` under border-box, so it forced the used
  width to 1050 and overflowed the page. On the first and last panel now.
- `window.innerWidth` and the CSS viewport disagree under a scaled presentation; both axes read
  `documentElement`.

## Still open

- **The rail settles once by ~57px.** The first `ScrollTrigger.refresh()` that lands while the rail
  is pinned shifts `pin.start` by exactly -57 and moves the row with it; every refresh after it is 0,
  and a resize is 0. Down from 223px on *every* refresh, but not gone. Ruled out by measurement: the
  arrival tween (persists with it neutralised), post-build layout change (a deferred refresh after
  the full module build changes nothing), and margin collapsing between the grid above and the wrap's
  own negative block margin (removing both changes nothing). It is ScrollTrigger measuring a pinned
  trigger differently from an un-pinned one, with no DOM difference between the two states.
- **Not tested on a physical phone.** The `svh`/`lvh` choice exists for iOS URL-bar behaviour and a
  desktop Chromium cannot confirm it. Two device reports have already corrected this surface — the
  zoom leak and the wordmark overlap — which is the argument for getting it onto real hardware.
- **Hyphens in generated copy.** `even-tempered`, `matter-of-fact`, `mid-toned` live in
  `src/lib/reading.js`, the palette-reading vocabulary shared with the desktop tool. They are
  compound adjectives rather than dashes, so they were left alone; the standing "no hyphens" rule was
  given for this surface's own copy.
- **No automated coverage.** `scripts/smoke.mjs` drives a single 1440x900 viewport and is currently
  unrunnable as written (hardcoded Linux Chromium path).
- **`DECISIONS.md` has no phone entry.** The phone decision record lives in block comments, this plan
  and commit messages, which is the failure mode that file exists to prevent.
