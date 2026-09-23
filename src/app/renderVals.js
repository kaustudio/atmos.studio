// The view-model: renderVals() computes everything the view renders — a verbatim port of the
// design comp's renderVals. The JSX view (AppView) consumes this object untouched.
import React from 'react';
import { trackEvent } from '../lib/track.js';
import { UNIVERSE_TILE, UNIVERSE_TILE_INSET } from './universeTile.js';
import { ROLE_LABEL, semanticRoles } from '../lib/exporters.js';
import { analysePalette, composeUse } from '../lib/reading.js';
import { CONTRAST_MIN, CRITERION, CRITERION_TITLE, RATIO_TEXT } from '../lib/wcag.js';
import { nearestPass, visionConflicts } from '../lib/color.js';
import { isDoc, CREATE_PATH } from './routes.js';

/* A COLOUR'S SHARE OF THE FRAME, as every surface prints it (22.09.26, UX audit). Rounded to a whole
   number it could print "0%" for a colour the palette still holds, which reads as a broken result at
   the moment a reader has just been waiting for it. Under half a percent it says "<1%"; the odometer
   rolls the digit and keeps the "<" still. `spoken` is the same figure for a screen reader. */
function sharePct(w, tot) {
  const r = tot > 0 ? (w / tot) * 100 : 0;
  return r > 0 && r < 0.5 ? '<1%' : Math.round(r) + '%';
}
function shareSpoken(w, tot) {
  const t = sharePct(w, tot);
  return t === '<1%' ? 'under 1 percent' : t.replace('%', ' percent');
}

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
const aaBadge = (st) => ({ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', flex: 'none', width: 'var(--row-aa-mark)', padding: '3px 8px', fontFamily: MONO, fontSize: 'var(--fs-fine)', letterSpacing: 'var(--track-label)', textTransform: 'uppercase', fontWeight: 500, background: 'var(--status-' + st + '-surface)', color: 'var(--status-' + st + '-ink)', border: '1px solid var(--status-' + st + '-line)' });
// What every surface renders: the verdict, then the count. No denominator in the VALUE — it is
// C(n,2), a number nobody reasons in, and repeating it implied a compliance percentage. It is
// stated once in the list header's ⓘ, and again in the title of every badge, everywhere.

const aaReadout = (met) => ({
  aaState: met.aaState,
  aaBadgeStyle: aaBadge(met.aaState),
  /* THE MEASUREMENT, AND NOT THE CLASSIFICATION IT USED TO LEAD WITH. This read
     "Text-Ready: 3 or more colour pairs meet WCAG AA for normal text (3 of 10 colour pairs at
     4.5:1)" — a band name, the band's definition, and only then the palette in hand. The band name
     is a claim about the whole palette ("this one is text-ready") that the number underneath it
     does not support: three usable pairs out of ten is a fact about three pairs, not a property of
     the palette. A reader who took the badge at its word would be choosing type colours the badge
     never measured.
     So the parenthetical becomes the whole sentence. It states the count, the denominator, the
     level, the text size the level is for, and the ratio that level requires — every term the
     reader needs to check it, and no term that generalises past what was measured.
     A11Y_TITLE and A11Y_LABEL are still the filter taxonomy's names (see the note at the top of
     this file); this readout no longer borrows them. */
  aaBadgeTitle: met.aaPairs + ' of ' + met.totalPairs + ' colour pairs meet ' + CRITERION('AA', false) + ' (4.5:1).',
  /* WITH ITS DENOMINATOR. It was the bare count, on the argument that C(n,2) is a number nobody
     reasons in and that repeating it implied a compliance percentage. Both halves of that were
     wrong the moment the label stopped saying how many pairs there are: "3" beside "AA text pairs"
     is a quantity with no scale, and a reader cannot tell 3 of 10 from 3 of 45. The denominator is
     the scale, and it is the only thing that makes the numerator mean anything. */
  aaValueText: met.aaPairs + '/' + met.totalPairs,
  // The same figure in two parts for the Library's column (19.09.26, audit U10): the count sits in a
  // one-figure slot so '/10', and the badge before it, keep one place down the list.
  aaNum: String(met.aaPairs), aaDen: '/' + met.totalPairs,
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
  /* THE HARMONY BUTTON IS A BARE GLYPH, LIKE THE LIBRARY ROW'S FOLDER AND BIN (17.09.26, audit A1,
     fourth round, by request): no edge and no fill at rest, the glyph in the swatch's own AA ink
     (`on`, onColor(): black on a light swatch, white on a dark one), and on hover the row icons'
     answer: a round 16% tint of that ink (the icon tier's, which is the press tier's 16% taken from
     the swatch's ink rather than the page's), with the glyph sliding through its mask. The rounds
     before were a faint edge, a solid disc and a full-strength edge. */
  _infoBtnStyle(on) {
    return { position: 'absolute', top: '12px', right: '12px', zIndex: 4, width: '28px', height: '28px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 0, borderRadius: 'var(--radius-pill)', color: on, cursor: 'pointer', padding: 0 };
  },
  renderVals() {
    const s = this.state;
    /* THIS WAS CALLED `mono`, AND NOTHING IN THIS APP HAS EVER BEEN MONOSPACE. The alias is from a
       build that was, and the name outlived the face by long enough to be believed: reading
       `fontFamily: mono` at twenty-odd call sites, the export dialog's format tag was reported as
       "why is this not Neue Montreal" when it had been Neue Montreal the whole time.

       `sans` is the same length and the same register, and it is the one thing the value can never
       stop being. A name that describes the value cannot drift from it; a name that describes a
       former value drifts the moment the value changes and then says nothing true for years. */
    const sans = 'Neue Montreal';
    const w = (b) => this.swatchGrow(b);   // one rule for a swatch's share, shared with the 3D card (pipeline.js)
    /* THE TRAIT PILL — the detail overlay's footer traits, and the one place the word "pill" in this
       file finally means the shape as well as the role. It rounds with the result stage's own trait
       chips, which are the same object one surface over — and since 17.09.26 (audit C6) it is drawn
       the same way too: --btn-pad-chip in a 26px box, where it was 8px 11px and stood 29px tall. */
    // THE TRAITS ON THE FOUNDATIONS (18.09.26, by request): --fs-body, 13px Medium, in their own
    // Title Case, and read from their fill with no stroke — the same words at the same size on every
    // surface (the result stage, this overlay, the shared-link phone view). They had been --fs-label
    // capitals on a hairline. The list's EXAMPLE chip is kept separate, by request.
    const pill = { fontFamily: sans, fontSize: 'var(--fs-body)', fontWeight: 500, letterSpacing: 'var(--track-flat)', color: 'var(--on-surface)', background: 'color-mix(in srgb, var(--on-surface) 9%, var(--surface))', border: '0', borderRadius: 'var(--radius-pill)', padding: 'var(--btn-pad-chip)', minHeight: '26px', display: 'inline-flex', alignItems: 'center', lineHeight: 1 };
    const busy = s.stage === 'processing';
    // RENAME (23.09.26): the pencil and the field for the palette a view shows (AppView RenameButton and
    // NameField). Only a palette in this browser's library can be renamed; a shared one being viewed is not.
    const renameFor = (p, where) => ({
      can: !s.sharedView && !!p && s.feed.some((f) => f.id === p.id),
      editing: !!(s.renaming && p && s.renaming.id === p.id && s.renaming.where === where),
      initial: p ? p.name : '', aria: 'Rename ' + (p ? p.name : 'palette'),
      countId: 'name-count-' + where, btnRef: this._renameRef(where),
      onStart: () => this.startRename(p.id, where),
      onCommit: (name, refocus) => this.renamePalette(p.id, name, where, refocus),
      onCancel: (refocus, said) => this.cancelRename(where, refocus, said),
    });

    // ===== contrast checker view (computed from sRGB relative luminance — WCAG, not OKLCH L) =====
    let cx = null;
    if (s.contrast) {
      const cp = this.contrastPalette();
      if (cp) {
        const sw = cp.swatches, N = sw.length, aaa = s.contrastLens === 'AAA';
        const th = CONTRAST_MIN(aaa, s.contrastLarge);
        // The swatch corner on every colour sample in this panel (17.09.26, by request).
        // The axis chips have no stroke since 19.09.26 (the pair grid as tiles, option B, by request:
        // "b"), and a corner sized for a 24px chip: half the tiles' --radius-card.
        const chip = (b) => ({ hex: b.hex.toUpperCase(), style: { width: '24px', height: '24px', background: b.hex, flex: 'none', borderRadius: 'calc(var(--radius-card) / 2)' } });
        /* THE SUMMARY USED TO ANSWER A QUESTION NOBODY HAD ASKED. It read `summary.aa` from
           contrastSummary(), which counts pairs at a hard-coded 4.5 — the AA/normal threshold — so
           selecting AAA moved the matrix, moved the minimum, and left the sentence above them both
           reporting the AA count. At AAA + normal the panel showed one passing pair, "min 7:1", and
           "3 of 10 pairs pass AAA" in the same eyeful. contrastSummary is right for what it is used
           for elsewhere (the palette's AA metric, which is defined at 4.5), so it is left alone and
           the panel counts its own pairs at its own threshold — the same `th` the cells are graded
           against, one line down, which is what makes the two incapable of disagreeing. */
        const criterion = CRITERION(aaa ? 'AAA' : 'AA', s.contrastLarge);
        let passCount = 0, pairTotal = 0;
        /* THE GRID IS THE GUIDE (23.09.26, by request: "we need to use the pair grid on top as guidance
           when the user interacts with elements so it becomes clear as day to them what they do and how
           colors pair"). Pointing at Best Pair Sample or Nearest Pass, the grid keeps that pair's cell
           and its two chips lit and greys the rest (_cxGuide, methods/overlays.js; the look is
           global.css's [data-cx-guide]). Keys: c{k} a column chip, r{k} a row chip, p{i}-{j} a cell,
           i the row.
           ONLY PAIRS LIGHT (same day, by request: "Given the colors come sequentally after each other, the
           hover state on the hex codes just brings confusing"). A text-on-colour tile, and a chip on the
           grid's edge, lit every pair their colour is in: an L of cells across the triangle, not a line,
           for tiles that already stand in the grid's own order. Neither lights anything now.
           NOR DOES THE GRID LIGHT ITSELF (same day, by request: "Does the hover on the rows and columns
           even make sense as it's clearly visualised what clears and whats not"). Pointing at a cell
           greyed the rest of the grid, the pass-and-fail overview being read at that moment, to say which
           two colours meet there: the chips at the row's start and the column's head already say it. */
        const pairKeys = (i, j) => { const hi = Math.max(i, j), lo = Math.min(i, j); return ['c' + lo, 'r' + hi, 'p' + hi + '-' + lo]; };
        const pairGuide = (i, j) => this.cxGuideHandlers(pairKeys(i, j), 'p' + Math.max(i, j) + '-' + Math.min(i, j));
        const rows = [{ isHeader: true, isBody: false, corner: '', chips: sw.map((b, k) => ({ ...chip(b), g: 'c' + k })) }];
        sw.forEach((rb, i) => {
          const cells = sw.map((cb, j) => {
            if (j >= i) return { blank: true, key: '', ratio: '', numStyle: {}, style: { flex: 1, minWidth: 0, height: '34px' } };
            const r = this.contrastRatio(rb.hex, cb.hex), pass = r >= th, dim = s.contrastPassOnly && !pass;
            pairTotal++; if (pass) passCount++;
            return {
              blank: false, key: i + '-' + j, pass, ratio: RATIO_TEXT(r, th), g: 'p' + i + '-' + j,
              /* EACH CELL SAYS WHAT IT MEASURED. Visually a cell is legible from its row and column
                 chips; read aloud it was the bare number "10.3", with the two colours it compares
                 sitting in a header the reader passed several rows ago and a verdict carried only by
                 an aria-hidden glyph. So the cell carries the whole statement — both hex values, the
                 ratio, and whether it meets the criterion currently selected — and the number goes
                 aria-hidden so it is said once rather than twice. It is rebuilt on every
                 render, so switching level or text size rewrites every description with it. */
              aria: rb.hex.toUpperCase() + ' and ' + cb.hex.toUpperCase() + '. Contrast ratio '
                + RATIO_TEXT(r, th) + ' to 1. ' + (pass ? 'Meets ' : 'Does not meet ') + criterion + '.',
              /* PASSING ONLY DIMS THE READING, NOT THE TABLE. The opacity sat on the CELL, and a
                 cell owns two of the matrix's rules — its own borderLeft and borderTop. So filtering
                 took every failing cell's share of the grid down to 22% with it, and the structure
                 broke into a patchwork of full-strength and ghosted lines that belonged to no row or
                 column. The lines are the table; they are what makes a cell readable as the meeting
                 of two colours, and they should not report anything about the pair inside.
                 So the cell keeps its ground at full strength (its tile, since the lines went on
                 19.09.26) and the two things that ARE the reading — the ratio and the mark — carry
                 the dim instead. The hidden
                 description is left alone: a filter is a visual narrowing, and quieting a pair is
                 not a reason to make its sentence harder for a screen reader to reach. */
              /* PASS AND FAIL WITHOUT A MARK (17.09.26, by request: the ✓ and ✕ "ruin the layout").
                 The verdict is the ground and the figure: a pass sits on a 14% ink fill in Medium ink,
                 a fail on a 4% one in muted Regular. (THE GRID HAS NO LINES since 19.09.26, option B of
                 three rendered in this drawer, by request: "b". Each pair is a rounded tile, 8px, 4px
                 from the next, so the fail's faint tile is what shows a pair was measured.) The fill was 6% beside the mark and could not carry
                 the verdict alone. Two cues, fill and weight, so it is not colour alone (SC 1.4.1),
                 and the number is still the reading. The fill eases when a toggle moves the verdict.
                 THAT EASING IS global.css's, beside the guide (23.09.26). It was declared here, inline, and
                 the drawer's arrival clears an inline transition when each cell lands (clearProps in
                 _drawerIn), so after the first open every fill change was a cut. */
              style: { flex: 1, minWidth: 0, height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'calc(var(--radius-card) * 2 / 3)', background: pass ? 'color-mix(in srgb, var(--on-surface) 14%, transparent)' : 'color-mix(in srgb, var(--on-surface) 4%, transparent)' },
              /* --fs-detail and --fs-fine, off the tokens this cell used to borrow. --fs-label is
                 defined as "uppercase labels" and this is a number. It sat under --fs-fine, which
                 global.css names the smallest READABLE size, so the checker's own fifteen
                 measurements were the smallest type on the surface. (The ✓/✕ mark under it went on
                 17.09.26; its weight now carries the verdict with the fill.) AG-03 asked for compared values at 12-13px for the same reason.
                 tabular-nums because these are the one changing metric in the app that lacked it:
                 every cell rewrites on an AA/AAA or Normal/Large toggle and on every palette, and
                 they read down a column. */
              numStyle: { fontFamily: sans, fontSize: 'var(--fs-detail)', fontWeight: pass ? 500 : 400, lineHeight: 1, color: pass ? 'var(--on-surface)' : 'var(--on-surface-muted)', fontVariantNumeric: 'tabular-nums', opacity: dim ? 0.22 : 1 },
            };
          });
          rows.push({ isHeader: false, isBody: true, chip: { ...chip(rb), g: 'r' + i }, cells });
        });
        const textOn = sw.map((b) => {
          const on = this.onColor(b.hex); const r = this.contrastRatio(b.hex, on);
          return {
            hex: b.hex.toUpperCase(), onLabel: on === '#000000' ? 'Black Text' : 'White Text', ratio: r.toFixed(1),
            // A TILE, as How it Works 2.1's (19.09.26, option A, by request: "go with a"): the tiles'
            // --radius-card corner and room for two lines and a figure.
            style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', background: b.hex, color: on, padding: '12px 16px', minWidth: 0, borderRadius: 'var(--radius-card)' },
            metaStyle: { fontFamily: sans, fontSize: 'var(--fs-label)', opacity: 0.85, whiteSpace: 'nowrap' },
          };
        });
        // One definition of the best pair, taken from paletteMetrics so the drawer's sample and the
        // result view's recommendation can never name different colours for the same palette. It
        // also arrives correctly oriented: the ratio is symmetric, and this pane's own loop used to
        // record whichever member it reached first as the foreground.
        const bp = this.paletteMetrics(cp).bestPair;
        const best = bp ? { r: bp.ratio, fg: bp.fg, bg: bp.bg } : null;
        const summary = this.contrastSummary(cp);
        // One sample box, whichever pair it shows: Best Pair Sample and Nearest Pass are the same object.
        const sampleFor = (fg, bg) => ({ borderRadius: 'var(--radius-card)', background: bg || 'var(--surface)', color: fg || 'var(--on-surface)', padding: '12px 16px', fontFamily: sans, fontSize: s.contrastLarge ? 'var(--fs-title)' : 'var(--fs-lead)', lineHeight: 1.4, fontWeight: s.contrastLarge ? 500 : 400, textWrap: 'pretty' });
        /* THE NEAREST PASS (23.09.26, by request, from Adobe Color's Contrast Suggestions: "guide the
           user and visualise it", with no hex codes written out). Of the pairs that miss the threshold
           now selected, the one that passes with the smallest move of one colour along its lightness
           (nearestPass, lib/color.js). DRAWN, NOT SPELLED, as Best Pair Sample is: the matrix's own
           fail tile turning into its pass tile, and the nudged pair in the sample box, oriented as Best
           Pair Sample is (ink the darker, ground the lighter). The hexes are said, visually hidden.
           Pointing at it lights its pair in the grid (the guide, above).
           THE SAME HEADER AS BEST PAIR SAMPLE (23.09.26, by request, after "We are overcomplicating things
           again"): the Aa chip of the pair it shows, where the split chip was ("what are we telling the
           user with the swatch that is not clickable"), then the fail tile › pass tile. The copy of the
           nudged colour went too ("why are we copying ... Where do they go?"): nothing in the tool takes
           a colour that is not in the palette. */
        const ratioTile = (pass) => ({ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', height: '26px', padding: '0 10px', borderRadius: 'calc(var(--radius-card) * 2 / 3)', background: pass ? 'color-mix(in srgb, var(--on-surface) 14%, transparent)' : 'color-mix(in srgb, var(--on-surface) 4%, transparent)', fontFamily: sans, fontSize: 'var(--fs-detail)', fontWeight: pass ? 500 : 400, lineHeight: 1, color: pass ? 'var(--on-surface)' : 'var(--on-surface-muted)', fontVariantNumeric: 'tabular-nums' });
        const np = nearestPass(sw.map((b) => b.hex), th);
        let near = null;
        if (np) {
          const movedHex = np.to, otherHex = sw[np.other].hex;
          const movedIsInk = this.relLum(movedHex) <= this.relLum(otherHex);
          const fg = movedIsInk ? movedHex : otherHex, bg = movedIsInk ? otherHex : movedHex;
          near = {
            fromRatio: RATIO_TEXT(np.fromRatio, th), toRatio: RATIO_TEXT(np.toRatio, th),
            markFg: fg, markBg: bg,
            failStyle: ratioTile(false), passStyle: ratioTile(true),
            sampleStyle: sampleFor(fg, bg),
            spoken: np.from.toUpperCase() + ' nudged to ' + movedHex.toUpperCase() + ' on ' + otherHex.toUpperCase() + ': contrast ' + RATIO_TEXT(np.fromRatio, th) + ' to 1 becomes ' + RATIO_TEXT(np.toRatio, th) + ' to 1, which meets ' + criterion + '.',
            guide: pairGuide(np.moved, np.other),
          };
        }
        // Best Pair Sample's place in the grid, found by its colours: paletteMetrics names the pair by hex.
        const idxOf = (hex) => sw.findIndex((b) => b.hex.toUpperCase() === String(hex).toUpperCase());
        const bi = best ? idxOf(best.fg) : -1, bj = best ? idxOf(best.bg) : -1;
        /* PASSING ONLY IS THE ROW'S ODD CONTROL, and it stays that way on purpose — it is a filter
           that is on or off, not one of a pair, so it keeps the bordered treatment that says so (see
           the rail note below). What it should NOT keep is a different height and a different type
           size from the two rails beside it. --fs-label rather than --fs-fine: this is a control, and
           10 is the size every other button label in the app is set at. --cx-control-h with flex
           centring rather than tuned padding: at 10px the padding alone builds a 28px box, and
           chasing 33 with a half-pixel of padding is how two controls end up almost aligned. */
        const segOn = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minHeight: 'var(--cx-control-h)', fontFamily: sans, fontSize: 'var(--fs-body)', fontWeight: 500, letterSpacing: 'var(--track-flat)', textTransform: 'none', padding: 'var(--btn-pad-sm)', borderRadius: 'var(--radius-pill)', cursor: 'pointer', border: '1px solid var(--on-surface)', background: 'var(--on-surface)', color: 'var(--surface)' };
        const segOff = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minHeight: 'var(--cx-control-h)', fontFamily: sans, fontSize: 'var(--fs-body)', fontWeight: 500, letterSpacing: 'var(--track-flat)', textTransform: 'none', padding: 'var(--btn-pad-sm)', borderRadius: 'var(--radius-pill)', cursor: 'pointer', border: '1px solid var(--action-line)', background: 'none', color: 'var(--on-surface)' };
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
        // NO BLOCK PADDING, AND THE TRACK'S HEIGHT (17.09.26, by request: "not centrally aligned").
        // The rails are a fixed --cx-control-h, and at 13px the segmented control's 7px padding made a
        // 29.5px button in a 27px track: it hung over the bottom and its label sat 1.25px low. With no
        // block padding the grid stretches the button to the track and the flex centre does the rest.
        const segBtn = (active) => this.viewToggleOptStyle(active, { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 12px' });
        cx = {
          lensPill: segPill(aaa), sizePill: segPill(s.contrastLarge),
          name: cp.name, N, aaa, lensLabel: aaa ? 'AAA' : 'AA', threshold: th.toFixed(th % 1 ? 1 : 0),
          // Both lines of the summary, composed here so the view holds no arithmetic and no grammar.
          // Title Case (19.09.26, by request: "apply title text here as well"), as the phone's figure label.
          summaryText: passCount + ' of ' + pairTotal + ' Pairs Meet ' + CRITERION_TITLE(aaa ? 'AAA' : 'AA', s.contrastLarge),
          minText: 'Minimum ' + th.toFixed(th % 1 ? 1 : 0) + ':1',
          criterion, passCount, pairTotal,
          aa: summary.aa, total: summary.total, allPass: summary.aa === summary.total,
          large: s.contrastLarge, passOnly: s.contrastPassOnly,
          rows, textOn,
          matrixColsStyle: { display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' },
          // The text-on-colour tiles' padding (19.09.26, by request: "add same padding to this"), so the
          // sample's words start on the same inner edge as the hexes above them.
          sampleStyle: sampleFor(best && best.fg, best && best.bg),
          // With Nearest Pass under it, Best Pair Sample closes at the 20px the drawer's sections open on.
          // Both now stand under the grid, and the text-on-colour tiles close the drawer (AppView).
          near, bestSecPad: near ? '20px var(--page-gutter) 20px' : '20px var(--page-gutter) 0',
          sampleRatio: best ? RATIO_TEXT(best.r, th) : '—', sampleFg: best ? best.fg.toUpperCase() : '', sampleBg: best ? best.bg.toUpperCase() : '',
          // The grid's own tile, as Nearest Pass carries, so the two headers read alike (23.09.26).
          bestTileStyle: ratioTile(!!best && best.r >= th),
          bestGuide: bi >= 0 && bj >= 0 && bi !== bj ? pairGuide(bi, bj) : {},
          setAA: () => this.setState({ contrastLens: 'AA' }), setAAA: () => this.setState({ contrastLens: 'AAA' }),
          aaStyle: segBtn(!aaa), aaaStyle: segBtn(aaa), aaPressed: aaa ? 'false' : 'true', aaaPressed: aaa ? 'true' : 'false',
          setNormal: () => this.setContrastSize(false), setLarge: () => this.setContrastSize(true),
          normalStyle: segBtn(!s.contrastLarge), largeStyle: segBtn(s.contrastLarge),
          normalPressed: s.contrastLarge ? 'false' : 'true', largePressed: s.contrastLarge ? 'true' : 'false',
          togglePass: () => this.setState((st) => ({ contrastPassOnly: !st.contrastPassOnly })),
          passStyle: s.contrastPassOnly ? segOn : segOff, passPressed: s.contrastPassOnly ? 'true' : 'false', passLabel: 'Passing Only',
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
        const rowBase = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', width: '100%', background: 'transparent', border: 'none', borderTop: '1px solid ' + divCol, padding: '8px 14px', margin: 0, cursor: 'pointer', textAlign: 'left', color: on };
        // The last row sits in the tile's bottom corners, so its inset focus ring takes them rather
        // than being cut by the band's clip.
        const rowLast = Object.assign({}, rowBase, { borderRadius: '0 0 var(--radius-card) var(--radius-card)' });
        const values = ['hex', 'rgb', 'cmyk', 'hsl'].map((key) => {
          const f = fmt[key];
          const copied = s.copied === key + '-' + sid;
          return {
            key, labelText: f.label, caveat: f.caveat, hasCaveat: !!f.caveat, copied, notCopied: !copied,
            value: f.display,
            aria: 'Copy ' + f.label + ' value ' + f.copy + ' for swatch ' + (i + 1) + (f.caveat ? ', ' + f.caveat : ''),
            onCopy: () => { this.copy(f.copy, key + '-' + sid, 'Copied ' + f.copy); trackEvent('Colour Copied', { format: key, from: 'create' }); },
            rowStyle: key === 'hsl' ? rowLast : rowBase,
            colStyle: { display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0, flex: 1 },
            labelRowStyle: { display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 },
            labelStyle: this.monoLabel('var(--fs-fine)', '.14em', { color: on, opacity: 0.75, flex: 'none' }),
            iconWrapStyle: { flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '14px', height: '14px', color: on, opacity: copied ? 1 : 0.5 },
          };
        });
        return {
          sid,
          weightPct: sharePct(b.weight, totW),
          groupAria: 'Swatch ' + (i + 1) + ' of ' + n + ', ' + fmt.hex.display,
          values,
          onHarmony: () => this.openHarmony(b.hex),
          harmonyAria: 'Colour harmonies for ' + fmt.hex.display,
          /* ROUND, AND ONE SIZE ON BOTH SURFACES (17.09.26, audit A1). This was the last square icon
             control: every other icon-only button is a circle. 28px here and in the detail overlay,
             which drew it at 26. A solid disc since the same day's second round — see _infoBtnStyle. */
          infoBtnStyle: this._infoBtnStyle(on),
          /* EACH COLOUR A TILE (19.09.26, by request: option B, "go with b and the rounded edge, but add the
             lines to maintain hierarchy"): the colour tiles' --radius-card corner, 6px from the next (the
             group's gap in AppView), clipped so the value rows and their hairlines follow the corner. The
             hairlines stay: they rank the four notations under the share. The ring takes the corner too. */
          style: { flexGrow: w(b), flexBasis: 0, minWidth: '190px', height: '340px', background: b.hex, position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', willChange: 'opacity', borderRadius: 'var(--radius-card)', overflow: 'hidden' },
          bandRingStyle: { position: 'absolute', inset: '0', borderRadius: 'inherit', boxShadow: 'none', opacity: 0, pointerEvents: 'none', zIndex: 1 },
          /* THE SHARE IS A FIGURE, NOT A LABEL, and it had been dressed as one. Three things moved
             together here and they are one decision:
               · opacity is GONE. `on` is onColor()'s guaranteed-AA ink for this swatch, and the
                 veil spent the AA the function had just computed: measured on Kiln Light, the
                 authored pairs run 5.21-15.44:1 and the RENDERED ones 3.58-8.65:1, so two of five
                 swatches sat under the 4.5:1 that 10px text has to clear. The colour was correct
                 and then thrown away one property later.
               · --fs-label is the token for UPPERCASE LABELS (its own comment says so). This is a
                 number, it is the second half of what the row exists to say, and 10px put it below
                 the 12px floor small copy should hold. --fs-body at 500 is not invented for this:
                 about.css already promotes the same figure to exactly that, full-strength, while
                 stepping the hex DOWN beside it. The hex still leads here by size, because this row
                 is a copy button and the hex is what it copies.
               · tabular-nums, because these are a right-aligned column of changing digits and
                 proportional figures make the column ragged. About's key has carried it all along.
             --track-flat rather than a raw .06em: the tracking that went with the uppercase token
             does not belong on digits, and the project has a token for flat.
             --fs-title, not --fs-body (13.09.26, by request): the share is the first thing a swatch
             says and 13px read as a caption. 24 is the section-heading size, still medium weight,
             and the overlay's swatches take the same size. The phone story's weights key stays at
             --fs-lead: its percentage column is 40px wide and 24px digits do not fit it. */
          weightStyle: { fontFamily: sans, fontSize: 'var(--fs-title)', fontWeight: 500, letterSpacing: 'var(--track-flat)', fontVariantNumeric: 'tabular-nums', color: on, padding: '14px 14px 0', position: 'relative', zIndex: 2 },
          valuesWrap: { display: 'flex', flexDirection: 'column', width: '100%', position: 'relative', zIndex: 2 },
        };
      });
      const _ref = this.dispUrl(s.current), _hasRef = this.hasImg(s.current);
      // Build the reference thumbnail as a node so the <img> only exists once its src is resolved.
      // 156×104 (same 3:2), sized to sit level with the metadata columns it now shares a row
      // with — the subtle enlargement the move down bought; click-to-zoom still carries the
      // full-size view, so the thumbnail only has to identify, not exhibit.
      // 12px AND NO BORDER (18.09.26, by request): --radius-card, a tenth of its 104px height as the
      // short panels' 16 is of theirs, where 28 would be a quarter; the button takes the same corner
      // so its focus ring follows the picture's.
      // The photograph carries its colours' regions (methods/where.js): a grey copy and one masked copy per
      // swatch over it, keyed to the palette so a new one never inherits the last one's masks. The zoom
      // opens the first image in the button, which stays the photograph itself.
      const _cur = s.current;
      const refImageNode = _hasRef ? React.createElement('button', { type: 'button', 'data-click-zoom': '1', 'data-ix': 'mark', 'data-focus': 'chrome', 'aria-label': 'View the reference image larger', style: { border: 'none', padding: 0, background: 'none', display: 'block', cursor: 'zoom-in', borderRadius: 'var(--radius-card)' } },
        React.createElement('span', { key: _cur.id + '|' + _ref, 'data-where': '1', style: { borderRadius: 'var(--radius-card)' } },
          React.createElement('img', { src: _ref, 'data-where-base': '1', onLoad: (e) => this._wherePrime(_cur, e.currentTarget), alt: (_cur.example === true) ? 'The reference image this example palette was read from' : s.sharedView ? 'The reference image this shared palette was read from' : 'The reference image you uploaded', style: { display: 'block', width: '156px', height: '104px', objectFit: 'cover', borderRadius: 'var(--radius-card)' } }),
          React.createElement('img', { src: _ref, alt: '', 'aria-hidden': 'true', 'data-where-dim': '1', decoding: 'async' }),
          _cur.swatches.map((b, k) => React.createElement('img', { key: k, src: _ref, alt: '', 'aria-hidden': 'true', 'data-where-sid': String(k), decoding: 'async' })))) : null;
      // The metadata cluster — restored to the detail pane. It used to live ONLY in the list's
      // inline expansion; Phase 1 removed that expansion on the contract that this panel is the one
      // detail surface, but these five values (hue/chroma/lightness/temperature/archetype) were
      // never relocated here — they were dropped. Max contrast and AA pairs are also in the list's
      // comparison columns, but the detail pane states the full readout: the row exists to compare,
      // this panel exists to inspect, and inspection should not require the row.
      // Grouped, not flat: the seven values are three different KINDS of statement, and the
      // hierarchy follows that — group heading (full ink, Medium) → label (muted) → value (full
      // ink, tabular, right-aligned). Headings and labels in Title Case since 19.09.26 (by request),
      // where they were set in capitals, and two steps larger (by request, a step at a time):
      // --fs-body (13), from --fs-fine (11), the values' own size; the label is told from its value
      // by the muted ink, and the heading by Medium. Scanning is two-step: find the group, then
      // read down an aligned value column, instead of parsing seven equal pairs in a line. The
      // groups are also the wrap unit: on a narrow window whole groups reflow, so "Lightness"
      // can never end up orphaned on a new line away from the other colour facts.
      const curMet = this.paletteMetrics(s.current);
      const detailMeta = [
        {
          title: 'Colour', rows: [
            { label: 'Dominant Hue', value: curMet.hue + '°' },
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
            { label: 'Max Contrast', value: curMet.contrastMax.toFixed(1) + ':1' },
            { label: 'AA Text Pairs', value: aaReadout(curMet).aaValueText, aa: aaReadout(curMet) },
            /* COLOUR BLIND SAFE (23.09.26, by request, from Adobe Color's simulator): the pairs that
               stay apart under protanopia, deuteranopia and tritanopia (visionConflicts, lib/color.js),
               counted in the AA line's own n/total so the two read as one grammar. Computed here for
               the palette on screen only; paletteMetrics runs for every library row. */
            (() => { const v = visionConflicts(s.current.swatches.map((b) => b.hex)); return { label: 'Colour Blind Safe', value: v.safe + '/' + v.total, spoken: v.safe + ' of ' + v.total + ' pairs stay distinct for colour-blind vision' }; })(),
          ],
        },
        {
          // "Reading" is the product's own word for the interpretation layer
          title: 'Reading', rows: [
            { label: 'Character', value: curMet.mood },
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
              label: 'Name From',
              // Renamed by the reader (23.09.26): whatever it was named from, it is theirs now.
              value: s.sharedView ? 'Shared palette'
                : s.current.renamed === true ? 'You'
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
      const useLine = composeUse(analysePalette(s.current.swatches), curMet.aaState, curMet);
      const allTraits = this.paletteTags(s.current);
      result = {
        // The tiles light their colour in the photograph beside them (methods/where.js).
        whereTile: this.whereHandlers(s.current),
        rename: renameFor(s.current, 'stage'),
        name: s.current.name, rationale: s.current.rationale, descriptors: allTraits, bands,
        refImage: _ref, hasRef: _hasRef, noRef: !_hasRef, refImageNode, detailMeta,
        useLine,
        traits: allTraits, hasTraits: allTraits.length > 0,
      };
    }
    // SHARE IS ONE PRESS (22.09.26, by request: "What are we actively solving here? … we messing up the
    // structure"): it copies the palette's link, which opens the palette itself, and the button says
    // Link Copied (Share Palette and Link Copied since 23.09.26). The dialog that held Copy Link, Share
    // via… and Download Image (19.09.26) went when the picture did: it had become a sheet for one link.
    // shareCurrent (methods/share.js) does the copy.

    /* THE FOUR STEPS, AND WHAT THE ORB IS DOING WHILE EACH ONE RUNS. The states are the Thinking Orbs'
       own six (thinkingOrbs.js); these four are the ones that describe this work, in the order the
       reading does it: it searches the photograph for its light, works through the field it sampled,
       solves the grouping, and composes the name. */
    let procStatus = '', procOrb = 'working';
    if (busy) {
      const STEPS = ['Reading light', 'Sampling the field', 'Grouping the colours', 'Naming the mood'];
      const ORBS = ['searching', 'working', 'solving', 'composing'];
      const i = Math.min(s.procStep, 3);
      procStatus = STEPS[i] + '…'; procOrb = ORBS[i];
    }

    const curId = s.stage === 'result' && s.current ? s.current.id : null;
    // The card's spoken form. Its metrics grid is aria-hidden (it is the visual layer), so whatever
    // the card SHOWS has to be said here or it is said nowhere — and the card shows the same readout
    // the list row does. Same clause order as the row's aria, so moving between views does not
    // change the shape of the sentence.
    // THE VERDICT AND THE COUNT, in that order. This briefly spoke the count alone, on the reasoning
    // that the label WAS the count ("3+ AA text pairs: 5 of 10 pairs…" is the same fact twice). The
    // labels are answers again, so the two carry different information: the verdict is what the
    // badge shows, and the figure is what the badge cannot.
    // The readout is one string in two places: the tile's accessible name carries it, so a keyboard
    // reader has the whole card before opening anything, and the open panel is labelled with it, so
    // opening the card changes what is SEEN without changing what is said.
    const readout = (p, met) => this.tagsSpoken(p)
      + '. Dominant hue ' + met.hue + ' degrees, ' + met.temp.toLowerCase()
      + '. ' + met.aaPairs + ' of ' + met.totalPairs
      + ' colour pairs meet AA contrast for normal text. Maximum contrast ' + met.contrastMax.toFixed(1) + ' to 1'
      + '. Generated ' + this.relTime(p.time) + (p.id === curId ? '. Currently viewing' : '');
    const itemAria = (p, met) => 'Open ' + p.name + '. ' + readout(p, met);

    // --- LIST view: canonical, one row each, keyboard-navigable ---
    const scopedAll = this.scopedFeed(s.feed);
    // pagination (list view only): per-page limit + clamped page window
    const pageSize = s.pageSize || 12;
    const pageCount = Math.max(1, Math.ceil(scopedAll.length / pageSize));
    const page = Math.min(s.page || 0, pageCount - 1);
    // Metrics once per palette, shared by the sort and by the row that renders them — paletteMetrics
    // walks every swatch PAIR, so computing it twice per palette per render is the one thing here
    // worth not doing. Sorting is applied for the list only: the grid has no column headers,
    // so reordering them would be an invisible change to an order nobody asked to change.
    /* THE LIST STAYS LAID OUT UNDER THE GRID (18.09.26). It used to be emptied while the grid was up
       and rebuilt only once the grid's exit had finished, so the page the field faded into was the
       library with no rows in it (the footer pulled up into their place) and the rows then appeared
       in one frame. The grid is a fullscreen view OVER the list, so the list is kept exactly as it
       was left, inert (AppView) while it is covered: the exit reveals the page it lands on, and the
       document keeps its height, so the scroll position the grid was opened from is the one it
       closes onto. The grid's own field keeps the unsorted, unpaged set while it is up or leaving
       (gridUp). */
    const gridUp = s.feedView === 'grid' || !!s.gridLeaving;
    const listRows = this.sortDecorated(scopedAll.map((p) => ({ p, met: this.paletteMetrics(p) })), s.sortKey, s.sortDir)
      .slice(page * pageSize, (page + 1) * pageSize);
    const scoped = gridUp ? scopedAll : listRows.map((d) => d.p);
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
    // justifySelf END (18.09.26, "align these to the grid"): below 1280 the column is one track, a
    // few px narrower than the badge and its count, and a grid item cannot shrink below its content —
    // so it spilled past the grid line to the right. Held at the track's end, any overflow goes LEFT
    // into the gutter it shares with the name, and the count always ends on the line.
    const aaCell = { display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', justifySelf: 'end', gap: '8px', paddingRight: '0', whiteSpace: 'nowrap' };
    // 2ch of tabular figures: the count runs 0–10, and a cluster that changed width with the digit
    // would slide the badge left and right down the list — the one column where a wobble is most
    // visible, because the badges are a stack of identical glyphs.
    /* THE THREE COMPARED COLUMNS READ AT 12. AA pairs, max contrast and the date are not labels —
       they are the figures the list exists to be sorted and scanned by, read DOWN a column across
       every row on the page. They sat at --fs-label (10) and --fs-fine (11), sizes this ladder
       reserves for the words that NAME a value, so the name and the number were the same weight of
       thing. All three keep tabular-nums, which is what makes a column of them line up at any size.

       --fs-body SINCE 20.09.26 (by request: "increase AA Text pairs, max contrast and created copy
       from 12 to 13"), from --fs-detail. The three HEADERS over them have been 13 since they became
       toggleStyle pills, so a column read as a 13px name over a 12px number — the label louder than
       the figure it labels, in a list whose whole job is comparing those figures. They now match. */
    const metricValue = { minWidth: '2ch', textAlign: 'end', fontFamily: sans, fontSize: 'var(--fs-body)', letterSpacing: 'var(--track-flat)', textTransform: 'uppercase', color: 'var(--on-surface)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' };
    const contrastCell = { textAlign: 'end', paddingRight: '0', fontFamily: sans, fontSize: 'var(--fs-body)', letterSpacing: 'var(--track-flat)', textTransform: 'uppercase', color: 'var(--on-surface)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' };
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
    // No capitals (19.09.26, audits U6 and U8): the stamp is a value, and "9m ago" read 9M AGO.
    const timeCell = { textAlign: 'end', fontFamily: sans, fontSize: 'var(--fs-body)', letterSpacing: 'var(--track-flat)', color: 'var(--on-surface-muted)', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' };
    // The same three cells on the hover fill's ink ground (AppView RowMain with `inv`): identical
    // metrics, only the colour swapped for the surface's. --ink-fill-muted is the muted step on
    // ink, defined beside the fill's other colours in global.css.
    const metricValueInv = Object.assign({}, metricValue, { color: 'var(--surface)' });
    const contrastCellInv = Object.assign({}, contrastCell, { color: 'var(--surface)' });
    const timeCellInv = Object.assign({}, timeCell, { color: 'var(--ink-fill-muted)' });
    const feedList = listRows.map(({ p, met }, rowIdx) => {
      const isCur = p.id === curId;
      return {
        // The stamp (19.09.26, audit U6, by request): minutes and hours under a day, the date after.
        // The tooltip carries the other form, so either can be read; the accessible sentence below
        // keeps the relative one.
        name: p.name, time: this.stampTime(p.time), timeTitle: this.absTime(p.time),
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
        // The two tags, each wired to ITS OWN facet group — temperature to activeTemp, lightness to
        // activeLight — so a tag pressed in a row applies exactly the filter the panel would.
        descriptorParts: (() => {
          const tags = this.paletteTags(p);
          return [['activeTemp', met.temp.toLowerCase()], ['activeLight', met.lightBand]].map(([key, band], i) => {
            const on = (s[key] || []).indexOf(band) >= 0;
            return { text: tags[i], on, pressed: on ? 'true' : 'false', aria: (on ? 'Remove the ' + tags[i].toLowerCase() + ' filter' : 'Filter to ' + tags[i].toLowerCase() + ' palettes'), onClick: () => this.setFacet(key, band) };
          });
        })(),
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
        aaCell, metricValue, contrastCell, timeCell, metricValueInv, contrastCellInv, timeCellInv,
        aria: (isCur ? 'Currently viewing ' + p.name + '. ' : 'Load ' + p.name + ' into the result. ') + this.tagsSpoken(p) + '. Dominant hue ' + met.hue + ' degrees, ' + met.temp.toLowerCase() + '. ' + met.aaPairs + ' of ' + met.totalPairs + ' colour pairs meet AA contrast for normal text. Maximum contrast ' + met.contrastMax.toFixed(1) + ' to 1. Generated ' + this.relTime(p.time),
        onClick: (e) => { if (!busy) this.loadIntoResult(p, e && e.currentTarget); },
        onDelete: (e) => { if (e && e.stopPropagation) e.stopPropagation(); const wrap = e && e.currentTarget && e.currentTarget.closest('[data-row-wrap]'); this.deletePalette(p.id, wrap, e); },
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
        /* THE HOVER IS A FILL THAT RISES THROUGH THE ROW. The reference (paulkalkbrenner.net/music,
           the listen links) answers a pointer with a solid block growing in on
           cubic-bezier(0.625,0.05,0,1) — this app's --ease-fold to the digit. Here the block is the
           row: a tint layer the row's size, clipped to nothing at rest and unclipped from the
           bottom edge up on hover (motion.js rowTintOn/Off), so the tint has a direction and a
           leading edge where it used to fade in place. SOLID INK, as the reference is: the layer
           is --on-surface and carries the row's content again in the surface's colours (AppView
           RowMain with `inv`), laid out by the same flex column the row uses so the copy lands on
           the original's pixels. It was a 12% tint for a day, on the argument that a row's strip,
           badge and buttons cannot invert; they do not need to — the strip and the badge keep
           their own colours on either ground, and the two action glyphs flip in the stylesheet
           off the [data-lit] attribute rowTintOn sets on the wrap. The row's own background is
           left to the selected state (_syncListActive) alone. First in DOM, no z-index: it paints
           under everything that follows it. Inline clip-path is the rest state only. */
        rowFillStyle: { position: 'absolute', inset: '0', display: 'flex', flexDirection: 'column', background: 'var(--on-surface)', clipPath: 'inset(100% 0 0 0)', pointerEvents: 'none', willChange: 'clip-path' },
        // the current row's marker, on the fill: same bar, the surface's colour
        markerInvStyle: { position: 'absolute', left: '0', top: '0', bottom: '0', width: '3px', background: 'var(--surface)', opacity: isCur ? 1 : 0 },
        restStrip: p.swatches.map((b) => ({ style: { flexGrow: w(b), flexBasis: 0, minWidth: 0, background: b.hex } })),
      };
    });

    // --- PALETTE UNIVERSE: one real, focusable tile per palette (the engine clones these to fill) ---
    // THE TILE IS THE PHOTOGRAPH AND ITS NAME. It used to wear the list row's whole content model,
    // stacked — a 150px hero, the strip, the identity block, eight metrics — in a 300×463 box, and a
    // field of forty of them was forty readouts competing at once, none of them the picture the
    // palette was read from. The readout has not gone anywhere: it moves into the panel that slides
    // out beside the card when the card is pressed (universe.js openTile, AppView's UniversePanel),
    // which is where the reference this view is adapted from keeps it too. The field shows what was
    // read; the panel shows what was read from it, on demand.
    // Box from the shared token, so the card and the field cell universe.js lays it out on cannot
    // disagree — see universeTile.js for the arithmetic.
    const UTW = UNIVERSE_TILE.W, UTH = UNIVERSE_TILE.H, CAP = UNIVERSE_TILE.CAP;
    // transform-origin at the corner: the engine's matrix3d maps the box from its top-left.
    // overflow VISIBLE on the engine tile, because the panel slides out of it; the hero clips its own
    // photograph, and nothing else in the card reaches its edge.
    // THE CARD CORNER (17.09.26, radius issue R3, by request): --radius-card, 12px, on the box, the
    // photograph, the dim, the ring and the sliding panel. 12 is the figure approved for these
    // cards; How it Works' larger photo cards take 28. global.css squares the two corners that meet
    // when a card is open (data-universe-open).
    // NO STROKE AROUND THE PHOTOGRAPH (17.09.26, by request): the box has no border and no fill, so
    // the picture is the card's edge. The panel and the ring keep the box's size (inset 0).
    const cardBox = (isCur) => ({ position: 'absolute', top: '0', left: '0', width: UTW + 'px', height: UTH + 'px', display: 'block', textAlign: 'left', background: 'transparent', border: '0', borderRadius: 'var(--radius-card)', padding: 0, margin: 0, cursor: 'pointer', font: 'inherit', overflow: 'visible', transformOrigin: '0 0' });
    const feedNodes = scoped.map((p, idx) => {
      const isCur = p.id === curId;
      const hasImage = this.hasImg(p);
      const stops = this.paletteStops(p);   // weight-true, and the same stops the 3D card wears
      // SAME palette-card content model as the list row — identical data, and in this view it is
      // the open panel's arrangement rather than the tile's
      const met = this.paletteMetrics(p);
      const cardMetrics = [
        { label: 'Hue', text: met.hue + '°' },
        { label: 'Chroma', text: met.chroma.toFixed(3) },
        { label: 'Lightness', text: met.lMin + '–' + met.lMax + '%' },
        { label: 'Temp', text: met.temp },
        { label: 'Max contrast', text: met.contrastMax.toFixed(1) + ':1' },
        // the one metric carrying a verdict as well as a number — badge from the shared readout,
        // so the card says exactly what the row and the detail panel say
        { label: 'AA text pairs', text: aaReadout(met).aaValueText, aa: aaReadout(met) },
        { label: 'Character', text: met.mood },
        // Eighth entry, and the one that squares the 2-column grid off at four full rows: the list
        // row ends on a date and the card had none, so the same palette was datable in one view and
        // not in the other. The row's own stamp, exactly as its Created column carries it.
        // THE LIST'S STAMP, NOT THE OLD ONE (23.09.26, by request: "Change the date here so it matches
        // the list"). This was absTime, "23.09.26, 12.17", which is what the column showed until
        // 19.09.26. The column has read stampTime since (words for a week, then the date), so the card
        // and the row it came from disagreed. The full stamp stays on hover, as it does on the row, and
        // the value keeps its own case: the card's capitalize would have set "8m Ago".
        { label: 'Generated', text: this.stampTime(p.time), title: this.absTime(p.time), ownCase: true },
      ];
      return {
        id: p.id, name: p.name, descriptors: this.paletteTags(p).join('  ·  '), current: isCur, ariaCurrent: isCur ? 'true' : undefined,
        aria: itemAria(p, met), readout: readout(p, met),
        // The row's two identity labels, which the card was missing: EXAMPLE marks the seeded
        // palettes, and the current palette is named rather than only dotted. An unlabelled 7px
        // square asks the reader to already know what it means; the row spells it out, so the card
        // does too (and the square stays, so the state is never carried by the word alone).
        isExample: p.example === true,
        hasImage, noImage: !hasImage, refImage: this.dispUrl(p),
        cardMetrics,
        // A press opens the card IN PLACE — the field's own disclosure — never the fullscreen detail
        // straight away. The detail is one action further, inside the panel. (The reduced-motion
        // grid, which shows everything at rest, keeps the direct door: openTile falls through.)
        onClick: (e) => { if (!busy) this.openTile(p, e && e.currentTarget); },
        onEnter: (e) => this.stackEnter(e.currentTarget), onLeave: (e) => this.stackLeave(e.currentTarget),
        onFocus: (e) => { if (this._kbdInput) this.centerOnTile(e.currentTarget); this.stackEnter(e.currentTarget); },
        onBlur: (e) => this.stackLeave(e.currentTarget),
        tileAbs: cardBox(isCur),
        tileFlow: Object.assign(cardBox(isCur), { position: 'relative', width: '100%', overflow: 'hidden', background: isCur ? 'var(--surface-white)' : 'var(--surface-raised)' }),
        // The sliding panel: the card's box (inset 0 of the inner, which fills the borderless card,
        // so the panel IS the card's box). It slides by its width less ONE pixel, so its leading
        // hairline lands under the photograph's last column and the picture meets the panel's
        // surface. (Less two put it a pixel inside the card and left the content a pixel over the far
        // edge — measured, 04.09.26.) --slide is the reference's clamp of the open scalar;
        // --sx/--sy pick the axis. It is invisible while it is home (--slide 0): the card has no
        // stroke now, and a hairline under the photograph would show at its anti-aliased edge.
        panelStyle: { position: 'absolute', top: '0', left: '0', height: '100%', width: 'calc(100% + var(--upanel-bleed, 0px) * var(--slide, 0))', opacity: 'min(1, calc(var(--slide, 0) * 1000))', background: 'var(--surface-raised)', border: '1px solid var(--line)', borderRadius: 'var(--radius-card)', pointerEvents: 'none', transform: 'translate(calc((100% - var(--upanel-bleed, 0px) * var(--slide, 0) - 1px) * var(--slide, 0) * var(--sx, 1)), calc((100% - 1px) * var(--slide, 0) * var(--sy, 0)))' },
        // THE PHOTOGRAPH FILLS THE CARD (17.09.26, radius issue R3, by request): the caption band
        // and its white ground went, and the name sits on the picture's foot over a progressive blur
        // and a dark tint (AppView TILE_FADE). The open tween no longer moves anything here.
        heroWrapStyle: { position: 'absolute', top: '0', left: '0', right: '0', bottom: '0', overflow: 'hidden', background: 'var(--line)', borderRadius: 'var(--radius-card)' },
        heroFallback: { position: 'absolute', inset: '0', background: 'linear-gradient(135deg, ' + stops + ')', backgroundSize: '220% 220%', animation: this._reduce ? 'none' : 'gradient-drift ' + (10 + (idx % 4)) + 's ease-in-out infinite', animationDelay: (idx * -2.1) + 's' },
        // drawn at 1.1 so the engine's 12px drift toward the cursor never shows an edge (the
        // reference's own margin); the engine writes the translate, this is only the rest state
        imgStyle: { position: 'relative', width: '100%', height: '100%', display: 'block', backgroundImage: 'url(' + this.dispUrl(p) + ')', backgroundSize: 'cover', backgroundPosition: 'center', transform: 'scale(1.1)', willChange: 'transform' },
        dimStyle: { position: 'absolute', inset: '0', background: 'var(--surface-raised)', opacity: 'var(--dim, 0)', pointerEvents: 'none', zIndex: 2, borderRadius: 'var(--radius-card)' },
        /* THE CAPTION IS ON THE PHOTOGRAPH (17.09.26, radius issue R3, by request). It was the card's
           foot: the identity line on the surface under a hairline, because white type on a picture
           whose lightness this tool does not control failed on pale fields (High Key). The picture
           now runs to the edge and the name sits on its foot, over a progressive blur and a dark tint
           strong enough for white type on the palest example (AppView TILE_FADE; the user chose the
           tint). The current card is still named, by its Viewing mark. */
        captionStyle: { position: 'absolute', left: '0', right: '0', bottom: '0', height: CAP + 'px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', padding: '0 ' + UNIVERSE_TILE_INSET + 'px', zIndex: 1 },
        // 14px row gap, 16 column, 14 inset: the rhythm the card's block settled on (the pair inside
        // a row is 4, so the gap between rows has to stay well above it or the grouping inverts). The
        // reduced-motion card draws this directly; the open panel pads its body instead and keeps
        // only the top here — see universePanel below.
        cardMetricsStyle: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 16px', padding: UNIVERSE_TILE_INSET + 'px ' + UNIVERSE_TILE_INSET + 'px ' + UNIVERSE_TILE_INSET + 'px' },
        // The ring is the hover, and it is a hairline in the press tier's hover ink, drawn on the
        // photograph's edge (inset 0: the card has had no stroke of its own since 17.09.26) — an
        // edge that appears under the pointer, colour only, as every [data-ix] control does. It was boxShadow:'none' for a while: an element whose opacity was tweened
        // on every hover and drew nothing at either end.
        ringStyle: { position: 'absolute', inset: '0', boxShadow: 'inset 0 0 0 1px var(--action-line-hover)', opacity: 0, pointerEvents: 'none', zIndex: 3, borderRadius: 'var(--radius-card)' },
        strip: p.swatches.map((b) => ({ style: { flexGrow: w(b), flexBasis: 0, minWidth: 0, background: b.hex } })),
      };
    });

    // The open card's panel: the tile's own node, re-addressed. The same strip, identity and
    // metrics the card used to wear, plus the two things a panel needs that a tile does not — a way
    // out, and the door to the fullscreen detail. Resolved by id on every render, so a palette edited
    // from the detail (filed, renamed) is read live, the way the overlay itself reads it.
    const uOpenP = s.uOpen != null ? scoped.find((p) => p.id === s.uOpen) : null;
    const uOpenNode = uOpenP ? feedNodes.find((n) => n.id === uOpenP.id) : null;
    const universePanel = uOpenNode ? Object.assign({}, uOpenNode, {
      titleName: true,   // the name heads the panel at --fs-title (CardIdentity)
      panelAria: uOpenP.name + ' palette. ' + uOpenNode.readout,
      // On the page's columns in a landscape open (universe.js _uOpenGrid): the first metric column is
      // two columns wide, so the second starts on the content's third, with the gutter between. The
      // readout settles at the foot of the panel's body (margin-top auto), over Open Detail, so the
      // room a tall panel has is spent between the name and the figures rather than under them.
      cardMetricsStyle: Object.assign({}, uOpenNode.cardMetricsStyle, { padding: 'calc(' + UNIVERSE_TILE_INSET + 'px * min(1, var(--upanel-s, 1))) 0 0', marginTop: 'auto', gridTemplateColumns: 'var(--upanel-metrics, 1fr 1fr)', gap: 'clamp(8px, calc(22px * var(--upanel-s, 1) - 4px), 24px) var(--upanel-gap, 16px)' }),
      /* THE TYPE SCALES WITH THE CARD (23.09.26, by request: "Adjust the typography and scale. it doesn't
         bring balance when it's that small"). The name was --fs-title and the readout 12 over 13px in a
         panel 614 wide and 566 tall at 1440 × 900, so the lines filled a strip of its upper half and
         left the rest to the photograph's weight. The name now has --fs-display at that size, as on the
         result stage and in the Full Swatch View, and every line grows and shrinks with the card
         (--upanel-s, universe.js openTile), never below the size it had before this change or past
         the step over. */
      /* LABEL, COPY AND PILL IN BALANCE (23.09.26, by request: "We need more balance between label, copy
         and pill"). The first scaled build set the figures at --fs-subtitle, 20, and left the Example
         pill at --fs-nano, 10, so the one pill on the panel was its smallest type and the figures read
         as headings. The panel now keeps the create page's rhythm for the three: labels and pills at
         --fs-body, the copy (the figures) a step up at --fs-lead, 13 · 13 · 15 at 1440 × 900, all
         three scaled with the card. The traits are the create page's pills too, in the chip voice, with
         Example beside them as the outlined identity pill. */
      nameSize: 'clamp(var(--fs-title), calc(var(--fs-display) * var(--upanel-s, 1)), calc(var(--fs-display) * 1.25))',
      metricLabelSize: 'clamp(var(--fs-fine), calc(var(--fs-body) * var(--upanel-s, 1)), var(--fs-lead))',
      metricValueSize: 'clamp(var(--fs-body), calc(var(--fs-lead) * var(--upanel-s, 1)), var(--fs-subtitle))',
      pillSize: 'clamp(var(--fs-fine), calc(var(--fs-body) * var(--upanel-s, 1)), var(--fs-lead))',
      traitList: this.paletteTags(uOpenP),
      exampleInRow: true,
      onDetail: () => this.openOverlay(uOpenP, this._uOpenCard ? this._uOpenCard.el : null),
      // The visible label is "Open Detail", so the accessible name opens with it (SC 2.5.3).
      detailAria: 'Open Detail for ' + uOpenP.name,
      onClose: () => this.closeTile(),
      closeAria: 'Close ' + uOpenP.name + ', or press Escape',
    }) : null;

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
        const values = ['hex', 'rgb', 'cmyk', 'hsl'].map((key) => {
          const f = fmt[key]; const copied = s.copied === 'ov-' + key + '-' + i;
          return {
            key, labelText: f.label, caveat: f.caveat, hasCaveat: !!f.caveat, copied, notCopied: !copied,
            value: f.display,
            aria: 'Copy ' + f.label + ' value ' + f.copy + ' for swatch ' + (i + 1) + (f.caveat ? ', ' + f.caveat : ''),
            onCopy: () => { this.copy(f.copy, 'ov-' + key + '-' + i, 'Copied ' + f.copy); trackEvent('Colour Copied', { format: key, from: 'detail' }); },
            rowStyle: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', width: '100%', background: 'transparent', border: 'none', borderTop: '1px solid ' + divCol, padding: '8px 14px', margin: 0, cursor: 'pointer', textAlign: 'left', color: on },
            colStyle: { display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0, flex: 1 },
            labelRowStyle: { display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 },
            labelStyle: this.monoLabel('var(--fs-fine)', '.14em', { color: on, opacity: 0.75, flex: 'none' }),
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
          weightPct: sharePct(b.weight, tw2),
          // The create page's tile (23.09.26, "Go with b"): its corner, clipped, and its 190px floor. The floor
          // was 210, which put five bands 26px past a 1024 window's edge, the last one's copy marks with them.
          style: { position: 'relative', flexGrow: w(b), flexBasis: 0, minWidth: '190px', background: b.hex, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderRadius: 'var(--radius-card)', overflow: 'hidden' },
          // The detail overlay's copy of the band label — same decision as the result stage's, see
          // the note there.
          weightStyle: { fontFamily: sans, fontSize: 'var(--fs-title)', fontWeight: 500, letterSpacing: 'var(--track-flat)', fontVariantNumeric: 'tabular-nums', color: on, padding: '16px 14px 0' },
          onHarmony: () => this.openHarmony(b.hex),
          harmonyAria: 'Colour harmonies for ' + fmt.hex.display,
          // The result stage's harmony button, exactly: round, 28px (see the note there).
          infoBtnStyle: this._infoBtnStyle(on),
          valuesWrap: { display: 'flex', flexDirection: 'column', width: '100%' },
          values,
        };
      });
      const omet = this.paletteMetrics(p);
      overlay = {
        // Its tiles light their colour in its photograph, as the create page's do (methods/where.js).
        whereTile: this.whereHandlers(p), whereKey: p.id + '|' + this.dispUrl(p), whereN: p.swatches.length,
        wherePrime: (e) => this._wherePrime(p, e.currentTarget),
        rename: renameFor(p, 'detail'),
        name: p.name, descriptors: this.paletteTags(p), bands: obands,
        // What the palette is for, the create page's line (23.09.26): the view reads as that page does.
        useLine: composeUse(analysePalette(p.swatches), omet.aaState, omet),
        refImage: this.dispUrl(p), hasRef: this.hasImg(p),
        refAlt: p.example === true ? 'The reference image this example palette was read from' : 'The reference image you uploaded',
        onDelete: () => this.deletePalette(p.id, null), deleteAria: 'Delete ' + p.name,
        // Share, as on the result stage (19.09.26, audit U6, by request), with its own Copied state.
        onShare: () => this.shareCurrent(p, 'ov-pal-share'), shareCopied: s.copied === 'ov-pal-share',
        // filed → the project's name; unfiled → the invitation. Same words the result view's row
        // uses, because it is now the same control in the same place on both surfaces.
        onAssign: () => this.openAssign(p),
        assignAria: this.palProjects(p).length ? 'Add ' + p.name + ' to another project, or remove it from one (currently in ' + this.palProjects(p).map((id) => this.projectName(id)).join(', ') + ')' : 'Add ' + p.name + ' to a project',
        // The state, then the project, so the button says where the palette IS and not only what
        // pressing it will do. A bare project name read as a filter; "Add to project" on a palette
        // already filed read as a second copy.
        // Always the same words. A palette can be in several projects now, so the button is never
        // reporting a single state — it is the way IN to the set, whatever the set already holds.
        assignLabel: 'Add to Projects',
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
          // THE CHOSEN METHOD IS FILLED, as a segmented control's chosen option is (19.09.26, audit Q6,
          // by request): ink ground and surface text, where it was an ink ring on the page colour. The
          // Library's sort header shares toggleStyle and keeps its ink-only state.
          style: on ? Object.assign(this.toggleStyle(true), { background: 'var(--on-surface)', color: 'var(--surface)' }) : this.toggleStyle(false),
        };
      });
      const cells = active.cells.map((c, ci) => {
        const on = this.onColor(c.hex), copied = s.copied === 'hx-' + active.id + '-' + ci;
        return {
          hex: c.hex, copied, isBase: c.base, mapped: c.mapped,
          // THE SOURCE IS NAMED. It was a 5px square in the corner with no legend anywhere — a mark
          // that can only be decoded by someone who already knows what it means.
          badge: c.base ? 'Source' : (c.mapped ? 'Mapped' : ''),
          aria: 'Copy ' + c.hex + (c.base ? ', the source colour' : '')
            + (c.mapped ? ', adjusted to fit sRGB' : ''),
          onCopy: () => { this.copy(c.hex, 'hx-' + active.id + '-' + ci, 'Copied ' + c.hex); trackEvent('Harmony Used', { action: 'copy', model: active.id }); },
          // The colour on the wrapper, the button transparent over it: data-ix="cell" tints the
          // button's own background from its ink (see the markup in AppView).
          /* A CORNER, LIKE EVERY OTHER COLOUR TILE ON THE SITE (20.09.26, by request: "colour
             harmonies examples needs border radius as well to maintain consistency"). These were
             the last square colour samples left: the result stage's bands take --radius-card, the
             contrast checker's pair sample takes --radius-card and its 24px chips take half of it,
             and this row — the same object, a colour you can press to copy with its hex on it —
             was a hard-edged strip. The corner goes on the WRAPPER because the wrapper is what
             carries the colour; the button over it is transparent, and its own overflow has to be
             clipped or the ink tint [data-ix="cell"] lays down would square the corner off again. */
          wrapStyle: { flex: 1, minWidth: 0, display: 'flex', background: c.hex, borderRadius: 'var(--radius-card)', overflow: 'hidden' },
          style: { flex: 1, minWidth: 0, height: '104px', background: 'transparent', border: 'none', color: on, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'flex-start', gap: '6px', padding: '9px 10px', cursor: 'pointer', position: 'relative' },
          // Drawn in the swatch's own guaranteed-AA on-colour, so the label is legible on every
          // colour the harmony can produce rather than on most of them.
          badgeStyle: { fontFamily: sans, fontSize: 'var(--fs-nano)', letterSpacing: 'var(--track-flat)', textTransform: 'none', borderRadius: 'var(--radius-pill)', color: on, border: '1px solid ' + (on === '#000000' ? 'rgba(0,0,0,.34)' : 'rgba(255,255,255,.46)'), padding: '2px 6px', whiteSpace: 'nowrap' },
          hexStyle: { fontFamily: sans, fontSize: 'var(--fs-fine)', letterSpacing: 'var(--track-flat)', color: on, whiteSpace: 'nowrap' },
        };
      });
      const mappedCount = active.cells.filter((c) => c.mapped).length;
      harmony = {
        hex: baseHex, models, cells,
        modelName: active.name,
        // The whole set, in the order it is shown, for the two actions below.
        hexList: active.cells.map((c) => c.hex),
        // The drawer's own title swatch, at the contrast checker's chip corner — half --radius-card,
        // the figure that file derives for a 24px chip, and this is the same object one pixel wider.
        swatchStyle: { width: '26px', height: '26px', flex: 'none', background: baseHex, border: '1px solid var(--line-strong)', borderRadius: 'calc(var(--radius-card) / 2)' },
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
        // The names open with the visible labels, "Save as Palette" and "Copy Harmony" (SC 2.5.3).
        useAria: 'Save as Palette: the ' + active.name.toLowerCase() + ' harmony becomes a new palette in your library, ' + active.cells.length + ' colours',
        onCopyAll: () => { this.copy(active.cells.map((c) => c.hex).join('\n'), 'hx-all', 'Copied all ' + active.cells.length + ' colours as a hex list'); trackEvent('Harmony Used', { action: 'copy all', model: active.id }); },
        // Copy Harmony ⇄ Copied through the text mask (WordSwap in AppView, 23.09.26).
        copyAllDone: s.copied === 'hx-all',
        copyAllAria: 'Copy Harmony: all ' + active.cells.length + ' colours in this harmony, as a hex list',
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
       HOISTED OUT OF exportView because another sheet wears it too — Copy's, until it folded into
       Export (22.09.26), and Share's — and "the same surface" has to mean one style object rather
       than two that currently agree. */
    // 11px of block padding, where it was 12: the 13px label the rows took on 19.09.26 (audit U3)
    // grew them to 41.5, and 11 lands them on the 39.5 of Add to Projects' rows and field.
    const itemBase = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', width: '100%', textAlign: 'left', background: 'var(--surface-raised)', borderRadius: 'var(--radius-pill)', border: '1px solid var(--line)', padding: '11px 18px', cursor: 'pointer', font: 'inherit', color: 'var(--on-surface)' };

    let exportView = null;
    if (s.exportOpen && (s.exportPalette || s.exportProject)) {
      const semantic = !!s.exportSemantic;
      const p = s.exportPalette;
      const pid = p ? null : s.exportProject;
      const pals = pid ? this.projectPalettes(pid) : [p];
      const n = pals.length;
      const colours = pals.reduce((a, x) => a + (semantic ? 6 : x.swatches.length), 0);
const rowKey = (id) => (pid ? 'exp-' : 'ex-') + id;
const mk = (id, label, ext) => ({ label, ext, act: 'download', done: s.copied === rowKey(id), doneWord: 'Downloaded', onPick: () => (pid ? this.doProjectExport(pid, id, semantic) : this.doExport(p, id, semantic)), onEnter: (e) => this.rowTintOn(e.currentTarget), onLeave: (e) => this.rowTintOff(e.currentTarget), onFocus: (e) => this.rowTintOn(e.currentTarget), onBlur: (e) => this.rowTintOff(e.currentTarget), style: itemBase, extStyle: { fontFamily: 'Neue Montreal', fontSize: 'var(--fs-fine)', letterSpacing: 'var(--track-flat)', color: 'var(--on-surface-muted)', flex: 'none' }, labelStyle: { fontFamily: 'Neue Montreal', fontSize: 'var(--fs-body)', color: 'var(--on-surface)' } });
      exportView = {
        name: pid ? this.projectName(pid) : p.name,
        // "Export", not "Export Tokens", since Copy lives here too (22.09.26): a hex list is not a token.
        kicker: pid ? 'Export Project' : 'Export',
        stacked: !!pid,   // opened from the library panel's Projects tab, so it renders above it
        /* WHAT THE FILE WILL HOLD, before a format is chosen. A folder export is the one act here
           whose scale is not obvious from the thing you pressed, and "8 palettes, 40 colours, one
           file" is the sentence that stops someone expecting eight downloads.

           UNREAD SINCE THE DIALOG'S THREE EXPLANATORY LINES WERE REMOVED BY REQUEST, along with
           layerLabel below. Both are still computed and still correct; nothing renders them. Kept
           rather than deleted for the reason the gate's copySiteLink is kept — putting either line
           back is then a span, not a feature — and because the strings are the argument, which is
           the expensive half. Delete them if the dialog is ever rebuilt around a different one. */
        scopeLine: pid
          ? n + ' palette' + (n === 1 ? '' : 's') + ' · ' + colours + ' colour' + (colours === 1 ? '' : 's') + ' · one file'
          : null,
        aria: pid
          ? 'Export the project ' + this.projectName(pid) + ' as design tokens, ' + n + ' palette' + (n === 1 ? '' : 's') + ' in one file'
          : 'Export ' + p.name + ': copy it, or download it as design tokens',
        semanticOn: semantic, semanticChecked: semantic ? 'true' : 'false',
        layerLabel: semantic
          ? 'Exporting the semantic scaffold' + (pid ? ', six roles per palette' : '') + '. Refine before shipping.'
          : 'Exporting the primitive layer (swatches by weight)' + (pid ? ', grouped by palette' : '') + '.',
        /* COPY IS THE FIRST GROUP OF EXPORT (22.09.26, by request: "fold copy into export"). Copy and
           Export were two doors to one job — take this palette into your work — split only by where it
           lands, the clipboard or a file, while Share is a different job. The two copies sit above the
           downloads with the same row, the same confirmation and the same scaffold switch below them,
           so the CSS on the clipboard is the CSS in the file (paletteCss, exporters.js). A single
           palette only: a folder's export has no clipboard form. */
        copies: pid ? [] : [
          { label: 'Hex List', act: 'copy', done: s.copied === 'ex-copy-hex', doneWord: 'Copied', onPick: () => { this.copy(this.paletteHexList(p), 'ex-copy-hex', 'Copied all ' + p.swatches.length + ' colours as a hex list'); trackEvent('Palette Exported', { format: 'hex', method: 'copy' }); } },
          { label: 'CSS Custom Properties', ext: 'CSS', act: 'copy', done: s.copied === 'ex-copy-css', doneWord: 'Copied', onPick: () => { this.copy(this.paletteCss(p, semantic), 'ex-copy-css', 'Copied palette as CSS custom properties'); trackEvent('Palette Exported', { format: 'css', method: 'copy' }); } },
        ].map((c) => Object.assign(c, { onEnter: (e) => this.rowTintOn(e.currentTarget), onLeave: (e) => this.rowTintOff(e.currentTarget), onFocus: (e) => this.rowTintOn(e.currentTarget), onBlur: (e) => this.rowTintOff(e.currentTarget), style: itemBase, extStyle: { fontFamily: 'Neue Montreal', fontSize: 'var(--fs-fine)', letterSpacing: 'var(--track-flat)', color: 'var(--on-surface-muted)', flex: 'none' } })),
        formats: [
          mk('tailwind', 'Tailwind v4', '@theme · CSS'),
          mk('tokens', 'Design Tokens (W3C)', 'JSON'),
          mk('figma', 'Figma Variables', 'JSON'),
          mk('css', 'CSS Custom Properties', 'CSS'),
          mk('ase', 'Adobe Swatches', 'ASE'),
          /* NO PICTURE HERE (22.09.26, by request: "Remove image"). A picture of the palette stood last
             in this list for a day, as a trial ("What are we solving with the download image feature?
             People just need the tokens and variables etc."). Every row here is a file a design or code
             tool opens. The picture then went from Share as well ("It doesn't serve a purpose this
             feature. Leave it."), so nothing on the site draws one: Share sends the link
             (methods/share.js). */
        ],
        // The switch draws itself from aria-checked now (chrome.jsx SwitchTrack, 19.09.26, audit U5):
        // its track colour, knob position and ON / OFF word went with the ringed pill.
      };
    }

    // --- projects: the Projects tab and the assign dialog ---
    // The scope chips that were built here went with the rail they filled (19.09.26, by request).
    // The scope pipeline outlived the rail: activeProjects, setProjectFilter and projectFeed are the
    // Project facet now, the first group of the Library panel (19.09.26).
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
    const a11yBase = others('a11y');
    /* ---- THE PROJECT FACET (19.09.26, by request) ----------------------------------------------
       The first group in the Library panel, on the same grammar as the rest: OR within the group,
       AND against the others, a count that holds the OTHER groups' filters but not its own.
       EVERY PROJECT IS LISTED, where the measured groups drop a value nothing has. A project is
       something the reader made, and one that vanished from the list the moment it was empty (or
       the moment another filter left it nothing) read as a project that was never saved; so a
       project that would narrow to nothing stays, inert, with its 0, as an "Every palette here" row
       does. Inert rows go after the live ones.
       FIVE, THEN SHOW ALL (Hick's law, Miller's law: twenty folders at once is a slower choice
       than five). The order is recent activity, the newest palette each project holds, and it is
       fixed while you pick: a ticked project never jumps to the top under the pointer. A ticked
       project past the fifth still shows, so what is applied is always on screen. */
    const activeProjects = s.activeProjects || [];
    const projBase = s.feed.filter((p) => this.matchesTags(p, activeTags) && this.matchesA11y(p, activeA11y) && this.matchesLight(p, activeLight) && this.matchesTemp(p, activeTemp));
    const PROJECT_ROWS = 5;
    const projectAll = s.projects.map((pr) => {
      const n = projBase.filter((p) => this.inProject(p, pr.id)).length;
      const on = activeProjects.indexOf(pr.id) >= 0;
      let newest = 0; s.feed.forEach((p) => { if ((p.time || 0) > newest && this.inProject(p, pr.id)) newest = p.time || 0; });
      const empty = !on && n === 0;
      const whole = !on && n > 0 && n === projBase.length;
      const disabled = empty || whole;
      return {
        key: pr.id, label: pr.name, count: String(n), active: on, pressed: on ? 'true' : 'false', disabled,
        recent: newest || pr.createdAt || 0,
        aria: (empty ? pr.name + ' has no palettes here'
          : whole ? 'Every palette here is in ' + pr.name + ', so it cannot narrow them further'
          : (on ? 'Remove the ' + pr.name + ' project filter, ' : 'Show only the ' + pr.name + ' project, ') + n + ' palette' + (n === 1 ? '' : 's')),
        onPick: disabled ? () => {} : () => this.setProjectFilter(pr.id),
      };
    }).sort((a, b) => (a.disabled - b.disabled) || (b.recent - a.recent));
    projectAll.forEach((o, i) => { o.extra = i >= PROJECT_ROWS && !o.active; });
    const projectShown = s.projectsAll ? projectAll : projectAll.filter((o) => !o.extra);
    const projectHidden = projectAll.length - projectShown.length;
    // One removable chip per selected tag, in the order they were picked, so the narrowing reads as
    // a sentence you can dismantle from either end. The count on the LAST chip is the live result
    // size; earlier chips show what the selection was worth at that point, which is why only the
    // final one carries a number — two numbers that mean different things is worse than one.
    const focusFacetBtn = () => requestAnimationFrame(() => { const b = document.querySelector('[data-library-btn]'); if (b) try { b.focus(); } catch (e) { } });
    // Chips for BOTH groups, accessibility first so the chip order matches the panel's group order.
    // Only the final chip carries the live result count — two numbers meaning different things
    // beside each other is worse than one.
    const appliedRaw = activeProjects.map((id) => ({
      key: 'project:' + id, label: this.projectName(id), project: true,
      aria: 'Remove the ' + this.projectName(id) + ' project filter',
      onRemove: () => { this.setProjectFilter(id); focusFacetBtn(); },
    })).concat(activeA11y.map((v) => ({
      key: 'a11y:' + v, label: A11Y_LABEL[v],
      aria: 'Remove the ' + A11Y_SPOKEN[v] + ' text usability filter',
      onRemove: () => { this.setA11yFilter(v); focusFacetBtn(); },
    }))).concat(MEAS_CHIPS(this, s, focusFacetBtn)).concat(activeTags.map((t) => ({
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
    // Filtered to nothing: a narrowing is on and no palette survives it. The panel that says so takes
    // the table's place, and the column header and the list's closing rule step aside for it
    // (19.09.26, audit U1): a header over no rows read as a stray line under the panel.
    const filteredEmpty = scopedNow === 0 && appliedTags.length > 0;

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
    /* EVERY VALUE STAYS (22.09.26, by request: "It should stay visible", then "So elements still
       disappear completely"). A value nothing here has used to leave the list, so the group changed
       shape under the reader and Dark was simply gone from a library of light palettes. It stays now,
       disabled at 0, as a project with nothing in it always did: the set of answers is fixed, and
       which ones are empty is itself the answer (the disabled look is global.css [data-sec-row]
       [aria-disabled]). A disabled row does nothing: these rows still applied their filter on a
       click while they said they could not. */
    const measuredGroups = MEASURED.map((g) => {
      const base = others(g.id === 'lightness' ? 'light' : 'temp');
      const active = s[g.key] || [];
      const options = g.values.map((v) => {
        const n = base.filter((p) => g.pick(this.paletteMetrics(p)) === v.id).length;
        const on = active.indexOf(v.id) >= 0;
        const empty = !on && n === 0;
        const whole = !on && n > 0 && n === base.length;
        const disabled = empty || whole;
        const word = v.label.toLowerCase();
        return {
          key: v.id, label: v.label, count: String(n), active: on, pressed: on ? 'true' : 'false',
          disabled, reason: whole ? 'Every palette here' : '',
          aria: empty ? 'No palettes here are ' + word
            : whole ? 'Every palette here is ' + word + ', so this cannot narrow them further'
            : (on ? 'Remove the ' : 'Show only ') + word + ' palettes, ' + n + ' of them',
          onToggle: disabled ? () => {} : () => this.setFacet(g.key, v.id),
        };
      });
      return { id: g.id, label: g.label, options, has: options.length > 0 };
    });

    // ---- the Text usability facet: OR within the group, exhaustive over the archive ----
    // Ordered most-capable first, which is the order anyone shopping for a usable palette wants.
    // A state nothing has stays, disabled at 0 (22.09.26, by request): see the note on the measured
    // groups above. It used to be suppressed, as tags were, unless it was selected.
    // The universal case reaches this group too, and matters more here than in tags: because the
    // bands partition the archive, "every palette here is Limited Text" can be the whole truth about
    // a view. Suppressed, it left one lone checkbox that did nothing and no clue why; stated, it
    // answers the question the group exists to answer without the user having to click.
    const a11yOptions = ['flexible', 'limited', 'none'].map((v) => {
      const n = a11yBase.filter((p) => this.paletteMetrics(p).aaState === v).length;
      const active = activeA11y.indexOf(v) >= 0;
      const empty = !active && n === 0;
      const disabled = empty || (!active && n > 0 && n === a11yBase.length);
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
        disabled, reason: disabled && !empty ? 'Every palette here' : '',
        aria: (empty ? 'No palettes here are ' + A11Y_SPOKEN[v]
          : disabled
          ? 'All ' + n + ' of these palettes are ' + A11Y_SPOKEN[v] + ', so this cannot narrow them further'
          : (active ? 'Remove the ' : 'Filter to ') + A11Y_SPOKEN[v] + ' palettes, ' + n + ' of them')
          + '. ' + A11Y_DEFINITION[v],
        onPick: disabled ? () => {} : () => this.setA11yFilter(v),
      };
    });

    let assignView = null;
    if (s.assignPalette) {
      const pal = s.assignPalette;
      // The tick box leads and the name follows it at the panel rows' 11px (19.09.26, audit U4), where
      // the name led and ADDED stood at the far end.
      const optStyle = (cur) => ({ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '11px', width: '100%', textAlign: 'left', background: 'var(--surface-raised)', borderRadius: 'var(--radius-pill)', border: '1px solid ' + (cur ? 'var(--on-surface)' : 'var(--line)'), padding: '11px 18px', cursor: 'pointer', font: 'inherit', color: 'var(--on-surface)' });
      /* STADIUMS, AND THE INSET THAT GOES WITH THEM. The rows were bordered rectangles in a dialog
         whose every other control had already rounded; --radius-pill clamps to half their 40px
         height, so the corner is a true stadium end. 14px of horizontal padding then put a row's
         first letter against the widest point of a 20px arc, so it goes to 18 — the same correction
         the fields and the toast each needed. The raised plate stays: these are rows you pick, not a
         surface you type into, and the plate is what tells them apart from the sheet they sit on.
         Each row is a membership toggle now, not one choice among many: `current` means "is in this
         project" rather than "is THE project". Every row is a real project — see the options list
         below for why the one that was not is gone. */
      /* memberLine IS COMPUTED AND NOT RENDERED. The view dropped it by request (see the note in
         AppView's dialog header); each row is a role=checkbox carrying aria-checked, so the state
         sits on the controls instead of in a sentence about them. It is kept because it is the
         restore path if that call is ever revisited, and it is switched here from the archive to
         the DRAFT so that path cannot come back broken: reading the saved record would have put the
         sentence in flat contradiction with the marks under it, saying "Not in any project" while
         three ticks showed on screen. Whatever states membership states what Confirm will write. */
      const pending = s.assignPending || [];
      const memberOf = pending.map((id) => this.projectName(id)).filter(Boolean);
      /* THE MARK IS THE LIBRARY PANEL'S TICK BOX (19.09.26, audit U4, by request), drawn in AppView
         from `current`. It was a 6px dot first, then the word ADDED at the row's end, easing in on the
         chrome band. Picking projects is one act here and in the panel, so it takes the panel's mark:
         the box, which states the row in shape as well as in ink (SC 1.4.1), and the ink edge the
         panel's ticked rows also wear. */
      /* THE ROWS READ THE DRAFT — `pending`, declared above with the sentence it shares a source
         with. Reading the archive here would show a row unticked immediately after it was tapped. */
      const mkOpt = (id, label) => {
        const cur = pending.indexOf(id) >= 0;
        return {
          key: String(id), label, current: cur, checked: cur ? 'true' : 'false',
          style: optStyle(cur), onEnter: (e) => this.rowTintOn(e.currentTarget), onLeave: (e) => this.rowTintOff(e.currentTarget), onFocus: (e) => this.rowTintOn(e.currentTarget), onBlur: (e) => this.rowTintOff(e.currentTarget), onPick: () => this.pickAssign(id),
          aria: cur ? 'Remove ' + pal.name + ' from ' + label : 'Add ' + pal.name + ' to ' + label,
        };
      };
      assignView = {
        /* NO `UNFILED` ROW. It was the first option here, a pseudo-project whose tick meant "in
           nothing", and it made the empty state look like a destination: to unfile a palette you
           had to FILE it somewhere called Unfiled, and the row sat among five real projects looking
           like a sixth. Unticking every project is already the whole of that act, and each row's
           own aria-checked is what states where the palette stands. Unfiled survives everywhere it is
           genuinely a place to stand — the library scope chip, projectName(), what a deleted
           project's palettes fall back to — because there it names a view of the archive rather
           than somewhere to put something. */
        name: pal.name, options: s.projects.map((pr) => mkOpt(pr.id, pr.name)),
        /* AND WITH NO PSEUDO-PROJECT, THE LIST CAN NOW BE EMPTY. It never could before: Unfiled was
           always there, so a reader with no projects still saw a row. A bare gap between the header
           and the rule reads as something that failed to load, so the empty case says what this
           place is and points at the field immediately below it, which is the only action there. */
        emptyLine: 'No projects yet. Name one below to file ' + pal.name + '.',
        /* WHERE THIS PALETTE IS, RIGHT NOW, in one line under its name — the standing answer the
           dialog was missing. A toggle tells you what a press DID; this tells you what is true, so
           someone who has ticked three rows and lost track can read the result instead of
           reconstructing it from the marks. It is a live region as well, because the sentence
           changes underneath a screen reader that has already passed it. */
        memberLine: memberOf.length
          ? 'In ' + (memberOf.length === 1 ? memberOf[0] : memberOf.slice(0, -1).join(', ') + ' and ' + memberOf[memberOf.length - 1])
          : 'Not in any project',
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
    if (s.tagMenuOpen) {
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
            onDelete: () => this.deleteProject(pr.id), deleteAria: 'Delete project ' + pr.name + ' (its palettes stay in your library)',
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
        // One line, and only when it explains why there is no act (17.09.26, by request: "Nothing is
        // replaced…" went; the counts and the two buttons say the rest).
        // "Adding it would change nothing" went on 19.09.26, by request: the counts say it.
        line: nothingNew ? 'Everything in this file is already in your library.' : '',
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
         `.about-weights` is a bar of TRUE widths and a key underneath carries the hex, the
         coordinates and the share (colour tiles, `.about-tiles`, since 19.09.26, as How it Works 2.1
         draws them). The bar then only has to show proportion, which it can do honestly at
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
          key: 'st-' + i, sid: i, hex: HX, pct: sharePct(b.weight, totW), pctNum: pct,
          // The bar's own width — the real share, to one decimal, exactly as /about's figure states
          // it. Rounded to a whole number in `pct` for the key, because that is the figure the rest
          // of the app quotes.
          share: ((b.weight / totW) * 100).toFixed(1),
          ok: okl(b),
          /* THE TILE'S INK (19.09.26, the key as tiles): the text that reads on this colour as a tile of
             itself. White where white wins; otherwise the page's #1A1A1A, or black where #1A1A1A would
             fall under 4.5 to 1. onColor's winner always clears 4.5, so this does too. */
          ink: this.onColor(HX) === '#ffffff' ? '#ffffff' : (this.contrastRatio(HX, '#1a1a1a') >= 4.5 ? '#1a1a1a' : '#000000'),
          hasRegion: !!mask, mask,
          selected: s.storySwatch === i,
          onPick: () => this.pickStorySwatch(i),
          // Never colour alone: the accessible name carries the hex, the share and whether this one
          // can be located in the picture at all.
          aria: HX + ', ' + shareSpoken(b.weight, totW) + ' of the palette'
            + (mask ? '. Show where this colour appears in the photograph' : '. Too little of the frame to locate'),
        };
      });

      const selected = (typeof s.storySwatch === 'number') ? swatchRows[s.storySwatch] : null;

      mobileStory = {
        caseId: p.id,
        // <main>'s key: the case and the telling, the same pair _syncStory builds against.
        tellKey: p.id + '/' + (s.storyTell || 0),
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
           resolves through _storyCase's once-per-load random pick without ever setting it.

           It stays named afterwards rather than reverting on the next scroll, because the name is now
           what the page is about. The lead below it is unchanged on purpose: it says what Atmos does
           with an image, which is as true of the second palette as the first, and swapping both lines
           would leave the reader nothing recognisable to land on. */
        /* THE FIRST-ARRIVAL LINE IS THE WIDTH NOTICE NOW, and it is deliberately only the
           first-arrival one: pick a case and this becomes that palette's name, which is the
           behaviour the ternary has always had. The statement does its work on the way in and then
           gets out of the way of the image the story is about. */
        heroTitle: s.storyCaseId ? p.name : 'Colour Read from Light and Atmosphere',
        /* THE ACT NAMES WHAT IT OPENS, on the same condition and for the same reason the heading
           does. "Explore an Example" is the right words exactly once — on first arrival, when the
           heading is the width notice and there is no palette on the screen yet to name. The moment
           a reader has chosen one, the button is the only thing still calling it "an example": the
           heading says High Key, the field behind it is a reading of High Key, and the act under
           both offers something generic. It is also the honest label for what the press does, which
           is open THAT palette's story, not a sample of the idea.
           Split from heroTitle rather than derived from it because the two say different things on
           the first-arrival branch — one is a sentence about the viewport, the other is a verb. */
        beginLabel: s.storyCaseId ? 'Explore ' + p.name : 'Explore an Example',
        image: this.dispUrl(p), hasImage: this.hasImg(p),
        // No descriptors: the "Warm · Dark" line under 1.1's sentence went (21.09.26, by request).
        rationale: p.rationale || '',
        useLine: composeUse(an, met.aaState, met),
        swatches: swatchRows,
        // Whether the picks' cards are final: until this case's masks settle, a colour with a region is
        // drawn as a plain cell, and settling swaps it for a button. The picks' odometer waits for it.
        picksFinal: !!masks,
        /* The bar is one role="img", so it needs one sentence describing the whole figure — /about's
           weight bar carries exactly this ("Dusk Slate by area: darkest green 44.1 per cent, …").
           Without it a screen reader meets five unlabelled spans. */
        weightsAria: p.name + ' by area: ' + swatchRows.map((r) => r.hex + ' ' + r.pct).join(', ') + '.',
        // The lit half of chapter 4. Null until a swatch is chosen, which is also the state the
        // chapter opens in — the picture is whole before it is taken apart.
        litMask: selected && selected.mask ? selected.mask : null,
        litHex: selected ? selected.hex : '',
        litPct: selected ? selected.pct : '',

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
          aria: t.label + (((s.storyTab || 'weight') === t.id) ? ', shown' : ', show this view'),
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
          const share = sw ? sharePct(sw.weight, totW) : null;
          return {
            key: r.role, name: ROLE_LABEL[r.role], hex: r.hex.toUpperCase(), swatch: r.hex,
            // The tile's ink, as the picks carry it: this cell is a block of its colour now.
            ink: this.onColor(r.hex) === '#ffffff' ? '#ffffff' : (this.contrastRatio(r.hex, '#1a1a1a') >= 4.5 ? '#1a1a1a' : '#000000'),
            // The note /about's own role cells carry: what share of the frame this colour holds.
            // The share alone, set at the cell's bottom right (19.09.26, by request: "of the frame" went).
            pct: share === null ? '' : share,
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
                // the band edge this pair was judged against, so the printed figure cannot
                // appear to cross it the wrong way (see RATIO_TEXT).
                // ":1", as the tool writes a ratio (19.09.26, by request). AppView renders it through
                // withRatios, so the ":1" is drawn and a screen reader hears "to 1" ([data-ratio]).
                val: RATIO_TEXT(ratio, ratio >= 4.5 ? 4.5 : 3) + ':1',
                // .about-checks' own three states, not .about-matrix's — see the note on the panel.
                cls: ratio >= 4.5 ? 'is--pass' : ratio >= 3 ? 'is--part' : 'is--fail',
                /* "DECORATIVE", NOT "GRAPHIC", AND THE DIFFERENCE IS A SUCCESS CRITERION. The third
                   band read "Graphic only", which tells a reader the pair is usable for graphics —
                   and 1.4.11 asks 3:1 of any graphical object that carries meaning, the very
                   threshold this band is BELOW. So the label offered a use the ratio does not
                   support: under 3:1 a pair meets no contrast minimum at all, and the only safe use
                   left is decoration, which has no requirement because it carries no information.
                   The band above it stays named for large TEXT alone even though 3:1 is also the
                   non-text figure; the two criteria share a number and nothing else. See lib/wcag.js. */
                use: ratio >= 4.5 ? 'Body Text at AA' : ratio >= 3 ? 'Large Text at AA' : 'Decorative Only',
                // NAMED, not left to two colour chips. The chips are decoration beside this.
                pair: p.swatches[i].hex.toUpperCase() + ' on ' + p.swatches[j].hex.toUpperCase(),
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
          // Title Case (19.09.26, audit U8): the labels read as the result stage's do, not in capitals.
          { key: 'hue', label: 'Hue Range', value: CAPS(an.hue.band) },
        ],
        // A11Y_LABEL, not A11Y_TITLE: the caption wants the NAME (Text-Ready); A11Y_TITLE is that
        // name plus its definition, which is a tooltip's job and a full line of type here.
        aaLabel: A11Y_LABEL[met.aaState],
        // Title Case (19.09.26, audit W3, by request), at the figure labels' 13px Medium (about.css).
        aaCount: met.aaPairs + ' of ' + met.totalPairs + ' Pairs Reach 4.5:1',

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
          return {
            key: x.id, name: x.name,
            image: this.dispUrl(x), hasImage: this.hasImg(x),
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
            note: this.paletteTags(x).join(' · '),
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
        /* THE CLOSE, SUPPLIED VERBATIM (copy brief, 14.09.26). Two sentences doing the two jobs
           this section has: name what there is to do from here, then state what the full tool needs.
           "Palette" is the output Start here names on the desktop.

           "Explore another example here" IS THE BUTTON UNDERNEATH IT, in the button's own words.
           That is the fault this line has now been rewritten for twice: it described a dropzone
           after Send to Desktop was removed, and before that a control that had already gone. The
           lead and the only act on the screen finally say the same thing.

           "Atmos", not "Atmos Gallery", and that is the register this surface already speaks in:
           the hero's lead and the chapters say Atmos in running prose ("Atmos reads how colours
           share weight"). The full name is the wordmark's and the statement headings'.

           "your computer", WHICH THE GATE'S OWN FIGURE DOES NOT AGREE WITH, and it is recorded
           here rather than quietly reconciled. MIN_TOOL_WIDTH is 1024: a tablet held in landscape
           is 1180 across and gets the whole tool without a computer being involved. This line says
           computer. Supplied copy wins over a consistency argument, and the argument is left
           written down so the next person changing either one can see the other.

           No em dash. The only dash left in product copy is the EN dash in "1\u20132 colour pairs"
           (the contrast readouts), which is a numeric range and the one place it is correct. */
        handoffLine: 'Explore another example here, or open Atmos on your computer to create a palette from your own image. The full tool requires a window at least 1024\u00a0px wide.',
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
      const msUse = composeUse(analysePalette(p.swatches), this.paletteMetrics(p).aaState, this.paletteMetrics(p));
      mobileShare = {
        name: p.name,
        descriptors: this.paletteTags(p),
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
            pct: sharePct(b.weight, totW),
            aria: 'Copy ' + HX + ', ' + shareSpoken(b.weight, totW) + ' of the palette',
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
            hexStyle: { fontFamily: 'Neue Montreal', fontSize: 'var(--fs-lead)', letterSpacing: 'var(--track-flat)', textTransform: 'uppercase' },
            // The showcase's copy of the same figure — same decision as the result stage's band
            // label, see the note there. This one had the worse veil of the two at 0.75.
            metaStyle: { fontFamily: 'Neue Montreal', fontSize: 'var(--fs-body)', fontWeight: 500, letterSpacing: 'var(--track-flat)', fontVariantNumeric: 'tabular-nums', display: 'inline-flex', alignItems: 'center', gap: '6px' },
          };
        }),
        // THE PICTURE THE PALETTE CAME FROM. dispUrl resolves a seeded example's key against the
        // bundled EXAMPLE_SRC map and returns '' for anything else, so no stored or shared string
        // can ever reach this src — the same invariant the desktop reference image rides.
        image: this.dispUrl(p), hasImage: this.hasImg(p),
        // A shared link is the only arrival now (the example view went on 17.09.26, audit C5), and
        // that reader did not choose this surface or come for the product, so the foot says where the
        // tool actually lives. The masthead's mark leaves this surface: see returnToGateOnPhone, where
        // the shared path also drops the hash and the palette.
        footLine: 'Open Atmos Gallery on a wider screen to read your own image.',
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
      showMobileStory: !!mobileStory, mobileStory,
      // The gate's `Explore an Example` (gateHasExample / gateExample) went with the phone's example
      // view on 17.09.26 (audit C5); the story is how a phone sees the examples.
      // gateCopyLink / gateLinkCopied went with the `Save for Desktop` button (see the tombstone in
      // AppView's gate). copySiteLink() and the 'gate-link' copy key are still in persistence.js.

      isUpload: s.stage === 'upload', isProcessing: busy, isResult: s.stage === 'result', isError: s.stage === 'error',
      errorTitle: s.errorTitle, errorMsg: s.errorMsg,
      canReset: s.stage !== 'upload', busy, announce: s.announce,
      reset: () => this.doReset(),
      newPalette: () => this.newPalette(),
      // landing stage (first-visit brand arrival)
      // the landing surface doubles as the small-screen surface — on phones it is always up, with
      // the gate copy in place of the statement + CTA (the tool needs room a phone hasn't got)
      showLanding: this._landingUp(), narrow: s.narrow,
      /* WHAT THE FIELD IS A READING OF. The landing's colour is no longer an authored wheel — it is
         one of the eight examples, chosen per visit and re-chosen when a phone reader opens one (see
         the amended §8 in methods/orbit.js). An artwork made out of somebody's photograph should say
         whose, and this one has a second job: it is the only thing on the front page that states
         what the tool actually does, in the same breath as showing it.
         Resolved through the same two sources orbit.js picks from, so the id can never name a
         palette the credit cannot draw — the live archive first, the seed table as the floor.
         `image` resolves through exampleThumbUrl, which only ever returns one of our own bundled
         assets: no string out of storage or off a share link can reach an <img src> (see
         pipeline.js's H1). It is the small cut, not the original: see EXAMPLE_THUMB there.
         null whenever there is nothing to credit, and the block is not rendered. */
      landingCredit: (() => {
        /* Gated on the stage being in the document, not just on the id. killOrbit deliberately
           leaves state.fieldPalId set (it must not touch state — it is on the unmount path), so
           after getStarted the id stays non-null for the rest of the session and the `!id` guard
           below never short-circuits again: every render of the tool — every keystroke, every hover
           — would filter the whole archive and build an object nothing renders. */
        const id = s.fieldPalId; if (!id || !this._landingUp()) return null;
        const pool = (s.feed || []).filter((p) => p.example === true);
        const p = (pool.length ? pool : (this._seedPool || [])).find((x) => x.id === id);
        const image = p ? this.exampleThumbUrl(p) : '';
        return p && image ? { name: p.name, image } : null;
      })(),
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
      // dropzone hover tint — JS-driven; leave restores the explicit defaults (never clears inline styles)
      // Every way toward a file also asks for the processing atmosphere's chunk (procField.js), so
      // three is usually here before the picture is. Deferred past the paint wherever the event counts
      // toward responsiveness (a tap reaches this as a compatibility mouseover); drags ask directly.
      dropEnter: (e) => { this._procFieldIntent(); if (this.state.dragOver) return; const el = e.currentTarget; el.style.background = 'color-mix(in srgb, var(--on-surface) 1%, var(--surface-raised))'; el.style.borderColor = 'color-mix(in srgb, var(--on-surface) 45%, transparent)'; },
      dropLeave: (e) => { if (this.state.dragOver) return; const el = e.currentTarget; el.style.background = 'var(--surface-raised)'; el.style.borderColor = 'var(--line-strong)'; },
      // SHARE: one press copies the link (the palette rides in its fragment, which never reaches a
      // server), and the button says Link Copied on the Copied timer.
      onShare: () => this.shareCurrent(),
      shareCopied: s.copied === 'pal-share',
      // viewing someone else's palette: nothing is in this browser's archive until they say so
      isSharedView: !!s.sharedView,
      onSaveShared: () => this.saveShared(),
      onMakeOwn: () => this.makeOwnFromShared(),
      // feed states + view toggle
      // The cold-start empty state is only cold start. Filtered-to-nothing is a different message
      // with a different way out, and showing "Palettes you generate collect here" to someone
      // holding three filters was the app answering a question nobody asked.
      feedEmpty: scoped.length === 0 && !(this.scopedFeed(s.feed).length === 0 && ((s.activeProjects || []).length || (s.activeTags || []).length || (s.activeA11y || []).length || (s.activeLight || []).length || (s.activeTemp || []).length)),
      feedHasItems: scoped.length > 0,
      // projects
      hasProjects,
      // MANAGE IS AN ACT, AND IT LEFT THE SCOPE GROUP TO SAY SO.
      // It used to sit inside the chips' shared border, after a hairline, wearing the chip
      // component's exact type and padding. Everything about that placement said "one more scope":
      // same box, same baseline, last in a row of four. The hairline was carrying the entire
      // distinction between navigating the library and changing its structure.
      //
      // MANAGE PROJECTS NO LONGER STANDS HERE. It was a bordered act at the end of this row; it is
      // the Project group's Edit in the library panel now (a tab of that panel until 19.09.26), one
      // door instead of two onto one library.
      // The file pair (save / open) reads at the action row's SECONDARY emphasis — the same edge
      // and the same full-strength ink as every other unfilled control in the app. It used to take
      // the utility tier's muted ink and 15% edge; that tier is gone (it could not hold 4.5:1 once
      // its own hover tint darkened the ground under it), so these take what everything else takes.
      // The demotion from "New generation" is carried by fill: that one is filled, these are not.
      // 15.09.26, by request: standalone text links in the floating bar — Medium and their authored case,
      // like the landing CTAs, with no border and no padding. At --fs-body (13) since 21.09.26, by request
      // ("change top navigation font-size links to 13px"); they were --fs-detail (12). The target is widened invisibly instead; see the
      // note beside [data-float-nav] [data-tier3-action] in global.css. line-height 1.25 rather than 1:
      // the text swap's mask clips to the line box, and Neue Montreal's ascent and descent are 1.2em,
      // so at 1 the descender of the p in Back Up was cut off.
      tier3BtnStyle: this.monoLabel('var(--fs-body)', 'var(--track-flat)', {
        display: 'inline-flex', alignItems: 'center', gap: '7px', padding: 0,
        background: 'none', border: 'none',
        color: 'var(--on-surface)', cursor: 'pointer',
        fontWeight: 500, lineHeight: 1.25, textTransform: 'none',
      }),
      // the library panel: a drawer in the contrast/harmony family + applied chip (one filter state)
      facetOpen: !!s.tagMenuOpen,
      /* ===== THE PROJECT GROUP (19.09.26, by request) =====
         The panel's two tabs are gone: Project is the first group of the one list, and its Edit turns
         the same rows into the management rows the Projects tab held. projectOptions are the rows on
         screen (five, the ticked ones, or all), projectMore the control that shows the rest. */
      projectOptions: projectShown,
      hasProjectOptions: projectShown.length > 0,
      projectMore: projectAll.length > PROJECT_ROWS ? (s.projectsAll ? 'Show Fewer' : 'Show All ' + projectAll.length) : '',
      projectMoreAria: s.projectsAll ? 'Show the five most recent projects' : 'Show all ' + projectAll.length + ' projects, ' + projectHidden + ' more',
      projectsAll: !!s.projectsAll,
      toggleProjectsAll: () => this.toggleProjectsAll(),
      projectsEditing: !!s.projectsEditing && hasProjects,
      // Edit is offered once there is something to edit; with no project yet the group opens on the
      // new-project field itself, since that is the only act there is.
      canEditProjects: hasProjects,
      toggleProjectsEdit: () => this.toggleProjectsEdit(),
      // A TOGGLE, because it has always claimed to be one. The trigger carries aria-expanded, so it
      // announces as a disclosure, and it only ever opened — pressing it while the panel was up
      // re-ran the open and appeared to do nothing. Now that a press outside dismisses the panel,
      // the trigger is the one press outside it that must not (it would close and immediately
      // reopen), so it has to carry the close itself. See _facetOutside.
      openFacet: () => { if (this.state.tagMenuOpen) this.closeTagFilter(); else this.openTagFilter(); },
      closeFacet: () => this.closeTagFilter(),
      // The panel covers the right of the list, so it states the result size itself rather than
      // making you close it to find out. aria-live=polite on the element (see AppView) announces
      // each change without interrupting whatever the user is doing.
      //
      // scopedNow, not the tag group's counting base (which went with the traits list on 17.09.26):
      // that base lifts the TAG group out, the wrong number for a header that says how many
      // palettes match. With a trait applied the two differ.
      // One key, not two: `matchCount` sat beside this with no consumer at all.
      // Same sentence the bar states, so the panel and the row it sits over never disagree.
      matchLabel: appliedRaw.length
        ? 'Showing ' + scopedNow + ' of ' + s.feed.length + ' palette' + (s.feed.length === 1 ? '' : 's')
        : tagPool.length + ' palette' + (tagPool.length === 1 ? '' : 's'),
      // roving arrow traversal inside a filter group — Down/Up step, Home/End jump. The rows are
      // data-sec-row since the section reveal; this still looked for the traits list's data-tg-cell
      // and found nothing, so the arrows did nothing (fixed 17.09.26 with audit H3).
      onFacetListKey: (e) => {
        const nav = ['ArrowDown', 'ArrowUp', 'Home', 'End'];
        if (nav.indexOf(e.key) < 0) return;
        const list = e.currentTarget;
        const opts = [...list.querySelectorAll('[data-sec-row][aria-pressed]')].filter((b) => !b.disabled && b.offsetParent !== null);
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
      // ===== the filter row's own state, kept visible OUTSIDE the overlay =====
      //
      // A NUMBER ON THE TRIGGER. The word said nothing about whether anything was filtered; the
      // only evidence was the chips beside it, which is fine until they wrap or the row is scanned
      // at a glance. The number is the count of narrowings currently applied, in the same place the
      // scope chips carry theirs, so the two rows report themselves the same way. It survived the
      // word: the trigger is a glyph now, and a glyph reports state even less than a noun does.
      filterCount: appliedRaw.length ? String(appliedRaw.length) : '',
      /* THE TRIGGER'S WHOLE SENTENCE, because its word names one of its two jobs. Both are named here
         — a control that opens two things and announces one of them is a control that hides the other
         — and the applied count is spoken as well as printed. Label-in-name (SC 2.5.3) holds since the
         button took the word Manage (22.09.26): every form of this name opens with it, so the visible
         label is the start of the spoken one. The title carries the short form to the pointer; the
         panel's own heading says it again the moment it arrives. */
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
      // chips above already declared which library segment we are inside. SINCE 19.09.26 a project is
      // a filter like the others, so the whole library is the denominator and every narrowing,
      // the project's included, is inside the one number.
      resultSummary: appliedRaw.length
        ? 'Showing ' + scopedNow + ' of ' + s.feed.length + ' palette' + (s.feed.length === 1 ? '' : 's')
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
      filteredEmpty,
      a11yOptions, hasA11yOptions: a11yOptions.length > 0,
      // The panel's ⓘ and the Library heading's storage marker, both removed by request, read state
      // that went with them on 17.09.26 (filterInfoOpen, a11yDefs, storeInfo); the three definitions
      // a11yDefs carried are still on every Text usability row, in its title and accessible name.

      activeTags, activeA11y,
      showFacet: tagPool.length > 0 || activeTags.length > 0 || activeA11y.length > 0,
      showProjectsBar: s.feed.length > 0 || s.projects.length > 0,
      assign: assignView, hasAssign: !!s.assignPalette, closeAssign: () => this.closeAssign(), confirmAssign: () => this.confirmAssign(), trapAssign: (e) => this.trapFocusIn('[data-assign-dialog]', e),
      /* THE TOUR. `stage` is 'invite' or null for the dialog; `card` is null unless a guidance card
         is up, which is the only thing TourGuide branches on. The two are separate keys rather than
         one because they are two surfaces with two lifetimes — the dialog is modal and short, the
         card stands for as long as the reader keeps stepping.

         EVERY STEP'S NEXT IS A LABEL AND AN ACCESSIBLE NAME, not a bare "Next": on the last step it
         reads Finish Tour, and the accessible name says which step it goes to, so a screen reader
         hears where the press leads rather than just that it leads somewhere. The aria-labels carry
         the destination; the visible labels stay short, which is the same split the sort headers
         and the close marks already make.

         DESKTOP ONLY, and it is stated here rather than in the view so there is one place that
         knows: below the supported minimum there is no result stage, no drawers and no library
         table for a card to stand beside. */
      tour: s.narrow ? null : this._tourView(),
      // Re-upload recognition. The strip reuses the archive card's value shape, so the palette the
      // user is being asked about looks the way it looks everywhere else — recognition is the whole
      // point of the dialog. Counting: `count` includes every entry already made from this image,
      // so the wording has to hold at one and at many.
      hasRecognise: !!s.recognised,
      recognise: s.recognised ? {
        name: s.recognised.palette.name,
        count: s.recognised.count,
        // Stated in words, never by colour or icon alone (SC 1.4.1).
        line: s.recognised.count === 1
          ? 'You extracted this image before. It is already in your Library.'
          : 'You extracted this image before. Your Library already holds ' + s.recognised.count + ' palettes from it.',
        strip: s.recognised.palette.swatches.map((b) => ({ style: { flexGrow: w(b), flexBasis: 0, minWidth: 0, background: b.hex } })),
        openAria: 'Open the existing palette ' + s.recognised.palette.name,
        variationAria: 'Extract this image again, adding a second entry with the same colours and keeping ' + s.recognised.palette.name,
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
      // _confirmRow: the row says "Backed Up" on Export's timer (see DoneSwap in AppView).
      backUpLibrary: () => { this.setState({ backupMenuOpen: false }); this.saveProjectFile('library'); this._confirmRow('lib-backup'); trackEvent('Library Backed Up', { palettes: s.feed.length }); },
      backupDone: s.copied === 'lib-backup',
      // still reached by the brand mark, which is now the only door to it
      showIntroAgain: () => this.returnToIntro(),
      // The phone's own way home for the brand mark — see returnToGateOnPhone in persistence.js for
      // why the two surfaces cannot share the tool's routine.
      returnToGate: () => this.returnToGateOnPhone(),
      // The same mark on the phone's front page, where "/" is the page it is on: back to its start.
      returnToStoryStart: () => this.returnToStoryStart(),
      // on phones the wordmark rides at the top exactly as it does on desktop, and stays decorative:
      // there is no tool behind the small-screen surface to hand a "back to the start" button to
      showLogoButton: !!s.landingDismissed && !s.narrow,
      showLogoDecor: !s.landingDismissed || s.narrow,
      onRestore: () => { const inp = this.projectFileRef && this.projectFileRef.current; if (inp) inp.click(); },
      onProjectFileChange: (e) => { const f = e && e.target && e.target.files && e.target.files[0]; if (f) this.importProjectFile(f); if (e && e.target) e.target.value = ''; },
      projectFileRef: this.projectFileRef,
      isListView: s.feedView === 'list', isGridView: s.feedView === 'grid',
      setList: () => this.setFeedView('list'), setGrid: () => this.setFeedView('grid'),
      listToggleStyle: this.viewToggleOptStyle(s.feedView === 'list'), gridToggleStyle: this.viewToggleOptStyle(s.feedView === 'grid'),
      listPressed: s.feedView === 'list' ? 'true' : 'false', gridPressed: s.feedView === 'grid' ? 'true' : 'false',
      listTab: s.feedView === 'list' ? 0 : -1, gridTab: s.feedView === 'grid' ? 0 : -1,
      // Two segments since the 3D view went (10.09.26): the field made it redundant.
      viewTogglePill: { position: 'absolute', top: '2px', bottom: '2px', left: '2px', width: 'calc((100% - 4px) / 2)', transform: 'translateX(' + (s.feedView === 'grid' ? 100 : 0) + '%)', background: 'var(--on-surface)', transition: this._reduce ? 'none' : 'transform var(--dur-fold) var(--ease-fold)' },
      viewToggleKey: (e) => {
        const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (!dir) return;
        e.preventDefault();
        const order = ['list', 'grid'];
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
      // Not gated on the view: the list and its footer stay laid out under the grid (see listRows).
      showPageSize: s.feed.length > 0 && scopedAll.length > PAGE_SIZES[0],
      showPager: s.feed.length > 0 && pageCount > 1,
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
      /* TWO FORMS OF ONE FACT, and they are different on purpose. The face reads "1/2" by request:
         beside two chevrons it is a position, and the words that used to be here were repeating a
         relationship the glyphs already state. The SPOKEN form keeps the sentence, because a slash
         is a typographic mark and not a word — "1/2" reaches a screen reader as "one slash two", or
         as "one half", depending on the reader. So the visible string is aria-hidden and the live
         region carries pageLabelSpoken instead; see the pager in AppView. */
      pageLabel: (page + 1) + '/' + pageCount,
      pageLabelSpoken: 'Page ' + (page + 1) + ' of ' + pageCount,
      prevDisabled: page <= 0, nextDisabled: page >= pageCount - 1,
      prevPage: () => this.setPage(page - 1), nextPage: () => this.setPage(page + 1),
      prevStyle: this.pageNavStyle(page <= 0), nextStyle: this.pageNavStyle(page >= pageCount - 1),
      // No closing rule while nothing matches: with no rows it was a hairline under the panel.
      listWrapStyle: { display: s.feed.length > 0 ? 'flex' : 'none', flexDirection: 'column', gap: '0', width: 'calc(100% + var(--row-inset) * 2)', marginInline: 'calc(var(--row-inset) * -1)', borderBottom: filteredEmpty ? '0' : '1px solid var(--line)' },
      // The list is under the grid while the grid is up: out of the tab order and the accessibility
      // tree, as it was when it was display:none, but still laid out. It is the reader's again on the
      // press that closes the grid, not when the field's fade ends — the fade takes no pointer.
      listInert: s.feedView === 'grid',
      // ===== sortable column headers =====
      // Plain <button>s in a group, so keyboard operation is the platform's, not ours: Tab reaches
      // them in visual order, Enter/Space activates. They carry aria-pressed (the same toggle
      // vocabulary the view toggle and the project chips already use) and each states its NEXT
      // action, so the label is never a lie about what activating it will do.
      // Away while nothing matches, as List | Grid is: it heads rows, and there are none.
      showSortHeader: s.feed.length > 0 && !filteredEmpty,
      // AA first — the badge leads the cluster, so its sort leads the header; both metric sorts
      // stay separate buttons over the ONE cluster column and keep operating on the true numbers
      sortCols: [
        // No widths here any more: the header sits on --row-grid, the same template the rows use,
        // so each label is sized by the track it lands in. Each right-aligns over the values it
        // sorts. (The ⓘ that shared 'aa''s track to explain the badge was removed by request.)
        // Title Case, as every control speaks since the banner voice (18.09.26, by request); the
        // uppercase transform that hid the source case is lifted for these by data-sort-col.
        { key: 'aa', label: 'AA Text Pairs' },
        { key: 'contrast', label: 'Max Contrast' },
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
          /* A CHIP, NOT A COLUMN, AND NOW THE SYSTEM'S TOGGLE TYPE (18.09.26, by request):
             toggleStyle, as the harmonies drawer's model pills are — a stadium on --btn-pad-sm, 13px
             Medium in the label's own case (data-sort-col joins the case list in global.css). The
             sorted column is carried by full ink and its chevron; the others are muted.
             NO EDGE, as before: global.css removes these three heads' border by request (a row of
             outlined boxes along the header's rule read as chrome), so the stadium is drawn only by
             the press tier's hover and press tint. `border:none` is stated here too, so the inline
             style says what renders.
             It hugs its label and sits at its track's end; filling the whole track was tried and
             removed, because a tint one column wide reads as the column having a state.
             Created carries no private margin: the header grid's --row-inset padding is the 16px
             it used to hold for itself, and the stamp below gets the same figure from the row
             grid — one token, both edges, cannot drift. */
          style: Object.assign(this.toggleStyle(active), {
            border: 'none',
            width: 'auto', minWidth: 0, justifySelf: 'end',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px',
            whiteSpace: 'nowrap',
          }),
        };
      }),
      // CLIP, NOT HIDDEN. A hidden overflow still scrolls when something inside asks — and focus()
      // on a tile that sits past the stage's edge asks: the browser scrolled this box 418px to bring
      // the tile in, the whole field with it, and nothing ever scrolled it back. The pan engine lays
      // the field out in stage coordinates and so does the open card, so a scrolled stage put both
      // 418px from where they were computed to be. clip forbids the scroll at the source; the engine
      // (centerOnTile) is what brings a focused tile into view, and always was meant to be.
      // UP WHILE IT LEAVES. The toggle flips to List on the press (setFeedView), so the view's own
      // exit runs with the state already on the list; gridLeaving keeps the layer on screen for it.
      // A leaving field takes no pointer and no focus: a press during its fade lands on the list it is
      // revealing, and Grid pressed again brings the field back (universe.js _resumeGrid).
      spaceStyle: { display: s.feed.length > 0 && gridUp ? 'block' : 'none', position: 'fixed', inset: 0, zIndex: 90, background: 'var(--surface-raised)', overflow: this._reduce ? 'auto' : 'clip', touchAction: this._reduce ? 'auto' : 'none', userSelect: 'none', cursor: this._reduce ? 'default' : 'grab', pointerEvents: s.gridLeaving ? 'none' : undefined },
      spaceLeaving: !!s.gridLeaving,
      universeEngine: !this._reduce, universeReduced: !!this._reduce,
      spaceRef: this.spaceRef, planeRef: this.planeRef, universeCloseRef: this.universeCloseRef,
      // The content layer lives INSIDE the plane, above the lifted card — z 5 over [clones auto,
      // originals 1, shade 2, open card 4] — because the surface it lands on is the panel inside that
      // card. No background and no border of its own: the panel draws those. Its box is the engine's
      // to set (left/top/width/height on open, from the viewport); React owns only what never moves.
      universePanel, universePanelStyle: { position: 'absolute', top: 0, left: 0, zIndex: 5, opacity: 0, pointerEvents: 'none', display: 'flex', flexDirection: 'column', overflow: 'hidden', textAlign: 'left', background: 'transparent', color: 'var(--on-surface)' },
      // overlay
      overlay, hasOverlay: !!s.overlay, closeOverlay: () => this.closeOverlay(),
      overlayRef: this.overlayRef, overlayBandsRef: this.overlayBandsRef, trapFocus: (e) => this.trapFocus(e),
      onBrowse: () => { this._procFieldIntent(); if (this.fileRef.current) this.fileRef.current.click(); },
      onFile: (e) => { const f = e.target.files && e.target.files[0]; if (f) this.handleIncoming(f, 'browse'); e.target.value = ''; },
      onDrop: (e) => { e.preventDefault(); this.setState({ dragOver: false }); const f = e.dataTransfer.files && e.dataTransfer.files[0]; this.handleIncoming(f, 'drop'); },
      onDragOver: (e) => { e.preventDefault(); if (!this.state.dragOver) { this._procFieldPrefetch(); this.setState({ dragOver: true }); } },
      onDragLeave: (e) => { e.preventDefault(); this.setState({ dragOver: false }); },
      onGridKey: (e) => this.onGridKey(e),
      fileRef: this.fileRef, canvasRef: this.canvasRef, resultRef: this.resultRef, progRef: this.progRef, gridRef: this.gridRef,
      dropStyle: { position: 'relative', display: 'flex', borderRadius: 'var(--radius-surface)', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '24px', width: '100%', minHeight: '420px', padding: '40px', background: s.dragOver ? 'var(--surface-white)' : 'var(--surface-raised)', border: '1px ' + (s.dragOver ? 'solid' : 'dashed') + ' ' + (s.dragOver ? 'var(--on-surface)' : 'var(--line-strong)'), cursor: 'pointer', font: 'inherit', color: 'var(--on-surface)', transition: 'background var(--dur-fast) var(--ease-standard),border-color var(--dur-fast) var(--ease-standard)' },
      // ===== nav controls: theme toggle + contrast checker =====
      isDark: s.theme === 'dark' ? 'true' : 'false',
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
        stagger: this.DUR ? this.DUR.line : 0.09,
        rule: this.DUR ? this.DUR.overlay : 0.8,
        // The fallbacks are the GSAP names nearest each token (17.09.26, audit F4): GSAP does not
        // read a cubic-bezier() string, and power3.out was a different curve from entrance's expo.
        ease: this.EASE ? this.EASE.entrance : 'expo.out',
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
        duration: this.DUR ? this.DUR.focus : 0.9,
        ease: this.EASE ? this.EASE.reveal : 'power2.out',
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
        // /create from a document opens the tool the way /about's closing act does (openCreate), so a
        // reader who met the landing first is not crossed back onto it.
        if ((url.pathname.replace(/\/+$/, '') || '/') === CREATE_PATH && isDoc(this.state.route)) { this.openCreate(); return; }
        this.navigateTo(url.pathname);
      },
      /* The same swap, addressed directly. AboutPage's copy is injected HTML, so its links are not
         React elements and navigate()'s currentTarget contract cannot apply — that page resolves the
         anchor with closest() and calls this. Kept as a separate entry rather than loosening
         navigate(), because navigate() being a plain onClick handler is what makes every link in JSX
         a real address with a router in front of it. */
      navigateTo: (p) => this.navigateTo(p),
      // /about's closing act: the tool on a desktop-wide window, the front page below it (misc.js).
      openCreate: () => this.openCreate(),
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
      assignLabel: 'Add to Projects',
      assignCurAria: filedCur ? (this.palProjects(filedCur).length ? 'Add ' + filedCur.name + ' to another project, or remove it from one (currently in ' + this.palProjects(filedCur).map((id) => this.projectName(id)).join(', ') + ')' : 'Add ' + filedCur.name + ' to a project') : 'Save this palette to your Library before filing it in a project',
      contrast: cx, hasContrast: !!cx, closeContrast: () => this.closeContrast(), trapContrast: (e) => this.trapContrast(e),
      // delete + undo toast
      /* The toast says "<name> deleted" for a palette, whose name is the thing you would look for
         if you had deleted the wrong one. A project states its KIND instead — the deleting is done
         from a panel that lists every project by name, so the row that vanished is the answer to
         "which one", and the sentence has one job: to be the handle on Undo. The spoken form still
         names it (see the announce in deleteProject), so nothing is lost to a screen reader. */
      hasToast: !!s.toast, toastLabel: s.toast ? (s.toast.label || s.toast.name + ' deleted') : '',
      // A run of deletions is undone together (overlays.js deletePalette), and its two answers say so.
      undoAria: s.toast && s.toast.count > 1 ? 'Undo all ' + s.toast.count + ' deletions' : 'Undo the deletion',
      dismissAria: s.toast && s.toast.count > 1 ? 'Dismiss, keep the deletions' : 'Dismiss, keep the deletion', undoDelete: () => this.undoDelete(),
      onDismissToast: () => this.dismissUndoToast(),
      // quiet non-blocking notice (e.g. live interpreter unreachable → local fallback)
      hasNotice: !!s.notice, notice: s.notice || '',
      // alert for a notice that stays until dismissed, status for one that passes — see showNotice
      noticeRole: s.noticeSticky ? 'alert' : 'status',
      dismissNotice: () => this._dismissNotice(), holdNotice: () => this._holdNotice(), releaseNotice: () => this._releaseNotice(),
      // analytics consent — the banner, the two answers, and the doors back to it (methods/consent.js).
      // openConsent takes a click from a React control or the element itself from docLinkHandler, and
      // hands on whichever control opened it so focus can go back there.
      consentOpen: !!s.consentOpen, consentChoice: s.consent, analyticsOn: s.consent === 'granted',
      allowAnalytics: () => this.chooseConsent('granted'), declineAnalytics: () => this.chooseConsent('denied'),
      closeConsent: () => this.dismissConsent(), learnAboutAnalytics: (e) => this.learnAboutAnalytics(e),
      openConsent: (x) => this.openConsent(x && x.currentTarget ? x.currentTarget : x),
      // per-swatch colour harmonies
      harmony, hasHarmony: !!s.harmony, closeHarmony: () => this.closeHarmony(), trapHarmony: (e) => this.trapHarmony(e),
      // token export
      export: exportView, hasExport: !!exportView,
      closeExport: () => this.closeExport(), trapExport: (e) => this.trapExport(e),
      toggleExportSemantic: () => this.setState((st) => ({ exportSemantic: !st.exportSemantic })),
      pill, result, procStatus, procOrb, procStep: s.procStep, procGroups: s.procGroups,
    };
  },
};
