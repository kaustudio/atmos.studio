// The view — a 1:1 JSX port of the design comp's template. Static inline styles are kept as the
// original CSS strings (parsed by sx()) so the layout stays byte-faithful; computed styles come
// from renderVals() untouched. No logic lives here.
import React from 'react';
import { createPortal } from 'react-dom';
import { sx } from '../lib/sx.js';
import { Button, ButtonText, DocHead, GlassEffect, NavNewPalette, SwitchTrack, TextSwap, ThemeSwitch } from './chrome.jsx';
import { IconPlus } from './icons.jsx';
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
import { isDoc, isLegal, pathFor, APP, CREATE_PATH } from './routes.js';
import { thinkingOrbs } from './thinkingOrbs.js';
// PAGE VIEWS ONLY. Do not add track() / custom events, and do not instrument generation, export or
// any in-app action. Behavioural instrumentation is a separate decision with its own copy
// implications — the privacy statement currently promises the analytics "doesn't see anything you
// do inside the tool", and a single custom event makes that false. See DECISIONS.md.
import { Analytics } from '@vercel/analytics/react';
import { whenAllowed } from '../lib/consent.js';

/* THE FRAGMENT NEVER LEAVES, and without this it did. A share link carries the whole palette in
   #p= (lib/share.js), and the SDK's own payload is location.href ENTIRE: read the shipped script and
   the pageview body is `o: e(f)`, where e() returns location.href untouched unless a `route` is
   passed. We rendered it bare, with no route, and the React wrapper only sets disableAutoTrack when
   props.route !== undefined, so the automatic pageview fires with the full href. Opening a shared
   link therefore posted that palette's name, descriptors, rationale and swatches to Vercel, which
   is also what made "opening one tells us nothing" false on the privacy page.
   beforeSend can rewrite the url before anything is sent, so the fragment is cut here rather than
   trusted not to matter. Applied at every call site below through sendPageview; a new one must
   carry it too. */
const stripFragment = (event) => {
  try { const u = new URL(event.url); u.hash = ''; return { ...event, url: u.toString() }; }
  catch (e) { return { ...event, url: String(event.url || '').split('#')[0] }; }
};
/* AND NOTHING AT ALL WITHOUT CONSENT. Each call site mounts the component only once the visitor has
   allowed analytics, and this gate covers the other direction: the SDK's script stays on the page
   after its component unmounts, so a visitor who withdraws is stopped here, per event, by reading
   the stored answer at send time. See lib/consent.js. */
const sendPageview = whenAllowed(stripFragment);

// HBtn, a small stateful button that applied style-hover / style-active objects from JS, went on
// 17.09.26: its last users (the wordmark, the harmony swatches) take the [data-ix] contract now.

// Button — the masked text-swap CTA (chrome in global.css). `label` renders in both layers
// unless a distinct `hover` node is given.

// Copy confirmation: 'Hex list' ⇄ ✓ Copied. Both states are stacked in one grid cell with the
// inactive one hidden, so the cell is always sized to the WIDER of the two and the row can never
// reflow at the moment of the swap — which is exactly when the pointer is still over the button.
// The check stays outside ButtonText on purpose: it is a glyph, and glyphs hold still through the
// hover swap while the word beside them travels.
const CopiedMark = () => (
  <span style={sx('display:inline-flex;align-items:center;gap:6px')}><IconCheck /><ButtonText>Copied</ButtonText></span>
);
const SwapLabel = ({ copied, idle }) => (
  <span style={sx('display:inline-grid;align-items:center;height:14px;justify-items:center')}>
    <span style={{ gridArea: '1/1' }}>{copied ? <CopiedMark /> : <ButtonText>{idle}</ButtonText>}</span>
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
  ...sx('position:fixed;top:calc(31.5px - var(--logo-h) / 2);left:0;right:0;margin-inline:auto;width:var(--logo-w);height:var(--logo-h);z-index:155;mix-blend-mode:difference;background:var(--mark-gradient);background-size:280% 280%;animation:gradient-drift var(--dur-drift) var(--ease-ambient) infinite'),
  WebkitMask: LOGO_MASK, mask: LOGO_MASK,
};

/* THE WORDMARK BUTTON'S FOCUS RING (17.09.26, audit B1). The button masks itself to the wordmark, and
   that mask is what lets its mix-blend-mode difference against the page. A mask also clips the
   element's own outline, so the data-focus ring never painted: a keyboard reader focused the way home
   and saw nothing. The mask cannot move to an inner span without losing the blend (a positioned,
   z-indexed button is a stacking context, and a child would difference against its empty box), so the
   ring is its own element, the button's next sibling, shown by `button[data-logo]:focus-visible +
   [data-logo-ring]` in global.css. Same box as the mark; never masked, never hit. `top` follows the
   button's, which is the tool bar's centre line in the tool and logoStyle's own on a phone. */
const LogoRing = ({ top }) => (<span data-logo-ring="1" aria-hidden="true" style={top ? { top } : undefined}></span>);

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
// The check, supplied. Heavier stroke than the hairline it replaces, which is what a confirmation
// wants at 12px — the old path was a 0.7-unit line that thinned to almost nothing beside the
// uppercase labels it sits in. The decorative <path d="M0 0h24v24H0z" fill="none"/> from the source
// SVG is dropped: it is a transparent 24x24 spacer, and the viewBox already establishes that box.
const IconCheck = ({ size = 12 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ display: 'block', flex: 'none' }}><path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19L21 7l-1.41-1.41z"></path></svg>);
/* THE HARMONY GLYPH, by request (17.09.26): a disc inside a broken ring, the colour and the colours
   around it. Replaced the two overlapping circles. */
const IconHarmony = ({ size = 14 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ display: 'block', flex: 'none' }}><path fill="currentColor" d="m13.76 4.19l.44-1.95c-1.45-.33-3-.32-4.45.01l.45 1.95a8.1 8.1 0 0 1 3.56-.01M20 12c0 1.21-.27 2.38-.79 3.47l1.8.87c.66-1.36.99-2.82.99-4.37h-.2zm-18 .02c0 1.52.34 2.98 1 4.33l1.8-.87a7.96 7.96 0 0 1-.8-3.47H2Zm11.79 7.78l.45 1.95c1.45-.33 2.84-1 4.01-1.93L17 18.26c-.93.75-2.04 1.28-3.2 1.55ZM7 5.76L5.75 4.2c-1.17.94-2.12 2.14-2.77 3.48l1.8.87a8.2 8.2 0 0 1 2.21-2.79Zm11.21-1.6l-1.24 1.57c.94.74 1.71 1.7 2.23 2.78l1.8-.88a10 10 0 0 0-2.79-3.46ZM5.78 19.83c1.17.93 2.56 1.6 4.01 1.93l.44-1.95a8 8 0 0 1-3.21-1.54l-1.25 1.56ZM12 6a6 6 0 1 0 0 12a6 6 0 1 0 0-12"></path></svg>);
// Sort chevron — drawn at the same 1-unit hairline weight as the rest of the icon set, so it sits
// in the header without shouting. It points DOWN at rest (descending) and rotates 180° to point up
// for ascending; the rotation is the state change, so the glyph never swaps out from under the eye.
/* THE CHEVRON THAT COMMITS. Not IconChevron rotated: that one is the hairline mark the project
   rail's steppers use, and this is the Material 2-unit form the rest of the acts now take. It sits
   in the create field's own button, pointing the way the text is going. */
const IconChevronRight = ({ size = 14 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ display: 'block', flex: 'none' }}><path fill="currentColor" d="M10 6L8.59 7.41L13.17 12l-4.58 4.59L10 18l6-6z"></path></svg>);
/* THE UNDO ARROW — a line that turns back on itself, which is the one gesture that reads as
   "put it back" without a word. It replaces the label on the toast's own act; see the note there
   for why that control lost its text. */
// The undo mark, as supplied 19.09.26: an arrow that turns back on itself and runs home.
const IconUndo = ({ size = 14 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ display: 'block', flex: 'none' }}><path fill="currentColor" d="M9 10h6c2.21 0 4 1.79 4 4s-1.79 4-4 4h-3v2h3c3.31 0 6-2.69 6-6s-2.69-6-6-6H9V4L3 9l6 5z"></path></svg>);
/* THE CLOSE MARK, and until now a component nothing rendered: every dismiss in the app drew a ✕
   CHARACTER instead, which is a piece of text pretending to be an icon — it takes the font's
   metrics, its own optical size and whatever the label voice does to it. The toast's dismiss uses
   this now; the remaining literals are the ones sitting INSIDE a chip beside its label, where a
   glyph in the text stream is the right object. */
// data-icon="close" is how global.css finds a close mark (16.09.26): the swap alone answers its hover.
const IconClose = ({ size = 12 }) => (<svg data-icon="close" width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ display: 'block', flex: 'none' }}><path fill="currentColor" d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12z"></path></svg>);
const IconChevron = ({ size = 9, turn = 0 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ display: 'block', flex: 'none', transform: turn ? 'rotate(' + turn + 'deg)' : undefined }}><path fill="currentColor" d="M12 14.708L6.692 9.4l.708-.708l4.6 4.6l4.6-4.6l.708.708z"></path></svg>);
const IconContrast = ({ size = 14 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ display: 'block', flex: 'none' }}><path fill="currentColor" d="M12 22c5.52 0 10-4.48 10-10S17.52 2 12 2S2 6.48 2 12s4.48 10 10 10m1-17.93c3.94.49 7 3.85 7 7.93s-3.05 7.44-7 7.93z"></path></svg>);
/* EXPORT, AT THE SAME WEIGHT AS THE FOLDER AND THE BIN. It sits directly beside both — the project
   row in the library panel is name → export → delete — and left at the 1-unit hairline it read as a
   different set inside the same 32px button. Same 2-unit Material outline as its two neighbours now;
   the tray-and-arrow drawing is unchanged in meaning, and the second use (the result stage's Export
   menu, beside its own label) takes the new weight for the same reason: one glyph, one voice. */
const IconExport = ({ size = 14 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ display: 'block', flex: 'none' }}><path fill="currentColor" d="M18 15v3H6v-3H4v3c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-3zm-1-4l-1.41-1.41L13 12.17V4h-2v8.17L8.41 9.59L7 11l5 5z"></path></svg>);
// Export's tray with the arrow turned up: Restore reads a file in where Back Up writes one out.
const IconImport = ({ size = 14 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ display: 'block', flex: 'none' }}><path fill="currentColor" d="M18 15v3H6v-3H4v3c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-3zM7 9l1.41 1.41L11 7.83V16h2V7.83l2.59 2.58L17 9l-5-5z"></path></svg>);
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

// ===== THE LIST ROW'S CONTENT, ONCE =====
// Rendered twice per row: at rest on the row's own surface, and again inside the row's hover fill
// (renderVals rowFillStyle, [data-row-fill]) on an ink ground with `inv` set, where every colour
// that was the ink's is the surface's. The two copies sit on the same pixels — same grid, same
// cells, same hooks (data-row-cell for the breakpoint spans, data-row-time for the step aside) —
// so as the fill's clip edge rises through the row the type changes colour where the edge passes
// it and nothing moves. The reference (paulkalkbrenner.net/music) does this to one word; the row
// does it to a name, a chip, three figures and a stamp. What does NOT invert: the swatch strip,
// which is the palette itself, and the AA badge, which carries its verdict in its own status
// colours and has to say the same thing on either ground.
const RowMain = ({ c, inv }) => (
    <div data-row-main="1" style={sx('display:grid;grid-template-columns:var(--row-grid);align-items:center;gap:var(--grid-gutter);width:100%;min-height:var(--row-list-height);padding:12px var(--row-inset)')}>
      {/* The colour IS the row's identity — people recognise a palette by how it looks,
          not by an auto-generated name. So the strip leads and carries the mass: 24px
          tall, which with the 12px padding is exactly --row-list-height, making the
          strip the thing that DEFINES the row rather than a thumbnail sitting inside it.
          Fixed 160px (not proportional to the row) so the strips align into a column and
          stay comparable down the list. Bands use flexGrow: w(b) — the same
          share-to-width mapping as the overview and the universe card, from one shared
          w(); scaling the box up cannot drift the proportions. */}
      {/* NO HAIRLINE (17.09.26, by request), as the cards lost theirs: the colours are the
          edge. It was there because a pale palette's outer band sits at ~1.3:1 against
          --surface-raised, so the strip's own end can be hard to place on the lightest
          palettes; the row's rule under it still ends the object. */}
      <div aria-hidden="true" data-row-cell="strip" style={sx('display:flex;width:100%;height:24px')}>
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
      {/* --fs-lead (15) SINCE 19.09.26 (by request: "the nearest token"; 14 is the glass call to
          action's own size, outside the ten steps). The note below is the 13 it replaces.
          Secondary by SIZE alone now: down a step from the overview's title (16 → 13),
          but at the same medium weight the filter panel gives its facet names. Both are
          the same kind of thing — the name of a choosable, the subject of its row — and
          13/500 is what that is called in this app. Still full --on-surface ink, not
          muted: it is the row's only text identifier and the one thing a screen reader
          leads with, so the demotion is a size step and never a fade. */}
      <span style={sx("font-family:'Neue Montreal';font-weight:500;font-size:var(--fs-lead);flex:none;color:" + (inv ? 'var(--surface)' : 'var(--on-surface)'))}>{c.name}</span>
      {c.isExample && (
        <span style={sx('flex: none; font-family: Neue Montreal; font-size:var(--fs-nano); letter-spacing:var(--track-flat); border-radius:var(--radius-pill); padding: 2px 6px;' + (inv ? 'color:var(--ink-fill-muted);border:1px solid var(--ink-fill-line)' : 'color:var(--on-surface-muted);border:1px solid var(--line-strong)'))}>Example</span>
      )}
      {/* "Viewing" sits with the name and the Example chip — the labels that say what
          this palette IS — and, structurally, it has to sit before the flexible column:
          appearing on the right would push the metric columns left on whichever row was
          selected, and a column that moves for one row is not a column. */}
      {c.current && (
        <span style={sx('display: inline-flex; align-items: center; gap: 4px; flex: none; font-family: Neue Montreal; font-size:var(--fs-nano); letter-spacing:var(--track-flat); color:' + (inv ? 'var(--surface)' : 'var(--on-surface)'))}>
          <span style={sx('width:7px;height:7px;border-radius:var(--radius-pill);background:' + (inv ? 'var(--surface)' : 'var(--on-surface)'))} aria-hidden="true"></span>Viewing</span>
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
          renderVals still supplies descriptorParts, the tags and their handlers, now
          unread: putting the row back is a map(), not a rebuild. Their old styles went on
          17.09.26 (audit H3), so a returning row takes today's control style. */}
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
        {/* THE COUNT IN A ONE-FIGURE SLOT (19.09.26, audit U10, by request). The column is right-aligned on
            the count and Neue Montreal has no tabular figures (tabular-nums changes nothing), so a
            narrower 1 pulled its badge 2.5px right of the rest. The slot is one 0 wide, the figure ends
            on its right edge, and '/10' and the badge keep one place; only 10/10 is wider. */}
        <span style={inv ? c.metricValueInv : c.metricValue}><span style={sx('display:inline-block;min-width:1ch;text-align:end')}>{c.aaNum}</span>{c.aaDen}</span>
      </span>
      {/* MAX CONTRAST — a separate measurement, so a separate column */}
      <span data-row-cell="contrast" style={inv ? c.contrastCellInv : c.contrastCell}>{withRatios(c.contrastValueText)}</span>
      {/* absolute stamp as the value, relative as the hover layer; the row's aria
          sentence still ends "Generated 3h ago", so both forms reach every modality.
          data-row-time is the hook for the one movement in this row: on hover it steps
          one gutter left, into room its own column already holds, and hands the margin
          to the buttons. It is the only column allowed to move, which is why it is the
          only one that carries a hook. */}
      <span data-row-time="1" data-row-cell="date" style={inv ? c.timeCellInv : c.timeCell} title={inv ? undefined : c.timeTitle}>{c.time}</span>
    </div>
);

// ===== UNIVERSE CARD — the list row's content model, stacked =====
// The card and the row report the SAME palette, and the card's job is to say the same things in a
// different arrangement, not fewer things. Both pieces below are shared by the engine tiles and the
// reduced-motion grid, which are two renderings of one card and had drifted into two copies.

// The identity line: name, then the row's two labels — EXAMPLE for the seeded palettes, and the
// current palette NAMED rather than only dotted. The dot stays beside the word, so the state is
// carried by shape as well as text and survives a greyscale render (SC 1.4.1).
const EXAMPLE_CHIP = sx('flex:none;margin-inline-start:auto;font-family:Neue Montreal;font-size:var(--fs-nano);letter-spacing:var(--track-flat);color:var(--on-surface-muted);border:1px solid var(--line-strong);border-radius:var(--radius-pill);padding:2px 6px');
const EXAMPLE_CHIP_ON_PHOTO = sx('flex:none;margin-inline-start:auto;font-family:Neue Montreal;font-size:var(--fs-nano);letter-spacing:var(--track-flat);color:var(--on-photo);border:1px solid color-mix(in srgb, var(--on-photo) 60%, transparent);border-radius:var(--radius-pill);padding:2px 6px');
// THE GRID CARD'S FOOT (17.09.26, radius issue R3, by request): a progressive blur and a dark tint
// over the photograph's lower part, under the name. Two copies of the picture, blurred and masked
// so the blur grows toward the edge (a live backdrop-filter measured p95 16.7ms against 8.8 on the
// field's drift; copies cost nothing measurable), scaled past the hero so their soft edges are
// clipped. The tint reaches .82 black at the foot: the palest example (High Key) needs .77 behind
// white text for 4.5:1.
const TILE_FADE = {
  near: sx('position:absolute;inset:0;background:inherit;transform:scale(1.12);filter:blur(6px);-webkit-mask-image:linear-gradient(to bottom,transparent 48%,#000 74%);mask-image:linear-gradient(to bottom,transparent 48%,#000 74%);pointer-events:none'),
  far: sx('position:absolute;inset:0;background:inherit;transform:scale(1.12);filter:blur(18px);-webkit-mask-image:linear-gradient(to bottom,transparent 64%,#000 92%);mask-image:linear-gradient(to bottom,transparent 64%,#000 92%);pointer-events:none'),
  tint: sx('position:absolute;inset:0;background:linear-gradient(to bottom,transparent 44%,rgb(0 0 0 / .42) 70%,rgb(0 0 0 / .82) 100%);pointer-events:none'),
};

const CardIdentity = ({ c, onPhoto }) => {
  // THE NAME IS LARGER ON THE GRID'S CARDS (17.09.26, radius issue R3, by request): --fs-subtitle,
  // where it was --fs-body, the list row's size, and in the photograph's ink (--on-photo). The
  // reduced-motion grid keeps --fs-body: its cards are narrower and share the line with the Example
  // chip, and at 20px "Scorched Clear Morning" truncated there. The list row keeps --fs-body too.
  const ink = onPhoto ? 'var(--on-photo)' : 'var(--on-surface)';
  const nameSize = onPhoto ? 'var(--fs-subtitle)' : 'var(--fs-body)';
  return (<>
  {/* flex:1 so this row claims the card's full content width. Without it the wrapper is a flex item
      at its intrinsic size — 115px of a 270px row — and the chip's margin-auto below could only
      reach the end of the NAME, which is where it already sat. An auto margin needs spare space to
      push into, and this is what supplies it. */}
  <span style={sx('display:flex;align-items:' + (onPhoto ? 'center' : 'baseline') + ';gap:8px;min-width:0;flex:1')}>
    {/* The OPEN panel's name is the head of a surface rather than a row's first column, so it
        takes --fs-title — 24, the scale's heading step — with --track-title, and wraps rather than
        truncates because a heading has the room a row does not. */}
    <span style={c.titleName
      ? sx("min-width:0;font-family:'Neue Montreal';font-weight:500;font-size:var(--fs-title);letter-spacing:var(--track-title);line-height:1.15;color:var(--on-surface);text-wrap:balance")
      : sx("min-width:0;font-family:'Neue Montreal';font-weight:500;font-size:" + nameSize + ";letter-spacing:var(--track-title);line-height:1.2;color:" + ink + ";white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{c.name}</span>
    {c.isExample && (
      /* margin-inline-start:auto, so the chip sits on the card's trailing edge rather than
          trailing the name. It is a STATUS, not part of the title: against the right edge it lines
          up with the values column below it and reads down the wall of cards as its own signal,
          where hung off the name it started at a different x on every card.
          The name gets min-width:0 to go with it. Without that a flex item will not shrink below its
          content, so a long name would have pushed the chip back off the edge — the ellipsis it
          already asks for cannot fire until the item is allowed to be narrower than its text.
          On the photograph it takes the photograph's ink, its edge a mix of it. */
      <span style={onPhoto ? EXAMPLE_CHIP_ON_PHOTO : EXAMPLE_CHIP}>Example</span>
    )}
  </span>
  {c.current && (
    <span style={sx('display:inline-flex;align-items:center;gap:4px;flex:none;font-family:Neue Montreal;font-size:var(--fs-nano);letter-spacing:var(--track-flat);color:' + ink)}>
      <span style={sx('width:7px;height:7px;border-radius:var(--radius-pill);flex:none;background:' + ink)} aria-hidden="true"></span>Viewing</span>
  )}
</>);
};

// The metrics grid. aria-hidden because the card's own aria-label already speaks the full readout;
// this is the visual layer. AA pairs is the one entry carrying a verdict as well as a number, and
// it draws the same badge the list row and the detail panel draw, from the same aaReadout.
const CardMetrics = ({ c }) => (
  <div style={c.cardMetricsStyle} aria-hidden="true">
    {/* 4px between a label and its value, not 2. At 8-over-10 the pair was 18px of type and 2px
        held them together; at 11-over-13 it is 24px and the same 2px read as the two lines
        touching. The gap between PAIRS is 14 (see cardMetricsStyle), so this has to stay well under
        it or the grouping inverts — 4 keeps the ratio near the 1:3 it had before. */}
    {c.cardMetrics.map((m, mi) => (
      <div key={mi} style={sx('display:flex;flex-direction:column;gap:4px;min-width:0')}>
        {/* THE COLOUR WAS THE DARK THEME'S, HARD-CODED, AND IT ONLY FAILED IN THE LIGHT ONE.
            #a3a39c is --on-surface-muted's DARK value written as a literal. On a dark card it is
            the right colour and measures 6.5:1; on the light card's #fafaf8 it measured 2.43:1 —
            an informative label, at 8px, at barely half the contrast its own value had. The token
            resolves per theme, which is the entire reason the token exists, and it lands at 5.5:1
            light / 6.5:1 dark. Nothing else about the label changed except the size floor. */}
        <span style={sx('font-family:Neue Montreal;font-size:var(--fs-fine);letter-spacing:var(--track-flat);color:var(--on-surface-muted);white-space:nowrap')}>{m.label}</span>
        {/* Value first, badge trailing — the opposite order to the list row, and for the reason the
            row uses its own: put the number where the eye is already reading. The row's values are
            a RIGHT-aligned numeric column, so the badge leads and the count lands on the shared
            right edge. Here the values are a LEFT-aligned column — 0.069, Warm, 24.07.26 all start
            on one line — so a leading badge indented this one number out of that column and broke
            the only alignment the grid has. The number takes the column edge; the badge follows as
            the qualifier it is. */}
        {/* --fs-body and tabular figures. These are the values a reader compares BETWEEN cards —
            hue against hue, max contrast against max contrast — read across a wall of them at a
            glance. At --fs-label they were 10px, a size the ladder reserves for uppercase labels,
            and set in proportional digits so the same figure took a different width on every card
            and no column of them ever lined up. */}
        <span style={sx('display:flex;align-items:baseline;gap:7px;min-width:0;font-family:Neue Montreal;font-size:var(--fs-body);font-variant-numeric:tabular-nums;letter-spacing:var(--track-title);color:var(--on-surface);white-space:nowrap;text-transform:capitalize')}>
          <span style={sx('overflow:hidden;text-overflow:ellipsis')}>{m.text}</span>
          {m.aa && <AaBadge aa={m.aa} />}
        </span>
      </div>
    ))}
  </div>
);

// ===== THE OPEN CARD'S PANEL — the readout the tile used to wear, arriving on press =====
// The strip at the head, exactly where the card carried it: the panel reads as the card's own band
// unfolded, not as a second surface with its own idea of a top. Identity and metrics follow; the
// foot holds the two controls. The body scrolls INSIDE the box — the pair is sized never to leave
// the viewport (universe.js openTile), so when the box is small the content yields, not the layout.
// touch-action pan-y on the body because the field above it declares none: a scroll container ends
// the ancestor walk, so this is the one place a finger can scroll in the whole view.
// Each `data-upanel-part` is a beat in the arrival — strip, body, foot, on --dur-stagger.
const UniversePanel = ({ c }) => (<>
  {/* The strip takes more of the open box than it took of the card — the swatches ARE the palette,
      and a 46px band at the head of a 630px panel read as a ruled line over a page of air. A share
      of the box, floored at the card's own band and capped where a band stops being a band: on a
      tall panel the colour leads, on a short one the readout keeps its room and scrolls. */}
  <div data-upanel-part="1" data-strip="1" style={sx('display:flex;flex:0 0 clamp(46px, 28%, 200px);width:100%')} aria-hidden="true">
    {c.strip.map((st, si) => (<div key={si} style={st.style}></div>))}
  </div>
  <div data-upanel-part="1" data-lenis-prevent="1" style={sx('flex:1;min-height:0;overflow-y:auto;touch-action:pan-y;user-select:text;padding:12px 14px 14px;display:flex;flex-direction:column;gap:6px;width:100%')}>
    <div style={sx('display:flex;justify-content:space-between;align-items:baseline;gap:8px')}>
      <CardIdentity c={c} />
    </div>
    {/* --fs-label and --track-flat, exactly as the detail's trait chips set the same words: one size
        and one tracking for the traits on every surface. (The card's own -0.01em stays on the card's
        own lines; this is the chips' line, unpinned.) Wraps rather than truncates. */}
    <span style={sx('font-family:Neue Montreal;font-size:var(--fs-label);letter-spacing:var(--track-flat);color:var(--on-surface-muted);text-wrap:pretty')}>{c.descriptors}</span>
    <CardMetrics c={c} />
  </div>
  {/* The foot: the door to the detail leads, the close mark trails — the same 32px mark every
      surface in the app closes with, on the same tier. Detail is a Button because it LEAVES this
      surface for a fullscreen one (aria-haspopup says so), where the close only changes this one.
      While a card is open this is the ONLY close mark on screen: the view's own, in the corner,
      is put away for the duration (universe.js openTile), because leaving the field with a card
      mid-open is an exit the engine cannot play. */}
  <div data-upanel-part="1" data-voice="banner" style={sx('flex:none;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:14px;border-top:1px solid var(--line)')}>
    {/* THE BANNER'S VOICE (17.09.26, by request): the dialogs' button type and Title Case, where this
        was the uppercase action voice. An open card is a surface with a question at its foot, like
        the dialogs, so its one act speaks as theirs do. */}
    <Button data-emphasis="secondary" onClick={c.onDetail} aria-haspopup="dialog" aria-label={c.detailAria} style={CONSENT_BTN_TYPE} label={<span style={sx('display:flex;align-items:center;height:16px')}><ButtonText>Open Detail</ButtonText></span>} />
    <button type="button" data-ix="press" data-focus="chrome" data-upanel-close="1" onClick={c.onClose} aria-label={c.closeAria} title="Close" style={sx('flex:none;width:32px;height:32px;display:inline-flex;align-items:center;justify-content:center;background:none;border:1px solid var(--action-line);border-radius:var(--radius-pill);padding:0;color:var(--on-surface);cursor:pointer')}><TextSwap><IconClose /></TextSwap></button>
  </div>
</>);

// The state marker both facet groups share. Three states, three SHAPES — empty square, filled
// square with a check (both on --radius-tick since 17.09.26, audit Q4), and a bare rule — so the unavailable state is never carried by colour or
// dimming alone (SC 1.4.1). A rule rather than a greyed box because a box, however faint, still
// says "this is a thing you tick"; a rule says the tick is not on offer.
// THE TICK DRAWS ITSELF, IN AND OUT (21.09.26, by request): Osmo Supply's Animated Checkbox, the box
// still and only the tick moving — see the ANIMATED CHECKBOX block in global.css. The check is always
// rendered and the state is an attribute, so a transition has something to run on in both directions;
// it used to mount with the state and unmount without it, which left nothing to animate out.
const FacetMark = ({ active, unavailable }) => (
  unavailable
    ? <span aria-hidden="true" style={sx('width:12px;height:12px;flex:none;display:inline-flex;align-items:center;justify-content:center')}>
        {/* In the row's own ink, which a row that cannot narrow sets at the disabled tier (global.css). */}
        <span style={sx('width:8px;height:1px;background:currentColor')}></span>
      </span>
    : <span aria-hidden="true" className="checkbox__custom" data-checked={active ? '' : undefined}>
        <span className="checkbox__custom-check"></span>
      </span>
);

/* COPYING SWAPS THE WORDS THROUGH THE LINE'S MASK (19.09.26, by request: "when pressing a value on a
   swatch for copy, it should make the text mask animation and "Copied" should be title case"). The
   value vanished in one frame while "Copied" rose into its place, and the harmony drawer's cells
   swapped with no motion at all. Now the leaving word goes up out of the mask as the arriving one
   rises into it, on one length and curve, so the two read as one strip moving, as a button's label
   does (.tswap), and the same again when the confirmation ends. The leaving copy exists for the flip
   it belongs to only, so a new palette's values are never swapped out. "Copied" is set as written, in
   Title Case; the values keep their capitals. `arrive` keeps the value rows' own rise on mount. */
const MASK_IN = 'val-mask-a var(--dur-swap) var(--ease-entrance) both';
const MASK_OUT = 'val-mask-out var(--dur-swap) var(--ease-entrance) both';
/* What each swap has to remember: the state it is showing, what left when that state last changed, and
   a count that keys both spans so their animations restart on the flip. Nothing leaves on the first
   render, which is what keeps a new palette's values and marks from swapping out something that was
   never there. */
function useFlip(state, leaving) {
  const flip = React.useRef({ state, gone: null, n: 0 });
  if (flip.current.state !== state) flip.current = { state, gone: leaving, n: flip.current.n + 1 };
  return flip.current;
}
function CopySwap({ copied, value, arrive, style }) {
  const { gone, n } = useFlip(copied, copied ? value : 'Copied');
  const word = (caps) => ({ display: 'inline-block', textTransform: caps ? 'uppercase' : 'none' });
  return (
    <span style={{ ...style, display: 'block', overflow: 'hidden', position: 'relative' }}>
      <span key={'in' + n} style={{ ...word(!copied), animation: n || arrive ? MASK_IN : 'none' }}>{copied ? 'Copied' : value}</span>
      {gone != null && (<span key={'out' + n} aria-hidden="true" style={{ ...word(copied), position: 'absolute', left: 0, top: 0, animation: MASK_OUT }}>{gone}</span>)}
    </span>
  );
}
/* AND THE MARK TRAVELS WITH THE WORD (19.09.26, by request: "the same mask animation for copied should
   also influence the icon"). The copy mark and the check swapped in one frame while the words beside
   them rode the mask, so half the row moved and half of it cut. It is the same two keyframes and the
   same clipping box, at the size of the mark: the leaving glyph goes up and out as the arriving one
   rises into its place, and the pair reads as one strip. aria-hidden, as it was — the button's name
   says what it does and the live region says what happened. */
function MarkSwap({ copied, style }) {
  const { gone, n } = useFlip(copied, copied ? <IconCopy /> : <IconCheck />);
  const layer = { display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' };
  return (
    <span style={{ ...style, position: 'relative', overflow: 'hidden' }} aria-hidden="true">
      <span key={'in' + n} style={{ ...layer, animation: n ? MASK_IN : 'none' }}>{copied ? <IconCheck /> : <IconCopy />}</span>
      {gone != null && (<span key={'out' + n} style={{ ...layer, position: 'absolute', left: 0, top: 0, animation: MASK_OUT }}>{gone}</span>)}
    </span>
  );
}

// swatch value row (result bands + overlay bands share it). Neither renders the caveat chip since
// 19.09.26 (audit U6); the spoken name still carries it.
function ValueRow({ v, showCaveat }) {
  return (
    <button type="button" data-ix="cell" data-focus="value" onClick={v.onCopy} aria-label={v.aria} style={v.rowStyle}>
      <span style={v.colStyle}>
        <span style={v.labelRowStyle}>
          <span style={sx('font-family: Neue Montreal; font-size:var(--fs-fine)')}>{v.labelText}</span>
          {showCaveat && v.hasCaveat && (<span style={sx('font-size:var(--fs-fine); font-family: Neue Montreal; text-transform: uppercase')}>{v.caveat}</span>)}
        </span>
        <CopySwap copied={v.copied} value={v.value} arrive style={sx('font-family: Neue Montreal; font-size:var(--fs-detail)')} />
      </span>
      <MarkSwap copied={v.copied} style={v.iconWrapStyle} />
    </button>
  );
}

// Each of these names a job, not a noun. "Contrast" named the subject the button is about and left
// the user to supply the verb; in a row of six that is six subjects and no route.
/* OPTICALLY BALANCED (18.09.26, by request): each icon steps into the button's left padding by what
   its glyph's own empty margin adds, so the ink sits as far from the pill's left edge as the last
   letter does from its right. Measured ink-to-edge in the row, not taken from the path: Check
   Contrast was 1px heavier on the left, Export 3, Share 2.75 (between the two device pixels 2.5 and
   3 land on at 2x); Add to Projects was already even, and
   Copy's -1.5px is split by its centred unit into 0.75 a side. The same move New Palette makes in
   chrome.jsx. */
const contrastButtonLabel = (
  <span style={sx('display:flex;align-items:center;gap:7px;height:16px')}><span aria-hidden="true" style={{ display: 'inline-flex', marginLeft: '-1px' }}><IconContrast /></span><ButtonText>Check Contrast</ButtonText></span>
);
// EXPORT'S CHEVRON IS GONE. It was there to promise a chooser — press this and you will be asked
// something — and that promise is the one thing this control did not need to make: what opens is a
// DIALOG, not a menu, and a dialog announces itself by covering the screen. The formats behind it
// are not five equivalents either; they carry extensions and a semantic-scaffold decision that
// changes what each one emits, which is why it is a dialog in the first place.
const exportButtonLabel = (
  <span style={sx('display:flex;align-items:center;gap:7px;height:16px')}><span aria-hidden="true" style={{ display: 'inline-flex', marginLeft: '-3px' }}><IconExport /></span><ButtonText>Export</ButtonText></span>
);
/* COPY FOLDED INTO EXPORT (22.09.26, by request: "fix the mismatch and fold copy into export"). Copy
   and Export were one act, taking the palette out in a format, split by where it lands, and Copy's CSS
   was not Export's CSS: a --<slug>-1 list against the --palette-<slug>-01 file, two answers under one
   name. The export dialog now holds a Copy group over its Download group, the clipboard CSS is the
   downloaded file byte for byte (paletteCss in lib/exporters.js), and every row confirms in place.
   CopyControl, its label, its sheet, its trigger's padding rule in global.css and the copyMenuOpen flag
   went with it. Share stays its own door: sending a palette to someone is a different intent. */

/* THE SHARE DIALOG (19.09.26, by request: "go with the download image and build a"). Share copied a
   link on the press and said nothing about what else a share could be; it opens a sheet now, the
   export dialog's layer, corner, header and rows, with three ways out:
   - Copy Link, answering "Copied" in the row, as the export dialog's rows do;
   - Share via…, the device's share sheet, only where the browser has one;
   - Download Image, the palette as a 1080 by 1350 picture (lib/paletteCard.js), answering "Downloaded".
   No social buttons: a link previews as the site's card, never the palette (it rides in the fragment),
   and the share sheet already reaches the apps people have. The labels are written in their Title
   Case, so the rows set no text-transform and "via" stays lower case.
   TWO CALL SITES, ONE SHEET. The result stage and the palette detail both mount this off one flag, and
   a centred dialog drawn by both stacks two scrims and hands a screen reader two aria-modal dialogs for
   one choice. `owns` settles it at the call site: the overlay takes it whenever it is up, the stage
   otherwise. */
function ShareControl({ open, owns, name, rows, onToggle, onKey, itemStyle, tint }) {
  const host = typeof document !== 'undefined' ? (document.querySelector('[data-app]') || document.body) : null;
  return (<>
    <Button data-share-trigger="1" data-emphasis="secondary" aria-haspopup="dialog" aria-expanded={open}
      onClick={onToggle} onKeyDown={onKey} aria-label="Share this palette: copy a link, send it, or download an image"
      style={CONSENT_BTN_TYPE} label={shareButtonLabel()} />
    {open && owns && host && createPortal(
      <div data-share-layer="1" style={sx('position:fixed;inset:0;z-index:125;display:flex;align-items:center;justify-content:center;padding:24px')}>
        <div data-modal-backdrop="1" onClick={onToggle} style={sx('position:absolute;inset:0;background:color-mix(in srgb, var(--scrim) 55%, transparent);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)')}></div>
        <div data-share-dialog="1" data-lenis-prevent="1" role="dialog" aria-modal="true" aria-label={'Share ' + name} onKeyDown={onKey} style={sx('position:relative;width:440px;max-width:94vw;max-height:88vh;overflow-y:auto;background:var(--surface);border:1px solid var(--line-strong);border-radius:var(--radius-surface);box-shadow:var(--shadow-surface);display:flex;flex-direction:column')}>
          <header style={sx('display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:20px var(--page-gutter) 0')}>
            <div style={sx('display:flex;flex-direction:column;gap:4px;min-width:0')}>
              <span style={sx('font-family:Neue Montreal;font-size:var(--fs-label);letter-spacing:var(--track-flat);color:var(--on-surface-muted)')}>Share Palette</span>
              <h2 style={sx("margin:0;font-family:'Neue Montreal';font-weight:500;font-size:var(--fs-subtitle);letter-spacing:var(--track-title);color:var(--on-surface);white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{name}</h2>
            </div>
            <button type="button" data-ix="press" data-focus="chrome" onClick={onToggle} aria-label="Close share options" title="Close" style={sx('flex:none;width:32px;height:32px;display:inline-flex;align-items:center;justify-content:center;background:none;border:1px solid var(--action-line);border-radius:var(--radius-pill);padding:0;color:var(--on-surface);cursor:pointer')}><TextSwap><IconClose /></TextSwap></button>
          </header>
          {/* No lead (19.09.26, audit X4, by request): "Anyone with the link sees this palette as it
              is now." went with Copy's and Export's, so the three sheets open the same way. */}
          <div style={sx('padding:16px var(--page-gutter) 22px;display:flex;flex-direction:column;gap:6px')}>
            {rows.map((r) => (
              /* Focus goes back to the row after the pick, as in Copy's sheet: the copy fallback and
                 the download's anchor both take it for a moment. */
              <button key={r.key} type="button" data-ex-item="1" data-focus="chrome" onClick={(e) => { const el = e.currentTarget; r.onPick(); requestAnimationFrame(() => { try { el.focus(); } catch (err) { } }); }}
                onMouseEnter={tint && tint.onEnter} onMouseLeave={tint && tint.onLeave} onFocus={tint && tint.onFocus} onBlur={tint && tint.onBlur}
                aria-label={r.label + (r.done && r.doneWord ? ', ' + r.doneWord.toLowerCase() : '')} style={itemStyle}>
                <span style={sx('font-size:var(--fs-body);font-weight:500;letter-spacing:var(--track-flat)')}><TextSwap>{r.label}</TextSwap></span>
                {r.doneWord && (
                  <span aria-hidden="true" data-done-mark="1" style={{ ...sx('display:inline-flex;align-items:center;flex:none;font-family:Neue Montreal;font-size:var(--fs-body);font-weight:500;letter-spacing:var(--track-flat);color:var(--on-surface);white-space:nowrap;transition:opacity var(--dur-chrome) var(--ease-standard),transform var(--dur-chrome) var(--ease-standard)'), opacity: r.done ? 1 : 0, transform: r.done ? 'translateX(0)' : 'translateX(4px)' }}>{r.doneWord}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    , host)}
  </>);
}

// Filing takes the same folder glyph the archive row and the overlay header already use — one
// concept, one mark — and a label that changes with the state rather than an icon that doesn't.
const assignButtonLabel = (text) => (
  <span style={sx('display:flex;align-items:center;gap:7px;height:16px')}><span aria-hidden="true" style={{ display: 'inline-flex' }}><IconFolder /></span><ButtonText>{text}</ButtonText></span>
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
/* SINCE 19.09.26 THE BUTTON OPENS THE SHARE DIALOG and always says Share: the rows inside confirm
   what was done, so the label no longer swaps to Copied. */
const shareButtonLabel = () => (
  <span style={sx('display:flex;align-items:center;gap:7px;height:16px')}>
    <span aria-hidden="true" style={{ display: 'inline-flex', marginLeft: '-2.75px' }}><IconLink /></span>
    <ButtonText>Share</ButtonText>
  </span>
);

// Mobile read-only share view. A separate lightweight surface, NOT a responsive port of the tool —
// it exists so a shared link opened on a phone shows the palette instead of the desktop gate. The
// tool still gates; this only ever renders somebody else's finished palette. Since 17.09.26 (audit C5)
// it is ONLY that: the example palettes no longer open here, and there is no example list above it.
/* THE PHONE'S STORY. Eight chapters that read one photograph, standing where the desktop gate used
   to — see src/styles/story.css for the layout argument.

   IT IS /about's PAGE, AT ONE COLUMN. Not a surface that resembles it: the same section element, the
   same grid, the same reading column, the same figures, and — the part that matters most and was
   hardest to see — the same MOTION MODULES. initPageReveal, initCascade, initDividers and the gallery
   rail are all root-scoped, so they run over this markup exactly as they run over /about's. There is
   no second reveal engine and no second set of tokens to drift. (/about's anchor dock is the one
   piece it does not share since 16.09.26.)

   NO PHOTOGRAPH BEHIND THE WORDS. The first pass hung a fixed image behind the whole surface with a
   gradient scrim over it, and copy on top. Three things were wrong with that and only the first was
   obvious: the type's contrast depended on which part of which photograph happened to sit behind it,
   so it was a different answer per case and per scroll position; a fixed image cannot be themed, so
   the surface had one appearance while the rest of the site had two; and it is not what this site
   does — /about has no full-bleed photograph behind body copy in any of its thirteen sections. The
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

      {/* NO CHAPTER DOCK (16.09.26, by request). This surface carried /about's anchor dock, the glass
          pill at the foot of the screen that named the current chapter and opened into the list. The
          phone story no longer has it; /about keeps its own. The chapters keep their ids. */}

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
      <main key={st.tellKey} id="main">
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
          this surface is built on anyway — the section's heading still animates, and
          nothing that can be pressed is ever mid-rewrite when a thumb lands on it. */}
        {/* THE PROLOGUE. The one screen with no number: it is the arrival, and
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
              <p className="story-hero__lead" data-story-hero-line>Atmos shows how colours share weight, create contrast and shape the feeling of an image. The tool opens in a window 1024 px or wider.</p>
              {/* The label names the palette once there is one to name — see beginLabel in
                  renderVals. `data-case="own"` for the same reason the picker's titles carry it: the
                  name is a string the reading invented, so nothing downstream may case it. */}
              <div className="story-hero__act">
                <button type="button" className="glass-cta" data-focus="chrome" onClick={st.onBegin}
                  aria-label={st.beginLabel + ': begin the story'}><TextSwap><span data-case="own">{st.beginLabel}</span></TextSwap></button>
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
        {/* NO SECTION RULES ON THIS SURFACE (16.09.26, by request, as on /about): no section here carries
            data-rule, so about.css draws no hairline at a chapter's top. */}
        {/* THE HEADINGS BREAK WHERE THE SENSE DOES, THE REST AT THE SOFT INK (22.09.26, by request: "adjust
            headlines on the mobile landing in same way as how it works"). How it Works' section headings
            and this story's close already read this way: the instruction or the subject first, what
            completes it second, in .about-head__soft, which is 62% here because phones set these at 22px
            (about.css). The markup is static, so the line reveal's innerHTML restore cannot strand it
            (see the split-targets note in maskLines.js). The hero keeps its one solid statement, which
            balance already breaks after "from", as How it Works' does. */}
        <section id="story-image" data-story-ch="image" data-sec className="about-sec about-grid">
          <div className="about-col">
            <h2 data-sec-head>Start With<br /><span className="about-head__soft">the Whole Image</span></h2>
            <p data-reveal>{st.name} is a palette of five colours drawn from this image. Explore their proportions, properties and contrast to understand how they relate.</p>
          </div>
        </section>

        {/* 1.2 — THE STRUCTURE, as /about's weight figure: a bar of true shares, numbers in the key. */}
        <section id="story-structure" data-story-ch="structure" data-sec className="about-sec about-grid">
          <div className="about-col">
            <h2 data-sec-head>A Palette Is More Than<br /><span className="about-head__soft">a List of Colours</span></h2>
            <p data-reveal>Each colour holds a share of the frame. These are the real proportions.</p>
          </div>
          {/* THE FIGURE IS HOW IT WORKS 2.1's (19.09.26, by request: "apply it to the phone story", with
              the key's stroke gone). The bar's parts rise out of the focus blur, the key is colour tiles
              whose hex and OKLCH rise through their masks (aboutTiles.js) and whose shares count up in
              Osmo's odometer (numberOdometer.js), each landing 0.2s after the one before. Keyed by the
              case: the odometer rebuilds a share's text into its own columns, so a new photograph
              gets new tiles rather than React writing into text the odometer has replaced. The
              rolling strips are aria-hidden, each share has a hidden twin, and role="list" is the
              Safari repair (list-style:none drops list semantics there). */}
          <figure className="about-figure about-figure--full">
            <div className="about-weights" data-cascade data-reveal-focus role="img" aria-label={st.weightsAria}>
              {st.swatches.map((r) => (
                <span key={r.key} className="about-weights__part" style={{ width: r.share + '%', background: r.hex }}></span>
              ))}
            </div>
            <ol key={st.caseId} className="about-tiles" role="list" data-cascade data-tile-lines data-odometer-group data-odometer-trigger-start="top 88%" data-odometer-stagger="0.2">
              {st.swatches.map((r) => (
                <li key={r.key} className="about-tile" style={{ '--tile': r.hex, '--tile-ink': r.ink }}>
                  <span className="about-tile__line about-tile__line--hex" data-tile-line=""><span>{r.hex}</span></span>
                  <span className="about-tile__line about-tile__line--ok" data-tile-line=""><span>{r.ok}</span></span>
                  <span className="about-tile__pct"><span data-odometer-element="" data-odometer-start="0" data-odometer-duration="1.4" aria-hidden="true">{r.pct}</span><span className="about-sr">{r.pct}</span></span>
                </li>
              ))}
            </ol>
          </figure>
        </section>

        {/* 1.3 — WHERE THE COLOUR LIVES. The two stacked photographs live HERE, inside a bounded
            figure, because here they are the subject — a colour's region cut out of its own picture. */}
        <section id="story-where" data-story-ch="where" data-sec className="about-sec about-grid">
          <div className="about-col">
            <h2 data-sec-head>See Where<br /><span className="about-head__soft">Each Colour Comes From</span></h2>
            {/* ONE SENTENCE, WHATEVER THE MASKS SAY (19.09.26). It told a case with no locatable colour
                that they were "spread too finely to locate", and that note went by request ("we
                overexplain too much"). Every example locates at least two colours once its masks are
                built. A constant also can't go stale: data-reveal splits this paragraph and writes back
                the markup it split when the reveal ends, so a sentence React set mid-reveal was
                written over, and a case chosen before its masks were built kept the no-region one. */}
            <p data-reveal>Select a colour to find it in the photograph.</p>
          </div>
          {st.hasImage && (
            <figure className="about-figure about-figure--full">
              <div className="story-mask">
                <img className="story-mask__base" src={st.image} alt="" decoding="async" style={{ opacity: lit ? 0 : 1 }} />
                <img className="story-mask__dim" src={st.image} alt="" decoding="async" style={{ opacity: lit ? 1 : 0 }} />
                <img className="story-mask__lit" src={st.image} alt="" decoding="async"
                  style={lit ? { opacity: 1, WebkitMaskImage: 'url(' + st.litMask + ')', maskImage: 'url(' + st.litMask + ')' } : { opacity: 0 }} />
              </div>
              {/* THE SHARES COUNT UP HERE TOO (21.09.26, by request: "Make sure all numbers are cohesive so
                  they have this progressive blur animation"). The key's tiles count theirs out of the blur
                  and these cards print the same figures a screen later, so they take the same odometer,
                  trigger and stagger. The roll is aria-hidden and each share keeps a hidden twin.
                  A GROUP ONLY ONCE THE CARDS ARE FINAL. The masks settle after the story is built, and
                  settling turns a cell into a button, which React builds new: an odometer built before
                  then counts the cards it replaced, off the page, and the ones on it never move (three
                  runs in four, measured). So the group is declared when the masks have settled, and
                  PaletteApp builds a count for a group that arrives after the story's modules. */}
              <ul className="about-roles" data-story-picks="1" data-cascade data-odometer-group={st.picksFinal ? '' : undefined} data-odometer-trigger-start="top 88%" data-odometer-stagger="0.2" aria-label="The palette's colours">
                {/* A SWATCH WITH NO REGION IS NOT A DISABLED BUTTON, IT IS A CELL. `[data-ix]:disabled`
                    sets opacity:.42, which repaints the swatch — the one element whose whole job is to
                    be an exact colour — and takes its note to roughly 2.5:1 at 10px. /about's rule for
                    a cell carrying real palette colour is "NO OPACITY… that is not a tint", and it
                    ships this component as a plain div. So do we, where there is nothing to press. */}
                {st.swatches.map((r) => (
                  <li key={r.key}>
                    {/* THE CARD IS THE COLOUR (19.09.26, by request), as How it Works' role cells have
                        been since 18.09: the colour fills the cell and its words sit on it in the ink that
                        reads there, where this was a white card with an edge and the colour as a swatch
                        inside it. story.css places them; the swatch element is gone, because the cell IS
                        the swatch. */}
                    {r.hasRegion ? (
                      <button type="button" className="about-role" data-story-pick="1" data-ix="cell" data-focus="value"
                        style={{ '--role-colour': r.hex, '--role-ink': r.ink }}
                        aria-pressed={r.selected} aria-label={r.aria} onClick={r.onPick}>
                        {/* THE SHARE, BARE, AT THE CELL'S BOTTOM RIGHT (19.09.26, by request: "just write % in
                            the bottom right", and "of the frame" goes everywhere, since it took too much room).
                            The hex holds the caption's top left and the share its own last line, on the right;
                            story.css places them. */}
                        <span className="about-role__foot"><span className="about-role__hex">{r.hex}</span><span className="about-role__pct"><span data-odometer-element="" data-odometer-start="0" data-odometer-duration="1.4" aria-hidden="true">{r.pct}</span><span className="about-sr">{r.pct}</span></span></span>
                      </button>
                    ) : (
                      <div className="about-role" data-story-pick="1" style={{ '--role-colour': r.hex, '--role-ink': r.ink }}>
                        {/* NO NOTE SAYING WHY (19.09.26, by request: "We don't need to explicitly say 'Spread
                            too finely to locate'… We overexplain too much"). The cell is the same card as its
                            neighbours; that it is not a button is the whole difference. Taking the edge off
                            only these was tried and reversed the same day ("That doesn't make any sense. bring
                            it back"); now no card has one, and they still look alike. */}
                        <span className="about-role__foot"><span className="about-role__hex">{r.hex}</span><span className="about-role__pct"><span data-odometer-element="" data-odometer-start="0" data-odometer-duration="1.4" aria-hidden="true">{r.pct}</span><span className="about-sr">{r.pct}</span></span></span>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </figure>
          )}
        </section>

        {/* 2.1 — CHARACTER, ROLE AND CONTRAST. Three /about figures behind one segmented group. */}
        <section id="story-relationships" data-story-ch="relationships" data-sec className="about-sec about-grid">
          <div className="about-col">
            <h2 data-sec-head>Character, Role<br /><span className="about-head__soft">and Contrast</span></h2>
            <p data-reveal>Explore the palette through its visual character, suggested roles and measured contrast between colours.</p>
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
            <div data-toggle-init className="toggle-switch" role="group" aria-label="Which view to show">
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
                {/* The shares count as the picks' do (21.09.26, by request): on their trigger when the story
                    is built with Role already chosen, and at once when the tab is pressed (setStoryTab). */}
                <div className="about-roles" data-cascade data-odometer-group data-odometer-trigger-start="top 88%" data-odometer-stagger="0.2">
                  {st.roleCells.map((c) => (
                    <div key={c.key} className="about-role" style={{ '--role-colour': c.swatch, '--role-ink': c.ink }}>
                      <span className="about-role__name">{c.name}</span>
                      <span className="about-role__foot"><span className="about-role__hex">{c.hex}</span><span className="about-role__pct">{c.pct ? <><span data-odometer-element="" data-odometer-start="0" data-odometer-duration="1.4" aria-hidden="true">{c.pct}</span><span className="about-sr">{c.pct}</span></> : null}</span></span>
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
                <p className="about-figure__label">{withRatios(st.aaCount)}</p>
                {/* `.about-checks` — About's narrow-column form of the pair row. THE PAIR IS DRAWN, NOT
                    SPELLED (19.09.26, by request: "remove the hex here and apply the same visual as we use
                    for Best pairs"): the checker's two overlapping discs with the ratio beside them, one
                    unit, and the verdict at the row's end, so each pair takes one line where it took
                    two. The row used to name its pair as text beside two square chips, "#0A2944 on
                    #D0D2C6", on the argument that a pair shown only in colour says it in colour alone;
                    the name is still there for a screen reader, visually hidden, as the checker's is. */}
                <ul className="about-checks" data-cascade>
                  {st.pairs.map((pr) => (
                    <li key={pr.key} className={pr.cls}>
                      <span className="about-checks__pair">
                        <PairMark fg={pr.a} bg={pr.b} />
                        <span style={visuallyHidden}>{pr.pair}, </span>
                        <span className="about-checks__val">{withRatios(pr.val)}</span>
                      </span>
                      <span className="about-checks__verdict">{pr.use}</span>
                    </li>
                  ))}
                </ul>
              </figure>
            )}
          </div>
        </section>

        {/* 2.2 — THE READING. */}
        <section id="story-interpretation" data-story-ch="interpretation" data-sec className="about-sec about-grid">
          <div className="about-col">
            <h2 data-sec-head>What Atmos Says<br /><span className="about-head__soft">About This Palette</span></h2>
            {/* data-reveal, NOT data-highlight-text — and the paragraph this replaces argued the
                other way, so it is worth saying why it lost. The highlight (Osmo's resource, ported
                in methods/aboutHighlight.js) resolved the reading character by character on scroll,
                on the argument that watching it resolve is watching the reading arrive. True of the
                sentence; not true of the page. It was a second motion vocabulary for one paragraph
                — every other piece of copy on this surface arrives through the masked line reveal,
                an overflow-hidden block with the words sliding up inside it: the hero, the chapter
                headings, the useLine one element below this, the gate, the loader. One paragraph
                animating differently read as a different product speaking mid-sentence.

                Nothing had to be wired up: pageReveal collects [data-reveal] per [data-sec] and this
                section carries one, so the statement simply joins the group its own neighbour is
                already in. initHighlightText stays armed on the story root and now finds nothing —
                /about still uses it on its own closing statement, and leaving the call means a
                future section that wants it works without a rebuild. */}
            {st.rationale && (
              <p className="about-statement" data-reveal>{st.rationale}</p>
            )}
            {st.useLine && <p data-reveal>{st.useLine}</p>}
          </div>
        </section>

        {/* 3.1 — HOW IT WORKS' 4.1, ON THE PHONE (16.09.26, by request: exploring an example mirrors that
            scene, copy included).

            One pinned scene, built by /about's own module (methods/aboutRail.js). There is no heading: the
            statement assembles as hero text on the empty stage, fades from its end as the first photograph
            flies in, and the photographs cross the screen with the rail's drift. The close below is the
            rail's [data-rail-handoff], so "Start with an image" starts assembling as the last one leaves.
            This replaces Osmo Supply's Horizontal Scrolling Sections, which carried the same seven cases two
            to a screen after the old heading and sentence.

            THE CARDS ARE PHOTOGRAPHS, NOT BUTTONS (19.09.26, by request: "Make sure the horizontal cards
            on mobile cant be pressed when scrolling. we want the user to get to the cta and click explore
            another palette"). They opened their example, and a pinned rail fills the screen, so a scroll
            that began on a card and moved too little was a tap: the story jumped back to its photograph
            and the reader never reached the close. They are /about's <article>s now, and Explore Another
            Example is the way on. The live stage lets the pointer through to the close under it, and the
            cards still take it back (story.css), so a tap on a passing photograph lands on nothing. Nothing
            in the scene carries data-reveal: the rail splits the statement itself. Reduced motion and no
            JavaScript get the statement above a row that scrolls sideways, as on /about. */}
        <section id="story-gallery" data-story-ch="gallery" data-sec className="about-sec about-sec--gallery">
          <div className="about-rail" data-rail="1">
            <p className="about-rail__statement" data-rail-statement="1">The examples below are palettes drawn from different photographs. Compare their colours, proportions and contrast, then try your own image in the desktop tool.</p>
            <div className="about-rail__track" data-rail-track="1">
              {st.cases.map((c) => (
                <article key={c.key} className="about-rail__card" data-rail-card="1" style={c.hasImage ? { '--card-img': 'url(' + c.image + ')' } : undefined}>
                  {/* Not lazy, as on /about: the stage clips its row, so a lazy photograph would only be asked
                      for once it was already on screen. Low priority keeps it behind the story's own. */}
                  {c.hasImage && <img src={c.image} alt="" fetchPriority="low" decoding="async" />}
                  {/* the foot's blur and tint, as /about's cards (about.css .about-rail__fade) */}
                  <span className="about-rail__fade" aria-hidden="true"></span><span className="about-rail__tint" aria-hidden="true"></span>
                  {/* The name alone (17.09.26, radius issue R3 and R10, by request): the Warm · Dark
                      line over it and the swatch strip under it went, as on /about. */}
                  <span className="about-rail__content">
                    <span>
                      {/* data-case="own": the palette's NAME is a string the reading invented, and
                          the uppercase control voice would otherwise inherit into it. */}
                      <span className="about-rail__name" data-case="own">{c.name}</span>
                    </span>
                  </span>
                </article>
              ))}
            </div>
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
            distance, and with them equal the effect has nowhere to run.

            AND IT CLOSES AS /about DOES (16.09.26). [data-rail-handoff] pulls it up under the end of the
            gallery's pin by a measured overlap, so the statement starts assembling as the last photograph
            clears its first word; data-sticky-start="top top" has it assemble in place. The lead and the
            act are [data-sticky-title="after"] cued on "Discover", so they arrive with that word rather
            than standing there while the sentence is still being written. That is an opacity and a small
            rise, never a rewrite, so the button keeps its handler throughout. */}
        <section id="story-handoff" data-story-ch="handoff" data-sec
          data-sticky-title="wrap" data-sticky-start="top top" data-rail-handoff="1" className="story-cta">
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
              {/* /about's closing statement, word for word and broken where it breaks there, so the
                  two surfaces end on the same sentence (by request). The split keeps the <br> and
                  writes the sentence onto the heading as its aria-label — see aboutStickyTitle.js. */}
              <h2 data-sticky-title="heading" className="story-cta__title">Start with an image.<br /><span className="about-head__soft">Discover its palette.</span></h2>
              <p className="story-cta__lead" data-sticky-title="after" data-sticky-after-word="Discover">{st.handoffLine}</p>
              <div className="story-actions" data-sticky-title="after" data-sticky-after-word="Discover">
                {/* THE SUFFIX NAMED A SURFACE THIS DOES NOT OPEN. It read "open the example
                    palettes", and Example Palettes is a real, differently-titled screen on this
                    site — the one the share view's `See All Examples` goes to. This control calls
                    openStoryPicker: an image chooser that covers the story in place, and which
                    announces itself as "Choose an image." So a screen-reader user was promised a
                    list and given a carousel, and the control's own live region contradicted its
                    own name. The visible label stays: you do explore another palette, by choosing
                    another photograph. It is the half after the colon that has to be true. */}
                <button type="button" className="glass-cta" data-focus="chrome"
                  onClick={st.onAnother} aria-label="Explore Another Example: choose a different photograph"><TextSwap>Explore Another Example</TextSwap></button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ===== THE IMAGE CHOOSER — Osmo Supply's Layered Image Slider =====

          Opened by the close's one act. The resource's mechanics and data-attributes are kept: a
          centred strip of titles, the masked frame, the counter, the autoplay bar and the two nav
          buttons. The photographs no longer slide side by side: each arriving one is uncovered over
          the last by an edge crossing the screen ([ATMOS 7] in methods/layeredSlider.js), and the
          palette names rise through the site's line masks rather than sliding past ([ATMOS 8]). The module
          (methods/layeredSlider.js) supplies the swipe through Observer.

          THE FRAME IS THE WHOLE SCREEN, by request (15.09.26). It was the resource's small frame at
          the bottom, over a full-bleed background crossfading the same photograph. The frame now
          fills the chooser and keeps its slide, so moving between two photographs is a full-screen
          transition; the crossfading background went with it, because under a full-screen frame it
          could never be seen. The titles are the palette names, over the palette's own photograph.

          It COVERS the story rather than replacing it, so the eight chapters behind it keep their
          scroll position and their built masks while the reader looks — and inert + aria-hidden go
          on the story underneath, because nothing behind a full-screen surface should be reachable. */}
      {st.pickerOpen && (
        <div data-story-picker="1" role="dialog" aria-modal="true" aria-label="Choose an example">
          <section data-layered-slider-init data-layered-slider-autoplay="0" className="layered-slider">
            <div className="layered-slider__container">
              <div data-layered-slider-mask className="layered-slider__mask-collection">
                <div className="layered-slider__mask-list">
                  {st.picker.cases.map((c) => (
                    <div key={c.key} data-layered-slider-mask-item className="layered-slider__mask-item">
                      {c.hasImage && <img src={c.image} draggable="false" alt="" className="layered-slider__mask-img" />}
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
                      <button type="button" className="layered-slider__text-title" data-ix="mark" data-focus="chrome"
                        data-case="own" aria-label={'Choose ' + c.name}>{c.name}</button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="layered-slider__overlay">
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
                    {/* BETWEEN THE ARROWS, by request (15.09.26). The counter and its bar sat at the
                        top under the wordmark; the position now lives with the two controls that
                        change it. The number swaps through a mask and the bar fills to the last
                        slide: [ATMOS 6] and [ATMOS 5] in methods/layeredSlider.js. */}
                    <div className="layered-slider__counter">
                      <span data-layered-slider-current className="layered-slider__span">01</span>
                      <div className="layered-slider__progress">
                        <div data-layered-slider-fill className="layered-slider__progress-inner"></div>
                      </div>
                      <span data-layered-slider-total className="layered-slider__span">05</span>
                    </div>
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
      {/* Room for the floating masthead, which sits over this surface (see the showMobileShare
          branch): its top inset, its height and a block gap under it. A spacer on the scroller rather
          than padding on the first child, because the first child is sometimes a full-bleed image and
          sometimes the name. */}
      <div aria-hidden="true" style={sx('flex:none;height:calc(var(--nav-top) + var(--nav-h) + 8px)')}></div>
      {/* The image the palette was read from. Full-bleed and 4:3 — on a phone a picture inset in
          the gutter reads as an attachment, where this is the evidence for everything under it.
          A 1px inset ring rather than a border: the outline must not shift the picture off the
          edges it is bleeding to. */}
      {/* --img-outline for the same reason as the list's thumbnail — see the note there. */}
      {ms.hasImage && (
        <div data-ms-img="1" style={sx('flex:none;width:100%;aspect-ratio:4/3;overflow:hidden;background:var(--surface-raised);position:relative')}>
          <img src={ms.image} alt={'The photograph ' + ms.name + ' was drawn from'} style={sx('display:block;width:100%;height:100%;object-fit:cover')} />
          <span aria-hidden="true" style={sx('position:absolute;inset:0;box-shadow:inset 0 0 0 1px var(--img-outline)')}></span>
        </div>
      )}

      <div data-ms-head="1" style={sx('flex:none;padding:22px var(--page-gutter) 22px')}>
        <h1 data-mask-copy="1" style={sx("font-family:'Neue Montreal';font-weight:500;font-size:var(--fs-statement);line-height:1.05;letter-spacing:var(--track-statement);color:var(--on-surface);margin:0;text-wrap:balance")}>{ms.name}</h1>
        {/* THE SAME CHIP AS THE RESULT STAGE'S, AND IT ROUNDS WITH IT. This is the phone's copy of
            the trait row — same border, same 9% ground, same uppercase label — so a corner changed
            on one and not the other would make one palette look like two products depending on the
            screen it was opened on. The desktop pair is the row under the palette name; see the
            note there for why they stopped being squares. */}
        {ms.descriptors.length > 0 && (
          <div style={sx('display:flex;flex-wrap:wrap;gap:6px;margin-top:14px')}>
            {ms.descriptors.map((d, i) => (
              <span key={i} style={sx('display:inline-flex;align-items:center;min-height:26px;font-family:Neue Montreal;font-size:var(--fs-body);font-weight:500;letter-spacing:var(--track-flat);line-height:1;padding:var(--btn-pad-chip);background:color-mix(in srgb, var(--on-surface) 9%, var(--surface));color:var(--on-surface);border-radius:var(--radius-pill)')}>{d}</span>
            ))}
          </div>
        )}
        {/* WHAT THE PALETTE IS FOR — not what it is. This slot held the reading ("Warm oranges
            sitting at mid weight, held to a single note"), which describes the palette; it holds
            composeUse()'s line now, which tells you what to do with it. That is the desktop result
            stage's own direction: the reading moved out of the leading slot there for exactly this
            reason, and the phone had been left carrying the half that was demoted.

            It reads: Best for <ground>, <register> <medium>. <capability>. Check the pair you intend
            to use in the contrast checker. The capability clause is the honest half — a palette with
            no usable text pairing says so rather than being recommended for type — and it comes from
            aaState, the same verdict the AA badge shows, so the line and the badge can never disagree.

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
      {/* THE SHARES COUNT UP OUT OF THE BLUR, as the result stage's do (21.09.26, by request: "Make sure
          all numbers are cohesive so they have this progressive blur animation"): once per palette the
          view shows, as it appears (_syncShareCount).
          Keyed by the figures, because the odometer rebuilds a share's text into its own columns and
          React must not write a new palette's numbers into text it no longer owns. The row's
          aria-label already says the share, so the roll is aria-hidden with no twin. */}
      <div key={ms.rows.map((r) => r.hex + r.pct).join(' ')} role="group" aria-label="Palette swatches. Tap a colour to copy its hex" data-odometer-group="" data-odometer-stagger="0.2" style={sx('flex:none;display:flex;flex-direction:column;width:100%')}>
        {ms.rows.map((r) => (
          <button key={r.key} type="button" data-ms-row="1" data-ix="cell" data-focus="value" onClick={r.onCopy} aria-label={r.aria} style={r.style}>
            <span style={r.hexStyle}>{r.hex}</span>
            {/* Both states stacked in one grid cell and crossfaded (17.09.26, audit E6), where the
                figure was swapped for the confirmation in one frame. */}
            <span style={r.metaStyle}>
              <span style={sx('display:inline-grid')}>
                <span data-done-mark="1" style={{ gridArea: '1 / 1', justifySelf: 'end', transition: 'opacity var(--dur-chrome) var(--ease-standard)', opacity: r.copied ? 0 : 1 }}><span data-odometer-element="" data-odometer-start="0" data-odometer-duration="1.4" aria-hidden="true">{r.pct}</span></span>
                <span data-done-mark="1" aria-hidden={!r.copied} style={{ gridArea: '1 / 1', justifySelf: 'end', display: 'inline-flex', alignItems: 'center', transition: 'opacity var(--dur-chrome) var(--ease-standard)', opacity: r.copied ? 1 : 0 }}>Copied</span>
              </span>
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
        {/* No act here. `See All Examples` stood in this foot and led to the example list, which is
            gone with the example view (17.09.26, audit C5); the masthead's mark is the way back. */}
      </div>
    </div>
  );
}

// Off-screen but IN the accessibility tree — the live regions' own style, and the one to reach for
// whenever a control's spoken form has to carry a word its visible form leaves out.
/* ONE VISUALLY-HIDDEN STYLE, for anything that must be read and not seen. It was defined once for
   the live region and is now also what the contrast matrix's per-cell descriptions ride, so the two
   cannot drift into two slightly different ways of hiding the same kind of text. */
const visuallyHidden = sx('position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;margin:-1px;padding:0;border:0');
/* THE PAIR, AS ITS TEXT ON ITS GROUND (19.09.26, by request: "Aa chip everywhere"). "Aa" in the text
   colour on a stadium of the background, so which colour is which reads off the mark. It replaced two
   overlapping discs, which asked a reader to know that the one behind was the background. The contrast
   checker's Best Pair Sample and the phone story's contrast rows use it, and How it Works draws the same
   chip from about.css (.about-pair), at the same 40 by 26 and 13px Medium. NO EDGE since 19.09.26 (by
   request: "no stroke, only pills saying Body text AA and others etc. needs stroke"): the chip is drawn by
   its fill, and the verdict pills are the only outlined things in these rows. The hexes are still said,
   visually hidden, by whoever places the mark. */
const PairMark = ({ fg, bg }) => (
  <span aria-hidden="true" style={{ ...sx("display:inline-flex;align-items:center;justify-content:center;flex:none;width:40px;height:26px;border-radius:var(--radius-pill);font-family:'Neue Montreal';font-size:var(--fs-body);font-weight:500;letter-spacing:var(--track-flat);line-height:1"), background: bg, color: fg }}>Aa</span>
);
/* EVERY "4.5:1" IN A STRING IS DRAWN AS WRITTEN AND SAID "4.5 TO 1" (19.09.26, interface review, by
   request: "fix all"). The figure goes in a [data-ratio] span whose ":1" global.css generates with " to 1"
   as its alternative text. renderVals keeps its strings whole, since titles and sorting read them there;
   only what is rendered as text passes through here. A string without a ratio comes back untouched. */
const RATIO_IN_TEXT = /(\d+(?:\.\d+)?):1(?!\d)/g;
const hasRatio = (s) => typeof s === 'string' && s.indexOf(':1') >= 0 && /\d:1(?!\d)/.test(s);
const withRatios = (s) => {
  if (!hasRatio(s)) return s;
  const out = []; let last = 0;
  s.replace(RATIO_IN_TEXT, (m, n, at) => { if (at > last) out.push(s.slice(last, at)); out.push(<span key={at} data-ratio="">{n}</span>); last = at + m.length; return m; });
  if (last < s.length) out.push(s.slice(last));
  return out;
};
/* A SPLIT TARGET CANNOT TAKE THE SPAN. _maskLineReveal splits an element and writes its markup back by
   innerHTML, so a React element inside one goes inert, and a later value would never reach the page (a
   lone text child is safe: React sets textContent on the parent). There the string stays whole, is hidden
   from a screen reader, and this is said beside it, visually hidden. */
const spokenRatios = (s) => s.replace(RATIO_IN_TEXT, '$1 to 1');
const liveRegionStyle = visuallyHidden;

/* FIRST IN THE TAB ORDER, ON EVERY BRANCH. Rendered ahead of each return's live region rather than
   once at the top, because this render is five separate returns — the tool, the three phone surfaces
   and the document routes — and a landmark link that exists on only some of them is worse than none:
   a keyboard reader learns it is there and then finds it missing on the page that needed it most.

   Every branch's own <main> carries id="main", and exactly one branch renders at a time, so the one
   id is never ambiguous. Styles are in global.css, with the reasoning for the z-index and the
   transform. */
function SkipLink() {
  return <a className="skip-link" href="#main" data-focus="chrome">Skip to Main Content</a>;
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
/* A `lead` prop lived here for one caller — the landing's "Based on …" credit, dropped in as the
   first cell of the meta row so it would share the page margin, the row's baseline and the 700px
   breakpoint. The landing no longer draws a footer at all (see the tombstone in LandingStage), so
   the prop went with it and the credit carries its own three lines of layout instead. If something
   ever needs a cell at the head of this row again, that is the shape it had. */
function SiteFooter({ route, onNavigate, onConsent, onTour, brand = true, landmark = true, create = true }) {
  const Root = landmark ? 'footer' : 'div';
  // The tool's footer is only ever under the tool, never the landing (which draws none), so on the
  // APP route the page this footer sits on is /create.
  const here = route === APP ? CREATE_PATH : pathFor(route);
  const link = (href, label) => (
    <a href={href} onClick={onNavigate} {...(here === href ? { 'aria-current': 'page' } : null)}><TextSwap>{label}</TextSwap></a>
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
          {/* The labels say what the page IS, not what kind of document it is. "About" named a
              convention rather than a subject; "How it Works" is the subject, and it is what the
              page spends its length on. Policy and Terms lose the words that only repeated their
              own category — a footer is already a list of pages, so "Privacy Policy" and "Terms and
              Conditions" were each saying it twice. The PATHS are untouched: /about, /privacy and
              /terms are indexed, sitemapped and 308'd at the edge (see routes.js), and a label is
              not a URL.

              `Privacy`, NOT `Policy`, and the reason is that it was never only here. Trimming the
              category word left this footer saying Policy while the page's own <h1>, the terms
              footer and the noscript block all said Privacy: one page under two names, and the one
              this footer chose is the half that names the document type rather than the subject,
              which is the opposite of the rule the paragraph above states. Privacy is what a reader
              is looking for and what every other surface already called it. */}
          {/* CREATE LEADS (22.09.26, by request). The tool is what the site is for, and from Privacy,
              Terms or How it Works the only way back to it was the mark, which for a first visit
              lands on the front page, one press short of the tool. First in the row because the
              first and last items are the ones remembered. navigate() sends it through openCreate
              from a document, like /about's closing act. `create={false}` on the phone story, where
              there is no tool for it to open and the link would do nothing. */}
          {create && link(CREATE_PATH, 'Create')}
          {link('/about', 'How it Works')}
          {/* SECOND, BETWEEN How it Works AND THE TWO STATEMENTS (20.09.26, by request). It sat last,
              after Privacy Settings, on the argument that an offer goes after the things a reader
              came looking for. Wrong grouping: How it Works and a tour of the tool are the two ways
              into understanding the product, and the two statements plus the analytics door are the
              legal tail. The row now reads product, product, statement, statement, setting. */}
          {onTour && <button type="button" className="site-foot__consent" onClick={onTour} aria-haspopup="dialog"><TextSwap>Take a Tour</TextSwap></button>}
          {link('/privacy', 'Privacy')}
          {link('/terms', 'Terms')}
          {/* THE WAY BACK TO THE ANALYTICS QUESTION, on every page that has a footer. Withdrawing has
              to be as easy as allowing was, and the banner only asks once, so the answer needs a
              standing door. A button among links because it opens something rather than going
              somewhere; site-foot.css gives it the links' type, target and swap so the row stays one
              row. The privacy statement carries a second door for the surfaces with no footer. */}
          {/* A button among links, for Privacy Settings' reason — it opens something rather than going
              somewhere — and it takes that same class, so the row stays one row in one voice. Only
              passed by the tool's own footer: on the landing and the three documents there is
              nothing above it to tour, and a control that opens a dialog about a surface the reader
              cannot see is a control that lies about where it leads. */}
          {onConsent && <button type="button" className="site-foot__consent" onClick={onConsent}><TextSwap>Privacy Settings</TextSwap></button>}
        </nav>
        <p className="site-foot__rights">All Rights Reserved &copy; 2026</p>
      </div>
    </Root>
  );
}

/* THE ANALYTICS QUESTION. Web Analytics and Speed Insights set no cookies, so this does not say
   cookies: it asks whether the two may measure at all, and neither mounts until the answer is yes
   (the call sites here, SpeedInsights in PaletteApp, the send-time gate in lib/consent.js).

   Rendered by PaletteApp, OUTSIDE the page window and ahead of it, rather than by any of this file's
   returns. Outside, because the question outlives a route change: a wipe moves and clips
   [data-page-window], and the banner must neither travel with the departing page nor be rebuilt on
   the arriving one. Ahead, so it is the first thing a keyboard or a screen reader meets.

   THE TOAST'S SURFACE, THE DOCK'S CORNER. --surface-raised, --line-strong and the toast's shadow,
   because this is the same floating object as the toast and the notice: something that arrives over
   the page, says one thing and asks for an answer. The stadium does not survive two lines of prose
   and a row of acts, so the corner is --radius-dock, the system's other designed radius and the one
   its only other multi-row floating panel already takes; the acts inside stay pills, as the dock's
   rows do.

   ACCEPT IS THE FILLED TIER, DECLINE THE OUTLINED ONE, by request: primary is --on-surface ink, the
   system's black, and it inverts on the dark theme as every other filled action does. Decline keeps
   the full outlined button rather than shrinking to a link, so saying no stays one press of the same
   size as saying yes.

   Reopened with analytics on, Accept takes the check the Copied state uses — a glyph beside the word,
   holding still while the word swaps. Only Accept: a tick beside Decline read as approving the
   refusal rather than reporting it, so a declined visitor sees the two answers as they first did.
   aria-pressed states the standing answer either way, and a close appears that keeps it. The close is never offered before an answer exists, so dismissing can never
   be mistaken for one. */
/* THE BANNER'S BUTTON TYPE: --fs-body, 13px (by request, 15.09.26 — two pixels up from --fs-label's
   11, which lands exactly on a step of the scale). Button writes its size inline, so the three
   buttons hand it this style rather than a stylesheet shouting over an inline value. Weight and case
   are in global.css (.consent .button[data-emphasis]). The label rows are 16px, one line of 13. */
const CONSENT_BTN_TYPE = sx('font-family: Neue Montreal; font-size:var(--fs-body); letter-spacing:var(--track-flat)');
/* No check mark on Accept when the banner is reopened (17.09.26, by request): the pressed state
   (aria-pressed, and the filled button) already says which answer stands. */
export function ConsentBanner({ vals }) {
  const choice = vals.consentChoice;
  const act = (value, label, aria, emphasis, onClick) => (
    <Button
      data-emphasis={emphasis}
      {...(choice ? { 'aria-pressed': choice === value } : null)}
      onClick={onClick}
      aria-label={aria}
      style={CONSENT_BTN_TYPE}
      label={<span style={sx('display:flex;align-items:center;height:16px')}><ButtonText>{label}</ButtonText></span>}
    />
  );
  return (
    <div data-consent="1" className="consent" role="region" aria-label="Analytics consent" tabIndex={-1} data-focus="card" {...(choice ? { 'data-closable': '' } : null)}>
      {/* The masthead's pane, first so everything after it paints above — see .consent in global.css. */}
      <GlassEffect />
      <p className="consent__text">We’d like to use Vercel Web Analytics and Speed Insights to understand visits and site performance.</p>
      {/* THE ANSWERS LEAD, on the reading edge under the sentence they answer, and the way to read more
          trails them. "Accept" is named in the privacy statement's Analytics section, which quotes it
          — rename the two together. */}
      <div className="consent__row">
        <div className="consent__acts">
          {act('granted', 'Accept', 'Accept analytics', 'primary', vals.allowAnalytics)}
          {act('denied', 'Decline', 'Decline analytics', 'secondary', vals.declineAnalytics)}
        </div>
        {/* Outlined like Decline, by request, and still a link: it goes somewhere rather than deciding
            anything, so it is an <a> with a real address drawn as the secondary tier. */}
        <span className="consent__more">
          <Button href="/privacy#analytics" data-emphasis="secondary" onClick={vals.learnAboutAnalytics} aria-label="Learn more about analytics" style={CONSENT_BTN_TYPE}
            label={<span style={sx('display:flex;align-items:center;height:16px')}><ButtonText>Learn More</ButtonText></span>} />
        </span>
      </div>
      {/* The toast's dismiss, drawn the same: a 28px outlined disc whose glyph swaps under its mask. In
          the corner rather than the row, so a reopened banner keeps its row on one line at a phone's
          width. */}
      {choice && (
        <button type="button" className="consent__close" data-ix="press" data-focus="chrome" onClick={vals.closeConsent} aria-label="Close, keep your current choice" title="Close"
          style={sx('width:28px;height:28px;flex:none;display:inline-flex;align-items:center;justify-content:center;background:none;border:1px solid var(--action-line);border-radius:var(--radius-pill);padding:0;color:var(--on-surface);cursor:pointer')}><TextSwap><IconClose /></TextSwap></button>
      )}
    </div>
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
           which is solved around that centre, off with it.
           z-index 90 ON A DESKTOP, 150 ON A PHONE. The desktop landing covers the tool, and the tool's
           floating header now stands on it at 95 — and everything the header can open (Restore's
           dialog at 126, a notice at 128) has to arrive in front of the landing too, which at 150 it
           could not. Nothing else sits between the page and 100 on that branch. The phone's ladder
           (the story at 152, its footer at 151, the share view and the list tying at 150) is built on
           this stage at 150 and is left exactly as it was. */
        <div data-landing="1" {...(vals.narrow ? { 'data-desk-gate': '1' } : {})} {...((covered || quiet) ? { inert: true, 'aria-hidden': 'true' } : { role: 'region', 'aria-label': vals.narrow ? 'Larger screen recommended' : 'Welcome to Atmos Gallery' })} style={sx('position:fixed;inset:0;height:100dvh;z-index:' + (vals.narrow ? 150 : 90) + ';display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:clip;background:var(--surface)')}>
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
                <h1 style={sx("position:relative;z-index:1;font-family:'Neue Montreal';font-weight:500;font-size:var(--fs-title);line-height:1.2;letter-spacing:var(--track-title);color:var(--on-surface);margin:0;max-width:none;text-wrap:balance")}>
                  {/* Two masked line-groups, not one wrapping line. It fixes the break where it
                      belongs — subject and copula end the first line at every width, rather than
                      wherever the measure happens to land — and gives each line its own reveal, so
                      the heading rises in two beats rather than one.

                      THE COPY NAMES A WIDTH NOW, NOT A DEVICE, and that is a correction rather than
                      a rewrite. "Desktop Experience." was written when the gate stood at 721px, back
                      when "not a phone" and "wide enough" were the same sentence. They are not: the
                      gate is MIN_TOOL_WIDTH, 1024, so a tablet in landscape is 1180 across and gets
                      the whole tool while the same tablet in portrait is 820 and lands here — where
                      the old line sent it to go and find a laptop, when rotating was the answer.
                      Same words as the story's own hero, because these two surfaces say one thing
                      and a reader can meet either of them first. */}
                  <span style={sx('display:block;overflow:hidden')}><span data-land-line="1" style={sx('display:block')}>Colour Read from</span></span>
                  <span style={sx('display:block;overflow:hidden')}><span data-land-line="1" style={sx('display:block')}>Light and Atmosphere</span></span>
                </h1>
                {/* What there is to do here, then the boundary. "Open this on a wider screen" is a
                    refusal; this names what a phone CAN do (the example palettes) before what needs
                    a computer (a palette from your own image), which explains the width by the
                    capability behind it. Supplied copy, 14.09.26. */}
                <p style={sx("position:relative;z-index:1;font-family:'Neue Montreal';font-size:var(--fs-body);line-height:1.6;color:var(--on-surface-muted);margin:14px 0 0;max-width:none;text-wrap:pretty")}>
                  <span style={sx('display:block;overflow:hidden')}><span data-land-line="1" style={sx('display:block')}>Explore example palettes here. To create a palette from your own image, open Atmos on your computer in a window at least 1024 px wide.</span></span>
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
                  {/* `Explore an Example` stood here and opened the phone's example view, which is gone
                      (17.09.26, audit C5): the story is how a phone sees the examples, and this gate
                      only stands when there is no story to tell. */}
                  {/* `Save for Desktop` stood here — the quiet second act that copied the site's
                      address to the clipboard so the reader could open it on a machine that can run
                      the tool. Removed by request. Its handler is renderVals' gateCopyLink →
                      copySiteLink() in methods/persistence.js, which is now uncalled; the copy key
                      it wrote was 'gate-link'. Left in place rather than deleted, because bringing
                      the act back is then a button rather than a feature.

                      WHAT THIS COSTS, so it is a decision and not a surprise: the gate holds no act
                      at all now. It only stands when the story cannot — storage refused, or the seed
                      failing — and there was never an example to open in that case either. */}
                </div>
              </div>
            ) : (
              <div style={sx('position: relative; display: flex; flex-direction: column; align-items: center; max-width: 606px')}>
                {/* ONE SIZE, THE ONE THE HEADING ALREADY DECLARES (17.09.26, by request: "increase
                    the font-size to the nearest token"). The h1 has carried --fs-landing while both
                    of its lines overrode it with --fs-statement, so the statement read at 32px and
                    the 40px on the heading only ever set the line-height of nothing. The lines
                    inherit now: 40px, the next rung up, and the size the loader's count beside it
                    has always used. */}
                <h1 style={sx("font-family:'Neue Montreal';font-weight:500;font-size:var(--fs-landing);line-height:1.16;letter-spacing:var(--track-statement);margin:0;max-width:23ch;text-wrap:balance")}>
                  <span style={sx('display:block;overflow:hidden')}><span data-land-line="1" style={sx('display: block; color: var(--on-surface)')}>Colour Read from Light and Atmosphere.</span></span>
                  <span style={sx('display:block;overflow:hidden')}><span data-land-line="1" style={sx('display: block; color: color-mix(in srgb, var(--on-surface) 50%, transparent)')}>In Seconds.</span></span>
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
                  <a href="/about" className="glass-cta" data-focus="chrome" data-glass-cta="1" onClick={vals.navigate} aria-label="How it Works: how Atmos turns an image into a palette"><TextSwap>How it Works</TextSwap></a>
                </div>
              </div>
            )}
          </div>
          {/* THE FOOTER IS NOT DRAWN HERE ANY MORE, and what it leaves behind is the credit alone.

              TOMBSTONE. This band used to render <SiteFooter brand={false} landmark={false} />, a
              second copy of the footer the document already ends with — measured, two `.site-foot`
              nodes in the tree on every landing: this one, and the real <footer> child of [data-app]
              at the bottom of the page. On a phone the duplicate was worse than redundant: the story
              scrolls 8000px to a real footer, and this copy sat at opacity 0 under `quiet` the whole
              way, occupying the one band the credit needed.

              WHAT IT COSTS ON DESKTOP, so nobody rediscovers it as a bug: the landing is
              position:fixed over the document, so the real footer behind it cannot be reached while
              the landing is up. About, Privacy and Terms are therefore not linked from the wide
              front page any more — `Learn More` still goes to /about, and everything returns the
              moment the landing is dismissed. Removed by request; if the legal pair has to be
              reachable from here, the answer is a one-line legal row rather than the whole footer
              back, and it belongs beside this credit.

              data-land-nomark IS STILL LOAD-BEARING, and now for the credit rather than the footer.
              orbit.js's _heroReach() solves the field's hole from
              `[data-landing] h1, [data-landing] p, [data-glass-cta]` and filters on this attribute;
              anything dropped in here that matches those selectors would otherwise be read as copy
              the formation has to clear, and the hole would open from the centred block all the way
              to the bottom edge. The credit is built from divs and spans for the same reason, so it
              matches nothing even if the attribute is ever lost.

              ABSOLUTE, so it does not enter the flex centring above. The stage is a fixed box with
              justify-content:center, and a third child in that flow would push the statement and its
              two acts off the optical centre the field is solved around.

              pointer-events:none: nothing in here is interactive now the links have gone, and the
              band spans the full width directly over the copy block — it has no business catching a
              press aimed at Create.

              IT DOES NOT GO QUIET WITH THE REST OF THE LANDING. `quiet` is the phone story's state,
              and it exists to stop the gate's heading and act sitting behind chapter 1's own words.
              The credit is not competing copy — it is the caption for the artwork chapter 1 is
              transparent onto, which is precisely the screen where naming the palette does the most
              work. It stays, and the opaque chapters below scroll over it. */}
          <div data-land-nomark="1" style={sx('position:absolute;left:0;right:0;bottom:0;z-index:5;pointer-events:none')}>
            {/* THE CREDIT — what the field behind this is a reading of.

                The landing's colour is no longer an authored wheel: it is one of the eight example
                palettes, chosen per visit, and on a phone it is whichever one the story is telling
                (see the amended §8 in methods/orbit.js). An artwork made out of somebody's
                photograph should say which photograph — and this line does a second job that no
                other element on the front page does, which is state what the tool actually makes
                while standing inside an example of it. The picture is here for the same reason: the
                claim is that a palette is READ FROM AN IMAGE, and a name on its own does not show
                that an image was involved.

                ON BOTH SURFACES NOW. It was withheld below the supported minimum while the footer
                was still here, because the two together made a five-band block that crossed the
                gate's own button on a 667pt phone. The footer is gone, so the argument is gone with
                it — and the phone is the surface where the field is most of what is on screen.

                IT IS A CAPTION, so it belongs at the edge of the artwork rather than under the
                statement — put in the centred block it would enter _heroReach and open the field's
                hole around a credit.

                STACKED, PICTURE OVER WORDS, and the picture leads. Side by side, at the size the old
                footer row allowed, the image was a 48px chip being read as an icon — a decoration in
                front of a sentence rather than the thing the sentence is about. Over the line it is
                a photograph with a caption under it, which is what this actually is, and it takes a
                real width: 128PX, on every screen (21.09.26, by request: "Increase reference image
                size on the frontpage (128px)"). It was one column of the page's own grid, clamped at
                56 and 96px, which came to 94px on a 1440 screen and 74 to 78 on a phone; the request names
                the figure, so it is stated. Measured before it went in: on a 375x667 phone the credit
                still sits 70px under Explore an Example, and on every screen well under the hero.

                No entrance of its own — the thing it describes is the field, and the field has its
                own dissolve out of the painted floor to make.

                Square corners and an INSET ring rather than a border: the house image treatment
                (.about-shot, .about-rail__card, the phone example row), which is what stops a
                hairline reading as dirt along the edge of a photograph. --surface-raised is the
                ground the box holds before the file lands. The <img> is decorative — alt="" — because
                the line under it is the content; a second reading of "Garnet" would be a screen
                reader saying the name twice. */}
            {vals.landingCredit && (
              <div data-land-credit="1" style={sx('display:flex;flex-direction:column;align-items:flex-start;gap:10px;padding:0 var(--page-gutter) 26px')}>
                {/* A CORNER FOR ITS SIZE: --radius-thumb, 8px since 22.09.26, by request. It was
                    --radius-swatch (3px), set when the thumbnail was 56 to 96px wide; at 128 x 85 it
                    read as square. The ring below takes it too. */}
                <span aria-hidden="true" style={sx('position:relative;display:block;overflow:hidden;border-radius:var(--radius-thumb);width:128px;aspect-ratio:3/2;background:var(--surface-raised)')}>
                  {/* No fetchPriority="low": this is the landing's largest early paint, so a low
                      priority only queued it behind everything else. The file is the small cut. */}
                  <img src={vals.landingCredit.image} alt="" decoding="async" style={sx('display:block;width:100%;height:100%;object-fit:cover')} />
                  <span style={sx('position:absolute;inset:0;border-radius:inherit;box-shadow:inset 0 0 0 1px var(--img-outline)')}></span>
                </span>
                {/* THE BUTTONS' TYPE (17.09.26, by request): --fs-body at Medium with flat tracking,
                    as the app's buttons read, where this was a 12px regular line borrowed from the
                    footer's old meta row. The name still takes full ink and "Based on" does not: the
                    palette is the information here, and the preposition is the grammar around it.
                    TWO LINES, the name under "Based on" (21.09.26, by request: "add a break after
                    Based on"). */}
                {/* BOTH LINES IN FULL INK SINCE 22.09.26 (by request: "fix the based on contrast too").
                    "Based on" was --on-surface-muted over the field and measured about 3.2:1 in light
                    and 2.9:1 in dark, under the 4.5 text needs, so the label and the name are told
                    apart by weight now rather than by ink: the label Regular, the name Medium. */}
                <div style={sx("font-family:'Neue Montreal';font-size:var(--fs-body);font-weight:400;line-height:1.2;letter-spacing:var(--track-flat);color:var(--on-surface);text-wrap:pretty")}>
                  Based on<br /><span style={sx('font-weight:500')}>{vals.landingCredit.name}</span>
                </div>
              </div>
            )}
            {/* THE LEGAL ROW, OPPOSITE THE CREDIT (22.09.26, by request, mocked first). The landing covers
                the document's footer, so once the analytics banner was answered nothing on this screen
                led to Privacy, Terms or the analytics choice again: the gap the footer's tombstone above
                recorded, and closed the way it said, one line beside the credit rather than the footer
                back. Privacy Settings is here because withdrawing has to be as easy as allowing was.
                The credit's type, in full ink: muted measured about 2.3:1 on the field in light and 2.0
                in dark, ink about 6.6 and 4.8. The footer's link contract (target, hover, swap, ring)
                through .land-legal in site-foot.css. Line-height 1.3 for the swap's mask, as the footer
                (1.2 clips descenders), so its bottom sits 0.65px lower than the credit's 26 to share the
                credit name's baseline. Desktop only: the phone story ends in the real footer. The band
                is pointer-events:none; the row takes them back.
                IT STEPS ASIDE UNDER THE BANNER. The analytics banner stands in this same corner, over
                the row, and left the end of "Settings" showing under its edge and the links beneath it
                unreachable. While the banner is up the row fades out (inert, so it cannot be tabbed into
                under the glass) and returns when the banner goes. The banner carries Learn More to
                Privacy meanwhile, and Privacy Settings is what raised it. */}
            {!vals.narrow && (
              <nav className="land-legal" aria-label="Legal" {...(vals.consentOpen ? { inert: true } : null)} style={sx("position:absolute;right:var(--page-gutter);bottom:calc(26px - 0.65px);display:flex;gap:16px;pointer-events:auto;font-family:'Neue Montreal';font-size:var(--fs-body);font-weight:500;line-height:1.3;letter-spacing:var(--track-flat);color:var(--on-surface);transition:opacity var(--dur-state) var(--ease-standard);opacity:" + (vals.consentOpen ? 0 : 1))}>
                <a href="/privacy" onClick={vals.navigate}><TextSwap>Privacy</TextSwap></a>
                <a href="/terms" onClick={vals.navigate}><TextSwap>Terms</TextSwap></a>
                <button type="button" className="site-foot__consent" onClick={vals.openConsent}><TextSwap>Privacy Settings</TextSwap></button>
              </nav>
            )}
          </div>
        </div>
  );
}

/* THE ARRIVAL, LIFTED OUT OF THE TOOL'S BRANCH SO THE GATE CAN HAVE IT TOO.

   The logo-reveal loader: first visit of the session, before the Get Started landing.

   This was written inline in the desktop return, which was fine while that return was also the one
   the gate fell through to. It is not any more — under the supported minimum width AppView answers
   with the showcase or the gate and never builds the tool at all — so the loader had to become
   something two branches can render rather than something one branch owns. Nothing about it changed
   in the move; it is the same markup at the same z-190, and `data-load-wrap` is still on the gate's
   allow-list in global.css for exactly this reason: the loader is the ARRIVAL, not the tool, and a
   phone arrives just as much as a desktop does.

   Guarded here rather than at the call sites so both read the same and neither can forget it. */
function LogoLoader({ show }) {
  if (!show) return null;
  return (
    <div data-load-wrap="1" aria-hidden="true" style={sx('position:fixed;inset:0;z-index:190;color:var(--ground-ink)')}>
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
              <div data-load-num="1" style={sx("font-family:'Neue Montreal';font-weight:500;font-size:var(--fs-landing);line-height:1;letter-spacing:var(--track-statement);color:var(--ground-ink);font-variant-numeric:tabular-nums;transform:translateY(110%);will-change:transform")}>0</div>
            </div>
          </div>
          <div style={sx('margin-top:24px;width:100%;height:3px;overflow:hidden')}>
            <div data-load-progress="1" style={sx('width:100%;height:100%;background:var(--ground-ink);transform-origin:0% center;transform:scale3d(0,1,1)')}></div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* WHAT A DOCUMENT ROUTE SHOWS WHILE ITS CHUNK IS STILL ON THE WIRE: itself. main.tsx keeps the
   prerendered masthead and <main> before render() replaces them, and this puts them back into the
   Suspense hole so the page never blinks to an empty column. display:contents, so the two children
   sit in the route wrapper's flex column exactly where the real page's will. Null on a client-side
   arrival, where nothing was prerendered and the chunk is already prefetched. */
function DocFallback() {
  const pre = typeof window !== 'undefined' ? window.__prerenderedDoc : null;
  if (!pre || !pre.html) return null;
  return <div data-doc-fallback="1" style={sx('display:contents')} dangerouslySetInnerHTML={{ __html: pre.html }} />;
}

/* THE AGENT'S ORB, beside the reading's status line (thinkingOrbs.js, and the note at its head).
   React owns the canvas; the module is told about it once, after mount, and its returned function
   runs on unmount. The STEP and the PALETTE are attributes React updates in place — data-orb-state as
   the line changes, data-orb-groups once the grouping step has the swatches' shares — and the module
   follows both on its own observer, easing from where the body is rather than starting over, so the
   twelve points stay one object for the whole reading. (It used to re-run on every step, which
   restarted the orb four times a reading.)
   aria-hidden, because the line beside it is the same statement in words and the stage announces
   every step through the live region; a second voice saying "Searching…" would be noise. */
function ThinkingOrb({ state, groups, size = 20 }) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    const cv = ref.current;
    if (!cv) return undefined;
    return thinkingOrbs(cv, { size, theme: 'auto' });
  }, [size]);
  return <canvas ref={ref} data-thinking-orb="1" data-orb-state={state} data-orb-groups={groups || undefined} data-orb-size={size} data-orb-theme="auto" aria-hidden="true" style={sx('display:block;flex:none')}></canvas>;
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
        <React.Suspense fallback={<DocFallback />}>{legal ? <LegalPage vals={vals} /> : <AboutPage vals={vals} />}</React.Suspense>
        <SiteFooter route={vals.route} onNavigate={vals.navigate} onConsent={vals.openConsent} />
        {/* Back Up and Restore stand in this masthead too (DocHead), so what Restore opens and reports
            through has to be here as well — the tool's return is not mounted on a document. */}
        <RestoreDialog vals={vals} />
        <MessageLane vals={vals} />
        {vals.analyticsOn && <Analytics beforeSend={sendPageview} />}
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
  /* THE STORY, and it is the one phone branch that does NOT cover the landing.

     The shared-link view passes `covered`, which sets inert + aria-hidden and — through _landingLit()
     — parks the orbit ticker, because that surface is opaque and nothing behind it can be seen. The story's first chapter is transparent BY DESIGN: the colour field showing
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
        {/* THE NEW BAR, ON THE PHONE'S FRONT PAGE TOO (15.09.26, by request). This was the one phone
            surface with no bar: a decorative wordmark floated alone at the top, and the hero scrubbed
            it away at the first flick because it printed over the chapters. The documents' masthead
            takes its place, as it stands on /about on a phone: the theme switch and the mark in the
            glass pane, floating over the field, leaving on the way down and coming back on the way up,
            which answers the same problem the scrub did. heroExit's [data-logo] now matches nothing
            here, which it is written to tolerate; the field's mark clearing (_markBox) likewise finds
            no mark and clears nothing, the pane being the mark's ground now. */}
        {/* onMark (16.09.26): on this page "/" is the page itself, so the mark's link went nowhere. It
            goes back to the start of the story instead — see returnToStoryStart. */}
        <DocHead vals={vals} floating onField onMark={vals.returnToStoryStart} />
        <MobileStory st={vals.mobileStory} />
        {/* THE ONLY WAY OFF THIS PAGE ON A PHONE. The foot is rendered by the document routes and,
            in the tool, by the upload stage — and the mobile story is neither, so the phone homepage
            was the one surface on the site carrying no link to About, Privacy or Terms. Measured:
            zero of all three, before and after the gate. That is a dead end for a reader and, for
            the two statements specifically, a route that has to exist. MobileStory is itself a
            .doc-route, and site-foot.css is scoped to nothing above .site-foot, so it lands here
            styled exactly as it does on /about. */}
        <SiteFooter route={vals.route} onNavigate={vals.navigate} onConsent={vals.openConsent} create={false} />
        {/* THE LOADER ON THE PHONE TOO (19.09.26, by request: "make sure the page loader is active on
            mobile"). This branch never mounted it, so a first visit on a phone got no loader while the
            run still waited out its 4s search for one, holding the consent ask back. The story's
            reveal is held under it and plays as the fold lifts (_syncStory, loader.js). */}
        <LogoLoader show={vals.showLoader} />
        {vals.analyticsOn && <Analytics beforeSend={sendPageview} />}
      </div>
    );
  }
  if (vals.showMobileShare) {
    return (
      <div data-app="1" style={sx('min-height:100dvh;display:flex;flex-direction:column;background:var(--surface)')}>
        <SkipLink />
        <div aria-live="polite" role="status" style={liveRegionStyle}>{vals.announce}</div>
        {vals.showLanding && <LandingStage vals={vals} covered />}
        {/* THE STORY'S BAR, ON A SHARED LINK TOO (17.09.26, audit C5, by request). This was the fixed
            wordmark over a scrim, the last phone surface without the frosted bar; the example view that
            shared this surface is gone. The masthead sits at the same child index as it does in the
            story branch, so crossing from one to the other keeps it mounted. Its mark returns to the
            start, as the fixed one did. */}
        <DocHead vals={vals} floating onMark={vals.returnToGate} />
        <MobileShareView ms={vals.mobileShare} />
        {/* mounted on BOTH return paths — a shared link on a phone never reaches the one below */}
        {vals.analyticsOn && <Analytics beforeSend={sendPageview} />}
      </div>
    );
  }
  /* AND THE GATE ITSELF — WHAT IS LEFT WHEN THERE IS NO STORY TO TELL.

     The three branches above are the showcase, and every one of them needs a seeded example to stand
     on: the story reads a photograph, the list chooses between photographs, the share view IS one.
     With storage blocked or the feed empty there is none, and this is the surface that answers
     instead — the ring formation, the wordmark, the gate's copy and the landing's own footer. Same
     stage, same arrival, no tool. It is the fourth phone surface, and the only one that was never
     written down as one.

     BECAUSE IT USED TO FALL THROUGH TO THE TOOL'S RETURN AND BE PAINTED OUT. global.css hid every
     child of [data-app] that was not on its allow-list, so what a reader SAW was right — but the
     desktop tool was built, laid out and measured first: the result stage, the library table, the
     four drawers, the reel, the export scaffold, all of them alive under a display:none. That is
     exactly the failure the allow-list's own note has warned about twice, arriving from the other
     side — there it was a phone surface hidden by mistake, here it is the whole tool hidden on
     purpose, and neither is a thing that should be mounted at all. An early return is the only
     version of "not mounted" that is actually true, and it is what the other three branches have
     always done. The CSS gate stays as the second line of defence over the chrome these branches
     do carry.

     IT ALSO ENDS A SECOND FOOTER. LandingStage renders `.site-foot` inside itself — absolute, at the
     foot of the stage, brand and landmark off (see the note there) — and the tool's return renders
     another one whenever the stage is 'upload', which the gate always is. Two of them, the outer at
     the z-151 the allow-list grants it, painting over the one the landing had put at the bottom of
     its own composition. Only the landing's is wanted here, so only the landing is rendered.

     LandingStage SITS AT INDEX 2, as it does in every branch above and below. React reconciles
     unkeyed children by index, and only the same DOM keeps the canvas _buildOrbField appended to it
     imperatively — a stage that changed index across a branch switch would be torn down and rebuilt,
     which is the hole those notes were written to close. */
  if (vals.narrow) {
    return (
      /* dvh, like the three showcase wrappers: 100vh is a document taller than the screen, and the
         only thing that ever produced here was a strip of empty page to rubber-band into. */
      <div data-app="1" style={sx('min-height:100dvh;display:flex;flex-direction:column;background:var(--surface)')}>
        <SkipLink />
        <div aria-live="polite" role="status" style={liveRegionStyle}>{vals.announce}</div>
        {/* No `covered`, no `quiet`: this surface IS the stage rather than something standing over
            it, so the formation stays lit and the gate's copy is the copy it is solved around. */}
        {vals.showLanding && <LandingStage vals={vals} />}
        {/* Decorative, as it is on the story: the gate is the start screen, so there is nowhere for
            the mark to lead. showLogoDecor is true whenever `narrow` is, so the guard is a formality
            — kept so this reads as the same decision the tool's return makes two screens down. */}
        {vals.showLogoDecor && (
          <div data-logo="1" role="img" aria-label="Atmos Gallery" style={{ ...logoStyle, pointerEvents: 'none' }}></div>
        )}
        <LogoLoader show={vals.showLoader} />
        {vals.analyticsOn && <Analytics beforeSend={sendPageview} />}
      </div>
    );
  }
  return (
    <div data-app="1" {...(vals.hasOverlay ? { 'data-detail-open': '' } : null)} style={sx('min-height:100vh;display:flex;flex-direction:column;background:var(--surface)')}>

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
      {/* ON THE FLOATING BAR'S CENTRE LINE: --nav-mark-top, on this branch only. logoStyle's 18.5
          is the phone's band and stays theirs; the desktop bar floats lower now (global.css). */}
      {vals.showLogoDecor && (
        <div data-logo="1" role="img" aria-label="Atmos Gallery" style={{ ...logoStyle, top: 'var(--nav-mark-top)', pointerEvents: 'none' }}></div>
      )}
      {vals.showLogoButton && (
        <>
          {/* data-ix="mark" (17.09.26, audit E4): hover and press from the mark tier in global.css,
              eased, where an HBtn opacity cut in and out. data-detail-open on the root hides it
              while the palette detail is open (audit C4). */}
          <button type="button" data-logo="1" data-ix="mark" data-focus="chrome" onClick={vals.showIntroAgain} aria-label="Atmos Gallery, return to the start screen" title="Return to the start screen"
            style={{ ...logoStyle, top: 'var(--nav-mark-top)', border: 0, padding: 0, cursor: 'pointer' }} />
          <LogoRing top="var(--nav-mark-top)" />
        </>
      )}

      {/* click-to-zoom lightbox: fixed overlay the zoomed reference image FLIPs into */}
      <div data-click-zoom-lightbox="1" style={sx('z-index:170;cursor:zoom-out;background-color:var(--lightbox-scrim);justify-content:center;align-items:center;padding:3em;display:none;position:fixed;inset:0')}></div>

      <LogoLoader show={vals.showLoader} />

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
      {/* IT FLOATS, AND IT STAYS UP ON THE LANDING. The box — sticky at --nav-top, a gutter in from
          either side so its ends sit on the grid's outer lines, the stadium and its shadow — is
          .glass-bar's, shared with the documents' masthead (global.css). What is this bar's own is
          the flex row and the height it stands at: 95, over the desktop landing (90, see
          LandingStage) and under everything that covers the page on purpose — the palette overlay
          (100), the dialogs (126), the notice (128), the drawers and the toast. So on the landing the
          switch, Back up and Restore all work, and what Restore opens still arrives in front of it.
          data-float-nav is what _syncAppInert exempts, so the landing's guard leaves it live.
          data-on-landing thins its pane over the field in light mode — see the rule in global.css. */}
      <header className="glass-bar" data-float-nav="1" {...(vals.showLanding ? { 'data-on-landing': '1' } : {})} style={sx('display:flex;align-items:center;justify-content:space-between;z-index:95')}>
        <GlassEffect />
        {/* LEFT — the one display preference. A running clock used to hold this corner: it reported
            nothing about the palette, the archive or the work, yet it was the first thing every
            left-to-right scan landed on. The theme switch takes the corner instead — it is the
            control that changes how everything else on the page is READ. It is outlined, not
            filled, so it holds the edge without competing with the mark. */}
        {/* THE TOUR'S SECOND DOOR IS IN THE FOOTER, not here. It stood in this corner for one round,
            beside the theme switch, and read as the switch's own label — two controls sharing an
            edge with nothing between them, one of them a bare word (19.09 pattern: a thing sits
            with the thing it acts on, and nothing is placed to balance a corner). The switch changes
            how the page is read; a tour is about the product. See site-foot__consent's note in
            SiteFooter, which is the row it belongs to and the precedent for a button standing among
            those links. */}
        <ThemeSwitch vals={vals} />
        {/* RIGHT — the act. New Palette drives the core loop, so it stays filled and alone.
            Back Up and Restore stood here from 15.09 to 22.09.26 and are Manage Library's last group
            now (see the note there). Show intro again was once a third item in their menu; it is the
            brand mark's job, which calls returnToIntro() on every screen. One act, one door. */}
        <div style={sx('display:flex;align-items:center;gap:12px')}>
          {/* "New generation" named the machinery. What the button makes is a palette, and the rest of
              the app has spent five rounds learning to say so: the Library holds palettes, and Add to
              project files one. On the create page in every state and off the landing, and it
              always starts a palette — see NavNewPalette. */}
          <NavNewPalette show={!vals.showLanding} onPress={vals.newPalette} />
          {/* Restore's file input. It stays in the bar, which is always mounted under the tool; the
              drawer that holds Restore is not. */}
          <input ref={vals.projectFileRef} type="file" accept="application/json,.json" onChange={vals.onProjectFileChange} tabIndex={-1} aria-hidden="true" style={{ display: 'none' }} />
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
              <div style={sx('overflow:hidden')}><h1 data-drop-line="1" style={sx("margin:0;font-family:'Neue Montreal';font-weight:500;font-size:var(--fs-title);line-height:1.2;color:var(--on-surface);letter-spacing:var(--track-title)")}>Start here</h1></div>
              {/* The lead breaks after "atmosphere" — and the break is a SECOND MASK, not a <br>.
                  One mask holding two lines is a slab: both halves ride up together while the title
                  and the CTA each arrive on their own, which is the one gesture maskLines.js was
                  written to stop. Two masks, and the second half arrives on the same stagger as
                  everything else. No margin on the second one — the halves are a single sentence, so
                  line-height alone sets the distance, exactly as a <br> would have.
                  "palette" where it said "colour system" (14.09.26). The copy brief's shorter line,
                  "Choose an image to discover its colour palette.", was tried and reverted by request. */}
              <div style={sx('overflow:hidden;margin-top:8px')}><div data-drop-line="1" style={sx("font-family:'Neue Montreal';font-size:var(--fs-lead);color:var(--on-surface-muted)")}>Choose an image that captures the atmosphere</div></div>
              <div style={sx('overflow:hidden')}><div data-drop-line="1" style={sx("font-family:'Neue Montreal';font-size:var(--fs-lead);color:var(--on-surface-muted)")}>you want your palette to carry.</div></div>
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
          {/* NO DISCLOSURE HERE, BY REQUEST: it broke the hierarchy of a screen whose whole job is
              one instruction. A version of it stood here briefly and is now carried in full on
              /privacy, which the footer links from this same screen.
              WHAT THAT COSTS, so the next person weighing it has the fact and not just the outcome:
              naming is not something the reader opts into. processFile goes straight to
              _runPipeline and _readPhotograph (pipeline.js), which sends the thumbnail as soon as the
              colours are grouped, a second or two after an image is chosen, so every disclosure
              still arrives after the send. That
              is a product decision, not an oversight, and it is the reason the privacy page states
              the automatic behaviour in its own first sentence on the subject rather than burying
              it. If a chooser-side note ever returns, it belongs above the button, not under it. */}
        </>)}

        {vals.isProcessing && (
          <div style={sx('display:flex;flex-direction:column;align-items:center;gap:30px;padding:14px 0 6px')}>
            {/* THE ATMOSPHERE'S SLOT, and only a slot (17.09.26). It had a ground, a clip and a 1px rule,
                and was a picture in a box. The atmosphere lives on the page now: a small, colourless
                version of the landing's field that ends at its own soft rim, with a canvas that
                overhangs this box (procField.js). The box keeps its size so the stage does not move. */}
            <div style={sx('position:relative;width:380px;height:250px')}>
              <canvas ref={vals.canvasRef} aria-hidden="true" style={sx('display:block;width:380px;height:250px')}></canvas>
            </div>
            <div style={sx('width:380px;display:flex;flex-direction:column;gap:12px')}>
              <div style={sx('display:flex;justify-content:space-between;align-items:center')}>
                {/* THE READING SPEAKS IN THE CTA'S VOICE (17.09.26, by request). It was the default
                    control voice — uppercase, Regular, flat, --fs-label — which is the voice of a
                    metric label, and these four lines are the tool saying what it is doing. The
                    page-scale calls to action are the system's one statement voice (global.css, "THE
                    VOICES A CONTROL MAY SPEAK"): Medium, --fs-cta, --track-statement, the case
                    authored in the words rather than transformed. The steps are written in sentence
                    case (renderVals), so nothing here transforms them.
                    OKLCH STOOD AT THE OTHER END OF THIS ROW and is gone (18.09.26, by request): the
                    stage says what it is doing, and a colour space named at a palette that does not
                    exist yet is not part of that. The word still appears where it explains something:
                    the harmonies' note on the result (renderVals). */}
                <span style={sx('display: inline-flex; align-items: center; gap: 9px; font-family: Neue Montreal; font-size:var(--fs-cta); font-weight:500; letter-spacing:var(--track-statement); color: var(--on-surface)')}>
                  <ThinkingOrb state={vals.procOrb} groups={vals.procGroups} />
                  {/* Each line of the reading rises into place through a mask, the swap the copy
                      confirmation uses (val-mask), so a new step reads as arriving rather than as the
                      text changing. Keyed by the step, which replays the rise. The steps are paced by
                      the work itself (pipeline.js _readPhotograph).
                      THE MASK IS A LINE BOX, AND IT MUST FIT THE LETTERS (18.09.26). The row carried
                      line-height:1 from the CTA's own rule, where it is right — a button's label is one
                      line in a box sized around it — and here that box is also the clip: at 14px the
                      content box is 14px tall, so "Grouping the colours…" lost the tails of its p and
                      g, and every ascender was shaved at the top. The mask keeps its own line-height,
                      1.42, which fits the face's ascenders and descenders with room to spare (measured:
                      4.9px of slack above the tallest, 1.9px below the deepest) and still clears the
                      110% the arriving line is parked at. The row's height does not move either: the
                      orb beside it is 20px and the line box is 19.9px. */}
                  <span style={sx('display:inline-block;overflow:hidden;line-height:1.42')}><span key={vals.procStep} style={sx('display:inline-block;animation:val-mask-a var(--dur-swap) var(--ease-entrance) both')}>{vals.procStatus}</span></span></span>
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
                both exits — keep it, or go make one. The sentence saying it is not saved went on
                17.09.26 (audit H5, by request, with the toggletip that briefly held it): the strip
                names the state and offers the exits. */}
            {vals.isSharedView && (
              <div data-voice="banner" style={sx('display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;padding:10px 10px 10px 22px;margin:0 0 18px;border:1px solid var(--line-strong);border-radius:var(--radius-pill);background:var(--surface-raised)')}>
                <span style={sx("font-family:'Neue Montreal';font-size:var(--fs-body);line-height:1.5;letter-spacing:var(--track-flat);color:var(--on-surface)")}>Shared with you</span>
                <span style={sx('display:flex;align-items:center;gap:10px;flex:none')}>
                  {/* THE BANNER'S PAIR (17.09.26, audit A8, by request): set like the analytics
                      banner's buttons, Save to Library filled as Accept is there. The strip is fully
                      round, and its padding follows the pill: the text clears the curve, the buttons
                      sit 10px in from it. */}
                  <Button data-emphasis="primary" onClick={vals.onSaveShared} aria-label="Save this shared palette to your Library" style={CONSENT_BTN_TYPE} label={<span style={sx('display:flex;align-items:center;height:16px')}><ButtonText>Save to Library</ButtonText></span>} />
                  <Button data-emphasis="secondary" onClick={vals.onMakeOwn} aria-label="Start a new palette from your own image" style={CONSENT_BTN_TYPE} label={<span style={sx('display:flex;align-items:center;height:16px')}><ButtonText>Make Your Own</ButtonText></span>} />
                </span>
              </div>
            )}
            {/* The shares count up out of the blur, as How it Works 2.1's tiles do (19.09.26, by request):
                motion.js _countShares plays the group on each arrival. The rolling strips are hidden
                from a screen reader, which reads the twin beside them. */}
            {/* data-tour="swatches" — step 1's anchor. On the GROUP, never on a band: the ring the
                tour draws would then sit on one of the palette's own colours, where a single-hue
                outline is legible against five colours and invisible against the sixth. The group's
                edge stands on the page surface, where --on-surface is the contrasting ink by
                definition, in either theme and for any of the eight. */}
            <div role="group" aria-label="Generated palette swatches" data-tour="swatches" data-odometer-group="" data-odometer-stagger="0.2" style={sx('display:flex;height:340px;width:100%;gap:6px')}>
              {vals.result.bands.map((b, bi) => (
                <div key={b.sid} data-band="1" data-sid={b.sid} role="group" aria-label={b.groupAria} onMouseEnter={vals.dimEnter} onMouseLeave={vals.dimLeave} style={b.style}>
                  <span data-ring="1" aria-hidden="true" style={b.bandRingStyle}></span>
                  <span data-fx="1" data-odometer-element="" data-odometer-start="0" data-odometer-duration="1.4" aria-hidden="true" style={b.weightStyle}>{b.weightPct}</span>
                  <span style={visuallyHidden}>{b.weightPct}</span>
                  {/* The outset ring, as every other round control: the inset value ring filled a 28px
                      circle. The icon rides the hover swap, like the close marks. */}
                  <button type="button" data-ix="icon" data-info="1" data-focus="chrome" aria-haspopup="dialog" aria-label={b.harmonyAria} onClick={b.onHarmony} style={b.infoBtnStyle}>
                    <TextSwap><IconHarmony /></TextSwap>
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
            {/* THE BANNER'S VOICE (17.09.26, by request): the palette's acts are set like the
                dialogs' buttons — --fs-body, Medium, Title Case, flat tracking — where they were the
                uppercase --fs-label voice. The row is the same object on the detail overlay, which
                carries the attribute too. */}
            {/* data-tour="actions" — not an anchor, a thing to keep clear of. Step 1's card would
                otherwise land across this row (see `clear` in methods/tour.js). */}
            <div data-voice="banner" data-tour="actions" style={sx('display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:18px 0 0')}>
              {/* TIER 1 — filing, which is the same answer the fullscreen detail's footer already
                  gives: first in the sequence and available, organise then validate then output.
                  It held the second tier here only because one creative act stood ahead of it, and
                  that act is not in the row at the moment. Still exactly ONE filled control, per
                  the two-tier rule.

                  filing changes the archive, so it stays on the committing side of the hairline.
                  Disabled while the palette is only in the URL — a shared palette has no record to
                  file until it is saved, and the strip above already offers that. */}
              <Button data-emphasis="primary" onClick={vals.openAssignCurrent} disabled={vals.assignDisabled} aria-haspopup="dialog" aria-label={vals.assignCurAria} style={CONSENT_BTN_TYPE} label={assignButtonLabel(vals.assignLabel)} />
              {/* The read-only group, held behind a hairline so the break reads as grouping rather
                  than as a gap that a wrap could invent; keeping them together also means they
                  wrap as a cluster, never one at a time. Contrast leads: inspect before you copy. */}
              {/* nowrap INSIDE the group. The row may wrap — it has to, between the supported
                  minimum width and the width this bar was drawn for; that gap is a good deal
                  narrower than it was, since the gate went from 721 to 1024 and took the worst of
                  these widths off the board — but the validate/output pair wraps as
                  one block or not at all. Letting it break internally put Export on a line of its
                  own under a hairline that stayed behind with Copy (folded into Export since
                  22.09.26), which reads as two groups where there is one. Core acts stay put; the
                  output cluster is what moves. */}
              {/* The hairline that used to divide the trio from the filing act is gone (by request,
                  02.09.26); the group is still one flex box so it wraps as one. */}
              <div style={sx('display:flex;align-items:center;gap:8px;flex-wrap:nowrap')}>
                {/* data-tour="via-contrast" — the control step 2 demonstrates before it opens the drawer,
                    and the one its card falls back to if the reader dismisses the drawer themselves. */}
                <Button data-tour="via-contrast" data-emphasis="secondary" btnRef={vals.contrastBtnRef} onClick={vals.openContrast} disabled={vals.contrastDisabled} aria-haspopup="dialog" aria-label="Open contrast checker for this palette" style={CONSENT_BTN_TYPE} label={contrastButtonLabel} />
                <Button data-tour="export" data-emphasis="secondary" onClick={vals.openExport} aria-haspopup="dialog" aria-label="Export this palette: copy it, or download it as design tokens" style={CONSENT_BTN_TYPE} label={exportButtonLabel} />
              </div>
              {/* SHARE is neither editing nor output formatting, and it is the only act here that
                  reaches outside this browser. A flexible gap, not another hairline: the distance
                  is the statement. When the row wraps it lands alone at the right of its own line,
                  which keeps the reading intact instead of dropping it into the middle of a group.
                  (It was moved into the group above for one revision and moved back: the placement
                  was never the thing that looked wrong — see the label's own note for what was.) */}
              <span style={sx('margin-inline-start:auto;display:inline-flex')}>
                <ShareControl open={vals.shareMenuOpen} owns={!vals.hasOverlay} name={vals.result.name} rows={vals.shareRows} onToggle={vals.toggleShareMenu} onKey={vals.shareMenuKey} itemStyle={vals.sheetItemStyle} tint={vals.sheetRowTint} />
              </span>
            </div>
            <div style={sx('display:flex;justify-content:space-between;align-items:flex-start;gap:16px;padding:26px 0 0')}>
              <div style={sx('flex:1;min-width:0')}>
                <h1 data-fx="1" data-split="1" style={sx("margin:0;font-family:'Neue Montreal';font-weight:500;font-size:var(--fs-display);line-height:1.05;letter-spacing:var(--track-statement);color:var(--on-surface);text-wrap:balance")}>{vals.result.name}</h1>
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
                    <span key={di} style={sx('display:inline-flex;align-items:center;min-height:26px;font-family: Neue Montreal; font-size:var(--fs-body); font-weight:500; letter-spacing:var(--track-flat); padding:var(--btn-pad-chip); background: color-mix(in srgb, var(--on-surface) 9%, var(--surface)); color: var(--on-surface); border-radius: var(--radius-pill)')}>{d}</span>
                  ))}
                </div>
                )}
                {/* WHAT THE PALETTE IS FOR, IN THE SLOT THE READING HELD. The reading stood here —
                    "Warm, saturated reds kept in shadow split by stark contrast" — a description of
                    what the analysis SAW, composed from the same swatches the bands above it are
                    already showing. Removed by request: under the palette it restated the picture
                    rather than telling you anything to do with it, and it is still the story's
                    standing statement and the detail overlay's closing line, so nothing is lost from
                    the product by taking it off this one screen.
                    What takes the slot is composeUse()'s recommendation, which answers the question
                    the result stage is actually for, followed by where to check the one pair a reader
                    means to use. It keeps its own weight rather than inheriting the reading's muted
                    13px: it is the only prose left on this surface and it is a recommendation, not an
                    aside. It keeps data-split too, so it still arrives on the masked line reveal it
                    had in its old position. */}
                <p data-fx="1" data-split="1" style={sx("font-family:'Neue Montreal';font-size:var(--fs-lead);line-height:1.5;color:var(--on-surface);margin:14px 0 0;max-width:52ch;text-wrap:pretty")}>{vals.result.useLine}</p>
              </div>
              {/* THE REFERENCE IMAGE SITS ABOVE THE RULE (17.09.26, by request). It stood at the right
                  end of the readout below, inside the data block; the palette's source belongs with
                  the name it came from, on the row above the hairline that opens the readout. Still
                  156×104, still right-aligned, still the y-fade (data-fx) and click-to-zoom it had. */}
              <div data-fx="1" style={sx('flex:none')}>
                {vals.result.hasRef && vals.result.refImageNode}
                {vals.result.noRef && (
                  <div aria-hidden="true" style={sx('width: 156px; height: 104px; border: 1px solid var(--line); background: var(--surface-raised); display: flex; align-items: center; justify-content: center')}>
                    <span style={sx('font-family:Neue Montreal;font-size:var(--fs-fine);letter-spacing:var(--track-flat);color:var(--on-surface-muted)')}>No Reference</span>
                  </div>
                )}
              </div>
              {/* THE RIGHT-HAND COLUMN IS GONE WITH THE LINE IT HELD. It was a fixed 360px holding
                  one right-aligned paragraph — composeUse()'s recommendation — which has moved into
                  the reading's old slot on the left. An empty 360px column would keep reserving a
                  third of this row for nothing, and the row's space-between would push the name
                  block around it.

                  A "Strongest pair" readout sat here for one commit and came straight back out. It
                  was a third thing competing for the same eye-line with no hierarchy between them,
                  and pairwise contrast already has a surface built for exactly this question — the
                  Contrast drawer, one button away, with all C(n,2) pairs and an AA/AAA lens. One
                  affordance per act; a number floated next to a recommendation is not an act. That
                  note is kept because the argument still holds for whatever is proposed here next. */}
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
                  <span data-meta-split="1" style={sx("font-family:'Neue Montreal';font-weight:500;font-size:var(--fs-body);letter-spacing:var(--track-flat);color:var(--on-surface);padding-bottom:9px")}>{g.title}</span>
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
                          <dt data-meta-split="1" style={sx('font-family:Neue Montreal;font-size:var(--fs-body);letter-spacing:var(--track-flat);color:var(--on-surface-muted);white-space:nowrap')}>{m.label}</dt>
                          <dd style={sx('display:flex;align-items:baseline;gap:8px;margin:0;min-width:0')}>
                            {m.aa && <AaBadge aa={m.aa} />}
                            <span data-meta-split="1" style={sx('font-family:Neue Montreal;font-size:var(--fs-body);letter-spacing:var(--track-flat);color:var(--on-surface);white-space:nowrap;text-transform:capitalize;font-variant-numeric:tabular-nums')} aria-hidden={hasRatio(m.value) ? 'true' : undefined}>{m.value}</span>
                            {hasRatio(m.value) && <span style={visuallyHidden}>{spokenRatios(m.value)}</span>}
                          </dd>
                        </div>
                        <span data-meta-line="1" aria-hidden="true" style={sx('display:block;height:1px;background:var(--line)')}></span>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
            </div>
          </div>
        )}

        {vals.isError && (
          /* THE DROPZONE'S SHAPE, AND THE APP'S BUTTON (17.09.26, audit A2). This panel stands where the
             dropzone was, so it takes the dropzone's corner, and the act is the filled Button, set
             like the analytics banner's (by request: CONSENT_BTN_TYPE and the [data-voice="banner"] rule in
             global.css). Text only: the "!" above the title went, ring and all, by request. */
          <div role="alert" data-error-panel="1" data-voice="banner" style={sx('display:flex;flex-direction:column;align-items:center;justify-content:center;gap:22px;width:100%;min-height:420px;padding:40px;background:var(--surface-raised);border:1px solid var(--line-strong);border-radius:var(--radius-surface)')}>
            <div style={sx('text-align:center;max-width:440px')}>
              <div style={sx("font-family:'Neue Montreal';font-weight:500;font-size:var(--fs-title);color:var(--on-surface);letter-spacing:var(--track-title)")}>{vals.errorTitle}</div>
              <div style={sx("font-family:'Neue Montreal';font-size:var(--fs-lead);color:var(--on-surface-muted);margin-top:8px;text-wrap:pretty")}>{vals.errorMsg}</div>
            </div>
            <Button data-emphasis="primary" onClick={vals.onBrowse} style={CONSENT_BTN_TYPE} label={<span style={sx('display:flex;align-items:center;height:16px')}><ButtonText>Choose Another Image</ButtonText></span>} />
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

          Below the supported minimum width this return is never reached at all — AppView answers
          with the showcase or the gate, several screens up — so the footer down here is the tool's
          own, on the one stage that has room for it. The gate carries the landing's footer instead,
          which is the one that belongs to that composition. */}
      {/* THE RESULT STAGE GETS THE ROW TOO, and until now it got nothing. This was
          `vals.isUpload && ...`, so the moment a palette existed the site's only links to How it
          Works, Privacy and Terms left with the dropzone: measured on the result stage, zero
          .site-foot nodes and no anchor to /privacy or /terms anywhere on the page. A reader who
          came to use the tool could not reach either legal document from the state they spend all
          their time in, which is also the state that just sent their image somewhere.
          Compact rather than the whole footer, per the tombstone further up this file: brand and
          landmark off, so this is one nav row and not a second document ending. The upload state
          keeps the full footer, being the end of that composition rather than a strip under it. */}
      {/* ONE ENDING FOR THE WHOLE TOOL (20.09.26, by request: "do the full"). The result stage carried a
          compact version of this — the nav row with the wordmark and the landmark turned off — so the
          page ended one way on the dropzone and another way the moment a palette was on screen, which
          is the footer "being visible and other times not". It is the whole footer in every state now,
          which also gives the stage back its <footer> landmark. */}
      <SiteFooter route={vals.route} onNavigate={vals.navigate} onConsent={vals.openConsent} onTour={vals.tour && vals.tour.showRestart ? vals.tour.onRestart : null} />
      <ContrastDrawer vals={vals} />
      <DetailOverlay vals={vals} />
      <HarmonyDrawer vals={vals} />
      <LibraryDrawer vals={vals} />
      <ExportDialog vals={vals} />
      <RecogniseDialog vals={vals} />
      <AssignDialog vals={vals} />
      <RestoreDialog vals={vals} />

      {/* THE TOUR, LAST AND IN TWO PIECES. The invitation takes the dialogs' own z-126 because it
          IS one of them; the guidance card sits at 124, under every dialog and drawer and over the
          page — so a card standing beside the contrast drawer is in front of the page and behind
          anything the reader opens on top of it. Mounted after the surfaces it points at, which is
          also the reading order a screen reader meets: the thing, then the note about the thing. */}
      <TourInvite vals={vals} />
      <TourGuide vals={vals} />

      <MessageLane vals={vals} />

      {vals.analyticsOn && <Analytics beforeSend={sendPageview} />}
    </div>
  );
}

// ============================== FEED (list / universe) ==============================
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
  // Library segment (All / a project), management (Manage), filtering (Filter + the
  // applied chips), the result size, and sorting (AA pairs / Max contrast / Date) all shared one
  // horizontal strip, several of them in the same borders and all of them in the same 10px
  // uppercase. Black fill meant "selected scope" and "selected view" and "applied filter" at once.
  // Nothing on the row declared what was navigation, what was state, what was metadata and what
  // was an act, so the row had to be decoded rather than read.
  //
  // It is now two bands over the table (three until 19.09.26, when the scope rail went and the title
  // took its row), and PLACEMENT STATES THE RELATIONSHIP. A thing sits with the thing it acts on;
  // nothing is placed to balance a corner:
  //
  //   heading   Library [ ☰ 1 ]                                        [ List | Grid ]
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
  // They are now one trigger — the ☰ beside the title — onto one panel with two tabs, so
  // filtering and organising are two views of the library rather than two errands. What that costs
  // is a label: the trigger is a glyph, because "Filter" would name half of it and "Manage" the
  // other half. What it buys is that the project you are filtering inside is one tab away, not one
  // dialog and one dismissal away.
  //
  // BAND 1 — THE LIBRARY'S ROW (19.09.26, by request). The title alone at the start, and the two
  // controls scoped to the whole section at the far edge: the door into the Library panel, then the
  // switch that redraws it, 8px apart. A scope rail stood on a row of its own under the title (All
  // and a chip per project, with arrows once they overflowed); it went by request ("it only adds
  // inconvenience"), the title moved down into its place, and the door, first set 8px after the
  // title, moved over to the toggle ("let Library sit alone").
  // THE TITLE IS 32 (--fs-statement), NOT 24 (19.09.26, by request: title and door "don't seem to
  // have visual balance" while they stood together). Kept at 32 when the door moved away.
  // THE WORD'S INK IS CENTRED, NOT ITS CAPITALS (19.09.26, by request: "the list button seem to sit
  // above the Library text"). Centring line boxes puts the controls' centre on the capitals' centre,
  // but "Library" is lowercase after its L and hangs a y below the baseline, so its mass sits lower
  // and a control centred on its capitals read high. The title lifts 0.1em (3.2px at 32), which puts
  // the middle of its ink, L-top to y-tail, on the row's centre line to within a quarter pixel
  // (measured at 2x and 3x; 0.09em left half a pixel at 3x). In em so it follows the title's size.
  // centre, not stretch: the title and the 35.5px pair share one centre line, where stretch would
  // draw the controls to the title's line box. 12px below, the gap the controls band always kept
  // above the table. The title is always here; the controls arrive with a library to act on, as
  // they did on the band (showProjectsBar, feedHasItems).
  const libraryRow = (
    <div style={sx('display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:12px')}>
      <h2 id="feed-heading" style={sx("position:relative; top:-0.1em; font-family: 'Neue Montreal'; font-weight: 500; font-size:var(--fs-statement); line-height:1.1; letter-spacing:var(--track-title); color: var(--on-surface); margin: 0")}>Library</h2>
      {/* THE STORAGE MARKER STOOD HERE and is removed by request. It was a 16px toggletip beside
          the heading carrying the one fact no control on this page states — where the library
          lives: saved in this browser, on this machine, no account and no server copy, and gone
          if you clear your browser data. It had a second state that is worth naming separately,
          because it was not an explanation but a WARNING: when the storage probe failed (private
          browsing, a locked-down profile, a full disk) the glyph became ! and the sheet said
          nothing here would survive closing the tab. That signal has no other home in the
          interface — persist() still fails silently — so the failure is now unannounced.
          Its unread state went on 17.09.26 (audit H3), and so did the toggletip component the
          empty states briefly used (audit H5, by request): putting the marker back is a rebuild. */}
      {/* THE DOOR AND THE SWITCH, AT THE FAR EDGE, 8px APART (19.09.26, by request: "move the list
          button to the right next to the list/grid toggle with the same gap"). The pair carries
          margin-inline-start:auto; the toggle used to carry it alone. */}
      {vals.showProjectsBar && (
        <div style={sx('display:flex;align-items:center;gap:8px;margin-inline-start:auto')}>
          {/* THE ONE DOOR INTO THE LIBRARY PANEL. It replaced two controls: Manage Projects ended the
              old scope rail and Filter began the row under it.

              IT IS THE ONLY CONTROL IN THIS CHROME WITH NO WORD ON IT. That is a real cost — an icon
              has to be recognised where a label is read — and it is paid for the reason set out at the
              top of this section: the panel behind it holds two jobs, and every honest label names
              one of them. The mark is the list it acts on, the hover title and the accessible name
              say the whole sentence, and the panel names itself in its heading the moment it arrives.

              flex:none is load-bearing, not tidiness. This is the only door to filtering AND to
              creating, renaming, deleting and exporting a project, so it must never be the thing on
              the row that gives way.

              data-library-btn keeps it out of the drawer's own dismiss-on-outside-press (see
              _facetOutside) and gives the stylesheet the one selector it needs for the pill corner.

              THE TOGGLE'S HEIGHT, 35.5, IN BOTH STATES: side by side, a 32px circle beside the 35.5px
              toggle stood 1.75px short at each end. 35.5 is the toggle's own sum (29.5px segments,
              2px of padding, the hairline twice), stated, because aspect-ratio does not transfer from
              a stretched cross size (it collapsed this button to 14px of icon once). A square at rest,
              so --radius-pill draws a circle; A STADIUM WHEN A FILTER IS ON, and that is the shape
              saying so: the count needs room the circle does not have, so the button widens by 12px
              each side of its contents and the same 999px reads as a pill. */}
          <button type="button" data-library-btn="1" data-ix="press" data-focus="chrome" aria-haspopup="dialog" aria-expanded={vals.facetOpen} onClick={vals.openFacet} aria-label={vals.libraryAria} title={vals.libraryTitle} style={sx('flex:none;display:inline-flex;align-items:center;justify-content:center;gap:7px;background:none;border:1px solid var(--action-line);font-family:Neue Montreal;font-size:var(--fs-label);letter-spacing:var(--track-flat);color:var(--on-surface);cursor:pointer;' + (vals.filterCount ? 'padding:0 12px;height:35.5px' : 'padding:0;width:35.5px;height:35.5px'))}>
            {/* THE MARK ANSWERS A HOVER, THE NUMBER DOES NOT. The glyph takes the masked swap every
                other control in this chrome uses — it lifts out and its twin rises into place — which
                is what pays for this button's exemption from the [data-ix="press"] tint a few rules
                into global.css: that rule was written for controls "carrying the swap already", and
                until now this one was not.
                The count is left outside it deliberately, on the rule the scope chips are built to:
                a figure that lifts and re-enters on hover reads as the number CHANGING, which is the
                one thing it must never appear to do. The glyph names the surface, the number names what
                filtering is holding back, and they are two facts that change on different occasions. */}
            <TextSwap><IconList size={12} /></TextSwap>{vals.filterCount && <span style={sx('font-family:Neue Montreal;font-size:var(--fs-fine);color:var(--on-surface-muted);font-variant-numeric:tabular-nums')}>{vals.filterCount}</span>}
          </button>
          {/* HOW the section is drawn, the last thing on the row. It sat on the heading row once
              before and went down to the scope rail's row, to line up with the bordered controls
              there; the rail is gone, and it shares its row with the title again (19.09.26). */}
          {vals.feedHasItems && (
            <div role="group" aria-label="Feed layout" data-toggle-init="1" style={sx('position:relative;display:inline-grid;grid-template-columns:repeat(2,1fr);padding:2px;border:1px solid var(--action-line);background:transparent')}>
              <span aria-hidden="true" style={vals.viewTogglePill}></span>
              <button type="button" data-toggle-btn="1" data-ix="seg" data-focus="chrome" aria-pressed={vals.listPressed} tabIndex={vals.listTab} onClick={vals.setList} onKeyDown={vals.viewToggleKey} style={vals.listToggleStyle}><TextSwap>List</TextSwap></button>
              <button type="button" data-toggle-btn="1" data-ix="seg" data-focus="chrome" aria-pressed={vals.gridPressed} tabIndex={vals.gridTab} onClick={vals.setGrid} onKeyDown={vals.viewToggleKey} style={vals.gridToggleStyle}><TextSwap>Grid</TextSwap></button>
            </div>
          )}
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
  // 24px UNDER THE TITLE ROW, 8 OVER THE TABLE (19.09.26, by request: the laws of proximity; the row
  // sat 12 under the title and 8 over the table, and belonged to neither). margin-top 24 collapses
  // with the title row's 12 into one 24px gap. A PROJECT'S CHIP CARRIES THE FOLDER, the app's one
  // mark for "project" (the row's Add to Projects, the action row), so "Smukfest" cannot be read as a
  // property like "Warm" (similarity).
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
    <div role="toolbar" aria-label="Applied filters" aria-controls="library-list" data-filter-toolbar="1" data-applied-filters="1" onKeyDown={vals.toolbarKey} style={sx('display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:24px;margin-bottom:8px')}>
      {/* One chip per applied filter across every group — accessibility first, matching the panel's
          group order — each removable on its own, so a narrowing can be undone from either end.
          THE APP'S CLOSE GLYPH, IN THE SWAP (17.09.26, audit C2, by request). The cross was a typed
          "✕" and nothing moved on hover; it is IconClose now, and the label and the glyph slide
          through one mask together, the way a Button carries its icon inside its label.
          THE SCOPE CHIPS' VOICE (18.09.26, by request): the chips and Clear Filters are set like the
          scope chips above them, 13px Medium in the case their labels are written in (global.css lifts
          the capitals for [data-applied-filters]), where they were the tool's 11px capitals. The ×
          is the close mark every other button carries, at its own 12px (it was drawn down to 10). */}
      {vals.appliedTags.map((t) => (
        <button key={t.key} type="button" data-ix="cta" data-focus="chrome" aria-label={t.aria} onClick={t.onRemove} style={sx('display:inline-flex;align-items:center;gap:7px;background:var(--on-surface);border:1px solid var(--on-surface);border-radius:var(--radius-pill);padding:var(--btn-pad-sm);font-family:Neue Montreal;font-size:var(--fs-body);font-weight:500;letter-spacing:var(--track-flat);color:var(--surface);cursor:pointer')}>
          <TextSwap><span style={sx('display:inline-flex;align-items:center;gap:7px')}>{t.project && <IconFolder size={12} />}{t.label}<IconClose /></span></TextSwap>
        </button>
      ))}
      {/* No aria-label: the visible text is the accessible name, so label-in-name (SC 2.5.3) can
          never drift. */}
      <button type="button" data-ix="press" data-focus="chrome" onClick={vals.onClearAll} style={sx('background:none;border:1px solid var(--action-line);border-radius:var(--radius-pill);padding:var(--btn-pad-sm);font-family:Neue Montreal;font-size:var(--fs-body);font-weight:500;letter-spacing:var(--track-flat);color:var(--on-surface);cursor:pointer')}><TextSwap>Clear Filters</TextSwap></button>
    </div>
  );

  return (
    <section data-recent="1" aria-labelledby="feed-heading" style={sx('width: 100%; padding: 40px var(--page-gutter) 88px; border-top: 1px solid var(--line-strong); margin-top: 36px')}>
      {libraryRow}

      {/* THE CONTROL BANDS, in every view. They used to be one strip that rode the sort row in
          list view and stood alone in Grid and 3D — a conditional placement whose whole purpose was
          to make scope, filter and sort read as "one bank of list controls". That was the mistake:
          they are not one bank. Filter says what is being held back, sort says how what is left is
          ordered, and putting them on a line asked the user to work out which was which every time
          they looked.

          Sort has gone back to the column header where it belongs — over the numbers it orders —
          and the applied filters stand on their own row under the title's, above every view. The
          scope chips had a row between them until 19.09.26; see the band diagram above. */}
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
      {filterRow}

      {/* FILTERED TO NOTHING is not EMPTY. The cold-start message told someone holding three
          filters that palettes would collect here — answering a question they had not asked and
          hiding the one they had, which is that the combination is unsatisfiable.
          IT TAKES THE TABLE'S PLACE (19.09.26, audit U1): the column header steps aside while it is up
          (renderVals showSortHeader), where it used to stand under this panel heading no rows, and
          the panel arrives on the rows' own rise (_syncFilteredEmpty). */}
      {vals.filteredEmpty && (
        /* A CORNER FOR ITS HEIGHT (17.09.26, radius issue R1, by request): --radius-panel, 16px, as
           Nothing here yet. The panel is 166px tall; Start here's 28px is sized for its 420, and on
           this height it read too strong. It was full round, then 28px, then 12px. */
        <div role="status" data-voice="banner" data-filtered-empty="1" style={sx('display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;width:100%;padding:48px 40px;background:var(--surface-raised);border:1px dashed var(--line-strong);border-radius:var(--radius-panel)')}>
          {/* The title alone (17.09.26, audit H5, by request): the combining rule stood under it
              as a sentence, then briefly in a toggletip. */}
          <div style={sx("font-family:'Neue Montreal';font-weight:500;font-size:var(--fs-lead);color:var(--on-surface)")}>No palette matches every filter</div>
          {/* ONE WAY OUT HERE (19.09.26, audit U1): undo the most recent narrowing. Clear Filters left
              this panel; it is on the applied-filters row directly above, where it stands in every
              filtered state, and two of it a few lines apart was one act offered twice.
              Button set like the analytics banner's (17.09.26, audit A3, by request). No aria-label:
              the visible text is the name (SC 2.5.3). */}
          <span style={sx('display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding-top:2px')}>
            <Button data-emphasis="primary" onClick={vals.onRemoveLast} style={CONSENT_BTN_TYPE} label={<span style={sx('display:flex;align-items:center;height:16px')}><ButtonText>Remove Last Filter</ButtonText></span>} />
          </span>
        </div>
      )}

      {/* A CORNER FOR ITS HEIGHT (17.09.26, radius issue R11, by request): --radius-panel, 16px.
          The same dashed panel as Start here above it, but 162px tall to Start here's 420, so it
          takes a corner sized for that height: 28px, Start here's, read too strong here. It was full
          round (A8), then 28px, then 12px.
          The title alone (audit H5, by request): "Palettes you generate collect here, newest first"
          stood under it, then briefly in a toggletip. */}
      {vals.feedEmpty && (
        <div style={sx('display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;width:100%;padding:48px 40px;background:var(--surface-raised);border:1px dashed var(--line-strong);border-radius:var(--radius-panel)')}>
          <div aria-hidden="true" style={sx('position:relative;width:34px;height:34px')}>
            <div style={sx('position:absolute;left:0;top:0;width:22px;height:22px;border:1px solid var(--line-strong)')}></div>
            <div style={sx('position:absolute;right:0;bottom:0;width:22px;height:22px;border:1px solid var(--on-surface-muted);background:var(--surface-raised)')}></div>
          </div>
          <div style={sx("font-family:'Neue Montreal';font-weight:500;font-size:var(--fs-lead);color:var(--on-surface)")}>Nothing here yet</div>
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
            padding) is gone — this shared padding is that inset now, held once.
            ON THE PAGE GRID (18.09.26, by request): the header and the list both reach --row-inset
            past the grid on each side, so that padding lands the twelve tracks on the page grid's
            own lines — see --row-inset in global.css. */}
        {/* Not while nothing matches (19.09.26, audit U1): the filtered-empty panel above takes the
            table's place, and the header comes back on the rows' rise when a narrowing is undone. */}
        {vals.showSortHeader && (
          <div role="group" aria-label="Sort the palette list" data-sort-head="1" inert={vals.listInert || undefined} style={sx('display:grid;grid-template-columns:var(--row-grid);align-items:end;gap:var(--grid-gutter);width:calc(100% + var(--row-inset) * 2);margin-inline:calc(var(--row-inset) * -1);padding:0 var(--row-inset) 8px;border-bottom:1px solid var(--line-strong)')}>
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
            <span data-row-cell="head" style={sx('min-width:0;font-family:Neue Montreal;font-size:var(--fs-body);font-weight:500;letter-spacing:var(--track-flat);color:var(--on-surface-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding-bottom:7px')}>Palette</span>
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
                <button key={col.key} type="button" data-ix="press" data-focus="chrome" data-sort-col="1" aria-pressed={col.pressed} aria-label={col.aria} onClick={col.onSort} data-row-cell={col.key === 'time' ? 'date' : col.key} style={col.style}>
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
              <button key={col.key} type="button" data-ix="press" data-focus="chrome" data-sort-col="1" aria-pressed={col.pressed} aria-label={col.aria} onClick={col.onSort} data-row-cell={col.key === 'time' ? 'date' : col.key} style={col.style}>
                {/* Same reserved slot and same data-dim rule as the AA column above. */}
                <span aria-hidden="true" style={sx('display:inline-flex;align-items:center;justify-content:center;width:9px;flex:none')}>{col.showChevron && <span data-sort-chevron="1" data-dir={col.dir} data-dim={col.chevronDim ? '1' : null}><IconChevron /></span>}</span><TextSwap>{col.label}</TextSwap>
              </button>
            ))}
          </div>
        )}

        {/* LIST view (canonical). The id is what the toolbar's aria-controls points at, so a
            screen reader can say which region those filter controls act on. */}
        {/* Inert while the grid covers it: laid out, so the grid's exit reveals it, but out of the tab
            order and the accessibility tree, as display:none used to keep it (renderVals listRows). */}
        <div id="library-list" data-list-wrap="1" inert={vals.listInert || undefined} style={vals.listWrapStyle}>
          {vals.feedList.map((c) => (
            /* Enter and leave are on the WRAP, not the row: the folder and bin buttons are the
               wrap's children beside the row, so a pointer crossing onto one of them left the row
               and put the fill down — under the very glyphs it had just lit. The wrap contains
               both, so the fill stays up for as long as the pointer is anywhere on the line. */
            <div key={c.rowid} data-row-wrap="1" onMouseEnter={c.onEnter} onMouseLeave={c.onLeave} style={{ position: 'relative' }}>
              {/* The row was a single <button>, which made interactive tags inside it illegal HTML.
                  Now it is a surface (this div carries the background, the selected sync and the
                  hover tint) with a STRETCHED activation button covering it — the same overlay
                  pattern the folder/delete buttons already use, just inset:0. The hit button is
                  first in DOM so keyboard order leads with the row's main action, then its tags;
                  it keeps data-feed so the list's arrow-key navigation still walks row to row. */}
              <div data-row="1" data-cur={c.curFlag} data-rowid={c.rowid} style={c.rowStyle}>
                {/* THE HOVER FILL — see rowFillStyle. The row's ink twin: the same content on an ink
                    ground, clipped away at rest and unclipped from the bottom up by rowTintOn. First
                    in DOM so the hit button and the row's real content stay above it in paint order;
                    aria-hidden and pointer-events:none, since it repeats the row for the eye only. */}
                <span data-row-fill="1" aria-hidden="true" style={c.rowFillStyle}>
                  <span style={c.markerInvStyle}></span>
                  <RowMain c={c} inv />
                </span>
                <button type="button" data-row-hit="1" data-feed="1" data-focus="card" disabled={c.disabled} aria-current={c.ariaCurrent} aria-label={c.aria} onFocus={c.onHitFocus} onBlur={c.onHitBlur} onClick={c.onClick} style={sx('position:absolute;inset:0;z-index:1;background:transparent;border:0;padding:0;margin:0;cursor:inherit')}></button>
                <span data-cmark="1" aria-hidden="true" style={c.markerStyle}></span>
                {/* One row, one job: recognition. The detail surface is the overview panel above —
                    this row's only output is "which palette", so it holds a fixed height and every
                    child stays on a single line. Nothing here may grow the row. */}
                {/* 16 on the left, 8 on the right — and the same 16px margin on both, because the
                    trailing cell carries the other 8 itself (--row-cell-inset). Splitting it that
                    way is what lets the last column's value and its header label share one right
                    edge while the header's hover tint stays symmetrical around its own label. */}
                <RowMain c={c} />
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
              <button type="button" data-ix="press" data-del="1" data-focus="chrome" aria-label={c.assignAria} onClick={c.onAssign} style={sx('position:absolute;right:calc(var(--row-action-offset) + 38px);z-index:6;width:32px;height:32px;padding:0;display:inline-flex;align-items:center;justify-content:center;background:none;border:0;cursor:pointer')}>
                <IconFolder />
              </button>
              <button type="button" data-danger="1" data-ix="press" data-del="1" data-focus="chrome" aria-label={c.deleteAria} onClick={c.onDelete} style={sx('position:absolute;right:var(--row-action-offset);z-index:6;width:32px;height:32px;padding:0;display:inline-flex;align-items:center;justify-content:center;background:none;border:0;cursor:pointer')}>
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
          <nav aria-label="Palette list pages" inert={vals.listInert || undefined} style={sx('display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;padding:16px 0 0')}>
            {vals.showPageSize ? (
              <div role="group" aria-label="Palettes per page" style={sx('display:flex;align-items:center;gap:10px')}>
                {/* The words "Per page" stood here and are gone by request. The control is three
                    numbers in a segmented rail, which is legible as a page size without being told
                    so — and the group's own aria-label ("Palettes per page", on the wrapper above)
                    is what a screen reader reads, so removing the visible text costs the accessible
                    name nothing. */}
                <div data-toggle-init="1" style={sx('position:relative;display:inline-grid;grid-template-columns:repeat(3,1fr);padding:2px;border:1px solid var(--action-line);background:transparent')}>
                  <span aria-hidden="true" style={vals.pageTogglePill}></span>
                  {vals.pageSizeOptions.map((o) => (
                    <button key={o.label} type="button" data-toggle-btn="1" data-ix="seg" data-focus="chrome" aria-pressed={o.pressed} tabIndex={o.tabIndex} onClick={o.onSelect} onKeyDown={vals.pageToggleKey} style={o.style}><TextSwap>{o.label}</TextSwap></button>
                  ))}
                </div>
              </div>
            ) : <span></span>}
            {vals.showPager && (
              <div style={sx('display:flex;align-items:center;gap:10px')}>
                {/* The same chevron pair the project rail steps on, rotated the same way — one
                    direction control, one glyph, on both rows, rolling through the same mask on
                    hover. aria-label already carried the words,
                    so nothing is lost to a screen reader by dropping them from the face. */}
                <button type="button" data-page-step="prev" data-ix="press" data-focus="chrome" disabled={vals.prevDisabled} aria-label="Previous page" onClick={vals.prevPage} style={vals.prevStyle}><TextSwap><IconChevron size={12} turn={90} /></TextSwap></button>
                {/* The figure twice: seen as "1/2", heard as "Page 1 of 2". The live region is the
                    hidden one — it is a stable element whose text changes, which is what makes a
                    polite announcement reliable, and it says the sentence rather than the slash. */}
                <span style={sx('font-family:Neue Montreal;font-size:var(--fs-detail);letter-spacing:var(--track-flat);color:var(--on-surface-muted);white-space:nowrap;font-variant-numeric:tabular-nums')}>
                  <span aria-hidden="true">{vals.pageLabel}</span>
                  <span aria-live="polite" style={visuallyHidden}>{vals.pageLabelSpoken}</span>
                </span>
                <button type="button" data-page-step="next" data-ix="press" data-focus="chrome" disabled={vals.nextDisabled} aria-label="Next page" onClick={vals.nextPage} style={vals.nextStyle}><TextSwap><IconChevron size={12} turn={-90} /></TextSwap></button>
              </div>
            )}
          </nav>
        )}

        {/* FULLSCREEN PALETTE UNIVERSE (overscanning, wrapping field) */}
        <div ref={vals.spaceRef} role="region" aria-label="Palette universe, spatial view" data-universe-status="idle" inert={vals.spaceLeaving || undefined} style={vals.spaceStyle}>

          {vals.universeEngine && (<>
            <div ref={vals.planeRef} data-plane="1" style={sx('position:absolute;top:0;left:0;width:100%;height:100%')}>
              <div data-grid-originals="1" style={sx('position:absolute;top:0;left:0;width:100%;height:100%')}>
                {vals.feedNodes.map((c, ci) => (
                  <button key={ci} type="button" data-feed="1" data-focus="card" aria-current={c.ariaCurrent} aria-label={c.aria} onMouseEnter={c.onEnter} onMouseLeave={c.onLeave} onFocus={c.onFocus} onBlur={c.onBlur} onClick={c.onClick} style={c.tileAbs}>
                    <div data-tile-inner="1" style={sx('position:absolute;inset:0;transform-origin:center center')}>
                      {/* THE PANEL, AS THE REFERENCE BUILDS IT: a surface behind the picture, inside the
                          card, that slides out on --slide — so it moves, bends and shrinks with the card
                          for free and is hidden by the picture whenever it is home. The engine sets
                          --slide from the open scalar and --sx/--sy for the direction; the content that
                          lands on it is a separate, transparent layer (data-universe-panel). First
                          child, so everything else in the card paints over it. */}
                      <span data-tile-panel="1" aria-hidden="true" style={c.panelStyle}></span>
                      <div data-tile-hero="1" style={c.heroWrapStyle} aria-hidden="true">
                        {/* The two blurred copies ride inside the photograph, so they take the engine's
                            drift with it; the tint is the hero's. All three fade with the caption when
                            the card opens (universe.js openTile). */}
                        {c.hasImage && (<span data-tile-img="1" aria-hidden="true" style={c.imgStyle}>
                          <span data-tile-fade="1" style={TILE_FADE.near}></span>
                          <span data-tile-fade="1" style={TILE_FADE.far}></span>
                        </span>)}
                        {c.noImage && (<span style={c.heroFallback}></span>)}
                        <span data-tile-fade="1" style={TILE_FADE.tint}></span>
                      </div>
                      <div data-tile-caption="1" style={c.captionStyle}>
                        <CardIdentity c={c} onPhoto />
                      </div>
                      {/* the card's own share of the shade — written by the engine while the card is
                          lifted above the shade, so opening never pops it bright (universe.js render) */}
                      <span data-tile-dim="1" aria-hidden="true" style={c.dimStyle}></span>
                      <span data-ring="1" aria-hidden="true" style={c.ringStyle}></span>
                    </div>
                  </button>
                ))}
              </div>
              {/* THE OPEN CARD'S CONTENT. One element for the whole field, filled with whichever card
                  is open, exactly as the reference keeps one lightbox: the content is React's (it reads
                  the live record), the box is the engine's (universe.js openTile). It has no surface of
                  its own — the surface is the panel inside the card, above — so it only ever has to
                  fade, and it sits in the plane above the lifted card so it paints over that panel. */}
              <div data-universe-panel="1" role="group" aria-label={vals.universePanel ? vals.universePanel.panelAria : undefined} aria-hidden={vals.universePanel ? undefined : 'true'} style={vals.universePanelStyle}>
                {vals.universePanel && (<UniversePanel c={vals.universePanel} />)}
              </div>
            </div>
          </>)}

          {vals.universeReduced && (
            /* Reduced motion's plain grid scrolls under the bar and above the dock like everything else,
               and starts clear of the bar (the bar, the air) and ends clear of the dock (the air, its
               32px, the air again). */
            <div data-lenis-prevent="1" style={sx('position:absolute;top:0;left:0;right:0;bottom:0;overflow:auto;padding:calc(var(--nav-top) * 2 + var(--nav-h)) var(--page-gutter) calc(var(--page-gutter) * 2 + 32px)')}>
              <div style={sx('display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:20px;max-width:1200px;margin:0 auto')}>
                {vals.feedNodes.map((c, ci) => (
                  <button key={ci} type="button" data-feed="1" data-focus="card" aria-current={c.ariaCurrent} aria-label={c.aria} onClick={c.onClick} style={sx('position:relative;display:block;text-align:left;width:100%;background:var(--surface-raised);border:1px solid var(--line);border-radius:var(--radius-card);padding:0;margin:0;cursor:pointer;font:inherit;overflow:hidden')}>
                    <div style={sx('position:relative;height:170px;width:100%;overflow:hidden;background:var(--line)')} aria-hidden="true">
                      {c.hasImage && (<span aria-hidden="true" style={c.imgStyle}></span>)}
                      {c.noImage && (<span style={c.heroFallback}></span>)}
                    </div>
                    <div data-strip="1" style={sx('display:flex;height:46px;flex:none;width:100%')} aria-hidden="true">
                      {c.strip.map((st, si) => (<div key={si} style={st.style}></div>))}
                    </div>
                    <div style={sx('padding:12px 14px;display:flex;flex-direction:column;gap:6px;width:100%')}>
                      <div style={sx('display:flex;justify-content:space-between;align-items:baseline;gap:8px')}>
                        <CardIdentity c={c} />
                      </div>
                      <span style={sx('font-family:Neue Montreal;font-size:var(--fs-label);letter-spacing:var(--track-flat);color:var(--on-surface-muted)')}>{c.descriptors}</span>
                    </div>
                    <CardMetrics c={c} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* THE DOCK (18.09.26, by request): the hint and the close as one pair at the bottom centre,
              in the front page's glass (the landing's quiet .glass-cta: the masthead pane, the 12%
              hairline, the pill, 14px Medium in Title Case). The close used to stand alone under the
              bar's right end and the hint in the bottom-left corner as a label chip; they belong
              together, so they share one edge, one baseline and one way in and out. The pair's glass
              arrives and leaves on --dock-glass and its ink on --dock-ink rather than on an opacity,
              which would switch the blur off mid-fade (universe.js _uViewClose, global.css).
              The close keeps the close mark's rule: the × sliding through its mask is the hover, and
              the pane holds still under the pointer. No data-ix: .glass-cta states its own contract,
              and the press tier's close-mark rule would clear the pane on hover. */}
          <div data-grid-dock="1" style={sx('position:absolute;left:0;right:0;bottom:var(--page-gutter);z-index:5;display:flex;align-items:center;justify-content:center;gap:8px;pointer-events:none')}>
            {vals.universeEngine && (
              <span className="glass-cta" data-grid-hint="1" aria-hidden="true"><span className="grid-dock__ink">Drag or Scroll to Explore</span></span>
            )}
            <button type="button" ref={vals.universeCloseRef} className="glass-cta" data-grid-close="1" data-focus="chrome" onClick={vals.setList} aria-label="Close palette universe, or press Escape" title="Close"><span className="grid-dock__ink"><TextSwap><IconClose /></TextSwap></span></button>
          </div>
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
    /* 157, ABOVE THE BRAND MARK (155), and the mark is the reason. This sat at 110 on the reasoning
       the library panel's note used to give: a modal drawer can stay under the fixed wordmark because
       its dimming backdrop takes the page, logo included, out of play. That held only while the
       drawer stayed right of the mark. The drawer is 500px and the mark a centred 165px, so in any
       window narrower than 1165px they meet — from 1024, the tool's own minimum, up. Measured at
       1024: the drawer's edge at 524, the mark across 430–595, the wordmark printed crisp through
       "Contrast checker" and the palette name. The mark is also a button, so it took presses aimed
       at the backdrop and could send the reader home from under an open modal.
       Above the mark, the backdrop dims it with the rest of the page and a press there closes the
       drawer, which is what a modal says.
       157 RATHER THAN 156, because this can open over the library panel. The panel closes on an
       outside pointerdown, but a keyboard reader who tabs out of it and activates Check contrast
       gets no pointerdown: at 110 the drawer opened UNDER the panel, with focus trapped in a surface
       the panel was hiding. 157 is also the stacked export's number, and both are modal, so they
       are never open together. Still under the toast (158) and the page transition (159, 160).
       What this puts under the backdrop: a notice (128) raised while a drawer is open. Only two can
       be — another tab's sync, which times out, and the live reading's fallback, which stays until
       dismissed and so is still there when the drawer closes. */
    <div style={sx('position:fixed;inset:0;z-index:157')}>
      <div data-cx-backdrop="1" onClick={vals.closeContrast} style={sx('position:absolute;inset:0;background:color-mix(in srgb, var(--scrim) 55%, transparent);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)')}></div>
      <div data-cx-drawer="1" data-contrast-dialog="1" data-lenis-prevent="1" role="dialog" aria-modal="true" aria-label={'Contrast checker for ' + contrast.name} onKeyDown={vals.trapContrast} style={sx('position:absolute;right:0;top:0;bottom:0;width:500px;max-width:94vw;background:var(--surface);border-left:1px solid var(--line-strong);border-radius:var(--radius-surface) 0 0 var(--radius-surface);box-shadow:var(--shadow-surface);display:flex;flex-direction:column;overflow-y:auto')}>
        <header data-cx-sec="1" style={sx('display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:20px var(--page-gutter) 0')}>
          <div style={sx('display:flex;flex-direction:column;gap:4px;min-width:0')}>
            {/* TOMBSTONE: the eyebrow read "Contrast Checker" over the palette's name (20.09.26, by
                request: "Delete label"). The drawer is titled for a screen reader (aria-label on the
                dialog) and its own controls say what it measures; a standing label over them was the
                same overexplaining the dialog leads were deleted for on 19.09. */}
            <h2 data-drawer-split="1" style={sx("margin:0;font-family:'Neue Montreal';font-weight:500;font-size:var(--fs-subtitle);letter-spacing:var(--track-title);color:var(--on-surface);white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{contrast.name}</h2>
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
          <div data-cx-cell="lens" data-seg-rail="1" style={sx('position:relative;display:inline-grid;grid-template-columns:repeat(2,1fr);height:var(--cx-control-h);padding:2px;border:1px solid var(--action-line);background:transparent')} role="group" aria-label="WCAG level">
            <span aria-hidden="true" style={contrast.lensPill}></span>
            <button type="button" data-seg-btn="1" data-ix="seg" data-focus="chrome" onClick={contrast.setAA} aria-pressed={contrast.aaPressed} style={contrast.aaStyle}><TextSwap>AA</TextSwap></button>
            <button type="button" data-seg-btn="1" data-ix="seg" data-focus="chrome" onClick={contrast.setAAA} aria-pressed={contrast.aaaPressed} style={contrast.aaaStyle}><TextSwap>AAA</TextSwap></button>
          </div>
          <div data-cx-cell="size" data-seg-rail="1" style={sx('position:relative;display:inline-grid;grid-template-columns:repeat(2,1fr);height:var(--cx-control-h);padding:2px;border:1px solid var(--action-line);background:transparent')} role="group" aria-label="Text size">
            <span aria-hidden="true" style={contrast.sizePill}></span>
            <button type="button" data-seg-btn="1" data-ix="seg" data-focus="chrome" onClick={contrast.setNormal} aria-pressed={contrast.normalPressed} style={contrast.normalStyle}><TextSwap>Normal Text</TextSwap></button>
            <button type="button" data-seg-btn="1" data-ix="seg" data-focus="chrome" onClick={contrast.setLarge} aria-pressed={contrast.largePressed} style={contrast.largeStyle}><TextSwap>Large Text</TextSwap></button>
          </div>
          {/* STILL A PILL (19.09.26, by request): it was made a switch with the other two on/off controls
              (audit U5) and put back the same day. It stands beside the rails in their voice and fills
              black when on. */}
          <button type="button" data-cx-cell="filter" data-ix="seg" data-focus="chrome" onClick={contrast.togglePass} aria-pressed={contrast.passPressed} style={contrast.passStyle}><TextSwap>{contrast.passLabel}</TextSwap></button>
        </div>

        {/* STACKED, WITH THE MINIMUM AS THE EYEBROW. Side by side at a shared baseline the two read
            as one long line, and the threshold — the number the sentence is measured against — was
            trailing the sentence that depended on it. Above it, it does what every other eyebrow in
            this drawer does: says what is being counted before the count.
            THE DOM ORDER MOVED WITH THE VISUAL ORDER rather than being flipped in CSS. `order` or
            column-reverse would leave a screen reader hearing the sentence and then the threshold it
            was measured against, which is the wrong way round for the same reason it looked wrong.
            No new type is invented for the eyebrow: --fs-label, uppercase, --track-flat and
            --on-surface-muted are already what this span carried and what "Contrast checker" above
            the palette name carries. Only the position changed. 8px is the gap the drawer's section
            eyebrows already keep from what they label.
            Both halves are still composed in renderVals against the SAME threshold the cells are
            graded on, so the sentence, the minimum and the matrix cannot report different criteria. */}
        <div data-cx-sec="1" style={sx('display:flex;flex-direction:column;align-items:flex-start;gap:8px;padding:16px var(--page-gutter) 0')}>
          {/* The rule's other label (19.09.26, audit U8, by request): 13px Title Case, muted, where it was
              11px capitals. "Minimum" names the value beside it.
              BOTH LINES RISE THROUGH THE MASKED REVEAL WHEN AA/AAA OR NORMAL/LARGE REWRITES THEM (19.09.26,
              by request): _revealContrastLines on [data-cx-line]. The reveal rebuilds a line from its
              textContent, so the minimum is its string whole, hidden from a screen reader, and the ratio
              is said beside it (spokenRatios) rather than drawn by [data-ratio]. */}
          <span data-cx-line="1" aria-hidden="true" style={sx('font-family:Neue Montreal;font-size:var(--fs-body);letter-spacing:var(--track-flat);color:var(--on-surface-muted);white-space:nowrap')}>{contrast.minText}</span>
          <span style={visuallyHidden}>{spokenRatios(contrast.minText)}</span>
          <span data-cx-summary="1" data-drawer-split="1" data-cx-line="1" style={sx('font-family:Neue Montreal;font-size:var(--fs-body);color:var(--on-surface)')}>{contrast.summaryText}</span>
        </div>

        {/* A "Pairwise contrast" eyebrow stood above the matrix and is gone by request (14.09.26).
            The matrix now sits on the section's own 14px under the summary sentence. */}
        <div data-cx-sec="1" style={sx('padding:14px var(--page-gutter) 0')}>
          <div style={contrast.matrixColsStyle}>
            {contrast.rows.map((row, ri) => (
              <div key={ri} style={sx('display:flex;align-items:stretch;gap:4px')}>
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
                      {/* The ratio is aria-hidden and the whole statement is carried by the hidden
                          span below it. Read aloud, the visible number alone was "10.3", with the two
                          colours it compares in a header several rows back. No ✓/✕ mark since
                          17.09.26: the fill and the number's weight carry the verdict (renderVals).
                          THE CELL WRITES ITS ":1" (19.09.26, audit X3, by request: ":1 too"), as the rows
                          under it and Best Pair do, through the same [data-ratio] rule. Blank cells take
                          no attribute, or the empty half of the grid would print ":1" on its own. */}
                      <span data-cx-num="1" data-ratio={cell.blank ? undefined : ''} aria-hidden="true" style={cell.numStyle}>{cell.ratio}</span>
                      {cell.aria && <span style={visuallyHidden}>{cell.aria}</span>}
                    </div>
                  ))}
                </>)}
              </div>
            ))}
          </div>
        </div>

        {/* The rows alone: their "Text on each colour" label went on 17.09.26 (radius issue R10, by
            request). Each row still names its colour and the text that reads on it.
            AS TILES (19.09.26, by request: option A of two rendered in this drawer, "go with a"): each
            row is a tile of its colour, like How it Works 2.1's, 6px apart. The hex (13px Medium) sits
            over the name of the text colour that reads on it (11px), and the ratio is the row's figure
            at 20px, since it is what this panel measures. Static: this drawer is opened often, so the
            count-up and masked reveal the pages' tiles carry stay on the pages. */}
        <div data-cx-sec="1" style={sx('padding:20px var(--page-gutter) 0')}>
          <div style={sx('display:flex;flex-direction:column;gap:6px')}>
            {contrast.textOn.map((t, ti) => (
              <div key={ti} data-cx-cell={'on-' + ti} data-ov-wipe="1" style={t.style}>
                <span style={sx("display:flex;flex-direction:column;gap:3px;min-width:0;font-family:'Neue Montreal';letter-spacing:var(--track-flat)")}>
                  <span style={sx('font-size:var(--fs-body);font-weight:500;line-height:1.2')}>{t.hex}</span>
                  {/* No capitals (19.09.26, audit W2): a value, in the Title Case of the Q5 rule. */}
                  <span style={sx('font-size:var(--fs-fine);line-height:1.2')}>{t.onLabel}</span>
                </span>
                <span style={sx("flex:none;font-family:'Neue Montreal';font-size:var(--fs-subtitle);font-weight:500;line-height:1;letter-spacing:var(--track-flat)")}><span data-ratio="">{t.ratio}</span></span>
              </div>
            ))}
          </div>
        </div>

        <div data-cx-sec="1" style={sx('padding:20px var(--page-gutter) 26px')}>
          <div style={sx('display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px')}>
            {/* THE BUTTONS' TYPE (18.09.26, by request): the label at 13px Medium in its own Title Case,
                where it was 11px capitals; the ratio beside it keeps its own smaller step, at Medium.
                THE PAIR IS DRAWN, NOT SPELLED (same day, by request, option C of three), as "Aa" in the text
                colour on the background since 19.09.26 (PairMark), where it was two overlapping discs. The
                hexes are still said, visually hidden, ahead of the ratio. */}
            <span style={sx('font-family: Neue Montreal; font-size:var(--fs-body); font-weight:500; letter-spacing:var(--track-flat); color: var(--on-surface-muted)')}>Best Pair Sample</span>
            <span style={sx('display:inline-flex;align-items:center;gap:8px;font-family:Neue Montreal;font-size:var(--fs-label);font-weight:500;color:var(--on-surface-muted)')}>
              <PairMark fg={contrast.sampleFg} bg={contrast.sampleBg} />
              <span style={visuallyHidden}>{contrast.sampleFg} on {contrast.sampleBg}, </span>
              <span>{withRatios(contrast.sampleRatio + ':1')}</span>
            </span>
          </div>
          {/* The words have a box of their own so their size can step while the sample's box
              extends around them (_growSample in methods/overlays.js). */}
          <div data-cx-sample="1" data-cx-cell="sample" style={contrast.sampleStyle}><span data-cx-sample-text="1" style={sx('display:block')}>The quick brown fox jumps over the lazy dog</span></div>
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
          <h2 style={sx("margin:0;font-family:'Neue Montreal';font-weight:500;font-size:var(--fs-subtitle);letter-spacing:var(--track-title);color:var(--on-surface);white-space:nowrap")}>{overlay.name}</h2>
          {/* THE LIBRARY'S STAMP, IN THE LIBRARY'S TYPE (19.09.26, audit U6, by request): minutes and hours
              under a day, the date after, at the Created column's 12px with no capitals. It was relative
              at any age, in 11px capitals, while the list gave the date. */}
          <span title={overlay.timeTitle} style={sx('font-family: Neue Montreal; font-size:var(--fs-detail); letter-spacing:var(--track-flat); color: var(--on-surface-muted); font-variant-numeric: tabular-nums')}>{overlay.time}</span>
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
          <button type="button" data-danger="1" data-ix="press" data-focus="chrome" aria-label={overlay.deleteAria} title="Delete" onClick={overlay.onDelete} style={sx('flex:none;width:32px;height:32px;display:inline-flex;align-items:center;justify-content:center;background:none;border:1px solid var(--action-line);border-radius:var(--radius-pill);padding:0;color:var(--on-surface);cursor:pointer')}><TextSwap><IconTrash /></TextSwap></button>
          <button type="button" data-ix="press" data-focus="chrome" title="Close" aria-label="Close palette detail" onClick={vals.closeOverlay} style={sx('flex:none;width:32px;height:32px;display:inline-flex;align-items:center;justify-content:center;background:none;border:1px solid var(--action-line);border-radius:var(--radius-pill);padding:0;color:var(--on-surface);cursor:pointer')}><TextSwap><IconClose /></TextSwap></button>
        </div>
      </header>

      {/* The shares count up out of the blur here as they do on the stage (19.09.26, by request):
          overlays.js plays it on the beat the chrome arrives on. The rolling strips are hidden from a
          screen reader, which reads the twin beside them. */}
      <div ref={vals.overlayBandsRef} role="group" aria-label="Palette swatches" data-odometer-group="" data-odometer-stagger="0.2" style={sx('display:flex;flex:1;min-height:0;width:100%')}>
        {overlay.bands.map((b) => (
          <div key={b.sid} data-oband="1" data-sid={b.sid} role="group" aria-label={b.groupAria} style={b.style}>
            <div data-ochrome="1" style={sx('display:flex;flex-direction:column;gap:8px')}>
              <span data-odometer-element="" data-odometer-start="0" data-odometer-duration="1.4" aria-hidden="true" style={b.weightStyle}>{b.weightPct}</span>
              <span style={visuallyHidden}>{b.weightPct}</span>
            </div>
            <button type="button" data-ix="icon" data-info="1" data-focus="chrome" aria-haspopup="dialog" aria-label={b.harmonyAria} onClick={b.onHarmony} style={b.infoBtnStyle}>
              <TextSwap><IconHarmony /></TextSwap>
            </button>
            <div data-ochrome="1" style={b.valuesWrap}>
              {/* CMYK, as on the result stage (19.09.26, audit U6, by request: "stick with CMYK"): the
                  detail wrote CMYK APPROX where the stage wrote CMYK. Export says the value is approximate. */}
              {b.values.map((v) => (<ValueRow key={v.key} v={v} showCaveat={false} />))}
            </div>
          </div>
        ))}
      </div>

      {/* TWO ROWS SINCE SHARE JOINED THE ACTIONS (19.09.26, audit U6, by request). The traits and the
          reading share the first, the actions the second at the footer's full width, so Share closes
          it at the far right as it closes the result stage's. In one row beside the reading, the
          actions' column ended where the reading began and Share stood two thirds across. */}
      <footer data-ochrome="1" style={sx('display:flex;flex-direction:column;gap:14px;padding:22px var(--page-gutter);border-top:1px solid var(--line-strong);flex:none')}>
        <div style={sx('display:flex;align-items:flex-start;justify-content:space-between;gap:28px')}>
          <div style={sx('display:flex;flex-wrap:wrap;gap:8px;min-width:0')}>
            {overlay.descriptors.map((d, di) => (<span key={di} style={vals.pill}>{d}</span>))}
          </div>
          <p style={sx("max-width:380px;flex:none;font-family:'Neue Montreal';font-size:var(--fs-lead);line-height:1.5;color:var(--on-surface-muted);text-align:end;margin:0;text-wrap:pretty")}>{overlay.rationale}</p>
        </div>
        {/* The same row as the result view's, deliberately: same order, same division, same
            weights. A palette opened fullscreen from the archive must not re-teach the user a
            different set of controls. Filing leads because it leaves something behind; the pair
            after it only reads the palette back to you, Contrast first because inspecting comes
            before copying. SHARE CLOSES THE ROW HERE TOO (19.09.26, audit U6, by request), at the far
            end behind the same flexible gap: a share link is sealed from the palette itself, so
            any palette has one. The hairline that used to divide the trio from Filing went on
            02.09.26, on both surfaces. */}
        <div data-voice="banner" style={sx('display:flex;align-items:center;gap:8px;flex-wrap:wrap')}>
          {/* Filing leads here, as it does on the result view: the act that is first in the
              sequence and available — organise, then validate, then output. */}
          <Button data-emphasis="primary" onClick={overlay.onAssign} aria-haspopup="dialog" aria-label={overlay.assignAria} style={CONSENT_BTN_TYPE} label={assignButtonLabel(overlay.assignLabel)} />
          <div style={sx('display:flex;align-items:center;gap:8px;flex-wrap:nowrap')}>
            <Button data-emphasis="secondary" onClick={vals.openContrast} disabled={vals.contrastDisabled} aria-haspopup="dialog" aria-label="Open contrast checker for this palette" style={CONSENT_BTN_TYPE} label={contrastButtonLabel} />
            <Button data-emphasis="secondary" onClick={vals.openExport} aria-haspopup="dialog" aria-label="Export this palette: copy it, or download it as design tokens" style={CONSENT_BTN_TYPE} label={exportButtonLabel} />
          </div>
          <span style={sx('margin-inline-start:auto;display:inline-flex')}>
            <ShareControl open={vals.shareMenuOpen} owns name={overlay.name} rows={overlay.shareRows} onToggle={vals.toggleShareMenu} onKey={vals.shareMenuKey} itemStyle={vals.sheetItemStyle} tint={vals.sheetRowTint} />
          </span>
        </div>
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
// The measured groups' labels arrive already cased — Text-Ready, Limited Text, Dark, Warm — so they
// are printed as authored. Capitalize exists for the TRAIT rows, whose terms are stored lowercase
// ('graphic', 'nostalgic') and have no casing of their own; it stays on those and comes off these.
// It would be a no-op on today's measured labels, which is exactly why it must not be there: the
// next label that is not already Title Case would be silently rewritten by a stylesheet.
// Everything else about the two is identical, which is the point: one row grammar, two casing
// sources.
// THE FILTER ROWS ARE ADD TO PROJECTS' ROWS (17.09.26, audit Q4): a raised stadium with a hairline
// edge, 11px by 18px of inset, 6px apart, the edge going to ink when the row is on. The plate is its
// own layer, under the row's content, so its hover can ease without touching the row's own box.
const SEC_ROW = 'position:relative;display:flex;align-items:center;gap:11px;width:100%;text-align:left;background:none;border:none;border-radius:var(--radius-pill);padding:11px 18px;font:inherit;';
const SEC_PLATE = sx('position:absolute;inset:0;border-radius:var(--radius-pill);pointer-events:none');
const measuredLabelStyle = sx('font-family:Neue Montreal;font-size:var(--fs-body);letter-spacing:var(--track-flat);white-space:nowrap;flex:none;font-weight:500');

// ============================== THE LIBRARY PANEL ==============================
// ONE PANEL, ONE LIST (19.09.26, by request; it had two tabs, Filter and Projects): the Project
// group first, whose Edit manages the projects in place, then what is being held back.
// ONE PANEL, TWO TABS was the step before: what is being held back (Filter) and what the library is
// divided into (Projects). They were two surfaces — this drawer and a centred Manage Projects dialog — reached
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
    // z-index 156 — above the fixed brand mark (155); at 120 the wordmark printed straight through
    // the panel header. The modal drawers once stayed under the mark on the grounds that their
    // backdrop subsumes it, which failed wherever a drawer reached the mark's centre, so they sit at
    // 157 now, above this panel as well (see ContrastDrawer). Still below the wipe (160), lightbox
    // (170) and loader (190), which are whole-screen states that outrank any panel.
    <div style={sx('position:fixed;inset:0;z-index:156;pointer-events:none')}>
      <div data-library-dialog="1" data-lenis-prevent="1" role="dialog" aria-label="Manage Library" style={sx('position:absolute;right:0;top:0;bottom:0;width:480px;max-width:94vw;pointer-events:auto;background:var(--surface);border-left:1px solid var(--line-strong);border-radius:var(--radius-surface) 0 0 var(--radius-surface);box-shadow:var(--shadow-surface);display:flex;flex-direction:column;overflow-y:auto')}>
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
              <h2 data-drawer-split="1" style={sx("margin:0;font-family:'Neue Montreal';font-weight:500;font-size:var(--fs-subtitle);letter-spacing:var(--track-title);color:var(--on-surface)")}>Manage Library</h2>
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
                  Its unread state (filterInfoOpen, a11yDefs) went on 17.09.26, audit H3. */}
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
        {/* THE PANEL'S COPY OF THE APPLIED CHIPS STOOD HERE and is removed by request. It pinned one
            removable chip per applied value to the header, plus a Clear Filter, so that a selection
            never scrolled out of reach of the list that made it.
            WHAT MAKES IT REDUNDANT IS THE LIST ITSELF. Every applied value is a row a few pixels
            below with its checkbox filled — the state is already on the control that sets it, and a
            chip above it was the same fact said twice, in two shapes, on one surface. The list button
            outside carries the count, so the panel does not list them again.
            THE STATE IS NOT LOST WHEN THE PANEL IS SHUT: the toolbar outside keeps the chips and the
            clear-all, and that row is exempt from the panel's dismiss-on-outside-press (see
            _facetOutside and data-applied-filters), so it can be used with the panel still open.
            THE CLEAR-ALL WENT BACK OUT WITH THEM. It lived here alone for one revision, on the
            argument that the rows cannot clear themselves in one press — true, and it put a filter
            control on the surface whose whole claim is that the rows ARE the filter state. Both the
            chips and the clear-all belong to the same row outside, where they survive the panel
            being shut; the count is the list button's.
            renderVals still supplies appliedTags, hasAppliedTags and facetClear, all now unread —
            the row outside builds its own from appliedTags and onClearAll. */}
        </header>

        {/* THE REGION THE PANEL'S ROWS LIVE IN, and since 19.09.26 it is one list: the Filter and
            Projects tabs that used to switch it are gone (by request: with projects in the filter
            list the toggle "is unnecessary"). */}
        <div id="library-panel" data-library-panel="1">
        {/* THE PROJECT GROUP (19.09.26, by request), first, because which project comes before what
            to leave out. Its rows are the panel's own rows (similarity: a project reads as a filter
            and a ticked one looks like any ticked filter); OR within the group, AND against the
            rest, counted against the other groups but not itself (renderVals, the Project facet).
            FIVE, THEN SHOW ALL, so twenty projects do not push the other groups off the screen
            (Hick's law, Miller's law); the control is not a row, it is the heading's column in the
            muted ink, so it cannot be taken for a project.
            EDIT, BESIDE THE HEADING, turns the same rows into the management rows the Projects tab
            held (a new-project field, then rename, export and delete per project), and Done turns
            them back: the projects are managed where they are listed. With no project yet the group
            opens on the field itself.
            data-sec for the panel's reveal like every group; data-proj-sec for the toggles that swap
            its rows (toggleProjectsEdit, toggleProjectsAll in overlays.js). */}
        <div data-sec="1" data-proj-sec="1" style={sx('padding:18px var(--page-gutter) 0')}>
          {/* The heading stays text alone: the reveal splits it into lines and restores it as markup,
              and a control inside it would go inert (the tick-box bug of 17.09). Edit stands beside
              it, at the rows' trailing edge. */}
          {/* NEW PROJECT WHILE THE FIELD IS ALL THE GROUP HOLDS (22.09.26, by request): with no project
              yet the heading names the one act here, where "Project" over "Project Name" said the same
              word twice. Once a project exists it heads the list again. A lone text child, so the
              reveal's restore cannot strand it (see split-targets in maskLines.js). */}
          <div style={sx('display:flex;align-items:center;justify-content:space-between;gap:12px;padding-bottom:8px')}>
            <span data-sec-head="1" style={sx('display:block;font-family:Neue Montreal;font-size:var(--fs-fine);letter-spacing:var(--track-flat);color:var(--on-surface-muted);padding:0 18px')}>{vals.canEditProjects ? 'Project' : 'New Project'}</span>
            {vals.canEditProjects && (
              <button type="button" data-ix="press" data-focus="chrome" aria-pressed={vals.projectsEditing} aria-label={vals.projectsEditing ? 'Done editing projects' : 'Edit projects'} onClick={vals.toggleProjectsEdit} style={sx('flex:none;background:none;border:1px solid var(--action-line);border-radius:var(--radius-pill);padding:var(--btn-pad-sm);font-family:Neue Montreal;font-size:var(--fs-body);font-weight:500;letter-spacing:var(--track-flat);color:var(--on-surface);cursor:pointer')}><TextSwap>{vals.projectsEditing ? 'Done' : 'Edit'}</TextSwap></button>
            )}
          </div>
          {vals.canEditProjects && !vals.projectsEditing ? (
            <div role="group" aria-label="Filter by project" onKeyDown={vals.onFacetListKey} style={sx('display:flex;flex-direction:column;gap:6px')}>
              {vals.projectOptions.map((o) => (
                <button key={o.key} type="button" data-sec-row="1" data-proj-extra={o.extra ? '1' : undefined} data-ex-item={o.disabled ? undefined : '1'} data-focus="chrome" aria-pressed={o.pressed} aria-disabled={o.disabled ? 'true' : undefined} aria-label={o.aria} title={o.label.length > 32 ? o.label : undefined} onClick={o.onPick} style={sx(SEC_ROW + (o.disabled ? 'cursor:default;color:var(--on-surface-muted)' : 'cursor:pointer;color:var(--on-surface)'))}>
                  <span data-row-plate="1" aria-hidden="true" style={SEC_PLATE}></span>
                  <span data-reveal="1" data-reveal-rise="1" style={sx('display:inline-flex;flex:none;overflow:hidden')}><FacetMark active={o.active} unavailable={o.disabled} /></span>
                  {/* A name may run to 60 characters, so this label may shrink and end in an ellipsis,
                      where the measured labels are short and never do. */}
                  <span data-reveal="1" style={sx('font-family:Neue Montreal;font-size:var(--fs-body);letter-spacing:var(--track-flat);white-space:nowrap;font-weight:500;flex:0 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis')}>{o.label}</span>
                  <span data-reveal="1" data-sec-count="1" style={sx('margin-inline-start:auto;font-family:Neue Montreal;font-size:var(--fs-fine);color:var(--on-surface-muted);font-variant-numeric:tabular-nums;flex:none')}>{o.count}</span>
                </button>
              ))}
              {vals.projectMore && (
                /* NOT IN THE REVEAL. The line reveal restores what it animated from markup, and a
                   label with React inside it (the swap, the chevron) would stop updating: it read
                   Show All after it had opened. It arrives with the panel instead. No aria-pressed,
                   so the list's arrow keys pass over it (onFacetListKey walks the pressable rows).
                   18px of leading padding puts its word on the heading's column; 6px over and under
                   make a 28px target. */
                <button type="button" data-proj-more="1" data-ix="press" data-focus="chrome" aria-expanded={vals.projectsAll} aria-label={vals.projectMoreAria} onClick={vals.toggleProjectsAll} style={sx('align-self:flex-start;display:inline-flex;align-items:center;margin-top:2px;padding:6px 18px;background:none;border:0;border-radius:var(--radius-pill);cursor:pointer;font-family:Neue Montreal;font-weight:500;font-size:var(--fs-body);letter-spacing:var(--track-flat);color:var(--on-surface-muted)')}>
                  <span style={sx('display:inline-flex;align-items:center;gap:6px')}><TextSwap>{vals.projectMore}</TextSwap><IconChevron size={12} turn={vals.projectsAll ? 180 : 0} /></span>
                </button>
              )}
            </div>
          ) : (<>
            {/* THE FIELD FIRST, because a panel of folders you cannot add to is a list, not a manager.
                Enter and the button do the same thing (see manage.onCreateKey) — a name typed and then
                confirmed by the keyboard should not need the mouse to land. */}
            <div data-proj-item="1">
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
                {/* THE ROWS' PLATE, SINCE 19.09.26 (by request: "input field should match the styling of
                the other elements in the drawer"). The filter rows became raised stadiums on 17.09
                (audit Q4), so both name fields in the Project group take the same plate:
                --surface-raised with the --line hairline, the rows' 37.5px (10px over and under),
                Medium, and the rows' hover to --surface-white (global.css). The create disc is 29.5
                square to stay round. The Add to Projects dialog's field is not in the drawer and is
                unchanged. The note below is the reasoning this reverses, kept for the record.
                NO RAISED FILL. All three of the app's name fields sat on --surface-raised, which is
                    a lighter plate meant to lift a surface off the page — and these sit ON a --surface
                    sheet, so the plate lifted them off nothing and read as a second ground inside the
                    first. The stadium's own hairline is what says "type here"; the fill was saying it a
                    second time, more loudly, in a panel whose whole point is that its rows are quiet.
                    THE FIELD IS A STADIUM AND ITS INSET GREW WITH IT. 11px of leading padding put the
                    placeholder against the widest point of an 18px arc; 18 clears it — and 18 is the
                    figure the rows below use too, so every piece of text inside a control on this
                    surface starts on the same column. (The toast keeps 16: it is a 48px bar with a
                    deeper arc and a leading inset chosen for it by hand.) */}
                <input data-manage-new="1" data-focus="field" type="text" maxLength={60} placeholder="Project Name" aria-label="Name a new project" onKeyDown={vals.manage.onCreateKey} style={sx("flex:1;min-width:0;background:var(--surface-raised);border:1px solid var(--line);border-radius:var(--radius-pill);padding:10px 44px 10px 18px;font-family:'Neue Montreal';font-size:var(--fs-body);font-weight:500;letter-spacing:var(--track-flat);color:var(--on-surface)")} />
                {/* Filled --on-surface, unlike the toast's outlined pair: this is the one act on the tab
                    that commits something, and fill is how this system says primary. A GLYPH CARRIES ITS
                    NAME: aria-label states the act, title hands the word to a pointer, and the swap runs
                    on it exactly as it does on every other mark now. */}
                <button type="button" data-manage-add="1" data-ix="cta" data-focus="chrome" onClick={vals.manage.onCreate} aria-label="Create project" title="Create" style={sx('position:absolute;inset-block:4px;inset-inline-end:4px;width:29.5px;display:inline-flex;align-items:center;justify-content:center;background:var(--on-surface);border:1px solid var(--on-surface);border-radius:var(--radius-pill);padding:0;color:var(--surface);cursor:pointer')}><TextSwap><IconChevronRight size={12} /></TextSwap></button>
              </div>
            </div>
            {/* THE ROW IS THE PROJECT: its name, how much is in it, and the two things you can do to it
                as a whole. The count sits INSIDE the name field (see the note on manageView.count) and
                what it paid for is the Export button — the act a folder existed for and did not have.
                Order is name → export → delete: the constructive act sits next to the thing it acts on,
                and the destructive one stays at the far edge where it is hardest to hit by accident.
                data-tg-cell on the row, so a project arrives on the same per-item stagger a facet row
                does — this panel is a list of things too, and the drawer only knows that from the hook. */}
            {!vals.manage.empty && (
            <div style={sx('display:flex;flex-direction:column;gap:8px;margin-top:8px')}>
              {vals.manage.rows.map((pr) => (
                <div key={pr.id} data-proj-item="1" style={sx('display:flex;align-items:center;gap:8px')}>
                  <span style={sx('position:relative;flex:1;min-width:0;display:flex')}>
                    {/* padding-right clears the numeral's column so a long project name runs under the
                        caret, never under the count.
                        BOTH INSETS MOVED WITH THE CORNER. The field is a stadium now, so 11px of leading
                        padding put the name against the widest point of an 18px arc and 11px of trailing
                        inset did the same to the numeral. 18 on both edges — the SAME 18 the rows in this
                        panel and both dialogs use, so a field and a row put their text on one column
                        instead of two. The padding-right follows the numeral rather than being chosen:
                        the inset, plus the digits, plus the clearance the name needs from them. */}
                    <input data-proj-name={pr.id} data-focus="field" type="text" maxLength={60} key={pr.id + '|' + pr.name} defaultValue={pr.name} onBlur={pr.onRename} onKeyDown={pr.onRenameKey} aria-label="Rename project" aria-describedby={'projn-' + pr.id} style={sx("width:100%;min-width:0;background:var(--surface-raised);border:1px solid var(--line);border-radius:var(--radius-pill);padding:10px 44px 10px 18px;font-family:'Neue Montreal';font-size:var(--fs-body);font-weight:500;letter-spacing:var(--track-flat);color:var(--on-surface)")} />
                    {/* The numeral is painted; the noun is spoken. A bare "8" announced after a project
                        name is a quantity of nothing in particular, and aria-label on a span with no
                        role is not reliably read — so the description this field points at carries the
                        whole sentence as real text, and only the digits are visible. */}
                    <span id={'projn-' + pr.id} style={sx('position:absolute;right:18px;top:50%;transform:translateY(-50%);pointer-events:none;font-family:Neue Montreal;font-size:var(--fs-fine);letter-spacing:var(--track-flat);color:var(--on-surface-muted);font-variant-numeric:tabular-nums')}>
                      <span aria-hidden="true">{pr.count}</span>
                      <span style={liveRegionStyle}>{pr.countAria}</span>
                    </span>
                  </span>
                  {/* THE FIELDS' RAISED FILL (19.09.26, by request: the icons beside the fields cannot stand
                      without a fill once the fields have one). Hover and press keep the press tier's tints,
                      the delete its red ones (global.css [data-danger]).
                      cursor written from state, not left to [data-ix]:disabled — that rule is in the
                      stylesheet and this style is inline, so a hardcoded `pointer` would outrank it and
                      the empty project's control would still invite the press it refuses. */}
                  <button type="button" data-ix="press" data-focus="chrome" disabled={!pr.canExport} aria-label={pr.exportAria} title={pr.exportTitle} onClick={pr.onExport} style={sx('flex:none;width:32px;height:32px;display:inline-flex;align-items:center;justify-content:center;background:var(--surface-raised);border:1px solid var(--action-line);border-radius:var(--radius-pill);color:var(--on-surface);padding:0;cursor:' + (pr.canExport ? 'pointer' : 'default'))}>
                    <TextSwap><IconExport /></TextSwap>
                  </button>
                  <button type="button" data-danger="1" data-ix="press" data-focus="chrome" aria-label={pr.deleteAria} onClick={pr.onDelete} style={sx('flex:none;width:32px;height:32px;display:inline-flex;align-items:center;justify-content:center;background:var(--surface-raised);border:1px solid var(--action-line);border-radius:var(--radius-pill);color:var(--on-surface);cursor:pointer')}>
                    <TextSwap><IconTrash /></TextSwap>
                  </button>
                </div>
              ))}
            </div>
            )}
          </>)}
        </div>

        {/* NOTHING TO FILTER YET is a state this panel could not previously be in: the trigger used
            to require a facet to exist before it appeared at all. It can now be opened for the
            Projects tab alone, so the Filter tab has to be able to say that there is nothing here.
            The why ("filters arrive with the first palette you save") went on 17.09.26, audit H5,
            by request. */}
        {!vals.showFacet && (
          <div data-tg-sec="1" role="status" style={sx('display:flex;flex-direction:column;gap:8px;padding:20px var(--page-gutter) 26px')}>
            <span style={sx("font-family:'Neue Montreal';font-weight:500;font-size:var(--fs-lead);color:var(--on-surface)")}>Nothing to filter yet</span>
          </div>
        )}

        {/* ACCESSIBILITY — a facet, and the first one, because "can I build with this?" outranks
            "what mood is it?". Exhaustive: every palette holds exactly one state, so the group
            always partitions the archive. OR within the group (a palette cannot be two states, so
            AND would be unsatisfiable); AND against tags. Same checkbox and count as every facet
            row, and since 22.09.26 every state stays, disabled at 0 when nothing here has it. */}
        {vals.hasA11yOptions && (
          /* data-sec / data-sec-head / data-sec-row / data-reveal / data-row-rule: the mobile story's
             section hooks, read by overlays.js _syncLibraryReveal — the eyebrow rises out of its
             mask, then row by row the mark, label and count rise and the hairline draws, on scroll
             inside the drawer. Not data-tg-sec: the panel's own block fade would otherwise compose
             with the reveal on the same element. */
          <div data-sec="1" style={sx('padding:18px var(--page-gutter) 0')}>
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
            <span data-sec-head="1" style={sx('display:block;font-family:Neue Montreal;font-size:var(--fs-fine);letter-spacing:var(--track-flat);color:var(--on-surface-muted);padding:0 18px 8px')}>Text Usability</span>
            <div role="group" aria-label="Filter by text usability" onKeyDown={vals.onFacetListKey} style={sx('display:flex;flex-direction:column;gap:6px')}>
              {vals.a11yOptions.map((o) => (
                <button key={o.key} type="button" data-sec-row="1" data-ex-item={o.disabled ? undefined : '1'} data-focus="chrome" aria-pressed={o.pressed} aria-disabled={o.disabled ? 'true' : undefined} aria-label={o.aria} title={o.title} onClick={o.onPick} style={sx(SEC_ROW + (o.disabled ? 'cursor:default;color:var(--on-surface-muted)' : 'cursor:pointer;color:var(--on-surface)'))}>
                  {/* the row's plate (17.09.26, audit Q4), there from the first frame: the pill is
                      established and only its contents arrive (by request: no fade, no wipe). Its
                      fill, edge and hover are global.css [data-row-plate]. */}
                  <span data-row-plate="1" aria-hidden="true" style={SEC_PLATE}></span>
                  {/* data-reveal-rise: the tick box rises through this box's clip on its row's beat,
                      as the label and count rise through their line masks (pageReveal.js). */}
                  <span data-reveal="1" data-reveal-rise="1" style={sx('display:inline-flex;flex:none;overflow:hidden')}><FacetMark active={o.active} unavailable={o.disabled} /></span>
                  <span data-reveal="1" style={measuredLabelStyle}>{o.label}</span>
                  {/* THE COUNT IS A COLUMN AGAIN. It sat against its label — "count belongs to the
                      label, so it sits against it" — and that is true of the pairing and false of
                      the reading: with the label flex:none the number landed wherever the word
                      happened to end, so eleven rows put eleven figures at eleven different x
                      positions and the one thing you scan a facet list for could not be scanned.
                      margin-inline-start:auto sends it to the row's trailing edge, tabular-nums
                      keeps the digits on one grid, and the row's own --btn-pad-lg puts every number
                      on the same 16px inset the rest of the panel uses. */}
                  <span data-reveal="1" data-sec-count="1" style={sx('margin-inline-start:auto;font-family:Neue Montreal;font-size:var(--fs-fine);color:var(--on-surface-muted);font-variant-numeric:tabular-nums;flex:none')}>{o.count}</span>
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
          <div key={g.id} data-sec="1" style={sx('padding:14px var(--page-gutter) 0')}>
            <span data-sec-head="1" style={sx('display:block;font-family:Neue Montreal;font-size:var(--fs-fine);letter-spacing:var(--track-flat);color:var(--on-surface-muted);padding:0 18px 8px')}>{g.label}</span>
            <div role="group" aria-label={'Filter by ' + g.label.toLowerCase()} onKeyDown={vals.onFacetListKey} style={sx('display:flex;flex-direction:column;gap:6px')}>
              {g.options.map((o) => (
                <button key={o.key} type="button" data-sec-row="1" data-ex-item={o.disabled ? undefined : '1'} data-focus="chrome" aria-pressed={o.pressed} aria-disabled={o.disabled ? 'true' : undefined} aria-label={o.aria} onClick={o.onToggle} style={sx(SEC_ROW + (o.disabled ? 'cursor:default;color:var(--on-surface-muted)' : 'cursor:pointer;color:var(--on-surface)'))}>
                  {/* the row's plate (17.09.26, audit Q4), there from the first frame: the pill is
                      established and only its contents arrive (by request: no fade, no wipe). Its
                      fill, edge and hover are global.css [data-row-plate]. */}
                  <span data-row-plate="1" aria-hidden="true" style={SEC_PLATE}></span>
                  {/* data-reveal-rise: the tick box rises through this box's clip on its row's beat,
                      as the label and count rise through their line masks (pageReveal.js). */}
                  <span data-reveal="1" data-reveal-rise="1" style={sx('display:inline-flex;flex:none;overflow:hidden')}><FacetMark active={o.active} unavailable={o.disabled} /></span>
                  <span data-reveal="1" style={measuredLabelStyle}>{o.label}</span>
                  <span data-reveal="1" data-sec-count="1" style={sx('margin-inline-start:auto;font-family:Neue Montreal;font-size:var(--fs-fine);color:var(--on-surface-muted);font-variant-numeric:tabular-nums;flex:none')}>{o.count}</span>
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* BACKUP, THE LAST GROUP (22.09.26, UX audit, by request "fix all four"). Back Up and Restore
            stood in every masthead beside New Palette since 15.09, and on the document pages too: a
            rare act given the primary's weight on every screen. They act on the Library as a whole,
            which is what this panel is the one door for, so they are its last group. Rows in the
            group's own grammar, but with no tick box: they act, they do not narrow, so they must not
            look like the filters above them. The glyph at the row's end says which way the file goes.
            Back Up only when there is something to back up; Restore always, because an empty library
            is exactly when it is needed. The file input stays in the masthead, which is always
            mounted under the tool; Restore's dialog opens above this panel (157). */}
        <div data-sec="1" style={sx('padding:14px var(--page-gutter) calc(20px + var(--consent-foot, 0px))')}>
          <span data-sec-head="1" style={sx('display:block;font-family:Neue Montreal;font-size:var(--fs-fine);letter-spacing:var(--track-flat);color:var(--on-surface-muted);padding:0 18px 8px')}>Backup</span>
          <div role="group" aria-label="Backup" style={sx('display:flex;flex-direction:column;gap:6px')}>
            {vals.showProjectsBar && (
              <button type="button" data-sec-row="1" data-focus="chrome" onClick={vals.backUpLibrary} aria-label="Back up your whole library to a file" style={sx(SEC_ROW + 'cursor:pointer;color:var(--on-surface)')}>
                <span data-row-plate="1" aria-hidden="true" style={SEC_PLATE}></span>
                <span data-reveal="1" style={measuredLabelStyle}>Back Up</span>
                <span data-reveal="1" style={sx('margin-inline-start:auto;display:inline-flex;color:var(--on-surface-muted)')}><IconExport size={16} /></span>
              </button>
            )}
            <button type="button" data-sec-row="1" data-focus="chrome" onClick={vals.onRestore} aria-label="Restore palettes from a backup file" style={sx(SEC_ROW + 'cursor:pointer;color:var(--on-surface)')}>
              <span data-row-plate="1" aria-hidden="true" style={SEC_PLATE}></span>
              <span data-reveal="1" style={measuredLabelStyle}>Restore</span>
              <span data-reveal="1" style={sx('margin-inline-start:auto;display:inline-flex;color:var(--on-surface-muted)')}><IconImport size={16} /></span>
            </button>
          </div>
        </div>

        {/* THE CHARACTER TRAITS DISCLOSURE WAS HERE and has been removed by request: the
            heading-and-chevron row that opened the interpretive facets. The section it opened (the
            trait search, the Most used / A–Z sort, the trait rows and their Show All) could no
            longer be reached and still wore the old square style, so it went on 17.09.26 (audit H3
            and E9) with the state and view-model only it read. Filtering by trait is still reached
            from a palette's own tags; the applied chips remove it. */}


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
    /* 157, for the contrast drawer's reasons (see its note). This one is 480px, so it met the mark
       in any window narrower than 1125px; it sat at 120. */
    <div style={sx('position:fixed;inset:0;z-index:157')}>
      <div data-hx-backdrop="1" onClick={vals.closeHarmony} style={sx('position:absolute;inset:0;background:color-mix(in srgb, var(--scrim) 55%, transparent);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)')}></div>
      <div data-hx-drawer="1" data-harmony-dialog="1" data-lenis-prevent="1" role="dialog" aria-modal="true" aria-label={'Colour harmonies for ' + harmony.hex} onKeyDown={vals.trapHarmony} style={sx('position:absolute;right:0;top:0;bottom:0;width:480px;max-width:94vw;background:var(--surface);border-left:1px solid var(--line-strong);border-radius:var(--radius-surface) 0 0 var(--radius-surface);box-shadow:var(--shadow-surface);display:flex;flex-direction:column;overflow-y:auto')}>
        <header data-hx-sec="1" style={sx('display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:20px var(--page-gutter) 0')}>
          <div style={sx('display:flex;flex-direction:column;gap:9px;min-width:0')}>
            <span style={sx('font-family:Neue Montreal;font-size:var(--fs-label);letter-spacing:var(--track-flat);color:var(--on-surface-muted)')}>Colour Harmonies</span>
            <div style={sx('display:flex;align-items:center;gap:11px')}>
              <span aria-hidden="true" style={harmony.swatchStyle}></span>
              <h2 data-drawer-split="1" style={sx("margin:0;font-family:'Neue Montreal';font-weight:500;font-size:var(--fs-subtitle);letter-spacing:var(--track-title);color:var(--on-surface)")}>{harmony.hex}</h2>
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
          {/* THE CELL TIER (17.09.26, audit E2). Each swatch was an HBtn whose hover and press were a
              brightness filter set from JS, so they cut in with no transition. The colour now sits on
              a wrapper and the button over it takes data-ix="cell": the tier's 12% and 20% tints of
              the button's own ink (the swatch's black or white), eased on the contract like the
              value rows. The drawer's hooks (data-hx-cell, data-ov-band) go on the wrapper, because
              the band reveal and the model crossfade have to move the colour, not only the words. */}
          {/* 6px, THE BANDS' OWN GAP. It was 1px — a hairline seam, which is what a row of square
              tiles wants and the opposite of what a row of rounded ones does: at 12px corners the
              adjacent curves would have met across a single pixel and read as a printing error.
              Same figure as the result stage's swatch group, because this is the same row. */}
          <div style={sx('display:flex;gap:6px;width:100%')}>
            {harmony.cells.map((cell, ci) => (
              <div key={ci} data-hx-cell="1" data-ov-band="1" style={cell.wrapStyle}>
                <button type="button" data-ix="cell" data-focus="value" onClick={cell.onCopy} aria-label={cell.aria} style={cell.style}>
                  <span style={sx('display:flex;min-height:16px;align-items:flex-start')}>
                    {cell.badge ? <span aria-hidden="true" style={cell.badgeStyle}>{cell.badge}</span> : null}
                  </span>
                  <CopySwap copied={cell.copied} value={cell.hex} style={sx('font-size:var(--fs-fine); letter-spacing:var(--track-flat); font-family: Neue Montreal')} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* THE ADOPTION PATH. Save as palette is the filled act; Copy harmony is the whole-set
            version of what a swatch already does and stays quiet beside it. Both act on the model
            currently shown, which is why the label names it. */}
        {/* The two acts take the models' type (17.09.26, by request): --fs-body at Medium, in the case
            their labels are written in, as the dialogs' buttons and the drawer's own pills read.
            BUILT ON Button (21.09.26, by request: "every button that is built on the b006 should match
            the design"). They were ordinary buttons drawn to look like one — --btn-pad-md inside a 1px
            border — and had drifted to 35.5px against the 31.5px every other act stands at. As Buttons
            they take its inset, its hover and its two tiers instead of restating them, and the row
            carries the dialogs' voice like every other pair of acts. data-hx-cell keeps them in the
            drawer's arrival. */}
        <div data-hx-sec="1" data-voice="banner" style={sx('display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:18px var(--page-gutter) 0')}>
          <Button data-hx-cell="1" data-emphasis="primary" onClick={harmony.onUse} aria-label={harmony.useAria} style={CONSENT_BTN_TYPE} label={<span style={sx('display:flex;align-items:center;height:16px')}><ButtonText>Save as Palette</ButtonText></span>} />
          <Button data-hx-cell="1" data-emphasis="secondary" onClick={harmony.onCopyAll} aria-label={harmony.copyAllAria} style={CONSENT_BTN_TYPE} label={<span style={sx('display:flex;align-items:center;height:16px')}><ButtonText>{harmony.copyAllLabel}</ButtonText></span>} />
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
/* ONE ROW FOR A COPY OR A DOWNLOAD (22.09.26). The label rides the hover swap in the panel's row voice
   (13px Medium, audit U3); the right slot stacks the format tag and the confirmation in one grid cell,
   so the row cannot move when it confirms — the wider of the two sets the slot, and only their opacity
   changes. The confirmation is Copy's own recipe: "Copied" or "Downloaded" in the row voice, sliding
   4px in as it fades on --dur-chrome, always mounted. FOCUS IS PUT BACK ON THE ROW one frame after the
   pick, because copy() mounts, selects and removes a textarea, which drops focus on the body — a keyboard
   reader would be left in an open dialog with nothing focused. */
// The library drawer's section-head voice, inset to the rows' text edge.
const EX_GROUP_HEAD = sx('display:block;font-family:Neue Montreal;font-size:var(--fs-fine);letter-spacing:var(--track-flat);color:var(--on-surface-muted);padding:0 18px');
function ExportRow({ f }) {
  return (
    <button type="button" data-ex-item="1" data-focus="chrome"
      onClick={(e) => { const el = e.currentTarget; f.onPick(); requestAnimationFrame(() => { try { el.focus(); } catch (err) { } }); }}
      onMouseEnter={f.onEnter} onMouseLeave={f.onLeave} onFocus={f.onFocus} onBlur={f.onBlur}
      aria-label={f.label + (f.done ? ', ' + f.doneWord.toLowerCase() : '')} style={f.style}>
      <span style={sx('font-size:var(--fs-body); font-weight:500; letter-spacing:var(--track-flat)')}><TextSwap>{f.label}</TextSwap></span>
      <span style={sx('display:grid;align-items:center;justify-items:end;flex:none')}>
        <span style={{ ...f.extStyle, gridArea: '1 / 1', transition: 'opacity var(--dur-chrome) var(--ease-standard)', opacity: f.done ? 0 : 1 }}>{f.ext || ''}</span>
        <span aria-hidden="true" data-done-mark="1" style={{ ...sx('grid-area:1/1;display:inline-flex;align-items:center;font-family:Neue Montreal;font-size:var(--fs-body);font-weight:500;letter-spacing:var(--track-flat);color:var(--on-surface);white-space:nowrap;transition:opacity var(--dur-chrome) var(--ease-standard),transform var(--dur-chrome) var(--ease-standard)'), opacity: f.done ? 1 : 0, transform: f.done ? 'translateX(0)' : 'translateX(4px)' }}>{f.doneWord}</span>
      </span>
    </button>
  );
}

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
      <div data-ex-backdrop="1" data-modal-backdrop="1" onClick={vals.closeExport} style={sx('position:absolute;inset:0;background:color-mix(in srgb, var(--scrim) 55%, transparent);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)')}></div>
      <div data-export-dialog="1" data-lenis-prevent="1" role="dialog" aria-modal="true" aria-label={ex.aria} onKeyDown={vals.trapExport} style={sx('position:relative;width:440px;max-width:94vw;max-height:88vh;overflow-y:auto;background:var(--surface);border:1px solid var(--line-strong);border-radius:var(--radius-surface);box-shadow:var(--shadow-surface);display:flex;flex-direction:column')}>
        <header style={sx('display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:20px var(--page-gutter) 0')}>
          <div style={sx('display:flex;flex-direction:column;gap:4px;min-width:0')}>
            <span style={sx('font-family:Neue Montreal;font-size:var(--fs-label);letter-spacing:var(--track-flat);color:var(--on-surface-muted)')}>{ex.kicker}</span>
            <h2 style={sx("margin:0;font-family:'Neue Montreal';font-weight:500;font-size:var(--fs-subtitle);letter-spacing:var(--track-title);color:var(--on-surface);white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{ex.name}</h2>
          </div>
          {/* The app's one close mark, at the 32px circle the library panel and the project picker
              both use. This was the last surface still spelling the word. */}
          <button type="button" data-ix="press" data-focus="chrome" onClick={vals.closeExport} aria-label="Close export options" title="Close" style={sx('flex:none;width:32px;height:32px;display:inline-flex;align-items:center;justify-content:center;background:none;border:1px solid var(--action-line);border-radius:var(--radius-pill);padding:0;color:var(--on-surface);cursor:pointer')}><TextSwap><IconClose /></TextSwap></button>
        </header>

        {/* No lead (19.09.26, audit X4, by request: "Delete the copy. We are overexplaining too many
            places"). "Every export contains HEX, RGB and HSL. The CMYK shown on screen is an
            approximation, so it is never included." stood here; the files carry what they carry. */}

        {/* COPY, THEN DOWNLOAD (22.09.26, by request: "fold copy into export"). Two groups under the
            drawers' section-head voice, because CSS Custom Properties appears in both — once for the
            clipboard, once as a file — and only the group says which. Copy first: it is the act taken
            most, and the one that asks for nothing further. A folder's export has no Copy group.
            THE GROUP IS SAID TO A SCREEN READER TOO: two rows share the name CSS Custom Properties, so
            each group is a role="group" named by its visible label, announced on the way in. One export
            dialog is ever mounted, so the two ids are unique. 18px between the groups, 6 inside them. */}
        <div style={sx('padding:16px var(--page-gutter) 0;display:flex;flex-direction:column;gap:6px')}>
          {ex.copies.length > 0 ? (<>
            <div role="group" aria-labelledby="ex-copy-head" style={sx('display:flex;flex-direction:column;gap:6px')}>
              <span id="ex-copy-head" data-ex-group="1" style={EX_GROUP_HEAD}>Copy</span>
              {ex.copies.map((f, fi) => (<ExportRow key={fi} f={f} />))}
            </div>
            <div role="group" aria-labelledby="ex-download-head" style={sx('display:flex;flex-direction:column;gap:6px;padding-top:12px')}>
              <span id="ex-download-head" data-ex-group="1" style={EX_GROUP_HEAD}>Download</span>
              {ex.formats.map((f, fi) => (<ExportRow key={fi} f={f} />))}
            </div>
          </>) : ex.formats.map((f, fi) => (<ExportRow key={fi} f={f} />))}
        </div>

        {/* 22px OF BOTTOM PADDING, INHERITED RATHER THAN INVENTED. The line under this row carried
            it — `padding:14px var(--page-gutter) 22px` on its own wrapper — so removing that line
            took the dialog's last piece of breathing room with it and stood the switch on the sheet's
            bottom edge. Same figure, moved up one row. */}
        <div style={sx('display:flex;align-items:center;justify-content:space-between;gap:16px;padding:18px var(--page-gutter) 22px')}>
          <div style={{ minWidth: 0 }}>
            {/* The rows' voice, 13px Medium (19.09.26, audit W4, by request): it names the switch beside it,
                as Passing Only's words name its control, and at 12px Regular it read as description. */}
            <div style={sx("font-family: 'Neue Montreal'; font-size:var(--fs-body); font-weight:500; letter-spacing:var(--track-flat); color: var(--on-surface)")}>Semantic Scaffold</div>
            {/* THE NOTE UNDER IT WENT (19.09.26, audit X4, by request: "We are overexplaining too many
                places"). "Adds six suggested roles per palette, background to text." stood here, so a
                reader met the six roles in the file knowing they were suggestions. That fact is not
                dropped: the switch's name and title carry it, the way the Text usability rows carry
                theirs, and the visible line goes. */}
          </div>
          {/* THE THEME SWITCH, NOT A COPY OF IT (19.09.26, audit U5, by request: "drop the off to match
              the theme switch"). It was a ringed pill holding its own 28x14 track and the word OFF;
              it is the masthead's switch now, the same SwitchTrack in the same unringed Button,
              and the label on the left names what it turns on.
              data-switch="fill": ITS STATE IS IN THE FILL TOO (same day, by request: "the active/inactive
              state needs to be more clear"). On the dialog's plain surface the glass track barely
              showed and position alone carried the state; see [data-switch="fill"] in global.css. */}
          <Button data-emphasis="secondary" data-switch="fill" data-focus="chrome" role="switch" aria-checked={ex.semanticChecked} onClick={vals.toggleExportSemantic} aria-label="Semantic scaffold: add six suggested roles per palette, background to text" title="Adds six suggested roles per palette, background to text" label={<SwitchTrack />} />
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
      <div data-recognise-dialog="1" data-lenis-prevent="1" role="dialog" aria-modal="true" aria-label="This image has been extracted before" onKeyDown={vals.trapRecognise} style={sx('position:relative;width:420px;max-width:94vw;max-height:86vh;overflow-y:auto;background:var(--surface);border:1px solid var(--line-strong);border-radius:var(--radius-surface);box-shadow:var(--shadow-surface);display:flex;flex-direction:column')}>
        {/* NO EYEBROW (17.09.26, audit D1, by request): "Already extracted" stood over the name and
            said what the line under it says. The other dialogs keep theirs, which name the action.
            With the name alone, the header centres it on the close mark. */}
        <header style={sx('display:flex;align-items:center;justify-content:space-between;gap:12px;padding:20px var(--page-gutter) 0')}>
          <div style={sx('display:flex;flex-direction:column;min-width:0')}>
            <h2 style={sx("margin:0;font-family:'Neue Montreal';font-weight:500;font-size:var(--fs-subtitle);letter-spacing:var(--track-title);color:var(--on-surface);white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{r.name}</h2>
          </div>
          {/* THE APP'S ONE CLOSE MARK (16.09.26, by request: this dialog and the restore dialog were
              the last two still spelling "Cancel" in a square box). The 32px circle the copy, export
              and project dialogs use, with the press tier's hover and press. It still means cancel:
              closeRecognise keeps the existing palette and creates nothing. */}
          <button type="button" data-ix="press" data-focus="chrome" onClick={vals.closeRecognise} aria-label="Keep the existing palette and create nothing" title="Close" style={sx('flex:none;width:32px;height:32px;display:inline-flex;align-items:center;justify-content:center;background:none;border:1px solid var(--action-line);border-radius:var(--radius-pill);padding:0;color:var(--on-surface);cursor:pointer')}><TextSwap><IconClose /></TextSwap></button>
        </header>
        <div style={sx('padding:14px var(--page-gutter) 0;display:flex;flex-direction:column;gap:12px')}>
          {/* --fs-body, one step up from the --fs-detail the copy and export dialogs set their opening
              line in (17.09.26, audit D1, by request): with no eyebrow, this line carries the news. */}
          <span style={sx("font-family:'Neue Montreal';font-size:var(--fs-body);line-height:1.5;color:var(--on-surface-muted);text-wrap:pretty")}>{r.line}</span>
          {/* the palette itself, drawn as the archive draws it — so the claim can be checked, not just read */}
          <span aria-hidden="true" style={sx('display:flex;width:100%;height:26px;border:1px solid var(--line)')}>
            {r.strip.map((b, i) => (<span key={i} style={b.style}></span>))}
          </span>
          {/* "Saved just now" stood here and went on 17.09.26 (by request). */}
        </div>
        {/* THE PAIR, AS THE PROJECT PICKER SETS ITS OWN (16.09.26, by request). Two full-width slabs
            stood here, a filled square and an outlined one, the last of their kind in a dialog.
            Button at the app's two emphases now, right-aligned under the rule: the filled tier
            for the act this dialog recommends, the unfilled one for the other way, in the order the
            picker's Cancel and Confirm take. The note stays under the pair it explains, in
            --fs-fine, the size the export dialog's switch explains itself in. */}
        {/* The note under the pair ("Extraction is repeatable…") went on 17.09.26 (by request); the
            button's accessible name still says what a second extraction does. */}
        <div data-voice="banner" style={sx('padding:18px var(--page-gutter) 22px;margin-top:10px;border-top:1px solid var(--line);display:flex;align-items:center;justify-content:flex-end;flex-wrap:wrap;gap:10px')}>
          {/* "Extract Again" (17.09.26, by request: "anyway" went). Not "as a variation": extraction is
              deterministic as of this deploy, so a second run of the same image returns the same
              colours. This adds a separate entry; it does not produce a different palette. */}
          <Button data-emphasis="secondary" onClick={vals.recogniseVariation} aria-label={r.variationAria} style={CONSENT_BTN_TYPE} label={<span style={sx('display:flex;align-items:center;height:16px')}><ButtonText>Extract Again</ButtonText></span>} />
          <Button data-emphasis="primary" onClick={vals.recogniseOpen} aria-label={r.openAria} style={CONSENT_BTN_TYPE} label={<span style={sx('display:flex;align-items:center;height:16px')}><ButtonText>Open Existing Palette</ButtonText></span>} />
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
      <div data-assign-dialog="1" data-lenis-prevent="1" role="dialog" aria-modal="true" aria-label="Add to projects" onKeyDown={vals.trapAssign} style={sx('position:relative;width:400px;max-width:94vw;max-height:86vh;overflow-y:auto;background:var(--surface);border:1px solid var(--line-strong);border-radius:var(--radius-surface);box-shadow:var(--shadow-surface);display:flex;flex-direction:column')}>
        <header style={sx('display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:20px var(--page-gutter) 0')}>
          <div style={sx('display:flex;flex-direction:column;gap:4px;min-width:0')}>
            <span style={sx('font-family:Neue Montreal;font-size:var(--fs-label);letter-spacing:var(--track-flat);color:var(--on-surface-muted)')}>Add to Projects</span>
            <h2 style={sx("margin:0;font-family:'Neue Montreal';font-weight:500;font-size:var(--fs-subtitle);letter-spacing:var(--track-title);color:var(--on-surface);white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{assign.name}</h2>
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
            /* data-ex-item and the swap (17.09.26, audit E3): the export rows' press feedback and their
               label swap, so the two lists answer a pointer the same way. data-assign-row carries the
               ellipsis into the swap and eases the selected edge (global.css). */
            <button key={o.key} type="button" role="checkbox" aria-checked={o.checked} data-ex-item="1" data-assign-row="1" data-focus="chrome" onClick={o.onPick} onMouseEnter={o.onEnter} onMouseLeave={o.onLeave} onFocus={o.onFocus} onBlur={o.onBlur} aria-label={o.aria} style={o.style}>
              {/* THE LIBRARY PANEL'S TICK BOX (19.09.26, audit U4, by request: "use the panel tick box").
                  Choosing projects is one act in two places, and it wore two marks: a tick box there,
                  an ink ring and the word ADDED here. The ring stays, as the panel's own ticked rows
                  carry it; the word went with the box that replaces it. */}
              <FacetMark active={o.current} />
              {/* The panel's row voice, 13px Medium and flat (19.09.26, audit U3, by request). */}
              <span style={sx("min-width:0;font-family:'Neue Montreal';font-size:var(--fs-body);font-weight:500;letter-spacing:var(--track-flat);color:var(--on-surface);white-space:nowrap;overflow:hidden")}><TextSwap>{o.label}</TextSwap></span>
            </button>
          ))}
          {/* The empty case, reachable since the Unfiled pseudo-row was removed (renderVals.js).
              Not a live region: it is replaced by the first real row the moment a project exists,
              and the create flow announces that itself. */}
          {assign.options.length === 0 && (
            <p style={sx("margin:0;padding:2px 0 6px;font-family:'Neue Montreal';font-size:var(--fs-body);line-height:1.5;color:var(--on-surface-muted)")}>{assign.emptyLine}</p>
          )}
        </div>
        <div style={sx('padding:16px var(--page-gutter) 18px;margin-top:8px;border-top:1px solid var(--line)')}>
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
          <label style={sx('font-family:Neue Montreal;font-size:var(--fs-label);letter-spacing:var(--track-flat);color:var(--on-surface-muted);display:block;margin:12px 0 8px')}>New Project</label>
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
              control and not only above it.
              AND THE ROWS' PLATE (19.09.26, audit U2, by request): the raised fill and the --line
              hairline of the rows above it, and their 13px Medium, as the panel's field took its own
              rows' on the same day. It stood on the page colour inside a 48% ink edge. Its hover,
              focus and placeholder are the panel field's rules in global.css. */}
          <div style={sx('position:relative;display:flex')}>
            <input data-assign-new="1" data-focus="field" type="text" maxLength={60} placeholder="Project Name" aria-label="Name a new project" onKeyDown={assign.onCreateKey} style={sx("flex:1;min-width:0;background:var(--surface-raised);border:1px solid var(--line);border-radius:var(--radius-pill);padding:11px 44px 11px 18px;font-family:'Neue Montreal';font-size:var(--fs-body);font-weight:500;letter-spacing:var(--track-flat);color:var(--on-surface)")} />
            <button type="button" data-ix="cta" data-focus="chrome" onClick={assign.onCreate} aria-label={assign.createAria} title="Create" style={sx('position:absolute;inset-block:4px;inset-inline-end:4px;width:32px;display:inline-flex;align-items:center;justify-content:center;background:var(--on-surface);border:1px solid var(--on-surface);border-radius:var(--radius-pill);padding:0;color:var(--surface);cursor:pointer')}><TextSwap><IconChevronRight size={12} /></TextSwap></button>
          </div>
          {/* THE COMMIT PAIR. The picker is a draft now (see pickAssign), so it needs a way to say
              yes and a way to walk away, and the two have to read as a pair rather than as one
              button beside a close mark. Button at the app's two emphases: the filled tier for
              the act that writes, the unfilled one for the way out — the same pairing the export and
              restore dialogs already use, so a reader who has confirmed anything else in this app
              knows which is which without being told.
              Cancel is a real cancel: closeAssign drops the pending set, so nothing reaches the
              archive. The X in the header does the same thing, deliberately — a reader who treats it
              as a dismiss gets a dismiss, not a silent save. */}
          {/* A RULE, NOT MORE SPACE, and this is the case that earns one. The field above creates a
              project; the pair below commits the whole picker — two different acts, and stacked with
              only a gap between them the buttons read as the field's own controls, as though Done
              submitted the name. Space alone cannot fix that here: the gap would have to grow past
              the dialog's own rhythm before the grouping flipped, and the dialog is already tight.
              --line, the same hairline the list rows and the drawer sections rule with. */}
        </div>
        {/* THE FOOTER IS A SIBLING OF THE FIELD BLOCK, NOT ITS CHILD, and that is the whole reason
            the rule reaches both edges. Nested inside, it inherited the gutter and drew a rule that
            stopped short of the sheet on both sides — which reads as an underline belonging to the
            field above it, the exact grouping the rule was added to break. Carrying --page-gutter
            itself puts the rule edge to edge and the buttons back on the same inline edge as
            everything above, the same construction the restore dialog's footer uses. */}
        <div data-voice="banner" style={sx('display:flex;align-items:center;justify-content:flex-end;gap:10px;padding:18px var(--page-gutter) 22px;border-top:1px solid var(--line)')}>
          <Button data-emphasis="secondary" onClick={vals.closeAssign} aria-label="Cancel, leaving the projects unchanged" style={CONSENT_BTN_TYPE} label={<span style={sx('display:flex;align-items:center;height:16px')}><ButtonText>Cancel</ButtonText></span>} />
          {/* No check before the word (17.09.26, by request): the word says it; the glyph repeated it.
              DONE, NOT CONFIRM (18.09.26, by request). The act is unchanged — this still commits
              the pending set and Cancel still drops it — so the spoken name keeps the visible word
              first and says what it saves, the way Cancel's says what it leaves. */}
          <Button data-emphasis="primary" onClick={vals.confirmAssign} aria-label={'Done, saving the projects for ' + assign.name} style={CONSENT_BTN_TYPE} label={<span style={sx('display:flex;align-items:center;height:16px')}><ButtonText>Done</ButtonText></span>} />
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

/* THE TOAST AND THE NOTICE, AS COMPONENTS (15.09.26). They were written inline in the tool's return, which
   was their only home while nothing that reports through them could happen anywhere else. Back Up and
   Restore now stand in the documents' masthead too, and Restore reports through the notice (a file that
   could not be read, the summary once it lands), so both branches render these. Lifted verbatim. */
function ToastLayer({ vals }) {
  return (
    <>
          {/* THE LANE HOLDS THE PLACE AND THE LAYER (MessageLane below, 19.09.26). Its z-index is the toast's:
              158, ABOVE THE PANEL THAT RAISES IT. At 130 the toast sat under the library panel (156)
              and under a project export stacked on it (157), so deleting a project from the Projects tab
              put the confirmation, and the only route back from it, behind the surface you were standing
              on. A status you cannot see is not a status, and an Undo you cannot reach is a deletion
              without one. Still below the wipe (160), the lightbox (170) and the loader (190): those are
              whole-screen states, and a bar reporting one act does not outrank them. */}
          {vals.hasToast && (
            <>
              {/* GLASS SINCE 19.09.26 (by request): the pane, its blur and its hairline are in
                  global.css ([data-toast], shared with the notice); the surface shadow went with the
                  solid plate. FULLY ROUND, AND THE PAGE GUTTER FROM THE BOTTOM EDGE (17.09.26, audits
                  D1, D2 and C9, by request): it took 18px for one round and went back to the stadium.
                  The note below is the stadium's.
                  A STADIUM, LIKE EVERY OTHER FLOATING SURFACE THE TOOL PUTS OVER THE STAGE. It was the
                  last square bar left: it arrives over a result view whose actions, traits and badges
                  are all pills, and a hard-cornered plate reads as a different system rather than as
                  the same one speaking. The corner clamps to half the bar's height, so it stays a
                  stadium whatever the message length does to its width.
                  8px ALL ROUND, 16 ON THE LEADING EDGE. The trailing side is 8 because what sits there
                  is a bordered control that carries its own inset; the leading side holds bare text
                  against the widest point of a 24px arc, and 8px of it read as the sentence crowding
                  the curve. padding-inline-start, not padding-left: the asymmetry is about the reading
                  edge, so it should follow the reading direction rather than the screen's. */}
              <div data-toast="1" role="status" aria-live="polite" style={sx('display:flex;align-items:center;gap:16px;color:var(--on-surface);border-radius:var(--radius-pill);padding:8px;padding-inline-start:16px;pointer-events:auto')}>
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
                    drawn at the same 28px circle as the dismiss beside it (30 until 17.09.26, audit C3: 28 is
                    the notice's size, and one close mark has one size), so the pair reads as two
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
                  <button type="button" data-undo-btn="1" data-ix="press" data-focus="chrome" onClick={vals.undoDelete} aria-label={vals.undoAria} title="Undo"
                    style={sx('width:28px;height:28px;flex:none;display:inline-flex;align-items:center;justify-content:center;background:none;border:1px solid var(--action-line);border-radius:var(--radius-pill);padding:0;color:var(--on-surface);cursor:pointer')}><TextSwap><IconUndo /></TextSwap></button>
                  {/* The toast no longer times out (it holds an action — see the note in overlays.js),
                      so letting the undo go needs a control of its own. Icon-only, so it carries a name;
                      a 28px disc clears the 24px hit floor. */}
                  <button type="button" data-ix="press" data-focus="chrome" aria-label={vals.dismissAria} onClick={vals.onDismissToast} style={sx('width:28px;height:28px;flex:none;display:inline-flex;align-items:center;justify-content:center;background:none;border:1px solid var(--action-line);border-radius:var(--radius-pill);padding:0;color:var(--on-surface);cursor:pointer')}><TextSwap><IconClose /></TextSwap></button>
                </div>
              </div>
            </>
          )}
    </>
  );
}
/* ONE LANE FOR BOTH MESSAGES, AT THE BOTTOM CENTRE (19.09.26, audit U7, by request: "go with bottom
   center"). The notice stood at the bottom left and the deletion toast at the bottom centre, the same
   glass stadium in two places, so the eye had two spots to learn. Both stand here now in one column:
   the toast at the foot, where it always was, and a notice above it. A notice coming or going leaves
   the toast where it is; the toast coming or going moves the notice by its own height and the gap,
   and the notice glides there (_noticeRide in overlays.js) rather than jumping.
   The notice was at 128 on its own; it shares the toast's 158 now, which clears the library panel
   (156) it can be raised from and stays under the wipe, the lightbox and the loader.
   IT STANDS CLEAR OF THE BOTTOM BARS (19.09.26, audit W1, by request). A notice sat on the grid's dock
   and hid its close, the toast stood in the palette detail's action row like a sixth act, and at
   1024px it touched the analytics banner. --lane-lift raises the lane a gutter above whichever bar is
   under it (_syncLaneLift in overlays.js), gliding on the state beat. */
function MessageLane({ vals }) {
  if (!vals.hasToast && !vals.hasNotice) return null;
  return (
    <div data-message-lane="1" style={sx('position:fixed;left:0;right:0;bottom:calc(var(--page-gutter) + var(--lane-lift, 0px));z-index:158;display:flex;flex-direction:column;align-items:center;gap:8px;padding-inline:var(--page-gutter);pointer-events:none;transition:bottom var(--dur-state) var(--ease-standard)')}>
      <NoticeLayer vals={vals} />
      <ToastLayer vals={vals} />
    </div>
  );
}
function NoticeLayer({ vals }) {
  return (
    <>
          {/* The toast's shape, shadow and margin since 17.09.26 (audits D1, D2, C9): fully round,
              --shadow-surface, and the page gutter from both edges where it stood 20px in. No dot
              (by request): the text starts the bar. The toast's padding too (by request): 8px
              round the dismiss and 16px on the reading edge, where it was 9px by 18px. The history:
              THE LAST SQUARE THING ANCHORED TO THIS CORNER. The toast six lines up is a stadium with
              two 30px circles in it; this sat beside it as a hard-cornered plate, and the two are the
              same object to a reader — a bar that arrives at the foot of the screen and says what just happened.
              One of them reporting in a different shape is the dialect the corner pass exists to end.

              18px OF FLANK, NOT 13, AND THAT IS THE STADIUM'S CHARGE RATHER THAN A LOOK. A pill's
              corner curves away from its own content, so type set at a square box's padding reads as
              crowding an edge that is no longer there. The project rows made this correction first
              (14 → 18, see optStyle) and the toast and the fields each needed it after; 13 → 18 is the
              same figure for the same reason, and it is now the number this family uses.

              A DISMISS, NOW THAT SOME OF THESE STOP EXPIRING. The toast carried one because it holds an
              undo; this one carries one because the error-class notices — a file that could not be read,
              storage that is full, a live reading that did not come back — no longer time out (showNotice
              `sticky`), and a message that neither leaves nor can be sent away is a wall. The timed ones
              keep their five seconds but hold while hovered or focused, so looking at a notice is enough
              to keep it. role follows the kind: alert for the ones that stay, status for the ones that pass. */}
          {vals.hasNotice && (
            <div data-notice="1" role={vals.noticeRole} onMouseEnter={vals.holdNotice} onMouseLeave={vals.releaseNotice} onFocus={vals.holdNotice} onBlur={vals.releaseNotice} style={sx('display:flex;align-items:center;gap:9px;border-radius:var(--radius-pill);color:var(--on-surface-muted);padding:8px;padding-inline-start:16px;max-width:340px;pointer-events:auto')}>
              {/* The leading dot went on 17.09.26, by request (audit C9). It was a bullet with no
                  meaning to lose: aria-hidden, no state, no variants. */}
              {/* THE SAME TYPE AS THE TOAST'S LABEL, which is the bar this one is a quieter copy of.
                  They sit in the same corner, take the same pane (glass since 19.09.26, one rule in
                  global.css for both), the same pill — and then set their text three
                  different ways: --fs-label against the toast's --fs-body, a hand-set .01em against its
                  --track-flat, and --on-surface-muted against its --on-surface. Two objects that agree
                  about every other property and disagree about the type read as one of them being
                  slightly broken rather than as a hierarchy.

                  The literal goes with it. --track-flat is 0 and its declaration calls itself the single
                  source for flat tracking; .01em beside it was the same drift as the six .06em sites
                  still outstanding elsewhere. */}
              <span style={sx('font-family:Neue Montreal;font-size:var(--fs-body);line-height:1.4;letter-spacing:var(--track-flat);color:var(--on-surface);text-wrap:pretty')}>{vals.notice}</span>
              {/* THE WAY OUT. An error-class notice no longer expires (see showNotice), so it needs one;
                  a timed one gets the same control because hover and focus hold it, and a held notice
                  is one the reader has decided to deal with. Same 28px disc the toast’s Dismiss uses. */}
              <button type="button" data-ix="press" data-focus="chrome" onClick={vals.dismissNotice} aria-label="Dismiss notice" title="Dismiss" style={sx('flex:none;width:28px;height:28px;margin-inline-start:2px;display:inline-flex;align-items:center;justify-content:center;background:none;border:1px solid var(--action-line);border-radius:var(--radius-pill);color:var(--on-surface);cursor:pointer;padding:0')}><TextSwap><IconClose /></TextSwap></button>
            </div>
          )}
    </>
  );
}

function RestoreDialog({ vals }) {
  if (!vals.hasRestore) return null;
  const r = vals.restore;
  return (
    /* 157, with Export and Assign: Restore is opened from Manage Library (z 156) since 22.09.26, so it
       has to stand above the panel it came from. */
    <div style={sx('position:fixed;inset:0;z-index:157;display:flex;align-items:center;justify-content:center;padding:24px')}>
      <div data-modal-backdrop="1" onClick={vals.closeRestore} style={sx('position:absolute;inset:0;background:color-mix(in srgb, var(--scrim) 55%, transparent);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)')}></div>
      <div data-restore-dialog="1" data-lenis-prevent="1" role="dialog" aria-modal="true" aria-label="Restore" onKeyDown={vals.trapRestore} style={sx('position:relative;width:420px;max-width:94vw;max-height:86vh;overflow-y:auto;background:var(--surface);border:1px solid var(--line-strong);border-radius:var(--radius-surface);box-shadow:var(--shadow-surface);display:flex;flex-direction:column')}>
        <header style={sx('display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:20px var(--page-gutter) 0')}>
          <div style={sx('display:flex;flex-direction:column;gap:4px;min-width:0')}>
            <span style={sx('font-family:Neue Montreal;font-size:var(--fs-label);letter-spacing:var(--track-flat);color:var(--on-surface-muted)')}>Restore</span>
            {/* the file's own name — the subject of the dialog, as the palette name is above */}
            <h2 style={sx("margin:0;font-family:'Neue Montreal';font-weight:500;font-size:var(--fs-subtitle);letter-spacing:var(--track-title);color:var(--on-surface);white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{r.fileName}</h2>
          </div>
          {/* The app's one close mark, as on the recognise dialog above (16.09.26). Its label still
              says which outcome it is: cancel, or close when there was nothing to add. */}
          <button type="button" data-ix="press" data-focus="chrome" onClick={vals.closeRestore} aria-label={r.cancelAria} title="Close" style={sx('flex:none;width:32px;height:32px;display:inline-flex;align-items:center;justify-content:center;background:none;border:1px solid var(--action-line);border-radius:var(--radius-pill);padding:0;color:var(--on-surface);cursor:pointer')}><TextSwap><IconClose /></TextSwap></button>
        </header>
        {/* WITH NO FOOTER, THE LIST KEEPS A GUTTER UNDER IT (19.09.26, by request: "Add more equal spacing
            at the bottom so text can breathe"). When nothing in the file is new there is no commit pair,
            and the last row ran to the dialog's edge; the gutter the sides and top keep now closes it. */}
        <div style={sx('padding:14px var(--page-gutter) ' + (r.hasAct ? '0' : 'var(--page-gutter)') + ';display:flex;flex-direction:column;gap:12px')}>
          {r.line && <span style={sx("font-family:'Neue Montreal';font-size:var(--fs-detail);line-height:1.5;color:var(--on-surface-muted);text-wrap:pretty")}>{r.line}</span>}
          {/* Four numbers are not a sentence. Muted term, full-ink tabular value, a hairline under each
              row — so a count reads here exactly as it reads on the result view's metrics, and the two
              surfaces share one way of stating a figure. THE TERM IS THE METRICS' TITLE CASE AT 13px
              (19.09.26, audit U8, by request): capitals name a surface, a group or a state; a label
              that names a value is set as the result stage's are. It was 11px capitals. */}
          <dl style={sx('display:flex;flex-direction:column;margin:0')}>
            <span aria-hidden="true" style={sx('display:block;height:1px;background:var(--line)')}></span>
            {r.rows.map((m, mi) => (
              <div key={mi}>
                <div style={sx('display:flex;align-items:baseline;justify-content:space-between;gap:16px;padding:8px 0')}>
                  <dt style={sx('font-family:Neue Montreal;font-size:var(--fs-body);letter-spacing:var(--track-flat);color:var(--on-surface-muted);white-space:nowrap')}>{m.label}</dt>
                  <dd style={sx('margin:0;min-width:0;font-family:Neue Montreal;font-size:var(--fs-body);letter-spacing:var(--track-flat);color:var(--on-surface);white-space:nowrap;font-variant-numeric:tabular-nums')}>{m.value}</dd>
                </div>
                <span aria-hidden="true" style={sx('display:block;height:1px;background:var(--line)')}></span>
              </div>
            ))}
          </dl>
        </div>
        {/* THE COMMIT PAIR, the project picker's (16.09.26, by request): Cancel and the filled Add to
            Library, Button at the app's two emphases, right-aligned under the rule, where a full-
            width square slab stood. Cancel is the header's close mark said in words, as the picker's
            is. When nothing in the file is new there is no act left to offer, so there is no footer
            at all rather than a pair that would commit nothing; the close mark is the way out. */}
        {/* THE BANNER'S PAIR since 17.09.26 (by request): CONSENT_BTN_TYPE, Medium, Title Case, the
            outlined one first, as on the other two dialogs. The footnote under it ("New palettes go to
            the top…") went at the same request. */}
        {r.hasAct && (
          <div data-voice="banner" style={sx('padding:18px var(--page-gutter) 22px;margin-top:10px;border-top:1px solid var(--line);display:flex;flex-direction:column;gap:12px')}>
            <div style={sx('display:flex;align-items:center;justify-content:flex-end;flex-wrap:wrap;gap:10px')}>
              <Button data-emphasis="secondary" onClick={vals.closeRestore} aria-label={r.cancelAria} style={CONSENT_BTN_TYPE} label={<span style={sx('display:flex;align-items:center;height:16px')}><ButtonText>{r.cancelLabel}</ButtonText></span>} />
              <Button data-emphasis="primary" onClick={vals.confirmRestore} aria-label={r.confirmAria} style={CONSENT_BTN_TYPE} label={<span style={sx('display:flex;align-items:center;height:16px')}><ButtonText>Add to Library</ButtonText></span>} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ===== THE TOUR'S TWO SURFACES ================================================================

   THE INVITATION IS ONE OF THE DIALOGS, not a new kind of thing. Same frame as Already Extracted
   and Restore from a File, to the pixel: z-126 over the 55% scrim and its 6px blur, 420px on
   --radius-surface, the header's h2 beside the app's one close mark, the body line at --fs-body,
   and the pair in the footer's banner voice with the outlined answer first. It is opened twice in
   the app's life — once by Create on a first visit, and again by Take a Tour in the masthead — and
   it is the same dialog both times, because it is the same offer.

   THE GUIDANCE CARD IS NOT A DIALOG, and the difference is the whole design. A dialog takes the
   screen: backdrop, aria-modal, a focus trap, nothing else reachable. This card stands BESIDE the
   working interface with that interface live — no backdrop, no trap, no aria-modal — because every
   step invites the reader to try the thing it is naming, and a trap would make that impossible.
   What it borrows from the dialogs is the surface: --surface on --line-strong at --radius-surface
   with --shadow-surface, so it reads as the same system floating rather than as a foreign object.

   role="group", NOT role="dialog". aria-modal="false" on a role=dialog is a well-known way to be
   announced as modal anyway by some screen readers, and this surface genuinely is not one. The
   group is named by its own heading, focus is MOVED to it on every step (so a keyboard reader
   arrives at the instruction rather than hunting for it) and the step change is spoken through the
   app's existing polite live region — never through role="alert", which would interrupt. */
function TourInvite({ vals }) {
  if (!vals.tour || vals.tour.stage !== 'invite') return null;
  const t = vals.tour;
  return (
    /* STILL MOUNTED WHILE IT LEAVES. `leaving` keeps this rendered for the length of _dialogOut, so
       the invitation can fade and drop on the dialogs' own exit while the card rises out of its
       centre — one object handing over to the next rather than one vanishing and another appearing
       somewhere else. It takes no presses while it goes. */
    <div style={{ ...sx('position:fixed;inset:0;z-index:126;display:flex;align-items:center;justify-content:center;padding:24px'), pointerEvents: t.leaving ? 'none' : undefined }}>
      <div data-modal-backdrop="1" onClick={t.onSkipInvite} style={sx('position:absolute;inset:0;background:color-mix(in srgb, var(--scrim) 55%, transparent);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)')}></div>
      {/* GLASS, LIKE THE ANALYTICS BANNER (20.09.26, by request: "modal should be in the same glass
          design as cookie banner"). It shipped for one round as the solid dialog plate — --surface,
          --line-strong, --shadow-surface — which is the recipe for the five dialogs that act ON
          something: Export, Add to Projects, Restore. This one asks a question and takes an answer,
          which is the banner's job, and the banner is the surface the site already answers questions
          on. Same recipe, stated the same way: the .glass-effect pane as the FIRST child so
          everything after it paints above, background:transparent so nothing opaque is laid over the
          blur, the 12% ink hairline instead of --line-strong (an opaque edge around a see-through
          pane is the heaviest thing on it), --radius-surface passed to the pane through
          border-radius:inherit, and NO SHADOW — glass reads from its fill, and a shadow under it is
          a smudge seen through the glass. The .tour-invite block in global.css carries the rest. */}
      <div className="tour-invite" data-tour-dialog="1" data-lenis-prevent="1" role="dialog" aria-modal="true" aria-labelledby="tour-invite-title" onKeyDown={t.onInviteKey} style={sx('position:relative;width:420px;max-width:94vw;max-height:86vh;display:flex;flex-direction:column;background:transparent;border-radius:var(--radius-surface)')}>
        <GlassEffect />
        <header style={sx('display:flex;align-items:center;justify-content:space-between;gap:12px;padding:20px var(--page-gutter) 0')}>
          {/* No eyebrow, for Already Extracted's reason: a label over this line would say what the
              line says. "Take a Tour" where it read "A Quick Look Around?" (21.09.26, by request):
              it names the thing being offered rather than asking a question about it, and it is the
              same words the footer control that reopens this dialog is labelled with — one act, one
              name, wherever it is met. text-wrap:balance stays for the narrow viewports where a
              420px dialog clamps to 94vw and the line can still wrap. */}
          <h2 id="tour-invite-title" style={sx("margin:0;font-family:'Neue Montreal';font-weight:500;font-size:var(--fs-subtitle);letter-spacing:var(--track-title);color:var(--on-surface);text-wrap:balance")}>Take a Tour</h2>
          {/* The same close mark as every other dialog, and it means the same as Skip for Now:
              nothing starts, nothing is taken away, the answer is remembered. */}
          <button type="button" data-ix="press" data-focus="chrome" onClick={t.onSkipInvite} aria-label="Close, and stay in the overview" title="Close" style={sx('flex:none;width:32px;height:32px;display:inline-flex;align-items:center;justify-content:center;background:none;border:1px solid var(--action-line);border-radius:var(--radius-pill);padding:0;color:var(--on-surface);cursor:pointer')}><TextSwap><IconClose /></TextSwap></button>
        </header>
        <div style={sx('padding:14px var(--page-gutter) 0;display:flex;flex-direction:column;gap:12px')}>
          {/* 75% OF THE COLUMN, NOT ALL OF IT (21.09.26, by request). The line ran the dialog's full
              372px and broke wherever that landed; held to three quarters it breaks earlier and
              reads as a block set under the title rather than as text filling a box. Stated as a
              proportion rather than a pixel cap so it stays right if the dialog is ever resized. */}
          <span style={sx("max-width:75%;font-family:'Neue Montreal';font-size:var(--fs-body);line-height:1.5;color:var(--on-surface-muted);text-wrap:pretty")}>Start with an example and explore colours, contrast and harmonies.</span>
        </div>
        {/* THE PAIR, IN THE DIALOGS' ORDER: outlined first, filled last, right-aligned under the
            rule. Title Case, like every other button in the app — the brief wrote these two in
            sentence case, and one dialog spelling its buttons differently from the other four is
            the inconsistency the one-policy rule exists to stop. */}
        <div data-voice="banner" style={sx('padding:18px var(--page-gutter) 22px;margin-top:10px;border-top:1px solid var(--line);display:flex;align-items:center;justify-content:flex-end;flex-wrap:wrap;gap:10px')}>
          <Button data-emphasis="secondary" onClick={t.onSkipInvite} aria-label="Skip the tour and stay in the overview" style={CONSENT_BTN_TYPE} label={<span style={sx('display:flex;align-items:center;height:16px')}><ButtonText>Skip for Now</ButtonText></span>} />
          <Button data-tour-take="1" data-emphasis="primary" onClick={t.onTake} aria-label="Take the tour of an example palette" style={CONSENT_BTN_TYPE} label={<span style={sx('display:flex;align-items:center;height:16px')}><ButtonText>Take the Tour</ButtonText></span>} />
        </div>
      </div>
    </div>
  );
}

function TourGuide({ vals }) {
  if (!vals.tour || !vals.tour.card) return null;
  const c = vals.tour.card;
  return (
    /* transform is the solver's (methods/tour.js writes translate3d on every scroll frame), so the
       box itself sits at 0,0 and is moved from there. left/top would be a layout write per frame;
       a transform is composited. The transition is on transform ALONE — never `all` — so the card
       travels between two anchors as one object rather than cutting, and it is dropped entirely
       under reduced motion (see [data-tour-card] in global.css). */
    <div className="tour-card" data-tour-card="1" data-tour-numbered={c.numbered ? '1' : undefined} data-lenis-prevent="1" role="group" aria-labelledby="tour-card-title" tabIndex={-1} ref={c.cardRef} onKeyDown={c.onKey}
      style={{ ...sx('position:fixed;left:0;top:0;width:320px;max-width:calc(100vw - 48px);background:transparent;border-radius:var(--radius-surface);display:flex;flex-direction:column;pointer-events:auto'), zIndex: c.z }}>
      {/* GLASS, LIKE THE INVITATION AND THE BANNER (20.09.26, by request: "make the card glass too").
          It was the one tour surface still on the solid plate, held back on a legibility worry —
          three lines of --fs-detail over five bands of somebody's palette. The worry turns out not
          to apply: the solver never lets this card stand on the swatches (step 1 clears past the
          action row, step 4 goes to Export's trailing side), so what is actually behind it is page,
          list or a drawer's scrim. Measured on all five stops in both themes before this shipped.
          Same recipe as .tour-invite: the pane FIRST so everything after it paints above, no opaque
          fill over the blur, the 12% ink hairline, and no shadow — glass reads from its fill. */}
      <GlassEffect />
      <div style={sx('padding:16px 16px 0;display:flex;flex-direction:column;gap:8px')}>
        {/* THE COUNTER IS THE FIRST THING, and it is the only thing on this surface set in the
            chrome label voice: it is metadata about the tour, not part of the instruction. Absent
            on Choose a palette, which is the way in rather than one of the four — a counter there
            would promise five steps and deliver four. tabular-nums because the figure changes in
            place and proportional digits would shift the line under it. */}
        {/* THE PHONE CHOOSER'S STEPPER, NOT A SENTENCE (20.09.26, by request: "add the same stepper we
            have on explore palette on mobile and same animation principles").

            "1 OF 4" was a line of prose doing a counter's job. This is .layered-slider__counter's
            form — the current number, a position bar, the total — and its animation principle, which
            is the part worth carrying over: the number is NOT a tween of its own. Every number is a
            line stacked in one clipped cell, and the step being shown places all four at a line
            height each from it, so the figure rolls through the same beat the card moves on rather
            than keeping a second clock (see [ATMOS 6] in methods/layeredSlider.js, which records two
            versions that did have their own tween and read as bouncy for it).

            NO CHILDREN ON THE CELL. Its lines are built and placed by _tourStepper; a React child
            here would be reconciled on every step and wipe them. aria-hidden on the whole row, with
            the fact stated in words beside it — a rolling stack of figures is not something to read
            out, and "Step 1 of 4" is. */}
        {c.counter && (<>
          <div className="tour-step" aria-hidden="true">
            <span data-tour-count="1" className="tour-step__span"></span>
            <span className="tour-step__track"><span data-tour-fill="1" className="tour-step__fill"></span></span>
            <span className="tour-step__span">{c.totalText}</span>
          </div>
          <span style={visuallyHidden}>{c.counter}</span>
        </>)}
        {/* MEDIUM, AND ITS OWN STEP. The weight was already 500 — what did not read as a heading was
            the SIZE: --fs-body over a --fs-detail body is 13 over 12, and one pixel of difference
            is not a hierarchy whatever the weight does. --fs-lead is the next rung up and the one
            the site already spends on a lead line, so the card now runs 15/500 over 12/400, which
            is a step you can see. Every line keeps its own size rather than being flattened into
            one; --track-flat, like the rest of the control voice. */}
        {/* data-tour-line MARKS THE TWO THINGS THE MASK REVEAL SPLITS, and both hold PLAIN TEXT on
            purpose: splitLines rebuilds by innerHTML, so a React element inside one of these would
            come back as an inert copy that never updates again. Text only, here and below. */}
        <h2 id="tour-card-title" data-tour-line="1" style={sx("margin:0;font-family:'Neue Montreal';font-weight:500;font-size:var(--fs-lead);line-height:1.25;letter-spacing:var(--track-flat);color:var(--on-surface)")}>{c.title}</h2>
        {/* --fs-detail, a step under the heading, at 1.5 because every one of these wraps to three
            lines or more. text-wrap:pretty keeps the last line from ending on one word. */}
        {/* --fs-body, ONE RUNG UP (20.09.26, by request: "increase the onboarding copy font-size to
            the nearest token, no more than 1-2px"). --fs-detail is 12 and the next rung is 13, so
            this is the whole of the move: 12 → 13, the same size the invitation's own line has
            always been set in, which makes the two tour surfaces agree. The heading keeps --fs-lead
            at 15, so the step still reads 15/500 over 13/400 — a step you can see, which is what
            the earlier size change was for. */}
        <p data-tour-line="2" style={sx("margin:0;font-family:'Neue Montreal';font-size:var(--fs-body);line-height:1.5;color:var(--on-surface-muted);text-wrap:pretty")}>{c.body}</p>
      </div>
      {/* THE FOOT CARRIES THE WAY OUT AND THE WAY ON, and they sit at opposite ends because they
          are opposite acts — Skip Tour is not a sibling of Next. Same rule and same banner voice as
          the dialogs' footers, at the card's own smaller padding. Back is absent, not disabled, on
          the first step: a control that cannot do anything is a target that wastes a Tab. */}
      <div data-voice="banner" style={sx('margin-top:14px;padding:12px 16px;border-top:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;gap:16px')}>
        {/* SKIP TOUR IS THE THIRD TIER, NOT THE SECOND (20.09.26, by request: "skip tour shouldn't be
            such a highlighted button"). As an outlined Button it was drawn exactly like Back — same
            border, same ink, same size — so a row meant to read "here is the way on, and here is the
            way out" read as three peers, and the emphasis that should have been on Next was spread
            across the row. Emphasis only works while it is scarce.

            The tier it drops to is the masthead's, not a new one: [data-tier3-action], the borderless
            label Back Up and Restore wear, with their hover (the ink goes to --on-surface-muted) and
            their ::after hit area, which keeps the target at a proper size while the mark shrinks to
            the words. The app HAD a lighter bordered tier and removed it for failing its own hover
            on contrast — this is the surviving quiet control, and the reason nothing new is invented
            here. The gap goes 10 → 16, because a borderless control needs more air beside a bordered
            one than two bordered ones need between them.

            The INVITATION keeps its outlined Skip for Now: that dialog is a question with two real
            answers, and the pair is the five dialogs' own. Only a tour in progress demotes it. */}
        {/* Finish Tour on the last step, where leaving is finishing and the primary is New Palette. */}
        <button type="button" data-ix="press" data-tier3-action="" data-focus="chrome" onClick={c.onSkip} aria-label={c.skipAria} style={c.skipStyle}><TextSwap>{c.skipLabel}</TextSwap></button>
        {/* THE PAIR KEEPS ITS OWN BOXES, AND THE ROW HOLDS ANYWAY (21.09.26, by request: the primary
            should carry the same padding as Back and "extend naturally when Finish Tour arrives").

            A min-width stood here for one round, reserving the widest state so nothing could shift.
            It bought a stable Back at the cost of the thing it was protecting: an 88px box around a
            53px "Next" is a button whose ink sits 17px from either edge while Back's sits at 13 —
            the same tier, visibly differently inset. The padding is the shared figure; the width
            follows the word.

            What holds the row without it is the row itself: justify-content:space-between pins this
            group to the trailing edge, so the primary's own trailing edge never moves whatever it
            contains. Back's arrival on 1 → 2 extends the group leftwards into empty space rather
            than pushing the primary along, and 'Finish Tour' on step 5 extends it the same way. The
            one thing that does move is Back, 35px, on the last crossing — which is the natural
            extension that was asked for rather than a reflow. */}
        {/* NEXT IS DISABLED, NOT ABSENT, while a drawer step waits for its act (21.09.26): the row
            keeps its shape, the button stays where four presses have taught the reader to look, and
            the copy's first sentence says what turns it on. Native disabled, so it leaves the Tab
            order and a screen reader reads it as unavailable; the change to live is a fade on
            opacity ([data-tour-card] .button in global.css), never a pop. */}
        {c.hasNext && (
          <span style={sx('display:inline-flex;align-items:center;justify-content:flex-end;gap:8px')}>
            {c.hasBack && (
              <Button data-emphasis="secondary" onClick={c.onBack} aria-label={c.backAria} style={CONSENT_BTN_TYPE} label={<span style={sx('display:flex;align-items:center;height:16px')}><ButtonText>Back</ButtonText></span>} />
            )}
            <Button data-emphasis="primary" onClick={c.onNext} disabled={c.nextDisabled} aria-label={c.nextAria} style={CONSENT_BTN_TYPE} label={<span style={sx('display:flex;align-items:center;height:16px')}><ButtonText>{c.nextLabel}</ButtonText></span>} />
          </span>
        )}
      </div>
    </div>
  );
}
