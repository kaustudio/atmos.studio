/* Osmo Supply — Before/After Split Slider.
   The mechanic is the resource's own and unchanged: a wrapper holding two stacked layers, the second
   marked [data-splitter="after"] and revealed by animating its clip-path inset from the left, and a
   [data-splitter="handle"] the reader drags. [data-splitter-initial] sets the opening position.

   On /about it carries the accessibility argument, and it carries it with live DOM rather than two
   images — which the resource explicitly allows ("this could be a video, or any other element").
   Both sides are the SAME interface drawn in the SAME five colours; the only difference between them
   is the one ground value the section is arguing about. So the drag is not a gallery trick here, it
   is the edit itself, under the reader's thumb.

   [ATMOS 1] THE DRAG IS POINTER EVENTS, not Draggable.
   The resource uses GSAP's Draggable, which is not one of the five plugins vendored in /public/vendor
   and which index.html loads for every route including the tool. Adding a sixth blocking script so
   one figure on one page can be dragged is the wrong trade — and Draggable's contribution here is
   small and completely specified: constrain x to the wrapper, report it on move. Pointer events do
   that in a dozen lines, with capture, so a drag that leaves the element still tracks. Everything the
   resource actually is — the attribute contract, the clip-path mechanic, the initial position, the
   resize behaviour — is untouched, and GSAP still applies every value.

   [ATMOS 2] It is a slider, so it is also a SLIDER. The handle is a real focusable control with
   role="slider", arrow-key support and an accessible name, because a comparison a reader can only
   reach by dragging is a comparison keyboard and touch-assistive users cannot reach at all. The
   resource has no opinion on this; the site does (see the focus contract in global.css).

   [ATMOS 3] Scoped to the mounted root, wrapped in init/destroy, and floored under reduced motion —
   the same three accommodations the other resources on this page record. Under reduced motion the
   handle still works; what is dropped is nothing, because there is no animation to drop: the clip
   path follows the pointer 1:1 by design. Direct manipulation is immediate. */

function noop() { }

export function initBeforeAfterSplitSlider(root) {
  const gsap = window.gsap;
  if (!gsap || !root) return noop;

  const teardown = [];

  const setupSplitter = (splitter) => {
    const handle = splitter.querySelector('[data-splitter="handle"]');
    const after = splitter.querySelector('[data-splitter="after"]');
    if (!handle || !after) return;

    let bounds = splitter.getBoundingClientRect();
    let currentPercent = parseFloat(splitter.getAttribute('data-splitter-initial')) || 50;

    const setPositions = (percent) => {
      bounds = splitter.getBoundingClientRect();
      const positionX = (percent / 100) * bounds.width;
      gsap.set(handle, { x: positionX, left: "unset" });
      gsap.set(after, { clipPath: `inset(0 0 0 ${percent}%)` });
      handle.setAttribute('aria-valuenow', String(Math.round(percent)));
    };

    // Clamped rather than free: the resource gets this from Draggable's `bounds`, and without it a
    // drag past either edge inverts the inset and the after layer covers the whole frame.
    const apply = (percent) => {
      currentPercent = Math.min(100, Math.max(0, percent));
      setPositions(currentPercent);
    };

    setPositions(currentPercent);

    // ---- pointer drag [ATMOS 1]
    let dragging = false;
    const fromEvent = (e) => {
      bounds = splitter.getBoundingClientRect();
      return ((e.clientX - bounds.left) / Math.max(bounds.width, 1)) * 100;
    };
    const onDown = (e) => {
      dragging = true;
      splitter.setAttribute('data-splitter-dragging', '1');
      try { handle.setPointerCapture(e.pointerId); } catch (err) { }
      apply(fromEvent(e));
      e.preventDefault();
    };
    const onMove = (e) => { if (dragging) apply(fromEvent(e)); };
    const onUp = (e) => {
      if (!dragging) return;
      dragging = false;
      splitter.removeAttribute('data-splitter-dragging');
      try { handle.releasePointerCapture(e.pointerId); } catch (err) { }
    };
    handle.addEventListener('pointerdown', onDown);
    handle.addEventListener('pointermove', onMove);
    handle.addEventListener('pointerup', onUp);
    handle.addEventListener('pointercancel', onUp);

    // Pressing anywhere on the frame jumps the split there — the affordance every comparison slider
    // has and the one thing a drag-only handle makes unnecessarily fiddly on a wide figure.
    const onFrameDown = (e) => { if (e.target === handle || handle.contains(e.target)) return; apply(fromEvent(e)); };
    splitter.addEventListener('pointerdown', onFrameDown);

    // ---- keyboard [ATMOS 2]
    const onKey = (e) => {
      const step = e.shiftKey ? 10 : 2;
      let next = null;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next = currentPercent - step;
      else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next = currentPercent + step;
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = 100;
      if (next === null) return;
      e.preventDefault();
      apply(next);
    };
    handle.addEventListener('keydown', onKey);

    const onResize = () => setPositions(currentPercent);
    window.addEventListener('resize', onResize);

    teardown.push(() => {
      handle.removeEventListener('pointerdown', onDown);
      handle.removeEventListener('pointermove', onMove);
      handle.removeEventListener('pointerup', onUp);
      handle.removeEventListener('pointercancel', onUp);
      handle.removeEventListener('keydown', onKey);
      splitter.removeEventListener('pointerdown', onFrameDown);
      window.removeEventListener('resize', onResize);
      try { gsap.set([handle, after], { clearProps: 'all' }); } catch (err) { }
    });
  };

  root.querySelectorAll('[data-splitter="wrap"]').forEach(setupSplitter);

  return function destroy() {
    teardown.forEach((fn) => { try { fn(); } catch (e) { } });
    teardown.length = 0;
  };
}
