# Motion audit — plans

Audit run against `76b510f`. Scope: the whole site — app, legal routes, 404.

The finding behind all of this: **easing is tokenised and agrees across JS and CSS; duration never
was.** `--ease-standard` in `global.css` is byte-identical to `EASE.standard` in `motion.js`, and
that discipline was simply never extended to time. There are no `--dur-*` properties anywhere,
against a documented seven-value JS scale — so CSS accumulated fifteen ad-hoc literals and
`motion.js` writes `.15s` as a string twenty times inside its own style builders.

The reported button jump is a symptom of the same gap: every press is a 1px `translateY` on
`--ease-standard`, an expo-out. `motion.js:9-11` already documents why that curve "reads as a jump"
— the diagnosis existed, it just hadn't been applied to press.

## Execution order

| # | Plan | Status | Depends on | Risk |
| --- | --- | --- | --- | --- |
| 001 | [Mint the duration token scale](001-duration-token-scale.md) | **DONE** | — | none — purely additive |
| 002 | [One press language: scale on the click curve](002-unify-press-language.md) | **SUPERSEDED** | 001 | see below |
| 003 | [Retire the dead GSAP press system](003-retire-dead-press-system.md) | **DONE** | — | low |
| 004 | [Migrate every duration literal](004-migrate-duration-literals.md) | **DONE** | 001, 002 | medium — sites listed |
| 005 | [Converge the duplicate easing curves](005-converge-ease-tokens.md) | **DONE** | 001 | low |
| 006 | [Make reduced motion live](006-live-reduced-motion.md) | **DONE** | — | low |
| 007 | [The phone gets a product, not a refusal](007-mobile-product-story.md) | **DONE** | — | medium |
| 008 | [The overlay cascade gets a fade curve](008-overlay-fade-curve.md) | **DONE** | — | low |

All six landed in the order 001 → 002 → 003 → 004 → 005 → 006, against `76b510f`.

**008 is the same finding as 001–006, on a property they missed.** That audit's thesis was that
easing was tokenised and duration was not. 008 says easing was tokenised *incompletely*: every
arrival curve in the set is an expo-out, and the repo twice wrote down why an expo-out is wrong for
a property with no momentum — `--ease-fold` was minted for height (`global.css:839`),
`--ease-button-click` for press (`global.css:56`) — without ever applying it to **opacity**. So a
440ms fade in the utility drawers was 90% done in 136ms, which is why a 1.26s cascade read as too
fast and why the boxes could not be told apart from the masked line reveal running inside them.
It mints one curve and states the rule the set was missing: momentum for things that travel, even
rate for things that fade. Filed against `95e1569`, and landed with two additions the plan did not
foresee — per-item hooks for every block that held a list, and the discovery that `[data-ix]`
transitions `opacity` for 280ms, so a GSAP opacity tween on any control was fighting a damped
follower. See the 08-26 entry in DECISIONS.md.

**007 is not part of that audit.** The six above are one motion/duration refactor; 007 is a product
change — it replaces the phone's desktop gate with an eight-chapter scroll story — and is filed here
because this is where the project writes plans down, not because it shares their scope.

## 002 was superseded: a press does not move the control

Plan 002 replaced the 1px translate with `scale(.98)` on the click curve, and that shipped. It was
then reverted on sight: the buttons still moved, and the movement was the problem all along.

**The plan solved the wrong problem, and the audit's framing is why.** "Jumping/moving down and up
when pressed" was read as a motion-quality defect — wrong curve over too small a distance — when it
supported "buttons should not move" at least as well. The three options put to the user all kept a
geometric press; none offered none. Approval of "uniform scale" was a choice among options that had
already excluded the right answer.

What is true now, across `[data-ix]`, the glass CTA, `.button-006` and the 404 CTA: **a press
changes the control's colour and nothing else.** No transform, no scale, no `--press-scale`, no
`--button-006-click-scale`, and no `--press-dur` asymmetry to keep in step. The tint was always
carrying the feedback — background, border and colour deepen on `:active` — and the geometry was
additive.

Two things fell out of the revert worth keeping:

- **`.button-006`'s press tint had never been animated.** Its `__bg` layers carried no transition at
  all; the squash was doing the felt work while the colour cut instantly beneath it. Removing the
  squash exposed that, so those layers now transition on the same duration and curve as `[data-ix]`.
- **`palBtn` / `palBtnHover` / `palBtnActive` were dead** and are deleted. They styled two standalone
  copy buttons that became a menu; the objects stayed exported and unrendered. This corrects a claim
  made during 002's execution that `palBtnActive` was "the app's worst press" — it never rendered.

Still deliberately geometric: `[data-refine-slider]:active` widens its thumb (`scaleX(1.7)`). That
is direct-manipulation feedback on the thing under the finger, not a press.

## Where execution departed from the plans

Recorded because the plans were written from greps and the code had more in it than the greps saw.

**002 missed a press site.** `palBtnActive` (the palette copy buttons, `renderVals.js`) was a bare
`translateY(1px)` with **no transform transition declared at all** — a hard snap in both directions,
the same fault as the `[data-ix]` tiers with not even a curve to be wrong. Its hover half was on the
browser default `ease`. Both halves are on the shared contract now.

**004 under-counted the JS sites.** The plan tabulated `.15s` and `.28s`; the code also held `.2s`
(7 sites), `.38s` (2) and `.5s` (3). `.2s` mapped to `--dur-fast` as the table prescribed. The other
two did not: nearest-step for both is 100ms+ away, and both are motions a user recognises — the copy
confirmation's masked swap and the travelling selection marker. Remapping them would have retuned a
signature to tidy a table, so they were **named** instead, as `--dur-confirm:.38s` and
`--dur-fold:.5s`. Same reasoning plan 001 used to add `fast` and `chrome`: extend the scale to what
the app demonstrably needs rather than crush values into a gap.

**005 was wrong about the 404.** The plan asserted that `404.html` never loads `global.css` and
therefore needed its own copy of the tokens. It does load it — `src/notfound/main.js:21` imports
`global.css`, and `dist/404.html` links the emitted `/assets/global-*.css`. The tokens were briefly
duplicated into `public/notfound.css` on that false premise and then removed; a note in that file
now records why the duplication looks necessary and is not.

**005's `--ease-pill` → `--ease-fold` rename was closer than the plan implied.** Both names had four
consumers, and each was accurate for its own: `EASE.fold` served disclosure folds (`refine.js`,
`persistence.js`), `--ease-pill` served sliding markers. Converged on `fold` as planned, since
`initMotion` already documents the unified intent — a disclosure and a moving selection sharing one
motion character.

## Follow-up: the export list, and a sweep for instant states

**The export list was on the wrong schedule.** `buildExportTimeline` timed its five format buttons
as *sections* — the coarse `overlayStep * 2` beat starting at `D * 0.45` — when they are leaf rows,
the same thing as a drawer's cells. The cells comment in the shared builder argues against exactly
that ("a beat behind their section rather than a third of the panel later"); this call site was
never brought onto the fix. Now `D * 0.32` and one step, identical to every drawer: the last item
lands at 0.976s instead of 1.24s, measured against a real GSAP timeline, not estimated.

**Then a sweep for instant interaction states, which found fifteen.** Method: parse the stylesheet,
walk every interactive-state rule, and compare the properties it sets against
`getComputedStyle(el).transitionProperty` for **every** matching element. One root cause, three
shapes:

- **Inline `transition` replaces the contract, it does not merge.** `viewToggleOptStyle`,
  `toggleStyle`, `pageNavStyle`, both `rowStyle` definitions and eight `sx()` press buttons each
  named a shorter list than `[data-ix]`, so every property they omitted cut between two frames — the
  view toggles' background tint, the selected toggle's brightness filter, and `:disabled` opacity
  across the lot. All now declare nothing and inherit the contract.
- **Equal specificity plus later position does the same thing.** `[data-del]` (0,1,0) is written
  after `[data-ix]` (0,1,0), so its `transition` replaced the contract. It carries both sets now.
- **The contract was missing a property it changes.** `[data-ix]:disabled` sets `opacity` and the
  contract never transitioned it; added.

Two structural fixes fell out: `opacity` joined the contract, and `viewToggleOptStyle` gained an
`extra` argument so the project chips and per-page options **call** it rather than being the second
and third hand-copies of it — each of which had its own truncated transition.

`.toc-link` was a fourth shape: its `[data-toc-status="active"]` marker changes `box-shadow`, which
the base rule did not transition, so the 2px ink rule snapped in as you scrolled while the colour
beside it eased. Added.

Verified zero instant interaction states remain on the app view, `/privacy` and `/404.html`.

## Follow-up: the button's hover is masked text now

`.button-006` swapped its label with a `clip-path` fill sweeping **down** from the top — the
resource's own mechanic, and the last motion on the site belonging to no family. Everything else
here that changes text does the same thing in the same direction: `_maskLineReveal` wraps each
rendered line in an overflow-hidden mask and slides the inner up from `yPercent: 110`, and the copy
confirmation's `val-mask-a/b` keyframes rise from `110%`.

The button speaks that language now. One copy of the label leaves upward while the next rises into
its place, each clipped by the layer it already sat in — the same masked-line move at the scale of a
single line. Both spans travel the same direction, which is what makes it read as one strip moving
rather than two labels crossfading. Measured on a 29px button: default → `translateY(-29px)`,
hover → `translateY(0)`, exactly one button height each.

The hover **fill** now fades in place instead of wiping. A directional leading edge was the part
that actually read as foreign — no other control on the site fills from a side; every `[data-ix]`
tier answers a hover by changing colour where it stands. The label carries the direction, the
surface just deepens.

Timing moved onto the scale with it: `--dur-chrome` for both the swap and the tint, so they are one
gesture rather than two, and `--ease-entrance` for the text because that is the masked-reveal curve.
`--button-006-dur: 0.42s` is gone — it was the last duration in the app answering to no scale — and
so are `--button-006-default-text-scale` / `--button-006-hover-text-scale`, both of which had been
`1` for some time, knobs wired to nothing.

Reduced motion drops the swap outright rather than collapsing its duration; the global rule would
otherwise leave the two labels jumping a full line height between frames.

This reaches all 14 `B006` call sites — the emphasis tiers only remap colour tokens, never motion.

## Still open

- **`HBtn` gives no press feedback to keyboard users.** `AppView.jsx` drives its active state from
  `onMouseDown`/`onMouseUp` only, so the glass CTA stays at rest through a Space/Enter activation
  while every `:active`-driven control depresses. Noted in 002 as out of scope; no plan written.
- **Two infinite ambient animations remain on the browser default curve** — the header gradient
  (`9s ease-in-out`) and the processing dot (`blink 1.5s ease`), both in `AppView.jsx`. Left alone
  deliberately: tokenising the curve of an infinite pulse says nothing, and neither is interaction
  motion.

## Deliberately out of scope

These were examined and left alone — they are documented bespoke compositions, not drift:

- the loader timeline (`methods/loader.js`) — hand-choreographed offsets
- orbit ambient drift (`methods/orbit.js`) — generative, seeded
- the reel (`methods/reel.js`) and the lightbox FLIP (`methods/misc.js`)
- `.button-006` (`global.css:391-424`) — one of the three sanctioned specializations named at
  `global.css:75-78`. After 002 it shares the app's press curve while keeping its own richer
  non-uniform squash.
- the rich-tint family (`[data-row]`, `[data-feed]`, `[data-ex-item]`) — keeps
  `filter:brightness(.97)`. A full-bleed row is a surface, not a control; `scale(.98)` on a ~900px
  row pulls its edges in ~9px, which is a collapse rather than a press.

## Known issue, no plan written

`HBtn` (`AppView.jsx:18-32`) drives its active state from `onMouseDown`/`onMouseUp` only, so the
glass CTA shows **no press feedback for keyboard activation**, unlike every `:active`-driven
control. Noted in 002 as out of scope.
