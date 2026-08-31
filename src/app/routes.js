/* Atmos Gallery — the four routes this document serves.

   Privacy and terms used to be their own documents in /public, and the wipe between them was cut in
   half and handed across the boundary through sessionStorage. That handoff is gone: the cover, the
   brand beat and the reveal are one timeline again, because the swap behind the cover is now a
   setState rather than a navigation. See wipe.js navigateTo().

   URLs carry no extension. /privacy.html and /terms.html are still real addresses — they were in the
   sitemap and are very likely indexed — but they 308 to the clean form at the edge (vercel.json), so
   nothing here ever renders them. routeFor still recognises them because a redirect is a network
   thing and this function is also asked about the address bar's current value during development,
   where the edge is not in the loop.

   404.html is deliberately absent from this table. It is a separate Vite entry with its own three.js
   particle type, so it stays a document of its own; a link from it navigates plainly. */

export const APP = 'app';
export const ABOUT = 'about';
export const PRIVACY = 'privacy';
export const TERMS = 'terms';

export const LEGAL_ROUTES = [PRIVACY, TERMS];

// path → route. Anything unrecognised is the app: a deployment that serves this document at all has
// already decided the address is ours, and rendering the tool beats rendering nothing.
export function routeFor(pathname) {
  var p = String(pathname || '/').replace(/\/+$/, '') || '/';
  if (p === '/about' || p === '/about.html') return ABOUT;
  if (p === '/privacy' || p === '/privacy.html') return PRIVACY;
  if (p === '/terms' || p === '/terms.html') return TERMS;
  return APP;
}

export function pathFor(route) {
  if (route === ABOUT) return '/about';
  if (route === PRIVACY) return '/privacy';
  if (route === TERMS) return '/terms';
  return '/';
}

/* THE PAGE'S NAME, spoken. A client-side route change is invisible to assistive technology: the
   document does not reload, focus does not move on its own, and a <title> swap is not reliably
   announced. So the app says where it has arrived, through the live region it already renders, and
   this is the one place those four names are written down. Short, because it is read out in full
   every time somebody navigates. */
export function routeName(route) {
  // In step with the footer's labels (SiteFooter in AppView): this is announced on arrival, and a
  // page that is called one thing in the link and another in the announcement is two pages to
  // anyone navigating by ear.
  if (route === ABOUT) return 'How it Works';
  if (route === PRIVACY) return 'Policy';
  if (route === TERMS) return 'Terms';
  return 'Palette generator';
}

export function isLegal(route) {
  return route === PRIVACY || route === TERMS;
}

/* THE DOCUMENT ROUTES — about, privacy, terms — as opposed to the tool at /.
   Three separate places were asking `isLegal` when what they actually meant was "is this a page you
   READ rather than the thing you use": the early return in AppView (the tool must not sit in the DOM
   behind a document), the loader and landing skips in PaletteApp (there is no tool on these routes to
   introduce), and the entry-theme decision (a reader arriving from a search result gets their own
   appearance, not the tool's enforced light). About is all three of those and none of it is legal, so
   the question has its own name now. isLegal survives for what is genuinely particular to the two
   statements — which HTML fragment LegalPage injects. */
export function isDoc(route) {
  return route === ABOUT || route === PRIVACY || route === TERMS;
}

/* Per-route <head>. A single document serving three addresses has to rewrite its own metadata, and
   these are the tags that actually differ per route — title, canonical, the og: pair a share card
   reads, and the description. The JSON-LD block is NOT here: each route's structured data is a
   different @type with a different shape, so it is written as a whole block rather than patched
   field by field (see applyHead). */

/* ONE SHAPE FOR ALL FOUR: brand, then the category the page is in. "About |", "Privacy |" and
   "Terms |" led here once — three strings nobody types, on the three pages a search engine is most
   likely to show next to the homepage. Titles and descriptions are keyword-led rather than
   restatements of each page's own opening line; the openings still open the pages.

   TWO COPIES OF EVERY STRING, and they have to agree:
     - index.html carries the [APP] pair as served bytes, and applyHead rewrites them at mount — so a
       homepage title edited only there survives a few hundred milliseconds before this table
       overwrites it, in exactly the DOM a rendering crawler indexes.
     - scripts/prerender.mjs carries the other three, written into dist/about.html, dist/privacy.html
       and dist/terms.html for readers and crawlers with no JavaScript.
   Nothing enforces either agreement, so an edit here is an edit in two files. */
export const HEAD = {
  [ABOUT]: {
    title: 'Atmos Gallery | How Images Become Colour Systems',
    path: '/about',
    description: 'Atmos Gallery uses OKLCH to describe colours from an image, checks WCAG contrast across palette pairs and maps the palette to functional colour roles.',
    ogType: 'article',
  },
  [APP]: {
    title: 'Atmos Gallery | Image Colour Palette Generator',
    path: '/',
    description: 'Atmos Gallery reads a colour palette from an image, checks WCAG contrast for every pair and exports Figma variables, design tokens, CSS, Tailwind and ASE.',
    ogType: 'website',
  },
  [PRIVACY]: {
    title: 'Atmos Gallery | Privacy and Image Processing',
    path: '/privacy',
    description: 'Atmos Gallery extracts palettes on your device, stores them in your browser and sends a small thumbnail and hex values only when you request palette naming.',
    ogType: 'article',
  },
  [TERMS]: {
    title: 'Atmos Gallery | Terms of Use',
    path: '/terms',
    description: 'Atmos Gallery terms cover image rights, palette ownership, browser storage, shared links and the limits of colour and contrast readings.',
    ogType: 'article',
  },
};

var ORIGIN = 'https://atmos.gallery';

function meta(selector, value) {
  try {
    var tag = document.head.querySelector(selector);
    if (!tag) return;
    tag.setAttribute('content', value);
  } catch (e) { }
}

/* Rewrite the document head for a route. Called on every route change, including the first — the
   prerendered legal documents already carry the right tags, so on a cold legal load this is a no-op
   that writes the same values back, and on a client-side swap it is the only thing that keeps the
   address bar, the tab title and a copied share link agreeing with each other. */
export function applyHead(route) {
  var h = HEAD[route] || HEAD[APP];
  var url = ORIGIN + h.path;
  try {
    document.title = h.title;
    var canonical = document.head.querySelector('link[rel="canonical"]');
    if (canonical) canonical.setAttribute('href', url);
    meta('meta[name="description"]', h.description);
    meta('meta[property="og:title"]', h.title);
    meta('meta[property="og:description"]', h.description);
    meta('meta[property="og:url"]', url);
    meta('meta[property="og:type"]', h.ogType);
    meta('meta[name="twitter:title"]', h.title);
    meta('meta[name="twitter:description"]', h.description);
  } catch (e) { }
}
