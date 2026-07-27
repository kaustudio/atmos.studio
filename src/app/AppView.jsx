// The view — a 1:1 JSX port of the design comp's template. Static inline styles are kept as the
// original CSS strings (parsed by sx()) so the layout stays byte-faithful; computed styles come
// from renderVals() untouched. No logic lives here.
import React, { useState } from 'react';
import { sx } from '../lib/sx.js';
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

// button-006 — the clip-path text-swap CTA (chrome in global.css). `label` renders in both layers
// unless a distinct `hover` node is given.
function B006({ label, hover, btnRef, ...props }) {
  return (
    <button type="button" data-button-006="" className="button-006" ref={btnRef} style={sx('font-family: Neue Montreal; font-size: 10px; letter-spacing:var(--track-flat)')} {...props}>
      <span className="button-006__hover"><span className="button-006__text" style={sx('letter-spacing:var(--track-flat); font-family: Neue Montreal')}>{hover ?? label}</span><span className="button-006__bg is--hover"></span></span>
      <span className="button-006__default"><span aria-hidden="true" className="button-006__text" style={sx('letter-spacing:var(--track-flat)')}>{label}</span><span className="button-006__bg is--default"></span></span>
    </button>
  );
}

// Copy confirmation: 'Hex list' ⇄ ✓ Copied. Both states are stacked in one grid cell with the
// inactive one hidden, so the cell is always sized to the WIDER of the two and the row can never
// reflow at the moment of the swap — which is exactly when the pointer is still over the button.
const CopiedMark = () => (
  <span style={sx('display:inline-flex;align-items:center;gap:6px')}><IconCheck />Copied</span>
);
const SwapLabel = ({ copied, idle }) => (
  <span style={sx('display:inline-grid;align-items:center;height:14px;justify-items:center')}>
    <span style={{ gridArea: '1/1' }}>{copied ? <CopiedMark /> : idle}</span>
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

const IconCopy = () => (<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path fill="currentColor" d="M7.5 17V3h11v14zm-3 3V6.616h1V19h9.385v1z"></path></svg>);
const IconCheck = ({ size = 12 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path fill="currentColor" d="m9.55 18l-5.7-5.7l1.425-1.425L9.55 15.15l9.175-9.175L20.15 7.4z"></path></svg>);
const IconHarmony = ({ size = 14 }) => (<svg width={size} height={size} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden="true"><circle cx="5.2" cy="7" r="3.4"></circle><circle cx="8.8" cy="7" r="3.4"></circle></svg>);
// Sort chevron — drawn at the same 1-unit hairline weight as the rest of the icon set, so it sits
// in the header without shouting. It points DOWN at rest (descending) and rotates 180° to point up
// for ascending; the rotation is the state change, so the glyph never swaps out from under the eye.
const IconChevron = ({ size = 9 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" aria-hidden="true" style={{ display: 'block' }}><path d="M5 9l7 7 7-7"></path></svg>);
const IconContrast = ({ size = 14 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path fill="currentColor" d="M8.493 20.292q-1.643-.709-2.859-1.924t-1.925-2.856T3 12.003t.709-3.51Q4.417 6.85 5.63 5.634t2.857-1.925T11.997 3t3.51.709q1.643.708 2.859 1.922t1.925 2.857t.709 3.509t-.708 3.51t-1.924 2.859t-2.856 1.925t-3.509.709t-3.51-.708m4.007-.31q3.09-.201 5.295-2.458T20 12t-2.185-5.505Q15.628 4.258 12.5 4.017z"></path></svg>);
const IconExport = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path fill="currentColor" d="m12 15.577l-3.539-3.538l.708-.72L11.5 13.65V5h1v8.65l2.33-2.33l.709.719zM5 19v-4.038h1V18h12v-3.038h1V19z"></path></svg>);
const IconFolder = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ display: 'block' }}><path fill="currentColor" d="M3 19V5h6.596l2 2H21v12zm1-1h16V8h-8.806l-2-2H4zm0 0V6z"></path></svg>);
// Redrawn from the supplied mdi link glyph at this set's stroke weight. The source was ~2 units of
// wall in a 24 grid; every other icon here (export, folder, trash, copy) is a 1-unit hairline, and
// at 14px the difference reads as a bold icon sitting in a row of light ones. Same drawing, same
// optical size — just the weight the row is built on.
const IconLink = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path fill="currentColor" d="M6.5 17q-2.28 0-3.89-1.61T1 11.5t1.61-3.89T6.5 6H10v1H6.5q-1.86 0-3.18 1.32T2 11.5t1.32 3.18T6.5 16H10v1zm1-5v-1h9v1zm6.5 5v-1h3.5q1.86 0 3.18-1.32T22 11.5t-1.32-3.18T17.5 7H14V6h3.5q2.28 0 3.89 1.61T23 11.5t-1.61 3.89T17.5 17z"></path></svg>);
const IconTrash = ({ size = 13 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ display: 'block' }}><path fill="currentColor" d="M6 20V6H5V5h4v-.77h6V5h4v1h-1v14zm1-1h10V6H7zm2.808-2h1V8h-1zm3.384 0h1V8h-1zM7 6v13z"></path></svg>);

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
      {aa.aaState === 'none' && <span style={sx('font-size:8px;line-height:1')}>✕</span>}
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
    <span style={sx("font-family:'Neue Montreal';font-weight:500;font-size:15px;color:var(--on-surface);white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{c.name}</span>
    {c.isExample && (
      <span style={sx('flex:none;font-family:Neue Montreal;font-size:8px;letter-spacing:var(--track-flat);text-transform:uppercase;color:var(--on-surface-muted);border:1px solid var(--line-strong);padding:2px 6px')}>Example</span>
    )}
  </span>
  {c.current && (
    <span style={sx('display:inline-flex;align-items:center;gap:6px;flex:none;font-family:Neue Montreal;font-size:9px;letter-spacing:var(--track-flat);text-transform:uppercase;color:var(--on-surface)')}>
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
        <span style={sx('font-family:Neue Montreal;font-size:7.5px;letter-spacing:.09em;text-transform:uppercase;color:#a3a39c;white-space:nowrap')}>{m.label}</span>
        {/* Value first, badge trailing — the opposite order to the list row, and for the reason the
            row uses its own: put the number where the eye is already reading. The row's values are
            a RIGHT-aligned numeric column, so the badge leads and the count lands on the shared
            right edge. Here the values are a LEFT-aligned column — 0.069, Warm, 24.07.26 all start
            on one line — so a leading badge indented this one number out of that column and broke
            the only alignment the grid has. The number takes the column edge; the badge follows as
            the qualifier it is. */}
        <span style={sx('display:flex;align-items:baseline;gap:7px;min-width:0;font-family:Neue Montreal;font-size:11px;letter-spacing:.01em;color:var(--on-surface);white-space:nowrap;text-transform:capitalize')}>
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
    }}>{active && <IconCheck size={8} />}</span>
);

// swatch value row (result bands + overlay bands share it; overlay renders the caveat chip)
function ValueRow({ v, showCaveat }) {
  return (
    <button type="button" data-ix="cell" data-focus="value" onClick={v.onCopy} aria-label={v.aria} style={v.rowStyle}>
      <span style={v.colStyle}>
        <span style={v.labelRowStyle}>
          <span style={sx('font-family: Neue Montreal; font-size: 8px')}>{v.labelText}</span>
          {showCaveat && v.hasCaveat && (<span style={sx('font-size: 8px; font-family: Neue Montreal; text-transform: uppercase')}>{v.caveat}</span>)}
        </span>
        <span style={showCaveat ? sx('font-family: Neue Montreal; text-transform: uppercase; overflow: hidden; display: block') : sx('font-family: Neue Montreal; text-transform: uppercase; font-size: 12px; overflow: hidden; display: block')}><span style={v.valueAnim}>{v.display}</span></span>
      </span>
      <span style={v.iconWrapStyle} aria-hidden="true">
        {v.copied && <IconCheck />}
        {v.notCopied && <IconCopy />}
      </span>
    </button>
  );
}

const contrastB006Label = (
  <span style={sx('display:flex;align-items:center;gap:7px;height:14px')}><span aria-hidden="true" style={{ display: 'inline-flex' }}><IconContrast /></span>Contrast</span>
);
const exportB006Label = (
  <span style={sx('display:flex;align-items:center;gap:7px;height:14px')}><span aria-hidden="true" style={{ display: 'inline-flex' }}><IconExport /></span>Export</span>
);
// Filing takes the same folder glyph the archive row and the overlay header already use — one
// concept, one mark — and a label that changes with the state rather than an icon that doesn't.
const assignB006Label = (text) => (
  <span style={sx('display:flex;align-items:center;gap:7px;height:14px')}><span aria-hidden="true" style={{ display: 'inline-flex' }}><IconFolder /></span>{text}</span>
);
// Share is the one action-row button that both carries an icon AND swaps its text, so it composes
// the icon wrapper with SwapLabel — the link icon holds position while the label resolves against
// its hidden twin, and the row never reflows mid-copy.
const shareB006Label = (copied) => (
  <span style={sx('display:flex;align-items:center;gap:7px;height:14px')}>
    <span aria-hidden="true" style={{ display: 'inline-flex' }}><IconLink /></span>
    <SwapLabel copied={copied} idle="Share link" />
  </span>
);

// Mobile read-only share view. A separate lightweight surface, NOT a responsive port of the tool —
// it exists so a shared link opened on a phone shows the palette instead of the desktop gate. The
// tool still gates; this only ever renders somebody else's finished palette.
function MobileShareView({ ms }) {
  return (
    <div data-mobile-share="1" role="region" aria-label={'Shared palette: ' + ms.name}
      style={sx('position:fixed;inset:0;z-index:150;overflow-y:auto;background:var(--surface);display:flex;flex-direction:column;-webkit-overflow-scrolling:touch')}>
      <div style={sx('flex:none;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:18px 18px 0')}>
        {/* masked rather than an <img>, so the mark takes --on-surface and stays correct in both themes */}
        <span role="img" aria-label="Atmos Gallery" style={{ ...sx('display:block;width:104px;height:16px;flex:none;background:var(--on-surface)'), WebkitMask: MARK_MASK, mask: MARK_MASK }}></span>
        <span style={sx('font-family:Neue Montreal;font-size:9px;letter-spacing:.12em;text-transform:uppercase;color:var(--on-surface-muted)')}>Shared palette</span>
      </div>

      <div style={sx('flex:none;padding:26px 18px 22px')}>
        <h1 style={sx("font-family:'Neue Montreal';font-weight:500;font-size:34px;line-height:1.05;letter-spacing:-.015em;color:var(--on-surface);margin:0;text-wrap:balance")}>{ms.name}</h1>
        {ms.descriptors.length > 0 && (
          <div style={sx('display:flex;flex-wrap:wrap;gap:6px;margin-top:14px')}>
            {ms.descriptors.map((d, i) => (
              <span key={i} style={sx('font-family:Neue Montreal;font-size:11px;padding:4px 8px;border:1px solid color-mix(in srgb, var(--on-surface) 15%, transparent);background:color-mix(in srgb, var(--on-surface) 9%, var(--surface));color:var(--on-surface);text-transform:capitalize')}>{d}</span>
            ))}
          </div>
        )}
        {ms.hasRationale && (
          <p style={sx("font-family:'Neue Montreal';font-size:14px;line-height:1.5;color:var(--on-surface-muted);margin:16px 0 0;text-wrap:pretty")}>{ms.rationale}</p>
        )}
      </div>

      {/* the palette itself: full-bleed rows, each tappable to take its hex */}
      <div role="group" aria-label="Palette swatches — tap a colour to copy its hex" style={sx('flex:none;display:flex;flex-direction:column;width:100%')}>
        {ms.rows.map((r) => (
          <button key={r.key} type="button" onClick={r.onCopy} aria-label={r.aria} style={r.style}>
            <span style={r.hexStyle}>{r.hex}</span>
            <span style={r.metaStyle}>
              {r.copied ? (<><IconCheck />Copied</>) : r.pct}
            </span>
          </button>
        ))}
      </div>

      {/* Flows straight after the colours rather than anchoring to the bottom: on a tall phone a
          stretched footer strands this line half a screen away from what it refers to. */}
      <div style={sx('flex:none;padding:24px 18px 34px')}>
        <p style={sx("font-family:'Neue Montreal';font-size:12px;line-height:1.6;color:var(--on-surface-muted);margin:0;text-wrap:pretty")}>Open Atmos Gallery on a desktop to read a palette from your own image.</p>
      </div>
    </div>
  );
}

function themeSwitchLabel(vals) {
  return (
    <span style={sx('display:flex;align-items:center;gap:7px;height:14px')}>
      <span aria-hidden="true" style={{ ...sx('position:relative;display:inline-block;width:28px;height:14px;flex:none;transition:background .28s var(--ease-standard)'), background: vals.switchTrackBg }}>
        <span style={{ ...sx('position:absolute;left:2px;top:2px;width:10px;height:10px;background:var(--surface);transition:transform .28s var(--ease-standard)'), transform: vals.switchDotX }}></span>
      </span>{vals.themeLabel}
    </span>
  );
}

const liveRegionStyle = sx('position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;margin:-1px;padding:0;border:0');

export default function AppView({ vals }) {
  // A shared link on a phone renders ONLY the read-only palette. Returning early rather than
  // layering it over the tool keeps the desktop app out of the DOM entirely on a viewport that
  // cannot use it: nothing behind to tab into, no archive laid out off-screen, no orbit stage.
  if (vals.showMobileShare) {
    return (
      <div data-app="1" style={sx('min-height:100vh;display:flex;flex-direction:column;background:var(--surface)')}>
        <div aria-live="polite" role="status" style={liveRegionStyle}>{vals.announce}</div>
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

      {/* brand mark: fixed at top-centre; the wordmark shape masks a drifting GRAYSCALE gradient,
          composited with mix-blend difference. Landing: decorative; in the tool: a button back to the start. */}
      {vals.showLogoDecor && (
        <div data-logo="1" role="img" aria-label="Atmos Gallery" style={{ ...logoStyle, pointerEvents: 'none' }}></div>
      )}
      {vals.showLogoButton && (
        <HBtn type="button" data-logo="1" data-focus="chrome" onClick={vals.showIntroAgain} aria-label="Atmos Gallery — return to the start screen" title="Return to the start screen"
          style={{ ...logoStyle, border: 0, padding: 0, cursor: 'pointer' }} styleHover={{ opacity: 0.82 }} />
      )}

      {/* One surface, two copies. On a phone the landing IS the small-screen gate — same ring stage,
          same centred block, gate copy instead of the statement + CTA — so there is never a second
          [data-orbit] in the DOM for the engine to find. data-desk-gate marks it for the CSS that
          hides the tool behind it. */}
      {vals.showLanding && (
        <div data-landing="1" {...(vals.narrow ? { 'data-desk-gate': '1' } : {})} role="region" aria-label={vals.narrow ? 'Desktop recommended' : 'Welcome to Atmos Gallery'} style={sx('position:fixed;inset:0;z-index:150;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:clip;background:var(--surface)')}>
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
          <div style={sx('position:relative;z-index:2;display:flex;flex-direction:column;align-items:center;text-align:center;pointer-events:none;padding:0 26px')}>
            {vals.narrow ? (
              /* small screen: the honest gate copy, sized to fit inside the ring the engine builds
                 around it (_heroReach measures this block, so a narrower column = a tighter ring).
                 It carries the SAME masked reveal as the desktop statement — the gate is the phone's
                 arrival, so its copy rises out of the mask as the loader uncovers rather than being
                 there already. One pre-authored line-group per block, no split; the masks are inside
                 the h1/p so those boxes stay exactly the size _heroReach measures. */
              <div style={sx('position:relative;display:flex;flex-direction:column;align-items:center;max-width:280px')}>
                <h1 style={sx("font-family:'Neue Montreal';font-weight:500;font-size:24px;line-height:1.2;letter-spacing:-.01em;color:var(--on-surface);margin:0;max-width:15ch;text-wrap:balance")}>
                  <span style={sx('display:block;overflow:hidden')}><span data-land-line="1" style={sx('display:block')}>Atmos Gallery is a desktop experience.</span></span>
                </h1>
                <p style={sx("font-family:'Neue Montreal';font-size:13px;line-height:1.6;color:var(--on-surface-muted);margin:14px 0 0;max-width:26ch;text-wrap:pretty")}>
                  <span style={sx('display:block;overflow:hidden')}><span data-land-line="1" style={sx('display:block')}>Open this link on a wider screen to drop an image and pull its palette.</span></span>
                </p>
              </div>
            ) : (
              <div style={sx('position: relative; display: flex; flex-direction: column; align-items: center; width: 606px')}>
                <h1 style={sx("font-family:'Neue Montreal';font-weight:500;font-size:clamp(28px,4.4vw,40px);line-height:1.16;letter-spacing:var(--track-statement);margin:0;max-width:20ch;text-wrap:balance")}>
                  <span style={sx('display:block;overflow:hidden')}><span data-land-line="1" style={sx('display: block; color: var(--on-surface); font-size: 32px; width: 507px')}>Colour read from light and atmosphere.</span></span>
                  <span style={sx('display:block;overflow:hidden')}><span data-land-line="1" style={sx('display: block; color: color-mix(in srgb, var(--on-surface) 50%, transparent); font-size: 32px')}>In seconds.</span></span>
                </h1>
                <div style={sx('margin-top:36px;pointer-events:auto')}>
                  <HBtn type="button" data-focus="chrome" data-glass-cta="1" onClick={vals.getStarted} aria-label="Get started" style={vals.glassCta} styleHover={vals.glassCtaHover} styleActive={vals.glassCtaActive}>Get Started</HBtn>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* click-to-zoom lightbox: fixed overlay the zoomed reference image FLIPs into */}
      <div data-click-zoom-lightbox="1" style={sx('z-index:170;cursor:zoom-out;background-color:#000000e6;justify-content:center;align-items:center;padding:3em;display:none;position:fixed;inset:0')}></div>

      {/* Logo reveal loader: first-ever visit only, before the Get Started landing. */}
      {vals.showLoader && (
        <div data-load-wrap="1" aria-hidden="true" style={sx('position:fixed;inset:0;z-index:190;color:#ffffff')}>
          <div data-load-bg="1" style={sx('position:absolute;inset:0;background:#1C1B1A')}></div>
          <div data-load-container="1" style={sx('position:relative;z-index:2;display:flex;flex-direction:column;justify-content:center;align-items:center;width:100%;height:100%;padding:0 16px;box-sizing:border-box')}>
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

      {/* Curved-wipe transition layer (Get Started handoff). Caps are transient motion shape —
          the one sanctioned curved exception; never a persistent border-radius on UI. */}
      <div data-wipe="1" aria-hidden="true" style={sx('position:fixed;inset:0;z-index:160;pointer-events:none;overflow:hidden;display:none')}>
        <div data-wipe-panel="1" style={sx('position:absolute;inset:0;background:#1C1B1A;will-change:transform')}>
          <div data-wipe-cap-top="1" style={sx('position:absolute;left:-8%;bottom:100%;width:116%;height:15vh;background:#1C1B1A;border-radius:50% 50% 0 0;transform:scaleY(0);transform-origin:bottom center')}></div>
          <div data-wipe-cap-bottom="1" style={sx('position:absolute;left:-8%;top:100%;width:116%;height:15vh;background:#1C1B1A;border-radius:0 0 50% 50%;transform:scaleY(1);transform-origin:top center')}></div>
          <div style={sx('position:absolute;inset:0;display:flex;align-items:center;justify-content:center')}>
            <div style={sx('overflow:hidden;padding:8px 6px')}>
              <img data-wipe-word="1" src="/assets/atmos-gallery-logo-white.svg" alt="Atmos Gallery" style={sx('display:block;height:clamp(29px,4.81vw,53px);width:auto;transform:translateY(120%)')} />
            </div>
          </div>
        </div>
      </div>

      <header style={sx('display:flex;align-items:center;justify-content:space-between;height:64px;padding:0 16px;border-bottom:1px solid var(--line-strong);background:var(--surface);position:sticky;top:0;z-index:10')}>
        {/* LEFT — the one display preference. A running clock used to hold this corner: it reported
            nothing about the palette, the archive or the work, yet it was the first thing every
            left-to-right scan landed on. The theme switch takes the corner instead — it is the
            control that changes how everything else on the page is READ, and at utility weight it
            holds the edge without competing with the mark. */}
        <B006 data-emphasis="utility" data-focus="chrome" role="switch" aria-checked={vals.isDark} onClick={vals.toggleTheme} aria-label="Toggle dark theme" title="Light / dark" label={themeSwitchLabel(vals)} />
        {/* RIGHT — the acts. New generation drives the core loop, so it stays filled and leads the
            cluster in the DOM (and therefore in the tab order); the file pair follows behind a
            hairline at utility weight, so the two never read as peers.

            Saving and opening a project file moved UP here from the archive heading line. Both act
            on the archive as a whole rather than on the list they used to sit beside, and down
            there they were read as one more list control — a filter or a scope. In the bar they get
            their own space, next to the other things that act rather than describe, and the archive
            heading keeps only what belongs to the list. */}
        <div style={sx('display:flex;align-items:center;gap:14px')}>
          {vals.canReset && (<>
            <B006 data-emphasis="primary" onClick={vals.reset} label={<span style={sx('display:flex;align-items:center;height:14px')}>New generation</span>} />
            {vals.showProjectsBar && (<span aria-hidden="true" style={sx('width:1px;height:22px;flex:none;background:var(--line-strong)')}></span>)}
          </>)}
          {vals.showProjectsBar && (
            <div style={sx('display:flex;align-items:center;gap:8px')}>
              <div style={sx('position:relative;display:flex')}>
                <button type="button" data-ix="solid" data-focus="chrome" aria-haspopup="menu" aria-expanded={vals.fileMenuOpen} onClick={vals.toggleFileMenu} aria-label="Save a project file" style={vals.tier3BtnStyle}>Save file<span aria-hidden="true" style={{ fontSize: '8px' }}>▾</span></button>
                {vals.fileMenuOpen && (<>
                  <div style={sx('position:fixed;inset:0;z-index:40')} onClick={vals.toggleFileMenu} aria-hidden="true"></div>
                  <div role="menu" style={sx('position:absolute;top:calc(100% + 6px);right:0;z-index:41;min-width:230px;background:var(--surface);border:1px solid var(--line-strong);box-shadow:0 12px 30px rgba(0,0,0,.18);display:flex;flex-direction:column')}>
                    {vals.showSaveActive && (
                      <button type="button" role="menuitem" data-ix="cell" data-focus="chrome" onClick={vals.saveActiveFile} style={sx('display:flex;flex-direction:column;gap:2px;text-align:left;background:none;border:none;border-bottom:1px solid var(--line);padding:11px 14px;cursor:pointer;color:var(--on-surface);font:inherit')}>
                        <span style={sx('font-family:Neue Montreal;font-size:12.5px')}>Save this view</span>
                        <span style={sx('font-family:Neue Montreal;font-size:10px;color:var(--on-surface-muted)')}>{vals.activeScopeLabel}</span>
                      </button>
                    )}
                    <button type="button" role="menuitem" data-ix="cell" data-focus="chrome" onClick={vals.saveArchiveFile} style={sx('display: flex; flex-direction: column; gap: 2px; text-align: left; background: none; border: none; padding: 11px 14px; cursor: pointer; color: var(--on-surface); font: inherit; text-transform: capitalize')}>
                      <span style={sx('font-family:Neue Montreal;font-size:12.5px')}>Save whole archive</span>
                      <span style={sx('font-family:Neue Montreal;font-size:10px;color:var(--on-surface-muted)')}>Every project + Unfiled</span>
                    </button>
                    <button type="button" role="menuitem" data-ix="cell" data-focus="chrome" onClick={vals.showIntroAgain} aria-label="Show intro again" style={sx('display:flex;flex-direction:column;gap:2px;text-align:left;background:none;border:none;border-top:1px solid var(--line-strong);padding:11px 14px;cursor:pointer;color:var(--on-surface);font:inherit')}>
                      <span style={sx('font-family:Neue Montreal;font-size:12.5px')}>Show intro again</span>
                      <span style={sx('font-family:Neue Montreal;font-size:10px;color:var(--on-surface-muted)')}>Replay the landing — palettes untouched</span>
                    </button>
                  </div>
                </>)}
              </div>
              <button type="button" data-ix="solid" data-focus="chrome" onClick={vals.onOpenFile} aria-label="Open a project file to import" style={vals.tier3BtnStyle}>Open file</button>
              <input ref={vals.projectFileRef} type="file" accept="application/json,.json" onChange={vals.onProjectFileChange} tabIndex={-1} aria-hidden="true" style={{ display: 'none' }} />
            </div>
          )}
        </div>
      </header>

      <main aria-busy={vals.busy} style={sx('width: 100%; flex: 1; min-height: 500px; display: flex; flex-direction: column; justify-content: center; padding: 24px 16px 8px')}>

        {vals.isUpload && (<>
          <button type="button" data-focus="chrome" onClick={vals.onBrowse} onMouseEnter={vals.dropEnter} onMouseLeave={vals.dropLeave} onDrop={vals.onDrop} onDragOver={vals.onDragOver} onDragLeave={vals.onDragLeave} aria-label="Upload a reference image. Drop an image here, or activate to browse your files." style={vals.dropStyle}>
            <div style={sx('position:relative;width:38px;height:38px')} aria-hidden="true">
              <div style={sx('position:absolute;left:0;top:0;width:26px;height:26px;border:1px solid var(--on-surface-muted)')}></div>
              <div style={sx('position:absolute;right:0;bottom:0;width:26px;height:26px;border:1px solid var(--on-surface);background:var(--surface)')}></div>
            </div>
            {/* Masked line reveal, same as the landing statement — this copy is what ARRIVES when
                the loader's fold lifts off the tool. Each line is a pre-authored span inside its own
                overflow:hidden mask; the spacing lives on the MASK, never on the span, or the
                translate would drag the margin with it and the gap would breathe mid-tween. */}
            <div style={{ textAlign: 'center' }}>
              <div style={sx('overflow:hidden')}><div data-drop-line="1" style={sx("font-family:'Neue Montreal';font-weight:500;font-size:26px;color:var(--on-surface);letter-spacing:-.01em")}>Drop a reference image</div></div>
              <div style={sx('overflow:hidden;margin-top:8px')}><div data-drop-line="1" style={sx("font-family:'Neue Montreal';font-size:15px;color:var(--on-surface-muted)")}>We read its light and atmosphere - not its literal pixels.</div></div>
            </div>
            <span style={sx('display:block;overflow:hidden')}><span data-drop-line="1" style={sx('display:block;font-family: Neue Montreal; font-size: 13px; letter-spacing:var(--track-flat); text-transform: capitalize; color: var(--on-surface); border-bottom: 1px solid var(--on-surface); padding-bottom: 3px')}>Browse files</span></span>
            <input ref={vals.fileRef} type="file" accept="image/*" onChange={vals.onFile} tabIndex={-1} aria-hidden="true" style={{ display: 'none' }} />
          </button>
          {/* Sits OUTSIDE the dropzone button — inside, it would join the button's accessible name.
              Renders only where a live interpretation path actually exists, so it never promises a
              network call this build cannot make. (The unconditional "everything stays in your
              browser" line that used to lead it was removed by request; the claim itself still
              stands in the README and on /privacy.html.) */}
          {vals.showInterpNote && (
            <p style={sx("max-width:520px;margin:14px auto 0;text-align:center;font-family:'Neue Montreal';font-size:11px;line-height:1.5;letter-spacing:var(--track-flat);color:var(--on-surface-muted);text-wrap:pretty")}>When live interpretation is available, a small downscaled thumbnail is sent to the model to read the mood — it isn’t stored.</p>
          )}
        </>)}

        {vals.isProcessing && (
          <div style={sx('display:flex;flex-direction:column;align-items:center;gap:30px;padding:14px 0 6px')}>
            <div style={sx('position:relative;width:380px;height:250px;background:var(--surface);overflow:hidden')}>
              <canvas ref={vals.canvasRef} aria-hidden="true" style={sx('display:block;width:380px;height:250px')}></canvas>
              <div style={sx('position:absolute;inset:0;box-shadow:inset 0 0 0 1px var(--line-strong);pointer-events:none')}></div>
            </div>
            <div style={sx('width:380px;display:flex;flex-direction:column;gap:12px')}>
              <div style={sx('display:flex;justify-content:space-between;align-items:center')}>
                <span style={sx('display: inline-flex; align-items: center; gap: 9px; font-family: Neue Montreal; font-size: 9px; letter-spacing:var(--track-flat); color: var(--on-surface); text-transform: uppercase')}>
                  <span style={sx('width:7px;height:7px;background:var(--on-surface);animation:blink 1.5s ease infinite')} aria-hidden="true"></span>{vals.procStatus}</span>
                <span style={sx('font-family: Neue Montreal; font-size: 9px; color: var(--on-surface-muted)')}>OKLCH</span>
              </div>
              <div style={sx('height:2px;width:100%;background:var(--line);position:relative')}>
                <div ref={vals.progRef} style={sx('position:absolute;left:0;top:0;height:2px;width:0%;background:var(--on-surface)')}></div>
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
                <span style={sx("font-family:'Neue Montreal';font-size:12px;line-height:1.5;color:var(--on-surface-muted);text-wrap:pretty")}>A palette someone shared with you. It isn’t saved in this browser unless you save it.</span>
                <span style={sx('display:flex;align-items:center;gap:10px;flex:none')}>
                  <B006 onClick={vals.onSaveShared} aria-label="Save this shared palette to your archive" label="Save to archive" />
                  <B006 onClick={vals.onMakeOwn} aria-label="Start a new palette from your own image" label="Make your own" />
                </span>
              </div>
            )}
            <div role="group" aria-label="Generated palette swatches" style={sx('display:flex;height:340px;width:100%;gap:0')}>
              {vals.result.bands.map((b, bi) => (
                <div key={bi} data-band="1" role="group" aria-label={b.groupAria} onMouseEnter={vals.dimEnter} onMouseLeave={vals.dimLeave} style={b.style}>
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
                the tab order — Export first, the utilities last — so a keyboard traveller meets
                the actions in the same sequence the eye does. */}
            {/* One 8px rhythm across the whole row — between Export and Contrast, on both sides of
                the hairline, and between the three utilities — matching the archive header's bar.
                The utilities used to sit at 2px, which was right when they were borderless ghosts
                and tight clustering read as one object; now that they carry the system's 15% edge,
                2px reads as buttons touching. Same spacing, so the row has one rhythm. */}
            <div style={sx('display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:18px 0 0')}>
              {/* tier 1 — the payoff; the only filled control on this surface */}
              <B006 data-emphasis="primary" onClick={vals.openExport} aria-haspopup="dialog" aria-label="Export this palette as design tokens" label={exportB006Label} />
              {/* tier 2 — the two things you do WITH the palette once it exists: file it, then
                  inspect it. Both outlined, so Export stays the only filled control on the surface.
                  Filing leads inspection because it is the one that changes the archive; Contrast
                  keeps its position relative to the utilities behind the hairline. Disabled while
                  the palette is only in the URL — a shared palette has no record to file until it
                  is saved, and the strip above already offers that. */}
              <B006 data-emphasis="secondary" onClick={vals.openAssignCurrent} disabled={vals.assignDisabled} aria-haspopup="dialog" aria-label={vals.assignCurAria} label={assignB006Label(vals.assignLabel)} />
              {/* tier 2 — inspection, not a destination: outlined, unfilled */}
              <B006 data-emphasis="secondary" btnRef={vals.contrastBtnRef} onClick={vals.openContrast} disabled={vals.contrastDisabled} aria-haspopup="dialog" aria-label="Open contrast checker for this palette" label={contrastB006Label} />
              {/* tier 3 — convenience exits. Held in their own group behind a hairline so the
                  break reads as grouping rather than as a gap that a wrap could invent; keeping
                  the three together also means they wrap as a cluster, never one at a time. */}
              <div style={sx('display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding-left:8px;border-left:1px solid var(--line-strong)')}>
                <B006 data-emphasis="utility" onClick={vals.copyHexList} aria-label="Copy the whole palette as a plain hex list"
                  label={<SwapLabel copied={vals.hexListCopied} idle="Hex list" />} />
                <B006 data-emphasis="utility" onClick={vals.copyCss} aria-label="Copy the whole palette as CSS custom properties"
                  label={<SwapLabel copied={vals.cssCopied} idle="CSS variables" />} />
                <B006 data-emphasis="utility" onClick={vals.onShare} aria-label="Copy a shareable link to this palette" label={shareB006Label(vals.shareCopied)} />
              </div>
            </div>
            <div style={sx('display:flex;justify-content:space-between;align-items:flex-start;gap:16px;padding:26px 0 0')}>
              <div style={sx('flex:1;min-width:0')}>
                <div data-fx="1" data-split="1" style={sx("font-family:'Neue Montreal';font-weight:500;font-size:44px;line-height:1.0;letter-spacing:-.015em;color:var(--on-surface)")}>{vals.result.name}</div>
                <div data-fx="1" style={sx('display:flex;flex-wrap:wrap;gap:8px;margin-top:18px')}>
                  {vals.result.descriptors.map((d, di) => (
                    <span key={di} style={sx('font-family: Neue Montreal; font-size: 12px; padding-top: 4px; padding-right: 8px; padding-bottom: 4px; padding-left: 8px; border-width: 1px; border-style: solid; border-color: color-mix(in srgb, var(--on-surface) 15%, transparent); background: color-mix(in srgb, var(--on-surface) 9%, var(--surface)); color: var(--on-surface); text-transform: capitalize')}>{d}</span>
                  ))}
                </div>
              </div>
              {/* rationale only — the reference image moved down into the metadata row, which
                  frees this column's height and lets the name/rationale block sit closer to it */}
              <div style={sx('width:360px;flex:none;display:flex;flex-direction:column;align-items:flex-end')}>
                <p data-fx="1" data-split="1" style={sx("font-family:'Neue Montreal';font-size:15px;line-height:1.5;color:var(--on-surface-muted);text-align:right;margin:0;text-wrap:pretty;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;min-height:68px")}>{vals.result.rationale}</p>
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
                  <span data-meta-split="1" style={sx("font-family:'Neue Montreal';font-weight:500;font-size:9px;letter-spacing:var(--track-flat);text-transform:uppercase;color:var(--on-surface);padding-bottom:9px")}>{g.title}</span>
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
                          <dt data-meta-split="1" style={sx('font-family:Neue Montreal;font-size:8px;letter-spacing:var(--track-flat);text-transform:uppercase;color:var(--on-surface-muted);white-space:nowrap')}>{m.label}</dt>
                          <dd style={sx('display:flex;align-items:baseline;gap:8px;margin:0;min-width:0')}>
                            {m.aa && <AaBadge aa={m.aa} />}
                            <span data-meta-split="1" style={sx('font-family:Neue Montreal;font-size:13px;letter-spacing:var(--track-flat);color:var(--on-surface);white-space:nowrap;text-transform:capitalize;font-variant-numeric:tabular-nums')}>{m.value}</span>
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
              <div data-fx="1" style={sx('flex:none;margin-left:auto')}>
                {vals.result.hasRef && vals.result.refImageNode}
                {vals.result.noRef && (
                  <div aria-hidden="true" style={sx('width: 156px; height: 104px; border: 1px solid var(--line); background: var(--surface-raised); display: flex; align-items: center; justify-content: center')}>
                    <span style={sx('font-family:Neue Montreal;font-size:8.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--on-surface-muted)')}>No reference</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {vals.isError && (
          <div role="alert" style={sx('display:flex;flex-direction:column;align-items:center;justify-content:center;gap:22px;width:100%;min-height:420px;padding:40px;background:var(--surface-raised);border:1px solid var(--line-strong)')}>
            <div aria-hidden="true" style={sx('width:42px;height:42px;display:flex;align-items:center;justify-content:center;border:1px solid var(--on-surface);font-family:Neue Montreal;font-size:22px;line-height:1;color:var(--on-surface)')}>!</div>
            <div style={sx('text-align:center;max-width:440px')}>
              <div style={sx("font-family:'Neue Montreal';font-weight:500;font-size:24px;color:var(--on-surface);letter-spacing:-.01em")}>{vals.errorTitle}</div>
              <div style={sx("font-family:'Neue Montreal';font-size:15px;color:var(--on-surface-muted);margin-top:8px;text-wrap:pretty")}>{vals.errorMsg}</div>
            </div>
            <button type="button" data-ix="cta" data-focus="chrome" onClick={vals.onBrowse} style={sx('background:var(--on-surface);border:1px solid var(--on-surface);padding:12px 20px;font-family:Neue Montreal;font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--surface);cursor:pointer')}>Choose another image</button>
            <input ref={vals.fileRef} type="file" accept="image/*" onChange={vals.onFile} tabIndex={-1} aria-hidden="true" style={{ display: 'none' }} />
          </div>
        )}
      </main>

      <FeedSection vals={vals} />

      {/* The site footer, the same one privacy, terms and 404 close with — markup identical, styles
          from /site-foot.css, which index.html links because this app is bundled and cannot read
          legal.css. Classes rather than sx() for exactly one reason: the footer needs :hover,
          :focus-visible and a 700px media query, none of which an inline style can express, so the
          rules have to live in a stylesheet whatever we do — and then a second, inline copy of the
          layout would only be something to keep in sync with them.

          Only on 'Drop a reference'. That screen is the tool at rest — nothing has been dropped, the
          reel below is empty or idle, and the page has somewhere to put a footer. The result and
          processing stages are a working surface with drawers and overlays over them, where a
          full-bleed wordmark would be arriving underneath somebody's palette. The landing is exempt
          for a different reason: it is position:fixed over this whole frame, so it covers the footer
          rather than needing to be told about it.

          Below 720px the desktop gate hides every child of [data-app] except the gate itself, and this
          is a child of [data-app], so it goes with them — which is correct: that screen is not the
          tool, it is the notice standing in for it. */}
      {vals.isUpload && (
        <footer className="site-foot">
          <div className="site-foot__brand">
            <a href="/" aria-label="Atmos Gallery — home"><span className="site-foot__mark" aria-hidden="true"></span></a>
          </div>
          <div className="site-foot__meta">
            <p className="site-foot__origin">A Part of <a href="https://kau.studio">KauStudio</a></p>
            <nav className="site-foot__nav" aria-label="Legal">
              <a href="/privacy.html">Privacy Policy</a>
              <a href="/terms.html">Terms and Conditions</a>
            </nav>
            <p className="site-foot__rights">All Rights Reserved &copy; 2026</p>
          </div>
        </footer>
      )}
      <ContrastDrawer vals={vals} />
      <DetailOverlay vals={vals} />
      <HarmonyDrawer vals={vals} />
      <TagFilterDrawer vals={vals} />
      <ExportDialog vals={vals} />
      <RecogniseDialog vals={vals} />
      <AssignDialog vals={vals} />
      <ManageDialog vals={vals} />

      {vals.hasToast && (
        <div style={sx('position:fixed;left:0;right:0;bottom:28px;z-index:130;display:flex;justify-content:center;pointer-events:none')}>
          <div data-toast="1" role="status" aria-live="polite" style={sx('display:flex;align-items:center;gap:16px;background:var(--surface-raised);color:var(--on-surface);border:1px solid var(--line-strong);padding:11px 12px 11px 18px;box-shadow:0 14px 36px rgba(0,0,0,.24);pointer-events:auto')}>
            <span style={sx("font-family: 'Neue Montreal'; font-size: 13px; letter-spacing:var(--track-flat); white-space: nowrap; text-transform: capitalize")}>{vals.toastLabel}</span>
            <HBtn type="button" data-undo-btn="1" data-ix="press" data-focus="chrome" onClick={vals.undoDelete}
              style={sx('font-family:Neue Montreal;font-size:10px;letter-spacing:.12em;text-transform:uppercase;background:none;border:1px solid color-mix(in srgb, var(--on-surface) 15%, transparent);color:var(--on-surface);padding:7px 13px;cursor:pointer')}
              styleHover={{ background: 'var(--on-surface)', color: 'var(--surface)' }}>Undo</HBtn>
          </div>
        </div>
      )}

      {vals.hasNotice && (
        <div data-notice="1" role="status" style={sx('position:fixed;left:20px;bottom:20px;z-index:128;display:flex;align-items:center;gap:9px;background:var(--surface-raised);border:1px solid var(--line-strong);color:var(--on-surface-muted);padding:9px 13px;max-width:340px;box-shadow:0 10px 28px rgba(0,0,0,.16)')}>
          <span aria-hidden="true" style={sx('width:6px;height:6px;flex:none;background:var(--on-surface-muted)')}></span>
          <span style={sx('font-family:Neue Montreal;font-size:11px;line-height:1.4;letter-spacing:.01em;text-wrap:pretty')}>{vals.notice}</span>
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
  return (
    <section data-recent="1" aria-labelledby="feed-heading" style={sx('width: 100%; padding: 40px 16px 88px; border-top: 1px solid var(--line-strong); margin-top: 36px')}>
      {/* The heading line now carries the heading and nothing else. File work used to hold its right
          edge; it acts on the archive as a whole rather than on this list, and sitting one row above
          the scope and filter controls it read as a third list control that simply happened to be
          out of line. It lives in the top bar now, with the other things that act.

          The 7px below is deliberate rather than 8: the row beneath opens with bordered groups (29px
          buttons inside a 31px bar) that sit centred, adding 1px before their ink begins — 7 + 1 =
          the 8 those controls keep between each other. */}
      <div style={sx('display:flex;align-items:center;gap:12px;margin-bottom:7px')}>
        <h2 id="feed-heading" style={sx("font-family: 'Neue Montreal'; font-weight: 500; font-size: 15px; letter-spacing:var(--track-flat); color: var(--on-surface); margin: 0")}>Palette Overview</h2>
      </div>

      {/* Three intent tiers, left to right in DOM = on screen = in the tab order:
            1 · WHERE AM I — project scoping + management (constant, structural)
            2 · WHAT AM I SEEING — the filter panel (constant, changes what the list contains)
            3 · HOW AM I SEEING IT — the view switcher (list / grid / 3D)
          Every tier here is now a list control, which is what makes the bar read as one bank: the
          set, then what is kept of it, then how it is drawn. File work used to be tier 3 and has
          moved to the top bar — it acts on the archive as a whole rather than on this list, and it
          is used at machine changes and restores rather than every minute.
          The zones are told apart by proximity first (a hairline plus 8px between tiers vs 8px
          inside one), so the grouping survives greyscale and does not lean on colour. */}
      {/* 8px throughout, the same gap the Tier 2 controls already keep: with a hairline doing the
          separating, the space only has to give the rule room to breathe, not carry the grouping
          itself. The old 28px was sized for a world with no divider. */}
      {vals.showProjectsBar && (
        <div style={sx('display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:22px')}>
          {/* ONE home for the project concept. The tab row was already project navigation; managing
              projects used to be a second door to the same idea, standing in the utility cluster
              wearing a utility button's clothes. Scoping and management now share one surface and
              one border: the scope chips, then a hairline, then Manage. Nothing about the chips or
              the sliding pill changes — Manage deliberately carries no data-proj-chip and no
              aria-pressed, so the pill (which selects [data-proj-chip][aria-pressed="true"]) can
              never mistake an action for a scope. */}
          <div role="group" data-proj-group="1" aria-label="Projects" style={sx('position:relative;display:inline-flex;align-items:stretch;padding:2px;border:1px solid color-mix(in srgb, var(--on-surface) 15%, transparent);background:transparent;min-width:0;max-width:100%;overflow-x:auto')}>
            <span data-proj-pill="1" aria-hidden="true" style={sx('position:absolute;top:0;left:0;width:0;height:0;background:var(--on-surface);opacity:0;pointer-events:none')}></span>
            {vals.projectChips.map((ch) => (
              <button key={ch.key} type="button" data-proj-chip="1" data-focus="chrome" aria-pressed={ch.active} aria-label={ch.aria} onClick={ch.onClick} style={ch.chipStyle}>{ch.label}<span style={ch.countStyle}>{ch.count}</span></button>
            ))}
            <span aria-hidden="true" style={sx('flex:none;width:1px;margin:4px 4px;background:color-mix(in srgb, var(--on-surface) 15%, transparent)')}></span>
            <button type="button" data-proj-manage="1" data-ix="press" data-focus="chrome" aria-haspopup="dialog" onClick={vals.onOpenManage} aria-label="Manage projects — create, rename, or delete" style={vals.projManageStyle}>Manage</button>
          </div>
          {/* TIER 2 — what am I seeing. The filter panel and its applied chips: controls that change
              what the list CONTAINS, sitting beside the scopes that do the same at a broader grain,
              and before the switcher that decides how the result is drawn. Sort stays in the column
              header and per-page stays with the pager: both are view manipulation too, but they are
              bound to the thing they act on, and lifting the sort labels out of their columns would
              undo the header/value alignment this list is built on. */}
          {vals.showFacet && (<>
            {/* Divider between Tier 1 and Tier 2: the 28px gap alone left them reading as one long
                strip of controls. A hairline states the boundary outright — same --line-strong the
                section rules and the row separators already use, so the grouping is declared in the
                system's own vocabulary rather than implied by whitespace. */}
            <span aria-hidden="true" style={sx('flex:none;align-self:stretch;width:1px;background:var(--line-strong)')}></span>
            <div style={sx('display:flex;align-items:center;gap:8px;flex-wrap:wrap')}>
              <button type="button" data-facet-btn="1" data-ix="solid" data-focus="chrome" aria-haspopup="dialog" aria-expanded={vals.facetOpen} onClick={vals.openFacet} aria-label="Filter palettes" style={sx('background:none;border:1px solid var(--line-strong);padding:7px 12px;font-family:Neue Montreal;font-size:10px;letter-spacing:var(--track-flat);text-transform:uppercase;color:var(--on-surface);cursor:pointer')}>Filter</button>
              {/* One chip per applied filter across BOTH groups — accessibility first, matching the
                  panel's group order — each removable on its own, so a narrowing can be undone from
                  either end. No clear-all here: that was a third affordance for one act (chip ✕ ·
                  header CLEAR · panel CLEAR FILTER) and now lives only in the panel, beside the
                  facets it clears. */}
              {vals.appliedTags.map((t) => (
                <button key={t.key} type="button" data-focus="chrome" aria-label={t.aria} onClick={t.onRemove} style={sx('display:inline-flex;align-items:center;gap:7px;background:var(--on-surface);border:1px solid var(--on-surface);padding:7px 12px;font-family:Neue Montreal;font-size:10px;letter-spacing:var(--track-flat);text-transform:uppercase;color:var(--surface);cursor:pointer')}>
                  {t.label}{t.count && <span style={sx('font-size:8.5px;opacity:.7;font-variant-numeric:tabular-nums')}>{t.count}</span>}<span aria-hidden="true" style={{ fontSize: '9px' }}>✕</span>
                </button>
              ))}
            </div>
          </>)}
          {/* TIER 3 — HOW am I seeing it. The view switcher moved down here from the heading line to
              join the controls it belongs with: scope narrows the set, filter narrows it further,
              and this decides how what is left gets drawn. All three are list controls and now read
              as one bank. It keeps margin-left:auto, so it holds the section's right edge on its
              own now that the heading line above carries nothing but the heading.

              File work went the other way, up to the top bar — it acts on the archive rather than
              on this list, and does not belong in the middle of the daily path. */}
          {vals.feedHasItems && (
            <div role="group" aria-label="Feed layout" data-toggle-init="1" style={sx('position:relative;display:inline-grid;grid-template-columns:repeat(3,1fr);padding:2px;border:1px solid color-mix(in srgb, var(--on-surface) 15%, transparent);background:transparent;margin-left:auto')}>
              <span aria-hidden="true" style={vals.viewTogglePill}></span>
              <button type="button" data-toggle-btn="1" data-focus="chrome" aria-pressed={vals.listPressed} tabIndex={vals.listTab} onClick={vals.setList} onKeyDown={vals.viewToggleKey} style={vals.listToggleStyle}>List</button>
              <button type="button" data-toggle-btn="1" data-focus="chrome" aria-pressed={vals.gridPressed} tabIndex={vals.gridTab} onClick={vals.setGrid} onKeyDown={vals.viewToggleKey} style={vals.gridToggleStyle}>Grid</button>
              <button type="button" data-toggle-btn="1" data-focus="chrome" aria-pressed={vals.reelPressed} tabIndex={vals.reelTab} onClick={vals.setReel} onKeyDown={vals.viewToggleKey} style={vals.reelToggleStyle}>3D</button>
            </div>
          )}
        </div>
      )}

      {vals.feedEmpty && (
        <div style={sx('display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;width:100%;padding:56px 40px;background:var(--surface-raised);border:1px dashed var(--line-strong)')}>
          <div aria-hidden="true" style={sx('position:relative;width:34px;height:34px')}>
            <div style={sx('position:absolute;left:0;top:0;width:22px;height:22px;border:1px solid var(--line-strong)')}></div>
            <div style={sx('position:absolute;right:0;bottom:0;width:22px;height:22px;border:1px solid var(--on-surface-muted);background:var(--surface-raised)')}></div>
          </div>
          <div style={sx("font-family:'Neue Montreal';font-weight:500;font-size:16px;color:var(--on-surface)")}>Nothing here yet</div>
          <div style={sx("font-family:'Neue Montreal';font-size:14px;color:var(--on-surface-muted)")}>Palettes you generate collect here, newest first.</div>
        </div>
      )}
      <div ref={vals.gridRef} onKeyDown={vals.onGridKey}>

        {/* Sort header. It is NOT a table header — the rows below are buttons, not cells — so it
            claims no table semantics it cannot honour: a labelled group of toggle buttons, with the
            ordering announced through the live region on activation. Its columns are laid out from
            the same tokens and the same 16px gap as the rows, and it ends on the same action
            gutter, which is what puts the labels directly over their numbers. */}
        {vals.showSortHeader && (
          <div role="group" aria-label="Sort palettes" style={sx('display:grid;grid-template-columns:var(--row-grid);align-items:center;gap:16px;width:100%;padding:0 var(--row-cell-inset) 7px var(--row-inset)')}>
            {/* the strip and identity tracks carry no label — one spacer spanning both, so the
                header is laid out by the SAME template as the rows rather than by a flex child
                that happens to end in the right place */}
            <span aria-hidden="true" style={sx('grid-column:span 2;min-width:0')}></span>
            {/* AA PAIRS owns its column: the sort label right-aligns over the pair count, and the
                ⓘ travels immediately in front of it. Sorting still runs on the true numbers, never
                on the badge.

                The ⓘ used to be pinned to the far left of the column, right-aligned in the badge's
                own 35px slot so the two shared an edge. That worked while the column was 104px
                wide and the badge was pinned left to match. Now the column takes a share of the
                row, and anything pinned to its left edge would stand a track-width away from the
                thing it labels — so the marker goes where its meaning is, next to the label, and
                the column keeps its ONE right edge: label over count, both flush. */}
            <div style={sx('display:inline-flex;align-items:center;justify-content:flex-end;gap:8px;min-width:0')}>
              <div style={sx('position:relative;display:inline-flex;flex:none')}>
                <button type="button" data-ix="press" data-focus="chrome" aria-expanded={vals.aaInfoOpen} aria-label="What the AA badge and the pair count mean" onClick={vals.toggleAaInfo} onKeyDown={vals.aaInfoKey} style={sx('width:16px;height:16px;display:inline-flex;align-items:center;justify-content:center;background:transparent;border:1px solid var(--line-strong);padding:0;font-family:Neue Montreal;font-size:9px;color:var(--on-surface-muted);cursor:pointer')}>i</button>
                {vals.aaInfoOpen && (<>
                  <div style={sx('position:fixed;inset:0;z-index:40')} onClick={vals.toggleAaInfo} aria-hidden="true"></div>
                  <div role="note" style={sx('position:absolute;top:calc(100% + 6px);right:0;z-index:41;width:264px;background:var(--surface);border:1px solid var(--line-strong);box-shadow:0 12px 30px rgba(0,0,0,.18);padding:12px 14px;display:flex;flex-direction:column;gap:8px')}>
                    {/* The one place the denominator is stated, now that the rows show a bare count.
                        These three lines must track paletteMetrics.aaState — the badge and its
                        explanation drifting apart is worse than having no explanation. */}
                    <span style={sx('font-family:Neue Montreal;font-size:11px;line-height:1.5;color:var(--on-surface);text-wrap:pretty')}>A pair is two palette colours that reach WCAG AA against each other — 4.5:1, the minimum for normal text — so one can carry text on the other.</span>
                    <span style={sx('font-family:Neue Montreal;font-size:11px;line-height:1.5;color:var(--on-surface-muted);text-wrap:pretty')}>Every two-colour combination is tested: 5 colours make 10 pairs.</span>
                    <span style={sx('font-family:Neue Montreal;font-size:11px;line-height:1.5;color:var(--on-surface-muted);text-wrap:pretty')}>Badge: ✓ flexible, 3+ usable pairs · ◐ limited, 1–2 · ✕ none.</span>
                  </div>
                </>)}
              </div>
              {vals.sortCols.filter((col) => col.key === 'aa').map((col) => (
                <button key={col.key} type="button" data-ix="press" data-focus="chrome" aria-pressed={col.pressed} aria-label={col.aria} onClick={col.onSort} style={col.style}>
                  <span aria-hidden="true" style={sx('display:inline-flex;align-items:center;justify-content:center;width:9px;flex:none')}>{col.showChevron && <span data-sort-chevron="1" data-dir={col.dir} style={{ display: 'inline-flex', opacity: col.chevronDim ? 0.32 : 1 }}><IconChevron /></span>}</span>{col.label}
                </button>
              ))}
            </div>
            {/* MAX CONTRAST and DATE each own their column outright */}
            {vals.sortCols.filter((col) => col.key === 'contrast' || col.key === 'time').map((col) => (
              <button key={col.key} type="button" data-ix="press" data-focus="chrome" aria-pressed={col.pressed} aria-label={col.aria} onClick={col.onSort} style={col.style}>
                <span aria-hidden="true" style={sx('display:inline-flex;align-items:center;justify-content:center;width:9px;flex:none')}>{col.showChevron && <span data-sort-chevron="1" data-dir={col.dir} style={{ display: 'inline-flex', opacity: col.chevronDim ? 0.32 : 1 }}><IconChevron /></span>}</span>{col.label}
              </button>
            ))}
          </div>
        )}

        {/* LIST view (canonical) */}
        <div data-list-wrap="1" style={vals.listWrapStyle}>
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
                <div data-row-main="1" style={sx('display:grid;grid-template-columns:var(--row-grid);align-items:center;gap:16px;width:100%;min-height:var(--row-list-height);padding:12px var(--row-cell-inset) 12px var(--row-inset)')}>
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
                  <div aria-hidden="true" style={sx('display:flex;width:100%;height:24px;border:1px solid var(--line)')}>
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
                  <div style={sx('display:flex;align-items:center;gap:16px;min-width:0;overflow:hidden')}>
                  {/* Secondary by SIZE alone now: down a step from the overview's title (16 → 13),
                      but at the same medium weight the filter panel gives its facet names. Both are
                      the same kind of thing — the name of a choosable, the subject of its row — and
                      13/500 is what that is called in this app. Still full --on-surface ink, not
                      muted: it is the row's only text identifier and the one thing a screen reader
                      leads with, so the demotion is a size step and never a fade. */}
                  <span style={sx("font-family:'Neue Montreal';font-weight:500;font-size:13px;color:var(--on-surface);flex:none")}>{c.name}</span>
                  {c.isExample && (
                    <span style={sx('flex: none; font-family: Neue Montreal; font-size: 8px; letter-spacing:var(--track-flat); text-transform: uppercase; color: var(--on-surface-muted); border: 1px solid var(--line-strong); padding: 2px 6px')}>Example</span>
                  )}
                  {/* "Viewing" sits with the name and the Example chip — the labels that say what
                      this palette IS — and, structurally, it has to sit before the flexible column:
                      appearing on the right would push the metric columns left on whichever row was
                      selected, and a column that moves for one row is not a column. */}
                  {c.current && (
                    <span style={sx('display: inline-flex; align-items: center; gap: 6px; flex: none; font-family: Neue Montreal; font-size: 9px; letter-spacing:var(--track-flat); text-transform: uppercase; color: var(--on-surface)')}>
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
                  <span style={c.aaCell}>
                    <AaBadge aa={c} />
                    <span style={c.metricValue}>{c.aaValueText}</span>
                  </span>
                  {/* MAX CONTRAST — a separate measurement, so a separate column */}
                  <span style={c.contrastCell}>{c.contrastValueText}</span>
                  {/* absolute stamp as the value, relative as the hover layer; the row's aria
                      sentence still ends "Generated 3h ago", so both forms reach every modality.
                      data-row-time is the hook for the one movement in this row: on hover it steps
                      one gutter left, into room its own column already holds, and hands the margin
                      to the buttons. It is the only column allowed to move, which is why it is the
                      only one that carries a hook. */}
                  <span data-row-time="1" style={c.timeCell} title={c.timeRel}>{c.time}</span>
                </div>
              </div>
              {/* The buttons land on the row's own inset — the margin the stamp holds at rest and
                  hands over while the pointer is here. Their vertical centring and their arrival
                  travel live in global.css: one transform cannot be half inline and half in a
                  stylesheet, and the half that is a state has to be the one that wins. Only what is
                  static about them is here. 6px apart, unchanged. */}
              <button type="button" data-ix="solid" data-del="1" data-focus="chrome" aria-label={c.assignAria} onClick={c.onAssign} style={sx('position:absolute;right:calc(var(--row-action-offset) + 36px);z-index:6;width:30px;height:30px;display:inline-flex;align-items:center;justify-content:center;background:var(--surface);border:1px solid color-mix(in srgb, var(--on-surface) 15%, transparent);color:var(--on-surface);cursor:pointer')}>
                <IconFolder />
              </button>
              <button type="button" data-ix="solid" data-del="1" data-focus="chrome" aria-label={c.deleteAria} onClick={c.onDelete} style={sx('position:absolute;right:var(--row-action-offset);z-index:6;width:30px;height:30px;display:inline-flex;align-items:center;justify-content:center;background:var(--surface);border:1px solid color-mix(in srgb, var(--on-surface) 15%, transparent);color:var(--on-surface);cursor:pointer')}>
                <IconTrash />
              </button>
            </div>
          ))}
        </div>

        {/* LIST pagination: per-page limit + page nav (list view only) */}
        {vals.showPagination && (
          <nav aria-label="Palette list pages" style={sx('display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;padding:16px 0 0')}>
            <div role="group" aria-label="Palettes per page" style={sx('display:flex;align-items:center;gap:10px')}>
              <span style={sx('font-family:Neue Montreal;font-size:9px;letter-spacing:var(--track-flat);text-transform:uppercase;color:var(--on-surface-muted)')}>Per page</span>
              <div data-toggle-init="1" style={sx('position:relative;display:inline-grid;grid-template-columns:repeat(3,1fr);padding:2px;border:1px solid color-mix(in srgb, var(--on-surface) 15%, transparent);background:transparent')}>
                <span aria-hidden="true" style={vals.pageTogglePill}></span>
                {vals.pageSizeOptions.map((o) => (
                  <button key={o.label} type="button" data-toggle-btn="1" data-focus="chrome" aria-pressed={o.pressed} tabIndex={o.tabIndex} onClick={o.onSelect} onKeyDown={vals.pageToggleKey} style={o.style}>{o.label}</button>
                ))}
              </div>
            </div>
            <div style={sx('display:flex;align-items:center;gap:10px')}>
              <button type="button" data-ix="press" data-focus="chrome" disabled={vals.prevDisabled} aria-label="Previous page" onClick={vals.prevPage} style={vals.prevStyle}>Prev</button>
              <span aria-live="polite" style={sx('font-family:Neue Montreal;font-size:9px;letter-spacing:var(--track-flat);text-transform:uppercase;color:var(--on-surface-muted);white-space:nowrap')}>{vals.pageLabel}</span>
              <button type="button" data-ix="press" data-focus="chrome" disabled={vals.nextDisabled} aria-label="Next page" onClick={vals.nextPage} style={vals.nextStyle}>Next</button>
            </div>
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
                          <span style={sx('font-family:Neue Montreal;font-size:8.5px;letter-spacing:.06em;text-transform:uppercase;color:var(--on-surface-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis')}>{c.descriptors}</span>
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
                      <span style={sx('font-family:Neue Montreal;font-size:8.5px;letter-spacing:.06em;text-transform:uppercase;color:var(--on-surface-muted)')}>{c.descriptors}</span>
                    </div>
                    <CardMetrics c={c} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* universe chrome (fixed above the field) */}
          <div data-universe-chrome="1" style={sx('position: absolute; top: 0; left: 0; right: 0; height: 56px; z-index: 5; display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 0 20px; background: linear-gradient(180deg, #FAF9F500, #00000000); pointer-events: none')}>
            <div style={sx('display:flex;align-items:baseline;gap:12px;pointer-events:auto')}></div>
            <button ref={vals.universeCloseRef} type="button" data-ix="solid" data-focus="chrome" onClick={vals.setList} aria-label="Close palette universe" style={sx('pointer-events: auto; display: inline-flex; align-items: center; gap: 9px; background: var(--surface); border: 1px solid color-mix(in srgb, var(--on-surface) 15%, transparent); padding: 9px 14px; font-family: Neue Montreal; font-size: 10px; letter-spacing:var(--track-flat); text-transform: uppercase; color: var(--on-surface); cursor: pointer; transition: background .15s var(--ease-standard),color .15s var(--ease-standard),border-color .15s var(--ease-standard)')}>Close <span aria-hidden="true">Esc</span></button>
          </div>

          {vals.universeEngine && (
            <span data-universe-chrome="1" aria-hidden="true" style={sx('position:absolute;left:20px;bottom:18px;z-index:5;font-family:Neue Montreal;font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:var(--on-surface-muted);background:color-mix(in srgb, var(--surface-raised) 88%, transparent);padding:5px 9px;border:1px solid var(--line);pointer-events:none')}>Drag or scroll to explore</span>
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
              <span style={sx('font-family:Neue Montreal;font-size:10px;letter-spacing:var(--track-flat);text-transform:uppercase;color:var(--on-surface-muted);text-align:center')}>No image-backed palettes here yet — drop a reference image to fill the reel.</span>
            </div>
          )}
          <div data-reel-chrome="1" style={sx('position:absolute;top:0;left:0;right:0;height:56px;z-index:5;display:flex;align-items:center;justify-content:space-between;gap:16px;padding:0 20px;pointer-events:none')}>
            <div style={sx('display:flex;align-items:baseline;gap:12px;pointer-events:auto')}></div>
            <button ref={vals.reelCloseRef} type="button" data-ix="solid" data-focus="chrome" onClick={vals.setList} aria-label="Close reel" style={sx('pointer-events:auto;display:inline-flex;align-items:center;gap:9px;background:var(--surface);border:1px solid color-mix(in srgb, var(--on-surface) 15%, transparent);padding:9px 14px;font-family:Neue Montreal;font-size:10px;letter-spacing:var(--track-flat);text-transform:uppercase;color:var(--on-surface);cursor:pointer;transition:background .15s var(--ease-standard),color .15s var(--ease-standard),border-color .15s var(--ease-standard)')}>Close <span aria-hidden="true">Esc</span></button>
          </div>
          <span data-reel-chrome="1" aria-hidden="true" style={sx('position:absolute;left:20px;bottom:18px;z-index:5;font-family:Neue Montreal;font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:var(--on-surface-muted);background:color-mix(in srgb, var(--surface-raised) 88%, transparent);padding:5px 9px;border:1px solid var(--line);pointer-events:none')}>Drag or scroll to spin</span>
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
      <div data-cx-backdrop="1" onClick={vals.closeContrast} style={sx('position:absolute;inset:0;background:color-mix(in srgb, #141413 55%, transparent);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)')}></div>
      <div data-cx-drawer="1" data-contrast-dialog="1" data-lenis-prevent="1" role="dialog" aria-modal="true" aria-label={'Contrast checker for ' + contrast.name} onKeyDown={vals.trapContrast} style={sx('position:absolute;right:0;top:0;bottom:0;width:500px;max-width:94vw;background:var(--surface);border-left:1px solid var(--line-strong);display:flex;flex-direction:column;overflow-y:auto')}>
        <header data-cx-sec="1" style={sx('display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:20px 22px 0')}>
          <div style={sx('display:flex;flex-direction:column;gap:4px;min-width:0')}>
            <span style={sx('font-family: Neue Montreal; font-size: 10px; letter-spacing:var(--track-flat); text-transform: uppercase; color: var(--on-surface-muted)')}>Contrast checker</span>
            <span data-drawer-split="1" style={sx("font-family:'Neue Montreal';font-weight:500;font-size:22px;letter-spacing:-.01em;color:var(--on-surface);white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{contrast.name}</span>
          </div>
          <button type="button" data-ix="solid" data-focus="chrome" onClick={vals.closeContrast} aria-label="Close contrast checker" style={sx('flex: none; background: none; border: 1px solid color-mix(in srgb, var(--on-surface) 15%, transparent); padding: 8px 13px; font-family: Neue Montreal; font-size: 10px; letter-spacing:var(--track-flat); text-transform: uppercase; color: var(--on-surface); cursor: pointer; transition: background .15s var(--ease-standard), color .15s var(--ease-standard)')}>Close</button>
        </header>

        <div data-cx-sec="1" style={sx('display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:18px 22px 0')}>
          <div style={{ display: 'flex' }} role="group" aria-label="WCAG level">
            <button type="button" data-ix="seg" data-focus="chrome" onClick={contrast.setAA} aria-pressed={contrast.aaPressed} style={contrast.aaStyle}>AA</button>
            <button type="button" data-ix="seg" data-focus="chrome" onClick={contrast.setAAA} aria-pressed={contrast.aaaPressed} style={contrast.aaaStyle}>AAA</button>
          </div>
          <div style={{ display: 'flex' }} role="group" aria-label="Text size">
            <button type="button" data-ix="seg" data-focus="chrome" onClick={contrast.setNormal} aria-pressed={contrast.normalPressed} style={contrast.normalStyle}>Normal</button>
            <button type="button" data-ix="seg" data-focus="chrome" onClick={contrast.setLarge} aria-pressed={contrast.largePressed} style={contrast.largeStyle}>Large</button>
          </div>
          <button type="button" data-ix="seg" data-focus="chrome" onClick={contrast.togglePass} aria-pressed={contrast.passPressed} style={contrast.passStyle}>{contrast.passLabel}</button>
        </div>

        <div data-cx-sec="1" style={sx('display:flex;align-items:baseline;gap:8px;padding:16px 22px 0')}>
          <span data-cx-summary="1" data-drawer-split="1" style={sx('font-family:Neue Montreal;font-size:13px;color:var(--on-surface)')}>{contrast.aa} of {contrast.total} pairs pass {contrast.lensLabel}</span>
          <span style={sx('font-family:Neue Montreal;font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:var(--on-surface-muted)')}>min {contrast.threshold}:1</span>
        </div>

        <div data-cx-sec="1" style={sx('padding:14px 22px 0')}>
          <div style={sx('font-family: Neue Montreal; font-size: 9.5px; letter-spacing:var(--track-flat); text-transform: uppercase; color: var(--on-surface-muted); margin-bottom: 8px')}>Pairwise contrast</div>
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

        <div data-cx-sec="1" style={sx('padding:20px 22px 0')}>
          <div style={sx('font-family: Neue Montreal; font-size: 9.5px; letter-spacing:var(--track-flat); text-transform: uppercase; color: var(--on-surface-muted); margin-bottom: 8px')}>Text on each colour</div>
          <div style={sx('display:flex;flex-direction:column;gap:1px')}>
            {contrast.textOn.map((t, ti) => (
              <div key={ti} style={t.style}>
                <span style={{ fontSize: '10px' }}>{t.hex}</span>
                <span style={sx('text-transform: uppercase; font-size: 10px')}>{t.onLabel} · {t.ratio}:1</span>
              </div>
            ))}
          </div>
        </div>

        <div data-cx-sec="1" style={sx('padding:20px 22px 26px')}>
          <div style={sx('display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin-bottom:8px')}>
            <span style={sx('font-family: Neue Montreal; font-size: 9.5px; letter-spacing:var(--track-flat); text-transform: uppercase; color: var(--on-surface-muted)')}>Best pair sample</span>
            <span style={sx('font-family:Neue Montreal;font-size:10px;color:var(--on-surface-muted)')}>{contrast.sampleFg} on {contrast.sampleBg} · {contrast.sampleRatio}:1</span>
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
      <header data-ochrome="1" style={sx('display:flex;align-items:center;justify-content:space-between;gap:16px;height:64px;padding:0 20px;border-bottom:1px solid var(--line-strong);flex:none')}>
        <div style={sx('display:flex;align-items:baseline;gap:14px;min-width:0')}>
          <span style={sx("font-family:'Neue Montreal';font-weight:500;font-size:20px;letter-spacing:-.01em;color:var(--on-surface);white-space:nowrap")}>{overlay.name}</span>
          <span style={sx('font-family: Neue Montreal; font-size: 10px; letter-spacing:var(--track-flat); text-transform: uppercase; color: var(--on-surface-muted)')}>{overlay.time}</span>
        </div>
        {/* Filing used to stand here, in the chrome, while the result view files from its action
            row — one job wearing two different clothes depending on which door you came through.
            It moved down to the footer row, next to Export and Contrast, where the other things you
            do WITH a palette already live. The header keeps only what acts on the palette's place in
            the archive or on this window: delete, and close. */}
        <div style={sx('display:flex;align-items:center;gap:10px;flex:none')}>
          <button type="button" data-ix="solid" data-focus="chrome" aria-label={overlay.deleteAria} onClick={overlay.onDelete} style={sx('display:inline-flex;align-items:center;gap:8px;background:none;border:1px solid color-mix(in srgb, var(--on-surface) 15%, transparent);padding:9px 14px;font-family:Neue Montreal;font-size:10px;letter-spacing:var(--track-flat);text-transform:uppercase;color:var(--on-surface);cursor:pointer;transition:background .15s var(--ease-standard),color .15s var(--ease-standard),border-color .15s var(--ease-standard)')}>
            <IconTrash />Delete</button>
          <button type="button" data-ix="solid" data-focus="chrome" aria-label="Close palette detail" onClick={vals.closeOverlay} style={sx('display:inline-flex;align-items:center;gap:9px;background:none;border:1px solid color-mix(in srgb, var(--on-surface) 15%, transparent);padding:9px 14px;font-family:Neue Montreal;font-size:10px;letter-spacing:var(--track-flat);text-transform:uppercase;color:var(--on-surface);cursor:pointer;transition:background .15s var(--ease-standard),color .15s var(--ease-standard),border-color .15s var(--ease-standard)')}>Close</button>
        </div>
      </header>

      <div ref={vals.overlayBandsRef} role="group" aria-label="Palette swatches" style={sx('display:flex;flex:1;min-height:0;width:100%')}>
        {overlay.bands.map((b, bi) => (
          <div key={bi} data-oband="1" role="group" aria-label={b.groupAria} style={b.style}>
            <div data-ochrome="1" style={sx('display:flex;flex-direction:column;gap:8px')}>
              <span style={b.weightStyle}>{b.weightPct}</span>
              <span style={b.selTagStyle}><span style={b.selDotStyle} aria-hidden="true"></span>Current</span>
            </div>
            <button type="button" data-ix="icon" data-info="1" data-focus="swatch" aria-haspopup="dialog" aria-label={b.harmonyAria} onClick={b.onHarmony} style={b.infoBtnStyle}>
              <IconHarmony size={13} />
            </button>
            <span style={b.ringStyle} aria-hidden="true"></span>
            <div data-ochrome="1" style={b.valuesWrap}>
              {b.values.map((v) => (<ValueRow key={v.key} v={v} showCaveat={true} />))}
            </div>
          </div>
        ))}
      </div>

      <footer data-ochrome="1" style={sx('display:flex;align-items:flex-start;justify-content:space-between;gap:28px;padding:22px 20px;border-top:1px solid var(--line-strong);flex:none')}>
        <div style={sx('flex:1;min-width:0;display:flex;flex-direction:column;gap:14px')}>
          <div style={sx('display:flex;flex-wrap:wrap;gap:8px')}>
            {overlay.descriptors.map((d, di) => (<span key={di} style={vals.pill}>{d}</span>))}
          </div>
          {/* Same action hierarchy as the result view's row, and deliberately so: this is the same
              job on a different surface, so Export leads, filing follows, then Contrast, and the copy
              actions sit behind a hairline as utilities. A palette opened fullscreen from the grid
              must not re-teach the user a different set of weights. (No Share here — the overlay has
              no share affordance, so the utility cluster is a pair rather than a trio.) */}
          <div style={sx('display:flex;align-items:center;gap:8px')}>
            <B006 data-emphasis="primary" onClick={vals.openExport} aria-haspopup="dialog" aria-label="Export this palette as design tokens" label={exportB006Label} />
            <B006 data-emphasis="secondary" onClick={overlay.onAssign} aria-haspopup="dialog" aria-label={overlay.assignAria} label={assignB006Label(overlay.assignLabel)} />
            <B006 data-emphasis="secondary" onClick={vals.openContrast} disabled={vals.contrastDisabled} aria-haspopup="dialog" aria-label="Open contrast checker for this palette" label={contrastB006Label} />
            <div style={sx('display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding-left:8px;border-left:1px solid var(--line-strong)')}>
              <B006 data-emphasis="utility" onClick={overlay.copyHexList} aria-label="Copy the whole palette as a plain hex list"
                label={<SwapLabel copied={overlay.hexListCopied} idle="Hex list" />} />
              <B006 data-emphasis="utility" onClick={overlay.copyCss} aria-label="Copy the whole palette as CSS custom properties"
                label={<SwapLabel copied={overlay.cssCopied} idle="CSS variables" />} />
            </div>
          </div>
        </div>
        <p style={sx("width:380px;flex:none;font-family:'Neue Montreal';font-size:15px;line-height:1.5;color:var(--on-surface-muted);text-align:right;margin:0;text-wrap:pretty")}>{overlay.rationale}</p>
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
// Capitals, not caps: a filter list is a list of NAMES (Flexible, Saturated, Coastal), and uppercase
// made them read as labels of something rather than the things themselves. The system keeps
// uppercase for what it has always meant here — chrome that labels a control (ARCHIVE FILTER,
// COUNT, A–Z) — so dropping it from the names is what tells the two apart at a glance.
// Medium at every state, not 400→500 on selection: the name is the row's subject and now outranks
// its count and its example by weight instead of by having been clicked. Selection is carried by
// the checkbox, which changes shape, fill AND glyph (SC 1.4.1), and by aria-pressed — the weight
// step was never the accessible signal, only a second one.
const facetLabelStyle = sx('font-family:Neue Montreal;font-size:13px;letter-spacing:var(--track-flat);text-transform:capitalize;white-space:nowrap;flex:none;font-weight:500');

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
        <header data-tg-sec="1" style={sx('display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:20px 22px 0')}>
          <div style={sx('display:flex;flex-direction:column;gap:9px;min-width:0')}>
            <span style={sx('font-family:Neue Montreal;font-size:10px;letter-spacing:var(--track-flat);text-transform:uppercase;color:var(--on-surface-muted)')}>Archive filter</span>
            {/* "Tags" is now one group among several, so the title names the surface, not a group */}
            <span style={sx("font-family:'Neue Montreal';font-weight:500;font-size:22px;letter-spacing:-.01em;color:var(--on-surface)")}>Filters</span>
            {/* The match count is no longer printed under the title — the list it counts is right
                there, undimmed, and the counts on the rows below are the same fact at the grain you
                are actually choosing at. It stays as a live region, because that reasoning depends
                on SEEING the list re-filter: a screen reader user gets no such feedback from a
                panel that quietly narrows something behind it. Same words, no pixels. */}
            <span role="status" aria-live="polite" style={liveRegionStyle}>{vals.matchLabel}</span>
          </div>
          <button type="button" data-ix="solid" data-focus="chrome" onClick={vals.closeFacet} aria-label="Close filters" style={sx('flex:none;background:none;border:1px solid color-mix(in srgb, var(--on-surface) 15%, transparent);padding:8px 13px;font-family:Neue Montreal;font-size:10px;letter-spacing:var(--track-flat);text-transform:uppercase;color:var(--on-surface);cursor:pointer;transition:background .15s var(--ease-standard),color .15s var(--ease-standard)')}>Close</button>
        </header>

        <div data-tg-sec="1" style={sx('padding:14px 22px 2px')}>
          {/* ONE paragraph for the whole panel now. It used to be panel-level only, on the rule that
              a line above every group may say nothing true of just one of them — and each group
              then carried its own heading and its own note. With those headings gone, that rule has
              nothing left to protect: there is no second place for the accessibility semantics to
              live, and stating them here is what keeps them stated at all. The order does the
              scoping the headings used to: the combine rule (both groups), then the three states
              and their counts (the group directly beneath it). */}
          <span data-drawer-split="1" style={sx('font-family:Neue Montreal;font-size:11.5px;line-height:1.5;color:var(--on-surface-muted);text-wrap:pretty')}>Filter groups combine — a palette must match every group you use. {vals.a11yNote}</span>
        </div>

        {/* ACCESSIBILITY — a facet, and the first one, because "can I build with this?" outranks
            "what mood is it?". Exhaustive: every palette holds exactly one state, so the group
            always partitions the archive. OR within the group (a palette cannot be two states, so
            AND would be unsatisfiable); AND against tags. Same checkbox, count and zero-suppression
            rules as the tag rows — one grammar for every facet. */}
        {vals.hasA11yOptions && (
          <div data-tg-sec="1" style={sx('padding:18px 22px 0')}>
            {/* No eyebrow, no note of its own — both moved into the panel's one paragraph above.
                The group keeps its name for assistive tech on the role="group" below, which is
                where it was always doing the load-bearing work. */}
            <div role="group" aria-label="Filter by accessibility" onKeyDown={vals.onFacetListKey} style={sx('display:flex;flex-direction:column')}>
              {vals.a11yOptions.map((o) => (
                <button key={o.key} type="button" data-tg-cell="1" data-ix={o.disabled ? undefined : 'cell'} data-focus="chrome" aria-pressed={o.pressed} aria-disabled={o.disabled ? 'true' : undefined} aria-label={o.aria} onClick={o.onPick} style={sx('display:flex;align-items:center;gap:11px;width:100%;text-align:left;background:none;border:none;border-bottom:1px solid var(--line);padding:11px 2px;font:inherit;' + (o.disabled ? 'cursor:default;color:var(--on-surface-muted)' : 'cursor:pointer;color:var(--on-surface)'))}>
                  <FacetMark active={o.active} unavailable={o.disabled} />
                  <span style={facetLabelStyle}>{o.label}</span>
                  {/* count sits beside its label (F5), not across the row */}
                  <span style={sx('font-family:Neue Montreal;font-size:9px;color:var(--on-surface-muted);font-variant-numeric:tabular-nums;flex:none')}>{o.count}</span>
                  {/* Nothing at the row's end now but the occasional reason an inert row cannot be
                      picked. The state's meaning left this line for the note above the group: three
                      right-aligned fragments, one per row, clipped to whatever the panel had left,
                      asked the eye to assemble a definition out of a column. */}
                  <span style={sx('flex:1;min-width:0;text-align:right;font-family:Neue Montreal;font-size:9px;letter-spacing:var(--track-flat);color:var(--on-surface-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis')}>{o.disabled ? o.reason : ''}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* No heading and no explanation over the tag list. The search field, the Count/A–Z toggle
            and a column of tag rows say what this is without a label on top of them, and the
            sentence that used to sit here explained a counting rule that the counts demonstrate the
            first time you read two of them. The group keeps its accessible name (aria-label on the
            list below), so nothing is lost to a screen reader. */}

        {/* A bordered field, not an underlined line of text — the old styling read as a heading,
            so the one control you are meant to type into did not look like an input. Clear button
            appears only when there is something to clear, and hands focus back to the field. */}
        <div data-tg-sec="1" style={sx('padding:16px 22px 0;display:flex;align-items:center;gap:8px')}>
          <div style={sx('flex:1;min-width:0;display:flex;align-items:center;gap:6px;border:1px solid var(--line-strong);background:var(--surface-raised);padding:0 8px 0 10px')}>
            <input data-facet-search="1" data-focus="field" type="text" value={vals.tagQuery} onChange={vals.onTagQuery} placeholder="Search tags" aria-label="Search tags" style={sx('flex:1;min-width:0;background:transparent;border:none;padding:9px 0;font-family:Neue Montreal;font-size:12.5px;letter-spacing:var(--track-flat);color:var(--on-surface)')} />
            {vals.hasTagQuery && (
              <button type="button" data-ix="press" data-focus="chrome" onClick={vals.clearTagQuery} aria-label="Clear search" style={sx('flex:none;width:18px;height:18px;display:inline-flex;align-items:center;justify-content:center;background:none;border:none;padding:0;font-family:Neue Montreal;font-size:10px;color:var(--on-surface-muted);cursor:pointer')}>✕</button>
            )}
          </div>
          {/* sort: discovery vs known-item lookup, on the existing segmented toggle style */}
          <div role="group" aria-label="Sort tags" style={sx('display:flex;align-items:center;gap:6px;flex:none')}>
            <button type="button" data-ix="seg" data-focus="chrome" aria-pressed={vals.tagSort === 'count'} onClick={vals.sortByCount} style={vals.sortCountStyle}>Count</button>
            <button type="button" data-ix="seg" data-focus="chrome" aria-pressed={vals.tagSort === 'alpha'} onClick={vals.sortByAlpha} style={vals.sortAlphaStyle}>A–Z</button>
          </div>
        </div>

        <div data-tg-sec="1" role="group" aria-label="Tags" onKeyDown={vals.onFacetListKey} style={sx('display:flex;flex-direction:column;padding:10px 22px 26px')}>
          {vals.facetOptions.map((o) => (
            <button key={o.key} type="button" data-tg-cell="1" data-ix={o.disabled ? undefined : 'cell'} data-focus="chrome" aria-pressed={o.pressed} aria-disabled={o.disabled ? 'true' : undefined} aria-label={o.aria} onClick={o.onPick} style={sx('display:flex;align-items:center;gap:11px;width:100%;text-align:left;background:none;border:none;border-bottom:1px solid var(--line);padding:11px 2px;font:inherit;' + (o.disabled ? 'cursor:default;color:var(--on-surface-muted)' : 'cursor:pointer;color:var(--on-surface)'))}>
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
              <span style={sx('font-family:Neue Montreal;font-size:9px;color:var(--on-surface-muted);font-variant-numeric:tabular-nums;flex:none')}>{o.count}</span>
              {/* Names the palette the strip is showing. Sits directly against the strip so the
                  two read as one unit — a labelled sample, not a claim about the whole tag. On an
                  inert row the reason takes this slot instead: you cannot pick the tag, so why it
                  is inert outranks the name of a sample you cannot act on. */}
              <span style={sx('flex:1;min-width:0;text-align:right;font-family:Neue Montreal;font-size:9px;letter-spacing:var(--track-flat);color:var(--on-surface-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis')}>{o.disabled ? o.reason : o.exemplarName}</span>
              <span aria-hidden="true" style={sx('display:flex;width:150px;flex:none;height:14px;border:1px solid var(--line)')}>
                {o.strip.map((b, hi) => (<span key={hi} style={b.style}></span>))}
              </span>
            </button>
          ))}
          {/* An empty state that says what happened and offers the way out, rather than a dead
              two-word label. It also covers the non-search case: if a selection has narrowed the
              archive so far that no further tag would leave anything, the list is empty for a
              different reason and should say so. */}
          {vals.facetEmpty && (
            <div role="status" style={sx('display:flex;flex-direction:column;align-items:flex-start;gap:10px;padding:16px 2px')}>
              <span style={sx('font-family:Neue Montreal;font-size:11.5px;line-height:1.5;color:var(--on-surface-muted);text-wrap:pretty')}>
                {vals.hasTagQuery ? 'No tag matches “' + vals.tagQuery + '”.' : 'No further tag would narrow this selection.'}
              </span>
              {vals.hasTagQuery && (
                <button type="button" data-ix="press" data-focus="chrome" onClick={vals.clearTagQuery} aria-label="Clear search" style={sx('background:none;border:1px solid color-mix(in srgb, var(--on-surface) 15%, transparent);padding:8px 13px;font-family:Neue Montreal;font-size:10px;letter-spacing:var(--track-flat);text-transform:uppercase;color:var(--on-surface);cursor:pointer')}>Clear search</button>
              )}
            </div>
          )}
          {vals.facetClear && (
            <button type="button" data-tg-cell="1" data-ix="press" data-focus="chrome" onClick={vals.facetClear.onClear} aria-label={vals.facetClear.label} style={sx('align-self:flex-start;margin-top:16px;background:none;border:1px solid color-mix(in srgb, var(--on-surface) 15%, transparent);padding:8px 13px;font-family:Neue Montreal;font-size:10px;letter-spacing:var(--track-flat);text-transform:uppercase;color:var(--on-surface);cursor:pointer')}>{vals.facetClear.label}</button>
          )}
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
      <div data-hx-backdrop="1" onClick={vals.closeHarmony} style={sx('position:absolute;inset:0;background:color-mix(in srgb, #141413 55%, transparent);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)')}></div>
      <div data-hx-drawer="1" data-harmony-dialog="1" data-lenis-prevent="1" role="dialog" aria-modal="true" aria-label={'Colour harmonies for ' + harmony.hex} onKeyDown={vals.trapHarmony} style={sx('position:absolute;right:0;top:0;bottom:0;width:480px;max-width:94vw;background:var(--surface);border-left:1px solid var(--line-strong);display:flex;flex-direction:column;overflow-y:auto')}>
        <header data-hx-sec="1" style={sx('display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:20px 22px 0')}>
          <div style={sx('display:flex;flex-direction:column;gap:9px;min-width:0')}>
            <span style={sx('font-family:Neue Montreal;font-size:10px;letter-spacing:var(--track-flat);text-transform:uppercase;color:var(--on-surface-muted)')}>Colour harmonies</span>
            <div style={sx('display:flex;align-items:center;gap:11px')}>
              <span aria-hidden="true" style={harmony.swatchStyle}></span>
              <span data-drawer-split="1" style={sx("font-family:'Neue Montreal';font-weight:500;font-size:22px;letter-spacing:-.01em;color:var(--on-surface)")}>{harmony.hex}</span>
            </div>
          </div>
          <button type="button" data-ix="solid" data-focus="chrome" onClick={vals.closeHarmony} aria-label="Close colour harmonies" style={sx('flex:none;background:none;border:1px solid color-mix(in srgb, var(--on-surface) 15%, transparent);padding:8px 13px;font-family:Neue Montreal;font-size:10px;letter-spacing:var(--track-flat);text-transform:uppercase;color:var(--on-surface);cursor:pointer;transition:background .15s var(--ease-standard),color .15s var(--ease-standard)')}>Close</button>
        </header>

        <div data-hx-sec="1" style={sx('padding:14px 22px 2px')}>
          <span data-drawer-split="1" style={sx('font-family:Neue Montreal;font-size:11.5px;line-height:1.5;color:var(--on-surface-muted);text-wrap:pretty')}>Derived in OKLCH and mapped into sRGB. Tap any colour to copy its hex.</span>
        </div>

        {harmony.groups.map((grp, gi) => (
          <div key={gi} data-hx-sec="1" style={sx('padding:16px 22px 0')}>
            <div style={sx('display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin-bottom:8px')}>
              <span style={sx('font-family: Neue Montreal; font-size: 9.5px; letter-spacing:var(--track-flat); text-transform: uppercase; color: var(--on-surface-muted)')}>{grp.name}</span>
              <span style={sx('font-family:Neue Montreal;font-size:9px;color:var(--on-surface-muted)')}>{grp.count}</span>
            </div>
            <div style={sx('display:flex;gap:1px;width:100%')}>
              {grp.cells.map((cell, ci) => (
                <HBtn key={ci} type="button" data-hx-cell="1" data-focus="value" onClick={cell.onCopy} aria-label={cell.aria} style={cell.style} styleHover={cell.hover} styleActive={cell.active}>
                  <span aria-hidden="true" style={cell.markStyle}></span>
                  <span style={sx('text-transform: uppercase; font-size: 9px; letter-spacing:var(--track-flat); font-family: Neue Montreal')}>{cell.display}</span>
                </HBtn>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================== TOKEN EXPORT DIALOG ==============================
function ExportDialog({ vals }) {
  if (!vals.hasExport) return null;
  const ex = vals.export;
  return (
    <div style={sx('position:fixed;inset:0;z-index:125;display:flex;align-items:center;justify-content:center;padding:24px')}>
      <div data-ex-backdrop="1" onClick={vals.closeExport} style={sx('position:absolute;inset:0;background:color-mix(in srgb, #141413 55%, transparent);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)')}></div>
      <div data-export-dialog="1" data-lenis-prevent="1" role="dialog" aria-modal="true" aria-label={'Export ' + ex.name + ' as design tokens'} onKeyDown={vals.trapExport} style={sx('position:relative;width:440px;max-width:94vw;max-height:88vh;overflow-y:auto;background:var(--surface);border:1px solid var(--line-strong);box-shadow:0 24px 60px rgba(0,0,0,.28);display:flex;flex-direction:column')}>
        <header style={sx('display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:20px 22px 0')}>
          <div style={sx('display:flex;flex-direction:column;gap:4px;min-width:0')}>
            <span style={sx('font-family:Neue Montreal;font-size:10px;letter-spacing:var(--track-flat);text-transform:uppercase;color:var(--on-surface-muted)')}>Export tokens</span>
            <span style={sx("font-family:'Neue Montreal';font-weight:500;font-size:22px;letter-spacing:-.01em;color:var(--on-surface);white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{ex.name}</span>
          </div>
          <button type="button" data-ix="solid" data-focus="chrome" onClick={vals.closeExport} aria-label="Close export options" style={sx('flex:none;background:none;border:1px solid color-mix(in srgb, var(--on-surface) 15%, transparent);padding:8px 13px;font-family:Neue Montreal;font-size:10px;letter-spacing:var(--track-flat);text-transform:uppercase;color:var(--on-surface);cursor:pointer;transition:background .15s var(--ease-standard),color .15s var(--ease-standard)')}>Close</button>
        </header>

        <div style={sx('padding:14px 22px 0')}>
          <span style={sx('font-family:Neue Montreal;font-size:11.5px;line-height:1.5;color:var(--on-surface-muted);text-wrap:pretty')}>HEX / RGB / HSL — the authoritative values. The labelled CMYK approximation stays on-screen, never baked into a file you ship.</span>
        </div>

        <div style={sx('padding:16px 22px 0;display:flex;flex-direction:column;gap:6px')}>
          {ex.formats.map((f, fi) => (
            <button key={fi} type="button" data-ex-item="1" data-focus="chrome" onClick={f.onPick} onMouseEnter={f.onEnter} onMouseLeave={f.onLeave} onFocus={f.onFocus} onBlur={f.onBlur} style={f.style}>
              <span style={sx('text-transform: capitalize; font-size: 12px')}>{f.label}</span>
              <span style={f.extStyle}>{f.ext}</span>
            </button>
          ))}
        </div>

        <div style={sx('display:flex;align-items:center;justify-content:space-between;gap:16px;padding:18px 22px 0')}>
          <div style={{ minWidth: 0 }}>
            <div style={sx("font-family: 'Neue Montreal'; font-size: 12px; color: var(--on-surface); text-transform: capitalize")}>Semantic scaffold</div>
            <div style={sx('font-family:Neue Montreal;font-size:10.5px;line-height:1.45;color:var(--on-surface-muted);margin-top:3px;text-wrap:pretty')}>Role-mapped starting layer to refine — not a finished system.</div>
          </div>
          <B006 data-focus="chrome" role="switch" aria-checked={ex.semanticChecked} onClick={vals.toggleExportSemantic} aria-label="Toggle semantic scaffold layer"
            hover={
              <span style={sx('display:inline-flex;align-items:center;gap:7px')}>
                <span aria-hidden="true" style={sx('position:relative;display:inline-block;width:28px;height:14px;background:color-mix(in srgb, currentColor 30%, transparent);flex:none;transition:background .28s var(--ease-standard)')}>
                  <span style={{ ...sx('position:absolute;left:2px;top:2px;width:10px;height:10px;background:currentColor;transition:transform .28s var(--ease-standard)'), transform: ex.semanticDotX }}></span>
                </span>{ex.semanticLabel}
              </span>
            }
            label={
              <span style={sx('display:inline-flex;align-items:center;gap:7px')}>
                <span style={{ ...sx('position:relative;display:inline-block;width:28px;height:14px;flex:none;transition:background .28s var(--ease-standard)'), background: ex.semanticTrackBg }}>
                  <span style={{ ...sx('position:absolute;left:2px;top:2px;width:10px;height:10px;background:var(--surface);transition:transform .28s var(--ease-standard)'), transform: ex.semanticDotX }}></span>
                </span>{ex.semanticLabel}
              </span>
            } />
        </div>

        <div style={sx('padding:14px 22px 22px')}>
          <span style={sx('font-family:Neue Montreal;font-size:9.5px;letter-spacing:.02em;color:var(--on-surface-muted)')}>{ex.layerLabel}</span>
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
      <div data-modal-backdrop="1" onClick={vals.closeRecognise} style={sx('position:absolute;inset:0;background:color-mix(in srgb, #141413 55%, transparent);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)')}></div>
      <div data-recognise-dialog="1" data-lenis-prevent="1" role="dialog" aria-modal="true" aria-label="This image has been extracted before" onKeyDown={vals.trapRecognise} style={sx('position:relative;width:420px;max-width:94vw;max-height:86vh;overflow-y:auto;background:var(--surface);border:1px solid var(--line-strong);box-shadow:0 24px 60px rgba(0,0,0,.28);display:flex;flex-direction:column')}>
        <header style={sx('display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:20px 22px 0')}>
          <div style={sx('display:flex;flex-direction:column;gap:4px;min-width:0')}>
            <span style={sx('font-family:Neue Montreal;font-size:10px;letter-spacing:var(--track-flat);text-transform:uppercase;color:var(--on-surface-muted)')}>Already extracted</span>
            <span style={sx("font-family:'Neue Montreal';font-weight:500;font-size:20px;letter-spacing:-.01em;color:var(--on-surface);white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{r.name}</span>
          </div>
          <button type="button" data-ix="solid" data-focus="chrome" onClick={vals.closeRecognise} aria-label="Keep the existing palette and create nothing" style={sx('flex:none;background:none;border:1px solid color-mix(in srgb, var(--on-surface) 15%, transparent);padding:8px 13px;font-family:Neue Montreal;font-size:10px;letter-spacing:var(--track-flat);text-transform:uppercase;color:var(--on-surface);cursor:pointer')}>Cancel</button>
        </header>
        <div style={sx('padding:14px 22px 0;display:flex;flex-direction:column;gap:12px')}>
          <span style={sx("font-family:'Neue Montreal';font-size:13px;line-height:1.5;color:var(--on-surface-muted);text-wrap:pretty")}>{r.line}</span>
          {/* the palette itself, drawn as the archive draws it — so the claim can be checked, not just read */}
          <span aria-hidden="true" style={sx('display:flex;width:100%;height:26px;border:1px solid var(--line)')}>
            {r.strip.map((b, i) => (<span key={i} style={b.style}></span>))}
          </span>
          <span style={sx('font-family:Neue Montreal;font-size:9px;letter-spacing:var(--track-flat);text-transform:uppercase;color:var(--on-surface-muted)')}>Saved {r.when}</span>
        </div>
        <div style={sx('padding:18px 22px 22px;margin-top:10px;border-top:1px solid var(--line);display:flex;flex-direction:column;gap:8px')}>
          <button type="button" data-ix="cta" data-focus="chrome" onClick={vals.recogniseOpen} aria-label={r.openAria} style={sx('width:100%;background:var(--on-surface);border:1px solid var(--on-surface);padding:12px 16px;font-family:Neue Montreal;font-size:10px;letter-spacing:var(--track-flat);text-transform:uppercase;color:var(--surface);cursor:pointer')}>Open existing palette</button>
          {/* "Anyway", not "as a variation". Extraction is deterministic as of this deploy, so a
              second run of the same image returns the same colours — this adds a separate entry,
              it does not produce a different palette. Step D is what makes variations genuinely
              differ (seed = content hash + variation index); the label can promise that then. */}
          <button type="button" data-ix="solid" data-focus="chrome" onClick={vals.recogniseVariation} aria-label={r.variationAria} style={sx('width:100%;background:none;border:1px solid color-mix(in srgb, var(--on-surface) 15%, transparent);padding:12px 16px;font-family:Neue Montreal;font-size:10px;letter-spacing:var(--track-flat);text-transform:uppercase;color:var(--on-surface);cursor:pointer')}>Extract again anyway</button>
          <span style={sx("font-family:'Neue Montreal';font-size:11px;line-height:1.5;color:var(--on-surface-muted);text-wrap:pretty")}>Extraction is repeatable, so this adds a second entry with the same colours.</span>
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
      <div data-modal-backdrop="1" onClick={vals.closeAssign} style={sx('position:absolute;inset:0;background:color-mix(in srgb, #141413 55%, transparent);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)')}></div>
      <div data-assign-dialog="1" data-lenis-prevent="1" role="dialog" aria-modal="true" aria-label="Move to project" onKeyDown={vals.trapAssign} style={sx('position:relative;width:400px;max-width:94vw;max-height:86vh;overflow-y:auto;background:var(--surface);border:1px solid var(--line-strong);box-shadow:0 24px 60px rgba(0,0,0,.28);display:flex;flex-direction:column')}>
        <header style={sx('display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:20px 22px 0')}>
          <div style={sx('display:flex;flex-direction:column;gap:4px;min-width:0')}>
            <span style={sx('font-family:Neue Montreal;font-size:10px;letter-spacing:var(--track-flat);text-transform:uppercase;color:var(--on-surface-muted)')}>Move to project</span>
            <span style={sx("font-family:'Neue Montreal';font-weight:500;font-size:20px;letter-spacing:-.01em;color:var(--on-surface);white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{assign.name}</span>
          </div>
          <button type="button" data-ix="solid" data-focus="chrome" onClick={vals.closeAssign} aria-label="Close move-to-project" style={sx('flex:none;background:none;border:1px solid color-mix(in srgb, var(--on-surface) 15%, transparent);padding:8px 13px;font-family:Neue Montreal;font-size:10px;letter-spacing:var(--track-flat);text-transform:uppercase;color:var(--on-surface);cursor:pointer')}>Close</button>
        </header>
        <div style={sx('padding:16px 22px 0;display:flex;flex-direction:column;gap:6px')}>
          {assign.options.map((o) => (
            <button key={o.key} type="button" data-focus="chrome" onClick={o.onPick} onMouseEnter={o.onEnter} onMouseLeave={o.onLeave} onFocus={o.onFocus} onBlur={o.onBlur} aria-label={o.aria} style={o.style}>
              <span style={sx("font-family:'Neue Montreal';font-size:13px;color:var(--on-surface)")}>{o.label}</span>
              <span aria-hidden="true" style={o.markStyle}></span>
            </button>
          ))}
        </div>
        <div style={sx('padding:16px 22px 22px;margin-top:8px;border-top:1px solid var(--line)')}>
          <label style={sx('font-family:Neue Montreal;font-size:9.5px;letter-spacing:.06em;text-transform:uppercase;color:var(--on-surface-muted);display:block;margin:12px 0 8px')}>New project</label>
          <div style={sx('display:flex;gap:8px')}>
            <input data-assign-new="1" type="text" maxLength={60} placeholder="Project name" onKeyDown={assign.onCreateKey} style={sx("flex:1;min-width:0;background:var(--surface-raised);border:1px solid var(--line-strong);padding:9px 11px;font-family:'Neue Montreal';font-size:13px;color:var(--on-surface)")} />
            <button type="button" data-ix="cta" data-focus="chrome" onClick={assign.onCreate} style={sx('flex:none;background:var(--on-surface);border:1px solid var(--on-surface);padding:9px 14px;font-family:Neue Montreal;font-size:10px;letter-spacing:var(--track-flat);text-transform:uppercase;color:var(--surface);cursor:pointer')}>Create &amp; move</button>
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
      <div data-modal-backdrop="1" onClick={vals.closeManage} style={sx('position:absolute;inset:0;background:color-mix(in srgb, #141413 55%, transparent);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)')}></div>
      <div data-manage-dialog="1" data-lenis-prevent="1" role="dialog" aria-modal="true" aria-label="Manage projects" onKeyDown={vals.trapManage} style={sx('position:relative;width:440px;max-width:94vw;max-height:86vh;overflow-y:auto;background:var(--surface);border:1px solid var(--line-strong);box-shadow:0 24px 60px rgba(0,0,0,.28);display:flex;flex-direction:column')}>
        <header style={sx('display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:20px 22px 0')}>
          <div style={sx('display:flex;flex-direction:column;gap:4px')}>
            <span style={sx('font-family:Neue Montreal;font-size:10px;letter-spacing:var(--track-flat);text-transform:uppercase;color:var(--on-surface-muted)')}>Projects</span>
            <span style={sx("font-family: 'Neue Montreal'; font-weight: 500; font-size: 20px; letter-spacing: -.01em; color: var(--on-surface); text-transform: capitalize")}>Manage projects</span>
          </div>
          <button type="button" data-ix="solid" data-focus="chrome" onClick={vals.closeManage} aria-label="Close manage projects" style={sx('flex:none;background:none;border:1px solid color-mix(in srgb, var(--on-surface) 15%, transparent);padding:8px 13px;font-family:Neue Montreal;font-size:10px;letter-spacing:var(--track-flat);text-transform:uppercase;color:var(--on-surface);cursor:pointer')}>Close</button>
        </header>
        <div style={sx('padding:16px 22px 4px')}>
          <div style={sx('display:flex;gap:8px')}>
            <input data-manage-new="1" type="text" maxLength={60} placeholder="New project name" onKeyDown={manage.onCreateKey} style={sx("flex:1;min-width:0;background:var(--surface-raised);border:1px solid var(--line-strong);padding:9px 11px;font-family:'Neue Montreal';font-size:13px;color:var(--on-surface)")} />
            <button type="button" data-ix="cta" data-focus="chrome" onClick={manage.onCreate} style={sx('flex:none;background:var(--on-surface);border:1px solid var(--on-surface);padding:9px 14px;font-family:Neue Montreal;font-size:10px;letter-spacing:var(--track-flat);text-transform:uppercase;color:var(--surface);cursor:pointer')}>Add</button>
          </div>
        </div>
        {manage.empty && (
          <div style={sx("padding:18px 22px 24px;font-family:'Neue Montreal';font-size:12.5px;line-height:1.5;color:var(--on-surface-muted);text-wrap:pretty")}>No projects yet. Create one above, then move palettes into it from any row or the detail view.</div>
        )}
        <div style={sx('padding:12px 22px 22px;display:flex;flex-direction:column;gap:8px')}>
          {manage.rows.map((pr) => (
            <div key={pr.id} style={sx('display:flex;align-items:center;gap:8px')}>
              <input data-proj-name={pr.id} type="text" maxLength={60} key={pr.id + '|' + pr.name} defaultValue={pr.name} onBlur={pr.onRename} onKeyDown={pr.onRenameKey} aria-label="Rename project" style={sx("flex:1;min-width:0;background:var(--surface-raised);border:1px solid var(--line);padding:9px 11px;font-family:'Neue Montreal';font-size:13px;color:var(--on-surface)")} />
              <span style={sx('font-family:Neue Montreal;font-size:9px;letter-spacing:var(--track-flat);text-transform:uppercase;color:var(--on-surface-muted);flex:none;white-space:nowrap')}>{pr.count}</span>
              <button type="button" data-ix="solid" data-focus="chrome" aria-label={pr.deleteAria} onClick={pr.onDelete} style={sx('flex:none;width:32px;height:32px;display:inline-flex;align-items:center;justify-content:center;background:none;border:1px solid color-mix(in srgb, var(--on-surface) 15%, transparent);color:var(--on-surface);cursor:pointer')}>
                <IconTrash />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
