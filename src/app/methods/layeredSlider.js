/* Osmo Supply — Layered Image Slider.

   THE MECHANIC IS THE RESOURCE'S, UNCHANGED. One instance per `[data-layered-slider-init]`; the
   backgrounds crossfade on `1 - distance`; the titles (until [ATMOS 8]) lay out as a centred strip stepped by
   `max(root.clientWidth * titleGap, widestTitle + titleSpacing)`; the mask items slide by the frame's
   own width (until [ATMOS 7], which masks them over each other instead); `wrap()` keeps the strip
   infinite in both directions; `[data-active]` moves across the
   background, title and mask together; the counter pads to two digits; the autoplay bar scales on X
   and calls `goTo(1)` when it fills; Observer supplies the swipe with `dragMinimum:10`,
   `tolerance:25` and `lockAxis:true`; and every `data-` attribute keeps its name. The tuning
   constants are the resource's own: transitionDuration 1, backgroundZoom 0, titleGap 0.5,
   titleSpacing 40.

   [ATMOS 1] CustomEase IS NOT VENDORED, AND IT DOES NOT NEED TO BE.

   The resource opens with `CustomEase.create('osmo', 'M0,0 C0.625,0.05 0,1 1,1')`. That path is a
   cubic bezier with control points (0.625, 0.05) and (0, 1) — which is
   `cubic-bezier(0.625, 0.05, 0, 1)`, and that is this site's `--ease-fold` / `EASE.fold` to the last
   digit. So the resource's curve is already in the design system under another name, and the plugin
   that would have been a sixth vendored script is not required. The ease is handed in rather than
   built here, so the slider cannot drift from the token.

   This is the same call aboutHighlight.js and aboutStickyTitle.js both declined for SplitText, for
   the same reason: the five vendored plugins are the budget.

   [ATMOS 2] WRAPPED IN init/destroy. The resource already returns a destroy on `root._layeredSlider`
   and re-inits over itself; that is kept, and the caller is handed the teardown so a surface that
   unmounts takes its Observer, its tweens and its listeners with it.

   [ATMOS 3] onChoose IS THE FIRST OF SIX ADDITIONS ([ATMOS 4] to [ATMOS 8] are the others; [ATMOS 7]
   changes how the photographs move, from sliding side by side to masking over each other, and
   [ATMOS 8] how the titles do, from a sliding strip to the site's masked line reveal). The resource's titles are links — the active one lets its
   href through and any other jumps to it. Here a title is a choice rather than a destination, so the
   active title reports the index instead of navigating. Everything about how the slider MOVES is
   untouched; this only says what a committed selection means. */

import { splitLines } from './maskLines.js';

function noop() { }

export function initLayeredSlider(root, options) {
  const gsap = window.gsap;
  const Observer = window.Observer;
  if (!gsap || !Observer || !root) return noop;

  const opts = options || {};
  // See [ATMOS 1]. The resource's 'osmo' ease, as the token that already holds that curve.
  const EASE = opts.ease || 'power2.out';

  const instances = [];

  [].slice.call(root.querySelectorAll('[data-layered-slider-init]')).forEach((el) => {
    if (el._layeredSlider) el._layeredSlider.destroy();

    const titles = [].slice.call(el.querySelectorAll('[data-layered-slider-title]'));
    if (!titles.length) return;
    const count = titles.length;

    const backgrounds = [].slice.call(el.querySelectorAll('[data-layered-slider-bg]'));
    const maskItems = [].slice.call(el.querySelectorAll('[data-layered-slider-mask-item]'));
    const maskImgs = maskItems.map((item) => item.querySelector('img'));
    const maskFrame = el.querySelector('[data-layered-slider-mask]');
    const fill = el.querySelector('[data-layered-slider-fill]');
    const currentEl = el.querySelector('[data-layered-slider-current]');
    const totalEl = el.querySelector('[data-layered-slider-total]');
    const prevBtn = el.querySelector('[data-layered-slider-prev]');
    const nextBtn = el.querySelector('[data-layered-slider-next]');

    const controls = [].slice.call(new Set([].concat(titles, [].slice.call(el.querySelectorAll('a, button')))));

    const autoplayAttr = el.getAttribute('data-layered-slider-autoplay');
    const autoplay = autoplayAttr !== null ? parseFloat(autoplayAttr) : 5;

    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const clamp = gsap.utils.clamp;
    const wrap = (distance) => distance - count * Math.round(distance / count);

    const transitionDuration = 1;
    const backgroundZoom = 0;
    const titleGap = 0.5;
    const titleSpacing = 40;
    // [ATMOS 7] How far a photograph drifts while an edge crosses it, as a share of the frame.
    const MASK_DRIFT = 0.25;
    /* [ATMOS 8] THE TITLES ARRIVE THROUGH THE SITE'S LINE MASKS (15.09.26, by request). The resource's
       titles are a horizontal strip that slides a title's width per slide, with neighbours at 40%.
       Over photographs that now mask over each other, a strip of words sliding past read as the one
       thing still shunting sideways. So every title is split into the same per-line masks the rest of
       the site reveals copy through (splitLines, .reveal-mask / .reveal-line), the titles stack on one
       spot, and each line moves in Y inside its mask: the title being left rises out through the
       first TITLE_OUT of a slide, the one arriving rises in through the last TITLE_IN, overlapping in
       the middle where the photographs' edge is fastest, its lines a TITLE_STAGGER apart as the
       site's reveals are. Placed from `progress`, like the photographs, the counter and the bar, so it
       runs on the slide's own curve and second, and going back is the same thing in reverse: the
       title drops out and the previous one comes down into place. LINE_CLEAR is further than the
       reveal's 110 because a line leaving UPWARD has its descenders to clear, not its ascenders. */
    const TITLE_OUT = 0.6;
    const TITLE_IN = 0.6;
    const TITLE_STAGGER = 0.13;
    const LINE_CLEAR = 125;
    let titleSplits = [];
    const splitTitles = () => {
      titleSplits.forEach((sp) => { if (sp) { try { sp.restore(); } catch (e) { } } });
      titleSplits = titles.map((item) => splitLines(item.querySelector('.layered-slider__text-title') || item));
    };

    if (totalEl) totalEl.textContent = String(count).padStart(2, '0');

    /* [ATMOS 6] THE COUNT MOVES THROUGH A MASK, AS PART OF THE SLIDE (15.09.26, by request). The
       number on screen leaves upward and the next rises in from below, inside a clipped cell.

       IT IS NOT A TWEEN OF ITS OWN, and two versions that were are why. As a 0.4s swap it read as
       bouncy on both curves it was tried on (the hover swap's --ease-fold, then the copy
       confirmation's --ease-entrance) and never kept time with the photographs: late when it waited
       for their midpoint, early when it answered the press. So every number is a line in the cell,
       and render() places each one from `progress` exactly as it places the photographs and the bar
       ([ATMOS 5]): one line height per slide of distance from the slide being shown. The number
       therefore moves on the slide's own curve and second, a swipe moves it as far as the images, and
       a jump of several slides rolls through the numbers the photographs pass.

       Going back mirrors it, as the photographs mirror: the number drops and the previous one comes
       down from above. Lines other than the one being shown are hidden from assistive tech. */
    const pad = (n) => String(n).padStart(2, '0');
    const countLines = [];
    if (currentEl) {
      currentEl.textContent = '';
      for (let i = 0; i < count; i++) {
        const line = document.createElement('span');
        line.className = 'layered-slider__count-line';
        line.textContent = pad(i + 1);
        line.setAttribute('aria-hidden', 'true');
        currentEl.appendChild(line);
        countLines.push(line);
      }
    }

    let titleStep = 0;
    let maskStep = 0;
    const measure = () => {
      const widestTitle = Math.max.apply(null, titles.map((title) => title.offsetWidth));
      titleStep = Math.max(el.clientWidth * titleGap, widestTitle + titleSpacing);
      maskStep = maskFrame ? maskFrame.clientWidth : el.clientWidth;
    };
    measure();

    const state = { progress: 0 };
    let activeIndex = -1;

    const setActive = (previousIndex, index) => {
      [backgrounds, titles, maskItems].forEach((list) => {
        if (previousIndex >= 0 && list[previousIndex]) list[previousIndex].removeAttribute('data-active');
        if (list[index]) list[index].setAttribute('data-active', '');
      });
    };

    const render = (progress) => {
      const centeredIndex = ((Math.round(progress) % count) + count) % count;

      for (let i = 0; i < count; i++) {
        const offset = wrap(i - progress);
        const distance = Math.abs(offset);

        const background = backgrounds[i];
        if (background) {
          const backgroundOpacity = clamp(0, 1, 1 - distance);
          gsap.set(background, {
            opacity: backgroundOpacity,
            scale: 1 + backgroundZoom - backgroundZoom * backgroundOpacity,
            zIndex: Math.round(backgroundOpacity * 100),
          });
        }

        // [ATMOS 8] stacked on one spot; only the centred title takes a tap, and only the two in play show.
        gsap.set(titles[i], {
          x: 0,
          opacity: 1,
          pointerEvents: i === centeredIndex ? 'auto' : 'none',
          visibility: offset > -1 && offset < 1 ? 'visible' : 'hidden',
        });
        const split = titleSplits[i];
        if (split && split.lines.length) {
          const lines = split.lines, n = lines.length, span = 1 + TITLE_STAGGER * (n - 1);
          const leaving = offset <= 0;
          const phase = leaving
            ? clamp(0, 1, -offset / TITLE_OUT)
            : clamp(0, 1, (TITLE_IN - offset) / TITLE_IN);
          for (let j = 0; j < n; j++) {
            const t = clamp(0, 1, phase * span - j * TITLE_STAGGER);
            gsap.set(lines[j], { yPercent: leaving ? -LINE_CLEAR * t : LINE_CLEAR * (1 - t) });
          }
        }

        /* [ATMOS 7] THE PHOTOGRAPHS MASK OVER EACH OTHER (15.09.26, by request). The resource slides
           its mask items by the frame's width, which in a small frame reads as a window passing along
           a strip; at full screen it read as two photographs shunting side by side with a seam
           between them. Now the arriving photograph is uncovered OVER the one being left: its mask
           item travels in from the right edge and clips it, while the photograph inside counter-moves
           so it only drifts, a quarter of the frame, and the one underneath drifts the same quarter
           the same way as it is covered. So an edge sweeps across a picture that stays put.
           STILL A FUNCTION OF `progress`, like everything else render() draws, so a jump of several
           slides uncovers each photograph it passes, and going back plays the same thing in reverse:
           the top photograph's edge withdraws to the right and the previous one drifts back beneath
           it. Transforms only; the item's own overflow:hidden is the mask. At most two are visible:
           the one arriving (0 < offset < 1) on top, the one shown or leaving (-1 < offset <= 0) under
           it; the rest are hidden rather than parked where a stray edge could show them. */
        const maskItem = maskItems[i];
        if (maskItem) {
          const img = maskImgs[i];
          if (offset > 0 && offset < 1) {
            gsap.set(maskItem, { x: offset * maskStep, zIndex: 3, visibility: 'visible' });
            if (img) gsap.set(img, { x: -offset * maskStep * (1 - MASK_DRIFT) });
          } else if (offset <= 0 && offset > -1) {
            gsap.set(maskItem, { x: 0, zIndex: 2, visibility: 'visible' });
            if (img) gsap.set(img, { x: offset * maskStep * MASK_DRIFT });
          } else {
            gsap.set(maskItem, { x: 0, zIndex: 1, visibility: 'hidden' });
            if (img) gsap.set(img, { x: 0 });
          }
        }

        // [ATMOS 6] The count: one line height per slide of distance, on the slide's own progress.
        if (countLines[i]) gsap.set(countLines[i], { yPercent: offset * 100 });
      }

      /* [ATMOS 5] WITH AUTOPLAY OFF, THE BAR SAYS WHERE YOU ARE (15.09.26, by request).

         The resource's bar is the autoplay timer, and the phone's chooser runs with autoplay 0, so it
         sat empty for good: a track with nothing on it. So when there is no timer, the fill reports
         position instead: one step of the track per slide, solid white, the whole track at the last.

         It is driven from `progress`, the number the slides themselves are drawn from, not from the
         index. That keeps it on the slide's own curve and second, and a swipe moves it as far as it
         moves the photographs.

         THE WRAP DOES NOT RUN BACKWARDS. From the last slide to the first, a width that simply
         shrank to one step would read as travelling back through every palette. Instead the full bar
         leaves to the right, then the first step enters from the left, and going the other way the
         same numbers play in reverse. The wrap spends count/(count+1) of its length leaving: a full
         width against one step, so both edges move at one speed and it reads as one bar travelling.

         Drawn as a translate plus a scale from the left edge, both compositor properties, inside the
         track's overflow:hidden. */
      if (fill && !autoTween) {
        const p = ((progress % count) + count) % count;
        let from = 0, to;
        if (p <= count - 1) {
          to = (p + 1) / count;
        } else {
          const t = p - (count - 1);
          const leave = count / (count + 1);
          if (t < leave) { from = t / leave; to = 1; }
          else { to = ((t - leave) / (1 - leave)) / count; }
        }
        gsap.set(fill, { xPercent: from * 100, scaleX: to - from, transformOrigin: '0% 50%' });
      }

      if (centeredIndex !== activeIndex) {
        const previousIndex = activeIndex;
        activeIndex = centeredIndex;
        setActive(previousIndex, centeredIndex);
        // [ATMOS 6] Only the number being shown is exposed.
        if (countLines[previousIndex]) countLines[previousIndex].setAttribute('aria-hidden', 'true');
        if (countLines[centeredIndex]) countLines[centeredIndex].removeAttribute('aria-hidden');
        if (typeof opts.onIndex === 'function') opts.onIndex(centeredIndex);
      }
    };

    let hovering = 0;
    let autoTween = null;
    const startAutoplay = () => {
      if (!autoTween) return;
      autoTween.restart();
      if (hovering > 0) autoTween.pause();
    };

    let slideTween = null;
    let current = 0;
    function goTo(delta) {
      current += delta;
      if (slideTween) slideTween.kill();
      slideTween = gsap.to(state, {
        progress: current,
        duration: reduced ? 0 : transitionDuration,
        ease: EASE,
        onUpdate: () => render(state.progress),
      });
      startAutoplay();
    }

    function goToIndex(i) {
      const delta = wrap(i - current);
      if (delta !== 0) goTo(delta);
    }

    if (autoplay > 0 && !reduced && fill) {
      gsap.set(fill, { scaleX: 0, transformOrigin: 'left center' });
      autoTween = gsap.to(fill, {
        scaleX: 1,
        duration: autoplay,
        ease: 'none',
        paused: true,
        onComplete: () => goTo(1),
      });
    }

    let gestureUsed = false;
    const observer = Observer.create({
      target: el,
      type: 'touch,pointer',
      dragMinimum: 10,
      tolerance: 25,
      lockAxis: true,
      onDragStart() { gestureUsed = false; },
      onLeft() { if (!gestureUsed) { gestureUsed = true; goTo(1); } },
      onRight() { if (!gestureUsed) { gestureUsed = true; goTo(-1); } },
    });

    const onPrev = () => goTo(-1);
    const onNext = () => goTo(1);
    if (prevBtn) prevBtn.addEventListener('click', onPrev);
    if (nextBtn) nextBtn.addEventListener('click', onNext);

    /* [ATMOS 3] The resource lets the ACTIVE title's link through and jumps to any other. A title
       here is a choice, not a destination, so the active one commits and the rest still jump. */
    const onTitleClick = (e) => {
      const i = titles.indexOf(e.currentTarget);
      e.preventDefault();
      if (i === activeIndex) { if (typeof opts.onChoose === 'function') opts.onChoose(i); return; }
      goToIndex(i);
    };
    titles.forEach((title) => title.addEventListener('click', onTitleClick));

    /* [ATMOS 4] THE PICTURE COMMITS TOO, not just the word.

       The resource makes the title the only target — its images are backdrop and its mask frame is
       decoration, because there the slide is an advert and the title is its link. Here every slide is
       a palette the reader is choosing between, and the photograph is the thing they are actually
       looking at when they decide. Being able to see the image you want and having to hit the word
       above it is a control that ignores where the eye already is.

       So the mask frame and the background both commit the CENTRED slide, exactly as clicking the
       centred title does. They commit the active one rather than the one under the finger because
       only the active slide is fully visible in either layer — the rest are translated out of the
       frame or faded to nothing, so "the image you clicked" and "the image in the middle" are the
       same picture by construction.

       DRAG IS NOT A CLICK. Observer owns the swipe on the root, and a swipe ends with a click event
       on whatever the finger came to rest over — which would commit a choice the reader was in the
       middle of scrolling past. The pointer position is recorded on the way down and the click is
       refused if the finger travelled; 10px is Observer's own dragMinimum, so the two agree about
       what counts as a drag. */
    let downX = 0, downY = 0;
    const onPointerDown = (e) => { downX = e.clientX; downY = e.clientY; };
    const onSurfaceClick = (e) => {
      if (Math.abs(e.clientX - downX) > 10 || Math.abs(e.clientY - downY) > 10) return;
      if (typeof opts.onChoose === 'function') opts.onChoose(activeIndex);
    };
    const surfaces = [maskFrame, el.querySelector('.layered-slider__bg-collection')].filter(Boolean);
    surfaces.forEach((sf) => {
      sf.style.cursor = 'pointer';
      sf.addEventListener('pointerdown', onPointerDown);
      sf.addEventListener('click', onSurfaceClick);
    });

    const onEnter = () => { hovering++; if (autoTween) autoTween.pause(); };
    const onLeave = () => { hovering = Math.max(0, hovering - 1); if (autoTween && hovering === 0) autoTween.resume(); };
    controls.forEach((c) => {
      c.addEventListener('pointerenter', onEnter);
      c.addEventListener('pointerleave', onLeave);
    });

    // [ATMOS 8] a new width or a late font can move a title's line breaks, so the lines are re-cut.
    const onResize = () => { measure(); splitTitles(); render(state.progress); };
    window.addEventListener('resize', onResize);
    if (document.fonts) document.fonts.ready.then(onResize);

    // Live before the split: until then the no-JS rule keeps every title but the first display:none,
    // and a line cannot be measured in a box that has no layout.
    el.setAttribute('data-layered-live', '1');
    splitTitles();
    render(0);
    startAutoplay();

    const api = {
      goTo,
      goToIndex,
      index: () => activeIndex,
      destroy() {
        observer.kill();
        if (slideTween) slideTween.kill();
        if (autoTween) autoTween.kill();
        window.removeEventListener('resize', onResize);
        if (prevBtn) prevBtn.removeEventListener('click', onPrev);
        if (nextBtn) nextBtn.removeEventListener('click', onNext);
        titles.forEach((title) => title.removeEventListener('click', onTitleClick));
        surfaces.forEach((sf) => {
          sf.removeEventListener('pointerdown', onPointerDown);
          sf.removeEventListener('click', onSurfaceClick);
          try { sf.style.cursor = ''; } catch (e) { }
        });
        controls.forEach((c) => {
          c.removeEventListener('pointerenter', onEnter);
          c.removeEventListener('pointerleave', onLeave);
        });
        titleSplits.forEach((sp) => { if (sp) { try { sp.restore(); } catch (e) { } } });
        titleSplits = [];
        try { el.removeAttribute('data-layered-live'); } catch (e) { }
        el._layeredSlider = null;
      },
    };
    el._layeredSlider = api;
    instances.push(api);
  });

  if (!instances.length) return noop;
  return function destroy() { instances.forEach((i) => { try { i.destroy(); } catch (e) { } }); };
}
