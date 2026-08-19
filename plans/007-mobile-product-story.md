# 007 — The phone gets a product, not a refusal

**Commit:** against `58b67bb`
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

| # | Chapter | What it shows | Where the data comes from |
|---|---|---|---|
| 1 | `prologue` | The orb formation, the brand statement | the existing landing stage, showing through |
| 2 | `image` | The case photograph, settling | `dispUrl(p)` → bundled `EXAMPLE_SRC` |
| 3 | `structure` | Five fields at their real shares | `swatch.weight`, `swatchGrow`'s 6% visual floor |
| 4 | `where` | Where each colour lives in the frame | `src/lib/masks.js`, computed at runtime |
| 5 | `relationships` | Weight / Role / Contrast | `analysePalette`, `semanticRoles`, `paletteMetrics` |
| 6 | `interpretation` | The reading, and what it is for | `p.rationale`, `composeUse()` |
| 7 | `gallery` | The other seven cases | `_examples()` |
| 8 | `handoff` | The desktop invitation | `shareUrl(p)` + `navigator.share` |

Chapters 1–6 are `min-height:100svh`, one message each. 7 and 8 are content-driven, per the brief.

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

Dev server, 375×812 and 1280×800, Chromium.

- All eight chapters mount; document 5748px; six at 812, gallery 477, handoff 400.
- `[data-story-live]` and `[data-story-at]` set; masked reveals run; scene scrubs in and out.
- Chapter 3 states 49 / 36 / 10 / 4 / 1% — the palette's own weights.
- Chapter 4: 4 of 5 swatches offered on Dry Season, the 0.8% one correctly refused; selecting
  `#D5CDBF` lights the tulip's lit petals and mutes the rest.
- Chapter 5 reads Dominant / Mid / Warm / Saturated from the live composers.
- The allow-list survives minification — all six `:not()`s present in `dist/assets/global-*.css`.
- **Desktop at 1280×800 is unchanged**: no story surface, landing not inert, `Get Started` present,
  orb field running, headline still "Colour read from light and atmosphere. In seconds."

Two robustness defects were found and fixed during verification, both real rather than environmental:

- `buildStoryMasks` latched `_maskBuilding` forever if `decode()` never settled (it does not settle
  while the document is hidden), so chapter 4 would silently offer no regions for the rest of the
  visit. Now has a 4s backstop, and compares the case **by id** rather than by object identity across
  the async boundary.
- The story armed only from `requestAnimationFrame`, which a document that mounts hidden is never
  handed. Now paired with a timer, and `_syncStory` asks "is the module running on *this* element"
  (via `[data-story-live]`) rather than trusting a stored handle — the previous version latched on
  its own first bail, because `initStory` returns the same inert `noop` for every transient failure.

## Still open

- **Not tested on a physical phone.** iOS Safari's URL-bar behaviour is the reason for the `svh`/`lvh`
  choice and is the one thing a desktop Chromium cannot confirm.
- **No automated coverage.** `scripts/smoke.mjs` drives a single 1440×900 viewport and is currently
  unrunnable as written (hardcoded Linux Chromium path).
- **`DECISIONS.md` has no phone entry at all** — verified by grep. The entire phone decision record
  lives in block comments and commit messages, which is the failure mode that file exists to prevent.
  This plan is the first written record; a dated entry should follow.
