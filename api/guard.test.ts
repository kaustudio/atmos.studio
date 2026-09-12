import assert from 'node:assert/strict';
import { guard, originAllowed, takeBudget, __resetBudget, DAILY_CALL_BUDGET, rejectWeb } from './_guard.ts';

const base = {
  method: 'POST',
  origin: 'https://atmos.gallery',
  referer: null as string | null,
  contentType: 'application/json',
  contentLength: 1000,
};

let pass = 0;
const check = (name: string, fn: () => void) => {
  fn();
  pass += 1;
  console.log('ok  ' + name);
};

check('GET is rejected as 405', () => {
  const v = guard({ ...base, method: 'GET' });
  assert.equal(v.ok, false);
  assert.equal((v as any).status, 405);
});

check('happy path passes', () => {
  __resetBudget();
  assert.deepEqual(guard({ ...base }), { ok: true });
});

check('foreign origin is 403', () => {
  __resetBudget();
  const v = guard({ ...base, origin: 'https://evil.example' });
  assert.equal((v as any).status, 403);
});

check('no origin and no referer is 403', () => {
  __resetBudget();
  const v = guard({ ...base, origin: null, referer: null });
  assert.equal((v as any).status, 403);
});

check('referer fallback works', () => {
  __resetBudget();
  assert.deepEqual(
    guard({ ...base, origin: null, referer: 'https://atmos.gallery/archive' }),
    { ok: true },
  );
});

check('malformed referer does not throw', () => {
  __resetBudget();
  const v = guard({ ...base, origin: null, referer: 'not a url' });
  assert.equal((v as any).status, 403);
});

check('www origin is allowed', () => {
  __resetBudget();
  assert.equal(originAllowed('https://www.atmos.gallery', null), true);
});

check('http origin is not allowed', () => {
  assert.equal(originAllowed('http://atmos.gallery', null), false);
});

check('lookalike origin is not allowed', () => {
  assert.equal(originAllowed('https://atmos.gallery.evil.example', null), false);
  assert.equal(originAllowed('https://notatmos.gallery', null), false);
});

check('wrong content-type is 415', () => {
  __resetBudget();
  const v = guard({ ...base, contentType: 'text/plain' });
  assert.equal((v as any).status, 415);
});

check('charset suffix on content-type is fine', () => {
  __resetBudget();
  assert.deepEqual(guard({ ...base, contentType: 'application/json; charset=utf-8' }), { ok: true });
});

check('oversize declared length is 413', () => {
  __resetBudget();
  const v = guard({ ...base, contentLength: 2_000_000 });
  assert.equal((v as any).status, 413);
});

check('measured body wins over a lying content-length', () => {
  __resetBudget();
  const v = guard({ ...base, contentLength: 10, bodyBytes: 9_000_000 });
  assert.equal((v as any).status, 413);
});

check('missing content-length does not block', () => {
  __resetBudget();
  assert.deepEqual(guard({ ...base, contentLength: null }), { ok: true });
});

check('rejected requests do not consume budget', () => {
  __resetBudget();
  for (let i = 0; i < 50; i++) guard({ ...base, origin: 'https://evil.example' });
  assert.deepEqual(guard({ ...base }), { ok: true });
});

check('budget exhausts at the limit and returns 429', () => {
  __resetBudget();
  for (let i = 0; i < DAILY_CALL_BUDGET; i++) assert.equal(takeBudget().valueOf(), true);
  const v = guard({ ...base });
  assert.equal((v as any).status, 429);
  assert.equal((v as any).retryAfter, 3600);
});

check('budget resets on a new UTC day', () => {
  __resetBudget();
  for (let i = 0; i < DAILY_CALL_BUDGET; i++) takeBudget(new Date('2026-09-12T23:59:00Z'));
  assert.equal(takeBudget(new Date('2026-09-12T23:59:59Z')), false);
  assert.equal(takeBudget(new Date('2026-09-13T00:00:01Z')), true);
});

check('web adapter shapes the error response', async () => {
  __resetBudget();
  const res = rejectWeb(new Request('https://atmos.gallery/api/interpret', { method: 'GET' }));
  assert.ok(res);
  assert.equal(res!.status, 405);
  assert.equal(res!.headers.get('cache-control'), 'no-store');
});

check('web adapter lets a good request through', () => {
  __resetBudget();
  const req = new Request('https://atmos.gallery/api/interpret', {
    method: 'POST',
    headers: { origin: 'https://atmos.gallery', 'content-type': 'application/json' },
    body: '{}',
  });
  assert.equal(rejectWeb(req), null);
});

console.log('\n' + pass + ' checks passed');
