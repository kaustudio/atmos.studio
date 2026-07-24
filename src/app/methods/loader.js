// Logo-reveal page loader: first-ever visit only, before the Get Started landing.
// A PHASE MACHINE — HIDDEN → ENTRANCE → FILLING → EXIT → GONE. One owner, one clock.
// Real load progress is buffered as DATA; it becomes motion only while phase === FILLING.
export const loaderMethods = {
  _initLoader() {
    if (!this.state.showLoader) return;
    const done = () => {
      if (this._loaderPace) { clearInterval(this._loaderPace); this._loaderPace = null; }
      if (this._loaderFill) { try { window.gsap && window.gsap.ticker.remove(this._loaderFill); } catch (e) { } this._loaderFill = null; }
      // hide + release the covering layer synchronously — even if setState is somehow unable to unmount it
      try { const w = document.querySelector('[data-load-wrap]'); if (w) { w.style.pointerEvents = 'none'; w.style.display = 'none'; } } catch (e) { }
      try { this.setState({ showLoader: false }); } catch (e) { }
    };
    // watchdog armed FIRST: no failure path below may strand the fixed covering layer
    setTimeout(() => { if (this.state.showLoader) { try { this._loaderTl && this._loaderTl.kill(); } catch (e) { } done(); } }, 9000);
    if (this._reduce) { done(); return; }
    let tries = 0;
    const arm = () => {
      const g = window.gsap, wrap = document.querySelector('[data-load-wrap]');
      if (!g || !wrap) { if (++tries > 40) { done(); return; } setTimeout(arm, 100); return; }
      const bg = wrap.querySelector('[data-load-bg]'), bar = wrap.querySelector('[data-load-progress]'),
        logo = wrap.querySelector('[data-load-logo]'), num = wrap.querySelector('[data-load-num]');
      try { g.ticker.wake(); } catch (e) { }
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
      let shown = 0;
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
        tl.call(() => this._landingTextReveal(g), null, '<+0.45');
        this._loaderTl = tl; tl.play(0);
      };
      const startFill = () => {
        if (phase !== 'ENTRANCE') return; phase = 'FILLING';       // the ONLY gate: entrance onComplete
        const loop = () => {
          if (phase !== 'FILLING') return;
          // smooth catch-up to the buffered real progress, then track it to 100
          const target = allDone ? 1 : Math.min(doneN / total, 0.95);
          shown += (target - shown) * 0.05;
          if (allDone && shown > 0.995) shown = 1;
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
      requestAnimationFrame(() => requestAnimationFrame(enter));   // first painted frame + the 0.25s beat
      // stall pump for the EXIT timeline only: if the rAF ticker sleeps mid-exit, step the
      // timeline's own clock so the cover always lifts and completes.
      let last = -1;
      this._loaderPace = setInterval(() => {
        const t2 = this._loaderTl;
        if (!t2 || !this.state.showLoader) { if (this._loaderPace) { clearInterval(this._loaderPace); this._loaderPace = null; } return; }
        const now = t2.time();
        if (now === last) { try { t2.time(Math.min(now + 0.1, t2.duration()), false); } catch (e) { } }
        last = t2.time();
      }, 100);
    };
    arm();
  },
};
