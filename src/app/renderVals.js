// The view-model: renderVals() computes everything the view renders — a verbatim port of the
// design comp's renderVals. The JSX view (AppView) consumes this object untouched.
import React from 'react';
import { UNIVERSE_TILE, UNIVERSE_TILE_INSET } from './universeTile.js';
import { ROLE_LABEL, semanticRoles } from '../lib/exporters.js';
import { analysePalette, composeUse } from '../lib/reading.js';

const MONO = 'Neue Montreal';

// ===== THE ACCESSIBILITY VERDICT — one definition, every surface =====
// Module scope rather than local to renderVals() on purpose: three surfaces report this same
// measurement (the list row, the detail panel's Accessibility group, and the universe card), and
// while each built its own they drifted — the row led with the verdict badge and a bare count, the
// other two printed a bare "2 / 10" with no verdict at all. The same palette answered the same
// question in two vocabularies depending on where you were standing. Now there is one answer and
// three places that render it.

// One vocabulary for the three capability states, used by the badge tooltip, the row's accessible
// name and the Text usability facet — so the words never diverge between surfaces.
//
// NAMED BY WHAT YOU CAN DO WITH THE PALETTE. Three vocabularies have been tried here and the
// difference between them is worth keeping:
//   Flexible / Limited / None      verdicts with no subject. Limited against what, and how far off?
//                                  The panel needed a paragraph above the group to define all three.
//   3+ / 1–2 / No AA text pairs    the measurement, stated. Self-defining, and unreadable as a
//                                  choice: three rows of near-identical arithmetic that the reader
//                                  has to convert back into "so can I set type in this or not?".
//   Text-Ready / Limited Text /    the ANSWER to that question, which is what the group is for.
//   Accent Only                    The arithmetic stays, one layer down, in A11Y_DEFINITION.
// The state ids are untouched — they are persisted filter state and composeUse() reads them — so
// only what is SHOWN has ever changed. The split is the same 0 / 1–2 / 3+ it has always been.
//
// Title Case, and the casing lives in these strings rather than in a text-transform: these are
// names, and a name that only looks right because a stylesheet is shouting at it is a name that
// breaks the moment it appears anywhere else — the chip, the badge title, an aria string.
const A11Y_LABEL = {
  flexible: 'Text-Ready',
  limited: 'Limited Text',
  none: 'Accent Only',
};
/* The analysis's band names reach the phone story as VALUES in a two-column readout — Dominant,
   Mid, Saturated — where every other value in the column is already a name. analysePalette returns
   them lower case because every one of its own consumers puts them mid-sentence (see the rationale
   composer), so this is the one place that has to raise the first letter, and it does it here rather
   than with a text-transform: capitalize for the reason A11Y_LABEL states above — and for the
   sharper one global.css records, that capitalize shouts at EVERY word in the string. */
const CAPS = (v) => (typeof v === 'string' && v) ? v.charAt(0).toUpperCase() + v.slice(1) : '';
// THE DEFINITION, one layer down. These names are answers rather than measurements, so unlike the
// band labels they do not define themselves — and that debt has to be paid somewhere reachable
// rather than left for the reader. It is paid three times over, on demand every time: the panel's
// ⓘ carries all three, each row carries its own on hover, and each row's accessible name ends with
// it so a screen-reader user is never the one who has to hover to find out.
// The list's page sizes, in one place. They were three inline copies of [12, 24, 36] — the toggle's
// options, its pill offset and its arrow-key wrap — which agreed only for as long as nobody edited
// one of them. The first entry is load-bearing beyond the toggle: it is the smallest page a list can
// be cut into, and therefore the size below which the pager has nothing to offer (see showPageSize).
const PAGE_SIZES = [12, 24, 36];
const A11Y_DEFINITION = {
  flexible: '3 or more colour pairs meet WCAG AA for normal text.',
  limited: 'Only 1–2 colour pairs meet WCAG AA. Text use requires deliberate pairing.',
  none: 'No colour pairs meet WCAG AA for normal text without adjustment.',
};
// The badge's own tooltip, which has a palette in hand rather than a whole band to describe — so it
// says the same thing in the singular and the exact count follows it (see aaReadout).
const A11Y_TITLE = {
  flexible: 'Text-Ready: 3 or more colour pairs meet WCAG AA for normal text',
  limited: 'Limited Text: only 1–2 colour pairs meet WCAG AA, so text use requires deliberate pairing',
  none: 'Accent Only: no colour pairs meet WCAG AA for normal text without adjustment',
};
// Lower case, because every one of these sits mid-sentence in an accessible name.
const A11Y_SPOKEN = {
  flexible: 'text-ready',
  limited: 'limited text',
  none: 'accent only',
};
// the badge: status expressed by FILL (pass filled / partial outlined / fail ghost) + glyph,
// every value resolving through the status tokens — the view only ever names the status.
// Width comes from --row-aa-mark rather than from the content, and the content sits flush to the
// trailing edge: the ✕ state's glyph is narrower than ✓ and ◐, so intrinsic sizing gave three
// badge widths and a ragged right edge. Fixed slot + flex-end = one edge, which the list header's ⓘ
// reads from the same token — so badge and marker align exactly the way the pair count aligns
// under AA PAIRS and the ratio under MAX CONTRAST.
const aaBadge = (st) => ({ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', flex: 'none', width: 'var(--row-aa-mark)', padding: '2px 6px', fontFamily: MONO, fontSize: 'var(--fs-nano)', letterSpacing: 'var(--track-flat)', textTransform: 'uppercase', fontWeight: 500, background: 'var(--status-' + st + '-surface)', color: 'var(--status-' + st + '-ink)', border: '1px solid var(--status-' + st + '-line)' });
// What every surface renders: the verdict, then the count. No denominator in the VALUE — it is
// C(n,2), a number nobody reasons in, and repeating it implied a compliance percentage. It is
// stated once in the list header's ⓘ, and again in the title of every badge, everywhere.
const aaReadout = (met) => ({
  aaState: met.aaState,
  aaBadgeStyle: aaBadge(met.aaState),
  // The verdict and its definition, then THIS palette's exact figure. The definition is about the
  // band ("3 or more"); the parenthetical is about the palette in hand, which is the one thing the
  // band cannot tell you and the reason the count still earns its place here.
  aaBadgeTitle: A11Y_TITLE[met.aaState] + ' (' + met.aaPairs + ' of ' + met.totalPairs + ' colour pairs at 4.5:1)',
  aaValueText: String(met.aaPairs),
});

// A slider track drawn as its own axis. n evenly spaced samples through a colour function, emitted
// as a linear-gradient — enough stops that the eye reads a continuum, few enough that recomputing
// them on every render of an open dialog costs nothing measurable.
const rampTrack = (n, at) => 'linear-gradient(90deg,' + Array.from({ length: n }, (_, i) => at(i / (n - 1)) + ' ' + ((i / (n - 1)) * 100).toFixed(1) + '%').join(',') + ')';

// Chips for the two measured groups. Module scope because the applied-chip row is built before the
// facet table exists in that scope, and one definition beats two that must agree.
const MEAS_LABELS = { dark: 'Dark', balanced: 'Balanced', light: 'Light', warm: 'Warm', cool: 'Cool', neutral: 'Neutral' };
const MEAS_CHIPS = (self, s, focusBack) => {
  const out = [];
  [['activeLight', 'lightness'], ['activeTemp', 'temperature']].forEach(([key, group]) => {
    (s[key] || []).forEach((v) => out.push({
      key: group + ':' + v, label: MEAS_LABELS[v] || v,
      aria: 'Remove the ' + (MEAS_LABELS[v] || v).toLowerCase() + ' ' + group + ' filter',
      onRemove: () => { self.setFacet(key, v); focusBack(); },
    }));
  });
  return out;
};

export const renderValsMethods = {
  renderVals() {
    const s = this.state;
    const mono = 'Neue Montreal';
    const w = (b) => this.swatchGrow(b);   // one rule for a swatch's share, shared with the 3D card (pipeline.js)
    /* THE TRAIT PILL — the detail overlay's footer traits, and the one place the word "pill" in this
       file finally means the shape as well as the role. It rounds with the result stage's own trait
       chips, which are the same object one surface over; the 11px inset stays, because at a 26px
       height the arc's widest point is at the text's own centre line and 11 clears it. */
    const pill = { fontFamily: mono, fontSize: 'var(--fs-label)', letterSpacing: 'var(--track-flat)', textTransform: 'uppercase', color: 'var(--on-surface)', background: 'color-mix(in srgb, var(--on-surface) 9%, var(--surface))', border: '1px solid color-mix(in srgb, var(--on-surface) 15%, transparent)', borderRadius: 'var(--radius-pill)', padding: '8px 11px', lineHeight: 1 };
    const busy = s.stage === 'processing';

    // ===== contrast checker view (computed from sRGB relative luminance — WCAG, not OKLCH L) =====
    let cx = null;
    if (s.contrast) {
      const cp = this.contrastPalette();
      if (cp) {
        const sw = cp.swatches, N = sw.length, aaa = s.contrastLens === 'AAA';
        const th = s.contrastLarge ? (aaa ? 4.5 : 3) : (aaa ? 7 : 4.5);
        const chip = (b) => ({ hex: b.hex.toUpperCase(), style: { width: '24px', height: '24px', background: b.hex, flex: 'none', border: '1px solid color-mix(in srgb, var(--on-surface) 20%, transparent)' } });
        const rows = [{ isHeader: true, isBody: false, corner: '', chips: sw.map(chip) }];
        sw.forEach((rb, i) => {
          const cells = sw.map((cb, j) => {
            if (j >= i) return { blank: true, key: '', ratio: '', glyph: '', numStyle: {}, glyphStyle: {}, style: { flex: 1, minWidth: 0, height: '34px', borderLeft: '1px solid var(--line)', borderTop: '1px solid var(--line)' } };
            const r = this.contrastRatio(rb.hex, cb.hex), pass = r >= th, dim = s.contrastPassOnly && !pass;
            return {
              blank: false, key: i + '-' + j, pass, ratio: r.toFixed(1), glyph: pass ? '✓' : '✕',
              style: { flex: 1, minWidth: 0, height: '34px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1px', borderLeft: '1px solid var(--line)', borderTop: '1px solid var(--line)', background: pass ? 'color-mix(in srgb, var(--on-surface) 6%, transparent)' : 'transparent', opacity: dim ? 0.22 : 1 },
              numStyle: { fontFamily: mono, fontSize: 'var(--fs-label)', lineHeight: 1, color: 'var(--on-surface)' },
              glyphStyle: { fontSize: 'var(--fs-nano)', lineHeight: 1, color: pass ? 'var(--on-surface)' : 'var(--on-surface-muted)' },
            };
          });
          rows.push({ isHeader: false, isBody: true, chip: chip(rb), cells });
        });
        const textOn = sw.map((b) => {
          const on = this.onColor(b.hex); const r = this.contrastRatio(b.hex, on);
          return {
            hex: b.hex.toUpperCase(), onLabel: on === '#000000' ? 'Black text' : 'White text', ratio: r.toFixed(1),
            style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', background: b.hex, color: on, padding: '10px 12px', minWidth: 0 },
            nameStyle: { fontFamily: mono, fontSize: 'var(--fs-label)', letterSpacing: '.02em' },
            metaStyle: { fontFamily: mono, fontSize: 'var(--fs-label)', opacity: 0.85, whiteSpace: 'nowrap' },
          };
        });
        // One definition of the best pair, taken from paletteMetrics so the drawer's sample and the
        // result view's recommendation can never name different colours for the same palette. It
        // also arrives correctly oriented: the ratio is symmetric, and this pane's own loop used to
        // record whichever member it reached first as the foreground.
        const bp = this.paletteMetrics(cp).bestPair;
        const best = bp ? { r: bp.ratio, fg: bp.fg, bg: bp.bg } : null;
        const summary = this.contrastSummary(cp);
        const segOn = { fontFamily: mono, fontSize: 'var(--fs-micro)', letterSpacing: 'var(--track-flat)', textTransform: 'uppercase', padding: 'var(--btn-pad-sm)', borderRadius: 'var(--radius-pill)', cursor: 'pointer', border: '1px solid var(--on-surface)', background: 'var(--on-surface)', color: 'var(--surface)' };
        const segOff = { fontFamily: mono, fontSize: 'var(--fs-micro)', letterSpacing: 'var(--track-flat)', textTransform: 'uppercase', padding: 'var(--btn-pad-sm)', borderRadius: 'var(--radius-pill)', cursor: 'pointer', border: '1px solid var(--action-line)', background: 'none', color: 'var(--on-surface)' };
        /* THE TWO PAIRS BECOME RAILS, the same object as the library panel's tabs and the feed's
           List / Grid / 3D: one bordered box, a travelling --on-surface pill inside it, and two
           transparent buttons over the top. They were two adjacent bordered buttons with the
           selected one filled — which says the same thing, and says it as two objects that happen
           to agree rather than as one control with a position. The pill is what makes a segmented
           control read as a switch: the selection MOVES between two halves of one box.
           The buttons take viewToggleOptStyle, so a future edit to the app's segmented control
           reaches the contrast checker too. segOn/segOff are left in place for Passing only, which
           is not one of a pair — it is a filter that is on or off, and it keeps the bordered
           treatment that says so. It takes the corner, though: a square button standing beside two
           stadium rails would be the only right angle left on the surface, and the shape was never
           what distinguished a filter from a switch — the fill is. */
        const segPill = (second) => ({
          position: 'absolute', top: '2px', bottom: '2px', left: '2px', width: 'calc((100% - 4px) / 2)',
          transform: 'translateX(' + (second ? 100 : 0) + '%)', background: 'var(--on-surface)',
          transition: this._reduce ? 'none' : 'transform var(--dur-fold) var(--ease-fold)',
        });
        const segBtn = (active) => this.viewToggleOptStyle(active, { fontSize: 'var(--fs-micro)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' });
        cx = {
          lensPill: segPill(aaa), sizePill: segPill(s.contrastLarge),
          name: cp.name, N, aaa, lensLabel: aaa ? 'AAA' : 'AA', threshold: th.toFixed(th % 1 ? 1 : 0),
          aa: summary.aa, total: summary.total, allPass: summary.aa === summary.total,
          large: s.contrastLarge, passOnly: s.contrastPassOnly,
          rows, textOn,
          matrixColsStyle: { display: 'flex', flexDirection: 'column', width: '100%' },
          sampleStyle: { background: best ? best.bg : 'var(--surface)', color: best ? best.fg : 'var(--on-surface)', padding: '20px', fontFamily: mono, fontSize: s.contrastLarge ? 'var(--fs-title)' : 'var(--fs-lead)', lineHeight: 1.4, fontWeight: s.contrastLarge ? 500 : 400 },
          sampleRatio: best ? best.r.toFixed(1) : '—', sampleFg: best ? best.fg.toUpperCase() : '', sampleBg: best ? best.bg.toUpperCase() : '',
          setAA: () => this.setState({ contrastLens: 'AA' }), setAAA: () => this.setState({ contrastLens: 'AAA' }),
          aaStyle: segBtn(!aaa), aaaStyle: segBtn(aaa), aaPressed: aaa ? 'false' : 'true', aaaPressed: aaa ? 'true' : 'false',
          setNormal: () => this.setState({ contrastLarge: false }), setLarge: () => this.setState({ contrastLarge: true }),
          normalStyle: segBtn(!s.contrastLarge), largeStyle: segBtn(s.contrastLarge),
          normalPressed: s.contrastLarge ? 'false' : 'true', largePressed: s.contrastLarge ? 'true' : 'false',
          togglePass: () => this.setState((st) => ({ contrastPassOnly: !st.contrastPassOnly })),
          passStyle: s.contrastPassOnly ? segOn : segOff, passPressed: s.contrastPassOnly ? 'true' : 'false', passLabel: s.contrastPassOnly ? 'Passing only ✓' : 'Passing only',
        };
      }
    }

    let result = null;
    if (s.current) {
      const n = s.current.swatches.length;
      const totW = s.current.swatches.reduce((a, x) => a + x.weight, 0) || 1;
      const bands = s.current.swatches.map((b, i) => {
        // Keyed by sid, not by position: the moment anything can reorder or remove a swatch, an
        // index key makes React reuse the wrong band node and makes a "✓ Copied" flag land on a
        // colour the user never clicked. sid follows the swatch, and stored palettes already carry
        // orders no index can be trusted to describe.
        const sid = typeof b.sid === 'number' ? b.sid : i;
        const on = this.onColor(b.hex);
        const fmt = this.swatchFormats(b.hex);
        const divCol = on === '#000000' ? 'rgba(0,0,0,.16)' : 'rgba(255,255,255,.24)';
        const hoverBg = on === '#000000' ? 'rgba(0,0,0,.10)' : 'rgba(255,255,255,.16)';
        const cavBorder = on === '#000000' ? 'rgba(0,0,0,.32)' : 'rgba(255,255,255,.42)';
        const rowBase = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', width: '100%', background: 'transparent', border: 'none', borderTop: '1px solid ' + divCol, padding: '8px 14px', margin: 0, cursor: 'pointer', textAlign: 'left', color: on };
        const values = ['hex', 'rgb', 'cmyk', 'hsl'].map((key) => {
          const f = fmt[key];
          const copied = s.copied === key + '-' + sid;
          return {
            key, labelText: f.label, caveat: f.caveat, hasCaveat: !!f.caveat, copied, notCopied: !copied,
            display: copied ? 'Copied' : f.display,
            valueAnim: { display: 'inline-block', animation: (copied ? 'val-mask-a' : 'val-mask-b') + ' var(--dur-swap) var(--ease-entrance) both' },
            aria: 'Copy ' + f.label + ' value ' + f.copy + ' for swatch ' + (i + 1) + (f.caveat ? ', ' + f.caveat : ''),
            onCopy: () => this.copy(f.copy, key + '-' + sid, 'Copied ' + f.copy),
            rowStyle: rowBase, rowHover: { background: hoverBg },
            colStyle: { display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0, flex: 1 },
            labelRowStyle: { display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 },
            labelStyle: this.monoLabel('var(--fs-nano)', '.14em', { color: on, opacity: 0.75, flex: 'none' }),
            caveatStyle: { fontFamily: mono, fontSize: 'var(--fs-nano)', letterSpacing: '.05em', textTransform: 'uppercase', color: on, opacity: 0.62, border: '1px solid ' + cavBorder, padding: '1px 4px', whiteSpace: 'nowrap', flex: 'none' },
            valueStyle: { fontFamily: mono, fontSize: 'var(--fs-detail)', letterSpacing: '.02em', color: on, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
            iconWrapStyle: { flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '14px', height: '14px', color: on, opacity: copied ? 1 : 0.5 },
          };
        });
        return {
          sid,
          weightPct: Math.round((b.weight / totW) * 100) + '%',
          groupAria: 'Swatch ' + (i + 1) + ' of ' + n + ', ' + fmt.hex.display,
          values,
          onHarmony: () => this.openHarmony(b.hex),
          harmonyAria: 'Colour harmonies for ' + fmt.hex.display,
          infoBtnStyle: { position: 'absolute', top: '12px', right: '12px', zIndex: 4, width: '28px', height: '28px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: '1px solid color-mix(in srgb, ' + on + ' 15%, transparent)', color: on, cursor: 'pointer', padding: 0 },
          style: { flexGrow: w(b), flexBasis: 0, minWidth: '190px', height: '340px', background: b.hex, position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', willChange: 'opacity' },
          bandRingStyle: { position: 'absolute', inset: '0', boxShadow: 'none', opacity: 0, pointerEvents: 'none', zIndex: 1 },
          weightStyle: { fontFamily: mono, fontSize: 'var(--fs-label)', letterSpacing: '.06em', color: on, opacity: 0.72, padding: '14px 14px 0', position: 'relative', zIndex: 2 },
          valuesWrap: { display: 'flex', flexDirection: 'column', width: '100%', position: 'relative', zIndex: 2 },
        };
      });
      const _ref = this.dispUrl(s.current), _hasRef = this.hasImg(s.current);
      // Build the reference thumbnail as a node so the <img> only exists once its src is resolved.
      // 156×104 (same 3:2), sized to sit level with the metadata columns it now shares a row
      // with — the subtle enlargement the move down bought; click-to-zoom still carries the
      // full-size view, so the thumbnail only has to identify, not exhibit
      const refImageNode = _hasRef ? React.createElement('button', { type: 'button', 'data-click-zoom': '1', 'data-focus': 'chrome', 'aria-label': 'View the reference image larger', style: { border: 'none', padding: 0, background: 'none', display: 'block', cursor: 'zoom-in' } }, React.createElement('img', { src: _ref, alt: 'The reference image you uploaded', style: { display: 'block', width: '156px', height: '104px', objectFit: 'cover', border: '1px solid var(--line-strong)' } })) : null;
      // The metadata cluster — restored to the detail pane. It used to live ONLY in the list's
      // inline expansion; Phase 1 removed that expansion on the contract that this panel is the one
      // detail surface, but these five values (hue/chroma/lightness/temperature/archetype) were
      // never relocated here — they were dropped. Max contrast and AA pairs are also in the list's
      // comparison columns, but the detail pane states the full readout: the row exists to compare,
      // this panel exists to inspect, and inspection should not require the row.
      // Grouped, not flat: the seven values are three different KINDS of statement, and the
      // hierarchy follows that — group heading (uppercase, muted) → label (sentence case, muted)
      // → value (full ink, tabular, right-aligned). Scanning is two-step: find the group, then
      // read down an aligned value column, instead of parsing seven equal pairs in a line. The
      // groups are also the wrap unit: on a narrow window whole groups reflow, so "Lightness"
      // can never end up orphaned on a new line away from the other colour facts.
      const curMet = this.paletteMetrics(s.current);
      const detailMeta = [
        {
          title: 'Colour', rows: [
            { label: 'Dominant hue', value: curMet.hue + '°' },
            { label: 'Chroma', value: curMet.chroma.toFixed(3) },
            { label: 'Lightness', value: curMet.lMin + '–' + curMet.lMax + '%' },
            { label: 'Temperature', value: curMet.temp },
          ],
        },
        {
          // AA pairs is the one row here that carries a VERDICT as well as a number, so it renders
          // the same badge the list row and the universe card do — from aaReadout, so the three can
          // never disagree. It used to print "2 / 10" with no verdict at all, which left the panel
          // stating a raw fraction while the row two sections down led with ✓ AA.
          title: 'Accessibility', rows: [
            { label: 'Max contrast', value: curMet.contrastMax.toFixed(1) + ':1' },
            { label: 'AA pairs', value: aaReadout(curMet).aaValueText, aa: aaReadout(curMet) },
          ],
        },
        {
          // "Reading" is the product's own word for the interpretation layer
          title: 'Reading', rows: [
            { label: 'Archetype', value: curMet.mood },
            // WHERE THE NAME CAME FROM. Naming is the one step that can leave the device: the live
            // reading posts a ~320px thumbnail and the hex values (buildInterpRequest) and nothing
            // else; the local composer sends nothing at all. /privacy has always said so, but the
            // footer that links it renders only on the dropzone screen — so on the screen where a
            // palette is actually named, the app said nothing. This row is that sentence, in the
            // readout's own label:value grammar rather than as a fresh surface.
            //
            // Four cases, and the first two are the reason this is not just `fallback`:
            //  · a shared palette was named on someone else's machine. Its decoded record carries
            //    no fallback, which validates to false — so without this branch it would claim a
            //    live reading that never happened here.
            //  · the eight bundled examples ship with authored names. Same false claim otherwise.
            //  · fallback === true is the honest flag: no live reading was applied, for any reason.
            // Known limit, left alone deliberately: a palette generated before the fallback flag
            // shipped also validates to false and reads as Live. There is no field to consult, and
            // inventing one to guess at history would be worse than the small inaccuracy.
            //
            // Every value is two words that survive the cell's text-transform:capitalize intact —
            // which is why it is not "From the link" or "Shared link".
            {
              label: 'Name from',
              value: s.sharedView ? 'Shared palette'
                : s.current.example === true ? 'Bundled example'
                  : s.current.fallback === true ? 'Local reading' : 'Live reading',
            },
          ],
        },
      ];
      // LEAD WITH USE. The recommendation takes the slot the poetic reading held, and the reading
      // goes behind More with the traits past the first two — the audit's "keep the poetic reading
      // and character tags secondary", and a NET REDUCTION in standing copy rather than a line
      // added on top of what was already there.
      //
      // ALL TRAITS, ALWAYS, AND NO DISCLOSURE OVER THEM. This used to show two and hide the rest
      // behind a More button that also carried the reading. composeDescriptors caps the list at
      // four (src/lib/reading.js), so at its very worst the control was hiding two short chips —
      // and at the common count of three it was hiding exactly one, which costs a press, a state,
      // a width animation and a second row of motion to save 40px of a row that had 400 to spare.
      // A disclosure has to hide enough to be worth opening; this one never could.
      const useLine = composeUse(analysePalette(s.current.swatches), curMet.aaState);
      const allTraits = s.current.descriptors || [];
      result = {
        name: s.current.name, rationale: s.current.rationale, descriptors: allTraits, bands,
        refImage: _ref, hasRef: _hasRef, noRef: !_hasRef, refImageNode, detailMeta,
        useLine,
        traits: allTraits, hasTraits: allTraits.length > 0,
      };
    }
    // palette-level copy affordances. palBtn / palBtnHover / palBtnActive lived here and are gone
    // (08.26) with the two standalone copy buttons they styled — the formats moved into a menu on a
    // single Copy control, and the styles were left behind exported but unrendered. copyPal stays:
    // the menu calls it.
    const copyPal = (kind) => { if (!s.current) return; if (kind === 'hex') this.copy(this.paletteHexList(s.current), 'pal-hex', 'Copied all ' + s.current.swatches.length + ' colours as a hex list'); else this.copy(this.paletteCss(s.current), 'pal-css', 'Copied palette as CSS custom properties'); };

    let procStatus = '';
    if (busy) { const STEPS = ['Reading light', 'Sampling the field', 'Clustering in OKLCH', 'Naming the mood']; procStatus = STEPS[Math.min(s.procStep, 3)] + '…'; }

    const curId = s.stage === 'result' && s.current ? s.current.id : null;
    // The card's spoken form. Its metrics grid is aria-hidden (it is the visual layer), so whatever
    // the card SHOWS has to be said here or it is said nowhere — and the card shows the same readout
    // the list row does. Same clause order as the row's aria, so moving between views does not
    // change the shape of the sentence.
    // THE VERDICT AND THE COUNT, in that order. This briefly spoke the count alone, on the reasoning
    // that the label WAS the count ("3+ AA text pairs: 5 of 10 pairs…" is the same fact twice). The
    // labels are answers again, so the two carry different information: the verdict is what the
    // badge shows, and the figure is what the badge cannot.
    const itemAria = (p, met) => 'Open ' + p.name + ' detail. Mood: ' + p.descriptors.join(', ')
      + '. Dominant hue ' + met.hue + ' degrees, ' + met.temp.toLowerCase()
      + '. Text usability: ' + A11Y_SPOKEN[met.aaState] + ', ' + met.aaPairs + ' of ' + met.totalPairs
      + ' colour pairs reach 4.5 to 1, maximum contrast ' + met.contrastMax.toFixed(1) + ' to 1'
      + '. Generated ' + this.relTime(p.time) + (p.id === curId ? '. Currently viewing' : '');

    // --- LIST view: canonical, one row each, keyboard-navigable ---
    const scopedAll = this.scopedFeed(s.feed);
    // pagination (list view only): per-page limit + clamped page window
    const pageSize = s.pageSize || 12;
    const pageCount = Math.max(1, Math.ceil(scopedAll.length / pageSize));
    const page = Math.min(s.page || 0, pageCount - 1);
    // Metrics once per palette, shared by the sort and by the row that renders them — paletteMetrics
    // walks every swatch PAIR, so computing it twice per palette per render is the one thing here
    // worth not doing. Sorting is applied for the list only: grid and reel have no column headers,
    // so reordering them would be an invisible change to an order nobody asked to change.
    const listRows = s.feedView === 'list'
      ? this.sortDecorated(scopedAll.map((p) => ({ p, met: this.paletteMetrics(p) })), s.sortKey, s.sortDir)
        .slice(page * pageSize, (page + 1) * pageSize)
      : [];
    const scoped = s.feedView === 'list' ? listRows.map((d) => d.p) : scopedAll;
    // A list row carries ONLY what recognition needs. The reference image, the large strip with
    // hex labels and the seven-metric readout all used to ride along here for the inline expansion;
    // that expansion is gone and the overview panel above is the single detail surface, so none of
    // that data is built per row any more. paletteMetrics still runs — the accessible name below
    // quotes it, and it is what a screen-reader user compares rows by.
    // Shared cell geometry: the header reads the SAME tokens (see AppView), which is what makes the
    // cells stack into a column. The accessibility cluster is LEFT-aligned so the badges — the
    // primary signal — stack into a clean rail; the varying-width raw text trails them.
    // Two unrelated measurements, two independent columns. AA pairs answers "how much of this
    // palette is usable for text"; max contrast answers "how far apart are its extremes". Sharing
    // one cell forced them into a stack that neither header could point at cleanly — each now owns
    // its own space, its own header label, and its own right edge down the list.
    //
    // Hierarchy by ink: the VALUES are the data and take full --on-surface; the header labels and
    // the demoted timestamp stay muted. The badge carries its own status tokens.
    // paddingRight matches the sort header's own 8px inset, so header text and value text share one
    // right edge while the header's hover tint still has room to breathe around its glyphs
    // Widths come from the grid track now (--row-grid), not from the cell: a cell that states its
    // own width inside a wider track sits at the track's START, which would have left every metric
    // hugging the left of its column while its header hugged the right.
    // The badge and its count are ONE reading — "no usable pairs", "two usable pairs" — so they
    // stay adjacent and the pair right-aligns as a unit. Pinning the badge to the column's left
    // edge was what kept it beside its number while the column was 104px wide; on a column that
    // takes a share of the row it would strand the badge a track away from the figure it grades.
    const aaCell = { display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', paddingRight: '0', whiteSpace: 'nowrap' };
    // 2ch of tabular figures: the count runs 0–10, and a cluster that changed width with the digit
    // would slide the badge left and right down the list — the one column where a wobble is most
    // visible, because the badges are a stack of identical glyphs.
    const metricValue = { minWidth: '2ch', textAlign: 'end', fontFamily: mono, fontSize: 'var(--fs-label)', letterSpacing: 'var(--track-flat)', textTransform: 'uppercase', color: 'var(--on-surface)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' };
    const contrastCell = { textAlign: 'end', paddingRight: '0', fontFamily: mono, fontSize: 'var(--fs-label)', letterSpacing: 'var(--track-flat)', textTransform: 'uppercase', color: 'var(--on-surface)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' };
    // The same inset as its neighbours — the difference is what it is measured against. For them
    // it is space before the next column; for this one there is no next column, so it pairs with
    // the row's own 8px to make the 16px margin the palette keeps on the other side. The stamp has
    // not moved a pixel; the 8 it used to leave to the row's padding it now holds itself, which is
    // what lets the sort header above it be a button rather than a column-wide slab.
    // 16px off the column line, matching the header chip above it. Inline rather than from the
    // stylesheet because this object also sets paddingRight, and an inline shorthand beats a rule —
    // which is exactly how the value ended up flush while the header sat inset.
    // No private inset any more: the row grid's own --row-inset padding is the 16px this cell used
    // to carry itself, back when it was the only edge of the row that kept one.
    const timeCell = { textAlign: 'end', fontFamily: mono, fontSize: 'var(--fs-micro)', letterSpacing: 'var(--track-flat)', textTransform: 'uppercase', color: 'var(--on-surface-muted)', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' };
    const listDecorated = s.feedView === 'list' ? listRows : scoped.map((p) => ({ p, met: this.paletteMetrics(p) }));
    const feedList = listDecorated.map(({ p, met }, rowIdx) => {
      const isCur = p.id === curId;
      return {
        // the column shows the absolute stamp (comparable down a sorted column); the relative form
        // rides along as the tooltip and stays in the accessible sentence below
        name: p.name, time: this.absTime(p.time), timeRel: this.relTime(p.time),
        // Tags recede: they repeat down the whole list, so as decoration they were spending the
        // row's flexible middle to say almost nothing. They stay present because the RARE one is
        // the informative one, and because they are the readable form of what the chips above
        // filter by.
        //
        // The de-emphasis is SIZE, not ink, and that is a constraint rather than a preference: a
        // descriptor is content (it is the palette's mood), so WCAG 1.4.3 wants 4.5:1 on it. The
        // muted token clears that — measured 5.55:1 on --surface, 7.17:1 in the dark theme
        // (03.08.26; an older note here claimed 6.06) — with limited headroom, so mixing it toward
        // the surface or wrapping it in opacity fails. The step down is 9 → 8.5px, an existing
        // scale step, and the ink stays on the token, at full alpha.
        //
        // Filter-in-context: each tag is a real button now (the row restructure makes that legal —
        // see AppView), applying itself through the SAME setActiveTag the facet panel uses. The tag
        // matching the active filter steps UP — full ink and medium weight, aria-pressed true — so
        // the filter's effect is legible in the rows themselves, by weight as well as colour.
        descriptorParts: p.descriptors.map((d) => {
          const key = d.toLowerCase(); const on = (s.activeTags || []).indexOf(key) >= 0;
          return { text: d, on, pressed: on ? 'true' : 'false', aria: (on ? 'Remove the ' + key + ' filter' : 'Filter to ' + key + ' palettes'), onClick: () => this.setActiveTag(key) };
        }),
        tagOff: { color: 'var(--on-surface-muted)', fontWeight: 400 },
        tagOn: { color: 'var(--on-surface)', fontWeight: 500 },
        // the tag buttons ride ABOVE the row's stretched activation surface; everything else is
        // reachable through it. data-ix="press" gives them the shared hover/press tint spectrum.
        // 4px/8px, not 3px/6px: the hover tint sat almost on the glyphs. Still well inside the
        // row's 24px content box, so --row-list-height is untouched.
        // 24px floor: WCAG 2.5.8's AA target baseline. The chip was 18px tall, and it repeats
      // thirty-odd times down a list, so it was the app's most-repeated undersized target.
      tagBtnBase: { position: 'relative', zIndex: 2, minHeight: '24px', fontFamily: 'Neue Montreal', fontSize: 'var(--fs-nano)', letterSpacing: 'var(--track-flat)', textTransform: 'uppercase', background: 'none', border: 0, padding: 'var(--btn-pad-chip)', margin: 0, cursor: busy ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' },
        // the row's one main action, stretched over the whole row: focus tints the row it covers
        onHitFocus: (e) => this.rowTintOn(e.currentTarget.closest('[data-row]')),
        onHitBlur: (e) => this.rowTintOff(e.currentTarget.closest('[data-row]')),
        current: isCur, ariaCurrent: isCur ? 'true' : undefined, curFlag: isCur ? '1' : '0', disabled: busy,
        // The accessibility cluster: the VERDICT leads (badge), the numbers follow (secondary).
        // The badge answers "can I set accessible text with this palette?" without asking the
        // reader to know what 4.5:1 means; the raw layer stays for whoever does. From aaReadout,
        // the same source the detail panel and the universe card read.
        ...aaReadout(met),
        // each column carries ONLY its own measurement: pairs here, ratio there
        contrastValueText: met.contrastMax.toFixed(1) + ':1',
        aaCell, metricValue, contrastCell, timeCell,
        aria: (isCur ? 'Currently viewing ' + p.name + '. ' : 'Load ' + p.name + ' into the result. ') + 'Mood: ' + p.descriptors.join(', ') + '. Dominant hue ' + met.hue + ' degrees, ' + met.temp.toLowerCase() + '. Text usability: ' + A11Y_SPOKEN[met.aaState] + ', ' + met.aaPairs + ' of ' + met.totalPairs + ' colour pairs reach 4.5 to 1, maximum contrast ' + met.contrastMax.toFixed(1) + ' to 1. Generated ' + this.relTime(p.time),
        onClick: (e) => { if (!busy) this.loadIntoResult(p, e && e.currentTarget); },
        onDelete: (e) => { if (e && e.stopPropagation) e.stopPropagation(); const wrap = e && e.currentTarget && e.currentTarget.closest('[data-row-wrap]'); this.deletePalette(p.id, wrap); },
        deleteAria: 'Delete ' + p.name,
        onAssign: (e) => { if (e && e.stopPropagation) e.stopPropagation(); this.openAssign(p); },
        // "Move" is left over from the single-slot model, where filing a palette in a second project
        // took it out of the first. Membership is a set now, and the row states where it already is
        // — the same sentence the overlay's control uses, so the two doors into one dialog describe
        // the same act.
        assignAria: this.palProjects(p).length
          ? 'Add ' + p.name + ' to another project, or remove it from one (currently in ' + this.palProjects(p).map((id) => this.projectName(id)).join(', ') + ')'
          : 'Add ' + p.name + ' to a project',
        isExample: p.example === true,
        projectLabel: this.palProjects(p).map((id) => this.projectName(id)).join(', '), hasProject: this.palProjects(p).length > 0,
        onEnter: (e) => this.rowTintOn(e.currentTarget),
        onLeave: (e) => this.rowTintOff(e.currentTarget),
        onFocus: (e) => this.rowTintOn(e.currentTarget),
        rowid: p.id,
        // The first row gives its top border up to the column header, which now closes with a
        // --line-strong rule of its own. Two rules a pixel apart read as one thick smudge, not as a
        // boundary — and it has to be decided HERE rather than in a stylesheet, because this border
        // is an inline style and no CSS rule can outrank it (see the note by --row-cell-inset).
        rowStyle: { position: 'relative', display: 'flex', flexDirection: 'column', width: '100%', textAlign: 'left', background: isCur ? 'var(--surface-white)' : 'var(--surface-raised)', border: '0', borderTop: rowIdx === 0 ? '0' : '1px solid var(--line)', padding: '0', margin: 0, cursor: busy ? 'not-allowed' : 'pointer', font: 'inherit', opacity: busy ? 0.45 : 1 },
        markerStyle: { position: 'absolute', left: '0', top: '0', bottom: '0', width: '3px', background: 'var(--on-surface)', opacity: isCur ? 1 : 0, pointerEvents: 'none', zIndex: 3 },
        restStrip: p.swatches.map((b) => ({ style: { flexGrow: w(b), flexBasis: 0, minWidth: 0, background: b.hex } })),
      };
    });

    // --- PALETTE UNIVERSE: one real, focusable tile per palette (the engine clones these to fill) ---
    // Box from the shared token, so the card and the field cell universe.js lays it out on cannot
    // disagree — see universeTile.js for why the height is the number it is.
    const UTW = UNIVERSE_TILE.W, UTH = UNIVERSE_TILE.H, HERO = 150;
    const cardBox = (isCur) => ({ position: 'absolute', top: '0', left: '0', width: UTW + 'px', height: UTH + 'px', display: 'block', textAlign: 'left', background: 'var(--surface-raised)', border: '1px solid var(--line)', padding: 0, margin: 0, cursor: 'pointer', font: 'inherit', overflow: 'hidden' });
    const feedNodes = scoped.map((p, idx) => {
      const isCur = p.id === curId;
      const hasImage = this.hasImg(p);
      const stops = this.paletteStops(p);   // weight-true, and the same stops the 3D card wears
      // SAME palette-card content model as the list row — identical data, stacked arrangement
      const met = this.paletteMetrics(p);
      const cardMetrics = [
        { label: 'Hue', text: met.hue + '°' },
        { label: 'Chroma', text: met.chroma.toFixed(3) },
        { label: 'Lightness', text: met.lMin + '–' + met.lMax + '%' },
        { label: 'Temp', text: met.temp },
        { label: 'Max contrast', text: met.contrastMax.toFixed(1) + ':1' },
        // the one metric carrying a verdict as well as a number — badge from the shared readout,
        // so the card says exactly what the row and the detail panel say
        { label: 'AA pairs', text: aaReadout(met).aaValueText, aa: aaReadout(met) },
        { label: 'Archetype', text: met.mood },
        // Eighth entry, and the one that squares the 2-column grid off at four full rows: the list
        // row ends on a date and the card had none, so the same palette was datable in one view and
        // not in the other. Absolute stamp, exactly as the row's column carries it.
        { label: 'Generated', text: this.absTime(p.time) },
      ];
      return {
        name: p.name, descriptors: p.descriptors.join('  ·  '), current: isCur, ariaCurrent: isCur ? 'true' : undefined,
        aria: itemAria(p, met),
        // The row's two identity labels, which the card was missing: EXAMPLE marks the seeded
        // palettes, and the current palette is named rather than only dotted. An unlabelled 7px
        // square asks the reader to already know what it means; the row spells it out, so the card
        // does too (and the square stays, so the state is never carried by the word alone).
        isExample: p.example === true,
        hasImage, noImage: !hasImage, refImage: this.dispUrl(p),
        cardMetrics,
        onClick: (e) => { if (this._uMoved) { this._uMoved = false; return; } if (!busy) this.openOverlay(p, e && e.currentTarget); },
        onEnter: (e) => this.stackEnter(e.currentTarget), onLeave: (e) => this.stackLeave(e.currentTarget),
        onFocus: (e) => { if (this._kbdInput) this.centerOnTile(e.currentTarget); this.stackEnter(e.currentTarget); },
        onBlur: (e) => this.stackLeave(e.currentTarget),
        tileAbs: cardBox(isCur),
        tileFlow: Object.assign(cardBox(isCur), { position: 'relative', width: '100%', background: isCur ? 'var(--surface-white)' : 'var(--surface-raised)' }),
        heroWrapStyle: { position: 'absolute', top: '0', left: '0', right: '0', height: HERO + 'px', overflow: 'hidden', background: 'var(--line)' },
        heroFallback: { position: 'absolute', inset: '0', background: 'linear-gradient(135deg, ' + stops + ')', backgroundSize: '220% 220%', animation: this._reduce ? 'none' : 'gradient-drift ' + (10 + (idx % 4)) + 's ease-in-out infinite', animationDelay: (idx * -2.1) + 's' },
        imgStyle: { width: '100%', height: '100%', display: 'block', backgroundImage: 'url(' + this.dispUrl(p) + ')', backgroundSize: 'cover', backgroundPosition: 'center' },
        heroFadeStyle: { display: 'none' },
        pbaseStyle: { position: 'absolute', left: '0', right: '0', top: (HERO - 16) + 'px', height: (UTH - HERO + 38) + 'px', background: isCur ? 'var(--surface-white)' : 'var(--surface-raised)', display: 'flex', flexDirection: 'column', boxShadow: '0 0px 0px rgba(0,0,0,0)', zIndex: 1, willChange: 'transform', borderTop: '1px solid ' + (isCur ? 'var(--on-surface)' : 'var(--line)') },
        // The block keeps its 8px rows: it was briefly tightened to 6 to stop the AA badge (taller
        // than a plain-text row) pushing the last row past the tile's bottom edge, but that was
        // treating a sizing problem as a spacing problem — the card was simply a row's worth too
        // short. The height now comes from the content (see universeTile.js) and the rhythm is back.
        //
        // The foot matches the sides. With no bottom padding the readout ran out of the card: 14px
        // of air to the left and right, 3px underneath. It now sits in an even frame. On the
        // engine tile the card is a fixed height and this padding is what that height reserves; on
        // the reduced-motion card, which grows to its content, this padding IS the foot.
        cardMetricsStyle: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', padding: '12px ' + UNIVERSE_TILE_INSET + 'px ' + UNIVERSE_TILE_INSET + 'px' },
        ringStyle: { position: 'absolute', inset: '0', boxShadow: 'none', opacity: 0, pointerEvents: 'none', zIndex: 3 },
        strip: p.swatches.map((b) => ({ style: { flexGrow: w(b), flexBasis: 0, minWidth: 0, background: b.hex } })),
      };
    });

    // --- fullscreen palette detail overlay (reuses the swatch-band value system) ---
    let overlay = null;
    if (s.overlay) {
      // s.overlay holds the palette the overlay was OPENED with — a snapshot taken at open time.
      // Every edit made from inside the overlay writes to feed instead (assignPalette maps over
      // st.feed), so the snapshot went stale the moment you used it: file a palette from the
      // overlay's own folder button and the button carried on reporting "Unfiled", because it was
      // reading a copy of the record from before the move. Re-resolve by id on every render so the
      // overlay reads the live record and reflects its own edits. The fallback covers the palette
      // being removed from the feed while open (delete closes the overlay, but not in the same tick).
      const p = s.feed.find((f) => f.id === s.overlay.id) || s.overlay;
      const on2 = this.onColor, N = p.swatches.length, tw2 = p.swatches.reduce((a, x) => a + x.weight, 0) || 1;
      const obands = p.swatches.map((b, i) => {
        const on = on2.call(this, b.hex);
        const fmt = this.swatchFormats(b.hex);
        const divCol = on === '#000000' ? 'rgba(0,0,0,.16)' : 'rgba(255,255,255,.24)';
        const hoverBg = on === '#000000' ? 'rgba(0,0,0,.10)' : 'rgba(255,255,255,.16)';
        const cavBorder = on === '#000000' ? 'rgba(0,0,0,.32)' : 'rgba(255,255,255,.42)';
        const values = ['hex', 'rgb', 'cmyk', 'hsl'].map((key) => {
          const f = fmt[key]; const copied = s.copied === 'ov-' + key + '-' + i;
          return {
            key, labelText: f.label, caveat: f.caveat, hasCaveat: !!f.caveat, copied, notCopied: !copied,
            display: copied ? 'Copied' : f.display,
            valueAnim: { display: 'inline-block', animation: (copied ? 'val-mask-a' : 'val-mask-b') + ' var(--dur-swap) var(--ease-entrance) both' },
            aria: 'Copy ' + f.label + ' value ' + f.copy + ' for swatch ' + (i + 1) + (f.caveat ? ', ' + f.caveat : ''),
            onCopy: () => this.copy(f.copy, 'ov-' + key + '-' + i, 'Copied ' + f.copy),
            rowStyle: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', width: '100%', background: 'transparent', border: 'none', borderTop: '1px solid ' + divCol, padding: '8px 14px', margin: 0, cursor: 'pointer', textAlign: 'left', color: on },
            rowHover: { background: hoverBg },
            colStyle: { display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0, flex: 1 },
            labelRowStyle: { display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 },
            labelStyle: this.monoLabel('var(--fs-nano)', '.14em', { color: on, opacity: 0.75, flex: 'none' }),
            caveatStyle: { fontFamily: mono, fontSize: 'var(--fs-nano)', letterSpacing: '.05em', textTransform: 'uppercase', color: on, opacity: 0.62, border: '1px solid ' + cavBorder, padding: '1px 4px', whiteSpace: 'nowrap', flex: 'none' },
            valueStyle: { fontFamily: mono, fontSize: 'var(--fs-detail)', letterSpacing: '.02em', color: on, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
            iconWrapStyle: { flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '14px', height: '14px', color: on, opacity: copied ? 1 : 0.5 },
          };
        });
        // The per-swatch SELECTION this band used to model is gone. It had no call site anywhere in
        // the view: overlaySelect was never invoked, so `sel` was permanently false, and the
        // "Current" tag, the selected ring and the corner select button were unreachable UI
        // pretending to be a feature, and leaving a dead one in place is how the next person ends
        // up wiring the wrong one.
        return {
          sid: typeof b.sid === 'number' ? b.sid : i,
          groupAria: 'Swatch ' + (i + 1) + ' of ' + N + ', ' + fmt.hex.display,
          weightPct: Math.round((b.weight / tw2) * 100) + '%',
          style: { position: 'relative', flexGrow: w(b), flexBasis: 0, minWidth: '210px', background: b.hex, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' },
          weightStyle: { fontFamily: mono, fontSize: 'var(--fs-label)', letterSpacing: '.06em', color: on, opacity: 0.72, padding: '16px 14px 0' },
          onHarmony: () => this.openHarmony(b.hex),
          harmonyAria: 'Colour harmonies for ' + fmt.hex.display,
          infoBtnStyle: { position: 'absolute', top: '12px', right: '12px', zIndex: 4, width: '26px', height: '26px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: '1px solid color-mix(in srgb, ' + on + ' 15%, transparent)', color: on, cursor: 'pointer', padding: 0 },
          valuesWrap: { display: 'flex', flexDirection: 'column', width: '100%' },
          values,
        };
      });
      overlay = {
        name: p.name, rationale: p.rationale, descriptors: p.descriptors, bands: obands,
        time: this.relTime(p.time), refImage: this.dispUrl(p), hasRef: this.hasImg(p),
        onDelete: () => this.deletePalette(p.id, null), deleteAria: 'Delete ' + p.name,
        // filed → the project's name; unfiled → the invitation. Same words the result view's row
        // uses, because it is now the same control in the same place on both surfaces.
        onAssign: () => this.openAssign(p),
        assignAria: this.palProjects(p).length ? 'Add ' + p.name + ' to another project, or remove it from one (currently in ' + this.palProjects(p).map((id) => this.projectName(id)).join(', ') + ')' : 'Add ' + p.name + ' to a project',
        // The state, then the project, so the button says where the palette IS and not only what
        // pressing it will do. A bare project name read as a filter; "Add to project" on a palette
        // already filed read as a second copy.
        // Always the same words. A palette can be in several projects now, so the button is never
        // reporting a single state — it is the way IN to the set, whatever the set already holds.
        assignLabel: 'Add to Project',
        // Which format was copied, drawn by the view on the trigger that was pressed.
        copyDone: s.copied === 'ov-pal-hex' ? 'Hex list' : s.copied === 'ov-pal-css' ? 'CSS variables' : '',
        /* THE SHEET STAYS UP AND THE ROW ANSWERS. Both of these used to close the surface and throw
           focus back to the trigger, which is what a MENU does — you pick, it goes away, and the
           button behind it tells you what happened. A dialog is not a menu: it is a place you are
           standing in, and taking it away is a poor way to say "done". The row you pressed reports
           instead (see CopyControl), so the confirmation is on the thing you acted on, you can take
           the other format without reopening anything, and focus stays where you left it. */
        copyHexList: () => this.copy(this.paletteHexList(p), 'ov-pal-hex', 'Copied all ' + p.swatches.length + ' colours as a hex list'),
        copyCss: () => this.copy(this.paletteCss(p), 'ov-pal-css', 'Copied palette as CSS custom properties'),
      };
    }

    // --- per-swatch colour harmonies (OKLCH-derived, gamut-mapped) ---
    // CHOOSE A MODEL, THEN USE IT. This was seven sections of equal weight, one under the next, and
    // the only thing you could do with any of them was copy a single hex — a long comparison surface
    // ending in no act. The seven are a selector now, one is shown at size, and the drawer carries a
    // whole-harmony destination.
    let harmony = null;
    if (s.harmony) {
      const baseHex = s.harmony.hex;
      const all = this.harmonyGroups(baseHex);
      const active = all.find((g) => g.id === s.harmonyModel) || all[0];
      const models = all.map((g) => {
        const on = g.id === active.id;
        return {
          id: g.id, label: g.name, active: on, pressed: on ? 'true' : 'false',
          aria: 'Show the ' + g.name.toLowerCase() + ' harmony, ' + g.cells.length + ' colours',
          onPick: () => this.setHarmonyModel(g.id),
          style: this.toggleStyle(on),
        };
      });
      const cells = active.cells.map((c, ci) => {
        const on = this.onColor(c.hex), copied = s.copied === 'hx-' + active.id + '-' + ci;
        return {
          hex: c.hex, display: copied ? 'Copied' : c.hex, isBase: c.base, mapped: c.mapped,
          // THE SOURCE IS NAMED. It was a 5px square in the corner with no legend anywhere — a mark
          // that can only be decoded by someone who already knows what it means.
          badge: c.base ? 'Source' : (c.mapped ? 'Mapped' : ''),
          aria: 'Copy ' + c.hex + (c.base ? ', the source colour' : '')
            + (c.mapped ? ', adjusted to fit sRGB' : ''),
          onCopy: () => this.copy(c.hex, 'hx-' + active.id + '-' + ci, 'Copied ' + c.hex),
          style: { flex: 1, minWidth: 0, height: '104px', background: c.hex, border: 'none', color: on, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'flex-start', gap: '6px', padding: '9px 10px', cursor: 'pointer', position: 'relative' },
          hover: { filter: this.lumHex(c.hex) < 0.08 ? 'brightness(1.35)' : 'brightness(0.88)' }, active: { filter: this.lumHex(c.hex) < 0.08 ? 'brightness(1.5)' : 'brightness(0.82)' },
          // Drawn in the swatch's own guaranteed-AA on-colour, so the label is legible on every
          // colour the harmony can produce rather than on most of them.
          badgeStyle: { fontFamily: mono, fontSize: 'var(--fs-nano)', letterSpacing: '.08em', textTransform: 'uppercase', color: on, border: '1px solid ' + (on === '#000000' ? 'rgba(0,0,0,.34)' : 'rgba(255,255,255,.46)'), padding: '1px 5px', whiteSpace: 'nowrap' },
          hexStyle: { fontFamily: mono, fontSize: 'var(--fs-micro)', letterSpacing: '.02em', color: on, whiteSpace: 'nowrap' },
        };
      });
      const mappedCount = active.cells.filter((c) => c.mapped).length;
      harmony = {
        hex: baseHex, models, cells,
        modelName: active.name,
        // The whole set, in the order it is shown, for the two actions below.
        hexList: active.cells.map((c) => c.hex),
        swatchStyle: { width: '26px', height: '26px', flex: 'none', background: baseHex, border: '1px solid var(--line-strong)' },
        // METHOD ON DEMAND. The mapping sentence led the drawer, which put implementation detail
        // above what the user can do here. It says something specific now — how many of THESE
        // colours were adjusted — which is the only form in which it is actionable.
        methodOpen: !!s.harmonyMethodOpen,
        methodLabel: 'How harmonies are calculated',
        methodAria: (s.harmonyMethodOpen ? 'Hide' : 'Show') + ' how harmonies are calculated',
        toggleMethod: () => this.toggleHarmonyMethod(),
        methodLines: [
          'Every colour is the source rotated around the hue circle in OKLCH, at the same lightness and chroma. Shades hold hue and chroma and step lightness instead.',
          mappedCount
            ? (mappedCount === 1 ? 'One colour in this harmony sits outside sRGB, so its chroma was reduced until it fits. It is marked Mapped.' : mappedCount + ' colours in this harmony sit outside sRGB, so their chroma was reduced until they fit. They are marked Mapped.')
            : 'Every colour in this harmony fits inside sRGB, so none of them was adjusted.',
        ],
        // SAVE AS A PALETTE — the act the drawer was missing. It mints a new library record rather
        // than overwriting the palette the source swatch came from: that palette is content-addressed
        // to a photograph and carries its own roles, and a harmony is a different object.
        onUse: () => this.useHarmonyAsPalette(),
        useAria: 'Save this ' + active.name.toLowerCase() + ' harmony as a new palette in your library, ' + active.cells.length + ' colours',
        onCopyAll: () => this.copy(active.cells.map((c) => c.hex).join('\n'), 'hx-all', 'Copied all ' + active.cells.length + ' colours as a hex list'),
        copyAllLabel: s.copied === 'hx-all' ? 'Copied' : 'Copy Harmony',
        copyAllAria: 'Copy all ' + active.cells.length + ' colours in this harmony as a hex list',
      };
    }

    // --- token export dialog ---
    /* ONE DIALOG, TWO SCOPES. It writes either a palette or a whole project, and everything below
       the header is identical between them — the same five formats, the same semantic toggle, the
       same wording about what a scaffold is. Only the subject changes, so only the subject is
       branched: a second dialog for folders would have meant two places to keep the format list
       right, and would have taught people that exporting a folder is a different act. It is not. */
    /* STADIUMS, LIKE EVERY OTHER ROW YOU PICK. The same object as the assign dialog's project rows
       — a full-width bordered row with a name at one end and its kind at the other — rounded the
       same way, with the same inset correction: 14px of horizontal padding put "Tailwind v4"
       against the widest point of a 21px arc, so it goes to 18. The raised plate stays, because a
       row you choose from is not the sheet it sits on.
       HOISTED OUT OF exportView because the copy dialog wears it too. Copy stopped being a dropdown
       and became the same surface as Export, and "the same surface" has to mean one style object
       rather than two that currently agree. */
    const itemBase = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', width: '100%', textAlign: 'left', background: 'var(--surface-raised)', borderRadius: 'var(--radius-pill)', border: '1px solid var(--line)', padding: '12px 18px', cursor: 'pointer', font: 'inherit', color: 'var(--on-surface)' };

    let exportView = null;
    if (s.exportOpen && (s.exportPalette || s.exportProject)) {
      const semantic = !!s.exportSemantic;
      const p = s.exportPalette;
      const pid = p ? null : s.exportProject;
      const pals = pid ? this.projectPalettes(pid) : [p];
      const n = pals.length;
      const colours = pals.reduce((a, x) => a + (semantic ? 6 : x.swatches.length), 0);
const mk = (id, label, ext) => ({ label, ext, onPick: () => (pid ? this.doProjectExport(pid, id, semantic) : this.doExport(p, id, semantic)), onEnter: (e) => this.rowTintOn(e.currentTarget), onLeave: (e) => this.rowTintOff(e.currentTarget), onFocus: (e) => this.rowTintOn(e.currentTarget), onBlur: (e) => this.rowTintOff(e.currentTarget), style: itemBase, extStyle: { fontFamily: mono, fontSize: 'var(--fs-micro)', letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--on-surface-muted)', flex: 'none' }, labelStyle: { fontFamily: 'Neue Montreal', fontSize: 'var(--fs-body)', color: 'var(--on-surface)' } });
      exportView = {
        name: pid ? this.projectName(pid) : p.name,
        kicker: pid ? 'Export project' : 'Export tokens',
        stacked: !!pid,   // opened from the library panel's Projects tab, so it renders above it
        // WHAT THE FILE WILL HOLD, before a format is chosen. A folder export is the one act here
        // whose scale is not obvious from the thing you pressed, and "8 palettes, 40 colours, one
        // file" is the sentence that stops someone expecting eight downloads.
        scopeLine: pid
          ? n + ' palette' + (n === 1 ? '' : 's') + ' · ' + colours + ' colour' + (colours === 1 ? '' : 's') + ' · one file'
          : null,
        aria: pid
          ? 'Export the project ' + this.projectName(pid) + ' as design tokens, ' + n + ' palette' + (n === 1 ? '' : 's') + ' in one file'
          : 'Export ' + p.name + ' as design tokens',
        semanticOn: semantic, semanticChecked: semantic ? 'true' : 'false',
        layerLabel: semantic
          ? 'Exporting the semantic scaffold' + (pid ? ', six roles per palette' : '') + '. Refine before shipping.'
          : 'Exporting the primitive layer (swatches by weight)' + (pid ? ', grouped by palette' : '') + '.',
        formats: [
          mk('tailwind', 'Tailwind v4', '@theme · css'),
          mk('tokens', 'Design tokens (W3C)', 'json'),
          mk('figma', 'Figma variables', 'json'),
          mk('css', 'CSS custom properties', 'css'),
          mk('ase', 'Adobe swatches', 'ase'),
        ],
        toggleTrackStyle: { position: 'relative', display: 'inline-block', width: '34px', height: '18px', flex: 'none', background: semantic ? 'var(--on-surface)' : 'var(--line-strong)', transition: 'background var(--dur-fast) var(--ease-standard)', cursor: 'pointer' },
        toggleDotStyle: { position: 'absolute', left: '2px', top: '2px', width: '14px', height: '14px', background: 'var(--surface)', transform: semantic ? 'translateX(16px)' : 'translateX(0px)', transition: 'transform var(--dur-fast) var(--ease-standard)' },
        semanticTrackBg: semantic ? 'var(--on-surface)' : 'var(--line-strong)',
        semanticDotX: semantic ? 'translateX(14px)' : 'translateX(0px)',
        semanticLabel: semantic ? 'On' : 'Off',
      };
    }

    // --- projects: filter chips + assign/manage dialog data ---
    // SENTENCE CASE, AND ONE SIZE FOR THE WHOLE LIBRARY BAR.
    // These were 10px uppercase, which is the app's label voice — right for a CTA of two words,
    // wrong for a bar of eight controls someone has to scan and tell apart. Uppercase removes the
    // word-shape the eye actually reads, and at 10px it was doing that to "Unfiled", "Manage",
    // "Max contrast" and "Clear filters" all at once. 12px sentence case is the same optical size
    // and a readable word. Applied to this section's chrome only — the rest of the app's labels are
    // single acts, not a scan surface. AA and 3D stay uppercase because they are initialisms.
    // The scope chips ARE view-toggle options — same segmented control, same states — and were a
    // hand-copy of that builder down to a truncated transition that left their background tint
    // cutting. Only the row layout differs, so only the row layout is stated.
    const chipStyle = (active) => this.viewToggleOptStyle(active, { whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '7px', maxWidth: '100%' });
    /* ONE NAME CANNOT TAKE THE WHOLE ROW. A project name may be 60 characters, and at 10px that is
       a 294px chip — two of them and the scope group is 693px wide before All and Unfiled have had
       a turn. The cap is stated in `ch` rather than px so it stays a CHARACTER budget: it tracks
       --fs-label if that token ever moves, which a pixel value would not.
       Truncation hides content, so the full name stays reachable two ways — the aria-label has
       always carried it, and `title` now carries it for a pointer. */
    const CHIP_CHARS = 26;
    const labelStyle = { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0, maxWidth: CHIP_CHARS + 'ch' };
    // No opacity on the counts. 0.7 over the muted token multiplied two de-emphases: muted ink
    // clears 4.5:1 with little headroom, and the alpha pushed the 9px numerals well under it
    // (WCAG 1.4.3 — a count is content, not decoration). The step down from the label is carried
    // by SIZE alone (12 → 9), which was already doing the work.
    // flex:none so the ellipsis eats the NAME and never the number: a scope chip whose count has
    // been truncated away is a chip that has stopped saying the one thing only it can say.
    const countStyle = (active) => ({ fontFamily: mono, fontSize: 'var(--fs-micro)', color: active ? 'var(--surface)' : 'var(--on-surface-muted)', fontVariantNumeric: 'tabular-nums', flex: 'none' });
    /* NATIVE FOCUS, LEFT ALONE — and that is the whole point of this handler being a recorder
       rather than a preventDefault.

       The chip must not take a focus RING on a mouse click. It carries data-focus="chrome", which is
       3px of --on-surface at a 3px offset over a 3px --surface shadow; the group clips vertically, so
       all that survives of that ring is its left and right segments, and they arrive as two black
       bars flanking the selected chip with a pale gap inside them. The browser gets this right on
       its own: a genuine mouse click does not match :focus-visible. Every attempt to take focus by
       hand does — preventDefault plus focus() from the click handler, and equally from the mousedown
       handler; both were measured resolving :focus-visible to true. There is no programmatic focus
       that Chrome will attribute to a pointer, so the only correct move is not to make one.

       That leaves the scroll jump the preventDefault was there to stop: focus makes the browser
       scroll the group the minimum needed to expose the chip — 368px, instantly — and the reveal
       tween then eased backward to its peek position, which read as an overshoot correcting itself.
       So the press records where the row was BEFORE focus touched it, and _revealProjChip winds it
       back to that value before tweening. Both happen inside the focus event, ahead of the next
       paint, so the browser's jump is never seen and the row makes one movement on one curve.

       onFocus carries the reveal for BOTH routes, which is what puts the keyboard on equal footing
       rather than leaving it to the browser — measured, the browser leaves a clipped chip clipped.
       On the pointer route it fires before the click that selects, so by the time setActiveProject
       calls the reveal again the chip is already in place and that second call returns doing
       nothing. */
    const mkChip = (id, label) => { const active = s.activeProject === id; const count = (id === null) ? s.feed.length : (id === '__unfiled__') ? s.feed.filter((p) => this.palProjects(p).length === 0).length : s.feed.filter((p) => this.inProject(p, id)).length; return { key: String(id), label, count: String(count), active, chipStyle: chipStyle(active), labelStyle, countStyle: countStyle(active), onMouseDown: () => this._holdProjScroll(), onFocus: (e) => this._revealProjChip(e.currentTarget), onClick: () => this.setActiveProject(id), aria: 'Show ' + label + ', ' + count + ' palette' + (count === 1 ? '' : 's') + (active ? ' (current filter)' : ''), title: label.length > CHIP_CHARS ? label : undefined }; };
    // Zero-result suppression on the project scopes: a scope whose count is 0 leads nowhere, so it
    // is not offered — EXCEPT the scope currently active (it must stay on screen to be left) and
    // All, which is the home scope, not a filter. Unfiled follows the same rule as real projects.
    const projCount = (id) => (id === null) ? s.feed.length : (id === '__unfiled__') ? s.feed.filter((p) => this.palProjects(p).length === 0).length : s.feed.filter((p) => this.inProject(p, id)).length;
    const projectChips = [
      mkChip(null, 'All'),
      ...((projCount('__unfiled__') > 0 || s.activeProject === '__unfiled__') ? [mkChip('__unfiled__', 'Unfiled')] : []),
      ...s.projects.filter((pr) => projCount(pr.id) > 0 || s.activeProject === pr.id).map((pr) => mkChip(pr.id, pr.name)),
    ];
    const hasProjects = s.projects.length > 0;

    // --- the tag facet: an OPEN vocabulary behind one disclosure, searched rather than enumerated ---
    // Counted over the project axis only, so the panel does not shrink to the tag you just picked.
    // Every count here is ≥1 by construction — a tag only exists because a palette in scope carries
    // it — so zero-result entries cannot appear. The one cut kept from the enumerated bar: a tag on
    // EVERY palette in scope partitions nothing ("WARM on every row") and is suppressed. Singletons
    // are listed now — behind search they cost nothing and are how a rare mood is found.
    const tagPool = this.projectFeed(s.feed);
    const activeTags = s.activeTags || [];
    const activeA11y = s.activeA11y || [];

    /* WHICH HALF OF THE LIBRARY PANEL IS SHOWING — resolved here, once, because two things read it
       long before the panel does: manageView below is only worth building when the Projects tab is
       up, and the tab strip itself has to agree with whatever the body renders.

       NULL MEANS "NOT CHOSEN YET", and that is what makes the default answerable. `libraryTab` is
       null until the reader presses a tab, and stays null across the panel's close (see
       _finishTagClose), so an unchosen panel can open where the work actually is: Filter normally,
       Projects when there is nothing to filter — a library with no palettes in it has no traits to
       narrow by, and opening onto an empty facet list while the only available act sits one tab
       over would be a default chosen for tidiness.
       A PRESS IS ALWAYS OBEYED, which is the other half of it. The reader can still walk to the
       empty Filter tab and be told, in words, why it is empty; a tab that silently refuses the
       press is a dead control, and this file's own rule is that a control which cannot act says so.
       Everything downstream — the pressed state, the pill's position, the announcement — reads this
       and not the raw flag, so the strip can never disagree with the body under it. */
    const canFilter = tagPool.length > 0 || activeTags.length > 0 || activeA11y.length > 0;
    const libTab = s.libraryTab || (canFilter ? 'filter' : 'projects');
    const tagCounts = new Map();
    tagPool.forEach((p) => { new Set(p.descriptors.map((d) => d.toLowerCase())).forEach((d) => tagCounts.set(d, (tagCounts.get(d) || 0) + 1)); });
    // Tags combine with AND, so every count shown is the count YOU WOULD GET — the size of the
    // current result set narrowed by that tag, not the tag's standalone total. That keeps the
    // Phase 4.5 promise intact under multi-select: an option that would empty the list has no
    // information scent, so it is not offered at all. Selected tags always stay listed (they are
    // how you get back out), and a tag on every remaining palette is dropped for the old reason —
    // it partitions nothing.
    // Each group counts against the OTHER groups' filters but not its own — the standard faceted
    // convention. Counting a group against itself would make every unselected option read zero the
    // moment you picked something in that group.
    const activeLight = s.activeLight || [], activeTemp = s.activeTemp || [];
    // Each group counts against the OTHER groups but never against itself — the standard faceted
    // convention. `measBase` is what the two measured groups count within.
    const others = (skip) => tagPool.filter((p) =>
      (skip === 'tags' || this.matchesTags(p, activeTags))
      && (skip === 'a11y' || this.matchesA11y(p, activeA11y))
      && (skip === 'light' || this.matchesLight(p, activeLight))
      && (skip === 'temp' || this.matchesTemp(p, activeTemp)));
    const tagBase = others('tags');
    const a11yBase = others('a11y');
    const withTag = (d) => tagBase.filter((p) => p.descriptors.some((x) => x.toLowerCase() === d));
    // Two different facts were being answered with the same silence. A tag that would empty the
    // list and a tag that is true of EVERYTHING here are both unpickable, but they mean opposite
    // things, and hiding both taught the user nothing either time. Zero stays hidden: an option
    // that leads nowhere is noise, and its absence costs nothing because it was never true of
    // anything you can see. Universal is now SHOWN and disabled, because "every palette here is
    // warm" is a real description of the current view — arguably the most useful sentence the
    // panel can say — and silently dropping it made the vocabulary look smaller than it is and
    // left tags vanishing for no stated reason.
    const universalTag = (d) => activeTags.indexOf(d) < 0 && tagBase.length > 0 && withTag(d).length === tagBase.length;
    const facetQuery = (s.tagQuery || '').trim().toLowerCase();
    const facetRanked = [...tagCounts.keys()]
      .filter((d) => activeTags.indexOf(d) >= 0 || withTag(d).length > 0)
      .filter((d) => !facetQuery || d.indexOf(facetQuery) >= 0)
      // count-first for discovery, A–Z for known-item lookup; count order keeps the alphabetical
      // tiebreak so equal-sized tags never shuffle between renders. Universal tags sort last in
      // both orders: they describe the view but cannot act on it, so they must not head a list
      // whose purpose is choosing — their count is the maximum, so they would otherwise sort first.
      .sort((a, b) => (universalTag(a) - universalTag(b)) || (s.tagSort === 'alpha' ? 0 : withTag(b).length - withTag(a).length) || a.localeCompare(b))
      .map((d) => {
        const active = activeTags.indexOf(d) >= 0;
        const count = active ? tagBase.length : withTag(d).length;
        // The strip shows ONE member palette, drawn the way the archive draws it, and the row names
        // which one. It used to pool every swatch of every member and sample that by lightness —
        // and that pooling destroyed the very properties most tags name. Half the taxonomy's
        // dimensions (hue, contrast, dominance) are relations WITHIN a palette, so a set assembled
        // ACROSS members is a synthetic object that satisfies no tag's definition. Measured: the
        // seven MONOCHROME palettes each span ≤28° of hue, inside the mono bucket's [0,30); their
        // pooled swatches span 47°, which this app's own resolver calls 'analogous'. The strip
        // labelled MONOCHROME was, by our own numbers, not monochrome. No sampling rule fixes that;
        // only showing a real member does, because a member satisfies the predicate by definition.
        const exemplar = (() => {
          const mem = tagPool.filter((p) => p.descriptors.some((x) => x.toLowerCase() === d));
          if (!mem.length) return null;
          // The most TYPICAL member: each palette's area-weighted centre in OKLab, then the member
          // nearest the tag's own centre. Deterministic, needs no per-tag knowledge (so it works
          // the same for a computed facet and for an interpretive word), and because two tags have
          // different member sets they usually resolve to different exemplars on their own.
          const mid = (p) => { let L = 0, a = 0, b = 0, t = 0; p.swatches.forEach((x) => { const q = x.weight || 1; L += x.L * q; a += x.a * q; b += x.b * q; t += q; }); return t ? [L / t, a / t, b / t] : [0, 0, 0]; };
          const cs = mem.map(mid);
          const c0 = cs.reduce((m, c) => [m[0] + c[0] / cs.length, m[1] + c[1] / cs.length, m[2] + c[2] / cs.length], [0, 0, 0]);
          let best = 0, bd = Infinity;
          cs.forEach((c, i) => { const dd = (c[0] - c0[0]) ** 2 + (c[1] - c0[1]) ** 2 + (c[2] - c0[2]) ** 2; if (dd < bd) { bd = dd; best = i; } });
          return mem[best];
        })();
        // Area-weighted, the same value shape the archive card's strip uses, so one palette renders
        // identically wherever it appears — and so the dominance dimension reads truthfully too,
        // which equal-width sampling flattened away.
        const strip = exemplar ? exemplar.swatches.map((b) => ({ style: { flexGrow: w(b), flexBasis: 0, minWidth: 0, background: b.hex } })) : [];
        // Named at EVERY count, not just at one or two members (F4). The name was previously
        // conditional, so a row's anatomy changed with its size — the same column held information
        // on some rows and nothing on others, and you could not tell which kind of row you were
        // reading until you had read it. It also now has a second job: it says WHICH palette the
        // strip is, so the strip cannot be misread as a summary of all members. Two tags that
        // resolve to the same exemplar therefore repeat honestly rather than puzzlingly.
        const exemplarName = exemplar ? exemplar.name : '';
        // A disabled row must say WHY, and must not say it in colour alone. The reason takes the
        // flexible text column: on a row you cannot pick, why-it-is-inert outranks the name of a
        // sample you cannot select. Anatomy is unchanged either way — same five slots, one state.
        const disabled = universalTag(d);
        return {
          key: d, label: d, count: String(count), active, pressed: active ? 'true' : 'false',
          strip, exemplarName, disabled,
          reason: disabled ? 'on every palette here' : '',
          aria: disabled
            ? d + ' is on every one of these ' + count + ' palettes, so it cannot narrow them further'
            : (active ? 'Remove the ' + d + ' filter' : (activeTags.length ? 'Narrow to ' + d + ' as well' : 'Filter to ' + d + ' palettes'))
              + ', ' + count + ' palette' + (count === 1 ? '' : 's') + (exemplarName ? ', for example ' + exemplarName : ''),
          // applying does NOT close the drawer: the list re-filters live behind it, so the drawer
          // works like the contrast lens toggles — a place to try slices, not a one-shot picker
          onPick: disabled ? () => {} : () => this.setActiveTag(d),
        };
      });
    // SIX, THEN THE REST. The list is the interpretive layer and it was the tallest thing in the
    // panel — three measured groups of three rows each, then twenty of these, which ranks by height
    // the exact way the Character disclosure exists to avoid.
    //
    // The cut is off the ranked order, so it is the six most useful under whichever sort is on. Two
    // things are never cut: a SELECTED trait (it is how you get back out, and hiding it would strand
    // a chip with no row) and a search result set (you asked for those by name, and a search that
    // silently truncates is a search that lies).
    const FACET_LEAD = 6;
    const facetCut = !s.facetAllOpen && !facetQuery && facetRanked.length > FACET_LEAD;
    const facetOptions = facetCut
      ? facetRanked.filter((o, i) => i < FACET_LEAD || o.active)
      : facetRanked;
    const facetHidden = facetRanked.length - facetOptions.length;
    // One removable chip per selected tag, in the order they were picked, so the narrowing reads as
    // a sentence you can dismantle from either end. The count on the LAST chip is the live result
    // size; earlier chips show what the selection was worth at that point, which is why only the
    // final one carries a number — two numbers that mean different things is worse than one.
    const focusFacetBtn = () => requestAnimationFrame(() => { const b = document.querySelector('[data-library-btn]'); if (b) try { b.focus(); } catch (e) { } });
    // Chips for BOTH groups, accessibility first so the chip order matches the panel's group order.
    // Only the final chip carries the live result count — two numbers meaning different things
    // beside each other is worse than one.
    const appliedRaw = activeA11y.map((v) => ({
      key: 'a11y:' + v, label: A11Y_LABEL[v],
      aria: 'Remove the ' + A11Y_SPOKEN[v] + ' text usability filter',
      onRemove: () => { this.setA11yFilter(v); focusFacetBtn(); },
    })).concat(MEAS_CHIPS(this, s, focusFacetBtn)).concat(activeTags.map((t) => ({
      key: 'tag:' + t, label: t,
      aria: 'Remove the ' + t + ' filter',
      onRemove: () => { this.setActiveTag(t); focusFacetBtn(); },
    })));
    const scopedNow = this.scopedFeed(s.feed).length;
    // NO COUNT ON THE CHIP. The last chip used to carry the live result size, which was the only
    // place the result size was stated — so it had to be somewhere. It is now its own sentence on
    // the filter row ("Showing 5 of 8 palettes"), and a chip reading "Text-ready 5" beside a line
    // reading "Showing 5 of 8" is the same number twice, once without its denominator. A chip's
    // whole job here is to name one narrowing and offer to remove it.
    const appliedTags = appliedRaw;

    // ---- THE MEASURED FACETS ----------------------------------------------------------------
    // Three groups that MEASURE a palette, kept apart from the ones that INTERPRET it. Contrast
    // potential, lightness and temperature are computed from the pixels; Graphic, Restrained and
    // Stark are readings. Ranked as equals they invited the user to treat a judgement as a
    // property, so the readings now sit behind Character, one disclosure down.
    //
    // Stable ids, separate from display labels, and one table rather than three hand-written
    // groups: the value written into state is `dark`, never `Dark`, so a label can be reworded in
    // any language without orphaning every filter anyone had applied.
    const MEASURED = [
      { id: 'lightness', key: 'activeLight', label: 'Lightness', pick: (m) => m.lightBand,
        values: [{ id: 'dark', label: 'Dark' }, { id: 'balanced', label: 'Balanced' }, { id: 'light', label: 'Light' }] },
      { id: 'temperature', key: 'activeTemp', label: 'Temperature', pick: (m) => m.temp.toLowerCase(),
        values: [{ id: 'warm', label: 'Warm' }, { id: 'cool', label: 'Cool' }, { id: 'neutral', label: 'Neutral' }] },
    ];
    const measuredGroups = MEASURED.map((g) => {
      const base = others(g.id === 'lightness' ? 'light' : 'temp');
      const active = s[g.key] || [];
      const options = g.values.map((v) => {
        const n = base.filter((p) => g.pick(this.paletteMetrics(p)) === v.id).length;
        const on = active.indexOf(v.id) >= 0;
        const disabled = !on && n > 0 && n === base.length;
        return {
          key: v.id, label: v.label, count: String(n), active: on, pressed: on ? 'true' : 'false',
          disabled, reason: disabled ? 'Every palette here' : '',
          aria: (on ? 'Remove the ' : 'Show only ') + v.label.toLowerCase() + ' palettes, ' + n + ' of them',
          onToggle: () => this.setFacet(g.key, v.id),
        };
      }).filter((o) => o.active || parseInt(o.count, 10) > 0);
      return { id: g.id, label: g.label, options, has: options.length > 0 };
    }).filter((g) => g.has);

    // ---- the Text usability facet: OR within the group, exhaustive over the archive ----
    // Ordered most-capable first, which is the order anyone shopping for a usable palette wants.
    // Zero-result suppression applies as it does to tags: a state nothing has is not offered,
    // unless it is already selected (it must stay reachable to be removed).
    // The universal case reaches this group too, and matters more here than in tags: because the
    // bands partition the archive, "every palette here is Limited Text" can be the whole truth about
    // a view. Suppressed, it left one lone checkbox that did nothing and no clue why; stated, it
    // answers the question the group exists to answer without the user having to click.
    const a11yOptions = ['flexible', 'limited', 'none'].map((v) => {
      const n = a11yBase.filter((p) => this.paletteMetrics(p).aaState === v).length;
      const active = activeA11y.indexOf(v) >= 0;
      const disabled = !active && n > 0 && n === a11yBase.length;
      return {
        key: v, label: A11Y_LABEL[v], count: String(n), active, pressed: active ? 'true' : 'false',
        // The definition rides on the row itself — as its title for a pointer, and on the end of its
        // accessible name for everyone else. These labels are answers rather than measurements, so
        // "Limited Text" has to be able to say what it means without the reader going looking; and
        // it must not do so in a standing line under every row, which is the column of clipped
        // fragments this group was built to get rid of.
        title: A11Y_DEFINITION[v],
        // The reason is a different fact and survives alongside it: not what this band means, but
        // why THIS row cannot be picked, which is true of one row at a time and only sometimes.
        disabled, reason: disabled ? 'Every palette here' : '',
        aria: (disabled
          ? 'All ' + n + ' of these palettes are ' + A11Y_SPOKEN[v] + ', so this cannot narrow them further'
          : (active ? 'Remove the ' : 'Filter to ') + A11Y_SPOKEN[v] + ' palettes, ' + n + ' of them')
          + '. ' + A11Y_DEFINITION[v],
        onPick: disabled ? () => {} : () => this.setA11yFilter(v),
        show: n > 0 || active,
      };
    }).filter((o) => o.show);

    let assignView = null;
    if (s.assignPalette) {
      const pal = s.assignPalette;
      const optStyle = (cur) => ({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', width: '100%', textAlign: 'left', background: 'var(--surface-raised)', borderRadius: 'var(--radius-pill)', border: '1px solid ' + (cur ? 'var(--on-surface)' : 'var(--line)'), padding: '11px 18px', cursor: 'pointer', font: 'inherit', color: 'var(--on-surface)' });
      /* STADIUMS, AND THE INSET THAT GOES WITH THEM. The rows were bordered rectangles in a dialog
         whose every other control had already rounded; --radius-pill clamps to half their 40px
         height, so the corner is a true stadium end. 14px of horizontal padding then put "Unfiled"
         against the widest point of a 20px arc, so it goes to 18 — the same correction the fields
         and the toast each needed. The raised plate stays: these are rows you pick, not a surface
         you type into, and the plate is what tells them apart from the sheet they sit on.
         Each row is a membership toggle now, not one choice among many. `current` still drives the
         mark, but it means "is in this project" rather than "is THE project", and Unfiled is
         current only when the set is empty — it is the absence of membership, not a member. */
      const live = s.feed.find((f) => f.id === pal.id) || pal;
      const memberOf = this.palProjects(live).map((id) => this.projectName(id));
      /* THE MARK IS A WORD AND A TICK, not a 6px dot. The dot said "current" to whoever already knew
         the convention and nothing at all to anyone else — and it flipped between opacity 0 and 1
         with no transition, so the one piece of feedback the dialog gave arrived as a pop, which
         this app's own contract reads as a rendering fault rather than a response.
         `Added` is stated in words beside the tick because a tick alone is a colourless icon
         carrying the whole state of the row (SC 1.4.1), and it eases in on the chrome band like
         every other state change here. */
      const mkOpt = (id, label) => {
        const cur = id === null ? this.palProjects(live).length === 0 : this.inProject(live, id);
        return {
          key: String(id), label, current: cur, checked: cur ? 'true' : 'false',
          markStyle: {
            display: 'inline-flex', alignItems: 'center', gap: '5px', flex: 'none',
            fontFamily: 'Neue Montreal', fontSize: 'var(--fs-micro)', letterSpacing: 'var(--track-flat)',
            textTransform: 'uppercase', color: 'var(--on-surface)',
            opacity: cur ? 1 : 0, transform: cur ? 'translateX(0)' : 'translateX(4px)',
            transition: this._reduce ? 'none' : 'opacity var(--dur-chrome) var(--ease-standard),transform var(--dur-chrome) var(--ease-standard)',
          },
          // Unfiled is not a membership, so it never reads as one. "Added" on the row that means
          // "belong to nothing" would be a contradiction; the tick there says this is already where
          // the palette stands, which is also why pressing it would do nothing.
          markLabel: id === null ? 'Current' : 'Added',
          style: optStyle(cur), onEnter: (e) => this.rowTintOn(e.currentTarget), onLeave: (e) => this.rowTintOff(e.currentTarget), onFocus: (e) => this.rowTintOn(e.currentTarget), onBlur: (e) => this.rowTintOff(e.currentTarget), onPick: () => this.pickAssign(id),
          aria: (id === null ? 'Remove ' + pal.name + ' from every project' : (cur ? 'Remove ' + pal.name + ' from ' + label : 'Add ' + pal.name + ' to ' + label)),
        };
      };
      assignView = {
        name: pal.name, options: [mkOpt(null, 'Unfiled'), ...s.projects.map((pr) => mkOpt(pr.id, pr.name))],
        /* WHERE THIS PALETTE IS, RIGHT NOW, in one line under its name — the standing answer the
           dialog was missing. A toggle tells you what a press DID; this tells you what is true, so
           someone who has ticked three rows and lost track can read the result instead of
           reconstructing it from the marks. It is a live region as well, because the sentence
           changes underneath a screen reader that has already passed it. */
        memberLine: memberOf.length
          ? 'In ' + (memberOf.length === 1 ? memberOf[0] : memberOf.slice(0, -1).join(', ') + ' and ' + memberOf[memberOf.length - 1])
          : 'Not in any project yet',
        /* The act is two things at once and the button is a glyph, so the name says both: it creates
           the project AND files this palette in it. It LEADS with the same two words the library
           panel's own create button uses — "Create project" — because it is the same act with one
           more consequence, and a reader who meets it in both places should not have to work out
           that Add and Create are the same verb. The title is the bare verb for a pointer; the
           sentence is for a screen reader. */
        createAria: 'Create project and add ' + pal.name + ' to it',
        onCreate: (e) => { const inp = document.querySelector('[data-assign-new]'); const v = inp ? inp.value : ''; if (v && v.trim()) { this.newProjectAndAssign(v.trim()); } },
        onCreateKey: (e) => { if (e.key === 'Enter') { e.preventDefault(); const v = e.currentTarget.value; if (v && v.trim()) this.newProjectAndAssign(v.trim()); } },
      };
    }

    /* BUILT ONLY WHEN IT IS ON SCREEN. It used to hang off `manageProjects`, a flag whose only job
       was to say the dialog was open; the dialog is now a tab, so the condition is the same
       question asked of the panel — is it open, and is this the half showing. Nothing else changed:
       every row, count and handler below is the manage dialog's, moved. */
    let manageView = null;
    if (s.tagMenuOpen && libTab === 'projects') {
      manageView = {
        empty: !hasProjects, rows: s.projects.map((pr) => {
          const count = this.projectPalettes(pr.id).length; return {
            id: pr.id, name: pr.name,
            /* THE COUNT IS A NUMBER, and it lives inside the name field rather than after it.
               "8 palettes" sat in the row as a third column, and at the widest plural it took a
               third of a 440px dialog to say something the numeral says alone — which is why there
               was no room here for the one control this dialog was missing. The container the
               number sits in IS the project's name, so the pairing needs no label: a folder and
               how much is in it. The spoken form keeps the noun (see countAria), because a bare
               "8" read out after a project name is a fact without a unit. */
            count: String(count),
            countAria: count + ' palette' + (count === 1 ? '' : 's') + ' in this project',
            onRename: (e) => { const inp = document.querySelector('[data-proj-name="' + pr.id + '"]'); if (inp && inp.value.trim() && inp.value.trim() !== pr.name) this.renameProject(pr.id, inp.value.trim()); },
            onRenameKey: (e) => { if (e.key === 'Enter') { e.preventDefault(); const v = e.currentTarget.value; if (v.trim()) this.renameProject(pr.id, v.trim()); e.currentTarget.blur(); } },
            // EXPORT THE FOLDER, from the row that names it. Disabled rather than hidden while the
            // project is empty: a control that vanishes leaves you wondering whether folders can be
            // exported at all, and the name says exactly why it cannot be pressed yet.
            canExport: count > 0,
            onExport: () => this.openProjectExport(pr.id),
            // Icon-only, so the words arrive on hover rather than standing in the row forever.
            exportTitle: count ? 'Export all ' + count + ' palette' + (count === 1 ? '' : 's') + ' as one file' : 'Nothing in this project to export yet',
            exportAria: count
              ? 'Export the project ' + pr.name + ' as design tokens, all ' + count + ' palette' + (count === 1 ? '' : 's') + ' in one file'
              : pr.name + ' is empty, so there is nothing to export yet',
            onDelete: () => this.deleteProject(pr.id), deleteAria: 'Delete project ' + pr.name + ' (its palettes move to Unfiled)',
          };
        }),
        onCreate: () => { const inp = document.querySelector('[data-manage-new]'); if (inp && inp.value.trim()) { this.createProject(inp.value.trim()); inp.value = ''; inp.focus(); } },
        onCreateKey: (e) => { if (e.key === 'Enter') { e.preventDefault(); const v = e.currentTarget.value; if (v.trim()) { this.createProject(v.trim()); e.currentTarget.value = ''; } } },
      };
    }

    // ===== restore-from-file confirmation =====
    // What the file holds and what would land, before anything lands. The counts come from state,
    // never re-derived from the file here: the payload was validated once at preview and parked on
    // the instance (previewProjectFile) precisely so these numbers describe the exact objects that
    // will be committed.
    let restoreView = null;
    if (s.restorePending) {
      const r = s.restorePending;
      const nothingNew = r.newPalettes === 0 && r.newProjects === 0;
      const n = (c, one) => c + ' ' + one + (c === 1 ? '' : 's');
      restoreView = {
        fileName: r.fileName,
        nothingNew, hasAct: !nothingNew,
        // Stated in words. Nothing here is carried by colour or by an icon alone.
        line: nothingNew
          ? 'Everything in this file is already in your library. Adding it would change nothing.'
          : 'Nothing is replaced. Anything already in your library is left exactly as it is.',
        rows: [
          { label: 'Palettes', value: r.newPalettes + ' new of ' + r.palettes },
          { label: 'Projects', value: r.newProjects + ' new of ' + r.projects },
        ],
        confirmAria: 'Add ' + n(r.newPalettes, 'palette') + ' and ' + n(r.newProjects, 'project') + ' to your library',
        // With nothing to add there is nothing to cancel, so the one remaining control says so.
        cancelLabel: nothingNew ? 'Close' : 'Cancel',
        cancelAria: nothingNew ? 'Close, nothing was added' : 'Cancel the restore and add nothing',
      };
    }

    /* ===== THE PHONE'S STORY — eight chapters that read one photograph =====================
       What stands where the desktop gate used to. The gate stated a limitation and offered one act;
       this states the product's argument with a real palette and offers the desktop at the end of
       it, once there is something to go there for.

       EVERY FIGURE HERE IS THE DESKTOP'S OWN. analysePalette, semanticRoles, paletteMetrics and
       composeUse are the same four composers the result stage and the library call, with the same
       inputs — so the phone and the desktop cannot describe one palette two ways. That is the rule
       the mobileShare block below already states, applied to four more readings.

       Composed ONCE and reused across the chapters. analysePalette walks every swatch and
       paletteMetrics walks every PAIR; asking again per chapter would run the whole analysis six
       times for one screen. */
    let mobileStory = null;
    if (this._mobileStory()) {
      const p = this._storyCase();
      const an = analysePalette(p.swatches);
      const met = this.paletteMetrics(p);
      const totW = p.swatches.reduce((a, x) => a + x.weight, 0) || 1;
      const roles = semanticRoles(p, p.roles);
      const masks = (s.storyMasks && s.storyMasks.caseId === p.id) ? s.storyMasks : null;

      /* THE BAR CARRIES TRUE SHARES, and it can because the numbers are not inside it.

         An earlier pass put each colour's hex and percentage INSIDE its band, which forced a floor
         under the band heights — a 0.8% swatch is six pixels and cannot hold a label — and a floored
         picture beside an unfloored number is a figure disagreeing with its own caption.

         /about had already solved this and the fix is to adopt its solution rather than tune ours:
         `.about-weights` is a bar of TRUE widths and `.about-weights__key` is a list underneath
         carrying the chip, the hex, the coordinates and the share (about.css:317-335, about.html's
         Dusk Slate figure). The bar then only has to show proportion, which it can do honestly at
         1.9%, and every number gets a line of its own at a readable size. swatchGrow's 0.06 floor is
         no longer reached for here at all. */
      const okl = (b) => {
        // The same polar conversion reading.js does internally, printed the way /about prints it.
        const C = Math.sqrt(b.a * b.a + b.b * b.b);
        let H = Math.atan2(b.b, b.a) * (180 / Math.PI);
        if (H < 0) H += 360;
        return 'L ' + b.L.toFixed(2).replace(/^0/, '') + ' · C ' + C.toFixed(3).replace(/^0/, '') + ' · H ' + Math.round(H) + '°';
      };

      const swatchRows = p.swatches.map((b, i) => {
        const HX = b.hex.toUpperCase();
        const pct = Math.round((b.weight / totW) * 100);
        // A swatch is only offered as a REGION where the mask is trustworthy — see MIN_COVERAGE and
        // MAX_DRIFT in src/lib/masks.js. Two swatches that are the same colour twice classify
        // arbitrarily between themselves, and a control that lights up the wrong seventh of the
        // frame is worse than one that is not there.
        const mask = masks ? masks.urls[i] : null;
        return {
          key: 'st-' + i, sid: i, hex: HX, pct: pct + '%', pctNum: pct,
          // The bar's own width — the real share, to one decimal, exactly as /about's figure states
          // it. Rounded to a whole number in `pct` for the key, because that is the figure the rest
          // of the app quotes.
          share: ((b.weight / totW) * 100).toFixed(1),
          ok: okl(b),
          hasRegion: !!mask, mask,
          selected: s.storySwatch === i,
          onPick: () => this.pickStorySwatch(i),
          // Never colour alone: the accessible name carries the hex, the share and whether this one
          // can be located in the picture at all.
          aria: HX + ', ' + pct + ' percent of the palette'
            + (mask ? '. Show where this colour appears in the photograph' : '. Too little of the frame to locate'),
        };
      });

      const selected = (typeof s.storySwatch === 'number') ? swatchRows[s.storySwatch] : null;

      mobileStory = {
        caseId: p.id,
        name: p.name,
        /* THE HERO NAMES THE PALETTE ONCE THE READER HAS CHOSEN ONE.

           Picking from the chooser re-tells all eight chapters about a different photograph and lands
           the reader back at the top. Every visible sign that anything happened was in the copy far
           below the fold: the same headline, the same lead, the same button, over a colour field that
           does not change either. The reader who has just chosen Garnet arrives at a screen that says
           "Every image has an atmosphere" and cannot tell their choice registered.

           So the opening statement holds while nothing has been chosen, and becomes the palette's own
           name the moment something has. storyCaseId is null until chooseStoryCase or setStoryCase
           writes it, which is exactly the "has chosen" test and needs no second flag: the default case
           resolves through _storyCase's tulip fallback without ever setting it.

           It stays named afterwards rather than reverting on the next scroll, because the name is now
           what the page is about. The lead below it is unchanged on purpose: it says what Atmos does
           with an image, which is as true of the second palette as the first, and swapping both lines
           would leave the reader nothing recognisable to land on. */
        heroTitle: s.storyCaseId ? p.name : 'Every image has an atmosphere',
        image: this.dispUrl(p), hasImage: this.hasImg(p),
        descriptors: p.descriptors || [],
        rationale: p.rationale || '',
        useLine: composeUse(an, met.aaState),
        swatches: swatchRows,
        /* The bar is one role="img", so it needs one sentence describing the whole figure — /about's
           weight bar carries exactly this ("Dusk Slate by area: darkest green 44.1 per cent, …").
           Without it a screen reader meets five unlabelled spans. */
        weightsAria: p.name + ' by area: ' + swatchRows.map((r) => r.hex + ' ' + r.pct).join(', ') + '.',
        // The lit half of chapter 4. Null until a swatch is chosen, which is also the state the
        // chapter opens in — the picture is whole before it is taken apart.
        litMask: selected && selected.mask ? selected.mask : null,
        litHex: selected ? selected.hex : '',
        litPct: selected ? selected.pct : '',
        anyRegion: swatchRows.some((r) => r.hasRegion),

        /* CHAPTER 5 — three readings, one palette. Segmented buttons carrying aria-pressed, not a
           tablist: there is no tab primitive in this codebase and a control that announces itself
           as tabs without answering an arrow key is worse than one that never claimed to. */
        tab: s.storyTab || 'weight',
        segs: [
          { id: 'weight', label: 'Character' },
          { id: 'role', label: 'Role' },
          { id: 'contrast', label: 'Contrast' },
        ].map((t) => ({
          ...t, key: t.id, selected: (s.storyTab || 'weight') === t.id,
          onPick: () => this.setStoryTab(t.id),
          aria: t.label + (((s.storyTab || 'weight') === t.id) ? ', shown' : ', show this reading'),
          // No inline fill: the toggle switch draws its own moving pill, and the active button's
          // colour is [data-toggle-active]'s. See methods/toggleSwitch.js.
        })),
        /* THE THREE PANELS ARE THREE /about FIGURES, not three lists invented here.

           Role is `.about-roles` — the grid of `.about-role` cells, each a swatch over its name, its
           hex and a note (about.css:824-847). Contrast is `.about-matrix` — the ranked pair list
           whose verdict is carried by FILL WEIGHT and by a WORD, never by hue, which is the rule that
           page argues at its own length (about.css:778-812). Weight is the same matrix shape holding
           the analysis bands. All three were hand-rolled label/value rows before this pass. */
        roleCells: roles.map((r) => {
          const sw = p.swatches.find((x) => x.hex.toUpperCase() === r.hex.toUpperCase());
          const share = sw ? Math.round((sw.weight / totW) * 100) : null;
          return {
            key: r.role, name: ROLE_LABEL[r.role], hex: r.hex.toUpperCase(), swatch: r.hex,
            // The note /about's own role cells carry: what share of the frame this colour holds.
            note: share === null ? '' : share + '% of the frame',
            aria: ROLE_LABEL[r.role] + ', ' + r.hex.toUpperCase() + (share === null ? '' : ', ' + share + ' percent of the frame'),
          };
        }),
        /* The strongest pairs, ranked, classified in WORDS as well as by fill — the matrix figure's
           own rule: "no hue carrying the verdict… the classification is spelled out in words and the
           fill is only there to rank them". Six rather than all ten: ten rows is the desktop figure's
           density, and this is one screen of a story on a phone. */
        pairs: (() => {
          const out = [];
          for (let i = 0; i < p.swatches.length; i++) {
            for (let j = i + 1; j < p.swatches.length; j++) {
              const ratio = this.contrastRatio(p.swatches[i].hex, p.swatches[j].hex);
              out.push({
                key: i + '-' + j, a: p.swatches[i].hex, b: p.swatches[j].hex, ratio,
                val: ratio.toFixed(1) + ' to 1',
                // .about-checks' own three states, not .about-matrix's — see the note on the panel.
                cls: ratio >= 4.5 ? 'is--pass' : ratio >= 3 ? 'is--part' : 'is--fail',
                use: ratio >= 4.5 ? 'Body text at AA' : ratio >= 3 ? 'Large text at AA' : 'Graphic only',
                // NAMED, not left to two colour chips. The chips are decoration beside this.
                pair: p.swatches[i].hex.toUpperCase() + ' on ' + p.swatches[j].hex.toUpperCase(),
                aria: p.swatches[i].hex.toUpperCase() + ' on ' + p.swatches[j].hex.toUpperCase() + ', '
                  + ratio.toFixed(1) + ' to 1, ' + (ratio >= 4.5 ? 'usable for body text' : ratio >= 3 ? 'usable for large text' : 'graphic use only'),
              });
            }
          }
          return out.sort((x, y) => y.ratio - x.ratio).slice(0, 6);
        })(),
        bands: [
          { key: 'dom', label: 'Dominance', value: CAPS(an.dominance.band) },
          { key: 'light', label: 'Lightness', value: CAPS(an.lightness.band) },
          { key: 'temp', label: 'Temperature', value: met.temp },
          { key: 'chroma', label: 'Chroma', value: CAPS(an.chroma.band) },
          { key: 'hue', label: 'Hue spread', value: CAPS(an.hue.band) },
        ],
        // A11Y_LABEL, not A11Y_TITLE: the caption wants the NAME (Text-Ready); A11Y_TITLE is that
        // name plus its definition, which is a tooltip's job and a full line of type here.
        aaLabel: A11Y_LABEL[met.aaState],
        aaCount: met.aaPairs + ' of ' + met.totalPairs + ' pairs reach 4.5:1',

        /* CHAPTER 7 — the other cases, as a swipeable row. The same records the library shows and
           the example list shows; a third way of describing a palette would be a third thing to
           keep true. */
        /* ALL SEVEN, and every one of them appears exactly once in the whole story.

           This was capped at five to buy back the horizontal run's scroll cost, and that was the
           wrong economy: the archive holds eight examples, the story reads one of them, and capping
           the gallery meant two photographs the product owns were never shown at all while the case
           being read appeared twice. Dropping 1.1's duplicate figure pays for the two extra panels
           and then some — the count goes up, the page gets shorter, and the imagery stops repeating.

           Eight distinct photographs across the surface: one in 1.3, doing the mask work, and seven
           here. No image is used twice. */
        cases: this._examples().filter((x) => x.id !== p.id).map((x) => {
          const t = x.swatches.reduce((a, b) => a + (b.weight || 0), 0) || 1;
          return {
            key: x.id, name: x.name,
            note: (x.descriptors || []).slice(0, 2).join(' · '),
            image: this.dispUrl(x), hasImage: this.hasImg(x),
            strip: x.swatches.map((b, i) => ({ key: i, style: { flex: String((b.weight || 0) / t), background: b.hex } })),
            onOpen: () => this.setStoryCase(x.id),
            aria: 'Read ' + x.name + '. ' + (x.descriptors || []).slice(0, 2).join(', '),
          };
        }),

        /* CHAPTER 8 — the handoff, and it is a real one. shareUrl() encodes THIS palette in the
           fragment, so the desktop that receives it opens on the case the reader was just looking
           at — which is what makes "send to desktop" an accurate description rather than the
           overpromise the brief calls out. copySiteLink()'s 'gate-link' key copied the site root
           and said the same words; this replaces it rather than reviving it. */
        /* THE PICKER. Every example including the one being read, because this is a chooser rather
           than an "others" list — a reader who opens it and changes their mind should find the case
           they are already in, not discover it is the one option missing. `active` seeds the slider
           on it so the strip opens centred on where the story already is. */
        pickerOpen: !!s.storyPicker,
        picker: {
          active: Math.max(0, this._examples().findIndex((x) => x.id === p.id)),
          cases: this._examples().map((x) => ({
            key: x.id, id: x.id, name: x.name,
            image: this.dispUrl(x), hasImage: this.hasImg(x),
            note: (x.descriptors || []).slice(0, 2).join(' · '),
          })),
          onChoose: (i) => { const ex = this._examples()[i]; if (ex) this.chooseStoryCase(ex.id); },
          onClose: () => this.closeStoryPicker(),
        },
        onBegin: () => this.beginStory(),
        onSend: () => this.sendStoryToDesktop(),
        sent: s.copied === 'story-send',
        // Opens the chooser rather than jumping to a read-only palette: the story is the product,
        // so 'another palette' means the same story told about a different image.
        onAnother: () => this.openStoryPicker(),
        // The gate's own sentence, kept word for word and moved to the end. It was true when it
        // opened the surface and it is still true here; what changed is that the reader has now
        // seen what the room is for.
        /* THE QUESTION IS ANSWERED WITH THE PAYOFF, not with the refusal it replaced.

           This line was the gate's own sentence, moved here word for word — "Reading an image means
           weighing colours, roles and contrast side by side. That needs room." Moving it was the
           whole point of the restructure, and keeping it verbatim undid that: the heading asks
           "Ready to read your own image?" and the body answered with the same limitation the gate
           used to open with, one screen after the reader has been shown the thing working.

           The constraint is still true and is still stated — it is the second sentence now, and it
           reads as the reason the desktop is worth the trip rather than as the reason this screen
           cannot help.

           REWRITTEN AGAIN when `Send to Desktop` was removed. The line had opened "Send this palette
           across and it opens exactly where you left it", which was accurate only while a control
           existed to do the sending. Copy that describes a button the screen no longer has is worse
           than copy that never claimed it, so the invitation is now the plain one: open Atmos on a
           desktop, with an image of your own. */
        handoffLine: 'Open Atmos on a desktop and drop in an image of your own. Weighing colours, roles and contrast side by side is work that wants a wider screen.',
      };
    }

    // ===== mobile read-only share view =====
    // Deliberately NOT a responsive port of the result stage: a separate, minimal surface that shows
    // the palette, hands over the hex values, and says plainly where to go to make one. Read-only by
    // design — no save, no generate, so it never implies a tool the viewport can't carry.
    let mobileShare = null;
    if (this._mobileShare()) {
      const p = s.current;
      const totW = p.swatches.reduce((a, x) => a + x.weight, 0) || 1;
      // Composed once. analysePalette walks every swatch and paletteMetrics walks every PAIR of
      // them, so asking twice to fill a value and its own emptiness flag is the whole analysis run
      // twice for one boolean.
      const msUse = composeUse(analysePalette(p.swatches), this.paletteMetrics(p).aaState);
      mobileShare = {
        name: p.name,
        descriptors: p.descriptors || [],
        rationale: p.rationale || '',
        hasRationale: !!(p.rationale || '').trim(),
        /* WHAT IT IS FOR, the second half of the desktop's reading. The result stage sets these two
           lines together — the reading says what the palette IS, this says what it is good FOR — and
           the phone was carrying only the first, so the same palette described itself one way here
           and made a recommendation there. composeUse() is the same composer the desktop calls with
           the same two inputs, so the two surfaces cannot drift: it is composed from the analysis
           rather than authored, and it takes aaState so a palette with no usable text pairing is
           never recommended for type. paletteMetrics() is the same verdict the AA badge shows. */
        useLine: msUse,
        hasUseLine: !!msUse.trim(),
        rows: p.swatches.map((b, i) => {
          const key = 'ms-' + i;
          const HX = b.hex.toUpperCase();
          const on = this.onColor(b.hex);   // guaranteed-AA on-colour for THIS swatch
          return {
            key, hex: HX, copied: s.copied === key,
            pct: Math.round((b.weight / totW) * 100) + '%',
            aria: 'Copy ' + HX + ', ' + Math.round((b.weight / totW) * 100) + ' percent of the palette',
            onCopy: () => this.copy(HX, key, 'Copied ' + HX),
            style: {
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
              // var(--page-gutter), not the literal 18px this carried. Everything else on this
              // surface — the name, the descriptor chips, the rationale, the two actions in the
              // foot — is inset by the gutter, so the hex and its percentage were the only edge on
              // the page standing 2px off the column every other line is read against. Two pixels
              // is invisible as a measurement and legible as a wobble, which is the worst of both.
              width: '100%', minHeight: '62px', padding: '0 var(--page-gutter)', margin: 0, textAlign: 'left',
              background: b.hex, color: on, border: 'none', cursor: 'pointer',
              fontFamily: 'Neue Montreal', WebkitTapHighlightColor: 'transparent',
            },
            hexStyle: { fontFamily: 'Neue Montreal', fontSize: 'var(--fs-lead)', letterSpacing: '.02em', textTransform: 'uppercase' },
            metaStyle: { fontFamily: 'Neue Montreal', fontSize: 'var(--fs-label)', letterSpacing: '.06em', opacity: 0.75, display: 'inline-flex', alignItems: 'center', gap: '6px' },
          };
        }),
        // Only the example can be left — a shared link has nowhere to go back TO, and a control
        // that appears for one arrival and not the other is why the two flags are separate.
        canLeave: !!s.exampleView,
        // THE PICTURE THE PALETTE CAME FROM. dispUrl resolves a seeded example's key against the
        // bundled EXAMPLE_SRC map and returns '' for anything else, so no stored or shared string
        // can ever reach this src — the same invariant the desktop reference image rides.
        image: this.dispUrl(p), hasImage: this.hasImg(p),
        onSeeAll: () => this.openExampleList(),
        // `inList` and `onLeave` are gone with the foot's second act (see the note in
        // MobileShareView). inList existed only to relabel that button and to hide `See All
        // Examples`; onLeave was closeExampleOnPhone(), which the masthead's own mark reaches
        // through returnToIntro(). The list surface below still has its own ml.onLeave.
        // Nothing under an example. The line explaining that this ships with the app was telling
        // someone who had just pressed "Try an example" what they had pressed. A shared link is a
        // different arrival — that reader did not choose this surface and has no way off it, so it
        // keeps the one sentence that says where the tool actually lives.
        footLine: s.exampleView ? '' : 'Open Atmos Gallery on a desktop to read a palette from your own image.',
      };
    }

    /* THE EXAMPLE LIST — the phone's version of the Library list, and deliberately the same object:
       a strip you recognise the palette by, its name, and the first two traits. Built only when it
       is on screen; it reads the same seeded records the archive does. */
    let mobileList = null;
    if (this._mobileList()) {
      const ex = this._examples();
      mobileList = {
        count: ex.length,
        onLeave: () => this.closeExampleList(),
        rows: ex.map((p) => {
          const tot = p.swatches.reduce((a, x) => a + (x.weight || 0), 0) || 1;
          return {
            key: p.id,
            name: p.name,
            traits: (p.descriptors || []).slice(0, 2),
            onOpen: () => this.openExampleById(p.id),
            // The photograph, resolved the same way the palette view resolves its own: a seeded
            // example's key against the bundled map, '' for anything else. The list was showing the
            // swatch strip alone, which is the palette without the thing it was read FROM.
            image: this.dispUrl(p), hasImage: this.hasImg(p),
            aria: 'Open ' + p.name + '. ' + (p.descriptors || []).slice(0, 3).join(', ') + '.',
            strip: p.swatches.map((b, i) => ({
              key: i,
              style: { flexGrow: this.swatchGrow(b), flexBasis: 0, minWidth: '2px', background: b.hex },
            })),
          };
        }),
      };
    }

    // --- the result stage's own filing target ---
    // Resolved by id out of the LIVE feed, for the same reason the overlay re-resolves its own
    // record (see above): s.current is a snapshot taken when the palette was loaded, and
    // assignPalette writes to st.feed only — so reading projectId off s.current would leave the
    // action row's button reporting the project the palette sat in BEFORE you moved it.
    // Missing from the feed is a real state, not a failure: a shared palette lives in the URL and
    // is not in this archive until it is saved, and there is no record to file until then.
    const filedCur = s.current ? (s.feed.find((f) => f.id === s.current.id) || null) : null;

    return {
      showMobileShare: !!mobileShare, mobileShare,
      showMobileList: !!mobileList, mobileList,
      showMobileStory: !!mobileStory, mobileStory,
      // THE GATE'S TWO ACTS. Offered only where they are true: the example needs a palette in the
      // archive to show, and both are meaningless on a screen wide enough to run the tool.
      gateHasExample: (s.feed || []).length > 0,
      gateExample: () => this.openExampleOnPhone(),
      // gateCopyLink / gateLinkCopied went with the `Save for Desktop` button (see the tombstone in
      // AppView's gate). copySiteLink() and the 'gate-link' copy key are still in persistence.js.

      isUpload: s.stage === 'upload', isProcessing: busy, isResult: s.stage === 'result', isError: s.stage === 'error',
      errorTitle: s.errorTitle, errorMsg: s.errorMsg,
      canReset: s.stage !== 'upload', busy, announce: s.announce,
      reset: () => this.doReset(),
      // landing stage (first-visit brand arrival)
      // the landing surface doubles as the small-screen surface — on phones it is always up, with
      // the gate copy in place of the statement + CTA (the tool needs room a phone hasn't got)
      showLanding: this._landingUp(), narrow: s.narrow,
      showLoader: s.showLoader,
      landingBlend: s.theme === 'dark' ? 'screen' : 'multiply',
      getStarted: () => this.getStarted(),
      // glassCta / glassCtaHover / glassCtaActive lived here: 14 declarations and two hover-state
      // objects describing a control that CSS can state once. They are `.glass-cta` in global.css
      // now, shared with the gate's two acts and measured against the same figure /about's closing
      // action uses. notfound.css's .nf-cta names this block as the thing it was copied from — it
      // is a standalone document that never loads global.css, so it still carries its own copy;
      // the pointer in that file now reads .glass-cta.
      // shared micro-interaction handlers (one signature across the whole UI). The m* quartet that
      // sat here went with the dead GSAP press system — see the tombstone in methods/motion.js.
      dimEnter: (e) => this.dimEnter(e), dimLeave: (e) => this.dimLeave(e),
      uploadHover: { background: 'color-mix(in srgb, var(--on-surface) 4%, var(--surface-white))' },
      // dropzone hover tint — JS-driven; leave restores the explicit defaults (never clears inline styles)
      dropEnter: (e) => { if (this.state.dragOver) return; const el = e.currentTarget; el.style.background = 'color-mix(in srgb, var(--on-surface) 1%, var(--surface-raised))'; el.style.borderColor = 'color-mix(in srgb, var(--on-surface) 45%, transparent)'; },
      dropLeave: (e) => { if (this.state.dragOver) return; const el = e.currentTarget; el.style.background = 'var(--surface-raised)'; el.style.borderColor = 'var(--line-strong)'; },
      // palette-level copy
      // COPY IS ONE ACT WITH A FORMAT. Hex list and CSS variables sat in the row as peers of
      // Export, which told the user the app has two copy features; it has one, and the format is
      // a detail of it. The formats move into a menu on a single Copy control, and the confirmation
      // lands on that control rather than in a status line somewhere else on the page.
      /* The copy dialog's rows wear the export dialog's row: same object, same style, one source.
         Copy is no longer a dropdown — see CopyControl in AppView — so the two surfaces have to be
         the same surface rather than two that resemble each other. */
      copyItemStyle: itemBase,
      copyMenuOpen: !!s.copyMenuOpen,
      toggleCopyMenu: () => this.toggleTip('copyMenuOpen', '[data-copy-menu]'),
      closeCopyMenu: () => { this.closeTip('copyMenuOpen', '[data-copy-menu]'); this._focusCopyTrigger(); },
      copyMenuKey: (e) => { if (e.key === 'Escape') { e.stopPropagation(); this.closeTip('copyMenuOpen', '[data-copy-menu]'); this._focusCopyTrigger(); } },
      copyDone: s.copied === 'pal-hex' ? 'Hex list' : s.copied === 'pal-css' ? 'CSS variables' : '',
      // Neither closes the dialog any more, and neither moves focus — see the note on the overlay's
      // pair above. The row reports; the sheet is left where the reader put it.
      copyHexList: () => copyPal('hex'),
      copyCss: () => copyPal('css'),
      // share link — the palette rides in the URL fragment, which never reaches a server
      shareCopied: s.copied === 'pal-share',
      onShare: () => this.shareCurrent(),
      // viewing someone else's palette: nothing is in this browser's archive until they say so
      isSharedView: !!s.sharedView,
      onSaveShared: () => this.saveShared(),
      onMakeOwn: () => this.makeOwnFromShared(),
      copyLabelStyle: this.monoLabel('var(--fs-label)', '.12em', { color: 'var(--on-surface-muted)' }),
      deferNoteStyle: { fontFamily: mono, fontSize: 'var(--fs-label)', letterSpacing: '.02em', color: 'var(--on-surface-muted)', marginLeft: 'auto' },
      // feed states + view toggle
      // The cold-start empty state is only cold start. Filtered-to-nothing is a different message
      // with a different way out, and showing "Palettes you generate collect here" to someone
      // holding three filters was the app answering a question nobody asked.
      feedEmpty: scoped.length === 0 && !(this.scopedFeed(s.feed).length === 0 && ((s.activeTags || []).length || (s.activeA11y || []).length || (s.activeLight || []).length || (s.activeTemp || []).length)),
      feedHasItems: scoped.length > 0,
      // projects
      projectChips, hasProjects, activeIsAll: s.activeProject === null,
      // MANAGE IS AN ACT, AND IT LEFT THE SCOPE GROUP TO SAY SO.
      // It used to sit inside the chips' shared border, after a hairline, wearing the chip
      // component's exact type and padding. Everything about that placement said "one more scope":
      // same box, same baseline, last in a row of four. The hairline was carrying the entire
      // distinction between navigating the library and changing its structure.
      //
      // MANAGE PROJECTS NO LONGER STANDS HERE. It was a bordered act at the end of this row, and it
      // is now the second tab of the library panel — one door instead of two onto one library. Its
      // style went with it: the tab takes the app's segmented-control style (libTabs below) rather
      // than a bordered button's, because it is now a view of a surface rather than a way into one.
      /* THE STEP PAIR. No border of its own: the rail already draws one, and the hairline in the
         JSX separates the pair from the chips — a second box inside the box would read as another
         scope. Square by construction (a fixed 30px, not padding), because a chevron has no width
         of its own to pad and two arrows of different widths beside each other look broken.

         Disabled reads as the app's disabled reads — [data-ix]:disabled, the same rule every other
         dead control in the tree answers to — rather than a number invented at the project rail.

         data-ix="press" and NOTHING inline about transitions: the press contract is a CSS rule
         keyed on that attribute, and any transition declared here would replace it wholesale. */
      projSteps: {
        show: !!s.projStep.can,
        prev: { disabled: !!s.projStep.start, style: this.projStepStyle(!!s.projStep.start), onClick: () => this.stepProjects(-1) },
        next: { disabled: !!s.projStep.end, style: this.projStepStyle(!!s.projStep.end), onClick: () => this.stepProjects(1) },
      },
      // The file pair (save / open) reads at the action row's SECONDARY emphasis — the same edge
      // and the same full-strength ink as every other unfilled control in the app. It used to take
      // the utility tier's muted ink and 15% edge; that tier is gone (it could not hold 4.5:1 once
      // its own hover tint darkened the ground under it), so these take what everything else takes.
      // The demotion from "New generation" is carried by fill: that one is filled, these are not.
      tier3BtnStyle: this.monoLabel('var(--fs-label)', 'var(--track-flat)', {
        display: 'inline-flex', alignItems: 'center', gap: '7px', padding: 'var(--btn-pad-sm)',
        background: 'none', border: '1px solid var(--action-line)',
        color: 'var(--on-surface)', cursor: 'pointer',
      }),
      // the library panel: a drawer in the contrast/harmony family + applied chip (one filter state)
      facetOpen: !!s.tagMenuOpen,
      /* ===== THE PANEL'S TWO TABS =====
         The same object as the feed's List / Grid / 3D switch, one file over: a travelling pill
         behind two aria-pressed buttons, built from the same viewToggleOptStyle so a future edit to
         the app's segmented control reaches both. Two columns rather than three, and the pill is
         written from libTab — the RESOLVED tab, never the raw flag — so the marker cannot sit under
         a tab the body is not showing.

         The counts say two different kinds of thing on purpose. Projects carries a cardinality (how
         many folders there are, zero included: it is why the tab is empty when it is), Filter
         carries a STATE (how many narrowings are on) and so is absent at rest — "Filter 0" would be
         a number reporting nothing, and the trigger outside follows the same rule.
         No opacity on either: the count is small text on a filled pill, and the archive's own audit
         took opacity off these numerals once already for contrast. */
      libTab,
      libTabPill: {
        position: 'absolute', top: '2px', bottom: '2px', left: '2px', width: 'calc((100% - 4px) / 2)',
        transform: 'translateX(' + (libTab === 'projects' ? 100 : 0) + '%)', background: 'var(--on-surface)',
        transition: this._reduce ? 'none' : 'transform var(--dur-fold) var(--ease-fold)',
      },
      libTabs: [
        { key: 'filter', label: 'Filter', count: appliedRaw.length ? String(appliedRaw.length) : '', aria: appliedRaw.length ? 'Filter, ' + appliedRaw.length + ' filter' + (appliedRaw.length === 1 ? '' : 's') + ' applied' : 'Filter' },
        { key: 'projects', label: 'Projects', count: String(s.projects.length), aria: s.projects.length === 1 ? 'Projects, 1 project' : 'Projects, ' + s.projects.length + ' projects' },
      ].map((t) => ({
        ...t, active: libTab === t.key,
        // Guarded on the RESOLVED tab, not on the raw flag: with nothing chosen yet the flag is
        // null, and a press on the tab already showing would otherwise re-announce and re-run the
        // arrival of a panel that did not change.
        onClick: () => { if (libTab !== t.key) this.setLibraryTab(t.key); },
        style: this.viewToggleOptStyle(libTab === t.key, { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '7px' }),
        countStyle: { fontFamily: 'Neue Montreal', fontSize: 'var(--fs-micro)', letterSpacing: 'var(--track-flat)', fontVariantNumeric: 'tabular-nums', color: libTab === t.key ? 'var(--surface)' : 'var(--on-surface-muted)' },
      })),
      // Left/Right across the pair, the same two lines the feed's view toggle takes: a segmented
      // control is one control, and walking it with the arrows is what makes it one to a keyboard
      // as well as to the eye. Focus follows the press so the next arrow continues from where you
      // are, which is only possible because both buttons stay mounted across the switch.
      libTabKey: (e) => {
        const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (!dir) return;
        e.preventDefault();
        const next = libTab === 'filter' ? 'projects' : 'filter';
        this.setLibraryTab(next);
        requestAnimationFrame(() => { const b = document.querySelector('[data-lib-tab="' + next + '"]'); if (b) try { b.focus(); } catch (err) { } });
      },
      // A TOGGLE, because it has always claimed to be one. The trigger carries aria-expanded, so it
      // announces as a disclosure, and it only ever opened — pressing it while the panel was up
      // re-ran the open and appeared to do nothing. Now that a press outside dismisses the panel,
      // the trigger is the one press outside it that must not (it would close and immediately
      // reopen), so it has to carry the close itself. See _facetOutside.
      openFacet: () => { if (this.state.tagMenuOpen) this.closeTagFilter(); else this.openTagFilter(); },
      closeFacet: () => this.closeTagFilter(),
      tagQuery: s.tagQuery || '', onTagQuery: (e) => this.setState({ tagQuery: e.target.value }),
      hasTagQuery: !!(s.tagQuery || '').trim(),
      clearTagQuery: () => this.setState({ tagQuery: '' }, () => { const i = document.querySelector('[data-facet-search]'); if (i) try { i.focus(); } catch (e) { } }),
      // The panel covers the right of the list, so it states the result size itself rather than
      // making you close it to find out. aria-live=polite on the element (see AppView) announces
      // each change without interrupting whatever the user is doing.
      //
      // scopedNow, not tagBase. tagBase is the facet-counting base — the result with the TAG group
      // lifted out, which is the right denominator for a trait row's count and the wrong number
      // entirely for a header that says how many palettes match. With a trait applied the two
      // differ, and the panel was quietly reporting the larger one.
      // One key, not two: `matchCount` sat beside this with no consumer at all.
      // Same sentence the bar states, so the panel and the row it sits over never disagree.
      matchLabel: appliedRaw.length
        ? 'Showing ' + scopedNow + ' of ' + tagPool.length + ' palette' + (tagPool.length === 1 ? '' : 's')
        : tagPool.length + ' palette' + (tagPool.length === 1 ? '' : 's'),
      // sort the facet list: discovery (count) vs known-item lookup (A–Z)
      tagSort: s.tagSort || 'count',
      sortByCount: () => this.setState({ tagSort: 'count' }),
      sortByAlpha: () => this.setState({ tagSort: 'alpha' }),
      // toggleStyle is shared with the harmony drawer (result stage), so its uppercase micro voice
      // stays; the filter drawer is library-owned chrome and overrides to the library's control
      // voice locally — same component, section-appropriate clothes.
      sortCountStyle: this.toggleStyle((s.tagSort || 'count') === 'count'),
      sortAlphaStyle: this.toggleStyle(s.tagSort === 'alpha'),
      // roving arrow traversal inside the option list — Down/Up step, Home/End jump. Typing stays
      // with the search field, which is where focus lands on open.
      onFacetListKey: (e) => {
        const nav = ['ArrowDown', 'ArrowUp', 'Home', 'End'];
        if (nav.indexOf(e.key) < 0) return;
        const list = e.currentTarget;
        const opts = [...list.querySelectorAll('[data-tg-cell][aria-pressed]')].filter((b) => !b.disabled && b.offsetParent !== null);
        if (!opts.length) return;
        e.preventDefault();
        const i = opts.indexOf(document.activeElement);
        let n = i;
        if (e.key === 'ArrowDown') n = i < 0 ? 0 : Math.min(i + 1, opts.length - 1);
        else if (e.key === 'ArrowUp') n = i <= 0 ? 0 : i - 1;
        else if (e.key === 'Home') n = 0;
        else n = opts.length - 1;
        if (opts[n]) opts[n].focus();
      },
      facetOptions, facetEmpty: facetOptions.length === 0,
      // NO SILENT TRUNCATION. The control states how many rows are being withheld, so a short list
      // is legibly a short list rather than the whole vocabulary.
      facetAllOpen: !!s.facetAllOpen,
      facetMore: (facetHidden > 0 || (s.facetAllOpen && !facetQuery && facetRanked.length > 6)) ? {
        label: s.facetAllOpen ? 'Show Fewer' : 'Show All · ' + facetHidden,
        aria: s.facetAllOpen
          ? 'Show only the most useful character traits'
          : 'Show all character traits, ' + facetHidden + ' more',
        onToggle: () => this.toggleFacetAll(),
      } : null,
      // the in-drawer clear: focus moves to the search field after, because the clear row itself
      // disappears with the state it clears — focus must never die with the control that held it
      // ONE clear-all, living in the panel beside the facets it clears. The header's separate
      // CLEAR was a third affordance for the same act (chip ✕ · header CLEAR · panel CLEAR FILTER);
      // per-chip removal plus this is the whole set now.
      // Counted across EVERY group. It read activeTags + activeA11y only, so a view narrowed by
      // Temperature alone offered no clear-all in the panel at all — the two measured groups were
      // added after this line and never reached it.
      facetClear: appliedRaw.length ? {
        // Never "Clear all": on a page whose other destructive act deletes palettes, a verb with no
        // object is a verb that could mean the library. It names what it clears, at both counts.
        label: appliedRaw.length > 1 ? 'Clear Filters' : 'Clear Filter',
        onClear: () => { this.clearTags(); requestAnimationFrame(() => { const i = document.querySelector('[data-facet-search]'); if (i) try { i.focus(); } catch (e) { } }); },
      } : null,
      appliedTags, hasAppliedTags: appliedTags.length > 0,
      measuredGroups, hasMeasured: measuredGroups.length > 0,
      // Character is a DISCLOSURE now, not a peer of the measured groups.
      charOpen: !!s.charOpen,
      toggleChar: () => this.toggleFold('charOpen', '[data-facet-char]'),
      charLabel: 'Character traits',
      charAria: (s.charOpen ? 'Hide' : 'Show') + ' character traits, which are interpretations rather than measurements',
      // ===== the filter row's own state, kept visible OUTSIDE the overlay =====
      //
      // A NUMBER ON THE TRIGGER. The word said nothing about whether anything was filtered; the
      // only evidence was the chips beside it, which is fine until they wrap or the row is scanned
      // at a glance. The number is the count of narrowings currently applied, in the same place the
      // scope chips carry theirs, so the two rows report themselves the same way. It survived the
      // word: the trigger is a glyph now, and a glyph reports state even less than a noun does.
      filterCount: appliedRaw.length ? String(appliedRaw.length) : '',
      /* THE TRIGGER'S WHOLE SENTENCE, because there is no visible label to read it from. Both jobs
         are named — a control that opens two things and announces one of them is a control that
         hides the other — and the applied count is spoken as well as printed. Label-in-name (SC
         2.5.3) does not bite here: there is no visible text for the accessible name to disagree
         with, which is exactly the trade this button makes. The title carries the short form to the
         pointer; the panel's own heading says it again the moment it arrives. */
      libraryTitle: 'Manage Library',
      libraryAria: s.tagMenuOpen
        ? 'Close Manage Library'
        : 'Manage Library: filter palettes and organise projects' + (appliedRaw.length ? ', ' + appliedRaw.length + ' filter' + (appliedRaw.length === 1 ? '' : 's') + ' applied' : ''),
      // A COUNT ONLY WHEN A FILTER IS HOLDING SOMETHING BACK, and never a bare total.
      //
      // This was "8 palettes" at rest, which is a number the page already states twice — the All
      // chip carries the scope's count and the rows themselves are countable — and which answers
      // "how many are here", the question nobody looking at the list needs answered. Worse, it made
      // the count look like standing metadata about the library rather than what it actually is:
      // the RESULT of filtering. So it now exists only while a filter does, and says what the
      // filter cost: 5 of 8, a narrowing and its size in one line.
      //
      // The denominator is the project scope's own total, not the whole archive, because the scope
      // chips above already declared which library segment we are inside; counting against the
      // archive would make Unfiled + a filter report a number matching neither row.
      resultSummary: appliedRaw.length
        ? 'Showing ' + scopedNow + ' of ' + tagPool.length + ' palette' + (tagPool.length === 1 ? '' : 's')
        : '',
      anyFilter: appliedTags.length > 0,
      // "Clear all" is now "Clear filters", and it sits AFTER the chips rather than before them.
      // Both are the same correction: the old label named no object, so on a page whose other
      // destructive verb deletes palettes it could be read as clearing the library — and it stood
      // between the Filter button and the filters it clears, so the way out was read before the
      // thing to get out of. Order is now trigger → what is applied → how to undo all of it.
      onClearAll: () => this.clearTags(),
      // The toolbar's arrow keys. role="toolbar" sets the expectation that Left/Right walk the
      // controls, and the chip count is open-ended — six narrowings is six extra tab stops between
      // the list and everything after it — so the expectation is worth honouring.
      //
      // Every control stays in the tab order rather than roving on a single tabindex=0. Roving is
      // the stricter reading of the pattern, but it needs a remembered index, and this toolbar's
      // membership changes underneath that index on every press: removing a chip deletes the very
      // control the index pointed at. APG allows the simpler form, and a toolbar that is merely
      // more tab stops than ideal beats one that loses focus when you use it.
      toolbarKey: (e) => {
        const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        const home = e.key === 'Home', end = e.key === 'End';
        if (!dir && !home && !end) return;
        const bar = e.currentTarget.closest('[data-filter-toolbar]');
        if (!bar) return;
        const btns = [...bar.querySelectorAll('button')].filter((b) => !b.disabled && b.offsetParent !== null);
        if (btns.length < 2) return;
        e.preventDefault();
        const i = btns.indexOf(document.activeElement);
        const n = home ? 0 : end ? btns.length - 1 : (i < 0 ? 0 : (i + dir + btns.length) % btns.length);
        try { btns[n].focus(); } catch (err) { }
      },
      onRemoveLast: () => this.removeLastFilter(),
      // A zero-result state has to explain the conflict rather than pretend the shelf is bare.
      filteredEmpty: scopedNow === 0 && appliedTags.length > 0,
      a11yOptions, hasA11yOptions: a11yOptions.length > 0,
      // The three definitions, for the panel's ⓘ. On demand, in one place, rather than as a
      // standing line under every row — the affordance-over-copy rule, and the reason the group's
      // old right-hand hint column was removed in the first place.
      a11yDefs: ['flexible', 'limited', 'none'].map((v) => ({ key: v, label: A11Y_LABEL[v], text: A11Y_DEFINITION[v] })),
      // The combine rule and the three accessibility states used to stand as a paragraph over
      // the groups. It is the panel's own instruction manual, read once and then scrolled past
      // forever, so it moves to the same 16px tip the Library heading uses: available on the
      // title it belongs to, absent from every visit that does not need it.
      filterInfoOpen: !!s.filterInfoOpen,
      toggleFilterInfo: () => this.toggleTip('filterInfoOpen', '[data-tip="filters"]'),
      filterInfoKey: (e) => { if (e.key === 'Escape') { e.stopPropagation(); this.closeTip('filterInfoOpen', '[data-tip="filters"]'); } },

      activeTags, activeA11y,
      showFacet: tagPool.length > 0 || activeTags.length > 0 || activeA11y.length > 0,
      showProjectsBar: s.feed.length > 0 || s.projects.length > 0,
      // WHERE THE LIBRARY LIVES — carried by a marker, not by a sentence.
      //
      // This began as a standing line beside the heading ("Saved in this browser. Clearing browser
      // data deletes it."). It was accurate and it was too much: a permanent two-sentence
      // explanation next to a one-word heading, read once and then merely occupying the page. The
      // rule this repo works to is that an affordance should carry the fact and copy should be
      // what you get when you ask for it — the same move the AA column already makes with its ⓘ,
      // which is why this is that ⓘ and not a new kind of thing.
      //
      // Gated with the control bar below: an empty library has nothing to lose, and the cold-start
      // empty state a few lines down already speaks for that case.
      //
      // TWO STATES, ONE ELEMENT. When the storage probe fails — private browsing, a locked-down
      // profile, a full disk — makeStore() returns available:false and persist() silently does
      // nothing (writePayload). That is not background information to be filed behind an ⓘ, so the
      // marker changes glyph and accessible name to say something is wrong, and the panel says
      // what. Never colour alone: the glyph and the name both carry it. _store() memoises onto
      // this.store, so asking per render costs a property read.
      storeInfoOpen: !!s.storeInfoOpen,
      toggleStoreInfo: () => this.toggleTip('storeInfoOpen', '[data-tip="store"]'),
      storeInfoKey: (e) => { if (e.key === 'Escape') { e.stopPropagation(); this.closeTip('storeInfoOpen', '[data-tip="store"]'); } },
      storeInfo: (s.feed.length > 0 || s.projects.length > 0)
        ? (this._store().available
          ? {
            glyph: 'i', aria: 'Where your palettes are stored',
            lines: [
              'Your palettes are saved in this browser, on this machine. There is no account and no server copy.',
              'Clearing your browser data deletes them. Back up to keep a copy of your own.',
            ],
          }
          : {
            glyph: '!', aria: 'This browser is not saving your palettes',
            lines: [
              'This browser is not letting the library be saved. That usually means private browsing, or storage that is full or blocked.',
              'Nothing here will survive closing the tab. Back up to keep it.',
            ],
          })
        : null,
      assign: assignView, hasAssign: !!s.assignPalette, closeAssign: () => this.closeAssign(), trapAssign: (e) => this.trapFocusIn('[data-assign-dialog]', e),
      // Re-upload recognition. The strip reuses the archive card's value shape, so the palette the
      // user is being asked about looks the way it looks everywhere else — recognition is the whole
      // point of the dialog. Counting: `count` includes every entry already made from this image,
      // so the wording has to hold at one and at many.
      hasRecognise: !!s.recognised,
      recognise: s.recognised ? {
        name: s.recognised.palette.name,
        when: this.relTime(s.recognised.palette.time),
        count: s.recognised.count,
        // Stated in words, never by colour or icon alone (SC 1.4.1).
        line: s.recognised.count === 1
          ? 'You extracted this image before. It is already in your archive.'
          : 'You extracted this image before. Your archive already holds ' + s.recognised.count + ' palettes from it.',
        strip: s.recognised.palette.swatches.map((b) => ({ style: { flexGrow: w(b), flexBasis: 0, minWidth: 0, background: b.hex } })),
        openAria: 'Open the existing palette ' + s.recognised.palette.name,
        variationAria: 'Extract this image again anyway, adding a second entry with the same colours and keeping ' + s.recognised.palette.name,
      } : null,
      closeRecognise: () => this.closeRecognised(),
      recogniseOpen: () => this.recogniseOpen(),
      recogniseVariation: () => this.recogniseVariation(),
      trapRecognise: (e) => this.trapFocusIn('[data-recognise-dialog]', e),
      // No hasManage, no closeManage, no focus trap: the manage surface is a tab of the library
      // panel now, so it opens, closes and traps exactly as the panel does — which is to say it
      // does not trap at all, because the panel is not modal. `manage` is null unless that tab is
      // the one showing (see the gate on manageView).
      manage: manageView,
      restore: restoreView, hasRestore: !!s.restorePending,
      closeRestore: () => this.closeRestore(), confirmRestore: () => this.confirmRestore(),
      trapRestore: (e) => this.trapFocusIn('[data-restore-dialog]', e),
      // the portable file — a BACKUP of the library, and the restore that reads one back. Named for
      // the consequence rather than the file dialog; the file format itself is untouched (see the
      // frozen `schema` note in persistence.js).
      backupMenuOpen: s.backupMenuOpen, toggleBackupMenu: () => this.setState((st) => ({ backupMenuOpen: !st.backupMenuOpen })),
      showBackUpProject: s.activeProject !== null,
      backUpProject: () => { this.setState({ backupMenuOpen: false }); this.saveProjectFile(s.activeProject); },
      backUpLibrary: () => { this.setState({ backupMenuOpen: false }); this.saveProjectFile('archive'); },
      // still reached by the brand mark, which is now the only door to it
      showIntroAgain: () => this.returnToIntro(),
      // The phone's own way home for the brand mark — see returnToGateOnPhone in persistence.js for
      // why the two surfaces cannot share the tool's routine.
      returnToGate: () => this.returnToGateOnPhone(),
      // on phones the wordmark rides at the top exactly as it does on desktop, and stays decorative:
      // there is no tool behind the small-screen surface to hand a "back to the start" button to
      showLogoButton: !!s.landingDismissed && !s.narrow,
      showLogoDecor: !s.landingDismissed || s.narrow,
      activeScopeLabel: (s.activeProject === '__unfiled__' ? 'Unfiled' : this.projectName(s.activeProject)),
      onRestore: () => { const inp = this.projectFileRef && this.projectFileRef.current; if (inp) inp.click(); },
      onProjectFileChange: (e) => { const f = e && e.target && e.target.files && e.target.files[0]; if (f) this.importProjectFile(f); if (e && e.target) e.target.value = ''; },
      projectFileRef: this.projectFileRef,
      isListView: s.feedView === 'list', isGridView: s.feedView === 'grid',
      setList: () => this.setFeedView('list'), setGrid: () => this.setFeedView('grid'), setReel: () => this.setFeedView('carousel'),
      listToggleStyle: this.viewToggleOptStyle(s.feedView === 'list'), gridToggleStyle: this.viewToggleOptStyle(s.feedView === 'grid'), reelToggleStyle: this.viewToggleOptStyle(s.feedView === 'carousel'),
      listPressed: s.feedView === 'list' ? 'true' : 'false', gridPressed: s.feedView === 'grid' ? 'true' : 'false', reelPressed: s.feedView === 'carousel' ? 'true' : 'false',
      listTab: s.feedView === 'list' ? 0 : -1, gridTab: s.feedView === 'grid' ? 0 : -1, reelTab: s.feedView === 'carousel' ? 0 : -1,
      reelStyle: { display: s.feedView === 'carousel' ? 'block' : 'none', position: 'fixed', inset: 0, zIndex: 90, background: 'var(--surface-raised)', overflow: 'hidden', overscrollBehavior: 'none' },
      reelEmpty: s.feedView === 'carousel' && this.reelPalettes().length === 0,
      reelCloseRef: (this.reelCloseRef = this.reelCloseRef || React.createRef()),
      viewTogglePill: { position: 'absolute', top: '2px', bottom: '2px', left: '2px', width: 'calc((100% - 4px) / 3)', transform: 'translateX(' + (s.feedView === 'carousel' ? 200 : s.feedView === 'grid' ? 100 : 0) + '%)', background: 'var(--on-surface)', transition: this._reduce ? 'none' : 'transform var(--dur-fold) var(--ease-fold)' },
      viewToggleKey: (e) => {
        const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (!dir) return;
        e.preventDefault();
        const order = ['list', 'grid', 'carousel'];
        const next = order[(order.indexOf(this.state.feedView) + dir + order.length) % order.length];
        this.setFeedView(next);
        const grp = e.currentTarget && e.currentTarget.closest('[data-toggle-init]');
        if (grp) { const btns = [...grp.querySelectorAll('[data-toggle-btn]')]; const nb = btns[order.indexOf(next)]; if (nb) nb.focus(); }
      },
      feedList, feedNodes,
      // THE PAGER APPEARS WHEN THERE IS PAGING TO DO, and not before.
      //
      // Two different controls with two different conditions, which is why this is two flags and
      // not one. "Prev · Page 1 of 1 · Next" is a navigation control for a list with one page: both
      // buttons permanently disabled, and a live region announcing a position that cannot change.
      // It goes whenever pageCount is 1.
      //
      // Per page outlives it by one step. A 20-palette list at 24 per page is also one page, but
      // choosing 12 there WOULD split it, so the control still does something and stays. It goes
      // only when even the smallest size cannot produce a second page — at or below 12 palettes,
      // every option on that toggle draws the identical list, and a control whose every setting
      // has the same effect is a control that is lying about having settings.
      //
      // The whole footer is gone when both are, which is the common case for a young library:
      // eight seeded palettes and nothing to page through.
      // scopedAll, never `scoped`: in list view `scoped` is the CURRENT PAGE's rows, so testing it
      // would hide the pager exactly when paging had done its job and left 12 rows on screen.
      showPageSize: s.feed.length > 0 && s.feedView === 'list' && scopedAll.length > PAGE_SIZES[0],
      showPager: s.feed.length > 0 && s.feedView === 'list' && pageCount > 1,
      // Osmo toggle-switch mechanic, adapted: sliding pill driven by the active index (squared, token
      // colors/easing), roving tabindex + arrow-key wrap on the buttons; state stays declarative.
      pageSizeOptions: PAGE_SIZES.map((n) => ({
        label: '' + n, pressed: pageSize === n ? 'true' : 'false', tabIndex: pageSize === n ? 0 : -1,
        // Third copy of viewToggleOptStyle, now a call. Tabular numerals are the only difference:
        // the three counts have to occupy the same width or the pill behind them jitters as it slides.
        style: this.viewToggleOptStyle(pageSize === n, { fontVariantNumeric: 'tabular-nums' }),
        onSelect: () => this.setPageSize(n),
      })),
      pageTogglePill: { position: 'absolute', top: '2px', bottom: '2px', left: '2px', width: 'calc((100% - 4px) / 3)', transform: 'translateX(' + (PAGE_SIZES.indexOf(pageSize) * 100) + '%)', background: 'var(--on-surface)', transition: this._reduce ? 'none' : 'transform var(--dur-fold) var(--ease-fold)' },
      pageToggleKey: (e) => {
        const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (!dir) return;
        e.preventDefault();
        const sizes = PAGE_SIZES; const next = sizes[(sizes.indexOf(this.state.pageSize) + dir + sizes.length) % sizes.length];
        this.setPageSize(next);
        const btns = [...document.querySelectorAll('[data-toggle-init] [data-toggle-btn]')]; const nb = btns[sizes.indexOf(next)]; if (nb) nb.focus();
      },
      // "of", not "/". The same word the result summary above uses for the same relationship —
      // a position inside a total — so the section states it one way rather than two.
      pageLabel: 'Page ' + (page + 1) + ' of ' + pageCount,
      prevDisabled: page <= 0, nextDisabled: page >= pageCount - 1,
      prevPage: () => this.setPage(page - 1), nextPage: () => this.setPage(page + 1),
      prevStyle: this.pageNavStyle(page <= 0), nextStyle: this.pageNavStyle(page >= pageCount - 1),
      listWrapStyle: { display: s.feed.length > 0 && s.feedView === 'list' ? 'flex' : 'none', flexDirection: 'column', gap: '0', width: '100%', borderBottom: '1px solid var(--line)' },
      // ===== sortable column headers =====
      // Plain <button>s in a group, so keyboard operation is the platform's, not ours: Tab reaches
      // them in visual order, Enter/Space activates. They carry aria-pressed (the same toggle
      // vocabulary the view toggle and the project chips already use) and each states its NEXT
      // action, so the label is never a lie about what activating it will do.
      showSortHeader: s.feed.length > 0 && s.feedView === 'list',
      // the ⓘ toggletip on the header: the denominator and the badge vocabulary, explained ONCE
      // AA first — the badge leads the cluster, so its sort leads the header; both metric sorts
      // stay separate buttons over the ONE cluster column and keep operating on the true numbers
      sortCols: [
        // No widths here any more: the header sits on --row-grid, the same template the rows use,
        // so each label is sized by the track it lands in. Each right-aligns over the values it
        // sorts. 'aa' shares its track with the ⓘ that explains the badge.
        // Sentence case, like every other control: these were Title Case while a transform was
        // uppercasing them and the source case never showed. "AA" stays capital because it is the
        // WCAG level, not a word.
        { key: 'aa', label: 'AA pairs' },
        { key: 'contrast', label: 'Max contrast' },
        // "Date" named the type of the value, not the event. Created, because that is what the
        // number IS: `time` is stamped once in pipeline.js when the palette is minted and no edit
        // touches it. So "Updated" would have been a plausible label for a column that never
        // updates.
        { key: 'time', label: 'Created' },
      ].map((c) => {
        const active = s.sortKey === c.key;
        const desc = active && s.sortDir === 'desc';
        const nextIsDesc = !active || s.sortDir === 'asc';
        const highLow = c.key === 'time' ? ['newest first', 'oldest first'] : ['highest first', 'lowest first'];
        return {
          key: c.key, label: c.label, active,
          // Shape, not just colour: a chevron only exists on the active column, and it points the
          // way the list is actually ordered. Weight steps up too, so the active column survives
          // both a greyscale render and a viewer who cannot separate the two inks.
          // It renders BEFORE the label (see AppView). These columns are right-aligned numerics, so
          // a trailing indicator — even in a fixed slot — pushes every header label off the edge
          // its values sit on. Leading it puts label and value on exactly the same line.
          // Direction is a ROTATION rather than a glyph swap: down for descending, 180° for
          // ascending, tweened through --ease-standard so the flip is a movement the eye can
          // follow instead of a substitution it has to re-read.
          //
          // ONE ARROW ON THE PAGE, AND IT IS THE TRUE ONE.
          //
          // Every column used to draw a dimmed chevron at rest, so that inactive columns would not
          // read as inert labels. The cost was three arrows in a header where exactly one ordering
          // is in force: two of them pointed down while describing nothing, and the reader had to
          // compare opacities to work out which was the state and which were the invitations. A
          // sort indicator is a statement about the list, and only one such statement is true.
          //
          // Discoverability is paid for by the interaction instead: the slot is still reserved on
          // every column (so no label shifts) and the chevron fades in on hover or keyboard focus —
          // see the [data-sort-chevron][data-dim] rules in global.css. Active is never carried by
          // the chevron alone in any case: the label steps to 500 and full ink, so the state
          // survives greyscale and a viewer who cannot separate the two inks (SC 1.4.1).
          showChevron: true, chevronDim: !active, dir: desc ? 'desc' : 'asc',
          pressed: active ? 'true' : 'false',
          aria: 'Sort by ' + this.SORT_LABELS[c.key] + ', ' + highLow[nextIsDesc ? 0 : 1]
            + (active ? ' (currently sorted by ' + this.SORT_LABELS[c.key] + ', ' + highLow[desc ? 0 : 1] + ')' : ''),
          onSort: () => this.setSort(c.key),
          style: this.monoLabel('var(--fs-micro)', 'var(--track-flat)', {
            // A CHIP, NOT A COLUMN. It hugs its label with the same padding on all four sides and
            // sits at its track's end, so the BOX lands on the column line and the label is centred
            // inside it. Filling the whole track was tried and removed: a tint one column wide
            // announcing a two-word label reads as the column having a state, not the control.
            //
            // THE BORDER IS LOAD-BEARING AND MUST NOT BE REMOVED. It is what carries the alignment
            // at rest — the box edge IS the grid line, which is the only way the header can be
            // seen to sit on the same column the values below it sit on. Dropping it was tried
            // once, on the theory that a header should read as a plain label; what actually
            // happened is that the header stopped declaring the grid at all, and three
            // right-aligned words floated over three columns with nothing stating the relationship.
            // The hover tint fills exactly that box, so hovering changes the chip's colour rather
            // than its shape. --line is the quietest edge the app owns; anything stronger turns a
            // header row into a table.
            //
            // Created carries no private margin any more: the header grid's --row-inset padding is
            // the 16px it used to hold for itself, and the stamp below gets the same figure from
            // the row grid — one token, both edges, cannot drift.
            width: 'auto', minWidth: 0, minHeight: '24px', justifySelf: 'end',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px',
            padding: '6px',
            border: '1px solid var(--line)', background: 'transparent', cursor: 'pointer',
            color: active ? 'var(--on-surface)' : 'var(--on-surface-muted)',
            fontWeight: active ? 500 : 400, whiteSpace: 'nowrap',
          }),
        };
      }),
      spaceStyle: { display: s.feed.length > 0 && s.feedView === 'grid' ? 'block' : 'none', position: 'fixed', inset: 0, zIndex: 90, background: 'var(--surface-raised)', overflow: this._reduce ? 'auto' : 'hidden', touchAction: this._reduce ? 'auto' : 'none', userSelect: 'none', cursor: this._reduce ? 'default' : 'grab' },
      universeEngine: !this._reduce, universeReduced: !!this._reduce,
      vignetteStyle: { position: 'absolute', inset: 0, zIndex: 3, pointerEvents: 'none', boxShadow: 'inset 0 0 120px 40px var(--surface-raised)', background: 'radial-gradient(ellipse at center, transparent 55%, color-mix(in srgb, var(--surface-raised) 72%, transparent) 100%)' },
      spaceRef: this.spaceRef, planeRef: this.planeRef, universeCloseRef: this.universeCloseRef,
      // overlay
      overlay, hasOverlay: !!s.overlay, closeOverlay: () => this.closeOverlay(),
      overlayRef: this.overlayRef, overlayBandsRef: this.overlayBandsRef, trapFocus: (e) => this.trapFocus(e),
      onBrowse: () => { if (this.fileRef.current) this.fileRef.current.click(); },
      onFile: (e) => { const f = e.target.files && e.target.files[0]; if (f) this.handleIncoming(f); e.target.value = ''; },
      onDrop: (e) => { e.preventDefault(); this.setState({ dragOver: false }); const f = e.dataTransfer.files && e.dataTransfer.files[0]; this.handleIncoming(f); },
      onDragOver: (e) => { e.preventDefault(); if (!this.state.dragOver) this.setState({ dragOver: true }); },
      onDragLeave: (e) => { e.preventDefault(); this.setState({ dragOver: false }); },
      onGridKey: (e) => this.onGridKey(e),
      fileRef: this.fileRef, canvasRef: this.canvasRef, resultRef: this.resultRef, progRef: this.progRef, gridRef: this.gridRef,
      dropStyle: { position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '24px', width: '100%', minHeight: '420px', padding: '40px', background: s.dragOver ? 'var(--surface-white)' : 'var(--surface-raised)', border: '1px ' + (s.dragOver ? 'solid' : 'dashed') + ' ' + (s.dragOver ? 'var(--on-surface)' : 'var(--line-strong)'), cursor: 'pointer', font: 'inherit', color: 'var(--on-surface)', transition: 'background var(--dur-fast) var(--ease-standard),border-color var(--dur-fast) var(--ease-standard)' },
      // ===== nav controls: theme toggle + contrast checker =====
      isDark: s.theme === 'dark' ? 'true' : 'false',
      themeLabel: s.theme === 'dark' ? 'Dark' : 'Light',
      switchTrackBg: s.theme === 'dark' ? 'var(--on-surface)' : 'var(--line-strong)',
      switchDotX: s.theme === 'dark' ? 'translateX(14px)' : 'translateX(0px)',
      toggleTheme: () => this.toggleTheme(),
      // ===== routing =====
      route: s.route,
      lenis: this._lenis,
      /* The masked-line reveal's tokens, read off the app rather than restated in pageReveal.js.
         The landing and the dropzone get theirs from the same two objects via orbit.js's
         _maskReveal, so retuning DUR.reveal or EASE.entrance now moves every masked line on the
         site at once — which is what "fluent across the site" has to mean structurally, not just
         two files that happen to agree today. 0.09 is _maskReveal's own stagger, which is a shade
         wider than DUR.stagger and deliberately so.

         Guarded exactly as _maskReveal guards, and for the same reason: render() runs before
         componentDidMount, so on the very first pass initMotion() has not defined DUR or EASE yet.
         Reading through them unguarded throws during render, React unmounts the root, and the page
         is blank — which is precisely what happened. */
      maskMotion: {
        duration: this.DUR ? this.DUR.reveal : 0.62,
        stagger: 0.09,
        ease: this.EASE ? this.EASE.entrance : 'power3.out',
      },

      /* THE COLOUR DEMONSTRATIONS' OWN ARRIVAL — a separate object from maskMotion, and the two must
         not be merged back together.

         What reads this: aboutCascade, and only for sets carrying data-reveal-focus — the swatch
         bars, the lightness ramps, the spectrum plot, the role chips, the plates. They resolve out
         of a 9px blur instead of only fading, because they are looked at rather than read and a blur
         is the one channel that still carries information at the end of a tween: a shape at 1px is
         still arriving, where a position or an opacity 95% done is simply done.

         WHY IT IS NOT maskMotion WITH MORE KEYS. It was, briefly, and it broke the thing it shared
         with. maskMotion's 0.62/0.09 is not only a look — pageReveal arms a 1500ms per-element
         deadline against it, and past that deadline rescue() does not soften the reveal, it removes
         it and the block appears in one frame. Lengthening the shared object to give the blur room
         to resolve pushed every paragraph of six lines or more past that deadline. Text and pictures
         want opposite things from an arrival; they get two contracts.

         COST. A filter is the expensive thing to animate on a page that was measured into shape, so
         it is written only onto sets that opted in and cleared the moment it lands — nothing holds a
         filter, or a will-change for one, at rest. */
      focusMotion: {
        duration: 0.9,
        ease: this.EASE ? this.EASE.reveal : 'cubic-bezier(0.215, 0.61, 0.355, 1)',
        blur: 9,
      },
      // True only while a wiped route swap is in flight, so a document route that mounts behind the
      // cover arms its reveals and waits to be released instead of playing them out of sight.
      arrivingByWipe: !!this._arrivingByWipe,
      registerPageReveal: (c) => this.registerPageReveal(c),
      /* Every in-document link goes through here. It intercepts ONLY the plain left-click that a
         router is entitled to: a modified click, a middle-click, a download, a new tab or anything
         off-origin falls through to the browser, which is what makes these real addresses rather
         than decorated buttons. */
      navigate: (e) => {
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        const a = e.currentTarget;
        if (!a || a.hasAttribute('download') || (a.target && a.target !== '_self')) return;
        let url;
        try { url = new URL(a.href, location.href); } catch (err) { return; }
        if (url.origin !== location.origin) return;
        e.preventDefault();
        this.navigateTo(url.pathname);
      },
      /* The same swap, addressed directly. AboutPage's copy is injected HTML, so its links are not
         React elements and navigate()'s currentTarget contract cannot apply — that page resolves the
         anchor with closest() and calls this. Kept as a separate entry rather than loosening
         navigate(), because navigate() being a plain onClick handler is what makes every link in JSX
         a real address with a router in front of it. */
      navigateTo: (p) => this.navigateTo(p),
      openContrast: () => this.openContrast(),
      openExport: () => this.openExport(this.contrastPalette()),
      contrastDisabled: !this.contrastPalette(),
      contrastBtnRef: this.contrastBtnRef,
      // Filing, from the action row of the palette on view. NOT contrastPalette(): that resolver
      // ends in a feed[0] fallback, which is harmless when it decides what gets INSPECTED and wrong
      // when it decides what gets MOVED. Same dialog the row's folder button and the overlay's
      // header open, so there is one way to file a palette and it says the same thing every time.
      openAssignCurrent: () => { const p = this.state.current; if (p) this.openAssign(p); },
      assignDisabled: !filedCur,
      // The button reports where the palette IS, the way the overlay's does — a filed palette
      // shows its project, so the row states the fact rather than repeating the invitation.
      assignLabel: 'Add to Project',
      assignCurAria: filedCur ? (this.palProjects(filedCur).length ? 'Add ' + filedCur.name + ' to another project, or remove it from one (currently in ' + this.palProjects(filedCur).map((id) => this.projectName(id)).join(', ') + ')' : 'Add ' + filedCur.name + ' to a project') : 'Save this palette to your archive before filing it in a project',
      navBtnStyle: { display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'none', border: '1px solid var(--action-line)', padding: 'var(--btn-pad-sm)', fontFamily: 'Neue Montreal', fontSize: 'var(--fs-label)', letterSpacing: 'var(--track-flat)', textTransform: 'uppercase', color: 'var(--on-surface)', cursor: 'pointer', lineHeight: 1, transition: 'background var(--dur-micro) var(--ease-standard),border-color var(--dur-micro) var(--ease-standard),opacity var(--dur-micro) var(--ease-standard)' },
      // React drops a value when a rerender mixes the `border` shorthand with one of its parts,
      // so a hover state that touches the border swaps the WHOLE shorthand, never borderColor alone.
      navBtnHover: { background: 'var(--surface-raised)', border: '1px solid var(--on-surface)' },
      contrast: cx, hasContrast: !!cx, closeContrast: () => this.closeContrast(), trapContrast: (e) => this.trapContrast(e),
      // delete + undo toast
      /* The toast says "<name> deleted" for a palette, whose name is the thing you would look for
         if you had deleted the wrong one. A project states its KIND instead — the deleting is done
         from a panel that lists every project by name, so the row that vanished is the answer to
         "which one", and the sentence has one job: to be the handle on Undo. The spoken form still
         names it (see the announce in deleteProject), so nothing is lost to a screen reader. */
      hasToast: !!s.toast, toastLabel: s.toast ? (s.toast.label || s.toast.name + ' deleted') : '', undoDelete: () => this.undoDelete(),
      onDismissToast: () => this.dismissUndoToast(),
      // quiet non-blocking notice (e.g. live interpreter unreachable → local fallback)
      hasNotice: !!s.notice, notice: s.notice || '',
      // per-swatch colour harmonies
      harmony, hasHarmony: !!s.harmony, closeHarmony: () => this.closeHarmony(), trapHarmony: (e) => this.trapHarmony(e),
      // token export
      export: exportView, hasExport: !!exportView,
      closeExport: () => this.closeExport(), trapExport: (e) => this.trapExport(e),
      toggleExportSemantic: () => this.setState((st) => ({ exportSemantic: !st.exportSemantic })),
      pill, result, procStatus,
    };
  },
};
