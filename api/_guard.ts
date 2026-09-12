/**
 * Request guard for /api/interpret.
 *
 * The endpoint spends real money per call, so it needs three things the
 * platform rate limit does not give us:
 *
 *   1. an origin check   — the IP rate limit does nothing against a script
 *                          that calls the endpoint directly from a server
 *   2. a size cap        — token cost scales with the image we forward
 *   3. a daily budget    — a ceiling that is ours, not the credit balance
 *
 * The core is a pure function so it can be unit tested and reused from
 * either runtime. Two adapters are at the bottom: one for Node-style
 * handlers (req, res), one for Web-standard handlers (Request => Response).
 */

/* ------------------------------------------------------------------ config */

export const ALLOWED_ORIGINS = [
  'https://atmos.gallery',
  'https://www.atmos.gallery',
];

/** Base64 of a ~960px thumbnail lands well under this. */
export const MAX_BODY_BYTES = 1_500_000;

/** Calls per UTC day across this deployment. ~$0.0025 each. */
export const DAILY_CALL_BUDGET = Number(process.env.INTERPRET_DAILY_BUDGET ?? 1500);

/** Set INTERPRET_ENABLED=false to stop all interpretation without a deploy. */
export const KILL_SWITCH_ON = process.env.INTERPRET_ENABLED === 'false';

/** Allow *.vercel.app previews outside production so preview builds work. */
const ALLOW_PREVIEW = process.env.VERCEL_ENV !== 'production';
const PREVIEW_ORIGIN = /^https:\/\/[a-z0-9-]+\.vercel\.app$/;

/* -------------------------------------------------------------------- types */

export interface GuardInput {
  method: string;
  origin: string | null;
  referer: string | null;
  contentType: string | null;
  /** Content-Length as sent, if any. */
  contentLength: string | number | null;
  /** Actual byte length, once the body has been read. Preferred over the header. */
  bodyBytes?: number;
}

export type GuardVerdict =
  | { ok: true }
  | { ok: false; status: number; error: string; retryAfter?: number };

/* --------------------------------------------------------------- budget */

let budgetDay = '';
let budgetUsed = 0;

/**
 * Best-effort daily counter. It lives in one warm instance, so the real
 * ceiling is (instances x budget) rather than the budget. That is enough to
 * turn a runaway loop into a nuisance instead of an empty balance; for a
 * hard global cap, move these two variables to Upstash/Redis (see APPLY.md).
 */
export function takeBudget(now: Date = new Date()): boolean {
  const day = now.toISOString().slice(0, 10);
  if (day !== budgetDay) {
    budgetDay = day;
    budgetUsed = 0;
  }
  if (budgetUsed >= DAILY_CALL_BUDGET) return false;
  budgetUsed += 1;
  return true;
}

export function budgetState(): { day: string; used: number; limit: number } {
  return { day: budgetDay, used: budgetUsed, limit: DAILY_CALL_BUDGET };
}

/** Test seam. */
export function __resetBudget(): void {
  budgetDay = '';
  budgetUsed = 0;
}

/* ---------------------------------------------------------------- origin */

export function originAllowed(origin: string | null, referer: string | null): boolean {
  if (origin) {
    if (ALLOWED_ORIGINS.includes(origin)) return true;
    return ALLOW_PREVIEW && PREVIEW_ORIGIN.test(origin);
  }
  // Origin is sent on every cross-origin POST and on same-origin fetch POSTs,
  // so a missing one is already suspicious. Referer is the last chance.
  if (referer) {
    try {
      const o = new URL(referer).origin;
      if (ALLOWED_ORIGINS.includes(o)) return true;
      return ALLOW_PREVIEW && PREVIEW_ORIGIN.test(o);
    } catch {
      return false;
    }
  }
  return false;
}

/* ------------------------------------------------------------------ core */

export function guard(input: GuardInput): GuardVerdict {
  if (input.method !== 'POST') {
    return { ok: false, status: 405, error: 'POST only' };
  }

  if (KILL_SWITCH_ON) {
    return { ok: false, status: 503, error: 'interpretation is paused', retryAfter: 3600 };
  }

  if (!originAllowed(input.origin, input.referer)) {
    return { ok: false, status: 403, error: 'origin not allowed' };
  }

  const type = (input.contentType ?? '').split(';')[0].trim().toLowerCase();
  if (type !== 'application/json') {
    return { ok: false, status: 415, error: 'content-type must be application/json' };
  }

  const declared =
    typeof input.contentLength === 'string'
      ? Number(input.contentLength)
      : input.contentLength ?? null;
  const size = input.bodyBytes ?? (Number.isFinite(declared) ? (declared as number) : null);
  if (size !== null && size > MAX_BODY_BYTES) {
    return { ok: false, status: 413, error: 'payload too large' };
  }

  if (!takeBudget()) {
    return { ok: false, status: 429, error: 'daily interpretation budget reached', retryAfter: 3600 };
  }

  return { ok: true };
}

/* -------------------------------------------------------------- adapters */

type NodeishReq = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
};
type NodeishRes = {
  status: (code: number) => NodeishRes;
  setHeader: (key: string, value: string) => void;
  json: (body: unknown) => void;
};

const header = (req: NodeishReq, name: string): string | null => {
  const v = req.headers[name];
  return Array.isArray(v) ? v[0] ?? null : v ?? null;
};

/**
 * Node-style handlers. Returns true when the request was rejected and the
 * response already sent — the caller should return immediately.
 *
 *   if (rejectNode(req, res)) return;
 */
export function rejectNode(req: NodeishReq, res: NodeishRes, bodyBytes?: number): boolean {
  const verdict = guard({
    method: req.method ?? 'GET',
    origin: header(req, 'origin'),
    referer: header(req, 'referer'),
    contentType: header(req, 'content-type'),
    contentLength: header(req, 'content-length'),
    bodyBytes,
  });
  if (verdict.ok) return false;
  if (verdict.retryAfter) res.setHeader('Retry-After', String(verdict.retryAfter));
  res.setHeader('Cache-Control', 'no-store');
  res.status(verdict.status).json({ error: verdict.error });
  return true;
}

/**
 * Web-standard handlers. Returns a Response to send back, or null to continue.
 *
 *   const blocked = rejectWeb(request); if (blocked) return blocked;
 */
export function rejectWeb(request: Request, bodyBytes?: number): Response | null {
  const verdict = guard({
    method: request.method,
    origin: request.headers.get('origin'),
    referer: request.headers.get('referer'),
    contentType: request.headers.get('content-type'),
    contentLength: request.headers.get('content-length'),
    bodyBytes,
  });
  if (verdict.ok) return null;
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    'cache-control': 'no-store',
  };
  if (verdict.retryAfter) headers['retry-after'] = String(verdict.retryAfter);
  return new Response(JSON.stringify({ error: verdict.error }), {
    status: verdict.status,
    headers,
  });
}
