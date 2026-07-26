/* Rasterise a line of type into the ImageData the particle field samples.

   The CSS stays the single authority on the typography: this module is handed the family, weight and
   letter-spacing already computed off the live element, and rasterises at a fixed large size rather
   than at the size on screen. Nothing needs re-rastering when the viewport changes — the cloud is
   resolution-independent once sampled, and only its `scale` follows the type.

   Every measurement comes back as a fraction of the font size (an em figure), so the caller can turn
   it into CSS pixels by multiplying by whatever font-size the element currently resolves to. */

const RASTER_FONT_PX = 480;
// Keeps antialiased glyph edges off the raster's own edge, where sampling would clip them.
const MARGIN = 8;

/**
 * @param {string} text
 * @param {{fontFamily: string, fontWeight: string, letterSpacingEm: number}} style
 * @returns {{data: ImageData, em: {inkWidth: number, inkHeight: number, advance: number,
 *   inkCenterX: number, inkCenterY: number, fontAscent: number, fontDescent: number}} | null}
 */
export function rasterizeType(text, { fontFamily, fontWeight, letterSpacingEm }) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const font = `${fontWeight} ${RASTER_FONT_PX}px ${fontFamily}`;
  // Canvas letterSpacing is recent (Chrome 99, Safari 17.4, Firefox 128). Where it is missing the
  // glyphs simply sit at their default fit — the tracking is a refinement, not the effect.
  const spacing = `${letterSpacingEm * RASTER_FONT_PX}px`;
  const applyFont = () => {
    ctx.font = font;
    if ('letterSpacing' in ctx) ctx.letterSpacing = spacing;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    // White, so the field's tint is what decides the ink colour.
    ctx.fillStyle = '#ffffff';
  };

  applyFont();
  const m = ctx.measureText(text);
  const inkWidth = m.actualBoundingBoxLeft + m.actualBoundingBoxRight;
  const inkHeight = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent;
  if (!(inkWidth > 0) || !(inkHeight > 0)) return null;

  canvas.width = Math.ceil(inkWidth) + MARGIN * 2;
  canvas.height = Math.ceil(inkHeight) + MARGIN * 2;
  // Sizing the canvas resets the 2d state, so the font has to be set a second time.
  applyFont();
  ctx.fillText(text, MARGIN + m.actualBoundingBoxLeft, MARGIN + m.actualBoundingBoxAscent);

  return {
    data: ctx.getImageData(0, 0, canvas.width, canvas.height),
    em: {
      inkWidth: inkWidth / RASTER_FONT_PX,
      inkHeight: inkHeight / RASTER_FONT_PX,
      advance: m.width / RASTER_FONT_PX,
      // Both relative to the text origin: x from the left edge of the advance, y from the baseline
      // (positive downwards, as canvas and CSS both count it).
      inkCenterX: (m.actualBoundingBoxRight - m.actualBoundingBoxLeft) / 2 / RASTER_FONT_PX,
      inkCenterY: (m.actualBoundingBoxDescent - m.actualBoundingBoxAscent) / 2 / RASTER_FONT_PX,
      fontAscent: m.fontBoundingBoxAscent / RASTER_FONT_PX,
      fontDescent: m.fontBoundingBoxDescent / RASTER_FONT_PX,
    },
  };
}

export { RASTER_FONT_PX };
