/* Osmo Supply — Layered Image Slider.

   THE MECHANIC IS THE RESOURCE'S, UNCHANGED. One instance per `[data-layered-slider-init]`; the
   backgrounds crossfade on `1 - distance`; the titles lay out as a centred strip stepped by
   `max(root.clientWidth * titleGap, widestTitle + titleSpacing)`; the mask items slide by the frame's
   own width; `wrap()` keeps the strip infinite in both directions; `[data-active]` moves across the
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

   [ATMOS 3] onChoose IS THE FIRST OF TWO ADDITIONS ([ATMOS 4] is the second). The resource's titles are links — the active one lets its
   href through and any other jumps to it. Here a title is a choice rather than a destination, so the
   active title reports the index instead of navigating. Everything about how the slider MOVES is
   untouched; this only says what a committed selection means. */

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

    if (totalEl) totalEl.textContent = String(count).padStart(2, '0');

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

        gsap.set(titles[i], {
          x: offset * titleStep,
          opacity: i === centeredIndex ? 1 : 0.4,
          pointerEvents: 'auto',
        });

        const maskItem = maskItems[i];
        if (maskItem) gsap.set(maskItem, { x: offset * maskStep });
      }

      if (centeredIndex !== activeIndex) {
        const previousIndex = activeIndex;
        activeIndex = centeredIndex;
        setActive(previousIndex, centeredIndex);
        if (currentEl) currentEl.textContent = String(centeredIndex + 1).padStart(2, '0');
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

    const onResize = () => { measure(); render(state.progress); };
    window.addEventListener('resize', onResize);
    if (document.fonts) document.fonts.ready.then(onResize);

    render(0);
    startAutoplay();
    el.setAttribute('data-layered-live', '1');

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
