// Content addressing and seeded pseudo-randomness — one implementation of each, so a second copy
// cannot drift away from the first.
//
// Why the image is hashed as DECODED PIXELS and not as file bytes: the same photograph re-saved,
// renamed, or stripped of EXIF is the same picture, and a user who uploads it again means the same
// thing by it. File-byte hashing answers "is this the same file", which is not the question the
// tool is asking. Hashing the normalised working buffer answers "is this the same image".
//
// Measured limits, so nobody has to rediscover them:
//   • Rename, metadata strip, lossless re-save, and a change of container all hash IDENTICALLY.
//     Verified across PNG (14083 B) and lossless WebP (3608 B) of the same picture — wildly
//     different byte streams, same hash.
//   • A LOSSY re-encode (JPEG at a different quality) shifts pixel values and so hashes
//     differently. Measured: #1d1b17 became #1c1b17 through a quality-0.92 round trip.
//   • A DIFFERENT SOURCE RESOLUTION hashes differently. Downscaling 640px and 320px versions of
//     one picture to 72x72 does not converge, because the resampling has different input to work
//     from. Identity here means "the same pixels", not "the same photograph".
// None of these is a defect in the hash: no content hash can call two different pixel buffers
// equal without also calling two different images equal. They are stated because the recognition
// feature in Step C inherits them, and a user re-uploading a resized export will not be recognised.

// FNV-1a. Small, fast, no dependencies, and already the idiom this codebase uses for paletteSeed.
function fnv1a(bytes, basis, prime) {
  let h = basis >>> 0;
  for (let i = 0; i < bytes.length; i++) { h ^= bytes[i]; h = Math.imul(h, prime) >>> 0; }
  return h >>> 0;
}

// Two 32-bit streams concatenated into 64 bits of address space. The second stream walks the buffer
// BACKWARDS with a different prime: running the same algorithm twice with only a different starting
// basis would leave the two halves correlated, which buys far fewer than the 64 bits it appears to.
// Reversal decorrelates the order dependence, a distinct prime the mixing.
// At 64 bits a personal archive is nowhere near the birthday bound; this is identity, not security.
export function hashBytes(bytes) {
  const fwd = fnv1a(bytes, 2166136261, 16777619);
  let rev = 2166136261 >>> 0;
  for (let i = bytes.length - 1; i >= 0; i--) { rev ^= bytes[i]; rev = Math.imul(rev, 2654435761) >>> 0; }
  return fwd.toString(16).padStart(8, '0') + (rev >>> 0).toString(16).padStart(8, '0');
}

// mulberry32 — tiny, fast, well-distributed. Same seed ⇒ same sequence.
// Lives here rather than in reading.js because the extraction side needs the same guarantee, and
// two hand-copied PRNGs are two things that can quietly stop matching.
export function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A hex content hash as a 32-bit integer, for anything that needs a numeric seed from it.
export function seedFromHash(h) {
  let x = 2166136261 >>> 0;
  const s = String(h || '');
  for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619) >>> 0; }
  return x >>> 0;
}
