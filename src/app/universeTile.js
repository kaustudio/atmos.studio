// The universe card's box, in ONE place.
//
// It used to be two: renderVals built the card at 300×372 and universe.js laid the field out on a
// 300×372 cell, as bare literals in files that never see each other. They agreed only because
// nobody had changed one — and the first change that needed the card taller would have moved the
// card without moving the cell it sits in, or the reverse.
//
// HEIGHT is not a round number, and shouldn't be: it is the card's content plus the frame the
// content sits in. The pbase panel starts 16px up into the hero, then stacks the colour strip, the
// identity block and the four metric rows; the card is that plus a 14px foot — the SAME inset the
// metrics keep on their left and right, so the readout sits in an even frame instead of running out
// of the bottom edge the way it did when the height was picked first and the content made to fit.
//
// THE ARITHMETIC, WRITTEN DOWN, because this number has now been wrong once:
//     H = 150 (hero) - 16 (the pbase panel's overlap into it) + pbase + 14 (foot)
//       = pbase + 148
// 389 was that sum when the metric labels were 8px and their values 10px, giving pbase 241. Raising
// them to 11 and 13 (see --fs-fine) took pbase to 277 and the content to 411, inside a box still
// declared at 389 — and the wrapper is overflow:hidden, so the bottom 24px of every card, the last
// metric row among them, was simply cut. Measured that way before this line changed.
// A card whose type changes has to come back here. Read pbase off the live card
// (`[data-pbase]`.getBoundingClientRect().height) and add 148.
// Measured with the strip at its declared 46: 46 (strip) + 63 (identity) + 206 (metrics) = 315 of
// content, at pbase's top of 134, plus the 14 foot = 463.
// The metrics term moved 198 -> 206 when the label/value gap inside each pair went 2px -> 4px:
// four rows, two pixels each. Any change to that gap, to the row gap, or to the type lands here.
export const UNIVERSE_TILE = { W: 300, H: 463 };

// The metrics block's inset. Exported alongside the box because the foot above is derived from it —
// change one and the other has to follow, which is only obvious if they live together.
export const UNIVERSE_TILE_INSET = 14;
