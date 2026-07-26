// Motion system: shared tokens, micro-interaction handlers, list-row activation (effect035) +
// value readout (effect019), the result reveal (bottom-to-top band wipe, masked line reveals),
// theme toggle, and the mono-label style builders.
export const motionMethods = {
  // ---- motion tokens: one shared set, scaled by hierarchy ----
  initMotion() {
    this.EASE = { standard: this.cubicBezier(0.22, 1, 0.36, 1), entrance: this.cubicBezier(0.16, 1, 0.3, 1), exit: this.cubicBezier(0.4, 0, 1, 1) };
    this.DUR = { micro: 0.12, state: 0.24, reveal: 0.62, stagger: 0.05 };
  },
  // generic, interruptible micro-interaction handlers (transform + overlay-opacity only)
  mEnter(e) {
    if (this._reduce || !window.gsap) return; const el = e.currentTarget; const y = +(el.dataset.mY || 0), sc = +(el.dataset.mScale || 1);
    window.gsap.to(el, { y: -y, scale: sc, duration: this.DUR.state, ease: this.EASE.standard, overwrite: 'auto' });
    const r = el.querySelector('[data-ring]'); if (r) window.gsap.to(r, { opacity: 1, duration: this.DUR.state, ease: this.EASE.standard, overwrite: 'auto' });
    el.style.zIndex = '5';
  },
  mLeave(e) {
    if (this._reduce || !window.gsap) return; const el = e.currentTarget; const selected = el.dataset.selected === '1';
    window.gsap.to(el, { y: 0, scale: 1, duration: this.DUR.state, ease: this.EASE.exit, overwrite: 'auto', onComplete: () => { el.style.zIndex = selected ? '2' : ''; } });
    const r = el.querySelector('[data-ring]'); if (r) window.gsap.to(r, { opacity: selected ? 1 : 0, duration: this.DUR.state, ease: this.EASE.exit, overwrite: 'auto' });
  },
  mDown(e) { if (this._reduce || !window.gsap) return; window.gsap.to(e.currentTarget, { scale: 0.98, duration: this.DUR.micro, ease: this.EASE.standard, overwrite: 'auto' }); },
  mUp(e) {
    if (this._reduce || !window.gsap) return; const el = e.currentTarget; const sc = +(el.dataset.mScale || 1);
    window.gsap.to(el, { scale: sc, duration: this.DUR.state, ease: this.EASE.standard, overwrite: 'auto' });
  },
  // "clicks into place": committed selected state arrives with ease-entrance (settle-with-authority)
  commitSelected(el) {
    if (!el || this._reduce || !window.gsap) return;
    window.gsap.fromTo(el, { scale: 0.98 }, { scale: 1, duration: this.DUR.state, ease: this.EASE.entrance, overwrite: 'auto' });
  },
  // ---- ADDITIVE hover: strengthen ONLY the hovered element's own ring — never dim siblings ----
  dimEnter(e) {
    if (this._reduce || !window.gsap) return; const el = e.currentTarget;
    const r = el.querySelector('[data-ring]'); if (r) window.gsap.to(r, { opacity: 1, duration: this.DUR.state, ease: this.EASE.standard, overwrite: 'auto' });
    el.style.zIndex = '4';
  },
  dimLeave(e) {
    if (this._reduce || !window.gsap) return; const el = e.currentTarget;
    const r = el.querySelector('[data-ring]'); if (r) window.gsap.to(r, { opacity: 0, duration: this.DUR.state, ease: this.EASE.exit, overwrite: 'auto' });
    el.style.zIndex = '';
  },

  // ===== style builder: the mono uppercase label — the dominant repeated pattern (single source) =====
  monoLabel(px, track, extra) { return Object.assign({ fontFamily: 'Neue Montreal', fontSize: px + 'px', letterSpacing: track, textTransform: 'uppercase' }, extra || {}); },
  viewToggleOptStyle(active) { return this.monoLabel(10, 'var(--track-flat)', { position: 'relative', zIndex: 1, padding: '6px 12px', cursor: 'pointer', border: 'none', background: 'transparent', color: active ? 'var(--surface)' : 'var(--on-surface-muted)', transition: this._reduce ? 'none' : 'color .2s var(--ease-standard)' }); },
  toggleStyle(active) { return this.monoLabel(10, 'var(--track-flat)', { padding: '7px 12px', cursor: 'pointer', border: '1px solid ' + (active ? 'var(--on-surface)' : 'color-mix(in srgb, var(--on-surface) 15%, transparent)'), background: active ? 'var(--on-surface)' : 'transparent', color: active ? 'var(--surface)' : 'var(--on-surface)', transition: 'background .15s var(--ease-standard),color .15s var(--ease-standard),border-color .15s var(--ease-standard)' }); },
  pageNavStyle(disabled) { return this.monoLabel(10, 'var(--track-flat)', { padding: '7px 12px', cursor: disabled ? 'default' : 'pointer', border: '1px solid color-mix(in srgb, var(--on-surface) 15%, transparent)', background: 'transparent', color: 'var(--on-surface)', opacity: disabled ? 0.35 : 1, transition: 'background .15s var(--ease-standard),color .15s var(--ease-standard),border-color .15s var(--ease-standard),opacity .15s var(--ease-standard)' }); },
  setPageSize(n) { try { localStorage.setItem('palette-generator/pagesize', '' + n); } catch (e) { } this._listCommit({ pageSize: n, page: 0, announce: n + ' palettes per page.' }); },
  setPage(p) { const total = this.scopedFeed(this.state.feed).length; const max = Math.max(0, Math.ceil(total / (this.state.pageSize || 12)) - 1); const np = Math.max(0, Math.min(p, max)); if (np === (this.state.page || 0)) return; this._listCommit({ page: np, announce: 'Page ' + (np + 1) + '.' }); },

  // ===== list sort =====
  // Each column's FIRST activation opens on the direction that answers the question people bring to
  // it — most contrast, most accessible pairs, most recent — rather than a blanket ascending. A
  // second activation on the same column flips it. Sorting resets to page 1: staying on page 4 of a
  // reordered list shows a slice of rows that has nothing to do with what was just asked for.
  SORT_LABELS: { contrast: 'max contrast', aa: 'AA pairs', time: 'date' },
  setSort(key) {
    // Reordering replaces every row's contents just as wholesale as a page change does, so it takes
    // the same arrival rather than snapping to a new order in place.
    this.setState((st) => {
      const same = st.sortKey === key;
      const dir = same ? (st.sortDir === 'desc' ? 'asc' : 'desc') : 'desc';
      const highLow = key === 'time' ? ['newest first', 'oldest first'] : ['highest first', 'lowest first'];
      return { sortKey: key, sortDir: dir, page: 0, announce: 'Sorted by ' + this.SORT_LABELS[key] + ', ' + highLow[dir === 'desc' ? 0 : 1] + '.' };
    }, () => this._listRowsReveal());
  },
  // One comparator for the list. Ties fall back to newest-first so equal metrics — which are common,
  // AA pairs is a small integer — still land in a stable, meaningful order rather than an arbitrary one.
  sortDecorated(rows, key, dir) {
    const mul = dir === 'asc' ? 1 : -1;
    const val = (d) => key === 'contrast' ? d.met.contrastMax : key === 'aa' ? d.met.aaPairs : d.p.time;
    return rows.slice().sort((a, b) => ((val(a) - val(b)) * mul) || (b.p.time - a.p.time));
  },

  // List selection is a quiet, in-place load into the TOP result (not the fullscreen detail),
  // reusing the shared reveal — the same surface a freshly generated palette occupies.
  loadIntoResult(p, rowEl) {
    if (this.state.stage === 'result' && this.state.current && this.state.current.id === p.id) { if (rowEl && rowEl.focus) try { rowEl.focus(); } catch (e) { } return; }
    this._fromRects = null;
    const g = window.gsap;
    // Anchor-scroll: bring the viewport UP to the result region as the palette reveals (one eased
    // motion, coordinated with the band wipe). With a stable stage height there is no reflow to pin.
    this.setState({ stage: 'result', current: p, imageUrl: this.dispUrl(p), selectedSwatch: null, announce: 'Loaded ' + p.name + ' into the result.' }, () => {
      // move focus to the result region so focus follows the viewport (announce carries via aria-live)
      const region = this.resultRef.current || document.querySelector('main');
      requestAnimationFrame(() => {
        const target = document.querySelector('main'); if (!target) return;
        const focusRegion = () => { if (region && region.focus) { try { region.setAttribute('tabindex', '-1'); region.focus({ preventScroll: true }); } catch (e) { } } };
        // Selection anchors the palette to the very top of the page under the sticky header.
        const dest = 0;
        // only skip when already at the very top
        if (window.scrollY <= 1) { focusRegion(); return; }
        if (this._reduce || !g || !g.plugins || !g.plugins.scrollTo) {
          try { window.scrollTo(0, dest); } catch (e) { }
          focusRegion(); return;
        }
        if (this._lenis) { this._lenis.scrollTo(dest, { duration: this.DUR.reveal, onComplete: focusRegion }); }
        else { g.to(window, { scrollTo: { y: dest, autoKill: false }, ease: this.EASE.entrance, duration: this.DUR.reveal, onComplete: focusRegion }); }
      });
    });
  },

  // ===== LIST view: additive row activation (effect035) + per-row value readout (effect019) =====
  paletteMetrics(p) {
    const sw = p.swatches, n = sw.length;
    const dom = sw.reduce((a, b) => b.weight > a.weight ? b : a, sw[0]);
    let hue = Math.atan2(dom.b, dom.a) * 180 / Math.PI; if (hue < 0) hue += 360;
    const chroma = Math.sqrt(dom.a * dom.a + dom.b * dom.b);
    const Ls = sw.map((s) => s.L), lMin = Math.min.apply(null, Ls), lMax = Math.max.apply(null, Ls);
    const avgA = sw.reduce((s, x) => s + x.a, 0) / n, avgB = sw.reduce((s, x) => s + x.b, 0) / n;
    const lums = sw.map((s) => this.relLum(s.hex));
    let cMax = 1, aa = 0;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { const a = lums[i], b = lums[j], r = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); if (r > cMax) cMax = r; if (r >= 4.5) aa++; }
    const total = n * (n - 1) / 2;
    return {
      hue: Math.round(hue), chroma, lMin: Math.round(lMin * 100), lMax: Math.round(lMax * 100),
      temp: (avgA + avgB) > 0.008 ? 'Warm' : (avgA + avgB) < -0.008 ? 'Cool' : 'Neutral',
      contrastMax: cMax, aaPairs: aa, totalPairs: total,
      // CAPABILITY, not a compliance score. The old scheme graded pass/partial/fail against the
      // whole pair set, and "pass" required all C(n,2) pairs to clear 4.5:1 — which no palette in a
      // 26-palette archive achieved, and which nothing short of a black-and-white ramp realistically
      // could. It claimed three states and shipped two.
      //
      // These states answer the question actually being asked — can I build an interface with this?
      // A "pair" is two palette colours that clear WCAG AA (4.5:1, SC 1.4.3) against each other, so
      // one can carry text on the other.
      //   none     0 pairs  — no usable text/background combination exists here
      //   limited  1–2      — a workable accent or a single pairing, not an interface
      //   flexible 3+       — enough distinct pairings to build a UI from
      // The 3 boundary is deliberate: below it you are designing around the palette, at or above it
      // the palette gives you choices. Measured across the current archive the split is roughly
      // 19% / 27% / 54%, so every state is reachable and none is vestigial.
      aaState: aa === 0 ? 'none' : aa <= 2 ? 'limited' : 'flexible',
      mood: (p.archetype && p.archetype !== 'seed') ? p.archetype : (p.descriptors[0] || '').toLowerCase(),
    };
  },
  // Resolve a CSS custom property to its concrete value in the ACTIVE theme (GSAP can't interpolate var()).
  _cssVar(name) { try { return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || ''; } catch (e) { return ''; } },
  rowTintOn(el) { if (!el) return; el.dataset.hover = '1'; const g = window.gsap; if (this._reduce || !g) { el.style.background = 'var(--surface-white)'; return; } g.to(el, { backgroundColor: this._cssVar('--surface-white'), duration: this.DUR.state, ease: this.EASE.standard, overwrite: 'auto' }); },
  rowTintOff(el) {
    if (!el) return; el.removeAttribute('data-hover'); if (el.getAttribute('data-cur') === '1') return;  // current row stays lit
    const g = window.gsap; if (this._reduce || !g) { el.style.background = 'var(--surface-raised)'; return; } g.to(el, { backgroundColor: this._cssVar('--surface-raised'), duration: this.DUR.state, ease: this.EASE.standard, overwrite: 'auto' });
  },
  // Selection no longer expands a row — it drives the overview panel above, and the row's only job
  // here is to SHOW that it is the selected one. So this reconciles the selected surface and nothing
  // else. It has to run imperatively (rather than from rowStyle) because rowTintOn/Off bake an
  // inline background via GSAP on hover and focus; without this pass, a row that was hovered before
  // it was selected would keep the hover value and the selected row could be left reading as plain.
  //
  // The colour is only ever the QUIET half of the selected state. The persistent, non-colour half —
  // the left marker bar, the "Viewing" label and aria-current — is declarative in the view-model and
  // is what actually survives a hovered neighbour looking momentarily identical.
  _syncListActive() {
    const wrap = document.querySelector('[data-list-wrap]'); if (!wrap) return;
    const rows = [...wrap.querySelectorAll('[data-row]')]; if (!rows.length) return;
    const g = window.gsap, reduce = this._reduce;
    const curRow = rows.find((r) => r.getAttribute('data-cur') === '1') || null;
    const curId = curRow ? curRow.getAttribute('data-rowid') : null;
    const changed = (curId !== this._selectedCurId);
    rows.forEach((r) => {
      const selected = (r === curRow);
      const token = selected ? '--surface-white' : '--surface-raised';
      // Leave a hovered row alone: its own tween owns the background until the pointer leaves.
      if (!selected && r.getAttribute('data-hover') === '1') return;
      // Tween only the two rows whose selection actually flipped; every other row is set flat, so a
      // re-render (pagination, delete, theme) never restages motion the user did not ask for.
      const flipped = changed && (selected || r.getAttribute('data-rowid') === this._selectedCurId);
      if (flipped && g && !reduce) g.to(r, { backgroundColor: this._cssVar(token), duration: this.DUR.state, ease: this.EASE.standard, overwrite: 'auto' });
      else r.style.background = 'var(' + token + ')';
    });
    this._selectedCurId = curId;
  },

  // ===== list arrival =====
  // WHY THE LIST USED TO JUMP. Nothing scripted it. The list is plain document flow with no reserved
  // height — one row is --row-list-height plus its 1px top border, ~49px — so 36 → 12 removes over a
  // thousand pixels of DOCUMENT, the browser clamps scrollY to the new maximum, and the viewport
  // snaps upward. The reader is near the bottom by definition, because that is where the pager is,
  // so the clamp fired on essentially every page change. It was the clamp, never a transition.
  //
  // Anchor FIRST, then swap. Bringing the list's own top to the viewport puts the height change
  // below the fold of attention instead of under the cursor, lands the reader on row 1 of the new
  // page, and leaves the clamp nothing to do because scrollY is small by the time the rows change.
  // Ordering is the whole fix: swapping first and scrolling after would animate away FROM a snap
  // that already happened.
  //
  // WHERE IT LANDS: scroll-margin, expressed in JS because Lenis works out its own stop position and
  // ignores the CSS property. Landing the list flush against the viewport top puts it UNDER the
  // sticky header, so the offset clears that header and then leaves a strip of breathing room above
  // the first row. The header is measured rather than assumed — it is the element that would cover
  // the list, so its real height is the only honest source for how far to stop short.
  LIST_SCROLL_MARGIN: 24,   // breathing room above the list, once the sticky header is cleared
  _stickyChromeHeight() {
    const h = document.querySelector('header:not([data-ochrome])');
    if (!h) return 0;
    try { if (getComputedStyle(h).position !== 'sticky') return 0; } catch (e) { return 0; }
    return h.getBoundingClientRect().height || 0;
  },
  _listRows() { return [...document.querySelectorAll('[data-list-wrap] [data-row-wrap]')]; },
  // `after` receives the SECONDS OF TRAVEL still left when it fires, so the cascade can be fitted to
  // the time remaining and land on the same beat the scroll does.
  _listAnchor(futureRows, after) {
    // The commit must NEVER depend on a scroll finishing. A stalled ticker would otherwise swallow
    // the page change outright — the reader presses Next and nothing happens — which is a far worse
    // failure than the jump this replaces. So the callback is latched and also fired by a timer.
    let fired = false;
    const dur = this.DUR.reveal;
    const t0 = (function () { try { return performance.now(); } catch (e) { return 0; } })();
    const left = () => { try { return Math.max(0, dur - (performance.now() - t0) / 1000); } catch (e) { return 0; } };
    const done = () => {
      if (fired) return; fired = true;
      if (this._listAnchorT) { clearTimeout(this._listAnchorT); this._listAnchorT = null; }
      if (this._listAnchorTick) { try { window.gsap.ticker.remove(this._listAnchorTick); } catch (e) { } this._listAnchorTick = null; }
      if (after) after(left());
    };
    const el = this.gridRef && this.gridRef.current, g = window.gsap;
    if (!el) { done(); return; }
    let top = Math.max(0, window.scrollY + el.getBoundingClientRect().top - this._stickyChromeHeight() - this.LIST_SCROLL_MARGIN);
    // Never aim past where the SHORTER page will be able to scroll. Anchoring to the list top is
    // pointless if the post-commit document cannot reach it — the browser would clamp on arrival and
    // reintroduce the very snap this exists to remove, just smaller. Row height is measured from the
    // live rows rather than assumed from the token, so a row-height change cannot silently break it.
    const wrap = document.querySelector('[data-list-wrap]'), cur = this._listRows().length;
    let futureMax = Infinity;
    if (wrap && cur && typeof futureRows === 'number') {
      const rowH = wrap.getBoundingClientRect().height / cur;
      const shrink = Math.max(0, (cur - futureRows) * rowH);
      futureMax = Math.max(0, document.documentElement.scrollHeight - shrink - window.innerHeight);
      top = Math.min(top, futureMax);
    }
    const dist = Math.abs(window.scrollY - top);
    if (dist < 8) { done(); return; }                       // already reading from the top: no move at all
    if (this._reduce || !g) { try { window.scrollTo(0, top); } catch (e) { } done(); return; }
    // Swap the rows the moment it is SAFE, not the moment the travel ends. What made the old jump was
    // committing while scrollY still sat above what the shorter document could hold; the instant the
    // page has come down past that line the swap is clamp-free, and the cascade gets to run ALONGSIDE
    // the remaining travel instead of queueing behind it. When the row count is unchanged — paging
    // within a full page — that line is already behind us and the two start together.
    // 2px of tolerance, because scrollY is fractional while scrollHeight is an integer: at the very
    // bottom of the page the comparison reads false by a subpixel and would defer the commit for no
    // reason. Two pixels of clamp is nothing; losing the overlap on the commonest case is not.
    const safe = (y) => y <= futureMax + 2;
    if (safe(window.scrollY)) { done(); }
    else {
      const watch = () => { if (safe(window.scrollY)) done(); };
      this._listAnchorTick = watch;
      try { g.ticker.add(watch); } catch (e) { this._listAnchorTick = null; }
    }
    clearTimeout(this._listAnchorT);
    // The failsafe must land the scroll THROUGH whoever owns it. A raw window.scrollTo here while
    // Lenis is still mid-animation is a tug of war Lenis wins — it keeps interpolating from its own
    // idea of the position and drags the page back off the mark. Telling Lenis to jump keeps one
    // owner of the scroll at all times.
    const land = () => { if (this._lenis) { try { this._lenis.scrollTo(top, { immediate: true }); return; } catch (e) { } } try { window.scrollTo(0, top); } catch (e) { } };
    this._listAnchorT = setTimeout(() => { this._listAnchorT = null; land(); done(); }, this.DUR.reveal * 1000 + 250);
    // Lenis owns the page's scroll when it is running; going around it would fight its own rAF loop.
    if (this._lenis) { this._lenis.scrollTo(top, { duration: this.DUR.reveal, onComplete: done }); return; }
    if (g.plugins && g.plugins.scrollTo) { g.to(window, { scrollTo: { y: top, autoKill: false }, duration: this.DUR.reveal, ease: this.EASE.entrance, onComplete: done }); return; }
    try { window.scrollTo(0, top); } catch (e) { } done();
  },
  // Rows arrive as ONE unit, top to bottom. The stagger is deliberately tighter than the statement
  // lines' — there can be 36 of them, and the whole cascade still has to read as a single gesture
  // rather than a queue — so it is derived from the row count and capped, never a flat per-row delay.
  _listRowsArm() {
    const g = window.gsap;
    if (!g || this._reduce || document.hidden || this.state.feedView !== 'list') return;
    if (document.querySelector('[data-land-line]')) return;   // landing is up; the archive is behind it
    const rows = this._listRows();
    if (!rows.length) return;
    g.set(rows, { y: 12, opacity: 0 });   // transform+opacity only: the container's height cannot move
  },
  _listRowsReveal(opts) {
    const g = window.gsap;
    if (!g || this._reduce || this.state.feedView !== 'list') return;
    const rows = this._listRows();
    if (!rows.length) return;
    const delay = (opts && opts.delay) || 0;
    g.killTweensOf(rows);
    const n = rows.length, gaps = Math.max(1, n - 1);
    let duration = this.DUR.reveal, stagger = Math.min(0.035, 0.7 / n);
    // `span` = seconds of scroll travel still to run. Fit the WHOLE cascade inside it so the last row
    // settles on the same beat the page stops moving, instead of the reader arriving at the top and
    // then waiting for the list to catch up. The wave keeps its top-down order either way — it is
    // only being fitted to the time available. A floor stops a near-finished scroll turning it into a cut.
    if (opts && typeof opts.span === 'number') {
      const fit = Math.max(0.28, opts.span);
      stagger = Math.min(stagger, (fit * 0.45) / gaps);
      duration = Math.max(0.18, fit - stagger * gaps);
    }
    const tw = g.fromTo(rows, { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: duration, stagger: stagger, ease: this.EASE.entrance, delay: delay, clearProps: 'transform,opacity' });
    // Same stall contract as the masked lines: rows are set invisible the instant this is called, so
    // a ticker that never wakes must not be able to leave the archive blank. Plainly visible is the floor.
    clearTimeout(this._listRevealT);
    this._listRevealT = setTimeout(() => {
      this._listRevealT = null;
      if (tw.progress() >= 1) return;
      try { tw.kill(); } catch (e) { }
      try { g.set(rows, { clearProps: 'transform,opacity' }); } catch (e) { }
    }, 2500 + delay * 1000);
  },
  // One path for every control that replaces the list's contents wholesale, so page, page size and
  // sort cannot drift into three different behaviours. The reveal runs in setState's callback —
  // after the DOM is committed but before the browser paints — so the rows are never shown at rest
  // for a frame before being hidden to start.
  _listCommit(patch) {
    const total = this.scopedFeed(this.state.feed).length;
    const size = patch.pageSize || this.state.pageSize || 12;
    const pg = typeof patch.page === 'number' ? patch.page : (this.state.page || 0);
    const futureRows = Math.max(0, Math.min(size, total - pg * size));
    this._listAnchor(futureRows, (travelLeft) => this.setState(patch, () => this._listRowsReveal({ span: travelLeft })));
  },

  // ===== theme toggle (chrome only — never the palette swatches) =====
  toggleTheme() {
    const next = this.state.theme === 'dark' ? 'light' : 'dark'; try { document.documentElement.setAttribute('data-theme', next); } catch (e) { }
    // clear any GSAP-baked inline background so rows fall back to the token-driven rowStyle under the new theme
    try { const g = window.gsap; document.querySelectorAll('[data-list-wrap] [data-row]').forEach((r) => { if (g) g.killTweensOf(r); r.style.removeProperty('background-color'); r.style.removeProperty('background'); r.removeAttribute('data-hover'); }); } catch (e) { }
    this.setState({ theme: next, announce: next === 'dark' ? 'Dark theme.' : 'Light theme.' }, () => {
      // brief crossfade over the re-skin — quick, --ease-standard; instant under reduced motion
      const g = window.gsap; if (this._reduce || !g) return;
      const root = document.querySelector('[data-app]'); if (root) g.fromTo(root, { opacity: 0.5 }, { opacity: 1, duration: this.DUR.reveal * 0.5, ease: this.EASE.standard, clearProps: 'opacity' });
    });
  },

  // ===== result reveal =====
  // Shared reveal: bands wipe up from the bottom edge, one after the next (settle-with-authority).
  animateBands() {
    const g = window.gsap, root = this.resultRef.current;
    if (!g || !root || document.hidden) return;
    const bands = root.querySelectorAll('[data-band]');
    if (this._reduce) { g.fromTo(bands, { opacity: 0 }, { opacity: 1, duration: .4, stagger: .03, ease: 'none', clearProps: 'opacity' }); return; }
    g.set(bands, { clipPath: 'inset(100% 0 0 0)' });                                   // fully clipped, hidden
    g.to(bands, { clipPath: 'inset(0% 0 0 0)', duration: this.DUR.reveal, stagger: this.DUR.stagger, ease: this.EASE.entrance, clearProps: 'clipPath' }); // wipe up from the bottom edge
  },
  animateText(delay) {
    const g = window.gsap, root = this.resultRef.current;
    if (!g || !root || document.hidden) return;
    const all = [...root.querySelectorAll('[data-fx]')];
    const meta = [...root.querySelectorAll('[data-meta]')];
    if (this._reduce) { g.fromTo(all.concat(meta), { opacity: 0 }, { opacity: 1, duration: .4, ease: 'none' }); return; }
    const split = all.filter((el) => el.hasAttribute('data-split'));
    const fx = all.filter((el) => !el.hasAttribute('data-split'));
    g.from(fx, { y: 14, opacity: 0, duration: this.DUR.reveal, stagger: this.DUR.stagger, ease: this.EASE.entrance, delay: delay });
    split.forEach((el) => this._maskLineReveal(el, delay));
    // The metrics readout assembles as a sequence, from the same two primitives the page already
    // owns: every [data-meta-line] rule draws left→right (the loader bar's scaleX-from-origin-0
    // draw), and every [data-meta-split] text rises through the same masked line reveal as the
    // name and rationale above — each one a beat later than the last (half the shared stagger, so
    // eleven rules and ten texts overlap into one continuous pass down the block rather than
    // eleven separate events). Rules lead by a breath; the words rise into ruled space.
    const metaLines = [...root.querySelectorAll('[data-meta-line]')];
    const metaSplits = [...root.querySelectorAll('[data-meta-split]')];
    if (metaLines.length) g.from(metaLines, { scaleX: 0, transformOrigin: '0% 50%', duration: this.DUR.reveal, stagger: this.DUR.stagger, ease: this.EASE.entrance, delay: delay + 0.1, clearProps: 'transform' });
    metaSplits.forEach((el, i) => this._maskLineReveal(el, delay + 0.16 + i * (this.DUR.stagger * 0.5)));
  },
  // Masked line reveal (Osmo SplitText mechanic, hand-split — no plugin): measure the rendered line
  // breaks via word spans, rebuild as overflow:hidden line masks, slide each line up from 110%, then
  // restore the plain text node so line-clamp, editing and future re-renders are untouched.
  _maskLineReveal(el, delay) {
    const g = window.gsap;
    const text = el.textContent;
    if (!text || !text.trim()) return;
    if (el._splitRevert) { try { el._splitRevert(); } catch (e) { } }
    const prev = { minHeight: el.style.minHeight, display: el.style.display };
    const box = el.getBoundingClientRect();
    const restore = () => { if (!el._splitRevert) return; el._splitRevert = null; el.textContent = text; el.style.minHeight = prev.minHeight; el.style.display = prev.display; };
    el._splitRevert = restore;
    el.style.minHeight = box.height + 'px';
    el.style.display = 'block';                                   // line-clamp's -webkit-box can't hold block masks; restored after
    // 1 — measure: word spans, lines grouped by offsetTop
    el.textContent = '';
    const words = text.split(/\s+/).filter(Boolean);
    const meas = words.map((w) => { const s = document.createElement('span'); s.style.display = 'inline-block'; s.textContent = w; el.appendChild(s); el.appendChild(document.createTextNode(' ')); return s; });
    const lines = []; let top = null;
    meas.forEach((s) => { if (s.offsetTop !== top) { top = s.offsetTop; lines.push([]); } lines[lines.length - 1].push(s.textContent); });
    // 2 — rebuild: one overflow-hidden mask per line, inner slides up
    el.textContent = '';
    const inners = lines.map((ws) => { const mask = document.createElement('div'); mask.style.overflow = 'hidden'; mask.style.paddingBottom = '0.12em'; mask.style.marginBottom = '-0.12em'; const inner = document.createElement('div'); inner.textContent = ws.join(' '); inner.style.willChange = 'transform'; mask.appendChild(inner); el.appendChild(mask); return inner; });
    g.fromTo(inners, { yPercent: 110 }, { yPercent: 0, duration: this.DUR.reveal, stagger: 0.08, ease: this.EASE.entrance, delay: delay, onComplete: restore });
    setTimeout(() => { try { restore(); } catch (e) { } }, (delay || 0) * 1000 + this.DUR.reveal * 1000 + inners.length * 80 + 400);   // safety: never leave the split DOM behind
  },
  flipBandsFrom(rects) {
    const g = window.gsap, root = this.resultRef.current;
    if (!g || !root || !rects || !rects.length || document.hidden) return;
    const bands = [...root.querySelectorAll('[data-band]')];
    bands.forEach((band, i) => {
      const from = rects[Math.min(i, rects.length - 1)];
      const to = band.getBoundingClientRect();
      if (!from || !to.width || !to.height) return;
      g.set(band, { transformOrigin: 'top left', x: from.left - to.left, y: from.top - to.top, scaleX: from.width / to.width, scaleY: from.height / to.height });
    });
    g.to(bands, { x: 0, y: 0, scaleX: 1, scaleY: 1, duration: this.DUR.reveal, ease: this.EASE.entrance, stagger: this.DUR.stagger, clearProps: 'transform' });
  },
};
