// api/interpret.ts — hardened replacement
//
// WHAT CHANGED AND WHY
//
// The previous version forwarded `system` and `messages` straight from the client and only
// pinned the model plus max_tokens. That makes the endpoint an open, unauthenticated proxy to
// the Anthropic API on your key: anyone can POST their own system prompt and their own
// conversation and have you pay for it. Output was capped at 1024 tokens, but INPUT was not
// capped at all — Sonnet 4.6 accepts up to 1M input tokens at $3/MTok, so a single crafted
// request could cost ~$3, and a loop could cost thousands.
//
// This version never trusts client-supplied prompt content. It accepts only the two things the
// interpretation actually needs — a base64 thumbnail and the extracted swatches — validates
// their size and shape, and builds the Anthropic request itself from a server-side prompt.
//
// STILL TO DO OUTSIDE THIS FILE (see the notes at the bottom):
//   1. Hard spend cap in the Anthropic Console.
//   2. Rate limiting via Vercel Firewall.
//   3. `npm i -D @types/node` to clear the TS2591 build error.

const MODEL = 'claude-sonnet-4-6';
const MAX_OUTPUT_TOKENS = 400;

// Ceilings. A downscaled thumbnail should land far under these; anything larger is not a
// legitimate client request. Tune down once you know your real p99 payload size.
const MAX_BODY_BYTES = 400_000;
const MAX_IMAGE_BYTES = 300_000;
const MAX_SWATCHES = 12;

const ALLOWED_ORIGINS = new Set([
  'https://atmos.gallery',
  'https://www.atmos.gallery',
  'http://localhost:5173', // Vite dev — remove for production if you prefer
]);

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const HEX = /^#[0-9a-fA-F]{6}$/;

// The prompt lives here, on the server, not in the client bundle. Move the exact string your
// client currently sends as `system` into this constant — it is the product, and it should not
// be attacker-replaceable or publicly readable.
const SYSTEM_PROMPT = `You name and describe colour palettes for a design tool, in a restrained, evocative, editorial voice. You receive a downscaled reference image and the palette extracted from it as HEX swatches with weights. Read the palette’s mood from its actual character — temperature, chroma, lightness, atmosphere — grounded in the colours present; never invent colours that aren’t there. Guide toward original, descriptive names; never a brand or trademark. Return ONLY a JSON object — no preamble, no markdown fences — of exactly this shape: {"name": string, an original evocative title of 1–3 words; "descriptors": an array of 3–4 short mood adjectives; "rationale": a single evocative, precise sentence; "archetype": a short lowercase mood keyword}. Match this register for the rationale: "Cool, low-chroma greys held under a flat, even light — restrained and quietly atmospheric." / "Saturated warmth pooling toward orange — the long, low glow of the hour before dusk."`;

function applyCors(req: any, res: any): boolean {
  const origin = req.headers?.origin;
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true;
  }
  return false;
}

/** Reject oversized payloads before doing any work. */
function tooLarge(req: any, raw: string): boolean {
  const declared = Number(req.headers?.['content-length'] ?? 0);
  if (declared > MAX_BODY_BYTES) return true;
  return Buffer.byteLength(raw, 'utf8') > MAX_BODY_BYTES;
}

export default async function handler(req: any, res: any) {
  if (applyCors(req, res)) return;

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST only' });
    return;
  }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    res.status(500).json({ error: 'ANTHROPIC_API_KEY is not configured' });
    return;
  }

  try {
    const raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {});
    if (tooLarge(req, raw)) {
      res.status(413).json({ error: 'payload too large' });
      return;
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    // --- Validate the image -------------------------------------------------
    const media: string = body?.image?.media_type;
    const data: string = body?.image?.data;

    if (typeof data !== 'string' || !ALLOWED_IMAGE_TYPES.has(media)) {
      res.status(400).json({ error: 'image must be base64 jpeg, png or webp' });
      return;
    }
    if (!/^[A-Za-z0-9+/=]+$/.test(data) || data.length > MAX_IMAGE_BYTES) {
      res.status(400).json({ error: 'image rejected: malformed or too large' });
      return;
    }

    // --- Validate the swatches ----------------------------------------------
    // Expected shape: [{ hex, weight }, ...] — the shape SYSTEM_PROMPT was written against
    // ("HEX swatches with weights"). A bare "#aabbcc" string is accepted too. We re-serialise
    // them ourselves so nothing the client wrote ever reaches the model as free text.
    const input = Array.isArray(body?.swatches) ? body.swatches.slice(0, MAX_SWATCHES) : [];

    const swatches = input.map((s: any) => {
      const hex = typeof s === 'string' ? s : s?.hex;
      const weight = typeof s === 'string' ? null : Number(s?.weight);
      return { hex: String(hex ?? '').trim(), weight: Number.isFinite(weight) ? weight : null };
    });

    if (swatches.length === 0 || swatches.some((s) => !HEX.test(s.hex))) {
      res.status(400).json({ error: 'swatches must be hex colours like #aabbcc' });
      return;
    }

    // --- Build the request ourselves ----------------------------------------
    // The user text reproduces, verbatim, the wording the client used to send: the prompt was
    // written against this phrasing and this line format. Do not reword it.
    const lines = swatches
      .slice()
      .sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0))
      .map((s) =>
        s.weight === null
          ? s.hex.toUpperCase()
          : s.hex.toUpperCase() + ' · ' + Math.round(s.weight * 100) + '%',
      );
    const userText =
      'Palette swatches, ordered by dominance:\n' +
      lines.join('\n') +
      '\n\nInterpret this palette. Return only the JSON object.';

    const payload = {
      model: MODEL,
      max_tokens: MAX_OUTPUT_TOKENS,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: media, data } },
            { type: 'text', text: userText },
          ],
        },
      ],
    };

    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(payload),
    });

    if (!upstream.ok) {
      // Do not leak upstream bodies — they can echo prompt content and account detail.
      console.error('anthropic upstream error', upstream.status);
      res.status(502).json({ error: 'interpreter unavailable' });
      return;
    }

    const json: any = await upstream.json();
    const text = Array.isArray(json?.content)
      ? json.content.map((c: any) => c?.text || '').join('')
      : null;

    // Short cache: identical thumbnails re-requested in quick succession are common when a user
    // flips between views. Add a real cache keyed on a hash of (image + swatches) when you are
    // ready to put Vercel KV or Upstash Redis in front of this.
    res.setHeader('Cache-Control', 'private, max-age=60');
    res.status(200).json({ text });
  } catch (e: any) {
    console.error('interpret failed', e?.message || e);
    res.status(500).json({ error: 'interpret failed' });
  }
}

// ---------------------------------------------------------------------------
// COMPANION STEPS — this file alone does not cap your spend.
//
// 1. ANTHROPIC CONSOLE → Limits. Set a hard monthly spend cap and a low email-alert threshold.
//    This is the only control that is guaranteed to stop the bleeding regardless of a code bug.
//
// 2. VERCEL → Project → Firewall. Add a rate-limit rule on path /api/interpret, e.g. 10 requests
//    per minute per IP. Platform-level, no code, and it runs before your function is billed.
//    In-memory counters do NOT work here: each serverless invocation may be a fresh instance.
//
// 3. ROTATE THE KEY once this is deployed. The old endpoint has been publicly callable, and you
//    cannot tell from outside whether anyone found it. Rotating costs nothing; assuming costs a lot.
//
// 4. `npm i -D @types/node`, then add "node" to `compilerOptions.types` in tsconfig.json.
//    That clears the TS2591 error currently appearing in your build logs.
//
// 5. Verify the client sends the new shape: { image: { media_type, data }, swatches: [...] }
//    instead of a full Anthropic request body. The client's existing "any non-2xx means fall back
//    to the local reading" behaviour already covers the transition — worst case, users briefly get
//    the local palette instead of the interpreted one. Keep that fallback; it is your circuit breaker.
// ---------------------------------------------------------------------------
