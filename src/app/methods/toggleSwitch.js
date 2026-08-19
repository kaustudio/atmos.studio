/* Osmo Supply — Toggle Switch.

   THE MECHANIC IS THE RESOURCE'S, UNCHANGED. One instance per `[data-toggle-init]`, its buttons
   collected from `[data-toggle-btn]`, `--toggle-count` written from the button count, `--toggle-active`
   written with the active index so the background pill translates, `aria-pressed` and
   `[data-toggle-active]` maintained per button, one shared tab stop with `tabIndex` 0/-1, and
   Left/Right arrows moving the selection with wrap-around. Every attribute keeps its name.

   [ATMOS 1] WRAPPED IN init/destroy, not run on DOMContentLoaded. The resource is written for a
   document; this is a surface that mounts and unmounts, and its own cleanup already returns a
   destroy — that is what the caller holds now.

   [ATMOS 2] REACT OWNS THE SELECTION; THIS OWNS THE PILL AND THE KEYBOARD.

   This is the one place the integration needed a decision rather than a copy. The resource is
   self-contained: `setActive` is the source of truth and the DOM is its state. Here the selection
   also decides which panel renders, which is React state — so two owners would drift the moment
   anything else changed the tab.

   So the button's own `onClick` (React's) is left to set the state, and `onSelect` is called with
   the new index so this module can move the pill in the same gesture. React then re-renders with
   `[data-toggle-active]` and `aria-pressed` already correct, which is why `setActive` writing them
   too is harmless — both agree because both read the same fact. Arrow keys call `onSelect` as well
   rather than committing on their own, so the keyboard path and the pointer path go through one
   place.

   [ATMOS 3] `sync()` is exported on the returned handle so a caller whose state changed from
   somewhere else — a deep link, a restored session — can move the pill without a rebuild. */

function noop() { }

export function initToggleSwitch(root, options) {
  if (!root) return noop;
  const opts = options || {};
  const cleanups = [];
  const handles = [];

  [].slice.call(root.querySelectorAll('[data-toggle-init]')).forEach((toggle) => {
    const buttons = [].slice.call(toggle.querySelectorAll('[data-toggle-btn]'));
    if (buttons.length < 2) return;

    toggle.style.setProperty('--toggle-count', buttons.length);

    // Initial active is the marked button, otherwise the first.
    let activeIndex = buttons.findIndex((btn) => btn.hasAttribute('data-toggle-active'));
    if (activeIndex < 0) activeIndex = 0;

    function setActive(index) {
      activeIndex = index;
      toggle.style.setProperty('--toggle-active', index);
      buttons.forEach((btn, i) => {
        const isActive = i === index;
        btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        btn.toggleAttribute('data-toggle-active', isActive);
        btn.tabIndex = isActive ? 0 : -1;
      });
    }

    function onClick(event) {
      const index = buttons.indexOf(event.currentTarget);
      if (index !== activeIndex) {
        setActive(index);
        // See [ATMOS 2]: React commits the selection; this has already moved the pill.
        if (typeof opts.onSelect === 'function') opts.onSelect(index);
      }
    }

    function onKeydown(event) {
      const dir = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
      if (!dir) return;
      event.preventDefault();
      const next = (activeIndex + dir + buttons.length) % buttons.length;
      setActive(next);
      buttons[next].focus();
      if (typeof opts.onSelect === 'function') opts.onSelect(next);
    }

    buttons.forEach((btn) => {
      btn.addEventListener('click', onClick);
      btn.addEventListener('keydown', onKeydown);
    });

    setActive(activeIndex);
    toggle.setAttribute('data-toggle-live', '1');

    handles.push({ sync: (i) => { if (i !== activeIndex) setActive(i); } });

    cleanups.push(() => {
      buttons.forEach((btn) => {
        btn.removeEventListener('click', onClick);
        btn.removeEventListener('keydown', onKeydown);
      });
      try { toggle.removeAttribute('data-toggle-live'); } catch (e) { }
    });
  });

  if (!cleanups.length) return noop;

  const destroy = () => cleanups.forEach((fn) => fn());
  // See [ATMOS 3]. A bare function is still returned for callers that only need teardown.
  destroy.sync = (i) => handles.forEach((h) => h.sync(i));
  return destroy;
}
