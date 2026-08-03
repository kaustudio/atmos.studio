# 001 — Mint the duration token scale

**Commit:** `76b510f`
**Severity:** HIGH · **Category:** Cohesion & tokens
**Risk:** none — purely additive. No existing value changes. Nothing migrates in this plan.

## Problem

Easing is tokenised in both languages and the two agree exactly: `--ease-standard` in
`src/styles/global.css:91` is byte-identical to `EASE.standard` in
`src/app/methods/motion.js:24`.

Duration was never given the same treatment. There are **no `--dur-*` custom properties anywhere
in the repo**. JS carries a documented seven-value scale; CSS carries fifteen hardcoded literals
that answer to nothing; and `src/app/methods/motion.js` writes `.15s` as a string literal twenty
times inside its own style builders.

This plan mints one scale that both languages hold. Migration onto it is plan 004.

## Why the scale gains two steps

The existing JS scale was designed for GSAP reveals and overlays. The CSS literals were designed
for hover and press chrome. They are different domains, and the JS scale has a gap exactly where
the chrome lives — nothing between `.24` and `.62`.

The two most common durations in the app fall in that gap or beside it:

- `.28s` — 12 occurrences, the single most-used duration in the codebase
- `.18s` / `.16s` — 11 occurrences between them

Crushing those onto `.24` would retime most of the interaction contract for no reason. So the
scale is extended to include the steps the app has already demonstrated it needs, rather than
forcing CSS onto a scale that lacks them.

## Step 1 — add the CSS scale

In `src/styles/global.css`, the existing ease block ends at line 100:

```css
  --ease-pill:cubic-bezier(0.625,0.05,0,1);
}
```

Directly after that closing brace, add a new block. Keep it adjacent to the ease tokens — one
motion-token region, not two:

```css
/* ===== shared duration tokens (named; mirrored by the JS DUR map in methods/motion.js) =====
   One scale, both languages. `micro`/`state`/`reveal`/`overlay`/`overlayOut`/`stagger` mirror the
   GSAP tokens exactly. `fast` and `chrome` are the two steps the interaction contract had been
   expressing as literals — .16/.18 and .28 — and they are on the scale now rather than beside it. */
:root{
  --dur-micro:.12s;         /* press, thumb nudge, the smallest state change */
  --dur-fast:.18s;          /* chevrons, row affordances, slider thumb, focus ring */
  --dur-state:.24s;         /* a control changing what it says it is */
  --dur-chrome:.28s;        /* hover tints across the interaction contract */
  --dur-reveal:.62s;        /* the app's arrival — bands, masked lines, list cascade */
  --dur-overlay:.8s;        /* utility overlays in */
  --dur-overlay-out:1s;     /* utility overlays out — longer, per the house rule */
  --dur-stagger:.05s;       /* beat between siblings in a reveal */
  --dur-overlay-step:.04s;  /* beat between sections inside an overlay */
}
```

## Step 2 — extend the JS scale to match

In `src/app/methods/motion.js:55` the current line reads:

```js
    this.DUR = { micro: 0.12, state: 0.24, overlay: 0.8, overlayOut: 1, overlayStep: 0.04, reveal: 0.62, stagger: 0.05 };
```

Replace with — note every existing key keeps its exact value, two are added:

```js
    // `fast` and `chrome` mirror --dur-fast / --dur-chrome. They exist so the CSS interaction
    // contract and the GSAP tweens quote one scale; no GSAP tween used them before this line was
    // written, so adding them cannot retime anything that already runs.
    this.DUR = { micro: 0.12, fast: 0.18, state: 0.24, chrome: 0.28, overlay: 0.8, overlayOut: 1, overlayStep: 0.04, reveal: 0.62, stagger: 0.05 };
```

## Scope boundary

**Do not** change any other line. Do not replace a single duration literal anywhere — not in
`global.css`, not in `legal.css`, not in the `monoLabel` style builders. That is plan 004, and
keeping it separate is what makes this plan risk-free and independently revertible.

Do not touch `--button-006-dur: 0.42s` (`src/styles/global.css:396`). It is a documented
specialization with its own token already.

## Verification

1. `npm run build` completes.
2. `git diff --stat` shows exactly two files touched and no line removed other than the `this.DUR`
   line being replaced.
3. In the browser devtools console:
   `getComputedStyle(document.documentElement).getPropertyValue('--dur-chrome')` returns `.28s`.
4. **Feel-check:** there should be nothing to feel. Click through the app — press a CTA, hover a
   feed row, open the export dialog. If any timing changed, something outside the scope boundary
   was edited.
