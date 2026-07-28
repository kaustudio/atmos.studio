# Atmos Gallery

**Colour read from light and atmosphere.** Drop in an image and Atmos Gallery reads a palette from
its **mood** — the light and atmosphere it carries, not just its dominant colours.

Production implementation of the design comp authored in Claude Design (see the handoff bundle in
`../project` and the transcripts in `../chats`).

Built with **Vite + React**; the design comp's logic (authored against a React-compatible
component API) is ported near-verbatim so behaviour and motion stay faithful.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build → dist/
npm run preview
```

Desktop-only by design (≤720px shows a calm desktop-gate).

## What's inside

- **First-visit journey** — phase-machine page loader → ring landing (two concentric rings of colour
  orbs, the back one half a step round so it sits in the front one's gaps, turning at one locked
  shared speed around the centred hero; raw-WebGL shader on the front ring with a painted DOM floor
  for no-WebGL / reduced-motion / context-loss) → curved-wipe handoff into the tool. The Atmos logo
  returns you to the landing at any time.
- **Core loop** — upload/drop → local OKLab k-means extraction (all colour work stays in the
  browser) → branded processing beat → result with weight-proportional bands and four copyable
  formats per swatch (HEX/RGB/HSL authoritative; CMYK labelled *approx*).
- **Interpretation** — the palette's name/descriptors/rationale. Local archetype reading is the
  guaranteed baseline; a live Claude reading (`claude-sonnet-4-6`) layers on when available (see
  below).
- **Archive** — master–detail list (uniform rows led by a proportional swatch strip; sortable AA
  pairs / max contrast / date columns; tag filtering via a searchable drawer and clickable row
  tags; pagination), the infinite draggable "universe" grid, and a 3D reel; fullscreen palette
  detail; delete with undo. Selecting a row drives the overview panel above it — that panel is the
  single detail surface, and the rows no longer expand.
- **Tools** — WCAG contrast checker (AA/AAA × normal/large, pairwise matrix), OKLCH colour
  harmonies (gamut-mapped to sRGB), token export (Tailwind v4 `@theme`, W3C design tokens, Figma
  variables, CSS custom properties, binary `.ase`), projects with portable JSON project files.
- **Standalone pages** — privacy and terms, served straight out of `/public`, and a not-found page
  that is one thing only: the real Neue Montreal glyphs of *404*, fitted edge to edge across the
  viewport and rebuilt as a particle cloud the cursor pushes through, over a fixed full-viewport
  canvas so nothing it throws is ever clipped. Exactly 100vh, nothing scrolls, everything centred
  under the centred mark; no explanatory copy, and one button — the landing's own glass *Get Started*,
  relabelled.
  Without JS, WebGL, the webfont, or with reduced motion asked for, the same 404 is simply set as
  type — the heading in the markup is the fallback either way.
- **System** — light/dark themes (chrome only, never swatches), Neue Montreal, zero border-radius
  (orb bodies and the wipe caps are the only sanctioned curves), token-driven GSAP motion with
  full `prefers-reduced-motion` floors, versioned localStorage persistence with cross-tab sync
  and quota-pressure handling.

## Live interpretation (the deployment decision)

The chats left "where live interpretation runs" open. The client is wired with a pluggable seam
(`src/lib/interpret.js`), resolved in order:

1. **`VITE_INTERPRET_ENDPOINT`** — a proxy URL that holds the Anthropic API key.
   `api/interpret.ts` is a ready-to-deploy Vercel/Netlify-style function: set `ANTHROPIC_API_KEY`
   on the host, then build the client with
   `VITE_INTERPRET_ENDPOINT=/api/interpret`. The endpoint owns the model, the token cap and the
   system prompt, and accepts only `{ image: { media_type, data }, swatches: [{ hex, weight }] }`
   — the client sends no prompt text, so none of it is in the bundle.
2. **Neither** — the local archetype reading is used silently; a notice appears only on a genuine
   live-call failure.

Where a live path exists, a downscaled thumbnail is sent to read the mood; where none does, nothing
leaves the browser. **The production deployment sets `VITE_INTERPRET_ENDPOINT`, so on atmos.gallery
the live path is the one that runs** — the privacy copy is written against that, not against a build
with the seam unset. The tool itself no longer carries a note about it: the disclosure was removed
from the dropzone screen by request, and it is `/privacy` — linked from the footer of that same
screen — that has to stay true.

## Privacy

The statement itself is `src/legal/privacy.html` — controller, what is collected, legal basis,
processors and transfers, retention, rights. It is deliberately short, and it is the single source:
**do not restate it here**, or the two drift apart. What matters for whoever is editing the code:

- Extraction is local. The full-size image is never uploaded.
- **Naming a palette sends a ~320 px thumbnail plus the hex values to Anthropic** (`api/interpret.ts`),
  falling back to the local reading in `src/lib/reading.js` if that is unavailable.
- Palettes live in localStorage only, under `palette-generator/*`. No cookies at all, which is why
  there is no consent banner.
- Analytics is Vercel Web Analytics + Speed Insights, both cookieless.

Terms are `src/legal/terms.html`. Both are hand-authored HTML fragments rather than JSX — a clause
should be reviewable as prose — injected by `src/app/LegalPage.jsx` and shared with
`src/styles/legal.css`, `src/app/methods/legalToc.js` (the Osmo table-of-contents resource, kept as
delivered bar four marked accommodations) and `src/app/methods/legalReveal.js` (masked heading
reveals + rule draws). They are **routes of the app document**, served at `/privacy` and `/terms`;
`scripts/prerender.mjs` writes each one out as a complete static document after the build, so a
reader with no JavaScript and any crawler that does not run it still get the whole text. Both use the
vendored `gsap` + `ScrollTrigger` rather than a CDN, and both degrade to plain, fully readable type
with no JS, no GSAP, or `prefers-reduced-motion` — see the header comment in `legalReveal.js` for why that floor
is enforced in three separate places.

Last updated: 27 July 2026 · Questions: hello@kau.studio

### Accuracy notes (for whoever edits this later)

These sentences are true because of specific properties of the build. If any of them change, **the
copy must change in the same commit**:

1. **"the full-size image is never uploaded"** — true because the only thing the client ever posts is
   `makeThumb`'s output plus the hex values (`buildInterpRequest`, `src/lib/interpret.js`); there is
   no code path that sends the original file. The *earlier* claim — that nothing left the device at
   all, because the endpoint branch tree-shakes out when `VITE_INTERPRET_ENDPOINT` is unset — stopped
   being true when production set that variable. Unsetting it would make the local reading the only
   path again, and then the privacy copy would need to say less, not more.
2. **"stored only in your browser"** — true while persistence is localStorage-only. Any sync,
   backup, or account feature invalidates it.
3. **"the part after `#` is never sent to a server"** — true of URL fragments by specification.
   Moving share data into a query string (`?p=`) would make it false immediately.
4. **Analytics** — two Vercel products, both cookieless and aggregated: Web Analytics (page views
   only) as of `f82dfaa`, and Speed Insights (Core Web Vitals only) as of 2026-07-26. If custom
   events are ever added, or any other provider, this paragraph must name what is collected **in the
   same commit** — Speed Insights shipped a day ahead of its disclosure, which is why
   `DECISIONS.md` now carries an entry about the sequencing rather than just the decision. The one
   other third-party request the app can make is unchanged: if the vendored GSAP fails to load it
   falls back to `cdn.jsdelivr.net` (`PaletteApp.jsx`).
5. **"a thumbnail of roughly 320 px"** — the size comes from `makeThumb` (`320 × devicePixelRatio`,
   DPR clamped to 3). This is now permanent rather than conditional, so the copy names both the
   recipient (Anthropic, via `api/interpret.ts`) and the retention position. It is also the only
   place the claim is made now that the dropzone note is gone. Changing the thumbnail
   size, adding anything to the payload beyond `{ image, swatches }`, or changing recipient means
   `src/legal/privacy.html` changes in the same commit.
6. **"no cookies at all"** — verified by measurement, not assumption: `document.cookie` is empty on
   every page. Client storage is five keys — `palette-generator/feed` (the user's own archive),
   `/derived`, `/landing`, `/pagesize` and `/loader-session`. The privacy page names the prefix
   rather than enumerating them; add a key outside that prefix and it needs saying. This is also
   why there is no consent banner. Any
   non-essential third party — ads, a pixel, a hosted font, an embedded video — makes the claim false
   and makes consent legally required.

## Layout

```
index.html              vendor script tags (gsap + plugins, lenis, orb shader, demo image)
404.html                the not-found page — the second Vite entry, built to dist/404.html
public/vendor           vendored runtimes (exact builds the design was authored against)
public/fonts            Neue Montreal (Regular/Medium)
public/assets           Atmos logo/wordmark SVGs
public/legal.css        shared chrome for the standalone pages (privacy, terms, 404)
public/notfound.css     the 404's own layer: display type + the particle canvas
public/fit-width.js     Osmo Supply "Fit Text to Width", as delivered — sizes the 404 to the page
src/notfound/*          the particle field, the type rasteriser, and the page's wiring
src/lib                 colour science, exporters, interpretation seam, sx() style parser
src/app/PaletteApp.jsx  class core (state, lifecycle)
src/app/methods/*       prototype method groups (pipeline, persistence, motion, overlays,
                        universe, reel, orbit, wipe, loader, misc)
src/app/renderVals.js   the view-model
src/app/AppView.jsx     the JSX template
api/interpret.ts        serverless proxy for live interpretation
scripts/smoke.mjs       Playwright smoke-drive of the full journey
```

localStorage keys are namespaced `palette-generator/*` (feed schema `version: 1`), and the portable
project file carries `schema: 'palette-generator/project-file'`. Those strings are **deliberately
frozen legacy internals** — see the note in `src/app/methods/persistence.js`. They predate the
settling of the product name (they predate both *Atmos Studio* and *Atmos Gallery*), and every
existing archive is keyed to them, so
renaming without a migration would orphan real people's palettes. They are never shown to a user.
