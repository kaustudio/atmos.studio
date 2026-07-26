# Decisions

Short, dated records of choices that are easy to re-litigate — or to have re-proposed by a bot.
A decision that lives only in a closed pull request gets made again by the next person who
doesn't know it was ever made.

---

## 2026-07-25 — No analytics or tracking scripts

**Decision:** Atmos Studio ships with no analytics package, no tracking script, and no tracking
cookies. See [#6](https://github.com/kaustudio/atmos.studio/pull/6), closed deliberately.

**Why:** the privacy statement makes a verifiable *"no analytics, no tracking"* claim, and shared
links are intentionally untrackable — palette data lives in the URL fragment, which browsers never
send to a server. A third-party analytics script would trade both for page-view counts we don't
need. Arrival data is already available from standard Vercel access logs, which the privacy
statement discloses.

**If this changes:** it is a copy change, not just a config change. `README.md` → *Privacy* →
*"No accounts, no analytics, no tracking, no ads"* becomes false the moment a script ships, and
accuracy note #4 in the same section says so. Behavioural data, if ever wanted, is a deliberate and
disclosed decision — not a default arriving through an integration.

**Also required to make it stick:** Web Analytics must be disabled in the Vercel project itself
(Vercel → project → Analytics). Closing the pull request without that invites the integration to
open it again.

---

## 2026-07-25 — Analytics: reversed

**Decision:** Vercel Web Analytics (page views only) is enabled. **Supersedes the entry above and
[#6](https://github.com/kaustudio/atmos.studio/pull/6)** — which is left in place deliberately, so
the record reads as a reversal rather than as if the first decision never happened.

**Rationale:** visit counts are wanted; the provider is cookieless and aggregated; and the privacy
statement was updated in the same pull request rather than a later one.

**What did not change:** no accounts, no cross-site tracking, no behavioural events, and nothing
about images, palettes or the archive ever leaving the browser.

**Explicitly still unmade:** custom/behavioural events. `track()` is not called anywhere, and the
privacy statement now promises the analytics "doesn't see anything you do inside the tool" — one
custom event makes that false. Instrumenting generation, export or any in-app action is a separate
decision with its own copy implications, and the mount in `AppView.jsx` carries a comment saying so.

---

## 2026-07-26 — Speed Insights, and the disclosure that should have shipped with it

**Decision:** `@vercel/speed-insights` is enabled alongside Web Analytics, mounted next to
`<Analytics />` on both of `AppView`'s return paths. It reports Core Web Vitals only.

**Rationale:** the app is animation-heavy and its slowness is invisible from the inside — a local
machine on a fast connection never reproduces what a visitor experiences. Web Vitals are the cheapest
honest answer. Like Web Analytics the provider is cookieless, and no behavioural events are involved.

**How this entry came about, recorded deliberately:** the package was installed and mounted *first*,
and the privacy statement was not updated in the same change. The rule one entry above — that a new
script "is a copy change, not just a config change" — was written precisely to stop that, and it
still did not stop it. The disclosure was added a day later, only after being raised three times.

**The lesson, which is the reason this paragraph exists:** the rule was not weak, the *sequencing*
was. An integration arrives as a one-line import, and the copy obligation attached to it is invisible
at that moment. So: for any future third-party script, the privacy copy goes in the same commit as
the import, and the commit does not land without it.

**Also changed in the same pass:** the privacy statement gained the GDPR Article 13 disclosures it
had never carried — controller identity, legal basis (legitimate interests), processor and
international transfer, retention, data-subject rights, children. Previously it was accurate and
readable but formally incomplete.

**Still unverified, and worth pinning down:** Vercel's actual retention periods for access logs and
aggregated analytics. `public/privacy.html` deliberately describes retention as Vercel's own schedule
rather than naming a number nobody had checked. If a figure is ever wanted there, it needs to come
from Vercel's DPA, not from memory.

**Still deliberately absent:** a cookie banner. The site sets zero cookies — verified, not assumed —
so there is nothing non-essential to consent to, and a banner would both contradict the "no cookies
at all" claim and cost layout stability on the very metric Speed Insights now measures. This flips
the moment any non-essential third party ships.

---

## 2026-07-26 — three.js, for one page

**Decision:** `three` is a dependency, used by exactly one page: `404.html`, where the 404 is
rasterised from Neue Montreal and rebuilt as a cursor-reactive particle cloud
(`src/notfound/particleField.js`, adapted from `@canvas-ui/particle-object`).

**Why it doesn't cost the app anything:** `404.html` is the build's second entry, so three lands in
its own chunk (`notFound-*.js`, ~134 kB gzipped) that only a visitor who hits a dead URL ever
downloads. `dist/assets/main-*.js` is byte-for-byte unaffected. Check that this is still true after
touching `vite.config.ts`: `npm run build` prints both chunks.

**What was cut rather than shipped dead:** the component arrives able to load GLB/glTF (with Draco),
sample triangle meshes, sniff asset bytes and orbit the camera. None of that is reachable when the
subject is a line of type, and GLTFLoader + DRACOLoader + OrbitControls are most of what three would
otherwise weigh. They are absent from `particleField.js`, and the header there says so — so the next
person doesn't "restore" them looking for parity with the upstream component. The physics constants
*are* verbatim upstream: that part is the effect.

**Also deliberate:** no `@types/three`. Nothing in `src/notfound` is TypeScript, `tsconfig.json` has
`checkJs: false`, and `npm run build` doesn't run `tsc` — so the types would be a devDependency that
never types anything.

**Why the page is a Vite entry and not another static file in `/public`:** privacy and terms are
static because they need nothing from the build; this one has a bundled dependency, and a file in
`/public` can't import from `node_modules`. Being a build entry is also what puts it at
`dist/404.html`, which is the filename Vercel serves for any path with no file behind it.

**Verified, not assumed:** `curl` against the live deployment returned `404` + `x-vercel-error:
NOT_FOUND` for a nonsense path — i.e. there is no SPA catch-all rewrite in front of it, so
`dist/404.html` will be what answers, with the status intact. If a rewrite is ever added for the app
(e.g. real routes instead of the URL fragment), it must not be a blanket `/(.*) → /`, or this page
stops being reachable. Note that `npm run preview` *does* fall back to `index.html`, so it cannot be
used to check this — only a deployment can.

**The page carries no explanatory copy, deliberately.** There is no eyebrow and no lead paragraph:
the 404 is the whole message, and the page is a full-height column — mark at the top, footer at the
bottom, the type taking everything between. Two things follow from that, and both are easy to undo by
accident:

- The one action is the system's button at the system's size (10.5px uppercase, `0.75em 1.35em`,
  primary's inverted fill — `button-006`'s own figures), *not* a larger CTA. It is deliberately quiet
  so the 404 is what the eye lands on. At 28px tall it still clears the 24×24 target minimum.
- `<p class="nf-said">` is the copy that remains, hidden but spoken — without it a screen reader
  announces this page as the bare number "404". It sits outside the `<h1>` because `main.js`
  rasterises that element's text, and anything inside it would be spelled out by the particles. If
  visible copy ever returns, that line is what it replaces.

**It follows the app's grid, not the legal pages' measure** — full width, a 16px gutter, 40px/88px of
vertical room, and the brand mark centred at the top on the line `AppView.jsx` fixes it to (165 × 26
at 18.5px, the same on the landing and in the tool). Privacy and terms set themselves in a centred
60em column because they are documents meant to be read; this page is wayfinding, and it belongs to
the same full-bleed grid as the tool it hands you back to. So it is *not* a drift to be tidied up
into matching `privacy.html`. Two consequences worth knowing: the display type sits flush to the 16px
gutter (as the archive rows do), and `body{overflow-x:clip}` is load-bearing — the particle canvas
deliberately overhangs the type by more than the gutter, and a particle pushed off the page should
leave rather than open a scrollbar.

**Still left alone:** the mark on `privacy.html` and `terms.html` is left-aligned inside their centred
column, so the centred mark here matches the app and the landing but not those two.

**No analytics on it**, like privacy and terms: the two measurement tools mount inside the React app
(`AppView.jsx`), and the standalone pages have never carried a script tag for them. Adding one here
would come with the copy obligation the 2026-07-26 entry above sets out — the privacy statement
describes what runs "on the page" — so it is a decision, not a tidy-up.

**The fallback is the markup, not a copy of it:** the `<h1>404</h1>` in `404.html` is the real type at
the real size, and `src/notfound/main.js` only hides it (opacity, still in the layout and the
accessibility tree) once the font has loaded, WebGL has been granted, and motion is wanted. The
particle cloud is scaled and positioned from that element's own measurements, so the size lives in
`public/notfound.css` — clamped to a 5rem floor — and in no second place.
