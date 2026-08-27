# Decisions

Short, dated records of choices that are easy to re-litigate — or to have re-proposed by a bot.
A decision that lives only in a closed pull request gets made again by the next person who
doesn't know it was ever made.

---

## 2026-08-27 — The arrival curve, measured off wrk-timepieces.com

The utility drawers' arrival was retuned against a named reference — the "Latest Innovations"
article list on wrk-timepieces.com — rather than against an argument. The numbers below were read
off the running site by observing GSAP's own inline style writes with a MutationObserver, not
estimated from video.

**What the reference actually does:**

| element | property | from | duration | ease | beat |
| --- | --- | --- | --- | --- | --- |
| `.title` | y | +55px → 0 | 1000ms | expo.out | — |
| column headers | y | −50px → 0 | 1000ms | expo.out | **80ms** |
| `.row` × 13 | opacity only | 0 → 1 | 1000ms | **power4.out** | **50ms** |

The fits are not approximate: power4.out matches the row opacity to within 0.005 across fifteen
samples, and expo.out matches the header translate to within 0.008. Worth noting that the reference's
header curve is `--ease-overlay` to within 0.036 — the curve this codebase already uses for objects
that travel is the same call the reference made.

**The surprising part is the pairing of a LONG duration with a TIGHT beat.** A full second per
element at a 50ms stagger sounds slow and is the opposite: on a front-loaded curve the element is
90% present in 440ms, and the remaining half-second of imperceptible tail is what lets a tight beat
keep nine elements live at once. That overlap — 50ms against a 440ms visible window, a ratio of
0.114 — is what reads as a continuous settle instead of a countable sequence. A short duration at
the same beat gives you a sequence; a long duration at a wide beat gives you a queue. Our previous
values (347ms items, 64ms beat, ratio 0.27) were the first of those.

**So `overlayItem` (50ms), `overlayBlock` (80ms) and `overlayArrive` (1.0s) are measured values
now, not derived ones.** They replace 64/128, which came from a ratio — "items read twice as quick
as blocks" — that was tidy and had no evidence behind it.

**The fade curve had to split by direction, which one shared token could not express.** A fade IN
wants front-loading, for the reason above. A fade OUT wants the opposite: front-load a dismissal and
it snaps, which is the exact fault `--ease-overlay-exit` was minted to fix on the panel a few hours
earlier — there is no sense fixing it on the panel and reintroducing it on the contents.
`--ease-overlay-fade-in` is a bezier fit to power4.out (max deviation 0.007);
`--ease-overlay-fade-out` is the sine-out, unchanged.

**One thing was NOT copied.** The reference translates its headers 50px on a masked reveal. This app
already has that mechanic and it belongs to copy alone (`_maskLineReveal`) — putting it back on the
boxes is what "the mask is still noticeable as a second animation" was about. Boxes fade, words
mask. The reference agrees on the important half: its thirteen list rows carry **no transform at
all**, pure opacity.

**Structural difference worth recording.** In the reference only ONE level animates — the container
sits at full strength and the rows fade, so a row's own curve is the only curve acting on it. Here a
block has furniture with no per-item hook, so it cannot simply not fade, and a cell's opacity
multiplies with its block's. The block's fade is therefore shortened to 0.55 of the arrival length:
effectively out of the way by 240ms, so the item's own full-length curve carries everything the
reader watches.

Measured after: 28 of 29 contrast items live simultaneously at peak (was ~5), seven harmony model
buttons at seven distinct opacities at every sample, perceived completion ~1.07s on harmony and
~1.4s on contrast against timeline totals of 1.68s and 1.96s. The reference's own span is 1.6s.

---

## 2026-08-27 — An exit is not an arrival played backwards

`--ease-overlay` is an expo-out, and it was running the exits as well as the entrances on the stated
reasoning that "an overlay is asked to LAND — velocity → 0 at the end, in and out". That is true of
an arrival and false of a dismissal, and running the curve forwards on something LEAVING inverts it
completely.

**Measured on the drawer panel: 240px of travel in the first 100ms, at 2631px/s — peak velocity on
the first frame, 5.3× the panel's own average.** There is no ramp at all; an expo-out's entire
character is spent in its opening. Then the tween ran another 600ms of its 1000ms moving a panel
that had already left the screen at 398ms. A snap, followed by a long slow nothing. It reads exactly
as it was built.

**`--ease-overlay-exit` is `cubic-bezier(0.37, 0, 0.63, 1)` — a symmetric in-out.** From rest, peak
in the middle, eased out. It was picked on numbers rather than feel: of the candidates, it has the
lowest peak velocity (1.6× its own average, against 5.3×) while still reading as motion rather than
as a constant slide. A pure accelerate — `--ease-exit`, the token that already exists — was the
obvious alternative and was rejected: its peak is at 100%, so the panel would be at maximum speed as
it left, which trades a snap at the start for one at the end.

| | before | after |
| --- | --- | --- |
| px in first 100ms | 240 | **0** |
| peak velocity | 2631px/s | **1300px/s** |
| peak at | frame one | **440ms, mid-travel** |
| total exit | 1221ms | **724ms** |

**`overlayOut` drops 1.0s → 0.62s, because the 1.0 only ever existed to pay for the tail.** The
token's own note said so: the panel was "most of the way gone early and the last of it settles out
slowly, which is what the extra length over the entrance is spent on". Remove the tail and the
length has nothing left to buy. 0.62s puts 86% of the tween on screen where 1.0s put 40% — more
visible dismissal in less time.

**The panel's hand-placed delay shrinks with it, 0.85 of the block spread down to 0.4.** That delay
existed only because the old curve gave the panel no ramp: anything animating underneath a panel
that left at full speed on frame one had to finish first or never be seen. The new curve ramps from
rest — 31px of 500 in its first 100ms — so the lead-in is now intrinsic, and keeping the old delay
on top would have stacked two of them and read as hesitation.

**One coupling worth recording, because a shared token made it easy to miss.** The block fade-out's
length was derived from `overlayOut`, so retuning the token silently cut the content cascade by 38%
and would have undone the legibility work from the day before. Its fractions are restated against
the shorter band (0.42 where they were 0.26) to hold the same absolute 0.26s block and 0.26s spread.

**`_dialogOut` and `closeExport` come along.** `motion.js` names `_drawerOut` and `_dialogOut`
together as one exit contract, and `closeExport` says in its own comment that it shares it — so
leaving either on the arrival curve would have made both claims false.

---

## 2026-08-26 — Momentum for things that travel, even rate for things that fade

Three complaints in a row about the utility drawers' arrival — too fast, indistinguishable from the
masked line reveal, and "very lacking" on the lists. One cause, one omission, and one conflict.

**Every arrival curve in the set was an expo-out, and opacity was never given one of its own.**
`--ease-overlay` reaches 90% of its value at 31% of its duration. So a 440ms block fade was
perceptually a **136ms pop with a 304ms invisible tail**, and the 128ms beat between blocks landed
*after* the block before it had finished: an overlap ratio of 0.94, which is a strobe, not a
cascade. The exit was worse — 260ms on that curve is 90% gone in 80ms. This is the third property
to need the correction: `--ease-fold` was minted for height and `--ease-button-click` for press on
exactly this argument, both of which are written down in `global.css`. Opacity was simply never
looked at. `--ease-overlay-fade` (sine-out, 50% at a third, 90% at two thirds) is the answer, and
the rule it encodes is the one the token set was missing.

**The panel and the masked line keep `--ease-overlay`, and that is the point.** Front-loading is
right for an object with momentum — a drawer sliding from its edge, a line rising into place. It is
wrong for a property that has none. One curve per behaviour, not one curve per surface.

**The blocks stopped translating.** A block carried `y: 10` on `--ease-overlay`; the masked line
inside it rises `yPercent: 110 → 0` on `--ease-overlay`. Same curve, same axis, same moment, one
nested in the other — two Y-translations composing in one box, which is why the mask stayed legible
as a *second* animation no matter how the timings were tuned. Boxes carry opacity, the mask carries
words, and now nothing else in the drawer moves in Y. Told apart by construction rather than by
tuning.

**A list without per-item hooks fades as a slab, and four of them had none.** "Text on each colour"
(five rows), the harmony models (seven), the contrast control groups (three) and the adoption
buttons (two) all switched on together inside a box that was itself switching on. The matrix had
hooks and read correctly, which is exactly what made the rest look unfinished beside it. Hooks are
markup, so this cannot be inferred — every block holding a list now declares its items. The beat is
`overlayItem`, **half `overlayBlock`** rather than a third free number: items read twice as quick as
the blocks holding them. It is capped against the block's own length, so five rows take the full
64ms and read as a sequence while twenty matrix cells compress to 15ms and read as a sweep.

**The hooks exposed a conflict that had never had a chance to bite.** `[data-ix]` — every button and
segmented control — declares `transition: … opacity var(--dur-chrome) …`. A GSAP opacity tween on
one of those is not animating the element, it is animating a target that CSS then eases toward over
280ms: the control lags its own tween by a quarter-second and never hits the value the stagger asked
for when it asked. It was invisible while the only hooked items were the matrix's plain divs, and
appeared the moment seven harmony buttons were hooked. The arrival now takes the property outright
(`transition: none` for the duration, restored by `clearProps`) and hands it back on landing. The
contract is untouched; it just does not get to run against an animation already animating the same
thing.

Measured after, on the contrast drawer: **three blocks mid-fade at every sample** through the
arrival (was one), five colour rows at five distinct opacities throughout their block, four blocks
mid-fade on the exit, and zero translate on any block. Panel 1.26s → 1.38s.

---

## 2026-08-26 — The utility overlays arrive block by block, and only their copy is masked

Two changes to one schedule (`_drawerIn` / `_drawerOut` in `src/app/methods/overlays.js`), covering
the contrast checker, the colour harmonies drawer, the filter drawer and the export dialog.

**The mask is for words now, and only for words.** Every box in these panels used to arrive through
the clip-path wipe the result stage uses on its bands, on the stated grounds that "opacity is
exposure" and a fade looks like a panel being developed rather than assembled. That argument is
still right about colour and wrong about boxes: these panels *also* mask their copy line by line,
so a block wiped up while the words inside it wiped up on their own clip — two reveals stacked in
the same place, and the box's was the one with nothing to uncover. The blocks now fade up with a
10px rise; `_maskLineReveal` is the surface's one piece of special handling and it belongs to copy.
The bands and the fullscreen detail still wipe, and should.

**Each block keeps its own clock.** The schedule was three flat tweens over three flat lists —
sections on one stagger, cells on another, rules on a third — every one of them timed against the
PANEL. So the contrast drawer's ten matrix cells began sweeping at a fixed 0.32 of the panel while
the two blocks above them were still arriving, and the 80ms beat between blocks against a 560ms
block reveal meant five of the six were always moving together. It read as one wipe with a lean, not
as a sequence. Now `at[i]` is a block's moment and its rows, its drawn rules and its masked lines all
hang off it: `overlayBlock` (128ms) between blocks against a 440ms block. **The total did not
change** — 1.26s then, 1.26s now. The length came out of each block's own reveal and went into the
gaps, which is the only way to buy a legible sequence without making the panel slower.

**And it leaves in the order it arrived.** The exit was the panel and nothing else: six blocks
introduced one at a time went as one slab, so the dismissal was a different gesture that happened to
share a curve. Blocks now fade out top to bottom on a step compressed to a fixed window, so the
sequence costs the same whatever the panel holds — the rule the panel's own tween has always obeyed,
applied to the contents.

**The panel waits ~0.22s before it moves, and that is not a delay.** On `EASE.overlay` the panel is
roughly half gone in the first tenth of its tween, so a cascade running underneath a panel that left
at t=0 plays correctly on a surface nobody can see. The blocks start fading on the frame of the
press — that is where a dismissal's promptness actually lives — and the panel follows a beat later,
which costs nothing because nothing is being read on the way out.

**One number that was hiding.** `_drawRules` ran at 0.7 of the band while the boxes around it ran at
0.55. Scheduled globally near the front that was invisible; hung off the *last* block it became the
whole panel's tail — the harmony drawer finished assembling at 1.26s and then spent 0.2s with
nothing moving except one hairline still creeping to its right-hand end. Rules take the block's own
length.

---

## 2026-08-26 — Refine is withdrawn, and filing takes the filled tier

The surface is not finished. It shipped a role editor, three OKLCH axes, reorder, remove, an
in-session undo and a persisted reset, and the parts never settled into one instrument — so it is
out of the build rather than left in front of people half-argued. `src/app/methods/refine.js`, the
`RefineDialog` view, its slice of `renderVals` and its CSS are gone; git holds them.

**The stored fields stay, and that is the point of doing it this way.** `sourceSwatches` and `roles`
are still validated, still read, still written back on every save. A palette somebody already
refined keeps its colours and its role map, and the semantic export still resolves the user's
assignments over the heuristic. Removing a surface must not become a data migration: the validator
destroys any field it does not name, so dropping them would have silently rewritten every refined
palette in every library on the next reload.

**The result row keeps exactly one filled control, and it is now Add to project.** Refine held the
first tier as the one creative act in the row; with it gone the row would have had no leader at all,
and a row of six equal outlines states no route. The fullscreen detail's footer already answered
this exact question — it has never had a Refine, and it gives the tier to filing on the grounds that
it is first in the sequence and available: organise, then validate, then output. The two rows now
agree, which was always the contract between them.

**What the export dialog says is unchanged.** "Refine before shipping" was never a pointer at a
button — the semantic layer is a role-mapped starting point either way, and saying so is more true
now, not less.

---

## 2026-08-01 — Refine is a fixed shell with one scrollport, and it leads with the palette's health

**Context:** the 01 August *Refine Swatch Modal* audit. It was written from a screenshot with no
build inspected, and says so — which is why the triage below matters as much as the work.

**The P0 was real, in a narrower form than stated.** The audit's headline is "wrong scroll
boundary… content is compressed to avoid page scroll". Half of that was already handled: the page
behind never moves (Lenis is stopped, the surface carries `data-lenis-prevent`, and
`overscroll-behavior:contain` blocks the chain), so SC-01 and SC-02 passed before any change. What
was genuinely broken is that the **whole dialog was the scroller** — `max-height` plus
`overflow-y:auto` — so the header and footer were inside the thing that scrolled. Measured: the
header left the top of the dialog by 111px on the way down, which takes Done, Undo and Reset out of
reach exactly when a long edit needs them.

Three grid rows now — `auto / minmax(0,1fr) / auto` — with the body as the only scrollport.
`min-height:0` is what makes that true: a `minmax(0,1fr)` row still refuses to shrink below its
content without it, and the body would push the footer off the shell instead of scrolling.

**The height is stated, not capped.** A `max-height` dialog is as tall as its content, so the same
surface was a different size for a 3-swatch palette than for a 6-swatch one, and whether it scrolled
at all depended on the palette. A fixed `min(860px, 100dvh - 48px)` means the instrument is the same
instrument every time. `max-width:100%` rather than `calc(100vw - 48px)`: the wrapper is `inset:0`
with 24px of padding, so 100% is already viewport−48 and cannot include the scrollbar the way `100vw`
does.

**Scroll affordance is a rule, not a shadow.** Content passes under a persistent header and footer,
so a heading half-cut by the header edge is a clipping bug until something draws the boundary. One
hairline per side, shown only while there is genuinely something hidden on that side — a rule that is
always on is a border, and a border says the region is closed rather than that it continues. Driven
by data attributes off a scroll measurement, so it never re-renders the dialog mid-scroll.

**Contrast leads with the palette, not with the pair in hand.** The card opened with the selected
pairing — a large ratio and an AAA badge — and put coverage in a muted line below, so a palette where
six of eight combinations fail presented itself at a glance as a success. Summary first, with the
failure count as a *control* (`Review 6 failures`) rather than a statistic, and the pairing demoted to
the live detail it is. The drill-in orders failures first and, within them, by ratio **descending**:
the pair closest to 4.5 is the one a small nudge fixes, so the cheapest win is at the top rather than
buried under the hopeless cases.

**Three sections, not one, and the role map moved out of the preview.** *Palette structure* held role
assignment, ordering and removal on the argument that all three are palette-level. True, and not the
useful grouping: assigning a role is a semantic decision, moving a swatch is a compositional one, and
removing it is destructive. One heading made them read as a single form to fill in, and put a
destructive control two rows under a pair of nudge buttons. They are **Usage**, **Palette order** and
**Danger zone** now.

The complete six-role legend went with Usage. It had been sitting under the live specimen as the
second-largest object in that column, competing with the thing it captioned — and most of it answered
a question about the *palette* (which colour holds which role) rather than about the preview. What
stays in the preview is the one part that was working during a drag, as a sentence: *This swatch is
the Background here.*

**This supersedes the 2026-07-28 note that removal should carry no heading of its own.** That
reasoning held while removal was the last row of a section already called *Palette structure*: a
second label there added taxonomy for nothing. It does not hold now. With Usage and Palette order
both named above it, an unlabelled trailing block reads as a continuation of Palette order, which
would leave the destructive act as the only thing on the surface without a stated scope. The original
objection — that a label cuts the act off from its object — is answered by keeping the consequence
attached: the impact line sits *with* the control, before the confirmation rather than inside it, so
what removal costs is legible at the moment of deciding rather than after committing.

**Assigning a role is three states, and presenting it as a switch made the control lie.** The row's
checked state was read from `semanticRoles` — the user's sparse map merged *over* the heuristic —
while the press mutated `p.roles`, the user's map alone. Where the heuristic already lands a role on
the selected swatch those two disagree, and the row read checked, offered *"Remove Background from
this swatch"*, and announced **"Background assigned to swatch 1"** when pressed. Pressing again
removed the assignment, whereupon the heuristic derived it straight back to the same swatch: two
presses, no visible change, two contradictory announcements.

A palette must always export six roles, so every role is always *somewhere*. You cannot remove
Background; you can only say where it goes, or stop saying and let the heuristic decide. That is
three states — **Give / Pin / Release** — and `refineSetRole` was already written for exactly them.
Nothing about the behaviour changed; the presentation stopped misdescribing it. `role="switch"` is
gone, each row prints where the role actually sits (*Assigned*, *Derived*, *Swatch 4*) next to the
act pressing it will perform, and the announcement distinguishes pinning an inferred role from
taking one off another swatch — which the old copy called "assigned" in both cases, the second of
which reads as a lie because nothing visibly moved.

The popover also stopped closing on every pick. The trigger says *Assign roles*, a swatch can carry
several, and closing after one made a plural control single-select. Escape now closes it with
`closeTip` rather than `closeFold` — it stopped being an inline fold when it became an anchored
popover, so it had been closing on a different mechanic than it opened on.

**A disabled control has to say why.** Move left, Move right and Remove swatch were `disabled`, which
takes them out of the tab order — so at exactly the moment the reason matters (the swatch is already
first; the palette is at its three-colour floor) the reason cannot be reached. They are
`aria-disabled` now: focusable, announced, handler no-ops, and the accessible name carries the reason
instead of naming a destination that does not exist.

**What was declined, and why.** The audit collides with decisions already recorded here, and the
collisions are all downstream of it not having run the build:

- **Transactional Apply/Cancel.** Declined. Every edit already persists as it is made; "Done" is the
  2026-07-28 decision and the 31 July review restated it — *if changes are applied immediately, the
  top-right action is Done; do not imply an uncommitted draft*. There is no server, so there is no
  save to fail or roll back, and a Cancel would promise a rollback nothing implements.
- **Sentence case for section labels.** Declined. Uppercase micro-labels are this app's documented
  chrome vocabulary; the change is a site-wide restyle, not a Refine fix.
- **Four button tiers.** Declined. The quiet tier was removed on 2026-07-27 for failing 3:1 on its
  control edge. Re-introducing a tier below secondary re-opens a resolved contrast problem.
- **44×44px targets.** Declined as a blanket rule. The app's floor is 24px, which is WCAG 2.5.8 at
  AA; 44px is the AAA figure.
- **"No animation… keep it under 200ms."** Declined. The overlay band was set deliberately at
  0.8s/1.0s the same week (see above), by direction.

Also already true before the audit and reported as findings: the label-and-value-on-one-line slider
layout, the AlertDialog with stated consequences before removal, focus trap and focus return, and
slider keyboard operation.

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
which is what a staggered sequence is trying to say in the first place. Measured across a full
arrival: every element holds opacity 1 throughout.

**A dialog is not a drawer, and Refine is choreographed less than the other four because of it.** A
drawer SLIDES: its contents are legible for the whole of that travel, so anything that does not
reveal itself is visibly being carried in — which is why the drawers mask every section and every
row. Refine FADES UP from nothing, so everything inside it is already arriving, because the thing
containing it is. Masking each part on top of that is the same reveal performed twice, and it read
as one: a surface assembling itself out of parts rather than a surface opening.

Three things earn their own moment there and nothing else does. The **palette** wipes band by band
on the result stage's own clip-path rise — colour leads, and that is the thread tying Refine to the
screen it was opened from. The **text** masks, on the site-wide line reveal, because a mask is a
statement that something is being uncovered and that is true of a sentence. The **controls** — three
axes and the specimen beside them — fade: masking a slider wipes across its own track and thumb,
which reads as a rendering artefact, and they are the part a returning user is looking *for*, so they
get the plainest arrival that is still an arrival. Done, the contrast card, Palette structure, the
footer and the group rules have no motion of their own and need none.

Two things the numbers caught. At `overlayStep × 2` the specimen landed a fifth of a second behind
the third slider, which made it read as a *result* of the axes rather than the other half of the same
control; at `overlayStep` all four are in hand within 120 ms. And the shared text reveal, tuned for
drawers that run to ~1.16 s, left words still rising at 1.12 s over a dialog that had settled at
0.9 s — `_revealDrawerText` takes a schedule now so the tail belongs to its own surface.

**Sections mask too, and the reasoning that said otherwise was half right.** They translated only for
a revision, on the argument that a section is a box and what arrives is the content in it. True of
the rows; false of everything else the box holds. A group's eyebrow, the search field, the sort
toggle and every drawer header sat at full strength from the first frame, riding in on the panel
while the rows beneath them wiped — half the panel arriving, half of it already there. Two clips over
one element intersect rather than compound, so the section's wipe hands off to the row's if they run
close together; at a third of the panel apart it visibly held the rows back. Refine's header was the
last piece outside the arrival altogether. Verified by walking every text-bearing leaf in each
overlay at 90 / 240 / 420 ms and asserting that none of them is unclipped: all three return empty.

**The exit is written out, and two cleverer versions were tried first.** `DUR.overlayOut = 1.0s`, on
the same `EASE.overlay`, stated on the same properties the entrance moved.

- `reverse()` plays the entrance backwards at native rate. The length then follows the content
  (427 ms for Refine against 714 ms for Harmony — the review's own divergence, back through the side
  door) and the curve comes out mirrored, so the panel accelerates as it leaves and is *gone* rather
  than landed.
- `tweenTo(0, {ease})` eases the PLAYHEAD instead. That fixes the length, but the curve lands on time
  and each tween then applies its own on top — two eases composed. Measured: the panel sat still for
  160 ms, crossed 300 px in the next 200, then crept the last 16 px over half a second. Nothing in
  this motion system moves like that, because nothing in it is two eases deep.
- Writing the exit out gives the curve directly: 48% of the travel by 92 ms, 95% by 400 ms, settled
  by 850 ms. Away quickly, landing slowly, legible as the arrival's counterpart.

The entrance timeline is killed rather than left to finish — it owns the same properties, and two
tweens arguing over one transform is how a panel jitters on the way out. Its `clearProps` never
running is harmless: the drawer unmounts, so the node carrying the stale inline styles goes with it.

**The dismissal is the slower of the two, which inverts the usual rule.** An arrival answers a press
and has to feel prompt. A dismissal has already been decided — nothing is waiting on it — so it can
afford to be quiet.

**Measured after:** all four overlays reachable from the result stage close in 1023–1036 ms, a 13 ms
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

---

## 2026-08-02 — Refine's role area: one section, one act, said in words

**The problem was not the popover; it was that three things claimed to be the same thing.** A
`USAGE` heading sat over a six-chip colour legend, a separate `Role: Surface` line restated what the
legend already marked, and an `Assign roles` trigger renamed itself `Close` when open. Nothing
declared which was the parent of which, and the one control that changed anything hid inside the
smallest of them.

**`Usage` is now `Roles`, and the legend is deleted rather than relabelled.** "Usage" would have to
mean where the swatch is actually used — how many components, which ones — and the app has no such
data; it was a heading promising a report the section cannot produce. The legend's job (which colour
holds which role) is the manager's first two columns, and the manager adds the assignment and the
act. A legend duplicating two of four columns is not a second representation, it is the same one
with information removed.

**Back to an inline fold, not the anchored popover.** The popover existed for one reason: expanding
used to push Done off the bottom of a dialog with no internal scroll. The dialog has had a scrollport
since RS-01, so that reason expired. The panel now takes the space it needs and moves Palette order
and Danger zone down — measured at 365px — which is honest, where floating over two unrelated
sections was not. It is a bordered raised surface, not a shadow: it belongs to this section, and this
app draws structure in ink.

**Escape follows the same mechanic it opened on.** The popover era had Escape on `closeTip` and the
trigger on `openFold`; the two are different animations and the panel closed on a curve it never
opened with. Both routes are `toggleRoleManager()` now.

**The trigger keeps its label in both states.** `MANAGE ROLES` with a chevron that rotates. A control
that renames itself to `Close` is two controls sharing one position, and the user has to read it
before every press to know which one they have.

**Three states, three verbs, and the verb names the direction.** `GIVE` said nothing about what
would happen to the role's current home. Every role always resolves somewhere — a palette must
export six of them — so a transfer *always* displaces:

| Where the role sits | Action | What it means |
|---|---|---|
| another swatch | `MOVE HERE` | it leaves that swatch and lands here |
| here, derived | `PIN HERE` | it already resolves here; pinning keeps it here through a recalculation |
| here, pinned | `UNPIN` | it goes back to being chosen automatically |

`Assign here` was in the brief and is not shipped: it would describe a role that currently resolves
nowhere, and the model cannot produce that state. Shipping the label would mean shipping a state the
interface can never reach.

**Derived and Pinned are defined once, on demand.** The first pass explained them in standing prose
— a sentence under the current role, a paragraph introducing the panel, a clause on all six rows'
accessible names, and a second sentence in every announcement. That is one definition written five
times and read aloud on every press, for two words the rows already display. It moved to the 16px
toggletip on the heading, the same mechanism the Library and AA columns use. The section closed is
now two lines where it was four, and a transfer announces the act alone: *"Background moved from
swatch 3 to swatch 1, #726C59."*

**Sentence case was asked for on the actions and is not shipped.** These rows sit beside `MOVE LEFT`,
`MOVE RIGHT` and `REMOVE SWATCH…` in the same dialog; the app's micro-label convention is uppercase
at `--fs-nano`, and one section opting out reads as a mistake rather than a distinction. The brief's
own closing instruction — that the visual language meet the design system — is what decided it.

---

## 2026-08-02 — Refine: three levels of identity, ranked the right way up

**The surface had its hierarchy inverted.** Refine holds three levels — the palette, the swatch, the
role — and it sized them in reverse: `Refine · Garnet` at label size in the corner, `Swatch 1 ·
#726C59` as the largest type on screen. The thing being edited was legible; the thing it was being
edited *inside* was nearly invisible. Now `Garnet` is the H1, level with Done; `Swatch 1` is the H2
under the strip; and `#726C59 · Surface · Derived` is metadata beneath it. The hex left the heading —
three sliders already state it three ways.

**The preview is not a caption on the sliders.** It was the 40% half of a 60/40 split, where its
heading, its body line and both its buttons wrapped — so the object whose whole job is to answer
"does this still work as an interface?" was itself badly set. The split is gone. Axes full width,
then the specimen full width at a 260px floor, with the accent rule and the card sharing one 520px
measure so the specimen reads as a page rather than as a rule drawn across the dialog. The body
scrolls, so the contrast section sitting below the fold costs nothing.

**`In use` was a promise the app cannot keep.** It reads as a usage report — how many components,
which ones — and there is no such data. `Live preview` says what it is, and the caption that used to
hang under the specimen became its subheading: *Testing swatch 1 as Surface*.

**One state, said once.** Text contrast reported its health three times: a `PARTIAL` badge, `1 of 8
meet AA`, and a `REVIEW 7 FAILURES` button carrying the number again — with `VIEW ALL 8 PAIRINGS` in
a full-width footer row underneath, a second name for the same destination. Partial went first: it is
a bucket where the failure count is the quantity, and the quantity is what you can act on. The count
now leads with what is wrong, `Review pairings` is the section's only action, and the drill-in is
titled for what it contains.

**Contrast and Roles are the same object now.** Contrast was a bordered card ending in a navigation
row; Roles was a loose unboxed section. Two neighbours doing the same kind of work looked like
different kinds of thing. Both are unboxed sections on one skeleton: heading, one action, one status,
one supporting fact.

**The selection marker takes its ink from the swatch it lands on.** A 1px ink outline at a -2px
offset disappears into a dark swatch — the one place selection matters most. It is a 3px `inset`
box-shadow now, coloured by `onColor(hex)`: whichever of black and white has the greater contrast
against the fill. That function is already the house rule and its crossover is exactly the 0.179
relative-luminance threshold, so there is no second constant here to drift. Inset rather than outline
so the ring sits on the fill, cannot be clipped by the neighbour, and costs no layout — the marker is
absolutely positioned, and 3px changes nothing beneath it.

**The strip became a listbox.** `aria-selected` is not valid on a button role, so shipping it on the
old markup would have shipped an attribute assistive tech drops. `role="listbox"` / `role="option"`
makes it real, and it is the honest description anyway: this is "pick exactly one of five", which
`aria-pressed` can only model as five independent on/off states. Roving tabindex and the arrow keys
were already there.

**One thing in the brief is not shipped.** Its harmonised Roles example restores *"Assigned
automatically and may move when the palette is recalculated."* as the section's supporting line —
the sentence removed hours earlier for overexplaining. The harmony it asks for is structural, and
removing the contrast footer row is what achieves it; the definition stays on the toggletip.

---

## 2026-08-02 — Refine: one scan line, and the tokens it is built from

**The body could not be scanned because seven levels shared one style.** The modal's own label and
all six section titles rendered identically at 9px/500 uppercase `--on-surface-muted`. Section titles
are now headings rather than eyebrows: `--fs-lead` (15px), weight 500, **sentence case**, full ink,
as `<h3>`. The first attempt only darkened them and moved them to 10px, which was the same shape one
step up — still a micro-label, still needing to be read before it could be identified. Size, case and
ink all had to change. 9px uppercase muted is left to modal chrome and sub-labels.

**The H1 was 4px smaller than the H2.** `--fs-subtitle` (20) on the palette, `--fs-title` (24) on the
swatch — the child outranking its parent, which is what "no visual hierarchy" was pointing at. The
two are swapped.

**Tracking is `var(--track-flat)` throughout the dialog.** The h1's `-.01em`, the h2's `-.005em`, the
swatch labels' `.14em` and the specimen buttons' `.08em` are gone. The rest of the app still carries
its own ad-hoc values; that is a separate pass.

**`22px` was never a token.** Section margins used it while everything else used `--page-gutter`
(24px). They use the token now.

**The selection ring is 4px clear and a 2px stroke**, via `outline:2px solid; outline-offset:-6px` —
the outline's inner edge sits 6px in and paints outward, so the gap is exactly 4px. Still drawn
inside the element box, so no clipping by the neighbour and no layout cost. Swatch height is back to
124px, the value before `a3c4528`.

**Text contrast said four things and repeated two of them.** A `Current pairing` eyebrow over a
two-line stack, with the hex pair restating the chip's own colours and the selected swatch's hex from
the metadata line, and a verdict reading "Normal text: Fails AA" beside a chip whose text is "Normal
text". One row now: chip, role pair, ratio, verdict.

**Palette order and Danger zone were two named sections for three buttons.** Both answer where the
swatch sits in the palette, or whether it sits in it at all — one section, `Position in palette`. The
safety on removal never lived in the word "danger": it is the two-step arm, the impact line beside
the control, and the alertdialog, all unchanged.

**The spoken contrast count contradicted the visible one** — `"1 of 8 meet AA"` against `"7 of 8 fail
AA"`. Both are built from one string now.

**Two smaller fixes from the same audit.** The slider thumb's hover/press transform had no
`prefers-reduced-motion` override — the only Refine motion no preference could stop. And its two
vendor pseudo-elements are separate rules: a selector list mixing `-webkit-` and `-moz-` is invalid
in both engines, each dropping the whole rule on the selector it does not know.

---

## 2026-08-02 — Refine: the preview holds enough colour to judge

**A 520px card centred in a 910px field is not a preview of a colour.** The two roles actually under
judgement — Surface and Background — were a medium rectangle floating inside a large one, and Accent
was a 4px line. The page is full width and 320px tall now, the card fills 94% of it, and the accent
is a 10px band. The cap was doing two jobs at once: holding the colour down to keep the text measure
readable. The measure moved to `max-width: 62ch` on the body copy, and the colour was let go.

**The specimen's type went up without making the verdict a lie.** Heading 12 → 20px, body 10 → 13px.
WCAG's large-text threshold is 24px, so both are still NORMAL text and the 4.5:1 verdict below the
specimen keeps describing exactly what is drawn.

**The numeric fields' unit slot was fixed at 13px** so the three digit columns aligned — but chroma's
unit is empty, so `0.030` stopped 22px short of the box edge while `53%` and `93°` reached it, and
the one value with no unit was the one that read as not right-aligned. The unit hugs the number now
and the content's right edge is what aligns.

**The header had no bottom padding of its own.** The h1's bottom edge WAS the scrollport's top edge,
so at any scroll position but the top, body content passed under the palette name with zero
clearance — a section heading sitting flush against the dialog's heading. The header owns 18px now,
and the strip's top padding drops from 24 to 6 so the resting gap stays at 24.

---

## 2026-08-02 — Roles are dragged onto swatches

**The manager table asked you to press a row on one surface to change a colour on another.** By the
time you had scrolled down to it the strip was out of sight, so the act had no visible result — you
pressed `MOVE HERE` and nothing you could see moved. That is the whole objection, and no amount of
labelling fixes it: the control was in the wrong place.

**Pin and Unpin were two verbs for a state the interface never showed you entering.** Nothing about
pressing `PIN HERE` looked different from not pressing it, so "pinned" was a word you had to take on
trust. Dragging a role onto a swatch *is* pinning it — you placed it, so it stays. There is nothing
left to name and both verbs are gone.

**The chips are on the swatches, and they are the control.** They were already there as `<span>`s —
the right place to read them, and the one place they could never be operated, because a button
cannot contain a button. They are lifted onto their own layer over the strip: a flex row with the
same shares, so a chip sits on its swatch by geometry rather than by measurement, and it stays right
through a reorder, a resize and a removal. `pointer-events: none` on the layer keeps the swatch
clickable everywhere a chip is not, and the listbox stays a listbox — options with buttons inside
them are not a listbox in any screen reader.

**1:1 under the hand, eased only on abandonment.** No transition on the dragged transform: a curve
between the pointer and the thing it is carrying is the one place easing reads as lag. The return
tween is the exception, because giving up on a gesture is the interface acting on its own behalf.
Drop targets are hit-tested against the swatch rects rather than `elementFromPoint`, so the chip
under the cursor cannot shadow the swatch beneath it.

**The keyboard does what the hand does.** Arrow keys walk a role along the strip one swatch at a
time, Home and End send it to either end, and focus follows the role so the next press continues the
journey. Same announcement as the drop.

**`cursor: grab` is the affordance.** No standing sentence telling anyone they can drag; the pointer
says it on arrival, the hover box makes a word on a colour read as a control, and the tip carries
the one remaining concept on demand.

**One way back, not six.** `Reset roles` appears only when something has been placed. Six per-role
`Unpin` buttons were six ways to reverse a decision the interface never showed you making.

**Section headings are Title Case**, and `PORT` now wins in `vite.config.ts` — Vite does not read it
on its own, so a harness that assigns a free port got 5173 every time and then could not reach the
server it had just started.

---

## 2026-08-20 — The landing is a volume, not a formation

**The orbs are gone, and so is everything that existed to draw them.** Three concentric rings, three
renderers in descending order of what a browser would allow — a single-context particle cloud, a raw
per-orb WebGL shader, a painted DOM stack of a hundred and sixteen elements carrying five shading
layers each — plus the orb tile textures, the env map, the living-gradient blobs inside each tile,
the per-orb vertical float, and the one room lamp every terminator, specular, rim and drop shadow
answered to. In their place: one raymarched disc of gas with the brand copy sitting in its hole
(`src/app/nebulaField.js`), over a painted floor that is one element.

**What the formation was for survives; only the medium changed.** The landing's job is to put the
product's subject on screen before a word of it is read — colour, arranged as a spectrum, turning,
around the words. All four of those hold. The twelve OKLCH stations are still the palette and still
the reason neighbouring colour is neighbouring hue; they are baked into a 256×32 ramp the shader
reads instead of into twelve tile textures, and every pixel of that ramp goes through the same
`gamutMap` every palette in the tool goes through. Hue is read off the screen angle, so the wheel
stands still against the copy and revolves as one body while the gas swirls through it.

**The hole is the contract.** `_heroReach()` measures the copy's marks and `_fieldGeom()` turns them
into a clear radius, exactly as `_ringGeom` turned them into ring radii — and the shader is set up so
one mid-plane unit is one clear radius on the screen, which makes "density is zero below world radius
1" and "no gas within N pixels of the centre" the same statement. The guarantee holds at every
viewport without a second solve and cannot drift. The desktop landing still has no wash behind its
words and is not to be given one.

**The hole is an ELLIPSE, and that is the one thing the ring set could not have taught us.** A ring
is round, so the only number that ever mattered was the worst angle. Measured at 800×500 the copy is
222px wide and 94px tall from the centre — a round hole clearing its corner opens to 241 and throws
away the entire top and bottom of the viewport, which is exactly what the first build did: the gas
came out as a 0.36-unit band with most of it off screen. The hole now follows the block's own shape,
capped at `FIELD_HOLE_ASPECT` so it stays an ellipse around a block rather than a slot cut through
the picture. Both radial profiles are fractions of the BAND rather than of the disc, for the same
reason — fixed figures put the outer falloff inside the hole on a short viewport.

**Rotation is rigid and the spiral does not wind up.** Differential rotation — inner faster — is what
a real disc does and what the reference shader this grew out of does, and it is banned here. It winds
without bound, so a landing left open for two minutes is a different picture from the one that
arrived, and nobody can tell that was intended. The twist is a fixed function of radius added to the
one shared angle; life comes from the noise field evolving in place, which has no geometry to
destroy. `ORB_ROT_SECS` survives as `FIELD_ROT_SECS`, unchanged at 105: how fast the formation turns
is the page's tempo, not a property of what is in it.

**The noise is fetched, not computed.** Four octaves of tileable value noise are baked once into the
RGBA channels of a 64³ volume texture, so an octave is a texture read and an FBM is one read and a
dot product. Computing the same FBM from a hash is around forty ALU and eight dependent fetches per
octave, per sample, per pixel — at this screen coverage the difference between holding 60fps on
integrated graphics and not. The march is bounded analytically (the gas is a slab and the ray only
falls, so entry and exit are two divisions), and the two regions that hold no gas — the copy's hole
and beyond the rim — are discarded before a single sample, which is most of a widescreen viewport.

**One shader serves both themes, because the volume both emits and absorbs.** What the theme moves is
exposure, coverage and whether a Reinhard shoulder is applied at all: none on paper, where the gas is
pigment suspended in the page and anything that lifts it toward white erases it, and half again the
exposure with a shoulder on the dark surface, where the same integration reads as light. The output
is premultiplied in ENCODED space rather than linear, because the page composites sRGB numbers.

**The wordmark got a second clearing, and it needed one.** It is fixed at the top of the stage, well
outside the hole, and its legibility mechanism is `mix-blend-mode: difference` — which works against a
light page and fails against a mid-luminance backdrop, since |b − s| approaches b as b approaches a
half, and a nebula on a dark surface spends most of its area right there. The field thins behind it
over more than twice its own box, so it reads as thinner air rather than as a cut-out.

**The painted floor is a still of the same picture, not a second artwork.** A conic gradient through
the same twelve stations, masked to the same ellipse, aligned to the same angle — so the field
arriving over it is a crossfade within one image rather than a swap between two. Which is also what
makes the arrival honest: three is still a dynamic import that lands after the landing has painted,
and what a visitor looks at until then is the picture, quieter. No WebGL 2 leaves it up permanently.
A lost context fades it back.

**Reduced motion is no longer denied the field.** It used to be, and the reason was population: the
ring count was a function of which renderer could run, so a reader who asked for less motion had to
be given the smaller formation the DOM floor was drawn around. A volume has no population. What
reduced motion asks for is stillness, so it now gets the same picture, rendered once and never again
— no ticker, and nothing to pause.

**The cursor layer was built and then removed by request.** A local advection that parted the gas
around the pointer and closed it behind, carrying pointer speed in its tangential term, plus a 16px
global lean of the whole field. Both worked. Both are gone, along with their uniforms, the
window-level `pointermove` listener and the accessor that exposed the pointer — nothing is left
disabled behind a flag, so bringing an interaction back is a fresh design and a contract amendment
rather than a switch. The landing has one thing to do with a pointer and it is the CTA.

**`/vendor/orb-shader.js` is deleted, not orphaned.** It was a blocking script tag on every visit for
a renderer that now has nothing to shade.

### The second pass: making it look like something, rather than like a blur

**The first build was ink in water, and the brief was the sky.** Three changes, and each one came out
of a specific fault rather than out of taste.

**The field is sampled in POLAR space now — angle, height, radius — not in x/z.** Noise in Cartesian
coordinates is isotropic, so it comes back as blobs, and a rotating disc does not contain blobs:
shear stretches everything in it into arcs. Sampling in the coordinates the thing actually turns in
produces those arcs out of the geometry rather than out of a filter laid over it, and it costs one
constraint — the number of repeats per turn must be a WHOLE number, since the volume tiles at 1 and
an integer is what makes the seam at the back of the ring not exist.

**The disc's mid-plane is warped, and the camera still is not tilted.** One side of the ring rides
high and the opposite side low, so the near half is seen face-on and the far half nearly edge-on. A
camera tilt would have read the same and moved the hole off the copy; warping the disc under a camera
that stays on the axis keeps the guarantee exact. It is fixed in SCREEN space rather than carried
round by `rot` — it stands in for the angle the thing is being looked at from, and a camera does not
orbit its subject.

**Three separate sampling faults printed as a woven crosshatch, and all three were mistaken for a
look before they were found.** (1) The volume's finest octave was a 32-cell lattice baked into a
64-voxel grid — two voxels per cell, so the interpolation it is supposed to have had nowhere to
happen and what got baked was a checkerboard. Nothing finer than a quarter of the grid, ever; the
fine detail is bought by sampling the volume at a higher frequency instead. (2) A single vertical
noise scale cannot both give the layering that reads as depth and stay inside what a 32-step march
can resolve. It is two fetches at two vertical scales now — a coarse pair that carries the layers and
doubles as the domain warp, and a fine pair that is nearly flat vertically and carries the filaments
in the two axes the ray crosses densely. (3) The domain warp was isotropic in a space that is not:
full amplitude in angle and radius, a tenth of it in height. The march went 32 → 48 steps on top of
all three, which is what took the last of the dither's own pattern out of the dense regions.

**A `?tune` panel, in dev only.** lil-gui, wired to every figure in `LOOK` plus a button that prints
the whole object as JSON to paste back into the file. Tuning a volumetric look by editing a constant
and reloading is not tuning, it is guessing, and the reference this grew from carried the same panel.
`import.meta.env.DEV` is a literal `false` in a production build, so the branch, the dynamic import
and lil-gui itself all leave the bundle — verified against `dist`, where `attachTuner` compiles to an
empty function and the string `lil-gui` does not appear. The `?tune` in the URL is the second gate,
so an ordinary `npm run dev` gets the landing rather than a control panel over it.

### The third pass: one mass, not many

**Chasing definition had broken the field into separate wisps.** Compared against the reference side
by side, the fault was obvious and it was not detail — the reference is one continuous body with a
density gradient running through it, and what was on screen was a scatter of patches with clear air
between them. A rotating mass does not have edges like that. Three terms were doing it, in this
order of blame:

**The threshold band was a switch, not a ramp.** `soften` was 0.16 — gas either present or absent
across a sixth of the noise range. The reference runs its band across half of its own range for this
exact reason. At 0.44 the density is a gradient the eye can follow from one side of the disc to the
other, and that continuity is worth more than the extra crispness a tighter band buys.

**The arm term was cutting rather than modulating.** `armDepth` 0.55 removed more than half the
density between the arms, so the arms read as separate objects instead of as structure inside one.
0.30.

**And the colour was fragmenting it too, not just the density.** `toneNoise` at 0.5 put neighbouring
patches of gas far enough apart on the tone ladder to read as two different materials. At 0.22 the
wheel — which is a function of WHERE the gas is, not of what the noise is doing — stays the thing
that decides colour, and the noise only shades it. The lower noise frequency (`arcs` 6 → 4,
`radial` 0.95 → 0.55) and the softer warp are the same argument applied to scale: fewer, larger,
more coherent features.

**The dark theme needed its exposure re-solved after that.** A wider threshold band means a lower
average density, which means less coverage, which on a dark surface means the page shows through and
the gas goes pale. Exposure 1.6 → 1.5 with the shoulder pulled well back (0.5 → 0.35) and coverage
lifted above one, so dense gas reaches full opacity rather than asymptotically approaching it.

### The seam at the branch cut

**A hard horizontal line ran left from the centre of the screen, and it was atan2's.** The branch cut
lies along the negative x axis — in screen terms exactly that line — and crossing it the angle jumps
by a full turn. Every consumer of the angle in the shader is invariant under that jump by
construction: the arm term takes a whole number of cycles, the hue is read through `fract()` out of a
texture that wraps, and the noise coordinate was scaled to a whole number of repeats per turn for
this precise reason.

**And then each fetch multiplied the whole coordinate by its own scale.** A jump of 4 repeats became
2.48 tiles at 0.62 and 8.4 at 2.1 — a fetch landing half a tile away on one side of a line than the
other draws that line. The tiling argument was right and the per-fetch scale silently broke it. The
angle is carried in TURNS now and only the two axes that do not wrap get scaled: the coarse pair
takes `arcs` repeats per turn and the fine pair four times that, an exact octave apart and both
whole. Verified by driving the threshold band down to 0.04 and the density to 8, where any remaining
discontinuity would be unmissable, in both themes.

**The general rule this leaves behind:** anything in the shader that reads the angle and is not
invariant under a full turn will draw that line. That is why `arms` is an integer too, and why the
tuner's slider for it steps by one.

### The ladder is a distance from the page, not a lightness

**The spectrum was authored against white paper and then dragged onto a dark one.** The tonal ladder
was five absolute OKLCH lightnesses — 0.86, 0.74, 0.62, 0.50, 0.34 — and half this site is a surface
at L 0.19. Every rung of that ladder sits BELOW the dark page: gas at L 0.34 on a ground at 0.19 is
mud with no light in it. The only way to see any of it was to push the exposure until the mid tones
clipped toward white and the hue went with them, which is exactly what the dark theme's four
override figures were doing — gain, coverage, a Reinhard shoulder and a shifted position in the
ladder, all papering over a ramp pointing the wrong way.

**So the ladder is authored as five DISTANCES and the surface decides the direction.** `--surface` is
read from the live token — the same one `themeColor.js` reads, so there is no second copy to drift —
converted to OKLab, and the rungs run away from it: down on paper, up on the dark. On light this
reproduces the original five to four decimal places (0.9696 − 0.1096 is 0.86, and so on down), so
nothing about that theme moved by a pixel. On dark the same five run 0.30 / 0.42 / 0.54 / 0.66 /
0.82 — the same relationships, the same order, the same near end, now made of light instead of
shadow.

**Which is what makes the near end dissolve.** Rung 0 is the tone closest to the page in both themes
and it is also where the chroma ramp cuts hardest, so the thinnest gas is nearly the page's lightness
AND nearly its neutrality — it goes into the surface instead of lying on it as a film. Measured on
the ramp's first row: `#bb678a` against a `#f5f5f3` page, `#a15072` against `#141413`. Rung 4 is the
furthest in both, and it is the one carrying the picture.

**All four per-theme exposure figures are gone, and that is the result rather than a tidy-up.** With
the ladder symmetric about the page, the same exposure produces the same contrast against it either
way. Verified as a true A/B — one visit, one wheel, one rotation, switched in place — and the two
read as one artwork with the tones mirrored. `_fieldTheme()` and `setTheme()` are both deleted; the
four figures live in `LOOK` once, where the rest of the look is.

**The switch is now handled rather than accidentally survived.** A theme change rebuilds the ramp and
uploads it into the existing texture — 32kB, one write, same dimensions, no teardown and no GPU
churn, with the wheel's per-visit rotation untouched so the colour does not jump round the ring on
the way. Today the only control that flips the theme lives in the tool and the way back kills the
stage anyway, so this is belt and braces; that is an accident of where the switch happens to sit, and
a landing that answers the theme only because something else tore it down first is one route change
away from being wrong. `_surfaceLab()` is memoised on the theme, because `_ladder()` is called once
per ramp column and an un-memoised `getComputedStyle` there is 256 forced style recalcs.
