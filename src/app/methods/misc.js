// Lenis smooth scroll, click-to-zoom lightbox, and the sliding project-filter pill.
import { isDoc } from '../routes.js';

export const miscMethods = {
  /* EXPLORE ATMOS, FROM THE CLOSE OF /about — straight into the tool, by request. The reader has just
     been told how it works, so the act lands them where it works: the landing is dismissed on the way,
     persisted exactly as Create persists it (and just as reversible — the wordmark brings it back),
     and the crossing is the ordinary route change, which arms the tool's own arrival. Set before the
     crossing rather than inside it, because the landing is not on /about to be covered: nothing on
     screen changes until the window opens on the tool.
     Below the supported width there is no tool to open, so it is the front page, which is also what
     the link's href says for a new tab or a reader with no JavaScript. */
  /* AND IT ARRIVES AT THE START, NOT WHERE THE READER LEFT OFF (15.09.26, by request). The crossing
     used to keep the tool exactly as it was, so a palette opened before the detour, or a colour chosen
     in the phone's story, was what the window opened on. Explore Atmos means begin, so it takes the
     default state Get Started lands on (_resetToolState in methods/wipe.js), plus the phone story's
     own selections: the chosen colour, the tab, the chooser, and the case, back to the example this
     visit rolled. sharedView goes with `current`, for the reason doReset gives. One commit, then the
     crossing, and all of it behind the page the reader is still looking at: none of it is on /about. */
  openCreate() {
    if (this._wipeRunning) return;
    const start = { sharedView: false, storyOpen: true, storyCaseId: null, storySwatch: null, storyTab: 'weight', storyPicker: false };
    // A case the reader chose has masks built for that photograph; buildStoryMasks compares ids and
    // builds the rolled example's set, or does nothing when they already match.
    const recast = this.state.storyCaseId !== null;
    const go = () => { if (recast) this.buildStoryMasks(); this.navigateTo('/'); };
    if (this.state.narrow) { this._resetToolState(start, go); return; }
    // Persisted even when the state already reads dismissed: a visit that STARTED on /about is let
    // past the landing in state only (see the initial state in PaletteApp), so without this a reload
    // of the tool put the landing back in front of it.
    try { localStorage.setItem('palette-generator/landing', '1'); } catch (e) { }
    this._resetToolState(Object.assign(start, { landingDismissed: true }), go);
  },
  /* THE LANDING IS A COVER, SO WHAT IT COVERS IS INERT. The stage is position:fixed over the tool,
     not instead of it, and the tool stayed in the tab order underneath: measured on a first visit,
     Tab went Skip link → Create → Learn More → Toggle dark theme → Back up → Restore → the dropzone
     → every library row, all of them under the field with no ring anyone could see. The wipes
     already inert [data-app] for the length of the transition; this holds the same guard for as
     long as the landing is up, and lifts it the moment the landing goes.
     The children rather than [data-app] itself, because the landing, the mark, the loader, the
     floating header and the skip link are all children too and must stay live. Left alone while a wipe runs — the wipe owns
     the guards then and calls this from its own clearGuards — and never lifted while a modal holds
     the landmarks (see _bgInert), which would otherwise undo that dialog's own guard. */
  _syncAppInert(force) {
    // `force` is the wipes' own clearGuards, which run before the running flag drops.
    if (this._wipeRunning && !force) return;
    const app = document.querySelector('[data-app]');
    if (!app) return;
    const on = !this.state.landingDismissed && !this.state.narrow && !isDoc(this.state.route);
    [].forEach.call(app.children, (el) => {
      // [data-float-nav]: the header floats over the landing and is meant to be used there.
      if (el.matches('[data-landing],[data-logo],[data-load-wrap],[data-float-nav],.skip-link,[role="status"]')) return;
      try {
        if (on) el.setAttribute('inert', '');
        else if (!this._bgInertOn) el.removeAttribute('inert');
      } catch (e) { }
    });
  },
  /* AND WHAT IT COVERS HOLDS STILL, UNPAINTED (16.09.26). Inert was half of covering. The tool under
     the landing is a whole page, 1611px of it at 1440x900, and nothing stopped the wheel scrolling
     it: measured, a flick on the landing moved the hidden page 711px while the stage stood still.
     Chrome showed nothing of that. Safari did, through the floating bar: the bar is glass, and the
     create page sliding along under it came through the blur and the landing's 40% tint, the one
     translucent thing on the front page. It also left the tool 711px down for Create to arrive on,
     which _scrollToTop was only mopping up afterwards.

     So while the landing is up, Lenis is stopped, which takes the wheel's default and puts
     `lenis-stopped`'s overflow:clip on the root, and the root carries [data-landing-cover]. global.css
     turns that into the same lock for a reader without Lenis (reduced motion) and into
     visibility:hidden on the page's three in-flow regions. Hidden rather than display:none, so the
     tool keeps the layout it is revealed in and nothing reflows at the crossing.

     NOT SKIPPED DURING A WIPE, unlike the inert guard above. The cover's commit is where the landing
     leaves or arrives, and the window opens on the tool straight after it; a tool still hidden then
     would rise as an empty page. The departing page's ghost carries [data-ghost-app], which the rule
     excludes, so the tool's copy stays painted while the landing arrives behind it.

     The grid holds the same lock and the two never overlap: feedView starts as 'list', and
     _resetToolState closes the grid before the landing returns. The check on release keeps that
     true if it ever changes. */
  _syncLandingCover() {
    const on = !this.state.landingDismissed && !this.state.narrow && !isDoc(this.state.route);
    if (on === !!this._coverOn) return;
    this._coverOn = on;
    try { if (on) document.documentElement.setAttribute('data-landing-cover', ''); else document.documentElement.removeAttribute('data-landing-cover'); } catch (e) { }
    if (on) this._lenisStop();
    else if (this.state.feedView !== 'grid') this._lenisStart();
  },
  // Lenis smooth scroll (vendored). Integration contract with the existing motion system:
  //  - driven by the GSAP ticker (one clock; no second rAF loop)
  //  - skipped under prefers-reduced-motion (native scroll is the floor)
  //  - stopped while the universe grid owns the wheel (Observer pan), restarted on exit
  //  - drawers/dialogs with internal scroll carry data-lenis-prevent (nested native scroll)
  _initLenis() {
    if (this._lenis || this._reduce) return;
    let tries = 0;
    const arm = () => {
      const g = window.gsap;
      if (!window.Lenis || !g) { if (++tries > 40) return; setTimeout(arm, 100); return; }
      /* TUNED, NOT DEFAULTED. `new Lenis({})` takes lerp:0.1, and measured on this site that is a
         wheel flick still creeping 840ms after the hand stopped — the last 300ms of it covering
         three pixels. Scrolling is direct manipulation, and the house rule for direct manipulation
         is that it answers immediately; the curve belongs on things the reader did not just push.
         0.22 keeps enough smoothing for the scrubbed ScrollTriggers to interpolate cleanly and
         removes the drift. Lenis normalises lerp against a 60fps clock internally, so this is one
         number on every display rather than one that means different things at 60 and 120Hz. */
      this._lenis = new window.Lenis({ lerp: 0.22 });
      this._lenisRaf = (time) => { try { this._lenis.raf(time * 1000); } catch (e) { } };
      g.ticker.add(this._lenisRaf);
      // Lenis can arm after the landing has already asked for the lock (it waits for the vendored
      // script), so it starts stopped when either owner is holding it.
      if (this.state.feedView === 'grid' || this._coverOn) this._lenis.stop();
    };
    arm();
  },
  _lenisStop() { if (this._lenis) { try { this._lenis.stop(); } catch (e) { } } },
  _lenisStart() { if (this._lenis) { try { this._lenis.start(); } catch (e) { } } },

  // ===================== CLICK-TO-ZOOM LIGHTBOX (Osmo mechanic; squared, token-eased) =====================
  initClickZoom() {
    if (this._czInit) return;
    const lightbox = document.querySelector('[data-click-zoom-lightbox]');
    if (!lightbox) { setTimeout(() => this.initClickZoom(), 200); return; }
    this._czInit = true;
    lightbox.setAttribute('role', 'dialog'); lightbox.setAttribute('aria-modal', 'true'); lightbox.setAttribute('aria-hidden', 'true'); lightbox.setAttribute('aria-label', 'Reference image, enlarged'); lightbox.setAttribute('tabindex', '-1');
    // The backdrop's colour is the --lightbox-scrim token (17.09.26, audit H2), authored as rgba() so
    // GSAP can tween it; the fallback is the same value.
    const backdropColor = this._cssVar('--lightbox-scrim') || 'rgba(0,0,0,.9)', transparent = 'rgba(0,0,0,0)';
    /* A WAY OUT YOU CAN SEE. The overlay closed on a click anywhere and on Escape, and neither is
       something a control announces: a keyboard user arrived in a dialog with no button in it, and
       the next Tab left it for the theme switch behind. This is the copy dialog's 32px Close, in
       the overlay's own colours — white on the black backdrop, since the surface tokens read against
       the page, not against this. It is also the one thing focus rests on while the image is up:
       there is nothing else here to tab to, so Tab stays put rather than wrapping around a list of
       one. A click on it bubbles to the overlay, whose click is already the close. */
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button'; closeBtn.setAttribute('data-ix', 'press'); closeBtn.setAttribute('data-focus', 'chrome');
    closeBtn.setAttribute('aria-label', 'Close the enlarged image'); closeBtn.title = 'Close';
    /* THE APP'S CLOSE MARK, BUILT BY HAND (17.09.26, audit B5): TextSwap's markup and IconClose's glyph,
       data-icon included, so the close-mark rule treats it as one and the × slides through its mask.
       Its colours on the black backdrop are global.css's ([data-click-zoom-lightbox] [data-ix]). */
    closeBtn.style.cssText = 'position:absolute;top:24px;right:24px;width:32px;height:32px;display:inline-flex;align-items:center;justify-content:center;background:none;border-width:1px;border-style:solid;border-radius:var(--radius-pill);padding:0;cursor:pointer';
    const closeGlyph = '<svg data-icon="close" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style="display:block;flex:none"><path fill="currentColor" d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12z"></path></svg>';
    closeBtn.innerHTML = '<span class="tswap"><span class="tswap__a">' + closeGlyph + '</span><span class="tswap__b" aria-hidden="true">' + closeGlyph + '</span></span>';
    const S = { open: false, anim: false, clone: null, srcDoc: null, scrollY: 0, trigger: null, inerted: [] };
    /* THE PAGE BEHIND IT LEAVES THE TREE. aria-modal is a request; inert is the guarantee, and it is
       what the other dialogs get through _bgInert. That helper inerts the four landmarks inside
       [data-app], which is the right set for a dialog rendered among them and the wrong one here:
       the overlay is a direct child of [data-app], so its siblings are the whole rest of the app —
       the chrome bar the Tab was escaping to included. Only what this call inerted is lifted on
       close, so a guard that was already up (the landing's, a wipe's) is left exactly as it was. */
    const guardOn = () => {
      const app = document.querySelector('[data-app]'); if (!app) return;
      [].forEach.call(app.children, (el) => {
        if (el === lightbox || el.matches('[role="status"],[data-load-wrap]') || el.hasAttribute('inert')) return;
        try { el.setAttribute('inert', ''); S.inerted.push(el); } catch (e) { }
      });
    };
    const guardOff = () => { S.inerted.forEach((el) => { try { el.removeAttribute('inert'); } catch (e) { } }); S.inerted = []; };
    const computeFlip = (src, dst) => ({ scaleX: src.width / dst.width, scaleY: src.height / dst.height, tx: (src.left + src.width / 2) - (dst.left + dst.width / 2), ty: (src.top + src.height / 2) - (dst.top + dst.height / 2) });
    const open = (img) => {
      const g = window.gsap;
      if (S.open || S.anim) return;
      if (!img.complete || !img.naturalWidth) return;
      S.trigger = document.activeElement;
      const srcRect = img.getBoundingClientRect();
      S.scrollY = window.scrollY;
      S.srcDoc = { top: srcRect.top + window.scrollY, left: srcRect.left, width: srcRect.width, height: srcRect.height };
      S.clone = img.cloneNode(false); S.clone.loading = 'eager'; S.clone.removeAttribute('data-click-zoom');
      const srcComputed = getComputedStyle(img);
      lightbox.style.display = 'flex'; lightbox.style.backgroundColor = transparent;
      const ls = getComputedStyle(lightbox);
      const padX = parseFloat(ls.paddingLeft) + parseFloat(ls.paddingRight), padY = parseFloat(ls.paddingTop) + parseFloat(ls.paddingBottom);
      const aspect = srcRect.width / srcRect.height;
      const maxW = lightbox.clientWidth - padX, maxH = lightbox.clientHeight - padY;
      let w = maxW, h = w / aspect; if (h > maxH) { h = maxH; w = h * aspect; }
      // never upscale past the image's native pixel count — a stretched blur defeats the point
      const natW = img.naturalWidth, natH = img.naturalHeight;
      if (w > natW) { w = natW; h = w / aspect; }
      if (h > natH) { h = natH; w = h * aspect; }
      while (lightbox.firstChild) lightbox.removeChild(lightbox.firstChild);
      S.clone.style.width = w + 'px'; S.clone.style.height = h + 'px'; S.clone.style.display = 'block';
      S.clone.style.objectFit = srcComputed.objectFit; S.clone.style.objectPosition = srcComputed.objectPosition;
      lightbox.appendChild(S.clone);
      lightbox.appendChild(closeBtn);
      lightbox.setAttribute('aria-hidden', 'false');
      document.documentElement.style.cursor = 'zoom-out';
      guardOn();
      // Keys are owned from the first frame, not from the end of the arrival: a Tab pressed during
      // the 0.55s flip would otherwise still walk out of the dialog.
      document.addEventListener('keydown', onKeyDown, true);
      try { closeBtn.focus({ preventScroll: true }); } catch (e) { }
      if (this._reduce || !g) { lightbox.style.backgroundColor = backdropColor; S.open = true; attach(); return; }
      S.anim = true;
      const dstRect = S.clone.getBoundingClientRect();
      const flip = computeFlip(srcRect, dstRect);
      const tl = g.timeline({ onComplete: () => { S.anim = false; S.open = true; attach(); } });
      tl.to(lightbox, { backgroundColor: backdropColor, duration: this.DUR.chrome, ease: this.EASE.standard }, 0);
      tl.fromTo(S.clone, { x: flip.tx, y: flip.ty, scaleX: flip.scaleX, scaleY: flip.scaleY }, { x: 0, y: 0, scaleX: 1, scaleY: 1, duration: this.DUR.reveal, ease: this.EASE.entrance }, 0);
    };
    const cleanup = () => {
      lightbox.style.display = 'none'; lightbox.style.backgroundColor = backdropColor;
      if (S.clone && S.clone.parentNode) S.clone.parentNode.removeChild(S.clone);
      S.clone = null; lightbox.setAttribute('aria-hidden', 'true'); S.srcDoc = null; S.open = false; S.anim = false;
      guardOff();   // before focus returns: focus() on a still-inert trigger is a silent no-op
      if (S.trigger && S.trigger.isConnected) try { S.trigger.focus({ preventScroll: true }); } catch (e) { }
      S.trigger = null;
    };
    const close = () => {
      const g = window.gsap;
      if (!S.open || S.anim) return;
      detach();
      document.documentElement.style.cursor = '';
      if (this._reduce || !g) { cleanup(); return; }
      S.anim = true;
      const dstRect = S.clone.getBoundingClientRect();
      const startX = Number(g.getProperty(S.clone, 'x')) || 0, startY = Number(g.getProperty(S.clone, 'y')) || 0;
      const startSX = Number(g.getProperty(S.clone, 'scaleX')) || 1, startSY = Number(g.getProperty(S.clone, 'scaleY')) || 1;
      const currentSrcRect = () => ({ top: S.srcDoc.top - window.scrollY, left: S.srcDoc.left, width: S.srcDoc.width, height: S.srcDoc.height });
      const state = { t: 0 };
      g.to(state, {
        t: 1, duration: this.DUR.swap, ease: this.EASE.exit, onUpdate: () => {
          const f = computeFlip(currentSrcRect(), dstRect), t = state.t;
          g.set(S.clone, { x: startX + (f.tx - startX) * t, y: startY + (f.ty - startY) * t, scaleX: startSX + (f.scaleX - startSX) * t, scaleY: startSY + (f.scaleY - startSY) * t });
        }, onComplete: cleanup,
      });
      g.to(lightbox, { backgroundColor: transparent, duration: this.DUR.chrome, ease: this.EASE.exit, delay: this.DUR.fast });
    };
    const onOverlayClick = () => close();
    const onKeyDown = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); close(); return; }
      if (e.key === 'Tab') { e.preventDefault(); try { closeBtn.focus({ preventScroll: true }); } catch (err) { } }
    };
    const onScroll = () => { if (Math.abs(window.scrollY - S.scrollY) < 2) return; close(); };
    // keydown is attached in open(), from the first frame; click and scroll wait for the arrival.
    const attach = () => { lightbox.addEventListener('click', onOverlayClick); window.addEventListener('scroll', onScroll, { passive: true }); };
    const detach = () => { lightbox.removeEventListener('click', onOverlayClick); document.removeEventListener('keydown', onKeyDown, true); window.removeEventListener('scroll', onScroll); };
    this._czDocClick = (e) => {
      const trigger = e.target.closest && e.target.closest('[data-click-zoom]');
      if (!trigger) return;
      const img = trigger.tagName === 'IMG' ? trigger : trigger.querySelector('img');
      if (!img) return;
      e.preventDefault();
      open(img);
    };
    document.addEventListener('click', this._czDocClick);
    this._czDetach = () => { detach(); if (this._czDocClick) { document.removeEventListener('click', this._czDocClick); this._czDocClick = null; } if (S.open || S.anim) cleanup(); document.documentElement.style.cursor = ''; };
  },
};
