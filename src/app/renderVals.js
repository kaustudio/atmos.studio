// The view-model: renderVals() computes everything the view renders — a verbatim port of the
// design comp's renderVals. The JSX view (AppView) consumes this object untouched.
import React from 'react';
import { UNIVERSE_TILE, UNIVERSE_TILE_INSET } from './universeTile.js';
import { ROLE_IDS, ROLE_LABEL } from '../lib/exporters.js';
import { analysePalette, composeUse } from '../lib/reading.js';
import { gamutMap } from '../lib/color.js';

const MONO = 'Neue Montreal';

// ===== THE ACCESSIBILITY VERDICT — one definition, every surface =====
// Module scope rather than local to renderVals() on purpose: three surfaces report this same
// measurement (the list row, the detail panel's Accessibility group, and the universe card), and
// while each built its own they drifted — the row led with the verdict badge and a bare count, the
// other two printed a bare "2 / 10" with no verdict at all. The same palette answered the same
// question in two vocabularies depending on where you were standing. Now there is one answer and
// three places that render it.

// One vocabulary for the three capability states, used by the badge tooltip, the row's accessible
// name and the Accessibility facet — so the words never diverge between surfaces.
const A11Y_LABEL = { flexible: 'Flexible', limited: 'Limited', none: 'None' };
const A11Y_TITLE = {
  flexible: 'Flexible: enough usable text pairings to build an interface',
  limited: 'Limited: one or two usable pairings, enough for an accent',
  none: 'None: no usable text or background pairing in this palette',
};
// The group note for the Accessibility facet. It lives beside A11Y_TITLE deliberately: it says what
// the three states MEAN, which is the one thing that must never drift from the titles above it. The
// rows used to carry these meanings one per line, right-aligned and clipped — three fragments the
// eye had to assemble. Stated once, in sentences, it is shorter than the sum of the fragments and
// reads as prose instead of as a legend.
const A11Y_GROUP_NOTE = 'A palette is in one state, so choosing more than one widens. Flexible builds an interface, Limited carries an accent, None has no usable text pairing. Counts are how many palettes are in each.';
const A11Y_SPOKEN = {
  flexible: 'flexible for interface use',
  limited: 'limited to an accent',
  none: 'not usable for text',
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
  aaBadgeTitle: A11Y_TITLE[met.aaState] + '. ' + met.aaPairs + ' of ' + met.totalPairs + ' colour pairs reach WCAG AA (4.5:1)',
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
    const pill = { fontFamily: mono, fontSize: 'var(--fs-label)', letterSpacing: 'var(--track-flat)', textTransform: 'uppercase', color: 'var(--on-surface)', background: 'color-mix(in srgb, var(--on-surface) 9%, var(--surface))', border: '1px solid color-mix(in srgb, var(--on-surface) 15%, transparent)', padding: '8px 11px', lineHeight: 1 };
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
        const segOn = { fontFamily: mono, fontSize: 'var(--fs-micro)', letterSpacing: '.1em', textTransform: 'uppercase', padding: '6px 11px', cursor: 'pointer', border: '1px solid var(--on-surface)', background: 'var(--on-surface)', color: 'var(--surface)' };
        const segOff = { fontFamily: mono, fontSize: 'var(--fs-micro)', letterSpacing: '.1em', textTransform: 'uppercase', padding: '6px 11px', cursor: 'pointer', border: '1px solid var(--action-line)', background: 'none', color: 'var(--on-surface)' };
        cx = {
          name: cp.name, N, aaa, lensLabel: aaa ? 'AAA' : 'AA', threshold: th.toFixed(th % 1 ? 1 : 0),
          aa: summary.aa, total: summary.total, allPass: summary.aa === summary.total,
          large: s.contrastLarge, passOnly: s.contrastPassOnly,
          rows, textOn,
          matrixColsStyle: { display: 'flex', flexDirection: 'column', width: '100%' },
          sampleStyle: { background: best ? best.bg : 'var(--surface)', color: best ? best.fg : 'var(--on-surface)', padding: '20px', fontFamily: mono, fontSize: s.contrastLarge ? 'var(--fs-title)' : 'var(--fs-lead)', lineHeight: 1.4, fontWeight: s.contrastLarge ? 500 : 400 },
          sampleRatio: best ? best.r.toFixed(1) : '—', sampleFg: best ? best.fg.toUpperCase() : '', sampleBg: best ? best.bg.toUpperCase() : '',
          setAA: () => this.setState({ contrastLens: 'AA' }), setAAA: () => this.setState({ contrastLens: 'AAA' }),
          aaStyle: aaa ? segOff : segOn, aaaStyle: aaa ? segOn : segOff, aaPressed: aaa ? 'false' : 'true', aaaPressed: aaa ? 'true' : 'false',
          setNormal: () => this.setState({ contrastLarge: false }), setLarge: () => this.setState({ contrastLarge: true }),
          normalStyle: s.contrastLarge ? segOff : segOn, largeStyle: s.contrastLarge ? segOn : segOff,
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
        // Keyed by sid, not by position: once a refinement can reorder or remove a swatch, an
        // index key makes React reuse the wrong band node and makes a "✓ Copied" flag land on a
        // colour the user never clicked. sid follows the swatch.
        const sid = typeof b.sid === 'number' ? b.sid : i;
        const on = this.onColor(b.hex);
        const fmt = this.swatchFormats(b.hex);
        const divCol = on === '#000000' ? 'rgba(0,0,0,.16)' : 'rgba(255,255,255,.24)';
        const hoverBg = on === '#000000' ? 'rgba(0,0,0,.10)' : 'rgba(255,255,255,.16)';
        const cavBorder = on === '#000000' ? 'rgba(0,0,0,.32)' : 'rgba(255,255,255,.42)';
        const rowBase = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', width: '100%', background: 'transparent', border: 'none', borderTop: '1px solid ' + divCol, padding: '8px 14px', margin: 0, cursor: 'pointer', textAlign: 'left', color: on, transition: 'background .2s var(--ease-standard)' };
        const values = ['hex', 'rgb', 'cmyk', 'hsl'].map((key) => {
          const f = fmt[key];
          const copied = s.copied === key + '-' + sid;
          return {
            key, labelText: f.label, caveat: f.caveat, hasCaveat: !!f.caveat, copied, notCopied: !copied,
            display: copied ? 'Copied' : f.display,
            valueAnim: { display: 'inline-block', animation: (copied ? 'val-mask-a' : 'val-mask-b') + ' .38s var(--ease-entrance) both' },
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
      // Two traits visible is the audit's number and it is also where the row stops being scannable:
      // four capitalised pills read as a legend rather than a description.
      const useLine = composeUse(analysePalette(s.current.swatches), curMet.aaState);
      const allTraits = s.current.descriptors || [];
      const moreCount = Math.max(0, allTraits.length - 2);
      result = {
        name: s.current.name, rationale: s.current.rationale, descriptors: allTraits, bands,
        refImage: _ref, hasRef: _hasRef, noRef: !_hasRef, refImageNode, detailMeta,
        useLine,
        traits: s.readingOpen ? allTraits : allTraits.slice(0, 2),
        hasMore: moreCount > 0 || !!s.current.rationale,
        moreLabel: moreCount ? 'More · ' + moreCount : 'More',
        // Square while it is a close mark, so the ✕ sits in the middle of its own box rather than
        // inheriting padding shaped for a word.
        moreStyle: {
          background: 'none', border: '1px solid var(--action-line)', cursor: 'pointer',
          fontFamily: 'Neue Montreal', fontSize: 'var(--fs-label)', letterSpacing: 'var(--track-flat)',
          textTransform: 'uppercase', color: 'var(--on-surface)',
          ...(s.readingOpen
            ? { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '26px', height: '26px', padding: 0 }
            : { padding: '5px 9px' }),
        },
        moreAria: s.readingOpen ? 'Hide the reading and the remaining traits' : 'Show the reading and the remaining traits',
        readingOpen: !!s.readingOpen,
        onMore: () => this.toggleReading(),
        traitBase: 2,
      };
    }
    // palette-level copy affordances
    const palBtn = { fontFamily: mono, fontSize: 'var(--fs-label)', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--on-surface)', background: 'var(--surface-white)', border: '1px solid var(--on-surface)', padding: '9px 14px', cursor: 'pointer', transition: 'background .15s ease,color .15s ease' };
    const copyPal = (kind) => { if (!s.current) return; if (kind === 'hex') this.copy(this.paletteHexList(s.current), 'pal-hex', 'Copied all ' + s.current.swatches.length + ' colours as a hex list'); else this.copy(this.paletteCss(s.current), 'pal-css', 'Copied palette as CSS custom properties'); };

    let procStatus = '';
    if (busy) { const STEPS = ['Reading light', 'Sampling the field', 'Clustering in OKLCH', 'Naming the mood']; procStatus = STEPS[Math.min(s.procStep, 3)] + '…'; }

    const curId = s.stage === 'result' && s.current ? s.current.id : null;
    // The card's spoken form. Its metrics grid is aria-hidden (it is the visual layer), so whatever
    // the card SHOWS has to be said here or it is said nowhere — and the card shows the same readout
    // the list row does. Same clause order as the row's aria, so moving between views does not
    // change the shape of the sentence.
    const itemAria = (p, met) => 'Open ' + p.name + ' detail. Mood: ' + p.descriptors.join(', ')
      + '. Dominant hue ' + met.hue + ' degrees, ' + met.temp.toLowerCase()
      + '. Accessibility ' + A11Y_SPOKEN[met.aaState] + ': ' + met.aaPairs + ' of ' + met.totalPairs
      + ' pairs reach 4.5 to 1, maximum contrast ' + met.contrastMax.toFixed(1) + ' to 1'
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
    const aaCell = { display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', paddingRight: 'var(--row-cell-inset)', whiteSpace: 'nowrap' };
    // 2ch of tabular figures: the count runs 0–10, and a cluster that changed width with the digit
    // would slide the badge left and right down the list — the one column where a wobble is most
    // visible, because the badges are a stack of identical glyphs.
    const metricValue = { minWidth: '2ch', textAlign: 'right', fontFamily: mono, fontSize: 'var(--fs-label)', letterSpacing: 'var(--track-flat)', textTransform: 'uppercase', color: 'var(--on-surface)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' };
    const contrastCell = { textAlign: 'right', paddingRight: 'var(--row-cell-inset)', fontFamily: mono, fontSize: 'var(--fs-label)', letterSpacing: 'var(--track-flat)', textTransform: 'uppercase', color: 'var(--on-surface)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' };
    // The same inset as its neighbours — the difference is what it is measured against. For them
    // it is space before the next column; for this one there is no next column, so it pairs with
    // the row's own 8px to make the 16px margin the palette keeps on the other side. The stamp has
    // not moved a pixel; the 8 it used to leave to the row's padding it now holds itself, which is
    // what lets the sort header above it be a button rather than a column-wide slab.
    const timeCell = { textAlign: 'right', paddingRight: 'var(--row-cell-inset)', fontFamily: mono, fontSize: 'var(--fs-micro)', letterSpacing: 'var(--track-flat)', textTransform: 'uppercase', color: 'var(--on-surface-muted)', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' };
    const listDecorated = s.feedView === 'list' ? listRows : scoped.map((p) => ({ p, met: this.paletteMetrics(p) }));
    const feedList = listDecorated.map(({ p, met }) => {
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
        // muted token clears that at 6.06:1 with almost no headroom — mixing it even 10% toward the
        // surface already fails. So the step down is 9 → 8.5px, an existing scale step, and the ink
        // stays on the token.
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
        tagBtnBase: { position: 'relative', zIndex: 2, fontFamily: 'Neue Montreal', fontSize: 'var(--fs-nano)', letterSpacing: 'var(--track-flat)', textTransform: 'uppercase', background: 'none', border: 0, padding: '4px 8px', margin: 0, cursor: busy ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' },
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
        aria: (isCur ? 'Currently viewing ' + p.name + '. ' : 'Load ' + p.name + ' into the result. ') + 'Mood: ' + p.descriptors.join(', ') + '. Dominant hue ' + met.hue + ' degrees, ' + met.temp.toLowerCase() + '. Accessibility ' + A11Y_SPOKEN[met.aaState] + ': ' + met.aaPairs + ' of ' + met.totalPairs + ' pairs reach 4.5 to 1, maximum contrast ' + met.contrastMax.toFixed(1) + ' to 1. Generated ' + this.relTime(p.time),
        onClick: (e) => { if (!busy) this.loadIntoResult(p, e && e.currentTarget); },
        onDelete: (e) => { if (e && e.stopPropagation) e.stopPropagation(); const wrap = e && e.currentTarget && e.currentTarget.closest('[data-row-wrap]'); this.deletePalette(p.id, wrap); },
        deleteAria: 'Delete ' + p.name,
        onAssign: (e) => { if (e && e.stopPropagation) e.stopPropagation(); this.openAssign(p); },
        assignAria: 'Move ' + p.name + ' to a project',
        isExample: p.example === true,
        projectLabel: p.projectId ? this.projectName(p.projectId) : '', hasProject: !!p.projectId,
        onEnter: (e) => this.rowTintOn(e.currentTarget),
        onLeave: (e) => this.rowTintOff(e.currentTarget),
        onFocus: (e) => this.rowTintOn(e.currentTarget),
        rowid: p.id,
        rowStyle: { position: 'relative', display: 'flex', flexDirection: 'column', width: '100%', textAlign: 'left', background: isCur ? 'var(--surface-white)' : 'var(--surface-raised)', border: '0', borderTop: '1px solid var(--line)', padding: '0', margin: 0, cursor: busy ? 'not-allowed' : 'pointer', font: 'inherit', opacity: busy ? 0.45 : 1 },
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
            valueAnim: { display: 'inline-block', animation: (copied ? 'val-mask-a' : 'val-mask-b') + ' .38s var(--ease-entrance) both' },
            aria: 'Copy ' + f.label + ' value ' + f.copy + ' for swatch ' + (i + 1) + (f.caveat ? ', ' + f.caveat : ''),
            onCopy: () => this.copy(f.copy, 'ov-' + key + '-' + i, 'Copied ' + f.copy),
            rowStyle: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', width: '100%', background: 'transparent', border: 'none', borderTop: '1px solid ' + divCol, padding: '8px 14px', margin: 0, cursor: 'pointer', textAlign: 'left', color: on, transition: 'background .2s var(--ease-standard)' },
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
        // pretending to be a feature. Round 2 builds a real selection model on the Refine surface,
        // and leaving a dead one next to it is how the next person ends up wiring the wrong one.
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
        assignAria: p.projectId ? 'Move ' + p.name + ' to another project (currently in ' + this.projectName(p.projectId) + ')' : 'Add ' + p.name + ' to a project',
        // The state, then the project, so the button says where the palette IS and not only what
        // pressing it will do. A bare project name read as a filter; "Add to project" on a palette
        // already filed read as a second copy.
        assignLabel: p.projectId ? 'In ' + this.projectName(p.projectId) : 'Add to project',
        // Which format was copied, drawn by the view on the trigger that was pressed.
        copyDone: s.copied === 'ov-pal-hex' ? 'Hex list' : s.copied === 'ov-pal-css' ? 'CSS variables' : '',
        copyHexList: () => { this.closeTip('copyMenuOpen', '[data-copy-menu]'); this.copy(this.paletteHexList(p), 'ov-pal-hex', 'Copied all ' + p.swatches.length + ' colours as a hex list'); this._focusCopyTrigger(true); },
        copyCss: () => { this.closeTip('copyMenuOpen', '[data-copy-menu]'); this.copy(this.paletteCss(p), 'ov-pal-css', 'Copied palette as CSS custom properties'); this._focusCopyTrigger(true); },
      };
    }

    // --- per-swatch colour harmonies (OKLCH-derived, gamut-mapped) ---
    let harmony = null;
    if (s.harmony) {
      const baseHex = s.harmony.hex;
      const groups = this.harmonyGroups(baseHex).map((grp, gi) => ({
        name: grp.name, count: String(grp.hexes.length),
        cells: grp.hexes.map((hx, ci) => {
          const HX = hx.toUpperCase(), on = this.onColor(hx), copied = s.copied === 'hx-' + gi + '-' + ci, isBase = HX === baseHex;
          return {
            hex: HX, display: copied ? 'Copied' : HX, isBase,
            aria: 'Copy harmony colour ' + HX + (isBase ? ' (source colour)' : ''),
            onCopy: () => this.copy(HX, 'hx-' + gi + '-' + ci, 'Copied ' + HX),
            style: { flex: 1, minWidth: 0, height: '56px', background: hx, border: 'none', color: on, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '7px 8px', cursor: 'pointer', position: 'relative' },
            hover: { filter: this.lumHex(hx) < 0.08 ? 'brightness(1.35)' : 'brightness(0.88)' }, active: { filter: this.lumHex(hx) < 0.08 ? 'brightness(1.5)' : 'brightness(0.82)' },
            markStyle: { position: 'absolute', top: '7px', left: '8px', width: '5px', height: '5px', background: on, opacity: isBase ? 0.9 : 0, display: 'block' },
            hexStyle: { fontFamily: mono, fontSize: 'var(--fs-micro)', letterSpacing: '.02em', color: on, whiteSpace: 'nowrap' },
          };
        }),
      }));
      harmony = {
        hex: baseHex, groups,
        swatchStyle: { width: '26px', height: '26px', flex: 'none', background: baseHex, border: '1px solid var(--line-strong)' },
      };
    }

    // --- token export dialog ---
    let exportView = null;
    if (s.exportOpen && s.exportPalette) {
      const p = s.exportPalette, semantic = !!s.exportSemantic;
      const itemBase = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', width: '100%', textAlign: 'left', background: 'var(--surface-raised)', border: '1px solid var(--line)', padding: '12px 14px', cursor: 'pointer', font: 'inherit', color: 'var(--on-surface)' };
      const mk = (id, label, ext) => ({ label, ext, onPick: () => this.doExport(p, id, semantic), onEnter: (e) => this.rowTintOn(e.currentTarget), onLeave: (e) => this.rowTintOff(e.currentTarget), onFocus: (e) => this.rowTintOn(e.currentTarget), onBlur: (e) => this.rowTintOff(e.currentTarget), style: itemBase, extStyle: { fontFamily: mono, fontSize: 'var(--fs-micro)', letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--on-surface-muted)', flex: 'none' }, labelStyle: { fontFamily: 'Neue Montreal', fontSize: 'var(--fs-body)', color: 'var(--on-surface)' } });
      exportView = {
        name: p.name, semanticOn: semantic, semanticChecked: semantic ? 'true' : 'false',
        layerLabel: semantic ? 'Exporting the semantic scaffold. Refine before shipping.' : 'Exporting the primitive layer (swatches by weight).',
        formats: [
          mk('tailwind', 'Tailwind v4', '@theme · css'),
          mk('tokens', 'Design tokens (W3C)', 'json'),
          mk('figma', 'Figma variables', 'json'),
          mk('css', 'CSS custom properties', 'css'),
          mk('ase', 'Adobe swatches', 'ase'),
        ],
        toggleTrackStyle: { position: 'relative', display: 'inline-block', width: '34px', height: '18px', flex: 'none', background: semantic ? 'var(--on-surface)' : 'var(--line-strong)', transition: 'background .2s var(--ease-standard)', cursor: 'pointer' },
        toggleDotStyle: { position: 'absolute', left: '2px', top: '2px', width: '14px', height: '14px', background: 'var(--surface)', transform: semantic ? 'translateX(16px)' : 'translateX(0px)', transition: 'transform .2s var(--ease-standard)' },
        semanticTrackBg: semantic ? 'var(--on-surface)' : 'var(--line-strong)',
        semanticDotX: semantic ? 'translateX(14px)' : 'translateX(0px)',
        semanticLabel: semantic ? 'On' : 'Off',
      };
    }

    // --- projects: filter chips + assign/manage dialog data ---
    const chipStyle = (active) => ({ position: 'relative', zIndex: 1, fontFamily: 'Neue Montreal', fontSize: 'var(--fs-label)', letterSpacing: 'var(--track-flat)', textTransform: 'uppercase', padding: '6px 12px', cursor: 'pointer', border: 'none', background: 'transparent', color: active ? 'var(--surface)' : 'var(--on-surface-muted)', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '7px', transition: this._reduce ? 'none' : 'color .2s var(--ease-standard)' });
    const countStyle = (active) => ({ fontFamily: mono, fontSize: 'var(--fs-nano)', opacity: 0.7, color: active ? 'var(--surface)' : 'var(--on-surface-muted)' });
    const mkChip = (id, label) => { const active = s.activeProject === id; const count = (id === null) ? s.feed.length : (id === '__unfiled__') ? s.feed.filter((p) => !p.projectId).length : s.feed.filter((p) => p.projectId === id).length; return { key: String(id), label, count: String(count), active, chipStyle: chipStyle(active), countStyle: countStyle(active), onClick: () => this.setActiveProject(id), aria: 'Show ' + label + ', ' + count + ' palette' + (count === 1 ? '' : 's') + (active ? ' (current filter)' : '') }; };
    // Zero-result suppression on the project scopes: a scope whose count is 0 leads nowhere, so it
    // is not offered — EXCEPT the scope currently active (it must stay on screen to be left) and
    // All, which is the home scope, not a filter. Unfiled follows the same rule as real projects.
    const projCount = (id) => (id === null) ? s.feed.length : (id === '__unfiled__') ? s.feed.filter((p) => !p.projectId).length : s.feed.filter((p) => p.projectId === id).length;
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
    const facetOptions = [...tagCounts.keys()]
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
    // One removable chip per selected tag, in the order they were picked, so the narrowing reads as
    // a sentence you can dismantle from either end. The count on the LAST chip is the live result
    // size; earlier chips show what the selection was worth at that point, which is why only the
    // final one carries a number — two numbers that mean different things is worse than one.
    const focusFacetBtn = () => requestAnimationFrame(() => { const b = document.querySelector('[data-facet-btn]'); if (b) try { b.focus(); } catch (e) { } });
    // Chips for BOTH groups, accessibility first so the chip order matches the panel's group order.
    // Only the final chip carries the live result count — two numbers meaning different things
    // beside each other is worse than one.
    const appliedRaw = activeA11y.map((v) => ({
      key: 'a11y:' + v, label: A11Y_LABEL[v],
      aria: 'Remove the ' + A11Y_LABEL[v].toLowerCase() + ' accessibility filter',
      onRemove: () => { this.setA11yFilter(v); focusFacetBtn(); },
    })).concat(MEAS_CHIPS(this, s, focusFacetBtn)).concat(activeTags.map((t) => ({
      key: 'tag:' + t, label: t,
      aria: 'Remove the ' + t + ' filter',
      onRemove: () => { this.setActiveTag(t); focusFacetBtn(); },
    })));
    const scopedNow = this.scopedFeed(s.feed).length;
    const appliedTags = appliedRaw.map((c, i) => Object.assign({}, c, { count: i === appliedRaw.length - 1 ? String(scopedNow) : '' }));

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

    // ---- the Contrast potential facet: OR within the group, exhaustive over the archive ----
    // Ordered most-capable first, which is the order anyone shopping for a usable palette wants.
    // Zero-result suppression applies as it does to tags: a state nothing has is not offered,
    // unless it is already selected (it must stay reachable to be removed).
    // The universal case reaches this group too, and matters more here than in tags: because the
    // states partition the archive, "every palette here is Limited" can be the whole truth about a
    // view. Suppressed, it left one lone checkbox that did nothing and no clue why; stated, it
    // answers the question the group exists to answer without the user having to click.
    const a11yOptions = ['flexible', 'limited', 'none'].map((v) => {
      const n = a11yBase.filter((p) => this.paletteMetrics(p).aaState === v).length;
      const active = activeA11y.indexOf(v) >= 0;
      const disabled = !active && n > 0 && n === a11yBase.length;
      return {
        key: v, label: A11Y_LABEL[v], count: String(n), active, pressed: active ? 'true' : 'false',
        // No hint any more — what the state means is said once, above the group (A11Y_GROUP_NOTE).
        // The reason survives because it says something else entirely: not what this state is, but
        // why THIS row cannot be picked, which is true of one row at a time and only sometimes.
        disabled, reason: disabled ? 'Every palette here' : '',
        aria: disabled
          ? 'All ' + n + ' of these palettes are ' + A11Y_LABEL[v].toLowerCase() + ', so this cannot narrow them further'
          : (active ? 'Remove the ' : 'Filter to ') + A11Y_LABEL[v].toLowerCase() + ' accessibility, ' + n + ' palette' + (n === 1 ? '' : 's'),
        onPick: disabled ? () => {} : () => this.setA11yFilter(v),
        show: n > 0 || active,
      };
    }).filter((o) => o.show);

    let assignView = null;
    if (s.assignPalette) {
      const pal = s.assignPalette;
      const optStyle = (cur) => ({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', width: '100%', textAlign: 'left', background: 'var(--surface-raised)', border: '1px solid ' + (cur ? 'var(--on-surface)' : 'var(--line)'), padding: '11px 14px', cursor: 'pointer', font: 'inherit', color: 'var(--on-surface)' });
      const mkOpt = (id, label) => { const cur = (pal.projectId || null) === (id || null); return { key: String(id), label, current: cur, markStyle: { width: '6px', height: '6px', flex: 'none', background: 'var(--on-surface)', opacity: cur ? 1 : 0 }, style: optStyle(cur), onEnter: (e) => this.rowTintOn(e.currentTarget), onLeave: (e) => this.rowTintOff(e.currentTarget), onFocus: (e) => this.rowTintOn(e.currentTarget), onBlur: (e) => this.rowTintOff(e.currentTarget), onPick: () => this.pickAssign(id), aria: 'Move ' + pal.name + ' to ' + label + (cur ? ' (current)' : '') }; };
      assignView = {
        name: pal.name, options: [mkOpt(null, 'Unfiled'), ...s.projects.map((pr) => mkOpt(pr.id, pr.name))],
        onCreate: (e) => { const inp = document.querySelector('[data-assign-new]'); const v = inp ? inp.value : ''; if (v && v.trim()) { this.newProjectAndAssign(v.trim()); } },
        onCreateKey: (e) => { if (e.key === 'Enter') { e.preventDefault(); const v = e.currentTarget.value; if (v && v.trim()) this.newProjectAndAssign(v.trim()); } },
      };
    }

    let manageView = null;
    if (s.manageProjects) {
      manageView = {
        empty: !hasProjects, rows: s.projects.map((pr) => {
          const count = s.feed.filter((p) => p.projectId === pr.id).length; return {
            id: pr.id, name: pr.name, count: count + ' palette' + (count === 1 ? '' : 's'),
            onRename: (e) => { const inp = document.querySelector('[data-proj-name="' + pr.id + '"]'); if (inp && inp.value.trim() && inp.value.trim() !== pr.name) this.renameProject(pr.id, inp.value.trim()); },
            onRenameKey: (e) => { if (e.key === 'Enter') { e.preventDefault(); const v = e.currentTarget.value; if (v.trim()) this.renameProject(pr.id, v.trim()); e.currentTarget.blur(); } },
            onDelete: () => this.deleteProject(pr.id), deleteAria: 'Delete project ' + pr.name + ' (its palettes move to Unfiled)',
          };
        }),
        onCreate: () => { const inp = document.querySelector('[data-manage-new]'); if (inp && inp.value.trim()) { this.createProject(inp.value.trim()); inp.value = ''; inp.focus(); } },
        onCreateKey: (e) => { if (e.key === 'Enter') { e.preventDefault(); const v = e.currentTarget.value; if (v.trim()) { this.createProject(v.trim()); e.currentTarget.value = ''; } } },
      };
    }

    // ===== the Refine surface =====
    // ONE DECISION FIRST: pick a swatch. Everything below the strip is that swatch's properties,
    // and nothing else on the surface competes to identify it.
    //
    // The first build had three systems doing that job — a strip, a full-height Roles list, and a
    // heading that recited role, position and hex at one weight — so there was no single source of
    // truth for the selection and no obvious first move. The Roles list is a menu now, position is
    // a menu, and the heading leads with the one word that matters.
    let refineView = null;
    if (s.refineOpen && s.current) {
      const p = s.current;
      const list = p.swatches;
      const N = list.length;
      const selIdx = Math.max(0, Math.min(s.refineSel || 0, N - 1));
      const sel = list[selIdx];
      const selC = Math.sqrt(sel.a * sel.a + sel.b * sel.b);
      let selH = Math.atan2(sel.b, sel.a) * 180 / Math.PI; if (selH < 0) selH += 360;
      const selHr = selH * Math.PI / 180;
      const resolved = this.semanticRoles(p, p.roles);
      const roleAt = {};
      resolved.forEach((r) => { (roleAt[r.index] = roleAt[r.index] || []).push(r.role); });
      const assigned = p.roles || {};
      const selRoles = (roleAt[selIdx] || []).map((r) => ROLE_LABEL[r]);
      const curMet = this.paletteMetrics(p);
      refineView = {
        name: p.name,
        selIdx, selHex: sel.hex.toUpperCase(),
        // SWATCH-FIRST, and this is an object-model decision rather than a typographic one.
        //
        // The heading led with the role for a while, which quietly said the user was editing a
        // token — a fixed slot in a design system. But this tool reads palettes off photographs and
        // lets you reorder and remove them, and none of that is true of a token: a required slot
        // cannot be deleted. Two models were being presented as one, which is what made Remove and
        // Position feel like they did not belong.
        //
        // So the object is the SWATCH. It leads. The role is an assignment made TO it, stated as
        // metadata directly under it, and changed from the structure section below.
        // Swatch and value, and nothing else. The role was restated here as well as in Palette
        // structure — the same fact in two places, only one of which could act on it.
        selTitle: 'Swatch ' + (selIdx + 1) + ' · ' + sel.hex.toUpperCase(),
        selCount: (selIdx + 1) + ' of ' + N,
        total: N,
        // Named, not decorative: a labelled control that opens the reference at size, through the
        // lightbox the result view already uses. A bare thumbnail beside a heading reads as
        // ornament, and the question it answers — am I correcting the extraction or leaving it? —
        // deserves to be asked out loud.
        hasSource: this.hasImg(p), sourceUrl: this.dispUrl(p),
        sourceAria: 'View the reference image this palette was read from, at full size',
        // VALIDATE — a live work surface, and specifically about CONTRAST. It was called
        // "Accessibility impact", which promises far more than it measures: this evaluates text
        // contrast, not focus order, not motion, not language. Naming the actual metric is the
        // difference between a measurement and a claim.
        //
        // The count is the whole status. A "Partial coverage" badge sat beside it for a revision,
        // restating in a word what the fraction already said exactly.
        a11y: (() => {
          const rc = this.roleContrast(p, selIdx);
          if (!rc) return null;
          const f = rc.focus;
          return {
            count: rc.passed + ' / ' + rc.total + ' meet AA',
            countStyle: { fontFamily: mono, fontSize: 'var(--fs-body)', letterSpacing: 'var(--track-flat)', color: 'var(--on-surface)', fontVariantNumeric: 'tabular-nums' },
            pairRoles: ROLE_LABEL[f.fg] + ' on ' + ROLE_LABEL[f.bg],
            pairHex: f.fgHex + ' on ' + f.bgHex,
            pairRatio: f.ratio.toFixed(1) + ':1',
            pairLevel: f.aaa ? 'AAA' : f.aa ? 'AA' : 'Fails AA',
            pairLevelStyle: { fontFamily: mono, fontSize: 'var(--fs-micro)', letterSpacing: 'var(--track-flat)', textTransform: 'uppercase', fontWeight: 500, padding: '2px 6px', background: f.aa ? 'var(--status-flexible-surface)' : 'var(--status-none-surface)', color: f.aa ? 'var(--status-flexible-ink)' : 'var(--status-none-ink)', border: '1px solid ' + (f.aa ? 'var(--status-flexible-line)' : 'var(--status-none-line)') },
            sampleStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: '76px', height: '58px', flex: 'none', background: f.bgHex, color: f.fgHex, fontFamily: mono, fontSize: 'var(--fs-title)', lineHeight: 1 },
            // Depth on demand: the full matrix is available, and stays out of the way until asked.
            // A DRILL-IN, not an accordion. Expanding inside the card pushed Palette structure
            // down the page whenever anyone looked at the detail — the layout shift an editor
            // cannot afford, because the canvas has to hold still while you work.
            allOpen: !!s.refineAllPairs,
            allLabel: 'Pairings (' + rc.total + ')',
            toggleAll: () => this.openPairings(),
            closePairings: () => this.closePairings(),
            rows: rc.pairs.map((x) => ({
              key: x.fg + '-' + x.bg,
              roles: ROLE_LABEL[x.fg] + ' on ' + ROLE_LABEL[x.bg],
              ratio: x.ratio.toFixed(1) + ':1',
              level: x.aaa ? 'AAA' : x.aa ? 'AA' : 'Fails',
              chipStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: '26px', height: '18px', flex: 'none', background: x.bgHex, color: x.fgHex, fontFamily: mono, fontSize: 'var(--fs-label)', lineHeight: 1 },
              levelStyle: { fontFamily: mono, fontSize: 'var(--fs-nano)', letterSpacing: 'var(--track-flat)', textTransform: 'uppercase', color: x.aa ? 'var(--on-surface)' : 'var(--on-surface-muted)', whiteSpace: 'nowrap' },
            })),
            aria: rc.passed + ' of ' + rc.total + ' text-role pairs meet AA. ' + ROLE_LABEL[f.fg] + ' on ' + ROLE_LABEL[f.bg] + ', ' + f.ratio.toFixed(1) + ' to 1, ' + (f.aaa ? 'AAA' : f.aa ? 'AA' : 'fails AA') + '.',
          };
        })(),
        onKey: (e) => this.refineKey(e),
        swatches: list.map((b, i) => {
          const on = this.onColor(b.hex);
          const isSel = i === selIdx;
          const names = (roleAt[i] || []).map((r) => ROLE_LABEL[r]);
          return {
            sid: typeof b.sid === 'number' ? b.sid : i,
            hex: b.hex, index: i, selected: isSel, pressed: isSel ? 'true' : 'false',
            tab: isSel ? 0 : -1,
            // ONE role name and a count, never a truncated one. A band's width is its share of the
            // palette, which has nothing to do with how much text it has to carry, so "Primary ·
            // Secondary" was first wrapped and then clipped to "PRIMARY · SECO…". A label that
            // breaks because a colour happens to be narrow is a label that failed. The minimum
            // width below fits the longest single role name at this size; the extras are a count,
            // and the full list is in the heading, the tooltip and the accessible name.
            // A ROLE NAME, nothing else. This carried "Primary +1" for a while, which is the
            // system's own bookkeeping showing through: a count of assignments is not a label a
            // designer has any use for. The rest of a swatch's roles are in the heading, the
            // tooltip and the accessible name, where a list belongs.
            roleLabel: names.length ? names[0] : '',
            hasRoles: !!names.length,
            aria: (names.length ? names.join(' and ') : 'No role') + '. Swatch ' + (i + 1) + ' of ' + N + ', ' + b.hex.toUpperCase() + '.',
            title: (names.length ? names.join(' · ') + ' — ' : '') + b.hex.toUpperCase(),
            onSelect: () => this.refineSelect(i),
            // Selection targets ONLY. A ✕ lived here for a revision, which put an unlabelled
            // destructive control inside the one element whose whole job is to be safe to click.
            style: { position: 'relative', flexGrow: this.swatchGrow(b), flexBasis: 0, minWidth: '92px', height: '96px', background: b.hex, border: 'none', padding: '9px 9px', cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', color: on, overflow: 'hidden' },
            labelStyle: this.monoLabel('var(--fs-nano)', '.14em', { color: on, opacity: 0.75, textAlign: 'left', lineHeight: 1.3, whiteSpace: 'nowrap' }),
          };
        }),
        // Colour is the main area and the only thing in it.
        sliders: [
          {
            key: 'l', label: 'Lightness', min: 0, max: 1, step: 0.005, value: sel.L,
            display: Math.round(sel.L * 100), unit: '%', numMin: 0, numMax: 100, numStep: 1,
            valueText: Math.round(sel.L * 100) + ' percent',
            track: rampTrack(9, (t) => gamutMap(t, selC * Math.cos(selHr), selC * Math.sin(selHr))),
            onInput: (e) => this.refineAdjust(selIdx, 'l', parseFloat(e.target.value)),
            onNumber: (e) => { const v = parseFloat(e.target.value); if (isFinite(v)) this.refineAdjust(selIdx, 'l', Math.max(0, Math.min(100, v)) / 100); },
          },
          {
            key: 'c', label: 'Chroma', min: 0, max: 0.33, step: 0.002, value: selC,
            display: selC.toFixed(3), unit: '', numMin: 0, numMax: 0.33, numStep: 0.001,
            valueText: selC.toFixed(3),
            track: rampTrack(7, (t) => gamutMap(sel.L, t * 0.33 * Math.cos(selHr), t * 0.33 * Math.sin(selHr))),
            onInput: (e) => this.refineAdjust(selIdx, 'c', parseFloat(e.target.value)),
            onNumber: (e) => { const v = parseFloat(e.target.value); if (isFinite(v)) this.refineAdjust(selIdx, 'c', Math.max(0, Math.min(0.33, v))); },
          },
          {
            // The hue track is a LEGEND for the axis, not a preview: drawn at the swatch's own
            // lightness it goes black on a dark colour, which is a hue wheel with no hue in it.
            key: 'h', label: 'Hue', min: 0, max: 360, step: 1, value: selH,
            display: Math.round(selH), unit: '°', numMin: 0, numMax: 360, numStep: 1,
            valueText: Math.round(selH) + ' degrees',
            track: rampTrack(13, (t) => { const a = t * 2 * Math.PI, L = Math.min(0.74, Math.max(0.5, sel.L)), C = Math.max(selC, 0.11); return gamutMap(L, C * Math.cos(a), C * Math.sin(a)); }),
            onInput: (e) => this.refineAdjust(selIdx, 'h', parseFloat(e.target.value)),
            onNumber: (e) => { const v = parseFloat(e.target.value); if (isFinite(v)) this.refineAdjust(selIdx, 'h', ((v % 360) + 360) % 360); },
          },
        ],
        // ROLE — demoted from a column to a menu. It was consuming half the working area to restate
        // what the strip's own labels already say, while reading as a second thing to navigate.
        // ROLE — STATED, then changed. The menu here used to list all six roles with their swatch
        // numbers, which turned a local act into a system inspector: to change one role you read
        // the whole palette-to-role map. The current role is now a plain statement, and the chooser
        // offers roles — naming a consequence only for the one role that would actually move.
        //
        // It opens INLINE, never as an overlay. The old dropdown covered the sliders, so choosing a
        // role hid the colour it was being given to.
        roleLine: selRoles.length ? selRoles.join(' · ') : 'None',
        roleChooserOpen: !!s.refineRoleOpen,
        roleTrigger: s.refineRoleOpen ? 'Close' : (selRoles.length ? 'Change role' : 'Assign role'),
        roleTriggerAria: (s.refineRoleOpen ? 'Close the role chooser' : (selRoles.length ? 'Change the role of' : 'Assign a role to') + ' swatch ' + (selIdx + 1)),
        toggleRoleChooser: () => this.toggleFold('refineRoleOpen', '[data-refine-roles]'),
        roleItems: ROLE_IDS.map((id) => {
          const r = resolved.find((x) => x.role === id);
          const here = r.index === selIdx;
          const moves = !here && typeof assigned[id] === 'number';
          return {
            id, label: ROLE_LABEL[id], here, pressed: here ? 'true' : 'false',
            // The consequence, and only where there is one: a role the user has deliberately put
            // somewhere else will move if it is taken. A derived role moving is not news.
            consequence: moves ? ROLE_LABEL[id] + ' is currently assigned to swatch ' + (r.index + 1) + '.' : '',
            aria: here ? 'Remove ' + ROLE_LABEL[id] + ' from this swatch'
              : 'Give ' + ROLE_LABEL[id] + ' to swatch ' + (selIdx + 1) + (moves ? '. It is currently assigned to swatch ' + (r.index + 1) : ''),
            onPick: () => { this.refineSetRole(id, selIdx); this.closeFold('refineRoleOpen', '[data-refine-roles]'); },
          };
        }),
        // POSITION — direct, reversible, and therefore never behind a menu. Two visible controls
        // that disable at the ends, so whether a move is possible is legible without opening
        // anything. They were a Reorder dropdown for one revision, which added a click and hid the
        // answer to "can this move?" behind it.
        canLeft: selIdx > 0, canRight: selIdx < N - 1,
        leftAria: 'Move this swatch to position ' + selIdx + ' of ' + N,
        rightAria: 'Move this swatch to position ' + (selIdx + 2) + ' of ' + N,
        onLeft: () => this.refineMove(selIdx, -1), onRight: () => this.refineMove(selIdx, 1),
        posLabel: 'Position ' + (selIdx + 1) + ' of ' + N,
        // REMOVAL — quiet by POSITION, never by ink. The system has two action tiers and killed a
        // third for failing contrast on hover, so a destructive control cannot be made softer by
        // going grey. It is separated instead: its own end of the row, behind a rule, with the
        // consequence stated under it rather than hidden in a tooltip.
        // REMOVAL: separated and low priority, no heading of its own.
        canRemove: N > 3,
        removeAria: 'Remove swatch ' + (selIdx + 1) + ', ' + sel.hex.toUpperCase() + '. You will be asked to confirm.',
        onRemoveArm: () => this.refineArmRemove(selIdx),
        removeArmed: typeof s.refineRemoveIdx === 'number',
        removeIdx: s.refineRemoveIdx,
        removeTitle: typeof s.refineRemoveIdx === 'number'
          ? 'Remove swatch ' + (s.refineRemoveIdx + 1) + ', ' + (list[s.refineRemoveIdx] ? list[s.refineRemoveIdx].hex.toUpperCase() : '') + '?'
          : '',
        removeLines: (() => {
          const i = s.refineRemoveIdx;
          if (typeof i !== 'number' || !list[i]) return [];
          const rn = (roleAt[i] || []).map((x) => ROLE_LABEL[x]);
          return [
            rn.length ? rn.join(' and ') + (rn.length > 1 ? ' move to other swatches.' : ' moves to another swatch.') : 'This swatch carries no role.',
            'Contrast is recalculated across the remaining ' + (N - 1) + ' colours.',
          ];
        })(),
        onRemoveCancel: () => this.refineCancelRemove(),
        onRemoveConfirm: () => this.refineConfirmRemove(),
        canUndo: !!(this._refineUndo && this._refineUndo.length),
        onUndo: () => this.refineUndo(),
        undoAria: 'Undo the last refinement. Keyboard shortcut: ' + (this._isMac() ? 'Command Z' : 'Control Z'),
        undoKeys: this._isMac() ? '⌘Z' : 'Ctrl Z',
        // Reset throws away every refinement, so it asks once. Two-step in place rather than a
        // dialog: a confirmation stacked on top of a modal is a lot of ceremony for an act that
        // Undo can also reach.
        canReset: !!(p.sourceSwatches || p.roles),
        resetArmed: !!s.refineResetArmed,
        resetLabel: s.refineResetArmed ? 'Confirm reset' : 'Reset palette',
        resetAria: s.refineResetArmed
          ? 'Confirm: discard every refinement and return to the colours read from the image'
          : 'Reset palette. Discards every refinement; you will be asked to confirm',
        onReset: () => {
          if (this.state.refineResetArmed) { this.setState({ refineResetArmed: false }); this.refineReset(); }
          else this.setState({ refineResetArmed: true, announce: 'Reset palette will discard every refinement. Activate again to confirm.' });
        },
        onResetCancel: () => this.setState({ refineResetArmed: false, announce: 'Reset cancelled.' }),
        onClose: () => this.closeRefine(),
        trap: (e) => this.trapFocusIn('[data-refine-dialog]', e),
        trapPairings: (e) => this.trapFocusIn('[data-refine-pairs]', e),
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

    // ===== mobile read-only share view =====
    // Deliberately NOT a responsive port of the result stage: a separate, minimal surface that shows
    // the palette, hands over the hex values, and says plainly where to go to make one. Read-only by
    // design — no save, no generate, so it never implies a tool the viewport can't carry.
    let mobileShare = null;
    if (this._mobileShare()) {
      const p = s.current;
      const totW = p.swatches.reduce((a, x) => a + x.weight, 0) || 1;
      mobileShare = {
        name: p.name,
        descriptors: p.descriptors || [],
        rationale: p.rationale || '',
        hasRationale: !!(p.rationale || '').trim(),
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
              width: '100%', minHeight: '62px', padding: '0 18px', margin: 0, textAlign: 'left',
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
        onLeave: () => this.closeExampleOnPhone(),
        footLine: s.exampleView
          ? 'This is one of the examples that ship with Atmos Gallery. Open it on a desktop to read a palette from an image of your own.'
          : 'Open Atmos Gallery on a desktop to read a palette from your own image.',
        eyebrow: s.exampleView ? 'Example palette' : 'Shared palette',
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
      // THE GATE'S TWO ACTS. Offered only where they are true: the example needs a palette in the
      // archive to show, and both are meaningless on a screen wide enough to run the tool.
      gateHasExample: (s.feed || []).length > 0,
      gateExample: () => this.openExampleOnPhone(),
      gateCopyLink: () => this.copySiteLink(),
      gateLinkCopied: s.copied === 'gate-link',
      isUpload: s.stage === 'upload', isProcessing: busy, isResult: s.stage === 'result', isError: s.stage === 'error',
      errorTitle: s.errorTitle, errorMsg: s.errorMsg,
      canReset: s.stage !== 'upload', busy, announce: s.announce,
      reset: () => this.doReset(),
      // orbit landing (first-visit brand arrival)
      // the landing surface doubles as the small-screen surface — on phones it is always up, with
      // the gate copy in place of the statement + CTA (the tool needs room a phone hasn't got)
      showLanding: this._landingUp(), narrow: s.narrow,
      showLoader: s.showLoader,
      // ring population — one slot per orb across all rings (sum of the ring counts). Deterministic,
      // and memoised so the array identity is stable across renders.
      orbitSlots: this._landingUp() ? this._ringSlots() : [],
      landingBlend: s.theme === 'dark' ? 'screen' : 'multiply',
      getStarted: () => this.getStarted(),
      // glass-CTA variant (landing-scoped component builder) — squared glass, token-mixed, theme-correct
      glassCta: {
        display: 'inline-flex', alignItems: 'center', height: '36px', padding: '0 16px', borderRadius: '0',
        background: 'color-mix(in srgb, var(--on-surface) 7%, transparent)',
        backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)',
        border: '1px solid var(--action-line)',
        color: 'var(--on-surface)', fontFamily: 'Neue Montreal', fontSize: 'var(--fs-body)', fontWeight: 500,
        letterSpacing: 'var(--track-title)', whiteSpace: 'nowrap', cursor: 'pointer',
        transition: 'background-color .28s var(--ease-button-hover), border-color .28s var(--ease-button-hover), transform .12s var(--ease-standard)',
      },
      // Whole border string, not borderColor. The base sets the `border` shorthand, and React
      // warns (and can drop the value) when a rerender mixes the shorthand with one of its parts.
      glassCtaHover: { background: 'color-mix(in srgb, var(--on-surface) 16%, transparent)', border: '1px solid var(--action-line-hover)' },
      glassCtaActive: { background: 'color-mix(in srgb, var(--on-surface) 24%, transparent)', border: '1px solid var(--action-line-press)', transform: this._reduce ? 'none' : 'translateY(1px)' },
      // shared micro-interaction handlers (one signature across the whole UI)
      mEnter: (e) => this.mEnter(e), mLeave: (e) => this.mLeave(e), mDown: (e) => this.mDown(e), mUp: (e) => this.mUp(e),
      dimEnter: (e) => this.dimEnter(e), dimLeave: (e) => this.dimLeave(e),
      uploadHover: { background: 'color-mix(in srgb, var(--on-surface) 4%, var(--surface-white))' },
      // dropzone hover tint — JS-driven; leave restores the explicit defaults (never clears inline styles)
      dropEnter: (e) => { if (this.state.dragOver) return; const el = e.currentTarget; el.style.background = 'color-mix(in srgb, var(--on-surface) 1%, var(--surface-raised))'; el.style.borderColor = 'color-mix(in srgb, var(--on-surface) 45%, transparent)'; },
      dropLeave: (e) => { if (this.state.dragOver) return; const el = e.currentTarget; el.style.background = 'var(--surface-raised)'; el.style.borderColor = 'var(--line-strong)'; },
      // palette-level copy
      palBtn, palBtnHover: { background: 'var(--on-surface)', color: 'var(--surface)' }, palBtnActive: { transform: 'translateY(1px)' },
      // COPY IS ONE ACT WITH A FORMAT. Hex list and CSS variables sat in the row as peers of Refine
      // and Export, which told the user the app has two copy features; it has one, and the format is
      // a detail of it. The formats move into a menu on a single Copy control, and the confirmation
      // lands on that control rather than in a status line somewhere else on the page.
      copyMenuOpen: !!s.copyMenuOpen,
      toggleCopyMenu: () => this.toggleTip('copyMenuOpen', '[data-copy-menu]'),
      closeCopyMenu: () => { this.closeTip('copyMenuOpen', '[data-copy-menu]'); this._focusCopyTrigger(); },
      copyMenuKey: (e) => { if (e.key === 'Escape') { e.stopPropagation(); this.closeTip('copyMenuOpen', '[data-copy-menu]'); this._focusCopyTrigger(); } },
      copyDone: s.copied === 'pal-hex' ? 'Hex list' : s.copied === 'pal-css' ? 'CSS variables' : '',
      copyHexList: () => { this.closeTip('copyMenuOpen', '[data-copy-menu]'); copyPal('hex'); this._focusCopyTrigger(true); },
      copyCss: () => { this.closeTip('copyMenuOpen', '[data-copy-menu]'); copyPal('css'); this._focusCopyTrigger(true); },
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
      // Manage rides the chip component's exact type and padding so it sits on the same baseline
      // inside the shared border. Full --on-surface, not the chips' muted ink: it is always
      // available rather than selectable, so it should not wear an "unselected scope" colour.
      projManageStyle: Object.assign({}, chipStyle(false), { color: 'var(--on-surface)' }),
      // The file pair (save / open) reads at the action row's SECONDARY emphasis — the same edge
      // and the same full-strength ink as every other unfilled control in the app. It used to take
      // the utility tier's muted ink and 15% edge; that tier is gone (it could not hold 4.5:1 once
      // its own hover tint darkened the ground under it), so these take what everything else takes.
      // The demotion from "New generation" is carried by fill: that one is filled, these are not.
      tier3BtnStyle: this.monoLabel('var(--fs-label)', 'var(--track-flat)', {
        display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '7px 12px',
        background: 'none', border: '1px solid var(--action-line)',
        color: 'var(--on-surface)', cursor: 'pointer',
      }),
      // the tag facet: a drawer in the contrast/harmony family + applied chip (one filter state)
      facetOpen: !!s.tagMenuOpen,
      openFacet: () => this.openTagFilter(), closeFacet: () => this.closeTagFilter(),
      tagQuery: s.tagQuery || '', onTagQuery: (e) => this.setState({ tagQuery: e.target.value }),
      hasTagQuery: !!(s.tagQuery || '').trim(),
      clearTagQuery: () => this.setState({ tagQuery: '' }, () => { const i = document.querySelector('[data-facet-search]'); if (i) try { i.focus(); } catch (e) { } }),
      // The panel covers the right of the list, so it states the result size itself rather than
      // making you close it to find out. aria-live=polite on the element (see AppView) announces
      // each change without interrupting whatever the user is doing.
      matchCount: tagBase.length,
      matchLabel: tagBase.length + (tagBase.length === 1 ? ' palette matches' : ' palettes match'),
      // sort the facet list: discovery (count) vs known-item lookup (A–Z)
      tagSort: s.tagSort || 'count',
      sortByCount: () => this.setState({ tagSort: 'count' }),
      sortByAlpha: () => this.setState({ tagSort: 'alpha' }),
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
      // the in-drawer clear: focus moves to the search field after, because the clear row itself
      // disappears with the state it clears — focus must never die with the control that held it
      // ONE clear-all, living in the panel beside the facets it clears. The header's separate
      // CLEAR was a third affordance for the same act (chip ✕ · header CLEAR · panel CLEAR FILTER);
      // per-chip removal plus this is the whole set now.
      facetClear: (activeTags.length + activeA11y.length) ? {
        label: (activeTags.length + activeA11y.length) > 1 ? 'Clear all filters' : 'Clear filter',
        onClear: () => { this.clearTags(); requestAnimationFrame(() => { const i = document.querySelector('[data-facet-search]'); if (i) try { i.focus(); } catch (e) { } }); },
      } : null,
      appliedTags, hasAppliedTags: appliedTags.length > 0,
      measuredGroups, hasMeasured: measuredGroups.length > 0,
      // Character is a DISCLOSURE now, not a peer of the measured groups.
      charOpen: !!s.charOpen,
      toggleChar: () => this.toggleFold('charOpen', '[data-facet-char]'),
      charLabel: 'Character traits',
      charAria: (s.charOpen ? 'Hide' : 'Show') + ' character traits, which are interpretations rather than measurements',
      // State kept visible OUTSIDE the overlay: how many match, and one way out.
      resultCount: scopedNow + (scopedNow === 1 ? ' palette' : ' palettes'),
      anyFilter: appliedTags.length > 0,
      onClearAll: () => this.clearTags(),
      onRemoveLast: () => this.removeLastFilter(),
      // A zero-result state has to explain the conflict rather than pretend the shelf is bare.
      filteredEmpty: scopedNow === 0 && appliedTags.length > 0,
      a11yOptions, hasA11yOptions: a11yOptions.length > 0, a11yNote: A11Y_GROUP_NOTE,
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
      onOpenManage: () => this.openManage(),
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
      manage: manageView, hasManage: !!s.manageProjects, closeManage: () => this.closeManage(), trapManage: (e) => this.trapFocusIn('[data-manage-dialog]', e),
      refine: refineView, hasRefine: !!refineView,
      openRefine: () => this.openRefine(),
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
      viewTogglePill: { position: 'absolute', top: '2px', bottom: '2px', left: '2px', width: 'calc((100% - 4px) / 3)', transform: 'translateX(' + (s.feedView === 'carousel' ? 200 : s.feedView === 'grid' ? 100 : 0) + '%)', background: 'var(--on-surface)', transition: this._reduce ? 'none' : 'transform .5s cubic-bezier(.625,.05,0,1)' },
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
      showPagination: s.feed.length > 0 && s.feedView === 'list',
      // Osmo toggle-switch mechanic, adapted: sliding pill driven by the active index (squared, token
      // colors/easing), roving tabindex + arrow-key wrap on the buttons; state stays declarative.
      pageSizeOptions: [12, 24, 36].map((n, i) => ({
        label: '' + n, pressed: pageSize === n ? 'true' : 'false', tabIndex: pageSize === n ? 0 : -1,
        style: this.monoLabel('var(--fs-label)', 'var(--track-flat)', { position: 'relative', zIndex: 1, padding: '6px 12px', cursor: 'pointer', border: 'none', background: 'transparent', color: pageSize === n ? 'var(--surface)' : 'var(--on-surface-muted)', transition: this._reduce ? 'none' : 'color .2s var(--ease-standard)', fontVariantNumeric: 'tabular-nums' }),
        onSelect: () => this.setPageSize(n),
      })),
      pageTogglePill: { position: 'absolute', top: '2px', bottom: '2px', left: '2px', width: 'calc((100% - 4px) / 3)', transform: 'translateX(' + ([12, 24, 36].indexOf(pageSize) * 100) + '%)', background: 'var(--on-surface)', transition: this._reduce ? 'none' : 'transform .5s cubic-bezier(.625,.05,0,1)' },
      pageToggleKey: (e) => {
        const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (!dir) return;
        e.preventDefault();
        const sizes = [12, 24, 36]; const next = sizes[(sizes.indexOf(this.state.pageSize) + dir + 3) % 3];
        this.setPageSize(next);
        const btns = [...document.querySelectorAll('[data-toggle-init] [data-toggle-btn]')]; const nb = btns[sizes.indexOf(next)]; if (nb) nb.focus();
      },
      pageLabel: 'Page ' + (page + 1) + ' / ' + pageCount,
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
      aaInfoOpen: !!s.aaInfoOpen,
      toggleAaInfo: () => this.toggleTip('aaInfoOpen', '[data-tip="aa"]'),
      aaInfoKey: (e) => { if (e.key === 'Escape') { e.stopPropagation(); this.closeTip('aaInfoOpen', '[data-tip="aa"]'); } },
      // AA first — the badge leads the cluster, so its sort leads the header; both metric sorts
      // stay separate buttons over the ONE cluster column and keep operating on the true numbers
      sortCols: [
        // No widths here any more: the header sits on --row-grid, the same template the rows use,
        // so each label is sized by the track it lands in. Each right-aligns over the values it
        // sorts. 'aa' shares its track with the ⓘ that explains the badge.
        { key: 'aa', label: 'AA pairs' },
        { key: 'contrast', label: 'Max contrast' },
        { key: 'time', label: 'Date' },
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
          // The chevron now renders on EVERY sortable column, not just the active one. Previously
          // only the active column showed it, so AA PAIRS and MAX CONTRAST read as inert labels —
          // sortable but undiscoverable. At rest it is dimmed and points down (the direction a
          // first click will give); active it comes to full strength and rotates to match. Active
          // is never carried by the chevron alone: the label also steps to 500 and full ink, so
          // the state survives greyscale (SC 1.4.1).
          showChevron: true, chevronDim: !active, dir: desc ? 'desc' : 'asc',
          pressed: active ? 'true' : 'false',
          aria: 'Sort by ' + this.SORT_LABELS[c.key] + ', ' + highLow[nextIsDesc ? 0 : 1]
            + (active ? ' (currently sorted by ' + this.SORT_LABELS[c.key] + ', ' + highLow[desc ? 0 : 1] + ')' : ''),
          onSort: () => this.setSort(c.key),
          style: this.monoLabel('var(--fs-micro)', 'var(--track-flat)', {
            // One label per column, right-aligned over its own values. The horizontal padding is
            // what the hover tint needs to breathe — with 0 it painted flush against the glyphs,
            // which is the one place in the app a control had no inset. The SAME 8px inset is
            // applied to the value cells below (metricValue / contrastCell / timeCell), so the
            // column still aligns on one edge: label and value are both 8px off the column line.
            // The button hugs its label and sits at the END of its track, rather than filling the
            // track at 100%. Filling was a fair way to put a label over a value while the columns
            // were content-width; once they took the metric pitch it meant a hover tint 182px wide
            // announcing a 30px word — the control looked like the column rather than like a
            // button. Hugging + justify-self does the same alignment job and admits its own size.
            width: 'auto', minWidth: 0, justifySelf: 'end',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px',
            // Symmetrical, from the same token the value cells inset by: 8px out to the track edge,
            // 8px back around the label, so the tint is even on both sides and the label still ends
            // exactly where the figures below it end.
            padding: '4px var(--row-cell-inset)', border: 'none', background: 'transparent', cursor: 'pointer',
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
      dropStyle: { position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '24px', width: '100%', minHeight: '420px', padding: '40px', background: s.dragOver ? 'var(--surface-white)' : 'var(--surface-raised)', border: '1px ' + (s.dragOver ? 'solid' : 'dashed') + ' ' + (s.dragOver ? 'var(--on-surface)' : 'var(--line-strong)'), cursor: 'pointer', font: 'inherit', color: 'var(--on-surface)', transition: 'background .2s ease,border-color .2s ease' },
      // ===== nav controls: theme toggle + contrast checker =====
      isDark: s.theme === 'dark' ? 'true' : 'false',
      themeLabel: s.theme === 'dark' ? 'Dark' : 'Light',
      switchTrackBg: s.theme === 'dark' ? 'var(--on-surface)' : 'var(--line-strong)',
      switchDotX: s.theme === 'dark' ? 'translateX(14px)' : 'translateX(0px)',
      toggleTheme: () => this.toggleTheme(),
      // ===== routing =====
      route: s.route,
      lenis: this._lenis,
      /* The masked-line reveal's tokens, read off the app rather than restated in legalReveal.js.
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
      // True only while a wiped route swap is in flight, so a legal route that mounts behind the
      // cover arms its reveals and waits to be released instead of playing them out of sight.
      arrivingByWipe: !!this._arrivingByWipe,
      registerLegalReveal: (c) => this.registerLegalReveal(c),
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
      // WHICH ACT LEADS. Refine is primary until the palette carries a role the user chose; after
      // that Export is, because the decision the export was waiting for has been made. `roles` is
      // the whole test — its absence is exactly "never refined", which is why refinement stores a
      // sparse map rather than a flag.
      //
      // Disabled on a shared palette for the same reason filing is: it has no record in this
      // browser to write a refinement to, and the strip above already offers to save it first.
      // refinePrimary is gone. The bar used to hand the filled tier to Export once a palette carried
      // roles, on the reasoning that an unrefined palette is not ready to ship. True, but it made the
      // one creative act in the row change rank underneath the user: the button you pressed last time
      // is drawn differently this time, in a row you are meant to learn once. Refine leads always.
      // Export's own dialog still says what an unrefined export is worth.
      refineDisabled: !filedCur,
      refineAria: s.current && s.current.roles
        ? 'Refine this palette: change roles, colours or order'
        : 'Refine this palette: assign roles and adjust colours',
      // The button reports where the palette IS, the way the overlay's does — a filed palette
      // shows its project, so the row states the fact rather than repeating the invitation.
      assignLabel: filedCur && filedCur.projectId ? 'In ' + this.projectName(filedCur.projectId) : 'Add to project',
      assignCurAria: filedCur ? (filedCur.projectId ? 'Move ' + filedCur.name + ' to another project (currently in ' + this.projectName(filedCur.projectId) + ')' : 'Add ' + filedCur.name + ' to a project') : 'Save this palette to your archive before filing it in a project',
      navBtnStyle: { display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'none', border: '1px solid var(--action-line)', padding: '7px 12px', fontFamily: 'Neue Montreal', fontSize: 'var(--fs-label)', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--on-surface)', cursor: 'pointer', lineHeight: 1, transition: 'background .15s var(--ease-standard),border-color .15s var(--ease-standard),opacity .15s ease' },
      // Same rule as glassCtaHover: swap the whole shorthand, never one of its parts.
      navBtnHover: { background: 'var(--surface-raised)', border: '1px solid var(--on-surface)' },
      contrast: cx, hasContrast: !!cx, closeContrast: () => this.closeContrast(), trapContrast: (e) => this.trapContrast(e),
      // delete + undo toast
      hasToast: !!s.toast, toastLabel: s.toast ? (s.toast.name + ' deleted') : '', undoDelete: () => this.undoDelete(),
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
