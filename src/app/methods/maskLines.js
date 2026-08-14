/* MASKED LINES — one mask per VISUAL line, shared.

   This was written inside pageReveal.js for the legal documents and lifted out unchanged the moment
   a second surface needed it. That file says why in its own words: "Two copies of them is how the
   second page ends up subtly different from the first for reasons nobody can find." There is one
   copy — pageReveal uses it for a page's arrival, aboutPills for a pill's disclosure.

   It is pure DOM: hand it an element, get back its visual lines wrapped in .reveal-mask/.reveal-line
   pairs and a restore() that puts the original markup back verbatim. It knows nothing about GSAP,
   about scroll, or about who is going to animate the lines it returns.

   One mask per VISUAL line, which is the whole difference between this reading as the same gesture
   as the headings and reading as something else.

   Every masked element used to get exactly one mask wrapped around all of its contents. On a
   single-line heading that is a true mask reveal. On the hero's three-line summary it was a slab:
   three lines travelling together inside one three-line window, arriving as a block rather than as
   lines. And body copy got no mask at all — it faded. So the page had three different vocabularies
   for what should have been one.

   THE BROWSER DECIDES WHERE THE LINES ARE. Every word becomes an inline span, the layout engine
   breaks them exactly where it would have broken the original text, and the spans are then grouped
   by the offsetTop they actually landed on. Counting characters or guessing at a measure would be
   wrong at the first different viewport, font size or webfont swap.

   INLINE MARKUP SURVIVES because the regrouping is done with a Range: extractContents() splits any
   partially covered <strong>, <code> or <a> and reproduces it on both sides of the break, which is
   precisely what a line break running through a bold phrase needs. The ranges are applied last to
   first so that the surgery never invalidates a range that has not been used yet.

   AND IT IS TEMPORARY. restore() puts the original markup back verbatim the moment the reveal
   finishes, so a paragraph spends all but ~0.9s of its life as ordinary reflowing text: nothing to
   re-measure when the window is resized, no split spans in the accessibility tree, and selection
   and copy behave exactly as they did before anything was animated. It is also why splitting is
   done at reveal time rather than at arm time — 28 paragraphs' worth of word spans should not sit
   in the document waiting to be scrolled to. */

function wrapWords(node) {
  [].slice.call(node.childNodes).forEach(function (n) {
    if (n.nodeType === 3) {
      if (!n.textContent.trim()) return;
      var frag = document.createDocumentFragment();
      n.textContent.split(/(\s+)/).forEach(function (part) {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
        var s = document.createElement('span');
        s.setAttribute('data-w', '');
        s.textContent = part;
        frag.appendChild(s);
      });
      n.parentNode.replaceChild(frag, n);
    } else if (n.nodeType === 1 && n.tagName !== 'BR') {
      wrapWords(n);
    }
  });
}

/* → { lines: [.reveal-line…], restore } or null when there is nothing to split.

   THE BOX MUST NOT MOVE. Turning a paragraph's inline content into a stack of block-level line
   masks is a layout change, and three separate things made the rebuilt block taller than the text
   it replaced — visibly so, with copy pushed out of its container:

     · <br> survives BETWEEN the masks. Inline content sitting between two block boxes generates
       its own anonymous line box, so the six-line address grew by five whole lines (+126px).
     · An inline element with its own box metrics — <code> here — reports a different offsetTop
       from the words either side of it, so a 1px grouping tolerance read one visual line as two.
       A two-line paragraph became four masks (+99px).
     · The mask's padding-bottom/negative-margin pair, which exists to stop descenders being
       clipped, does not cancel on the LAST mask: its negative bottom margin collapses out through
       the parent instead of pulling the parent's floor up (+2-3px on every block).

   Each is fixed at its cause below, and then the element's measured height is pinned for the life
   of the split as a backstop — so any future inline construction that shifts the internal layout
   still cannot resize the box the reader sees. */
export function splitLines(el) {
  if (!el || !el.isConnected) return null;
  var original = el.innerHTML;
  var prevHeight = el.style.height;
  try {
    var box = el.getBoundingClientRect().height;
    // Half a line: comfortably more than any inline element's vertical jitter, comfortably less
    // than the gap to the next line.
    var tol = Math.max(4, (parseFloat(getComputedStyle(el).lineHeight) || 16) * 0.5);

    wrapWords(el);
    var words = [].slice.call(el.querySelectorAll('[data-w]'));
    if (!words.length) { el.innerHTML = original; return null; }

    // Group by line box. Read every offsetTop before touching the DOM, so this costs one layout.
    var groups = [], cur = null, top = null;
    words.forEach(function (w) {
      var t = w.offsetTop;
      if (top === null || Math.abs(t - top) > tol) { cur = []; groups.push(cur); top = t; }
      cur.push(w);
    });

    var lines = [];
    for (var i = groups.length - 1; i >= 0; i--) {
      var grp = groups[i];
      var range = document.createRange();
      range.setStartBefore(grp[0]);
      range.setEndAfter(grp[grp.length - 1]);
      var contents = range.extractContents();
      var maskEl = document.createElement('span');
      maskEl.className = 'reveal-mask';
      var lineEl = document.createElement('span');
      lineEl.className = 'reveal-line';
      lineEl.appendChild(contents);
      maskEl.appendChild(lineEl);
      range.insertNode(maskEl);
      lines.unshift(lineEl);
    }
    if (!lines.length) { el.innerHTML = original; return null; }

    // The line breaks are now the masks themselves; every <br> left over is a blank line. They
    // live on in `original`, so restore() puts the address back exactly as authored.
    [].slice.call(el.querySelectorAll('br')).forEach(function (br) { br.parentNode.removeChild(br); });

    el.style.height = box + 'px';
    return {
      lines: lines,
      restore: function () {
        if (!el.isConnected) return;
        el.innerHTML = original;
        el.style.height = prevHeight;
      },
    };
  } catch (e) {
    // Legal copy must never be left half-rebuilt by a failed effect.
    try { el.innerHTML = original; el.style.height = prevHeight; } catch (e2) { }
    return null;
  }
}
