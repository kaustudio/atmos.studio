// Logo-reveal page loader: first-ever visit only, before the Get Started landing.
// A PHASE MACHINE — HIDDEN → ENTRANCE → FILLING → EXIT → GONE. One owner, one clock.
// Real load progress is buffered as DATA; it becomes motion only while phase === FILLING.
//
// TIMING CONTRACT: a slow connection may DELAY the bar, never TRUNCATE it. Real progress leads only
// while it can keep up — past FILL_BUDGET the network stops pacing and the bar completes on its own
// clock, so the run always reaches 100 and always earns its exit. The safety nets escalate in the
// same spirit: RESCUE hands a stuck run its ENDING and lets the real exit play, and only FLOOR —
// which no healthy run can reach — pulls the cover without ceremony.
//
// The window-load milestone is why this matters: it waits on every subresource on the page, so on a
// slow connection it lands late or never, and a bar tied to it stalls at 95 and gets cut mid-number.
const FILL_BUDGET = 4500;      // ms in FILLING before real progress stops holding the bar back
const CATCHUP = 0.05;          // per-frame lerp toward the buffered target
const CATCHUP_FORCED = 0.10;   // ...once the budget is spent: still a fill, just a decisive one
const RESCUE_MS = 9000;        // stuck fill/entrance → force the ending, keep the choreography
const FLOOR_MS = 12000;        // absolute last resort: the cover comes off however it can
export const loaderMethods = {
  _initLoader() {
    if (!this.state.showLoader) return;
    const done = () => {
      if (this._loaderT1) { clearTimeout(this._loaderT1); this._loaderT1 = null; }
      if (this._loaderT2) { clearTimeout(this._loaderT2); this._loaderT2 = null; }
      this._loaderRescue = null;
      if (this._loaderPace) { clearInterval(this._loaderPace); this._loaderPace = null; }
      if (this._loaderFill) { try { window.gsap && window.gsap.ticker.remove(this._loaderFill); } catch (e) { } this._loaderFill = null; }
      // hide + release the covering layer synchronously — even if setState is somehow unable to unmount it
      try { const w = document.querySelector('[data-load-wrap]'); if (w) { w.style.pointerEvents = 'none'; w.style.display = 'none'; } } catch (e) { }
      // no-op on the normal path (the exit timeline already fired it) — this is the watchdog's
      // guarantee that armed lines can never be left parked below their masks
      try { this._landingTextReveal(); } catch (e) { }
      try { this.setState({ showLoader: false }); } catch (e) { }
    };
    // Watchdogs armed FIRST: no failure path below may strand the fixed covering layer. They
    // ESCALATE rather than jump-cut. RESCUE asks the run to finish itself — the fill takes its 100
    // and the real exit plays — and only if there is no run to rescue does it pull the cover here.
    this._loaderRescue = null;
    this._loaderT1 = setTimeout(() => {
      if (!this.state.showLoader) return;
      if (this._loaderRescue) { try { if (this._loaderRescue()) return; } catch (e) { } }
      try { this._loaderTl && this._loaderTl.kill(); } catch (e) { }
      done();
    }, RESCUE_MS);
    this._loaderT2 = setTimeout(() => { if (this.state.showLoader) { try { this._loaderTl && this._loaderTl.kill(); } catch (e) { } done(); } }, FLOOR_MS);
    if (this._reduce) { done(); return; }
    let tries = 0;
    const arm = () => {
      const g = window.gsap, wrap = document.querySelector('[data-load-wrap]');
      if (!g || !wrap) { if (++tries > 40) { done(); return; } setTimeout(arm, 100); return; }
      const bg = wrap.querySelector('[data-load-bg]'), bar = wrap.querySelector('[data-load-progress]'),
        logo = wrap.querySelector('[data-load-logo]'), num = wrap.querySelector('[data-load-num]');
      try { g.ticker.wake(); } catch (e) { }
      // the landing renders in the same commit as this cover — park its statement lines below their
      // masks now, while nothing can see them, so the fold never uncovers finished text
      this._landingTextArm(g);
      // ── PHASE MACHINE. Nothing writes the bar or the number outside render(), and render()
      // no-ops outside FILLING.
      let phase = 'HIDDEN';
      // progress buffer — milestones: GSAP + plugins ready, fonts ready, loader images, window load.
      const tasks = [];
      tasks.push(new Promise((res) => { let n = 0; const c = () => { if (window.gsap && window.Observer && window.Flip && window.ScrollToPlugin) { res(); } else if (++n > 80) { res(); } else setTimeout(c, 40); }; c(); }));
      try { tasks.push((document.fonts && document.fonts.ready) ? document.fonts.ready.catch(() => { }) : Promise.resolve()); } catch (e) { tasks.push(Promise.resolve()); }
      [...wrap.querySelectorAll('img')].forEach((im) => tasks.push(im.complete ? Promise.resolve() : new Promise((r) => { im.addEventListener('load', r, { once: true }); im.addEventListener('error', r, { once: true }); })));
      tasks.push(document.readyState === 'complete' ? Promise.resolve() : new Promise((r) => window.addEventListener('load', r, { once: true })));
      const total = tasks.length || 1; let doneN = 0, allDone = false;
      tasks.forEach((p) => Promise.resolve(p).then(() => { doneN++; }).catch(() => { doneN++; }));
      Promise.all(tasks.map((p) => Promise.resolve(p).catch(() => { }))).then(() => { allDone = true; });
      let shown = 0, forced = false, lastTick = 0;
      const nowMs = () => { try { return performance.now(); } catch (e) { return new Date().getTime(); } };
      const render = () => { if (phase !== 'FILLING') return; const pct = Math.round(shown * 100); if (num) num.textContent = String(pct); g.set(bar, { scaleX: shown }); };
      const beginExit = () => {
        if (phase !== 'FILLING') return; phase = 'EXIT';
        if (this._loaderFill) { try { g.ticker.remove(this._loaderFill); } catch (e) { } this._loaderFill = null; }
        num && (num.textContent = '100'); g.set(bar, { scaleX: 1 });
        const ex = this._loaderExitEase || (this._loaderExitEase = this.cubicBezier(0.215, 0.61, 0.355, 1));
        const tl = g.timeline({ onComplete: () => { phase = 'GONE'; done(); } });
        tl.to({}, { duration: 0.2 });                                                           // brief hold at 100
        // exit mirrors the entrance: Wordmark → Progress → bar
        tl.to(logo, { yPercent: -110, duration: 0.6, ease: ex }, 0);                                 // 1. wordmark out the top
        tl.to(num, { yPercent: -110, duration: 0.6, ease: ex }, 0.15);                               // 2. progress (at 100) follows out the top
        tl.to(bar, { scaleX: 0, transformOrigin: 'right center', duration: 0.6, ease: ex }, 0.3);      // 3. bar exits to the right
        tl.to(bg, { yPercent: -101, duration: 0.95, ease: this._foldEase || (this._foldEase = this.cubicBezier(0.19, 1, 0.22, 1)) }, 0.8);   // fold lifts, unchanged
        // the fold is expo-out: it clears the centre of the viewport ~0.1s in, so the lines start
        // rising just behind its trailing edge rather than after a beat of empty landing
        tl.call(() => this._landingTextReveal(g), null, '<+0.15');
        this._loaderTl = tl; tl.play(0);
      };
      const startFill = () => {
        if (phase !== 'ENTRANCE') return; phase = 'FILLING';       // the ONLY gate: entrance onComplete
        const t0 = nowMs();
        const loop = () => {
          if (phase !== 'FILLING') return;
          lastTick = nowMs();   // proof the clock driving this run is alive (read by the rescue)
          // Real progress leads only while it can keep up. Past the budget the network stops pacing
          // the bar and the fill completes on its own clock — otherwise a late window-load pins the
          // target at 0.95 forever and the run gets cut off mid-number instead of finishing.
          if (!forced && nowMs() - t0 >= FILL_BUDGET) forced = true;
          const finishing = allDone || forced;
          const target = finishing ? 1 : Math.min(doneN / total, 0.95);
          shown += (target - shown) * (forced ? CATCHUP_FORCED : CATCHUP);
          if (finishing && shown > 0.995) shown = 1;
          render();
          if (shown >= 1) beginExit();
        };
        g.ticker.add(loop); this._loaderFill = loop;
      };
      const enter = () => {
        if (phase !== 'HIDDEN') return; phase = 'ENTRANCE';
        g.set(bar, { scaleX: 0 }); if (num) num.textContent = '0';   // bar frozen, number frozen at 0 — fill is forbidden here
        // normalize the baked translateY(110%) — GSAP parses it as a PIXEL y, so zero that and
        // re-express the offset as yPercent, which the entrance and exit tweens actually drive.
        g.set([logo, num], { y: 0, yPercent: 110 });
        const tl = g.timeline({ delay: 0.25 });
        tl.to(logo, { yPercent: 0, duration: 0.8, ease: this.EASE.entrance }, 0);      // wordmark rises bottom → centre of its mask
        tl.to(num, { yPercent: 0, duration: 0.8, ease: this.EASE.entrance }, 0.15);    // progress follows
        tl.call(startFill, null, 0.35);                                          // bar begins just after the progress rise has started
      };
      // What RESCUE calls. The job is to hand the run its ENDING, not to cut it off: a fill still
      // crawling is released to finish, an entrance that never got frames is posed so the exit has
      // something to animate out, and an exit already running is left alone — the pace pump below
      // owns that one and FLOOR sits behind it. Returns true when the run can finish itself.
      this._loaderRescue = () => {
        if (phase === 'EXIT' || phase === 'GONE') return true;
        if (phase === 'HIDDEN' || phase === 'ENTRANCE') {
          try { g.set([logo, num], { y: 0, yPercent: 0 }); } catch (e) { }
          phase = 'ENTRANCE'; startFill();
        }
        forced = true;
        // Claim the run only if the clock driving it is demonstrably alive. A slow NETWORK deserves
        // the extra time; a dead ticker has no ending coming, and holding the cover for it would
        // just be a longer stall than the cut it replaces.
        return phase === 'FILLING' && lastTick > 0 && (nowMs() - lastTick) < 600;
      };
      requestAnimationFrame(() => requestAnimationFrame(enter));   // first painted frame + the 0.25s beat
      // Stall pump for the EXIT timeline only: if the rAF ticker sleeps mid-exit, step the
      // timeline's own clock so the cover always lifts and completes.
      // An ABSENT timeline means the exit has not begun yet, not that the pump is finished — the
      // exit is only built ~2.7s in, so tearing down on !t2 (as this did) killed the pump on its
      // first tick and left the fold with no protection at all. Only the loader ending stops it.
      let last = -1;
      this._loaderPace = setInterval(() => {
        if (!this.state.showLoader) { if (this._loaderPace) { clearInterval(this._loaderPace); this._loaderPace = null; } return; }
        const t2 = this._loaderTl;
        if (!t2) { last = -1; return; }   // still filling — wait for the exit rather than expiring
        const now = t2.time();
        if (now === last) { try { t2.time(Math.min(now + 0.1, t2.duration()), false); } catch (e) { } }
        last = t2.time();
      }, 100);
    };
    arm();
  },
};
