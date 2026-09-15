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
   vital recorded on an opened share link carried the palette with it. AppView's stripFragment closes
   the same hole for Web Analytics; its vital event names the address `url` in the same way. */
export function withoutFragment(event) {
  try { const u = new URL(event.url); u.hash = ''; return { ...event, url: u.toString() }; }
  catch (e) { return { ...event, url: String(event.url || '').split('#')[0] }; }
}
