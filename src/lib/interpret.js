// Interpretation layer.
// The LOCAL archetype reading is the guaranteed baseline — always available, fully private.
// The LIVE reading (Claude, model claude-sonnet-4-6 per the design brief) is a pluggable seam:
//   1. VITE_INTERPRET_ENDPOINT (a proxy holding the Anthropic key — see /api/interpret.ts) if set;
//   2. window.claude.complete when running inside the Claude artifact runtime;
//   3. otherwise unavailable → the caller quietly keeps the local reading.
// Swapping the deployment story never touches the UI: it reads canInterpretLive() + liveComplete().

// ================= local (mock) interpretation — the guaranteed baseline =================
export function archetypes() {
  return [
    {
      key: 'coastal', L: .66, C: .025, B: -.005, names: ['Harbour Mist', 'Low Tide', 'Overcast', 'Saltwater Grey', 'Quiet Coast'],
      descriptors: ['Muted', 'Coastal', 'Overcast', 'Still'],
      rationale: 'Cool, low-chroma greys held under a flat, even light — restrained and quietly atmospheric.',
    },
    {
      key: 'golden', L: .68, C: .09, B: .085, names: ['Last Light', 'Golden Hour', 'Amber Field', 'Sunlit Clay', 'Late Afternoon'],
      descriptors: ['Warm', 'Saturated', 'Golden', 'Nostalgic'],
      rationale: 'Saturated warmth pooling toward orange — the long, low glow of the hour before dusk.',
    },
    {
      key: 'clinical', L: .60, C: .012, B: -.004, names: ['Poured Concrete', 'Cold Storage', 'Grey Matter', 'Clinic', 'Off-White Room'],
      descriptors: ['Cold', 'Clinical', 'Neutral', 'Precise'],
      rationale: 'Near-neutral greys with a faint cool cast — clean, exact, almost architectural.',
    },
    {
      key: 'pastel', L: .84, C: .035, B: .01, names: ['Powder', 'Faded Bloom', 'Chalk Pastel', 'Soft Serve', 'Sun-Bleached'],
      descriptors: ['Soft', 'Desaturated', 'Pastel', 'Gentle'],
      rationale: 'High-key, washed-out hues — soft and weightless, like sun-bleached paper.',
    },
    {
      key: 'nocturne', L: .28, C: .055, B: .0, names: ['Ink & Ember', 'Nightfall', 'After Dark', 'Deep Field', 'Low Lamp'],
      descriptors: ['Dark', 'Moody', 'Saturated', 'Quiet'],
      rationale: 'Deep, low-lit tones with embers of warmth — heavy, nocturnal, smouldering.',
    },
  ];
}

export function interpretLocal(cents) {
  let tw = 0, L = 0, C = 0, B = 0;
  cents.forEach((c) => { const wt = c.weight; tw += wt; L += c.L * wt; C += Math.sqrt(c.a * c.a + c.b * c.b) * wt; B += c.b * wt; });
  tw = tw || 1; L /= tw; C /= tw; B /= tw;
  const arcs = archetypes(); let best = arcs[0], bd = Infinity;
  arcs.forEach((a) => { const dL = L - a.L, dC = C - a.C, dB = B - a.B; const d = dL * dL * 1.6 + dC * dC * 70 + dB * dB * 60; if (d < bd) { bd = d; best = a; } });
  return { name: best.names[Math.floor(Math.random() * best.names.length)], descriptors: best.descriptors, rationale: best.rationale, archetype: best.key };
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
