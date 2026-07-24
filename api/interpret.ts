// Serverless proxy for the live mood interpretation (Vercel/Netlify-style Node function).
// The client posts the full Anthropic /v1/messages request body (model claude-sonnet-4-6, a
// downscaled thumbnail + weighted swatches); this function attaches the API key and forwards it.
// Deploy with ANTHROPIC_API_KEY set, then point the client at it via VITE_INTERPRET_ENDPOINT.
// The client treats any non-2xx as "live interpreter unreachable" and keeps its local reading.

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST only' }); return; }
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) { res.status(500).json({ error: 'ANTHROPIC_API_KEY is not configured' }); return; }
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    // forward only the fields the interpretation needs — never arbitrary passthrough
    const payload = {
      model: 'claude-sonnet-4-6',
      max_tokens: Math.min(Number(body?.max_tokens) || 400, 1024),
      system: body?.system,
      messages: body?.messages,
    };
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(payload),
    });
    if (!r.ok) { res.status(502).json({ error: 'upstream ' + r.status }); return; }
    const j: any = await r.json();
    const text = Array.isArray(j?.content) ? j.content.map((c: any) => c?.text || '').join('') : null;
    res.status(200).json({ text });
  } catch (e: any) {
    res.status(500).json({ error: String(e?.message || e) });
  }
}
