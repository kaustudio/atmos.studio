/* Osmo Supply — Expanding Feature Pills.
   The mechanic is the resource's own and is kept: one pill open at a time, the button fading out as
   its content fades in, the box changing width and height as one gesture, a synced visual matched
   BY INDEX, a cover shown when nothing is open, close on the X or on Escape. Every data-* attribute
   is the resource's and is load-bearing.

   On /about it carries the six semantic roles. The page states them as a grid of swatches, which
   says what they ARE; this says what each one is FOR, on demand, with a photograph beside it whose
   own character is the argument for that role. Six explanations printed at once would be a wall of
   text nobody reads; six pills is the same information offered one at a time.

   [ATMOS 1] Scoped to the mounted root and wrapped in init/destroy — the same accommodation every
   other resource here carries, for the same two reasons: this is a route rather than a document, and
   the resource's own querySelectorAll was over `document`.

   [ATMOS 2] Guarded on GSAP. The resource already honours prefers-reduced-motion internally (it
   swaps the tween for a direct style write), so that behaviour is the resource's and is left alone;
   what is added is the case where GSAP never loaded at all, where there is nothing to tween with.

   [ATMOS 3] The listeners are captured so destroy() can remove them. The resource adds click,
   keydown and resize handlers and never takes them off, which is correct for a page that is loaded
   once and wrong for a route that mounts and unmounts. */

import { splitLines } from './maskLines.js';

function noop() { }

/* Only reached if the app never handed its own tokens over — AboutPage passes vals.maskMotion, the
   same object the landing, the loader and the legal pages reveal on. */
const FALLBACK_MOTION = { duration: 0.62, stagger: 0.09, ease: 'cubic-bezier(0.16, 1, 0.3, 1)' };

export function initFeaturePills(root, motion) {
  const gsap = window.gsap;
  if (!gsap || !root) return noop;

  const wraps = root.querySelectorAll('[data-feature-pills-init]');
  if (!wraps.length) return noop;

  const MOTION = motion || FALLBACK_MOTION;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const teardown = [];

  wraps.forEach((wrap, wrapIdx) => {
    const items = Array.from(wrap.querySelectorAll('[data-feature-pills-item]'));
    const visuals = Array.from(wrap.querySelectorAll('[data-feature-pills-visual]'));
    const cover = wrap.querySelector('[data-feature-pills-cover]');
    const closeBtn = wrap.querySelector('[data-feature-pills-close]');
    if (!items.length) return;

    const uidBase = 'feature-pills-' + wrapIdx;

    const getExpandedWidth = () =>
      getComputedStyle(wrap).getPropertyValue('--content-item-expanded').trim() || '';

    const getActiveIndex = () => {
      const active = items.find((it) => it.getAttribute('data-active') === 'true');
      return active ? Number(active.getAttribute('data-feature-pills-index')) : null;
    };

    const setWrapActive = (isActive) => {
      wrap.setAttribute('data-feature-pills-active', isActive ? 'true' : 'false');
      if (closeBtn) {
        closeBtn.setAttribute('aria-hidden', isActive ? 'false' : 'true');
        /* [ATMOS 6] aria-hidden and focusable is the one combination that is always wrong. The
           resource hides the close button from the accessibility tree while nothing is open, and a
           <button> stays in the tab order regardless — so Tab landed on an invisible control that
           announces nothing. The attribute is the resource's and stays; the tab stop goes with it. */
        closeBtn.tabIndex = isActive ? 0 : -1;
      }
      if (cover) {
        cover.setAttribute('data-active', isActive ? 'false' : 'true');
        cover.setAttribute('aria-hidden', isActive ? 'true' : 'false');
      }
    };

    /* [ATMOS 12] THE VISUAL CHANGES BY CLIP, borrowed from Osmo Supply's Sticky Features.

       That resource is a scroll-driven pinned section and this is a click-driven disclosure, but the
       image transition is the part that was wanted and it transfers whole: a panel opens from a
       closed horizontal slit — inset(50%) → inset(0%) on power4.inOut — rather than dissolving. A
       crossfade tells you the picture changed; this tells you a new one ARRIVED, which is the same
       thing the pill beside it is doing with its own box.

       Kept from the resource: the two clip values, the ease, the 0.75 duration, the reduced-motion
       duration swap, and the direction rule — moving FORWARD reveals the incoming panel over the
       stack, moving BACK closes the outgoing one to uncover what is beneath.

       Dropped: `round 0.75em`. Every corner on this site is square, and a rounded clip on one
       photograph would be the only radius on the page.

       [ATMOS] The resource's steps are sequential, so everything below the current index has always
       been revealed already. A reader can click these in any order, so the invariant is restored by
       hand before each transition: everything below the target is opened instantly (it is covered, so
       nothing is seen), everything above is closed instantly. Without that, jumping 0 → 5 and back to
       3 would uncover 0. */
    const CLIP_OPEN = 'inset(0%)';
    const CLIP_SHUT = 'inset(50%)';
    const CLIP_DUR = prefersReducedMotion ? 0.01 : 0.75;
    const CLIP_EASE = 'power4.inOut';

    const setVisualActive = (indexOrNull) => {
      if (!visuals.length) return;
      const prev = visuals.findIndex((v) => v.getAttribute('data-active') === 'true');
      visuals.forEach((v) => {
        const idx = Number(v.getAttribute('data-feature-pills-index'));
        const isActive = indexOrNull !== null && idx === indexOrNull;
        v.setAttribute('data-active', isActive ? 'true' : 'false');
        v.setAttribute('aria-hidden', isActive ? 'false' : 'true');
      });

      const to = indexOrNull;
      if (to === null) {
        // Closing: everything under the top panel goes instantly, the top one plays out and the
        // cover appears through it.
        visuals.forEach((v, i) => { if (i !== prev) gsap.set(v, { clipPath: CLIP_SHUT }); });
        if (prev >= 0) gsap.to(visuals[prev], { clipPath: CLIP_SHUT, duration: CLIP_DUR, ease: CLIP_EASE, overwrite: 'auto' });
        return;
      }
      if (to === prev) return;

      if (prev < 0 || to > prev) {
        visuals.forEach((v, i) => { if (i < to) gsap.set(v, { clipPath: CLIP_OPEN }); else if (i > to) gsap.set(v, { clipPath: CLIP_SHUT }); });
        gsap.to(visuals[to], { clipPath: CLIP_OPEN, duration: CLIP_DUR, ease: CLIP_EASE, overwrite: 'auto' });
      } else {
        visuals.forEach((v, i) => { if (i < to) gsap.set(v, { clipPath: CLIP_OPEN }); else if (i > prev) gsap.set(v, { clipPath: CLIP_SHUT }); });
        gsap.set(visuals[to], { clipPath: CLIP_OPEN });
        for (let i = to + 1; i < prev; i++) gsap.set(visuals[i], { clipPath: CLIP_SHUT });
        gsap.to(visuals[prev], { clipPath: CLIP_SHUT, duration: CLIP_DUR, ease: CLIP_EASE, overwrite: 'auto' });
      }
    };

    const setItemA11y = (item, isOpen) => {
      const btn = item.querySelector('[data-feature-pills-button]');
      const content = item.querySelector('[data-feature-pills-content]');
      if (!btn || !content) return;
      btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      content.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
    };

    const measureButtonH = (item) => {
      const btn = item.querySelector('[data-feature-pills-button]');
      return btn ? Math.ceil(btn.getBoundingClientRect().height) : 0;
    };

    /* [ATMOS] MEASURED AT THE WIDTH IT IS ABOUT TO HAVE, not the one it has.
       The resource measures the inner element's natural height while the pill is still collapsed. That
       is right when the expanded width is an absolute value, and wrong here, where it is a percentage
       of the list — a percentage resolves against the CURRENT box, so a paragraph destined for 640px
       gets measured at 160px and the pill opens to roughly four times the height it needs. So the item
       is widened for the duration of the measurement, the mask is unclipped, the number is taken, and
       both are put back before anything is painted. */
    /* [ATMOS 11] THE TRANSITION HAS TO BE OFF WHILE WE MEASURE.
       Once the box became a CSS transition ([ATMOS 10]), writing a width no longer took effect on the
       next line — the property starts travelling instead of arriving, so getBoundingClientRect kept
       returning the width the pill still had. Everything measured at the expanded width was in fact
       measured at the collapsed one: a three-line paragraph came back as a nine-line column and the
       pill opened to 366px for 117px of text. Suppress, write, force layout, measure, restore. */
    const atWidth = (item, w, fn) => {
      if (!w) return fn();
      const prevT = item.style.transition, prevW = item.style.width, prevH = item.style.height;
      item.style.transition = 'none';
      item.style.width = w;
      item.style.height = 'auto';
      void item.offsetWidth;
      const out = fn();
      item.style.width = prevW || '';
      item.style.height = prevH || '';
      void item.offsetWidth;
      item.style.transition = prevT || '';
      return out;
    };

    const measureInnerH = (item, expandedW) => {
      const inner = item.querySelector('[data-feature-pills-inner]');
      if (!inner) return 0;
      const mask = item.querySelector('.pills__mask');
      const prevMaskOverflow = mask ? mask.style.overflow : null;
      if (mask) mask.style.overflow = 'visible';
      const h = atWidth(item, expandedW, () => Math.ceil(inner.getBoundingClientRect().height));
      if (mask) mask.style.overflow = prevMaskOverflow || '';
      return h;
    };

    const getHeights = (item, expandedW) => {
      const buttonH = measureButtonH(item);
      const innerH = measureInnerH(item, expandedW);
      return { buttonH, openH: Math.max(buttonH, innerH) };
    };

    const collapsedWidthPx = new Map();
    /* [ATMOS 7] ONE COLLAPSED WIDTH FOR ALL SIX, not one per label.
       The resource sizes every pill to its own text. With six words as different in length as
       "Background" and "Text" that produced a ragged right edge, and six controls of six widths read
       as six inconsistent things rather than one set of six.

       So each pill is measured at its natural width and they all take the WIDEST. The set is still
       sized by its own content — nothing here is a magic number, and it re-measures on resize and
       after the webfont lands — but the column now has an edge instead of a stagger. Opening still
       expands, because the open width is --content-item-expanded, several times the widest label.

       All six are cleared before any is measured: a pill measured while its neighbours still carry
       last pass's uniform width would be measuring the answer rather than the question. */
    const captureCollapsedWidths = () => {
      const prev = items.map((item) => item.style.width);
      items.forEach((item) => { item.style.width = ''; });
      const natural = items.map((item) => Math.ceil(item.getBoundingClientRect().width));
      const uniform = Math.max.apply(null, natural);
      items.forEach((item, i) => {
        collapsedWidthPx.set(item, uniform);
        // The open pill keeps the width it is holding; the rest take the shared one.
        item.style.width = item.getAttribute('data-active') === 'true' ? prev[i] : uniform + 'px';
      });
    };

    /* [ATMOS 10] THE BOX IS A CSS TRANSITION ON THE HOUSE TOKENS, not a GSAP tween.

       The resource tweens width and height with back.out(2) over half a second. Sampled, that ease
       overshoots to 1.125 at its midpoint — the pill grows 12.5% past its final width and springs
       back, which is a bounce this system does not have anywhere: --ease-fold, --ease-standard and
       --ease-entrance are all monotonic. It read as a different product's motion.

       The right curve was already named. --ease-fold at --dur-fold is THE disclosure motion here, and
       global.css says so in as many words: "a disclosure and a moving selection share one motion
       character". A pill is a disclosure.

       So the box is handed to CSS. Two reasons beyond the curve:
         · the token is then the single source — no JS mirror of four bezier numbers to drift from it
         · a CSS transition is interruptible mid-flight, which is what a control a reader can click
           six times in a row actually needs; a tween restarts from wherever it was killed

       GSAP still drives the line reveal, which is a staged sequence and belongs to it. */
    const animateBox = (el, vars) => {
      if (vars.height != null) el.style.height = vars.height + 'px';
      if (vars.width != null) el.style.width = typeof vars.width === 'number' ? vars.width + 'px' : vars.width;
    };

    /* A resize is a re-layout, not a gesture. Writing the new geometry with the transition live would
       have six pills easing to their new widths every time the window settles. */
    const setBoxInstantly = (el, vars) => {
      const prev = el.style.transition;
      el.style.transition = 'none';
      animateBox(el, vars);
      void el.offsetWidth;
      el.style.transition = prev || '';
    };

    /* [ATMOS 9] THE TEXT MASKS IN, the same way every other line on this site arrives.

       A pill was the one place on the page where copy simply appeared: the box grew and the words
       were already inside it. Everywhere else — the landing, the loader, each legal section, this
       page's own headings — a line is parked below an overflow-hidden mask and travels up into it.
       Reusing that gesture is what makes this read as this site opening something rather than as a
       generic accordion, and it costs almost nothing: maskLines.js already knows how to find a
       paragraph's visual lines, and the motion is the app's own token object, so a pill cannot drift
       from the page it sits on.

       SPLIT AT THE WIDTH IT IS ABOUT TO HAVE. The line breaks are the layout engine's decision, and
       at the moment a pill opens it is still collapsed — splitting then would find the breaks of a
       120px column and freeze them into a 480px one. Same trick measureInnerH uses: widen, split,
       put the width back. Every line is inside a mask and parked below it, so none of this is on
       screen while the box is still travelling.

       RESTORED ON CLOSE as well as on completion. A pill can be closed mid-reveal, and half-rebuilt
       markup left in the document is markup the next open would split again. */
    const revealed = new Map();

    const restoreLines = (item) => {
      const entries = revealed.get(item);
      if (!entries) return;
      revealed.delete(item);
      entries.forEach((entry) => {
        try { gsap.killTweensOf(entry.lines); } catch (e) { }
        try { entry.restore(); } catch (e) { }
      });
    };

    const revealLines = (item, expandedW) => {
      restoreLines(item);
      if (prefersReducedMotion) return;
      const targets = [
        item.querySelector('.pills__inner-label'),
        item.querySelector('.pills__body'),
      ].filter(Boolean);
      if (!targets.length) return;

      // Same trap as [ATMOS 11]: split at the width the pill is travelling to, with the transition
      // suppressed, or every line break is the collapsed pill's.
      const splits = atWidth(item, expandedW, () => targets.map((el) => splitLines(el)).filter(Boolean));
      if (!splits.length) return;
      revealed.set(item, splits);

      /* ONE run across both elements rather than one per element — the label's line, then the body's
         three, on a single continuous beat. Exactly the shape pageReveal gives a section. */
      const lines = splits.reduce((acc, s) => acc.concat(s.lines), []);
      gsap.fromTo(lines, { yPercent: 110 }, {
        yPercent: 0,
        duration: MOTION.duration,
        stagger: MOTION.stagger,
        ease: MOTION.ease,
        onComplete: () => restoreLines(item),
      });
    };

    /* [ATMOS 5] FOCUS FOLLOWS THE DISCLOSURE, because the trigger is what disappears.
       The resource fades the button out and the content in — which for a keyboard user means the
       element they are standing on becomes invisible while keeping focus, and Tab from there starts
       from a place they cannot see. So the button steps out of the tab order while it is hidden and
       focus moves into the panel; closing puts both back. Guarded on the focus already being inside
       this pill, so a click elsewhere on the page never has focus yanked out from under it. */
    const moveFocusInto = (item) => {
      const btn = item.querySelector('[data-feature-pills-button]');
      const content = item.querySelector('[data-feature-pills-content]');
      if (btn) btn.tabIndex = -1;
      if (content && btn && document.activeElement === btn) {
        try { content.focus({ preventScroll: true }); } catch (e) { }
      }
    };

    const restoreFocusFrom = (item) => {
      const btn = item.querySelector('[data-feature-pills-button]');
      const content = item.querySelector('[data-feature-pills-content]');
      if (!btn) return;
      btn.tabIndex = 0;
      if (content && content.contains(document.activeElement)) {
        try { btn.focus({ preventScroll: true }); } catch (e) { }
      }
    };

    const openItem = (item) => {
      const expandedW = getExpandedWidth();
      const { openH } = getHeights(item, expandedW);
      item.setAttribute('data-active', 'true');
      setItemA11y(item, true);
      setWrapActive(true);
      moveFocusInto(item);
      /* [ATMOS 13] SPLIT FIRST, THEN MOVE THE BOX — and the order is the whole of it.
         revealLines has to widen the item to find the right line breaks, and to do that it suppresses
         the item's transition ([ATMOS 11]). Run AFTER animateBox, that suppression lands on a
         transition already in flight and the restore writes the target geometry with easing switched
         off: the pill jumped to its open size in one frame and only the closing animated. Measured —
         fifteen identical 480px samples opening, fifteen stepped ones closing.
         Run BEFORE, it does its measuring while the box is still collapsed, puts the collapsed
         geometry back, and animateBox then has something to travel from. */
      revealLines(item, expandedW);
      const targetW = expandedW || (collapsedWidthPx.get(item) || Math.ceil(item.getBoundingClientRect().width)) + 'px';
      animateBox(item, { height: openH, width: targetW });
    };

    const closeItem = (item) => {
      const expandedW = getExpandedWidth();
      const { buttonH } = getHeights(item, expandedW);
      item.setAttribute('data-active', 'false');
      setItemA11y(item, false);
      restoreLines(item);
      restoreFocusFrom(item);
      const targetW = collapsedWidthPx.get(item) || Math.ceil(item.getBoundingClientRect().width);
      animateBox(item, { height: buttonH, width: targetW });
    };

    const switchTo = (nextIndex) => {
      const current = getActiveIndex();
      if (current === nextIndex) return;
      const nextItem = items[nextIndex];
      if (!nextItem) return;
      if (current !== null) closeItem(items[current]);
      openItem(nextItem);
      setVisualActive(nextIndex);
    };

    const closeAll = () => {
      const current = getActiveIndex();
      if (current === null) return;
      closeItem(items[current]);
      setVisualActive(null);
      setWrapActive(false);
    };

    items.forEach((item, i) => {
      item.setAttribute('data-feature-pills-index', String(i));
      if (!item.hasAttribute('data-active')) item.setAttribute('data-active', 'false');
      const btn = item.querySelector('[data-feature-pills-button]');
      const content = item.querySelector('[data-feature-pills-content]');
      if (btn) {
        btn.setAttribute('data-feature-pills-index', String(i));
        btn.type = 'button';
        if (!btn.id) btn.id = uidBase + '-trigger-' + i;
      }
      if (content && btn) {
        content.setAttribute('data-feature-pills-index', String(i));
        if (!content.id) content.id = uidBase + '-panel-' + i;
        btn.setAttribute('aria-controls', content.id);
        content.setAttribute('role', 'region');
        content.setAttribute('aria-labelledby', btn.id);
        if (!content.hasAttribute('aria-hidden')) content.setAttribute('aria-hidden', 'true');
        if (!btn.hasAttribute('aria-expanded')) btn.setAttribute('aria-expanded', 'false');
      }
    });

    visuals.forEach((v, i) => v.setAttribute('data-feature-pills-index', String(i)));

    if (closeBtn) {
      closeBtn.type = 'button';
      if (!closeBtn.hasAttribute('aria-hidden')) closeBtn.setAttribute('aria-hidden', 'true');
      closeBtn.addEventListener('click', closeAll);
      teardown.push(() => closeBtn.removeEventListener('click', closeAll));
    }

    /* [ATMOS 4] The disclosure is announced to CSS before any measuring, never assumed.
       Until this attribute lands the stylesheet renders all six roles as static blocks — the floor for
       a reader with no JavaScript, which is the state this page is authored in and prerendered as. It
       has to be set FIRST, because every height measured below is a height of the collapsed layout
       that only exists once it is on. */
    wrap.setAttribute('data-pills-live', '1');
    teardown.push(() => { try { wrap.removeAttribute('data-pills-live'); } catch (e) { } });

    items.forEach((item) => { setBoxInstantly(item, { height: measureButtonH(item) }); });

    setWrapActive(false);
    setVisualActive(null);

    items.forEach((item, i) => {
      const btn = item.querySelector('[data-feature-pills-button]');
      if (!btn) return;
      const onClick = () => switchTo(i);
      btn.addEventListener('click', onClick);
      teardown.push(() => btn.removeEventListener('click', onClick));
    });

    const onKey = (e) => { if (e.key === 'Escape') closeAll(); };
    wrap.addEventListener('keydown', onKey);
    teardown.push(() => wrap.removeEventListener('keydown', onKey));

    const debounce = (fn, wait) => {
      let t;
      const d = function () { clearTimeout(t); const a = arguments; t = setTimeout(() => fn.apply(null, a), wait); };
      d.cancel = () => clearTimeout(t);
      return d;
    };

    const handleResize = () => {
      const current = getActiveIndex();
      items.forEach((item) => { if (item.getAttribute('data-active') !== 'true') item.style.width = ''; });
      captureCollapsedWidths();
      if (current !== null) {
        const item = items[current];
        const expandedW = getExpandedWidth();
        const { openH } = getHeights(item, expandedW);
        setBoxInstantly(item, { height: openH, width: expandedW || Math.ceil(item.getBoundingClientRect().width) + 'px' });
      } else {
        items.forEach((item) => { setBoxInstantly(item, { height: measureButtonH(item) }); });
      }
    };

    const debouncedResize = debounce(handleResize, 200);
    captureCollapsedWidths();
    window.addEventListener('resize', debouncedResize, { passive: true });
    /* [ATMOS 8] RE-MEASURED WHEN THE REAL FACE LANDS. Neue Montreal is a local .otf on
       font-display:swap, so everything measured at mount was measured in a fallback with different
       metrics — and now that all six pills share one width, the widest label decides for the set. Get
       that from the wrong typeface and every pill is wrong. Same trap the rest of this page records. */
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => { if (wrap.isConnected) handleResize(); });
    }
    teardown.push(() => { debouncedResize.cancel(); window.removeEventListener('resize', debouncedResize); });
    teardown.push(() => {
      items.forEach((i) => { restoreLines(i); i.style.transition = ''; i.style.height = ''; i.style.width = ''; });
      visuals.forEach((v) => { try { gsap.killTweensOf(v); gsap.set(v, { clearProps: 'clipPath' }); } catch (e) { } });
    });
  });

  return function destroy() {
    teardown.forEach((fn) => { try { fn(); } catch (e) { } });
    teardown.length = 0;
  };
}
