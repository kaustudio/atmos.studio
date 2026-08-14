/* OPTICAL ALIGNMENT — putting the display INK on the column line, not its box.

   The page's whole structure is that everything starts on column line one. Measured, it does: every
   heading's layout box lands within a pixel of the line. And the biggest type on the page still looks
   wrong against the body copy beneath it, because a letterform's ink is inset from its box by the
   glyph's left side-bearing — and side-bearing scales with type size. At 86px the "C" of "Colour"
   sits several pixels right of the line that the 15px paragraph under it starts exactly on. The
   larger the type, the more visibly it floats.

   BOX ON GRID IS NOT INK ON GRID. This is the correction: measure the first glyph's actual left
   bearing in the FONT THAT IS ACTUALLY LOADED, then shift the box left by that much so the ink lands
   where the box used to.

   MEASURED AT RUNTIME, and it has to be. Neue Montreal is a local .otf with font-display:swap, so at
   mount the browser is still drawing a fallback with entirely different metrics — measuring then
   would compute a nudge for a face the reader will never see. So this waits on document.fonts.ready,
   and re-measures on resize because every target is set in vw and its bearing scales with it.

   It reads the value from a canvas rather than carrying a table of per-glyph numbers, which means it
   stays correct if the copy changes, if the typeface changes, and on any machine where the webfont
   failed to load and a fallback is genuinely what is on screen.

   WHAT IT DOES NOT TOUCH: anything centred. A centred block has no edge to align to — nudging it
   would simply put it off centre. Only the left-aligned display type on the page's own column line. */

function noop() { }

/* The display elements whose ink is large enough for the bearing to be visible. Body copy is
   deliberately absent: at 15px the bearing is a fraction of a pixel and shifting it would introduce
   an inconsistency rather than remove one. */
const TARGETS = '[data-optical]';

export function initOptical(root) {
  if (!root || typeof document === 'undefined') return noop;
  let ctx;
  try {
    const cv = document.createElement('canvas');
    ctx = cv.getContext('2d');
  } catch (e) { return noop; }
  if (!ctx) return noop;

  const els = [].slice.call(root.querySelectorAll(TARGETS));
  if (!els.length) return noop;

  function align() {
    els.forEach((el) => {
      if (!el.isConnected) return;
      // Reset first: the measurement has to be taken against the box the CSS puts there, not against
      // the box a previous run already moved.
      el.style.marginInlineStart = '0px';
      const cs = getComputedStyle(el);
      // Centred type has no edge to correct — see the note above.
      if (cs.textAlign === 'center' || cs.textAlign === 'right') return;
      const text = (el.textContent || '').trim();
      if (!text) return;
      let ch = text[0];
      if (cs.textTransform === 'uppercase') ch = ch.toUpperCase();
      try {
        ctx.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
        ctx.textAlign = 'left';
        const m = ctx.measureText(ch);
        const abl = m.actualBoundingBoxLeft;
        if (!isFinite(abl)) return;
        /* actualBoundingBoxLeft is positive when ink overhangs LEFT of the origin and negative when it
           is inset. Setting the start margin to it moves the box by exactly the bearing in the right
           direction either way, so an overhanging glyph is pushed in and an inset one is pulled out.
           marginInlineStart rather than marginLeft: the correction belongs to the reading direction,
           and this site's own layout rules are written logically. */
        el.style.marginInlineStart = abl.toFixed(2) + 'px';
      } catch (e) { }
    });
  }

  // Never before the real face has landed — see the note above.
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => { if (root.isConnected) align(); });
  } else {
    align();
  }

  let t;
  function onResize() {
    clearTimeout(t);
    t = setTimeout(() => { if (root.isConnected) align(); }, 140);
  }
  window.addEventListener('resize', onResize);

  return function destroy() {
    window.removeEventListener('resize', onResize);
    clearTimeout(t);
    els.forEach((el) => { try { el.style.marginInlineStart = ''; } catch (e) { } });
  };
}
