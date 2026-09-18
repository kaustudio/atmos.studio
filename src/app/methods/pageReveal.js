import { splitLines } from './maskLines.js';

/* Atmos Gallery — scroll reveals for the document routes (about, privacy, terms).
   Kept out of legalToc.js on purpose: that file is a third-party resource and stays as delivered.

   IT TAKES ITS STRUCTURE FROM THE CALLER, which is the one thing that changed when About arrived.
   This file used to resolve `.legal-hero` and `[data-toc-content]` itself and derive its groups by
   walking that container's flat children for h2/h3 — correct for a legal statement, which really is
   one column of headings and paragraphs, and useless for a page built out of sections with images and
   grids in them. So the two questions it cannot answer for every document — where the hero is, and
   what counts as a section — are now inputs, and everything below them is unchanged: the line
   splitting, the claim register, the per-element deadlines, the catch-up sweep and the failsafes are
   the same code serving both pages. articleGroups() at the bottom is the legal walk, exported so
   LegalPage still expresses its structure in one line.

   The alternative was a second reveal engine for About, and the ~350 lines below are exactly the part
   that took a long time to get right. Two copies of them is how the second page ends up subtly
   different from the first for reasons nobody can find.

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
// `rule` (17.09.26, audit F3): how long a rule takes to draw. The two draws below wrote 0.8 and 0.9;
// the app hands in DUR.overlay for both, the hero's included.
// `ease` is entrance's nearest GSAP name (17.09.26, audit F4): GSAP does not read a cubic-bezier()
// string, so the one written here fell through to GSAP's own default.
var FALLBACK = { duration: 0.62, stagger: 0.09, ease: 'expo.out', rule: 0.8 };

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

/* root      — the mounted route's element. Only used for isConnected checks; nothing is queried off
                it, because the caller has already done the querying.
   options.motion    — the app's own { duration, stagger, ease }. See the note above.
   options.hero      — the block above the fold, or null. Its own hairline is drawn with it.
   options.heroParts — the elements inside it that arrive, in the order they should arrive.
   options.groups    — [{ heading, blocks, rule }]. One entry per section: `heading` leads the
                       cascade and may be null, `blocks` follow it on the same stagger, and `rule` is
                       whichever element carries the --rule hairline for that section (the heading
                       itself on a legal document, the section on About, null for no rule).
   options.settled   — the route was a prerendered document and its copy was ALREADY ON SCREEN
                       when this ran (a hard load; see main.tsx and DocFallback). Whatever the reader
                       can see is left exactly as it is: not armed, not triggered, not swept. Only
                       what is below the fold is withheld and scroll-revealed as usual. Without this
                       a cold /about showed its copy, blinked it to opacity 0 the moment the chunk
                       mounted, and rose it back out of its masks — the copy arriving twice. */
export function initPageReveal(root, options) {
  var g = window.gsap;
  var opts = options || {};
  // The app's own reveal tokens, so these pages cannot drift from the landing and the dropzone.
  var MOTION = opts.motion || FALLBACK;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  if (!g || reduce || !root) return inertController();

  // The element that scrolls, when it is not the window — the library drawer is its own
  // overflow-y:auto box (overlays.js _syncLibraryReveal). Triggers and the catch-up sweep measure
  // against that box's viewport; everything else is unchanged.
  var scroller = opts.scroller || null;
  function viewH() { return scroller ? scroller.clientHeight : window.innerHeight; }
  function viewTop() { return scroller ? scroller.getBoundingClientRect().top : 0; }

  var hero = opts.hero || null;
  /* Whether that hero carries a hairline at its foot. The legal documents do — theirs is the line
     under the title block — and /about did until its opening was left to close on the photograph
     alone. A hero without one is passed heroRule:false rather than left to tween a --rule nothing
     reads, which would also park it in `pending` and give the failsafe a rule to wait on. */
  var heroRule = opts.heroRule !== false;
  var groups = (opts.groups || []).filter(function (grp) {
    return grp && (grp.heading || (grp.blocks && grp.blocks.length));
  });
  // Settled: anything whose top is inside the first screen (with a little margin, so a section
  // straddling the fold is not half-withheld) is already read and stays put.
  var settled = !!opts.settled;
  // A group's first block may be a beat (an array, see revealMasked); the trigger wants an element.
  function firstBlock(grp) { var b = grp.blocks && grp.blocks[0]; return Array.isArray(b) ? b[0] : b; }
  var settleLimit = viewTop() + viewH() * 1.15;
  function onScreen(el) { if (!el || !el.isConnected) return false; return el.getBoundingClientRect().top < settleLimit; }
  if (settled) {
    if (hero && onScreen(hero)) hero = null;
    groups = groups.filter(function (grp) { return !onScreen(grp.heading || firstBlock(grp)); });
  }
  if (!hero && !groups.length) return inertController();

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

  /* LINE SPLITTING is in maskLines.js — it was lifted out of this file, unchanged, when the About
     page's feature pills needed the same masks for their disclosure. One copy, two callers; see the
     header there for how the lines are found and why the split is temporary. */

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
  /* BEATS. An item handed in is an element — every one of its lines takes its own step of the
     stagger, exactly as before — or an ARRAY of elements, which is one beat: every line of every
     element in it rises on the same step, and the run advances by one. The library drawer's facet
     rows are the reason (overlays.js _syncLibraryReveal): a row is a mark, a label and a count, and
     they are one thing arriving, not three lines of a sentence. Returns the beat each item started
     on, so a caller can draw a row's rule on the row's own step (see runGroup and grp.rules).
     Prose callers pass elements only and see no change: the stagger is a function of the line's
     beat, and for a run of plain elements the beat IS the line index. */
  function revealMasked(items, fromBeat) {
    var starts = [];
    var fresh = [];                 // every element that is really going to animate
    var beatOf = new Map();         // line or plain element → its beat
    var beat = fromBeat || 0;       // a caller sequencing several groups hands in where to start
    items.forEach(function (item) {
      var els = (Array.isArray(item) ? item : [item]).filter(function (el) { return el && claim(el); });
      starts.push(beat);
      if (!els.length) return;
      var group = Array.isArray(item);
      els.forEach(function (el) {
        fresh.push(el);
        // Split here, not at arm — see arm() for why the font makes that the only safe moment.
        var s = splits.get(el) || splitLines(el);
        if (s) { splits.set(el, s); s.lines.forEach(function (line) { beatOf.set(line, beat); if (!group) beat++; }); }
        else { beatOf.set(el, beat); if (!group) beat++; }   // never split — reveal it plainly rather than not at all
      });
      if (group) beat++;
    });
    starts.end = beat;              // the beat after the last one used, for the next group in a sequence
    if (!fresh.length) return starts;

    /* RISERS (17.09.26). A block marked data-reveal-rise has no words to split, so rather than fade
       it moves its first child up through its own box, which clips (overflow:hidden on the block), on
       the block's beat and the lines' own duration and ease. Manage Library's tick boxes use it, so a
       filter row's contents all arrive the same way inside a pill that is already there (by request:
       the rows must not fade in). The child is moved rather than the block, so no node is wrapped or
       replaced under React. */
    var lines = [], plain = [], risers = [];
    fresh.forEach(function (el) {
      var s = splits.get(el);
      if (s) lines = lines.concat(s.lines);
      else if (el.hasAttribute('data-reveal-rise') && el.firstElementChild) risers.push(el);
      else plain.push(el);
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
    var stepOf = function (i, target) { return (beatOf.get(target) || 0) * MOTION.stagger; };

    if (lines.length) {
      g.killTweensOf(lines);
      var tw = g.fromTo(lines, { yPercent: 110 }, {
        yPercent: 0,
        duration: MOTION.duration,
        stagger: stepOf,
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
        opacity: 1, duration: MOTION.duration, ease: MOTION.ease, stagger: stepOf,
        clearProps: 'opacity', onComplete: function () { plain.forEach(drop); }
      });
    }
    if (risers.length) {
      var kids = risers.map(function (el) { return el.firstElementChild; });
      g.killTweensOf(kids);
      var rt = g.fromTo(kids, { yPercent: 110 }, {
        yPercent: 0, duration: MOTION.duration, ease: MOTION.ease,
        stagger: function (i, target) { return (beatOf.get(target.parentNode) || 0) * MOTION.stagger; },
        clearProps: 'transform', onComplete: function () { risers.forEach(drop); }
      });
      // The lines' rAF-stall failsafe, for the same reason: a parked child is invisible until this runs.
      timers.push(setTimeout(function () {
        if (rt.progress() >= 1) return;
        try { rt.kill(); } catch (e) { }
        try { g.set(kids, { clearProps: 'transform' }); } catch (e) { }
        risers.forEach(drop);
      }, 2500));
    }
    return starts;
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
    heroEls = (opts.heroParts || []).filter(Boolean).map(arm).filter(Boolean);

    if (heroRule) {
      g.set(hero, { '--rule': 0 });
      pending.push(hero);
    }
  }

  // ------------------------------------------------------- sections (scroll-triggered)

  var ST = window.ScrollTrigger;

  // Factored out so a ScrollTrigger callback and the catch-up pass below can both invoke it. Without
  // that split, anything ScrollTrigger declines to announce would only ever be recoverable by the
  // snap-to-visible failsafe — correct, but not animated.
  function drawRule(el, delay) {
    if (!claim(el, 'rule')) return;
    g.to(el, {
      '--rule': 1,
      duration: MOTION.rule || FALLBACK.rule,
      delay: delay || 0,
      ease: MOTION.ease,
      onComplete: function () { el.style.removeProperty('--rule'); drop(el); }
    });
  }

  /* Reveal by SECTION, not by element.

     Every heading and every paragraph used to carry a ScrollTrigger of its own, firing at its own
     threshold. Each animation was correct and the sequence was not: a paragraph two lines below its
     heading crossed the line a moment later and arrived as a separate event, so a section read as
     four or five unrelated things appearing near each other rather than as one thing arriving. Worse,
     the order was really the order the thresholds were crossed — scroll quickly and body copy could
     announce itself alongside the heading it belongs to.

     So a section is one trigger and one cascade: the rule draws, then the heading and every line of
     its body copy rise out of their masks on one continuous stagger. The delay is the composition,
     not the scroll position, which is what makes it read as deliberate at any scroll speed.

     WHAT a section is comes from the caller — see articleGroups() for the legal documents' answer and
     AboutPage for the other one. */
  groups.forEach(function (grp) {
    if (grp.heading) arm(grp.heading);
    if (grp.rule) { g.set(grp.rule, { '--rule': 0 }); pending.push(grp.rule); }
    grp.blocks = (grp.blocks || []).filter(Boolean);
    // A block may be a beat — an array of elements arriving on one step (see revealMasked).
    grp.blocks.forEach(function (b) { (Array.isArray(b) ? b : [b]).forEach(arm); });
    // Per-block rules, aligned with blocks by index: rules[i] draws on the step blocks[i] starts on.
    grp.rules = (grp.rules || []).slice();
    grp.rules.forEach(function (r) { if (r) { g.set(r, { '--rule': 0 }); pending.push(r); } });
  });

  /* One section, one cascade. The heading and every line of its body copy go into a SINGLE
     revealMasked call, so the stagger runs across the whole section as one continuous beat — the
     heading's line, then the first paragraph's four, then the next paragraph's two. Revealing them
     in separate calls would restart the stagger at each element and the section would arrive in
     clumps.

     No offsets. The heading leads because it is first in the array, which is the only ordering the
     landing uses either. */
  /* `fromBeat` is the step this group starts on, and it is only ever non-zero under opts.sequence:
     groups revealed in ONE sweep (everything in view when the drawer opens) chain rather than start
     together, so the second group's eyebrow follows the first group's last row instead of landing
     beside its first. Three groups starting in the same frame read as three columns; chained, they
     read as one list arriving top to bottom. A group revealed by its own trigger on scroll starts
     at 0 as it always did. Returns the beat after the last one it used. */
  function runGroup(grp, fromBeat) {
    var base = fromBeat || 0;
    if (grp.rule) drawRule(grp.rule, base * MOTION.stagger);
    var starts = revealMasked((grp.heading ? [grp.heading] : []).concat(grp.blocks), base);
    // A block's own rule draws on the block's beat — the rule and the words it underlines arrive
    // together, exactly as a section's rule and heading do.
    var offset = grp.heading ? 1 : 0;
    grp.rules.forEach(function (r, i) { if (r) drawRule(r, (starts[offset + i] || base) * MOTION.stagger); });
    return starts.end != null ? starts.end : base;
  }
  var sequence = !!opts.sequence;

  function playHero() {
    // One call, so the stagger runs across the title's line, the summary's three and the meta's one
    // as a single cascade of five rather than as three animations starting together.
    revealMasked(heroEls);
    if (hero && heroRule) {
      g.to(hero, {
        '--rule': 1,
        duration: MOTION.rule || FALLBACK.rule,
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
    triggers.push(ST.create(Object.assign({
      trigger: grp.heading || firstBlock(grp),
      start: 'top ' + (ENTER * 100) + '%',
      once: true,
      onEnter: function () {
        // Nothing may arrive before the cover has lifted. A group low enough to have its own onEnter
        // during the transition would otherwise animate against a black panel and be finished by the
        // time anyone could see it — the exact fault this file's arm/play split exists to remove.
        if (!played) { heldBack.push(grp); return; }
        runGroup(grp);
      }
    }, scroller ? { scroller: scroller } : {})));
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
    var limit = viewTop() + viewH() * ENTER;
    var beat = 0;
    groups.forEach(function (grp) {
      var host = grp.heading || firstBlock(grp);
      if (!host || !host.isConnected) return;
      if (host.getBoundingClientRect().top >= limit) return;   // genuinely still below — leave it
      var next = runGroup(grp, sequence ? beat : 0);
      if (sequence) beat = next;
    });
  }

  // Wrapping changed the DOM; let the TOC's own triggers re-measure against it.
  ST.refresh();
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { if (root.isConnected) { ST.refresh(); catchUp(); } });
  }
  var onLoad = function () { if (root.isConnected) { ST.refresh(); catchUp(); } };
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
    riserChild(el, function (k) { g.killTweensOf(k); g.set(k, { clearProps: 'transform' }); });
    el.style.removeProperty('--rule');
    drop(el);
  }
  // A riser's moving part (see revealMasked), handed to fn when there is one.
  function riserChild(el, fn) {
    if (!el || !el.hasAttribute || !el.hasAttribute('data-reveal-rise') || !el.firstElementChild) return;
    try { fn(el.firstElementChild); } catch (e) { }
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
    var parked = false;
    riserChild(el, function (k) { var t = getComputedStyle(k).transform; parked = t !== 'none' && t !== 'matrix(1, 0, 0, 1, 0, 0)'; });
    return parked || (m !== 'none' && m !== 'matrix(1, 0, 0, 1, 0, 0)');
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
    (scroller || window).removeEventListener('scroll', onScroll);
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

  (scroller || window).addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  document.addEventListener('visibilitychange', onVisible);

  function destroy() {
    detach();
    timers.forEach(clearTimeout); timers = [];
    triggers.forEach(function (t) { try { t.kill(); } catch (e) { } }); triggers = [];
    // Anything still parked is about to leave the document with the route, so there is nothing to
    // rescue — but kill its tweens so GSAP is not ticking transforms on detached nodes.
    splits.forEach(function (s) { try { g.killTweensOf(s.lines); } catch (e) { } });
    pending.slice().forEach(function (el) { try { g.killTweensOf(el); } catch (e) { } riserChild(el, function (k) { g.killTweensOf(k); }); });
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
      var beat = 0;
      heldBack.forEach(function (grp) { var next = runGroup(grp, sequence ? beat : 0); if (sequence) beat = next; });
      heldBack = [];
      catchUp();
      timers.push(setTimeout(sweep, 1500));   // covers what was already on screen at load
    },
    destroy: destroy,
  };
}

/* THE LEGAL DOCUMENTS' OWN SECTIONS, by document order: a heading opens a group and everything up to
   the next heading belongs to it. h3s open their own, so a subsection cascades on its own beat rather
   than being swept along by the h2 above it.

   Lifted out of the engine when About arrived and left exactly as it was, including the one rule that
   is really a fact about legal.css: the FIRST h2's hairline is display:none there, so that group is
   the one with nothing to draw. */
export function articleGroups(contentEl) {
  if (!contentEl) return [];
  var first = contentEl.querySelector('h2');
  var groups = [];
  var cur = null;
  [].slice.call(contentEl.children).forEach(function (el) {
    var tag = el.tagName;
    if (tag === 'H2' || tag === 'H3') {
      cur = { heading: el, blocks: [], rule: (tag === 'H2' && el !== first) ? el : null };
      groups.push(cur);
      return;
    }
    if (tag !== 'P' && tag !== 'UL' && tag !== 'BLOCKQUOTE') return;
    if (!cur) { cur = { heading: null, blocks: [], rule: null }; groups.push(cur); }
    cur.blocks.push(el);
  });
  return groups;
}
