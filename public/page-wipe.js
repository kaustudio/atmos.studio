/* Atmos Gallery — the curved wipe, carried BETWEEN documents.

   The app already plays this transition from the landing into the tool (src/app/methods/wipe.js): a
   dark panel with curved caps rises over the page, the wordmark rises into it, the swap happens behind
   the cover, and the panel continues up to reveal what arrived. Inside the app that is one document
   and one timeline. Privacy, terms and the app are three separate documents, so the same choreography
   has to be cut in half and handed over:

     leaving   cover the page, hold the brand beat, THEN set location
     arriving  start already covered, and play only the reveal

   The two halves are joined by one sessionStorage key. Nothing else can carry state across a document
   boundary here — there is no router, and these pages are static files.

   THE FLASH is the whole difficulty. Between the old document unloading and the new one painting, the
   browser shows its own blank page, and a transition that flashes white in the middle is worse than no
   transition. The cover therefore cannot be this script's job on arrival: this file is a subresource,
   so it loads too late. It is painted by an inline <style>/<script> pair in each page's <head> (see
   privacy.html) which puts a solid layer up on the very first paint, before anything else parses. This
   script then takes it over and animates it away.

   That inline snippet carries its own 3s timeout, and so does the reveal below. A page that is covered
   is a page nobody can read or click, so every path that raises the cover has an independent way of
   putting it back down — a failed animation must degrade to a visible page, never to a black one. */
(function () {
  'use strict';

  var COVER = '#1C1B1A';                 // the panel's ink — matches [data-wipe-panel] in AppView
  var WORD = '/assets/atmos-gallery-logo-white.svg';
  /* The pages that run this script. A link to anywhere else navigates plainly: the destination would
     have no cover to lift, so it would arrive black and wait for the timeout. Keep this in step with
     whichever pages actually include page-wipe.js — 404.html deliberately does not, since it would
     have to pull in GSAP for one transition. */
  var PAGES = { '/': 1, '/index.html': 1, '/privacy.html': 1, '/terms.html': 1 };

  var reduce = false;
  try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { }

  // The app's easing, restated rather than imported — these pages cannot reach src/lib/color.js, and
  // GSAP's named eases are not the same curves. Same solver, same control points as this.EASE.
  function cubicBezier(x1, y1, x2, y2) {
    var cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
    var cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    function fx(t) { return ((ax * t + bx) * t + cx) * t; }
    function fy(t) { return ((ay * t + by) * t + cy) * t; }
    function dfx(t) { return (3 * ax * t + 2 * bx) * t + cx; }
    return function (p) {
      var t = p;
      for (var i = 0; i < 8; i++) {
        var x = fx(t) - p; if (Math.abs(x) < 1e-5) break;
        var d = dfx(t); if (Math.abs(d) < 1e-6) break;
        t -= x / d;
      }
      return fy(Math.max(0, Math.min(1, t)));
    };
  }
  var ENTRANCE = cubicBezier(0.16, 1, 0.3, 1);
  var EXIT = cubicBezier(0.4, 0, 1, 1);

  function css(el, text) { el.style.cssText = text; return el; }

  /* The app renders this layer itself, so reuse it there rather than stacking a second one — its
     [data-wipe] is the element wipe.js drives, and two covers fighting over one screen is a bug that
     only shows up when someone clicks a footer link mid-transition. */
  function getLayer() {
    var existing = document.querySelector('[data-wipe]');
    if (existing) return existing;
    var layer = css(document.createElement('div'),
      'position:fixed;inset:0;z-index:160;pointer-events:none;overflow:hidden;display:none');
    layer.setAttribute('data-wipe', '1');
    layer.setAttribute('aria-hidden', 'true');
    var panel = css(document.createElement('div'),
      'position:absolute;inset:0;background:' + COVER + ';will-change:transform');
    panel.setAttribute('data-wipe-panel', '1');
    var capT = css(document.createElement('div'),
      'position:absolute;left:-8%;bottom:100%;width:116%;height:15vh;background:' + COVER +
      ';border-radius:50% 50% 0 0;transform:scaleY(0);transform-origin:bottom center');
    capT.setAttribute('data-wipe-cap-top', '1');
    var capB = css(document.createElement('div'),
      'position:absolute;left:-8%;top:100%;width:116%;height:15vh;background:' + COVER +
      ';border-radius:0 0 50% 50%;transform:scaleY(1);transform-origin:top center');
    capB.setAttribute('data-wipe-cap-bottom', '1');
    var centre = css(document.createElement('div'),
      'position:absolute;inset:0;display:flex;align-items:center;justify-content:center');
    var clip = css(document.createElement('div'), 'overflow:hidden;padding:8px 6px');
    var word = document.createElement('img');
    word.setAttribute('data-wipe-word', '1');
    word.src = WORD; word.alt = '';
    css(word, 'display:block;height:clamp(29px,4.81vw,53px);width:auto;transform:translateY(120%)');
    clip.appendChild(word); centre.appendChild(clip);
    panel.appendChild(capT); panel.appendChild(capB); panel.appendChild(centre);
    layer.appendChild(panel);
    /* Marked so the reveal can take it back out again. In the app this branch always runs: main.tsx is
       a module and therefore deferred, so React has not mounted its own [data-wipe] by the time this
       script initialises. Leaving ours behind would put two of them in the document, and wipe.js
       resolves its layer with querySelector — first in document order, which would then depend on
       whether #root or our appended node came first. One cover per page. */
    layer.setAttribute('data-wipe-transient', '1');
    document.body.appendChild(layer);
    return layer;
  }

  function parts(layer) {
    return {
      panel: layer.querySelector('[data-wipe-panel]'),
      capT: layer.querySelector('[data-wipe-cap-top]'),
      capB: layer.querySelector('[data-wipe-cap-bottom]'),
      word: layer.querySelector('[data-wipe-word]'),
    };
  }

  /* Everything the cover slides over. Explicitly NOT <body> itself: a transform on body would make it
     the containing block for position:fixed descendants, and the cover is one — it would start
     scrolling with the page mid-transition. Its children are safe to move. */
  function drifters(layer) {
    var out = [], kids = document.body.children;
    for (var i = 0; i < kids.length; i++) {
      var el = kids[i];
      if (el === layer || el.tagName === 'SCRIPT' || el.tagName === 'LINK' || el.tagName === 'STYLE') continue;
      out.push(el);
    }
    return out;
  }

  function uncover(layer) {
    document.documentElement.classList.remove('wipe-arriving');
    if (layer) layer.style.display = 'none';
  }

  // ---------------------------------------------------------------- arriving
  function reveal() {
    var g = window.gsap;
    var layer = getLayer();
    if (reduce || !g) { uncover(layer); return; }
    var p = parts(layer);

    // Take the inline snippet's cover over BEFORE releasing it: put the real panel in its covering
    // position, force a layout read so that state is committed, and only then drop the class. Both are
    // opaque and full-screen, so the handover is invisible — done in the other order it is a one-frame
    // flash of the page at full brightness.
    layer.style.display = 'block';
    g.set(p.panel, { yPercent: 0 });
    g.set(p.capT, { scaleY: 0 });
    g.set(p.capB, { scaleY: 1 });
    g.set(p.word, { yPercent: 0 });
    void layer.offsetHeight;
    document.documentElement.classList.remove('wipe-arriving');

    var done = false;
    var finish = function () {
      if (done) return; done = true;
      clearTimeout(guard);
      layer.style.display = 'none';
      try { g.set([p.panel, p.capT, p.capB, p.word], { clearProps: 'transform' }); } catch (e) { }
      if (layer.getAttribute('data-wipe-transient') && layer.parentNode) layer.parentNode.removeChild(layer);
    };
    // Same reasoning as the app's wipe watchdog: setTimeout still fires when rAF is throttled, and a
    // stranded cover here means an unreadable page rather than a missed flourish.
    var guard = setTimeout(finish, 3000);

    var tl = g.timeline({ onComplete: finish });
    tl.to(p.word, { yPercent: -130, duration: 0.6, ease: EXIT }, 0);
    tl.to(p.panel, { yPercent: -100, duration: 0.9, ease: ENTRANCE }, 0);
    tl.to(p.capB, { scaleY: 0, duration: 0.9, ease: ENTRANCE }, 0);
    try { g.ticker.wake(); } catch (e) { }
  }

  // ---------------------------------------------------------------- leaving
  var leaving = false;
  function cover(href) {
    var g = window.gsap;
    var layer = getLayer();
    if (reduce || !g || !layer) { window.location.href = href; return; }
    // A cover already on screen means the app's own wipe is mid-flight (Get Started, or the return to
    // the landing). Do not drive the same element from two timelines — just go.
    if (layer.style.display && layer.style.display !== 'none') { window.location.href = href; return; }
    if (leaving) return;
    leaving = true;

    var p = parts(layer);
    layer.style.display = 'block';
    layer.style.pointerEvents = 'auto';   // the page underneath is on its way out; stop it being clicked
    g.set(p.panel, { yPercent: 100 });
    g.set(p.capT, { scaleY: 0 });
    g.set(p.capB, { scaleY: 1 });
    g.set(p.word, { yPercent: 120 });

    var gone = false;
    var go = function () {
      if (gone) return; gone = true;
      clearTimeout(guard);
      try { sessionStorage.setItem('atmos/page-wipe', '1'); } catch (e) { }
      window.location.href = href;
    };
    // If the timeline never runs, the visitor is stuck looking at a page that will not leave. Navigate
    // on the clock regardless; arriving without the cover animation beats not arriving.
    var guard = setTimeout(go, 2200);

    var tl = g.timeline();
    tl.to(p.panel, { yPercent: 0, duration: 0.8, ease: ENTRANCE }, 0);
    tl.to(p.capT, { scaleY: 1, duration: 0.8, ease: ENTRANCE }, 0);
    var drift = drifters(layer);
    if (drift.length) tl.to(drift, { y: '-12vh', opacity: 0.5, duration: 0.8, ease: ENTRANCE }, 0);
    tl.to(p.word, { yPercent: 0, duration: 0.55, ease: ENTRANCE }, 0.6);
    // The app holds 0.45s here so the mark can be read, then swaps behind the cover. The swap is the
    // navigation, and the network is the hold — so leave as soon as the wordmark has landed.
    tl.call(go, null, 1.25);
    try { g.ticker.wake(); } catch (e) { }
  }

  // ---------------------------------------------------------------- links
  function shouldWipe(a, e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return null;
    if (!a || a.hasAttribute('download') || (a.target && a.target !== '_self')) return null;
    var url;
    try { url = new URL(a.href, window.location.href); } catch (err) { return null; }
    if (url.origin !== window.location.origin) return null;
    if (!PAGES[url.pathname]) return null;
    // Same page — a wipe that lands back where it started reads as a glitch, not a transition.
    if (url.pathname === window.location.pathname && url.search === window.location.search) return null;
    return url.href;
  }

  function onClick(e) {
    var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!a) return;
    var href = shouldWipe(a, e);
    if (!href) return;
    e.preventDefault();
    cover(href);
  }

  function init() {
    document.addEventListener('click', onClick);
    // window.__atmosArriving is set by the inline <head> snippet, which has already cleared the
    // sessionStorage key — reading it there rather than here is what stops a plain reload from
    // replaying the reveal.
    if (window.__atmosArriving) reveal();
    else document.documentElement.classList.remove('wipe-arriving');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  /* Back/forward. A page restored from the bfcache does not re-run any of this, and one that was
     covered when it left would come back covered. Clear on the way in either way. */
  window.addEventListener('pageshow', function (ev) {
    if (!ev.persisted) return;
    leaving = false;
    uncover(document.querySelector('[data-wipe]'));
  });
})();
