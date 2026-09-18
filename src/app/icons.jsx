/* ICONS SHARED ACROSS MODULES. The app's icon set lives in AppView.jsx beside the controls that use
   it; an icon moves here only when a second module needs it, because chrome.jsx cannot import from
   AppView.jsx (AppView imports chrome.jsx, and the cycle would be one careless edit from breaking).
   The plus is the first: NavNewPalette, in chrome.jsx, leads with it. */
import React from 'react';

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
   currentColor, and the design survives the theme switch the export could not know about.
   TWO SIZES NOW (18.09.26, by request): 20 on the dropzone's disc, and 16 leading New Palette in
   both mastheads. 16 because the arms then span 8px, the cap height of the 12px label beside them;
   and a 2px gap because the glyph fills only the middle half of its box, so the box already holds
   4px of air on each side — 2px of gap reads as about 6, where the icon buttons' 7px read as 10. */
export const IconPlus = ({ size = 14 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ display: 'block', flex: 'none' }}><path fill="currentColor" d="M18 12.857H12.857V18H11.143V12.857H6V11.143H11.143V6H12.857V11.143H18V12.857Z"></path></svg>);
