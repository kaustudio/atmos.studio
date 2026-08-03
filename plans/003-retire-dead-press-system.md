# 003 — Retire the dead GSAP press system

**Commit:** `76b510f`
**Severity:** MEDIUM · **Category:** Dead code
**Depends on:** none (do this **before** or alongside 002, so the press language is unified once, not twice)
**Risk:** low — removing code that nothing calls.

## Problem

`src/app/methods/motion.js:57-73` defines a complete GSAP hover-and-press system — `mEnter`,
`mLeave`, `mDown`, `mUp` — driven by a `data-m-y` / `data-m-scale` attribute protocol. All four are
plumbed through to the view model at `src/app/renderVals.js:1680`:

```js
      mEnter: (e) => this.mEnter(e), mLeave: (e) => this.mLeave(e), mDown: (e) => this.mDown(e), mUp: (e) => this.mUp(e),
```

**Nothing consumes any of them.** `grep -rn "vals\.mDown\|vals\.mEnter\|vals\.mUp\|vals\.mLeave" src/`
returns zero results, and no element anywhere in the repo sets `data-m-y` or `data-m-scale`.

It matters beyond tidiness: `mDown` tweens `scale: 0.98` on `DUR.micro` — the exact press plan 002
is introducing. Leaving it in place means the next person to touch press finds two implementations
and no way to tell which is live.

## Step 1 — delete the four handlers

In `src/app/methods/motion.js`, delete lines 57-73 in full — the comment line
`// generic, interruptible micro-interaction handlers (transform + overlay-opacity only)` and the
`mEnter`, `mLeave`, `mDown`, `mUp` methods that follow it.

**Keep everything else in that region.** Specifically:

- `commitSelected` (line 75-78) — live, called from `src/app/PaletteApp.jsx:436`.
- `dimEnter` / `dimLeave` (lines 80-89) — live, bound at `src/app/AppView.jsx:846`.

Both read `[data-ring]`, so that attribute and its styling stay.

## Step 2 — remove the view-model plumbing

In `src/app/renderVals.js`, delete line 1680 entirely:

```js
      mEnter: (e) => this.mEnter(e), mLeave: (e) => this.mLeave(e), mDown: (e) => this.mDown(e), mUp: (e) => this.mUp(e),
```

Keep line 1681 (`dimEnter` / `dimLeave`) — those are live. Line 1679's comment
`// shared micro-interaction handlers (one signature across the whole UI)` should stay and now
describes the `dim*` pair alone; no edit needed.

## Scope boundary

Do not remove `[data-ring]` markup or styling. Do not touch `commitSelected`, `dimEnter`,
`dimLeave`, or anything in `reel.js` — its `_reelFromScale` / `_reelScaleT` fields are unrelated
despite the similar names.

## Verification

1. `npm run build` completes.
2. All four greps return zero results:
   `grep -rn "mEnter\|mLeave\|mDown\|mUp" src/` — the only surviving hits should be inside
   `AppView.jsx`'s `HBtn` (`onMouseEnter` / `onMouseLeave` / `onMouseDown` / `onMouseUp` are React
   props, not these methods).
3. `grep -rn "data-m-y\|data-m-scale\|dataset.mY\|dataset.mScale" src/` returns zero.
4. **Feel-check:** hover a result band — the `[data-ring]` strengthening driven by `dimEnter` must
   still work. Select a palette in the feed — `commitSelected`'s settle must still fire.
