// The masked-window transition between the landing and the tool (both directions) and between the
// four routes: the page that is leaving scales up and dims underneath, and the page that is arriving
// rises from below inside a rounded window that opens to the full screen. With rAF-stall pumps and
// watchdogs so a throttled frame can never strand the ghost or lock the app. See _wipeCover.
import { routeFor, pathFor, isDoc, applyHead, routeName } from '../routes.js';

export const wipeMethods = {
  /* A SURFACE ARRIVES AT ITS OWN TOP.

     Three gestures in this file swap what the reader is looking at without the browser doing a
     navigation, and a document that does not reload keeps whatever scroll offset the last one left
     behind. navigateTo has always closed that hole; the landing pair did not, and the landing is
     position:fixed over the tool rather than instead of it — so a reader who scrolled to the foot of
     the tool, clicked the mark and clicked Create was handed the page back exactly where they left
     it, with the top of the tool a screen and a half above them and nothing on screen to say so.

     Through Lenis rather than around it: it owns the scroll while it is running, and a raw
     window.scrollTo leaves its internal position stale, so the reader's next gesture jumps back to
     where Lenis still thinks it is. Immediate, because every caller is already behind the cover —
     there is nothing to watch travel, and an eased scroll under an opaque panel is only a delay. */
  _scrollToTop() { this._scrollToY(0); },
  /* The same gesture for any offset, and the reason it exists: Back and Forward now restore the
     offset the reader left a document at (navigateTo keeps it on the history entry), and a restore
     has the same two obligations a reset to the top does — through Lenis, and then checked. */
  _scrollToY(y) {
    const target = Math.max(0, y || 0);
    // force, because Lenis declines a programmatic scroll outright while it is stopped — and it is
    // stopped for every surface that takes the wheel off it (the grid's Observer, the phone story).
    // Those are exactly the states a reader leaves behind on the way back to the landing.
    try { if (this._lenis) this._lenis.scrollTo(target, { immediate: true, force: true }); } catch (e) { }
    /* AND THEN CHECK, because Lenis returning early is indistinguishable from Lenis having done it.
       It compares the destination against its own targetScroll and returns if they match — so any
       offset the page acquired WITHOUT passing through it (the browser restoring a position on
       reload, an anchor jump, focus dragging an off-screen control into view) leaves it convinced it
       is already at zero while the reader is 700px down. The native scroll is the floor under that,
       and reset() hands the corrected position straight back so its next frame does not lerp the
       reader back to where it still thought they were. */
    try {
      if (Math.abs(window.scrollY - target) < 1) return;
      window.scrollTo(0, target);
      if (this._lenis) this._lenis.reset();
    } catch (e) { }
  },
  _resetIntroState(afterCb) {
    // journey flags only — palettes, projects, theme untouched.
    // 'palette-generator/landing' is PERMANENT dismissal, not session-scoped: '1' survives reloads so
    // a returning visitor lands straight in the tool. It is deliberately reversible — the logo and the
    // file menu's 'Show intro again' both route here, which writes '0' and shows the landing again.
    try { localStorage.setItem('palette-generator/landing', '0'); } catch (e) { }
    this._orbitRetry = 0;
    // the landing re-seeds per visit (the wheel's rotation, the baked OKLCH ramp and the floor's
    // hexes are cleared in killOrbit). Tear down explicitly rather than relying on getStarted having
    // done it: killOrbit is idempotent, and it is the only thing that releases the field's context.
    this.killOrbit();
    // the tool behind the landing returns to its default state — Get Started must always land on
    // 'Drop a reference' (never a left-open grid view, overlay, drawer, or result)
    this._resetToolState({ landingDismissed: false, announce: 'Intro will show again.' }, () => {
      // The landing covers the tool, it does not replace it, so the offset left behind here is
      // invisible until Get Started uncovers it again. Spend it now, while the cover is down.
      this._scrollToTop();
      setTimeout(() => this.initOrbit(), 0);
      if (afterCb) afterCb();
    });
  },
  /* THE TOOL'S DEFAULT STATE, SAID ONCE. Get Started always lands on 'Drop a reference', never a
     left-open grid view, overlay, drawer or result, and since 15.09.26 so does Explore Atmos at the
     close of /about (openCreate in methods/misc.js), which used to cross straight back into whatever
     the reader had left open. Two callers, one definition, so the two cannot drift; `extra` is each
     caller's own part of the same commit. Palettes, projects and theme are never touched. */
  _resetToolState(extra, afterCb) {
    // the reset unmounts the detail overlay outright (overlay: null below) without going through
    // _finishOverlayClose — force the same teardown deletePalette does. Otherwise a close reversal
    // still in flight fires onReverseComplete onto the landing, announcing over 'Intro will show
    // again.' and focusing a detached tile, which steals focus from the CTA showIntroAgain is
    // retrying to reach. It is also what keeps the open latch from stranding across the journey
    // open a card → logo → Get Started.
    this._ovTl = null; this._ovDone = true; this._ovOpen = false; this._openTileEl = null; this._ovBack = null;
    clearTimeout(this._closeGuard);
    if (this.state.feedView === 'grid') { this.killSpatial(); this._lenisStart(); try { document.documentElement.style.overflow = ''; } catch (e) { } }
    // A view swap caught mid-exit has a queued arrival waiting on it; this reset outranks it. Left
    // alone it would fire after the wipe and pull the reader back into the view they just left.
    this._viewClosing = false; this._viewPending = null;
    /* THE LIBRARY PANEL, TORN DOWN RATHER THAN SWITCHED OFF. It is the one surface here that owns
       something outside its own state — a document-level pointerdown listener, its arrival timeline
       and a close guard — so setting its flag false in the batch below would have left all three
       bound to a panel that no longer exists. _finishTagClose is the drawer's own teardown with the
       exit tween skipped, which is right: the wipe is already covering the screen, so there is
       nothing to watch leave. It also carries the pending project rename out (see
       _commitProjectNames), so a name typed and then interrupted by Get Started still lands. */
    if (this.state.tagMenuOpen) { try { this._finishTagClose(); } catch (e) { } }
    this._genId = (this._genId || 0) + 1; this.stopCanvas();
    if (this._t) clearInterval(this._t); if (this._end) clearTimeout(this._end);
    this.setState(Object.assign({
      backupMenuOpen: false, copyMenuOpen: false, exampleView: false, exampleList: false,
      stage: 'upload', current: null, imageUrl: null, pending: null,
      feedView: 'list', overlay: null, harmony: null, contrast: false, exportOpen: false, exportPalette: null, exportProject: null, assignPalette: null,
      restorePending: null,
    }, extra), afterCb);
  },
  showIntroAgain() {
    this._wipeRunning = false; this._wipePending = false; this._wipeOnMount = null;
    if (this._wipeClearGuards) { try { this._wipeClearGuards(); } catch (e) { } this._wipeClearGuards = null; }
    // fully reset the transition in case a prior one was interrupted (kill its timeline, drop the
    // ghost, put the window back in flow) — so returning to the landing can never inherit a stuck cover.
    if (this._wipeTl) { try { this._wipeTl.kill(); } catch (e) { } this._wipeTl = null; }
    this._wipeTeardownDom();
    this._resetIntroState(() => {
      // L1: focus follows the action — retry until the conditional render has remounted the CTA.
      // Found by [data-glass-cta], NOT by its aria-label. The label was the selector until the
      // landing's action was brought onto .glass-cta and its accessible name had to start with the
      // visible one (WCAG 2.5.3, `Get started` → `Get Started`) — at which point this querySelector
      // silently matched nothing and the focus handoff after every return to the landing just
      // stopped, with no error. A data attribute is a contract; a human-readable string is copy,
      // and copy is meant to be editable without breaking behaviour. orbit.js already reads this
      // same attribute as a geometry mark.
      let tries = 0; const grab = () => { const cta = document.querySelector('button[data-glass-cta]'); if (cta) { try { cta.focus({ preventScroll: true }); } catch (e) { } if (document.activeElement === cta) return; } if (++tries < 12) setTimeout(grab, 60); }; setTimeout(grab, 0);
    });
  },
  /* Focus waits on the sentinel PaletteApp renders beside the window (see its render note). Nothing
     else is safe to hold it: the ghost is aria-hidden and inert, and a focused descendant of an
     aria-hidden element is either refused by the browser or hidden from assistive technology. */
  _parkFocus() {
    const park = document.querySelector('[data-focus-park]');
    if (!park) return;
    try { park.setAttribute('tabindex', '-1'); park.focus({ preventScroll: true }); } catch (e) { }
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
  /* Recover from BOTH stuck shapes: running with no timeline, and running with a timeline that
     already finished or was killed (onComplete missed under a throttled frame). Not while a cover is
     PENDING: between _wipeCover raising the ghost and the commit calling back there is no timeline
     yet by design (see open()), and a second gesture landing in that gap must be refused, not read
     as a stall — the watchdog covers the case where the callback never comes.

     `parent`, NOT isActive(). A timeline is only active once the ticker has rendered it, and the
     route swap is a long task: measured, a second click 50ms after play() found the timeline still
     un-ticked, read it as stuck, killed it and started a second gesture over the first. GSAP drops a
     killed timeline from its parent, and the root timeline drops a finished one, so a null parent
     is exactly "dead", from the first millisecond, whatever the ticker has managed. */
  _wipeRecoverStuck() {
    const tl = this._wipeTl;
    const stuck = this._wipeRunning && !this._wipePending && (!tl || !tl.parent || tl.progress() >= 1);
    if (stuck) {
      this._wipeRunning = false;
      if (tl) { try { tl.kill(); } catch (e) { } }
      this._wipeTl = null;
      if (this._wipeClearGuards) { try { this._wipeClearGuards(); } catch (e) { } } this._wipeClearGuards = null;
      this._wipeClearPump();
      if (this._wipeWatchdog) { clearTimeout(this._wipeWatchdog); this._wipeWatchdog = null; }
      this._wipeTeardownDom();
    }
  },
  /* THE TWO LANDING GESTURES, ON THE SHARED COVER. Both used to carry a full copy of the panel
     timeline — the same choreography as navigateTo, written out three times, which is how three
     transitions that are nearly the same become three that are visibly different six months later
     (the argument _wipeCover's header makes). They now hand the cover only what is genuinely their
     own: what to swap behind the ghost, what to arm, what to release, and where focus lands. */

  // Logo / menu return path: the tool leaves, the landing arrives in the window. Falls back to the
  // instant showIntroAgain reset when there is nothing to animate with.
  returnToIntro() {
    this._wipeRecoverStuck();
    if (!this.state.landingDismissed || this._wipeRunning) return;
    const g = window.gsap;
    if (this._reduce || !g || !this._windowEl()) { this.showIntroAgain(); return; }
    this._wipeCover({
      // Arm the statement lines the moment the landing mounts, before the window opens on it — the
      // same reason as the loader: the window must never open onto text already sitting at its
      // final position.
      commit: (after) => this._resetIntroState(() => { this._landingTextArm(g); after(); }),
      reveal: () => this._landingTextReveal(g),
      reduced: () => { },
      // Found by [data-glass-cta], NOT by its aria-label: the label is copy and moved once already
      // (WCAG 2.5.3, `Get started` → `Get Started`), which silently broke a selector that read it.
      focusTarget: () => document.querySelector('button[data-glass-cta]'),
    });
  },
  getStarted() {
    this._wipeRecoverStuck();
    if (this.state.landingDismissed || this._wipeRunning) return;
    const g = window.gsap;
    // 'palette-generator/landing' is PERMANENT dismissal, not session-scoped: '1' survives reloads so
    // a returning visitor lands straight in the tool. Reversible — see _resetIntroState.
    const persist = (afterCb) => {
      try { localStorage.setItem('palette-generator/landing', '1'); } catch (e) { }
      // After the snapshot (the cover takes it before commit), so the field is still alive to be
      // copied into the ghost; before the tool arrives, so no context is held open behind it.
      this.killOrbit();
      // The landing covers the tool rather than replacing it, so the offset left behind here was
      // invisible until now. Spend it before the window opens on the tool.
      this.setState({ landingDismissed: true }, () => { this._scrollToTop(); if (afterCb) afterCb(); });
    };
    this._wipeCover({
      commit: persist,
      // The tool arrives here exactly as it does under the page loader: its own copy rises out of
      // the masks inside the window, rather than simply being there when it opens. instant=true is
      // the starved-rAF path — be there, plainly.
      arm: (instant) => {
        if (instant) { this._dropLinesReveal(g); this._listRowsReveal(); return; }
        this._dropRevealed = false;
        this._dropLinesArm();
        this._listRowsArm();
      },
      reveal: () => { this._dropLinesReveal(g); this._listRowsReveal({ delay: 0.12 }); },
      reduced: () => { },
      focusTarget: () => document.querySelector('header [data-focus="chrome"]') || document.querySelector('[data-focus="chrome"]'),
    });
  },

  /* ===== route swap: /, /about, /privacy, /terms =====

     Privacy and terms were their own documents until this method existed, and the wipe between them
     was cut in half — cover here, set location, and have the arriving document paint its own cover
     from an inline <head> snippet and play the second half. Two halves, joined by a sessionStorage
     key, with a browser-controlled gap in the middle that no amount of easing could hide: the
     destination still had to fetch and parse GSAP, ScrollTrigger, a stylesheet and two .otf faces
     before its reveal could start, and the cover just sat there while it did. That is the stall this
     replaces. One timeline now, one document, and the swap in the middle is a setState.

     The choreography is returnToIntro's, beat for beat, because it is the same gesture and should
     not read as a second one. What differs is only what happens behind the cover. */
  /* WHAT FADES ON THE SHORT CROSSING. Only _wipeQuick reads this now, and only for opacity.

     NEVER [data-app] ITSELF, always its children, and never a transform on any of them: a transform
     makes an element the containing block for its position:fixed descendants, so moving a content
     root re-resolves every drawer, the brand mark, About's section dock and its three ScrollTrigger
     pins against a document-tall box. Measured at scrollY 6000 on /about, the dock went from 951px to
     27,367px. Opacity is safe — only the transform establishes the containing block — which is why
     the full gesture never touches the live page at all: it scales a fixed, viewport-sized SNAPSHOT
     (see _snapshotPage) and leaves the real document exactly where it is. */
  _routeDrifters() {
    const app = document.querySelector('[data-app]');
    const shift = [], dim = [];
    if (!app) return { shift: shift, dim: dim, all: [] };
    [].forEach.call(app.children, (el) => {
      if (el.tagName === 'SCRIPT') return;
      (el.hasAttribute('data-holds-fixed') ? dim : shift).push(el);
    });
    return { shift: shift, dim: dim, all: shift.concat(dim) };
  },

  navigateTo(path, options) {
    const opts = options || {};
    const push = opts.push !== false;
    const next = routeFor(path);
    const from = this.state.route;
    if (next === from) return;
    this._wipeRecoverStuck();
    if (this._wipeRunning) return;

    /* WHICH GESTURE. The masked window is the site's way of saying "you are somewhere else now",
       and it stays for the crossings where that is true: the tool or the landing on one side, a
       document on the other. Two crossings never earned it. Privacy to terms is one sentence's link
       between two statements that share a masthead, and Back and Forward are the browser's own
       gesture, which a reader expects answered rather than performed — and a pop restores a scroll
       offset, which a window that opens on the top of a page cannot show. They take a short
       crossfade instead (_wipeQuick: DUR.fast out, DUR.state in) and keep everything else the cover
       guarantees: the inert guard, the parked focus, the watchdog, the announced destination. */
    const quick = !push || (isDoc(from) && isDoc(next));
    /* WHERE THE READER WAS. A pushed navigation records the departing page's offset on the entry it
       is leaving, and a pop reads the destination's back off its own. Every arrival used to be forced
       to the top, so Back from /privacy landed a reader at the top of an /about they had left 4800px
       into. Restored AFTER the swap, because the offset has to exist in the arriving document first. */
    if (push) { try { history.replaceState(Object.assign({}, history.state || {}, { route: from, scrollY: window.scrollY }), ''); } catch (e) { } }
    const restoreY = push ? 0 : Math.max(0, opts.scrollY || 0);

    const commit = (afterCb) => {
      // The address bar moves with the content, not before it — a pushState that lands ahead of the
      // swap is a URL describing a page that is not on screen yet, and a reload in that window
      // serves the wrong one.
      if (push) { try { history.pushState({ route: next, scrollY: 0 }, '', pathFor(next)); } catch (e) { } }
      applyHead(next);
      // A new document starts at the top — see _scrollToTop, which the landing pair now shares. A
      // history move goes back to where it was, once the document is there to scroll (below).
      if (!restoreY) this._scrollToTop();
      // The live region NAMES the destination. It used to be cleared here, which meant a route
      // change said nothing at all: no reload, no focus move of its own, and a <title> swap that
      // screen readers do not reliably announce. The page is the only thing that changed, so the
      // page is what gets said.
      this.setState({ route: next, announce: routeName(next) + ' page.' }, () => { if (restoreY) this._scrollToY(restoreY); (afterCb || function () { })(); });
    };

    // The cover is _wipeCover's; only these four decisions are the route's. The comments that used to
    // sit inline with them are kept at their new call sites.
    this._wipeCover({
      quick,
      commit,
      // A document is lazy; the window waits for it to mount in flow. The tool is never lazy.
      awaitMount: isDoc(next),
      // The tool's own arrival, when it is the destination: its copy rises out of its masks exactly
      // as it does under the loader and after Get Started, rather than the whole page block sliding
      // up as one slab. instant=true is the starved-rAF path — be there, plainly.
      arm: (instant) => {
        if (!isDoc(next)) {
          if (instant) { this._dropLinesReveal(window.gsap); this._listRowsReveal(); return; }
          this._dropRevealed = false;
          this._dropLinesArm();
          this._listRowsArm();
        } else if (instant) {
          this._playPageReveal();
        }
      },
      // The destination's own copy rises just behind the panel's trailing edge — the same offset the
      // loader's fold and Get Started both use, so all three arrivals share one rhythm.
      reveal: () => {
        if (isDoc(next)) this._playPageReveal();
        else { this._dropLinesReveal(window.gsap); this._listRowsReveal({ delay: 0.12 }); }
      },
      reduced: () => this._playPageReveal(),
    });
  },

  /* THE COVER, WITHOUT THE ROUTE.

     This used to be the back half of navigateTo, reachable only by changing this.state.route. That
     was fine while a route change was the only thing in the product big enough to deserve it — and it
     stopped being true when the phone story gained a cycle of its own: the takeover offers another
     palette, a picker takes the choice, and the story restarts from 1.1 telling the same eight
     chapters about a different photograph. That is a new document by every measure a reader has.

     The alternative was a second timeline shaped like this one, which is how two transitions that are
     nearly the same become two transitions that are visibly different six months later. So the
     mechanism lives here whole — the snapshot, the window, the inert guard, the focus hand-off, the
     4s watchdog and the stall pump — and the caller supplies only the things that are genuinely its
     own:

       commit(afterCb)  swap the content while the ghost covers the screen
       arm(instant)     park the destination's reveals, called inside commit's callback
       reveal()         release them, called as the window opens
       reduced()        what arrival means when there is no animation to arrive with
       focusTarget()    where focus lands, when the default (the destination's <main>) is wrong

     THE GESTURE. The page that is leaving scales up (1 → 1.2) and drifts up 10vh while a black veil
     over it reaches 20%: it recedes, the way a surface does when something comes forward in front of
     it. The page that is arriving rises from half a screen below inside a window clipped to a rounded
     rectangle at the centre of the screen — inset(50% round 3em) — that opens to the full viewport as
     it lands. 1.2s, all four movements on one curve (EASE.fold, the arrival curve the overlays
     already share), and no brand beat: the mark was the old panel's reason to hold the screen for
     0.45s, and a window that shows the destination from its first frame has nothing to hold for.

     TWO PAGES ON SCREEN AT ONCE, in an app where a route swap is a setState. The departing page and
     the arriving one never coexist in the DOM — AppView returns one of them — so "the current page
     underneath" is a SNAPSHOT: _snapshotPage clones [data-app] into a fixed, viewport-sized host,
     scrolls the host to where the reader was, and copies every canvas's pixels across (a cloned
     canvas is blank). The clone is inert, aria-hidden and pointer-transparent, and it is the only
     thing that gets transformed, which is what keeps the live document's fixed descendants where
     they belong (see _routeDrifters). The arriving page is the live [data-app], inside the
     [data-page-window] wrapper PaletteApp renders around AppView on every route; the wrapper becomes
     position:fixed, inset:0, overflow:clip for the length of the gesture and returns to flow after,
     so nothing the arriving page owns is ever moved or cloned.

     ORDER MATTERS. The window is set fixed and pushed down AFTER commit's callback, not before: a
     document route creates its ScrollTriggers at mount, and a mount inside a wrapper translated 50vh
     would measure every start 50vh late. Belt and braces, finish() refreshes ScrollTrigger and
     resizes Lenis once the wrapper is back in flow — a lazy chunk can land mid-gesture. */
  _windowEl() { return document.querySelector('[data-page-window]'); },

  /* THE SNAPSHOT. Everything a reader can see of the departing page, frozen, in a box that scrolls
     to where they were rather than offsetting the clone: overflow:hidden makes the host a scroll
     container, so position:sticky inside the clone resolves against it exactly as it did against the
     viewport, and the host's transform makes it the containing block for the clone's fixed children
     (the landing, the mark, the dock) so they land where they were too — once _ghostPinFixed has
     undone the host's scroll for them. ids are stripped so no getElementById in a running module can
     find a copy; [data-app] is kept, for the stylesheets, and see below for why that is safe.

     AND EVERY DATA ATTRIBUTE THE STYLESHEETS DO NOT USE IS STRIPPED, because ids were never the
     only way in. This app finds its surfaces by data attribute from the document: the landing's
     engine looks up [data-orbit] and its floor, bloom and grain; the tool's arrival asks whether
     [data-land-line] is on the page. Whenever the live element had gone and the copy was still on
     screen, the copy answered. Measured leaving the landing for /about, before this: the engine
     built a second WebGL field inside the ghost, ~440 mutations in 1.5s, and a newly rolled palette
     in three rounds of four — the example the reader was looking at changed while it receded. And
     Get Started found the ghost's landing lines, took the landing to be still up, and skipped
     parking the tool's copy, which sat in place and then jumped down to rise. What CSS selects on
     stays, so the copy looks exactly the same; what exists only for JavaScript to find goes. The
     set is read off the live stylesheets (_ghostCssAttrs), so a new hook needs no entry here and a
     new rule cannot lose its styling.

     THE FIELD IS RENDERED ONCE MORE before it is copied. Its drawing buffer is valid only between
     renderer.render() and the end of the task (preserveDrawingBuffer is off, deliberately — see
     nebulaField), so a drawImage from a click handler reads an empty canvas. renderStill puts a frame
     in the buffer in this task; the copy that follows reads it. */
  _snapshotPage() {
    const app = document.querySelector('[data-app]');
    if (!app) return null;
    /* ONLY WHAT CAN BE SEEN. The landing is position:fixed, inset:0 and opaque over the tool, so
       while it is up the whole tool underneath — header, dropzone, every library row — is in the
       DOM and invisible. Cloning and painting it anyway was the largest single cost of the Get
       Started click: measured as Interaction to Next Paint, 88–136ms with the full clone against
       48ms with no snapshot at all, and the paint of that first ghost frame is what the reader is
       waiting on. With the landing up, the snapshot is the landing, the mark and the floating header
       standing on it, nothing else.

       NOT ON A PHONE. There the landing is not a cover but the ground floor: the story, the example
       list and the share view all stand over it, and it is up on every one of them. Cloning only the
       landing there swapped the page the reader was on — the foot of the story, say — for the colour
       field and its "Based on" thumbnail in the first frame of the gesture. */
    const landing = app.querySelector('[data-landing]');
    const landingUp = !!landing && !this.state.landingDismissed && !this.state.narrow;
    const host = document.createElement('div');
    host.setAttribute('data-page-ghost', '1');
    host.setAttribute('aria-hidden', 'true');
    host.setAttribute('inert', '');
    host.style.cssText = 'position:fixed;inset:0;z-index:159;overflow:hidden;pointer-events:none;background:var(--surface);will-change:transform;transform:translate3d(0,0,0);transform-origin:50% 50%;';
    // pairs: each live subtree and its copy, in the same shape, for the fixed-element pass below.
    let clone, source, pairs;
    if (landingUp) {
      // The same box the app root would give it, so the fixed landing inside resolves the same way.
      source = document.createElement('div');
      const landingCopy = landing.cloneNode(true);
      source.appendChild(landingCopy);
      pairs = [[landing, landingCopy]];
      const mark = app.querySelector(':scope > [data-logo]');
      if (mark) { const markCopy = mark.cloneNode(true); source.appendChild(markCopy); pairs.push([mark, markCopy]); }
      // And the floating header, which stands on the landing now. Last, so the canvas copy below
      // still pairs the landing's canvases with its own; the header draws none.
      const nav = app.querySelector(':scope > [data-float-nav]');
      if (nav) { const navCopy = nav.cloneNode(true); source.appendChild(navCopy); pairs.push([nav, navCopy]); }
      clone = source;
      source = landing;
    } else {
      clone = app.cloneNode(true);
      source = app;
      pairs = [[app, clone]];
    }
    /* [data-app] STAYS ON THE COPY. It used to be renamed, so no querySelector could find it — but
       the phone's stacking and allow-list rules are scoped to it ("[data-app]:not(.doc-route) >
       .site-foot" is what lifts the footer above the landing), and without it the footer's copy fell
       behind the landing's the moment the landing's copy was put back where it belongs (see
       _ghostPinFixed): the foot of the story became the colour field. A single querySelector still
       finds the live root, which always precedes the ghost in the document; the two document-wide
       querySelectorAll calls, the inert guards' clear, run after the ghost has been removed. The
       landing-only snapshot's wrapper takes it too, so both copies match the same rules. */
    if (landingUp) clone.setAttribute('data-app', '1');
    const keep = this._ghostCssAttrs();
    const scrub = (el) => {
      if (el.id) el.removeAttribute('id');
      const at = el.attributes;
      for (let i = at.length - 1; i >= 0; i--) {
        const n = at[i].name;
        if (n.startsWith('data-') && !keep.has(n)) el.removeAttribute(n);
      }
    };
    try { scrub(clone); clone.querySelectorAll('*').forEach(scrub); } catch (e) { }
    // After the scrub, which would otherwise take this too.
    clone.setAttribute('data-ghost-app', '1');
    try { if (this._nebula) this._nebula.renderStill(this._orbit ? this._orbit.rot : 0); } catch (e) { }
    /* AT HALF RESOLUTION. The copy is drawn under a veil, scaled up 1.2x and gone in 1.2s; a
       full-DPR copy of the field costs a second upload of a 2880x1800 texture in the click's own
       frame for a difference nobody can see. The canvas keeps its CSS box, so it covers the same
       area. */
    const srcCv = source.querySelectorAll('canvas'), dstCv = clone.querySelectorAll('canvas');
    srcCv.forEach((src, i) => {
      const dst = dstCv[i]; if (!dst) return;
      try {
        if (!src.width || !src.height) return;
        const w = Math.max(1, Math.round(src.width / 2)), h = Math.max(1, Math.round(src.height / 2));
        dst.width = w; dst.height = h;
        const c = dst.getContext('2d');
        if (c) c.drawImage(src, 0, 0, w, h);
      } catch (e) { }
    });
    const veil = document.createElement('div');
    veil.style.cssText = 'position:absolute;inset:0;background:#000;opacity:0;pointer-events:none;z-index:2147483000;';
    host.appendChild(clone); host.appendChild(veil);
    const scrollY = window.scrollY || 0;
    document.body.appendChild(host);
    try { host.scrollTop = scrollY; } catch (e) { }
    // After the scroll, and by the offset the host actually took: a snapshot with nothing in flow
    // (the landing and the mark) cannot scroll at all, and its fixed copies are already in place.
    try { this._ghostPinFixed(pairs, host.scrollTop); } catch (e) { }
    return { host, veil };
  },
  /* FIXED ELEMENTS STAY WHERE THEY WERE ON SCREEN.

     The host's transform makes it the containing block for every position:fixed copy inside it,
     and the host is also the scroller. A fixed box resolved against a scroll container is placed in
     its CONTENT, so it scrolls with the page: every fixed copy ended up exactly the host's scroll
     offset above where the reader saw it. At the top of a page that offset is zero and nothing
     showed. Deep in /about it was the whole screen — measured at 9000px, the pinned "01 Hue" slide
     and the section dock were both gone from the first frame of the gesture, and the ghost differed
     from the page it was copied from by 83%.

     So each copy of an element the browser lays out against the viewport is moved back down by that
     offset, ahead of whatever transform it already had. Its descendants move with it and are
     skipped. A fixed element under a transformed, filtered or contained ancestor is left alone,
     because that ancestor was already its containing block on the live page and it scrolled there
     too. Only runs when the page is scrolled; the read is one computed position per element. */
  _ghostPinFixed(pairs, dy) {
    if (!(dy > 0) || !pairs) return;
    const againstViewport = (el) => {
      for (let a = el.parentElement; a && a !== document.documentElement; a = a.parentElement) {
        const cs = getComputedStyle(a);
        if (cs.transform !== 'none' || cs.filter !== 'none' || cs.perspective !== 'none'
          || (cs.backdropFilter && cs.backdropFilter !== 'none')
          || /transform|filter|perspective/.test(cs.willChange)
          || /paint|layout|strict|content/.test(cs.contain)) return false;
      }
      return true;
    };
    pairs.forEach(([src, dst]) => {
      const S = [src].concat([].slice.call(src.querySelectorAll('*')));
      const D = [dst].concat([].slice.call(dst.querySelectorAll('*')));
      if (S.length !== D.length) return;
      for (let i = 0; i < S.length; i++) {
        const cs = getComputedStyle(S[i]);
        if (cs.position !== 'fixed') continue;
        if (againstViewport(S[i])) {
          const t = cs.transform;
          // Transitions off first: the skip link eases its transform, and a copy that slides into
          // place is the very movement this pass exists to prevent.
          D[i].style.transition = 'none';
          D[i].style.transform = 'translateY(' + dy + 'px)' + (t && t !== 'none' ? ' ' + t : '');
        }
        i += S[i].querySelectorAll('*').length;
      }
    });
  },
  /* THE DATA ATTRIBUTES THE STYLESHEETS SELECT ON — the ones the snapshot must keep. Read from
     document.styleSheets, walking into @media, @supports and nested rules, and cached against the
     sheet count: the set only changes when a stylesheet is added. Every sheet on this site is
     same-origin, so cssRules is readable; one that is not is skipped rather than guessed at. */
  _ghostCssAttrs() {
    const sheets = document.styleSheets;
    const sig = sheets.length;
    if (this._ghostAttrs && this._ghostAttrsSig === sig) return this._ghostAttrs;
    const keep = new Set();
    const re = /\[\s*(data-[\w-]+)/g;
    const walk = (rules) => {
      for (let i = 0; i < rules.length; i++) {
        const r = rules[i];
        if (r.selectorText) { re.lastIndex = 0; let m; while ((m = re.exec(r.selectorText))) keep.add(m[1].toLowerCase()); }
        if (r.cssRules && r.cssRules.length) walk(r.cssRules);
        if (r.styleSheet) { try { walk(r.styleSheet.cssRules); } catch (e) { } }
      }
    };
    for (let i = 0; i < sheets.length; i++) {
      let rules = null;
      try { rules = sheets[i].cssRules; } catch (e) { }
      if (rules) walk(rules);
    }
    this._ghostAttrs = keep; this._ghostAttrsSig = sig;
    return keep;
  },
  // Drop the ghost and put the window back in flow. Idempotent; every exit path lands here.
  _wipeTeardownDom() {
    document.querySelectorAll('[data-page-ghost]').forEach((el) => { try { el.remove(); } catch (e) { } });
    const win = this._windowEl();
    if (win) { try { win.removeAttribute('style'); } catch (e) { } }
  },

  _wipeCover(opts) {
    const g = window.gsap;
    const win = this._windowEl();
    const commit = opts.commit;
    const arm = opts.arm || function () { };
    const reveal = opts.reveal || function () { };
    const reduced = opts.reduced || function () { };
    // Down for the length of this cover; release() raises it. Read by registerPageReveal.
    this._wipeReleased = false;
    /* THE ARMED STORY IS RELEASED HERE, NOT BY EACH CALLER, and that is a bug fix.

       _syncStory holds the phone story's page reveal instead of playing it whenever a cover is up, so
       the copy does not finish arriving behind the ghost. Whoever raised the cover has to let it go.
       chooseStoryCase does. navigateTo did NOT: its reveal branches on isDoc(next), and the phone
       story lives at '/', which is the tool's route — so it released _dropLinesReveal and
       _listRowsReveal, the desktop tool's own arrivals, and the story stayed armed for good. Measured
       after navigating /about -> /: all seven section headings and every [data-reveal] block sitting
       at inline opacity 0 with no tween, the whole page invisible below the hero.

       Releasing it from here rather than fixing that one branch is the same call [ATMOS 11] makes in
       aboutStickyTitle: a contract every caller must remember is one a caller will eventually forget,
       and the failure mode is a blank page. _playStoryReveal is a no-op unless something is actually
       armed, so calling it on every path costs nothing and cannot double-play. */
    const release = () => {
      this._wipeReleased = true;
      try { reveal(); } catch (e) { }
      try { this._playStoryReveal(); } catch (e) { }
    };
    /* WHERE FOCUS LANDS, when the destination is not a page. The default below is right for a route:
       the new document's <main>, named and at the top. It is wrong for a surface that arrives as a
       DIALOG — the picker is rendered inside [data-app], so focusing [data-app] main would put the
       keyboard on the story the dialog is covering, which is aria-hidden and inert underneath it —
       and for the two landing gestures, which hand focus to a control (the chrome's first control,
       the landing's CTA). A caller that knows better returns its own element. */
    const pickTarget = opts.focusTarget || function () {
      const app = document.querySelector('[data-app]');
      return (app && app.querySelector('main')) || app;
    };

    /* The cover takes focus while the swap happens (so it is never stranded on a control that is
       unmounting), and this hands it on: without it every route change dropped the keyboard to <body>
       and the next Tab started again from the top of the document. tabindex -1 makes a landmark
       programmatically focusable without joining the tab order — and is only written onto something
       that is not focusable already, because it would take a button OUT of the tab order. Retried on
       a 60ms cadence as the element belongs to a route that has only just been rendered. */
    const focusDestination = () => {
      let tries = 0;
      const grab = () => {
        const target = pickTarget();
        if (target) {
          try { if (target.tabIndex < 0) target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true }); } catch (e) { }
          if (document.activeElement === target) return;
        }
        if (++tries < 12) setTimeout(grab, 60);
      };
      setTimeout(grab, 0);
    };

    // Reduced motion, or no GSAP to drive a timeline with: swap outright. The destination still
    // arrives correctly, it simply arrives without the gesture — which is what reduced motion asks
    // for, and the only honest fallback when there is nothing to animate with. Focus still moves:
    // asking for less motion is not asking to be left on <body>.
    if (this._reduce || !g || !win) { this._arrivingByWipe = false; this._wipeReleased = true; commit(() => { reduced(); try { this._playStoryReveal(); } catch (e) { } focusDestination(); }); return; }

    this._wipeRunning = true; this._wipePending = false;
    // Tells the arriving document route to ARM its reveals and wait rather than play them on mount.
    // Without it the hero cascade runs while the window is still a slot at the centre of the screen
    // and the window opens on copy that has already finished arriving — the page appears to have
    // simply been there. About takes it on exactly the same terms the two statements do, which is
    // what makes /about ↔ /privacy read as one gesture rather than as two products.
    this._arrivingByWipe = !opts.quick;
    // The short crossing. Everything above this line is shared; everything below is the window's.
    if (opts.quick) { this._wipeQuick({ commit, arm, release, focusDestination }); return; }

    // The ghost first, while the departing page is still the live one: from here the reader is
    // looking at the snapshot, and everything the commit does to the document happens behind it.
    this._wipeTeardownDom();
    const ghost = this._snapshotPage();
    const app = document.querySelector('[data-app]');
    if (app) { try { app.setAttribute('inert', ''); } catch (e) { } }
    const clearGuards = () => {
      this._wipeClearPump();
      document.querySelectorAll('[data-app]').forEach((el) => { try { el.removeAttribute('inert'); } catch (e) { } });
      this._syncAppInert(true);
    };
    this._wipeClearGuards = clearGuards;
    // L1: park focus on the sentinel so it isn't stranded on a control that is unmounting.
    this._parkFocus();

    const settle = () => {
      // The document is back in flow at the top; anything that measured it through the window
      // re-measures now. Both are no-ops for a page that owns neither.
      try { if (window.ScrollTrigger) window.ScrollTrigger.refresh(); } catch (e) { }
      try { if (this._lenis) this._lenis.resize(); } catch (e) { }
    };
    const finish = () => {
      if (this._wipeWatchdog) { clearTimeout(this._wipeWatchdog); this._wipeWatchdog = null; }
      this._wipeTeardownDom();
      clearGuards(); this._wipeClearGuards = null;
      this._wipeRunning = false; this._wipePending = false; this._wipeTl = null; this._arrivingByWipe = false; this._wipeOnMount = null;
      settle();
      // Belt and braces. release() runs as the window opens, but _syncStory can arm AFTER that if a
      // late commit rebuilds the surface while the flag is still up. This is the last moment the flag
      // is true, so it is the last chance to notice. Idempotent, as above.
      try { this._playStoryReveal(); } catch (e) { }
      focusDestination();
    };

    let swapped = false, opened = false;
    const open = () => {
      if (opened || !this._wipeRunning) return; opened = true;
      // The window: fixed, viewport-sized, clipped to a rounded slot at its centre, half a screen
      // down. Set only now, after the destination has rendered and measured itself in flow.
      g.set(win, { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, width: '100%', overflow: 'clip', zIndex: 160, yPercent: 50, willChange: 'transform, clip-path', clipPath: 'inset(50% round 3em)' });
      const tl = g.timeline({ paused: true, onComplete: finish });
      this._wipeTl = tl;
      const ease = this.EASE.fold;
      // The ghost recedes: up, larger, and under a veil — all three on the window's clock.
      if (ghost) {
        tl.to(ghost.veil, { opacity: 0.2, duration: 1.2, ease }, 0);
        tl.to(ghost.host, { y: '-10vh', scale: 1.2, duration: 1.2, ease }, 0);
      }
      // The window lands a beat before it has fully opened, so the last of the clip clears a page
      // that has already stopped moving.
      tl.to(win, { yPercent: 0, duration: 1.0, ease }, 0);
      tl.to(win, { clipPath: 'inset(0% round 0em)', duration: 1.2, ease }, 0);
      // The destination's own copy rises inside the window as it opens: early enough to be seen
      // arriving through the slot, late enough that the slot is already something to see it in.
      tl.call(release, null, 0.2);
      // built paused: a fresh unpaused timeline inserted against a SLEEPING ticker inherits a stale
      // parent playhead — wake the clock FIRST, then pin the playhead to 0.
      try { g.ticker.wake(); } catch (e) { }
      tl.play(0);
      this._wipePending = false;
      this._wipeArmStallPump(g);
    };
    /* THE WINDOW WAITS FOR THE PAGE TO BE THERE. The two document routes are lazy, and React mounts a
       lazy page in a later task even when its chunk is already loaded — so commit's callback fires
       on the Suspense hole, and the page used to mount a few hundred milliseconds later INSIDE the
       fixed, clipped, transformed window. Measured in WebKit: About's 72 ScrollTrigger creations and
       two refreshes cost ~330ms of main thread on a cold load in flow, and 1,036ms in one frame when
       they ran inside the window — a stall a quarter of the way through the gesture. In flow, before
       the window is set, the same work costs what it costs on a cold load and finishes before
       anything moves. The page announces its mount through registerPageReveal (the same call the
       release relies on); the wait is capped so a chunk that never lands cannot hold the gesture. */
    const waitMount = () => {
      let done = false;
      const go = () => {
        if (done) return; done = true;
        this._wipeOnMount = null; clearTimeout(cap);
        // One frame, so the mount's own layout is settled before the window's first transform.
        requestAnimationFrame(() => open());
      };
      const cap = setTimeout(go, 600);
      this._wipeOnMount = go;
    };
    const doSwap = (instant) => {
      if (swapped) return; swapped = true;
      commit(() => {
        arm(instant);
        if (instant) return;
        if (opts.awaitMount && !this._pageReveal) waitMount(); else open();
      });
    };

    // Watchdog failsafe: if the timeline stalls (throttled rAF in a backgrounded tab), or the commit
    // never calls back, the inert guard would otherwise lock the whole document. setTimeout fires
    // even when rAF does not — force-finish the swap and clear every guard rather than leaving the
    // UI unreadable and inert.
    this._wipeWatchdog = setTimeout(() => {
      this._wipeWatchdog = null;
      if (!this._wipeRunning) return;
      try { if (this._wipeTl) this._wipeTl.kill(); } catch (e) { }
      this._wipeTl = null; this._wipeRunning = false; this._wipePending = false; this._wipeOnMount = null;
      this._wipeTeardownDom();
      clearGuards(); this._wipeClearGuards = null;
      this._arrivingByWipe = false;
      settle();
      // Through the caller's own reveal, not _playPageReveal directly: on the tool route that call
      // released a document controller belonging to a page that is no longer mounted, so the arriving
      // copy stayed parked. reveal() is what each caller already says its arrival means.
      if (!swapped) doSwap(true); else release();
      focusDestination();   // a killed timeline must not strand focus on the sentinel either
    }, 4000);

    // Swap now, behind the ghost. The window opens from commit's callback — see open(). Pending
    // until it does, so a second gesture in the gap is refused rather than mistaken for a stall.
    this._wipePending = true;
    doSwap(false);
  },

  /* THE CROSSFADE, for the crossings that do not earn the window — see navigateTo. The departing
     content fades on DUR.fast, the route swaps, the arriving content fades in on DUR.state while its
     own copy rises out of its masks (the tool's drop lines and rows through arm/release; a document
     plays its own reveal on mount, which is why _arrivingByWipe is false here). Guards, watchdog,
     stall pump and focus hand-off are the window's, so the two gestures fail the same way. */
  _wipeQuick(ctx) {
    const g = window.gsap;
    const app = document.querySelector('[data-app]');
    if (app) { try { app.setAttribute('inert', ''); } catch (e) { } }
    const clearGuards = () => { this._wipeClearPump(); document.querySelectorAll('[data-app]').forEach((el) => { try { el.removeAttribute('inert'); } catch (e) { } }); this._syncAppInert(true); };
    this._wipeClearGuards = clearGuards;
    this._parkFocus();
    const parts = this._routeDrifters();
    let swapped = false;
    const doSwap = () => {
      if (swapped) return; swapped = true;
      ctx.commit(() => {
        try { g.set(parts.all, { clearProps: 'opacity' }); } catch (e) { }
        const arrived = this._routeDrifters().all;
        try { g.set(arrived, { opacity: 0 }); g.to(arrived, { opacity: 1, duration: this.DUR.state, ease: this.EASE.entrance, clearProps: 'opacity' }); } catch (e) { }
        ctx.arm(false);
        // A frame later, so the arriving copy starts from its armed state — the same beat every
        // other arrival takes behind the panel's trailing edge.
        requestAnimationFrame(() => { try { ctx.release(); } catch (e) { } });
      });
    };
    const finish = () => {
      if (this._wipeWatchdog) { clearTimeout(this._wipeWatchdog); this._wipeWatchdog = null; }
      clearGuards(); this._wipeClearGuards = null;
      this._wipeRunning = false; this._wipeTl = null; this._arrivingByWipe = false;
      try { this._playStoryReveal(); } catch (e) { }
      ctx.focusDestination();
    };
    const tl = g.timeline({ paused: true, onComplete: finish });
    this._wipeWatchdog = setTimeout(() => {
      this._wipeWatchdog = null;
      if (!this._wipeRunning) return;
      try { if (this._wipeTl) this._wipeTl.kill(); } catch (e) { }
      this._wipeTl = null; this._wipeRunning = false;
      clearGuards(); this._wipeClearGuards = null;
      try { g.set(this._routeDrifters().all, { clearProps: 'opacity' }); } catch (e) { }
      this._arrivingByWipe = false;
      if (!swapped) doSwap(); else { try { ctx.release(); } catch (e) { } }
      ctx.focusDestination();
    }, 2500);
    this._wipeTl = tl;
    tl.to(parts.all, { opacity: 0, duration: this.DUR.fast, ease: this.EASE.exit }, 0);
    tl.call(doSwap, null, this.DUR.fast);
    tl.to({}, { duration: this.DUR.state + 0.06 });   // room for the arrival tween the swap starts
    try { g.ticker.wake(); } catch (e) { }
    tl.play(0);
    this._wipeArmStallPump(g);
  },

  /* A document route hands its reveal controller up on mount and takes it back on unmount, so the
     timeline above has something to release without reaching into the component. Both LegalPage and
     AboutPage use it; there is only ever one of them mounted, so one slot is enough.

     AND A CONTROLLER THAT ARRIVES AFTER THE RELEASE PLAYS AT ONCE. The two routes are a lazy chunk,
     prefetched on load but not guaranteed: measured, an /about reached before the prefetch landed
     mounted its page after the window's 0.2s release had already fired, registered a controller
     nobody would ever play, and sat with its hero at opacity 0. The old panel hid the same race
     behind a full second of cover; the window shows the page from its first frame, so the slot has
     to answer for itself. play() is idempotent (pageReveal), so the early case cannot double-fire. */
  registerPageReveal(controller) {
    this._pageReveal = controller;
    if (controller && this._wipeOnMount) this._wipeOnMount();   // the window was waiting for this mount
    if (controller && this._wipeReleased) this._playPageReveal();
  },
  _playPageReveal() { const c = this._pageReveal; if (c) { try { c.play(); } catch (e) { } } },
};
