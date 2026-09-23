// The fullscreen palette universe: an overscanning, infinitely-wrapping field — Jesper Landberg's
// no-WebGL grid as Osmo Supply ships it (the Infinite Dome Grid), where everything you see is one
// matrix3d per card: the field domes away from the centre, swells under the cursor, a torch follows
// the pointer through a shade, and each photograph drifts toward it. Ported to this app's tokens
// with a radial-bloom entrance as ONE reversible timeline, plus the feed-view switcher shared with
// the one fullscreen view left since the 3D reel went. The open card (openTile) is the reference's lightbox on the same loop.
import { UNIVERSE_TILE, UNIVERSE_OPEN } from '../universeTile.js';
import { trackEvent } from '../../lib/track.js';

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
const FLIP_EASE = 0.14;     // the open card's damped close, the reference's flip rate (its table: 0.1–0.14)
const clamp = (min, max, v) => Math.min(Math.max(v, min), max);
const damp = (from, to, rate, dt) => from + (to - from) * (1 - Math.pow(1 - rate, dt * 60));
const smooth = (t) => t * t * (3 - 2 * t);

export const universeMethods = {
  setFeedView(v) {
    // Grid pressed again while the field is still leaving: the exit is cancelled and the field comes
    // back from wherever it has got to — no teardown, no rebuild, no lost click.
    if (v === 'grid' && this.state.gridLeaving) { this._resumeGrid(); return; }
    if (v === this.state.feedView) return;
    if (v === 'grid') { trackEvent('View Opened', { view: 'grid' }); this._enterGrid(); return; }
    /* THE FIELD PLAYS ITS OWN EXIT, AND THE LIST IS ALREADY THERE (18.09.26). The rule is unchanged —
       whatever is on screen plays its own exit, and nothing is torn down while it is being looked at
       — but what the exit uncovers is not built in its completion any more. The list stays laid out
       under the grid (renderVals listRows), so the state moves to the list ON THE PRESS: the toggle's
       pill slides as the field starts to go, focus lands on the page at once, and the field's fade
       is the only thing left running, over the page it is revealing. gridLeaving keeps the layer up
       for it; closeUniverse's completion takes it down. A second press of List is the view it is
       already on; Grid pressed during the fade resumes it (above). */
    this.closeUniverse();
  },
  // The arrival. It assumes no field is on screen, which is what makes it safe to tear down here,
  // before the state flip, rather than after it.
  _enterGrid() {
    this._uCloseGen = (this._uCloseGen || 0) + 1;   // invalidate any pending close completion
    this.killSpatial();
    this._lenisStop();                                   // the universe's Observer owns the wheel
    /* THE LOCK IS ON <html>, NOT <body> (15.09.26). With Lenis stopped the root carries overflow:clip,
       and overflow on the body then stops propagating to the viewport and makes the body a scroll
       container of its own: the floating bar, sticky inside it, came loose and scrolled away with
       the page, so it floated over the grid only when the grid was opened from the top of the page.
       Locked on the root, the viewport is still the bar's scroller and the bar stays where it
       floats, above the field, from wherever the grid is opened. */
    try { document.documentElement.style.overflow = 'hidden'; } catch (e) { }
    this._bloomNext = true;                              // play the radial assembly bloom on this entrance
    this.setState({ feedView: 'grid', gridLeaving: false, announce: 'Spatial grid view. Drag to pan the field. Press a card to open it. Press Escape to return to the list.' }, () => { requestAnimationFrame(() => { const layer = document.querySelector('[data-universe-status]'); if (layer) try { layer.style.visibility = ''; } catch (e) { } this.initSpatial(); const c = this.universeCloseRef.current; if (c) try { c.focus(); } catch (e) { } }); });
  },
  // Focus returns to the toggle that opened the field — the reader stays where they were in the page.
  _focusGridToggle() {
    const t = this.gridRef.current && this.gridRef.current.closest('section');
    const gt = t && [...t.querySelectorAll('button[aria-pressed]')].find((b) => /grid/i.test(b.textContent));
    if (gt) try { gt.focus({ preventScroll: true }); } catch (e) { }
  },
  /* THE EXIT (18.09.26, "it comes off laggy"). Measured in Chrome at 120Hz before this was written:
     the first visible change came ~200ms after the press, the fade then ran at 40-60fps, and the
     list appeared in one frame after it. Three causes, three changes:

     IT STARTS ON THE PRESS. The layer waited a stagger and then faded on EASE.exit, an ease-in, so
     for the first fifth of a second nothing on screen answered and the whole change was spent in
     the last frames. It runs from the first frame now, on EASE.reveal — the out-cubic that stays
     legible for its whole length rather than snapping (motion.js) — over DUR.swap: half gone in a
     tenth of a second, settled by 0.4, still quicker out than the one-second arrival.

     IT HOLDS THE FRAME RATE, BY NOT SCALING. The field used to recede as it went — the plane settling
     back to the 0.985 it arrives from — and any change of the plane's scale re-rasterises every
     card's two blurred copies (a masked blur each, AppView TILE_FADE) on every frame. Measured, each
     variant on a fresh page: the fade alone 120fps, the fade with the recession about half that, and
     back to 120 with either the blur or the mask taken off the copies. No compositing hint saved it
     (will-change on the plane, the layer or the copies). A 1.5% recession under a fade is barely
     seen; the frames it cost were not, so the fade carries the exit alone.

     THE PAGE IS ALREADY UNDERNEATH. The list is laid out under the field (renderVals listRows), so
     the fade uncovers the page it lands on instead of an empty library that fills a frame later.

     The dock (the hint and this close) rides the layer's fade — an opacity of its own would switch
     its glass off mid-exit (glass-is-fill-defined) — and sinks toward the edge it stands on. */
  closeUniverse() {
    const g = window.gsap, layer = document.querySelector('[data-universe-status]');
    const gen = (this._uCloseGen = (this._uCloseGen || 0) + 1);
    this.setState({ feedView: 'list', gridLeaving: true, announce: 'List view.' }, () => { if (gen === this._uCloseGen) this._focusGridToggle(); });
    const finish = () => { if (gen !== this._uCloseGen) return; if (layer) try { layer.style.visibility = 'hidden'; } catch (e) { } this._finishGridLeave(); };   // hide synchronously before ANY teardown can un-hide
    if (this._reduce || !g || !layer) { finish(); return; }
    try { if (this._ticker) g.ticker.remove(this._ticker); } catch (e) { }   // freeze the pan so the field recedes cleanly
    this._uRingOff();
    const dock = layer.querySelector('[data-grid-dock]');
    if (this._uCloseTl) { try { this._uCloseTl.kill(); } catch (e) { } }
    // The timeline and the floor share ONE latched completion — passing `finish` to both would let
    // a slow-but-alive tween land after the floor had already fired, and finish() is not idempotent.
    const land = this._exitFloor('u', this.DUR.swap, finish);
    const tl = this._uCloseTl = g.timeline({ defaults: { duration: this.DUR.swap, ease: this.EASE.reveal }, onComplete: land });
    tl.to(layer, { opacity: 0 }, 0);
    if (dock) tl.to(dock, { y: 8 }, 0);
  },
  // The exit's completion: the field is hidden, so the page takes its scroll back and the field is
  // emptied (killSpatial, from here and from componentDidUpdate's grid->list edge).
  _finishGridLeave() {
    this._uCloseTl = null;
    this._lenisStart();
    try { document.documentElement.style.overflow = ''; } catch (e) { }
    this.setState({ gridLeaving: false }, () => { if (!this.state.gridLeaving && this.state.feedView === 'list') this.killSpatial(); });
  },
  // Grid pressed while the field is leaving: back from wherever the exit has got to, on the entrance
  // curve. The page was never handed back (_finishGridLeave had not run), so there is nothing to
  // lock again; the pan resumes where it froze.
  _resumeGrid() {
    this._uCloseGen = (this._uCloseGen || 0) + 1;   // the pending exit's completion is void
    clearTimeout(this._exitFloorT_u); this._exitFloorT_u = null;
    if (this._uCloseTl) { try { this._uCloseTl.kill(); } catch (e) { } this._uCloseTl = null; }
    const g = window.gsap, layer = document.querySelector('[data-universe-status]');
    const dock = layer && layer.querySelector('[data-grid-dock]');
    this.setState({ feedView: 'grid', gridLeaving: false, announce: 'Spatial grid view.' }, () => { const c = this.universeCloseRef.current; if (c) try { c.focus({ preventScroll: true }); } catch (e) { } });
    if (!g) return;
    const back = { duration: this.DUR.state, ease: this.EASE.entrance, overwrite: 'auto' };
    if (layer) { try { layer.style.visibility = ''; } catch (e) { } g.to(layer, Object.assign({ opacity: 1 }, back)); }
    if (dock) g.to(dock, Object.assign({ y: 0 }, back));
    try { if (this._ticker) { g.ticker.remove(this._ticker); g.ticker.add(this._ticker); } } catch (e) { }
  },
  /* THE SAFETY NET (18.09.26). Anything that takes the whole screen away from the tool while the
     field is up — a route change, Back and Forward included, or the start screen — takes the field
     down with it, instantly, under its own cover: no exit of the field's own, because the cover is
     already playing one. Before this, Back from the grid reached /about with the root still locked
     and Lenis still stopped (the page would not scroll), the pan engine still ticking over a field
     that had left the DOM, and Forward brought back a grid with no clones in it. Returns the state
     the caller commits alongside its own. */
  _gridOff() {
    this._uCloseGen = (this._uCloseGen || 0) + 1;
    clearTimeout(this._exitFloorT_u); this._exitFloorT_u = null;
    this.killSpatial();
    this._lenisStart();
    try { document.documentElement.style.overflow = ''; } catch (e) { }
    return { feedView: 'list', gridLeaving: false };
  },
  killSpatial() {
    this._spatialLive = false;
    this._uRingEl = null;
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
        if (e.key === ' ' && !(tag === 'BUTTON' || tag === 'A')) { e.preventDefault(); this._uHandPan(); this._uPos.ty -= this._uView.mid.y * 1.6 * (e.shiftKey ? -1 : 1); return; }
        if (!e.key.startsWith('Arrow')) return;
        e.preventDefault();
        this._uHandPan();
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
      // `panning`: a hand (drag, wheel, keys) is moving the field — the ring stands down (stackEnter)
      const view = this._uView = { mid, cursor, lens, fine, pos, cellW, cellH, GAP, TW, TH, panning: false };

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
            // now, derived from the same card corner and the same drawn size and the same slide,
            // every frame — the two cannot come apart, because there is only one box.
            if (open.panel) {
              // the card's corner is the cell's corner plus half the gutter cellMatrix takes back
              // the panel's WHOLE box: the panel is the card's box, slid by its width less one pixel
              // (renderVals panelStyle). The content covers the panel's hairlines rather than sitting
              // inside them (17.09.26): the card has no stroke, so the strip at the head has to start
              // on the photograph's top edge, and it is clipped to the panel's outer corners
              // (global.css [data-upanel-side]) so a square strip cannot cover a round corner.
              // THE CARD AS DRAWN, NOT AS SIZED (22.09.26). The box was the element's width and height,
              // which are the drawn card's only at rest and open: in flight the quad is still easing out
              // of its grid slot, so the words rode a box up to 60px off the panel they sit on. That hid
              // while the old close faded the words before anything moved, and showed once the damped one
              // moved at once. The drawn card is the quad less the half gutter cellMatrix takes back.
              const L = (q.tl.x + q.bl.x) / 2 + mid.x + GAP / 2, T = (q.tl.y + q.tr.y) / 2 + mid.y + GAP / 2;
              const W = (q.tr.x + q.br.x) / 2 - (q.tl.x + q.bl.x) / 2 - GAP, H = (q.bl.y + q.br.y) / 2 - (q.tl.y + q.tr.y) / 2 - GAP;
              const px = L + (open.portrait ? 0 : (W - 1) * slide);
              const py = T + (open.portrait ? (H - 1) * slide : 0);
              open.panel.style.left = px.toFixed(2) + 'px'; open.panel.style.top = py.toFixed(2) + 'px';
              open.panel.style.width = W.toFixed(2) + 'px'; open.panel.style.height = H.toFixed(2) + 'px';
              // CLOSING, THE WORDS GO BEHIND THE PHOTOGRAPH WITH THEIR PANEL (22.09.26). This layer sits
              // above the card, so a panel sliding home carried its words across the picture while they
              // faded: with the damped close the slide starts at once, and at 80ms the metrics were
              // half-drawn over the face. It is clipped at the photograph's edge instead, the way the
              // reference clips its text box at the image edge, so what slides under the picture is hidden
              // by it. Only on the way home: open, the layer overlaps the photograph by its one pixel.
              if (open.home) {
                const under = ((open.portrait ? H : W) - 1) * (1 - slide);
                open.panel.style.clipPath = under > 0.5 ? (open.portrait ? 'inset(' + under.toFixed(1) + 'px 0 0 0)' : 'inset(0 0 0 ' + under.toFixed(1) + 'px)') : '';
              }
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
        // A hand pan has settled: the ring comes back on whatever card the pointer is resting over.
        if (view.panning && vel < 0.5 && wrapper.getAttribute('data-universe-status') !== 'dragging') { view.panning = false; this._uRingAtPointer(); }
        /* THE CLOSE IS THE REFERENCE'S DAMPED FLIP (22.09.26, closeTile). k eases home on the
           reference's own rate, frame-rate independent like the pan, so the card moves on the first
           frame and settles without a snap; its live size, --slide and --dim are remaps of k as
           before (render), and so are the caption and the photograph's blurred copies, which come
           back over the last stretch of the landing. Under 0.002 the card is less than a pixel from
           its rest size, and it lands. */
        if (open.home && open.cell) {
          open.k = damp(open.k, 0, FLIP_EASE, dt);
          const k = open.k < 0.002 ? 0 : open.k;
          open.k = k; open.w = TW + (open.B - TW) * k; open.h = TH + (open.B - TH) * k;
          const back = smooth(clamp(0, 1, 1 - k / 0.3)).toFixed(3);
          if (open.cap) open.cap.style.opacity = back;
          if (open.fades) for (let i = 0; i < open.fades.length; i++) open.fades[i].style.opacity = back;
          if (k === 0) { const land = open.home; open.home = null; land(); }
        }
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
            this._uHandPan();
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
      const dock = wrapper.querySelector('[data-grid-dock]');
      const layer = document.querySelector('[data-universe-status]');
      if (layer) try { layer.style.visibility = ''; } catch (e) { }   // clear any close-finish visibility guard
      if (this._uBloomTl) { try { this._uBloomTl.kill(); } catch (e) { } this._uBloomTl = null; }
      if (!bloom) {
        if (layer && g) g.set(layer, { opacity: 1 });
        g.set(inners, { opacity: 1, y: 0, clearProps: 'transform' });
        g.set(plane, { clearProps: 'transform' });
        if (dock) { g.set(dock, { '--dock-glass': 1, '--dock-ink': 1, y: 0 }); dock.style.visibility = ''; dock.removeAttribute('data-glass-anim'); }
        startEngine();
      } else {
        /* THE CARDS APPEAR, THEY DO NOT ASSEMBLE. The bloom used to scale every card from 0.9 and
           the whole plane from 0.96 while the layer faded, on a half-second radial spread — a field
           rushing together out of the centre, which was the most emphatic arrival in the product on
           the surface that is only a way of looking at the same list. Toned down by request: no
           scale on the cards at all, a rise of the site's own cascade size (the 12px the about
           page's sets take, less the fraction the parallax already gives), the plane barely
           breathing (0.985), and the radial order kept but tightened, so the field is read as
           already there and coming into view rather than as arriving from somewhere. The
           entrance ease, and a length of its own: ARRIVE, one second by request (up from the
           0.62 reveal token), because a field of thirty cards fading up is one large surface
           arriving, not a line of type — the closest sibling is the overlay arrival at 0.8, and
           this is a screen, not a panel. The radial spread scales with it so the order still
           reads. The exit (closeUniverse) takes 0.4s: quicker out than in, as ever. */
        const ARRIVE = 1;
        const dist = cards.map((cd) => { const q = quad(cd); return Math.hypot((q.tl.x + q.br.x) / 2, (q.tl.y + q.br.y) / 2); });
        const maxD = Math.max.apply(null, dist) || 1, SPREAD = ARRIVE * 0.5;
        const delays = dist.map((d) => (d / maxD) * SPREAD);
        // start state (never the tile element itself — the render loop owns its transform)
        if (layer) g.set(layer, { opacity: 0 });
        g.set(plane, { scale: 0.985, transformOrigin: 'center center' });
        g.set(inners, { opacity: 0, y: 10 });
        // The dock rises into place from the edge it stands on, its pane and its ink coming up with it
        // (never an opacity: see global.css [data-grid-dock])
        if (dock) { dock.style.visibility = ''; dock.setAttribute('data-glass-anim', ''); g.set(dock, { '--dock-glass': 0, '--dock-ink': 0, y: 8 }); }
        // The arrival only. The exit is written by hand in closeUniverse — a reversed expo-out is
        // an expo-in that holds still for half its length — so this timeline is never reversed.
        const tl = g.timeline({ onComplete: startEngine });
        if (layer) tl.to(layer, { opacity: 1, duration: ARRIVE * 0.5, ease: this.EASE.entrance }, 0);
        tl.to(plane, { scale: 1, duration: ARRIVE, ease: this.EASE.entrance, transformOrigin: 'center center' }, 0);
        tl.to(inners, { opacity: 1, y: 0, duration: ARRIVE, ease: this.EASE.entrance, stagger: (i) => delays[i] }, 0);
        if (dock) tl.to(dock, { '--dock-glass': 1, '--dock-ink': 1, y: 0, duration: this.DUR.swap, ease: this.EASE.entrance, onComplete: () => dock.removeAttribute('data-glass-anim') }, ARRIVE * 0.45);
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
  /* THE RING ANSWERS A POINTER, NOT A PASSING FIELD (18.09.26, "images are glitchy when dragging
     and scrolling"). A drag carries the pointer across card after card, and a wheel slides cards
     under a pointer that never moved, and every one of them took the hover: measured over a drag and
     a wheel burst, a ring was lit on 663 of 701 frames, two at once at times — a dark hairline
     flickering round the photographs as they went by. While a hand is moving the field (_uHandPan:
     a drag, the wheel, the arrow keys) the ring stands down, and the one that was lit goes out; when
     the pan settles, the card the pointer is resting on takes it (tick -> _uRingAtPointer). Keyboard
     focus is not a hand pan, so a focused tile keeps its ring while centerOnTile brings it in. One
     ring at a time: a new one puts out the last. */
  stackEnter(el) {
    if (!el || el.hasAttribute('data-universe-open')) return;
    if (this._uView && this._uView.panning) return;
    const r = el.querySelector('[data-ring]');
    if (this._uRingEl && this._uRingEl !== el) this.stackLeave(this._uRingEl);
    this._uRingEl = el;
    if (this._reduce || !window.gsap) { if (r) r.style.opacity = '1'; return; }
    if (r) window.gsap.to(r, { opacity: 1, duration: this.DUR.state, ease: this.EASE.standard, overwrite: 'auto' });
  },
  stackLeave(el) {
    if (!el) return; const r = el.querySelector('[data-ring]');
    if (this._uRingEl === el) this._uRingEl = null;
    if (this._reduce || !window.gsap) { if (r) r.style.opacity = '0'; return; }
    if (r) window.gsap.to(r, { opacity: 0, duration: this.DUR.state, ease: this.EASE.exit, overwrite: 'auto' });
  },
  // A hand has started moving the field: the ring stands down until the pan settles.
  _uHandPan() {
    if (this._uView) this._uView.panning = true;
    this._uRingOff();
  },
  _uRingOff() { if (this._uRingEl) this.stackLeave(this._uRingEl); },
  // The pan has settled: whatever card the pointer rests on answers it, as if it had just arrived there.
  _uRingAtPointer() {
    const V = this._uView;
    if (!V || !V.fine || !V.lens.t || this._uOpenCard || this._uClosing) return;
    const hit = document.elementFromPoint(V.cursor.x + V.mid.x, V.cursor.y + V.mid.y);
    const card = hit && hit.closest && hit.closest('[data-plane] [data-feed]');
    if (card) this.stackEnter(card);
  },
  /* ================= THE OPEN CARD =================
     Press a card and it comes to the centre, flattens, grows to its open size and a panel slides
     out from behind it carrying the readout the card used to wear — the reference's lightbox, on
     this app's tokens. The reference drives it from one damped scalar (open.c) inside its render
     loop, with the cell's corners lerped toward the box; that is exactly what happens here, except
     the scalar is tweened rather than damped on the way OUT, so it runs on a token curve and a token
     duration. On the way back it is damped, as the reference's is (closeTile, 22.09.26).

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
     the exit invisible (the closeUniverse note, same lesson). Contents leave first and fast while
     the pair eases back on the reference's damping, and the caption returns as it lands. The render loop keeps running throughout — the
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
    const V = this._uView, TW = UNIVERSE_TILE.W, TH = UNIVERSE_TILE.H, GP = UNIVERSE_OPEN.gap;
    const vw = wrapper.clientWidth, vh = wrapper.clientHeight, portrait = vh > vw;
    const share = portrait ? UNIVERSE_OPEN.sharePortrait : UNIVERSE_OPEN.share;
    const B = Math.round(Math.min(Math.min(vw, vh) * share, (Math.max(vw, vh) * UNIVERSE_OPEN.pairMax - GP) / 2));
    const cx = vw / 2, cy = vh / 2;
    const cardX = Math.round(portrait ? cx - B / 2 : cx - B - GP / 2), cardY = Math.round(portrait ? cy - B - GP / 2 : cy - B / 2);
    const isOrig = el.getAttribute('tabindex') !== '-1' && !el.hasAttribute('aria-hidden');
    const cap = el.querySelector('[data-tile-caption]'), ring = el.querySelector('[data-ring]');
    const fades = [...el.querySelectorAll('[data-tile-fade]')];
    this._uOpenCard = { el, cd, p, isOrig, from: document.activeElement, portrait, B };
    // the render's view of the open card: the box as cell corners about the stage centre, grown by
    // half a gutter because cellMatrix takes half a gutter back
    const open = this._uOpenK;
    open.cell = cd; open.k = 0; open.w = TW; open.h = TH; open.B = B; open.panel = panel; open.portrait = portrait; open.home = null;
    open.box = { l: cardX - V.mid.x - V.GAP / 2, t: cardY - V.mid.y - V.GAP / 2, r: cardX + B - V.mid.x + V.GAP / 2, b: cardY + B - V.mid.y + V.GAP / 2 };
    el.setAttribute('data-universe-open', portrait ? 'portrait' : 'landscape'); el.style.zIndex = '4';
    panel.setAttribute('data-upanel-side', portrait ? 'portrait' : 'landscape');
    el.style.setProperty('--sx', portrait ? '0' : '1'); el.style.setProperty('--sy', portrait ? '1' : '0');
    if (this._uRender) this._uRender();   // the card's own dim is written before it lifts above the shade — no pop
    if (ring) g.set(ring, { opacity: 0 });
    this.setState({ uOpen: p.id, announce: 'Opened ' + p.name + '. Press Escape to close.' }, () => {
      if (!this._uOpenCard || this._uOpenCard.el !== el) return;   // reset landed in between (a rebuild)
      // The content's box is the engine's, set every frame from the card's own corner (render);
      // here only what does not move. It is transparent — the panel under it draws the surface.
      g.set(panel, { x: 0, y: 0, opacity: 1 });
      /* THE STRIP ARRIVES AS THE RESULT STAGE'S BANDS DO. It faded and rose with the other parts
         for a while; by request it now takes the app's one arrival for colour — each band wiped up
         from its foot, staggered left to right, on the reveal duration and the entrance ease
         (motion.js animateBands, the detail overlay's bands) — so a palette opens the same way from
         the list, the field and the detail. The strip's box is shown at once; only its bands are
         withheld, so nothing fades under a wipe. */
      const parts = [...panel.querySelectorAll('[data-upanel-part]:not([data-strip])')];
      const strip = panel.querySelector('[data-strip]');
      const bands = strip ? [...strip.children] : [];
      g.set(parts, { opacity: 0, y: 6 });
      if (strip) g.set(strip, { opacity: 1, y: 0 });
      if (bands.length) g.set(bands, { clipPath: 'inset(100% 0 0 0)' });
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
      // The photograph already fills the card (17.09.26); the caption and its blur and tint go.
      if (cap) tl.to(cap, { opacity: 0, duration: this.DUR.state, ease: this.EASE.exit }, 0);
      if (fades.length) tl.to(fades, { opacity: 0, duration: this.DUR.state, ease: this.EASE.exit }, 0);
      // the contents land once the panel is all but out (fold is past 0.95 by three quarters of
      // its time) — the reference delays its lightbox for the same reason
      const AT_IN = this.DUR.fold * 0.75;
      if (bands.length) tl.to(bands, { clipPath: 'inset(0% 0 0 0)', duration: this.DUR.reveal, ease: this.EASE.entrance, stagger: this.DUR.stagger, clearProps: 'clipPath' }, AT_IN);
      tl.to(parts, { opacity: 1, y: 0, duration: this.DUR.swap, ease: this.EASE.entrance, stagger: this.DUR.stagger }, AT_IN + this.DUR.stagger * 2);
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
    const el = o.el, TW = UNIVERSE_TILE.W, TH = UNIVERSE_TILE.H, open = this._uOpenK;
    const cap = el.querySelector('[data-tile-caption]');
    const fades = [...el.querySelectorAll('[data-tile-fade]')];
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
      open.cell = null; open.k = 0; open.w = TW; open.h = TH; open.box = null; open.panel = null; open.home = null; open.cap = null; open.fades = null;
      el.removeAttribute('data-universe-open'); el.style.zIndex = o.isOrig ? '1' : ''; el.style.width = TW + 'px'; el.style.height = TH + 'px';
      el.style.setProperty('--dim', '0'); el.style.setProperty('--slide', '0');
      // whole again, whichever way it landed (the tick's last frame, or the floor on a stalled loop)
      g.set([cap].concat(fades).filter(Boolean), { opacity: 1 });
      if (this._uRender) this._uRender();   // back under the shade at its rest transform, this frame
      g.set(panel, { opacity: 0, x: 0, y: 0 }); panel.style.clipPath = '';
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
       from under them. --slide is derived from the scalar in render().
       AND THE SCALAR IS DAMPED NOW, AS THE REFERENCE DAMPS IT (22.09.26, by request: "The close
       animation for the card needs improving as well. it's not as smooth as the original reference").
       It ran on fold after a 60ms beat: measured, nothing moved for the first 125ms, most of the
       travel then went in one 125ms burst, and the card crept home until 600ms. The reference damps
       its flip progress toward the target every frame (no-gl-grid: "flip progress (damped 0→1)",
       rates 0.1–0.14), which moves on the first frame and eases all the way in, so the tick does that
       here on FLIP_EASE and lands the card itself (tick, above). The open keeps its fold tween. */
    if (this._uOpenTl) { try { this._uOpenTl.kill(); } catch (e) { } }
    this._uOpenTl = g.to(parts, { opacity: 0, y: 4, duration: this.DUR.fast, ease: this.EASE.exit, stagger: 0.02 });
    open.cap = cap; open.fades = fades;
    // the tick lands it; the floor lands it anyway if the loop has stalled (a hidden tab)
    open.home = this._exitFloor('ut', 1.4, finish);
  },
  // The instant path: a rebuild, a resize, a teardown. Puts every style the open wrote back to its
  // rest value in one frame, releases the hold, and drops the panel's content.
  _resetOpenTile() {
    const g = window.gsap, o = this._uOpenCard, open = this._uOpenK;
    if (this._uOpenTl) { try { this._uOpenTl.kill(); } catch (e) { } this._uOpenTl = null; }
    const panel = document.querySelector('[data-universe-panel]');
    if (panel) { if (g) g.set(panel, { opacity: 0, x: 0, y: 0 }); panel.style.pointerEvents = 'none'; panel.style.clipPath = ''; }
    if (open) { open.cell = null; open.k = 0; open.w = UNIVERSE_TILE.W; open.h = UNIVERSE_TILE.H; open.box = null; open.panel = null; open.home = null; open.cap = null; open.fades = null; }
    clearTimeout(this._exitFloorT_ut); this._exitFloorT_ut = null;
    if (o && g) {
      const el = o.el; el.removeAttribute('data-universe-open'); el.style.zIndex = o.isOrig ? '1' : '';
      el.style.width = UNIVERSE_TILE.W + 'px'; el.style.height = UNIVERSE_TILE.H + 'px'; el.style.setProperty('--dim', '0'); el.style.setProperty('--slide', '0');
      const cap = el.querySelector('[data-tile-caption]');
      if (cap) g.set(cap, { opacity: 1 });
      g.set(el.querySelectorAll('[data-tile-fade]'), { opacity: 1 });
    }
    this._uOpenCard = null; this._uClosing = false; this._frozen = false;
    this._uViewClose(true, true);
    if (this.state.uOpen != null) this.setState({ uOpen: null });
  },
  // The dock — the hint and the close — put away while a card is open, and back when it is home.
  // Hidden = the pane and its ink go out on the exit curve as it sinks, then visibility hidden so the
  // close leaves the tab order and the accessibility tree; shown = visible first, then back up on the
  // entrance curve. Never an opacity on the pair: see global.css [data-grid-dock]. `instant` is the
  // reset path. The hint goes with the close because a held field has nothing to drag.
  _uViewClose(show, instant = false) {
    const g = window.gsap, btn = this.universeCloseRef && this.universeCloseRef.current;
    const dock = btn && btn.closest('[data-grid-dock]');
    if (!dock) return;
    if (this._uViewCloseTw) { try { this._uViewCloseTw.kill(); } catch (e) { } this._uViewCloseTw = null; }
    const cur = (n) => { const v = parseFloat(getComputedStyle(dock).getPropertyValue(n)); return isNaN(v) ? 1 : v; };
    const done = () => { dock.removeAttribute('data-glass-anim'); this._uViewCloseTw = null; };
    if (instant || this._reduce || !g) {
      dock.removeAttribute('data-glass-anim');
      if (g) g.set(dock, { '--dock-glass': show ? 1 : 0, '--dock-ink': show ? 1 : 0, y: show ? 0 : 8 });
      else { dock.style.setProperty('--dock-glass', show ? '1' : '0'); dock.style.setProperty('--dock-ink', show ? '1' : '0'); }
      dock.style.visibility = show ? '' : 'hidden';
      return;
    }
    const from = { '--dock-glass': cur('--dock-glass'), '--dock-ink': cur('--dock-ink') };
    dock.setAttribute('data-glass-anim', '');
    if (show) { dock.style.visibility = ''; this._uViewCloseTw = g.fromTo(dock, from, { '--dock-glass': 1, '--dock-ink': 1, y: 0, duration: this.DUR.state, ease: this.EASE.entrance, onComplete: done }); }
    else this._uViewCloseTw = g.fromTo(dock, from, { '--dock-glass': 0, '--dock-ink': 0, y: 8, duration: this.DUR.state, ease: this.EASE.exit, onComplete: () => { dock.style.visibility = 'hidden'; done(); } });
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
