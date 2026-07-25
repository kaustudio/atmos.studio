// 3D tornado (helix of palette cards). Osmo 3D-cards-tornado mechanic, adapted: cards on a
// vertical helix (rotateY around a deep orbit, y stepped per card), a progress/velocity engine on
// the gsap ticker, wheel/touch/pointer input via the vendored Observer. No ScrollTrigger — the
// fullscreen view IS the active gate. The app's [data-reel-*] hooks stand in for the resource's
// [data-3d-tornado-*] (layer/stage=container, list=list, items built here). Ambient spin is a
// sanctioned exception (user-chosen view, like the orbit landing); it ends with the view.
// Click (never drag) opens the SAME detail overlay. Cards are square-cornered by design.
export const reelMethods = {
  _reelBuilt() { const l = document.querySelector('[data-reel-list]'); return !!(l && l.children.length); },
  reelPalettes() { return this.scopedFeed(this.state.feed); },   // ALL palettes in scope — imageless ones render their gradient field
  initReel() {
    if (this.state.feedView !== 'carousel' || this._reelBuilt()) return;
    const g = window.gsap;
    const layer = document.querySelector('[data-reel-layer]'), stage = document.querySelector('[data-reel-stage]'), list = document.querySelector('[data-reel-list]');
    if (!layer || !stage || !list || !g) { if ((this._reelTries = (this._reelTries || 0) + 1) < 40) setTimeout(() => { if (this.state.feedView === 'carousel') this.initReel(); }, 120); return; }
    this._reelTries = 0;
    const pals = this.reelPalettes();
    if (!pals.length) return;                               // declarative empty state carries the view
    try { layer.style.visibility = ''; } catch (e) { }
    // ---- tornado tuning (the resource's knobs, verbatim) ----
    const rotationAngle = 30;                                   // rotation angle (spacing)
    const cardYSpacing = 0.3;                                   // vertical card offset
    const edgeOffset = 2;                                       // vertical edge offset
    const orbitDepth = 35;                                      // width/depth of the tornado orbit
    const autoSpeed = 0.00325;                                  // automatic rotation speed
    const scrollSpeed = 0.015;                                  // scroll/drag speed
    const dragMultiplier = 5;                                   // extra sensitivity for drag gestures
    const scrollEase = 0.1;                                     // speed lerp
    const maxSpeed = 0.2;                                       // maximum speed
    const edgeScale = 0.5;                                      // edge scale distance
    const edgeEase = g.parseEase('power2.inOut');               // easing for edge scaling
    const minScale = 1;                                         // smallest scale for distant cards
    const backDarkness = 0.75;                                  // darkening applied to cards in back
    const backBlur = 0.5;                                       // blur applied to cards in back
    // every scoped palette gets exactly ONE card (feed order, never capped); the helix then
    // wraps/duplicates in whole batches to reach the density the viewport needs — duplicates stay decorative
    const makeCard = (p, dup) => {
      const item = document.createElement('div');
      item.style.cssText = 'position:absolute;top:50%;left:50%;transform-style:preserve-3d;backface-visibility:visible;will-change:transform,filter';
      const b = document.createElement('button');
      b.type = 'button'; b.setAttribute('data-focus', 'card');
      b.setAttribute('aria-label', 'Open ' + p.name + ' detail');
      if (dup) { b.setAttribute('aria-hidden', 'true'); b.tabIndex = -1; }
      b.style.cssText = 'position:relative;display:block;aspect-ratio:4/5;width:18em;padding:0;margin:0;border:none;background:var(--line);cursor:pointer;overflow:hidden;-webkit-user-select:none;user-select:none';
      const im = document.createElement('span');
      im.setAttribute('aria-hidden', 'true');
      if (this.hasImg(p)) {
        im.style.cssText = 'position:absolute;inset:0;background-image:url("' + this.dispUrl(p) + '");background-size:cover;background-position:center;display:block';
      } else {
        // imageless palette: its swatches as the soft gradient field (same treatment as list/grid fallbacks)
        const denom = Math.max(1, p.swatches.length - 1);
        const stops = p.swatches.map((sw, si) => sw.hex + ' ' + Math.round(si / denom * 100) + '%').join(', ');
        im.style.cssText = 'position:absolute;inset:0;background:linear-gradient(135deg, ' + stops + ');background-size:220% 220%;display:block';
      }
      b.appendChild(im); item.appendChild(b);
      return item;
    };
    // measure one card, size the helix to the container, then build the full set
    list.innerHTML = '';
    const measure = makeCard(pals[0], false);
    list.appendChild(measure);
    const cardH = measure.offsetHeight, gap = cardH * cardYSpacing;
    const em = parseFloat(getComputedStyle(measure.querySelector('button')).fontSize) || 16;
    const halfH = stage.offsetHeight * 0.5;
    const perSide = Math.ceil((halfH + cardH * edgeOffset + cardH * edgeScale) / Math.max(1, gap)) + 1;
    const amount = pals.length * Math.ceil((perSide * 2 + 1) / pals.length);
    list.innerHTML = '';
    const items = [], buttons = [];
    for (let i = 0; i < amount; i++) {
      const p = pals[i % pals.length], dup = i >= pals.length;
      const item = makeCard(p, dup);
      const b = item.querySelector('button');
      b.addEventListener('click', () => { if (this._reelMoved) return; this._reelFreeze(); this.openOverlay(p, b); });
      b.addEventListener('focus', ((idx) => () => { if (this._kbdInput) this.reelFocusPanel(idx); })(i));
      list.appendChild(item); items.push(item); buttons.push(b);
    }
    this._reelPanels = items; this._reelContent = buttons; this._reelIndex = 0;
    // ---- progress/velocity engine: progress is wrapped card-units, never a timeline playhead ----
    const st = this._reelState = {
      amount, cardH, gap, em,
      progress: (typeof this._reelProgSave === 'number') ? this._reelProgSave : 0,
      velocity: 0,
      dir: this._reelDir || 1,
      active: false,
    };
    const edgeScaleAt = (y) => {
      const fadeStart = stage.offsetHeight * 0.5 + st.cardH * edgeOffset;
      return edgeEase(g.utils.clamp(0, 1, (fadeStart - Math.abs(y)) / (st.cardH * edgeScale)));
    };
    const render = this._reelRender = () => {
      const radius = orbitDepth * st.em;
      for (let i = 0; i < items.length; i++) {
        const loopIndex = ((i + st.progress) % st.amount + st.amount) % st.amount;
        const index = loopIndex > st.amount * 0.5 ? loopIndex - st.amount : loopIndex;
        const angleDeg = index * rotationAngle;
        const angleRad = angleDeg * Math.PI / 180;
        const center = 1 - Math.min(Math.abs(index) / (st.amount * 0.5), 1);
        const y = index * st.gap;
        const scale = (minScale + center * (1 - minScale)) * edgeScaleAt(y);
        const back = g.utils.clamp(0, 1, (1 - Math.cos(angleRad)) * 0.5);
        g.set(items[i], {
          xPercent: -50, yPercent: -50,
          x: Math.sin(angleRad) * radius, y, z: (Math.cos(angleRad) - 1) * radius,
          rotateY: angleDeg, scale,
          filter: 'brightness(' + (1 - back * backDarkness) + ') blur(' + (back * backBlur) + 'em)',
          autoAlpha: 1, zIndex: Math.round(center * 1000),
        });
      }
    };
    render();
    this._reelTick = () => {
      if (!st.active || this._reduce) return;
      st.velocity = g.utils.interpolate(st.velocity, autoSpeed * st.dir, scrollEase);
      st.progress += st.velocity;
      render();
    };
    g.ticker.add(this._reelTick);
    // ---- input: wheel is a speed impulse, drag steers directly through velocity; both decay to ambient ----
    if (window.Observer) {
      this._reelObs = window.Observer.create({
        target: stage, type: 'wheel,touch,pointer', preventDefault: true, lockAxis: true,
        onPress: () => { this._reelMoved = false; this._reelDragAcc = 0; this._reelKillVel(); stage.style.cursor = 'grabbing'; },
        onRelease: () => { stage.style.cursor = 'grab'; },
        onChange: (self) => {
          if (this.state.overlay) return;
          const wheel = self.event.type === 'wheel';
          const delta = wheel ? self.deltaY : (Math.abs(self.deltaX) > Math.abs(self.deltaY) ? self.deltaX : self.deltaY) * dragMultiplier;
          if (!wheel) {
            // click-vs-drag: past the threshold the gesture is a drag, and release must not open
            this._reelDragAcc += Math.abs(self.deltaX) + Math.abs(self.deltaY);
            if (this._reelDragAcc > 3) this._reelMoved = true;
          }
          if (!delta) return;
          if (wheel) this._reelKillVel();
          st.dir = this._reelDir = delta > 0 ? 1 : -1;
          if (this._reduce) { st.progress += delta * scrollSpeed / 100; render(); return; }   // reduced motion: direct rotate, no inertia
          st.active = true;
          st.velocity = g.utils.clamp(-maxSpeed, maxSpeed, st.velocity + delta * scrollSpeed / 100);
        },
      });
    }
    const chrome = [...layer.querySelectorAll('[data-reel-chrome]')];
    const revisit = typeof this._reelProgSave === 'number';
    if (this._reduce) { /* static helix: engine stays idle; drag/wheel rotate directly */ }
    else if (revisit) {
      // re-entry: pick the motion up in place — quick fade, no swirl drama, no reset
      st.active = true;
      this._reelIntro = g.timeline({ defaults: { ease: this.EASE.entrance } })
        .fromTo(layer, { autoAlpha: 0 }, { autoAlpha: 1, duration: .35, ease: 'none' }, 0)
        .fromTo(stage, { scale: .94 }, { scale: 1, duration: .6 }, 0)
        .fromTo([...buttons, ...chrome], { autoAlpha: 0 }, { autoAlpha: 1, duration: .4 }, .05);
    }
    else {
      // first entry: the helix swirls a few cards settling to rest (the progress tween nests in the
      // timeline; _reelKillVel's killTweensOf(st) frees it on first gesture without dropping the fades)
      st.active = true;
      this._reelIntro = g.timeline({ defaults: { ease: this.EASE.entrance } })
        .fromTo(layer, { autoAlpha: 0 }, { autoAlpha: 1, duration: .4, ease: 'none' }, 0)
        .fromTo(st, { progress: st.progress - 5 }, { progress: st.progress, duration: 2 }, 0)
        .fromTo(stage, { scale: .8 }, { scale: 1, duration: 1.2 }, 0)
        .fromTo(buttons, { autoAlpha: 0 }, { autoAlpha: 1, stagger: { amount: .8, from: 'random' } }, 0)
        .fromTo(chrome, { autoAlpha: 0 }, { autoAlpha: 1, duration: .5 }, .7);
    }
    // ---- keyboard: arrows step the helix card-by-card; Enter opens (native click) ----
    this._reelKey = (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault(); this._kbdInput = true;
      const nn = this._reelContent ? this._reelContent.length : 0; if (!nn) return;
      this._reelIndex = ((this._reelIndex || 0) + (e.key === 'ArrowRight' ? 1 : -1) + nn) % nn;
      this.reelFocusPanel(this._reelIndex);
      const btn = this._reelContent[this._reelIndex];
      if (btn) try { btn.focus(); } catch (err) { }
    };
    layer.addEventListener('keydown', this._reelKey);
    // lifecycle: hidden tab pauses; resize destroys+recreates while active (debounced)
    this._reelVis = () => { if (!this._reelState) return; if (document.hidden) { this._reelFreeze(); } else if (!this._reduce && !this.state.overlay) { this._reelResume(); } };
    document.addEventListener('visibilitychange', this._reelVis);
    this._reelW = window.innerWidth;
    this._reelResize = () => { clearTimeout(this._reelRzT); this._reelRzT = setTimeout(() => { if (this.state.feedView !== 'carousel') return; if (window.innerWidth === this._reelW) return; this.killReel(); this.initReel(); }, 200); };
    window.addEventListener('resize', this._reelResize);
  },
  _reelKillVel() { if (this._reelVelTw) { try { this._reelVelTw.kill(); } catch (e) { } this._reelVelTw = null; } const g = window.gsap; if (g && this._reelState) try { g.killTweensOf(this._reelState); } catch (e) { } },
  _reelFreeze() { this._reelKillVel(); if (this._reelState) { this._reelState.velocity = 0; this._reelState.active = false; } },
  _reelResume() { if (this._reduce || !this._reelState) return; this._reelState.active = true; },   // velocity lerps back up to ambient on its own
  // keyboard-only rotation-to-focus: tween progress so card pi rests at the front (index 0)
  reelFocusPanel(pi) {
    const g = window.gsap, st = this._reelState; if (!g || !st) return;
    this._reelIndex = pi;
    this._reelKillVel(); st.velocity = 0; st.active = false;
    const cur = ((st.progress % st.amount) + st.amount) % st.amount, tgt = ((-pi % st.amount) + st.amount) % st.amount;   // (pi + progress) ≡ 0 (mod amount)
    let d = tgt - cur; if (d > st.amount * 0.5) d -= st.amount; if (d < -st.amount * 0.5) d += st.amount;
    if (this._reduce) { st.progress += d; if (this._reelRender) this._reelRender(); return; }
    this._reelVelTw = g.to(st, { progress: st.progress + d, duration: .6, ease: this.EASE.entrance, onUpdate: this._reelRender });
  },
  // exit: quick settle/fade on the still-built helix; hide synchronously, teardown only in done()
  closeReel(done) {
    const g = window.gsap, layer = document.querySelector('[data-reel-layer]');
    const finish = () => { if (layer) try { layer.style.visibility = 'hidden'; } catch (e) { } done(); };
    if (this._reduce || !g || !layer || !this._reelBuilt()) { finish(); return; }
    this._reelKillVel();
    if (this._reelIntro) { try { this._reelIntro.kill(); } catch (e) { } this._reelIntro = null; }
    if (this._reelState) this._reelState.active = false;
    const stage = document.querySelector('[data-reel-stage]');
    g.timeline({ defaults: { ease: this.EASE.exit }, onComplete: finish })
      .to([...layer.querySelectorAll('[data-reel-chrome]')], { autoAlpha: 0, duration: .25 }, 0)
      .to(stage, { scale: .96, duration: .45 }, 0)
      .to(layer, { autoAlpha: 0, duration: .45 }, .05);
  },
  killReel() {
    const g = window.gsap;
    if (this._reelState) { this._reelProgSave = ((this._reelState.progress % this._reelState.amount) + this._reelState.amount) % this._reelState.amount; }   // remember spin across entries
    this._reelKillVel();
    if (this._reelIntro) { try { this._reelIntro.kill(); } catch (e) { } this._reelIntro = null; }
    if (this._reelTick) { try { if (g) g.ticker.remove(this._reelTick); } catch (e) { } this._reelTick = null; }
    this._reelState = null; this._reelRender = null;
    if (this._reelObs) { try { this._reelObs.kill(); } catch (e) { } this._reelObs = null; }
    const layer = document.querySelector('[data-reel-layer]'), stage = document.querySelector('[data-reel-stage]'), list = document.querySelector('[data-reel-list]');
    if (this._reelKey && layer) { layer.removeEventListener('keydown', this._reelKey); this._reelKey = null; }
    if (stage) stage.style.cursor = 'grab';
    if (this._reelVis) { document.removeEventListener('visibilitychange', this._reelVis); this._reelVis = null; }
    if (this._reelResize) { window.removeEventListener('resize', this._reelResize); this._reelResize = null; }
    clearTimeout(this._reelRzT);
    if (list) list.innerHTML = '';
    if (g && layer) try { g.set([layer, stage], { clearProps: 'transform,opacity,scale' }); } catch (e) { }
    this._reelPanels = null; this._reelContent = null; this._reelIndex = 0;
  },
};
