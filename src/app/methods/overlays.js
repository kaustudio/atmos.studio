// Overlay surfaces: fullscreen palette detail (reversible band-wipe timeline), delete-with-undo
// toast, contrast checker drawer, colour-harmonies drawer, and the token-export dialog.
export const overlayMethods = {
  // ================= fullscreen detail =================
  // Freeze the universe under the detail so the originating tile stays put (stable return rect).
  freezeUniverse() { if (this._ticker && window.gsap) { window.gsap.ticker.remove(this._ticker); this._frozen = true; } },
  resumeUniverse() { if (this._frozen && this._ticker && window.gsap) { window.gsap.ticker.add(this._ticker); this._frozen = false; } },

  openOverlay(p, tileEl) {
    this._lastFocus = document.activeElement;
    this._openTileEl = tileEl || null;
    this._ovDone = false; this._ovBack = null;
    // freeze the pan so the field is stable beneath the dialog until close completes
    if (!this._reduce && window.gsap && tileEl) this.freezeUniverse();
    this.setState({ overlay: p, overlaySel: null, announce: 'Opened ' + p.name + ' detail. Mood: ' + p.descriptors.join(', ') + '. Press Escape to close.' }, () => {
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
    if (this._ovDone) return; this._ovDone = true;
    clearTimeout(this._closeGuard);
    const back = this._ovBack;
    this._ovTl = null;
    this.setState({ overlay: null, overlaySel: null, announce: 'Closed palette detail.' }, () => {
      this.resumeUniverse();
      if (back && back.focus) try { back.focus(); } catch (e) { }
      this._openTileEl = null; this._ovBack = null;
    });
  },
  overlaySelect(i, hex) { this.setState((s) => { const on = s.overlaySel === i; return { overlaySel: on ? null : i, announce: on ? '' : ('Swatch ' + hex + ' selected.') }; }); },
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
        patch.selectedSwatch = null;
      }
      const overlayDeleted = s.overlay && s.overlay.id === id;
      if (overlayDeleted) { patch.overlay = null; patch.overlaySel = null; this._ovTl = null; this._ovDone = true; this._openTileEl = null; }
      if (this._toastT) clearTimeout(this._toastT);
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
          const focusTarget = rows.length ? rows[Math.min(idx, rows.length - 1)] : null;
          if (focusTarget && focusTarget.focus) { try { focusTarget.focus(); } catch (e) { } }
          else { const u = document.querySelector('[data-undo-btn]'); if (u) try { u.focus(); } catch (e) { } }
        });
      });
      this._toastT = setTimeout(() => { this._deleted = null; this._dismissToast(); }, 6500);
    };
    if (!this._reduce && g && rowEl && s.feedView === 'list') {
      g.set(rowEl, { height: rowEl.offsetHeight, overflow: 'hidden' });
      g.to(rowEl, { height: 0, opacity: 0, duration: this.DUR.state, ease: this.EASE.exit, onComplete: commit });
    } else { commit(); }
  },
  undoDelete() {
    if (this._toastT) clearTimeout(this._toastT);
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

  // ===== first-run framing =====
  _isFirstRun() { const s = this.state; return !s.firstRunDismissed && s.feed.some((p) => p.example) && !s.feed.some((p) => !p.example); },
  dismissFirstRun() {
    if (this.state.firstRunDismissed) return;
    const persist = () => { try { localStorage.setItem('palette-generator/firstrun', '1'); } catch (e) { } this.setState({ firstRunDismissed: true }); };
    const g = window.gsap, els = document.querySelectorAll('[data-fr-frame]');
    if (this._reduce || !g || !els.length) { persist(); return; }
    g.to(els, { opacity: 0, y: -8, duration: this.DUR.state, ease: this.EASE.exit, onComplete: persist });
  },
  // Once the example demo has run, the first-run framing has done its job — recede it automatically on the
  // next return to upload (understanding is the dismissal), reusing the animated exit. No manual Dismiss.
  _maybeAutoRecedeFirstRun() { if ((this._demoConsumed || (function () { try { return localStorage.getItem('palette-generator/demo') === '1'; } catch (e) { return false; } })()) && !this.state.firstRunDismissed) { this.dismissFirstRun(); } },

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
  // ONE reversible timeline — play forward on open, reverse() on close (symmetric by construction).
  buildContrastTimeline() {
    this._cxTl = null;
    const g = window.gsap, root = document.querySelector('[data-contrast-dialog]');
    const backdrop = document.querySelector('[data-cx-backdrop]');
    if (!g || !root) return;
    const secs = [...root.querySelectorAll('[data-cx-sec]')];
    const cells = [...root.querySelectorAll('[data-cx-cell]')].filter((c) => c.getAttribute('data-cx-cell'));   // body cells only (blanks have key '')
    const tl = g.timeline({ paused: true, onReverseComplete: () => this._finishContrastClose() });
    if (this._reduce) { if (backdrop) tl.from(backdrop, { opacity: 0, duration: .15, ease: 'none' }, 0); tl.from(root, { opacity: 0, duration: .15, ease: 'none' }, 0); this._cxTl = tl; return; }
    if (backdrop) tl.from(backdrop, { opacity: 0, duration: .24, ease: this.EASE.standard }, 0);
    tl.from(root, { xPercent: 100, duration: this.DUR.reveal, ease: this.EASE.entrance }, 0);            // drawer slides in from right
    tl.from(secs, { y: 16, opacity: 0, duration: .42, ease: this.EASE.entrance, stagger: .06 }, this.DUR.reveal * 0.35);  // sections cascade as it settles
    if (cells.length) tl.from(cells, { opacity: 0, duration: .25, ease: this.EASE.standard, stagger: { each: .012, grid: 'auto', from: 'start' } }, this.DUR.reveal * 0.55);  // signature: matrix populates top-left→
    this._cxTl = tl;
  },
  // Masked line reveal on the drawers' key text (title, summary, intro) — fired alongside the
  // section cascade, OUTSIDE the reversible timeline (the split restores plain text after, so the
  // reverse close operates on untouched sections). Reduced motion: sections already fade; skip.
  _revealDrawerText(sel) {
    if (this._reduce || !window.gsap) return;
    const root = document.querySelector(sel); if (!root) return;
    root.querySelectorAll('[data-drawer-split]').forEach((el) => { try { this._maskLineReveal(el, this.DUR.reveal * 0.35); } catch (e) { } });
  },
  closeContrast() {
    if (!this._cxTl) { this._finishContrastClose(); return; }
    this._cxTl.reverse();
    clearTimeout(this._cxGuard);
    this._cxGuard = setTimeout(() => this._finishContrastClose(), (this._cxTl.duration() + 0.8) * 1000);
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
    this.setState({ harmony: { hex: hex.toUpperCase() }, announce: 'Colour harmonies for ' + hex.toUpperCase() + ' opened. Press Escape to close.' }, () => {
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
    const secs = [...root.querySelectorAll('[data-hx-sec]')];
    const cells = [...root.querySelectorAll('[data-hx-cell]')];
    const tl = g.timeline({ paused: true, onReverseComplete: () => this._finishHarmonyClose() });
    if (this._reduce) { if (backdrop) tl.from(backdrop, { opacity: 0, duration: .15, ease: 'none' }, 0); tl.from(root, { opacity: 0, duration: .15, ease: 'none' }, 0); this._hxTl = tl; return; }
    if (backdrop) tl.from(backdrop, { opacity: 0, duration: .24, ease: this.EASE.standard }, 0);
    tl.from(root, { xPercent: 100, duration: this.DUR.reveal, ease: this.EASE.entrance }, 0);
    tl.from(secs, { y: 16, opacity: 0, duration: .42, ease: this.EASE.entrance, stagger: .055 }, this.DUR.reveal * 0.35);
    if (cells.length) tl.from(cells, { opacity: 0, duration: .25, ease: this.EASE.standard, stagger: { each: .02, from: 'start' } }, this.DUR.reveal * 0.55);
    this._hxTl = tl;
  },
  closeHarmony() {
    if (!this._hxTl) { this._finishHarmonyClose(); return; }
    this._hxTl.reverse();
    clearTimeout(this._hxGuard);
    this._hxGuard = setTimeout(() => this._finishHarmonyClose(), (this._hxTl.duration() + 0.8) * 1000);
  },
  _finishHarmonyClose() {
    if (this._hxDone) return; this._hxDone = true;
    clearTimeout(this._hxGuard);
    const back = this._harmonyBack; this._hxTl = null;
    this.setState({ harmony: null, announce: 'Colour harmonies closed.' }, () => {
      if (back && back.focus) try { back.focus(); } catch (e) { }
      this._harmonyBack = null;
    });
  },
  trapHarmony(e) { this.trapFocusIn('[data-harmony-dialog]', e); },

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
    const entries = semantic ? this.semanticEntries(pal) : this.primitiveEntries(pal);
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
        try { this.buildExportTimeline(); if (this._exTl) this._exTl.play(0); } catch (e) { }
      });
    });
  },
  // ONE reversible timeline — same class of surface as contrast/harmony (play on open, reverse on close).
  buildExportTimeline() {
    this._exTl = null;
    const g = window.gsap, root = document.querySelector('[data-export-dialog]');
    const backdrop = document.querySelector('[data-ex-backdrop]');
    if (!g || !root) return;
    const items = [...root.querySelectorAll('[data-ex-item]')];
    const tl = g.timeline({ paused: true, onReverseComplete: () => this._finishExportClose(this._exKeep) });
    if (this._reduce) { if (backdrop) tl.from(backdrop, { opacity: 0, duration: .15, ease: 'none' }, 0); tl.from(root, { opacity: 0, duration: .15, ease: 'none' }, 0); this._exTl = tl; return; }
    if (backdrop) tl.from(backdrop, { opacity: 0, duration: .24, ease: this.EASE.standard }, 0);
    tl.from(root, { opacity: 0, y: 12, scale: 0.98, duration: this.DUR.state, ease: this.EASE.entrance, transformOrigin: 'center center' }, 0);
    if (items.length) tl.from(items, { opacity: 0, y: 8, duration: .3, ease: this.EASE.entrance, stagger: .045 }, this.DUR.state * 0.5);
    this._exTl = tl;
  },
  closeExport(keepAnnounce) {
    this._exKeep = !!keepAnnounce;
    if (!this._exTl) { this._finishExportClose(this._exKeep); return; }
    this._exTl.reverse();
    clearTimeout(this._exGuard);
    this._exGuard = setTimeout(() => this._finishExportClose(this._exKeep), (this._exTl.duration() + 0.8) * 1000);
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
