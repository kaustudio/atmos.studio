# Decisions

Short, dated records of choices that are easy to re-litigate — or to have re-proposed by a bot.
A decision that lives only in a closed pull request gets made again by the next person who
doesn't know it was ever made.

---


## 2026-09-22 — The grid audit's fixes: the readout and AA on the columns, one gutter, one name

**By request, after a grid audit of the live site with the Shift+G overlay: "Build it all".** The
page grid (12 columns, 24px margin and gutter; 4 at 16px on phones) held almost everywhere. Twelve is
the right count, because the content uses twelfths, quarters, thirds and How it Works' 5/12 columns.

- **The palette's metrics readout** (Colour, Accessibility, Reading) was a flex row of 280px groups
  44px apart, and none of its edges met a column. It is now on the page grid, three columns a group
  (1–3, 4–6, 7–9), directly above a library table that has stood on the columns since 18.09. The gap
  between groups is the gutter, 24px.
- **AA Text Pairs takes two columns at 1280px and below.** Its badge and count need 84px and its label
  75, against a 59px column at 1024, so both spilled into the gutter and stood 10px from the name. The
  name gives up the column, as it did for Max Contrast and Created: 2 · 3 · 2 · 2 · 3.
  - The cost: from 1024 to about 1090px the longest example name, "Scorched Clear Morning", loses a
    few letters.
  - To make that graceful, names now shrink with an ellipsis while their Example and Viewing labels
    stay whole. Before, an overlong row would have been clipped at the cell's edge, labels first.
- **The reduced-motion Grid view** had a 20px gap and a centred 1200px frame, the only view with
  either. It uses the page gutter and runs margin to margin now.
- **Privacy and Terms.** The contents list is two page columns wide; at 13.75em it ended 8px past the
  second column's line. The hero's unused two-track layout and its 4em gap (`--toc-col`,
  `--grid-gap`) are gone.
- **One source of truth.** How it Works' text grid reads `--grid-cols` instead of a literal 12, and
  the `--row-grid` comment lists the spans the table actually uses.
- **One name for the picture.** Export's row was "Palette Image" while Share's said "Download Image".
  It is "Image" now, so under Export's Download heading it reads as Share's row does.
- **Kept, by earlier request:** the 8px gap between How it Works' six role cards.
- **Verified in Chrome, on the build:**
  - Every readout edge is on a line at 1440 and 1024.
  - AA's badge and label sit inside their track at 1440, 1366, 1280, 1152 and 1024.
  - The contents list ends on column 2's line at 1440 and 1280, and stacks at 1100.
  - How it Works has 12 tracks on a desktop and 4 on a phone, with the copy where it was.
  - There are no console errors.

## 2026-09-22 — Library takes Start here's size

**By request: "Make Library same size as Start here."** The Library title goes from 32px
(`--fs-statement`) back to 24px (`--fs-title`), the step Start here and the empty states use. The
token's own comment always listed Library under it. It went to 32 on 19.09, while the list button
stood beside it (at 24 its capitals were half the button's height), and it stayed there when the
button moved to the far edge. With nothing beside it now, the larger step only set Library apart from
the page's other section heading.

- The row stays 35.5px tall, set by Manage and List | Grid, so nothing below it moves.
- The 0.1em lift still centres the word's ink on the controls: 0.09px off at 24, where it was 0.20
  at 32.

## 2026-09-22 — Export stands Copy beside Download, and Semantic Scaffold says what it does

**By request: "We need to be careful the modal doesn't exceed viewport height", then "can we do 2
columns side by side to meet the height troubles".** Stacked, a palette's Export was 517px tall. At the
smallest supported window, 1024×640, its top sat 62px down, inside the fixed wordmark (39–65px), which is
drawn over dialogs. One more row would have put it under the wordmark.

- **Two columns for a palette.** Copy on the left, Download on the right, and the dialog is 760px wide.
  The clipboard and the file now stand in two places, so the two CSS Custom Properties rows differ by
  position as well as by their end mark (Common Region). A project's export has no Copy group and stays
  one column at 440px.
- **Palette Image joins Download** (PNG, a palette only). It is the card Share's Download Image makes,
  offered where people look for a file, and the two columns made room for the row.
- **The switch sits beside its name** ("Semantic Scaffold and toggle is too far from each other"), under
  both columns, since it governs both.
- **Its description is back, in two lines under the name.** "scaffold needs explaining for what it does,
  it just sits bottom left with no meaning." It went on 19.09 (audit X4), and after that nothing said
  what the switch changes: the names in every file and in the copied CSS, 01 to 05 by weight or six
  roles. A named choice at the top ("Token Names", By Weight | By Role, with the names shown beside it)
  was mocked and set aside for the sentence. It sits under the name rather than in the name's column,
  where it made the column as wide as itself and stood the switch 393px from its name ("it send the
  toggle too far away and let the copy sit below the headline"). The two lines break where the sense
  does: "Names colours by role instead of 01–05:" / "background, surface, primary, secondary, accent,
  text." It is set in the voice the note had: 12px, muted, 4px under its name.
- **The switch's accessible name was wrong.** It said the switch "adds six suggested roles", but it
  replaces the numbered names. It is now named by the words beside it and described by the lines under
  it, and the title that repeated the old claim is gone.
- **Measured:**
  - A palette's Export is 760×479. At 1024×640 its top is at 81px, 16px clear of the wordmark, with no
    scrolling. A project's is 440×414.
  - The switch is 16px from its name.
  - The note measures 5.55:1 in light and 7.17:1 in dark.
- **Verified in Chrome:**
  - Screen readers hear "Semantic Scaffold", switch, with the two lines as its description, checked
    false or true.
  - Tab runs Copy, Download, the switch, then close.
  - Switched on, the copied CSS carries the role names.
  - Checked in both themes, with no console errors.

## 2026-09-22 — The Library row's door says Manage

**By request, after a mock of the door carrying the word "Library": "We would have Library sit each
others opposite end. Library icon should just say Manage."** The row's title stays "Library" at one end
and the door takes "Manage" at the other, so the row names the surface once and the control names the
act.

- **Why it had no word.** The panel behind it does two jobs, filtering and managing projects, and every
  honest label named one of them; the mark drew the list and the accessible name said the sentence.
  "Manage" names the half the mark cannot draw, and "Library" would have repeated the title opposite.
- **It speaks the toggle's voice, not the chrome's**: 13px Medium in Title Case, as List and Grid
  beside it, so the two controls at that end read as one pair. Its case exemption sits with the
  segmented controls' in global.css.
- **The mark and the word are one unit inside the swap**, so they lift and re-enter together on hover;
  the applied count stays outside it, as it was, and follows the word.
- **Label in name** (SC 2.5.3) now holds by construction: every form of the accessible name opens with
  "Manage" ("Manage Library: filter palettes and organise projects", "Close Manage Library").
- **Measured at 1440×900:** 35.5px wide to 90.8, or 102.2 with a filter applied; the height stays 35.5,
  the gap to the toggle stays 8px, and the two centres are level. Checked at rest, on hover, on
  keyboard focus and with a filter on, in both themes.

## 2026-09-22 — The phone landing's headings break where the sense does, the rest in the soft ink

**By request: "adjust headlines on the mobile landing in same way as how it works."** The phone story's
five section headings were single solid lines. They now read as How it Works' do, and as the story's own
close already did: the instruction or the subject first, what completes it second, in
`.about-head__soft`:

- Start With / the Whole Image
- A Palette Is More Than / a List of Colours
- See Where / Each Colour Comes From
- Character, Role / and Contrast
- What Atmos Says / About This Palette

The soft line is 62% on a phone, because these headings are 22px there, normal text for contrast
(about.css's media query; 4.73:1 light, 6.89:1 dark). The words themselves are unchanged.

- **The hero is left as it is.** "Colour Read from Light and Atmosphere" already breaks after "from" at
  320, 375 and 390px, solid on both lines, as How it Works' headline now is. Its `h1` also changes to a
  palette's name when one is chosen. A split target whose text changes has to stay a lone text child
  (maskLines.js), so a `<br>` there would be a risk for nothing.
- **Verified.** At 320, 375 and 390px, in both themes, every heading breaks at the chosen point, the
  second line measures 62%, and the line reveal restores the markup intact.

## 2026-09-22 — A grid card closes on the reference's damped flip

**By request: "The close animation for the card needs improving as well. it's not as smooth as the
original reference."** The reference is Osmo's Infinite Dome Grid, whose spec is
`~/Downloads/no-gl-grid-skill.md`. It drives its flip from one progress value, damped toward its target
every frame at 0.1–0.14, and derives the side panel and the caption from that same value.

Ours tweened that value on the fold curve after a 60ms beat. Measured in Chrome at 1440×900 (frame
pacing was clean at 120Hz, so this is the curve, not jank):

| | Before (fold) | After (damped) |
| --- | --- | --- |
| Visible movement starts | ~125ms after the press | on the first frame |
| Shape of the travel | most of it in one 125ms burst (215 to 340ms), then a creep | fastest at the start, eases all the way in |
| Home | 600ms | ~730ms, the last ~200ms under a pixel |
| Frame pacing (six runs) | | every frame under 10ms, none over 12ms |

What changed:

- **The close is damped, the open is not.** `closeTile` now hands the value to the render loop, which
  damps it toward 0 at the reference's rate (`FLIP_EASE` 0.14, frame-rate independent like the pan). The
  card's live size, `--slide` and `--dim` follow from it as before. The caption and the photograph's
  blurred copies come back as a remap of it over the last stretch of the landing (a smoothstep over
  k 0.3 to 0). The open keeps its fold tween.
- **The words go behind the photograph.** With the panel now retracting from the first frame, its words
  (a layer above the card) were drawn across the photograph while they faded. While the card closes they
  are clipped at the photograph's edge, as the reference clips its text box at the image edge. They
  slide behind the picture with their panel, in wide and tall windows.
- **The words' box is the drawn card.** It was the element's width and height, which match the drawn
  card only at rest and when open. In flight the words rode up to 60px off their panel, which the old
  close had hidden by fading them before anything moved. The box is now the quad less the half gutter,
  so it matches the panel every frame. The open state is unchanged, and the Full Swatch View still lands
  on the strip within 0.02px.

**The corners where the photograph and panel meet follow the slide (by request: "we can't have it make
an instant switch to 0 during the transition").** Those four corners were forced to 0 for as long as
the card was open:

- A card squared them off in one frame as it began to open.
- On the way home, the photograph kept square corners long after its panel had gone behind it, then
  snapped back to 12px when the card landed.

They are now the card's corner times what is left of the slide (`--slide`, which the engine already
writes). Square while the panel is fully out, rounding back as it slides home, and already whole when
the open state comes off. Measured frame by frame at 1440×900 and 1024×1366:
- They stay at 12px as the open starts and are 12px on landing.
- The largest step between two frames is 1.5px (2px in a tall window).
- The outer corners never move.

## 2026-09-22 — The Full Swatch View closes home, into the card it came from

**The request came in two steps.** The Full Swatch View is the palette detail opened from a grid card.

**First: "Make sure the Full Swatch View in the Grid View reflects the animation out as smooth as the
create page."** Its close still used the exit the result stage dropped on 18.09:

- The bands sank on EASE.exit, an ease-in, so the first was 10% down at 154ms.
- The sheet then dissolved with the bands 100/93/78/64/50% down, and was gone at 600ms.

It took the create page's exit instead. The figures now live in `_exitSink` (motion.js), which the
result stage's `doReset` reads too.

**Then: "I don't like the fact that it closes on an empty surface. Can we accomodate so it closes on
some sort of surface within the interface".** The card the view was opened from is still open under
it, with the same swatches in the strip at the head of its panel, so the view now goes back into it
(`_ovFoldHome`, overlays.js):

- **Words first.** The words and the harmony marks leave first, over DUR.fast, because the bands are
  about to change shape under them.
- **No empty surface.** The view's background fades at once (DUR.state, EASE.reveal), so the card and
  the grid are there for the whole flight.
- **Each swatch lands on its own band.** Each band flies to its band in the strip on the card's own
  curve and length (EASE.fold, DUR.fold), the curve used for anything that changes size.
- **Corners and handover.** The first and last bands take the panel's outer corners as they land. The
  view is released over an identical strip, so the handover can't be seen.

**Measured in Chrome:**
- Every band lands within 0.02px of its strip band, at 1440×900 (landscape) and 1024×1366 (portrait,
  square corners there, as the panel has).
- The first change is on the first frame, every frame is under 16ms, and the view is released at
  ~510ms. Focus goes back to the card.
- A second Escape doesn't restart the exit (it runs once).
- A close pressed while the view is still arriving un-wipes each band as it flies.

**Details:**
- **The harmony marks.** They are `[data-ix]` controls, whose opacity transition chased the exit's fade
  a beat behind. They were still on the flying bands after the words had gone. `[data-overlay-stage]
  [data-leaving] [data-ix]{transition:none}` lifts the transition for the half second the view is
  leaving.
- **Not chosen.** Folding the view's background into the panel as well was shown beside this. The
  panel read as a blank box until its words came back.
- **The fallback.** The create-page sink stays as the way out only when there is no open card to go
  home to.
- **Reduced motion is unchanged**: the fade.

## 2026-09-22 — "New Project" heads the Project group while it is only the field

**By request ("should say Add New Project", then "Rename it to New Project").** With no project yet, the
Library panel's Project group is only the new-project field. Its heading read "Project" over a
"Project Name" placeholder, the same word twice. It reads "New Project" in that state. Once a project
exists, the group lists projects again and the heading is "Project". Edit mode also keeps "Project",
because the field there sits above the rename, export and delete rows.

## 2026-09-22 — A filter row that cannot narrow is disabled, and looks it

**By request: "put it in a disabled state, so the user get the idea nothing matches".** A row that cannot
narrow the library looks like this:

- **When it happens.** Every palette in view already has that value, so pressing the row can't narrow
  the library. The example was Text-Ready 4 in a library of four text-ready palettes.
- **Before.** The row kept its raised plate at full strength and only muted its words, so it read as a
  live row in grey.
- **Now.** The whole row takes the app's disabled look, the 0.42 of `[data-ix]:disabled` (the disabled
  Check Contrast button): plate, dash, label and count together.
- **Why the fade is in the colours.** It is done with ink and a plate opacity, never an opacity on the
  row. The row stays focusable, so a screen reader still hears why it can't be picked. An opacity on
  the button would also fade its focus ring, and the panel's reveal controls its contents' own opacity.
- **Where it applies.** It's one rule in global.css, so it covers every filter group's rows that can't
  narrow: Project, Text Usability, Lightness and Temperature. Measured in both themes: the ink is
  on-surface at 42% alpha and the plate is at 0.42.

**Every value stays, too (by request: "So elements still disappear completely").** Before, a value no
palette had was removed from Text Usability, Lightness and Temperature, so a group changed shape under
the reader: Dark simply left a library of light palettes. Every value stays now, disabled at 0, as an
empty project always did. The set of answers is fixed, and which ones are empty is the answer.

Measured on a library of four Text-Ready, warm palettes:

| Group | Rows |
| --- | --- |
| Text Usability | Text-Ready 4, Limited Text 0 and Accent Only 0, all three disabled |
| Lightness | Dark 0 disabled, Balanced 2, Light 2 |
| Temperature | Warm 4, Cool 0 and Neutral 0, all three disabled |

A click on any disabled row leaves every filter as it was. Lightness and Temperature rows used to apply
their filter on a click while they said they could not.

## 2026-09-22 — Copy lives inside Export, and its CSS is the file's CSS

**By request: "fix the mismatch and fold copy into export"**, after a Laws of UX review of Copy and Share.
The result row and the palette detail's footer each carried Copy, Export and Share, and Copy and Export
did the same job, getting the palette into your work in some format. The only difference was where it
landed. Two things were actually wrong:

- **The mismatch.** Copy's "CSS variables" and Export's "CSS Custom Properties" were two different files
  under two names: `--garnet-1` with a "Generated by" header on the clipboard, `--palette-garnet-01` in
  the download. Copy also ignored the Semantic Scaffold switch. Now there is one builder:
  `paletteCss(pal, semantic)` returns `buildCssFile`'s output, so the clipboard and the file match byte
  for byte in both modes.
- **Two doors for one intent.** Copy is now the first group of the Export dialog: Hex List and CSS
  Custom Properties under "Copy", then the five formats under "Download", then the scaffold switch,
  which governs both groups. The two labels are there because CSS Custom Properties appears in both
  groups, and only the group label says where it goes (Similarity, Common Region). The labels use the
  drawers' section-head style, and the gap between groups is three times the gap between rows
  (Proximity).

**Every row confirms in place, and the dialog stays open.** A download used to close Export while Copy
and Share stayed open and confirmed on the row, so this dialog would have answered in two ways. Now
every row says "Copied" or "Downloaded" for 1.5s, using the same timer, and focus goes back to the row.
Escape and the close button are the way out.

**Share stays its own button**, because sending a palette to someone is a different intent from using
it. The row is Add to Projects · Check Contrast · Export · Share. The folder export has no Copy group,
since there is no clipboard form for a whole project. Focus still opens on the first row, now Hex
List, so Export then Enter still does the dialog's job (audit X5).

- Removed with Copy: `CopyControl` and its label, the `copyMenuOpen` flag (state, Escape ladder, modal
  set, tour gate, wipe), `openCopyMenu`/`closeCopyMenu`, and the trigger's padding rule. The share
  sheet keeps the row style as `sheetItemStyle`/`sheetRowTint`.
- Verified in Chrome at 1440×900:
  - Primitive and semantic CSS on the clipboard equal the downloaded files: 213 and 300 bytes for
    Garnet.
  - All seven rows confirm and the dialog stays open.
  - Escape returns focus to Export from both the result stage and the palette detail.
  - A folder's export shows its five rows with no group labels.
  - Checked in both themes, with no console errors.

## 2026-09-22 — The phone picks show their selection outside the card, in the page's ink

**By request: "we can't have a dark border in dark mode. add 1-2px padding outside the selected swatch and
make it white in dark mode and black in light mode."** Under the photograph in See Where Each Colour Comes
From, the selected card was marked by a 2px ring inside it in the card's own ink — legible against the
colour, but the reader looks for the mark against the page, and a dark ink ring on the dark page read as
no mark at all. It is an outline 2px off the card now, in --on-surface: black on the light page, white on
the dark one, with 2px of page between ring and card so it never reads as the colour's own edge.

- An outline, not a shadow: the keyboard's focus ring on this control is an inset shadow ([data-focus=
  "value"]), and both show at once — verified with a forced :focus-visible on the selected card.
- It sits inside the grid's 6px gap, so it never touches the next card, and it is not clipped at the
  grid's edges (checked on the left-hand column in both themes).
- Measured: 2px solid rgb(26,26,26) at a 2px offset on the light page; 2px solid rgb(243,243,239) on the
  dark one, around a #0F0302 card.

## 2026-09-22 — How it Works' headings break where the sense does, the rest at half ink

**By request: "change the headlines on How it works so we make a break where it makes sense in the copy and
tint the fill color to 50% on the bottom copy, so we add a bit of hierarchy."** Every section heading was
a single line with its number above it, and the hero wrapped wherever the balance put it. Each now breaks
at a sense boundary — the subject or the instruction first, what completes it second — and the second
line is set at half the heading's own ink: the landing statement's cadence ("Colour Read from Light and
Atmosphere." / "In Seconds."), carried onto the document.

- Colour Begins / as Atmosphere · Start with / Colours You Like · How Atmos / Reads Colour · Reading /
  OKLCH · Reading / WCAG Contrast · Small Details / Can Stand Out · Similar Colours, / Different
  Possibilities · Find a Role / for Each Colour · See Frozen Slate / in Use · Contrast / Creates Hierarchy
  · Take Your Palette / into Your Design.
- A `<br>` and an inline span, not a block: the reveal groups words by where the browser breaks them and
  reproduces inline elements on both sides of a line, then restores the authored markup (maskLines.js), so
  the half survives the rise; a block would have added a line box of its own.
- `color-mix(in srgb, currentColor 50%, transparent)`, so it halves whatever ink the heading carries.

**Measured contrast, and the one place it falls short.** Half ink measures 3.27:1 in the light theme and
4.88:1 in the dark. On the desktop every heading is large text (34px, the hero 86px), where AA asks 3:1,
so it passes. On a phone the section headings are 22px Medium, which WCAG counts as normal text: 4.5:1,
and 3.27:1 misses it in the light theme. The hero stays large on a phone (34px) and passes.

**So below 923px it is 62% (by request: "use 62% on phones").** The boundary is where the headings stop
being large text rather than a phone preset: --fs-section is clamp(22px, 2.6vw, 34px), and 2.6vw crosses
24px at 923px, so an 820px tablet sets them at 22px too. Measured across it: 924px and up, half ink, 3.27:1
on 24px-and-larger headings, passing; 923px and down, 62%, 4.73:1 on 22–24px headings, passing; 6.89:1 in
the dark. Every soft line below the boundary takes 62%, the hero included, so one screen has one tint.

**And the thesis line under the hero is base ink, no tint (by request: "This should be our base black no
tint").** It was 58%, set lighter so it would read as the headline's thought continuing. With the
headline's own second line at half ink, the tint said the same thing twice and the thesis became the
quietest line on the screen; its smaller size carries the subordination now.

**The closing statement takes the same half (by request: "Apply the same tint for the copy here").** "Start
with an image." stays at full ink and "Discover its palette." drops to the soft line. That statement is not
revealed by the line splitter but by the sticky title, which splits into characters — and its splitter
took every node's textContent, so a tinted span was flattened out of existence the moment the scroll
began. It now builds an element's characters inside a shallow copy of it ([ATMOS 14] in
aboutStickyTitle.js), carrying the class onto the characters the reveal animates; plain text and <br>
split exactly as before, so the gallery rail's statement, which shares the splitter, is untouched.
Measured: 19 characters inside the shell at 50% on the desktop and 62% on a phone, every character at
full opacity once the pin has passed, the spoken label unchanged. The phone story's close says the same sentence through
the same module, and takes the same half by request ("apply the same tint to the phone"): 62% there,
as every soft line under 923px, in both themes. The span is React's and static, so the split and
restore leave React nothing to reconcile — checked across a case change, which rebuilds the story around
it with no errors and the tint intact.

## 2026-09-22 — One undo for every deletion, the tool's places in history, one question at a time

**From the UX review (by request: "fix the high and two mediums").**

**A double press deletes one palette, and Undo puts back everything deleted while the toast is up.**
The row folds away in 240ms and the next row slides up with its Delete under the pointer, so an
impatient second press, measured 350ms later, deleted a second palette. The toast held one deletion
and the next replaced it, so Undo brought back only the last one. Now:
- A pointer press on the same spot (within 12px) within 700ms of a deletion counts as the tail of that
  gesture and is ignored. A keyboard press has no position and is never held.
- Each deletion joins the run the toast is holding, palettes and projects alike. The toast counts them
  ("3 palettes deleted", "1 project and 1 palette deleted"), and Undo is named "Undo all 3 deletions".
  One Undo restores them in reverse, each to the index it left from, so the library comes back in its
  old order with its projects' members re-filed. The ✕ still lets the whole run go.
- A deletion that lands while the toast is leaving turns it round instead of losing its Undo.
- A deletion commits against the library as it stands when the fold ends, not as it stood when the
  press began.
- Pressing the toast no longer counts as a press outside the library drawer. A project is deleted
  inside the drawer, and its Undo used to put the drawer away and announce "Manage Library closed."
  over "Restored project …".

**The tool's places are in the browser's history.** Landing → Create → a palette used to add no entry,
so Back from a palette left the site, Forward came back without it, and a refresh landed on the start.
- The places are the start, an open palette, and, on a phone, the example the story is telling. Opening
  a palette or choosing an example adds an entry. Back and Forward reopen the place the entry names.
- A refresh reopens the palette the entry names, if the library still holds it.
- Processing is not a place. Back during processing abandons the reading, as New Palette does.
- The first place tags the entry the page opened on, so Back from the start still leaves the site. A
  palette that takes the place of one just deleted takes its entry too.
- The place is stored beside the route and scroll navigateTo keeps, so it survives a trip to /about and
  back.

**The tour's invitation waits for the analytics banner's answer.** The banner already waited for the
tour, but not the other way round: a visitor who scrolled the landing was asked there, pressed Create
with the banner up, and got both at once. The invitation now comes 400ms after the banner has gone, and
only if the reader is still on the overview with nothing open. A reader who opened a palette in the
meantime has already started, so the offer is dropped rather than held; it is not recorded as given,
and Take a Tour in the footer is there either way.

---

## 2026-09-21 — The masthead's links and New Palette are 13px

**Back Up and Restore take --fs-body (by request: "change top navigation font-size links to 13px"), and
New Palette with them ("change new palette to 13 as well").** All three were --fs-detail (12). The links
stay Medium, flat-tracked, in their own case, centred in the bar, 12px after New Palette, in the tool's
bar, on the front page and in the documents' bar. New Palette's inset is in ems, so its pill grows with
its label: 33.5 × 112.8px (was 32 × 104.9), still centred. The tour card's Skip keeps 12.

---

## 2026-09-21 — The close keeps its takeover on a phone, small jumps and all

**A scroll-through close was built and taken back out (by request: "undo i can live with the small jumps
it worked better").** After the iPhone report that the close jumps as the page settles between holding
and moving on, the close was made, on touch-only devices, a centred screen that scrolled with no hold,
its statement played once as it arrived, handing over at the end of the gallery's empty tail. Tried on
the phone, the takeover's stop worked better. The close is the takeover again everywhere: the gallery's
pin, the handoff under it and the sticky statement, as before. Don't propose removing the stop on
phones again without being asked.

---

## 2026-09-21 — GSAP's normalized touch scrolling was tried on the pages that pin, and removed

**Tried by request ("try normalizescroll"), after anticipatePin, for the iPhone report that the close
"jumps or shakes" scrolling to the footer and back up in Safari.** `ScrollTrigger.normalizeScroll`
takes a touch scroll off the browser's own thread and runs it in JavaScript with GSAP's momentum, so
the gallery's pin and the scrubs move in the same frame as the page instead of a frame behind a scroll
Safari has already drawn, and the address bar stops collapsing and reappearing under the reader.
Pinch-zoom is kept (`touch-action: pan-x pinch-zoom`).

**Held, not global** (`methods/touchScroll.js`): only on a touch-only device, never under reduced
motion, and only while a surface that pins is on screen: the phone story, which lets go while its image
chooser is open so the chooser keeps its own swipes, and /about while its gallery is built. When nothing
holds it, it is switched off and the browser scrolls natively. Measured in phone emulation: a 450px
swipe moves the page 413px under the finger and GSAP's momentum carries it on; taps, the chooser and the
reduced-motion floor are unchanged; swiping to the foot and flicking back up moves nothing in the
document. The feel of the momentum, and whether the jump is gone, are judged on the phone itself.

**Removed the same day (by request), with the scroll-through close.** It did not cure the jumps, and
with the takeover's stop kept, small jumps and all, it was not earning its place: phones scroll with
Safari's own momentum on every page again. `methods/touchScroll.js` is gone. The rail pin's
`anticipatePin: 1` stays; it changes nothing but when the pin engages.

---

## 2026-09-21 — The credit waits for the page's window, and the story drops its Warm · Dark line

**The front page's credit arrives after the window, not through its corner (by request: "analyze the
transition from 'Explore another Example' to the story mode as it seems the thumbnail appears at the
bottom. just make sure the transition is fluent").** The page transition brings the destination up
inside a rounded window that opens from the bottom centre, and the credit's 128px photograph sits at
the page's bottom-left: recorded on a phone, it was the first solid thing the window uncovered, a
hard-edged square cut by the slot's corner from 0.6s while everything else was still field and centred
copy. `_wipeCover` now holds it while the window opens and eases it in once the window has landed
(1.0s into the gesture, `DUR.reveal` on `EASE.entrance`, rising 12px), so it is the last beat of the
arrival: hidden until 1.1s, fully in by 1.6s. The hand-off is a zero-length call on the timeline, so the
gesture still ends when it did, and the watchdog restores the credit if the window never lands. Every
crossing onto the front page takes it; a first load is untouched.

**No Warm · Dark on the phone's exploration (by request: "Remove this across color exploration on
mobile").** The descriptors line under 1.1's sentence is gone from the story, for every example. The
shared-link view's trait chips and the desktop grid's panel keep theirs.

---

## 2026-09-21 — The theme switch lights nothing on a phone, a new exploration starts from the top, and the gallery pins early

**No circle behind the switch after a tap (by request: "On mobile, when clicking the mode toggle it adds
a shadow circle on top").** A phone keeps the element it tapped in `:hover` until the next tap
elsewhere, and Button's hover fill comes back wherever its label swap does not run, touch and reduced
motion, so a Button with a label still acknowledges a press. The switch has no label: its track
answers hover and press itself. Its opt-out from the fill (and from the press tint) sat inside the
swap-only `(hover:hover)` gate, so on a phone its whole 32×36 pill stood lit at 16% behind the track
after every tap, plain on dark. The opt-out applies on every device now.

**Choosing an example starts the story again (by request: "When navigating between explorations on
mobile, previous actions and animations are not reset").** The reading tab carried over from the last
example (a story told about Garnet opened on Role if Hard Gunmetal had been left there), and choosing
the example already on screen rebuilt nothing, so its reveals and counts stood finished. The story is
now keyed on the case and the telling (`storyTell`, bumped by choosing an example and by the mark), so
every new exploration is fresh markup with every module built against it, on Character, with nothing
picked, at the top.

**The gallery's pin is taken a moment early (by request: on an iPhone, in Safari, the close "jumps or
shakes" scrolling to the footer and back up).** Nothing re-measures on the way: ScrollTrigger ignores
the address bar's height-only resizes on touch, and the site's own resize handlers are width-guarded or
measure nothing. What an iPhone does differently is scroll on its own thread with momentum, while the
pin is switched on in JavaScript; coming back up, the scroll reaches the pin's end before the switch
lands, and the stage, with the close laid over its end by the handoff, is drawn a frame unpinned and
snaps. `anticipatePin: 1` on the rail's pin switches it ahead of the scroll in both directions. The pin's
range is unchanged on the phone and on /about. It could not be watched in Mobile Safari here (no
simulator on this machine), so it is confirmed on the phone itself.

---

## 2026-09-21 — Every share counts up, and the front page's reference image is 128px

**Every share counts up out of the blur (by request: "Make sure all numbers are cohesive so they have
this progressive blur animation").** "The numbers" has meant the colour shares both times this was
asked before (the result stage, then grid view), and three of them still just appeared, all on the
phone: the story's colour picks, the story's Role tab, and a shared link's view. They take Osmo's
odometer with the figures the rest use (1.4s a count, 0.2s between counts, the 9px focus blur). The
picks count on the same trigger as the key's tiles above them; the Role tab counts when it is
pressed, as its cells rise; a shared link counts as its view appears, since it has no entrance of its
own and a share link never shows the loader. Contrast ratios count nowhere in the product, on
/about, in the story's Contrast tab or in the tool's drawer, so they were left alone.

**The picks wait for their masks.** A pick is drawn as a plain cell until the photograph's masks
settle, and settling turns a colour with a region into a button, which React builds new. An odometer
built before that counted the cards it had replaced, off the page, while the ones on screen never
moved: three runs in four, measured. The picks become a count group only once the masks have settled
(`picksFinal`), and a group that arrives after the story's modules are built gets its own count
(`_storyCountLate`). Six runs after the change, all six rolled.

**The front page's reference image is 128px (by request: "Increase reference image size on the
frontpage (128px) and add a break after Based on").** It was one grid column clamped at 56 and 96px,
so 94px on a 1440 screen and 74 to 78 on a phone; now it is 128 by 85 everywhere, with the name on
its own line under "Based on". On a 375×667 phone it still sits 70px under Explore an Example. The
thumbnails were re-cut at 384×256, three times the new box, with the crop and quality of the first
cut (q 0.8 reproduced all eight old files to the byte): 3 to 12 KB each.

---

## 2026-09-21 — The smallest labels are 12px, and the tick draws itself

**The smallest labels went up a pixel, on the token (by request: "Are the labels inside the drawer
same size as other labels? If possible token-wise increase them 1-2px maximum globally").** They were
not: the Library drawer's group heads and counts were `--fs-fine`, 11px, beside the harmony drawer's
12px heading (`--fs-label`) and the list's 13px column heads. `--fs-fine` is now 12px everywhere it
is used (the tiles' value labels, "White Text", the harmony hexes, the cards' metric labels, the
badges, /about's tiles) and shares its size with `--fs-label` and `--fs-detail`. The three names stay:
they are roles, and a later change may move one without the others. One pixel, not two: at 13px the
labels would be `--fs-body`, the size of the values the tiles' capitals name, and capitals at the
same size read larger than what they label.

**Nothing new wraps or clips.** Every 11px element on live was set against this build at 12px (the
list, the Library drawer, the result, both drawers, /about, and the phone's OKLCH lines) and none
wraps, clips or spills. The AA badge did not fit, and never had: at 11px its content already sat
3.8px into its padding. Its slot, `--row-aa-mark`, went from 44 to 50px, which fixes both.

**The tick draws itself, in and out (by request).** Osmo Supply's Animated Checkbox, on the Library's
rows and in Add to Projects. The box does not jump ("Checkbox shouldn't scale, it's only the icon that
needs animated"), and the tick leaves the way it came ("Same animation in and revert it out"): the
long stroke retracts first on its overshoot curve played backwards, then the short one, then the
fill. With reduced motion on, the tick is there or it is not; the global reduce rule cannot reach
::before/::after and keeps delays, so the block carries its own.

---

## 2026-09-21 — The tour waits for the reader's press

**The reader opens the drawers (by request: "it's important that the user presses the buttons actively
that moves them to the next step. Otherwise they start reading and then the modal suddenly moves").**
Steps 2 and 3 used to demonstrate: the ring and a mirrored hover sat on Check Contrast or a harmony
button for a beat, then the tour opened the drawer itself and the card travelled to it — a second
move, a second after the copy had landed, under someone who had just started reading. Now the step
opens on the control and waits. The card does not move until the reader presses something.

**It says what to press, and then what to do (by request: "we also have to instruct the user", and
"it doesn't make sense to tell them to press a button after it's pressed").** Each drawer step has
two sentences: "Press Check Contrast…" / "Press the harmony button on any colour…" while the drawer
is shut, and what to do inside it once it is open. They swap through the masks, only ever on the
reader's press; shutting the drawer brings the instruction back. The ring stays on the control and
one pass of its own hover plays as the step lands. Next is disabled — not absent, so the row keeps
its shape — until the drawer has been opened in this run, and stays live after.

**The UX review's four findings, fixed.** Steps 1–3 no longer ask for actions the interface does not
have: there is nothing to select on a tile (the copy points at the copy buttons), no pair to pick in
the contrast drawer (it points at AA/AAA and the text size), and the reader now really does choose
the colour whose harmonies open. Step 5's primary is New Palette, the act the step is about — it does
what the masthead's does, no file dialog — with Finish Tour in the quiet slot. Steps 1–4 share one
place on the result stage, beside Export, which was the one clear space; step 1 no longer covers the
palette's name. And coming back to the tool from a document with a step live scrolls the step's
subject back into view and returns focus to the card.

**The keyboard follows the same path.** Tab from the card reaches the control it points at, and
Shift+Tab comes back; once the drawer is open, the card joins the drawer's focus loop, so Next can be
reached without Escape (which ends the tour). With no step opening a drawer any more, the drawers'
keepFocus option went too.

---

## 2026-09-21 — The button is called Button, and it has one height

**Renamed (by request: "rename it so it matches design system naming conventions").** B006 was the
Osmo Supply resource's catalogue number, Button 006, and the number had spread into the component
(`B006`, `B006Text`), its classes (`.button-006`, `.b006-swap`), its fifteen custom properties
(`--button-006-*`) and the label helpers (`contrastB006Label` and the rest). It is `Button` now:
`ButtonText`, `.button` with its elements (`__default`, `__hover`, `__text`, `__bg`), `.button-swap`,
`--button-*` and `data-button` — the word the system's own vocabulary already used for it, beside the
action tiers and `data-emphasis`. This departs on purpose from keeping Osmo code verbatim: the
resource's structure and behaviour are unchanged, only its names are the system's. Entries below this
one keep the old name, as history.

**One height (by request: "every button that is built on the b006 should match the design").** The
2px-shorter inset the rows of acts took on 20.09, through an override on `[data-voice="banner"]` and
`.consent`, is every Button's own now: `--button-padding-block: calc(0.75em - 2px)` at :root, read by
the default, by the primary tier's `--action-primary-padding` and by every variant, which state only
their sides. Measured after: every act still 31.5px; the masthead's New Palette 28px (was 32) and
Export's filled switch 32px (was 36), the same inset at their 12px type. The front page is the one
exception, by request ("buttons on the front page should stay as-is with the glass effect"): its only
Button is the glass theme switch in the floating bar, and since that is one control on every route it
keeps its 0.75em block and its 36px everywhere. The landing's glass calls to action are `.glass-cta`,
not Buttons, and were never touched. The override had the same specificity as
Copy's optical sides and came later in the file, so from 20.09 Copy stood 17.7 and 19.2px ink to edge
instead of the 12 and 13 it was tuned to; with the override gone it is back at 12 and 12.9.

**The harmony drawer's acts are Buttons.** Save as Palette and Copy Harmony were ordinary buttons drawn
to look like one — `--btn-pad-md` inside a 1px border — and had drifted to 35.5px. As Buttons they take
the inset, the hover and the two tiers from the component, and their row speaks the dialogs' voice like
every other pair of acts.

**New Palette is the second exception (later the same day, by request: "For the "New Palette" button,
make an exception and add 1-2px top and bottom. Feels a bit cramped").** Of the 1-2px, 2: its block is
the token plus 2px, 9px at its 12px type, so it is 32px tall again, the height the one-height change
took it from. 1px (30px) was compared on the bar and still read tight. The rule is the masthead's own
(`.glass-bar .button[data-emphasis="primary"]`, which only New Palette matches, in the tool's bar and
the documents'), written as a step on the token so it stays 2px roomier than every other Button if the
token moves. Every other Button keeps the one height.

## 2026-09-18 — The orb is twelve points, not the reference

**Asked for "less circles, or in some way adjust it — I don't want it to be 1:1 to the original
reference".** Four variants were recorded side by side at 20px and at 4x, in both themes: the Thinking
Orbs thinned to half their dots; the same in the page's ink; a ring of eleven dots echoing the smoke
ring; and one sphere of twelve points. The user picked the sphere.

**One body for the whole reading.** The reference builds a different construction of forty to sixty
dots for each state. This is the twelve corners of an icosahedron in `--on-surface`, depth carried only
by opacity and size, and it stays the same object through all four steps: a light crosses it while the
light is read, single points lift and settle while the field is sampled, the points run together into
one mark per swatch while the colours are grouped — each mark's area is that swatch's share of this
photograph (`data-orb-groups`, set by the grouping step) — and it breathes while the mood is named.

**Started once per reading, and followed in place.** The app no longer restarts it on every step: React
updates `data-orb-state` and `data-orb-groups` on the same canvas and the module's observer eases out of
the current pose. The lifecycle code is adapted from the reference, so its MIT notice stays in
`thinkingOrbs.js`; its easing and durations are local copies of motion.js's figures.

## 2026-09-17 — The atmosphere flows, wears the page's ink, and sits

**It is a simulation now, and it answers the reading.** Asked to make it "more lively and expressive …
the feeling that something special is being generated", four directions were built end to end in
separate copies of the app, recorded, critiqued and shown side by side: the volume given four
materials, a particle accretion, a light that reads, and a smoke-ring flow. The user picked the flow.
`smokeFlow.js` advects a density-and-tone field on a polar grid over the disc's own plane, so the ring
curls, sheds wisps and REMEMBERS an impulse; `nebulaField.js` renders it through the same camera,
march and strip as before, behind a flag the landing never sets. The four steps are four beats
(`_procStep`): a light passes round while the light is read, taps are drawn into streaks while the
field is sampled, the arms give way to one eddy per swatch — sized and spaced by that colour's share,
toned by its lightness, never its hue — while the colours are grouped, and the band breathes for as
long as the naming takes, because that is the one step whose length nobody knows.

**It is made of the page and its ink.** The strip runs in OKLab from `--surface` to `--on-surface`
(_procRamp), so the deepest smoke is the primary black on paper and the primary white on the dark page,
the ink's own faint warmth included. It replaced the landing's five-rung ladder, which stopped at a mid
charcoal and a near-white — tones near the primary rather than the primary. The ceiling that held the
lit gas short of it is gone, and the 2D fallback floor takes three tones off the same line.

**It sits.** Three endings were asked for in turn: contract to 0 while dissolving, then "let it not
scale down at the end, let it sit", then "just let it sit and not dissolve at the end". So the end is
now only the bar completing and `DUR.settle` passing: the ring keeps its size, its flow, its turn and
its full strength, and what ends it is the result arriving. The scale-out, the inward drain and the
spin-up went with it, and so did the floor's departing fade.

**The status line speaks in the CTA's voice, and the square is an orb.** The four lines were set in the
default control voice — uppercase, Regular, flat, `--fs-label` — which is the voice of a metric label;
they are the tool saying what it is doing, so they take the system's one statement voice (Medium,
`--fs-cta`, `--track-statement`, case authored in the words). Beside them, the 7x7 square that had not
blinked since its keyframes were removed is replaced by Jakub Antalik's Thinking Orbs — the
dependency-free vanilla adaptation, adopted whole with its MIT notice, minus its `DOMContentLoaded`
auto-init (`thinkingOrbs.js`). One 20px canvas whose state follows the reading: searching, working,
solving, composing. It is `aria-hidden`, because the line beside it says the same thing in words and
the stage already announces each step; `data-orb-theme="auto"` resolves against the `data-theme` this
app already sets, and reduced motion gets one still frame, which is the answer the atmosphere gives.

## 2026-09-17 — The audit's fifth round: the lows, no standing sentences, round filter rows

**No standing sentences, and no toggletips (by request, audit H5).**
- Four panels printed a sentence under their title: the shared-link strip, No palette matches,
  Nothing here yet, and Manage Library's Nothing to filter yet. Round five moved each into a
  toggletip; on review the toggletips were removed too, so each panel now has its title alone. The
  strip's title is "Shared with you".
- This is the second time toggletips were taken out (the Library heading's storage marker and
  Manage Library's ⓘ went earlier). Don't reintroduce them. The component, its state, the tip
  helpers in persistence.js and the 24px hit-area rule are deleted.

**A corner is sized for its box (by request).** Start here and the error panel are 420px tall and
keep 28px (`--radius-surface`). "Nothing here yet" and "No palette matches" (radius issue R1) are
the same dashed panel but 162 and 166px tall, and 28px read too strong at that height, so they take
`--radius-panel` (16px, the user's pick after 12px). They were fully round (A8), then 28px, then
12px. Don't give a box the corner of the box beside it; pick the corner for its own size.

**How it Works' pair matrix pills speak like the phone story's verdict chips (by request, H6).**
`--fs-body`, Medium, flat, in Title Case (Body Text at AA, Large Text and UI at AA, No WCAG Contrast
Role), where they were uppercase at `--fs-fine`. 3.3's checks use the same pills (`.about-checks__verdict`)
where they were plain uppercase labels; the old `.about-checks__use` rule is gone.

**The corner-radius issue (a separate artifact).** Five findings changed something:
- **R1:** see the dashed panels above.
- **R3, the cards:** the grid view's cards and How it Works' gallery cards (desktop and phone). The
  corner is further down.
  - The grid's white caption band is gone. The photograph runs to the edge, and the name sits on its
    foot over a progressive blur and a dark tint (`TILE_FADE` in AppView, and `.about-rail__fade` /
    `__tint` in about.css). The tint is deep enough for white type on High Key.
  - Names are one step larger: 20px on the grid, 24px in the gallery. The reduced-motion grid and
    the list row stay at 13px, because a larger name truncated there.
  - /about's cards lose the "Body text AA / Large text and UI AA" line. Later the same day the
    phone's "Warm · Dark" line went too (by request).
  - The blur is two blurred copies of the photograph, not `backdrop-filter`. On the grid's moving
    field, `backdrop-filter` measured p95 16.7ms against 8.8ms. The engine fades the copies with the
    caption when a card opens, and the photograph no longer moves (the hero's `bottom` stays 0).
- **R5, the role tiles:** How it Works 3.1 and the phone take `--radius-card` (12px, new). 28px was
  "too intense". The swatch takes the same corner less its 8px inset (4px), with 20px under the copy.
- **Kept, by request:** R2 (the feature pills' 20px), R4 (the library list's square rows), R6 (the
  contents' tint and rule) and R8 (the transition window's 3em).
- **R7, one token:** `--radius-dropzone` is merged into `--radius-surface`, so the dialogs,
  drawers, banner, Start here and the error panel share one 28px token.
- **R9:** the analytics banner keeps its 28px (by request). The share notice ("A share link is a
  snapshot, not a backup…") is removed, because the Share button's Copied state confirms the copy.
  The notice bar stays for errors and the other confirmations (the user chose this).
- **R10, the contrast checker (by request):**
  - The matrix's ✓/✕ marks are gone ("they ruin the layout").
  - A pass sits on a 14% ink fill with its ratio in Medium ink. A fail has no fill and a muted
    Regular ratio. That is two cues, fill and weight, and the fill eases when a toggle moves a
    verdict.
  - The drawer's chips, text-on-colour rows and sample take `--radius-swatch` (3px, new).
  - How it Works' photo cards have no swatch strip (by request, R10 and R3): the palette's name
    stands alone on the desktop and the phone. The strip wore the same 3px until it went.
  - The contrast checker's "Text on each colour" label is gone (by request). The rows still name
    their colour and the text that reads on it. The 3px corners stay.
- **R3, the corner (by request):**
  - The grid view's cards (300×344) and the reduced-motion grid's cards take `--radius-card`, 12px,
    the figure approved for them. 28px was put on them by mistake with the note below and taken off.
  - How it Works' photo cards (374×499 on the desktop, 280×373 on the phone) take
    `--radius-surface`, 28px. 12px was "too subtle" at that size. The figure is not approved yet.
  - When a grid card opens, the two corners it shares with its panel go square.
  - How it Works' photo cards lose their 1px stroke too (by request), on the desktop and the phone,
    so the photograph is the edge as on the grid. Their corner stays 28px. The error panel keeps
    28px, the same as Start here (R12, confirmed).
  - The grid cards have no stroke (by request): the box has no border and no fill, so the photograph
    is the card's edge. The open panel keeps its hairline and is invisible until it starts to slide,
    because a hairline under the photograph would show at its anti-aliased edge. The hover ring now
    sits on the photograph's edge. How it Works' photo cards still have their 1px stroke.

**The palette's acts speak in the banner's voice (by request).** Add to Projects, Check Contrast,
Copy, Export and Share take the dialogs' button type — `--fs-body`, Medium, Title Case, flat
tracking — where they were the uppercase `--fs-label` voice. The row carries `data-voice="banner"`,
which is how every other surface asks for that voice, so the case and weight come from one rule in
global.css. It is the same row on the result stage and on the fullscreen detail, and the open grid
card's foot takes it too ("Open Detail", whose accessible name now opens with the visible label,
SC 2.5.3).

**The landing's credit, How it Works' photograph, and where a palette's source sits (by request).**
- The landing's thumbnail takes `--radius-swatch` (3px): it is 56 to 96px wide, where Start here's
  proportion gives about 4px. Its inset ring takes the corner with it. The line under it is the
  buttons' type, `--fs-body` at Medium with flat tracking, where it was a 12px regular line.
- How it Works' hero photograph takes `--radius-surface` (28px), on the plate and on the travelling
  target, so the corner holds at both its sizes (448×252 in the hero, 1392×783 below it). One figure
  rather than two, because Flip animates the box and a corner changing with it would be a second
  thing moving.
- A generated palette's reference image moves above the readout's hairline, onto the row with the
  name it came from. It keeps its 156×104, its right edge, its fade and its click-to-zoom.

**The landing's statement reads at its own heading's size (by request).** The h1 has carried
`--fs-landing` (40px at any width the landing appears at) while both of its lines overrode it with
`--fs-statement` (32px), so the statement read at 32 and the 40 set the line-height of nothing. The
lines inherit now, which is the next rung up and the size the loader's count beside it already uses.
At 40 the first sentence takes two lines, so the statement is three lines where it was two.

**A document's copy is still arriving when the window has opened (by request).** The page transition
released a document's reveal 0.2s in: measured, the hero's four masked lines finished at 1.27s
against a window that finishes opening at 1.45s, so the page had stopped moving before the
transition ended. `_wipeCover` takes the beat from its caller now (`revealAt`), and a document route
passes 0.65: the lines start at about 1.1s, inside the opening slot, and land at 1.73s. The tool
keeps 0.2, where what it releases is one drop rather than a cascade.

**The harmonies drawer speaks like the other controls (by request).** Its seven model pills take the
segmented control's type — `--fs-body` at Medium, in the case their labels are written in — where they
were `--fs-fine` at 400 in capitals (`toggleStyle`, whose only consumer they are). `data-hx-cell` joins
the list in global.css of controls that keep their own case, which the drawer's two acts share, so
Save as Palette and Copy Harmony read as written and take the same size and weight. Their accessible
names now open with those labels (SC 2.5.3).

**The library list's swatch has no hairline (by request).** The 24px strip at the head of a row drew a
1px `--line` edge (`--ink-fill-line` on the inverted row). It was there because a pale palette's outer
band sits at about 1.3:1 against the row, so its end can be hard to place; the row's own rule still
closes the object.

**How it Works' opening closes on its photograph (by request).** The hero ruled its own foot with a
full-bleed hairline under the reference image, drawn on arrival with the page's other rules. It is
gone: the photograph is the edge of that block, and a line a hundred and fifty pixels beneath it was
ruling an edge the image had already drawn. The band gap carries the separation. `initPageReveal`
takes `heroRule:false` so nothing tweens a `--rule` that no longer paints, and the hero needs no
containing block; the legal documents keep theirs, where the hairline rules a title rather than an
image.

**That photograph drifts inside its frame (by request).** It is 124% tall and pulled up 12%, the
geometry the page's other masked photograph already uses, and aboutFlip pans it ±7% against the
scroll — the figure the section band uses, chosen from 3, 5 and 7 — so the two images move by one
rule. 89px of travel at 1440, 29px on a phone, and the slack never runs out: the tightest point
measured leaves 8px of picture beyond the frame. The drift is keyed to the destination frame's own
traversal rather than to the flip's range, so it carries on after the photograph has landed instead
of stopping at the moment it arrives; it cannot be written in aboutParallax's data-* API, which
looks for its target inside its trigger, because the frame this image is measured against does not
contain it until the journey is over. Under reduced motion, and without JS, the picture sits centred.

**How it Works, 1.1 to 1.4, in supplied copy (18.09.26).** Four sections rewritten to the words
given, not edited from them.
- 1.1 loses "picking them out by eye is slow" for what the reader does next: choose which colours to
  take into the design, and check contrast if they are for text and backgrounds. Its closing
  paragraph, which was not named, stays.
- 1.2 states what each lens does and what each is for, in two paragraphs where there were three. The
  argument it dropped — that neither answers alone — is what the figure beside it draws, so it is
  made once rather than twice.
- 1.3 names the three properties in its opening and defines each one under its own ramp. All three
  notes are the supplied text.
- 1.4 runs four paragraphs: what contrast is and the range it sits in, what each threshold is for,
  what a pair below 3 to 1 may still do, and that meeting a requirement is not the end of it.

**Ratios keep the page's own notation (by request).** The supplied copy wrote them 4.5:1; the page
writes them "4.5 to 1" in twenty-two places, including the threshold list directly under 1.4's prose
and the 6.09 to 1 in 1.2's figure. The seven in the new copy were converted, so the page has one
form for a ratio, twenty-nine of them.

**2.1 and 2.2, in supplied copy (18.09.26).**
- 2.1 opens on what the reader notices rather than on how conventional extraction works: the largest
  areas are not always what catches the eye, and Atmos shows proportions, properties and contrast to
  decide what to emphasise. Two paragraphs where there were three.
- Its caption is two paragraphs on 3.4's pattern, each its own reveal block, both in the caption's
  own type. It no longer recites 77.7, 22.3 and 5.6: the key under the bar prints all five shares and
  its aria-label reads them, so the words say what the shares mean instead of repeating them. What
  they point at is the printed figures — the pale colour at 77.7%, and the highest chroma (0.141) at
  5.6%, small and not the most common.
- 2.2 states what lightness and chroma do for a design and hands off to the three cards. The lead
  quoted in the merge note above it went with the old prose; the merge itself stands.

**Seven headlines, in supplied copy (18.09.26).** 1.1 Start with colours you like, 2.1 Small details
can stand out, 2.2 Similar colours, different possibilities, 3.1 Find a role for each colour, 3.3 See
Frozen Slate in use, 3.4 See how lightness separates colours, 3.5 Take your palette into your design.
They are sentence case where the page's were Title Case; 1.2, 1.3, 1.4 and 3.2 keep theirs, by
request, so the page runs both.

**The interval rail is gone (by request).** 3.4 asked what its own diagram's caption already said —
the diagram orders Midfield by lightness, larger gaps are larger differences, compare then check
contrast — and the answer was to delete the section rather than choose between the two. With it went
aboutIntervals.js, its wiring in AboutPage, the 9.9KB of about.css that grew each gap to its OKLab
step, and the page's own notes about both. Part 3 is four sections: Take your palette into your
design is 3.4 now, and keeps the prose it had — the supplied replacement was withdrawn in the same
answer. The page is 4KB smaller and 1.4k pixels shorter.

**How it Works' eight photographs come from their 4K masters (by request, 18.09.26).** The page drew
900px files everywhere, a third of what the landed hero needs on a retina screen (2780px at 1440),
and their compression blocks showed as smears along every edge. All eight are re-encoded from the
3712×4928 originals with Chrome's own libwebp through Playwright — the repo has no image encoder —
into public/assets/examples/about/. The app's seed files in public/assets/examples/ are untouched:
pipeline.js resolves the eight seeds against them and each seed carries a hash of its image.
- The hero (profile-ember): 800, 1200, 1600 and 2400 at q76. The markup's `sizes` describes the
  plate, so the first paint takes the plate's file (30 KB at 1440 on retina); aboutFlip restates
  `sizes` as the landed frame's width once the page has loaded, and the browser swaps the 2400 in
  when it has decoded. Measured: requested at 824ms against a load event at 347ms. A 3200 was cut:
  556 KB of film grain in a motion-blurred photograph, which nothing on screen resolves.
- 3.3 (profile-sky): 1200, 1600 and 2400 at q85 — a gradient and a silhouette, 19 to 64 KB. Its
  `sizes` is 1.17 times the box, because cover fills the 124%-tall inner by height.
- The rail: one file per card, and the blurred foot shares it, so each card is one request as it
  always was. The six examples at 1000px q78 total 369 KB against 364 KB for the 900px files they
  replace; the two profiles use their 1200, which on most screens the hero plate has already fetched.

**How it Works' headlines are all Title Case (by request).** The six supplied in sentence case are
set in the house form, which is Chicago's, as the landing's "Colour Read from Light and Atmosphere"
already has it: prepositions of any length lower case (with, into, for, in), articles too, and a
verb's particle capitalised (Stand Out). Figure labels, list labels and notes are not headlines and
keep their case.

**The Frozen Slate preview wears the site's own shapes (by request).** It had been drawn as an
interface in general — square corners, a hairline border, uppercase labels. Now the frame takes the
short panels' 16px and the card `--radius-card`, and the two actions are the system's tiers in the
banner voice: Primary a filled stadium on `--action-primary-padding`, Accent the secondary tier's
outlined stadium, 13px Medium, Title Case, 35px tall as the consent banner's Accept and Decline are.
The colours are still the palette's roles, so 3.3's four checks describe what is drawn. The frame
keeps an edge as an inset 14% hairline, the swatch idiom, because Frozen Slate's ground is #000 and
would otherwise vanish into the dark theme's page.

**3.3's photograph takes the hero's corner and loses its ring (by request).** `.about-shot` is
`--radius-surface`, as the opening plate is, and its `::after` inset `--img-outline` hairline is
deleted. `isolation:isolate` on the clip is the usual guard against WebKit letting a will-change
child escape a rounded overflow; the corners were verified in Chrome by pixel, and WebKit is not
installed here to check.

**The phone story's photograph takes the same corner (by request).** `.story-mask`, the one place the
story shows an example's picture (1.3, where a colour's region lights up), is `--radius-surface` with
`isolation:isolate`, 358×269 on a 390 screen. The lit copy stays inside the curve. Its 1px
`--line-strong` border went in the next note, as 3.3's ring had.

**A palette's reference image: 12px and no border (by request).** The 156×104 thumbnail on the
result stage loses its 1px `--line-strong` border and takes `--radius-card`: a tenth of its height,
the proportion of the 16px the short panels took, where the photographs' 28 would be a quarter. Its
zoom button takes the same corner so the focus ring follows the picture.

**The Library list's sort header speaks like the controls above it (by request).** Palette, AA Text
Pairs, Max Contrast and Created are 13px Medium in Title Case, where they were 11px capitals at 400:
the chips are toggleStyle, as the harmonies drawer's model pills are, and `data-sort-col` joins the
case list in global.css. The three heads still have no edge (global.css removed it by request), so
the stadium shows only in the hover and press tint; the sorted column is full ink with its chevron. Palette
sits on the chips' baseline (7px under the text, as their padding puts it), measured level.

**How it Works' labels speak like its buttons (by request).** Five figure labels (OKLCH, WCAG
Contrast, Lightness, Chroma, Hue) and 3.1's role names are 13px Medium in their own case, where
both were the 11px uppercase label voice; the phone story's role names are the same component and
move with them. The story's figure label stays in the label voice: it is a finding ("3 of 10 pairs
reach 4.5:1"), a sentence, where these are names. 2.2's card references keep it too.

**2.1's key and the colour cards' annotations are Medium, each at its own size (by request: "keep
each line's own size").** The key's hex, coordinates and share keep 11px and their two inks; the
cards' hex and share stay 11px under the 13px name, muted, and the share reads in its own case
("34.9% of the frame", "Shares the primary swatch"). The hex keeps its capitals, since the phone
story hands some hexes over in lower case.

**3.1's colour cards are the colour (by request).** Each card is filled edge to edge with its colour,
with its role at the foot, 20px Medium in Title Case, and nothing laid over the colour: it wore the
image cards' dark foot (`.about-rail__tint`) for an hour, and Frozen Slate's colours needed no help
from it. Without the foot the name takes whichever of white or black reads better, measured: white on
the four dark cards (11.11 to 21), black on Accent (5.34, where white is 3.93) and Text (8.53, where
white is 2.46), set per card as `--role-ink`. The cards are `clamp(200px, 20vw, 300px)` tall, 288px
at 1440, kept by request when the foot went; a clamp rather than an aspect ratio keeps six stacked
on a phone at 200px each. A white 10% inset ring keeps #000000 and #090606 visible on the dark
theme's page and is all but invisible on the light cards. The hexes, the share lines and Secondary's
note are gone. The phone story's role cards share .about-role and keep their swatch, 13px, hexes and
shares.

**Frozen Slate follows its roles, and the feature pills are gone (by request).** 3.1's six roles
had been explained twice: the colour cards, then Osmo's Expanding Feature Pills beside six
photographs of other things. The pills figure is removed, and See Frozen Slate in Use moves up to
follow 3.1 — the roles, then the roles worn by the palette's own interface, then the contrast between
them — so it is 3.2 and Contrast Creates Hierarchy is 3.3. With the figure went aboutPills.js and its
wiring in AboutPage, 14KB of about.css, and the six photographs in public/assets/story/ that nothing
else used; the comments that described either section by number or named the pills were corrected.
The note under the colour cards ("Frozen Slate shows how five colours can be assigned…") went next,
and 3.1 gives up its bottom padding (`about-sec--joined`), so See Frozen Slate in Use starts one band
gap under the cards (108px at 1440) where it had been 398.

**New Palette leads with the plus (by request).** The design system's plus (`IconPlus`, the Figma
node ic:outline-plus) sits left of the label in both mastheads. It moved from AppView.jsx into a
small shared `src/app/icons.jsx`, because the button is built in chrome.jsx and chrome.jsx cannot
import from AppView (AppView imports it). 16px, so its arms span 8px, the 12px label's cap height,
on a 2px gap: the glyph fills only the middle half of its box, so the box holds 4px of air each side
and 2px of gap reads as about 6. The same air made the pill's left read 4px wider than its right, so
the icon steps 4px into the left padding (`marginLeft: -4px`), stated on the icon rather than by
restating the glass bar's padding. Measured from pixels: 16.0px from ink to edge on both sides.

**The Library list sits on the page grid (by request: "align these to the grid").** Its twelve
tracks were laid out inside the rows' 16px `--row-inset`, so every label and value landed up to 16px
off the page grid's own lines (the trade recorded at --row-inset on 03.08). The sort header and the
list now reach `--row-inset` past the grid on each side, so the same padding puts the tracks exactly
on the page's column lines, and the rows' hover tint, selected fill, marker and rules take their
16px outside the grid instead of from inside it. Below 1280 the AA column is one track, a few px
narrower than a badge and its count, and the cell spilled past its line; it is `justify-self: end`
now, so any overflow goes left into the gutter and the count ends on the line. Measured with the
Shift+G overlay at 1024 to 1440: every label and value on a column edge.

**The contrast drawer's best pair is drawn (by request).** "Best Pair Sample" takes the buttons'
13px Medium in its own case. The pair beside it is two overlapping discs — the background's behind,
the text colour's in front, ringed in the drawer's `--surface`, both on the swatch idiom's 14% edge
— and then the ratio, option C of three; the hexes are still read out, visually hidden.

**The result stage's action row is optically balanced (by request).** Each icon steps into the
left padding by what its glyph's empty margin adds, measured from pixels as New Palette's was:
Check Contrast 1px, Export 3, Share 2.75, Add to Projects none. Copy's label had centred its WORD
inside a "Copied"-wide reserve, so its icon gap read 14px against the others' 8; the icon and word
are now one unit centred inside a hidden icon-and-"Copied" (plus a 1.5px step, which the centring
splits), so the gap is the shared 7px and the button still never changes width. Ink to edge is now
equal on both sides of all five, within one device pixel on Share.

**The trait tags are on the foundations (by request).** Warm, Dark, Light and the rest are
`--fs-body`, 13px Medium, in their own Title Case, read from their 9% fill with no stroke, on every
surface they appear: the result stage under the name, the detail overlay's footer and the
shared-link phone view. They were `--fs-label` capitals on a 15% hairline. The list's EXAMPLE chip
stays as it was, by request.

**The takeover's statements sit on the screen's centre (by request).** The second statement was
stacked with `position:absolute; inset:0`, so it hung from the top of a box the first, shorter
statement sized, and its five lines ran down past the middle and off the foot. Both statements now
share one grid cell (`display:grid; place-items:center` on the inner, `grid-area:1/1` on each), which
the taller sets, and each is centred in it. Measured at 1200 and 1440: both statements 0px from the
viewport's centre, horizontally and vertically. The effect only toggles their visibility, so it
needed nothing from the absolute box.

**2.2's cards name their palette at the numeral's size (by request).** `.about-stack__ref` leaves
the 11px uppercase label voice for the numeral's own type: `--fs-hero`, Medium, display tracking,
written as the name is written. 86px at 1440 and 34px on a phone, beside the number, which keeps the
mark colour while the name keeps the text colour.

**Add to Projects ends on Done, not Confirm (18.09, by request).** The act is unchanged: the ticks
are still a draft until this button commits them, and Cancel still drops them. The spoken name
starts with the visible word ("Done, saving the projects for …"), as Cancel's does.

**The Library's scope rail is gone, and the title took its row (19.09, by request: "I think it only
adds inconvenience for the user").** The rail was All and a chip per project, scrolling behind ‹ ›
arrows once they overflowed, on its own row under the title. The round before its removal moved the
arrows inside it, then beside it, and narrowed it to three columns; none of that shipped. Now one
row holds "Library" alone at the start and, at the far edge, the list button and List | Grid, 8px
apart ("let Library sit alone and move the list button to the right next to the list/grid toggle
with the same gap"; it stood 8px after the title for one step). The row is centred on one line, 12px
above the table. The list button is the toggle's height, 35.5px, in both states (a circle at rest, a
stadium with its count), where it was 32 and would have stood 1.75px short at each end beside it.
The rail's code went with it: the chips, the arrows, the travelling pill, the scroll reveal, their
state and their styles. What stays is the scope pipeline (`activeProject`, `setActiveProject`,
`projectFeed`), so **there is currently no way to show one project's palettes**: the list button's
panel filters and manages projects but does not open one. **The title is 32px** (`--fs-statement`,
was 24), set while the list button stood beside it (at 24 its capitals were half the button's
height) and kept when it moved. **Its ink is centred, not its capitals** ("the list button seem to
sit above the Library text"): "Library" is lowercase after its L and hangs a y, so a control
centred on its capitals read high; the title lifts 0.1em, which puts the middle of its ink (L-top
to y-tail) on the row's centre line to within a quarter pixel at 2x and 3x.

**The deletion toast and the notice are glass (19.09, by request: "these floating containers that
are temporary needs to match the glass environment we have established").** They were the solid
recipe, `--surface-raised`, the `--line-strong` edge and the surface shadow, for surfaces that sit
on the page. They float over it, so they take the grid dock's pane instead: the surface at 70% over
the 12px blur, the ink's 12% hairline and no shadow, one rule in global.css for both. They keep
fading on their own opacity: an element's own opacity does not cut its blur the way an ancestor's
does (measured: a pane at .5 shows its blurred copy at half strength, a crossfade). **The toast's
undo takes the supplied icon**, an arrow that turns back and runs home.

**The Library panel is one list, and projects are a filter in it (19.09, by request).** The rail
went, so the drawer behind the list button became the one place to pick a project, and its Filter |
Projects toggle went with it ("doesn't that make the toggle between the filter and project
unnecessary?"). The list opens on a **Project** group, then Text usability, Lightness and
Temperature. Projects follow the facet grammar: `activeProjects` (a list), OR within the group, AND
across groups, and counts that hold the other groups but not their own. Every project is listed; one
with nothing to show is inert with its 0, where a measured value would be hidden, because a project
that vanished when empty read as one never saved. The order is recent activity (the newest palette
each holds) and stays put while you pick. **Five rows, then "Show All N"** ("what if a user have
15-20 projects?"; Hick's law, Miller's law), in the heading's column and muted ink so it is not read
as a project; a ticked project always shows. **Edit**, beside the heading, turns the same rows into
the management rows the Projects tab held (a new-project field, then rename, export and delete), and
**Done** turns them back; with no project yet the group opens on the field. On the page, each ticked
project is a chip carrying **the folder mark** (similarity with Add to Projects), and the chip row sits
**24px under the title row and 8px over the table** (proximity; it was 12 and 8). The result sentence
now counts against the whole library. A palette made while projects are ticked joins them, so it lands
in the view it was made in. Clear Filters and deleting a project both untick. "Show All" is not in the
panel's line reveal: the reveal restores markup, and it left the label reading Show All after opening.

**Copy's padding matches the row (19.09, by request).** Its label sits centred in a hidden
glyph-and-"Copied" so the row never moves when it confirms, and at rest that spare sat as 6px more air
each side (18.7 and 19.3px ink to edge, against Check Contrast's 13.3/13 and Export's 12.7). The spare
comes out of its padding now (`--button-006-padding` on `[data-copy-trigger]`): 12.7 and 13px, measured
from pixels at 3x. "Copied" spends it for the moment it shows.

**The bins are red (19.09, by request: "a red color for the bin and a tinted red fill on hover...
both light and dark mode").** A new pair of tokens: `--danger` #c8322a in light (4.9:1 on the page,
4.1 on its 12% hover tint, 3.6 at the 20% press) and #ff6e62 in dark (6.7, 5.7, 5.0), and
`--danger-inverse`, the other theme's red, for the bin on an ink-filled (lit) Library row (6.4:1 and
4.8:1). Every delete carries `data-danger`: the Library row's, the palette detail's and a project's in
Edit. The glyph is red at rest, and so is the edge where there is one ("border on the bin should be
red as well"): 70% of the red, the lightest that clears the 3:1 control edge in both themes (3.1:1
light, 3.8 dark). Hover fills 12% of the red with the edge at full red (4.9 / 6.7:1), press 20%. An
earlier 45% hover edge was under 3:1. Verified by computed style in both themes.

**The result stage's metrics are Title Case, one step larger (19.09, by request).** Colour,
Accessibility and Reading, and every label under them (Dominant Hue, Max Contrast, AA Text Pairs,
Name From…), were set in capitals by the stylesheet; they are written in Title Case now with the
transform gone, and moved from `--fs-fine` (11) to `--fs-body` (13), a step at a time (12 first,
then "titles and labels" to 13). They are the values' size now: a label is told from its value by
the muted ink, and a heading by Medium.

**The Project group's fields wear the rows' plate (19.09, by request: "input field should match the
styling of the other elements in the drawer").** The new-project field and each rename field take
the filter rows' look: `--surface-raised` with the `--line` hairline, 37.5px tall (10px over and
under), 13px Medium, the count 18px from the edge, and the rows' hover to `--surface-white`; the
placeholder is the muted ink. This reverses the older "no raised fill" note on the name fields,
written before the rows became raised plates. The create disc is 29.5 square so it stays round.
The Add to Projects dialog's field was left as it was that round, and took its own rows' plate later
the same day (audit U2, below). **The export and delete
circles beside them take the same raised fill** ("we can't have the icons in the drawer without a
fill"); their hover and press tints are unchanged.

**The Library list's palette names are 15px (19.09, by request: "the nearest token").** `--fs-lead`,
from `--fs-body` (13). The 14px `--fs-cta` is the glass call to action's own size, outside the ten
type steps, so the next step of the scale is 15.

**Undoing a project's deletion puts its palettes back in it.** The undo wrote the legacy `projectId`
alone, which nothing reads since membership became the `projectIds` set, so the project came back
empty while the toast said it was restored. It refiles through `withProjects` now.

**The Laws of UX audit (19.09).** Twelve findings (U1–U12) and eight questions, published as an
artifact. U1 to U4 were done the same day, by request:

**Filtered to nothing, the panel takes the table's place (audit U1).** While a narrowing matches no
palette, the column header steps aside, as List | Grid already did, and the list drops its closing
rule. Before, the "No palette matches every filter" panel had the header under it, labelling no rows.
The panel keeps one way out, Remove Last Filter. Clear Filters left it, because the applied-filters
row directly above carries it in every filtered state. The panel arrives on the rows' own rise: 12px
and a fade on `DUR.reveal` with the entrance ease. When a narrowing is undone, the header comes back
on the same rise, with the rows. This runs from `_syncFilteredEmpty` in motion.js, called from
componentDidUpdate, so every way in or out takes it. It is instant under reduced motion.

**Add to Projects' field wears its rows' plate (audit U2).** It has `--surface-raised` with the
`--line` hairline, 13px Medium, where it stood on the page colour inside a 48% ink edge. Its hover,
focus and placeholder follow the Library panel field's rules. It is 39.5px, the height of the rows
above it.

**Every option row speaks in the panel's voice (audit U3).** Copy's and Export's format rows and Add
to Projects' rows are 13px Medium and flat, as the Library panel's rows are. They were 12px Regular
in Copy and Export and 13px Regular in Add to Projects. Export's format tags keep the tag voice. The
13px label grew Copy's and Export's rows to 41.5px, so their block padding went from 12px to 11px.
Every dialog row is now 39.5px, the same as Add to Projects' rows and field.

**Add to Projects takes the panel's tick box (audit U4, "use the panel tick box").** Choosing
projects is one act in two places, and it wore two marks: a tick box in the panel, an ink ring and the
word ADDED here. The rows now lead with `FacetMark`, with the name 11px after it, and keep the ink
edge the panel's ticked rows also carry. ADDED and its eased entrance are gone. The tick changes at
once, as the panel's does, because it answers a press directly.

Round 2 took the rest the same day, on the user's answers:

**Semantic Scaffold is the theme switch, with its state in the fill (audit U5, "drop the off to match
the theme switch").** It was a ringed pill holding its own track and the word OFF. It is now
chrome.jsx's `SwitchTrack` in an unringed button-006, with the hook renamed from
`[data-theme-switch]` to `[data-switch]`, since two switches share it. Asked next that "the
active/inactive state needs to be more clear", it carries `data-switch="fill"`. Off is an outlined
track on `--action-line` with the ink knob at the start; on is an ink track with the surface-coloured
knob at the end. The masthead's switch keeps its glass. **Passing Only stays a pill:** it was made a
switch too, then put back the same day ("revert passing only back to be a button").

**One palette, one reading (audit U6).** The detail writes CMYK, as the result stage does, not CMYK
APPROX; Export already says the value is approximate. **The stamp, in the list and the detail:**
minutes and hours under a day ("Just now", "9m ago", "3h ago"), then the date and clock ("Date
should only appear when it's more than a day old"). This is `stampTime` in pipeline.js, and a day
means 24 hours. The tooltip carries the other form. This reverses absTime's one shape for every row,
by request; the column still sorts on the timestamp. Neither view sets the stamp in capitals now. A
minute tick re-renders the view while a young stamp is on screen, so "Just now" does not stand for an
hour. **Share closes the detail's action row too**, at the far right, with its own Copied state
(`ov-pal-share`). The detail's footer became two rows so the action row runs its full width: the
traits and the reading on the first row, the actions on the second.

**Messages share one lane at the bottom centre (audit U7).** It is `MessageLane`, z 158. The toast
stands at the foot and a notice above it. A notice coming or going leaves the toast where it is. When
the toast arrives or leaves, the notice glides by the toast's height plus the gap, from its recorded
layout position (`_noticeRide`), so a replaced toast moves nothing.

**Capitals name a surface, a group or a state; a label that names a value is 13px Title Case (audit
U8, Q5).** The rule moved Restore's Palettes and Projects, the contrast checker's Minimum 4.5:1 and
the phone story's facts (Dominance through Hue Range) to the result stage's muted 13px. Eyebrows,
the panel's group labels and tags keep their capitals.

**The phone story's toggle speaks like the desktop's (audit U9).** It is 13px Medium in its own case;
the 44px target stays.

**The AA badge keeps one edge (audit U10).** Neue Montreal has no tabular figures, so `tabular-nums`
did nothing and a 1 is narrower. The count's figure sits in a one-`ch` slot, right-aligned, so "/10"
and the badge before it keep one place. Measured: 986.3px on every row, where the 1/10 row stood
2.5px right.

**Copy is 35.5 (audit U11).** Its label was an inline grid, which sat on a text line and kept the
strut's descent under its 16px box. It is a block-level grid now, like its siblings' flex rows.

**Privacy and Terms name the button "Back Up" (audit U12).** How it Works' "Back up your Library" is
a verb in a sentence and stays.

**The chosen harmony method is filled (Q6, "fill the chosen one like the segmented").** It has an
ink ground and surface text, where it was an ink ring. The Library's sort header shares
`toggleStyle` and keeps its ink-only state. **Kept, by request:** the harmony glyph (Q7), and
sentence case on Privacy, Terms and "Start here" (Q8).

**The second pass, on the live site (19.09, after 3c94dc9).** All twelve fixes held in production.
Four new findings (W1–W4) and one question (Q9) came out of it, and all were done the same day, by
request:

**The message lane stands clear of the bottom bars (W1).** Moving the notice beside the toast (U7)
brought in the toast's collisions. A notice sat on the grid's dock and hid its close, the toast stood
in the palette detail's action row like a sixth act, and at 1024px it touched the analytics banner.
`_syncLaneLift` (overlays.js) measures whichever of those bars is under the messages across, and
`--lane-lift` raises the lane a gutter above it, gliding on the state beat. It runs after every
commit, again once the surfaces' own arrivals are over, and on resize. The banner in its corner at
1440 does not overlap the lane, so it leaves the lane alone.

**The phone story's colour cells caption their swatch as one group (W2, "better visual hierarchy and
optical balance", "13px medium, but capitalize").** The picker's buttons no longer set their words in
capitals: the `[data-ix]` default caught only the tappable cells, so one grid spoke in two voices.
**The hex stays, by request:** it tells look-alike swatches apart and shows two roles sharing one
colour. The caption's layout was reworked later the same day; see the hex and the share, below.

**The rest of W2:** the contrast checker's rows read "White Text · 20.3:1" without capitals. On How
it Works 1.2, Lightness, Chroma and Hue take the result stage's 13px Title Case, muted. **"to 1" is
the figure's own size** (by request: "no need for to 1 to be smaller"), muted, where it was 11px
capitals set .6em off the number.

**"2 of 10 Pairs Reach 4.5:1" (W3, Q9).** It is the phone's one figure label, and it takes How it
Works' figure-label voice: 13px Medium in Title Case. It had kept the label voice as "a finding, a
sentence".

**The phone's contrast rows draw their pair (by request: "remove the hex here and apply the same
visual as we use for Best pairs").** `PairMark` is the Best Pair Sample's two overlapping discs, now
one component. With the ratio beside the discs and the verdict at the end, each pair is one 56px
line where it was two. The hexes are still spoken, visually hidden. The discs became the Aa chip
later the same day (below).

**Semantic Scaffold's name is 13px Medium (W4),** the rows' voice. "Suggestions to review, not
decisions." left its description, by request.

**The hex at the top left, the share at the bottom right (19.09, by request).** The user's words,
in order:
- "just write % in the bottom right";
- "globally we should remove 'of the frame'";
- "let hex code sit top left and % bottom right";
- "don't decrease the height on the card because we remove text";
- "let hex code be regular weight and % medium weight a couple of font-sizes higher";
- "make sure padding for the % on right and bottom is equal";
- "equal padding for hex code left and top. give top same padding as left".

In the phone picker and the Role cells, every inset is about 8px, measured to the ink rather than the
line box:
- The hex is 13px Regular. Its cap line hangs 8.65px under the swatch, as its ink stands 8.4px in from
  the left; the swatch's margin is 2.5px for that. In Role the name takes that place (8px under the
  swatch, in the Medium face) with the hex 2px below it.
- The share is 15px Medium (`--fs-lead`, two rungs up from 13 counting the CTA's 14), alone on the
  card's last line at the right. 20px was offered as the other reading of "a couple".
- The share's ink stands 9.4px off the card's right edge and 9.5px off its bottom. The phone's cards
  take 5px of bottom padding, where they had 20px, because the share's line box keeps 3.5px under its
  baseline.
- What the padding and the swatch's margin gave up (15px and 9.5px) stands between the hex and the
  share, 26.5px. So the cards keep the height their second line gave them: 138px in the picker and
  156px in Role, where round 3 had 136 and 155.

"Of the frame" is gone from what the cells show. The story's sentence "Each colour holds a share of
the frame" stays, as prose. A screen reader reads a Role cell as it is shown ("Background, #D0D2C6,
3%"): the cells ship bare, as How it Works' do, and the unused spoken name was deleted on review.

**Nothing says a colour is too spread to locate (19.09, by request: "We don't need to explicitly say
'Spread too finely to locate'. Remove it. We overexplain too much").** A cell that can't be located
is the same caption as its neighbours, and only not a button. Chapter 1.3's lead is one sentence,
"Select a colour to find it in the photograph." It had a second variant for a case with some
unlocatable colours and a third for a case with none.
- On 19.09 all eight examples located at least two colours once their masks were built.
- The lead is a `data-reveal` split target, and the reveal writes back the markup it split when it
  ends. So a variant React set mid-reveal was written over, and a case chosen before its masks
  existed kept the none-locatable sentence.

**Every ratio is written 6.09:1 (19.09, by request: "write :1 instead of to 1 … globally").** That
covers How it Works (the lens, the thresholds, the prose, and 3.2's and 3.3's rows) and the phone
story's contrast rows, as the tool already wrote them. The lightness scale "from 0 to 1" is not a
ratio and stays. A screen reader was then given ":1" everywhere but the checker's matrix, which
always said "to 1"; the interface review put that right (below).

**A pair is "Aa" in its text colour on its background (19.09, by request: "Aa chip everywhere").**
The overlapping discs asked the reader to know that the disc behind was the background (the user:
"how do we know which color goes for background and foreground"). `PairMark` (AppView) and
`.about-pair` (about.css) are one mark: a 40 by 26 stadium of the background with "Aa" at 13px Medium
in the text colour, on the 14% edge. It appears in four places:
- the contrast checker's Best Pair Sample;
- the phone story's contrast rows;
- How it Works 3.2, where the role pair is still named in words;
- How it Works 3.3, where each pair's first colour is set as the text.

**The interface review of rounds 3 and 4 (19.09, all seven better-* domains, by request: "fix all").**
Three findings, all fixed; the first was reversed the same day, by request:
- **Reversed the same day: every colour keeps the card's edge.** The review took the edge off the
  colours a photograph can't locate (Frozen Slate's three, Dry Season's one), so that only what can be
  tapped looked tappable. The user: "That doesn't make any sense. bring it back". Don't propose it
  again: an unlocatable colour is the same card as its neighbours, and only not a button.
- **3.2's columns are the list's (layout, medium).** Each row was its own grid, so each verdict pill
  sized its row's tracks. At 1440 the last ratio ended 116px left of the others, and under 820px
  "Accent against background" wrapped to three lines. Above 820px How it Works' `.about-checks` is one
  grid and each row a subgrid, so the ratios share an edge and the pills end the row. Under 820px the
  verdict takes its own full-width line. The phone story's rows are untouched.
  After the push, by request ("V2 needs capitalized 'Text on Background' etc. for all"), 3.2's pair
  names are Title Case in the house's Chicago form, prepositions lower case: Text on Background, Text
  on Surface, Text on Primary, Accent against Background. The thresholds list above it followed, labels
  and values alike (by request: "apply title case to thresholds too"): Body Text, 4.5:1 or Higher; Large
  Text, 3:1 or Higher; Meaningful Graphics and Interface Elements, 3:1 or Higher against Adjacent
  Colours.
- **A ratio is written 4.5:1 and said "4.5 to 1" (accessibility, low).** `[data-ratio]::after` in
  global.css draws ":1" with " to 1" as its alternative text. AppView's `withRatios` puts the figure
  in the span wherever a ratio is rendered as text: the list's Max Contrast, the checker's Minimum,
  swatch rows and Best Pair, and the phone's figure label and rows. about.html's 25 ratios carry it by
  hand. The detail's metric value is a split target, so it keeps its text, hidden from a screen
  reader, with a visually hidden twin that says it. Copied text loses the ":1". The spoken strings
  nothing rendered (the phone rows' `aria`, Role's `aria`) are deleted.

Considered and kept: the verdict pills' filled weights (A5, H6), the phone's verdict names beside
3.3's, "Aa" on the accent pair, the share's 15px beside Role's 13px name, and AppView's inline font
stacks without a fallback (101 of them, a sweep of its own).

**The phone story's gallery cards are photographs, not buttons (19.09, by request: "Make sure the
horizontal cards on mobile cant be pressed when scrolling. we want the user to get to the cta and click
explore another palette").** Each card opened its example. The pinned rail fills the screen, so a scroll
that began on a card and moved too little was a tap: the story jumped back to the photograph, and the
reader never reached the close. The cards are How it Works' static `<article>`s now. Explore Another
Example is the one way on, and its chooser holds every example. The cards still take the pointer from
the live stage, so a tap on a passing photograph lands on nothing, not on the close's button while it
waits to appear.

**The contrast checker's minimum and summary rise through the masked reveal when AA/AAA or Normal/Large
rewrites them (19.09, by request: "When toggling between AA and AAA the transitions should be our masked
text reveal on the text. apply title text here as well").**
- The summary is Title Case: "2 of 10 Pairs Meet AA Contrast for Normal Text" (`CRITERION_TITLE` in
  lib/wcag.js; `CRITERION` stays sentence case for the sentences that use it).
- `_revealContrastLines` (overlays.js) runs `_maskLineReveal` on both `[data-cx-line]` lines at the
  drawer's own tempo, the minimum a step ahead. `componentDidUpdate` calls it when `contrastLens` or
  `contrastLarge` changes; opening the drawer changes neither.
- The reveal rebuilds a line from its `textContent`, so the minimum is its string whole again ("Minimum
  7:1", hidden from a screen reader), and a visually hidden twin says "Minimum 7 to 1".
- `_maskLineReveal`'s restore now undoes only its own split. On a quick second toggle, the first
  reveal's completion used to write the older words back over the newer.

**A row's "Copied" is Title Case, without a checkmark (19.09, by request: "Copied should be in title case.
Remove the checkmark").** In the Copy dialog's rows it was an 11px capital tag behind a tick; it is
"Copied" at 13px Medium now, the voice the phone share view's rows already used for the same word. Those
rows lose their tick too. The Copy and Share buttons keep their own icon while they say Copied (by
request: "keep their own icon"), where each swapped it for a tick. Only the value rows' copy icon still
turns into a tick, because it is their only sign that a copy happened.

**The Restore dialog says "Restore" (19.09, by request).** The small label was "Restore from a file"; the
file's name under it already says where the palettes come from. When nothing in the file is new, the line
is "Everything in this file is already in your library." ("Adding it would change nothing" went), and the
list keeps a gutter under it, 24px as at the sides and top, where the last row ran to the dialog's edge.

**Share opens a dialog (19.09, by request: "go with the download image and build a").** It used to copy
a link on the press. It now opens Copy's sheet, with the same layer, corner, header and rows
(`ShareControl` in AppView). It offers three ways out:
- **Copy Link** answers "Copied" in its row, and the sheet stays open.
- **Share via…** hands the palette's name and link to the device's share sheet (`navigator.share`, as
  the phone story's handoff does). It only appears where there is one: Safari, Chrome and Edge on a Mac
  or Windows, and every phone. Elsewhere (desktop Firefox, in-app browsers) the dialog has two rows.
  An Email Link row stood in for it there until the user found it dead ("email link is dead"): the
  Claude app's browser swallows `mailto:` silently, and a page cannot tell whether a mail app opened.
  Copy Link covers an email there.
  Since the UX review the same day (by request: "fix both"), it sends the picture too. Where the browser
  can share a file (`navigator.canShare({ files })`: Chrome 153 and Safari on a Mac, and phones), the
  Download Image card goes with the link, so the person on the other end sees the colours, not the
  site's card. The card is drawn once the sheet has arrived (`_prepareShareCard`), because
  `navigator.share` only works in the moment after a press; a faster press waits about 30ms for it. A
  share that completes closes the dialog. A cancelled one (`AbortError`) leaves it open.
- **Download Image** saves the palette as a picture and answers "Downloaded". It uses design A of the
  mockups (`lib/paletteCard.js`): the weight bar, then the hex and share list on hairlines, 1080 by 1350,
  drawn in Neue Montreal. It is always on the light surface, since it leaves the site, and the file is
  named `atmos-gallery-<name>.png`.

Focus lands on Copy Link, not on the close mark, so the press Share used to be is still two keys away:
Share, then Enter. This was the one departure from Copy's sheet until audit X5 (below), when Copy and
Export began opening on their first rows too.

It left some things out on purpose:
- No buttons for X, Pinterest and the like: a link previews as the site's own card, never the palette,
  which rides in the fragment. The share sheet already reaches the apps people use.
- No copy on open: the clipboard stays the reader's until they press Copy Link.

The Share button no longer swaps to Copied, since the rows confirm. It is in both places Share lives,
under Copy's `owns` rule. `shareMenuOpen` joins the modal set, Escape and the wipe's reset.

**The page loader plays on phones too (19.09, by request: "make sure the page loader is active on
mobile").** The phone's homepage, the story, never mounted `LogoLoader`. So a first visit on a phone
showed no loader, while the run still searched for its cover for 4 seconds (40 tries) before giving up,
which also held the consent banner back. The story's branch mounts it now, as the tool and the gate do.
The story's reveal is held under it, as it already was under the page-change wipe (`_storyArmed`), and
`_playStoryReveal` runs on the same beat that plays the desktop landing's lines, as the fold lifts. The
loader's failsafe path runs it too, so nothing can stay hidden. It is once per session, as everywhere;
reduced motion skips it; a shared link skips it.

**The third live pass, X1 to X5 (19.09, the user's answers to the Laws of UX audit's third pass).**
- **X1: the phone story prints a hex and its share one way** (by request: "go with proposed and with
  ink"). The weights table in 1.2 set the hex at 11px Medium in ink. 1.3's picker and the Role cards
  set it at 13px Regular and the share at 15px Medium, both muted. Now the table's hex is 13px Regular,
  and the cards' hex and share are in ink. The OKLCH readout keeps /about's 11px muted: it is the
  table's annotation, and the cards never print it. Everything is scoped to `[data-mobile-story]`, so
  /about's key is untouched.
- **X2: the story's close wears the quiet glass** (by request: "take the quiet glass for button
  consistency"). Explore Another Example had `.glass-cta`'s dark default (55% black, white text),
  because the light rule covers only the landing and the story's hero. It takes /about's closing fill
  rather than the hero's pane. On the plain page, the hero's 70% surface pane matches the page and
  leaves only a 12% hairline, which is the 1.51:1 edge /about fixed. So `.story-actions .glass-cta` in
  global.css is 7% ink with the `--action-line` edge and ink text. Hover is the label swap, and a press
  tints to 18% (hover tints to 12% under reduced motion).
- **X3: the checker's grid writes ":1"** (by request: ":1 too"), through `[data-ratio]`, like the rows
  and Best Pair. Blank cells carry no attribute. A palette has five colours, which leaves every cell room.
- **X4: Copy, Share and Export open without a lead** (by request: "Delete the copy. We are
  overexplaining too many places."). The three sentences went, and the rows now sit 16px under the
  title, as Assign's do. Export's note under Semantic Scaffold went too. The switch's accessible name
  and title now carry that it adds six suggested roles. Kept:
  - Restore's line: it appears only when a file adds nothing, and it is the only thing that says why.
  - Recognise's sentence: it is the dialog's news.
  - Assign's empty state.
- **X5: Copy and Export open on their first row**, as Share does: Hex List in Copy, the first format in
  Export. So each button then Enter does its dialog's job. The proposal named only Copy, but Export
  also opened on its close mark, so it follows.

**The colour bands lose their stroke (19.09, by request: "remove 1px stroke and refine the boxes
visually, same for lightness, chroma and hue. we need proper visual presentation").** How it Works 1.2's
lens bands and 1.3's Lightness, Chroma and Hue ramps each drew a 1px inset edge around every box, with
square corners. Three looks were rendered on the page, and the user chose A:
- No stroke.
- Each figure is one field with `--radius-card` (12px) at its outer ends, the corner of 3.1's role
  tiles, the page's other drawn colour.
- The parts still meet flush, so a ramp reads as one scale and the pair keeps the seam its ratio is
  measured across.
Asked about separately, the weight bar follows (How it Works 2.1 and the phone story's 1.2): its
`--line-strong` border went. The corner goes on the first and last part (about.css, "THE COLOUR BANDS'
ENDS"), not on a clipping container. The ramps' scale marks hang below their steps, and the weight bar's
parts rise into place one by one, so a clip would cut both.
The trade-off was shown and accepted: a colour close to the page now reads faintly, such as the pair's
#EAE8DD and High Key's near-white share in light, and the ramp's black step in dark. Other strokes are
unchanged: the key's chips, the interface preview's inset edge and the plate.

**How it Works 1.2 and 2.1 show their point, in new copy (19.09, by request: "are we presenting the
idea of oklch and wcag visually correct for the user to understand? The copy is not strong enough, same
for 2.1", then "Build as shown" for both rendered proposals).**
- **1.2's WCAG lens.** It drew two flat blocks with a bare 6.09:1, so it never showed what a ratio is
  for or whether 6.09 is enough. Its greens were also not the OKLCH lens's.
  - It now draws the page's pair mark at specimen size: "Aa" in the accent (#6C9429, the OKLCH lens's
    green) and in the primary (#3C5E19), on High Key's background.
  - The readings use 3.3's verdicts: "No WCAG Contrast Role, 2.89:1" and "Body Text at AA, 6.09:1".
    The ratios are color.js contrastRatio() at two decimals.
  - The notes under both lenses went, so the lens grid has three rows.
  - On phones, both lenses stack (by request: "on mobile, let this sit horizontally below the green and
    let the color do full width like wcag contrast. if there is no room for all three, let hue sit left
    aligned below"). The OKLCH swatch is a band across the lens, like the pair, where it was a square
    beside its readings. Its three readings share a row on auto-fit tracks of at least 4.5rem. All
    three fit at 320, and Hue drops under Lightness only when they don't, for example at 150% text.
  - Each value sits at the foot of its cell, so a row's numbers share a line even when a term wraps.
- **1.2's lead.** "Atmos reads every colour in two ways. OKLCH describes the colour itself: its
  lightness, chroma and hue. WCAG contrast compares two colours: how readable text in one is on the
  other." Then: "OKLCH tells you what a colour is. Contrast tells you where it can go. High Key's most
  vivid green is too faint for text on its own background, while its deep green reads clearly."
- **Labels on their figures** (by request: "move lightness, chroma and hue closer to the visual
  element"). 1.3's names sat 28px above their ramps, the label's margin stacked on the column gap.
  They sit 14px above now. 1.2's labels also dropped their margin and sit on their bands by the row
  gap alone.
- **2.1's mark, removed the same day.** A "Most Vivid" label with a tick over the 5.6% share was built
  as part of the approved proposal. The user then asked for it gone ("delete 'most vivid' text"), so
  the bar carries no label, and its accessible name is back to the shares alone. Don't propose a label
  on the bar again.
- **2.1's copy.** The lead is now "The colour that covers most of an image is rarely the one you notice
  first. A small, vivid detail stands out against a muted field, and a dark shadow makes lighter
  colours look brighter." and "Atmos shows how much of the image each colour covers, so you can see
  which colours carry it and which ones catch the eye." The caption is one paragraph where there were
  two, and still recites no shares.
- **3.2's verdict is "Non-Text Elements at AA"** (by request: "delete meaningful"). 1.4's threshold label
  "Meaningful Graphics and Interface Elements" was not named, so it is unchanged.
- **1.4's thresholds list ends the figure.** Its caption went, by request ("delete"): "WCAG defines large
  text as at least 18 point in regular weight or 14 point in bold."

**The stacked cards keep the desktop's arrangement on phones (19.09, by request: "sort the mobile
hierarchy on the stacked cards to match the desktop version").** A portrait card used to centre its
content with a stated gap, so the number and the name sat directly on the title, mid-screen. It now keeps
space-between at every aspect: the number and the name on the top line, and the title, description and
strip on the floor.
- The pinned slide is 100vh. So on phones the card's bottom padding adds (100vh - 100svh), which keeps the
  strip clear of a showing browser toolbar. That addition is 0 on desktop.
- The sizes stay on the type scale: --fs-hero and --fs-chapter, 34 and 28px at 375.

**How it Works 2.1's key is colour tiles whose shares count up (19.09, by request: option B of three
rendered on the page, "go with B"; then "a number counter with progressive blur whilst counting up to
their respective number with as masked counter", with Osmo Supply's Number Odometer; "Hex code and LCH
should use the text masked animation").**
- **The tiles.** Each colour is a tile of itself, with the --radius-card corner of 3.1's role tiles,
  its hex, OKLCH and share in the ink that reads on it (#1A1A1A or white, 4.89 to 1 at the least).
  Stacked on a phone, with the share on the right. Five across from 900px, with the share leading. The
  cascade lands the tiles.
- **The share counts up** in the odometer's masked digit columns, from 0, growing into its columns, and
  resolves out of the page's 9px focus blur as it slows. The shares land in order, each 0.2s after the
  one before (`data-odometer-stagger`, by request: "they don't land at the same time, it needs to be
  sequential"), so the first lands at 1.4s and the fifth at 2.2s.
- numberOdometer.js keeps the resource's code as delivered and marks its five additions [ATMOS]:
  - scoped to the page, with a destroy;
  - the blur;
  - built on document.fonts.ready;
  - a catch-up;
  - each column landing at its own digit's width.
- **Why the last addition.** Neue Montreal has no tabular figures, so a column rolls as wide as the
  widest digit in its strip. A first version eased the columns to their digits' widths after landing,
  which read as the number tightening up (by request: "they shouldn't tighten up"). The width now moves
  during the roll, while the strip is still blurred and moving, so a share lands at its final spacing
  and nothing moves after. Measured, the width at landing equals the width at rest.
- The rolling strips are aria-hidden, and each share has a hidden twin for a screen reader.
- **The hex and OKLCH rise through their own masks** (aboutTiles.js), with the tile, on the cascade's
  enter line and the page's mask motion. It is not [data-reveal]: pageReveal reveals a section's copy
  when its heading enters, a screen before these tiles.
- A catch-up must read the element's position, not the trigger's start. A trigger created a moment ago
  has not been measured, its start reads 0, and the first version played every count at page load.

**No stroke on a swatch; only the verdict pills are outlined (19.09, by request: "apply it to the phone
story and 2.2", "remove 1px stroke as well", then, after a rendered mockup, "no stroke, only pills saying
Body text AA and others etc. needs stroke" and "go with b tray").**
- **The phone story's 1.2 figure is How it Works 2.1's.** The key is colour tiles, where it was a list
  with stroked 10x14 chips. Their hex and OKLCH rise through masks, and their shares count up in the
  odometer, landing 0.2s apart. The bar resolves out of the focus blur (PaletteApp now hands initCascade
  focusMotion's figures).
  - Each tile's ink comes from the view model: white where white wins, otherwise #1A1A1A, or black
    where #1A1A1A would fall under 4.5 to 1.
  - The list is keyed by the case, so a new photograph gets new tiles rather than React writing into
    text the odometer has replaced. Measured: a case change rebuilds the tiles, and they count again.
  - The story's tally rules (story.css) and the old key's rules (about.css: .about-weights__key and
    .about-key__*) are gone. Nothing rendered them any more.
- **The "Aa" pair mark has no edge**, wherever it is drawn: AppView's PairMark (the phone story's
  contrast rows and the checker's Best Pair Sample) and about.css's .about-pair (How it Works 3.2 and
  3.3). It is one mark, so it changes as one. The verdict pills keep their 1px edge.
- **2.2's strips stand on a tray, not in a hairline.**
  - Each card's ground is one of its five colours. Without an edge, that band vanished into the card:
    a hole in Dry Season's strip, a missing end on Garnet's.
  - Of three rendered versions (no stroke, tray, four bands), the tray was chosen: 3px of the card's
    text colour at 18% under the strip, with the strip's ends at 6 to 8px (--strip-r, sized for a bar
    28 to 44px tall) and the tray's corner that plus 3px.
  - All five bands stay visible, with no stroke.
- **Still stroked, and not asked about:** the picker and Role cards' edge in the phone story (kept on
  19.09 by request), the contrast checker's 24px chips and the harmony drawer's swatch.
- **The contrast checker's text-on-colour rows are tiles** (by request: option A of two rendered in the
  drawer, "go with a"). Each row is a tile of its colour, with --radius-card corners and 6px apart,
  where they were 3px-cornered bars 1px apart.
  - Inside each tile, the hex (13px Medium) sits over the name of the text colour that reads on it
    (11px), and the ratio is the figure at 20px, since it is what the panel measures.
  - Static, with no count-up or masked reveal. The drawer is opened often, so the motion the pages'
    tiles carry stays on the pages.
  - A screen reader hears "#0F0302 White Text 20.3 to 1".
- **The contrast checker's pair grid is tiles without lines** (by request: option B of three rendered in
  the drawer, "b, with c the list get too long"). Each measured pair is a rounded tile (8px, two thirds
  of --radius-card), 4px from the next. A pass keeps its 14% ink fill, and a fail stands on a faint 4%
  one where it had nothing. The empty half is empty. The axis chips have no stroke and a 6px corner
  (half of --radius-card). Passing Only still dims the reading, not the tile. The ranked list (C) was
  turned down for its length, and the "Aa" pair grid (A) for the same staircase with more to read.

**The result stage is five tiles, and its shares count up (19.09, by request: "how will the result stage
look when animating in given we have borders", then "go with b and the rounded edge, but add the lines to
maintain hierarchy" and "add the same progessive blur animation to the numbers").**
- Each swatch is a tile: --radius-card corners, 6px from the next, clipped, where the five stood flush
  and square. The value rows keep their hairlines — they rank HEX, RGB, CMYK and HSL inside the tile, and
  that is hierarchy, not decoration, which is the difference the stroke rule draws.
- The last row takes the tile's bottom corners, so its inset focus ring follows the corner instead of
  being cut by the clip.
- **The arrival's edge is the tile's corner.** The wipe carries `round var(--radius-card)`, so a band
  rises as a whole rounded tile rather than one with its top cut off, and the sink on New Generation
  goes down the same way.
- The inset rides a custom property, not the clip-path string. GSAP takes a tween's start from the
  element and the browser shortens inset() as it shortens margin — `100% 0% 0% 0%` comes back as
  `100% 0% 0%`, `0% 0% 0% 0%` as `0%` — so the string tween paired the wrong numbers: measured on the
  first build, the corner grew from 0 to 12px through the rise and the left edge moved with it. A custom
  property comes back as written, so the tween is one number. Measured after: `round 12px` on every
  frame of the rise.
- **The shares count up out of the blur**, as How it Works 2.1's tiles do, on the same figures: from 0
  over 1.4s, 0.2s apart so they land one after another, resolving out of the 9px focus blur. The share
  no longer rises with the other words; the count is its arrival.
  - It is built after the click has painted, with the words, because building measures every column —
    the reason animateText defers its splits. The band's clip hides the number until then.
  - numberOdometer.js gains a play-now mode ([ATMOS 6]): the stage is not scrolled to, it arrives. Its
    destroy now finishes a run it cuts short, because the stage counts again on every palette over the
    same elements, and the resource reads each element's text as its target — a strip left mid-roll
    would have been the next palette's number. Verified by switching palettes twice inside a count: the
    five shares landed at the new palette's figures.
  - The blur clears a beat before the digits land (BLUR_LEAD, 0.12s, by request: "number blur animation
    should be a couple of ms shorter"), so the last of the roll — where the digits are barely moving —
    is read rather than watched. Measured on a stage share: sharp at 1.46s, landed at 1.74s. One module,
    so How it Works 2.1 and the phone story's tiles take the same beat.
  - The rolling strips are aria-hidden, with a hidden twin beside them, as on How it Works.
  - Not on phones: the tool asks for a window 1024px or wider, so the stage is never drawn there.

**Copying swaps the words through the line's mask, and "Copied" is Title Case (19.09, by request).** The
value vanished in one frame while "Copied" rose into its place, and the drawer's harmony cells swapped
with no motion at all. Now the leaving word goes up and out of the mask as the arriving one rises into
it — one strip moving, the swap every button's label makes — and the same again when the confirmation
ends. The row is no longer uppercased as a whole: the values keep their capitals, "Copied" is set as
written. One CopySwap in AppView carries all of it, so the result stage, the detail overlay and the
harmony drawer cannot drift; the second restart keyframe (val-mask-b) is gone, since remounting both
spans restarts them.

**The image chooser keeps the story's place (19.09, by request: "when the user scrolls down to the bottom
the first time they land, they get send to the top").** Pressing Explore Another Example at the foot of the
story opened the chooser and sent the story underneath to the top — measured at 7694px down, it came back
at 0, and closing the chooser left the reader at the top of a page they had just read to the end, which is
the opposite of what closeStoryPicker's own note promises. The cause is the page transition rather than the
chooser: the window takes the document out of flow for the length of the gesture, which collapses its
height and drops the offset. A route change wants exactly that — a new document starts at the top — so the
cover now takes `keepScroll`, and only the surfaces that cover the SAME document ask for it. Choosing a
palette still lands at the top, deliberately: a story re-told about another image starts at its beginning.

**Explore Atmos opens the example itself on a phone (19.09, by request).** Below the supported width there
is no tool to open, so the close of How it Works crossed to the front page — and landed the reader on the
hero with "Explore an Example" under it, the step they had just spent a whole page earning. It lands on the
story's first chapter now, where the hero's own act lands. It could not be one jump: the chapter is not
somewhere to land until the story's pins have given the document its height, and a ScrollTrigger refresh
puts the page back to the top on the way (traced: the first jump landed at 844 and was taken back to 0, with
a second refresh 1.2s later as the local faces landed). So the landing re-applies after every refresh until
the chapter holds still, and it is dropped by a wheel, a touch, a key, six seconds, or the story being torn
down. A plain visit to the front page still opens on the hero.

**The tool ends like every other page, in the masthead's type (20.09, by request: "do the full and adjust
the font styling to the top nav links").** The result stage carried a compact footer — the nav row with the
wordmark and the landmark turned off — so the page ended one way on the dropzone and another the moment a
palette was on screen, which is what reads as the footer being there and then not. Measured: 352px against
71px, and no <footer> landmark on the stage. It is the whole footer in every state now, landmark included.
And the row takes the bar's type: New Palette, Back Up and Restore are 12px Medium on flat tracking, where
this row was the same size and tracking at Regular, so the two ends of the page spoke in two weights. The
size went up a step to --fs-body, 13px (15px was tried first and came back a rung): the bar's 12px is read
in passing at the top of a screen and this row is read deliberately at the end of one. Measured at 1440,
1200, 1024 and 820 the three cells still sit on one line with no wrap; at 390 the row stacks as it did, one
link per line.

**And the line-height went to 1.3, because the labels ride a mask.** Every label here is wrapped in .tswap
for the hover swap, and .tswap is overflow:hidden at the height of its line box, so `line-height:1` cut
whatever the face draws below the baseline. Measured in Neue Montreal Medium: 2.3px of ink under the
baseline against a 13px box took 0.8px off every y, g and p — and 1.16px at 15px, so the row had been
clipped at its old size too and simply was not looked at. 1.3 leaves 1.15px of clearance at 13px. The swap
still travels exactly one mask (16.9px, measured at rest and forced hover).

Not changed, and worth stating: the footer is deliberately behind a cover on the landing and in the grid
view (visibility:hidden), so the legal links cannot be reached from either. On the landing that leaves a
gap — once the consent banner is answered, its "Learn More" goes with it and nothing on that screen routes
to Privacy, Terms or the consent choice again. The fix this file has proposed since the footer tombstone is
a one-line legal row beside the credit; it is still open.

**The hero photograph arrives (20.09, by request: "image should mask in from the bottom center on the
current position with a slight parallax, so it's not already visible during page transition").** Everything
else on How it Works arrives — the statement rises through its masks, the rules draw, the tiles cascade —
and the largest object on the screen was simply there, whole, the instant the window opened. The plate is
masked now, the mask opens from the bottom centre (up and outward together, the sides finishing a breath
sooner so the last movement is the top edge rising), and the picture inside lifts 18px as it happens. It is
parked from its first frame and played by the same controller the page's copy uses: the cover's trailing
edge on a wiped arrival, at once on a cold load.

Neither obvious shortcut survived this element. A clip-path string tween pairs the wrong numbers, for the
reason the result stage recorded. The custom-property version — which the stage uses happily — wrote its END
value on every frame here: traced with the tween reporting progress 0.06 while the property already read
0%, which makes the var substitution invalid and the whole clip-path with it, so the picture stood there
unmasked. The two insets are tweened on a plain object and the module writes the string in onUpdate: one
writer, nothing to parse.

**The Best Pair Sample takes the card's corner (20.09, by request: "add same border radius to best pair
sample for consistency").** It was --radius-swatch, 3px, in a drawer whose rows and tiles have been
--radius-card since 19.09 — the one square-ish box left in it.

**The contrast checker's eyebrow is gone (20.09, by request: "Delete label").** It read "Contrast Checker"
over the palette's name, in a drawer whose own controls say what it measures and whose dialog is named for
a screen reader. The same overexplaining the dialog leads went for on 19.09.

**The palette detail counts its shares too (20.09, by request: "add our blur animation to the numbers in
grid view as well").** The stage's count now belongs to any surface that shows shares: `_countIn(root, key,
delay)` with a handle per surface, so opening the detail over a counted stage does not stop it. The detail
plays on the beat its chrome arrives on (reveal × 0.45, the offset its own timeline uses for the value rows
and the header), and the count stops when the detail closes. Its strips are aria-hidden with a twin beside
them, as on the stage.

**A week of words, then a date (20.09, by request: "saying 1 day ago up to 7 days. after that we can just
show the dates as they are presented now. remove time stamp from this state").** The Created column
answered in minutes and hours for a day and in a date-and-clock for everything older, so a palette made on
Tuesday read "19.09.26, 11.00" on Wednesday. Words carry the first week now — "1 day ago", "4 days ago",
spelled out, because a day is read once and can afford its word where minutes repeat all day — and past a
week the date alone, without the clock. Measured across the ladder: 5h → "5h ago", 26h → "1 day ago", 3d →
"3 days ago", 6.5d → "7 days ago", 7.5d → "13.09.26", 40d → "11.08.26". The clock is not lost: the cell's
title carries the full stamp, which is what tells this morning's five generations apart, and the column
still sorts on the timestamp. Spoken names take the same words ("Generated 3 days ago").

**Every export was run, and every one produces a valid file (20.09, asked).** Driven through the interface
and the bytes read back, on Garnet (#0F0302 #E12409 #F17645 #AA0906 #540604):
- Tailwind v4 — 264b, `@theme` block, 5/5 hexes as `--color-palette-garnet-01…05`.
- Design Tokens (W3C) — 388b, parses, 5 `$value` entries, `$type: color`.
- Figma Variables — 454b, parses, 6 entries.
- CSS Custom Properties — 213b primitive (5 variables) / 300b with the semantic scaffold on (6 roles, and
  the header says so). The toggle was exercised both ways.
- Adobe Swatches — 446b, magic `ASEF`, version 1.0, 6 blocks.
- Project folder — `project_check-folder_css.css`, 272b, headed "Check Folder — 1 palette".
- Share → Download Image — 86.9kB PNG, decoded at 1080×1350.
- Back Up — 11.7kB JSON, parses, keys schema/version/exportedAt/projects/palettes, 8 palettes.
- The three clipboard acts, captured at `navigator.clipboard.writeText`: the hex list (5 lines), the CSS
  block, and a value row's own hex.

**The copy mark travels with the word (19.09, by request: "the same mask animation for copied should also
influence the icon").** The row's copy mark and its check swapped in one frame while the words beside them
rode the mask, so half the row moved and half of it cut. The mark now takes the same two keyframes and the
same clipping box at its own size: the leaving glyph goes up and out as the arriving one rises into place.
One `useFlip` holds what both swaps need — the state showing, what left on the last change, and the key
that restarts the pair — so the words and the mark cannot drift apart.

**Labels are Title Case; only notation is in capitals (19.09, by request: "make all labels Title Case").**
Inventoried at runtime rather than from the stylesheets — every element whose computed text-transform was
uppercase, across the landing, the tool, the grid, the library panel, five dialogs, the drawers, /about and
the phone story. What was shouting: six dialog eyebrows (Add to Projects, New Project, Contrast Checker,
Export Tokens, Colour Harmonies, Share Palette), the chips and section heads (Example, Viewing, Source,
Mapped, Project, Text Usability, No Reference, the filter groups) and the export format tags. Each one
carries its case in the source now and the transform is gone. What stays in capitals is notation, because
it is not a label: hex values, HEX / RGB / CMYK / HSL, AA, and the formats CSS / ASE / JSON.

And two `text-transform: capitalize` rules went with them, which this file and renderVals had both already
argued against — capitalize shouts at every word in the string. They were rendering "Share Via…" and
"Tailwind V4" in the share and export dialogs. The strings are Title Cased where they are written instead,
so "Share via…" reads as it was typed. The only capitalize left is on measured VALUES ("warm", "high key"),
which are data rather than labels.

**The filled tier stands where the outlined ones do (19.09, by request: "make sure the padding is the same
as the other buttons").** --action-primary-padding was `0.75em 1.35em` against every other tier's
`0.75em 1em`, so on each row the two share — the result stage's acts, the detail overlay's, every dialog's
pair — the filled label was inset 4.5px further than its neighbours', and the row read as two sizes of
button. Fill is what separates the tiers, and it does that on its own; the padding does not have to say it
twice. Heights are untouched (35.5px); Add to Projects is 9px narrower, Done matches Cancel. The masthead's
New Palette keeps the roomier figure it was given by request — its rule states the value now rather than
deriving it from a tier that has moved.

**Nothing is inflated on a real phone any more (19.09, by request: "the font-size for hex and LCH on my
phone doesn't reflect the design. Font-size seem too big compared to the localhost").** iOS Safari boosts
small text inside wide blocks on its own, and no desktop browser's phone emulation does — so the story's
tiles, whose hex is 13px and whose OKLCH is 11px here, arrived about half again as large on the reader's
iPhone while the headings around them were untouched, which is the signature of the boost. `html` now
carries `text-size-adjust:100%`. 100% rather than none: it turns the automatic boost off and leaves the
reader's own zoom and Dynamic Type exactly as they were. It is a root rule, so every small figure on the
site — the checker's rows, the labels, the notation — is now the size it was designed at on iOS. Verified
in Chrome only (the rule computes, nothing moves); the behaviour it corrects cannot be reproduced without
WebKit.

**The picks' hex is Medium and its share is the key's size (19.09, by request).** Under the photograph the
hex is what names each card, so it takes the Medium face beside the share; in the Role panel the card is
led by the role's name and the hex stays the Regular notation under it (the 19.09 request "let hex code be
regular weight" still stands there). The share on the picks moves from --fs-lead to --fs-subtitle, which is
what the chapter above prints the same figure at: one screen apart, the same number was set two ways.

**The phone story's colour cards are the colour (19.09, by request: "the visual presentation adjustment i
asked for was the color percentage cards below frozen slate on mobile").** How it Works' role cells have
been the colour itself since 18.09; on the phone this was the last place a palette colour was shown as a
chip on a --surface card with a 1px edge. The cell carries --role-colour and --role-ink now, the swatch
element is gone because the cell IS the swatch, and the hex and share sit on the colour in the ink that
reads there — one rule for the picks and the Role panel, which are one component. The heights do not move
(138px in the picks, 156px in Role), so the arrangement set on 19.09 — hex at the top left, share at the
bottom right — is unchanged. Selection moves from the border going to full ink to a 2px ring inset in the
card's own ink, for the reason the border rule gave: the cell is a block of the palette's colour, and
tinting it would change the very thing it shows. The name's colour is stated at (0,3,0), because about.css
sets it at (0,2,0) and comes later in the bundle.

**The takeover's statements take the column on phones (19.09, by request: "extend width. typography is
cramped").** Their measure is eight of twelve tracks, which at 375 came to 223px of a 343px column: the
28px statement broke every two or three words, ten lines deep. At 600px and below it takes the column, so
the same statement sets in six lines. The measure is unchanged from 768 up: 472px there, 643px at 1024 and
920px at 1440. A release at 1100, matching the closing statement's, was tried first, but it set 1024
edge to edge, wider than the desktop measure.

**The page arrows behave like the design system's buttons (18.09, by request).** The pair under
the list (and the scope rail's, while it lasted) rolls its chevron up through its mask on hover, as
the list icon, the close marks and every label do. Their hover fill is the primary
black, `--action-primary-surface` with the chevron in `--action-primary-ink` (the pressed chip's
own pill, in both themes), where it was the press tier's 16% grey; a press takes
`--action-primary-press`, and nothing moves. The pager's hairline fills with it, so its circle is
one solid disc. The hover sits behind `(hover:hover)`, so a tapped arrow never keeps a black disc.
`IconChevron` takes a `turn` so the svg stays the swap's only child: with a wrapper span there,
global.css would read the button as text-bearing and drop its hover fill.

**No Unfiled scope (18.09, by request: "Not all colors need a folder").** The rail's Unfiled chip
is gone. It singled out the palettes in no project, which made being outside a folder look like a
to-do, and All already holds them. With it went the scope's other traces: `projectName()` has no
word for "no project" (it returns ''), deleting a project says its palettes "stay in your library",
and saving a palette inside All files it nowhere. **Backups hold every palette that is not in a
folder** ("it should still be backed up when a user chooses to do so"): a backup whose scope is not
a live project id (the masthead's library backup, All's `null`, a project since deleted) writes the
whole library. It used to write only the palettes in no project, under the name "unfiled", for
`null`. Only a backup of one project is limited to that project. Verified: 8 of 8 palettes, the 3
without a folder included, in every backup but a single project's.

**Already Extracted (by request).** The secondary button reads "Extract Again" ("anyway" went).
"Saved just now" and the note under the buttons ("Extraction is repeatable…") are gone. Later the
same day, the "Already extracted" eyebrow went too, since the line under the name says the same.
The name now centres on the close mark, and the line is one step larger, `--fs-body` (13px, was
`--fs-detail`). The other four dialogs keep their eyebrows, which name the action.

**The project rail's arrows are a pill (by request, C11).** "Full radius on both sides": the
straight hairline between the chips and the arrows is gone.
- The pair is its own pill. It sits on the rail's edge (-1px on three sides) with the page colour
  under it, so the rail's line is drawn once and only the round left end is new.
- It reaches 18px back over the scroller, so chips slide under the round end. The scroller pads its
  end by 18px (20 with its own 2) while the arrows show, so the rail's width doesn't change when
  they fold in or out.
- `_projStepsOverlap` (misc.js) removes those 18px from the view that stepping and
  select-to-reveal measure, so a chip never stops under the pill.

**Manage Library's filter rows are Add to Projects' rows (by request, Q4).**
- A raised stadium with a hairline edge, 11px by 18px of padding, 6px apart, white on hover and
  keyboard focus, and the edge in ink while the filter is on.
- The pill is there from the drawer's first frame, and only its contents arrive (by request: the
  rows must not fade in, and the plate's wipe read as one). The label and count rise through their
  line masks as before. The tick box rises through its own clip on the same beat: pageReveal's
  `data-reveal-rise` moves a wordless block's child instead of fading the block. Tick boxes keep
  their shape with `--radius-tick` (3px).
- **Why a tick could show empty:** `splitLines` (maskLines.js) rewrote `innerHTML` even when an
  element had no words to split, which replaced React's tick box with an inert copy. It now returns
  without touching the element. A split element that holds React-managed elements *and* text still
  gets a copy back on restore, so keep split targets to text.
- The arrow keys in the filter groups looked for the traits list's rows and did nothing. They now
  step through `[data-sec-row]`.

**The big calls to action keep their voice (by request, Q7).** The landing's Create and How it
Works, How it Works' Explore Atmos and the 404's button stay Medium, 14px, with statement tracking.
global.css now lists the three voices a control may use besides the uppercase default, beside the
uppercase rule.

**The unreachable character traits section is deleted (audit H3, E9).** That covers the search,
Most used / A–Z, the trait rows, Show All / Show Fewer, their state (`tagQuery`, `tagSort`,
`facetAllOpen`, `charOpen`) and the per-render counting that only they read. Filtering by a trait
is still reached from a palette's own tags. Also deleted:
- 17 unused style objects in renderVals.
- `@keyframes hue` and `blink`, the `lift` tier and `[data-disc-chev]`.
- The phone story's `--fs-nano`/`--fs-micro` remap, which fed nothing.

**Also:**
- **Icon buttons:** 32px for the row actions, pager and project steps. The row's action column is
  70px and the folder sits at `+ 38px`.
- **Chooser arrows:** kept as drawn. The `IconChevron` swap from this round was reverted, by request.
  The chooser still opens on the story's own (random) example, but `goToIndex(at, true)` lands there
  instantly, behind the page transition. A played slide change used to show through the opening
  window.
- **Row scale:** `commitSelected`, the row's 0.98 → 1 scale, is removed.
- **Tokens for chrome colours:** `--mark-gradient`, `--lightbox-scrim` (written as `rgba()` so GSAP
  can tween it), `--ground-ink` and `--on-photo`. The page transition's veil is `--scrim`.
- **Transition corner:** `--radius-window` (3em) holds the slot's corner, and wipe.js reads it.
- **Fallback eases:** the GSAP names nearest each token: `expo.out`, `power4.out`, `power3.inOut`,
  `power2.out`. GSAP can't read a `cubic-bezier()` string.
- **Durations:** `DUR.focus` (0.9s) is new.
- **Tracking:** the 15 `-.01em` sites read `--track-title`.
- **How it Works matrix:** takes the status tokens. The tinted rules are gone, and the no-role
  class is `is--none`.
- **Comments:** those that still described a square system are corrected.
- **H1 (raw spacing):** no change. No raw padding equals a padding token.

Checked with before and after captures in Chrome at 1440×900 and 390×844. The zoom backdrop and the
page transition were checked in the page; no console errors.

---

## 2026-09-17 — The audit's fourth round: 28px modals, the banner's voice on the toggles, no dock

**Modals take the corner the nav bar and the create container share (by request).**
`--radius-surface` is 28px: the floating bar is a 56px stadium, so its ends turn on 28, and the
dropzone is set at 28. The dialogs, the drawers' free corners and the analytics banner read the
token. The toast and notice stay fully round.

**The segmented controls speak like the analytics banner's buttons (by request).**
- `viewToggleOptStyle` is 13px Medium, with the capitals lifted in global.css. Everything built on
  it moves together: List / Grid, the scope chips (All, Unfiled, projects), the library panel's
  Filter / Projects, the page sizes and the contrast checker's rails.
- Passing Only follows, to stay in voice with the rails beside it.
- They are Medium in both states, so selection still doesn't change the weight (Q6).
- Not moved: the harmony methods and Most used / A–Z (`toggleStyle`), and the phone story's toggle.
- **The counts sit on the label's baseline** (All, Unfiled, the project chips, the Projects tab).
  - Why: centred, the 11px count's foot was about 1px above the 13px word's baseline, with its top
    level with the ascenders, so it read as stuck to the top.
  - How: `align-items: baseline` on the chips and tabs.
  - What that took: the chip's label span lost its overflow clip, because a clipping flex item's
    baseline is its bottom edge, and the tab's swap got a plain wrapper for the same reason. Long
    project names still truncate: the ellipsis comes from the `[data-proj-chip] .tswap` rules.

**The section anchor dock is removed from How it Works, and so from the site (by request).**
- Its markup is gone from about.html, along with the `data-section-dock-hide` attribute.
- `aboutDock.js` and its mount in AboutPage are gone.
- Its styles are gone, with `--radius-dock-row` and the dock's case exemption.
- `--radius-dock` stays: How it Works' feature pills use it.

**Follow-ups the same day (by request).**
- **The contrast checker's rails:** at 13px, the segmented control's 7px block padding made a 29.5px
  button in the rails' fixed 27px track, and the labels sat 1.25px low. The rail buttons now have no
  block padding, so the grid stretches them to the track and the labels centre.
- **Dialog buttons:** the three dialog button pairs take the banner's voice, the outlined one first,
  as on the banner: Restore, Add to Projects and Already Extracted. They were one object before this
  and stay one.
- **Restore:** loses "Nothing is replaced…" and its footnote "New palettes go to the top…". Its line
  remains only when nothing in the file is new, because then it explains why there is no act.
- **Add to Projects:** the "Added" marks lose their check mark.

**Also:**
- **Harmony button:** a bare glyph with no edge, and the requested icon (a disc in a broken ring).
  Hover is the library rows' folder-and-bin answer: a round 16% tint, from the swatch's ink.
- **Notice:** takes the toast's padding, 8px, with 16px on the leading edge.
- **Analytics banner:** its Accept shows no check mark when reopened.

Checked with before and after captures in Chrome at 1440×900; no console errors.

---

## 2026-09-17 — The audit's third round: the banner's voice, and some reversals

**The analytics banner's buttons are the model for the in-page acts (by request).** The following use
`CONSENT_BTN_TYPE`, Medium, Title Case, and a filled button beside an outlined one where there are
two:
- the create page's error panel (A2)
- the library's "No palette matches" pair, Remove Last Filter and Clear Filters (A3)
- the shared-link strip, Save to Library and Make Your Own (A8)

The containers carry `data-voice="banner"`, and one rule in global.css supplies the weight and case.
The same text style (13px, Medium, Title Case) is on How it Works' feature pill labels (A4, which
also answers the audit's Q8) and on the phone story's contrast verdicts (A5: Body Text at AA, Large
Text at AA, Decorative Only).

**Reversed on review, so don't bring these back:**
- **A1:** the harmony button has no fill: a full-strength 1px edge and glyph in the swatch's own ink
  (`onColor()`), with the icon tier's 16% and 28% tints. The solid disc lasted one round.
- **A2:** the error panel is text only: the "!" is gone, ring and all.
- **C9:** the toast and notice are fully round again, and the notice has no leading dot. They keep
  the surface shadow and the page gutter.
- **G3:** the Viewing label and the harmony badge are 8px again (`--fs-nano`); the 11px lasted one
  round.

**Also:**
- **A8:** the in-page panels are fully round (`--radius-pill`), not 18px: the shared-link strip and
  both library empty states.
- **E3:** Add to Projects' Confirm has no check mark.

Checked with before and after captures in Chrome at 1440×900 and 390×844; no console errors.

---

## 2026-09-17 — The audit's medium findings, and three high ones revised

**Three high findings revised on review.**
- **A1:** the harmony button is a solid disc: black on a light swatch, white on a dark one (the
  swatch's `onColor()`), with the glyph in the other colour. Hover and press mix the fill 16% and 28%
  toward the glyph.
- **A2:**
  - The error panel's "!" has no ring. It is set at the title's size and weight, because bare at the
    old size it read as a stray character.
  - Its button is set like the analytics banner's (13px, Medium, Title Case: "Choose Another Image").
  - The decode-failure title reads "This image could not be loaded".
- **A7:** the skip link takes the banner buttons' type, and reads "Skip to Main Content".

**The phone's example view and example list are gone (C5, by request).** So are their ways in:
- the gate's `Explore an Example`
- `See All Examples`
- the list rows
- `exampleView` / `exampleList` and every method around them
- `MarkScrim`
- the `HBtn` wordmarks on those branches

A shared link keeps its read-only view (asked and answered), without example browsing, under the
documents' masthead (`DocHead floating`). The masthead sits at the same child index as it does in the
story branch. The wordmark and Escape both return to the story and clear the hash.

**Floating surfaces (asked and answered, Q1 and Q2).**
- 18px (`--radius-surface`) on the toast, the notice, the analytics banner (was 20px), the library
  panel and both drawers. The panel and drawers round only their two free corners.
- One `--shadow-surface`, the dialogs' own, on every solid floating surface.
- Glass takes no shadow: the banner and How it Works' dock lost theirs. The dock's shadow was mixed
  from the ink, so it was a pale halo in dark mode.
- One `--glass-blur` (12px) replaces 12px, .75em and 18px. The How it Works and 404 buttons now write
  `-webkit-backdrop-filter` first, so Firefox keeps the blur.

**Interaction.**
- A `mark` tier for controls that are artwork or display type: the wordmark button, the reference
  image and the chooser's titles. They go to 82% on hover and 72% on press, through `filter` rather
  than `opacity`, because the wipe and the loader tween the wordmark's opacity.
- The wordmark hides while the palette detail is open (`data-detail-open` on the tool's root).
- The harmony swatches take the cell tier. Their colour moved to a wrapper, which also carries the
  drawer's reveal hooks.
- Add to Projects rows take the export rows' press and label swap.
- The page-size options swap their label.
- "Copied" eases in the Copy dialog and on the phone.
- Hovers on How it Works, the 404 page and the legal pages only apply on pointer devices.
- Filter chips wear `IconClose` in the swap (by request).
- The toast and banner closes are 28px.
- The toast and notice sit on the page gutter.

**Scale.**
- Motion:
  - Export arrives through `_dialogIn` like the other four dialogs.
  - `--dur-overlay-out` is .62s, what the code runs.
  - The zoom, detail, grid close, loader and extraction bar run on named steps: `DUR.line`,
    `DUR.extract`, `EASE.progress`.
  - The CSS scale gained `--dur-drift`, `--dur-pulse` and `--ease-ambient`.
- Type:
  - Eight display tokens (`--fs-hero` … `--fs-fit`) carry today's heading sizes unchanged (asked and
    answered, Q3).
  - Tracking sits on the steps.
  - The Viewing label and the harmony badge are 11px. The EXAMPLE chip stays at 8px, by earlier
    request.
  - Selected controls stay Regular (Q6); the Privacy contents are unchanged (A6).
- Chips and the phone:
  - The trait chips are one chip: `--btn-pad-chip` in a 26px box.
  - The phone's segmented control is the desktop's: action-line edge, 2px padding, ink marker.
  - Phones under 560px draw every wordmark at 126×20 through the logo tokens.

**Not changed:** G5, the 404's 16px line, is no longer on screen; the sentence is read to screen
readers only.

Checked in Chrome at 1440×900 and 390×844, with before and after captures from one script, plus the
Export dialog, the harmony model switch, the wordmark's return after the detail, and the phone
shared link's wordmark and Escape exits. No console errors. Not checked in Safari, in Firefox, or on
a real touch device.

---

## 2026-09-17 — The reading is paced by the work and by the photograph

**The four status lines are four real steps now, and each is on screen long enough to read.** They
were cosmetic: a 620ms timer changed the line whatever the work was doing, the bar ran a fixed 7.5s
tween, and a 1.3s minimum let the result arrive before the third line. All the real extraction had
already run before the stage appeared. The user asked for all four thoughts to be present, for the
stage to feel like processing, and for the time to be real rather than the same for every image.

**Each line is its own work.** Reading light makes the display thumbnail (the full photograph drawn
down and encoded). Sampling the field turns every kept pixel into OKLab. Grouping the colours runs
k-means, builds the swatches and the local reading, and sends the live reading. Naming the mood waits
for the live reading. The recognition gate still runs first, on the 72x72 buffer and its hash, so a
known image never opens the stage. The palette comes out identical: same bytes, same order, same
functions.

**A line ends when its work is done and it has been up for its thought, whichever is later.** A
thought is `DUR.think` (0.75s), stretched by the picture where the real cost depends on it: Reading
light by pixel count (log-scaled, 0.82x for a screenshot up to 1.7x), Grouping by how far apart the
colours are (0.8x for a flat grey up to 1.5x). With the local reading, measured with the natural end
included: a 0.4MP screenshot reaches the result in 3.8s, and a busy 24MP photograph in 4.6s. A single
floor had given every image 4.1-4.8s. The live reading adds its own real time and nothing else.

**The bar follows the steps**, filling each step's stretch over its thought and creeping during the
live reading. Each new line rises in through the copy confirmation's mask (`val-mask`, `--dur-swap`).

## 2026-09-17 — An atmosphere while the photograph is read

**The processing stage shows a small, colourless version of the landing's field.** It is the same
volume (`nebulaField.js`) and the same turning disc with its eye, about 140px across, floating where
the ruled 380x250 box used to be. `procField.js` owns it. It never touches the landing's palette,
wheel, memos or ticker, and `orbit.js` is unchanged.

**How it got here, all by request, with recordings compared at each step.** The first build filled the
box with the extracted palette's gas, and it was too strong. Blends of that gas over the old blobs were
either too faint to recognise or still a colour field in a box. The brief became: not tied to a
container, smaller, with a natural end; and no colour, because while the reading runs the tool does
not know the image's colours yet. From three neutral candidates the user picked the smaller, lighter
one, and kept the natural end.

**It grows in and contracts to nothing.** It scales up from half size as the reading starts, and at
the natural end it draws in to 0 while it keeps turning at its own tempo (an earlier cut eased the turn
to rest, and it read as stopping before it left). Both are changes of size, so both run on
`EASE.fold`, the system's curve for that; the gas fades in on `EASE.standard` and out on `EASE.exit`,
and the bar completes on `EASE.progress`. No curve outside the motion system is used.
**THE ENDING IS GONE AGAIN** — see the entry at the top of this file: the atmosphere now sits. The
grow-in and the curves are unchanged.

**It lives on its own.** The slot keeps its size so the stage does not move, but it has no ground, clip
or rule. The disc thins out at its own rim (eye 30x18, rim 2.3 of it, with a firmer edge from `fade`
0.7 and `rise` 0.34). It was 48x28 at 2.8 until the user asked for it "more compact and smaller" and
picked this from three sizes, keeping the slot's height so the page does not move.

**It has no colour.** Its ramp is the landing's tonal ladder with the hue removed: greys solved against
`--surface`, so it is a shade of the page in both themes. `tone` 0.2 and `toneSlope` 0.25 keep it to
the near half of the ladder, so the rim stays a mid grey on light and a soft grey on dark. Colour
arrives with the result.

**It ends.** When the reading is done the disc contracts, still turning, the gas dissolves and the bar completes
over `DUR.settle` (0.7s, a new named step), and only then does the result take the stage (`_procClose`,
called from `commitGenerated`). This does not run under reduced motion or in a hidden document, and a
timer backstops the ticker. Once the close has begun, a field still being built stays out of sight,
because a first build that landed mid-close faded in and was then cut off by the commit.

**The old drawing is gone, and a neutral floor replaces it.** The photograph's blur and the five
palette-coloured multiply blobs went with the box. The 2D canvas now draws neutral blobs turning round
a soft ellipse of the same footprint. It shows only where the field cannot: no WebGL 2, a first build
slower than 600ms, or a lost context. When the field is expected, the stage starts empty and the disc
arrives from nothing.

**Its own tempo.** 60 seconds a turn and noise churning 1.6x faster, because the landing's 105 seconds
barely moves in a beat of one to nine seconds. The disc is still rigid.

**Paid once, and off the first frame.** One field serves the whole session: the canvas moves into
each new slot, and the 4x32 ramp is rebuilt only when the theme changes. The chunk is fetched on
intent (hover, drag or browse on the dropzone). From a click, tap or Enter it is asked for after the
next paint, because the first ask makes a WebGL 2 test context (5-6ms at 1x, 12-29ms at 4x) that
otherwise counted against the interaction. The build waits for the stage's first paint, and the
shader links through the field's own `compile()`, which polls with a guard so a field destroyed
mid-link ends the poll instead of throwing inside three. First build: 20-30ms of main thread, with the
disc on 100-150ms after the drop.

**A leak went with it.** `startCanvas` scheduled two rAF chains and `stopCanvas` could cancel only one,
so every generation left a loop drawing into a detached canvas. It is now one chain with a switch.

## 2026-09-17 — The audit's high findings: round controls, focus rings that show, and a 3:1 edge

**From the design-system audit of 17 Sept: every high finding but A6.** The Privacy and Terms
contents marker stays as it is, by request.

**The controls that were still square are round.** The harmony buttons on the result stage and in the
palette detail are 28px circles (the detail's was 26px), with the icon in the hover swap and the chrome
focus ring. Their own `[data-info]` transition now lists the shared properties on the shared timings,
so their tint no longer jumps (audit E1). The error state takes the dropzone's 28px corner, its "!" is
round, and its button is the filled button-006 pill. The "No palette matches" buttons and the skip
link are pills. The phone story's verdict chips are pills with the matrix's 12px sides.

**How it Works' feature pills round on `--radius-dock`, not `--radius-pill`.** The box morphs from a
one-line pill into a card holding a paragraph. The pill token would make a lozenge when it opens. The
dock's 20px clamps to a stadium while the box is shut and is a 20px corner when it's open, which is
why the dock uses it.

**Focus rings that never painted now do.** The wordmark button masks itself to the logo, and a mask
clips the element's own outline. So its ring is a separate element beside it (`LogoRing`,
`[data-logo-ring]`), shown by `button[data-logo]:focus-visible + [data-logo-ring]`, and added to the
phone's allow-list. The ring is 4px wider than the mark on each side, because the artwork runs to its
box's right edge and the curve touched the "y". The 404 wordmark link takes `data-focus="chrome"`
with the same 4px (padding, taken back out with a negative margin, so the mark doesn't move). The
phone story's gallery cards use `data-focus="card"`: the `value` token is an inset shadow, and the
photograph painted over it.

**The 404 button's edge is `--action-line`, and How it Works' Explore Atmos moved with it.** The 404
button's 15% edge was about 1.5:1 against the page. Explore Atmos used 36% in both themes, and a code
note says the two buttons match. 36% is 3.6:1 in dark but measured 2.5:1 in light, which is why the
token is 48% in light. Both buttons are now 3.4:1 in light and 3.6:1 in dark, with hover and press on
`--action-line-hover` and `--action-line-press`. For Explore Atmos, hover is unchanged and the press
edge is 72% instead of 82%. Their hover and press fills still differ (16/24 on the 404, 12/18 on How
it Works).

**The image zoom's close button is the app's close mark.** `misc.js` builds the swap and the
`data-icon="close"` glyph by hand, so the close-mark rule removes the fill. On the black backdrop,
its edge and × are white (`--cta-ink`) and strengthen on hover and press. On touch and under reduced
motion, the fill comes back in white.

**The Copy dialog's rows tint on hover and focus**, through the same `rowTintOn`/`rowTintOff` that
Export's rows use.

Checked in Chrome at 1440×900 and 390×844, with before and after captures of each state (hover forced
through DevTools, focus reached by pressing Tab). The 404 page and Explore Atmos were also checked in
dark mode. Not checked in Safari.

---

## 2026-09-16 — A close mark's hover is its icon, not a fill

**By request: no hover fill on close buttons; the icon's mask animation is enough.** This reverses the
earlier call that icon-only press buttons keep their 16% fill. Every close and dismiss mark now paints
no fill on hover or press, and only the × sliding through its mask answers, with the border still
strengthening. That covers the five dialogs, the drawers, the palette detail, the grid view, the
analytics banner, the toast and the notice. The rule is structural: a press-tier button whose swap
holds `svg[data-icon="close"]`, the attribute `IconClose` now carries, so a new close mark built the
same way is covered automatically. Other icon-only buttons (steppers, a row's actions) keep their fill.

**The two stragglers got the mark.** The notice's Dismiss was a bare "✕" character with no swap, and
/about's feature-pill close was two CSS-drawn lines. Both now use the `IconClose` glyph in the masked
swap. The pill close keeps its opaque plate over the photograph, and the plate no longer tints. It is
also fully round now (`--radius-pill`, by request), where it was the one square copy of the mark.

**Still gated.** On a touchscreen and under reduced motion the swap does not run, so the fill comes
back there, as it does for the text buttons. Checked in Chrome: the export, library, notice and banner
closes have no fill with the swap running and the 16% fill under reduced motion, and a row's action
button keeps its fill.

---

## 2026-09-16 — Every dialog has the same corners and the same controls

**The 18px corner (`--radius-surface`) is on all five dialogs.** Copy and Export had it; Add to
Projects, Restore from a File and the already-extracted notice now do too.

**Restore and the already-extracted notice use the same controls as the rest.** They were the last two
dialogs with a square "Cancel" in the header and full-width square buttons, one filled and one
outlined. Now they use the app's close mark (the 32px circle with the press tier's hover and press)
and a right-aligned pair of button-006 pills under the rule, like the project picker's Cancel and
Confirm:
- Restore: Cancel, then the filled Add to Library. There is still no footer when nothing in the file
  is new, and the close mark is the way out.
- Already extracted: Extract Again Anyway, then the filled Open Existing Palette.

Their opening lines are set in `--fs-detail` and the notes under the pair in `--fs-fine`, the sizes the
copy and export dialogs use. Checked in both themes: both pairs fit on one row, hover works, and
keyboard focus shows the button-006 ring on the pills and the chrome ring on the close mark.
Cancel and the close mark both close without adding anything.

---

## 2026-09-16 — The phone's example chooser has a parallax between its photographs

**By request: a slight parallax, so the photograph moves as it changes.** The chooser's mask transition
already drifted both photographs, but by the same quarter of the screen at the same rate, so they read
as one strip shifting under the edge. Now the arriving photograph drifts further (30%) and settles from
a 10% zoom, and the one being covered drifts less (15%), like layers at two distances
(`layeredSlider.js` [ATMOS 9]). At 390px that is about 117px against 58px. It is still drawn from the
slide's offset, so a swipe scrubs it and going back reverses it. Measured over a whole transition,
no frame exposes an edge of either photograph.

---

## 2026-09-16 — The analytics question waits for the reader's first input

**Decision:** the banner still asks once, after the page has arrived and never under the loader or a
crossing, but only after the reader has clicked, pressed a key, turned the wheel or touched the
screen. **Amends the timing in the 2026-09-15 entry "Analytics waits for consent"**; the rest of that
entry stands.

**Why:** asked unprompted, the banner's sentence was the largest thing the landing and the tool ever
painted, and it arrived about 4.7s after load (7s on a slow connection). Speed Insights only starts
after Accept, so most first-visit samples came from readers who had waited for the banner, and each
of them reported its arrival as the page's Largest Contentful Paint. Speed Insights scored / at 84,
with an LCP of 4.17s, while the page's own content paints in under a second. Chrome stops choosing a
largest paint at the first click, key, wheel or touch (a mouse move does not end it), so a question
that waits for one of those can never be the paint it picks.

**Tried first:** the old arrival and four alternatives that kept its timing, all measured in the app:
the first frame painted below the viewport, the first frame at 5% scale, the words on their own
compositor layer, and a compositor-only fade. Chrome counted the sentence in all five, at the first
repaint that showed it. Test pages outside the app did not reproduce this, so an arrival that passes
in isolation proves nothing here.

**The cost, accepted:** a reader who never touches the page is never asked, and nothing is measured
for them. A reader who does is asked on the same beat as before, or 400ms after that input if the
beat has already passed, and still never under the loader or a crossing.

**Two timings moved in the same change (1d3f8cb):**

- **A palette closes inside the press.** doReset swapped back to the dropzone at 0.8 of its exit,
  about 560ms with five bands, and the Library section rising back into view that late counted as a
  layout shift (0.068 per close). Chrome ignores a shift within 500ms of an input, so the swap is
  capped at 380ms and the result's fade keeps its proportions to the cut.
- **A crossing, and a palette opened from the library, start after the press has painted.**
  `_wipeCover` raises its guards in the click, then takes the snapshot and swaps on the next task;
  `loadIntoResult` renders on the next task, and the later of two quick presses wins. The window is
  otherwise unchanged (1.2s, ghost gone at about 1.7s), and the palette arrives one frame later. With
  the CPU slowed 4x, How it Works went from about 100ms to 32ms, and Create from 104ms to 28ms.

---

## 2026-09-16 — The phone story has no section rules either

**Removed by request, after /about's.** The story's seven chapters no longer carry `data-rule`, so no
hairline is drawn at a chapter's top on a phone. Nothing else changes: the rule is still drawn for any
section that opts in (`.about-sec[data-rule]::before`), and none does now. The tables and cells inside
the chapters keep their own borders.

---

## 2026-09-16 — The bar's right end, the phone's logo and first drag, and no rules on How it Works

**The top bar's right end is padded 24px, its left end 16px.** By request, right side only. The token is
`--nav-inset-end`, which is `--page-gutter`: 24 on a desktop, 16 on a phone, where that end holds
nothing. The tool's bar takes it as padding. The documents' masthead centres its wordmark in a
three-track grid, where uneven padding would move the mark 4px, so it keeps even padding and moves its
actions in by the difference. Measured: the last action ends 24px inside the hairline on the landing,
the tool and /about, and /about's mark sits exactly on the bar's centre.

**On the phone's front page, the logo goes back to the start.** It was a link to "/", which on a phone
is the story itself, so pressing it did nothing, even over the example chooser. Now
(`returnToStoryStart`) it runs the site's transition and returns to the first screen as a visit starts:
the chooser closed, the example the visit rolled (with the field and its credit), no colour picked, the
first tab, and the top of the page. A reader already there gets at most a glide up.

**Dragging past the story's opening screen starts moving at once.** The drag was never slow; the page
follows the finger 1:1. But the hero was 200svh, so the first 422px of a drag (at 390x844) only faded
the copy in place, and 1.1 appeared after that. At 150svh, with the same half-screen overlap, 1.1 rests
on the bottom edge and rises from the first pixel, and the dissolve finishes as it reaches the copy.

**How it Works has no section rules.** /about's sections no longer carry `data-rule`, and the hairline
is drawn only where a section asks for it (`.about-sec[data-rule]::before`). The phone story keeps its
rules, and the two figure dividers on /about (`.about-divider`) are a separate element and stay.

---

## 2026-09-16 — The phone story has no chapter dock

**Removed by request.** The phone story carried /about's anchor dock: the glass pill at the foot of
the screen that named the current chapter ("2.1 Character, Role and Contrast") and opened into the
list. Its markup and its setup in `_syncStory` are gone. /about keeps its dock, including the handoff
rule added the same day. The story's chapters keep their ids.

---

## 2026-09-16 — On a phone, exploring an example ends with How it Works' 4.1 scene

**The story's gallery is the same scene as How it Works 4.1.** The old heading ("Different Images.
Different Palettes.") and its sentence are gone. In their place is /about's statement, word for word:
"The examples below are palettes drawn from different photographs. Compare their colours, proportions
and contrast, then try your own image in the desktop tool." It assembles on the empty stage, fades from
its end as the first photograph arrives, and the seven other examples fly across with the rail's drift.
It is the same markup and the same module (`initHorizontalRail`), so the two surfaces cannot drift
apart. It replaces Osmo Supply's Horizontal Scrolling Sections (two cards to a screen), whose module and
styles were removed.

**The cards still open their example.** Here they are buttons, so the story hands them the pointer back
from the stage, which otherwise lets taps through to the close underneath.

**The close is handed off as on /about.** "Start with an image. Discover its palette." starts
assembling, in place, as the last photograph clears its first word. The story's own line and its
Explore Another Example button arrive with "Discover", as Explore Atmos does on /about. They are faded,
never rewritten, so the button keeps working throughout.

**The chapter label follows the handoff.** A section pulled up under the gallery's pin now counts as
current when its statement starts. Before this, the story's label read "Your Own Image" while two
photographs were still crossing, and /about's dock hid over its last cards.

**Checked** in Chrome at 390x844, 320x640 and, for /about, 1440x900. No revealed letter is ever under a
photograph, a card tapped mid-flight opens its example, and Explore Another Example opens the chooser.
Reduced motion shows the statement above a row that scrolls sideways, and there were no console errors.

---

## 2026-09-16 — While the landing is up, the create page under it holds still and is not drawn

**What was wrong.** The desktop landing is a fixed cover over the create page, not a replacement for
it, and nothing stopped the wheel from scrolling the page underneath. A flick on the landing moved the
hidden page 711px. Chrome showed nothing of it. Safari did: the floating bar is glass (a blur and, on
the landing, a 40% tint), and the create page could be seen sliding along under it. It also left the
tool scrolled down for Create to arrive on.

**What it does now.** While the desktop landing is up, the root carries `data-landing-cover`
(`_syncLandingCover` in `methods/misc.js`):
- Lenis is stopped, which blocks the wheel and puts `overflow:clip` on the root.
- `overflow:hidden` locks the page for readers without Lenis (reduced motion).
- The page's three in-flow regions (`main`, the library and the footer) are `visibility:hidden`. They
  keep their layout, so nothing reflows when the landing leaves.

The bar, the mark, the loader, dialogs, notices and the analytics banner are untouched. The lock lifts
at the transition's commit, so the window opens on a page that is drawn. The departing page's snapshot
is excluded from the rule, so it stays drawn while the landing comes back.

**Not on a phone.** There the landing is the ground under the story, and the story has to scroll.

**Checked** in Chrome and in Playwright's WebKit. The wheel and paging keys on the landing leave the
page at 0. Create, the wordmark's return, How it Works and Back all lock and release it correctly,
with no blank frame in either transition. Reduced motion locks without Lenis, the consent banner stays
visible, and the phone's story still scrolls. Playwright's WebKit draws no backdrop blur, so what the
glass shows in Safari itself was not checked from here.

---

## 2026-09-15 — On a phone, the colour picker under the photograph is two-up

**Two columns, so the photograph and the whole set share a screen.** On the phone's "See Where Each
Colour Comes From", a tap lights that colour's region in the photograph above. In one column the five
cells ran almost 700px under the picture, so every tap meant scrolling up to see what it lit and down
again for the next. Two-up, at 390x844, the photograph (269px) and all five cells (416px) are on screen
together. The cell is unchanged: How it Works' Suggested Roles card, in the same two-up grid the
phone's own Role panel already uses.

**It was meant to be two-up all along; the rule lost on order.** `[data-story-picks]` has the same
specificity as about.css's `.about-roles`, and about.css comes later in the bundle, so its one-column
rule for screens up to 560px won. The picker's rule is now scoped under `[data-mobile-story]`, which
states the exception instead of depending on stylesheet order. That is the same fix the story's
transparent ground uses.

**An odd count keeps its hole.** The facts panel lets a last odd row span both columns. A swatch must
not, because the list runs from largest share to smallest. A spanning cell would draw the smallest
colour at twice the size of the others, right after the chapter that shows the real proportions.

---

## 2026-09-15 — How it Works 4.1 is a hero text on the gallery's pin

**The heading is gone and the paragraph is the section's hero text.** "Different Images. Different
Palettes." added nothing the photographs do not say. The paragraph, "The examples below are palettes
drawn from different photographs…", now assembles character by character with the Sticky Title Scroll
Effect's reveal, then fades out from the end as the first photograph flies in over it.

**It is one pinned run, not a takeover followed by a gallery.** The rail already pinned the section
while its cards flew across. The statement uses that same pin: the track's lead-in grows by
`--rail-lead` (70vh), and the statement assembles on the empty stage before the first card, in place of
the heading, the prose and the margin that used to sit before the pin. The reveal is drawn from the
rail's own ScrollTrigger progress, with `splitChars` shared from `aboutStickyTitle.js`. Reduced motion
and no JavaScript show it as a paragraph above a scrollable row.

**The close starts assembling as the last photographs leave.** This mirrors the statement giving way as
they arrive. While the scene is live, the close is pulled up under the end of the rail's pin
(`[data-rail-handoff]`), so its sticky title runs over the last stretch of the travel. The rail's stage
stays in front, so the cards pass over the words. The stage and its pin spacer take no pointer events,
so Explore Atmos stays clickable; the spacer, which ScrollTrigger gives the stage's z-index, is selected
with `:has()`. Reduced motion keeps the close after the rail as before.

**How far it underlaps is measured, so no revealed word is ever under a photograph.** A first cut
pulled it up by the close's whole height, and the statement started while the last cards still covered
most of it. Now the rail computes `--handoff-overlap` so the reveal starts when the last card's right
edge clears the statement's left edge, using layout without the card's drift, which errs late. It is
re-measured on every `refreshInit`, because a phone's cards are a much larger share of its width.
Measured, with no revealed character under a card at any of the four sizes:
  size        starts, before the pin ends   completes, after
  1440x900    0.6 screens                   0.5 screens
  1920x1080   0.7 screens                   0.4 screens
  1024x768    0.5 screens                   0.7 screens
  390x844     0.2 screens                   1.0 screens

**The statement assembles where it stands, and Explore Atmos arrives last.** Two opt-in hooks were added
to `aboutStickyTitle.js`, and only the close uses them. `data-sticky-start="top top"` starts the close's
reveal once its sticky container is already in place; at the resource's `top 40%` the first words
appeared low and travelled up. `[data-sticky-title="after"]` moves the button off the page reveal, which
showed it as the section entered, before the sentence had begun. It now rides the statement's own
scrub: a fade and 12px rise that begins with the first letter of the word named by
`data-sticky-after-word`, "Discover", then a short hold once everything has resolved, so the close is
fully there while the section still stands. The rail's overlap reads the close's start line, so the
reveal still begins as the last card clears the first word. Measured at 1440x820 and on a phone: the words start
with no card over them, "Discover" and the button begin in the same frame 168px in, the button is
fully there by about 330px, the sentence by about 630px, and all of it holds for about 200px before the
section moves on. Reduced motion
shows the button as before.

**Colour was tried on it and reverted, by request.** The same afternoon the stage carried a gradient
built from the photographs' own palettes, and the close was painted to match, first with a coral button
and then a filled one. All of it was undone: the scene, the close and its quiet glass button keep the
page's natural light and dark colours, and the section's spacing is what it was.

---

## 2026-09-15 — Explore Atmos starts over, and large text grows

**Explore Atmos lands on the default state.** The button at the close of /about crossed straight back
into whatever the tool held, so a palette opened before the detour was what the window opened on, and
on a phone so was the colour chosen in the story's fourth chapter. It now resets first, in one commit
behind the page the reader is still looking at. The tool part is exactly Get Started's reset, which
now lives in one place, `_resetToolState`, so the two entry points cannot drift apart. The phone story
also clears its chosen colour, tab and chooser, and returns to the example this visit rolled, with its
masks rebuilt for it. Measured: a result on desktop comes back as the dropzone, and on a phone a
chosen swatch and a chosen example both come back as the story's opening state.

**The action row under a palette keeps its original type.** Add to projects, Check contrast, Copy,
Export and Share tried the bar's links' voice the same day, Medium in Title Case and then the banner's
13px, and all of it was reverted by request. They stay uppercase, regular and `--fs-label`, 11px,
like every other action button.

**The Copy and Export dialogs have 18px corners,** `--radius-surface`. The Recognise, Add to projects
and Restore dialogs share the same frame and are still square.

**Large text grows into place in the contrast checker.** Choosing Large used to swap the best-pair
sample from 15px to 24px in one frame, one line to two, with an opacity dip over the jump. Now the
sample's box extends to its new height while the words grow, both on `DUR.fold` and `EASE.fold`, the
tokens the Normal / Large marker slides on. Normal runs the same way back. The real font size eases
continuously through every fractional value between 15 and 24px. Two earlier cuts were rejected: scaling
the large layout down put the words in their new line breaks at the press, which read as a jump, and
whole-pixel steps moved in nine visible steps. The text reflows as type does, and `text-wrap: pretty`
keeps "lazy dog" together, so it breaks onto two lines once, at about 21.75px, instead of dropping
"dog" and then "lazy". The weight moves from Regular to Medium halfway, the fastest moment of the curve.
The box's height eases separately. Measured: 56 distinct sizes in 480ms, never more than 0.85px a
frame, the box at most 5px a frame, the words inside its edges throughout, a reversal mid-flight turns
round in place, nothing is left inline at rest, and reduced motion stays instant.

---

## 2026-09-15 — The top bar floats, on the grid, and stands on the landing

**Decision:** the tool's header and the documents' masthead are one floating bar. It stands
`--nav-top` (the page gutter) off the top of the screen and a gutter in from either side, so its ends
sit on the grid's outer lines — measured at 24 and 1416 on a 1440 window, the same two lines the
dropzone and the library are laid on. It is 56px at every width, with fully round ends
(`--radius-pill`). The geometry is on `.glass-bar`, which the prerendered masthead also wears, so no
markup changed.

**The controls in it are bare, by request.** The theme switch has no word and no ring: a 32×18 track
in the navigation's glass (the surface at 70%, a 12px blur, the 12% hairline) with a 12px knob that
is ink in light and light in dark. Position carries the state, and the knob is 14–15.6:1 against
the track over every example field. Its old off state was #d5d5d0 under a --surface knob, 1.4:1,
which would not have been legible without the word beside it. Back Up and Restore have no border —
transparent in every state, so the press tint keeps its stadium and nothing moves. That is a
conscious departure from 2026-07-27's "the control edge is 3:1": in the bar, the label, its position,
the hover swap and the focus ring say "control". The links are set like the landing's calls to
action at Medium, with the case authored as Title Case in the source (Back Up, Restore, New Palette)
and no uppercase transform. Their size is `--fs-detail`, 12px: they matched the CTAs' 14 first and
were taken down to 12 by a later request. The `[data-ix]` tier's forced uppercase takes an exception in the
bar. Tracking stays flat. Back Up and Restore are standalone text with no padding either, so their
12px gap is the gap between the words. The target is widened invisibly instead, by an `::after` 8px
above and below and 6px to each side, so neighbours meet without overlapping. They answer press, and
hover under reduced motion, with muted ink rather than a tint plate. The switch lost its side padding
for the same reason. The bar's padding, `--nav-inset`, is 16px by request, taken from `--row-inset`,
the inset a surface gives its content; it was a gutter less the hairline, 23px. The track and the last
word now sit 17px from the bar's outer edge. The analytics banner's buttons take the links' weight and
case too, 500 with Accept, Decline and Learn More authored in title case, at `--fs-body` (13px),
two pixels up from their old 11 and exactly a step of the scale.

**Back Up and Restore are on every page the bar is on.** The documents' masthead carries them in its
third track, with the same handlers, style and file input as the tool's bar. They are hidden below the
tool's own width, where the library they act on is offered nowhere else and there is no room beside
the centred mark. Because Restore opens a dialog and reports through the notice, `RestoreDialog`, the
notice and the toast render on the document routes too; the latter two were lifted verbatim into
`NoticeLayer` and `ToastLayer`. `_bgInert` now names its landmarks (`[data-float-nav]`, `.doc-head`,
`main`, the recent strip, the footer) instead of querying `header`, which on a document could match the
dialog's own header and inert its Close. New Palette's sides are 2px in from the primary tier's
1.35em, in the bar only.

**A layout shift the float introduced, and its fix.** The prerendered document wrapper is a bare
block, so the masthead's 24px top margin collapsed through it into `<body>`. The body stood 24px down
until hydration made the wrapper a flex column: a 0.017 shift on every cold /about. doc.css now gives
`[data-app].doc-route` the same flex column, and cold loads of all three documents measure 0 again.

**Corners, by request.** The bar tried 24, 12, 16 and 18 in one sitting, and then went back to fully
round, `--radius-pill`, like the pills inside it. At 56px the ends are 28px half-circles, and with the
16px padding the switch's round end sits within 2px of concentric with the bar's. The 18px stayed as a
token, `--radius-surface`, worn by the Copy and Export dialogs. The tool's dropzone wore it too, until
it was asked for 12px and then 28px, on a token of its own, `--radius-dropzone`. 28 is the curve the
bar's own ends make at 56px, so the dropzone's corners bend like the bar above it. The list now holds
four designed radii: pill, dock, surface and dropzone.

**New Palette is on the create page in every state, and off the landing.** It used to show only when
there was something to reset, and pressing it took it away. Now it always starts a palette. From a
result, an error or a generation in flight it runs the reset back to the dropzone. On the dropzone
it opens the file picker, the same act as "Start here". From far down the Library it also glides the
page back to the top, or the reset would play out above the viewport and the press would look dead.
A lock holds until the reset lands, so a double click resets once; the button used to leave on the
press, and that was its only guard. It stands down on the landing, where the landing's own buttons are
the calls to action.

**It arrives and leaves through a blur as the landing goes and comes back.** The exit keeps the button
mounted until the fade is done. It uses Web Animations, which a transition snapshot does not copy.
When the create page itself arrives, on the first load or crossing back from a document, the button is
simply part of that page and does not fade on its own. Under reduced motion it simply comes and goes.

**It leaves the way the analytics banner closes.** The first cut blurred to 10px over `--dur-swap` on
`--ease-fold`, and it popped. It now takes the banner's close figures exactly: opacity to 0 while the
blur grows to 6px, over `--dur-state`, on `--ease-exit`. It arrives the way the banner arrives, the same
blur resolving on `--ease-entrance`. The banner also drops its box 16px; the button does not, because a
control that moves inside a fixed bar reads as a jump. Sampled side by side, the two exits track each
other to within a frame and are fully dissolved at 236ms and 250ms.

**Only the words blur, never the pill.** Even at 6px, a blur on the whole button spread its solid fill
past its own edge, so the pill read as swelling on its way out; that was the pop, reported the second
time as a scale-up. The button now only fades, and the blur sits on the label text, which the button's
own layers clip to the pill's shape. Slowed frames in both themes show the pill's edge and size
unchanged through the whole exit. The press also stopped setting `pointer-events: none`. That dropped
hover at once, and the hover label rolled back down through the fade, showing two copies of the words.
The click guard already ignores a second press, and a reversal mid-exit still turns round in place.

**The grid view's close stands under the bar.** The bar at z-index 95 floats over the grid's
full-screen stage at 90, and the stage's close sat in its top 56px, exactly under the bar's right end.
It now stands one `--nav-top` below the bar, 104px from the top, with its right edge on the bar's
right edge. That keeps it in the top-right corner, where a full-screen view's close is looked for, and
it stays the stage's own control rather than one added to the site's bar. The reduced-motion grid
starts clear of both. The bar only floated over the grid when it was opened from the top: the grid's
scroll lock set `overflow: hidden` on `<body>`, which with Lenis stopped made the body a scroll
container, so the sticky bar scrolled away with the page. The lock is on `<html>` now, and the bar
stays at 24px from wherever the grid opens.

**The grid's hint is a glass chip.** "Drag or scroll to explore" was a plate of its own, 88% surface
under a `--line` stroke, tracked at .06em, 20 and 18px off the corner. It is now `.glass-chip`: the
bar's glass pane and 12% hairline in a 32px pill with `--row-inset` padding, the label voice with flat
tracking, and a page gutter off both edges.

**The phone's front page wears the bar.** It was the one phone surface without it: a lone wordmark
floated at the top and the hero faded it out at the first scroll, because it printed over the chapters.
The documents' masthead now floats there, `DocHead` with `floating` and `onField`. It is fixed rather
than in the flow, so the full-screen opening isn't pushed down, uses the landing's thinner light-mode
glass over the colour field, and takes the wordmark's 155 in the phone's stacking order. It hides on
the way down and returns on the way up, as on /about. The small-screen gate's allow-list had to name
`.doc-head`, or the bar rendered at 0x0. The example list and the shared palette view on a phone keep
their wordmark buttons.

**On a phone, the example chooser's photographs mask over each other.** They used to slide side by
side by the frame's width, which at full screen read as two pictures shunting past with a seam between
them. Now the arriving photograph is uncovered over the one being left by an edge sweeping in from the
right. Each photograph drifts a quarter of the frame the same way, so an edge crosses a picture that
stays put. Going back plays it in reverse, and a jump of several slides uncovers each one it passes.
It is still drawn from the slider's one progress value, with transforms only, and reduced motion swaps
instantly (`[ATMOS 7]` in `methods/layeredSlider.js`). The palette names follow the same rule: they were a strip sliding a
title's width per slide, and now they rise through the site's line masks (`[ATMOS 8]`). The title being
left rises out over the first 60% of a slide, and the next rises in over the last 60%, its lines 13%
apart. Going back, the title drops out and the previous one comes down. The lines are re-cut when the
width or fonts change.

**On the landing it is live.** The desktop landing drops from z-index 150 to 90 and the bar sits at
95. At 150 the landing would have covered what the bar opens: Restore's dialog is 126 and a notice is
128. The phone's ladder is built on the landing at 150 and is unchanged. `_syncAppInert` exempts
`[data-float-nav]`, and the landing's transition snapshot includes the bar.

**The glass matches the analytics banner, and has no shadow.** Both use the same recipe. On the landing
in light mode, the bar rendered at luminance 225 over the pale top of the field and read as milk,
against the banner's 212 over the darker corner. So on the landing, in light mode only, the pane is
40% of the surface rather than 70%. Worst label contrast over all eight example fields is 7.6:1.
Elsewhere the bar sits on the page's own surface, where 70% keeps scrolling swatches from being read
through the chrome. Dark mode keeps 70%. The shadow came off by request, which also took Get Started
from 88–96ms to 32–40ms of interaction latency: a large blurred shadow was being painted in the
transition's first frame.

**What moved with it:** the fixed mark centres on the bar through `--nav-mark-top`, on the tool branch
only; the phone keeps its 18.5px band. The legal contents' sticky offset, heading scroll margins and
`data-toc-offset` (104), and /about's dock jump offset (112) now read the bar's footprint rather than
64px. The masthead's theme switch was 3.5px high in its bar, as it had been in the old one, from the
line box under an inline wrapper; `display:flex` centres it. A 48px phone bar and a smaller phone
wordmark were tried while the switch still carried its word, which made it 88px wide, and were
removed when the word went.

---

## 2026-09-15 — Analytics waits for consent

**Decision:** Web Analytics and Speed Insights run only after a visitor allows them. A banner asks
once, after the page has arrived; Privacy Settings in the footer and links in the privacy
statement ask again. **Supersedes the "Still deliberately absent: a cookie banner" paragraph of the
2026-07-26 Speed Insights entry**, left in place so this reads as a reversal.

**Why:** requested because the site runs both products. Neither sets a cookie, and the banner does
not pretend otherwise — it asks about measurement, not cookies. Having no cookies had been read as
having nothing to ask; that reading was the open ePrivacy question in the privacy review, and asking
closes it without needing an answer to it.

**How it holds:** the answer is `palette-generator/analytics-consent`. Each `<Analytics />` and the
one `<SpeedInsights />` mount only when it is `granted`, and both `beforeSend`s read storage again
per event and return null otherwise — neither SDK removes its script on unmount, so withdrawing
mid-visit is stopped at send time, not by unmounting (`src/lib/consent.js`).

**The cost, accepted:** visit counts and field vitals now come only from visitors who allow them,
so both dashboards undercount from this date. A visit that allows partway through is not lost: its
page view is sent on the click, and Speed Insights still reports that page's FCP, LCP and TTFB from
the browser's buffered entries — measured against the production build with Vercel's production
scripts, which also ignore any browser reporting `navigator.webdriver`, so an automated check has
to clear that flag to see anything sent.

**Found on the way:** Speed Insights was sending the share link's fragment — the whole palette —
with every vital, because its SDK reports `location.href` with only the pathname rewritten; its
`beforeSend` now cuts the fragment as Web Analytics' already did. And `LegalPage` rebuilt its whole
statement on every re-render (a new `dangerouslySetInnerHTML` object each time, the fault AboutPage
had already fixed), which emptied the table of contents whenever the theme changed — and would have
done it on every first visit once the banner arrived.

---

## 2026-09-14 — The page transition is a window, not a panel

The site's one gesture for "you are somewhere else now" was a curved panel in `--ground` that rose
over the page, held the wordmark for 0.45s, and lifted onto the destination: 2.4s of opaque screen
per crossing, and the same beat whether a reader was leaving the landing, the tool or a document.
It was a cover. It said that something happened; it did not show what.

The replacement is Osmo's masked window, adapted rather than pasted. The page that is leaving
scales from 1 to 1.2 and drifts up 10vh under a black veil that reaches 20%: it recedes. The page
that is arriving rises from half a screen below inside a window clipped to `inset(50% round 3em)`
at the centre of the screen, which opens to the full viewport as it lands. 1.2s, every movement on
`EASE.fold` (0.625, 0.05, 0, 1 — the resource's own curve, and already the arrival curve the
overlays share), and the destination's copy rises inside the window from 0.2s so it is seen arriving
through the slot rather than sitting there when it opens. No brand beat: the mark was the panel's
reason to hold the screen, and a window that shows the destination from its first frame has nothing
to hold for.

**What the adaptation had to solve.** Barba keeps two containers in the DOM; here a route swap is a
setState and AppView returns one tree, so "the current page underneath" does not exist to animate.
It is a snapshot: `_snapshotPage` clones `[data-app]` into a fixed, viewport-sized host, scrolls the
host to where the reader was (a scroll container, so `position:sticky` resolves as it did against
the viewport), copies every canvas's pixels across after asking the field for one more frame (a
cloned canvas is blank, and the field's buffer only holds a frame inside the task that rendered
it), and strips ids so nothing running can find a copy. The snapshot is the only thing transformed.
The live document is never moved — a transform on a content root re-resolves every fixed descendant
against a document-tall box, which is the fault `_routeDrifters` was written to avoid — so the
arriving page is the live `[data-app]` inside a `[data-page-window]` wrapper that PaletteApp
renders above every branch, set fixed and clipped for 1.2s and cleared after. The window is pushed
down only after the destination has rendered in flow, because a document route measures its
ScrollTriggers at mount and a mount inside a wrapper translated 50vh measures every start 50vh late;
`finish()` refreshes ScrollTrigger and resizes Lenis anyway, for the chunk that lands mid-gesture.

**What stayed.** The Back/Forward and privacy ↔ terms crossings keep their short crossfade
(`_wipeQuick`): a pop restores a scroll offset, which a window that opens on the top of a page
cannot show, and the reasoning that they are the browser's gesture rather than the site's still
holds. The inert guard, the parked focus, the announced destination, the 4s watchdog and the stall
pump are unchanged. Reduced motion swaps outright, as before.

**Two things the window exposed that the panel had been hiding.** A second gesture 50ms into the
first found the timeline un-ticked (the swap is a long task), read `isActive() === false` as stuck,
killed it and started over the top; the stuck check now reads the timeline's `parent`, which GSAP
nulls the moment a timeline is killed or finishes. And a document whose lazy chunk landed after the
0.2s release registered a reveal controller nobody would play; `registerPageReveal` now plays a
controller that arrives after the release. Both races existed under the panel, behind a full second
of cover.

**And one the panel had been paying for.** React mounts a lazy route in a later task even when its
chunk is loaded, so About was mounting a few hundred milliseconds after the commit — inside the
fixed, clipped, transformed window. WebKit charged 1,036ms in one frame for its 72 ScrollTrigger
creations and two refreshes there, against ~330ms for the same work in flow on a cold load; Chrome
144ms. The window now waits for the page to announce its mount (`registerPageReveal`, capped at
600ms) and opens one frame later, so the mount runs in flow before anything moves: WebKit 237ms
before the gesture starts and 60fps through it, Chrome 93ms. Measured with Playwright's Chrome and
WebKit; Playwright's Firefox build does not launch on this machine, so Firefox is unmeasured.

**And what the click itself costs.** Interaction to Next Paint is the frame after the click, and
the snapshot is painted in that frame. With the landing up, the whole tool sits invisible beneath it
and was being cloned and painted too: Get Started measured 88–136ms as INP against 48ms with no
snapshot at all. The snapshot now clones only what can be seen — the landing and the mark while the
landing is up — and copies the field at half resolution, since it is veiled, scaled up and gone in
1.2s. Get Started: 32–80ms. Vercel's field INP was 176ms at p75 under the old panel.

---

## 2026-09-02 — The grid card is the photograph; the readout opens beside it

The spatial grid's tile was the list row's whole content model stacked into a 300×463 box — a
150px hero, the strip, the identity block, eight metrics. A field of forty of them was forty
readouts competing at once, and none of them was the picture the palette had been read from. It
is now the picture and its name: a 300×300 photograph over a 44px caption band (`UNIVERSE_TILE`
is 300×344, and the arithmetic is in universeTile.js). Press it and the card comes to the centre,
flattens, grows to its open size, and a panel slides out from behind it carrying exactly what the
tile used to wear — strip, identity, descriptors, the eight metrics — plus a door to the fullscreen
detail and a close mark. The reference is Osmo's *Infinite Dome Grid* (Jesper Landberg's no-WebGL
grid), and this time the whole of it: the flat x/y wrapping engine is replaced by the reference's
projection — one `matrix3d` per card per frame, the field doming away from the centre, a lens
swelling the cards under the cursor, a torch following the pointer through a shade, and every
photograph drifting toward it. The August attempt (55a4c57) was a different thing — edge
refraction on backdrop-filter and a displacement map, reverted for cost and for shearing the
cards; a card's own projective transform bends the card whole, which is the effect that attempt
could not reach. Every knob is a constant at the top of universe.js under the reference's own
names, and at its figures.

**The shade is the page, not black.** The reference darkens toward its own black stage. This one
fades toward `--surface-raised`, which is the same statement made against the right ground in both
themes, and it replaces the static vignette this view drew for the same purpose. The shade lives
inside the plane at z 2 so the open card (z 4) and its panel (z 3) can sit above it; the lifted
card carries its own share of the shade as `--dim` on a layer of its own, written by the render
before it lifts and faded as it opens, so nothing pops bright. The masonry drop the flat engine
gave each column is gone: the dome needs rows that are rows, or the bow reads as noise.

**The open card rides the same loop.** The reference lerps the open cell's corners toward the box
from one damped scalar; here that scalar is tweened instead — on `fold`, over `--dur-fold` — so the
disclosure keeps its token curve, and the render divides the matrix by the element's LIVE size,
which is tweened alongside, because the tile is not square and a pure quad lerp on 300×344 would
have stretched the caption's type with the box. The loop keeps running while a card is open, so
the torch and the lens still follow the cursor around it; only the pan is held.

**The caption is on the surface, not on the image.** The reference floats its caption on a
gradient into the photograph. That puts white type on a picture whose lightness this tool does not
control — High Key is a pale field — and the tile had already had its own hero fade turned off for
the same reason. The caption is the list row's first column under a hairline: `--surface-raised`,
the current palette on white with an ink rule, right in both themes by construction.

**The open runs on `fold`, not `entrance`.** Every other arrival in universe.js is an expo-out,
and motion.js already says why that is wrong for this one: the card changes size, and a box
growing on a front-loaded curve snaps open and creeps. `fold` is the in-out the travelling
selection marker runs on — a disclosure and a moving selection share one motion character. The
panel's contents land on `entrance` a beat later, because they are text arriving, not a box
changing shape. The close is written out rather than reversed: the box's own travel would survive
a reverse (fold is symmetric) but the contents' expo-out would come back as an expo-in and spend
most of the exit invisible — the same lesson closeUniverse records. It plays as the reference's
one motion: its scalar retracts the panel over the first three quarters of its travel and lands the
card over the whole of it, the two moving together with the panel home first.

**The panel is inside the card, as the reference builds it, and that is what makes the close
honest.** For a day the panel was a separate surface beside the card, and every close had to
choose between two lies: fade it, or leave it standing as an empty box where the card had been.
The reference never has that choice to make because its sliding panel is a child of the item — it
bends, shrinks and travels with the card for free, and the picture hides it the moment it is home
— while the CONTENT is a separate, transparent lightbox that only ever fades. Ported as such: a
`data-tile-panel` behind the photograph in every tile, driven by `--slide` from the same scalar
(clamped from a quarter of the travel, as the reference clamps it), and a `data-universe-panel`
content layer with no surface of its own, above the lifted card. The engine tile is
`overflow:visible` for this; the hero clips its own photograph. And there is no gap between the two:
the panel is the card's border box and translates by its width less both hairlines, so its rule
lands on the card's and the pair reads as one object with one line through it.

**The pair never leaves the screen, and the content yields instead.** The open size is the
reference's own arithmetic: 0.7 of the short side, capped so card + panel stay inside 0.9
of the long side; portrait puts the panel underneath at 0.8 of the width. What that cannot promise
is that eight metrics fit a small box, so the panel's body scrolls inside it — it is the one
scroll container in the view, and it declares `touch-action:pan-y` because the stage above it
declares none. Measured: 1440×900 opens a 630 pair, 1100×700 a 490 pair, 1100×1400 stacks 630 over 630;
nothing overflowed and nothing needed to scroll at any of them.

**The panel lives inside the plane.** It has to sit above every other card and below the lifted
one, and a sibling of the plane can only be above everything or below everything. So it is a
child of the plane at z 3, the open card goes to z 4, originals stay at 2 and clones at auto — and
the clone layer LOST its `z-index:1` for this, because a stacking context there would have trapped
an opened clone under the panel. The pan is held for as long as a card is open (Observer's
onChange returns, wheel included); a press anywhere but on the panel closes it, and may carry on
as a drag once it has landed. Escape closes the card before it closes the field. Focus lands on
the panel's close mark at once and returns to the card's real tile on close — the clone's original,
if a clone was pressed — and moves BEFORE the panel is re-rendered aria-hidden, because Chrome
blocks hiding an element that still holds focus.

**Two faults found on the way, both older than this change.** A clone's click read its palette
out of `state.feed` by an index that was built from the SCOPED feed, so with any filter or folder
active a clone opened the wrong palette; it reads the scoped feed now. And the stage was
`overflow:hidden`, which still scrolls when a descendant asks — `focus()` on a tile past the edge
scrolled the whole field 418px and nothing scrolled it back. It is `overflow:clip`, which forbids
that at the source; centring a focused tile is the engine's job (centerOnTile) and always was.
The universe's close mark also never had its ref attached, so the focus `_enterGrid` places on it
was a silent no-op; it is attached. And a mouse press on a clone focused it — a button is focused
by a press whatever its tabindex, and these are aria-hidden, so Chrome reported focus inside a
hidden subtree on every such press; the clone layer cancels mousedown's default now, which keeps
the press and the click and leaves focus where it was.

**Three things a cross-discipline review caught after the port.** The torch followed the pointer
only, so a tile brought to the centre for a keyboard reader could land under 70% of shade with its
focus ring at 1.9:1 — the hole now moves to the centre with the tile (centerOnTile), lens down.
The hover ring had been `boxShadow:'none'` since before this work: an element tweened on every
hover that drew nothing at either end; it draws a hairline in the press tier's hover ink, on the
card's own edge. And an Escape inside the close was swallowed; it falls through to the field's
exit now.

**What did not change.** The reduced-motion grid still shows the full card at rest — everything
the panel would disclose is already visible, so a press there stays the direct door to the detail.
The 3D reel builds its own cards and was never coupled to the tile.

## 2026-08-30 — The landing field is a reading, not a spectrum

The volumetric field behind the front page was coloured from twelve hand-authored OKLCH stations
walking the whole hue wheel. It was a beautiful demonstration of a colour wheel, and a colour wheel
is not what this tool makes. It now takes its colour from one of the eight seeded example palettes —
a different one per arrival — and says which, under the footer, with the photograph it was read from.

**This spends an acceptance criterion, deliberately.** The motion contract's §8 required "the whole
spectrum present around the copy at once". It cannot be: Garnet is a red field and High Key a pale
one, and that is the point — a landing showing every hue was showing none of the tool's actual
output. Everything else §8 protects is kept and is still enforceable: neighbouring gas is
neighbouring hue, each station owns one contiguous arc, the wheel closes with no seam, every pixel
goes through `gamutMap`. The twelve stations survive as the fallback, and the ramp reproduces them
byte for byte — the even-twelfth walk is the same code path as a palette's uneven one, at equal
shares.

**Hue, chroma and proportion are taken from the palette. Lightness is not.** The tonal ladder stays
solved against `--surface`, which is the whole reason one shader and one exposure serve both themes:
the thinnest gas dissolves into the page in either. A palette's own five lightnesses are authored
against a photograph — Garnet opens on L 0.09, High Key on 0.93 — and dropping either set in would
put the near end of the ladder on the wrong side of the page. A palette says *which colours*; the
page still says *how far from itself* they stand.

**The fan is capped in degrees, not only in ratio, and that is the difference between spreading a
palette and inventing one.** Garnet's five swatches sit inside twelve degrees of each other;
unfanned the field came back a single terracotta wash that could have been read off any warm
picture. But a multiplier moves the outermost swatch furthest, and at 5× Garnet's one deep red nine
degrees off centre landed at 47 — a gold sector in a field of reds, a colour nobody photographed.
`PAL.addMax` bounds what the fan may ADD to any one swatch, so the amplification is capped exactly
where it is largest. A second correction pulls a swatch's offset toward the dominant hue in
proportion to its chroma: a hue angle read off chroma 0.025 is mostly rounding, and the fan was
amplifying that too — Frozen Slate's 1.6% slate became a magenta arc.

**Only analogous harmonies are reachable from a palette.** The three accent patterns each put a
complement in the mid-dark, which is precisely the colour a palette-derived field must not contain.
"Based on Garnet" cannot mean a teal nobody photographed.

**On a phone the story leads, not chance.** The desktop landing rolls a palette per arrival because
nothing on that screen contradicts it. A phone's front page is the story, whose first chapter is
transparent onto this same field and whose copy names its case out loud — so there the field follows
the story, and every later change to it (the image chooser, chapter 7's gallery, opening an example
read-only) re-bases the field through one method. That is not variety versus coherence; the two
surfaces just have different amounts to disagree with.

**The swap is a dissolve, and the arithmetic is on the CPU.** Two ramp textures and a mix uniform
would put a second sampler inside a forty-eight step march, per pixel, forever, to pay for eight
tenths of a second. Lerping the 32 kB strip itself costs nothing and needs no shader change — and it
is skipped outright while the stage is covered, which is where every reader-driven change happens.

**The swap is a cut, and that was a measurement.** The first cut of this carried a ramp crossfade —
the 32 kB strip lerped on the CPU rather than a second sampler in a forty-eight step march. It was
removed after instrumenting all three call sites: `showExample` parks the ticker one commit later,
so the dissolve wrote 10 frames into a texture that was rendered **zero** times; `chooseStoryCase`
runs under the wipe; `setStoryCase` runs while the reader is being scrolled past the hero. A dissolve
nobody can see is not a dissolve — and it was inconsistent besides, since the bloom and the floor are
single style writes, so the air cut while the gas dissolved. The house rule is not suspended: there
is no arrival because the surface is not on screen. If a *visible* palette change is ever added, the
crossfade belongs back in `_applyRamp` and the bloom has to join it.

**The bake came off the tap.** Changing palette invalidates the ramp, and rebuilding it is ~8000
gamut maps — 6 ms here, 7 ms of wall time inside `showExample` and 20 ms inside `setStoryCase` once
the floor and bloom repaint too, which is 30–80 ms of added latency on a mid-range phone. The id and
its state mirror are written synchronously because React needs them for the credit; every pixel is
deferred one frame. Measured after: 0.20 ms and 0.30 ms.

**The landing stopped drawing a second footer, and the credit took the corner.** The band at the
bottom of the stage used to render `SiteFooter` — a duplicate of the footer the document already
ends with; two `.site-foot` nodes in the tree on every landing. On a phone it was worse than
redundant: the story scrolls to a real footer at the end of 8000px, while this copy sat at opacity 0
under `quiet` occupying the one band the credit needed. So the footer goes and the credit is what
is left there, on both surfaces — its thumbnail one column of the page's own grid, re-derived from
`--grid-cols` / `--grid-gutter` so it follows the phone breakpoint without a second rule, clamped at
both ends, and measured off the viewport because a percentage resolves against a shrink-to-fit
column and is circular. It does **not** go quiet with the rest of the landing: it is not competing
copy, it is the caption for the artwork chapter 1 is transparent onto, and the opaque chapters below
scroll over it (verified at four scroll depths).

*The cost, recorded so nobody rediscovers it as a bug:* the landing is `position:fixed` over the
document, so the real footer behind it cannot be reached while the landing is up. About, Privacy and
Terms are no longer linked from the wide front page — `Learn More` still goes to /about, and all
three return the moment the landing is dismissed. Removed by request. If the legal pair has to be
reachable from there, the answer is a one-line legal row beside the credit, not the whole footer
back.

**Three things an adversarial review caught, all confirmed by replay before they were touched.**
*The painted floor was one arc out of register with the shader on an anticlockwise wheel* — it placed
each station's hex where its arc BEGINS, but the ramp is un-mixed where the arc STARTS IN u, which on
`dir < 0` is the other end. Every station mismatched at `dir < 0`, none at `dir > 0`. The error
predates this work and was a flat 30° on an even twelfth, small enough between two layers at a
quarter opacity never to be noticed; the palette's own arcs turn it into up to 137°, which is the
floor and the field disagreeing about which colour is where, throughout the crossfade that exists
because they are meant to be the same picture. *The credit's band swallowed the landing's CTAs on
short desktop windows* — the band is absolutely positioned over a centred copy block, so it lands ON
it rather than pushing it; at 1280×420 `elementFromPoint` at the centre of Create returned
`.site-foot__meta`. `BELOW_MIN_MQ` gates height only under `pointer:coarse`, deliberately, so the
credit answers the height itself. It also stopped swallowing clicks outright, which should have been
true whatever the height. *And returning from /about handed back a landing with no field on it* —
`navigateTo` does not kill the orbit, so `_orbit` survived pointing at detached DOM and the rebuild
gate declined. That was survivable while a dead stage was merely blank; it is not once a caption
underneath names what the absent field is a reading of. "Isn't built" now means "isn't in the
document".

*(Also found: `public/site-foot.css` had been missing its closing brace since the narrow block was
written. Nothing had ever been appended to it, so nothing had ever been wrong — but the height query
above would have been the first thing, and it would have failed in the least visible way possible.)*

---

## 2026-08-29 — One corner, one close mark, one hover

The panel merge was one decision; what followed was a day of pulling every surface it touched onto
the vocabulary it had just proved. Three rules came out of it, and each replaced a pile of local
choices that were individually defensible and collectively a dialect.

**One corner.** `--radius-pill` is a stadium — it rounds to half the shorter side — so it is not a
size decision to be made per component; it is the shape the app is drawn in. The tab strip, the
segmented rails, the applied-filter chips, the project rows, the name field, the harmony footer,
the format tags and the trait chips all take it, and the only thing a component still decides is
its height. Where a control looked wrong at full radius the fault was never the corner: the library
trigger drew a lozenge at 38 × 32.5 because its sides were unequal, and squaring it to 32 fixed a
shape problem that a smaller radius would only have hidden.

**One close mark.** Every `Done` and every hand-set ✕ became the same icon-only `IconClose` button.
A dialog closes; that is the whole message, and a word is a worse carrier of it than the mark
already used everywhere else. Where the icon says it, the copy beside it went — an icon-only
control keeps its accessible name in `aria-label`, which is where that sentence belonged all along.

**The swap replaces the fill.** Controls carrying the masked text swap on hover no longer take the
`[data-ix]` hover tint: the label lifting out and its twin rising into place IS the hover state, and
a fill underneath it is a second answer to one question. It is gated on
`(hover:hover) and (prefers-reduced-motion:no-preference)` so a touch device and a reduced-motion
reader keep the fill they can actually perceive. **The trap here is CSS order, not specificity.**
The `button-006` override sat in the correct media block and never applied, because an
identical-specificity `opacity:1` lives later in the file; it works only directly after the rule it
answers. It measured as `opacity: 1` on a real hover — nothing in the source said so.

**Applied filters live in one place, and that took two goes.** The removable chips and their clear
sit on the row below the band, not in the panel. The panel briefly carried a clear-all too, on the
argument that its checked rows cannot clear themselves in a single press — true, and still wrong: a
second place to clear filters makes two truths about the same state, and the panel's rows already
*are* that state. What the panel keeps is the count on its Filter tab. The row outside survives the
panel being shut, which is the case that matters, and it stays put when cleared because
`_facetOutside` treats `[data-applied-filters]` as not-outside — without that, the one control that
undoes a narrowing would also dismiss the surface you would narrow from next.

**Two consequences that read as bugs.** A dialog rendered from a control that appears twice needs an
owner: both `CopyControl` instances answered the same flag and drew two stacked sheets with two
scrims, so the stage instance yields (`owns={!vals.hasOverlay}`) when the overlay is up. And copying
runs a textarea fallback on every path, which mounts, selects, and removes — dropping focus to
`body`. Invisible while the menu closed on copy; a lost keyboard place once the dialog was made to
stay open, so the pressed row is refocused a frame later.

---

## 2026-08-29 — One door onto the library: Filter and Manage Projects are two tabs of one panel

**Two buttons, one row apart, opened two surfaces onto the same library.** Manage Projects ended
the projects band and Filter began the toolbar under it; one was a centred modal dialog, the other a
non-modal right drawer. The split was in the interface rather than in the work — a project is a
filter you made yourself — and the question neither could answer between them is the one people
actually have: *which of the palettes in Coastal can also hold text*. Answering it meant dismissing
one surface to open the other, and neither knew what the other had done.

**They are now one panel with two tabs**, on the app's own segmented control: the same travelling
pill as the feed's List / Grid / 3D, two columns instead of three, sized to its own
labels and set against the panel's leading edge rather than stretched across it. Full width was the
first attempt, on the reasoning that panel navigation should span its panel; at two columns that
puts most of the strip's area between the two words, and the travelling pill crosses a gap wider
than either label it lands on. Filter carries a STATE
(how many narrowings are on, absent at rest — "Filter 0" reports nothing) and Projects carries a
cardinality (how many folders exist, zero included, because that is why the tab is empty when it
is). The panel is titled Manage Library — provisional, and the tab below it says which half you are
looking at, so the title never has to name both.

**The trigger became a glyph, and that is the one real cost.** A control that opens filtering AND
project management has no honest one-word label: "Filter" names half of it and "Manage" the other
half. So it is the library's own list row drawn at 12px inside a 32px square, with the applied-filter
count beside it,
the sentence on `title` and `aria-label`, and the panel naming itself in its heading the moment it
arrives. It sits against the scope rail — where Manage Projects was — and takes the rail's height
from `align-items:stretch` rather than stating one.

**What the merge cost the manage surface, and what it bought.** It is non-modal now, so the library
stays visible and operable behind it, and the focus trap went with the modality — there is nothing
to trap when Tab is meant to leave. The one thing the trap was quietly providing was a commit for a
pending rename: the old dialog could only be dismissed by a click that blurred the field first, and
this panel also closes on Escape, where a focused input removed from the document does not reliably
fire `blur`. `_commitProjectNames` now runs at the end of the close, after any natural blur has
already committed, so it is a no-op on every path except the keyboard one it exists for.

**Three consequences worth recording, because each looks like a bug from the outside.** The export
dialog raised from a project row stacks at 157 rather than 127 — the number it has to clear moved
when the dialog it opens over became a panel at 156. `_facetOutside` now treats anything in a
`[role="dialog"]` or on a modal backdrop as *not* outside, or exporting a folder would put away the
tab you exported it from. And `libraryTab` is null until pressed, so an unchosen panel opens where
the work is — Projects when there is nothing yet to filter — while a press is always obeyed, because
a tab that silently refuses one is a dead control.

**The applied-filter row now arrives with the first filter and is absent otherwise.** With the
trigger gone up to the rail, what is left on that row is state rather than controls. The result
count's live region moved up to the section: a live region has to be in the DOM before the change it
announces, and one mounted by the same render that fills it would have gone unspoken.

---

## 2026-08-27 — Colour is uncovered, text is masked, everything else fades

Three arrival mechanics across the overlay surfaces, and which one an element gets is decided by
what kind of thing it is — then, for colour, by the shape it happens to have:

| kind | reveal | mechanic |
| --- | --- | --- |
| **text** | vertical line mask | `_maskLineReveal` — split to rendered lines, each slides up from 110% |
| **colour, tall or square** | fills from the bottom | `_bandIn` — `data-ov-band` |
| **colour, wide** | opens left to right | `_wipeIn` — `data-ov-wipe` |
| **everything else** | fade | opacity, on the shared curve |

**All colour quotes one gesture: the result stage's own.** `animateBands` uncovers a palette's
bands with a clip rising from the bottom edge — the oldest thing in this motion system and the
moment the product is about. The harmony swatch strip and the contrast matrix's chips are that same
object at a smaller size, so they take that clip rather than a treatment of their own. Only the
DURATION differs, because the utility band has always had its own length; the beat needs no
reconciling, since `DUR.stagger` and `DUR.overlayItem` are both 50ms.

**The axis follows the element's geometry, not its category.** A per-colour ROW — the contrast
drawer's "text on each colour" bars — is the same band laid out the other way: 40px tall and 460
wide, with its reading printed on it. A bottom-up fill there has almost no distance to travel, so
the gesture has nowhere to happen; opening left to right runs the reveal along the bar's long axis,
which is where the eye reads it anyway. Same clip, same curve, same clock, different edge.

**The hook sits on the ink, not the box.** The matrix chips are 24px colour spans centred in 34px
layout cells, so `data-ov-band` is on the span. Clipping the cell would sweep ten pixels of empty
box before reaching any colour, and the chip would appear partway rather than fill.

**Two wrong turns are recorded because both were plausible.** First: give surfaces the opposite axis
to text, so no element ever performs the same gesture as the element inside it. Tidy, symmetrical —
and it invented a second vocabulary for colour when the app already had one. Consistency with the
thing itself beats a clean rule about axes. Second, and worse: that horizontal rule was generalised
to "a colour surface is revealed horizontally wherever it appears" and pushed onto `animateBands`
itself, rewriting the signature moment to match a drawer. **The drawers are consumers of this
vocabulary; the result stage sets it.** A generalisation that reaches the signature moment has
stopped being a vocabulary and become a habit.

**What none of it is for**, kept as separate entries because each is a different objection: anything
carrying a sentence (an edge travelling across a line of copy is a second and worse reading of text
the drawer already reveals properly); and controls — the AA/AAA switch, Passing Only, the harmony
models, the export format list — because a control is not a colour, and uncovering one reads as the
button being built rather than arriving.

**The export list stacks.** Its items are a `flex-direction: column`, so a staggered fade in DOM
order reads as a vertical cascade — measured tops 414/459/504/549/594, fading 0.95/0.93/0.89/0.84/0.77.

---

## 2026-08-27 — One curve for the whole overlay system, after 28k.studio

The overlay system had grown three easing curves in a day — a power4 fit for arriving fades, a
sine-out for departing ones, a symmetric in-out for the panel leaving — each measured, each
defensible alone, and together a system in which no two things left the same way. They are collapsed
back to one: `--ease-overlay`, `cubic-bezier(.19, 1, .22, 1)`.

**The reference was not using a curve we lacked.** 28k.studio publishes its easing as a three-value
scale in `:root` —

    --o6: cubic-bezier(.19,1,.22,1)   --o3: cubic-bezier(.215,.61,.355,1)   --o2: cubic-bezier(.25,.46,.45,.94)

— and puts essentially every transform on `--o6`: `transform 1200ms var(--o6)` for the panel, 800ms
for the content, 700ms and 600ms elsewhere. **`--o6` is byte-identical to the curve this codebase
already called `--ease-overlay`.** The lesson taken was not the curve; it was using ONE where we had
grown three.

**The trade is real and is stated rather than hidden.** The reference never runs this curve on a
long dismissal travel — its menu closes on `opacity 250ms var(--o2)`, a quick fade with no journey —
so the front-loading that makes an expo-out wrong for a 500px slide never gets the chance to show.
Ours does slide. Measured on the contrast drawer's exit:

| | in-out (previous) | one curve (now) |
| --- | --- | --- |
| peak velocity | 1300px/s | **4000px/s** |
| peak at | 440ms, mid-travel | **140ms** |
| panel gone at | ~600ms | 360ms of a 724ms tween |

That is the snap returning, at three times the velocity, and it is accepted knowingly as the cost of
one curve. If it reads badly the fix is not a fourth curve — it is to stop sliding the panel out at
all and close the way the reference does.

**The arrival is unharmed by the change,** because the cascade was never doing its work through the
curve: 25 of 29 contrast items still live simultaneously at peak, and the colour rows still read as
one gradient (0.74 / 0.61 / 0.43 / 0.19 / 0). The stagger carries the sequence; the curve only
decides the shape of each element's own arrival.

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
