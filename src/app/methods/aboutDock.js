/* Osmo Supply — Section Anchor Dock.

   The mechanic is the resource's own and is kept whole: one pill at the foot of the viewport showing
   the section you are in, morphing open into the full list, with a marker that travels between links
   and a label that swaps on a vertical mask as the active section changes. The structure, the
   sequencing, the hide zones and every data-* name are the resource's and are left alone.

   WHAT IT IS FOR: /about is fourteen sections and roughly twelve screens of scrolling, arranged as
   one argument that runs start to finish. A reader who has been carried that far has no way of
   knowing how much is left, and no way back to the section they half-remember. The page already
   numbers its sections; this is the number made navigable.

   [ATMOS 1] THE LIST IS TWO LEVELS, and this is the one structural change. The resource ships a flat
   list of five, which is a list you can read at a glance at the bottom of a screen. Fourteen is not:
   at the resource's own row height that is a column standing off the foot of the viewport taller
   than the thing it is meant to be a shortcut to. The page's numbering already carries the answer —
   1.1 through 4.2 is four groups, not fourteen peers — so the dock shows the four and expands only
   the group you are currently reading. The groups are buttons rather than links: a group header that
   navigated would make the other ten sections reachable only by scrolling to them first.

   [ATMOS 2] THE PILL WEARS THE GLASS PANE, AND IT IS SQUARE. The resource paints #e9ecf6 on #161c33
   and builds itself out of radii — a 1.5em pill, 100em rows, a 100em lozenge. Neither survives: the
   colours are a palette this page is not allowed to introduce (every colour on /about was extracted
   from a photograph the page carries), and every surface on this site is square, which global.css
   states outright where .glass-effect declines the reference's own 4px. Tint, blur and boundary come
   from the shared pane; the ink is --on-surface and the marker is the ink, so the whole control
   flips with the theme and needs no light/dark rule of its own.

   [ATMOS 3] ANCHOR JUMPS GO THROUGH LENIS, for the reason legalToc.js records at its own [ATMOS 4]:
   this site scrolls through a Lenis instance that lives on the component, and a native anchor jump
   moves the document underneath it without telling it, leaving the smooth scroller's idea of where
   it is several screens out of date. The instance is handed in rather than read off a global.

   [ATMOS 4] SCOPED, AND IT HANDS BACK A DESTROY. The resource is a bare DOMContentLoaded call, which
   is all a static page ever needs; /about is a route that mounts and unmounts inside one document.
   Everything created here — triggers, listeners, the styles holding a state — is registered so it
   can be taken away again, or the next mount measures against detached sections.

   [ATMOS 5] gsap and ScrollTrigger are the vendored globals from index.html, not CDN tags and not
   imports. Missing either one, the dock stays the plain list of links [ATMOS 6] leaves in the markup.

   [ATMOS 6] THE FLOOR IS A TABLE OF CONTENTS. The resource hides its list in CSS and reveals it from
   JS, so no JS is a pill that never opens. Here the fixed positioning and the collapsing are applied
   only once this module has confirmed its dependencies, by setting data-dock-live on the nav — the
   same contract aboutStickyTitle uses. Without it the markup is what it reads as: a nav at the foot
   of the document listing all fourteen sections, which is worth having on its own.

   [ATMOS 7] REDUCED MOTION REMOVES THE TRAVEL RATHER THAN SPEEDING IT UP. The resource's dur() floors
   every duration to zero, which for the dock's own arrival means it blinks into existence at the top
   of section 1.1 — "surfaces arrive, never appear" failing in the one place on the page that is
   fixed to the viewport. A reader who has asked for less motion gets a dock that is simply there for
   the length of the argument, and the state changes inside it happen without animation.

   [ATMOS 8] THE BOX MOTION IS CSS, ON THE HOUSE TOKENS — the pill's width and height, the marker's
   travel, the group fold. This is the argument aboutPills.js makes at [ATMOS 10] for the same
   resource family and the same kind of box, and it applies here unchanged:

     · The resource's back.out(1.4)/back.out(2.5) overshoot their final values and spring back.
       Nothing in this system does that — --ease-fold, --ease-standard and --ease-entrance are all
       monotonic — and a bounce here read as a different product's motion.
     · --ease-fold at --dur-fold is THE curve for this, and global.css says so in as many words: it
       folded --ease-pill (the marker behind every segmented toggle) into --ease-fold (the disclosure
       fold) precisely because "a disclosure and a moving selection share one motion character".
       This component is both of those at once.
     · The token stays the single source, with no JS mirror of four bezier numbers to drift from it.
     · A CSS transition is interruptible mid-flight, which is what a control a reader hovers in and
       out of six times in a row actually needs; a tween restarts from wherever it was killed.

   What GSAP still drives is the staged sequence — the label mask, the row stagger, the dock's own
   arrival — which is what it is for.

   [ATMOS 9] THE SQUASH IS GONE. The resource scales the pill to 0.85 on every label change and the
   marker to 0.78 on every hop. global.css: "There is no --press-scale. A press changes the control's
   colour, never its geometry." That rule was written about buttons, but a marker that squashes as it
   moves is the same idea failing in the same way, and this is the only surface on the site that
   would have done it. */

function noop() { }

/* THE HOUSE MOTION SCALE, MIRRORED. motion.js owns DUR and EASE as properties on the app component,
   which a standalone route module cannot reach; global.css owns the same numbers as custom
   properties, which GSAP cannot read as an easing. So the handful this file needs are restated —
   the arrangement aboutCascade.js and aboutPills.js already use — and this comment is the contract:
   these values are not this file's to choose. Anything the CSS can own is left in about.css and
   does not appear here at all. */
const DUR = { fast: 0.18, state: 0.24, swap: 0.4, fold: 0.5, stagger: 0.05 };
const EASE = {
  standard: 'cubic-bezier(0.22,1,0.36,1)',
  entrance: 'cubic-bezier(0.16,1,0.3,1)',
  exit: 'cubic-bezier(0.4,0,1,1)',
};

/* Anchor jumps land here rather than flush under the masthead. about.css already gives
   section[id] a scroll-margin-top for native jumps; Lenis does not read scroll-margin, so the same
   air has to be stated as an offset. The 64px is .doc-head's height (doc.css). */
const JUMP_OFFSET = 96;

export function initSectionDock(root, options) {
  const opts = options || {};
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  if (!gsap || !ScrollTrigger || !root) return noop;
  try { gsap.registerPlugin(ScrollTrigger); } catch (e) { return noop; }

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const canHover = window.matchMedia('(hover: hover)');

  const teardown = [];

  // [ATMOS 4] `document` was the resource's scope. The mounted route's element now, so a build can
  // never reach markup belonging to a route on its way out.
  root.querySelectorAll('[data-section-dock-init]').forEach((dock) => {
    const pill = dock.querySelector('[data-section-dock-pill]');
    const toggle = dock.querySelector('[data-section-dock-toggle]');
    const labelWrap = dock.querySelector('[data-section-dock-label-wrap]');
    const list = dock.querySelector('[data-section-dock-list]');
    const indicator = dock.querySelector('[data-section-dock-indicator]');
    const links = list ? Array.from(list.querySelectorAll('[data-section-dock-link]')) : [];
    // [ATMOS 4] getElementById rather than querySelector(href): the sections are the route's, but the
    // ids are the document's, and href="#reading-oklch" is not a selector this needs to build.
    const sections = links.map((link) => document.getElementById((link.getAttribute('href') || '').slice(1)));
    const labelTemplate = labelWrap ? labelWrap.firstElementChild : null;
    if (!pill || !toggle || !labelWrap || !labelTemplate || !list || !indicator || links.length < 2 || sections.some((s) => !s)) return;

    /* [ATMOS 1] THE GROUPS, read out of the markup rather than parsed out of the numbering. Deriving
       them from "1.1" would make the dock's structure depend on the punctuation of a label, and the
       label is copy. Each group states what it holds. */
    const groups = Array.from(list.querySelectorAll('[data-dock-group]')).map((el) => ({
      el: el,
      toggle: el.querySelector('[data-dock-group-toggle]'),
      sub: el.querySelector('[data-dock-sub]'),
      // Indices into `links`, so the group of an active section is a lookup rather than a search.
      members: Array.from(el.querySelectorAll('[data-section-dock-link]')).map((l) => links.indexOf(l)),
    })).filter((g) => g.toggle && g.sub && g.members.length);
    if (!groups.length) return;

    const groupOf = (i) => {
      for (let g = 0; g < groups.length; g++) if (groups[g].members.indexOf(i) !== -1) return g;
      return 0;
    };

    let activeIndex = Math.max(0, links.findIndex((l) => l.hasAttribute('data-active')));
    let openGroup = -1;
    let open = false;
    let clearBoxT = null;

    const dur = (d) => (reduceMotion.matches ? 0 : d);

    // [ATMOS 6] Everything below this line assumes the CSS that only this attribute turns on.
    dock.setAttribute('data-dock-live', '1');
    teardown.push({ kill: () => dock.removeAttribute('data-dock-live') });

    /* [ATMOS 8] Placement that is not a state CHANGE — first paint, a resize, the font landing, or a
       group set while the dock is shut and nobody can see it. The attribute kills the transitions in
       about.css; the forced reflow is what commits the new values while they are still off, so
       removing it again cannot start an animation from the old ones. */
    function instant(fn) {
      dock.setAttribute('data-dock-instant', '1');
      try { fn(); } finally {
        void dock.offsetWidth;
        dock.removeAttribute('data-dock-instant');
      }
    }

    function syncLinkState() {
      links.forEach((l, i) => {
        l.toggleAttribute('data-active', i === activeIndex);
        if (i === activeIndex) l.setAttribute('aria-current', 'location');
        else l.removeAttribute('aria-current');
      });
    }

    function buildLabel(index) {
      const span = labelTemplate.cloneNode(false);
      span.innerHTML = links[index].innerHTML;
      return span;
    }

    function setLabel(index) {
      labelWrap.textContent = '';
      labelWrap.appendChild(buildLabel(index));
      gsap.set(labelWrap, { width: 'auto' });
    }

    /* ONE WORD REPLACING ANOTHER THROUGH A MASK, which is exactly what --dur-swap is defined as in
       global.css — "every hover swap on a button, sort header or footer link". The resource's own
       0.35/0.45 pair and its back.out(1.6) are both replaced by the one token. */
    function swapLabel(index, movingDown) {
      const olds = Array.from(labelWrap.children);
      const startWidth = labelWrap.offsetWidth;
      gsap.killTweensOf(labelWrap);
      olds.forEach((old) => {
        gsap.killTweensOf(old);
        gsap.set(old, { position: 'absolute', top: 0, left: 0 });
        gsap.to(old, {
          yPercent: movingDown ? -120 : 120,
          autoAlpha: 0,
          duration: dur(DUR.swap),
          ease: EASE.exit,
          onComplete: () => old.remove(),
        });
      });

      const next = buildLabel(index);
      labelWrap.appendChild(next);
      gsap.set(labelWrap, { width: 'auto' });
      const targetWidth = next.offsetWidth;

      gsap.fromTo(labelWrap,
        { width: startWidth },
        { width: targetWidth, duration: dur(DUR.swap), ease: EASE.standard });
      gsap.fromTo(next,
        { yPercent: movingDown ? 120 : -120, autoAlpha: 0 },
        { yPercent: 0, autoAlpha: 1, duration: dur(DUR.swap), ease: EASE.standard });
      // [ATMOS 9] The resource squashes the pill to scaleY 0.85 here. It does not any more.
    }

    /* ---- THE BOX, THE MARKER AND THE FOLD ----------------------------------------------------
       All three are written as inline values and animated by the transitions in about.css, so every
       one of them runs on --dur-fold / --ease-fold and they stay in lockstep by construction rather
       than by a shared onUpdate. See [ATMOS 8]. */

    function subTarget(g) {
      // scrollHeight reports the content height whatever the set height is, so this is readable
      // while the sub is collapsed to 0 or caught mid-fold.
      return g.sub.scrollHeight;
    }

    function applyGroupHeights(gi) {
      groups.forEach((g, i) => { g.sub.style.height = (i === gi ? subTarget(g) : 0) + 'px'; });
    }

    /* Run fn with the layout the dock is ABOUT to have, then put it back — all with transitions off,
       so nothing of it is ever painted. This is how the marker's destination and the pill's target
       size are known before the fold that produces them has started: all three then animate to
       values measured against the same finished layout, on the same curve, over the same duration. */
    function withHeights(gi, fn) {
      const prev = groups.map((g) => g.sub.style.height);
      instant(() => {
        applyGroupHeights(gi);
        fn();
        groups.forEach((g, i) => { g.sub.style.height = prev[i]; });
      });
    }

    function markerTo(r) {
      indicator.style.transform = 'translate(' + r.x + 'px,' + r.y + 'px)';
      indicator.style.width = r.w + 'px';
      indicator.style.height = r.h + 'px';
    }

    function rectFor(link) {
      return { x: link.offsetLeft, y: link.offsetTop, w: link.offsetWidth, h: link.offsetHeight };
    }

    function pillTo(w, h) {
      pill.style.width = w + 'px';
      pill.style.height = h + 'px';
    }

    function setGroup(gi, animate) {
      if (gi === openGroup) return;
      openGroup = gi;

      groups.forEach((g, i) => {
        const on = i === gi;
        g.toggle.setAttribute('aria-expanded', on ? 'true' : 'false');
        g.el.toggleAttribute('data-open', on);
        /* FOCUS COMES OUT BEFORE THE GROUP CLOSES. inert on an ancestor of the focused element blurs
           it, and a blur with no relatedTarget is indistinguishable from focus leaving the dock
           altogether — which is what onFocusOut below acts on, so the whole dock shut itself. The
           reader who met this was doing nothing exotic: tab into the list, then scroll far enough
           for the active section to change group. Focus lands on the closing group's own head, which
           keeps a place in the list rather than dumping it back at the top of the document. */
        if (!on && g.sub.contains(document.activeElement)) {
          try { g.toggle.focus({ preventScroll: true }); } catch (e) { g.toggle.focus(); }
        }
        g.sub.toggleAttribute('inert', !on);
      });

      // The active section can sit in a group the reader has collapsed by hand. Its row is folded
      // away in that state, and a marker parked on a folded row is a stray block.
      indicator.style.opacity = groupOf(activeIndex) === gi ? '1' : '0';

      if (!animate || reduceMotion.matches) {
        instant(() => {
          applyGroupHeights(gi);
          markerTo(rectFor(links[activeIndex]));
          if (open) pillTo(list.offsetWidth, list.offsetHeight);
        });
        return;
      }

      let target = null;
      let boxW = 0;
      let boxH = 0;
      withHeights(gi, () => {
        target = rectFor(links[activeIndex]);
        boxW = list.offsetWidth;
        boxH = list.offsetHeight;
      });
      applyGroupHeights(gi);
      markerTo(target);
      if (open) pillTo(boxW, boxH);
    }

    function setActive(index, movingDown) {
      if (index === activeIndex) return;
      activeIndex = index;
      syncLinkState();

      const gi = groupOf(index);
      const groupChanged = gi !== openGroup;
      setGroup(gi, open);

      if (open) {
        setLabel(index);
        // When the group changed, setGroup has already sent the marker to a destination measured
        // against the finished fold — it travels with the rows rather than after them.
        if (!groupChanged) markerTo(rectFor(links[index]));
      } else {
        swapLabel(index, movingDown);
        instant(() => markerTo(rectFor(links[index])));
      }
    }

    function openDock() {
      if (open) return;
      open = true;
      toggle.setAttribute('aria-expanded', 'true');
      if (clearBoxT) { clearTimeout(clearBoxT); clearBoxT = null; }

      // Pin the collapsed size first, with transitions off, or the pill has no width to grow FROM —
      // it is auto-sized while shut, and a transition needs two numbers.
      instant(() => {
        pillTo(toggle.offsetWidth, toggle.offsetHeight);
        markerTo(rectFor(links[activeIndex]));
      });

      list.style.visibility = 'inherit';
      pillTo(list.offsetWidth, list.offsetHeight);

      gsap.killTweensOf([toggle, list]);
      gsap.to(toggle, { autoAlpha: 0, duration: dur(DUR.fast), ease: EASE.exit });
      gsap.to(list, { opacity: 1, duration: dur(DUR.state), ease: EASE.standard });

      /* The rows rise as the list arrives. TRANSFORM ONLY — the resource staggers opacity too, and
         these rows now carry data-ix="cell", whose contract transitions opacity over --dur-chrome.
         A GSAP tween writing opacity every frame into a property CSS is also transitioning gives one
         lagging behind the other. The list's own fade already carries the appearance. */
      const others = links.filter((l, i) => i !== activeIndex);
      gsap.killTweensOf(others);
      gsap.fromTo(others,
        { yPercent: 35 },
        {
          yPercent: 0,
          duration: dur(DUR.state),
          ease: EASE.entrance,
          stagger: { each: dur(DUR.stagger), from: 'end' },
          clearProps: 'transform',
        });
    }

    function closeDock() {
      if (!open) return;
      open = false;
      toggle.setAttribute('aria-expanded', 'false');

      pillTo(toggle.offsetWidth, toggle.offsetHeight);

      gsap.killTweensOf([toggle, list]);
      gsap.to(list, { opacity: 0, duration: dur(DUR.fast), ease: EASE.exit });
      gsap.to(toggle, { autoAlpha: 1, duration: dur(DUR.state), ease: EASE.standard, delay: dur(DUR.fast) });

      /* Once the fold has run, the box goes back to being auto-sized. It has to: while the dock is
         shut the label swaps as you scroll, and a pill pinned to an explicit width would not follow
         the word that replaced it. */
      if (clearBoxT) clearTimeout(clearBoxT);
      clearBoxT = setTimeout(() => {
        clearBoxT = null;
        if (open) return;
        list.style.visibility = 'hidden';
        pill.style.width = '';
        pill.style.height = '';
        gsap.set(links, { clearProps: 'transform' });
      }, dur(DUR.fold) * 1000 + 60);
    }

    sections.forEach((section, i) => {
      teardown.push(ScrollTrigger.create({
        trigger: section,
        start: 'top 45%',
        end: 'bottom 45%',
        onToggle: (self) => {
          if (self.isActive) setActive(i, self.direction !== -1);
        },
      }));
    });

    let isHidden = true;
    let rangeTrigger = null;
    let hideTriggers = [];

    /* [ATMOS 7] No travel under reduced motion — see the head of this file. The dock still has to
       leave at the ends of the argument, or it sits over the closing statement and the footer. */
    if (reduceMotion.matches) gsap.set(dock, { autoAlpha: 0 });
    else gsap.set(dock, { yPercent: 35, autoAlpha: 0 });
    dock.toggleAttribute('data-hidden', true);

    function updateHidden() {
      const inRange = rangeTrigger ? rangeTrigger.isActive : true;
      const hidden = !inRange || hideTriggers.some((t) => t.isActive);

      if (hidden === isHidden) return;
      isHidden = hidden;
      if (hidden && open) closeDock();
      dock.toggleAttribute('data-hidden', hidden);
      gsap.to(dock, {
        yPercent: reduceMotion.matches ? 0 : (hidden ? 35 : 0),
        autoAlpha: hidden ? 0 : 1,
        duration: dur(DUR.state),
        ease: hidden ? EASE.exit : EASE.entrance,
      });
    }

    rangeTrigger = ScrollTrigger.create({
      trigger: sections[0],
      endTrigger: sections[sections.length - 1],
      start: 'top 45%',
      end: 'bottom 45%',
      onToggle: updateHidden,
    });
    teardown.push(rangeTrigger);

    // [ATMOS 4] document rather than root: the hide zones a dock cares about are the ones it would
    // otherwise cover, and on this site the footer is rendered by AppView outside the route's root.
    hideTriggers = Array.from(document.querySelectorAll('[data-section-dock-hide]')).map((zone) => {
      const offset = parseFloat(zone.getAttribute('data-section-dock-hide'));
      const line = 100 - gsap.utils.clamp(0, 100, Number.isNaN(offset) ? 10 : offset);
      return ScrollTrigger.create({
        trigger: zone,
        start: 'top ' + line + '%',
        end: 'bottom top',
        onToggle: updateHidden,
      });
    });
    hideTriggers.forEach((t) => teardown.push(t));

    /* [ATMOS 3] The jump goes through Lenis. preventDefault first: the native jump would move the
       document out from under the smooth scroller, which then eases back to where it thought it was.
       Without an instance — reduced motion turns Lenis off entirely (misc.js _initLenis) — this is
       the plain scroll the reader asked for. */
    const onLinkClick = (e) => {
      const link = e.target.closest ? e.target.closest('[data-section-dock-link]') : null;
      if (!link) return;
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const target = document.getElementById((link.getAttribute('href') || '').slice(1));
      if (!target) return;
      e.preventDefault();
      // [ATMOS 4] stopPropagation, or AboutPage's own delegated anchor handler treats this in-page
      // jump as a route change and wipes to /about again.
      e.stopPropagation();
      closeDock();
      const lenis = opts.lenis;
      if (lenis && typeof lenis.scrollTo === 'function') {
        lenis.scrollTo(target, { offset: -JUMP_OFFSET });
      } else {
        const y = target.getBoundingClientRect().top + window.scrollY - JUMP_OFFSET;
        window.scrollTo({ top: y, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
      }
    };
    list.addEventListener('click', onLinkClick);
    teardown.push({ kill: () => list.removeEventListener('click', onLinkClick) });

    /* [ATMOS 1] A group header expands its own group and navigates nowhere. This is the one way the
       expanded group is not the group being read, and it is what makes the other ten sections
       reachable without scrolling to them first. The next section boundary takes it back. */
    const onGroupClick = (e) => {
      const btn = e.target.closest ? e.target.closest('[data-dock-group-toggle]') : null;
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      const gi = groups.findIndex((g) => g.toggle === btn);
      if (gi !== -1) setGroup(gi, true);
    };
    list.addEventListener('click', onGroupClick);
    teardown.push({ kill: () => list.removeEventListener('click', onGroupClick) });

    const onToggleClick = () => {
      if (open) {
        closeDock();
        return;
      }
      openDock();
      links[activeIndex].focus();
    };
    toggle.addEventListener('click', onToggleClick);
    teardown.push({ kill: () => toggle.removeEventListener('click', onToggleClick) });

    if (canHover.matches) {
      dock.addEventListener('mouseenter', openDock);
      dock.addEventListener('mouseleave', closeDock);
      teardown.push({
        kill: () => {
          dock.removeEventListener('mouseenter', openDock);
          dock.removeEventListener('mouseleave', closeDock);
        },
      });
    }

    const onKeydown = (event) => {
      if (event.key === 'Escape' && open) {
        closeDock();
        gsap.delayedCall(dur(DUR.fast), () => toggle.focus());
      }
    };
    const onDocClick = (event) => {
      if (open && !dock.contains(event.target)) closeDock();
    };
    const onFocusOut = (event) => {
      if (open && !dock.contains(event.relatedTarget)) closeDock();
    };
    document.addEventListener('keydown', onKeydown);
    document.addEventListener('click', onDocClick);
    dock.addEventListener('focusout', onFocusOut);
    teardown.push({
      kill: () => {
        document.removeEventListener('keydown', onKeydown);
        document.removeEventListener('click', onDocClick);
        dock.removeEventListener('focusout', onFocusOut);
      },
    });

    function refreshLayout() {
      setLabel(activeIndex);
      instant(() => {
        // The open group's height is a resolved number, and the number changes when the rows
        // rewrap or the font lands. Re-stated before anything is measured against it.
        applyGroupHeights(openGroup);
        markerTo(rectFor(links[activeIndex]));
        if (open) pillTo(list.offsetWidth, list.offsetHeight);
      });
    }
    window.addEventListener('resize', refreshLayout);
    teardown.push({ kill: () => window.removeEventListener('resize', refreshLayout) });

    // [ATMOS 4] Guarded on still being mounted: this promise can settle after the reader has left.
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => { if (dock.isConnected) refreshLayout(); });
    }

    syncLinkState();
    setGroup(groupOf(activeIndex), false);
    refreshLayout();

    // The box, the marker and the fold are all inline styles now, and the label mask and the dock's
    // arrival are GSAP's. An unmount that left either would hand the next mount a pill frozen at
    // whatever size the last interaction ended on.
    teardown.push({
      kill: () => {
        if (clearBoxT) { clearTimeout(clearBoxT); clearBoxT = null; }
        gsap.killTweensOf([dock, pill, list, toggle, labelWrap].concat(links));
        gsap.set([list, toggle], { clearProps: 'all' });
        gsap.set(dock, { clearProps: 'all' });
        gsap.set(links, { clearProps: 'transform' });
        pill.style.width = '';
        pill.style.height = '';
        indicator.removeAttribute('style');
        groups.forEach((g) => { g.sub.style.height = ''; g.sub.removeAttribute('inert'); });
        dock.removeAttribute('data-hidden');
        dock.removeAttribute('data-dock-instant');
      },
    });
  });

  return function destroy() {
    teardown.forEach((t) => { try { t.kill(); } catch (e) { } });
    teardown.length = 0;
  };
}

export default initSectionDock;
