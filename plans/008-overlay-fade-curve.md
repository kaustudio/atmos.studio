# 008 — The overlay cascade gets a fade curve, and stops borrowing the text mask's motion

**Against commit:** `95e1569`
**Files touched:** `src/styles/global.css`, `src/app/methods/motion.js`, `src/app/methods/overlays.js`
**Risk:** low — one new token, four call sites, no structural change
**Depends on:** nothing. (Extends 001/005, which minted the duration scale and converged the ease
tokens across CSS and JS. This plan must hold that same discipline: any new curve is written into
BOTH files, byte-identical.)

---

## The problem, in numbers

The utility drawers (contrast checker, colour harmonies, filter, export) arrive as a cascade of
blocks. It reads as too fast, and it reads as the same motion as the masked line reveal running
inside it. Both complaints are one cause.

`--ease-overlay` / `EASE.overlay` is `cubic-bezier(0.19, 1, 0.22, 1)` — an expo-out. Its profile:

| fraction of duration elapsed | 5% | 10% | 20% | 30% | 50% |
| --- | --- | --- | --- | --- | --- |
| fraction of value travelled | 0.26 | 0.48 | 0.77 | 0.89 | 0.98 |

It reaches 90% of its value at **31%** of its duration. Applied to the current schedule:

| thing | stated duration | reaches 90% at |
| --- | --- | --- |
| a block's opacity fade | 440ms | **136ms** |
| a block's exit fade | 260ms | **80ms** |
| the backdrop scrim | 800ms | **248ms** |
| a masked line's rise | 600ms | 185ms |

Three consequences, all confirmed against the running app:

1. **A block's fade is perceptually a 136ms pop with a 304ms invisible tail.** That is the "too
   fast" — the timeline says 1.26s, the eye is served ~140ms per block.
2. **The step between blocks is 128ms against a 136ms perceived block**, so the overlap ratio is
   `128 / 136 = 0.94`. Each block is essentially finished before the next one starts. The cascade is
   perceptually *consecutive*, which is exactly "not seamless" — on paper the tweens overlap by
   312ms, but all of that overlap is spent in the invisible tail.
3. **A block and the copy inside it run the same curve on the same axis at the same time.** The
   block does `y: 10 → 0` on `EASE.overlay`; the masked line inside it does `yPercent: 110 → 0` on
   `EASE.overlay`. Two Y-translations on one front-loaded curve, composed, in nested boxes. That is
   why the mask is "still noticeable" as the same motion.

Expo-out is wrong for opacity for the same reason the repo already documents it as wrong for height
and for press. `global.css:839`:

> `--ease-fold`, not `--ease-entrance`. Entrance is an expo-out: ~48% of the travel in the first
> tenth

and `motion.js:9-11`:

> right for something arriving into place and wrong for something CHANGING SIZE — a height on that
> curve snaps open and then creeps, which reads as a jump however long the tween is

Opacity has no momentum to model. A front-loaded fade is a flash followed by a wait. The diagnosis
was made twice and never applied to a third property.

**No existing token fits.** Every curve in the repo is either front-loaded or slow-starting:

| token | 50% at | 90% at | shape |
| --- | --- | --- | --- |
| `--ease-standard` | 0.13 | 0.37 | expo-out |
| `--ease-entrance` | 0.10 | 0.33 | expo-out |
| `--ease-overlay` | 0.11 | 0.31 | expo-out |
| `--ease-button-focus` | 0.16 | 0.37 | expo-out |
| `--ease-fold` | 0.36 | 0.57 | in-out |
| `--ease-button-click` | 0.35 | 0.63 | in-out |
| `--ease-button-hover` | 0.40 | 0.60 | in-out |
| `--ease-exit` | 0.65 | 0.94 | ease-in |

An in-out curve is not the answer either: a fade that starts slow reads as lag on a surface that is
answering a press. The gap is a gentle, near-even ease-out, and it does not exist yet.

---

## The fix

**One new token, and the boxes stop translating.**

`cubic-bezier(0.39, 0.58, 0.57, 1)` — a sine-out. 50% at 0.33 of the duration, 90% at 0.68. The
value moves at a near-even rate with a soft landing, which is what opacity wants.

The resulting split is the point, and it should be written down: **momentum for things that travel,
even rate for things that fade.** The panel still slides on `--ease-overlay` (a travelling object
should be front-loaded; `motion.js:15` argues that deliberately, and it stays). The masked line
still rises on `--ease-overlay` for the same reason. Only opacity changes curve — so the boxes and
the words are distinguishable by construction rather than by tuning.

Modelled outcomes (`overlap ratio = step ÷ perceived block length`; below 0.5 means blocks visibly
overlap, ~0.35 is a continuous sweep):

| option | block reads as | overlap | 6-block span | panel total |
| --- | --- | --- | --- | --- |
| now (expo, 440ms, step 128) | 136ms | 0.94 | 0.78s | 1.26s |
| A — curve only | 298ms | 0.43 | 0.94s | 1.26s |
| **B — curve + 560ms block (RECOMMENDED)** | **380ms** | **0.34** | **1.02s** | **1.38s** |
| C — curve + 640ms block + 160ms step | 434ms | 0.37 | 1.23s | 1.62s |

**Implement B.** It answers "too fast" with a 2.8× increase in perceived block length, holds three
blocks in flight at every instant, and keeps the panel under 1.4s. C is the same change with the two
numbers turned up and is the dial to reach for if B still reads quick — it is noted in step 6 so
nobody has to re-derive it.

---

## Steps

### 1 — Mint the token in CSS

**File:** `src/styles/global.css`, in the `:root` easing block (currently lines 198–213).

Current, for context:

```css
  /* the utility-overlay curve — an expo-out with a longer tail than --ease-entrance. Mirrors
     ... */
  --ease-overlay:cubic-bezier(0.19,1,0.22,1);
```

Add immediately after `--ease-overlay`:

```css
  /* --ease-overlay moves an OBJECT: the drawer panel travelling in from its edge, a masked line
     rising into place. Front-loading is right there — the thing is effectively arrived on the first
     frame and the rest is a settle.
     --ease-overlay-fade moves OPACITY, which has no momentum to model. On the expo-out a 440ms
     block fade was 90% opaque after 136ms and then spent 304ms moving the last tenth: a flash with
     an invisible tail, which is what made a 1.26s cascade read as too fast and made every block
     land before its neighbour started. This is the same fault --ease-fold was minted for on height
     and --ease-button-click on press; opacity is the third property it applies to.
     Sine-out: 50% at a third of the duration, 90% at two thirds, even rate, soft landing. */
  --ease-overlay-fade:cubic-bezier(0.39,0.58,0.57,1);
```

### 2 — Mint the same token in JS, byte-identical

**File:** `src/app/methods/motion.js`, line 24 (the `this.EASE = { ... }` assignment).

Current:

```js
    this.EASE = { standard: this.cubicBezier(0.22, 1, 0.36, 1), entrance: this.cubicBezier(0.16, 1, 0.3, 1), exit: this.cubicBezier(0.4, 0, 1, 1), fold: this.cubicBezier(0.625, 0.05, 0, 1), overlay: this.cubicBezier(0.19, 1, 0.22, 1) };
```

Replace with (adds one key at the end, changes nothing else):

```js
    this.EASE = { standard: this.cubicBezier(0.22, 1, 0.36, 1), entrance: this.cubicBezier(0.16, 1, 0.3, 1), exit: this.cubicBezier(0.4, 0, 1, 1), fold: this.cubicBezier(0.625, 0.05, 0, 1), overlay: this.cubicBezier(0.19, 1, 0.22, 1), overlayFade: this.cubicBezier(0.39, 0.58, 0.57, 1) };
```

Then add to the comment block directly above that line (after the paragraph ending
`…applied to the same properties the entrance moved.`):

```js
    // `overlayFade` is the same band's OPACITY curve, and the split it encodes is the rule: momentum
    // for things that travel, even rate for things that fade. `overlay` is an expo-out because a
    // panel sliding in from an edge and a masked line rising into place are objects with momentum —
    // 90% of the travel in the first 31% of the time is exactly right for those. Opacity has no
    // momentum, and on that curve a 440ms block fade was over in 136ms with 304ms of invisible tail
    // left. Mirrors --ease-overlay-fade in global.css.
```

### 3 — The blocks fade on the new curve, and stop translating

**File:** `src/app/methods/overlays.js`, in `_drawerIn`.

**3a.** Line 237. Current:

```js
    const blockDur = D * 0.55;
```

Replace with:

```js
    const blockDur = D * 0.7;
```

**3b.** Line 246. Current:

```js
      tl.from(sec, { opacity: 0, y: 10, duration: blockDur, ease: E, clearProps: 'transform,opacity' }, t);
```

Replace with:

```js
      tl.from(sec, { opacity: 0, duration: blockDur, ease: F, clearProps: 'opacity' }, t);
```

Note three changes on that one line: `y: 10` is **removed**, the ease becomes `F`, and `clearProps`
drops `transform` because nothing transforms any more.

**3c.** Immediately below the `const D = this.DUR.overlay, E = this.EASE.overlay;` line near the top
of `_drawerIn` (line 219), extend it to bind the new curve:

```js
    const D = this.DUR.overlay, E = this.EASE.overlay, F = this.EASE.overlayFade;
```

**3d.** Replace the comment block above the `secs.forEach` (currently lines 240–245, beginning
`// THE WHOLE BLOCK, not the rows in it.`) with:

```js
    // THE WHOLE BLOCK, not the rows in it. For a revision only the rows arrived, on the reasoning
    // that a block is a box and what arrives is the content in it — which was true of the ROWS and
    // false of everything else the box holds. A group's eyebrow, the search field, the sort toggle
    // and every drawer header sat at full opacity from the first frame, riding in on the panel
    // while the rows beneath them arrived: half the panel appearing, half of it already there.
    // Fading the block covers its own furniture as well as its children.
    //
    // AND IT DOES NOT TRANSLATE. The block used to carry a 10px rise on EASE.overlay, which is the
    // masked line reveal's own gesture at a smaller scale — same curve, same axis, same moment,
    // one nested inside the other. Two Y-translations composing inside one box is what made the
    // mask "still noticeable" as a second animation rather than reading as the words arriving with
    // their block. The boxes now carry opacity only; the mask is the only thing that moves in Y,
    // and it belongs to copy. One mechanic per role, told apart by construction rather than by
    // tuning their timings against each other.
```

### 4 — The cells fade on the new curve

**File:** `src/app/methods/overlays.js`, in `_drawerIn`, inside the same `secs.forEach`.

Current:

```js
        tl.from(own, { opacity: 0, duration: blockDur, ease: E, stagger: cellStep, clearProps: 'opacity' }, t + this.DUR.overlayStep);
```

Replace `ease: E` with `ease: F`:

```js
        tl.from(own, { opacity: 0, duration: blockDur, ease: F, stagger: cellStep, clearProps: 'opacity' }, t + this.DUR.overlayStep);
```

Do the same on the `loose` cells tween a few lines below (the one anchored at `D * 0.32`).

### 5 — The backdrop and the exit fade on the new curve

**5a.** `_drawerIn`, line 236. Current:

```js
    if (backdrop) tl.from(backdrop, { opacity: 0, duration: D, ease: E }, 0);
```

Replace with:

```js
    if (backdrop) tl.from(backdrop, { opacity: 0, duration: D, ease: F }, 0);
```

The scrim was reaching 90% opacity at 248ms of its 800ms — landing well before the panel it belongs
to. Do **not** touch the `tl.from(root, { xPercent: 100, … ease: E … })` line beneath it: the panel
travels, and keeps the momentum curve.

**5b.** `_drawerOut`. Bind the curve alongside the existing one — current:

```js
    const O = this.DUR.overlayOut, E = this.EASE.overlay;
```

becomes:

```js
    const O = this.DUR.overlayOut, E = this.EASE.overlay, F = this.EASE.overlayFade;
```

Then the block exit — current:

```js
    blocks.forEach((el, i) => { t.to(el, { opacity: 0, duration: outDur, ease: E }, i * step); });
```

becomes:

```js
    blocks.forEach((el, i) => { t.to(el, { opacity: 0, duration: outDur, ease: F }, i * step); });
```

and the backdrop line beneath it — current:

```js
    if (backdrop) t.to(backdrop, { opacity: 0, duration: O, ease: E }, panelAt);
```

becomes:

```js
    if (backdrop) t.to(backdrop, { opacity: 0, duration: O, ease: F }, panelAt);
```

Leave `t.to(root, { xPercent: 100, … ease: E … })` alone — same reason as 5a.

Then add, to the comment block above `_drawerOut` (after the paragraph beginning `// The blocks only
fade; they do not sink back…` — which stays true and becomes stronger, since they no longer rise on
the way in either):

```js
  // The block fades take EASE.overlayFade, not EASE.overlay. On the expo-out a 260ms exit fade was
  // 90% gone in 80ms, so six blocks did not cascade out, they strobed: the step between them was
  // 52ms against an 80ms event. The panel keeps EASE.overlay because the panel travels.
```

### 6 — The export dialog's list

**File:** `src/app/methods/overlays.js`, in `buildExportTimeline`.

Current:

```js
    tl.from(items, { opacity: 0, duration: D * 0.55, ease: E, stagger: this.DUR.overlayStep, clearProps: 'opacity' }, D * 0.32);
```

Replace with:

```js
    tl.from(items, { opacity: 0, duration: D * 0.7, ease: this.EASE.overlayFade, stagger: this.DUR.overlayStep, clearProps: 'opacity' }, D * 0.32);
```

Also in the same function, the dialog's own arrival is a fade *plus* a transform:

```js
    tl.from(root, { opacity: 0, y: 12, scale: 0.98, duration: D, ease: E, transformOrigin: 'center center' }, 0);
```

**Leave this line alone.** It is a composite where the transform leads and the fade rides along; it
is not a block in the cascade, and splitting it across two curves would need its own argument.

### 7 — The tag drawer's sticky header

**File:** `src/app/methods/overlays.js`, in `buildTagTimeline`.

Current:

```js
    if (head && !this._reduce) tl.from(head, { opacity: 0, duration: this.DUR.overlay * 0.55, ease: this.EASE.overlay, clearProps: 'opacity' }, this.DUR.overlay * 0.16);
```

Replace with:

```js
    if (head && !this._reduce) tl.from(head, { opacity: 0, duration: this.DUR.overlay * 0.7, ease: this.EASE.overlayFade, clearProps: 'opacity' }, this.DUR.overlay * 0.16);
```

---

## Out of scope — do not touch

- **`--ease-overlay` itself.** It stays exactly as it is, on exactly the properties it is on now.
  This plan adds a curve, it does not retune one.
- **The panel's `xPercent` tweens** (entrance and exit) — a travelling object is correctly
  front-loaded, and `motion.js:15` argues for it deliberately.
- **`_maskLineReveal` in `motion.js`** — the masked line's `yPercent` rise keeps `EASE.overlay`.
  That curve is right for it, and it is now the *only* thing in the drawer moving in Y, which is the
  whole point of step 3b.
- **`DUR.overlayBlock` (128ms), `DUR.overlayStep` (40ms), `DUR.overlay` (0.8s), `DUR.overlayOut`
  (1s)** — every timing token is unchanged. Only `blockDur`, a local multiplier, moves (0.55 → 0.7).
- **`_drawRules`** — the hairline draw is also on an expo-out and is arguably a flash rather than a
  draw, but it is a 1px line, it is pre-existing, and it is a separate argument. Left alone
  deliberately; noted here so the next audit does not treat it as newly introduced.
- **Anything under `src/about/`, `src/notfound/`, `src/legal/`, or any `about*.js` method.** This
  plan is the four utility overlays only.
- **Reduced motion.** Both `_drawerIn` and `_drawerOut` return early under `this._reduce` before
  reaching any line in this plan. Do not add a branch; there is nothing to guard.

---

## Verification

### Measured

The dev preview reports `document.hidden === true`, so GSAP's ticker is frozen and animations only
advance when something forces a paint. Do not try to watch this play. Drive the timeline by hand:

1. `preview_start` the `atmos-dev` config.
2. Reach the app, get a reference to the component instance, then open the contrast checker.
3. `tl = instance._cxTl; tl.pause();` and sample: for a set of `tl.progress(p)` values, read
   `[...document.querySelectorAll('[data-contrast-dialog] [data-cx-sec]')].map(e => getComputedStyle(e).opacity)`.

**Pass criteria:**

- `tl.duration()` is **≈1.376s** (was 1.26s).
- At **every** sampled point between t=0.3s and t=1.2s, **at least two** blocks read strictly
  between 0.05 and 0.95. Under the old curve there were long stretches where only one did — that
  gap is the defect.
- No block reads `> 0.9` until at least **380ms** after its own start time (`plan.at[i]`, readable
  from `instance._blockPlan`). Under the old curve this was 136ms.
- No element inside `[data-contrast-dialog]` has a non-identity `transform` at any point during the
  arrival **except** the dialog root itself and the `div`s inside `[data-drawer-split]` (the line
  masks). This is the machine-checkable form of "the boxes no longer share the mask's gesture".
- Repeat all of the above for `[data-harmony-dialog]` / `instance._hxTl`.

### Feel-check — required, and it cannot be skipped

The numbers above prove the curve landed; they cannot prove it reads as seamless. Do this in a real
browser tab (not the preview pane, which freezes rAF):

1. `npm run dev`, open the app in Chrome, load a palette, open the contrast checker at full speed.
   It should read as **one wave passing down the panel**, not as six things appearing in order. If
   you can count the blocks, the overlap is still too low.
2. Open DevTools → Rendering → **Emulate CSS media `prefers-reduced-motion: no-preference`**, then
   use the Animations panel at **25% speed**. Watch the words specifically: the text should be the
   only thing moving vertically. If a block still appears to shift, step 3b was not applied.
3. Open and close the drawer **ten times in a row**, quickly. This is the frequency case — the
   drawer is an instrument, not a destination. If it starts to feel slow at that cadence, the block
   duration is too long: fall back to option A (leave `blockDur` at `D * 0.55`, keep every other
   change) rather than reverting the curve.
4. If it still reads fast after step 1, apply option C: `blockDur = D * 0.8` and
   `DUR.overlayBlock: 0.16` in `motion.js`. Do not reach for C before feeling B.

### Regression

- Open and close all four surfaces: contrast checker, colour harmonies, filter drawer, export
  dialog. Each must tear down completely — check `document.querySelector('[data-contrast-dialog]')`
  is `null` after close, and that `instance._blockPlan` is `null`.
- Console must be clean.
- The tag drawer's sticky header must still compute `position: sticky` with `transform: none` after
  its arrival. A transform on a sticky element makes it its own containing block and it detaches on
  scroll; step 7 keeps it opacity-only precisely to avoid that.
