/* WCAG's text-contrast minima, and the phrase that names the one currently selected.
   Two functions, because the number and the words describing it were being written separately and
   drifted: the contrast panel counted pairs at its own threshold while the panel's own opening
   announcement counted them at a hard-coded 4.5, so opening the drawer on AAA said the AA figure.
   A threshold and its name belong to each other; they live here so every surface reads one of each.

   THE FOUR FIGURES ARE TWO SUCCESS CRITERIA, not one table:
     1.4.3 Contrast (Minimum)  — AA  — 4.5:1 normal text, 3:1 large text
     1.4.6 Contrast (Enhanced) — AAA — 7:1   normal text, 4.5:1 large text

   AND 1.4.11 NON-TEXT CONTRAST IS DELIBERATELY NOT IN HERE. It asks 3:1 of user-interface
   components and of graphical objects that carry meaning — the same number AA gives large text, and
   a different criterion about different things. The coincidence is the trap: a pair reported as
   "meets AA for large text" has been measured against a rule about TYPE, and says nothing about
   whether a border, an icon or a chart segment drawn in those two colours would pass. Anything this
   app reports, it reports as text contrast and names the text size it means. If non-text contrast is
   ever surfaced it needs its own control and its own words, not a row folded into these. */
export const CONTRAST_MIN = (aaa, large) => (large ? (aaa ? 4.5 : 3) : (aaa ? 7 : 4.5));

// Sentence-cased for mid-sentence use; the caller supplies any capital. Always names the text size,
// so a reported pass can never be mistaken for a claim about non-text contrast (see above).
export const CRITERION = (level, large) => level + ' contrast for ' + (large ? 'large' : 'normal') + ' text';

/* THE PRINTED RATIO NEVER SITS ON THE WRONG SIDE OF THE THRESHOLD IT WAS JUDGED AGAINST.
   A contrast ratio printed beside a verdict derived from it has one obligation the number alone does
   not: the reader can check it. Measured in the seeded set, one pair breaks that — Midfield's
   #547b95 / #d0d2c6 is 2.9534, which rounds to "3.0", and at AA large text the minimum is 3:1. The
   grading has always been right (it tests the unrounded value, so nothing below a threshold ever
   passes) but the cell showed "3.0 ✕" under "Minimum 3:1" and asked to be believed.

   FLOORING EVERY RATIO WOULD FIX IT AND COST TOO MUCH. It also drags accurate figures down: the
   pair at 10.2952 would print 10.2 rather than 10.3, which is simply less true, on the ~99% of cells
   that are nowhere near a threshold. So the correction is applied only where it is needed — round to
   the nearest tenth, and step DOWN one tick in the single case where rounding up would carry a
   failing pair to or past the line it failed. A passing pair cannot have the opposite problem: every
   threshold here is itself a tenth, so r >= th always rounds to at least th.

   Pass the threshold the verdict was decided on. Called without one this is a plain round, which is
   right for a ratio printed on its own — a "max contrast" column carries no verdict to contradict. */
export const RATIO_TEXT = (r, th) => {
  const shown = Math.round(r * 10) / 10;
  if (th != null && r < th && shown >= th) return (Math.floor(r * 10) / 10).toFixed(1);
  return shown.toFixed(1);
};
