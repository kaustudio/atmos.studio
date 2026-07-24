// The view — a 1:1 JSX port of the design comp's template. Static inline styles are kept as the
// original CSS strings (parsed by sx()) so the layout stays byte-faithful; computed styles come
// from renderVals() untouched. No logic lives here.
import React, { useState } from 'react';
import { sx } from '../lib/sx.js';

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

const LOGO_MASK = "url('/assets/atmos-logo-black-v3.svg') center/contain no-repeat";
const MARK_MASK = "url('/assets/atmos-logo-black-v3.svg') left center/contain no-repeat";
const logoStyle = {
  ...sx('position:fixed;top:24px;left:50%;transform:translateX(-50%);width:165px;height:26px;z-index:155;mix-blend-mode:difference;background:linear-gradient(120deg, #ffffff, #c2c2c2, #8a8a8a, #dedede, #a6a6a6, #ffffff);background-size:280% 280%;animation:gradient-drift 9s ease-in-out infinite'),
  WebkitMask: LOGO_MASK, mask: LOGO_MASK,
};

const IconCopy = () => (<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path fill="currentColor" d="M7.5 17V3h11v14zm-3 3V6.616h1V19h9.385v1z"></path></svg>);
const IconCheck = ({ size = 12 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path fill="currentColor" d="m9.55 18l-5.7-5.7l1.425-1.425L9.55 15.15l9.175-9.175L20.15 7.4z"></path></svg>);
const IconHarmony = ({ size = 14 }) => (<svg width={size} height={size} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden="true"><circle cx="5.2" cy="7" r="3.4"></circle><circle cx="8.8" cy="7" r="3.4"></circle></svg>);
const IconContrast = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path fill="currentColor" d="M8.493 20.292q-1.643-.709-2.859-1.924t-1.925-2.856T3 12.003t.709-3.51Q4.417 6.85 5.63 5.634t2.857-1.925T11.997 3t3.51.709q1.643.708 2.859 1.922t1.925 2.857t.709 3.509t-.708 3.51t-1.924 2.859t-2.856 1.925t-3.509.709t-3.51-.708m4.007-.31q3.09-.201 5.295-2.458T20 12t-2.185-5.505Q15.628 4.258 12.5 4.017z"></path></svg>);
const IconExport = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path fill="currentColor" d="m12 15.577l-3.539-3.538l.708-.72L11.5 13.65V5h1v8.65l2.33-2.33l.709.719zM5 19v-4.038h1V18h12v-3.038h1V19z"></path></svg>);
const IconFolder = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ display: 'block' }}><path fill="currentColor" d="M3 19V5h6.596l2 2H21v12zm1-1h16V8h-8.806l-2-2H4zm0 0V6z"></path></svg>);
// Redrawn from the supplied mdi link glyph at this set's stroke weight. The source was ~2 units of
// wall in a 24 grid; every other icon here (export, folder, trash, copy) is a 1-unit hairline, and
// at 14px the difference reads as a bold icon sitting in a row of light ones. Same drawing, same
// optical size — just the weight the row is built on.
const IconLink = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path fill="currentColor" d="M6.5 17q-2.28 0-3.89-1.61T1 11.5t1.61-3.89T6.5 6H10v1H6.5q-1.86 0-3.18 1.32T2 11.5t1.32 3.18T6.5 16H10v1zm1-5v-1h9v1zm6.5 5v-1h3.5q1.86 0 3.18-1.32T22 11.5t-1.32-3.18T17.5 7H14V6h3.5q2.28 0 3.89 1.61T23 11.5t-1.61 3.89T17.5 17z"></path></svg>);
const IconTrash = ({ size = 13 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ display: 'block' }}><path fill="currentColor" d="M6 20V6H5V5h4v-.77h6V5h4v1h-1v14zm1-1h10V6H7zm2.808-2h1V8h-1zm3.384 0h1V8h-1zM7 6v13z"></path></svg>);

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
        <span role="img" aria-label="Atmos Studio" style={{ ...sx('display:block;width:104px;height:16px;flex:none;background:var(--on-surface)'), WebkitMask: MARK_MASK, mask: MARK_MASK }}></span>
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
        <p style={sx("font-family:'Neue Montreal';font-size:12px;line-height:1.6;color:var(--on-surface-muted);margin:0;text-wrap:pretty")}>Open Atmos Studio on a desktop to read a palette from your own image.</p>
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
      </div>
    );
  }
  return (
    <div data-app="1" style={sx('min-height:100vh;display:flex;flex-direction:column;background:var(--surface)')}>

      <div aria-live="polite" role="status" style={liveRegionStyle}>{vals.announce}</div>

      {/* brand mark: fixed at top-centre; the wordmark shape masks a drifting GRAYSCALE gradient,
          composited with mix-blend difference. Landing: decorative; in the tool: a button back to the start. */}
      {vals.showLogoDecor && (
        <div data-logo="1" role="img" aria-label="Atmos Studio" style={{ ...logoStyle, pointerEvents: 'none' }}></div>
      )}
      {vals.showLogoButton && (
        <HBtn type="button" data-logo="1" data-focus="chrome" onClick={vals.showIntroAgain} aria-label="Atmos Studio — return to the start screen" title="Return to the start screen"
          style={{ ...logoStyle, border: 0, padding: 0, cursor: 'pointer' }} styleHover={{ opacity: 0.82 }} />
      )}

      {/* One surface, two copies. On a phone the landing IS the small-screen gate — same ring stage,
          same centred block, gate copy instead of the statement + CTA — so there is never a second
          [data-orbit] in the DOM for the engine to find. data-desk-gate marks it for the CSS that
          hides the tool behind it. */}
      {vals.showLanding && (
        <div data-landing="1" {...(vals.narrow ? { 'data-desk-gate': '1' } : {})} role="region" aria-label={vals.narrow ? 'Desktop recommended' : 'Welcome to Atmos Studio'} style={sx('position:fixed;inset:0;z-index:150;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:clip;background:var(--surface)')}>
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
                 around it (_heroReach measures this block, so a narrower column = a tighter ring) */
              <div style={sx('position:relative;display:flex;flex-direction:column;align-items:center;max-width:280px')}>
                <h1 style={sx("font-family:'Neue Montreal';font-weight:500;font-size:24px;line-height:1.2;letter-spacing:-.01em;color:var(--on-surface);margin:0;max-width:15ch;text-wrap:balance")}>Atmos Studio is a desktop experience.</h1>
                <p style={sx("font-family:'Neue Montreal';font-size:13px;line-height:1.6;color:var(--on-surface-muted);margin:14px 0 0;max-width:26ch;text-wrap:pretty")}>Open this link on a wider screen to drop an image and pull its palette.</p>
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
                <div data-load-logobox="1" style={sx('position:relative;width:198px;height:39px;flex:none;overflow:hidden')}>
                  <div data-load-logo="1" style={sx('position:absolute;inset:0;transform:translateY(110%);will-change:transform')}>
                    <img src="/assets/atmos-wordmark-white.svg" alt="Atmos Studio" style={sx('width:100%;height:100%;display:block')} />
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
              <img data-wipe-word="1" src="/assets/atmos-logo-white-v3.svg" alt="Atmos Studio" style={sx('display:block;height:clamp(29px,4.81vw,53px);width:auto;transform:translateY(120%)')} />
            </div>
          </div>
        </div>
      </div>

      <header style={sx('display:flex;align-items:center;justify-content:space-between;height:64px;padding:0 16px;border-bottom:1px solid var(--line-strong);background:var(--surface);position:sticky;top:0;z-index:10')}>
        <p data-current-time="" style={sx('margin:0;font-family:Neue Montreal;font-size:10px;letter-spacing:var(--track-flat);text-transform:uppercase;color:var(--on-surface-muted);font-variant-numeric:tabular-nums;display:flex;align-items:baseline;gap:1px')}><span data-current-time-hours="">--</span>:<span data-current-time-minutes="">--</span>:<span data-current-time-seconds="">--</span><span data-current-time-timezone="" style={{ marginLeft: '7px' }}>CET</span></p>
        <div style={sx('display:flex;align-items:center;gap:10px')}>
          {vals.canReset && (
            <B006 onClick={vals.reset} label={<span style={sx('display:flex;align-items:center;height:14px')}>New generation</span>} />
          )}
          <B006 data-focus="chrome" role="switch" aria-checked={vals.isDark} onClick={vals.toggleTheme} aria-label="Toggle dark theme" title="Light / dark" label={themeSwitchLabel(vals)} />
        </div>
      </header>

      <main aria-busy={vals.busy} style={sx('width: 100%; flex: 1; min-height: 500px; display: flex; flex-direction: column; justify-content: center; padding: 24px 16px 8px')}>

        {vals.isUpload && (<>
          <button type="button" data-focus="chrome" onClick={vals.onBrowse} onMouseEnter={vals.dropEnter} onMouseLeave={vals.dropLeave} onDrop={vals.onDrop} onDragOver={vals.onDragOver} onDragLeave={vals.onDragLeave} aria-label="Upload a reference image. Drop an image here, or activate to browse your files." style={vals.dropStyle}>
            <div style={sx('position:relative;width:38px;height:38px')} aria-hidden="true">
              <div style={sx('position:absolute;left:0;top:0;width:26px;height:26px;border:1px solid var(--on-surface-muted)')}></div>
              <div style={sx('position:absolute;right:0;bottom:0;width:26px;height:26px;border:1px solid var(--on-surface);background:var(--surface)')}></div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={sx("font-family:'Neue Montreal';font-weight:500;font-size:26px;color:var(--on-surface);letter-spacing:-.01em")}>Drop a reference image</div>
              <div style={sx("font-family:'Neue Montreal';font-size:15px;color:var(--on-surface-muted);margin-top:8px")}>We read its light and atmosphere - not its literal pixels.</div>
            </div>
            <span style={sx('font-family: Neue Montreal; font-size: 13px; letter-spacing:var(--track-flat); text-transform: capitalize; color: var(--on-surface); border-bottom: 1px solid var(--on-surface); padding-bottom: 3px')}>Browse files</span>
            <input ref={vals.fileRef} type="file" accept="image/*" onChange={vals.onFile} tabIndex={-1} aria-hidden="true" style={{ display: 'none' }} />
          </button>
          {/* Trust copy sits OUTSIDE the dropzone button — inside, it would join the button's
              accessible name. The trust line is unconditional and true of every build; the sentence
              under it is additive and renders only where a live path actually exists, so the pair
              stays literally true in both worlds. */}
          <p style={sx("max-width:520px;margin:14px auto 0;text-align:center;font-family:'Neue Montreal';font-size:11px;line-height:1.5;letter-spacing:var(--track-flat);color:var(--on-surface-muted);text-wrap:pretty")}>Everything stays in your browser — nothing is uploaded or stored on us.</p>
          {vals.showInterpNote && (
            <p style={sx("max-width:520px;margin:6px auto 0;text-align:center;font-family:'Neue Montreal';font-size:11px;line-height:1.5;letter-spacing:var(--track-flat);color:var(--on-surface-muted);text-wrap:pretty")}>When live interpretation is available, a small downscaled thumbnail is sent to the model to read the mood — it isn’t stored.</p>
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
            <div style={sx('display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:18px 0 0')}>
              <B006 onClick={vals.copyHexList} aria-label="Copy the whole palette as a plain hex list"
                label={<SwapLabel copied={vals.hexListCopied} idle="Hex list" />} />
              <B006 onClick={vals.copyCss} aria-label="Copy the whole palette as CSS custom properties"
                label={<SwapLabel copied={vals.cssCopied} idle="CSS variables" />} />
              <B006 btnRef={vals.contrastBtnRef} onClick={vals.openContrast} disabled={vals.contrastDisabled} aria-haspopup="dialog" aria-label="Open contrast checker for this palette" label={contrastB006Label} />
              <B006 onClick={vals.openExport} aria-haspopup="dialog" aria-label="Export this palette as design tokens" label={exportB006Label} />
              <B006 onClick={vals.onShare} aria-label="Copy a shareable link to this palette" label={shareB006Label(vals.shareCopied)} />
            </div>
            {/* Persistent rather than tied to the copied state: the copied flag clears after 1.5s,
                which is too fleeting to read a privacy claim in — and it is reassurance wanted
                BEFORE sending a link, not after. */}
            <p style={sx("margin:10px 0 0;font-family:'Neue Montreal';font-size:11px;line-height:1.5;letter-spacing:var(--track-flat);color:var(--on-surface-muted);text-wrap:pretty")}>The link carries the palette itself — the part after # is never sent to a server.</p>
            <div style={sx('display:flex;justify-content:space-between;align-items:flex-start;gap:16px;padding:26px 0 0')}>
              <div style={sx('flex:1;min-width:0')}>
                <div data-fx="1" data-split="1" style={sx("font-family:'Neue Montreal';font-weight:500;font-size:44px;line-height:1.0;letter-spacing:-.015em;color:var(--on-surface)")}>{vals.result.name}</div>
                <div data-fx="1" style={sx('display:flex;flex-wrap:wrap;gap:8px;margin-top:18px')}>
                  {vals.result.descriptors.map((d, di) => (
                    <span key={di} style={sx('font-family: Neue Montreal; font-size: 12px; padding-top: 4px; padding-right: 8px; padding-bottom: 4px; padding-left: 8px; border-width: 1px; border-style: solid; border-color: color-mix(in srgb, var(--on-surface) 15%, transparent); background: color-mix(in srgb, var(--on-surface) 9%, var(--surface)); color: var(--on-surface); text-transform: capitalize')}>{d}</span>
                  ))}
                </div>
              </div>
              <div style={sx('width:360px;flex:none;display:flex;flex-direction:column;align-items:flex-end;gap:20px')}>
                <p data-fx="1" data-split="1" style={sx("font-family:'Neue Montreal';font-size:15px;line-height:1.5;color:var(--on-surface-muted);text-align:right;margin:0;text-wrap:pretty;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;min-height:68px")}>{vals.result.rationale}</p>
                <div data-fx="1" style={sx('display:flex;flex-direction:column;align-items:flex-end;gap:8px')}>
                  {vals.result.hasRef && vals.result.refImageNode}
                  {vals.result.noRef && (
                    <div aria-hidden="true" style={sx('width: 128px; height: 64px; border: 1px solid var(--line); background: var(--surface-raised); display: flex; align-items: center; justify-content: center')}>
                      <span style={sx('font-family:Neue Montreal;font-size:8.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--on-surface-muted)')}>No reference</span>
                    </div>
                  )}
                </div>
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
      <ContrastDrawer vals={vals} />
      <DetailOverlay vals={vals} />
      <HarmonyDrawer vals={vals} />
      <ExportDialog vals={vals} />
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
    </div>
  );
}

// ============================== FEED (list / universe / reel) ==============================
function FeedSection({ vals }) {
  return (
    <section data-recent="1" aria-label="Recent generations" style={sx('width: 100%; padding: 40px 16px 88px; border-top: 1px solid var(--line-strong); margin-top: 36px')}>
      <div style={sx('display:flex;align-items:center;gap:12px;margin-bottom:22px')}>
        <h2 style={sx("font-family: 'Neue Montreal'; font-weight: 500; font-size: 15px; letter-spacing:var(--track-flat); color: var(--on-surface); margin: 0; text-transform: capitalize")}>Recent</h2>
        <span style={sx('font-family: Neue Montreal; font-size: 10px; color: var(--on-surface-muted); text-transform: uppercase; letter-spacing:var(--track-flat)')}>{vals.feedCount} palettes</span>
        {vals.feedHasItems && (
          <div role="group" aria-label="Feed layout" data-toggle-init="1" style={sx('position:relative;display:inline-grid;grid-template-columns:repeat(3,1fr);padding:2px;border:1px solid color-mix(in srgb, var(--on-surface) 15%, transparent);background:transparent;margin-left:auto')}>
            <span aria-hidden="true" style={vals.viewTogglePill}></span>
            <button type="button" data-toggle-btn="1" data-focus="chrome" aria-pressed={vals.listPressed} tabIndex={vals.listTab} onClick={vals.setList} onKeyDown={vals.viewToggleKey} style={vals.listToggleStyle}>List</button>
            <button type="button" data-toggle-btn="1" data-focus="chrome" aria-pressed={vals.gridPressed} tabIndex={vals.gridTab} onClick={vals.setGrid} onKeyDown={vals.viewToggleKey} style={vals.gridToggleStyle}>Grid</button>
            <button type="button" data-toggle-btn="1" data-focus="chrome" aria-pressed={vals.reelPressed} tabIndex={vals.reelTab} onClick={vals.setReel} onKeyDown={vals.viewToggleKey} style={vals.reelToggleStyle}>3D</button>
          </div>
        )}
      </div>

      {vals.showProjectsBar && (
        <div style={sx('display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:22px')}>
          <div role="group" data-proj-group="1" aria-label="Filter palettes by project" style={sx('position:relative;display:inline-flex;padding:2px;border:1px solid color-mix(in srgb, var(--on-surface) 15%, transparent);background:transparent;min-width:0;max-width:100%;overflow-x:auto')}>
            <span data-proj-pill="1" aria-hidden="true" style={sx('position:absolute;top:0;left:0;width:0;height:0;background:var(--on-surface);opacity:0;pointer-events:none')}></span>
            {vals.projectChips.map((ch) => (
              <button key={ch.key} type="button" data-proj-chip="1" data-focus="chrome" aria-pressed={ch.active} aria-label={ch.aria} onClick={ch.onClick} style={ch.chipStyle}>{ch.label}<span style={ch.countStyle}>{ch.count}</span></button>
            ))}
          </div>
          <div style={sx('display:flex;align-items:center;gap:8px;margin-left:auto')}>
            <button type="button" data-ix="solid" data-focus="chrome" onClick={vals.onOpenManage} aria-haspopup="dialog" aria-label="Manage projects" style={sx('background:none;border:1px solid var(--line-strong);padding:7px 12px;font-family:Neue Montreal;font-size:10px;letter-spacing:var(--track-flat);text-transform:uppercase;color:var(--on-surface);cursor:pointer')}>Projects</button>
            <div style={sx('position:relative;display:flex')}>
              <button type="button" data-ix="solid" data-focus="chrome" aria-haspopup="menu" aria-expanded={vals.fileMenuOpen} onClick={vals.toggleFileMenu} aria-label="Save a project file" style={sx('background:none;border:1px solid var(--line-strong);padding:7px 12px;font-family:Neue Montreal;font-size:10px;letter-spacing:var(--track-flat);text-transform:uppercase;color:var(--on-surface);cursor:pointer;display:inline-flex;align-items:center;gap:7px')}>Save file<span aria-hidden="true" style={{ fontSize: '8px' }}>▾</span></button>
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
            <button type="button" data-ix="solid" data-focus="chrome" onClick={vals.onOpenFile} aria-label="Open a project file to import" style={sx('background:none;border:1px solid var(--line-strong);padding:7px 12px;font-family:Neue Montreal;font-size:10px;letter-spacing:var(--track-flat);text-transform:uppercase;color:var(--on-surface);cursor:pointer')}>Open file</button>
            <input ref={vals.projectFileRef} type="file" accept="application/json,.json" onChange={vals.onProjectFileChange} tabIndex={-1} aria-hidden="true" style={{ display: 'none' }} />
          </div>
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

        {/* LIST view (canonical) */}
        <div data-list-wrap="1" style={vals.listWrapStyle}>
          {vals.feedList.map((c) => (
            <div key={c.rowid} data-row-wrap="1" style={{ position: 'relative' }}>
              <button type="button" data-row="1" data-feed="1" data-focus="card" data-cur={c.curFlag} data-rowid={c.rowid} disabled={c.disabled} aria-current={c.ariaCurrent} aria-label={c.aria} onMouseEnter={c.onEnter} onMouseLeave={c.onLeave} onFocus={c.onFocus} onBlur={c.onLeave} onClick={c.onClick} style={c.rowStyle}>
                <span data-cmark="1" aria-hidden="true" style={c.markerStyle}></span>
                <div data-row-main="1" style={sx('display:flex;align-items:center;gap:16px;width:100%;padding:13px 18px 13px 16px')}>
                  <div aria-hidden="true" style={sx('display:flex;width:88px;height:14px;flex:none')}>
                    {c.restStrip.map((st, si) => (<div key={si} style={st.style}></div>))}
                  </div>
                  <span style={sx("font-family:'Neue Montreal';font-weight:500;font-size:16px;color:var(--on-surface);flex:none")}>{c.name}</span>
                  {c.isExample && (
                    <span style={sx('flex: none; font-family: Neue Montreal; font-size: 8px; letter-spacing:var(--track-flat); text-transform: uppercase; color: var(--on-surface-muted); border: 1px solid var(--line-strong); padding: 2px 6px')}>Example</span>
                  )}
                  <span style={sx("font-family:'Neue Montreal';font-size:9px;letter-spacing:var(--track-flat);text-transform:uppercase;color:var(--on-surface-muted);flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{c.descriptors}</span>
                  {c.current && (
                    <span style={sx('display: inline-flex; align-items: center; gap: 6px; flex: none; font-family: Neue Montreal; font-size: 9px; letter-spacing:var(--track-flat); text-transform: uppercase; color: var(--on-surface)')}>
                      <span style={sx('width:7px;height:7px;background:var(--on-surface)')} aria-hidden="true"></span>Viewing</span>
                  )}
                  <span style={sx("font-family:'Neue Montreal';font-size:9px;letter-spacing:var(--track-flat);text-transform:uppercase;color:var(--on-surface-muted);flex:none")}>{c.time}</span>
                </div>
                <div data-row-panel="1" style={c.panelStyle}>
                  <div style={sx('display:flex;gap:18px;padding:2px 18px 20px 16px;align-items:stretch')}>
                    {c.hasImage && (<span data-media="1" aria-hidden="true" style={c.mediaImgStyle}></span>)}
                    {c.noImage && (<span data-media="1" aria-hidden="true" style={c.heroFallback}></span>)}
                    <div style={sx('display:flex;flex:1;min-width:0;height:88px')} aria-hidden="true">
                      {c.bigStrip.map((st, si) => (
                        <div key={si} data-media="1" style={st.style}><span style={st.hexStyle}>{st.hex}</span></div>
                      ))}
                    </div>
                    <div data-row-values="1" style={c.valuesStyle}>
                      {c.metrics.map((m, mi) => (
                        <div key={mi} style={sx('display:flex;flex-direction:column;gap:4px;min-width:64px')}>
                          <span style={sx('font-family:Neue Montreal;font-size:8px;letter-spacing:.09em;text-transform:uppercase;color:#a3a39c;white-space:nowrap')}>{m.label}</span>
                          <span data-count={m.count} data-dec={m.dec} data-suf={m.suf} style={sx('font-family:Neue Montreal;font-size:13px;letter-spacing:.01em;color:var(--on-surface);white-space:nowrap;text-transform:capitalize')}>{m.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </button>
              <button type="button" data-ix="solid" data-del="1" data-focus="chrome" aria-label={c.assignAria} onClick={c.onAssign} style={sx('position:absolute;top:24px;right:52px;transform:translateY(-50%);z-index:6;width:30px;height:30px;display:inline-flex;align-items:center;justify-content:center;background:var(--surface);border:1px solid color-mix(in srgb, var(--on-surface) 15%, transparent);color:var(--on-surface);cursor:pointer')}>
                <IconFolder />
              </button>
              <button type="button" data-ix="solid" data-del="1" data-focus="chrome" aria-label={c.deleteAria} onClick={c.onDelete} style={sx('position:absolute;top:24px;right:16px;transform:translateY(-50%);z-index:6;width:30px;height:30px;display:inline-flex;align-items:center;justify-content:center;background:var(--surface);border:1px solid color-mix(in srgb, var(--on-surface) 15%, transparent);color:var(--on-surface);cursor:pointer')}>
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
                            <span style={sx("font-family:'Neue Montreal';font-weight:500;font-size:15px;color:var(--on-surface);white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{c.name}</span>
                            {c.current && (<span style={sx('width:7px;height:7px;background:var(--on-surface);flex:none')} aria-hidden="true"></span>)}
                          </div>
                          <span style={sx('font-family:Neue Montreal;font-size:8.5px;letter-spacing:.06em;text-transform:uppercase;color:var(--on-surface-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis')}>{c.descriptors}</span>
                        </div>
                        <div style={c.cardMetricsStyle} aria-hidden="true">
                          {c.cardMetrics.map((m, mi) => (
                            <div key={mi} style={sx('display:flex;flex-direction:column;gap:2px;min-width:0')}>
                              <span style={sx('font-family:Neue Montreal;font-size:7.5px;letter-spacing:.09em;text-transform:uppercase;color:#a3a39c;white-space:nowrap')}>{m.label}</span>
                              <span style={sx('font-family:Neue Montreal;font-size:11px;letter-spacing:.01em;color:var(--on-surface);white-space:nowrap;text-transform:capitalize;overflow:hidden;text-overflow:ellipsis')}>{m.text}</span>
                            </div>
                          ))}
                        </div>
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
                        <span style={sx("font-family:'Neue Montreal';font-weight:500;font-size:15px;color:var(--on-surface)")}>{c.name}</span>
                        {c.current && (<span style={sx('width:7px;height:7px;background:var(--on-surface);flex:none')} aria-hidden="true"></span>)}
                      </div>
                      <span style={sx('font-family:Neue Montreal;font-size:8.5px;letter-spacing:.06em;text-transform:uppercase;color:var(--on-surface-muted)')}>{c.descriptors}</span>
                    </div>
                    <div style={c.cardMetricsStyle} aria-hidden="true">
                      {c.cardMetrics.map((m, mi) => (
                        <div key={mi} style={sx('display:flex;flex-direction:column;gap:2px;min-width:0')}>
                          <span style={sx('font-family:Neue Montreal;font-size:7.5px;letter-spacing:.09em;text-transform:uppercase;color:#a3a39c;white-space:nowrap')}>{m.label}</span>
                          <span style={sx('font-family:Neue Montreal;font-size:11px;letter-spacing:.01em;color:var(--on-surface);white-space:nowrap;text-transform:capitalize;overflow:hidden;text-overflow:ellipsis')}>{m.text}</span>
                        </div>
                      ))}
                    </div>
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

        {/* FULLSCREEN 3D REEL: cylinder of reference images (panels built imperatively) */}
        <div data-reel-layer="1" role="region" aria-label="3D image carousel" style={vals.reelStyle}>
          <div data-reel-stage="1" style={sx('position:absolute;inset:0;display:flex;align-items:center;justify-content:center;perspective:90vw;perspective-origin:50% 50%;overscroll-behavior:none;cursor:grab;touch-action:none')}>
            <div data-reel-list="1" style={sx('position:relative;width:80vw;height:50vw;font-size:1vw;display:flex;align-items:center;justify-content:center;transform-style:preserve-3d')}></div>
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
        <div style={sx('display:flex;align-items:center;gap:10px;flex:none')}>
          <button type="button" data-ix="solid" data-focus="chrome" aria-label={overlay.assignAria} onClick={overlay.onAssign} style={sx('display:inline-flex;align-items:center;gap:8px;background:none;border:1px solid color-mix(in srgb, var(--on-surface) 15%, transparent);padding:9px 14px;font-family:Neue Montreal;font-size:10px;letter-spacing:var(--track-flat);text-transform:uppercase;color:var(--on-surface);cursor:pointer;transition:background .15s var(--ease-standard),color .15s var(--ease-standard),border-color .15s var(--ease-standard)')}>
            <IconFolder />{overlay.projectLabel}</button>
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
          <div style={sx('display:flex;align-items:center;gap:10px')}>
            <B006 onClick={overlay.copyHexList} aria-label="Copy the whole palette as a plain hex list"
              label={<SwapLabel copied={overlay.hexListCopied} idle="Hex list" />} />
            <B006 onClick={overlay.copyCss} aria-label="Copy the whole palette as CSS custom properties"
              label={<SwapLabel copied={overlay.cssCopied} idle="CSS variables" />} />
            <B006 onClick={vals.openContrast} disabled={vals.contrastDisabled} aria-haspopup="dialog" aria-label="Open contrast checker for this palette" label={contrastB006Label} />
            <B006 onClick={vals.openExport} aria-haspopup="dialog" aria-label="Export this palette as design tokens" label={exportB006Label} />
          </div>
        </div>
        <p style={sx("width:380px;flex:none;font-family:'Neue Montreal';font-size:15px;line-height:1.5;color:var(--on-surface-muted);text-align:right;margin:0;text-wrap:pretty")}>{overlay.rationale}</p>
      </footer>
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
