import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(serverRoot, '../..');
const explicitEnv = new Set(Object.keys(process.env));

function loadEnv(pathname: string) {
  if (!fs.existsSync(pathname)) return;
  const parsed = dotenv.parse(fs.readFileSync(pathname));
  for (const [key, value] of Object.entries(parsed)) {
    if (!explicitEnv.has(key)) process.env[key] = value;
  }
}

loadEnv(path.join(repoRoot, '.env'));
loadEnv(path.join(serverRoot, '.env'));

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) throw new Error(`Missing required environment variable ${name}`);
  return value;
}

function hostname(value: string): string {
  try { return new URL(value).hostname.toLowerCase(); }
  catch { throw new Error(`Invalid URL configured: ${value}`); }
}

function isPrivateClientHost(host: string): boolean {
  if (host === 'localhost' || host === '::1' || host === '[::1]') return true;
  if (host === '10.0.2.2') return true;
  if (/^127\./.test(host)) return true;
  if (/^10\./.test(host)) return true;
  if (/^192\.168\./.test(host)) return true;
  const match = host.match(/^172\.(\d{1,2})\./);
  return Boolean(match && Number(match[1]) >= 16 && Number(match[1]) <= 31);
}

export const config = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 8080),
  databaseUrl: required('DATABASE_URL', 'postgres://portal:portal_dev_only@localhost:5432/company_portal'),
  redisUrl: required('REDIS_URL', 'redis://localhost:6379'),
  liveKitUrl: required('LIVEKIT_URL', 'http://localhost:7880'),
  liveKitPublicUrl: required('LIVEKIT_PUBLIC_URL', 'ws://localhost:7880'),
  liveKitApiKey: required('LIVEKIT_API_KEY', 'devkey'),
  liveKitApiSecret: required('LIVEKIT_API_SECRET', 'devsecretdevsecretdevsecretdevsecret'),
  deviceSecretPepper: required('DEVICE_SECRET_PEPPER', 'development-only-change-me-32-bytes-minimum'),
  expoAccessToken: process.env.EXPO_ACCESS_TOKEN ?? '',
  clientNetworkTarget: process.env.CLIENT_NETWORK_TARGET ?? 'physical-device',
  requestTimeoutSeconds: 30,
  presenceTtlSeconds: 45,
  autoAcceptCountdownSeconds: 3,
};

const publicLiveKitHost = hostname(config.liveKitPublicUrl);
if (publicLiveKitHost === '10.0.2.2' && config.clientNetworkTarget !== 'android-emulator') {
  throw new Error('LIVEKIT_PUBLIC_URL uses 10.0.2.2, which is Android-emulator-only. Set CLIENT_NETWORK_TARGET=android-emulator for emulator development, or use a LAN/public URL.');
}

if (config.nodeEnv === 'production') {
  if (config.deviceSecretPepper.length < 32) throw new Error('DEVICE_SECRET_PEPPER must be at least 32 characters');
  if (!config.liveKitPublicUrl.startsWith('wss://')) throw new Error('LIVEKIT_PUBLIC_URL must use wss:// in production');
  if (isPrivateClientHost(publicLiveKitHost)) throw new Error('LIVEKIT_PUBLIC_URL must be publicly reachable in production');
  const publicApiUrl = process.env.EXPO_PUBLIC_API_URL;
  if (publicApiUrl) {
    if (!publicApiUrl.startsWith('https://')) throw new Error('EXPO_PUBLIC_API_URL must use https:// in production');
    if (isPrivateClientHost(hostname(publicApiUrl))) throw new Error('EXPO_PUBLIC_API_URL must be publicly reachable in production');
  }
}
