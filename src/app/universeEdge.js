// The universe's four edges: a refracting frame rather than a white fade.
//
// WHAT WAS THERE. One overlay carrying `inset 0 0 120px 40px var(--surface-raised)` and a radial
// gradient to the same colour — 160px of the page's own near-white laid over every side, so a tile
// travelling out of the field dissolved into the background before it reached the edge. It read as
// paper, not as a pane, and on a field whose whole subject is colour it was 160px of every side
// spent hiding colour.
//
// WHAT IS THERE NOW. The same single overlay, doing the same job — stop the wrapping field from
// hard-clipping at the viewport — by refracting what passes under it instead of washing it out.
// A tile sliding off the left is bent, split and blurred by the edge the way it would be by the rim
// of a thick glass pane, and only the outermost pixels resolve to the surface colour.
//
// WHY NOT THE OSMO SHADER ITSELF. The reference is a GLSL lens over a WebGL row: three.js owns the
// images, draws them to a render target and the fragment shader refracts that texture. This field
// is not a texture. It is live DOM — focusable buttons carrying real text, a hero image and a colour
// strip, panned by transform — and a fragment shader cannot sample DOM. Rasterising the tiles per
// frame to feed a shader would cost the text, the focus ring and the hit targets, and would show a
// seam wherever the copy met the real thing.
//
// So the refraction is done where the pixels actually are: `backdrop-filter`, with an SVG
// `feDisplacementMap` bending the live backdrop per-pixel. That is the same operation the shader's
// `pull`/`uDispersion` block performs — sample the backdrop at an offset that grows toward the rim,
// three times at three scales so red and blue separate — expressed in the one filter graph that has
// access to a DOM backdrop. Verified refracting live tiles in Chromium before this was written.
//
// WHAT IS DELIBERATELY NOT PORTED. The lens's ring, rim line, nova bloom and shimmer. Glass on this
// site is fill-defined — a tint of the mode's own surface plus a blur, and nothing else — and the
// Osmo rim vocabulary has already been rejected here three times for making an edge the heaviest
// thing on the screen. Refraction is a transmission property: it belongs to what the glass does to
// what passes THROUGH it, which is the fill's side of that rule, not the rim's. So the budget goes
// to bend, split and blur; the boundary stays unlit.

// The look, in one place. Every figure below is a pixel measurement at the field's own scale — the
// tile is 300 wide (universeTile.js) and the gutter 64, so a band of 132 is a little under half a
// card: enough travel for the bend to develop, short enough that a tile is never more than a third
// under glass.
export const EDGE = {
  // How far the frame reaches in from each side. The old wash was 160 (120 blur + 40 spread) and
  // the field lost a card's worth of readable colour to it on every side. Down from 220 so the
  // glass sits INSIDE the card-stretch zone rather than alongside it: a card begins to lean while
  // it is still crisp, and only meets the refraction at the rim. Two effects in sequence read as
  // one edge; two effects over the same pixels read as noise.
  BAND: 150,
  // Peak sideways displacement at the outermost pixel, in px. This is the shader's `uZoom` pull
  // expressed as a distance rather than a ratio: the backdrop is sampled up to 110px further INTO
  // the field than where it is drawn, so content compresses against the rim instead of sliding off
  // it. Past ~46 the map stops being monotonic and the bend FOLDS — content near the rim reverses
  // and piles up against it.
  //
  // DOWN FROM 110, and the reason is the whole point of the CARD block below. A per-pixel field
  // does not know what a card is. It bends whatever pixel is at a coordinate, so a card straddling
  // the band has its top displaced further than its bottom and is SHEARED — the panel tears away
  // from its own border, and the hero image, being the only dense thing in the card, takes all of
  // the visible damage while the white panel underneath barely shows it. That is why it read as an
  // effect happening TO the image rather than to the card. The stretch is the card transform's job
  // now; this figure is back to what glass needs to look like glass at the rim, and no more.
  REFRACT: 55,
  // The red/blue split, as a fraction of REFRACT — the shader's `uDispersion`, which there is 11 on
  // an arbitrary scale and here is a straight percentage of the bend. .18 is visible as colour on a
  // hard vertical (a card's strip crossing the rim) and invisible on a photograph, which is the
  // right place for it to show: dispersion is a property of the edge, not a tint on the content.
  // Swept live at .16, .22, .30 and .90. It came DOWN from .22 when WAVE went up: the tangential
  // drag smears a card across a long arc, and every millimetre of that arc carries the split, so
  // the same figure that was a fringe on a 44px bend is a rainbow on a 260px one. .16 keeps the
  // colour on hard edges and off the photographs.
  DISPERSE: 0.16,
  // Frosting. Runs BEFORE the displacement in the CSS chain so the browser's own backdrop blur —
  // which clamps correctly at the viewport boundary — does the softening, rather than a
  // feGaussianBlur inside the graph that would darken the outer rim against transparent black.
  BLUR: 9,
  // Peak opacity of the surface tint at the outermost pixel. NOT 1: the old overlay reached the
  // page colour and that is precisely what made it a fade. Down from .62 with the stronger bend —
  // the whole subject of the band is now the colour being dragged through it, and 62% of the page
  // laid over that was hiding the thing worth looking at.
  TINT: 0.34,
  // The band's ceiling as a share of the SHORT side of the viewport, which is what keeps BAND a
  // depth rather than a proportion of the screen. 132 is right on anything with room; at 1400x400
  // it is two thirds of the height and the field becomes a strip of clear glass between two bands.
  // Derived from the short side rather than per-axis on purpose — a frame 132 deep at the sides and
  // 72 at the top is not a frame, it is two different edges meeting at a corner. Engages only below
  // ~730px on the short side, so every ordinary desktop keeps the full 132.
  BAND_MAX_SHARE: 0.15,
  // The falloff, as an exponent on the normalised depth into the band. The shader uses nd² for its
  // pull; 2.2 holds the inner half of the band nearly straight and spends the bend in the outer
  // half, which is what keeps the inner boundary from reading as a line. Lower this and the frame
  // starts to look like a lens laid on top; raise it and the bend collapses into the outermost few
  // pixels and stops being visible at all.
  CURVE: 2.2,

  // THE TANGENTIAL DRAG — how far content is pulled ALONG the edge it is passing, in px. This is
  // the shader's uRimTangential, and it is the single parameter that decides whether cards stick
  // and blend or merely bend.
  //
  // The normal push can only magnify. Continuity at the inner boundary forces the map to be zero
  // there, so an inward-sampling band always stretches the gutters along with the cards and the
  // cards stay separate — no amount of REFRACT closes a gap. Dragging content SIDEWAYS along the
  // boundary does close it: two neighbouring cards are swept into the same arc and their colour
  // meets. That is the whole mechanism.
  //
  // The figure came from measuring the reference rather than from taste. Its rimOff peaks at
  // fluidWave(0.8) x rScreen(~1.04) x uRimTangential(0.3), which is about a quarter of the viewport;
  // the first attempt here was 34px on a 1732px screen, or 2%, which is why it read as nothing.
  // 260 was 15% and it was carrying the whole effect, shearing every card it touched to get there.
  // With CARD_STRETCH doing the stretching coherently, this is back to 70 — enough to blend the
  // colour of two neighbours where they meet at the rim, not enough to pull one card apart.
  WAVE: 70,
  // ===== THE CARD, AS ONE THING =====
  //
  // Everything above bends PIXELS. This bends the CARD, and the two are doing different jobs on
  // purpose. A displacement map has no idea where one tile ends and the next begins, so it can make
  // glass but it cannot make a card lean — asked to do both it shears them, worst on the hero image
  // because that is the only part dense enough to show it.
  //
  // So the whole tile element gets a transform of its own, from its own centre, and every part of it
  // — hero, colour strip, metrics, border — stretches together. It rides on the pan engine's own
  // quickSetters (universe.js), which is what keeps it a single matrix with the position rather than
  // a second transform fighting it. Because it is a real DOM transform the hit area stretches with
  // the card, so for this half of the effect sight and click never diverge at all.

  // How far a card's CENTRE can be from the viewport edge and still be taken hold of, in px — and
  // then capped as a share of the short side, which is the half that was missing.
  //
  // 420 FLAT WAS THE BUG, and it did not look like one at 1732x1328 where it left an 488px clear
  // strip down the middle. Two reaches is 840px of every axis, so the moment the window is smaller
  // the clear strip is gone: measured 60px tall at 1400x900 and 128px at 1091x968, against a card
  // that is 463px tall. Every card on screen was being morphed and there was no overview left to
  // have. The share is what keeps the middle of the field the middle of the field at any size —
  // 65-69% of the viewport is now untouched across those same three sizes, where it was 14-31%.
  CARD_REACH: 260,
  CARD_REACH_SHARE: 0.17,
  // How much the card stretches ALONG the edge it is approaching, as a fraction, at full reach.
  // This is the reference's tall bowed card at the lens rim expressed as a scale rather than a
  // shader: a card going off the left gets taller, one going off the top gets wider.
  CARD_STRETCH: 0.22,
  // ...and how much it compresses INTO that edge over the same distance. Slightly less than the
  // stretch, so a card gains a little area as it is drawn out rather than merely changing shape.
  CARD_COMPRESS: 0.16,
  // The falloff on both, over CARD_REACH. Steeper than it was: the reach decides where the effect
  // can act at all, and this decides how much of that reach it actually spends. At 2.6 a card is
  // still essentially square through the first half of its approach and does most of its leaning in
  // the last quarter, so the transition into the edge stays smooth without the morph creeping
  // inward. Lower this and the middle of the field starts to breathe again.
  CARD_CURVE: 2.6,

  // How many periods of that drag across the viewport. 1 is a single smooth sweep per edge, which
  // is what the reference does — its fluidWave runs off the polar angle, so one traverse of a
  // boundary is roughly one period. Raising it turns a drag into a ripple and the edge starts to
  // read as corrugated rather than fluid.
  WAVE_FREQ: 1,
};

// THE BAND'S EFFECTIVE DEPTH, and every one of the three places that needs it asks here.
//
// The depth is expressed three times over — as pixels in the displacement map, as the --u-band the
// mask and the tint gradients are cut from, and as the profile edgeAim inverts for hit testing. All
// three have to be the same number or the frame is drawn at one depth, masked at a second and
// clicked at a third. So none of them read EDGE.BAND directly.
export function edgeBand(w, h) {
  return Math.min(EDGE.BAND, Math.min(w, h) * EDGE.BAND_MAX_SHARE);
}

// THE OFFSET FIELD — one function, asked by everything that needs to know where the glass looks.
// The map is drawn from it and the hit test is corrected by it, so the frame cannot be drawn along
// one profile and clicked along another.
//
// Returns SCREEN pixels: how far the backdrop at (x, y) is sampled from. Two components, and the
// second one is the whole reason the first build read as polite.
//
// NORMAL — straight in from the edge, growing as depth^CURVE. This is the shader's `pull`, and on
// its own it can only MAGNIFY. Continuity forces the map to zero at the inner boundary or the frame
// shows a seam there, so the mapping always stretches — and it stretches the gutters along with the
// cards, which is why no amount of REFRACT ever closed a gap between two of them.
//
// TANGENTIAL — along the edge being passed, gated by that edge's own depth so it fades out with it.
// This is the one that makes cards stick: two neighbours are swept into the same arc and their
// colour meets in the middle. A left or right edge drags vertically, a top or bottom edge drags
// horizontally, and a corner takes both, which produces the sweep round the outside. It is the
// shader's `rimOff`, and measuring the reference is what established how big it has to be — see
// WAVE above.
export function edgeOffset(x, y, w, h) {
  const band = edgeBand(w, h);
  // Signed depth: +1 at the near edge, -1 at the far one, 0 anywhere in the clear middle. The
  // half-size clamp is what stops the two ramps crossing on a viewport narrower than two bands.
  const depth = (v, size) => {
    const b = Math.min(band, size / 2);
    if (v < b) return (b - v) / b;
    if (v > size - b) return -(v - (size - b)) / b;
    return 0;
  };
  const tx = depth(x, w), ty = depth(y, h);
  const ax = Math.abs(tx), ay = Math.abs(ty);
  const F = Math.PI * 2 * EDGE.WAVE_FREQ;
  return [
    EDGE.REFRACT * Math.sign(tx) * Math.pow(ax, EDGE.CURVE) + EDGE.WAVE * Math.pow(ay, EDGE.CURVE) * Math.sin((x / w) * F),
    EDGE.REFRACT * Math.sign(ty) * Math.pow(ay, EDGE.CURVE) + EDGE.WAVE * Math.pow(ax, EDGE.CURVE) * Math.sin((y / h) * F),
  ];
}

// THE CARD'S OWN DEFORMATION — how one whole tile is stretched, given where its centre is.
//
// Returns [scaleX, scaleY] for a card centred at (cx, cy). Both are 1 in the clear middle, so the
// far side of the field pays nothing and the transform can be written unconditionally.
//
// Along the edge it stretches, into the edge it compresses. A left or right edge is a vertical
// boundary, so "along" is Y and "into" is X; a top or bottom edge is the other way round. A corner
// is approaching two boundaries at once and each one's stretch is the other one's compression, so
// the two terms partly cancel and the card scales up gently instead of being pulled square.
export function edgeCardScale(cx, cy, w, h) {
  // Same shape as edgeBand: a pixel figure that a small window is allowed to shrink, never grow.
  const R = Math.min(EDGE.CARD_REACH, Math.min(w, h) * EDGE.CARD_REACH_SHARE);
  // Distance from the nearer edge on each axis, normalised over the reach and eased.
  //
  // CLAMPED AT ZERO, and it has to be: the field overscans by a whole cell on every side and wraps,
  // so a card's centre is routinely OUTSIDE the viewport — 2243 on a 1328-tall screen is an ordinary
  // frame. Unclamped, `size - v` goes negative there, 1 - d/R runs past 1, and the eased term keeps
  // climbing: measured 3.0 on one axis and MINUS 0.39 on the other, which is a card scaled to three
  // times its width and mirrored through itself. Off-screen cards simply sit at full effect.
  const near = (v, size) => {
    const d = Math.max(0, Math.min(v, size - v));
    return d >= R ? 0 : Math.pow(1 - d / R, EDGE.CARD_CURVE);
  };
  const ax = near(cx, w), ay = near(cy, h);
  return [
    1 - EDGE.CARD_COMPRESS * ax + EDGE.CARD_STRETCH * ay,
    1 - EDGE.CARD_COMPRESS * ay + EDGE.CARD_STRETCH * ax,
  ];
}

// The largest offset the field can produce. The encoding is normalised against it and the
// displacement scales are derived from it, so a change to either constant carries into both and
// into nothing else.
const MAX_OFFSET = () => Math.max(EDGE.REFRACT, EDGE.WAVE, 1);

// Quarter resolution. It was half while the map was built from canvas gradient stops, because the
// stops faceted along the steep part of the ramp — per-pixel has no stops, so the ramp is exact at
// every map pixel and resolution now only buys sampling density. Quarter is 4px of screen per map
// pixel on a field whose smallest feature is a 260px sweep, feImage resamples it smoothly, and it
// costs a quarter of the generation, which matters below.
const MAP_SCALE = 4;

// Builds the map for a viewport of w×h. R carries the horizontal offset, G the vertical, 128 is
// "sample where you already are" — feDisplacementMap reads `dx = scale * (R/255 - 0.5)`.
//
// MEMOISED ON THE VIEWPORT, and that is not a micro-optimisation. buildUniverse runs on every
// entrance, resize, filter, folder and delete, and the per-pixel field costs ~22ms at 1732x1328 —
// a visible hitch on the one surface whose whole interaction is a continuous pan. The map depends
// on nothing but the viewport and the constants above, so every one of those rebuilds except an
// actual resize can hand back the same string.
let memo = { w: 0, h: 0, uri: '' };
export function buildEdgeMap(w, h) {
  if (memo.w === w && memo.h === h && memo.uri) return memo.uri;
  const cw = Math.max(8, Math.round(w / MAP_SCALE)), ch = Math.max(8, Math.round(h / MAP_SCALE));
  const c = document.createElement('canvas');
  c.width = cw; c.height = ch;
  const ctx = c.getContext('2d');
  if (!ctx) return '';
  const img = ctx.createImageData(cw, ch), d = img.data;
  const norm = 127 / MAX_OFFSET();
  for (let my = 0; my < ch; my++) {
    for (let mx = 0; mx < cw; mx++) {
      // Asked in SCREEN space, so the field is defined once at the scale the reader sees it and the
      // map's own resolution stays an implementation detail of this loop.
      const o = edgeOffset(mx * MAP_SCALE, my * MAP_SCALE, w, h);
      const i = (my * cw + mx) * 4;
      d[i]     = Math.max(0, Math.min(255, 128 + o[0] * norm));
      d[i + 1] = Math.max(0, Math.min(255, 128 + o[1] * norm));
      d[i + 2] = 0;
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  memo = { w, h, uri: c.toDataURL('image/png') };
  return memo.uri;
}

// WHERE A POINT ON SCREEN IS ACTUALLY LOOKING — the inverse of the bend, for hit testing.
//
// A refracting edge decouples what you SEE from what you CLICK, and that is not a detail: the band
// samples the backdrop up to MAX_OFFSET away, so the pixel under the pointer at the rim can be
// showing a tile the DOM says is hundreds of pixels off. Clicking it opens the tile that is really
// under the pointer — a palette the reader never pointed at. Measured on the seeded field, panning
// through a full cell: 1.85% of points inside the band resolve to a different tile by sight than by
// hit, concentrated in the outer 33px.
//
// TUNING REFRACT DOWN DOES NOT FIX IT, which is why this function exists rather than a smaller
// number. Swept at 44/36/28/20/12 the mismatch goes 1.85/1.53/1.08/0.76/0.43% — it falls roughly
// with the bend and never reaches zero, so buying it off costs the whole effect and still leaves a
// wrong palette opening now and then. Correcting the aim costs one hit test per click.
//
// It reads the SAME edgeOffset the map is drawn from, which is why it followed the effect from a
// 44px bend with no drag at all to a 260px tangential sweep without being touched. That is the
// whole reason the field is a function rather than a formula written out twice.
export function edgeAim(x, y, w, h) {
  const [dx, dy] = edgeOffset(x, y, w, h);
  // Under a pixel of bend there is nothing to correct and no reason to pay for a hit test.
  return (Math.abs(dx) < 1 && Math.abs(dy) < 1) ? null : [x + dx, y + dy];
}

// The displacement scales, wide first. feDisplacementMap's scale spans ±half, so a peak push of
// REFRACT needs a scale of twice it. Red bends furthest and blue least, which is the way round a
// real rim splits: the shorter wavelength is the one that resists.
//
// TWO, NOT THREE, AND THIS IS A FRAME-BUDGET DECISION rather than a stylistic one. The obvious
// graph is one pass per channel — red wide, green middle, blue tight — and it is what was built
// first. Measured on the seeded field at 1732x1328, panning every frame:
//
//     no edge at all .................. 60fps   p95 17.6ms
//     one displacement pass ........... 60fps   p95 17.6ms
//     two displacement passes ......... 59fps   p95 17.6ms
//     three displacement passes ....... 43fps   p95 34.3ms
//
// The third pass is a cliff, not a slope, and it lands on the one surface in the product whose
// whole interaction is a continuous pan. Everything else that looked like a suspect was measured
// and cleared first: the map's resolution changes nothing (866x664 and 108x83 both sit at ~44), a
// trivial url() filter over the same fullscreen box costs 2fps, and splitting the frame into four
// band elements — less total area, four filter instances — is 16fps, which is worse than either.
//
// GREEN IS THE AVERAGE OF THE TWO instead of a pass of its own (see the feColorMatrix pair in
// AppView: .5 of the wide pass plus .5 of the tight one). That puts it back on the middle scale it
// would have had, so the split is the same red-to-blue spread the three-pass graph produced, at two
// thirds of its cost and inside the frame.
export const edgeScales = () => [
  MAX_OFFSET() * 2 * (1 + EDGE.DISPERSE),
  MAX_OFFSET() * 2 * (1 - EDGE.DISPERSE),
];
