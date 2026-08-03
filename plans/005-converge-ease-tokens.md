# 005 — Converge the duplicate and untokenised easing curves

**Commit:** `76b510f`
**Severity:** MEDIUM · **Category:** Cohesion & tokens
**Depends on:** plan 001 (for `--dur-state` in step 4)
**Risk:** low — three of the four steps are pure renames with identical computed values.

## Problem

The easing tokens are the part of this system that already works, which makes the four places they
don't the whole of the remaining drift:

1. One curve, two names. `EASE.fold` (`motion.js:24`) and `--ease-pill` (`global.css:99`) are both
   `cubic-bezier(0.625,0.05,0,1)`.
2. `loader.js:110` lazily re-derives `cubic-bezier(0.19,1,0.22,1)` into `this._foldEase` — a curve
   that already exists as `EASE.overlay`, cached under the name of a **different** token.
3. `EASE.overlay` has no CSS counterpart, so a CSS surface wanting the app's overlay character
   cannot ask for it.
4. Two stylesheets animate on the **browser default `ease` curve**, outside the system entirely:
   `src/styles/legal.css:183` and `public/notfound.css:183`.

## Step 1 — one name for the fold/pill curve

`cubic-bezier(0.625,0.05,0,1)` is the sliding selection marker and the disclosure fold. The JS name
`fold` describes what it does; `pill` describes one consumer. Converge on **`fold`**.

In `src/styles/global.css:97-99`, replace the token and its comment:

```css
  /* the sliding pill behind every segmented toggle (view, per-page, project scope), and the
     disclosure fold. Mirrors EASE.fold in methods/motion.js — one curve, one name in both
     languages. It was the same literal bezier pasted in three places before it was a token. */
  --ease-fold:cubic-bezier(0.625,0.05,0,1);
```

Then update every consumer of `--ease-pill`. Find them with `grep -rn "\-\-ease-pill" src/ public/`
and replace each with `var(--ease-fold)`. The computed value is unchanged, so nothing can move.

## Step 2 — add the missing overlay curve

In the same `:root` ease block in `src/styles/global.css`, add:

```css
  /* the utility-overlay curve — an expo-out with a longer tail than --ease-entrance. Mirrors
     EASE.overlay in methods/motion.js, which documents why it runs in BOTH directions. */
  --ease-overlay:cubic-bezier(0.19,1,0.22,1);
```

Add only. Do not retarget any existing rule onto it in this plan.

## Step 3 — stop re-deriving the overlay curve in the loader

`src/app/methods/loader.js:110` currently reads:

```js
        tl.to(bg, { yPercent: -101, duration: 0.95, ease: this._foldEase || (this._foldEase = this.cubicBezier(0.19, 1, 0.22, 1)) }, 0.8);   // fold lifts, unchanged
```

`cubic-bezier(0.19,1,0.22,1)` is `EASE.overlay`, already built once in `initMotion` and guaranteed
to exist before the loader builds its timeline (`PaletteApp.jsx:248` orders it that way — see the
comment on that line). Replace with:

```js
        tl.to(bg, { yPercent: -101, duration: 0.95, ease: this.EASE.overlay }, 0.8);   // fold lifts, unchanged
```

The `_foldEase` field then has no other reader — confirm with
`grep -rn "_foldEase" src/` and delete any remaining declaration. **The computed curve is
identical**, so the loader's motion must not change at all.

## Step 4 — the two untokenised stylesheets

`src/styles/legal.css:183` currently reads:

```css
  transition:color .25s,border-color .25s,background-color .25s;
```

Three durations off the scale and **no easing function at all**, so these run on the browser's
default `ease` — a curve that belongs to no part of this system. Replace with:

```css
  transition:color var(--dur-state) var(--ease-standard),border-color var(--dur-state) var(--ease-standard),background-color var(--dur-state) var(--ease-standard);
```

`src/styles/legal.css` is imported by the bundle and inherits `:root` from `global.css`, so the
tokens resolve.

`public/notfound.css:183` currently reads:

```css
  transition:opacity .5s ease;
```

`404.html` is served straight out of `/public` and **does not load `global.css`**, so `var(--dur-*)`
would not resolve there. Two options — pick the first unless it conflicts with something you find
in the file:

- **Preferred:** declare the two tokens it needs at the top of `public/notfound.css` in its own
  `:root`, mirroring the values, with a comment saying why they are duplicated rather than imported.
  Then use `var(--dur-reveal) var(--ease-standard)`.
- Otherwise: write the literal curve `cubic-bezier(0.22,1,0.36,1)` with a comment pointing at
  `global.css`'s `--ease-standard` as the source of truth.

Either way `.5s` becomes `.62s` / `--dur-reveal` — this is a fade on the 404 and the arrival length
is right for it.

## Scope boundary

Steps 1-3 must not change any computed value. If a diff shows a curve moving, it is wrong. Step 4
does change two surfaces deliberately.

Do not retarget existing rules onto `--ease-overlay`. Do not touch `--ease-button-hover`,
`--ease-button-click` or `--ease-button-focus` — all three are live and distinct.

## Verification

1. `npm run build` completes.
2. `grep -rn "\-\-ease-pill\|_foldEase" src/ public/` returns zero.
3. `grep -rnE "transition:[^;]*[0-9]s[,;]" src/styles/ public/*.css` returns zero — no transition
   anywhere is left without an easing function.
4. **Feel-check:** the loader's fold lift (step 3) and every segmented-toggle pill (step 1) must be
   **indistinguishable** from before — record both before and after if unsure. Then load a legal
   route and hover a link: the colour change should now feel like the rest of the app rather than
   like a default browser transition.
