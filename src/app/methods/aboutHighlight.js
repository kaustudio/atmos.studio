/* Osmo Supply — Highlight Text on Scroll.
   The attribute contract, the defaults, the tween and the trigger are the resource's own:
   [data-highlight-text] on the element, [data-highlight-scroll-start] / -scroll-end / -fade /
   -stagger to override, and a scrubbed timeline that tweens every character FROM a low autoAlpha up
   to full. Nothing about the effect is changed.

   [ATMOS 1] THE SPLIT IS HAND-ROLLED, because SplitText is not on this site.
   The resource calls `new SplitText(heading, { type: "words, chars", autoSplit: true })`. GSAP's
   plugins here are vendored files in /public/vendor loaded by index.html — gsap, Observer, Flip,
   ScrollToPlugin, ScrollTrigger — and SplitText is not among them. Adding a fifth vendored plugin for
   one heading is a real cost (another blocking script on every route, including the tool, which will
   never use it), and this codebase already splits text by hand twice for exactly this reason: see the
   note on _maskLineReveal in methods/motion.js ("Osmo SplitText mechanic, hand-split — no plugin")
   and splitLines() in methods/pageReveal.js.

   So splitChars() below does what `type: "words, chars"` does: each word becomes an inline-block span
   so the browser still breaks lines only between words, and each character inside it becomes an
   inline-block span so it can carry its own opacity. What is NOT reproduced is `autoSplit: true` —
   the plugin re-splits on a font or width change, and here the split is stable under both, because
   nothing about it depends on where the lines actually fall. Only the ScrollTrigger's measurements
   do, and AboutPage refreshes those on document.fonts.ready.

   [ATMOS 2] It carries SplitText's accessibility behaviour with it. Splitting a sentence into 60
   spans is fine for a browser and hostile to a screen reader, which is why the plugin's default
   `aria: "auto"` labels the parent with the original text and hides the pieces. Same here — and
   restore() puts the original markup back on the way out, so the DOM never keeps the fragments.

   [ATMOS 3] Guarded on GSAP, ScrollTrigger and reduced motion, and wrapped in init/destroy rather
   than run on DOMContentLoaded — the same two accommodations aboutParallax.js records, for the same
   two reasons: vendored scripts can 404, and this is a route rather than a document. */

function noop() { }

/* → { chars, restore } or null when there is nothing to split.
   Words wrap the characters, so line breaking is unchanged: an inline-block box cannot be broken
   inside, and the whitespace between them stays a real text node, which is what the browser breaks
   on. Splitting characters loose in the flow instead would let a line break land mid-word. */
/* [ATMOS 4] A <br> SURVIVES THE SPLIT, and it has to. This read el.textContent and rebuilt from
   that string, which is every character the element contains and none of the ELEMENTS — so a line
   break written into the markup was silently dropped and the sentences it separated ran together on
   one line. That cost nothing while the only target was a statement with no break in it; the
   moment one had a <br>, the effect would have quietly rewritten the composition it was applied to.
   So the walk is over childNodes rather than over a flattened string: text nodes split as before,
   a <br> is rebuilt as a <br>, and anything else contributes its text the way textContent did — no
   worse than the old behaviour for cases this has never met, and correct for the one it has.
   The spoken label crosses the break with a SPACE. textContent gives "…an image.Leave with…" —
   a <br> contributes no character — so the sentence a screen reader is handed would run two words
   together at exactly the point the design puts a line break. */
function splitChars(el) {
  const original = el.innerHTML;
  const prevLabel = el.getAttribute('aria-label');
  const nodes = [].slice.call(el.childNodes);
  const spoken = nodes.map((n) => (n.nodeName === 'BR' ? ' ' : n.textContent || '')).join('');
  if (!spoken || !spoken.trim()) return null;
  try {
    const frag = document.createDocumentFragment();
    const chars = [];
    const addText = (part) => {
      if (!part) return;
      if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
      const word = document.createElement('span');
      word.setAttribute('data-hl-word', '');
      [].forEach.call(part, (ch) => {
        const c = document.createElement('span');
        c.setAttribute('data-hl-char', '');
        c.textContent = ch;
        word.appendChild(c);
        chars.push(c);
      });
      frag.appendChild(word);
    };
    nodes.forEach((node) => {
      if (node.nodeName === 'BR') { frag.appendChild(document.createElement('br')); return; }
      (node.textContent || '').split(/(\s+)/).forEach(addText);
    });
    if (!chars.length) return null;
    el.textContent = '';
    el.appendChild(frag);
    // [ATMOS 2] the element speaks the sentence; the pieces say nothing.
    el.setAttribute('aria-label', spoken.replace(/\s+/g, ' ').trim());
    el.setAttribute('data-hl-split', '');
    return {
      chars,
      restore() {
        if (!el.isConnected) return;
        el.innerHTML = original;
        el.removeAttribute('data-hl-split');
        if (prevLabel === null) el.removeAttribute('aria-label');
        else el.setAttribute('aria-label', prevLabel);
      },
    };
  } catch (e) {
    try { el.innerHTML = original; } catch (e2) { }
    return null;
  }
}

export function initHighlightText(root) {
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  if (!gsap || !ScrollTrigger || !root) return noop;
  try { if (window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches) return noop; } catch (e) { }
  try { gsap.registerPlugin(ScrollTrigger); } catch (e) { return noop; }

  const timelines = [];
  const restores = [];

  let splitHeadingTargets = root.querySelectorAll("[data-highlight-text]")
  splitHeadingTargets.forEach((heading) => {

    const scrollStart = heading.getAttribute("data-highlight-scroll-start") || "top 90%"
    const scrollEnd = heading.getAttribute("data-highlight-scroll-end") || "center 40%"
    const fadedValue = heading.getAttribute("data-highlight-fade") || 0.2 // Opacity of letter
    const staggerValue =  heading.getAttribute("data-highlight-stagger") || 0.1 // Smoother reveal

    const split = splitChars(heading);
    if (!split) return;
    restores.push(split.restore);

    let tl = gsap.timeline({
      scrollTrigger: {
        scrub: true,
        trigger: heading,
        start: scrollStart,
        end: scrollEnd,
      }
    })
    tl.from(split.chars, {
      autoAlpha: fadedValue,
      stagger: staggerValue,
      ease: "linear"
    })
    timelines.push(tl);
  });

  return function destroy() {
    timelines.forEach((tl) => {
      // The ScrollTrigger explicitly as well as the timeline: an unkilled trigger stays in
      // ScrollTrigger's global list measuring headings that have left the document.
      try { if (tl.scrollTrigger) tl.scrollTrigger.kill(); } catch (e) { }
      try { tl.kill(); } catch (e) { }
    });
    timelines.length = 0;
    restores.forEach((r) => { try { r(); } catch (e) { } });
    restores.length = 0;
  };
}
