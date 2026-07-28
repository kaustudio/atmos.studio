// Chrome shared by the tool and the legal routes.
//
// Both of these lived in AppView until privacy and terms became routes of this same document. They
// are here rather than exported from there for one reason: AppView imports LegalPage, so LegalPage
// importing back out of AppView would close a cycle — which ES modules tolerate and nobody should
// have to reason about. A third file both sides import is the honest shape of "shared".
import React, { useState } from 'react';
import { sx } from '../lib/sx.js';

// The project's button, remapped to system tokens in global.css (.button-006). The two stacked
// spans are the resource's own clip-path text swap and are load-bearing.
export function B006({ label, hover, btnRef, ...props }) {
  return (
    <button type="button" data-button-006="" className="button-006" ref={btnRef} style={sx('font-family: Neue Montreal; font-size: 10px; letter-spacing:var(--track-flat)')} {...props}>
      <span className="button-006__hover"><span className="button-006__text" style={sx('letter-spacing:var(--track-flat); font-family: Neue Montreal')}>{hover ?? label}</span><span className="button-006__bg is--hover"></span></span>
      <span className="button-006__default"><span aria-hidden="true" className="button-006__text" style={sx('letter-spacing:var(--track-flat)')}>{label}</span><span className="button-006__bg is--default"></span></span>
    </button>
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
