// Share-link glue: read an incoming palette out of the URL fragment, and put the current one into
// a link. The encoding itself lives in lib/share.js; this is the app-state side.
import { decodeShare, paletteCode, shareCode, shareUrl } from '../../lib/share.js';
import { composeReading } from '../../lib/reading.js';
import { trackEvent } from '../../lib/track.js';

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
    /* A LINK CARRIES NO SENTENCE since links became the name and the colours (24.09.26, lib/share.js).
       The recipient's copy is written here, from the colours, by the offline reading: the same words
       atmos gives any palette whenever the live reading can't be reached, and the same every time for the
       same colours. A link from before, which carried its sentence, keeps it. */
    const p = list[0];
    if (!p.rationale) { try { const r = composeReading(p.swatches); if (r && r.rationale) p.rationale = r.rationale; } catch (e) { } }
    return p;
  },

  /* THE LIBRARY'S OWN COPY OF A LINKED PALETTE, or null (25.09.26, from the share audit). The same name
     and the same colours at the same shares (lib/share.js paletteCode): the link names a palette this
     Library already holds, most often one's own link opened in one's own browser. */
  _ownCopy(p) {
    const code = paletteCode(p);
    if (!code) return null;
    return (this.state.feed || []).find((q) => paletteCode(q) === code) || null;
  },

  // The address's palette as its code (lib/share.js shareCode), label aside, or null: what the shared view
  // was opened from (PaletteApp _sharedCode), and what Back or Forward has brought (_hashMoved).
  _hashCode() {
    try { return shareCode(window.location.hash || ''); } catch (e) { return null; }
  },

  // Copy a link to the current palette. Reuses this.copy(), so it gets the same clipboard fallback
  // and the same Copied timer as the hex/CSS actions; the button says Link Copied (AppView,
  // shareButtonLabel).
  //
  // TWO CHANNELS, two different facts, and the split is the point. copy() only swaps the button
  // label and writes to the live region — it shows nothing — so a sentence handed to it is heard
  // and never seen. The confirmation (what just happened) belongs there, where the ✓ Link Copied
  // swap already says the same thing visually.
  //
  // A share link is a snapshot sealed into the URL fragment: it carries the name and the swatches with
  // their shares, and deliberately not the sentence (written again on arrival, _sharedFromHash), the id,
  // the time, the project or the reference image (shareUrl, lib/share.js). The notice that said so when the link was made ("A share link is a snapshot, not
  // a backup…") went on 17.09.26, by request: the button's own Copied state confirms the copy. A
  // palette that cannot be shared still says so.
  // `key` names the button whose Copied state answers: the result stage's by default, the palette
  // detail's since it carries Share too (19.09.26, audit U6), so the one under it stays quiet.
  shareCurrent(pal, key) {
    const p = pal || this.state.current;
    const url = shareUrl(p);
    if (!url) { this.showNotice('This palette can’t be shared.', { sticky: true }); return; }
    this.copy(url, key || 'pal-share', 'Share link copied to your clipboard.');
    trackEvent('Palette Shared', { from: key === 'ov-pal-share' ? 'detail' : 'create' });
  },

  /* THE SHARE DIALOG STOOD HERE (19.09.26–22.09.26). It opened a sheet with Copy Link, Share via…
     (the device's share sheet) and Download Image, the picture of the palette it was built around
     ("go with the download image and build a"). The picture went on 22.09.26 ("It doesn't serve a
     purpose this feature. Leave it."), and the sheet it left was a modal for one link, a single row
     where the browser has no share sheet. So Share is one press again (by request: "What are we
     actively solving here? … we messing up the structure"): shareCurrent above copies the link and
     the button says Link Copied. */

  // Viewing a shared palette writes NOTHING to the recipient's archive. This is the only path that
  // does, and it is theirs to take: a fresh id and timestamp, because from here it is their palette
  // and not a copy of someone else's record.
  saveShared() {
    const p = this.state.current;
    if (!p || !this.state.sharedView) return;
    trackEvent('Shared Palette Saved');
    const mine = Object.assign({}, p, {
      id: String(Date.now()) + Math.random().toString(36).slice(2, 5),
      time: Date.now(),
      // Saved inside a scope, so it joins that project — as a set of one, with the legacy mirror
      // written beside it like every other record.
      projectId: (this.state.activeProjects || [])[0] || null,
      projectIds: (this.state.activeProjects || []).slice(),
    });
    /* SAID WHERE THE PALETTE IS (24.09.26). The saved palette takes the stage as one just made does,
       with "Saved to your Library" and its drawn tick beside its traits (`freshSaved`, renderVals
       `saved`), where a notice at the foot of the window used to say the same thing a second time.
       Where the browser keeps nothing, it is added for the visit and nothing says more. */
    const kept = this.storageKept();
    this.setState((st) => ({
      feed: [mine, ...st.feed], current: mine, sharedView: false, freshSaved: mine.id,
      announce: (kept ? 'Saved ' : 'Added ') + mine.name + ' to your Library.',
    }), () => { this.persist({ immediate: true }); this._clearShareHash(); });
  },

  // "Make your own" — drop the shared palette and land on the dropzone.
  makeOwnFromShared() {
    this._clearShareHash();
    this.setState({ sharedView: false }, () => this.doReset());
  },

  // Drop the fragment once the visitor has moved on, so a reload doesn't reopen someone else's
  // palette over what they're now doing. replaceState keeps it out of their history too.
  // The entry keeps its state (24.09.26). It was written null, and an entry without one now means the
  // browser made it for a # (PaletteApp _hashMoved).
  _clearShareHash() {
    try { window.history.replaceState(window.history.state || {}, '', window.location.pathname + window.location.search); } catch (e) { }
    this._histHereNow();
  },
};
