# Refine Palette dialog audit — 03.08.26

Takeover review of the RefineDialog as shaped by the handed-over commits (5a9e328 "The palette is
the H1" through b64e800 "Roles are dragged onto swatches", plus the uncommitted padding fixes
published in 2469025). Full mode, six domain skills, read-only — findings are proposals, not
applied changes.

Stack: same as the library audit — React 19, inline `sx()` over tokens in global.css.

## What the handover got right (verified, no change needed)

- **The padding fixes hold exactly.** h1 bottom → scrollport top = 18px (the header's own), strip
  top +6px, resting gap h1 → strip = **24px** as the comment promises; footer spacer measures
  24px = `--page-gutter`. Scrolled content no longer touches the palette name.
- **The listbox is a real listbox.** `role="listbox"` / `option`, roving tabindex, ArrowRight
  moved selection swatch 1 → 2 → 3 with focus, `aria-selected` and the H2 tracking together.
- **Role chips are genuinely operable.** They live on their own layer (a button inside a listbox
  option would be illegal), and the keyboard path works end-to-end: Arrow moves the role to the
  next swatch, focus follows the chip, footer Undo restores the assignment and re-disables.
- **Move left/right use `aria-disabled` correctly** — focusable at the boundary, reason in the
  accessible name.
- **Esc from a clean dialog returns focus to "Refine this palette".**
- Spinbutton value boxes carry min/max/now/valuetext; sliders are native ranges with
  `aria-valuetext` and per-axis gradient tracks.

## Findings

| # | Sev | Domain | Location | Before | After | Why |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | HIGH | accessibility | `AppView.jsx:2646` (arm), `:2650` (alertdialog), arm handler in refine.js | Pressing "Remove swatch…" swaps the un-armed row for the `role="alertdialog"` — the pressed button unmounts and focus falls to `<body>` (measured: `document.activeElement === body`) | On arm, focus the confirmation's Cancel; on cancel, return focus to "Remove swatch…"; on confirm, to the strip's now-selected swatch | The dialog's focus trap lives on the dialog root's onKeyDown, so with focus on body, Tab escapes an `aria-modal` surface at the exact moment of a destructive decision — and Esc-after-arm closes with focus restoring to a bare DIV instead of the trigger (both observed) |
| 2 | MED | colors | `renderVals.js:1386` role-chip style | `color: onColor(hex)` at `opacity: .75` over the swatch — Accent on #E12409 measures **3.15:1** at 8px; Primary/Secondary 4.72:1; full-alpha white on that red is still ≈4:1 | Give the label a backing the way the universe hint chips do (surface-mix + hairline), or drop the opacity and pick ink per swatch that clears 4.5:1 | The chips are the role map's only full statement — the legend was deliberately removed in b64e800 — so their legibility is load-bearing content (1.4.3), and the failure scales with whatever palette arrives |
| 3 | MED | typography | `global.css` `[data-refine-num] span`, comment at `AppView.jsx:2491` | Unit slots are intrinsic-width (`%`, `°`, empty), so digit right edges land at 777 / 787 / 783 across the three rows | Fixed `inline-size` on the unit span (≈14px) so digits share one edge; keep `tabular-nums` | The code's own comment claims the empty slot "keeps three rows in one column" — the intent is right and the implementation doesn't deliver it; a value column that jitters by 10px defeats comparison |
| 4 | MED | writing | `AppView.jsx:2465, 2546, 2605, 2638, 2639, 2646, 2659` | "View source", "Review pairings", "Reset roles", "Move left", "Move right", "Remove swatch…", "Remove swatch" beside "Done" and "Reset All Refinements" | Title-Case the seven sources | The surface now runs two capitalization policies; these predate today's app-wide sweep and were out of its grep patterns (`quiet`/`footBtn` styles converted, strings didn't) |
| 5 | LOW | ui | `AppView.jsx:2465` | "View source" is the surface's only uppercase control post-sweep; its stated rationale (distinguish from 9px-uppercase section titles) inverted when titles became sentence-case `--fs-lead` | Title Case micro, keep the underline — the underline now does the distinguishing alone | The differentiation argument in the comment no longer describes the screen around it |

## Considered but Rejected

| Location | Candidate | Rejected because |
| --- | --- | --- |
| Role chip labels (`BACKGROUND`…) | Title-Case them with the sweep | They sit on the swatch surface, which speaks the uppercase value voice (HEX/RGB labels, weights); breaking that voice for the chips would fork the one surface that is currently unified |
| `AppView.jsx:2416` chips-over-listbox double layer | Flatten chips into the options | A button inside a `role="option"` is invalid and unreadable to screen readers — the two-layer build is the correct pattern, and the geometry (shared flex shares) keeps them glued |
| `AppView.jsx:2638` | Real `disabled` on Move left/right at the ends | `aria-disabled` + no-op + reason-in-name is the deliberate, documented pattern — the boundary reason stays reachable |
| Chroma value box | Fabricate a unit so the slot has content | A chroma is a ratio; the fix is the slot's width, not a fake unit |
| Section rhythm (32px unruled vs 24+24 ruled) | Normalize all section gaps | The ruled sections spend margin + padding around their rule deliberately; measured, the visual rhythm between ruled groups is consistent |
| Pointer-drag with no touch path | Flag as missing coarse-pointer support | The surface is desktop-gated (<720px shows the mobile notice) and the keyboard path is complete |

## Verification

Passed: build ✓ · geometry (18/6/24, spacer 24) ✓ · listbox arrows + focus + H2 ✓ · chip
ArrowRight → role to swatch 3, focus followed, Undo restored and re-disabled ✓ · arm → focus on
body (finding 1, reproduced twice) · Esc clean path returns to trigger ✓ · Esc after arm restores
to a DIV (finding 1's consequence) · chip contrast measured per swatch (finding 2's table) ·
digit edges measured (finding 3) · rendered button strings collected (finding 4). Library state
clean after the walk (role move undone, removals cancelled, no slider commits).

**Not verified:** pointer drag of a role chip (synthetic pointer-capture is unreliable in this
pane; keyboard equivalent verified) · "Review pairings" overlay deep-walk · slider-commit
announcements · VoiceOver pass · reduced-motion variants.

## Resolution — 03.08.26, same day ("proceed with 1–5", after the voice revert)

| # | Status | Resolution |
| --- | --- | --- |
| 1 | ✅ Fixed | Arm now focuses the alertdialog's Cancel (`refineArmRemove`); Cancel returns focus to "Remove swatch…" (`data-refine-remove-arm`); confirm hands it to the newly selected strip swatch. Verified: arm → activeElement = "Cancel the removal" inside the confirm; cancel → back on the arm button. Focus never touches `<body>` |
| 2 | ✅ Fixed | Chips carry a scrim in the ink's own opposite (black .42 under white ink, white .58 under black) at full alpha. Measured over every Garnet swatch: worst pair **10.12:1** (was 3.15). The pinned/derived cue the old 0.75 opacity carried moved to a `currentColor` ring on `data-pinned` — shape, not alpha |
| 3 | ✅ Fixed | Unit slot is `inline-size:12px`; digit right edges measured 777 / 777 / 777 (were 777/787/783) |
| 4 | ✅ Resolved by policy | The voice reverted to uppercase controls app-wide (see interface-audit.md); every refine button renders uppercase again — MOVE LEFT, REMOVE SWATCH…, REVIEW PAIRINGS beside DONE and RESET ALL REFINEMENTS. One policy, verified on the rendered buttons |
| 5 | ✅ Resolved by policy | VIEW SOURCE is no longer an exception — uppercase is the control voice again; the underline keeps distinguishing it from the sentence-case section titles |

Also in this pass, at user direction: the selected palette's trait chips went uppercase at the
More button's own size and height (one 26px row, `--fs-label`), and the More toggle's swap is now
a tweened resize — shared `_moreBtnSwap` FLIPs position **and width** with a glyph settle, both
directions, on the standard tokens.

## Later the same day — two design passes at user direction

Pass 1 (reference-driven): role-chip layer insets to 8/8 · selection ring and drag drop-ring to
1px · slider thumb bar 4 → 3px · a `--line` divider under every section headline · the "Testing
swatch x as…" line deleted (mapping lives in the preview group's aria; the roleless variant is a
flagged watch-item) · each L/C/H axis in its own `--surface-raised` card on an 8px rhythm.

Pass 2 (supersessions — user direction overrides two earlier resolutions):
- **Finding 3 superseded:** the fixed unit slot is out; the value boxes narrowed 72 → 58px and
  right-align the digits+unit **cluster** instead (`justify-content:flex-end`). Rows align on the
  cluster's edge; chroma, unitless, ends its digits there. Verified: three boxes at 58px, right
  edges equal, nothing clipped.
- **Finding 2 amended:** chips are borderless in every state — the pinned ring is gone; pinned vs
  derived is carried only by the meta line's "· Pinned" text. Scrim + contrast unchanged
  (≥10:1). Chip padding is 4px on all sides, so label ink sits 12px from the swatch's left and
  bottom edges (verified).
- **Finding 1's subject deleted:** the whole Position in Palette section (reorder + the two-step
  swatch removal) is removed as serving no purpose. The arm/cancel/confirm focus choreography
  survives unreachable in refine.js and git history should the capability return.

## Open proposal — the Roles section ("Text · Derived helps nobody")

### Why it fails

The section renders one line per role on the *selected* swatch: `Background · Derived`. Four
things are wrong with it at once, and only the last is about wording.

1. **It is a restatement.** The strip 300px above already says BACKGROUND, in words, on the
   colour itself. The section repeats it in a strictly worse rendering — no colour, no position.
2. **"Derived" answers a question nobody asked.** It reports *provenance* (did you choose this or
   did we?) before *purpose* (what is this role for?) or *fitness* (is it working?).
3. **It never shows the role map.** Scoped to one swatch, it prints 0–2 of the 6 roles — so a
   heading reading "Roles" shows most of the palette's roles nowhere.
4. **It has no verbs.** Every act on roles happens on the strip (drag, pin, release). What is left
   here is a read-only echo with a Reset button attached to it.

The same jargon appears a second time in the swatch meta line (`renderVals.js` `selMeta`:
`#0F0302 · Background · Derived`), so any wording fix has to cover both or they drift.

### Option A — delete the section, relocate its two live parts (recommended)

| Part | Where it goes |
| --- | --- |
| The role map (`currentRoles`, `noRoleNote`) | Nowhere — the strip is already the better rendering, in colour and in position |
| The ⓘ defining Derived/Pinned (`rolesInfo`, `toggleRolesInfo`, `refineRoleInfoOpen`) | Onto the strip's own group, where the chips it defines actually live |
| Reset roles (`anyPinned`, `onResetRoles`, `resetRolesAria`) | The footer, beside Reset all refinements — both undo decisions, at two scopes, and they currently sit 400px apart |
| The words "Derived"/"Pinned" in `selMeta` | Plain language: `#0F0302 · Background · chosen for you` / `· you placed it here` |

Result: strip → swatch → Adjust Colour → Live Preview → Text Contrast. Five sections, each
answering a distinct question, nothing restated. Nothing is lost — pinning stays visible in the
meta line, which is where a property of the selected swatch belongs.

### Option B — replace it with the palette's role map (if a section should survive)

Six rows, always all six roles, not just the selected swatch's:

```
Background   ■ 1   chosen for you
Text         ■ 3   you placed it here
Accent       ■ 2   chosen for you
```

Each row selects that swatch on press. This is genuinely new — the strip cannot show six roles
legibly when a band is narrow, and a screen-reader user currently has no summary of the map at
all. Costs ~6 rows of height and partly duplicates the strip.

**Recommendation: A.** B is defensible only if the role map is a thing people consult rather than
glance at; nothing observed so far suggests it is, and the strip already answers the glance.
Not chosen: rewording alone — it leaves a restatement in place, just a politer one.

### Resolved — Option A, implemented 03.08.26

Section deleted. The role map lives on the strip, in colour and in position, where it always read
best. Reset roles moved to the footer beside Reset all refinements, shown only when there is a
placement to undo.

**Then a second cut, same session.** Option A had relocated the derived/pinned wording (as
`chosen for you` / `you placed it here`) plus its tip onto the swatch's metadata line. That was
still the same mistake one level down: the roles are already written on the colours a few pixels
above, so restating them in grey text was the strip's own map with the colour removed, followed by
an explanation of a distinction nobody had asked about. The line is now **the hex and nothing
else** — the one fact about the selected swatch the strip cannot show. `rolesInfo`,
`toggleRolesInfo` and the `refineRoleInfoOpen` state went with it, including its Escape branch in
PaletteApp.

Consequence, recorded deliberately: derived-vs-pinned is now stated **nowhere** in the interface.
A role's location is visible; how it got there is not something the editor asks anyone to reason
about. Reset roles remains the one control that acts on it.

The dialog is now strip → swatch → Adjust Colour → Live Preview → Text Contrast.

## The strip alignment bug (found 03.08.26, four rounds in)

Worth recording because the symptom pointed away from the cause for four attempts. The tags
appeared further from their band's left edge than from its bottom, and every fix aimed at the
inset — 9→8px, removing a legacy `-4px` margin, `line-height` 1.25→1, 8→4px — failed, because the
inset was never wrong.

The strip is two stacked flex rows: the swatch bands, and the role-chip layer over them, both
carrying the same `flex-grow` values on the theory that identical inputs give identical widths.
They did not. `box-sizing: border-box` is global, so `flex-basis: 0` on a **padded** item cannot
resolve below its own padding: the bands entered the flex algorithm with an 18px base (from a
`padding: 9px` left over from when the labels lived inside the button — which has been empty ever
since) while the chip cells entered with 0. Two bases, two distributions. Measured on Garnet, the
cells sat **11.6 / 13.2 / 7.1 / 0.7px** right of the bands they cover, so a tag asked for 8px from
the left landed at 19.6px on Accent while its bottom stayed a true 8px.

Only band 1 was ever correct, and band 1 is the one that had been measured each time.

Fix: delete the dead padding, so both rows are the same kind of flex item. Verified per band —
cell-to-band offset 0, width delta 0, tag at **8px left / 8px bottom on all five**, strip filling
its full 752px. (Grid with `minmax(92px, Nfr)` was tried first and reverted: it aligns perfectly
but does not reproduce flex-grow's proportional fill, leaving 75px unclaimed.)

**Lesson for this file:** measure every instance, not the first one. A per-item assertion would
have caught this in round one.

## Verdict

**Approve** — the Roles decision is resolved (Option A, implemented and verified) and the strip
alignment defect that four rounds of polish were circling is fixed at its cause.
