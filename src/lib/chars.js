/* CHARACTERS AS A READER COUNTS THEM (24.09.26). A limit on something a person types is a limit on what
   they see: 'é' is one character however it was typed. String.length counts UTF-16 units and Array.from
   counts code points, and the rename counted one way and saved the other (the 24.09.26 audit, R1).
   Whatever counts a name and whatever cuts one both go through here: grapheme clusters by Intl.Segmenter
   (Baseline 2024), code points where it is missing, which never splits a surrogate pair. */
const seg = (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function') ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null;

export function chars(s) {
  const t = String(s == null ? '' : s);
  return seg ? Array.from(seg.segment(t), (x) => x.segment) : Array.from(t);
}
export const charCount = (s) => chars(s).length;
export function cutChars(s, n) {
  const c = chars(s);
  return c.length > n ? c.slice(0, n).join('') : String(s == null ? '' : s);
}
/* Text too long for the room keeps its whole words and loses the rest, not the middle of a word: a word
   that ends exactly at the limit stays. A single word longer than the room keeps as much of itself as
   fits, so a paste of one long word still arrives. The start is kept as it is (a paste's leading space
   matters mid-name); only the end is trimmed. fitWords is the same for a whole name (the readings' clamp). */
export function fitWhole(s, n) {
  const c = chars(s);
  if (c.length <= n) return String(s == null ? '' : s);
  const cut = c.slice(0, n).join('');
  if (/\s/.test(c[n])) return cut.replace(/\s+$/, '');
  const sp = cut.lastIndexOf(' ');
  return (sp > 0 ? cut.slice(0, sp) : cut).replace(/\s+$/, '');
}
export const fitWords = (s, n) => fitWhole(s, n).trim();

/* WHY 32 (24.09.26, asked: "whats the reasoning for 42 characters?"). 42 was never designed. The first
   commit clamped whatever name the live reading returned at 42 (lib/interpret.js) while its prompt asked
   for one to three words; the local reading copied the clamp, and the rename adopted it on the claim that
   42 characters keep a name on one line from 1024 up, which the 24.09.26 audit measured false (they need
   about 790px, and the column held 764).
   Measured instead, in the name's own type (Neue Montreal 500 at 44px, --track-statement), over the eight
   seeds and eight longer names: 20px a character on average, 21.3 at the 90th percentile. The name and its
   field stand on columns 1–7 (AppView NAME_BLOCK), which are 559, 709, 802 and 1082px at 1024, 1280, 1440
   and 1920. 32 characters, about 681px at the 90th percentile, keep a name on one line from 1280 up and on
   two at most at 1024, and hold every seed (the longest, Scorched Clear Morning, is 22) and the longest
   three-word names the reading asks for (Midsummer Afternoon Stillness, 29).
   ONE LIMIT FOR EVERY NAME: both readings clamp to it too, so a name the tool made never opens in the
   field over the limit the field enforces. */
export const NAME_MAX = 32;

/* NO EMOJI IN A NAME (24.09.26, by request: "remove emojis"). A name is set in the display face, which has
   none; an emoji was drawn by the system's colour font at another weight and size, and it reached the file
   names and CSS variables the exports make from the name. Whole clusters go ('👩‍🎨', a flag, a keycap),
   never half of one; ©, ® and ™ are text and stay, unless asked to draw as emoji (U+FE0F). */
const EMOJI = /(?![©®™])\p{Extended_Pictographic}|\p{Regional_Indicator}|[⃣️]/u;
export function noEmoji(s) {
  return chars(s).filter((g) => !EMOJI.test(g)).join('');
}
