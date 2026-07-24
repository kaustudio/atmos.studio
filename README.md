# Atmos Studio — Palette

Production implementation of the **Palette Generator** designed in Claude Design (see the handoff
bundle in `../project` and the transcripts in `../chats`). Drop in an image and it becomes a
palette drawn from its **mood** — the light and atmosphere it carries, not just its dominant
colours.

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
- **Archive** — list view (expanding rows with OKLCH metrics readout, pagination), the infinite
  draggable "universe" grid, and a 3D reel; fullscreen palette detail; delete with undo.
- **Tools** — WCAG contrast checker (AA/AAA × normal/large, pairwise matrix), OKLCH colour
  harmonies (gamut-mapped to sRGB), token export (Tailwind v4 `@theme`, W3C design tokens, Figma
  variables, CSS custom properties, binary `.ase`), projects with portable JSON project files.
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
   `VITE_INTERPRET_ENDPOINT=/api/interpret`.
2. **`window.claude.complete`** — when running inside the Claude artifact runtime.
3. **Neither** — the local archetype reading is used silently; a notice appears only on a genuine
   live-call failure.

The privacy line in the first-run panel renders only when a live path is actually available.

## Layout

```
index.html              vendor script tags (gsap + plugins, lenis, orb shader, demo image)
public/vendor           vendored runtimes (exact builds the design was authored against)
public/fonts            Neue Montreal (Regular/Medium)
public/assets           Atmos logo/wordmark SVGs
src/lib                 colour science, exporters, interpretation seam, sx() style parser
src/app/PaletteApp.jsx  class core (state, lifecycle)
src/app/methods/*       prototype method groups (pipeline, persistence, motion, overlays,
                        universe, reel, orbit, wipe, loader, misc)
src/app/renderVals.js   the view-model
src/app/AppView.jsx     the JSX template
api/interpret.ts        serverless proxy for live interpretation
scripts/smoke.mjs       Playwright smoke-drive of the full journey
```

localStorage keys are namespaced `palette-generator/*` (feed schema `version: 1`).
