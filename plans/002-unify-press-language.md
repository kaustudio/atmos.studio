# 002 — One press language: scale on the click curve

**Commit:** `76b510f`
**Severity:** HIGH · **Category:** Physicality & origin, Cohesion
**Depends on:** plan 001 (needs `--dur-micro` / `--dur-state`)
**Risk:** medium — this is a deliberate, visible change to how every control answers a press.

## Problem

Every press in the app is `transform: translateY(1px)` transitioned on `--ease-standard`
(`cubic-bezier(0.22,1,0.36,1)`) over `.12s`.

`--ease-standard` is an expo-out. The codebase already documents why that is wrong here —
`src/app/methods/motion.js:9-11`:

> *"entrance/standard are expo-out curves: almost all the travel happens in the first fifth, which
> is right for something arriving into place and wrong for something CHANGING SIZE — a height on
> that curve snaps open and then creeps, which **reads as a jump** however long the tween is."*

That diagnosis was applied to height and never to press. On an expo-out roughly half the travel
lands in the first ~12ms; over a **1px** distance the result is a sub-pixel step, so the compositor
renders a discrete jump rather than a motion. `:active` is binary and the release runs the same
curve, so the user sees step-down then step-up — the reported "jumping/moving down and up".

The correct curve already exists and is unused by every press state: `--ease-button-click:
cubic-bezier(0.4,0,0.2,1)` (`src/styles/global.css:95`), whose only consumer is `.button-006`.

## Target

- Press is **scale**, not translate. Scale reads as depression at any control width and has no
  sub-pixel floor. Both `.button-006` and the (dead) `mDown` handler reached for scale
  independently — the codebase has already voted for it twice.
- One curve for press and release: `--ease-button-click`. A press must **land** in both directions,
  so it takes the same treatment overlays get (`motion.js:18-23`) — same curve both ways, the exit
  distinguished by length rather than by a mirrored curve.
- Release is **longer** than press (`--dur-state` vs `--dur-micro`), per the house rule that a
  dismissal has already been decided and nothing is waiting on it.

## Step 1 — press token

In `src/styles/global.css`, inside the `:root` duration block added by plan 001, add one line:

```css
  --press-scale:.98;        /* the depression every control shares; see plans/002 */
```

## Step 2 — rewrite the interaction-contract transition

`src/styles/global.css:30` currently reads:

```css
[data-ix]{transition:background-color .28s var(--ease-button-hover),color .28s var(--ease-button-hover),border-color .28s var(--ease-button-hover),box-shadow .28s var(--ease-button-hover),filter .16s var(--ease-standard),transform .12s var(--ease-standard)}
```

Replace with:

```css
/* --press-dur carries the asymmetry. The base value is the RELEASE (longer, unhurried); :active
   below flips it to the press value. A transition reads its duration from the after-change style,
   so one declaration gives both directions their own length without restating the whole list in
   four :active rules. */
[data-ix]{--press-dur:var(--dur-state);transition:background-color var(--dur-chrome) var(--ease-button-hover),color var(--dur-chrome) var(--ease-button-hover),border-color var(--dur-chrome) var(--ease-button-hover),box-shadow var(--dur-chrome) var(--ease-button-hover),filter var(--dur-fast) var(--ease-standard),scale var(--press-dur) var(--ease-button-click)}
[data-ix]:active:not(:disabled){--press-dur:var(--dur-micro)}
```

Note `transform` leaves the transition list entirely and `scale` (the standalone property, as
`.button-006` already uses at `global.css:405-407`) takes its place. Nothing on `[data-ix]`
transitions `transform` any more.

## Step 3 — swap the four press tiers

Four lines change, each replacing `transform:translateY(1px)` with `scale:var(--press-scale)`.
Leave every other declaration on these lines exactly as it is.

| Line | Selector | Change |
| --- | --- | --- |
| `global.css:54` | `[data-ix="cta"]:active:not(:disabled)` | `transform:translateY(1px)` → `scale:var(--press-scale)` |
| `global.css:56` | `[data-ix="seg"]:active:not(:disabled)` | `{transform:translateY(1px)}` → `{scale:var(--press-scale)}` |
| `global.css:57` | `[data-ix="icon"]:active:not(:disabled)` | `transform:translateY(1px)` → `scale:var(--press-scale)` |
| `global.css:72` | `[data-ix="press"]:active:not(:disabled)` | `transform:translateY(1px)` → `scale:var(--press-scale)` |

## Step 4 — reduced motion

`src/styles/global.css:84` currently reads:

```css
  [data-ix="cta"]:active:not(:disabled),[data-ix="seg"]:active:not(:disabled),[data-ix="icon"]:active:not(:disabled),[data-ix="press"]:active:not(:disabled){transform:none}
```

Replace `{transform:none}` with `{scale:none}`. Keep the selector list identical.

## Step 5 — the glass CTA

`src/app/renderVals.js:1673`, the last property of the `glassCta` object, currently:

```js
        transition: 'background-color .28s var(--ease-button-hover), border-color .28s var(--ease-button-hover), transform .12s var(--ease-standard)',
```

Replace with — note the custom property is a separate key, and both are strings:

```js
        '--press-dur': 'var(--dur-state)',
        transition: 'background-color var(--dur-chrome) var(--ease-button-hover), border-color var(--dur-chrome) var(--ease-button-hover), scale var(--press-dur) var(--ease-button-click)',
```

`src/app/renderVals.js:1678` currently:

```js
      glassCtaActive: { background: 'color-mix(in srgb, var(--on-surface) 24%, transparent)', border: '1px solid var(--action-line-press)', transform: this._reduce ? 'none' : 'translateY(1px)' },
```

Replace with:

```js
      glassCtaActive: { background: 'color-mix(in srgb, var(--on-surface) 24%, transparent)', border: '1px solid var(--action-line-press)', '--press-dur': 'var(--dur-micro)', scale: this._reduce ? 'none' : 'var(--press-scale)' },
```

Pass `scale` as a **string**, never a number — React appends `px` to numeric style values for any
property not on its unitless list.

## Scope boundary

- **Do not touch `.button-006`** (`global.css:391-424`). It is one of the three sanctioned
  specializations documented at `global.css:75-78`, it already runs on `--ease-button-click`, and
  its non-uniform `scale:0.955 0.925` is a deliberate squash. After this plan it shares the app's
  press *curve* while keeping its own richer magnitude — which is the intended outcome, not an
  inconsistency to flatten.
- **Do not touch the rich-tint family** (`global.css:80-81`) — `[data-row]`, `[data-feed]`,
  `[data-ex-item]` keep `filter:brightness(.97)`. A full-bleed row is a surface, not a control:
  `scale(.98)` on a ~900px row would pull its edges in ~9px, which is not a press, it is a
  collapse. The press scale is calibrated for chrome-sized controls.
- **Do not touch `[data-ix="lift"]`** (`global.css:74`). Its transform is GSAP-driven and its
  transition already excludes transform by design.
- Do not migrate any other duration literal — that is plan 004.

## Verification

1. `npm run build` completes.
2. Grep must return **zero** results: `grep -rn "translateY(1px)" src/`
3. Devtools → select a `[data-ix="cta"]` button → force `:active` → computed `scale` is `0.98`,
   and computed `transition` names `scale`, not `transform`.
4. Keyboard: Tab to a CTA, hold Space. The press state should engage and hold.
5. **Feel-check — the point of the whole plan.** Press a CTA repeatedly at normal speed. It should
   read as the control giving under the finger and settling back, with no perceptible step in
   either direction. Then re-test in devtools with CPU throttled 4× and animation speed at 25%:
   the press should show visible travel through its curve, not a cut. Compare against a feed row
   press (brightness) and the hero `.button-006` — all three should now feel like the same hand,
   at three magnitudes.
6. Toggle OS reduced motion on: press produces no scale at all, background tint still changes.

## Observation, out of scope

`HBtn` (`src/app/AppView.jsx:18-32`) drives its active state from `onMouseDown`/`onMouseUp` only,
so the glass CTA shows **no press feedback for keyboard activation** — unlike every `:active`-driven
control. Worth a separate ticket; do not fix it here.
