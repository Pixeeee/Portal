import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

const KEYS = { installation: 'portal.installationId', device: 'portal.deviceId', secret: 'portal.deviceSecret' } as const;
export interface Identity { installationId: string; deviceId: string | null; deviceSecret: string; }

function bytesToBase64(bytes: Uint8Array) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let out = '';
  for (let i=0;i<bytes.length;i+=3) {
    const a=bytes[i]??0,b=bytes[i+1]??0,c=bytes[i+2]??0;
    const n=(a<<16)|(b<<8)|c;
    out += alphabet[(n>>18)&63] + alphabet[(n>>12)&63] + (i+1<bytes.length?alphabet[(n>>6)&63]:'=') + (i+2<bytes.length?alphabet[n&63]:'=');
  }
  return out;
}
export async function loadOrCreateIdentity(): Promise<Identity> {
  let installationId = await SecureStore.getItemAsync(KEYS.installation);
  let deviceSecret = await SecureStore.getItemAsync(KEYS.secret);
  const deviceId = await SecureStore.getItemAsync(KEYS.device);
  if (!installationId) { installationId = Crypto.randomUUID(); await SecureStore.setItemAsync(KEYS.installation, installationId); }
  if (!deviceSecret) { deviceSecret = bytesToBase64(await Crypto.getRandomBytesAsync(32)); await SecureStore.setItemAsync(KEYS.secret, deviceSecret); }
  return { installationId, deviceId, deviceSecret };
}
export async function saveDeviceId(deviceId: string) { await SecureStore.setItemAsync(KEYS.device, deviceId); }
export async function resetIdentity() { await Promise.all(Object.values(KEYS).map((k)=>SecureStore.deleteItemAsync(k))); }
