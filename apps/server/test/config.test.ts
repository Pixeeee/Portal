import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

function loadConfig(env: Record<string, string | undefined>) {
  return spawnSync(process.execPath, ['--import', 'tsx', '-e', "await import('./src/config.ts')"], {
    cwd: new URL('..', import.meta.url),
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
}

test('LiveKit public URL does not silently allow Android emulator host for physical devices', () => {
  const result = loadConfig({
    NODE_ENV: 'development',
    LIVEKIT_PUBLIC_URL: 'ws://10.0.2.2:7880',
    CLIENT_NETWORK_TARGET: 'physical-device',
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Android-emulator-only/);
});

test('LiveKit emulator URL is allowed only when emulator target is explicit', () => {
  const result = loadConfig({
    NODE_ENV: 'development',
    LIVEKIT_PUBLIC_URL: 'ws://10.0.2.2:7880',
    CLIENT_NETWORK_TARGET: 'android-emulator',
  });
  assert.equal(result.status, 0, result.stderr);
});

test('production rejects private client-facing endpoints', () => {
  const result = loadConfig({
    NODE_ENV: 'production',
    DEVICE_SECRET_PEPPER: '12345678901234567890123456789012',
    LIVEKIT_PUBLIC_URL: 'wss://192.168.0.247:7880',
    EXPO_PUBLIC_API_URL: 'https://portal-api.example.com',
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /publicly reachable/);
});
