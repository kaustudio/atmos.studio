/* THE PALETTE AS A PICTURE (19.09.26, by request: "go with the download image and build a").

   Design A of the share mockups: the palette's proportions as one weight bar, and the swatches under it
   as the metrics list speaks, a hex and its share on hairlines. It is what Download Image in the Share
   dialog saves, 1080 by 1350, the 4:5 portrait Instagram, Dribbble and Slack all show whole.

   WHY A PICTURE AT ALL. A shared link previews as the site's own card: the palette rides in the URL
   fragment, which no link preview ever sees. So the one way to show the colours themselves in a feed
   is to post them as an image.

   ALWAYS THE LIGHT SURFACE. The card is an object that leaves the site, not a view of it, so it does
   not follow the reader's theme: the same palette saves as the same picture whoever presses the row.
   The four greys are the light theme's tokens, written out because a canvas cannot read a variable.

   It draws with the site's own face, which the page has already loaded; fonts.load() waits for the two
   weights first, and system-ui stands in if they never arrive. Everything else is measured, not
   assumed: the name shrinks to fit its line, and the list's rows share the room left above the footer,
   so eight or twelve swatches fit as five do. */

const W = 1080, H = 1350, PAD = 84;
const SURFACE = '#f5f5f3', INK = '#1a1a1a', MUTED = '#63635b', LINE = '#e0e0db';
const FACE = '"Neue Montreal", system-ui, sans-serif';

function roundRectPath(g, x, y, w, h, r) {
  g.beginPath();
  if (g.roundRect) { g.roundRect(x, y, w, h, r); return; }
  g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}

// The share each swatch holds, rounded as the app rounds it everywhere else. A palette whose swatches
// carry no weight gets equal parts and no figures, rather than a column of NaN%.
function shares(swatches) {
  const ws = swatches.map((s) => (typeof s.weight === 'number' && isFinite(s.weight) && s.weight > 0 ? s.weight : NaN));
  const weighted = ws.every((w) => !isNaN(w));
  const total = weighted ? ws.reduce((a, w) => a + w, 0) : swatches.length;
  return swatches.map((s, i) => ({
    hex: String(s.hex || '').toUpperCase(),
    part: (weighted ? ws[i] : 1) / total,
    pct: weighted ? Math.round((ws[i] / total) * 100) + '%' : '',
  }));
}

function fitText(g, text, weight, size, min, maxW) {
  let s = size;
  g.font = weight + ' ' + s + 'px ' + FACE;
  while (s > min && g.measureText(text).width > maxW) { s -= 2; g.font = weight + ' ' + s + 'px ' + FACE; }
  if (g.measureText(text).width <= maxW) return { text, size: s };
  let t = text;
  while (t.length > 1 && g.measureText(t + '…').width > maxW) t = t.slice(0, -1);
  return { text: t.trimEnd() + '…', size: s };
}

export async function renderPaletteCard(pal) {
  try { await Promise.all([document.fonts.load('400 32px "Neue Montreal"'), document.fonts.load('500 104px "Neue Montreal"')]); } catch (e) { }
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const g = canvas.getContext('2d');
  g.fillStyle = SURFACE; g.fillRect(0, 0, W, H);
  g.textBaseline = 'top';

  // The eyebrow and the name, as the dialogs set them: a muted capital label over the title.
  g.fillStyle = MUTED; g.font = '400 26px ' + FACE;
  g.fillText('ATMOS GALLERY', PAD, PAD);
  const name = fitText(g, String(pal.name || 'Untitled'), 500, 104, 56, W - PAD * 2);
  g.fillStyle = INK; g.font = '500 ' + name.size + 'px ' + FACE;
  if ('letterSpacing' in g) g.letterSpacing = (-0.02 * name.size).toFixed(2) + 'px';
  g.fillText(name.text, PAD, PAD + 26 + 18);
  if ('letterSpacing' in g) g.letterSpacing = '0px';

  // The weight bar: every swatch as wide as its share, edges on whole pixels so no seam shows.
  const rows = shares(pal.swatches || []);
  const barTop = PAD + 26 + 18 + 104 + 64, barH = 440, barW = W - PAD * 2;
  g.save(); roundRectPath(g, PAD, barTop, barW, barH, 28); g.clip();
  let x = PAD, acc = 0;
  rows.forEach((r, i) => {
    acc += r.part;
    const next = i === rows.length - 1 ? PAD + barW : PAD + Math.round(acc * barW);
    g.fillStyle = r.hex; g.fillRect(x, barTop, next - x, barH);
    x = next;
  });
  g.restore();

  // The list: a hairline over it and under every row, the rows sharing what is left above the footer.
  const footTop = H - 60 - 26;
  const listTop = barTop + barH + 44;
  const rowH = Math.min(78, Math.floor((footTop - 44 - listTop - 2) / Math.max(1, rows.length)) - 2);
  const text = Math.min(32, Math.round(rowH * 0.41));
  const dot = Math.min(30, Math.round(rowH * 0.38));
  g.fillStyle = LINE; g.fillRect(PAD, listTop, barW, 2);
  rows.forEach((r, i) => {
    const y = listTop + 2 + i * (rowH + 2);
    const mid = y + rowH / 2;
    g.fillStyle = r.hex; roundRectPath(g, PAD, mid - dot / 2, dot, dot, Math.round(dot * 0.27)); g.fill();
    g.strokeStyle = 'rgba(26,26,26,.14)'; g.lineWidth = 2; roundRectPath(g, PAD + 1, mid - dot / 2 + 1, dot - 2, dot - 2, Math.round(dot * 0.27) - 1); g.stroke();
    g.textBaseline = 'middle';
    g.fillStyle = INK; g.font = '400 ' + text + 'px ' + FACE;
    g.fillText(r.hex, PAD + dot + 22, mid);
    if (r.pct) { g.font = '500 ' + text + 'px ' + FACE; g.textAlign = 'right'; g.fillText(r.pct, W - PAD, mid); g.textAlign = 'left'; }
    g.textBaseline = 'top';
    g.fillStyle = LINE; g.fillRect(PAD, y + rowH, barW, 2);
  });

  g.fillStyle = MUTED; g.font = '400 26px ' + FACE;
  g.fillText('atmos.gallery', PAD, footTop);

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
}

// The file's name: the palette's, in the lower-case, hyphenated form a download folder sorts well.
export function paletteCardName(pal) {
  const slug = String(pal && pal.name || 'palette').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return 'atmos-gallery-' + (slug || 'palette') + '.png';
}
