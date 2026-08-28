// Overlay surfaces: fullscreen palette detail (reversible band-wipe timeline), delete-with-undo
// toast, contrast checker drawer, colour-harmonies drawer, and the token-export dialog.
// The same content-addressing the extraction uses, so a harmony saved as a palette gets an id of
// the same KIND as a generated one rather than a timestamp with a different shape.
import { hashBytes } from '../../lib/hash.js';

export const overlayMethods = {
  // ================= fullscreen detail =================
  // Freeze the universe under the detail so the originating tile stays put (stable return rect).
  freezeUniverse() { if (this._ticker && window.gsap) { window.gsap.ticker.remove(this._ticker); this._frozen = true; } },
  resumeUniverse() { if (this._frozen && this._ticker && window.gsap) { window.gsap.ticker.add(this._ticker); this._frozen = false; } },

  openOverlay(p, tileEl) {
    // One overlay session at a time. state.overlay is set asynchronously, so two activations in the
    // same tick would BOTH pass a state check — this latch is synchronous. It spans open → fully
    // closed, which also blocks re-opening during a close reversal: buildOverlayTimeline would
    // overwrite _ovTl there, orphaning the reversing timeline whose onReverseComplete then tears the
    // new overlay straight back down. Every teardown path clears it (see _finishOverlayClose,
    // deletePalette, and _resetIntroState) so it can never strand.
    if (this._ovOpen) return;
    this._ovOpen = true;
    this._lastFocus = document.activeElement;
    this._openTileEl = tileEl || null;
    this._ovDone = false; this._ovBack = null;
    // freeze the pan so the field is stable beneath the dialog until close completes
    if (!this._reduce && window.gsap && tileEl) this.freezeUniverse();
    this.setState({ overlay: p, announce: 'Opened ' + p.name + ' detail. Mood: ' + p.descriptors.join(', ') + '. Press Escape to close.' }, () => {
      requestAnimationFrame(() => {
        const root = this._detailRoot();
        if (root) { const btn = root.querySelector('button'); if (btn) try { btn.focus(); } catch (e) { } }   // focus immediately — never delayed by the morph
        try { this.buildOverlayTimeline(); if (this._ovTl) this._ovTl.play(0); } catch (e) { }
      });
    });
  },
  // Build ONE reversible timeline on open — play forward on open, reverse() on close.
  // The click-zoom lightbox is ALSO a [role=dialog][aria-modal] and sits earlier in the DOM —
  // always scope detail-overlay queries to the dialog that actually holds the palette bands.
  _detailRoot() { return [...document.querySelectorAll('[role="dialog"][aria-modal="true"]')].find((d) => !d.hasAttribute('data-click-zoom-lightbox') && d.querySelector('[data-oband]')) || null; },
  buildOverlayTimeline() {
    this._ovTl = null;
    const g = window.gsap, root = this._detailRoot();
    if (!g || !root) return;
    const bands = [...root.querySelectorAll('[data-oband]')];
    const chrome = [...root.querySelectorAll('[data-ochrome]')];
    const tl = g.timeline({ paused: true, onReverseComplete: () => this._finishOverlayClose() });
    // reduced-motion (or no bands): a single two-step opacity fade — forward on open, reverse on close
    if (this._reduce || !bands.length) { tl.from(root, { opacity: 0, duration: .2, ease: 'none' }, 0); this._ovTl = tl; return; }
    // the signature band wipe — same language as the result stage: bands rise from the bottom,
    // staggered left-to-right; reverse() = chrome out, bands sink, backdrop last
    g.set(bands, { transformOrigin: 'bottom center' });
    tl.from(root, { opacity: 0, duration: .18, ease: 'none' }, 0);   // backdrop first in / last out
    tl.from(bands, { scaleY: 0, duration: this.DUR.reveal, ease: this.EASE.entrance, stagger: .06 }, .08);
    // chrome (header, footer, value rows) fades in a beat after — colour leads; on reverse it exits first
    if (chrome.length) tl.from(chrome, { opacity: 0, duration: .4, ease: this.EASE.entrance, stagger: .02 }, this.DUR.reveal * 0.45);
    this._ovTl = tl;
  },
  closeOverlay() {
    // focus returns in the completion callback (never before), so it can't re-render mid-close
    const tileFocusable = this._openTileEl && this._openTileEl.getAttribute('tabindex') !== '-1' && !this._openTileEl.getAttribute('aria-hidden');
    this._ovBack = tileFocusable ? this._openTileEl : this._lastFocus;
    if (!this._ovTl) { this._finishOverlayClose(); return; }   // no timeline (shouldn't happen) → last-resort unmount
    this._ovTl.reverse();                                    // close IS open reversed — nothing hand-written
    // one generous safety fallback only, in case onReverseComplete never fires
    clearTimeout(this._closeGuard);
    this._closeGuard = setTimeout(() => this._finishOverlayClose(), (this._ovTl.duration() + 0.8) * 1000);
  },
  _finishOverlayClose() {
    // release the open latch BEFORE the _ovDone guard, so this function is unconditionally a
    // latch-release — a call arriving with _ovDone already true must still leave overlays openable
    this._ovOpen = false;
    if (this._ovDone) return; this._ovDone = true;
    clearTimeout(this._closeGuard);
    const back = this._ovBack;
    this._ovTl = null;
    this.setState({ overlay: null, announce: 'Closed palette detail.' }, () => {
      this.resumeUniverse();
      if (back && back.focus) try { back.focus(); } catch (e) { }
      this._openTileEl = null; this._ovBack = null;
    });
  },
  trapFocus(e) {
    if (e.key !== 'Tab') return; const root = [...document.querySelectorAll('[role="dialog"][aria-modal="true"]')].find((d) => d.offsetParent !== null) || this._detailRoot(); if (!root) return;
    const f = [...root.querySelectorAll('button,[href],input,[tabindex]:not([tabindex="-1"])')].filter((n) => !n.disabled && n.offsetParent !== null);
    if (!f.length) return; const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  },

  // ===== delete with undo (reversible, no confirm dialog) =====
  deletePalette(id, rowEl) {
    const s = this.state;
    const idx = s.feed.findIndex((p) => p.id === id);
    if (idx < 0) return;
    const removed = s.feed[idx];
    const g = window.gsap;
    const commit = () => {
      const feed = s.feed.slice(0, idx).concat(s.feed.slice(idx + 1));
      const patch = { feed };
      if (s.current && s.current.id === id) {
        const next = feed[idx] || feed[idx - 1] || null;
        if (next) { patch.current = next; patch.imageUrl = this.dispUrl(next); patch.stage = 'result'; }
        else { patch.current = null; patch.imageUrl = null; patch.stage = 'upload'; }
      }
      const overlayDeleted = s.overlay && s.overlay.id === id;
      if (overlayDeleted) { patch.overlay = null; this._ovTl = null; this._ovDone = true; this._ovOpen = false; this._openTileEl = null; }
      this._deleted = { palette: removed, index: idx };
      patch.toast = { name: removed.name };
      patch.announce = 'Palette ' + removed.name + ' deleted. Undo available.';
      this.setState(patch, () => {
        this.persist({ immediate: true });
        this._toastIn();
        if (overlayDeleted) this.resumeUniverse();
        requestAnimationFrame(() => {
          if (this.state.feedView === 'grid') { this.buildUniverse(); }
          const wrap = document.querySelector('[data-list-wrap]');
          const rows = wrap ? [...wrap.querySelectorAll('[data-row]')] : [];
          // the row is a surface now; its focusable is the stretched hit button inside
          const rowEl = rows.length ? rows[Math.min(idx, rows.length - 1)] : null;
          const focusTarget = rowEl ? (rowEl.querySelector('[data-row-hit]') || rowEl) : null;
          if (focusTarget && focusTarget.focus) { try { focusTarget.focus(); } catch (e) { } }
          else { const u = document.querySelector('[data-undo-btn]'); if (u) try { u.focus(); } catch (e) { } }
        });
      });
      // NO TIMER. The toast carries an ACTION — it is the only route to undoing a permanent
      // deletion of data that exists nowhere but this browser — and an action-bearing toast that
      // dismisses itself is a race against the reader (WCAG 2.2.1; it lost that race twice during
      // the 03.08.26 audit). It stays until the user acts: Undo restores, Dismiss (the ✕) lets it
      // go, and the next deletion replaces it. Info-only notices (showNotice) keep their timer —
      // nothing is lost when one of those goes unread.
    };
    if (!this._reduce && g && rowEl && s.feedView === 'list') {
      g.set(rowEl, { height: rowEl.offsetHeight, overflow: 'hidden' });
      g.to(rowEl, { height: 0, opacity: 0, duration: this.DUR.state, ease: this.EASE.exit, onComplete: commit });
    } else { commit(); }
  },
  undoDelete() {
    if (this._deletedProject) {
      const dp = this._deletedProject; this._deletedProject = null;
      this.setState((st) => { const projects = st.projects.slice(); projects.splice(Math.min(dp.index, projects.length), 0, dp.project); const feed = st.feed.map((p) => dp.palIds.indexOf(p.id) >= 0 ? Object.assign({}, p, { projectId: dp.project.id }) : p); return { projects, feed, announce: 'Restored project ' + dp.project.name + '.' }; }, () => { this.persist({ immediate: true }); this._dismissToast(); });
      return;
    }
    const d = this._deleted; this._deleted = null;
    if (!d) { this._dismissToast(); return; }
    this.setState((st) => { const feed = st.feed.slice(); feed.splice(Math.min(d.index, feed.length), 0, d.palette); return { feed, announce: 'Restored ' + d.palette.name + '.' }; }, () => {
      this.persist({ immediate: true });
      if (this.state.feedView === 'grid') this.buildUniverse();
      this._dismissToast();
    });
  },
  // toast enter/exit — fade + small slide, --ease-standard; instant under reduced motion
  _toastIn() { const g = window.gsap; if (this._reduce || !g) return; const el = document.querySelector('[data-toast]'); if (el) g.from(el, { opacity: 0, y: 16, duration: this.DUR.state, ease: this.EASE.entrance, clearProps: 'transform' }); },
  _dismissToast() { const g = window.gsap; const el = document.querySelector('[data-toast]'); const clear = () => this.setState({ toast: null }); if (this._reduce || !g || !el) { clear(); return; } g.to(el, { opacity: 0, y: 16, duration: this.DUR.state, ease: this.EASE.exit, onComplete: clear }); },
  // The ✕ on the toast: letting the undo go is a decision, so it discards the held record — the
  // same forfeit the old timer performed silently. If focus was inside the toast it would die with
  // it (the control disappears mid-press), so it is handed to the first row's own hit surface —
  // the list the deletion just edited; a mouse user's focus, elsewhere, is left alone.
  dismissUndoToast() {
    this._deleted = null; this._deletedProject = null;
    const el = document.querySelector('[data-toast]');
    const hadFocus = !!(el && el.contains(document.activeElement));
    this._dismissToast();
    if (hadFocus) { const r = document.querySelector('[data-row-hit]') || document.querySelector('[data-facet-btn]'); if (r) try { r.focus(); } catch (e) { } }
  },

  // ===== contrast checker (opt-in surface over the current palette) =====
  contrastPalette() { const s = this.state; return s.overlay || s.current || (s.feed && s.feed[0]) || null; },
  openContrast() {
    const p = this.contrastPalette(); if (!p) return; this._contrastBack = document.activeElement; this._cxDone = false;
    const sm = this.contrastSummary(p);
    this.setState({ contrast: true, announce: 'Contrast checker opened for ' + p.name + '. ' + sm.aa + ' of ' + sm.total + ' pairs pass AA.' }, () => {
      requestAnimationFrame(() => {
        const d = document.querySelector('[data-contrast-dialog]');
        if (d) { const b = d.querySelector('button'); if (b) try { b.focus(); } catch (e) { } }   // focus immediately — never delayed by the slide
        try { this.buildContrastTimeline(); if (this._cxTl) this._cxTl.play(0); this._revealDrawerText('[data-contrast-dialog]'); } catch (e) { }
      });
    });
  },
  // ===== THE ONE ARRIVAL SCHEDULE =====
  // Every right-hand drawer is built through here, which is the whole point: the review's finding
  // was not that these surfaces were choreographed but that they were choreographed differently and
  // finished at visibly different times. Three hand-written timelines that happened to agree is how
  // that happened; one function they all call is how it stops.
  //
  // SEQUENTIAL, AND SEAMLESS — which are two requirements pulling against each other, and the
  // overlaps are where they meet. Nothing waits for the thing before it to finish: the blocks start
  // while the panel is still travelling (0.22 of the way through it), each block's cells start
  // while the block itself is still coming up, and the masked line reveal on its copy runs
  // underneath both. Read in order, with no seam between the stages, because there is no moment
  // when only one of them is moving.
  //
  // ONE CLOCK PER BLOCK, which is what this rewrite is. The schedule used to be three flat tweens
  // over three flat lists — every section on one stagger, every cell on another, every rule on a
  // third — and all three were timed against the PANEL rather than against each other. Two things
  // followed from that, and both of them read as a panel that arrives all at once:
  //
  //   · the beat between blocks was `overlayStep * 2` (80ms) while a block took 560ms to uncover,
  //     so five of the contrast drawer's six blocks were always moving together;
  //   · the cells all began at a fixed 0.32 of the panel whatever block they were in, so the
  //     matrix's rows were already sweeping while the two blocks above them were still arriving.
  //
  // Now `at[i]` is a block's own moment, and everything that belongs to that block — its rows, its
  // drawn rules, and (in _revealDrawerText) its masked lines — hangs off it. The panel therefore
  // reads strictly top to bottom whatever it happens to hold, and the gap is legible because a
  // block's own reveal was shortened to pay for it: same total, more sequence.
  //
  // THE BLOCKS FADE; ONLY COPY IS MASKED. Every part of these panels used to arrive through the
  // same clip-path wipe the result stage uses on its bands, on the argument that a mask says the
  // content was always there and is being uncovered. Running it on the boxes AND on the words
  // inside them turned out to be the problem: one mechanic doing two jobs at two scales, so a
  // block's wipe and its own text's wipe read as two reveals stacked in the same place rather than
  // as one sequence. The masked line reveal is now the surface's ONE piece of special handling and
  // it belongs to copy alone — the boxes around it simply fade up, in order, underneath it.
  //
  // A fade, not an appearance: each block carries a 10px rise so it arrives rather than switches
  // on, which is the difference the rest of the app's surfaces are held to.
  //
  // Every element is in the DOM and semantic before any of it starts, so motion never gates what a
  // screen reader or a keyboard can reach.
  _drawerIn(tl, root, backdrop, secSel, cellSel) {
    const g = window.gsap;
    const D = this.DUR.overlay, E = this.EASE.overlay, F = E;
    if (this._reduce) {
      if (backdrop) tl.from(backdrop, { opacity: 0, duration: .12, ease: 'none' }, 0);
      tl.from(root, { opacity: 0, duration: .12, ease: 'none' }, 0);
      return tl;
    }
    const secs = secSel ? [...root.querySelectorAll(secSel)] : [];
    const cells = cellSel ? [...root.querySelectorAll(cellSel)] : [];
    if (backdrop) tl.from(backdrop, { opacity: 0, duration: D, ease: F }, 0);
    tl.from(root, { xPercent: 100, duration: D, ease: E }, 0);
    // The block schedule. `blockDur` is deliberately shorter than the 0.7 band it replaced: the
    // time did not leave the panel, it moved out of each block's own reveal and into the gaps
    // between blocks, which is the only way to buy a readable sequence without lengthening the
    // arrival. The step is capped so that a drawer with a lot of blocks compresses rather than
    // growing a tail — the contrast and harmony drawers hold six and are under the cap, but the
    // schedule must not depend on that staying true.
    // A block's own fade is deliberately SHORTER than its items'. A cell's opacity multiplies with
    // its block's, and the reference this is tuned against does not have that problem — there, the
    // container sits at full strength and only the rows fade, so a row's curve is the only curve
    // acting on it. Here the block still has to cover its own furniture, so it cannot simply not
    // fade; making it the quick ground instead means it is effectively out of the way by 240ms and
    // the item's own full-length curve carries everything the reader actually watches.
    const blockDur = this.DUR.overlayArrive * 0.55;
    const itemDur = this.DUR.overlayArrive;
    const step = secs.length > 1 ? Math.min(this.DUR.overlayBlock, (D * 0.9) / (secs.length - 1)) : 0;
    const at = secs.map((_, i) => D * 0.22 + i * step);
    // THE WHOLE BLOCK, not the rows in it. For a revision only the rows arrived, on the reasoning
    // that a block is a box and what arrives is the content in it — which was true of the ROWS and
    // false of everything else the box holds. A group's eyebrow, the search field, the sort toggle
    // and every drawer header sat at full opacity from the first frame, riding in on the panel
    // while the rows beneath them arrived: half the panel appearing, half of it already there.
    // Fading the block covers its own furniture as well as its children.
    //
    // AND IT DOES NOT TRANSLATE. The block used to carry a 10px rise on EASE.overlay, which is the
    // masked line reveal's own gesture at a smaller scale — same curve, same axis, same moment, one
    // nested inside the other. Two Y-translations composing inside one box is what kept the mask
    // legible as a SECOND animation instead of reading as the words arriving with their block. The
    // boxes carry opacity only now; the mask is the only thing in the drawer that moves in Y, and
    // it belongs to copy. One mechanic per role, told apart by construction rather than by tuning
    // two timings against each other until they stop colliding.
    secs.forEach((sec, i) => {
      const t = at[i];
      tl.from(sec, { opacity: 0, duration: blockDur, ease: F, clearProps: 'opacity' }, t);
      // ITEMS ARRIVE ONE AT A TIME INSIDE THEIR BLOCK, and a block that holds a list has to say so
      // in the markup — this reads the hooks, it cannot infer them. Every list that lacked one used
      // to fade as a slab: five colour rows, seven harmony models and three control groups all
      // switching on together inside a box that was itself switching on. The matrix had hooks and
      // read correctly, which is exactly what made the others look unfinished beside it.
      //
      // A cell's opacity MULTIPLIES with its block's, so the two compose rather than compete: the
      // block comes up as the ground and the rows resolve out of it in order, one sweep instead of
      // two arrivals in the same box. Multiplication preserves the ordering, so the cascade is
      // legible even while the block behind it is still arriving.
      //
      // ITEMS ARE QUICKER THAN THEIR BLOCK — 0.62 of its length — because the block is the ground
      // and the marks on it should not take as long to land as the thing they land on.
      //
      // The beat is `overlayItem`, capped so the list cannot out-run the block holding it. That cap
      // is what lets one number serve a five-row list and a ten-cell matrix: five rows take the
      // full 64ms beat and read as a sequence, ten cells compress to 31ms and read as a sweep. A
      // list long enough to need more room gets a faster beat instead of a longer block.
      //
      // AND THE ARRIVAL SUSPENDS THE INTERACTION CONTRACT WHILE IT OWNS THE PROPERTY. `[data-ix]`
      // — every button, every segmented control — declares `transition: … opacity var(--dur-chrome)
      // …` in global.css. A GSAP opacity tween on one of those is therefore not animating the
      // element, it is animating a target that CSS then eases toward over 280ms: the control lags
      // its own tween by a quarter of a second, never reaches the value the stagger asked for at
      // the moment it asked, and the whole cascade goes soft exactly on the items that are
      // controls. It did not bite while the only hooked items were plain divs — the matrix — which
      // is why it could be introduced by adding hooks to seven harmony model buttons and read as
      // "the fade got laggy" rather than as a conflict.
      //
      // So the tween takes the property outright and hands it back on landing: `transition: none`
      // for the duration, restored by clearProps. The contract is untouched — it simply does not
      // get to run against an animation that is already animating the same thing.
      // THE WIPE IS OPT-IN, AND THE DEFAULT IS A FADE. A horizontal reveal is right for a bare
      // colour surface and wrong for everything that carries a word: it drags a hard edge across
      // a label, which is a second reading of the same text the drawer already reveals properly,
      // and on a control — the AA/AAA switch, the harmony models — it reads as the button being
      // built rather than arriving. Text is masked VERTICALLY by _maskLineReveal and by nothing
      // else; controls fade; only [data-ov-wipe] takes the horizontal mask.
      const own = cells.filter((c) => sec.contains(c));
      if (own.length) {
        const cellStep = own.length > 1 ? Math.min(this.DUR.overlayItem, (itemDur * 0.5) / (own.length - 1)) : 0;
        tl.set(own, { transition: 'none' }, 0);
        // One clock for both treatments, so a block holding a mix still reads as one sweep: an
        // element's offset is its position in the block's own order, whichever reveal it takes.
        own.forEach((c, ci) => {
          const at = t + this.DUR.overlayStep + ci * cellStep;
          if (c.hasAttribute('data-ov-wipe')) this._wipeIn(tl, [c], at, itemDur, 0, F);
          else tl.from(c, { opacity: 0, duration: itemDur, ease: F, clearProps: 'opacity,transition' }, at);
        });
      }
      this._drawRules(tl, [...sec.querySelectorAll('[data-ov-rule]')], t + this.DUR.overlayStep);
    });
    // Anything the block pass did not claim keeps the panel-relative schedule it always had. Today
    // that is nothing in these three drawers; it is here so a cell or a rule added outside a block
    // still arrives with the panel rather than silently never animating at all.
    const loose = cells.filter((c) => !secs.some((s) => s.contains(c)));
    if (loose.length) {
      tl.set(loose, { transition: 'none' }, 0);
      tl.from(loose, { opacity: 0, duration: itemDur, ease: F, stagger: this.DUR.overlayItem, clearProps: 'opacity,transition' }, D * 0.32);
    }
    this._drawRules(tl, [...root.querySelectorAll('[data-ov-rule]')].filter((r) => !secs.some((s) => s.contains(r))), D * 0.4);
    // Published for the two things that have to agree with this schedule but cannot be inside it:
    // the masked line reveal (which runs outside the reversible timeline — see _revealDrawerText)
    // and the exit (which has to leave in the same order it arrived — see _drawerOut). Keyed by the
    // root node, so a plan left behind by one drawer can never be read by another.
    this._blockPlan = { root, secs, at, blockDur };
    return tl;
  },
  // THE METHOD DISCLOSURE'S PROSE, arriving rather than being uncovered already written.
  //
  // The fold opens the BOX — it is a height tween, and height is layout, so it has to run or the
  // panel below would jump. The words are a separate question, and until now they were simply
  // sitting at full opacity inside a box that grew to expose them: the one place on this surface
  // where text appeared instead of arriving. Now the box opens and the lines rise into it through
  // the same masked line reveal the drawer titles use.
  //
  // The reveal is delayed past the fold rather than run with it. The fold clips (overflow:hidden
  // while the height animates), so lines rising at the same moment would be masked twice — once by
  // the growing box, once by their own line mask — and the second one would be invisible. Waiting
  // for the box means the mask you see is the text's own.
  toggleHarmonyMethod() {
    const opening = !this.state.harmonyMethodOpen;
    this.toggleFold('harmonyMethodOpen', '[data-hx-method]');
    if (!opening || this._reduce || !window.gsap) return;
    const foldDone = this.DUR.reveal * 0.62;
    requestAnimationFrame(() => {
      const box = document.querySelector('[data-hx-method]');
      if (!box) return;
      box.querySelectorAll('[data-drawer-split]').forEach((el, i) => {
        try { this._maskLineReveal(el, foldDone * 0.55 + i * this.DUR.overlayStep * 3, { duration: this.DUR.overlay, ease: this.EASE.overlay, stagger: this.DUR.overlayStep * 1.6 }); } catch (e) { }
      });
    });
  },
  /* _maskIn lived here — a clip-path wipe from the bottom edge, applied to every box in every
     utility overlay, and it is gone. It was the result stage's band mechanic borrowed for the
     drawers on the argument that a mask says the content was always there and is being uncovered,
     where a fade looks like the panel is being developed rather than assembled.

     What that argument missed is that these panels also mask their COPY, line by line, and the two
     ran in the same place at the same time: a block wiping up while the words inside it wiped up
     on their own clip. Two reveals stacked, not one sequence — and the box's wipe was the one with
     nothing to say, because a box has no content of its own to uncover.

     So the mask is now what it should always have been: the treatment for words, and only for
     words (_maskLineReveal, driven from _revealDrawerText). The boxes fade up in order underneath
     it, each with a 10px rise so it arrives rather than switches on. The bands and the detail
     overlay still wipe, and should — they are uncovering colour, which is exactly the thing a mask
     is for. */
  // THE ITEM WIPE — a horizontal mask, and the axis is the whole argument.
  //
  // This surface now has exactly two reveal mechanics and they are told apart by DIRECTION rather
  // than by kind. COPY is masked VERTICALLY: _maskLineReveal splits a paragraph into its rendered
  // lines and slides each one up from 110% inside its own overflow box. ITEMS are masked
  // HORIZONTALLY: a clip opens left to right across the row. Both are masks — which is what makes
  // the panel feel like one system — but no element is ever doing the same gesture as the element
  // inside it, which is what made the earlier version read as two animations stacked in one place.
  //
  // The earlier attempt failed on exactly that point. A clip-path wipe ran on every box in the
  // panel AND on the words inside them, both upward, both on the same curve: a block wiping up
  // while its own text wiped up. That was removed, and for a day items merely faded, which is
  // legible but says nothing — a fade is what you use when you have not decided what the thing is.
  // Changing the axis, rather than the mechanic, keeps the vocabulary and removes the collision.
  //
  // LEFT TO RIGHT, not right to left. 28k.studio — where this is ported from — pushes its content
  // to +102% and slides it back, so its reveal sweeps from the right. That reads correctly there
  // because the panel it lives in is full-bleed. Ours is a drawer that has just travelled in from
  // the right edge; a row uncovering right-to-left would run against the panel that carried it.
  // Opening from the left is the reading direction and the settling direction at once.
  //
  // A CLIP, NOT A WRAPPER. The reference gets its mask from an overflow box with a translating
  // child, which is the better mechanic and is not available here: these items are React-managed
  // interactive controls, and wrapping them at animation time means reconciliation, event handlers
  // and focus all take a risk for a visual detail. A clip on the element itself needs no DOM at
  // all. What it gives up is the content's own travel behind the mask edge — the reveal uncovers
  // in place rather than sliding — and that is the one honest difference from the reference.
  //
  // Opacity rides underneath. It is what covers the case a clip cannot: an item whose box is
  // wider than its ink still has to arrive, and a wipe across empty padding shows nothing.
  _wipeIn(tl, targets, at, dur, step, ease) {
    if (!targets || !targets.length) return;
    tl.fromTo(targets,
      { clipPath: 'inset(0% 100% 0% 0%)', opacity: 0 },
      { clipPath: 'inset(0% 0% 0% 0%)', opacity: 1, duration: dur, ease: ease || this.EASE.overlay,
        stagger: step, clearProps: 'clipPath,opacity,transition' },
      at);
  },
  // THE GROUP DIVIDERS, DRAWING. Added to whichever timeline is arriving rather than fired beside
  // it, so they reverse with everything else on close and cannot drift out of step on open.
  //
  // Left to right on the same curve, which is the mechanic the result view's metadata rules already
  // use — structure draws in this app. `at` puts a rule one step behind the block it belongs to: a
  // rule that lands before its content has arrived is a line around nothing, and one that lands
  // after reads as an afterthought being ruled off.
  //
  // Row hairlines are deliberately NOT here. A separator between two rows belongs to its row and
  // fades in with it; drawing it independently would make a list read as two things arriving.
  //
  // It takes a LIST rather than a scope to search, because the rules of one block now draw with
  // that block: a single query over the whole panel would put every rule on one moment again, which
  // is the flat schedule this rewrite exists to remove.
  //
  // ON THE BLOCK'S OWN LENGTH (0.55 of the band, not 0.7). While every rule drew from one panel-
  // relative moment near the front, a longer line than the boxes around it was invisible. Hung off
  // the LAST block instead, those extra 120ms became the whole panel's tail: the harmony drawer
  // finished assembling at 1.26s and then spent another 0.2s with nothing on screen moving except
  // one hairline still creeping to its right-hand end.
  _drawRules(tl, rules, at) {
    if (this._reduce) return;
    if (!rules || !rules.length) return;
    tl.from(rules, {
      scaleX: 0, transformOrigin: '0% 50%',
      duration: this.DUR.overlay * 0.55, ease: this.EASE.overlay,
      stagger: this.DUR.overlayStep * 2, clearProps: 'transform',
    }, at);
  },
  // CLOSE IS OPEN REVERSED, AT ONE LENGTH.
  //
  // An entrance is allowed a tail: its contents arrive in sequence, and the stagger is the sequence,
  // so a drawer with ten cells legitimately takes longer to assemble than one with three. A
  // DISMISSAL has no such excuse — nothing is being read on the way out — and reverse() on its own
  // inherits the whole tail, which measured 427ms for a short panel against 714ms for Harmony: the
  // exact divergence the July review found, reintroduced by content length instead of by hand-written
  // timelines.
  //
  // Scaling the reverse fixes it without giving up the reversal. The exit is still every stage of
  // the entrance played backwards in the opposite order; it is simply compressed to the band's own
  // 0.4s, whatever the panel happens to hold. Nothing here runs under reduced motion — those
  // timelines are a 0.12s fade with no tail to compress.
  // THE EXIT IS A TWEEN, NOT A REWIND — and this took three attempts, so the dead ends are worth
  // keeping.
  //
  //   reverse()            plays the entrance backwards at native rate. Two faults: the length
  //                        follows the content (427ms for a short panel against 714ms for Harmony — the
  //                        review's own divergence, back through the side door) and the curve comes
  //                        out mirrored, so the panel accelerates as it leaves and is gone rather
  //                        than landed.
  //   tweenTo(0, {ease})   tweens the PLAYHEAD instead. Fixes the length, but the stated ease lands
  //                        on TIME and then every tween applies its own ease on top of that — two
  //                        curves composed. Measured: the panel sat still for 160ms, crossed 300px
  //                        in the next 200, then crept the last 16px over half a second. Nothing in
  //                        the motion system moves like that, because nothing in the motion system
  //                        is two eases deep.
  //   this                 the exit states its own properties, its own duration and its own curve.
  //                        EASE.overlayExit over 0.62s: from rest, quickest through the middle,
  //                        gone. It was written on the ARRIVAL's curve at first — away quickly and
  //                        landing slowly, on the reasoning that it should read as the arrival's
  //                        counterpart — and that is the one thing an exit must not be. Played
  //                        forwards, an expo-out puts peak velocity on frame one: the panel snapped
  //                        away and then spent two thirds of its length creeping off-screen where
  //                        nothing could be seen of it.
  //
  // The entrance timeline is killed rather than left to finish. It owns these same properties, and
  // two tweens arguing over one transform is how you get a panel that jitters on the way out. Its
  // clearProps never running is harmless: the drawer unmounts, so the node carrying the stale
  // inline styles is destroyed with it.
  //
  // AND IT LEAVES IN THE ORDER IT ARRIVED. The panel used to be the only thing that moved on the
  // way out: six blocks that had been introduced one at a time went as one slab, so the dismissal
  // was not the counterpart of the arrival, it was a different gesture that happened to use the
  // same curve. Now each block fades out top to bottom on a step compressed to fit a fixed window,
  // and the panel starts while the last of them is still going — one gesture, not a cascade
  // followed by a slide.
  //
  // The blocks only fade — they never translate, in either direction. The panel is supplying all
  // the travel a dismissal needs, and content settling downward inside a panel moving right is two
  // directions at once for no reading.
  //
  // The block fades take EASE.overlayFadeOut, not EASE.overlay. On the expo-out a 260ms exit fade was
  // 90% gone in 80ms, so six blocks did not cascade out, they strobed: a 52ms beat against an 80ms
  // event. The panel keeps EASE.overlay, because the panel travels.
  //
  // WHY THE PANEL STILL LEADS WITH THE BLOCKS RATHER THAN WITH ITSELF. The blocks start fading on
  // the frame of the press — that is where the promptness a dismissal owes you actually lives — and
  // the panel's travel builds under them. It no longer has to be held back to be survivable: the
  // old curve left at full speed immediately, so a cascade underneath it played on a surface nobody
  // could see and the delay was the only fix. The exit curve ramps from rest now, so the lead is a
  // small one and the two read as a single gesture rather than as a wait followed by a slide.
  //
  // Every block tween is `to`, never `fromTo`. Close during the arrival and a block is part-way
  // faded up; `to` continues from wherever it actually is, where a stated start would snap it to
  // fully opaque for a frame before taking it away again.
  _drawerOut(tl, root, backdrop, done) {
    const g = window.gsap;
    if (tl) tl.kill();
    const plan = (this._blockPlan && this._blockPlan.root === root) ? this._blockPlan : null;
    this._blockPlan = null;
    if (this._reduce || !g || !root) { if (done) done(); return; }
    const O = this.DUR.overlayOut, E = this.EASE.overlay, X = E, F = E;
    const blocks = plan ? plan.secs.filter((el) => el.isConnected) : [];
    const t = g.timeline({ onComplete: done || null });
    // One length whatever the panel holds — the same rule the panel's own tween has always obeyed,
    // now applied to the sequence inside it. The spread is bounded, so three blocks and ten blocks
    // finish leaving at the same moment; the cap keeps a two-block drawer from opening a gap wide
    // enough to read as two separate exits.
    // These fractions are stated against the SHORTER band deliberately. The content cascade's own
    // length was tuned for legibility — 0.26s per block, 0.26s of spread, an overlap of about a
    // third — and it has no reason to change because the panel's travel got shorter. Retuning
    // overlayOut from 1.0 to 0.62 without re-deriving them would have quietly cut the cascade by
    // 38% and undone that, which is the kind of coupling a shared token makes easy to miss.
    const outDur = O * 0.42;
    const step = blocks.length > 1 ? Math.min(O * 0.145, (O * 0.42) / (blocks.length - 1)) : 0;
    blocks.forEach((el, i) => { t.to(el, { opacity: 0, duration: outDur, ease: F }, i * step); });
    // THE CURVE'S OWN RAMP REPLACES MOST OF THIS DELAY. The panel used to wait 0.85 of the block
    // spread because EASE.overlay gave it no ramp at all — it left at full speed on its first frame,
    // so anything happening underneath it had to finish first or not be seen. EASE.overlayExit
    // starts from rest and covers 31px of 500 in its first 100ms, which IS the lead-in; holding the
    // panel back by the old amount on top of that would stack two delays and read as hesitation.
    // 0.4 of the spread keeps the contents in front of the panel without paying for it twice.
    const panelAt = step * Math.max(0, blocks.length - 1) * 0.4;
    if (backdrop) t.to(backdrop, { opacity: 0, duration: O, ease: F }, panelAt);
    t.to(root, { xPercent: 100, duration: O, ease: X }, panelAt);
  },
  // The masked line reveal on a drawer's key text, at the drawer's own tempo. It runs OUTSIDE the
  // reversible timeline deliberately: it rewrites the element into per-line masks and restores the
  // plain text node when it lands, so by the time anyone can close the drawer the DOM is back to
  // what the exit expects to find.
  //
  // EACH LINE RISES WITH ITS OWN BLOCK. The words used to start at a fixed 0.3 of the panel and
  // step on from there, which put the contrast drawer's summary line rising at 0.32s inside a block
  // that did not begin to uncover until 0.43s — the one element on the surface whose job is to be
  // read, arriving out of sequence with the box holding it. Reading the plan _drawerIn published
  // means a line waits for its block, starts one step into it, and the two masks (the block's clip
  // and the line's own) hand off rather than fight. The fallback is the old panel-relative
  // schedule, which is what a surface with no blocks — the export dialog — still uses.
  //
  // `opts.at` and `opts.duration` are fractions of the band, so a surface with a shorter arrival can
  // pull its text in with it: a panel whose sequence ends around 0.9s leaves text still rising at
  // 1.12s as a tail hanging off a finished surface rather than part of one arrival. That is also
  // why the default duration is 0.75 of the band and not all of it — a line that now waits for its
  // block has less room left in front of it than one that started with the panel.
  _revealDrawerText(sel, opts) {
    if (this._reduce || !window.gsap) return;
    const root = document.querySelector(sel); if (!root) return;
    const o = opts || {};
    const D = this.DUR.overlay;
    const plan = (this._blockPlan && this._blockPlan.root === root) ? this._blockPlan : null;
    const at = D * (typeof o.at === 'number' ? o.at : 0.3);
    const dur = D * (typeof o.duration === 'number' ? o.duration : 0.75);
    const nth = {};   // two splits inside ONE block still step past each other
    root.querySelectorAll('[data-drawer-split]').forEach((el, i) => {
      let delay = at + i * this.DUR.overlayStep * 2;
      if (plan) {
        const bi = plan.secs.findIndex((sec) => sec.contains(el));
        if (bi >= 0) { nth[bi] = (nth[bi] || 0) + 1; delay = plan.at[bi] + this.DUR.overlayStep * (2 * nth[bi] - 1); }
      }
      try { this._maskLineReveal(el, delay, { duration: dur, ease: this.EASE.overlay, stagger: this.DUR.overlayStep * 1.6 }); } catch (e) { }
    });
  },
  // ONE reversible timeline — play forward on open, reverse() on close (symmetric by construction).
  buildContrastTimeline() {
    this._cxTl = null;
    const g = window.gsap, root = document.querySelector('[data-contrast-dialog]');
    const backdrop = document.querySelector('[data-cx-backdrop]');
    if (!g || !root) return;
    const tl = g.timeline({ paused: true, onReverseComplete: () => this._finishContrastClose() });
    // Body cells only — the blank upper triangle of the matrix has no data-cx-cell value, and
    // fading in empty boxes spends the signature cascade on nothing.
    this._cxTl = this._drawerIn(tl, root, backdrop, '[data-cx-sec]', '[data-cx-cell]:not([data-cx-cell=""])');
  },
  // The masked line reveal on the drawers' titles and intros went with the utility-overlay retune.
  // It fired at DUR.reveal * 0.35 — 217ms — which was a beat inside the old 620ms cascade and is
  // now a text animation starting after the drawer it belongs to has already finished arriving.
  // The [data-drawer-split] hooks stay in the markup: they cost nothing, and the same mechanic is
  // still the right one if any of these surfaces ever leaves the utility band.
  closeContrast() {
    if (!this._cxTl) { this._finishContrastClose(); return; }
    this._drawerOut(this._cxTl, document.querySelector('[data-contrast-dialog]'), document.querySelector('[data-cx-backdrop]'), () => this._finishContrastClose());
    clearTimeout(this._cxGuard);
    this._cxGuard = setTimeout(() => this._finishContrastClose(), (this.DUR.overlayOut + 0.8) * 1000);
  },
  _finishContrastClose() {
    if (this._cxDone) return; this._cxDone = true;
    clearTimeout(this._cxGuard);
    this._blockPlan = null;   // see _finishHarmonyClose
    const back = this._contrastBack; this._cxTl = null;
    this.setState({ contrast: false, announce: 'Contrast checker closed.' }, () => {
      const el = (back && back.focus) ? back : this.contrastBtnRef.current; if (el && el.focus) try { el.focus(); } catch (e) { }
      this._contrastBack = null;
    });
  },
  // Animate only the delta on a lens/size/filter toggle: cross-fade the marks of cells whose verdict
  // actually flipped; quietly re-settle the summary; cross-fade the sample. Unchanged cells stay put.
  animateContrastDelta(oldKey, newKey) {
    const g = window.gsap; if (this._reduce || !g) return;
    const root = document.querySelector('[data-contrast-dialog]'); if (!root) return;
    const [oL, oLarge] = oldKey.split('|'), [nL, nLarge] = newKey.split('|');
    const p = this.contrastPalette(); if (!p) return;
    const thr = (lens, large) => large === 'true' ? (lens === 'AAA' ? 4.5 : 3) : (lens === 'AAA' ? 7 : 4.5);
    const oth = thr(oL, oLarge), nth = thr(nL, nLarge), sw = p.swatches;
    // pulse only cells whose pass verdict changed between the two thresholds
    if (oth !== nth) {
      for (let i = 0; i < sw.length; i++) for (let j = 0; j < i; j++) {
        const r = this.contrastRatio(sw[i].hex, sw[j].hex);
        if ((r >= oth) !== (r >= nth)) {
          const cell = root.querySelector('[data-cx-cell="' + i + '-' + j + '"]'); const mark = cell && cell.querySelector('[data-cx-mark]');
          if (mark) g.fromTo(mark, { opacity: 0 }, { opacity: 1, duration: this.DUR.state, ease: this.EASE.standard, overwrite: 'auto' });
        }
      }
    }
    const sum = root.querySelector('[data-cx-summary]'); if (sum) g.fromTo(sum, { opacity: 0.35 }, { opacity: 1, duration: this.DUR.state, ease: this.EASE.standard, overwrite: 'auto' });
    if (oLarge !== nLarge) { const smp = root.querySelector('[data-cx-sample]'); if (smp) g.fromTo(smp, { opacity: 0.3 }, { opacity: 1, duration: this.DUR.state, ease: this.EASE.standard, overwrite: 'auto' }); }
  },
  contrastSummary(p) { const sw = p.swatches; let aa = 0, total = 0; for (let i = 0; i < sw.length; i++) for (let j = i + 1; j < sw.length; j++) { total++; if (this.contrastRatio(sw[i].hex, sw[j].hex) >= 4.5) aa++; } return { aa, total }; },
  trapContrast(e) { this.trapFocusIn('[data-contrast-dialog]', e); },

  // ===== per-swatch colour harmonies (OKLCH-derived, gamut-mapped) =====
  openHarmony(hex) {
    this._harmonyBack = document.activeElement; this._hxDone = false;
    this.setState({ harmony: { hex: hex.toUpperCase() }, harmonyModel: 'analogous', harmonyMethodOpen: false, announce: 'Colour harmonies for ' + hex.toUpperCase() + ' opened. Press Escape to close.' }, () => {
      requestAnimationFrame(() => {
        const d = document.querySelector('[data-harmony-dialog]');
        if (d) { const b = d.querySelector('button'); if (b) try { b.focus(); } catch (e) { } }
        try { this.buildHarmonyTimeline(); if (this._hxTl) this._hxTl.play(0); this._revealDrawerText('[data-harmony-dialog]'); } catch (e) { }
      });
    });
  },
  buildHarmonyTimeline() {
    this._hxTl = null;
    const g = window.gsap, root = document.querySelector('[data-harmony-dialog]');
    const backdrop = document.querySelector('[data-hx-backdrop]');
    if (!g || !root) return;
    const tl = g.timeline({ paused: true, onReverseComplete: () => this._finishHarmonyClose() });
    this._hxTl = this._drawerIn(tl, root, backdrop, '[data-hx-sec]', '[data-hx-cell]');
  },
  // SWITCHING MODEL MUST NOT MOVE THE READER. The selector stays where it is, the drawer keeps its
  // scroll position, and focus stays on the button that was pressed — so comparing two models is
  // pressing two buttons rather than pressing one and finding the page somewhere else. Only the
  // preview changes, and it cross-fades rather than cutting.
  setHarmonyModel(id) {
    if (this.state.harmonyModel === id) return;
    this.setState({ harmonyModel: id }, () => {
      const g = window.gsap;
      const cells = [...document.querySelectorAll('[data-hx-preview] [data-hx-cell]')];
      if (!g || this._reduce || !cells.length) return;
      g.fromTo(cells, { opacity: 0.25 }, { opacity: 1, duration: this.DUR.state, ease: this.EASE.standard, stagger: this.DUR.stagger * 0.5, overwrite: 'auto' });
    });
  },
  // A HARMONY BECOMES A PALETTE. The review's missing adoption path, and the destination is a NEW
  // record rather than a replacement of the palette the source swatch came from — that palette is
  // content-addressed to a photograph and carries the roles someone assigned to it, and a rotation
  // of one of its colours is a different object, not an edit of it.
  //
  // Everything below reuses the generated path rather than inventing a second one:
  //   · swatches are built exactly as seedObj builds them (hex → oklab, sid by index)
  //   · the name, traits and rationale come from the same local reading a generated palette gets,
  //     passed the live feed so it cannot mint a name the archive already holds
  //   · `hash` is a real content address over the hexes, so re-saving the same harmony from the same
  //     source lands on the same identity and takes the next variation instead of colliding
  // Weight is equal across the set and that is a statement, not a default: a harmony has no area —
  // nothing was measured — so any other distribution would be invented.
  useHarmonyAsPalette() {
    const s = this.state;
    if (!s.harmony) return;
    const groups = this.harmonyGroups(s.harmony.hex);
    const g = groups.find((x) => x.id === s.harmonyModel) || groups[0];
    const hexes = g.cells.map((c) => c.hex);
    const w = 1 / hexes.length;
    const swatches = hexes.map((hx, i) => {
      const rgb = this.hexToRgb(hx);
      const lab = this.rgb2oklab(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255);
      return { sid: i, hex: hx.toLowerCase(), weight: w, L: lab.L, a: lab.a, b: lab.b };
    });
    const feed = s.feed || [];
    const it = this.interpret(swatches, feed);
    // Sorted, so the address is a property of the SET rather than of the order it happens to be
    // drawn in — the same reasoning paletteSeed uses.
    const hash = hashBytes(new TextEncoder().encode(hexes.slice().sort().join(',')));
    const used = new Set(feed.filter((p) => p && p.hash === hash).map((p) => (typeof p.variation === 'number' ? p.variation : 0)));
    let variation = 0; while (used.has(variation)) variation++;
    const active = (s.activeProject && s.activeProject !== '__unfiled__') ? s.activeProject : null;
    const pal = {
      id: hash + '-' + variation, hash, variation,
      // No image, and no pretence of one: hasImg() returns false and the result view already has a
      // state for a palette with no reference picture.
      imageUrl: null, time: Date.now(),
      name: it.name, descriptors: it.descriptors, rationale: it.rationale, archetype: it.archetype,
      // fallback marks "no live reading was applied", which is exactly true here — the harmony never
      // leaves the device, so the Name from row reads Local reading rather than claiming otherwise.
      fallback: true,
      projectId: active, projectIds: active ? [active] : [],
      swatches,
    };
    this.setState((st) => ({
      feed: [pal, ...st.feed],
      current: pal, imageUrl: null, stage: 'result',
      // Roles are DERIVED on a new palette, never carried: the source palette's Primary was an
      // assignment to one of its swatches, and none of those swatches is in here.
      // "a analogous" — the one model name in the set that starts with a vowel, and the article is
      // read aloud, so it is the kind of slip a screen-reader user hears every time.
      announce: 'Saved ' + pal.name + ', ' + (/^[aeiou]/i.test(g.name) ? 'an ' : 'a ') + g.name.toLowerCase() + ' harmony of ' + s.harmony.hex + ', as a new palette. Roles are derived from the colours.',
    }), () => {
      this.persist({ immediate: true });
      // keepAnnounce: the save is the only confirmation this act gets, and "Colour harmonies closed"
      // would land on top of it — the close runs a beat later, so the live region would report the
      // dismissal and never the record that was written.
      this.closeHarmony(true);
    });
  },
  closeHarmony(keepAnnounce) {
    this._hxKeep = !!keepAnnounce;
    if (!this._hxTl) { this._finishHarmonyClose(); return; }
    this._drawerOut(this._hxTl, document.querySelector('[data-harmony-dialog]'), document.querySelector('[data-hx-backdrop]'), () => this._finishHarmonyClose());
    clearTimeout(this._hxGuard);
    this._hxGuard = setTimeout(() => this._finishHarmonyClose(), (this.DUR.overlayOut + 0.8) * 1000);
  },
  // _blockPlan is cleared HERE as well as in _drawerOut, and the belt is not redundant with the
  // braces. _drawerOut is the animated path; every route that skips it — the close guard firing,
  // a close arriving with no timeline built, a teardown that races the rAF the open schedules its
  // build in — leaves the plan holding the drawer's whole detached block list. Nothing can misread
  // it (both consumers match on `plan.root === root` first), so this is retention rather than a
  // correctness bug, which is exactly the kind that survives review. One line, and the last thing
  // to touch the plan is always the thing that ends the drawer's life.
  _finishHarmonyClose() {
    if (this._hxDone) return; this._hxDone = true;
    clearTimeout(this._hxGuard);
    this._blockPlan = null;
    const back = this._harmonyBack; this._hxTl = null;
    const patch = { harmony: null };
    if (!this._hxKeep) patch.announce = 'Colour harmonies closed.';
    const saved = this._hxKeep;
    this.setState(patch, () => {
      // Focus returns to the swatch's harmony button on a plain close. After a SAVE it cannot: that
      // trigger belongs to the palette that was on screen a moment ago and the result now holds a
      // different one, so returning there would point the keyboard at the old palette — and letting
      // focus die on the removed node is worse still, because the next Tab starts at the top of the
      // document. It goes where the new palette is, the same way loadIntoResult sends it.
      if (saved) {
        const region = (this.resultRef && this.resultRef.current) || document.querySelector('main');
        if (region) try { region.setAttribute('tabindex', '-1'); region.focus({ preventScroll: true }); } catch (e) { }
      } else if (back && back.focus) { try { back.focus(); } catch (e) { } }
      this._harmonyBack = null; this._hxKeep = false;
    });
  },
  trapHarmony(e) { this.trapFocusIn('[data-harmony-dialog]', e); },

  // ===== tag filter drawer (same family as contrast + harmonies: right drawer, one reversible
  // timeline, Escape/Done/outside click all reverse it, focus captured on open and restored on
  // close) =====
  //
  // DISMISSED BY CLICKING AWAY, and this panel cannot do it the way the modal drawers do. They have
  // a backdrop: a full-screen element that catches the click, which is also what makes them modal.
  // This one deliberately has none — filtering is iterative, the list has to stay visible and
  // operable behind it, and a backdrop would dim the very thing you are filtering.
  //
  // So the dismissal is a document listener rather than a catcher. The difference matters: a
  // catcher SWALLOWS the click, and here the click should still land. Clicking a palette row while
  // the filter is open means "that one" — the row loads AND the panel gets out of the way, which is
  // one gesture doing one thing rather than a wasted click spent closing a panel.
  //
  // pointerdown, not click: it fires before focus moves, so the panel is already on its way out by
  // the time the thing underneath takes over.
  _facetOutside(e) {
    const panel = document.querySelector('[data-tag-dialog]');
    if (!panel || panel.contains(e.target)) return;
    // The trigger toggles; without this exclusion the press would close the panel here and the
    // button's own click would immediately reopen it, so Filter would appear to do nothing.
    if (e.target.closest && e.target.closest('[data-facet-btn]')) return;
    // The applied chips and Clear all live OUTSIDE the panel, on the Library bar, and they are part
    // of filtering — removing a narrowing should not also put away the surface you would remove the
    // next one from.
    if (e.target.closest && e.target.closest('[data-applied-filters]')) return;
    this.closeTagFilter();
  },
  openTagFilter() {
    this._tagBack = document.activeElement; this._tgDone = false;
    this.setState({ tagMenuOpen: true, tagQuery: '', announce: 'Filters opened. Press Escape to close, or click anywhere outside it.' }, () => {
      // Bound HERE and not inside the rAF below. The press that opened the panel cannot be the one
      // that closes it, because this runs off `click` — the last event of that gesture, long after
      // its pointerdown — so the next pointerdown is genuinely a new one. The rAF would also have
      // been late enough, and would have made dismissal depend on the tab being painted: rAF does
      // not fire in a hidden tab, so the panel would come back from a background tab undismissable.
      // Stored on the instance because removeEventListener needs the same reference.
      this._facetOutsideFn = (e) => this._facetOutside(e);
      document.addEventListener('pointerdown', this._facetOutsideFn, true);
      requestAnimationFrame(() => {
        // focus lands in the search field — the drawer exists to be typed at
        const i = document.querySelector('[data-facet-search]'); if (i) try { i.focus(); } catch (e) { }
        try { this.buildTagTimeline(); if (this._tgTl) this._tgTl.play(0); this._revealDrawerText('[data-tag-dialog]'); } catch (e) { }
      });
    });
  },
  buildTagTimeline() {
    this._tgTl = null;
    const g = window.gsap, root = document.querySelector('[data-tag-dialog]');
    const backdrop = document.querySelector('[data-tg-backdrop]');
    if (!g || !root) return;
    const tl = g.timeline({ paused: true, onReverseComplete: () => this._finishTagClose() });
    // The sticky header is a section too, and it must NOT translate: it is position:sticky, and a
    // transform on a sticky element makes it the containing block for its own offset, so it detaches
    // and scrolls away with the content. It takes the opacity half of the cascade only.
    this._drawerIn(tl, root, backdrop, '[data-tg-sec]:not(header)', '[data-tg-cell]');
    // The header fades in with everything else, and takes ONLY the opacity half of the block
    // schedule: it is position:sticky, and a transform on a sticky element makes it its own
    // containing block, so it detaches and scrolls away with the content. Opacity has no such
    // effect, which is the whole reason it can be excluded from the block pass above and still be
    // handled in one line here. It leads the first block slightly, because a panel whose heading
    // is the last thing to resolve reads backwards.
    const head = root.querySelector('header[data-tg-sec]');
    if (head && !this._reduce) tl.from(head, { opacity: 0, duration: this.DUR.overlayArrive * 0.55, ease: this.EASE.overlay, clearProps: 'opacity' }, this.DUR.overlay * 0.16);
    this._tgTl = tl;
  },
  // SHOW ALL / SHOW FEWER on the character traits. Not toggleFold: that tweens the height of one
  // element open and shut, and here the list is already on screen and simply gets longer — folding
  // it would collapse the six rows you can see in order to re-reveal them with the rest.
  // So the rows that ARRIVE are the only thing that moves, on the same stagger the drawer's cells
  // use when it opens. Collapsing needs no motion of its own: the rows leave with the state, and
  // there is nothing to watch travel.
  toggleFacetAll() {
    const opening = !this.state.facetAllOpen;
    const before = document.querySelectorAll('[data-facet-char] [data-tg-cell][aria-pressed]').length;
    this.setState((st) => ({ facetAllOpen: !st.facetAllOpen }), () => {
      const g = window.gsap;
      if (!opening || !g || this._reduce) return;
      const rows = [...document.querySelectorAll('[data-facet-char] [data-tg-cell][aria-pressed]')].slice(before);
      if (rows.length) g.from(rows, { opacity: 0, y: 8, duration: this.DUR.state, ease: this.EASE.entrance, stagger: this.DUR.stagger * 0.4, clearProps: 'transform,opacity' });
    });
  },
  closeTagFilter() {
    // Unbound here rather than in _finishTagClose: the close tween outlives the decision to close,
    // and a second press during it would otherwise call closeTagFilter again mid-reverse.
    this._unbindFacetOutside();
    if (!this._tgTl) { this._finishTagClose(); return; }
    this._drawerOut(this._tgTl, document.querySelector('[data-tag-dialog]'), document.querySelector('[data-tg-backdrop]'), () => this._finishTagClose());
    clearTimeout(this._tgGuard);
    this._tgGuard = setTimeout(() => this._finishTagClose(), (this.DUR.overlayOut + 0.8) * 1000);
  },
  _unbindFacetOutside() {
    if (!this._facetOutsideFn) return;
    document.removeEventListener('pointerdown', this._facetOutsideFn, true);
    this._facetOutsideFn = null;
  },
  _finishTagClose() {
    this._blockPlan = null;   // see _finishHarmonyClose
    if (this._tgDone) return; this._tgDone = true;
    clearTimeout(this._tgGuard);
    this._unbindFacetOutside();   // belt and braces: every teardown path leaves the document clean
    const back = this._tagBack; this._tgTl = null;
    // facetAllOpen resets with the panel, exactly as tagQuery does: both are ways of looking at the
    // trait list rather than filter state, and a panel that reopens twenty rows deep because of
    // something you did last time is a panel that reopens differently every time.
    this.setState({ tagMenuOpen: false, tagQuery: '', facetAllOpen: false, announce: 'Filters closed.' }, () => {
      // Focus returns to the Filter trigger — but only when the user did not put it somewhere else
      // themselves. Clicking outside IS choosing where focus goes next, and yanking it back to a
      // button they just clicked away from would undo their own move.
      const moved = document.activeElement && document.activeElement !== document.body
        && !(back && document.activeElement === back);
      if (!moved && back && back.focus) try { back.focus(); } catch (e) { }
      this._tagBack = null;
    });
  },

  // ===== token export =====
  download(filename, content, mime) {
    let blob = (content instanceof Blob) ? content : new Blob([content], { type: mime || 'text/plain;charset=utf-8' });
    try {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = filename; a.style.display = 'none';
      document.body.appendChild(a); a.click();
      setTimeout(() => { try { document.body.removeChild(a); } catch (e) { } URL.revokeObjectURL(url); }, 120);
    } catch (e) { }
    this.setState({ announce: 'Downloaded ' + filename });
  },
  doExport(pal, format, semantic) {
    if (!pal) return;
    const slug = this.slugName(pal.name);
    // The user's role assignment rides on the palette record, so it does not need threading through
    // the call: semanticEntries takes it as a sparse override and fills the rest from the heuristic.
    const entries = semantic ? this.semanticEntries(pal, pal.roles) : this.primitiveEntries(pal);
    const fn = (ext) => 'palette_' + slug + '_' + format + '.' + ext;
    if (format === 'tailwind') this.download(fn('css'), this.buildTailwind(pal, entries, semantic), 'text/css;charset=utf-8');
    else if (format === 'tokens') this.download(fn('json'), this.buildW3CTokens(pal, entries, semantic), 'application/json');
    else if (format === 'figma') this.download(fn('json'), this.buildFigmaTokens(pal, entries), 'application/json');
    else if (format === 'css') this.download(fn('css'), this.buildCssFile(pal, entries, semantic), 'text/css;charset=utf-8');
    else if (format === 'ase') this.download('palette_' + slug + '.ase', this.buildASE(entries), 'application/octet-stream');
    this.closeExport(true);
  },
  // THE SAME FIVE FORMATS, over a whole folder. Everything above writes one palette; this writes a
  // project as one file per format, and it is deliberately the same surface and the same five
  // choices — a folder is not a different kind of export, it is the same export at a different
  // scope, and giving it its own vocabulary would make people learn the tool twice.
  //
  // FILENAME says which it is: palette_* for one, project_* for a folder. The two land in the same
  // downloads directory and a folder's file is the one that will be opened months later.
  doProjectExport(id, format, semantic) {
    const pals = this.projectPalettes(id);
    if (!pals.length) return;
    const title = this.projectName(id), slug = this.slugName(title);
    const groups = this.projectEntryGroups(pals, semantic);
    const fn = (ext) => 'project_' + slug + '_' + format + '.' + ext;
    if (format === 'tailwind') this.download(fn('css'), this.buildTailwindSet(title, groups, semantic), 'text/css;charset=utf-8');
    else if (format === 'tokens') this.download(fn('json'), this.buildW3CTokensSet(title, groups, semantic), 'application/json');
    else if (format === 'figma') this.download(fn('json'), this.buildFigmaTokensSet(title, groups), 'application/json');
    else if (format === 'css') this.download(fn('css'), this.buildCssFileSet(title, groups, semantic), 'text/css;charset=utf-8');
    else if (format === 'ase') this.download('project_' + slug + '.ase', this.buildASESet(groups), 'application/octet-stream');
    this.closeExport(true);
  },
  openExport(p) {
    if (!p) return;
    this._openExportSurface({ exportPalette: p, exportProject: null }, 'Export options for ' + p.name + ' opened. Press Escape to close.');
  },
  /* Opened from INSIDE Manage Projects, and it stays on top of it rather than replacing it: the
     folder you are exporting is the row you just pressed, and closing the manager to ask which
     format would throw away the place you were in. Escape closes this one first (see the ordering
     in PaletteApp's key handler) and focus goes back to the row's own Export button, so the trip
     out is the trip in, reversed. */
  openProjectExport(id) {
    const n = this.projectPalettes(id).length;
    if (!n) return;   // an empty folder has nothing to write; the control is disabled anyway
    this._openExportSurface({ exportPalette: null, exportProject: id },
      'Export options for the project ' + this.projectName(id) + ', ' + n + ' palette' + (n === 1 ? '' : 's') + ', opened. Press Escape to close.');
  },
  // One arrival for both scopes, so a dialog opened two ways cannot be focused, animated or
  // announced two ways.
  _openExportSurface(patch, announce) {
    this._exportBack = document.activeElement; this._exDone = false;
    clearTimeout(this._exGuard);
    this.setState(Object.assign({ exportOpen: true, announce }, patch), () => {
      requestAnimationFrame(() => {
        const d = document.querySelector('[data-export-dialog]');
        if (d) { const b = d.querySelector('button'); if (b) try { b.focus(); } catch (e) { } }
        try { this.buildExportTimeline(); if (this._exTl) this._exTl.play(0); this._revealDrawerText('[data-export-dialog]'); } catch (e) { }
      });
    });
  },
  // ONE reversible timeline — same class of surface as contrast/harmony (play on open, reverse on
  // close), on the same band and curve. It is a centred dialog rather than a drawer, so it cannot
  // go through _drawerIn: it grows from its own centre instead of sliding from an edge. Everything
  // after that first tween keeps the shared schedule — items begin at 0.45 of the panel's travel,
  // on the same step, so a dialog and a drawer are recognisably the same system.
  buildExportTimeline() {
    this._exTl = null;
    const g = window.gsap, root = document.querySelector('[data-export-dialog]');
    const backdrop = document.querySelector('[data-ex-backdrop]');
    if (!g || !root) return;
    const D = this.DUR.overlay, E = this.EASE.overlay;
    const items = [...root.querySelectorAll('[data-ex-item]')];
    const tl = g.timeline({ paused: true, onReverseComplete: () => this._finishExportClose(this._exKeep) });
    if (this._reduce) { if (backdrop) tl.from(backdrop, { opacity: 0, duration: .12, ease: 'none' }, 0); tl.from(root, { opacity: 0, duration: .12, ease: 'none' }, 0); this._exTl = tl; return; }
    if (backdrop) tl.from(backdrop, { opacity: 0, duration: D, ease: E }, 0);
    tl.from(root, { opacity: 0, y: 12, scale: 0.98, duration: D, ease: E, transformOrigin: 'center center' }, 0);
    // The dialog itself fades — it has no edge to slide from, so the fade IS its arrival — and its
    // contents fade in behind it on the shared block schedule, like every other overlay's.
    //
    // ON THE CELL SCHEDULE, not the section one. The format list is five leaf choices — the same
    // kind of thing as a drawer's rows — and it was being timed as though each were a section: the
    // coarse `overlayStep * 2` beat, starting at D * 0.45. That is the "third of the panel later"
    // the cells comment above argues against, and this call site was never brought onto that fix.
    // The list read slow for it, and it read slow in a way nothing else here does: five items on a
    // doubled step is 320ms of pure stagger, and the last one landed at ~1.24s.
    // Matching the cells exactly — D * 0.32 and one step — brings the last item in at ~0.98s and,
    // more to the point, means the export list and every drawer row arrive on ONE beat. That is
    // also why they fade rather than wipe: the beat is only shared if the mechanic is.
    // transition:none for the duration — see the note in _drawerIn. These items are buttons, and a
    // button's own opacity transition would damp every step of this stagger by 280ms.
    // Controls, so they fade — see the note in _drawerIn. Every item in this list is a button
    // with a word on it, which is the exact case the horizontal wipe is wrong for.
    tl.set(items, { transition: 'none' }, 0);
    tl.from(items, { opacity: 0, duration: this.DUR.overlayArrive, ease: E, stagger: this.DUR.overlayItem, clearProps: 'opacity,transition' }, D * 0.32);
    this._drawRules(tl, [...root.querySelectorAll('[data-ov-rule]')], D * 0.4);
    this._exTl = tl;
  },
  closeExport(keepAnnounce) {
    this._exKeep = !!keepAnnounce;
    if (!this._exTl) { this._finishExportClose(this._exKeep); return; }
    // Same exit contract as the drawers, on the geometry it arrived with: it grows from its centre
    // rather than sliding from an edge, so it leaves the same way. Which means the same curves too —
    // overlayExit on the geometry, overlayFadeOut on the scrim — or the sentence above is a claim the
    // code does not honour.
    (() => {
      const g = window.gsap, root = document.querySelector('[data-export-dialog]');
      const back = document.querySelector('[data-ex-backdrop]');
      const done = () => this._finishExportClose(this._exKeep);
      if (this._exTl) this._exTl.kill();
      if (this._reduce || !g || !root) { done(); return; }
      const t = g.timeline({ onComplete: done });
      if (back) t.to(back, { opacity: 0, duration: this.DUR.overlayOut, ease: this.EASE.overlay }, 0);
      t.to(root, { opacity: 0, y: 12, scale: 0.98, duration: this.DUR.overlayOut, ease: this.EASE.overlay, transformOrigin: 'center center' }, 0);
    })();
    clearTimeout(this._exGuard);
    this._exGuard = setTimeout(() => this._finishExportClose(this._exKeep), (this.DUR.overlayOut + 0.8) * 1000);
  },
  _finishExportClose(keepAnnounce) {
    if (this._exDone) return; this._exDone = true;
    clearTimeout(this._exGuard);
    const back = this._exportBack; this._exTl = null;
    const patch = { exportOpen: false, exportPalette: null, exportProject: null };
    if (!keepAnnounce) patch.announce = 'Export options closed.';
    this.setState(patch, () => { if (back && back.focus) try { back.focus(); } catch (e) { } this._exportBack = null; });
  },
  trapExport(e) { this.trapFocusIn('[data-export-dialog]', e); },
};
