// Chrome shared by the tool and the legal routes.
//
// Both of these lived in AppView until privacy and terms became routes of this same document. They
// are here rather than exported from there for one reason: AppView imports LegalPage, so LegalPage
// importing back out of AppView would close a cycle — which ES modules tolerate and nobody should
// have to reason about. A third file both sides import is the honest shape of "shared".
import React, { useEffect, useRef, useState } from 'react';
import { sx } from '../lib/sx.js';
import { initDocHeadHide } from './methods/docHeadHide.js';

/* THE PART THAT SWAPS. Wrap the WORDS of a label in this and nothing else — an icon, a chevron or a
   toggle track passed as a sibling stays exactly where it is while the text rises through its mask.
   The first cut of the masked swap slid .button-006__text, which is the whole label row, so every
   glyph travelled with the words: a control's icon is part of its identity, not part of its
   sentence, and moving it made the button look like it was reloading rather than answering.
   The mask has to hug the TEXT, not the button. .button-006__default / __hover are the full button
   box, and translateY(100%) on a 14px line inside a 29px box only clears the line's own height —
   the words would slide into the padding and sit there half-visible. A mask the size of the line
   means 100% is exactly one line, which is the same arithmetic _maskLineReveal does per line. */
export function B006Text({ children }) {
  return <span className="b006-swap"><span className="b006-swap__in">{children}</span></span>;
}

/* THE SAME SWAP, for controls that do not have button-006's two layers. B006Text can carry one copy
   of the words because the button already renders the whole label twice; an ordinary [data-ix]
   button or a footer link renders it once, so this supplies the second copy itself and stacks them.
   The twin is aria-hidden — it is the same word arriving, not a second thing to read.
   Works under any button, link or role=button because the hover rule keys off the ancestor rather
   than off a component class, so a text link in the footer and a sort header in the archive take it
   the same way and on the same tokens as the CTA. */
export function TextSwap({ children }) {
  return (
    <span className="tswap">
      <span className="tswap__a">{children}</span>
      <span className="tswap__b" aria-hidden="true">{children}</span>
    </span>
  );
}

// The project's button, remapped to system tokens in global.css (.button-006). The two stacked
// spans are load-bearing: they are the two copies of the label the hover swap slides between, each
// clipped by its own layer. `hover` gives the second copy different words; omitted, both spans hold
// the same label and the swap reads as the line refreshing itself.
export function B006({ label, hover, btnRef, ...props }) {
  return (
    <button type="button" data-button-006="" className="button-006" ref={btnRef} style={sx('font-family: Neue Montreal; font-size:var(--fs-label); letter-spacing:var(--track-flat)')} {...props}>
      <span className="button-006__hover"><span className="button-006__text" style={sx('letter-spacing:var(--track-flat); font-family: Neue Montreal')}>{hover ?? label}</span><span className="button-006__bg is--hover"></span></span>
      <span className="button-006__default"><span aria-hidden="true" className="button-006__text" style={sx('letter-spacing:var(--track-flat)')}>{label}</span><span className="button-006__bg is--default"></span></span>
    </button>
  );
}

/* THE GLASS, as seven stacked layers (Osmo Supply — Glass Effect / Background).
   Ported verbatim: the class names are the resource's, the order is the resource's, and every layer
   is load-bearing. `__fill` is the tint, `__fill-burn` deepens it through colour-burn, the two
   `__highlight-*` are the lit top-left and the falling-away bottom-right, the two `__edge-*` draw
   the rim, and `__inner-glow` is the light caught inside the pane. Take one out and the pane stops
   reading as a thickness and goes back to being a blurred rectangle.

   It carries no attributes of its own — no aria-hidden, no data hook. Seven empty divs are already
   nothing to a screen reader, and the effect is styled entirely from .glass-effect in global.css.

   Rendered as the FIRST child of the bar it fills, which is what puts it behind the bar's own
   content; .glass-bar in global.css is the two lines that make that stacking explicit. */
export function GlassEffect() {
  return (
    <div className="glass-effect">
      <div className="glass-effect__fill"></div>
      <div className="glass-effect__fill-burn"></div>
      <div className="glass-effect__highlight-soft"></div>
      <div className="glass-effect__highlight-strong"></div>
      <div className="glass-effect__edge-light"></div>
      <div className="glass-effect__edge-dark"></div>
      <div className="glass-effect__inner-glow"></div>
    </div>
  );
}

function themeSwitchLabel(vals) {
  return (
    <span style={sx('display:flex;align-items:center;gap:7px;height:14px')}>
      {/* THE TRACK AND THE DOT BOTH TAKE --radius-pill, which is a stadium on the 28x14 track and a
          circle on the 10x10 dot — the token means "fully round", so one figure serves both and
          neither needs 50% or a length. A switch that reads as a pill is the physical object this
          control has always been drawing; it was square only because the system was. */}
      <span aria-hidden="true" style={{ ...sx('position:relative;display:inline-block;width:28px;height:14px;flex:none;border-radius:var(--radius-pill);transition:background var(--dur-chrome) var(--ease-standard)'), background: vals.switchTrackBg }}>
        <span style={{ ...sx('position:absolute;left:2px;top:2px;width:10px;height:10px;background:var(--surface);border-radius:var(--radius-pill);transition:transform var(--dur-chrome) var(--ease-standard)'), transform: vals.switchDotX }}></span>
      </span><B006Text>{vals.themeLabel}</B006Text>
    </span>
  );
}

// The one display preference, in the same control on every route. The legal routes carry it because
// they are the same document now: a reader who dims the tool and then opens the privacy statement
// would otherwise watch it come back at full brightness, which reads as a different site rather than
// a different page.
export function ThemeSwitch({ vals }) {
  return (
    <B006
      data-emphasis="secondary"
      /* The hook the pill radius is scoped to — see .button-006[data-theme-switch] in global.css.
         B006 backs about fifteen controls across the tool and they are all still square; this one
         is named rather than the token being changed underneath all of them. */
      data-theme-switch=""
      data-focus="chrome"
      role="switch"
      aria-checked={vals.isDark}
      onClick={vals.toggleTheme}
      aria-label="Dark theme"
      title="Light / dark"
      label={themeSwitchLabel(vals)}
    />
  );
}

/* IN-BODY LINKS, for the three routes whose copy is injected HTML.

   These pages set their markup with dangerouslySetInnerHTML, so their anchors are not React elements
   and renderVals.navigate — an onClick handler with a currentTarget contract — can never reach them.
   One delegated listener on the route's <main> gives every one of them the treatment a link in JSX
   already gets: a plain left-click becomes the wiped swap, and a modified click, a middle-click, a
   new tab, a crawler or a reader with no JS follows the real address.

   It lives here rather than on a page because it was written for About and the two legal statements
   were left without it — so `Privacy` inside the terms document, and the three links back the other
   way, full-reloaded the site: no cover, no brand beat, GSAP and both .otf faces fetched again. Two
   navigation models depending on which document you happened to be standing in. One listener, three
   routes, one model.

   The guards are navigate()'s, restated because the anchor is resolved with closest() here rather
   than being the listener's own currentTarget. Anything inside the page that owns its own click —
   the section dock's in-page jumps, the legal TOC's — stops propagation, which is what the
   defaultPrevented check and their own stopPropagation together protect. */
export function docLinkHandler(vals) {
  return (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!a || a.hasAttribute('download') || (a.target && a.target !== '_self')) return;
    let url;
    try { url = new URL(a.getAttribute('href'), location.href); } catch (err) { return; }
    if (url.origin !== location.origin) return;
    // An in-page anchor is not a route change. Left alone it would resolve to this same pathname and
    // be swallowed by navigateTo's own no-op guard, taking the jump with it.
    if (url.pathname === location.pathname && url.hash) return;
    e.preventDefault();
    vals.navigateTo(url.pathname);
  };
}

/* THE DOCUMENT MASTHEAD — /about, /privacy, /terms.
   The mark is a link home rather than the app's fixed [data-logo] button: these routes are read by
   people who arrived from a search result as often as from the tool, and on a document that scrolls
   the mark has to sit in a bar rather than fly over the content. The theme switch stands in the same
   corner it does in the app.

   It lived in LegalPage until About needed the same bar. Duplicating it would have been eleven lines
   of JSX and a second set of class names for one object — which is the shape every drift on this site
   has started as. Styles are in doc.css beside the route's own base rules; scripts/prerender.mjs
   restates this markup for the no-JS floor and has to be kept in step with it. */
export function DocHead({ vals }) {
  /* The bar leaves on the way down and comes back on the way up — see methods/docHeadHide.js for
     why that is here rather than on the app's header, and why it is a transition rather than a
     tween. Mounted from DocHead itself, not from the two pages that render it, so the behaviour
     cannot drift between /about and the legal routes or be forgotten by a fourth document. init
     returns its own teardown, which is exactly what useEffect wants back. */
  const barRef = useRef(null);
  useEffect(() => initDocHeadHide(barRef.current), []);

  return (
    <div className="doc-head glass-bar" ref={barRef}>
      <GlassEffect />
      <span className="doc-head__theme"><ThemeSwitch vals={vals} /></span>
      <span className="doc-head__mark">
        <a href="/" onClick={vals.navigate} aria-label="Atmos Gallery" data-focus="chrome">
          <span className="mark" role="img" aria-label="Atmos Gallery"></span>
        </a>
      </span>
    </div>
  );
}
