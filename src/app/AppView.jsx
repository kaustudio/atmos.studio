// The view — a 1:1 JSX port of the design comp's template. Static inline styles are kept as the
// original CSS strings (parsed by sx()) so the layout stays byte-faithful; computed styles come
// from renderVals() untouched. No logic lives here.
import React, { useState } from 'react';
import { sx } from '../lib/sx.js';
import { B006, B006Text, GlassEffect, TextSwap, ThemeSwitch } from './chrome.jsx';
/* THE TWO READING ROUTES ARE THEIR OWN CHUNK, and prefetched the moment the tool has mounted.

   Imported statically, these dragged about.html (89KB, injected verbatim as a string), about.css,
   privacy.html, terms.html, doc.css, legal.css and ~20 about* scroll modules into the single chunk
   every visitor to the TOOL downloads, parses and compiles — to render a page most of them never
   open. Splitting them is worth ~28KB gzipped off the homepage's critical path.

   PREFETCHED, NOT LAZY, and the distinction is the one index.html already makes about ScrollTrigger:
   a network request started at the moment a route swap begins lands inside the wipe, which is the
   exact stall this architecture was restructured to remove. So the chunk is requested on mount,
   in parallel with three.js and long before anyone can reach a link to it, and by the time a wipe
   runs it is a cache hit. Suspense is the floor under that promise, never the plan — if it is ever
   seen, the prefetch below has failed and the cover is still down over it. */
const AboutPage = React.lazy(() => import('./AboutPage.jsx'));
const LegalPage = React.lazy(() => import('./LegalPage.jsx'));
if (typeof window !== 'undefined') {
  const prefetchDocs = () => { import('./AboutPage.jsx'); import('./LegalPage.jsx'); };
  if (document.readyState === 'complete') prefetchDocs();
  else window.addEventListener('load', prefetchDocs, { once: true });
}
// The phone story's own layer. Imported here rather than by a route component because this surface
// is one of AppView's early-return branches, not a route — and it is scoped entirely under
// [data-mobile-story], so nothing it holds can reach a viewport that never mounts that surface.
import '../styles/story.css';
import { isDoc, isLegal, pathFor } from './routes.js';
// PAGE VIEWS ONLY. Do not add track() / custom events, and do not instrument generation, export or
// any in-app action. Behavioural instrumentation is a separate decision with its own copy
// implications — the privacy statement currently promises the analytics "doesn't see anything you
// do inside the tool", and a single custom event makes that false. See DECISIONS.md.
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';

// style-hover / style-active runtime attributes from the design comp, reproduced as a tiny
// stateful button (the only pieces of hover styling not covered by the [data-ix] CSS contract).
function HBtn({ style, styleHover, styleActive, onMouseEnter, onMouseLeave, children, ...props }) {
  const [h, setH] = useState(false);
  const [a, setA] = useState(false);
  const st = { ...style, ...(h ? styleHover : null), ...(a ? styleActive : null) };
  return (
    <button
      {...props}
      style={st}
      onMouseEnter={(e) => { setH(true); if (onMouseEnter) onMouseEnter(e); }}
      onMouseLeave={(e) => { setH(false); setA(false); if (onMouseLeave) onMouseLeave(e); }}
      onMouseDown={() => setA(true)}
      onMouseUp={() => setA(false)}
    >{children}</button>
  );
}

// button-006 — the masked text-swap CTA (chrome in global.css). `label` renders in both layers
// unless a distinct `hover` node is given.

// Copy confirmation: 'Hex list' ⇄ ✓ Copied. Both states are stacked in one grid cell with the
// inactive one hidden, so the cell is always sized to the WIDER of the two and the row can never
// reflow at the moment of the swap — which is exactly when the pointer is still over the button.
// The check stays outside B006Text on purpose: it is a glyph, and glyphs hold still through the
// hover swap while the word beside them travels.
const CopiedMark = () => (
  <span style={sx('display:inline-flex;align-items:center;gap:6px')}><IconCheck /><B006Text>Copied</B006Text></span>
);
const SwapLabel = ({ copied, idle }) => (
  <span style={sx('display:inline-grid;align-items:center;height:14px;justify-items:center')}>
    <span style={{ gridArea: '1/1' }}>{copied ? <CopiedMark /> : <B006Text>{idle}</B006Text>}</span>
    <span aria-hidden="true" style={{ gridArea: '1/1', visibility: 'hidden' }}>{idle}</span>
    <span aria-hidden="true" style={{ gridArea: '1/1', visibility: 'hidden' }}><CopiedMark /></span>
  </span>
);

const LOGO_MASK = "url('/assets/atmos-gallery-logo-black.svg') center/contain no-repeat";
const MARK_MASK = "url('/assets/atmos-gallery-logo-black.svg') left center/contain no-repeat";
// top sits the 26px mark on the header's own centre line: the bar is 64px with a 1px bottom border,
// so its content box is 63px and every control in it centres at 31.5 — (63 - 26) / 2 = 18.5.
// It is fixed rather than a child of the header (it also flies over the landing), so the shared
// centre has to be restated here; anything else reads as the logo sitting low in the row.
const logoStyle = {
  /* CENTRED WITHOUT A TRANSFORM, and that is a bug fix rather than a preference.

     It was `left:50%` plus `transform:translateX(-50%)`, which centres correctly until something
     clears the transform — and something does. The wipe drifts every child of [data-app] for depth
     and finishes with `clearProps:'transform,opacity'`, which does not restore a transform, it
     REMOVES the declaration. The wordmark is a direct child of [data-app], so the half-width pull
     that was centring it was deleted by the first transition and never came back: measured at
     left:188 in a 375px viewport, its centre 83px right of the screen's, which is exactly half its
     own 165px width.

     Auto margins in a fixed inset need no transform at all, so there is nothing for clearProps to
     take. The drift can still animate y, and clearing it afterwards now removes only what the drift
     itself wrote.

     The size is a pair of tokens so the phone can step it down without !important overriding an
     inline style, and so the two numbers stay in one place. */
  ...sx('position:fixed;top:18.5px;left:0;right:0;margin-inline:auto;width:var(--logo-w);height:var(--logo-h);z-index:155;mix-blend-mode:difference;background:linear-gradient(120deg, #ffffff, #c2c2c2, #8a8a8a, #dedede, #a6a6a6, #ffffff);background-size:280% 280%;animation:gradient-drift 9s ease-in-out infinite'),
  WebkitMask: LOGO_MASK, mask: LOGO_MASK,
};

/* THE MARK'S GROUND, for the surfaces that scroll a photograph under it.

   mix-blend-mode:difference is a promise the mark can only keep over a FLAT backdrop. Against
   --surface it resolves to near-black in light and near-white in dark, which is why it has been
   right everywhere it has ever been looked at. Against a photograph it resolves to the photograph:
   measured on the share view's tennis court (avg rgb(97,137,161)), the mark came out rgb(158,118,94)
   at the gradient's white stops — 1.08:1 against what it sits on — and rgb(41,1,23) at #8a8a8a, or
   5.04:1. Not a fixed failure but an oscillating one, because that gradient is animated: the mark
   faded in and out of existence on a 9s loop. On the share view it is also the way home, so this was
   a CONTROL disappearing, not an ornament.

   THE SCRIM RESTORES THE PREMISE RATHER THAN REPLACING THE MECHANIC. Difference blends against
   whatever is painted below it in the stacking context; put --surface there and the mark differences
   against --surface, which is the case it was designed for. Nothing about the mark changes — same
   mask, same gradient, same animation, same z-index — so there is no second appearance to keep in
   sync and no second thing to theme.

   64px is the masthead's own height, which is the figure this codebase already uses for "the zone
   the mark lives in": the desktop draws the mark inside a 64px bar, and the phone's answer had been
   a 64px SPACER that scrolled away and took the ground with it. This is that spacer made fixed.

   A GRADIENT RATHER THAN A BAND. A hard 64px edge over a full-bleed photograph reads as chrome
   bolted on top of the picture; a fade reads as the picture arriving out of the surface, which is
   what the rest of the page already does.

   96px AND A STOP AT 66.6%, WHICH IS THE 64px BAND SOLID PLUS A 32px FADE. The stop has to clear the
   mark completely or the fix is only half applied: the mark occupies 18.5-42, and the first attempt
   at 64px-with-a-stop-at-42% put full --surface behind only its top 27px and left the descenders
   differencing against a half-transparent blend of surface and photograph. It read as a grey smear
   under the wordmark — the same failure as before, smaller. Solid to 64 puts the whole mark on the
   backdrop it was drawn for with 22px to spare, and the fade happens entirely below it.

   RENDERED ON ALL THREE PHONE BRANCHES, THOUGH ONLY ONE OF THEM CAN SEE IT.
     · The share view is the surface this exists for.
     · The example list never puts an image in the mark's band — the rows are --surface and the 72px
       thumbnails stop well short of a centred 148.5px mark — so this paints --surface over --surface
       and is invisible.
     · The story's sections DO run full-bleed under the mark, but the mark is not there to be hurt by
       them: heroExit scrubs it to autoAlpha 0 across the hero's exit, so it has left before the
       first photograph arrives. The scrim leaves with it — heroExit fades both — rather than staying
       behind as a veil over a mark that is no longer drawn.
   The uniform render is what keeps the mark at the same child INDEX in each branch. React reconciles
   unkeyed children by index, and a mark that changed position between branches would be the
   torn-down-and-rebuilt logo the note in the tool branch exists to warn about.

   NOT ON THE GATE, which is a different branch: its backdrop is the orbit field, the brand's arrival
   and meant to be seen — and being a flat-ish wash rather than a photograph, it is a backdrop
   difference already handles.

   data-mark-scrim IS LOAD-BEARING TWICE. It is what heroExit fades, and it is what puts this on the
   phone rule's allow-list in global.css — without that entry a direct child of [data-app] is painted
   out, which is exactly what happened first time: the element rendered, carried its gradient, and
   measured 0px tall. z-index 154: under the mark at 155, over the story at 151 and the share at 150. */
const MARK_SCRIM = sx('position:fixed;top:0;left:0;right:0;height:96px;z-index:154;pointer-events:none;background:linear-gradient(to bottom, var(--surface) 0%, var(--surface) 66.6%, transparent 100%)');
const MarkScrim = () => (<div data-mark-scrim="1" aria-hidden="true" style={MARK_SCRIM}></div>);

/* ===== ICONS — Material Symbols Light, one variant, no exceptions =====
   Every glyph below is the published path from `material-symbols-light`, taken from the Iconify API
   rather than transcribed, because transcription is how a set drifts one icon at a time. The sharp
   cut is used wherever the glyph has curves to square off (copy, download, folder, delete); a check,
   an X and a chevron have no curves, so the family has no separate sharp variant of them and the
   base glyph IS the sharp one. Sharp is not a preference here — it is the only cut consistent with a
   design that carries no border-radius anywhere.

   What this replaced: four icons were already correct. IconCopy was this set's copy glyph with two
   subpaths deleted, so its inner sheet had no outline. IconCheck and IconLink came from the heavier
   `material-symbols` weight and sat visibly bolder than the four beside them. IconHarmony, IconClose
   and IconChevron were drawn by hand as strokes at three different weights — 1, 1.6 and 2 — which is
   what the eye caught first, since nothing else in the set was stroked at all.

   Every icon is a FILLED path on the 24 grid. No strokes, so there is no stroke weight to disagree
   about, and scaling by `size` never changes the apparent weight.

   Three sizes, matched to the type they sit beside: 9 with --fs-micro, 12 with --fs-label, 14 with
   --fs-body and the action row. `display:block` and `flex:none` are on every one so an icon never
   picks up a text baseline gap or gets squeezed by a flex parent. */
const IconCopy = ({ size = 12 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ display: 'block', flex: 'none' }}><path fill="currentColor" d="M16 1H2v16h2V3h12zm5 4H6v18h15zm-2 16H8V7h11z"></path></svg>);
const IconCheck = ({ size = 12 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ display: 'block', flex: 'none' }}><path fill="currentColor" d="m9.55 17.308l-4.97-4.97l.714-.713l4.256 4.256l9.156-9.156l.713.714z"></path></svg>);
const IconHarmony = ({ size = 14 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ display: 'block', flex: 'none' }}><path fill="currentColor" d="M8 18q-2.502 0-4.251-1.749T2 12t1.749-4.251T8 6q.906 0 1.736.26t1.525.754q-.194.177-.367.377l-.344.401q-.539-.376-1.186-.584T8 7Q5.925 7 4.463 8.463T3 12t1.463 3.538T8 17q.717 0 1.365-.208q.646-.208 1.185-.584l.344.4q.173.202.367.379q-.695.494-1.525.754Q8.906 18 8 18m8 0q-.906 0-1.735-.26t-1.527-.753q.195-.177.368-.378l.344-.401q.544.377 1.189.584T16 17q2.075 0 3.538-1.463T21 12t-1.463-3.537T16 7q-.717 0-1.362.208t-1.188.584l-.344-.4q-.173-.201-.367-.379q.695-.494 1.525-.753Q15.095 6 16 6q2.502 0 4.251 1.749T22 12t-1.749 4.251T16 18m-4-1.558q-.944-.84-1.472-2T10 12t.528-2.442t1.472-2q.944.84 1.472 2T14 12t-.528 2.442t-1.472 2"></path></svg>);
// Sort chevron — drawn at the same 1-unit hairline weight as the rest of the icon set, so it sits
// in the header without shouting. It points DOWN at rest (descending) and rotates 180° to point up
// for ascending; the rotation is the state change, so the glyph never swaps out from under the eye.
/* THE PLUS, FROM THE FIGMA NODE ITSELF (ic:outline-plus, 10384:7592). The exported asset draws it
   in a 40 box — arms spanning 10→30 at a thickness of 2.857 — and those are the numbers below,
   multiplied by 0.6 so the glyph lives in the same 24 box as every other icon here: 6→18 at 1.714.
   The export drew the mark at half its disc (20 in 40) and this draws it a step under that — the
   icon renders at 20 inside a 24 disc, so the plus spans 10 and the ground around it grows from 6px
   to 7.
   20 IS NOT ONE OF THE SET'S SIZES, and it is not meant to be. Every other icon here is drawn at 9,
   12 or 14 because it sits beside text and has to match its optical weight; this one sits ON a
   ground and is sized as a FRACTION of it — five-sixths of the disc's diameter. Read as a ratio it
   stays repeatable if the disc ever changes size; read as a number it looks like a stray. At 24px the exported ratio put the arms almost against the edge; the mark reads as a mark
   rather than as a filled shape with a cross cut out of it once the ring of ground is legible. What is NOT taken from
   the asset is its colour: the file hardcodes #141414 on the disc and #F1F1F1 on the mark, which is
   this app's filled pair written as literals — so the disc takes --on-surface and the glyph
   currentColor, and the design survives the theme switch the export could not know about. */
const IconPlus = ({ size = 14 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ display: 'block', flex: 'none' }}><path fill="currentColor" d="M18 12.857H12.857V18H11.143V12.857H6V11.143H11.143V6H12.857V11.143H18V12.857Z"></path></svg>);
/* THE CHEVRON THAT COMMITS. Not IconChevron rotated: that one is the hairline mark the project
   rail's steppers use, and this is the Material 2-unit form the rest of the acts now take. It sits
   in the create field's own button, pointing the way the text is going. */
const IconChevronRight = ({ size = 14 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ display: 'block', flex: 'none' }}><path fill="currentColor" d="M10 6L8.59 7.41L13.17 12l-4.58 4.59L10 18l6-6z"></path></svg>);
/* THE UNDO ARROW — a line that turns back on itself, which is the one gesture that reads as
   "put it back" without a word. It replaces the label on the toast's own act; see the note there
   for why that control lost its text. */
const IconUndo = ({ size = 14 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ display: 'block', flex: 'none' }}><path fill="currentColor" d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88c3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8"></path></svg>);
/* THE CLOSE MARK, and until now a component nothing rendered: every dismiss in the app drew a ✕
   CHARACTER instead, which is a piece of text pretending to be an icon — it takes the font's
   metrics, its own optical size and whatever the label voice does to it. The toast's dismiss uses
   this now; the remaining literals are the ones sitting INSIDE a chip beside its label, where a
   glyph in the text stream is the right object. */
const IconClose = ({ size = 12 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ display: 'block', flex: 'none' }}><path fill="currentColor" d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12z"></path></svg>);
const IconChevron = ({ size = 9 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ display: 'block', flex: 'none' }}><path fill="currentColor" d="M12 14.708L6.692 9.4l.708-.708l4.6 4.6l4.6-4.6l.708.708z"></path></svg>);
const IconContrast = ({ size = 14 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ display: 'block', flex: 'none' }}><path fill="currentColor" d="M12 22c5.52 0 10-4.48 10-10S17.52 2 12 2S2 6.48 2 12s4.48 10 10 10m1-17.93c3.94.49 7 3.85 7 7.93s-3.05 7.44-7 7.93z"></path></svg>);
/* EXPORT, AT THE SAME WEIGHT AS THE FOLDER AND THE BIN. It sits directly beside both — the project
   row in the library panel is name → export → delete — and left at the 1-unit hairline it read as a
   different set inside the same 32px button. Same 2-unit Material outline as its two neighbours now;
   the tray-and-arrow drawing is unchanged in meaning, and the second use (the result stage's Export
   menu, beside its own label) takes the new weight for the same reason: one glyph, one voice. */
const IconExport = ({ size = 14 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ display: 'block', flex: 'none' }}><path fill="currentColor" d="M18 15v3H6v-3H4v3c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-3zm-1-4l-1.41-1.41L13 12.17V4h-2v8.17L8.41 9.59L7 11l5 5z"></path></svg>);
/* FOLDER AND BIN, OUTLINED — and the solid pair that stood here for one revision is the reason to
   say why. Both sit on the library row's actions, which lost their plate and their edge, and the
   first answer to "a bare glyph has to hold on its own" was to fill them in. It over-corrected: a
   solid bin beside a hairline export arrow in the same 32px button read as two icon sets, and on
   the row the pair went from too faint to the heaviest marks on the surface. These are the outline
   forms of the same two glyphs — 2-unit strokes drawn as filled paths with the body cut out by the
   winding rule — which is one step up in weight from the 1-unit set around them and holds at 14px
   without shouting. The source's <path d="M0 0h24v24H0z" fill="none"> spacer is dropped on both, as
   on the list mark above: the viewBox already declares that box. */
const IconFolder = ({ size = 14 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ display: 'block', flex: 'none' }}><path fill="currentColor" d="m9.17 6l2 2H20v10H4V6zM10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8z"></path></svg>);
// Redrawn from the supplied mdi link glyph at this set's stroke weight. The source was ~2 units of
// wall in a 24 grid; every other icon here (export, folder, trash, copy) is a 1-unit hairline, and
// at 14px the difference reads as a bold icon sitting in a row of light ones. Same drawing, same
// optical size — just the weight the row is built on.
/* THE LIBRARY TRIGGER'S OWN MARK — a bulleted list: three dots, three rules. Chosen by hand rather
   than derived, and it is the one glyph in the app that does not come from the hairline set the
   rows use (export, folder, trash, copy are all 1-unit strokes at this size; these bars are 2 and
   the bullets are solid). That is a deliberate weight, not an oversight: this mark carries a
   control that has no word on it — the button opens filtering AND project management, and no single
   label names both without naming neither — so it has to read on its own at chrome size, where a
   hairline list reads as texture.
   IT IS DRAWN AT 12, NOT AT THE SET'S 14, AND THE TWO FACTS ARE THE SAME FACT. This glyph fills its
   box where the hairline ones sit inside theirs — 18.5 of 24 across and 15 of 24 down, against the
   16×12 the outline set uses — so at a matched nominal size it carries about a third more ink than
   its neighbours. 12 is what puts the mark back at the optical size of the chrome around it, and it
   is a size the row already uses: the rail's own step chevrons are 12. A one-off 13 would have been
   a number nobody could repeat. The words still arrive on hover and to assistive tech (title +
   aria-label), which is the bargain the manage rows' icon buttons already take.
   The source's <path d="M0 0h24v24H0z" fill="none"> spacer is dropped: the viewBox already declares
   that box, and nothing else in this file carries one. */
const IconList = ({ size = 14 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ display: 'block', flex: 'none' }}><path fill="currentColor" d="M4 10.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5s1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5m0-6c-.83 0-1.5.67-1.5 1.5S3.17 7.5 4 7.5S5.5 6.83 5.5 6S4.83 4.5 4 4.5m0 12c-.83 0-1.5.68-1.5 1.5s.68 1.5 1.5 1.5s1.5-.68 1.5-1.5s-.67-1.5-1.5-1.5M7 19h14v-2H7zm0-6h14v-2H7zm0-8v2h14V5z"></path></svg>);
/* SHARE IS NO LONGER A CHAIN LINK. The glyph is a tray with a line leaving it — the platform mark
   for "send this somewhere else" — which is what the button does: it puts a URL on the clipboard for
   somebody who is not here. A chain named the OBJECT the button produces; this names the act. The
   component keeps its name, because every call site passes it as the share affordance and renaming
   it would be a rename with no reader. Two subpaths, both kept: the tray and the arrow. */
const IconLink = ({ size = 14 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ display: 'block', flex: 'none' }}><path fill="currentColor" d="M20 8h-5v2h3v11H6V10h3V8H4v15h16z"></path><path fill="currentColor" d="M11 16h2V5h3l-4-4l-4 4h3z"></path></svg>);
const IconTrash = ({ size = 14 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ display: 'block', flex: 'none' }}><path fill="currentColor" d="M6 21h12V7H6zM8 9h8v10H8zm7.5-5l-1-1h-5l-1 1H5v2h14V4z"></path></svg>);

// The AA verdict badge. ONE component for every surface that reports it — the list row, the detail
// panel's Accessibility group, and the universe card — so the three states (fill AND glyph, never
// colour alone) cannot drift between them the way three hand-rolled copies already had. All of the
// styling arrives from renderVals' shared aaReadout; this only draws it.
// The glyph sits in a fixed 9px slot: ✓ and ◐ draw at 9, ✕ is a narrower text glyph, and an
// intrinsic slot let the badge's own width follow the state.
const AaBadge = ({ aa }) => (
  /* data-aa-badge carries the pill corner from global.css. It is on the COMPONENT rather than on the
     list's call site, which is the wider change and the right one: the note above records that this
     badge existed as three hand-rolled copies that had already drifted, and consolidating them is
     why it is a component at all. Rounding one caller would start that over. The other two surfaces
     — the palette meta row and the overlay's readout — take the corner with it. */
  <span data-aa-badge="" style={aa.aaBadgeStyle} title={aa.aaBadgeTitle}>
    <span aria-hidden="true" style={sx('display:inline-flex;align-items:center;justify-content:center;width:9px;flex:none;line-height:1')}>
      {aa.aaState === 'flexible' && <IconCheck size={9} />}
      {aa.aaState === 'limited' && <IconContrast size={9} />}
      {aa.aaState === 'none' && <span style={sx('font-size:var(--fs-nano);line-height:1')}>✕</span>}
    </span>
    AA
  </span>
);

// ===== UNIVERSE CARD — the list row's content model, stacked =====
// The card and the row report the SAME palette, and the card's job is to say the same things in a
// different arrangement, not fewer things. Both pieces below are shared by the engine tiles and the
// reduced-motion grid, which are two renderings of one card and had drifted into two copies.

// The identity line: name, then the row's two labels — EXAMPLE for the seeded palettes, and the
// current palette NAMED rather than only dotted. The square stays beside the word, so the state is
// carried by shape as well as text and survives a greyscale render (SC 1.4.1).
const CardIdentity = ({ c }) => (<>
  <span style={sx('display:flex;align-items:baseline;gap:8px;min-width:0')}>
    <span style={sx("font-family:'Neue Montreal';font-weight:500;font-size:var(--fs-lead);color:var(--on-surface);white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{c.name}</span>
    {c.isExample && (
      <span style={sx('flex:none;font-family:Neue Montreal;font-size:var(--fs-nano);letter-spacing:var(--track-flat);text-transform:uppercase;color:var(--on-surface-muted);border:1px solid var(--line-strong);padding:2px 6px')}>Example</span>
    )}
  </span>
  {c.current && (
    <span style={sx('display:inline-flex;align-items:center;gap:6px;flex:none;font-family:Neue Montreal;font-size:var(--fs-micro);letter-spacing:var(--track-flat);text-transform:uppercase;color:var(--on-surface)')}>
      <span style={sx('width:7px;height:7px;background:var(--on-surface);flex:none')} aria-hidden="true"></span>Viewing</span>
  )}
</>);

// The metrics grid. aria-hidden because the card's own aria-label already speaks the full readout;
// this is the visual layer. AA pairs is the one entry carrying a verdict as well as a number, and
// it draws the same badge the list row and the detail panel draw, from the same aaReadout.
const CardMetrics = ({ c }) => (
  <div style={c.cardMetricsStyle} aria-hidden="true">
    {c.cardMetrics.map((m, mi) => (
      <div key={mi} style={sx('display:flex;flex-direction:column;gap:2px;min-width:0')}>
        <span style={sx('font-family:Neue Montreal;font-size:var(--fs-nano);letter-spacing:.09em;text-transform:uppercase;color:#a3a39c;white-space:nowrap')}>{m.label}</span>
        {/* Value first, badge trailing — the opposite order to the list row, and for the reason the
            row uses its own: put the number where the eye is already reading. The row's values are
            a RIGHT-aligned numeric column, so the badge leads and the count lands on the shared
            right edge. Here the values are a LEFT-aligned column — 0.069, Warm, 24.07.26 all start
            on one line — so a leading badge indented this one number out of that column and broke
            the only alignment the grid has. The number takes the column edge; the badge follows as
            the qualifier it is. */}
        <span style={sx('display:flex;align-items:baseline;gap:7px;min-width:0;font-family:Neue Montreal;font-size:var(--fs-label);letter-spacing:.01em;color:var(--on-surface);white-space:nowrap;text-transform:capitalize')}>
          <span style={sx('overflow:hidden;text-overflow:ellipsis')}>{m.text}</span>
          {m.aa && <AaBadge aa={m.aa} />}
        </span>
      </div>
    ))}
  </div>
);

// The state marker both facet groups share. Three states, three SHAPES — empty square, filled
// square with a check, and a bare rule — so the unavailable state is never carried by colour or
// dimming alone (SC 1.4.1). A rule rather than a greyed box because a box, however faint, still
// says "this is a thing you tick"; a rule says the tick is not on offer.
const FacetMark = ({ active, unavailable }) => (
  unavailable
    ? <span aria-hidden="true" style={sx('width:12px;height:12px;flex:none;display:inline-flex;align-items:center;justify-content:center')}>
        <span style={sx('width:8px;height:1px;background:var(--on-surface-muted)')}></span>
      </span>
    : <span aria-hidden="true" style={{
      ...sx('width:12px;height:12px;flex:none;display:inline-flex;align-items:center;justify-content:center'),
      border: '1px solid ' + (active ? 'var(--on-surface)' : 'color-mix(in srgb, var(--on-surface) 38%, transparent)'),
      background: active ? 'var(--on-surface)' : 'transparent',
      color: 'var(--surface)',
    }}>{active && <IconCheck size={9} />}</span>
);

// swatch value row (result bands + overlay bands share it; overlay renders the caveat chip)
function ValueRow({ v, showCaveat }) {
  return (
    <button type="button" data-ix="cell" data-focus="value" onClick={v.onCopy} aria-label={v.aria} style={v.rowStyle}>
      <span style={v.colStyle}>
        <span style={v.labelRowStyle}>
          <span style={sx('font-family: Neue Montreal; font-size:var(--fs-nano)')}>{v.labelText}</span>
          {showCaveat && v.hasCaveat && (<span style={sx('font-size:var(--fs-nano); font-family: Neue Montreal; text-transform: uppercase')}>{v.caveat}</span>)}
        </span>
        <span style={showCaveat ? sx('font-family: Neue Montreal; text-transform: uppercase; overflow: hidden; display: block') : sx('font-family: Neue Montreal; text-transform: uppercase; font-size:var(--fs-detail); overflow: hidden; display: block')}><span style={v.valueAnim}>{v.display}</span></span>
      </span>
      <span style={v.iconWrapStyle} aria-hidden="true">
        {v.copied && <IconCheck />}
        {v.notCopied && <IconCopy />}
      </span>
    </button>
  );
}

// Each of these names a job, not a noun. "Contrast" named the subject the button is about and left
// the user to supply the verb; in a row of six that is six subjects and no route.
const contrastB006Label = (
  <span style={sx('display:flex;align-items:center;gap:7px;height:14px')}><span aria-hidden="true" style={{ display: 'inline-flex' }}><IconContrast /></span><B006Text>Check contrast</B006Text></span>
);
// EXPORT'S CHEVRON IS GONE. It was there to promise a chooser — press this and you will be asked
// something — and that promise is the one thing this control did not need to make: what opens is a
// DIALOG, not a menu, and a dialog announces itself by covering the screen. The formats behind it
// are not five equivalents either; they carry extensions and a semantic-scaffold decision that
// changes what each one emits, which is why it is a dialog in the first place.
// Copy keeps its ▾, and that is the distinction now rather than an inconsistency: Copy really does
// drop a menu under the button, so the mark points at where the menu will appear.
const exportB006Label = (
  <span style={sx('display:flex;align-items:center;gap:7px;height:14px')}><span aria-hidden="true" style={{ display: 'inline-flex' }}><IconExport /></span><B006Text>Export</B006Text></span>
);
// COPY holds its formats in a menu and its confirmation on itself. The confirmation names the format
// rather than saying "Copied", because from a menu that is the only part still in question — and it
// stops at the format name: reserving room for the word "copied" as well would have made the widest
// state ("CSS variables copied") the permanent width of a button that usually reads "Copy". The verb
// is carried by the check mark and by the live region, which announces the whole sentence.
// Copy carried the same three parts as Export — glyph, word, chevron — and now carries the first
// two, because Export dropped its chevron and Copy stopped being a menu on the same day: what opens
// is a dialog, and a dialog does not need pointing at.
// Two earlier shapes did not. Naming the copied format on the button meant sizing the label against
// "CSS variables" so the row could not reflow mid-copy, which left Copy a third wider than anything
// beside it. SwapLabel's ✓ Copied was closer but still added its own check mark to a button that
// already had a glyph, and paid for it in width. So the confirmation reuses the slots that are
// already there: the glyph becomes the check, the word becomes Copied, and the only reserve is the
// two characters between them. The chevron holds its place, so the row still never moves, and which
// format landed on the clipboard is said by the live region and by the menu item just pressed.
const copyB006Label = (done) => (
  <span style={sx('display:flex;align-items:center;gap:7px;height:14px')}>
    <span aria-hidden="true" style={{ display: 'inline-flex' }}>{done ? <IconCheck /> : <IconCopy />}</span>
    <span style={sx('display:inline-grid;align-items:center;justify-items:center;height:14px')}>
      <span style={{ gridArea: '1/1' }}><B006Text>{done ? 'Copied' : 'Copy'}</B006Text></span>
      <span aria-hidden="true" style={{ gridArea: '1/1', visibility: 'hidden' }}>Copied</span>
    </span>
  </span>
);
// One dialog, both surfaces. The result bar and the archive's fullscreen detail draw the same row, so
// they draw the same chooser from the same state — only one of the two is ever mounted, which is why
// a single flag and a single [data-copy-menu] selector are enough for the tween to find its panel.
/* COPY IS A DIALOG NOW, NOT A DROPDOWN — the same surface as Export, because it is the same act:
   pick a format, get the palette in it. The two were built differently for no reason anyone could
   state — Copy dropped a 210px menu under its button while Export covered the screen — so the
   choice looked like two different kinds of decision depending on which button you pressed.

   WHAT IT COST AND WHAT IT BOUGHT. A menu is cheaper: it opens at the button and closes on the next
   press. A dialog costs a covering layer for a two-item choice, which is the honest objection to
   this. What it buys is that the formats can be READ: the menu had to keep its second line short
   enough for a 210px box, while these rows carry the same label-and-kind pair the export list uses,
   at the same size, on the same stadium. And it removes the last surface in the tool that answered
   a press with a floating list.

   THE ROW STYLE IS THE EXPORT DIALOG'S OWN (vals.copyItemStyle → itemBase in renderVals), and
   data-ex-item is on these buttons deliberately: that attribute carries the rich-tint transition in
   global.css, so the two lists answer a pointer identically rather than nearly so.

   TWO CALL SITES, ONE COMPONENT, AND ONLY ONE OF THEM MAY DRAW THE SHEET. The result stage and the
   palette detail overlay both mount this with their own handlers and their own `copied` key, off
   one shared flag (copyMenuOpen). That was harmless while the surface was a menu — each was
   positioned against its own trigger and the stage's was buried under the overlay — and it is not
   harmless for a centred dialog: both instances rendered one, so the overlay path put two stacked
   sheets and two scrims on the screen, doubling the dim and handing a screen reader two aria-modal
   dialogs for one choice. `owns` settles it at the call site: the overlay takes it whenever it is
   up, the stage takes it otherwise. The one on top was always the right one — the overlay's markup
   comes later — so this changes nothing about which handler runs, only how many sheets exist. */
function CopyControl({ open, owns, done, name, onToggle, onKey, onHex, onCss, itemStyle }) {
  /* THE FORMAT TAGS ARE GONE. Each row carried its shape on the right — ONE PER LINE against Hex
     list, CUSTOM PROPERTIES against CSS variables — and both were the label again in other words.
     The export dialog's tags stay, and the difference is the point: @THEME · CSS, JSON, ASE name a
     FILE the row will write, which the label does not. Nothing here writes a file.
     What the empty slot is for now: the confirmation. It was sharing that space with the tag and
     had to be stacked in a grid cell so the row could not reflow; with the tag gone it simply
     appears, and the row still cannot move because the row is the full width of the sheet. */
  const fmt = [
    { label: 'Hex list', onPick: onHex },
    { label: 'CSS variables', onPick: onCss },
  ];
  return (<>
    <B006 data-copy-trigger="1" data-emphasis="secondary" aria-haspopup="dialog" aria-expanded={open}
      onClick={onToggle} onKeyDown={onKey} aria-label="Copy the whole palette, in a format you choose"
      label={copyB006Label(done)} />
    {open && owns && (
      /* 125, the centred-dialog band, exactly where the export dialog sits when it is not stacked.
         The trigger is inline in a flex row, so the layer is a sibling of it rather than a child:
         position:fixed would still resolve against the viewport, but a dialog nested inside a
         button's own wrapper is a structure that only survives while nothing above it transforms. */
      <div style={sx('position:fixed;inset:0;z-index:125;display:flex;align-items:center;justify-content:center;padding:24px')}>
        <div data-modal-backdrop="1" onClick={onToggle} style={sx('position:absolute;inset:0;background:color-mix(in srgb, var(--scrim) 55%, transparent);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)')}></div>
        <div data-copy-dialog="1" data-lenis-prevent="1" role="dialog" aria-modal="true" aria-label={'Copy ' + name} onKeyDown={onKey} style={sx('position:relative;width:440px;max-width:94vw;max-height:88vh;overflow-y:auto;background:var(--surface);border:1px solid var(--line-strong);box-shadow:0 24px 60px rgba(0,0,0,.28);display:flex;flex-direction:column')}>
          <header style={sx('display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:20px var(--page-gutter) 0')}>
            <div style={sx('display:flex;flex-direction:column;gap:4px;min-width:0')}>
              <span style={sx('font-family:Neue Montreal;font-size:var(--fs-label);letter-spacing:var(--track-flat);text-transform:uppercase;color:var(--on-surface-muted)')}>Copy palette</span>
              <span style={sx("font-family:'Neue Montreal';font-weight:500;font-size:var(--fs-subtitle);letter-spacing:-.01em;color:var(--on-surface);white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{name}</span>
            </div>
            <button type="button" data-ix="press" data-focus="chrome" onClick={onToggle} aria-label="Close copy options" title="Close" style={sx('flex:none;width:32px;height:32px;display:inline-flex;align-items:center;justify-content:center;background:none;border:1px solid var(--action-line);border-radius:var(--radius-pill);padding:0;color:var(--on-surface);cursor:pointer')}><TextSwap><IconClose /></TextSwap></button>
          </header>
          {/* The same slot the export dialog puts its "what these values are" line in, saying the
              thing that is actually in question here: this goes to the clipboard, not to a file. */}
          <div style={sx('padding:14px var(--page-gutter) 0')}>
            <span style={sx('font-family:Neue Montreal;font-size:var(--fs-detail);line-height:1.5;color:var(--on-surface-muted);text-wrap:pretty')}>Every swatch in the palette, in the shape you pick. It goes to the clipboard, so nothing is downloaded.</span>
          </div>
          {/* THE ROW REPORTS, AND THE SHEET STAYS. Picking a format used to close the dialog and
              leave the confirmation on the button behind it — a menu's manners on a surface that is
              not a menu. The right-hand slot already held the format's kind, and that is the slot
              the answer belongs in: it swaps to a check and COPIED for as long as the copied state
              lasts, then goes back to saying what the format is.
              THE SAME SLOT, THE SAME PAIR, THE SAME TRANSITION as the project picker's rows one
              dialog over, which have been reporting CURRENT and ADDED in their trailing slot all
              along. Matching it means the confirmation is not a new thing to learn.
              Sized so it cannot reflow: the tag and the confirmation stack in one grid cell, the
              wider of the two sets the width, and only visibility changes — a row that got shorter
              on being pressed would move the row under it. */}
          <div style={sx('padding:16px var(--page-gutter) 22px;display:flex;flex-direction:column;gap:6px')}>
            {fmt.map((f, fi) => {
              const isDone = !!done && done === f.label;
              return (
              /* FOCUS IS PUT BACK ON THE ROW, and that is not belt and braces. copy() always calls
                 fallbackCopy, which mounts a textarea, selects it and removes it — so every copy
                 drops focus on the body. That never showed while the surface closed on pick and
                 handed focus to the trigger; with the sheet staying up, a keyboard reader was left
                 standing in an open dialog with no focus in it. One rAF after the pick, so it lands
                 behind the textarea's teardown rather than racing it. */
              <button key={fi} type="button" data-ex-item="1" data-focus="chrome" onClick={(e) => { const el = e.currentTarget; f.onPick(); requestAnimationFrame(() => { try { el.focus(); } catch (err) { } }); }} aria-label={f.label + (isDone ? ', copied' : '')} style={itemStyle}>
                {/* The label answers the hover; the confirmation does not. A mark that lifts and
                    re-enters while it is saying COPIED would read as the confirmation arriving
                    twice. Same division the scope chips make between their label and their count. */}
                <span style={sx('text-transform:capitalize;font-size:var(--fs-detail)')}><TextSwap>{f.label}</TextSwap></span>
                {isDone && (
                  <span aria-hidden="true" style={sx('display:inline-flex;align-items:center;gap:5px;flex:none;font-family:Neue Montreal;font-size:var(--fs-micro);letter-spacing:.06em;text-transform:uppercase;color:var(--on-surface);white-space:nowrap')}><IconCheck /> Copied</span>
                )}
              </button>
              );
            })}
          </div>
        </div>
      </div>
    )}
  </>);
}

// Filing takes the same folder glyph the archive row and the overlay header already use — one
// concept, one mark — and a label that changes with the state rather than an icon that doesn't.
const assignB006Label = (text) => (
  <span style={sx('display:flex;align-items:center;gap:7px;height:14px')}><span aria-hidden="true" style={{ display: 'inline-flex' }}><IconFolder /></span><B006Text>{text}</B006Text></span>
);
/* Share carries an icon AND swaps its text, and it used to compose the icon wrapper with SwapLabel
   — a grid cell holding the label, a hidden copy of it and a hidden "✓ Copied", so the button was
   always as wide as its widest state and could not reflow mid-copy.

   THE RESERVATION IS WHAT BROKE THE ROW'S PADDING. The cell centres its content, so the 22px by
   which "✓ Copied" exceeds "Share" was split evenly either side of the word: measured against
   Export, whose label sits 7px from its icon and 10px from the edge, Share's sat at 18 and 21. The
   button read as over-padded because it was carrying the width of a word it was not saying.

   IT IS ALSO UNNECESSARY HERE, and that is a consequence of where this button sits. Share is at the
   trailing edge behind a flexible margin-inline-start:auto gap — nothing follows it on the row — so
   a width change on copy is absorbed by the gap rather than pushing anything. The no-reflow
   argument holds for Copy, which sits between two other controls; it never held for this one.

   "Share", not "Share Link": the noun named the ARTEFACT the button produces, which is the one
   thing the reader does not have yet; the verb names the act, which is what a label is for. */
const shareB006Label = (copied) => (
  <span style={sx('display:flex;align-items:center;gap:7px;height:14px')}>
    <span aria-hidden="true" style={{ display: 'inline-flex' }}>{copied ? <IconCheck /> : <IconLink />}</span>
    <B006Text>{copied ? 'Copied' : 'Share'}</B006Text>
  </span>
);

// Mobile read-only share view. A separate lightweight surface, NOT a responsive port of the tool —
// it exists so a shared link opened on a phone shows the palette instead of the desktop gate. The
// tool still gates; this only ever renders somebody else's finished palette.
/* THE PHONE'S EXAMPLE LIST — the Library list, at a thumb's scale. Deliberately the same object as
   the desktop row: a strip you recognise the palette by, its name, and its first two traits. It is
   the level above the palette view, so it owns the trip back to the gate and the palette view owns
   the trip back to here. */
function MobileExampleList({ ml }) {
  return (
    /* height:100dvh over the inset, per the rule every full-height dialog here states: a fixed box on a
       phone resolves bottom:0 against the LARGE viewport, so with the URL bar showing its last rows
       and the way back sit below the fold. overscroll-behavior:contain stops a flick past the end of
       the list from chaining into the document and dragging the browser chrome with it — the list is
       the scroller, and nothing behind it should move. data-lenis-prevent is the house contract for
       an internal scrollport (see misc.js): without it Lenis swallows the wheel and applies it to a
       document that cannot scroll, so a narrow desktop window could not move this list at all. */
    <div data-mobile-list="1" role="region" aria-label="Example palettes" data-lenis-prevent="1"
      style={sx('position:fixed;inset:0;height:100dvh;z-index:150;overflow-y:auto;overscroll-behavior:contain;background:var(--surface);display:flex;flex-direction:column;-webkit-overflow-scrolling:touch')}>
      {/* clears the fixed logo, exactly as the palette view does */}
      <div aria-hidden="true" style={sx('flex:none;height:64px')}></div>

      <div style={sx('flex:none;padding:22px var(--page-gutter) 18px')}>
        <h1 data-mask-copy="1" style={sx("font-family:'Neue Montreal';font-weight:500;font-size:var(--fs-title);line-height:1.2;letter-spacing:-.01em;color:var(--on-surface);margin:0;text-wrap:balance")}>Example Palettes</h1>
        <p data-mask-copy="1" style={sx("font-family:'Neue Montreal';font-size:var(--fs-body);line-height:1.6;color:var(--on-surface-muted);margin:10px 0 0;text-wrap:pretty")}>Read from photographs, the same way the tool reads yours.</p>
      </div>

      {/* A real ul/li. role="listitem" was on the BUTTON, which overrides the button's own role —
          the control announced as a list item and stopped saying it could be pressed. The wrapper
          carries the list semantics (so "8 items" is announced) and the button keeps its own. */}
      <ul style={sx('flex:none;display:flex;flex-direction:column;width:100%;list-style:none;margin:0;padding:0')}>
        {ml.rows.map((r) => (
          <li key={r.key} style={sx('display:flex;width:100%')}>
          {/* data-ml-row carries the palette's id rather than a bare "1": motion.js only ever tests
              the attribute's presence, and naming the row is what lets the trip back put focus on
              the one you opened instead of dropping it on the body. */}
          <button type="button" data-ml-row={r.key} data-ix="press" data-focus="chrome" onClick={r.onOpen} aria-label={r.aria}
            style={sx('display:flex;align-items:center;gap:14px;width:100%;min-height:64px;padding:12px var(--page-gutter);background:none;border:none;border-bottom:1px solid var(--line);text-align:left;cursor:pointer;-webkit-tap-highlight-color:transparent')}>
            {/* Photograph over its own palette, in one 72px column. The strip alone said what the
                colours are; it could not say what they came from, which on a screen selling "read
                from light and atmosphere" is the more persuasive half. Stacked rather than side by
                side because a row is 64px and two thumbnails would leave the name nowhere to go. */}
            <span aria-hidden="true" style={sx('flex:none;display:flex;flex-direction:column;width:72px;gap:2px')}>
              {/* --img-outline, not a colour-mix off --on-surface. The two are nearly the same
                  number and not the same idea: --on-surface is #1a1a1a light and #f3f3ef dark, so
                  mixing off it draws a tinted rim — a warm off-white edge over a photograph in dark,
                  which is the "dirt on the image edge" an image outline is specifically not meant to
                  be. The token is pure black and pure white at 10%, it is what /about's figures
                  already use, and going through it means a retune reaches every picture on the site
                  rather than the ones that happened to be written by hand. */}
              {r.hasImage && (
                <span style={sx('position:relative;display:block;width:100%;height:40px;overflow:hidden;background:var(--surface-raised)')}>
                  <img src={r.image} alt="" style={sx('display:block;width:100%;height:100%;object-fit:cover')} />
                  <span style={sx('position:absolute;inset:0;box-shadow:inset 0 0 0 1px var(--img-outline)')}></span>
                </span>
              )}
              <span style={sx('display:flex;width:100%;height:' + (r.hasImage ? '6px' : '40px') + ';border:1px solid var(--line)')}>
                {r.strip.map((b) => (<span key={b.key} style={b.style}></span>))}
              </span>
            </span>
            <span style={sx('flex:1;min-width:0;display:flex;flex-direction:column;gap:4px')}>
              {/* data-case="own": this row is a control (data-ix="press") and the uppercase label
                  voice inherits into everything inside it, including this — the palette's NAME, which
                  the reading invented and the app did not write. The desktop library shows the same
                  string in its own case because those rows carry no tier, so the one object read two
                  ways depending on the screen. See the [data-ix] casing block in global.css. */}
              <span data-case="own" style={sx("font-family:'Neue Montreal';font-weight:500;font-size:var(--fs-body);color:var(--on-surface);overflow:hidden;text-overflow:ellipsis;white-space:nowrap")}>{r.name}</span>
              <span style={sx('font-family:Neue Montreal;font-size:var(--fs-micro);letter-spacing:var(--track-flat);text-transform:uppercase;color:var(--on-surface-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap')}>{r.traits.join(' · ')}</span>
            </span>
            <span aria-hidden="true" style={sx('flex:none;display:inline-flex;color:var(--on-surface-muted);transform:rotate(-90deg)')}><IconChevron size={12} /></span>
          </button>
          </li>
        ))}
      </ul>

      {/* Same hook as the palette view's foot below, holding one act instead of two — which is the
          whole reason the rule that sizes them is written against :not(:only-child). This button
          was width:100% and is now sized by its label, matching the gate's lone act rather than
          spanning a column it has no sibling to share. */}
      {/* THE BOTTOM INSET IS THE DEVICE'S, NOT A NUMBER THAT LOOKS LIKE IT. This was a flat 34px,
          which is exactly the home indicator's height on the phones it was tuned on — so it was
          right there and a guess everywhere else: too much on a device with no inset, and too
          little the moment the inset is larger or the phone is turned over and the inset moves.
          It matters more here than almost anywhere, because this row holds the only act on the
          surface and it is the last thing in a 100dvh scroller.
          calc(24px + env(...)) is the form story.css already uses for the same edge — same base,
          same fallback — so the three phone surfaces now clear the hardware the same way. */}
      <div data-cta-row="1" style={sx('flex:none;display:flex;flex-wrap:wrap;gap:12px;padding:24px var(--page-gutter) calc(24px + env(safe-area-inset-bottom, 0px))')}>
        <button type="button" className="glass-cta" data-focus="chrome" onClick={ml.onLeave} aria-label="Back to Start: return to the start screen"><TextSwap>Back to Start</TextSwap></button>
      </div>
    </div>
  );
}

/* THE PHONE'S STORY. Eight chapters that read one photograph, standing where the desktop gate used
   to — see src/styles/story.css for the layout argument.

   IT IS /about's PAGE, AT ONE COLUMN. Not a surface that resembles it: the same section element, the
   same grid, the same reading column, the same figures, the same anchor dock, and — the part that
   matters most and was hardest to see — the same MOTION MODULES. initPageReveal, initCascade,
   initDividers and initSectionDock are all root-scoped, so they run over this markup exactly as they
   run over /about's. There is no second reveal engine and no second set of tokens to drift.

   NO PHOTOGRAPH BEHIND THE WORDS. The first pass hung a fixed image behind the whole surface with a
   gradient scrim over it, and copy on top. Three things were wrong with that and only the first was
   obvious: the type's contrast depended on which part of which photograph happened to sit behind it,
   so it was a different answer per case and per scroll position; a fixed image cannot be themed, so
   the surface had one appearance while the rest of the site had two; and it is not what this site
   does — /about has no full-bleed photograph behind body copy anywhere in its fourteen sections. The
   pictures are FIGURES now. They sit in the reading flow, framed, labelled, on the surface colour,
   and the surface colour is a token — so light and dark both work by construction rather than by a
   second set of rules.

   THE MASKS ARE THE ONE PLACE TWO IMAGES STILL STACK, and there they are the subject: chapter 3 shows
   the same photograph twice, one muted and one full-strength through a colour's mask, which is the
   whole point of that chapter rather than a background treatment. */
function MobileStory({ st }) {
  const lit = !!st.litMask;
  return (
    <div data-mobile-story="1" className="doc-route">

      {/* THE ANCHOR DOCK, /about's own — same markup, same module, same glass pane. It is the one
          affordance a scrolling story of this length was missing: seven chapters is more than a
          reader can hold, and the dock says both where you are and what is left. */}
      <nav data-section-dock-init aria-label="Chapters of this story" className="section-dock">
        <div data-section-dock-pill className="section-dock__pill">
          <div className="glass-effect" aria-hidden="true">
            <div className="glass-effect__fill"></div>
            <div className="glass-effect__fill-burn"></div>
            <div className="glass-effect__highlight-soft"></div>
            <div className="glass-effect__highlight-strong"></div>
            <div className="glass-effect__edge-light"></div>
            <div className="glass-effect__edge-dark"></div>
            <div className="glass-effect__inner-glow"></div>
          </div>
          <button type="button" data-section-dock-toggle aria-expanded="false" aria-controls="story-dock-list" data-ix="cell" data-focus="value" className="section-dock__toggle">
            <span data-section-dock-label-wrap className="section-dock__label-wrap">
              <span className="section-dock__label">
                <span className="section-dock__link-num">1.1</span>
                <span>The Whole Picture</span>
              </span>
            </span>
            <span className="section-dock__caret" aria-hidden="true"></span>
          </button>
          <div data-section-dock-list id="story-dock-list" className="section-dock__list">
            <div data-section-dock-indicator className="section-dock__indicator"></div>
            <ul className="section-dock__items">
              <li data-dock-group className="section-dock__group">
                <button type="button" data-dock-group-toggle aria-expanded="true" aria-controls="story-dock-g1" data-ix="cell" data-focus="value" className="section-dock__group-head">
                  <span className="section-dock__link-num">1</span><span>The Image</span>
                  <span className="section-dock__chev" aria-hidden="true"></span>
                </button>
                <ul id="story-dock-g1" data-dock-sub className="section-dock__sub">
                  <li><a data-active data-section-dock-link href="#story-image" data-ix="cell" data-focus="value" className="section-dock__link"><span className="section-dock__link-num">1.1</span><span>The Whole Picture</span></a></li>
                  <li><a data-section-dock-link href="#story-structure" data-ix="cell" data-focus="value" className="section-dock__link"><span className="section-dock__link-num">1.2</span><span>The Structure</span></a></li>
                  <li><a data-section-dock-link href="#story-where" data-ix="cell" data-focus="value" className="section-dock__link"><span className="section-dock__link-num">1.3</span><span>Where It Lives</span></a></li>
                </ul>
              </li>
              <li data-dock-group className="section-dock__group">
                <button type="button" data-dock-group-toggle aria-expanded="false" aria-controls="story-dock-g2" data-ix="cell" data-focus="value" className="section-dock__group-head">
                  <span className="section-dock__link-num">2</span><span>The Reading</span>
                  <span className="section-dock__chev" aria-hidden="true"></span>
                </button>
                <ul id="story-dock-g2" data-dock-sub className="section-dock__sub">
                  <li><a data-section-dock-link href="#story-relationships" data-ix="cell" data-focus="value" className="section-dock__link"><span className="section-dock__link-num">2.1</span><span>Character and Contrast</span></a></li>
                  <li><a data-section-dock-link href="#story-interpretation" data-ix="cell" data-focus="value" className="section-dock__link"><span className="section-dock__link-num">2.2</span><span>What It Says</span></a></li>
                </ul>
              </li>
              <li data-dock-group className="section-dock__group">
                <button type="button" data-dock-group-toggle aria-expanded="false" aria-controls="story-dock-g3" data-ix="cell" data-focus="value" className="section-dock__group-head">
                  <span className="section-dock__link-num">3</span><span>Onward</span>
                  <span className="section-dock__chev" aria-hidden="true"></span>
                </button>
                <ul id="story-dock-g3" data-dock-sub className="section-dock__sub">
                  <li><a data-section-dock-link href="#story-gallery" data-ix="cell" data-focus="value" className="section-dock__link"><span className="section-dock__link-num">3.1</span><span>Other Atmospheres</span></a></li>
                  <li><a data-section-dock-link href="#story-handoff" data-ix="cell" data-focus="value" className="section-dock__link"><span className="section-dock__link-num">3.2</span><span>Your Own Image</span></a></li>
                </ul>
              </li>
            </ul>
          </div>
        </div>
      </nav>

      {/* KEYED ON THE CASE, and this is the fix for a bug that only appears when the story re-tells
          itself about a different image.

          pageReveal hands every [data-reveal] block to splitLines(), and the highlight hands its
          statement to splitChars() — both rewrite the element's children into per-line and per-char
          spans. React does not know that happened. So when the case changed, the palette data updated
          everywhere it was plain DOM (the weight bar, the key, the role cells) and every SPLIT
          sentence kept the old case's words: "Atmos reads Dry Season from a photograph" sitting above
          Scorched Clear Morning's colours. Measured exactly that way before this line.

          Keying <main> on the case id makes React discard the whole subtree and build it fresh, so
          the split spans go with it and the new text arrives unsplit. _syncStory then rebuilds the
          modules against the new DOM — it is already keyed on the same id, so the two stay in step.

          A case change is a rare, deliberate act that also returns the reader to 1.1, so remounting
          costs nothing anyone can perceive; the alternative is asking every dynamic sentence to
          survive being rewritten by a module that does not know React exists. */}
      <main key={st.caseId} id="main">
      {/* ===== data-reveal IS FOR TEXT, AND NEVER FOR A BLOCK HOLDING A CONTROL =====

          pageReveal hands every [data-reveal] block to splitLines(), which rebuilds it: each word
          becomes an inline span, the browser is asked where the lines fell, and the words are
          regrouped into .reveal-mask/.reveal-line pairs with Ranges. It is a DOM rewrite, and it
          replaces the nodes inside the block for as long as the reveal is in flight.

          On /about that costs nothing — that route's markup is a static HTML string injected with
          dangerouslySetInnerHTML, so nothing React owns is inside it. (Its one control-bearing
          block, .about-end__act, is exactly that case.) Here the markup IS React's, and a replaced
          node loses the props React attached to it. Measured on this surface: while the handoff's
          reveal was running, the `Explore Another Palette` button had no __reactProps at all and its
          onClick simply did not exist — it looked and hit-tested like a working button and answered
          nothing. It came back the moment the reveal finished and restored the original nodes, which
          is what made it look intermittent rather than broken.

          So three blocks lost the attribute: 1.3's figure (the swatch picks), 2.1's figure (the
          segmented group) and 3.2's actions. They are visible from the start now, which is the floor
          this surface is built on anyway — the section's own rule and heading still animate, and
          nothing that can be pressed is ever mid-rewrite when a thumb lands on it. */}
        {/* THE PROLOGUE. The one screen with no section rule and no number: it is the arrival, and
            /about's hero carries neither either. The landing's colour field shows through from the
            stage below — the only place on this surface where something sits behind the words, and
            it is the brand's own field rather than a photograph. */}
        <header className="story-hero about-grid" data-story-hero>
          <div className="story-hero__inner" data-story-hero-inner>
            {/* THE COPY'S OWN LIGHT, and it is the gate's answer to the same problem one branch up.

                orbit.js solves the field's hole from _heroReach, which measures
                `[data-landing] h1, [data-landing] p, [data-glass-cta], [data-gate-actions]`. None of
                those is here: this hero's copy is inside [data-mobile-story], so the gas was solved
                to clear the GATE's block — which on this surface is `quiet` and invisible — and then
                drawn straight through the words that are actually on screen.

                Adding this block to that selector is not the fix, and _fieldGeom's own note says why:
                "a 375px-wide gate leaves no radius that both clears the block and stays on screen, so
                on that one viewport geometry cannot win." The gate answers it with a radial wash of
                the surface colour and lets the gas pass under the words dimmed rather than pushing it
                off the screen. This is that wash, on the surface that had been left without one.

                inset -80px -48px against the gate's -56px -40px: this block is taller — a 44px
                two-line heading, a lead and an action, where the gate has a title and one sentence —
                so the ellipse has more to cover before it can start falling off. z-index 0 under the
                content's 1, aria-hidden, pointer-events:none: it is ground, not an object. */}
            {/* THE WASH IS ON A BLOCK THAT HUGS THE COPY, not on the sticky box around it, and the
                first attempt got that wrong in a way worth recording: .story-hero__inner is
                height:100svh because it has to have somewhere to stick, so an ellipse inset from IT
                is 375 x 812 of surface with an opaque core more than twice the height of the words.
                It did not read as a ground under the copy, it read as the field being switched off.
                This wrapper is sized by its own three children, which is what the gate's block is
                too — same structure, same result.

                closest-side, AND THAT KEYWORD IS THE WHOLE DIFFERENCE BETWEEN A GROUND AND A BAND.
                A radial-gradient defaults to farthest-CORNER, so its 100% stop lands on the box's
                diagonal — which means the middle of the top and bottom edges is only ~66% along the
                ramp and still ~70% opaque when the box simply stops. It drew two hard horizontal
                rules across the field, one above the heading and one below the button. closest-side
                puts 100% on the nearest edge instead, so the wash reaches transparent exactly where
                its box ends and there is nothing left to cut.

                -140/-120 rather than the gate's -56/-40: those figures are what give the ramp room
                to finish. The copy is 343 x ~225, so at this inset its corners sit around 74% along
                and still hold roughly half the ground, while the ends of the long heading line sit
                at 59% and keep most of it. Tighter insets put the words in the fade; wider ones
                start washing the field off the screen, which is the failure above. */}
            <div className="story-hero__block">
              <span aria-hidden="true" style={sx('position:absolute;inset:-140px -120px;z-index:0;pointer-events:none;background:radial-gradient(ellipse closest-side at center, var(--surface) 0%, var(--surface) 52%, transparent 100%)')}></span>
              <h1 data-story-hero-line>{st.heroTitle}</h1>
              <p className="story-hero__lead" data-story-hero-line>Atmos reads how colours share weight, create contrast and shape the feeling of an image.</p>
              <div className="story-hero__act">
                <button type="button" className="glass-cta" data-focus="chrome" onClick={st.onBegin}
                  aria-label="See how Atmos reads it: begin the story"><TextSwap>See How Atmos Reads It</TextSwap></button>
              </div>
            </div>
          </div>
        </header>

        {/* 1.1 — THE CASE, IN WORDS. NO PICTURE HERE, and its absence is the point.

            This chapter carried a full-width figure of the case photograph, and 1.3 carries the same
            photograph again at the same size two screens later. One image, twice, is not emphasis —
            it is the reader being shown the thing they were just shown, and it made the story feel
            like it was padding.

            So the picture arrives ONCE, in 1.3, where it has work to do: a colour's region cut out of
            its own frame. Here the case is introduced the way a reading is introduced — by name, and
            by what it is a photograph OF — which is also what lets 1.3's reveal land rather than
            repeat. The page is ~450px shorter for it. */}
        <section id="story-image" data-story-ch="image" data-sec data-rule className="about-sec about-grid">
          <div className="about-col">
            <h2 data-sec-head>Start With the Whole Image</h2>
            <p data-reveal>Atmos reads {st.name} from a photograph. Every colour it returns is a measurement of that frame, not a guess at what would go with it.</p>
            <p data-reveal>{st.descriptors && st.descriptors.length ? st.descriptors.join(' · ') : ''}</p>
          </div>
        </section>

        {/* 1.2 — THE STRUCTURE, as /about's weight figure: a bar of true shares, numbers in the key. */}
        <section id="story-structure" data-story-ch="structure" data-sec data-rule className="about-sec about-grid">
          <div className="about-col">
            <h2 data-sec-head>A Palette Is More Than a List of Colours</h2>
            <p data-reveal>Each colour holds a share of the frame. These are the real proportions.</p>
          </div>
          <figure className="about-figure about-figure--full" data-cascade>
            <div className="about-weights" role="img" aria-label={st.weightsAria}>
              {st.swatches.map((r) => (
                <span key={r.key} className="about-weights__part" style={{ width: r.share + '%', background: r.hex }}></span>
              ))}
            </div>
            {/* THE KEY UNDER-FILLED, IT NEVER OVERFLOWED — and that is why no markup changes here.

                about.css:352 lays these five rows out as a flex wrap with a 24px column gap, which is
                right at /about's 1032px and only there. At 375px the figure is 343px and two rows
                would need 375, so the wrap drops to one row per line and each row uses 179 of the 343
                available. Five rows, 164px of dead air each. The four fields have always fitted one
                line with room to spare; nothing had to be cut or stacked to make them fit.

                So the fields keep their classes, their order and their mapping, identical to /about's,
                and the whole repair is scoped rules in story.css turning a wrapped list into the
                full-width tally this surface already uses at 2.1.

                role="list" is a separate, pre-existing repair: list-style:none drops list semantics in
                Safari, on both surfaces. */}
            <ol className="about-weights__key" role="list">
              {st.swatches.map((r) => (
                <li key={r.key}>
                  <span className="about-key__chip" style={{ background: r.hex }}></span>
                  <span className="about-key__hex">{r.hex}</span>
                  <span className="about-key__ok">{r.ok}</span>
                  <span className="about-key__pct">{r.pct}</span>
                </li>
              ))}
            </ol>
          </figure>
        </section>

        {/* 1.3 — WHERE THE COLOUR LIVES. The two stacked photographs live HERE, inside a bounded
            figure, because here they are the subject — a colour's region cut out of its own picture. */}
        <section id="story-where" data-story-ch="where" data-sec data-rule className="about-sec about-grid">
          <div className="about-col">
            <h2 data-sec-head>See Where Each Colour Comes From</h2>
            <p data-reveal>
              {st.anyRegion
                ? 'Tap a colour to find it in the photograph.'
                : 'These colours are spread too finely to locate. The reading below still holds.'}
            </p>
          </div>
          {st.hasImage && (
            <figure className="about-figure about-figure--full">
              <div className="story-mask">
                <img className="story-mask__base" src={st.image} alt="" decoding="async" style={{ opacity: lit ? 0 : 1 }} />
                <img className="story-mask__dim" src={st.image} alt="" decoding="async" style={{ opacity: lit ? 1 : 0 }} />
                <img className="story-mask__lit" src={st.image} alt="" decoding="async"
                  style={lit ? { opacity: 1, WebkitMaskImage: 'url(' + st.litMask + ')', maskImage: 'url(' + st.litMask + ')' } : { opacity: 0 }} />
              </div>
              <ul className="about-roles" data-story-picks="1" data-cascade aria-label="The palette's colours">
                {/* A SWATCH WITH NO REGION IS NOT A DISABLED BUTTON, IT IS A CELL. `[data-ix]:disabled`
                    sets opacity:.42, which repaints the swatch — the one element whose whole job is to
                    be an exact colour — and takes its note to roughly 2.5:1 at 10px. /about's rule for
                    a cell carrying real palette colour is "NO OPACITY… that is not a tint", and it
                    ships this component as a plain div. So do we, where there is nothing to press. */}
                {st.swatches.map((r) => (
                  <li key={r.key}>
                    {r.hasRegion ? (
                      <button type="button" className="about-role" data-story-pick="1" data-ix="cell" data-focus="value"
                        aria-pressed={r.selected} aria-label={r.aria} onClick={r.onPick}>
                        <span className="about-role__swatch" style={{ background: r.hex }} aria-hidden="true"></span>
                        <span className="about-role__hex">{r.hex}</span>
                        <span className="about-role__note">{r.pct + ' of the frame'}</span>
                      </button>
                    ) : (
                      <div className="about-role" data-story-pick="1">
                        <span className="about-role__swatch" style={{ background: r.hex }} aria-hidden="true"></span>
                        <span className="about-role__hex">{r.hex}</span>
                        <span className="about-role__note">{r.pct + ', spread too finely to locate'}</span>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </figure>
          )}
        </section>

        {/* 2.1 — CHARACTER, ROLE AND CONTRAST. Three /about figures behind one segmented group. */}
        <section id="story-relationships" data-story-ch="relationships" data-sec data-rule className="about-sec about-grid">
          <div className="about-col">
            <h2 data-sec-head>Character, Role and Contrast</h2>
            <p data-reveal>Three readings of the same five colours, measured the same way the desktop measures them.</p>
          </div>
          <div className="about-figure about-figure--full">
            {/* A segmented group carrying aria-pressed, not a tablist: there is no tab primitive in
                this codebase, and a control that announces itself as tabs without answering an arrow
                key is worse than one that never claimed to. */}
            {/* Osmo Supply's Toggle Switch — its markup, its attributes, its background pill. The
                module (methods/toggleSwitch.js) moves the pill and owns the arrow keys; React owns
                which reading is selected, because that also decides which panel renders. See
                [ATMOS 2] there for why the two do not fight.

                A group of pressed buttons rather than a tablist: there is no tab primitive in this
                codebase, and a control announcing itself as tabs without answering an arrow key
                would be worse than one that never claimed to — this one does answer them. */}
            <div data-toggle-init className="toggle-switch" role="group" aria-label="Which reading to show">
              {/* A span, like the travelling pill in every other segmented control here. It was a
                  div, which is a perfectly good box and was silently the only one in the app that
                  did not round: the corner rule in global.css matched `> span[aria-hidden]`, so the
                  rail and its buttons became stadiums and the marker sliding between them stayed a
                  square. The rule no longer depends on the tag — but these three controls should
                  still be one object down to their markup, so this matches them. */}
              <span aria-hidden="true" className="toggle-switch__bg"></span>
              {/* data-focus="chrome" AND NOTHING ELSE. global.css opens with a blanket
                  `:focus{outline:none}` and hands every ring back through a data-focus tier, so an
                  omission here is not a control with a weak ring — it is a keyboard-reachable
                  control with no focus indicator at all, which is what these three were. Their
                  desktop counterparts (data-seg-btn, data-lib-tab, data-proj-chip) all carry it.

                  Deliberately NOT data-ix. That tier's hover fills an unselected option with 16%
                  --on-surface, which is the grey-slab-beside-the-solid-pill this app has already
                  taken off the scope chips and the library tabs. This control's feedback is the
                  travelling pill and the label's colour, and both are complete; the ring was the
                  only thing missing. */}
              {st.segs.map((t) => (
                <button key={t.key} type="button" data-toggle-btn className="toggle-switch__btn"
                  data-focus="chrome"
                  {...(t.selected ? { 'data-toggle-active': '' } : {})}
                  aria-pressed={t.selected} aria-label={t.aria} onClick={t.onPick}>
                  <span>{t.label}</span>
                </button>
              ))}
            </div>

            {st.tab === 'weight' && (
              <figure className="about-figure" data-story-panel="1">
{/* NO LABEL. It said "Character", one line under a segmented control whose pressed segment
                    already says Character — the panel is the answer to the toggle, so naming it again
                    is the control's own word printed twice with nothing between them. The same went
                    for the Roles panel below. The contrast panel keeps its line because that one is
                    not the tab's name: it is the reading. */}
                {/* A DESCRIPTION LIST, AND THE ANSWER LEADS.

                    This was `.about-thresholds`, which was the wrong borrowing twice over. First the
                    mechanical half: both of that component's type rules are scoped to `.about-route`
                    and were never widened to this surface, so the term and its value rendered
                    byte-identically — 16px, weight 400, full ink, no tracking, one above the other.
                    Nothing said which was the question and which was the answer.

                    Then the half that mattered more. /about's thresholds read "Body text → 4.5 to 1
                    or higher": the TERM is the subject and the value is a number qualifying it, so
                    that component puts the term in ink and mutes the value. This content is the other
                    way round. "Dominance → Dominant" is a measurement OF this palette; the band is
                    what the reading found, and the dimension is apparatus. Borrowing /about's
                    emphasis would have shouted the label and whispered the finding.

                    So the answer takes the ink and the size, the dimension takes the label voice this
                    site already uses for apparatus, and the pair becomes a real dt/dd — a term and
                    its description, which is what it always was. Two up, so five facts read as a
                    block rather than a 462px column. */}
                <dl className="story-facts" data-cascade>
                  {st.bands.map((b) => (
                    <div key={b.key} className="story-facts__row">
                      <dt>{b.label}</dt>
                      <dd>{b.value}</dd>
                    </div>
                  ))}
                </dl>
              </figure>
            )}

            {st.tab === 'role' && (
              <figure className="about-figure" data-story-panel="1">
{/* No role="img"/aria-label on the cells: that makes the subtree presentational, so the
                    name, the hex and the share — all real text — would be dropped from the tree and
                    replaced by one string. About ships this cell bare. */}
                <div className="about-roles" data-cascade>
                  {st.roleCells.map((c) => (
                    <div key={c.key} className="about-role">
                      <span className="about-role__swatch" style={{ background: c.swatch }} aria-hidden="true"></span>
                      <span className="about-role__name">{c.name}</span>
                      <span className="about-role__hex">{c.hex}</span>
                      <span className="about-role__note">{c.note}</span>
                    </div>
                  ))}
                </div>
              </figure>
            )}

            {st.tab === 'contrast' && (
              <figure className="about-figure" data-story-panel="1">
                {/* THE FINDING, NOT THE TAB. This read "Contrast: Mixed", which is the segment's own
                    word plus a verdict that cannot stand without it — drop the prefix and "Mixed" is
                    not a sentence. aaCount says the same thing and says it whole, so the line survives
                    the other two by carrying something the toggle does not already say. It is also
                    the only place the overall verdict appears: the list below is per pair. */}
                <p className="about-figure__label">{st.aaCount}</p>
                {/* `.about-checks` — About's narrow-column form of the pair row, right here twice over:
                    it fits one phone column, and its `__pair` slot holds the pair's NAME as text beside
                    the chips. The matrix form left "which two colours" to two unlabelled swatches,
                    which is the one thing this page may not do — state something in colour alone. */}
                <ul className="about-checks" data-cascade>
                  {st.pairs.map((pr) => (
                    <li key={pr.key} className={pr.cls}>
                      <span className="about-checks__pair">
                        <span className="about-key__chip" style={{ background: pr.a }} aria-hidden="true"></span>
                        <span className="about-key__chip" style={{ background: pr.b }} aria-hidden="true"></span>
                        {pr.pair}
                      </span>
                      <span className="about-checks__val">{pr.val}</span>
                      <span className="about-checks__verdict">{pr.use}</span>
                    </li>
                  ))}
                </ul>
              </figure>
            )}
          </div>
        </section>

        {/* 2.2 — THE READING. */}
        <section id="story-interpretation" data-story-ch="interpretation" data-sec data-rule className="about-sec about-grid">
          <div className="about-col">
            <h2 data-sec-head>Atmos Turns Colour Into a Reading</h2>
            {/* HIGHLIGHT TEXT ON SCROLL — Osmo Supply's resource, already ported and already on this
                site (methods/aboutHighlight.js). The reading resolves character by character as it
                comes up, which is the one place on this surface where that mechanic says something
                true rather than decorative: the sentence is the product's OUTPUT, composed from the
                analysis, and watching it resolve is watching the reading arrive. Same attribute
                contract /about uses on its own closing statement. */}
            {st.rationale && (
              <p className="about-statement" data-highlight-text
                data-highlight-scroll-start="top 86%" data-highlight-scroll-end="center 52%"
                data-highlight-stagger="0.05">{st.rationale}</p>
            )}
            {st.useLine && <p data-reveal>{st.useLine}</p>}
          </div>
        </section>

        {/* 3.1 — MORE ATMOSPHERES, AND THE ONE PLACE THE PAGE TURNS SIDEWAYS.

            Osmo Supply's Horizontal Scrolling Sections (methods/horizontalScroll.js). Seven cases
            read as seven full screens of vertical scroll in a story that was already long; pinned and
            translated they are one screen that moves sideways under the thumb — the same content, a
            fraction of the column, and the one moment in the story where the page does something the
            reader did not expect.

            It earns the surprise rather than spending it: a gallery is the one section here that is a
            SET rather than an argument, and a set laid across is a set you compare. The chapters
            either side stay vertical, so this reads as a turn rather than as a gimmick.

            No `data-horizontal-scroll-disable`: the resource's opt-outs exist to spare small screens
            a desktop effect, and this surface IS the small screen — disabling it here would disable
            it everywhere. The wrapper sits outside `.about-grid`, because a pinned element inside a
            grid track is pinned to the track rather than to the viewport. */}
        <section id="story-gallery" data-story-ch="gallery" data-sec data-rule className="about-sec about-sec--gallery">
          <div className="about-grid">
            <div className="about-col">
              <h2 data-sec-head>Different Images, Different Structures</h2>
              <p data-reveal>Read another image, and watch the same process return a different system.</p>
            </div>
          </div>

          <div className="story-horizontal" data-horizontal-scroll-wrap>
            {st.cases.map((c) => (
              <div key={c.key} className="story-hpanel" data-horizontal-scroll-panel>
                <button type="button" className="about-rail__card" data-story-case="1" data-ix="press" data-focus="value"
                  onClick={c.onOpen} aria-label={c.aria}>
                  {c.hasImage && <img src={c.image} alt="" loading="lazy" decoding="async" />}
                  <span className="about-rail__content">
                    <span className="about-rail__meta"><span>{c.note}</span></span>
                    <span>
                      {/* data-case="own": the palette's NAME is a string the reading invented, and
                          the uppercase control voice would otherwise inherit into it. */}
                      <span className="about-rail__name" data-case="own">{c.name}</span>
                      <span className="about-rail__strip" aria-hidden="true">
                        {c.strip.map((b) => (<span key={b.key} style={b.style}></span>))}
                      </span>
                    </span>
                  </span>
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* 3.2 — THE CLOSE, AS A TAKEOVER.

            Osmo Supply's Sticky Title Scroll Effect (methods/aboutStickyTitle.js, already ported —
            its SplitText call is hand-rolled here because that plugin is not among the five vendored
            on this site). The resource's attributes are kept exactly: [data-sticky-title="wrap"] on
            the section, [data-sticky-title="heading"] on the statement.

            ONE HEADING, NOT THREE. The resource stacks two or three and fades between them; the
            module's own loop fades out every heading except the last, so a single heading resolves
            and then simply holds — which is what a closing statement wants. The scrub is the point:
            the question assembles itself as the reader arrives at it rather than being there already.

            NO data-sticky-arc. That attribute is /about's colour arc, six palettes the ground travels
            through behind three statements. Six grounds behind one sentence would be noise, so this
            wrap opts out and keeps the surface colour.

            The wrapper is taller than the sticky container on purpose — that difference IS the scrub
            distance, and with them equal the effect has nowhere to run. */}
        <section id="story-handoff" data-story-ch="handoff" data-sec data-rule
          data-sticky-title="wrap" className="story-cta">
          <div className="story-cta__container">
            <div className="story-cta__inner">{/* NO data-sec-head, AND THAT IS THE WHOLE BUG.

                This heading carried it, so TWO engines owned the same element. pageReveal groups
                every [data-sec-head] and hands it to splitLines(), which rewrites innerHTML into
                per-line masks; the sticky title had already split the same heading into per-character
                spans and hung a scrubbed timeline off them. The line split replaced those spans, so
                the timeline was left animating nodes that were no longer in the document — and the
                floor this module sets at split time (autoAlpha 0) stayed on the survivors. Result:
                the whole statement invisible, with a scrub sitting at progress 1 and no tween on a
                single character.

                It also explains the earlier symptom that looked like flicker rather than absence.
                One engine or the other, never both. The takeover owns this heading. */}
              <h2 data-sticky-title="heading" className="story-cta__title">Ready to Read Your Own Image?</h2>
              <p className="story-cta__lead">{st.handoffLine}</p>
              <div className="story-actions">
                {/* THE SUFFIX NAMED A SURFACE THIS DOES NOT OPEN. It read "open the example
                    palettes", and Example Palettes is a real, differently-titled screen on this
                    site — the one the share view's `See All Examples` goes to. This control calls
                    openStoryPicker: an image chooser that covers the story in place, and which
                    announces itself as "Choose an image." So a screen-reader user was promised a
                    list and given a carousel, and the control's own live region contradicted its
                    own name. The visible label stays: you do explore another palette, by reading
                    another photograph. It is the half after the colon that has to be true. */}
                <button type="button" className="glass-cta" data-focus="chrome"
                  onClick={st.onAnother} aria-label="Explore another palette: choose a different image to read"><TextSwap>Explore Another Palette</TextSwap></button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ===== THE IMAGE CHOOSER — Osmo Supply's Layered Image Slider =====

          Opened by the close's one act. The resource's structure and every one of its data-
          attributes are kept: backgrounds that crossfade, a centred strip of titles, the small
          masked frame at the bottom, the counter, the autoplay bar and the two nav buttons. The
          module (methods/layeredSlider.js) supplies the swipe through Observer.

          THE TITLES ARE THE PALETTE NAMES, and the two image sets are the same photograph twice: the
          resource pairs a full-bleed background with a different image in the mask frame, which is a
          campaign device. Here both are the case, because the reader is choosing between eight real
          palettes and showing them two unrelated pictures per choice would be decoration standing
          where information belongs.

          It COVERS the story rather than replacing it, so the eight chapters behind it keep their
          scroll position and their built masks while the reader looks — and inert + aria-hidden go
          on the story underneath, because nothing behind a full-screen surface should be reachable. */}
      {st.pickerOpen && (
        <div data-story-picker="1" role="dialog" aria-modal="true" aria-label="Choose an image to read">
          <section data-layered-slider-init data-layered-slider-autoplay="0" className="layered-slider">
            <div className="layered-slider__container">
              <div className="layered-slider__bg-collection">
                <div className="layered-slider__bg-list">
                  {st.picker.cases.map((c) => (
                    <div key={c.key} data-layered-slider-bg className="layered-slider__bg-item">
                      {c.hasImage && <img src={c.image} alt="" className="layered-slider__bg-img" />}
                    </div>
                  ))}
                </div>
              </div>
              <div className="layered-slider__bg-dark"></div>

              <div className="layered-slider__text-collection">
                <div className="layered-slider__text-list">
                  {st.picker.cases.map((c) => (
                    <div key={c.key} data-layered-slider-title className="layered-slider__text-item">
                      {/* A button, not the resource's <a>: this commits a choice rather than
                          navigating, so it must not be a link that goes nowhere. data-case="own"
                          because the palette's name is a string the reading invented. */}
                      <button type="button" className="layered-slider__text-title" data-focus="chrome"
                        data-case="own" aria-label={'Read ' + c.name}>{c.name}</button>
                    </div>
                  ))}
                </div>
              </div>

              <div data-layered-slider-mask className="layered-slider__mask-collection">
                <div className="layered-slider__mask-list">
                  {st.picker.cases.map((c) => (
                    <div key={c.key} data-layered-slider-mask-item className="layered-slider__mask-item">
                      {c.hasImage && <img src={c.image} draggable="false" alt="" className="layered-slider__mask-img" />}
                    </div>
                  ))}
                </div>
              </div>

              <div className="layered-slider__overlay">
                <div className="layered-slider__overlay-top">
                  <span data-layered-slider-current className="layered-slider__span">01</span>
                  <div className="layered-slider__progress">
                    <div data-layered-slider-fill className="layered-slider__progress-inner"></div>
                  </div>
                  <span data-layered-slider-total className="layered-slider__span">05</span>
                </div>
                <div className="layered-slider__overlay-btm">
                  {/* data-ix="icon", not "press": the press tier tints with --on-surface, which is
                      near-black in light and would wash a control that is white ink on somebody's
                      photograph. The icon tier fills from the control's OWN currentColor, so the
                      tint is white here and follows the ink wherever this lands. Without either,
                      these two were the only controls on the phone with no press state at all —
                      the native tap highlight is suppressed below and nothing replaced it. */}
                  <div className="layered-slider__nav">
                    <button type="button" data-layered-slider-prev data-ix="icon" data-focus="chrome"
                      className="layered-slider__nav-button" aria-label="Previous image">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="100%" className="layered-slider__nav-icon" aria-hidden="true"><path d="M15 6l-6 6 6 6"></path></svg>
                    </button>
                    <button type="button" data-layered-slider-next data-ix="icon" data-focus="chrome"
                      className="layered-slider__nav-button" aria-label="Next image">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="100%" className="layered-slider__nav-icon" aria-hidden="true"><path d="M9 6l6 6-6 6"></path></svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>

        </div>
      )}
    </div>
  );
}

function MobileShareView({ ms }) {
  return (
    /* 100dvh, contained overscroll and the Lenis exemption, for the reasons spelled out on the list
       above — this surface is the taller of the two, so it is the one where a clipped foot cost you
       the way back out. */
    <div data-mobile-share="1" role="region" aria-label={'Shared palette: ' + ms.name} data-lenis-prevent="1"
      style={sx('position:fixed;inset:0;height:100dvh;z-index:150;overflow-y:auto;overscroll-behavior:contain;background:var(--surface);display:flex;flex-direction:column;-webkit-overflow-scrolling:touch')}>
      {/* Top padding for the fixed logo, which floats over this surface. It is on the scroller
          rather than the first child, because the first child is now sometimes a full-bleed image
          and sometimes the name — padding on whichever happened to be first would come and go. */}
      <div aria-hidden="true" style={sx('flex:none;height:64px')}></div>

      {/* No wordmark of its own and no "Example palette" eyebrow. This surface used to mint a
          second, flatter Atmos mark at 104px the moment you opened an example, so the brand changed
          shape on the way in — the page's real logo is rendered above this one now (see the
          showMobileShare branch), unchanged from the front page. Top padding clears it: the mark
          sits at 18.5px and is 26px tall. */}
      {/* The image the palette was read from. Full-bleed and 4:3 — on a phone a picture inset in
          the gutter reads as an attachment, where this is the evidence for everything under it.
          A 1px inset ring rather than a border: the outline must not shift the picture off the
          edges it is bleeding to. */}
      {/* --img-outline for the same reason as the list's thumbnail — see the note there. */}
      {ms.hasImage && (
        <div data-ms-img="1" style={sx('flex:none;width:100%;aspect-ratio:4/3;overflow:hidden;background:var(--surface-raised);position:relative')}>
          <img src={ms.image} alt={'The photograph ' + ms.name + ' was read from'} style={sx('display:block;width:100%;height:100%;object-fit:cover')} />
          <span aria-hidden="true" style={sx('position:absolute;inset:0;box-shadow:inset 0 0 0 1px var(--img-outline)')}></span>
        </div>
      )}

      <div data-ms-head="1" style={sx('flex:none;padding:22px var(--page-gutter) 22px')}>
        <h1 data-mask-copy="1" style={sx("font-family:'Neue Montreal';font-weight:500;font-size:var(--fs-statement);line-height:1.05;letter-spacing:-.015em;color:var(--on-surface);margin:0;text-wrap:balance")}>{ms.name}</h1>
        {/* THE SAME CHIP AS THE RESULT STAGE'S, AND IT ROUNDS WITH IT. This is the phone's copy of
            the trait row — same border, same 9% ground, same uppercase label — so a corner changed
            on one and not the other would make one palette look like two products depending on the
            screen it was opened on. The desktop pair is the row under the palette name; see the
            note there for why they stopped being squares. */}
        {ms.descriptors.length > 0 && (
          <div style={sx('display:flex;flex-wrap:wrap;gap:6px;margin-top:14px')}>
            {ms.descriptors.map((d, i) => (
              <span key={i} style={sx('font-family:Neue Montreal;font-size:var(--fs-label);padding:var(--btn-pad-chip);border:1px solid color-mix(in srgb, var(--on-surface) 15%, transparent);background:color-mix(in srgb, var(--on-surface) 9%, var(--surface));color:var(--on-surface);text-transform:uppercase;border-radius:var(--radius-pill)')}>{d}</span>
            ))}
          </div>
        )}
        {/* WHAT THE PALETTE IS FOR — not what it is. This slot held the reading ("Warm oranges
            sitting at mid weight, held to a single note"), which describes the palette; it holds
            composeUse()'s line now, which tells you what to do with it. That is the desktop result
            stage's own direction: the reading moved out of the leading slot there for exactly this
            reason, and the phone had been left carrying the half that was demoted.

            It reads: Best for <ground>, <register> <medium>. <capability>. The last clause is the
            honest half — a palette with no usable text pairing says so rather than being recommended
            for type — and it comes from aaState, the same verdict the AA badge shows, so the line
            and the badge can never disagree.

            --fs-lead in full ink, up from the --fs-body muted the reading had: it is the only
            description on this surface now, so it leads rather than annotates. The desktop sets it
            flush right against a second column; there is no second column on a phone, and
            right-aligned type in a 343px measure reads as a mistake, so it runs with the block.

            THE READING IS NOT DELETED, only unused here — it is still on the palette object and
            still on the desktop stage under this line. ms.rationale / ms.hasRationale are still in
            the view model, so putting it back under this one is a paragraph. */}
        {ms.hasUseLine && (
          <p data-mask-copy="1" style={sx("font-family:'Neue Montreal';font-size:var(--fs-lead);line-height:1.5;color:var(--on-surface);margin:16px 0 0;text-wrap:pretty")}>{ms.useLine}</p>
        )}
      </div>

      {/* the palette itself: full-bleed rows, each tappable to take its hex */}
      <div role="group" aria-label="Palette swatches. Tap a colour to copy its hex" style={sx('flex:none;display:flex;flex-direction:column;width:100%')}>
        {ms.rows.map((r) => (
          <button key={r.key} type="button" data-ms-row="1" data-ix="cell" data-focus="value" onClick={r.onCopy} aria-label={r.aria} style={r.style}>
            <span style={r.hexStyle}>{r.hex}</span>
            <span style={r.metaStyle}>
              {r.copied ? (<><IconCheck />Copied</>) : r.pct}
            </span>
          </button>
        ))}
      </div>

      {/* Flows straight after the colours rather than anchoring to the bottom: on a tall phone a
          stretched footer strands this line half a screen away from what it refers to. */}
      {/* Same device inset as the list's foot — see the note there. */}
      <div data-ms-foot="1" style={sx('flex:none;padding:24px var(--page-gutter) calc(24px + env(safe-area-inset-bottom, 0px))')}>
        {ms.footLine && (
          <p data-mask-copy="1" style={sx("font-family:'Neue Montreal';font-size:var(--fs-detail);line-height:1.6;color:var(--on-surface-muted);margin:0;text-wrap:pretty")}>{ms.footLine}</p>
        )}
        {/* ONE WAY ON, AND IT IS NOT A WAY BACK. This held two acts — `See All Examples` and a
            `Back to Start` / `Back to Examples` that changed label depending on how you arrived.
            The back half is gone: the fixed Atmos mark at the top of this surface IS the way to the
            start, it is on every phone screen, and returnToIntro() behind it already clears
            exampleView, exampleList and current — so the foot was spending a control restating a
            gesture the masthead offers everywhere. Two ways to do one thing is how they drift.

            `See All Examples` no longer hides when you arrived FROM the list. It was hidden there on
            the argument that it would send you where you just were — true while a Back button was
            standing next to it, and the wrong instinct once it is the only act: going back up to the
            list is exactly what someone at the bottom of an example wants, and it is the same
            destination whichever way they came in. One act, one label, one destination, always. */}
        {ms.canLeave && (
          <div data-cta-row="1" style={sx('display:flex;flex-wrap:wrap;gap:12px;margin-top:18px')}>
            <button type="button" className="glass-cta" data-focus="chrome" onClick={ms.onSeeAll} aria-label="See All Examples: every example palette"><TextSwap>See All Examples</TextSwap></button>
          </div>
        )}
      </div>
    </div>
  );
}

// Off-screen but IN the accessibility tree — the live regions' own style, and the one to reach for
// whenever a control's spoken form has to carry a word its visible form leaves out.
const liveRegionStyle = sx('position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;margin:-1px;padding:0;border:0');

/* Curved-wipe transition layer. Caps are transient motion shape — the one sanctioned curved
   exception; never a persistent border-radius on UI.

   Rendered by every route, not just the tool. It used to serve one handoff (Get Started); it now
   also covers the swap to privacy and terms, and a route that did not render it would be a route
   the wipe could not leave — wipe.js resolves its layer with a querySelector and falls back to an
   instant swap when there is none. */
/* THE COVER, and it is rendered by PaletteApp rather than from inside these branches — see the note
   on its render(). It used to sit in each branch's child list, which is what destroyed it mid-wipe:
   React reconciles unkeyed children by index, and this element was index 2 of the document branch
   against index 6 of the tool branch. Crossing that boundary unmounted the layer the running timeline
   was animating and mounted a fresh, display:none one in its place, so the cover vanished in a single
   frame and the whole reveal half played on detached nodes. One render site, one node, every route. */
export function WipeLayer() {
  return (
    <div data-wipe="1" aria-hidden="true" style={sx('position:fixed;inset:0;z-index:160;pointer-events:none;overflow:hidden;display:none')}>
      <div data-wipe-panel="1" style={sx('position:absolute;inset:0;background:var(--ground);will-change:transform')}>
        <div data-wipe-cap-top="1" style={sx('position:absolute;left:-8%;bottom:100%;width:116%;height:15vh;background:var(--ground);border-radius:50% 50% 0 0;transform:scaleY(0);transform-origin:bottom center')}></div>
        <div data-wipe-cap-bottom="1" style={sx('position:absolute;left:-8%;top:100%;width:116%;height:15vh;background:var(--ground);border-radius:0 0 50% 50%;transform:scaleY(1);transform-origin:top center')}></div>
        <div style={sx('position:absolute;inset:0;display:flex;align-items:center;justify-content:center')}>
          <div style={sx('overflow:hidden;padding:8px 6px')}>
            <img data-wipe-word="1" src="/assets/atmos-gallery-logo-white.svg" alt="Atmos Gallery" style={sx('display:block;height:clamp(29px,4.81vw,53px);width:auto;transform:translateY(120%)')} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* FIRST IN THE TAB ORDER, ON EVERY BRANCH. Rendered ahead of each return's live region rather than
   once at the top, because this render is five separate returns — the tool, the three phone surfaces
   and the document routes — and a landmark link that exists on only some of them is worse than none:
   a keyboard reader learns it is there and then finds it missing on the page that needed it most.

   Every branch's own <main> carries id="main", and exactly one branch renders at a time, so the one
   id is never ambiguous. Styles are in global.css, with the reasoning for the z-index and the
   transform. */
function SkipLink() {
  return <a className="skip-link" href="#main" data-focus="chrome">Skip to main content</a>;
}

/* The site footer, closing the tool and both legal routes — styles from /site-foot.css, which
   index.html links rather than the bundle importing it, because that file predates this being the
   only document that draws the footer at all. 404.html used to be the other one and no longer
   carries a footer. Classes rather than sx() for exactly one reason: the footer needs :hover,
   :focus-visible and a 700px media query, none of which an inline style can express, so the rules
   have to live in a stylesheet whatever we do — and then a second, inline copy of the layout would
   only be something to keep in sync with them.

   The three links are real hrefs, not buttons. onNavigate intercepts a plain left-click and turns it
   into the wiped in-document swap; every other way of following a link — middle-click, cmd-click,
   right-click-copy, a crawler, a reader with no JS — gets the address itself and a real document at
   the other end. A router that swallowed those would be trading the whole no-JS floor for a
   transition. See navigate() in renderVals. */
/* `landmark` exists for exactly one caller, and it is a correctness flag rather than a style knob.
   A <footer> that is not inside sectioning content maps to the contentinfo landmark, and a document
   is meant to have one. The landing is position:fixed over the tool rather than instead of it, so
   while it is up BOTH are in the DOM — and giving the landing a real <footer> put two contentinfo
   landmarks and two copies of About/Privacy/Terms in the same accessibility tree. The landing's copy
   renders as a plain <div>: same styles, same links, no second landmark. The tool's stays the
   document's one contentinfo, which is what it has always been.

   Not solved by hiding the tool instead, deliberately: everything behind the landing is already
   exposed to assistive tech and always has been — the skip link at the top of global.css exists
   because of it — and quietly making the tool inert here would be a different change wearing this
   one's clothes. */
function SiteFooter({ route, onNavigate, brand = true, landmark = true }) {
  const Root = landmark ? 'footer' : 'div';
  const link = (href, label) => (
    <a href={href} onClick={onNavigate} {...(pathFor(route) === href ? { 'aria-current': 'page' } : null)}><TextSwap>{label}</TextSwap></a>
  );
  return (
    <Root className="site-foot">
      {/* THE WORDMARK IS OPTIONAL, and the landing is the one surface that turns it off. It is a
          full-bleed masked graphic — 876x136 of ink stretched to the column — which is the right
          way to close a document you have just read to the bottom of, and the wrong thing to put
          under a screen whose whole subject is one wordmark already standing at the top of it. The
          same mark twice on one screen, the second one twenty times larger, reads as a mistake.
          `.site-foot__meta` carries its own border-top, so dropping this leaves the rule above the
          meta row intact and nothing else has to change. */}
      {brand && (
        <div className="site-foot__brand">
          <a href="/" onClick={onNavigate} aria-label="Atmos Gallery, home"><span className="site-foot__mark" aria-hidden="true"></span></a>
        </div>
      )}
      <div className="site-foot__meta">
        {/* One word, so inline-block costs no wrapping — the swap is safe here in a way it is not
            for a multi-word link inside running prose. */}
        <p className="site-foot__origin">A Part of <a href="https://kau.studio"><TextSwap>KauStudio</TextSwap></a></p>
        {/* No longer only legal, so the landmark is no longer named for it: About stands beside the
            two statements as the site's third document, and it leads because it is the one somebody
            arriving here might actually be looking for. */}
        <nav className="site-foot__nav" aria-label="Site">
          {link('/about', 'About')}
          {link('/privacy', 'Privacy Policy')}
          {link('/terms', 'Terms and Conditions')}
        </nav>
        <p className="site-foot__rights">All Rights Reserved &copy; 2026</p>
      </div>
    </Root>
  );
}

/* THE LANDING STAGE — the colour field, brand copy, and on a phone the gate's two acts. Lifted out of
   AppView's main return because it is no longer that return's alone: the example list and the
   read-only palette render it too, underneath themselves.

   They used to REPLACE it, and the formation paid for it. It is a raymarched WebGL volume over a
   painted floor, both built by initOrbit from a freshly gamut-mapped ramp and a 1MB noise volume —
   so a landing that unmounts is a field destroyed, and a landing that comes back is a field rebuilt
   from nothing, with a visible hole where the gas should be while it uploads. Covering it costs one
   opaque panel and keeps the field exactly where it was left.

   `covered` is passed by those two paths: aria-hidden and inert together, so nothing under a
   full-screen surface is readable, focusable or tabbable — which is the whole reason the early
   returns existed. The tool is still left out of the tree entirely; only this stage stays. */
/* `quiet` is the story's own state, and it is deliberately NOT `covered`.

   `covered` says "an opaque surface is over this": it applies inert + aria-hidden, and its callers
   also fall out of _landingLit(), which parks the field's ticker. That is right for the example list
   and the share view and wrong for the story, whose first chapter is transparent so that the field
   showing through IS the prologue's visual — it has to stay lit and turning.

   What the story does need is for the GATE'S COPY to stop existing. It is the same screen: the
   heading, the sentence and `Try an Example` would otherwise sit behind chapter 1's own words, two
   headlines deep, and the button would still take a Tab and a tap from behind an opaque chapter
   further down. So `quiet` hides the block and hands the whole landing inert + aria-hidden, while
   _landingLit() — which does not know about the story — keeps the formation running.

   HIDDEN BY OPACITY, NEVER BY DISPLAY OR A TRANSFORM. `o.reachWatch` is a ResizeObserver on
   `[data-landing] h1, [data-landing] p, [data-glass-cta]`, and _heroReach() measures those marks plus
   [data-gate-actions] to solve the field's clear radius. Removing them, or changing any of their
   boxes, re-fires the observer and re-solves the field underneath a reader who is scrolling. Opacity
   changes no box, so the hole stays exactly where it was solved — around a block that is still
   there, still the same size, and no longer visible. Which is also the right geometry: chapter 1's
   copy sits in the same centred column the gate's did. */
function LandingStage({ vals, covered, quiet }) {
  return (
        /* height:100dvh for the same reason the two phone surfaces carry it: this block is centred
           in its own box, and a box that runs to the LARGE viewport's bottom centres the gate copy
           below the middle of what the reader can actually see — and pushes the ring formation,
           which is solved around that centre, off with it. */
        <div data-landing="1" {...(vals.narrow ? { 'data-desk-gate': '1' } : {})} {...((covered || quiet) ? { inert: true, 'aria-hidden': 'true' } : { role: 'region', 'aria-label': vals.narrow ? 'Desktop recommended' : 'Welcome to Atmos Gallery' })} style={sx('position:fixed;inset:0;height:100dvh;z-index:150;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:clip;background:var(--surface)')}>
          {/* THE FIELD (decorative). Two elements and nothing else in the markup: the air, and the
              stage the engine appends its canvas to. Where a hundred and sixteen orb tiles used to
              be — each with a float wrapper, a clip and five shading layers — there is one painted
              annulus, which is the floor rather than a second artwork (see methods/orbit.js).
              Sizes and colours are ALL written imperatively: the field is solved against the copy's
              measured box, and a box React does not know it changed is exactly the number that
              would go stale. */}
          <div data-orbit-bloom="1" aria-hidden="true" style={sx('position:absolute;inset:0;pointer-events:none')}></div>
          <div data-orbit="1" aria-hidden="true" style={sx('position:absolute;inset:0;pointer-events:none')}>
            <div data-orbit-floor="1" style={sx('position:absolute;inset:0;z-index:0;pointer-events:none')}></div>
          </div>
          <div aria-hidden="true" style={sx('position:absolute;inset:0;z-index:3;pointer-events:none;background:radial-gradient(120% 100% at 50% 46%, transparent 58%, color-mix(in srgb, var(--on-surface) 8%, transparent) 100%)')}></div>
          <div data-orbit-grain="1" aria-hidden="true" style={sx('position:absolute;inset:0;z-index:4;pointer-events:none;mix-blend-mode:soft-light;opacity:0.045;background-repeat:repeat')}></div>
          {/* brand content (above the field) — horizontal padding only: any vertical padding would
              bias the block off the viewport centre the rings clear for it */}
          <div style={{ ...sx('position:relative;z-index:2;display:flex;flex-direction:column;align-items:center;text-align:center;pointer-events:none;padding:0 var(--page-gutter)'), ...(quiet ? { opacity: 0 } : null) }}>
            {vals.narrow ? (
              /* small screen: the honest gate copy, sized to fit inside the ring the engine builds
                 around it (_heroReach measures this block, so a narrower column = a tighter ring).
                 It carries the SAME masked reveal as the desktop statement — the gate is the phone's
                 arrival, so its copy rises out of the mask as the loader uncovers rather than being
                 there already. One pre-authored line-group per block, no split; the masks are inside
                 the h1/p so those boxes stay exactly the size _heroReach measures. */
              <div style={sx('position:relative;display:flex;flex-direction:column;align-items:center;width:100%;max-width:420px')}>
                {/* The copy's own light. The formation is solved to clear the marks it is told
                    about, but a phone is 375px wide and the gate now fills most of it — there is no
                    radius left that both clears the block and stays on screen, so on this one
                    viewport geometry cannot win. A soft radial of the surface colour sits behind the
                    block instead: the gas still passes through, it just passes through dimmer, and
                    the words keep a ground to sit on. Which is the subject of the product anyway. */}
                <span aria-hidden="true" style={sx('position:absolute;inset:-56px -40px;z-index:0;pointer-events:none;background:radial-gradient(ellipse at center, var(--surface) 0%, var(--surface) 52%, transparent 100%)')}></span>
                <h1 style={sx("position:relative;z-index:1;font-family:'Neue Montreal';font-weight:500;font-size:var(--fs-title);line-height:1.2;letter-spacing:-.01em;color:var(--on-surface);margin:0;max-width:none;text-wrap:balance")}>
                  {/* Two masked line-groups, not one wrapping line — the same shape the desktop statement uses.
                      It fixes the break where it belongs ("is a" ends the first line at every width
                      instead of wherever the measure happens to land) and gives each line its own
                      reveal, so the heading rises in two beats rather than one. */}
                  <span style={sx('display:block;overflow:hidden')}><span data-land-line="1" style={sx('display:block')}>Atmos Gallery is a</span></span>
                  <span style={sx('display:block;overflow:hidden')}><span data-land-line="1" style={sx('display:block')}>Desktop Experience.</span></span>
                </h1>
                {/* The reason, not just the rule. "Open this on a wider screen" is a refusal; what
                    makes it one is that it never said why, so it read as a limitation of the site
                    rather than of the work. Reading an image means comparing swatches, roles and
                    contrast side by side, and that is a wide-screen job. */}
                <p style={sx("position:relative;z-index:1;font-family:'Neue Montreal';font-size:var(--fs-body);line-height:1.6;color:var(--on-surface-muted);margin:14px 0 0;max-width:none;text-wrap:pretty")}>
                  <span style={sx('display:block;overflow:hidden')}><span data-land-line="1" style={sx('display:block')}>Reading an image means weighing colours, roles and contrast side by side. That needs room.</span></span>
                </p>
                {/* THE HANDOFF. A gate with nothing to do is a dead end, and this one met people
                    arriving from a link with a sentence and no next move. Two acts that are honest
                    on a phone: see what the tool makes, or keep the address for the machine that can
                    run it. pointer-events restored — the block above it is decorative and inert. */}
                {/* ONE ACT, HUGGING ITS LABEL. This was a stacked column of two 240px buttons, then
                    a row of two that grew to span the margins; it is a single control now, sized by
                    its own words plus .glass-cta's 16px either side. A lone action stretched across
                    the column would be a 343px slab under two lines of centred copy — the width
                    reading as importance the act does not have, since it is the only one on offer.

                    The flex/gap/wrap declarations stay: they cost nothing with one child, and they
                    are what makes a second act a one-line change rather than a rebuild. The element
                    itself stays too — orbit.js measures [data-gate-actions] as one of the marks the
                    ring formation has to clear, so it has to be here whether or not it holds two. */}
                <div data-gate-actions="1" style={sx('position:relative;z-index:1;display:flex;flex-wrap:wrap;align-items:center;gap:12px;width:100%;align-self:center;margin-top:26px;pointer-events:auto')}>
                  {vals.gateHasExample && (
                    <button type="button" className="glass-cta" data-emph="primary" data-focus="chrome" onClick={vals.gateExample} aria-label="Try an Example: open an example palette, read only"><TextSwap>Try an Example</TextSwap></button>
                  )}
                  {/* `Save for Desktop` stood here — the quiet second act that copied the site's
                      address to the clipboard so the reader could open it on a machine that can run
                      the tool. Removed by request. Its handler is renderVals' gateCopyLink →
                      copySiteLink() in methods/persistence.js, which is now uncalled; the copy key
                      it wrote was 'gate-link'. Left in place rather than deleted, because bringing
                      the act back is then a button rather than a feature.

                      WHAT THIS COSTS, so it is a decision and not a surprise: the gate's one action
                      is now behind `gateHasExample`, which is `feed.length > 0`. An empty feed —
                      localStorage refused, or the seed failing — leaves the phone a statement, a
                      sentence and no next move at all, which is the dead end the two acts were
                      introduced to close. The examples are seeded on first run, so this is the
                      storage-blocked case rather than the common one. */}
                </div>
              </div>
            ) : (
              <div style={sx('position: relative; display: flex; flex-direction: column; align-items: center; max-width: 606px')}>
                <h1 style={sx("font-family:'Neue Montreal';font-weight:500;font-size:clamp(28px,4.4vw,40px);line-height:1.16;letter-spacing:var(--track-statement);margin:0;max-width:20ch;text-wrap:balance")}>
                  <span style={sx('display:block;overflow:hidden')}><span data-land-line="1" style={sx('display: block; color: var(--on-surface); font-size:var(--fs-statement); max-width: 507px')}>Colour read from light and atmosphere.</span></span>
                  <span style={sx('display:block;overflow:hidden')}><span data-land-line="1" style={sx('display: block; color: color-mix(in srgb, var(--on-surface) 50%, transparent); font-size:var(--fs-statement)')}>In seconds.</span></span>
                </h1>
                {/* TWO ACTS NOW, AND THE TIER FINALLY HAS ITS PAIR. Was an HBtn carrying
                    glassCta/glassCtaHover/glassCtaActive — three style objects and two pieces of
                    React state to express a hover and a press that CSS already owns for every other
                    control on the site. It is .glass-cta now, so the front page's actions are one
                    object in one place.

                    `Create` is the act the screen exists to offer and takes [data-emph="primary"];
                    `Learn More` is the quiet second. global.css's note at --cta-fill-emph says that
                    tier was written for a pair and had none left — this is the pair, so the two
                    fills are now doing the job they were measured for rather than sitting on a lone
                    control.

                    LEARN MORE IS AN ANCHOR, NOT A BUTTON, and that is deliberate three times over.
                    It is a real address, so a middle-click and a cmd-click open /about in a tab the
                    way the footer's own About link does — vals.navigate only intercepts the plain
                    left-click a router is entitled to. It keeps `button[data-glass-cta]` matching
                    exactly one element, which is what wipe.js's focus handoff selects on. And an
                    anchor is what a screen reader should meet for something that goes somewhere.

                    data-glass-cta is on BOTH: orbit.js reads it as a geometry mark the field's hole
                    has to clear (see the contract there) and its querySelectorAll takes every one,
                    so the hole now clears the row rather than half of it. */}
                <div style={sx('margin-top:36px;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:12px;pointer-events:auto')}>
                  <button type="button" className="glass-cta" data-emph="primary" data-focus="chrome" data-glass-cta="1" onClick={vals.getStarted} aria-label="Create"><TextSwap>Create</TextSwap></button>
                  <a href="/about" className="glass-cta" data-focus="chrome" data-glass-cta="1" onClick={vals.navigate} aria-label="Learn More: what Atmos reads and how"><TextSwap>Learn More</TextSwap></a>
                </div>
              </div>
            )}
          </div>
          {/* THE FOOTER, ON THE LANDING TOO — the same component the tool and both legal routes
              close with, minus its wordmark (see the note at SiteFooter).

              data-land-nomark IS LOAD-BEARING, not a hook for styling. orbit.js's _heroReach()
              solves the field's hole from `[data-landing] h1, [data-landing] p, [data-glass-cta]`,
              and this footer brings two <p> elements into that subtree sitting at the very bottom
              of the viewport. Left unmarked they would be read as copy the formation has to clear,
              and the hole would open from the centred block all the way to the bottom edge — the
              composition destroyed by a footer nobody was looking at. The attribute is what
              _heroReach filters on; it says "this is in the landing but it is not the landing's
              copy".

              ABSOLUTE, so it does not enter the flex centring above. The stage is a fixed box with
              justify-content:center, and a third child in that flow would push the statement and
              its two acts off the optical centre the field is solved around. pointer-events:auto
              because the stage's own brand block is inert. */}
          <div data-land-nomark="1" style={{ ...sx('position:absolute;left:0;right:0;bottom:0;z-index:5;pointer-events:auto'), ...(quiet ? { opacity: 0 } : null) }}>
            <SiteFooter route={vals.route} onNavigate={vals.navigate} brand={false} landmark={false} />
          </div>
        </div>
  );
}

export default function AppView({ vals }) {
  /* About, privacy and terms, before anything the tool needs.

     Returned early for the same reason showMobileShare is: the tool must not be in the DOM behind a
     surface that is not it. The wipe covers the screen while this swap happens, so what a reader
     sees is one continuous panel — but behind it the entire app, orbit stage and archive included,
     stops existing rather than lying dormant under a document. Nothing to tab into, nothing laid out
     off-screen, no WebGL context held open while somebody reads a privacy policy — which matters
     more now than it did, because /about opens a context of its own.

     [data-app] is kept on the wrapper deliberately. It is what the desktop gate, the wipe's inert
     guards and toggleTheme's crossfade all select on; a document route that dropped it would be a
     surface those three could not see. .doc-route carries what all three share (doc.css); the second
     class is the page's own scope for its measures and layout. */
  if (isDoc(vals.route)) {
    const legal = isLegal(vals.route);
    return (
      <div data-app="1" className={'doc-route ' + (legal ? 'legal-route' : 'about-route')} style={sx('min-height:100vh;display:flex;flex-direction:column;background:var(--surface)')}>
        <SkipLink />
        <div aria-live="polite" role="status" style={liveRegionStyle}>{vals.announce}</div>
        <React.Suspense fallback={null}>{legal ? <LegalPage vals={vals} /> : <AboutPage vals={vals} />}</React.Suspense>
        <SiteFooter route={vals.route} onNavigate={vals.navigate} />
        <Analytics />
        <SpeedInsights />
      </div>
    );
  }
  /* A shared link on a phone renders ONLY the read-only palette, and the example list one level
     above it on the same terms. Returning early rather than layering these over the tool keeps the
     desktop app out of the DOM entirely on a viewport that cannot use it: nothing behind to tab
     into, no archive laid out off-screen.

     THE LANDING IS THE EXCEPTION, and it is deliberate. It used to go with the tool, and the
     formation went with it — killed on the way in, rebuilt from scratch on the way back, with a
     stretch of empty gate while the field re-baked its ramp and re-uploaded its noise. The field is
     the brand; it does not blink out because somebody looked at a palette. So the stage stays mounted
     and these surfaces cover it, inert and aria-hidden, which buys the same "nothing under here is
     reachable" the early return was protecting. Its motion is parked while it is covered — see the
     landing lifecycle in PaletteApp's componentDidUpdate — so nothing renders behind an opaque
     panel; it simply resumes from the angle it was left at. */
  if (vals.showMobileList) {
    return (
      /* dvh on the two phone wrappers, where 100vh is a document TALLER than the screen: the surface
         over it is fixed and holds all the content, so the only thing that height ever produced was
         a strip of empty page to rubber-band into below the fold. */
      <div data-app="1" style={sx('min-height:100dvh;display:flex;flex-direction:column;background:var(--surface)')}>
        <SkipLink />
        <div aria-live="polite" role="status" style={liveRegionStyle}>{vals.announce}</div>
        {vals.showLanding && <LandingStage vals={vals} covered />}
        {/* A BUTTON HERE, not the decorative mark. On the gate the mark is an image — there is
            nowhere for it to lead — but on the two surfaces above the gate it is the way home, the
            same job it does in the tool. It is also why the foot below carries no `Back to Start`:
            one gesture, in the one place it sits on every screen. */}
        {/* Invisible on this surface and rendered for the index alone — see MarkScrim. */}
        <MarkScrim />
        <HBtn type="button" data-logo="1" data-focus="chrome" onClick={vals.returnToGate} aria-label="Atmos Gallery, return to the start screen" title="Return to the start screen" style={{ ...logoStyle, border: 0, padding: 0, cursor: 'pointer' }} styleHover={{ opacity: 0.82 }} />
        <MobileExampleList ml={vals.mobileList} />
        <Analytics />
        <SpeedInsights />
      </div>
    );
  }
  /* THE STORY, and it is the one phone branch that does NOT cover the landing.

     The example list and the share view pass `covered`, which sets inert + aria-hidden and — through
     _landingLit() — parks the orbit ticker, because those two surfaces are opaque and nothing behind
     them can be seen. The story's first chapter is transparent BY DESIGN: the colour field showing
     through it is the prologue's visual, so the stage has to stay lit, readable and ticking. Passing
     `covered` here would leave chapter 1 as an empty screen over a frozen field.

     LandingStage still sits at index 1, exactly as it does in every other branch. That position is
     load-bearing — React reconciles unkeyed children by index, and only the same DOM keeps the canvas
     initOrbit appended to it imperatively. */
  if (vals.showMobileStory) {
    return (
      <div data-app="1" style={sx('min-height:100dvh;display:flex;flex-direction:column;background:var(--surface)')}>
        <SkipLink />
        <div aria-live="polite" role="status" style={liveRegionStyle}>{vals.announce}</div>
        {vals.showLanding && <LandingStage vals={vals} quiet />}
        {/* Decorative here, as it is on the gate: the story IS the start screen, so there is nowhere
            for the mark to lead. It becomes a button on the two surfaces above this one. */}
        {/* NO MarkScrim HERE, and the reason is the surface underneath. This hero is a hole onto
            the colour field, which is a soft wash rather than a photograph — the backdrop difference
            was designed for and handles on the gate already. A --surface band over it would veil the
            top of the brand's arrival to solve a legibility problem this surface does not have. By
            the time a photograph DOES pass under the mark, heroExit has scrubbed the mark to zero.
            (It was briefly rendered here to keep the mark at one child index across the three phone
            branches. That argument was wrong: this branch draws the mark as a <div role="img"> and
            the two above draw it as a <button>, so React remounts it on the type change whatever
            the index is.) */}
        <div data-logo="1" role="img" aria-label="Atmos Gallery" style={{ ...logoStyle, pointerEvents: 'none' }}></div>
        <MobileStory st={vals.mobileStory} />
        {/* THE ONLY WAY OFF THIS PAGE ON A PHONE. The foot is rendered by the document routes and,
            in the tool, by the upload stage — and the mobile story is neither, so the phone homepage
            was the one surface on the site carrying no link to About, Privacy or Terms. Measured:
            zero of all three, before and after the gate. That is a dead end for a reader and, for
            the two statements specifically, a route that has to exist. MobileStory is itself a
            .doc-route, and site-foot.css is scoped to nothing above .site-foot, so it lands here
            styled exactly as it does on /about. */}
        <SiteFooter route={vals.route} onNavigate={vals.navigate} />
        <Analytics />
        <SpeedInsights />
      </div>
    );
  }
  if (vals.showMobileShare) {
    return (
      <div data-app="1" style={sx('min-height:100dvh;display:flex;flex-direction:column;background:var(--surface)')}>
        <SkipLink />
        <div aria-live="polite" role="status" style={liveRegionStyle}>{vals.announce}</div>
        {vals.showLanding && <LandingStage vals={vals} covered />}
        {/* The same mark the front page draws, in the same place: fixed, 165x26, the drifting
            gradient under a difference blend. Opening an example must not change the brand — but it
            does change what the mark DOES: decorative on the gate, the way home from here. */}
        {/* The surface MarkScrim exists for: a 4:3 photograph bleeds to both edges and scrolls
            straight under a mark that stays put the whole way down. */}
        <MarkScrim />
        <HBtn type="button" data-logo="1" data-focus="chrome" onClick={vals.returnToGate} aria-label="Atmos Gallery, return to the start screen" title="Return to the start screen" style={{ ...logoStyle, border: 0, padding: 0, cursor: 'pointer' }} styleHover={{ opacity: 0.82 }} />
        <MobileShareView ms={vals.mobileShare} />
        {/* mounted on BOTH return paths — a shared link on a phone never reaches the one below */}
        <Analytics />
        <SpeedInsights />
      </div>
    );
  }
  return (
    <div data-app="1" style={sx('min-height:100vh;display:flex;flex-direction:column;background:var(--surface)')}>

      <SkipLink />
        <div aria-live="polite" role="status" style={liveRegionStyle}>{vals.announce}</div>

      {/* One surface, two copies. On a phone the landing IS the small-screen gate — same ring stage,
          same centred block, gate copy instead of the statement + CTA — so there is never a second
          [data-orbit] in the DOM for the engine to find. data-desk-gate marks it for the CSS that
          hides the tool behind it.

          SECOND CHILD ON ALL THREE PATHS, and that position is load-bearing. React reconciles
          unkeyed children by index, so the stage is only the SAME DOM across a return-branch switch
          if it sits at the same index in each branch — and only the same DOM keeps the canvas that
          _buildOrbField appended to it imperatively. Rendered fourth here, as it was, it was
          index-matched against the phone path's logo, torn down, and rebuilt: the exact hole this
          was meant to close, just moved from the state layer into the reconciler. Everything below
          is z-155 or higher (logo, wipe, lightbox, loader), so nothing lost cover by moving up. */}
      {vals.showLanding && <LandingStage vals={vals} />}

      {/* brand mark: fixed at top-centre; the wordmark shape masks a drifting GRAYSCALE gradient,
          composited with mix-blend difference. Landing: decorative; in the tool: a button back to the start. */}
      {vals.showLogoDecor && (
        <div data-logo="1" role="img" aria-label="Atmos Gallery" style={{ ...logoStyle, pointerEvents: 'none' }}></div>
      )}
      {vals.showLogoButton && (
        <HBtn type="button" data-logo="1" data-focus="chrome" onClick={vals.showIntroAgain} aria-label="Atmos Gallery, return to the start screen" title="Return to the start screen"
          style={{ ...logoStyle, border: 0, padding: 0, cursor: 'pointer' }} styleHover={{ opacity: 0.82 }} />
      )}

      {/* click-to-zoom lightbox: fixed overlay the zoomed reference image FLIPs into */}
      <div data-click-zoom-lightbox="1" style={sx('z-index:170;cursor:zoom-out;background-color:#000000e6;justify-content:center;align-items:center;padding:3em;display:none;position:fixed;inset:0')}></div>

      {/* Logo reveal loader: first-ever visit only, before the Get Started landing. */}
      {vals.showLoader && (
        <div data-load-wrap="1" aria-hidden="true" style={sx('position:fixed;inset:0;z-index:190;color:#ffffff')}>
          <div data-load-bg="1" style={sx('position:absolute;inset:0;background:var(--ground)')}></div>
          <div data-load-container="1" style={sx('position:relative;z-index:2;display:flex;flex-direction:column;justify-content:center;align-items:center;width:100%;height:100%;padding:0 var(--page-gutter);box-sizing:border-box')}>
            <div style={{ width: '100%' }}>
              <div style={sx('display:flex;align-items:center;justify-content:space-between;gap:24px;width:100%')}>
                {/* 206px is not arbitrary: the img below fills the box with no object-fit, so the box
                    must carry the wordmark's own ratio or the letterforms render condensed.
                    atmos-gallery-wordmark-white.svg is 878×166, so 39 × (878/166) = 206. */}
                <div data-load-logobox="1" style={sx('position:relative;width:206px;height:39px;flex:none;overflow:hidden')}>
                  <div data-load-logo="1" style={sx('position:absolute;inset:0;transform:translateY(110%);will-change:transform')}>
                    <img src="/assets/atmos-gallery-wordmark-white.svg" alt="Atmos Gallery" style={sx('width:100%;height:100%;display:block')} />
                  </div>
                </div>
                <div style={sx('flex:none;overflow:hidden')} data-load-numbox="1">
                  <div data-load-num="1" style={sx("font-family:'Neue Montreal';font-weight:500;font-size:clamp(28px,4.4vw,40px);line-height:1;letter-spacing:var(--track-statement);color:#ffffff;font-variant-numeric:tabular-nums;transform:translateY(110%);will-change:transform")}>0</div>
                </div>
              </div>
              <div style={sx('margin-top:24px;width:100%;height:3px;overflow:hidden')}>
                <div data-load-progress="1" style={sx('width:100%;height:100%;background:#ffffff;transform-origin:0% center;transform:scale3d(0,1,1)')}></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* THE BAR IS GLASS NOW. Same 64px, same two clusters in the same corners — the only thing
          that changed is what fills it. Two declarations left this string, both because the glass
          replaces them rather than because they were wrong:

          `background:var(--surface)` was an opaque plate, and a backdrop-filter under an opaque
          plate blurs nothing. GlassEffect's __fill layer is the tint now.

          `border-bottom:1px solid var(--line-strong)` was the boundary, and the pane already draws
          one — a hairline plus the glass's own bottom shade stacked two edges on top of each other
          at the one place the bar meets the page, which is the heaviest line on the screen for a
          surface that is supposed to be barely there. The fill is what separates the bar from what
          scrolls beneath it. Removing it also hands the pane the last pixel: inset:0 resolves
          against the padding box, so the glass now fills all 64px rather than stopping at 63. */}
      <header className="glass-bar" style={sx('display:flex;align-items:center;justify-content:space-between;height:64px;padding:0 var(--page-gutter);position:sticky;top:0;z-index:10')}>
        <GlassEffect />
        {/* LEFT — the one display preference. A running clock used to hold this corner: it reported
            nothing about the palette, the archive or the work, yet it was the first thing every
            left-to-right scan landed on. The theme switch takes the corner instead — it is the
            control that changes how everything else on the page is READ. It is outlined, not
            filled, so it holds the edge without competing with the mark. */}
        <ThemeSwitch vals={vals} />
        {/* RIGHT — the acts. New generation drives the core loop, so it stays filled and leads the
            cluster in the DOM (and therefore in the tab order); the backup pair follows behind a
            hairline, outlined rather than filled, so the two never read as peers.

            Backing up and restoring moved UP here from the archive heading line. Both act on the
            library as a whole rather than on the list they used to sit beside, and down there they
            were read as one more list control — a filter or a scope. In the bar they get their own
            space, next to the other things that act rather than describe, and the Library heading
            keeps only what belongs to the list.

            They used to read Save file and Open file. Those name a file dialog, not a consequence:
            the thing at stake is a library that exists in exactly one browser, and "save" already
            means four other things in this app (a palette is saved the instant it is generated, a
            share link saves nothing, Export writes tokens). Back up and Restore name the act by
            what it protects. Export was the other candidate and lost on the same ground — the
            palette screen already spends that word on token export.

            Show intro again used to be the third item in this menu. It was never a file action, and
            under a button called Back up it would read as one; it is also the brand mark's job, and
            the mark carries the same aria-label and calls the same returnToIntro() on every screen
            this menu appears on. One act, one door. */}
        <div style={sx('display:flex;align-items:center;gap:14px')}>
          {vals.canReset && (<>
            {/* "New generation" named the machinery. What the button makes is a palette, and the
                rest of the app has spent five rounds learning to say so: the Library holds palettes,
                and Add to project files one. */}
            <B006 data-emphasis="primary" onClick={vals.reset} label={<span style={sx('display:flex;align-items:center;height:14px')}>New palette</span>} />
            {vals.showProjectsBar && (<span aria-hidden="true" style={sx('width:1px;height:22px;flex:none;background:var(--line-strong)')}></span>)}
          </>)}
          {vals.showProjectsBar && (
            <div style={sx('display:flex;align-items:center;gap:8px')}>
              {/* ONE ACT, NO MENU. This was a disclosure: a trigger carrying aria-haspopup and a
                  chevron, opening a two-item menu whose items were "Back up this project" and "Back
                  up whole library". Removed by request — a menu is the right shape when a choice has
                  to be made and the wrong one when the common case is the only case anyone reaches.
                  The label now says what the single act does rather than naming a category, which is
                  what let the chevron go.

                  WHAT THIS COSTS, stated rather than buried: per-project backup is no longer
                  reachable from the masthead. The handlers are untouched in renderVals.js —
                  backUpProject, showBackUpProject, toggleBackupMenu, backupMenuOpen and
                  activeScopeLabel are all still there and are now uncalled — so restoring the menu is
                  markup rather than a feature. That file is left alone deliberately; it carries
                  another branch's work at the moment. */}
              <button type="button" data-ix="press" data-focus="chrome" data-tier3-action="" onClick={vals.backUpLibrary} aria-label="Back up your whole library to a file" style={vals.tier3BtnStyle}><TextSwap>Back up</TextSwap></button>
              <button type="button" data-ix="press" data-focus="chrome" onClick={vals.onRestore} aria-label="Restore palettes from a backup file" data-tier3-action="" style={vals.tier3BtnStyle}><TextSwap>Restore</TextSwap></button>
              <input ref={vals.projectFileRef} type="file" accept="application/json,.json" onChange={vals.onProjectFileChange} tabIndex={-1} aria-hidden="true" style={{ display: 'none' }} />
            </div>
          )}
        </div>
      </header>

      <main id="main" aria-busy={vals.busy} style={sx('width: 100%; flex: 1; min-height: 500px; display: flex; flex-direction: column; justify-content: center; padding: 24px var(--page-gutter) 8px')}>

        {vals.isUpload && (<>
          <button type="button" data-focus="chrome" onClick={vals.onBrowse} onMouseEnter={vals.dropEnter} onMouseLeave={vals.dropLeave} onDrop={vals.onDrop} onDragOver={vals.onDragOver} onDragLeave={vals.onDragLeave} aria-label="Choose image. Drop an image here, or activate to browse your files." style={vals.dropStyle}>
            <div style={sx('position:relative;width:38px;height:38px')} aria-hidden="true">
              <div style={sx('position:absolute;left:0;top:0;width:26px;height:26px;border:1px solid var(--on-surface-muted)')}></div>
              <div style={sx('position:absolute;right:0;bottom:0;width:26px;height:26px;border:1px solid var(--on-surface);background:var(--surface)')}></div>
            </div>
            {/* Masked line reveal, same as the landing statement — this copy is what ARRIVES when
                the loader's fold lifts off the tool. Each line is a pre-authored span inside its own
                overflow:hidden mask; the spacing lives on the MASK, never on the span, or the
                translate would drag the margin with it and the gap would breathe mid-tween. */}
            <div style={{ textAlign: 'center' }}>
              <div style={sx('overflow:hidden')}><div data-drop-line="1" style={sx("font-family:'Neue Montreal';font-weight:500;font-size:var(--fs-title);color:var(--on-surface);letter-spacing:-.01em")}>Start here</div></div>
              {/* The lead breaks after "atmosphere" — and the break is a SECOND MASK, not a <br>.
                  One mask holding two lines is a slab: both halves ride up together while the title
                  and the CTA each arrive on their own, which is the one gesture maskLines.js was
                  written to stop. Two masks, and the second half arrives on the same stagger as
                  everything else. No margin on the second one — the halves are a single sentence, so
                  line-height alone sets the distance, exactly as a <br> would have. */}
              <div style={sx('overflow:hidden;margin-top:8px')}><div data-drop-line="1" style={sx("font-family:'Neue Montreal';font-size:var(--fs-lead);color:var(--on-surface-muted)")}>Choose an image that captures the atmosphere</div></div>
              <div style={sx('overflow:hidden')}><div data-drop-line="1" style={sx("font-family:'Neue Montreal';font-size:var(--fs-lead);color:var(--on-surface-muted)")}>you want your colour system to carry.</div></div>
            </div>
            {/* THE CALL IS A DISC NOW, drawn from the Figma node (10384:7592): 24px of --on-surface
                with the plus in --surface, which is the app's filled-CTA pair and the same fill the
                masthead's New palette and the stage's Add to Project take. What it replaces was an
                underlined line of text — the one control in the app dressed as a hyperlink, on the
                screen that has no links, in a system where every other act is a bordered or filled
                shape. It read as prose you could click rather than as the thing to press.

                IT IS A SPAN, NOT A BUTTON, and that is structural rather than stylistic: the whole
                dropzone is already one <button> (it takes the drop as well as the click), so a
                nested button here would be invalid and would give the same act two targets. The
                mark is what you aim at; the surface around it does the same thing.

                THE WORDS MOVED TO THE ACCESSIBLE NAME. The zone's aria-label already carried the
                full sentence — "Choose image. Drop an image here, or activate to browse your
                files." — and title now hands "Choose Image" to a pointer. The instruction itself is
                two lines up in copy that arrives on the same reveal, so nothing about what to do is
                only in the glyph.

                TWO MASKS, AND THEY ARE DIFFERENT MASKS. It keeps data-drop-line, so on arrival it
                rides the same yPercent reveal as the three lines above it rather than being the one
                element already there when they land (loader.js queries that attribute; the disc is
                the fourth thing it finds). And it now carries TextSwap as well, so under the
                pointer the mark lifts out and its twin rises into place — the same masked swap the
                app's buttons answer a hover with, on the same tokens. The zone is the button, so
                hovering anywhere in it runs the swap: the glyph is what reports the hover for a
                surface too large to tint. */}
            <span style={sx('display:block;overflow:hidden')}><span data-drop-line="1" title="Choose Image" style={sx('display:flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:var(--radius-pill);background:var(--on-surface);color:var(--surface)')}><TextSwap><IconPlus size={20} /></TextSwap></span></span>
            <input ref={vals.fileRef} type="file" accept="image/*" onChange={vals.onFile} tabIndex={-1} aria-hidden="true" style={{ display: 'none' }} />
          </button>
          {/* The interpretation note that used to sit here — "a small downscaled thumbnail is sent to
              the model … it isn't stored" — was removed by request, as the "everything stays in your
              browser" line above it had been earlier. The disclosure itself is unchanged: it stands in
              the README and in full on /privacy, which the footer links from this same screen. */}
        </>)}

        {vals.isProcessing && (
          <div style={sx('display:flex;flex-direction:column;align-items:center;gap:30px;padding:14px 0 6px')}>
            <div style={sx('position:relative;width:380px;height:250px;background:var(--surface);overflow:hidden')}>
              <canvas ref={vals.canvasRef} aria-hidden="true" style={sx('display:block;width:380px;height:250px')}></canvas>
              <div style={sx('position:absolute;inset:0;box-shadow:inset 0 0 0 1px var(--line-strong);pointer-events:none')}></div>
            </div>
            <div style={sx('width:380px;display:flex;flex-direction:column;gap:12px')}>
              <div style={sx('display:flex;justify-content:space-between;align-items:center')}>
                <span style={sx('display: inline-flex; align-items: center; gap: 9px; font-family: Neue Montreal; font-size:var(--fs-micro); letter-spacing:var(--track-flat); color: var(--on-surface); text-transform: uppercase')}>
                  <span style={sx('width:7px;height:7px;background:var(--on-surface);animation:blink 1.5s ease infinite')} aria-hidden="true"></span>{vals.procStatus}</span>
                <span style={sx('font-family: Neue Montreal; font-size:var(--fs-micro); color: var(--on-surface-muted)')}>OKLCH</span>
              </div>
              <div style={sx('height:2px;width:100%;background:var(--line);position:relative')}>
                {/* Full width, drawn by scaleX from the left edge — the loader's bar primitive, not a
                    width animation. See pipeline.js startCanvas for why this one had to change. */}
                <div ref={vals.progRef} style={sx('position:absolute;left:0;top:0;height:2px;width:100%;background:var(--on-surface);transform:scaleX(0);transform-origin:0% 50%')}></div>
              </div>
            </div>
          </div>
        )}

        {vals.isResult && (
          <div ref={vals.resultRef} style={sx('display:flex;flex-direction:column')}>
            {/* Shared-link view: someone else's palette, held in the URL and NOT in this archive.
                Saving is the visitor's choice, so the strip says what is (not) happening and offers
                both exits — keep it, or go make one. */}
            {vals.isSharedView && (
              <div style={sx('display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;padding:12px 14px;margin:0 0 18px;border:1px solid var(--line-strong);background:var(--surface-raised)')}>
                <span style={sx("font-family:'Neue Montreal';font-size:var(--fs-detail);line-height:1.5;color:var(--on-surface-muted);text-wrap:pretty")}>A palette someone shared with you. It isn’t saved in this browser unless you save it.</span>
                <span style={sx('display:flex;align-items:center;gap:10px;flex:none')}>
                  <B006 onClick={vals.onSaveShared} aria-label="Save this shared palette to your archive" label="Save to archive" />
                  <B006 onClick={vals.onMakeOwn} aria-label="Start a new palette from your own image" label="Make your own" />
                </span>
              </div>
            )}
            <div role="group" aria-label="Generated palette swatches" style={sx('display:flex;height:340px;width:100%;gap:0')}>
              {vals.result.bands.map((b, bi) => (
                <div key={b.sid} data-band="1" data-sid={b.sid} role="group" aria-label={b.groupAria} onMouseEnter={vals.dimEnter} onMouseLeave={vals.dimLeave} style={b.style}>
                  <span data-ring="1" aria-hidden="true" style={b.bandRingStyle}></span>
                  <span data-fx="1" style={b.weightStyle}>{b.weightPct}</span>
                  <button type="button" data-ix="icon" data-info="1" data-focus="value" aria-haspopup="dialog" aria-label={b.harmonyAria} onClick={b.onHarmony} style={b.infoBtnStyle}>
                    <IconHarmony />
                  </button>
                  <div style={b.valuesWrap}>
                    {b.values.map((v) => (<ValueRow key={v.key} v={v} showCaveat={false} />))}
                  </div>
                </div>
              ))}
            </div>
            {/* Action row, ordered by what the user came to do. DOM order IS the visual order IS
                the tab order, so a keyboard traveller meets the actions in the same sequence the
                eye does. The hairline divides by CONSEQUENCE: ahead of it the act that leaves
                something behind, behind it the four that only read this palette back to you. It is
                the same row, in the same order, as the fullscreen detail's footer — one grammar,
                two surfaces. (Share is here and not there: only this view holds a shareable URL.)

                Every control except Export is now the same outlined tier, at the same weight and
                the same ink. The copy actions used to be a lighter third tier; it failed its own
                hover state on contrast, so it is gone — see the emphasis block in global.css. What
                the weight difference used to say, position and the hairline now say instead.

                One 8px rhythm across the whole row, matching the archive header's bar. */}
            <div style={sx('display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:18px 0 0')}>
              {/* TIER 1 — filing, which is the same answer the fullscreen detail's footer already
                  gives: first in the sequence and available, organise then validate then output.
                  It held the second tier here only because one creative act stood ahead of it, and
                  that act is not in the row at the moment. Still exactly ONE filled control, per
                  the two-tier rule.

                  filing changes the archive, so it stays on the committing side of the hairline.
                  Disabled while the palette is only in the URL — a shared palette has no record to
                  file until it is saved, and the strip above already offers that. */}
              <B006 data-emphasis="primary" onClick={vals.openAssignCurrent} disabled={vals.assignDisabled} aria-haspopup="dialog" aria-label={vals.assignCurAria} label={assignB006Label(vals.assignLabel)} />
              {/* The read-only group, held behind a hairline so the break reads as grouping rather
                  than as a gap that a wrap could invent; keeping them together also means they
                  wrap as a cluster, never one at a time. Contrast leads: inspect before you copy. */}
              {/* nowrap INSIDE the group. The row may wrap — it has to, between the desktop gate at
                  720px and the width this bar was drawn for — but the validate/output trio wraps as
                  one block or not at all. Letting it break internally put Export on a line of its
                  own under a hairline that stayed behind with Copy, which reads as two groups where
                  there is one. Core acts stay put; the output cluster is what moves. */}
              <div style={sx('display:flex;align-items:center;gap:8px;flex-wrap:nowrap;padding-inline-start:8px;border-inline-start:1px solid var(--line-strong)')}>
                <B006 data-emphasis="secondary" btnRef={vals.contrastBtnRef} onClick={vals.openContrast} disabled={vals.contrastDisabled} aria-haspopup="dialog" aria-label="Open contrast checker for this palette" label={contrastB006Label} />
                <CopyControl open={vals.copyMenuOpen} owns={!vals.hasOverlay} done={vals.copyDone} name={vals.result.name} onToggle={vals.toggleCopyMenu} onKey={vals.copyMenuKey} onHex={vals.copyHexList} onCss={vals.copyCss} itemStyle={vals.copyItemStyle} />
                <B006 data-emphasis="secondary" onClick={vals.openExport} aria-haspopup="dialog" aria-label="Export this palette as design tokens" label={exportB006Label} />
              </div>
              {/* SHARE is neither editing nor output formatting, and it is the only act here that
                  reaches outside this browser. A flexible gap, not another hairline: the distance
                  is the statement. When the row wraps it lands alone at the right of its own line,
                  which keeps the reading intact instead of dropping it into the middle of a group.
                  (It was moved into the group above for one revision and moved back: the placement
                  was never the thing that looked wrong — see the label's own note for what was.) */}
              <span style={sx('margin-inline-start:auto;display:inline-flex')}>
                <B006 data-emphasis="secondary" onClick={vals.onShare} aria-label="Copy a shareable link to this palette" label={shareB006Label(vals.shareCopied)} />
              </span>
            </div>
            <div style={sx('display:flex;justify-content:space-between;align-items:flex-start;gap:16px;padding:26px 0 0')}>
              <div style={sx('flex:1;min-width:0')}>
                <div data-fx="1" data-split="1" style={sx("font-family:'Neue Montreal';font-weight:500;font-size:var(--fs-display);line-height:1.05;letter-spacing:-.015em;color:var(--on-surface);text-wrap:balance")}>{vals.result.name}</div>
                {/* Two traits, then More. Four capitalised pills read as a legend rather than a
                    description, and the remaining ones are one click away with the reading.

                    Open, the control is a close mark and nothing else. "Less" was the honest
                    opposite of "More · 1" and it still read as a third trait: a word in a pill, in a
                    row of words in pills, that you had to parse before you could tell it was the way
                    out. A ✕ is the one shape in that row nobody reads as content. The word it
                    replaces survives in the aria-label, which is where it was doing real work. */}
                {/* Uppercase, at --fs-label, on one 26px row, and ALL of them — a disclosure over
                    this many chips costs more than it hides (see renderVals). The row is gated on
                    having any: the taxonomy prune leaves several palettes with no traits at all
                    (three of the eight seeds), and an empty flex row still spends its 18px margin.
                    STADIUMS, LIKE EVERYTHING ELSE ON THIS STAGE. They kept a square corner from the
                    days when the tool's chrome was square, and stood as three hard-edged boxes
                    directly under a row of pill actions — the last thing on the surface still
                    speaking the old shape. --radius-pill, written here beside the border it rounds
                    rather than as a rule elsewhere: this chip declares its whole appearance inline,
                    and splitting one property out into the stylesheet is how a corner and its edge
                    end up maintained in two places. */}
                {vals.result.hasTraits && (
                <div data-fx="1" style={sx('display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin-top:18px')}>
                  {vals.result.traits.map((d, di) => (
                    <span key={di} style={sx('display:inline-flex;align-items:center;min-height:26px;font-family: Neue Montreal; font-size:var(--fs-label); letter-spacing:var(--track-flat); padding: 0 8px; border-width: 1px; border-style: solid; border-color: color-mix(in srgb, var(--on-surface) 15%, transparent); background: color-mix(in srgb, var(--on-surface) 9%, var(--surface)); color: var(--on-surface); text-transform: uppercase; border-radius: var(--radius-pill)')}>{d}</span>
                  ))}
                </div>
                )}
                {/* THE READING, STANDING. It sat behind the More disclosure so it would not come
                    between the palette and the decision — but that disclosure is gone (it was
                    hiding one or two chips, see renderVals), and this is one muted 13px line. It
                    arrives with the result view's own reveal rather than on a press of its own. */}
                <p data-reading-line="1" style={sx("font-family:'Neue Montreal';font-size:var(--fs-body);line-height:1.5;color:var(--on-surface-muted);margin:14px 0 0;max-width:52ch;text-wrap:pretty")}>{vals.result.rationale}</p>
              </div>
              {/* WHAT IT IS FOR, holding the slot the reading used to. A recommendation composed
                  from the same analysis the reading is, so the two can never disagree.

                  A "Strongest pair" readout sat here for one commit and came straight back out. It
                  was a third thing competing for the same eye-line with no hierarchy between them,
                  and pairwise contrast already has a surface built for exactly this question — the
                  Contrast drawer, one button away, with all C(n,2) pairs and an AA/AAA lens. One
                  affordance per act; a number floated next to a recommendation is not an act. */}
              <div style={sx('width:360px;flex:none;display:flex;flex-direction:column;align-items:flex-end')}>
                <p data-fx="1" data-split="1" style={sx("font-family:'Neue Montreal';font-size:var(--fs-lead);line-height:1.5;color:var(--on-surface);text-align:end;margin:0;text-wrap:pretty")}>{vals.result.useLine}</p>
              </div>
            </div>
            {/* The palette's metadata readout — the detail pane's bottom line, restored from the
                old inline row expansion. A hairline seals it off from the name/rationale block
                above so it reads as the pane's data footer rather than a third free-floating
                horizontal band. Inside, three GROUPS (Colour / Accessibility / Reading), each a
                heading over an aligned label:value column — definition lists, because that is
                literally what the content is, and a screen reader then pairs each term with its
                value for free. Groups are the wrap unit: min-width per group, so a narrow window
                stacks whole groups instead of shuffling seven pairs mid-line. data-fx joins the
                pane's existing staggered reveal — no motion of its own. */}
            {/* Every tier speaks --track-flat — the design's single flat-tracking source, the same
                voice the action row's labels use. Hierarchy: weight 500→400, size 9→8→13, ink
                full→muted→full, case. Structure: ruled rows and heading underlines only — no left
                column rules; the columns hold their own line through alignment and the gap.
                The rules are ELEMENTS, not borders, because they perform: each [data-meta-line]
                draws left→right (the loader bar's scaleX draw) and each [data-meta-split] text
                rises through the same masked line reveal the name and rationale use — staggered
                down the block from one delay in animateText, so the readout assembles as a
                sequence rather than appearing at once. Statically (no GSAP, reduced motion) they
                are plain visible hairlines and plain visible text. */}
            <div data-meta="1" role="group" aria-label="Palette metrics" style={sx('display:flex;flex-wrap:wrap;align-items:flex-start;gap:22px 44px;margin-top:18px')}>
              <span data-meta-line="1" aria-hidden="true" style={sx('display:block;flex:none;width:100%;height:1px;background:var(--line)')}></span>
              {vals.result.detailMeta.map((g, gi) => (
                <div key={gi} style={sx('flex:1;min-width:200px;max-width:280px;display:flex;flex-direction:column')}>
                  <span data-meta-split="1" style={sx("font-family:'Neue Montreal';font-weight:500;font-size:var(--fs-micro);letter-spacing:var(--track-flat);text-transform:uppercase;color:var(--on-surface);padding-bottom:9px")}>{g.title}</span>
                  <span data-meta-line="1" aria-hidden="true" style={sx('display:block;height:1px;background:var(--line)')}></span>
                  <dl style={sx('display:flex;flex-direction:column;margin:0')}>
                    {g.rows.map((m, mi) => (
                      <div key={mi}>
                        {/* The <dd> is a wrapper and the TEXT is its own span, because AA pairs
                            carries a verdict badge beside its number and _maskLineReveal rebuilds
                            whatever it splits out of textContent — an SVG inside a [data-meta-split]
                            would not survive the reveal. Splitting the text into its own span keeps
                            the split target pure text on every row (so the stagger count and the
                            sequence are unchanged) and gives the badge somewhere to stand.
                            align-items:baseline on the wrapper, so the badge's own word sits on the
                            same line as the value it qualifies rather than floating beside it. */}
                        <div style={sx('display:flex;align-items:baseline;justify-content:space-between;gap:16px;padding:8px 0')}>
                          <dt data-meta-split="1" style={sx('font-family:Neue Montreal;font-size:var(--fs-nano);letter-spacing:var(--track-flat);text-transform:uppercase;color:var(--on-surface-muted);white-space:nowrap')}>{m.label}</dt>
                          <dd style={sx('display:flex;align-items:baseline;gap:8px;margin:0;min-width:0')}>
                            {m.aa && <AaBadge aa={m.aa} />}
                            <span data-meta-split="1" style={sx('font-family:Neue Montreal;font-size:var(--fs-body);letter-spacing:var(--track-flat);color:var(--on-surface);white-space:nowrap;text-transform:capitalize;font-variant-numeric:tabular-nums')}>{m.value}</span>
                          </dd>
                        </div>
                        <span data-meta-line="1" aria-hidden="true" style={sx('display:block;height:1px;background:var(--line)')}></span>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
              {/* the reference image, moved down from the rationale column into this row: it is
                  provenance — the palette's source datum — so it belongs with the data. Pushed to
                  the row's right edge (the same right margin the rationale keeps above), sized
                  156×104 so it sits level with the columns beside it. data-fx keeps the y-fade it
                  had in its old home; click-to-zoom unchanged. */}
              <div data-fx="1" style={sx('flex:none;margin-inline-start:auto')}>
                {vals.result.hasRef && vals.result.refImageNode}
                {vals.result.noRef && (
                  <div aria-hidden="true" style={sx('width: 156px; height: 104px; border: 1px solid var(--line); background: var(--surface-raised); display: flex; align-items: center; justify-content: center')}>
                    <span style={sx('font-family:Neue Montreal;font-size:var(--fs-nano);letter-spacing:.08em;text-transform:uppercase;color:var(--on-surface-muted)')}>No reference</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {vals.isError && (
          <div role="alert" style={sx('display:flex;flex-direction:column;align-items:center;justify-content:center;gap:22px;width:100%;min-height:420px;padding:40px;background:var(--surface-raised);border:1px solid var(--line-strong)')}>
            <div aria-hidden="true" style={sx('width:42px;height:42px;display:flex;align-items:center;justify-content:center;border:1px solid var(--on-surface);font-family:Neue Montreal;font-size:var(--fs-subtitle);line-height:1;color:var(--on-surface)')}>!</div>
            <div style={sx('text-align:center;max-width:440px')}>
              <div style={sx("font-family:'Neue Montreal';font-weight:500;font-size:var(--fs-title);color:var(--on-surface);letter-spacing:-.01em")}>{vals.errorTitle}</div>
              <div style={sx("font-family:'Neue Montreal';font-size:var(--fs-lead);color:var(--on-surface-muted);margin-top:8px;text-wrap:pretty")}>{vals.errorMsg}</div>
            </div>
            <button type="button" data-ix="cta" data-focus="chrome" onClick={vals.onBrowse} style={sx('background:var(--on-surface);border:1px solid var(--on-surface);padding:var(--btn-pad-lg);font-family:Neue Montreal;font-size:var(--fs-label);letter-spacing:var(--track-flat);color:var(--surface);cursor:pointer')}><TextSwap>Choose another image</TextSwap></button>
            <input ref={vals.fileRef} type="file" accept="image/*" onChange={vals.onFile} tabIndex={-1} aria-hidden="true" style={{ display: 'none' }} />
          </div>
        )}
      </main>

      <FeedSection vals={vals} />

      {/* Only on 'Drop a reference'. That screen is the tool at rest — nothing has been dropped, the
          reel below is empty or idle, and the page has somewhere to put a footer. The result and
          processing stages are a working surface with drawers and overlays over them, where a
          full-bleed wordmark would be arriving underneath somebody's palette. The landing is exempt
          for a different reason: it is position:fixed over this whole frame, so it covers the footer
          rather than needing to be told about it. The legal routes carry it unconditionally — see
          their branch at the top of this file.

          Below 720px the desktop gate hides every child of [data-app] except the gate itself, and this
          is a child of [data-app], so it goes with them — which is correct: that screen is not the
          tool, it is the notice standing in for it. */}
      {vals.isUpload && <SiteFooter route={vals.route} onNavigate={vals.navigate} />}
      <ContrastDrawer vals={vals} />
      <DetailOverlay vals={vals} />
      <HarmonyDrawer vals={vals} />
      <LibraryDrawer vals={vals} />
      <ExportDialog vals={vals} />
      <RecogniseDialog vals={vals} />
      <AssignDialog vals={vals} />
      <RestoreDialog vals={vals} />

      {/* 158, ABOVE THE PANEL THAT RAISES IT. At 130 the toast sat under the library panel (156)
          and under a project export stacked on it (157), so deleting a project from the Projects tab
          put the confirmation, and the only route back from it, behind the surface you were standing
          on. A status you cannot see is not a status, and an Undo you cannot reach is a deletion
          without one. Still below the wipe (160), the lightbox (170) and the loader (190): those are
          whole-screen states, and a bar reporting one act does not outrank them. */}
      {vals.hasToast && (
        <div style={sx('position:fixed;left:0;right:0;bottom:28px;z-index:158;display:flex;justify-content:center;pointer-events:none')}>
          {/* A STADIUM, LIKE EVERY OTHER FLOATING SURFACE THE TOOL PUTS OVER THE STAGE. It was the
              last square bar left: it arrives over a result view whose actions, traits and badges
              are all pills, and a hard-cornered plate reads as a different system rather than as
              the same one speaking. The corner clamps to half the bar's height, so it stays a
              stadium whatever the message length does to its width.
              8px ALL ROUND, 16 ON THE LEADING EDGE. The trailing side is 8 because what sits there
              is a bordered control that carries its own inset; the leading side holds bare text
              against the widest point of a 24px arc, and 8px of it read as the sentence crowding
              the curve. padding-inline-start, not padding-left: the asymmetry is about the reading
              edge, so it should follow the reading direction rather than the screen's. */}
          <div data-toast="1" role="status" aria-live="polite" style={sx('display:flex;align-items:center;gap:16px;background:var(--surface-raised);color:var(--on-surface);border:1px solid var(--line-strong);border-radius:var(--radius-pill);padding:8px;padding-inline-start:16px;box-shadow:0 14px 36px rgba(0,0,0,.24);pointer-events:auto')}>
            {/* No capitalize transform: it Title-Cased whole sentences ("Dry Season Deleted"). The
                label arrives as a natural sentence — the palette's own name keeps its case, the
                verb stays lowercase — and a status line is prose, not a button. */}
            <span style={sx("font-family: 'Neue Montreal'; font-size:var(--fs-body); letter-spacing:var(--track-flat); white-space: nowrap")}>{vals.toastLabel}</span>
            {/* THREE ONE-OFFS, ALL REPLACED BY THE TOKEN THAT ALREADY MEANT THEM. The tracking was
                a literal .12em — the last uppercase label in the app not set from --track-flat,
                which is 0 — so this one control was spaced differently from every other label
                beside it. The padding was 7px 13px, one pixel off --btn-pad-sm (7px 12px), which is
                the definition of a decision nobody could repeat. And the corner is the pill the
                rest of this bar now takes.
                THE CAPS COME FROM [data-ix] AND NOTHING ELSE. A sentence-case exception for this
                bar was tried and reverted: the drawer earns one because it is a sheet you read, and
                a toast is a line of prose with an act at the end of it — the act is chrome and
                speaks like chrome. Nothing here declares a transform, which is the point: the
                attribute that says "this is a control" is what says how a control speaks.

                AND THEN THE WORD WENT TOO. It was the app's one bordered control with a JS hover
                of its own — an HBtn whose styleHover inverted the whole button to a filled black
                plate — which is a louder event than any other act gets, on the one control that
                appears unannounced over whatever you were reading. It briefly took the masked text
                swap instead, and now it takes no text at all: an arrow turning back on itself,
                drawn at the same 30px circle as the dismiss beside it, so the pair reads as two
                answers to one sentence rather than as a label and a glyph.
                A GLYPH HAS TO CARRY ITS NAME. aria-label states the act and title hands the word to
                a pointer, which is the same bargain the row actions and the library trigger take.
                The two names are written as a pair — "Undo the deletion" against "Dismiss, keep the
                deletion" — so a reader hears the choice, not two unrelated verbs. */}
            {/* TWO CONTROLS, ONE GROUP, AND THE GAPS SAY SO. The bar used to space everything at
                16px, which put the same distance between the message and its way out as between the
                two acts — three items in a row rather than a sentence and the pair that answers it.
                8px inside the group against 16 to the message: the ratio the rest of the app uses
                to mean "these belong together, that is something else". */}
            <div style={sx('display:flex;align-items:center;gap:8px;flex:none')}>
              <button type="button" data-undo-btn="1" data-ix="press" data-focus="chrome" onClick={vals.undoDelete} aria-label="Undo the deletion" title="Undo"
                style={sx('width:30px;height:30px;flex:none;display:inline-flex;align-items:center;justify-content:center;background:none;border:1px solid var(--action-line);border-radius:var(--radius-pill);padding:0;color:var(--on-surface);cursor:pointer')}><TextSwap><IconUndo /></TextSwap></button>
              {/* The toast no longer times out (it holds an action — see the note in overlays.js),
                  so letting the undo go needs a control of its own. Icon-only, so it carries a name;
                  a 30px square clears the 24px hit floor. */}
              <button type="button" data-ix="press" data-focus="chrome" aria-label="Dismiss, keep the deletion" onClick={vals.onDismissToast} style={sx('width:30px;height:30px;flex:none;display:inline-flex;align-items:center;justify-content:center;background:none;border:1px solid var(--action-line);border-radius:var(--radius-pill);padding:0;color:var(--on-surface);cursor:pointer')}><TextSwap><IconClose /></TextSwap></button>
            </div>
          </div>
        </div>
      )}

      {/* THE LAST SQUARE THING ANCHORED TO THIS CORNER. The toast six lines up is a stadium with
          two 30px circles in it; this sat beside it as a hard-cornered plate, and the two are the
          same object to a reader — a bar that arrives bottom-left and says what just happened.
          One of them reporting in a different shape is the dialect the corner pass exists to end.

          18px OF FLANK, NOT 13, AND THAT IS THE STADIUM'S CHARGE RATHER THAN A LOOK. A pill's
          corner curves away from its own content, so type set at a square box's padding reads as
          crowding an edge that is no longer there. The project rows made this correction first
          (14 → 18, see optStyle) and the toast and the fields each needed it after; 13 → 18 is the
          same figure for the same reason, and it is now the number this family uses.

          NO DISMISS, AND THAT IS THE ONE PLACE IT DEPARTS FROM THE TOAST. The toast carries a way
          out because it stopped timing out — it holds an undo, and an act nobody can decline is a
          trap. This keeps its timer (see overlays.js: "Info-only notices keep their timer"), so a
          control here would be a second way to do what the clock already does, on a surface with
          nothing to lose. Give it one only if it ever stops expiring. */}
      {vals.hasNotice && (
        <div data-notice="1" role="status" style={sx('position:fixed;left:20px;bottom:20px;z-index:128;display:flex;align-items:center;gap:9px;background:var(--surface-raised);border:1px solid var(--line-strong);border-radius:var(--radius-pill);color:var(--on-surface-muted);padding:9px 18px;max-width:340px;box-shadow:0 10px 28px rgba(0,0,0,.16)')}>
          {/* A DOT, NOW THAT IT SITS IN A PILL. It was a 6px square, which the house rule allows —
              square is still the default and this is a mark, not a control sized by a label. It is
              also the only other shape inside a stadium, and a hard corner nested in a round one
              reads as the two being unrelated, which is the argument the radius block makes about
              every other pair of nested boxes here. It carries no meaning to lose: aria-hidden, no
              state, no variants. A bullet is what it always was; this draws it as one. */}
          <span aria-hidden="true" style={sx('width:6px;height:6px;flex:none;border-radius:var(--radius-pill);background:var(--on-surface-muted)')}></span>
          {/* THE SAME TYPE AS THE TOAST'S LABEL, which is the bar this one is a quieter copy of.
              They sit in the same corner, take the same --surface-raised plate, the same
              --line-strong edge, the same pill and the same shadow — and then set their text three
              different ways: --fs-label against the toast's --fs-body, a hand-set .01em against its
              --track-flat, and --on-surface-muted against its --on-surface. Two objects that agree
              about every other property and disagree about the type read as one of them being
              slightly broken rather than as a hierarchy.

              The literal goes with it. --track-flat is 0 and its declaration calls itself the single
              source for flat tracking; .01em beside it was the same drift as the six .06em sites
              still outstanding elsewhere. */}
          <span style={sx('font-family:Neue Montreal;font-size:var(--fs-body);line-height:1.4;letter-spacing:var(--track-flat);color:var(--on-surface);text-wrap:pretty')}>{vals.notice}</span>
        </div>
      )}

      <Analytics />
      <SpeedInsights />
    </div>
  );
}

// ============================== FEED (list / universe / reel) ==============================
function FeedSection({ vals }) {
  // aria-labelledby, not aria-label: the region is named BY its visible heading, so the two can
  // never drift apart the way a hardcoded "Recent generations" already had. No count beside it —
  // the scope chips below carry live ones (ALL 24 / UNFILED 24), and a second number would be one
  // more thing to keep in sync and nothing to read.
  //
  // What DOES sit beside it is a different kind of fact, and the distinction is the whole licence
  // for it being there: not cardinality but PERSISTENCE — where these palettes live, which no
  // other control on this page states and no number can. Anything wanting that slot in future has
  // to clear the same bar: not a number, not an act.
  //
  // And it is 16px of marker, not a sentence. Standing explanatory copy is the thing this interface
  // is trying not to accumulate — every line of it is read once and then permanently in the way —
  // so the fact lives in an affordance and the words arrive only when asked for.

  // FIVE JOBS WERE ON ONE LINE, AND THE LINE COULD NOT SAY WHICH WAS WHICH.
  //
  // Library segment (All / Unfiled / a project), management (Manage), filtering (Filter + the
  // applied chips), the result size, and sorting (AA pairs / Max contrast / Date) all shared one
  // horizontal strip, several of them in the same borders and all of them in the same 10px
  // uppercase. Black fill meant "selected scope" and "selected view" and "applied filter" at once.
  // Nothing on the row declared what was navigation, what was state, what was metadata and what
  // was an act, so the row had to be decoded rather than read.
  //
  // It is now three bands over the table, and PLACEMENT STATES THE RELATIONSHIP. A thing sits with
  // the thing it acts on; nothing is placed to balance a corner:
  //
  //   heading   Library ⓘ                                      [ List | Grid | 3D ]
  //   projects  [ All 8 ][ Unfiled 7 ]  [ ☰ 1 ]
  //   toolbar   [ Text-ready ✕ ][ Clear filters ]
  //   ─────────────────────────────────────────────────────────────────────────────
  //   header    Palette                        AA pairs · Max contrast · Created ↓
  //
  // The right edge used to carry the view toggle, Manage projects and a palette count in a neat
  // vertical stack — three controls sharing an edge and nothing else. Tidy, and wrong: the only
  // thing that belongs against the heading is the switch that redraws the whole section, because
  // that is the only other control scoped to the whole section. The palette count is not printed at
  // all any more: it is not a fact about the library, it is the RESULT of filtering, and the list
  // that visibly shrank already states it. It survives as the section's live region, so the one
  // reader who cannot see the list shrink is still told what it came back with.
  //
  // Where am I → what is being held back → how it is ordered → the list.

  // TWO DOORS BECAME ONE. Manage Projects stood at the end of this band and Filter began the next
  // one: two bordered controls, one row apart, opening two panels onto the same library — and the
  // one question they could not answer between them is the one people actually have, which is
  // "show me the palettes in this project that also work for text". You had to leave one surface to
  // reach the other, and neither knew what the other had done.
  //
  // They are now one trigger — the ☰ beside the scope chips — onto one panel with two tabs, so
  // filtering and organising are two views of the library rather than two errands. What that costs
  // is a label: the trigger is a glyph, because "Filter" would name half of it and "Manage" the
  // other half. What it buys is that the project you are filtering inside is one tab away, not one
  // dialog and one dismissal away.
  //
  // BAND 2 — THE LIBRARY'S CONTROLS. The chips say which segment you are in and the trigger beside
  // them opens the panel that changes what those segments hold and what is held back — one subject,
  // one row, one baseline. Manage Projects stood here as its own bordered act and is gone into that
  // panel; what replaced it is not a second act but the door to both.
  // The pill selects [data-proj-chip][aria-pressed="true"] and the trigger carries neither that nor
  // aria-pressed, so it was never at risk of being SELECTED, only of looking selectable.
  const viewRow = vals.showProjectsBar && (
    // stretch, not center: the rail and the view toggle take a common height from the row rather
    // than from a number either of them states — a hardcoded match would have agreed until the next
    // padding-token edit.
    // 12px below, matching the 12px the band keeps between its own groups. One number for the gap
    // around this band whichever way it is measured, rather than 12 across and 24 down.
    <div style={sx('display:flex;align-items:stretch;gap:12px;flex-wrap:wrap;margin-bottom:12px')}>
      {/* THE SCOPES GET FOUR COLUMNS, AND THE GRID DECIDES HOW WIDE THAT IS.

          The group used to size to its own content with no ceiling, and that is what cost Manage
          Projects its place. flex-wrap breaks lines by HYPOTHETICAL size — an item's content width,
          measured before any shrinking — and shrink then applies only WITHIN a line. An unbounded
          group therefore never got a shrink pass: two long project names made it 693px, it took the
          whole line alone, and Manage wrapped underneath at a 908px viewport. Not a phone; a laptop
          with the window not maximised.

          Capping it fixes that at the cause rather than fencing it off, because a hypothetical size
          is clamped by max-width (Flexbox §9.2) — so the group can no longer claim a line it cannot
          fill. It also fixes the thing the wrap was a symptom of: Manage used to slide rightward as
          project names grew, so the control moved every time the library did. Against a fixed frame
          it lands in the same place whatever the folders are called.

          FOUR OF TWELVE, derived rather than guessed — see the max-width note in global.css, which
          now caps the RAIL rather than the scroller inside it. The rail takes as much of that frame
          as it needs and no more (flex 0 1 auto, never 1), so a library with two short scopes is not
          a wide box mostly full of nothing; past four columns the chips scroll inside it, the fade
          cue in global.css finally has work to do, and the step buttons below appear to work it. */}
      {/* THE RAIL IS THE CONTROL; THE SCROLLER IS ONLY ITS WINDOW.

          The border used to sit on the scrolling element itself, which made the cap and the clip
          the same edge: chips ran under a fade and there they stopped, with no way to reach the
          rest that did not involve a trackpad. A fade says THERE IS MORE and nothing says HOW, and
          a mouse — no horizontal wheel, no two-finger swipe — had no answer at all.

          So the border moved out to a rail, and the rail holds two things: the scroller, which
          takes whatever width is left (flex:1 1 auto, min-width:0 so it may actually shrink), and a
          pair of step buttons pinned to its trailing edge. One bordered object still, one hairline
          inside it, and the chips end where they always did.

          THE BUTTONS ARE REAL CONTROLS, not a decorative pointer affordance. They were built
          aria-hidden and tabIndex={-1} on the argument that the keyboard already has this route —
          every chip is a tab stop and _revealProjChip scrolls the focused one into view — so two
          more tab stops were only length. That argument was wrong twice over. A <button> stays
          focusable with tabindex="-1", so aria-hidden was sitting on focusable content; and the
          global `:focus{outline:none}` reset means a control with no data-focus token has NO ring
          at all, so anything that ever did focus one would have focused it invisibly.
          Both faults have the same cure: label them, give them the chrome focus token, and let them
          into the tab order. The cost is smaller than it looked — a disabled button is not tabbable,
          so at the row's resting position there is exactly one extra stop, not two. */}
      {/* THE RAIL AND ITS DOOR ARE ONE GROUP, 8px apart, inside a band that spaces at 12. The two
          are a pair — the scopes and the panel that changes what they hold — and 12 spaced them the
          same as the distance to the view toggle, which is a different subject entirely. A tighter
          gap inside the pair than around it is the whole grammar of grouping, and it is stated as a
          nested flex rather than a negative margin so the trigger keeps taking the rail's height
          from the row. */}
      <div style={sx('display:flex;align-items:stretch;gap:8px;flex:0 1 auto;min-width:0')}>
      <div data-proj-rail="1" style={sx('display:inline-flex;align-items:stretch;border:1px solid var(--action-line);flex:0 1 auto;min-width:0')}>
        <div role="group" data-proj-group="1" aria-label="Library view" style={sx('position:relative;display:inline-flex;align-items:stretch;padding:2px;flex:1 1 auto;min-width:0;overflow-x:auto')}>
          <span data-proj-pill="1" aria-hidden="true" style={sx('position:absolute;top:0;left:0;width:0;height:0;background:var(--on-surface);opacity:0;pointer-events:none')}></span>
          {vals.projectChips.map((ch) => (
            /* The label is its own span so it can be the ONLY part that truncates. As a bare text
               node beside the count there was nothing to put an ellipsis on, and a 46-character
               project name simply became a 294px chip — one name eating the whole frame. */
            <button key={ch.key} type="button" data-proj-chip="1" data-ix="seg" data-focus="chrome" aria-pressed={ch.active} aria-label={ch.aria} title={ch.title} onMouseDown={ch.onMouseDown} onFocus={ch.onFocus} onClick={ch.onClick} style={ch.chipStyle}><span style={ch.labelStyle}><TextSwap>{ch.label}</TextSwap></span><span style={ch.countStyle}>{ch.count}</span></button>
          ))}
        </div>
        {/* PRESENT ONLY WHEN THERE IS SOMEWHERE TO GO, which is the rule the rest of this band
            already keeps — Clear filters is absent until something is applied, the pager is absent
            at one page. A row of four scopes fits, and four scopes get no arrows.

            Both arrows, though, the moment either can act: they are one control for one axis, and
            an arrow that appears at the far end only once you have moved would be a control that
            arrives after you needed it. The one that cannot act is disabled rather than removed —
            same reading as the pager's Prev at page one, and the pair keeps its width so the chips
            beside it never shift as you step. */}
        {vals.projSteps.show && (
          <div data-proj-steps="1" style={sx('display:flex;align-items:stretch;flex:none;border-inline-start:1px solid var(--action-line)')}>
            {/* "Previous projects" / "Next projects" — the pager's own two words at the foot of this
                same list, with this control's noun in place of "page". One vocabulary for one
                relationship, and no left/right in it: the words survive a mirrored layout even
                though the glyph rotations below do not. */}
            <button type="button" data-proj-step="prev" data-ix="press" data-focus="chrome" disabled={vals.projSteps.prev.disabled} aria-label="Previous projects" onClick={vals.projSteps.prev.onClick} style={vals.projSteps.prev.style}><span aria-hidden="true" style={sx('display:inline-flex;transform:rotate(90deg)')}><IconChevron size={12} /></span></button>
            <button type="button" data-proj-step="next" data-ix="press" data-focus="chrome" disabled={vals.projSteps.next.disabled} aria-label="Next projects" onClick={vals.projSteps.next.onClick} style={vals.projSteps.next.style}><span aria-hidden="true" style={sx('display:inline-flex;transform:rotate(-90deg)')}><IconChevron size={12} /></span></button>
          </div>
        )}
      </div>
      {/* THE ONE DOOR INTO THE LIBRARY PANEL, on the row with the scopes it opens onto — where the
          two controls it replaces were: Manage Projects ended this rail, Filter began the row under
          it, and one of the two had to be somewhere it was not. On its own line it read as a second
          band of chrome rather than as part of this one, so it stands against the rail instead.
          It takes the rail's height rather than stating one: align-items:stretch means the pair can
          never disagree, where a hardcoded match would have agreed until the next padding-token
          edit. Its own padding would leave it a few pixels shorter; it centres its mark inside
          whatever height the row gives it.

          IT IS THE ONLY CONTROL IN THIS CHROME WITH NO WORD ON IT. That is a real cost — an icon has
          to be recognised where a label is read — and it is paid for the reason set out at the top
          of this section: the panel behind it holds two jobs, and every honest label names one of
          them. The mark is the list it acts on, the hover title and the accessible name say the
          whole sentence, and the panel names itself in its heading the moment it arrives.

          flex:none is load-bearing, not tidiness. This is the only door to filtering AND to
          creating, renaming, deleting and exporting a project, so it is the one control on the band
          that must never be the thing that gives way — the scroller beside it exists precisely so
          that it does not have to.

          data-library-btn keeps it out of the drawer's own dismiss-on-outside-press (see
          _facetOutside) and gives the stylesheet the one selector it needs for the pill corner. */}
      {/* FULLY ROUND, WHICH IS A CONSEQUENCE OF BEING SQUARE. --radius-pill is a stadium: it rounds
          to half the shorter side, so at 38 × 32.5 of chip padding it drew a lozenge with straight
          top and bottom edges. The corner was already at its maximum; what was missing was equal
          sides — so the resting state is a 32px square and the token does the rest.
          A NUMBER, AFTER TRYING NOT TO USE ONE. aspect-ratio:1 with no padding was the first
          attempt, on the reasoning that the width should follow the height the row already gives
          this button (stretch, from the rail) rather than restate it: the ratio does not transfer
          from a stretched cross size, and it collapsed the button to 14px of icon. 32 is the size
          every other icon-only button in the app is drawn at (the manage rows' export and delete),
          and the rail beside it stands at 32.5 — half a pixel nobody can see, against a number the
          next person can repeat. align-self:center keeps it on the rail's own centre line.
          IT BECOMES A STADIUM WHEN A FILTER IS ON, and that is the shape saying so. The count needs
          room the circle does not have, so the button goes back to its label padding and the same
          999px reads as a pill — the state is legible from the silhouette before the numeral is. */}
      <button type="button" data-library-btn="1" data-ix="press" data-focus="chrome" aria-haspopup="dialog" aria-expanded={vals.facetOpen} onClick={vals.openFacet} aria-label={vals.libraryAria} title={vals.libraryTitle} style={sx('flex:none;display:inline-flex;align-items:center;justify-content:center;gap:7px;background:none;border:1px solid var(--action-line);font-family:Neue Montreal;font-size:var(--fs-label);letter-spacing:var(--track-flat);color:var(--on-surface);cursor:pointer;' + (vals.filterCount ? 'padding:var(--btn-pad-sm)' : 'padding:0;width:32px;height:32px;align-self:center'))}>
        {/* THE MARK ANSWERS A HOVER, THE NUMBER DOES NOT. The glyph takes the masked swap every
            other control in this chrome uses — it lifts out and its twin rises into place — which
            is what pays for this button's exemption from the [data-ix="press"] tint a few rules
            into global.css: that rule was written for controls "carrying the swap already", and
            until now this one was not.
            The count is left outside it deliberately, on the rule the scope chips are built to:
            a figure that lifts and re-enters on hover reads as the number CHANGING, which is the
            one thing it must never appear to do. The glyph names the surface, the number names what
            filtering is holding back, and they are two facts that change on different occasions. */}
        <TextSwap><IconList size={12} /></TextSwap>{vals.filterCount && <span style={sx('font-family:Neue Montreal;font-size:var(--fs-micro);color:var(--on-surface-muted);font-variant-numeric:tabular-nums')}>{vals.filterCount}</span>}
      </button>
      </div>
      {/* HOW the section is drawn, on the row with the controls that decide WHAT it holds. It sat
          on the heading row, which paired it with the title but left it floating above a band of
          same-height bordered controls it never lined up with. Here it shares a baseline and a row
          with the chip rail; align-items:stretch already gives them a common height, so the
          alignment is structural rather than two matching numbers.
          margin-inline-start:auto keeps it at the far edge, away from the rail it does not join. */}
      {vals.feedHasItems && (
        <div role="group" aria-label="Feed layout" data-toggle-init="1" style={sx('position:relative;display:inline-grid;grid-template-columns:repeat(3,1fr);padding:2px;border:1px solid var(--action-line);background:transparent;margin-inline-start:auto')}>
          <span aria-hidden="true" style={vals.viewTogglePill}></span>
          <button type="button" data-toggle-btn="1" data-ix="seg" data-focus="chrome" aria-pressed={vals.listPressed} tabIndex={vals.listTab} onClick={vals.setList} onKeyDown={vals.viewToggleKey} style={vals.listToggleStyle}><TextSwap>List</TextSwap></button>
          <button type="button" data-toggle-btn="1" data-ix="seg" data-focus="chrome" aria-pressed={vals.gridPressed} tabIndex={vals.gridTab} onClick={vals.setGrid} onKeyDown={vals.viewToggleKey} style={vals.gridToggleStyle}><TextSwap>Grid</TextSwap></button>
          <button type="button" data-toggle-btn="1" data-ix="seg" data-focus="chrome" aria-pressed={vals.reelPressed} tabIndex={vals.reelTab} onClick={vals.setReel} onKeyDown={vals.viewToggleKey} style={vals.reelToggleStyle}><TextSwap>3D</TextSwap></button>
        </div>
      )}
    </div>
  );

  // BAND 3 — THE TABLE'S TOOLBAR. Not a strip of chrome that happens to be nearby: a toolbar for
  // the table directly beneath it, bound to it by an 8px gap against the 24px above, and named as
  // one — role="toolbar", so it is announced as a set of controls acting on adjacent content
  // rather than as three unrelated buttons. Left/Right walk it (see toolbarKey), which matters
  // because the chip count is open-ended and every chip is otherwise a tab stop.
  //
  // Reading order, left to right: the trigger carrying how many filters are on, then the filters
  // themselves, then the way out of all of them, then the consequence at the far end. It used to
  // run trigger → consequence → way out → filters, which put the escape hatch before the thing to
  // escape and the count before the narrowing that produced it.
  //
  // BAND 3 — THE APPLIED FILTERS, and only here. One removable chip per narrowing plus the one way
  // out of all of them, under the controls and above the list they act on.
  //
  // THIS IS THE ONE PLACE THEY EXIST. The panel used to carry a second copy pinned to its header,
  // and two renderings of one fact on two surfaces is how a reader learns to distrust both. Inside
  // the panel the state is already on the control that sets it — an applied value is a row with its
  // checkbox filled — so the panel says how many (the count on the Filter tab) and this row says
  // which. It survives the panel being shut, which the checkboxes cannot.
  //
  // Absent when nothing is applied: an escape from a state you are not in is one more row to read
  // past on every visit that does not need it.
  //
  // role="toolbar" so it is announced as a set of controls acting on adjacent content rather than
  // as loose buttons; Left/Right walk it (toolbarKey), which matters because the chip count is
  // open-ended and every chip is otherwise a tab stop.
  //
  // data-applied-filters: the panel dismisses on any pointerdown outside itself, and this bar is
  // the exception — everything on it IS filtering, just parked outside the panel so the state stays
  // visible when it is shut. Removing a narrowing should not also put away the surface you would
  // remove the next one from, and clearing from here with the panel open must leave it open.
  const filterRow = vals.showProjectsBar && vals.anyFilter && (
    <div role="toolbar" aria-label="Applied filters" aria-controls="library-list" data-filter-toolbar="1" data-applied-filters="1" onKeyDown={vals.toolbarKey} style={sx('display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px')}>
      {/* One chip per applied filter across every group — accessibility first, matching the panel's
          group order — each removable on its own, so a narrowing can be undone from either end. */}
      {vals.appliedTags.map((t) => (
        <button key={t.key} type="button" data-ix="cta" data-focus="chrome" aria-label={t.aria} onClick={t.onRemove} style={sx('display:inline-flex;align-items:center;gap:7px;background:var(--on-surface);border:1px solid var(--on-surface);border-radius:var(--radius-pill);padding:var(--btn-pad-sm);font-family:Neue Montreal;font-size:var(--fs-label);letter-spacing:var(--track-flat);color:var(--surface);cursor:pointer')}>
          {t.label}<span aria-hidden="true" style={{ fontSize: 'var(--fs-micro)' }}>✕</span>
        </button>
      ))}
      {/* No aria-label: the visible text is the accessible name, so label-in-name (SC 2.5.3) can
          never drift. */}
      <button type="button" data-ix="press" data-focus="chrome" onClick={vals.onClearAll} style={sx('background:none;border:1px solid var(--action-line);border-radius:var(--radius-pill);padding:var(--btn-pad-sm);font-family:Neue Montreal;font-size:var(--fs-label);letter-spacing:var(--track-flat);color:var(--on-surface);cursor:pointer')}><TextSwap>Clear filters</TextSwap></button>
    </div>
  );

  return (
    <section data-recent="1" aria-labelledby="feed-heading" style={sx('width: 100%; padding: 40px var(--page-gutter) 88px; border-top: 1px solid var(--line-strong); margin-top: 36px')}>
      {/* THE HEADING NAMES THE SECTION AND HOLDS NOTHING ELSE. The view switcher used to end this
          row, paired with the title on the argument that both are scoped to the whole region. True,
          and it still left a bordered control floating alone above a band of three more bordered
          controls it never lined up with — the pairing was conceptual and the misalignment was on
          screen. It has gone down to that band, where it shares a row, a height and a baseline with
          the chip group and Manage Projects.

          What is left is the name and its marker. The marker is not a control and must never read
          as one: no border tier, no fill, 16px of glyph. See the region comment above. */}
      <div style={sx('display:flex;align-items:center;gap:10px;margin-bottom:16px')}>
        <h2 id="feed-heading" style={sx("font-family: 'Neue Montreal'; font-weight: 500; font-size:var(--fs-title); line-height:1.1; letter-spacing:-.01em; color: var(--on-surface); margin: 0")}>Library</h2>
        {/* THE STORAGE MARKER STOOD HERE and is removed by request. It was a 16px toggletip beside
            the heading carrying the one fact no control on this page states — where the library
            lives: saved in this browser, on this machine, no account and no server copy, and gone
            if you clear your browser data. It had a second state that is worth naming separately,
            because it was not an explanation but a WARNING: when the storage probe failed (private
            browsing, a locked-down profile, a full disk) the glyph became ! and the sheet said
            nothing here would survive closing the tab. That signal has no other home in the
            interface — persist() still fails silently — so the failure is now unannounced.
            renderVals keeps storeInfo, storeInfoOpen, toggleStoreInfo and storeInfoKey, all now
            unread: putting the marker back is this block, not a rebuild. */}
      </div>

      {/* THE TWO CONTROL BANDS, in every view. They used to be one strip that rode the sort row in
          list view and stood alone in Grid and 3D — a conditional placement whose whole purpose was
          to make scope, filter and sort read as "one bank of list controls". That was the mistake:
          they are not one bank. Scope says which segment of the library you are in, filter says
          what is being held back, sort says how what is left is ordered, and putting all three on
          a line asked the user to work out which was which every time they looked.

          Sort has gone back to the column header where it belongs — over the numbers it orders —
          and these two stand on their own rows, in one place rather than two, above every view.
          Their vertical order is the order the questions arrive in; see the band diagram above. */}
      {/* SPOKEN, NOT PRINTED, and mounted with the SECTION rather than with the toolbar below.
          "Showing 5 of 8 palettes" is redundant on screen — the list below IS the count, and a
          filtered list that visibly shrank does not need a sentence saying so. It is NOT redundant
          to a screen reader: the filter setters announce "Added Balanced filter" and stop, so
          without this the one thing you cannot perceive — how much was left — would go unsaid.

          IT LIVES HERE BECAUSE A LIVE REGION HAS TO BE IN THE DOM BEFORE THE CHANGE IT ANNOUNCES.
          It used to be the last child of the applied-filters toolbar, which was fine while that row
          was permanent; the row now arrives WITH the first filter, so a region inside it would be
          mounted by the same render that fills it and the first narrowing of every visit would go
          unspoken. It is also not a toolbar widget — it is a page-level status — so this is where
          it should have been either way. */}
      <span role="status" aria-live="polite" style={liveRegionStyle}>{vals.resultSummary}</span>
      {viewRow}
      {filterRow}

      {/* FILTERED TO NOTHING is not EMPTY. The cold-start message told someone holding three
          filters that palettes would collect here — answering a question they had not asked and
          hiding the one they had, which is that the combination is unsatisfiable. Two ways out:
          undo the most recent narrowing, or drop the lot. */}
      {vals.filteredEmpty && (
        <div role="status" style={sx('display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;width:100%;padding:48px 40px;background:var(--surface-raised);border:1px dashed var(--line-strong)')}>
          <div style={sx("font-family:'Neue Montreal';font-weight:500;font-size:var(--fs-lead);color:var(--on-surface)")}>No palette matches every filter</div>
          <div style={sx("font-family:'Neue Montreal';font-size:var(--fs-body);line-height:1.5;color:var(--on-surface-muted);text-align:center;max-width:46ch;text-wrap:pretty")}>Filters combine, so each one you add narrows what is left. Remove the last one, or start again.</div>
          {/* The section's control voice (Title Case, --fs-detail), not the app's uppercase CTA
              voice: these act on the same filter state the toolbar above owns, so they wear the
              toolbar's clothes. No aria-labels — the visible text is the name (SC 2.5.3). */}
          <span style={sx('display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding-top:2px')}>
            <button type="button" data-ix="press" data-focus="chrome" onClick={vals.onRemoveLast} style={sx('background:none;border:1px solid var(--action-line);padding:var(--btn-pad-md);font-family:Neue Montreal;font-size:var(--fs-label);letter-spacing:var(--track-flat);color:var(--on-surface);cursor:pointer')}><TextSwap>Remove last filter</TextSwap></button>
            <button type="button" data-ix="press" data-focus="chrome" onClick={vals.onClearAll} style={sx('background:none;border:1px solid var(--action-line);padding:var(--btn-pad-md);font-family:Neue Montreal;font-size:var(--fs-label);letter-spacing:var(--track-flat);color:var(--on-surface);cursor:pointer')}><TextSwap>Clear filters</TextSwap></button>
          </span>
        </div>
      )}

      {vals.feedEmpty && (
        <div style={sx('display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;width:100%;padding:48px 40px;background:var(--surface-raised);border:1px dashed var(--line-strong)')}>
          <div aria-hidden="true" style={sx('position:relative;width:34px;height:34px')}>
            <div style={sx('position:absolute;left:0;top:0;width:22px;height:22px;border:1px solid var(--line-strong)')}></div>
            <div style={sx('position:absolute;right:0;bottom:0;width:22px;height:22px;border:1px solid var(--on-surface-muted);background:var(--surface-raised)')}></div>
          </div>
          <div style={sx("font-family:'Neue Montreal';font-weight:500;font-size:var(--fs-lead);color:var(--on-surface)")}>Nothing here yet</div>
          <div style={sx("font-family:'Neue Montreal';font-size:var(--fs-body);color:var(--on-surface-muted)")}>Palettes you generate collect here, newest first.</div>
        </div>
      )}
      <div ref={vals.gridRef} onKeyDown={vals.onGridKey}>

        {/* THE COLUMN HEADER. It is NOT a table in the ARIA sense — the rows below are buttons, not
            cells — so it claims no table semantics it cannot honour: the ordering is announced
            through the live region on activation. But it is a column header in every way that
            matters to the eye: its columns come from the same --row-grid and the same gutter as
            the rows, so each label stands directly over the figures it names, and it closes with a
            rule so the band it heads has a visible top.

            The strip and identity tracks used to hold the scope and filter controls, which is what
            made this "one bank of list controls" — and what made three sort buttons impossible to
            tell apart from two scope chips and a filter chip a few pixels to their left. Those
            controls now have their own bands above (see the diagram at the top of this component)
            and the tracks hold what they should have held all along: the name of the first column.

            align-items:end so the labels sit on a shared bottom edge, and the whole header is one
            group named for what it does — every button still carries its own full label ("Sort by
            AA pairs, highest first"), so nothing got quieter for a screen reader. */}
        {/* Padded horizontally by --row-inset, exactly like every row's grid below: the header
            is the table's first row geometrically, so it must inherit the same insets or its
            columns are a different table's. The date column's private 16px (chip margin, stamp
            padding) is gone — this shared padding is that inset now, held once. */}
        {vals.showSortHeader && (
          <div role="group" aria-label="Sort the palette list" style={sx('display:grid;grid-template-columns:var(--row-grid);align-items:end;gap:var(--grid-gutter);width:100%;padding:0 var(--row-inset) 8px;border-bottom:1px solid var(--line-strong)')}>
            {/* Not a button: there is no name sort, and a label that looks pressable but is not is
                worse than a label. It names the two tracks the strip and the palette name share —
                the row's identity — so the header accounts for every column rather than starting
                two thirds of the way across.

                NO BORDER HERE, and that is not an oversight. The three metric headers are bordered
                chips because their box edge is how a RIGHT-aligned label declares the column line
                its values end on. This label is left-aligned on the row's own inset — the shared
                grid padding puts its text edge exactly where the strip below begins — so the line
                it must state is already stated by its text. Boxing it would push the word 6px off
                that line. Each column aligns by the rule its content needs. */}
            <span data-row-cell="head" style={sx('min-width:0;font-family:Neue Montreal;font-size:var(--fs-micro);letter-spacing:var(--track-flat);text-transform:uppercase;color:var(--on-surface-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding-bottom:6px')}>Palette</span>
            {/* AA PAIRS owns its column: the sort label right-aligns over the pair count, and the
                ⓘ travels immediately in front of it. Sorting still runs on the true numbers, never
                on the badge.

                The ⓘ used to be pinned to the far left of the column, right-aligned in the badge's
                own 35px slot so the two shared an edge. That worked while the column was 104px
                wide and the badge was pinned left to match. Now the column takes a share of the
                row, and anything pinned to its left edge would stand a track-width away from the
                thing it labels — so the marker goes where its meaning is, next to the label, and
                the column keeps its ONE right edge: label over count, both flush. */}
            <div data-row-cell="aa" style={sx('display:inline-flex;align-items:center;justify-content:flex-end;gap:8px;min-width:0')}>
            {/* The badge marker used to stand here, in front of the sort label. It went with the
                tooltip it opened: an explanation parked permanently inside a column header,
                on the one screen people scan rather than read. What it defined — that a pair
                is two colours reaching AA — belongs to the contrast surface that measures it,
                which is one button away and has room to say it properly. */}
              {vals.sortCols.filter((col) => col.key === 'aa').map((col) => (
                <button key={col.key} type="button" data-ix="press" data-focus="chrome" aria-pressed={col.pressed} aria-label={col.aria} onClick={col.onSort} data-row-cell={col.key === 'time' ? 'date' : col.key} style={col.style}>
                  {/* The 9px slot is reserved on every column whether or not it draws anything, so
                      a label never shifts when the sort moves to it. data-dim marks the columns
                      that are NOT the current sort: they render nothing at rest and fade the
                      chevron in on hover or keyboard focus, which is where the invitation belongs.
                      See the [data-sort-chevron] rules in global.css. */}
                  <span aria-hidden="true" style={sx('display:inline-flex;align-items:center;justify-content:center;width:9px;flex:none')}>{col.showChevron && <span data-sort-chevron="1" data-dir={col.dir} data-dim={col.chevronDim ? '1' : null}><IconChevron /></span>}</span><TextSwap>{col.label}</TextSwap>
                </button>
              ))}
            </div>
            {/* MAX CONTRAST and DATE each own their column outright */}
            {vals.sortCols.filter((col) => col.key === 'contrast' || col.key === 'time').map((col) => (
              <button key={col.key} type="button" data-ix="press" data-focus="chrome" aria-pressed={col.pressed} aria-label={col.aria} onClick={col.onSort} data-row-cell={col.key === 'time' ? 'date' : col.key} style={col.style}>
                {/* Same reserved slot and same data-dim rule as the AA column above. */}
                <span aria-hidden="true" style={sx('display:inline-flex;align-items:center;justify-content:center;width:9px;flex:none')}>{col.showChevron && <span data-sort-chevron="1" data-dir={col.dir} data-dim={col.chevronDim ? '1' : null}><IconChevron /></span>}</span><TextSwap>{col.label}</TextSwap>
              </button>
            ))}
          </div>
        )}

        {/* LIST view (canonical). The id is what the toolbar's aria-controls points at, so a
            screen reader can say which region those filter controls act on. */}
        <div id="library-list" data-list-wrap="1" style={vals.listWrapStyle}>
          {vals.feedList.map((c) => (
            <div key={c.rowid} data-row-wrap="1" style={{ position: 'relative' }}>
              {/* The row was a single <button>, which made interactive tags inside it illegal HTML.
                  Now it is a surface (this div carries the background, the selected sync and the
                  hover tint) with a STRETCHED activation button covering it — the same overlay
                  pattern the folder/delete buttons already use, just inset:0. The hit button is
                  first in DOM so keyboard order leads with the row's main action, then its tags;
                  it keeps data-feed so the list's arrow-key navigation still walks row to row. */}
              <div data-row="1" data-cur={c.curFlag} data-rowid={c.rowid} onMouseEnter={c.onEnter} onMouseLeave={c.onLeave} style={c.rowStyle}>
                <button type="button" data-row-hit="1" data-feed="1" data-focus="card" disabled={c.disabled} aria-current={c.ariaCurrent} aria-label={c.aria} onFocus={c.onHitFocus} onBlur={c.onHitBlur} onClick={c.onClick} style={sx('position:absolute;inset:0;z-index:1;background:transparent;border:0;padding:0;margin:0;cursor:inherit')}></button>
                <span data-cmark="1" aria-hidden="true" style={c.markerStyle}></span>
                {/* One row, one job: recognition. The detail surface is the overview panel above —
                    this row's only output is "which palette", so it holds a fixed height and every
                    child stays on a single line. Nothing here may grow the row. */}
                {/* 16 on the left, 8 on the right — and the same 16px margin on both, because the
                    trailing cell carries the other 8 itself (--row-cell-inset). Splitting it that
                    way is what lets the last column's value and its header label share one right
                    edge while the header's hover tint stays symmetrical around its own label. */}
                <div data-row-main="1" style={sx('display:grid;grid-template-columns:var(--row-grid);align-items:center;gap:var(--grid-gutter);width:100%;min-height:var(--row-list-height);padding:12px var(--row-inset)')}>
                  {/* The colour IS the row's identity — people recognise a palette by how it looks,
                      not by an auto-generated name. So the strip leads and carries the mass: 24px
                      tall, which with the 12px padding is exactly --row-list-height, making the
                      strip the thing that DEFINES the row rather than a thumbnail sitting inside it.
                      Fixed 160px (not proportional to the row) so the strips align into a column and
                      stay comparable down the list. Bands use flexGrow: w(b) — the same
                      share-to-width mapping as the overview and the universe card, from one shared
                      w(); scaling the box up cannot drift the proportions. */}
                  {/* Hairline because the strip is now the anchor: a pale palette's outer band sits
                      at ~1.3:1 against --surface-raised, so without an edge the anchor bleeds into
                      the row. --line is the same hairline the other media islands take (reference
                      thumbnail, "No reference" box, universe card) — quiet by system decision, and
                      matching that decision beats inventing a heavier border no sibling has.
                      box-sizing is border-box globally, so the box stays exactly 160×24. */}
                  <div aria-hidden="true" data-row-cell="strip" style={sx('display:flex;width:100%;height:24px;border:1px solid var(--line)')}>
                    {c.restStrip.map((st, si) => (<div key={si} style={st.style}></div>))}
                  </div>
                  {/* IDENTITY — one grid cell, four things: name, Example, Viewing, tags. They were
                      four siblings of the row itself, which meant the tag list was the row's single
                      elastic child and quietly owned every pixel the metrics did not use (520 of
                      them at 1440, most of it empty). As one cell on the 2fr track it takes a
                      declared share instead of the remainder, and the metric columns get theirs. */}
                  {/* overflow:hidden because this cell is the 1fr track: it absorbs every width the
                      fixed columns do not take, so it is the one that runs out. The name and the
                      chip are flex:none and would otherwise spill into the AA column on a narrow
                      window. Clipped is recoverable; overlapping two columns is not. */}
                  <div data-row-cell="name" style={sx('display:flex;align-items:center;gap:16px;min-width:0;overflow:hidden')}>
                  {/* Secondary by SIZE alone now: down a step from the overview's title (16 → 13),
                      but at the same medium weight the filter panel gives its facet names. Both are
                      the same kind of thing — the name of a choosable, the subject of its row — and
                      13/500 is what that is called in this app. Still full --on-surface ink, not
                      muted: it is the row's only text identifier and the one thing a screen reader
                      leads with, so the demotion is a size step and never a fade. */}
                  <span style={sx("font-family:'Neue Montreal';font-weight:500;font-size:var(--fs-body);color:var(--on-surface);flex:none")}>{c.name}</span>
                  {c.isExample && (
                    <span style={sx('flex: none; font-family: Neue Montreal; font-size:var(--fs-nano); letter-spacing:var(--track-flat); text-transform: uppercase; color: var(--on-surface-muted); border: 1px solid var(--line-strong); padding: 2px 6px')}>Example</span>
                  )}
                  {/* "Viewing" sits with the name and the Example chip — the labels that say what
                      this palette IS — and, structurally, it has to sit before the flexible column:
                      appearing on the right would push the metric columns left on whichever row was
                      selected, and a column that moves for one row is not a column. */}
                  {c.current && (
                    <span style={sx('display: inline-flex; align-items: center; gap: 6px; flex: none; font-family: Neue Montreal; font-size:var(--fs-micro); letter-spacing:var(--track-flat); text-transform: uppercase; color: var(--on-surface)')}>
                      <span style={sx('width:7px;height:7px;background:var(--on-surface)')} aria-hidden="true"></span>Viewing</span>
                  )}
                  {/* THE TRAIT TAGS ARE GONE FROM THE ROW, and the flexible child stays. It was
                      three uppercase words per row — SMOULDERING · GOLDEN · GRAPHIC — each one a
                      button that filtered in place, which made the row's middle a second control
                      bank running the length of the list: twenty-four small targets between a
                      palette's name and its numbers, none of them the thing the row is for.
                      Filtering by trait did not leave with them; it is one press away in the
                      library panel, where every other narrowing now lives, and the tags are still
                      on the palette itself (the detail view reads them).
                      The span survives on purpose. It is the cell's flexible child — it absorbs
                      every difference in name length so the identity cell settles without bidding
                      on the metric tracks beside it — and that job was never the tags'.
                      renderVals still supplies descriptorParts, tagBtnBase, tagOn and tagOff, now
                      unread: putting the row back is a map(), not a rebuild. */}
                  <span aria-hidden="true" style={sx('flex:1;min-width:0')}></span>
                  </div>
                  {/* the accessibility cluster — verdict first, numbers second. The badge is the
                      primary signal: fill AND glyph change per state (never colour alone), and a
                      reader who has never heard of 4.5:1 still gets pass / partial / fail. The
                      raw layer stays for whoever wants the actual numbers. Header shares the
                      column token, so the cluster stacks into a true column down the list. */}
                  {/* AA PAIRS — the verdict badge and the pair count it derives from, nothing
                      else. Badge left (its own column of glyphs down the list), count right so
                      the figures share one edge. */}
                  <span data-row-cell="aa" style={c.aaCell}>
                    <AaBadge aa={c} />
                    <span style={c.metricValue}>{c.aaValueText}</span>
                  </span>
                  {/* MAX CONTRAST — a separate measurement, so a separate column */}
                  <span data-row-cell="contrast" style={c.contrastCell}>{c.contrastValueText}</span>
                  {/* absolute stamp as the value, relative as the hover layer; the row's aria
                      sentence still ends "Generated 3h ago", so both forms reach every modality.
                      data-row-time is the hook for the one movement in this row: on hover it steps
                      one gutter left, into room its own column already holds, and hands the margin
                      to the buttons. It is the only column allowed to move, which is why it is the
                      only one that carries a hook. */}
                  <span data-row-time="1" data-row-cell="date" style={c.timeCell} title={c.timeRel}>{c.time}</span>
                </div>
              </div>
              {/* The buttons land on the row's own inset — the margin the stamp holds at rest and
                  hands over while the pointer is here. Their vertical centring and their arrival
                  travel live in global.css: one transform cannot be half inline and half in a
                  stylesheet, and the half that is a state has to be the one that wins. Only what is
                  static about them is here. 6px apart, unchanged.

                  NO EDGE AND NO PLATE. Both carried a --surface fill and an --action-line border,
                  which made two hard bordered objects appear inside a row the moment the pointer
                  crossed it — the loudest thing on a surface whose own content is a colour strip and
                  a name. The plate was there to occlude what it covered; nothing is under them, the
                  date column already steps aside (--row-action-offset) to make the room. What is
                  left is the glyph, arriving on the same fade and travel as before.
                  The hover tint from [data-ix="press"] is deliberately KEPT: these two have no label
                  to swap and no edge left to answer with, so the tint is now the only thing that
                  says the glyph under the pointer is the one that will act. */}
              <button type="button" data-ix="press" data-del="1" data-focus="chrome" aria-label={c.assignAria} onClick={c.onAssign} style={sx('position:absolute;right:calc(var(--row-action-offset) + 36px);z-index:6;width:30px;height:30px;padding:0;display:inline-flex;align-items:center;justify-content:center;background:none;border:0;color:var(--on-surface);cursor:pointer')}>
                <IconFolder />
              </button>
              <button type="button" data-ix="press" data-del="1" data-focus="chrome" aria-label={c.deleteAria} onClick={c.onDelete} style={sx('position:absolute;right:var(--row-action-offset);z-index:6;width:30px;height:30px;padding:0;display:inline-flex;align-items:center;justify-content:center;background:none;border:0;color:var(--on-surface);cursor:pointer')}>
                <IconTrash />
              </button>
            </div>
          ))}
        </div>

        {/* LIST FOOTER — two controls with two conditions, not one block with one.
            "Prev · Page 1 of 1 · Next" on a single-page list is two permanently disabled buttons
            and a live region announcing a position that cannot change, so the pager goes as soon
            as pageCount is 1. Per page survives one step longer: 20 palettes at 24 per page is
            also one page, but choosing 12 there WOULD split it. Both conditions live in
            renderVals; when neither holds, the <nav> is not rendered at all. */}
        {(vals.showPageSize || vals.showPager) && (
          <nav aria-label="Palette list pages" style={sx('display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;padding:16px 0 0')}>
            {vals.showPageSize ? (
              <div role="group" aria-label="Palettes per page" style={sx('display:flex;align-items:center;gap:10px')}>
                {/* Sentence case, --fs-detail: the footer is the same section's chrome as the two
                    control bands at its top, and a region that changes voice halfway down reads as
                    two regions. See the chipStyle note in renderVals. */}
                <span style={sx('font-family:Neue Montreal;font-size:var(--fs-detail);letter-spacing:var(--track-flat);color:var(--on-surface-muted)')}>Per page</span>
                <div data-toggle-init="1" style={sx('position:relative;display:inline-grid;grid-template-columns:repeat(3,1fr);padding:2px;border:1px solid var(--action-line);background:transparent')}>
                  <span aria-hidden="true" style={vals.pageTogglePill}></span>
                  {vals.pageSizeOptions.map((o) => (
                    <button key={o.label} type="button" data-toggle-btn="1" data-ix="seg" data-focus="chrome" aria-pressed={o.pressed} tabIndex={o.tabIndex} onClick={o.onSelect} onKeyDown={vals.pageToggleKey} style={o.style}>{o.label}</button>
                  ))}
                </div>
              </div>
            ) : <span></span>}
            {vals.showPager && (
              <div style={sx('display:flex;align-items:center;gap:10px')}>
                <button type="button" data-ix="press" data-focus="chrome" disabled={vals.prevDisabled} aria-label="Previous page" onClick={vals.prevPage} style={vals.prevStyle}><TextSwap>Prev</TextSwap></button>
                <span aria-live="polite" style={sx('font-family:Neue Montreal;font-size:var(--fs-detail);letter-spacing:var(--track-flat);color:var(--on-surface-muted);white-space:nowrap;font-variant-numeric:tabular-nums')}>{vals.pageLabel}</span>
                <button type="button" data-ix="press" data-focus="chrome" disabled={vals.nextDisabled} aria-label="Next page" onClick={vals.nextPage} style={vals.nextStyle}><TextSwap>Next</TextSwap></button>
              </div>
            )}
          </nav>
        )}

        {/* FULLSCREEN PALETTE UNIVERSE (overscanning, wrapping field) */}
        <div ref={vals.spaceRef} role="region" aria-label="Palette universe, spatial view" data-universe-status="idle" style={vals.spaceStyle}>

          {vals.universeEngine && (<>
            <div ref={vals.planeRef} data-plane="1" style={sx('position:absolute;top:0;left:0;width:100%;height:100%')}>
              <div data-grid-originals="1" style={sx('position:absolute;top:0;left:0;width:100%;height:100%')}>
                {vals.feedNodes.map((c, ci) => (
                  <button key={ci} type="button" data-feed="1" data-focus="card" aria-current={c.ariaCurrent} aria-label={c.aria} onMouseEnter={c.onEnter} onMouseLeave={c.onLeave} onFocus={c.onFocus} onBlur={c.onBlur} onClick={c.onClick} style={c.tileAbs}>
                    <div data-tile-inner="1" style={sx('position:absolute;inset:0;transform-origin:center center')}>
                      <div style={c.heroWrapStyle} aria-hidden="true">
                        {c.hasImage && (<span aria-hidden="true" style={c.imgStyle}></span>)}
                        {c.noImage && (<span style={c.heroFallback}></span>)}
                        <span style={c.heroFadeStyle}></span>
                      </div>
                      <div data-pbase="1" style={c.pbaseStyle}>
                        <div data-strip="1" style={sx('display:flex;height:46px;width:100%')} aria-hidden="true">
                          {c.strip.map((st, si) => (<div key={si} style={st.style}></div>))}
                        </div>
                        <div style={sx('padding:12px 14px;display:flex;flex-direction:column;gap:6px;width:100%')}>
                          <div style={sx('display:flex;justify-content:space-between;align-items:baseline;gap:8px')}>
                            <CardIdentity c={c} />
                          </div>
                          <span style={sx('font-family:Neue Montreal;font-size:var(--fs-nano);letter-spacing:.06em;text-transform:uppercase;color:var(--on-surface-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis')}>{c.descriptors}</span>
                        </div>
                        <CardMetrics c={c} />
                      </div>
                      <span data-ring="1" aria-hidden="true" style={c.ringStyle}></span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div aria-hidden="true" style={vals.vignetteStyle}></div>
          </>)}

          {vals.universeReduced && (
            <div data-lenis-prevent="1" style={sx('position:absolute;top:56px;left:0;right:0;bottom:0;overflow:auto;padding:24px')}>
              <div style={sx('display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:20px;max-width:1200px;margin:0 auto')}>
                {vals.feedNodes.map((c, ci) => (
                  <button key={ci} type="button" data-feed="1" data-focus="card" aria-current={c.ariaCurrent} aria-label={c.aria} onClick={c.onClick} style={sx('position:relative;display:block;text-align:left;width:100%;background:var(--surface-raised);border:1px solid var(--line);padding:0;margin:0;cursor:pointer;font:inherit;overflow:hidden')}>
                    <div style={sx('position:relative;height:170px;width:100%;overflow:hidden;background:var(--line)')} aria-hidden="true">
                      {c.hasImage && (<span aria-hidden="true" style={c.imgStyle}></span>)}
                      {c.noImage && (<span style={c.heroFallback}></span>)}
                    </div>
                    <div data-strip="1" style={sx('display:flex;height:46px;width:100%')} aria-hidden="true">
                      {c.strip.map((st, si) => (<div key={si} style={st.style}></div>))}
                    </div>
                    <div style={sx('padding:12px 14px;display:flex;flex-direction:column;gap:6px;width:100%')}>
                      <div style={sx('display:flex;justify-content:space-between;align-items:baseline;gap:8px')}>
                        <CardIdentity c={c} />
                      </div>
                      <span style={sx('font-family:Neue Montreal;font-size:var(--fs-nano);letter-spacing:.06em;text-transform:uppercase;color:var(--on-surface-muted)')}>{c.descriptors}</span>
                    </div>
                    <CardMetrics c={c} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* universe chrome (fixed above the field) */}
          <div data-universe-chrome="1" style={sx('position: absolute; top: 0; left: 0; right: 0; height: 56px; z-index: 5; display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 0 var(--page-gutter); background: linear-gradient(180deg, #FAF9F500, #00000000); pointer-events: none')}>
            <div style={sx('display:flex;align-items:baseline;gap:12px;pointer-events:auto')}></div>
            {/* The same close mark the reel uses, for the same reason and with the same one
                deviation: --surface behind it, because this one floats over a live WebGL field too.
                The pair are the app's only two full-screen stages and they now leave the same way. */}
            <button type="button" data-ix="press" data-focus="chrome" onClick={vals.setList} aria-label="Close palette universe, or press Escape" title="Close" style={sx('pointer-events:auto;flex:none;width:32px;height:32px;display:inline-flex;align-items:center;justify-content:center;background:var(--surface);border:1px solid var(--action-line);border-radius:var(--radius-pill);padding:0;color:var(--on-surface);cursor:pointer')}><TextSwap><IconClose /></TextSwap></button>
          </div>

          {vals.universeEngine && (
            <span data-universe-chrome="1" aria-hidden="true" style={sx('position:absolute;left:20px;bottom:18px;z-index:5;font-family:Neue Montreal;font-size:var(--fs-label);letter-spacing:.06em;text-transform:uppercase;color:var(--on-surface-muted);background:color-mix(in srgb, var(--surface-raised) 88%, transparent);padding:5px 9px;border:1px solid var(--line);pointer-events:none')}>Drag or scroll to explore</span>
          )}
        </div>

        {/* FULLSCREEN 3D TORNADO: helix of palette cards (items built imperatively) */}
        <div data-reel-layer="1" role="region" aria-label="3D palette view" style={vals.reelStyle}>
          {/* NO overflow HERE, AND THAT IS THE FIX RATHER THAN AN OMISSION. This element is SCALED —
              the frame recedes to _reelFromScale on the way out and grows from it on the way in — and
              a clip travels with the transform that carries it. At 0.8 the clip rectangle is 80% of
              the viewport centred, so its bottom edge sits a tenth of the screen ABOVE the real one,
              and it rises there over the 1.2s the scale runs. The helix leaves downward through that
              edge, so the curve was being cut off part-way down a frame nobody could see, and the cut
              moved while it happened.

              The clipping was never this element's job anyway: [data-reel-layer] is position:fixed,
              inset:0 and overflow:hidden, it is not transformed by either transition, and it is the
              thing that should decide what leaves the viewport. At rest the two boxes are identical,
              which is why this was invisible until something scaled one of them. */}
          <div data-reel-stage="1" style={sx('position:absolute;inset:0;overscroll-behavior:none;cursor:grab;touch-action:none')}>
            {/* pointer-events:none on the list is what makes the cards clickable at all. Every card
                is pushed AWAY from the camera by the helix (z is (cos−1)·radius, so never positive),
                which puts the list's own untransformed plane in FRONT of all of them for hit-testing
                while the cards still paint through it — the list has no background to hide them. A
                press then landed on the list, where nothing listens, and the card under the cursor
                never heard it. Taking the list out of hit-testing lets each press resolve against the
                cards themselves, which order correctly among each other; the press still reaches the
                stage behind them, so drag-to-spin is untouched. */}
            <div data-reel-list="1" style={sx('position:relative;width:100%;height:100%;font-size:clamp(.5em, .75vw, 1.5em);perspective:75em;transform-style:preserve-3d;pointer-events:none')}></div>
          </div>
          {vals.reelEmpty && (
            <div style={sx('position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:24px;pointer-events:none')}>
              <span style={sx('font-family:Neue Montreal;font-size:var(--fs-label);letter-spacing:var(--track-flat);text-transform:uppercase;color:var(--on-surface-muted);text-align:center')}>No image-backed palettes here yet — drop a reference image to fill the reel.</span>
            </div>
          )}
          <div data-reel-chrome="1" style={sx('position:absolute;top:0;left:0;right:0;height:56px;z-index:5;display:flex;align-items:center;justify-content:space-between;gap:16px;padding:0 var(--page-gutter);pointer-events:none')}>
            <div style={sx('display:flex;align-items:baseline;gap:12px;pointer-events:auto')}></div>
            {/* The app's close mark, at the 32px circle every other surface uses — with one deviation
                it has to keep: --surface behind it, not none. Every other close mark sits on a sheet;
                this one floats over a live WebGL stage, and a hairline ring with nothing behind it
                disappears over whatever colour happens to be passing under it.
                THE VISIBLE "ESC" HINT GOES WITH THE WORD. Escape closes every overlay in this app
                and no other one advertises it, so the reel was the outlier rather than the standard;
                the key still works, and the hint now lives in the accessible name. */}
            <button ref={vals.reelCloseRef} type="button" data-ix="press" data-focus="chrome" onClick={vals.setList} aria-label="Close reel, or press Escape" title="Close" style={sx('pointer-events:auto;flex:none;width:32px;height:32px;display:inline-flex;align-items:center;justify-content:center;background:var(--surface);border:1px solid var(--action-line);border-radius:var(--radius-pill);padding:0;color:var(--on-surface);cursor:pointer')}><TextSwap><IconClose /></TextSwap></button>
          </div>
          <span data-reel-chrome="1" aria-hidden="true" style={sx('position:absolute;left:20px;bottom:18px;z-index:5;font-family:Neue Montreal;font-size:var(--fs-label);letter-spacing:.06em;text-transform:uppercase;color:var(--on-surface-muted);background:color-mix(in srgb, var(--surface-raised) 88%, transparent);padding:5px 9px;border:1px solid var(--line);pointer-events:none')}>Drag or scroll to spin</span>
        </div>
      </div>
    </section>
  );
}

// ============================== CONTRAST CHECKER DRAWER ==============================
function ContrastDrawer({ vals }) {
  if (!vals.hasContrast) return null;
  const contrast = vals.contrast;
  return (
    <div style={sx('position:fixed;inset:0;z-index:110')}>
      <div data-cx-backdrop="1" onClick={vals.closeContrast} style={sx('position:absolute;inset:0;background:color-mix(in srgb, var(--scrim) 55%, transparent);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)')}></div>
      <div data-cx-drawer="1" data-contrast-dialog="1" data-lenis-prevent="1" role="dialog" aria-modal="true" aria-label={'Contrast checker for ' + contrast.name} onKeyDown={vals.trapContrast} style={sx('position:absolute;right:0;top:0;bottom:0;width:500px;max-width:94vw;background:var(--surface);border-left:1px solid var(--line-strong);display:flex;flex-direction:column;overflow-y:auto')}>
        <header data-cx-sec="1" style={sx('display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:20px var(--page-gutter) 0')}>
          <div style={sx('display:flex;flex-direction:column;gap:4px;min-width:0')}>
            <span style={sx('font-family: Neue Montreal; font-size:var(--fs-label); letter-spacing:var(--track-flat); text-transform: uppercase; color: var(--on-surface-muted)')}>Contrast checker</span>
            <span data-drawer-split="1" style={sx("font-family:'Neue Montreal';font-weight:500;font-size:var(--fs-subtitle);letter-spacing:-.01em;color:var(--on-surface);white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{contrast.name}</span>
          </div>
          <button type="button" data-ix="press" data-focus="chrome" title="Close" onClick={vals.closeContrast} aria-label="Close contrast checker" style={sx('flex:none;width:32px;height:32px;display:inline-flex;align-items:center;justify-content:center;background:none;border:1px solid var(--action-line);border-radius:var(--radius-pill);padding:0;color:var(--on-surface);cursor:pointer')}><TextSwap><IconClose /></TextSwap></button>
        </header>

        {/* data-cx-cell on the GROUPS, not on the five buttons. A segmented control is one object —
            AA and AAA share an edge and read as a single switch — so staggering its halves would
            animate the seam rather than the control. Three items arrive here: the level switch, the
            size switch, and the filter. */}
        <div data-cx-sec="1" style={sx('display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:18px var(--page-gutter) 0')}>
          {/* THE SAME RAIL AS THE LIBRARY PANEL'S TABS: one bordered box at 2px of padding, a
              travelling pill inside it, two transparent buttons over the top. data-seg-rail and
              data-seg-btn are the pattern's own names — the library's tabs keep data-lib-tab
              because a rule scoped to the drawer uses it to put those two back into caps, and a
              shared name would have carried that voice in here. Same object, same corner, stated in
              global.css beside the tabs' entry. */}
          <div data-cx-cell="lens" data-seg-rail="1" style={sx('position:relative;display:inline-grid;grid-template-columns:repeat(2,1fr);padding:2px;border:1px solid var(--action-line);background:transparent')} role="group" aria-label="WCAG level">
            <span aria-hidden="true" style={contrast.lensPill}></span>
            <button type="button" data-seg-btn="1" data-ix="seg" data-focus="chrome" onClick={contrast.setAA} aria-pressed={contrast.aaPressed} style={contrast.aaStyle}><TextSwap>AA</TextSwap></button>
            <button type="button" data-seg-btn="1" data-ix="seg" data-focus="chrome" onClick={contrast.setAAA} aria-pressed={contrast.aaaPressed} style={contrast.aaaStyle}><TextSwap>AAA</TextSwap></button>
          </div>
          <div data-cx-cell="size" data-seg-rail="1" style={sx('position:relative;display:inline-grid;grid-template-columns:repeat(2,1fr);padding:2px;border:1px solid var(--action-line);background:transparent')} role="group" aria-label="Text size">
            <span aria-hidden="true" style={contrast.sizePill}></span>
            <button type="button" data-seg-btn="1" data-ix="seg" data-focus="chrome" onClick={contrast.setNormal} aria-pressed={contrast.normalPressed} style={contrast.normalStyle}><TextSwap>Normal</TextSwap></button>
            <button type="button" data-seg-btn="1" data-ix="seg" data-focus="chrome" onClick={contrast.setLarge} aria-pressed={contrast.largePressed} style={contrast.largeStyle}><TextSwap>Large</TextSwap></button>
          </div>
          <button type="button" data-cx-cell="filter" data-ix="seg" data-focus="chrome" onClick={contrast.togglePass} aria-pressed={contrast.passPressed} style={contrast.passStyle}><TextSwap>{contrast.passLabel}</TextSwap></button>
        </div>

        <div data-cx-sec="1" style={sx('display:flex;align-items:baseline;gap:8px;padding:16px var(--page-gutter) 0')}>
          <span data-cx-summary="1" data-drawer-split="1" style={sx('font-family:Neue Montreal;font-size:var(--fs-body);color:var(--on-surface)')}>{contrast.aa} of {contrast.total} pairs pass {contrast.lensLabel}</span>
          <span style={sx('font-family:Neue Montreal;font-size:var(--fs-label);letter-spacing:.06em;text-transform:uppercase;color:var(--on-surface-muted)')}>min {contrast.threshold}:1</span>
        </div>

        <div data-cx-sec="1" style={sx('padding:14px var(--page-gutter) 0')}>
          <div style={sx('font-family: Neue Montreal; font-size:var(--fs-micro); letter-spacing:var(--track-flat); text-transform: uppercase; color: var(--on-surface-muted); margin-bottom: 8px')}>Pairwise contrast</div>
          <div style={contrast.matrixColsStyle}>
            {contrast.rows.map((row, ri) => (
              <div key={ri} style={sx('display:flex;align-items:stretch')}>
                {row.isHeader && (<>
                  <div style={sx('width:34px;flex:none')}></div>
                  {row.chips.map((c, ci) => (
                    <div key={ci} style={sx('flex:1;min-width:0;display:flex;align-items:center;justify-content:center;height:34px')}>
                      <span aria-hidden="true" data-cx-cell={'chip-' + ci} data-ov-band="1" style={c.style}></span>
                    </div>
                  ))}
                </>)}
                {row.isBody && (<>
                  {/* The axis legend is part of the grid, not furniture standing behind it. Without
                      a hook the chips sat at full strength while the ratios they label swept in
                      under them — a matrix whose data arrives into an axis that was already there.
                      They take the same beat as the cells, so the whole grid arrives as one object.
                      data-ov-band, and it sits on the 24px COLOUR SPAN rather than on the 34px
                      layout cell holding it. Clipping the cell would sweep the reveal up through
                      ten pixels of empty box before it reached any colour, so the chip would appear
                      partway rather than fill — the gesture has to run on the ink, not on the
                      gap around it.
                      These briefly faded instead, on the objection that a 34px square is too small
                      for a clip to travel across. That was true of the HORIZONTAL wipe they carried
                      at the time and does not survive the change of axis: filling from the bottom
                      edge is exactly what a small swatch can do, because it is a miniature of the
                      result stage's own band. */}
                  <div style={sx('width:34px;flex:none;display:flex;align-items:center;justify-content:center')}>
                    <span aria-hidden="true" data-cx-cell={'chip-r' + ri} data-ov-band="1" style={row.chip.style}></span>
                  </div>
                  {row.cells.map((cell, ci) => (
                    <div key={ci} data-cx-cell={cell.key} style={cell.style}>
                      <span style={cell.numStyle}>{cell.ratio}</span>
                      <span data-cx-mark="1" aria-hidden="true" style={cell.glyphStyle}>{cell.glyph}</span>
                    </div>
                  ))}
                </>)}
              </div>
            ))}
          </div>
        </div>

        <div data-cx-sec="1" style={sx('padding:20px var(--page-gutter) 0')}>
          <div style={sx('font-family: Neue Montreal; font-size:var(--fs-micro); letter-spacing:var(--track-flat); text-transform: uppercase; color: var(--on-surface-muted); margin-bottom: 8px')}>Text on each colour</div>
          <div style={sx('display:flex;flex-direction:column;gap:1px')}>
            {contrast.textOn.map((t, ti) => (
              <div key={ti} data-cx-cell={'on-' + ti} data-ov-wipe="1" style={t.style}>
                <span style={{ fontSize: 'var(--fs-label)' }}>{t.hex}</span>
                <span style={sx('text-transform: uppercase; font-size:var(--fs-label)')}>{t.onLabel} · {t.ratio}:1</span>
              </div>
            ))}
          </div>
        </div>

        <div data-cx-sec="1" style={sx('padding:20px var(--page-gutter) 26px')}>
          <div style={sx('display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin-bottom:8px')}>
            <span style={sx('font-family: Neue Montreal; font-size:var(--fs-micro); letter-spacing:var(--track-flat); text-transform: uppercase; color: var(--on-surface-muted)')}>Best pair sample</span>
            <span style={sx('font-family:Neue Montreal;font-size:var(--fs-label);color:var(--on-surface-muted)')}>{contrast.sampleFg} on {contrast.sampleBg} · {contrast.sampleRatio}:1</span>
          </div>
          <div data-cx-sample="1" data-cx-cell="sample" style={contrast.sampleStyle}>The quick brown fox jumps over the lazy dog</div>
        </div>
      </div>
    </div>
  );
}

// ============================== FULLSCREEN PALETTE DETAIL ==============================
function DetailOverlay({ vals }) {
  if (!vals.hasOverlay) return null;
  const overlay = vals.overlay;
  return (
    <div ref={vals.overlayRef} data-overlay-stage="1" role="dialog" aria-modal="true" aria-label={overlay.name + ' palette detail'} onKeyDown={vals.trapFocus} style={sx('position:fixed;inset:0;z-index:100;background:var(--surface);display:flex;flex-direction:column')}>
      <header data-ochrome="1" style={sx('display:flex;align-items:center;justify-content:space-between;gap:16px;height:64px;padding:0 var(--page-gutter);border-bottom:1px solid var(--line-strong);flex:none')}>
        <div style={sx('display:flex;align-items:baseline;gap:14px;min-width:0')}>
          <span style={sx("font-family:'Neue Montreal';font-weight:500;font-size:var(--fs-subtitle);letter-spacing:-.01em;color:var(--on-surface);white-space:nowrap")}>{overlay.name}</span>
          <span style={sx('font-family: Neue Montreal; font-size:var(--fs-label); letter-spacing:var(--track-flat); text-transform: uppercase; color: var(--on-surface-muted)')}>{overlay.time}</span>
        </div>
        {/* Filing used to stand here, in the chrome, while the result view files from its action
            row — one job wearing two different clothes depending on which door you came through.
            It moved down to the footer row, next to Export, where the other things you
            do WITH a palette already live. The header keeps only what acts on the palette's place in
            the archive or on this window: delete, and close. */}
        <div style={sx('display:flex;align-items:center;gap:10px;flex:none')}>
          {/* THE WORD GOES, THE MARK STAYS, and the header becomes a pair of 32px circles — delete and
              close, the two things you can do to a palette from here. Same bin the library row and
              the project row use, at the size every icon-only act in the app is drawn at.
              aria-label still names the palette ("Delete High Key"), which is the part that must
              never become a glyph: a destructive act has to say what it destroys. */}
          <button type="button" data-ix="press" data-focus="chrome" aria-label={overlay.deleteAria} title="Delete" onClick={overlay.onDelete} style={sx('flex:none;width:32px;height:32px;display:inline-flex;align-items:center;justify-content:center;background:none;border:1px solid var(--action-line);border-radius:var(--radius-pill);padding:0;color:var(--on-surface);cursor:pointer')}><TextSwap><IconTrash /></TextSwap></button>
          <button type="button" data-ix="press" data-focus="chrome" title="Close" aria-label="Close palette detail" onClick={vals.closeOverlay} style={sx('flex:none;width:32px;height:32px;display:inline-flex;align-items:center;justify-content:center;background:none;border:1px solid var(--action-line);border-radius:var(--radius-pill);padding:0;color:var(--on-surface);cursor:pointer')}><TextSwap><IconClose /></TextSwap></button>
        </div>
      </header>

      <div ref={vals.overlayBandsRef} role="group" aria-label="Palette swatches" style={sx('display:flex;flex:1;min-height:0;width:100%')}>
        {overlay.bands.map((b) => (
          <div key={b.sid} data-oband="1" data-sid={b.sid} role="group" aria-label={b.groupAria} style={b.style}>
            <div data-ochrome="1" style={sx('display:flex;flex-direction:column;gap:8px')}>
              <span style={b.weightStyle}>{b.weightPct}</span>
            </div>
            <button type="button" data-ix="icon" data-info="1" data-focus="swatch" aria-haspopup="dialog" aria-label={b.harmonyAria} onClick={b.onHarmony} style={b.infoBtnStyle}>
              <IconHarmony size={14} />
            </button>
            <div data-ochrome="1" style={b.valuesWrap}>
              {b.values.map((v) => (<ValueRow key={v.key} v={v} showCaveat={true} />))}
            </div>
          </div>
        ))}
      </div>

      <footer data-ochrome="1" style={sx('display:flex;align-items:flex-start;justify-content:space-between;gap:28px;padding:22px var(--page-gutter);border-top:1px solid var(--line-strong);flex:none')}>
        <div style={sx('flex:1;min-width:0;display:flex;flex-direction:column;gap:14px')}>
          <div style={sx('display:flex;flex-wrap:wrap;gap:8px')}>
            {overlay.descriptors.map((d, di) => (<span key={di} style={vals.pill}>{d}</span>))}
          </div>
          {/* The same row as the result view's, deliberately: same order, same division, same
              weights. A palette opened fullscreen from the archive must not re-teach the user a
              different set of controls. The hairline divides by consequence — ahead of it the act
              that leaves something behind, behind it the ones that only read the palette back
              to you, Contrast first because inspecting comes before copying. (No Share here: the
              overlay has no shareable URL, so the group behind the hairline is a trio, not four.) */}
          <div style={sx('display:flex;align-items:center;gap:8px;flex-wrap:wrap')}>
            {/* Filing leads here, as it does on the result view: the act that is first in the
                sequence and available — organise, then validate, then output. */}
            <B006 data-emphasis="primary" onClick={overlay.onAssign} aria-haspopup="dialog" aria-label={overlay.assignAria} label={assignB006Label(overlay.assignLabel)} />
            <div style={sx('display:flex;align-items:center;gap:8px;flex-wrap:nowrap;padding-inline-start:8px;border-inline-start:1px solid var(--line-strong)')}>
              <B006 data-emphasis="secondary" onClick={vals.openContrast} disabled={vals.contrastDisabled} aria-haspopup="dialog" aria-label="Open contrast checker for this palette" label={contrastB006Label} />
              <CopyControl open={vals.copyMenuOpen} owns done={overlay.copyDone} name={overlay.name} onToggle={vals.toggleCopyMenu} onKey={vals.copyMenuKey} onHex={overlay.copyHexList} onCss={overlay.copyCss} itemStyle={vals.copyItemStyle} />
              <B006 data-emphasis="secondary" onClick={vals.openExport} aria-haspopup="dialog" aria-label="Export this palette as design tokens" label={exportB006Label} />
            </div>
          </div>
        </div>
        <p style={sx("max-width:380px;flex:none;font-family:'Neue Montreal';font-size:var(--fs-lead);line-height:1.5;color:var(--on-surface-muted);text-align:end;margin:0;text-wrap:pretty")}>{overlay.rationale}</p>
      </footer>
    </div>
  );
}

// ============================== TAG FILTER DRAWER ==============================
// Same family as the contrast + harmony drawers, deliberately: right drawer, dimmed blurred
// backdrop, small label over a display title, Close in the header corner, sections that stagger in
// on ONE reversible timeline (overlays.js drives it), Escape/backdrop/Close all reverse. What the
// dropdown could never afford, the drawer spends on context: every tag with the dominant colour of
// every palette that carries it — the tag's meaning shown in ink before it is clicked.
// The facet row's name, shared by both groups — they are one grammar, so they are one style, at one
// size. The accessibility states briefly sat two steps smaller than the tag names; a row is a row
// whichever group it is in, and the panel reads as one list of choosables only if they match.
// Capitals, not caps: a filter list is a list of NAMES (Text-Ready, Graphic, Coastal), and uppercase
// made them read as labels of something rather than the things themselves. The system keeps
// uppercase for what it has always meant here — chrome that labels a control (ARCHIVE FILTER,
// COUNT, A–Z) — so dropping it from the names is what tells the two apart at a glance.
// Medium at every state, not 400→500 on selection: the name is the row's subject and now outranks
// its count and its example by weight instead of by having been clicked. Selection is carried by
// the checkbox, which changes shape, fill AND glyph (SC 1.4.1), and by aria-pressed — the weight
// step was never the accessible signal, only a second one.
// A GROUP DIVIDER THAT DRAWS, and the reason it is an element rather than a border.
//
// A border cannot perform: it belongs to the box it is on, so it can only fade with it. The rules
// BETWEEN content groups are structure — they say where one thing ends and the next begins — and in
// this app structure draws, left to right, on the loader bar's scaleX-from-origin-0 (see the result
// view's [data-meta-line] block, which is the same mechanic and the same reason).
//
// The border it replaces stays in place as `transparent`, so the box model is byte-identical and no
// padding token has to be re-derived; this span sits on top of that reserved pixel. Statically — no
// GSAP, reduced motion — it is a plain visible hairline, because the transform is only ever applied
// by the timeline.
//
// This is NOT used for the hairline between two rows of a list. That one belongs to its row and
// arrives with it; a list whose separators drew independently of the rows they separate would read
// as two things arriving rather than one.
const OvRule = ({ edge }) => (
  <span data-ov-rule="1" aria-hidden="true" style={sx('position:absolute;left:0;right:0;' + (edge || 'top') + ':-1px;height:1px;background:var(--line);transform-origin:0% 50%;pointer-events:none')}></span>
);
const facetLabelStyle = sx('font-family:Neue Montreal;font-size:var(--fs-body);letter-spacing:var(--track-flat);text-transform:capitalize;white-space:nowrap;flex:none;font-weight:500');
// The measured groups' labels arrive already cased — Text-Ready, Limited Text, Dark, Warm — so they
// are printed as authored. Capitalize exists for the TRAIT rows, whose terms are stored lowercase
// ('graphic', 'nostalgic') and have no casing of their own; it stays on those and comes off these.
// It would be a no-op on today's measured labels, which is exactly why it must not be there: the
// next label that is not already Title Case would be silently rewritten by a stylesheet.
// Everything else about the two is identical, which is the point: one row grammar, two casing
// sources.
const measuredLabelStyle = sx('font-family:Neue Montreal;font-size:var(--fs-body);letter-spacing:var(--track-flat);white-space:nowrap;flex:none;font-weight:500');

// ============================== THE LIBRARY PANEL ==============================
// ONE PANEL, TWO TABS: what is being held back (Filter) and what the library is divided into
// (Projects). They were two surfaces — this drawer and a centred Manage Projects dialog — reached
// from two buttons a row apart, and the split was in the interface rather than in the work: a
// project IS a filter you made yourself, and every question that spans the two ("which of the
// palettes in Coastal can hold text?") meant closing one surface to open the other.
//
// The manage dialog's content arrives here unchanged in substance — create, rename, export, delete,
// same handlers, same wording — and changes in exactly two ways, both consequences of the surface
// it landed on. It is NON-MODAL now, so the library stays visible and operable behind it, and it
// is a drawer section rather than a centred sheet, so it takes the drawer's gutters and its
// arrival. What it gains is the tab beside it.
//
// The dialog's own focus trap went with the modality: there is nothing to trap when Tab is meant
// to leave. The pending-rename commit that a trap used to make unnecessary is now explicit — see
// _commitProjectNames in overlays.js, which runs on the way out.
function LibraryDrawer({ vals }) {
  if (!vals.facetOpen) return null;
  return (
    // NON-MODAL. Filtering is iterative — adjust, look, adjust — and a modal made every refinement
    // a round trip: open, pick, close, evaluate, reopen. The wrapper no longer intercepts anything
    // (pointer-events:none, restored on the panel itself), the dimming backdrop is gone because it
    // hid the very list you are filtering, and there is no aria-modal and no focus trap: Tab leaves
    // the panel into the page, which is the honest behaviour for a surface that does not own the
    // screen. Escape still closes and returns focus to the trigger.
    // z-index 156 — above the fixed brand mark (155), unlike the modal drawers at 120. Those can
    // sit under it because their dimming backdrop subsumes the logo; this one has no backdrop, so
    // at 120 the wordmark printed straight through the panel header. Still below the wipe (160),
    // lightbox (170) and loader (190), which are whole-screen states that outrank any panel.
    <div style={sx('position:fixed;inset:0;z-index:156;pointer-events:none')}>
      <div data-library-dialog="1" data-lenis-prevent="1" role="dialog" aria-label="Manage Library" style={sx('position:absolute;right:0;top:0;bottom:0;width:480px;max-width:94vw;pointer-events:auto;background:var(--surface);border-left:1px solid var(--line-strong);box-shadow:-18px 0 40px rgba(0,0,0,.10);display:flex;flex-direction:column;overflow-y:auto')}>
        {/* STICKY, and it is the state that makes it necessary rather than the title. The count, the
            applied chips and Clear all are what you consult while choosing, and the Character list
            is long enough that choosing scrolls all three off the top — so the panel answered "did
            that help?" only if you happened to be near the top of it. Sticky inside the panel's own
            scroll container, opaque, so rows pass underneath rather than through. */}
        <header data-tg-sec="1" style={sx('position:sticky;top:0;z-index:3;display:flex;flex-direction:column;gap:10px;padding:20px var(--page-gutter) 12px;background:var(--surface);border-bottom:1px solid transparent')}>
          <OvRule edge="bottom" />
        <div style={sx('display:flex;align-items:flex-start;justify-content:space-between;gap:12px')}>
          <div style={sx('display:flex;flex-direction:column;gap:9px;min-width:0')}>
            {/* ONE TITLE, AND IT NAMES THE SURFACE RATHER THAN THE TAB. "Filter Library" named what
                was then the whole panel; it is now one of two things this panel does, and it is
                said by the tab below rather than twice over. */}
            <span style={sx('display:flex;align-items:center;gap:9px;min-width:0')}>
              <span data-drawer-split="1" style={sx("font-family:'Neue Montreal';font-weight:500;font-size:var(--fs-subtitle);letter-spacing:-.01em;color:var(--on-surface)")}>Manage Library</span>
              {/* THE PANEL'S ⓘ STOOD HERE and is removed by request, as the Library heading's was.
                  It carried two things. The first was the combining rule — pick more than one value
                  in a group to widen, combine groups to narrow — which has no other home in the
                  interface; it is a mechanic the counts demonstrate the first time you read two of
                  them, and that is now the only place it is stated.
                  The second was the definition of the three text-usability bands, and that one
                  survives intact: every row in that group already carries its own definition in
                  `title` and repeats it in the accessible name ("3 or more colour pairs meet WCAG AA
                  for normal text"), so the words are still one hover away from the row they define
                  rather than two clicks away in a sheet about the panel.
                  renderVals keeps filterInfoOpen, toggleFilterInfo, filterInfoKey and a11yDefs, all
                  now unread. */}
            </span>
            {/* THE COUNT IS PRINTED NOW, not only spoken. It was a bare live region on the argument
                that the list behind is undimmed and can be read directly — true when the panel is
                480px of a wide window, false at 94vw on a laptop, where the panel IS the view. It
                keeps role=status, so it is still announced rather than only redrawn. */}
            {/* The metadata voice — the same sentence, size and ink as the toolbar's "Showing x of
                y" outside, because it IS the same fact. The drawer is library-owned chrome, so it
                speaks the library's voices (see the contract in docs/interface-audit.md); only the
                result-stage drawers keep the uppercase label voice. */}
            {/* The running "8 palettes" count stood here and is removed by request. It was also
                this panel's aria-live region, so the announcement it carried is worth accounting
                for rather than dropping quietly: FeedSection keeps a page-level
                role="status" holding vals.resultSummary, which is driven by the same filter state,
                so a screen reader is still told what the library came back with when a facet is
                toggled — it is announced once, from the list, instead of twice. vals.matchLabel is
                now unread. */}
          </div>
          {/* IT SAID DONE, AND THE WORD WAS ALWAYS DOING TWO JOBS. Done answers "is anything
              pending?" — nothing is: a facet applies the moment it is picked and a project the
              moment it is named, so leaving cancels nothing and confirms nothing. That fact is now
              carried by the panel's behaviour rather than by a label, and what is left for the
              control to say is simply the way out. Which is the close mark the app already draws
              everywhere else it offers one, at the same 32px circle as the trigger that opened the
              panel: the same shape lets you in and lets you out.
              The accessible name changes with the glyph — "Close the library panel", not "Done,
              close the library panel", because there is no visible word for it to lead with any
              more. data-drawer-act stays: it is what gives this control the pill and keeps the
              press tint off a button whose swap does that job. */}
          <button type="button" data-drawer-act="" data-ix="press" data-focus="chrome" onClick={vals.closeFacet} aria-label="Close the library panel" title="Close" style={sx('flex:none;width:32px;height:32px;display:inline-flex;align-items:center;justify-content:center;background:none;border:1px solid var(--action-line);padding:0;color:var(--on-surface);cursor:pointer')}><TextSwap><IconClose /></TextSwap></button>
        </div>
        {/* THE TWO VIEWS OF THE LIBRARY, on the app's own segmented control — the same object as
            List / Grid / 3D one band away, down to the travelling pill, because it is the same kind
            of choice: which view of this thing am I looking at. It is a switch and not a pair of
            links, so it takes aria-pressed rather than tab semantics, exactly as the view toggle
            does; aria-controls names the region below that it redraws, and each press announces the
            tab it landed on (see setLibraryTab) since the change happens out of the reading order.

            CONTENT-SIZED AND AT THE LEADING EDGE, exactly like the view toggle it copies. It ran
            the full 480px for a while, on the argument that a sheet whose two tabs share its whole
            measure states there are two of everything and no more. What that actually produced was
            a 430px bar of mostly empty pill: the labels sat marooned in the middle of their halves,
            and the strip read as a header rule rather than as a control you press. Sized to its own
            labels it is a control again, and it starts where every other line in this panel starts.
            inline-grid with two 1fr tracks, not two auto ones: 1fr resolves both columns to the
            wider label, so FILTER and PROJECTS keep equal halves and the pill's 50% stays true.
            align-self:flex-start because the header is a flex column — without it the strip would
            stretch back across the sheet whatever its display says.

            THE LABELS SPEAK IN CAPS, which is an exception the stylesheet has to grant: the drawer
            puts its controls into a sheet's sentence case, and these two are not sheet furniture but
            the navigation the panel is steered by — the same object as LIST / GRID / 3D and the
            scope chips a few pixels outside it. See the [data-lib-tab] rule in global.css. */}
        <div role="group" aria-label="Library panel view" data-lib-tabs="1" style={sx('position:relative;align-self:flex-start;display:inline-grid;grid-template-columns:repeat(2,1fr);padding:2px;border:1px solid var(--action-line);background:transparent')}>
          <span aria-hidden="true" style={vals.libTabPill}></span>
          {vals.libTabs.map((t) => (
            <button key={t.key} type="button" data-lib-tab={t.key} data-ix="seg" data-focus="chrome" aria-pressed={t.active} aria-controls="library-panel" aria-label={t.aria} onClick={t.onClick} onKeyDown={vals.libTabKey} style={t.style}>
              <TextSwap>{t.label}</TextSwap>{t.count && <span style={t.countStyle}>{t.count}</span>}
            </button>
          ))}
        </div>
        {/* THE PANEL'S COPY OF THE APPLIED CHIPS STOOD HERE and is removed by request. It pinned one
            removable chip per applied value to the header, plus a Clear Filter, so that a selection
            never scrolled out of reach of the list that made it.
            WHAT MAKES IT REDUNDANT IS THE LIST ITSELF. Every applied value is a row a few pixels
            below with its checkbox filled — the state is already on the control that sets it, and a
            chip above it was the same fact said twice, in two shapes, on one surface. The Filter tab
            still carries the count, so the panel says HOW MANY without listing them again.
            THE STATE IS NOT LOST WHEN THE PANEL IS SHUT: the toolbar outside keeps the chips and the
            clear-all, and that row is exempt from the panel's dismiss-on-outside-press (see
            _facetOutside and data-applied-filters), so it can be used with the panel still open.
            THE CLEAR-ALL WENT BACK OUT WITH THEM. It lived here alone for one revision, on the
            argument that the rows cannot clear themselves in one press — true, and it put a filter
            control on the surface whose whole claim is that the rows ARE the filter state. Both the
            chips and the clear-all belong to the same row outside, where they survive the panel
            being shut; the panel keeps the count on its Filter tab and nothing else.
            renderVals still supplies appliedTags, hasAppliedTags and facetClear, all now unread —
            the row outside builds its own from appliedTags and onClearAll. */}
        </header>

        {/* THE SWITCHED REGION, named by the tabs that redraw it (aria-controls above) and marked
            for the arrival on tab change — see setLibraryTab, which re-runs the drawer's own block
            stagger over whatever this now holds. One wrapper for both tabs, so the two can never
            arrive differently. */}
        <div id="library-panel" data-library-panel="1">

        {vals.libTab === 'filter' && (<>

        {/* NOTHING TO FILTER YET is a state this panel could not previously be in: the trigger used
            to require a facet to exist before it appeared at all. It can now be opened for the
            Projects tab alone, so the Filter tab has to be able to say that there is nothing here
            and why — a library with no palettes in it has no traits to narrow by. */}
        {!vals.showFacet && (
          <div data-tg-sec="1" role="status" style={sx('display:flex;flex-direction:column;gap:8px;padding:20px var(--page-gutter) 26px')}>
            <span style={sx("font-family:'Neue Montreal';font-weight:500;font-size:var(--fs-lead);color:var(--on-surface)")}>Nothing to filter yet</span>
            <span style={sx('font-family:Neue Montreal;font-size:var(--fs-detail);line-height:1.5;color:var(--on-surface-muted);text-wrap:pretty')}>Filters are built from what your palettes are made of, so they arrive with the first one you save.</span>
          </div>
        )}

        {/* ACCESSIBILITY — a facet, and the first one, because "can I build with this?" outranks
            "what mood is it?". Exhaustive: every palette holds exactly one state, so the group
            always partitions the archive. OR within the group (a palette cannot be two states, so
            AND would be unsatisfiable); AND against tags. Same checkbox, count and zero-suppression
            rules as the tag rows — one grammar for every facet. */}
        {vals.hasA11yOptions && (
          <div data-tg-sec="1" style={sx('padding:18px calc(var(--page-gutter) - 12px) 0')}>
            {/* No eyebrow, no note of its own — both moved into the panel's one paragraph above.
                The group keeps its name for assistive tech on the role="group" below, which is
                where it was always doing the load-bearing work. */}
            {/* An eyebrow, now that this group has siblings. Alone it needed no name; sat above
                Lightness and Temperature without one, it read as a preamble to them rather than as
                a group of its own rank.
                "Contrast potential" named a capacity and left the reader to guess the unit; "AA text
                coverage" named the measurement, which made the group read as a compliance report.
                Text usability names the QUESTION the group answers — can I set type in this — which
                is why anyone opens it. */}
            <span style={sx('display:block;font-family:Neue Montreal;font-size:var(--fs-micro);letter-spacing:var(--track-flat);text-transform:uppercase;color:var(--on-surface-muted);padding:0 12px 6px')}>Text usability</span>
            <div role="group" aria-label="Filter by text usability" onKeyDown={vals.onFacetListKey} style={sx('display:flex;flex-direction:column')}>
              {vals.a11yOptions.map((o) => (
                <button key={o.key} type="button" data-tg-cell="1" data-ix={o.disabled ? undefined : 'cell'} data-focus="chrome" aria-pressed={o.pressed} aria-disabled={o.disabled ? 'true' : undefined} aria-label={o.aria} title={o.title} onClick={o.onPick} style={sx('display:flex;align-items:center;gap:11px;width:100%;text-align:left;background:none;border:none;border-bottom:1px solid var(--line);padding:var(--btn-pad-lg);font:inherit;' + (o.disabled ? 'cursor:default;color:var(--on-surface-muted)' : 'cursor:pointer;color:var(--on-surface)'))}>
                  <FacetMark active={o.active} unavailable={o.disabled} />
                  <span style={measuredLabelStyle}>{o.label}</span>
                  {/* THE COUNT IS A COLUMN AGAIN. It sat against its label — "count belongs to the
                      label, so it sits against it" — and that is true of the pairing and false of
                      the reading: with the label flex:none the number landed wherever the word
                      happened to end, so eleven rows put eleven figures at eleven different x
                      positions and the one thing you scan a facet list for could not be scanned.
                      margin-inline-start:auto sends it to the row's trailing edge, tabular-nums
                      keeps the digits on one grid, and the row's own --btn-pad-lg puts every number
                      on the same 16px inset the rest of the panel uses. */}
                  <span style={sx('margin-inline-start:auto;font-family:Neue Montreal;font-size:var(--fs-micro);color:var(--on-surface-muted);font-variant-numeric:tabular-nums;flex:none')}>{o.count}</span>
                  {/* A fourth span stood here on all three facet lists, right-aligned and holding
                      o.reason — "Every palette here" — whenever an option was disabled. Removed by
                      request. It was also the row's flex spacer at flex:1, and nothing takes that
                      over: mark, label and count are all intrinsically sized, so the row is simply
                      left-packed now and those three keep the positions they had.

                      The data is untouched: renderVals still computes `reason` on both measured
                      facets and it is now unread. That file is left alone on purpose — it carries
                      another branch's work — so this is a markup removal rather than a feature one,
                      and putting the line back is one span. o.disabled still does its real job: it
                      drives aria-disabled, the cursor, the muted colour and FacetMark's unavailable
                      state, none of which depended on the copy. */}
                  {/* Nothing at the row's end now but the occasional reason an inert row cannot be
                      picked. The state's meaning left this line for the note above the group: three
                      right-aligned fragments, one per row, clipped to whatever the panel had left,
                      asked the eye to assemble a definition out of a column. */}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* THE OTHER TWO MEASURED FACETS. Same grammar as Text usability above — checkbox, label,
            count — because they are the same kind of statement about a palette.
            THESE WORDS ARE NOW EXCLUSIVELY THEIRS. Warm, Cool, Dark and Light were also interpretive
            traits until the taxonomy change (see src/lib/taxonomy.js), so selecting the measured
            Temperature → Warm still left an interpretive `warm` on offer below, meaning something
            else. A dimension owns its domain words. */}
        {vals.hasMeasured && vals.measuredGroups.map((g) => (
          <div key={g.id} data-tg-sec="1" style={sx('padding:14px calc(var(--page-gutter) - 12px) 0')}>
            <span style={sx('display:block;font-family:Neue Montreal;font-size:var(--fs-micro);letter-spacing:var(--track-flat);text-transform:uppercase;color:var(--on-surface-muted);padding:0 12px 6px')}>{g.label}</span>
            <div role="group" aria-label={'Filter by ' + g.label.toLowerCase()} onKeyDown={vals.onFacetListKey} style={sx('display:flex;flex-direction:column')}>
              {g.options.map((o) => (
                <button key={o.key} type="button" data-tg-cell="1" data-ix={o.disabled ? undefined : 'cell'} data-focus="chrome" aria-pressed={o.pressed} aria-disabled={o.disabled ? 'true' : undefined} aria-label={o.aria} onClick={o.onToggle} style={sx('display:flex;align-items:center;gap:11px;width:100%;text-align:left;background:none;border:none;border-bottom:1px solid var(--line);padding:var(--btn-pad-lg);font:inherit;' + (o.disabled ? 'cursor:default;color:var(--on-surface-muted)' : 'cursor:pointer;color:var(--on-surface)'))}>
                  <FacetMark active={o.active} unavailable={o.disabled} />
                  <span style={measuredLabelStyle}>{o.label}</span>
                  <span style={sx('margin-inline-start:auto;font-family:Neue Montreal;font-size:var(--fs-micro);color:var(--on-surface-muted);font-variant-numeric:tabular-nums;flex:none')}>{o.count}</span>
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* THE CHARACTER TRAITS DISCLOSURE WAS HERE and has been removed by request. It was the
            heading-and-chevron row that opened the interpretive facets — the reading that Graphic
            and Smouldering are judgements about a palette while lightness and temperature are
            measurements of it. The drawer now ends after the three measured groups.

            WHAT IS LEFT BEHIND, AND WHY IT IS NOT AN OVERSIGHT: the block below still exists in
            full — the trait search field, the Most-used / A–Z sort and the tag list — but it is
            gated on vals.charOpen, and the control that could set that flag was the button removed
            here. So it renders never. It is left in place rather than deleted for the same reason
            the backup menu's handlers were: bringing the section back should be a button, not a
            rebuild, and this is ~360 lines of working UI that nothing else can reach or damage.
            renderVals still supplies charOpen, toggleChar, charAria and charLabel, now unread.

            Say the word if the whole section should go; it comes out as one contiguous block. */}
        {vals.charOpen && (<div data-facet-char="1">

        {/* No heading and no explanation over the tag list. The search field, the Count/A–Z toggle
            and a column of tag rows say what this is without a label on top of them, and the
            sentence that used to sit here explained a counting rule that the counts demonstrate the
            first time you read two of them. The group keeps its accessible name (aria-label on the
            list below), so nothing is lost to a screen reader. */}

        {/* A bordered field, not an underlined line of text — the old styling read as a heading,
            so the one control you are meant to type into did not look like an input. Clear button
            appears only when there is something to clear, and hands focus back to the field. */}
        <div data-tg-sec="1" style={sx('padding:16px var(--page-gutter) 0;display:flex;align-items:center;gap:8px')}>
          <div style={sx('flex:1;min-width:0;display:flex;align-items:center;gap:6px;border:1px solid var(--action-line);background:var(--surface-raised);padding:0 8px 0 10px')}>
            {/* Named for its SCOPE. "Search tags" sat inside a panel with four groups in it and
                read as a search of the filter, or of the Library; it reaches the character traits
                below and nothing else. */}
            <input data-facet-search="1" data-focus="field" type="text" value={vals.tagQuery} onChange={vals.onTagQuery} placeholder="Search character traits" aria-label="Search character traits" style={sx('flex:1;min-width:0;background:transparent;border:none;padding:9px 0;font-family:Neue Montreal;font-size:var(--fs-detail);letter-spacing:var(--track-flat);color:var(--on-surface)')} />
            {vals.hasTagQuery && (
              <button type="button" data-ix="press" data-focus="chrome" onClick={vals.clearTagQuery} aria-label="Clear search" style={sx('flex:none;width:18px;height:18px;display:inline-flex;align-items:center;justify-content:center;background:none;border:none;padding:0;font-family:Neue Montreal;font-size:var(--fs-label);color:var(--on-surface-muted);cursor:pointer')}>✕</button>
            )}
          </div>
          {/* sort: discovery vs known-item lookup, on the existing segmented toggle style.
              "Count" named the mechanism and, set in the app's filled toggle beside a plain search
              field, read as the panel's primary action — a sort state impersonating a CTA. "Most
              used" names the ordering instead, which is the thing being chosen. */}
          <div role="group" aria-label="Sort character traits" style={sx('display:flex;align-items:center;gap:6px;flex:none')}>
            <button type="button" data-ix="seg" data-focus="chrome" aria-pressed={vals.tagSort === 'count'} onClick={vals.sortByCount} style={vals.sortCountStyle}><TextSwap>Most used</TextSwap></button>
            <button type="button" data-ix="seg" data-focus="chrome" aria-pressed={vals.tagSort === 'alpha'} onClick={vals.sortByAlpha} style={vals.sortAlphaStyle}>A–Z</button>
          </div>
        </div>

        <div data-tg-sec="1" role="group" aria-label="Character traits" onKeyDown={vals.onFacetListKey} style={sx('display:flex;flex-direction:column;padding:10px calc(var(--page-gutter) - 12px) 26px')}>
          {vals.facetOptions.map((o) => (
            <button key={o.key} type="button" data-tg-cell="1" data-ix={o.disabled ? undefined : 'cell'} data-focus="chrome" aria-pressed={o.pressed} aria-disabled={o.disabled ? 'true' : undefined} aria-label={o.aria} onClick={o.onPick} style={sx('display:flex;align-items:center;gap:11px;width:100%;text-align:left;background:none;border:none;border-bottom:1px solid var(--line);padding:var(--btn-pad-lg);font:inherit;' + (o.disabled ? 'cursor:default;color:var(--on-surface-muted)' : 'cursor:pointer;color:var(--on-surface)'))}>
              {/* A checkbox, not a dot that appears. The old marker was invisible when unselected,
                  so an unpicked row showed nothing where its state should be — the affordance only
                  existed once you had already used it. This box is always present and states which
                  of two states it is in: empty outline → filled with a check. Shape, fill AND glyph
                  all change, so it never rests on colour (SC 1.4.1). aria-pressed on the row button
                  carries the same fact to assistive tech. */}
              <FacetMark active={o.active} unavailable={o.disabled} />
              <span style={facetLabelStyle}>{o.label}</span>
              {/* Same placement as the measured groups above: a trailing column, on the same inset.
                  It was parked against the label for a while — the argument being that a number
                  belongs to its noun — and the argument holds right up until there are eleven of
                  them and none of them line up. What made the old right-hand column wrong was the
                  150px colour strip that used to sit between the name and its number; the strip is
                  gone, so the column is just a column. */}
              <span style={sx('margin-inline-start:auto;font-family:Neue Montreal;font-size:var(--fs-micro);color:var(--on-surface-muted);font-variant-numeric:tabular-nums;flex:none')}>{o.count}</span>
              {/* Checkbox, label, count — the same three things every facet row now shows. An
                  exemplar name and a 150px colour strip used to sit here: a sample of ONE palette
                  standing in for a whole tag, which invited the reader to generalise from it, and
                  a second colour object competing with the swatch strips in the list behind. */}
            </button>
          ))}
          {/* An empty state that says what happened and offers the way out, rather than a dead
              two-word label. It also covers the non-search case: if a selection has narrowed the
              archive so far that no further tag would leave anything, the list is empty for a
              different reason and should say so. */}
          {vals.facetEmpty && (
            <div role="status" style={sx('display:flex;flex-direction:column;align-items:flex-start;gap:10px;padding:16px 2px')}>
              <span style={sx('font-family:Neue Montreal;font-size:var(--fs-detail);line-height:1.5;color:var(--on-surface-muted);text-wrap:pretty')}>
                {vals.hasTagQuery ? 'No character trait matches “' + vals.tagQuery + '”.' : 'No further trait would narrow this selection.'}
              </span>
              {vals.hasTagQuery && (
                <button type="button" data-ix="press" data-focus="chrome" onClick={vals.clearTagQuery} style={sx('background:none;border:1px solid var(--action-line);padding:var(--btn-pad-md);font-family:Neue Montreal;font-size:var(--fs-label);letter-spacing:var(--track-flat);color:var(--on-surface);cursor:pointer')}><TextSwap>Clear search</TextSwap></button>
              )}
            </div>
          )}
          {/* A RANKED SHORT SET, then the rest on demand. The full vocabulary turned the interpretive
              layer into the panel's dominant task — a column of twenty rows under three groups of
              three, which is a hierarchy stated in height. The first six by the active ordering are
              where the answer almost always is; Show all is one press away and never hides a
              SELECTED trait, which stays listed whatever the cut is (see facetOptions). */}
          {vals.facetMore && (
            <button type="button" data-tg-cell="1" data-ix="press" data-focus="chrome" aria-expanded={vals.facetAllOpen} aria-label={vals.facetMore.aria} onClick={vals.facetMore.onToggle} style={sx('align-self:flex-start;margin-top:12px;display:inline-flex;align-items:center;gap:8px;background:none;border:1px solid var(--action-line);padding:var(--btn-pad-md);font-family:Neue Montreal;font-size:var(--fs-label);letter-spacing:var(--track-flat);color:var(--on-surface);cursor:pointer')}>
              <span data-disc-chev="1" data-open={vals.facetAllOpen ? '1' : '0'} aria-hidden="true" style={sx('font-size:var(--fs-nano);color:var(--on-surface-muted)')}>▸</span>{vals.facetMore.label}
            </button>
          )}
          {/* Clear all is gone from here. It sat at the bottom of the longest list in the panel, so
              the control that undoes a narrowing was furthest from the rows that caused it; it is in
              the sticky header now, beside the count it acts on. */}
        </div>
        </div>)}

        </>)}

        {/* ===== PROJECTS — the manage dialog's whole content, one tab over =====
            Same three acts in the same order as the dialog it replaces: name one, then the rows,
            each row being a project and the two things you can do to it as a whole. The handlers
            are the dialog's handlers untouched (manageView in renderVals), so nothing about what a
            project IS changed here — only where you stand while working on it. */}
        {vals.libTab === 'projects' && vals.manage && (<>

        {/* THE FIELD FIRST, because a panel of folders you cannot add to is a list, not a manager.
            Enter and the button do the same thing (see manage.onCreateKey) — a name typed and then
            confirmed by the keyboard should not need the mouse to land. */}
        <div data-tg-sec="1" style={sx('padding:18px var(--page-gutter) 0')}>
          {/* THE ACT LIVES IN THE FIELD NOW, not beside it. A name and the button that commits it
              are one thought, and as two objects with an 8px gap they read as two: type here, then
              go over there. Inside, the chevron is where your eye already is when you stop typing —
              the same place Enter is (manage.onCreateKey), which is the route most people take.

              THE FIELD DID NOT GROW TO MAKE ROOM. It keeps its own box, its own border, its own
              radius and its 35.5px height; the button is positioned against the inside of that box
              rather than laid out in the row, so nothing about the input answers to it. What DOES
              answer to it is the input's trailing padding: 40px, which is the button's 28 plus its
              4px inset plus 8 of clearance, so a long project name runs under the caret and stops
              before the disc rather than under it.

              4px OF INSET ON THREE SIDES, and the height falls out of it: inset-block:4px against a
              35.5px field leaves 27.5, and 28 of width makes it a circle at --radius-pill without
              either number being a guess about the other. No transform anywhere — the press
              contract is a colour change in this app, and a control centred by a transform is one
              that would have to fight it. inset-inline-end, so the disc sits at the end of the
              reading direction rather than at the right of the screen. */}
          <div style={sx('position:relative;display:flex')}>
            {/* NO RAISED FILL. All three of the app's name fields sat on --surface-raised, which is
                a lighter plate meant to lift a surface off the page — and these sit ON a --surface
                sheet, so the plate lifted them off nothing and read as a second ground inside the
                first. The stadium's own hairline is what says "type here"; the fill was saying it a
                second time, more loudly, in a panel whose whole point is that its rows are quiet.
                THE FIELD IS A STADIUM AND ITS INSET GREW WITH IT. 11px of leading padding put the
                placeholder against the widest point of an 18px arc; 18 clears it — and 18 is the
                figure the rows below use too, so every piece of text inside a control on this
                surface starts on the same column. (The toast keeps 16: it is a 48px bar with a
                deeper arc and a leading inset chosen for it by hand.) */}
            <input data-manage-new="1" data-focus="field" type="text" maxLength={60} placeholder="Project name" aria-label="Name a new project" onKeyDown={vals.manage.onCreateKey} style={sx("flex:1;min-width:0;background:var(--surface);border:1px solid var(--action-line);border-radius:var(--radius-pill);padding:11px 44px 11px 18px;font-family:'Neue Montreal';font-size:var(--fs-body);color:var(--on-surface)")} />
            {/* Filled --on-surface, unlike the toast's outlined pair: this is the one act on the tab
                that commits something, and fill is how this system says primary. A GLYPH CARRIES ITS
                NAME: aria-label states the act, title hands the word to a pointer, and the swap runs
                on it exactly as it does on every other mark now. */}
            <button type="button" data-manage-add="1" data-ix="cta" data-focus="chrome" onClick={vals.manage.onCreate} aria-label="Create project" title="Create" style={sx('position:absolute;inset-block:4px;inset-inline-end:4px;width:32px;display:inline-flex;align-items:center;justify-content:center;background:var(--on-surface);border:1px solid var(--on-surface);border-radius:var(--radius-pill);padding:0;color:var(--surface);cursor:pointer')}><TextSwap><IconChevronRight size={12} /></TextSwap></button>
          </div>
        </div>

        {/* The empty state is the one place a folder can be explained without the explanation
            becoming permanent furniture: it is gone the moment there is a project to look at.
            THREE SENTENCES, THREE JOBS, NO CLAUSES. It ran as one 27-word sentence with an em dash
            holding the last third on, and the dash was doing the work a full stop does: "what is a
            project FOR" is the question, so the answer gets its own sentence instead of being
            appended to the instructions. "Name one above" over "Create one above" because the field
            it points at asks for a name, and "from any row" drops the detail view, which is the
            second place you can do it rather than a thing you need telling. */}
        {vals.manage.empty && (
          <div data-tg-sec="1" style={sx("padding:16px var(--page-gutter) 26px;font-family:'Neue Montreal';font-size:var(--fs-detail);line-height:1.5;color:var(--on-surface-muted);text-wrap:pretty")}>No projects yet. Name one above, then move palettes in from any row. A project exports as one set of tokens.</div>
        )}

        {/* THE ROW IS THE PROJECT: its name, how much is in it, and the two things you can do to it
            as a whole. The count sits INSIDE the name field (see the note on manageView.count) and
            what it paid for is the Export button — the act a folder existed for and did not have.
            Order is name → export → delete: the constructive act sits next to the thing it acts on,
            and the destructive one stays at the far edge where it is hardest to hit by accident.
            data-tg-cell on the row, so a project arrives on the same per-item stagger a facet row
            does — this panel is a list of things too, and the drawer only knows that from the hook. */}
        {!vals.manage.empty && (
        <div data-tg-sec="1" style={sx('padding:14px var(--page-gutter) 26px;display:flex;flex-direction:column;gap:8px')}>
          {vals.manage.rows.map((pr) => (
            <div key={pr.id} data-tg-cell="1" style={sx('display:flex;align-items:center;gap:8px')}>
              <span style={sx('position:relative;flex:1;min-width:0;display:flex')}>
                {/* padding-right clears the numeral's column so a long project name runs under the
                    caret, never under the count.
                    BOTH INSETS MOVED WITH THE CORNER. The field is a stadium now, so 11px of leading
                    padding put the name against the widest point of an 18px arc and 11px of trailing
                    inset did the same to the numeral. 18 on both edges — the SAME 18 the rows in this
                    panel and both dialogs use, so a field and a row put their text on one column
                    instead of two. The padding-right follows the numeral rather than being chosen:
                    the inset, plus the digits, plus the clearance the name needs from them. */}
                <input data-proj-name={pr.id} data-focus="field" type="text" maxLength={60} key={pr.id + '|' + pr.name} defaultValue={pr.name} onBlur={pr.onRename} onKeyDown={pr.onRenameKey} aria-label="Rename project" aria-describedby={'projn-' + pr.id} style={sx("width:100%;min-width:0;background:var(--surface);border:1px solid var(--line);border-radius:var(--radius-pill);padding:9px 44px 9px 18px;font-family:'Neue Montreal';font-size:var(--fs-body);color:var(--on-surface)")} />
                {/* The numeral is painted; the noun is spoken. A bare "8" announced after a project
                    name is a quantity of nothing in particular, and aria-label on a span with no
                    role is not reliably read — so the description this field points at carries the
                    whole sentence as real text, and only the digits are visible. */}
                <span id={'projn-' + pr.id} style={sx('position:absolute;right:18px;top:50%;transform:translateY(-50%);pointer-events:none;font-family:Neue Montreal;font-size:var(--fs-micro);letter-spacing:var(--track-flat);color:var(--on-surface-muted);font-variant-numeric:tabular-nums')}>
                  <span aria-hidden="true">{pr.count}</span>
                  <span style={liveRegionStyle}>{pr.countAria}</span>
                </span>
              </span>
              {/* cursor written from state, not left to [data-ix]:disabled — that rule is in the
                  stylesheet and this style is inline, so a hardcoded `pointer` would outrank it and
                  the empty project's control would still invite the press it refuses. */}
              <button type="button" data-ix="press" data-focus="chrome" disabled={!pr.canExport} aria-label={pr.exportAria} title={pr.exportTitle} onClick={pr.onExport} style={sx('flex:none;width:32px;height:32px;display:inline-flex;align-items:center;justify-content:center;background:none;border:1px solid var(--action-line);border-radius:var(--radius-pill);color:var(--on-surface);padding:0;cursor:' + (pr.canExport ? 'pointer' : 'default'))}>
                <TextSwap><IconExport /></TextSwap>
              </button>
              <button type="button" data-ix="press" data-focus="chrome" aria-label={pr.deleteAria} onClick={pr.onDelete} style={sx('flex:none;width:32px;height:32px;display:inline-flex;align-items:center;justify-content:center;background:none;border:1px solid var(--action-line);border-radius:var(--radius-pill);color:var(--on-surface);cursor:pointer')}>
                <TextSwap><IconTrash /></TextSwap>
              </button>
            </div>
          ))}
        </div>
        )}

        </>)}

        </div>
      </div>
    </div>
  );
}

// ============================== COLOUR HARMONIES DRAWER ==============================
function HarmonyDrawer({ vals }) {
  if (!vals.hasHarmony) return null;
  const harmony = vals.harmony;
  return (
    <div style={sx('position:fixed;inset:0;z-index:120')}>
      <div data-hx-backdrop="1" onClick={vals.closeHarmony} style={sx('position:absolute;inset:0;background:color-mix(in srgb, var(--scrim) 55%, transparent);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)')}></div>
      <div data-hx-drawer="1" data-harmony-dialog="1" data-lenis-prevent="1" role="dialog" aria-modal="true" aria-label={'Colour harmonies for ' + harmony.hex} onKeyDown={vals.trapHarmony} style={sx('position:absolute;right:0;top:0;bottom:0;width:480px;max-width:94vw;background:var(--surface);border-left:1px solid var(--line-strong);display:flex;flex-direction:column;overflow-y:auto')}>
        <header data-hx-sec="1" style={sx('display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:20px var(--page-gutter) 0')}>
          <div style={sx('display:flex;flex-direction:column;gap:9px;min-width:0')}>
            <span style={sx('font-family:Neue Montreal;font-size:var(--fs-label);letter-spacing:var(--track-flat);text-transform:uppercase;color:var(--on-surface-muted)')}>Colour harmonies</span>
            <div style={sx('display:flex;align-items:center;gap:11px')}>
              <span aria-hidden="true" style={harmony.swatchStyle}></span>
              <span data-drawer-split="1" style={sx("font-family:'Neue Montreal';font-weight:500;font-size:var(--fs-subtitle);letter-spacing:-.01em;color:var(--on-surface)")}>{harmony.hex}</span>
            </div>
          </div>
          {/* Done, not Close. The drawer can act now — Save as palette writes a record — so leaving
              it is completion rather than the dismissal of a read-only view. */}
          {/* The close mark, at the 32px circle every other surface in the app now uses. It said
              DONE, which answers "is anything pending?" — nothing is: a harmony is shown, not
              applied, and Use as palette is the act that commits. So the word was answering a
              question this drawer never asked. */}
          <button type="button" data-ix="press" data-focus="chrome" onClick={vals.closeHarmony} aria-label="Close colour harmonies" title="Close" style={sx('flex:none;width:32px;height:32px;display:inline-flex;align-items:center;justify-content:center;background:none;border:1px solid var(--action-line);border-radius:var(--radius-pill);padding:0;color:var(--on-surface);cursor:pointer')}><TextSwap><IconClose /></TextSwap></button>
        </header>

        {/* "SELECT A COLOUR TO COPY ITS HEX, OR USE THE FULL HARMONY AS A PALETTE" STOOD HERE and
            is removed by request. It named the surface's two acts in a sentence, and both are
            already stated by the things that do them: the swatches below are buttons that copy on
            press, and Save as palette and Copy Harmony sit at the foot saying so on themselves.
            The drawer opens on its subject now — the colour, then the seven models — rather than on
            an instruction about it. */}

        {/* THE SEVEN, AS A CHOICE. They were seven stacked sections of equal weight — a catalogue
            you scrolled rather than a model you picked. Switching keeps focus on the button pressed
            and leaves the drawer's scroll alone (setHarmonyModel), so comparing two models is two
            presses and nothing moves but the preview. */}
        <div data-hx-sec="1" style={sx('padding:14px var(--page-gutter) 0')}>
          <div role="group" aria-label="Harmony model" style={sx('display:flex;flex-wrap:wrap;gap:6px')}>
            {harmony.models.map((m) => (
              <button key={m.id} type="button" data-hx-cell="1" data-ix="seg" data-focus="chrome" aria-pressed={m.pressed} aria-label={m.aria} onClick={m.onPick} style={m.style}><TextSwap>{m.label}</TextSwap></button>
            ))}
          </div>
        </div>

        {/* data-ov-band on the swatches: they take the SIGNATURE BAND REVEAL — the clip rising from
            the bottom edge that animateBands gives the result stage, the gesture a palette arrives
            with in this app. A swatch here is that same object at a smaller size, so it arrives the
            same way rather than getting a treatment of its own. It was briefly a horizontal wipe,
            on a tidy theory about giving surfaces the opposite axis to text; that invented a second
            vocabulary for colour when the app already had one.
            ONE HARMONY, AT SIZE. Each swatch names itself: the SOURCE colour is labelled in words
            rather than by a 5px square nobody has a legend for, and a colour whose chroma had to be
            reduced to fit sRGB says MAPPED on the colour it happened to, instead of being covered by
            one methodology sentence true of the whole set. */}
        <div data-hx-sec="1" data-hx-preview="1" style={sx('padding:14px var(--page-gutter) 0')}>
          <div style={sx('display:flex;gap:1px;width:100%')}>
            {harmony.cells.map((cell, ci) => (
              <HBtn key={ci} type="button" data-hx-cell="1" data-ov-band="1" data-focus="value" onClick={cell.onCopy} aria-label={cell.aria} style={cell.style} styleHover={cell.hover} styleActive={cell.active}>
                <span style={sx('display:flex;min-height:16px;align-items:flex-start')}>
                  {cell.badge ? <span aria-hidden="true" style={cell.badgeStyle}>{cell.badge}</span> : null}
                </span>
                <span style={sx('text-transform: uppercase; font-size:var(--fs-micro); letter-spacing:var(--track-flat); font-family: Neue Montreal')}>{cell.display}</span>
              </HBtn>
            ))}
          </div>
        </div>

        {/* THE ADOPTION PATH. Save as palette is the filled act; Copy harmony is the whole-set
            version of what a swatch already does and stays quiet beside it. Both act on the model
            currently shown, which is why the label names it. */}
        <div data-hx-sec="1" style={sx('display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:18px var(--page-gutter) 0')}>
          <button type="button" data-hx-cell="1" data-ix="cta" data-focus="chrome" onClick={harmony.onUse} aria-label={harmony.useAria} style={sx('background:var(--on-surface);border:1px solid var(--on-surface);border-radius:var(--radius-pill);padding:var(--btn-pad-md);font-family:Neue Montreal;font-size:var(--fs-label);letter-spacing:var(--track-flat);color:var(--surface);cursor:pointer;white-space:nowrap')}><TextSwap>Save as palette</TextSwap></button>
          <button type="button" data-hx-cell="1" data-ix="press" data-focus="chrome" onClick={harmony.onCopyAll} aria-label={harmony.copyAllAria} style={sx('background:none;border:1px solid var(--action-line);border-radius:var(--radius-pill);padding:var(--btn-pad-md);font-family:Neue Montreal;font-size:var(--fs-label);letter-spacing:var(--track-flat);color:var(--on-surface);cursor:pointer;white-space:nowrap')}><TextSwap>{harmony.copyAllLabel}</TextSwap></button>
        </div>

        {/* THE "HOW HARMONIES ARE CALCULATED" FOLD STOOD HERE and is removed by request. It was a
            disclosure at the foot of the drawer holding methodLines — the sentence about how many
            of the shown colours had been adjusted to stay inside the gamut. Specific, and still the
            answer to a question nobody asked while choosing a harmony.
            renderVals keeps methodOpen, methodLines, methodAria, methodLabel and toggleMethod, all
            now unread; the fold comes back as this block. */}

      </div>
    </div>
  );
}

// ============================== TOKEN EXPORT DIALOG ==============================
function ExportDialog({ vals }) {
  if (!vals.hasExport) return null;
  const ex = vals.export;
  return (
    // 125 as it always was, EXCEPT when this was opened from the library panel's Projects tab — a
    // folder's export is a sub-decision of the surface that raised it, so it has to sit over that
    // surface rather than under it. The number it has to clear moved when the manage dialog became
    // a tab: it was 126 (a centred dialog), it is now the panel's own 156, so the stacked case is
    // 157 — still under the wipe at 160, which outranks every panel in the app.
    // Every other route into this surface stacks exactly where it did.
    <div style={{ ...sx('position:fixed;inset:0;display:flex;align-items:center;justify-content:center;padding:24px'), zIndex: ex.stacked ? 157 : 125 }}>
      <div data-ex-backdrop="1" onClick={vals.closeExport} style={sx('position:absolute;inset:0;background:color-mix(in srgb, var(--scrim) 55%, transparent);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)')}></div>
      <div data-export-dialog="1" data-lenis-prevent="1" role="dialog" aria-modal="true" aria-label={ex.aria} onKeyDown={vals.trapExport} style={sx('position:relative;width:440px;max-width:94vw;max-height:88vh;overflow-y:auto;background:var(--surface);border:1px solid var(--line-strong);box-shadow:0 24px 60px rgba(0,0,0,.28);display:flex;flex-direction:column')}>
        <header style={sx('display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:20px var(--page-gutter) 0')}>
          <div style={sx('display:flex;flex-direction:column;gap:4px;min-width:0')}>
            <span style={sx('font-family:Neue Montreal;font-size:var(--fs-label);letter-spacing:var(--track-flat);text-transform:uppercase;color:var(--on-surface-muted)')}>{ex.kicker}</span>
            <span style={sx("font-family:'Neue Montreal';font-weight:500;font-size:var(--fs-subtitle);letter-spacing:-.01em;color:var(--on-surface);white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{ex.name}</span>
            {/* The scale of a folder export, stated before a format is picked — see scopeLine. */}
            {ex.scopeLine && (
              <span style={sx('font-family:Neue Montreal;font-size:var(--fs-micro);letter-spacing:.02em;color:var(--on-surface-muted);font-variant-numeric:tabular-nums')}>{ex.scopeLine}</span>
            )}
          </div>
          {/* The app's one close mark, at the 32px circle the library panel and the project picker
              both use. This was the last surface still spelling the word. */}
          <button type="button" data-ix="press" data-focus="chrome" onClick={vals.closeExport} aria-label="Close export options" title="Close" style={sx('flex:none;width:32px;height:32px;display:inline-flex;align-items:center;justify-content:center;background:none;border:1px solid var(--action-line);border-radius:var(--radius-pill);padding:0;color:var(--on-surface);cursor:pointer')}><TextSwap><IconClose /></TextSwap></button>
        </header>

        <div style={sx('padding:14px var(--page-gutter) 0')}>
          <span style={sx('font-family:Neue Montreal;font-size:var(--fs-detail);line-height:1.5;color:var(--on-surface-muted);text-wrap:pretty')}>HEX / RGB / HSL — the authoritative values. The labelled CMYK approximation stays on-screen, never baked into a file you ship.</span>
        </div>

        <div style={sx('padding:16px var(--page-gutter) 0;display:flex;flex-direction:column;gap:6px')}>
          {ex.formats.map((f, fi) => (
            <button key={fi} type="button" data-ex-item="1" data-focus="chrome" onClick={f.onPick} onMouseEnter={f.onEnter} onMouseLeave={f.onLeave} onFocus={f.onFocus} onBlur={f.onBlur} style={f.style}>
              {/* Swapped like the copy dialog's rows, because they are the same list: two surfaces
                  that were made to look identical and then answered a pointer differently would be
                  a worse inconsistency than the one the shared row style was written to fix. */}
              <span style={sx('text-transform: capitalize; font-size:var(--fs-detail)')}><TextSwap>{f.label}</TextSwap></span>
              <span style={f.extStyle}>{f.ext}</span>
            </button>
          ))}
        </div>

        <div style={sx('display:flex;align-items:center;justify-content:space-between;gap:16px;padding:18px var(--page-gutter) 0')}>
          <div style={{ minWidth: 0 }}>
            <div style={sx("font-family: 'Neue Montreal'; font-size:var(--fs-detail); color: var(--on-surface); text-transform: capitalize")}>Semantic scaffold</div>
            <div style={sx('font-family:Neue Montreal;font-size:var(--fs-label);line-height:1.45;color:var(--on-surface-muted);margin-top:3px;text-wrap:pretty')}>Role-mapped starting layer to refine — not a finished system.</div>
          </div>
          <B006 data-focus="chrome" role="switch" aria-checked={ex.semanticChecked} onClick={vals.toggleExportSemantic} aria-label="Toggle semantic scaffold layer"
            hover={
              <span style={sx('display:inline-flex;align-items:center;gap:7px')}>
                <span aria-hidden="true" style={sx('position:relative;display:inline-block;width:28px;height:14px;background:color-mix(in srgb, currentColor 30%, transparent);flex:none;transition:background var(--dur-chrome) var(--ease-standard)')}>
                  <span style={{ ...sx('position:absolute;left:2px;top:2px;width:10px;height:10px;background:currentColor;transition:transform var(--dur-chrome) var(--ease-standard)'), transform: ex.semanticDotX }}></span>
                </span>{ex.semanticLabel}
              </span>
            }
            label={
              <span style={sx('display:inline-flex;align-items:center;gap:7px')}>
                <span style={{ ...sx('position:relative;display:inline-block;width:28px;height:14px;flex:none;transition:background var(--dur-chrome) var(--ease-standard)'), background: ex.semanticTrackBg }}>
                  <span style={{ ...sx('position:absolute;left:2px;top:2px;width:10px;height:10px;background:var(--surface);transition:transform var(--dur-chrome) var(--ease-standard)'), transform: ex.semanticDotX }}></span>
                </span>{ex.semanticLabel}
              </span>
            } />
        </div>

        <div style={sx('padding:14px var(--page-gutter) 22px')}>
          <span style={sx('font-family:Neue Montreal;font-size:var(--fs-micro);letter-spacing:.02em;color:var(--on-surface-muted)')}>{ex.layerLabel}</span>
        </div>
      </div>
    </div>
  );
}

// ============================== MOVE-TO-PROJECT DIALOG ==============================
// Re-upload recognition. Same shell as AssignDialog — backdrop, aria-modal, shared focus trap,
// shared in/out transition — because it is the same kind of moment: a short, blocking question with
// named outcomes. Nothing here is signalled by colour: the situation is a sentence, and the two
// routes are two labelled buttons whose emphasis (filled vs outlined) also differs in weight.
function RecogniseDialog({ vals }) {
  if (!vals.hasRecognise) return null;
  const r = vals.recognise;
  return (
    <div style={sx('position:fixed;inset:0;z-index:126;display:flex;align-items:center;justify-content:center;padding:24px')}>
      <div data-modal-backdrop="1" onClick={vals.closeRecognise} style={sx('position:absolute;inset:0;background:color-mix(in srgb, var(--scrim) 55%, transparent);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)')}></div>
      <div data-recognise-dialog="1" data-lenis-prevent="1" role="dialog" aria-modal="true" aria-label="This image has been extracted before" onKeyDown={vals.trapRecognise} style={sx('position:relative;width:420px;max-width:94vw;max-height:86vh;overflow-y:auto;background:var(--surface);border:1px solid var(--line-strong);box-shadow:0 24px 60px rgba(0,0,0,.28);display:flex;flex-direction:column')}>
        <header style={sx('display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:20px var(--page-gutter) 0')}>
          <div style={sx('display:flex;flex-direction:column;gap:4px;min-width:0')}>
            <span style={sx('font-family:Neue Montreal;font-size:var(--fs-label);letter-spacing:var(--track-flat);text-transform:uppercase;color:var(--on-surface-muted)')}>Already extracted</span>
            <span style={sx("font-family:'Neue Montreal';font-weight:500;font-size:var(--fs-subtitle);letter-spacing:-.01em;color:var(--on-surface);white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{r.name}</span>
          </div>
          <button type="button" data-ix="press" data-focus="chrome" onClick={vals.closeRecognise} aria-label="Keep the existing palette and create nothing" style={sx('flex:none;background:none;border:1px solid var(--action-line);padding:var(--btn-pad-md);font-family:Neue Montreal;font-size:var(--fs-label);letter-spacing:var(--track-flat);color:var(--on-surface);cursor:pointer')}><TextSwap>Cancel</TextSwap></button>
        </header>
        <div style={sx('padding:14px var(--page-gutter) 0;display:flex;flex-direction:column;gap:12px')}>
          <span style={sx("font-family:'Neue Montreal';font-size:var(--fs-body);line-height:1.5;color:var(--on-surface-muted);text-wrap:pretty")}>{r.line}</span>
          {/* the palette itself, drawn as the archive draws it — so the claim can be checked, not just read */}
          <span aria-hidden="true" style={sx('display:flex;width:100%;height:26px;border:1px solid var(--line)')}>
            {r.strip.map((b, i) => (<span key={i} style={b.style}></span>))}
          </span>
          <span style={sx('font-family:Neue Montreal;font-size:var(--fs-micro);letter-spacing:var(--track-flat);text-transform:uppercase;color:var(--on-surface-muted)')}>Saved {r.when}</span>
        </div>
        <div style={sx('padding:18px var(--page-gutter) 22px;margin-top:10px;border-top:1px solid var(--line);display:flex;flex-direction:column;gap:8px')}>
          <button type="button" data-ix="cta" data-focus="chrome" onClick={vals.recogniseOpen} aria-label={r.openAria} style={sx('width:100%;background:var(--on-surface);border:1px solid var(--on-surface);padding:var(--btn-pad-lg);font-family:Neue Montreal;font-size:var(--fs-label);letter-spacing:var(--track-flat);color:var(--surface);cursor:pointer')}><TextSwap>Open existing palette</TextSwap></button>
          {/* "Anyway", not "as a variation". Extraction is deterministic as of this deploy, so a
              second run of the same image returns the same colours — this adds a separate entry,
              it does not produce a different palette. Step D is what makes variations genuinely
              differ (seed = content hash + variation index); the label can promise that then. */}
          <button type="button" data-ix="press" data-focus="chrome" onClick={vals.recogniseVariation} aria-label={r.variationAria} style={sx('width:100%;background:none;border:1px solid var(--action-line);padding:var(--btn-pad-lg);font-family:Neue Montreal;font-size:var(--fs-label);letter-spacing:var(--track-flat);color:var(--on-surface);cursor:pointer')}><TextSwap>Extract again anyway</TextSwap></button>
          <span style={sx("font-family:'Neue Montreal';font-size:var(--fs-label);line-height:1.5;color:var(--on-surface-muted);text-wrap:pretty")}>Extraction is repeatable, so this adds a second entry with the same colours.</span>
        </div>
      </div>
    </div>
  );
}

function AssignDialog({ vals }) {
  if (!vals.hasAssign) return null;
  const assign = vals.assign;
  return (
    <div style={sx('position:fixed;inset:0;z-index:126;display:flex;align-items:center;justify-content:center;padding:24px')}>
      <div data-modal-backdrop="1" onClick={vals.closeAssign} style={sx('position:absolute;inset:0;background:color-mix(in srgb, var(--scrim) 55%, transparent);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)')}></div>
      <div data-assign-dialog="1" data-lenis-prevent="1" role="dialog" aria-modal="true" aria-label="Add to projects" onKeyDown={vals.trapAssign} style={sx('position:relative;width:400px;max-width:94vw;max-height:86vh;overflow-y:auto;background:var(--surface);border:1px solid var(--line-strong);box-shadow:0 24px 60px rgba(0,0,0,.28);display:flex;flex-direction:column')}>
        <header style={sx('display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:20px var(--page-gutter) 0')}>
          <div style={sx('display:flex;flex-direction:column;gap:4px;min-width:0')}>
            <span style={sx('font-family:Neue Montreal;font-size:var(--fs-label);letter-spacing:var(--track-flat);text-transform:uppercase;color:var(--on-surface-muted)')}>Add to projects</span>
            <span style={sx("font-family:'Neue Montreal';font-weight:500;font-size:var(--fs-subtitle);letter-spacing:-.01em;color:var(--on-surface);white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{assign.name}</span>
            {/* "IN COASTAL AND NORDIC" / "NOT IN ANY PROJECT YET" STOOD HERE and is removed by
                request. It was a role=status line restating membership every time it changed, on
                the argument that a tick appearing in a list of eight is a change a reader who has
                already walked past the row never learns about. The rows themselves still carry it:
                each is a role=checkbox with aria-checked, so the state is on the control rather than
                in a sentence about the controls. What is lost is the ANNOUNCEMENT of a change made
                further down the list; renderVals still computes assign.memberLine, now unread. */}
          </div>
          {/* The same close mark and the same 32px circle as the library panel's. A dialog and a
              drawer are different surfaces, but "the way out" is one object in this app, and it had
              been two: a word here, a glyph there. */}
          <button type="button" data-ix="press" data-focus="chrome" onClick={vals.closeAssign} aria-label="Close the project picker" title="Close" style={sx('flex:none;width:32px;height:32px;display:inline-flex;align-items:center;justify-content:center;background:none;border:1px solid var(--action-line);border-radius:var(--radius-pill);padding:0;color:var(--on-surface);cursor:pointer')}><TextSwap><IconClose /></TextSwap></button>
        </header>
        <div style={sx('padding:16px var(--page-gutter) 0;display:flex;flex-direction:column;gap:6px')}>
          {/* role=checkbox, because that is what these rows ARE: a set of independent memberships a
              palette can hold any number of, not a list of alternatives. As plain buttons they gave
              a reader no state at all — only an aria-label that flipped between "Add" and "Remove",
              which describes the next press rather than the current fact. */}
          {assign.options.map((o) => (
            <button key={o.key} type="button" role="checkbox" aria-checked={o.checked} data-focus="chrome" onClick={o.onPick} onMouseEnter={o.onEnter} onMouseLeave={o.onLeave} onFocus={o.onFocus} onBlur={o.onBlur} aria-label={o.aria} style={o.style}>
              <span style={sx("font-family:'Neue Montreal';font-size:var(--fs-body);color:var(--on-surface);white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{o.label}</span>
              <span aria-hidden="true" style={o.markStyle}><IconCheck /> {o.markLabel}</span>
            </button>
          ))}
        </div>
        <div style={sx('padding:16px var(--page-gutter) 22px;margin-top:8px;border-top:1px solid var(--line)')}>
          {/* THE SAME VOICE AS `ADD TO PROJECTS` AT THE TOP OF THIS DIALOG, which it was not: this
              stood at --fs-micro with a hand-set .06em against the header's --fs-label at
              --track-flat. 9px with half a pixel of tracking beside 10px with none — two uppercase
              labels, 400px apart, in one sheet, differing by an amount too small to read as a
              decision and too large to be nothing.

              --fs-label is also what the scale says this is: its own note calls it "uppercase
              labels; the workhorse", where --fs-micro is for "counts, eyebrows, row meta". This is
              a label naming the field under it, so the token and the match point the same way.

              AND THE TRACKING GOES THROUGH THE TOKEN. --track-flat is 0 and its declaration calls
              itself the single source for flat tracking; a literal beside it is the second source
              that makes the first one a suggestion. Six more sites still carry this same .06em —
              left alone here because they are other surfaces, but they are the same drift. */}
          <label style={sx('font-family:Neue Montreal;font-size:var(--fs-label);letter-spacing:var(--track-flat);text-transform:uppercase;color:var(--on-surface-muted);display:block;margin:12px 0 8px')}>New project</label>
          {/* THE SAME FIELD AS THE LIBRARY PANEL'S, down to the numbers: a stadium with the act
              inside it at inset-block:4px, 32px wide, and 44px of trailing padding so a long name
              stops before the disc. Two places in this app create a project and they were two
              different controls — a field with a "Create & add" button beside it here, a field with
              a chevron inside it there. One act, one shape. Both still carry these figures; change
              one and change the other, or the sentence above stops being true.

              IT STANDS 40 NOW, WHICH IS THE HEIGHT OF THE ROWS ABOVE IT. At 9px of vertical padding
              it measured 35.5 against their 39.5 — four pixels short of the only other full-width
              control in the dialog, directly under it, sharing its left and right edges. Two stacked
              stadiums of different heights read as a mistake rather than as a hierarchy, because
              nothing here is claiming one is subordinate to the other: you pick a project from those
              or you type a new one into this.

              THE DISC GREW WITH IT, and it had to. Its height comes from inset-block:4px, so a
              taller field made it 31.5 while its width stayed 28 — a lozenge, which is exactly the
              fault the library trigger had at 38 x 32.5 and exactly the fault the corner is always
              blamed for. Squaring it to 32 keeps it a true circle AND lands it on the size every
              other icon-only circle in this app already uses. The trailing padding follows: a 32px
              disc at 4px reaches 36px in from the edge, so 44 keeps the 8px of clearance a name had
              before the disc grew, where the old 40 would have halved it.
              THE VISIBLE LABEL STAYS, and that is the one deliberate difference. The panel's field
              has only a placeholder, which is a label that disappears the moment you type; this one
              has "New project" above it, and matching downward would have cost the better of the
              two. It gains the aria-label the panel's field already had, so the name is on the
              control and not only above it. */}
          <div style={sx('position:relative;display:flex')}>
            <input data-assign-new="1" data-focus="field" type="text" maxLength={60} placeholder="Project name" aria-label="Name a new project" onKeyDown={assign.onCreateKey} style={sx("flex:1;min-width:0;background:var(--surface);border:1px solid var(--action-line);border-radius:var(--radius-pill);padding:11px 44px 11px 18px;font-family:'Neue Montreal';font-size:var(--fs-body);color:var(--on-surface)")} />
            <button type="button" data-ix="cta" data-focus="chrome" onClick={assign.onCreate} aria-label={assign.createAria} title="Create" style={sx('position:absolute;inset-block:4px;inset-inline-end:4px;width:32px;display:inline-flex;align-items:center;justify-content:center;background:var(--on-surface);border:1px solid var(--on-surface);border-radius:var(--radius-pill);padding:0;color:var(--surface);cursor:pointer')}><TextSwap><IconChevronRight size={12} /></TextSwap></button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================== RESTORE FROM FILE DIALOG ==============================
// Same shell as RecogniseDialog — backdrop, aria-modal, shared focus trap, shared transition —
// because it is the same KIND of moment: a pending act, stated in full, with named outcomes.
//
// Opening a file used to merge it on the spot and report afterwards. The merge never clobbered,
// but "it never clobbers" is a promise nobody could verify from a toast that had already fired.
// The counts ARE the verification, and they are stated before the act rather than after it.
//
// Nothing is signalled by colour: the situation is a sentence, the numbers are a ruled readout in
// the same label:value grammar as the result view's metadata, and the routes are labelled buttons
// that also differ in fill.
function RestoreDialog({ vals }) {
  if (!vals.hasRestore) return null;
  const r = vals.restore;
  return (
    <div style={sx('position:fixed;inset:0;z-index:126;display:flex;align-items:center;justify-content:center;padding:24px')}>
      <div data-modal-backdrop="1" onClick={vals.closeRestore} style={sx('position:absolute;inset:0;background:color-mix(in srgb, var(--scrim) 55%, transparent);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)')}></div>
      <div data-restore-dialog="1" data-lenis-prevent="1" role="dialog" aria-modal="true" aria-label="Restore from a file" onKeyDown={vals.trapRestore} style={sx('position:relative;width:420px;max-width:94vw;max-height:86vh;overflow-y:auto;background:var(--surface);border:1px solid var(--line-strong);box-shadow:0 24px 60px rgba(0,0,0,.28);display:flex;flex-direction:column')}>
        <header style={sx('display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:20px var(--page-gutter) 0')}>
          <div style={sx('display:flex;flex-direction:column;gap:4px;min-width:0')}>
            <span style={sx('font-family:Neue Montreal;font-size:var(--fs-label);letter-spacing:var(--track-flat);text-transform:uppercase;color:var(--on-surface-muted)')}>Restore from a file</span>
            {/* the file's own name — the subject of the dialog, as the palette name is above */}
            <span style={sx("font-family:'Neue Montreal';font-weight:500;font-size:var(--fs-subtitle);letter-spacing:-.01em;color:var(--on-surface);white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{r.fileName}</span>
          </div>
          <button type="button" data-ix="press" data-focus="chrome" onClick={vals.closeRestore} aria-label={r.cancelAria} style={sx('flex:none;background:none;border:1px solid var(--action-line);padding:var(--btn-pad-md);font-family:Neue Montreal;font-size:var(--fs-label);letter-spacing:var(--track-flat);color:var(--on-surface);cursor:pointer')}>{r.cancelLabel}</button>
        </header>
        <div style={sx('padding:14px var(--page-gutter) 0;display:flex;flex-direction:column;gap:12px')}>
          <span style={sx("font-family:'Neue Montreal';font-size:var(--fs-body);line-height:1.5;color:var(--on-surface-muted);text-wrap:pretty")}>{r.line}</span>
          {/* Four numbers are not a sentence. Uppercase muted term, full-ink tabular value, a
              hairline under each row — so a count reads here exactly as it reads on the result
              view's metadata readout, and the two surfaces share one way of stating a figure. */}
          <dl style={sx('display:flex;flex-direction:column;margin:0')}>
            <span aria-hidden="true" style={sx('display:block;height:1px;background:var(--line)')}></span>
            {r.rows.map((m, mi) => (
              <div key={mi}>
                <div style={sx('display:flex;align-items:baseline;justify-content:space-between;gap:16px;padding:8px 0')}>
                  <dt style={sx('font-family:Neue Montreal;font-size:var(--fs-nano);letter-spacing:var(--track-flat);text-transform:uppercase;color:var(--on-surface-muted);white-space:nowrap')}>{m.label}</dt>
                  <dd style={sx('margin:0;min-width:0;font-family:Neue Montreal;font-size:var(--fs-body);letter-spacing:var(--track-flat);color:var(--on-surface);white-space:nowrap;font-variant-numeric:tabular-nums')}>{m.value}</dd>
                </div>
                <span aria-hidden="true" style={sx('display:block;height:1px;background:var(--line)')}></span>
              </div>
            ))}
          </dl>
        </div>
        {/* One act, one button. Cancel lives in the header, as it does above; the backdrop and
            Escape are dismissal, not a second control. When nothing in the file is new there is no
            act left to offer, so the footer carries no button at all rather than one that would
            commit nothing — an affordance for a non-act is worse than an absence. */}
        {r.hasAct && (
          <div style={sx('padding:18px var(--page-gutter) 22px;margin-top:10px;border-top:1px solid var(--line);display:flex;flex-direction:column;gap:8px')}>
            <button type="button" data-ix="cta" data-focus="chrome" onClick={vals.confirmRestore} aria-label={r.confirmAria} style={sx('width:100%;background:var(--on-surface);border:1px solid var(--on-surface);padding:var(--btn-pad-lg);font-family:Neue Montreal;font-size:var(--fs-label);letter-spacing:var(--track-flat);color:var(--surface);cursor:pointer')}><TextSwap>Add to library</TextSwap></button>
            <span style={sx("font-family:'Neue Montreal';font-size:var(--fs-label);line-height:1.5;color:var(--on-surface-muted);text-wrap:pretty")}>New palettes go to the top of your library. Existing ones keep their place.</span>
          </div>
        )}
      </div>
    </div>
  );
}
