// Analytics consent: when the banner asks, how it arrives and leaves, and what a choice changes.
// The stored answer and the send-time gate live in lib/consent.js; the banner is ConsentBanner in
// AppView, rendered by PaletteApp outside the page window.
import { writeConsent } from '../../lib/consent.js';
import { PRIVACY } from '../routes.js';

/* AFTER THE PAGE HAS ARRIVED, NOT WITH IT. The loader's exit hands straight to the landing's masked
   headline, and a document route opens on its own hero cascade; a banner rising in the same breath
   would be a second thing arriving while the first is still speaking. 1.2s clears the landing's
   reveal (DUR.reveal plus the line stagger) with a beat to spare. A wipe or the loader still running
   when the beat is up pushes the question back rather than posing it under a cover.

   AND NOT BEFORE THE READER HAS DONE ANYTHING (16.09.26). Asked unprompted, the banner's sentence
   was the largest thing the page ever painted, and it painted 4.7s in (7s on a slow link), so every
   first visit that waited for it reported that as the page's Largest Contentful Paint, and those are
   exactly the visits that then press Accept and start sending. Speed Insights scored the front page
   poor for it. Four other arrivals that kept the timing were tried and measured (painted off-screen
   first, painted tiny first, its own compositor layer, a compositor-only fade); Chrome counted the
   sentence in every one as soon as it repainted. What it does not do is choose a largest paint after the reader's first
   click, key, wheel or touch: that is the metric's own rule, not a quirk of one release. So the
   question waits for one of those, and then keeps the beat and the cover rule above. A reader who
   never touches the page is never asked, and nothing is measured for them. */
const CONSENT_BEAT_MS = 1200;
const CONSENT_RETRY_MS = 400;
// The inputs that end Chrome's largest-paint window. A mouse move does not, so it is not here.
const ENGAGE_EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart'];

export const consentMethods = {
  // Called from componentDidMount and componentDidUpdate. Arms once per visit, and only while there is
  // no answer: a visitor who has chosen is never asked again, and one who has not is asked once.
  _syncConsent() {
    const s = this.state;
    if (s.consent) return;
    this._watchEngagement();
    // Waiting means the beat has passed and the first input will ask; nothing to arm meanwhile.
    if (s.consentOpen || s.showLoader || this._consentT || this._consentAsked || this._consentWaiting) return;
    this._consentT = setTimeout(() => this._askConsent(), CONSENT_BEAT_MS);
  },
  // From mount, so a press during the loader already counts. Captured and passive: it only listens.
  _watchEngagement() {
    if (this._engaged || this._engageOff) return;
    const on = () => {
      this._engaged = true;
      off();
      // Asked a retry's length later, so a press that starts a crossing is seen running first.
      if (this._consentWaiting && this._alive) {
        this._consentWaiting = false;
        clearTimeout(this._consentT);
        this._consentT = setTimeout(() => this._askConsent(), CONSENT_RETRY_MS);
      }
    };
    const off = () => { ENGAGE_EVENTS.forEach((t) => window.removeEventListener(t, on, true)); this._engageOff = null; };
    ENGAGE_EVENTS.forEach((t) => window.addEventListener(t, on, { capture: true, passive: true }));
    this._engageOff = off;
  },
  _askConsent() {
    this._consentT = null;
    if (!this._alive || this.state.consent || this.state.consentOpen) return;
    /* NOT WHILE THE TOUR IS ON SCREEN (21.09.26). Pressing Create is also the first pointerdown, so
       it armed this question and the tour's invitation on the same press — measured three runs out
       of three, the banner at z-165 over the invitation's z-126 layer and clickable through its
       scrim while the invitation claimed aria-modal. Two decisions at the moment of first contact,
       and a modal that was modal to the keyboard but not to the pointer.
       The question waits for the tour to be over, on the same retry that already waits out the
       loader and the page wipe. Nothing is lost by the wait: analytics do not mount until this is
       answered either way (lib/consent.js), so a later ask is a later ask, not a gap. */
    if (this.state.showLoader || this._wipeRunning || this.state.tourStep != null) { this._consentT = setTimeout(() => this._askConsent(), CONSENT_RETRY_MS); return; }
    if (!this._engaged) { this._consentWaiting = true; return; }
    this._consentAsked = true;
    // No focus move: the question arrives unprompted, and taking focus from whatever the reader is
    // doing would make it modal in all but name. It is first in the document instead, so the next
    // Tab from the top of the page reaches it before anything else.
    this.setState({ consentOpen: true }, () => this._consentIn());
  },
  /* LEARN MORE, AND THE QUESTION STAYS UP. The privacy statement's Analytics section, reached the way
     every in-document link is: a plain left-click is taken in-app, anything else follows the address.
     The banner is not closed — reading more is in service of answering, not instead of it.
     The router drops a hash, so the jump is made here: at once when the statement is already the page,
     and otherwise after the crossing has finished and the section exists to scroll to. The travel is
     the story's anchor jump (one second on EASE.fold, instant under reduced motion), and it stops clear
     of the masthead by the table of contents' own offset. */
  learnAboutAnalytics(e) {
    if (e && (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)) return;
    if (e) e.preventDefault();
    if (this._consentLearnT) { clearTimeout(this._consentLearnT); this._consentLearnT = null; }
    const jump = () => {
      const el = document.getElementById('analytics');
      if (!el) return false;
      const wrap = document.querySelector('[data-toc-wrap]');
      const offset = parseInt(wrap && wrap.getAttribute('data-toc-offset'), 10) || 104;
      if (this._lenis && this._lenis.scrollTo) {
        try { this._lenis.scrollTo(el, this._reduce ? { offset: -offset, immediate: true } : { offset: -offset, duration: 1, easing: this.EASE.fold }); return true; } catch (err) { }
      }
      window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - offset);
      return true;
    };
    if (this.state.route === PRIVACY && jump()) return;
    this.navigateTo('/privacy');
    let tries = 0;
    const wait = () => {
      this._consentLearnT = null;
      if (!this._alive) return;
      if ((this._wipeRunning || this.state.route !== PRIVACY || !jump()) && ++tries < 60) this._consentLearnT = setTimeout(wait, 100);
    };
    this._consentLearnT = setTimeout(wait, 100);
  },
  /* REOPENED ON REQUEST — the footer's Privacy Settings, or the links in the privacy statement.
     Asked for, so focus goes in, and comes back to the control that opened it on the way out. Pressed
     during an exit, it turns the banner round in place rather than letting it finish leaving. */
  openConsent(opener) {
    if (opener && opener.focus) this._consentBack = opener;
    const el = document.querySelector('[data-consent]');
    if (this._consentClosing && el && window.gsap) {
      this._consentClosing = false;
      // The choice that started the exit still stands; only the leaving is undone.
      const pending = this._consentPending;
      this._consentPending = null;
      if (pending && Object.keys(pending).length) this.setState(pending);
      this._consentTurn(el, 1, this.EASE.entrance).eventCallback('onComplete', () => this._consentSettle(el));
      this._focusConsent();
      return;
    }
    if (this.state.consentOpen) { this._consentNudge(); this._focusConsent(); return; }
    this.setState({ consentOpen: true }, () => { this._consentIn(); this._focusConsent(); });
  },
  // Written first, so the send-time gate answers the new way before the banner has even started to
  // leave; the state that mounts or unmounts the two SDK components follows the exit.
  chooseConsent(value) {
    if (this._consentClosing) return;
    writeConsent(value);
    this._closeConsent({ consent: value, announce: value === 'granted' ? 'Analytics allowed.' : 'Analytics declined.' });
  },
  // Offered only once an answer exists, so closing can never be mistaken for one.
  dismissConsent() {
    if (this._consentClosing || !this.state.consent) return;
    this._closeConsent({});
  },
  _closeConsent(patch) {
    this._consentClosing = true;
    this._consentPending = patch;
    const el = document.querySelector('[data-consent]');
    const hadFocus = !!(el && el.contains(document.activeElement));
    const back = this._consentBack;
    this._consentBack = null;
    this._consentOut(() => {
      if (!this._consentClosing) return;   // reopened mid-exit — see openConsent
      this._consentClosing = false;
      const pending = this._consentPending || {};
      this._consentPending = null;
      this.setState({ ...pending, consentOpen: false }, () => {
        if (hadFocus && back && back.isConnected) { try { back.focus(); } catch (e) { } }
        // The tour's invitation, if Create was pressed while this was up (tour.js maybeOfferTour).
        this._offerTourAfterConsent();
      });
    });
  },
  /* ASKED FOR WHILE IT IS ALREADY UP — a first visit, with the banner still waiting for an answer.
     Focus alone moves nothing a pointer can see, so Privacy settings read as a dead link. The banner
     leaves and arrives again on its own beat instead, so the answer to "open this" is the thing
     visibly opening. Reduced motion keeps the instant path, where the focus move is the whole
     response. */
  _consentNudge() {
    const g = window.gsap; const el = document.querySelector('[data-consent]');
    if (this._reduce || !g || !el) return;
    this._consentTurn(el, 0, this.EASE.exit).eventCallback('onComplete', () => {
      this._consentTurn(el, 1, this.EASE.entrance).eventCallback('onComplete', () => this._consentSettle(el));
    });
  },
  _focusConsent() {
    const el = document.querySelector('[data-consent]');
    if (el) { try { el.focus(); } catch (e) { } }
  },
  /* A PROGRESSIVE BLUR, BECAUSE THE GLASS CANNOT SIMPLY FADE. The banner wears the masthead's pane,
     and an ancestor below full opacity becomes the backdrop root: for the length of an ordinary fade
     the .75em blur stops reaching the page and each button's own blur sees only the banner, so the
     glass went sharp and pale, then snapped back when the opacity cleared. Measured, not assumed.

     So the container never takes an opacity. Everything that made it glass is driven by one number
     instead — --consent-glass, 1 at rest — which global.css multiplies into the blur radius, the
     tint, the hairline and the shadow, so the pane dissolves rather than dims. The words and the
     buttons fade on their own elements, blurring away as they go; their own opacity leaves their own
     blur intact. The rise is the toast's 16px, on transform, which is no backdrop root.
     DUR.state both ways, the bottom-anchored family's beat. data-glass-anim switches off the fill's
     theme crossfade and the close's [data-ix] transitions while it runs, so neither chases the tween
     a frame behind. Reduced motion and no GSAP take the instant path, and the exit still calls back
     synchronously there. */
  _consentParts(el) { return [].slice.call(el.querySelectorAll('.consent__text, .button, .consent__close')); },
  // Tweens the banner to glass 1 (present) or 0 (dissolved) from wherever it is, and returns the
  // timeline so a caller can chain what follows. Kills whatever was running first, so a reversal
  // mid-flight turns round in place.
  _consentTurn(el, to, ease) {
    const g = window.gsap, parts = this._consentParts(el);
    // The timeline itself, not only its tweens: a killed timeline fires no callback, so an exit
    // turned round mid-flight can never still close the banner, and a nudge interrupted by an answer
    // can never still bring it back.
    if (this._consentTl) { this._consentTl.kill(); this._consentTl = null; }
    g.killTweensOf([el].concat(parts));
    el.setAttribute('data-glass-anim', '');
    const tl = this._consentTl = g.timeline();
    // FROM WHERE IT IS, STATED. At rest the property is unset — the CSS falls back to 1 — and GSAP
    // reads an unset custom property as 0, so a plain to() started every exit fully dissolved: the
    // blur vanished on the first frame and only the words faded. An inline value mid-flight is the
    // real position; no value means present.
    const now = parseFloat(el.style.getPropertyValue('--consent-glass'));
    tl.to(el, { y: to ? 0 : 16, duration: this.DUR.state, ease }, 0);
    tl.fromTo(el, { '--consent-glass': isNaN(now) ? 1 : now }, { '--consent-glass': to, duration: this.DUR.state, ease }, 0);
    tl.to(parts, { opacity: to, filter: to ? 'blur(0px)' : 'blur(6px)', duration: this.DUR.state, ease }, 0);
    return tl;
  },
  _consentSettle(el) {
    const g = window.gsap;
    el.removeAttribute('data-glass-anim');
    el.style.removeProperty('--consent-glass');
    if (g) { g.set(el, { clearProps: 'transform' }); g.set(this._consentParts(el), { clearProps: 'opacity,filter' }); }
  },
  _consentIn() {
    const g = window.gsap; if (this._reduce || !g) return;
    const el = document.querySelector('[data-consent]'); if (!el) return;
    // Parked dissolved on the same tick it mounted, so it is never painted whole first.
    g.set(el, { y: 16, '--consent-glass': 0 });
    g.set(this._consentParts(el), { opacity: 0, filter: 'blur(6px)' });
    this._consentTurn(el, 1, this.EASE.entrance).eventCallback('onComplete', () => this._consentSettle(el));
  },
  _consentOut(cb) {
    const g = window.gsap; const el = document.querySelector('[data-consent]');
    if (this._reduce || !g || !el) { cb(); return; }
    this._consentTurn(el, 0, this.EASE.exit).eventCallback('onComplete', cb);
  },
};
