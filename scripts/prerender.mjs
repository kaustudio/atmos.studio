/* Writes dist/about.html, dist/privacy.html and dist/terms.html after `vite build`.

   THE FLOOR IS VISIBLE TEXT — the same rule pageReveal.js is built around, one level up. The document
   routes are React routes, and a route is nothing without JavaScript. For most of this app that is
   an honest trade: the tool genuinely cannot work without a script. A privacy statement can. It is
   the page a regulator opens, the page a crawler that does not execute JS is most likely to want, and
   the page whose whole purpose is to be readable by someone who does not trust us. Shipping it as an
   empty <div id="root"> would have been the one real regression in this restructure.

   /about earns the same treatment for a different reason: it is the page that says what this product
   is and why, it carries the palettes, weights, role assignments and contrast figures that make that
   case, and public/llms.txt exists precisely because agent crawlers do not run scripts. A marketing
   page that is empty to everything except a browser is a marketing page nobody reads.

   So each legal route is written out as a whole document: the built shell, with that route's metadata
   in the head and its copy already inside #root. No JavaScript, no bundle, no hydration needed to
   read a word of it.

   The client then boots normally and React renders over the top. That is a REPLACE, not a hydration —
   createRoot().render() discards the server markup rather than adopting it. The swap is invisible in
   practice because LegalPage injects the very same fragment this script does, from the same file, so
   the second render produces identical bytes; and it happens before the first frame the reader could
   compare. Hydration would be the tidier word for it, but hydrateRoot would mean the whole app —
   orbit engine, WebGL, GSAP lifecycles driven from componentDidMount — having to agree with a
   server render it was never written for. The cost of a replace is one extra DOM build; the cost of
   the alternative is every imperative mount in the app. */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ORIGIN = 'https://atmos.gallery';

/* Kept in step with src/app/routes.js HEAD by hand. A shared module would be tidier, but that file
   is bundled ESM importing browser globals and this is a build script — the duplication is four
   strings per route. Nothing checks the agreement: smoke.mjs never reads the head, so a title
   changed in one file and not the other ships a prerendered document that disagrees with the one
   React renders over it, and only a crawler would ever see the difference. Edit both. */
const ROUTES = {
  about: {
    src: 'src/about/about.html',
    // The route wrapper's second class — see AppView's document-route branch and src/styles/doc.css.
    scope: 'about-route',
    title: 'Atmos Gallery | How Images Become Colour Systems',
    description: 'Atmos Gallery uses OKLCH to describe colours from an image, checks WCAG contrast across palette pairs and maps the palette to functional colour roles.',
    ld: {
      '@context': 'https://schema.org',
      '@type': 'AboutPage',
      name: 'Atmos Gallery | How Images Become Colour Systems',
      url: ORIGIN + '/about',
      description: "Atmos Gallery reads a colour palette from an image's light and atmosphere rather than its literal pixels, assigns the result semantic roles, and checks the system it makes.",
      inLanguage: 'en',
      publisher: { '@type': 'Organization', name: 'KauStudio ApS', vatID: 'DK39161443', email: 'hello@kau.studio' },
      isPartOf: { '@type': 'WebSite', name: 'Atmos Gallery', url: ORIGIN + '/' },
      about: { '@type': 'WebApplication', name: 'Atmos Gallery', url: ORIGIN + '/' },
    },
  },
  privacy: {
    src: 'src/legal/privacy.html',
    scope: 'legal-route',
    title: 'Atmos Gallery | Privacy and Image Processing',
    description: 'Atmos Gallery extracts palettes on your device, stores them in your browser and sends a small thumbnail and hex values only when you request palette naming.',
    ld: {
      '@context': 'https://schema.org',
      '@type': 'PrivacyPolicy',
      name: 'Atmos Gallery | Privacy and Image Processing',
      url: ORIGIN + '/privacy',
      description: 'How Atmos Gallery handles your images, palettes and data.',
      dateModified: '2026-07-27',
      inLanguage: 'en',
      publisher: {
        '@type': 'Organization',
        name: 'KauStudio ApS',
        vatID: 'DK39161443',
        email: 'hello@kau.studio',
        address: {
          '@type': 'PostalAddress',
          streetAddress: 'Hessensgade 36, 4. tv',
          postalCode: '2300',
          addressLocality: 'Copenhagen S',
          addressCountry: 'DK',
        },
      },
      isPartOf: { '@type': 'WebSite', name: 'Atmos Gallery', url: ORIGIN + '/' },
    },
  },
  terms: {
    src: 'src/legal/terms.html',
    scope: 'legal-route',
    title: 'Atmos Gallery | Terms of Use',
    description: 'Atmos Gallery terms cover image rights, palette ownership, browser storage, shared links and the limits of colour and contrast readings.',
    ld: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'Atmos Gallery | Terms of Use',
      url: ORIGIN + '/terms',
      description: 'What Atmos Gallery does, what stays yours, and what it does not promise.',
      dateModified: '2026-07-27',
      inLanguage: 'en',
      publisher: { '@type': 'Organization', name: 'KauStudio ApS', vatID: 'DK39161443', email: 'hello@kau.studio' },
      isPartOf: { '@type': 'WebSite', name: 'Atmos Gallery', url: ORIGIN + '/' },
    },
  },
};

// The masthead and footer a document route renders around its fragment. Restated here because they
// are React components on the client (DocHead in chrome.jsx, SiteFooter in AppView) and this script
// has no renderer — and because they are the two pieces of chrome a no-JS reader needs most: a way
// back to the site, and the trader identification the E-Commerce Directive asks for. The theme
// switch is deliberately absent; it does nothing without a script, and a dead control is worse than
// no control. KEEP IN STEP with those two components: this is the one duplication in the build, and
// the class names are what doc.css and site-foot.css style.
// The glass pane goes in even though the theme switch does not, and the asymmetry is the point: the
// switch is a control that does nothing without a script, and a dead control is worse than none —
// the pane is seven empty divs styled entirely from global.css, so it renders identically with the
// bundle and without it. Leaving it out would give a no-JS reader a masthead with no background at
// all, since .doc-head's own var(--surface) came off when the glass went on.
const head = () => `
<div class="doc-head glass-bar">
  <div class="glass-effect">
    <div class="glass-effect__fill"></div>
    <div class="glass-effect__fill-burn"></div>
    <div class="glass-effect__highlight-soft"></div>
    <div class="glass-effect__highlight-strong"></div>
    <div class="glass-effect__edge-light"></div>
    <div class="glass-effect__edge-dark"></div>
    <div class="glass-effect__inner-glow"></div>
  </div>
  <span class="doc-head__mark"><a href="/" aria-label="Atmos Gallery"><span class="mark" role="img" aria-label="Atmos Gallery"></span></a></span>
</div>`;

const foot = (route) => `
<footer class="site-foot">
  <div class="site-foot__brand">
    <a href="/" aria-label="Atmos Gallery — home"><span class="site-foot__mark" aria-hidden="true"></span></a>
  </div>
  <div class="site-foot__meta">
    <p class="site-foot__origin">A Part of <a href="https://kau.studio">KauStudio</a></p>
    <nav class="site-foot__nav" aria-label="Site">
      <a href="/about"${route === 'about' ? ' aria-current="page"' : ''}>About</a>
      <a href="/privacy"${route === 'privacy' ? ' aria-current="page"' : ''}>Privacy Policy</a>
      <a href="/terms"${route === 'terms' ? ' aria-current="page"' : ''}>Terms and Conditions</a>
    </nav>
    <p class="site-foot__rights">All Rights Reserved &copy; 2026</p>
  </div>
</footer>`;

function swapTag(html, pattern, replacement, what, route) {
  if (!pattern.test(html)) throw new Error(`prerender(${route}): could not find ${what} in dist/index.html — the shell's head changed shape, so this rewrite is silently doing nothing.`);
  return html.replace(pattern, replacement);
}

const shell = readFileSync(resolve(ROOT, 'dist/index.html'), 'utf8');

for (const [route, meta] of Object.entries(ROUTES)) {
  // Named per route rather than derived from it: /about's fragment does not live under src/legal,
  // and a path built by string concatenation is how the next document ends up in the wrong folder to
  // satisfy this loop.
  const body = readFileSync(resolve(ROOT, meta.src), 'utf8');
  const url = `${ORIGIN}/${route}`;
  let html = shell;

  /* Pre-paint theme, and the reason it cannot be left to React.
     These documents ship as static HTML with no data-theme on <html>, so global.css's :root — the
     light tokens — is what the browser paints first. React then mounts, reads the OS preference for
     a legal entry route (PaletteApp._entryTheme) and sets the attribute. Between those two moments
     sits the whole 1MB bundle, which on a dark-mode reader's screen is a flash of white lasting as
     long as the download does. The same two lines 404.html carries, for the same reason, and they
     have to be inline and blocking: a linked file is another round trip before anything is legible,
     and a deferred script paints light and corrects itself in front of the reader.
     The same script sets the browser-chrome colour, so the toolbar does not stay light over a dark
     page for the length of that download. It writes the shell's SINGLE tag rather than emitting a
     media-scoped pair, which is what 404.html can afford but this document cannot: syncThemeColor()
     rewrites the first meta[name=theme-color] it finds from the live --surface token, so a pair
     would have its light half overwritten with the dark value the moment the app mounted, leaving
     two tags that both say #141413. One tag, owned by script from first paint onward, is the only
     shape that stays correct. */
  html = swapTag(
    html,
    /<meta name="theme-color" content="[^"]*"\s*\/>/,
    '<meta name="theme-color" content="#f5f5f3" />\n' +
    '    <script>try{if(matchMedia("(prefers-color-scheme: dark)").matches){document.documentElement.setAttribute("data-theme","dark");document.currentScript.previousElementSibling.setAttribute("content","#141413")}}catch(e){}</script>',
    'the theme-color tag',
    route
  );

  html = swapTag(html, /<title>[\s\S]*?<\/title>/, `<title>${meta.title}</title>`, '<title>', route);
  html = swapTag(html, /<meta name="description" content="[^"]*"\s*\/>/, `<meta name="description" content="${meta.description}" />`, 'the description', route);
  html = swapTag(html, /<link rel="canonical" href="[^"]*"\s*\/>/, `<link rel="canonical" href="${url}" />`, 'the canonical', route);
  html = swapTag(html, /<meta property="og:title" content="[^"]*"\s*\/>/, `<meta property="og:title" content="${meta.title}" />`, 'og:title', route);
  html = swapTag(html, /<meta property="og:description" content="[^"]*"\s*\/>/, `<meta property="og:description" content="${meta.description}" />`, 'og:description', route);
  html = swapTag(html, /<meta property="og:url" content="[^"]*"\s*\/>/, `<meta property="og:url" content="${url}" />`, 'og:url', route);
  html = swapTag(html, /<meta property="og:type" content="[^"]*"\s*\/>/, `<meta property="og:type" content="article" />`, 'og:type', route);
  html = swapTag(html, /<meta name="twitter:title" content="[^"]*"\s*\/>/, `<meta name="twitter:title" content="${meta.title}" />`, 'twitter:title', route);
  html = swapTag(html, /<meta name="twitter:description" content="[^"]*"\s*\/>/, `<meta name="twitter:description" content="${meta.description}" />`, 'twitter:description', route);
  // The shell's WebApplication block describes the tool, which this page is not.
  html = swapTag(html, /<script type="application\/ld\+json">[\s\S]*?<\/script>/, `<script type="application/ld+json">\n${JSON.stringify(meta.ld, null, 2)}\n</script>`, 'the JSON-LD block', route);

  // The route's own copy, inside the root React will render over.
  html = swapTag(
    html,
    /<div id="root"><\/div>/,
    // <main> wraps the fragment here exactly as it does on the client (LegalPage / AboutPage), so the
    // no-JS document carries the same landmark the rendered one does.
    `<div id="root"><div data-app="1" class="doc-route ${meta.scope}">${head()}\n<main>${body}</main>\n${foot(route)}\n</div></div>`,
    '<div id="root">',
    route
  );

  writeFileSync(resolve(ROOT, `dist/${route}.html`), html);
  const bytes = Buffer.byteLength(html);
  // A prerender that silently wrote a shell with no copy in it is the failure worth catching: it
  // looks fine in a browser and is empty to everything else.
  if (!html.includes('<h1>')) throw new Error(`prerender(${route}): wrote ${bytes} bytes with no <h1> — the fragment did not make it in.`);
  console.log(`prerender: dist/${route}.html (${(bytes / 1024).toFixed(1)} kB)`);
}
