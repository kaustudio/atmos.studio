# Decisions

Short, dated records of choices that are easy to re-litigate — or to have re-proposed by a bot.
A decision that lives only in a closed pull request gets made again by the next person who
doesn't know it was ever made.

---

## 2026-07-31 — Two motion bands: arrival, and instruments

**Context:** the July 2026 interface review of Refine, Colour Harmonies and Library Filtering, its
§5 and IF-05. It measured Harmony closing and returning focus promptly while Filter was *still on
screen past 150 ms and completed later*, and concluded the two overlays were governed by different
systems. They were governed by the same one; the problem is that it was the wrong system for them.

**Decision:** `DUR.overlay = 0.8` on `EASE.overlay = cubic-bezier(.19,1,.22,1)`, and the five utility
overlays move on it — Refine, Colour Harmonies, Library Filtering, the contrast checker and the token
export dialog. `DUR.reveal` (0.62) is untouched and stays what it has always been: the app's
**arrival**.

The distinction is what the surface IS, not how big it is. A palette resolving out of a photograph,
bands wiping up in sequence, a stage taking the screen — that is the product's own moment. Refine and
Filter are instruments you open, use and shut, often several times in a row, and they need their own
band.

**This landed at 0.18s first, and that was too far.** The reasoning was that a stagger cannot read at
180 ms, so the section cascade, the cell stagger, Refine's assemble-in-reading-order sequence and the
masked line reveal all came out and the panels arrived as one flat object. That did fix the measured
complaint — but by deleting the thing worth measuring. The review's finding was never that these
surfaces were choreographed; it was that they were choreographed *differently*, and at arrival
length. **This curve is the answer to what was actually wrong.** It is an expo-out with a long tail:
48% of the travel is spent in the first 10% of the time, so the panel is effectively present from the
first frame whatever the duration is, and the rest is a settle.

**Which is why the length ended up at 0.8s and costs nothing.** It went in at 0.4s and the sequence
did not fit: sections, cells, rules and masked text all have to land inside one arrival without
treading on each other, and the last of them was still moving as the first finished. The extra
length is not slower — on this curve the panel is on screen just as fast — it is ROOM. `overlayStep`
is derived from the band rather than fixed, so the proportions survive the next time it moves.

**Sequential and seamless, which pull against each other.** The overlaps are where they meet: nothing
waits for the thing before it to finish. Sections start at 0.28 of the panel's travel, the group
rules at 0.4, cells at 0.45, the masked text underneath all of them. There is no frame in which only
one thing is moving and no seam between stages. Refine reads panel → bands → identity → axes →
preview → evidence → rules, every stage beginning while the last is still going. Measured on the
filter panel at 405 ms: the panel is still 14 px out, a rule is 45% drawn, a section is at 0.82 and a
cell at 0.13.

**The dividers draw, and they are elements to make that possible.** A border cannot perform — it
belongs to the box it is on, so it can only fade with it — and the rules BETWEEN content groups are
structure. They draw left to right on the loader bar's `scaleX`-from-origin-0, which is the mechanic
the result view's `[data-meta-line]` block already uses. The border each one replaces stays in place
as `transparent`, so the box model is byte-identical and no padding token had to be re-derived.
Row-to-row hairlines are deliberately excluded: a separator between two rows belongs to its row and
fades in with it, and a list whose separators drew independently would read as two things arriving.

**Two blocks were not in the arrival at all**, which is what made this visible in the first place:
the Character-traits disclosure in the filter panel — carrying the rule that separates the measured
groups from the interpretive ones, the panel's main distinction — and Refine's whole footer. Both
appeared instantly while everything around them arrived.

**One function, not five timelines that agree today.** `_drawerIn` builds all three drawers; the
export dialog shares everything after its first tween (it grows from its centre rather than sliding
from an edge). Three hand-written timelines that happened to match is how they drifted apart the
first time.

**Nothing fades. Everything masks.** Content arrives by a clip-path wipe from its bottom edge — the
same mechanic as the result stage's bands, the detail overlay and Refine's swatch strip — so an
overlay's contents arrive in the language its palettes arrive in. Opacity is *exposure*: a panel
whose parts fade up looks like it is being developed rather than assembled, and at this tempo that
was plainly what it looked like. A mask says the content was always there and is being uncovered,
which is what a staggered sequence is trying to say in the first place. Sections still translate,
because a section is the box and what arrives is what is in it. Measured across a full arrival: every
element holds opacity 1 throughout.

**The exit is written out, and two cleverer versions were tried first.** `DUR.overlayOut = 1.2s`, on
the same `EASE.overlay`, stated on the same properties the entrance moved.

- `reverse()` plays the entrance backwards at native rate. The length then follows the content
  (427 ms for Refine against 714 ms for Harmony — the review's own divergence, back through the side
  door) and the curve comes out mirrored, so the panel accelerates as it leaves and is *gone* rather
  than landed.
- `tweenTo(0, {ease})` eases the PLAYHEAD instead. That fixes the length, but the curve lands on time
  and each tween then applies its own on top — two eases composed. Measured: the panel sat still for
  160 ms, crossed 300 px in the next 200, then crept the last 16 px over half a second. Nothing in
  this motion system moves like that, because nothing in it is two eases deep.
- Writing the exit out gives the curve directly: 44% of the travel by 106 ms, 94% by 452 ms, settled
  by 950 ms. Away quickly, landing slowly, legible as the arrival's counterpart.

The entrance timeline is killed rather than left to finish — it owns the same properties, and two
tweens arguing over one transform is how a panel jitters on the way out. Its `clearProps` never
running is harmless: the drawer unmounts, so the node carrying the stale inline styles goes with it.

**The dismissal is the slower of the two, which inverts the usual rule.** An arrival answers a press
and has to feel prompt. A dismissal has already been decided — nothing is waiting on it — so it can
afford to be quiet.

**Measured after:** all four overlays reachable from the result stage close in 1213–1228 ms, a 15 ms
spread, and open on one schedule whose only variation is the stagger tail of what each one holds
(≈1.16 s end to end on the fullest panel). Under reduced motion the whole thing collapses to a 0.12 s
fade: no masks, no rule draws — plain hairlines, full width, no transform, in and out in under 40 ms.

---

## 2026-07-31 — A measured word belongs to one dimension

**Context:** the same review, its IF-01. Selecting the measured **Temperature → Warm** still offered
an interpretive `warm` trait for three of the four surviving palettes: the same visible word, two
classification systems, two meanings.

**Decision:** `taxonomy/vocabulary.json` has recorded these terms as retired since version 1 and
nothing enforced it. `src/lib/taxonomy.js` is the runtime half of that artifact now, and all three
paths that can put a descriptor on a palette read it — the local engine composes from interpretive
registers only, the live path filters what a model returns, and `validateFeed` filters on read.

**Read-time filtering, not a migration.** Every stored record, backup file and cross-tab sync comes
through `validateFeed`, so filtering there fixes an existing archive with no `SCHEMA_VERSION` move
and no one-shot migration to get wrong. Nothing is lost: `retired.computed` records where each
term's meaning now lives, and the palette still answers Temperature → Warm from the pixels.

**Coverage is by construction.** The descriptor engine was ten independent `if`s over the axes, and
a mid-lightness, restrained, neutral, gently-contrasted palette matched none of them — harmless
while the mechanical labels carried the set, fatal once they were gone, because a palette with no
descriptors has no tags in the row, none on the card and no `mood` in its metrics. It is three
exhaustive tables now (light, temperature, structure) with disjoint word sets, so every palette
resolves to exactly three terms before the flags and the guarantee is provable rather than swept
for. `taxonomy-check.mjs` asserts it over 4000 random palettes, along with the artifact and the
runtime agreeing on the retired list in both directions.

**Structure comes from contrast on purpose.** Contrast is the one axis with no facet in the filter
panel, so those four terms are the only register that cannot read as a synonym of a dimension the
user can also filter by — which is the whole failure being removed.

**The review's own suggestion was not followed, and this is the one place it is wrong.** It proposes
*Graphic, Monochrome, Saturated, Restrained, Anchored, Even, Stark* as the Character vocabulary. Six
of those seven are in `retired.computed`. Following it would have rebuilt the collision.

**The eight seeds changed.** Their descriptors were hand-authored measured words — Garnet shipped as
*Low-lit · Warm · Saturated* — which made the examples the archive's largest source of the
duplication. Each is now exactly what `composeReading()` returns for its swatches. The rationales are
untouched: an axis word belongs in a sentence.

---

## 2026-07-31 — A palette belongs to many projects

**Decision:** membership is a set. `projectIds: string[]` is the truth; `projectId` survives on every
record as its first entry and nothing reads it.

**Why it changed:** a palette carried one `projectId`, so filing it in a second project silently took
it out of the first. The action row was honest about that — it read `In Garnet Set` — but honest
about a model that did not do what a folder is expected to do. Changing the label alone would have
made it worse: `Add to project` on a filed palette would have moved it, with nothing on screen
saying so.

**The legacy field is a write-only mirror.** A backup restored into an older build reads `projectId`
and would otherwise come back with everything unfiled. `withProjects()` is the only writer, so the
array and the mirror cannot drift; `palProjects()` and `inProject()` are the only readers, so there
is one definition of "is it in there" rather than nineteen inline comparisons.

**Migration is on read, not a version bump.** `validateFeed` turns a bare `projectId` into a
one-element set, which means `SCHEMA_VERSION` stays 1 — absence is meaningful, exactly as it was for
`sourceSwatches` and `roles`. Records written before today load correctly and are rewritten in the
new shape the first time anything touches them.

**Two interaction consequences, both forced rather than chosen.** The picker no longer closes when
you tick a project: closing after the first tick would mean reopening it for the second, which is
the whole thing the change exists to allow. `Unfiled` still closes, because "belong to nothing" is a
complete answer. And the action row now always reads `Add to project` — it is the way IN to the set,
never a report of a single state it can no longer have.

**Verified:** one palette in two projects; scope chips counting it under both and out of Unfiled
(All 8, Unfiled 7, Warm work 1, Client A 1); the set surviving a reload through `validateFeed`; and
deleting one project leaving the other membership intact with the mirror re-pointed.

---

## 2026-07-29 — One inset, everywhere content sits inside something

**Decision:** every panel, drawer, dialog and page section insets its content by `--page-gutter`.
Floating surfaces (menus, toggletips) share one figure of their own; the two empty-state cards share
a third. Nothing is a pixel or two off anything else.

**What it replaced:** 43 declarations at 18, 20 or 22px in the horizontal slot, against a page margin
of 24. The drawer's own header sat at 24 while its facet groups sat at 22 — a two-pixel step inside
one panel, which is the kind of thing nobody can point at and everybody can feel. Two more pairs sat
one pixel apart for no reason anyone recorded: menus at `12px 14px` beside toggletips at `13px 15px`,
and the two empty states at `48px 40px` and `56px 40px` — the same card in two situations, padded
differently.

**One case needed arithmetic rather than a swap.** The drawer's facet rows carry 12px of their own
horizontal padding so their hover tint has room to breathe past the label. Their container therefore
insets by `calc(var(--page-gutter) - 12px)`, so the ink still lands on 24 while the tint bleeds
either side of it. Setting the container to 24 would have put the labels at 36.

**The list view's tooltip is gone.** The ⓘ in front of the `AA pairs` sort label opened a note
defining a WCAG pair. It was a permanent explanation parked inside a column header on the one screen
people scan rather than read, and it cost the AA column an inline element it had to lay out around.
What it defined belongs to the contrast surface that measures it, which is one button away and has
room to say it properly. The `--row-aa-mark` token stays — it still stops the badges ending in a
ragged right edge — but the second reason recorded against it, that the ⓘ shared the badge's edge,
went with the ⓘ.

**Modals are not on the page grid, deliberately.** A centred dialog has a fixed width and the grid is
fluid, so its edges can only land on columns at one viewport width. What is shared is the inset, not
the geometry.

---

## 2026-07-29 — The list row sits on the page grid

**Decision:** the library row and its sort header are laid out on the page's twelve columns, not on
a private template. Each cell spends a whole number of them:

    strip 2 · name and tags 4 · AA pairs 2 · max contrast 2 · date 2

**What it replaced:** a five-track template in pixels — `160px / 1fr / 104px / minmax(88px, pitch) /
182px`. Every figure in it was reasoned, documented and defensible, and not one of them touched a
column. Measured at 1440px: the page's lines fall at 24, 117, 234, 352, 469, 586, 703, 820, 937,
1055, 1172, 1289, 1406, and the row's cells began at 40, 216, 898, 1018 and 1216. Nothing met
anything, on the screen people spend the most time on.

**Three nested insets had to go, not just the template.** The row carried `--row-inset: 16px` INSIDE
the page's 24px margin, so the strip started at 40 on a page whose first column starts at 24 — a
second margin nested in the first. The row also had `--row-cell-inset` as its right padding, and
each metric cell repeated the same 8px as its own `padding-right`; header and values agreed with
each other and with nothing else, which is the most convincing kind of misalignment. All three are
zero now, and the ink lands on the column line: measured, `AA pairs` label and value both end at
944, `Max contrast` both at 1180, the date cell's right edge at 1416, which is column twelve.

**The even metric pitch survived for free.** `--row-metric-pitch` was hand-building equal spacing out
of `--row-time-col`; three equal spans give it by construction. The pixel tokens remain as minima
and as the geometry the hover buttons travel by — they no longer set a track's width.

**Spans live in CSS, keyed by role, because they change at a breakpoint** and an inline style cannot
be reached by a media query. The date column carries the stamp plus the 82px the hover buttons step
into: two columns is 212px at 1440 but falls under 182px at about 1260, where the buttons would land
on the date. Below 1280 the date takes a third column and the name gives it up — the name is elastic
and truncates gracefully, a timestamp is a fixed string that cannot. Verified at 1180: date 265px,
every cell still on a line.

**The cost, stated plainly:** the name and tag column went from 666px to 448px at 1440. Two tags
fewer are visible before the list truncates. That is the price of the row being on the grid, and it
is the one part of this a designer might want to spend differently — the spans are four numbers in
one CSS block.

---

## 2026-07-29 — One gutter: 12 columns, 24 margin, 24 gutter

**Decision:** one page gutter, `--page-gutter: 24px`, on every document and on chrome and content
alike. `--grid-cols: 12` and `--grid-gutter: 24px` name the grid, and a `Shift+G` overlay draws it.

**It was three figures, none of them the design's.** `--chrome-gutter` at 16 for the header bar,
`--page-gutter` at 22 for content, and a comment here defending the split on the grounds that chrome
and content are not the same grid. They are — and in practice the page-level containers (`header`,
`main`, `section[data-recent]`) all used a literal `16px` anyway, so the 22 was never the page
margin at all.

**The evidence was already in the repo.** `site-foot.css` carried a note recording that the supplied
comp specified **24px** and that the code used 22 regardless, because "a bespoke 24px would put a
fourth gutter into a stylesheet that names two on purpose." Three wrong figures were kept to avoid a
fourth. That is how a grid stops being one, and it is worth naming: the reasoning was locally
sound at every step, and the result was that no edge in the app sat where the design put it.

**The overlay is the instrument, not decoration.** It is after Osmo Supply's *Animated Grid Overlay
(Columns)* and keeps its hooks — `[data-animated-grid]`, `[data-animated-grid-col]`,
`[data-animated-grid-toggle]`, the `animatedGridState` key, `Shift+G` suppressed inside inputs.

Two things are deliberately not the resource's:

· **No animation.** A ruler that slides in is a ruler you cannot trust for the first second, and this
  one is flicked on and off against an edge you are already staring at. Instant cut, and with nothing
  left to tween the file no longer touches GSAP at all.

· **One level on the one key**: `Shift+G` shows the 12 columns, again hides them. A margins band
  shipped briefly as a stacked second level and was removed: the columns are the grid, and a second
  state to cycle past is a second thing to remember on a shortcut whose whole value is that you can
  hit it without thinking. The edges it checked are held by `--page-gutter`, which one token now
  sets for every document.

Red at 0.2, not the resource's `#f4f4f4`. Neutral grey was right on Osmo's own demo; here it is a
wash the same weight as the app's surfaces, and on the library list — the screen this gets pointed
at most — grey columns behind grey rows read as part of the design. Red is the one hue this
monochrome interface cannot produce, so nothing on screen can be mistaken for it.

Four integration notes, each forced rather than chosen, all recorded at the top of
`src/lib/gridOverlay.js`: it builds its own DOM (this app renders one React tree and has no static
markup to paste into), it mounts on `document.body` (a transformed ancestor would silently break
`position:fixed`), it has no `.container`/`--size-container` (the scaling system is not installed and
this app has no page-level container), and every figure it draws comes from `--grid-cols`,
`--grid-gutter` and `--page-gutter`.

It reads `--grid-cols` and `--grid-gutter` rather than hard-coding 12 and 24, so it can only ever
draw the grid the layout is built on. An overlay that carries its own opinion of the grid is a second
source of truth, and would eventually disagree with the first one silently.

**Verified with it:** 12 columns, 24px margins both sides, 24px gutters, and the header, feed rows,
Library heading and chips all landing on column one.

**Not done:** component-internal padding. Dialogs and drawers still use their own 22px inner inset.
That is not the page margin and does not belong to this grid; folding it in would be inventing a
rule the design has not asked for.

---

## 2026-07-29 — One icon family, one press tier, four button geometries

**Decision:** every icon is a filled path from `material-symbols-light` on the 24 grid, at one of
three sizes. Every button declares an interaction tier, and its padding comes from one of four
tokens or from an explicit `0`.

### Icons

Ten icons; **four were genuine** `material-symbols-light` (contrast, download-sharp,
folder-outline-sharp, delete-outline-sharp). Of the rest:

- `IconCopy` was that family's `content-copy-outline-sharp` **with two subpaths deleted**, so the
  inner sheet had no outline.
- `IconCheck` and `IconLink` came from the heavier `material-symbols` weight and sat visibly bolder
  than the four beside them.
- `IconHarmony`, `IconClose` and `IconChevron` were drawn by hand, as **strokes at 1, 1.6 and 2** —
  three weights, in a set where nothing else was stroked at all. That is what the eye caught first.

All ten are now regenerated from the Iconify API rather than transcribed, because transcription is
how a set drifts one icon at a time. The **sharp** cut is used wherever the glyph has curves to
square off; a check, an X and a chevron have none, so the family publishes no separate sharp variant
of them and the base glyph *is* the sharp one. Sharp is not taste here — it is the only cut
consistent with a design that carries no border-radius anywhere.

`IconHarmony` became `join-inner`, which is the real Material Symbol for the two-overlapping-circles
metaphor the hand-drawn one was reaching for.

Three sizes, matched to the type beside them: **9** with `--fs-micro`, **12** with `--fs-label`,
**14** with `--fs-body` and the action row. Filled paths mean scaling never changes apparent weight.

### Tiers

Seven `data-ix` tiers became five. `solid` and `press` had **identical** hover (16%) and active
(24% + 1px) — the only difference was that `solid` also moved its border-colour, which is a no-op on
the borderless controls `press` was used for. Two names for one behaviour is how a system starts
drifting: the next person picks whichever they saw last, and eventually the two stop matching for
real. 22 call sites moved to `press`.

Seven controls had **no tier and no hover state at all** — the view and page-size toggles, the
project scope chips, the applied-filter chips, the phone's swatch rows. The segmented ones took
`seg`, which exists precisely to give an unpressed option a hover; the rest took `press` and `cell`.
The controls still without a tier keep their own named state rules (`data-feed`,
`data-refine-swatch`) or JS hover (`HBtn`), which is a system, just a different one.

### Geometry

Twelve paddings across the buttons that declared one, ten of them within a pixel of a neighbour in
each direction — `8px 13px` beside `9px 14px` beside `8px 12px`, on buttons that appear in the same
row. Four tokens now:

| token | value | for |
|---|---|---|
| `--btn-pad-sm` | `7px 12px` | dense chrome: chips, counts, in-row controls |
| `--btn-pad-md` | `9px 14px` | the default: toolbars, panel headers |
| `--btn-pad-lg` | `12px 16px` | the act that closes a decision |
| `--btn-pad-chip` | `4px 8px` | objects inside a row or a run of text |

A third family takes no token: **square icon buttons** at 16, 26 and 30, sized by width/height and
flex-centred. Their padding is meaningless — but it is now written as `0`, because a `<button>` with
none inherits the UA's `1px 6px`, and geometry that comes half from the design and half from the
browser is the kind of thing that looks fine until a browser changes its mind.

**Not done:** `button-006` keeps its own token block and its own `0.75em 1em`. It is a licensed
component whose clip-path text swap depends on that geometry, and it is internally consistent.

---

## 2026-07-29 — Ten type steps, in rem

**Decision:** every font size in the app comes from one of ten `--fs-*` tokens declared in
`global.css`, in `rem`. No px font-size anywhere in `src/`, and no helper that can mint one.

**What it replaced:** 244 declarations across 24 sizes and — counting size, weight, case and
tracking together — **93 distinct type styles**. Seven of the sizes sat half a pixel from a
neighbour: 7.5, 8.5, 9.5, 10.5, 11.5, 12.5, 13.5. A reader cannot tell 12.5 from 13, which means
the difference was never a level in a hierarchy; it was a decision somebody made once, in one
component, that nobody could repeat on purpose. The cost was paid on every new element: what size
is this? — a question with 24 defensible answers.

| token | px | absorbed |
|---|---|---|
| `--fs-display` | 44 | 44 |
| `--fs-statement` | 32 | 34, 32 |
| `--fs-title` | 24 | 26, 24 |
| `--fs-subtitle` | 20 | 22, 20, 19 |
| `--fs-lead` | 15 | 16, 15 |
| `--fs-body` | 13 | 14, 13.5, 13 |
| `--fs-detail` | 12 | 12.5, 12, 11.5 |
| `--fs-label` | 10 | 11, 10.5, 10 |
| `--fs-micro` | 9 | 9.5, 9 |
| `--fs-nano` | 8 | 8.5, 8, 7.5 |

**Named for the job, not the number,** so the name survives the number changing — which is the
whole point of the next paragraph.

**Why rem and not px.** Two reasons, and the first is the one that matters. A px type scale
silently overrides a reader who has raised their browser's base size, which is the most common
accessibility failure in a type system that otherwise looks careful. Second: it makes fluid
scaling a one-line change. Point `:root`'s `font-size` at a viewport-derived value and all ten
steps follow, with no second migration through 244 call sites. The Osmo scaling system (July 2026)
is written against `body`; for a rem scale it has to sit on `:root` instead, because that is what
`rem` resolves against — that deviation is deliberate, not an oversight.

**Two things fell out of the sweep.** `monoLabel(px, …)` took a number and was the last place that
could invent a size — 8.5 got in through it and nowhere else; it now takes a scale step. And the
contrast checker's large-text sample was set at **23px**, one pixel short of the 18pt/24px that
WCAG actually defines as large text, while the panel around it switched to the 3:1 large-text
threshold. It demonstrated a standard it did not meet. It is `--fs-title` now, which is 24.

**Still open:** tracking. There are six `--track-*` tokens and, beside them, raw values at .01,
.02, .05, .06, .08, .09, .1 and .12em. Same class of problem, half the size, not done here — doing
both in one pass would have made the diff unverifiable.

---

## 2026-07-26 — The site footer, and what it costs the 404

**Decision:** a shared footer — the Atmos Gallery wordmark at full page width between two hairlines,
over a left/centre/right meta row — closes `/privacy`, `/terms` and `404.html`. Not the front
page: that is the app, and it carries its own chrome. It is `.site-foot` in `public/legal.css`, from a
design comp supplied as a 1728×418 frame in light and dark.

**The wordmark is artwork, not set type.** It is `atmos-gallery-wordmark-tight.svg` used as a CSS
mask, inked from `--on-surface` exactly as `.mark` and `.nf-mark` already are, so one file serves both
themes and there is no second copy to drift. Set as *type* it would have needed the webfont to load
and a `fit-width.js` pass to fill the measure, and would still have been at the mercy of both; as
artwork it is flush at every width by construction. The asset is a new crop rather than the shipping
`-white` wordmark because that file's viewBox carries 27 units of empty space above the ascenders —
enough to hang the mark ~3% of its own width low and make the gaps above and below it a function of
the viewport instead of a token.

**Two departures from the comp, both toward the system.** They will read as bugs to anyone diffing
against the PDFs, so: the side inset is `--page-gutter` (22px) and not the comp's measured 24px,
because these are content-width rules whose ends have to land on the same vertical line as the prose
above them — 2px at this width is invisible, a left edge that misses the one above it is not. And the
hairlines are `--line-strong`, not the comp's ink, which is ~100% in light and ~40% in dark; no single
token expresses that asymmetry, colours were flagged as not final, and `--line-strong` is the rule
`.legal-head`, `.legal-hero::after` and `h2::before` already draw. Everything else matches the comp
within ~1px, measured subpixel off the rendered PDFs.

**The 404 no longer holds everything in one viewport.** It used to be pinned to exactly `100vh` with
`overflow:hidden` on `html` and `body` — "the viewport is the page" was the first of the three rules at
the top of `notfound.css`. A full-bleed wordmark cannot share one screen with a full-bleed 404: the
footer's height is a function of viewport *width*, so it grew as the page widened, and the numeral had
to shrink to pay for it. Tried in that order and both were worse than this:

1. *Footer inside the viewport.* `--nf-reserve` had to carry the footer's width-dependent height, so it
   stopped being a length and became `calc(175px + var(--nf-foot-height))` with the wordmark's aspect
   ratio as a live term. The numeral dropped to ~60% of full width, and on a landscape phone (844×390)
   the reserve exceeded `100vh` outright — `max-width` clamped to `0`, which is exactly the case
   `fit-width.js` returns early on, so the heading kept a stale font size, overflowed, and was clipped
   off the top of a page that could not be scrolled, with the button underneath the footer.
2. *Footer inside the viewport, minus its wordmark on short windows.* Two more media queries, and the
   404 still paid for the rest.
3. **The page scrolls and the footer sits past the fold.** `.nf` is one screen less the mark's band, so
   the fold falls on the footer's top rule. The numeral is back to full width at every size.

That third form is not a tweak of the first two, it deletes them: `--nf-reserve` is a flat sum of the
mark, `.nf`'s padding and the button again, and three width- and height-dependent overrides are gone,
along with the `6.4633` aspect-ratio term that had to be kept in step with `.site-foot__mark` by hand.
Whole classes of arithmetic bug went with them. **What replaces that vigilance:** the canvas is
`position:fixed` and `placement()` measures the heading in *viewport* coordinates, so `main.js` now
re-places the field on scroll — without it the cloud stays parked mid-screen while the type slides out
from under it. And both `100vh` figures are followed by a `100svh` copy, because on iOS `vh` is the
toolbars-collapsed viewport and would push the button behind the toolbar; `svh` and not `dvh`, which
would re-fit the type mid-scroll.

**Why the CVR line stayed behind:** `.legal-foot` still closes both legal articles, reduced to the
controller-identity line alone. Its nav duplicated the new footer and went; the identity did not,
because it is the E-Commerce Directive Art. 5 trader identification and the comp has no slot for a CVR
number. On `/terms` it now restates what *Who you are dealing with* says a few lines above — mild
redundancy, kept on purpose rather than trimmed by a footer change.

---

## 2026-07-28 — Roles you choose, a step in which to choose them, and a screen that leads with use

**Context:** round two of the July 2026 UX audit, its §2. The interactive **context preview** stayed
out of scope; roles are built as the backbone it will plug into later.

**The hole, in the interface's own words.** The Export dialog has been offering a *Semantic scaffold*
toggle labelled *"role-mapped starting layer to refine, not a finished system"* — telling people to
refine, with nowhere to do it. Behind that toggle `semanticRoles()` had been guessing roles by
lightness and chroma since it was written, and the user had never seen the guess, let alone
corrected it.

**The role vocabulary changed, and semantic exports changed with it.** Out went
`surface / surface-raised / on-surface / on-surface-muted / accent`; in came the audit's
**Background, Surface, Primary, Secondary, Accent, Text**. The old set was this app's *own CSS token
names* leaking into somebody else's design system. **Tokens exported before this deploy do not match
tokens exported after it** — accepted deliberately, and the reason to think hard before renaming any
of them again. The five builders needed no changes at all: `doExport` is a single branch point and
they all consume a uniform `entries` array.

**Two heuristic bugs fixed on the way past, both of which had always been wrong:**

- **Orientation.** Background always took the *lightest* swatch. For a dark palette that is exactly
  backwards, and this tool reads a great many dark photographs. The area-weighted mean lightness now
  decides which end is the ground, so a palette is "dark" when most of its surface is dark rather
  than when it merely contains something dark.
- **Collisions.** Taking "second most chromatic" for Secondary handed it the same swatch as Accent
  on any palette of greys plus one loud colour — the commonest shape this tool produces, and
  precisely the palette where two identical roles are most useless. Roles are assigned greedily now,
  structural ones first, preferring distinct swatches; with six roles over five swatches one
  doubling is arithmetic, not a bug. Surface is *scored* rather than filtered — near the ground,
  quiet in chroma, chroma weighted double — because a threshold alone kept handing the dark palette
  its accent colour as the raised surface.

**Refinement is non-destructive, and the shape of that is the load-bearing decision.** `swatches`
stays the **working set** and the extraction moves aside into `sourceSwatches` on the first edit
only. That is what lets all six surfaces which draw a palette — result bands, list strip, universe
card, reel band, facet exemplar, gradient stops, every one of them through `swatchGrow` — follow a
refinement with **no changes whatsoever**. The inverse (keeping the original in `swatches` and the
edit alongside) would have required an accessor at every one of those call sites.

Two reversals, deliberately different things: **Undo** is in-session, multi-step, held on the
instance and dropped on close, so it costs nothing in schema; **Reset** is persisted and single, and
returns to the extraction. The archive's own undo is one slot with a 6.5s fuse, which is right for a
deletion and useless for a sequence of edits.

**Three silent failures had to be fixed before any of it could work.** Each was invisible, and each
would have shipped undetected:

1. **`validateFeed` hard allow-lists.** It rebuilds every palette from a named list of keys. A roles
   map would have survived in memory and in the localStorage write, then vanished on the next
   reload, on every cross-tab sync, and on every backup restore — with no error anywhere. Verified
   by round-tripping a hand-built file: invalid role ids and out-of-range indices are rejected, the
   rest survives.
2. **Bands were keyed by array index**, and so were the copy-confirmation flags. The moment a swatch
   can move, React reuses the wrong node and a "✓ Copied" lands on a colour nobody clicked. Swatches
   carry a `sid` now, minted at creation and re-minted wholesale if any is missing or duplicated.
3. **Nothing animated an in-place edit.** `componentDidUpdate` returned early unless the stage or the
   palette *id* changed, so every motion primitive in the repo sat unreachable behind that guard.
   `bandRev` is the signal, and it bumps only for **structural** changes — running a FLIP per slider
   tick would be pointless and visibly awful.

**Two dead per-swatch selection paths went in the same commit.** `overlaySelect` had no call site in
the view, so its "Current" tag and selected ring were unreachable UI pretending to be a feature; and
`selectSwatch` wrote state nothing read. Leaving them next to a real selection model is how the next
person wires the wrong one.

**The result view leads with use, and the reading is demoted rather than deleted.** `composeUse`
sits beside `composeRationale` in `reading.js` and reads the same analysis, so a palette cannot be
described one way and recommended another. It takes no seed: a recommendation that varied between
two identical palettes would be advice nobody could trust. Two traits show, then **More** reveals
the rest along with the poetic reading — **a net reduction in standing copy**, which is the whole
condition under which this was worth doing. Beside it, the strongest contrast pair, drawn in its own
colours so the claim can be checked rather than believed; ordered by luminance, because the ratio is
symmetric and the drawer's own `best` had been recording whichever member it reached first as the
foreground — harmless while it tinted a sample, wrong the moment it is stated as advice.

**The first Refine surface was rejected, and the notes are the useful part.** It worked and it was
flat: a modal that faded in as one rectangle, three default range inputs, a static ring for
selection. Four separate failures, worth naming because each has a general form.

- **Direct manipulation is immediate; indirect change is eased.** Dragging a slider is 1:1 with the
  pointer, always. Switching *which* swatch the sliders point at is the interface acting on the
  user's behalf, and that now tweens on `EASE.standard`. A range input's thumb position *is* its
  value, so motion means tweening a proxy and writing `input.value` per frame — safe while no state
  changes, landing exactly on the value React holds. The start value has to be written
  **synchronously** first: React has already re-rendered the input with the destination by the time
  a `setState` callback runs, so without it the thumb lands and *then* slides away from where it
  landed. Same shape as the toggletip's `requestAnimationFrame` flash, one round earlier.
- **A native control arrives with a radius.** Every painted part of the slider is repainted with an
  explicit `border-radius:0`, because a reset cannot reach the UA sheet's pseudo-element rules. The
  thumb is a bar over a spectrum rather than a knob on a wire.
- **A track can show its own axis.** Lightness draws that colour's ramp, chroma its drain to grey,
  hue the circle at a legible lightness — sampled through `gamutMap`, so the track never shows a
  colour the thumb cannot reach. The hue track is deliberately *not* drawn at the swatch's true
  lightness: on a dark colour that is a hue wheel with no hue in it.
- **Selection is carried by movement.** The travelling marker is the project chips' pill on the same
  `cubic-bezier(.625,.05,0,1)`; the swatch itself gets no static ring, because that would state the
  same fact twice and one of the two would eventually drift.

The surface also **assembles in the order it is read** — bands wipe up in stagger, roles cascade,
axes draw last — rather than fading in as a block.

**Two things came straight back out**, and both were rules already written down. A standing line
reading *"Changes are saved as you make them"* — the affordance-over-copy rule from the previous
round, broken in the round that follows it. And a **Strongest pair** readout on the result view: a
third element competing for one eye-line with no hierarchy between them, when pairwise contrast
already has a surface built for exactly that question, one button away, with every pair and an
AA/AAA lens. A number floated beside a recommendation is not an act, and only acts earn a slot.

**Deferred, with reasons rather than by omission.** **Lock** protects a swatch against a regeneration
that does not exist yet; shipping it now is inert UI, and it should arrive with the re-roll it
protects. **Roles do not travel in a share link** — `encodeShare` carries four fields and its decoder
validates untrusted input, so a recipient gets the refined colours and derived roles.

---

## 2026-07-28 — Back up and Restore, and the four things the tool never said out loud

**Context:** the first round of the July 2026 UX audit, its §1 (*Product model and persistence*, P0).
Scoped to that section alone; the audit's interactive **context preview** is a larger build and was
explicitly held back, along with the rest of §2–§5.

**The finding, restated in this repo's terms:** the persistence layer was already careful — versioned
schema, validation, cross-tab merge, quota degradation, delete with undo, an import that dedupes by
id and cannot clobber. What was missing was not safety. It was *disclosure*. Every one of those
properties was invisible from inside the tool, and the two controls that let someone protect their
work were called **Save file** and **Open file** — names that describe a file dialog rather than a
consequence.

**Five changes, all of them saying something that was already true:**

1. **The archive is the Library**, on screen and in one place. The word had to mean something before
   *Back up whole library* could.
2. **Save file / Open file → Back up / Restore.** *Save* was the worst available word here: a palette
   is saved the instant it is generated, a share link saves nothing, and Export writes tokens.
   *Export / Import project* was the audit's other suggestion and lost for a narrower reason — the
   palette screen already spends *Export* on token export, and one word cannot carry two file
   formats.
3. **A 16px marker beside the heading**, not a sentence — see the section below, which is the more
   important half of this entry. Not a nudge, not a threshold toast, and deliberately **no sixth
   localStorage key** to remember whether it has been seen: a dismissible reminder would have cost
   the privacy copy an amendment to buy an interruption.
4. **A share link says it is not a backup.** `copy()` only swaps the button label and writes to the
   live region, so a sentence handed to it is heard and never seen — the confirmation stays there
   and the *distinction* goes through `showNotice`, which is visible. Two facts, two channels.
5. **`Name from` in the result view's Reading group.** Naming is the one step that can leave the
   device, and the only disclosure lived on `/privacy`, linked from a footer that renders on the
   dropzone screen alone. So on the screen where a palette is actually named, the tool said nothing.
   Four values, and the first two are why this is not simply `fallback`: a shared palette was named
   on someone else's machine and the eight bundled examples ship with authored names, and **both
   validate to `fallback: false`** — either would have claimed a live reading that never happened.

**Restore states what it will do, and Replace is not offered.** The merge was always non-destructive,
but "it never clobbers" is a promise nobody could verify from a toast that had already fired. The
counts *are* the verification, so `mergeProjectFile` split into read / preview / commit with a
dialog between. **The validated payload is parked on the instance and is never re-derived on
confirm** — `validateProjects` and `validateFeed` *mint* an id for any entry arriving without one,
so a second pass produces different objects and the "5 new" the user agreed to would describe a set
that never lands. The audit asks for Replace, Merge and Cancel; this ships two. Merge **is** the
restore semantic — it returns what was lost and leaves what has been made since. Replace exists only
to *remove* things added after the backup: destructive, with no undo path at library scale, and no
stated need. If it is ever wanted, it needs its own backup-before-replace step, not a third button.

**What did not move, and must not:** the `palette-generator/*` keys and the
`palette-generator/project-file` schema string. The buttons that write and read those files changed
name; the string inside the file did not, and neither did the filenames already on people's disks.
A file is identified by what is in it — `_readProjectFile` matches on `schema` alone and the input
takes any `.json` — so an old `palettes_archive_*.json` still restores. Filenames *did* move to
`atmos_library_backup_*` / `atmos_project_*`, which is free precisely because nothing reads them.

**Show intro again left the file menu.** It was never a file action, and under a button called
*Back up* it would read as one. It was also a second door: the brand mark carries
`aria-label="Atmos Gallery — return to the start screen"` and calls the same `returnToIntro()` on
every screen that menu appeared on. Deleted rather than relocated, on the same reasoning that
already removed the third clear-all.

**The general rule this round established, which outlives it: facts go in affordances, copy arrives
on demand.** Item 3 shipped first as a standing line beside the heading — *Saved in this browser.
Clearing browser data deletes it.* Accurate, and rejected on sight: a permanent two-sentence
explanation next to a one-word heading is read once and then merely occupies the page. In the
user's words, *"we need to have UI elements to compliment best practice UX to avoid this. Otherwise
the site gets cluttered in copy"* — and they had already solved it once, in the filter header.

So the line became **the same 16px ⓘ toggletip the AA-pairs column already uses**: bordered button,
`aria-expanded`, Escape on a local key handler, a `role="note"` panel behind a fixed click-catcher.
Not a similar one — the same one, down to the computed box, so there is one "explain this"
mechanism in the app rather than two to learn. Three things make it work without the sentence:

- **The subject lives in the button's `aria-label`** (*"Where your palettes are stored"*), so the
  fact is available to assistive tech without opening anything. What was removed is the visible
  sentence, not the information.
- **One element carries two states.** When the storage probe fails the marker becomes `!`, the
  accessible name becomes *"This browser is not saving your palettes"*, and the panel says what to
  do — rather than a second standing line existing for a case almost nobody hits. Glyph and name
  both carry it; never colour alone.
- **Transient copy is a different thing and stays.** The notice after copying a share link fires on
  a deliberate act and dismisses itself. The target is *permanent* prose, not all prose. Dialogs
  may carry sentences; that is what a dialog is for.

Apply this to the remaining audit rounds before adding any explanatory line: find the element that
can carry the fact first.

**And the second standing rule, from the same review: no surface appears, every surface arrives.**
The toggletip shipped with an instant reveal, which in an interface where everything else eases
does not read as fast — it reads as a rendering fault. Both tips now run `_tipIn` / `_tipOut`
(persistence.js) off the same `DUR` / `EASE` tokens as everything else, scaled to their weight: a
dialog is an event and travels 12px with scale, a toggletip is a disclosure and travels 6px with
none, `DUR.state` in and `DUR.micro` out, moving away from the marker that opened it. Three things
this surfaced that will be true of the next one too:

- **The exit has to outlive the state change.** React unmounts the panel the instant the flag
  flips, leaving nothing to tween — so `closeTip` runs the out-tween first and flips the flag in
  its callback, with a `_tipClosing` guard so a second click mid-exit cannot fire it twice.
- **Do not defer an entrance to `requestAnimationFrame` unless it measures layout.** It was written
  that way first, copying the dialogs, and it flashed: one frame painted at full opacity before the
  tween began. The DOM is already committed inside a `setState` callback, and `gsap.from()` sets
  its start values there and then. The dialogs defer because their transition genuinely needs
  layout. This one does not, and the difference is visible.
- **The floor is not optional and is not free.** `_tipOut` calls its callback synchronously when
  reduced motion or no GSAP, or the panel would never close at all for the people most likely to
  need it to. Verified by removing `window.gsap` at runtime: instant in, instant out, nothing
  stuck.

The tip copy went 11px → 12.5px in the same pass, both tips together. 11px was legible and not
scannable, and explanation nobody can skim is explanation nobody reads.

**The Library heading, and the two rows under it.** The heading is 24px and holds the view switcher
at the far end of its own row. Scope, Manage and Filter went *onto the sort row* — the same line as
AA PAIRS, MAX CONTRAST and DATE, bottom-aligned with them (`align-items:end`), so what narrows the
list and what orders it read as one bank of list controls instead of two stacked strips. They are
left-aligned with the heading, not with the columns: measured, chips and heading both on 16px, the
chips' bottom edge and AA PAIRS' both on 718px, and the switcher's right edge on 1227px with the
rows'.

Three things that had to be true to do it, all of them easy to get wrong later:

- **The negative margin is load-bearing.** That grid is inset by `--row-inset` so its columns line
  up with the rows beneath; the scope bar has to start on the *section's* edge instead. Pulling
  back by `calc(-1 * var(--row-inset))` is the only way to have both, and it stays correct if the
  token moves. A hardcoded `-16px` would not.
- **The sort row is list-only** (`showSortHeader`), and scope and filter must survive in Grid and
  3D. So the cluster is defined once as `scopeBar` and mounted in one of two places. Two copies of
  that markup would agree exactly until the first person edited one.
- **The group's accessible name moved off "Sort palettes"** — it no longer contains only sort
  controls. It is `Library controls`, with `Projects` nested inside and each sort button keeping
  its own full label, so nothing got quieter. Verified in the accessibility tree, not assumed.

**Tooltip copy takes no dashes.** The WCAG panel held its definition between two em dashes; a
parenthetical suspended that way is a sentence the eye has to reassemble, and the panel exists to
be skimmed. Two clauses and two full stops instead, and the same done to the storage tip's warning
line. Note this is *tooltip* copy — the em dash is still the app's characteristic punctuation in
notices and titles, so this is a local rule until somebody decides otherwise.

**The badge legend came out** of that panel (`✓ flexible · ◐ limited · ✕ none`) rather than being
rewritten. The accessibility work in a later stage will settle what that badge says, and an
explanation that outlives the thing it explains is worse than no explanation.

**One thing found by looking, worth keeping:** the archive menu item carried
`text-transform: capitalize`, which nobody noticed while its subtitle read *Every project + Unfiled*
— capitalize has nothing to do to a plus sign. Rewriting it as *and* produced "Every Project And
Unfiled". The rule went, rather than the word.

**Measured:** `main-*.js` 147.32 → 148.42 kB gzipped (+1.1 kB for the dialog), no new chunk, three
still beside it. Note for whoever reads the three.js entry below: its figure was already stale at
147.32 kB before this change, and is not a regression from it. It has since been corrected to ~160 kB
(measured 159.5 kB after the palette action row), and the number in that entry is a floor to check a
build against rather than a budget — it has only ever gone up, one feature at a time.

**Corrections to the audit itself,** recorded so the next round does not rebuild them: deletion undo
exists (6.5 s, palettes and projects, and deleting a project refiles its palettes rather than
destroying them); there is no *Text-ready* label anywhere — the palette verdict is Flexible /
Limited / None over a pair count; and pair-specific contrast is built, as a full AA/AAA × normal/large
matrix in the contrast drawer. Whether that matrix belongs on the result view is a §2 question.

---

## 2026-07-25 — No analytics or tracking scripts

**Decision:** Atmos Studio ships with no analytics package, no tracking script, and no tracking
cookies. See [#6](https://github.com/kaustudio/atmos.studio/pull/6), closed deliberately.

**Why:** the privacy statement makes a verifiable *"no analytics, no tracking"* claim, and shared
links are intentionally untrackable — palette data lives in the URL fragment, which browsers never
send to a server. A third-party analytics script would trade both for page-view counts we don't
need. Arrival data is already available from standard Vercel access logs, which the privacy
statement discloses.

**If this changes:** it is a copy change, not just a config change. `README.md` → *Privacy* →
*"No accounts, no analytics, no tracking, no ads"* becomes false the moment a script ships, and
accuracy note #4 in the same section says so. Behavioural data, if ever wanted, is a deliberate and
disclosed decision — not a default arriving through an integration.

**Also required to make it stick:** Web Analytics must be disabled in the Vercel project itself
(Vercel → project → Analytics). Closing the pull request without that invites the integration to
open it again.

---

## 2026-07-25 — Analytics: reversed

**Decision:** Vercel Web Analytics (page views only) is enabled. **Supersedes the entry above and
[#6](https://github.com/kaustudio/atmos.studio/pull/6)** — which is left in place deliberately, so
the record reads as a reversal rather than as if the first decision never happened.

**Rationale:** visit counts are wanted; the provider is cookieless and aggregated; and the privacy
statement was updated in the same pull request rather than a later one.

**What did not change:** no accounts, no cross-site tracking, no behavioural events, and nothing
about images, palettes or the archive ever leaving the browser.

**Explicitly still unmade:** custom/behavioural events. `track()` is not called anywhere, and the
privacy statement now promises the analytics "doesn't see anything you do inside the tool" — one
custom event makes that false. Instrumenting generation, export or any in-app action is a separate
decision with its own copy implications, and the mount in `AppView.jsx` carries a comment saying so.

---

## 2026-07-26 — Speed Insights, and the disclosure that should have shipped with it

**Decision:** `@vercel/speed-insights` is enabled alongside Web Analytics, mounted next to
`<Analytics />` on both of `AppView`'s return paths. It reports Core Web Vitals only.

**Rationale:** the app is animation-heavy and its slowness is invisible from the inside — a local
machine on a fast connection never reproduces what a visitor experiences. Web Vitals are the cheapest
honest answer. Like Web Analytics the provider is cookieless, and no behavioural events are involved.

**How this entry came about, recorded deliberately:** the package was installed and mounted *first*,
and the privacy statement was not updated in the same change. The rule one entry above — that a new
script "is a copy change, not just a config change" — was written precisely to stop that, and it
still did not stop it. The disclosure was added a day later, only after being raised three times.

**The lesson, which is the reason this paragraph exists:** the rule was not weak, the *sequencing*
was. An integration arrives as a one-line import, and the copy obligation attached to it is invisible
at that moment. So: for any future third-party script, the privacy copy goes in the same commit as
the import, and the commit does not land without it.

**Also changed in the same pass:** the privacy statement gained the GDPR Article 13 disclosures it
had never carried — controller identity, legal basis (legitimate interests), processor and
international transfer, retention, data-subject rights, children. Previously it was accurate and
readable but formally incomplete.

**Still unverified, and worth pinning down:** Vercel's actual retention periods for access logs and
aggregated analytics. `src/legal/privacy.html` deliberately describes retention as Vercel's own schedule
rather than naming a number nobody had checked. If a figure is ever wanted there, it needs to come
from Vercel's DPA, not from memory.

**Still deliberately absent:** a cookie banner. The site sets zero cookies — verified, not assumed —
so there is nothing non-essential to consent to, and a banner would both contradict the "no cookies
at all" claim and cost layout stability on the very metric Speed Insights now measures. This flips
the moment any non-essential third party ships.

---

## 2026-07-26 — three.js, never in an entry chunk

*(Superseded in part by the orb-field entry below: three is no longer used by only one page. The
rule it exists to protect — three never lands in a chunk the browser blocks first paint on — is
unchanged, and now applies in two places instead of one.)*

**Decision:** `three` is a dependency of exactly two things: `404.html`, where the 404 is rasterised
from Neue Montreal and rebuilt as a cursor-reactive particle cloud (`src/notfound/particleField.js`,
adapted from `@canvas-ui/particle-object`), and the landing's orb field (`src/app/orbField.js`).

**Why it doesn't cost either page anything:** `404.html` is the build's second entry, and the
landing reaches `orbField.js` only through a dynamic `import()`, so three is a shared chunk
(`three.module-*.js`, ~130 kB gzipped) that neither entry blocks on. `npm run build` should print
`main-*.js` at roughly 160 kB gzipped with `three.module-*.js` and `orbField-*.js` beside it, not
inside it. A static import of `orbField.js` from `orbit.js` puts three straight into `main-*.js` and
doubles the landing's payload to ~272 kB gzipped — it was written that way first, and measured.
Re-check after touching `vite.config.ts` or that import.

**What was cut rather than shipped dead:** the component arrives able to load GLB/glTF (with Draco),
sample triangle meshes, sniff asset bytes and orbit the camera. None of that is reachable when the
subject is a line of type, and GLTFLoader + DRACOLoader + OrbitControls are most of what three would
otherwise weigh. They are absent from `particleField.js`, and the header there says so — so the next
person doesn't "restore" them looking for parity with the upstream component. The physics constants
*are* verbatim upstream: that part is the effect.

**Also deliberate:** no `@types/three`. Nothing in `src/notfound` is TypeScript, `tsconfig.json` has
`checkJs: false`, and `npm run build` doesn't run `tsc` — so the types would be a devDependency that
never types anything.

**Why the page is a Vite entry and not another static file in `/public`:** privacy and terms are
static because they need nothing from the build; this one has a bundled dependency, and a file in
`/public` can't import from `node_modules`. Being a build entry is also what puts it at
`dist/404.html`, which is the filename Vercel serves for any path with no file behind it.

**Verified, not assumed:** `curl` against the live deployment returned `404` + `x-vercel-error:
NOT_FOUND` for a nonsense path — i.e. there is no SPA catch-all rewrite in front of it, so
`dist/404.html` will be what answers, with the status intact. If a rewrite is ever added for the app
(e.g. real routes instead of the URL fragment), it must not be a blanket `/(.*) → /`, or this page
stops being reachable. Note that `npm run preview` *does* fall back to `index.html`, so it cannot be
used to check this — only a deployment can.

**The 404 is fitted to the page, and the page is exactly one viewport.** `public/fit-width.js` is Osmo
Supply's *Fit Text to Width*, kept as delivered like `legal-toc.js` before it, and it — not this
repo's CSS — sets the font-size that makes the 404 span its container. Consequences, all load-bearing:

- **Nothing scrolls.** `html,body{height:100vh;overflow:hidden}`, and `.nf` carries `min-height:0` so
  the type is what gives on a short window rather than the footer being pushed off the bottom.
- **Because nothing scrolls, width alone is not a safe fit.** Type fitted only to width overflows the
  *height* on a short, wide window, and with no scrollbar that overflow is simply cut off. So
  `.nf-type` also caps its width at the height that is actually free — `--nf-reserve` (everything that
  is not the 404) turned back into a width by `--nf-fit-ratio`. On an ordinary window the cap doesn't
  bind and the 404 fills the width edge to edge; measured at 1440×900 it lands on 1408px, the full
  width between the gutters. `main.js` sets the ratio from the rasterised glyphs; the CSS fallback is
  the same figure, so the guard holds with no JS. Verified: measured 2.3502 against a 2.35 fallback.
- **`line-height:.74` on the heading is not styling.** At ~800px the default leading parks ~170px of
  empty line box under the digits, and on a page that cannot scroll that space comes straight out of
  how wide the 404 may be. Tightening it to the digits' own height is what lets the type fill the
  width at all.
- **The particle canvas is `position:fixed; inset:0`** — a layer over the whole viewport, not a box
  around the heading. The push field throws particles well past the glyphs, and any box drawn around
  them is a box they visibly get clipped against, which is exactly the bug this replaced. It is
  `pointer-events:none` because it now covers the mark, the button and the footer links.

Because the canvas no longer wraps the heading, its resizing no longer implies the heading's:
`main.js` observes both, since the fit also re-runs after the webfont lands.

**The page carries no explanatory copy, deliberately.** There is no eyebrow and no lead paragraph:
the 404 is the whole message, and the page is a full-height column — mark at the top, footer at the
bottom, the type taking everything between. Two things follow from that, and both are easy to undo by
accident:

- The one action is the landing's **Get Started** button, restated figure for figure from `glassCta`
  in `renderVals.js`: 36px tall, 0/16px, Neue Montreal 500 at 14px on `--track-title`, sentence case,
  squared, and a 7% *glass* fill with an 18px backdrop blur behind a 15% edge — not an inverted fill
  and not uppercase. The two easing curves are written out because `global.css` isn't loaded here, so
  retuning `--ease-button-hover` or `--ease-standard` there leaves this page stale. The glass pays for
  itself on this page in particular: the button sits above the particle layer, so the blur takes the
  cloud drifting behind it, exactly as the landing's does with the orb ring.
- The 24px above it is measured to the glyphs, and getting there needed `line-height:0` on `.nf-type`.
  The heading is an inline-block, so it sits on a line box whose strut — inherited `line-height:1.6`
  from legal.css — parked ~8px of nothing under the digits and made 24px read as 32.
- `<p class="nf-said">` is the copy that remains, hidden but spoken — without it a screen reader
  announces this page as the bare number "404". It sits outside the `<h1>` because `main.js`
  rasterises that element's text, and anything inside it would be spelled out by the particles. If
  visible copy ever returns, that line is what it replaces.

**It follows the app's grid, not the legal pages' measure** — full width, a 16px gutter, 40px/88px of
vertical room, and the brand mark centred at the top on the line `AppView.jsx` fixes it to (165 × 26
at 18.5px, the same on the landing and in the tool). Privacy and terms set themselves in a centred
60em column because they are documents meant to be read; this page is wayfinding, and it belongs to
the same full-bleed grid as the tool it hands you back to. So it is *not* a drift to be tidied up
into matching the legal routes. Two consequences worth knowing: the display type sits flush to the 16px
gutter (as the archive rows do), and `body{overflow-x:clip}` is load-bearing — the particle canvas
deliberately overhangs the type by more than the gutter, and a particle pushed off the page should
leave rather than open a scrollbar.

**Still left alone:** the mark on `/privacy` and `/terms` is left-aligned inside their centred
column, so the centred mark here matches the app and the landing but not those two.

**No analytics on it**, like privacy and terms: the two measurement tools mount inside the React app
(`AppView.jsx`), and the standalone pages have never carried a script tag for them. Adding one here
would come with the copy obligation the 2026-07-26 entry above sets out — the privacy statement
describes what runs "on the page" — so it is a decision, not a tidy-up.

**The fallback is the markup, not a copy of it:** the `<h1>404</h1>` in `404.html` is the real type at
the real size, and `src/notfound/main.js` only hides it (opacity, still in the layout and the
accessibility tree) once the font has loaded, WebGL has been granted, and motion is wanted. The
particle cloud is scaled and positioned from that element's own measurements, so the size lives in
`public/notfound.css` — clamped to a 5rem floor — and in no second place.

---

## 2026-07-26 — The landing's orbs are particles, and not from a package

**Decision:** the landing's orb ring is drawn by `src/app/orbField.js` — one WebGL 2 canvas holding
every orb as a cloud of cursor-reactive particles — instead of one renderer per orb. The formation
grew from 33 orbs on two rings to 122 on three, at roughly half the diameter.

**Why one canvas:** browsers cap live WebGL contexts at around sixteen per page and silently kill
the oldest past that, so `ORB_GL_MAX` had the shaded formation pinned at twelve orbs. Every orb
added beyond that fell back to the painted floor — the count could not grow without the formation
getting *less* shaded. That ceiling is a property of the per-orb architecture, not a number to tune,
and consolidating is the only way past it. It also turns the cursor into one pass over one buffer
rather than 33 isolated ones.

**What it cost, knowingly:** an orb is a dotted sphere now, not a solid one. The terminator, the
distance-graded key light, the specular, the fresnel rim and the per-ring depth gate all survive —
ported per-particle into `orbField.js`'s vertex shader, off the same one global lamp — but the
continuous surface between them does not. The MOTION CONTRACT in `initOrbit()` records this as a
written amendment to §2, §3 and §5 plus a new §6, which is where the reasoning lives; this entry
exists so the *tradeoff* isn't rediscovered as a bug.

**Why not `thinking-orbs`:** it was proposed, and it is a competent package — 2D canvas, six agent
states, reduced-motion handling, shared clock. It is also **strictly monochrome**, which is
disqualifying here for a reason that has nothing to do with quality: these orbs wear the reference
palettes, and hue travelling 46–150° inside a single orb is the thing the landing exists to
demonstrate (see `_orbitRefPalettes`). It has no cursor interaction, its two sizes are documented as
separate designs rather than a scale factor where ours solve continuously per viewport, and at
v0.1.1 with one maintainer it would be a supply-chain dependency bought to replace code the repo
already owns in `src/notfound/particleField.js`. Not a rejection of the package — a rejection of the
fit.

**The floors are unchanged and still load-bearing:** no WebGL 2, or reduced motion, and `_rings()`
answers with `_paintedRings` — the original 12-at-84 and 21-at-56 — because 122 painted orbs
carrying five shading layers each is not a floor, and the DOM stack was drawn around the two-ring
formation. The dense population is only ever offered where it can actually be drawn.

---

## 2026-07-26 — Greyscale orbs: tried, shipped, reversed

**Decision:** the orb ring is in colour, as the entry above describes. Greyscale was built and
shipped to `main` (`d1f9708`) and reverted the same day. This entry exists because "just make them
monochrome" is a reasonable-sounding suggestion that will be made again, and it should be made
against a record rather than from scratch.

**Why it was reverted, in the words that settled it:** greyscale doesn't serve the purpose when the
product is a tool that creates palettes. The landing's job is to show what the tool does, and a hero
with no colour in it argues against the thing it is introducing — the orbs wear the reference
palettes precisely so the formation demonstrates hue travel rather than merely decorating. That is
the same reason recorded above for not taking `thinking-orbs`, so it is now the reason twice over,
and **the withdrawal of that objection is itself withdrawn** — being strictly monochrome is once
again disqualifying for anything drawing these orbs.

**It looked fine, which is the trap.** The greyscale build was clean and verifiable — max R/G/B
spread of 0 across 232,581 sampled pixels, the lamp reading clearly, the depth rings still receding.
Nothing about it was broken. It failed on what the page is FOR, which no amount of looking at the
page in isolation would have caught. If it comes up again, that is the axis to argue on.

**What the attempt was worth keeping:** two things it surfaced are true independently of colour and
survive in the code.
- The palette ramp must be monotonic in whatever channel is carrying it. Under colour that is HUE,
  and the luminance jumps between adjacent swatches ride along underneath it. Desaturating removes
  that cover and tone becomes the only channel, so a hue-ordered ramp becomes speckle — which is why
  greyscale needed a luminance sort. Either way the rule is the same: sort by the channel doing the
  work, or adjacent particles land on unrelated swatches.
- The specular is warm and the fresnel rim cool *on purpose* (from `orb-shader.js`). Greyscale had
  to neutralise both, and that is what proved they are the last places hue survives in this shader.
  Anyone tuning them is tuning colour, not just brightness.

**Not kept:** `tonalRange`, the compression of the ramp toward each orb's mean. It existed because a
full-strength tonal ramp reads as a second, disagreeing light once hue is gone. In colour the ramp
reads as hue travel and wants its full spread, so it went back with the rest.

---

## 2026-07-27 — The quiet button tier is gone, and the control edge is 3:1

**Decision:** there are two action tiers, not three. Primary is filled; everything else unfilled is
`secondary` — same ink (`--on-surface`), same weight (500), same edge. The system's control edge is
`--action-line` at 50% ink, climbing to 62% on hover and 72% on press, and every interactive
boundary in the app takes those three: `button-006`'s own default, the emphasis variants, the
`[data-ix="solid"]` chrome buttons, the segmented-toggle containers, the pager, the text inputs, the
glass CTA on the landing. Static pills, badges and dividers keep the old 15% hairline.

**Why the tier went.** `utility` was muted ink (`--on-surface-muted`) at weight 400, used for the
copy actions, the theme switch and the file pair. It passed at rest — 5.55:1 in light — and failed
the moment you pointed at it. Its own hover tint darkened the ground under ink that stayed muted,
landing at **4.00:1 against the 4.5:1 that SC 1.4.3 asks of body text, and 3.33:1 on press.** A
control that is legible until you reach for it is not legible. Bringing the ink up to `--on-surface`
was the only fix, and full ink at weight 400 on the same edge is just a secondary button set
slightly wrong — so the tier went rather than got patched.

**Why the edge moved off 15%.** These buttons have no fill at rest, so the border is not decoration:
it is the only thing that says "control" rather than "label", which is what SC 1.4.11 measures at
3:1. The 15% baseline was **1.36:1 in light, 1.50:1 in dark**. 42% (the old `secondary`) was 2.61:1
in light — also short. 50% is the first step that clears 3:1 on both page surfaces in both themes
with margin. Measured from the live tokens after the change:

| | light (surface / raised) | dark (surface / raised) |
|---|---|---|
| edge, rest | 3.27 / 3.31 | 4.88 / 4.70 |
| edge, hover | 4.73 / 4.80 | 6.89 / 6.48 |
| edge, press | 6.59 / 6.74 | 8.92 / 8.26 |
| label, rest → hover → press | 15.94 → 11.49 → 9.60 | 16.57 → 10.61 → 8.04 |

Hover and press had to move too: at 38%/48% they sat *below* the new rest, so the edge would have
weakened under the pointer — the feedback inverted. `[data-ix="solid"]`'s `!important` border-colour
states were part of that same fix.

**What replaced the hierarchy the weight used to carry.** Position. Each action row divides on a
hairline by CONSEQUENCE — ahead of it the acts that leave something behind (Export, Add to project),
behind it the ones that only read the palette back to you (Contrast, Hex list, CSS variables, Share
link) — and the result view and the fullscreen detail footer now carry the same row in the same
order. Grouping costs no contrast to express; weight did.

**If "make the copy buttons quieter" comes up again:** it is a contrast change, not a visual one. The
numbers above are what it has to beat, and the muted-ink-on-hover-tint failure is what it will hit.
Quieter is available in *position* and *fill* — never in ink or weight.
