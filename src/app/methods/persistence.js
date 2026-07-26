// Persistence (Workstream A): swappable storage adapter over localStorage, versioned schema with
// migration + validation, cross-tab sync, projects CRUD, and the portable project file.
export const persistenceMethods = {
  // Storage adapter — a swappable interface (load/save/clear). Implemented against localStorage
  // now; a backend/account store can replace makeStore() later without touching call sites.
  makeStore() {
    // FROZEN LEGACY KEY — do not rename to match the product name.
    //
    // 'palette-generator/*' predates the settling of the name on Atmos Studio. Every archive that
    // already exists on someone's machine is keyed to this string, and localStorage has no rename:
    // changing it would silently orphan real palettes behind a key nothing reads any more. The same
    // goes for the project-file `schema` value below (saveProjectFile / mergeProjectFile) — files
    // already saved to disk carry it, and importing must keep working.
    //
    // Leaving them is the deliberate choice, not an oversight. They are internal identifiers, never
    // shown to a user, so they cost nothing in coherence. Renaming would need a versioned migration
    // that reads the old key, writes the new, and leaves the old intact for at least one release —
    // real risk and real work to buy a string nobody sees.
    const KEY = 'palette-generator/feed';
    let backend = null;
    try { if (typeof window !== 'undefined' && window.localStorage) { const t = '__pg_probe__'; window.localStorage.setItem(t, '1'); window.localStorage.removeItem(t); backend = window.localStorage; } } catch (e) { backend = null; }
    return {
      available: !!backend,
      load: () => { if (!backend) return null; try { return backend.getItem(KEY); } catch (e) { return null; } },
      save: (str) => { if (!backend) return { ok: false, noBackend: true }; try { backend.setItem(KEY, str); return { ok: true }; } catch (e) { return { ok: false, error: e }; } },
      clear: () => { if (!backend) return; try { backend.removeItem(KEY); } catch (e) { } },
    };
  },
  _store() { return this.store || (this.store = this.makeStore()); },
  // M1: cross-tab sync. Another tab's write to our key fires 'storage' here. Merge by id so neither
  // tab's additions are lost: keep local-only palettes, adopt the incoming snapshot for everything else.
  _onStorage(e) {
    if (!e || e.key !== 'palette-generator/feed' || !e.newValue) return;
    if (this._syncing) return;
    const incoming = this._parseRaw(e.newValue); if (!incoming) return;
    this._syncing = true;
    const inIds = new Set(incoming.feed.map((p) => p.id));
    const localExtras = this.state.feed.filter((p) => !inIds.has(p.id));
    const feed = [...localExtras, ...incoming.feed];
    const projById = {}; incoming.projects.forEach((p) => projById[p.id] = p); this.state.projects.forEach((p) => { if (!projById[p.id]) projById[p.id] = p; });
    const projects = Object.values(projById);
    this._boot = { feed, projects, seeded: true };
    this.setState({ feed, projects }, () => {
      this._syncing = false;
      if (this.state.feedView === 'grid') { this.killSpatial(); requestAnimationFrame(() => { if (this.state.feedView === 'grid') this.initSpatial(); }); }
      this.showNotice('Synced changes from another tab.');
    });
  },
  // Parse + migrate + validate a raw snapshot string → {feed,projects,seeded} or null.
  _parseRaw(raw) {
    if (!raw) return null;
    let obj; try { obj = JSON.parse(raw); } catch (e) { return null; }
    if (!obj || typeof obj !== 'object') return null;
    const migrated = this.migrate(obj); if (!migrated) return null;
    const feed = this.validateFeed(migrated.feed); if (!feed) return null;
    const projects = this.validateProjects(migrated.projects);
    const ids = new Set(projects.map((p) => p.id));
    feed.forEach((p) => { if (p.projectId && !ids.has(p.projectId)) p.projectId = null; });
    return { feed, projects, seeded: !!migrated.seeded };
  },
  // Read + migrate + validate stored feed. Corrupt/newer/partial → null (caller seeds instead of crashing).
  loadPersisted() {
    if (this._boot !== undefined) return this._boot;
    const store = this._store();
    let raw; try { raw = store.load(); } catch (e) { raw = null; }
    this._boot = this._parseRaw(raw);
    return this._boot;
  },
  validateProjects(arr) {
    if (!Array.isArray(arr)) return [];
    const out = [], seen = new Set();
    for (const p of arr) {
      if (!p || typeof p !== 'object' || typeof p.name !== 'string' || !p.name.trim()) continue;
      const id = String(p.id || ('proj-' + Date.now() + Math.random().toString(36).slice(2, 6)));
      if (seen.has(id)) continue; seen.add(id);
      out.push({ id, name: p.name.trim().slice(0, 60), createdAt: typeof p.createdAt === 'number' ? p.createdAt : Date.now() });
    }
    return out;
  },
  migrate(obj) {
    const SCHEMA_VERSION = 1;
    const v = typeof obj.version === 'number' ? obj.version : 1;
    if (v > SCHEMA_VERSION) return null;   // written by a newer build → safe fallback, don't guess
    // (future field migrations branch on v here before returning)
    return obj;
  },
  validateFeed(feed) {
    if (!Array.isArray(feed)) return null;
    const out = [];
    for (const p of feed) {
      if (!p || typeof p !== 'object' || !Array.isArray(p.swatches)) continue;
      const sw = [];
      for (const s of p.swatches) {
        if (!s || typeof s.hex !== 'string' || !/^#[0-9a-f]{6}$/i.test(s.hex)) continue;
        const hasLab = typeof s.L === 'number' && typeof s.a === 'number' && typeof s.b === 'number';
        let L = s.L, a = s.a, b = s.b;
        if (!hasLab) { const c = this.hexToRgb(s.hex); const lab = this.rgb2oklab(c[0] / 255, c[1] / 255, c[2] / 255); L = lab.L; a = lab.a; b = lab.b; }
        sw.push({ hex: s.hex, weight: typeof s.weight === 'number' ? s.weight : 0.2, L, a, b });
      }
      if (!sw.length) continue;
      out.push({
        id: String(p.id || (Date.now() + Math.random().toString(36).slice(2, 5))),
        imageUrl: this._safeImageUrl(p.imageUrl),
        time: typeof p.time === 'number' ? p.time : Date.now(),
        name: typeof p.name === 'string' ? p.name : 'Untitled',
        descriptors: Array.isArray(p.descriptors) ? p.descriptors.filter((d) => typeof d === 'string') : [],
        rationale: typeof p.rationale === 'string' ? p.rationale : '',
        archetype: typeof p.archetype === 'string' ? p.archetype : 'seed',
        example: p.example === true,
        fallback: p.fallback === true,
        projectId: (typeof p.projectId === 'string' && p.projectId) ? p.projectId : null,
        swatches: sw,
      });
    }
    return out;   // may be empty (user deleted everything) — that is a valid persisted state, not a re-seed trigger
  },
  hydrateFeed() {
    const parsed = this.loadPersisted();
    if (parsed) { return parsed.feed; }            // stored feed wins (even if empty) — never re-seed over it
    this._needSeedPersist = true;                  // first-ever load: seed + mark seeded on mount
    return this.makeSeed();
  },
  hydrateProjects() { const parsed = this.loadPersisted(); return parsed ? parsed.projects : []; },
  // Scope the archive to the active project: null=All, '__unfiled__'=Unfiled, else a project id.
  // Two scoping axes, one pipeline. projectFeed is the project axis alone — the chip counts and the
  // tag menu are built from it, so choosing a tag never narrows the menu it was chosen from (and an
  // active tag can never delete its own way out of the UI). scopedFeed is what the whole app reads:
  // list, universe, reel, pagination counts. There is no second filter path.
  projectFeed(feed) { const a = this.state ? this.state.activeProject : null; if (a === null || a === undefined) return feed; if (a === '__unfiled__') return feed.filter((p) => !p.projectId); return feed.filter((p) => p.projectId === a); },
  // Tags combine with AND: a palette must carry EVERY selected tag. Adding a tag narrows.
  matchesTags(p, tags) { if (!tags || !tags.length) return true; const d = p.descriptors.map((x) => x.toLowerCase()); return tags.every((t) => d.indexOf(t) >= 0); },
  // OR within the group: a palette holds exactly one accessibility state, so selecting two means
  // "either of these", never "both" — which would be unsatisfiable.
  matchesA11y(p, states) { if (!states || !states.length) return true; return states.indexOf(this.paletteMetrics(p).aaState) >= 0; },
  scopedFeed(feed) {
    const s = this.state || {};
    const t = s.activeTags || [], a = s.activeA11y || [];
    let out = this.projectFeed(feed);
    if (t.length) out = out.filter((p) => this.matchesTags(p, t));
    if (a.length) out = out.filter((p) => this.matchesA11y(p, a));
    return out;
  },
  // ---- project CRUD + assignment (one flat axis; delete refiles palettes to Unfiled with undo) ----
  projectName(id) { if (!id) return 'Unfiled'; const p = this.state.projects.find((x) => x.id === id); return p ? p.name : 'Unfiled'; },
  // Scoping the archive replaces every row in it, so it takes the same arrival as a page change:
  // the list restates itself top-down instead of cutting to a different set in place.
  //
  // Reveal WITHOUT the anchor scroll that setPage/setPageSize use, deliberately. The chips and the
  // filter drawer sit ABOVE the list, so anchoring would scroll the control you just clicked off the
  // top of the screen — the cure would be worse than the jump. Paging is different: the pager is
  // below the list, so anchoring moves toward what you were touching, not away from it.
  setActiveProject(id) { this.setState({ activeProject: id, page: 0, announce: (id === null ? 'Showing all palettes.' : id === '__unfiled__' ? 'Showing Unfiled palettes.' : 'Showing project ' + this.projectName(id) + '.') }, () => { if (this.state.feedView === 'grid') this.buildUniverse(); this._listRowsReveal(); }); },
  // Tag scoping. Activating the pressed tag clears it — the chip is the toggle, so there is no
  // separate "clear" control to find, and no way to end up filtered with nothing to unfilter with.
  // Same shape as setActiveProject deliberately: same state pipeline, same universe rebuild, same
  // page reset (a filtered list is a different list; page 4 of the old one means nothing).
  // The ONE filter state. Pure now: the drawer's open/close lifecycle lives with the other
  // drawers in overlays.js, and applying a filter no longer closes anything — the drawer stays
  // up so the list re-filters live behind it and the next pick is one click away.
  // Toggle one tag in or out of the selection. Every route into the filter — a row tag, a drawer
  // option, an applied chip's ✕ — comes through here, so there is still exactly one filter state.
  setActiveTag(tag) {
    this.setState((st) => {
      const cur = st.activeTags || [];
      const on = cur.indexOf(tag) >= 0;
      const next = on ? cur.filter((x) => x !== tag) : cur.concat([tag]);
      // "Tag filter cleared" was a lie whenever an accessibility filter was still applied — the
      // list stays filtered, just not by tags. Removing the last tag now announces the removal
      // only; the panel's live match count carries what is actually left.
      const say = next.length === 0 ? 'Removed ' + tag + '.'
        : (on ? 'Removed ' + tag + '. ' : 'Added ' + tag + '. ')
          + 'Showing palettes tagged ' + next.join(' and ') + '.';
      return { activeTags: next, page: 0, announce: say };
    }, () => { if (this.state.feedView === 'grid') this.buildUniverse(); this._listRowsReveal(); });
  },
  // OR toggle within the accessibility group.
  setA11yFilter(state) {
    this.setState((st) => {
      const cur = st.activeA11y || [];
      const on = cur.indexOf(state) >= 0;
      const next = on ? cur.filter((x) => x !== state) : cur.concat([state]);
      const say = next.length === 0 ? 'Accessibility filter cleared.'
        : 'Showing palettes with ' + next.join(' or ') + ' accessibility.';
      return { activeA11y: next, page: 0, announce: say };
    }, () => { if (this.state.feedView === 'grid') this.buildUniverse(); this._listRowsReveal(); });
  },
  // Clears BOTH groups — the single clear-all the panel and header share.
  clearTags() {
    this.setState({ activeTags: [], activeA11y: [], page: 0, announce: 'Filters cleared.' }, () => { if (this.state.feedView === 'grid') this.buildUniverse(); this._listRowsReveal(); });
  },
  createProject(name) {
    name = (name || '').trim(); if (!name) return null; const id = 'proj-' + Date.now() + Math.random().toString(36).slice(2, 6);
    this.setState((st) => ({ projects: [...st.projects, { id, name: name.slice(0, 60), createdAt: Date.now() }], announce: 'Project ' + name + ' created.' }), () => this.persist({ immediate: true })); return id;
  },
  renameProject(id, name) { name = (name || '').trim(); if (!name) return; this.setState((st) => ({ projects: st.projects.map((p) => p.id === id ? Object.assign({}, p, { name: name.slice(0, 60) }) : p), announce: 'Project renamed to ' + name + '.' }), () => this.persist({ immediate: true })); },
  assignPalette(palId, projectId) { const pid = projectId || null; this.setState((st) => ({ feed: st.feed.map((p) => p.id === palId ? Object.assign({}, p, { projectId: pid }) : p), announce: 'Moved palette to ' + this.projectName(pid) + '.' }), () => { this.persist({ immediate: true }); if (this.state.feedView === 'grid') this.buildUniverse(); }); },
  deleteProject(id) {
    const st = this.state; const idx = st.projects.findIndex((p) => p.id === id); if (idx < 0) return;
    const project = st.projects[idx]; const palIds = st.feed.filter((p) => p.projectId === id).map((p) => p.id);
    if (this._toastT) clearTimeout(this._toastT); this._deleted = null; this._deletedProject = { project, index: idx, palIds };
    const projects = st.projects.slice(0, idx).concat(st.projects.slice(idx + 1));
    const feed = st.feed.map((p) => p.projectId === id ? Object.assign({}, p, { projectId: null }) : p);
    const patch = { projects, feed, toast: { name: project.name + ' project' } };
    if (st.activeProject === id) patch.activeProject = null;
    patch.announce = 'Project ' + project.name + ' deleted. Its ' + palIds.length + ' palette(s) moved to Unfiled. Undo available.';
    this.setState(patch, () => { this.persist({ immediate: true }); this._toastIn(); if (this.state.feedView === 'grid') this.buildUniverse(); });
    this._toastT = setTimeout(() => { this._deletedProject = null; this._dismissToast(); }, 6500);
  },
  // ---- portable project file (accountless permanence) — DISTINCT from token export ----
  buildProjectFile(scope) {
    const st = this.state; let projects, palettes;
    if (scope === 'archive') { projects = st.projects.slice(); palettes = st.feed.slice(); }
    else { const pid = (scope && scope !== '__unfiled__') ? scope : null; projects = pid ? st.projects.filter((p) => p.id === pid) : []; palettes = st.feed.filter((p) => pid ? p.projectId === pid : !p.projectId); }
    return { schema: 'palette-generator/project-file', version: 1, exportedAt: new Date().toISOString(), projects, palettes };
  },
  saveProjectFile(scope) {
    const data = this.buildProjectFile(scope);
    const d = new Date(), date = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    let fn;
    if (scope === 'archive') fn = 'palettes_archive_' + date + '.json';
    else { const nm = (scope && scope !== '__unfiled__') ? this.projectName(scope) : 'unfiled'; fn = 'palettes_' + this.slugName(nm) + '_' + date + '.json'; }
    this.download(fn, JSON.stringify(data, null, 2), 'application/json');
  },
  importProjectFile(file) {
    if (!file) return;
    const rdr = new FileReader();
    rdr.onload = () => { let obj = null; try { obj = JSON.parse(rdr.result); } catch (e) { this.showNotice('That file couldn’t be read — it may be damaged or not a palette project file.'); return; } this.mergeProjectFile(obj); };
    rdr.onerror = () => this.showNotice('Couldn’t open that file.');
    rdr.readAsText(file);
  },
  // Validate + merge, never clobber: dedupe palettes by id; keep both projects if names collide but ids differ.
  mergeProjectFile(obj) {
    if (!obj || typeof obj !== 'object' || obj.schema !== 'palette-generator/project-file') { this.showNotice('That doesn’t look like a palette project file.'); return; }
    if (typeof obj.version === 'number' && obj.version > 1) { this.showNotice('This file was made by a newer version — update before importing.'); return; }
    const inProjects = this.validateProjects(obj.projects);
    const inPalettes = this.validateFeed(obj.palettes);
    if (!inPalettes) { this.showNotice('No valid palettes found in that file.'); return; }
    this.setState((st) => {
      const projects = st.projects.slice(); const haveIds = new Set(projects.map((p) => p.id)); let addedProj = 0;
      inProjects.forEach((p) => { if (!haveIds.has(p.id)) { projects.push(p); haveIds.add(p.id); addedProj++; } });
      const feed = st.feed.slice(); const havePal = new Set(feed.map((p) => p.id)); let added = 0;
      inPalettes.forEach((p) => { if (!havePal.has(p.id)) { feed.unshift(p); havePal.add(p.id); added++; } });
      const pids = new Set(projects.map((p) => p.id)); feed.forEach((p) => { if (p.projectId && !pids.has(p.projectId)) p.projectId = null; });
      this._importSummary = 'Imported ' + added + ' new palette' + (added === 1 ? '' : 's') + ' and ' + addedProj + ' project' + (addedProj === 1 ? '' : 's') + '.';
      return { projects, feed, announce: this._importSummary };
    }, () => { this.persist({ immediate: true }); if (this.state.feedView === 'grid') this.buildUniverse(); this.showNotice(this._importSummary || 'Import complete.'); });
  },
  // ---- lightweight reversible dialog motion (assign / manage) — fade+slide, tokens, RM-instant ----
  _dialogIn(sel) { const g = window.gsap; if (this._reduce || !g) return; const root = document.querySelector(sel); if (!root) return; const bk = root.parentElement && root.parentElement.querySelector('[data-modal-backdrop]'); if (bk) g.from(bk, { opacity: 0, duration: .2, ease: 'none' }); g.from(root, { opacity: 0, y: 12, scale: 0.98, duration: this.DUR.state, ease: this.EASE.entrance, transformOrigin: 'center center', clearProps: 'transform' }); },
  _dialogOut(sel, cb) { const g = window.gsap; const root = document.querySelector(sel); if (this._reduce || !g || !root) { cb(); return; } const bk = root.parentElement && root.parentElement.querySelector('[data-modal-backdrop]'); const tl = g.timeline({ onComplete: cb }); if (bk) tl.to(bk, { opacity: 0, duration: .2, ease: 'none' }, 0); tl.to(root, { opacity: 0, y: 10, scale: 0.98, duration: this.DUR.state, ease: this.EASE.exit, transformOrigin: 'center center' }, 0); },
  trapFocusIn(sel, e) { if (e.key !== 'Tab') return; const root = document.querySelector(sel); if (!root) return; const f = [...root.querySelectorAll('button,[href],input,select,[tabindex]:not([tabindex="-1"])')].filter((n) => !n.disabled && n.offsetParent !== null); if (!f.length) return; const first = f[0], last = f[f.length - 1]; if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); } },
  openAssign(pal) { if (!pal) return; this._assignBack = document.activeElement; this.setState({ assignPalette: pal }, () => requestAnimationFrame(() => { const d = document.querySelector('[data-assign-dialog]'); if (d) { const b = d.querySelector('button'); if (b) try { b.focus(); } catch (e) { } } this._dialogIn('[data-assign-dialog]'); })); },
  closeAssign() { const back = this._assignBack; this._dialogOut('[data-assign-dialog]', () => this.setState({ assignPalette: null, announce: 'Move-to-project closed.' }, () => { if (back && back.focus) try { back.focus(); } catch (e) { } })); },
  pickAssign(projectId) { const pal = this.state.assignPalette; if (pal) { this.assignPalette(pal.id, projectId); } this.closeAssign(); },
  newProjectAndAssign(name) { const id = this.createProject(name); if (id) { const pal = this.state.assignPalette; if (pal) setTimeout(() => { this.assignPalette(pal.id, id); this.closeAssign(); }, 0); } },
  openManage() { this._manageBack = document.activeElement; this.setState({ manageProjects: true }, () => requestAnimationFrame(() => { const d = document.querySelector('[data-manage-dialog]'); if (d) { const b = d.querySelector('input,button'); if (b) try { b.focus(); } catch (e) { } } this._dialogIn('[data-manage-dialog]'); })); },
  closeManage() { const back = this._manageBack; this._dialogOut('[data-manage-dialog]', () => this.setState({ manageProjects: false, announce: 'Manage projects closed.' }, () => { if (back && back.focus) try { back.focus(); } catch (e) { } })); },
  // Debounced save (immediate for delete/undo so a fast reload can't lose them).
  persist(opts) {
    const write = () => this.writePayload({ version: 1, seeded: true, feed: this.state.feed, projects: this.state.projects });
    clearTimeout(this._saveT); this._saveT = null;
    if (opts && opts.immediate) { write(); }
    else { this._saveT = setTimeout(write, 400); }
  },
  writePayload(payload) {
    const store = this._store();
    if (!store.available) return;
    const attempt = (pl) => { let str; try { str = JSON.stringify(pl); } catch (e) { return { ok: false }; } return store.save(str); };
    let res = attempt(payload);
    if (res && res.ok) return;
    // quota: drop reference thumbnails from the OLDEST palettes (tail) inward, keeping palette data
    const feed = payload.feed.map((p) => Object.assign({}, p));
    let dropped = 0;
    for (let i = feed.length - 1; i >= 0 && (!res || !res.ok); i--) {
      if (feed[i].imageUrl) { feed[i].imageUrl = null; dropped++; res = attempt(Object.assign({}, payload, { feed })); }
    }
    if (!res || !res.ok) { this.setState({ announce: 'Storage is full — some palettes could not be saved. Save a project file to keep them safe.' }); if (!this._quotaNoticed) { this._quotaNoticed = true; this.showNotice('Storage is full — save a project file to keep your palettes safe.'); } }
    else if (dropped > 0) { this.setState({ announce: 'Storage nearly full — older reference images were dropped to keep your palettes. Save a project file to keep them safe.' }); if (!this._quotaNoticed) { this._quotaNoticed = true; this.showNotice('Older reference images were reduced to free space — save a project file to keep everything.'); } }
  },
};
