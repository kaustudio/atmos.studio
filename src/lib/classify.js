// THE TWO CLASSIFICATIONS EVERY PALETTE CARRIES, and the one place they are computed.
//
// Temperature (Warm / Cool / Neutral) and Lightness (Dark / Balanced / Light) were the Manage
// Library filter's measured facets, computed inside paletteMetrics. They are now also the palette's
// TAGS — the chips on the result, the detail overlay, the archive card, the phone story and every
// accessible description — so a palette's tags and the filter groups it appears under can never
// disagree: both read these two functions, from the swatches, at every render. Nothing is stored,
// nothing is migrated, and identical swatch data yields identical tags on every surface and in every
// archive, however old.
//
// The thresholds are paletteMetrics' own, moved rather than changed: temperature is the mean OKLab
// (a + b) against ±0.008, lightness the area-weighted mean L against 0.42 and 0.68. Moving a cut
// here moves it for the filter and the tags together, which is the point.
//
// ORDER IS FIXED: temperature first, lightness second, everywhere.

export const TEMP_LABEL = { warm: 'Warm', cool: 'Cool', neutral: 'Neutral' };
export const LIGHT_LABEL = { dark: 'Dark', balanced: 'Balanced', light: 'Light' };

const usable = (swatches) => (swatches || []).filter((s) => s && typeof s.L === 'number' && typeof s.a === 'number' && typeof s.b === 'number');

// 'warm' | 'cool' | 'neutral' — the facet id the filter stores in activeTemp.
export function temperatureBand(swatches) {
  const sw = usable(swatches);
  if (!sw.length) return 'neutral';
  const n = sw.length;
  const avgA = sw.reduce((s, x) => s + x.a, 0) / n, avgB = sw.reduce((s, x) => s + x.b, 0) / n;
  const t = avgA + avgB;
  return t > 0.008 ? 'warm' : t < -0.008 ? 'cool' : 'neutral';
}

// 'dark' | 'balanced' | 'light' — the facet id the filter stores in activeLight. Three buckets, not
// the reading engine's five: a filter is a way of narrowing a shelf. Mean weighted by area, so a
// palette is dark when most of its SURFACE is dark rather than when it merely contains something dark.
export function lightnessBand(swatches) {
  const sw = usable(swatches);
  if (!sw.length) return 'balanced';
  const t = sw.reduce((a, x) => a + (x.weight || 0), 0) || 1;
  const m = sw.reduce((a, x) => a + x.L * ((x.weight || 0) / t), 0);
  return m < 0.42 ? 'dark' : m > 0.68 ? 'light' : 'balanced';
}

// The two facet ids, in tag order.
export function paletteBands(swatches) {
  return { temp: temperatureBand(swatches), light: lightnessBand(swatches) };
}

// The two tags, in tag order, as shown: ['Warm', 'Dark'].
export function paletteTags(swatches) {
  const b = paletteBands(swatches);
  return [TEMP_LABEL[b.temp], LIGHT_LABEL[b.light]];
}
