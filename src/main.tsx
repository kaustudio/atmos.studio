import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles/global.css';
// The app core is authored in JSX (a direct port of the design comp's logic).
import PaletteApp from './app/PaletteApp.jsx';
/* THE DOCUMENT ROUTES' STYLESHEETS, LOADED WITH THE SHELL. AboutPage and LegalPage import these
   too, and until now that was the ONLY place they were imported — so Vite emitted them as the
   lazy chunks' own CSS, and the prerendered dist/about.html, privacy.html and terms.html, whose
   head is a copy of this shell's, linked none of them. A cold document load painted the copy at
   global.css's defaults under a masthead with no .doc-head rules, whose glass layer then covered
   and blurred the whole page, and re-laid everything out when the chunk finally landed: measured
   at CLS 0.87 on /about, 0.45 on /privacy and 0.91 on /terms, and permanently blurred with no
   JavaScript at all — the one reader the prerender exists for. Importing them here puts them in
   main-*.css, which every prerendered head already links. The tool page was loading them anyway:
   the two chunks are prefetched on `load` (AppView), so this moves ~45KB of CSS earlier rather
   than adding it. */
import './styles/doc.css';
import './styles/legal.css';
import './styles/about.css';

// No StrictMode: the app drives imperative GSAP/WebGL lifecycles from componentDidMount and a
// double-invoked mount would double-build the orbit/universe engines.
const rootEl = document.getElementById('root')!;
/* A PRERENDERED DOCUMENT STAYS ON SCREEN WHILE ITS CHUNK LOADS. render() replaces whatever is in
   #root, and on /about, /privacy and /terms that is the whole statement — replaced by a Suspense
   hole until the lazy page arrives, so the footer jumped to the top of an empty column and back
   (the 0.39 layout shift the footer reported on every cold document load). The masthead and
   <main> are kept here, verbatim, and AppView's DocFallback renders them back for exactly as long
   as the hole would have been empty. The footer is left out because AppView renders its own. */
const pre = rootEl.querySelector(':scope > [data-app].doc-route');
if (pre) {
  const keep = Array.from(pre.children).filter((el) => el.tagName !== 'FOOTER');
  (window as any).__prerenderedDoc = { html: keep.map((el) => el.outerHTML).join('') };
}
createRoot(rootEl).render(<PaletteApp />);
