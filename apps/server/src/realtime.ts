import { WebSocketServer, WebSocket } from 'ws';
import type { Server, IncomingMessage } from 'node:http';
import { randomUUID } from 'node:crypto';
import type { RealtimeEnvelope, RealtimeEventType } from '@portal/contracts';
import { authenticateHeader } from './security.js';
import { heartbeat, markOffline, markOnline } from './presence.js';
import { pool } from './db.js';

const sockets = new Map<string, WebSocket>();
const places = new Map<string, string>();

export function isRealtimeConnected(deviceId: string) { return sockets.get(deviceId)?.readyState === WebSocket.OPEN; }
export function emit(deviceId: string, type: RealtimeEventType, payload: unknown) {
  const ws = sockets.get(deviceId);
  if (!ws || ws.readyState !== WebSocket.OPEN) return false;
  const envelope: RealtimeEnvelope = { type, messageId: randomUUID(), timestamp: new Date().toISOString(), payload };
  ws.send(JSON.stringify(envelope));
  return true;
}
export function broadcast(type: RealtimeEventType, payload: unknown) { for (const deviceId of sockets.keys()) emit(deviceId, type, payload); }

export function attachRealtime(server: Server) {
  const wss = new WebSocketServer({ noServer: true });
  server.on('upgrade', async (req, socket, head) => {
    try {
      const url = new URL(req.url ?? '/', 'http://localhost');
      if (url.pathname !== '/api/v1/realtime') return socket.destroy();
      const principal = await authenticateHeader(req.headers.authorization);
      wss.handleUpgrade(req, socket, head, (ws) => {
        (ws as WebSocket & { deviceId?: string }).deviceId = principal.deviceId;
        wss.emit('connection', ws, req, principal);
      });
    } catch { socket.destroy(); }
  });

  wss.on('connection', async (ws: WebSocket, _req: IncomingMessage, principal: any) => {
    const deviceId = principal.deviceId as string;
    sockets.get(deviceId)?.close(4000, 'REPLACED');
    sockets.set(deviceId, ws);
    if (principal.placeId) {
      places.set(deviceId, principal.placeId);
      await markOnline(principal.placeId, deviceId);
      broadcast('PORTAL_PRESENCE_CHANGED', { placeId: principal.placeId, online: true });
    }
    const reconnect = await pool.query(`SELECT * FROM portal_session WHERE (caller_device_id=$1 OR receiver_device_id=$1) AND status='RECONNECTING' ORDER BY created_at DESC LIMIT 1`, [deviceId]);
    if (reconnect.rows[0]) {
      const s = reconnect.rows[0];
      const restored = s.started_at ? 'ACTIVE' : 'CONNECTING';
      await pool.query('UPDATE portal_session SET status=$2 WHERE id=$1 AND status=\'RECONNECTING\'', [s.id, restored]);
      if (restored === 'ACTIVE') { emit(s.caller_device_id, 'SESSION_STARTED', { sessionId: s.id }); emit(s.receiver_device_id, 'SESSION_STARTED', { sessionId: s.id }); }
    }
    emit(deviceId, 'HELLO', { deviceId, placeId: principal.placeId });

    const timer = setInterval(async () => {
      const placeId = places.get(deviceId);
      if (placeId) await heartbeat(placeId, deviceId).catch(() => undefined);
      if (ws.readyState === WebSocket.OPEN) ws.ping();
    }, 15_000);

    ws.on('message', async (raw) => {
      try {
        const message = JSON.parse(String(raw));
        if (message.type === 'PING') {
          const placeId = places.get(deviceId);
          if (placeId) await heartbeat(placeId, deviceId);
          emit(deviceId, 'PONG', {});
        }
      } catch { /* ignore malformed client control messages */ }
    });

    ws.on('close', async () => {
      clearInterval(timer);
      if (sockets.get(deviceId) === ws) sockets.delete(deviceId);
      const placeId = places.get(deviceId);
      if (placeId) { await markOffline(placeId, deviceId).catch(() => undefined); broadcast('PORTAL_PRESENCE_CHANGED', { placeId, online: false }); }
      places.delete(deviceId);
      const { rows } = await pool.query(`SELECT * FROM portal_session WHERE (caller_device_id=$1 OR receiver_device_id=$1)
        AND status IN ('CONNECTING','ACTIVE','RECONNECTING') ORDER BY created_at DESC LIMIT 1`, [deviceId]);
      const session = rows[0];
      if (session) {
        await pool.query(`UPDATE portal_session SET status='RECONNECTING' WHERE id=$1 AND status IN ('CONNECTING','ACTIVE')`, [session.id]);
        const peer = session.caller_device_id === deviceId ? session.receiver_device_id : session.caller_device_id;
        emit(peer, 'PEER_DISCONNECTED', { sessionId: session.id });
        setTimeout(async () => {
          if (isRealtimeConnected(deviceId)) return;
          const q = await pool.query(`SELECT * FROM portal_session WHERE id=$1 AND status='RECONNECTING'`, [session.id]);
          const current = q.rows[0];
          if (!current) return;
          await pool.query(`UPDATE portal_session SET status='FAILED',ended_at=now(),end_reason='CONTROL_RECONNECT_TIMEOUT' WHERE id=$1 AND status='RECONNECTING'`, [session.id]);
          emit(peer, 'SESSION_ENDED', { sessionId: session.id, reason: 'CONTROL_RECONNECT_TIMEOUT' });
        }, 30_000);
      }
    });
  });
}
