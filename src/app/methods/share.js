// Share-link glue: read an incoming palette out of the URL fragment, and put the current one into
// a link. The encoding itself lives in lib/share.js; this is the app-state side.
import { decodeShare, shareUrl } from '../../lib/share.js';
import { renderPaletteCard, paletteCardName } from '../../lib/paletteCard.js';

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
  // A share link is a snapshot sealed into the URL fragment: it carries the swatches, the name and
  // the note, and deliberately not the id, the time, the project or the reference image (encodeShare,
  // lib/share.js). The notice that said so when the link was made ("A share link is a snapshot, not
  // a backup…") went on 17.09.26, by request: the button's own Copied state confirms the copy. A
  // palette that cannot be shared still says so.
  // `key` names the button whose Copied state answers: the result stage's by default, the palette
  // detail's since it carries Share too (19.09.26, audit U6), so the one under it stays quiet.
  shareCurrent(pal, key) {
    const p = pal || this.state.current;
    const url = shareUrl(p);
    if (!url) { this.showNotice('This palette can’t be shared.', { sticky: true }); return; }
    this.copy(url, key || 'pal-share', 'Share link copied to your clipboard.');
  },

  /* THE SHARE DIALOG (19.09.26, by request: "go with the download image and build a"). Share opened
     nothing and copied a link; it opens the Copy dialog's sheet now, with three ways out: Copy Link,
     Share via… (the device's own share sheet, or Email Link where the browser has none) and Download
     Image (the palette as a picture, lib/paletteCard.js). It opens and closes exactly as Copy does:
     the opener is remembered, the landmarks go inert through PaletteApp's modal set, and focus comes
     back to the button once they are live again.
     ONE DIFFERENCE: focus lands on Copy Link rather than on the close mark, so the press this button
     used to be is still two keys away, Share and then Enter. */
  openShareMenu() {
    if (this.state.shareMenuOpen) return;
    this._shareBack = document.activeElement;
    this.setState({ shareMenuOpen: true }, () => requestAnimationFrame(() => {
      const d = document.querySelector('[data-share-dialog]');
      if (d) { const b = d.querySelector('[data-ex-item]') || d.querySelector('button'); if (b) try { b.focus(); } catch (e) { } }
      this._dialogIn('[data-share-dialog]');
    }));
  },
  closeShareMenu() {
    if (!this.state.shareMenuOpen || this._shareClosing) return;
    this._shareClosing = true;
    this._dialogOut('[data-share-dialog]', () => {
      this._shareClosing = false;
      this.setState({ shareMenuOpen: false }, () => this._focusShareTrigger(true));
    });
  },
  // Back to whoever opened the sheet. A mouse press in Safari (or a scripted click) never focuses the
  // button, so the opener it remembers can be the page itself; then the Share button takes focus, the
  // palette detail's one when the detail is up, since it comes later in the document.
  _focusShareTrigger(defer) {
    const go = () => {
      const back = this._shareBack;
      const all = document.querySelectorAll('[data-share-trigger]');
      const b = (back && back.isConnected && back !== document.body) ? back : all[all.length - 1];
      if (b && b.focus) try { b.focus(); } catch (e) { }
    };
    if (defer) requestAnimationFrame(go); else go();
  },
  // The device's share sheet, carrying the name and the link; the same call the phone story's handoff
  // makes. The row only exists where navigator.share does (renderVals). A sheet the reader closes
  // without choosing rejects with AbortError, which is an answer, not a failure.
  shareVia(pal) {
    const p = pal || this.state.current;
    const url = shareUrl(p);
    if (!url) { this.showNotice('This palette can’t be shared.', { sticky: true }); return; }
    if (!navigator.share) return;
    navigator.share({ title: 'Atmos Gallery: ' + p.name, url }).catch(() => { });
  },
  // The palette as a picture, saved under its own name. The row answers "Downloaded" on the Copied
  // timer, so the two confirmations in the sheet keep one rhythm.
  downloadShareImage(pal, key) {
    const p = pal || this.state.current;
    if (!p || !p.swatches || !p.swatches.length) return;
    renderPaletteCard(p).then((blob) => {
      if (!blob) { this.showNotice('That image couldn’t be made.', { sticky: true }); return; }
      const href = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = href; a.download = paletteCardName(p);
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(href), 4000);
      if (this._copyT) clearTimeout(this._copyT);
      this.setState({ copied: key || 'pal-img', announce: 'Downloaded ' + a.download + '.' });
      this._copyT = setTimeout(() => this.setState({ copied: null }), 1500);
    });
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
      projectId: (this.state.activeProjects || [])[0] || null,
      projectIds: (this.state.activeProjects || []).slice(),
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
