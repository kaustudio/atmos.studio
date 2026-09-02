// The universe card's box, in ONE place.
//
// It used to be two: renderVals built the card at 300×372 and universe.js laid the field out on a
// 300×372 cell, as bare literals in files that never see each other. They agreed only because
// nobody had changed one — and the first change that needed the card taller would have moved the
// card without moving the cell it sits in, or the reverse.
//
// THE CARD IS THE PHOTOGRAPH AND ITS NAME. A square of image over a caption band:
//     H = W + CAP = 300 + 44 = 344
// The strip, the identity block and the eight metric rows that used to stack under a 150px hero
// (and took the box to 463, a figure that had been wrong once already) have moved into the panel
// that slides out beside the card when it is pressed — universe.js openTile, AppView's
// UniversePanel. The field shows what was read; the panel shows what was read from it, on demand.
//
// The panel is NOT sized from this token. It is the card's open size, taken from the viewport on
// every open: min(0.7 × the short side, (0.9 × the long side − the pair gap) / 2), so the card and
// its panel together never leave the screen, and the panel's content scrolls inside its box rather
// than growing the box. See openTile for the arithmetic, and UNIVERSE_OPEN below for the shares.
//
// CAP is the caption's height, and the hero's foot is derived from it (heroWrapStyle's `bottom`),
// which is what the open tween moves to 0 so the photograph takes the whole box while the caption
// fades. Change the caption's type and this is the number to revisit: a 15px name sits centred in
// 44 with the same air the metrics keep at their sides.
export const UNIVERSE_TILE = { W: 300, H: 344, CAP: 44 };

// The metrics block's inset — the caption's side padding, and the panel body's. One figure, so the
// name on the closed card and the name at the head of the open panel start on the same x.
export const UNIVERSE_TILE_INSET = 14;

// The open state's shares of the viewport (the reference's own three: lightboxSize,
// lightboxSizePortrait, lightboxPairMax). No gap between the card and its panel, by request: the
// panel slides out from under the picture and stops flush against it, the two borders landing on
// one pixel, so the pair reads as one object with a rule through it. (It was 16 for a day.)
export const UNIVERSE_OPEN = { share: 0.7, sharePortrait: 0.8, pairMax: 0.9, gap: 0, dim: 0.4 };
