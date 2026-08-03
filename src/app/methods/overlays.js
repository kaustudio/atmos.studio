// Overlay surfaces: fullscreen palette detail (reversible band-wipe timeline), delete-with-undo
// toast, contrast checker drawer, colour-harmonies drawer, and the token-export dialog.
// The same content-addressing the extraction uses, so a harmony saved as a palette gets an id of
// the same KIND as a generated one rather than a timestamp with a different shape.
import { hashBytes } from '../../lib/hash.js';

export const overlayMethods = {
  // ================= fullscreen detail =================
  // Freeze the universe under the detail so the originating tile stays put (stable return rect).
  freezeUniverse() { if (this._ticker && window.gsap) { window.gsap.ticker.remove(this._ticker); this._frozen = true; } },
  resumeUniverse() { if (this._frozen && this._ticker && window.gsap) { window.gsap.ticker.add(this._ticker); this._frozen = false; } },

  openOverlay(p, tileEl) {
    // One overlay session at a time. state.overlay is set asynchronously, so two activations in the
    // same tick would BOTH pass a state check — this latch is synchronous. It spans open → fully
    // closed, which also blocks re-opening during a close reversal: buildOverlayTimeline would
    // overwrite _ovTl there, orphaning the reversing timeline whose onReverseComplete then tears the
    // new overlay straight back down. Every teardown path clears it (see _finishOverlayClose,
    // deletePalette, and _resetIntroState) so it can never strand.
    if (this._ovOpen) return;
    this._ovOpen = true;
    this._lastFocus = document.activeElement;
    this._openTileEl = tileEl || null;
    this._ovDone = false; this._ovBack = null;
    // freeze the pan so the field is stable beneath the dialog until close completes
    if (!this._reduce && window.gsap && tileEl) this.freezeUniverse();
    this.setState({ overlay: p, announce: 'Opened ' + p.name + ' detail. Mood: ' + p.descriptors.join(', ') + '. Press Escape to close.' }, () => {
      requestAnimationFrame(() => {
        const root = this._detailRoot();
        if (root) { const btn = root.querySelector('button'); if (btn) try { btn.focus(); } catch (e) { } }   // focus immediately — never delayed by the morph
        try { this.buildOverlayTimeline(); if (this._ovTl) this._ovTl.play(0); } catch (e) { }
      });
    });
  },
  // Build ONE reversible timeline on open — play forward on open, reverse() on close.
  // The click-zoom lightbox is ALSO a [role=dialog][aria-modal] and sits earlier in the DOM —
  // always scope detail-overlay queries to the dialog that actually holds the palette bands.
  _detailRoot() { return [...document.querySelectorAll('[role="dialog"][aria-modal="true"]')].find((d) => !d.hasAttribute('data-click-zoom-lightbox') && d.querySelector('[data-oband]')) || null; },
  buildOverlayTimeline() {
    this._ovTl = null;
    const g = window.gsap, root = this._detailRoot();
    if (!g || !root) return;
    const bands = [...root.querySelectorAll('[data-oband]')];
    const chrome = [...root.querySelectorAll('[data-ochrome]')];
    const tl = g.timeline({ paused: true, onReverseComplete: () => this._finishOverlayClose() });
    // reduced-motion (or no bands): a single two-step opacity fade — forward on open, reverse on close
    if (this._reduce || !bands.length) { tl.from(root, { opacity: 0, duration: .2, ease: 'none' }, 0); this._ovTl = tl; return; }
    // the signature band wipe — same language as the result stage: bands rise from the bottom,
    // staggered left-to-right; reverse() = chrome out, bands sink, backdrop last
    g.set(bands, { transformOrigin: 'bottom center' });
    tl.from(root, { opacity: 0, duration: .18, ease: 'none' }, 0);   // backdrop first in / last out
    tl.from(bands, { scaleY: 0, duration: this.DUR.reveal, ease: this.EASE.entrance, stagger: .06 }, .08);
    // chrome (header, footer, value rows) fades in a beat after — colour leads; on reverse it exits first
    if (chrome.length) tl.from(chrome, { opacity: 0, duration: .4, ease: this.EASE.entrance, stagger: .02 }, this.DUR.reveal * 0.45);
    this._ovTl = tl;
  },
  closeOverlay() {
    // focus returns in the completion callback (never before), so it can't re-render mid-close
    const tileFocusable = this._openTileEl && this._openTileEl.getAttribute('tabindex') !== '-1' && !this._openTileEl.getAttribute('aria-hidden');
    this._ovBack = tileFocusable ? this._openTileEl : this._lastFocus;
    if (!this._ovTl) { this._finishOverlayClose(); return; }   // no timeline (shouldn't happen) → last-resort unmount
    this._ovTl.reverse();                                    // close IS open reversed — nothing hand-written
    // one generous safety fallback only, in case onReverseComplete never fires
    clearTimeout(this._closeGuard);
    this._closeGuard = setTimeout(() => this._finishOverlayClose(), (this._ovTl.duration() + 0.8) * 1000);
  },
  _finishOverlayClose() {
    // release the open latch BEFORE the _ovDone guard, so this function is unconditionally a
    // latch-release — a call arriving with _ovDone already true must still leave overlays openable
    this._ovOpen = false;
    if (this._ovDone) return; this._ovDone = true;
    clearTimeout(this._closeGuard);
    const back = this._ovBack;
    this._ovTl = null;
    this.setState({ overlay: null, announce: 'Closed palette detail.' }, () => {
      this.resumeUniverse();
      if (back && back.focus) try { back.focus(); } catch (e) { }
      this._openTileEl = null; this._ovBack = null;
    });
  },
  trapFocus(e) {
    if (e.key !== 'Tab') return; const root = [...document.querySelectorAll('[role="dialog"][aria-modal="true"]')].find((d) => d.offsetParent !== null) || this._detailRoot(); if (!root) return;
    const f = [...root.querySelectorAll('button,[href],input,[tabindex]:not([tabindex="-1"])')].filter((n) => !n.disabled && n.offsetParent !== null);
    if (!f.length) return; const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  },

  // ===== delete with undo (reversible, no confirm dialog) =====
  deletePalette(id, rowEl) {
    const s = this.state;
    const idx = s.feed.findIndex((p) => p.id === id);
    if (idx < 0) return;
    const removed = s.feed[idx];
    const g = window.gsap;
    const commit = () => {
      const feed = s.feed.slice(0, idx).concat(s.feed.slice(idx + 1));
      const patch = { feed };
      if (s.current && s.current.id === id) {
        const next = feed[idx] || feed[idx - 1] || null;
        if (next) { patch.current = next; patch.imageUrl = this.dispUrl(next); patch.stage = 'result'; }
        else { patch.current = null; patch.imageUrl = null; patch.stage = 'upload'; }
      }
      const overlayDeleted = s.overlay && s.overlay.id === id;
      if (overlayDeleted) { patch.overlay = null; this._ovTl = null; this._ovDone = true; this._ovOpen = false; this._openTileEl = null; }
      this._deleted = { palette: removed, index: idx };
      patch.toast = { name: removed.name };
      patch.announce = 'Palette ' + removed.name + ' deleted. Undo available.';
      this.setState(patch, () => {
        this.persist({ immediate: true });
        this._toastIn();
        if (overlayDeleted) this.resumeUniverse();
        requestAnimationFrame(() => {
          if (this.state.feedView === 'grid') { this.buildUniverse(); }
          const wrap = document.querySelector('[data-list-wrap]');
          const rows = wrap ? [...wrap.querySelectorAll('[data-row]')] : [];
          // the row is a surface now; its focusable is the stretched hit button inside
          const rowEl = rows.length ? rows[Math.min(idx, rows.length - 1)] : null;
          const focusTarget = rowEl ? (rowEl.querySelector('[data-row-hit]') || rowEl) : null;
          if (focusTarget && focusTarget.focus) { try { focusTarget.focus(); } catch (e) { } }
          else { const u = document.querySelector('[data-undo-btn]'); if (u) try { u.focus(); } catch (e) { } }
        });
      });
      // NO TIMER. The toast carries an ACTION — it is the only route to undoing a permanent
      // deletion of data that exists nowhere but this browser — and an action-bearing toast that
      // dismisses itself is a race against the reader (WCAG 2.2.1; it lost that race twice during
      // the 03.08.26 audit). It stays until the user acts: Undo restores, Dismiss (the ✕) lets it
      // go, and the next deletion replaces it. Info-only notices (showNotice) keep their timer —
      // nothing is lost when one of those goes unread.
    };
    if (!this._reduce && g && rowEl && s.feedView === 'list') {
      g.set(rowEl, { height: rowEl.offsetHeight, overflow: 'hidden' });
      g.to(rowEl, { height: 0, opacity: 0, duration: this.DUR.state, ease: this.EASE.exit, onComplete: commit });
    } else { commit(); }
  },
  undoDelete() {
    if (this._deletedProject) {
      const dp = this._deletedProject; this._deletedProject = null;
      this.setState((st) => { const projects = st.projects.slice(); projects.splice(Math.min(dp.index, projects.length), 0, dp.project); const feed = st.feed.map((p) => dp.palIds.indexOf(p.id) >= 0 ? Object.assign({}, p, { projectId: dp.project.id }) : p); return { projects, feed, announce: 'Restored project ' + dp.project.name + '.' }; }, () => { this.persist({ immediate: true }); this._dismissToast(); });
      return;
    }
    const d = this._deleted; this._deleted = null;
    if (!d) { this._dismissToast(); return; }
    this.setState((st) => { const feed = st.feed.slice(); feed.splice(Math.min(d.index, feed.length), 0, d.palette); return { feed, announce: 'Restored ' + d.palette.name + '.' }; }, () => {
      this.persist({ immediate: true });
      if (this.state.feedView === 'grid') this.buildUniverse();
      this._dismissToast();
    });
  },
  // toast enter/exit — fade + small slide, --ease-standard; instant under reduced motion
  _toastIn() { const g = window.gsap; if (this._reduce || !g) return; const el = document.querySelector('[data-toast]'); if (el) g.from(el, { opacity: 0, y: 16, duration: this.DUR.state, ease: this.EASE.entrance, clearProps: 'transform' }); },
  _dismissToast() { const g = window.gsap; const el = document.querySelector('[data-toast]'); const clear = () => this.setState({ toast: null }); if (this._reduce || !g || !el) { clear(); return; } g.to(el, { opacity: 0, y: 16, duration: this.DUR.state, ease: this.EASE.exit, onComplete: clear }); },
  // The ✕ on the toast: letting the undo go is a decision, so it discards the held record — the
  // same forfeit the old timer performed silently. If focus was inside the toast it would die with
  // it (the control disappears mid-press), so it is handed to the first row's own hit surface —
  // the list the deletion just edited; a mouse user's focus, elsewhere, is left alone.
  dismissUndoToast() {
    this._deleted = null; this._deletedProject = null;
    const el = document.querySelector('[data-toast]');
    const hadFocus = !!(el && el.contains(document.activeElement));
    this._dismissToast();
    if (hadFocus) { const r = document.querySelector('[data-row-hit]') || document.querySelector('[data-facet-btn]'); if (r) try { r.focus(); } catch (e) { } }
  },

  // ===== contrast checker (opt-in surface over the current palette) =====
  contrastPalette() { const s = this.state; return s.overlay || s.current || (s.feed && s.feed[0]) || null; },
  openContrast() {
    const p = this.contrastPalette(); if (!p) return; this._contrastBack = document.activeElement; this._cxDone = false;
    const sm = this.contrastSummary(p);
    this.setState({ contrast: true, announce: 'Contrast checker opened for ' + p.name + '. ' + sm.aa + ' of ' + sm.total + ' pairs pass AA.' }, () => {
      requestAnimationFrame(() => {
        const d = document.querySelector('[data-contrast-dialog]');
        if (d) { const b = d.querySelector('button'); if (b) try { b.focus(); } catch (e) { } }   // focus immediately — never delayed by the slide
        try { this.buildContrastTimeline(); if (this._cxTl) this._cxTl.play(0); this._revealDrawerText('[data-contrast-dialog]'); } catch (e) { }
      });
    });
  },
  // ===== THE ONE ARRIVAL SCHEDULE =====
  // Every right-hand drawer is built through here, which is the whole point: the review's finding
  // was not that these surfaces were choreographed but that they were choreographed differently and
  // finished at visibly different times. Three hand-written timelines that happened to agree is how
  // that happened; one function they all call is how it stops.
  //
  // SEQUENTIAL, AND SEAMLESS — which are two requirements pulling against each other, and the
  // overlaps are where they meet. Nothing waits for the thing before it to finish: the sections
  // start while the panel is still travelling (0.28 of the way through it), the cells start while
  // the sections are still arriving, and the masked text runs underneath both. Read in order, with
  // no seam between the stages, because there is no moment when only one of them is moving.
  //
  // Everything is transform and opacity, and every element is in the DOM and semantic before any of
  // it starts — motion never gates what a screen reader or a keyboard can reach.
  _drawerIn(tl, root, backdrop, secSel, cellSel) {
    const g = window.gsap;
    const D = this.DUR.overlay, E = this.EASE.overlay;
    if (this._reduce) {
      if (backdrop) tl.from(backdrop, { opacity: 0, duration: .12, ease: 'none' }, 0);
      tl.from(root, { opacity: 0, duration: .12, ease: 'none' }, 0);
      return tl;
    }
    const secs = secSel ? [...root.querySelectorAll(secSel)] : [];
    const cells = cellSel ? [...root.querySelectorAll(cellSel)] : [];
    if (backdrop) tl.from(backdrop, { opacity: 0, duration: D, ease: E }, 0);
    tl.from(root, { xPercent: 100, duration: D, ease: E }, 0);
    // SECTIONS MASK AND MOVE. They translated only for a revision, on the reasoning that a section
    // is a box and what arrives is the content in it — which was true of the ROWS and false of
    // everything else the box holds. A group's eyebrow, the search field, the sort toggle and every
    // drawer header sat at full opacity from the first frame, riding in on the panel while the rows
    // beneath them wiped: half the panel arriving, half of it already there. Masking the section
    // covers its own furniture as well as its children.
    if (secs.length) {
      tl.from(secs, { y: 14, duration: D * 0.8, ease: E, stagger: this.DUR.overlayStep * 2, clearProps: 'transform' }, D * 0.28);
      this._maskIn(tl, secs, D * 0.28, D * 0.7, this.DUR.overlayStep * 2);
    }
    // Cells MASK too, a beat behind their section rather than a third of the panel later. Two clips
    // over one element intersect, so a cell is uncovered by whichever is currently the more
    // restrictive; running them close together means the section's wipe hands off to the row's
    // instead of holding it back, and what you see is one sweep passing across the rows rather than
    // two reveals stacked.
    if (cells.length) this._maskIn(tl, cells, D * 0.32, D * 0.7, this.DUR.overlayStep);
    this._drawRules(tl, root, D * 0.4);
    return tl;
  },
  // THE METHOD DISCLOSURE'S PROSE, arriving rather than being uncovered already written.
  //
  // The fold opens the BOX — it is a height tween, and height is layout, so it has to run or the
  // panel below would jump. The words are a separate question, and until now they were simply
  // sitting at full opacity inside a box that grew to expose them: the one place on this surface
  // where text appeared instead of arriving. Now the box opens and the lines rise into it through
  // the same masked line reveal the drawer titles use.
  //
  // The reveal is delayed past the fold rather than run with it. The fold clips (overflow:hidden
  // while the height animates), so lines rising at the same moment would be masked twice — once by
  // the growing box, once by their own line mask — and the second one would be invisible. Waiting
  // for the box means the mask you see is the text's own.
  toggleHarmonyMethod() {
    const opening = !this.state.harmonyMethodOpen;
    this.toggleFold('harmonyMethodOpen', '[data-hx-method]');
    if (!opening || this._reduce || !window.gsap) return;
    const foldDone = this.DUR.reveal * 0.62;
    requestAnimationFrame(() => {
      const box = document.querySelector('[data-hx-method]');
      if (!box) return;
      box.querySelectorAll('[data-drawer-split]').forEach((el, i) => {
        try { this._maskLineReveal(el, foldDone * 0.55 + i * this.DUR.overlayStep * 3, { duration: this.DUR.overlay, ease: this.EASE.overlay, stagger: this.DUR.overlayStep * 1.6 }); } catch (e) { }
      });
    });
  },
  // THE ONE CONTENT REVEAL: a clip-path wipe from the bottom edge, which is this app's mask.
  //
  // It is the same mechanic three other surfaces already use — the result stage's bands, the detail
  // overlay, Refine's swatch strip — so an overlay's contents arrive in the language its palettes
  // arrive in. Nothing here fades: opacity is exposure, and a panel whose parts fade up looks like
  // it is being developed rather than assembled. A mask says the content was always there and is
  // being uncovered, which is what a staggered sequence is trying to say in the first place.
  //
  // `bleed` extends the mask past the bottom edge for boxes carrying a hairline at -1px (the drawn
  // group rules sit outside the border box, and inset(0%) would clip them away mid-arrival).
  _maskIn(tl, targets, at, dur, step, bleed) {
    if (!targets || !targets.length) return;
    const b = bleed ? -bleed + 'px' : '0';
    tl.fromTo(targets,
      { clipPath: 'inset(100% 0 ' + b + ' 0)' },
      { clipPath: 'inset(0% 0 ' + b + ' 0)', duration: dur, ease: this.EASE.overlay, stagger: step, clearProps: 'clipPath' },
      at);
  },
  // THE GROUP DIVIDERS, DRAWING. Added to whichever timeline is arriving rather than fired beside
  // it, so they reverse with everything else on close and cannot drift out of step on open.
  //
  // Left to right on the same curve, which is the mechanic the result view's metadata rules already
  // use — structure draws in this app. `at` puts them just after the sections they separate have
  // started moving: a rule that lands before its content has arrived is a line around nothing, and
  // one that lands after reads as an afterthought being ruled off.
  //
  // Row hairlines are deliberately NOT here. A separator between two rows belongs to its row and
  // fades in with it; drawing it independently would make a list read as two things arriving.
  _drawRules(tl, root, at) {
    if (this._reduce) return;
    const rules = [...root.querySelectorAll('[data-ov-rule]')];
    if (!rules.length) return;
    tl.from(rules, {
      scaleX: 0, transformOrigin: '0% 50%',
      duration: this.DUR.overlay * 0.7, ease: this.EASE.overlay,
      stagger: this.DUR.overlayStep * 2, clearProps: 'transform',
    }, at);
  },
  // CLOSE IS OPEN REVERSED, AT ONE LENGTH.
  //
  // An entrance is allowed a tail: its contents arrive in sequence, and the stagger is the sequence,
  // so a drawer with ten cells legitimately takes longer to assemble than one with three. A
  // DISMISSAL has no such excuse — nothing is being read on the way out — and reverse() on its own
  // inherits the whole tail, which measured 427ms for Refine against 714ms for Harmony: the exact
  // divergence the July review found, reintroduced by content length instead of by hand-written
  // timelines.
  //
  // Scaling the reverse fixes it without giving up the reversal. The exit is still every stage of
  // the entrance played backwards in the opposite order; it is simply compressed to the band's own
  // 0.4s, whatever the panel happens to hold. Nothing here runs under reduced motion — those
  // timelines are a 0.12s fade with no tail to compress.
  // THE EXIT IS A TWEEN, NOT A REWIND — and this took three attempts, so the dead ends are worth
  // keeping.
  //
  //   reverse()            plays the entrance backwards at native rate. Two faults: the length
  //                        follows the content (427ms for Refine against 714ms for Harmony — the
  //                        review's own divergence, back through the side door) and the curve comes
  //                        out mirrored, so the panel accelerates as it leaves and is gone rather
  //                        than landed.
  //   tweenTo(0, {ease})   tweens the PLAYHEAD instead. Fixes the length, but the stated ease lands
  //                        on TIME and then every tween applies its own ease on top of that — two
  //                        curves composed. Measured: the panel sat still for 160ms, crossed 300px
  //                        in the next 200, then crept the last 16px over half a second. Nothing in
  //                        the motion system moves like that, because nothing in the motion system
  //                        is two eases deep.
  //   this                 the exit states its own properties, its own duration and the one curve.
  //                        cubic-bezier(.19,1,.22,1) over 1.2s: away quickly, landing slowly, the
  //                        same shape as the arrival and legible as its counterpart.
  //
  // The entrance timeline is killed rather than left to finish. It owns these same properties, and
  // two tweens arguing over one transform is how you get a panel that jitters on the way out. Its
  // clearProps never running is harmless: the drawer unmounts, so the node carrying the stale
  // inline styles is destroyed with it.
  _drawerOut(tl, root, backdrop, done) {
    const g = window.gsap;
    if (tl) tl.kill();
    if (this._reduce || !g || !root) { if (done) done(); return; }
    const t = g.timeline({ onComplete: done || null });
    if (backdrop) t.to(backdrop, { opacity: 0, duration: this.DUR.overlayOut, ease: this.EASE.overlay }, 0);
    t.to(root, { xPercent: 100, duration: this.DUR.overlayOut, ease: this.EASE.overlay }, 0);
  },
  // The masked line reveal on a drawer's key text, at the drawer's own tempo. It runs OUTSIDE the
  // reversible timeline deliberately: it rewrites the element into per-line masks and restores the
  // plain text node when it lands, so by the time anyone can close the drawer the DOM is back to
  // what reverse() expects to find. Started at 0.3 of the panel's travel, so the words are already
  // rising as the panel settles rather than after it.
  // `opts.at` and `opts.duration` are fractions of the band, so a surface with a shorter arrival can
  // pull its text in with it. Refine needs that: its sequence now ends around 0.9s, and text still
  // rising at 1.12s is a tail hanging off a finished panel rather than part of one arrival.
  _revealDrawerText(sel, opts) {
    if (this._reduce || !window.gsap) return;
    const root = document.querySelector(sel); if (!root) return;
    const o = opts || {};
    const D = this.DUR.overlay;
    const at = D * (typeof o.at === 'number' ? o.at : 0.3);
    const dur = D * (typeof o.duration === 'number' ? o.duration : 1);
    root.querySelectorAll('[data-drawer-split]').forEach((el, i) => {
      try { this._maskLineReveal(el, at + i * this.DUR.overlayStep * 2, { duration: dur, ease: this.EASE.overlay, stagger: this.DUR.overlayStep * 1.6 }); } catch (e) { }
    });
  },
  // ONE reversible timeline — play forward on open, reverse() on close (symmetric by construction).
  buildContrastTimeline() {
    this._cxTl = null;
    const g = window.gsap, root = document.querySelector('[data-contrast-dialog]');
    const backdrop = document.querySelector('[data-cx-backdrop]');
    if (!g || !root) return;
    const tl = g.timeline({ paused: true, onReverseComplete: () => this._finishContrastClose() });
    // Body cells only — the blank upper triangle of the matrix has no data-cx-cell value, and
    // fading in empty boxes spends the signature cascade on nothing.
    this._cxTl = this._drawerIn(tl, root, backdrop, '[data-cx-sec]', '[data-cx-cell]:not([data-cx-cell=""])');
  },
  // The masked line reveal on the drawers' titles and intros went with the utility-overlay retune.
  // It fired at DUR.reveal * 0.35 — 217ms — which was a beat inside the old 620ms cascade and is
  // now a text animation starting after the drawer it belongs to has already finished arriving.
  // The [data-drawer-split] hooks stay in the markup: they cost nothing, and the same mechanic is
  // still the right one if any of these surfaces ever leaves the utility band.
  closeContrast() {
    if (!this._cxTl) { this._finishContrastClose(); return; }
    this._drawerOut(this._cxTl, document.querySelector('[data-contrast-dialog]'), document.querySelector('[data-cx-backdrop]'), () => this._finishContrastClose());
    clearTimeout(this._cxGuard);
    this._cxGuard = setTimeout(() => this._finishContrastClose(), (this.DUR.overlayOut + 0.8) * 1000);
  },
  _finishContrastClose() {
    if (this._cxDone) return; this._cxDone = true;
    clearTimeout(this._cxGuard);
    const back = this._contrastBack; this._cxTl = null;
    this.setState({ contrast: false, announce: 'Contrast checker closed.' }, () => {
      const el = (back && back.focus) ? back : this.contrastBtnRef.current; if (el && el.focus) try { el.focus(); } catch (e) { }
      this._contrastBack = null;
    });
  },
  // Animate only the delta on a lens/size/filter toggle: cross-fade the marks of cells whose verdict
  // actually flipped; quietly re-settle the summary; cross-fade the sample. Unchanged cells stay put.
  animateContrastDelta(oldKey, newKey) {
    const g = window.gsap; if (this._reduce || !g) return;
    const root = document.querySelector('[data-contrast-dialog]'); if (!root) return;
    const [oL, oLarge] = oldKey.split('|'), [nL, nLarge] = newKey.split('|');
    const p = this.contrastPalette(); if (!p) return;
    const thr = (lens, large) => large === 'true' ? (lens === 'AAA' ? 4.5 : 3) : (lens === 'AAA' ? 7 : 4.5);
    const oth = thr(oL, oLarge), nth = thr(nL, nLarge), sw = p.swatches;
    // pulse only cells whose pass verdict changed between the two thresholds
    if (oth !== nth) {
      for (let i = 0; i < sw.length; i++) for (let j = 0; j < i; j++) {
        const r = this.contrastRatio(sw[i].hex, sw[j].hex);
        if ((r >= oth) !== (r >= nth)) {
          const cell = root.querySelector('[data-cx-cell="' + i + '-' + j + '"]'); const mark = cell && cell.querySelector('[data-cx-mark]');
          if (mark) g.fromTo(mark, { opacity: 0 }, { opacity: 1, duration: this.DUR.state, ease: this.EASE.standard, overwrite: 'auto' });
        }
      }
    }
    const sum = root.querySelector('[data-cx-summary]'); if (sum) g.fromTo(sum, { opacity: 0.35 }, { opacity: 1, duration: this.DUR.state, ease: this.EASE.standard, overwrite: 'auto' });
    if (oLarge !== nLarge) { const smp = root.querySelector('[data-cx-sample]'); if (smp) g.fromTo(smp, { opacity: 0.3 }, { opacity: 1, duration: this.DUR.state, ease: this.EASE.standard, overwrite: 'auto' }); }
  },
  contrastSummary(p) { const sw = p.swatches; let aa = 0, total = 0; for (let i = 0; i < sw.length; i++) for (let j = i + 1; j < sw.length; j++) { total++; if (this.contrastRatio(sw[i].hex, sw[j].hex) >= 4.5) aa++; } return { aa, total }; },
  trapContrast(e) { this.trapFocusIn('[data-contrast-dialog]', e); },

  // ===== per-swatch colour harmonies (OKLCH-derived, gamut-mapped) =====
  openHarmony(hex) {
    this._harmonyBack = document.activeElement; this._hxDone = false;
    this.setState({ harmony: { hex: hex.toUpperCase() }, harmonyModel: 'analogous', harmonyMethodOpen: false, announce: 'Colour harmonies for ' + hex.toUpperCase() + ' opened. Press Escape to close.' }, () => {
      requestAnimationFrame(() => {
        const d = document.querySelector('[data-harmony-dialog]');
        if (d) { const b = d.querySelector('button'); if (b) try { b.focus(); } catch (e) { } }
        try { this.buildHarmonyTimeline(); if (this._hxTl) this._hxTl.play(0); this._revealDrawerText('[data-harmony-dialog]'); } catch (e) { }
      });
    });
  },
  buildHarmonyTimeline() {
    this._hxTl = null;
    const g = window.gsap, root = document.querySelector('[data-harmony-dialog]');
    const backdrop = document.querySelector('[data-hx-backdrop]');
    if (!g || !root) return;
    const tl = g.timeline({ paused: true, onReverseComplete: () => this._finishHarmonyClose() });
    this._hxTl = this._drawerIn(tl, root, backdrop, '[data-hx-sec]', '[data-hx-cell]');
  },
  // SWITCHING MODEL MUST NOT MOVE THE READER. The selector stays where it is, the drawer keeps its
  // scroll position, and focus stays on the button that was pressed — so comparing two models is
  // pressing two buttons rather than pressing one and finding the page somewhere else. Only the
  // preview changes, and it cross-fades rather than cutting.
  setHarmonyModel(id) {
    if (this.state.harmonyModel === id) return;
    this.setState({ harmonyModel: id }, () => {
      const g = window.gsap;
      const cells = [...document.querySelectorAll('[data-hx-preview] [data-hx-cell]')];
      if (!g || this._reduce || !cells.length) return;
      g.fromTo(cells, { opacity: 0.25 }, { opacity: 1, duration: this.DUR.state, ease: this.EASE.standard, stagger: this.DUR.stagger * 0.5, overwrite: 'auto' });
    });
  },
  // A HARMONY BECOMES A PALETTE. The review's missing adoption path, and the destination is a NEW
  // record rather than a replacement of the palette the source swatch came from — that palette is
  // content-addressed to a photograph and carries the roles someone assigned to it, and a rotation
  // of one of its colours is a different object, not an edit of it.
  //
  // Everything below reuses the generated path rather than inventing a second one:
  //   · swatches are built exactly as seedObj builds them (hex → oklab, sid by index)
  //   · the name, traits and rationale come from the same local reading a generated palette gets,
  //     passed the live feed so it cannot mint a name the archive already holds
  //   · `hash` is a real content address over the hexes, so re-saving the same harmony from the same
  //     source lands on the same identity and takes the next variation instead of colliding
  // Weight is equal across the set and that is a statement, not a default: a harmony has no area —
  // nothing was measured — so any other distribution would be invented.
  useHarmonyAsPalette() {
    const s = this.state;
    if (!s.harmony) return;
    const groups = this.harmonyGroups(s.harmony.hex);
    const g = groups.find((x) => x.id === s.harmonyModel) || groups[0];
    const hexes = g.cells.map((c) => c.hex);
    const w = 1 / hexes.length;
    const swatches = hexes.map((hx, i) => {
      const rgb = this.hexToRgb(hx);
      const lab = this.rgb2oklab(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255);
      return { sid: i, hex: hx.toLowerCase(), weight: w, L: lab.L, a: lab.a, b: lab.b };
    });
    const feed = s.feed || [];
    const it = this.interpret(swatches, feed);
    // Sorted, so the address is a property of the SET rather than of the order it happens to be
    // drawn in — the same reasoning paletteSeed uses.
    const hash = hashBytes(new TextEncoder().encode(hexes.slice().sort().join(',')));
    const used = new Set(feed.filter((p) => p && p.hash === hash).map((p) => (typeof p.variation === 'number' ? p.variation : 0)));
    let variation = 0; while (used.has(variation)) variation++;
    const active = (s.activeProject && s.activeProject !== '__unfiled__') ? s.activeProject : null;
    const pal = {
      id: hash + '-' + variation, hash, variation,
      // No image, and no pretence of one: hasImg() returns false and the result view already has a
      // state for a palette with no reference picture.
      imageUrl: null, time: Date.now(),
      name: it.name, descriptors: it.descriptors, rationale: it.rationale, archetype: it.archetype,
      // fallback marks "no live reading was applied", which is exactly true here — the harmony never
      // leaves the device, so the Name from row reads Local reading rather than claiming otherwise.
      fallback: true,
      projectId: active, projectIds: active ? [active] : [],
      swatches,
    };
    this.setState((st) => ({
      feed: [pal, ...st.feed],
      current: pal, imageUrl: null, stage: 'result',
      // Roles are DERIVED on a new palette, never carried: the source palette's Primary was an
      // assignment to one of its swatches, and none of those swatches is in here.
      // "a analogous" — the one model name in the set that starts with a vowel, and the article is
      // read aloud, so it is the kind of slip a screen-reader user hears every time.
      announce: 'Saved ' + pal.name + ', ' + (/^[aeiou]/i.test(g.name) ? 'an ' : 'a ') + g.name.toLowerCase() + ' harmony of ' + s.harmony.hex + ', as a new palette. Roles are derived until you refine it.',
    }), () => {
      this.persist({ immediate: true });
      // keepAnnounce: the save is the only confirmation this act gets, and "Colour harmonies closed"
      // would land on top of it — the close runs a beat later, so the live region would report the
      // dismissal and never the record that was written.
      this.closeHarmony(true);
    });
  },
  closeHarmony(keepAnnounce) {
    this._hxKeep = !!keepAnnounce;
    if (!this._hxTl) { this._finishHarmonyClose(); return; }
    this._drawerOut(this._hxTl, document.querySelector('[data-harmony-dialog]'), document.querySelector('[data-hx-backdrop]'), () => this._finishHarmonyClose());
    clearTimeout(this._hxGuard);
    this._hxGuard = setTimeout(() => this._finishHarmonyClose(), (this.DUR.overlayOut + 0.8) * 1000);
  },
  _finishHarmonyClose() {
    if (this._hxDone) return; this._hxDone = true;
    clearTimeout(this._hxGuard);
    const back = this._harmonyBack; this._hxTl = null;
    const patch = { harmony: null };
    if (!this._hxKeep) patch.announce = 'Colour harmonies closed.';
    const saved = this._hxKeep;
    this.setState(patch, () => {
      // Focus returns to the swatch's harmony button on a plain close. After a SAVE it cannot: that
      // trigger belongs to the palette that was on screen a moment ago and the result now holds a
      // different one, so returning there would point the keyboard at the old palette — and letting
      // focus die on the removed node is worse still, because the next Tab starts at the top of the
      // document. It goes where the new palette is, the same way loadIntoResult sends it.
      if (saved) {
        const region = (this.resultRef && this.resultRef.current) || document.querySelector('main');
        if (region) try { region.setAttribute('tabindex', '-1'); region.focus({ preventScroll: true }); } catch (e) { }
      } else if (back && back.focus) { try { back.focus(); } catch (e) { } }
      this._harmonyBack = null; this._hxKeep = false;
    });
  },
  trapHarmony(e) { this.trapFocusIn('[data-harmony-dialog]', e); },

  // ===== tag filter drawer (same family as contrast + harmonies: right drawer, one reversible
  // timeline, Escape/Done/outside click all reverse it, focus captured on open and restored on
  // close) =====
  //
  // DISMISSED BY CLICKING AWAY, and this panel cannot do it the way the modal drawers do. They have
  // a backdrop: a full-screen element that catches the click, which is also what makes them modal.
  // This one deliberately has none — filtering is iterative, the list has to stay visible and
  // operable behind it, and a backdrop would dim the very thing you are filtering.
  //
  // So the dismissal is a document listener rather than a catcher. The difference matters: a
  // catcher SWALLOWS the click, and here the click should still land. Clicking a palette row while
  // the filter is open means "that one" — the row loads AND the panel gets out of the way, which is
  // one gesture doing one thing rather than a wasted click spent closing a panel.
  //
  // pointerdown, not click: it fires before focus moves, so the panel is already on its way out by
  // the time the thing underneath takes over.
  _facetOutside(e) {
    const panel = document.querySelector('[data-tag-dialog]');
    if (!panel || panel.contains(e.target)) return;
    // The trigger toggles; without this exclusion the press would close the panel here and the
    // button's own click would immediately reopen it, so Filter would appear to do nothing.
    if (e.target.closest && e.target.closest('[data-facet-btn]')) return;
    // The applied chips and Clear all live OUTSIDE the panel, on the Library bar, and they are part
    // of filtering — removing a narrowing should not also put away the surface you would remove the
    // next one from.
    if (e.target.closest && e.target.closest('[data-applied-filters]')) return;
    this.closeTagFilter();
  },
  openTagFilter() {
    this._tagBack = document.activeElement; this._tgDone = false;
    this.setState({ tagMenuOpen: true, tagQuery: '', announce: 'Filters opened. Press Escape to close, or click anywhere outside it.' }, () => {
      // Bound HERE and not inside the rAF below. The press that opened the panel cannot be the one
      // that closes it, because this runs off `click` — the last event of that gesture, long after
      // its pointerdown — so the next pointerdown is genuinely a new one. The rAF would also have
      // been late enough, and would have made dismissal depend on the tab being painted: rAF does
      // not fire in a hidden tab, so the panel would come back from a background tab undismissable.
      // Stored on the instance because removeEventListener needs the same reference.
      this._facetOutsideFn = (e) => this._facetOutside(e);
      document.addEventListener('pointerdown', this._facetOutsideFn, true);
      requestAnimationFrame(() => {
        // focus lands in the search field — the drawer exists to be typed at
        const i = document.querySelector('[data-facet-search]'); if (i) try { i.focus(); } catch (e) { }
        try { this.buildTagTimeline(); if (this._tgTl) this._tgTl.play(0); this._revealDrawerText('[data-tag-dialog]'); } catch (e) { }
      });
    });
  },
  buildTagTimeline() {
    this._tgTl = null;
    const g = window.gsap, root = document.querySelector('[data-tag-dialog]');
    const backdrop = document.querySelector('[data-tg-backdrop]');
    if (!g || !root) return;
    const tl = g.timeline({ paused: true, onReverseComplete: () => this._finishTagClose() });
    // The sticky header is a section too, and it must NOT translate: it is position:sticky, and a
    // transform on a sticky element makes it the containing block for its own offset, so it detaches
    // and scrolls away with the content. It takes the opacity half of the cascade only.
    this._drawerIn(tl, root, backdrop, '[data-tg-sec]:not(header)', '[data-tg-cell]');
    // The header masks like everything else rather than fading, but it cannot TRANSLATE: it is
    // position:sticky, and a transform on a sticky element makes it its own containing block, so it
    // detaches and scrolls away with the content. The 2px bleed keeps its drawn bottom rule — which
    // sits at -1px, outside the border box — from being clipped away while the mask is running.
    const head = root.querySelector('header[data-tg-sec]');
    if (head && !this._reduce) this._maskIn(tl, [head], this.DUR.overlay * 0.2, this.DUR.overlay * 0.8, 0, 2);
    this._tgTl = tl;
  },
  // SHOW ALL / SHOW FEWER on the character traits. Not toggleFold: that tweens the height of one
  // element open and shut, and here the list is already on screen and simply gets longer — folding
  // it would collapse the six rows you can see in order to re-reveal them with the rest.
  // So the rows that ARRIVE are the only thing that moves, on the same stagger the drawer's cells
  // use when it opens. Collapsing needs no motion of its own: the rows leave with the state, and
  // there is nothing to watch travel.
  toggleFacetAll() {
    const opening = !this.state.facetAllOpen;
    const before = document.querySelectorAll('[data-facet-char] [data-tg-cell][aria-pressed]').length;
    this.setState((st) => ({ facetAllOpen: !st.facetAllOpen }), () => {
      const g = window.gsap;
      if (!opening || !g || this._reduce) return;
      const rows = [...document.querySelectorAll('[data-facet-char] [data-tg-cell][aria-pressed]')].slice(before);
      if (rows.length) g.from(rows, { opacity: 0, y: 8, duration: this.DUR.state, ease: this.EASE.entrance, stagger: this.DUR.stagger * 0.4, clearProps: 'transform,opacity' });
    });
  },
  closeTagFilter() {
    // Unbound here rather than in _finishTagClose: the close tween outlives the decision to close,
    // and a second press during it would otherwise call closeTagFilter again mid-reverse.
    this._unbindFacetOutside();
    if (!this._tgTl) { this._finishTagClose(); return; }
    this._drawerOut(this._tgTl, document.querySelector('[data-tag-dialog]'), document.querySelector('[data-tg-backdrop]'), () => this._finishTagClose());
    clearTimeout(this._tgGuard);
    this._tgGuard = setTimeout(() => this._finishTagClose(), (this.DUR.overlayOut + 0.8) * 1000);
  },
  _unbindFacetOutside() {
    if (!this._facetOutsideFn) return;
    document.removeEventListener('pointerdown', this._facetOutsideFn, true);
    this._facetOutsideFn = null;
  },
  _finishTagClose() {
    if (this._tgDone) return; this._tgDone = true;
    clearTimeout(this._tgGuard);
    this._unbindFacetOutside();   // belt and braces: every teardown path leaves the document clean
    const back = this._tagBack; this._tgTl = null;
    // facetAllOpen resets with the panel, exactly as tagQuery does: both are ways of looking at the
    // trait list rather than filter state, and a panel that reopens twenty rows deep because of
    // something you did last time is a panel that reopens differently every time.
    this.setState({ tagMenuOpen: false, tagQuery: '', facetAllOpen: false, announce: 'Filters closed.' }, () => {
      // Focus returns to the Filter trigger — but only when the user did not put it somewhere else
      // themselves. Clicking outside IS choosing where focus goes next, and yanking it back to a
      // button they just clicked away from would undo their own move.
      const moved = document.activeElement && document.activeElement !== document.body
        && !(back && document.activeElement === back);
      if (!moved && back && back.focus) try { back.focus(); } catch (e) { }
      this._tagBack = null;
    });
  },

  // ===== token export =====
  download(filename, content, mime) {
    let blob = (content instanceof Blob) ? content : new Blob([content], { type: mime || 'text/plain;charset=utf-8' });
    try {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = filename; a.style.display = 'none';
      document.body.appendChild(a); a.click();
      setTimeout(() => { try { document.body.removeChild(a); } catch (e) { } URL.revokeObjectURL(url); }, 120);
    } catch (e) { }
    this.setState({ announce: 'Downloaded ' + filename });
  },
  doExport(pal, format, semantic) {
    if (!pal) return;
    const slug = this.slugName(pal.name);
    // The user's role assignment rides on the palette record, so it does not need threading through
    // the call: semanticEntries takes it as a sparse override and fills the rest from the heuristic.
    const entries = semantic ? this.semanticEntries(pal, pal.roles) : this.primitiveEntries(pal);
    const fn = (ext) => 'palette_' + slug + '_' + format + '.' + ext;
    if (format === 'tailwind') this.download(fn('css'), this.buildTailwind(pal, entries, semantic), 'text/css;charset=utf-8');
    else if (format === 'tokens') this.download(fn('json'), this.buildW3CTokens(pal, entries, semantic), 'application/json');
    else if (format === 'figma') this.download(fn('json'), this.buildFigmaTokens(pal, entries), 'application/json');
    else if (format === 'css') this.download(fn('css'), this.buildCssFile(pal, entries, semantic), 'text/css;charset=utf-8');
    else if (format === 'ase') this.download('palette_' + slug + '.ase', this.buildASE(entries), 'application/octet-stream');
    this.closeExport(true);
  },
  openExport(p) {
    if (!p) return;
    this._exportBack = document.activeElement; this._exDone = false;
    clearTimeout(this._exGuard);
    this.setState({ exportOpen: true, exportPalette: p, announce: 'Export options for ' + p.name + ' opened. Press Escape to close.' }, () => {
      requestAnimationFrame(() => {
        const d = document.querySelector('[data-export-dialog]');
        if (d) { const b = d.querySelector('button'); if (b) try { b.focus(); } catch (e) { } }
        try { this.buildExportTimeline(); if (this._exTl) this._exTl.play(0); this._revealDrawerText('[data-export-dialog]'); } catch (e) { }
      });
    });
  },
  // ONE reversible timeline — same class of surface as contrast/harmony (play on open, reverse on
  // close), on the same band and curve. It is a centred dialog rather than a drawer, so it cannot
  // go through _drawerIn: it grows from its own centre instead of sliding from an edge. Everything
  // after that first tween keeps the shared schedule — items begin at 0.45 of the panel's travel,
  // on the same step, so a dialog and a drawer are recognisably the same system.
  buildExportTimeline() {
    this._exTl = null;
    const g = window.gsap, root = document.querySelector('[data-export-dialog]');
    const backdrop = document.querySelector('[data-ex-backdrop]');
    if (!g || !root) return;
    const D = this.DUR.overlay, E = this.EASE.overlay;
    const items = [...root.querySelectorAll('[data-ex-item]')];
    const tl = g.timeline({ paused: true, onReverseComplete: () => this._finishExportClose(this._exKeep) });
    if (this._reduce) { if (backdrop) tl.from(backdrop, { opacity: 0, duration: .12, ease: 'none' }, 0); tl.from(root, { opacity: 0, duration: .12, ease: 'none' }, 0); this._exTl = tl; return; }
    if (backdrop) tl.from(backdrop, { opacity: 0, duration: D, ease: E }, 0);
    tl.from(root, { opacity: 0, y: 12, scale: 0.98, duration: D, ease: E, transformOrigin: 'center center' }, 0);
    // The dialog itself still fades — it has no edge to slide from, so the fade IS its arrival. Its
    // CONTENTS mask, like every other overlay's.
    //
    // ON THE CELL SCHEDULE, not the section one. The format list is five leaf choices — the same
    // kind of thing as a drawer's rows — and it was being timed as though each were a section: the
    // coarse `overlayStep * 2` beat, starting at D * 0.45. That is the "third of the panel later"
    // the cells comment above argues against, and this call site was never brought onto that fix.
    // The list read slow for it, and it read slow in a way nothing else here does: five items on a
    // doubled step is 320ms of pure stagger, and the last one landed at ~1.24s.
    // Matching the cells exactly — D * 0.32 and one step — brings the last item in at ~0.98s and,
    // more to the point, means the export list and every drawer row arrive on ONE beat.
    this._maskIn(tl, items, D * 0.32, D * 0.7, this.DUR.overlayStep);
    this._drawRules(tl, root, D * 0.4);
    this._exTl = tl;
  },
  closeExport(keepAnnounce) {
    this._exKeep = !!keepAnnounce;
    if (!this._exTl) { this._finishExportClose(this._exKeep); return; }
    // Same exit contract as the drawers, on the geometry it arrived with: it grows from its centre
    // rather than sliding from an edge, so it leaves the same way.
    (() => {
      const g = window.gsap, root = document.querySelector('[data-export-dialog]');
      const back = document.querySelector('[data-ex-backdrop]');
      const done = () => this._finishExportClose(this._exKeep);
      if (this._exTl) this._exTl.kill();
      if (this._reduce || !g || !root) { done(); return; }
      const t = g.timeline({ onComplete: done });
      if (back) t.to(back, { opacity: 0, duration: this.DUR.overlayOut, ease: this.EASE.overlay }, 0);
      t.to(root, { opacity: 0, y: 12, scale: 0.98, duration: this.DUR.overlayOut, ease: this.EASE.overlay, transformOrigin: 'center center' }, 0);
    })();
    clearTimeout(this._exGuard);
    this._exGuard = setTimeout(() => this._finishExportClose(this._exKeep), (this.DUR.overlayOut + 0.8) * 1000);
  },
  _finishExportClose(keepAnnounce) {
    if (this._exDone) return; this._exDone = true;
    clearTimeout(this._exGuard);
    const back = this._exportBack; this._exTl = null;
    const patch = { exportOpen: false, exportPalette: null };
    if (!keepAnnounce) patch.announce = 'Export options closed.';
    this.setState(patch, () => { if (back && back.focus) try { back.focus(); } catch (e) { } this._exportBack = null; });
  },
  trapExport(e) { this.trapFocusIn('[data-export-dialog]', e); },
};
