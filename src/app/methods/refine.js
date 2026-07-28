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
  // THE SURFACE ARRIVES IN THE ORDER IT IS READ. A dialog that fades in as one rectangle tells you
  // nothing about what is in it; this one assembles — the palette wipes up band by band (the same
  // clip-path rise the result stage and the detail overlay both use), the roles cascade under it,
  // the axis rows draw last. Sequence is the app's own grammar, not decoration bolted onto a modal.
  _refineIn() {
    const g = window.gsap, root = document.querySelector('[data-refine-dialog]');
    if (!g || !root) return;
    const panel = root, back = root.parentElement && root.parentElement.querySelector('[data-modal-backdrop]');
    const bands = [...root.querySelectorAll('[data-refine-swatch]')];
    const rows = [...root.querySelectorAll('[data-refine-row]')];
    const axes = [...root.querySelectorAll('[data-refine-axis]')];
    if (this._reduce) {
      if (back) g.from(back, { opacity: 0, duration: .2, ease: 'none' });
      g.from(panel, { opacity: 0, duration: .2, ease: 'none' });
      return;
    }
    const tl = g.timeline();
    if (back) tl.from(back, { opacity: 0, duration: .22, ease: 'none' }, 0);
    tl.from(panel, { opacity: 0, y: 14, duration: this.DUR.state, ease: this.EASE.entrance, clearProps: 'transform' }, 0);
    if (bands.length) {
      tl.set(bands, { clipPath: 'inset(100% 0 0 0)' }, 0)
        .to(bands, { clipPath: 'inset(0% 0 0 0)', duration: this.DUR.reveal, stagger: this.DUR.stagger, ease: this.EASE.entrance, clearProps: 'clipPath' }, 0.1);
    }
    if (rows.length) tl.from(rows, { opacity: 0, y: 10, duration: this.DUR.state, stagger: this.DUR.stagger * 0.7, ease: this.EASE.entrance, clearProps: 'transform,opacity' }, 0.26);
    if (axes.length) tl.from(axes, { opacity: 0, y: 10, duration: this.DUR.state, stagger: this.DUR.stagger, ease: this.EASE.entrance, clearProps: 'transform,opacity' }, 0.34);
    // The marker lands on the opening selection AFTER the bands have their real widths — measured,
    // never assumed, because flexGrow decides them.
    tl.call(() => this._refinePill(true), null, 0.1);
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
    this.setState({
      refineOpen: true,
      refineSel: 0,
      announce: 'Refining ' + p.name + '. Choose a swatch, then assign a role or adjust its colour. Press Escape to close.',
    }, () => {
      const d = document.querySelector('[data-refine-dialog]');
      if (d) { const b = d.querySelector('button'); if (b) try { b.focus(); } catch (e) { } }
      requestAnimationFrame(() => this._refineIn());
    });
  },
  closeRefine() {
    const back = this._refineBack;
    // It leaves the way it arrived, in reverse and faster: the panel drops, the backdrop follows.
    // Exit outlives the state change (React would unmount the node mid-tween otherwise) — the same
    // discipline as every other surface here.
    this._dialogOut('[data-refine-dialog]', () => this.setState({ refineOpen: false, refineSel: 0, announce: 'Refine closed.' }, () => {
      // The undo stack is a property of the session, not of the palette. Dropping it here is what
      // keeps it out of the schema and out of the quota story.
      this._refineUndo = [];
      if (back && back.focus) try { back.focus(); } catch (e) { }
    }));
  },
  trapRefine(e) { this.trapFocusIn('[data-refine-dialog]', e); },
  refineSelect(i) {
    const p = this.state.current; if (!p || !p.swatches[i] || this.state.refineSel === i) return;
    // Read the thumbs BEFORE the swap, so the tween has a real starting point rather than the
    // destination it is already sitting on.
    const from = this._refineSliderValues();
    this.setState({ refineSel: i, announce: 'Swatch ' + (i + 1) + ', ' + p.swatches[i].hex.toUpperCase() + ' selected.' }, () => {
      this._refinePill();
      this._refineSlide(from);
    });
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
    // Snapshot BEFORE the change, so undo restores what the user was looking at when they acted.
    this._refineUndo = (this._refineUndo || []).concat([{
      swatches: p.swatches.map((s) => Object.assign({}, s)),
      roles: p.roles ? Object.assign({}, p.roles) : null,
      sel: st.refineSel,
    }]);
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
  refineAdjust(i, part, value) {
    const p = this.state.current;
    if (!p || !p.swatches[i]) return;
    const s = p.swatches[i];
    const C = Math.sqrt(s.a * s.a + s.b * s.b);
    let H = Math.atan2(s.b, s.a);
    let L = s.L, c = C;
    if (part === 'l') L = Math.max(0, Math.min(1, value));
    else if (part === 'c') c = Math.max(0, Math.min(0.4, value));
    else if (part === 'h') H = value * Math.PI / 180;
    const hexStr = gamutMap(L, c * Math.cos(H), c * Math.sin(H));
    if (hexStr.toLowerCase() === s.hex.toLowerCase()) return;   // nothing moved; do not push undo
    const swatches = p.swatches.map((x, j) => j === i ? reswatch(x, hexStr) : x);
    this._applyRefine({ swatches }, { announce: 'Swatch ' + (i + 1) + ' is now ' + hexStr.toUpperCase() + '.' });
  },
  // Removal renumbers everything after it, so the roles map has to be renumbered with it — a role
  // pointing at index 3 means a different colour once index 1 is gone. Roles ON the removed swatch
  // are dropped and fall back to the heuristic.
  refineRemove(i) {
    const p = this.state.current;
    if (!p || p.swatches.length <= 2 || !p.swatches[i]) return;   // two is the floor: a pair is still a palette, one is not
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
  refineReset() {
    const p = this.state.current;
    if (!p || !p.sourceSwatches) return;
    this._captureBandRects();
    this._refineStripFrom = this._refineStripRects();
    const next = Object.assign({}, p, { swatches: p.sourceSwatches.map((s) => Object.assign({}, s)), sourceSwatches: null, roles: null });
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
