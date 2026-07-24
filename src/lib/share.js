// Shareable palette links.
//
// The palette travels in the URL FRAGMENT (#p=…). That choice is the whole privacy story: browsers
// never transmit the fragment to a server — it is not in the request line, not in the Referer header,
// not in any access log. A shared palette therefore moves from one person to another without ever
// touching infrastructure we'd have to promise things about. It is the only growth mechanism a
// server-free architecture can honestly have.
//
// Everything arriving through decodeShare() is UNTRUSTED input from a stranger's URL. Same discipline
// as the imported project file: parse with JSON.parse (never eval, never Function), validate every
// field's type, clamp every string, drop anything unrecognised, and cap the payload so a hostile link
// can't hand us an unbounded string to chew on. The caller then puts the result through validateFeed,
// which is the same gate persisted and imported palettes pass — including the hex regex.
//
// Pure: no DOM, no app state, no network.

const VERSION = 1;
export const HASH_KEY = 'p';

// Enough for a palette with a long name and a full rationale, far short of anything a browser or a
// chat client will carry. Anything larger is not a palette we produced.
const MAX_FRAGMENT = 4000;

const MAX_SWATCHES = 12;
const MAX_NAME = 42;
const MAX_DESCRIPTORS = 4;
const MAX_RATIONALE = 240;

// ---- base64url over UTF-8 ---------------------------------------------------------------------
// TextEncoder/TextDecoder rather than escape/unescape: names and rationales carry em-dashes and
// curly quotes, and the legacy pair mangles anything outside latin-1.
function b64urlEncode(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(s) {
  let t = String(s).replace(/-/g, '+').replace(/_/g, '/');
  while (t.length % 4) t += '=';
  const bin = atob(t);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

// ---- encode -----------------------------------------------------------------------------------
// Only what a reader needs: the colours, what it is called, and how it was read. Deliberately NOT
// the reference image (it would dwarf the URL, and it is the one piece of the palette that is
// personal — someone sharing a palette is not necessarily sharing the photo it came from).
export function encodeShare(pal) {
  if (!pal || !Array.isArray(pal.swatches) || !pal.swatches.length) return null;
  const payload = {
    v: VERSION,
    n: String(pal.name || '').slice(0, MAX_NAME),
    d: (Array.isArray(pal.descriptors) ? pal.descriptors : []).filter((x) => typeof x === 'string').slice(0, MAX_DESCRIPTORS),
    r: String(pal.rationale || '').slice(0, MAX_RATIONALE),
    // [hex-without-hash, weight as whole percent] — L/a/b are recomputed from the hex on the way
    // back in, so shipping them would only be a chance for the two to disagree.
    s: pal.swatches.slice(0, MAX_SWATCHES).map((sw) => [
      String(sw.hex || '').replace(/^#/, '').toLowerCase(),
      Math.round(Math.max(0, Math.min(1, Number(sw.weight) || 0)) * 100),
    ]),
  };
  try { return b64urlEncode(JSON.stringify(payload)); } catch (e) { return null; }
}

// Full URL for the current document, fragment replaced. Origin/path come from the browser, never
// from the palette, so a share link can only ever point at this app.
export function shareUrl(pal, loc) {
  const code = encodeShare(pal);
  if (!code) return null;
  const l = loc || (typeof window !== 'undefined' ? window.location : null);
  if (!l) return null;
  return l.origin + l.pathname + l.search + '#' + HASH_KEY + '=' + code;
}

// ---- decode (UNTRUSTED) -------------------------------------------------------------------------
// Returns a palette-SHAPED plain object, or null. Never throws. The caller must still pass the
// result through validateFeed before it reaches state — this function establishes shape and bounds,
// validateFeed establishes colour validity.
export function decodeShare(hash) {
  if (typeof hash !== 'string' || !hash) return null;
  const raw = hash.charAt(0) === '#' ? hash.slice(1) : hash;
  if (raw.length > MAX_FRAGMENT) return null;

  // find our key among any other fragment params, without a URL parser that might normalise things
  let code = null;
  raw.split('&').forEach((part) => {
    const eq = part.indexOf('=');
    if (eq > 0 && part.slice(0, eq) === HASH_KEY) code = part.slice(eq + 1);
  });
  if (!code) return null;
  // base64url alphabet only — reject before handing anything to atob
  if (!/^[A-Za-z0-9\-_]+$/.test(code)) return null;

  let obj;
  try { obj = JSON.parse(b64urlDecode(code)); } catch (e) { return null; }
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return null;
  if (obj.v !== VERSION) return null;                       // written by a build we don't know — don't guess
  if (!Array.isArray(obj.s) || !obj.s.length) return null;

  const swatches = [];
  for (const entry of obj.s.slice(0, MAX_SWATCHES)) {
    if (!Array.isArray(entry)) continue;
    const hex = typeof entry[0] === 'string' ? entry[0].trim().toLowerCase() : '';
    // the hex regex is re-applied by validateFeed; this is the early reject
    if (!/^[0-9a-f]{6}$/.test(hex)) continue;
    const pct = Number(entry[1]);
    swatches.push({ hex: '#' + hex, weight: Number.isFinite(pct) ? Math.max(0, Math.min(100, pct)) / 100 : 0.2 });
  }
  if (!swatches.length) return null;

  const descriptors = (Array.isArray(obj.d) ? obj.d : [])
    .filter((x) => typeof x === 'string' && x.trim())
    .map((x) => x.trim().slice(0, 24))
    .slice(0, MAX_DESCRIPTORS);

  return {
    // no id/time from the wire — the receiving app mints those if the palette is ever saved
    name: (typeof obj.n === 'string' && obj.n.trim() ? obj.n.trim() : 'Shared palette').slice(0, MAX_NAME),
    descriptors: descriptors.length ? descriptors : ['Shared'],
    rationale: (typeof obj.r === 'string' ? obj.r.trim() : '').slice(0, MAX_RATIONALE),
    archetype: 'shared',
    // A shared palette carries no reference image by construction. Pinning this to null (rather than
    // passing anything through from the wire) means a hostile link has no route to an <img src> at
    // all — the imageUrl sanitiser never even has to be the thing that saves us.
    imageUrl: null,
    swatches,
  };
}
