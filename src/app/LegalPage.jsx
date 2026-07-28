/* Privacy and terms, as routes of the app document.

   THE COPY IS STILL HTML. src/legal/privacy.html and terms.html are hand-authored documents, not
   JSX, and they are injected here verbatim. That is deliberate and worth defending: these are legal
   texts that get reviewed as prose and amended a sentence at a time, and a diff on a paragraph of
   markup is legible to someone checking a GDPR clause in a way that the same paragraph broken across
   JSX expressions and escaped entities is not. The README's rule — that a change in what the tool
   does lands in the same commit as the change to the statement describing it — survives the move
   intact, because the statement is still a file you can read end to end.

   dangerouslySetInnerHTML is therefore not a shortcut here, it is the point. The input is two files
   in this repository, authored by us, fixed at build time; there is no user content anywhere near
   it, and nothing on the page interpolates. The alternative — a parser turning our own HTML into
   React elements at runtime — would ship a parser to do at every mount what the build already did
   once.

   The fragments are also what the prerender step writes into the shipped documents, so a reader with
   no JavaScript, and any crawler that does not run it, gets exactly these bytes. See
   scripts/prerender.mjs. */
import React from 'react';
import { ThemeSwitch } from './chrome.jsx';
import { PRIVACY } from './routes.js';
import { initTableOfContents } from './methods/legalToc.js';
import { initLegalReveal } from './methods/legalReveal.js';
import privacyHtml from '../legal/privacy.html?raw';
import termsHtml from '../legal/terms.html?raw';
import '../styles/legal.css';

const BODY = { privacy: privacyHtml, terms: termsHtml };

export default class LegalPage extends React.Component {
  rootRef = React.createRef();

  componentDidMount() {
    this._build();
  }

  /* A route change from privacy to terms keeps this component mounted and swaps only the markup
     underneath it, so the rebuild has to be driven from here rather than from mount. Tearing down
     first is not optional: both helpers hold ScrollTriggers against headings that are about to stop
     existing. */
  componentDidUpdate(prev) {
    if (prev.vals.route === this.props.vals.route) return;
    this._teardown();
    this._build();
  }

  componentWillUnmount() {
    this._teardown();
  }

  _build() {
    const root = this.rootRef.current;
    if (!root) return;
    const vals = this.props.vals;
    // The app's own Lenis instance, handed down so the TOC's in-page jumps use the same smooth
    // scroll the rest of the document is on. Going around it would fight its rAF loop.
    this._killToc = initTableOfContents(root, { lenis: vals.lenis });
    this._reveal = initLegalReveal(root, { motion: vals.maskMotion });
    /* Armed, not played. The reveal starts when the wipe's panel clears — wipe.js calls
       vals.registerLegalReveal's controller at the same '<+0.15' offset the loader and Get Started
       use. On a cold load there is no wipe to wait for, so play immediately; `arriving` is how the
       app tells the difference. */
    if (vals.arrivingByWipe) vals.registerLegalReveal(this._reveal);
    else this._reveal.play();
  }

  _teardown() {
    if (this._killToc) { try { this._killToc(); } catch (e) { } this._killToc = null; }
    if (this._reveal) { try { this._reveal.destroy(); } catch (e) { } this._reveal = null; }
    if (this.props.vals.registerLegalReveal) this.props.vals.registerLegalReveal(null);
  }

  render() {
    const vals = this.props.vals;
    const route = vals.route;
    return (
      <>
        {/* The masthead. The mark is a link home rather than the app's fixed [data-logo] button:
            these routes are read by people who arrived from a search result as often as from the
            tool, and on a document that scrolls the mark has to sit in a bar rather than fly over
            the content. The theme switch stands in the same corner it does in the app. */}
        <div className="legal-head">
          <span className="legal-head__theme"><ThemeSwitch vals={vals} /></span>
          <span className="legal-head__mark">
            <a href="/" onClick={vals.navigate} aria-label="Atmos Gallery">
              <span className="mark" role="img" aria-label="Atmos Gallery"></span>
            </a>
          </span>
        </div>
        {/* key on the route: React must replace this subtree wholesale when privacy becomes terms,
            not try to reconcile one legal document's markup into another's. Without it the TOC and
            the reveal helpers would rebuild against half-patched DOM. */}
        <div key={route} ref={this.rootRef} dangerouslySetInnerHTML={{ __html: BODY[route] || BODY[PRIVACY] }} />
      </>
    );
  }
}
