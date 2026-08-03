# 004 — Migrate every duration literal onto the scale

**Commit:** `76b510f`
**Severity:** HIGH · **Category:** Cohesion & tokens
**Depends on:** plan 001 (the tokens must exist), plan 002 (owns `global.css:30` and `renderVals.js:1673`)
**Risk:** medium — several sites shift by up to 40ms. Every such site is listed below.

## Problem

With plan 001 landed, the scale exists but almost nothing quotes it. This plan is the migration:
every hardcoded duration in CSS and in JS inline-style strings becomes a token reference.

## The mapping

Ties resolve **downward** — for chrome, faster is the safer default.

| Literal | → Token | Δ | Notes |
| --- | --- | --- | --- |
| `.12s` | `var(--dur-micro)` | 0 | exact |
| `.14s` | `var(--dur-micro)` | −20ms | |
| `.15s` | `var(--dur-micro)` | −30ms | 20 occurrences — the largest single change |
| `.16s` | `var(--dur-fast)` | +20ms | |
| `.18s` | `var(--dur-fast)` | 0 | exact |
| `.2s` | `var(--dur-fast)` | −20ms | |
| `.25s` | `var(--dur-state)` | −10ms | `legal.css` only — see plan 005, which owns that line |
| `.28s` | `var(--dur-chrome)` | 0 | exact |
| `.3s` | `var(--dur-chrome)` | −20ms | |
| `.32s` | `var(--dur-chrome)` | −40ms | largest Δ; `[data-refine-note]` keyframe |

## Step 1 — CSS sites

`src/styles/global.css`, in this order (line numbers are pre-edit; work bottom-up to keep them valid):

| Line | Literal(s) | → |
| --- | --- | --- |
| 767 | `.28s` | `var(--dur-chrome)` |
| 746 | `.18s` | `var(--dur-fast)` |
| 715 | `.32s` | `var(--dur-chrome)` |
| 703 | `.14s` | `var(--dur-micro)` |
| 636 | `.18s` | `var(--dur-fast)` |
| 631 | `.18s` | `var(--dur-fast)` |
| 552 | `.16s` | `var(--dur-fast)` |
| 549 | `.18s` | `var(--dur-fast)` |
| 500 | `.18s` ×2 | `var(--dur-fast)` |
| 482 | `.28s`, `.18s` | `var(--dur-chrome)`, `var(--dur-fast)` |
| 421 | `.2s` | `var(--dur-fast)` |
| 405 | `.12s` | `var(--dur-micro)` |
| 371 | `.3s` | `var(--dur-chrome)` |
| 80 | `.14s` | `var(--dur-micro)` |
| 74 | `.16s` ×2 | `var(--dur-fast)` |

**Skip line 30** — plan 002 rewrites it in full.
**Skip line 396** (`--button-006-dur:0.42s`) — already a token, documented specialization.
**Skip line 11** (`.001ms`) — the reduced-motion nuke, deliberately sub-perceptual.

## Step 2 — JS inline-style sites

Each of these writes a duration inside a `transition:` string. Replace the literal with the token
reference — `var()` works inside an inline style string exactly as it does in a stylesheet.

`.15s` → `var(--dur-micro)`:

| File | Lines |
| --- | --- |
| `src/app/AppView.jsx` | 1572, 1600, 1622, 1712, 1714, 1875, 2078, 2161 |
| `src/app/methods/motion.js` | 101 (`toggleStyle`), 102 (`pageNavStyle`) |
| `src/app/renderVals.js` | 316, 2212 |

`.28s` → `var(--dur-chrome)`:

| File | Lines |
| --- | --- |
| `src/app/AppView.jsx` | 2185, 2186, 2192, 2193 |
| `src/app/chrome.jsx` | 24, 25 |

**Skip `renderVals.js:1673`** — plan 002 rewrites it.

`src/app/methods/motion.js:95` (`viewToggleOptStyle`) carries `.2s` → `var(--dur-fast)`.

## Step 3 — the JS tokens are already there

`motion.js` GSAP tweens already quote `this.DUR.*` everywhere and need no change. Do **not** convert
the hand-choreographed timelines to tokens — `loader.js` (0.6 / 0.8 / 0.95), `orbit.js` ambient
drift, `reel.js` (1.2), and `misc.js`'s lightbox FLIP are deliberate bespoke compositions, not
drift. Leave them.

## Scope boundary

Durations only. Do not change a single easing function in this plan — that is plan 005. Do not
change any value that is not in the tables above.

## Verification

1. `npm run build` completes.
2. `grep -rnE "[0-9]*\.[0-9]+s +var\(--ease" src/styles/global.css` returns **zero** rows.
3. `grep -rn "\.15s\|\.28s" src/app/` returns **zero** rows.
4. **Feel-check the three sites that moved most**, side by side against `git stash`:
   - the 20 `.15s` sites (−30ms): sort toggles, pager buttons, view toggle. Should read slightly
     crisper, never abrupt.
   - `[data-refine-note]` (`global.css:715`, −40ms): open Refine and change a value so the note
     appears. It must still read as arriving, not as appearing.
   - `[data-sort-chevron]` (`global.css:482`): rotate direction on a sort column; unchanged at
     `.28s` → `--dur-chrome`, so use it as your control — if this one feels different, something
     was mis-mapped.
