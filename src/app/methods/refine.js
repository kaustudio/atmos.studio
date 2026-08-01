// REFINEMENT — the step between reading a palette and shipping it.
//
// The audit's complaint was that a palette could be read or exported but never decided about: no
// way to say which colour is the background, and no way to nudge one that is nearly right. This is
// that step, and it is deliberately a surface of its own rather than editing chrome bolted onto the
// result view — the result view is a screen people mostly READ, and permanent editing controls on
// it would tax every visit to pay for an occasional one.
//
// NON-DESTRUCTIVE, and the shape of that matters. `swatches` stays the working set, so all six
// surfaces that draw a palette (result bands, list strip, universe card, reel band, facet exemplar,
// gradient stops — every one of them via swatchGrow) show the refined colours with no changes at
// all. The extraction's own output moves aside into `sourceSwatches` on the FIRST edit only, which
// is what Reset restores from and what makes "never refined" the absence of a field rather than a
// flag to maintain.
//
// Two different reversals, deliberately kept apart:
//   Undo   in-session, multi-step, held on the instance and dropped on close. Costs nothing in
//          schema. The archive's own undo is one slot with a 6.5s fuse, which is right for a
//          deletion and useless for a sequence of edits.
//   Reset  persisted, single: throw away every refinement and return to the extraction.
import { gamutMap, rgb2oklab, hexToRgb } from '../../lib/color.js';
import { ROLE_IDS, ROLE_LABEL } from '../../lib/exporters.js';

// A swatch, rebuilt around a new hex. L/a/b are recomputed rather than carried, because every
// consumer downstream (metrics, roles, the reading engine) reads them and a stale pair would make
// the palette describe a colour it no longer holds. sid and weight ride along untouched: identity
// and area are not what an adjustment changes.
function reswatch(s, hexStr) {
  const c = hexToRgb(hexStr), lab = rgb2oklab(c[0] / 255, c[1] / 255, c[2] / 255);
  return { sid: s.sid, hex: hexStr, weight: s.weight, L: lab.L, a: lab.a, b: lab.b };
}

export const refineMethods = {
  // ---- motion ----------------------------------------------------------------------------------
  // THE SURFACE ARRIVES IN THE ORDER IT IS READ, on the shared overlay band and curve.
  //
  // This is the one overlay with a real reading order — palette, then the swatch in hand, then the
  // axes that change it, then what the change does — so it is the one where a sequence is worth
  // more than a fade. It briefly lost that to a flat 180ms settle and got it back at 0.4s, which is
  // the length at which the panel is already present (expo-out: nearly all the travel is in the
  // first fifth) while its contents still resolve in order.
  //
  // SEAMLESS means overlapped, not queued. Every stage starts while the one before it is still
  // moving — the bands begin at 0.1 of the panel's travel, the identity at 0.3, the axes at 0.42,
  // the preview and the contrast card behind them — so there is no frame in which exactly one thing
  // is animating and no seam between the stages. Total tail is a shade over the panel's own 0.4s.
  //
  // COLOUR LEADS. The band wipe is the result stage's own clip-path rise, which is what ties this
  // surface to the palette it came from rather than making it a generic modal.
  _refineIn() {
    const g = window.gsap, root = document.querySelector('[data-refine-dialog]');
    if (!g || !root) return;
    const D = this.DUR.overlay, E = this.EASE.overlay, step = this.DUR.overlayStep;
    const panel = root, back = root.parentElement && root.parentElement.querySelector('[data-modal-backdrop]');
    const bands = [...root.querySelectorAll('[data-refine-swatch]')];
    const title = root.querySelector('[data-refine-title]');
    const axes = [...root.querySelectorAll('[data-refine-axis]')];
    const preview = root.querySelector('[data-refine-preview]');
    const evidence = [...root.querySelectorAll('[data-refine-sec]')];
    if (this._reduce) {
      if (back) g.from(back, { opacity: 0, duration: .12, ease: 'none' });
      g.from(panel, { opacity: 0, duration: .12, ease: 'none' });
      this._refinePill(true);
      return;
    }
    const tl = g.timeline();
    if (back) tl.from(back, { opacity: 0, duration: D, ease: 'none' }, 0);
    tl.from(panel, { opacity: 0, y: 10, duration: D, ease: E, clearProps: 'transform' }, 0);
    if (bands.length) {
      tl.set(bands, { clipPath: 'inset(100% 0 0 0)' }, 0)
        .to(bands, { clipPath: 'inset(0% 0 0 0)', duration: D * 0.85, stagger: step, ease: E, clearProps: 'clipPath' }, D * 0.1);
    }
    // EVERYTHING BELOW MASKS. The band wipe above is the same mechanic, so the whole surface arrives
    // in one language: each part is uncovered from its bottom edge in the order it is read. These
    // were opacity fades, which at this tempo read as the dialog resolving out of nothing.
    this._maskIn(tl, title ? [title] : [], D * 0.3, D * 0.7, 0);
    this._maskIn(tl, axes, D * 0.42, D * 0.7, step * 2);
    // The preview is uncovered WITH the axes rather than after them: it is the other half of the
    // same control, and a specimen that arrives late reads as a result of the axes instead of a
    // companion to them.
    this._maskIn(tl, preview ? [preview] : [], D * 0.48, D * 0.7, 0);
    // 2px of bleed: these sections carry the drawn group rules at -1px, outside their border box,
    // and a flush mask would clip the rule away for the length of the wipe.
    this._maskIn(tl, evidence, D * 0.58, D * 0.7, step * 2, 2);
    // The group dividers draw left to right, on the same timeline so they reverse with everything
    // else. Later than the drawers' 0.4 because Refine's own sections start later — the rule under
    // Palette structure has to follow the section it is ruling off, not lead it.
    this._drawRules(tl, root, D * 0.62);
    // The marker lands on the opening selection AFTER the bands have their real widths — measured,
    // never assumed, because flexGrow decides them.
    tl.call(() => this._refinePill(true), null, D * 0.95);
    // The masked line reveal, on the same schedule the drawers use — one text mechanic across every
    // overlay rather than a signature two of them happen to have.
    this._revealDrawerText('[data-refine-dialog]');
  },
  // The travelling selection marker. Same mechanic and the same curve as the project chips' pill
  // (misc.js _updateProjPill): the movement is the feedback, so there is no static "selected"
  // treatment on the swatch to keep in step with it. `jump` places it without a transition — on
  // open, and after a reorder, where sliding from a position that no longer means anything would
  // read as the wrong swatch moving.
  _refinePill(jump) {
    try {
      const root = document.querySelector('[data-refine-dialog]'); if (!root) return;
      const pill = root.querySelector('[data-refine-pill]'); if (!pill) return;
      const cur = root.querySelector('[data-refine-swatch][aria-pressed="true"]');
      if (!cur) { pill.style.opacity = '0'; return; }
      const first = pill.style.opacity !== '1';
      pill.style.transition = (jump || first || this._reduce) ? 'none'
        : 'transform .5s cubic-bezier(.625,.05,0,1), width .5s cubic-bezier(.625,.05,0,1), height .5s cubic-bezier(.625,.05,0,1)';
      pill.style.width = cur.offsetWidth + 'px';
      pill.style.height = cur.offsetHeight + 'px';
      pill.style.transform = 'translate(' + cur.offsetLeft + 'px,' + cur.offsetTop + 'px)';
      pill.style.opacity = '1';
    } catch (e) { }
  },
  // SWITCHING SWATCH MOVES THE SLIDERS. Without this the three thumbs teleport, and the surface
  // reads as three unrelated readouts rather than one instrument pointed at a different colour.
  //
  // The tween writes input.value directly on each frame: a range input's thumb position IS its
  // value, so there is no other way to put it in motion. Safe because no state changes during the
  // tween, so React never re-renders over it, and the tween lands exactly on the value React
  // already holds. Direct manipulation is untouched — dragging is 1:1, always. Only this indirect
  // change is eased, which is the whole distinction: what the hand does is immediate, what the
  // interface does on your behalf has a curve.
  _refineSlide(from) {
    const g = window.gsap, root = document.querySelector('[data-refine-dialog]');
    if (!g || !root || this._reduce || !from) return;
    ['l', 'c', 'h'].forEach((k) => {
      const el = root.querySelector('#refine-' + k);
      if (!el || typeof from[k] !== 'number') return;
      const to = parseFloat(el.value);
      if (!isFinite(to) || Math.abs(to - from[k]) < 1e-6) return;
      // Hue is a circle: 350° to 10° is 20° the short way and 340° the long way, and the long way
      // is a thumb sprinting the full width of the track to land next door.
      let start = from[k];
      if (k === 'h' && Math.abs(to - start) > 180) start += (to > start ? 360 : -360);
      // Put the thumb BACK to where it came from, synchronously, before anything paints. React has
      // already re-rendered this input with the destination value by the time this callback runs,
      // so without this line the thumb lands first and then slides away from where it landed — the
      // motion plays, but after the fact, which is worse than no motion at all.
      const startVal = k === 'h' ? ((start % 360) + 360) % 360 : start;
      el.value = String(startVal);
      const proxy = { v: start };
      g.to(proxy, {
        v: to, duration: this.DUR.state * 1.4, ease: this.EASE.standard,
        onUpdate: () => { el.value = String(k === 'h' ? ((proxy.v % 360) + 360) % 360 : proxy.v); },
        onComplete: () => { el.value = String(to); },
      });
    });
  },
  _refineSliderValues() {
    const root = document.querySelector('[data-refine-dialog]'); if (!root) return null;
    const out = {};
    ['l', 'c', 'h'].forEach((k) => { const el = root.querySelector('#refine-' + k); if (el) out[k] = parseFloat(el.value); });
    return out;
  },
  // Reorder and removal move bands that already exist, so they FLIP rather than re-render: the
  // swatch you moved travels to where you put it. Same primitive the result stage uses, scoped to
  // this strip's own nodes.
  _refineFlipFrom(rects) {
    const g = window.gsap, root = document.querySelector('[data-refine-dialog]');
    if (!g || !root || !rects || !rects.length || this._reduce) return;
    const els = [...root.querySelectorAll('[data-refine-swatch]')];
    els.forEach((el, i) => {
      const from = rects[Math.min(i, rects.length - 1)], to = el.getBoundingClientRect();
      if (!from || !to.width) return;
      g.set(el, { transformOrigin: 'top left', x: from.left - to.left, scaleX: from.width / to.width });
      g.to(el, { x: 0, scaleX: 1, duration: this.DUR.reveal, ease: this.EASE.entrance, clearProps: 'transform' });
    });
  },
  _refineStripRects() {
    try {
      const root = document.querySelector('[data-refine-dialog]'); if (!root) return null;
      const els = [...root.querySelectorAll('[data-refine-swatch]')];
      return els.length ? els.map((el) => el.getBoundingClientRect()) : null;
    } catch (e) { return null; }
  },

  // ---- lifecycle -------------------------------------------------------------------------------
  openRefine() {
    const p = this.state.current;
    if (!p) return;
    this._refineBack = document.activeElement;
    this._refineUndo = [];
    this._refineCoalesce = null;
    /* The page behind stops scrolling. Lenis owns the document's scroll, so overscroll-behavior
       alone cannot hold it: the wheel never reaches the browser's own chaining logic, Lenis reads
       it and moves the page regardless of what is under the pointer. Stopping it is the same thing
       the universe view already does for the same reason. The CSS containment stays as well, for
       the case Lenis is absent — reduced motion, or the library failing to load. */
    this._lenisStop();
    this.setState({
      refineOpen: true,
      refineSel: 0,
      refineRoleOpen: false, refineResetArmed: false, refineRemoveIdx: null, refineAllPairs: false,
      announce: 'Refining ' + p.name + '. Choose a swatch, then assign a role or adjust its colour. Press Escape to close.',
    }, () => {
      // ENTER ON THE TASK, NOT ITS EXIT. This took the dialog's first button, which is Done in the
      // header — so a keyboard user arrived on the way out and had to Tab past the whole surface to
      // reach the thing they opened it to do. The selected swatch is the first meaningful control:
      // it is the object being edited, it is where the arrow keys already work, and Tab from there
      // runs forward through the axes in reading order.
      const d = document.querySelector('[data-refine-dialog]');
      if (d) {
        const el = d.querySelector('[data-refine-swatch][aria-pressed="true"]') || d.querySelector('button');
        if (el) try { el.focus(); } catch (e) { }
      }
      requestAnimationFrame(() => this._refineIn());
    });
  },
  closeRefine() {
    const back = this._refineBack;
    // It leaves the way it arrived, in reverse and faster: the panel drops, the backdrop follows.
    // Exit outlives the state change (React would unmount the node mid-tween otherwise) — the same
    // discipline as every other surface here.
    this._lenisStart();
    this._dialogOut('[data-refine-dialog]', () => this.setState({ refineOpen: false, refineSel: 0, refineRoleOpen: false, refineResetArmed: false, refineRemoveIdx: null, refineAllPairs: false, announce: 'Refine closed.' }, () => {
      // The undo stack is a property of the session, not of the palette. Dropping it here is what
      // keeps it out of the schema and out of the quota story.
      this._refineUndo = [];
      if (back && back.focus) try { back.focus(); } catch (e) { }
    }));
  },
  trapRefine(e) { this.trapFocusIn('[data-refine-dialog]', e); },
  // PAIRING DETAIL IS A LAYER, NOT A SECTION. It overlays the canvas and scrolls inside itself, so
  // the editor keeps its height and Palette structure never moves while somebody inspects the
  // matrix. It arrives from the right, the way a drawer should, and leaves the same way.
  openPairings() {
    this._pairBack = document.activeElement;
    this.setState({ refineAllPairs: true }, () => {
      const el = document.querySelector('[data-refine-pairs]');
      if (el) { const b = el.querySelector('button'); if (b) try { b.focus(); } catch (e) { } }
      const g = window.gsap;
      if (!g || this._reduce || !el) return;
      g.from(el, { xPercent: 12, opacity: 0, duration: this.DUR.state, ease: this.EASE.fold, clearProps: 'transform,opacity' });
    });
  },
  // `toSwatch` is the repair path: a pairing row was activated, the selection has already moved to
  // the swatch that can fix it, and focus has to follow it there rather than snapping back to the
  // View all pairings button. Without this the close tween outlives refineSelect's focus call and
  // takes it back — the selection moved, the keyboard did not, and the two disagreed.
  closePairings(toSwatch) {
    const back = this._pairBack;
    const g = window.gsap, el = document.querySelector('[data-refine-pairs]');
    const done = () => this.setState({ refineAllPairs: false }, () => {
      const target = toSwatch
        ? document.querySelector('[data-refine-swatch][aria-pressed="true"]')
        : back;
      if (target && target.focus) try { target.focus(); } catch (e) { }
    });
    if (!g || this._reduce || !el) { done(); return; }
    g.to(el, { xPercent: 12, opacity: 0, duration: this.DUR.state * 0.7, ease: this.EASE.fold, onComplete: done });
  },
  trapPairings(e) { this.trapFocusIn('[data-refine-pairs]', e); },
  // Removal is armed from the swatch itself; the confirmation folds open under the strip.
  refineArmRemove(i) {
    const p = this.state.current;
    if (!p || p.swatches.length <= 3 || !p.swatches[i]) return;
    const roles = this._rolesOn(p, i);
    this.setState({ refineSel: i, refineRemoveIdx: i, announce: 'Removing swatch ' + (i + 1) + '. ' + (roles.length ? roles.join(' and ') + ' will be reassigned. ' : '') + 'Confirm or cancel.' },
      () => { this._refinePill(); this._foldIn('[data-refine-confirm]'); });
  },
  refineCancelRemove() { this.closeFold('refineRemoveIdx', '[data-refine-confirm]', () => this.setState({ refineRemoveIdx: null, announce: 'Removal cancelled.' })); },
  refineConfirmRemove() {
    const i = this.state.refineRemoveIdx;
    this.closeFold('refineRemoveIdx', '[data-refine-confirm]', () => { this.setState({ refineRemoveIdx: null }, () => this.refineRemove(i)); });
  },
  // ONE SELECTION MODEL. The strip is the only thing that selects a swatch — by pointer, by arrow
  // key, by Home/End. The Roles panel is the property editor FOR that selection, not a second list
  // to pick from; every route into selection therefore lands in refineSelect and updates the strip,
  // the role rows, the panel heading, the sliders and the live region together.
  refineKey(e) {
    const p = this.state.current; if (!p) return;
    const n = p.swatches.length, cur = this.state.refineSel || 0;
    let next = null;
    if (e.key === 'ArrowRight') next = Math.min(n - 1, cur + 1);
    else if (e.key === 'ArrowLeft') next = Math.max(0, cur - 1);
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = n - 1;
    if (next === null || next === cur) return;
    e.preventDefault();
    this.refineSelect(next, true);
  },
  refineSelect(i, focus) {
    const p = this.state.current; if (!p || !p.swatches[i] || this.state.refineSel === i) return;
    // Read the thumbs BEFORE the swap, so the tween has a real starting point rather than the
    // destination it is already sitting on.
    const from = this._refineSliderValues();
    // A new swatch is a new gesture: the latch is per (swatch, axis, value), but clearing it here
    // as well means switching selection can never inherit a stale one.
    this._refineGestureEnd();
    const roles = this._rolesOn(p, i);
    this.setState({ refineSel: i, announce: (roles.length ? roles.join(' and ') + '. ' : 'No role. ') + 'Swatch ' + (i + 1) + ' of ' + p.swatches.length + ', ' + p.swatches[i].hex.toUpperCase() + ' selected.' }, () => {
      this._refinePill();
      this._refineSlide(from);
      if (focus) { const el = document.querySelectorAll('[data-refine-swatch]')[i]; if (el) try { el.focus(); } catch (e) { } }
    });
  },

  // Which modifier the shortcut hint should name. Platform, not browser: the key a Mac user reaches
  // for is Command whatever engine is rendering this.
  _isMac() { try { return /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || ''); } catch (e) { return false; } },
  // Which roles a swatch answers right now, resolved (user assignment over derived) and spoken.
  _rolesOn(p, i) {
    try { return this.semanticRoles(p, p.roles).filter((r) => r.index === i).map((r) => ROLE_LABEL[r.role]); }
    catch (e) { return []; }
  },
  // ACCESSIBILITY AS A RESULT, NOT A STATUS WORD.
  //
  // "Limited" said nothing: limited against what, and how far off? And the palette-wide count it
  // sat beside was every C(n,2) combination — 10 pairs for 5 swatches, most of which nobody would
  // ever set type in. A denominator made of pairings no one would use is not a measure of anything.
  //
  // These are the pairs a designer would actually build with: the four content roles on the two
  // ground roles. Eight, always, whatever the swatch count — the audit's example says six, but any
  // fixed subset is arbitrary unless it can be derived, and content-on-ground is the set that can.
  // Roles that double onto one swatch produce a same-colour pair that fails at 1:1, which is the
  // honest answer rather than a hidden exclusion.
  GROUND_ROLES: ['background', 'surface'],
  CONTENT_ROLES: ['primary', 'secondary', 'accent', 'text'],
  roleContrast(pal, selIdx) {
    let resolved;
    try { resolved = this.semanticRoles(pal, pal.roles); } catch (e) { return null; }
    const at = {};
    resolved.forEach((r) => { at[r.role] = r.hex; });
    const pairs = [];
    this.CONTENT_ROLES.forEach((fg) => {
      this.GROUND_ROLES.forEach((bg) => {
        const fgHex = at[fg], bgHex = at[bg];
        if (!fgHex || !bgHex) return;
        const ratio = this.contrastRatio(fgHex, bgHex);
        pairs.push({ fg, bg, fgHex, bgHex, ratio, aa: ratio >= 4.5, aaa: ratio >= 7 });
      });
    });
    if (!pairs.length) return null;
    const passed = pairs.filter((x) => x.aa).length;
    const byRatio = pairs.slice().sort((a, b) => b.ratio - a.ratio);

    // THE PAIR SHOWN IS THE ONE THE USER IS AFFECTING, not the palette's best. Leading with the
    // strongest pairing answers a question nobody asked while dragging: the swatch in hand may not
    // be in it at all, so the card would sit still through an edit that changed everything about
    // the colour being edited. Prioritise pairs that involve a role the SELECTED swatch holds —
    // grounds show what will sit on them, content roles show where they can be set.
    const selRoles = resolved.filter((r) => r.index === selIdx).map((r) => r.role);
    const involving = byRatio.filter((x) => selRoles.indexOf(x.fg) >= 0 || selRoles.indexOf(x.bg) >= 0);
    const focus = involving.length ? involving[0] : byRatio[0];
    const onRole = selRoles.filter((rr) => this.GROUND_ROLES.indexOf(rr) >= 0)[0]
      || selRoles.filter((rr) => this.CONTENT_ROLES.indexOf(rr) >= 0)[0] || null;
    return {
      pairs: byRatio, passed, total: pairs.length, best: byRatio[0],
      focus, focusRole: onRole, contextual: !!involving.length,
    };
  },

  // ---- the one write path ----------------------------------------------------------------------
  // Every refinement goes through here, so there is exactly one place that preserves the source,
  // pushes undo, keeps `current` and the feed entry in step, and persists. `structural` marks the
  // edits that change the shape of the band strip (reorder, remove) rather than only its colours —
  // that is the flag componentDidUpdate watches to decide whether to run a FLIP.
  _applyRefine(patch, opts) {
    const st = this.state, p = st.current;
    if (!p) return;
    const o = opts || {};
    /* ONE DRAG IS ONE UNDO. A range input fires onChange for every value it crosses, so a single
       pull of the lightness slider used to push forty snapshots and Cmd+Z walked back through all
       of them one pixel at a time. Anything passing a `coalesce` key snapshots only the FIRST
       change of that gesture; the rest write straight through.

       The key is per swatch and per axis, so dragging lightness and then chroma on the same swatch
       are two steps, which is what a user would count. The gesture ends on pointerup, keyup or blur
       (see _refineGestureEnd) rather than on a timer — a slow drag with a pause in it is still one
       drag, and a timer would split it. Any action without a key clears the run, so a reorder
       between two drags cannot be swallowed into either. */
    const key = o.coalesce || null;
    const sameRun = key && this._refineCoalesce === key;
    this._refineCoalesce = key;
    if (!sameRun) {
      // Snapshot BEFORE the change, so undo restores what the user was looking at when they acted.
      this._refineUndo = (this._refineUndo || []).concat([{
        swatches: p.swatches.map((s) => Object.assign({}, s)),
        roles: p.roles ? Object.assign({}, p.roles) : null,
        sel: st.refineSel,
      }]);
    }
    this._commitRefine(patch, o);
  },
  // Write a {swatches?, roles?} patch onto the current palette and its feed record.
  _commitRefine(patch, opts) {
    const st = this.state, p = st.current;
    if (!p) return;
    const o = opts || {};
    const next = Object.assign({}, p, patch);
    // First edit only: park the extraction's own swatches. Later edits must NOT overwrite it, or
    // Reset would return to the most recent state instead of the original — which is not a reset.
    if (!next.sourceSwatches && patch.swatches) next.sourceSwatches = p.swatches.map((s) => Object.assign({}, s));
    if (o.structural) { this._captureBandRects(); this._refineStripFrom = this._refineStripRects(); }
    this.setState((s) => ({
      current: next,
      feed: s.feed.map((x) => x.id === next.id ? next : x),
      overlay: s.overlay && s.overlay.id === next.id ? next : s.overlay,
      bandRev: (s.bandRev || 0) + (o.structural ? 1 : 0),
      refineSel: typeof o.sel === 'number' ? o.sel : Math.min(s.refineSel, next.swatches.length - 1),
      announce: o.announce || '',
    }), () => {
      this.persist({ immediate: true });
      if (o.structural) { const r = this._refineStripFrom; this._refineStripFrom = null; this._refineFlipFrom(r); this._refinePill(true); }
      else this._refinePill();
    });
  },
  // The FLIP's "before". Read straight off the live bands, because their laid-out widths are a
  // function of flexGrow and cannot be derived from the weights alone.
  _captureBandRects() {
    try {
      const els = [...document.querySelectorAll('[data-band]')];
      this._refineRects = els.length ? els.map((el) => el.getBoundingClientRect()) : null;
    } catch (e) { this._refineRects = null; }
  },

  // ---- operations ------------------------------------------------------------------------------
  // A role belongs to one swatch; a swatch may carry several. Assigning a role that is already
  // somewhere else MOVES it, rather than leaving the palette claiming two backgrounds.
  refineSetRole(role, i) {
    const p = this.state.current;
    if (!p || ROLE_IDS.indexOf(role) < 0 || !p.swatches[i]) return;
    const cur = p.roles || {};
    const roles = Object.assign({}, cur);
    if (roles[role] === i) delete roles[role]; else roles[role] = i;
    const on = roles[role] === i;
    // The spoken name, not the machine id: `primary` is a key in an export file, "Primary" is what
    // the row says and what a screen reader should hear.
    const label = ROLE_LABEL[role];
    this._applyRefine({ roles: Object.keys(roles).length ? roles : null }, {
      announce: on
        ? label + ' assigned to swatch ' + (i + 1) + ', ' + p.swatches[i].hex.toUpperCase() + '.'
        : label + ' unassigned. It falls back to the derived default.',
    });
  },
  // L, C and H are absolute values, not deltas: the slider owns the number and the palette follows,
  // so a drag cannot accumulate rounding error. gamutMap keeps L and hue and reduces chroma until
  // the colour fits sRGB, so a slider can never mint a hex the screen cannot show.
  // Called on pointerup / keyup / blur from a slider: the next move of the same control starts a
  // new undo step rather than joining the last one.
  _refineGestureEnd() { this._refineCoalesce = null; this._refineLastReq = null; },
  // The axis bounds and the smallest step each control offers, in the axis's own units. One table,
  // because the search below and the keyboard handler both have to agree with the sliders.
  AXIS: {
    l: { min: 0, max: 1, step: 0.005 },
    c: { min: 0, max: 0.33, step: 0.002 },
    h: { min: 0, max: 360, step: 1 },
  },
  // ONE KEYPRESS, ONE VISIBLE CHANGE.
  //
  // The bug this exists to fix: a slider step is a step in OKLCH, and the result is gamut-mapped and
  // then quantised to 8-bit sRGB. On plenty of real colours one step lands on the hex the swatch
  // already has — measured at 8 of 20 consecutive steps near white — and refineAdjust used to
  // return early on that, pushing no state and no undo. The range input is CONTROLLED, so the next
  // render put the thumb back where it started: the press was silently discarded, and because the
  // starting value never moved, the next press was discarded too. By keyboard the axis was stuck,
  // with no feedback of any kind. (Dragging hid it — a pointer crosses many values at once.)
  //
  // So a request that quantises away is not dropped, it is CARRIED: keep going in the direction the
  // user asked until the hex actually changes, or until the axis runs out. The walk is bounded by
  // the axis span over its own step, so it terminates whatever it is handed, and at the end of the
  // range — where there is genuinely nothing left — it still returns without a change, which is the
  // honest answer rather than a value that pretends to have moved.
  _seekAxisChange(s, part, requested) {
    const ax = this.AXIS[part];
    const cur = part === 'l' ? s.L
      : part === 'c' ? Math.sqrt(s.a * s.a + s.b * s.b)
        : ((Math.atan2(s.b, s.a) * 180 / Math.PI) + 360) % 360;
    const C = Math.sqrt(s.a * s.a + s.b * s.b);
    const build = (v) => {
      const L = part === 'l' ? v : s.L;
      const c = part === 'c' ? v : C;
      const H = (part === 'h' ? v : ((Math.atan2(s.b, s.a) * 180 / Math.PI) + 360) % 360) * Math.PI / 180;
      return gamutMap(L, c * Math.cos(H), c * Math.sin(H));
    };
    let v = Math.max(ax.min, Math.min(ax.max, requested));
    let hexStr = build(v);
    if (hexStr.toLowerCase() !== s.hex.toLowerCase()) return { hex: hexStr, value: v };
    // Direction of travel. Equal means the caller asked for the value already held — a pointer
    // landing on the same spot — and there is nothing to seek.
    const dir = v > cur ? 1 : v < cur ? -1 : 0;
    if (!dir) return null;
    const guard = Math.ceil((ax.max - ax.min) / ax.step) + 2;
    for (let n = 0; n < guard; n++) {
      v = Math.max(ax.min, Math.min(ax.max, v + dir * ax.step));
      hexStr = build(v);
      if (hexStr.toLowerCase() !== s.hex.toLowerCase()) return { hex: hexStr, value: v };
      if (v <= ax.min || v >= ax.max) break;
    }
    return null;   // the axis is genuinely spent in that direction
  },
  refineAdjust(i, part, value) {
    const p = this.state.current;
    if (!p || !p.swatches[i] || !this.AXIS[part]) return;
    /* ONE REQUEST IS ONE MOVE, however many events carry it.
       A range input fires BOTH `input` and `change` for a keyboard step, and React's onChange is
       wired to both — so a single ArrowRight arrives here twice with the same requested value. The
       first call moves the colour; the second finds the swatch already past the request, reads that
       as "the user is asking to come back down", and walks it straight to where it started. Net
       effect: the keyboard could not move a slider at all, and the value the user asked for was
       both applied and reverted inside one keypress.
       Ignoring an identical request for the same axis within the same gesture is the whole fix. It
       cannot swallow a real move: a genuine repeat means the pointer has not left the value it is
       already on, which is a no-op by definition, and the gesture end (pointerup / keyup / blur)
       clears the latch so the next press starts clean. */
    const reqKey = i + ':' + part + ':' + value;
    if (this._refineLastReq === reqKey) return;
    this._refineLastReq = reqKey;
    const s = p.swatches[i];
    const hit = this._seekAxisChange(s, part, value);
    if (!hit) return;   // nothing moved and nothing left to move; do not push undo
    const swatches = p.swatches.map((x, j) => j === i ? reswatch(x, hit.hex) : x);
    this._applyRefine({ swatches }, { announce: 'Swatch ' + (i + 1) + ' is now ' + hit.hex.toUpperCase() + '.', coalesce: 'lch:' + i + ':' + part });
  },
  // Arrow keys in the NUMERIC field, which had none: the text input took typed digits only, so the
  // one control on the surface that states an exact value could not be nudged, while the slider
  // beside it could. Shift takes the coarse step, the way a stepper is expected to.
  _refineNumberKey(e, i, part, step, min, max, toAxis) {
    const dir = e.key === 'ArrowUp' ? 1 : e.key === 'ArrowDown' ? -1 : 0;
    if (!dir) { if (e.key === 'Enter') { e.preventDefault(); this._refineGestureEnd(); } return; }
    e.preventDefault();
    const cur = parseFloat(e.currentTarget.value);
    if (!isFinite(cur)) return;
    const mult = e.shiftKey ? 10 : 1;
    const next = Math.max(min, Math.min(max, cur + dir * step * mult));
    this.refineAdjust(i, part, toAxis(next));
  },
  // Removal renumbers everything after it, so the roles map has to be renumbered with it — a role
  // pointing at index 3 means a different colour once index 1 is gone. Roles ON the removed swatch
  // are dropped and fall back to the heuristic.
  refineRemove(i) {
    const p = this.state.current;
    // THREE IS THE FLOOR. Six roles over two swatches is not a palette a scaffold can be built
    // from — every role would double onto one of two colours — so removal stops before it can
    // produce an export nobody could use.
    if (!p || p.swatches.length <= 3 || !p.swatches[i]) return;
    const swatches = p.swatches.filter((_, j) => j !== i);
    const roles = this._reindexRoles(p.roles, (j) => j === i ? -1 : (j > i ? j - 1 : j));
    this._applyRefine({ swatches, roles }, {
      structural: true, sel: Math.max(0, i - 1),
      announce: 'Swatch ' + (i + 1) + ' removed. ' + swatches.length + ' colours remain.',
    });
  },
  refineMove(i, dir) {
    const p = this.state.current;
    const j = i + dir;
    if (!p || !p.swatches[i] || !p.swatches[j]) return;
    const swatches = p.swatches.slice();
    swatches[i] = p.swatches[j]; swatches[j] = p.swatches[i];
    const roles = this._reindexRoles(p.roles, (k) => k === i ? j : (k === j ? i : k));
    this._applyRefine({ swatches, roles }, {
      structural: true, sel: j,
      announce: 'Swatch moved to position ' + (j + 1) + ' of ' + swatches.length + '.',
    });
  },
  _reindexRoles(roles, map) {
    if (!roles) return null;
    const out = {}; let n = 0;
    for (const k of Object.keys(roles)) { const v = map(roles[k]); if (v >= 0) { out[k] = v; n++; } }
    return n ? out : null;
  },

  // ---- reversal --------------------------------------------------------------------------------
  refineUndo() {
    const stack = this._refineUndo || [];
    if (!stack.length) return;
    const prev = stack[stack.length - 1];
    this._refineUndo = stack.slice(0, -1);
    const p = this.state.current; if (!p) return;
    const structural = prev.swatches.length !== p.swatches.length
      || prev.swatches.some((s, i) => !p.swatches[i] || s.sid !== p.swatches[i].sid);
    this._commitRefine({ swatches: prev.swatches, roles: prev.roles }, {
      structural, sel: prev.sel, announce: 'Undone. ' + this._refineUndo.length + ' step(s) left to undo.',
    });
  },
  // Back to the extraction. Clears the refinement outright rather than pushing another undo step:
  // this is the escape hatch, and it should not need undoing itself to be trusted.
  // Reset clears BOTH halves of a refinement, so it has to be reachable when either exists. It
  // tested only for sourceSwatches, which meant a palette whose roles had been reassigned but whose
  // colours were untouched offered no way back — the button sat disabled over work it could undo.
  refineReset() {
    const p = this.state.current;
    if (!p || !(p.sourceSwatches || p.roles)) return;
    this._captureBandRects();
    this._refineStripFrom = this._refineStripRects();
    const next = Object.assign({}, p, { swatches: (p.sourceSwatches || p.swatches).map((s) => Object.assign({}, s)), sourceSwatches: null, roles: null });
    this._refineUndo = [];
    this.setState((s) => ({
      current: next,
      feed: s.feed.map((x) => x.id === next.id ? next : x),
      overlay: s.overlay && s.overlay.id === next.id ? next : s.overlay,
      bandRev: (s.bandRev || 0) + 1,
      refineSel: 0,
      announce: 'Refinement reset. The palette is back to the colours read from the image.',
    }), () => { this.persist({ immediate: true }); this._refinePill(true); });
  },
};
