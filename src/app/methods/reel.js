// 3D reel (cylinder of reference images). Osmo 3D-carousel mechanic, adapted: panels on a
// cylinder (rotationY + transformOrigin -radius), a proxy rotation engine (wrapped arithmetic,
// never a timeline playhead), hand-rolled pointer drag with gsap-tweened inertia, wheel via the
// vendored Observer. Ambient spin is a sanctioned exception (user-chosen view, like the orbit
// landing); it ends with the view. Click (never drag) opens the SAME detail overlay.
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
    // every scoped palette gets exactly ONE panel item (feed order, never capped);
    // wrap/duplicate ONLY to reach the density minimum — duplicates stay decorative
    const items = pals.map((p) => ({ p, dup: false })); let k = 0;
    while (items.length < 10) { items.push({ p: pals[k % pals.length], dup: true }); k++; }
    const groups = []; let i = 0, two = true;
    while (i < items.length) { const take = (two && items.length - i > 1) ? 2 : 1; groups.push(items.slice(i, i + take)); i += take; two = !two; }
    // geometry: the cylinder grows with panel count (circumference fit + breathing room)
    const panelW = window.innerWidth * 0.13;                    // 13em at font-size:1vw
    const radius = Math.max(window.innerWidth * 0.5, (groups.length * panelW * 1.15) / (2 * Math.PI));
    stage.style.perspective = Math.max(90, Math.round(90 * radius / (window.innerWidth * 0.5))) + 'vw';
    const panelEls = [], contentEls = [];
    groups.forEach((group, pi) => {
      const pe = document.createElement('div');
      pe.style.cssText = 'position:absolute;width:13em;height:39em;display:flex;flex-direction:column;justify-content:' + (pi % 2 ? 'center' : 'space-between') + ';align-items:stretch;gap:1em;will-change:transform';
      pe.style.transformOrigin = '50% 50% ' + (-radius) + 'px';
      group.forEach((it) => {
        const b = document.createElement('button');
        b.type = 'button'; b.setAttribute('data-focus', 'card');
        b.setAttribute('aria-label', 'Open ' + it.p.name + ' detail');
        if (it.dup) { b.setAttribute('aria-hidden', 'true'); b.tabIndex = -1; }
        b.style.cssText = 'position:relative;aspect-ratio:1;width:100%;padding:0;margin:0;border:none;background:var(--line);cursor:pointer;overflow:hidden;display:block';
        const im = document.createElement('span');
        im.setAttribute('aria-hidden', 'true');
        if (this.hasImg(it.p)) {
          im.style.cssText = 'position:absolute;inset:0;background-image:url("' + this.dispUrl(it.p) + '");background-size:cover;background-position:center;display:block';
        } else {
          // imageless palette: its swatches as the soft gradient field (same treatment as list/grid fallbacks)
          const denom = Math.max(1, it.p.swatches.length - 1);
          const stops = it.p.swatches.map((sw, si) => sw.hex + ' ' + Math.round(si / denom * 100) + '%').join(', ');
          im.style.cssText = 'position:absolute;inset:0;background:linear-gradient(135deg, ' + stops + ');background-size:220% 220%;display:block';
        }
        b.appendChild(im);
        b.addEventListener('click', () => { if (this._reelMoved) return; this._reelFreeze(); this.openOverlay(it.p, b); });
        b.addEventListener('focus', () => { if (this._kbdInput) this.reelFocusPanel(pi); });
        pe.appendChild(b); contentEls.push(b);
      });
      list.appendChild(pe); panelEls.push(pe);
    });
    this._reelPanels = panelEls; this._reelContent = contentEls; this._reelIndex = 0;

    // ---- proxy rotation engine: rotation is wrapped arithmetic, never a timeline playhead ----
    const n = panelEls.length;
    const base = panelEls.map((_, idx) => (idx * 360) / n);
    const setters = panelEls.map((pe) => g.quickSetter(pe, 'rotationY', 'deg'));
    const rot = this._reelRot = { v: (typeof this._reelRotSave === 'number') ? this._reelRotSave : 0 };
    const REST = 12;                                          // ambient resting speed, deg/s (360°/30s)
    this._reelDir = this._reelDir || -1;                        // resting travel direction
    const sp = this._reelSp = { s: 0 };
    const render = this._reelRender = () => { const a = ((rot.v % 360) + 360) % 360; for (let j = 0; j < n; j++) setters[j](base[j] + a); };
    render();
    this._reelTick = () => { if (!sp.s) return; rot.v += sp.s * (g.ticker.deltaRatio(60) / 60); render(); };
    g.ticker.add(this._reelTick);

    const chrome = [...layer.querySelectorAll('[data-reel-chrome]')];
    const revisit = typeof this._reelRotSave === 'number';
    if (this._reduce) { /* static ring: speed stays 0; drag rotates directly */ }
    else if (revisit) {
      // re-entry: pick the motion up in place — quick fade, no spin-up drama, no reset
      sp.s = this._reelDir * REST;
      this._reelIntro = g.timeline({ defaults: { ease: this.EASE.entrance } })
        .fromTo(layer, { autoAlpha: 0 }, { autoAlpha: 1, duration: .35, ease: 'none' }, 0)
        .fromTo(stage, { scale: .94 }, { scale: 1, duration: .6 }, 0)
        .fromTo([...contentEls, ...chrome], { autoAlpha: 0 }, { autoAlpha: 1, duration: .4 }, .05);
    }
    else {
      this._reelIntro = g.timeline({ defaults: { ease: this.EASE.entrance } })
        .fromTo(layer, { autoAlpha: 0 }, { autoAlpha: 1, duration: .4, ease: 'none' }, 0)
        .fromTo(sp, { s: this._reelDir * REST * 15 }, { s: this._reelDir * REST, duration: 2 }, 0)
        .fromTo(stage, { scale: .5 }, { scale: 1, duration: 1.2 }, 0)
        .fromTo(contentEls, { autoAlpha: 0 }, { autoAlpha: 1, stagger: { amount: .8, from: 'random' } }, 0)
        .fromTo(chrome, { autoAlpha: 0 }, { autoAlpha: 1, duration: .5 }, .7);
    }
    // ---- drag: pointer events; capture DEFERRED to the drag threshold so clicks reach the panels ----
    const dragDistance = window.innerWidth * 3;
    let startX = 0, startV = 0, lastX = 0, lastT = 0, vel = 0, down = false, pid = null;
    this._reelDown = (e) => {
      if (e.button !== undefined && e.button !== 0) return; down = true; this._reelMoved = false; pid = e.pointerId;
      startX = lastX = e.clientX; lastT = performance.now(); vel = 0;
      stage.style.cursor = 'grabbing';
      this._reelKillVel(); sp.s = 0;
      startV = rot.v;
      if (!this._reduce) g.to(contentEls, { clipPath: 'inset(5%)', duration: .3, ease: this.EASE.standard, overwrite: 'auto' });
    };
    this._reelMove = (e) => {
      if (!down) return; const dx = startX - e.clientX;
      if (!this._reelMoved && Math.abs(dx) > 3) { this._reelMoved = true; try { stage.setPointerCapture(pid); } catch (err) { } }
      const now = performance.now(); if (now > lastT) { vel = (lastX - e.clientX) / (now - lastT); lastX = e.clientX; lastT = now; }
      rot.v = startV - (dx / dragDistance) * 360; render();
    };
    this._reelUp = () => {
      if (!down) return; down = false; pid = null;
      stage.style.cursor = 'grab';
      if (this._reduce) return;                              // reduced motion: direct rotate, no inertia
      g.to(contentEls, { clipPath: 'inset(0%)', duration: .5, ease: this.EASE.standard, overwrite: 'auto' });
      const v0 = -(vel * 1000 / dragDistance) * 360;               // release velocity, deg/s
      if (this._reelMoved && Math.abs(v0) > 5) {
        this._reelDir = v0 < 0 ? -1 : 1;                            // resting direction follows the throw
        sp.s = g.utils.clamp(-REST * 60, REST * 60, v0);
        if (!this.state.overlay) this._reelVelTw = g.to(sp, { s: this._reelDir * REST, duration: 1.2, ease: 'power3.out' });
        else sp.s = 0;
      } else if (!this.state.overlay) { this._reelVelTw = g.to(sp, { s: this._reelDir * REST, duration: .3 }); }
    };
    stage.addEventListener('pointerdown', this._reelDown);
    stage.addEventListener('pointermove', this._reelMove);
    stage.addEventListener('pointerup', this._reelUp);
    stage.addEventListener('pointercancel', this._reelUp);
    // ---- wheel: a speed impulse decaying to the resting speed (backward is unlimited and safe) ----
    if (window.Observer) {
      this._reelObs = window.Observer.create({
        target: layer, type: 'wheel', preventDefault: true, onChangeY: (self) => {
          if (this._reduce || this.state.overlay || down) return;
          this._reelKillVel();
          const v = g.utils.clamp(-60, 60, self.velocityY * 0.005); // same clamp as the reference
          this._reelDir = v < 0 ? 1 : -1;                             // the gesture sets travel + resting direction
          sp.s = -v * REST;
          this._reelVelTw = g.to(sp, { s: this._reelDir * REST, duration: 1.2 });
        },
      });
    }
    // ---- keyboard: arrows step the cylinder panel-by-panel; Enter opens (native click) ----
    this._reelKey = (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault(); this._kbdInput = true;
      const nn = this._reelPanels ? this._reelPanels.length : 0; if (!nn) return;
      this._reelIndex = ((this._reelIndex || 0) + (e.key === 'ArrowRight' ? 1 : -1) + nn) % nn;
      this.reelFocusPanel(this._reelIndex);
      const btn = this._reelPanels[this._reelIndex].querySelector('button:not([aria-hidden])') || this._reelPanels[this._reelIndex].querySelector('button');
      if (btn) try { btn.focus(); } catch (err) { }
    };
    layer.addEventListener('keydown', this._reelKey);
    // lifecycle: hidden tab pauses; resize destroys+recreates while active (debounced)
    this._reelVis = () => { if (!this._reelSp) return; if (document.hidden) { this._reelFreeze(); } else if (!this._reduce && !this.state.overlay) { this._reelResume(); } };
    document.addEventListener('visibilitychange', this._reelVis);
    this._reelW = window.innerWidth;
    this._reelResize = () => { clearTimeout(this._reelRzT); this._reelRzT = setTimeout(() => { if (this.state.feedView !== 'carousel') return; if (window.innerWidth === this._reelW) return; this.killReel(); this.initReel(); }, 200); };
    window.addEventListener('resize', this._reelResize);
  },
  _reelKillVel() { if (this._reelVelTw) { try { this._reelVelTw.kill(); } catch (e) { } this._reelVelTw = null; } const g = window.gsap; if (g && this._reelSp) try { g.killTweensOf(this._reelSp); } catch (e) { } if (g && this._reelRot) try { g.killTweensOf(this._reelRot); } catch (e) { } },
  _reelFreeze() { this._reelKillVel(); if (this._reelSp) this._reelSp.s = 0; },
  _reelResume() { if (this._reduce || !this._reelSp || !window.gsap) return; this._reelVelTw = window.gsap.to(this._reelSp, { s: (this._reelDir || -1) * 12, duration: .4 }); },
  // keyboard-only rotation-to-focus: tween rot.v so panel pi rests at the front (angle 0)
  reelFocusPanel(pi) {
    const g = window.gsap, rot = this._reelRot; if (!g || !rot || !this._reelPanels) return;
    const n = this._reelPanels.length; if (!n) return;
    this._reelIndex = pi;
    this._reelKillVel(); if (this._reelSp) this._reelSp.s = 0;
    const cur = ((rot.v % 360) + 360) % 360, tgt = ((-(pi * 360) / n) % 360 + 360) % 360;   // base[pi]+v ≡ 0 (mod 360)
    let d = tgt - cur; if (d > 180) d -= 360; if (d < -180) d += 360;
    if (this._reduce) { rot.v += d; if (this._reelRender) this._reelRender(); return; }
    this._reelVelTw = g.to(rot, { v: rot.v + d, duration: .6, ease: this.EASE.entrance, onUpdate: this._reelRender });
  },
  // exit: quick settle/fade on the still-built reel; hide synchronously, teardown only in done()
  closeReel(done) {
    const g = window.gsap, layer = document.querySelector('[data-reel-layer]');
    const finish = () => { if (layer) try { layer.style.visibility = 'hidden'; } catch (e) { } done(); };
    if (this._reduce || !g || !layer || !this._reelBuilt()) { finish(); return; }
    this._reelKillVel();
    if (this._reelIntro) { try { this._reelIntro.kill(); } catch (e) { } this._reelIntro = null; }
    if (this._reelSp) this._reelSp.s = 0;
    const stage = document.querySelector('[data-reel-stage]');
    g.timeline({ defaults: { ease: this.EASE.exit }, onComplete: finish })
      .to([...layer.querySelectorAll('[data-reel-chrome]')], { autoAlpha: 0, duration: .25 }, 0)
      .to(stage, { scale: .96, duration: .45 }, 0)
      .to(layer, { autoAlpha: 0, duration: .45 }, .05);
  },
  killReel() {
    const g = window.gsap;
    if (this._reelRot) { this._reelRotSave = ((this._reelRot.v % 360) + 360) % 360; }   // remember rotation across entries
    this._reelKillVel();
    if (this._reelIntro) { try { this._reelIntro.kill(); } catch (e) { } this._reelIntro = null; }
    if (this._reelTick) { try { if (g) g.ticker.remove(this._reelTick); } catch (e) { } this._reelTick = null; }
    this._reelRot = null; this._reelSp = null; this._reelRender = null;
    if (this._reelObs) { try { this._reelObs.kill(); } catch (e) { } this._reelObs = null; }
    const layer = document.querySelector('[data-reel-layer]'), stage = document.querySelector('[data-reel-stage]'), list = document.querySelector('[data-reel-list]');
    if (this._reelKey && layer) { layer.removeEventListener('keydown', this._reelKey); this._reelKey = null; }
    if (stage) {
      if (this._reelDown) stage.removeEventListener('pointerdown', this._reelDown);
      if (this._reelMove) stage.removeEventListener('pointermove', this._reelMove);
      if (this._reelUp) { stage.removeEventListener('pointerup', this._reelUp); stage.removeEventListener('pointercancel', this._reelUp); }
      stage.style.cursor = 'grab';
    }
    this._reelDown = this._reelMove = this._reelUp = null;
    if (this._reelVis) { document.removeEventListener('visibilitychange', this._reelVis); this._reelVis = null; }
    if (this._reelResize) { window.removeEventListener('resize', this._reelResize); this._reelResize = null; }
    clearTimeout(this._reelRzT);
    if (list) list.innerHTML = '';
    if (g && layer) try { g.set([layer, stage], { clearProps: 'transform,opacity,scale' }); } catch (e) { }
    this._reelPanels = null; this._reelContent = null; this._reelIndex = 0;
  },
};
