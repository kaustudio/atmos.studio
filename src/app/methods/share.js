// Share-link glue: read an incoming palette out of the URL fragment, and put the current one into
// a link. The encoding itself lives in lib/share.js; this is the app-state side.
import { decodeShare, shareUrl } from '../../lib/share.js';

export const shareMethods = {
  // Read at CONSTRUCTION (see the _shared field in PaletteApp), not on mount: a share link should
  // open on the palette, and deciding that after the first render means the recipient watches the
  // landing paint and then get replaced.
  //
  // decodeShare establishes shape and bounds; validateFeed — the same gate persisted and imported
  // palettes pass — establishes colour validity and recomputes L/a/b from the hex. A fragment that
  // fails either returns null, and the app simply carries on to its normal landing. Degrading
  // silently is deliberate: a broken link is not the visitor's fault and there is nothing they
  // could do with an error about it.
  _sharedFromHash() {
    let hash = '';
    try { hash = window.location.hash || ''; } catch (e) { return null; }
    if (!hash) return null;
    let decoded = null;
    try { decoded = decodeShare(hash); } catch (e) { return null; }
    if (!decoded) return null;
    let list = null;
    try { list = this.validateFeed([decoded]); } catch (e) { return null; }
    if (!list || !list.length) return null;
    return list[0];
  },

  // Copy a link to the current palette. Reuses this.copy(), so it gets the same clipboard fallback
  // and the same ✓ Copied confirmation swap as the hex/CSS actions.
  //
  // TWO CHANNELS, two different facts, and the split is the point. copy() only swaps the button
  // label and writes to the live region — it shows nothing — so a sentence handed to it is heard
  // and never seen. The confirmation (what just happened) belongs there, where the ✓ Copied swap
  // already says the same thing visually.
  //
  // What the link IS goes through showNotice, which is visible. A share link is a snapshot sealed
  // into the URL fragment: it carries the swatches, the name and the note, and deliberately not the
  // id, the time, the project or the reference image (encodeShare, lib/share.js). It cannot be
  // recalled, updated or restored — which is exactly the confusion a link that looks permanent
  // invites, and the reason the audit asked for it to be said at the moment the link is made. The
  // library's own copy is a backup file, and that is a different button entirely.
  shareCurrent(pal) {
    const p = pal || this.state.current;
    const url = shareUrl(p);
    if (!url) { this.showNotice('This palette can’t be shared.'); return; }
    this.copy(url, 'pal-share', 'Share link copied to your clipboard.');
    this.showNotice('A share link is a snapshot, not a backup. It can’t be recalled or restored.');
  },

  // Viewing a shared palette writes NOTHING to the recipient's archive. This is the only path that
  // does, and it is theirs to take: a fresh id and timestamp, because from here it is their palette
  // and not a copy of someone else's record.
  saveShared() {
    const p = this.state.current;
    if (!p || !this.state.sharedView) return;
    const mine = Object.assign({}, p, {
      id: String(Date.now()) + Math.random().toString(36).slice(2, 5),
      time: Date.now(),
      // Saved inside a scope, so it joins that project — as a set of one, with the legacy mirror
      // written beside it like every other record.
      projectId: (this.state.activeProject && this.state.activeProject !== '__unfiled__') ? this.state.activeProject : null,
      projectIds: (this.state.activeProject && this.state.activeProject !== '__unfiled__') ? [this.state.activeProject] : [],
    });
    this.setState((st) => ({
      feed: [mine, ...st.feed], current: mine, sharedView: false,
      announce: 'Saved ' + mine.name + ' to your Library.',
    }), () => { this.persist({ immediate: true }); this._clearShareHash(); this.showNotice('Saved to your Library.'); });
  },

  // "Make your own" — drop the shared palette and land on the dropzone.
  makeOwnFromShared() {
    this._clearShareHash();
    this.setState({ sharedView: false }, () => this.doReset());
  },

  // Drop the fragment once the visitor has moved on, so a reload doesn't reopen someone else's
  // palette over what they're now doing. replaceState keeps it out of their history too.
  _clearShareHash() {
    try { window.history.replaceState(null, '', window.location.pathname + window.location.search); } catch (e) { }
  },
};
