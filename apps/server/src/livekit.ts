import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';
import { config } from './config.js';

const roomService = new RoomServiceClient(config.liveKitUrl, config.liveKitApiKey, config.liveKitApiSecret);
export function roomName(sessionId: string) { return `portal-session-${sessionId}`; }
export async function ensureRoom(name: string) {
  try { await roomService.createRoom({ name, emptyTimeout: 60, maxParticipants: 2 }); } catch { /* first client can create it */ }
}
export async function participantToken(room: string, deviceId: string, placeId: string) {
  const token = new AccessToken(config.liveKitApiKey, config.liveKitApiSecret, { identity: deviceId, ttl: '10m', metadata: JSON.stringify({ placeId }) });
  token.addGrant({ roomJoin: true, room, canPublish: true, canSubscribe: true, canPublishData: false });
  return token.toJwt();
}
