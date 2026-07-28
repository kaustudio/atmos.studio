/* Animated Grid Overlay (Columns) — Osmo Supply [https://osmo.supply/]
   Integrated for Atmos Gallery. The behaviour is the resource's, unchanged: the same
   [data-animated-grid] / [data-animated-grid-col] / [data-animated-grid-toggle] hooks, the same
   GSAP reveal (1s expo.inOut, 0.03 stagger from start, yPercent 100 → 0 in, 0 → −100 out), the same
   `animatedGridState` localStorage key, and the same Shift+G shortcut suppressed inside inputs.

   Four adaptations, all forced by this codebase rather than chosen:

   1 · It builds its own DOM. The original is markup in a document; this app renders one React tree
       and has no static HTML to paste into. Building the nodes here keeps the overlay out of the
       component tree entirely — nothing to re-render, no state to thread, and React never touches
       the elements GSAP is tweening.

   2 · It mounts on document.body, per the resource's own note. The app root carries the theme
       crossfade, and a transformed ancestor would turn position:fixed into position:relative-to-
       that-ancestor — the overlay would silently stop covering the viewport.

   3 · No .container/--size-container. The scaling system that supplies that variable is not
       installed here, and this app has no page-level container: sections run full width inside the
       gutter. So the row is the viewport minus --page-gutter on each side, which is what the layout
       it is measuring actually does. Class names are scoped under [data-animated-grid] so the very
       generic `.container` cannot collide with anything.

   4 · Columns are tinted from --on-surface rather than #f4f4f4, because a fixed light grey is
       invisible on this app's light theme and wrong on its dark one. Same 0.2 weight.

   The column count and gutter come from --grid-cols and --grid-gutter, so the overlay can only ever
   draw the grid the layout is built on. If someone changes the grid and forgets the overlay, the
   overlay changes with it. */

const KEY = 'animatedGridState';
const CSS = `
[data-animated-grid]{position:fixed;inset:0;z-index:200;pointer-events:none;display:none}
[data-animated-grid] .ag-container{width:100%;height:100%;margin-inline:auto;padding-inline:var(--page-gutter)}
[data-animated-grid] .ag-row{display:grid;grid-template-columns:repeat(var(--grid-cols),minmax(0,1fr));gap:var(--grid-gutter);width:100%;height:100%;overflow:clip}
[data-animated-grid] .ag-col{width:100%;height:100%;min-height:100%;opacity:.2;background-color:var(--on-surface)}
`;

export function initGridOverlay() {
  if (typeof document === 'undefined' || document.querySelector('[data-animated-grid]')) return;

  const style = document.createElement('style');
  style.setAttribute('data-animated-grid-css', '');
  style.textContent = CSS;
  document.head.appendChild(style);

  const grid = document.createElement('div');
  grid.setAttribute('data-animated-grid', '');
  grid.setAttribute('aria-hidden', 'true');
  const container = document.createElement('div');
  container.className = 'ag-container';
  const row = document.createElement('div');
  row.className = 'ag-row';

  // The count is read from the token rather than hard-coded, so 12 lives in exactly one place.
  const cssCols = getComputedStyle(document.documentElement).getPropertyValue('--grid-cols').trim();
  const count = Math.max(1, parseInt(cssCols, 10) || 12);
  for (let i = 0; i < count; i += 1) {
    const col = document.createElement('div');
    col.setAttribute('data-animated-grid-col', '');
    col.className = 'ag-col';
    row.appendChild(col);
  }
  container.appendChild(row);
  grid.appendChild(container);
  document.body.appendChild(grid);

  const cols = grid.querySelectorAll('[data-animated-grid-col]');
  const gsap = window.gsap;
  if (!gsap) return;

  let isOpen = false;
  try { isOpen = localStorage.getItem(KEY) === 'open'; } catch (e) { }

  gsap.set(grid, { display: 'block' });
  gsap.set(cols, { yPercent: isOpen ? 0 : 100 });

  function openGrid() {
    isOpen = true;
    try { localStorage.setItem(KEY, 'open'); } catch (e) { }
    gsap.fromTo(cols, { yPercent: 100 }, {
      yPercent: 0, duration: 1, ease: 'expo.inOut',
      stagger: { each: 0.03, from: 'start' }, overwrite: true,
    });
  }

  function closeGrid() {
    isOpen = false;
    try { localStorage.setItem(KEY, 'closed'); } catch (e) { }
    gsap.fromTo(cols, { yPercent: 0 }, {
      yPercent: -100, duration: 1, ease: 'expo.inOut',
      stagger: { each: 0.03, from: 'start' }, overwrite: true,
    });
  }

  function toggleGrid() { if (isOpen) closeGrid(); else openGrid(); }

  function isTypingContext(e) {
    const el = e.target;
    if (!el) return false;
    const tag = (el.tagName || '').toLowerCase();
    return tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable;
  }

  document.querySelectorAll('[data-animated-grid-toggle]').forEach((btn) => {
    btn.addEventListener('click', (e) => { e.preventDefault(); toggleGrid(); });
  });

  window.addEventListener('keydown', (e) => {
    if (isTypingContext(e)) return;
    if (!(e.shiftKey && (e.key || '').toLowerCase() === 'g')) return;
    e.preventDefault();
    toggleGrid();
  });
}

export default initGridOverlay;
