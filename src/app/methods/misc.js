// Lenis smooth scroll, click-to-zoom lightbox, and the sliding project-filter pill.
export const miscMethods = {
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
      if (this.state.feedView === 'grid') this._lenis.stop();
    };
    arm();
  },
  _lenisStop() { if (this._lenis) { try { this._lenis.stop(); } catch (e) { } } },
  _lenisStart() { if (this._lenis) { try { this._lenis.start(); } catch (e) { } } },

  /* THE CONTAINER CARRIES THE SELECTION, so a scope past the edge is not something you have to go
     and find afterwards. Picking a chip that sits half under the fade used to leave it there: the
     list re-scoped, the pill moved to a chip you could not fully see, and the only way to confirm
     what you had chosen was to scroll the group by hand. With four columns as the frame there are
     nearly always scopes outside it, so this stopped being an edge case.

     IT ALSO TEACHES THE GESTURE. Landing the chip PEEK short of the edge rather than flush against
     it reveals a slice of whatever comes next, so the container answers "there is more this way"
     every time it moves — which is the quiet version of telling someone the row scrolls.

     Three restraints, and each one is what keeps it from becoming annoying:
       · It moves ONLY when the selection actually changes, never on a re-render. A reveal that ran
         on every update would yank the row back the moment the user scrolled it themselves.
       · It does nothing when the chip already sits PEEK clear of both edges. Note the margin is
         part of the test, not just the destination: a chip 20px from the edge is technically
         visible and still gets nudged out to the full peek, because the rule is "the selection is
         never against an edge", and a rule that only fired on total clipping would leave it there.
         What the test does prevent is the re-centring some scrollers do on every press, which
         fidgets, and fidgeting reads as instability rather than help.
       · DUR.fold on EASE.fold: the exact tokens the pill behind the chip already slides on, so the
         mark and the container are one movement rather than two things that happen to coincide.
         Indirect change gets a curve; reduced motion gets the same destination with no travel.

     IT ALSO OWNS THE KEYBOARD, because the browser does not do this job well enough to leave alone.
     Measured in Chrome: focusing a chip that is ENTIRELY out of view centres it, and focusing one
     that is merely CLIPPED — 37px past the edge, the normal case when tabbing along the row — scrolls
     it not at all, so the focused control sits half hidden. scroll-margin-inline does not reach
     either case. Running the same reveal from the chip's own focus handler is what makes tabbing to
     a chip and clicking it land in the same place, and is what stops a keyboard user having to take
     it on trust that the control they are on is fully on screen. */
  // Where the row stood at the moment of the press, captured before focus can move it. See the
  // note in renderVals' mkChip for why the browser's focus scroll is undone rather than prevented.
  _holdProjScroll() { const grp = document.querySelector('[data-proj-group]'); this._projScrollAtPress = grp ? grp.scrollLeft : null; },
  _revealProjChip(el) {
    try {
      const grp = document.querySelector('[data-proj-group]');
      if (!grp) return;
      // Rewind the browser's own scroll-into-view, still inside the focus event and so ahead of the
      // next paint: the tween then starts from where the user actually left the row. Consumed here
      // so a later keyboard focus, which had no press, is never wound back to a stale offset.
      if (this._projScrollAtPress != null) { grp.scrollLeft = this._projScrollAtPress; this._projScrollAtPress = null; }
      // Default subject is the SELECTED chip; the focus handler passes the focused one instead.
      const cur = el || grp.querySelector('[data-proj-chip][aria-pressed="true"]');
      if (!cur || !grp.contains(cur)) return;
      const max = grp.scrollWidth - grp.clientWidth;
      if (max <= 0) { this._syncProjSteps(); return; }   // everything fits: there is no "along" to move
      // Clear of the 36px cover gradient, so the chosen chip never settles under the fade that
      // means "there is more" — and wide enough past it to show the edge of its neighbour.
      const PEEK = 44;
      const from = grp.scrollLeft, view = grp.clientWidth;
      // offsetLeft is content-space (the group is the offsetParent and is position:relative), so it
      // does not move as the group scrolls — the same measure the pill is placed with.
      const left = cur.offsetLeft, width = cur.offsetWidth;
      let target;
      if (left - PEEK < from) target = left - PEEK;                    // it lies back the way we came
      else if (left + width + PEEK > from + view) target = left + width + PEEK - view;
      // Sync before each of these exits, not only on the tween. The browser's own scroll-into-view
      // has usually already moved the row by the time this runs — that is the case the "comfortably
      // in view" branch describes — so an early return here is a row that MOVED and told nobody.
      else { this._syncProjSteps(); return; }                          // comfortably in view already
      target = Math.max(0, Math.min(target, max));
      if (Math.abs(target - from) < 1) { this._syncProjSteps(); return; }
      const g = window.gsap;
      // The step buttons are told about this too. Selecting a project moves the row, so the arrows'
      // ends move with it, and leaving that to the scroll event would make the two agree only as
      // often as the document happens to paint. See _syncProjSteps.
      if (this._reduce || !g) { grp.scrollLeft = target; this._syncProjSteps(); return; }
      g.to(grp, { duration: this.DUR.fold, ease: this.EASE.fold, scrollTo: { x: target }, overwrite: 'auto', onUpdate: () => this._syncProjSteps() });
    } catch (e) { }
  },

  // sliding pill behind the active project chip — measured (chips have variable widths)
  // Every [data-proj-group] on the page, not just the first: the tag filter is the SAME chip group
  // as the project filter, so it gets the same pill from the same code rather than a second
  // "selected chip" treatment that would drift. A group with nothing pressed hides its pill — which
  // is the tag group's normal resting state (no tag filter), and never the project group's.
  _updateProjPill() {
    try {
      document.querySelectorAll('[data-proj-group]').forEach((grp) => {
        const pill = grp.querySelector('[data-proj-pill]'); if (!pill) return;
        const cur = grp.querySelector('[data-proj-chip][aria-pressed="true"]');
        if (!cur) { pill.style.opacity = '0'; return; }
        const w = cur.offsetWidth, h = cur.offsetHeight, x = cur.offsetLeft, y = cur.offsetTop;
        const first = pill.style.opacity !== '1';
        if (first || this._reduce) { pill.style.transition = 'none'; } else { pill.style.transition = 'transform var(--dur-fold) var(--ease-fold), width var(--dur-fold) var(--ease-fold), height var(--dur-fold) var(--ease-fold)'; }
        pill.style.width = w + 'px'; pill.style.height = h + 'px';
        pill.style.transform = 'translate(' + x + 'px,' + y + 'px)';
        pill.style.opacity = '1';
      });
    } catch (e) { }
  },

  /* ===================== THE PROJECT RAIL'S STEP BUTTONS =====================

     WHAT THE SCROLLER OWES A MOUSE. The chips have scrolled since the cap arrived, and every route
     to the hidden ones assumed hardware: a trackpad's two-finger swipe, or a wheel that tilts. A
     plain mouse has neither, so on that machine the fade at the end was a locked door with a sign
     on it. These two buttons are that door's handle, and nothing more — see the JSX for why they
     are out of the tab order.

     THE STEP LANDS ON A CHIP EDGE, NEVER MID-WORD. Paging by a viewport-width would leave whatever
     happened to be there cut in half, which is the exact complaint the fade was already answering.
     So the target is measured from the chips: going forward, the first chip whose trailing edge is
     past the window is brought to the leading edge; going back, the last chip that has fallen off
     the leading edge is brought to the trailing one. Either way a whole chip arrives, and the row
     always breaks between names rather than through one.

     PAD is the scroller's own 2px inset — the target is content-space, and the leading edge of the
     window sits 2px inside it. Without it every forward step lands 2px short and clips a hairline
     off the chip it just delivered. */
  _projGroup() { return document.querySelector('[data-proj-rail] [data-proj-group]'); },
  stepProjects(dir) {
    try {
      const grp = this._projGroup(); if (!grp) return;
      const PAD = 2;
      const view = grp.clientWidth, from = grp.scrollLeft, max = grp.scrollWidth - view;
      if (max <= 0) return;
      const chips = [...grp.querySelectorAll('[data-proj-chip]')];
      let target;
      if (dir > 0) {
        const c = chips.find((el) => el.offsetLeft + el.offsetWidth > from + view + 1);
        target = c ? c.offsetLeft - PAD : max;
      } else {
        const c = [...chips].reverse().find((el) => el.offsetLeft < from - 1);
        target = c ? c.offsetLeft + c.offsetWidth + PAD - view : 0;
      }
      target = Math.max(0, Math.min(target, max));
      if (Math.abs(target - from) < 1) return;
      /* A BUTTON THAT DISABLES ITSELF MUST HAND ITS FOCUS ON. Landing on a limit disables the arrow
         that was just pressed, and a focused control going native-disabled drops focus to <body> —
         so stepping to the end of the row with the keyboard would silently lose your place in the
         page. The other arrow is live by construction whenever this one dies (a rail that can step
         at all can always step back), so the pair keeps the focus between them.
         Gated on the app's own input-modality flag, and that gate is the whole reason this is safe:
         a programmatic focus() resolves :focus-visible to true in Chrome — the finding the project
         chips are already written around — so doing this after a MOUSE press would answer a click
         with a keyboard ring. Keyboard presses only; a pointer press leaves focus where it is. */
      if (this._kbdInput && (target <= 0 || target >= max - 1)) {
        try {
          const other = document.querySelector('[data-proj-step="' + (dir > 0 ? 'prev' : 'next') + '"]');
          if (other && !other.disabled && document.activeElement === document.querySelector('[data-proj-step="' + (dir > 0 ? 'next' : 'prev') + '"]')) other.focus();
        } catch (_) { }
      }
      const g = window.gsap;
      // DUR.fold on EASE.fold — the pill's curve and _revealProjChip's curve. Three things move
      // this row and they must all move the same way, or stepping and selecting would feel like
      // two different controls acting on one strip.
      if (this._reduce || !g) { grp.scrollLeft = target; this._syncProjSteps(); return; }
      // onUpdate as well as the scroll listener, and not as a belt-and-braces habit: a tween writes
      // scrollLeft directly, and a scroll event is dispatched from the rendering pipeline, so the
      // arrows would track the row only as fast as the document happens to be painting. Reading the
      // state from the thing doing the moving is the version that cannot lag behind it.
      g.to(grp, { duration: this.DUR.fold, ease: this.EASE.fold, scrollTo: { x: target }, overwrite: 'auto', onUpdate: () => this._syncProjSteps() });
    } catch (e) { }
  },

  /* WHETHER THE BUTTONS EXIST, AND WHICH OF THEM CAN ACT — read from the DOM, held in state.

     It has to be measured rather than derived: whether four chips overflow depends on how long the
     project names are and how wide the window is, neither of which the render knows. So the scroller
     is asked directly, on every commit (componentDidUpdate), on its own scroll, and on any resize
     of it — the ResizeObserver is what covers a window drag and a renamed project alike.

     setState only on a CHANGE. A scroll listener that set state every frame would re-render the
     whole library section sixty times a second for two booleans that flip twice a step.

     AND THE PAIR ARRIVES, IT DOES NOT APPEAR. can flipping is a mount and an unmount, and a bare
     React conditional would have snapped 61px of control into and out of the rail — the one state
     change in this contract with no transition behind it, which is the fault the [data-ix] note in
     global.css names for opacity. It folds instead, on the axis it occupies: width and opacity on
     EASE.fold at the disclosure's own two durations, which is _foldIn/_foldOut turned on its side.
     overflow is set for the length of the tween only, so a focus ring at rest is never clipped.

     The sync is deaf while a fold runs. Tweening the pair's width resizes the scroller beside it,
     the ResizeObserver answers every frame of that, and the measurements it would take mid-fold
     describe a box that is still moving. */
  _projStepsIn(done) {
    const g = window.gsap; const el = document.querySelector('[data-proj-steps]');
    if (this._reduce || !g || !el) { done(); return; }
    g.killTweensOf(el);
    const w = el.scrollWidth;
    if (w <= 0) { done(); return; }
    g.fromTo(el, { width: 0, opacity: 0, overflow: 'hidden' },
      { width: w, opacity: 1, duration: this.DUR.reveal * 0.62, ease: this.EASE.fold, clearProps: 'width,opacity,overflow', onComplete: done });
  },
  _projStepsOut(done) {
    const g = window.gsap; const el = document.querySelector('[data-proj-steps]');
    if (this._reduce || !g || !el) { done(); return; }
    // The pair is about to leave the document; if it is holding focus, hand that back to the row it
    // was steering rather than letting it fall to <body>.
    try { if (el.contains(document.activeElement)) { const grp = this._projGroup(); const cur = grp && grp.querySelector('[data-proj-chip][aria-pressed="true"]'); if (cur) cur.focus(); } } catch (_) { }
    g.killTweensOf(el);
    g.to(el, { width: 0, opacity: 0, overflow: 'hidden', duration: this.DUR.reveal * 0.45, ease: this.EASE.fold, onComplete: done });
  },
  _syncProjSteps() {
    try {
      if (this._projStepsBusy) return;
      const grp = this._projGroup();
      if (!grp) { if (this.state.projStep.can) this.setState({ projStep: { can: false, start: true, end: true } }); return; }
      if (!grp._stepWired) {
        grp._stepWired = true;
        grp.addEventListener('scroll', () => this._syncProjSteps(), { passive: true });
        if (window.ResizeObserver) {
          if (this._projStepRO) this._projStepRO.disconnect();
          this._projStepRO = new ResizeObserver(() => this._syncProjSteps());
          this._projStepRO.observe(grp);
        }
      }
      const max = grp.scrollWidth - grp.clientWidth;
      // A pixel of tolerance at each end: a scroller at its limit routinely reports a fractional
      // remainder (device pixel ratios, sub-pixel chip widths), and without it the trailing arrow
      // would stay live at the end of the row and do nothing when pressed.
      const next = { can: max > 1, start: grp.scrollLeft <= 1, end: grp.scrollLeft >= max - 1 };
      const cur = this.state.projStep;
      if (cur.can === next.can && cur.start === next.start && cur.end === next.end) return;
      // Leaving: the tween has to outlive the state change, or React unmounts the pair before it has
      // anywhere to play — the same ordering every exit in this app is built around.
      if (cur.can && !next.can) {
        this._projStepsBusy = true;
        this._projStepsOut(() => { this._projStepsBusy = false; this.setState({ projStep: next }); });
        return;
      }
      // Arriving: commit first so there is an element to fold open, then fold it.
      if (!cur.can && next.can) {
        this._projStepsBusy = true;
        this.setState({ projStep: next }, () => this._projStepsIn(() => { this._projStepsBusy = false; }));
        return;
      }
      this.setState({ projStep: next });
    } catch (e) { }
  },

  // ===================== CLICK-TO-ZOOM LIGHTBOX (Osmo mechanic; squared, token-eased) =====================
  initClickZoom() {
    if (this._czInit) return;
    const lightbox = document.querySelector('[data-click-zoom-lightbox]');
    if (!lightbox) { setTimeout(() => this.initClickZoom(), 200); return; }
    this._czInit = true;
    lightbox.setAttribute('role', 'dialog'); lightbox.setAttribute('aria-modal', 'true'); lightbox.setAttribute('aria-hidden', 'true'); lightbox.setAttribute('aria-label', 'Reference image, enlarged'); lightbox.setAttribute('tabindex', '-1');
    const backdropColor = 'rgba(0,0,0,0.9)', transparent = 'rgba(0,0,0,0)';
    const S = { open: false, anim: false, clone: null, srcDoc: null, scrollY: 0, trigger: null };
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
      lightbox.setAttribute('aria-hidden', 'false');
      document.documentElement.style.cursor = 'zoom-out';
      try { lightbox.focus({ preventScroll: true }); } catch (e) { }
      if (this._reduce || !g) { lightbox.style.backgroundColor = backdropColor; S.open = true; attach(); return; }
      S.anim = true;
      const dstRect = S.clone.getBoundingClientRect();
      const flip = computeFlip(srcRect, dstRect);
      const tl = g.timeline({ onComplete: () => { S.anim = false; S.open = true; attach(); } });
      tl.to(lightbox, { backgroundColor: backdropColor, duration: 0.3, ease: 'none' }, 0);
      tl.fromTo(S.clone, { x: flip.tx, y: flip.ty, scaleX: flip.scaleX, scaleY: flip.scaleY }, { x: 0, y: 0, scaleX: 1, scaleY: 1, duration: 0.55, ease: this.EASE.entrance }, 0);
    };
    const cleanup = () => {
      lightbox.style.display = 'none'; lightbox.style.backgroundColor = '#000000e6';
      if (S.clone && S.clone.parentNode) S.clone.parentNode.removeChild(S.clone);
      S.clone = null; lightbox.setAttribute('aria-hidden', 'true'); S.srcDoc = null; S.open = false; S.anim = false;
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
        t: 1, duration: 0.45, ease: this.EASE.exit, onUpdate: () => {
          const f = computeFlip(currentSrcRect(), dstRect), t = state.t;
          g.set(S.clone, { x: startX + (f.tx - startX) * t, y: startY + (f.ty - startY) * t, scaleX: startSX + (f.scaleX - startSX) * t, scaleY: startSY + (f.scaleY - startSY) * t });
        }, onComplete: cleanup,
      });
      g.to(lightbox, { backgroundColor: transparent, duration: 0.3, ease: 'power2.in', delay: 0.18 });
    };
    const onOverlayClick = () => close();
    const onKeyDown = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
    const onScroll = () => { if (Math.abs(window.scrollY - S.scrollY) < 2) return; close(); };
    const attach = () => { lightbox.addEventListener('click', onOverlayClick); document.addEventListener('keydown', onKeyDown, true); window.addEventListener('scroll', onScroll, { passive: true }); };
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
