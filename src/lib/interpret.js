// Interpretation layer.
// The LOCAL compositional reading (./reading.js) is the guaranteed baseline — always available,
// fully private, deterministic.
// The LIVE reading (Claude, model claude-sonnet-4-6 per the design brief) is a pluggable seam:
//   1. VITE_INTERPRET_ENDPOINT (a proxy holding the Anthropic key — see /api/interpret.ts) if set;
//   2. window.claude.complete when running inside the Claude artifact runtime;
//   3. otherwise unavailable → the caller quietly keeps the local reading.
// Swapping the deployment story never touches the UI: it reads canInterpretLive() + liveComplete().

import { composeReading } from './reading.js';

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
  if (ENDPOINT) return true;
  return !!(typeof window !== 'undefined' && window.claude && typeof window.claude.complete === 'function');
}

const SYSTEM = 'You name and describe colour palettes for a design tool, in a restrained, evocative, editorial voice. You receive a downscaled reference image and the palette extracted from it as HEX swatches with weights. Read the palette’s mood from its actual character — temperature, chroma, lightness, atmosphere — grounded in the colours present; never invent colours that aren’t there. Guide toward original, descriptive names; never a brand or trademark. Return ONLY a JSON object — no preamble, no markdown fences — of exactly this shape: {"name": string, an original evocative title of 1–3 words; "descriptors": an array of 3–4 short mood adjectives; "rationale": a single evocative, precise sentence; "archetype": a short lowercase mood keyword}. Match this register for the rationale: "Cool, low-chroma greys held under a flat, even light — restrained and quietly atmospheric." / "Saturated warmth pooling toward orange — the long, low glow of the hour before dusk."';

export function buildInterpRequest(media, data, swatches) {
  const sw = swatches.slice().sort((a, b) => b.weight - a.weight).map((s) => s.hex.toUpperCase() + ' · ' + Math.round(s.weight * 100) + '%');
  const userText = 'Palette swatches, ordered by dominance:\n' + sw.join('\n') + '\n\nInterpret this palette. Return only the JSON object.';
  return {
    model: 'claude-sonnet-4-6', max_tokens: 400, system: SYSTEM,
    messages: [{
      role: 'user', content: [
        { type: 'image', source: { type: 'base64', media_type: media, data } },
        { type: 'text', text: userText },
      ],
    }],
  };
}

// Returns the raw model text, null on a clean "can't attempt", and THROWS on a genuine
// API/network error (the caller surfaces the unreachable notice only in that case).
export async function liveComplete(request) {
  if (ENDPOINT) {
    const r = await fetch(ENDPOINT, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(request) });
    if (!r.ok) throw new Error('interpret endpoint responded ' + r.status);
    const j = await r.json();
    if (typeof j === 'string') return j;
    if (j && typeof j.text === 'string') return j.text;
    if (j && Array.isArray(j.content) && j.content[0] && typeof j.content[0].text === 'string') return j.content[0].text;
    return null;
  }
  if (typeof window !== 'undefined' && window.claude && typeof window.claude.complete === 'function') {
    return await window.claude.complete(request);
  }
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
  const desc = obj.descriptors.filter((d) => typeof d === 'string' && d.trim()).map((d) => d.trim()).slice(0, 4);
  if (desc.length < 3) return null;
  const archetype = (typeof obj.archetype === 'string' && obj.archetype.trim()) ? obj.archetype.trim().toLowerCase().slice(0, 24) : 'interpreted';
  return { name: obj.name.trim().slice(0, 42), descriptors: desc, rationale: obj.rationale.trim().slice(0, 240), archetype };
}
