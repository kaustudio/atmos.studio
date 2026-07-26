// The universe card's box, in ONE place.
//
// It used to be two: renderVals built the card at 300×372 and universe.js laid the field out on a
// 300×372 cell, as bare literals in files that never see each other. They agreed only because
// nobody had changed one — and the first change that needed the card taller would have moved the
// card without moving the cell it sits in, or the reverse.
//
// HEIGHT is not a round number, and shouldn't be: it is the card's content plus the frame the
// content sits in. The pbase panel starts 16px up into the hero, then stacks the colour strip, the
// identity block and the four metric rows; that comes to 375px, and the card is that plus a 14px
// foot — the SAME inset the metrics keep on their left and right, so the readout sits in an even
// frame instead of running out of the bottom edge the way it did when the height was picked first
// and the content made to fit.
export const UNIVERSE_TILE = { W: 300, H: 389 };

// The metrics block's inset. Exported alongside the box because the foot above is derived from it —
// change one and the other has to follow, which is only obvious if they live together.
export const UNIVERSE_TILE_INSET = 14;
