// ANALYTICS CONSENT — one stored answer, read at the moment anything would be sent.
//
// Web Analytics and Speed Insights set no cookies, but both now wait for a visitor to allow them.
// The answer lives under the same first-party prefix as the Library, and it is read here rather
// than from React state for one reason: withdrawing has to stop the scripts that are ALREADY on the
// page. Neither SDK removes its script when its component unmounts, so unmounting alone would leave
// a declined visitor still reporting. Both SDKs pass every event through beforeSend first, and a
// beforeSend that answers null cancels it — so the gate sits there, and asks storage each time.
//
// `memo` is for a browser that refuses storage (a private window, blocked site data). The choice
// still holds for the length of the visit; it just cannot outlive it, so the banner asks again.
export const CONSENT_KEY = 'palette-generator/analytics-consent';

let memo = null;

export function readConsent() {
  try {
    const v = localStorage.getItem(CONSENT_KEY);
    if (v === 'granted' || v === 'denied') return v;
  } catch (e) { }
  return memo;
}

export function writeConsent(value) {
  memo = value;
  try { localStorage.setItem(CONSENT_KEY, value); } catch (e) { }
}

// Wraps a beforeSend: the event goes through `send` when analytics is allowed, and nowhere when not.
export const whenAllowed = (send) => (event) => (readConsent() === 'granted' ? send(event) : null);

/* THE FRAGMENT, FOR SPEED INSIGHTS. A share link carries the whole palette after the #, and Speed
   Insights reports location.href with only the pathname rewritten — the hash survives, so every
   vital recorded on an opened share link carried the palette with it. pageviewUrl (below) closes
   the same hole for Web Analytics; its vital event names the address `url` in the same way. */
export function withoutFragment(event) {
  try { const u = new URL(event.url); u.hash = ''; return { ...event, url: u.toString() }; }
  catch (e) { return { ...event, url: String(event.url || '').split('#')[0] }; }
}

/* THE PAGEVIEW'S ADDRESS: no fragment (AppView's note on sendPageview), and on the first pageview the query
   the visit arrived with (25.09.26, from the live audit). A phone's story writes the told palette's link
   into the address WITHOUT the query string (PaletteApp _syncToolHistory), so a campaign's tags or an ad's
   click id are not handed on when the reader shares it. The script can load after that, once the visitor
   has answered, and would then read an address that has lost them; so the first pageview puts back the
   query the page was opened with, when its address no longer has one. Read as this module is evaluated,
   before anything rewrites the address. Later pageviews, and every custom event, go as they are. */
const ARRIVAL_SEARCH = typeof location !== 'undefined' ? location.search : '';
let arrivalSent = false;
export function pageviewUrl(event) {
  const first = !!event && event.type === 'pageview' && !arrivalSent;
  if (event && event.type === 'pageview') arrivalSent = true;
  try {
    const u = new URL(event.url);
    u.hash = '';
    if (first && ARRIVAL_SEARCH && !u.search) u.search = ARRIVAL_SEARCH;
    return { ...event, url: u.toString() };
  } catch (e) { return { ...event, url: String(event.url || '').split('#')[0] }; }
}
