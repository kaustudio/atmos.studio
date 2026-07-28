// Curved-wipe transitions between the landing and the tool (both directions) and between the three
// routes, with rAF-stall pumps and watchdogs so a throttled frame can never strand the covering
// layer or lock the app.
import { routeFor, pathFor, isLegal, applyHead } from '../routes.js';

export const wipeMethods = {
  _resetIntroState(afterCb) {
    // journey flags only — palettes, projects, theme untouched.
    // 'palette-generator/landing' is PERMANENT dismissal, not session-scoped: '1' survives reloads so
    // a returning visitor lands straight in the tool. It is deliberately reversible — the logo and the
    // file menu's 'Show intro again' both route here, which writes '0' and shows the landing again.
    try { localStorage.setItem('palette-generator/landing', '0'); } catch (e) { }
    this._orbitRetry = 0;
    // the landing unmounts the detail overlay outright (overlay: null below) without going through
    // _finishOverlayClose — force the same teardown deletePalette does. Otherwise a close reversal
    // still in flight fires onReverseComplete onto the landing, announcing over 'Intro will show
    // again.' and focusing a detached tile, which steals focus from the CTA showIntroAgain is
    // retrying to reach. It is also what keeps the open latch from stranding across the journey
    // open a card → logo → Get Started.
    this._ovTl = null; this._ovDone = true; this._ovOpen = false; this._openTileEl = null; this._ovBack = null;
    clearTimeout(this._closeGuard);
    // the landing re-seeds per visit (_rng, _noiseURL, _envURL, _orbitURLs, _orbitPalettes are cleared
    // in killOrbit). Tear down explicitly rather than relying on getStarted having done it: killOrbit is
    // idempotent, and the reduced-motion path never assigns _orbit for initOrbit's guard to catch.
    this.killOrbit();
    // the tool behind the landing returns to its default state — Get Started must always land on
    // 'Drop a reference' (never a left-open grid view, overlay, drawer, or result)
    if (this.state.feedView === 'grid') { this.killSpatial(); this._lenisStart(); try { document.body.style.overflow = ''; } catch (e) { } }
    if (this.state.feedView === 'carousel') { this.killReel(); this._lenisStart(); try { document.body.style.overflow = ''; } catch (e) { } }
    this._genId = (this._genId || 0) + 1; this.stopCanvas();
    if (this._t) clearInterval(this._t); if (this._end) clearTimeout(this._end);
    this.setState({
      fileMenuOpen: false, landingDismissed: false,
      stage: 'upload', current: null, imageUrl: null, selectedSwatch: null, pending: null,
      feedView: 'list', overlay: null, overlaySel: null, harmony: null, contrast: false, exportOpen: false, exportPalette: null, assignPalette: null, manageProjects: false,
      announce: 'Intro will show again.',
    }, () => {
      setTimeout(() => this.initOrbit(), 0);
      if (afterCb) afterCb();
    });
  },
  showIntroAgain() {
    this._wipeRunning = false;
    if (this._wipeClearGuards) { try { this._wipeClearGuards(); } catch (e) { } this._wipeClearGuards = null; }
    // fully reset the wipe layer in case a prior transition was interrupted (kill its timeline,
    // hide the panel, clear transforms) — so returning to the landing can never inherit a stuck cover.
    const g = window.gsap, layer = document.querySelector('[data-wipe]');
    if (this._wipeTl) { try { this._wipeTl.kill(); } catch (e) { } this._wipeTl = null; }
    if (layer) {
      layer.style.display = 'none';
      if (g) { const q = (s) => layer.querySelector(s); try { g.set([q('[data-wipe-panel]'), q('[data-wipe-cap-top]'), q('[data-wipe-cap-bottom]'), q('[data-wipe-word]')].filter(Boolean), { clearProps: 'transform' }); } catch (e) { } }
    }
    this._resetIntroState(() => {
      // L1: focus follows the action — retry until the conditional render has remounted the CTA
      let tries = 0; const grab = () => { const cta = document.querySelector('button[aria-label="Get started"]'); if (cta) { try { cta.focus({ preventScroll: true }); } catch (e) { } if (document.activeElement === cta) return; } if (++tries < 12) setTimeout(grab, 60); }; setTimeout(grab, 0);
    });
  },
  // rAF-stall recovery: if the GSAP ticker is asleep/throttled, the wipe timeline freezes and the
  // watchdog force-swaps — skipping the logo beat. Wake the ticker up front; if it still hasn't
  // advanced shortly after start, pump ticks manually.
  _wipeArmStallPump(g) {
    this._wipeClearPump();
    try { g.ticker.wake(); } catch (e) { }
    // Continuous pace monitor: rAF may be throttled (sporadic frames) rather than fully dead —
    // every 250ms compare the timeline's advancement against real elapsed time; if it isn't keeping
    // pace, take pump ownership and drive tl.time() from the wall clock until completion.
    let lastReal = Date.now(), lastT = null, slowSamples = 0;
    this._wipePump = setInterval(() => {
      const t2 = this._wipeTl;
      if (!this._wipeRunning || !t2) { this._wipeClearPump(); return; }
      const now = Date.now(), realDt = (now - lastReal) / 1000; lastReal = now;
      const tt = t2.time();
      if (lastT === null) { lastT = tt; return; }
      const tlDt = tt - lastT;
      // Only adopt after 2+ consecutive slow samples — a single hiccup must not hand a healthy
      // timeline to the pump. And clamp each advancement: throttled/batched timers fire late with
      // realDt of 1s+, which would fast-forward the whole choreography in one burst.
      if (!this._wipePumpOwns) {
        if (tlDt < realDt * 0.6) { slowSamples++; } else { slowSamples = 0; }
        if (slowSamples >= 2) { this._wipePumpOwns = true; try { g.ticker.wake(); } catch (e) { } }
      }
      if (this._wipePumpOwns) {
        const step = Math.min(realDt, 0.15);
        const nt = Math.min(tt + step, t2.duration());
        try { t2.time(nt, false); } catch (e) { this._wipeClearPump(); return; }
        lastT = nt;
      } else {
        lastT = tt;
      }
    }, 120);
  },
  _wipeClearPump() {
    if (this._wipeStallT) { clearTimeout(this._wipeStallT); this._wipeStallT = null; }
    if (this._wipePump) { clearInterval(this._wipePump); this._wipePump = null; }
    this._wipePumpOwns = false;
  },
  // Recover from BOTH stuck shapes: running with no timeline, and running with a timeline that
  // already finished/was killed (onComplete missed under a throttled frame).
  _wipeRecoverStuck() {
    const tl = this._wipeTl;
    const stuck = this._wipeRunning && (!tl || !tl.isActive());
    if (stuck) {
      this._wipeRunning = false;
      if (tl) { try { tl.kill(); } catch (e) { } }
      this._wipeTl = null;
      if (this._wipeClearGuards) { try { this._wipeClearGuards(); } catch (e) { } } this._wipeClearGuards = null;
      this._wipeClearPump();
      if (this._wipeWatchdog) { clearTimeout(this._wipeWatchdog); this._wipeWatchdog = null; }
      const layer = document.querySelector('[data-wipe]'); if (layer) layer.style.display = 'none';
    }
  },
  // Logo / menu return path: the SAME curved-wipe handoff as Get Started, in reverse — cover the tool,
  // swap to the landing behind the cover, reveal. Falls back to the instant showIntroAgain reset.
  returnToIntro() {
    this._wipeRecoverStuck();
    if (!this.state.landingDismissed || this._wipeRunning) return;
    const g = window.gsap, layer = document.querySelector('[data-wipe]');
    if (this._reduce || !g || !layer) { this.showIntroAgain(); return; }
    this._wipeRunning = true;
    const panel = layer.querySelector('[data-wipe-panel]');
    const capT = layer.querySelector('[data-wipe-cap-top]');
    const capB = layer.querySelector('[data-wipe-cap-bottom]');
    const word = layer.querySelector('[data-wipe-word]');
    layer.style.display = 'block';
    layer.style.pointerEvents = 'auto';
    const inertEls = [document.querySelector('[data-app]')].filter(Boolean);
    inertEls.forEach((el) => { try { el.setAttribute('inert', ''); } catch (e) { } });
    const clearGuards = () => { this._wipeClearPump(); layer.style.pointerEvents = 'none'; document.querySelectorAll('[data-app],[data-landing]').forEach((el) => { try { el.removeAttribute('inert'); } catch (e) { } }); };
    this._wipeClearGuards = clearGuards;
    try { layer.setAttribute('tabindex', '-1'); layer.focus({ preventScroll: true }); } catch (e) { }
    g.set(panel, { yPercent: 100 }); g.set(capT, { scaleY: 0 }); g.set(capB, { scaleY: 1 }); g.set(word, { yPercent: 120 });
    const parts = [document.querySelector('header'), document.querySelector('main')].filter(Boolean);
    let swapped = false;
    // arm the statement lines the moment the landing mounts behind the cover — same reason as the
    // loader: the panel must never uncover text already sitting at its final position
    const doSwap = () => { if (swapped) return; swapped = true; this._resetIntroState(() => { try { g.set(parts, { clearProps: 'transform,opacity' }); } catch (e) { } this._landingTextArm(g); }); };
    const focusCta = () => { let tries = 0; const grab = () => { const cta = document.querySelector('button[aria-label="Get started"]'); if (cta) { try { cta.focus({ preventScroll: true }); } catch (e) { } if (document.activeElement === cta) return; } if (++tries < 12) setTimeout(grab, 60); }; setTimeout(grab, 0); };
    const tl = g.timeline({ paused: true, onComplete: () => { if (this._wipeWatchdog) { clearTimeout(this._wipeWatchdog); this._wipeWatchdog = null; } layer.style.display = 'none'; clearGuards(); this._wipeClearGuards = null; g.set([panel, capT, capB, word], { clearProps: 'transform' }); this._wipeRunning = false; this._wipeTl = null; focusCta(); } });
    this._wipeWatchdog = setTimeout(() => {
      this._wipeWatchdog = null;
      if (!this._wipeRunning) return;
      try { if (this._wipeTl) { this._wipeTl.kill(); } } catch (e) { }
      this._wipeTl = null; this._wipeRunning = false;
      layer.style.display = 'none'; clearGuards(); this._wipeClearGuards = null;
      try { g.set([panel, capT, capB, word], { clearProps: 'transform' }); } catch (e) { }
      try { g.set(parts, { clearProps: 'transform,opacity' }); } catch (e) { }   // never leave the tool frozen dim
      if (!swapped) doSwap();
      try { this._landingTextReveal(g); } catch (e) { }   // killed timeline must not strand armed lines
      focusCta();
    }, 4000);
    this._wipeTl = tl;
    // 1 — COVER: panel rises over the tool; the tool drifts up slightly for depth
    tl.to(panel, { yPercent: 0, duration: 0.8, ease: this.EASE.entrance }, 0);
    tl.to(capT, { scaleY: 1, duration: 0.8, ease: this.EASE.entrance }, 0);
    if (parts.length) tl.to(parts, { y: '-6vh', opacity: 0.5, duration: 0.8, ease: this.EASE.entrance }, 0);
    // 2 — BRAND beat
    tl.to(word, { yPercent: 0, duration: 0.55, ease: this.EASE.entrance }, 0.6);
    tl.call(doSwap, null, 1.0);       // 3 — swap to the landing behind the cover
    tl.to({}, { duration: 0.45 }, '>');
    // 4 — REVEAL onto the landing
    tl.to(word, { yPercent: -130, duration: 0.6, ease: this.EASE.exit }, '>-0.05');
    tl.to(panel, { yPercent: -100, duration: 0.9, ease: this.EASE.entrance }, '<');
    tl.to(capB, { scaleY: 0, duration: 0.9, ease: this.EASE.entrance }, '<');
    tl.call(() => this._landingTextReveal(g), null, '<+0.2');   // statement lines rise as the cover lifts
    // built paused: a fresh unpaused timeline inserted against a SLEEPING ticker inherits a stale
    // parent playhead — wake the clock FIRST, then pin the playhead to 0.
    try { g.ticker.wake(); } catch (e) { }
    tl.play(0);
    this._wipeArmStallPump(g);
  },
  getStarted() {
    this._wipeRecoverStuck();
    if (this.state.landingDismissed || this._wipeRunning) return;
    const persist = (afterCb) => {
      try { localStorage.setItem('palette-generator/landing', '1'); } catch (e) { } this.killOrbit();
      this.setState({ landingDismissed: true }, afterCb || function () { });
    };
    const focusChrome = () => { requestAnimationFrame(() => { const f = document.querySelector('header [data-focus="chrome"]') || document.querySelector('[data-focus="chrome"]'); if (f) try { f.focus(); } catch (e) { } }); };
    const g = window.gsap;
    const layer = document.querySelector('[data-wipe]');
    const landing = document.querySelector('[data-landing]');
    // reduced motion / no gsap → instant swap, no panel
    if (this._reduce || !g || !layer) { persist(focusChrome); return; }
    this._wipeRunning = true;
    const panel = layer.querySelector('[data-wipe-panel]');
    const capT = layer.querySelector('[data-wipe-cap-top]');
    const capB = layer.querySelector('[data-wipe-cap-bottom]');
    const word = layer.querySelector('[data-wipe-word]');
    layer.style.display = 'block';
    // M1: while the wipe covers the screen it must actually block input — pointer AND keyboard —
    // so nothing beneath (landing pre-swap, tool post-swap) can be activated invisibly.
    layer.style.pointerEvents = 'auto';
    const inertEls = [document.querySelector('[data-app]'), landing].filter(Boolean);
    inertEls.forEach((el) => { try { el.setAttribute('inert', ''); } catch (e) { } });
    const clearGuards = () => { this._wipeClearPump(); layer.style.pointerEvents = 'none'; inertEls.forEach((el) => { try { el.removeAttribute('inert'); } catch (e) { } }); const app = document.querySelector('[data-app]'); if (app) try { app.removeAttribute('inert'); } catch (e) { } };
    this._wipeClearGuards = clearGuards;
    // L1: park focus on the transition layer so it isn't stranded on an unmounting control
    try { layer.setAttribute('tabindex', '-1'); layer.focus({ preventScroll: true }); } catch (e) { }
    g.set(panel, { yPercent: 100 }); g.set(capT, { scaleY: 0 }); g.set(capB, { scaleY: 1 }); g.set(word, { yPercent: 120 });
    // behind-the-cover swap: kill orbit + flip to the tool while fully hidden, then rise the app in
    let swapped = false;
    const clearParts = () => { try { g.set([document.querySelector('header'), document.querySelector('main')].filter(Boolean), { clearProps: 'transform,opacity' }); } catch (e) { } };
    // instant=true (watchdog/fallback path): mount the tool plain — never start a rise tween on a
    // possibly-starved rAF; a from-tween that can't tick leaves the whole tool frozen dim at 0.4.
    const doSwap = (instant) => {
      if (swapped) return; swapped = true;
      // the cover's landing drift (y −12vh, opacity .5) exists only to sell the hand-off. On desktop
      // the surface unmounts here and takes the transform with it; on a small screen it STAYS mounted
      // as the gate, so clear it at the swap or the copy is left off-centre, dim, and out of the
      // ring the engine centred on it.
      try { if (landing) g.set(landing, { clearProps: 'transform,opacity' }); } catch (e) { }
      persist(() => {
        clearParts();   // clear any block transform a previous, interrupted run may have left behind
        // The tool arrives here exactly as it does under the page loader: its own copy rises out of
        // the masks, rather than the whole page block sliding up as one slab. Same destination, same
        // arrival — the handoff and a cold load into the tool must not look like two different
        // products. Armed behind the cover; the timeline reveals it as the panel's edge clears it.
        if (instant) { this._dropLinesReveal(g); this._listRowsReveal(); return; }   // starved rAF: nothing to tween, just be there
        this._dropRevealed = false;
        this._dropLinesArm();
        this._listRowsArm();
      });
    };
    const tl = g.timeline({ paused: true, onComplete: () => { if (this._wipeWatchdog) { clearTimeout(this._wipeWatchdog); this._wipeWatchdog = null; } layer.style.display = 'none'; clearGuards(); this._wipeClearGuards = null; g.set([panel, capT, capB, word], { clearProps: 'transform' }); this._wipeRunning = false; this._wipeTl = null; focusChrome(); } });
    // Watchdog failsafe: if the timeline stalls (throttled rAF in a backgrounded/embedded frame), the
    // M1 input guards would otherwise lock the whole app. setTimeout fires even when rAF doesn't —
    // force-finish the swap and clear every guard rather than ever leaving the UI inert.
    this._wipeWatchdog = setTimeout(() => {
      this._wipeWatchdog = null;
      if (!this._wipeRunning) return;
      try { if (this._wipeTl) { this._wipeTl.kill(); } } catch (e) { }
      this._wipeTl = null; this._wipeRunning = false;
      layer.style.display = 'none'; clearGuards(); this._wipeClearGuards = null;
      try { g.set([panel, capT, capB, word], { clearProps: 'transform' }); } catch (e) { }
      try { if (landing) g.set(landing, { clearProps: 'transform,opacity' }); } catch (e) { }   // never leave the landing frozen dim
      // the tool must come up even if the cover never played — plain, no tween. If the swap already
      // armed the dropzone copy, force it visible rather than leaving it parked below its masks.
      if (!swapped) doSwap(true); else { clearParts(); try { this._dropLinesReveal(g); this._listRowsReveal(); } catch (e) { } }
      focusChrome();
    }, 4000);
    this._wipeTl = tl;
    // 1 — COVER: panel rises from below with a curved leading edge; landing drifts up for depth
    tl.to(panel, { yPercent: 0, duration: 0.8, ease: this.EASE.entrance }, 0);
    tl.to(capT, { scaleY: 1, duration: 0.8, ease: this.EASE.entrance }, 0);
    if (landing) tl.to(landing, { y: '-12vh', opacity: 0.5, duration: 0.8, ease: this.EASE.entrance }, 0);
    // 2 — BRAND beat: wordmark rises into view from its clip (after the cover lands), held briefly
    tl.to(word, { yPercent: 0, duration: 0.55, ease: this.EASE.entrance }, 0.6);
    tl.call(doSwap, null, 1.0);       // 3 — invisible teardown + state flip, behind the cover
    tl.to({}, { duration: 0.45 }, '>');  // hold so the mark can be read
    // 4 — REVEAL: wordmark exits up through its clip; panel continues up with the curved trailing edge
    tl.to(word, { yPercent: -130, duration: 0.6, ease: this.EASE.exit }, '>-0.05');
    tl.to(panel, { yPercent: -100, duration: 0.9, ease: this.EASE.entrance }, '<');
    tl.to(capB, { scaleY: 0, duration: 0.9, ease: this.EASE.entrance }, '<');
    // dropzone copy rises just behind the panel's trailing edge — same offset the loader's fold uses
    tl.call(() => { this._dropLinesReveal(g); this._listRowsReveal({ delay: 0.12 }); }, null, '<+0.15');
    // built paused: wake the clock first, then pin the playhead to 0.
    try { g.ticker.wake(); } catch (e) { }
    tl.play(0);
    this._wipeArmStallPump(g);
  },

  /* ===== route swap: /, /privacy, /terms =====

     Privacy and terms were their own documents until this method existed, and the wipe between them
     was cut in half — cover here, set location, and have the arriving document paint its own cover
     from an inline <head> snippet and play the second half. Two halves, joined by a sessionStorage
     key, with a browser-controlled gap in the middle that no amount of easing could hide: the
     destination still had to fetch and parse GSAP, ScrollTrigger, a stylesheet and two .otf faces
     before its reveal could start, and the cover just sat there while it did. That is the stall this
     replaces. One timeline now, one document, and the swap in the middle is a setState.

     The choreography is returnToIntro's, beat for beat, because it is the same gesture and should
     not read as a second one. What differs is only what happens behind the cover. */
  _routeDrifters(layer) {
    // The cover's SIBLINGS — never an ancestor. A transform or an opacity below 1 makes an element
    // the containing block for its position:fixed descendants, and the cover is one: move something
    // it lives inside and `inset:0` starts resolving against a document-tall box, so the panel
    // travels the height of the page instead of one screen and lands off-screen. Siblings are the
    // page; the layer is what hides it.
    const host = (layer && layer.parentNode) || document.body;
    return [].filter.call(host.children, (el) => el !== layer && el.tagName !== 'SCRIPT');
  },

  navigateTo(path, options) {
    const opts = options || {};
    const push = opts.push !== false;
    const next = routeFor(path);
    if (next === this.state.route) return;
    this._wipeRecoverStuck();
    if (this._wipeRunning) return;

    const g = window.gsap;
    const layer = document.querySelector('[data-wipe]');
    const commit = (afterCb) => {
      // The address bar moves with the content, not before it — a pushState that lands ahead of the
      // swap is a URL describing a page that is not on screen yet, and a reload in that window
      // serves the wrong one.
      if (push) { try { history.pushState({ route: next }, '', pathFor(next)); } catch (e) { } }
      applyHead(next);
      // A new document starts at the top. Lenis owns the scroll while it is running, so ask it
      // rather than going around it and leaving its internal position stale.
      try { if (this._lenis) this._lenis.scrollTo(0, { immediate: true }); else window.scrollTo(0, 0); } catch (e) { }
      this.setState({ route: next, announce: '' }, afterCb || function () { });
    };

    // Reduced motion, or no GSAP to drive a timeline with: swap outright. The destination still
    // arrives correctly, it simply arrives without the gesture — which is what reduced motion asks
    // for, and the only honest fallback when there is nothing to animate with.
    if (this._reduce || !g || !layer) { this._arrivingByWipe = false; commit(() => this._playLegalReveal()); return; }

    this._wipeRunning = true;
    // Tells LegalPage to ARM its reveals and wait rather than play them on mount. Without it the
    // hero cascade runs behind an opaque panel and the cover lifts on copy that has already
    // finished arriving — the page appears to be simply there, which is the fault this whole
    // change exists to fix.
    this._arrivingByWipe = true;

    const panel = layer.querySelector('[data-wipe-panel]');
    const capT = layer.querySelector('[data-wipe-cap-top]');
    const capB = layer.querySelector('[data-wipe-cap-bottom]');
    const word = layer.querySelector('[data-wipe-word]');
    layer.style.display = 'block';
    layer.style.pointerEvents = 'auto';
    const app = document.querySelector('[data-app]');
    if (app) { try { app.setAttribute('inert', ''); } catch (e) { } }
    const clearGuards = () => {
      this._wipeClearPump();
      layer.style.pointerEvents = 'none';
      document.querySelectorAll('[data-app]').forEach((el) => { try { el.removeAttribute('inert'); } catch (e) { } });
    };
    this._wipeClearGuards = clearGuards;
    // L1: park focus on the transition layer so it isn't stranded on a control that is unmounting.
    try { layer.setAttribute('tabindex', '-1'); layer.focus({ preventScroll: true }); } catch (e) { }

    g.set(panel, { yPercent: 100 }); g.set(capT, { scaleY: 0 }); g.set(capB, { scaleY: 1 }); g.set(word, { yPercent: 120 });
    const parts = this._routeDrifters(layer);

    let swapped = false;
    const doSwap = (instant) => {
      if (swapped) return; swapped = true;
      commit(() => {
        try { g.set(parts, { clearProps: 'transform,opacity' }); } catch (e) { }
        // The tool's own arrival, when it is the destination: its copy rises out of its masks
        // exactly as it does under the loader and after Get Started, rather than the whole page
        // block sliding up as one slab. instant=true is the starved-rAF path — be there, plainly.
        if (!isLegal(next)) {
          if (instant) { this._dropLinesReveal(g); this._listRowsReveal(); return; }
          this._dropRevealed = false;
          this._dropLinesArm();
          this._listRowsArm();
        } else if (instant) {
          this._playLegalReveal();
        }
      });
    };

    const finish = () => {
      if (this._wipeWatchdog) { clearTimeout(this._wipeWatchdog); this._wipeWatchdog = null; }
      layer.style.display = 'none';
      clearGuards(); this._wipeClearGuards = null;
      try { g.set([panel, capT, capB, word], { clearProps: 'transform' }); } catch (e) { }
      this._wipeRunning = false; this._wipeTl = null; this._arrivingByWipe = false;
    };

    const tl = g.timeline({ paused: true, onComplete: finish });
    // Watchdog failsafe: if the timeline stalls (throttled rAF in a backgrounded tab), the inert
    // guard would otherwise lock the whole document. setTimeout fires even when rAF does not —
    // force-finish the swap and clear every guard rather than leaving the UI unreadable and inert.
    this._wipeWatchdog = setTimeout(() => {
      this._wipeWatchdog = null;
      if (!this._wipeRunning) return;
      try { if (this._wipeTl) this._wipeTl.kill(); } catch (e) { }
      this._wipeTl = null; this._wipeRunning = false;
      layer.style.display = 'none';
      clearGuards(); this._wipeClearGuards = null;
      try { g.set([panel, capT, capB, word], { clearProps: 'transform' }); } catch (e) { }
      try { g.set(parts, { clearProps: 'transform,opacity' }); } catch (e) { }   // never leave the page frozen dim
      this._arrivingByWipe = false;
      if (!swapped) doSwap(true); else this._playLegalReveal();
    }, 4000);
    this._wipeTl = tl;

    // 1 — COVER: panel rises over the page; the page drifts up slightly for depth
    tl.to(panel, { yPercent: 0, duration: 0.8, ease: this.EASE.entrance }, 0);
    tl.to(capT, { scaleY: 1, duration: 0.8, ease: this.EASE.entrance }, 0);
    if (parts.length) tl.to(parts, { y: '-6vh', opacity: 0.5, duration: 0.8, ease: this.EASE.entrance }, 0);
    // 2 — BRAND beat
    tl.to(word, { yPercent: 0, duration: 0.55, ease: this.EASE.entrance }, 0.6);
    tl.call(doSwap, null, 1.0);       // 3 — swap the route behind the cover
    tl.to({}, { duration: 0.45 }, '>');   // hold so the mark can be read
    // 4 — REVEAL onto whatever arrived
    tl.to(word, { yPercent: -130, duration: 0.6, ease: this.EASE.exit }, '>-0.05');
    tl.to(panel, { yPercent: -100, duration: 0.9, ease: this.EASE.entrance }, '<');
    tl.to(capB, { scaleY: 0, duration: 0.9, ease: this.EASE.entrance }, '<');
    // The destination's own copy rises just behind the panel's trailing edge — the same offset the
    // loader's fold and Get Started both use, so all three arrivals share one rhythm.
    tl.call(() => {
      if (isLegal(next)) this._playLegalReveal();
      else { this._dropLinesReveal(g); this._listRowsReveal({ delay: 0.12 }); }
    }, null, '<+0.15');
    // built paused: wake the clock first, then pin the playhead to 0.
    try { g.ticker.wake(); } catch (e) { }
    tl.play(0);
    this._wipeArmStallPump(g);
  },

  // LegalPage hands its reveal controller up on mount and takes it back on unmount, so the timeline
  // above has something to release without reaching into the component.
  registerLegalReveal(controller) { this._legalReveal = controller; },
  _playLegalReveal() { const c = this._legalReveal; if (c) { try { c.play(); } catch (e) { } } },
};
