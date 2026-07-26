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

## 2026-07-26 — three.js, never in an entry chunk

*(Superseded in part by the orb-field entry below: three is no longer used by only one page. The
rule it exists to protect — three never lands in a chunk the browser blocks first paint on — is
unchanged, and now applies in two places instead of one.)*

**Decision:** `three` is a dependency of exactly two things: `404.html`, where the 404 is rasterised
from Neue Montreal and rebuilt as a cursor-reactive particle cloud (`src/notfound/particleField.js`,
adapted from `@canvas-ui/particle-object`), and the landing's orb field (`src/app/orbField.js`).

**Why it doesn't cost either page anything:** `404.html` is the build's second entry, and the
landing reaches `orbField.js` only through a dynamic `import()`, so three is a shared chunk
(`three.module-*.js`, ~130 kB gzipped) that neither entry blocks on. `npm run build` should print
`main-*.js` at roughly 138 kB gzipped with `three.module-*.js` and `orbField-*.js` beside it, not
inside it. A static import of `orbField.js` from `orbit.js` puts three straight into `main-*.js` and
doubles the landing's payload to ~272 kB gzipped — it was written that way first, and measured.
Re-check after touching `vite.config.ts` or that import.

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

**The 404 is fitted to the page, and the page is exactly one viewport.** `public/fit-width.js` is Osmo
Supply's *Fit Text to Width*, kept as delivered like `legal-toc.js` before it, and it — not this
repo's CSS — sets the font-size that makes the 404 span its container. Consequences, all load-bearing:

- **Nothing scrolls.** `html,body{height:100vh;overflow:hidden}`, and `.nf` carries `min-height:0` so
  the type is what gives on a short window rather than the footer being pushed off the bottom.
- **Because nothing scrolls, width alone is not a safe fit.** Type fitted only to width overflows the
  *height* on a short, wide window, and with no scrollbar that overflow is simply cut off. So
  `.nf-type` also caps its width at the height that is actually free — `--nf-reserve` (everything that
  is not the 404) turned back into a width by `--nf-fit-ratio`. On an ordinary window the cap doesn't
  bind and the 404 fills the width edge to edge; measured at 1440×900 it lands on 1408px, the full
  width between the gutters. `main.js` sets the ratio from the rasterised glyphs; the CSS fallback is
  the same figure, so the guard holds with no JS. Verified: measured 2.3502 against a 2.35 fallback.
- **`line-height:.74` on the heading is not styling.** At ~800px the default leading parks ~170px of
  empty line box under the digits, and on a page that cannot scroll that space comes straight out of
  how wide the 404 may be. Tightening it to the digits' own height is what lets the type fill the
  width at all.
- **The particle canvas is `position:fixed; inset:0`** — a layer over the whole viewport, not a box
  around the heading. The push field throws particles well past the glyphs, and any box drawn around
  them is a box they visibly get clipped against, which is exactly the bug this replaced. It is
  `pointer-events:none` because it now covers the mark, the button and the footer links.

Because the canvas no longer wraps the heading, its resizing no longer implies the heading's:
`main.js` observes both, since the fit also re-runs after the webfont lands.

**The page carries no explanatory copy, deliberately.** There is no eyebrow and no lead paragraph:
the 404 is the whole message, and the page is a full-height column — mark at the top, footer at the
bottom, the type taking everything between. Two things follow from that, and both are easy to undo by
accident:

- The one action is the landing's **Get Started** button, restated figure for figure from `glassCta`
  in `renderVals.js`: 36px tall, 0/16px, Neue Montreal 500 at 14px on `--track-title`, sentence case,
  squared, and a 7% *glass* fill with an 18px backdrop blur behind a 15% edge — not an inverted fill
  and not uppercase. The two easing curves are written out because `global.css` isn't loaded here, so
  retuning `--ease-button-hover` or `--ease-standard` there leaves this page stale. The glass pays for
  itself on this page in particular: the button sits above the particle layer, so the blur takes the
  cloud drifting behind it, exactly as the landing's does with the orb ring.
- The 24px above it is measured to the glyphs, and getting there needed `line-height:0` on `.nf-type`.
  The heading is an inline-block, so it sits on a line box whose strut — inherited `line-height:1.6`
  from legal.css — parked ~8px of nothing under the digits and made 24px read as 32.
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

---

## 2026-07-26 — The landing's orbs are particles, and not from a package

**Decision:** the landing's orb ring is drawn by `src/app/orbField.js` — one WebGL 2 canvas holding
every orb as a cloud of cursor-reactive particles — instead of one renderer per orb. The formation
grew from 33 orbs on two rings to 122 on three, at roughly half the diameter.

**Why one canvas:** browsers cap live WebGL contexts at around sixteen per page and silently kill
the oldest past that, so `ORB_GL_MAX` had the shaded formation pinned at twelve orbs. Every orb
added beyond that fell back to the painted floor — the count could not grow without the formation
getting *less* shaded. That ceiling is a property of the per-orb architecture, not a number to tune,
and consolidating is the only way past it. It also turns the cursor into one pass over one buffer
rather than 33 isolated ones.

**What it cost, knowingly:** an orb is a dotted sphere now, not a solid one. The terminator, the
distance-graded key light, the specular, the fresnel rim and the per-ring depth gate all survive —
ported per-particle into `orbField.js`'s vertex shader, off the same one global lamp — but the
continuous surface between them does not. The MOTION CONTRACT in `initOrbit()` records this as a
written amendment to §2, §3 and §5 plus a new §6, which is where the reasoning lives; this entry
exists so the *tradeoff* isn't rediscovered as a bug.

**Why not `thinking-orbs`:** it was proposed, and it is a competent package — 2D canvas, six agent
states, reduced-motion handling, shared clock. It is also **strictly monochrome**, which is
disqualifying here for a reason that has nothing to do with quality: these orbs wear the reference
palettes, and hue travelling 46–150° inside a single orb is the thing the landing exists to
demonstrate (see `_orbitRefPalettes`). It has no cursor interaction, its two sizes are documented as
separate designs rather than a scale factor where ours solve continuously per viewport, and at
v0.1.1 with one maintainer it would be a supply-chain dependency bought to replace code the repo
already owns in `src/notfound/particleField.js`. Not a rejection of the package — a rejection of the
fit.

**The floors are unchanged and still load-bearing:** no WebGL 2, or reduced motion, and `_rings()`
answers with `_paintedRings` — the original 12-at-84 and 21-at-56 — because 122 painted orbs
carrying five shading layers each is not a floor, and the DOM stack was drawn around the two-ring
formation. The dense population is only ever offered where it can actually be drawn.

---

## 2026-07-26 — Greyscale orbs: tried, shipped, reversed

**Decision:** the orb ring is in colour, as the entry above describes. Greyscale was built and
shipped to `main` (`d1f9708`) and reverted the same day. This entry exists because "just make them
monochrome" is a reasonable-sounding suggestion that will be made again, and it should be made
against a record rather than from scratch.

**Why it was reverted, in the words that settled it:** greyscale doesn't serve the purpose when the
product is a tool that creates palettes. The landing's job is to show what the tool does, and a hero
with no colour in it argues against the thing it is introducing — the orbs wear the reference
palettes precisely so the formation demonstrates hue travel rather than merely decorating. That is
the same reason recorded above for not taking `thinking-orbs`, so it is now the reason twice over,
and **the withdrawal of that objection is itself withdrawn** — being strictly monochrome is once
again disqualifying for anything drawing these orbs.

**It looked fine, which is the trap.** The greyscale build was clean and verifiable — max R/G/B
spread of 0 across 232,581 sampled pixels, the lamp reading clearly, the depth rings still receding.
Nothing about it was broken. It failed on what the page is FOR, which no amount of looking at the
page in isolation would have caught. If it comes up again, that is the axis to argue on.

**What the attempt was worth keeping:** two things it surfaced are true independently of colour and
survive in the code.
- The palette ramp must be monotonic in whatever channel is carrying it. Under colour that is HUE,
  and the luminance jumps between adjacent swatches ride along underneath it. Desaturating removes
  that cover and tone becomes the only channel, so a hue-ordered ramp becomes speckle — which is why
  greyscale needed a luminance sort. Either way the rule is the same: sort by the channel doing the
  work, or adjacent particles land on unrelated swatches.
- The specular is warm and the fresnel rim cool *on purpose* (from `orb-shader.js`). Greyscale had
  to neutralise both, and that is what proved they are the last places hue survives in this shader.
  Anyone tuning them is tuning colour, not just brightness.

**Not kept:** `tonalRange`, the compression of the ramp toward each orb's mean. It existed because a
full-strength tonal ramp reads as a second, disagreeing light once hue is gone. In colour the ramp
reads as hue travel and wants its full spread, so it went back with the rest.
