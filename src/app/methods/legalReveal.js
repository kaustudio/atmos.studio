/* Atmos Gallery — scroll reveals for the legal routes (privacy, terms).
   Kept out of legalToc.js on purpose: that file is a third-party resource and stays as delivered.

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

   ARM AND PLAY, which is new and is the reason the transition finally reads as one gesture. As a
   static document this ran everything at DOMContentLoaded — and so did the wipe's reveal, on the
   very same event. The panel takes 0.9s to clear the screen; the hero cascade takes about 1.0s. They
   ran on top of each other, so the cover lifted on copy that had already finished arriving and the
   page appeared to be simply *there*. Now init() only arms the hidden state, and play() starts the
   cascade — the wipe calls it as the panel's trailing edge clears, the same '<+0.15' offset the
   loader and Get Started already use. A cold load with no wipe plays immediately. */

/* MOTION IS NOT DEFINED HERE. It is handed in from the app (see LegalPage → renderVals.maskLines),
   which is the whole point: the landing and the dropzone already reveal masked lines through
   orbit.js's _maskArm/_maskReveal, and those two surfaces are the reference. This file restating
   0.62 / 0.09 / entrance as its own constants is exactly how the legal pages drifted out of step in
   the first place — the numbers matched, but the composition around them did not, and the tokens
   would have drifted the moment anyone retuned the app.

   Fallbacks exist only so the module is still usable if it is ever called without the app. */
var FALLBACK = { duration: 0.62, stagger: 0.09, ease: 'cubic-bezier(0.16, 1, 0.3, 1)' };

/* WHERE A SECTION ARRIVES, as a fraction of the viewport from the top — and the reason it is a
   constant rather than two numbers.

   The ScrollTrigger and the catch-up sweep below both decide when a section is due, and they used to
   disagree: the trigger fired at `top 88%` while catchUp revealed anything already above 95%. Those
   are not two opinions about the same moment, they are a seven-percent band of viewport in which
   catchUp always wins — and catchUp runs on a 120ms scroll throttle, so whether it won depended on
   where the throttle happened to land. A heading crossing that band during a slow scroll got
   revealed early, at 95%; the same heading during a faster scroll slipped through between throttled
   passes and waited for the trigger at 88%.

   The reveal point therefore moved by up to seven percent of the screen and up to 120ms from one
   heading to the next, which is what stopped them arriving evenly one after another. One number,
   read by both, makes the trigger the only thing that ever decides — and returns catchUp to what it
   was written for: catching what ScrollTrigger declined to announce, never pre-empting it. */
var ENTER = 0.88;

// Nothing to animate: no GSAP, or the reader asked for less motion. Leave the document exactly as
// the CSS renders it — fully drawn rules, plain visible text, nothing to recover from.
function inertController() {
  return { play: function () { }, destroy: function () { } };
}

export function initLegalReveal(root, options) {
  var g = window.gsap;
  // The app's own reveal tokens, so these pages cannot drift from the landing and the dropzone.
  var MOTION = (options && options.motion) || FALLBACK;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  if (!g || reduce || !root) return inertController();

  var article = root.querySelector('[data-toc-content]');
  var hero = root.querySelector('.legal-hero');
  if (!article) return inertController();

  var pending = [];        // everything not yet visually resolved, for the failsafe to sweep
  var started = new Set();      // text reveals already handed to GSAP — guards against a second one
  var startedRules = new Set(); // rule draws, kept apart so the two never lock each other out
  var triggers = [];       // every ScrollTrigger this route owns, so unmounting can kill them
  var timers = [];         // every per-element deadline, ditto
  var played = false;

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
  /* `kind` separates the two animations a heading can own, and it is load-bearing.

     An h2 below the first carries BOTH a rule that draws and text that rises out of its mask. Those
     are two independent tweens on one element, and with a single claim register the first one to ask
     locked the other out: drawRule claimed the heading, revealMasked then filtered the same element
     through claim(), got an empty list, and returned without animating anything. The heading stayed
     at the opacity arm() left it on until its own 1500ms deadline expired and rescue() cleared the
     property — which is why every h2 except the first appeared in one frame instead of masking in.

     The first h2 was the exception that hid it: its rule is display:none, so nothing claimed the
     element before revealMasked did, and it alone animated correctly. */
  function claim(el, kind) {
    var set = kind === 'rule' ? startedRules : started;
    if (set.has(el)) return false;
    set.add(el);
    timers.push(setTimeout(function () { if (stillWithheld(el)) rescue(el); }, 1500));
    return true;
  }

  /* ---------------------------------------------------------------- line splitting

     One mask per VISUAL line, which is the whole difference between this reading as the same gesture
     as the headings and reading as something else.

     Every masked element used to get exactly one mask wrapped around all of its contents. On a
     single-line heading that is a true mask reveal. On the hero's three-line summary it was a slab:
     three lines travelling together inside one three-line window, arriving as a block rather than as
     lines. And body copy got no mask at all — it faded. So the page had three different vocabularies
     for what should have been one.

     THE BROWSER DECIDES WHERE THE LINES ARE. Every word becomes an inline span, the layout engine
     breaks them exactly where it would have broken the original text, and the spans are then grouped
     by the offsetTop they actually landed on. Counting characters or guessing at a measure would be
     wrong at the first different viewport, font size or webfont swap.

     INLINE MARKUP SURVIVES because the regrouping is done with a Range: extractContents() splits any
     partially covered <strong>, <code> or <a> and reproduces it on both sides of the break, which is
     precisely what a line break running through a bold phrase needs. The ranges are applied last to
     first so that the surgery never invalidates a range that has not been used yet.

     AND IT IS TEMPORARY. restore() puts the original markup back verbatim the moment the reveal
     finishes, so a paragraph spends all but ~0.9s of its life as ordinary reflowing text: nothing to
     re-measure when the window is resized, no split spans in the accessibility tree, and selection
     and copy behave exactly as they did before anything was animated. It is also why splitting is
     done at reveal time rather than at arm time — 28 paragraphs' worth of word spans should not sit
     in the document waiting to be scrolled to. */

  function wrapWords(node) {
    [].slice.call(node.childNodes).forEach(function (n) {
      if (n.nodeType === 3) {
        if (!n.textContent.trim()) return;
        var frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(function (part) {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
          var s = document.createElement('span');
          s.setAttribute('data-w', '');
          s.textContent = part;
          frag.appendChild(s);
        });
        n.parentNode.replaceChild(frag, n);
      } else if (n.nodeType === 1 && n.tagName !== 'BR') {
        wrapWords(n);
      }
    });
  }

  /* → { lines: [.reveal-line…], restore } or null when there is nothing to split.

     THE BOX MUST NOT MOVE. Turning a paragraph's inline content into a stack of block-level line
     masks is a layout change, and three separate things made the rebuilt block taller than the text
     it replaced — visibly so, with copy pushed out of its container:

       · <br> survives BETWEEN the masks. Inline content sitting between two block boxes generates
         its own anonymous line box, so the six-line address grew by five whole lines (+126px).
       · An inline element with its own box metrics — <code> here — reports a different offsetTop
         from the words either side of it, so a 1px grouping tolerance read one visual line as two.
         A two-line paragraph became four masks (+99px).
       · The mask's padding-bottom/negative-margin pair, which exists to stop descenders being
         clipped, does not cancel on the LAST mask: its negative bottom margin collapses out through
         the parent instead of pulling the parent's floor up (+2-3px on every block).

     Each is fixed at its cause below, and then the element's measured height is pinned for the life
     of the split as a backstop — so any future inline construction that shifts the internal layout
     still cannot resize the box the reader sees. */
  function splitLines(el) {
    if (!el || !el.isConnected) return null;
    var original = el.innerHTML;
    var prevHeight = el.style.height;
    try {
      var box = el.getBoundingClientRect().height;
      // Half a line: comfortably more than any inline element's vertical jitter, comfortably less
      // than the gap to the next line.
      var tol = Math.max(4, (parseFloat(getComputedStyle(el).lineHeight) || 16) * 0.5);

      wrapWords(el);
      var words = [].slice.call(el.querySelectorAll('[data-w]'));
      if (!words.length) { el.innerHTML = original; return null; }

      // Group by line box. Read every offsetTop before touching the DOM, so this costs one layout.
      var groups = [], cur = null, top = null;
      words.forEach(function (w) {
        var t = w.offsetTop;
        if (top === null || Math.abs(t - top) > tol) { cur = []; groups.push(cur); top = t; }
        cur.push(w);
      });

      var lines = [];
      for (var i = groups.length - 1; i >= 0; i--) {
        var grp = groups[i];
        var range = document.createRange();
        range.setStartBefore(grp[0]);
        range.setEndAfter(grp[grp.length - 1]);
        var contents = range.extractContents();
        var maskEl = document.createElement('span');
        maskEl.className = 'reveal-mask';
        var lineEl = document.createElement('span');
        lineEl.className = 'reveal-line';
        lineEl.appendChild(contents);
        maskEl.appendChild(lineEl);
        range.insertNode(maskEl);
        lines.unshift(lineEl);
      }
      if (!lines.length) { el.innerHTML = original; return null; }

      // The line breaks are now the masks themselves; every <br> left over is a blank line. They
      // live on in `original`, so restore() puts the address back exactly as authored.
      [].slice.call(el.querySelectorAll('br')).forEach(function (br) { br.parentNode.removeChild(br); });

      el.style.height = box + 'px';
      return {
        lines: lines,
        restore: function () {
          if (!el.isConnected) return;
          el.innerHTML = original;
          el.style.height = prevHeight;
        },
      };
    } catch (e) {
      // Legal copy must never be left half-rebuilt by a failed effect.
      try { el.innerHTML = original; el.style.height = prevHeight; } catch (e2) { }
      return null;
    }
  }

  // Elements currently split, so rescue() and destroy() can put their markup back.
  var splits = new Map();

  function restoreAll() {
    splits.forEach(function (s) { try { s.restore(); } catch (e) { } });
    splits.clear();
  }

  /* Reveal a set of elements as ONE staggered run of lines.

     The stagger is across every line of every element handed in, not per element — so the hero's
     title, its three-line summary and its meta line arrive as one cascade of five lines rather than
     as three separate animations that happen to overlap. Same for a section: heading line, then each
     line of its body copy, on one beat. */
  /* Reveal, in exactly the shape orbit.js's _maskReveal gives the landing and the dropzone: ONE run
     of lines, one stagger, the app's own duration and ease, and no per-element offsets layered on
     top. Everything handed in animates as a single cascade.

     The delay parameter is gone. It existed to hold a section behind the hero and to hold body copy
     behind its heading, and stacking those two offsets is what made a legal page feel slack next to
     the front page: a section's last line could sit for 0.37 + 0.14 + five stagger steps before it
     even started, against roughly a quarter-second for the whole landing. The lines are one run now,
     and the sequence between sections comes from the scroll position that triggered each one — which
     is where it comes from on every other surface of the site. */
  function revealMasked(els) {
    var fresh = els.filter(function (el) { return el && claim(el); });
    if (!fresh.length) return;

    // Split here, not at arm — see arm() for why the font makes that the only safe moment.
    var lines = [], plain = [];
    fresh.forEach(function (el) {
      var s = splits.get(el) || splitLines(el);
      if (s) { splits.set(el, s); lines = lines.concat(s.lines); }
      else plain.push(el);   // never split — reveal it plainly rather than not at all
    });
    // The block is shown now; its lines are parked inside their masks, so there is nothing to see
    // until the tween runs. Both happen before the next paint, so there is no flash.
    g.set(fresh, { opacity: 1 });

    var settle = function () {
      fresh.forEach(function (el) {
        var s = splits.get(el);
        if (s) { s.restore(); splits.delete(el); }
        drop(el);
      });
    };

    if (lines.length) {
      g.killTweensOf(lines);
      var tw = g.fromTo(lines, { yPercent: 110 }, {
        yPercent: 0,
        duration: MOTION.duration,
        stagger: MOTION.stagger,
        ease: MOTION.ease,
        onComplete: settle,
      });
      /* The same rAF-stall failsafe _maskReveal carries, and for the same reason: these lines are
         PARKED below their masks before anything can be seen, so a ticker that never wakes leaves
         them there permanently — the reveal is the only thing that brings them back. Static, visible
         text is the floor on a legal document above all else, so force it. */
      timers.push(setTimeout(function () {
        if (tw.progress() >= 1) return;
        try { tw.kill(); } catch (e) { }
        try { g.set(lines, { clearProps: 'transform' }); } catch (e) { }
        settle();
      }, 2500));
    }
    if (plain.length) {
      g.fromTo(plain, { opacity: 0 }, {
        opacity: 1, duration: MOTION.duration, ease: MOTION.ease,
        clearProps: 'opacity', onComplete: function () { plain.forEach(drop); }
      });
    }
  }

  function drop(el) {
    var i = pending.indexOf(el);
    if (i >= 0) pending.splice(i, 1);
  }

  /* Arm: withhold the block, and DO NOT split yet.

     The landing can park its lines at arm time because its masks are authored in the JSX — the line
     breaks are decisions a designer made, not measurements. Prose has no such luxury: its lines only
     exist once the text has been laid out, and laying it out at mount means laying it out in the
     FALLBACK FACE, because Neue Montreal is a local .otf that has not arrived yet. Every number the
     split depends on is wrong at that moment — how many lines there are, where they break, and the
     height the box should be pinned to. When the real font lands the paragraph reflows underneath a
     stale split, and copy ends up outside the box it was measured into.

     So the split happens at reveal time, when the font is long since resolved. It costs 0.8-4ms per
     section, measured — far inside a frame — and the reader cannot tell the difference between a
     block held by opacity and one held by its masks, because both are invisible until the same tween
     moves the same lines. What they can tell is when a paragraph is the wrong size. */
  function arm(el) {
    if (!el) return null;
    g.set(el, { opacity: 0 });
    pending.push(el);
    return el;
  }

  // ---------------------------------------------------------------- hero (above the fold)

  var heroEls = [];
  if (hero) {
    heroEls = ['.legal-hero__label', 'h1', '.legal-hero__sub', '.legal-hero__meta']
      .map(function (s) { return arm(hero.querySelector(s)); })
      .filter(Boolean);

    g.set(hero, { '--rule': 0 });
    pending.push(hero);
  }

  // ------------------------------------------------------- article (scroll-triggered)

  var ST = window.ScrollTrigger;

  // Factored out so a ScrollTrigger callback and the catch-up pass below can both invoke it. Without
  // that split, anything ScrollTrigger declines to announce would only ever be recoverable by the
  // snap-to-visible failsafe — correct, but not animated.
  function drawRule(h) {
    if (!claim(h, 'rule')) return;
    g.to(h, {
      '--rule': 1,
      duration: 0.8,
      ease: MOTION.ease,
      onComplete: function () { h.style.removeProperty('--rule'); drop(h); }
    });
  }

  /* Reveal by SECTION, not by element.

     Every heading and every paragraph used to carry a ScrollTrigger of its own, firing at its own
     threshold. Each animation was correct and the sequence was not: a paragraph two lines below its
     heading crossed the line a moment later and arrived as a separate event, so a section read as
     four or five unrelated things appearing near each other rather than as one thing arriving. Worse,
     the order was really the order the thresholds were crossed — scroll quickly and body copy could
     announce itself alongside the heading it belongs to.

     So a section is now one trigger and one cascade: the rule draws, then the heading and every line
     of its body copy rise out of their masks on one continuous stagger. The delay is the composition,
     not the scroll position, which is what makes it read as deliberate at any scroll speed.

     Grouping is by document order: a heading opens a group and everything up to the next heading
     belongs to it. h3s open their own, so a subsection cascades on its own beat rather than being
     swept along by the h2 above it. */
  var groups = [];
  var cur = null;
  [].slice.call(article.children).forEach(function (el) {
    var tag = el.tagName;
    if (tag === 'H2' || tag === 'H3') { cur = { heading: el, blocks: [] }; groups.push(cur); return; }
    if (tag !== 'P' && tag !== 'UL' && tag !== 'BLOCKQUOTE') return;
    if (!cur) { cur = { heading: null, blocks: [] }; groups.push(cur); }
    cur.blocks.push(el);
  });

  groups.forEach(function (grp) {
    var h = grp.heading;
    if (h) arm(h);
    // The first h2's rule is display:none, so there is nothing to draw there.
    var hasRule = h && h.tagName === 'H2' && h !== article.querySelector('h2');
    if (hasRule) { g.set(h, { '--rule': 0 }); pending.push(h); }
    grp.blocks.forEach(arm);
    grp.hasRule = hasRule;
  });

  /* One section, one cascade. The heading and every line of its body copy go into a SINGLE
     revealMasked call, so the stagger runs across the whole section as one continuous beat — the
     heading's line, then the first paragraph's four, then the next paragraph's two. Revealing them
     in separate calls would restart the stagger at each element and the section would arrive in
     clumps.

     No offsets. The heading leads because it is first in the array, which is the only ordering the
     landing uses either. */
  function runGroup(grp) {
    if (grp.hasRule) drawRule(grp.heading);
    revealMasked((grp.heading ? [grp.heading] : []).concat(grp.blocks));
  }

  function playHero() {
    // One call, so the stagger runs across the title's line, the summary's three and the meta's one
    // as a single cascade of five rather than as three animations starting together.
    revealMasked(heroEls);
    if (hero) {
      g.to(hero, {
        '--rule': 1,
        duration: 0.9,
        ease: MOTION.ease,
        onComplete: function () { hero.style.removeProperty('--rule'); drop(hero); }
      });
    }
  }

  // No ScrollTrigger: reveal everything at once rather than leaving it parked forever.
  if (!ST) {
    return {
      play: function () {
        if (played) return; played = true;
        playHero();
        groups.forEach(runGroup);
      },
      destroy: destroy,
    };
  }

  /* Groups whose trigger fired before the cover lifted. `once: true` means a trigger announces itself
     exactly once and then kills itself, so an onEnter that arrived early and was simply dropped would
     take that group's animated reveal with it — leaving it to be snapped into place by the failsafe
     later, un-animated. Holding the group here instead means nothing is lost: play() drains this and
     the section cascades properly, just when it can actually be seen. */
  var heldBack = [];

  groups.forEach(function (grp) {
    /* One trigger for the whole group, on whatever opens it. ENTER rather than the old 92/95: the
       cascade now has a tail, so it has to start earlier for its last block to still land before
       the reader's eye reaches it. */
    triggers.push(ST.create({
      trigger: grp.heading || grp.blocks[0],
      start: 'top ' + (ENTER * 100) + '%',
      once: true,
      onEnter: function () {
        // Nothing may arrive before the cover has lifted. A group low enough to have its own onEnter
        // during the transition would otherwise animate against a black panel and be finished by the
        // time anyone could see it — the exact fault this file's arm/play split exists to remove.
        if (!played) { heldBack.push(grp); return; }
        runGroup(grp);
      }
    }));
  });

  // ---------------------------------------------------------------- catch-up

  // The reason this exists, because it is not obvious and cost a long time to find:
  //
  // These triggers are created on mount, which on this site is BEFORE the local Neue Montreal .otf
  // files have loaded. At that moment the document is measurably shorter, so headings well below
  // the fold compute a start position that has *already been passed*. ScrollTrigger deliberately
  // does not fire enter callbacks for a trigger that begins life inside its own range — that
  // suppression is what stops animations replaying on every resize. A later refresh() corrects the
  // numbers but cannot undo the suppression: the trigger sits at isActive:true having never
  // announced itself, and scrolling can never make it enter again. Those sections would stay parked
  // until the failsafe snapped them into view, un-animated.
  //
  // So rather than trusting onEnter to be the only way in, sweep for anything whose start has
  // passed and reveal it properly. Runs after play() and after every event that can change layout
  // underneath us.
  // By GROUP, not by element. It used to walk `pending` and reveal each stranded item on its own at
  // delay 0, which quietly discarded the very composition runGroup exists to impose: a section caught
  // up on this way had its rule, its heading and all its paragraphs start in the same frame, so it
  // read as a block of text switching on rather than as a section arriving. Going through runGroup
  // means a caught-up section cascades exactly like a scrolled-to one. claim() still guards against
  // anything being animated twice, so a group that is only partly stranded resolves just its
  // remainder.
  function catchUp() {
    if (!played) return;
    var limit = window.innerHeight * ENTER;
    groups.forEach(function (grp) {
      var host = grp.heading || grp.blocks[0];
      if (!host || !host.isConnected) return;
      if (host.getBoundingClientRect().top >= limit) return;   // genuinely still below — leave it
      runGroup(grp);
    });
  }

  // Wrapping changed the DOM; let the TOC's own triggers re-measure against it.
  ST.refresh();
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { if (article.isConnected) { ST.refresh(); catchUp(); } });
  }
  var onLoad = function () { if (article.isConnected) { ST.refresh(); catchUp(); } };
  window.addEventListener('load', onLoad);

  // ---------------------------------------------------------------- failsafe

  // A single timer would be wrong here. The app's _maskReveal can use one because its reveal
  // fires on arrival; these fire on scroll, so a flat "reveal everything after 3s" would wipe the
  // effect off the rest of the page for anyone who pauses to actually read.
  //
  // So the sweep is viewport-aware: it rescues only elements whose trigger point has already
  // passed and which are not currently animating. Anything still below the fold is legitimately
  // hidden and is left alone.
  function rescue(el) {
    var s = splits.get(el);
    if (s) {
      // Kill the line tweens BEFORE restoring, or GSAP goes on ticking transforms against nodes that
      // no longer exist — and put the original markup back, since a rescued element must end up as
      // plain readable copy rather than as a paragraph frozen in pieces.
      try { g.killTweensOf(s.lines); } catch (e) { }
      try { s.restore(); } catch (e) { }
      splits.delete(el);
    }
    try { g.killTweensOf(el); } catch (e) { }
    try { g.set(el, { clearProps: 'opacity,transform' }); } catch (e) { }
    el.style.removeProperty('--rule');
    drop(el);
  }

  // Is this element still visually withheld, as the browser currently computes it? Asked of
  // computed style rather than of GSAP, because the failure mode being guarded is "a tween exists
  // and is going nowhere" — and tween bookkeeping cannot see that.
  //
  // A split element needs both halves of the question asked. Its own opacity is back to 1 the moment
  // the reveal starts — the withholding has moved into the masks — so checking opacity alone would
  // report a paragraph whose lines are all still parked below their masks as perfectly visible, and
  // the deadline that exists to rescue exactly that case would never fire.
  function stillWithheld(el) {
    if (!el.isConnected) return false;
    // A rule that never drew is withheld too, and nothing else here would notice: --rule defaults to
    // 1 in legal.css, so the only way the hairline is missing is an inline 0 this file wrote and no
    // tween came to clear. Checked first because a heading can be settled as text and still be
    // waiting on its rule.
    var rule = el.style.getPropertyValue('--rule');
    if (rule !== '' && +rule < 1) return true;
    var s = splits.get(el);
    if (s) {
      return s.lines.some(function (line) {
        if (!line.isConnected) return false;
        var t = getComputedStyle(line).transform;
        return t !== 'none' && t !== 'matrix(1, 0, 0, 1, 0, 0)';
      });
    }
    var cs = getComputedStyle(el);
    if (+cs.opacity < 0.99) return true;
    var m = cs.transform;
    return m !== 'none' && m !== 'matrix(1, 0, 0, 1, 0, 0)';
  }

  var queued = null;
  function sweep() {
    queued = null;
    if (!played) return;
    pending.slice().forEach(function (el) {
      var host = el;
      if (!host || !host.isConnected) return;
      // Deliberately strict: only rescue what the reader has already scrolled PAST and which is
      // still withheld. An earlier version used `top < innerHeight`, which is wider than the 92%
      // trigger point — so it snapped elements into view a fraction of a second before their
      // reveal was due to start, and quietly replaced the animation with a jump on every scroll.
      // The failsafe must be the last resort, never the first responder.
      if (host.getBoundingClientRect().bottom < -40 && stillWithheld(el)) rescue(el);
    });
    if (!pending.length) detach();
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
  function detach() {
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onScroll);
    window.removeEventListener('load', onLoad);
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

  function destroy() {
    detach();
    timers.forEach(clearTimeout); timers = [];
    triggers.forEach(function (t) { try { t.kill(); } catch (e) { } }); triggers = [];
    // Anything still parked is about to leave the document with the route, so there is nothing to
    // rescue — but kill its tweens so GSAP is not ticking transforms on detached nodes.
    splits.forEach(function (s) { try { g.killTweensOf(s.lines); } catch (e) { } });
    pending.slice().forEach(function (el) { try { g.killTweensOf(el); } catch (e) { } });
    // Put the markup back on anything caught mid-split. The route is usually being replaced wholesale
    // by React, in which case this is a no-op on detached nodes — but a reveal interrupted on a route
    // that STAYS (a resize, a reduced-motion switch) must not leave a legal paragraph in fragments.
    restoreAll();
    pending = [];
  }

  return {
    /* The arrival, in the order a reader's eye takes it: the page's own title first, then whatever
       section the first screen happens to include, one hero-span behind it.

       That offset is the whole point. Both used to start together — the hero at 0.1 and the first
       section at 0, so the section heading below actually led the title above it — and a first screen
       whose every element begins in the same frame does not read as a cascade at all. It reads as the
       text switching on, which is exactly the "it fades in rather than masking in" impression: the
       masks were working the whole time, there was simply nothing sequential left to see. */
    play: function () {
      if (played) return; played = true;
      playHero();
      // Groups whose trigger fired while the cover was still up, replayed now that they can be seen.
      heldBack.forEach(runGroup);
      heldBack = [];
      catchUp();
      timers.push(setTimeout(sweep, 1500));   // covers what was already on screen at load
    },
    destroy: destroy,
  };
}
