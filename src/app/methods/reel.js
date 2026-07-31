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
    const DRAG_SLOP = 8;                                        // px of travel before a press counts as a drag, not a click
    /* How much faster than its own cruising speed the helix turns at the peak of an arrival or a
       departure, as a multiple of autoSpeed. A SPEED rather than a distance, deliberately: the
       arrival and the departure are very different lengths, so matching the peak is what makes them
       read as the same gesture — the tornado leaves at the speed it came in at. Matching distance
       instead would have the short exit crawl and the long entrance sprint.
       Small, now that the climb along the spiral supplies the arrival's rotation on its own: this
       is only here to keep a floor under the turn while `lead` eases down onto its own zero, and to
       give the departure a wind-up the short travel could not manage by itself. */
    const SPIN_LEAD = 3;
    /* THE SETTLE CURVE, and the pacing that hands over to it.
       CLIMB_T is how long the streaming half runs, at a FLAT rate — cards pass through the frame at
       one speed, so each is legible as it goes rather than dissolving into the one behind it. The
       settle then has to pick up at exactly the speed the climb was running at, or the junction
       reads as a hitch: SETTLE takes off with a slope of 2 (y1/x1 = 0.5/0.25) and flattens to
       nothing, so matching means giving it a duration of 2·distance/rate. That is what SETTLE_T
       computes rather than assumes — the two halves stay joined however the geometry changes.
       SETTLE_BACK is the same curve reflected through the diagonal, for the departure. */
    const CLIMB_T = 1.5;
    const SETTLE = this.cubicBezier(0.25, 0.5, 0.35, 1);
    const SETTLE_BACK = this.cubicBezier(0.65, 0, 0.75, 0.5);
    // every scoped palette gets exactly ONE card (feed order, never capped); the helix then
    // wraps/duplicates in whole batches to reach the density the viewport needs — duplicates stay decorative
    const makeCard = (p, dup) => {
      const item = document.createElement('div');
      item.style.cssText = 'position:absolute;top:50%;left:50%;transform-style:preserve-3d;backface-visibility:visible;will-change:transform,filter';
      const b = document.createElement('button');
      b.type = 'button'; b.setAttribute('data-focus', 'card');
      b.setAttribute('aria-label', 'Open ' + p.name + ' detail');
      if (dup) { b.setAttribute('aria-hidden', 'true'); b.tabIndex = -1; }
      // pointer-events:auto re-arms the card inside the list's pointer-events:none (see AppView) —
      // the list steps out of hit-testing, the cards step back into it, one card at a time.
      b.style.cssText = 'position:relative;display:block;aspect-ratio:4/5;width:18em;padding:0;margin:0;border:none;background:var(--line);cursor:pointer;overflow:hidden;pointer-events:auto;-webkit-user-select:none;user-select:none';
      const im = document.createElement('span');
      im.setAttribute('aria-hidden', 'true');
      if (this.hasImg(p)) {
        im.style.cssText = 'position:absolute;inset:0;background-image:url("' + this.dispUrl(p) + '");background-size:cover;background-position:center;display:block';
      } else {
        // imageless palette: its swatches as the soft gradient field — the grid tile's fallback,
        // built from the same weight-true stops (pipeline.js), so one palette cannot arrive as two
        // different pictures depending on which view you opened
        im.style.cssText = 'position:absolute;inset:0;background:linear-gradient(135deg, ' + this.paletteStops(p) + ');background-size:220% 220%;display:block';
      }
      b.appendChild(im);
      // The palette itself, along the card's bottom edge. Until now the reel was the one surface
      // that showed a palette without showing its colours: an image (or a wash) stood in for five
      // measured swatches, and nothing on the card said how much of the palette each one holds.
      // Same band as the grid tile — bands grown by swatchGrow, flush to the edges, no gaps — so
      // the tornado reads as the same object the list and the grid are describing.
      const strip = document.createElement('span');
      strip.setAttribute('aria-hidden', 'true');
      strip.style.cssText = 'position:absolute;left:0;right:0;bottom:0;height:2.6em;display:flex';
      p.swatches.forEach((sw) => {
        const band = document.createElement('span');
        band.style.cssText = 'flex-grow:' + this.swatchGrow(sw) + ';flex-basis:0;min-width:0;background:' + sw.hex;
        strip.appendChild(band);
      });
      b.appendChild(strip);
      item.appendChild(b);
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
      // Already turning at ambient the instant it exists. Starting from a standstill meant the helix
      // had to spin ITSELF up through scrollEase every time it was built, so the first third of a
      // second of every arrival was a tornado accelerating from nothing — the one moment it should
      // look most alive.
      velocity: autoSpeed * (this._reelDir || 1),
      dir: this._reelDir || 1,
      active: false,
      /* How far down its OWN SPIRAL the formation is carried, measured in card-steps. 0 is the
         tornado at rest; the arrival and the departure are both a tween of this one number.

         It used to be a displacement in screen pixels, added to y and nothing else — which moved
         the cards PAST the curve rather than along it. A card entering slid straight up the screen
         at a fixed angle, holding whatever rotation the spin happened to give it, and arrived at a
         place on the helix it had never travelled to. In card-steps the same journey is the helix's
         own: y and angle both fall out of the index, so a card rises and swings around the orbit in
         the exact proportion the resting formation already sets, tracing the path the card at the
         front of the ring traces. The pitch does the work — one card-step is one card of rise and
         thirty degrees of turn, and that ratio is what makes it read as a helix instead of a stack. */
      lead: 0,
      /* THE SPIN'S OWN LIFE, kept apart from the travel. Extra rotation per frame, added by the
         ticker on top of whatever the velocity engine is already doing.

         The arrival used to drive `progress` and `offsetY` from ONE tween on ONE curve, which is
         what made the whole thing read as a single rigid object being slid up and down: the helix
         span exactly in step with the rise, decelerated in step with it, and stopped dead when it
         did. Worse, the tween ended at zero rotational speed and the ticker then had to lerp back up
         to ambient — so the tornado visibly stalled at the top of its own entrance before starting
         to drift again.

         A boost is a SPEED, not a position, so it hands over cleanly: it decays to nothing exactly
         as the rise lands, by which point the ticker is already carrying the ambient drift. There is
         no moment where the helix is not turning, and the two motions no longer share a clock. */
      boost: 0,
      ambient: autoSpeed,   // closeReel is outside this closure and needs the cruising speed to mirror the lead
    };
    const fadeStart = stage.offsetHeight * 0.5 + st.cardH * edgeOffset;   // beyond this a card renders at scale 0
    const edgeScaleAt = (y) => edgeEase(g.utils.clamp(0, 1, (fadeStart - Math.abs(y)) / (st.cardH * edgeScale)));
    /* HOW FAR DOWN THE SPIRAL LEAVES THE STAGE EMPTY, in card-steps. The highest card in the ring
       sits half the ring above centre, and a card stops being drawn at all once its own y passes
       fadeStart — so carrying the formation (halfRing + fadeStart/gap) steps down puts even that
       highest one past the cutoff, with a card of margin on top.

       Note what this no longer has to reason about. While the travel was in screen pixels it had to
       be divided by the perspective, because a card's screen displacement is its y scaled by
       P/(P−z) and the deepest cards were being projected barely half their own travel — three of
       them were measured still lying across the bottom edge, tops at 687–698px against a clip at
       720. In helix space the cards are not being pushed past the viewport at all; they are being
       carried out along the curve until edgeScaleAt takes them to nothing, and a card at scale 0 is
       invisible wherever the projection happens to put it. */
    st.clear = st.amount * 0.5 + fadeStart / st.gap + 1;
    /* WHERE THE CLIMB STOPS BEING A CLIMB. The first card to arrive is the one at the top of the
       ring, and it has cleared the top of the stage once its own index passes the draw cutoff on
       that side — which happens with this much of the travel still to run. Everything before this
       point is cards streaming up through the frame; everything after it is the formation coming to
       rest. Splitting the tween here is what lets the two halves have genuinely different speeds
       instead of one curve trying to be both.

       WHY THE DISTANCE ITSELF CANNOT SHRINK. The ring is `amount` steps around and the drawn band is
       narrower than it, so the only lead that empties the band is one that carries the whole ring
       past it — and `lead` must land on exactly 0, because index is bounded and stopping short would
       leave the top of the screen permanently unpopulated. So the travel is fixed and the only thing
       that can be tuned is how it is spent. It was being spent on an expo-out, which puts three
       quarters of eight hundred degrees into the first fifth of a second: every card in the ring
       through the frame at once, which is the smear. */
    st.settleAt = Math.max(0, st.amount * 0.5 - fadeStart / st.gap);
    /* THE PER-FRAME WRITE, TRIMMED TO WHAT ACTUALLY MOVES.
       The transform has to be rewritten every frame — that IS the tornado. The other three
       properties did not, and two of them were the expensive ones:

       `filter` carries a blur, and any change to it invalidates the card's rasterised layer and
       forces the compositor to redraw it. At ambient speed `back` drifts by about half a thousandth
       per frame, so every card on screen was being fully re-rasterised, sixty times a second, for a
       difference in the fourth decimal place. Quantising to 100 steps across the full front-to-back
       sweep makes a card redraw when its depth visibly changes — roughly every eighteenth frame —
       and the pass is indistinguishable: one step is 0.06px of blur and 0.75% of brightness.

       `zIndex` re-sorts a stacking context of thirty-odd promoted layers; it changes meaningfully
       only a few times per revolution. `autoAlpha: 1` was writing opacity and visibility onto cards
       that nothing ever hides.

       All three are now written only on change, and the two that are not transforms go straight to
       .style — GSAP has no tween to reconcile on them, so the property pipeline is pure overhead.

       `lead` IS PART OF THE INDEX, not a correction applied after it. Everything below — the angle,
       the height, the depth, the edge scaling, the blur — derives from the shifted value, because a
       card carrying a lead genuinely IS at that point on the helix and should look like it. That is
       the entire difference between travelling along the curve and being slid up the screen across
       it: the same card, at the same height, but turned to the angle the spiral puts it at.
       It is added AFTER the wrap, deliberately. The modulo is what makes the ring infinite, and an
       infinite ring cannot be emptied — spin it as far as you like and the screen stays exactly as
       full. Past the wrap the offset is free to carry the formation clean off the spiral. */
    const render = this._reelRender = () => {
      const radius = orbitDepth * st.em;
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        const loopIndex = ((i + st.progress) % st.amount + st.amount) % st.amount;
        const index = (loopIndex > st.amount * 0.5 ? loopIndex - st.amount : loopIndex) + st.lead;
        const angleDeg = index * rotationAngle;
        const angleRad = angleDeg * Math.PI / 180;
        const center = 1 - Math.min(Math.abs(index) / (st.amount * 0.5), 1);
        const y = index * st.gap;
        const scale = (minScale + center * (1 - minScale)) * edgeScaleAt(y);
        const back = g.utils.clamp(0, 1, (1 - Math.cos(angleRad)) * 0.5);
        g.set(it, {
          xPercent: -50, yPercent: -50,
          x: Math.sin(angleRad) * radius, y, z: (Math.cos(angleRad) - 1) * radius,
          rotateY: angleDeg, scale,
        });
        const q = Math.round(back * 100);
        if (it._reelQ !== q) { it._reelQ = q; const b = q / 100; it.style.filter = 'brightness(' + (1 - b * backDarkness) + ') blur(' + (b * backBlur) + 'em)'; }
        const zi = Math.round(center * 1000);
        if (it._reelZ !== zi) { it._reelZ = zi; it.style.zIndex = zi; }
      }
    };
    render();
    this._reelTick = () => {
      if (!st.active || this._reduce) return;
      st.velocity = g.utils.interpolate(st.velocity, autoSpeed * st.dir, scrollEase);
      st.progress += st.velocity + st.boost;   // ambient drift, plus whatever lead an arrival or a departure is carrying
      render();
    };
    g.ticker.add(this._reelTick);
    // ---- input: wheel is a speed impulse, drag steers directly through velocity; both decay to ambient ----
    if (window.Observer) {
      this._reelObs = window.Observer.create({
        target: stage, type: 'wheel,touch,pointer', preventDefault: true, lockAxis: true,
        onPress: () => { this._reelMoved = false; this._reelNetX = 0; this._reelNetY = 0; this._reelKillVel(); stage.style.cursor = 'grabbing'; },
        onRelease: () => { stage.style.cursor = 'grab'; },
        onChange: (self) => {
          if (this.state.overlay) return;
          const wheel = self.event.type === 'wheel';
          const delta = wheel ? self.deltaY : (Math.abs(self.deltaX) > Math.abs(self.deltaY) ? self.deltaX : self.deltaY) * dragMultiplier;
          if (!wheel) {
            // Click-vs-drag: past the threshold the gesture is a drag, and release must not open.
            // Measured as NET displacement from the press point, not as path length. Summing
            // |dx|+|dy| every frame charged a click for its own tremor — a hand resting on a mouse
            // wanders a few pixels before the button comes up, a trackpad tap always does, and at
            // the old 3px ceiling that arrived as "the card did not respond". Net distance lets a
            // wobble that returns to where it started stay a click, and still calls a real drag a
            // drag on its first few pixels of travel. DRAG_SLOP is the platform's own click slop.
            this._reelNetX += self.deltaX; this._reelNetY += self.deltaY;
            if (Math.sqrt(this._reelNetX * this._reelNetX + this._reelNetY * this._reelNetY) > DRAG_SLOP) this._reelMoved = true;
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
    // The chrome is React's, not ours — it survives a teardown still carrying the offset the last
    // exit slid it to. _reelChromeOut measures a live rect, so leaving that in place would have it
    // measure the off-screen position and compute a distance from where it already is.
    if (chrome.length) try { g.set(chrome, { clearProps: 'transform' }); } catch (e) { }
    const revisit = typeof this._reelProgSave === 'number';
    // climb at a flat rate, then settle picking up at exactly that rate (see CLIMB_T above)
    const climbSpan = Math.max(0.001, st.clear - st.settleAt);
    const climbT = revisit ? CLIMB_T * 0.75 : CLIMB_T;
    const settleT = st.settleAt > 0 ? (2 * st.settleAt * climbT) / climbSpan : 0;
    // closeReel is outside this closure — it mirrors the split from these
    st.settleT = settleT; st.arriveT = climbT + settleT;
    this._reelSettleBack = SETTLE_BACK;
    if (this._reduce) { /* static helix: engine stays idle; drag/wheel rotate directly */ }
    /* THE FORMATION RISES; NOTHING FADES.
       The cards used to resolve out of opacity on a scattered stagger, which is not how this object
       behaves — a tornado is a thing that MOVES, and its own trajectory is the only arrival it
       needs. So the whole formation starts a clear screen's worth below the stage and travels up
       its own axis into place, spinning as it comes. Cards enter through the bottom edge exactly as
       they do during ambient drift, at the size the helix says they are, and settle.

       There is no fade anywhere in either direction now: not on the cards, not on the chrome, not
       on the covering layer. The layer is simply present while the view is, and the formation
       being off-stage is what makes the screen empty.

       WHY A LEAD ALONG THE HELIX AND NOT A TRANSFORM ON THE LIST. The list carries the
       `perspective`, so moving it would drag the vanishing point down the screen with it and the
       projection would swim. Carrying each card along the spiral moves them inside the existing 3D
       scene instead, which leaves the camera exactly where it is.

       THE TRAVEL *IS* THE SPIN. Carrying `lead` down the spiral rotates the cards, because the
       helix's pitch couples the two — the clearing distance works out at some twenty-nine steps,
       which is around two and a half turns of the orbit. So the arrival no longer needs a separate
       rotation to look alive: the cards spiral up out of the bottom of the stage, swinging around
       the ring as they climb, and decelerate into the formation.

       What the boost is still for is the LAST part of that deceleration. `lead` has to land exactly
       on zero, so its own rate necessarily decays to zero with it, and a helix whose arrival ends at
       a dead stop has to be spun back up to ambient afterwards — the stall this pass set out to
       remove. A small boost decaying alongside it keeps a floor under the rotation all the way in,
       so the tornado is still turning at cruising speed at the moment it settles. It is a tenth of
       what it was when it had to carry the whole arrival on its own.

       The two values the entrance chose are recorded for the exit to mirror. Both arrivals travel
       the full distance — without a fade to hide behind, the screen has to be genuinely empty to
       start — and they differ in the boost and in the settle scale. */
    else if (revisit) {
      // re-entry: the same two-part climb, run a little quicker
      st.active = true;
      this._reelLead = SPIN_LEAD * 0.5; this._reelFromScale = .94;
      this._reelIntro = g.timeline()
        .fromTo(st, { lead: st.clear }, { lead: st.settleAt, duration: climbT, ease: 'none' }, 0)
        .to(st, { lead: 0, duration: settleT, ease: SETTLE }, climbT)
        .fromTo(st, { boost: autoSpeed * st.dir * this._reelLead }, { boost: 0, duration: st.arriveT * 0.8, ease: 'power2.out' }, 0)
        .fromTo(stage, { scale: .94 }, { scale: 1, duration: .6, ease: this.EASE.entrance }, 0)
        .fromTo(chrome, { y: (i, el) => this._reelChromeOut(el) }, { y: 0, duration: .5, ease: this.EASE.entrance }, climbT * 0.5);
    }
    else {
      // first entry: cards stream up through the frame at one readable rate until the leading one
      // clears the top, then the formation settles onto its rest position (_reelKillVel frees
      // progress and boost on the first gesture — but never lead, which would strand the climb)
      st.active = true;
      this._reelLead = SPIN_LEAD; this._reelFromScale = .8;
      this._reelIntro = g.timeline()
        .fromTo(st, { lead: st.clear }, { lead: st.settleAt, duration: climbT, ease: 'none' }, 0)
        .to(st, { lead: 0, duration: settleT, ease: SETTLE }, climbT)
        .fromTo(st, { boost: autoSpeed * st.dir * this._reelLead }, { boost: 0, duration: st.arriveT * 0.8, ease: 'power2.out' }, 0)
        .fromTo(stage, { scale: .8 }, { scale: 1, duration: 1.2, ease: this.EASE.entrance }, 0)
        .fromTo(chrome, { y: (i, el) => this._reelChromeOut(el) }, { y: 0, duration: .5, ease: this.EASE.entrance }, climbT * 0.6);
    }
    /* Draw the start of the arrival before anything can paint. `lead` lives on a plain object, so
       GSAP applying the timeline's from-values moves the NUMBER and nothing else — the cards stay
       where the build-time render() put them until the first ticker frame. That gap is one frame of
       the tornado sitting fully assembled at rest, immediately before it jumps below the stage to
       begin rising: the exact flash the fade used to cover for. */
    render();
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
  /* The chrome is the one piece of furniture on this surface that is not part of the tornado, and
     it is held to the same no-opacity rule: it leaves through whichever edge it is nearest, and
     arrives from there. Measured live rather than hard-coded to a corner, so moving the Close
     button or the drag hint cannot leave one of them sliding the wrong way. */
  _reelChromeOut(el) {
    const r = el.getBoundingClientRect(), vh = window.innerHeight || 800;
    return (r.top + r.height * 0.5) < vh * 0.5 ? -(r.bottom + 16) : (vh - r.top + 16);
  },
  /* Hand the spin back to whoever just grabbed it.
     SCOPED TO progress AND boost — never `lead`. This used to kill every tween of the state object,
     which was safe while the only one was the intro's rotation. The travel now lives on the same
     object, so an unscoped kill would freeze the formation wherever it had got to and leave the
     tornado hanging part-way up its own spiral with no tween left to finish it. A wheel during the
     arrival is a common thing to do; stranding the arrival on it is not acceptable.
     The lead is FOLDED INTO velocity rather than discarded. Zeroing it would drop the helix from
     three degrees a frame to a tenth of one between two frames, at the exact moment a hand arrives
     on it — the engine's own lerp should be what slows it down, from wherever it actually was. */
  _reelKillVel() {
    if (this._reelVelTw) { try { this._reelVelTw.kill(); } catch (e) { } this._reelVelTw = null; }
    const g = window.gsap, st = this._reelState;
    if (!g || !st) return;
    try { g.killTweensOf(st, 'progress,boost'); } catch (e) { }
    if (st.boost) { st.velocity += st.boost; st.boost = 0; }
  },
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
  /* THE EXIT IS THE ARRIVAL, RUN BACKWARDS — the same channels, the same distances, the opposite
     direction, the opposite curve. The formation sinks back down its own axis and off the bottom of
     the stage, un-swirling as it goes; the stage settles to the size it grew from; the chrome
     returns through the edge it came in through. Nothing fades, here or on the way in.

     WHY THIS IS HAND-WRITTEN AND THE UNIVERSE'S IS reverse(). The bloom animates opacity and scale
     and nothing else, so replaying it backwards is exact and free. Half of this gesture is not a
     property at all — the helix's rotation is produced by a running engine the reader also drives
     with the wheel and their hands, and there is no playhead to rewind. The departure is therefore
     expressed the way the arrival is: as a lead ON TOP of that engine, off wherever the reader
     actually left it.

       ENTRANCE (first entry, 2.20s — decelerating, arriving)
         0.00 ─ 2.20  formation climbs st.clear steps up the spiral into place       [expo-out]
         0.00 ─ 1.80  boost bleeds 3× ambient → ambient, holding the floor under it  [power2-out]
         0.00 ─ 1.20  stage grows 0.80 → 1
         0.80 ─ 1.30  chrome arrives through its nearest edge

       EXIT (0.68s — accelerating, departing)
         0.00 ─ 0.68  formation descends the same st.clear steps back down it        [ease-exit]
         0.00 ─ 0.68  boost builds ambient → the same 3×, winding up as it goes      [power2-in]
         0.00 ─ 0.68  stage returns to the size it grew from
         0.00 ─ 0.34  chrome leaves through the edge it arrived from

     THE SPIN IS MIRRORED IN SPEED, NOT IN DIRECTION. The entrance decelerates into ambient; the
     exit accelerates out of it. That is the honest reverse of the gesture, and it keeps the helix
     turning continuously through both hand-offs. Reversing the DIRECTION instead — which is the
     other reading of "run it backwards" — would stop the tornado dead at the moment of the click
     and start it the other way, on a surface the reader may still have a hand on. The reversal is
     carried by the axis that has an actual direction to reverse: the formation rises, then sinks.

     Under a third of the entrance's length, per the house rule that an exit is the softer of the
     pair — and the layer needs no beat of its own, because once the formation is st.clear steps
     down the spiral the stage is genuinely empty and there is nothing left to hide.

     WHY IT IS NOT SHORTER STILL. The clearing distance is fixed by the helix's own pitch, and at
     roughly two and a half turns of the orbit there is a floor below which the descent stops
     reading as cards travelling a path and starts reading as a smear. 0.52s was that smear. The
     counterweight is dead time at the end — the stage empties before the tween lands, because the
     cards nearest the front clear long before the ones at the top of the ring do — so this is the
     shortest the gesture goes while the path is still legible. */
  REEL_EXIT: .68,
  closeReel(done) {
    const g = window.gsap, layer = document.querySelector('[data-reel-layer]');
    const finish = () => { if (layer) try { layer.style.visibility = 'hidden'; } catch (e) { } done(); };
    if (this._reduce || !g || !layer || !this._reelBuilt()) { finish(); return; }
    this._reelKillVel();                                  // must precede the st tweens below — it kills boost tweens
    if (this._reelIntro) { try { this._reelIntro.kill(); } catch (e) { } this._reelIntro = null; }
    const st = this._reelState;
    /* THE TICKER KEEPS RUNNING THROUGH THE EXIT. It used to be switched off here so the departure
       tween could own the rotation outright, which meant the ambient drift stopped on the frame of
       the click and the spin restarted from whatever the tween dictated. Now the exit contributes a
       lead on top of the drift rather than replacing it, so the engine has to stay live: the helix
       is turning at cruising speed at the moment Close is pressed and simply keeps accelerating from
       there. It also makes the ticker the single renderer for both channels, so nothing needs an
       onUpdate to redraw the sink. */
    const stage = document.querySelector('[data-reel-stage]');
    const chrome = [...layer.querySelectorAll('[data-reel-chrome]')];
    const D = this.REEL_EXIT;
    // Floored: finish() flips the state that swaps the view, so a tab backgrounded mid-exit must not
    // be able to leave the reader on a stalled helix with no way off it (motion.js _exitFloor).
    const land = this._exitFloor('reel', D, finish);
    // Held so killReel can kill it. The floor can land the teardown while this is still running (a
    // backgrounded tab), and a timeline left alive would write stage and layer straight back over
    // the clearProps that teardown just did — the cleared-then-undone trap motion.js documents.
    if (this._reelExitTl) { try { this._reelExitTl.kill(); } catch (e) { } }
    const tl = this._reelExitTl = g.timeline({ defaults: { ease: this.EASE.exit }, onComplete: land });
    if (st) {
      st.active = true;                                   // keep the drift alive under the departure
      /* Back down the same spiral it climbed, in the same two parts, reflected. The formation eases
         OFF its rest position first — the mirror of the settle, so it does not lurch on the frame of
         the click — and once it is past the hand-over point it descends at the flat rate the arrival
         streamed at. The split is held at the same proportion of the whole, so the departure reads
         as the arrival in reverse however the geometry or either duration changes. */
      const outSettle = st.arriveT ? D * (st.settleT / st.arriveT) : 0;
      const outClimb = D - outSettle;
      tl.to(st, { lead: st.settleAt, duration: outSettle, ease: this._reelSettleBack }, 0);
      tl.to(st, { lead: st.clear, duration: outClimb, ease: 'none' }, outSettle);
      // ...and the boost winds UP as it goes, the mirror of the arrival's decay, so the departure is
      // still gaining speed at the moment it leaves rather than easing off at the end of a tween.
      tl.to(st, { boost: st.ambient * st.dir * (this._reelLead || 0), duration: D, ease: 'power2.in' }, 0);
    }
    if (stage) tl.to(stage, { scale: this._reelFromScale || .8, duration: D }, 0);
    if (chrome.length) tl.to(chrome, { y: (i, el) => this._reelChromeOut(el), duration: D * 0.5 }, 0);
  },
  killReel() {
    const g = window.gsap;
    if (this._reelState) { this._reelProgSave = ((this._reelState.progress % this._reelState.amount) + this._reelState.amount) % this._reelState.amount; }   // remember spin across entries
    this._reelKillVel();
    if (this._reelIntro) { try { this._reelIntro.kill(); } catch (e) { } this._reelIntro = null; }
    if (this._reelExitTl) { try { this._reelExitTl.kill(); } catch (e) { } this._reelExitTl = null; }
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
