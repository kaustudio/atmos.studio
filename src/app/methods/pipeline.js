// Upload → extraction → interpretation → result pipeline, plus the branded processing canvas.
// Verbatim port of the design comp's logic; interpretLive routes through the pluggable seam.
import { buildInterpRequest, liveComplete } from '../../lib/interpret.js';
import { hashBytes } from '../../lib/hash.js';

export const pipelineMethods = {
  // ================= clipboard =================
  copy(text, key, msg) {
    if (this._copyT) clearTimeout(this._copyT);
    const finish = () => { this.setState({ copied: key, announce: msg || ('Copied ' + text) }); this._copyT = setTimeout(() => this.setState({ copied: null }), 1500); };
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(text).then(finish, () => { this.fallbackCopy(text); finish(); }); return; }
    } catch (e) { }
    this.fallbackCopy(text); finish();
  },
  fallbackCopy(text) { try { const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.top = '-9999px'; document.body.appendChild(ta); ta.focus(); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); } catch (e) { } },

  // ================= upload validation + failure =================
  handleIncoming(file) {
    if (!file) { this.showError('No file received', 'Try dropping an image again, or browse to pick one.'); return; }
    if (this.ACCEPT.indexOf(file.type) < 0 && file.type.indexOf('image/') !== 0) {
      this.showError('That file isn’t an image', 'Upload a JPG, PNG, WEBP, or GIF. This tool reads colour from picture files only.'); return;
    }
    if (file.size > this.MAX_BYTES) {
      this.showError('That image is too large', 'Files need to be under 20 MB. Try exporting a smaller or compressed version.'); return;
    }
    this.processFile(file);
  },
  showError(title, msg) { this._genId = (this._genId || 0) + 1; this.stopCanvas(); if (this._end) clearTimeout(this._end); if (this._t) clearInterval(this._t); this.setState({ stage: 'error', errorTitle: title, errorMsg: msg, pending: null, announce: 'Upload failed. ' + title + '. ' + msg }); },

  // H1: persisted/imported imageUrl must never trigger a remote request. Allow only self-contained
  // data-image URLs (persisted thumbnails) and session blob: URLs (in-memory objects).
  _safeImageUrl(u) { if (typeof u !== 'string') return null; return (/^data:image\//i.test(u) || /^blob:/.test(u)) ? u : null; },

  // THE EXTRACTION, IN THE THREE PARTS THE PROCESSING STAGE NAMES (17.09.26). It used to be one
  // synchronous call returning { cents, hash }; the parts are unchanged and run in the same order on
  // the same bytes, so a palette comes out identical. What changed is only that the stage can show
  // each part while it runs (_readPhotograph).
  //
  // The buffer and its hash. The hash is taken over the NORMALISED working buffer — the same 72x72
  // RGBA the extraction itself reads — so identity and measurement are computed from exactly the
  // same bytes. Hashing the file instead would make a rename or an EXIF strip look like a new
  // image, and would tie identity to something extraction never looks at. `n` counts the pixels the
  // sampling will keep, so a picture with too little colour is refused before the stage opens.
  _extractBuffer(img) {
    const W = 72, H = 72;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d'); ctx.drawImage(img, 0, 0, W, H);
    const d = ctx.getImageData(0, 0, W, H).data;
    let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] >= 128) n++;
    return { d, n, hash: hashBytes(d) };
  },
  // The sampling. Fixed stride, raster order, whole buffer — never a sampled subset. Already true
  // before this deploy; stated here because it is now load-bearing rather than incidental.
  _extractPoints(d) {
    const pts = [];
    for (let i = 0; i < d.length; i += 4) { if (d[i + 3] < 128) continue; pts.push(this.rgb2oklab(d[i] / 255, d[i + 1] / 255, d[i + 2] / 255)); }
    return pts;
  },
  // The grouping is this.kmeans(pts, k), unchanged.
  extract(img) {
    const k = this.props.swatchCount || 5, b = this._extractBuffer(img);
    if (b.n < k) return { cents: [], hash: b.hash };
    return { cents: this.kmeans(this._extractPoints(b.d), k), hash: b.hash };
  },

  // ---- derived-reading cache, keyed by content hash -------------------------------------------
  // Local only: a plain localStorage record on this device, never sent anywhere. Once an image has
  // been read, its name is the record — a name is a thing the user recognises their work by, so it
  // must not be re-derived and must not drift. This is also what pins the one remaining contextual
  // dependency: composeReading walks to a different candidate when the archive already holds the
  // name it wants, so the same image read into a changed archive could otherwise be renamed.
  CACHE_KEY: 'palette-generator/derived',
  CACHE_MAX: 400,
  _readCache() {
    try { const raw = localStorage.getItem(this.CACHE_KEY); const o = raw ? JSON.parse(raw) : null; return (o && typeof o === 'object' && o.v === 1 && o.e && typeof o.e === 'object') ? o.e : {}; }
    catch (e) { return {}; }
  },
  cachedReading(hash) {
    const e = this._readCache()[hash];
    if (!e || typeof e !== 'object') return null;
    if (typeof e.name !== 'string') return null;
    return { name: e.name, descriptors: [], rationale: typeof e.rationale === 'string' ? e.rationale : '', archetype: typeof e.archetype === 'string' ? e.archetype : 'interpreted' };
  },
  cacheReading(hash, it) {
    if (!hash || !it) return;
    try {
      const e = this._readCache();
      if (e[hash]) return;                      // first derivation wins, permanently
      e[hash] = { name: it.name, descriptors: [], rationale: it.rationale, archetype: it.archetype, at: Date.now() };
      const keys = Object.keys(e);
      if (keys.length > this.CACHE_MAX) {       // oldest-first eviction, so the cap can't grow unbounded
        keys.sort((a, b) => (e[a].at || 0) - (e[b].at || 0)).slice(0, keys.length - this.CACHE_MAX).forEach((k) => { delete e[k]; });
      }
      localStorage.setItem(this.CACHE_KEY, JSON.stringify({ v: 1, e }));
    } catch (err) { /* quota or private mode — the reading is still deterministic without the cache */ }
  },

  buildPalette(cents, url, srcUrl, hash) {
    // sid: stable per-swatch identity, minted at creation so a band has it before the palette has
    // ever been through the store. persistence._validateSwatches re-mints if any are missing.
    const swatches = cents.map((c, i) => { const rgb = this.oklab2rgb(c.L, c.a, c.b); return { sid: i, hex: this.hex(rgb[0], rgb[1], rgb[2]), weight: c.weight, L: c.L, a: c.a, b: c.b }; });
    // The reading works from the swatches (it needs the hexes for its order-stable seed), and takes
    // the feed itself so two DIFFERENT palettes never ship the same name. Passing whole palettes
    // rather than bare names lets it recognise a regenerated palette as itself and keep its name.
    // A cached reading outranks a fresh one: this image has been read before on this device, and
    // that first answer is the record.
    const feed = (this.state && this.state.feed) ? this.state.feed : [];
    const it = this.cachedReading(hash) || this.interpret(swatches, feed);
    this.cacheReading(hash, it);
    const active = (this.state && this.state.activeProject && this.state.activeProject !== '__unfiled__') ? this.state.activeProject : null;
    // Identity comes from content, not from the clock and a dice roll. The suffix is the lowest
    // index not already taken by a palette of this same image, so re-extracting never collides with
    // an existing entry and never reuses an id freed by a deletion.
    const used = new Set(feed.filter((p) => p && p.hash === hash).map((p) => (typeof p.variation === 'number' ? p.variation : 0)));
    let variation = 0; while (used.has(variation)) variation++;
    const pal = { id: hash + '-' + variation, hash, variation, imageUrl: url, time: Date.now(), name: it.name, descriptors: it.descriptors, rationale: it.rationale, archetype: it.archetype, projectId: active, projectIds: active ? [active] : [], swatches };
    if (srcUrl && srcUrl !== url) Object.defineProperty(pal, '_srcUrl', { value: srcUrl, enumerable: false, writable: true, configurable: true }); // non-enumerable so it never gets persisted
    return pal;
  },

  processFile(file) {
    const url = URL.createObjectURL(file); const img = new Image();
    img.onerror = () => { this.showError('This image could not be loaded', 'The file may be corrupted or in a format the browser can’t decode. Try another image.'); };
    img.onload = () => {
      this._runPipeline(img, { srcUrl: url });         // keep the full-res object URL alive for crisp in-session display
    };
    img.src = url;
  },
  _runPipeline(img, opts) {
    opts = opts || {};
    const k = this.props.swatchCount || 5;
    let buf = null;
    try { buf = this._extractBuffer(img); } catch (e) { buf = null; }
    if (!buf || buf.n < k) { if (opts.srcUrl) { try { URL.revokeObjectURL(opts.srcUrl); } catch (e) { } } this.showError('We couldn’t read enough colour', 'This image didn’t yield a stable palette. Try a photo with more visible tone and detail.'); return; }
    const hash = buf.hash;
    // RECOGNITION GATE. Now that identity is content-addressed, an image the archive has already
    // read is a fact we can state instead of a duplicate we silently manufacture. Only the buffer and
    // its hash exist at this point — 5184 pixels, costing nothing — and nothing is committed, so
    // stopping here creates no entry. Only opts.deliberate gets past, and the only thing that sets
    // it is the user choosing "create a variation" in the dialog.
    if (hash && !opts.deliberate) {
      const known = (this.state.feed || []).filter((p) => p && p.hash === hash);
      if (known.length) { this.openRecognised(known, img, opts, hash); return; }
    }
    const srcUrl = opts.srcUrl || null;                 // full-res object URL — session-only crisp display
    if (srcUrl) { (this._objUrls = this._objUrls || []).push(srcUrl); }   // revoke on eviction/unload, not now
    const myGen = ++this._genId;                       // invalidate any in-flight reading from a prior generate
    // `pending` is the reading in progress rather than a palette: there is no palette until the
    // grouping step has run. Nothing reads it but the stage, for its identity.
    const job = { gen: myGen, img, buf, hash, srcUrl, k, mp: ((img.naturalWidth || img.width || 0) * (img.naturalHeight || img.height || 0)) / 1e6 };
    if (this._t) { clearInterval(this._t); this._t = null; }
    if (this._end) { clearTimeout(this._end); this._end = null; }
    this.setState({ stage: 'processing', imageUrl: srcUrl, procStep: 0, pending: job, announce: 'Generating palette from your image.' });
    this._readPhotograph(job);
  },

  /* THE READING, STEP BY STEP (17.09.26, by request: "everything happens too fast … all the thought
     that the user saw through text needs to be present … the loading should be real, but respect the
     output so every image doesn't take 5 seconds").

     WHAT IT WAS. Four lines of status on a 620ms timer that knew nothing about the work, a bar on a
     fixed 7.5s tween, and a 1.3s minimum after which the result replaced the stage. All of the actual
     extraction had run, synchronously, before the stage was even on screen. Without the live reading
     the result arrived before the third line; with it, the fourth line sat there for as long as the
     network took.

     WHAT IT IS. Each line is a step, and each step does its own work while it is showing:
       0 Reading light         the display thumbnail: the full photograph drawn down and encoded,
                               which is the one part whose cost follows the photograph's size
       1 Sampling the field    every kept pixel of the 72x72 buffer into OKLab
       2 Grouping the colours  k-means, the swatches and the local reading; the live reading is sent
                               the moment it has what it needs, so the network runs under this line
       3 Naming the mood       the live reading coming back (or the local one, where there is none)
     A step ends when its work is done AND it has been on screen for its THOUGHT length, whichever is
     later, so no line is skipped and no line outstays the work by more than a reading pause.

     THE LENGTH FOLLOWS THE PICTURE, NOT A CLOCK. The work itself is milliseconds on this machine,
     so a floor is what makes a line readable, and a single floor would give every photograph the
     same beat. The two steps whose real cost depends on the picture take a floor scaled by the real
     property that drives it: Reading light by the photograph's pixel count (log-scaled, so a 48MP
     file reads longer than a screenshot without taking twice as long), Grouping by how far apart the
     colours it found are (a flat grey resolves quickly, a busy scene takes a beat longer). Both are
     bounded (THOUGHT.max). The live reading is real time and nothing is added to it.

     THE BAR FOLLOWS THE STEPS (_readBar), and the natural end (procField.js _procClose) takes it to
     the end once the palette exists. Every step checks that its generation is still the current one,
     so a reset or a new drop ends the old reading wherever it is. */
  async _readPhotograph(job) {
    const stale = () => job.gen !== this._genId;
    const CANCEL = {};
    const step = async (i, work) => {
      if (stale()) throw CANCEL;
      this.setState({ procStep: i });
      this._readBar(i, job);
      // The atmosphere takes the same step as a beat in its gas, with the length this line is
      // expected to hold the screen so the beat is about this step rather than about a clock
      // (procField.js _procStep). The grouping's own structure arrives a moment later, inside its
      // work, because there is no palette to take a shape from until k-means has run.
      this._procStep(i, this._thought(i, job));
      const t0 = performance.now();
      await this._afterPaint();                      // the line is on screen before its work starts
      if (stale()) throw CANCEL;
      const out = await work();
      const rest = this._thought(i, job) * 1000 - (performance.now() - t0);
      if (rest > 0) await new Promise((r) => setTimeout(r, rest));
      if (stale()) throw CANCEL;
      return out;
    };
    try {
      const thumb = await step(0, () => this.makeThumb(job.img));   // display-sized (×DPR), persisted
      const pts = await step(1, () => this._extractPoints(job.buf.d));
      let pal = null, reading = null;
      await step(2, () => {
        pal = this.buildPalette(this.kmeans(pts, job.k), thumb, job.srcUrl, job.hash);   // the local reading is the baseline
        job.spread = this._paletteSpread(pal);
        // The atmosphere's grouping beat: how many swatches, what share each holds and their
        // lightness order — never a hue (procField.js _procShape).
        this._procShape(pal);
        reading = this._readMood(pal, thumb);
      });
      const { interp, errored } = await step(3, () => reading);
      const finalPal = interp
        ? Object.assign({}, pal, { name: interp.name, descriptors: interp.descriptors, rationale: interp.rationale, archetype: interp.archetype || pal.archetype })
        : pal;
      this.commitGenerated(finalPal, job.gen, !interp, errored);
    } catch (e) {
      if (e === CANCEL || stale()) return;
      this.showError('We couldn’t read this image', 'Something went wrong while reading its colour. Try again, or try another image.');
    }
  },
  // Live interpretation over the guaranteed local baseline. Never rejects: a clean "can't attempt"
  // is { interp: null }, a genuine failure (or the timeout) is { interp: null, errored: true }.
  async _readMood(pal, thumb) {
    try { return { interp: await this.withTimeout(this.interpretLive(thumb, pal.swatches), 9000), errored: false }; }
    catch (e) { return { interp: null, errored: true }; }
  },
  // One painted frame, or a tenth of a second where frames are not being painted (a hidden tab).
  _afterPaint() {
    return new Promise((resolve) => {
      let done = false; const go = () => { if (!done) { done = true; resolve(); } };
      requestAnimationFrame(() => setTimeout(go, 0));
      setTimeout(go, 100);
    });
  },
  /* How long step i stays on screen at least, in seconds. See the note above _readPhotograph. */
  _thought(i, job) {
    const T = this.THOUGHT, base = this.DUR.think;
    if (i === 0) return base * Math.min(T.sizeMax, T.sizeBase + T.sizeGain * Math.log2(1 + (job.mp || 0)));
    if (i === 2) return base * (T.spreadBase + T.spreadGain * Math.min(1, (job.spread || 0) / T.spreadFull));
    return base;
  },
  /* The two stretches, as multiples of DUR.think. Chosen so that the picture decides about a second of
     the whole: measured with the local reading (the natural end included), a 0.4MP screenshot is on
     the result in 3.8s and a busy 24MP photograph in 4.6s, where a single floor gave every image 4.1
     to 4.8s. The live reading adds its own real time to the last step.
     Reading light: ×0.82 for a 0.1MP screenshot, ×1.16 at 3MP, ×1.47 at 12MP, ×1.64 at 24MP, and no
     more than ×1.7 however large the file.
     Grouping: ×0.8 for a palette with no spread at all, up to ×1.5 once its colours sit, on average,
     spreadFull apart in OKLab. */
  THOUGHT: {
    sizeBase: 0.8, sizeGain: 0.18, sizeMax: 1.7,
    spreadBase: 0.8, spreadGain: 0.7, spreadFull: 0.2,
  },
  // How far apart a palette's colours are: the weighted mean OKLab distance of its swatches from
  // their weighted centre. About 0.02 for a flat grey, 0.15 and up for a busy scene.
  _paletteSpread(pal) {
    const sw = (pal && pal.swatches) || [];
    let W = 0, L = 0, A = 0, B = 0;
    sw.forEach((s) => { const w = s.weight || 0; W += w; L += w * s.L; A += w * s.a; B += w * s.b; });
    if (!(W > 0)) return 0;
    L /= W; A /= W; B /= W;
    let d = 0; sw.forEach((s) => { d += (s.weight || 0) * Math.hypot(s.L - L, s.a - A, s.b - B); });
    return d / W;
  },
  /* THE BAR FOLLOWS THE STEPS. Each step owns a stretch of it and fills most of that stretch over its
     own thought, so the bar never runs ahead of the work it reports; the last stretch creeps, because
     the live reading has no known length. The natural end takes it to the end. Composited scaleX, as
     before (startCanvas). */
  _readBar(i, job) {
    const g = window.gsap, bar = this.progRef.current;
    if (!g || !bar) return;
    const AT = [0.22, 0.46, 0.7, 0.86];
    g.killTweensOf(bar);
    const ease = this.EASE.progress;
    const tl = g.timeline();
    tl.to(bar, { scaleX: AT[i], duration: this._thought(i, job), ease, transformOrigin: '0% 50%' });
    if (i === 3) tl.to(bar, { scaleX: 0.97, duration: 8, ease });
  },
  // noLive = no live reading was applied (can't-attempt OR error) → silent data flag (pal.fallback).
  // errored = a live attempt genuinely failed → the only case that surfaces the unreachable notice.
  commitGenerated(pal, myGen, noLive, errored, closed) {
    if (myGen !== this._genId) return;
    // The atmosphere's natural end runs first and commits when it has settled (procField.js _procClose).
    if (!closed && this._procClose(() => this.commitGenerated(pal, myGen, noLive, errored, true))) return;
    if (this._t) clearInterval(this._t);
    // fallback = "no live reading applied", for any reason (standalone runtime or error). Silent data honesty:
    // persists (round-trips through validation) and enables a future "Another reading". The notice below is
    // reserved for genuine failures, so a standalone build never surfaces it on every generation.
    pal.fallback = !!noLive;
    this.setState((st) => ({ stage: 'result', current: pal, feed: [pal, ...st.feed], pending: null, announce: 'Palette generated: ' + pal.name + '. ' + this.tagsSpoken(pal) + '.' }), () => this.persist({ immediate: true }));
    if (errored) this.showNotice('Named with the local reading. The live reading did not come back.', { sticky: true });
  },
  // ------- live interpretation call (pluggable: proxy endpoint → artifact runtime → none) -------
  async interpretLive(thumb, swatches) {
    if (!thumb || !this.canInterpretLive()) return null;
    const m = /^data:(image\/[a-z0-9.+-]+);base64,(.*)$/i.exec(thumb);
    if (!m) return null;
    // NOTE: a genuine API/network/rate error propagates (→ notice); only a clean "can't attempt"
    // or an unparseable body resolves to null (→ quiet fallback).
    const raw = await liveComplete(buildInterpRequest(m[1], m[2], swatches));
    return this.parseInterp(raw);
  },
  withTimeout(promise, ms) {
    return new Promise((resolve, reject) => {
      let done = false;
      const t = setTimeout(() => { if (!done) { done = true; reject(new Error('timeout')); } }, ms);
      Promise.resolve(promise).then((v) => { if (!done) { done = true; clearTimeout(t); resolve(v); } }, (e) => { if (!done) { done = true; clearTimeout(t); reject(e); } });
    });
  },
  /* TWO KINDS OF NOTICE. A confirmation passes on its own — five seconds, held while the pointer or
     focus is on it, because a reader who has turned to look at a notice has decided to deal with it.
     An error-class notice (`sticky`) does not pass at all: a file that could not be read, storage that
     is full, a live reading that never came back. Measured before this option, those left the screen
     at exactly five seconds with no control, so anyone who looked away lost the only explanation of
     what had just failed. Both carry the Dismiss the markup draws now (AppView, data-notice). */
  showNotice(msg, options) {
    const sticky = !!(options && options.sticky);
    if (this._noticeT) { clearTimeout(this._noticeT); this._noticeT = null; }
    this.setState({ notice: msg, noticeSticky: sticky }, () => this._noticeIn());
    if (!sticky) this._armNoticeTimer();
  },
  _armNoticeTimer() { if (this._noticeT) clearTimeout(this._noticeT); this._noticeT = setTimeout(() => { this._noticeT = null; this._dismissNotice(); }, 5000); },
  _holdNotice() { if (this._noticeT) { clearTimeout(this._noticeT); this._noticeT = null; } },
  _releaseNotice() { if (this.state.notice && !this.state.noticeSticky && !this._noticeT) this._armNoticeTimer(); },
  _noticeIn() { const g = window.gsap; if (this._reduce || !g) return; const el = document.querySelector('[data-notice]'); if (el) g.from(el, { opacity: 0, y: 14, duration: this.DUR.state, ease: this.EASE.entrance, clearProps: 'transform' }); },
  _dismissNotice() { const g = window.gsap; const el = document.querySelector('[data-notice]'); if (this._noticeT) { clearTimeout(this._noticeT); this._noticeT = null; } const clear = () => this.setState({ notice: null, noticeSticky: false }); if (this._reduce || !g || !el) { clear(); return; } g.to(el, { opacity: 0, y: 14, duration: this.DUR.state, ease: this.EASE.exit, onComplete: clear }); },

  // ================= pre-seeded feed =================
  // The examples a first visit opens on. Each one is a photograph that ships with the app, and each
  // palette below is the genuine output of the pipeline above having read that exact file: the same
  // 72x72 k-means, the same content hash, the same local composeReading that named it and wrote its
  // rationale. Nothing here is hand-tuned to look good. That matters twice over — the first thing a
  // visitor sees is a true sample of what the tool does rather than an art-directed promise of it,
  // and because the hashes are real, downloading one of these images and dropping it back in is
  // recognised by the gate in _runPipeline as the palette it already is, instead of silently
  // manufacturing a duplicate.
  //
  // Replacing an image means re-deriving its row. The extraction is deterministic — kmeans seeds
  // from the point furthest from the cloud's own centre and never touches Math.random — so the
  // numbers are reproducible: read the file through extract() + buildPalette() + composeReading()
  // and paste what comes back. Derive OLDEST FIRST, since composeReading takes the archive as it
  // stood when the image was read, and these ages say the bottom row was acquired first. Editing a
  // hex by hand without moving the hash is the one thing that would make this table lie.
  //
  // The set is chosen for hue coverage, not for mood. Measured dominant hue runs 30 / 44 / 58 / 82 /
  // 98 / 128 / 238 / 263 degrees: red through orange, gold and chartreuse, then two blues. The gaps
  // are the source material's, not an oversight — there is no magenta and no clean cyan to be had,
  // so the arc from 263 back round to 30 is empty. One of these carries its own opposition (yellow
  // balls on a blue court), which is what keeps the middle of the set from reading as one long warm
  // run the way an earlier eight did.
  //
  // THE 164 SLOT IS GONE and with it the set's only true green, which is a real cost and is recorded
  // rather than glossed. Ruled Open Country held it at chroma 0.157; it was replaced by request with
  // Hard Gunmetal, read off a photograph whose most colourful swatch is 0.036 from neutral. What the
  // set gains is a kind it did not have — a genuinely achromatic palette, which is worth showing on a
  // tool that reads colour, because "there is almost none here" is an answer it has to be able to
  // give. What it loses is green. Its 98 is nominal: at that chroma the angle barely means anything,
  // so read the run above as six hues, two blues and one neutral rather than as eight steps.
  //
  // Seeds keep imageUrl null and carry a KEY instead. The key is resolved against EXAMPLE_SRC below
  // and nowhere else, so the H1 invariant at the top of this file survives the examples having
  // pictures: no string that came out of storage or off a share link can ever reach an <img src> —
  // the only thing a stored value can do is name one of our own bundled assets, or miss.
  EXAMPLE_SRC: {
    'profile-ember': '/assets/examples/profile-ember.webp',
    'tulip': '/assets/examples/tulip.webp',
    'courtyard': '/assets/examples/courtyard.webp',
    'poppy': '/assets/examples/poppy.webp',
    'radish': '/assets/examples/radish.webp',
    'stride': '/assets/examples/stride.webp',
    'court': '/assets/examples/court.webp',
    'profile-sky': '/assets/examples/profile-sky.webp',
  },
  // hasOwnProperty, not a bare lookup: 'constructor' and friends are inherited keys that would
  // otherwise resolve to a truthy non-string and end up interpolated into a url().
  exampleUrl(p) {
    const k = p && p.example === true && p.exampleKey;
    return (typeof k === 'string' && Object.prototype.hasOwnProperty.call(this.EXAMPLE_SRC, k)) ? this.EXAMPLE_SRC[k] : '';
  },
  /* THE SAME EIGHT, CUT TO THE LANDING CREDIT'S BOX. That box is at most 96x64 and was drawing the
     900px originals, up to 93 KB each, so on a slow connection the front page's largest early paint
     arrived at 4.1s. These are the centre 3:2 crop object-fit: cover shows, at 288x192 (three
     times the box), 2 to 8 KB each. Same lookup as exampleUrl, so the H1 invariant holds; a key
     with no cut here falls back to the original rather than to nothing. */
  EXAMPLE_THUMB: {
    'profile-ember': '/assets/examples/thumbs/profile-ember.webp',
    'tulip': '/assets/examples/thumbs/tulip.webp',
    'courtyard': '/assets/examples/thumbs/courtyard.webp',
    'poppy': '/assets/examples/thumbs/poppy.webp',
    'radish': '/assets/examples/thumbs/radish.webp',
    'stride': '/assets/examples/thumbs/stride.webp',
    'court': '/assets/examples/thumbs/court.webp',
    'profile-sky': '/assets/examples/thumbs/profile-sky.webp',
  },
  exampleThumbUrl(p) {
    const k = p && p.example === true && p.exampleKey;
    return (typeof k === 'string' && Object.prototype.hasOwnProperty.call(this.EXAMPLE_THUMB, k)) ? this.EXAMPLE_THUMB[k] : this.exampleUrl(p);
  },
  seedObj(s) {
    const swatches = s.sw.map((e, i) => { const rgb = this.hexToRgb(e[0]); const lab = this.rgb2oklab(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255); return { sid: i, hex: e[0], weight: e[1], L: lab.L, a: lab.a, b: lab.b }; });
    // id follows the generated form (hash + variation) rather than a name, so a seed and a re-read
    // of the same image are the same identity in every place identity is compared.
    return { id: s.hash + '-0', hash: s.hash, variation: 0, imageUrl: null, exampleKey: s.key, time: Date.now() - s.age, name: s.name, descriptors: [], rationale: s.rat, archetype: s.arch, example: true, swatches };
  },
  // THE DESCRIPTORS HERE ARE THE ENGINE'S OWN. They were hand-authored, and every one of them was a
  // measured word — Garnet shipped as Low-lit · Warm · Saturated, which are Lightness, Temperature
  // and Chroma facet values, so the eight examples were the archive's largest source of exactly the
  // duplication the Character group now excludes (see src/lib/taxonomy.js). Each `desc` below is
  // what composeReading() returns for that swatch set, so a seed and a freshly read palette describe
  // themselves in one vocabulary. The RATIONALES are untouched: an axis word belongs in a sentence.
  makeSeed() {
    const H = 3600e3;
    return [
      // 30° — red
      this.seedObj({
        key: 'profile-ember', hash: 'f757f5916e3a11e5', age: 8 * 60e3,
        name: 'Garnet', arch: 'graphic',
        rat: 'Warm, saturated reds kept in shadow split by stark contrast. Shadowed but legible.',
        sw: [['#0f0302', .3609], ['#e12409', .2392], ['#f17645', .1454], ['#aa0906', .1416], ['#540604', .1128]],
      }),
      // 44° — orange
      this.seedObj({
        key: 'tulip', hash: 'ff280e7420bfb244', age: 3 * H,
        name: 'Dry Season', arch: 'graphic',
        // The one authored rationale in this table: supplied copy (14.09.26), replacing an engine
        // reading that claimed the palette's energy made it legible. Checked against the weights
        // below: the two oranges hold 85% of the frame.
        rat: 'Warm oranges carry most of the image, with muted brown, pale beige and a deep shadow completing the palette.',
        sw: [['#a74b1b', .4919], ['#933913', .3580], ['#ab8766', .0972], ['#d5cdbf', .0449], ['#361905', .0079]],
      }),
      // 58° — terracotta, against the one teal in the set
      this.seedObj({
        key: 'courtyard', hash: '5b217989553d518d', age: 9 * H,
        name: 'Forged Midfield', arch: 'graphic',
        rat: 'Warm oranges sitting at mid weight, held to a single note. Plain and unhurried.',
        sw: [['#e2a779', .3819], ['#472f24', .2483], ['#19110e', .2014], ['#685a48', .0961], ['#9c7b60', .0723]],
      }),
      // 82° — gold
      this.seedObj({
        key: 'poppy', hash: '9f0f8f2c2b9d30f2', age: 26 * H,
        name: 'Scorched Clear Morning', arch: 'graphic',
        rat: 'Warm yellows lifted high, held to a single note. Airy and unforced.',
        sw: [['#e5e9eb', .5490], ['#664515', .1188], ['#c4b07b', .1132], ['#1e1506', .1109], ['#9d7b38', .1080]],
      }),
      // 128° — chartreuse
      this.seedObj({
        key: 'radish', hash: '4cae3f7a29e8ee24', age: 34 * H,
        name: 'High Key', arch: 'graphic',
        rat: 'Hues held to a single note: low-chroma greens, warm. Washed and quiet.',
        sw: [['#eae8dd', .7766], ['#b8cd79', .0814], ['#6c9429', .0557], ['#3c5e19', .0480], ['#1b2f0c', .0382]],
      }),
      // 98° — nominally olive, and the set's one achromatic: nothing in it is 0.04 from neutral.
      // Not hand-written. The image was put through this app's own extraction and the five swatches,
      // their weights, the name, the descriptors and the rationale are all what it returned, so the
      // seed is a real output of the tool rather than a designer's account of one. Checked against an
      // independent k-means over the same pixels: same five clusters in the same order, shares within
      // three points. The greys are the photograph, not a fault in the read — the sky is a dusty
      // steel blue in absolute terms and the motion blur averages the sand toward khaki.
      this.seedObj({
        key: 'stride', hash: 'a05fdec8e9bc48ac', age: 50 * H,
        name: 'Hard Gunmetal', arch: 'graphic',
        rat: 'Achromatic greys kept in shadow, sitting close together. Low and deliberate.',
        sw: [['#130e10', .3243], ['#50595b', .2236], ['#717c78', .1811], ['#3e312b', .1547], ['#a6a188', .1163]],
      }),
      // 238° — blue, carrying its own complement
      this.seedObj({
        key: 'court', hash: '480909a3cd5e5535', age: 74 * H,
        name: 'Midfield', arch: 'graphic',
        rat: 'Hues held to a single note: restrained blues, cool. Restrained and quietly atmospheric.',
        sw: [['#547b95', .4699], ['#0a2944', .1977], ['#678da4', .1890], ['#456b85', .1140], ['#d0d2c6', .0293]],
      }),
      // 263° — periwinkle
      this.seedObj({
        key: 'profile-sky', hash: 'b1fdb175587f7f09', age: 100 * H,
        name: 'Frozen Slate', arch: 'accented',
        rat: 'Cool blues sitting at mid weight, held to a single note, one blue carrying the only real colour. Even-tempered and workable.',
        sw: [['#6881ae', .3488], ['#8ca6d5', .3362], ['#000000', .2083], ['#090606', .0905], ['#383b49', .0162]],
      }),
    ];
  },
  relTime(ts) { const d = Date.now() - ts, m = d / 60000; if (m < 1) return 'just now'; if (m < 60) return Math.round(m) + 'm ago'; const h = m / 60; if (h < 24) return Math.round(h) + 'h ago'; return Math.round(h / 24) + 'd ago'; },
  // Absolute form for the SORTABLE date column: a sorted column needs values that differ, and
  // relative stamps collapse into ten identical "12M AGO"s within a session. Everything comes from
  // Intl under da-DK — including the same-day variant, which is ONE formatter carrying both date
  // and time parts, so even the joiner between them is the locale's, never a concatenated string.
  // (da-DK's own separators throughout: 14.06.26, and 14.32 for the clock.)
  //
  // ONE SHAPE FOR EVERY ROW. This used to switch formatter by age: date and clock for today's
  // entries, date alone for everything older — so a column of eight values held two different
  // shapes, and the eye had to parse each one before it could compare them. It is a Created column
  // in a table now, and a column whose values change shape row to row is not a column.
  //
  // The clock was there for a real reason and it keeps it: a date alone cannot tell this morning's
  // five generations apart, and this is the sort key. Carrying it on every row satisfies both, and
  // costs no layout at all — --row-time-ink was already sized for the longer variant, because a
  // column that only fits its narrowest value is a column that jitters.
  //
  // Relative time is not deleted — it survives as the secondary layer (title tooltip on the cell,
  // and the row's accessible name still says "Generated 3h ago").
  absTime(ts) {
    if (!this._dfDateTime) {
      this._dfDateTime = new Intl.DateTimeFormat('da-DK', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
    }
    return this._dfDateTime.format(new Date(ts));
  },

  // Downscaled reference thumbnail as a data URL — object URLs are session-only; this survives reload.
  // Display thumbnail: sized to the largest display context (universe card) × DPR, so the browser
  // downscales a large source instead of upscaling a small one. Persisted (survives reload).
  makeThumb(img, max) {
    const dpr = Math.min(3, Math.max(1, window.devicePixelRatio || 1));
    max = max || Math.round(320 * dpr);   // ~512px longest edge at 2× — comfortably covers a large card, ~30–60KB
    try {
      const w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
      if (!w || !h) return null;
      const scale = Math.min(1, max / Math.max(w, h));
      const tw = Math.max(1, Math.round(w * scale)), th = Math.max(1, Math.round(h * scale));
      const cv = document.createElement('canvas'); cv.width = tw; cv.height = th;
      cv.getContext('2d').drawImage(img, 0, 0, tw, th);
      return cv.toDataURL('image/jpeg', 0.82);
    } catch (e) { return null; }
  },

  // Session-only full-resolution display source. Prefer it over the persisted thumbnail while the
  // object URL is alive; after reload it's gone and display falls back to imageUrl (the thumbnail).
  // Seeded examples resolve last: a seed has no imageUrl to lose, and an uploaded palette must never
  // be able to fall through to a bundled picture that isn't its reference.
  dispUrl(p) { return (p && (p._srcUrl || p.imageUrl)) || this.exampleUrl(p); },
  hasImg(p) { return !!((p && (p._srcUrl || p.imageUrl)) || this.exampleUrl(p)); },

  // ---- how much room a swatch is owed, and the imageless palette's stand-in ----
  // One rule for the share a swatch takes, read by every surface that draws one: the list row's
  // strip, the detail's bands, the grid tile's band, and the 3D card's. The floor keeps a 1%
  // accent visible as a sliver rather than a hairline; `proportional: false` flattens the lot.
  swatchGrow(b) { return (this.props.proportional ?? true) ? Math.max(b.weight, 0.06) : 1; },
  // The gradient a palette wears when it has no reference image. Stops land on each swatch's
  // cumulative MIDPOINT, so a colour holding 40% of the palette holds 40% of the field — the same
  // proportional reading its band gives it everywhere else. Spacing the stops evenly by index, as
  // both fallbacks used to, drew every palette as equal fifths, which is the one thing no palette is.
  paletteStops(p) {
    const sw = (p && p.swatches) || []; if (!sw.length) return '';
    const tot = sw.reduce((a, b) => a + this.swatchGrow(b), 0) || 1;
    let run = 0;
    return sw.map((b) => { const share = this.swatchGrow(b) / tot, mid = run + share / 2; run += share; return b.hex + ' ' + Math.round(mid * 100) + '%'; }).join(', ');
  },

  // ================= processing canvas: the atmosphere's floor =================
  // The 2D beat below is the floor; the landing's field, colourless and floating, arrives over it
  // (procField.js).
  startCanvas() {
    const cv = this.canvasRef.current, pal = this.state.pending;
    if (!cv || !pal) return;
    const W = 380, H = 250, dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = W * dpr; cv.height = H * dpr;
    const ctx = cv.getContext('2d'); ctx.scale(dpr, dpr);
    const reduce = this._reduce;
    /* THE EXTRACTION BAR DRAWS, IT DOES NOT GROW. This was the one bar in the product animating
       `width` — the loader's does scaleX (loader.js), and so do the result's meta rules
       (motion.js) — and scaleX is composited, so the draw costs nothing while the work that matters
       is happening. It is filled by the reading itself now (_readBar), step by step, so it starts
       empty here and never reaches the end before the reading does. */
    if (window.gsap && this.progRef.current) { window.gsap.killTweensOf(this.progRef.current); window.gsap.set(this.progRef.current, { scaleX: 0, transformOrigin: '0% 50%' }); }
    /* THE FLOOR (procField.js). Neutral blobs turning inside a soft ellipse the size of the disc: no
       ground, no photograph and no palette colour, for the same reasons the atmosphere has none. It
       shows where the field cannot, and `floor.v` is how much of it is drawn: 0 while the field is
       expected, 1 when it is not or is slow to arrive, and eased between the two by procField.js.
       `dirty` asks for one repaint of a frame that is otherwise standing still.
       Until 17.09.26 this was the photograph's blur at 26% under five multiply blobs in the palette's
       own colours, filling a ruled 380x250 box.
       ONE CHAIN, WITH A SWITCH. The first call used to schedule a frame and the line after it scheduled
       a second, so two loops ran from the start and stopCanvas could only cancel whichever had asked
       last: every generation left one loop behind, drawing into a detached canvas for the rest of the
       visit. `run.on` ends the chain however many frames are pending. There is no document.hidden
       check any more either: a hidden page does not run frame callbacks, and the check ended the loop
       for good the first time one was scheduled while hidden. */
    const floor = this._procFloor = { v: 0, dirty: true };
    const run = this._procRun = { on: true };
    const shape = this._procFloorShape();
    // Five blobs round a ring the size of the gas, turning at the field's own tempo, so even the floor
    // has the eye in the middle and reads as the same object.
    const turn0 = Math.random() * 6.2832, spin = 6.2832 / this._procFloorShape().rotSecs;
    const fr = this._procFloorShape().floorRx;
    const blobs = [0, 1, 2, 3, 4].map((i) => ({ g: i % 3, at: turn0 + i * 1.2566, r: fr * (0.34 + Math.random() * 0.14), wob: Math.random() * 6.28, rp: Math.random() * 6.28, rs: 0.2 + Math.random() * 0.25 }));
    const t0 = performance.now();
    const paint = (t) => {
      ctx.clearRect(0, 0, W, H);
      // Rounded, because an easing tail reaches values like 3e-7 and addColorStop throws on a colour
      // written in exponent notation, which would end the chain mid-dissolve.
      const a = Math.round(50 * floor.v) / 100;
      if (a <= 0) return;
      const greys = this._procGreys();
      blobs.forEach((b) => {
        const th = b.at + t * spin, k = 0.62 + (reduce ? 0 : Math.sin(t * 0.5 + b.wob) * 0.06);
        const x = W / 2 + Math.cos(th) * shape.floorRx * k;
        const y = H / 2 + Math.sin(th) * shape.floorRy * k;
        const rr = b.r * (reduce ? 1 : (1 + Math.sin(t * b.rs + b.rp) * 0.22));
        const g = ctx.createRadialGradient(x, y, 0, x, y, rr);
        g.addColorStop(0, this.hexA(greys[b.g], a)); g.addColorStop(1, this.hexA(greys[b.g], 0));
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, rr, 0, 6.2832); ctx.fill();
      });
      // The soft edge: everything outside the disc's footprint thins to nothing, so the floor ends on
      // its own the way the gas does.
      ctx.save();
      ctx.globalCompositeOperation = 'destination-in';
      ctx.translate(W / 2, H / 2); ctx.scale(shape.floorRx, shape.floorRy);
      const m = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
      m.addColorStop(0, 'rgba(0,0,0,1)'); m.addColorStop(0.45, 'rgba(0,0,0,1)'); m.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = m; ctx.fillRect(-W / shape.floorRx, -H / shape.floorRy, 2 * W / shape.floorRx, 2 * H / shape.floorRy);
      ctx.restore();
    };
    const draw = (now) => {
      if (!run.on) return;
      if ((!reduce && floor.v > 0) || floor.dirty) { floor.dirty = false; paint(reduce ? 0 : (now - t0) / 1000); }
      this._raf = requestAnimationFrame(draw);
    };
    draw(t0);
    this._procFieldStart(pal);
  },
  stopCanvas() {
    if (this._procRun) { this._procRun.on = false; this._procRun = null; }
    if (this._raf) { cancelAnimationFrame(this._raf); this._raf = null; }
    this._procFieldStop();
  },

  // ================= interaction =================
  // New Generation is the inverse of the generation reveal: the result recedes DOWNWARD
  // (reverse of the bottom-to-top entry), then the upload surface rises in a beat later.
  doReset(opts) {
    const o = opts || {};
    const g = window.gsap, root = this.resultRef.current;
    /* `sharedView:false` IS PART OF THE RESET, and leaving it out was a flag outliving its palette.
       The flag means "the thing in `current` came from a link and is not in your Library", so it is
       only ever true ABOUT `current` — and this line sets `current` to null. Left set it went stale
       in two directions: below the supported minimum `_mobileShare()` reads
       `sharedView && current` (it also read exampleView until 17.09.26), so the read-only surface vanished and the story took
       its place while the flag insisted a shared palette was still open; on the desktop it survived
       into the NEXT generated palette, which would then be offered a "save this to your Library"
       prompt for a palette the pipeline had already saved. makeOwnFromShared has always cleared it
       one line before calling this, which is the same fix applied at the one call site that
       remembered — this moves it to the reset itself, where every caller gets it.
       The hash is deliberately NOT dropped here: the address still names that palette, and a reload
       giving you what the URL says is not a fault. The two paths that mean "I am done with this
       link" — makeOwnFromShared and returnToGateOnPhone — call _clearShareHash themselves. */
    // animateUploadIn runs IN the commit callback, not a frame later: React has committed the
    // upload stage but nothing has painted yet, and a fromTo writes its start values at once, so
    // the dropzone is never on screen at rest before it arrives. The rAF that used to sit here
    // gave it exactly one painted frame at full opacity before the tween took it back to zero.
    const commit = () => { this._genId = (this._genId || 0) + 1; this.stopCanvas(); this._resultFrom = null; this.setState({ stage: 'upload', current: null, imageUrl: null, sharedView: false, announce: o.announce || 'Ready for a new reference image.' }, () => { this.animateUploadIn(); if (o.after) try { o.after(); } catch (e) { } }); };
    if (this._reduce || !g || !root || this.state.stage !== 'result' || document.hidden) { commit(); return; }
    const bands = [...root.querySelectorAll('[data-band]')];
    const fx = [...root.querySelectorAll('[data-fx]')];
    let done = false; const go = () => { if (done) return; done = true; commit(); };
    clearTimeout(this._resetGuard); this._resetGuard = setTimeout(go, this.DUR.reveal * 1000 + 220);
    try {
      if (fx.length) g.to(fx, { opacity: 0, y: 8, duration: this.DUR.state, ease: this.EASE.exit, stagger: .03 });
      if (bands.length) {
        /* THE ARRIVAL CROSSES THE EXIT. The stage used to swap only when the last band had finished
           sinking — its onComplete, plus the stagger tail — and the dropzone mounted into a stage
           that had been empty for a beat. Measured: bands gone at 600ms, "Start here" at 718ms, a
           tenth of a second of nothing between two things that should overlap. Every other arrival
           on the site crosses its exit; this one queued behind it.
           So the swap is scheduled at 0.8 of the exit's length, and the result's root fades over the
           last stretch before it, so whatever a lagging band still shows at the cut is already
           transparent: the stage can be unmounted mid-tween without a visible pop, and the dropzone
           rises while the palette's tail is still leaving. The bands' onComplete and the guard
           timer stay as the fallbacks they were. */
        const total = this.DUR.reveal * 0.8 + this.DUR.stagger * (bands.length - 1);
        /* INSIDE THE PRESS'S HALF SECOND. The swap shortens the page, because the result is taller
           than the dropzone, and that pulls the Library up into view. A layout shift more than 500ms
           after the input that caused it counts against the page, and at 0.8 of the exit five bands
           put the swap at about 560ms: the returning reader's only layout shift (0.068, the whole
           Library section) was this one. So the cut is capped at 380ms, and the root's fade keeps its
           proportions to the cut, so the stage is still transparent when it unmounts. With more
           bands the sink simply has less of its tail left to show. */
        const cut = Math.min(total * 0.8, 0.38);
        g.to(bands, { clipPath: 'inset(100% 0 0 0)', duration: this.DUR.reveal * 0.8, ease: this.EASE.exit, stagger: this.DUR.stagger, onComplete: go });
        g.to(root, { opacity: 0, duration: cut * 0.375, ease: this.EASE.exit, delay: cut * 0.625 });
        g.delayedCall(cut, go);
      }
      else go();
    } catch (e) { go(); }
  },
  /* NEW PALETTE, THE BAR'S FILLED ACTION, ON THE CREATE PAGE IN EVERY STATE (15.09.26, by request).
     It used to exist only while there was something to reset. Now it always starts a palette: from a
     result, an error or a generation still running it runs the reset back to the dropzone, as it did;
     on the dropzone itself it opens the file picker, the same act as "Start here" (onBrowse). The input
     is clicked inside the press, because a picker opened any later than the gesture is refused.
     FROM ANYWHERE DOWN THE LIBRARY it also brings the page back to the top, where both of those happen.
     The bar floats, so the button is in reach far down the list, and a reset that plays out above the
     viewport is a press that looks dead. Same glide as the return to a row. */
  /* ONE RESET PER PRESS. The button used to leave on the press, and that was its double-click guard:
     a second click landed on nothing. It stays now, so a second click would start doReset again
     halfway through the first: two sinks on the same bands and two commits, the dropzone's arrival
     restarted mid-rise. The lock holds until the reset has landed, and a timer on doReset's own
     guard length lets go regardless, so the button can never be left dead. */
  newPalette() {
    if (this._npLock) return;
    if (this.state.stage === 'upload') { this._procFieldIntent(); if (this.fileRef.current) this.fileRef.current.click(); }
    else {
      this._npLock = true;
      clearTimeout(this._npLockT);
      const free = () => { this._npLock = false; clearTimeout(this._npLockT); };
      this._npLockT = setTimeout(free, this.DUR.reveal * 1000 + 260);
      this.doReset({ after: free });
    }
    if (window.scrollY > 1) this._glideToY(0);
  },
  /* CLOSE, as distinct from New palette — reached by Escape in the result stage (PaletteApp). A
     masthead close mark stood beside New palette for a day and was removed by request. A palette
     opened from a library row leaves by the same exit New palette runs (doReset's sink and the
     dropzone's arrival cross exactly as before), and then the viewport goes back to the row the
     palette came from and focus lands on it: the reader is returned to the choice they were
     making. A palette with no row behind it — one just generated, or a shared link — has nowhere
     to return to, so Close there is New palette by another name. */
  closeResult() {
    const from = this._resultFrom;
    if (!from) { this.doReset(); return; }
    this.doReset({ announce: 'Closed the palette. Back at the library.', after: () => this._returnToRow(from) });
  },
  // The scroll runs as the stage swaps — the dropzone rising above and the library arriving under
  // the pointer are one movement — through Lenis when it owns the page, on the reveal's length and
  // curve. Focus follows once the row has stopped moving, preventScroll so the browser cannot
  // second-guess the position the scroll just chose.
  _returnToRow(id) {
    const row = document.querySelector('[data-list-wrap] [data-rowid="' + id + '"]');
    const anchor = row || document.querySelector('#library-list');
    if (!anchor) return;
    const HEAD = 96;   // the sticky masthead, and a breath under it
    const y = Math.max(0, anchor.getBoundingClientRect().top + window.scrollY - HEAD);
    const hit = row ? row.querySelector('[data-row-hit]') : null;
    this._glideToY(y, () => { if (hit) try { hit.focus({ preventScroll: true }); } catch (e) { } });
  },
  // The glide itself, shared with New Palette's return to the top: through Lenis when it owns the
  // page, on the reveal's length and curve; instant under reduced motion.
  _glideToY(y, land) {
    const done = land || (() => { });
    const g = window.gsap;
    if (this._reduce) { try { this._scrollToY(y); } catch (e) { window.scrollTo(0, y); } done(); return; }
    try {
      if (this._lenis) { this._lenis.scrollTo(y, { duration: this.DUR.reveal, force: true, onComplete: done }); return; }
      if (g && g.plugins && g.plugins.scrollTo) { g.to(window, { scrollTo: { y, autoKill: false }, duration: this.DUR.reveal, ease: this.EASE.entrance, onComplete: done }); return; }
    } catch (e) { }
    window.scrollTo(0, y); done();
  },
  /* THE UPLOAD SURFACE ARRIVES the way it does on the very first visit: the dropzone rises and
     fades in, and "Start here" with its two lines comes up through the same line masks the landing
     statement uses. Both halves were missing here for a while. The zone was looked up by an
     aria-label that had been renamed to "Choose image" (ff42660), so the query returned nothing and
     this returned early — the dropzone popped in at rest. And the lines are behind a one-shot latch
     (_dropRevealed, loader.js) that only the landing path ever reset, so even with the zone found
     the copy would have faded as a block. The latch is released here: a reset IS a fresh arrival of
     this surface. */
  animateUploadIn() {
    const g = window.gsap; if (!g || document.hidden) return;
    const zone = document.querySelector('main button[aria-label^="Choose image"]');
    if (!zone) return;
    if (this._reduce) { g.fromTo(zone, { opacity: 0 }, { opacity: 1, duration: this.DUR.swap, ease: 'none' }); return; }   // opacity crossfade only
    g.fromTo(zone, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: this.DUR.reveal, ease: this.EASE.entrance, clearProps: 'transform' });
    this._dropRevealed = false;
    try { this._dropLinesReveal(g); } catch (e) { }
  },
  // ---- re-upload recognition -------------------------------------------------------------------
  // Same dialog family as move-to-project: backdrop, aria-modal, the shared focus trap, the shared
  // in/out transition. The pending image is parked on the instance rather than in state — it is an
  // Image element and a blob URL, not view data — and is disposed of on whichever way the user
  // leaves, so a declined re-upload leaks nothing and stores nothing.
  openRecognised(matches, img, opts, hash) {
    this._recogBack = document.activeElement;
    this._recogPending = { img, opts: opts || {}, hash };
    const newest = matches.slice().sort((a, b) => (b.time || 0) - (a.time || 0))[0];
    this.setState({
      recognised: { palette: newest, count: matches.length },
      announce: 'This image has already been extracted as ' + newest.name + '. Choose whether to open it or extract a variation.',
    }, () => {
      // Focus moves in the setState callback, NOT inside the rAF: the DOM is already committed
      // here, and rAF is throttled to nothing while a tab is hidden. Deferring focus to a frame
      // that may never arrive would leave a modal open with focus stranded on <body> — keyboard
      // users would tab from the top of the page into a dialog they cannot see the start of.
      // The frame is still the right place for the transition, which genuinely needs layout.
      const d = document.querySelector('[data-recognise-dialog]');
      if (d) { const b = d.querySelector('button'); if (b) try { b.focus(); } catch (e) { } }
      requestAnimationFrame(() => this._dialogIn('[data-recognise-dialog]'));
    });
  },
  // Every exit routes through here, so the pending image cannot survive the dialog by any path.
  _closeRecognised(after) {
    const back = this._recogBack, pending = this._recogPending;
    this._dialogOut('[data-recognise-dialog]', () => this.setState({ recognised: null }, () => {
      this._recogPending = null;
      if (after) after(pending);
      else {
        if (pending && pending.opts && pending.opts.srcUrl) { try { URL.revokeObjectURL(pending.opts.srcUrl); } catch (e) { } }
        if (back && back.focus) try { back.focus(); } catch (e) { }
      }
    }));
  },
  // Declining is a real outcome, not a dead end: nothing is created and the archive is untouched.
  closeRecognised() { const n = this.state.recognised; const nm = n && n.palette ? n.palette.name : ''; this._closeRecognised(); this.setState({ announce: 'Kept the existing palette' + (nm ? ' ' + nm : '') + '. Nothing new was created.' }); },
  recogniseOpen() {
    const p = this.state.recognised && this.state.recognised.palette;
    this._closeRecognised((pending) => {
      if (pending && pending.opts && pending.opts.srcUrl) { try { URL.revokeObjectURL(pending.opts.srcUrl); } catch (e) { } }
      if (p) this.openFromFeed(p, null);
    });
  },
  // The ONLY path that sets deliberate. A second entry for the same image now requires the user to
  // have read the sentence saying one already exists and to have chosen this anyway.
  recogniseVariation() {
    this._closeRecognised((pending) => {
      if (!pending || !pending.img) return;
      this._runPipeline(pending.img, Object.assign({}, pending.opts, { deliberate: true }));
    });
  },

  openFromFeed(p, cardEl) {
    if (this.state.stage === 'result' && this.state.current && this.state.current.id === p.id) return;
    if (!this._reduce && window.gsap && cardEl) {
      const strip = cardEl.querySelector('[data-strip]');
      this._fromRects = strip ? [...strip.children].map((c) => c.getBoundingClientRect()) : null;
    } else { this._fromRects = null; }
    this.setState({ stage: 'result', current: p, imageUrl: this.dispUrl(p), announce: 'Showing palette: ' + p.name + '. ' + this.tagsSpoken(p) + '.' });
  },
  onGridKey(e) {
    const nav = ['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
    if (nav.indexOf(e.key) < 0) return;
    const grid = this.gridRef.current; if (!grid) return;
    // Arrow navigation applies to the canonical LIST only; the universe uses Tab + auto-centre.
    if (this.state.feedView !== 'list') return;
    const cards = [...grid.querySelectorAll('button[data-feed]')].filter((b) => !b.disabled && b.offsetParent !== null);
    const idx = cards.indexOf(document.activeElement);
    if (idx < 0) return;
    e.preventDefault();
    let n = idx;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = Math.min(idx + 1, cards.length - 1);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = Math.max(idx - 1, 0);
    else if (e.key === 'Home') n = 0;
    else if (e.key === 'End') n = cards.length - 1;
    if (cards[n]) cards[n].focus();
  },
};
