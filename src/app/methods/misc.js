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
      this._lenis = new window.Lenis({});
      this._lenisRaf = (time) => { try { this._lenis.raf(time * 1000); } catch (e) { } };
      g.ticker.add(this._lenisRaf);
      if (this.state.feedView === 'grid') this._lenis.stop();
    };
    arm();
  },
  _lenisStop() { if (this._lenis) { try { this._lenis.stop(); } catch (e) { } } },
  _lenisStart() { if (this._lenis) { try { this._lenis.start(); } catch (e) { } } },

  // ===== A NESTED LENIS, for a dialog that owns a scrollport of its own =====
  // The contract above says internal scrollers carry data-lenis-prevent and fall back to native
  // scroll. That is the right default for a short drawer and the wrong one for the refine editor,
  // which is a full page of content: scrolling it felt like a different website from the one it
  // opened out of. So that surface gets its own instance instead of an exemption.
  //
  // data-lenis-prevent STAYS on the wrapper and is load-bearing twice over. The ROOT instance is
  // stopped while the dialog is open, and a stopped Lenis does not ignore the wheel — it calls
  // preventDefault and swallows it (verified in the vendored source), so without the attribute
  // nothing inside the dialog would scroll at all. The NESTED instance is unaffected by the same
  // attribute because Lenis slices its own rootElement off the composed path before testing it —
  // an element cannot prevent the instance it is the root of.
  //
  // One clock, as above: the GSAP ticker drives this too, never a second rAF loop.
  _lenisNestOn(sel) {
    if (this._reduce || this._nestLenis) return;
    const g = window.gsap;
    const wrap = document.querySelector(sel);
    // Lenis needs the single element that MOVES inside the wrapper; the scrollport's own children
    // are the sections, so the markup provides one content div for exactly this reason.
    const content = wrap && wrap.firstElementChild;
    if (!window.Lenis || !g || !wrap || !content) return;
    try { this._nestLenis = new window.Lenis({ wrapper: wrap, content }); } catch (e) { return; }
    this._nestRaf = (time) => { try { this._nestLenis.raf(time * 1000); } catch (e) { } };
    g.ticker.add(this._nestRaf);
  },
  // Torn down on close rather than left parked: it holds wheel/touch listeners on a node React is
  // about to unmount, and a second open would otherwise stack a new instance on top of a dead one.
  _lenisNestOff() {
    const g = window.gsap;
    if (this._nestRaf && g) { try { g.ticker.remove(this._nestRaf); } catch (e) { } }
    if (this._nestLenis) { try { this._nestLenis.destroy(); } catch (e) { } }
    this._nestLenis = null; this._nestRaf = null;
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
        if (first || this._reduce) { pill.style.transition = 'none'; } else { pill.style.transition = 'transform .5s var(--ease-pill), width .5s var(--ease-pill), height .5s var(--ease-pill)'; }
        pill.style.width = w + 'px'; pill.style.height = h + 'px';
        pill.style.transform = 'translate(' + x + 'px,' + y + 'px)';
        pill.style.opacity = '1';
      });
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
