// Shareable palette links.
//
// The palette travels in the URL FRAGMENT (#p=…). That choice is the whole privacy story: browsers
// never transmit the fragment to a server — it is not in the request line, not in the Referer header,
// not in any access log. A shared palette therefore moves from one person to another without ever
// touching infrastructure we'd have to promise things about. It is the only growth mechanism a
// server-free architecture can honestly have.
//
// THE LINK IS THE NAME AND THE COLOURS (24.09.26, by request: "we need shorter links", the shorter of
// the two options offered). "#p=Alien_Meridian~48421d0u8c91570p…": the name as people read it, then
// each colour as its six hex digits and its share of the frame in two base-36 digits (0–100 is "00" to
// "2s"). About 80 to 100 characters, where the base64 JSON before it, which also carried the reading's
// sentence, ran to about 400. The sentence stays behind: the recipient writes one from the colours with
// the offline reading (methods/share.js, composeReading), the words atmos uses whenever the live reading
// can't be reached. Links made before this (base64 JSON, with or without the day's name label) still
// open.
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

// Far beyond any link this app writes (about 100 characters) and any it wrote before (about 400), far
// short of anything a browser or a chat client will carry. Anything larger is not a palette we produced.
const MAX_FRAGMENT = 4000;

const MAX_SWATCHES = 12;
const MAX_NAME = 42;
const MAX_DESCRIPTORS = 4;
const MAX_RATIONALE = 240;

// ---- the compact link ---------------------------------------------------------------------------
// The name, readable: letters, digits, '-' and '.' as they are, a space as '_', everything else escaped
// (a literal '_' or '~' too, so both stay unambiguous). Cut by code point, so a surrogate pair is never
// split into something encodeURIComponent refuses.
function nameToLink(name) {
  const n = Array.from(String(name || '').trim()).slice(0, MAX_NAME).join('');
  return encodeURIComponent(n)
    .replace(/[!*'()~_]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase())
    .replace(/%20/g, '_');
}
function nameFromLink(t) {
  try { return decodeURIComponent(String(t).replace(/_/g, '%20')); } catch (e) { return ''; }
}
// [6 hex][2 base-36 digits of whole percent] per swatch, up to twelve. L/a/b are recomputed from the hex
// on the way back in, so shipping them would only be a chance for the two to disagree.
function packColours(swatches) {
  return swatches.slice(0, MAX_SWATCHES).map((sw) => {
    const hex = String(sw.hex || '').replace(/^#/, '').toLowerCase();
    if (!/^[0-9a-f]{6}$/.test(hex)) return '';
    return hex + Math.round(Math.max(0, Math.min(1, Number(sw.weight) || 0)) * 100).toString(36).padStart(2, '0');
  }).join('');
}

// Full URL for the current document, fragment replaced. Origin/path come from the browser, never
// from the palette, so a share link can only ever point at this app.
// Only what a reader needs: what the palette is called and its colours with their shares. Deliberately
// NOT the reference image (it would dwarf the URL, and it is the one piece of a palette that is personal:
// someone sharing a palette is not necessarily sharing the photo it came from).
export function shareUrl(pal, loc) {
  if (!pal || !Array.isArray(pal.swatches) || !pal.swatches.length) return null;
  const colours = packColours(pal.swatches);
  if (!colours) return null;
  const l = loc || (typeof window !== 'undefined' ? window.location : null);
  if (!l) return null;
  // Always the front page, never the /create the sender is on: a recipient is not using the tool,
  // and a link that pointed there would count every opened share as a visit to it.
  // AND NEVER THE SENDER'S QUERY STRING (24.09.26). It rode along from the first version, with no reason
  // recorded, so a link inherited whatever the sender arrived with (a campaign's utm tags, an ad's click
  // id) and every recipient's visit was credited to it.
  return l.origin + '/#' + HASH_KEY + '=' + nameToLink(pal.name) + '~' + colours;
}

/* A palette's code, as a compact link would carry it: the name and the colours with their shares,
   packed. Two palettes with the same code are the same palette as far as a link can tell, which is how
   a link that names a palette already in this Library opens that palette (PaletteApp componentDidMount,
   methods/share.js _ownCopy). Computed from decoded values on both sides, so a messenger that
   unescaped part of a link does not make it a stranger. */
export function paletteCode(pal) {
  if (!pal || !Array.isArray(pal.swatches) || !pal.swatches.length) return null;
  return nameToLink(pal.name) + '~' + packColours(pal.swatches);
}

// ---- base64url over UTF-8, for links made before the compact one -------------------------------
// TextDecoder rather than unescape: names and rationales carry em-dashes and curly quotes, and the
// legacy pair mangles anything outside latin-1.
function b64urlDecode(s) {
  let t = String(s).replace(/-/g, '+').replace(/_/g, '/');
  while (t.length % 4) t += '=';
  const bin = atob(t);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

// ---- decode (UNTRUSTED) -------------------------------------------------------------------------
/* A SHARE OF 0 IS A SHARE UNDER HALF A PERCENT (25.09.26, from the share audit). A link carries each
   colour's share in whole percents (both formats), so a colour holding 0.4% of the frame travels as 0,
   and the recipient's page, reading 0 as nothing, printed "0%" where the sender's says "<1%". A
   palette's colour always holds some of the frame, so a 0 can only mean under half a percent, and it
   arrives as 0.4%: the page then says "<1%" as the sender's does (renderVals sharePct), and the
   palette's code is unchanged (it packs back to 0). */
const UNDER_HALF = 0.004;
function shareFromWire(pct) {
  if (!Number.isFinite(pct)) return 0.2;
  return pct <= 0 ? UNDER_HALF : Math.min(100, pct) / 100;
}
// The code a fragment carries, or null: the palette itself, without the name label. Two links to one
// palette have the same code whatever their labels say, which is how the app knows a link names the
// palette already on screen (PaletteApp _hashMoved). Never throws.
export function shareCode(hash) {
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

  // THE COMPACT LINK: name~colours. A '~' never occurs in the older base64 code or in its label. The
  // name is part of its code: it is the palette's own, not a label beside it.
  const tilde = code.lastIndexOf('~');
  if (tilde >= 0) {
    // Case-blind, should anything along the way have upper-cased the link.
    const colours = code.slice(tilde + 1).toLowerCase();
    if (!/^(?:[0-9a-f]{6}[0-9a-z]{2}){1,12}$/.test(colours)) return null;
    return code.slice(0, tilde) + '~' + colours;
  }

  // A LINK FROM BEFORE: base64 JSON, perhaps behind the name label it carried for a day ("cobalt.eyJ…"),
  // which is set aside unread. base64url has no '.', so everything after the last one is the code.
  const dot = code.lastIndexOf('.');
  if (dot >= 0) code = code.slice(dot + 1);
  // base64url alphabet only — reject before handing anything to atob
  return /^[A-Za-z0-9\-_]+$/.test(code) ? code : null;
}

// Returns a palette-SHAPED plain object, or null. Never throws. The caller must still pass the
// result through validateFeed before it reaches state — this function establishes shape and bounds,
// validateFeed establishes colour validity.
export function decodeShare(hash) {
  const code = shareCode(hash);
  if (!code) return null;

  const tilde = code.lastIndexOf('~');
  if (tilde >= 0) {
    const swatches = code.slice(tilde + 1).match(/.{8}/g).map((x) => {
      const pct = parseInt(x.slice(6), 36);
      return { hex: '#' + x.slice(0, 6), weight: shareFromWire(pct) };
    });
    const name = Array.from(nameFromLink(code.slice(0, tilde)).trim()).slice(0, MAX_NAME).join('');
    return { name: name || 'Shared palette', descriptors: [], rationale: '', archetype: 'shared', imageUrl: null, swatches };
  }

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
    swatches.push({ hex: '#' + hex, weight: shareFromWire(pct) });
  }
  if (!swatches.length) return null;

  const descriptors = (Array.isArray(obj.d) ? obj.d : [])
    .filter((x) => typeof x === 'string' && x.trim())
    .map((x) => x.trim().slice(0, 24))
    .slice(0, MAX_DESCRIPTORS);

  return {
    // no id/time from the wire — the receiving app mints those if the palette is ever saved
    name: (typeof obj.n === 'string' && obj.n.trim() ? obj.n.trim() : 'Shared palette').slice(0, MAX_NAME),
    descriptors: [],   // `d` from the wire is never shown: the tags are recomputed from the swatches
    rationale: (typeof obj.r === 'string' ? obj.r.trim() : '').slice(0, MAX_RATIONALE),
    archetype: 'shared',
    // A shared palette carries no reference image by construction. Pinning this to null (rather than
    // passing anything through from the wire) means a hostile link has no route to an <img src> at
    // all — the imageUrl sanitiser never even has to be the thing that saves us.
    imageUrl: null,
    swatches,
  };
}
