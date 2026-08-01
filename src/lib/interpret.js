// Interpretation layer.
// The LOCAL compositional reading (./reading.js) is the guaranteed baseline — always available,
// fully private, deterministic.
// The LIVE reading (Claude, model claude-sonnet-4-6 per the design brief) runs in one place only:
//   1. VITE_INTERPRET_ENDPOINT (a proxy holding the Anthropic key — see /api/interpret.ts) if set;
//   2. otherwise unavailable → the caller quietly keeps the local reading.
// The endpoint owns the model, the token cap and the system prompt: the client posts only a
// thumbnail and the swatches, and never any prompt text. Swapping the deployment story never
// touches the UI: it reads canInterpretLive() + liveComplete().

import { composeReading } from './reading.js';
import { withoutRetired } from './taxonomy.js';

// ================= local interpretation — the guaranteed baseline =================
// Delegates to the compositional engine. One naming system, not two: the old 5-archetype /
// ~25-name mock is gone rather than left alongside this.
// swatches: [{hex, weight, L, a, b}]; taken: names already in the feed, so nothing ships twice.
export function interpretLocal(swatches, taken) {
  return composeReading(swatches, taken);
}

// ================= live interpretation seam =================
const ENDPOINT = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_INTERPRET_ENDPOINT) || '';

export function canInterpretLive() {
  return !!ENDPOINT;
}

// The endpoint builds the Anthropic request; we send it only the thumbnail and the swatches.
// Ordered by dominance here, because the endpoint keeps the first swatches it is given.
export function buildInterpRequest(media, data, swatches) {
  return {
    image: { media_type: media, data },
    swatches: swatches.slice().sort((a, b) => b.weight - a.weight).map((s) => ({ hex: s.hex, weight: s.weight })),
  };
}

// Returns the raw model text, null on a clean "can't attempt", and THROWS on a genuine
// API/network error (the caller surfaces the unreachable notice only in that case).
export async function liveComplete(request) {
  if (!ENDPOINT) return null;
  const r = await fetch(ENDPOINT, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(request) });
  if (!r.ok) throw new Error('interpret endpoint responded ' + r.status);
  const j = await r.json();
  if (typeof j === 'string') return j;
  if (j && typeof j.text === 'string') return j.text;
  if (j && Array.isArray(j.content) && j.content[0] && typeof j.content[0].text === 'string') return j.content[0].text;
  return null;
}

// Defensive parse: strip fences, isolate the JSON object, validate the shape. Any failure → null → mock.
export function parseInterp(raw) {
  if (typeof raw !== 'string') return null;
  let s = raw.trim().replace(/^```[a-z]*\s*/i, '').replace(/\s*```$/, '').trim();
  const i = s.indexOf('{'), j = s.lastIndexOf('}');
  if (i < 0 || j < 0 || j < i) return null;
  let obj; try { obj = JSON.parse(s.slice(i, j + 1)); } catch (e) { return null; }
  if (!obj || typeof obj !== 'object') return null;
  if (typeof obj.name !== 'string' || !obj.name.trim()) return null;
  if (typeof obj.rationale !== 'string' || !obj.rationale.trim()) return null;
  if (!Array.isArray(obj.descriptors)) return null;
  // The live path is the one place a descriptor can arrive as free text, so it is the one place the
  // measured vocabulary could come back in — a model asked to describe a palette will happily return
  // "Warm" and "Muted", which are facet values here (see taxonomy.js). Filtered, not rejected: a
  // reading with two good terms and one duplicate is worth keeping without the duplicate.
  const desc = withoutRetired(obj.descriptors.filter((d) => typeof d === 'string').map((d) => d.trim())).slice(0, 4);
  // Two, not three. The floor exists so a thin reading falls back to the local engine rather than
  // shipping a palette with nothing to say; the local engine's own guarantee is two, so demanding
  // three of the live path held it to a standard the baseline does not meet.
  if (desc.length < 2) return null;
  const archetype = (typeof obj.archetype === 'string' && obj.archetype.trim()) ? obj.archetype.trim().toLowerCase().slice(0, 24) : 'interpreted';
  return { name: obj.name.trim().slice(0, 42), descriptors: desc, rationale: obj.rationale.trim().slice(0, 240), archetype };
}
