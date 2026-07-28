/* Atmos Gallery — the three routes this document serves.

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
export const PRIVACY = 'privacy';
export const TERMS = 'terms';

export const LEGAL_ROUTES = [PRIVACY, TERMS];

// path → route. Anything unrecognised is the app: a deployment that serves this document at all has
// already decided the address is ours, and rendering the tool beats rendering nothing.
export function routeFor(pathname) {
  var p = String(pathname || '/').replace(/\/+$/, '') || '/';
  if (p === '/privacy' || p === '/privacy.html') return PRIVACY;
  if (p === '/terms' || p === '/terms.html') return TERMS;
  return APP;
}

export function pathFor(route) {
  if (route === PRIVACY) return '/privacy';
  if (route === TERMS) return '/terms';
  return '/';
}

export function isLegal(route) {
  return route === PRIVACY || route === TERMS;
}

/* Per-route <head>. A single document serving three addresses has to rewrite its own metadata, and
   these are the tags that actually differ per route — title, canonical, the og: pair a share card
   reads, and the description. The JSON-LD block is NOT here: each route's structured data is a
   different @type with a different shape, so it is written as a whole block rather than patched
   field by field (see applyHead). */
export const HEAD = {
  [APP]: {
    title: 'Atmos Gallery',
    path: '/',
    description: "Colour read from light and atmosphere. Drop in an image and Atmos Gallery reads a palette from its mood — not just its dominant colours.",
    ogType: 'website',
  },
  [PRIVACY]: {
    title: 'Privacy | Atmos Gallery',
    path: '/privacy',
    description: 'How Atmos Gallery handles your images, palettes and data: images are read on your device, palettes stay in your own browser, and the site sets no cookies at all.',
    ogType: 'article',
  },
  [TERMS]: {
    title: 'Terms | Atmos Gallery',
    path: '/terms',
    description: 'What Atmos Gallery does, what stays yours, and what it does not promise. A free browser tool from KauStudio ApS.',
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
