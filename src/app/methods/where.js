import { buildMasks, maskDataUrl, toolRegion } from '../../lib/masks.js';

/* WHERE A COLOUR LIVES, BESIDE THE TILES (23.09.26, by request, from Adobe Color's handles on the image).
   How it Works has shown it since the story was built — "Select a colour to find it in the photograph"
   — and the tool never did: the photograph sat beside the name and said nothing about the five colours
   above it. Now pointing at a tile, or moving focus into one, dims the photograph to How it Works' own
   grey and lights the parts of it that colour came from, on the create page and in the Full Swatch View.

   THE MASKS ARE THE STORY'S, not a second opinion: buildMasks (lib/masks.js) classifies the picture back
   onto the palette with the extractor's own OKLab metric, at 256px on the long edge — low single-digit
   milliseconds, done once per palette and photograph on idle after the photograph loads, and kept.

   NO STATE. A hover would otherwise re-render the whole tool; the lighting is two attributes and a mask
   URL written straight onto the photograph's layers, which React renders once and never touches again.
   Touch is left out: a tap on a tile is a copy, and a light that came and went with it would be noise. */
const MAX_CACHED = 24;

export const whereMethods = {
  // The masks for one palette's photograph, or null when there are none to be had (see masks.js).
  _whereMasks(p, img) {
    if (!p || !img || !img.complete || !img.naturalWidth) return null;
    const key = p.id + '|' + (img.currentSrc || img.src);
    this._whereCache = this._whereCache || new Map();
    if (this._whereCache.has(key)) return this._whereCache.get(key);
    const built = buildMasks(img, p.swatches);
    // Every colour answers here, where the story's rule would leave some out (toolRegion, masks.js).
    const urls = built ? built.urls.map((u, s) => {
      if (u) return u;
      const ids = toolRegion(built.map, s, p.swatches);
      return ids ? maskDataUrl(built.map, ids.length === 1 ? ids[0] : ids) : null;
    }) : null;
    this._whereCache.set(key, urls);
    if (this._whereCache.size > MAX_CACHED) this._whereCache.delete(this._whereCache.keys().next().value);
    return urls;
  },
  // Build them while nothing else is happening, so the first point at a tile is answered at once.
  _wherePrime(p, img) {
    const run = () => { try { this._whereMasks(p, img); } catch (e) { } };
    if (window.requestIdleCallback) window.requestIdleCallback(run, { timeout: 1500 }); else setTimeout(run, 200);
  },
  // Light the colour of the tile `el` in the photograph beside it; `p` is the palette the tiles show.
  _whereOn(el, p) {
    const scope = el && el.closest('[data-where-scope]');
    const box = scope && scope.querySelector('[data-where]');
    const img = box && box.querySelector('[data-where-base]');
    const urls = this._whereMasks(p, img);
    if (!urls) return;
    const k = p.swatches.findIndex((s) => String(s.sid) === el.getAttribute('data-sid'));
    const url = k >= 0 ? urls[k] : null;
    box.querySelectorAll('[data-where-sid]').forEach((layer) => {
      const on = !!url && layer.getAttribute('data-where-sid') === String(k);
      if (on && !layer.style.maskImage) { layer.style.webkitMaskImage = 'url(' + url + ')'; layer.style.maskImage = 'url(' + url + ')'; }
      layer.toggleAttribute('data-on', on);
    });
    // Only a colour no pixel classifies to lights nothing now, and the photograph stays as it is. One
    // spread thin lights its specks, and a colour twice lights the region the two share (toolRegion).
    box.toggleAttribute('data-lit', !!url);
  },
  _whereOff(el) {
    const scope = el && el.closest('[data-where-scope]');
    const box = scope && scope.querySelector('[data-where]');
    if (!box) return;
    box.removeAttribute('data-lit');
    box.querySelectorAll('[data-where-sid][data-on]').forEach((layer) => layer.removeAttribute('data-on'));
  },
  // The four handlers a tile carries, for the palette it belongs to.
  whereHandlers(p) {
    return {
      onPointerEnter: (e) => { if (e.pointerType !== 'touch') this._whereOn(e.currentTarget, p); },
      onPointerLeave: (e) => { if (e.pointerType !== 'touch') this._whereOff(e.currentTarget); },
      onFocus: (e) => this._whereOn(e.currentTarget, p),
      onBlur: (e) => { if (!e.currentTarget.contains(e.relatedTarget)) this._whereOff(e.currentTarget); },
    };
  },
};
