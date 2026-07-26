/* Atmos Gallery — scroll reveals for the legal pages (privacy, terms).
   Kept out of legal-toc.js on purpose: that file is a third-party resource and stays as delivered.

   Two effects, both borrowed from the app rather than invented here:
     · masked reveal — an overflow-hidden block with the text sliding up inside it, the same
       yPercent 110 → 0 the landing lines and the loader wordmark use
     · rule draw     — the hairline above each h2 scaling out from its left edge

   THE FLOOR IS VISIBLE TEXT. These are legal documents; a reader must never be unable to read them
   because an animation did not run. Three things enforce that, and none should be removed:
     1. nothing is hidden in CSS — the hidden state is applied by this script, only after it has
        confirmed both GSAP and a willingness to animate
     2. --rule defaults to 1 in legal.css, so an undrawn line is impossible without JS
     3. a failsafe timer force-clears every pending reveal, mirroring the rAF-stall guard in
        orbit.js's _maskReveal — a backgrounded tab that never gets a frame must still end up legible
*/

(function () {
  // Motion tokens, copied from src/app/methods/motion.js so the legal pages move like the app.
  // Duplicated rather than imported because these pages never pass through Vite.
  var EASE_ENTRANCE = 'cubic-bezier(0.16, 1, 0.3, 1)';
  var DUR_REVEAL = 0.62;
  var STAGGER = 0.09;

  function init() {
    var g = window.gsap;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches;

    // No GSAP, or the reader asked for less motion: leave the document exactly as the CSS renders
    // it. Fully drawn rules, plain visible text, nothing to recover from.
    if (!g || reduce) return;

    var article = document.querySelector('[data-toc-content]');
    var hero = document.querySelector('.legal-hero');
    if (!article) return;

    var pending = [];        // everything not yet visually resolved, for the failsafe to sweep
    var started = new Set(); // reveals already handed to GSAP — guards against a second one

    // gsap.isTweening() reports false for a tween that has been created but has not yet had a tick,
    // so it cannot be used to answer "did I already start this?". With a parked ticker (hidden tab)
    // that window never closes, and every scroll event stacked another duplicate tween on the same
    // element — four deep on one paragraph before this was caught. An explicit set is the honest
    // answer to a question about intent rather than about current animation state.
    // Claiming also arms a per-element deadline. A claim is a promise that this element will be
    // resolved, and `started` would otherwise make that promise unbreakable: if the tween is created
    // while the ticker is parked (a page opened in a background tab) and then never advances, the
    // element is claimed, invisible, and permanently ineligible for another attempt. The timer is
    // the escape hatch — setTimeout, not rAF, for the same reason as the sweep below.
    function claim(el) {
      if (started.has(el)) return false;
      started.add(el);
      setTimeout(function () { if (stillWithheld(el)) rescue(el); }, 1500);
      return true;
    }

    // Wrap an element's contents in the mask/line pair and park the line below its mask.
    // Returns the inner line element, or null if it was already wrapped.
    function mask(el) {
      if (!el || el.querySelector(':scope > .reveal-mask')) return null;
      var outer = document.createElement('span');
      outer.className = 'reveal-mask';
      var inner = document.createElement('span');
      inner.className = 'reveal-line';
      while (el.firstChild) inner.appendChild(el.firstChild);
      outer.appendChild(inner);
      el.appendChild(outer);
      g.set(inner, { yPercent: 110 });
      pending.push(inner);
      return inner;
    }

    function revealLines(lines, delay) {
      lines = lines.filter(claim);
      if (!lines.length) return;
      g.to(lines, {
        yPercent: 0,
        duration: DUR_REVEAL,
        stagger: STAGGER,
        ease: EASE_ENTRANCE,
        delay: delay || 0,
        clearProps: 'transform',
        onComplete: function () { lines.forEach(drop); }
      });
    }

    function drop(el) {
      var i = pending.indexOf(el);
      if (i >= 0) pending.splice(i, 1);
    }

    // ---------------------------------------------------------------- hero (above the fold)

    if (hero) {
      var heroLines = ['.legal-hero__label', 'h1', '.legal-hero__sub', '.legal-hero__meta']
        .map(function (s) { return mask(hero.querySelector(s)); })
        .filter(Boolean);

      g.set(hero, { '--rule': 0 });
      pending.push(hero);
      revealLines(heroLines, 0.1);
      g.to(hero, {
        '--rule': 1,
        duration: 0.9,
        ease: EASE_ENTRANCE,
        delay: 0.1 + heroLines.length * STAGGER,
        onComplete: function () { hero.style.removeProperty('--rule'); drop(hero); }
      });
    }

    // ------------------------------------------------------- article (scroll-triggered)

    var ST = window.ScrollTrigger;
    var headings = [].slice.call(article.querySelectorAll('h2, h3'));
    var bodyBlocks = [].slice.call(article.querySelectorAll('p, ul, blockquote'));

    // No ScrollTrigger: reveal everything at once rather than leaving it parked forever.
    if (!ST) {
      revealLines(headings.map(mask).filter(Boolean), 0);
      return;
    }

    // The two reveals, factored out so a ScrollTrigger callback and the catch-up pass below can
    // both invoke them. Without that split, anything ScrollTrigger declines to announce would only
    // ever be recoverable by the snap-to-visible failsafe — correct, but not animated.
    function drawRule(h) {
      if (!claim(h)) return;
      g.to(h, {
        '--rule': 1,
        duration: 0.8,
        ease: EASE_ENTRANCE,
        onComplete: function () { h.style.removeProperty('--rule'); drop(h); }
      });
    }
    function revealBlock(b) {
      if (!claim(b)) return;
      g.to(b, {
        opacity: 1, y: 0, duration: 0.5, ease: EASE_ENTRANCE,
        clearProps: 'opacity,transform',
        onComplete: function () { drop(b); }
      });
    }

    headings.forEach(function (h) {
      var line = mask(h);
      var isH2 = h.tagName === 'H2';
      // The first h2's rule is display:none, so there is nothing to draw there.
      var hasRule = isH2 && h !== article.querySelector('h2');
      if (hasRule) { g.set(h, { '--rule': 0 }); pending.push(h); }

      ST.create({
        trigger: h,
        start: 'top 92%',
        once: true,
        onEnter: function () {
          if (line) revealLines([line], 0);
          if (hasRule) drawRule(h);
        }
      });
    });

    // Body copy gets a rise, not a mask — masking every paragraph of a terms document reads as a
    // showreel. start is deliberately late (95%) so text is revealed slightly before it is legible
    // rather than after.
    bodyBlocks.forEach(function (b) {
      g.set(b, { opacity: 0, y: 14 });
      pending.push(b);
      ST.create({
        trigger: b,
        start: 'top 95%',
        once: true,
        onEnter: function () { revealBlock(b); }
      });
    });

    // ---------------------------------------------------------------- catch-up

    // The reason this exists, because it is not obvious and cost a long time to find:
    //
    // These triggers are created at DOMContentLoaded, which on this site is BEFORE the local
    // Neue Montreal .otf files have loaded. At that moment the document is measurably shorter, so
    // headings well below the fold compute a start position that has *already been passed*.
    // ScrollTrigger deliberately does not fire enter callbacks for a trigger that begins life
    // inside its own range — that suppression is what stops animations replaying on every resize.
    // A later refresh() corrects the numbers but cannot undo the suppression: the trigger sits at
    // isActive:true having never announced itself, and scrolling can never make it enter again.
    // Those sections would stay parked until the failsafe snapped them into view, un-animated.
    //
    // So rather than trusting onEnter to be the only way in, sweep for anything whose start has
    // passed and reveal it properly. Runs after creation and after every event that can change
    // layout underneath us.
    function catchUp() {
      var limit = window.innerHeight * 0.95;
      pending.slice().forEach(function (el) {
        var isLine = el.classList.contains('reveal-line');
        var host = isLine ? el.parentNode.parentNode : el;
        if (host.getBoundingClientRect().top >= limit) return;   // genuinely still below — leave it
        if (isLine) revealLines([el], 0);
        else if (el.tagName === 'H2') drawRule(el);
        else revealBlock(el);
      });
    }

    // Wrapping changed the DOM; let the TOC's own triggers re-measure against it.
    ST.refresh();
    catchUp();
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { ST.refresh(); catchUp(); });
    }
    window.addEventListener('load', function () { ST.refresh(); catchUp(); });

    // ---------------------------------------------------------------- failsafe

    // A single timer would be wrong here. The app's _maskReveal can use one because its reveal
    // fires on arrival; these fire on scroll, so a flat "reveal everything after 3s" would wipe the
    // effect off the rest of the page for anyone who pauses to actually read.
    //
    // So the sweep is viewport-aware: it rescues only elements whose trigger point has already
    // passed and which are not currently animating. Anything still below the fold is legitimately
    // hidden and is left alone.
    function rescue(el) {
      try { g.killTweensOf(el); } catch (e) { }
      try { g.set(el, { clearProps: 'opacity,transform' }); } catch (e) { }
      el.style.removeProperty('--rule');
      drop(el);
    }

    // Is this element still visually withheld, as the browser currently computes it? Asked of
    // computed style rather than of GSAP, because the failure mode being guarded is "a tween exists
    // and is going nowhere" — and tween bookkeeping cannot see that.
    function stillWithheld(el) {
      var cs = getComputedStyle(el);
      if (+cs.opacity < 0.99) return true;
      var m = cs.transform;
      return m !== 'none' && m !== 'matrix(1, 0, 0, 1, 0, 0)';
    }

    var queued = null;
    function sweep() {
      queued = null;
      pending.slice().forEach(function (el) {
        var host = el.classList.contains('reveal-line') ? el.parentNode.parentNode : el;
        // Deliberately strict: only rescue what the reader has already scrolled PAST and which is
        // still withheld. An earlier version used `top < innerHeight`, which is wider than the 92%
        // trigger point — so it snapped elements into view a fraction of a second before their
        // reveal was due to start, and quietly replaced the animation with a jump on every scroll.
        // The failsafe must be the last resort, never the first responder.
        if (host.getBoundingClientRect().bottom < -40 && stillWithheld(el)) rescue(el);
      });
      if (!pending.length) teardown();
    }

    // Throttled with setTimeout, NOT requestAnimationFrame. This is the whole point of the guard:
    // the failure it exists for is a stalled ticker, and rAF is the first thing a stalled ticker
    // takes away — a hidden or throttled tab reports zero rAF callbacks, so an rAF-throttled
    // rescue could never run in precisely the case it was written for. Timers still fire.
    function onScroll() {
      if (queued) return;
      queued = setTimeout(function () {
        catchUp();   // animate anything ScrollTrigger declined to announce
        sweep();     // then snap only what is already scrolled past and still hidden
      }, 120);
    }
    function teardown() {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      document.removeEventListener('visibilitychange', onVisible);
      if (queued) { clearTimeout(queued); queued = null; }
    }

    // GSAP parks its ticker while the page is hidden, so anything mid-reveal is frozen mid-reveal.
    // It resumes on its own, but sweep here too: a reader arriving at a background tab that was
    // opened minutes ago should not be the person who discovers a stuck paragraph.
    function onVisible() {
      if (!document.hidden) { catchUp(); sweep(); }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    document.addEventListener('visibilitychange', onVisible);
    setTimeout(sweep, 1500);   // covers what was already on screen at load
  }

  document.addEventListener('DOMContentLoaded', init);
})();
