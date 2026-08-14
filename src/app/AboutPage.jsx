/* /about, as a route of the app document.

   THE COPY IS HTML, for the reason LegalPage states at length and this page inherits: src/about/
   about.html is hand-authored, injected verbatim, and is also what scripts/prerender.mjs writes into
   dist/about.html. So the argument this page makes — including every hex, weight and contrast ratio
   in it — is readable end to end by someone with no JavaScript, and by the crawlers that do not run
   any. dangerouslySetInnerHTML is not a shortcut here: the input is one file in this repository,
   authored by us, fixed at build time, with nothing interpolated and no user content anywhere near
   it.

   WHAT THIS COMPONENT ADDS is the motion, and it is four separate things with one lifecycle:

     pageReveal      the site's own masked-line arrival, section by section — the same engine the two
                     legal routes use, handed this page's own idea of what a section is
     aboutFlip       the reference photograph growing from the hero plate into the full-width frame
     aboutParallax   everything that moves against the scroll: the role cells, the section photographs
     aboutHighlight  the two statements whose characters resolve as you read them
     aboutDividers   every standalone hairline, drawn from its leading edge instead of being there
     aboutSplitter   the before/after comparison, dragged
     aboutStack      the five steps, as five cards that recede and hand off
     aboutRail       the gallery, pinned, travelling sideways
     aboutStream     eight photographs blooming out of the centre under the closing statement
     aboutSpectrum   the palette read as hue, lightness and chroma — a strip becoming a measurement
     aboutIntervals  the gaps between colours, grown to the size of the steps they represent
     aboutPills      the six roles, explained one at a time, each with a photograph of its own
     aboutCascade    the sets that had no entrance — role cells, pills, matrix rows, weight key
     aboutOptical    display type nudged so its INK lands on the column line, not its box

   Each returns its own destroy, each floors itself under reduced motion or a missing dependency, and
   all of them are torn down together. None is load-bearing for reading the page. */
import React from 'react';
import { DocHead } from './chrome.jsx';
import { initPageReveal } from './methods/pageReveal.js';
import { initGlobalParallax } from './methods/aboutParallax.js';
import { initHighlightText } from './methods/aboutHighlight.js';
import { initFlipOnScroll } from './methods/aboutFlip.js';
import { initDividers } from './methods/aboutDividers.js';
import { initBeforeAfterSplitSlider } from './methods/aboutSplitter.js';
import { initStackSlides } from './methods/aboutStack.js';
import { initHorizontalRail } from './methods/aboutRail.js';
import { initImageStream } from './methods/aboutStream.js';
import { initSpectrum } from './methods/aboutSpectrum.js';
import { initIntervals } from './methods/aboutIntervals.js';
import { initFeaturePills } from './methods/aboutPills.js';
import { initCascade } from './methods/aboutCascade.js';
import { initStickyTitle } from './methods/aboutStickyTitle.js';
import { initOptical } from './methods/aboutOptical.js';
import aboutHtml from '../about/about.html?raw';
import '../styles/doc.css';
import '../styles/about.css';

/* THIS PAGE'S IDEA OF A SECTION, handed to the shared reveal engine.

   The legal statements are one column whose sections fall out of walking h2s in document order (see
   articleGroups). This page is not that shape: a section here is a marked block containing a heading,
   some prose in a measure, and one or more demonstrations that are grids and figures rather than
   paragraphs. So the markup says where the boundaries are and this reads them.

   Deliberately absent from every group: [data-highlight-text] and anything inside the plates. Those carry scroll behaviour of their own, and a block cannot both be held at opacity 0
   waiting for a cascade and be resolving its own characters against the scrollbar. */
function aboutGroups(root) {
  return [].slice.call(root.querySelectorAll('[data-sec]')).map((sec) => ({
    heading: sec.querySelector('[data-sec-head]'),
    blocks: [].slice.call(sec.querySelectorAll('[data-reveal]')),
    // The section's own hairline, not the heading's — this page rules the full bleed above a section
    // where a legal document rules the measure above an h2, so the element carrying --rule differs.
    rule: sec.hasAttribute('data-rule') ? sec : null,
  }));
}

export default class AboutPage extends React.Component {
  rootRef = React.createRef();

  componentDidMount() {
    this._build();
  }

  componentWillUnmount() {
    this._teardown();
  }

  _build() {
    const root = this.rootRef.current;
    if (!root) return;
    const vals = this.props.vals;

    const hero = root.querySelector('[data-about-hero]');
    this._reveal = initPageReveal(root, {
      motion: vals.maskMotion,
      hero,
      heroParts: hero ? ['h1', '.about-hero__lead'].map((s) => hero.querySelector(s)) : [],
      groups: aboutGroups(root),
    });

    /* ORDER MATTERS TWICE.

       The PINS go first. The stack, the rail and the stream all three insert a ScrollTrigger spacer
       into the document, which moves everything below them; anything that measured the page before
       they existed measured a page that is about to be a different height. Building them first means
       the flip and the parallax measure the real document.

       The FLIP goes before the reveal arms anything, because it measures the distance between its two
       plates and the reveal pins each block's height while it is split. Everything here also refreshes
       on document.fonts.ready, which is the case that actually bites on this site. */
    this._killStack = initStackSlides(root);
    this._killRail = initHorizontalRail(root);
    this._killStream = initImageStream(root);
    this._killFlip = initFlipOnScroll(root);
    this._killParallax = initGlobalParallax(root);
    this._killHighlight = initHighlightText(root);
    this._killDividers = initDividers(root, { motion: vals.maskMotion });
    this._killSplitter = initBeforeAfterSplitSlider(root);
    this._killSpectrum = initSpectrum(root);
    this._killIntervals = initIntervals(root);
    this._killPills = initFeaturePills(root, vals.maskMotion);
    this._killSticky = initStickyTitle(root);
    this._killCascade = initCascade(root, vals.maskMotion);
    this._killOptical = initOptical(root);

    /* The one thing the shared engine does not do for us: this page creates ScrollTriggers from
       eleven modules at mount, and mount here is before the local Neue Montreal .otf has loaded.
       Every one of them has therefore measured a document that is about to get taller — and three of
       them PIN, so their spacers move everything below. pageReveal carries its own catch-up sweep for
       exactly this (see the long note in that file); the resources do not, so a refresh is the honest
       fix. All three pins declare invalidateOnRefresh, so this re-measures their travel rather than
       merely repositioning a stale number. */
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        if (!root.isConnected || !window.ScrollTrigger) return;
        try { window.ScrollTrigger.refresh(); } catch (e) { }
      });
    }

    /* Armed, not played — the same contract LegalPage describes. On a wiped arrival the reveal waits
       for the cover's trailing edge; on a cold load there is nothing to wait for. `arrivingByWipe` is
       how the app tells them apart. */
    const controller = {
      play: () => {
        try { this._reveal.play(); } catch (e) { }
      },
      destroy: () => { },
    };
    if (vals.arrivingByWipe) vals.registerPageReveal(controller);
    else controller.play();
  }

  /* Torn down in the reverse of the order they were built, so the pins — which own document height —
     are the last to let go. Killing a pin first would reflow the page underneath modules that are
     still holding measurements of it. */
  _teardown() {
    ['_killOptical', '_killCascade', '_killSticky', '_killPills', '_killIntervals', '_killSpectrum', '_killSplitter', '_killDividers', '_killHighlight', '_killParallax', '_killFlip',
      '_killStream', '_killRail', '_killStack'].forEach((k) => {
      if (this[k]) { try { this[k](); } catch (e) { } this[k] = null; }
    });
    if (this._reveal) { try { this._reveal.destroy(); } catch (e) { } this._reveal = null; }
    if (this.props.vals.registerPageReveal) this.props.vals.registerPageReveal(null);
  }

  /* The page's single action is an <a href="/"> inside injected markup, so React's own onClick never
     reaches it — the anchor is not a React element. One delegated listener gives it the same
     treatment every other in-document link on the site gets: a plain left-click becomes the wiped
     swap, and a modified click, a middle-click, a new tab or a reader with no JS follows the real
     address. The guards are renderVals.navigate's, restated because the target is resolved by
     closest() here rather than being the listener's own currentTarget. */
  _onClick = (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!a || a.hasAttribute('download') || (a.target && a.target !== '_self')) return;
    let url;
    try { url = new URL(a.getAttribute('href'), location.href); } catch (err) { return; }
    if (url.origin !== location.origin) return;
    e.preventDefault();
    this.props.vals.navigateTo(url.pathname);
  };

  render() {
    const vals = this.props.vals;
    return (
      <>
        <DocHead vals={vals} />
        {/* A real <main>. The tool has one and the document routes had none — so on the three pages a
            reader is most likely to meet through a screen reader, "jump to the main content" had
            nothing to jump to and the masthead sat outside any landmark. It is also what makes a skip
            link unnecessary here: one 64px bar with two controls is not the repeated navigation that
            rule exists for, and landmark navigation already gets past it. */}
        <main ref={this.rootRef} onClick={this._onClick} dangerouslySetInnerHTML={{ __html: aboutHtml }} />
      </>
    );
  }
}
