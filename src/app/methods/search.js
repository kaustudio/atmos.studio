// ⌘K: the Library's search, and the handful of acts that are as easy to find by name.
/* (24.09.26, UX audit, by request: "Add a Command+K search we know from react tools".)

   WHY. The Library had no way to find a palette but paging through it twelve at a time and reading
   names, which is fine at eight examples and a chore at eighty. The command menu is the convention
   the tools this audience already works in have settled on (Linear, Vercel, Raycast, shadcn's docs,
   all on cmdk): one key from anywhere, type, arrows, Return. So it is that, and nothing novel.

   WHAT IT FINDS. Every palette in the Library, whatever the Library panel is filtering, by what a
   reader remembers a palette by: its name first, then the two words the Library already files it
   under (Warm, Balanced), its Character, the projects it is in, "example", and a hex, typed with or
   without the #. Case and accents do not count. Every word typed has to find something, so a second
   word narrows. With nothing typed it opens on the newest palettes, which is where most returns go.
   Then a few acts people look for by name (New Palette, Export, Back Up...), matched the same way.

   WHAT A PICK DOES. A palette opens on the stage exactly as its Library row does (loadIntoResult),
   so Close goes back to its row. An act runs as its own button would. The menu leaves first, so
   whatever the pick opens is not opened under it.

   WHERE IT IS TAKEN. The tool with nothing modal open: not over the landing, a document, a phone's
   story, a dialog or drawer (they own the keyboard), a tour step or a reading. It is one of the
   modal layers itself (_frontLayers, _bgInert, _consentBlocked), so Back shuts it and the analytics
   banner steps aside for it. */
import { trackEvent } from '../../lib/track.js';
import { isDoc } from '../routes.js';

const MAX_PALETTES = 40;
const RECENT = 8;
// Case and accents do not count: "cafe" finds Café, "GARNET" finds Garnet.
const fold = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent || '');

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
    // A tour step owns the page; its docked offer does not (it steps aside for this, like any layer).
    if (s.tourStep != null && !(s.tourStep === 'invite' && s.tourInviteDocked)) return false;
    // The Library panel is non-modal and closes for it; every other layer keeps the key.
    const layers = this._frontLayers() - (s.tagMenuOpen ? 1 : 0);
    return layers === 0 && (s.feed || []).length > 0;
  },

  openSearch(from) {
    if (this.state.searchOpen || !this._searchAvailable()) return false;
    if (this.state.tagMenuOpen) { try { this.closeTagFilter(); } catch (e) { } }
    this._searchBack = document.activeElement;
    trackEvent('Search Opened', { from: from === 'button' ? 'button' : 'shortcut' });
    this.setState({ searchOpen: true, searchOut: false, searchQuery: '', searchActive: 0 }, () => {
      this._dialogIn('[data-search-dialog]');
      requestAnimationFrame(() => { const i = this.searchInputRef.current; if (i) try { i.focus({ preventScroll: true }); } catch (e) { } });
    });
    return true;
  },

  // `then` runs once the menu has gone; `keepFocus` leaves focus to it (a palette's open, a dialog).
  closeSearch(then, keepFocus) {
    if (!this.state.searchOpen || this._searchLeaving) return;
    this._searchLeaving = true;
    this.setState({ searchOut: true });
    this._dialogOut('[data-search-dialog]', () => {
      this._searchLeaving = false;
      const back = this._searchBack; this._searchBack = null;
      this.setState({ searchOpen: false, searchOut: false }, () => {
        if (!keepFocus && back && document.contains(back) && !back.closest('[inert]')) { try { back.focus({ preventScroll: true }); } catch (e) { } }
        if (then) then();
      });
    });
  },

  // ---- the results --------------------------------------------------------------------------

  // Every word has to find something in one of the palette's fields; the better the field and the
  // closer to a word's start, the higher it ranks. null is no match.
  _scorePalette(p, words, whole) {
    const tags = this.paletteTags(p);
    const arch = typeof p.archetype === 'string' && !/^(seed|shared|interpreted)$/.test(p.archetype) ? p.archetype : '';
    const fields = [
      { t: fold(p.name), w: 3 },
      { t: fold(tags.join(' ')), w: 2 },
      { t: fold(arch), w: 2 },
      { t: fold(this.palProjects(p).map((id) => this.projectName(id)).join(' ')), w: 2 },
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
    if (fold(p.name).startsWith(whole)) score += 6;
    return score;
  },

  _searchActs() {
    const s = this.state;
    const open = s.stage === 'result' && s.current && !s.sharedView;
    const acts = [
      { key: 'new', label: 'New Palette', words: 'new palette create image upload start', icon: 'plus', run: () => this.newPalette() },
      open && { key: 'export', label: 'Export This Palette', words: 'export download tokens css copy hex', icon: 'export', run: () => this.openExport(this.state.current) },
      open && { key: 'contrast', label: 'Check Contrast', words: 'check contrast accessibility wcag aa', icon: 'contrast', run: () => this.openContrast() },
      { key: 'backup', label: 'Back Up Library', words: 'back up backup save file download library', icon: 'export', run: () => this.backUpLibrary('search') },
      { key: 'restore', label: 'Restore from a File', words: 'restore import open file backup', icon: 'import', run: () => { const i = this.projectFileRef && this.projectFileRef.current; if (i) i.click(); } },
      s.feedView === 'grid'
        ? { key: 'list', label: 'List View', words: 'list view table rows', icon: 'list', run: () => this.setFeedView('list') }
        : { key: 'grid', label: 'Grid View', words: 'grid view field universe', icon: 'grid', run: () => this.setFeedView('grid') },
      { key: 'theme', label: s.theme === 'dark' ? 'Light Theme' : 'Dark Theme', words: 'theme dark light mode appearance', icon: 'contrast', run: () => this.toggleTheme() },
      s.tourStep == null && { key: 'tour', label: 'Take a Tour', words: 'take a tour help guide how', icon: 'tour', run: () => this.openTourInvite() },
    ];
    return acts.filter(Boolean);
  },

  // The flat list the menu shows, in order, grouped. Recomputed each render: the Library is small.
  searchItems() {
    const s = this.state;
    const whole = fold(s.searchQuery).trim();
    const words = whole.split(/\s+/).filter(Boolean);
    let pals;
    if (!words.length) pals = (s.feed || []).slice(0, RECENT);
    else {
      pals = (s.feed || []).map((p, i) => ({ p, i, sc: this._scorePalette(p, words, whole) }))
        .filter((x) => x.sc != null)
        .sort((a, b) => (b.sc - a.sc) || (a.i - b.i))
        .slice(0, MAX_PALETTES)
        .map((x) => x.p);
    }
    const acts = this._searchActs().filter((a) => !words.length || words.every((w) => (' ' + fold(a.label + ' ' + a.words)).includes(' ' + w)));
    const palGroup = pals.length ? { key: 'palettes', label: words.length ? 'Palettes' : 'Recent Palettes', items: pals.map((p) => ({ kind: 'palette', key: 'p-' + p.id, p })) } : null;
    const actGroup = acts.length ? { key: 'acts', label: 'Actions', items: acts.map((a) => ({ kind: 'act', key: 'a-' + a.key, a })) } : null;
    // Palettes lead, unless what is typed is the start of an act's own name ("dark", "new", "back"):
    // then the act is what was asked for, and it takes the lit row with the palettes right under it.
    const actsFirst = !!words.length && acts.some((a) => fold(a.label).startsWith(whole));
    return (actsFirst ? [actGroup, palGroup] : [palGroup, actGroup]).filter(Boolean);
  },

  // ---- the keys and the pick -----------------------------------------------------------------

  searchPick(item) {
    if (!item) return;
    if (item.kind === 'palette') {
      const p = item.p;
      // The row it came from, when the Library page on screen holds it, so Close goes back there.
      let row = null;
      try { row = document.querySelector('[data-row][data-rowid="' + (window.CSS && CSS.escape ? CSS.escape(p.id) : p.id) + '"] button'); } catch (e) { }
      this.closeSearch(() => this.loadIntoResult(p, row), true);
      return;
    }
    if (item.kind === 'act') {
      const opensLayer = /^(export|contrast|tour)$/.test(item.a.key);
      this.closeSearch(() => item.a.run(), opensLayer);
    }
  },

  searchKey(e, flat) {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); this.closeSearch(); return; }
    if (this._isSearchKey(e)) { e.preventDefault(); e.stopPropagation(); this.closeSearch(); return; }
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
      const n = this.searchItems().reduce((k, g) => k + g.items.length, 0);
      this.setState({ announce: n ? (n === 1 ? '1 result.' : n + ' results.') : 'Nothing matches ' + this.state.searchQuery.trim() + '.' });
    }, 500);
  },

  // The active row kept in view as the arrows walk past the list's edge.
  _searchReveal() {
    const el = document.querySelector('[data-search-dialog] [data-search-opt][aria-selected="true"]');
    if (el) try { el.scrollIntoView({ block: 'nearest' }); } catch (e) { }
  },
};
