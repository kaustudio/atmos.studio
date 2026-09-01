// The fullscreen palette universe: an overscanning, infinitely-wrapping plane (adapted from the
// Osmo infinite grid, tone-disciplined — no scale-on-drag, no parallax) with a radial-bloom
// entrance as ONE reversible timeline, plus the feed-view switcher shared with the 3D reel.
import { UNIVERSE_TILE } from '../universeTile.js';

export const universeMethods = {
  setFeedView(v) {
    // Re-entering grid while the close is still reversing: cancel the close and replay the bloom
    // forward from wherever it is — no teardown, no lost click. (State never left 'grid'.)
    if (v === 'grid' && v === this.state.feedView && this._uBloomTl && this._uBloomTl.reversed() && this._uBloomTl.isActive()) {
      this._uCloseGen = (this._uCloseGen || 0) + 1;   // invalidate the pending close completion
      // ...and with it the arrival that close was on its way to. The generation guard makes the
      // pending finish() a no-op, so nothing else would ever release this latch or run the queued
      // enter — the toggle would come back to life pointing at a view nobody asked for any more.
      this._viewClosing = false; this._viewPending = null;
      // back to entrance pace — the close ran it at 1.8x, and an assembly resuming forward at
      // exit speed would arrive faster than one that was never interrupted
      this._uBloomTl.timeScale(1).play();
      return;
    }
    if (v === this.state.feedView) return;
    const from = this.state.feedView;
    /* ONE RULE FOR EVERY DEPARTURE: whatever is on screen plays its own exit, and the next view is
       built in that exit's completion.

       Only the exit to the list ever obeyed it. The two fullscreen views could also be swapped
       DIRECTLY — the toggle is List | Grid | 3D and the arrow keys cycle all three — and those two
       paths called killSpatial()/killReel() synchronously on the click. Teardown empties the helix's
       list and rips the clone layer out of the DOM, so a fully opaque layer lost its entire contents
       between two frames while it was still the thing being looked at. Measured on the 3D→Grid
       press: 32 cards to 0 on the same tick, layer opacity 1 throughout. It was the hardest cut in
       the product, on the surface with the most on screen to lose. */
    const enter = v === 'grid' ? () => this._enterGrid() : v === 'carousel' ? () => this._enterReel() : () => this._enterList(from);
    if (from === 'list') { enter(); return; }
    // A second press while a view is already leaving does not start a second exit — it changes where
    // the one already running lands. Dropping it instead would swallow Escape during a Grid→3D swap,
    // which is the one key that must always be able to get someone out of a fullscreen view.
    if (this._viewClosing) { this._viewPending = enter; return; }
    this._viewClosing = true;
    const done = () => { this._viewClosing = false; const next = this._viewPending || enter; this._viewPending = null; next(); };
    if (from === 'carousel') this.closeReel(done); else this.closeUniverse(done);
  },
  // The three arrivals. Each assumes the previous view has ALREADY played its exit and is hidden —
  // which is what makes it safe to tear down here, before the state flip, rather than after it.
  _enterGrid() {
    this._uCloseGen = (this._uCloseGen || 0) + 1;   // invalidate any pending close completion
    this.killSpatial(); this.killReel();
    this._lenisStop();                                   // the universe's Observer owns the wheel
    try { document.body.style.overflow = 'hidden'; } catch (e) { }
    this._bloomNext = true;                              // play the radial assembly bloom on this entrance
    this.setState({ feedView: 'grid', announce: 'Spatial grid view. Drag to pan the field. Press Escape to return to the list.' }, () => { requestAnimationFrame(() => { const layer = document.querySelector('[data-universe-status]'); if (layer) try { layer.style.visibility = ''; } catch (e) { } this.initSpatial(); const c = this.universeCloseRef.current; if (c) try { c.focus(); } catch (e) { } }); });
  },
  _enterReel() {
    // entering the reel — fullscreen like the universe; scroll locked (nothing to scroll to)
    this._uCloseGen = (this._uCloseGen || 0) + 1;
    this.killSpatial();
    this._lenisStop();
    try { document.body.style.overflow = 'hidden'; } catch (e) { }
    this.setState({ feedView: 'carousel', announce: '3D view. Drag or scroll to spin the cards. Press Escape to return to the list.' }, () => { requestAnimationFrame(() => { this.initReel(); const c = this.reelCloseRef && this.reelCloseRef.current; if (c) try { c.focus(); } catch (e) { } }); });
  },
  // The list is the one arrival that keeps its teardown INSIDE the state callback: the page behind
  // is real document flow rather than a layer of its own, so the fullscreen surface is hidden by the
  // re-render first and only then emptied.
  _enterList(from) {
    this._lenisStart();
    try { document.body.style.overflow = ''; } catch (e) { }
    this.setState({ feedView: 'list', announce: 'List view.' }, () => { this.killSpatial(); this.killReel(); requestAnimationFrame(() => { const t = this.gridRef.current && this.gridRef.current.closest('section'); const rx = from === 'carousel' ? /3d/i : /grid/i; const gt = t && [...t.querySelectorAll('button[aria-pressed]')].find((b) => rx.test(b.textContent)); if (gt) try { gt.focus(); } catch (e) { } }); });
  },
  // Open: the universe layer fades in and the tile field assembles from the viewport centre; close
  // is reverse() of the same timeline. The pan/Observer engine starts only at forward completion.
  closeUniverse(done) {
    const g = window.gsap, layer = document.querySelector('[data-universe-status]');
    const myGen = (this._uCloseGen = (this._uCloseGen || 0) + 1);
    const finish = () => { if (myGen !== this._uCloseGen) return; if (layer) try { layer.style.visibility = 'hidden'; } catch (e) { } done(); };   // hide synchronously before ANY teardown can un-hide
    if (this._reduce || !g || !layer) { finish(); return; }
    /* NO TIMELINE TO REVERSE IS NOT "NO EXIT". buildUniverse only keeps _uBloomTl when it actually
       played the bloom, and it plays the bloom only on an entrance — so every REBUILD of a field
       that is already up (a window resize, deleting a palette, changing a filter or a folder) left
       this method with nothing to reverse and dropped it straight into finish(). The field vanished
       in a frame, and which of the two it did depended on whether you had touched a filter since
       arriving. Recede by hand instead, on the shape the reverse produces: chrome lifts out first,
       the plane settles back, the layer goes last. */
    if (!this._uBloomTl) {
      try { if (this._ticker) g.ticker.remove(this._ticker); } catch (e) { }
      const plane = document.querySelector('[data-plane]');
      const chrome = [...layer.querySelectorAll('[data-universe-chrome]')];
      if (this._uCloseTl) { try { this._uCloseTl.kill(); } catch (e) { } }
      // The timeline and the floor share ONE latched completion — passing `finish` to both would let
      // a slow-but-alive tween land after the floor had already fired, and finish() is not idempotent:
      // it calls done(), which builds the arriving view. Twice.
      const land = this._exitFloor('u', 0.5, finish);
      const tl = this._uCloseTl = g.timeline({ defaults: { ease: this.EASE.exit }, onComplete: land });
      if (chrome.length) tl.to(chrome, { opacity: 0, y: -8, duration: 0.25 }, 0);
      if (plane) tl.to(plane, { scale: 0.96, duration: 0.45, transformOrigin: 'center center' }, 0);
      tl.to(layer, { opacity: 0, duration: 0.45 }, 0.05);
      return;
    }
    const tl = this._uBloomTl;
    // Deadlock guard: an interrupted close can leave the timeline fully reversed (progress 0) with the
    // state flip never applied — reversing again fires no callback. Tear down synchronously instead.
    if (tl.progress() <= 0.001 && !tl.isActive()) { finish(); return; }
    try { if (this._ticker) g.ticker.remove(this._ticker); } catch (e) { }   // freeze the pan so the field recedes cleanly
    /* REVERSED, BUT NOT AT ENTRANCE PACE. A reverse plays the timeline's easing backwards too, and
       every curve in it is expo-out — which reversed is expo-IN, all of the travel saved up for the
       end. Worse, the layer's own fade lives in the first 0.31s of a 0.9s assembly, so on the way
       out it does not begin until 0.59s in: press Close and the field holds perfectly still for
       over half a second, then drops out at once. It read as a click that had not registered.
       Compressed to ~0.5s the shape is unchanged and the dead stretch is halved — and it now leaves
       on the same beat as the reel, which is the point of the two views sharing a switcher. The
       exit being quicker than the entrance is the house rule everywhere else here (motion.js). */
    tl.timeScale(1.8);
    // Floored like every other exit: this callback does not merely end an animation, it flips the
    // state that returns the reader to the page. A ticker that never wakes must not strand them on
    // a field whose Close button no longer leads anywhere.
    tl.eventCallback('onReverseComplete', this._exitFloor('u', tl.duration() / 1.8, finish));
    tl.reverse();
  },
  killSpatial() {
    this._spatialLive = false;
    if (this._obs) { try { this._obs.kill(); } catch (e) { } this._obs = null; }
    if (this._ticker && window.gsap) { window.gsap.ticker.remove(this._ticker); } this._ticker = null;
    this._engineStarted = false;
    if (this._cloneLayer && this._cloneLayer.parentNode) { this._cloneLayer.parentNode.removeChild(this._cloneLayer); } this._cloneLayer = null;
    this._uCards = null; this._uPos = null; this._uMoved = false;
    if (this._uResize) { window.removeEventListener('resize', this._uResize); this._uResize = null; }
    clearTimeout(this._uResizeT);
    this._built = false;
    // reset any transforms/bloom state left on the real originals (buttons + inner wrappers + plane)
    const plane = document.querySelector('[data-plane]');
    if (plane && window.gsap) { const ow = plane.querySelector('[data-grid-originals]'); if (ow) { window.gsap.set([...ow.children], { clearProps: 'transform' }); window.gsap.set([...ow.querySelectorAll('[data-tile-inner]')], { clearProps: 'opacity,transform' }); } window.gsap.set(plane, { clearProps: 'transform' }); }
    // reset transition state so a teardown that bypasses the close (delete-to-empty, unmount) leaves nothing baked
    if (window.gsap) {
      const g = window.gsap; const layer = document.querySelector('[data-universe-status]');
      if (this._uBloomTl) { try { this._uBloomTl.kill(); } catch (e) { } this._uBloomTl = null; }
      // the hand-written recede too — it outlives the state flip by design, so a teardown arriving
      // behind it would otherwise be undone by its next tick
      if (this._uCloseTl) { try { this._uCloseTl.kill(); } catch (e) { } this._uCloseTl = null; }
      if (layer) try { g.set(layer, { clearProps: 'transform,opacity' }); } catch (e) { }
    }
  },
  // neighbour-safe palette distribution (same palette never orthogonally/diagonally adjacent)
  distributeIndexes(cols, rows, total) {
    const idx = Array.from({ length: rows }, () => []); const used = Array(total).fill(0);
    const cc = Math.floor(cols / 2), cr = Math.floor(rows / 2), cells = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) cells.push({ r, c, d: Math.abs(r - cr) + Math.abs(c - cc) });
    cells.sort((a, b) => a.d - b.d);
    cells.forEach(({ r, c }) => {
      const blocked = [idx[r][c - 1], idx[r][c + 1],
      r > 0 ? idx[r - 1][c] : undefined, r < rows - 1 ? idx[r + 1][c] : undefined,
      r > 0 ? idx[r - 1][c - 1] : undefined, r > 0 ? idx[r - 1][c + 1] : undefined,
      r < rows - 1 ? idx[r + 1][c - 1] : undefined, r < rows - 1 ? idx[r + 1][c + 1] : undefined];
      const seed = (r * 17 + c * 31) % total; let best = 0, bestScore = Infinity;
      for (let i = 0; i < total; i++) { const it = (i + seed) % total; let sc = used[it] * 10 + Math.abs(it - seed) * 0.01; if (total > 1 && blocked.includes(it)) sc += 1000; if (sc < bestScore) { bestScore = sc; best = it; } }
      idx[r][c] = best; used[best]++;
    });
    return idx;
  },
  _spatialBuilt() { return !!(this._cloneLayer && this._cloneLayer.parentNode); },
  initSpatial() {
    if (this._reduce) return;
    if (this._spatialBuilt()) return;   // clones already attached — no-op (deterministic + self-healing)
    if (!window.gsap || !window.Observer) {
      this._uRetries = (this._uRetries || 0) + 1;
      if (this._uRetries < 60 && this.state.feedView === 'grid') { clearTimeout(this._uRetryT); this._uRetryT = setTimeout(() => this.initSpatial(), 50); }
      return;
    }
    this._uRetries = 0;
    // The grid markup (wrapper/plane/originals) mounts via React — it may not be in the DOM at this
    // rAF yet. Retry (like the GSAP wait) instead of silently giving up, so the field always builds.
    const plane = document.querySelector('[data-plane]'), wrapper = document.querySelector('[data-universe-status]');
    const ow = plane && plane.querySelector('[data-grid-originals]');
    if (!plane || !wrapper || !ow || !ow.children.length) {
      this._uDomRetries = (this._uDomRetries || 0) + 1;
      if (this._uDomRetries < 60 && this.state.feedView === 'grid') { clearTimeout(this._uRetryT); this._uRetryT = setTimeout(() => this.initSpatial(), 50); }
      return;
    }
    this._uDomRetries = 0;
    this.buildUniverse();
    if (!this._uResize) { this._uResize = () => { clearTimeout(this._uResizeT); this._uResizeT = setTimeout(() => { if (this.state.feedView === 'grid') this.buildUniverse(); }, 200); }; window.addEventListener('resize', this._uResize); }
  },
  buildUniverse() {
    try {
      const g = window.gsap, wrapper = document.querySelector('[data-universe-status]'), plane = document.querySelector('[data-plane]');
      if (!g || !window.Observer || !wrapper || !plane) { return; }
      const ow = plane.querySelector('[data-grid-originals]'); if (!ow) { return; }
      const origEls = [...ow.children]; const N = origEls.length; if (!N) { return; }
      // teardown prior build (but keep resize listener)
      if (this._obs) { try { this._obs.kill(); } catch (e) { } this._obs = null; }
      if (this._ticker) { g.ticker.remove(this._ticker); this._ticker = null; }
      if (this._cloneLayer && this._cloneLayer.parentNode) this._cloneLayer.parentNode.removeChild(this._cloneLayer);

      // The cell is the card plus the gutter. Both dimensions come from the shared token rather
      // than from literals restated here: this file lays out a box it does not build, and the two
      // copies of "300 × 372" only ever agreed because nobody had resized the card yet.
      const TW = UNIVERSE_TILE.W, TH = UNIVERSE_TILE.H, GAP = 64, cellW = TW + GAP, cellH = TH + GAP, OVER = 1;
      const cols = Math.max(1, Math.ceil(wrapper.clientWidth / cellW) + OVER * 2);
      const rows = Math.max(Math.ceil(wrapper.clientHeight / cellH) + OVER * 2, Math.ceil(N / cols));
      const totalW = cols * cellW, totalH = rows * cellH;

      const idx = this.distributeIndexes(cols, rows, N);
      // Designate the N real originals WITHOUT disturbing the neighbour-safe layout: for each palette,
      // adopt the centre-most cell that already shows it. Zero new adjacencies introduced.
      const cc = Math.floor(cols / 2), cr = Math.floor(rows / 2), cells = [];
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) cells.push({ r, c, d: Math.abs(r - cr) + Math.abs(c - cc) });
      cells.sort((a, b) => a.d - b.d);
      const origAt = new Map(), claimed = new Set();
      for (let k = 0; k < N; k++) { const cell = cells.find((ce) => idx[ce.r][ce.c] === k && !claimed.has(ce.r + ',' + ce.c)); if (cell) { origAt.set(cell.r + ',' + cell.c, k); claimed.add(cell.r + ',' + cell.c); } }

      const cloneLayer = document.createElement('div');
      cloneLayer.setAttribute('data-grid-clones', '');
      cloneLayer.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;z-index:1';
      plane.appendChild(cloneLayer);
      this._cloneLayer = cloneLayer;
      // decorative clones are click-openable too (drag-guarded), so any visible tile is actionable by pointer
      cloneLayer.addEventListener('click', (ev) => { if (this._uMoved) { this._uMoved = false; return; } const t = ev.target.closest && ev.target.closest('[data-pal-idx]'); if (!t) return; const p = this.state.feed[+t.dataset.palIdx]; if (p) this.openOverlay(p, t); });
      cloneLayer.addEventListener('mouseover', (ev) => { const t = ev.target.closest && ev.target.closest('[data-pal-idx]'); if (t) this.stackEnter(t); });
      cloneLayer.addEventListener('mouseout', (ev) => { const t = ev.target.closest && ev.target.closest('[data-pal-idx]'); if (t) this.stackLeave(t); });

      // masonry: stable per-column vertical offset (hashed from column index), within one cell height,
      // baked into baseY BEFORE the modulo wrap so the infinite wrapping stays intact.
      const colOffset = (c) => { const h = Math.sin((c + 1) * 12.9898) * 43758.5453; return (h - Math.floor(h)) * cellH; };
      const cards = []; const origCards = new Map();
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const baseX = c * cellW, baseY = r * cellH + colOffset(c), key = r + ',' + c;
          let el;
          if (origAt.has(key)) {
            el = origEls[origAt.get(key)];
            el.style.position = 'absolute'; el.style.top = '0'; el.style.left = '0'; el.style.width = TW + 'px'; el.style.height = TH + 'px'; el.style.zIndex = '2';
          } else {
            const pi = idx[r][c];
            el = origEls[pi].cloneNode(true);
            el.setAttribute('aria-hidden', 'true'); el.setAttribute('tabindex', '-1'); el.removeAttribute('aria-current'); el.removeAttribute('data-focus');
            el.dataset.palIdx = pi;
            el.style.position = 'absolute'; el.style.top = '0'; el.style.left = '0'; el.style.width = TW + 'px'; el.style.height = TH + 'px';
            cloneLayer.appendChild(el);
          }
          const cd = { el, baseX, baseY, setX: g.quickSetter(el, 'x', 'px'), setY: g.quickSetter(el, 'y', 'px') };
          cards.push(cd); if (origAt.has(key)) origCards.set(origEls[origAt.get(key)], cd);
        }
      }
      this._uCards = cards; this._uOrigCards = origCards;

      const startX = wrapper.clientWidth * 0.5 - cc * cellW - cellW * 0.5;
      const startY = wrapper.clientHeight * 0.5 - cr * cellH - cellH * 0.5;
      const pos = { x: startX, y: startY, tx: startX, ty: startY }; this._uPos = pos;
      this._uField = { totalW, totalH, cellW, cellH, offX: cellW * OVER, offY: cellH * OVER, vw: wrapper.clientWidth, vh: wrapper.clientHeight, TW, TH };
      const LERP = 0.08, WHEEL = 0.6, DRAG = 1.0, CLAMP = 90, offX = cellW * OVER, offY = cellH * OVER;
      const wrap = (v, s) => ((v % s) + s) % s;
      const tick = () => {
        pos.x += (pos.tx - pos.x) * LERP; pos.y += (pos.ty - pos.y) * LERP;
        for (let i = 0; i < cards.length; i++) { const cd = cards[i]; cd.setX(wrap(cd.baseX + pos.x + offX, totalW) - offX); cd.setY(wrap(cd.baseY + pos.y + offY, totalH) - offY); }
      };
      this._ticker = tick;
      tick();   // position every tile ONCE (so the bloom happens in place) — ticker not started yet

      this._uMoved = false;
      // The pan engine (ticker + Observer) starts only AFTER the entrance bloom, so the field
      // assembles calmly, then becomes interactive — no drift or drag mid-assembly.
      const startEngine = () => {
        if (this._engineStarted) return; this._engineStarted = true;
        g.ticker.add(tick);
        this._obs = window.Observer.create({
          target: wrapper, type: 'wheel,touch,pointer', dragMinimum: 3, preventDefault: false, tolerance: 6,
          onPress: () => { this._uMoved = false; wrapper.setAttribute('data-universe-status', 'dragging'); },
          onRelease: () => { wrapper.setAttribute('data-universe-status', 'idle'); clearTimeout(this._uMoveT); this._uMoveT = setTimeout(() => { this._uMoved = false; }, 80); },
          onStop: () => { wrapper.setAttribute('data-universe-status', 'idle'); },
          onChange: (self) => {
            const isWheel = self.event.type === 'wheel'; const sp = isWheel ? WHEEL : DRAG;
            const dx = g.utils.clamp(-CLAMP, CLAMP, self.deltaX * sp), dy = g.utils.clamp(-CLAMP, CLAMP, self.deltaY * sp);
            if (!isWheel && (Math.abs(dx) > 1 || Math.abs(dy) > 1)) this._uMoved = true;
            pos.tx += isWheel ? -dx : dx; pos.ty += isWheel ? -dy : dy;
          },
        });
      };
      this._engineStarted = false;

      // ---- entrance: radial bloom (assemble outward from viewport centre), as ONE reversible timeline ----
      const bloom = this._bloomNext && !this._reduce && g;
      this._bloomNext = false;
      const inners = cards.map((cd) => cd.el.querySelector('[data-tile-inner]')).filter(Boolean);
      const chrome = [...wrapper.querySelectorAll('[data-universe-chrome]')];
      const layer = document.querySelector('[data-universe-status]');
      if (layer) try { layer.style.visibility = ''; } catch (e) { }   // clear any close-finish visibility guard
      if (this._uBloomTl) { try { this._uBloomTl.kill(); } catch (e) { } this._uBloomTl = null; }
      if (!bloom) {
        if (layer && g) g.set(layer, { opacity: 1 });
        g.set(inners, { opacity: 1, scale: 1, clearProps: 'transform' });
        g.set(plane, { clearProps: 'transform' });
        if (chrome.length) g.set(chrome, { opacity: 1, y: 0, clearProps: 'transform' });
        startEngine();
      } else {
        // per-tile delay from its on-screen distance to viewport centre (true radial 'from:center')
        const cx = wrapper.clientWidth * 0.5, cy = wrapper.clientHeight * 0.5;
        const dist = cards.map((cd) => { const x = wrap(cd.baseX + pos.x + offX, totalW) - offX, y = wrap(cd.baseY + pos.y + offY, totalH) - offY; const dx = (x + TW * 0.5) - cx, dy = (y + TH * 0.5) - cy; return Math.sqrt(dx * dx + dy * dy); });
        const maxD = Math.max.apply(null, dist) || 1, SPREAD = 0.5;
        const delays = dist.map((d) => (d / maxD) * SPREAD);
        // bloom-START state (never the tile element itself — the pan engine owns its transform)
        if (layer) g.set(layer, { opacity: 0 });
        g.set(plane, { scale: 0.96, transformOrigin: 'center center' });
        g.set(inners, { opacity: 0, scale: 0.9, transformOrigin: 'center center' });
        if (chrome.length) g.set(chrome, { opacity: 0, y: -8 });
        // ONE reversible timeline: forward = assemble; reverse() (on close) = recede. Pan starts at forward end.
        const tl = g.timeline({ onComplete: startEngine });
        if (layer) tl.to(layer, { opacity: 1, duration: this.DUR.reveal * 0.5, ease: this.EASE.entrance }, 0);
        tl.to(plane, { scale: 1, duration: 0.85, ease: this.EASE.entrance, transformOrigin: 'center center' }, 0);
        tl.to(inners, { opacity: 1, scale: 1, duration: 0.5, ease: this.EASE.entrance, stagger: (i) => delays[i] }, 0);
        if (chrome.length) tl.to(chrome, { opacity: 1, y: 0, duration: 0.4, ease: this.EASE.entrance, stagger: 0.06 }, 0.5);
        this._uBloomTl = tl;
      }
      this._built = true;   // synchronous 'field built' flag — stops the cDU gate re-scheduling rebuilds that strip clones
    } catch (err) { this._obs = null; }
  },
  /* Tile hover/focus in the universe: bring up the ring. That is the whole of it now.
     THE PALETTE BAND USED TO LIFT — `y: -20` with an upward shadow, so the panel slid further over
     the image and the palette read as drawn from its source. Removed by request: the card is a
     readout, and a readout that moves under the pointer is a readout you have to wait for before
     you can finish reading it. The overlap the lift was dramatising is still there and always was —
     the panel sits at HERO-16, sixteen pixels into the image, at rest.
     THE RING IS WHAT ANSWERS THE POINTER, and it is enough: an opacity change is a state change
     without a geometry change, which is this app's rule for a control under a pointer (see the
     press tiers in global.css). Motion is not the only feedback channel here, so removing it costs
     the hover nothing it needed.
     It also settles the card's height. pbase's bottom is derived to sit 14px off the card's foot
     (see universeTile.js); the lift moved it to 34 and back on every hover, so the one measurement
     the geometry is built on was only true while nothing was hovered. */
  stackEnter(el) {
    if (!el) return; const r = el.querySelector('[data-ring]');
    if (this._reduce || !window.gsap) { if (r) r.style.opacity = '1'; return; }
    if (r) window.gsap.to(r, { opacity: 1, duration: this.DUR.state, ease: this.EASE.standard, overwrite: 'auto' });
  },
  stackLeave(el) {
    if (!el) return; const r = el.querySelector('[data-ring]');
    if (this._reduce || !window.gsap) { if (r) r.style.opacity = '0'; return; }
    if (r) window.gsap.to(r, { opacity: 0, duration: this.DUR.state, ease: this.EASE.exit, overwrite: 'auto' });
  },
  // bring a focused original tile into view (keyboard) by panning the field toward centre
  // — called only when the last input was keyboard (_kbdInput); pointer focus never moves the camera
  centerOnTile(el) {
    if (!this._uPos || !this._uField) return; const cd = this._uOrigCards && this._uOrigCards.get(el); if (!cd) return;
    const f = this._uField; this._uPos.tx = f.vw * 0.5 - f.TW * 0.5 - cd.baseX; this._uPos.ty = f.vh * 0.5 - f.TH * 0.5 - cd.baseY;
  },
};
