// Persistence (Workstream A): swappable storage adapter over localStorage, versioned schema with
// migration + validation, cross-tab sync, projects CRUD, and the portable project file.
import { ROLE_IDS } from '../../lib/exporters.js';
import { withoutRetired } from '../../lib/taxonomy.js';

export const persistenceMethods = {
  // Storage adapter — a swappable interface (load/save/clear). Implemented against localStorage
  // now; a backend/account store can replace makeStore() later without touching call sites.
  makeStore() {
    // FROZEN LEGACY KEY — do not rename to match the product name.
    //
    // 'palette-generator/*' predates every product name this has had (Atmos Studio, now Atmos
    // Gallery) — which is the point: it survived both renames. Every archive that
    // already exists on someone's machine is keyed to this string, and localStorage has no rename:
    // changing it would silently orphan real palettes behind a key nothing reads any more. The same
    // goes for the project-file `schema` value below (written by buildProjectFile, matched by
    // _readProjectFile) — files already saved to disk carry it, and restoring must keep working.
    // The buttons that write and read those files now say Back up and Restore; the string inside
    // the file did not move with them, deliberately, and neither did the filenames already on
    // people's disks — a file is identified by what is in it, never by what it is called.
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
    // A membership naming a project that no longer exists is dropped, not left to point at nothing.
    feed.forEach((p, i) => { feed[i] = this.withProjects(p, this.palProjects(p).filter((x) => ids.has(x))); });
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
  // One swatch list, validated one way. Extracted from validateFeed so the refined set and the
  // preserved source set cannot drift apart in what they accept — they are the same kind of thing
  // and a palette whose two lists disagreed about validity would be unreconcilable.
  _validateSwatches(list) {
    if (!Array.isArray(list)) return [];
    const sw = [];
    for (const s of list) {
      if (!s || typeof s.hex !== 'string' || !/^#[0-9a-f]{6}$/i.test(s.hex)) continue;
      const hasLab = typeof s.L === 'number' && typeof s.a === 'number' && typeof s.b === 'number';
      let L = s.L, a = s.a, b = s.b;
      if (!hasLab) { const c = this.hexToRgb(s.hex); const lab = this.rgb2oklab(c[0] / 255, c[1] / 255, c[2] / 255); L = lab.L; a = lab.a; b = lab.b; }
      sw.push({ sid: typeof s.sid === 'number' ? s.sid : -1, hex: s.hex, weight: typeof s.weight === 'number' ? s.weight : 0.2, L, a, b });
    }
    // STABLE IDENTITY, minted here so it can never be half-present. A swatch's sid is what the view
    // keys a band by and what a FLIP animation matches against; the array index cannot do that job
    // once a refinement can reorder or remove. Every palette written before this feature has none,
    // so if a single sid is missing or a duplicate slipped in from a hand-edited backup, the whole
    // list is re-minted by position — deterministic, collision-free, and stable from then on
    // because it round-trips through the store.
    const ids = sw.map((s) => s.sid);
    if (ids.some((v) => v < 0) || new Set(ids).size !== ids.length) sw.forEach((s, i) => { s.sid = i; });
    return sw;
  },
  // A sparse role → swatch-index map. Sparse is the design: an unassigned role falls through to the
  // derived heuristic at export time, so the record stores only what the user actually decided and
  // a palette that has never been refined stores nothing at all.
  //
  // Indices are range-checked against the swatch list they belong to, so a hand-edited backup file
  // (or one written before a refinement removed a swatch) cannot point a role at a colour that does
  // not exist. Returns null rather than {} when nothing survives: null is what "never refined"
  // means everywhere else, and an empty object would read as "refined, then emptied".
  _validateRoles(roles, count) {
    if (!roles || typeof roles !== 'object' || Array.isArray(roles)) return null;
    const out = {}; let n = 0;
    for (const id of ROLE_IDS) {
      const v = roles[id];
      if (typeof v !== 'number' || !isFinite(v)) continue;
      const i = Math.floor(v);
      if (i < 0 || i >= count) continue;
      out[id] = i; n++;
    }
    return n ? out : null;
  },
  validateFeed(feed) {
    if (!Array.isArray(feed)) return null;
    const out = [];
    for (const p of feed) {
      if (!p || typeof p !== 'object' || !Array.isArray(p.swatches)) continue;
      const sw = this._validateSwatches(p.swatches);
      if (!sw.length) continue;
      // The extraction's own output, kept only once a refinement has moved `swatches` away from it.
      // Absent means "never refined", which is the correct state for every palette that predates
      // this feature — so there is no migration and SCHEMA_VERSION does not move.
      const src = this._validateSwatches(p.sourceSwatches);
      out.push({
        id: String(p.id || (Date.now() + Math.random().toString(36).slice(2, 5))),
        // Content address and which extraction of that content this is. This validator builds an
        // allow-listed object, so a field absent from here is silently dropped on every reload —
        // these two must be named or the archive forgets which image a palette came from.
        // Absent on anything saved before this deploy, and on seeds; null is a legitimate value.
        hash: (typeof p.hash === 'string' && /^[0-9a-f]{16}$/.test(p.hash)) ? p.hash : null,
        variation: (typeof p.variation === 'number' && p.variation >= 0 && p.variation < 1e4) ? Math.floor(p.variation) : 0,
        imageUrl: this._safeImageUrl(p.imageUrl),
        // A seeded example's reference picture is named, not addressed: the key survives a reload so
        // the eight examples keep their images, and it is resolved against EXAMPLE_SRC (see
        // pipeline.js) rather than used as a URL — so the worst a doctored save file can do here is
        // point an entry at one of our own bundled assets.
        exampleKey: typeof p.exampleKey === 'string' ? p.exampleKey : null,
        time: typeof p.time === 'number' ? p.time : Date.now(),
        name: typeof p.name === 'string' ? p.name : 'Untitled',
        // THE TAXONOMY MIGRATION, and it is a filter rather than a migration step on purpose.
        // Every archive written before the measured words left the tag vocabulary holds descriptors
        // like Warm and Low-lit — which are Temperature and Lightness facet values now, and would
        // otherwise keep appearing in the Character group as duplicates of the dimensions above it.
        // Filtering on READ fixes every stored record, every backup file and every cross-tab sync
        // through the one door they all come through, with no SCHEMA_VERSION move and no one-shot
        // migration to get wrong. The cost is that it runs on every load; it is a handful of string
        // compares over a personal archive.
        descriptors: withoutRetired(Array.isArray(p.descriptors) ? p.descriptors : []),
        rationale: typeof p.rationale === 'string' ? p.rationale : '',
        archetype: typeof p.archetype === 'string' ? p.archetype : 'seed',
        example: p.example === true,
        fallback: p.fallback === true,
        // Migrates on read: a record written before multi-membership has projectId only, and comes
        // back as a one-element set. Both fields are kept in step by withProjects on every write.
        projectIds: Array.isArray(p.projectIds)
          ? p.projectIds.filter((x, i, a) => typeof x === 'string' && x && a.indexOf(x) === i)
          : ((typeof p.projectId === 'string' && p.projectId) ? [p.projectId] : []),
        projectId: (typeof p.projectId === 'string' && p.projectId) ? p.projectId : null,
        swatches: sw,
        // REFINEMENT. Both are optional and both are allow-listed here for the reason the comment
        // above gives: a field this validator does not name is destroyed on the next reload, on
        // every cross-tab sync, and on every backup restore, silently and with no error. These two
        // carry a user's decisions, so losing them that way would be the worst possible failure.
        sourceSwatches: src.length ? src : null,
        roles: this._validateRoles(p.roles, sw.length),
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
  /* MEMBERSHIP IS A SET, NOT A SLOT. A palette used to carry one projectId, so filing it in a
     second project silently took it out of the first — and the action row said "In Garnet Set",
     which was honest about a model that could not do what people expected of folders.

     projectIds is the truth now. projectId is still written on every record as its first entry,
     because a backup restored into an older build reads that field and would otherwise come back
     with everything unfiled. Nothing in the app READS projectId any more; these two accessors are
     the only way membership is asked about, so there is one definition of "is it in there". */
  palProjects(p) {
    if (!p) return [];
    if (Array.isArray(p.projectIds)) return p.projectIds.filter((x) => typeof x === 'string' && x);
    return (typeof p.projectId === 'string' && p.projectId) ? [p.projectId] : [];
  },
  inProject(p, id) { return this.palProjects(p).indexOf(id) >= 0; },
  // One writer, so projectIds and its legacy mirror can never disagree.
  withProjects(p, ids) {
    const clean = (ids || []).filter((x, i, a) => typeof x === 'string' && x && a.indexOf(x) === i);
    return Object.assign({}, p, { projectIds: clean, projectId: clean[0] || null });
  },
  projectFeed(feed) { const a = this.state ? this.state.activeProject : null; if (a === null || a === undefined) return feed; if (a === '__unfiled__') return feed.filter((p) => this.palProjects(p).length === 0); return feed.filter((p) => this.inProject(p, a)); },
  // Tags combine with AND: a palette must carry EVERY selected tag. Adding a tag narrows.
  matchesTags(p, tags) { if (!tags || !tags.length) return true; const d = p.descriptors.map((x) => x.toLowerCase()); return tags.every((t) => d.indexOf(t) >= 0); },
  // OR within the group: a palette holds exactly one accessibility state, so selecting two means
  // "either of these", never "both" — which would be unsatisfiable.
  matchesA11y(p, states) { if (!states || !states.length) return true; return states.indexOf(this.paletteMetrics(p).aaState) >= 0; },
  // The two MEASURED facets, on the same OR-within/AND-across contract as contrast potential. Both
  // read values paletteMetrics already computes, so filtering costs nothing a palette did not
  // already pay for on render.
  matchesLight(p, bands) { if (!bands || !bands.length) return true; return bands.indexOf(this.paletteMetrics(p).lightBand) >= 0; },
  matchesTemp(p, temps) { if (!temps || !temps.length) return true; return temps.indexOf(this.paletteMetrics(p).temp.toLowerCase()) >= 0; },
  scopedFeed(feed) {
    const s = this.state || {};
    const t = s.activeTags || [], a = s.activeA11y || [], l = s.activeLight || [], w = s.activeTemp || [];
    let out = this.projectFeed(feed);
    if (t.length) out = out.filter((p) => this.matchesTags(p, t));
    if (a.length) out = out.filter((p) => this.matchesA11y(p, a));
    if (l.length) out = out.filter((p) => this.matchesLight(p, l));
    if (w.length) out = out.filter((p) => this.matchesTemp(p, w));
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
  // Folders hold different counts, so the list's height changes with the scope — see _listFreezeHeight
  // for why that has to be ramped rather than stepped. Freeze BEFORE the swap, ramp after it.
  setActiveProject(id) { this._listFreezeHeight(); this.setState({ activeProject: id, page: 0, announce: (id === null ? 'Showing all palettes.' : id === '__unfiled__' ? 'Showing Unfiled palettes.' : 'Showing project ' + this.projectName(id) + '.') }, () => { if (this.state.feedView === 'grid') this.buildUniverse(); this._listRowsReveal(); this._listSettleHeight(); }); },
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
    this._listFreezeHeight();
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
    }, () => { if (this.state.feedView === 'grid') this.buildUniverse(); this._listRowsReveal(); this._listSettleHeight(); });
  },
  // OR toggle within the accessibility group.
  setA11yFilter(state) {
    this._listFreezeHeight();
    this.setState((st) => {
      const cur = st.activeA11y || [];
      const on = cur.indexOf(state) >= 0;
      const next = on ? cur.filter((x) => x !== state) : cur.concat([state]);
      const say = next.length === 0 ? 'Accessibility filter cleared.'
        : 'Showing palettes with ' + next.join(' or ') + ' accessibility.';
      return { activeA11y: next, page: 0, announce: say };
    }, () => { if (this.state.feedView === 'grid') this.buildUniverse(); this._listRowsReveal(); this._listSettleHeight(); });
  },
  // One toggle for every measured facet, keyed by its stable id — the group's state key is derived
  // from that id rather than each group getting a hand-written setter to keep in step.
  setFacet(key, value) {
    this._listFreezeHeight();
    this.setState((st) => {
      const cur = st[key] || [];
      const on = cur.indexOf(value) >= 0;
      const next = on ? cur.filter((x) => x !== value) : cur.concat([value]);
      return { [key]: next, page: 0, announce: (on ? 'Removed ' : 'Added ') + value + ' filter.' };
    }, () => { if (this.state.feedView === 'grid') this.buildUniverse(); this._listRowsReveal(); this._listSettleHeight(); });
  },
  // Clears EVERY group — the single clear-all the panel and the archive header share.
  clearTags() {
    this._listFreezeHeight();
    this.setState({ activeTags: [], activeA11y: [], activeLight: [], activeTemp: [], page: 0, announce: 'Filters cleared.' }, () => { if (this.state.feedView === 'grid') this.buildUniverse(); this._listRowsReveal(); this._listSettleHeight(); });
  },
  // The way out of a zero-result state that does not throw away everything else the user chose.
  // Order matters: the last filter added is the one most likely to have caused the conflict, and
  // filters are appended within their group, so the newest is the tail of whichever group is last.
  removeLastFilter() {
    const st = this.state;
    for (const key of ['activeTemp', 'activeLight', 'activeA11y', 'activeTags']) {
      const cur = st[key] || [];
      if (cur.length) { this._listFreezeHeight(); const gone = cur[cur.length - 1];
        this.setState({ [key]: cur.slice(0, -1), page: 0, announce: 'Removed ' + gone + ' filter.' }, () => { if (this.state.feedView === 'grid') this.buildUniverse(); this._listRowsReveal(); this._listSettleHeight(); });
        return; }
    }
  },
  createProject(name) {
    name = (name || '').trim(); if (!name) return null; const id = 'proj-' + Date.now() + Math.random().toString(36).slice(2, 6);
    this.setState((st) => ({ projects: [...st.projects, { id, name: name.slice(0, 60), createdAt: Date.now() }], announce: 'Project ' + name + ' created.' }), () => this.persist({ immediate: true })); return id;
  },
  renameProject(id, name) { name = (name || '').trim(); if (!name) return; this.setState((st) => ({ projects: st.projects.map((p) => p.id === id ? Object.assign({}, p, { name: name.slice(0, 60) }) : p), announce: 'Project renamed to ' + name + '.' }), () => this.persist({ immediate: true })); },
  /* TOGGLE, not move. Picking a project the palette is already in removes it; picking a new one
     adds it. Unfiled is not a project — choosing it means "belong to nothing", so it clears the
     set rather than joining a ninth list. */
  assignPalette(palId, projectId) {
    const pid = projectId || null;
    this.setState((st) => {
      let msg = '';
      const feed = st.feed.map((p) => {
        if (p.id !== palId) return p;
        if (!pid) { msg = p.name + ' removed from every project.'; return this.withProjects(p, []); }
        const has = this.inProject(p, pid);
        const next = has ? this.palProjects(p).filter((x) => x !== pid) : this.palProjects(p).concat([pid]);
        msg = p.name + (has ? ' removed from ' : ' added to ') + this.projectName(pid) + '.';
        return this.withProjects(p, next);
      });
      return { feed, announce: msg };
    }, () => this.persist());
  },
  deleteProject(id) {
    const st = this.state; const idx = st.projects.findIndex((p) => p.id === id); if (idx < 0) return;
    const project = st.projects[idx]; const palIds = st.feed.filter((p) => this.inProject(p, id)).map((p) => p.id);
    this._deleted = null; this._deletedProject = { project, index: idx, palIds };
    const projects = st.projects.slice(0, idx).concat(st.projects.slice(idx + 1));
    const feed = st.feed.map((p) => this.inProject(p, id) ? this.withProjects(p, this.palProjects(p).filter((x) => x !== id)) : p);
    const patch = { projects, feed, toast: { name: project.name + ' project' } };
    if (st.activeProject === id) patch.activeProject = null;
    patch.announce = 'Project ' + project.name + ' deleted. Its ' + palIds.length + ' palette(s) moved to Unfiled. Undo available.';
    // No auto-dismiss: the toast holds an action, so it stays until Undo, the ✕, or the next
    // deletion replaces it — see the note in overlays.js where the palette path says the same.
    this.setState(patch, () => { this.persist({ immediate: true }); this._toastIn(); if (this.state.feedView === 'grid') this.buildUniverse(); });
  },
  // ---- portable project file (accountless permanence) — DISTINCT from token export ----
  buildProjectFile(scope) {
    const st = this.state; let projects, palettes;
    if (scope === 'archive') { projects = st.projects.slice(); palettes = st.feed.slice(); }
    else { const pid = (scope && scope !== '__unfiled__') ? scope : null; projects = pid ? st.projects.filter((p) => p.id === pid) : []; palettes = st.feed.filter((p) => pid ? this.inProject(p, pid) : this.palProjects(p).length === 0); }
    return { schema: 'palette-generator/project-file', version: 1, exportedAt: new Date().toISOString(), projects, palettes };
  },
  // The FILENAME follows the interface's vocabulary; the `schema` string inside the file does not,
  // and must not (see the frozen-key note at the top). A file on disk is identified by what is in
  // it, never by what it is called: mergeProjectFile matches on `schema` alone, and the input
  // accepts any .json — so a backup written by an older build, under the old palettes_* name, still
  // restores, and one written today still opens in an older build.
  saveProjectFile(scope) {
    const data = this.buildProjectFile(scope);
    const d = new Date(), date = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    let fn;
    if (scope === 'archive') fn = 'atmos_library_backup_' + date + '.json';
    else { const nm = (scope && scope !== '__unfiled__') ? this.projectName(scope) : 'unfiled'; fn = 'atmos_project_' + this.slugName(nm) + '_' + date + '.json'; }
    this.download(fn, JSON.stringify(data, null, 2), 'application/json');
  },
  // Restoring is TWO acts now: read the file, then commit it. Nothing reaches the library until
  // confirmRestore runs, and the dialog in between states what the file holds and what would land.
  // The merge has always been non-destructive, but "it never clobbers" is a promise nobody could
  // check from a toast that arrived after the fact. The counts are the check, stated before.
  //
  // The four refusals below are unchanged and are still the only thing a bad file can produce: a
  // file that fails validation never reaches a dialog, so there is never a confirmation to click
  // for something that was not going to import anyway.
  importProjectFile(file) {
    if (!file) return;
    const rdr = new FileReader();
    rdr.onload = () => { let obj = null; try { obj = JSON.parse(rdr.result); } catch (e) { this.showNotice('That file couldn’t be read. It may be damaged, or not a palette project file.'); return; } this.previewProjectFile(obj, file.name || ''); };
    rdr.onerror = () => this.showNotice('Couldn’t open that file.');
    rdr.readAsText(file);
  },
  // Validate ONLY — no state is touched. Returns the validated payload, or the one sentence saying
  // why not, so the refusal copy lives in one place and the preview and the commit can never
  // disagree about what "a valid file" means.
  _readProjectFile(obj) {
    if (!obj || typeof obj !== 'object' || obj.schema !== 'palette-generator/project-file') return { error: 'That doesn’t look like a palette project file.' };
    if (typeof obj.version === 'number' && obj.version > 1) return { error: 'This file was made by a newer version. Update before importing.' };
    const projects = this.validateProjects(obj.projects);
    const palettes = this.validateFeed(obj.palettes);
    if (!palettes) return { error: 'No valid palettes found in that file.' };
    return { projects, palettes };
  },
  // Count against the library, then ask. The validated arrays are parked on the instance and are
  // NOT re-derived on confirm — that is a correctness requirement, not a saving: validateProjects
  // and validateFeed MINT an id for any entry arriving without one ('proj-' + Date.now() + a random
  // suffix), so a second pass would produce different objects and the "5 new" the user agreed to
  // would describe a set that never lands.
  previewProjectFile(obj, fileName) {
    const read = this._readProjectFile(obj);
    if (read.error) { this.showNotice(read.error); return; }
    const havePal = new Set(this.state.feed.map((p) => p.id));
    const haveProj = new Set(this.state.projects.map((p) => p.id));
    this.openRestore({
      fileName: fileName || 'Backup file',
      palettes: read.palettes.length, projects: read.projects.length,
      newPalettes: read.palettes.filter((p) => !havePal.has(p.id)).length,
      newProjects: read.projects.filter((p) => !haveProj.has(p.id)).length,
    }, read);
  },
  // Same dialog family as re-upload recognition, and the same shape for the same reason: a pending
  // act, stated in full, with two named outcomes. Focus moves in the setState callback and only the
  // transition waits for a frame — see openRecognised for why that order is load-bearing.
  openRestore(preview, pending) {
    this._restoreBack = document.activeElement;
    this._restorePending = pending;
    this.setState({
      restorePending: preview,
      announce: 'This file holds ' + preview.palettes + ' palettes and ' + preview.projects + ' projects, of which '
        + preview.newPalettes + ' palettes and ' + preview.newProjects + ' projects are new to your library. Choose whether to add them.',
    }, () => {
      const d = document.querySelector('[data-restore-dialog]');
      if (d) { const b = d.querySelector('button'); if (b) try { b.focus(); } catch (e) { } }
      requestAnimationFrame(() => this._dialogIn('[data-restore-dialog]'));
    });
  },
  // Every exit routes through here, so the parked payload cannot survive the dialog by any path.
  _closeRestore(after) {
    const back = this._restoreBack;
    this._dialogOut('[data-restore-dialog]', () => this.setState({ restorePending: null }, () => {
      const pending = this._restorePending; this._restorePending = null;
      if (after) after(pending);
      else if (back && back.focus) try { back.focus(); } catch (e) { }
    }));
  },
  // Cancelling is a real outcome, not a dead end: the library is untouched.
  closeRestore() { this._closeRestore(); this.setState({ announce: 'Restore cancelled. Nothing was added to your library.' }); },
  confirmRestore() { this._closeRestore((pending) => { if (pending) this.mergeProjectFile(pending); }); },
  // Merge, never clobber: dedupe palettes by id; keep both projects if names collide but ids differ.
  // Takes the payload _readProjectFile already produced — validation happened once, before the
  // dialog. The added/addedProj counts are still recomputed HERE rather than reused from the
  // preview: another tab can adopt a snapshot through _onStorage between the two, so the preview is
  // a forecast and this is the fact.
  mergeProjectFile(payload) {
    const inProjects = payload.projects, inPalettes = payload.palettes;
    this.setState((st) => {
      const projects = st.projects.slice(); const haveIds = new Set(projects.map((p) => p.id)); let addedProj = 0;
      inProjects.forEach((p) => { if (!haveIds.has(p.id)) { projects.push(p); haveIds.add(p.id); addedProj++; } });
      const feed = st.feed.slice(); const havePal = new Set(feed.map((p) => p.id)); let added = 0;
      inPalettes.forEach((p) => { if (!havePal.has(p.id)) { feed.unshift(p); havePal.add(p.id); added++; } });
      const pids = new Set(projects.map((p) => p.id)); feed.forEach((p, i) => { feed[i] = this.withProjects(p, this.palProjects(p).filter((x) => pids.has(x))); });
      this._importSummary = 'Added ' + added + ' palette' + (added === 1 ? '' : 's') + ' and ' + addedProj + ' project' + (addedProj === 1 ? '' : 's') + ' to your library.';
      return { projects, feed, announce: this._importSummary };
    }, () => { this.persist({ immediate: true }); if (this.state.feedView === 'grid') this.buildUniverse(); this.showNotice(this._importSummary || 'Restore complete.'); });
  },
  // ---- lightweight reversible dialog motion (assign / manage) — fade+slide, tokens, RM-instant ----
  _dialogIn(sel) { const g = window.gsap; if (this._reduce || !g) return; const root = document.querySelector(sel); if (!root) return; const bk = root.parentElement && root.parentElement.querySelector('[data-modal-backdrop]'); if (bk) g.from(bk, { opacity: 0, duration: .2, ease: 'none' }); g.from(root, { opacity: 0, y: 12, scale: 0.98, duration: this.DUR.state, ease: this.EASE.entrance, transformOrigin: 'center center', clearProps: 'transform' }); },
  // Every modal dialog's exit, on the utility-overlay band with the drawers — this is the shared
  // half of the "all five settle in the same time" contract, and it was the one place the number
  // was written twice (.2 for the backdrop, DUR.state for the panel) so the two never quite agreed.
  // Every modal dialog's exit — Refine among them — on the overlays' own band and the one curve.
  // DUR.overlayOut rather than DUR.overlay: a dismissal has already been decided, so nothing waits
  // on it and it can afford to be the slower of the two.
  _dialogOut(sel, cb) { const g = window.gsap; const root = document.querySelector(sel); if (this._reduce || !g || !root) { cb(); return; } const bk = root.parentElement && root.parentElement.querySelector('[data-modal-backdrop]'); const tl = g.timeline({ onComplete: cb }); if (bk) tl.to(bk, { opacity: 0, duration: this.DUR.overlayOut, ease: this.EASE.overlay }, 0); tl.to(root, { opacity: 0, y: 10, scale: 0.98, duration: this.DUR.overlayOut, ease: this.EASE.overlay, transformOrigin: 'center center' }, 0); },
  // ---- the toggletip's own beat ----------------------------------------------------------------
  // A dialog's arrival is an event; a toggletip's is a disclosure, so it moves less and moves
  // faster — DUR.state in, DUR.micro out, and 6px of travel against the dialog's 12, with no scale.
  // It enters DOWNWARD from under its marker (y:-6 → 0), so the movement points away from the thing
  // that opened it and the panel reads as unfolding from the ⓘ rather than appearing beside it.
  //
  // Both toggletips share these, which is the point: this app's surfaces arrive rather than appear,
  // and one that popped instantly while everything around it eased would read as a rendering fault.
  // Reduced motion and no-GSAP both take the instant path, as everywhere else — _tipOut calls its
  // callback synchronously in that case, so the close path is identical with and without motion.
  _tipIn(sel) { const g = window.gsap; if (this._reduce || !g) return; const el = document.querySelector(sel); if (!el) return; g.from(el, { opacity: 0, y: -6, duration: this.DUR.state, ease: this.EASE.entrance, clearProps: 'transform' }); },
  _tipOut(sel, cb) { const g = window.gsap; const el = document.querySelector(sel); if (this._reduce || !g || !el) { cb(); return; } g.to(el, { opacity: 0, y: -6, duration: this.DUR.micro, ease: this.EASE.exit, onComplete: cb }); },
  // One open/close for every toggletip, keyed by its own state flag and its own panel. Closing has
  // to outlive the state change — React would unmount the panel the instant the flag flips, and
  // there would be nothing left to tween — so the exit runs first and the flag falls after it.
  // The _tipClosing guard is what stops a second click during that ~120ms from starting a second
  // exit on an element already on its way out (which would fire the callback twice and re-open).
  // NOT inside a requestAnimationFrame, unlike the dialogs. The DOM is already committed in a
  // setState callback, and gsap.from() sets its start values on the spot — so tweening here means
  // the panel is never painted at full opacity. Deferred to a frame it was: one frame at opacity 1
  // landed before the tween began, and the reveal opened with a flash of the thing it was about to
  // fade in. The dialogs defer because their transition measures layout; this one does not.
  // ---- disclosures that do not jump ------------------------------------------------------------
  // A fold that only fades leaves everything under it snapping to a new position, which is the
  // "unnecessary position jump" that makes an interface feel unfinished however smooth the fade is.
  // Height is what has to move: measured from the real content, tweened, then handed back to the
  // layout so nothing stays pinned to a stale pixel value.
  //
  // Closing has to outlive the state change for the same reason every exit here does — React would
  // unmount the panel before the tween had anywhere to play.
  _foldIn(sel) {
    const g = window.gsap; if (this._reduce || !g) return;
    const el = document.querySelector(sel); if (!el) return;
    // From wherever it IS, not always from zero: on a reversal the panel is part-open, and
    // restarting at 0 would drop it to nothing before rising again.
    // "Wherever it is" means an inline height LEFT BY A RUNNING TWEEN. Without that test this read
    // the natural height of a panel React had just mounted, so `from` equalled `to` and the fold
    // animated from full height to full height — which is to say it did not animate at all, and
    // every disclosure in the app popped open. The reversal case still works: mid-close there is an
    // inline height to read.
    const from = el.style.height ? el.getBoundingClientRect().height : 0;
    const h = el.scrollHeight;
    if (h <= 0) return;
    g.fromTo(el, { height: from, opacity: from > 0 ? 1 : 0 }, { height: h, opacity: 1, duration: this.DUR.reveal * 0.62, ease: this.EASE.fold, clearProps: 'height,opacity,overflow' });
  },
  _foldOut(sel, cb) {
    const g = window.gsap; const el = document.querySelector(sel);
    if (this._reduce || !g || !el) { cb(); return; }
    g.to(el, { height: 0, opacity: 0, duration: this.DUR.reveal * 0.45, ease: this.EASE.fold, onComplete: cb });
  },
  // REVERSIBLE MID-FLIGHT. A close tween has to outlive the state change, which means for its
  // ~170ms the flag still reads open — so a second click during it used to be swallowed by the
  // re-entry guard and the disclosure just sat there. Killing the running tween and re-opening from
  // wherever it had got to is what makes the control answer every press: the panel turns round in
  // place rather than finishing a journey nobody asked it to complete.
  _foldKill(sel) { const g = window.gsap, el = document.querySelector(sel); if (g && el) g.killTweensOf(el); },
  openFold(flag, sel) {
    this._foldBusy = this._foldBusy || {};
    this._foldBusy[flag] = false;
    this._foldKill(sel);
    if (this.state[flag]) { this._foldIn(sel); return; }   // still mounted mid-close: re-open in place
    this.setState({ [flag]: true }, () => this._foldIn(sel));
  },
  closeFold(flag, sel, after) {
    this._foldBusy = this._foldBusy || {};
    if (this._foldBusy[flag]) return;
    this._foldBusy[flag] = true;
    this._foldKill(sel);
    this._foldOut(sel, () => { this._foldBusy[flag] = false; this.setState({ [flag]: false }, after || null); });
  },
  toggleFold(flag, sel) {
    // A press during a close means "no, open it again" — never "do nothing".
    if (this._foldBusy && this._foldBusy[flag]) { this.openFold(flag, sel); return; }
    if (this.state[flag]) this.closeFold(flag, sel); else this.openFold(flag, sel);
  },
  openTip(flag, sel) { this.setState({ [flag]: true }, () => this._tipIn(sel)); },
  closeTip(flag, sel) { if (this._tipClosing) return; this._tipClosing = true; this._tipOut(sel, () => { this._tipClosing = false; this.setState({ [flag]: false }); }); },
  toggleTip(flag, sel) { if (this.state[flag]) this.closeTip(flag, sel); else this.openTip(flag, sel); },
  // The copy menu hands focus back to the control that opened it, on every route out — a pick, an
  // Escape, a click on the backdrop. A menu that closes and leaves focus on the document body sends
  // the next Tab to the top of the page, which is the one place the user was not.
  // `defer` matters on the way out of a copy: this.copy() reaches for the clipboard and its fallback
  // path puts focus on a scratch node of its own, so focusing the trigger in the same tick loses the
  // race and the next Tab starts from the top of the document.
  /* MODAL BACKGROUND, OUT OF THE TREE. trapFocusIn cycles Tab inside the dialog, which is the
     keyboard half of the job; the other half is that a screen reader's virtual cursor and the
     browser's find-in-page both walk the DOM directly and were still reaching 73 controls behind an
     open dialog. aria-modal="true" asks modern screen readers to ignore the background, but it is a
     request with uneven support and it does nothing for find-in-page.

     The landmarks are inerted rather than [data-app] itself, because every dialog is rendered INSIDE
     [data-app] — inerting the wrapper would inert the dialog with it. Listing the four landmarks is
     the honest version: they are the app's whole content surface, and a fifth would announce itself
     by still being reachable. */
  _bgInert(on) {
    const app = document.querySelector('[data-app]');
    if (!app) return;
    ['header', 'main', 'section[data-recent]', '.site-foot'].forEach((sel) => {
      const el = app.querySelector(sel);
      if (!el) return;
      if (on) el.setAttribute('inert', ''); else el.removeAttribute('inert');
    });
  },
  _focusCopyTrigger(defer) {
    const go = () => { const b = document.querySelector('[data-copy-trigger]'); if (b && b.focus) try { b.focus(); } catch (e) { } };
    if (defer) requestAnimationFrame(go); else go();
  },
  /* THE PHONE'S TWO WAYS OUT. The gate used to be a wall: a sentence saying the tool needs a wider
     screen, and nothing to do about it. Someone who arrived from a link had to remember to come back
     later, on a different machine, from memory.

     So: see what it makes, or keep the address. Both are honest on a phone — the first reuses the
     read-only palette view a shared link already gets, the second puts the URL on the clipboard so
     the trip to a desktop survives closing the tab. Neither pretends the extractor will run here. */
  // The eight seeded examples, in library order. One place, because three controls read it.
  _examples() { return (this.state.feed || []).filter((p) => p.example === true); },

  /* A DIFFERENT ONE EACH TIME. The gate used to open feed.find(p => p.example), which is Garnet,
     always — press it twice and the product looks like it makes one palette. It advances through
     the list instead, and the first index of a session is random so two visits do not both start
     at the top. No storage key for it: the whole point is variety within a visit, and a ninth
     preference to persist and validate would cost more than it buys. */
  openExampleOnPhone() {
    const list = this._examples();
    if (!list.length) return;
    this._exIdx = (this._exIdx == null)
      ? Math.floor(Math.random() * list.length)
      : (this._exIdx + 1) % list.length;
    this.showExample(list[this._exIdx]);
  },
  // Opening a NAMED example from the list keeps the cursor in step, so leaving the list and
  // pressing the gate again continues from what you last looked at rather than jumping back.
  openExampleById(id) {
    const list = this._examples();
    const i = list.findIndex((p) => p.id === id);
    if (i < 0) return;
    this._exIdx = i;
    this.showExample(list[i]);
  },
  showExample(ex) {
    if (!ex) return;
    this.setState({ current: ex, exampleView: true, announce: 'Example palette ' + ex.name + ' opened, read only.' }, () => this._shareIn());
  },
  closeExampleOnPhone() {
    if (this._shareClosing) return;
    this._shareClosing = true;
    this._shareOut(() => {
      this._shareClosing = false;
      // Back goes UP one level, not out: if the list is open behind this palette, that is where it
      // came from and where it belongs. Leaving straight to the gate from a list you had just
      // browsed threw away the position you were holding.
      this.setState({ exampleView: false, announce: this.state.exampleList ? 'Back to the example list.' : 'Returned to the start screen.' }, () => {
        if (this.state.exampleList) this._listIn();
      });
    });
  },
  /* Called from two places, and it has to mean the same thing in both: SHOW me the list. From the
     gate that is one state flip. From an open palette it is a level change, so the palette has to
     leave first — setting the flag alone armed the list UNDER a surface that stayed on top, which
     turned one tap into two and made "See all examples" look broken. */
  openExampleList() {
    if (this.state.exampleList && !this.state.exampleView) return;
    const show = () => this.setState(
      { exampleView: false, exampleList: true, announce: 'Example palettes, ' + this._examples().length + ' to choose from.' },
      () => this._listIn());
    if (this.state.exampleView) {
      if (this._shareClosing) return;
      this._shareClosing = true;
      this._shareOut(() => { this._shareClosing = false; show(); });
      return;
    }
    show();
  },
  closeExampleList() {
    if (this._listClosing) return;
    this._listClosing = true;
    this._listOut(() => {
      this._listClosing = false;
      this.setState({ exampleList: false, announce: 'Returned to the start screen.' });
    });
  },
  copySiteLink() {
    const href = (typeof location !== 'undefined' ? location.origin + '/' : 'https://atmos.gallery/');
    this.copy(href, 'gate-link', 'Link copied. Open it on a desktop to read your own image.');
  },
  trapFocusIn(sel, e) { if (e.key !== 'Tab') return; const root = document.querySelector(sel); if (!root) return; const f = [...root.querySelectorAll('button,[href],input,select,[tabindex]:not([tabindex="-1"])')].filter((n) => !n.disabled && n.offsetParent !== null); if (!f.length) return; const first = f[0], last = f[f.length - 1]; if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); } },
  openAssign(pal) { if (!pal) return; this._assignBack = document.activeElement; this.setState({ assignPalette: pal }, () => requestAnimationFrame(() => { const d = document.querySelector('[data-assign-dialog]'); if (d) { const b = d.querySelector('button'); if (b) try { b.focus(); } catch (e) { } } this._dialogIn('[data-assign-dialog]'); })); },
  closeAssign() { const back = this._assignBack; this._dialogOut('[data-assign-dialog]', () => this.setState({ assignPalette: null, announce: 'Move-to-project closed.' }, () => { if (back && back.focus) try { back.focus(); } catch (e) { } })); },
  /* The dialog STAYS OPEN on a project toggle. It used to close on every pick, which was right when
     picking was choosing — one slot, one answer, done. Now that a palette can be in several
     projects, closing after the first tick means reopening the dialog for the second, and the whole
     point of the change was that a palette can be in more than one place at once.
     Unfiled still closes: "belong to nothing" is a complete answer, so there is nothing left to
     say and the dialog would only be in the way. */
  pickAssign(projectId) {
    const pal = this.state.assignPalette;
    if (pal) this.assignPalette(pal.id, projectId);
    if (!projectId) this.closeAssign();
  },
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
    if (!res || !res.ok) { this.setState({ announce: 'Storage is full. Some palettes could not be saved, so back up to keep them.' }); if (!this._quotaNoticed) { this._quotaNoticed = true; this.showNotice('Storage is full. Back up to keep your palettes safe.'); } }
    else if (dropped > 0) { this.setState({ announce: 'Storage is nearly full. Older reference images were dropped to keep your palettes, so back up to keep them.' }); if (!this._quotaNoticed) { this._quotaNoticed = true; this.showNotice('Older reference images were reduced to free space. Back up to keep everything.'); } }
  },
};
