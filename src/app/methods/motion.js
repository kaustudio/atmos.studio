// Motion system: shared tokens, micro-interaction handlers, list-row activation (effect035) +
// value readout (effect019), the result reveal (bottom-to-top band wipe, masked line reveals),
// theme toggle, and the uppercase-label style builders.
import { syncThemeColor } from '../../lib/themeColor.js';
import { paletteTags as tagsFor, temperatureBand, lightnessBand, TEMP_LABEL } from '../../lib/classify.js';
import { initNumberOdometer } from './numberOdometer.js';

export const motionMethods = {
  // ---- motion tokens: one shared set, scaled by hierarchy ----
  initMotion() {
    // entrance/standard are expo-out curves: almost all the travel happens in the first fifth, which
    // is right for something arriving into place and wrong for something CHANGING SIZE — a height
    // on that curve snaps open and then creeps, which reads as a jump however long the tween is.
    // `fold` is the in-out curve the sliding selection marker already uses (misc.js), so a
    // disclosure and a moving selection share one motion character.
    // `overlay` is cubic-bezier(.19,1,.22,1) — an expo-out with a longer tail than `entrance`. It
    // is the utility overlays' own curve: almost all of the travel is spent in the first fifth, so
    // the panel is effectively THERE immediately and the remaining time is a settle rather than a
    // journey. That is what lets these surfaces run at 0.4s and still feel prompt.
    // `overlay` runs the ENTRANCE only. The exit is written out rather than derived (see _drawerOut
    // and _dialogOut), because the two ways of getting one for free both fail: reversing the
    // entrance mirrors the curve, so the panel accelerates off the screen, and easing the playhead
    // instead composes this curve with each tween's own and produces a motion that belongs to no
    // system. It used to be written out on `overlay` itself — same curve, its own duration — on the
    // reasoning that an overlay is asked to LAND, velocity → 0, in and out.
    //
    // `overlayExit` is that reasoning corrected. A thing that LEAVES does not land; it goes. Asking
    // an expo-out to perform an exit puts the entire curve backwards: peak velocity on the first
    // frame (2631px/s, 5.3x the panel's own average) and then two thirds of the duration spent
    // moving a panel nobody can see any more. It read exactly as it was built — a snap, then a long
    // slow nothing.
    //
    // A symmetric in-out fixes both halves at once: from rest, peak in the middle at under half the
    // old velocity, and gone at 86% of the tween instead of 40%. Mirrors --ease-overlay-exit.
    // ONE CURVE FOR THE WHOLE OVERLAY SYSTEM — in, out, panel, contents — and it is
    // cubic-bezier(.19, 1, .22, 1).
    //
    // This replaces three specialised curves that lived here for about a day: a power4 fit for
    // arriving fades, a sine-out for departing ones, and a symmetric in-out for the panel's exit.
    // Each was argued from a real measurement and each was defensible on its own. Together they
    // made a system in which no two things left the same way, which is the condition this file's
    // own opening paragraph exists to prevent.
    //
    // The collapse is a direct port. 28k.studio publishes its easing as a three-value scale —
    //     --o6: cubic-bezier(.19,1,.22,1)      --o3: cubic-bezier(.215,.61,.355,1)
    //     --o2: cubic-bezier(.25,.46,.45,.94)
    // and runs essentially every transform on --o6: `transform 1200ms var(--o6)` for the panel,
    // 800ms for the content, 700ms and 600ms elsewhere. --o6 is byte-identical to the curve this
    // file already called `overlay`. The reference is not using a curve we lacked; it is using ONE
    // curve where we had grown three.
    //
    // WHAT THE REFERENCE DOES NOT DO, and why one curve costs it nothing: it never runs this curve
    // on a long dismissal travel. Its menu closes on `opacity 250ms var(--o2)` — a quick fade,
    // no journey — so the front-loading that makes an expo-out wrong for a 500px slide never gets
    // the chance to show. Ours does slide, so the trade is stated plainly in _drawerOut rather than
    // hidden: peak velocity returns to the first frame. That is the accepted cost of one curve.
    this.EASE = { standard: this.cubicBezier(0.22, 1, 0.36, 1), entrance: this.cubicBezier(0.16, 1, 0.3, 1), exit: this.cubicBezier(0.4, 0, 1, 1), fold: this.cubicBezier(0.625, 0.05, 0, 1), overlay: this.cubicBezier(0.19, 1, 0.22, 1), reveal: this.cubicBezier(0.215, 0.61, 0.355, 1), progress: this.cubicBezier(0.33, 1, 0.68, 1) };
    /* `reveal` is `entrance` WITHOUT THE FRONT LOADING, and it is used by exactly one thing: the
       focus pull on About's colour demonstrations (renderVals.focusMotion). entrance is an expo-out,
       past 80% of its travel inside the first quarter of its duration — which is what you want from
       a control answering a press, and from text that should become legible as early as it can. A
       blur resolving on that curve is over before it reads as anything. This is an out-cubic — 58%
       at a quarter, 88% at half — so the resolve stays legible for its whole length. Same curve the
       loader's exit runs on, quoted to the digit.
       A SECOND TOKEN, NOT A RETUNE: entrance is shared by the landing lines, the dropzone, the
       masked text reveal on every document route and every control on the site, and all of them want
       the front loading. */
    // `overlay` is the UTILITY-OVERLAY band, and it is a deliberate exception to the reveal token
    // rather than a retune of it. `reveal` (620ms) is the app's arrival: a palette resolving out of
    // a photograph, bands wiping up in sequence, a stage taking the screen. That is the moment the
    // product is about, and it keeps its length.
    //
    // Harmonies, Filter, the contrast checker and the export dialog are not that. They are
    // instruments you open, use and shut, often several times in a row, and at 620ms with a section
    // cascade on top the close was still finishing while the user had moved on — measured in the
    // July review, which found Harmony gone and Filter still on screen past 150ms and read the two
    // as belonging to different systems. They do belong to one system; that system is just not the
    // arrival system.
    //
    // 0.8s, and the sequence is back. This band was briefly 0.18s with everything inside the panel
    // arriving as one flat object — which fixed the review's complaint (five overlays settling at
    // visibly different times) by removing the thing that made them worth watching. The complaint
    // was never that they were choreographed; it was that they were choreographed DIFFERENTLY and
    // at arrival length. One curve, one duration, one schedule shape across all five is what
    // actually answers it. On an expo-out the length costs nothing in perceived latency — 48% of the
    // travel is spent in the first 10% of the time, so the panel is present from the first frame
    // whatever the number is — and what the extra length buys is ROOM: sections, cells, rules and
    // masked text all have to fit inside one arrival without treading on each other, and at 0.4s
    // the last of them was still landing as the first finished.
    //
    // `overlayStep` is the beat between those contents. It scales with the band (0.05 × 0.8) rather
    // than being a fixed number, so the sequence keeps its proportions if the duration moves again.
    // `overlayItem` (50ms) and `overlayBlock` (80ms) are MEASURED, not chosen. They are the two
    // beats wrk-timepieces.com uses in its article list — 50ms between the rows of the table, 80ms
    // between the column headers above them — read off the running site by observing GSAP's own
    // style writes. They replace 64/128, which were derived from a ratio rather than from anything
    // anyone had looked at.
    //
    // `overlayArrive` (1.0s) is the length those beats are tuned against, and it is the surprising
    // half of the reference: a full second per element, with a 50ms beat. The two go together. On a
    // front-loaded curve a long duration is not a slow one — the element is 90% there in 440ms —
    // but the tail keeps it faintly moving for another half second, so a tight beat stacks nine
    // elements in their tails at once. That is what a continuous settle is made of. A short
    // duration with the same beat gives you a countable sequence; a long duration with a wide beat
    // gives you a queue.
    // `overlayBlock` is the beat between the panel's BLOCKS — its header, its controls, its matrix,
    // its sample — as distinct from the beat between the cells inside one of them. It was the same
    // number for a while, and one number could not do both jobs: at 0.08 the six blocks of the
    // contrast drawer opened 0.4s apart end to end while each took 0.56s to uncover, so five of the
    // six were always moving at once and the panel read as one wipe with a slight lean rather than
    // as a sequence. 0.16 × the band (0.128) against a block's own 0.44s reveal puts each block a
    // third of the way into its predecessor: far enough apart to be read in order, near enough that
    // there is never a frame with nothing moving. The panel's total is unchanged — the length came
    // out of each block's own duration and went into the gaps between them.
    // `overlayOut` was 1.0s — LONGER than the entrance — and that number existed only to pay for
    // the expo-out's tail: on that curve the panel was gone at 40% of the tween, so the remaining
    // 600ms was the "unhurried" part, and it was unhurried in the sense that nothing was happening.
    // Take the tail away and the length has nothing to buy. 0.62s on `overlayExit` puts 86% of the
    // tween on screen, which is more visible dismissal in less time than 1.0s ever delivered.
    // Still the same principle as before — an arrival answers a press and must feel prompt, a
    // dismissal is already decided and can afford to be quiet — it is just no longer being paid for
    // with time the viewer cannot see.
    // `fast` and `chrome` mirror --dur-fast / --dur-chrome in global.css, so the CSS interaction
    // contract and the GSAP tweens quote ONE scale rather than two that drift. No tween used either
    // value before this line was written, so their arrival cannot retime anything already running.
    // `swap` and `fold` are the two signature lengths that have no near neighbour on the scale, and
    // are named rather than remapped because nearest-step for both is 100ms+ away and would retune a
    // motion people recognise. Carried here so the two languages hold the SAME scale.
    // `swap` is ONE WORD REPLACING ANOTHER THROUGH A MASK, everywhere that happens — the copy
    // confirmation's val-mask keyframes and every hover swap on a button, sort header or footer
    // link. It was `confirm` at 0.38s while the confirmation was its only consumer; the hover swap
    // turned out to be the same motion, and 0.4 is where that stopped reading as snappy.
    // `line` (the masked-line stagger, which four call sites wrote as 0.09) and `extract` (the
    // extraction bar's run) joined the scale on 17.09.26 (audit F3), with EASE.progress, the bar's
    // curve: GSAP's power2.out, restated as the bezier global.css names --ease-progress.
    // `settle` is the processing atmosphere's natural end (procField.js _procClose): the turn easing
    // to rest and the gas dissolving once a reading is done. Chosen from recordings on 17.09.26, and
    // named rather than rounded to overlayOut for the reason swap and fold are.
    // `think` is the least time one line of the processing stage stays up ("Reading light…" and the
    // three after it), so each can be read; two of the four stretch it by what the photograph is
    // (pipeline.js _thought). Same day, same reason.
    // `swirl` is how long an impulse in the processing atmosphere's gas takes to die away
    // (procField.js _procImpulse): a kick, a wind-up or a burst of turbulence easing back to the
    // flow's resting figures. Longer than any arrival on the scale because it is not an arrival —
    // it is momentum leaving a body of gas, and a beat of it has to still be legible under the next
    // step's line. Chosen from recordings on 17.09.26.
    // `breathe` is one full breath of that same atmosphere while the live reading is out (procField
    // _procStep 3): the only step of the four whose length nobody knows, so the only one whose beat
    // has to be a cycle rather than an arrival. Long enough that a nine-second wait never repeats a
    // figure the eye has learnt, short enough to read as breathing rather than as drift.
    this.DUR = { micro: 0.12, fast: 0.18, state: 0.24, chrome: 0.28, swap: 0.4, fold: 0.5, overlay: 0.8, overlayOut: 0.62, overlayStep: 0.04, overlayItem: 0.05, overlayBlock: 0.08, overlayArrive: 1, reveal: 0.62, stagger: 0.05, line: 0.09, extract: 7.5, settle: 0.7, think: 0.75, focus: 0.9, swirl: 1.5, breathe: 2.6 };
    // focus (17.09.26, audit F4): the colour demonstrations' blur-to-sharp arrival (renderVals
    // focusMotion), which was written as 0.9. JS only; no CSS transition runs it.
  },
  /* mEnter / mLeave / mDown / mUp lived here — a GSAP hover-and-press system driven by a
     data-m-y / data-m-scale attribute protocol — and are gone (08.26). Nothing had ever bound them:
     they were plumbed through renderVals to the view model and no element read them, and no element
     anywhere set either attribute.
     Worth stating why they were a hazard rather than merely unused. mDown tweened scale 0.98 on
     DUR.micro — the same depression the live press contract now uses — but on EASE.standard, which
     is the expo-out that made the old translateY press read as a jump. So the tree held a
     plausible-looking press handler that was both unreachable AND wrong, beside the real one in
     global.css. The next person to grep for "press" would have found two and no way to tell. */
  // commitSelected went on 17.09.26 (audit E8): it scaled the current grid card 0.98 → 1 after a
  // palette opened, a press that moved geometry. Selection is shown by colour alone.
  // ---- ADDITIVE hover: strengthen ONLY the hovered element's own ring — never dim siblings ----
  dimEnter(e) {
    if (this._reduce || !window.gsap) return; const el = e.currentTarget;
    const r = el.querySelector('[data-ring]'); if (r) window.gsap.to(r, { opacity: 1, duration: this.DUR.state, ease: this.EASE.standard, overwrite: 'auto' });
    el.style.zIndex = '4';
  },
  dimLeave(e) {
    if (this._reduce || !window.gsap) return; const el = e.currentTarget;
    const r = el.querySelector('[data-ring]'); if (r) window.gsap.to(r, { opacity: 0, duration: this.DUR.state, ease: this.EASE.exit, overwrite: 'auto' });
    el.style.zIndex = '';
  },

  // ===== style builder: the uppercase label — the dominant repeated pattern (single source) =====
  // Takes a step off the scale, not a number. It used to take px and was the last place in the app
  // that could mint a size nothing else used — 8.5 got in here and nowhere else.
  monoLabel(size, track, extra) { return Object.assign({ fontFamily: 'Neue Montreal', fontSize: size, letterSpacing: track, textTransform: 'uppercase' }, extra || {}); },
  /* NONE OF THESE THREE DECLARE A TRANSITION, and that is the point. Every one of them is rendered
     on an element carrying data-ix, and an inline `transition` does not merge with the stylesheet's
     — it REPLACES it. So each of these was silently overriding the whole interaction contract with
     a shorter list, and every property it left out changed instantly.
     It was not theoretical: the two view toggles and the two sort toggles named only `color`, while
     [data-ix="seg"] tints its background on hover and brightens the selected one with a filter —
     both of which were therefore cutting between two frames on the app's most-clicked controls. The
     pager named four and happened to cover its own, which is worse in a way, because it looked like
     the pattern worked.
     Dropping the declaration is the entire fix: global.css already states background-color, color,
     border-color, box-shadow, opacity and filter for every data-ix tier, and reduced motion is
     handled there too — hence no _reduce branch here any more. */
  /* `extra` exists because this builder had been COPIED twice rather than called: the project-scope
     chips and the per-page options each restated the same eight properties inline, differing only
     by a layout detail (a gap and a flex, tabular numerals) — and each carried its own truncated
     transition, which is how they all ended up cutting their background tint. One builder, three
     call sites, and the difference stated as the difference. */
  /* THE SEGMENTED CONTROL SPEAKS LIKE THE ANALYTICS BANNER'S BUTTONS (17.09.26, audits D1 and G4, by
     request): 13px, Medium, flat, and the labels' own Title Case (the text-transform is lifted in
     global.css, beside the uppercase rule it overrides). Every toggle built here moves together:
     List / Grid, All and the project chips, the library panel's Filter / Projects, the
     page sizes and the contrast checker's two rails. */
  viewToggleOptStyle(active, extra) { return this.monoLabel('var(--fs-body)', 'var(--track-flat)', Object.assign({ fontWeight: 500, position: 'relative', zIndex: 1, padding: 'var(--btn-pad-sm)', cursor: 'pointer', border: 'none', background: 'transparent', color: active ? 'var(--surface)' : 'var(--on-surface-muted)' }, extra || {})); },
  // STADIUMS, like every other chip and control in the app. The corner is stated here rather than at
  // the call sites for the reason this builder exists at all: its consumers — the harmony drawer's
  // seven methods, the filter panel's sort pair — are one control wearing one shape, and a radius
  // added per surface is a radius that will disagree per surface.
  // The Most used / A–Z pair in the filter panel, and its only consumers. It used to fill with
  // --on-surface when active — the app's CTA treatment — so a SORT STATE was drawn as the strongest
  // control on a surface whose actual primary action is the filter rows. Selection is carried by ink
  // and edge now, at one step down in size: still unambiguous (colour AND border move, plus
  // aria-pressed; the weight step went on 17.09.26, audit G4), no longer the loudest thing in the panel.
  // THE SEGMENTED CONTROL'S TYPE (17.09.26, by request): --fs-body at Medium, as the contrast
  // checker's AA / AAA and the library's tabs read since round four, where this was --fs-fine at 400.
  // The case comes from global.css, which lists data-hx-cell with the other controls that keep the
  // case their labels are written in.
  toggleStyle(active) { return this.monoLabel('var(--fs-body)', 'var(--track-flat)', { padding: 'var(--btn-pad-sm)', borderRadius: 'var(--radius-pill)', cursor: 'pointer', border: '1px solid ' + (active ? 'var(--on-surface)' : 'var(--action-line)'), background: 'transparent', color: active ? 'var(--on-surface)' : 'var(--on-surface-muted)', fontWeight: 500 }); },
  /* THE PAGER STEPS ON A CHEVRON NOW, so this stopped being a label style. It was monoLabel with
     --btn-pad-sm, which is the right box for the words "Prev" and "Next" and the wrong one for a
     glyph: padding sizes a box around TEXT, and a chevron has no width of its own to pad. A fixed 32 square (30 until 17.09.26, audit C11) plus --radius-pill is a circle, which is what "full radius" means on
     a control whose content is one mark.
     opacity is stated here: these two keep their hairline, so the disabled state has an edge to fade
     as well as a glyph, and 0.35 is the figure this pager has always used. */
  pageNavStyle(disabled) {
    return {
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
      width: '32px', height: '32px', padding: '0', borderRadius: 'var(--radius-pill)',
      border: '1px solid var(--action-line)', background: 'transparent', color: 'var(--on-surface)',
      cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.35 : 1,
    };
  },
  setPageSize(n) { try { localStorage.setItem('palette-generator/pagesize', '' + n); } catch (e) { } this._listCommit({ pageSize: n, page: 0, announce: n + ' palettes per page.' }); },
  setPage(p) { const total = this.scopedFeed(this.state.feed).length; const max = Math.max(0, Math.ceil(total / (this.state.pageSize || 12)) - 1); const np = Math.max(0, Math.min(p, max)); if (np === (this.state.page || 0)) return; this._listCommit({ page: np, announce: 'Page ' + (np + 1) + '.' }); },

  // ===== list sort =====
  // Each column's FIRST activation opens on the direction that answers the question people bring to
  // it — most contrast, most accessible pairs, most recent — rather than a blanket ascending. A
  // second activation on the same column flips it. Sorting resets to page 1: staying on page 4 of a
  // reordered list shows a slice of rows that has nothing to do with what was just asked for.
  SORT_LABELS: { contrast: 'max contrast', aa: 'AA text pairs', time: 'date created' },
  setSort(key) {
    // Reordering replaces every row's contents just as wholesale as a page change does, so it takes
    // the same arrival rather than snapping to a new order in place.
    this.setState((st) => {
      const same = st.sortKey === key;
      const dir = same ? (st.sortDir === 'desc' ? 'asc' : 'desc') : 'desc';
      const highLow = key === 'time' ? ['newest first', 'oldest first'] : ['highest first', 'lowest first'];
      return { sortKey: key, sortDir: dir, page: 0, announce: 'Sorted by ' + this.SORT_LABELS[key] + ', ' + highLow[dir === 'desc' ? 0 : 1] + '.' };
    }, () => this._listRowsReveal());
  },
  // One comparator for the list. Ties fall back to newest-first so equal metrics — which are common,
  // AA pairs is a small integer — still land in a stable, meaningful order rather than an arbitrary one.
  sortDecorated(rows, key, dir) {
    const mul = dir === 'asc' ? 1 : -1;
    const val = (d) => key === 'contrast' ? d.met.contrastMax : key === 'aa' ? d.met.aaPairs : d.p.time;
    return rows.slice().sort((a, b) => ((val(a) - val(b)) * mul) || (b.p.time - a.p.time));
  },

  // List selection is a quiet, in-place load into the TOP result (not the fullscreen detail),
  // reusing the shared reveal — the same surface a freshly generated palette occupies.
  loadIntoResult(p, rowEl) {
    if (this.state.stage === 'result' && this.state.current && this.state.current.id === p.id) { if (rowEl && rowEl.focus) try { rowEl.focus(); } catch (e) { } return; }
    /* AFTER THE PRESS HAS PAINTED. Rendering the result is the heaviest commit in the app (about 50ms
       of a 4x-throttled click), and inside the click it held the frame that shows the press. The row
       is already lit under the pointer, so that frame goes first and the palette follows on the next
       task, one frame later than it did. A second row pressed in the gap wins: the token drops the
       first. The timeout is the floor for a tab that stops painting in between. */
    const token = (this._openToken = (this._openToken || 0) + 1);
    let ran = false;
    const run = () => {
      if (ran || token !== this._openToken) return;
      ran = true;
      clearTimeout(this._openT); this._openT = null;
      if (!this._alive) return;
      this._loadIntoResultNow(p, rowEl);
    };
    this._openT = setTimeout(run, 250);
    requestAnimationFrame(() => setTimeout(run, 0));
  },
  _loadIntoResultNow(p, rowEl) {
    if (this.state.stage === 'result' && this.state.current && this.state.current.id === p.id) return;
    this._fromRects = null;
    // Where this palette came from, so Close (pipeline.js closeResult) can put the reader back on
    // the row rather than at the top of an empty stage. Only a row activation sets it; a generated
    // palette has no row to go back to, and closeResult falls back to the plain reset there.
    this._resultFrom = rowEl ? p.id : null;
    const g = window.gsap;
    // Anchor-scroll: bring the viewport UP to the result region as the palette reveals (one eased
    // motion, coordinated with the band wipe). With a stable stage height there is no reflow to pin.
    this.setState({ stage: 'result', current: p, imageUrl: this.dispUrl(p), announce: 'Loaded ' + p.name + ' into the result.' }, () => {
      /* THE TOUR'S ENTRY POINT IS THE READER'S OWN CHOICE. `choose` waits here rather than
         selecting a palette for them, so all four steps run on whichever of the eight they opened —
         which is also why no step's copy may name a colour, a ratio or a harmony. No-ops unless the
         tour is actually waiting (methods/tour.js), so this costs an ordinary open nothing. */
      this._tourPaletteOpened();
      // move focus to the result region so focus follows the viewport (announce carries via aria-live)
      const region = this.resultRef.current || document.querySelector('main');
      requestAnimationFrame(() => {
        const target = document.querySelector('main'); if (!target) return;
        /* NOT WHILE THE TOUR IS MID-STEP. This hands focus to the result region when the scroll
           lands, which is right for a reader who opened a palette and wrong when the thing that
           opened it was the tour: the card has already taken focus by then, and this would quietly
           take it back to a region behind the card, so the next Tab starts from the top of the
           stage rather than from the step's own controls. Same rule the two drawers follow — the
           tour owns focus for the length of a step change, and says so with one flag. */
        const focusRegion = () => {
          if (this._tourOwnsFocus) return;
          if (region && region.focus) { try { region.setAttribute('tabindex', '-1'); region.focus({ preventScroll: true }); } catch (e) { } }
        };
        // Selection anchors the palette to the very top of the page under the sticky header.
        const dest = 0;
        // only skip when already at the very top
        if (window.scrollY <= 1) { focusRegion(); return; }
        if (this._reduce || !g || !g.plugins || !g.plugins.scrollTo) {
          try { window.scrollTo(0, dest); } catch (e) { }
          focusRegion(); return;
        }
        if (this._lenis) { this._lenis.scrollTo(dest, { duration: this.DUR.reveal, onComplete: focusRegion }); }
        else { g.to(window, { scrollTo: { y: dest, autoKill: false }, ease: this.EASE.entrance, duration: this.DUR.reveal, onComplete: focusRegion }); }
      });
    });
  },

  // ===== LIST view: additive row activation (effect035) + per-row value readout (effect019) =====
  /* THE PALETTE'S TAGS. Two, always, in this order: temperature, then lightness — the same two
     measured facets the Library filters on, from the same functions, so what a chip says and which
     filter group the palette answers to are one fact. Stored descriptors (the old free-form mood
     words) are never read for this: a palette's tags are recomputed from its swatches wherever it
     is shown, which is what lets an archive written years ago carry the same tags as one made now. */
  paletteTags(p) { return tagsFor(p && p.swatches); },
  // The same two words for an accessible name: "Warm, Dark".
  tagsSpoken(p) { return this.paletteTags(p).join(', '); },
  paletteMetrics(p) {
    const sw = p.swatches, n = sw.length;
    const dom = sw.reduce((a, b) => b.weight > a.weight ? b : a, sw[0]);
    let hue = Math.atan2(dom.b, dom.a) * 180 / Math.PI; if (hue < 0) hue += 360;
    const chroma = Math.sqrt(dom.a * dom.a + dom.b * dom.b);
    const Ls = sw.map((s) => s.L), lMin = Math.min.apply(null, Ls), lMax = Math.max.apply(null, Ls);
    const lums = sw.map((s) => this.relLum(s.hex));
    // The winning pair is captured in the loop that was already walking every pair for cMax, so
    // every surface that asks for metrics gets "use this on that" for nothing.
    //
    // ORDERED BY LUMINANCE, deliberately. The contrast drawer's own `best` records whichever member
    // it happened to visit first as the foreground, and the ratio is symmetric — so it recommends
    // dark-on-light or light-on-dark with equal probability. Harmless while it only tinted a sample;
    // wrong the moment it is stated as advice. Ink is the darker of the two, ground the lighter.
    let cMax = 1, aa = 0, bi = 0, bj = 0;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { const a = lums[i], b = lums[j], r = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); if (r > cMax) { cMax = r; bi = i; bj = j; } if (r >= 4.5) aa++; }
    const dark = lums[bi] <= lums[bj] ? bi : bj, light = dark === bi ? bj : bi;
    const total = n * (n - 1) / 2;
    return {
      hue: Math.round(hue), chroma, lMin: Math.round(lMin * 100), lMax: Math.round(lMax * 100),
      // Both bands come from src/lib/classify.js, which is also what the palette's tags read — so
      // the Temperature and Lightness groups and the chips can never disagree about a palette.
      temp: TEMP_LABEL[temperatureBand(sw)],
      // Three buckets, not the reading engine's five. A filter is a way of narrowing a shelf, and
      // five lightness steps split it so finely that most choices return almost everything. Mean
      // weighted by area, so a palette is dark when most of its SURFACE is dark rather than when it
      // merely contains something dark — the same test the role heuristic uses.
      lightBand: lightnessBand(sw),
      contrastMax: cMax, aaPairs: aa, totalPairs: total,
      // null when the palette has one swatch and therefore no pair at all.
      bestPair: n > 1 ? { fg: sw[dark].hex, bg: sw[light].hex, ratio: cMax } : null,
      // CAPABILITY, not a compliance score. The old scheme graded pass/partial/fail against the
      // whole pair set, and "pass" required all C(n,2) pairs to clear 4.5:1 — which no palette in a
      // 26-palette archive achieved, and which nothing short of a black-and-white ramp realistically
      // could. It claimed three states and shipped two.
      //
      // These states answer the question actually being asked — can I build an interface with this?
      // A "pair" is two palette colours that clear WCAG AA (4.5:1, SC 1.4.3) against each other, so
      // one can carry text on the other.
      //   none     0 pairs  — no usable text/background combination exists here
      //   limited  1–2      — a workable accent or a single pairing, not an interface
      //   flexible 3+       — enough distinct pairings to build a UI from
      // The 3 boundary is deliberate: below it you are designing around the palette, at or above it
      // the palette gives you choices. Measured across the current archive the split is roughly
      // 19% / 27% / 54%, so every state is reachable and none is vestigial.
      aaState: aa === 0 ? 'none' : aa <= 2 ? 'limited' : 'flexible',
      mood: (p.archetype && p.archetype !== 'seed') ? p.archetype : (p.descriptors[0] || '').toLowerCase(),
    };
  },
  // Resolve a CSS custom property to its concrete value in the ACTIVE theme (GSAP can't interpolate var()).
  _cssVar(name) { try { return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || ''; } catch (e) { return ''; } },
  /* Row hover and focus: THE FILL RISES. These used to tween the row's own background to
     --surface-white and back (DUR.state, EASE.standard) — a tint arriving in place. Now they
     unclip the row's [data-row-fill] layer from its bottom edge to its top (renderVals
     rowFillStyle), on DUR.swap and EASE.fold: the same motion and length as every label swap on
     the site, since a fill rising through a mask and a label rising through a mask are one
     gesture, and the reference's own curve for this. Same curve out as in, as the swap does, so
     leaving reads as the arrival reversed rather than as a cut. The row's background is no longer
     touched here at all — it belongs to the selected state (_syncListActive), which is why the
     old data-hover hand-off between the two is gone. Reduced motion: set, not run.
     THE EXPORT MENU'S ITEMS AND THE ASSIGN DIALOG'S OPTIONS share these handlers and carry no
     fill layer, so for them the old in-place tint stays: a menu item is a word on a list, not a
     row of the library, and its hover is the [data-ix] answer every other small control gives. */
  // `el` is the row's wrap from the pointer (it holds the action buttons too) and the row itself
  // from keyboard focus on the hit button; the fill is found under either.
  rowTintOn(el) {
    if (!el) return; const g = window.gsap, f = el.querySelector('[data-row-fill]');
    // [data-lit] on the wrap is what the stylesheet reads to turn the two action glyphs — which
    // sit above the fill, outside the row — to the surface's colour while the ink is up
    if (f) { const w = el.closest('[data-row-wrap]'); if (w) w.setAttribute('data-lit', '1'); if (this._reduce || !g) { f.style.clipPath = 'inset(0% 0 0 0)'; return; } g.to(f, { clipPath: 'inset(0% 0 0 0)', duration: this.DUR.swap, ease: this.EASE.fold, overwrite: 'auto' }); return; }
    if (this._reduce || !g) { el.style.background = 'var(--surface-white)'; return; }
    g.to(el, { backgroundColor: this._cssVar('--surface-white'), duration: this.DUR.state, ease: this.EASE.standard, overwrite: 'auto' });
  },
  rowTintOff(el) {
    if (!el) return; const g = window.gsap, f = el.querySelector('[data-row-fill]');
    if (f) { const w = el.closest('[data-row-wrap]'); if (w) w.removeAttribute('data-lit'); if (this._reduce || !g) { f.style.clipPath = 'inset(100% 0 0 0)'; return; } g.to(f, { clipPath: 'inset(100% 0 0 0)', duration: this.DUR.swap, ease: this.EASE.fold, overwrite: 'auto' }); return; }
    if (this._reduce || !g) { el.style.background = 'var(--surface-raised)'; return; }
    g.to(el, { backgroundColor: this._cssVar('--surface-raised'), duration: this.DUR.state, ease: this.EASE.standard, overwrite: 'auto' });
  },
  // Selection no longer expands a row — it drives the overview panel above, and the row's only job
  // here is to SHOW that it is the selected one. So this reconciles the selected surface and nothing
  // else. It has to run imperatively (rather than from rowStyle) because rowTintOn/Off bake an
  // inline background via GSAP on hover and focus; without this pass, a row that was hovered before
  // it was selected would keep the hover value and the selected row could be left reading as plain.
  //
  // The colour is only ever the QUIET half of the selected state. The persistent, non-colour half —
  // the left marker bar, the "Viewing" label and aria-current — is declarative in the view-model and
  // is what actually survives a hovered neighbour looking momentarily identical.
  _syncListActive() {
    const wrap = document.querySelector('[data-list-wrap]'); if (!wrap) return;
    const rows = [...wrap.querySelectorAll('[data-row]')]; if (!rows.length) return;
    const g = window.gsap, reduce = this._reduce;
    const curRow = rows.find((r) => r.getAttribute('data-cur') === '1') || null;
    const curId = curRow ? curRow.getAttribute('data-rowid') : null;
    const changed = (curId !== this._selectedCurId);
    rows.forEach((r) => {
      const selected = (r === curRow);
      const token = selected ? '--surface-white' : '--surface-raised';
      // Tween only the two rows whose selection actually flipped; every other row is set flat, so a
      // re-render (pagination, delete, theme) never restages motion the user did not ask for.
      const flipped = changed && (selected || r.getAttribute('data-rowid') === this._selectedCurId);
      if (flipped && g && !reduce) g.to(r, { backgroundColor: this._cssVar(token), duration: this.DUR.state, ease: this.EASE.standard, overwrite: 'auto' });
      else r.style.background = 'var(' + token + ')';
    });
    this._selectedCurId = curId;
  },

  // ===== list arrival =====
  // WHY THE LIST USED TO JUMP. Nothing scripted it. The list is plain document flow with no reserved
  // height — one row is --row-list-height plus its 1px top border, ~49px — so 36 → 12 removes over a
  // thousand pixels of DOCUMENT, the browser clamps scrollY to the new maximum, and the viewport
  // snaps upward. The reader is near the bottom by definition, because that is where the pager is,
  // so the clamp fired on essentially every page change. It was the clamp, never a transition.
  //
  // Anchor FIRST, then swap. Bringing the list's own top to the viewport puts the height change
  // below the fold of attention instead of under the cursor, lands the reader on row 1 of the new
  // page, and leaves the clamp nothing to do because scrollY is small by the time the rows change.
  // Ordering is the whole fix: swapping first and scrolling after would animate away FROM a snap
  // that already happened.
  //
  // WHERE IT LANDS: scroll-margin, expressed in JS because Lenis works out its own stop position and
  // ignores the CSS property. Landing the list flush against the viewport top puts it UNDER the
  // sticky header, so the offset clears that header and then leaves a strip of breathing room above
  // the first row. The header is measured rather than assumed — it is the element that would cover
  // the list, so its real height is the only honest source for how far to stop short.
  LIST_SCROLL_MARGIN: 24,   // breathing room above the list, once the sticky header is cleared
  _stickyChromeHeight() {
    const h = document.querySelector('header:not([data-ochrome])');
    if (!h) return 0;
    try { if (getComputedStyle(h).position !== 'sticky') return 0; } catch (e) { return 0; }
    return h.getBoundingClientRect().height || 0;
  },
  _listRows() { return [...document.querySelectorAll('[data-list-wrap] [data-row-wrap]')]; },
  // `after` receives the SECONDS OF TRAVEL still left when it fires, so the cascade can be fitted to
  // the time remaining and land on the same beat the scroll does.
  _listAnchor(futureRows, after) {
    // The commit must NEVER depend on a scroll finishing. A stalled ticker would otherwise swallow
    // the page change outright — the reader presses Next and nothing happens — which is a far worse
    // failure than the jump this replaces. So the callback is latched and also fired by a timer.
    let fired = false;
    const dur = this.DUR.reveal;
    const t0 = (function () { try { return performance.now(); } catch (e) { return 0; } })();
    const left = () => { try { return Math.max(0, dur - (performance.now() - t0) / 1000); } catch (e) { return 0; } };
    const done = () => {
      if (fired) return; fired = true;
      if (this._listAnchorT) { clearTimeout(this._listAnchorT); this._listAnchorT = null; }
      if (this._listAnchorTick) { try { window.gsap.ticker.remove(this._listAnchorTick); } catch (e) { } this._listAnchorTick = null; }
      if (after) after(left());
    };
    const el = this.gridRef && this.gridRef.current, g = window.gsap;
    if (!el) { done(); return; }
    let top = Math.max(0, window.scrollY + el.getBoundingClientRect().top - this._stickyChromeHeight() - this.LIST_SCROLL_MARGIN);
    // Never aim past where the SHORTER page will be able to scroll. Anchoring to the list top is
    // pointless if the post-commit document cannot reach it — the browser would clamp on arrival and
    // reintroduce the very snap this exists to remove, just smaller. Row height is measured from the
    // live rows rather than assumed from the token, so a row-height change cannot silently break it.
    const wrap = document.querySelector('[data-list-wrap]'), cur = this._listRows().length;
    // A height ramp from a folder switch still in flight would make the wrap measure short and throw
    // the row height off. Settle it first: the anchor needs the list's real size, not a frame of an
    // animation.
    if (wrap && this._listFrozenH != null) { try { g.killTweensOf(wrap); g.set(wrap, { clearProps: 'height,overflow' }); g.set(this._listRows(), { clearProps: 'flexShrink' }); } catch (e) { } this._listFrozenH = null; }
    let futureMax = Infinity;
    if (wrap && cur && typeof futureRows === 'number') {
      const rowH = wrap.getBoundingClientRect().height / cur;
      const shrink = Math.max(0, (cur - futureRows) * rowH);
      futureMax = Math.max(0, document.documentElement.scrollHeight - shrink - window.innerHeight);
      top = Math.min(top, futureMax);
    }
    const dist = Math.abs(window.scrollY - top);
    if (dist < 8) { done(); return; }                       // already reading from the top: no move at all
    if (this._reduce || !g) { try { window.scrollTo(0, top); } catch (e) { } done(); return; }
    // Swap the rows the moment it is SAFE, not the moment the travel ends. What made the old jump was
    // committing while scrollY still sat above what the shorter document could hold; the instant the
    // page has come down past that line the swap is clamp-free, and the cascade gets to run ALONGSIDE
    // the remaining travel instead of queueing behind it. When the row count is unchanged — paging
    // within a full page — that line is already behind us and the two start together.
    // 2px of tolerance, because scrollY is fractional while scrollHeight is an integer: at the very
    // bottom of the page the comparison reads false by a subpixel and would defer the commit for no
    // reason. Two pixels of clamp is nothing; losing the overlap on the commonest case is not.
    const safe = (y) => y <= futureMax + 2;
    if (safe(window.scrollY)) { done(); }
    else {
      const watch = () => { if (safe(window.scrollY)) done(); };
      this._listAnchorTick = watch;
      try { g.ticker.add(watch); } catch (e) { this._listAnchorTick = null; }
    }
    clearTimeout(this._listAnchorT);
    // The failsafe must land the scroll THROUGH whoever owns it. A raw window.scrollTo here while
    // Lenis is still mid-animation is a tug of war Lenis wins — it keeps interpolating from its own
    // idea of the position and drags the page back off the mark. Telling Lenis to jump keeps one
    // owner of the scroll at all times.
    const land = () => { if (this._lenis) { try { this._lenis.scrollTo(top, { immediate: true }); return; } catch (e) { } } try { window.scrollTo(0, top); } catch (e) { } };
    this._listAnchorT = setTimeout(() => { this._listAnchorT = null; land(); done(); }, this.DUR.reveal * 1000 + 250);
    // Lenis owns the page's scroll when it is running; going around it would fight its own rAF loop.
    if (this._lenis) { this._lenis.scrollTo(top, { duration: this.DUR.reveal, onComplete: done }); return; }
    if (g.plugins && g.plugins.scrollTo) { g.to(window, { scrollTo: { y: top, autoKill: false }, duration: this.DUR.reveal, ease: this.EASE.entrance, onComplete: done }); return; }
    try { window.scrollTo(0, top); } catch (e) { } done();
  },
  // Rows arrive as ONE unit, top to bottom. The stagger is deliberately tighter than the statement
  // lines' — there can be 36 of them, and the whole cascade still has to read as a single gesture
  // rather than a queue — so it is derived from the row count and capped, never a flat per-row delay.
  // ===== list height ramp (scoping) =====
  // Folders hold different numbers of palettes, so scoping the archive changes the list's height —
  // and everything below it moves with it, the pager most visibly. Worse, when the document becomes
  // shorter than the current scroll position the browser clamps, and the page lurches upward to keep
  // the end of the document at the bottom of the viewport. That is the jump: the reader did not ask
  // to move, the document moved under them and dragged the view along.
  //
  // Holding the wrap at its old height across the swap and TWEENING to the new one turns that step
  // change into a ramp. Any clamp that still has to happen is spread over the same beat as the row
  // cascade, so the page settles instead of snapping — and the pager glides to its new place rather
  // than teleporting there.
  //
  // The rows are direct flex children of a column flex container with the default flex-shrink: 1, so
  // pinning a height SHORTER than the content (switching to a fuller folder) would squash every row
  // instead of clipping. flex-shrink is held at 0 for the duration; overflow hides the overhang.
  _listFreezeHeight() {
    const g = window.gsap, wrap = document.querySelector('[data-list-wrap]');
    this._listFrozenH = null;
    if (!g || this._reduce || !wrap || this.state.feedView !== 'list') return;
    const h = wrap.getBoundingClientRect().height;
    if (!h) return;
    this._listFrozenH = h;
    g.killTweensOf(wrap);
    g.set(wrap, { height: h, overflow: 'hidden' });
    g.set(this._listRows(), { flexShrink: 0 });
  },
  _listSettleHeight(span) {
    const g = window.gsap, wrap = document.querySelector('[data-list-wrap]');
    const from = this._listFrozenH; this._listFrozenH = null;
    if (!g || this._reduce || !wrap || typeof from !== 'number') return;
    const rows = this._listRows();
    g.set(rows, { flexShrink: 0 });   // the new rows are different elements from the frozen ones
    const release = () => { try { g.set(wrap, { clearProps: 'height,overflow' }); g.set(this._listRows(), { clearProps: 'flexShrink' }); } catch (e) { } };
    // Measure the new contents by SUMMING THE ROWS, never by lifting the pin. Setting height:auto to
    // read the natural size — the obvious way — un-pins the wrap for a frame, the document collapses,
    // and the browser clamps the scroll right there; restoring the pin cannot undo it. That single
    // measuring frame WAS the jump. scrollHeight is no good either: it reports the greater of content
    // and client height, so it lies by exactly the amount that matters whenever the list shrinks.
    const cs = getComputedStyle(wrap);
    const px = (v) => parseFloat(v) || 0;
    const chrome = px(cs.borderTopWidth) + px(cs.borderBottomWidth) + px(cs.paddingTop) + px(cs.paddingBottom);
    const gap = px(cs.rowGap) * Math.max(0, rows.length - 1);
    const to = rows.reduce((sum, r) => sum + r.getBoundingClientRect().height, 0) + chrome + gap;
    if (Math.abs(to - from) < 1) { release(); return; }
    const dur = Math.max(0.28, typeof span === 'number' ? span : this.DUR.reveal);
    // An IN-OUT curve, not the entrance token every other reveal uses. Those are expo-out: they cover
    // most of the distance immediately and settle, which is right when something arrives and wrong
    // here — this tween is dragging the reader's viewport with it, and front-loading the movement is
    // exactly the lurch being designed out. Measured with the entrance ease, 75% of the travel
    // happened in the first 20% of the time. Easing both ends spreads it around the middle instead.
    // Gentle in-out rather than a cubic one: what matters for a tween the viewport is riding is the
    // PEAK rate, not the average. A cubic in-out peaks at ~2.7x the even share; this flattens that to
    // ~1.5x, so there is no point in the ramp where the page is moving much faster than its average.
    const ease = this._listRampEase || (this._listRampEase = this.cubicBezier(0.45, 0, 0.55, 1));
    const tw = g.to(wrap, { height: to, duration: dur, ease: ease, onComplete: release });
    // Stall failsafe, same contract as every other reveal here: a ticker that never wakes must not be
    // able to leave the archive pinned to a stale height with its rows clipped.
    clearTimeout(this._listHeightT);
    this._listHeightT = setTimeout(() => {
      this._listHeightT = null;
      if (tw.progress() >= 1) return;
      try { tw.kill(); } catch (e) { }
      release();
    }, dur * 1000 + 1200);
  },
  _listRowsArm() {
    const g = window.gsap;
    if (!g || this._reduce || document.hidden || this.state.feedView !== 'list') return;
    if (document.querySelector('[data-land-line]')) return;   // landing is up; the archive is behind it
    const rows = this._listRows();
    if (!rows.length) return;
    g.set(rows, { y: 12, opacity: 0 });   // transform+opacity only: the container's height cannot move
  },
  /* THE WATCHDOG'S HALF OF _listRowsReveal. Leaves a cascade that is running or has finished exactly
     as it is, and only brings rows up when they are genuinely still hidden — which is the stall this
     path exists for, and the only case in which a second reveal is not itself the bug. */
  _listRowsRescue() {
    const g = window.gsap;
    const rows = this._listRows();
    if (!rows.length) return;
    if (g && rows.some((r) => g.isTweening(r))) return;
    const hidden = rows.some((r) => parseFloat(getComputedStyle(r).opacity) < 0.99);
    if (hidden) this._listRowsReveal();
  },
  _listRowsReveal(opts) {
    const g = window.gsap;
    if (!g || this._reduce || this.state.feedView !== 'list') return;
    // Behind the landing, nothing to reveal to: _listRowsArm has always made this same check, and
    // without it here the loader's exit timeline ran a full cascade under the first-visit landing
    // that nobody could see, only for Create's wipe to run the one they do.
    if (document.querySelector('[data-land-line]')) return;
    const rows = this._listRows();
    if (!rows.length) return;
    const delay = (opts && opts.delay) || 0;
    g.killTweensOf(rows);
    const n = rows.length, gaps = Math.max(1, n - 1);
    let duration = this.DUR.reveal, stagger = Math.min(0.035, 0.7 / n);
    // `span` = seconds of scroll travel still to run. Fit the WHOLE cascade inside it so the last row
    // settles on the same beat the page stops moving, instead of the reader arriving at the top and
    // then waiting for the list to catch up. The wave keeps its top-down order either way — it is
    // only being fitted to the time available. A floor stops a near-finished scroll turning it into a cut.
    if (opts && typeof opts.span === 'number') {
      const fit = Math.max(0.28, opts.span);
      stagger = Math.min(stagger, (fit * 0.45) / gaps);
      duration = Math.max(0.18, fit - stagger * gaps);
    }
    const tw = g.fromTo(rows, { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: duration, stagger: stagger, ease: this.EASE.entrance, delay: delay, clearProps: 'transform,opacity' });
    // Same stall contract as the masked lines: rows are set invisible the instant this is called, so
    // a ticker that never wakes must not be able to leave the archive blank. Plainly visible is the floor.
    clearTimeout(this._listRevealT);
    this._listRevealT = setTimeout(() => {
      this._listRevealT = null;
      if (tw.progress() >= 1) return;
      try { tw.kill(); } catch (e) { }
      try { g.set(rows, { clearProps: 'transform,opacity' }); } catch (e) { }
    }, 2500 + delay * 1000);
  },
  // FILTERED TO NOTHING, AND BACK (19.09.26, audit U1). While no palette matches, the panel takes the
  // table's place and the column header steps aside (renderVals showSortHeader). Both are a render,
  // and the rows they stand in for arrive on _listRowsReveal's rise, so the panel arrives on that rise
  // too, and the header comes back on it when a narrowing is undone: it is the table's first row, so
  // it returns with the rows rather than ahead of them. Read from the DOM after each commit rather
  // than from a setter, so every way in or out (a filter, a chip, a deletion, an undo) takes it.
  // Runs before paint, in componentDidUpdate, so nothing is seen at rest before it rises.
  _syncFilteredEmpty() {
    const panel = document.querySelector('[data-filtered-empty]');
    const on = !!panel;
    if (on === !!this._filteredEmptyOn) return;
    this._filteredEmptyOn = on;
    const g = window.gsap;
    if (!g || this._reduce || document.hidden) return;
    const el = on ? panel : document.querySelector('[data-sort-head]');
    if (!el) return;
    g.killTweensOf(el);
    const tw = g.fromTo(el, { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: this.DUR.reveal, ease: this.EASE.entrance, clearProps: 'transform,opacity' });
    // The reveals' stall contract: a ticker that never wakes must not leave either one invisible.
    clearTimeout(this._filteredEmptyT);
    this._filteredEmptyT = setTimeout(() => {
      this._filteredEmptyT = null;
      if (tw.progress() >= 1) return;
      try { tw.kill(); g.set(el, { clearProps: 'transform,opacity' }); } catch (e) { }
    }, this.DUR.reveal * 1000 + 1200);
  },
  // One path for every control that replaces the list's contents wholesale, so page, page size and
  // sort cannot drift into three different behaviours. The reveal runs in setState's callback —
  // after the DOM is committed but before the browser paints — so the rows are never shown at rest
  // for a frame before being hidden to start.
  _listCommit(patch) {
    const total = this.scopedFeed(this.state.feed).length;
    const size = patch.pageSize || this.state.pageSize || 12;
    const pg = typeof patch.page === 'number' ? patch.page : (this.state.page || 0);
    const futureRows = Math.max(0, Math.min(size, total - pg * size));
    this._listAnchor(futureRows, (travelLeft) => this.setState(patch, () => this._listRowsReveal({ span: travelLeft })));
  },

  // ===== theme toggle (chrome only — never the palette swatches) =====
  toggleTheme() {
    const next = this.state.theme === 'dark' ? 'light' : 'dark'; try { document.documentElement.setAttribute('data-theme', next); } catch (e) { }
    // the status bar / toolbar re-skin with the page, so the window keeps reading as one surface
    syncThemeColor();
    // clear any GSAP-baked inline background so rows fall back to the token-driven rowStyle under the new theme
    try { const g = window.gsap; document.querySelectorAll('[data-list-wrap] [data-row]').forEach((r) => { if (g) g.killTweensOf(r); r.style.removeProperty('background-color'); r.style.removeProperty('background'); const f = r.querySelector('[data-row-fill]'); if (f) { if (g) g.killTweensOf(f); f.style.clipPath = 'inset(100% 0 0 0)'; if (r.parentElement) r.parentElement.removeAttribute('data-lit'); } }); } catch (e) { }
    this.setState({ theme: next, announce: next === 'dark' ? 'Dark theme.' : 'Light theme.' }, () => {
      // brief crossfade over the re-skin — quick, --ease-standard; instant under reduced motion
      const g = window.gsap; if (this._reduce || !g) return;
      const root = document.querySelector('[data-app]'); if (root) g.fromTo(root, { opacity: 0.5 }, { opacity: 1, duration: this.DUR.reveal * 0.5, ease: this.EASE.standard, clearProps: 'opacity' });
    });
  },

  // ===== result reveal =====
  // Shared reveal: bands wipe up from the bottom edge, one after the next (settle-with-authority).
  //
  // UP, and it stays up. This was briefly changed to a left-to-right wipe to match the harmony
  // swatches, on the reasoning that one rule — "a colour surface is revealed horizontally" — ought
  // to hold across the app. It should not, and the reason is that these bands are not an instance
  // of anything: they are the arrival the product is about, a palette resolving out of a
  // photograph, and the bottom-up wipe IS that moment rather than a treatment applied to it. The
  // harmony drawer's swatches are a preview inside a utility panel and can take the panel's own
  // vocabulary; the result stage sets the vocabulary and is not a consumer of it.
  animateBands() {
    const g = window.gsap, root = this.resultRef.current;
    if (!g || !root || document.hidden) return;
    const bands = root.querySelectorAll('[data-band]');
    // Reduced motion: one fade on the swap step, every band together (17.09.26, audit F4: it was .4
    // with a .03 stagger, neither of them named, and a sequence is the thing the preference declines).
    if (this._reduce) { g.fromTo(bands, { opacity: 0 }, { opacity: 1, duration: this.DUR.swap, ease: 'none', clearProps: 'opacity' }); return; }
    // fully clipped, then wiped up from the bottom edge
    this._bandWipe(bands, 100, 0, { duration: this.DUR.reveal, stagger: this.DUR.stagger, ease: this.EASE.entrance, clearProps: 'clipPath,--wipe' });
  },
  /* THE WIPE'S EDGE IS THE TILE'S CORNER (19.09.26, by request: "go with b and the rounded edge"). Each
     band is a tile with --radius-card corners now, and a plain inset() rose with a square edge, so for
     most of the arrival a band read as a tile with its top cut off. `round` gives the clip the tile's
     corner, so every frame is a whole rounded tile growing into place, and the sink when the result
     leaves (pipeline.js doReset) has the same edge on the way down.
     The inset rides a custom property, not the clip-path string. GSAP takes a tween's start from the
     element, and the browser shortens inset() the way it shortens margin (100% 0% 0% 0% comes back as
     100% 0% 0%, and 0% 0% 0% 0% as 0%), so a string tween paired the wrong numbers: measured on the
     first build of this, the corner grew from 0 to 12px through the rise and the left edge moved with
     it. A custom property comes back as written, so the tween is one number and the corner is the
     tile's from the first frame. A band caught mid-wipe goes on from where it is (`from` null), and
     whatever else was moving it stops first, so an arrival's clean-up never lands inside a sink. */
  _bandWipe(bands, from, to, vars) {
    const g = window.gsap, list = [].slice.call(bands);
    const r = this._cssVar('--radius-card') || '12px';
    g.killTweensOf(list);
    list.forEach((b) => {
      if (from != null || !b.style.getPropertyValue('--wipe')) b.style.setProperty('--wipe', (from || 0) + '%');
      b.style.clipPath = 'inset(var(--wipe) 0% 0% 0% round ' + r + ')';
    });
    return g.to(list, Object.assign({ '--wipe': to + '%' }, vars));
  },
  animateText(delay) {
    const g = window.gsap, root = this.resultRef.current;
    if (!g || !root || document.hidden) return;
    const all = [...root.querySelectorAll('[data-fx]')];
    const meta = [...root.querySelectorAll('[data-meta]')];
    if (this._reduce) { this._stopShares(); g.fromTo(all.concat(meta), { opacity: 0 }, { opacity: 1, duration: this.DUR.swap, ease: 'none' }); return; }
    const split = all.filter((el) => el.hasAttribute('data-split'));
    // the shares count instead of rising (_countShares, from run below)
    const fx = all.filter((el) => !el.hasAttribute('data-split') && !el.hasAttribute('data-odometer-element'));
    // The metrics readout assembles as a sequence, from the same two primitives the page already
    // owns: every [data-meta-line] rule draws left→right (the loader bar's scaleX-from-origin-0
    // draw), and every [data-meta-split] text rises through the same masked line reveal as the
    // name and rationale above — each one a beat later than the last (half the shared stagger, so
    // eleven rules and ten texts overlap into one continuous pass down the block rather than
    // eleven separate events). Rules lead by a breath; the words rise into ruled space.
    const metaLines = [...root.querySelectorAll('[data-meta-line]')];
    const metaSplits = [...root.querySelectorAll('[data-meta-split]')];
    /* AFTER THE CLICK HAS PAINTED, NOT BEFORE IT. Each line split measures its own line breaks, and
       each measurement is a forced layout. With the name, the use line and ten readout texts, that
       was about 35ms of a palette opened from the library on a 4x-throttled CPU, all of it spent
       before the browser could show that the click had landed, and it is why the library row was
       the worst interaction Speed Insights recorded. Nothing here is due on screen before `delay`,
       so the splits and tweens wait for the next paint.
       The hiding cannot wait. Everything the reveal moves is parked with a bare style write, which
       asks nothing of layout, so the frame the click paints never shows the text whole. Unparking
       and the tweens' from-states then land in one task, so there is no frame between them either.
       The delay is shortened by however long the wait took, so the text still meets the bands on
       the same beat. A second reveal before the first has run releases the first's elements
       before parking them again, so a stale 'hidden' is never what gets restored. */
    if (this._textRevealCancel) this._textRevealCancel();
    const parked = split.concat(fx, metaLines, metaSplits);
    const was = parked.map((el) => el.style.visibility);
    parked.forEach((el) => { el.style.visibility = 'hidden'; });
    const unpark = () => parked.forEach((el, i) => { el.style.visibility = was[i]; });
    const asked = performance.now();
    let frame = 0, timer = 0, safety = 0, settled = false;
    const stop = () => { settled = true; this._textRevealCancel = null; cancelAnimationFrame(frame); clearTimeout(timer); clearTimeout(safety); unpark(); };
    const run = () => {
      if (settled) return;
      stop();
      if (!root.isConnected) return;
      const d = Math.max(0, delay - (performance.now() - asked) / 1000);
      this._countShares(d);
      g.from(fx, { y: 14, opacity: 0, duration: this.DUR.reveal, stagger: this.DUR.stagger, ease: this.EASE.entrance, delay: d });
      split.forEach((el) => this._maskLineReveal(el, d));
      if (metaLines.length) g.from(metaLines, { scaleX: 0, transformOrigin: '0% 50%', duration: this.DUR.reveal, stagger: this.DUR.stagger, ease: this.EASE.entrance, delay: d + 0.1, clearProps: 'transform' });
      metaSplits.forEach((el, i) => this._maskLineReveal(el, d + 0.16 + i * (this.DUR.stagger * 0.5)));
    };
    // A frame callback runs before that paint, so the task it posts is the first one after it. The
    // timeout is the floor for a tab that stops painting in between: the text still arrives.
    frame = requestAnimationFrame(() => { timer = setTimeout(run, 0); });
    safety = setTimeout(run, 500);
    this._textRevealCancel = () => { if (!settled) stop(); };
  },
  /* THE SHARES COUNT UP OUT OF THE BLUR (19.09.26, by request: "add the same progressive blur animation
     to the numbers"). Each band's share rolls up from 0 in its masked columns and resolves out of the
     focus blur (9px, renderVals focusMotion), with How it Works 2.1's figures: 1.4s a count, 0.2s
     between counts so they land one after another. It plays on the words' beat (`delay`), as the wipe
     has shown the top of the first band; numberOdometer.js [ATMOS 6] has the play-now mode. Built after
     the click has painted, with the words (animateText's run), since building measures every column;
     the band's clip hides the number until then. The group is React's, so its done-flag is cleared
     for each palette, and the last run is finished first. */
  _countShares(delay) { this._countIn(this.resultRef.current, 'stage', delay); },
  _stopShares() { this._stopCount('stage'); },
  /* The same count for any surface that shows shares — the stage, and the palette detail, which opens
     on the same five figures (19.09.26, by request: "add our blur animation to the numbers in grid view
     as well"). One handle per surface, so opening the detail over a counted stage does not stop it. */
  _countIn(root, key, delay) {
    this._stopCount(key);
    const group = root && root.querySelector('[data-odometer-group]');
    if (!group || this._reduce || document.hidden) return;
    group.removeAttribute('data-odometer-initialized');
    this['_count_' + key] = initNumberOdometer(root, { blur: 9, now: delay });
  },
  _stopCount(key) {
    const k = '_count_' + key;
    if (this[k]) { try { this[k](); } catch (e) { } this[k] = null; }
  },
  // Masked line reveal (Osmo SplitText mechanic, hand-split — no plugin): measure the rendered line
  // breaks via word spans, rebuild as overflow:hidden line masks, slide each line up from 110%, then
  // restore the plain text node so line-clamp, editing and future re-renders are untouched.
  // `opts` lets a caller run this at a tempo other than the page's. The overlays need it: they move
  // on their own curve and duration, and prose sliding up on the 620ms arrival curve inside a panel
  // that settles in 400ms is two animations in one box rather than one sequence. Defaults are the
  // original values, so every existing call site is untouched.
  _maskLineReveal(el, delay, opts) {
    const g = window.gsap;
    const o = opts || {};
    const dur = typeof o.duration === 'number' ? o.duration : this.DUR.reveal;
    const ease = o.ease || this.EASE.entrance;
    const step = typeof o.stagger === 'number' ? o.stagger : 0.08;
    const text = el.textContent;
    if (!text || !text.trim()) return;
    if (el._splitRevert) { try { el._splitRevert(); } catch (e) { } }
    const prev = { minHeight: el.style.minHeight, display: el.style.display };
    const box = el.getBoundingClientRect();
    // ONLY ITS OWN SPLIT. A second reveal on the same element (the contrast checker's lines, toggled
    // twice in a row) replaces el._splitRevert; the first one's tween still completes on its detached
    // lines, and its restore must not write the older text back over the newer.
    const restore = () => { if (el._splitRevert !== restore) return; el._splitRevert = null; el.textContent = text; el.style.minHeight = prev.minHeight; el.style.display = prev.display; };
    el._splitRevert = restore;
    el.style.minHeight = box.height + 'px';
    el.style.display = 'block';                                   // line-clamp's -webkit-box can't hold block masks; restored after
    // 1 — measure: word spans, lines grouped by offsetTop
    el.textContent = '';
    const words = text.split(/\s+/).filter(Boolean);
    const meas = words.map((w) => { const s = document.createElement('span'); s.style.display = 'inline-block'; s.textContent = w; el.appendChild(s); el.appendChild(document.createTextNode(' ')); return s; });
    const lines = []; let top = null;
    meas.forEach((s) => { if (s.offsetTop !== top) { top = s.offsetTop; lines.push([]); } lines[lines.length - 1].push(s.textContent); });
    // 2 — rebuild: one overflow-hidden mask per line, inner slides up
    el.textContent = '';
    const inners = lines.map((ws) => { const mask = document.createElement('div'); mask.style.overflow = 'hidden'; mask.style.paddingBottom = '0.12em'; mask.style.marginBottom = '-0.12em'; const inner = document.createElement('div'); inner.textContent = ws.join(' '); inner.style.willChange = 'transform'; mask.appendChild(inner); el.appendChild(mask); return inner; });
    g.fromTo(inners, { yPercent: 110 }, { yPercent: 0, duration: dur, stagger: step, ease: ease, delay: delay, onComplete: restore });
    setTimeout(() => { try { restore(); } catch (e) { } }, (delay || 0) * 1000 + dur * 1000 + inners.length * step * 1000 + 400);   // safety: never leave the split DOM behind
  },
  /* THE READING, ARRIVING. More/Less used to swap the DOM and leave it there: two pills and a
     paragraph appeared at full opacity while the button they came from jumped sideways to make room
     for them. Three separate things move here, so all three are told how.

     The button FLIPs from wherever it was, because the extra pills insert BEFORE it — its new
     position is a consequence of the reveal, not a separate event, and an untweened jump reads as a
     re-layout rather than as the same control still under your cursor. The pills stagger in behind
     it. The paragraph takes the masked line reveal the rest of the page's prose already uses.

     Closing runs the other way and outlives the state change: the exit finishes first, and only then
     does React unmount what was tweening. Without that there is nothing left to animate by the time
     the tween would start — the same reason closeFold works the way it does. */
  // _moreBtnSwap / _readingIn / _readingOut / toggleReading lived here and are gone with the More
  // disclosure they animated (03.08.26). Every trait is on screen now and the reading stands, so
  // there is no state to cross-fade, no box to wipe and no height to collapse — the whole
  // interaction, and the four tweens that had accumulated on it, resolved by not having it.
  /* THE PHONE'S ARRIVAL. Opening an example used to be a setState and nothing else: one surface
     replaced another between two frames, on the only screen in the product where every other
     transition — the wipe, the loader, the folds — is staged. It was the most static thing here.

     Three parts, same tokens the desktop uses. The surface rises and fades on EASE.entrance. The
     head and foot follow it in, offset by one stagger so the frame arrives before its contents.
     And the swatches wipe LEFT TO RIGHT, which is the one departure: on desktop the bands wipe
     vertically because they are columns, and here they are full-bleed rows, so the wipe runs along
     the row rather than across it. Same primitive, turned ninety degrees.

     Bailing under reduced motion and without GSAP leaves everything at its natural state, because
     nothing here is animated FROM a hidden position — gsap.from() sets the start value itself. */
  /* ONE BACKSTOP FOR EVERY ENTRANCE. It kills the tweens and then writes the end state, and it
     KILLS FIRST — a version that only cleared was undone by the tween's next tick, which is exactly
     the frozen half-revealed surface it exists to prevent.

     It exists because GSAP rides requestAnimationFrame and a backgrounded tab stops delivering it,
     while setTimeout keeps running. A stalled fade is survivable; a stalled clip is not, because
     inset(0 100% 0 0) is a row you cannot see at all. Open an example, switch apps, come back to a
     column of blanks. Clearing is idempotent, so on the normal path — where the tween finished
     400ms ago — this does nothing.

     Shared rather than copied: the exits were consolidated into _exitTween and the entrances were
     not, which left two hand-computed durations to keep in step and a third waiting for whoever
     adds the next surface. */
  _settleGuard(key, targets, rows) {
    const g = window.gsap;
    clearTimeout(this['_guard_' + key]);
    this['_guard_' + key] = setTimeout(() => {
      try { g.killTweensOf(targets); } catch (e) { }
      targets.forEach((el) => { if (!el) return; el.style.clipPath = ''; el.style.opacity = ''; el.style.transform = ''; });
    }, (this.DUR.reveal + this.DUR.stagger * (rows + 2)) * 1000 + 400);
  },
  /* COPY RISES OUT OF A MASK, everywhere copy lives — the same reveal the landing statement and the
     phone's gate already use, now on the two surfaces that were fading their words in like any
     other box. Headings and paragraphs only: a button's label is not copy, it is the button, and
     masking it would animate a control's affordance rather than a sentence.
     _maskLineReveal splits to word spans, groups them into real rendered lines, wraps each line in
     its own overflow-hidden mask and slides the inner up — so the break points are whatever the
     measure actually produced, not guesses. It restores the plain text on complete and carries its
     own safety timer, which is why nothing here has to unwind it. */
  _maskCopyIn(root) {
    const g = window.gsap;
    if (this._reduce || !g || !root) return;
    [...root.querySelectorAll('[data-mask-copy]')].forEach((el, i) => {
      this._maskLineReveal(el, this.DUR.stagger * (i + 1));
    });
  },
  /* _shareIn and _listIn — the phone's example view and example list arriving — went with both
     surfaces on 17.09.26 (audit C5). A shared link's view mounts on the first paint, under the loader,
     and never had an entrance of its own. */
  /* THE STORY'S OWN ENTRANCE, REMOVED — and the reason is worth keeping.

     It existed because chooseStoryCase called _shareIn() (since removed), which was a silent no-op:
     it resolved `[data-mobile-share]`, the read-only palette surface, which is not mounted while the
     story is. It
     returned at the guard, nothing animated, and the new case replaced the old one between two frames
     — the "page transition doesn't trigger" that was reported. _storyIn was the answer: <main> rose
     and faded in as one block.

     The picker cycle now arrives under the site's curved wipe instead (see _wipeCover), and the story
     comes out of its own page reveal as the panel lifts — heading by heading, block by block, the
     same module /about arrives on. Playing both would be two entrances for one arrival, and the block
     slide is the weaker of them by this file's own argument: wipe.js calls it "the whole page block
     sliding up as one slab" where the copy should be rising out of its masks.

     Anything that needs a story entrance should arm this._storyReveal and release it through
     _playStoryReveal, which is what the wiped path does. */
  // Out is shorter than in and travels the other way, per the house rule that an exit is softer
  // than an entrance. It outlives the state change: React would unmount the surface on the flag,
  // and there would be nothing left to tween.
  _shareOut(cb) { this._exitTween('[data-mobile-share]', cb); },
  /* EVERY EXIT COMPLETES, tween or no tween. These callbacks do not merely finish an animation —
     they flip the state that unmounts the surface, and the caller sets a _closing guard before
     calling in. So an onComplete that never fires does not leave a half-faded panel; it leaves the
     user on a screen whose Back button is now inert, with no way off it.
     GSAP rides requestAnimationFrame, and a tab that loses the foreground mid-tap stops delivering
     it. The timer is the floor: whichever lands first wins, the other is a no-op. */
  /* The floor itself, extracted so the rule has ONE implementation. `cb` is latched — whichever of
     the tween and the timer lands first wins and the other is a no-op — and the returned function is
     what the tween should call on complete. `key` names the pending timer so two exits running at
     once (the reel closing while a drawer closes over it) cannot clear each other's. */
  _exitFloor(key, dur, cb) {
    let done = false;
    const k = '_exitFloorT_' + key;
    clearTimeout(this[k]);
    const finish = () => { if (done) return; done = true; clearTimeout(this[k]); this[k] = null; cb(); };
    this[k] = setTimeout(finish, dur * 1000 + 400);
    return finish;
  },
  _exitTween(sel, cb) {
    const g = window.gsap;
    const root = document.querySelector(sel);
    if (this._reduce || !g || !root) { cb(); return; }
    const finish = this._exitFloor(sel, this.DUR.state, cb);
    g.to(root, { opacity: 0, y: -12, duration: this.DUR.state, ease: this.EASE.exit, onComplete: finish });
  },
  flipBandsFrom(rects) {
    const g = window.gsap, root = this.resultRef.current;
    if (!g || !root || !rects || !rects.length || document.hidden) return;
    const bands = [...root.querySelectorAll('[data-band]')];
    bands.forEach((band, i) => {
      const from = rects[Math.min(i, rects.length - 1)];
      const to = band.getBoundingClientRect();
      if (!from || !to.width || !to.height) return;
      g.set(band, { transformOrigin: 'top left', x: from.left - to.left, y: from.top - to.top, scaleX: from.width / to.width, scaleY: from.height / to.height });
    });
    g.to(bands, { x: 0, y: 0, scaleX: 1, scaleY: 1, duration: this.DUR.reveal, ease: this.EASE.entrance, stagger: this.DUR.stagger, clearProps: 'transform' });
  },
};
