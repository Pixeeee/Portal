import { Redis } from 'ioredis';
import { config } from './config.js';
import { pool } from './db.js';

export const redis = new Redis(config.redisUrl, { maxRetriesPerRequest: 3 });
export async function markOnline(placeId: string, deviceId: string) {
  await redis.set(`presence:place:${placeId}`, deviceId, 'EX', config.presenceTtlSeconds);
}
export async function heartbeat(placeId: string, deviceId: string) {
  await markOnline(placeId, deviceId);
  const marker = `presence:persist:${deviceId}`;
  if (await redis.set(marker, '1', 'EX', 60, 'NX')) {
    await pool.query('UPDATE portal_device SET last_seen_at=now() WHERE id=$1', [deviceId]);
  }
}
export async function markOffline(placeId: string, deviceId: string) {
  const key = `presence:place:${placeId}`;
  const current = await redis.get(key);
  if (current === deviceId) await redis.del(key);
}
export async function isOnline(placeId: string) { return (await redis.exists(`presence:place:${placeId}`)) === 1; }
