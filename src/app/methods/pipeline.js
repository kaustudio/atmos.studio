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
      this.showError('That file isn’t an image', 'Upload a JPG, PNG, WEBP, or GIF — this tool reads colour from picture files only.'); return;
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

  // Returns { cents, hash }. The hash is taken over the NORMALISED working buffer — the same 72x72
  // RGBA the extraction itself reads — so identity and measurement are computed from exactly the
  // same bytes. Hashing the file instead would make a rename or an EXIF strip look like a new
  // image, and would tie identity to something extraction never looks at.
  extract(img) {
    const k = this.props.swatchCount || 5, W = 72, H = 72;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d'); ctx.drawImage(img, 0, 0, W, H);
    const d = ctx.getImageData(0, 0, W, H).data, pts = [];
    const hash = hashBytes(d);
    // Fixed stride, raster order, whole buffer — never a sampled subset. Already true before this
    // deploy; stated here because it is now load-bearing rather than incidental.
    for (let i = 0; i < d.length; i += 4) { if (d[i + 3] < 128) continue; pts.push(this.rgb2oklab(d[i] / 255, d[i + 1] / 255, d[i + 2] / 255)); }
    if (pts.length < k) return { cents: [], hash };
    return { cents: this.kmeans(pts, k), hash };
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
    if (typeof e.name !== 'string' || !Array.isArray(e.descriptors)) return null;
    return { name: e.name, descriptors: e.descriptors.filter((d) => typeof d === 'string'), rationale: typeof e.rationale === 'string' ? e.rationale : '', archetype: typeof e.archetype === 'string' ? e.archetype : 'interpreted' };
  },
  cacheReading(hash, it) {
    if (!hash || !it) return;
    try {
      const e = this._readCache();
      if (e[hash]) return;                      // first derivation wins, permanently
      e[hash] = { name: it.name, descriptors: it.descriptors, rationale: it.rationale, archetype: it.archetype, at: Date.now() };
      const keys = Object.keys(e);
      if (keys.length > this.CACHE_MAX) {       // oldest-first eviction, so the cap can't grow unbounded
        keys.sort((a, b) => (e[a].at || 0) - (e[b].at || 0)).slice(0, keys.length - this.CACHE_MAX).forEach((k) => { delete e[k]; });
      }
      localStorage.setItem(this.CACHE_KEY, JSON.stringify({ v: 1, e }));
    } catch (err) { /* quota or private mode — the reading is still deterministic without the cache */ }
  },

  buildPalette(cents, url, srcUrl, hash) {
    const swatches = cents.map((c) => { const rgb = this.oklab2rgb(c.L, c.a, c.b); return { hex: this.hex(rgb[0], rgb[1], rgb[2]), weight: c.weight, L: c.L, a: c.a, b: c.b }; });
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
    const pal = { id: hash + '-' + variation, hash, variation, imageUrl: url, time: Date.now(), name: it.name, descriptors: it.descriptors, rationale: it.rationale, archetype: it.archetype, projectId: active, swatches };
    if (srcUrl && srcUrl !== url) Object.defineProperty(pal, '_srcUrl', { value: srcUrl, enumerable: false, writable: true, configurable: true }); // non-enumerable so it never gets persisted
    return pal;
  },

  processFile(file) {
    const url = URL.createObjectURL(file); const img = new Image();
    img.onerror = () => { this.showError('We couldn’t open that image', 'The file may be corrupted or in a format the browser can’t decode. Try another image.'); };
    img.onload = () => {
      this._runPipeline(img, { srcUrl: url });         // keep the full-res object URL alive for crisp in-session display
    };
    img.src = url;
  },
  _runPipeline(img, opts) {
    opts = opts || {};
    this._procImg = img;
    let cents = [], hash = null;
    try { const r = this.extract(img); cents = r.cents; hash = r.hash; } catch (e) { cents = []; }
    if (!cents.length) { if (opts.srcUrl) { try { URL.revokeObjectURL(opts.srcUrl); } catch (e) { } } this.showError('We couldn’t read enough colour', 'This image didn’t yield a stable palette — try a photo with more visible tone and detail.'); return; }
    // RECOGNITION GATE. Now that identity is content-addressed, an image the archive has already
    // read is a fact we can state instead of a duplicate we silently manufacture. The extraction
    // above has already run — it is 5184 pixels and costs nothing — but nothing is committed, so
    // stopping here creates no entry. Only opts.deliberate gets past, and the only thing that sets
    // it is the user choosing "create a variation" in the dialog.
    if (hash && !opts.deliberate) {
      const known = (this.state.feed || []).filter((p) => p && p.hash === hash);
      if (known.length) { this.openRecognised(known, img, opts, hash); return; }
    }
    const thumb = this.makeThumb(img);                // display-sized thumbnail (×DPR) — persisted, survives reload
    const srcUrl = opts.srcUrl || null;                 // full-res object URL — session-only crisp display
    if (srcUrl) { (this._objUrls = this._objUrls || []).push(srcUrl); }   // revoke on eviction/unload, not now
    const pal = this.buildPalette(cents, thumb, srcUrl, hash); // mock interpretation baked in as the guaranteed baseline
    const myGen = ++this._genId;                       // invalidate any in-flight interpretation from a prior generate
    this.setState({ stage: 'processing', imageUrl: this.dispUrl(pal), procStep: 0, pending: pal, selectedSwatch: null, announce: 'Generating palette from your image.' });
    if (this._t) clearInterval(this._t);
    this._t = setInterval(() => this.setState((st) => ({ procStep: Math.min(st.procStep + 1, 3) })), 620);
    if (this._end) clearTimeout(this._end);
    // Completion is driven by the real interpretation lifecycle (live call or its fallback), not a fixed timer.
    this.runInterpretation(pal, thumb, myGen);
  },
  // Live interpretation over the guaranteed local baseline. Whatever resolves first (a valid live
  // reading, or the timeout → mock) commits the palette. A minimum beat keeps the branded moment
  // from flashing on a fast response.
  async runInterpretation(pal, thumb, myGen) {
    const MIN = this._reduce ? 500 : 1300, TIMEOUT = 9000, started = Date.now();
    let interp = null, errored = false;
    try { interp = await this.withTimeout(this.interpretLive(thumb, pal.swatches), TIMEOUT); }
    catch (e) { interp = null; errored = true; }
    if (myGen !== this._genId) return;   // superseded by a newer generate (or reset) → drop this result
    const finalPal = interp
      ? Object.assign({}, pal, { name: interp.name, descriptors: interp.descriptors, rationale: interp.rationale, archetype: interp.archetype || pal.archetype })
      : pal;
    const wait = Math.max(0, MIN - (Date.now() - started));
    clearTimeout(this._end);
    this._end = setTimeout(() => this.commitGenerated(finalPal, myGen, !interp, errored), wait);
  },
  // noLive = no live reading was applied (can't-attempt OR error) → silent data flag (pal.fallback).
  // errored = a live attempt genuinely failed → the only case that surfaces the unreachable notice.
  commitGenerated(pal, myGen, noLive, errored) {
    if (myGen !== this._genId) return;
    if (this._t) clearInterval(this._t);
    // fallback = "no live reading applied", for any reason (standalone runtime or error). Silent data honesty:
    // persists (round-trips through validation) and enables a future "Another reading". The notice below is
    // reserved for genuine failures, so a standalone build never surfaces it on every generation.
    pal.fallback = !!noLive;
    this.setState((st) => ({ stage: 'result', current: pal, feed: [pal, ...st.feed], pending: null, announce: 'Palette generated: ' + pal.name + '. Mood: ' + pal.descriptors.join(', ') + '.' }), () => this.persist({ immediate: true }));
    if (errored) this.showNotice('Interpreted with the local reading — the live interpreter was unreachable.');
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
  showNotice(msg) {
    if (this._noticeT) clearTimeout(this._noticeT);
    this.setState({ notice: msg }, () => this._noticeIn());
    this._noticeT = setTimeout(() => this._dismissNotice(), 5000);
  },
  _noticeIn() { const g = window.gsap; if (this._reduce || !g) return; const el = document.querySelector('[data-notice]'); if (el) g.from(el, { opacity: 0, y: 14, duration: this.DUR.state, ease: this.EASE.entrance, clearProps: 'transform' }); },
  _dismissNotice() { const g = window.gsap; const el = document.querySelector('[data-notice]'); const clear = () => this.setState({ notice: null }); if (this._reduce || !g || !el) { clear(); return; } g.to(el, { opacity: 0, y: 14, duration: this.DUR.state, ease: this.EASE.exit, onComplete: clear }); },

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
  // 128 / 164 / 238 / 263 degrees, which is as much of the wheel as eight real photographs can hold:
  // red through orange, gold and chartreuse into green, then two blues. The gaps are the source
  // material's, not an oversight — there is no magenta and no clean cyan to be had, so the arc from
  // 263 back round to 30 is empty. Two of these carry their own opposition (papaya on green, yellow
  // balls on a blue court), which is what keeps the middle of the set from reading as one long warm
  // run the way an earlier eight did.
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
    'papaya': '/assets/examples/papaya.webp',
    'court': '/assets/examples/court.webp',
    'profile-sky': '/assets/examples/profile-sky.webp',
  },
  // hasOwnProperty, not a bare lookup: 'constructor' and friends are inherited keys that would
  // otherwise resolve to a truthy non-string and end up interpolated into a url().
  exampleUrl(p) {
    const k = p && p.example === true && p.exampleKey;
    return (typeof k === 'string' && Object.prototype.hasOwnProperty.call(this.EXAMPLE_SRC, k)) ? this.EXAMPLE_SRC[k] : '';
  },
  seedObj(s) {
    const swatches = s.sw.map((e) => { const rgb = this.hexToRgb(e[0]); const lab = this.rgb2oklab(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255); return { hex: e[0], weight: e[1], L: lab.L, a: lab.a, b: lab.b }; });
    // id follows the generated form (hash + variation) rather than a name, so a seed and a re-read
    // of the same image are the same identity in every place identity is compared.
    return { id: s.hash + '-0', hash: s.hash, variation: 0, imageUrl: null, exampleKey: s.key, time: Date.now() - s.age, name: s.name, descriptors: s.desc, rationale: s.rat, archetype: s.arch, example: true, swatches };
  },
  makeSeed() {
    const H = 3600e3;
    return [
      // 30° — red
      this.seedObj({
        key: 'profile-ember', hash: 'f757f5916e3a11e5', age: 8 * 60e3,
        name: 'Garnet', desc: ['Low-lit', 'Warm', 'Saturated', 'Graphic'], arch: 'graphic',
        rat: 'Warm, saturated reds kept in shadow split by stark contrast — shadowed but legible.',
        sw: [['#0f0302', .3609], ['#e12409', .2392], ['#f17645', .1454], ['#aa0906', .1416], ['#540604', .1128]],
      }),
      // 44° — orange
      this.seedObj({
        key: 'tulip', hash: 'ff280e7420bfb244', age: 3 * H,
        name: 'Dry Season', desc: ['Stark', 'Warm', 'Saturated', 'Graphic'], arch: 'graphic',
        rat: 'Saturated reds sitting at mid weight, sitting close together — even-tempered and workable.',
        sw: [['#a74b1b', .4919], ['#933913', .3580], ['#ab8766', .0972], ['#d5cdbf', .0449], ['#361905', .0079]],
      }),
      // 58° — terracotta, against the one teal in the set
      this.seedObj({
        key: 'courtyard', hash: '5b217989553d518d', age: 9 * H,
        name: 'Forged Midfield', desc: ['Warm', 'Stark', 'Monochrome'], arch: 'graphic',
        rat: 'Warm oranges sitting at mid weight, held to a single note — plain and unhurried.',
        sw: [['#e2a779', .3819], ['#472f24', .2483], ['#19110e', .2014], ['#685a48', .0961], ['#9c7b60', .0723]],
      }),
      // 82° — gold
      this.seedObj({
        key: 'poppy', hash: '9f0f8f2c2b9d30f2', age: 26 * H,
        name: 'Scorched Clear Morning', desc: ['Stark', 'Bright', 'Warm', 'Graphic'], arch: 'graphic',
        rat: 'Warm yellows lifted high, held to a single note — airy and unforced.',
        sw: [['#e5e9eb', .5490], ['#664515', .1188], ['#c4b07b', .1132], ['#1e1506', .1109], ['#9d7b38', .1080]],
      }),
      // 128° — chartreuse
      this.seedObj({
        key: 'radish', hash: '4cae3f7a29e8ee24', age: 34 * H,
        name: 'High Key', desc: ['Stark', 'Pale', 'Monochrome', 'Graphic'], arch: 'graphic',
        rat: 'Hues held to a single note: low-chroma greens, warm — washed and quiet.',
        sw: [['#eae8dd', .7766], ['#b8cd79', .0814], ['#6c9429', .0557], ['#3c5e19', .0480], ['#1b2f0c', .0382]],
      }),
      // 164° — green, carrying its own complement
      this.seedObj({
        key: 'papaya', hash: '1e83a904f39350e0', age: 50 * H,
        name: 'Ruled Open Country', desc: ['Even', 'Varied', 'Anchored'], arch: 'neutral',
        rat: 'One colour carrying the frame: saturated tones with clear structure between them — restrained and quietly atmospheric.',
        sw: [['#1b6d4e', .7556], ['#221d14', .0797], ['#c05118', .0637], ['#d17827', .0507], ['#903215', .0503]],
      }),
      // 238° — blue, carrying its own complement
      this.seedObj({
        key: 'court', hash: '480909a3cd5e5535', age: 74 * H,
        name: 'Midfield', desc: ['Stark', 'Cool', 'Monochrome'], arch: 'graphic',
        rat: 'Hues held to a single note: restrained blues, cool — restrained and quietly atmospheric.',
        sw: [['#547b95', .4699], ['#0a2944', .1977], ['#678da4', .1890], ['#456b85', .1140], ['#d0d2c6', .0293]],
      }),
      // 263° — periwinkle
      this.seedObj({
        key: 'profile-sky', hash: 'b1fdb175587f7f09', age: 100 * H,
        name: 'Frozen Slate', desc: ['Restrained', 'Cool', 'Stark', 'Graphic'], arch: 'accented',
        rat: 'Cool blues sitting at mid weight, held to a single note, one blue carrying the only real colour — even-tempered and workable.',
        sw: [['#6881ae', .3488], ['#8ca6d5', .3362], ['#000000', .2083], ['#090606', .0905], ['#383b49', .0162]],
      }),
    ];
  },
  relTime(ts) { const d = Date.now() - ts, m = d / 60000; if (m < 1) return 'just now'; if (m < 60) return Math.round(m) + 'm ago'; const h = m / 60; if (h < 24) return Math.round(h) + 'h ago'; return Math.round(h / 24) + 'd ago'; },
  // Absolute form for the SORTABLE date column: a sorted column needs values that differ, and
  // relative stamps collapse into ten identical "12M AGO"s within a session. Everything comes from
  // Intl under da-DK — including the same-day variant, which is ONE formatter carrying both date
  // and time parts, so even the joiner between them is the locale's, never a concatenated string.
  // (da-DK's own separators throughout: 14.06.26, and 14.32 for the clock.) Same-day entries carry
  // the clock because a date alone cannot distinguish this morning's five generations.
  // Relative time is not deleted — it survives as the secondary layer (title tooltip on the cell,
  // and the row's accessible name still says "Generated 3h ago").
  absTime(ts) {
    if (!this._dfDate) {
      this._dfDate = new Intl.DateTimeFormat('da-DK', { day: '2-digit', month: '2-digit', year: '2-digit' });
      this._dfDateTime = new Intl.DateTimeFormat('da-DK', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
    }
    const d = new Date(ts), now = new Date();
    const sameDay = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
    return (sameDay ? this._dfDateTime : this._dfDate).format(d);
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

  // ================= processing canvas (branded colour-diffusion beat) =================
  drawCover(ctx, img, W, H) {
    const ir = img.width / img.height, r = W / H; let w, h, x, y;
    if (ir > r) { h = H; w = H * ir; x = (W - w) / 2; y = 0; } else { w = W; h = W / ir; x = 0; y = (H - h) / 2; }
    ctx.drawImage(img, x, y, w, h);
  },
  startCanvas() {
    const cv = this.canvasRef.current, pal = this.state.pending;
    if (!cv || !pal) return;
    const W = 380, H = 250, dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = W * dpr; cv.height = H * dpr;
    const ctx = cv.getContext('2d'); ctx.scale(dpr, dpr);
    const __SURF__ = (getComputedStyle(document.documentElement).getPropertyValue('--surface') || '').trim() || '#f5f5f3';
    let off = null;
    if (this._procImg) { off = document.createElement('canvas'); off.width = W; off.height = H; const o = off.getContext('2d'); o.filter = 'blur(24px)'; this.drawCover(o, this._procImg, W, H); o.filter = 'none'; }
    const blobs = pal.swatches.map((s) => ({ hex: s.hex, x: W * (0.2 + 0.6 * Math.random()), y: H * (0.2 + 0.6 * Math.random()), r: 100 + Math.random() * 70, px: Math.random() * 6.28, py: Math.random() * 6.28, sp: 0.3 + Math.random() * 0.4, rp: Math.random() * 6.28, rs: 0.2 + Math.random() * 0.25 }));
    const reduce = this._reduce;
    if (window.gsap && this.progRef.current) { window.gsap.fromTo(this.progRef.current, { width: '0%' }, { width: '92%', duration: (reduce ? 0.8 : 7.5), ease: 'power2.out' }); }
    const t0 = performance.now();
    const draw = (now) => {
      const t = reduce ? 0 : (now - t0) / 1000;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = __SURF__; ctx.fillRect(0, 0, W, H);
      if (off) { ctx.globalAlpha = 0.26; ctx.drawImage(off, 0, 0); ctx.globalAlpha = 1; }
      ctx.globalCompositeOperation = 'multiply';
      blobs.forEach((b) => {
        const ox = reduce ? 0 : Math.cos(t * b.sp + b.px) * 52;
        const oy = reduce ? 0 : Math.sin(t * b.sp + b.py) * 38;
        const rr = b.r * (reduce ? 1 : (1 + Math.sin(t * b.rs + b.rp) * 0.22));
        const g = ctx.createRadialGradient(b.x + ox, b.y + oy, 0, b.x + ox, b.y + oy, rr);
        g.addColorStop(0, this.hexA(b.hex, 0.62)); g.addColorStop(1, this.hexA(b.hex, 0));
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(b.x + ox, b.y + oy, rr, 0, 6.2832); ctx.fill();
      });
      ctx.globalCompositeOperation = 'source-over';
      if (!document.hidden) this._raf = requestAnimationFrame(draw);
    };
    draw(t0);
    if (!document.hidden) this._raf = requestAnimationFrame(draw);
  },
  stopCanvas() { if (this._raf) { cancelAnimationFrame(this._raf); this._raf = null; } },

  // ================= interaction =================
  // New Generation is the inverse of the generation reveal: the result recedes DOWNWARD
  // (reverse of the bottom-to-top entry), then the upload surface rises in a beat later.
  doReset() {
    const g = window.gsap, root = this.resultRef.current;
    const commit = () => { this._genId = (this._genId || 0) + 1; this.stopCanvas(); this.setState({ stage: 'upload', current: null, imageUrl: null, selectedSwatch: null, announce: 'Ready for a new reference image.' }, () => { requestAnimationFrame(() => this.animateUploadIn()); }); };
    if (this._reduce || !g || !root || this.state.stage !== 'result' || document.hidden) { commit(); return; }
    const bands = [...root.querySelectorAll('[data-band]')];
    const fx = [...root.querySelectorAll('[data-fx]')];
    let done = false; const go = () => { if (done) return; done = true; commit(); };
    clearTimeout(this._resetGuard); this._resetGuard = setTimeout(go, this.DUR.reveal * 1000 + 220);
    try {
      if (fx.length) g.to(fx, { opacity: 0, y: 8, duration: this.DUR.state, ease: this.EASE.exit, stagger: .03 });
      if (bands.length) g.to(bands, { clipPath: 'inset(100% 0 0 0)', duration: this.DUR.reveal * 0.8, ease: this.EASE.exit, stagger: this.DUR.stagger, onComplete: go });
      else go();
    } catch (e) { go(); }
  },
  animateUploadIn() {
    const g = window.gsap; if (!g || document.hidden) return;
    const zone = document.querySelector('main button[aria-label^="Upload a reference image"]');
    if (!zone) return;
    if (this._reduce) { g.fromTo(zone, { opacity: 0 }, { opacity: 1, duration: .35, ease: 'none' }); return; }   // opacity crossfade only
    g.fromTo(zone, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: this.DUR.reveal, ease: this.EASE.entrance });
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
    this.setState({ stage: 'result', current: p, imageUrl: this.dispUrl(p), selectedSwatch: null, announce: 'Showing palette: ' + p.name + '. Mood: ' + p.descriptors.join(', ') + '.' });
  },
  selectSwatch(i, hex) { this.setState((s) => { const on = s.selectedSwatch === i; return { selectedSwatch: on ? null : i, announce: on ? '' : ('Swatch ' + hex + ' selected.') }; }); },
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
