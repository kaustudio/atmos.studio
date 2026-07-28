// Atmos Gallery. Production port of the Claude Design comp.
// The design comp was authored against a React-compatible component API, so the logic ports
// near-verbatim; it is organised here as a class core plus prototype method groups.
import React from 'react';
import AppView from './AppView.jsx';
import * as C from '../lib/color.js';
import * as X from '../lib/exporters.js';
import * as I from '../lib/interpret.js';
import { syncThemeColor } from '../lib/themeColor.js';
import { pipelineMethods } from './methods/pipeline.js';
import { persistenceMethods } from './methods/persistence.js';
import { motionMethods } from './methods/motion.js';
import { overlayMethods } from './methods/overlays.js';
import { universeMethods } from './methods/universe.js';
import { reelMethods } from './methods/reel.js';
import { orbitMethods } from './methods/orbit.js';
import { wipeMethods } from './methods/wipe.js';
import { loaderMethods } from './methods/loader.js';
import { shareMethods } from './methods/share.js';
import { miscMethods } from './methods/misc.js';
import { renderValsMethods } from './renderVals.js';
import { routeFor, pathFor, isLegal, applyHead, APP } from './routes.js';

export default class PaletteApp extends React.Component {
  static defaultProps = { proportional: true, swatchCount: 5 };

  // ---- pure helpers bound as fields so the ported method bodies keep their `this.` call sites.
  // Declared BEFORE `state` — its initializer (hydrateFeed → validateFeed) already needs them.
  rgb2oklab = C.rgb2oklab;
  oklab2rgb = C.oklab2rgb;
  hex = C.hex;
  hexToRgb = C.hexToRgb;
  hexA = C.hexA;
  lumHex = C.lumHex;
  onColor = C.onColor;
  dist2 = C.dist2;
  kmeans = C.kmeans;
  rgb2hsl = C.rgb2hsl;
  relLum = C.relLum;
  contrastRatio = C.contrastRatio;
  oklabToLinear = C.oklabToLinear;
  inSrgb = C.inSrgb;
  labToHex = C.labToHex;
  gamutMap = C.gamutMap;
  rotateHue = C.rotateHue;
  shadeSet = C.shadeSet;
  harmonyGroups = C.harmonyGroups;
  swatchFormats = C.swatchFormats;
  pantoneTable = C.pantoneTable;
  nearestPantone = C.nearestPantone;
  cubicBezier = C.cubicBezier;
  slugName = X.slugName;
  primitiveEntries = X.primitiveEntries;
  semanticRoles = X.semanticRoles;
  semanticEntries = X.semanticEntries;
  buildTailwind = X.buildTailwind;
  buildCssFile = X.buildCssFile;
  buildW3CTokens = X.buildW3CTokens;
  buildFigmaTokens = X.buildFigmaTokens;
  buildASE = X.buildASE;
  paletteHexList = X.paletteHexList;
  paletteCss = X.paletteCss;
  interpret = I.interpretLocal;
  parseInterp = I.parseInterp;
  canInterpretLive = I.canInterpretLive;

  fileRef = React.createRef();
  canvasRef = React.createRef();
  resultRef = React.createRef();
  progRef = React.createRef();
  gridRef = React.createRef();
  projectFileRef = React.createRef();
  contrastBtnRef = React.createRef();
  overlayRef = React.createRef();
  overlayBandsRef = React.createRef();
  spaceRef = React.createRef();
  planeRef = React.createRef();
  universeCloseRef = React.createRef();

  // An incoming share link, decoded and validated once. Declared before `state` because the state
  // initializer branches on it — a link must open ON the palette, never on the landing first.
  // Reads the fragment only; nothing here writes to the recipient's archive.
  _shared = this._sharedFromHash();

  // Which of the three addresses this document was opened at. Read once, before state, because the
  // loader and the landing both branch on it: neither belongs on a legal route, and deciding that
  // after they have already been scheduled means showing them and then taking them away.
  _entryRoute = routeFor(typeof location !== 'undefined' ? location.pathname : '/');

  state = {
    route: this._entryRoute,
    // a shared palette opens straight into the result stage, past the landing and the loader
    stage: this._shared ? 'result' : 'upload',
    current: this._shared || null,
    sharedView: !!this._shared,
    // activeTags is a LIST, combined with AND: each tag added narrows the archive further. Union
    // would widen on every pick, which makes a filter less useful the more you tell it.
    // Two filter groups with DIFFERENT boolean semantics, the standard faceted-search convention:
    // AND across groups, OR within a group. Tags are AND *within* the group too (each tag narrows),
    // because a tag is a property a palette either has or lacks and you can hold several at once.
    // Accessibility is one exclusive property per palette, so within it only OR is meaningful —
    // AND would always yield nothing.
    feed: this.hydrateFeed(), projects: this.hydrateProjects(), activeProject: null, activeTags: [], activeA11y: [],
    // the tag facet: one disclosure control, closed by default; the query is typeahead state.
    // tagSort: 'count' serves discovery (what is this archive made of), 'alpha' known-item lookup
    // (I want GOLDEN) — the two reasons anyone opens a facet list.
    tagMenuOpen: false, tagQuery: '', tagSort: 'count',
    // the Library heading's storage toggletip — same shape as aaInfoOpen, and closed the same way
    storeInfoOpen: false,
    // a re-uploaded image the archive already holds: the choice dialog's subject, null when closed
    recognised: null,
    // a validated backup file waiting to be added: {projects, palettes, counts}, null when closed.
    // The file is parsed and checked BEFORE this is set, so the dialog only ever describes a file
    // that would actually import — a bad file never gets a confirmation to click.
    restorePending: null,
    assignPalette: null, manageProjects: false, backupMenuOpen: false, imageUrl: null, procStep: 0, dragOver: false,
    pending: null, copied: null, errorTitle: '', errorMsg: '', announce: '', feedView: 'list', overlay: null,
    overlaySel: null, theme: this._entryTheme(), contrast: false, contrastLens: 'AA', contrastLarge: false, contrastPassOnly: false,
    toast: null, harmony: null, exportOpen: false, exportPalette: null, exportSemantic: false, notice: null,
    // a share link arrives past both gates: the recipient came for the palette, not the intro.
    // A legal route arrives past them for a different reason: there is no tool on it to introduce.
    landingDismissed: (this._shared || isLegal(this._entryRoute)) ? true : this._landingDismissed(),
    showLoader: (this._shared || isLegal(this._entryRoute)) ? false : this._loaderPending(),
    page: 0,
    // List sort. 'time' desc is the archive's own default — newest first, what the feed already
    // meant before there was anything to sort BY. Deliberately not persisted: page size is a
    // standing preference, an ordering is a question you are asking of the list right now.
    sortKey: 'time', sortDir: 'desc',
    narrow: (function () { try { return !!(window.matchMedia && window.matchMedia('(max-width:720px)').matches); } catch (e) { return false; } })(),
    pageSize: (function () { try { const v = parseInt(localStorage.getItem('palette-generator/pagesize'), 10); return [12, 24, 36].indexOf(v) >= 0 ? v : 12; } catch (e) { return 12; } })(),
  };

  _genId = 0;
  MAX_BYTES = 20 * 1024 * 1024;
  ACCEPT = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp', 'image/avif'];

  // the one global light — every orb cue derives from it
  get ORB_LIGHT() { return { x: 0.30, y: 0.28 }; }
  // how many orbs may hold a WebGL context. Rings claim it whole, front first (see _initOrbGL); the
  // rest ride the painted DOM floor. Kept under the browser's per-page live-context cap (~16).
  // Small screens get the SAME budget: an orb's shading must not change with the screen it's on.
  ORB_GL_MAX = 12;
  // seconds for one full revolution of the ring set — ONE speed, shared by every ring (contract §3)
  ORB_ROT_SECS = 105;
  // the ring→ring gap as a multiple of the copy→ring gap: the rings should read as separate depths,
  // not one thick band. Pushing the outer ring off the sides of the viewport is intended.
  ORB_RING_GAP_MUL = 1.75;
  // the smallest gap, as a fraction of the inner orb's DIAMETER — proportional so it reads the same
  // whether the orbs are 55px (phone) or 96px (portrait tablet), where the width-derived gap
  // collapses onto this floor. A flat pixel floor put tablets at 0.44 diameters and phones at 0.76.
  ORB_MIN_GAP_MUL = 0.55;
  // and the largest ring→ring gap, same units: g tracks the viewport width, so without a ceiling the
  // rings drift apart into two unrelated arcs on big displays (3.2 diameters on a 16", 3.9 at 1080p).
  ORB_RING_GAP_MAX = 2.2;
  // The widest viewport the formation will SIZE ITSELF to. Past this the rings stop growing and the
  // extra width becomes margin instead of gap.
  // ORB_RING_GAP_MAX bounds the ring→ring interval but nothing bounded the copy→ring one, and that
  // one is a third of the leftover half-viewport, so it grew without limit: 2.19 orb diameters at
  // 1440, 2.66 at 1728, 3.62 at 2000, 5.05 at 1440p, 7.63 on a 3440 ultrawide — a 1049px hole
  // between the copy and the first ring, with the slide-out then pushing every radius further out
  // still. The formation was spanning the display and had nothing left to span it WITH.
  // 1728 is the 16" MacBook Pro's default logical width, chosen so that screen and everything below
  // it is untouched to the pixel (the clamp is a no-op there). A 16" run at a scaled "More Space"
  // resolution reports wider than this and is treated as a large display, which is correct — what
  // matters is the CSS pixels the formation has to fill, not the diagonal.
  ORB_SPAN_MAX = 1728;

  /* The theme this document opens in.

     Light is the tool's product default and stays that way: the app forces light at mount regardless
     of the OS, because the palette work it exists for is judged against a light surface.

     A legal route is not that. Someone arriving at /privacy from a search result at night has no
     relationship with the tool's defaults and every reason to expect their own — these are documents
     to read, not a surface to work on, and they followed the OS faithfully for as long as they were
     their own files. So the entry route decides, once. From then on the switch in the masthead is
     the only thing that moves it, on either route, and the two never disagree inside a session. */
  _entryTheme() {
    if (!isLegal(this._entryRoute)) return 'light';
    try { return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; } catch (e) { return 'light'; }
  }

  _landingDismissed() { try { return localStorage.getItem('palette-generator/landing') === '1'; } catch (e) { return false; } }
  // Is the landing surface on screen? On phones it always is: the tool needs room the viewport
  // hasn't got, so the landing IS the small-screen surface (same ring stage, gate copy instead of
  // the CTA) rather than a separate dead-end panel. Dismissal only means anything on desktop.
  // A shared link opened on a phone gets the palette, read-only — not the desktop gate. That single
  // exception is the whole point: most shared links ARE opened on a phone, so gating them ends the
  // chain at its first hop and sharing never compounds. The tool itself still gates; only somebody
  // else's finished palette comes through.
  _mobileShare() { return !!(this.state.narrow && this.state.sharedView && this.state.current); }
  _landingUp() { return (!this.state.landingDismissed || this.state.narrow) && !this._mobileShare(); }
  // ONCE PER SESSION, on whatever surface the visit lands on — the Get Started page for a newcomer,
  // 'Drop a reference' for a regular who dismissed the landing long ago. What the loader marks is
  // the ARRIVAL, and a returning visitor arrives just as much as a first-time one; keying it to the
  // landing meant the people who use the tool most were the only ones who never saw it.
  //
  // sessionStorage, not localStorage: 'first visit of this session' is precisely what a session
  // store means, and it clears itself with the tab, so there is no permanent flag to go stale.
  //
  // The flag is burned when the run FINISHES (loader done()), never here at mount — that was the
  // real objection to a one-shot flag, and it survives: a run cut short by a reload replays instead
  // of being swallowed. done() is reachable from every teardown path, watchdogs included, so the
  // flag cannot fail to burn either.
  _loaderSeen() { try { return sessionStorage.getItem('palette-generator/loader-session') === '1'; } catch (e) { return false; } }
  _loaderPending() { return !this._loaderSeen(); }

  componentDidMount() {
    // surface swallowed load-time errors with their real message/location
    if (!window.__pgErrHook) { window.__pgErrHook = true; window.addEventListener('error', (e) => { try { console.error('[pg:onerror]', e.message, e.filename, e.lineno, e.error && e.error.stack); } catch (_) { } }); }
    // one feature's failure must never abort the rest of mount
    const safe = (fn, tag) => { try { fn(); } catch (e) { try { console.error('[pg:mount:' + tag + ']', e && e.message, e); } catch (_) { } } };
    this._reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches);
    safe(() => this.initMotion(), 'motion');   // EASE/DUR tokens must exist before the loader builds its timeline
    safe(() => this._initLenis(), 'lenis');
    safe(() => requestAnimationFrame(() => this._updateProjPill()), 'projpill');
    safe(() => this._initLoader(), 'loader');
    // Light on the tool, the reader's own appearance on a legal route — see _entryTheme.
    const theme = this.state.theme;
    try { document.documentElement.setAttribute('data-theme', theme); } catch (e) { }
    safe(() => syncThemeColor(), 'themecolor'); // browser chrome follows --surface, not the OS appearance
    /* The entry route's own metadata. On a prerendered legal document this rewrites the same values
       back over themselves and is invisible; it earns its place in the two cases where the served
       document is index.html — Vite's dev server, which has no prerender step, and any host that
       falls back to the shell — where without it /privacy would wear the tool's title in the tab, in
       the history entry and in anything the reader copies out of the address bar. */
    safe(() => applyHead(this.state.route), 'head');
    // Back and forward are real navigations between these routes, so the swap is wiped exactly as a
    // click is. popstate has already moved the address bar by the time it fires, which is why
    // navigateTo is told not to push a second entry for it.
    this._onPop = () => {
      const next = routeFor(location.pathname);
      if (next === this.state.route) return;
      this.navigateTo(pathFor(next), { push: false });
    };
    window.addEventListener('popstate', this._onPop);
    this.initMotion();
    // GSAP readiness. The vendored core+plugins load from index.html; register plugins once present.
    const finishGsap = () => { if (window.gsap) { try { const ps = []; if (window.Observer) ps.push(window.Observer); if (window.Flip) ps.push(window.Flip); if (window.ScrollToPlugin) ps.push(window.ScrollToPlugin); if (ps.length) window.gsap.registerPlugin.apply(window.gsap, ps); } catch (e) { } } this._gsapReady = true; if (this._landingUp() && !this._orbit) this.initOrbit(); };
    if (window.gsap) {
      let tries = 0;
      const waitLocal = () => { if ((window.Observer && window.Flip && window.ScrollToPlugin) || tries >= 40) { finishGsap(); return; } tries++; setTimeout(waitLocal, 50); };
      waitLocal();
    } else {
      const cdn = 'https://cdn.jsdelivr.net/npm/gsap@3.13/dist/';
      const loadSeq = (list) => { if (!list.length) { finishGsap(); return; } const sc = document.createElement('script'); sc.src = list[0]; sc.onload = () => loadSeq(list.slice(1)); sc.onerror = () => loadSeq(list.slice(1)); document.head.appendChild(sc); };
      loadSeq([cdn + 'gsap.min.js', cdn + 'Observer.min.js', cdn + 'Flip.min.js', cdn + 'ScrollToPlugin.min.js']);
    }
    this._onKey = (e) => {
      if (e.key === 'Escape') {
        if (this.state.recognised) { e.preventDefault(); this.closeRecognised(); return; }
        if (this.state.assignPalette) { e.preventDefault(); this.closeAssign(); return; }
        if (this.state.manageProjects) { e.preventDefault(); this.closeManage(); return; }
        if (this.state.restorePending) { e.preventDefault(); this.closeRestore(); return; }
        if (this.state.backupMenuOpen) { e.preventDefault(); this.setState({ backupMenuOpen: false }); return; }
        if (this.state.tagMenuOpen) { e.preventDefault(); this.closeTagFilter(); return; }
        if (this.state.exportOpen) { e.preventDefault(); this.closeExport(); return; }
        if (this.state.harmony) { e.preventDefault(); this.closeHarmony(); return; }
        if (this.state.contrast) { e.preventDefault(); this.closeContrast(); return; }
        if (this.state.overlay) { e.preventDefault(); this.closeOverlay(); return; }
        if (this.state.feedView === 'grid' || this.state.feedView === 'carousel') { e.preventDefault(); this.setFeedView('list'); return; }
        if (this.state.stage === 'result') { e.preventDefault(); this.doReset(); }
      }
    };
    document.addEventListener('keydown', this._onKey);
    // input-modality tracking: keyboard sets the flag, pointer clears it — centerOnTile is gated on it
    // The same fact is mirrored onto the root as data-kbd, which is the only way CSS can know it:
    // the text field's focus ring hangs off it (global.css), so a click leaves the field alone and a
    // Tab still lands visibly. Tab ONLY, not the arrow keys the flag also takes — arrows move a
    // caret inside a field, and a focus ring appearing mid-sentence is not keyboard navigation.
    this._onModKey = (e) => {
      if (e.key === 'Tab' || e.key.startsWith('Arrow') || e.key === 'Home' || e.key === 'End') this._kbdInput = true;
      if (e.key === 'Tab') document.documentElement.setAttribute('data-kbd', '');
    };
    this._onModPtr = () => { this._kbdInput = false; document.documentElement.removeAttribute('data-kbd'); };
    document.addEventListener('keydown', this._onModKey, true);
    document.addEventListener('pointerdown', this._onModPtr, true);
    // (Removed with the inline row expansion: a window-level wheel listener that scaled the expanded
    // row's metric readout. Its only target was [data-row-values], which no longer exists — the row
    // carries no readout to emphasise. If a per-row metric cluster returns, this is the hook to
    // reinstate, on the new element.)
    this._storageHandler = (e) => this._onStorage(e);
    window.addEventListener('storage', this._storageHandler);
    // small-viewport surface as STATE, not just a CSS gate: the ring stage's context budget, fx
    // budget and hero measurement all differ there, and those are build-time decisions. Crossing the
    // breakpoint rebuilds the formation rather than leaving desktop-sized decisions in place.
    try {
      this._mq = window.matchMedia('(max-width:720px)');
      this._onMq = (e) => { if (e.matches === this.state.narrow) return; this.setState({ narrow: e.matches }, () => { this.killOrbit(); if (this._landingUp()) requestAnimationFrame(() => this.initOrbit()); }); };
      if (this._mq.addEventListener) this._mq.addEventListener('change', this._onMq); else this._mq.addListener(this._onMq);
    } catch (e) { }
    if (this._needSeedPersist) { this._needSeedPersist = false; this.persist({ immediate: true }); }
    this.initClickZoom();
    // ring landing: first-visit brand arrival, and the permanent small-screen surface (retries
    // internally until gsap is ready)
    if (this._landingUp()) { requestAnimationFrame(() => this.initOrbit()); }
  }

  componentDidUpdate() {
    const s = this.state;
    this._updateProjPill();
    // contrast lens/size/filter change: animate ONLY the delta (cells whose verdict flips), not the whole matrix
    if (s.contrast) {
      const key = s.contrastLens + '|' + s.contrastLarge + '|' + s.contrastPassOnly;
      if (this._cxToggleKey && this._cxToggleKey !== key) this.animateContrastDelta(this._cxToggleKey, key);
      this._cxToggleKey = key;
    } else { this._cxToggleKey = null; }
    // orbit landing safety net: if gsap is already ready and the orbit isn't built, kick it
    if (this._landingUp() && this._gsapReady && !this._orbit && !this._reduce) { this.initOrbit(); }
    // spatial grid lifecycle (independent of stage/current — runs on view toggle too)
    const wantSpatial = s.feedView === 'grid' && s.feed.length > 0;
    const prevWant = this._prevWantSpatial; this._prevWantSpatial = wantSpatial;
    if (wantSpatial && !this._spatialBuilt()) { requestAnimationFrame(() => { if (this.state.feedView === 'grid') this.initSpatial(); }); }
    // reel lifecycle (mirror of the spatial pattern: transition-aware teardown, self-healing build)
    const wantReel = s.feedView === 'carousel';
    const prevWantReel = this._prevWantReel; this._prevWantReel = wantReel;
    if (wantReel && !this._reelBuilt()) { requestAnimationFrame(() => { if (this.state.feedView === 'carousel') this.initReel(); }); }
    if (!wantReel && prevWantReel && this._reelBuilt()) { this.killReel(); }
    // resume the reel's ambient spin when the shared detail overlay closes above it
    const ovOpen = !!s.overlay;
    if (this._prevOvOpen && !ovOpen && s.feedView === 'carousel') { this._reelResume(); }
    this._prevOvOpen = ovOpen;
    // Tear down ONLY on a real grid->list (or feed-emptied) transition — never on unrelated commits
    if (prevWant && !wantSpatial) { this.killSpatial(); }
    // list-view row activation: restore/establish the active (expanded) row after any re-render
    if (s.feedView === 'list' && s.feed.length > 0) { requestAnimationFrame(() => { if (this.state.feedView === 'list') this._syncListActive(); }); }

    const prev = this._prev || { stage: 'upload', curId: null };
    const curId = s.current && s.current.id;
    if (s.stage === prev.stage && curId === prev.curId) return;
    if (s.stage === 'processing' && prev.stage !== 'processing') this.startCanvas();
    if (s.stage !== 'processing' && prev.stage === 'processing') this.stopCanvas();
    const enteredResult = s.stage === 'result' && (prev.stage !== 'result' || curId !== prev.curId);
    this._prev = { stage: s.stage, curId: curId };
    if (enteredResult) {
      const vis = window.gsap && !document.hidden;
      try {
        // FLIP morph is the special case when a source image exists; otherwise (and for list
        // selection) the shared band wipe is the reveal character.
        if (vis && !this._reduce && this._fromRects) { this.flipBandsFrom(this._fromRects); this.animateText(0.1); }
        else if (vis) { this.animateBands(); this.animateText(this._reduce ? 0 : 0.36); }
      } catch (err) { }
      this._fromRects = null;
      if (window.gsap && !this._reduce && !document.hidden) { requestAnimationFrame(() => { const cur = document.querySelector('button[data-feed][aria-current="true"]'); if (cur) this.commitSelected(cur); }); }
    }
  }

  componentWillUnmount() {
    if (this._loaderPace) { clearInterval(this._loaderPace); this._loaderPace = null; }
    if (this._loaderFill) { try { window.gsap && window.gsap.ticker.remove(this._loaderFill); } catch (e) { } this._loaderFill = null; }
    if (this._loaderTl) { try { this._loaderTl.kill(); } catch (e) { } this._loaderTl = null; }
    if (this._loaderT1) { clearTimeout(this._loaderT1); this._loaderT1 = null; }
    if (this._loaderT2) { clearTimeout(this._loaderT2); this._loaderT2 = null; }
    this._loaderRescue = null;
    if (this._landRevealT) { clearTimeout(this._landRevealT); this._landRevealT = null; }
    if (this._dropRevealT) { clearTimeout(this._dropRevealT); this._dropRevealT = null; }
    if (this._listRevealT) { clearTimeout(this._listRevealT); this._listRevealT = null; }
    if (this._listAnchorT) { clearTimeout(this._listAnchorT); this._listAnchorT = null; }
    if (this._listAnchorTick) { try { window.gsap && window.gsap.ticker.remove(this._listAnchorTick); } catch (e) { } this._listAnchorTick = null; }
    if (this._listHeightT) { clearTimeout(this._listHeightT); this._listHeightT = null; }
    if (this._lenis) { try { window.gsap && window.gsap.ticker.remove(this._lenisRaf); } catch (e) { } try { this._lenis.destroy(); } catch (e) { } this._lenis = null; }
    if (this._onModKey) { document.removeEventListener('keydown', this._onModKey, true); document.removeEventListener('pointerdown', this._onModPtr, true); }
    if (this._mq && this._onMq) { try { if (this._mq.removeEventListener) this._mq.removeEventListener('change', this._onMq); else this._mq.removeListener(this._onMq); } catch (e) { } this._mq = null; this._onMq = null; }
    this.stopCanvas(); this.killSpatial(); this.killOrbit();
    try { document.body.style.overflow = ''; } catch (e) { }
    if (this._t) clearInterval(this._t);
    if (this._end) clearTimeout(this._end);
    if (this._onKey) document.removeEventListener('keydown', this._onKey);
    if (this._uRetryT) clearTimeout(this._uRetryT);
    if (this._objUrls) { this._objUrls.forEach((u) => { try { URL.revokeObjectURL(u); } catch (e) { } }); this._objUrls = []; }
    if (this._storageHandler) window.removeEventListener('storage', this._storageHandler);
    if (this._onPop) window.removeEventListener('popstate', this._onPop);
    if (this._wipeWatchdog) clearTimeout(this._wipeWatchdog);
    if (this._wipeClearGuards) { try { this._wipeClearGuards(); } catch (e) { } this._wipeClearGuards = null; }
    if (this._czDetach) { try { this._czDetach(); } catch (e) { } this._czDetach = null; this._czInit = false; }
  }

  render() {
    return <AppView vals={this.renderVals()} />;
  }
}

Object.assign(
  PaletteApp.prototype,
  pipelineMethods,
  persistenceMethods,
  motionMethods,
  overlayMethods,
  universeMethods,
  reelMethods,
  orbitMethods,
  wipeMethods,
  loaderMethods,
  shareMethods,
  miscMethods,
  renderValsMethods,
);
