// Chrome shared by the tool and the legal routes.
//
// Both of these lived in AppView until privacy and terms became routes of this same document. They
// are here rather than exported from there for one reason: AppView imports LegalPage, so LegalPage
// importing back out of AppView would close a cycle — which ES modules tolerate and nobody should
// have to reason about. A third file both sides import is the honest shape of "shared".
import React, { useState } from 'react';
import { sx } from '../lib/sx.js';

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

function themeSwitchLabel(vals) {
  return (
    <span style={sx('display:flex;align-items:center;gap:7px;height:14px')}>
      <span aria-hidden="true" style={{ ...sx('position:relative;display:inline-block;width:28px;height:14px;flex:none;transition:background var(--dur-chrome) var(--ease-standard)'), background: vals.switchTrackBg }}>
        <span style={{ ...sx('position:absolute;left:2px;top:2px;width:10px;height:10px;background:var(--surface);transition:transform var(--dur-chrome) var(--ease-standard)'), transform: vals.switchDotX }}></span>
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
      data-focus="chrome"
      role="switch"
      aria-checked={vals.isDark}
      onClick={vals.toggleTheme}
      aria-label="Toggle dark theme"
      title="Light / dark"
      label={themeSwitchLabel(vals)}
    />
  );
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
  return (
    <div className="doc-head">
      <span className="doc-head__theme"><ThemeSwitch vals={vals} /></span>
      <span className="doc-head__mark">
        <a href="/" onClick={vals.navigate} aria-label="Atmos Gallery">
          <span className="mark" role="img" aria-label="Atmos Gallery"></span>
        </a>
      </span>
    </div>
  );
}
