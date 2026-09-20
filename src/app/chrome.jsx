// Chrome shared by the tool and the legal routes.
//
// Both of these lived in AppView until privacy and terms became routes of this same document. They
// are here rather than exported from there for one reason: AppView imports LegalPage, so LegalPage
// importing back out of AppView would close a cycle — which ES modules tolerate and nobody should
// have to reason about. A third file both sides import is the honest shape of "shared".
import React, { useEffect, useRef, useState } from 'react';
import { sx } from '../lib/sx.js';
import { initDocHeadHide } from './methods/docHeadHide.js';
import { IconPlus } from './icons.jsx';

/* THE PART THAT SWAPS. Wrap the WORDS of a label in this and nothing else — an icon, a chevron or a
   toggle track passed as a sibling stays exactly where it is while the text rises through its mask.
   The first cut of the masked swap slid .button-006__text, which is the whole label row, so every
   glyph travelled with the words: a control's icon is part of its identity, not part of its
   sentence, and moving it made the button look like it was reloading rather than answering.
   The mask has to hug the TEXT, not the button. .button-006__default / __hover are the full button
   box, and translateY(100%) on a 14px line inside a 29px box only clears the line's own height —
   the words would slide into the padding and sit there half-visible. A mask the size of the line
   means 100% is exactly one line, which is the same arithmetic _maskLineReveal does per line. */
export function B006Text({ children }) {
  return <span className="b006-swap"><span className="b006-swap__in">{children}</span></span>;
}

/* THE SAME SWAP, for controls that do not have button-006's two layers. B006Text can carry one copy
   of the words because the button already renders the whole label twice; an ordinary [data-ix]
   button or a footer link renders it once, so this supplies the second copy itself and stacks them.
   The twin is aria-hidden — it is the same word arriving, not a second thing to read.
   Works under any button, link or role=button because the hover rule keys off the ancestor rather
   than off a component class, so a text link in the footer and a sort header in the archive take it
   the same way and on the same tokens as the CTA. */
export function TextSwap({ children }) {
  return (
    <span className="tswap">
      <span className="tswap__a">{children}</span>
      <span className="tswap__b" aria-hidden="true">{children}</span>
    </span>
  );
}

// The project's button, remapped to system tokens in global.css (.button-006). The two stacked
// spans are load-bearing: they are the two copies of the label the hover swap slides between, each
// clipped by its own layer. `hover` gives the second copy different words; omitted, both spans hold
// the same label and the swap reads as the line refreshing itself.
// `href` draws the same button as a link, for an act that goes somewhere: a real address a middle
// click or a new tab can follow, with the look, swap and focus ring unchanged — they key off the
// class, not the element.
export function B006({ label, hover, btnRef, href, ...props }) {
  const Tag = href ? 'a' : 'button';
  return (
    <Tag {...(href ? { href } : { type: 'button' })} data-button-006="" className="button-006" ref={btnRef} style={sx('font-family: Neue Montreal; font-size:var(--fs-label); letter-spacing:var(--track-flat)')} {...props}>
      <span className="button-006__hover"><span className="button-006__text" style={sx('letter-spacing:var(--track-flat); font-family: Neue Montreal')}>{hover ?? label}</span><span className="button-006__bg is--hover"></span></span>
      <span className="button-006__default"><span aria-hidden="true" className="button-006__text" style={sx('letter-spacing:var(--track-flat)')}>{label}</span><span className="button-006__bg is--default"></span></span>
    </Tag>
  );
}

/* NEW PALETTE IS ON THE CREATE PAGE IN EVERY STATE, OFF THE LANDING, AND IN THE DOCUMENTS' MASTHEAD
   (15.09.26, by request). Here in chrome.jsx because both bars carry it: AppView's header, and DocHead
   below, where it opens the create page in its default state (openCreate, the same act as Explore
   Atmos at the close of /about).

   It used to exist only while there was something to reset (`canReset`, every stage but the
   dropzone), and the press itself took it away. Now it always starts a palette, the reset from a
   result and the file picker on the dropzone (newPalette in methods/pipeline.js), so no press removes
   it. The one place it stands down is the landing, whose own buttons are the calls to action there.

   IT ARRIVES AND LEAVES THROUGH A BLUR as the landing goes and comes back (first asked for when the
   button vanished instantly). The exit outlives the state change: the button stays mounted, fades to
   nothing while its words blur, and only then unmounts. The arrival is the same blur resolving,
   because nothing on this site simply appears. NOT WHEN IT MOUNTS PRESENT: the first load and the
   crossing back from a document are the create page arriving, and the button arrives with that page,
   so a fade of its own would be a second, later arrival inside the first.

   AS QUIET AS THE ANALYTICS BANNER CLOSING (by request: the first cut, a 10px blur over 400ms on
   --ease-fold, popped). The banner's words and buttons fade out while blurring to 6px, over
   DUR.state, on EASE.exit, and come back the same way on EASE.entrance (_consentTurn in
   methods/consent.js); these are those figures, read from the CSS tokens so the two languages
   cannot drift. What the banner adds — a 16px drop of its container — is left out: in a fixed bar a
   button that moves is a jump, not a close.

   THE WORDS BLUR, NEVER THE PILL (by request again: it should not pop or scale up, it should just
   fade). A blur on the whole button spread its solid fill past its own edge, so even at 6px the pill
   read as swelling on its way out, and as shrinking into place on its way in. Now the button only
   fades, and the blur is on .button-006__text, the words, which the layer around them clips to the
   pill (overflow hidden, the pill's own radius): the silhouette never changes size. Nor does the
   exit take the pointer away: pointer-events:none dropped :hover the moment it was set, and the hover
   label rolled back down through the fade, two copies of the words at once.

   Web Animations rather than a CSS keyframe on an attribute: an animation is not copied by cloneNode,
   so a page-transition snapshot taken mid-flight shows the button at rest instead of replaying it.
   Under reduced motion it simply goes, and simply comes. */
function navMotion() {
  const cs = getComputedStyle(document.documentElement);
  const ms = (name, fallback) => { const v = cs.getPropertyValue(name).trim(); const n = parseFloat(v); if (isNaN(n)) return fallback; return v.endsWith('ms') ? n : n * 1000; };
  let reduce = false;
  try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { }
  return {
    reduce, outMs: ms('--dur-state', 240), inMs: ms('--dur-state', 240),
    easeOut: cs.getPropertyValue('--ease-exit').trim() || 'ease-in',
    easeIn: cs.getPropertyValue('--ease-entrance').trim() || 'ease-out',
  };
}
const NAV_GONE_BLUR_PX = 6;
const navBlur = (px) => 'blur(' + px + 'px)';
/* THE PLUS STEPS INTO THE LEFT PADDING, and by exactly the air its own box carries (18.09.26, by
   request: "decrease button padding on the left to maintain optical balance"). The glyph fills the
   middle half of its 16px box, so 4px of nothing stood between the padding and the ink, and the
   left of the pill read 4px wider than the right. -4px here is the same 4px taken off the left
   padding, stated on the icon so it cannot drift from the glass bar's --button-006-padding. */
const NAV_PLUS_SLOT = { display: 'inline-flex', marginLeft: '-4px' };

export function NavNewPalette({ show, onPress }) {
  const ref = React.useRef(null);
  const anims = React.useRef([]);
  const leaving = React.useRef(false);
  const [present, setPresent] = React.useState(!!show);
  // What `present` was on the last pass, so only a real false → true plays the arrival. A ref rather
  // than a first-run flag, because StrictMode runs a mount's effects twice.
  const wasPresent = React.useRef(present);

  const stop = () => { anims.current.forEach((a) => { try { a.cancel(); } catch (e) { } }); anims.current = []; };
  // Opacity on the button; blur on its words, both copies B006 renders (resting and hover). Every
  // target starts from where it is on screen, read BEFORE the running motion is cancelled, so a
  // reversal turns round in place. `fromGone` is the mount, which has nothing on screen to read.
  const play = (el, arriving, fromGone) => {
    const m = navMotion();
    const words = [].slice.call(el.querySelectorAll('.button-006__text'));
    const opacity = fromGone ? 0 : +getComputedStyle(el).opacity;
    const blurs = words.map((w) => {
      if (fromGone) return navBlur(NAV_GONE_BLUR_PX);
      const f = getComputedStyle(w).filter;
      return f === 'none' ? navBlur(0) : f;
    });
    stop();
    // Held at the end only on the way out, where the unmount follows. An arrival lets go, so a
    // settled button carries no animated filter at all.
    const opts = { duration: arriving ? m.inMs : m.outMs, easing: arriving ? m.easeIn : m.easeOut, fill: arriving ? 'none' : 'forwards' };
    const a = [el.animate([{ opacity }, { opacity: arriving ? 1 : 0 }], opts)];
    words.forEach((w, n) => a.push(w.animate([{ filter: blurs[n] }, { filter: navBlur(arriving ? 0 : NAV_GONE_BLUR_PX) }], opts)));
    anims.current = a;
    return Promise.all(a.map((x) => x.finished));
  };
  const leave = () => {
    if (leaving.current) return;
    leaving.current = true;
    const el = ref.current;
    if (!el || !el.animate || navMotion().reduce) { stop(); setPresent(false); return; }
    play(el, false, false).then(() => { if (leaving.current) setPresent(false); }, () => { });
  };

  React.useEffect(() => {
    if (show) {
      if (leaving.current && present && ref.current) {
        // Back before it had gone: turn round from wherever the exit had reached.
        leaving.current = false;
        const el = ref.current;
        if (el.animate && !navMotion().reduce) play(el, true, false).catch(() => { });
        else stop();
      } else if (!present) {
        leaving.current = false;
        setPresent(true);
      }
    } else if (present) {
      leave();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);

  // The arrival, before the first paint of the mounted button, so it is never on screen at rest first.
  React.useLayoutEffect(() => {
    const was = wasPresent.current;
    wasPresent.current = present;
    if (!present) return undefined;
    const el = ref.current;
    if (!was && el && el.animate && !navMotion().reduce) play(el, true, true).catch(() => { });
    return stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [present]);

  if (!present) return null;
  return (
    /* data-tour="new" — the tour's last stop anchors here. An attribute rather than a class because
       it is a HOOK, not a style: the button is unchanged by it, and methods/tour.js is the only
       reader. It sits on the control itself so the ring follows the pill's own corner. */
    <B006 btnRef={ref} data-emphasis="primary" data-tour="new"
      onClick={() => { if (!leaving.current) onPress(); }}
      style={sx("font-family: Neue Montreal; font-size:var(--fs-detail); letter-spacing:var(--track-flat)")}
      label={<span style={sx('display:flex;align-items:center;gap:2px;height:14px')}><span aria-hidden="true" style={NAV_PLUS_SLOT}><IconPlus size={16} /></span><B006Text>New Palette</B006Text></span>} />
  );
}

/* THE GLASS, as seven stacked layers (Osmo Supply — Glass Effect / Background).
   Ported verbatim: the class names are the resource's, the order is the resource's, and every layer
   is load-bearing. `__fill` is the tint, `__fill-burn` deepens it through colour-burn, the two
   `__highlight-*` are the lit top-left and the falling-away bottom-right, the two `__edge-*` draw
   the rim, and `__inner-glow` is the light caught inside the pane. Take one out and the pane stops
   reading as a thickness and goes back to being a blurred rectangle.

   It carries no attributes of its own — no aria-hidden, no data hook. Seven empty divs are already
   nothing to a screen reader, and the effect is styled entirely from .glass-effect in global.css.

   Rendered as the FIRST child of the bar it fills, which is what puts it behind the bar's own
   content; .glass-bar in global.css is the two lines that make that stacking explicit. */
export function GlassEffect() {
  return (
    <div className="glass-effect">
      <div className="glass-effect__fill"></div>
      <div className="glass-effect__fill-burn"></div>
      <div className="glass-effect__highlight-soft"></div>
      <div className="glass-effect__highlight-strong"></div>
      <div className="glass-effect__edge-light"></div>
      <div className="glass-effect__edge-dark"></div>
      <div className="glass-effect__inner-glow"></div>
    </div>
  );
}

/* THE APP'S ONE SWITCH, since 19.09.26 (audit U5, by request: "drop the off to match the theme
   switch"). The theme switch and Export's Semantic Scaffold both draw this track inside a button-006
   carrying data-switch, role="switch" and aria-checked; the scaffold's was a ringed pill reading OFF.
   (Passing Only, in the contrast checker, stays a pill by request.) The theme-switch__ class names
   are where it started.
   THE SWITCH STANDS ALONE: a track and a knob, no word beside them and no ring around them
   (15.09.26, by request). Position is the state, start for off and end for on; colours, states and
   the hover live in global.css (.theme-switch__track), keyed off the button's own aria-checked, so
   there is one source for what "on" looks like. The name a screen reader hears is the button's
   aria-label or its words; the state is aria-checked. */
export function SwitchTrack() {
  return (
    <span className="theme-switch__row">
      <span aria-hidden="true" className="theme-switch__track">
        <span className="theme-switch__dot"></span>
      </span>
    </span>
  );
}

// The one display preference, in the same control on every route. The legal routes carry it because
// they are the same document now: a reader who dims the tool and then opens the privacy statement
// would otherwise watch it come back at full brightness, which reads as a different site rather than
// a different page.
export function ThemeSwitch({ vals }) {
  return (
    <B006
      data-emphasis="secondary"
      /* The hook the switch's styles are scoped to — see .button-006[data-switch] in global.css. It
         was data-theme-switch until the other two switches took the same form (19.09.26, audit U5). */
      data-switch=""
      data-focus="chrome"
      role="switch"
      aria-checked={vals.isDark}
      onClick={vals.toggleTheme}
      aria-label="Dark theme"
      /* The pointer's version of the name, now that nothing is written beside the track. */
      title="Dark theme"
      label={<SwitchTrack />}
    />
  );
}

/* IN-BODY LINKS, for the three routes whose copy is injected HTML.

   These pages set their markup with dangerouslySetInnerHTML, so their anchors are not React elements
   and renderVals.navigate — an onClick handler with a currentTarget contract — can never reach them.
   One delegated listener on the route's <main> gives every one of them the treatment a link in JSX
   already gets: a plain left-click becomes the wiped swap, and a modified click, a middle-click, a
   new tab, a crawler or a reader with no JS follows the real address.

   It lives here rather than on a page because it was written for About and the two legal statements
   were left without it — so `Privacy` inside the terms document, and the three links back the other
   way, full-reloaded the site: no cover, no brand beat, GSAP and both .otf faces fetched again. Two
   navigation models depending on which document you happened to be standing in. One listener, three
   routes, one model.

   The guards are navigate()'s, restated because the anchor is resolved with closest() here rather
   than being the listener's own currentTarget. Anything inside the page that owns its own click —
   the section dock's in-page jumps, the legal TOC's — stops propagation, which is what the
   defaultPrevented check and their own stopPropagation together protect. */
export function docLinkHandler(vals) {
  return (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    // The privacy statement's door back to the analytics question. Injected HTML cannot carry an
    // onClick, so it is marked with an attribute and opened from here; its href is only a fallback.
    const consent = e.target && e.target.closest ? e.target.closest('[data-consent-open]') : null;
    if (consent && vals.openConsent) { e.preventDefault(); vals.openConsent(consent); return; }
    // /about's closing act opens the tool rather than the front page; its href stays / for everything
    // a router does not take. See openCreate in methods/misc.js.
    const create = e.target && e.target.closest ? e.target.closest('[data-open-create]') : null;
    if (create && vals.openCreate) { e.preventDefault(); vals.openCreate(); return; }
    const a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!a || a.hasAttribute('download') || (a.target && a.target !== '_self')) return;
    let url;
    try { url = new URL(a.getAttribute('href'), location.href); } catch (err) { return; }
    if (url.origin !== location.origin) return;
    // An in-page anchor is not a route change. Left alone it would resolve to this same pathname and
    // be swallowed by navigateTo's own no-op guard, taking the jump with it.
    if (url.pathname === location.pathname && url.hash) return;
    e.preventDefault();
    vals.navigateTo(url.pathname);
  };
}

/* THE DOCUMENT MASTHEAD — /about, /privacy, /terms.
   The mark is a link home rather than the app's fixed [data-logo] button: these routes are read by
   people who arrived from a search result as often as from the tool, and on a document that scrolls
   the mark has to sit in a bar rather than fly over the content. The theme switch stands in the same
   corner it does in the app.

   It lived in LegalPage until About needed the same bar. Duplicating it would have been eleven lines
   of JSX and a second set of class names for one object — which is the shape every drift on this site
   has started as. Styles are in doc.css beside the route's own base rules; scripts/prerender.mjs
   restates this markup for the no-JS floor and has to be kept in step with it. */
/* `floating` and `onField` are the phone's front page (15.09.26, by request: the new bar was missing
   there). The story is a full-screen hole onto the colour field, so the bar cannot stand in the flow
   above it the way it does over a document; it floats fixed on the same lines instead, and over the
   field it takes the landing's thinner light-mode pane. Everything else, the hide on the way down
   included, is this masthead exactly. */
/* `onMark` replaces the mark's route change where "/" is the page already on screen: the phone's
   front page, whose mark goes back to the start instead (returnToStoryStart in persistence.js).
   A modified click still opens "/" in a new tab, as the link does everywhere. */
export function DocHead({ vals, floating, onField, onMark }) {
  /* The bar leaves on the way down and comes back on the way up — see methods/docHeadHide.js for
     why that is here rather than on the app's header, and why it is a transition rather than a
     tween. Mounted from DocHead itself, not from the two pages that render it, so the behaviour
     cannot drift between /about and the legal routes or be forgotten by a fourth document. init
     returns its own teardown, which is exactly what useEffect wants back. */
  const barRef = useRef(null);
  useEffect(() => initDocHeadHide(barRef.current), []);

  return (
    <div className={'doc-head glass-bar' + (floating ? ' doc-head--float' : '')} {...(onField ? { 'data-on-landing': '1' } : {})} ref={barRef}>
      <GlassEffect />
      <span className="doc-head__theme"><ThemeSwitch vals={vals} /></span>
      <span className="doc-head__mark">
        <a href="/" onClick={onMark ? (e) => {
          if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
          e.preventDefault(); onMark();
        } : vals.navigate} aria-label="Atmos Gallery" data-focus="chrome">
          <span className="mark" role="img" aria-label="Atmos Gallery"></span>
        </a>
      </span>
      {/* BACK UP AND RESTORE, ON EVERY PAGE THE BAR IS ON (by request, 15.09.26): the same two links, the
          same handlers and the same style as the tool's bar, in the third track the grid always had.
          Not below the tool's own width (vals.narrow): the library they act on is the tool's, and a
          phone is offered the tool nowhere else either — and at a phone's width there is no room for
          them beside the centred mark. Not in the prerendered masthead, for the switch's reason: a
          control that does nothing without a script is worse than none. The file input is the tool's
          ref; only one of the two bars is ever mounted. */}
      {/* NEW PALETTE LEADS THE TRACK, AS IT DOES IN THE TOOL'S BAR (by request, 15.09.26). Here it
          opens the create page in its default state: openCreate resets what the tool was holding and
          crosses to it, the same act as Explore Atmos. Unlike Back Up and Restore it needs no library,
          so it stands whether or not there is anything to back up. Not below the tool's width, for
          the same reason as the pair: there is no create page there to open. */}
      {!vals.narrow && (
        <span className="doc-head__acts">
          <NavNewPalette show onPress={vals.openCreate} />
          {vals.showProjectsBar && (<>
            <button type="button" data-ix="press" data-focus="chrome" data-tier3-action="" onClick={vals.backUpLibrary} aria-label="Back up your whole library to a file" style={vals.tier3BtnStyle}><TextSwap>Back Up</TextSwap></button>
            <button type="button" data-ix="press" data-focus="chrome" data-tier3-action="" onClick={vals.onRestore} aria-label="Restore palettes from a backup file" style={vals.tier3BtnStyle}><TextSwap>Restore</TextSwap></button>
            <input ref={vals.projectFileRef} type="file" accept="application/json,.json" onChange={vals.onProjectFileChange} tabIndex={-1} aria-hidden="true" style={{ display: 'none' }} />
          </>)}
        </span>
      )}
    </div>
  );
}
