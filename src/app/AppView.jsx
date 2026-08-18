// The view — a 1:1 JSX port of the design comp's template. Static inline styles are kept as the
// original CSS strings (parsed by sx()) so the layout stays byte-faithful; computed styles come
// from renderVals() untouched. No logic lives here.
import React, { useState } from 'react';
import { sx } from '../lib/sx.js';
import { B006, B006Text, GlassEffect, TextSwap, ThemeSwitch } from './chrome.jsx';
import LegalPage from './LegalPage.jsx';
import AboutPage from './AboutPage.jsx';
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
  ...sx('position:fixed;top:18.5px;left:50%;transform:translateX(-50%);width:165px;height:26px;z-index:155;mix-blend-mode:difference;background:linear-gradient(120deg, #ffffff, #c2c2c2, #8a8a8a, #dedede, #a6a6a6, #ffffff);background-size:280% 280%;animation:gradient-drift 9s ease-in-out infinite'),
  WebkitMask: LOGO_MASK, mask: LOGO_MASK,
};

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
const IconCopy = ({ size = 12 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ display: 'block', flex: 'none' }}><path fill="currentColor" d="M7.5 17V3h11v14zm1-1h9V4h-9zm-4 4V6.616h1V19h9.385v1zm4-4V4z"></path></svg>);
const IconCheck = ({ size = 12 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ display: 'block', flex: 'none' }}><path fill="currentColor" d="m9.55 17.308l-4.97-4.97l.714-.713l4.256 4.256l9.156-9.156l.713.714z"></path></svg>);
const IconHarmony = ({ size = 14 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ display: 'block', flex: 'none' }}><path fill="currentColor" d="M8 18q-2.502 0-4.251-1.749T2 12t1.749-4.251T8 6q.906 0 1.736.26t1.525.754q-.194.177-.367.377l-.344.401q-.539-.376-1.186-.584T8 7Q5.925 7 4.463 8.463T3 12t1.463 3.538T8 17q.717 0 1.365-.208q.646-.208 1.185-.584l.344.4q.173.202.367.379q-.695.494-1.525.754Q8.906 18 8 18m8 0q-.906 0-1.735-.26t-1.527-.753q.195-.177.368-.378l.344-.401q.544.377 1.189.584T16 17q2.075 0 3.538-1.463T21 12t-1.463-3.537T16 7q-.717 0-1.362.208t-1.188.584l-.344-.4q-.173-.201-.367-.379q.695-.494 1.525-.753Q15.095 6 16 6q2.502 0 4.251 1.749T22 12t-1.749 4.251T16 18m-4-1.558q-.944-.84-1.472-2T10 12t.528-2.442t1.472-2q.944.84 1.472 2T14 12t-.528 2.442t-1.472 2"></path></svg>);
// Sort chevron — drawn at the same 1-unit hairline weight as the rest of the icon set, so it sits
// in the header without shouting. It points DOWN at rest (descending) and rotates 180° to point up
// for ascending; the rotation is the state change, so the glyph never swaps out from under the eye.
const IconClose = ({ size = 12 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ display: 'block', flex: 'none' }}><path fill="currentColor" d="m6.4 18.308l-.708-.708l5.6-5.6l-5.6-5.6l.708-.708l5.6 5.6l5.6-5.6l.708.708l-5.6 5.6l5.6 5.6l-.708.708l-5.6-5.6z"></path></svg>);
const IconChevron = ({ size = 9 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ display: 'block', flex: 'none' }}><path fill="currentColor" d="M12 14.708L6.692 9.4l.708-.708l4.6 4.6l4.6-4.6l.708.708z"></path></svg>);
const IconContrast = ({ size = 14 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ display: 'block', flex: 'none' }}><path fill="currentColor" d="M8.493 20.292q-1.643-.709-2.859-1.924t-1.925-2.856T3 12.003t.709-3.51Q4.417 6.85 5.63 5.634t2.857-1.925T11.997 3t3.51.709q1.643.708 2.859 1.922t1.925 2.857t.709 3.509t-.708 3.51t-1.924 2.859t-2.856 1.925t-3.509.709t-3.51-.708m4.007-.31q3.09-.201 5.295-2.458T20 12t-2.185-5.505Q15.628 4.258 12.5 4.017z"></path></svg>);
const IconExport = ({ size = 14 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ display: 'block', flex: 'none' }}><path fill="currentColor" d="m12 15.577l-3.539-3.538l.708-.72L11.5 13.65V5h1v8.65l2.33-2.33l.709.719zM5 19v-4.038h1V18h12v-3.038h1V19z"></path></svg>);
const IconFolder = ({ size = 14 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ display: 'block', flex: 'none' }}><path fill="currentColor" d="M3 19V5h6.596l2 2H21v12zm1-1h16V8h-8.806l-2-2H4zm0 0V6z"></path></svg>);
// Redrawn from the supplied mdi link glyph at this set's stroke weight. The source was ~2 units of
// wall in a 24 grid; every other icon here (export, folder, trash, copy) is a 1-unit hairline, and
// at 14px the difference reads as a bold icon sitting in a row of light ones. Same drawing, same
// optical size — just the weight the row is built on.
const IconLink = ({ size = 14 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ display: 'block', flex: 'none' }}><path fill="currentColor" d="M10.616 16.077H7.077q-1.692 0-2.884-1.192T3 12t1.193-2.885t2.884-1.193h3.539v1H7.077q-1.27 0-2.173.904Q4 10.731 4 12t.904 2.173t2.173.904h3.539zM8.5 12.5v-1h7v1zm4.885 3.577v-1h3.538q1.27 0 2.173-.904Q20 13.269 20 12t-.904-2.173t-2.173-.904h-3.538v-1h3.538q1.692 0 2.885 1.192T21 12t-1.193 2.885t-2.884 1.193z"></path></svg>);
const IconTrash = ({ size = 14 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ display: 'block', flex: 'none' }}><path fill="currentColor" d="M6 20V6H5V5h4v-.77h6V5h4v1h-1v14zm1-1h10V6H7zm2.808-2h1V8h-1zm3.384 0h1V8h-1zM7 6v13z"></path></svg>);

// The AA verdict badge. ONE component for every surface that reports it — the list row, the detail
// panel's Accessibility group, and the universe card — so the three states (fill AND glyph, never
// colour alone) cannot drift between them the way three hand-rolled copies already had. All of the
// styling arrives from renderVals' shared aaReadout; this only draws it.
// The glyph sits in a fixed 9px slot: ✓ and ◐ draw at 9, ✕ is a narrower text glyph, and an
// intrinsic slot let the badge's own width follow the state.
const AaBadge = ({ aa }) => (
  <span style={aa.aaBadgeStyle} title={aa.aaBadgeTitle}>
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

// Each of these names a job, not a noun. "Contrast" and "Refine" named the subject the button is
// about and left the user to supply the verb; in a row of six that is six subjects and no route.
const contrastB006Label = (
  <span style={sx('display:flex;align-items:center;gap:7px;height:14px')}><span aria-hidden="true" style={{ display: 'inline-flex' }}><IconContrast /></span><B006Text>Check contrast</B006Text></span>
);
// The chevron is supplemental: it promises a chooser, it does not carry the meaning. Export's is a
// dialog rather than a menu because the formats there are not a list of five equivalents — they
// carry extensions and a semantic-scaffold decision that changes what every one of them emits.
const exportB006Label = (
  <span style={sx('display:flex;align-items:center;gap:7px;height:14px')}><span aria-hidden="true" style={{ display: 'inline-flex' }}><IconExport /></span><B006Text>Export</B006Text><span aria-hidden="true" style={{ fontSize: 'var(--fs-nano)' }}>▾</span></span>
);
// COPY holds its formats in a menu and its confirmation on itself. The confirmation names the format
// rather than saying "Copied", because from a menu that is the only part still in question — and it
// stops at the format name: reserving room for the word "copied" as well would have made the widest
// state ("CSS variables copied") the permanent width of a button that usually reads "Copy". The verb
// is carried by the check mark and by the live region, which announces the whole sentence.
// Copy carries the same three parts as Export — glyph, word, chevron — and has to measure like it.
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
    <span aria-hidden="true" style={{ fontSize: 'var(--fs-nano)', visibility: done ? 'hidden' : 'visible' }}>▾</span>
  </span>
);
// Refine carries no icon, deliberately. Every other glyph in this row stands for a NOUN the app
// already draws elsewhere — a folder, a link, a contrast disc — whereas this one would have to
// stand for an activity, and the sliders-and-dots marks that usually get drafted for that read as
// "settings". The word is unambiguous and the row is short enough to carry it.
const refineB006Label = (
  <span style={sx('display:flex;align-items:center;height:14px')}><B006Text>Refine palette</B006Text></span>
);
// One menu, both surfaces. The result bar and the archive's fullscreen detail draw the same row, so
// they draw the same chooser from the same state — only one of the two is ever mounted, which is why
// a single flag and a single [data-copy-menu] selector are enough for the tween to find its panel.
function CopyMenu({ open, done, onToggle, onKey, onHex, onCss }) {
  return (
    <span style={sx('position:relative;display:inline-flex')}>
      <B006 data-copy-trigger="1" data-emphasis="secondary" aria-haspopup="menu" aria-expanded={open}
        onClick={onToggle} onKeyDown={onKey} aria-label="Copy the whole palette, in a format you choose"
        label={copyB006Label(done)} />
      {open && (<>
        <span style={sx('position:fixed;inset:0;z-index:40')} onClick={onToggle} aria-hidden="true"></span>
        <div data-copy-menu="1" role="menu" aria-label="Copy format" onKeyDown={onKey} style={sx('position:absolute;top:calc(100% + 6px);left:0;z-index:41;min-width:210px;background:var(--surface);border:1px solid var(--line-strong);box-shadow:0 12px 30px rgba(0,0,0,.18);display:flex;flex-direction:column')}>
          {/* The common format first, per the rule that a menu opens on the answer most people came
              for. The second line of each item is the shape of what lands on the clipboard, so the
              choice is made on the artefact rather than on the word for it. */}
          <button type="button" role="menuitem" data-ix="cell" data-focus="chrome" onClick={onHex} style={sx('display:flex;flex-direction:column;gap:2px;text-align:left;background:none;border:none;border-bottom:1px solid var(--line);padding:var(--btn-pad-lg);cursor:pointer;color:var(--on-surface);font:inherit')}>
            <span style={sx('font-family:Neue Montreal;font-size:var(--fs-detail)')}>Hex list</span>
            <span style={sx('font-family:Neue Montreal;font-size:var(--fs-label);color:var(--on-surface-muted)')}>One value per line.</span>
          </button>
          <button type="button" role="menuitem" data-ix="cell" data-focus="chrome" onClick={onCss} style={sx('display:flex;flex-direction:column;gap:2px;text-align:left;background:none;border:none;padding:var(--btn-pad-lg);cursor:pointer;color:var(--on-surface);font:inherit')}>
            <span style={sx('font-family:Neue Montreal;font-size:var(--fs-detail)')}>CSS variables</span>
            <span style={sx('font-family:Neue Montreal;font-size:var(--fs-label);color:var(--on-surface-muted)')}>Custom properties. Ready to paste.</span>
          </button>
        </div>
      </>)}
    </span>
  );
}

// Filing takes the same folder glyph the archive row and the overlay header already use — one
// concept, one mark — and a label that changes with the state rather than an icon that doesn't.
const assignB006Label = (text) => (
  <span style={sx('display:flex;align-items:center;gap:7px;height:14px')}><span aria-hidden="true" style={{ display: 'inline-flex' }}><IconFolder /></span><B006Text>{text}</B006Text></span>
);
// Share is the one action-row button that both carries an icon AND swaps its text, so it composes
// the icon wrapper with SwapLabel — the link icon holds position while the label resolves against
// its hidden twin, and the row never reflows mid-copy.
const shareB006Label = (copied) => (
  <span style={sx('display:flex;align-items:center;gap:7px;height:14px')}>
    <span aria-hidden="true" style={{ display: 'inline-flex' }}><IconLink /></span>
    <SwapLabel copied={copied} idle="Share Link" />
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
    /* height:100dvh over the inset, per the rule the refine dialog already states: a fixed box on a
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
              {r.hasImage && (
                <span style={sx('position:relative;display:block;width:100%;height:40px;overflow:hidden;background:var(--surface-raised)')}>
                  <img src={r.image} alt="" style={sx('display:block;width:100%;height:100%;object-fit:cover')} />
                  <span style={sx('position:absolute;inset:0;box-shadow:inset 0 0 0 1px color-mix(in srgb, var(--on-surface) 10%, transparent)')}></span>
                </span>
              )}
              <span style={sx('display:flex;width:100%;height:' + (r.hasImage ? '6px' : '40px') + ';border:1px solid var(--line)')}>
                {r.strip.map((b) => (<span key={b.key} style={b.style}></span>))}
              </span>
            </span>
            <span style={sx('flex:1;min-width:0;display:flex;flex-direction:column;gap:4px')}>
              <span style={sx("font-family:'Neue Montreal';font-weight:500;font-size:var(--fs-body);color:var(--on-surface);overflow:hidden;text-overflow:ellipsis;white-space:nowrap")}>{r.name}</span>
              <span style={sx('font-family:Neue Montreal;font-size:var(--fs-micro);letter-spacing:var(--track-flat);text-transform:uppercase;color:var(--on-surface-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap')}>{r.traits.join(' · ')}</span>
            </span>
            <span aria-hidden="true" style={sx('flex:none;display:inline-flex;color:var(--on-surface-muted);transform:rotate(-90deg)')}><IconChevron size={12} /></span>
          </button>
          </li>
        ))}
      </ul>

      <div style={sx('flex:none;padding:24px var(--page-gutter) 34px')}>
        <button type="button" data-ix="press" data-focus="chrome" onClick={ml.onLeave} aria-label="Return to the start screen" style={sx('display:flex;align-items:center;justify-content:center;width:100%;min-height:48px;background:none;border:1px solid var(--action-line);font-family:Neue Montreal;font-size:var(--fs-label);letter-spacing:var(--track-flat);color:var(--on-surface);cursor:pointer;-webkit-tap-highlight-color:transparent')}>Back to start</button>
      </div>
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
      {ms.hasImage && (
        <div data-ms-img="1" style={sx('flex:none;width:100%;aspect-ratio:4/3;overflow:hidden;background:var(--surface-raised);position:relative')}>
          <img src={ms.image} alt={'The photograph ' + ms.name + ' was read from'} style={sx('display:block;width:100%;height:100%;object-fit:cover')} />
          <span aria-hidden="true" style={sx('position:absolute;inset:0;box-shadow:inset 0 0 0 1px color-mix(in srgb, var(--on-surface) 10%, transparent)')}></span>
        </div>
      )}

      <div data-ms-head="1" style={sx('flex:none;padding:22px var(--page-gutter) 22px')}>
        <h1 data-mask-copy="1" style={sx("font-family:'Neue Montreal';font-weight:500;font-size:var(--fs-statement);line-height:1.05;letter-spacing:-.015em;color:var(--on-surface);margin:0;text-wrap:balance")}>{ms.name}</h1>
        {ms.descriptors.length > 0 && (
          <div style={sx('display:flex;flex-wrap:wrap;gap:6px;margin-top:14px')}>
            {ms.descriptors.map((d, i) => (
              <span key={i} style={sx('font-family:Neue Montreal;font-size:var(--fs-label);padding:var(--btn-pad-chip);border:1px solid color-mix(in srgb, var(--on-surface) 15%, transparent);background:color-mix(in srgb, var(--on-surface) 9%, var(--surface));color:var(--on-surface);text-transform:uppercase')}>{d}</span>
            ))}
          </div>
        )}
        {ms.hasRationale && (
          <p data-mask-copy="1" style={sx("font-family:'Neue Montreal';font-size:var(--fs-body);line-height:1.5;color:var(--on-surface-muted);margin:16px 0 0;text-wrap:pretty")}>{ms.rationale}</p>
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
      <div data-ms-foot="1" style={sx('flex:none;padding:24px var(--page-gutter) 34px')}>
        {ms.footLine && (
          <p data-mask-copy="1" style={sx("font-family:'Neue Montreal';font-size:var(--fs-detail);line-height:1.6;color:var(--on-surface-muted);margin:0;text-wrap:pretty")}>{ms.footLine}</p>
        )}
        {/* A way back, for the arrival that has one. Full width and 48px tall because this is the
            one control on a surface built for a thumb. */}
        {ms.canLeave && (
          <div style={sx('display:flex;flex-direction:column;gap:9px;margin-top:18px')}>
            {/* Sideways before backwards: seeing another example is the likelier next move, and
                putting it first means the way OUT is not also the only way ON. Hidden while the
                list is already the level below, where it would send you where you just were. */}
            {!ms.inList && (
              <button type="button" data-ix="press" data-focus="chrome" onClick={ms.onSeeAll} aria-label="See all example palettes" style={sx('display:flex;align-items:center;justify-content:center;width:100%;min-height:48px;background:none;border:1px solid var(--action-line);font-family:Neue Montreal;font-size:var(--fs-label);letter-spacing:var(--track-flat);color:var(--on-surface);cursor:pointer;-webkit-tap-highlight-color:transparent')}>See all examples</button>
            )}
            <button type="button" data-ix="press" data-focus="chrome" onClick={ms.onLeave} aria-label={ms.inList ? 'Back to the example list' : 'Close the example and return to the start screen'} style={sx('display:flex;align-items:center;justify-content:center;width:100%;min-height:48px;background:none;border:1px solid var(--action-line);font-family:Neue Montreal;font-size:var(--fs-label);letter-spacing:var(--track-flat);color:var(--on-surface);cursor:pointer;-webkit-tap-highlight-color:transparent')}>{ms.inList ? 'Back to Examples' : 'Back to Start'}</button>
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
function SiteFooter({ route, onNavigate }) {
  const link = (href, label) => (
    <a href={href} onClick={onNavigate} {...(pathFor(route) === href ? { 'aria-current': 'page' } : null)}><TextSwap>{label}</TextSwap></a>
  );
  return (
    <footer className="site-foot">
      <div className="site-foot__brand">
        <a href="/" onClick={onNavigate} aria-label="Atmos Gallery, home"><span className="site-foot__mark" aria-hidden="true"></span></a>
      </div>
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
    </footer>
  );
}

/* THE LANDING STAGE — ring formation, brand copy, and on a phone the gate's two acts. Lifted out of
   AppView's main return because it is no longer that return's alone: the example list and the
   read-only palette render it too, underneath themselves.

   They used to REPLACE it, and the orbs paid for it. The formation is a WebGL particle field over a
   painted DOM floor, both built by initOrbit from freshly encoded tile textures — so a landing that
   unmounts is a formation destroyed, and a landing that comes back is a formation rebuilt from
   nothing, with a visible hole where the rings should be while it uploads. Covering it costs one
   opaque panel and keeps every orb exactly where it was left.

   `covered` is passed by those two paths: aria-hidden and inert together, so nothing under a
   full-screen surface is readable, focusable or tabbable — which is the whole reason the early
   returns existed. The tool is still left out of the tree entirely; only this stage stays. */
function LandingStage({ vals, covered }) {
  return (
        /* height:100dvh for the same reason the two phone surfaces carry it: this block is centred
           in its own box, and a box that runs to the LARGE viewport's bottom centres the gate copy
           below the middle of what the reader can actually see — and pushes the ring formation,
           which is solved around that centre, off with it. */
        <div data-landing="1" {...(vals.narrow ? { 'data-desk-gate': '1' } : {})} {...(covered ? { inert: true, 'aria-hidden': 'true' } : { role: 'region', 'aria-label': vals.narrow ? 'Desktop recommended' : 'Welcome to Atmos Gallery' })} style={sx('position:fixed;inset:0;height:100dvh;z-index:150;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:clip;background:var(--surface)')}>
          {/* scatter field (decorative) — one global light (upper-left); everything baked or static */}
          <div data-orbit-bloom="1" aria-hidden="true" style={sx('position:absolute;inset:0;pointer-events:none')}></div>
          <div data-orbit="1" aria-hidden="true" style={sx('position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none')}>
            <div data-orbit-list="1" style={sx('display:grid;place-items:center')}>
              {vals.orbitSlots.map((slot) => (
                <div key={slot} data-orbit-item="1" style={sx('position:relative;grid-area:1/1;display:flex;align-items:center;justify-content:center;width:max-content;height:max-content;will-change:transform')}>
                  {/* Contract exception: the circular clip belongs to the depicted OBJECT (a 3D colour orb),
                      never to chrome. Float wrapper: engine writes --fy, float tween writes --ph. */}
                  <div data-orb-float="1" style={{ ...sx('position:relative;display:flex;align-items:center;justify-content:center'), transform: 'translateY(calc(var(--fy, 0px) * var(--ph, 0)))' }}>
                    <div data-orbit-card={String(slot)} style={{ ...sx('position:relative;z-index:1;overflow:hidden;isolation:isolate;width:clamp(56px,6vw,104px);aspect-ratio:1;border-radius:50%;background-size:cover;background-position:center;background-color:var(--surface-raised)'), WebkitClipPath: 'circle(50% at 50% 50%)', clipPath: 'circle(50% at 50% 50%)' }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div aria-hidden="true" style={sx('position:absolute;inset:0;z-index:3;pointer-events:none;background:radial-gradient(120% 100% at 50% 46%, transparent 58%, color-mix(in srgb, var(--on-surface) 8%, transparent) 100%)')}></div>
          <div data-orbit-grain="1" aria-hidden="true" style={sx('position:absolute;inset:0;z-index:4;pointer-events:none;mix-blend-mode:soft-light;opacity:0.045;background-repeat:repeat')}></div>
          {/* brand content (above the field) — horizontal padding only: any vertical padding would
              bias the block off the viewport centre the rings clear for it */}
          <div style={sx('position:relative;z-index:2;display:flex;flex-direction:column;align-items:center;text-align:center;pointer-events:none;padding:0 var(--page-gutter)')}>
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
                    block instead: the orbs still pass through, they just pass through dimmer, and
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
                <div data-gate-actions="1" style={sx('position:relative;z-index:1;display:flex;flex-direction:column;align-items:stretch;gap:9px;width:100%;max-width:240px;align-self:center;margin-top:26px;pointer-events:auto')}>
                  {vals.gateHasExample && (
                    <button type="button" data-ix="cta" data-focus="chrome" onClick={vals.gateExample} aria-label="Open an example palette, read only" style={sx('display:flex;align-items:center;justify-content:center;width:100%;min-height:46px;background:var(--on-surface);border:1px solid var(--on-surface);color:var(--surface);font-family:Neue Montreal;font-size:var(--fs-label);letter-spacing:var(--track-flat);cursor:pointer;-webkit-tap-highlight-color:transparent')}>Try an example</button>
                  )}
                  <button type="button" data-ix="press" data-focus="chrome" onClick={vals.gateCopyLink} aria-label="Copy the link to Atmos Gallery so you can open it on a desktop" style={sx('display:flex;align-items:center;justify-content:center;gap:7px;width:100%;min-height:46px;background:none;border:1px solid var(--action-line);color:var(--on-surface);font-family:Neue Montreal;font-size:var(--fs-label);letter-spacing:var(--track-flat);cursor:pointer;-webkit-tap-highlight-color:transparent')}>
                    {vals.gateLinkCopied ? (<><IconCheck />Link copied</>) : 'Save for desktop'}
                  </button>
                </div>
              </div>
            ) : (
              <div style={sx('position: relative; display: flex; flex-direction: column; align-items: center; max-width: 606px')}>
                <h1 style={sx("font-family:'Neue Montreal';font-weight:500;font-size:clamp(28px,4.4vw,40px);line-height:1.16;letter-spacing:var(--track-statement);margin:0;max-width:20ch;text-wrap:balance")}>
                  <span style={sx('display:block;overflow:hidden')}><span data-land-line="1" style={sx('display: block; color: var(--on-surface); font-size:var(--fs-statement); max-width: 507px')}>Colour read from light and atmosphere.</span></span>
                  <span style={sx('display:block;overflow:hidden')}><span data-land-line="1" style={sx('display: block; color: color-mix(in srgb, var(--on-surface) 50%, transparent); font-size:var(--fs-statement)')}>In seconds.</span></span>
                </h1>
                <div style={sx('margin-top:36px;pointer-events:auto')}>
                  <HBtn type="button" data-focus="chrome" data-glass-cta="1" onClick={vals.getStarted} aria-label="Get started" style={vals.glassCta} styleHover={vals.glassCtaHover} styleActive={vals.glassCtaActive}>Get Started</HBtn>
                </div>
              </div>
            )}
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
     more now than it did, because /about opens a context of its own for the orbs.

     [data-app] is kept on the wrapper deliberately. It is what the desktop gate, the wipe's inert
     guards and toggleTheme's crossfade all select on; a document route that dropped it would be a
     surface those three could not see. .doc-route carries what all three share (doc.css); the second
     class is the page's own scope for its measures and layout. */
  if (isDoc(vals.route)) {
    const legal = isLegal(vals.route);
    return (
      <div data-app="1" className={'doc-route ' + (legal ? 'legal-route' : 'about-route')} style={sx('min-height:100vh;display:flex;flex-direction:column;background:var(--surface)')}>
        <div aria-live="polite" role="status" style={liveRegionStyle}>{vals.announce}</div>
        {legal ? <LegalPage vals={vals} /> : <AboutPage vals={vals} />}
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

     THE LANDING IS THE EXCEPTION, and it is deliberate. It used to go with the tool, and the ring
     formation went with it — killed on the way in, rebuilt from scratch on the way back, with a
     stretch of empty gate while the field re-encoded its tiles and re-uploaded. The orbs are the
     brand; they do not blink out because somebody looked at a palette. So the stage stays mounted
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
        <div aria-live="polite" role="status" style={liveRegionStyle}>{vals.announce}</div>
        {vals.showLanding && <LandingStage vals={vals} covered />}
        <div data-logo="1" role="img" aria-label="Atmos Gallery" style={{ ...logoStyle, pointerEvents: 'none' }}></div>
        <MobileExampleList ml={vals.mobileList} />
        <Analytics />
        <SpeedInsights />
      </div>
    );
  }
  if (vals.showMobileShare) {
    return (
      <div data-app="1" style={sx('min-height:100dvh;display:flex;flex-direction:column;background:var(--surface)')}>
        <div aria-live="polite" role="status" style={liveRegionStyle}>{vals.announce}</div>
        {vals.showLanding && <LandingStage vals={vals} covered />}
        {/* The same mark the front page draws, in the same place: fixed, 165x26, the drifting
            gradient under a difference blend. Opening an example must not change the brand. */}
        <div data-logo="1" role="img" aria-label="Atmos Gallery" style={{ ...logoStyle, pointerEvents: 'none' }}></div>
        <MobileShareView ms={vals.mobileShare} />
        {/* mounted on BOTH return paths — a shared link on a phone never reaches the one below */}
        <Analytics />
        <SpeedInsights />
      </div>
    );
  }
  return (
    <div data-app="1" style={sx('min-height:100vh;display:flex;flex-direction:column;background:var(--surface)')}>

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
                Refine palette edits one, Add to project files one. */}
            <B006 data-emphasis="primary" onClick={vals.reset} label={<span style={sx('display:flex;align-items:center;height:14px')}>New palette</span>} />
            {vals.showProjectsBar && (<span aria-hidden="true" style={sx('width:1px;height:22px;flex:none;background:var(--line-strong)')}></span>)}
          </>)}
          {vals.showProjectsBar && (
            <div style={sx('display:flex;align-items:center;gap:8px')}>
              <div style={sx('position:relative;display:flex')}>
                <button type="button" data-ix="press" data-focus="chrome" aria-haspopup="menu" aria-expanded={vals.backupMenuOpen} onClick={vals.toggleBackupMenu} aria-label="Back up your library to a file" style={vals.tier3BtnStyle}><TextSwap>Back up</TextSwap><span aria-hidden="true" style={{ fontSize: 'var(--fs-nano)' }}>▾</span></button>
                {vals.backupMenuOpen && (<>
                  <div style={sx('position:fixed;inset:0;z-index:40')} onClick={vals.toggleBackupMenu} aria-hidden="true"></div>
                  <div role="menu" style={sx('position:absolute;top:calc(100% + 6px);right:0;z-index:41;min-width:230px;background:var(--surface);border:1px solid var(--line-strong);box-shadow:0 12px 30px rgba(0,0,0,.18);display:flex;flex-direction:column')}>
                    {vals.showBackUpProject && (
                      <button type="button" role="menuitem" data-ix="cell" data-focus="chrome" onClick={vals.backUpProject} style={sx('display:flex;flex-direction:column;gap:2px;text-align:left;background:none;border:none;border-bottom:1px solid var(--line);padding:var(--btn-pad-lg);cursor:pointer;color:var(--on-surface);font:inherit')}>
                        <span style={sx('font-family:Neue Montreal;font-size:var(--fs-detail)')}>Back up this project</span>
                        <span style={sx('font-family:Neue Montreal;font-size:var(--fs-label);color:var(--on-surface-muted)')}>{vals.activeScopeLabel}</span>
                      </button>
                    )}
                    {/* No text-transform here, unlike the item above it once had: this label is a
                        written line, and capitalize sets every word of it, so "Every project and
                        Unfiled" came out with a capital A on the conjunction. It went unnoticed
                        while the line read "Every project + Unfiled", because capitalize has
                        nothing to do to a plus sign. Sentence case, as authored. */}
                    <button type="button" role="menuitem" data-ix="cell" data-focus="chrome" onClick={vals.backUpLibrary} style={sx('display: flex; flex-direction: column; gap: 2px; text-align: left; background: none; border: none; padding: var(--btn-pad-lg); cursor: pointer; color: var(--on-surface); font: inherit')}>
                      <span style={sx('font-family:Neue Montreal;font-size:var(--fs-detail)')}>Back up whole library</span>
                      <span style={sx('font-family:Neue Montreal;font-size:var(--fs-label);color:var(--on-surface-muted)')}>Every project and Unfiled</span>
                    </button>
                  </div>
                </>)}
              </div>
              <button type="button" data-ix="press" data-focus="chrome" onClick={vals.onRestore} aria-label="Restore palettes from a backup file" style={vals.tier3BtnStyle}><TextSwap>Restore</TextSwap></button>
              <input ref={vals.projectFileRef} type="file" accept="application/json,.json" onChange={vals.onProjectFileChange} tabIndex={-1} aria-hidden="true" style={{ display: 'none' }} />
            </div>
          )}
        </div>
      </header>

      <main aria-busy={vals.busy} style={sx('width: 100%; flex: 1; min-height: 500px; display: flex; flex-direction: column; justify-content: center; padding: 24px var(--page-gutter) 8px')}>

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
            {/* Sentence case, as authored — no capitalize here. The transform this line used to carry
                is the same one that made "Every project and Unfiled" read "Every Project And Unfiled"
                in the library menu above: it capitalizes every word, so "Choose image" would come out
                "Choose Image". */}
            <span style={sx('display:block;overflow:hidden')}><span data-drop-line="1" style={sx('display:block;font-family: Neue Montreal; font-size:var(--fs-body); letter-spacing:var(--track-flat); color: var(--on-surface); border-bottom: 1px solid var(--on-surface); padding-bottom: 3px')}>Choose image</span></span>
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
                eye does. The hairline divides by CONSEQUENCE: ahead of it the two acts that leave
                something behind, behind it the four that only read this palette back to you. It is
                the same row, in the same order, as the fullscreen detail's footer — one grammar,
                two surfaces. (Share is here and not there: only this view holds a shareable URL.)

                Every control except Export is now the same outlined tier, at the same weight and
                the same ink. The copy actions used to be a lighter third tier; it failed its own
                hover state on contrast, so it is gone — see the emphasis block in global.css. What
                the weight difference used to say, position and the hairline now say instead.

                One 8px rhythm across the whole row, matching the archive header's bar. */}
            <div style={sx('display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:18px 0 0')}>
              {/* TIER 1 — and which act holds it depends on where the palette is in its life.
                  A palette that has never been refined is not ready to export: its roles are the
                  tool's guess, and the Export dialog has been saying "refine before shipping" to a
                  user with nowhere to do it. So Refine leads until the palette carries a decision,
                  and Export takes over once it does. Still exactly ONE filled control either way —
                  the two never both light up, per the two-tier rule. */}
              <B006 data-emphasis="primary" onClick={vals.openRefine} disabled={vals.refineDisabled} aria-haspopup="dialog" aria-label={vals.refineAria} label={refineB006Label} />
              {/* filing changes the archive, so it stays on the committing side of the
                  hairline. Disabled while the palette is only in the URL — a shared palette has no
                  record to file until it is saved, and the strip above already offers that. */}
              <B006 data-emphasis="secondary" onClick={vals.openAssignCurrent} disabled={vals.assignDisabled} aria-haspopup="dialog" aria-label={vals.assignCurAria} label={assignB006Label(vals.assignLabel)} />
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
                <CopyMenu open={vals.copyMenuOpen} done={vals.copyDone} onToggle={vals.toggleCopyMenu} onKey={vals.copyMenuKey} onHex={vals.copyHexList} onCss={vals.copyCss} />
                <B006 data-emphasis="secondary" onClick={vals.openExport} aria-haspopup="dialog" aria-label="Export this palette as design tokens" label={exportB006Label} />
              </div>
              {/* SHARE is neither editing nor output formatting, and it is the only act here that
                  reaches outside this browser. A flexible gap, not another hairline: the distance
                  is the statement. When the row wraps it lands alone at the right of its own line,
                  which keeps the reading intact instead of dropping it into the middle of a group. */}
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
                    (three of the eight seeds), and an empty flex row still spends its 18px margin. */}
                {vals.result.hasTraits && (
                <div data-fx="1" style={sx('display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin-top:18px')}>
                  {vals.result.traits.map((d, di) => (
                    <span key={di} style={sx('display:inline-flex;align-items:center;min-height:26px;font-family: Neue Montreal; font-size:var(--fs-label); letter-spacing:var(--track-flat); padding: 0 8px; border-width: 1px; border-style: solid; border-color: color-mix(in srgb, var(--on-surface) 15%, transparent); background: color-mix(in srgb, var(--on-surface) 9%, var(--surface)); color: var(--on-surface); text-transform: uppercase')}>{d}</span>
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
            <button type="button" data-ix="cta" data-focus="chrome" onClick={vals.onBrowse} style={sx('background:var(--on-surface);border:1px solid var(--on-surface);padding:var(--btn-pad-lg);font-family:Neue Montreal;font-size:var(--fs-label);letter-spacing:var(--track-flat);color:var(--surface);cursor:pointer')}>Choose another image</button>
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
      <TagFilterDrawer vals={vals} />
      <ExportDialog vals={vals} />
      <RecogniseDialog vals={vals} />
      <AssignDialog vals={vals} />
      <ManageDialog vals={vals} />
      <RefineDialog vals={vals} />
      <RestoreDialog vals={vals} />

      {vals.hasToast && (
        <div style={sx('position:fixed;left:0;right:0;bottom:28px;z-index:130;display:flex;justify-content:center;pointer-events:none')}>
          <div data-toast="1" role="status" aria-live="polite" style={sx('display:flex;align-items:center;gap:16px;background:var(--surface-raised);color:var(--on-surface);border:1px solid var(--line-strong);padding:11px 12px 11px 18px;box-shadow:0 14px 36px rgba(0,0,0,.24);pointer-events:auto')}>
            {/* No capitalize transform: it Title-Cased whole sentences ("Dry Season Deleted"). The
                label arrives as a natural sentence — the palette's own name keeps its case, the
                verb stays lowercase — and a status line is prose, not a button. */}
            <span style={sx("font-family: 'Neue Montreal'; font-size:var(--fs-body); letter-spacing:var(--track-flat); white-space: nowrap")}>{vals.toastLabel}</span>
            <HBtn type="button" data-undo-btn="1" data-ix="press" data-focus="chrome" onClick={vals.undoDelete}
              style={sx('font-family:Neue Montreal;font-size:var(--fs-label);letter-spacing:.12em;text-transform:uppercase;background:none;border:1px solid var(--action-line);color:var(--on-surface);padding:7px 13px;cursor:pointer')}
              styleHover={{ background: 'var(--on-surface)', color: 'var(--surface)' }}>Undo</HBtn>
            {/* The toast no longer times out (it holds an action — see the note in overlays.js), so
                letting the undo go needs a control of its own. Icon-only, so it carries a name; a
                30px square clears the 24px hit floor. */}
            <button type="button" data-ix="press" data-focus="chrome" aria-label="Dismiss, keep the deletion" onClick={vals.onDismissToast} style={sx('width:30px;height:30px;flex:none;display:inline-flex;align-items:center;justify-content:center;background:none;border:1px solid var(--action-line);padding:0;font-family:Neue Montreal;font-size:var(--fs-label);color:var(--on-surface);cursor:pointer')}>✕</button>
          </div>
        </div>
      )}

      {vals.hasNotice && (
        <div data-notice="1" role="status" style={sx('position:fixed;left:20px;bottom:20px;z-index:128;display:flex;align-items:center;gap:9px;background:var(--surface-raised);border:1px solid var(--line-strong);color:var(--on-surface-muted);padding:9px 13px;max-width:340px;box-shadow:0 10px 28px rgba(0,0,0,.16)')}>
          <span aria-hidden="true" style={sx('width:6px;height:6px;flex:none;background:var(--on-surface-muted)')}></span>
          <span style={sx('font-family:Neue Montreal;font-size:var(--fs-label);line-height:1.4;letter-spacing:.01em;text-wrap:pretty')}>{vals.notice}</span>
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
  //   projects  [ All 8 ][ Unfiled 7 ]  Manage projects
  //   toolbar   [ Filter 1 ][ Text-ready ✕ ][ Clear filters ]  Showing 5 of 8 palettes
  //   ─────────────────────────────────────────────────────────────────────────────
  //   header    Palette                        AA pairs · Max contrast · Created ↓
  //
  // The right edge used to carry the view toggle, Manage projects and a palette count in a neat
  // vertical stack — three controls sharing an edge and nothing else. Tidy, and wrong: the only
  // thing that belongs against the heading is the switch that redraws the whole section, because
  // that is the only other control scoped to the whole section. Manage went back to the projects
  // it manages. The count went to the toolbar, because it is not a fact about the library — it is
  // the RESULT of filtering, and it now appears only when filtering is doing something.
  //
  // Where am I → which project → what is being held back → how it is ordered → the list.

  // BAND 2 — PROJECTS, AND EVERYTHING ABOUT PROJECTS. The chips navigate between them, Manage
  // creates and renames them; both are the same subject and now sit together, separated only by
  // the gap that keeps a segmented control from swallowing an adjacent button. Manage stays
  // OUTSIDE the group's border — inside it, after a hairline and in chip clothes, it read as a
  // fourth scope. The pill selects [data-proj-chip][aria-pressed="true"] and Manage carries
  // neither that nor aria-pressed, so it was never at risk of being SELECTED, only of looking
  // selectable.
  const viewRow = vals.showProjectsBar && (
    // stretch, not center: Manage takes its height FROM the chip group (34px next to its 30px of
    // border-plus-padding), so the two can never disagree again — a hardcoded matching height
    // would have agreed until the next padding-token edit. Manage centers its own label.
    // 12px below, matching the 12px BETWEEN the group and Manage Projects. One number for the gap
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

          FOUR OF TWELVE, derived rather than guessed — see the max-width note in global.css. The
          group takes as much of that frame as it needs and no more (flex 0 1 auto, never 1), so a
          library with two short scopes is not a wide box mostly full of nothing; past four columns
          the chips scroll inside it and the shadow cue in global.css finally has work to do. */}
      <div role="group" data-proj-group="1" aria-label="Library view" style={sx('position:relative;display:inline-flex;align-items:stretch;padding:2px;border:1px solid var(--action-line);flex:0 1 auto;min-width:0;overflow-x:auto')}>
        <span data-proj-pill="1" aria-hidden="true" style={sx('position:absolute;top:0;left:0;width:0;height:0;background:var(--on-surface);opacity:0;pointer-events:none')}></span>
        {vals.projectChips.map((ch) => (
          /* The label is its own span so it can be the ONLY part that truncates. As a bare text
             node beside the count there was nothing to put an ellipsis on, and a 46-character
             project name simply became a 294px chip — one name eating the whole frame. */
          <button key={ch.key} type="button" data-proj-chip="1" data-ix="seg" data-focus="chrome" aria-pressed={ch.active} aria-label={ch.aria} title={ch.title} onMouseDown={ch.onMouseDown} onFocus={ch.onFocus} onClick={ch.onClick} style={ch.chipStyle}><span style={ch.labelStyle}>{ch.label}</span><span style={ch.countStyle}>{ch.count}</span></button>
        ))}
      </div>
      <button type="button" data-proj-manage="1" data-ix="press" data-focus="chrome" aria-haspopup="dialog" onClick={vals.onOpenManage} aria-label="Manage Projects: create, rename, or delete" style={vals.projManageStyle}><TextSwap>Manage Projects</TextSwap></button>
      {/* HOW the section is drawn, on the row with the controls that decide WHAT it holds. It sat
          on the heading row, which paired it with the title but left it floating above a band of
          same-height bordered controls it never lined up with. Here the three boxes — chip group,
          Manage Projects, this — share one baseline and one row; align-items:stretch already gives
          them a common height, so the alignment is structural rather than three matching numbers.
          margin-inline-start:auto keeps it at the far edge, away from the pair it does not join. */}
      {vals.feedHasItems && (
        <div role="group" aria-label="Feed layout" data-toggle-init="1" style={sx('position:relative;display:inline-grid;grid-template-columns:repeat(3,1fr);padding:2px;border:1px solid var(--action-line);background:transparent;margin-inline-start:auto')}>
          <span aria-hidden="true" style={vals.viewTogglePill}></span>
          <button type="button" data-toggle-btn="1" data-ix="seg" data-focus="chrome" aria-pressed={vals.listPressed} tabIndex={vals.listTab} onClick={vals.setList} onKeyDown={vals.viewToggleKey} style={vals.listToggleStyle}>List</button>
          <button type="button" data-toggle-btn="1" data-ix="seg" data-focus="chrome" aria-pressed={vals.gridPressed} tabIndex={vals.gridTab} onClick={vals.setGrid} onKeyDown={vals.viewToggleKey} style={vals.gridToggleStyle}>Grid</button>
          <button type="button" data-toggle-btn="1" data-ix="seg" data-focus="chrome" aria-pressed={vals.reelPressed} tabIndex={vals.reelTab} onClick={vals.setReel} onKeyDown={vals.viewToggleKey} style={vals.reelToggleStyle}>3D</button>
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
  // data-applied-filters: the panel dismisses on any pointerdown outside itself, and this bar is
  // the exception — everything on it IS filtering, just parked outside the panel so the state
  // stays visible when it is shut. Removing a narrowing should not also put away the surface you
  // would remove the next one from.
  const filterRow = vals.showProjectsBar && vals.showFacet && (
    <div role="toolbar" aria-label="Filter and result count" aria-controls="library-list" data-filter-toolbar="1" data-applied-filters="1" onKeyDown={vals.toolbarKey} style={sx('display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px')}>
      <button type="button" data-facet-btn="1" data-ix="press" data-focus="chrome" aria-haspopup="dialog" aria-expanded={vals.facetOpen} onClick={vals.openFacet} aria-label={vals.filterAria} style={sx('display:inline-flex;align-items:center;gap:7px;background:none;border:1px solid var(--action-line);padding:var(--btn-pad-sm);font-family:Neue Montreal;font-size:var(--fs-label);letter-spacing:var(--track-flat);color:var(--on-surface);cursor:pointer')}>
        {/* The count stays outside the swap: it is a badge reporting state, not part of the word,
            and a number sliding while its noun slides beside it reads as two things leaving. */}
        <TextSwap>Filter</TextSwap>{vals.filterCount && <span style={sx('font-family:Neue Montreal;font-size:var(--fs-micro);color:var(--on-surface-muted);font-variant-numeric:tabular-nums')}>{vals.filterCount}</span>}
      </button>
      {/* One chip per applied filter across every group — accessibility first, matching the
          panel's group order — each removable on its own, so a narrowing can be undone from
          either end. capitalize rather than uppercase: the labels arrive in mixed case from the
          facet tables ("Text-Ready") and lowercase from the open tag vocabulary ("golden"), and
          this is the one rule that renders both as words. */}
      {vals.appliedTags.map((t) => (
        <button key={t.key} type="button" data-ix="cta" data-focus="chrome" aria-label={t.aria} onClick={t.onRemove} style={sx('display:inline-flex;align-items:center;gap:7px;background:var(--on-surface);border:1px solid var(--on-surface);padding:var(--btn-pad-sm);font-family:Neue Montreal;font-size:var(--fs-label);letter-spacing:var(--track-flat);color:var(--surface);cursor:pointer')}>
          {t.label}<span aria-hidden="true" style={{ fontSize: 'var(--fs-micro)' }}>✕</span>
        </button>
      ))}
      {/* Absent when nothing is applied — an escape from a state you are not in is one more
          control to read past on every visit that does not need it. No aria-label: the visible
          text is the accessible name, so label-in-name (SC 2.5.3) can never drift. */}
      {vals.anyFilter && (
        <button type="button" data-ix="press" data-focus="chrome" onClick={vals.onClearAll} style={sx('background:none;border:1px solid var(--action-line);padding:var(--btn-pad-sm);font-family:Neue Montreal;font-size:var(--fs-label);letter-spacing:var(--track-flat);color:var(--on-surface);cursor:pointer')}>Clear filters</button>
      )}
      {/* SPOKEN, NOT PRINTED. "Showing 5 of 8 palettes" is redundant on screen — the list below IS
          the count, and a filtered list that visibly shrank does not need a sentence saying so.
          It is NOT redundant to a screen reader: the filter setters announce "Added Balanced
          filter" and stop, so without this the one thing you cannot perceive — how much was left —
          would go unsaid. The element stays, in the app's own visually-hidden live-region style,
          and stays MOUNTED even when empty because a live region has to be in the DOM before the
          change it announces. */}
      <span role="status" aria-live="polite" style={liveRegionStyle}>{vals.resultSummary}</span>
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
        {/* A SIBLING of the h2, never a child: the section is named by that heading through
            aria-labelledby, so anything inside it would rename the whole region. The button's own
            aria-label is what states the subject, so the fact is available without opening
            anything — it is the visible SENTENCE that has gone, not the information.

            Same toggletip as the AA column's, down to the 16px box and the click-catcher: one
            mechanism for "explain this", used twice, so neither has to be learned separately.
            Opens left because this one sits at the page's left edge, not its right. */}
        {vals.storeInfo && (
          <div style={sx('position:relative;display:inline-flex;flex:none')}>
            <button type="button" data-ix="press" data-hit="24" data-focus="chrome" aria-expanded={vals.storeInfoOpen} aria-label={vals.storeInfo.aria} onClick={vals.toggleStoreInfo} onKeyDown={vals.storeInfoKey} style={sx('width:16px;height:16px;display:inline-flex;align-items:center;justify-content:center;background:transparent;border:1px solid var(--action-line);padding:0;font-family:Neue Montreal;font-size:var(--fs-micro);color:var(--on-surface-muted);cursor:pointer')}>{vals.storeInfo.glyph}</button>
            {vals.storeInfoOpen && (<>
              <div style={sx('position:fixed;inset:0;z-index:40')} onClick={vals.toggleStoreInfo} aria-hidden="true"></div>
              <div data-tip="store" role="note" style={sx('position:absolute;top:calc(100% + 6px);left:0;z-index:41;width:288px;background:var(--surface);border:1px solid var(--line-strong);box-shadow:0 12px 30px rgba(0,0,0,.18);padding:12px 14px;display:flex;flex-direction:column;gap:9px')}>
                {vals.storeInfo.lines.map((t, i) => (
                  <span key={i} style={sx('font-family:Neue Montreal;font-size:var(--fs-detail);line-height:1.5;color:' + (i === 0 ? 'var(--on-surface)' : 'var(--on-surface-muted)') + ';text-wrap:pretty')}>{t}</span>
                ))}
              </div>
            </>)}
          </div>
        )}
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
            <button type="button" data-ix="press" data-focus="chrome" onClick={vals.onRemoveLast} style={sx('background:none;border:1px solid var(--action-line);padding:var(--btn-pad-md);font-family:Neue Montreal;font-size:var(--fs-label);letter-spacing:var(--track-flat);color:var(--on-surface);cursor:pointer')}>Remove last filter</button>
            <button type="button" data-ix="press" data-focus="chrome" onClick={vals.onClearAll} style={sx('background:none;border:1px solid var(--action-line);padding:var(--btn-pad-md);font-family:Neue Montreal;font-size:var(--fs-label);letter-spacing:var(--track-flat);color:var(--on-surface);cursor:pointer')}>Clear filters</button>
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
                  {/* the flexible child WITHIN identity — it absorbs every difference in name
                      length, so the cell's own contents settle without moving the columns beside
                      it (they are grid tracks now, and no amount of name is a bid on them).
                      Filter-in-context: each tag is a button riding above the stretched hit
                      surface (z2 over z1) — clicking a tag filters, clicking anywhere else loads
                      the palette. Same quiet voice as before; the active tag steps up in weight
                      and ink and carries aria-pressed. */}
                  <span style={sx('flex:1;min-width:0;display:flex;align-items:center;gap:2px;overflow:hidden')}>
                    {c.descriptorParts.map((d, di) => (
                      <button key={di} type="button" data-ix="press" data-focus="chrome" disabled={c.disabled} aria-pressed={d.pressed} aria-label={d.aria} onClick={d.onClick} style={{ ...c.tagBtnBase, ...(d.on ? c.tagOn : c.tagOff) }}>{d.text}</button>
                    ))}
                  </span>
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
                  static about them is here. 6px apart, unchanged. */}
              <button type="button" data-ix="press" data-del="1" data-focus="chrome" aria-label={c.assignAria} onClick={c.onAssign} style={sx('position:absolute;right:calc(var(--row-action-offset) + 36px);z-index:6;width:30px;height:30px;padding:0;display:inline-flex;align-items:center;justify-content:center;background:var(--surface);border:1px solid var(--action-line);color:var(--on-surface);cursor:pointer')}>
                <IconFolder />
              </button>
              <button type="button" data-ix="press" data-del="1" data-focus="chrome" aria-label={c.deleteAria} onClick={c.onDelete} style={sx('position:absolute;right:var(--row-action-offset);z-index:6;width:30px;height:30px;padding:0;display:inline-flex;align-items:center;justify-content:center;background:var(--surface);border:1px solid var(--action-line);color:var(--on-surface);cursor:pointer')}>
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
                <button type="button" data-ix="press" data-focus="chrome" disabled={vals.prevDisabled} aria-label="Previous page" onClick={vals.prevPage} style={vals.prevStyle}>Prev</button>
                <span aria-live="polite" style={sx('font-family:Neue Montreal;font-size:var(--fs-detail);letter-spacing:var(--track-flat);color:var(--on-surface-muted);white-space:nowrap;font-variant-numeric:tabular-nums')}>{vals.pageLabel}</span>
                <button type="button" data-ix="press" data-focus="chrome" disabled={vals.nextDisabled} aria-label="Next page" onClick={vals.nextPage} style={vals.nextStyle}>Next</button>
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
            <button ref={vals.universeCloseRef} type="button" data-ix="press" data-focus="chrome" onClick={vals.setList} aria-label="Close palette universe" style={sx('pointer-events: auto; display: inline-flex; align-items: center; gap: 9px; background: var(--surface); border: 1px solid var(--action-line); padding: var(--btn-pad-md); font-family: Neue Montreal; font-size:var(--fs-label); letter-spacing:var(--track-flat); text-transform: uppercase; color: var(--on-surface); cursor: pointer')}>Close <span aria-hidden="true"><TextSwap>Esc</TextSwap></span></button>
          </div>

          {vals.universeEngine && (
            <span data-universe-chrome="1" aria-hidden="true" style={sx('position:absolute;left:20px;bottom:18px;z-index:5;font-family:Neue Montreal;font-size:var(--fs-label);letter-spacing:.06em;text-transform:uppercase;color:var(--on-surface-muted);background:color-mix(in srgb, var(--surface-raised) 88%, transparent);padding:5px 9px;border:1px solid var(--line);pointer-events:none')}>Drag or scroll to explore</span>
          )}
        </div>

        {/* FULLSCREEN 3D TORNADO: helix of palette cards (items built imperatively) */}
        <div data-reel-layer="1" role="region" aria-label="3D palette view" style={vals.reelStyle}>
          <div data-reel-stage="1" style={sx('position:absolute;inset:0;overflow:clip;overscroll-behavior:none;cursor:grab;touch-action:none')}>
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
            <button ref={vals.reelCloseRef} type="button" data-ix="press" data-focus="chrome" onClick={vals.setList} aria-label="Close reel" style={sx('pointer-events:auto;display:inline-flex;align-items:center;gap:9px;background:var(--surface);border:1px solid var(--action-line);padding:var(--btn-pad-md);font-family:Neue Montreal;font-size:var(--fs-label);letter-spacing:var(--track-flat);color:var(--on-surface);cursor:pointer')}>Close <span aria-hidden="true"><TextSwap>Esc</TextSwap></span></button>
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
          <button type="button" data-ix="press" data-focus="chrome" onClick={vals.closeContrast} aria-label="Close contrast checker" style={sx('flex: none; background: none; border: 1px solid var(--action-line); padding: var(--btn-pad-md); font-family: Neue Montreal; font-size:var(--fs-label); letter-spacing:var(--track-flat); text-transform: uppercase; color: var(--on-surface); cursor: pointer')}><TextSwap>Close</TextSwap></button>
        </header>

        <div data-cx-sec="1" style={sx('display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:18px var(--page-gutter) 0')}>
          <div style={{ display: 'flex' }} role="group" aria-label="WCAG level">
            <button type="button" data-ix="seg" data-focus="chrome" onClick={contrast.setAA} aria-pressed={contrast.aaPressed} style={contrast.aaStyle}><TextSwap>AA</TextSwap></button>
            <button type="button" data-ix="seg" data-focus="chrome" onClick={contrast.setAAA} aria-pressed={contrast.aaaPressed} style={contrast.aaaStyle}><TextSwap>AAA</TextSwap></button>
          </div>
          <div style={{ display: 'flex' }} role="group" aria-label="Text size">
            <button type="button" data-ix="seg" data-focus="chrome" onClick={contrast.setNormal} aria-pressed={contrast.normalPressed} style={contrast.normalStyle}><TextSwap>Normal</TextSwap></button>
            <button type="button" data-ix="seg" data-focus="chrome" onClick={contrast.setLarge} aria-pressed={contrast.largePressed} style={contrast.largeStyle}><TextSwap>Large</TextSwap></button>
          </div>
          <button type="button" data-ix="seg" data-focus="chrome" onClick={contrast.togglePass} aria-pressed={contrast.passPressed} style={contrast.passStyle}><TextSwap>{contrast.passLabel}</TextSwap></button>
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
                      <span aria-hidden="true" style={c.style}></span>
                    </div>
                  ))}
                </>)}
                {row.isBody && (<>
                  <div style={sx('width:34px;flex:none;display:flex;align-items:center;justify-content:center')}>
                    <span aria-hidden="true" style={row.chip.style}></span>
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
              <div key={ti} style={t.style}>
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
          <div data-cx-sample="1" style={contrast.sampleStyle}>The quick brown fox jumps over the lazy dog</div>
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
          <button type="button" data-ix="press" data-focus="chrome" aria-label={overlay.deleteAria} onClick={overlay.onDelete} style={sx('display:inline-flex;align-items:center;gap:8px;background:none;border:1px solid var(--action-line);padding:var(--btn-pad-md);font-family:Neue Montreal;font-size:var(--fs-label);letter-spacing:var(--track-flat);color:var(--on-surface);cursor:pointer')}>
            <IconTrash />Delete</button>
          <button type="button" data-ix="press" data-focus="chrome" aria-label="Close palette detail" onClick={vals.closeOverlay} style={sx('display:inline-flex;align-items:center;gap:9px;background:none;border:1px solid var(--action-line);padding:var(--btn-pad-md);font-family:Neue Montreal;font-size:var(--fs-label);letter-spacing:var(--track-flat);color:var(--on-surface);cursor:pointer')}><TextSwap>Close</TextSwap></button>
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
              different set of controls. The hairline divides by consequence — ahead of it the two
              acts that leave something behind, behind it the ones that only read the palette back
              to you, Contrast first because inspecting comes before copying. (No Share here: the
              overlay has no shareable URL, so the group behind the hairline is a trio, not four.) */}
          <div style={sx('display:flex;align-items:center;gap:8px;flex-wrap:wrap')}>
            {/* Filing leads here. On the result view the filled tier belongs to Refine, the one
                creative act in the row; this surface has no Refine, so it goes to the act that is
                first in the same sequence and available — organise, then validate, then output. */}
            <B006 data-emphasis="primary" onClick={overlay.onAssign} aria-haspopup="dialog" aria-label={overlay.assignAria} label={assignB006Label(overlay.assignLabel)} />
            <div style={sx('display:flex;align-items:center;gap:8px;flex-wrap:nowrap;padding-inline-start:8px;border-inline-start:1px solid var(--line-strong)')}>
              <B006 data-emphasis="secondary" onClick={vals.openContrast} disabled={vals.contrastDisabled} aria-haspopup="dialog" aria-label="Open contrast checker for this palette" label={contrastB006Label} />
              <CopyMenu open={vals.copyMenuOpen} done={overlay.copyDone} onToggle={vals.toggleCopyMenu} onKey={vals.copyMenuKey} onHex={overlay.copyHexList} onCss={overlay.copyCss} />
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

function TagFilterDrawer({ vals }) {
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
      <div data-tag-dialog="1" data-lenis-prevent="1" role="dialog" aria-label="Filter palettes" style={sx('position:absolute;right:0;top:0;bottom:0;width:480px;max-width:94vw;pointer-events:auto;background:var(--surface);border-left:1px solid var(--line-strong);box-shadow:-18px 0 40px rgba(0,0,0,.10);display:flex;flex-direction:column;overflow-y:auto')}>
        {/* STICKY, and it is the state that makes it necessary rather than the title. The count, the
            applied chips and Clear all are what you consult while choosing, and the Character list
            is long enough that choosing scrolls all three off the top — so the panel answered "did
            that help?" only if you happened to be near the top of it. Sticky inside the panel's own
            scroll container, opaque, so rows pass underneath rather than through. */}
        <header data-tg-sec="1" style={sx('position:sticky;top:0;z-index:3;display:flex;flex-direction:column;gap:10px;padding:20px var(--page-gutter) 12px;background:var(--surface);border-bottom:1px solid transparent')}>
          <OvRule edge="bottom" />
        <div style={sx('display:flex;align-items:flex-start;justify-content:space-between;gap:12px')}>
          <div style={sx('display:flex;flex-direction:column;gap:9px;min-width:0')}>
            {/* ONE TITLE. "Archive filter" over "Filters" spent two levels naming one surface, and
                neither of them named the thing being filtered. */}
            <span style={sx('display:flex;align-items:center;gap:9px;min-width:0')}>
              <span data-drawer-split="1" style={sx("font-family:'Neue Montreal';font-weight:500;font-size:var(--fs-subtitle);letter-spacing:-.01em;color:var(--on-surface)")}>Filter library</span>
              {/* The rules of the panel, on the title that owns them. Same 16px control, same 288px
                  sheet, same easing as the Library heading and the AA badge — a third variant would
                  make the pattern a coincidence rather than a convention. */}
              <span style={sx('position:relative;display:inline-flex;flex:none')}>
                <button type="button" data-ix="press" data-hit="24" data-focus="chrome" aria-expanded={vals.filterInfoOpen} aria-label="How filters combine, and what the text usability bands mean" onClick={vals.toggleFilterInfo} onKeyDown={vals.filterInfoKey} style={sx('width:16px;height:16px;display:inline-flex;align-items:center;justify-content:center;background:transparent;border:1px solid var(--action-line);padding:0;font-family:Neue Montreal;font-size:var(--fs-micro);color:var(--on-surface-muted);cursor:pointer')}>i</button>
                {vals.filterInfoOpen && (<>
                  <div style={sx('position:fixed;inset:0;z-index:40')} onClick={vals.toggleFilterInfo} aria-hidden="true"></div>
                  {/* THE COMBINING RULE, THEN THE THREE DEFINITIONS. This was once a standing
                      paragraph over the group and that is the one thing it must not go back to —
                      Text-Ready and Accent Only are answers rather than measurements, so they do
                      need defining somewhere, and "somewhere" is on demand, in the ⓘ that already
                      owns the panel's rules. Set as term/definition rather than prose: three
                      sentences run together is a paragraph nobody finishes. */}
                  <div data-tip="filters" role="note" style={sx('position:absolute;top:calc(100% + 6px);left:0;z-index:41;width:288px;background:var(--surface);border:1px solid var(--line-strong);box-shadow:0 12px 30px rgba(0,0,0,.18);padding:12px 14px;display:flex;flex-direction:column;gap:11px')}>
                    <span style={sx('font-family:Neue Montreal;font-size:var(--fs-detail);line-height:1.5;color:var(--on-surface);text-wrap:pretty')}>Select more than one value in a group to widen results; combine groups to narrow them.</span>
                    <dl style={sx('display:flex;flex-direction:column;gap:7px;margin:0;padding-top:2px;border-top:1px solid var(--line)')}>
                      {vals.a11yDefs.map((d) => (
                        <div key={d.key} style={sx('display:flex;flex-direction:column;gap:1px')}>
                          <dt style={sx('font-family:Neue Montreal;font-weight:500;font-size:var(--fs-label);letter-spacing:var(--track-flat);color:var(--on-surface)')}>{d.label}</dt>
                          <dd style={sx('margin:0;font-family:Neue Montreal;font-size:var(--fs-label);line-height:1.45;color:var(--on-surface-muted);text-wrap:pretty')}>{d.text}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                </>)}
              </span>
            </span>
            {/* THE COUNT IS PRINTED NOW, not only spoken. It was a bare live region on the argument
                that the list behind is undimmed and can be read directly — true when the panel is
                480px of a wide window, false at 94vw on a laptop, where the panel IS the view. It
                keeps role=status, so it is still announced rather than only redrawn. */}
            {/* The metadata voice — the same sentence, size and ink as the toolbar's "Showing x of
                y" outside, because it IS the same fact. The drawer is library-owned chrome, so it
                speaks the library's voices (see the contract in docs/interface-audit.md); only the
                result-stage drawers keep the uppercase label voice. */}
            <span role="status" aria-live="polite" style={sx('font-family:Neue Montreal;font-size:var(--fs-detail);letter-spacing:var(--track-flat);color:var(--on-surface-muted);font-variant-numeric:tabular-nums')}>{vals.matchLabel}</span>
          </div>
          {/* Done, not Close: selections apply live to the list behind, so nothing is pending and
              nothing is cancelled by leaving. */}
          <button type="button" data-ix="press" data-focus="chrome" onClick={vals.closeFacet} aria-label="Done, close filters" style={sx('flex:none;background:none;border:1px solid var(--action-line);padding:var(--btn-pad-md);font-family:Neue Montreal;font-size:var(--fs-label);letter-spacing:var(--track-flat);color:var(--on-surface);cursor:pointer')}><TextSwap>Done</TextSwap></button>
        </div>
        {/* ACTIVE FILTERS, pinned. One removable chip per applied value across every group, and the
            one Clear all. These used to sit at the bottom of the Character list — the longest thing
            in the panel — so the control that undoes a narrowing was furthest from where you
            narrowed. Selected values never leave the screen now, whatever the list below is doing. */}
        {vals.hasAppliedTags && (
          <div style={sx('display:flex;align-items:center;gap:7px;flex-wrap:wrap')}>
            {/* Identical treatment to the toolbar's applied chips outside — same fact, same
                clothes; two renderings of one chip would read as two states. */}
            {vals.appliedTags.map((t) => (
              <button key={t.key} type="button" data-ix="cta" data-focus="chrome" aria-label={t.aria} onClick={t.onRemove} style={sx('display:inline-flex;align-items:center;gap:6px;max-width:100%;min-width:0;background:var(--on-surface);border:1px solid var(--on-surface);padding:var(--btn-pad-sm);font-family:Neue Montreal;font-size:var(--fs-label);letter-spacing:var(--track-flat);color:var(--surface);cursor:pointer')}>
                <span style={sx('min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap')}>{t.label}</span>
                <span aria-hidden="true" style={{ fontSize: 'var(--fs-micro)', flex: 'none' }}>✕</span>
              </button>
            ))}
            {vals.facetClear && (
              <button type="button" data-ix="press" data-focus="chrome" onClick={vals.facetClear.onClear} style={sx('flex:none;background:none;border:1px solid var(--action-line);padding:var(--btn-pad-sm);font-family:Neue Montreal;font-size:var(--fs-label);letter-spacing:var(--track-flat);color:var(--on-surface);cursor:pointer')}>{vals.facetClear.label}</button>
            )}
          </div>
        )}
        </header>


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
                  {/* count sits beside its label (F5), not across the row */}
                  <span style={sx('font-family:Neue Montreal;font-size:var(--fs-micro);color:var(--on-surface-muted);font-variant-numeric:tabular-nums;flex:none')}>{o.count}</span>
                  {/* Nothing at the row's end now but the occasional reason an inert row cannot be
                      picked. The state's meaning left this line for the note above the group: three
                      right-aligned fragments, one per row, clipped to whatever the panel had left,
                      asked the eye to assemble a definition out of a column. */}
                  <span style={sx('flex:1;min-width:0;text-align:end;font-family:Neue Montreal;font-size:var(--fs-micro);letter-spacing:var(--track-flat);color:var(--on-surface-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis')}>{o.disabled ? o.reason : ''}</span>
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
                  <span style={sx('font-family:Neue Montreal;font-size:var(--fs-micro);color:var(--on-surface-muted);font-variant-numeric:tabular-nums;flex:none')}>{o.count}</span>
                  <span style={sx('flex:1;min-width:0;text-align:end;font-family:Neue Montreal;font-size:var(--fs-micro);letter-spacing:var(--track-flat);color:var(--on-surface-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis')}>{o.disabled ? o.reason : ''}</span>
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* CHARACTER — behind a disclosure, because these are READINGS. Graphic and Smouldering are
            interpretations of a palette; lightness and temperature are measurements of it. Ranked as
            equals, the panel invited someone to treat a judgement as a property.
            The vocabulary no longer overlaps either — Restrained and Stark used to be listed here
            AND be Chroma and Contrast values, which is why this comment used to name them. */}
        {/* data-tg-sec: this block held the rule that separates the measured groups from the
            interpretive ones and was not in the arrival at all — so the one divider that carries the
            panel's main distinction was the one thing that appeared instantly. */}
        <div data-tg-sec="1" style={sx('padding:16px calc(var(--page-gutter) - 12px) 0')}>
          <button type="button" data-ix="cell" data-focus="chrome" aria-expanded={vals.charOpen} aria-label={vals.charAria} onClick={vals.toggleChar} style={sx('position:relative;display:flex;align-items:center;gap:8px;width:100%;background:none;border:none;border-top:1px solid transparent;padding:var(--btn-pad-lg);cursor:pointer;color:var(--on-surface);font-family:Neue Montreal;font-size:var(--fs-micro);letter-spacing:var(--track-flat);text-align:left')}>
            <OvRule />
            <span data-refine-chev="1" data-open={vals.charOpen ? '1' : '0'} aria-hidden="true" style={sx('font-size:var(--fs-nano);color:var(--on-surface-muted)')}>▸</span>{vals.charLabel}
          </button>
        </div>
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
            <button type="button" data-ix="seg" data-focus="chrome" aria-pressed={vals.tagSort === 'count'} onClick={vals.sortByCount} style={vals.sortCountStyle}>Most used</button>
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
              {/* Count belongs to the label, so it sits against it — identical placement and
                  styling to the Accessibility group. It used to be parked in a right-hand column
                  past the strip, which made the same fact read as two different kinds of thing
                  depending on which group you were looking at, and put a whole colour strip
                  between a name and its number. */}
              <span style={sx('font-family:Neue Montreal;font-size:var(--fs-micro);color:var(--on-surface-muted);font-variant-numeric:tabular-nums;flex:none')}>{o.count}</span>
              {/* Checkbox, label, count — the same three things every facet row now shows. An
                  exemplar name and a 150px colour strip used to sit here: a sample of ONE palette
                  standing in for a whole tag, which invited the reader to generalise from it, and
                  a second colour object competing with the swatch strips in the list behind. */}
              <span style={sx('flex:1;min-width:0;text-align:end;font-family:Neue Montreal;font-size:var(--fs-micro);letter-spacing:var(--track-flat);color:var(--on-surface-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis')}>{o.disabled ? o.reason : ''}</span>
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
                <button type="button" data-ix="press" data-focus="chrome" onClick={vals.clearTagQuery} style={sx('background:none;border:1px solid var(--action-line);padding:var(--btn-pad-md);font-family:Neue Montreal;font-size:var(--fs-label);letter-spacing:var(--track-flat);color:var(--on-surface);cursor:pointer')}>Clear search</button>
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
              <span data-refine-chev="1" data-open={vals.facetAllOpen ? '1' : '0'} aria-hidden="true" style={sx('font-size:var(--fs-nano);color:var(--on-surface-muted)')}>▸</span>{vals.facetMore.label}
            </button>
          )}
          {/* Clear all is gone from here. It sat at the bottom of the longest list in the panel, so
              the control that undoes a narrowing was furthest from the rows that caused it; it is in
              the sticky header now, beside the count it acts on. */}
        </div>
        </div>)}
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
          <button type="button" data-ix="press" data-focus="chrome" onClick={vals.closeHarmony} aria-label="Done, close colour harmonies" style={sx('flex:none;background:none;border:1px solid var(--action-line);padding:var(--btn-pad-md);font-family:Neue Montreal;font-size:var(--fs-label);letter-spacing:var(--track-flat);color:var(--on-surface);cursor:pointer')}><TextSwap>Done</TextSwap></button>
        </header>

        {/* WHAT YOU CAN DO, not how it was made. The methodology sentence led this drawer and has
            moved into the disclosure at the foot; this line names both acts the surface offers. */}
        <div data-hx-sec="1" style={sx('padding:14px var(--page-gutter) 2px')}>
          <span data-drawer-split="1" style={sx('font-family:Neue Montreal;font-size:var(--fs-detail);line-height:1.5;color:var(--on-surface-muted);text-wrap:pretty')}>Select a colour to copy its hex, or use the full harmony as a palette.</span>
        </div>

        {/* THE SEVEN, AS A CHOICE. They were seven stacked sections of equal weight — a catalogue
            you scrolled rather than a model you picked. Switching keeps focus on the button pressed
            and leaves the drawer's scroll alone (setHarmonyModel), so comparing two models is two
            presses and nothing moves but the preview. */}
        <div data-hx-sec="1" style={sx('padding:14px var(--page-gutter) 0')}>
          <div role="group" aria-label="Harmony model" style={sx('display:flex;flex-wrap:wrap;gap:6px')}>
            {harmony.models.map((m) => (
              <button key={m.id} type="button" data-ix="seg" data-focus="chrome" aria-pressed={m.pressed} aria-label={m.aria} onClick={m.onPick} style={m.style}>{m.label}</button>
            ))}
          </div>
        </div>

        {/* ONE HARMONY, AT SIZE. Each swatch names itself: the SOURCE colour is labelled in words
            rather than by a 5px square nobody has a legend for, and a colour whose chroma had to be
            reduced to fit sRGB says MAPPED on the colour it happened to, instead of being covered by
            one methodology sentence true of the whole set. */}
        <div data-hx-sec="1" data-hx-preview="1" style={sx('padding:14px var(--page-gutter) 0')}>
          <div style={sx('display:flex;gap:1px;width:100%')}>
            {harmony.cells.map((cell, ci) => (
              <HBtn key={ci} type="button" data-hx-cell="1" data-focus="value" onClick={cell.onCopy} aria-label={cell.aria} style={cell.style} styleHover={cell.hover} styleActive={cell.active}>
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
          <button type="button" data-ix="cta" data-focus="chrome" onClick={harmony.onUse} aria-label={harmony.useAria} style={sx('background:var(--on-surface);border:1px solid var(--on-surface);padding:var(--btn-pad-md);font-family:Neue Montreal;font-size:var(--fs-label);letter-spacing:var(--track-flat);color:var(--surface);cursor:pointer;white-space:nowrap')}>Save as palette</button>
          <button type="button" data-ix="press" data-focus="chrome" onClick={harmony.onCopyAll} aria-label={harmony.copyAllAria} style={sx('background:none;border:1px solid var(--action-line);padding:var(--btn-pad-md);font-family:Neue Montreal;font-size:var(--fs-label);letter-spacing:var(--track-flat);color:var(--on-surface);cursor:pointer;white-space:nowrap')}>{harmony.copyAllLabel}</button>
        </div>

        {/* METHOD, ON DEMAND. It says something specific about THIS harmony — how many of these
            colours were adjusted — which is the only form of the sentence anyone can act on. */}
        <div data-hx-sec="1" style={sx('padding:18px var(--page-gutter) 26px')}>
          <button type="button" data-ix="cell" data-focus="chrome" aria-expanded={harmony.methodOpen} aria-label={harmony.methodAria} onClick={harmony.toggleMethod} style={sx('position:relative;display:flex;align-items:center;gap:8px;width:100%;background:none;border:none;border-top:1px solid transparent;padding:var(--btn-pad-lg);cursor:pointer;color:var(--on-surface);font-family:Neue Montreal;font-size:var(--fs-micro);letter-spacing:var(--track-flat);text-align:left')}>
            <OvRule />
            <span data-refine-chev="1" data-open={harmony.methodOpen ? '1' : '0'} aria-hidden="true" style={sx('font-size:var(--fs-nano);color:var(--on-surface-muted)')}>▸</span>{harmony.methodLabel}
          </button>
          {/* data-drawer-split on the lines: the disclosure's prose takes the same masked line
              reveal the drawer's own title takes, fired when it opens (see toggleFold's caller).
              A panel that unfolds to reveal text sitting there already is the one place on this
              surface where something appears instead of arriving. */}
          {harmony.methodOpen && (
            <div data-hx-method="1" style={sx('display:flex;flex-direction:column;gap:9px;padding:4px 12px 0')}>
              {harmony.methodLines.map((t, i) => (
                <span key={i} data-drawer-split="1" style={sx('font-family:Neue Montreal;font-size:var(--fs-detail);line-height:1.5;color:var(--on-surface-muted);text-wrap:pretty')}>{t}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================== TOKEN EXPORT DIALOG ==============================
function ExportDialog({ vals }) {
  if (!vals.hasExport) return null;
  const ex = vals.export;
  return (
    // 125 as it always was, EXCEPT when this was opened from Manage Projects — a folder's export is
    // a sub-decision of the dialog that raised it, so it has to sit over the 126 that dialog holds
    // rather than under it. Every other route into this surface stacks exactly where it did.
    <div style={{ ...sx('position:fixed;inset:0;display:flex;align-items:center;justify-content:center;padding:24px'), zIndex: ex.stacked ? 127 : 125 }}>
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
          <button type="button" data-ix="press" data-focus="chrome" onClick={vals.closeExport} aria-label="Close export options" style={sx('flex:none;background:none;border:1px solid var(--action-line);padding:var(--btn-pad-md);font-family:Neue Montreal;font-size:var(--fs-label);letter-spacing:var(--track-flat);color:var(--on-surface);cursor:pointer')}><TextSwap>Close</TextSwap></button>
        </header>

        <div style={sx('padding:14px var(--page-gutter) 0')}>
          <span style={sx('font-family:Neue Montreal;font-size:var(--fs-detail);line-height:1.5;color:var(--on-surface-muted);text-wrap:pretty')}>HEX / RGB / HSL — the authoritative values. The labelled CMYK approximation stays on-screen, never baked into a file you ship.</span>
        </div>

        <div style={sx('padding:16px var(--page-gutter) 0;display:flex;flex-direction:column;gap:6px')}>
          {ex.formats.map((f, fi) => (
            <button key={fi} type="button" data-ex-item="1" data-focus="chrome" onClick={f.onPick} onMouseEnter={f.onEnter} onMouseLeave={f.onLeave} onFocus={f.onFocus} onBlur={f.onBlur} style={f.style}>
              <span style={sx('text-transform: capitalize; font-size:var(--fs-detail)')}>{f.label}</span>
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
          <button type="button" data-ix="press" data-focus="chrome" onClick={vals.closeRecognise} aria-label="Keep the existing palette and create nothing" style={sx('flex:none;background:none;border:1px solid var(--action-line);padding:var(--btn-pad-md);font-family:Neue Montreal;font-size:var(--fs-label);letter-spacing:var(--track-flat);color:var(--on-surface);cursor:pointer')}>Cancel</button>
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
          <button type="button" data-ix="cta" data-focus="chrome" onClick={vals.recogniseOpen} aria-label={r.openAria} style={sx('width:100%;background:var(--on-surface);border:1px solid var(--on-surface);padding:var(--btn-pad-lg);font-family:Neue Montreal;font-size:var(--fs-label);letter-spacing:var(--track-flat);color:var(--surface);cursor:pointer')}>Open existing palette</button>
          {/* "Anyway", not "as a variation". Extraction is deterministic as of this deploy, so a
              second run of the same image returns the same colours — this adds a separate entry,
              it does not produce a different palette. Step D is what makes variations genuinely
              differ (seed = content hash + variation index); the label can promise that then. */}
          <button type="button" data-ix="press" data-focus="chrome" onClick={vals.recogniseVariation} aria-label={r.variationAria} style={sx('width:100%;background:none;border:1px solid var(--action-line);padding:var(--btn-pad-lg);font-family:Neue Montreal;font-size:var(--fs-label);letter-spacing:var(--track-flat);color:var(--on-surface);cursor:pointer')}>Extract again anyway</button>
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
            {/* WHERE IT IS NOW, restated every time it changes. role=status so the sentence is
                spoken as well as shown — a tick that appears in a list of eight is the kind of
                change a reader who has already walked past the row never learns about. */}
            <span role="status" style={sx('font-family:Neue Montreal;font-size:var(--fs-micro);letter-spacing:.02em;line-height:1.4;color:var(--on-surface-muted);text-wrap:pretty')}>{assign.memberLine}</span>
          </div>
          <button type="button" data-ix="press" data-focus="chrome" onClick={vals.closeAssign} aria-label="Close the project picker" style={sx('flex:none;background:none;border:1px solid var(--action-line);padding:var(--btn-pad-md);font-family:Neue Montreal;font-size:var(--fs-label);letter-spacing:var(--track-flat);color:var(--on-surface);cursor:pointer')}><TextSwap>Close</TextSwap></button>
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
          <label style={sx('font-family:Neue Montreal;font-size:var(--fs-micro);letter-spacing:.06em;text-transform:uppercase;color:var(--on-surface-muted);display:block;margin:12px 0 8px')}>New project</label>
          <div style={sx('display:flex;gap:8px')}>
            <input data-assign-new="1" type="text" maxLength={60} placeholder="Project Name" onKeyDown={assign.onCreateKey} style={sx("flex:1;min-width:0;background:var(--surface-raised);border:1px solid var(--action-line);padding:9px 11px;font-family:'Neue Montreal';font-size:var(--fs-body);color:var(--on-surface)")} />
            <button type="button" data-ix="cta" data-focus="chrome" onClick={assign.onCreate} style={sx('flex:none;background:var(--on-surface);border:1px solid var(--on-surface);padding:var(--btn-pad-md);font-family:Neue Montreal;font-size:var(--fs-label);letter-spacing:var(--track-flat);color:var(--surface);cursor:pointer')}>Create &amp; add</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================== MANAGE PROJECTS DIALOG ==============================
function ManageDialog({ vals }) {
  if (!vals.hasManage) return null;
  const manage = vals.manage;
  return (
    <div style={sx('position:fixed;inset:0;z-index:126;display:flex;align-items:center;justify-content:center;padding:24px')}>
      <div data-modal-backdrop="1" onClick={vals.closeManage} style={sx('position:absolute;inset:0;background:color-mix(in srgb, var(--scrim) 55%, transparent);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)')}></div>
      <div data-manage-dialog="1" data-lenis-prevent="1" role="dialog" aria-modal="true" aria-label="Manage projects" onKeyDown={vals.trapManage} style={sx('position:relative;width:440px;max-width:94vw;max-height:86vh;overflow-y:auto;background:var(--surface);border:1px solid var(--line-strong);box-shadow:0 24px 60px rgba(0,0,0,.28);display:flex;flex-direction:column')}>
        <header style={sx('display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:20px var(--page-gutter) 0')}>
          <div style={sx('display:flex;flex-direction:column;gap:4px')}>
            <span style={sx('font-family:Neue Montreal;font-size:var(--fs-label);letter-spacing:var(--track-flat);text-transform:uppercase;color:var(--on-surface-muted)')}>Projects</span>
            {/* Written in its case, not transformed into it: capitalize would also Title-Case any
                future wording, and the dialog is named by the same words as the button that opens
                it — "Manage Projects", exactly. */}
            <span style={sx("font-family: 'Neue Montreal'; font-weight: 500; font-size:var(--fs-subtitle); letter-spacing: -.01em; color: var(--on-surface)")}>Manage Projects</span>
          </div>
          <button type="button" data-ix="press" data-focus="chrome" onClick={vals.closeManage} aria-label="Close manage projects" style={sx('flex:none;background:none;border:1px solid var(--action-line);padding:var(--btn-pad-md);font-family:Neue Montreal;font-size:var(--fs-label);letter-spacing:var(--track-flat);color:var(--on-surface);cursor:pointer')}><TextSwap>Close</TextSwap></button>
        </header>
        <div style={sx('padding:16px var(--page-gutter) 4px')}>
          <div style={sx('display:flex;gap:8px')}>
            <input data-manage-new="1" type="text" maxLength={60} placeholder="New Project Name" onKeyDown={manage.onCreateKey} style={sx("flex:1;min-width:0;background:var(--surface-raised);border:1px solid var(--action-line);padding:9px 11px;font-family:'Neue Montreal';font-size:var(--fs-body);color:var(--on-surface)")} />
            <button type="button" data-ix="cta" data-focus="chrome" onClick={manage.onCreate} style={sx('flex:none;background:var(--on-surface);border:1px solid var(--on-surface);padding:var(--btn-pad-md);font-family:Neue Montreal;font-size:var(--fs-label);letter-spacing:var(--track-flat);color:var(--surface);cursor:pointer')}>Add</button>
          </div>
        </div>
        {/* The empty state is the one place a folder can be explained without the explanation
            becoming permanent furniture — it is gone the moment there is a project to look at.
            Worth the extra clause, because "what is a project FOR" is the question, and the answer
            is now: it is the unit you export. */}
        {manage.empty && (
          <div style={sx("padding:18px var(--page-gutter) 24px;font-family:'Neue Montreal';font-size:var(--fs-detail);line-height:1.5;color:var(--on-surface-muted);text-wrap:pretty")}>No projects yet. Create one above, then move palettes into it from any row or the detail view — and export the whole folder as one set of tokens.</div>
        )}
        {/* THE ROW IS THE PROJECT: its name, how much is in it, and the two things you can do to it
            as a whole. The count moved INSIDE the name field (see the note on manageView.count) and
            what it paid for is the Export button — the act a folder existed for and did not have.
            Order is name → export → delete: the constructive act sits next to the thing it acts on,
            and the destructive one stays at the far edge where it is hardest to hit by accident. */}
        <div style={sx('padding:12px var(--page-gutter) 22px;display:flex;flex-direction:column;gap:8px')}>
          {manage.rows.map((pr) => (
            <div key={pr.id} style={sx('display:flex;align-items:center;gap:8px')}>
              <span style={sx('position:relative;flex:1;min-width:0;display:flex')}>
                {/* padding-right clears the numeral's column so a long project name runs under the
                    caret, never under the count. */}
                <input data-proj-name={pr.id} type="text" maxLength={60} key={pr.id + '|' + pr.name} defaultValue={pr.name} onBlur={pr.onRename} onKeyDown={pr.onRenameKey} aria-label="Rename project" aria-describedby={'projn-' + pr.id} style={sx("width:100%;min-width:0;background:var(--surface-raised);border:1px solid var(--line);padding:9px 38px 9px 11px;font-family:'Neue Montreal';font-size:var(--fs-body);color:var(--on-surface)")} />
                {/* The numeral is painted; the noun is spoken. A bare "8" announced after a project
                    name is a quantity of nothing in particular, and aria-label on a span with no
                    role is not reliably read — so the description this field points at carries the
                    whole sentence as real text, and only the digits are visible. */}
                <span id={'projn-' + pr.id} style={sx('position:absolute;right:11px;top:50%;transform:translateY(-50%);pointer-events:none;font-family:Neue Montreal;font-size:var(--fs-micro);letter-spacing:var(--track-flat);color:var(--on-surface-muted);font-variant-numeric:tabular-nums')}>
                  <span aria-hidden="true">{pr.count}</span>
                  <span style={liveRegionStyle}>{pr.countAria}</span>
                </span>
              </span>
              {/* cursor written from state, not left to [data-ix]:disabled — that rule is in the
                  stylesheet and this style is inline, so a hardcoded `pointer` would outrank it and
                  the empty project's control would still invite the press it refuses. */}
              <button type="button" data-ix="press" data-focus="chrome" disabled={!pr.canExport} aria-label={pr.exportAria} title={pr.exportTitle} onClick={pr.onExport} style={sx('flex:none;width:32px;height:32px;display:inline-flex;align-items:center;justify-content:center;background:none;border:1px solid var(--action-line);color:var(--on-surface);padding:0;cursor:' + (pr.canExport ? 'pointer' : 'default'))}>
                <IconExport />
              </button>
              <button type="button" data-ix="press" data-focus="chrome" aria-label={pr.deleteAria} onClick={pr.onDelete} style={sx('flex:none;width:32px;height:32px;display:inline-flex;align-items:center;justify-content:center;background:none;border:1px solid var(--action-line);color:var(--on-surface);cursor:pointer')}>
                <IconTrash />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// THE PALETTE STRIP, READ-ONLY — the same view the editor opens with, for a layer that needs its
// context without its controls. Same geometry as the interactive strip: one flex row on the shares
// swatchGrow hands out, one chip layer over it on the same shares, chips on the same 8px inset. It
// is not a second selection mechanism — the rows beneath it are the controls here, and two ways to
// pick a swatch inside one modal layer is one too many — so it renders as spans and is hidden from
// assistive tech, which reads the rows' own labels instead.
// The band numbers only appear here: this is the surface whose rows cite swatches by number, so
// the citation needs something to resolve against.
const RefineStripRef = ({ swatches, roleChips }) => (
  <div aria-hidden="true" style={sx('position:relative;width:100%;flex:none')}>
    <div style={sx('position:relative;display:flex;gap:0;width:100%')}>
      {/* No height override: the band's own 124px comes through, so this IS the editor's strip
          rather than a squashed likeness of it. At 64px the chips, the number and the band's
          padding were fighting for the same rows and everything clamped. */}
      {swatches.map((b) => (
        <span key={b.sid} style={{ ...b.style, cursor: 'default' }}></span>
      ))}
    </div>
    <div style={sx('position:absolute;inset:0;display:flex;pointer-events:none')}>
      {roleChips.map((cell) => (
        <span key={cell.key} style={{ flexGrow: cell.grow, flexBasis: 0, minWidth: '92px', position: 'relative' }}>
          <span style={{ ...sx('position:absolute;left:8px;top:8px'), ...cell.numStyle }}>{cell.num}</span>
          <span style={sx('position:absolute;left:8px;right:8px;bottom:8px;display:flex;flex-direction:column;align-items:flex-start;gap:2px')}>
            {cell.chips.map((c) => (
              <span key={c.id} style={{ ...c.style, cursor: 'default' }}>{c.label}</span>
            ))}
          </span>
        </span>
      ))}
    </div>
  </div>
);

// One half of a contrast pair in the Review pairings list: the swatch's colour, its role, and the
// number the strip labels it by. The target half — the one a press on the row selects — carries
// its number in full ink so the row states its destination rather than implying it.
const PairHalf = ({ half, role }) => (
  <span style={sx('display:inline-flex;align-items:center;gap:6px;min-width:0')}>
    <span aria-hidden="true" style={half.style}></span>
    <span style={sx('white-space:nowrap;overflow:hidden;text-overflow:ellipsis')}>{role}</span>
    <span aria-hidden="true" style={{ ...sx('font-family:Neue Montreal;font-size:var(--fs-micro);font-variant-numeric:tabular-nums;flex:none'), color: half.target ? 'var(--on-surface)' : 'var(--on-surface-muted)' }}>{half.num}</span>
  </span>
);

// ============================== REFINE ==============================
// The step between reading a palette and shipping it. A surface of its own, on the same dialog
// family as the others — backdrop, aria-modal, shared focus trap, shared transition — because the
// result view is a screen people mostly READ, and permanent editing chrome there would tax every
// visit to pay for an occasional one.
//
// Read left to right: the palette, then the swatch you picked, then what it is FOR. Roles are the
// point of the surface, so they get the column; the colour sliders sit under them because adjusting
// a colour is what you do once you know what job it has to do.
//
// Every swatch shows the roles it answers, in words, on the swatch itself. That is the whole
// picture the Export dialog has been asking for since it started telling people to refine.
// ============================== REFINE ==============================
// ONE DECISION FIRST, and the screen is built around it: choose a swatch, then adjust it. The
// strip is the only thing that selects; everything under it is that swatch's properties.
//
// The first build broke exactly here. It had a strip AND a full-height Roles list, both large and
// both selectable, plus a heading reciting role, position and hex at one weight — three ways to
// identify one object, and therefore no obvious first move. Colour, order and deletion also shared
// a row, which gave a destructive act the same standing as nudging lightness.
//
// So: role and position are menus, not columns; colour has the main area to itself; removal sits
// apart behind a rule with its consequence written under it; history lives in the footer. The
// vertical order IS the flow — select, adjust, optionally re-file or reorder, finish.
function RefineDialog({ vals }) {
  if (!vals.hasRefine) return null;
  const r = vals.refine;
  const quiet = 'background:none;border:1px solid var(--action-line);padding:8px 12px;font-family:Neue Montreal;font-size:var(--fs-label);letter-spacing:var(--track-flat);text-transform:uppercase;color:var(--on-surface);cursor:pointer;white-space:nowrap';
  // THE LADDER, and every step is a token. Seven structural levels shared one 9px muted style —
  // the modal's own label and all six section titles — which is why the body could not be scanned:
  // nothing marked where one task ended and the next began. Two levels now do what one was doing.
  //   --fs-title    24  the palette              h1
  //   --fs-subtitle 20  the swatch               h2
  //   --fs-body     13  a section's answer
  //   --fs-label    10  a section's NAME         h3, full ink — the scan line
  //   --fs-micro     9  modal chrome, sub-labels muted
  // Tracking is var(--track-flat) throughout: the design's single flat-tracking source, 0px.
  const eyebrow = 'font-family:Neue Montreal;font-weight:500;font-size:var(--fs-micro);letter-spacing:var(--track-flat);text-transform:uppercase;color:var(--on-surface-muted)';
  // A HEADLINE, NOT AN EYEBROW. 10px uppercase in full ink was still a micro-label: the same
  // shape as the chrome above it, just darker, so a section still had to be read before it could
  // be identified. --fs-lead in sentence case at weight 500 is a heading — it has a distinct size,
  // a distinct case and a distinct rank from both the 13px answer beneath it and the 9px chrome.
  const secTitle = "margin:0;font-family:'Neue Montreal';font-weight:500;font-size:var(--fs-lead);line-height:1.2;letter-spacing:var(--track-flat);color:var(--on-surface)";
  const footBtn = 'background:none;border:1px solid var(--action-line);padding:6px 10px;font-family:Neue Montreal;font-size:var(--fs-micro);letter-spacing:var(--track-flat);text-transform:uppercase;color:var(--on-surface);cursor:pointer;white-space:nowrap';
  return (
    <div style={sx('position:fixed;inset:0;z-index:127;display:flex;align-items:center;justify-content:center;padding:24px')}>
      <div data-modal-backdrop="1" onClick={r.onClose} style={sx('position:absolute;inset:0;background:color-mix(in srgb, var(--scrim) 55%, transparent);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)')}></div>
      {/* A FIXED SHELL WITH ONE SCROLLPORT INSIDE IT.
          The whole dialog used to be the scroller — max-height plus overflow-y — which meant the
          header and the footer were inside the thing that scrolled. Measured: the header left the
          top of the dialog by 111px on the way to the bottom, so Done, Undo and Reset all scrolled
          out of reach exactly when a long edit needed them. Three rows now: header, body, footer.
          Only the middle one moves.
          The height is stated rather than capped. A max-height dialog is as tall as its content, so
          the same surface was a different size for a 3-swatch palette and a 6-swatch one, and
          whether it scrolled at all depended on the palette. A fixed shell means the instrument is
          the same instrument every time. 100dvh (not vh) so the mobile URL bar cannot clip it.
          620 → 760 → 960: the second column (edit | preview) needs the width or the specimen reads
          as a swatch rather than as an interface. max-width keeps it inside the viewport. */}
      <div data-refine-dialog="1" data-refine-shell="1" role="dialog" aria-modal="true" aria-label={'Refine ' + r.name} onKeyDown={r.trap} style={sx('position:relative;width:960px;max-width:100%;height:min(860px, calc(100dvh - 48px));background:var(--surface);border:1px solid var(--line-strong);box-shadow:0 24px 60px rgba(0,0,0,.28);display:grid;grid-template-rows:auto minmax(0,1fr) auto;overflow:hidden')}>

        {/* PAIRING DETAIL — a layer over the canvas with its own scroll. Closing returns to an
            editor that has not moved a pixel. */}
        {r.a11y && r.a11y.allOpen && (
          <div data-refine-pairs="1" role="dialog" aria-modal="true" aria-label="All text-role pairings" onKeyDown={r.trapPairings} style={sx('position:absolute;inset:0;z-index:5;background:var(--surface);display:flex;flex-direction:column')}>
            <div style={sx('display:flex;align-items:center;justify-content:space-between;gap:12px;padding:18px var(--page-gutter) 12px;border-bottom:1px solid var(--line)')}>
              <span style={sx('font-family:Neue Montreal;font-weight:500;font-size:var(--fs-label);letter-spacing:var(--track-flat);text-transform:uppercase;color:var(--on-surface)')}>{r.a11y.allLabel}</span>
              <button type="button" data-ix="press" data-focus="chrome" onClick={r.a11y.closePairings} aria-label="Close pairings and return to the editor" style={sx(quiet)}><TextSwap>Close</TextSwap></button>
            </div>
            {/* THE PALETTE, ON THE SURFACE THAT GRADES IT. The list names roles and swatch numbers;
                without the strip those were coordinates with no map, and the layer covers the
                editor's own strip exactly when you need it most. */}
            <div style={sx('padding:12px var(--page-gutter) 0')}>
              <RefineStripRef swatches={r.swatches} roleChips={r.roleChips} />
            </div>
            {/* EVERY ROW LEADS BACK TO A SWATCH. The matrix used to be a read-only report: it told
                you Primary on Background fails and stopped there, leaving the reader to work out
                which of the two colours to go and change. Activating a row closes the drill-in and
                selects the swatch carrying the offending role — ground first, because it is the
                larger area and fixing it repairs every pair set on it. */}
            <div data-lenis-prevent="1" style={sx('flex:1;min-height:0;overflow-y:auto;padding:4px var(--page-gutter) 18px')}>
              {/* ONE ROW SHAPE, rendered as a button or a span. The two variants used to be two
                  copies of the same five children, which is how they would eventually stop
                  matching; the contents are written once here and the wrapper is the only branch. */}
              {r.a11y.rows.map((row) => {
                const body = (<>
                  <span aria-hidden="true" style={row.chipStyle}>Aa</span>
                  {/* The pair, as the two swatches it actually is: colour, role, and the number
                      the strip labels that swatch by. The one a press would take you to is marked
                      — see swatchRef in renderVals. */}
                  <span style={sx('flex:1;min-width:0;display:flex;align-items:center;gap:8px;font-family:Neue Montreal;font-size:var(--fs-detail);color:var(--on-surface)')}>
                    <PairHalf half={row.fgSwatch} role={row.fgRole} />
                    <span style={sx('flex:none;color:var(--on-surface-muted)')}>on</span>
                    <PairHalf half={row.bgSwatch} role={row.bgRole} />
                  </span>
                  <span style={sx('font-family:Neue Montreal;font-size:var(--fs-detail);letter-spacing:var(--track-flat);color:var(--on-surface-muted);font-variant-numeric:tabular-nums')}>{row.ratio}</span>
                  <span style={row.levelStyle}>{row.level}</span>
                </>);
                return row.canRepair ? (
                  <button key={row.key} type="button" data-ix="cell" data-focus="chrome" aria-label={row.aria} onClick={row.onRepair} style={sx('display:flex;align-items:center;gap:12px;width:100%;text-align:left;background:none;border:none;border-bottom:1px solid var(--line);padding:10px 0;font:inherit;color:var(--on-surface);cursor:pointer')}>
                    {body}
                    <span aria-hidden="true" style={sx('flex:none;font-size:var(--fs-label);color:var(--on-surface-muted)')}>›</span>
                  </button>
                ) : (
                  // Both halves of this pair are the swatch already selected, so there is nowhere to
                  // send anyone: it stays a statement rather than a control that would do nothing.
                  <span key={row.key} style={sx('display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--line)')}>
                    {body}
                    <span aria-hidden="true" style={sx('flex:none;width:8px')}></span>
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* THE PALETTE IS THE H1, and this is the correction the whole restructure turns on. The
            surface has three levels of identity — the palette, the swatch, the role — and they were
            ranked upside down: "Refine · Garnet" sat at label size in the corner while
            "Swatch 1 · #726C59" was the largest type on screen. So the thing you were editing was
            legible and the thing you were editing it INSIDE was nearly invisible.
            The palette now holds the header at display size, level with Done, and the swatch is the
            H2 in the body under the strip. No motion hook on the header itself — it rides the
            panel's own fade; see _refineIn. */}
        {/* The bottom padding is the header's OWN, not the first section's. The h1's bottom edge was the
            scrollport's top edge, so scrolled content passed under the palette name with zero
            clearance — at any scroll position but the top, a heading sat flush against another
            heading. The strip's top padding drops to 6px so the resting gap stays 24px. */}
        <header style={sx('display:flex;align-items:flex-end;justify-content:space-between;gap:16px;padding:18px var(--page-gutter)')}>
          <span style={sx('min-width:0;display:flex;flex-direction:column;gap:5px')}>
            <span style={sx(eyebrow)}>Refine palette</span>
            <h1 data-drawer-split="1" style={sx("margin:0;font-family:'Neue Montreal';font-weight:500;font-size:var(--fs-title);line-height:1.1;letter-spacing:var(--track-flat);color:var(--on-surface);text-wrap:balance")}>{r.name}</h1>
          </span>
          {/* Done, not Save: every edit is already applied and already written. It is the ONE
              filled control on this surface — completion has to out-rank Reset palette, which sits
              at 9px in the footer and asks before it acts. */}
          <button type="button" data-ix="cta" data-focus="chrome" onClick={r.onClose} aria-label="Done, close refine" style={sx('flex:none;background:var(--on-surface);border:1px solid var(--on-surface);padding:var(--btn-pad-md);font-family:Neue Montreal;font-size:var(--fs-label);letter-spacing:var(--track-flat);color:var(--surface);cursor:pointer')}><TextSwap>Done</TextSwap></button>
        </header>

        {/* THE ONLY SCROLLPORT. min-height:0 is what makes it one: a grid row sized minmax(0,1fr)
            still refuses to shrink below its content without it, and the body would push the footer
            off the shell instead of scrolling. overscroll-behavior:contain stops a flick at either
            end chaining into the page — belt to the Lenis brace, which is why data-lenis-prevent
            moved here from the dialog: the wheel has to be intercepted on the thing that scrolls.
            scrollbar-gutter keeps the column reserved so content does not shift by the scrollbar's
            width when a palette happens to be short enough not to overflow.

            data-lenis-prevent stays, and now does the OPPOSITE of exempting this surface: it holds
            the stopped root instance off (a stopped Lenis swallows the wheel rather than ignoring
            it) so the nested instance below can own the scroll. See _lenisNestOn in misc.js. */}
        <div data-refine-body="1" data-lenis-prevent="1" onScroll={r.onBodyScroll} style={sx('min-height:0;overflow-y:auto;overscroll-behavior:contain;scrollbar-gutter:stable')}>
        {/* THE MOVING ELEMENT. Lenis translates one content node inside its wrapper, and the
            scrollport's own children are the sections — so this div exists to be that node. It
            carries the column layout the scrollport used to hold itself. */}
        <div data-refine-content="1" style={sx('display:flex;flex-direction:column')}>

        {/* 1 · THE STRIP — which swatch, chosen inside the palette named above it. Pointer, arrow
               keys, Home and End all land in refineSelect. A listbox rather than a row of toggle
               buttons: this is "pick exactly one of five", which aria-pressed can only describe as
               five independent on/off states, and aria-selected is not valid on a button role. */}
        <div style={sx('position:relative;width:100%;padding:6px var(--page-gutter) 0')}>
          <div style={sx('position:relative;width:100%')}>
            <div role="listbox" aria-orientation="horizontal" aria-label="Palette swatches. Choose one to edit; use the arrow keys to move between them." onKeyDown={r.onKey} style={sx('position:relative;display:flex;gap:0;width:100%')}>
              {r.swatches.map((b) => (
                <button key={b.sid} type="button" role="option" data-refine-swatch="1" data-ring={b.ring} data-focus="swatch" tabIndex={b.tab} aria-selected={b.selected} aria-label={b.aria} title={b.title} onClick={b.onSelect} style={b.style}></button>
              ))}
              {/* Selection travels; keyboard focus is the ring on the button beneath. Two states,
                  two treatments, deliberately not the same one — and the travelling one takes its
                  ink from the swatch it lands on (see data-ring / _refinePill). */}
              <span data-refine-pill="1" aria-hidden="true"></span>
            </div>

            {/* THE ROLE CHIPS, on their own layer over the strip.
                They used to be spans inside the swatch buttons, which is where they read best and
                where they could never be operated: a button cannot contain a button. Lifting them
                out makes each one a control you can pick up, and keeps the listbox a listbox —
                options with buttons inside them are not a listbox in any screen reader.
                The layer is a second flex row with the same shares as the strip, so a chip sits on
                its swatch by geometry rather than by measurement. pointer-events:none on the layer
                so the swatch underneath stays clickable everywhere a chip is not. */}
            <div role="group" aria-label="Palette roles. Drag a role onto a swatch to move it there, or focus one and use the arrow keys." style={sx('position:absolute;inset:0;display:flex;pointer-events:none;z-index:4')}>
              {r.roleChips.map((cell) => (
                <div key={cell.key} style={{ flexGrow: cell.grow, flexBasis: 0, minWidth: '92px', position: 'relative' }}>
                  {/* 8px from the band's left edge and 8px from its bottom edge, measured on the
                      TAG ITSELF — the scrim box, which is the thing with visible edges and so the
                      thing the eye spaces. Not the glyph inside it (that has side bearings and a
                      descender gap that no two axes share), and not the cluster minus the chip's
                      own padding. Both numbers are asserted per band in the verification. */}
                  <div style={sx('position:absolute;left:8px;right:8px;bottom:8px;display:flex;flex-direction:column;align-items:flex-start;gap:2px')}>
                    {cell.chips.map((c) => (
                      <button key={c.id} type="button" data-role-chip={c.id} data-pinned={c.pinned ? '1' : '0'} data-focus="swatch" aria-label={c.aria} onPointerDown={c.onDown} onKeyDown={c.onKey} style={c.style}>{c.label}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 2 · THE SWATCH — the H2, one level under the palette. The hex has come out of the
               heading and joined the role and its status as metadata: it is a value the three
               sliders already state three ways, and it was taking half of the largest line on the
               surface. The source sits at the end of the row as context, deliberately quieter than
               the editing controls: no border, because it is not one of them. */}
        <div style={sx('display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:24px var(--page-gutter) 0')}>
          <div style={sx('min-width:0;display:flex;flex-direction:column;gap:5px')}>
            <h2 data-drawer-split="1" style={sx("margin:0;font-family:'Neue Montreal';font-weight:500;font-size:var(--fs-subtitle);line-height:1.15;letter-spacing:var(--track-flat);color:var(--on-surface);font-variant-numeric:tabular-nums")}>{r.selTitle}</h2>
            {/* The hex, on its own. It carried the swatch's roles and their origin until the strip
                above was doing both jobs better — the roles are written on the colours themselves,
                so repeating them here in grey text was the same map with the colour taken out. */}
            <span style={sx('font-family:Neue Montreal;font-size:var(--fs-label);letter-spacing:var(--track-flat);color:var(--on-surface-muted);font-variant-numeric:tabular-nums')}>{r.selMeta}</span>
          </div>
          {r.hasSource && (
            <button type="button" data-click-zoom="1" data-focus="chrome" aria-label={r.sourceAria} style={sx('flex:none;display:inline-flex;flex-direction:column;align-items:flex-end;gap:4px;background:none;border:none;padding:0;cursor:pointer;color:var(--on-surface-muted)')}>
              <img src={r.sourceUrl} alt="" style={sx('width:54px;height:34px;object-fit:cover;display:block;border:1px solid var(--line)')} />
              {/* Its own level, not the section titles'. Borderless 9px muted uppercase made a
                  CONTROL indistinguishable from the labels naming the sections beside it. */}
              <span style={sx('font-family:Neue Montreal;font-size:var(--fs-micro);letter-spacing:var(--track-flat);text-transform:uppercase;white-space:nowrap;border-bottom:1px solid var(--action-line);padding-bottom:1px')}>View source</span>
            </button>
          )}
        </div>

        {/* 3 · ADJUST COLOUR — full width, and no longer sharing the row with the preview.
               The two were a 60/40 split, which is a defensible arrangement right up until you ask
               what the narrow half is FOR. The preview is not a caption on the sliders; it is the
               surface the edit is judged on, and at 40% of the width its heading, its body line and
               its two buttons all wrapped — so the object meant to answer "does this still work as
               an interface?" was itself badly set. They follow each other down the page now. The
               contrast card sitting below the fold is fine: the body scrolls. */}
        <div style={sx('padding:32px var(--page-gutter) 0')}>
          {/* The headline is ruled off from its content — every section title in this dialog now
              carries the same --line underline, so the hierarchy is drawn, not implied. */}
          <h3 style={sx(secTitle + ';padding-bottom:8px;border-bottom:1px solid var(--line)')}>Adjust colour</h3>
          {/* EACH AXIS IS A CARD, not a floating row: the raised surface + quiet hairline the
              app's other islands use (export rows, thumbnails), on an 8px rhythm throughout —
              8 between cards, 8 inside them. The reference's contained parameter rows, spoken
              in this system's squared, token-built accent. */}
          <div style={sx('padding-top:8px;display:flex;flex-direction:column;gap:8px')}>
            {r.sliders.map((sl) => (
              <div key={sl.key} data-refine-axis="1" style={sx('display:flex;flex-direction:column;gap:8px;padding:8px;background:var(--surface-raised);border:1px solid var(--line)')}>
                <span style={sx('display:flex;align-items:center;justify-content:space-between;gap:10px')}>
                  <label htmlFor={'refine-' + sl.key} style={sx(eyebrow + ';font-weight:400')}>{sl.label}</label>
                  {/* Value and unit are ONE control: the wrapper draws the boundary, the input is
                      borderless inside it, and the unit sits within the same box. Text rather than
                      number, so the decimal separator is the same for everyone.
                      The bounds are stated on the input itself now, not only on the range twin —
                      see the numeric contract in renderVals. */}
                  <span data-refine-num="1">
                    <input type="text" inputMode="decimal" value={sl.display} onChange={sl.onNumber} onBlur={sl.onNumberCommit} onKeyDown={sl.onNumberKey} role="spinbutton" aria-valuemin={sl.numMin} aria-valuemax={sl.numMax} aria-valuenow={sl.numNow} aria-valuetext={sl.valueText} aria-label={sl.label + ' of the selected swatch, exact value' + sl.rangeHint} />
                    {/* ALWAYS RENDERED, even for chroma, whose unit is nothing — a chroma is a
                        ratio. It was conditional, so chroma had no element at all and the fixed
                        unit slot that aligns the other two simply did not exist on that row: the
                        box matched but the digits still sat 13px off the shared edge. An empty
                        slot is what keeps three rows in one column. */}
                    <span aria-hidden="true">{sl.unit}</span>
                  </span>
                </span>
                <input id={'refine-' + sl.key} data-refine-slider="1" type="range" min={sl.min} max={sl.max} step={sl.step} value={sl.value} onChange={sl.onInput} onPointerUp={sl.onCommit} onKeyUp={sl.onCommit} onBlur={sl.onCommit} aria-label={sl.label + ', swatch ' + (r.selIdx + 1) + ' ' + r.selHex} aria-valuetext={sl.valueText} style={{ '--refine-track': sl.track }} />
              </div>
            ))}
          </div>
        </div>

        {/* 4 · LIVE PREVIEW — not "In use", which promises a usage report: how many components,
               which ones. This surface does not know that and is not trying to; it is a specimen
               you judge the edit against. The subject moved into the subheading, where a caption
               under the specimen used to say the same thing as a fourth level of loose text.
               Decorative in the accessibility tree — a picture of a mapping, with the mapping
               itself on the group's accessible name. */}
        {/* No "Testing swatch x as Background" line: the strip above already names the mapping on
            the swatch itself, so the sentence restated what two visible labels were saying — the
            fact stays on the group's accessible name, where it is not redundant. */}
        <div data-refine-preview="1" role="group" aria-label={r.preview.aria} style={sx('display:flex;flex-direction:column;gap:12px;padding:32px var(--page-gutter) 0')}>
          <h3 style={sx(secTitle + ';padding-bottom:8px;border-bottom:1px solid var(--line)')}>Live Preview</h3>
          <div aria-hidden="true" style={r.preview.pageStyle}>
            <div style={r.preview.frameStyle}>
              <div style={r.preview.accentStyle}></div>
              <div style={r.preview.cardStyle}>
                <span style={r.preview.headingStyle}>Section heading</span>
                <span style={r.preview.bodyStyle}>Body text set on the raised surface, at the size the contrast verdict below reports.</span>
                <span style={sx('display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding-top:2px')}>
                  <span style={r.preview.btnStyle}>Primary</span>
                  <span style={r.preview.altStyle}>Secondary</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 5 · TEXT CONTRAST — named for what it measures, and now built on the same skeleton as
               Roles: one heading, one action, one status, one supporting fact. It was a bordered
               card ending in a full-width navigation row while Roles began as a loose unboxed
               section, so two neighbours doing the same kind of work looked like different kinds
               of object. The card and the footer row are both gone.

               THREE STATEMENTS OF ONE STATE became one. A PARTIAL badge, "1 of 8 meet AA" and a
               REVIEW 7 FAILURES button all reported the same health, and the two controls were one
               destination under two names. "Partial" was the weakest: a bucket where the failure
               count is the quantity, and the quantity is the thing you can act on. */}
        {r.a11y && (
          <div data-refine-sec="1" role="group" aria-label={r.a11y.aria} style={sx('position:relative;margin:32px var(--page-gutter) 0;padding-top:24px;border-top:1px solid transparent')}>
            <OvRule />
            <div style={sx('display:flex;align-items:center;justify-content:space-between;gap:12px;padding-bottom:8px;border-bottom:1px solid var(--line)')}>
              <h3 style={sx(secTitle)}>Text Contrast</h3>
              <button type="button" data-ix="press" data-focus="chrome" aria-haspopup="dialog" aria-label={r.a11y.reviewAria} onClick={r.a11y.toggleAll} style={sx(quiet + ';flex:none')}>{r.a11y.reviewLabel}</button>
            </div>
            <div style={sx('padding-top:16px')}>
              <span data-drawer-split="1" style={r.a11y.countStyle}>{r.a11y.count}</span>
            </div>
            {/* ONE ROW, FOUR FACTS, EACH SAID ONCE. This was a labelled sub-block over a two-line
                stack: a "Current pairing" eyebrow, the role pair, the hex pair, the ratio and a
                verdict reading "Normal text: Fails AA" beside a specimen whose own text reads
                "Normal text". The hex pair is the chip's two colours, and the selected swatch's
                hex already opens the metadata line at the top of the dialog. The chip is the
                label: it is visibly the pair, drawn at the size the verdict grades. */}
            <div style={sx('display:flex;align-items:center;gap:14px;padding-top:16px')}>
              <span aria-hidden="true" style={r.a11y.sampleStyle}>{r.a11y.sampleText}</span>
              <span style={sx('flex:1;min-width:0;font-family:Neue Montreal;font-size:var(--fs-detail);color:var(--on-surface)')}>{r.a11y.pairRoles}</span>
              <span style={sx('flex:none;font-family:Neue Montreal;font-size:var(--fs-body);letter-spacing:var(--track-flat);color:var(--on-surface);font-variant-numeric:tabular-nums')}>{r.a11y.pairRatio}</span>
              <span style={r.a11y.pairLevelStyle}>{r.a11y.pairLevel}</span>
            </div>
          </div>
        )}

        {/* ROLES had a section here and no longer does (03.08.26, Option A of the plan in
            docs/refine-audit.md). It printed one line per role on the SELECTED swatch —
            "Background · Derived" — which failed four ways at once: it restated what the strip
            already says in colour and in position; it reported provenance before anyone had been
            told what the role is FOR or whether it works; scoped to one swatch it showed 0-2 of
            the palette's 6 roles under a heading promising all of them; and it carried no verbs,
            because every act on a role happens on the strip. Its two live parts moved to where
            they belong: the derived/pinned definition to the swatch's own metadata line, which is
            the only place those words are now spoken, and Reset roles to the footer beside Reset
            all refinements — both undo decisions, at two scopes, and they had been sitting 400px
            apart. */}

        {/* end of the scrollport — the footer below is a sibling, outside it */}
        <div style={sx('height:var(--page-gutter);flex:none')}></div>
        </div>
        </div>

        {/* 7 · RECOVER AND FINISH. Undo is compact and always here. Reset is tertiary and asks once
               — it discards every refinement, which Undo would take many presses to equal.
               PERSISTENT. It was the last row of the scrolling content, so the two controls that
               undo a mistake left the screen precisely as you made more of them. */}
        <div data-refine-foot="1" style={sx('position:relative;display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:10px var(--page-gutter);border-top:1px solid transparent;background:var(--surface-raised)')}>
          <OvRule />
          <button type="button" data-ix="press" data-focus="chrome" disabled={!r.canUndo} onClick={r.onUndo} aria-label={r.undoAria} style={sx(footBtn + ';display:inline-flex;align-items:center;gap:7px;opacity:' + (r.canUndo ? '1' : '.35'))}>
            Undo<span aria-hidden="true" style={sx('font-size:var(--fs-nano);color:var(--on-surface-muted)')}>{r.undoKeys}</span>
          </button>
          {r.resetArmed && (
            <span style={sx("flex:1;min-width:160px;font-family:'Neue Montreal';font-size:var(--fs-label);line-height:1.4;color:var(--on-surface);text-wrap:pretty")}>This discards every refinement.</span>
          )}
          {r.resetArmed && (
            <button type="button" data-ix="press" data-focus="chrome" onClick={r.onResetCancel} aria-label="Cancel the reset" style={sx(footBtn)}>Cancel</button>
          )}
          {/* An explicit spacer rather than an auto margin on whichever button happens to be last:
              the reset cluster can be one button or two, and the armed state inserts a sentence
              that supplies its own flex:1. One rule for where the right-hand group starts. */}
          {!r.resetArmed && <span aria-hidden="true" style={sx('flex:1')}></span>}
          {/* Reset roles, relocated from the deleted Roles section. It belongs beside Reset all
              refinements because they are the same act at two scopes — one undoes where the roles
              sit, the other undoes everything — and they were 400px apart. Shown only when there
              is a placement to undo. */}
          {r.anyPinned && !r.resetArmed && (
            <button type="button" data-ix="press" data-focus="chrome" aria-label={r.resetRolesAria} onClick={r.onResetRoles} style={sx(footBtn)}>Reset roles</button>
          )}
          <button type="button" data-ix="press" data-focus="chrome" disabled={!r.canReset} onClick={r.onReset} aria-label={r.resetAria} style={sx((r.resetArmed ? footBtn.replace('border:1px solid var(--action-line)', 'border:1px solid var(--on-surface)') : footBtn) + ';opacity:' + (r.canReset ? '1' : '.35'))}>{r.resetLabel}</button>
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
            <button type="button" data-ix="cta" data-focus="chrome" onClick={vals.confirmRestore} aria-label={r.confirmAria} style={sx('width:100%;background:var(--on-surface);border:1px solid var(--on-surface);padding:var(--btn-pad-lg);font-family:Neue Montreal;font-size:var(--fs-label);letter-spacing:var(--track-flat);color:var(--surface);cursor:pointer')}>Add to library</button>
            <span style={sx("font-family:'Neue Montreal';font-size:var(--fs-label);line-height:1.5;color:var(--on-surface-muted);text-wrap:pretty")}>New palettes go to the top of your library. Existing ones keep their place.</span>
          </div>
        )}
      </div>
    </div>
  );
}
