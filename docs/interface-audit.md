# Library interface audit — 03.08.26

Full-mode review of the Library section (heading row, projects band, filter toolbar, column
header, list rows, pager, plus the filter drawer and Manage dialog as its overlays), run with the
six `better-*` domain skills. Findings the user enumerated were implemented in the same pass and
re-verified; everything else is ranked below as the plan.

Stack: React 19 + inline `sx()` styles reading CSS custom properties from
`src/styles/global.css`; no utility framework. All fixes are expressed through existing tokens.

---

## The contract (codified, so consistency stops being re-litigated)

These are the rules the section now follows. A future change either follows them or changes them
here first.

**Bands, top to bottom — placement states the relationship**

| Band | Contents | Owns |
| --- | --- | --- |
| Heading | `Library` + ⓘ, view toggle | The whole section — the toggle redraws all of it |
| Projects | Scope chips + `Manage Projects` | One subject: projects. Navigation in the framed group, the act beside it |
| Toolbar | `Filter n` · applied chips · `Clear Filters` · `Showing x of y` | `role="toolbar"`, `aria-controls="library-list"`, arrow-key traversal |
| Column header | `Palette` + three sort chips | Sorting lives on the columns it orders. One chevron: the true one |
| Rows | The table | — |
| Footer | Per page · pager | Each appears only when it can do something |

**Voices** — one per kind of thing:

| Kind | Treatment | Examples |
| --- | --- | --- |
| Controls (section chrome) | `--fs-detail` (12px), Title Case, no transform | Manage Projects, Clear Filters, Max Contrast, List/Grid/3D |
| Status labels | `--fs-nano/micro`, uppercase | EXAMPLE, VIEWING, AA badge |
| Values | mono, tabular-nums | counts, ratios, stamps |
| Metadata (unpressable) | `--fs-detail`, muted, no border/fill | Showing 4 of 8 palettes |

**Geometry**

- Page gutter `--page-gutter` 24 · row surface inset `--row-inset` 16, read by the header grid,
  the row grid, and `--row-action-offset`. No private copies of 16 anywhere in the row.
- Heights: framed segmented group 34 (2px frame + 30 chip); solo bordered control 30; `Manage
  Projects` takes its height from the group via `align-items: stretch`, never from a number.
- Border tiers: `--action-line` interactive edge · `--line` quiet edge (sort chips — load-bearing,
  the box edge IS the column line; do not remove) · `--line-strong` structural rules.
- Fill (`--on-surface`) means exactly one thing in chrome: current selection / applied filter.

**State visibility**

- Sort: one chevron, on the active column only; inactive columns reveal theirs on hover *and*
  `:focus-visible`. Active also steps weight + ink (survives greyscale, SC 1.4.1).
- Result count exists only while a filter does, phrased `Showing x of y`, in a permanently
  mounted `role="status"` span (live regions must exist before the change they announce).
- Accessible names: visible text = accessible name wherever possible; aria-labels only add
  context that *contains* the visible label (SC 2.5.3).

---

## Fixed in this pass (user-enumerated + what verification surfaced)

| # | Domain | Location | Before → After | Evidence |
| --- | --- | --- | --- | --- |
| 1 | layout / ui | `global.css` `--row-inset`, `AppView.jsx` header + row grids, `renderVals.js` timeCell + Created chip | Row content flush left (0), stamp privately 16 right, hover buttons landing at 0 → one token: 16 both sides, buttons land on it | strip/`Palette` at 40 (24+16); stamp & Created chip right edges both 810; hover: trash inset 16, folder 52, stamp-to-folder gap 16 |
| 2 | ui | `AppView.jsx` projects band | Manage 30px beside 34px group → `align-items: stretch` | measured 34 = 34 |
| 3 | writing | Section-wide | Mixed sentence/Title labels → Title Case controls: Manage Projects, Clear Filters, Clear Filter(s) (drawer), Remove Last Filter, AA Pairs, Max Contrast, List/Grid/3D (`viewToggleOptStyle` drops uppercase) | rendered strings verified |
| 4 | colors | `renderVals.js` countStyle, `AppView.jsx` filter count | Counts at 0.7 opacity: **2.98:1 light / 4.10:1 dark** → opacity removed: **5.55:1 / 7.17:1** (active-chip count 15.94:1) | measured, both themes |
| 5 | accessibility | Clear Filters (toolbar + empty state), Remove Last Filter | `aria-label="Clear all filters"` ≠ visible "Clear Filters" (SC 2.5.3) → aria removed, visible text is the name | DOM inspected |
| 6 | ui | sort chevrons | Three arrows at rest (active 1.0, inactive 0.32) → one arrow; inactive fade in at 0.42 on hover/focus-visible, slot reserved so labels never shift | opacities 0 / 0 / 1 at rest; 0.42 on hover and on keyboard focus |

Also verified, no change needed: descriptor tag buttons already ≥24px (2.5.8), every control in
the section carries `data-focus`, `tabular-nums` on counts/ratios/stamps, toolbar arrow keys
(Left/Right wrap, Home/End), reduced-motion covers the chevron transition.

## Plan — executed 03.08.26 (second pass, "Proceed")

| # | Status | Resolution |
| --- | --- | --- |
| P1 | ✅ Fixed | Toast span no longer carries `text-transform: capitalize`; the label ("Dry Season deleted") renders as the natural sentence it already was. Rendered-state check see Verification |
| P2 | ✅ Fixed | **Decision recorded: voice follows the surface that owns the overlay.** The filter drawer and Manage dialog are library-owned, so their control chrome now speaks the library voice — Done / Close / Add / Clear Filter(s) / Clear Search / Show All · n / Most Used at `--fs-detail`, no transform; drawer chips match the toolbar chips exactly; the drawer's count line is the same "Showing x of y" sentence as the toolbar's. Result-stage drawers (harmony, contrast, export, refine) keep the uppercase label voice — `toggleStyle` is shared with them and stays; the drawer overrides locally. Heading-rank items (facet group eyebrows, the Character traits disclosure) keep the eyebrow voice so the four groups hold one rank |
| P3 | ✅ Fixed | Scrolling-shadows pair on `[data-proj-group]` in global.css: surface-coloured covers pinned to the content, shadow gradients pinned to the box — the cue appears only at the clipped edge, no JS, both themes. Verified by forcing the group to 150px: mid-chip clip + working scrollLeft |
| P4 | ✅ Fixed | `--ease-pill` token added beside the other motion tokens; the three literal copies (view pill, per-page pill, project pill in misc.js) now read it. Computed transition verified: `cubic-bezier(0.625, 0.05, 0, 1)` |
| P5 | ✅ Fixed | The 6.06:1 claim in renderVals now records the measured pair (5.55:1 light / 7.17:1 dark, 03.08.26) and the no-opacity rule |
| P6 | ✅ Fixed | gridOverlay.js documents the one intentional divergence: the table answers to its surface (`--row-inset`) before the page grid; a future row-grid ruler must be drawn from the tokens, not by eye |

## Still open

| # | Status | Resolution |
| --- | --- | --- |
| P7 | ✅ Fixed (03.08.26, third pass) | The 6.5s timer is gone from both delete paths (palette in overlays.js, project in persistence.js; `_toastT` no longer exists). The toast persists until one of three exits: **Undo** restores, the new **✕** ("Dismiss, keep the deletion" — 30px, bordered, named) forfeits the held record exactly as the timer used to do silently, or the next deletion replaces it. If focus is inside the toast when the ✕ closes it, it is handed to the first row's hit surface; a pointer user's focus is left alone. Info-only notices (`showNotice`) keep their timer — nothing is lost when one goes unread. Verified live: toast still present 10s+ after delete; label "Dry Season deleted" at `text-transform: none` (closing P1's not-verified item); Undo restored the row; ✕ closed the toast, kept the deletion, and moved focus to the list |

Nothing remains open. The one deliberately unresolved question stays in Considered and
Rejected: whether the app-wide uppercase CTA voice should follow the library to Title Case —
that is a brand decision, not a defect.

## Considered and rejected

| Location | Candidate | Rejected because |
| --- | --- | --- |
| sort chips | Remove the `--line` borders ("headers should be plain labels") | Tried this session and reversed at user direction: the box edge is how a right-aligned header declares its column line. Recorded as load-bearing |
| AA badge | Restyle so it can't be confused with filter chips | The status ramp (filled/outlined/faint) is shared by four surfaces and must survive greyscale; adjacency was solved by the band split instead |
| filter toolbar | Roving tabindex (strict APG toolbar) | Membership changes under the index — removing a chip deletes the control it pointed at. All-tabbable is APG-acceptable and never strands focus |
| app-wide | Extend Title Case to the uppercase CTA voice (REFINE PALETTE …) | That voice is a system-level brand decision spanning every surface; changing it from inside one section's audit would fork the app's voice |
| toolbar | Move `Showing x of y` up beside the heading | It is the *result* of the controls beside it, not a fact about the library — placement states the relationship |

## Verification log

- `npm run build` ✓ (one intermediate JSX-comment syntax error caught and fixed)
- Geometry (JS, rendered): group 34 = Manage 34 · strip/head at 40 · stamp = Created chip at 810 ·
  AA Pairs 479 = value 479 · Max Contrast 612 = 612 · hover: trash 16 / folder 52 / gap 16
- Contrast (JS, WCAG relative luminance, light + dark): table above
- Keyboard: toolbar Left/Right/Home/End wrap ✓ · chevron reveals on `:focus-visible` ✓
- States walked: rest, filtered (chips + summary), hover, keyboard focus, dark theme

Second pass (03.08.26): build ✓ · Manage dialog rendered "Manage Projects" / Close / Add at 12px,
no transform · drawer rendered Done / Text-Ready chip (capitalize) / Clear Filter / "Showing 5 of
8 palettes" / Most Used · A–Z at 12px · pill transition resolves the `--ease-pill` bezier ·
projects group at a forced 150px clips mid-chip and scrolls; shadow layers confirmed in computed
styles (`local, local, scroll, scroll`).

Incident, disclosed: verifying the toast twice deleted a seeded palette (Garnet, then Dry Season)
and the 6.5s undo window expired between tool steps both times — which is what put P7 on the list.
Both records were reconstructed exactly from their seed definitions in pipeline.js (same ids,
hashes, swatches, OKLab math; Garnet's Unitgititi assignment reattached) and the library verified
back to All 8 · Unfiled 7 · Unitgititi 1.

Third pass (03.08.26, P7): build ✓ · toast persisted 10s+ past the old window · label rendered
"Dry Season deleted", transform none · Undo restored the row and closed the toast · ✕ closed the
toast, kept the deletion, handed focus from inside the toast to the first row's hit surface ·
library verified at All 8 · Unfiled 7 · Unitgititi 1 after the test deletions were undone or
reconstructed.

- **Not verified:** "Show All · n" rendered (only appears past 6 traits; source-verified) ·
  filtered-to-zero empty state · VoiceOver pass · 320px reflow (app gates <720px)
