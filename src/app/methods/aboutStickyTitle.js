/* Osmo Supply — Sticky Title Scroll Effect.

   The mechanic is the resource's own and is kept whole: one master timeline on the wrap, scrubbed
   between "top 40%" and "bottom bottom", each heading's characters fading in on a 0.7 stagger from
   the start and — for every heading but the last — back out on a 0.7 stagger from the END, with the
   next heading's reveal overlapped 0.15 into the previous one's exit. The aria handling is the
   resource's too: the full sentence goes on the heading as an aria-label and every split word is
   hidden from the accessibility tree, so a screen reader gets one clean sentence rather than sixty
   loose letters.

   WHAT IT IS FOR, because using it wrongly is the easy mistake: this is a full-screen takeover. The
   whole viewport is given to one statement at a time, at display size, with nothing else on screen.
   It is not an emphasis you sprinkle on a paragraph. On /about it carries the three beats of the
   page's central argument, which is the one place the page stops explaining and simply states.

   [ATMOS 1] THE SPLIT IS HAND-ROLLED. The resource calls SplitText, which is a Club plugin and is
   not among the five vendored here — the same call aboutHighlight.js already declined, for the same
   reason, and the third hand-split in this codebase after splitLines() in maskLines.js and
   _maskLineReveal in motion.js. Words wrap the characters so line breaking is unchanged.

   [ATMOS 2] THE FLOOR IS THREE READABLE STATEMENTS. The resource hides its stacked headings in CSS
   with visibility:hidden and reveals them from JS, which means no JS is one statement and two
   missing ones. Here the stacking is applied only once this module has confirmed GSAP, ScrollTrigger
   and a willingness to animate, by setting data-sticky-live on the wrap. Without it the three are
   three ordinary paragraphs down the page.

   [ATMOS 3] Scoped to the mounted root, wrapped in init/destroy. A pin rewrites its target's
   position and inserts a spacer; leaving one alive after the route unmounts leaves every other
   trigger measuring against a detached element. */

function noop() { }

/* [ATMOS 5] THE GROUND AND THE INK BOTH TRAVEL, scrubbed rather than switched.

   Three full screens of the same near-black is three screens the reader cannot tell apart, and this
   page's whole argument is that a palette is an atmosphere. So the section runs a colour arc: the
   ground and the type move together through six palettes, and the page takes its own colours back
   when the last statement leaves.

   THE COLOURS ARE EXTRACTED, NOT CHOSEN. Every pair came out of the app's own pipeline run over a
   photograph this page already carries — a 72x72 canvas, every pixel to OKLab, kmeans(pts, 5),
   exactly as src/app/methods/pipeline.js does it. All five hexes of each palette were checked against
   all 113 in about.html: nothing here repeats a spectrum the reader has already been shown, which is
   the rule every other section on this page keeps.

   NO GREYSCALE, and that is measured rather than eyeballed. Chroma is sqrt(a² + b²) in OKLab, and an
   earlier pass here used a ground of C = 0.000 with an ink of C = 0.001 — arithmetically colourless.
   Two of the three inks were barely better, at 0.020 and 0.021, which is why the copy read as white
   on a tint rather than as part of a palette. Every value below carries C ≥ 0.033 on BOTH sides, so
   the type is as much a colour as the ground it sits on.

     pal          ground   hue  ink      hue  statement  masthead
     ember-disc   #750d04   30  #e4ba72   80    6.37       10.40
     ember-disc   #ae330c   36  #e4ba72   80    3.53        5.76
     driftwood    #5d3f2d   52  #c5ac96   63    4.39        8.53
     pines        #443826   77  #bc996c   73    4.30       10.26
     anthurium    #404122  110  #a48760   74    3.11        9.45
     anthurium    #272b14  117  #a48760   74    4.31       13.09

   The arc runs hue 30 to 117 — red, brick, brown, bark, moss, conifer. It stops there because it has
   to: these photographs are warm, and no unused palette on this site holds a cool colour with enough
   chroma to survive. A blue would have to be invented or borrowed from a spectrum already printed
   further down, and neither is allowed here.

   EVERY GROUND IS DARK, and that is the masthead's doing rather than a preference. The wordmark is
   fixed above this section and drawn in --on-surface; the light chromatic values in these same
   palettes — #e4ba72, #cf7c2b, #c5ac96 — would all have made better drama and erased it. The column
   above is the wordmark's own contrast against each ground, and 5.76 is the floor.

   Statements are 26px and up at weight 500, so WCAG's large-text threshold of 3 to 1 applies. A
   lilies pair at 2.95 was dropped for missing it; 3.11 is the lowest that survived. */
const PALETTES = [
  { ground: '#750d04', ink: '#e4ba72' },   // Ember Disc — deep red on amber
  { ground: '#ae330c', ink: '#e4ba72' },   // Ember Disc — brick on amber
  { ground: '#5d3f2d', ink: '#c5ac96' },   // Driftwood  — brown on sand
  { ground: '#443826', ink: '#bc996c' },   // Pines      — bark on tan
  { ground: '#404122', ink: '#a48760' },   // Anthurium  — moss on tan
  { ground: '#272b14', ink: '#a48760' },   // Anthurium  — conifer on tan
];

/* Where each palette sits on the run, as fractions of it, plus home. Six stops against three
   statements is deliberate: each statement is held in two related palettes rather than one, so the
   colour is still moving while the words are being read. The holds are what stop it reading as a
   wash — a colour permanently in transit never registers as a palette at all. */
const STOPS = [
  { at: 0.04, dur: 0.10 },
  { at: 0.20, dur: 0.08 },
  { at: 0.34, dur: 0.08 },
  { at: 0.48, dur: 0.08 },
  { at: 0.62, dur: 0.08 },
  { at: 0.76, dur: 0.08 },
  { at: 0.92, dur: 0.08 },   // and home again
];

// Read live rather than baked in, so the section returns to whichever mode is actually on. The theme
// is :root[data-theme] and the reader can change it while this section is on screen.
function token(name, fallback) {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  } catch (e) { return fallback; }
}

/* → { chars, restore } or null. Same shape as aboutHighlight's splitChars, and deliberately so:
   two effects that split a sentence into characters should split it the same way. */
function splitChars(el) {
  const original = el.innerHTML;
  const text = el.textContent;
  const prevLabel = el.getAttribute('aria-label');
  if (!text || !text.trim()) return null;
  try {
    const frag = document.createDocumentFragment();
    const chars = [];
    text.split(/(\s+)/).forEach((part) => {
      if (!part) return;
      if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
      const word = document.createElement('span');
      word.setAttribute('data-st-word', '');
      // The resource hides the split words from assistive tech and puts the sentence on the parent.
      word.setAttribute('aria-hidden', 'true');
      [].forEach.call(part, (ch) => {
        const c = document.createElement('span');
        c.setAttribute('data-st-char', '');
        c.textContent = ch;
        word.appendChild(c);
        chars.push(c);
      });
      frag.appendChild(word);
    });
    if (!chars.length) return null;
    el.setAttribute('aria-label', text.trim());
    el.innerHTML = '';
    el.appendChild(frag);
    return {
      chars: chars,
      restore: function () {
        if (!el.isConnected) return;
        el.innerHTML = original;
        if (prevLabel === null) el.removeAttribute('aria-label');
        else el.setAttribute('aria-label', prevLabel);
      },
    };
  } catch (e) {
    try { el.innerHTML = original; } catch (e2) { }
    return null;
  }
}

export function initStickyTitle(root) {
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  if (!gsap || !ScrollTrigger || !root) return noop;
  try { if (window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches) return noop; } catch (e) { }
  try { gsap.registerPlugin(ScrollTrigger); } catch (e) { return noop; }

  const wraps = [].slice.call(root.querySelectorAll('[data-sticky-title="wrap"]'));
  if (!wraps.length) return noop;

  const triggers = [];
  const splits = [];
  const live = [];
  const tinted = [];

  wraps.forEach((wrap) => {
    /* [ATMOS 8] IDEMPOTENT. A wrap that is already live is skipped rather than given a second
       timeline. The module used to assume one init per element, which held while /about was the only
       consumer and stopped holding the moment a React surface could re-enter its own build. Two
       scrubbed timelines over one set of characters is not twice the effect — the second's `from()`
       records the first's current values as its destination, so characters stop arriving at all. */
    /* [ATMOS 11] ...BUT "ALREADY LIVE" HAS TO BE CHECKED, NOT TRUSTED.

       The attribute above was set by a run that may since have been dismantled from outside. That is
       not hypothetical: the phone story's takeover heading briefly carried `data-sec-head` as well,
       so pageReveal claimed it as a section heading and ran splitLines() over it — rewriting the very
       innerHTML this module had just split into characters. The timeline was left animating nodes
       that were no longer in the document, the replacements kept the autoAlpha:0 floor set at split
       time, and this guard then refused every chance to repair it. A scrub sitting at progress 1 with
       an invisible statement and not one tween on a single character.

       The markup is fixed and one engine owns that heading now. This stays anyway, because a guard
       whose failure mode is a permanently blank headline is not worth the double-timeline it prevents.
       Liveness is a question about the DOM — is the anchor character still in this wrap, and does
       anything still animate it — so it is asked of the DOM rather than of an attribute that only
       records an intention. A wrap that fails is torn down and rebuilt from scratch. */
    if (wrap.hasAttribute('data-sticky-live')) {
      const anchor = wrap._stickyAnchor;
      if (anchor && wrap.contains(anchor) && gsap.getTweensOf(anchor).length) return;
      try { const t = wrap._stickyTl; if (t) { if (t.scrollTrigger) t.scrollTrigger.kill(); t.kill(); } } catch (e) { }
      wrap._stickyTl = null;
      wrap._stickyAnchor = null;
      wrap.removeAttribute('data-sticky-live');
    }

    const headings = [].slice.call(wrap.querySelectorAll('[data-sticky-title="heading"]'));
    /* [ATMOS 7] ONE HEADING IS A VALID TAKEOVER, and requiring two was this port's addition rather
       than the resource's. The source has no minimum: its loop fades out every heading EXCEPT the
       last, so a lone heading resolves on the scrub and then holds, which is exactly what a single
       closing statement wants. The guard was written when /about — which stacks three — was the only
       consumer, and it silently refused the phone story's close. `< 1` is the honest floor: nothing
       to reveal is nothing to do. */
    if (headings.length < 1) return;

    // [ATMOS 2] The stacking is CSS's, but only from here on.
    wrap.setAttribute('data-sticky-live', '1');
    live.push(wrap);

    const masterTl = gsap.timeline({
      scrollTrigger: {
        trigger: wrap,
        start: 'top 40%',
        end: 'bottom bottom',
        scrub: true,
        invalidateOnRefresh: true,
        /* THE CHARACTERS ARE PROMOTED ONLY WHILE THIS RANGE IS ACTIVE. The stylesheet hangs
           `will-change:opacity` off data-st-active rather than off the character itself, because the
           title splits into ~308 spans and an unconditional hint is 308 compositor layers held for
           the whole life of a 31,482px document — paid on every frame of every other section too.
           onToggle is the honest lifetime: it fires on the way in and on the way out, in both
           scroll directions, so the layers exist exactly across the scrub that needs them. */
        onToggle: (self) => {
          try {
            if (self.isActive) wrap.setAttribute('data-st-active', '1');
            else wrap.removeAttribute('data-st-active');
          } catch (e) { }
        },
      },
    });

    const revealDuration = 0.7;
    const fadeOutDuration = 0.7;
    const overlapOffset = 0.15;

    headings.forEach((heading, index) => {
      const split = splitChars(heading);
      if (!split) return;
      splits.push(split);

      /* [ATMOS 10] THE FLOOR IS SET ON THE ELEMENTS, NOT INSIDE THE TIMELINE.

         A `set` at master position 0 was not enough, and the reason is worth writing down. The reveal
         is one STAGGERED tween: at time zero only its first target has begun, and GSAP leaves the
         rest at whatever the DOM already holds rather than at the from-value. Measured across the
         master at progress 0 / 0.25 / 0.5: 23 of 24 visible, then 12, then 23 again — characters
         blinking out as their own stagger slot opened and fading back in, which is what "missing
         letters" looked like.

         Parking the characters directly, once, at split time gives the tween a floor that does not
         depend on when each target's slot opens. The masterTl.set below still stands: that one is
         what restores the floor when the reader scrubs back up. */
      gsap.set(split.chars, { autoAlpha: 0 });
      // See [ATMOS 11]: what a later init asks the DOM about.
      if (index === 0) { wrap._stickyAnchor = split.chars[0]; wrap._stickyTl = masterTl; }

      /* THE HEADING STAYS HIDDEN UNTIL ITS TURN, and visibility is what does it. The resource reveals
         every heading up front and lets the character tweens carry the sequence, which holds when the
         characters are reliably parked — and here they were not. At the frame the takeover arrived,
         all three statements were drawn over one another. Chasing that through the character tweens
         took three attempts and none of them survived a seek to progress zero, because a zero-length
         tween parked at time 0 does not re-render when the playhead lands exactly on it.
         The stylesheet already hides the stacked statements. The first is revealed here, and each of
         the others at the start of its own arc below. */
      if (index === 0) gsap.set(heading, { visibility: 'visible' });

      /* [ATMOS 4] EVERY STATEMENT BUT THE FIRST IS PARKED BEFORE ITS TURN, and this is a correction.
         The resource leans on .is--stacked being hidden in CSS until its own tween reaches it, which
         holds while visibility is the thing hiding it. Here the characters are what animate, and a
         character that has not been reached yet sits at its natural opacity — so the third statement
         was already fully drawn on top of the second one. Measured: five of sixteen positions through
         the takeover had two statements legible at once, and at the worst of them both were at full
         opacity, one printed over the other.
         The fix is below, on the tween itself. */
      /* fromTo rather than the resource's from, and BOTH ends stated. from() records whatever the
         target holds at construction as the value to arrive at — and these characters are inside
         headings the stylesheet has stacked with visibility:hidden, so autoAlpha reads 0 and the
         reveal was recorded as 0 to 0. Measured: the second and third statements never rose above
         0.01 through the whole takeover. The motion is unchanged; it simply no longer depends on
         what the DOM happened to be doing in the millisecond the timeline was built. */
      const headingTl = gsap.timeline();
      headingTl.fromTo(split.chars,
        { autoAlpha: 0 },
        {
          autoAlpha: 1,
          stagger: { amount: revealDuration, from: 'start' },
          duration: revealDuration,
          immediateRender: true,
        });

      if (index < headings.length - 1) {
        headingTl.to(split.chars, {
          autoAlpha: 0,
          stagger: { amount: fadeOutDuration, from: 'end' },
          duration: fadeOutDuration,
        });
      }

      /* [ATMOS 9] EVERY HEADING IS PARKED AT MASTER TIME ZERO, INCLUDING THE FIRST.

         Only headings after the first used to get this, and the omission is invisible on a page with
         three of them because statement one is the one you are looking at when the takeover starts.
         It is very visible with one.

         `fromTo(..., immediateRender: true)` applies its from-state at CONSTRUCTION, but a STAGGERED
         tween rendered at time zero has only started its first target — the rest have not begun, so
         they sit at their natural value. Measured on the story's close at progress 0: one character
         hidden and twenty-three visible. Scrubbing forward then snapped each one out as its own
         stagger slot opened and faded it back, so the statement appeared to lose letters as the
         reader arrived at it. That is the reported fault exactly.

         The set is the same one the other headings already carry, hoisted so it runs for all of
         them; against the resource's `from()` it would have recorded 0 as the destination, which is
         why the note below says it is only safe because the reveal is a fromTo with both ends
         named. */
      masterTl.set(split.chars, { autoAlpha: 0 }, 0);

      if (index === 0) {
        masterTl.add(headingTl);
      } else {
        /* Parked at master time zero. A timeline created with gsap.timeline() begins playing on the
           root immediately, so between construction and being re-parented here each of these ran to
           completion — leaving the second and third statements fully drawn on top of the first from
           the very start of the takeover. Measured across the timeline: both sat at 0.99 for the
           whole of statement one's turn.
           Safe to state now only because the reveal above is a fromTo with both ends named. Against
           the resource's from() this same line recorded 0 as the value to arrive at and blanked the
           whole section. */
        // Revealed as its own arc begins. Reversible, so scrolling back up plays the sequence
        // backwards rather than leaving a screen of stacked statements.
        // immediateRender:false, or the set fires at construction and reveals the statement before the
        // timeline has ever run — which on a deep link straight into this section is the first paint.
        headingTl.set(heading, { visibility: 'visible', immediateRender: false }, 0);
        masterTl.add(headingTl, '-=' + overlapOffset);
      }
    });

    if (masterTl.scrollTrigger) triggers.push(masterTl.scrollTrigger);
    triggers.push({ kill: () => { try { masterTl.kill(); } catch (e) { } } });

    /* [ATMOS 6] THE COLOUR ARC IS OPT-IN, AND THE GUARD BELONGS ABOVE THE TIMELINE.

       The arc is /about's own addition, not the resource's: six extracted palettes the ground and
       the ink travel through, because three full screens of the same near-black is three screens a
       reader cannot tell apart on a page whose whole argument is that a palette is an atmosphere.
       That reasoning is the takeover's, not the mechanic's — the phone story uses this module for a
       single closing statement on the surface colour, where six changes of ground behind one
       sentence would be noise. /about carries `data-sticky-arc` and is unchanged.

       IT RETURNS BEFORE colourTl IS BUILT, and the first version of this guard did not. Placed a few
       lines lower it still created the timeline and its ScrollTrigger, then returned before the
       `triggers.push` that would have registered them for teardown — so every wrap without the
       attribute got a second scrubbed trigger over the same range that did nothing, was never killed,
       and accumulated one more on every rebuild. Measured on the story's close: two triggers on one
       wrap, and characters that stopped arriving because a second timeline was recording the first's
       mid-flight values. A guard that runs after the thing it is guarding is not a guard. */
    if (!wrap.hasAttribute('data-sticky-arc')) return;

    /* [ATMOS 5] The colour runs on its OWN scrubbed timeline over the same range, deliberately beside
       the resource's timeline rather than inside it. The master's length is decided by the heading
       arcs and their overlap; hanging colour keyframes off that would tie the palette's proportions to
       a number that changes the moment a fourth statement is written. Two timelines, one scroll range,
       each mapping its own length onto it.

       ease:'none' and scrub, so the ground is genuinely interpolating the whole way — between stops
       the reader is looking at a colour that exists nowhere in the list, which is what makes it read
       as one continuous change rather than three swaps. */
    const homeBg = () => token('--surface', '#141413');
    const homeInk = () => token('--on-surface', '#f3f3ef');

    const colourTl = gsap.timeline({
      scrollTrigger: {
        trigger: wrap,
        start: 'top 40%',
        end: 'bottom bottom',
        scrub: true,
        invalidateOnRefresh: true,
      },
    });

    /* fromTo with both ends named, for the reason [ATMOS 4] records a few lines up: from() records
       whatever the element holds at construction as the value to ARRIVE at, and the wrap holds no
       background at all at that moment. The home colours are function values so invalidateOnRefresh
       re-reads them — that is what lets the theme toggle change what "back to normal" means. */
    colourTl.fromTo(wrap,
      { backgroundColor: homeBg, color: homeInk },
      {
        backgroundColor: PALETTES[0].ground, color: PALETTES[0].ink,
        ease: 'none', duration: STOPS[0].dur, immediateRender: true,
      }, STOPS[0].at);

    for (let i = 1; i < PALETTES.length; i++) {
      colourTl.to(wrap, {
        backgroundColor: PALETTES[i].ground, color: PALETTES[i].ink,
        ease: 'none', duration: STOPS[i].dur,
      }, STOPS[i].at);
    }

    // Home. The last statement has gone by here, and the page takes its own colours back.
    colourTl.to(wrap, {
      backgroundColor: homeBg, color: homeInk,
      ease: 'none', duration: STOPS[PALETTES.length].dur,
    }, STOPS[PALETTES.length].at);

    if (colourTl.scrollTrigger) triggers.push(colourTl.scrollTrigger);
    triggers.push({ kill: () => { try { colourTl.kill(); } catch (e) { } } });
    tinted.push(wrap);

    /* The theme can change while this section is on screen, and the two home stops are the only
       values in here that depend on it. invalidate() drops their recorded values so the function
       values above are asked again on the next render. */
    const onTheme = () => { try { colourTl.invalidate(); ScrollTrigger.refresh(); } catch (e) { } };
    const themeWatch = new MutationObserver(onTheme);
    try { themeWatch.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] }); } catch (e) { }
    triggers.push({ kill: () => { try { themeWatch.disconnect(); } catch (e) { } } });
  });

  return function destroy() {
    triggers.forEach((t) => { try { t.kill(true); } catch (e) { try { t.kill(); } catch (e2) { } } });
    triggers.length = 0;
    splits.forEach((s) => { try { gsap.killTweensOf(s.chars); } catch (e) { } try { s.restore(); } catch (e) { } });
    splits.length = 0;
    live.forEach((w) => { try { w.removeAttribute('data-sticky-live'); w.removeAttribute('data-st-active'); } catch (e) { } });
    live.length = 0;
    // The ground and the ink are written inline by the scrub, so an unmount that left them behind
    // would hand the next route a section painted whatever colour the last scroll position was.
    tinted.forEach((w) => { try { gsap.set(w, { clearProps: 'backgroundColor,color' }); } catch (e) { } });
    tinted.length = 0;
  };
}
