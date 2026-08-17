import { createHmac, timingSafeEqual, randomUUID } from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import { Redis } from 'ioredis';
import { pool } from './db.js';
import { config } from './config.js';

export interface DevicePrincipal { deviceId: string; placeId: string | null; }
export class ApiError extends Error { constructor(public status: number, public code: string, message: string) { super(message); } }

export function secretHash(secret: string): string {
  return createHmac('sha256', config.deviceSecretPepper).update(secret).digest('hex');
}
export function secretsEqual(secret: string, storedHash: string): boolean {
  const a = Buffer.from(secretHash(secret), 'hex');
  const b = Buffer.from(storedHash, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function authenticateHeader(header?: string): Promise<DevicePrincipal> {
  if (!header?.startsWith('PortalDevice ')) throw new ApiError(401, 'DEVICE_AUTH_REQUIRED', 'Device authentication required');
  const token = header.slice('PortalDevice '.length).trim();
  const separator = token.indexOf(':');
  if (separator < 1) throw new ApiError(401, 'DEVICE_AUTH_INVALID', 'Invalid device credentials');
  const deviceId = token.slice(0, separator);
  const secret = token.slice(separator + 1);
  const { rows } = await pool.query('SELECT id, place_id, device_secret_hash, revoked_at FROM portal_device WHERE id=$1', [deviceId]);
  const row = rows[0];
  if (!row || row.revoked_at || !secretsEqual(secret, row.device_secret_hash)) throw new ApiError(401, 'DEVICE_AUTH_INVALID', 'Invalid device credentials');
  return { deviceId: row.id, placeId: row.place_id };
}
export async function authenticateRequest(req: IncomingMessage) { return authenticateHeader(req.headers.authorization); }

const memoryRateLimits = new Map<string, { count: number; expiresAt: number }>();

function memoryRateLimit(key: string, limit: number, seconds: number) {
  const now = Date.now();
  const current = memoryRateLimits.get(key);
  if (!current || current.expiresAt <= now) {
    memoryRateLimits.set(key, { count: 1, expiresAt: now + seconds * 1000 });
    return;
  }
  current.count += 1;
  if (current.count > limit) throw new ApiError(429, 'RATE_LIMITED', 'Too many requests. Try again shortly.');
}

export async function rateLimit(redis: Redis, key: string, limit: number, seconds: number): Promise<void> {
  const redisKey = `ratelimit:${key}`;
  try {
    const count = await redis.incr(redisKey);
    if (count === 1) await redis.expire(redisKey, seconds);
    if (count > limit) throw new ApiError(429, 'RATE_LIMITED', 'Too many requests. Try again shortly.');
  } catch (error) {
    if (error instanceof ApiError) throw error;
    const message = error instanceof Error ? error.message : String(error);
    console.warn(JSON.stringify({ level: 'warn', event: 'redis_rate_limit_failed', message }));
    memoryRateLimit(redisKey, limit, seconds);
  }
}
export function id() { return randomUUID(); }
