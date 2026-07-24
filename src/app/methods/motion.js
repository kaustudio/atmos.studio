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
  setPageSize(n) { try { localStorage.setItem('palette-generator/pagesize', '' + n); } catch (e) { } this.setState({ pageSize: n, page: 0, announce: n + ' palettes per page.' }); },
  setPage(p) { const total = this.scopedFeed(this.state.feed).length; const max = Math.max(0, Math.ceil(total / (this.state.pageSize || 12)) - 1); const np = Math.max(0, Math.min(p, max)); this.setState({ page: np, announce: 'Page ' + (np + 1) + '.' }); },

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
    return {
      hue: Math.round(hue), chroma, lMin: Math.round(lMin * 100), lMax: Math.round(lMax * 100),
      temp: (avgA + avgB) > 0.008 ? 'Warm' : (avgA + avgB) < -0.008 ? 'Cool' : 'Neutral',
      contrastMax: cMax, aaPairs: aa, totalPairs: n * (n - 1) / 2, mood: (p.archetype && p.archetype !== 'seed') ? p.archetype : (p.descriptors[0] || '').toLowerCase(),
    };
  },
  // Resolve a CSS custom property to its concrete value in the ACTIVE theme (GSAP can't interpolate var()).
  _cssVar(name) { try { return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || ''; } catch (e) { return ''; } },
  rowTintOn(el) { if (!el) return; el.dataset.hover = '1'; const g = window.gsap; if (this._reduce || !g) { el.style.background = 'var(--surface-white)'; return; } g.to(el, { backgroundColor: this._cssVar('--surface-white'), duration: this.DUR.state, ease: this.EASE.standard, overwrite: 'auto' }); },
  rowTintOff(el) {
    if (!el) return; el.removeAttribute('data-hover'); if (el.getAttribute('data-cur') === '1') return;  // current row stays lit
    const g = window.gsap; if (this._reduce || !g) { el.style.background = 'var(--surface-raised)'; return; } g.to(el, { backgroundColor: this._cssVar('--surface-raised'), duration: this.DUR.state, ease: this.EASE.standard, overwrite: 'auto' });
  },
  _countUp(el, instant) {
    const g = window.gsap; const nums = el.querySelectorAll('[data-count]');
    nums.forEach((n) => {
      const raw = n.getAttribute('data-count'); const t = parseFloat(raw); if (raw === '' || isNaN(t)) return;
      const dec = parseInt(n.getAttribute('data-dec') || '0', 10), suf = n.getAttribute('data-suf') || '';
      if (this._reduce || !g || instant) { n.textContent = t.toFixed(dec) + suf; return; }
      const o = { v: t * 0.6 }; g.to(o, { v: t, duration: 0.6, ease: 'power4.out', overwrite: 'auto', onUpdate: () => { n.textContent = o.v.toFixed(dec) + suf; } });
    });
  },
  // effect019 idea: scroll/drag lends a restrained, transform-only emphasis to the CURRENT readout, then settles.
  _bindReadout(el) { const g = window.gsap; if (this._reduce || !g) return; const rv = el.querySelector('[data-row-values]'); if (!rv) { this._readoutScale = null; return; } this._readoutScale = g.quickTo(rv, 'scale', { duration: 0.5, ease: 'power4' }); },
  // The expanded (reveal) row is the CURRENT/committed one — never hover. Hovering moves nothing.
  // Animate the panel height only when the current row CHANGES (a click/commit), not on re-render.
  _syncListActive() {
    const wrap = document.querySelector('[data-list-wrap]'); if (!wrap) return;
    const rows = [...wrap.querySelectorAll('[data-row]')]; if (!rows.length) return;
    const g = window.gsap, reduce = this._reduce;
    const curRow = rows.find((r) => r.getAttribute('data-cur') === '1') || null;
    const curId = curRow ? curRow.getAttribute('data-rowid') : null;
    const changed = (curId !== this._expandedCurId);
    rows.forEach((r) => {
      const panel = r.querySelector('[data-row-panel]'), medias = r.querySelectorAll('[data-media]');
      if (r === curRow) {
        r.style.background = 'var(--surface-white)';
        medias.forEach((m) => { m.style.opacity = '1'; m.style.transform = 'none'; });
        this._countUp(r, !changed); this._bindReadout(r);
        if (panel) { if (changed && g && !reduce) { panel.style.height = 'auto'; const h = panel.scrollHeight; g.fromTo(panel, { height: 0 }, { height: h, duration: 0.44, ease: this.EASE.entrance, overwrite: 'auto', onComplete: () => { panel.style.height = 'auto'; } }); g.fromTo(medias, { y: 22, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, ease: 'power4.out', overwrite: 'auto', stagger: { each: 0.04, from: 'random' } }); } else { panel.style.height = 'auto'; } }
      } else {
        if (r.getAttribute('data-hover') !== '1') r.style.background = 'var(--surface-raised)';
        if (panel) { if (changed && g && !reduce && r.getAttribute('data-rowid') === this._expandedCurId) { g.to(panel, { height: 0, duration: 0.3, ease: this.EASE.exit, overwrite: 'auto' }); } else { panel.style.height = '0px'; } }
      }
    });
    this._expandedCurId = curId;
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
    if (this._reduce) { g.fromTo(all, { opacity: 0 }, { opacity: 1, duration: .4, ease: 'none' }); return; }
    const split = all.filter((el) => el.hasAttribute('data-split'));
    const fx = all.filter((el) => !el.hasAttribute('data-split'));
    g.from(fx, { y: 14, opacity: 0, duration: this.DUR.reveal, stagger: this.DUR.stagger, ease: this.EASE.entrance, delay: delay });
    split.forEach((el) => this._maskLineReveal(el, delay));
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
