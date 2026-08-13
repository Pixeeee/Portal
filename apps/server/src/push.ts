import { config } from './config.js';
import { pool } from './db.js';

export async function registerPushToken(deviceId: string, token: string) {
  await pool.query(`INSERT INTO device_push_token(id,device_id,token,platform) VALUES(gen_random_uuid(),$1,$2,'EXPO')
    ON CONFLICT(device_id,token) DO UPDATE SET updated_at=now(), revoked_at=NULL`, [deviceId, token]);
}
export async function sendIncomingPush(deviceId: string, callerName: string, requestId: string) {
  const { rows } = await pool.query('SELECT token FROM device_push_token WHERE device_id=$1 AND revoked_at IS NULL ORDER BY updated_at DESC LIMIT 1', [deviceId]);
  const token = rows[0]?.token;
  if (!token?.startsWith('ExponentPushToken[') && !token?.startsWith('ExpoPushToken[')) return;
  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST', headers: { 'content-type': 'application/json', ...(config.expoAccessToken ? { authorization: `Bearer ${config.expoAccessToken}` } : {}) },
    body: JSON.stringify({ to: token, title: 'Incoming Portal', body: `${callerName} wants to connect.`, data: { url: `/incoming/${requestId}` }, sound: 'default', priority: 'high' }),
  }).catch(() => undefined);
}
