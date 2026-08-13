import 'dotenv/config';

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) throw new Error(`Missing required environment variable ${name}`);
  return value;
}

export const config = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 8080),
  databaseUrl: required('DATABASE_URL', 'postgres://portal:portal_dev_only@localhost:5432/company_portal'),
  redisUrl: required('REDIS_URL', 'redis://localhost:6379'),
  liveKitUrl: required('LIVEKIT_URL', 'http://localhost:7880'),
  liveKitPublicUrl: required('LIVEKIT_PUBLIC_URL', 'ws://10.0.2.2:7880'),
  liveKitApiKey: required('LIVEKIT_API_KEY', 'devkey'),
  liveKitApiSecret: required('LIVEKIT_API_SECRET', 'devsecretdevsecretdevsecretdevsecret'),
  deviceSecretPepper: required('DEVICE_SECRET_PEPPER', 'development-only-change-me-32-bytes-minimum'),
  expoAccessToken: process.env.EXPO_ACCESS_TOKEN ?? '',
  requestTimeoutSeconds: 30,
  presenceTtlSeconds: 45,
  autoAcceptCountdownSeconds: 3,
};

if (config.nodeEnv === 'production') {
  if (config.deviceSecretPepper.length < 32) throw new Error('DEVICE_SECRET_PEPPER must be at least 32 characters');
  if (!config.liveKitPublicUrl.startsWith('wss://')) throw new Error('LIVEKIT_PUBLIC_URL must use wss:// in production');
}
