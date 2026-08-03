# 006 — Make the reduced-motion preference live

**Commit:** `76b510f`
**Severity:** MEDIUM · **Category:** Accessibility
**Depends on:** none — fully independent, can land any time
**Risk:** low

## Problem

`src/app/PaletteApp.jsx:246` reads the preference exactly once, at mount:

```js
    this._reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches);
```

There is no listener. CSS honours the preference live — every
`@media (prefers-reduced-motion:reduce)` block re-evaluates the moment the OS setting changes — but
`this._reduce` gates roughly every GSAP path in the app and keeps whatever value it had at mount.

So a user who turns reduced motion **on** mid-session keeps every GSAP tween: the band wipe, the
masked line reveals, the list cascade, the loader. A user who turns it **off** gets the CSS half
back and none of the GSAP half. The two halves disagree until reload.

This is a genuine accessibility gap: reduced motion is frequently toggled *in response to* motion,
which is exactly the moment it fails to take effect.

## The pattern already exists

`PaletteApp.jsx:339-345` does this correctly for the width query, including the legacy
`addListener` fallback and a `try`/`catch`. Mirror it.

## Step 1 — listen

In `src/app/PaletteApp.jsx`, replace line 246:

```js
    this._reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches);
```

with:

```js
    // Live, not a snapshot. CSS re-evaluates its own reduced-motion blocks the moment the OS
    // setting changes, and _reduce gates every GSAP path in the app — read once, the two halves
    // disagree until reload. Reduced motion is most often switched on IN RESPONSE to motion, so
    // the one moment it has to work is the one a snapshot misses.
    try {
      this._rmq = window.matchMedia('(prefers-reduced-motion:reduce)');
      this._reduce = !!this._rmq.matches;
      this._onRmq = (e) => { this._reduce = !!e.matches; };
      if (this._rmq.addEventListener) this._rmq.addEventListener('change', this._onRmq); else this._rmq.addListener(this._onRmq);
    } catch (e) { this._reduce = false; }
```

`_reduce` is read at the top of every animated method rather than captured, so updating the field is
all that is required — surfaces already mid-flight finish on their old value, and the next
interaction takes the new one. That is the right behaviour: killing tweens on the change would
itself be an abrupt motion.

## Step 2 — clean up

In `componentWillUnmount`, `src/app/PaletteApp.jsx:455` is the existing `_mq` teardown. Add the
sibling line directly after it:

```js
    if (this._rmq && this._onRmq) { try { if (this._rmq.removeEventListener) this._rmq.removeEventListener('change', this._onRmq); else this._rmq.removeListener(this._onRmq); } catch (e) { } this._rmq = null; this._onRmq = null; }
```

## Scope boundary

Do not change any `this._reduce` **reader** — there are dozens and they are all correct as written.
Do not touch the independent `matchMedia` reads in `methods/legalReveal.js:62` or
`methods/legalToc.js:172`; those run per-invocation on the legal routes and are already live by
construction.

## Verification

1. `npm run build` completes.
2. Load the app. In devtools → Rendering → **Emulate CSS media feature
   `prefers-reduced-motion: reduce`**, toggle it **on without reloading**, then trigger a palette
   reveal. The bands must appear without the wipe.
3. Toggle it back **off**, trigger another reveal — the wipe returns.
4. In the console, `document.querySelector('#root')` → confirm no listener leak by unmounting is not
   practical here; instead confirm the teardown line exists and matches the `_mq` pattern above it.
5. **Feel-check:** toggling the setting mid-animation must not kill anything already running — the
   in-flight surface should finish normally, and only the *next* interaction should change
   character. An animation cut short by the toggle is a worse artefact than the one it removed.
