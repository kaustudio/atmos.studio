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
leaves the browser. Any user-facing note about that is capability-conditional — it renders only
where the live call is actually available, so the claim is true wherever it appears.

## Privacy

Atmos Gallery runs in your browser.

**Your images never leave your device.** The palette is extracted on your own machine — the image is
read into a canvas, clustered in OKLCH, and discarded. It is never uploaded. In this public build,
the code that could send an image isn't merely switched off: it isn't part of the build at all.

**Your palettes are stored only in your browser.** The archive lives in this browser's local
storage. There is no server holding it, no account attached to it, and no way for us to see it.
Clearing your browser data deletes it — which is why you can save a project file and keep your own
copy, on your own disk.

**Share links carry the palette, not a lookup.** A shared link encodes the palette in the part of
the URL after the `#`. Browsers never send that part to a server, so opening a shared link doesn't
tell us — or anyone else — that you opened it, or what was in it.

**No accounts, no ads, no cross-site tracking.** There is nothing to sign up for, no cookies at all,
and nothing sold or shared with anyone. Two measurement tools run on the page — Vercel Web Analytics
for visit counts and Vercel Speed Insights for loading performance. Both are cookieless and
aggregated, neither identifies you, neither follows you to other sites, and neither sees anything you
do inside the tool.

**What we can see.** The site is hosted on Vercel, which keeps standard access logs for the files it
serves — including IP address and user-agent, as any web server must. On top of that, Web Analytics
gives us aggregate counts (visits, page and route, referrer, filtered query params, device type,
browser and OS, and a location Vercel resolves to **city** level) and Speed Insights gives us Core
Web Vitals with their attribution, a rough connection speed, device, browser, OS and **country only**.
Web Analytics tells visits apart with a hash derived from the incoming request that Vercel discards
after **24 hours**; Speed Insights is documented as carrying no visitor identifier. Neither is a
cookie and neither writes anything to your device. Nothing about your images, your palettes, or your
archive: those never leave your browser in the first place.

The full statement — controller, legal basis, processors and transfers, retention, and your rights —
is `public/privacy.html`. Terms are `public/terms.html`. The two are cross-linked and share
`public/legal.css`, `public/legal-toc.js` (the Osmo table-of-contents resource, kept as delivered)
and `public/legal-reveal.js` (masked heading reveals + rule draws). Both pages load the vendored
`gsap` + `ScrollTrigger` rather than a CDN, and both degrade to plain, fully readable type with no
JS, no GSAP, or `prefers-reduced-motion` — see the header comment in `legal-reveal.js` for why that
floor is enforced in three separate places.

**About interpretation.** Some environments provide a model that can read an image's mood directly.
Where that's available, a small downscaled thumbnail — roughly 320 px on its longest edge, scaled up
for high-density displays — is sent for that reading and is not stored. This public build doesn't
include that path — palettes are named by a reading that runs locally, on your device.

Last updated: 25 July 2026 · Questions: hello@kau.studio

### Accuracy notes (for whoever edits this later)

These sentences are true because of specific properties of the build. If any of them change, **the
copy must change in the same commit**:

1. **"never leave your device" / "isn't part of the build"** — true because the endpoint branch is
   tree-shaken out when `VITE_INTERPRET_ENDPOINT` is unset. Verified against the shipped bundle: it
   contains no `VITE_INTERPRET_ENDPOINT` reference, no `api.anthropic.com` URL, and not even the
   endpoint path's error string. Setting that variable, or shipping `api/interpret.ts` with a key
   configured, makes this false.
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
5. **"a small downscaled thumbnail"** — describes the in-environment path only, and the size comes
   from `makeThumb` (`320 × devicePixelRatio`, DPR clamped to 3). If hosted interpretation ships,
   this sentence moves from conditional to permanent, and needs to name where it is sent and what is
   retained.
6. **"no cookies at all"** — verified by measurement, not assumption: `document.cookie` is empty on
   every page. Client storage is `palette-generator/feed` (the user's own archive) and
   `palette-generator/loader-session`. This is also why there is no consent banner. Any
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
