// ⌘K: the Library's search, and the handful of acts that are as easy to find by name.
/* (24.09.26, UX audit, by request: "Add a Command+K search we know from react tools".)

   WHY. The Library had no way to find a palette but paging through it twelve at a time and reading
   names, which is fine at eight examples and a chore at eighty. The command menu is the convention
   the tools this audience already works in have settled on (Linear, Vercel, Raycast, shadcn's docs,
   all on cmdk): one key from anywhere, type, arrows, Return. So it is that, and nothing novel.

   WHAT IT FINDS. Every palette in the Library, whatever the Library panel is filtering, by what a
   reader remembers a palette by: its name first, then the two words the Library already files it
   under (Warm, Balanced), its Character, the projects it is in, "example", and a hex, typed with or
   without the #. Case, accents and punctuation do not count. Every word typed has to find something, so a second
   word narrows. With nothing typed it opens on the newest palettes, which is where most returns go.
   Then the three acts it is the shorter way to (New Palette, Back Up, Restore), matched the same way.

   WHAT A PICK DOES. A palette opens on the stage exactly as its Library row does (loadIntoResult),
   so Close goes back to its row. An act runs as its own button would. The menu is closed first (its
   frame is still leaving), so whatever the pick opens is not opened under it.

   WHERE IT IS TAKEN. The tool with nothing modal open: not over the landing, a document, a phone's
   story, a dialog or drawer (they own the keyboard), a tour step or a reading. It is one of the
   modal layers itself (_frontLayers, _syncInert, _consentBlocked), so Back shuts it and the analytics
   banner steps aside for it. */
import { trackEvent } from '../../lib/track.js';
import { isDoc } from '../routes.js';

// A query lists its best matches, at most 40 (kept 25.09.26, by request: "limit appropriately and set a
// max height with scroll inside"). The list scrolls inside a panel the window bounds, and 40 rows is
// about three panels of scrolling on a 900px window: past that a longer word is quicker than the
// scroll, and a Library of hundreds never builds hundreds of rows on a keystroke.
const MAX_PALETTES = 40;
// Nothing typed: the five most recent (25.09.26, by request: "limit recent palettes to 5, otherwise the
// search will be overdone"). It was eight, the Library a first visit opens on. Five, with the three
// acts, is a list read at a glance, and fewer rows to weigh is a quicker choice (Hick's law); typing
// reaches the rest.
const RECENT = 5;
// Case and accents do not count: "cafe" finds Café, "GARNET" finds Garnet.
const fold = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
/* NOR DOES PUNCTUATION (25.09.26, from the search audit). A comma pasted with a name ("garnet,") found
   nothing, and nor did "oneil" for O'Neil or "moss-hour" for Moss Hour, since the words were compared
   with their marks. Both sides are read the same way now: an apostrophe joins what it stands in
   ("o'neil" and "oneil" are one word), any other mark parts words, and what is left is letters and
   digits. What is typed keeps its #, which says a hex is meant. */
const plain = (t, keepHash) => fold(t).replace(/['’‘ʼ]/g, '').replace(keepHash ? /[^\p{L}\p{N}#]+/gu : /[^\p{L}\p{N}]+/gu, ' ').trim();
// The words of a query, read as above; a # standing alone is no word.
const queryWords = (q) => plain(q, true).split(' ').filter((w) => w && w !== '#');
const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent || '');
/* HOW FAR ONE SPELLING IS FROM ANOTHER: edits of one letter (in, out, changed) and two letters swapped
   (Damerau–Levenshtein, the optimal string alignment form), counted until `max` is passed. */
function editDistance(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev2 = null, prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let least = i;
    for (let j = 1; j <= b.length; j++) {
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prev2[j - 2] + 1);
      cur[j] = v;
      if (v < least) least = v;
    }
    if (least > max) return max + 1;
    prev2 = prev; prev = cur;
  }
  return prev[b.length];
}

export const searchMethods = {
  // The key as this keyboard has it: ⌘K on a Mac, Ctrl K elsewhere, where Ctrl+K is what the same
  // tools answer to. On a Mac Ctrl+K is left alone: in a text field it is the system's delete-to-end.
  searchKeys() { return IS_MAC ? { hint: '⌘K', aria: 'Meta+K' } : { hint: 'Ctrl K', aria: 'Control+K' }; },
  _isSearchKey(e) {
    if (!e || (e.key !== 'k' && e.key !== 'K') || e.shiftKey || e.altKey) return false;
    return IS_MAC ? (e.metaKey && !e.ctrlKey) : (e.ctrlKey && !e.metaKey);
  },

  _searchAvailable() {
    const s = this.state;
    if (s.narrow || isDoc(s.route) || this._landingUp()) return false;
    if (s.stage === 'processing') return false;
    // The enlarged reference image keeps the key like any modal layer (misc.js _czUp).
    if (this._czUp && this._czUp()) return false;
    // A tour step owns the page; its docked offer does not (it steps aside for this, like any layer).
    if (s.tourStep != null && !(s.tourStep === 'invite' && s.tourInviteDocked)) return false;
    // The Library panel is non-modal and closes for it; every other layer keeps the key.
    const layers = this._frontLayers() - (s.tagMenuOpen ? 1 : 0);
    return layers === 0 && (s.feed || []).length > 0;
  },

  openSearch(from) {
    if (this.state.searchOpen || !this._searchAvailable()) return false;
    /* NOT WHILE THE PAGE IS CROSSING (25.09.26, from the ⌘K audit). Pressed as Create lifts the landing,
       it opened under the crossing's cover and stood there unseen, the caret in it, until the cover left.
       The key is not taken until the page has arrived; a transition that has hung is cleared first. */
    if (this._wipeRecoverStuck) this._wipeRecoverStuck();
    if (this._wipeRunning) return false;
    this._searchResumed = !!this.state.searchOut;
    /* OUT OF THE LIBRARY PANEL, FOCUS COMES BACK TO ITS DOOR (26.09.26, from the modal keyboard audit).
       The panel closes for the search, and focus was remembered where it stood, on a control inside a
       panel that is gone by the time the search closes: Escape dropped focus on the page itself, and
       the next Tab started from the top. It comes back to Manage, the door the panel was opened by. */
    const panelDoor = this.state.tagMenuOpen ? this._tagBack : null;
    if (this.state.tagMenuOpen) { try { this.closeTagFilter(); } catch (e) { } }
    this._searchBack = panelDoor && panelDoor.isConnected ? panelDoor : document.activeElement;
    trackEvent('Search Opened', { from: from === 'button' ? 'button' : 'shortcut' });
    if (!this._searchOnResize) this._searchOnResize = () => { if (this.state.searchOpen) this._searchPlace(true); };
    window.addEventListener('resize', this._searchOnResize);
    this.setState({ searchOpen: true, searchOut: false, searchQuery: '', searchActive: 0 }, () => {
      this._searchPlace();
      this._searchIn();
      requestAnimationFrame(() => { const i = this.searchInputRef.current; if (i) try { i.focus({ preventScroll: true }); } catch (e) { } });
    });
    return true;
  },

  /* SNAPPY (24.09.26, by request: "it needs to be snappy and quick"). The first round borrowed the
     dialogs' motion: in over DUR.state from 12px down, out over DUR.overlayOut (0.62s), and a pick
     waited for the whole exit before it acted, so choosing a palette spent over half a second on a
     panel that had already been answered. The search is the one surface opened by a key and closed
     by one, over and over, so it takes the two shortest tokens: in on DUR.fast (0.18s), scaling up
     from 0.98 about the field's middle, so the field does not move, the curve past 80% of its way in the
     first quarter of that;
     out on DUR.micro (0.12s). Closing is no longer something to wait for: the state says closed at
     once (the page is live, focus goes back, a pick acts) and only the frame lingers, leaving
     (`searchOut`). ⌘K pressed again while it leaves takes it back from where it is. */
  _searchIn() {
    const g = window.gsap, panel = document.querySelector('[data-search-dialog]');
    if (this._reduce || !g || !panel) return;
    const scrim = panel.parentElement && panel.parentElement.querySelector('[data-modal-backdrop]');
    const parts = scrim ? [panel, scrim] : [panel];
    g.killTweensOf(parts);
    // A height it was easing to when it was shut is dropped: it opens at its own (_searchResize).
    panel.style.height = ''; panel.removeAttribute('data-search-resizing');
    // Opened fresh, it starts from nothing; taken back mid-exit, it goes on from where it was.
    if (!this._searchResumed) { g.set(panel, { opacity: 0, scale: 0.98 }); if (scrim) g.set(scrim, { opacity: 0 }); }
    this._searchResumed = false;
    g.to(panel, { opacity: 1, scale: 1, duration: this.DUR.fast, ease: this.EASE.entrance, transformOrigin: '50% 28px', clearProps: 'opacity,transform' });
    if (scrim) g.to(scrim, { opacity: 1, duration: this.DUR.fast, ease: this.EASE.standard, clearProps: 'opacity' });
  },
  /* WHERE THE FIELD STANDS (25.09.26, by request: "keep the modal centered but search at the same position
     at all times, the modal only extend downwards and upwards depending on content"). For one round the
     frame centred the panel at every height, so the field travelled as the list changed: 144px down on
     "garnt". Now the panel is centred on the height it opens at (the recent palettes and the acts) and its
     top is held there for as long as it is open (--search-top on the frame, AppView SearchDialog), so the
     field stays put and only the foot moves. Never nearer the top than the frame's 24px margin, so on a
     short window it opens at the top and the list scrolls. A window resized while it is open centres
     that same opening height again, rather than whatever the list has become. */
  _searchPlace(keepOpenHeight) {
    const panel = document.querySelector('[data-search-dialog]'), frame = panel && panel.parentElement;
    if (!frame) return;
    const MARGIN = 24;   // the frame's own inset on the other three sides, the page's margin
    if (!keepOpenHeight || !this._searchOpenH) {
      // Measured with the most room the window gives, so a tall list is read at the height it will take.
      frame.style.setProperty('--search-top', MARGIN + 'px');
      panel.style.height = '';
      this._searchOpenH = panel.offsetHeight;
    }
    frame.style.setProperty('--search-top', Math.max(MARGIN, Math.round((window.innerHeight - this._searchOpenH) / 2)) + 'px');
  },

  /* THE FOOT EASES TO ITS NEW PLACE (25.09.26, by request: "adjust its height freely in motion when user
     makes an action"). What is typed changes the list, and the panel took its new height in one frame. It
     now goes from the height it had (PaletteApp getSnapshotBeforeUpdate) to the one it has, on the
     search's own short tokens (DUR.fast, EASE.standard); its top is held (_searchPlace), so the foot is
     what moves. From wherever it is: a key pressed mid-way starts the next change from there. The list
     keeps its scrollbar out of it until the height lands. Under reduced motion it simply is the new height. */
  _searchResize(from) {
    const g = window.gsap, panel = document.querySelector('[data-search-dialog]');
    if (!panel || this._reduce || !g) return;
    g.killTweensOf(panel, 'height');
    panel.style.height = '';
    const to = panel.offsetHeight;
    if (Math.abs(to - from) < 1) { panel.removeAttribute('data-search-resizing'); return; }
    panel.setAttribute('data-search-resizing', '');
    g.fromTo(panel, { height: from }, { height: to, duration: this.DUR.fast, ease: this.EASE.standard, onComplete: () => { panel.style.height = ''; panel.removeAttribute('data-search-resizing'); } });
  },
  _searchOut(done) {
    const g = window.gsap, panel = document.querySelector('[data-search-dialog]');
    if (this._reduce || !g || !panel) { done(); return; }
    const scrim = panel.parentElement && panel.parentElement.querySelector('[data-modal-backdrop]');
    g.killTweensOf(scrim ? [panel, scrim] : [panel]);
    g.to(panel, { opacity: 0, scale: 0.98, duration: this.DUR.micro, ease: this.EASE.exit, transformOrigin: '50% 28px' });
    g.to(scrim || {}, { opacity: 0, duration: this.DUR.micro, ease: this.EASE.exit, onComplete: done });
  },

  // `then` runs as soon as the menu is closed, while its frame is still leaving; `keepFocus` leaves
  // focus to it (a palette's open, a dialog).
  closeSearch(then, keepFocus) {
    if (!this.state.searchOpen) return;
    if (this._searchOnResize) window.removeEventListener('resize', this._searchOnResize);
    const back = this._searchBack; this._searchBack = null;
    this.setState({ searchOpen: false, searchOut: true }, () => {
      if (!keepFocus && back && document.contains(back) && !back.closest('[inert]')) { try { back.focus({ preventScroll: true }); } catch (e) { } }
      // Opened from nowhere (the page itself had focus), there is nothing to hand focus back to, and
      // the caret would stay in the field that is leaving, taking the next key with it.
      const at = document.activeElement;
      if (at && at.closest && at.closest('[data-search-dialog]')) { try { at.blur(); } catch (e) { } }
      if (then) then();
      this._searchOut(() => { if (!this.state.searchOpen) this.setState({ searchOut: false }); });
    });
  },

  // ---- the results --------------------------------------------------------------------------

  // Every word has to find something in one of the palette's fields; the better the field and the
  // closer to a word's start, the higher it ranks. null is no match.
  _scorePalette(p, words, whole) {
    const tags = this.paletteTags(p);
    const arch = typeof p.archetype === 'string' && !/^(seed|shared|interpreted)$/.test(p.archetype) ? p.archetype : '';
    const fields = [
      { t: plain(p.name), w: 3 },
      { t: plain(tags.join(' ')), w: 2 },
      { t: plain(arch), w: 2 },
      { t: plain(this.palProjects(p).map((id) => this.projectName(id)).join(' ')), w: 2 },
      { t: p.example === true ? 'example' : '', w: 1 },
    ];
    const hexes = (p.swatches || []).map((s) => String(s.hex || '').replace('#', '').toLowerCase());
    let score = 0;
    for (const w of words) {
      let best = 0;
      const hx = w.replace(/^#/, '');
      if (/^[0-9a-f]{3,6}$/.test(hx) && hexes.some((h) => h.startsWith(hx))) best = w[0] === '#' ? 6 : 2;
      for (const f of fields) {
        if (!f.t) continue;
        if ((' ' + f.t).includes(' ' + w)) best = Math.max(best, f.w * 2);
        else if (f.t.includes(w)) best = Math.max(best, f.w);
      }
      if (!best) return null;
      score += best;
    }
    if (plain(p.name).startsWith(whole)) score += 6;
    return score;
  },

  /* THE ACTS, PRIORITISED (25.09.26, by request: "what is the reasoning for implementing all actions
     across the website into search. We need make priorities here"). The first round carried eight,
     after the command menus it followed, which hold dozens of commands that have nowhere else to live.
     Here nearly every act already has a place one press from where the reader is looking, and each
     one listed lengthens the list the palettes are found in (Hick's law). So an act is listed only
     where the search is the shorter way to it:
     · New Palette: the act the tool is for.
     · Back Up Library and Restore from a File: the last two rows of Manage, the far end of a drawer.
     Left out, each already one press away: Export and Check Contrast (under the palette), List and
     Grid (beside the Search door), the theme (the masthead's switch), Take a Tour (the footer). */
  _searchActs() {
    return [
      { key: 'new', label: 'New Palette', words: 'new palette create image upload start', icon: 'plus', run: () => this.newPalette() },
      { key: 'backup', label: 'Back Up Library', words: 'back up backup save file download library', icon: 'export', run: () => this.backUpLibrary('search') },
      { key: 'restore', label: 'Restore from a File', words: 'restore import open file backup', icon: 'import', run: () => { const i = this.projectFileRef && this.projectFileRef.current; if (i) i.click(); } },
    ];
  },

  /* RECENT MEANS RECENTLY OPENED (25.09.26, from the search audit). "Recent Palettes" was the eight
     newest in the Library, so a palette opened a moment ago from the Library's second page was not in
     it, which is what the word promised. Now it is the palettes this visit has had on the stage or in
     Full Swatch View, most recent first (_noteRecent, from PaletteApp componentDidUpdate), then the
     newest to fill the five. Kept for the visit only, in memory: nothing is written for it.
     THE PALETTE ON THE STAGE IS LEFT OUT, so the first row is the one before it and ⌘K, Return goes
     back to it, as a switcher's first press does; typed, the search still finds it. */
  _noteRecent(id) {
    if (!id) return;
    // As many as the list shows, plus the one on the stage it leaves out.
    this._recent = [id].concat((this._recent || []).filter((x) => x !== id)).slice(0, RECENT + 1);
  },
  _recentPalettes() {
    const s = this.state, feed = s.feed || [];
    const onStage = s.stage === 'result' && s.current && !s.sharedView ? s.current.id : null;
    const byId = new Map(feed.map((p) => [p.id, p]));
    const seen = new Set(onStage ? [onStage] : []);
    const out = [];
    (this._recent || []).concat(feed.map((p) => p.id)).forEach((id) => {
      if (out.length >= RECENT || seen.has(id) || !byId.has(id)) return;
      seen.add(id); out.push(byId.get(id));
    });
    return out;
  },

  // The flat list the menu shows, in order, grouped: what the query finds, or what it may have meant.
  searchItems() {
    const groups = this._searchGroups(this.state.searchQuery);
    if (groups.length || !queryWords(this.state.searchQuery).length) return groups;
    // Nothing matches: a spelling close to the Library's own words is offered, if it finds something.
    const fix = this._didYouMean(this.state.searchQuery);
    if (!fix) return [];
    // What the corrected words find, as tags, in the order the list would have shown them.
    const found = [];
    this._searchGroups(fix).forEach((g) => g.items.forEach((it) => found.push(it)));
    const items = found.slice(0, RECENT).map((it) => Object.assign({}, it, { tag: true }));
    if (found.length > RECENT) items.push({ kind: 'suggest', key: 'fix-all', text: fix, count: found.length, tag: true });
    return [{ key: 'suggest', label: 'Did you mean “' + fix + '”?', miss: true, fix, tags: true, items }];
  },

  /* DID YOU MEAN (25.09.26, by request: "if a user spells something but it's close to what they meant the
     engine should suggest 'Did you mean', the search needs to guide and help the user"). When nothing
     matches, each word that no palette, word, character, project or act contains is set beside the
     Library's own words, and the nearest within reach takes its place: one edit for a word of up to
     four letters, two above that (an edit is a letter in, out, changed, or two swapped). The whole of
     it is offered only if it finds something. A hex is typed exactly or not at all.
     WHAT IT FINDS IS OFFERED AS TAGS (the same day, by request: "The search suggestions should be tags
     to send the user directly to the specific result"). It was one row, "Did you mean “Garnet”?", that
     wrote the words into the field, so reaching Garnet took a second pick from the list that followed.
     Now the question stands as the label, and under it each palette or act the words find is a tag
     that opens it or runs it, as its row would. At most five, the number the list opens on (RECENT);
     past five, a last tag, Show All and the count (the Library drawer's words for the same thing),
     writes the words into the field, where the whole list is. */
  _searchVocab() {
    const s = this.state;
    const words = new Map();
    // Each word as the Library spells it ("O'Neil"), under the key a query is read to ("oneil").
    const add = (text) => String(text || '').split(/[^\p{L}\p{N}'’‘ʼ]+/u).forEach((w) => {
      const k = plain(w);
      if (k.length >= 3 && !k.includes(' ') && !words.has(k)) words.set(k, w.replace(/^['’‘ʼ]+|['’‘ʼ]+$/g, ''));
    });
    (s.feed || []).forEach((p) => {
      add(p.name);
      this.paletteTags(p).forEach(add);
      if (typeof p.archetype === 'string' && !/^(seed|shared|interpreted)$/.test(p.archetype)) add(p.archetype);
    });
    (s.projects || []).forEach((pr) => add(pr.name));
    // An act by its name and by the words it answers to (backup, upload, import).
    this._searchActs().forEach((a) => { add(a.label); add(a.words); });
    add('Example');
    return words;
  },
  _didYouMean(query) {
    const typed = queryWords(query);
    if (!typed.length) return null;
    const vocab = this._searchVocab();
    const known = [...vocab.keys()];
    let changed = false;
    const out = [];
    for (const w of typed) {
      // A word already found is kept, in the Library's own spelling when it is one of its words whole.
      if (/^#?[0-9a-f]{3,6}$/.test(w) || known.some((v) => v.includes(w))) { out.push(vocab.has(w) ? vocab.get(w) : w); continue; }
      const max = w.length <= 4 ? 1 : 2;
      // Nearest first; on a tie, the word that starts with the same letter, then the shorter one.
      const rank = (v, d) => [d, v[0] === w[0] ? 0 : 1, v.length];
      const before = (x, y) => x[0] - y[0] || x[1] - y[1] || x[2] - y[2];
      let best = null, bestRank = null;
      for (const v of known) {
        const d = editDistance(w, v, max);
        if (d > max) continue;
        const r = rank(v, d);
        if (!best || before(r, bestRank) < 0) { best = v; bestRank = r; }
      }
      if (!best) return null;
      out.push(vocab.get(best));
      changed = true;
    }
    if (!changed) return null;
    const fix = out.join(' ');
    return this._searchGroups(fix).length ? fix : null;
  },

  // The groups a query finds, palettes and acts. Recomputed each render: the Library is small.
  _searchGroups(query) {
    const s = this.state;
    const words = queryWords(query);
    const whole = words.join(' ');
    let pals;
    if (!words.length) pals = this._recentPalettes();
    else {
      pals = (s.feed || []).map((p, i) => ({ p, i, sc: this._scorePalette(p, words, whole) }))
        .filter((x) => x.sc != null)
        .sort((a, b) => (b.sc - a.sc) || (a.i - b.i))
        .slice(0, MAX_PALETTES)
        .map((x) => x.p);
    }
    const acts = this._searchActs().filter((a) => !words.length || words.every((w) => (' ' + plain(a.label + ' ' + a.words)).includes(' ' + w)));
    const palGroup = pals.length ? { key: 'palettes', label: words.length ? 'Palettes' : 'Recent Palettes', items: pals.map((p) => ({ kind: 'palette', key: 'p-' + p.id, p })) } : null;
    const actGroup = acts.length ? { key: 'acts', label: 'Actions', items: acts.map((a) => ({ kind: 'act', key: 'a-' + a.key, a })) } : null;
    // Palettes lead, unless what is typed is the start of an act's own name ("dark", "new", "back"):
    // then the act is what was asked for, and it takes the lit row with the palettes right under it.
    const actsFirst = !!words.length && acts.some((a) => plain(a.label).startsWith(whole));
    return (actsFirst ? [actGroup, palGroup] : [palGroup, actGroup]).filter(Boolean);
  },

  // ---- the keys and the pick -----------------------------------------------------------------

  searchPick(item) {
    if (!item) return;
    // Show All under "Did you mean": its words go into the field, and the field keeps the caret at their end.
    if (item.kind === 'suggest') {
      this.setState({ searchQuery: item.text, searchActive: 0 }, () => {
        const i = this.searchInputRef.current;
        if (i) try { i.focus({ preventScroll: true }); i.setSelectionRange(item.text.length, item.text.length); } catch (e) { }
        this._searchAnnounce();
      });
      return;
    }
    if (item.kind === 'palette') {
      const p = item.p;
      // The row it came from, when the Library page on screen holds it, so Close goes back there.
      let row = null;
      try { row = document.querySelector('[data-row][data-rowid="' + (window.CSS && CSS.escape ? CSS.escape(p.id) : p.id) + '"] button'); } catch (e) { }
      this.closeSearch(() => this.loadIntoResult(p, row), true);
      return;
    }
    // None of the three opens a layer of its own (Restore's file picker is the system's), so focus goes back.
    if (item.kind === 'act') this.closeSearch(() => item.a.run());
  },

  searchKey(e, flat) {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); this.closeSearch(); return; }
    // ⌘K closes it, and while it is leaving, takes it back. Held down, only the first press counts.
    if (this._isSearchKey(e)) { e.preventDefault(); e.stopPropagation(); if (e.repeat) return; if (this.state.searchOpen) this.closeSearch(); else this.openSearch('shortcut'); return; }
    if (e.isComposing) return;
    const n = flat.length;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!n) return;
      const at = Math.min(this.state.searchActive, n - 1);
      const to = (at + (e.key === 'ArrowDown' ? 1 : -1) + n) % n;
      this.setState({ searchActive: to }, () => this._searchReveal());
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (n) this.searchPick(flat[Math.min(this.state.searchActive, n - 1)]);
      return;
    }
    if (e.key === 'Tab') this.trapFocusIn('[data-search-dialog]', e);
  },

  // What the field found, said half a second after typing stops: the count, or that nothing matched.
  _searchAnnounce() {
    clearTimeout(this._searchSayT);
    this._searchSayT = setTimeout(() => {
      this._searchSayT = null;
      if (!this.state.searchOpen || !this.state.searchQuery.trim()) return;
      const g = this.searchItems();
      const fix = g.length && g[0].miss ? g[0].fix : null;
      const n = fix ? 0 : g.reduce((k, x) => k + x.items.length, 0);
      this.setState({ announce: n ? (n === 1 ? '1 result.' : n + ' results.') : 'Nothing matches ' + this.state.searchQuery.trim() + '.' + (fix ? ' Did you mean ' + fix + '?' : '') });
    }, 500);
  },

  // The active row kept in view as the arrows walk past the list's edge.
  _searchReveal() {
    const el = document.querySelector('[data-search-dialog] [data-search-opt][aria-selected="true"]');
    if (el) try { el.scrollIntoView({ block: 'nearest' }); } catch (e) { }
  },
};
