import { Platform } from 'react-native';
import * as Device from 'expo-device';

const rawApiUrl = process.env.EXPO_PUBLIC_API_URL;

function host(value: string) {
  try { return new URL(value).hostname.toLowerCase(); }
  catch { throw new Error(`Invalid EXPO_PUBLIC_API_URL: ${value}`); }
}

function isPrivateHost(value: string) {
  if (value === 'localhost' || value === '::1' || value === '[::1]') return true;
  if (value === '10.0.2.2') return true;
  if (/^127\./.test(value)) return true;
  if (/^10\./.test(value)) return true;
  if (/^192\.168\./.test(value)) return true;
  const match = value.match(/^172\.(\d{1,2})\./);
  return Boolean(match && Number(match[1]) >= 16 && Number(match[1]) <= 31);
}

if (!rawApiUrl) {
  throw new Error('EXPO_PUBLIC_API_URL is required. Use a LAN URL for physical-device development, 10.0.2.2 only for Android emulator development, and HTTPS for production.');
}

const apiHost = host(rawApiUrl);
const clientNetworkTarget = process.env.EXPO_PUBLIC_CLIENT_NETWORK_TARGET ?? 'physical-device';
if (Platform.OS === 'android' && Device.isDevice && apiHost === '10.0.2.2') {
  throw new Error('EXPO_PUBLIC_API_URL cannot use 10.0.2.2 on a physical Android device.');
}
if (apiHost === '10.0.2.2' && clientNetworkTarget !== 'android-emulator') {
  throw new Error('EXPO_PUBLIC_API_URL uses 10.0.2.2, which is Android-emulator-only. Set EXPO_PUBLIC_CLIENT_NETWORK_TARGET=android-emulator for emulator development.');
}
if (!__DEV__) {
  if (!rawApiUrl.startsWith('https://')) throw new Error('EXPO_PUBLIC_API_URL must use https:// in production builds.');
  if (isPrivateHost(apiHost)) throw new Error('EXPO_PUBLIC_API_URL must be publicly reachable in production builds.');
}

export const API_URL = rawApiUrl.replace(/\/$/, '');
export const WS_URL = API_URL.replace(/^http/, 'ws');
