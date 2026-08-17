import { Redis } from 'ioredis';
import { config } from './config.js';
import { pool } from './db.js';

const memoryPresence = new Map<string, { deviceId: string; expiresAt: number }>();
const memoryHeartbeatMarkers = new Map<string, number>();

export const redis = new Redis(config.redisUrl, {
  connectTimeout: 5_000,
  commandTimeout: 5_000,
  maxRetriesPerRequest: 1,
  retryStrategy(attempt) {
    return Math.min(attempt * 500, 5_000);
  },
});

redis.on('error', (error) => {
  console.warn(JSON.stringify({ level: 'warn', event: 'redis_error', message: error.message }));
});

export async function isRedisReady() {
  return redis
    .ping()
    .then((reply) => reply === 'PONG')
    .catch(() => false);
}

function warnRedis(event: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  console.warn(JSON.stringify({ level: 'warn', event, message }));
}

function pruneMemoryPresence() {
  const now = Date.now();
  for (const [key, value] of memoryPresence) {
    if (value.expiresAt <= now) memoryPresence.delete(key);
  }
  for (const [key, expiresAt] of memoryHeartbeatMarkers) {
    if (expiresAt <= now) memoryHeartbeatMarkers.delete(key);
  }
}

export async function markOnline(placeId: string, deviceId: string) {
  pruneMemoryPresence();
  memoryPresence.set(placeId, { deviceId, expiresAt: Date.now() + config.presenceTtlSeconds * 1000 });
  try {
    await redis.set(`presence:place:${placeId}`, deviceId, 'EX', config.presenceTtlSeconds);
  } catch (error) {
    warnRedis('redis_presence_mark_online_failed', error);
  }
}
export async function heartbeat(placeId: string, deviceId: string) {
  await markOnline(placeId, deviceId);
  const marker = `presence:persist:${deviceId}`;
  let shouldPersist = false;
  try {
    shouldPersist = Boolean(await redis.set(marker, '1', 'EX', 60, 'NX'));
  } catch (error) {
    warnRedis('redis_presence_heartbeat_marker_failed', error);
    const expiresAt = memoryHeartbeatMarkers.get(marker) ?? 0;
    shouldPersist = expiresAt <= Date.now();
    if (shouldPersist) memoryHeartbeatMarkers.set(marker, Date.now() + 60_000);
  }
  if (shouldPersist) {
    await pool.query('UPDATE portal_device SET last_seen_at=now() WHERE id=$1', [deviceId]);
  }
}
export async function markOffline(placeId: string, deviceId: string) {
  pruneMemoryPresence();
  const memoryCurrent = memoryPresence.get(placeId);
  if (memoryCurrent?.deviceId === deviceId) memoryPresence.delete(placeId);
  const key = `presence:place:${placeId}`;
  try {
    const current = await redis.get(key);
    if (current === deviceId) await redis.del(key);
  } catch (error) {
    warnRedis('redis_presence_mark_offline_failed', error);
  }
}
export async function isOnline(placeId: string) {
  pruneMemoryPresence();
  const fallback = memoryPresence.has(placeId);
  try {
    return (await redis.exists(`presence:place:${placeId}`)) === 1 || fallback;
  } catch (error) {
    warnRedis('redis_presence_read_failed', error);
    return fallback;
  }
}
