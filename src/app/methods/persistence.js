// Persistence (Workstream A): swappable storage adapter over localStorage, versioned schema with
// migration + validation, cross-tab sync, projects CRUD, and the portable project file.
import { ROLE_IDS } from '../../lib/exporters.js';
import { trackEvent } from '../../lib/track.js';
import { withoutRetired } from '../../lib/taxonomy.js';
import { shareUrl } from '../../lib/share.js';
import { buildMasks } from '../../lib/masks.js';
import { fitWords, noEmoji, NAME_MAX } from '../../lib/chars.js';

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
const SEED_VERSION = 7;   // 7: Frozen Slate re-read with look-alikes merged (24.09.26); 6: Dry Season's rationale is the supplied copy (14.09.26)

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
        // Renamed by the reader (23.09.26), which Name From reads as You. Absent means named by the reading.
        renamed: p.renamed === true,
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
     it; and _storyCase rolls a new example when the id it held is gone. */
  /* FILING SURVIVES THE RE-SEED, and it did not before. This replaced every example record with a
     fresh one from the table, which is right for the swatches and the copy — that is the whole point
     of the version — but those records also carry projectIds, and THAT is not ours: it is the one
     thing on an example that the reader made. So a seed bump silently emptied their projects of every
     example they had filed, while the paragraph above SEED_VERSION promised the opposite. Caught by
     bumping to 3 for the Hard Gunmetal swap and watching Garnet fall out of Scan and Eliza.
     Matched on id, which is hash + variation, so a palette keeps its filing across a change to its
     name, descriptors or rationale. A palette whose hash changed, or one dropped from the table, is a
     different palette and takes no filing with it — Ruled Open Country's assignments are gone by the
     same rule, which is correct: there is nothing left to file. */
  /* AND SO DOES A NAME THE READER GAVE (24.09.26). Since 23.09 an example can be renamed (renamePalette
     sets `renamed`), and the name is then theirs in the same way the filing is. The re-seed for Frozen
     Slate's re-read would have put the table's name back over it. Matched on id, like the filing. */
  _reseed(feed) {
    const mine = feed.filter((p) => p.example !== true);
    const stored = new Map(feed.filter((p) => p.example === true).map((p) => [p.id, p]));
    const seeds = this.makeSeed().map((p) => {
      const o = stored.get(p.id);
      const was = o ? this.palProjects(o) : null;
      const s = (was && was.length) ? this.withProjects(p, was) : p;
      return (o && o.renamed === true && typeof o.name === 'string' && o.name) ? Object.assign({}, s, { name: o.name, renamed: true }) : s;
    });
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
  // The Project facet: palettes in ANY ticked project (OR within the group, as every group is), all
  // of them when none is ticked.
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
  projectFeed(feed) { const a = (this.state && this.state.activeProjects) || []; if (!a.length) return feed; return feed.filter((p) => this.palProjects(p).some((id) => a.indexOf(id) >= 0)); },
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
  // ---- project CRUD + assignment (one flat axis; delete leaves its palettes in the library, with undo) ----
  // No project, no name: '' rather than a word for the absence (18.09.26, the Unfiled scope went).
  projectName(id) { if (!id) return ''; const p = this.state.projects.find((x) => x.id === id); return p ? p.name : ''; },
  // What is IN a folder, in library order, ignoring whatever the archive is currently scoped or
  // filtered to. Exporting a project must write the whole project — a filter is a way of looking at
  // the library, never a silent edit to what a folder contains — so this reads the feed, not
  // scopedFeed. Used by the manage rows' counts and by the whole-project export.
  projectPalettes(id) { return (this.state.feed || []).filter((p) => this.inProject(p, id)); },
  // Scoping the archive replaces every row in it, so it takes the same arrival as a page change:
  // the list restates itself top-down instead of cutting to a different set in place.
  //
  // Reveal WITHOUT the anchor scroll that setPage/setPageSize use, deliberately. The filter drawer
  // sits ABOVE the list, so anchoring would scroll the control you just clicked off the
  // top of the screen — the cure would be worse than the jump. Paging is different: the pager is
  // below the list, so anchoring moves toward what you were touching, not away from it.
  // Folders hold different counts, so the list's height changes with the scope — see _listFreezeHeight
  // for why that has to be ramped rather than stepped. Freeze BEFORE the swap, ramp after it.
  // A project is ticked and unticked like any facet value (19.09.26, the Project group in the Library
  // panel): same list pipeline as setFacet, and the announcement names the project, not its id.
  setProjectFilter(id) {
    this._listFreezeHeight();
    this.setState((st) => {
      const cur = st.activeProjects || [];
      const on = cur.indexOf(id) >= 0;
      return { activeProjects: on ? cur.filter((x) => x !== id) : cur.concat([id]), page: 0, announce: (on ? 'Removed the ' : 'Added the ') + this.projectName(id) + ' project filter.' };
    }, () => { if (this.state.feedView === 'grid') this.buildUniverse(); this._listRowsReveal(); this._listSettleHeight(); });
  },
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
    this.setState({ activeProjects: [], activeTags: [], activeA11y: [], activeLight: [], activeTemp: [], page: 0, announce: 'Filters cleared.' }, () => { if (this.state.feedView === 'grid') this.buildUniverse(); this._listRowsReveal(); this._listSettleHeight(); });
  },
  // The way out of a zero-result state that does not throw away everything else the user chose.
  // Order matters: the last filter added is the one most likely to have caused the conflict, and
  // filters are appended within their group, so the newest is the tail of whichever group is last.
  removeLastFilter() {
    const st = this.state;
    for (const key of ['activeTemp', 'activeLight', 'activeA11y', 'activeTags', 'activeProjects']) {
      const cur = st[key] || [];
      if (cur.length) { this._listFreezeHeight(); const gone = key === 'activeProjects' ? 'the ' + this.projectName(cur[cur.length - 1]) + ' project' : cur[cur.length - 1];
        this.setState({ [key]: cur.slice(0, -1), page: 0, announce: 'Removed ' + gone + ' filter.' }, () => { if (this.state.feedView === 'grid') this.buildUniverse(); this._listRowsReveal(); this._listSettleHeight(); });
        return; }
    }
  },
  createProject(name) {
    name = (name || '').trim(); if (!name) return null; const id = 'proj-' + Date.now() + Math.random().toString(36).slice(2, 6);
    this.setState((st) => ({ projects: [...st.projects, { id, name: name.slice(0, 60), createdAt: Date.now() }], announce: 'Project ' + name + ' created.' }), () => this.persist({ immediate: true })); return id;
  },
  renameProject(id, name) { name = (name || '').trim(); if (!name) return; this.setState((st) => ({ projects: st.projects.map((p) => p.id === id ? Object.assign({}, p, { name: name.slice(0, 60) }) : p), announce: 'Project renamed to ' + name + '.' }), () => this.persist({ immediate: true })); },
  /* RENAMING A PALETTE (23.09.26, by request). The field (AppView NameField) holds the length to 42 and
     will not hand over a longer name; the slice here is only the last line of that. The record takes
     `renamed`, which the readout's Name From reads as You, and the palette open in either view takes the
     new name with the library, so the page, the view and the list never disagree. Focus goes back to
     the pencil the rename started from when the field was left by Enter or Escape. */
  _renameRef(where) {
    this._renameRefs = this._renameRefs || {};
    return this._renameRefs[where] || (this._renameRefs[where] = (el) => { this._renameEls = this._renameEls || {}; this._renameEls[where] = el; });
  },
  // The field has just gone, so focus is nowhere; a reader who moved it on while the rule drew back keeps it.
  _renameFocus(where) {
    const el = this._renameEls && this._renameEls[where];
    if (el) requestAnimationFrame(() => { const at = document.activeElement; if (at && at !== document.body) return; try { el.focus({ preventScroll: true }); } catch (e) { } });
  },
  startRename(id, where) { this.setState({ renaming: { id, where } }); },
  // `refocus` only when the field was left by a key inside it (Enter or Escape); `said` is why a name did
  // not change, for the app's own live region, which outlives the field.
  cancelRename(where, refocus, said) { this.setState(said ? { renaming: null, announce: said } : { renaming: null }, () => { if (refocus) this._renameFocus(where); }); },
  /* A RENAME CAN BE UNDONE (24.09.26, from the audit's research: NN/g's user control and freedom, and
     Finder's Undo Rename). It replaced the reading's name for good. It joins the toast's run as a deletion
     does (overlays.js, ONE UNDO FOR EVERYTHING DELETED WHILE THE TOAST IS UP), so the one Undo puts back
     every name and every palette changed while the toast is up, newest first. The entry keeps the old name
     and whether it was already the reader's, so an undone rename reads from the reading again (Name From).
     The field already stops at the limit and takes no emoji; the save keeps both rules (lib/chars.js), and a
     name from before the limit was 32 that is edited but still longer loses its last whole words. */
  renamePalette(id, name, where, refocus) {
    name = fitWords(noEmoji(String(name || '')).replace(/\s+/g, ' ').trim(), NAME_MAX);
    const was = (this.state.feed || []).find((p) => p.id === id);
    if (!name || !was || name === was.name) { this.cancelRename(where, refocus); return; }
    const turned = this._keepToast();
    const standing = !!this.state.toast && !turned;
    this._deleted = this._undoRun(this.state).concat([{ rename: { id, from: was.name, fromRenamed: was.renamed === true } }]);
    const toast = this._undoToast(this._deleted), hint = this._undoHint(this._deleted);
    this.setState((st) => {
      const next = (p) => Object.assign({}, p, { name, renamed: true });
      const patch = { feed: st.feed.map((p) => p.id === id ? next(p) : p), renaming: null, toast, announce: 'Palette renamed to ' + name + '. ' + hint };
      if (st.current && st.current.id === id) patch.current = next(st.current);
      if (st.overlay && st.overlay.id === id) patch.overlay = next(st.overlay);
      return patch;
    }, () => { this.persist({ immediate: true }); if (!standing) this._toastIn(); if (refocus) this._renameFocus(where); });
  },
  /* TOGGLE, not move. Picking a project the palette is already in removes it; picking a new one
     adds it. Belonging to nothing is not a project: it is the empty set, reached by clearing,
     never a list to join. */
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
    // Joins the run the toast is holding, as a palette's deletion does (overlays.js deletePalette).
    const turned = this._keepToast();
    const standing = !!st.toast && !turned;
    this._deleted = this._undoRun(st).concat([{ project, index: idx, palIds }]);
    const projects = st.projects.slice(0, idx).concat(st.projects.slice(idx + 1));
    const feed = st.feed.map((p) => this.inProject(p, id) ? this.withProjects(p, this.palProjects(p).filter((x) => x !== id)) : p);
    // The label is sentence case, as every status line is (overlays.js _undoToast).
    const patch = { projects, feed, toast: this._undoToast(this._deleted) };
    if ((st.activeProjects || []).indexOf(id) >= 0) patch.activeProjects = st.activeProjects.filter((x) => x !== id);
    patch.announce = 'Project ' + project.name + ' deleted. Its ' + palIds.length + ' palette(s) stay in your library. ' + this._undoHint(this._deleted);
    // No auto-dismiss: the toast holds an action, so it stays until Undo or the ✕, and a further
    // deletion joins it — see the note in overlays.js where the palette path says the same.
    // A deletion reflows the row, and if the deleted project WAS the scope the app has just fallen
    // back to All — which sits at the far left of a group that may be scrolled well past it. Same
    // reveal, same reason: the active chip should never be the one you cannot see.
    this.setState(patch, () => { this.persist({ immediate: true }); if (!standing) this._toastIn(); if (this.state.feedView === 'grid') this.buildUniverse(); });
  },
  // ---- portable project file (accountless permanence) — DISTINCT from token export ----
  /* ONE PROJECT OR EVERYTHING (18.09.26, by request: "even if a palette doesn't live in a folder,
     it should still be backed up"). A scope that is not a project id — 'library', All's null, or
     an id since deleted — backs up the whole library, where it used to back up only the palettes
     in no project, under the name "unfiled". So a palette outside every folder is in every backup
     except one taken of a single project, and that one is a project's by definition. */
  _backupProject(scope) { return this.state.projects.some((p) => p.id === scope) ? scope : null; },
  buildProjectFile(scope) {
    const st = this.state; let projects, palettes;
    const pid = this._backupProject(scope);
    if (!pid) { projects = st.projects.slice(); palettes = st.feed.slice(); }
    else { projects = st.projects.filter((p) => p.id === pid); palettes = st.feed.filter((p) => this.inProject(p, pid)); }
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
    const pid = this._backupProject(scope);
    if (!pid) fn = 'atmos_library_backup_' + date + '.json';
    else fn = 'atmos_project_' + this.slugName(this.projectName(pid)) + '_' + date + '.json';
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
    rdr.onload = () => { let obj = null; try { obj = JSON.parse(rdr.result); } catch (e) { this.showNotice('That file couldn’t be read. It may be damaged, or not a palette project file.', { sticky: true }); return; } this.previewProjectFile(obj, file.name || ''); };
    rdr.onerror = () => this.showNotice('Couldn’t open that file.', { sticky: true });
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
    if (read.error) { this.showNotice(read.error, { sticky: true }); return; }
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
  confirmRestore() { this._closeRestore((pending) => { if (pending) { this.mergeProjectFile(pending); trackEvent('Library Restored', { palettes: (pending.palettes || []).length }); } }); },
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
  _dialogIn(sel) { const g = window.gsap; if (this._reduce || !g) return; const root = document.querySelector(sel); if (!root) return; const bk = root.parentElement && root.parentElement.querySelector('[data-modal-backdrop]'); if (bk) g.from(bk, { opacity: 0, duration: this.DUR.state, ease: this.EASE.standard }); g.from(root, { opacity: 0, y: 12, scale: 0.98, duration: this.DUR.state, ease: this.EASE.entrance, transformOrigin: 'center center', clearProps: 'transform' }); },
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
  // The toggletips' open and close (_tipIn, _tipOut, openTip, closeTip, toggleTip) went on 17.09.26:
  // the last four toggletips were removed by request (audit H5), as the first two had been.
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
    // The bars by name rather than 'header': a dialog carries a <header> of its own, and on a document
    // route (where Restore now opens too) the first header in the app could be the dialog's, inerting
    // its own close. [data-float-nav] is the tool's bar; .doc-head is the documents' masthead.
    ['[data-float-nav]', '.doc-head', 'main', 'section[data-recent]', '.site-foot'].forEach((sel) => {
      const el = app.querySelector(sel);
      if (!el) return;
      if (on) el.setAttribute('inert', ''); else el.removeAttribute('inert');
    });
  },
  // The eight seeded examples, in library order. One place, because the story, its chooser and the
  // colour field all read it. (The phone's example view and example list that also read it went on
  // 17.09.26, audit C5: the story is how a phone sees the examples.)
  _examples() { return (this.state.feed || []).filter((p) => p.example === true); },
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
    }, () => { if (next !== null) this.revealStoryImage(); });
  },

  /* THE ANSWER COMES TO THE READER. The picks sit UNDER the photograph, and on a phone five of them
     plus their notes are taller than the screen, so choosing one from the bottom of the list lit a
     region nobody could see: the control worked, the feedback was two screens away, and finding it
     was the reader's job. Tapping a colour is a question about the picture, so the picture is what
     has to be on screen when it is answered.

     ONLY WHEN IT IS ACTUALLY OUT OF SIGHT. A control that scrolls every time is worse than one that
     never does: with the image already in view the page would lurch on every tap while the reader
     compares two colours, which is the common case. 0.6 of its own height is the threshold, so a
     photograph mostly on screen is left alone and a sliver at the top edge is not counted as seen.

     Only on SELECT, never on deselect. Tapping the lit swatch again means "put it back", which is a
     dismissal, and following a dismissal by moving the page is the tool arguing with the reader.

     Through scrollStoryTo, so this inherits the Lenis-or-native choice and the reduced-motion jump
     that every other anchor on this surface already makes, rather than a second scrolling idiom. */
  revealStoryImage() {
    const sel = '[data-story-ch="where"] .story-mask';
    const el = document.querySelector(sel);
    if (!el) return;
    const r = el.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight || 0;
    if (!r.height || !vh) return;
    const visible = Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0));
    if (visible / r.height >= 0.6) return;
    this.scrollStoryTo(sel);
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
      // The Role panel's shares count up out of the blur as its cells rise (21.09.26, by request: "Make
      // sure all numbers are cohesive so they have this progressive blur animation"). A panel with no
      // shares finds no group, and the call only finishes the last run.
      this._countIn(next, 'storyTab', 0);
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
    // changes which palette it is telling has to change which palette the field is. Before the
    // setState, not in its callback: the field is still lit here, so the ramp changes on the same
    // beat as the story rather than one commit later under a surface that has already moved on.
    this.setFieldPalette(p);
    this.setState({ storyCaseId: id, storySwatch: null, storyMasks: null, announce: 'Now exploring ' + p.name + '.' }, () => {
      this.buildStoryMasks();
      // Back to the chapter that introduces a picture, not to the top: the reader chose a case, so
      // the answer to that press is the new photograph, not the prologue they have already read.
      this.scrollStoryTo('[data-story-ch="image"]');
    });
  },

  /* THE ENTRY ACT, and the jump home for a case swap. Through Lenis when it is there, natively when
     it is not — `_lenis` is armed asynchronously with up to 40 retries and is never created at all
     under reduced motion, so a call site that assumes it exists is a control that does nothing on
     the two occasions it matters most. Same guard the /about anchor dock used for its anchors, before it was removed.

     ONE SECOND ON EASE.fold, THE CHOOSER'S SLIDE (15.09.26, by request). With no duration Lenis
     falls back to its lerp, 0.22 of the remaining distance per frame, and from the landing's Explore
     that is a 1266px throw with its peak speed on the first frame: measured at 390x844, half the way
     in 51ms, 90% in 168ms. It read as the page being yanked. The chooser's photographs travel on
     layeredSlider.js's transitionDuration of 1 and EASE.fold, and this now travels on the same pair,
     so every move on the phone's story has one character: the case swap and the colour pick come
     through here too. */
  /* `now` is for an ARRIVAL rather than a press (19.09.26): Explore Atmos crosses onto this surface
     already inside the story, and the second of travel that answers a press so well is, under a cover
     the reader cannot see through, a page that moves on its own before they have touched it. Reports
     whether it found the chapter, so a caller that is early can come back. */
  scrollStoryTo(sel, now) {
    const el = document.querySelector(sel);
    if (!el) return false;
    if (this._lenis && this._lenis.scrollTo) { try { this._lenis.scrollTo(el, now ? { offset: 0, immediate: true, force: true } : { offset: 0, duration: 1, easing: this.EASE.fold }); return true; } catch (e) { } }
    try { el.scrollIntoView({ behavior: now || this._reduce ? 'auto' : 'smooth', block: 'start' }); } catch (e) { el.scrollIntoView(); }
    return true;
  },
  // The first chapter the story has: "the Whole Image", or, for a shared palette that came without its
  // photograph (24.09.26), the weights. It went nowhere there, since the image chapter is absent.
  beginStory() { if (!this.scrollStoryTo('[data-story-ch="image"]')) this.scrollStoryTo('[data-story-ch]'); },

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
      // The story keeps its place under the cover: this surface is opened FROM the story and closes
      // back onto it (see _wipeCover's keepY note, and closeStoryPicker below).
      keepScroll: true,
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
        /* A NEW TELLING, FROM ITS FIRST STATE (21.09.26, by request: "When navigating between
           explorations on mobile, previous actions and animations are not reset"). The reading tab
           went on showing whatever the last example had been left on, and choosing the example already
           on screen rebuilt nothing, so its reveals and counts stood finished. storyTell makes the
           story new markup whichever case it is; the tab starts on Character, as a visit does. */
        this.setState({
          storyPicker: false,
          storyCaseId: id,
          storySwatch: null,
          storyTab: 'weight',
          storyTell: (this.state.storyTell || 0) + 1,
          storyMasks: null,
          announce: 'Now exploring ' + ex.name + '. Starting again from the top.',
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

  /* THE MARK GOES HOME ON THE STORY TOO (16.09.26, by request: after Explore Another Example the logo
     in the bar did not take the reader back). The phone's front page wears the documents' masthead,
     whose mark is a link to "/", and on a phone "/" is this page, so navigateTo's same-route guard
     swallowed the press. Measured over the open chooser: the mark was on top, hit-tested and took the
     tap, and nothing happened. It was the same after a case swap and anywhere down the page.

     So here the mark goes back to the first screen, in the state a visit starts in: the chooser
     closed, the example this visit rolled (with the field taking its palette back), no colour
     picked, the first reading tab, and the top of the page. That is what the desktop mark does for
     its landing and what Explore Atmos does for the tool. It runs behind the site's transition, as a
     case swap does, and the story is rebuilt under the cover even when the case is unchanged: the
     tab's pill is placed by its module at build (toggleSwitch.js [ATMOS 2]), and a rebuilt story
     arrives on its own reveal, as a re-told one does. A reader already on the first screen in that
     state only gets the glide up, or nothing. */
  returnToStoryStart() {
    if (this._wipeRunning || this._pickerClosing) return;
    const s = this.state;
    const y = window.scrollY || 0;
    if (!s.storyPicker && !s.storyCaseId && s.storySwatch == null && s.storyTab === 'weight' && y <= window.innerHeight) {
      if (y > 1) this._glideToY(0);
      return;
    }
    const recast = !!s.storyCaseId;
    // The visit's first case: the palette a shared link opened on (24.09.26), or the example it rolled.
    const home = (s.narrow && s.sharedView && s.current) ? s.current
      : (this._storyDefaultId && this._examples().find((p) => p.id === this._storyDefaultId));
    // Before the cover, for the reason chooseStoryCase gives: the field changes while it is still lit.
    if (recast && home) this.setFieldPalette(home);
    this._wipeCover({
      commit: (after) => {
        // A new telling, case change or not (see above): fresh markup, so every module starts over.
        this.setState(Object.assign({
          storyPicker: false,
          storyCaseId: null,
          storySwatch: null,
          storyTab: 'weight',
          storyTell: (this.state.storyTell || 0) + 1,
          announce: 'Back to the start.',
        }, recast ? { storyMasks: null } : null), () => {
          if (recast) this.buildStoryMasks();
          // The top, through Lenis, then a refresh: chooseStoryCase's order and its reasons.
          try {
            if (this._lenis) this._lenis.scrollTo(0, { immediate: true, force: true });
            else window.scrollTo(0, 0);
          } catch (e) { try { window.scrollTo(0, 0); } catch (_) { } }
          try { if (window.ScrollTrigger) window.ScrollTrigger.refresh(); } catch (e) { }
          after();
        });
      },
      reveal: () => this._playStoryReveal(),
      reduced: () => this._playStoryReveal(),
    });
  },

  /* THE MARK GOES HOME from a shared link on a phone, in one step.

     NOT showIntroAgain(), which is what the mark calls in the tool. That routine is written for a
     landing that is NOT on screen — it kills the orb field and re-inits it on the next tick, because
     on a desktop the landing was unmounted and has to be rebuilt. On a phone the landing is always
     mounted, sitting `covered` under the shared view precisely so the formation is never torn down
     and rebuilt with a visible hole in it while its textures upload.

     THREE STATES GO WITH THE SURFACE, and each would otherwise outlive it:
       · the hash — left in place, a reload would reopen a stranger's palette over whatever the
         reader had moved on to. That is the whole reason _clearShareHash exists; saveShared and
         makeOwnFromShared already call it and this is the third way off the surface.
       · `current` — a shared palette is not in the archive and is not theirs. Left set, widening
         past the supported minimum would put someone else's palette on the result stage with the
         `sharedView` flag now false, which is the tool saying "this is yours" about a thing it was
         handed by a link.
       · `stage` — a shared arrival constructs at 'result'. 'upload' is the stage the story stands in
         front of, so this lands the same state a first visit has.
     The exit still plays: a surface that is deleted rather than left is the jump this file has fixed
     before. (This routine also served the phone's example view and example list until 17.09.26,
     audit C5, which removed both.) */
  returnToGateOnPhone() {
    if (this._shareClosing) return;
    const land = () => this.setState(
      { sharedView: false, stage: 'upload', current: null, imageUrl: null, announce: 'Returned to the start screen.' },
      () => this._clearShareHash());
    if (!this.state.sharedView) { land(); return; }
    this._shareClosing = true;
    this._shareOut(() => { this._shareClosing = false; land(); });
  },
  copySiteLink() {
    const href = (typeof location !== 'undefined' ? location.origin + '/' : 'https://atmos.gallery/');
    this.copy(href, 'gate-link', 'Link copied. Open it on a wider screen to read your own image.');
  },
  /* A TOUR CARD STANDING BESIDE THE DRAWER IS PART OF ITS LOOP (21.09.26). The trap kept Tab inside
     the drawer, so a keyboard reader who went into the drawer on a tour step could not get back to
     the card's Next — and Escape, the only way out, ends the tour. Off either end of the drawer now
     lands on the card, and the card hands back the same way (_tourCardTab). Only when the card is
     that drawer's companion: a card waiting under someone else's drawer is not. */
  trapFocusIn(sel, e) {
    if (e.key !== 'Tab') return; const root = document.querySelector(sel); if (!root) return;
    const f = [...root.querySelectorAll('button,[href],input,select,[tabindex]:not([tabindex="-1"])')].filter((n) => !n.disabled && n.offsetParent !== null); if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    const card = this._tourCompanionOf ? this._tourCompanionOf(root) : null;
    const c = card ? this._tourFocusables(card) : [];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); (c.length ? c[c.length - 1] : last).focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); (c.length ? c[0] : first).focus(); }
  },
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
  closeAssign() { const back = this._assignBack; this._dialogOut('[data-assign-dialog]', () => this.setState({ assignPalette: null, announce: 'Add to projects closed.' }, () => { if (back && back.focus) try { back.focus(); } catch (e) { } })); },
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
    if (ids.length) trackEvent('Added to Project', { projects: ids.length });
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
  // still a draft edit, so it lands in the pending set and waits for Done like every other row.
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
    if (!store.available) { this._storageNotKept(payload); return; }
    const attempt = (pl) => { let str; try { str = JSON.stringify(pl); } catch (e) { return { ok: false }; } return store.save(str); };
    let res = attempt(payload);
    if (res && res.ok) { this._storageKeep(payload); return; }
    // quota: drop reference thumbnails from the OLDEST palettes (tail) inward, keeping palette data
    const feed = payload.feed.map((p) => Object.assign({}, p));
    let dropped = 0;
    for (let i = feed.length - 1; i >= 0 && (!res || !res.ok); i--) {
      if (feed[i].imageUrl) { feed[i].imageUrl = null; dropped++; res = attempt(Object.assign({}, payload, { feed })); }
    }
    if (!res || !res.ok) { this.setState({ announce: 'Storage is full. Some palettes could not be saved, so back up to keep them.' }); if (!this._quotaNoticed) { this._quotaNoticed = true; this.showNotice('Storage is full. Back up to keep your palettes safe.', { sticky: true }); } }
    else if (dropped > 0) { this.setState({ announce: 'Storage is nearly full. Older reference images were dropped to keep your palettes, so back up to keep them.' }); if (!this._quotaNoticed) { this._quotaNoticed = true; this.showNotice('Older reference images were reduced to free space. Back up to keep everything.'); } }
  },

  /* WHERE THE LIBRARY LIVES, SAID WHERE IT MATTERS (24.09.26, UX audit, by request). The Library is
     this browser's local storage and nothing else: no account, no server copy (/privacy, /terms). Only
     those two pages said so, and the storage marker that said it beside the heading went on 17.09.26,
     leaving a browser that keeps nothing (blocked site data, some private windows) as a failure
     nothing announced: the save returned here without a word and the palettes were gone on reload.
     Now the heading carries one line (AppView, the Library's heading row), the result says a palette
     is saved or is not (renderVals, `saved`), and the three pieces below do the rest.

     A palette of the visitor's own: not one of the eight examples the Library opens with. */
  _ownPalettes(feed) { return (feed || []).filter((p) => p && p.example !== true && !p.exampleKey).length; },
  storageKept() { return !!this._store().available; },

  // A BROWSER THAT KEEPS NOTHING IS SAID ONCE, the first time there is something of the visitor's own
  // to lose, as the error-class notice it is: sticky, with Back Up in it, because the only copy that
  // can outlive the tab is a file.
  _storageNotKept(payload) {
    if (this._storageWarned || !this._ownPalettes(payload && payload.feed)) return;
    this._storageWarned = true;
    this.showNotice('This browser isn’t keeping your palettes. Back Up saves a copy before you leave.', { sticky: true, action: 'backup' });
  },

  /* THE BROWSER IS ASKED TO KEEP IT. Without navigator.storage.persist() the Library is best-effort
     storage, which a browser short of space may clear without asking. Asked once a visit, after the
     first palette of the visitor's own is written, the moment there is something worth keeping.
     Chromium answers silently from how the site is used; Firefox asks the visitor; Safari decides by
     its own rules. Nothing here depends on the answer. */
  _storageKeep(payload) {
    if (this._persistAsked || !this._ownPalettes(payload && payload.feed)) return;
    this._persistAsked = true;
    try {
      const sm = navigator.storage;
      if (!sm || !sm.persist) return;
      (sm.persisted ? sm.persisted() : Promise.resolve(false)).then((on) => (on ? null : sm.persist())).catch(() => { });
    } catch (e) { }
  },

  /* BACK UP IS OFFERED WHEN THERE IS SOMETHING TO LOSE. It is the twelfth of thirteen rows in Manage,
     which is where it belongs and where nobody looks for it before they need it, which is after the
     loss. The third palette a visitor makes is the moment it earns a sentence: offered once, never
     after a Back Up, and never over a notice already saying something (a reading that did not come
     back outranks it, and the offer waits for the next palette). A notice with an act in it does not
     time out, the toast's rule, so it stays until it is answered or dismissed. */
  _offerBackUp() {
    if (!this._store().available || this.state.notice) return;
    let done = true;
    try { done = localStorage.getItem('palette-generator/backup-offered') === '1' || !!localStorage.getItem('palette-generator/backed-up'); } catch (e) { }
    if (done || this._ownPalettes(this.state.feed) < 3) return;
    try { localStorage.setItem('palette-generator/backup-offered', '1'); } catch (e) { }
    clearTimeout(this._backupOfferT);
    // A beat after the palette, so the offer arrives once the result has.
    this._backupOfferT = setTimeout(() => {
      this._backupOfferT = null;
      if (this._alive === false || this.state.notice) return;
      this.showNotice('Your palettes live in this browser only. Back Up keeps a copy.', { sticky: true, action: 'backup' });
    }, 1200);
  },

  // Back Up, from Manage, a notice or the search: the file, the event, and the fact, so the offer never repeats.
  backUpLibrary(from) {
    this.saveProjectFile('library');
    try { localStorage.setItem('palette-generator/backed-up', String(Date.now())); } catch (e) { }
    trackEvent('Library Backed Up', { palettes: this.state.feed.length, from: /^(notice|search)$/.test(from) ? from : 'manage' });
  },
};
