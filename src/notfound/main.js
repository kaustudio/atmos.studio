/* The 404's type, rebuilt as particles.

   The heading in the markup is the real thing, at the real size, and it is what a visitor gets when
   this script never runs, when WebGL is refused, when Neue Montreal fails to load, or when the
   visitor has asked for less motion. Only once all four are known good does the particle field take
   over, and it takes over *in place*: the cloud is scaled and offset so its glyphs land exactly
   where the heading's glyphs already were, measured off the live element rather than guessed. The
   heading then goes to opacity 0 — still in the layout, still in the accessibility tree, still
   selectable and copyable.

   The size of the type is not this module's business either. public/fit-width.js (Osmo Supply's
   resource, as delivered) sets the font-size that fills `.nf-type`, and everything here is measured
   off whatever it lands on — so the 404 is as wide as the page allows and the cloud follows, at any
   viewport, with no size named twice. */

import { createParticleField } from './particleField.js';
import { rasterizeType, RASTER_FONT_PX } from './typeRaster.js';

// Must match the @font-face family in public/legal.css, which this page loads for its chrome.
const FAMILY = 'Neue Montreal';

/* Tuning. The spring, damping and swirl figures are the effect's own defaults; the rest is set
   against the type rather than against an object. Float and rock are dialled well back, because a bob
   sized for a floating object reads as a wobble on a line of type. `fov` and `cameraDistance` are the
   defaults, named here only because placement() needs them.

   `size` and `radius` are absent on purpose — see GRAIN below. */
const FIELD = {
  count: 64000,
  sizeVariance: 0.4,
  strength: 1.1,
  swirl: 0.6,
  spring: 1,
  damping: 0.35,
  drift: 0.35,
  floatIntensity: 0.8,
  rotationIntensity: 0.28,
  floatSpeed: 1.4,
  fov: 65,
  cameraDistance: 4.2,
};

/* Grain and reach, per font size rather than fixed.

   Fitting the 404 to the page means its size now spans roughly 200px on a phone to over 1000px on a
   wide desktop. Particle size and push radius are both in CSS pixels, so a single pair of figures
   would be coarse at one end and invisible at the other: the count is fixed (changing it rebuilds the
   cloud, which is far too expensive to do while a window is being dragged), so what scales instead is
   how big each particle draws and how far the cursor reaches. Both are uniforms — free to change on
   every frame.

   `size` and `radius` below are the values at REFERENCE_PX, and they scale linearly from there. The
   clamps stop sub-pixel particles at the small end and blobs at the large end. */
const GRAIN = {
  REFERENCE_PX: 800,
  size: 3.6,
  sizeRange: [1.2, 4.6],
  radius: 300,
  radiusRange: [90, 420],
};

const clamp = (value, [lo, hi]) => Math.min(Math.max(value, lo), hi);

const typeBox = document.querySelector('[data-nf-type]');
const title = document.querySelector('[data-nf-title]');
const canvas = document.querySelector('[data-nf-canvas]');

let raster = null;
let field = null;

/* Where the cloud has to sit, in the field's scene units, for its ink to cover the heading's ink —
   plus the grain figures for the size the type currently is.

   The cloud arrives centred on its own bounding box with its longest side normalised to 1, and it
   renders at the centre of the canvas. The canvas is the whole viewport and the heading is wherever
   the layout put it, so the offsets are simply the gap between the two centres. Finding the heading's
   ink centre is the only fiddly part: a line of type is not centred inside its own line box —
   half-leading sits above the ascent, and the ink of "404" fills neither the full em nor the full
   advance — so it is derived from the same metrics the raster was measured with. */
function placement() {
  const fontPx = parseFloat(getComputedStyle(title).fontSize) || 0;
  const box = title.getBoundingClientRect();
  const view = canvas.getBoundingClientRect();
  const worldPerPx =
    (2 * FIELD.cameraDistance * Math.tan((FIELD.fov * Math.PI) / 360)) /
    Math.max(canvas.clientHeight, 1);

  const em = raster.em;
  const halfLeading = (box.height - (em.fontAscent + em.fontDescent) * fontPx) / 2;
  const baseline = halfLeading + em.fontAscent * fontPx;
  // The ink's centre and the canvas's centre, both in viewport pixels.
  const inkX = box.left + em.inkCenterX * fontPx;
  const inkY = box.top + baseline + em.inkCenterY * fontPx;
  const scaleFromReference = fontPx / GRAIN.REFERENCE_PX;

  return {
    scale: Math.max(em.inkWidth, em.inkHeight) * fontPx * worldPerPx,
    xOffset: (inkX - (view.left + view.width / 2)) * worldPerPx,
    // Screen pixels count downwards, scene units upwards.
    yOffset: -(inkY - (view.top + view.height / 2)) * worldPerPx,
    size: clamp(GRAIN.size * scaleFromReference, GRAIN.sizeRange),
    radius: clamp(GRAIN.radius * scaleFromReference, GRAIN.radiusRange),
  };
}

// The ink colour is the page's, read back off the heading so the theme tokens stay the only source.
const inkColor = () => getComputedStyle(title).color;

function start() {
  if (field) return;
  field = createParticleField(canvas, {
    source: raster.data,
    color: inkColor(),
    ...FIELD,
    ...placement(),
  });
  // No WebGL context: the heading stays exactly as it is.
  if (field) typeBox.setAttribute('data-nf-live', '');
}

function stop() {
  if (!field) return;
  field.destroy();
  field = null;
  typeBox.removeAttribute('data-nf-live');
}

async function init() {
  if (!typeBox || !title || !canvas) return;

  const weight = getComputedStyle(title).fontWeight || '500';
  const spec = `${weight} ${RASTER_FONT_PX}px "${FAMILY}"`;
  try {
    await document.fonts.load(spec);
  } catch {
    /* handled by the check below */
  }
  // A particle 404 in the fallback sans would be a different design, not a degraded one.
  if (!document.fonts.check(spec)) return;

  const style = getComputedStyle(title);
  const letterSpacing = parseFloat(style.letterSpacing);
  raster = rasterizeType(title.textContent.trim(), {
    fontFamily: style.fontFamily,
    fontWeight: weight,
    letterSpacingEm: Number.isFinite(letterSpacing)
      ? letterSpacing / (parseFloat(style.fontSize) || 1)
      : 0,
  });
  if (!raster) return;

  /* Hand the stylesheet the one figure it can't know: how wide this line of type is per pixel of its
     line box. It uses it to stop the fitted 404 outgrowing a viewport that cannot scroll (notfound.css
     → .nf-type max-width), and measured beats the hardcoded fallback sitting there. It is the advance
     over the line box rather than over the ink, because layout is what would overflow.

     Setting it can itself change the fit; the observer below picks that up. It cannot loop: both terms
     scale with the font size, so the ratio is the same at any size. */
  const lineBox = title.getBoundingClientRect().height;
  const currentFontPx = parseFloat(getComputedStyle(title).fontSize) || 0;
  if (lineBox > 0 && currentFontPx > 0) {
    document.documentElement.style.setProperty(
      '--nf-fit-ratio',
      String(raster.em.advance / (lineBox / currentFontPx)),
    );
  }

  /* Both, for two different changes: the canvas resizes when the viewport does, and the heading
     resizes when fit-width.js re-fits it — which happens on viewport changes *and* once more after
     the webfont lands. Neither implies the other now that the canvas is no longer a box around the
     heading. */
  const follow = new ResizeObserver(() => field?.setOptions(placement()));
  follow.observe(canvas);
  follow.observe(title);

  /* And on scroll, which is a third kind of change and needs saying because it is not obvious from
     placement(): every offset it returns is the gap between the heading's rect and the canvas's, both
     read in VIEWPORT pixels. The canvas is position:fixed, so its rect never moves — but the heading's
     does, the moment the page scrolls. Until the footer moved past the fold this page could not scroll
     at all, so resizing was the only way those two could ever disagree; now scrolling is another, and
     without this the cloud stays parked mid-screen while the type it is standing in for slides out from
     under it.

     rAF-throttled because scroll fires far faster than the compositor can use, and the work is only a
     uniform update. Safe to throttle this way, unlike the field's start-up failsafe: this is a response
     to an event that only happens while the tab is live and painting, not a timer that has to survive a
     tab that is not. */
  let queued = false;
  window.addEventListener(
    'scroll',
    () => {
      if (queued || !field) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        field?.setOptions(placement());
      });
    },
    { passive: true },
  );

  const dark = window.matchMedia('(prefers-color-scheme: dark)');
  dark.addEventListener('change', () => field?.setOptions({ color: inkColor() }));

  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  motion.addEventListener('change', () => (motion.matches ? stop() : start()));
  if (!motion.matches) start();
}

init();
