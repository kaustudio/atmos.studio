// The universe card's box, in ONE place.
//
// It used to be two: renderVals built the card at 300×372 and universe.js laid the field out on a
// 300×372 cell, as bare literals in files that never see each other. They agreed only because
// nobody had changed one — and the first change that needed the card taller would have moved the
// card without moving the cell it sits in, or the reverse.
//
// THE CARD IS THE PHOTOGRAPH AND ITS NAME. The box is a square plus a caption's height:
//     H = W + CAP = 300 + 44 = 344
// Since 17.09.26 (radius issue R3) the photograph fills the whole box and the name sits on its foot,
// in the bottom CAP of it, over a blur and a tint (AppView TILE_FADE).
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
// CAP is the caption's height: the band the name is centred in. The open tween fades the caption
// and the blur under it; nothing else in the card moves (the hero's foot was CAP until 17.09.26).
export const UNIVERSE_TILE = { W: 300, H: 344, CAP: 44 };

// The metrics block's inset — the caption's side padding, and the panel body's. One figure, so the
// name on the closed card and the name at the head of the open panel start on the same x.
// Not in a landscape open since 23.09.26: there the panel's content stands on the page's columns and
// its inset is the gutter (--upanel-inset, universe.js openTile). A portrait open keeps this.
export const UNIVERSE_TILE_INSET = 14;

// The open state's shares of the viewport (the reference's own three: lightboxSize,
// lightboxSizePortrait, lightboxPairMax). No gap between the card and its panel, by request: the
// panel slides out from under the picture and stops flush against it, so the pair reads as one
// object. (It was 16 for a day.) Its leading hairline lands under the picture's last column, since
// the card lost its own stroke (17.09.26).
// gridShare (23.09.26): in landscape the open pair is set on the page's columns instead of these
// shares (universe.js _uOpenGrid), and this is the most of the window's height its photograph may
// take. It is looser than `share` because a column count only steps down: at 0.7 a 1920 × 1080 window
// lost a column and the card a fifth of its size, where 0.75 keeps five columns on every 16:10 and
// 16:9 screen and the card within 12% of the size it had.
export const UNIVERSE_OPEN = { share: 0.7, sharePortrait: 0.8, pairMax: 0.9, gap: 0, dim: 0.4, gridShare: 0.75 };
