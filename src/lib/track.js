// CUSTOM EVENTS (23.09.26, by request: "set up custom events on vercel to gain more insights to the
// analytics"). Vercel Web Analytics' track(), behind the same consent as the page views:
//
// · Nothing is called before the visitor allows analytics. Not queued and held for later either: an
//   act from before the answer is simply not counted.
// · After that, the SDK's own queue carries the event to its script, and the beforeSend every
//   <Analytics> is given (AppView: sendPageview = whenAllowed(stripFragment)) reads the stored answer
//   again at send time and cuts the share link's fragment from the event's url, as it does for a page
//   view. A withdrawal mid-visit stops events at that same gate.
//
// What goes in: a name in Title Case and at most two properties (the Pro plan's limit), each an
// enumeration or a count. Never a palette's name, its colours, a file name or anything read from an
// image. The privacy page says which kinds of act are counted (src/legal/privacy.html, Analytics),
// and a new event that counts a new kind of act has to be added there in the same commit.
import { track } from '@vercel/analytics';
import { readConsent } from './consent.js';

export function trackEvent(name, props) {
  if (typeof window === 'undefined' || readConsent() !== 'granted') return;
  const send = () => { try { track(name, props); } catch (e) { } };
  if (window.va) { send(); return; }
  /* NOT YET MOUNTED. <Analytics> defines window.va in its own effect, which runs after the app's mount
     hooks, so an event raised at mount (a share link opening) waits a moment for it rather than being
     dropped. This never defines the queue itself: the component registers beforeSend on that queue
     first, and an event queued ahead of it would be sent with the share link's fragment still in its
     url. */
  let tries = 0;
  const wait = () => { if (window.va) send(); else if (++tries < 20) setTimeout(wait, 150); };
  setTimeout(wait, 150);
}
