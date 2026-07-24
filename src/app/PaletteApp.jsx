// Atmos Studio — Palette. Production port of the Claude Design comp (Palette Generator.dc.html).
// The design comp was authored against a React-compatible component API, so the logic ports
// near-verbatim; it is organised here as a class core plus prototype method groups.
import React from 'react';
import AppView from './AppView.jsx';
import * as C from '../lib/color.js';
import * as X from '../lib/exporters.js';
import * as I from '../lib/interpret.js';
import { pipelineMethods } from './methods/pipeline.js';
import { persistenceMethods } from './methods/persistence.js';
import { motionMethods } from './methods/motion.js';
import { overlayMethods } from './methods/overlays.js';
import { universeMethods } from './methods/universe.js';
import { reelMethods } from './methods/reel.js';
import { orbitMethods } from './methods/orbit.js';
import { wipeMethods } from './methods/wipe.js';
import { loaderMethods } from './methods/loader.js';
import { miscMethods } from './methods/misc.js';
import { renderValsMethods } from './renderVals.js';

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
  archetypes = I.archetypes;
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

  state = {
    stage: 'upload', current: null, feed: this.hydrateFeed(), projects: this.hydrateProjects(), activeProject: null,
    assignPalette: null, manageProjects: false, fileMenuOpen: false, imageUrl: null, procStep: 0, dragOver: false,
    pending: null, copied: null, errorTitle: '', errorMsg: '', announce: '', feedView: 'list', overlay: null,
    overlaySel: null, theme: 'light', contrast: false, contrastLens: 'AA', contrastLarge: false, contrastPassOnly: false,
    toast: null, harmony: null, exportOpen: false, exportPalette: null, exportSemantic: false, notice: null,
    landingDismissed: this._landingDismissed(), showLoader: this._loaderPending(), page: 0,
    narrow: (function () { try { return !!(window.matchMedia && window.matchMedia('(max-width:720px)').matches); } catch (e) { return false; } })(),
    pageSize: (function () { try { const v = parseInt(localStorage.getItem('palette-generator/pagesize'), 10); return [12, 24, 36].indexOf(v) >= 0 ? v : 12; } catch (e) { return 12; } })(),
  };

  _genId = 0;
  MAX_BYTES = 20 * 1024 * 1024;
  ACCEPT = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp', 'image/avif'];

  // the one global light — every orb cue derives from it
  get ORB_LIGHT() { return { x: 0.30, y: 0.28 }; }
  // how many orbs may hold a WebGL context. Rings claim it whole, front first (see _initOrbGL); the
  // rest ride the painted DOM floor. Kept under the browser's per-page live-context cap (~16) — and
  // at 0 on phones, where a dozen live contexts is a battery and memory bill the painted floor
  // (visually the same thing) does not charge.
  get ORB_GL_MAX() { return this.state.narrow ? 0 : 12; }
  // seconds for one full revolution of the ring set — ONE speed, shared by every ring (contract §3)
  ORB_ROT_SECS = 105;

  _landingDismissed() { try { return localStorage.getItem('palette-generator/landing') === '1'; } catch (e) { return false; } }
  // Is the landing surface on screen? On phones it always is: the tool needs room the viewport
  // hasn't got, so the landing IS the small-screen surface (same ring stage, gate copy instead of
  // the CTA) rather than a separate dead-end panel. Dismissal only means anything on desktop.
  _landingUp() { return !this.state.landingDismissed || this.state.narrow; }
  // plays on any page load that lands on the Get Started page (landing not yet dismissed) — never
  // inside the tool. No separate one-shot flag: a burned flag from an interrupted run must not be
  // able to suppress the intro; pressing Get Started ends it for good.
  _loaderPending() { return !this._landingDismissed(); }

  componentDidMount() {
    // surface swallowed load-time errors with their real message/location
    if (!window.__pgErrHook) { window.__pgErrHook = true; window.addEventListener('error', (e) => { try { console.error('[pg:onerror]', e.message, e.filename, e.lineno, e.error && e.error.stack); } catch (_) { } }); }
    // one feature's failure must never abort the rest of mount
    const safe = (fn, tag) => { try { fn(); } catch (e) { try { console.error('[pg:mount:' + tag + ']', e && e.message, e); } catch (_) { } } };
    safe(() => this._initClock(), 'clock');
    this._reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches);
    safe(() => this.initMotion(), 'motion');   // EASE/DUR tokens must exist before the loader builds its timeline
    safe(() => this._initLenis(), 'lenis');
    safe(() => requestAnimationFrame(() => this._updateProjPill()), 'projpill');
    safe(() => this._initLoader(), 'loader');
    // Light is the product default; the nav toggle overrides in-session
    const theme = 'light';
    try { document.documentElement.setAttribute('data-theme', theme); } catch (e) { }
    this.state.theme = theme;
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
        if (this.state.assignPalette) { e.preventDefault(); this.closeAssign(); return; }
        if (this.state.manageProjects) { e.preventDefault(); this.closeManage(); return; }
        if (this.state.fileMenuOpen) { e.preventDefault(); this.setState({ fileMenuOpen: false }); return; }
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
    this._onModKey = (e) => { if (e.key === 'Tab' || e.key.startsWith('Arrow') || e.key === 'Home' || e.key === 'End') this._kbdInput = true; };
    this._onModPtr = () => { this._kbdInput = false; };
    document.addEventListener('keydown', this._onModKey, true);
    document.addEventListener('pointerdown', this._onModPtr, true);
    this._listWheel = (e) => { if (this._reduce || !window.gsap || !this._readoutScale || this.state.feedView !== 'list') return; const v = 1 - window.gsap.utils.clamp(-0.035, 0.035, e.deltaY / 900); this._readoutScale(v); clearTimeout(this._roT); this._roT = setTimeout(() => { if (this._readoutScale) this._readoutScale(1); }, 90); };
    window.addEventListener('wheel', this._listWheel, { passive: true });
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
    if (this._lenis) { try { window.gsap && window.gsap.ticker.remove(this._lenisRaf); } catch (e) { } try { this._lenis.destroy(); } catch (e) { } this._lenis = null; }
    if (this._clockT) { clearInterval(this._clockT); this._clockT = null; }
    if (this._onModKey) { document.removeEventListener('keydown', this._onModKey, true); document.removeEventListener('pointerdown', this._onModPtr, true); }
    if (this._mq && this._onMq) { try { if (this._mq.removeEventListener) this._mq.removeEventListener('change', this._onMq); else this._mq.removeListener(this._onMq); } catch (e) { } this._mq = null; this._onMq = null; }
    this.stopCanvas(); this.killSpatial(); this.killOrbit();
    try { document.body.style.overflow = ''; } catch (e) { }
    if (this._t) clearInterval(this._t);
    if (this._end) clearTimeout(this._end);
    if (this._onKey) document.removeEventListener('keydown', this._onKey);
    if (this._listWheel) window.removeEventListener('wheel', this._listWheel);
    if (this._uRetryT) clearTimeout(this._uRetryT);
    if (this._objUrls) { this._objUrls.forEach((u) => { try { URL.revokeObjectURL(u); } catch (e) { } }); this._objUrls = []; }
    if (this._storageHandler) window.removeEventListener('storage', this._storageHandler);
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
  miscMethods,
  renderValsMethods,
);
