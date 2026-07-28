/* Grid overlay — after Osmo Supply's Animated Grid Overlay (Columns) [https://osmo.supply/]
   The hooks are the resource's ([data-animated-grid], [data-animated-grid-col],
   [data-animated-grid-toggle], the `animatedGridState` key, Shift+G suppressed inside inputs). Two
   things about it are deliberately NOT the resource's, both asked for:

   · No animation. A ruler that slides in is a ruler you cannot trust for the first second, and this
     one exists to be flicked on and off against an edge you are staring at. Instant cut, no GSAP —
     which is also why this file no longer touches window.gsap at all.

   · Two levels, not one, cycled by the same key: Shift+G → columns → columns + margins → off.
     The second level ADDS to the first rather than replacing it, so the two are read against each
     other: the band doubles the red where it covers the columns, and the margin is what stays
     light.

       COLUMNS  12 tracks on the 24px gutter, inside the 24px page margin. Checks horizontal
                alignment: does a cell start where a column starts.
       MARGINS  the columns again, plus one stretched band inset by the margin on all four sides.
                Checks the edges the column grid cannot show you — the 24px above the navigation and
                below the footer. A column overlay makes a page look aligned while its top margin is
                18px, because columns say nothing about a horizontal edge.

   Red at 0.2, not the resource's #f4f4f4. A neutral grey was correct on Osmo's own dark demo; here
   it is a wash the same weight as the app's own surfaces, and on the library list — the screen this
   is most often pointed at — grey columns behind grey rows read as part of the design. Red is the
   one hue this monochrome interface cannot produce, so nothing on screen can be mistaken for it.

   Four integration notes, all forced by this codebase rather than chosen:

   1 · It builds its own DOM. The app renders one React tree and has no static markup to paste into.
       Building the nodes here keeps the overlay out of the component tree: nothing to re-render.

   2 · It mounts on document.body, per the resource's own note. The app root carries the theme
       crossfade, and a transformed ancestor would turn position:fixed into position:relative-to-
       that-ancestor — the overlay would silently stop covering the viewport.

   3 · No .container/--size-container. That scaling system is not installed here, and this app has no
       page-level container: sections run full width inside the gutter. Class names are scoped under
       [data-animated-grid] so the very generic `.container` cannot collide with anything.

   4 · Columns and margins are drawn from --grid-cols, --grid-gutter and --page-gutter, never from
       literals. An overlay carrying its own opinion of the grid is a second source of truth that
       eventually disagrees with the first one, silently — which is the failure it exists to catch. */

const KEY = 'animatedGridState';
const LEVELS = ['closed', 'columns', 'margins'];

const CSS = `
[data-animated-grid]{position:fixed;inset:0;z-index:200;pointer-events:none}
[data-animated-grid] .ag-layer{position:absolute;inset:0;display:none}
[data-animated-grid][data-level="columns"] .ag-layer--cols{display:block}
/* The columns stay on at level two — the levels STACK, they do not replace each other. Where the
   band overlaps them the red doubles (0.2 over 0.2), so the content box reads darker and the 24px
   margins stay at single strength: the margin is legible as the lighter strip, without either grid
   having to be hidden to show the other. */
[data-animated-grid][data-level="margins"] .ag-layer--cols{display:block}
[data-animated-grid][data-level="margins"] .ag-layer--margins{display:block}
[data-animated-grid] .ag-container{width:100%;height:100%;margin-inline:auto;padding-inline:var(--page-gutter)}
[data-animated-grid] .ag-row{display:grid;grid-template-columns:repeat(var(--grid-cols),minmax(0,1fr));gap:var(--grid-gutter);width:100%;height:100%;overflow:clip}
[data-animated-grid] .ag-col{width:100%;height:100%;min-height:100%;opacity:.2;background-color:#FF0000}
[data-animated-grid] .ag-band{position:absolute;inset:var(--grid-gutter) var(--page-gutter);opacity:.2;background-color:#FF0000}
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

  // LEVEL 1 — the columns.
  const cols = document.createElement('div');
  cols.className = 'ag-layer ag-layer--cols';
  const container = document.createElement('div');
  container.className = 'ag-container';
  const row = document.createElement('div');
  row.className = 'ag-row';
  // Read from the token rather than hard-coded, so 12 lives in exactly one place.
  const declared = getComputedStyle(document.documentElement).getPropertyValue('--grid-cols').trim();
  const count = Math.max(1, parseInt(declared, 10) || 12);
  for (let i = 0; i < count; i += 1) {
    const col = document.createElement('div');
    col.setAttribute('data-animated-grid-col', '');
    col.className = 'ag-col';
    row.appendChild(col);
  }
  container.appendChild(row);
  cols.appendChild(container);

  // LEVEL 2 — the margins. One band, stretched, inset by the margin on all four sides, so what the
  // overlay draws is the space the layout is NOT allowed to use.
  const margins = document.createElement('div');
  margins.className = 'ag-layer ag-layer--margins';
  const band = document.createElement('div');
  band.setAttribute('data-animated-grid-band', '');
  band.className = 'ag-band';
  margins.appendChild(band);

  grid.appendChild(cols);
  grid.appendChild(margins);
  document.body.appendChild(grid);

  let level = LEVELS.indexOf((() => {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  })());
  if (level < 0) level = 0;

  function apply() {
    grid.setAttribute('data-level', LEVELS[level]);
    try { localStorage.setItem(KEY, LEVELS[level]); } catch (e) { }
  }
  apply();

  // One key, three states, in the order you need them: is this on the columns, then is the edge
  // right, then get out of the way.
  function cycleGrid() { level = (level + 1) % LEVELS.length; apply(); }

  function isTypingContext(e) {
    const el = e.target;
    if (!el) return false;
    const tag = (el.tagName || '').toLowerCase();
    return tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable;
  }

  document.querySelectorAll('[data-animated-grid-toggle]').forEach((btn) => {
    btn.addEventListener('click', (e) => { e.preventDefault(); cycleGrid(); });
  });

  window.addEventListener('keydown', (e) => {
    if (isTypingContext(e)) return;
    if (!(e.shiftKey && (e.key || '').toLowerCase() === 'g')) return;
    e.preventDefault();
    cycleGrid();
  });
}

export default initGridOverlay;
