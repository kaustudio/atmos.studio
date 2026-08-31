// Atmos Gallery. Production port of the Claude Design comp.
// The design comp was authored against a React-compatible component API, so the logic ports
// near-verbatim; it is organised here as a class core plus prototype method groups.
import React from 'react';
import AppView, { WipeLayer } from './AppView.jsx';
import * as C from '../lib/color.js';
import * as X from '../lib/exporters.js';
import * as I from '../lib/interpret.js';
import { syncThemeColor } from '../lib/themeColor.js';
import { pipelineMethods } from './methods/pipeline.js';
import { persistenceMethods } from './methods/persistence.js';
import { motionMethods } from './methods/motion.js';
import { overlayMethods } from './methods/overlays.js';
import { universeMethods } from './methods/universe.js';
import { reelMethods } from './methods/reel.js';
import { orbitMethods } from './methods/orbit.js';
import { wipeMethods } from './methods/wipe.js';
import { loaderMethods } from './methods/loader.js';
import { shareMethods } from './methods/share.js';
import { miscMethods } from './methods/misc.js';
import { renderValsMethods } from './renderVals.js';
import { routeFor, pathFor, isDoc, applyHead, APP } from './routes.js';
import { initGridOverlay } from '../lib/gridOverlay.js';
/* THE STORY'S MOTION IS /about's MOTION — the same modules, not a second set.
   src/app/methods/story.js is gone with the surface it drove. Every one of these takes a root, so
   running them over the story's markup is the same code path /about takes, which is the only way two
   surfaces cannot drift. */
import { initPageReveal } from './methods/pageReveal.js';
import { initDividers } from './methods/aboutDividers.js';
import { initGlobalParallax } from './methods/aboutParallax.js';
import { initHighlightText } from './methods/aboutHighlight.js';
import { initSectionDock } from './methods/aboutDock.js';
import { initHorizontalScroll } from './methods/horizontalScroll.js';
import { initToggleSwitch } from './methods/toggleSwitch.js';
import { initStickyTitle } from './methods/aboutStickyTitle.js';
import { initLayeredSlider } from './methods/layeredSlider.js';
import { initHeroExit } from './methods/heroExit.js';
import { initCascade } from './methods/aboutCascade.js';

/* ===== THE SUPPORTED MINIMUM WIDTH ==========================================================
   1024px, NAMED AND STATED ONCE. The gate used to ask "is this a phone" — `max-width:720px` — and
   was then relied on to answer "can the tool be worked here", which is a different question with a
   different number. 721px is not a width this interface was ever drawn for: the result stage sets a
   palette, its roles, its contrast figures and its actions side by side, the action bar wraps twice
   before it fits (see the nowrap note on the output group in AppView), and the library table loses
   columns it needs in order to be a table. Everything from 721 to 1023 rendered as a squeeze nobody
   designed, on the strength of not being a phone.

   So the figure is a SUPPORTED MINIMUM instead — the narrowest viewport the tool is actually drawn
   for — and below it there is no attempt at the tool at all. What stands there is the mobile/tablet
   showcase: the story, the example list and the read-only palette view, which are finished surfaces
   rather than compromised ones. Raising the number widens their audience; it does not create a new
   in-between state.

   `not all and (min-width:...)` RATHER THAN `max-width:1023px`, because those two are not
   complements. A viewport of 1023.5px — browser zoom, a fractional device pixel ratio, a scrollbar
   taken off an odd width — matches neither, and the tool would mount half a pixel under its own
   minimum. Negating the minimum leaves no gap by construction, and it says out loud what the figure
   IS: the width at which the tool is supported.

   THE SECOND CLAUSE IS THE SHORT COARSE SCREEN, and it survives the raise on its own merits. Every
   phone in landscape is 812-932 points across, so the width clause now catches all of them and the
   orientation leak this clause was added for is closed twice over. What it still catches alone is
   the 1024x600 coarse panel — cheap Android tablets, kiosk and in-car displays — which clears the
   width and has about 390 points of usable height once browser chrome is out of it.
     - phone, either orientation        under 1024 wide           -> gated
     - tablet portrait                  768-1024 wide             -> gated
     - tablet landscape                 1024+ wide, 820+ tall     -> NOT gated
     - 1024x600 coarse panel            wide enough, far too short -> gated (this clause alone)
     - laptop window under 1024         pointer:fine but narrow   -> gated (this is the raise)
   `pointer` is the PRIMARY pointer, so a touchscreen laptop with a trackpad reports fine and is
   judged on width alone, like every other pointer machine. Height alone would gate a desktop window
   somebody had merely dragged short, which is a different question and not one the reader asked us.

   ONE STRING, TWO CONSUMERS, AND THEY MUST NOT DRIFT. global.css hides the tool with the matching
   `@media` and this decides the STATE — which surface mounts, how the ring formation is sized, what
   the fx budget is. When those two disagree the failure is silent in the worst way: the surface
   mounts, measures, animates and takes taps while a display:none is painted over it. That has
   happened here once already (see data-mobile-list in the gate's own note). Change one, change the
   other, in the same commit. */
export const MIN_TOOL_WIDTH = 1024;
export const BELOW_MIN_MQ = `not all and (min-width:${MIN_TOOL_WIDTH}px), (pointer:coarse) and (max-height:600px)`;

export default class PaletteApp extends React.Component {
  static defaultProps = { proportional: true, swatchCount: 5 };

  // ---- pure helpers bound as fields so the ported method bodies keep their `this.` call sites.
  // Declared BEFORE `state` — its initializer (hydrateFeed → validateFeed) already needs them.
  rgb2oklab = C.rgb2oklab;
  oklab2rgb = C.oklab2rgb;
  hex = C.hex;
  hexToRgb = C.hexToRgb;
  hexA = C.hexA;
  lumHex = C.lumHex;
  onColor = C.onColor;
  dist2 = C.dist2;
  kmeans = C.kmeans;
  rgb2hsl = C.rgb2hsl;
  relLum = C.relLum;
  contrastRatio = C.contrastRatio;
  oklabToLinear = C.oklabToLinear;
  inSrgb = C.inSrgb;
  labToHex = C.labToHex;
  gamutMap = C.gamutMap;
  rotateHue = C.rotateHue;
  shadeSet = C.shadeSet;
  harmonyGroups = C.harmonyGroups;
  swatchFormats = C.swatchFormats;
  pantoneTable = C.pantoneTable;
  nearestPantone = C.nearestPantone;
  cubicBezier = C.cubicBezier;
  slugName = X.slugName;
  primitiveEntries = X.primitiveEntries;
  semanticRoles = X.semanticRoles;
  semanticEntries = X.semanticEntries;
  buildTailwind = X.buildTailwind;
  buildCssFile = X.buildCssFile;
  buildW3CTokens = X.buildW3CTokens;
  buildFigmaTokens = X.buildFigmaTokens;
  buildASE = X.buildASE;
  projectEntryGroups = X.projectEntryGroups;
  buildTailwindSet = X.buildTailwindSet;
  buildCssFileSet = X.buildCssFileSet;
  buildW3CTokensSet = X.buildW3CTokensSet;
  buildFigmaTokensSet = X.buildFigmaTokensSet;
  buildASESet = X.buildASESet;
  paletteHexList = X.paletteHexList;
  paletteCss = X.paletteCss;
  interpret = I.interpretLocal;
  parseInterp = I.parseInterp;
  canInterpretLive = I.canInterpretLive;

  fileRef = React.createRef();
  canvasRef = React.createRef();
  resultRef = React.createRef();
  progRef = React.createRef();
  gridRef = React.createRef();
  projectFileRef = React.createRef();
  contrastBtnRef = React.createRef();
  overlayRef = React.createRef();
  overlayBandsRef = React.createRef();
  spaceRef = React.createRef();
  planeRef = React.createRef();
  universeCloseRef = React.createRef();

  // An incoming share link, decoded and validated once. Declared before `state` because the state
  // initializer branches on it — a link must open ON the palette, never on the landing first.
  // Reads the fragment only; nothing here writes to the recipient's archive.
  _shared = this._sharedFromHash();

  // Which of the three addresses this document was opened at. Read once, before state, because the
  // loader and the landing both branch on it: neither belongs on a legal route, and deciding that
  // after they have already been scheduled means showing them and then taking them away.
  _entryRoute = routeFor(typeof location !== 'undefined' ? location.pathname : '/');

  state = {
    route: this._entryRoute,
    // a shared palette opens straight into the result stage, past the landing and the loader
    stage: this._shared ? 'result' : 'upload',
    current: this._shared || null,
    sharedView: !!this._shared,
    // activeTags is a LIST, combined with AND: each tag added narrows the archive further. Union
    // would widen on every pick, which makes a filter less useful the more you tell it.
    // Two filter groups with DIFFERENT boolean semantics, the standard faceted-search convention:
    // AND across groups, OR within a group. Tags are AND *within* the group too (each tag narrows),
    // because a tag is a property a palette either has or lacks and you can hold several at once.
    // Accessibility is one exclusive property per palette, so within it only OR is meaningful —
    // AND would always yield nothing.
    feed: this.hydrateFeed(), projects: this.hydrateProjects(), activeProject: null, activeTags: [], activeA11y: [],
    // the two MEASURED facets, beside contrast potential. Character traits stay in activeTags.
    activeLight: [], activeTemp: [],
    /* The project rail's step buttons: whether the chips overflow at all, and which end the row is
       standing at. Measured from the scroller by _syncProjSteps, never derived here — a chip row
       overflows or does not depending on name lengths and window width, and the render knows
       neither. Starts closed so the buttons cannot flash in before the first measurement. */
    projStep: { can: false, start: true, end: true },
    // the tag facet: one disclosure control, closed by default; the query is typeahead state.
    // tagSort: 'count' serves discovery (what is this Library made of), 'alpha' known-item lookup
    // (I want GOLDEN) — the two reasons anyone opens a facet list.
    tagMenuOpen: false, tagQuery: '', tagSort: 'count',
    /* WHICH TAB THE LIBRARY PANEL SHOWS — filtering, or the projects the library is divided into.
       NULL IS THE REAL DEFAULT, and it means "the reader has not chosen": renderVals then opens the
       panel where the work is (see libTab — Filter normally, Projects when there is nothing yet to
       filter), and any press replaces it with an answer that is always obeyed. It returns to null
       on close, exactly as tagQuery and facetAllOpen do, because a surface that reopens in the
       state you left it in two visits ago is a surface that opens differently every time. */
    libraryTab: null,
    // character traits, folded away beneath the measured facets
    charOpen: false,
    // the Filters panel's combine rule, on the same 16px toggletip as the Library heading
    filterInfoOpen: false,
    // the Library heading's storage toggletip — opened and closed through the shared tip helpers
    storeInfoOpen: false,
    // a re-uploaded image the archive already holds: the choice dialog's subject, null when closed
    recognised: null,
    // the result view's More: reveals the poetic reading and the traits past the first two
    // a validated backup file waiting to be added: {projects, palettes, counts}, null when closed.
    // The file is parsed and checked BEFORE this is set, so the dialog only ever describes a file
    // that would actually import — a bad file never gets a confirmation to click.
    restorePending: null,
    /* THE PROJECT PICKER'S PENDING SET. Membership used to be written to the feed on every tap,
       which made a mis-tap a real edit you had to notice and undo by tapping again — and the row's
       tick was the only thing that told you it had happened. The picker holds the intended set here
       instead and commits it once, so nothing changes until it is confirmed and Cancel is a real
       way out. null while the dialog is shut; an array of project ids while it is open. */
    assignPending: null,
    assignPalette: null, backupMenuOpen: false, copyMenuOpen: false, exampleView: false, exampleList: false, imageUrl: null, procStep: 0, dragOver: false,
    /* THE PHONE'S STORY. `storyOpen` is true from the first render on a phone — the story IS the
       start screen there, exactly as the gate was — and is turned off only by opening an example or
       arriving on a shared link, both of which are surfaces ABOVE it. It is not persisted: a story
       is the way in, and a reader who comes back has come back to the way in.
       storySwatch is chapter 4's selection (null = the picture whole, which is how it opens).
       storyMasks is the built mask set, carrying the id of the case it was built from so a stale
       set can never be painted over a different photograph. */
    storyOpen: true, storyCaseId: null, storySwatch: null, storyTab: 'weight', storyMasks: null,
    // The image chooser, which covers the story rather than replacing it (see chooseStoryCase).
    storyPicker: false,
    pending: null, copied: null, errorTitle: '', errorMsg: '', announce: '', feedView: 'list', overlay: null,
    theme: this._entryTheme(), contrast: false, contrastLens: 'AA', contrastLarge: false, contrastPassOnly: false,
    // exportPalette and exportProject are the export dialog's two SCOPES, and exactly one is ever
    // set: one palette, or every palette in a folder. The dialog reads whichever it finds.
    toast: null, harmony: null, exportOpen: false, exportPalette: null, exportProject: null, exportSemantic: false, notice: null,
    // a share link arrives past both gates: the recipient came for the palette, not the intro.
    // A document route arrives past them for a different reason: there is no tool on it to introduce.
    landingDismissed: (this._shared || isDoc(this._entryRoute)) ? true : this._landingDismissed(),
    showLoader: (this._shared || isDoc(this._entryRoute)) ? false : this._loaderPending(),
    /* WHICH OF THE EIGHT THE LANDING FIELD IS A READING OF — a MIRROR, not the source of truth.
       methods/orbit.js holds the answer on the instance (`_fieldPalId`), because the ramp is baked
       synchronously inside initOrbit and a value that only exists after a commit would be a frame
       late every time. This copy exists for one reader: the credit under the landing's footer, which
       is React's to draw. orbit.js writes it through _ensureFieldPalette / setFieldPalette and
       nothing else may; null means the field has not picked yet, or there is nothing to pick from.
       Not persisted — a different palette on each arrival is the whole point. */
    fieldPalId: null,
    page: 0,
    // List sort. 'time' desc is the Library's own default — newest first, what the feed already
    // meant before there was anything to sort BY. Deliberately not persisted: page size is a
    // standing preference, an ordering is a question you are asking of the list right now.
    sortKey: 'time', sortDir: 'desc',
    narrow: (function () { try { return !!(window.matchMedia && window.matchMedia(BELOW_MIN_MQ).matches); } catch (e) { return false; } })(),
    pageSize: (function () { try { const v = parseInt(localStorage.getItem('palette-generator/pagesize'), 10); return [12, 24, 36].indexOf(v) >= 0 ? v : 12; } catch (e) { return 12; } })(),
  };

  _genId = 0;
  MAX_BYTES = 20 * 1024 * 1024;
  ACCEPT = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp', 'image/avif'];

  // ---- THE LANDING FIELD. ORB_LIGHT, ORB_GL_MAX, ORB_RING_GAP_MUL, ORB_MIN_GAP_MUL and
  // ORB_RING_GAP_MAX went with the ring formation: there is no orb to measure a gap against, no
  // per-orb WebGL context to budget, and no room lamp in a volume. The two that survive are the two
  // that were never about orbs — the tempo, and the widest display the stage will size itself to.

  // Seconds for one full revolution of the field — the landing's tempo (contract §2). Unchanged
  // from the ring set: how fast the formation turns is a property of the page, not of what is on it.
  FIELD_ROT_SECS = 105;
  // The share of the leftover half-span that becomes the gap between the copy and the gas, and the
  // pixel bounds on it. The floor keeps the field off the words where the copy fills the viewport;
  // the cap is why the hole never opens into a crater on a large display.
  FIELD_GAP_FRAC = 0.25;
  FIELD_GAP_MIN = 56;
  FIELD_GAP_MAX = 150;
  // How far past the viewport's half-diagonal the gas has finished. Above 1 so the disc runs off
  // every edge instead of drawing a circular rim inside the page.
  FIELD_RIM_MUL = 1.08;
  // Narrow only: the ceiling on the clear radius, as a fraction of the SHORTER edge. A 375px gate
  // leaves no radius that both clears the copy and stays on screen, so the hole is allowed to close
  // in behind the wash that surface already carries. See _fieldGeom — desktop has no wash and no
  // exception.
  FIELD_NARROW_MUL = 0.34;
  // Narrow only, and applied AFTER that cap: how much taller the hole stands than the uniform shrink
  // leaves it. The cap above is a single radius applied to both axes, so it preserves the hole's
  // shape — which is right on the gate, where the copy is a title and one sentence, and wrong on the
  // phone story, where the same hole has to clear a two-line 44px heading, a lead and an action
  // stacked under each other. That block is TALLER than the gate's and the shrink took the same
  // proportion off both axes, so the gas closed in above and below the words first.
  // 1.1 lifts only the vertical radius, so the hole keeps its width and gains the air where the copy
  // actually needs it. It stays well inside FIELD_HOLE_ASPECT — the copy is wider than it is tall on
  // this viewport, so ix leads and a tenth on iy does not come close to flipping which axis is long
  // — and the guard is re-applied below anyway rather than assumed.
  FIELD_NARROW_VLIFT = 1.1;
  // The most elongated the hole may get. It follows the copy's own box — which on a landscape
  // viewport is more than twice as wide as it is tall — and past this it stops reading as an ellipse
  // around a block and starts reading as a slot cut through the picture.
  FIELD_HOLE_ASPECT = 1.9;
  // The widest viewport the field will SIZE ITSELF to — the gap only; the rim still follows the
  // viewport (contract §4).
  // Nothing bounded the copy→formation gap before this, and it is a share of the leftover
  // half-viewport, so it grew without limit: measured in the ring set's own units it ran 2.19 orb
  // diameters at 1440, 2.66 at 1728, 3.62 at 2000, 5.05 at 1440p and 7.63 on a 3440 ultrawide — a
  // 1049px hole between the copy and the formation. Spanning the display is the right instinct only
  // while there is enough formation to span it with.
  // 1728 is the 16" MacBook Pro's default logical width, chosen so that screen and everything below
  // it is untouched (the clamp is a no-op there). A 16" run at a scaled "More Space" resolution
  // reports wider than this and is treated as a large display, which is correct — what matters is
  // the CSS pixels the stage has to fill, not the diagonal.
  FIELD_SPAN_MAX = 1728;

  /* The theme this document opens in.

     Light is the tool's product default and stays that way: the app forces light at mount regardless
     of the OS, because the palette work it exists for is judged against a light surface.

     A document route is not that. Someone arriving at /privacy or /about from a search result at
     night has no relationship with the tool's defaults and every reason to expect their own — these
     are documents to read, not a surface to work on, and they followed the OS faithfully for as long
     as they were their own files. So the entry route decides, once. From then on the switch in the
     masthead is the only thing that moves it, on any route, and they never disagree inside a
     session. */
  /* AND A PHONE IS NOT THAT EITHER, which took a while to see because the test reads the ROUTE and
     the phone's difference is in the SURFACE. `/` on a phone does not mount the tool — global.css
     paints out everything inside [data-app] that is not a named phone surface — so what a phone
     reader actually gets at `/` is MobileStory, which this codebase describes as "/about's page, at
     one column" and renders with className="doc-route". It is a document by every definition here
     except the one this line was testing.

     The cost was the whole argument above, inverted: the reader the document clause exists for —
     arriving at night, no relationship with the tool's defaults — is MOST likely to be on a phone,
     and was the one reader who could not be served. There is no way out of it either. The masthead
     switch is inside the tool branch, so it is display:none on this viewport: light was not a
     default there, it was the only option, on a 7,900px surface built to be read.

     THE PHONE FOLLOWS THE OS ON EVERY PHONE SURFACE, not only the story, and that is the session
     invariant below doing its job rather than a wider claim. The story, the example list and the
     read-only palette view are one journey; deciding per surface would flip the theme underneath a
     reader walking from one to the next, which is the thing "they never disagree inside a session"
     is there to prevent. And the light-surface argument does not reach any of them: it is about
     JUDGING colour — the drop zone, the result stage, the library — and none of that mounts here.
     What a phone shows is somebody's finished palette in full-bleed bands over a photograph, where
     the evidence carries its own ground and the theme only dresses the chrome around it.

     BELOW_MIN_MQ rather than a width of its own, so this stays the same decision as the display
     rule and the `narrow` flag below it, which is what that constant's note asks of anything
     reading it. */
  _entryTheme() {
    if (!isDoc(this._entryRoute) && !this._phoneAtEntry()) return 'light';
    try { return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; } catch (e) { return 'light'; }
  }
  /* Read at mount, before `narrow` exists — this runs inside the same object literal that defines
     it — and never again: the theme is an entry decision, so a tablet rotated into phone range mid
     session keeps the appearance it opened in rather than swapping under the reader. */
  _phoneAtEntry() {
    try { return !!(window.matchMedia && window.matchMedia(BELOW_MIN_MQ).matches); } catch (e) { return false; }
  }

  _landingDismissed() { try { return localStorage.getItem('palette-generator/landing') === '1'; } catch (e) { return false; } }
  // Is the landing surface on screen? On phones it always is: the tool needs room the viewport
  // hasn't got, so the landing IS the small-screen surface (same ring stage, gate copy instead of
  // the CTA) rather than a separate dead-end panel. Dismissal only means anything on desktop.
  // A shared link opened on a phone gets the palette, read-only — not the desktop gate. That single
  // exception is the whole point: most shared links ARE opened on a phone, so gating them ends the
  // chain at its first hop and sharing never compounds. The tool itself still gates; only somebody
  // else's finished palette comes through.
  // The read-only phone view now serves two arrivals, not one: a link somebody sent you, and the
  // example a first-time visitor asks to see from the gate. Same surface, because it answers the
  // same question — what does this tool produce — and a second one would be a second thing to keep
  // correct. They stay separate FLAGS though: sharedView means "this palette is not in your
  // archive", which is false of the example and would put a save prompt on a palette already saved.
  _mobileShare() { return !!(this.state.narrow && (this.state.sharedView || this.state.exampleView) && this.state.current); }
  _mobileList() { return !!(this.state.narrow && this.state.exampleList && !this._mobileShare()); }
  /* THE STORY IS THE PHONE'S GROUND FLOOR, so it answers last: the example list and the share view
     both stand above it and must win. It also needs a case to tell — with no examples in the feed
     there is nothing to read, and the phone falls through to the gate exactly as it stands today.
     That is the same `feed.length > 0` guard `gateHasExample` already applies to the gate's one act,
     and it keeps the storage-blocked case no worse than it is now rather than turning it into eight
     blank chapters. */
  _mobileStory() { return !!(this.state.narrow && this.state.storyOpen && this._storyCase() && !this._mobileShare() && !this._mobileList()); }
  /* THE CASE THE STORY TELLS. Dry Season by default — the brief names it, and it is the clearest of
     the eight: one subject, a ground in two lights, and a 4.5% swatch that turns out to be the
     flower. Falls back to whatever the feed's first example is, so a reordered seed table cannot
     leave this null while examples exist. */
  _storyCase() {
    const ex = this._examples();
    if (!ex.length) return null;
    const id = this.state.storyCaseId;
    return (id && ex.find((p) => p.id === id)) || ex.find((p) => p.exampleKey === 'tulip') || ex[0];
  }
  /* TWO QUESTIONS, and conflating them is what cost the orbs. _landingUp is "is the stage in the
     document" — it gates building the formation and rendering its slots, and the phone surfaces do
     not change the answer, because they cover the stage rather than replacing it. _landingLit is "can
     anybody see it", which is what the drift should actually be spending frames on: a formation
     integrating its angles behind an opaque panel is work for nobody, and one that was TORN DOWN
     there is a gate that comes back empty. Parked, not killed. */
  _landingUp() { return (!this.state.landingDismissed || this.state.narrow); }
  _landingLit() { return this._landingUp() && !this._mobileShare() && !this._mobileList(); }
  // ONCE PER SESSION, on whatever surface the visit lands on — the Get Started page for a newcomer,
  // 'Drop a reference' for a regular who dismissed the landing long ago. What the loader marks is
  // the ARRIVAL, and a returning visitor arrives just as much as a first-time one; keying it to the
  // landing meant the people who use the tool most were the only ones who never saw it.
  //
  // sessionStorage, not localStorage: 'first visit of this session' is precisely what a session
  // store means, and it clears itself with the tab, so there is no permanent flag to go stale.
  //
  // The flag is burned when the run FINISHES (loader done()), never here at mount — that was the
  // real objection to a one-shot flag, and it survives: a run cut short by a reload replays instead
  // of being swallowed. done() is reachable from every teardown path, watchdogs included, so the
  // flag cannot fail to burn either.
  _loaderSeen() { try { return sessionStorage.getItem('palette-generator/loader-session') === '1'; } catch (e) { return false; } }
  _loaderPending() { return !this._loaderSeen(); }

  componentDidMount() {
    // surface swallowed load-time errors with their real message/location
    if (!window.__pgErrHook) { window.__pgErrHook = true; window.addEventListener('error', (e) => { try { console.error('[pg:onerror]', e.message, e.filename, e.lineno, e.error && e.error.stack); } catch (_) { } }); }
    // one feature's failure must never abort the rest of mount
    const safe = (fn, tag) => { try { fn(); } catch (e) { try { console.error('[pg:mount:' + tag + ']', e && e.message, e); } catch (_) { } } };
    // Live, not a snapshot. CSS re-evaluates its own reduced-motion blocks the moment the OS setting
    // changes, and _reduce gates every GSAP path in the app — read once, the two halves disagree
    // until reload. The timing is what makes it matter: reduced motion is usually switched on IN
    // RESPONSE to motion, so the one moment it has to work is precisely the one a snapshot misses.
    // Only the field is updated, never the running tweens. Every animated method reads _reduce at
    // its top rather than capturing it, so surfaces already in flight finish on the old value and
    // the next interaction takes the new one — which is correct: killing tweens on the change would
    // itself be an abrupt motion, in service of the setting that asked for less of them.
    try {
      this._rmq = window.matchMedia('(prefers-reduced-motion:reduce)');
      this._reduce = !!this._rmq.matches;
      this._onRmq = (e) => { this._reduce = !!e.matches; };
      if (this._rmq.addEventListener) this._rmq.addEventListener('change', this._onRmq); else this._rmq.addListener(this._onRmq);
    } catch (e) { this._reduce = false; }
    // Shift+G, on every route. Behind `safe` like everything else here: a grid ruler is the last
    // thing that should be able to stop the app it measures from mounting.
    safe(() => initGridOverlay(), 'grid-overlay');
    safe(() => this.initMotion(), 'motion');   // EASE/DUR tokens must exist before the loader builds its timeline
    safe(() => this._initLenis(), 'lenis');
    safe(() => requestAnimationFrame(() => { this._updateProjPill(); this._syncProjSteps(); }), 'projpill');
    safe(() => this._initLoader(), 'loader');
    // Light on the tool, the reader's own appearance on a legal route — see _entryTheme.
    const theme = this.state.theme;
    try { document.documentElement.setAttribute('data-theme', theme); } catch (e) { }
    safe(() => syncThemeColor(), 'themecolor'); // browser chrome follows --surface, not the OS appearance
    /* The entry route's own metadata. On a prerendered legal document this rewrites the same values
       back over themselves and is invisible; it earns its place in the two cases where the served
       document is index.html — Vite's dev server, which has no prerender step, and any host that
       falls back to the shell — where without it /privacy would wear the tool's title in the tab, in
       the history entry and in anything the reader copies out of the address bar. */
    safe(() => applyHead(this.state.route), 'head');
    // Back and forward are real navigations between these routes, so the swap is wiped exactly as a
    // click is. popstate has already moved the address bar by the time it fires, which is why
    // navigateTo is told not to push a second entry for it.
    this._onPop = () => {
      const next = routeFor(location.pathname);
      if (next === this.state.route) return;
      this.navigateTo(pathFor(next), { push: false });
    };
    window.addEventListener('popstate', this._onPop);
    this.initMotion();
    // GSAP readiness. The vendored core+plugins load from index.html; register plugins once present.
    const finishGsap = () => { if (window.gsap) { try { const ps = []; if (window.Observer) ps.push(window.Observer); if (window.Flip) ps.push(window.Flip); if (window.ScrollToPlugin) ps.push(window.ScrollToPlugin); if (ps.length) window.gsap.registerPlugin.apply(window.gsap, ps); } catch (e) { } } this._gsapReady = true; if (this._landingLit() && !this._orbit) this.initOrbit(); };
    if (window.gsap) {
      let tries = 0;
      const waitLocal = () => { if ((window.Observer && window.Flip && window.ScrollToPlugin) || tries >= 40) { finishGsap(); return; } tries++; setTimeout(waitLocal, 50); };
      waitLocal();
    } else {
      const cdn = 'https://cdn.jsdelivr.net/npm/gsap@3.13/dist/';
      const loadSeq = (list) => { if (!list.length) { finishGsap(); return; } const sc = document.createElement('script'); sc.src = list[0]; sc.onload = () => loadSeq(list.slice(1)); sc.onerror = () => loadSeq(list.slice(1)); document.head.appendChild(sc); };
      loadSeq([cdn + 'gsap.min.js', cdn + 'Observer.min.js', cdn + 'Flip.min.js', cdn + 'ScrollToPlugin.min.js']);
    }
    this._onKey = (e) => {
      if (e.key === 'Escape') {
        /* The image chooser, above everything else it can coexist with. Its visible dismiss control
           was removed by request, so Escape is the only way out that does not commit a choice — which
           makes it load-bearing rather than a convenience. A phone reader still has one: the chooser
           opens centred on the case already being read, so choosing that one is a no-op exit. */
        if (this.state.storyPicker) { e.preventDefault(); this.closeStoryPicker(); return; }
        if (this.state.recognised) { e.preventDefault(); this.closeRecognised(); return; }
        // ABOVE manage, and that is the whole reason it moved up from where it used to sit: a
        // project export is opened FROM the manage dialog and stacks on top of it, so Escape has to
        // dismiss the surface that is actually in front. The palette export can never coexist with
        // either of the two below it, so nothing else changes order by this.
        if (this.state.exportOpen) { e.preventDefault(); this.closeExport(); return; }
        if (this.state.assignPalette) { e.preventDefault(); this.closeAssign(); return; }
        if (this.state.restorePending) { e.preventDefault(); this.closeRestore(); return; }
        if (this.state.backupMenuOpen) { e.preventDefault(); this.setState({ backupMenuOpen: false }); return; }
        if (this.state.exampleView) { e.preventDefault(); this.closeExampleOnPhone(); return; }
        /* THE SHARED ARRIVAL, WHICH THIS LADDER USED TO WALK STRAIGHT PAST. A share link constructs
           at stage 'result', so with no clause of its own Escape fell all the way to the last line
           and called doReset() — on the read-only showcase that dropped the palette, swapped the
           surface for the story, and announced "Ready for a new reference image." to a viewport with
           no dropzone on it, while the hash stayed in the address bar ready to resurrect the whole
           thing on the next reload. Measured at 900px before the fix.
           Routed to the mark's own exit rather than to a bespoke one, so the two ways off this
           surface cannot say different things: same destination, same announcement, same dropped
           hash. Below the supported minimum only — above it the shared palette is on the result
           stage, where Escape means what it means everywhere else in the tool and the last line of
           this ladder is the right answer. */
        if (this.state.sharedView && this.state.narrow) { e.preventDefault(); this.returnToGateOnPhone(); return; }
        if (this.state.exampleList) { e.preventDefault(); this.closeExampleList(); return; }
        if (this.state.copyMenuOpen) { e.preventDefault(); this.closeTip('copyMenuOpen', '[data-copy-menu]'); this._focusCopyTrigger(); return; }
        if (this.state.tagMenuOpen) { e.preventDefault(); this.closeTagFilter(); return; }
        if (this.state.harmony) { e.preventDefault(); this.closeHarmony(); return; }
        if (this.state.contrast) { e.preventDefault(); this.closeContrast(); return; }
        if (this.state.overlay) { e.preventDefault(); this.closeOverlay(); return; }
        if (this.state.feedView === 'grid' || this.state.feedView === 'carousel') { e.preventDefault(); this.setFeedView('list'); return; }
        if (this.state.stage === 'result') { e.preventDefault(); this.doReset(); }
      }
    };
    document.addEventListener('keydown', this._onKey);
    // input-modality tracking: keyboard sets the flag, pointer clears it — centerOnTile is gated on it
    // The same fact is mirrored onto the root as data-kbd, which is the only way CSS can know it:
    // the text field's focus ring hangs off it (global.css), so a click leaves the field alone and a
    // Tab still lands visibly. Tab ONLY, not the arrow keys the flag also takes — arrows move a
    // caret inside a field, and a focus ring appearing mid-sentence is not keyboard navigation.
    this._onModKey = (e) => {
      if (e.key === 'Tab' || e.key.startsWith('Arrow') || e.key === 'Home' || e.key === 'End') this._kbdInput = true;
      if (e.key === 'Tab') document.documentElement.setAttribute('data-kbd', '');
    };
    this._onModPtr = () => { this._kbdInput = false; document.documentElement.removeAttribute('data-kbd'); };
    document.addEventListener('keydown', this._onModKey, true);
    document.addEventListener('pointerdown', this._onModPtr, true);
    // (Removed with the inline row expansion: a window-level wheel listener that scaled the expanded
    // row's metric readout. Its only target was [data-row-values], which no longer exists — the row
    // carries no readout to emphasise. If a per-row metric cluster returns, this is the hook to
    // reinstate, on the new element.)
    this._storageHandler = (e) => this._onStorage(e);
    window.addEventListener('storage', this._storageHandler);
    // small-viewport surface as STATE, not just a CSS gate: the ring stage's context budget, fx
    // budget and hero measurement all differ there, and those are build-time decisions. Crossing the
    // breakpoint rebuilds the formation rather than leaving desktop-sized decisions in place.
    try {
      this._mq = window.matchMedia(BELOW_MIN_MQ);
      // The one teardown that stays: a breakpoint crossing rebuilds the formation because it is
      // SIZED for the viewport class (see the ring count in _rings), which no amount of parking
      // fixes. Rebuilt only if the stage is lit — crossing into narrow with an example open would
      // otherwise upload a field behind the panel covering it.
      this._onMq = (e) => { if (e.matches === this.state.narrow) return; this.setState({ narrow: e.matches }, () => { this.killOrbit(); if (this._landingLit()) requestAnimationFrame(() => this.initOrbit()); }); };
      if (this._mq.addEventListener) this._mq.addEventListener('change', this._onMq); else this._mq.addListener(this._onMq);
    } catch (e) { }
    if (this._needSeedPersist) { this._needSeedPersist = false; this.persist({ immediate: true }); }
    this.initClickZoom();
    // ring landing: first-visit brand arrival, and the permanent small-screen surface (retries
    // internally until gsap is ready)
    this._prevLandLit = this._landingLit();
    if (this._prevLandLit) { requestAnimationFrame(() => this.initOrbit()); }
    /* THE STORY. Its masks are built off the render path (see buildStoryMasks) and its choreography
       is armed after the first paint, because every trigger it creates is measured against chapters
       that have to be in the document first. `_alive` guards the async mask build — image decode
       can settle after the reader has left. */
    this._alive = true;
    // Masks off the render path; the choreography after the first paint, because every trigger it
    // creates is measured against chapters that have to be laid out first. _syncStory is idempotent
    // and self-healing (see its note), so componentDidUpdate carries it from here.
    this.buildStoryMasks();
    /* rAF AND a timer. The frame callback is the right moment — the chapters are laid out and the
       fonts are usually in — but a document that mounts hidden (a background tab, a preview pane
       that is not on screen) is never handed one, and the surface would then arrive unarmed and stay
       that way until something else happened to re-render it. The timer is the same backstop shape
       the reveal sweeps use, and _syncStory is idempotent, so whichever arrives first wins and the
       second is four property reads. */
    requestAnimationFrame(() => this._syncStory());
    this._storyT = setTimeout(() => this._syncStory(), 400);
  }

  componentDidUpdate() {
    const s = this.state;
    this._updateProjPill();
    // Same commit as the pill, for the same reason: both are measurements of a row whose contents
    // the render has just changed. _syncProjSteps sets state only when a boolean actually flips,
    // so calling it from here cannot loop.
    this._syncProjSteps();
    /* The story's choreography follows the SURFACE, not a state flag: it is armed when the story is
       on screen and torn down when anything covers it, so its triggers can never be left measuring
       chapters that are no longer in the document — the failure aboutStack records, where one
       surviving pin refreshes every trigger on the next surface against a detached element. */
    this._syncStory();
    this._syncPicker();
    // One place decides whether a modal owns the screen, rather than each dialog's own open/close
    // remembering to say so. Driven from state so a dialog that is added later is covered by adding
    // its flag here, and can never be half-wired: opened with the background inert, closed without.
    // manageProjects is gone from this list because the surface is: managing projects is a tab of
    // the library panel now, and that panel is deliberately non-modal — the library stays visible
    // and operable behind it. Nothing here regressed; a member of this set left the app.
    const modal = !!(s.assignPalette || s.recognised || s.restorePending
      || s.exportOpen || s.contrast || s.harmony);
    if (modal !== this._bgInertOn) { this._bgInertOn = modal; this._bgInert(modal); }
    // contrast lens/size/filter change: animate ONLY the delta (cells whose verdict flips), not the whole matrix
    if (s.contrast) {
      const key = s.contrastLens + '|' + s.contrastLarge + '|' + s.contrastPassOnly;
      if (this._cxToggleKey && this._cxToggleKey !== key) this.animateContrastDelta(this._cxToggleKey, key);
      this._cxToggleKey = key;
    } else { this._cxToggleKey = null; }
    /* LANDING LIFECYCLE — park and resume, never tear down. The phone's example surfaces cover the
       stage; its field keeps its live WebGL context, its baked ramp and its noise volume, and only
       stops advancing the shared angle while nothing can see it. So the gate you come back to is the
       gate you left, at the angle you left it, with no rebuild and therefore no stretch of empty
       screen where the field belongs.
       Tearing down here instead — the obvious move, and the wrong one — costs a fresh gamut-mapped
       ramp and a 1MB noise volume on every return, all of it visible. */
    const lit = this._landingLit();
    const prevLit = this._prevLandLit; this._prevLandLit = lit;
    if (lit !== prevLit && this._orbit) { if (lit) this.playOrbit(); else this.pauseOrbit(); }
    /* Landing safety net: if gsap is already ready and the stage isn't built, kick it. Gated on
       LIT rather than up, so a shared link opened on a phone — which lands straight on the palette,
       with the stage mounted but covered — does not spend a slow connection's first seconds
       fetching three for a field nobody is looking at. It builds if that reader ever reaches the
       gate, and from then on it is only ever parked.
       No longer gated on motion. Reduced motion used to be denied the stage entirely because the
       formation's POPULATION depended on which renderer could run; a volume has no population, so
       what it now gets is the same field rendered once and left still (see the contract's §6). */
    /* AND "ISN'T BUILT" HAS TO MEAN "ISN'T ON THE SCREEN", not "no object is held". A document route
       — /about, /privacy, /terms — returns before LandingStage in AppView, so the whole stage leaves
       the DOM while `_orbit` and `_nebula` go on pointing at detached nodes; navigateTo does not
       kill the orbit, deliberately, because the wipe is covering the swap. Coming back then finds a
       truthy `_orbit`, declines to rebuild, and hands the reader a landing with no field, no floor
       and no bloom on it — reachable entirely through the product's own chrome, since the landing's
       footer links to /about and that page's mark links back.
       That was survivable while a dead stage was merely blank. It is not now: the credit under the
       footer names the palette the field is a reading of, so the blank screen arrives with a caption
       asserting what is on it. Verified: canvas count 0, floor and bloom unpainted, "Based on Forged
       Midfield" underneath.
       The host node is the honest test — `_fieldCanvas` is null wherever WebGL 2 never started, and
       that stage is alive and correct. killOrbit first, because the old object still owns a
       ResizeObserver, a ticker callback and a GL context that nothing else will ever release. */
    const stale = !!this._orbit && !(this._orbit.host && document.contains(this._orbit.host));
    if (stale) this.killOrbit();
    if (lit && this._gsapReady && !this._orbit) { this.initOrbit(); }
    /* The theme reaches the landing: the logo returns here from anywhere, so the switch in the
       masthead can be thrown with this stage alive behind whatever was covering it. Neither surface
       is rebuilt — the ramp is theme-independent by design, and only the exposure moves. */
    const themeNow = s.theme;
    if (this._prevFieldTheme !== themeNow) { this._prevFieldTheme = themeNow; if (this._orbit) this.refreshOrbitTheme(); }
    // spatial grid lifecycle (independent of stage/current — runs on view toggle too)
    const wantSpatial = s.feedView === 'grid' && s.feed.length > 0;
    const prevWant = this._prevWantSpatial; this._prevWantSpatial = wantSpatial;
    if (wantSpatial && !this._spatialBuilt()) { requestAnimationFrame(() => { if (this.state.feedView === 'grid') this.initSpatial(); }); }
    // reel lifecycle (mirror of the spatial pattern: transition-aware teardown, self-healing build)
    const wantReel = s.feedView === 'carousel';
    const prevWantReel = this._prevWantReel; this._prevWantReel = wantReel;
    if (wantReel && !this._reelBuilt()) { requestAnimationFrame(() => { if (this.state.feedView === 'carousel') this.initReel(); }); }
    if (!wantReel && prevWantReel && this._reelBuilt()) { this.killReel(); }
    // resume the reel's ambient spin when the shared detail overlay closes above it
    const ovOpen = !!s.overlay;
    if (this._prevOvOpen && !ovOpen && s.feedView === 'carousel') { this._reelResume(); }
    this._prevOvOpen = ovOpen;
    // Tear down ONLY on a real grid->list (or feed-emptied) transition — never on unrelated commits
    if (prevWant && !wantSpatial) { this.killSpatial(); }
    // list-view row activation: restore/establish the active (expanded) row after any re-render
    if (s.feedView === 'list' && s.feed.length > 0) { requestAnimationFrame(() => { if (this.state.feedView === 'list') this._syncListActive(); }); }

    const prev = this._prev || { stage: 'upload', curId: null };
    const curId = s.current && s.current.id;

    if (s.stage === prev.stage && curId === prev.curId) return;
    if (s.stage === 'processing' && prev.stage !== 'processing') this.startCanvas();
    if (s.stage !== 'processing' && prev.stage === 'processing') this.stopCanvas();
    const enteredResult = s.stage === 'result' && (prev.stage !== 'result' || curId !== prev.curId);
    this._prev = { stage: s.stage, curId: curId };
    if (enteredResult) {
      const vis = window.gsap && !document.hidden;
      try {
        // FLIP morph is the special case when a source image exists; otherwise (and for list
        // selection) the shared band wipe is the reveal character.
        if (vis && !this._reduce && this._fromRects) { this.flipBandsFrom(this._fromRects); this.animateText(0.1); }
        else if (vis) { this.animateBands(); this.animateText(this._reduce ? 0 : 0.36); }
      } catch (err) { }
      this._fromRects = null;
      if (window.gsap && !this._reduce && !document.hidden) { requestAnimationFrame(() => { const cur = document.querySelector('button[data-feed][aria-current="true"]'); if (cur) this.commitSelected(cur); }); }
    }
  }

  /* One place decides whether the story module is up, so it can never be armed twice or left behind.
     Rebuilt rather than refreshed when the CASE changes: the chapters' contents change wholesale, so
     every start and end has to be re-measured, and a fresh module is cheaper to reason about than a
     partial invalidation. */
  /* KEYED ON THE ROOT ELEMENT, NOT ON A FLAG, and that distinction is the whole reason this is
     written out rather than being three lines.

     The obvious version — remember the case id, skip if it has not changed — latches on its own
     first failure. initStory returns the SAME inert `noop` for every bail (no GSAP yet, no
     ScrollTrigger, reduced motion, no chapters in the document), and a noop stored in `_killStory`
     is indistinguishable from a live teardown: the guard sees a truthy function, decides the module
     is already up, and never tries again for the life of the surface. Every one of those bails is
     transient except the reduced-motion one, and the transient ones are exactly what a vendor script
     still loading looks like.

     So the question asked here is "is the module actually running on THIS element", which the module
     answers itself with [data-story-live] — the same attribute the stylesheet keys its live layout
     off, so there is one fact rather than two that can disagree. A bail leaves the attribute absent,
     the next update re-enters, and the surface heals as soon as its dependencies arrive. Under
     reduced motion it re-enters forever and returns noop forever, which costs four property reads on
     a render that was happening anyway and is the correct behaviour: the floor is the full story. */
  /* The chooser is built and torn down on its own, not with the scroll modules: it is a covering
     surface that comes and goes many times over one story, and rebuilding six ScrollTriggers each
     time it opened would be the churn that broke the toggle. EASE.fold is handed in because it IS
     the resource's 'osmo' curve — see [ATMOS 1] in the module. */
  _syncPicker() {
    const want = !!(this.state.storyPicker && this._mobileStory());
    const root = want ? document.querySelector('[data-story-picker]') : null;
    if (root && this._pickerRoot === root) return;
    if (this._killPicker) { try { this._killPicker(); } catch (e) { } this._killPicker = null; }
    this._pickerRoot = null;
    if (!root) return;
    this._pickerRoot = root;
    this._killPicker = initLayeredSlider(root, {
      ease: this.EASE ? this.EASE.fold : 'power2.out',
      onChoose: (i) => { try { this.renderVals().mobileStory.picker.onChoose(i); } catch (e) { } },
    });
    // Open on the case the story is already telling, so the strip does not start somewhere else.
    try {
      const inst = root.querySelector('[data-layered-slider-init]')._layeredSlider;
      const at = this.renderVals().mobileStory.picker.active;
      if (inst && at > 0) inst.goToIndex(at);
    } catch (e) { }
  }

  _syncStory() {
    /* RE-ENTRANCY GUARD, and it is the fix for duplicated modules rather than a precaution.

       The early-return below asks whether `data-story-live` is on the root, and that attribute is
       written on the LAST line of this method. Everything before it can re-enter: initPageReveal is
       played here, the reveal and the mask build both commit state, and any commit runs
       componentDidUpdate, which calls this method again — before the first pass has claimed the root.
       The second pass then built a complete second set of modules over the same DOM.

       Measured on the close: three ScrollTriggers on one wrap, two of them with identical ranges,
       two scrubbed timelines fighting over the same characters. Because the sticky title reveals with
       `from()`, the second timeline recorded whatever the first had already set as the value to
       ARRIVE at — so characters that happened to be mid-fade became characters that fade to
       invisible and stay there. That is the missing letters.

       A flag rather than a deferral: the work is synchronous and idempotent once it completes, so the
       honest thing is to refuse the nested call outright rather than schedule a second one. */
    if (this._syncingStory) return;
    const want = this._mobileStory();
    const root = want ? document.querySelector('[data-mobile-story]') : null;
    /* THE KEY IS THE CASE, AND ONLY THE CASE.

       It briefly also carried the active tab and whether the masks had landed. That was written to
       fix the cascade, which parked sets at init and registered a trigger per set — so a set that
       ARRIVED later was parked by nobody and revealed by nobody. Rebuilding on every content change
       was the blunt answer to it.

       The cascade is gone (its sets already sat inside blocks pageReveal reveals, so it was a second
       layer of choreography that could and did strand content invisible). Nothing left here parks
       anything that changes: pageReveal handles headings and [data-reveal] text, neither of which
       moves when a tab is pressed or a mask arrives.

       And the rebuild had a real cost that only showed on screen. Pressing a segment tore down and
       rebuilt all six modules — including pageReveal, which re-splits its blocks — so the buttons
       were replaced underneath the finger. The first press worked and the second landed on a node
       that no longer existed, which is exactly "it is not possible to switch between the three".
       Rebuild on a genuine case change; leave the surface alone for a tab. */
    const key = want ? (this._storyCase() || {}).id : null;
    if (root && this._storyRoot === root && this._storyKey === key && root.hasAttribute('data-story-live')) return;
    this._killStory();
    if (!root) return;
    this._storyRoot = root; this._storyKey = key;

    // maskMotion's own definition (renderVals), built here rather than read off a render's output so
    // this does not depend on when the last render happened. One scale, quoted twice, never invented.
    const motion = {
      duration: this.DUR ? this.DUR.reveal : 0.62,
      stagger: 0.09,
      ease: this.EASE ? this.EASE.entrance : 'power3.out',
    };

    /* ORDER, for the reason AboutPage states it: anything that measures the document must do so after
       whatever changes its height. Nothing here pins, so the only real dependency is that the dock
       goes LAST — it holds a trigger against every section plus one spanning the run, so it wants a
       document that has stopped moving. */
    const groups = [].slice.call(root.querySelectorAll('[data-sec]')).map((sec) => ({
      heading: sec.querySelector('[data-sec-head]'),
      blocks: [].slice.call(sec.querySelectorAll('[data-reveal]')),
      rule: sec.hasAttribute('data-rule') ? sec : null,
    }));
    const hero = root.querySelector('[data-story-hero]');
    this._syncingStory = true;
    try {
    this._storyKills = [];
    /* THE PIN GOES FIRST. It is the only thing on this surface that changes the document's height —
       ScrollTrigger inserts a spacer the length of the horizontal travel — so anything built before
       it would have measured a page that is about to be a different one. Same reason AboutPage builds
       its three pins ahead of everything else. */
    this._storyKills.push(initHorizontalScroll(root));
    this._storyReveal = initPageReveal(root, {
      motion,
      hero,
      heroParts: hero ? [].slice.call(hero.querySelectorAll('[data-story-hero-line]')) : [],
      groups,
    });
    this._storyKills.push(() => { try { this._storyReveal.destroy(); } catch (e) { } });
    this._storyKills.push(initHeroExit(root));
    this._storyKills.push(initStickyTitle(root));
    this._storyKills.push(initGlobalParallax(root));
    this._storyKills.push(initHighlightText(root));
    this._storyKills.push(initDividers(root, { motion }));
    /* The toggle needs no scroll and no GSAP, so it is built independently of the scroll modules.

       onSelect IS wired, and leaving it out was a bug worth recording: React's own onClick on each
       button commits the selection for a pointer, so clicking worked and the reasoning "the module
       has already moved the pill by the time it fires" looked complete. The ARROW KEYS do not
       synthesise a click — the resource calls setActive and focuses directly — so the pill and the
       focus moved while the panel stayed on whatever had last been clicked. A control that answers
       the keyboard visually and not actually is worse than one that ignores it.

       Index → id through the same order the view model renders, so the two cannot disagree. */
    const TABS = ['weight', 'role', 'contrast'];
    this._storyKills.push(initToggleSwitch(root, {
      onSelect: (i) => { const id = TABS[i]; if (id) this.setStoryTab(id); },
    }));
    /* THE SETS ARRIVE, rather than being fully drawn while their own text is still revealing.
       initCascade is the module the house already owns for this — its header states the defect
       verbatim — and it was removed here, not designed out: its sets were being stranded by
       _syncStory re-entering and rebuilding over its parked children. That re-entrancy is guarded
       now, and the module commits no React state of its own, so it cannot re-enter. Same call
       AboutPage makes, with the motion object already built above. */
    this._storyKills.push(initCascade(root, motion));
    this._storyKills.push(initSectionDock(root, { lenis: this._lenis }));

    /* The reveal is ARMED, not played — the contract AboutPage and LegalPage both describe. The note
       that used to sit here said the split existed "so a future wiped arrival can hold it behind the
       cover", and that arrival now exists: choosing another palette re-tells the whole story about a
       different photograph, and it comes in under the site's own curved wipe.

       So the question is which arrival this is. Under the cover the copy must NOT play — a reveal
       that runs behind an opaque panel is finished by the time the panel lifts, and the page appears
       to have simply been there, which is the exact fault the wipe was built to fix. _wipeCover's
       reveal() releases it as the panel's trailing edge clears. Every other way onto this surface has
       no cover to wait for, so it plays now. */
    if (this._arrivingByWipe) this._storyArmed = true;
    else try { this._storyReveal.play(); } catch (e) { }

    // The same refresh AboutPage runs for the same reason: these triggers are created before the
    // local Neue Montreal faces land, against a document that is about to get taller.
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        if (!root.isConnected || !window.ScrollTrigger) return;
        try { window.ScrollTrigger.refresh(); } catch (e) { }
      });
    }
    try { root.setAttribute('data-story-live', '1'); } catch (e) { }
    } finally { this._syncingStory = false; }
  }

  // The armed half of the above. Held on the instance rather than passed through the wipe, because
  // the module that gets armed is built by componentDidUpdate — after the caller that started the
  // cover has already returned.
  _playStoryReveal() {
    if (!this._storyArmed) return;
    this._storyArmed = false;
    try { if (this._storyReveal) this._storyReveal.play(); } catch (e) { }
  }

  // Torn down in reverse of the order they were built.
  _killStory() {
    if (this._storyKills) {
      this._storyKills.slice().reverse().forEach((k) => { if (typeof k === 'function') { try { k(); } catch (e) { } } });
      this._storyKills = null;
    }
    this._storyReveal = null;
    this._storyArmed = false;
    if (this._storyRoot) { try { this._storyRoot.removeAttribute('data-story-live'); } catch (e) { } }
    this._storyRoot = null; this._storyKey = null;
  }

  componentWillUnmount() {
    this._alive = false;
    if (this._killPicker) { try { this._killPicker(); } catch (e) { } this._killPicker = null; }
    if (this._storyT) { clearTimeout(this._storyT); this._storyT = null; }
    if (this._maskT) { clearTimeout(this._maskT); this._maskT = null; }
    this._killStory();
    if (this._loaderPace) { clearInterval(this._loaderPace); this._loaderPace = null; }
    if (this._loaderFill) { try { window.gsap && window.gsap.ticker.remove(this._loaderFill); } catch (e) { } this._loaderFill = null; }
    if (this._loaderTl) { try { this._loaderTl.kill(); } catch (e) { } this._loaderTl = null; }
    if (this._loaderT1) { clearTimeout(this._loaderT1); this._loaderT1 = null; }
    if (this._loaderT2) { clearTimeout(this._loaderT2); this._loaderT2 = null; }
    this._loaderRescue = null;
    if (this._landRevealT) { clearTimeout(this._landRevealT); this._landRevealT = null; }
    if (this._dropRevealT) { clearTimeout(this._dropRevealT); this._dropRevealT = null; }
    if (this._listRevealT) { clearTimeout(this._listRevealT); this._listRevealT = null; }
    if (this._listAnchorT) { clearTimeout(this._listAnchorT); this._listAnchorT = null; }
    if (this._listAnchorTick) { try { window.gsap && window.gsap.ticker.remove(this._listAnchorTick); } catch (e) { } this._listAnchorTick = null; }
    if (this._listHeightT) { clearTimeout(this._listHeightT); this._listHeightT = null; }
    if (this._lenis) { try { window.gsap && window.gsap.ticker.remove(this._lenisRaf); } catch (e) { } try { this._lenis.destroy(); } catch (e) { } this._lenis = null; }
    if (this._onModKey) { document.removeEventListener('keydown', this._onModKey, true); document.removeEventListener('pointerdown', this._onModPtr, true); }
    if (this._mq && this._onMq) { try { if (this._mq.removeEventListener) this._mq.removeEventListener('change', this._onMq); else this._mq.removeListener(this._onMq); } catch (e) { } this._mq = null; this._onMq = null; }
    if (this._rmq && this._onRmq) { try { if (this._rmq.removeEventListener) this._rmq.removeEventListener('change', this._onRmq); else this._rmq.removeListener(this._onRmq); } catch (e) { } this._rmq = null; this._onRmq = null; }
    this.stopCanvas(); this.killSpatial(); this.killOrbit();
    try { document.body.style.overflow = ''; } catch (e) { }
    if (this._t) clearInterval(this._t);
    if (this._end) clearTimeout(this._end);
    if (this._onKey) document.removeEventListener('keydown', this._onKey);
    if (this._uRetryT) clearTimeout(this._uRetryT);
    if (this._objUrls) { this._objUrls.forEach((u) => { try { URL.revokeObjectURL(u); } catch (e) { } }); this._objUrls = []; }
    if (this._storageHandler) window.removeEventListener('storage', this._storageHandler);
    if (this._onPop) window.removeEventListener('popstate', this._onPop);
    if (this._wipeWatchdog) clearTimeout(this._wipeWatchdog);
    if (this._wipeClearGuards) { try { this._wipeClearGuards(); } catch (e) { } this._wipeClearGuards = null; }
    if (this._czDetach) { try { this._czDetach(); } catch (e) { } this._czDetach = null; this._czInit = false; }
  }

  /* THE COVER IS RENDERED HERE, OUTSIDE THE ROUTE, and that placement is the whole fix.

     AppView returns four different trees from four early returns — the two phone surfaces, the
     document routes and the tool — and React reconciles their unkeyed children BY INDEX. The wipe
     layer used to be one of those children, at index 2 of the document branch and index 6 of the
     tool's, so every navigation across that boundary unmounted the very element the running timeline
     was animating and mounted an untouched, display:none replacement. Measured: the cover vanished in
     one frame at the swap and never came back, so the wordmark's exit and the panel's lift — the
     entire second half of the gesture — played on detached nodes. Doc-to-doc was unaffected, which is
     exactly why it read as an inconsistency rather than as a broken transition.

     Rendered as a sibling of [data-app] it is outside every branch, so its identity survives any route
     change. Two things follow from that and both are wanted: the two phone surfaces, which never
     rendered a layer at all, now have one; and the inert guard the wipe puts on [data-app] no longer
     covers the cover itself, so parking focus on it during the transition finally works. */
  render() {
    return (
      <>
        <AppView vals={this.renderVals()} />
        <WipeLayer />
      </>
    );
  }
}

Object.assign(
  PaletteApp.prototype,
  pipelineMethods,
  persistenceMethods,
  motionMethods,
  overlayMethods,
  universeMethods,
  reelMethods,
  orbitMethods,
  wipeMethods,
  loaderMethods,
  shareMethods,
  miscMethods,
  renderValsMethods,
);
