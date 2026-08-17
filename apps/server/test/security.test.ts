import test from 'node:test';
import assert from 'node:assert/strict';
process.env.DEVICE_SECRET_PEPPER = '12345678901234567890123456789012';
const { ApiError, rateLimit, secretHash, secretsEqual } = await import('../src/security.js');
test('device secret hash verifies without storing raw secret', () => {
  const secret = Buffer.alloc(32, 7).toString('base64');
  const hash = secretHash(secret);
  assert.notEqual(hash, secret);
  assert.equal(secretsEqual(secret, hash), true);
  assert.equal(secretsEqual(Buffer.alloc(32, 8).toString('base64'), hash), false);
});

test('rate limit falls back when Redis is unavailable', async () => {
  const redis = { incr: async () => { throw new Error('redis offline'); }, expire: async () => undefined };
  const key = `test:${Date.now()}:${Math.random()}`;
  await rateLimit(redis as any, key, 2, 60);
  await rateLimit(redis as any, key, 2, 60);
  await assert.rejects(() => rateLimit(redis as any, key, 2, 60), (error) => error instanceof ApiError && error.status === 429);
});
