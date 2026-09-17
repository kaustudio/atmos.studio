/* THE ATMOSPHERE WHILE A PHOTOGRAPH IS READ (17.09.26, by request).

   The processing stage shows a small, colourless version of the landing's field (nebulaField.js):
   the same turning disc with the same eye, a few hundred pixels across, floating on the page with no
   frame around it. Three decisions shaped it, each asked for directly.

   IT LIVES ON ITS OWN. It is not a picture in a box. The stage keeps its 380x250 slot for layout, but
   the slot has no ground and no rule, and the disc finishes inside it: the gas thins out to nothing at
   its own rim instead of being cut by an edge. The field's canvas overhangs the slot by FREE.margin so
   the far rim, which perspective pushes outward, is never clipped either.

   IT HAS NO COLOUR. While the reading runs the tool has not said anything about colour yet, so the
   atmosphere does not either. Its ramp is the landing's tonal ladder with the hue taken out: greys
   solved against `--surface`, running away from the page, so the gas is a shade of the page in both
   themes. PROC.look holds it to the near half of that ladder, which keeps the rim at a mid grey on
   light and a soft grey on dark. The colour arrives with the result.

   IT ENDS. When the reading is done the turn slows to rest, the gas dissolves and the bar completes over
   DUR.settle, and only then does the result take the stage (_procClose, from commitGenerated). An atmosphere that is
   cut mid-turn by the next screen reads as interrupted.

   Tried and set aside on the way, with recordings shown to the user: the palette's own colours filling
   the frame (too strong), and several blends of those over the old blobs (either too faint to
   recognise, or still a colour field in a box).

   THE 2D CANVAS IS THE FLOOR, in the landing's sense: neutral blobs turning round a soft ellipse of the
   same footprint (pipeline.js startCanvas). It is what shows where WebGL 2 never arrives, if the
   field is slow to build, and if the context is lost. When the field is expected the floor starts
   empty, so the disc arrives from nothing rather than over something else.

   ONE FIELD FOR THE SESSION. Created on the first generation and moved into each new slot after that,
   so a context, the 1MB noise volume and a shader link are paid once. The ramp depends only on the
   theme, so a later generation usually uploads nothing at all. Destroyed on unmount and on context
   loss, never between generations.

   OFF THE FIRST FRAME. The chunk is fetched on intent (hover, drag or browse on the dropzone), the build
   waits for the stage's first paint, and the shader links through the field's compile(), so the one
   long task this adds lands behind a frame that is already moving. */

const FREE = {
  /** The eye's radii and the rim as a multiple of them, in CSS pixels: a disc about 270x160 at the
      rim, with the gas mostly gone well before it. The landing's hole is 377x198 on a laptop; this is
      nearly its shape at a seventh of its width. */
  ix: 48,
  iy: 28,
  outN: 2.8,
  /** How far the field's canvas overhangs the 380x250 slot on every side. The slab's perspective
      pushes the rim's far side out to outN / (1 - spread) of the eye, about 206px, against a slot
      half-width of 190. */
  margin: 24,
  /** The floor's soft ellipse, the same footprint as the disc. */
  floorRx: 130,
  floorRy: 80,
};

const PROC = {
  /** Seconds for one revolution. The landing takes 105, a page's tempo, which barely moves in a beat
      of one to nine seconds. The disc is still rigid. */
  rotSecs: 60,
  /** How much faster the noise churns than on the landing, for the same reason. */
  churn: 1.6,
  /** The near half of the ladder only (see the header). Everything else in LOOK is the landing's. */
  look: { tone: 0.2, toneSlope: 0.25 },
  /** Buffer scale, as a multiple of the device pixel ratio (capped at 2). The disc is small enough
      that full density costs a fraction of one landing frame; the governor steps down from here. */
  scales: [1, 0.75, 0.5],
  /** How long the floor waits for the field before it shows itself, in ms. The field is usually on
      within 150ms of the drop; this only fires on a slow first download. */
  floorWait: 600,
  /** The share of the natural end (DUR.settle) the bar takes to complete, so it is full before the
      gas has finished going. */
  barShare: 0.6,
  /** Two lost contexts in one session and the stage stops asking: the floor is a complete picture. */
  maxFails: 2,
};

export const procFieldMethods = {
  /* The chunk, on intent. Idempotent, and the promise is the cache. Returns null when there will be
     no field this session (no WebGL 2, or it has failed too often), which is how the floor knows to
     show itself at once. */
  _procFieldPrefetch() {
    if (this._procMod) return this._procMod;
    if ((this._procFails || 0) >= PROC.maxFails || !this._fieldOK()) return null;
    this._procMod = import('../nebulaField.js').catch(() => { this._procMod = null; return null; });
    return this._procMod;
  },
  /* The same ask from an input that counts toward responsiveness (a click, a tap, Enter), posted past
     the next paint. The first prefetch probes WebGL 2 by making a context, which measured 5-6ms at 1x
     and 12-29ms at 4x CPU, and in a click or a tap's compatibility mouseover that time is the
     interaction's own (review of 17.09.26). The picker or the drag takes far longer than a frame, and
     a stage that mounts first runs the probe itself in _procFieldStart. Drag events call the
     prefetch directly: they are not counted. */
  _procFieldIntent() {
    if (this._procMod || this._procIntent) return;
    const go = () => {
      if (!this._procIntent) return;
      clearTimeout(this._procIntent);
      this._procIntent = null;
      this._procFieldPrefetch();
    };
    this._procIntent = setTimeout(go, 250);
    requestAnimationFrame(() => setTimeout(go, 0));
  },

  /* The ladder with no hue in it, 4x32. Every column is the same, because a colourless wheel is one
     colour all the way round, and the texture wraps. Rows run as the landing's ramp does, nearest the
     page at 0 and furthest at 1, through the same five rungs (_ladder) and the same gamut map.
     Memoised on the theme, the only thing it depends on. */
  _procRamp() {
    const key = this.state.theme;
    if (this._procRampData && this._procRampKey === key) return this._procRampData;
    const rung = this._ladder(0), W = 4, H = 32;
    const data = new Uint8Array(W * H * 4);
    for (let y = 0; y < H; y++) {
      const t = (y / (H - 1)) * 4;
      const j0 = Math.min(Math.floor(t), 3), g = t - j0;
      const L = rung[j0] + (rung[j0 + 1] - rung[j0]) * g;
      const v = parseInt(this.gamutMap(L, 0, 0).slice(1), 16);
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        data[i] = (v >> 16) & 255; data[i + 1] = (v >> 8) & 255; data[i + 2] = v & 255; data[i + 3] = 255;
      }
    }
    this._procRampData = { data, width: W, height: H };
    this._procRampKey = key;
    return this._procRampData;
  },
  /* The floor's three greys, from the same ladder: rungs 1 to 3, the middle of the range the disc
     wears. Read by the floor on every paint, so they follow a theme switch. */
  _procGreys() {
    const key = this.state.theme;
    if (this._procGreysData && this._procGreysKey === key) return this._procGreysData;
    const rung = this._ladder(0);
    this._procGreysData = [1, 2, 3].map((j) => this.gamutMap(rung[j], 0, 0));
    this._procGreysKey = key;
    return this._procGreysData;
  },
  _procFloorShape() { return { floorRx: FREE.floorRx, floorRy: FREE.floorRy, rotSecs: PROC.rotSecs }; },

  /* Called by startCanvas once the floor is running. Everything below is asynchronous and checks, at
     every step, that the generation it was started for is still the one on screen. */
  _procFieldStart(pal) {
    const floorCv = this.canvasRef.current, floor = this._procFloor;
    if (!pal || !floorCv) return;
    const token = this._procToken = (this._procToken || 0) + 1;
    /* NOT ONCE THE CLOSE HAS BEGUN. A first build that lands during the natural end would fade the gas
       in at full speed while everything else is settling, and the commit would then cut it off at
       most of its opacity (review of 17.09.26, reproduced with a slow chunk). The build waits for the
       next generation instead, with the chunk already here. */
    const live = () => token === this._procToken && !this._procCloseCall && this.state.stage === 'processing'
      && this.state.pending === pal && floorCv.isConnected;
    const mod = this._procFieldPrefetch();
    if (!mod) { this._procFloorTo(1, true); return; }
    // Floor first, if the field is slow: a slot with nothing in it for more than a moment reads as
    // broken. The field dissolves over it when it does arrive.
    clearTimeout(this._procFloorT);
    this._procFloorT = setTimeout(() => {
      if (live() && !(this._proc && this._proc.on) && floor === this._procFloor) this._procFloorTo(1);
    }, PROC.floorWait);
    mod.then((m) => {
      if (!live()) return;
      if (!m) { this._procFloorTo(1); return; }
      /* After the stage's first paint. rAF alone is enough here: a hidden document has no frame to
         dress, the build runs when it is shown, and the floor timer above covers the wait. */
      requestAnimationFrame(() => setTimeout(() => { if (live()) this._procFieldMount(m, floorCv, live); }, 0));
    });
  },

  _procFieldMount(m, floorCv, live) {
    const ramp = this._procRamp();
    let P = this._proc;
    if (!P) {
      const cv = document.createElement('canvas');
      cv.setAttribute('data-proc-field', '1'); cv.setAttribute('aria-hidden', 'true');
      const o = FREE.margin;
      cv.style.cssText = 'position:absolute;left:' + -o + 'px;top:' + -o + 'px;width:calc(100% + ' + 2 * o + 'px);height:calc(100% + ' + 2 * o + 'px);pointer-events:none;opacity:0;';
      floorCv.after(cv);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      /* A COPY OF THE RAMP, for the reason _buildNebula gives: the field keeps the array it is handed
         as the texture's own buffer and setRamp writes into it, so handing over the memo would let a
         theme switch rewrite the bytes this module still files under the other theme. */
      const f = m.createNebulaField(cv, { data: new Uint8Array(ramp.data), width: ramp.width, height: ramp.height }, {
        innerX: FREE.ix, innerY: FREE.iy, outN: FREE.outN,
        look: PROC.look, sample: false, timeScale: PROC.churn,
        scales: PROC.scales.map((s) => s * dpr),
      });
      if (!f) { try { cv.remove(); } catch (e) { } this._procFails = PROC.maxFails; this._procMod = null; this._procFloorTo(1); return; }
      P = this._proc = { f, cv, rot: 0, speed: 1, theme: this.state.theme, on: false, added: false, tick: null, ready: f.compile() };
      f.onContextLost(() => this._procFieldLost(P));
      P.tick = (time, deltaMS) => {
        if (!P.on || this._proc !== P) return;
        const dt = Math.min(0.05, (deltaMS || 16.7) / 1000);
        P.rot = (P.rot + (360 / PROC.rotSecs) * dt * P.speed) % 360;
        P.f.update(dt, P.rot);
      };
    } else {
      if (P.theme !== this.state.theme) { P.f.setRamp(ramp); P.theme = this.state.theme; }
      P.speed = 1;
      floorCv.after(P.cv);
      // The canvas was detached since the last slot it sat in, and its observer measured it at nothing
      // on the way out. Re-measure now rather than on the observer's next frame, or the first render
      // lands in a 1x1 buffer.
      P.f.resize();
    }
    P.ready.then(() => {
      if (!live() || this._proc !== P) return;
      // A theme thrown while the shader was still linking, reconciled before anything is shown.
      if (P.theme !== this.state.theme) { P.f.setRamp(this._procRamp()); P.theme = this.state.theme; }
      P.f.renderStill(P.rot);
      this._procFieldReveal(P);
    });
  },

  /* The arrival: the gas in on the landing's own figures (_revealField), and the floor out if it had
     come up while the field was on its way. Reduced motion takes the picture without the motion: one
     still frame, no ticker, no fade. */
  _procFieldReveal(P) {
    const g = window.gsap;
    if (this._procCloseCall) return;
    P.on = true;
    if (!g || this._reduce) {
      P.cv.style.opacity = '1';
      this._procFloorTo(0, true);
      return;
    }
    const dur = this.DUR ? this.DUR.overlay : 0.8;
    const ease = this.EASE ? this.EASE.standard : 'power2.out';
    g.killTweensOf(P.cv);
    g.fromTo(P.cv, { opacity: 0 }, { opacity: 1, duration: dur, ease });
    this._procFloorTo(0);
    if (!P.added) { g.ticker.add(P.tick); P.added = true; }
  },

  /* The floor's share, eased on the same figures as the field (or over `dur`), or set at once.
     A tween toward the other value is killed BEFORE the value is compared: a tween started this frame
     has not rendered yet, so the floor still reads its old value, and returning early on that left
     the blobs coming up under a field that had just arrived (review of 17.09.26). */
  _procFloorTo(v, now, dur) {
    const floor = this._procFloor, g = window.gsap;
    if (!floor) return;
    if (g) g.killTweensOf(floor);
    if (floor.v === v) return;
    if (now || !g || this._reduce || document.hidden) { floor.v = v; floor.dirty = true; return; }
    g.to(floor, { v, duration: dur || (this.DUR ? this.DUR.overlay : 0.8), ease: this.EASE ? this.EASE.standard : 'power2.out', onUpdate: () => { floor.dirty = true; } });
  },

  /* THE NATURAL END. Called by commitGenerated with the commit itself as `done`. Returns false when it
     cannot take the commit over, and the caller commits at once. The turn eases to rest, the gas (or
     the floor, where there is no field) dissolves, and the bar completes, all before the result
     replaces the stage. Not under reduced motion, where nothing was moving, and not in a hidden
     document, where the ticker that drives all three is asleep. The timer is the backstop for a
     document hidden halfway: `done` runs exactly once whichever way it arrives. */
  _procClose(done) {
    const g = window.gsap, P = this._proc, floor = this._procFloor;
    if (!g || this._reduce || document.hidden || this.state.stage !== 'processing' || this._procCloseCall) return false;
    const field = !!(P && P.on && P.cv.isConnected);
    if (!field && !(floor && floor.v > 0)) return false;
    const dur = this.DUR ? this.DUR.settle : 0.7, ease = this.EASE ? this.EASE.standard : 'power2.out';
    if (field) {
      g.killTweensOf([P, P.cv]);
      g.to(P, { speed: 0, duration: dur, ease });
      g.to(P.cv, { opacity: 0, duration: dur, ease });
    }
    if (floor && floor.v > 0) this._procFloorTo(0, false, dur);
    const bar = this.progRef.current;
    if (bar) { g.killTweensOf(bar); g.to(bar, { scaleX: 1, duration: dur * PROC.barShare, ease }); }
    const finish = () => {
      if (!this._procCloseCall) return;
      this._procCloseEnd();
      done();
    };
    this._procCloseCall = g.delayedCall(dur, finish);
    this._procCloseT = setTimeout(finish, dur * 1000 + 250);
    return true;
  },
  _procCloseEnd() {
    if (this._procCloseCall) { try { this._procCloseCall.kill(); } catch (e) { } this._procCloseCall = null; }
    clearTimeout(this._procCloseT); this._procCloseT = null;
  },

  /* Takes the field out of play without destroying it: no tick, no tweens, not in the document. */
  _procDetach(P) {
    P.on = false;
    const g = window.gsap;
    if (P.added && g) { try { g.ticker.remove(P.tick); } catch (e) { } P.added = false; }
    try { if (g) g.killTweensOf([P, P.cv]); } catch (e) { }
    P.cv.style.opacity = '0';
    try { P.cv.remove(); } catch (e) { }
  },

  /* Called by stopCanvas, on every way out of the processing stage. Invalidates anything still in
     flight (a build, the floor's wait, a close) and detaches the field from a slot that is being, or has
     been, unmounted. The field itself is kept for the next generation. */
  _procFieldStop() {
    this._procToken = (this._procToken || 0) + 1;
    clearTimeout(this._procFloorT); this._procFloorT = null;
    this._procCloseEnd();
    if (this._proc) this._procDetach(this._proc);
  },

  /* A lost context mid-generation hands the slot back to its floor. The next generation builds a new
     field, up to PROC.maxFails. Only the field goes: a close already under way still commits. */
  _procFieldLost(P) {
    if (this._proc !== P) return;
    this._procFails = (this._procFails || 0) + 1;
    if (this._procFails >= PROC.maxFails) this._procMod = null;
    this._procFieldDispose();
    if (this.state.stage === 'processing' && !this._procCloseCall) this._procFloorTo(1);
  },

  /* The field's compile() ends its own poll when the field is destroyed, so this can tear down at once,
     even with the first link still running. */
  _procFieldDispose() {
    if (this._procIntent) { clearTimeout(this._procIntent); this._procIntent = null; }
    const P = this._proc;
    if (!P) return;
    this._procDetach(P);
    this._proc = null;
    try { P.f.destroy(); } catch (e) { }
  },

  /* The ramp is solved against the page, so a theme thrown mid-generation is a new strip, as it is on
     the landing (refreshOrbitTheme). It applies whenever the field sits in the current slot, not only
     once it is on, and the reveal reconciles it again in case the switch landed mid-link. The floor
     reads its greys per paint, so it only needs a repaint. */
  _procFieldTheme() {
    if (this.state.stage !== 'processing') return;
    if (this._procFloor) this._procFloor.dirty = true;
    const P = this._proc;
    if (!P || !P.cv.isConnected || P.theme === this.state.theme) return;
    P.f.setRamp(this._procRamp());
    P.theme = this.state.theme;
    if (P.on && (this._reduce || !window.gsap)) P.f.renderStill(P.rot);
  },
};
