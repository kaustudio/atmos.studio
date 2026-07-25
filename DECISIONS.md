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
