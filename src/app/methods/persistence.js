// Persistence (Workstream A): swappable storage adapter over localStorage, versioned schema with
// migration + validation, cross-tab sync, projects CRUD, and the portable project file.
import { ROLE_IDS } from '../../lib/exporters.js';
import { withoutRetired } from '../../lib/taxonomy.js';
import { shareUrl } from '../../lib/share.js';
import { buildMasks } from '../../lib/masks.js';

/* THE SEEDED EXAMPLES ARE THE APP'S CONTENT, NOT THE READER'S, and until now the store could not
   tell the difference.

   `hydrateFeed` returns the stored feed whenever there is one — "stored feed wins (even if empty),
   never re-seed over it" — which is exactly right for a palette someone made and exactly wrong for
   the eight the app ships. The example table changed, and every returning visitor went on being
   served the old one out of their own localStorage: Last Night, Poured Concrete, Powder and Ink and
   Ember, months after they stopped existing in the source. A first-time visitor and a returning one
   were looking at different products, and nothing in the app could ever correct it, because the
   condition it branches on is "is anything stored" rather than "is what is stored still current".

   SEED_VERSION is that missing question. It is written into the payload beside the schema version and
   read back on every load; when it moves, the stored examples are replaced by the current table and
   everything the reader actually made is kept exactly where it was.

   It is NOT the schema version. That one describes the SHAPE of a record and moves when a field is
   added or its meaning changes — a stored payload at the wrong schema cannot be read at all. This
   describes the CONTENT of the eight seeds and moves when the table is edited; a payload at the wrong
   seed version is perfectly readable, it is just out of date. Conflating them would mean either
   re-seeding on every unrelated schema bump or, worse, quietly not re-seeding on a table change,
   which is the bug being fixed.

   BUMP THIS WHENEVER makeSeed's TABLE CHANGES — a name, a hash, a swatch, an added or removed
   example. That is the whole contract, and it is the one thing a future edit to pipeline.js has to
   remember. */
const SEED_VERSION = 2;

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
    /* Here rather than in hydrateFeed, because this is the one door every load comes through — boot
       AND the cross-tab merge in _onStorage. A tab that reconciled and a tab that did not would
       otherwise disagree about which eight examples exist and then sync that disagreement. */
    const stale = (typeof migrated.seedVersion === 'number' ? migrated.seedVersion : 1) !== SEED_VERSION;
    return { feed: stale ? this._reseed(feed) : feed, projects, seeded: !!migrated.seeded, reseeded: stale };
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
        // REFINEMENT. Nothing in the app writes these any more — the Refine surface is out while it
        // is rebuilt — but palettes already in a library carry them, so they are read and preserved
        // exactly as before. Both are optional and both are allow-listed here for the reason the
        // comment above gives: a field this validator does not name is destroyed on the next
        // reload, on every cross-tab sync, and on every backup restore, silently and with no error.
        // These two carry a user's decisions, so losing them that way would be the worst possible
        // failure — and dropping them now would make removing a surface a data migration.
        sourceSwatches: src.length ? src : null,
        roles: this._validateRoles(p.roles, sw.length),
      });
    }
    return out;   // may be empty (user deleted everything) — that is a valid persisted state, not a re-seed trigger
  },
  /* Replace the seeded examples, keep everything the reader made.

     `example === true` is the whole test, and it is reliable because nothing else sets it: seedObj
     writes it and the generate, share and import paths do not. A palette someone made from one of
     these photographs is still their palette and does not carry the flag.

     ORDER IS THE FEED'S OWN. New palettes are prepended (`feed: [pal, ...st.feed]`), so a first load
     is the seeds alone and every later one is user work on top. Rebuilding as user-work-then-seeds
     restores exactly that shape rather than inventing a new one, and the library, the reel and the
     phone's chooser all read feed order.

     Nothing else has to be repaired. Memberships point from a palette to a project, never the other
     way, so dropping an example orphans nothing; `current` is null on boot unless a share link set
     it; and _storyCase falls through to the first example when the id it held is gone. */
  _reseed(feed) {
    const mine = feed.filter((p) => p.example !== true);
    const seeds = this.makeSeed();
    const taken = new Set(mine.map((p) => p.id));
    return mine.concat(seeds.filter((p) => !taken.has(p.id)));
  },
  hydrateFeed() {
    const parsed = this.loadPersisted();
    // Stored feed still wins for everything the reader made; only the seeded examples were replaced
    // above, and that replacement is written back on mount so the next load reads it as current.
    if (parsed) { if (parsed.reseeded) this._needSeedPersist = true; return parsed.feed; }
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
  // What is IN a folder, in library order, ignoring whatever the archive is currently scoped or
  // filtered to. Exporting a project must write the whole project — a filter is a way of looking at
  // the library, never a silent edit to what a folder contains — so this reads the feed, not
  // scopedFeed. Used by the manage rows' counts and by the whole-project export.
  projectPalettes(id) { return (this.state.feed || []).filter((p) => this.inProject(p, id)); },
  // Scoping the archive replaces every row in it, so it takes the same arrival as a page change:
  // the list restates itself top-down instead of cutting to a different set in place.
  //
  // Reveal WITHOUT the anchor scroll that setPage/setPageSize use, deliberately. The chips and the
  // filter drawer sit ABOVE the list, so anchoring would scroll the control you just clicked off the
  // top of the screen — the cure would be worse than the jump. Paging is different: the pager is
  // below the list, so anchoring moves toward what you were touching, not away from it.
  // Folders hold different counts, so the list's height changes with the scope — see _listFreezeHeight
  // for why that has to be ramped rather than stepped. Freeze BEFORE the swap, ramp after it.
  // _revealProjChip rides HERE rather than in componentDidUpdate, and that placement is the whole
  // safeguard: this is the one path a scope change comes through, so the container moves when the
  // user chooses and at no other time. Hung off the render pass it would re-assert itself on every
  // unrelated update and fight anyone scrolling the row by hand.
  setActiveProject(id) { this._listFreezeHeight(); this.setState({ activeProject: id, page: 0, announce: (id === null ? 'Showing all palettes.' : id === '__unfiled__' ? 'Showing Unfiled palettes.' : 'Showing project ' + this.projectName(id) + '.') }, () => { if (this.state.feedView === 'grid') this.buildUniverse(); this._revealProjChip(); this._listRowsReveal(); this._listSettleHeight(); }); },
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
  /* THE ACT IS CONFIRMED, VISIBLY. Filing a palette used to say so in `announce` alone — which is
     the live region, which is to say: to screen readers only. Everyone else got a 6px dot appearing
     beside a row and had to infer from it that a specific palette had joined a specific folder. The
     one question the dialog raises ("did that do anything?") was answered for the smallest group of
     the people asking it.
     So the same sentence goes to both channels now. The notice names the palette AND the project,
     because "Added." would confirm that something happened without confirming what — and this
     dialog's whole job is that the user picked THIS palette for THAT folder. */
  assignPalette(palId, projectId) {
    const pid = projectId || null;
    // Read the sentence off the CURRENT record rather than building it inside the updater: it is
    // needed in two places now (the live region and the visible notice), and an updater that writes
    // to a variable outside itself is a side effect React is entitled to run twice.
    const cur = (this.state.feed || []).find((p) => p.id === palId);
    if (!cur) return;
    const msg = !pid ? cur.name + ' removed from every project.'
      : cur.name + (this.inProject(cur, pid) ? ' removed from ' : ' added to ') + this.projectName(pid) + '.';
    this.setState((st) => ({
      feed: st.feed.map((p) => {
        if (p.id !== palId) return p;
        if (!pid) return this.withProjects(p, []);
        const has = this.inProject(p, pid);
        return this.withProjects(p, has ? this.palProjects(p).filter((x) => x !== pid) : this.palProjects(p).concat([pid]));
      }),
      announce: msg,
    }), () => { this.persist(); this.showNotice(msg); });
  },
  deleteProject(id) {
    const st = this.state; const idx = st.projects.findIndex((p) => p.id === id); if (idx < 0) return;
    const project = st.projects[idx]; const palIds = st.feed.filter((p) => this.inProject(p, id)).map((p) => p.id);
    this._deleted = null; this._deletedProject = { project, index: idx, palIds };
    const projects = st.projects.slice(0, idx).concat(st.projects.slice(idx + 1));
    const feed = st.feed.map((p) => this.inProject(p, id) ? this.withProjects(p, this.palProjects(p).filter((x) => x !== id)) : p);
    // 'Project deleted', not 'Project Deleted'. This is the only toast label written by hand — every
    // other one is built as `name + ' deleted'` and arrives in sentence case — so Title Case here made
    // one status line in the app speak differently from the rest of them. It also contradicted the
    // rule recorded on the toast itself, where a capitalize transform was removed for turning whole
    // sentences into 'Dry Season Deleted': a status line is prose, and prose is sentence case. The
    // notice bar beside it carries full sentences for the same reason.
    const patch = { projects, feed, toast: { name: project.name + ' project', label: 'Project deleted' } };
    if (st.activeProject === id) patch.activeProject = null;
    patch.announce = 'Project ' + project.name + ' deleted. Its ' + palIds.length + ' palette(s) moved to Unfiled. Undo available.';
    // No auto-dismiss: the toast holds an action, so it stays until Undo, the ✕, or the next
    // deletion replaces it — see the note in overlays.js where the palette path says the same.
    // A deletion reflows the row, and if the deleted project WAS the scope the app has just fallen
    // back to All — which sits at the far left of a group that may be scrolled well past it. Same
    // reveal, same reason: the active chip should never be the one you cannot see.
    this.setState(patch, () => { this.persist({ immediate: true }); this._toastIn(); this._revealProjChip(); if (this.state.feedView === 'grid') this.buildUniverse(); });
  },
  // ---- portable project file (accountless permanence) — DISTINCT from token export ----
  buildProjectFile(scope) {
    const st = this.state; let projects, palettes;
    if (scope === 'library') { projects = st.projects.slice(); palettes = st.feed.slice(); }
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
    if (scope === 'library') fn = 'atmos_library_backup_' + date + '.json';
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
  // Every modal dialog's exit, on the overlays' own band and the one curve.
  // DUR.overlayOut rather than DUR.overlay: a dismissal has already been decided, so nothing waits
  // on it and it can afford to be the slower of the two.
  // The modal half of the one exit contract — motion.js names this and _drawerOut together, so the
  // two have to actually agree. Geometry leaves on EASE.overlayExit (from rest, quickest through
  // the middle, gone) and the scrim fades on EASE.overlayFadeOut; both used to run the ARRIVAL curve,
  // which put peak velocity on the first frame and then spent two thirds of the duration finishing
  // a move nobody could still see.
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
  /* THE LIST'S SCROLL POSITION, held across the trip down to a palette and back. The list is not a
     layer that stays behind the palette — it unmounts outright (see AppView's early returns), so
     the browser has no scroller left to restore and every return landed at the top of a list
     somebody had scrolled halfway down. Captured on the way out, applied on the way back, in the
     same commit the list remounts in so nothing paints at the wrong offset first. */
  _holdListScroll() { const el = document.querySelector('[data-mobile-list]'); this._listScroll = el ? el.scrollTop : 0; },
  /* Focus goes back on the row that was opened, for the same reason the offset does — the row
     unmounted under the reader's cursor and focus fell to the body, so a keyboard or switch user
     came back to a list they had to tab into from the top. preventScroll because the offset above
     has ALREADY put the row where it belongs; letting focus() scroll as well would undo it. */
  _restoreListScroll() {
    const el = document.querySelector('[data-mobile-list]'); if (!el) return;
    if (this._listScroll) el.scrollTop = this._listScroll;
    const row = this._listRowId && el.querySelector('[data-ml-row="' + this._listRowId + '"]');
    if (row && row.focus) { try { row.focus({ preventScroll: true }); } catch (e) { } }
  },
  /* Opening a NAMED example from the list keeps the cursor in step, so leaving the list and
     pressing the gate again continues from what you last looked at rather than jumping back.

     A LEVEL CHANGE, so the level being left has to leave. Every other trip between these two
     surfaces already pairs an exit with an entrance — openExampleList plays _shareOut before the
     list arrives, closeExampleOnPhone plays it before the list comes back — and this one alone cut
     straight to showExample. The list vanished in a single frame and the palette then spent
     DUR.reveal rising out of an empty screen: the surface that was there did not leave, it was
     deleted, which is the jump. _listClosing is the same guard closeExampleList holds, because two
     exits of one surface must not overlap whichever way the reader is going. */
  openExampleById(id) {
    const list = this._examples();
    const i = list.findIndex((p) => p.id === id);
    if (i < 0) return;
    this._exIdx = i;
    if (!this.state.exampleList) { this.showExample(list[i]); return; }
    if (this._listClosing) return;
    this._listClosing = true;
    this._listRowId = id;
    this._holdListScroll();
    this._listOut(() => { this._listClosing = false; this.showExample(list[i]); });
  },
  showExample(ex) {
    if (!ex) return;
    /* THE STAGE UNDERNEATH TAKES THE PALETTE WITH IT. The phone does not replace the landing when it
       opens an example, it covers it (see LandingStage's `covered`) — so the field the reader comes
       back to is the same one they left, and it now comes back as a reading of the palette they went
       to look at. See setFieldPalette in methods/orbit.js.
       BEFORE the setState, not inside its callback, and that is the difference between a dissolve
       and a cut: _landingLit() is still true here, so the ramp crossfades over the same beat the
       read-only panel is arriving in. One commit later the stage is covered and the swap would be
       written straight in, under a panel that has not finished arriving. */
    this.setFieldPalette(ex);
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
        // Scroll BEFORE the entrance, and outside it: _listIn returns early under reduced motion,
        // and the position you were holding is not an animation — it is where you were.
        if (this.state.exampleList) { this._restoreListScroll(); this._listIn(); }
      });
    });
  },
  /* ===== THE PHONE'S STORY ==================================================================

     Four acts and a build step. None of them touches the orb formation: the story covers nothing,
     so the stage below it is never killed, never re-inited, and never parked — which is the whole
     reason chapter 1 can be transparent.

     THE MASKS ARE BUILT ONCE PER CASE, OFF THE RENDER PATH. buildMasks decodes the case image and
     classifies it against the palette's own OKLab coordinates (src/lib/masks.js) — measured at
     15-34ms across the eight examples, which is cheap but is emphatically not something to do inside
     a render or a scroll handler. So it runs from here, writes state once, and every later render
     reads the result. The case id travels WITH the masks: a set built for one photograph must never
     be painted over another, and comparing ids is how that is guaranteed rather than hoped for. */
  buildStoryMasks() {
    const p = this._storyCase();
    if (!p || !this.hasImg(p)) return;
    if (this.state.storyMasks && this.state.storyMasks.caseId === p.id) return;
    if (this._maskBuilding === p.id) return;      // one build in flight per case
    this._maskBuilding = p.id;
    const src = this.dispUrl(p);
    if (!src) { this._maskBuilding = null; return; }
    const img = new Image();
    // decode() rather than onload: onload fires before the pixels are necessarily decodable, and
    // drawImage on a not-yet-decoded frame is the classic source of an all-transparent read.
    img.src = src;
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      this._maskBuilding = null;
      // BY ID, NEVER BY OBJECT IDENTITY. This callback crosses an async boundary, and any reload of
      // the feed — a cross-tab sync, a restore, a re-validation on read — rebuilds every palette
      // record, so the object captured when the decode started is not the object the story is
      // showing by the time it finishes, even when it is the same palette. An id survives that;
      // a reference does not.
      const now = this._storyCase();
      if (!this._alive || !now || now.id !== p.id) return;
      const built = buildMasks(img, now.swatches);
      // A null build is a real state, not a failure to report: the chapter shows the photograph
      // whole and offers no regions. Stored either way so it is not retried on every render.
      this.setState({ storyMasks: { caseId: now.id, urls: (built && built.urls) || now.swatches.map(() => null) } });
    };
    if (img.decode) { img.decode().then(done, done); } else { img.onload = done; img.onerror = done; }
    /* AND A BACKSTOP, because a decode that never settles latches `_maskBuilding` forever and every
       later call returns at the guard above — chapter 4 would then offer no regions for the rest of
       the visit, silently, with the image plainly on screen. `decode()` does not settle at all while
       the document is hidden in some browsers, which is exactly the case a retry has to survive.
       A timer rather than rAF, for the reason pageReveal states about its own rescues: a stalled or
       backgrounded document is precisely where rAF stops being delivered. */
    if (this._maskT) clearTimeout(this._maskT);
    this._maskT = setTimeout(() => {
      if (settled) return;
      this._maskBuilding = null;                 // let a later call try again
      if (img.complete && img.naturalWidth) done();
    }, 4000);
  },

  /* Chapter 4's selection. A second press on the chosen swatch clears it — the picture goes back to
     whole — because the only other way out of the state would be a control that says "show all",
     and a toggle the finger already knows is better than a fourth button. */
  pickStorySwatch(i) {
    const row = (this.state.storyMasks && this.state.storyMasks.urls[i]) ? i : null;
    if (row === null) return;                     // no region: the control is disabled anyway
    const next = this.state.storySwatch === i ? null : i;
    const p = this._storyCase();
    const sw = p && p.swatches[i];
    const hex = sw ? sw.hex.toUpperCase() : '';
    this.setState({
      storySwatch: next,
      announce: next === null ? 'Showing the whole photograph.' : 'Showing where ' + hex + ' appears in the photograph.',
    });
  },

  /* THREE READINGS, ONE GESTURE. The panel is replaced wholesale by React, so without this the swap
     is two frames: the old answer is deleted and the new one is simply there, at a different height.
     Measured across the three, the height swings 267px (231 / 498 / 484), so the content below it
     jumped by most of a screen — which is the part that reads as static rather than the absence of a
     fade. A surface that is deleted rather than left is the jump this codebase has already fixed
     twice on the phone.

     TWO MOVES, BOTH ON THE APP'S OWN TOKENS. The container folds from its old height to its new one
     on DUR.fold / EASE.fold — deliberately the same pair the toggle's pill is travelling on, so the
     pill and the panel are one gesture rather than two things that happen to move at once; initMotion
     already argues that a disclosure and a moving selection share one motion character. The rows then
     arrive on the app's reveal length and entrance curve, staggered by DUR.stagger, which is the list
     cascade every other set on this site arrives with.

     `clearProps:'height'` because the fold's end state is auto, not a number: leaving a measured
     height on the element would freeze the panel at whatever the viewport was when it was pressed.

     Guarded on _reduce and on gsap: with either missing the swap is instant, which is the floor the
     whole surface is built on and is what a reader who asked for less motion should get. */
  setStoryTab(id) {
    if (this.state.storyTab === id) return;
    const panel = document.querySelector('[data-story-panel]');
    const from = panel ? panel.getBoundingClientRect().height : 0;
    // The panel's rows are replaced wholesale, and a screen reader that was sitting in the old one
    // gets no other signal that the answer changed — so the change is spoken.
    this.setState({ storyTab: id, announce: id === 'role' ? 'Showing the roles this palette would take.' : id === 'contrast' ? 'Showing the contrast this palette can carry.' : "Showing the palette's character." }, () => {
      const next = document.querySelector('[data-story-panel]');
      if (!next || this._reduce || !window.gsap || !from) return;
      const g = window.gsap;
      const to = next.getBoundingClientRect().height;
      if (Math.abs(to - from) > 1) {
        g.fromTo(next, { height: from }, {
          height: to, duration: this.DUR.fold, ease: this.EASE.fold,
          overwrite: 'auto', clearProps: 'height',
        });
      }
      const rows = next.querySelectorAll('.story-facts__row, .about-role, .about-checks li');
      if (rows.length) {
        g.fromTo(rows, { autoAlpha: 0, y: 10 }, {
          autoAlpha: 1, y: 0, duration: this.DUR.reveal, ease: this.EASE.entrance,
          stagger: this.DUR.stagger, overwrite: 'auto',
          // The floor, restated: an interrupted run must not leave a row parked invisible.
          onInterrupt: () => { try { g.set(rows, { autoAlpha: 1, y: 0 }); } catch (e) { } },
        });
      }
    });
  },

  /* Chapter 7 — swapping the case the story is told with. The swatch selection has to go with it:
     an index into the old palette's masks is meaningless against the new one, and leaving it would
     paint the previous photograph's region over this one for exactly one frame. */
  setStoryCase(id) {
    if (!id || id === (this._storyCase() || {}).id) return;
    const p = this._examples().find((x) => x.id === id);
    if (!p) return;
    // The field is the prologue's visual — chapter 1 is transparent onto it — so a story that
    // changes which palette it is telling has to change which palette the field is. See showExample.
    this.setFieldPalette(p);
    this.setState({ storyCaseId: id, storySwatch: null, storyMasks: null, announce: 'Now reading ' + p.name + '.' }, () => {
      this.buildStoryMasks();
      // Back to the chapter that introduces a picture, not to the top: the reader chose a case, so
      // the answer to that press is the new photograph, not the prologue they have already read.
      this.scrollStoryTo('[data-story-ch="image"]');
    });
  },

  /* THE ENTRY ACT, and the jump home for a case swap. Through Lenis when it is there, natively when
     it is not — `_lenis` is armed asynchronously with up to 40 retries and is never created at all
     under reduced motion, so a call site that assumes it exists is a control that does nothing on
     the two occasions it matters most. Same guard aboutDock uses for its anchors. */
  scrollStoryTo(sel) {
    const el = document.querySelector(sel);
    if (!el) return;
    if (this._lenis && this._lenis.scrollTo) { try { this._lenis.scrollTo(el, { offset: 0 }); return; } catch (e) { } }
    try { el.scrollIntoView({ behavior: this._reduce ? 'auto' : 'smooth', block: 'start' }); } catch (e) { el.scrollIntoView(); }
  },
  beginStory() { this.scrollStoryTo('[data-story-ch="image"]'); },

  /* THE HANDOFF, and it is a real one.

     `Save for Desktop` copied the site's ROOT — the reader arrived on a desktop and had to find the
     palette again, which is the overpromise the brief calls out. shareUrl() seals THIS palette into
     the fragment, so the machine that opens it opens on the case the reader was just reading.

     navigator.share where it exists, because on a phone the share sheet is how a link gets to
     another device — AirDrop, Messages, the reader's own mail — and a clipboard cannot cross
     machines. The clipboard is the fallback, not the plan. Both paths end in the same confirmation:
     the label swaps and the live region says what happened, which is the house pattern and needs no
     notice element (there is none mounted on this branch). */
  sendStoryToDesktop() {
    const p = this._storyCase();
    if (!p) return;
    const url = shareUrl(p);
    if (!url) { this.setState({ announce: 'This palette can\u2019t be shared.' }); return; }
    const after = () => { this.setState({ copied: 'story-send' }); if (this._copyT) clearTimeout(this._copyT); this._copyT = setTimeout(() => this.setState({ copied: null }), 1500); };
    if (navigator.share) {
      // A colon, not the em dash this carried. It is the one string here that leaves the app
      // entirely — it is what the share sheet shows and what lands in the recipient's message —
      // so it is product copy wearing a title's clothes, and it follows the same rule as the rest.
      navigator.share({ title: 'Atmos Gallery: ' + p.name, text: 'Open ' + p.name + ' on a wider screen to read your own image.', url })
        .then(() => { this.setState({ announce: 'Shared. Open it on a wider screen to read your own image.' }); after(); },
          // A dismissed share sheet is not an error and must not be reported as one; the reader
          // decided not to send it, which is a complete outcome.
          () => { });
      return;
    }
    this.copy(url, 'story-send', 'Link copied. Open it on a wider screen to read your own image.');
  },

  /* ===== CHOOSING THE STORY'S IMAGE =========================================================

     `Explore Another Palette` used to open the read-only share view, which was a different product:
     a palette on a page, with the story left behind. What the reader is being offered at the end of
     a story is ANOTHER STORY, so the act opens a chooser and the whole surface re-tells itself about
     whatever comes back. Same structure, same eight chapters, same components; a different image and
     therefore different numbers, roles, contrast, reading and masks — all of which already flow from
     _storyCase(), so choosing is one state field.

     THE LEVEL CHANGE IS STAGED, which is this codebase's rule for the phone rather than a preference:
     "Every surface change on the phone must be staged: an exit paired with an entrance... A setState
     between two frames is a defect here." The picker leaves through the shared _exitTween before the
     story re-enters, and the story lands at 1.1 rather than wherever the reader happened to be
     standing when they opened it — a new case read from the middle of the old case's scroll position
     is a story starting in the third act. */
  /* BOTH DIRECTIONS RUN THE SITE'S OWN TRANSITION, and that is the correction.

     The cycle used to leave through a local crossfade: the picker faded in, faded out, and the story
     re-entered on a block slide. Every other place in this product where the whole screen becomes a
     different document — the tool to /about, /about to /privacy, the intro to the tool — plays the
     curved wipe with the wordmark. The one on the phone was the odd one out, and it is the one that
     changes the most: a chooser takes the entire viewport, and the story that comes back is eight
     chapters about a different photograph. If any swap on this site is a page transition, it is this.

     So both directions call _wipeCover — the same panel, caps, brand beat, drift, inert guard, focus
     hand-off and watchdog navigateTo uses. See its header for why the mechanism moved rather than
     being copied. */
  openStoryPicker() {
    if (!this._examples().length) return;
    if (this._wipeRunning) return;
    this._wipeCover({
      commit: (after) => this.setState({
        storyPicker: true,
        announce: 'Choose an image. Swipe or use the arrows, then pick the one in the middle.',
      }, after),
      /* The slider builds in componentDidUpdate, behind the panel, which is strictly better than it
         was: it used to assemble eight slides, measure its own strip and lay out its titles in front
         of the reader. Nothing to arm and nothing to release — the picker IS the arrival. */
      focusTarget: () => document.querySelector('[data-story-picker]'),
    });
  },
  /* DISMISSING IS NOT ARRIVING. Escape or the close control puts the reader back exactly where they
     were standing, on the story that is still mounted behind the picker with its scroll position and
     its masks intact. Nothing became a different document, so nothing earns the wipe — spending the
     full brand gesture on "I changed my mind" would say a change happened that did not.

     It still leaves rather than vanishing, which is the house rule for every covering surface on the
     phone: an exit paired with an entrance, never a setState between two frames. */
  closeStoryPicker() {
    if (!this.state.storyPicker) return;
    if (this._pickerClosing) return;
    this._pickerClosing = true;
    this._exitTween('[data-story-picker]', () => {
      this._pickerClosing = false;
      this.setState({ storyPicker: false, announce: 'Closed the image chooser.' });
    });
  },
  chooseStoryCase(id) {
    const ex = this._examples().find((x) => x.id === id);
    if (!ex) return;
    if (this._pickerClosing || this._wipeRunning) return;
    this._pickerClosing = true;
    // Same reason as setStoryCase: the reader is choosing which palette the phone's whole surface is
    // about, and the field behind chapter 1 is part of that surface.
    this.setFieldPalette(ex);

    this._wipeCover({
      commit: (after) => {
        this._pickerClosing = false;
        /* The case first, then the picker, in ONE commit: closing the picker in its own setState
           would paint one frame of the OLD story behind the gap the picker left. Behind the cover
           that is no longer visible either way, and it stays one commit regardless — a second render
           of a surface this size is worth avoiding on a phone whether or not anyone can see it. */
        this.setState({
          storyPicker: false,
          storyCaseId: id,
          storySwatch: null,
          storyMasks: null,
          announce: 'Now reading ' + ex.name + '. Starting again from the top.',
        }, () => {
          this.buildStoryMasks();

          /* THE TOP, AND NOTHING SHORT OF IT.

             This scrolled to 1.1 and landed imprecisely, because the order was wrong rather than the
             target. componentDidUpdate rebuilds the scroll modules against the remounted <main> — and
             one of them PINS, which inserts a spacer and changes the document's height. Scrolling to
             an element's offset before that settles anchors against a page that is about to be a
             different one, so the reader ended up part-way into a chapter.

             Position 0 is the one target immune to it: it is the same number before and after any
             reflow. It is also the right one — a story being re-told about a different image starts
             at its own beginning, not one chapter in.

             Through Lenis rather than around it, for the reason navigateTo records at its own commit:
             Lenis owns the scroll while it is running, and going around it leaves its internal
             position stale so the next gesture jumps. Then a refresh, so every trigger re-measures
             against the page the reader is actually on before anything reads a position again.

             All of it now happens under the panel, which is what the cover is FOR: the pin's spacer
             landing, the height changing, every trigger re-measuring and the scroll snapping to zero
             were all things the reader used to watch happen. */
          try {
            if (this._lenis) this._lenis.scrollTo(0, { immediate: true });
            else window.scrollTo(0, 0);
          } catch (e) { try { window.scrollTo(0, 0); } catch (_) { } }
          try { if (window.ScrollTrigger) window.ScrollTrigger.refresh(); } catch (e) { }

          after();
        });
      },
      /* Nothing to arm here that _syncStory has not already armed. It reads _arrivingByWipe, which
         _wipeCover set before commit ran, and holds its page reveal rather than playing it. */
      reveal: () => this._playStoryReveal(),
      // No cover to wait behind: the story arrives on its own reveal, immediately.
      reduced: () => this._playStoryReveal(),
    });
  },

  /* THE MARK GOES HOME, from either phone surface, in one step.

     NOT showIntroAgain(), which is what the mark calls in the tool. That routine is written for a
     landing that is NOT on screen — it kills the orb field and re-inits it on the next tick, because
     on a desktop the landing was unmounted and has to be rebuilt. On a phone the landing is always
     mounted, sitting `covered` under these two surfaces precisely so the formation is never torn
     down and rebuilt with a visible hole in it while its textures upload. Calling the desktop
     routine here would reintroduce exactly the fault that design exists to prevent.

     NOT closeExampleOnPhone() either, which goes UP one level and is right for a control that says
     "back". The mark is not a back button; it is the way home from anywhere, so it clears the view
     flags and lands on the gate whichever surface it was pressed from.

     THE SHARED ARRIVAL WAS THE ONE IT COULD NOT LEAVE, and it failed in the worst available way.
     MobileShareView serves two arrivals behind two separate flags — `exampleView` for one you chose,
     `sharedView` for one somebody sent you — and this routine cleared the first and never the
     second. `_mobileShare()` reads `(sharedView || exampleView)`, so on a shared link the mark ran,
     wrote "Returned to the start screen." into the live region, and left the surface exactly where
     it was: a focusable control with an aria-label promising a destination, an announcement saying
     it had arrived, and nothing moved. A screen reader was told the page had changed when it had
     not, which is worse than a button that visibly does nothing. Measured before the fix at 900px on
     a real share link — announcement present, `[data-mobile-share]` still mounted, hash still in the
     address bar.

     THE SHARED CASE TAKES THREE MORE STEPS THAN THE EXAMPLE ONE, and each is a state that would
     otherwise outlive the surface it belongs to:
       · the hash — left in place, a reload would reopen a stranger's palette over whatever the
         reader had moved on to. That is the whole reason _clearShareHash exists; saveShared and
         makeOwnFromShared already call it and this is the third way off the surface.
       · `current` — a shared palette is not in the archive and is not theirs. Left set, widening
         past the supported minimum would put someone else's palette on the result stage with the
         `sharedView` flag now false, which is the tool saying "this is yours" about a thing it was
         handed by a link.
       · `stage` — a shared arrival constructs at 'result'. 'upload' is the stage the gate and the
         story stand in front of, so this lands the same state a first visit has.
     The example case keeps all three: `current` is deliberately untouched there, because the gate's
     next press continues from the example you last looked at, which is the cursor openExampleById is
     careful to keep in step. Neither `_examples()` nor `gateHasExample` reads `current`, so clearing
     it on the shared path cannot disturb that cursor.

     The exit still plays, and now it plays for both arrivals. Every trip between these surfaces
     pairs an exit with an entrance, and a surface that is deleted rather than left is the jump this
     file has already fixed twice — so whichever one is on top leaves the way it would have left
     anyway. `_shareOut` is the share surface's exit whichever flag put it there. */
  returnToGateOnPhone() {
    if (this._shareClosing || this._listClosing) return;
    const wasShared = !!this.state.sharedView;
    const land = () => this.setState(
      wasShared
        ? { sharedView: false, exampleView: false, exampleList: false, stage: 'upload', current: null, imageUrl: null, announce: 'Returned to the start screen.' }
        : { exampleView: false, exampleList: false, announce: 'Returned to the start screen.' },
      wasShared ? () => this._clearShareHash() : undefined);
    if (this.state.exampleView || wasShared) {
      this._shareClosing = true;
      this._shareOut(() => { this._shareClosing = false; land(); });
    } else if (this.state.exampleList) {
      this._listClosing = true;
      this._listOut(() => { this._listClosing = false; land(); });
    } else { land(); }
  },
  /* Called from two places, and it has to mean the same thing in both: SHOW me the list. From the
     gate that is one state flip. From an open palette it is a level change, so the palette has to
     leave first — setting the flag alone armed the list UNDER a surface that stayed on top, which
     turned one tap into two and made "See all examples" look broken. */
  openExampleList() {
    if (this.state.exampleList && !this.state.exampleView) return;
    // Reached only from OUTSIDE the list (the control is hidden while inList), so this is a fresh
    // arrival at it and the top is where it belongs — a held offset here would be from some earlier
    // visit and would read as the list opening halfway down for no reason.
    this._listScroll = 0; this._listRowId = null;
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
    this.copy(href, 'gate-link', 'Link copied. Open it on a wider screen to read your own image.');
  },
  trapFocusIn(sel, e) { if (e.key !== 'Tab') return; const root = document.querySelector(sel); if (!root) return; const f = [...root.querySelectorAll('button,[href],input,select,[tabindex]:not([tabindex="-1"])')].filter((n) => !n.disabled && n.offsetParent !== null); if (!f.length) return; const first = f[0], last = f[f.length - 1]; if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); } },
  /* THE DRAFT IS SEEDED FROM THE LIVE RECORD, and the difference is not academic. Callers hand this
     whatever palette object they are holding: the row hands its own, but the result stage hands
     state.current, which confirmAssign does not rewrite — it maps `feed`. So seeding from the
     argument showed the memberships that palette had when it was LOADED, and reopening the picker
     after a confirm offered a draft that had forgotten what was just saved. Measured exactly that
     way: confirm put Garnet in Ochre, reopening showed Ochre unticked.
     `feed` is the archive, so the record in it is the answer; the argument is only how we know which
     palette is meant. It falls back to the argument for a palette not in the feed — a shared link
     being viewed, which has no archive record to read. */
  openAssign(pal) { if (!pal) return; this._assignBack = document.activeElement; const liveRec = (this.state.feed || []).find((p) => p.id === pal.id) || pal; this.setState({ assignPending: this.palProjects(liveRec).slice(), assignPalette: pal }, () => requestAnimationFrame(() => { const d = document.querySelector('[data-assign-dialog]'); if (d) { const b = d.querySelector('button'); if (b) try { b.focus(); } catch (e) { } } this._dialogIn('[data-assign-dialog]'); })); },
  closeAssign() { const back = this._assignBack; this._dialogOut('[data-assign-dialog]', () => this.setState({ assignPalette: null, announce: 'Move-to-project closed.' }, () => { if (back && back.focus) try { back.focus(); } catch (e) { } })); },
  /* The dialog STAYS OPEN on a project toggle. It used to close on every pick, which was right when
     picking was choosing — one slot, one answer, done. Now that a palette can be in several
     projects, closing after the first tick means reopening the dialog for the second, and the whole
     point of the change was that a palette can be in more than one place at once. */
  /* A TAP MOVES THE PENDING SET, NOT THE ARCHIVE. This called assignPalette() straight away, so
     picking the wrong folder filed the palette in it and the only way back was to notice the tick
     and tap again. Now the dialog is a draft: every tap toggles membership in state, Confirm writes
     it, and closing throws it away.
     There is no id-less call any more: the branch here that emptied the set was the Unfiled row's,
     and unticking the projects one at a time is what empties it now. */
  pickAssign(projectId) {
    if (!projectId) return;
    /* THE UPDATER FORM, because this reads the value it is about to replace. Reading
       this.state.assignPending and setting the result works for one tap and silently drops work for
       two in the same batch: both toggles see the pre-batch set, and the second overwrites the
       first. Caught by untickig two rows in one tick — [Scan, Eliza] came back as [Scan] instead of
       empty, because the Eliza handler never saw Scan leave. A pointer cannot produce that (two
       clicks are two events, and React flushes between them), but a keyboard repeat, a test, or any
       future caller that loops over rows can, and there is no cost to being right. */
    this.setState((st) => {
      const cur = st.assignPending || [];
      return { assignPending: cur.indexOf(projectId) >= 0 ? cur.filter((id) => id !== projectId) : cur.concat([projectId]) };
    });
  },
  /* THE COMMIT, and the only place the picker touches the feed. withProjects takes the whole set
     rather than toggling one id, so what lands is exactly what the dialog showed — no replay of
     individual taps, and no chance of the two disagreeing.
     The sentence names the palette and where it ended up, because "Saved." would confirm that
     something happened without confirming what, which is the fault the old per-tap notice was
     written to fix. */
  confirmAssign() {
    const pal = this.state.assignPalette; if (!pal) return;
    const ids = (this.state.assignPending || []).slice();
    const names = ids.map((id) => this.projectName(id)).filter(Boolean);
    const msg = names.length
      ? pal.name + ' is in ' + (names.length === 1 ? names[0] : names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1]) + '.'
      : pal.name + ' is not in any project.';
    this.setState((st) => ({
      feed: st.feed.map((p) => (p.id === pal.id ? this.withProjects(p, ids) : p)),
      announce: msg,
    }), () => { this.persist({ immediate: true }); this.showNotice(msg); this.closeAssign(); });
  },
  // The project is created for real — it is a thing in the library either way — but joining it is
  // still a draft edit, so it lands in the pending set and waits for Confirm like every other row.
  newProjectAndAssign(name) { const id = this.createProject(name); if (id) { const pal = this.state.assignPalette; if (pal) setTimeout(() => this.setState((st) => ({ assignPending: (st.assignPending || []).concat([id]) })), 0); } },
  /* openManage / closeManage WERE HERE. The manage surface is no longer a dialog of its own — it is
     the Projects tab of the library panel — so its open, close, focus capture and arrival are the
     panel's (openTagFilter / closeTagFilter in overlays.js) and there is nothing left for a second
     pair to do. Everything a project IS still lives in this file: createProject, renameProject,
     deleteProject and the export below are untouched and are what that tab calls. */
  // Debounced save (immediate for delete/undo so a fast reload can't lose them).
  persist(opts) {
    const write = () => this.writePayload({ version: 1, seedVersion: SEED_VERSION, seeded: true, feed: this.state.feed, projects: this.state.projects });
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
