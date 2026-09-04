// The fullscreen palette universe: an overscanning, infinitely-wrapping field — Jesper Landberg's
// no-WebGL grid as Osmo Supply ships it (the Infinite Dome Grid), where everything you see is one
// matrix3d per card: the field domes away from the centre, swells under the cursor, a torch follows
// the pointer through a shade, and each photograph drifts toward it. Ported to this app's tokens
// with a radial-bloom entrance as ONE reversible timeline, plus the feed-view switcher shared with
// the 3D reel. The open card (openTile) is the reference's lightbox on the same loop.
import { UNIVERSE_TILE, UNIVERSE_OPEN } from '../universeTile.js';

// The field's feel, every knob in one place — the reference's own names and, where the field is
// the same size, its own figures. Distances in cards are in CELLS here (card + gutter), which is
// what the reference's `period` is.
const BOW = 0.15;           // dome strength, 0 is flat
const BULGE = 0.25;         // cursor lens strength, 0 removes it
const BULGE_REACH = 1.5;    // lens radius, in cells
const TORCH = 0.75;         // flashlight hole, in cells
const TORCH_TOUCH = 1.5;    // resting hole on touch screens
const PARALLAX = 12;        // px of image drift toward the cursor
const SHADE = 0.7;          // how far the field outside the torch fades toward the page
const PAN_EASE = 0.08;      // the flat engine's lerp, now frame-rate independent
const CURSOR_EASE = 0.12;
const BULGE_EASE = 0.08;
const clamp = (min, max, v) => Math.min(Math.max(v, min), max);
const damp = (from, to, rate, dt) => from + (to - from) * (1 - Math.pow(1 - rate, dt * 60));
const smooth = (t) => t * t * (3 - 2 * t);

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
    this.setState({ feedView: 'grid', announce: 'Spatial grid view. Drag to pan the field. Press a card to open it. Press Escape to return to the list.' }, () => { requestAnimationFrame(() => { const layer = document.querySelector('[data-universe-status]'); if (layer) try { layer.style.visibility = ''; } catch (e) { } this.initSpatial(); const c = this.universeCloseRef.current; if (c) try { c.focus(); } catch (e) { } }); });
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
    this._resetOpenTile();   // before the cards go: it reads the open card's element
    if (this._obs) { try { this._obs.kill(); } catch (e) { } this._obs = null; }
    if (this._ticker && window.gsap) { window.gsap.ticker.remove(this._ticker); } this._ticker = null;
    this._engineStarted = false;
    if (this._cloneLayer && this._cloneLayer.parentNode) { this._cloneLayer.parentNode.removeChild(this._cloneLayer); } this._cloneLayer = null;
    this._uCards = null; this._uPos = null; this._uMoved = false;
    if (this._uResize) { window.removeEventListener('resize', this._uResize); this._uResize = null; }
    if (this._uMove) { window.removeEventListener('pointermove', this._uMove); this._uMove = null; }
    if (this._uLeave && this._uLeaveEl) { this._uLeaveEl.removeEventListener('pointerleave', this._uLeave); this._uLeave = null; this._uLeaveEl = null; }
    if (this._uKey) { window.removeEventListener('keydown', this._uKey); this._uKey = null; }
    if (this._uShade && this._uShade.parentNode) this._uShade.parentNode.removeChild(this._uShade); this._uShade = null;
    this._uView = null; this._uRender = null;
    clearTimeout(this._uResizeT);
    this._built = false;
    // reset any transforms/bloom state left on the real originals (buttons + inner wrappers + plane)
    const plane = document.querySelector('[data-plane]');
    if (plane && window.gsap) { const ow = plane.querySelector('[data-grid-originals]'); if (ow) { window.gsap.set([...ow.children], { clearProps: 'transform' }); [...ow.children].forEach((el) => { el.style.setProperty('--dim', '0'); }); window.gsap.set([...ow.querySelectorAll('[data-tile-inner]')], { clearProps: 'opacity,transform' }); window.gsap.set([...ow.querySelectorAll('[data-tile-img]')], { clearProps: 'transform' }); } window.gsap.set(plane, { clearProps: 'transform' }); }
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
    // The reference's keyboard: arrows move one cell, space most of a screen, shift-space back.
    // Not while a card is open, not over a field, and not for a space that would press a control.
    if (!this._uKey) {
      this._uKey = (e) => {
        if (this.state.feedView !== 'grid' || this._uOpenCard || this._uClosing || this._ovOpen || !this._uPos || !this._uView || !this._engineStarted) return;
        const t = e.target, tag = t && t.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (t && t.isContentEditable)) return;
        if (e.key === ' ' && !(tag === 'BUTTON' || tag === 'A')) { e.preventDefault(); this._uPos.ty -= this._uView.mid.y * 1.6 * (e.shiftKey ? -1 : 1); return; }
        if (!e.key.startsWith('Arrow')) return;
        e.preventDefault();
        if (e.key === 'ArrowLeft') this._uPos.tx += this._uView.cellW; if (e.key === 'ArrowRight') this._uPos.tx -= this._uView.cellW;
        if (e.key === 'ArrowUp') this._uPos.ty += this._uView.cellH; if (e.key === 'ArrowDown') this._uPos.ty -= this._uView.cellH;
      };
      window.addEventListener('keydown', this._uKey);
    }
  },
  buildUniverse() {
    try {
      const g = window.gsap, wrapper = document.querySelector('[data-universe-status]'), plane = document.querySelector('[data-plane]');
      if (!g || !window.Observer || !wrapper || !plane) { return; }
      const ow = plane.querySelector('[data-grid-originals]'); if (!ow) { return; }
      const origEls = [...ow.children]; const N = origEls.length; if (!N) { return; }
      // teardown prior build (but keep resize listener). An open card cannot survive a rebuild —
      // its rest position is about to be laid out again — so it is put back first, instantly; the
      // reference closes its lightbox on resize for the same reason.
      this._resetOpenTile();
      if (this._obs) { try { this._obs.kill(); } catch (e) { } this._obs = null; }
      if (this._ticker) { g.ticker.remove(this._ticker); this._ticker = null; }
      if (this._cloneLayer && this._cloneLayer.parentNode) this._cloneLayer.parentNode.removeChild(this._cloneLayer);
      if (this._uShade && this._uShade.parentNode) this._uShade.parentNode.removeChild(this._uShade);

      // The cell is the card plus the gutter. Both dimensions come from the shared token rather
      // than from literals restated here: this file lays out a box it does not build.
      const TW = UNIVERSE_TILE.W, TH = UNIVERSE_TILE.H, GAP = 64, cellW = TW + GAP, cellH = TH + GAP, OVER = 1;
      const vw = wrapper.clientWidth, vh = wrapper.clientHeight;
      const cols = Math.max(1, Math.ceil(vw / cellW) + OVER * 2);
      const rows = Math.max(Math.ceil(vh / cellH) + OVER * 2, Math.ceil(N / cols));
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
      // NO z-index on the layer, and that is what lets a clone open. A z-index here makes the layer a
      // stacking context, so a clone lifted to z 4 on open would still be trapped under the shade and
      // the panel. Without it every card, original or clone, answers to the plane's one order:
      // clones at auto, originals at 1 (set below), the shade at 2, the panel at 3, the open card at 4.
      cloneLayer.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%';
      plane.appendChild(cloneLayer);
      this._cloneLayer = cloneLayer;
      // palIdx indexes the originals, which are the SCOPED feed (a filter or a folder narrows it) —
      // reading state.feed by that index handed a clone the wrong palette whenever a scope was on.
      cloneLayer.addEventListener('click', (ev) => { if (this._uMoved) { this._uMoved = false; return; } const t = ev.target.closest && ev.target.closest('[data-pal-idx]'); if (!t) return; const p = this.scopedFeed(this.state.feed)[+t.dataset.palIdx]; if (p) this.openTile(p, t); });
      // A copy must never take focus. Clones are aria-hidden and out of the tab order, but a button
      // is still focused by a mouse press, and Chrome reports (and blocks) focus landing inside an
      // aria-hidden subtree on every press. Cancelling mousedown's default keeps the press — the
      // pointer events the Observer and the click use are untouched — and keeps focus where it was.
      cloneLayer.addEventListener('mousedown', (ev) => { ev.preventDefault(); });
      cloneLayer.addEventListener('mouseover', (ev) => { const t = ev.target.closest && ev.target.closest('[data-pal-idx]'); if (t) this.stackEnter(t); });
      cloneLayer.addEventListener('mouseout', (ev) => { const t = ev.target.closest && ev.target.closest('[data-pal-idx]'); if (t) this.stackLeave(t); });

      /* THE SHADE — the reference's flashlight. One surface over every card, with a hole that
         follows the cursor; on touch there is no cursor, so the hole rests at the centre and reads as
         a soft vignette. It replaces the static vignette this view used to draw for the same purpose.
         --surface-raised, not black: the reference darkens toward its own black stage, and this one
         fades toward its own page, which is the same statement made against the right ground in
         both themes. It sits INSIDE the plane so the z-order can put the open card and its panel
         above it (see the clone layer's note); the open card carries its own dim (--dim on the tile)
         and fades it as it opens, so lifting above the shade never pops. */
      const shade = document.createElement('div');
      shade.setAttribute('data-universe-shade', ''); shade.setAttribute('aria-hidden', 'true');
      shade.style.cssText = 'position:absolute;inset:0;z-index:2;pointer-events:none;background:var(--surface-raised);opacity:' + SHADE + ';--fx:50%;--fy:50%';
      plane.appendChild(shade);
      this._uShade = shade;

      // A regular grid, as the reference lays it out: the dome needs rows that ARE rows, or the bow
      // reads as noise. (The per-column masonry drop the flat engine used is gone with it.)
      const cards = []; const origCards = new Map();
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const baseX = c * cellW, baseY = r * cellH, key = r + ',' + c;
          let el;
          if (origAt.has(key)) {
            el = origEls[origAt.get(key)];
            el.style.position = 'absolute'; el.style.top = '0'; el.style.left = '0'; el.style.width = TW + 'px'; el.style.height = TH + 'px'; el.style.zIndex = '1';
          } else {
            const pi = idx[r][c];
            el = origEls[pi].cloneNode(true);
            el.setAttribute('aria-hidden', 'true'); el.setAttribute('tabindex', '-1'); el.removeAttribute('aria-current'); el.removeAttribute('data-focus');
            el.dataset.palIdx = pi;
            el.style.position = 'absolute'; el.style.top = '0'; el.style.left = '0'; el.style.width = TW + 'px'; el.style.height = TH + 'px'; el.style.zIndex = '';
            cloneLayer.appendChild(el);
          }
          // matrix3d assumes the element's own origin is its top-left corner
          el.style.transformOrigin = '0 0'; el.style.willChange = 'transform';
          const cd = { el, img: el.querySelector('[data-tile-img]'), baseX, baseY, out: true };
          cards.push(cd); if (origAt.has(key)) origCards.set(origEls[origAt.get(key)], cd);
        }
      }
      this._uCards = cards; this._uOrigCards = origCards;

      const startX = vw * 0.5 - cc * cellW - cellW * 0.5;
      const startY = vh * 0.5 - cr * cellH - cellH * 0.5;
      const pos = { x: startX, y: startY, tx: startX, ty: startY }; this._uPos = pos;
      const offX = cellW * OVER, offY = cellH * OVER;
      this._uField = { totalW, totalH, cellW, cellH, offX, offY, vw, vh, TW, TH };
      const mid = { x: vw * 0.5, y: vh * 0.5 };
      const fine = !!(window.matchMedia && window.matchMedia('(pointer: fine)').matches);
      const cursor = { x: 0, y: 0, cx: 0, cy: 0 }, lens = { t: 0, c: 0 }, lit = { x: -1, y: -1 };
      // the open card, as the render loop sees it: k is the reference's open.c, w/h the element's
      // live size (the matrix has to divide by what the element IS, not what it was)
      const open = this._uOpenK = { k: 0, w: TW, h: TH, cell: null, box: null, panel: null, portrait: false };
      this._uView = { mid, cursor, lens, fine, pos, cellW, cellH, GAP, TW, TH };

      // the torch: a transparent hole of `hole` px, then a smoothstep ramp out to `edge`
      const hole = cellW * (fine ? TORCH : TORCH_TOUCH), edge = hole * 2;
      const stops = ['transparent ' + hole.toFixed(1) + 'px'];
      for (let i = 1; i <= 12; i++) { const t = i / 12; stops.push('rgba(0,0,0,' + smooth(t).toFixed(4) + ') ' + (hole + t * (edge - hole)).toFixed(1) + 'px'); }
      const mask = 'radial-gradient(circle at var(--fx) var(--fy), ' + stops.join(', ') + ')';
      shade.style.webkitMaskImage = mask; shade.style.maskImage = mask;
      shade.style.setProperty('--fx', mid.x + 'px'); shade.style.setProperty('--fy', mid.y + 'px');

      const wrap = (v, s) => ((v % s) + s) % s;
      const warp = (px, py) => {
        const nx = px / mid.x, ny = py / mid.y;
        const f = 1 + BOW * (nx * nx + ny * ny);
        let wx = px * f, wy = py * f;
        if (lens.c > 0.001) {
          const dx = wx - cursor.cx, dy = wy - cursor.cy, reach = BULGE_REACH * cellW;
          const push = BULGE * lens.c * Math.exp(-(dx * dx + dy * dy) / (reach * reach));
          wx += dx * push; wy += dy * push;
        }
        return { x: wx, y: wy };
      };
      const inset = (c, a, b, by) => {
        const la = Math.hypot(a.x - c.x, a.y - c.y) || 1, lb = Math.hypot(b.x - c.x, b.y - c.y) || 1;
        return { x: c.x + (by * (a.x - c.x)) / la + (by * (b.x - c.x)) / lb, y: c.y + (by * (a.y - c.y)) / la + (by * (b.y - c.y)) / lb };
      };
      // the card's CELL, wrapped into the field and warped, as four corners about the stage centre
      const quad = (cd) => {
        const sx = wrap(cd.baseX + pos.x + offX, totalW) - offX, sy = wrap(cd.baseY + pos.y + offY, totalH) - offY;
        const ox = sx + TW * 0.5 - mid.x, oy = sy + TH * 0.5 - mid.y, pw = cellW * 0.5, ph = cellH * 0.5;
        return { tl: warp(ox - pw, oy - ph), tr: warp(ox + pw, oy - ph), bl: warp(ox - pw, oy + ph), br: warp(ox + pw, oy + ph) };
      };
      /* The projective map from the element's own W×H box to a quad, as one matrix3d — the
         reference's derivation, generalised from a square: the first column divides by the width
         and the second by the height, because the element's input space is W×H, not card×card. The
         points arrive relative to the stage centre; the element sits at the plane's origin, so
         adding mid puts the translation where the corner should land. */
      const matrix = (q0, q1, q2, q3, ew, eh) => {
        const x0 = q0.x + mid.x, y0 = q0.y + mid.y, x1 = q1.x + mid.x, y1 = q1.y + mid.y;
        const x2 = q2.x + mid.x, y2 = q2.y + mid.y, x3 = q3.x + mid.x, y3 = q3.y + mid.y;
        const dx1 = x1 - x3, dy1 = y1 - y3, dx2 = x2 - x3, dy2 = y2 - y3;
        const sx = x0 - x1 - x2 + x3, sy = y0 - y1 - y2 + y3;
        const den = dx1 * dy2 - dx2 * dy1;
        const pg = den ? (sx * dy2 - dx2 * sy) / den : 0, ph = den ? (dx1 * sy - sx * dy1) / den : 0;
        const a = x1 - x0 + pg * x1, b = x2 - x0 + ph * x2, d = y1 - y0 + pg * y1, e = y2 - y0 + ph * y2;
        return 'matrix3d(' + a / ew + ',' + d / ew + ',0,' + pg / ew + ',' + b / eh + ',' + e / eh + ',0,' + ph / eh + ',0,0,1,0,' + x0 + ',' + y0 + ',0,1)';
      };
      // the card is its cell inset by half the gutter along every warped edge, so the gutter warps
      // with the field instead of staying a flat 64 between two bent cards
      const cellMatrix = (q, ew, eh) => {
        const g2 = GAP / 2;
        return matrix(inset(q.tl, q.tr, q.bl, g2), inset(q.tr, q.tl, q.br, g2), inset(q.bl, q.tl, q.br, g2), inset(q.br, q.bl, q.tr, g2), ew, eh);
      };
      const dimAt = (q) => {
        const d = Math.hypot((q.tl.x + q.br.x) / 2 - cursor.cx, (q.tl.y + q.br.y) / 2 - cursor.cy);
        return SHADE * smooth(clamp(0, 1, (d - hole) / (edge - hole)));
      };
      // the photograph drifts toward the cursor inside its frame — it is drawn at 1.1 so the drift
      // never shows an edge
      const drift = (cd, q, ease = 1) => {
        if (!cd.img) return;
        const reach = BULGE_REACH * cellW;
        const px = clamp(-1, 1, (cursor.cx - (q.tl.x + q.br.x) / 2) / reach) * PARALLAX * ease;
        const py = clamp(-1, 1, (cursor.cy - (q.tl.y + q.br.y) / 2) / reach) * PARALLAX * ease;
        cd.img.style.transform = 'translate3d(' + px.toFixed(2) + 'px,' + py.toFixed(2) + 'px,0) scale(1.1)';
      };
      const lerpP = (p, x, y, k) => ({ x: p.x + (x - p.x) * k, y: p.y + (y - p.y) * k });
      const render = (all = false) => {
        const padX = cellW, padY = cellH;
        for (let i = 0; i < cards.length; i++) {
          const cd = cards[i]; const q = quad(cd);
          if (cd === open.cell) {
            // the reference's open: the cell's corners lerp toward the box (grown by half a gutter,
            // which cellMatrix takes back), so at k = 1 the card IS the box, flat and centred
            const k = open.k, b = open.box;
            q.tl = lerpP(q.tl, b.l, b.t, k); q.tr = lerpP(q.tr, b.r, b.t, k);
            q.bl = lerpP(q.bl, b.l, b.b, k); q.br = lerpP(q.br, b.r, b.b, k);
            cd.out = false;
            cd.el.style.width = open.w + 'px'; cd.el.style.height = open.h + 'px';
            cd.el.style.transform = cellMatrix(q, open.w, open.h);
            cd.el.style.setProperty('--dim', (dimAt(q) * (1 - k)).toFixed(4));
            // the reference's slide: the panel leaves once the card is a quarter of the way to the
            // box and is home again at the same point on the way back — one scalar, both surfaces
            const slide = clamp(0, 1, (k - 0.25) / 0.75);
            cd.el.style.setProperty('--slide', slide.toFixed(4));
            // THE CONTENT RIDES THE PANEL. It used to be parked at the panel's final box from the
            // first frame, so for the last stretch of the open and the whole of the close the strip
            // hung past the edge of a panel that was still travelling. Its box is the panel's box
            // now, derived from the same card corner and the same size and the same slide, every
            // frame — the two cannot come apart, because there is only one box.
            if (open.panel) {
              // the card's corner is the cell's corner plus half the gutter cellMatrix takes back
              // the panel's INNER box: the panel is the card's border box, slid by its width less
              // one pixel (renderVals panelStyle), and the content sits inside its hairlines
              const px = q.tl.x + mid.x + GAP / 2 + 1 + (open.portrait ? 0 : (open.w - 1) * slide);
              const py = q.tl.y + mid.y + GAP / 2 + 1 + (open.portrait ? (open.h - 1) * slide : 0);
              open.panel.style.left = px.toFixed(2) + 'px'; open.panel.style.top = py.toFixed(2) + 'px';
              open.panel.style.width = (open.w - 2).toFixed(2) + 'px'; open.panel.style.height = (open.h - 2).toFixed(2) + 'px';
            }
            drift(cd, q, 1 - k);
            continue;
          }
          const visible = Math.max(q.tl.x, q.tr.x, q.bl.x, q.br.x) > -mid.x - padX && Math.min(q.tl.x, q.tr.x, q.bl.x, q.br.x) < mid.x + padX
            && Math.max(q.tl.y, q.tr.y, q.bl.y, q.br.y) > -mid.y - padY && Math.min(q.tl.y, q.tr.y, q.bl.y, q.br.y) < mid.y + padY;
          if (visible || all) cd.out = false; else if (cd.out) continue; else cd.out = true;
          cd.el.style.transform = cellMatrix(q, TW, TH);
          drift(cd, q);
        }
      };
      this._uRender = render;

      // frame-rate independent damping, the reference's — the flat engine's per-frame lerp ran
      // twice as fast on a 120Hz display as on a 60
      const tick = (time, dtMs) => {
        const dt = Math.min((dtMs || 16) / 1000, 1 / 30);
        pos.x = damp(pos.x, pos.tx, PAN_EASE, dt); pos.y = damp(pos.y, pos.ty, PAN_EASE, dt);
        cursor.cx = damp(cursor.cx, cursor.x, CURSOR_EASE, dt); cursor.cy = damp(cursor.cy, cursor.y, CURSOR_EASE, dt);
        const fx = Math.round(mid.x + cursor.cx), fy = Math.round(mid.y + cursor.cy);
        if (fx !== lit.x || fy !== lit.y) { lit.x = fx; lit.y = fy; shade.style.setProperty('--fx', fx + 'px'); shade.style.setProperty('--fy', fy + 'px'); }
        // the lens fades while the field is travelling — a bulge riding a pan reads as a wobble
        const vel = Math.abs(pos.tx - pos.x) + Math.abs(pos.ty - pos.y), calm = 1 / (1 + vel / 40);
        lens.c = damp(lens.c, lens.t * calm, BULGE_EASE, dt);
        const still = Math.abs(pos.tx - pos.x) < 0.1 && Math.abs(pos.ty - pos.y) < 0.1
          && Math.abs(cursor.x - cursor.cx) < 0.1 && Math.abs(cursor.y - cursor.cy) < 0.1
          && Math.abs(lens.t * calm - lens.c) < 0.001;
        if (open.cell || !still) render();
      };
      this._ticker = tick;
      render(true);   // position every tile ONCE (so the bloom happens in place) — ticker not started yet

      this._uMoved = false;
      // The pan engine (ticker + Observer) starts only AFTER the entrance bloom, so the field
      // assembles calmly, then becomes interactive — no drift or drag mid-assembly.
      const WHEEL = 0.6, DRAG = 1.0, CLAMP = 90;
      const startEngine = () => {
        if (this._engineStarted) return; this._engineStarted = true;
        g.ticker.add(tick);
        this._obs = window.Observer.create({
          target: wrapper, type: 'wheel,touch,pointer', dragMinimum: 3, preventDefault: false, tolerance: 6,
          // A press anywhere but on the panel closes an open card — the reference's rule, and the
          // one that lets the same press carry on as a drag. The pan is held (onChange below) until
          // the card has landed, so a drag begun mid-close lands nothing on a field that was not moving.
          onPress: (self) => { this._uMoved = false; wrapper.setAttribute('data-universe-status', 'dragging'); if (this._uOpenCard) { const t = self.event && self.event.target; if (!(t && t.closest && t.closest('[data-universe-panel]'))) this.closeTile(); } },
          onRelease: () => { wrapper.setAttribute('data-universe-status', 'idle'); clearTimeout(this._uMoveT); this._uMoveT = setTimeout(() => { this._uMoved = false; }, 80); },
          onStop: () => { wrapper.setAttribute('data-universe-status', 'idle'); },
          onChange: (self) => {
            if (this._uOpenCard || this._uClosing) return;   // the field is held while a card is open
            const isWheel = self.event.type === 'wheel'; const sp = isWheel ? WHEEL : DRAG;
            const dx = g.utils.clamp(-CLAMP, CLAMP, self.deltaX * sp), dy = g.utils.clamp(-CLAMP, CLAMP, self.deltaY * sp);
            if (!isWheel && (Math.abs(dx) > 1 || Math.abs(dy) > 1)) this._uMoved = true;
            pos.tx += isWheel ? -dx : dx; pos.ty += isWheel ? -dy : dy;
          },
        });
      };
      this._engineStarted = false;

      // the cursor, for the lens, the torch and the parallax — a fine pointer only; touch has none
      if (this._uMove) window.removeEventListener('pointermove', this._uMove);
      if (this._uLeave && this._uLeaveEl) this._uLeaveEl.removeEventListener('pointerleave', this._uLeave);
      this._uMove = (e) => { if (!fine) return; cursor.x = e.clientX - mid.x; cursor.y = e.clientY - mid.y; lens.t = 1; };
      this._uLeave = () => { lens.t = 0; };
      this._uLeaveEl = wrapper;
      window.addEventListener('pointermove', this._uMove);
      wrapper.addEventListener('pointerleave', this._uLeave);

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
        const dist = cards.map((cd) => { const q = quad(cd); return Math.hypot((q.tl.x + q.br.x) / 2, (q.tl.y + q.br.y) / 2); });
        const maxD = Math.max.apply(null, dist) || 1, SPREAD = 0.5;
        const delays = dist.map((d) => (d / maxD) * SPREAD);
        // bloom-START state (never the tile element itself — the render loop owns its transform)
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
     you can finish reading it. THE RING IS WHAT ANSWERS THE POINTER, and it is enough: an opacity
     change is a state change without a geometry change, which is this app's rule for a control
     under a pointer (see the press tiers in global.css). The lens and the parallax are the FIELD
     answering the pointer, not the control — the reference's own distinction, kept. */
  stackEnter(el) {
    if (!el || el.hasAttribute('data-universe-open')) return; const r = el.querySelector('[data-ring]');
    if (this._reduce || !window.gsap) { if (r) r.style.opacity = '1'; return; }
    if (r) window.gsap.to(r, { opacity: 1, duration: this.DUR.state, ease: this.EASE.standard, overwrite: 'auto' });
  },
  stackLeave(el) {
    if (!el) return; const r = el.querySelector('[data-ring]');
    if (this._reduce || !window.gsap) { if (r) r.style.opacity = '0'; return; }
    if (r) window.gsap.to(r, { opacity: 0, duration: this.DUR.state, ease: this.EASE.exit, overwrite: 'auto' });
  },
  /* ================= THE OPEN CARD =================
     Press a card and it comes to the centre, flattens, grows to its open size and a panel slides
     out from behind it carrying the readout the card used to wear — the reference's lightbox, on
     this app's tokens. The reference drives it from one damped scalar (open.c) inside its render
     loop, with the cell's corners lerped toward the box; that is exactly what happens here, except
     the scalar is tweened rather than damped, so it runs on a token curve and a token duration.

     THE CURVE IS `fold`, NOT `entrance`. Everything else in this file arrives on an expo-out, and
     motion.js says why that is wrong here: the card CHANGES SIZE. A box growing on a front-loaded
     curve snaps open and then creeps, and reads as a jump however long the tween is. fold is the
     in-out the travelling selection marker runs on — a disclosure and a moving selection share one
     motion character, which is the token's whole argument. The panel's contents arrive on entrance
     a beat behind, because they are text landing, not a box changing shape.

     THE PAIR NEVER LEAVES THE SCREEN. The open size is the reference's own arithmetic: 0.7 of the
     short side, capped so card + gap + panel stay inside 0.9 of the long side; portrait puts the
     panel underneath at 0.8 of the width. What that cannot promise is that the readout fits the box
     on a small screen, so the panel's body scrolls inside it (UniversePanel) — the content yields,
     the layout never does.

     The element's width and height are tweened alongside k, and the render divides its matrix by
     the LIVE size: the tile is not square (image over caption), so a pure quad lerp on a 300×344
     element would have stretched the caption's type with the box. The caption fades instead, and
     the hero's foot drops to the bottom edge, so what grows is the photograph.

     The close is written out, not reverse(): fold is symmetric so the box's own travel would
     survive a reverse, but the contents' expo-out would come back as an expo-in and spend most of
     the exit invisible (the closeUniverse note, same lesson). Contents leave first and fast, then
     the pair folds back, then the caption returns. The render loop keeps running throughout — the
     torch and the lens still follow the cursor around an open card, as they do in the reference —
     and only the PAN is held (Observer's onChange). */
  openTile(p, el) {
    // The reduced-motion grid shows everything at rest, so there is nothing to disclose: its press
    // is still the door to the fullscreen detail. Likewise if the engine is not up.
    if (this._reduce || !window.gsap || !this._uCards || !this._uView) { this.openOverlay(p, el); return; }
    if (this._uMoved) { this._uMoved = false; return; }
    if (this._ovOpen || this._uOpenCard || this._uClosing) return;
    if (this._uBloomTl && this._uBloomTl.isActive()) return;   // the field is still assembling — it becomes interactive at the bloom's end
    if (!this._engineStarted) return;
    const cd = this._uCards.find((c) => c.el === el); if (!cd) return;
    const g = window.gsap, wrapper = document.querySelector('[data-universe-status]'), panel = document.querySelector('[data-universe-panel]');
    if (!wrapper || !panel) return;
    const V = this._uView, TW = UNIVERSE_TILE.W, TH = UNIVERSE_TILE.H, CAP = UNIVERSE_TILE.CAP, GP = UNIVERSE_OPEN.gap;
    const vw = wrapper.clientWidth, vh = wrapper.clientHeight, portrait = vh > vw;
    const share = portrait ? UNIVERSE_OPEN.sharePortrait : UNIVERSE_OPEN.share;
    const B = Math.round(Math.min(Math.min(vw, vh) * share, (Math.max(vw, vh) * UNIVERSE_OPEN.pairMax - GP) / 2));
    const cx = vw / 2, cy = vh / 2;
    const cardX = Math.round(portrait ? cx - B / 2 : cx - B - GP / 2), cardY = Math.round(portrait ? cy - B - GP / 2 : cy - B / 2);
    const isOrig = el.getAttribute('tabindex') !== '-1' && !el.hasAttribute('aria-hidden');
    const hero = el.querySelector('[data-tile-hero]'), cap = el.querySelector('[data-tile-caption]'), ring = el.querySelector('[data-ring]');
    this._uOpenCard = { el, cd, p, isOrig, from: document.activeElement, portrait, B };
    // the render's view of the open card: the box as cell corners about the stage centre, grown by
    // half a gutter because cellMatrix takes half a gutter back
    const open = this._uOpenK;
    open.cell = cd; open.k = 0; open.w = TW; open.h = TH; open.panel = panel; open.portrait = portrait;
    open.box = { l: cardX - V.mid.x - V.GAP / 2, t: cardY - V.mid.y - V.GAP / 2, r: cardX + B - V.mid.x + V.GAP / 2, b: cardY + B - V.mid.y + V.GAP / 2 };
    el.setAttribute('data-universe-open', portrait ? 'portrait' : 'landscape'); el.style.zIndex = '4';
    el.style.setProperty('--sx', portrait ? '0' : '1'); el.style.setProperty('--sy', portrait ? '1' : '0');
    if (this._uRender) this._uRender();   // the card's own dim is written before it lifts above the shade — no pop
    if (ring) g.set(ring, { opacity: 0 });
    this.setState({ uOpen: p.id, announce: 'Opened ' + p.name + '. Press Escape to close.' }, () => {
      if (!this._uOpenCard || this._uOpenCard.el !== el) return;   // reset landed in between (a rebuild)
      // The content's box is the engine's, set every frame from the card's own corner (render);
      // here only what does not move. It is transparent — the panel under it draws the surface.
      g.set(panel, { x: 0, y: 0, opacity: 1 });
      const parts = [...panel.querySelectorAll('[data-upanel-part]')];
      g.set(parts, { opacity: 0, y: 6 });
      panel.style.pointerEvents = 'auto';
      // focus lands at once, never at the end of the motion — the overlay's rule, for the same
      // reason: a keyboard reader is not made to wait for a tween to know where they are
      const cb = panel.querySelector('[data-upanel-close]'); if (cb) try { cb.focus({ preventScroll: true }); } catch (e) { }
      // THE VIEW'S OWN CLOSE MARK GOES AWAY while a card is open. Leaving the field from here would
      // tear the engine down under a card that is mid-open — an exit nothing can play — so the
      // corner control is faded and taken out of the tab order until the card is home again;
      // Escape and the panel's own mark are the ways back. Visibility, not display, so it fades.
      this._uViewClose(false);
      if (this._uOpenTl) { try { this._uOpenTl.kill(); } catch (e) { } }
      const tl = this._uOpenTl = g.timeline({ defaults: { ease: this.EASE.fold, duration: this.DUR.fold } });
      tl.to(open, { k: 1, w: B, h: B }, 0);
      if (hero) tl.to(hero, { bottom: 0 }, 0);
      if (cap) tl.to(cap, { opacity: 0, duration: this.DUR.state, ease: this.EASE.exit }, 0);
      // the contents land once the panel is all but out (fold is past 0.95 by three quarters of
      // its time) — the reference delays its lightbox for the same reason
      tl.to(parts, { opacity: 1, y: 0, duration: this.DUR.swap, ease: this.EASE.entrance, stagger: this.DUR.stagger }, this.DUR.fold * 0.75);
    });
  },
  closeTile(done) {
    const o = this._uOpenCard;
    if (!o || this._uClosing) { if (done) done(); return; }
    const g = window.gsap, panel = document.querySelector('[data-universe-panel]');
    if (!g || !panel) { this._resetOpenTile(); if (done) done(); return; }
    this._uClosing = true;
    // the detail overlay freezes the loop while it is up; the close needs the loop to fold the card back
    if (this._frozen && this._ticker) { g.ticker.add(this._ticker); this._frozen = false; }
    const el = o.el, TW = UNIVERSE_TILE.W, TH = UNIVERSE_TILE.H, CAP = UNIVERSE_TILE.CAP, open = this._uOpenK;
    const hero = el.querySelector('[data-tile-hero]'), cap = el.querySelector('[data-tile-caption]');
    const parts = [...panel.querySelectorAll('[data-upanel-part]')];
    panel.style.pointerEvents = 'none';
    // Focus goes back to the card, decided NOW while the element is still what it was. A clone
    // cannot take focus (it is hidden from AT and tabindex -1), but the palette it copies has one
    // real tile in the field, and that is the same card as far as the reader is concerned. The
    // field's own close mark is the floor under that — the reader stays in the view they were in.
    const orig = (() => { if (o.isOrig) return el; const ow = document.querySelector('[data-grid-originals]'); const i = this.scopedFeed(this.state.feed).indexOf(o.p); return (ow && i >= 0 && ow.children[i]) || null; })();
    const back = orig || (this.universeCloseRef && this.universeCloseRef.current) || null;
    const finish = () => {
      if (this._uOpenCard !== o) return;   // a reset got here first
      open.cell = null; open.k = 0; open.w = TW; open.h = TH; open.box = null; open.panel = null;
      el.removeAttribute('data-universe-open'); el.style.zIndex = o.isOrig ? '1' : ''; el.style.width = TW + 'px'; el.style.height = TH + 'px';
      el.style.setProperty('--dim', '0'); el.style.setProperty('--slide', '0');
      if (this._uRender) this._uRender();   // back under the shade at its rest transform, this frame
      g.set(panel, { opacity: 0, x: 0, y: 0 });
      this._uOpenTl = null; this._uOpenCard = null; this._uClosing = false;
      this._uViewClose(true);
      // Focus moves BEFORE the state flips: the flip re-renders the panel aria-hidden, and a panel
      // hidden from assistive technology while its close mark still holds focus is a fault the
      // browser reports (and blocks). The reader is on the tile by the time the panel is gone.
      if (back && back.isConnected && back.focus) try { back.focus({ preventScroll: true }); } catch (e) { }
      this.setState({ uOpen: null, announce: 'Closed ' + o.p.name + '.' }, () => { if (done) done(); });
    };
    /* THE CLOSE IS ONE MOTION, AS THE REFERENCE PLAYS IT. Its one scalar retracts the panel over
       the first three quarters of its travel and lands the card over the whole of it — the panel is
       INSIDE the card (data-tile-panel), so it moves, bends and shrinks with the card and is hidden
       by the picture the moment it is home; nothing fades and nothing is left behind. Only the
       contents go, first and fast, because they are a separate layer and the panel is sliding out
       from under them. The scalar runs on fold; --slide is derived from it in render(). */
    if (this._uOpenTl) { try { this._uOpenTl.kill(); } catch (e) { } }
    const AT = 0.06;   // the card lets go a beat after the contents have started to go
    const tl = this._uOpenTl = g.timeline({ defaults: { ease: this.EASE.fold }, onComplete: this._exitFloor ? this._exitFloor('ut', AT + this.DUR.fold + 0.4, finish) : finish });
    tl.to(parts, { opacity: 0, y: 4, duration: this.DUR.fast, ease: this.EASE.exit, stagger: 0.02 }, 0);
    tl.to(open, { k: 0, w: TW, h: TH, duration: this.DUR.fold }, AT);
    if (hero) tl.to(hero, { bottom: CAP, duration: this.DUR.fold }, AT);
    if (cap) tl.to(cap, { opacity: 1, duration: this.DUR.state, ease: this.EASE.entrance }, AT + this.DUR.fold * 0.55);
  },
  // The instant path: a rebuild, a resize, a teardown. Puts every style the open wrote back to its
  // rest value in one frame, releases the hold, and drops the panel's content.
  _resetOpenTile() {
    const g = window.gsap, o = this._uOpenCard, open = this._uOpenK;
    if (this._uOpenTl) { try { this._uOpenTl.kill(); } catch (e) { } this._uOpenTl = null; }
    const panel = document.querySelector('[data-universe-panel]');
    if (panel) { if (g) g.set(panel, { opacity: 0, x: 0, y: 0 }); panel.style.pointerEvents = 'none'; }
    if (open) { open.cell = null; open.k = 0; open.w = UNIVERSE_TILE.W; open.h = UNIVERSE_TILE.H; open.box = null; open.panel = null; }
    if (o && g) {
      const el = o.el; el.removeAttribute('data-universe-open'); el.style.zIndex = o.isOrig ? '1' : '';
      el.style.width = UNIVERSE_TILE.W + 'px'; el.style.height = UNIVERSE_TILE.H + 'px'; el.style.setProperty('--dim', '0'); el.style.setProperty('--slide', '0');
      const hero = el.querySelector('[data-tile-hero]'), cap = el.querySelector('[data-tile-caption]');
      if (hero) g.set(hero, { bottom: UNIVERSE_TILE.CAP });
      if (cap) g.set(cap, { opacity: 1 });
    }
    this._uOpenCard = null; this._uClosing = false; this._frozen = false;
    this._uViewClose(true, true);
    if (this.state.uOpen != null) this.setState({ uOpen: null });
  },
  // The corner close mark, shown or put away. Hidden = faded on the exit curve, then visibility
  // hidden so it leaves the tab order and the accessibility tree; shown = visible first, then
  // faded in on the entrance curve. `instant` is the reset path.
  _uViewClose(show, instant = false) {
    const g = window.gsap, btn = this.universeCloseRef && this.universeCloseRef.current;
    if (!btn) return;
    if (this._uViewCloseTw) { try { this._uViewCloseTw.kill(); } catch (e) { } this._uViewCloseTw = null; }
    if (instant || this._reduce || !g) { btn.style.opacity = show ? '' : '0'; btn.style.visibility = show ? '' : 'hidden'; return; }
    if (show) { btn.style.visibility = ''; this._uViewCloseTw = g.to(btn, { opacity: 1, duration: this.DUR.state, ease: this.EASE.entrance }); }
    else this._uViewCloseTw = g.to(btn, { opacity: 0, duration: this.DUR.state, ease: this.EASE.exit, onComplete: () => { btn.style.visibility = 'hidden'; } });
  },
  // bring a focused original tile into view (keyboard) by panning the field toward centre
  // — called only when the last input was keyboard (_kbdInput); pointer focus never moves the camera
  centerOnTile(el) {
    // not while the field is held: a queued pan would jump on release
    if (!this._uPos || !this._uField || this._uOpenCard || this._uClosing) return;
    const cd = this._uOrigCards && this._uOrigCards.get(el); if (!cd) return;
    const f = this._uField; this._uPos.tx = f.vw * 0.5 - f.TW * 0.5 - cd.baseX; this._uPos.ty = f.vh * 0.5 - f.TH * 0.5 - cd.baseY;
    // The torch comes with it. The tile is being brought to the centre for a reader who has no
    // pointer, and a pointer is the only thing the torch follows — so a focused tile could land
    // under 70% of shade with a ring at 1.9:1, wherever the mouse happened to be parked. The hole
    // moves to the centre the tile is arriving at; the lens stays down, since nothing is hovering.
    if (this._uView) { this._uView.cursor.x = 0; this._uView.cursor.y = 0; this._uView.lens.t = 0; }
  },
};
