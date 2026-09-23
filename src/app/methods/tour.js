import { splitLines } from './maskLines.js';
import { trackEvent } from '../../lib/track.js';

/* ===== THE TOUR — FIVE STOPS OVER A PALETTE THE READER PICKED ================================

   WHAT THIS IS NOT. It is not a sequence of screens in front of the tool, and it is not a set of
   demo palettes. Every stop stands ON the working interface, beside the thing it names, with that
   thing live: the reader can select a different colour, change the contrast pair, switch the
   harmony and open the export sheet while the card is up, and none of it is required to move on.
   That is the whole licence for a tour existing here at all — people do not read manuals, they
   start using the thing (Paradox of the Active User), so the guidance has to sit inside the doing
   rather than in front of it.

   THE SHAPE:

     invite   a dialog, the app's own (RecogniseDialog's frame) — offered once, remembered
     choose   a card beside the library; waits for the reader to open ANY of the eight
     1..4     a card beside the swatches, the contrast drawer, the harmonies drawer, Export

   `choose` is deliberately NOT numbered. The counter would read "1 of 5" for a step that has no
   instruction in it, and the four steps are the thing being promised in the invitation.

   NOTHING HERE WRITES TO THE LIBRARY. The tour opens palettes that already exist and opens surfaces
   that already exist; it creates no palette, duplicates no example and starts no download. Leaving
   at any point leaves the reader exactly where the last step put them, with their work intact —
   which is also why Escape is wired into the app's one key ladder rather than to a listener of its
   own (see PaletteApp): the tour is the LAST thing Escape closes, under every drawer and dialog,
   so a reader pressing it while the contrast drawer is up closes the drawer, not the tour.

   DESKTOP ONLY, and the gate is the tool's own: below MIN_TOOL_WIDTH there is no result stage, no
   drawers and no library table to stand beside, so there is nothing for these cards to anchor to.
   `narrow` is the same flag the tool mounts on. */

// One key, the app's own namespace. '1' means "this visitor has been offered the tour", which is
// the only thing worth remembering: whether they took it or skipped it changes nothing about what
// happens next, and Take a Tour in the masthead is the way back either way.
const TOUR_KEY = 'palette-generator/tour';

/* THE FOUR STEPS, AND THEIR COPY.

   TITLE CASE ON THE HEADINGS (by request, 20.09.26). The brief wrote these five in sentence case;
   the site does not — every heading, label and button in it is Title Case, and the one exception
   would have been the surface that is supposed to be teaching a first-time reader what the system's
   conventions are. The BODY lines stay as authored: they are sentences, and a sentence is prose.

   Every line here is true of all eight examples. No step names a colour, a ratio, a verdict or a
   harmony: "the percentage shows its estimated share" holds for Garnet's 36% and High Key's 78%,
   and "whether they meet the contrast requirement" holds whether the pair passes or fails. That is
   a hard constraint, not a style note — the reader picked the palette, so the copy cannot have.

   `place` is the SIDE OF THE ANCHOR the card prefers; the solver falls back through the others and
   finally to the foot of the viewport (see _tourSolve). The two drawers get 'inline-start' because
   they are 500px and 480px of right-hand surface with their own backdrop over the page: the only
   place a card can stand and still leave the thing it explains visible is beside them. */
const STEPS = [
  {
    /* THE CARD'S HOME ON THE RESULT STAGE (21.09.26, UX review: step 1's card covered the palette's
       name, its tags and the start of its reading while the band beside the action row stood
       empty). It was placed block-end of the swatches and cleared past the action row, which put it
       at the stage's leading edge — exactly where the palette's name is set. The trailing side of
       Export is the one clear space on the stage, and step 4 already stood in it; steps 1, 2 and 3
       wait there too now, so the card only travels when the reader opens a drawer or the tour
       moves on to New Palette. `anchor` is where the card goes; `ringOn` is what it is about. */
    n: 1, view: 'result', anchor: '[data-tour="export"]', place: 'inline-end', ringOn: '[data-tour="swatches"]',
    /* `ring: 'surface'` — THE ONE ANCHOR WITH NO CORNER OF ITS OWN (20.09.26, by request).

       An outline follows its element's border-radius, so four of the five stops need nothing said:
       the Export button is a pill and rings as one, the two drawers carry --radius-surface down
       their reading edge and ring to match. The swatch group is square, because the bands are
       samples and samples stay square — so step 1 was the only stop drawing a hard rectangle,
       beside a card with a 28px corner. This rounds the RING, not the bands: the group paints no
       background of its own and sets no overflow, so a radius on it reaches the outline and nothing
       else. The value names --radius-card, the BANDS' own corner, so the arc runs concentric with
       the one it encloses — see the note on [data-tour-lit="surface"] in global.css. */
    ring: 'surface',
    title: 'Explore a Colour',
    /* NOTHING TO SELECT (21.09.26, UX review). "Select a colour to see its values" asked for a press
       the stage does not take: a band is a static group, and every one of them already shows its
       values.
       POINT AT A COLOUR (23.09.26, by request, with the photograph's lighting, methods/where.js). A
       colour now does answer the pointer: the photograph beside the tiles lights where it lives, which
       is its share of the image made visible — and nothing on the stage says so. So the second
       sentence says it, and the step shows it once (_tourWhereCue); the copy it replaces is step 4's
       subject, said there. Still three lines at most, so the card keeps its one height. */
    body: 'Each colour shows its values, and the percentage is its estimated share of the image. Point at a colour to see where it sits in the photo.',
  },
  {
    /* `via` — THE CONTROL THAT OPENS THIS STEP'S DRAWER, AND THE READER PRESSES IT (21.09.26, by
       request: "it's important that the user presses the buttons actively that moves them to the
       next step. Otherwise they start reading and then the modal suddenly moves" — and "we also
       have to instruct the user to make this action").

       It was a demonstration: the ring and a mirrored hover sat on the control for a beat, then the
       tour opened the drawer itself and the card travelled to it — a second move landing a second
       after the copy had, under a reader who had just started on it. Now the step opens on the
       control and waits. The copy says what to press, first; the ring and one pass of the control's
       own hover say where; Next is disabled until the drawer has been opened (see tourDone). When
       the reader presses it, the drawer arrives because they asked for it and the card goes with
       it. The same fallback serves a reader who shuts the drawer again: the card returns to the
       control, and Next stays available — they have done it once.

       `viaAnchor` is where the card waits while the drawer is shut: the result stage's home beside
       Export, which is where step 1 left it, so 1 -> 2 does not move the card at all. */
    n: 2, view: 'contrast', via: 'contrast', viaAnchor: '[data-tour="export"]', viaPlace: 'inline-end', anchor: '[data-contrast-dialog]', place: 'inline-start',
    title: 'Check Contrast',
    /* The actions the drawer has (21.09.26, UX review): no pair can be picked — the matrix shows every
       pair and the sample is always the best — so "try another pair" had nothing to press. What
       changes the result is the level (AA / AAA) and the text size (Normal / Large Text). */
    /* TWO COPIES, ONE PER STATE OF THE STEP (21.09.26, by request: "Copy should adjust after the user
       have pressed the button... It doesn't make sense to tell them to press a button after it's
       pressed"). `body` is the instruction, while the drawer is shut; `bodyOpen` is what to do inside
       it, once it is open. _tourPhaseText swaps them through the masks, only ever because the reader
       pressed something — and a reader who shuts the drawer again gets the instruction back, since
       pressing it is again the thing to do. Both fit the card's three reserved lines. */
    body: 'Press Check Contrast to see which pairs of your colours are readable together.',
    bodyOpen: 'Each pair of your colours shows its contrast ratio. Switch between AA and AAA, or Normal and Large Text, to see which pairs pass.',
  },
  {
    /* The reader CHOOSES the colour now, which is what the brief's "choose a colour from your
       palette" always asked for: the tour used to open the drawer on the dominant swatch itself and
       then tell them to choose one, in a drawer with nothing to choose with. Any band's harmony
       button opens the step's drawer; the ring shows the dominant's as the example. */
    n: 3, view: 'harmony', via: 'harmony', viaAnchor: '[data-tour="export"]', viaPlace: 'inline-end', anchor: '[data-harmony-dialog]', place: 'inline-start',
    title: 'Explore Harmonies',
    body: 'Press the harmony button on any colour to explore colours related to it.',
    bodyOpen: 'These colours are built from the one you chose. Switch between harmonies to see different combinations.',
  },
  {
    /* BESIDE Export, NOT OVER THE PALETTE. block-start was the first answer — the card sat directly
       above the button, which put 191px of it across two of the five bands while the copy read "use
       your palette". The row has a clear 960px to its trailing side; the card goes there. */
    n: 4, view: 'result', anchor: '[data-tour="export"]', place: 'inline-end',
    title: 'Use Your Palette',
    /* THE LAST SENTENCE WENT TO STEP 5 (20.09.26, by request: "add an extra step that sends the user
       to New Palette to get them going"). It read "Keep exploring the examples, or choose your own
       image to create a palette" — a second instruction, about a control nowhere near this one,
       tacked onto the end of a step about export. It is its own stop now, standing on the button it
       names. */
    body: 'Copy colour values or export the palette for your design tools.',
  },
  {
    /* STEP 5 — THE WAY OUT OF THE EXAMPLES AND INTO THE READER'S OWN WORK.

       The tour has been a tour of somebody else's photograph up to here, which is the right way to
       learn the tool and the wrong place to leave someone. This points at the one control that
       starts a palette from their image, and it is the last thing they see before the card goes.

       IT OPENS NOTHING. Export is highlighted without the sheet opening and this is highlighted
       without the file picker opening, for the same reason: a tour that starts a file dialog on the
       reader's behalf has stopped being a tour. The button is theirs to press, and the step reads
       the same whether they press it or finish and keep exploring.

       view:'result' because the masthead is chrome — it is on screen in every state — so what this
       actually buys is the close of whichever drawer step 3 left open. The bar is sticky, so
       _tourReveal finds the anchor already in view and does not scroll. */
    n: 5, view: 'result', anchor: '[data-tour="new"]', place: 'block-end',
    title: 'Make Your Own',
    body: 'New Palette reads a palette from an image you choose. Keep exploring the examples, or start one of your own.',
  },
];

const CHOOSE = {
  n: 0, view: 'library', anchor: '#library-list', place: 'inline-start',
  title: 'Choose a Palette',
  body: 'Open any example to start exploring.',
};

// The card's own box, needed before it is in the DOM so the first solve is not a frame late.
const CARD_W = 320;
const CARD_FALLBACK_H = 168;
// Clear of the anchor, and clear of the viewport edge. GAP is the distance from the thing being
// explained; GUTTER is --page-gutter, so the card lands on the same margin every other surface does.
const GAP = 16;
const GUTTER = 24;

export const tourMethods = {
  TOUR_STEPS: STEPS,

  // ===== memory =============================================================================

  _tourOffered() { try { return localStorage.getItem(TOUR_KEY) === '1'; } catch (e) { return true; } },
  _tourRemember() { try { localStorage.setItem(TOUR_KEY, '1'); } catch (e) { } },

  /* OFFERED ONCE, AFTER Create HAS LANDED. Called from the tail of getStarted's commit, which is
     the moment the tool is on screen with the eight examples in it — the invitation is about that
     list, so it cannot arrive before the list does. Anything that is already covering the page
     (a share link's palette, the loader, a document route) means the visitor did not arrive by
     pressing Create, and the offer waits for a visit that did. */
  maybeOfferTour() {
    if (this.state.narrow || this.state.sharedView) return;
    if (this._tourOffered()) return;
    if (this.state.tourStep != null) return;
    /* ONE QUESTION AT A TIME (22.09.26). The consent banner already waits for the tour to be over
       (consent.js _askConsent), but not the other way round: a visitor who scrolled the landing was
       asked about analytics there, pressed Create with the banner still up, and got the invitation
       on top of it — measured, both on screen at once, the invitation claiming aria-modal while the
       banner stayed clickable. Now the invitation waits for the banner's answer, and _closeConsent
       offers it once the banner has left. */
    if (this.state.consentOpen || this._consentClosing) { this._tourAfterConsent = true; return; }
    this.openTourInvite();
  },

  /* THE WAITING INVITATION, after the banner has gone. A beat later, so the banner's exit and the
     invitation's arrival read as two things rather than one turning into the other; and only while
     the reader is still where the invitation makes sense — on the overview, with nothing else open.
     A reader who opened a palette or a menu while the banner was up has already started, and the
     offer is dropped rather than held: it is not remembered as given, and Take a Tour in the footer
     is there either way. */
  _offerTourAfterConsent() {
    if (!this._tourAfterConsent) return;
    this._tourAfterConsent = false;
    clearTimeout(this._tourAfterConsentT);
    this._tourAfterConsentT = setTimeout(() => {
      this._tourAfterConsentT = null;
      const s = this.state;
      if (!this._alive || !s.landingDismissed || s.stage !== 'upload' || s.overlay || s.uOpen || this._wipeRunning) return;
      if (s.tagMenuOpen || s.exportOpen || s.backupMenuOpen) return;
      this.maybeOfferTour();
    }, 400);
  },

  // ===== the invitation =====================================================================

  openTourInvite() {
    this._tourBack = document.activeElement;
    this.setState({ tourStep: 'invite', tourInviteOut: false }, () => {
      /* _dialogIn, the five dialogs' own arrival: the scrim on DUR.state, the panel up 12px from 0.98
         on EASE.entrance. It used to simply be there — measured at one opacity value across ~190
         frames, where Export in the same run eased through seventeen. On a first visit it arrives
         under the page wipe and the wipe is what is seen; from the footer this is the whole entrance. */
      this._dialogIn('[data-tour-dialog]');
      requestAnimationFrame(() => {
        const d = document.querySelector('[data-tour-dialog]');
        if (!d) return;
        // The recommended act, not the close mark: the dialog is an offer, and the first thing a
        // keyboard reader meets should be the thing it is offering.
        const b = d.querySelector('[data-tour-take]') || d.querySelector('button');
        if (b) try { b.focus(); } catch (e) { }
      });
    });
  },

  trapTourInvite(e) { this.trapFocusIn('[data-tour-dialog]', e); },

  /* SKIP FOR NOW CLOSES AND LEAVES THE READER IN THE OVERVIEW — it does not start anything and does
     not take anything away. The answer is remembered so the offer does not arrive again on the next
     visit; the masthead's Take a Tour is the way back. */
  skipTourInvite() {
    this._tourRemember();
    if (!this._tourInviteLeaving) trackEvent('Tour', { action: 'declined' });
    if (this._tourInviteLeaving) return;
    this._tourInviteLeaving = true;
    this.setState({ tourInviteOut: true });
    // _dialogOut first, then the state that unmounts it — an exit that has to outlive the state
    // change, which is the same reason every dialog here closes this way.
    this._dialogOut('[data-tour-dialog]', () => {
      this._tourInviteLeaving = false;
      this.setState({ tourInviteOut: false });
      this._tourClose('Tour skipped. Take a Tour in the footer reopens it.');
    });
  },

  /* TAKE THE TOUR, FROM EITHER DOOR — the first-visit invitation, and the masthead control that
     reopens the same dialog later.

     IT DOES NOT THROW AWAY WHAT IS OPEN. A reader who restarts with a palette already on the result
     stage has already answered "choose a palette", so the tour starts at step 1 on the palette they
     are standing on rather than sending them back to the list to pick one again. That is the whole
     of "preserve existing work": the tour never closes a palette, never resets the stage and never
     touches the library. */
  takeTour() {
    this._tourRemember();
    trackEvent('Tour', { action: 'taken' });
    this.setState({ tourDone: {} });
    /* WHERE IT LANDS (21.09.26, by request: "after clicking Take the Tour it becomes unclear to the
       user where the modal lands"). The invitation used to vanish in one frame and the card appear
       in another, 400px away, with nothing joining them. Now the card rises out of the
       invitation's own centre and travels to its anchor on the glide while the invitation leaves on
       the dialogs' exit behind it: the eye was already on the invitation, and it is carried to where
       the card settles. _tourPut spends _tourEnterFrom on the card's first placement. */
    const d = document.querySelector('[data-tour-dialog]');
    if (d) {
      const r = d.getBoundingClientRect();
      this._tourEnterFrom = { cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
      this._tourInviteLeaving = true;
      this._dialogOut('[data-tour-dialog]', () => { this._tourInviteLeaving = false; this.setState({ tourInviteOut: false }); });
    }
    if (this.state.stage === 'result' && this.state.current) {
      this.setState({ tourInviteOut: !!d });
      this._tourGo(1);
      return;
    }
    this.setState({ tourStep: 'choose', tourInviteOut: !!d, announce: 'Tour started. Open any example to begin.' }, () => { this._tourFrozen = false; this._tourAttach(); this._tourFocusCard(); });
  },

  // ===== moving between steps ===============================================================

  /* The reader opened a palette while the tour was waiting for one. Called from the tail of
     _loadIntoResultNow (methods/motion.js), which is the one path every row activation takes. */
  _tourPaletteOpened() {
    if (this.state.tourStep !== 'choose') return;
    this._tourGo(1);
  },

  /* NOT WHILE THE CARD IS EMPTY. Beat 1 takes the words off the card for ~380ms and the pair stayed
     live through it, so a press in that window advanced from a surface with nothing on it — the
     counter jumping two steps and the reader carried past one they never saw, on a flow whose whole
     purpose is showing them five things. A press there is impatience far more often than an intent
     to skip, so dropping it is the safer failure. The flag lifts in _tourContent, which is the
     moment the new words start arriving and therefore the moment the buttons begin describing a
     step that can be read.

     THE WINDOW IS SMALL, AND THE FIRST MEASUREMENT OF IT WAS WRONG. Two Playwright clicks "150ms
     apart" landed 400ms apart once its actionability checks were counted, which is past the window
     and a legitimate double-advance — the guard looked broken and was not. Verified by dispatching
     two presses in ONE task plus a third on a 120ms page-side timer: three calls, one advance. Any
     future test of this has to press from inside the page, not through the driver. */
  tourNext() {
    const s = this.state.tourStep;
    if (this._tourBusy) return;
    if (s === 'choose' || s == null) return;
    // The disabled Next cannot be pressed; this is the same rule for anything else that calls it.
    if (STEPS[s - 1] && STEPS[s - 1].via && !(this.state.tourDone || {})[s]) return;
    if (s >= STEPS.length) { this.finishTour(); return; }
    this._tourGo(s + 1);
  },

  /* NEW PALETTE, FROM THE CARD. The tour leaves the quiet way — the card and ring fade, no
     announcement, no focus of its own — because what follows is the create page, which announces and
     focuses itself. newPalette is the masthead button's own act; running it here is the same press. */
  tourMakeOwn() {
    if (this._tourBusy || this.state.tourStep !== STEPS.length) return;
    trackEvent('Tour', { action: 'new palette' });
    this._tourAbandon();
    this.newPalette();
    /* Focus goes where pressing the masthead's New Palette leaves it: on that button. The press was
       on the card's, which leaves with the card, and focus left behind on a removed node falls to
       <body> — the next Tab would start from the top of the document. */
    const np = document.querySelector('[data-tour="new"]');
    if (np) try { np.focus({ preventScroll: true }); } catch (e) { }
  },

  tourBack() {
    const s = this.state.tourStep;
    if (this._tourBusy) return;
    if (typeof s !== 'number' || s <= 1) return;
    this._tourGo(s - 1);
  },

  /* THE STEP'S ACT, SEEN FROM STATE (21.09.26). Called from PaletteApp's componentDidUpdate on every
     commit, so it does not matter how the drawer came to be open — the ringed control, another
     band's harmony button, a keyboard press — or whether it already was when the step began: the
     step's own drawer being up during the step is what unlocks Next. */
  _tourWatch() {
    const s = this.state;
    if (typeof s.tourStep !== 'number') return;
    const step = STEPS[s.tourStep - 1];
    if (!step || !step.via) return;
    const open = this._tourDrawerOpen(step);
    if (open && !(s.tourDone || {})[s.tourStep]) this.setState({ tourDone: Object.assign({}, s.tourDone, { [s.tourStep]: true }) });
    // Not during a step change: _tourGo owns the words then, and sets the phase at its own commit.
    if (step.bodyOpen && !this._tourBusy) {
      const want = open ? 'open' : 'shut';
      if (want !== s.tourPhase && want !== this._tourPhaseTo) this._tourPhaseText(want);
    }
  },

  // The copy on the card for the step as it stands.
  _tourBody(step) {
    return (step.bodyOpen && this.state.tourPhase === 'open') ? step.bodyOpen : step.body;
  },

  /* THE BODY CHANGES WITH THE READER'S PRESS, THROUGH THE MASKS (21.09.26). The same two halves as a
     step change, on the body line alone, because the heading and the counter still describe the same
     step: the sentence leaves up through its window (DUR.state, EASE.exit), the phase commits, and
     the new sentence rises on the drawers' figures while the card is travelling to the drawer.
     The reveal still running from the step's own arrival is finished first — _maskLineReveal
     restores by writing back the text it captured, and one firing after React has written the new
     sentence puts the old one back over it ([[split-targets-must-be-text]]). */
  _tourPhaseText(want) {
    const card = (this.tourCardRef && this.tourCardRef.current) || document.querySelector('[data-tour-card]');
    const body = card && card.querySelector('[data-tour-line="2"]');
    const seq = this._tourSeq;
    this._tourPhaseAbort();
    this._tourPhaseTo = want;
    const g = window.gsap;
    const commit = () => {
      if (seq !== this._tourSeq || this._tourPhaseTo !== want) return;
      if (this._tourPhaseSplit) { try { this._tourPhaseSplit.restore(); } catch (e) { } this._tourPhaseSplit = null; }
      if (body) body.style.visibility = 'hidden';
      this.setState({ tourPhase: want }, () => {
        this._tourPhaseTo = null;
        if (seq !== this._tourSeq || !body) return;
        body.style.visibility = '';
        if (!g || this._reduce) return;
        try { this._maskLineReveal(body, 0, { duration: this.DUR.reveal, ease: this.EASE.overlay, stagger: this.DUR.line }); } catch (e) { }
      });
    };
    if (!body) { commit(); return; }
    if (body._splitRevert) { try { body._splitRevert(); } catch (e) { } }
    if (!g || this._reduce) { commit(); return; }
    const sp = splitLines(body);
    if (!sp) { commit(); return; }
    this._tourPhaseSplit = sp;
    sp.lines.forEach((line, i) => g.to(line, { yPercent: -110, duration: this.DUR.state, ease: this.EASE.exit, delay: i * 0.02 }));
    this._tourPhaseT = setTimeout(commit, (this.DUR.state + (sp.lines.length - 1) * 0.02 + 0.02) * 1000);
  },

  // A swap cut short — by a step change, or by the reader reversing it — puts its words back first.
  _tourPhaseAbort() {
    clearTimeout(this._tourPhaseT);
    if (this._tourPhaseSplit) {
      const g = window.gsap;
      try { if (g) this._tourPhaseSplit.lines.forEach((l) => g.killTweensOf(l)); } catch (e) { }
      try { this._tourPhaseSplit.restore(); } catch (e) { }
      this._tourPhaseSplit = null;
    }
    this._tourPhaseTo = null;
  },

  /* BACK FROM A DOCUMENT WITH A STEP LIVE (21.09.26, UX review: a reader who followed How it Works
     from the footer on step 4 and came back with the browser's Back found the card alone at the top
     of the viewport — the tool restores the scroll it was left at, Export was 500px above, and the
     reveal only ever ran on a step change). Once the page window has finished crossing, the step's
     target is scrolled back into view and the card takes focus again, the two things a step change
     does for a reader arriving at a step. */
  _tourResume() {
    const step = this._tourStepDef();
    if (!step || !step.n) return;
    let tries = 120;
    const go = () => {
      if (this._tourStepDef() !== step) return;
      if ((this._wipeRunning || !document.querySelector('[data-tour-card]')) && --tries > 0) { setTimeout(go, 25); return; }
      requestAnimationFrame(() => {
        if (this._tourStepDef() !== step) return;
        this._tourReveal(step);
        this._tourSolveNow();
        this._tourFocusCard();
      });
    };
    go();
  },

  /* THE KEYBOARD PATH BETWEEN THE CARD AND WHAT IT POINTS AT (21.09.26). Two cases, because a drawer
     step has two states.
     Waiting, drawer shut: the card's last control and the control it rings are made neighbours, so
     Tab from Back (Next is disabled, so Back is last) goes straight to Check Contrast or the harmony
     button, and Shift+Tab from there comes back (_tourViaKey). The ring and the copy point a mouse at
     the control; this points the keyboard at it, without which it was a dozen Tabs up the page.
     Drawer open: the drawer's own trap cycles inside it, so the card beside it was unreachable once
     focus was in — pressing Escape to get out ended the tour. The card joins the loop instead: Tab
     off either end of one lands on the other (trapFocusIn in methods/persistence.js asks
     _tourCompanionOf for the card). */
  _tourFocusables(root) {
    return root ? [...root.querySelectorAll('button,[href],input,select,[tabindex]:not([tabindex="-1"])')].filter((n) => !n.disabled && n.offsetParent !== null) : [];
  },

  _tourCardTab(e) {
    if (e.key !== 'Tab') return;
    const step = this._tourStepDef();
    if (!step || !step.via) return;
    const card = (this.tourCardRef && this.tourCardRef.current) || document.querySelector('[data-tour-card]');
    const f = this._tourFocusables(card);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1], at = document.activeElement;
    const drawer = this._tourDrawerOpen(step) ? document.querySelector(step.anchor) : null;
    if (drawer) {
      const d = this._tourFocusables(drawer);
      if (!d.length) return;
      if (!e.shiftKey && at === last) { e.preventDefault(); d[0].focus(); }
      else if (e.shiftKey && at === first) { e.preventDefault(); d[d.length - 1].focus(); }
      return;
    }
    const via = this._tourVia(step);
    if (via && !e.shiftKey && at === last) { e.preventDefault(); via.focus(); }
  },

  // Shift+Tab on the ringed control, while its step is waiting, goes back to the card.
  _tourViaKey(e) {
    if (e.key !== 'Tab' || !e.shiftKey) return;
    const step = this._tourStepDef();
    if (!step || !step.via || this._tourDrawerOpen(step)) return;
    if (document.activeElement !== this._tourVia(step)) return;
    const card = (this.tourCardRef && this.tourCardRef.current) || document.querySelector('[data-tour-card]');
    const f = this._tourFocusables(card);
    if (!f.length) return;
    e.preventDefault();
    f[f.length - 1].focus();
  },

  // The card, when it stands beside this drawer as the step's companion; null otherwise.
  _tourCompanionOf(root) {
    const step = this._tourStepDef();
    if (!step || !step.via || !root || !this._tourDrawerOpen(step) || !root.matches(step.anchor)) return null;
    return (this.tourCardRef && this.tourCardRef.current) || document.querySelector('[data-tour-card]');
  },

  /* ONE DOOR INTO A STEP: set the state, bring the view the step needs, place the card, say what
     changed. `_tourSyncView` is what makes Next "open the view needed for the following step" — the
     reader never has to find the contrast drawer to be told about it. */
  /* ===== ONE STEP CHANGE, IN FOUR BEATS =======================================================

     (20.09.26, by request: "the sequentials between elements appearing to the matching step still
     needs to be more sequential and seamless".)

     WHAT IT WAS. Everything fired at the settle: the card moved, the number rolled, the bar filled
     and both lines of copy rose, all on the same frame — and before that the old words had simply
     vanished, because arming them was a visibility flip. So a step change read as a blank card
     sitting still for the length of a drawer transition, followed by one lump.

     WHAT IT IS. Four beats, and the surfaces behind it change underneath the whole thing:

       1  the words LEAVE, top down, through the masks they arrived in       DUR.state, EASE.exit
       2  the card travels to the new anchor, the number rolling behind it   DUR.fold,  EASE.fold
       3  the heading rises, a half-glide in                                 DUR.reveal, EASE.overlay
       4  the copy follows it, a block-beat later, line by line              + DUR.line per line

     Beat 1 is why the state change WAITS. React owns the text of those two elements, so writing the
     next step's words is what destroys the split the out-tween is running on; the only way the old
     copy can leave is if it is still the copy on screen. The drawer work does NOT wait — it is
     started from the step object rather than from state, so it runs under beat 1 and the 240ms
     costs nothing.

     The two paths then JOIN: the drawers have to have settled AND the new words have to be armed
     before anything arrives. `seq` is the guard for a reader pressing Next twice quickly — a
     superseded change drops out at its next checkpoint rather than landing on top of a newer one. */
  _tourGo(n) {
    const step = STEPS[n - 1]; if (!step) return;
    this._tourWhereStop();
    this._tourFrozen = true;
    this._tourBusy = true;
    /* THE TOUR OWNS THE KEYBOARD FOR AS LONG AS IT RUNS, not just for the length of a step.

       It was cleared in _tourMove, on the reasoning that the change is over once the card has
       landed — and the palette-open scroll's own onComplete still beat it. The settle compares
       rounded rects, and the tail of a Lenis glide repeats the same whole pixel for five frames
       while it is still moving, so _tourMove fired at ~600ms and the scroll handed focus to the
       result region at 660. Measured: the card held focus until exactly that frame, three runs out
       of three, and only with motion on — under reduced motion the scroll is instant and the race
       does not exist, which is the tell.

       Held until _tourClose instead. Nothing else wants it in between: focusRegion only fires when
       a palette is opened, and during a tour that IS the tour. See focusRegion in methods/motion.js
       and the drawers' back-references in _tourSyncView — one rule, three places it has to hold. */
    this._tourOwnsFocus = true;
    const seq = this._tourSeq = (this._tourSeq || 0) + 1;
    const live = () => seq === this._tourSeq && this.state.tourStep != null;

    /* THE CONTENT AND THE MOVE RUN ON SEPARATE CLOCKS, and that is the fix for the dead beat.

       They were joined: nothing arrived until the new anchor had stopped moving. Measured on 2 → 3,
       where the anchor is a drawer that has to close (620ms) before another can open (800ms), the
       card sat blank and still for 900ms and then everything landed at once. Nine hundred
       milliseconds of an empty box is not a sequence, it is a stall with a flourish at the end.

       So the words belong to the CARD and arrive as soon as they are ready; the position belongs to
       the ANCHOR and waits for it. The card is never empty, and its 20px nudge onto the new drawer
       lands quietly under copy that is already being read. */
    this._tourPhaseAbort();
    // The surfaces behind the card change on their own: whatever this step does not want is shut.
    // Nothing is OPENED for the reader any more — a drawer step waits for them to press the control
    // that opens it (see the note on step 2 in STEPS).
    this._tourSyncView(step);

    // BEAT 1 — the words leave, and only then does the state carrying them change
    this._tourTextOut(() => {
      if (!live()) return;
      /* HIDDEN BEFORE IT IS RESTORED. _tourDropText puts the captured markup back, which for one
         frame paints the departed sentences at full opacity in their original position — measured
         at 5–12ms, a flash of the copy you have just watched leave, immediately before React writes
         the new words over it. Hiding first means the restore happens behind a visibility that
         _tourArmText is about to set anyway. */
      this._tourHideLines();
      this._tourDropText(true);
      // The box is held at its current height across the commit, so a step with a different shape
      // cannot resize it in one frame; _tourFold then eases it to the new one. See the note there.
      const card0 = (this.tourCardRef && this.tourCardRef.current) || document.querySelector('[data-tour-card]');
      const h0 = card0 ? card0.getBoundingClientRect().height : 0;
      if (card0 && h0) card0.style.height = h0 + 'px';
      this.setState({ tourStep: n, tourPhase: this._tourDrawerOpen(step) ? 'open' : 'shut' }, () => {
        if (!live()) { if (card0) card0.style.height = ''; return; }
        this._tourAttach();
        this._tourReveal(step);
        this._tourContent(n, step);
        this._tourFold(card0, h0);
        /* THE SETTLE WATCHES THE NEW ANCHOR, NOT THE OLD SURFACE LEAVING (20.09.26, second pass).

           It used to hang off _tourSyncView's completion, which meant the card could not be placed
           until every drawer the step was closing had finished closing — even when the thing it was
           being placed against had never moved. Measured across all ten crossings: 3 → 4 waited
           811ms for a harmony drawer to shut before moving to an Export button that had been sitting
           still the whole time, and 2 → 1 waited 795ms to move to the swatches. Both anchors were
           stable from the first frame.

           _tourSettle already polls the anchor's own rect, so pointing it straight at the step is
           both simpler and correct: a stable anchor settles on the third frame and the card travels
           under the arriving copy, and one that is still sliding in is waited for exactly as before.
           Five of the ten crossings drop from ~1.2s to ~0.75s on this alone. */
        if (step.via && !this._tourDrawerOpen(step)) this._tourCue(step);
        if (step.n === 1) this._tourWhereCue(live);
        this._tourSettle(step, () => { if (live()) this._tourMove(step); });
      });
    });
  },

  /* BEATS 2 AND 3 — the card's own contents, on the card's own clock.

     The counter leads because it is the smallest thing and the one that says WHICH step this is;
     the heading follows a block-beat behind it, the copy a block-beat behind that, line by line.
     Read top to bottom in the order the eye takes them, which is also the order they sit in. */
  _tourContent(n, step) {
    const D = this.DUR;
    this._tourBusy = false;
    this._tourArmText();
    this._tourStepper(0);
    /* NO LEAD ON THE HEADING. It carried a block-beat, which put 80ms of empty card between the last
       line leaving and the first arriving on top of the gap the out already leaves — the heading's
       own slot sat blank for 280ms, long enough to read as a stall rather than as a beat. The
       heading now starts the moment the state commits and the copy keeps its block-beat behind it,
       so the two still arrive in order and the card is only briefly empty. */
    this._tourRevealText(0);
    this._tourFocusCard();
    this.setState({ announce: 'Step ' + n + ' of ' + STEPS.length + '. ' + step.title + '. ' + this._tourBody(step) });
  },

  // BEAT 4 — the position, whenever the anchor is finally still. One eased move, then the pin is
  // rigid again (see _tourGlide and the [data-tour-card] note in global.css).
  /* BEAT 4 — ONE EASED MOVE, ON EVERY CROSSING, WITH NO EXCEPTIONS.

     The near-move suppression that stood here is gone. It applied any move under 40px on a single
     frame with no transition, which on 2 → 3 and 3 → 2 meant the card held still through the whole
     step change and then cut 20px sideways ~200ms after everything else on screen had stopped — the
     only thing moving at that moment, and the most literal instance of the complaint that some step
     changes read as instant. A short move is still a move; it now rides the same curve as a long
     one, where at 20px it is simply quiet.

     THE TRANSITION OWNS THE TRANSFORM WHILE IT RUNS. Tracking is left frozen until the glide ends,
     because the rigid pin re-solves every frame and rewriting the target mid-transition retargets
     it every frame — a 0.8s ease chasing a value that moves under it. The pin resumes when the
     glide's timer clears the attribute, which is also where the last solve is taken. */
  _tourMove(step) {
    const card = (this.tourCardRef && this.tourCardRef.current) || document.querySelector('[data-tour-card]');
    this._tourFrozen = false;
    if (this._reduce) { this._tourMoveReduced(card); return; }
    this._tourGlide();
    this._tourSolveNow();
    /* TRACKING IS NOT FROZEN THROUGH THE GLIDE, and it was for one round. The reason to freeze it
       was that the target moved under the transition while a drawer slid in — and solving against
       the resting box removed that: the target is now fixed from the frame the anchor mounts. What
       can still move it is the reader scrolling, and there the right answer is to retarget, which
       is exactly what a CSS transition does when its end value changes. Freezing would have left
       the card detached from its anchor for the whole 800ms of any step change a reader scrolled
       through, and the page scrolls freely at every step. */
    /* AND THE KEYBOARD, AGAIN. _tourContent focuses the card as soon as the words are there, which
       is right for a reader waiting on it — but openContrast and openHarmony each focused their own
       first control when they arrived, and they arrive AFTER that. Measured at step 3: focus was on
       the harmony drawer, not the card. Since 21.09.26 no step change opens a drawer at all — the
       reader does, and is rightly moved into it — so this has nothing to take back on the normal
       path; it stays as the end-of-change guarantee, because the tour owns focus for the length of a
       step change and this is where the change ends. */
    this._tourFocusCard();
  },

  /* THE SAME MOVE UNDER prefers-reduced-motion: A CROSSFADE, NOT A CUT.

     The media query drops the transform half of the glide, which on its own leaves the card
     teleporting the full crossing — measured at 757px in a single frame on 1 → 2. That is the
     appear this system's own rule forbids, and the guidance for this preference is explicit that a
     slide is replaced by an opacity crossfade rather than deleted. So the card fades out on
     --dur-state, is placed while it cannot be seen, and fades back in: the change is still legible
     as a change, and nothing travels. */
  _tourMoveReduced(card) {
    this._tourFocusCard();
    this._tourFadeMove(card);
  },

  // The crossfade itself, without the focus: a reader who opened a drawer is working in it.
  _tourFadeMove(card) {
    if (!card) { this._tourSolveNow(); return; }
    this._tourFrozen = true;
    card.style.opacity = '0';
    clearTimeout(this._tourRedT);
    this._tourRedT = setTimeout(() => {
      if (this.state.tourStep == null) return;
      this._tourFrozen = false;
      this._tourSolveNow();
      card.style.opacity = '';
    }, this.DUR.state * 1000);
  },

  /* WHAT EACH STEP NEEDS SHUT. The tour opens nothing (see step 2 in STEPS); what it still does on a
     step change is put away whatever the last step left open that this one does not want, so 2 -> 3
     shuts the contrast drawer and 3 -> 4 the harmony one. A drawer the reader opened for THIS step is
     left alone. */
  _tourSyncView(step) {
    const s = this.state;
    const needContrast = step.view === 'contrast';
    const needHarmony = step.view === 'harmony';

    /* SHUT ANYTHING THIS STEP DOES NOT WANT — and take the keyboard off the drawer's own hands
       while doing it.

       Each drawer captures document.activeElement when it opens and gives focus back to it when it
       closes, which is right for a reader who opened it and wrong for a step change that is about
       to put focus somewhere better. The restore fires on the close timeline's REVERSE COMPLETE,
       several hundred ms after _tourFocusCard has already run, so it lands last and wins: measured
       at step 4, where focus ended on the Check Contrast button two steps back instead of on the
       card. Nulling the reference is the drawers' own documented way of saying "nothing to return
       to" (see _finishHarmonyClose) — no new mechanism, and only on the closes the TOUR performs.
       A reader who dismisses a drawer themselves still gets the ordinary restore. */
    if (s.contrast && !needContrast) { this._contrastBack = null; this.closeContrast(); }
    if (s.harmony && !needHarmony) { this._harmonyBack = null; this.closeHarmony(); }
    if (s.exportOpen) this.closeExport();
  },

  /* NOTHING OPENS A DRAWER FOR THE READER (21.09.26). _tourOpenDrawer stood here and did; it went
     with the demonstration, and so did the keepFocus option it passed the drawers — a drawer is only
     ever opened by the reader now, and a reader who opens one is moved into it. */
  _tourDrawerOpen(step) {
    const s = this.state;
    return !!step && ((step.view === 'contrast' && s.contrast) || (step.view === 'harmony' && s.harmony));
  },

  // The control that opens a drawer step's drawer. The harmony button shown is the dominant band's —
  // every palette has one and no two share it — but any band's opens the step's drawer.
  _tourVia(step) {
    if (!step || !step.via) return null;
    if (step.via === 'contrast') return document.querySelector('[data-tour="via-contrast"]');
    if (step.via === 'harmony') {
      const p = this.state.current;
      const sw = p && p.swatches && p.swatches[0];
      return sw ? document.querySelector('[data-band][data-sid="' + sw.sid + '"] button[data-info]') : null;
    }
    return null;
  },

  /* THE CUE: ONE PASS OF THE CONTROL'S OWN HOVER, AND NOTHING ELSE MOVES (21.09.26).

     This was the demonstration beat, which ended by opening the drawer on the reader's behalf and
     sending the card after it. The opening is theirs now (see step 2 in STEPS), so what is left is
     the pointer: the control shows the state a cursor resting on it would, once, for the length of
     the copy's arrival, while the ring — placed by the solver, which resolves the step to this
     control while its drawer is shut — stays on for as long as the step waits. Under reduced motion
     nothing rolls and the cue is the fill (global.css). */
  /* STEP 1'S CUE IS THE PHOTOGRAPH'S (23.09.26, by request). As step 1's words arrive, the photograph
     lights one colour once — what pointing at that tile does (methods/where.js) — for the length the
     controls' own cue holds, then goes back.
     THE COLOUR THAT SHOWS, NOT THE LARGEST. The light is the colour's region at full strength over a
     grey dimmed to 42%, and the largest colour is often a near-black ground (Garnet's #0F0302): lit,
     it looked exactly like the grey around it, and the cue played with nothing to see. So it takes the
     colour whose light reads most — OKLab lightness plus twice its chroma, since colour against grey
     reads strongest — among those with at least 8% of the image and a region the masks can locate,
     falling back to the largest. On Garnet that is the orange, 15%, where the near-black 36% would light
     nothing; on Hard Gunmetal the pale #A6A188 over its near-black. It waits until the photograph is fully on
     screen, since step 1 usually arrives with the palette it is showing still rising into place, and
     it never takes a light the reader is making: a tile under the pointer or holding focus keeps its
     own. A step change, closing the tour or leaving it ends it at once (_tourWhereStop). */
  _tourWhereCue(live) {
    this._tourWhereStop();
    const p = this.state.current, list = p && p.swatches;
    if (!list || !list.length) return;
    const box = document.querySelector('[data-where-scope] [data-where]');
    const urls = box && this._whereMasks(p, box.querySelector('[data-where-base]'));
    const total = list.reduce((a, x) => a + (x.weight || 0), 0) || 1;
    let sw = null, best = -1;
    list.forEach((x, k) => {
      if ((x.weight || 0) / total < 0.08 || !(urls && urls[k])) return;
      const score = x.L + 2 * Math.hypot(x.a, x.b);
      if (score > best) { best = score; sw = x; }
    });
    sw = sw || list[0];
    const band = box && document.querySelector('[data-where-scope] [data-band][data-sid="' + sw.sid + '"]');
    if (!band) return;
    // Fully on screen: no ancestor still fading in, and none parked hidden for the stage's reveal.
    const seen = (el) => { for (let e = el; e && e !== document.body; e = e.parentElement) { const cs = getComputedStyle(e); if (parseFloat(cs.opacity) < 0.99 || cs.visibility === 'hidden') return false; } return true; };
    const t0 = performance.now();
    const wait = () => {
      if (!live() || !band.isConnected) return;
      if (!seen(box) && performance.now() - t0 < 2400) { this._tourWhereRaf = requestAnimationFrame(wait); return; }
      // The reader is already pointing at a tile, or in one: that light is theirs, and it stays.
      if (band.closest('[data-where-scope]').querySelector('[data-band]:hover, [data-band]:focus-within')) return;
      this._whereOn(band, p);
      this._tourWhereEl = band;
      this._tourWhereT = setTimeout(() => this._tourWhereStop(), (this.DUR.overlay + this.DUR.state) * 1000);
    };
    this._tourWhereRaf = requestAnimationFrame(wait);
  },
  _tourWhereStop() {
    cancelAnimationFrame(this._tourWhereRaf); clearTimeout(this._tourWhereT);
    const band = this._tourWhereEl; this._tourWhereEl = null;
    if (!band || !band.isConnected) return;
    const scope = band.closest('[data-where-scope]');
    if (scope && scope.querySelector('[data-band]:hover, [data-band]:focus-within')) return;
    this._whereOff(band);
  },
  _tourCue(step) {
    const via = this._tourVia(step);
    if (!via) return;
    via.setAttribute('data-tour-cue', '');
    clearTimeout(this._tourDemoT);
    this._tourDemoT = setTimeout(() => {
      try { via.removeAttribute('data-tour-cue'); } catch (e) { }
    }, (this.DUR.overlay + this.DUR.state) * 1000);
  },

  /* WHERE THE CARD GOES AND WHAT IT RINGS, for the step as the page stands right now. One answer,
     read by the solver, the settle and the scroll into view, so the three cannot disagree.
     A drawer step with its drawer shut waits at `viaAnchor` with the ring on the control that opens
     it; with the drawer open, both go to the drawer. Any other step goes to `anchor` and rings
     `ringOn` when it names one (step 1: the card beside Export, the ring on the swatches). */
  _tourTargets(step) {
    if (!step) return { placeEl: null, ringEl: null, place: null, ring: '' };
    const own = step.anchor ? document.querySelector(step.anchor) : null;
    if (step.via && !own) {
      const via = this._tourVia(step);
      const home = step.viaAnchor ? document.querySelector(step.viaAnchor) : null;
      // The harmony button stands inside the dominant band, so its ring does too: 'band' draws it in
      // the band's own ink (global.css [data-tour-lit="band"]), not the page's.
      return { placeEl: home || via, ringEl: via, place: step.viaPlace || step.place, ring: step.via === 'harmony' ? 'band' : '', waiting: true };
    }
    const ringEl = step.ringOn ? (document.querySelector(step.ringOn) || own) : own;
    return { placeEl: own, ringEl, place: step.place, ring: step.ring || '', waiting: false };
  },

  /* FOCUS FOLLOWS THE STEP. The card is tabIndex=-1 and takes focus on every change, so a keyboard
     reader is put ON the new instruction rather than left wherever the last press happened to leave
     them — which on step 2 is inside a drawer that has just been replaced. From the card, one Tab
     reaches Skip Tour and the pair, and Shift+Tab walks back into the page the card is about. There
     is no trap: the interface under this surface is live, and every step invites the reader to use
     it. */
  _tourFocusCard() {
    requestAnimationFrame(() => {
      const el = (this.tourCardRef && this.tourCardRef.current) || document.querySelector('[data-tour-card]');
      if (el) try { el.focus({ preventScroll: true }); } catch (e) { try { el.focus(); } catch (e2) { } }
    });
  },

  /* NEAR IS BOTH FEET IN THE SAME PLACE. Steps 2 and 3 are the same right-hand slot — 500px and
     480px of drawer, so their cards land 20px apart — and a surface that has barely moved should
     not announce itself by leaving and coming back. Everything else IS a jump: below the swatches
     to beside a drawer is most of the screen, and sweeping a card across a working interface to get
     there is motion for its own sake. Those cross-fade instead: out on the press, repositioned
     while nobody can see it, back in at the far end. The content changes in the same blink, which
     is the other reason it is the right beat rather than a cover for one. */
  /* ===== the words ==========================================================================

     ARM, REVEAL, DROP — three calls in that order, once per step, and the order is the whole of it.

     _maskLineReveal (methods/motion.js) is the app's ONE way of saying "new words here": it measures
     the rendered line breaks, rebuilds them as one overflow:hidden mask per visual line, slides each
     up from 110% and puts the plain text node back when it lands. The two drawers already drive it
     exactly like this. Nothing is reimplemented here; what this adds is the two beats around it.

     ARM is a visibility, not a split. React writes the new step's words the instant the state
     changes, and the card is deliberately still standing where the last step left it — so without
     this the reader would see the new copy arrive at the old address and then be revealed a second
     time. visibility:hidden holds the words back while keeping their layout, which the solver needs
     anyway: the card's new height has to be real before it is placed.

     DROP RUNS AT THE TOP OF THE NEXT STEP CHANGE. _maskLineReveal restores by writing the captured
     text back, so a restore that fires after React has written the next step's words puts the
     previous step's words over them. Forcing it while the text it captured is still on screen is
     the only ordering that cannot do that. */
  _tourLineEls() {
    const card = (this.tourCardRef && this.tourCardRef.current) || document.querySelector('[data-tour-card]');
    return card ? card.querySelectorAll('[data-tour-line]') : [];
  },

  /* BEAT 1 — THE WORDS LEAVE THE WAY THEY ARRIVED. Same masks, same direction of travel, reversed:
     each line goes up and out through the window it rose into. The old copy used to be switched off
     with a visibility flip, which is an instant pop on a surface where everything else eases.

     splitLines rather than _maskLineReveal, because that helper splits AND reveals in one call and
     what is wanted here is the split with a tween of the caller's own. Its restore is innerHTML, so
     it is undone before the state change — at which point the text it captured is still the text on
     screen, which is the only moment restoring it is safe.

     EASE.exit, not the arrival curve: leaving should be quicker and less ceremonious than arriving,
     and DUR.state is the shortest beat the system has for a control changing what it says.

     STAGGERED BY BLOCK, NOT BY LINE, which is the other half of "less ceremonious". A line beat
     between all four lines put the whole departure at 567ms — longer than the heading takes to
     arrive — and read as the copy being seen off one line at a time. The heading leaves, the body
     leaves an item-beat behind it, and inside each the lines go almost together. 350ms in total. */
  _tourTextOut(done) {
    const els = this._tourLineEls();
    const g = window.gsap;
    this._tourOutSplits = null;
    clearTimeout(this._tourOutT);
    if (!g || this._reduce || !els.length) { done(); return; }
    const splits = [];
    for (let i = 0; i < els.length; i++) { const sp = splitLines(els[i]); if (sp) splits.push(sp); }
    if (!splits.length) { done(); return; }
    this._tourOutSplits = splits;
    const D = this.DUR;
    let last = 0;
    splits.forEach((sp, block) => {
      sp.lines.forEach((line, i) => {
        const at = (block * D.overlayItem) + (i * 0.02);
        if (at > last) last = at;
        g.to(line, { yPercent: -110, duration: D.state, ease: this.EASE.exit, delay: at });
      });
    });
    this._tourOutT = setTimeout(done, (D.state + last + 0.02) * 1000);
  },

  _tourArmText() {
    this._tourDropText();
    const els = this._tourLineEls();
    for (let i = 0; i < els.length; i++) els[i].style.visibility = 'hidden';
  },

  _tourRevealText(delay) {
    const els = this._tourLineEls();
    const g = window.gsap;
    const lead = delay || 0;
    for (let i = 0; i < els.length; i++) {
      els[i].style.visibility = '';
      if (!g || this._reduce) continue;
      // The drawers' own figures (_revealDrawerText, methods/overlays.js): the overlay curve, a
      // line-beat between lines and a block-beat between the heading and the copy, so the card's
      // contents arrive at the same tempo every other floating surface's do.
      try {
        this._maskLineReveal(els[i], lead + (i * this.DUR.overlayBlock), {
          duration: this.DUR.reveal, ease: this.EASE.overlay, stagger: this.DUR.line,
        });
      } catch (e) { }
    }
  },

  // The reduced-motion crossfade leaves an inline opacity behind if the tour ends mid-fade.
  _tourClearOpacity() {
    clearTimeout(this._tourRedT);
    const card = (this.tourCardRef && this.tourCardRef.current) || document.querySelector('[data-tour-card]');
    if (card) card.style.opacity = '';
  },

  /* A CARD THAT CHANGES SHAPE UNFOLDS INTO IT (21.09.26, measured). Steps 1–5 are held to one box
     by the three-line reservation, so between them this does nothing — the height it measures after
     the commit is the height it had before. 'choose' is not held to it, and should not be: it has one
     line of copy and no stepper. So choose → 1 is the one crossing where the card genuinely becomes
     a different shape, and it did so in a single frame, 118px to 196px.
     _foldIn's own figures (methods/persistence.js), because this is a disclosure — a box opening to
     show more than it did — and the app already has one way of doing that: the height measured from
     the real content, tweened on DUR.reveal x 0.62 and EASE.fold, then handed back to the layout so
     nothing is left pinned to a stale pixel value. overflow is hidden only for the length of it, so
     the footer is uncovered as the box reaches it rather than hanging below the glass.
     Both heights are the same box, measured the same way. The first version pinned offsetHeight,
     which is whole pixels and includes the 1px border, and read scrollHeight, which leaves the
     border out: every numbered crossing then "folded" 196 -> 194 and sprang back to 196.15 on
     release, a 2px shiver on a card that was not changing shape at all. The new height is read
     with the pin lifted, in the same task, so no frame ever paints the unpinned box. */
  _tourFold(card, h0) {
    if (!card) return;
    const release = () => { card.style.height = ''; card.style.overflow = ''; };
    card.style.height = '';
    const h1 = card.getBoundingClientRect().height;
    const g = window.gsap;
    if (!h0 || Math.abs(h1 - h0) < 1 || this._reduce || !g) { release(); return; }
    card.style.height = h0 + 'px'; card.style.overflow = 'hidden';
    g.fromTo(card, { height: h0 }, { height: h1, duration: this.DUR.reveal * 0.62, ease: this.EASE.fold, onComplete: release });
  },

  _tourHideLines() {
    const els = this._tourLineEls();
    for (let i = 0; i < els.length; i++) els[i].style.visibility = 'hidden';
  },

  _tourDropText(keepHidden) {
    clearTimeout(this._tourOutT);
    // Beat 1's splits are the caller's own and carry no _splitRevert, so they are put back here.
    const out = this._tourOutSplits; this._tourOutSplits = null;
    if (out) for (let i = 0; i < out.length; i++) { try { out[i].restore(); } catch (e) { } }
    const els = this._tourLineEls();
    for (let i = 0; i < els.length; i++) {
      const r = els[i]._splitRevert;
      if (r) { try { r(); } catch (e) { } }
      if (!keepHidden) els[i].style.visibility = '';
    }
  },

  /* ===== the stepper ========================================================================

     THE CHOOSER'S COUNTER, ON THE CHOOSER'S PRINCIPLE ([ATMOS 6], methods/layeredSlider.js). Every
     number is a line in one clipped cell and the step being shown places all of them — a line
     height of distance per step — so the figure rolls rather than swapping, and it rolls on the
     card's own beat instead of running a tween with a second opinion about timing. The bar is the
     same idea in one dimension: scaled to the step, not animated from a timer.

     The lines are built once and left alone; React renders the cell with no children precisely so
     that it does not reconcile them away on the next step. */
  _tourStepper(delay) {
    const card = (this.tourCardRef && this.tourCardRef.current) || document.querySelector('[data-tour-card]');
    if (!card) return;
    const cell = card.querySelector('[data-tour-count]');
    const fill = card.querySelector('[data-tour-fill]');
    const n = typeof this.state.tourStep === 'number' ? this.state.tourStep : 0;
    if (!n) return;
    const total = STEPS.length;
    const g = window.gsap;
    if (cell && cell.childElementCount !== total) {
      cell.textContent = '';
      for (let i = 0; i < total; i++) {
        const line = document.createElement('span');
        line.className = 'tour-step__line';
        line.textContent = String(i + 1).padStart(2, '0');
        line.setAttribute('aria-hidden', 'true');
        cell.appendChild(line);
      }
    }
    if (cell) {
      const lines = cell.children;
      for (let i = 0; i < lines.length; i++) {
        const y = (i - (n - 1)) * 100;
        // EASE.fold and DUR.fold: this IS the travelling mark those two were solved for, and the
        // card is moving on them at the same moment. 'power3.out' was a stray curve from outside
        // the system doing the same job a token already names.
        if (g && !this._reduce) g.to(lines[i], { yPercent: y, duration: this.DUR.fold, ease: this.EASE.fold, delay: delay || 0, overwrite: true });
        else lines[i].style.transform = 'translateY(' + y + '%)';
      }
    }
    if (fill) {
      const x = n / total;
      // EASE.progress is the token for a bar reporting position; --ease-progress exists for this.
      if (g && !this._reduce) g.to(fill, { scaleX: x, duration: this.DUR.fold, ease: this.EASE.progress, delay: delay || 0, overwrite: true });
      else fill.style.transform = 'scale3d(' + x + ',1,1)';
    }
  },

  /* THE ONE EASED MOVE. Tracking is rigid — the card is pinned to its anchor, and a pin that lags
     is a pin that has come loose — so the transform carries no transition at rest. This turns one
     on for the length of the settle, which is the only move the reader is meant to read as a move:
     the card closing the last short distance to the thing the new step is about. Removed by a timer
     rather than transitionend, because a settle of zero distance fires no event at all. */
  _tourGlide() {
    const card = (this.tourCardRef && this.tourCardRef.current) || document.querySelector('[data-tour-card]');
    if (!card) return;
    card.setAttribute('data-tour-glide', '');
    clearTimeout(this._tourGlideT);
    /* 860 = --dur-overlay (800) plus a frame or two of slack, and it is the handover: the attribute
       comes off, tracking is given back, and one solve is taken so the pin picks up anything that
       moved while the transition owned the transform. It was 620 against a 500ms glide, which left
       the attribute alive for 120ms after the card had landed — and the pin non-rigid through it. */
    this._tourGlideT = setTimeout(() => {
      try { card.removeAttribute('data-tour-glide'); } catch (e) { }
      if (this.state.tourStep == null) return;
      this._tourFrozen = false;
      this._tourSolveNow();
    }, 860);
  },

  /* WAIT FOR THE ANCHOR TO STOP MOVING. Five identical frames rather than a fixed delay, because
     what is being waited on is not one duration: a drawer's arrival is a GSAP timeline, the page's
     own scroll into view is Lenis, and step 4's anchor is already still. Rect equality covers all
     three and ends as soon as the last of them is done. The cap is 90 frames — past that something
     is not going to settle, and a card placed roughly is better than a card never placed.

     IT WATCHES THE RESTING BOX (_tourRest), so a drawer sliding in is already "still" from the frame
     it mounts and the card sets off with it. What this now waits for is the things that genuinely
     move the anchor and cannot be subtracted: the page scrolling under a result-stage anchor, and
     the anchor not existing yet. The quarter-pixel mode went with the near-move suppression it was
     invented to serve — there is no tail to chase once the target is the resting box. */
  _tourSettle(step, cb) {
    let last = null, same = 0, tries = 0;
    const q = Math.round;
    const tick = () => {
      if (this.state.tourStep == null) return;      // left mid-settle
      const el = this._tourTargets(step).placeEl;
      const r = el && this._tourRest(el);
      const key = r ? (q(r.left) + ':' + q(r.top) + ':' + q(r.width) + ':' + q(r.height)) : null;
      same = (key && key === last) ? same + 1 : 0;
      last = key;
      if ((key && same >= 5) || ++tries > 90) { cb(); return; }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  },

  /* BRING THE ANCHOR INTO VIEW. A step whose subject is below the fold is a card pointing at
     nothing. Lenis owns the scroll here, so this goes through it when it is there (a bare
     window.scrollTo is overridden within a frame — see the note in PaletteApp), and lands
     immediately under reduced motion. */
  _tourReveal(step) {
    // The card's own target, which on a drawer step with its drawer shut is the home beside Export.
    // A drawer is fixed to the viewport and needs no scrolling to.
    const el = this._tourTargets(step).placeEl; if (!el || el.closest('[role="dialog"]')) return;
    const r = el.getBoundingClientRect();
    const vh = window.innerHeight || 0;
    if (r.top >= 80 && r.bottom <= vh - 80) return;      // already comfortably on screen
    const lenis = this._lenis;
    const y = Math.max(0, r.top + (lenis ? lenis.scroll : window.scrollY || 0) - Math.max(80, (vh - r.height) / 2));
    try {
      if (lenis) lenis.scrollTo(y, { immediate: !!this._reduce, force: true });
      else window.scrollTo({ top: y, behavior: this._reduce ? 'auto' : 'smooth' });
    } catch (e) { }
  },

  // ===== leaving ============================================================================

  // Which step the reader left from; 0 while the tour was still waiting for a palette to be chosen.
  _tourLeft() { const t = this.state.tourStep; trackEvent('Tour', { action: 'left', step: typeof t === 'number' ? t : 0 }); },
  skipTour() { this._tourLeft(); this._tourClose('Tour closed.'); },

  /* LEAVING BECAUSE THE SUBJECT LEFT, which is not the same act as skipping.

     No announcement and no focus restoration, and both omissions are the point. The reader did not
     dismiss the tour; they navigated, and the app already announces what they navigated TO — a
     second message on top of it would talk over the one that matters. Focus has likewise already
     been placed by whatever they pressed, and the tour's own restore would drag it back to a
     control belonging to the screen they just left. */
  _tourAbandon() {
    if (typeof this.state.tourStep !== 'number') return;
    // componentDidUpdate calls this on every commit while the stage is not 'result', and the card's
    // exit spans several of them — so it runs once and waits for its own fade.
    if (this._tourLeaving) return;
    this._tourSeq = (this._tourSeq || 0) + 1;      // supersede any change still in flight
    this._tourWhereStop();
    this._tourDetach();
    this._tourDropText();
    this._tourClearOpacity();
    this._tourRingTo(null);
    this._tourFrozen = true;
    this._tourOwnsFocus = false;
    this._tourBusy = false;
    this._tourBack = null;
    this._tourCardOut(() => { this._tourFrozen = false; this.setState({ tourStep: null, tourDone: {} }); });
  },

  /* ESCAPE MEANS LEAVE (21.09.26, audit — the brief: "Escape to exit"). On steps 2 and 3 the first
     Escape used to close the drawer and leave the tour standing beside nothing, because the drawers
     sit above the tour in the key ladder. A drawer the TOUR opened is part of its step, so Escape
     now takes the step and its drawer together, in one press, back to the palette. Skip Tour keeps
     its own meaning — close the tour, stay where you are — and leaves an open drawer open. */
  exitTour() {
    this._tourLeft();
    const step = this._tourStepDef();
    const tourDrawer = !!(step && ((step.view === 'contrast' && this.state.contrast) || (step.view === 'harmony' && this.state.harmony)));
    this._tourClose('Tour closed.', { closeDrawer: tourDrawer });
  },

  /* THE CARD LEAVES THE WAY THE DIALOGS DO. _dialogOut's figures — opacity and 10px down on
     DUR.overlayOut and EASE.overlay — because Finish Tour is the act the whole tour builds to and
     the last thing a reader keeps of it, and it was ending in one frame. The glide and the base
     opacity transition are taken off for the length of it, or the CSS transitions would re-ease
     every value GSAP writes and the exit would crawl behind itself. React removes the node after,
     so nothing inline is left to clean. Under reduced motion it is the opacity half only. */
  _tourCardOut(cb) {
    const card = (this.tourCardRef && this.tourCardRef.current) || document.querySelector('[data-tour-card]');
    const g = window.gsap;
    this._tourLeaving = true;
    const finish = () => { this._tourLeaving = false; cb(); };
    if (!card) { finish(); return; }
    card.style.pointerEvents = 'none';
    if (this._reduce || !g) {
      card.style.opacity = '0';
      setTimeout(finish, this.DUR.state * 1000);
      return;
    }
    clearTimeout(this._tourGlideT);
    card.removeAttribute('data-tour-glide');
    card.style.transition = 'none';
    g.to(card, { opacity: 0, y: '+=10', duration: this.DUR.overlayOut, ease: this.EASE.overlay, onComplete: finish });
  },

  /* FINISH LEAVES THE READER ON THE PALETTE, which is the ending the tour has been building to:
     they are standing in the thing they just learned to read, with everything they were shown still
     open to them. No image picker, no congratulation screen, no "what's next" — the last card
     already said what is next, and the interface under it is the answer. */
  finishTour() { trackEvent('Tour', { action: 'finished' }); this._tourClose('Tour finished. You are on the palette you chose.'); },

  /* WHERE A KEYBOARD READER IS LEFT WHEN THE TOUR ENDS, and it is not always where it started.

     The obvious answer — return focus to whatever opened this — is right for the invitation and
     wrong for a step, for two reasons found in testing. The footer's Take a Tour is UNMOUNTED while
     a tour is running (it would otherwise offer to restart the thing you are in), so on Finish or
     Skip from a step the element to return to does not exist and focus was simply dropped: the next
     Tab started again from the top of the document, two screens above the palette.

     And even with it mounted it would be the wrong destination. The tour ends ON the palette, by
     design — Finish leaves the reader in the thing they have just learned to read — so focus should
     end there too, on the last step's own subject, which is the one thing they are most likely to
     want to act on. tabindex -1 makes it focusable without joining the tab order, and only where it
     is not focusable already, so an Export button keeps its place in the sequence.

     The opener is still the answer from the invitation, where nothing has been shown yet and the
     honest thing is to put the reader back where they pressed. */
  _tourClose(announce, opts) {
    if (this._tourLeaving) return;
    const wasStep = this._tourStepDef();
    const closeDrawer = !!(opts && opts.closeDrawer);
    // Leaving with its drawer, the step's own subject is on its way out too, so focus goes to the
    // control that opens it — the thing the reader has just been shown — rather than into a drawer
    // that is closing.
    // Otherwise it is what the step was ABOUT — the thing it rings — which on step 1 is the swatches,
    // not Export, the card's home beside them.
    const subject = closeDrawer ? this._tourVia(wasStep) : (wasStep && wasStep.n ? this._tourTargets(wasStep).ringEl : null);
    this._tourSeq = (this._tourSeq || 0) + 1;
    clearTimeout(this._tourDemoT);
    const cued = document.querySelector('[data-tour-cue]');
    if (cued) cued.removeAttribute('data-tour-cue');
    this._tourWhereStop();
    this._tourDetach();
    this._tourClearOpacity();
    this._tourFrozen = true;
    this._tourOwnsFocus = false;
    this._tourBusy = false;
    this._tourDropText();
    this._tourRingTo(null);
    if (closeDrawer) {
      // The drawers hand focus back to whatever opened them, which was the card; it is leaving.
      this._contrastBack = null; this._harmonyBack = null;
      if (this.state.contrast) this.closeContrast();
      if (this.state.harmony) this.closeHarmony();
    }
    this._tourCardOut(() => { this._tourFrozen = false; this._tourCloseCommit(announce, subject); });
  },

  _tourCloseCommit(announce, subject) {
    this.setState({ tourStep: null, tourDone: {}, announce: announce || '' }, () => {
      const back = this._tourBack;
      this._tourBack = null;
      /* RETRIED UNTIL IT TAKES, on the wipe's own cadence (focusDestination: 60ms, twelve tries).

         Leaving with a drawer, the card's exit and the drawer's close both run on DUR.overlayOut,
         and the card's can finish first — measured three milliseconds ahead on step 3. At that
         moment the drawer is still modal and <main> is still inert, and focus() on an element inside
         an inert subtree fails without an error: the harmony disc was present, enabled and
         tab-reachable, the call ran, and document.activeElement stayed <body>. Step 2 only ever
         worked because the contrast drawer happened to commit first. So each candidate is tried
         only once it is out of an inert subtree, and the whole chain waits for one to take. */
      /* <body> IS NOT A PLACE TO LAND. _tourBack is whatever held focus when the tour opened, and a
         pointer press on the footer's Take a Tour does not focus the button in every browser — so
         it can be <body>. focus() on <body> "succeeds" (activeElement is <body> afterwards), which
         ended this chain on its first attempt, before the drawer had released <main>, having put
         focus nowhere. Measured on step 3: the harmony disc skipped as inert, then <body> taken. */
      const take = (el) => {
        if (!el || el === document.body || el === document.documentElement) return false;
        if (!document.contains(el) || el.closest('[inert]')) return false;
        try {
          if (el.tabIndex < 0) el.setAttribute('tabindex', '-1');
          el.focus({ preventScroll: true });
        } catch (e) { return false; }
        return document.activeElement === el;
      };
      let tries = 12;
      const land = () => {
        if (take(subject) || take(back) || take(document.querySelector('[data-app] main'))) return;
        if (--tries > 0) setTimeout(land, 60);
      };
      requestAnimationFrame(land);
    });
  },

  // ===== the view model =====================================================================

  /* WHAT THE VIEW BRANCHES ON. Two keys, because there are two surfaces with two lifetimes: the
     invitation is modal and brief, the card stands for as long as the reader keeps stepping.

     showRestart is true wherever the tool is and the tour is not already running — off the landing
     (there is nothing behind it to point at), and hidden while a tour is up, because a control that
     restarts the thing you are already doing is a control that can only lose your place. */
  _tourView() {
    const s = this.state;
    const step = this._tourStepDef();
    const n = STEPS.length;
    return {
      stage: (s.tourStep === 'invite' || s.tourInviteOut) ? 'invite' : null,
      leaving: !!s.tourInviteOut,
      showRestart: !this._landingUp() && s.tourStep == null && !s.sharedView,
      onRestart: () => this.openTourInvite(),
      onTake: () => this.takeTour(),
      onSkipInvite: () => this.skipTourInvite(),
      onInviteKey: (e) => { if (e.key === 'Escape') { e.stopPropagation(); this.skipTourInvite(); } else this.trapTourInvite(e); },
      card: !step ? null : {
        cardRef: this.tourCardRef,
        /* THE CARD SITS ABOVE THE SURFACE IT EXPLAINS AND BELOW ANYTHING THE READER OPENS ON TOP.

           Two layers, because there are two situations. On the result stage and the library the card
           is at 124: under the dialogs at 126, so the Export sheet a reader opens at step 4 covers
           it the way a modal should cover everything. Beside a drawer it is at 157, the drawers'
           own — mounted after them in AppView's return, so the tie breaks in the card's favour by
           ordinary stacking order rather than by outbidding them.

           IT IS AT 157 BECAUSE AT 124 IT WAS UNUSABLE. The drawer layer is a full-viewport box with
           a backdrop in it, so on steps 2 and 3 the card was drawn under that backdrop: dimmed,
           blurred, and swallowing every press aimed at Next. Caught in the first end-to-end run —
           the click on step 2's Next never landed. Still under the toast at 158: a status about
           something the reader just did outranks a note about something they might do. */
        /* WITH ANY DRAWER UP, not "on a drawer step" (21.09.26). A drawer step now spends part of its
           life with its drawer shut, waiting on the result stage, and there it is an ordinary card at
           124. It rises to 157 the moment a drawer is up — the step's own, opened by the reader, or
           the one the last step left closing behind the card, whose scrim would otherwise dim it for
           the length of the close. */
        z: (s.contrast || s.harmony) ? 157 : 124,
        // Spoken, not drawn: the stepper beside it is aria-hidden, so this carries the fact.
        counter: step.n ? 'Step ' + step.n + ' of ' + n : null,
        numbered: !!step.n,
        totalText: String(n).padStart(2, '0'),
        title: step.title,
        body: this._tourBody(step),
        /* CHOOSE HAS NO NEXT, and that is the design rather than an omission: the way on is opening
           a palette, and a Next beside that instruction would offer a way past the one act the step
           is asking for. Skip Tour is still there, so the step is not a trap. */
        hasNext: !!step.n,
        /* NEXT WAITS FOR THE STEP'S OWN ACT on a drawer step (21.09.26, by request: the reader presses
           the control, and is told to). Disabled rather than absent, so the row keeps its shape and
           the button stays where four presses have taught the reader to look; the copy's first
           sentence says what unlocks it. Once the drawer has been opened in this run it stays
           unlocked — shutting the drawer again, or coming back with Back, does not take it away. */
        nextDisabled: !!(step.via && !(s.tourDone || {})[step.n]),
        hasBack: step.n > 1,
        /* THE LAST STEP'S PRIMARY IS ITS ACT (21.09.26, UX review: Peak-End). It was Finish Tour, in
           the spot the reader had pressed Next four times, so the filled button ended the tour on the
           example while New Palette, the thing the step is about, sat ringed in the masthead. The
           primary is New Palette now and does exactly what the masthead's does — it opens the create
           page, no file dialog, so the reader still presses it themselves. Finish Tour takes the quiet
           slot Skip Tour holds on every other step: at the last step, leaving IS finishing. */
        nextLabel: step.n === n ? 'New Palette' : 'Next',
        nextAria: step.n === n ? 'New Palette: start a palette from your own image, and finish the tour' : 'Next step: ' + STEPS[step.n].title,
        backAria: step.n > 1 ? 'Back to step ' + (step.n - 1) + ': ' + STEPS[step.n - 2].title : null,
        skipLabel: step.n === n ? 'Finish Tour' : 'Skip Tour',
        skipAria: step.n === n ? 'Finish the tour and stay on this palette' : 'Close the tour and stay where you are',
        // The masthead's borderless label, reused rather than re-declared, so the two cannot drift.
        skipStyle: this.tourSkipStyle(),
        onNext: step.n === n ? () => this.tourMakeOwn() : () => this.tourNext(),
        onBack: () => this.tourBack(),
        onSkip: step.n === n ? () => this.finishTour() : () => this.skipTour(),
        /* ESCAPE IS HANDLED HERE TOO, not only in the app's key ladder, and the two do not disagree:
           this one fires when focus is INSIDE the card (where the ladder's drawer clauses would
           otherwise close the drawer the card is standing beside, which is not what a reader
           pressing Escape on the card means). stopPropagation keeps it from reaching the ladder. */
        onKey: (e) => { if (e.key === 'Escape') { e.stopPropagation(); this.exitTour(); return; } this._tourCardTab(e); },
      },
    };
  },

  /* Built here rather than read off renderVals' own tier3BtnStyle because that value is composed in
     the same object literal this is called from, and reaching into it from inside would depend on
     key order. monoLabel is the one definition of this voice; the size is the one difference since
     21.09.26, when the masthead's links went to --fs-body by request and the card's skip stayed at 12. */
  tourSkipStyle() {
    return this.monoLabel('var(--fs-detail)', 'var(--track-flat)', {
      display: 'inline-flex', alignItems: 'center', gap: '7px', padding: 0,
      background: 'none', border: 'none',
      color: 'var(--on-surface)', cursor: 'pointer',
      fontWeight: 500, lineHeight: 1.25, textTransform: 'none',
    });
  },

  // ===== placing the card ===================================================================

  /* The card is position:fixed and follows its anchor, so it has to be re-solved on anything that
     moves the anchor: the page scrolling under it (Lenis dispatches real scroll events), the
     viewport resizing, and the anchor itself changing size — the contrast drawer grows as its
     matrix fills, and the result stage reflows when the action row wraps. */
  _tourAttach() {
    this._tourDetach();
    this._tourSolveNow();
    this._tourOnViaKey = (e) => this._tourViaKey(e);
    document.addEventListener('keydown', this._tourOnViaKey, true);
    this._tourOnMove = () => this._tourSolveNow();
    window.addEventListener('scroll', this._tourOnMove, { passive: true });
    window.addEventListener('resize', this._tourOnMove);
    try {
      this._tourRo = new ResizeObserver(this._tourOnMove);
      const step = this._tourStepDef();
      const el = step && this._tourTargets(step).placeEl;
      if (el) this._tourRo.observe(el);
      const card = document.querySelector('[data-tour-card]');
      if (card) this._tourRo.observe(card);
    } catch (e) { this._tourRo = null; }
    /* AND A TICK, BECAUSE THE DRAWERS ARRIVE.

       Scroll and resize catch the page moving and the ResizeObserver catches a box changing size —
       neither catches a box that TRANSLATES, and the contrast and harmony drawers enter by sliding
       500px in from the right. Solved once on open, the card measured the drawer while it was still
       off-screen and placed itself 130px inside where the drawer was about to land: it read as the
       card sitting on top of the thing it was explaining, which is the one thing this solver exists
       to prevent. Caught in the first end-to-end run, at step 2.

       A frame loop rather than a transitionend, because there are three different clocks involved
       (a GSAP timeline on the drawer, a CSS transition on the card, Lenis on the page) and the only
       thing all three agree on is the frame. It costs one getBoundingClientRect and an early return:
       _tourPut writes nothing when the solved position has not changed, which after the drawer has
       landed is every frame. gsap.ticker rather than a private rAF so this shares the app's one
       loop; the bare rAF is the fallback for a page with no GSAP, which is also the page where
       nothing slides and the first solve was already right. */
    const g = window.gsap;
    if (g && g.ticker) { this._tourTick = () => this._tourSolveNow(); g.ticker.add(this._tourTick); }
    else {
      this._tourRaf = () => { if (!this._tourOnMove) return; this._tourSolveNow(); this._tourRafId = requestAnimationFrame(this._tourRaf); };
      this._tourRafId = requestAnimationFrame(this._tourRaf);
    }
  },

  _tourDetach() {
    if (this._tourOnViaKey) { document.removeEventListener('keydown', this._tourOnViaKey, true); this._tourOnViaKey = null; }
    if (this._tourOnMove) {
      window.removeEventListener('scroll', this._tourOnMove);
      window.removeEventListener('resize', this._tourOnMove);
      this._tourOnMove = null;
    }
    if (this._tourRo) { try { this._tourRo.disconnect(); } catch (e) { } this._tourRo = null; }
    if (this._tourTick) { try { window.gsap.ticker.remove(this._tourTick); } catch (e) { } this._tourTick = null; }
    clearTimeout(this._tourGlideT);
    /* THE FREEZE AND THE FADE ARE NOT CLEARED HERE, and that is the point. _tourAttach calls this
       first, to drop the previous step's listeners before adding its own — so resetting them here
       un-froze the card at the exact moment the freeze was supposed to be holding it, and the card
       went back to chasing the drawers. Measured: 2 → 3 travelled 874px of path, out to x 1051 and
       back, for a move of 20px. They belong to the tour's lifetime, so they are cleared where the
       tour ends (_tourClose). */
    if (this._tourRafId) { try { cancelAnimationFrame(this._tourRafId); } catch (e) { } this._tourRafId = null; this._tourRaf = null; }
    /* THE RING IS NOT TOUCHED HERE ANY MORE. It stripped every [data-tour-lit] on the page, and
       _tourAttach calls this at the start of every step — so the ring vanished in one frame at each
       crossing and reappeared in another. _tourRingTo moves it now, fading out where it was and in
       where it is going, and the close paths fade it off on the way out. */
  },

  /* THE RING MOVES; IT DOES NOT BLINK. Off where it was — outline-color to transparent on the
     [data-tour-lit] rule's own --dur-state transition, the attribute taken away only once it has
     faded, since removing it removes the transition with it — and on where it is going, committed
     transparent for one frame and then released to the rule's colour: --on-surface, or on a band
     the band's own ink. `call` marks the control the step is waiting for the reader to press, which
     repeats the ring's arrival until pressed (global.css [data-tour-call]); never under reduced
     motion, and it leaves with the ring. */
  _tourRingTo(el, ring, call) {
    const cur = this._tourRingEl || null;
    const want = ring || '';
    const calls = !!call && !this._reduce;
    if (cur === el && (!el || (el.getAttribute('data-tour-lit') === want && el.hasAttribute('data-tour-call') === calls))) return;
    if (cur && cur !== el) this._tourRingOff(cur);
    this._tourRingEl = el || null;
    if (!el) return;
    clearTimeout(el._tourRingT);
    const fresh = !el.hasAttribute('data-tour-lit');
    el.setAttribute('data-tour-lit', want);
    if (fresh && !this._reduce) {
      el.style.outlineColor = 'transparent';
      void el.offsetWidth;
    }
    el.style.outlineColor = '';
    if (calls) el.setAttribute('data-tour-call', ''); else el.removeAttribute('data-tour-call');
  },

  _tourRingOff(el) {
    if (!el) return;
    el.style.outlineColor = 'transparent';
    clearTimeout(el._tourRingT);
    el._tourRingT = setTimeout(() => {
      if (this._tourRingEl === el) return;         // re-lit while it was fading
      el.removeAttribute('data-tour-lit');
      el.removeAttribute('data-tour-call');          // after the fade: its ring inherits the fading colour
      el.style.outlineColor = '';
    }, this._reduce ? 0 : (this.DUR.state * 1000 + 40));
  },

  _tourStepDef() {
    const s = this.state.tourStep;
    if (s === 'choose') return CHOOSE;
    if (typeof s === 'number') return STEPS[s - 1];
    return null;
  },

  /* THE SOLVER. Four sides in preference order, each one tested for whether the card actually FITS
     between the anchor and the viewport edge; the first that does wins. Nothing is placed over the
     thing it explains — that is the one rule this function exists to keep — so when no side fits
     (a full-width anchor like the library table), the card falls to the foot of the viewport,
     centred, where it covers page rather than subject.

     Written straight onto the element rather than through state: this runs on every scroll frame,
     and a setState per frame is a re-render of the whole tool per frame. */
  _tourSolveNow() {
    if (this._tourFrozen) return;
    const step = this._tourStepDef(); if (!step) return;
    const card = document.querySelector('[data-tour-card]'); if (!card) return;
    const t = this._tourTargets(step);
    const el = t.placeEl;
    const W = window.innerWidth || 0, H = window.innerHeight || 0;
    const cw = card.offsetWidth || CARD_W, ch = card.offsetHeight || CARD_FALLBACK_H;

    /* THE DRAWER CLOSED BY THE READER IS NOT A STEP WITH NOTHING IN IT (21.09.26, audit). Clicking
       outside the contrast drawer, or a first Escape, left "Check Contrast" up with no ring and
       nothing it described on screen. This only runs unfrozen — so never during the tour's own
       drawer swaps, which freeze the solve — and a missing drawer then means the reader shut it.
       The card goes to the control that opens it again, and comes back to the drawer on its own if
       the reader presses it: the step follows the reader instead of stranding them. */
    // It calls while the step waits on a control the reader has not pressed yet (tourDone).
    if (t.ringEl) this._tourRingTo(t.ringEl, t.ring, t.waiting && !(this.state.tourDone || {})[step.n]);
    /* A NEW PLACE IS TRAVELLED TO, never cut to — including the moves the reader causes by opening
       or shutting a step's drawer. Under reduced motion the travel is the crossfade _tourMoveReduced
       uses for a step change, for the same reason: a 700px cut is an appearance. */
    if (el && card._tourAnchor && card._tourAnchor !== el && card._tx != null) {
      card._tourAnchor = el;
      if (this._reduce) { this._tourFadeMove(card); return; }
      this._tourGlide();
    }
    if (el) card._tourAnchor = el;

    /* A MISSING ANCHOR HOLDS THE CARD WHERE IT IS; it does not send it to a corner. The anchor is
       absent for a real reason exactly once — between a drawer leaving and the next one arriving —
       and parking during that gap was the round trip the freeze above was written to end. The foot
       of the viewport is for a card that has NEVER been placed and has nothing to hold. */
    if (!el) { if (card._tx == null) this._tourPark(card, W, H, cw, ch); return; }
    const r = this._tourRest(el);
    if (!r.width && !r.height) { if (card._tx == null) this._tourPark(card, W, H, cw, ch); return; }

    const clamp = (v, lo, hi) => Math.max(lo, Math.min(v, hi));
    const order = [t.place, 'inline-start', 'inline-end', 'block-end', 'block-start'];
    for (let i = 0; i < order.length; i++) {
      const side = order[i];
      if (side === 'inline-start' && r.left - GAP - GUTTER >= cw) {
        return this._tourPut(card, r.left - GAP - cw, clamp(r.top, GUTTER, H - ch - GUTTER));
      }
      if (side === 'inline-end' && W - r.right - GAP - GUTTER >= cw) {
        return this._tourPut(card, r.right + GAP, clamp(r.top, GUTTER, H - ch - GUTTER));
      }
      if (side === 'block-end') {
        const x = clamp(r.left, GUTTER, W - cw - GUTTER);
        const top = this._tourClearBelow(step, r.bottom, x, cw) + GAP;
        if (H - top - GUTTER >= ch) return this._tourPut(card, x, top);
      }
      if (side === 'block-start') {
        const x = clamp(r.left, GUTTER, W - cw - GUTTER);
        const bottom = this._tourClearAbove(step, r.top, x, cw) - GAP;
        if (bottom - ch - GUTTER >= 0) return this._tourPut(card, x, bottom - ch);
      }
    }
    this._tourPark(card, W, H, cw, ch);
  },

  /* The lowest edge the card has to clear on its way down, and the highest on its way up: the
     anchor's own, plus any `clear` box that actually sits in the card's column — a box off to one
     side is not in the way, and pushing past it would move the card for nothing. */
  _tourClearBelow(step, from, x, cw) {
    let y = from;
    const sel = step.clear || [];
    for (let i = 0; i < sel.length; i++) {
      const el = document.querySelector(sel[i]); if (!el) continue;
      const b = el.getBoundingClientRect();
      if (b.right <= x || b.left >= x + cw) continue;
      if (b.bottom > y && b.top < y + 200) y = b.bottom;
    }
    return y;
  },

  _tourClearAbove(step, from, x, cw) {
    let y = from;
    const sel = step.clear || [];
    for (let i = 0; i < sel.length; i++) {
      const el = document.querySelector(sel[i]); if (!el) continue;
      const b = el.getBoundingClientRect();
      if (b.right <= x || b.left >= x + cw) continue;
      if (b.top < y && b.bottom > y - 200) y = b.top;
    }
    return y;
  },

  /* WHERE THE ANCHOR WILL COME TO REST, WHICH IS NOT WHERE IT IS.

     getBoundingClientRect includes the element's transform, and the two drawers arrive by being
     translated 500px in from the right. Solving against that meant the card could not be placed
     until the drawer had stopped moving — so it waited, and then travelled afterwards. Measured
     across the five crossings, the card's move began anywhere between 402ms and 1780ms after the
     press depending on which anchor it was waiting for: the same press, five different rhythms,
     and on a drawer step a 100–126ms dead hand-off between the drawer landing and the card setting
     off.

     Subtracting the element's own translation gives the box it will occupy when its tween finishes,
     and that figure is correct from the frame it mounts. The card can therefore set off WITH the
     drawer and arrive with it, which is one gesture instead of two in a row. Only the element's own
     transform is removed, which is all the drawers use; a scaled or rotated anchor would need more,
     and none exists. */
  _tourRest(el) {
    const r = el.getBoundingClientRect();
    try {
      const t = getComputedStyle(el).transform;
      if (!t || t === 'none') return r;
      const m = new DOMMatrixReadOnly(t);
      if (!m.m41 && !m.m42) return r;
      return { left: r.left - m.m41, top: r.top - m.m42, right: r.right - m.m41, bottom: r.bottom - m.m42, width: r.width, height: r.height };
    } catch (e) { return r; }
  },

  // The foot of the viewport, on the side of the anchor's own inline edge — so even parked, the
  // card sits under the thing it is about rather than in an unrelated corner.
  _tourPark(card, W, H, cw, ch) {
    this._tourPut(card, Math.max(GUTTER, W - cw - GUTTER), H - ch - GUTTER);
  },

  _tourPut(card, x, y) {
    const nx = Math.round(x), ny = Math.round(y);
    /* THE CARD'S FIRST PLACEMENT, OUT OF THE INVITATION. Committed invisible at the invitation's own
       centre for one frame, then released onto the glide and the base opacity transition together,
       so it rises out of where the reader was already looking and travels to where it belongs.
       transition:none only for the commit frame — without it the start position would itself be
       eased toward, from 0,0. Under reduced motion there is no glide, so it is placed while still
       invisible and fades in where it lands, which is the crossfade that preference asks for. */
    if (card._tx == null && this._tourEnterFrom) {
      const f = this._tourEnterFrom;
      this._tourEnterFrom = null;
      const cw = card.offsetWidth || CARD_W, ch = card.offsetHeight || CARD_FALLBACK_H;
      const x0 = Math.round(f.cx - cw / 2), y0 = Math.round(f.cy - ch / 2);
      card.style.transition = 'none';
      card.style.opacity = '0';
      card.style.transform = 'translate3d(' + x0 + 'px,' + y0 + 'px,0)';
      void card.offsetWidth;
      card.style.transition = '';
      if (!this._reduce) this._tourGlide();
      card.style.opacity = '';
      card._tx = x0; card._ty = y0;
    }
    if (card._tx === nx && card._ty === ny) return;
    card._tx = nx; card._ty = ny;
    card.style.transform = 'translate3d(' + nx + 'px,' + ny + 'px,0)';
  },
};
