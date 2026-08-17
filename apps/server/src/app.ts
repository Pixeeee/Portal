import http, { type IncomingMessage, type ServerResponse } from 'node:http';
import { randomBytes, randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import { isPortalCode, normalizePortalCode, type DeviceBootstrapRequest } from '@portal/contracts';
import { config } from './config.js';
import { pool, tx } from './db.js';
import { ApiError, authenticateRequest, id, rateLimit, secretHash, secretsEqual, type DevicePrincipal } from './security.js';
import { isOnline, isRedisReady, redis } from './presence.js';
import { attachRealtime, emit, isRealtimeConnected } from './realtime.js';
import { ensureRoom, participantToken, roomName } from './livekit.js';
import { registerPushToken, sendIncomingPush } from './push.js';

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function publicCode() {
  const b = randomBytes(8);
  const chars = Array.from(b, (v) => CODE_ALPHABET[v % CODE_ALPHABET.length]);
  return `${chars.slice(0,4).join('')}-${chars.slice(4).join('')}`;
}
function json(res: ServerResponse, status: number, body?: unknown) {
  res.statusCode = status;
  if (body === undefined) return res.end();
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify(body));
}
async function body(req: IncomingMessage): Promise<any> {
  let total = 0; const chunks: Buffer[] = [];
  for await (const chunk of req) {
    total += chunk.length;
    if (total > 65_536) throw new ApiError(413, 'PAYLOAD_TOO_LARGE', 'Request body is too large');
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new ApiError(400, 'INVALID_JSON', 'Invalid JSON request'); }
}
function text(value: unknown, max: number, required = false): string | null {
  if (value == null) { if (required) throw new ApiError(400, 'VALIDATION_ERROR', 'Required field is missing'); return null; }
  const s = String(value).trim();
  if (required && !s) throw new ApiError(400, 'VALIDATION_ERROR', 'Required field is empty');
  if (s.length > max) throw new ApiError(400, 'VALIDATION_ERROR', `Field exceeds ${max} characters`);
  return s || null;
}
async function audit(eventType: string, deviceId?: string | null, placeId?: string | null, metadata?: unknown) {
  await pool.query(`INSERT INTO audit_event(id,device_id,place_id,event_type,metadata) VALUES($1,$2,$3,$4,$5)`,
    [randomUUID(), deviceId ?? null, placeId ?? null, eventType, metadata ? JSON.stringify(metadata) : null]);
}
async function placeSafe(placeId: string) {
  const { rows } = await pool.query(`SELECT id, public_code, name, location_label, description FROM portal_place WHERE id=$1 AND archived_at IS NULL`, [placeId]);
  const p = rows[0];
  if (!p) throw new ApiError(404, 'PORTAL_NOT_FOUND', 'Portal not found');
  return { id: p.id, publicCode: p.public_code, name: p.name, location: p.location_label, description: p.description, online: await isOnline(p.id) };
}
async function activeSession(deviceId: string, client: PoolClient | typeof pool = pool) {
  const q = await client.query(`SELECT * FROM portal_session WHERE (caller_device_id=$1 OR receiver_device_id=$1)
    AND status IN ('CREATED','CONNECTING','ACTIVE','RECONNECTING') LIMIT 1`, [deviceId]);
  return q.rows[0] ?? null;
}
async function acceptRequest(requestId: string, receiverDeviceId: string) {
  let session: any;
  try {
    session = await tx(async (c) => {
      const qr = await c.query(`SELECT * FROM connection_request WHERE id=$1 FOR UPDATE`, [requestId]);
      const r = qr.rows[0];
      if (!r) throw new ApiError(404, 'REQUEST_NOT_FOUND', 'Connection request not found');
      if (r.receiver_device_id !== receiverDeviceId) throw new ApiError(403, 'REQUEST_FORBIDDEN', 'Not the receiving Portal');
      if (r.status !== 'PENDING') throw new ApiError(409, 'REQUEST_NOT_PENDING', `Request is ${r.status}`);
      if (new Date(r.expires_at).getTime() <= Date.now()) {
        await c.query(`UPDATE connection_request SET status='EXPIRED', responded_at=now() WHERE id=$1`, [r.id]);
        throw new ApiError(409, 'REQUEST_EXPIRED', 'Connection request expired');
      }
      if (await activeSession(r.caller_device_id, c) || await activeSession(r.receiver_device_id, c)) {
        await c.query(`UPDATE connection_request SET status='BUSY', responded_at=now() WHERE id=$1`, [r.id]);
        return { busy: true, request: r };
      }
      const sid = randomUUID();
      const room = roomName(sid);
      await c.query(`INSERT INTO portal_session(id,room_name,caller_device_id,caller_place_id,receiver_device_id,receiver_place_id,status)
        VALUES($1,$2,$3,$4,$5,$6,'CONNECTING')`, [sid, room, r.caller_device_id, r.caller_place_id, r.receiver_device_id, r.receiver_place_id]);
      await c.query(`UPDATE connection_request SET status='ACCEPTED', responded_at=now() WHERE id=$1`, [r.id]);
      return { busy: false, request: r, id: sid, roomName: room };
    });
  } catch (e: any) {
    if (e?.code === '23505') throw new ApiError(409, 'SESSION_BUSY', 'One of the Portals is already connected');
    throw e;
  }
  if (session.busy) {
    emit(session.request.caller_device_id, 'CONNECTION_BUSY', { requestId });
    emit(session.request.receiver_device_id, 'CONNECTION_BUSY', { requestId });
    return { id: requestId, status: 'BUSY' };
  }
  await ensureRoom(session.roomName);
  await audit('CONNECTION_ACCEPTED', receiverDeviceId, session.request.receiver_place_id, { requestId });
  emit(session.request.caller_device_id, 'CONNECTION_ACCEPTED', { requestId });
  emit(session.request.receiver_device_id, 'CONNECTION_ACCEPTED', { requestId });
  emit(session.request.caller_device_id, 'SESSION_READY', { requestId, sessionId: session.id });
  emit(session.request.receiver_device_id, 'SESSION_READY', { requestId, sessionId: session.id });
  return { id: requestId, status: 'ACCEPTED', sessionId: session.id };
}

async function route(req: IncomingMessage, res: ServerResponse) {
  const method = req.method ?? 'GET';
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  const p = url.pathname;
  if (method === 'GET' && p === '/health/live') return json(res, 200, { status: 'ok' });
  if (method === 'GET' && p === '/health/ready') {
    const db = await pool.query('SELECT 1').then(() => true).catch(() => false);
    const rd = await isRedisReady();
    return json(res, db && rd ? 200 : 503, { status: db && rd ? 'ready' : 'degraded', database: db, redis: rd });
  }
  if (method === 'POST' && p === '/api/v1/devices/bootstrap') {
    await rateLimit(redis, `bootstrap:${req.socket.remoteAddress}`, 120, 60);
    const b = await body(req) as DeviceBootstrapRequest;
    const installationId = text(b.installationId, 64, true)!;
    const deviceSecret = text(b.deviceSecret, 512, true)!;
    if (Buffer.from(deviceSecret, 'base64').length < 32) throw new ApiError(400, 'WEAK_DEVICE_SECRET', 'Device secret must contain at least 256 bits');
    const existing = await pool.query('SELECT * FROM portal_device WHERE installation_id=$1', [installationId]);
    if (existing.rows[0]) {
      const d = existing.rows[0];
      if (d.revoked_at || !secretsEqual(deviceSecret, d.device_secret_hash)) throw new ApiError(401, 'BOOTSTRAP_CONFLICT', 'Installation identity could not be verified');
      return json(res, 200, { deviceId: d.id, placeId: d.place_id });
    }
    const deviceId = randomUUID();
    await pool.query(`INSERT INTO portal_device(id,installation_id,device_secret_hash,device_name,manufacturer,model,android_version,app_version)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8)`, [deviceId, installationId, secretHash(deviceSecret), text(b.deviceName,120), text(b.manufacturer,120), text(b.model,120), text(b.androidVersion,40), text(b.appVersion,40)]);
    await audit('DEVICE_REGISTERED', deviceId);
    return json(res, 201, { deviceId, placeId: null });
  }

  const principal = await authenticateRequest(req);
  if (method === 'GET' && p === '/api/v1/diagnostics') {
    const db = await pool.query('SELECT 1').then(() => true).catch(() => false);
    const rd = await isRedisReady();
    const t0 = Date.now(); const lk = await fetch(config.liveKitUrl).then(() => true).catch(() => false);
    return json(res, 200, { backend: true, database: db, redis: rd, liveKit: lk, latencyMs: Date.now() - t0 });
  }
  if (method === 'POST' && p === '/api/v1/devices/push-token') {
    const b = await body(req); const token = text(b.token,4096,true)!;
    await registerPushToken(principal.deviceId, token); return json(res, 204);
  }
  if (method === 'POST' && p === '/api/v1/devices/revoke-self') {
    await pool.query('UPDATE portal_device SET revoked_at=now() WHERE id=$1', [principal.deviceId]);
    return json(res, 204);
  }
  if (method === 'POST' && p === '/api/v1/places') {
    if (principal.placeId) throw new ApiError(409, 'PLACE_EXISTS', 'This installation already has a Portal');
    const b = await body(req); const name = text(b.name,120,true)!;
    let code = ''; let placeId = randomUUID();
    for (let i=0;i<20;i++) {
      code = publicCode();
      try {
        await tx(async (c) => {
          await c.query(`INSERT INTO portal_place(id,public_code,name,location_label,description,created_by_device_id) VALUES($1,$2,$3,$4,$5,$6)`,
            [placeId, code, name, text(b.location,160), text(b.description,1000), principal.deviceId]);
          await c.query('UPDATE portal_device SET place_id=$1 WHERE id=$2 AND place_id IS NULL', [placeId, principal.deviceId]);
        }); break;
      } catch (e: any) { if (e.code !== '23505' || i === 19) throw e; placeId = randomUUID(); }
    }
    await audit('PLACE_CREATED', principal.deviceId, placeId); return json(res,201, await placeSafe(placeId));
  }
  if (method === 'GET' && p === '/api/v1/places/me') {
    if (!principal.placeId) throw new ApiError(404,'PLACE_NOT_FOUND','Create your Portal first');
    return json(res,200,await placeSafe(principal.placeId));
  }
  if (method === 'PATCH' && p === '/api/v1/places/me') {
    if (!principal.placeId) throw new ApiError(404,'PLACE_NOT_FOUND','Create your Portal first');
    const b = await body(req); const current = await pool.query('SELECT * FROM portal_place WHERE id=$1',[principal.placeId]); const c=current.rows[0];
    await pool.query('UPDATE portal_place SET name=$1,location_label=$2,description=$3,updated_at=now() WHERE id=$4',
      [b.name===undefined?c.name:text(b.name,120,true), b.location===undefined?c.location_label:text(b.location,160), b.description===undefined?c.description:text(b.description,1000), principal.placeId]);
    await audit('PLACE_RENAMED',principal.deviceId,principal.placeId); return json(res,200,await placeSafe(principal.placeId));
  }
  const resolveMatch = p.match(/^\/api\/v1\/places\/resolve\/([^/]+)$/);
  if (method === 'GET' && resolveMatch) {
    await rateLimit(redis,`resolve:${principal.deviceId}`,45,60); const code=normalizePortalCode(decodeURIComponent(resolveMatch[1]!));
    if (!isPortalCode(code)) throw new ApiError(400,'INVALID_PORTAL_CODE','Invalid Portal code');
    const q=await pool.query('SELECT id FROM portal_place WHERE public_code=$1 AND archived_at IS NULL',[code]);
    if(!q.rows[0]) throw new ApiError(404,'PORTAL_NOT_FOUND','Portal not found'); return json(res,200,await placeSafe(q.rows[0].id));
  }
  if (method === 'POST' && p === '/api/v1/connections/requests') {
    if(!principal.placeId) throw new ApiError(409,'PLACE_REQUIRED','Create a Portal before connecting');
    await rateLimit(redis,`connect:${principal.deviceId}`,30,60); const b=await body(req); const receiverPlaceId=text(b.receiverPlaceId,64,true)!;
    if(receiverPlaceId===principal.placeId) throw new ApiError(400,'CANNOT_CALL_SELF','Cannot connect a Portal to itself');
    const idem=text(req.headers['idempotency-key'],100);
    if(idem){ const prior=await pool.query(`SELECT resource_id FROM api_idempotency WHERE device_id=$1 AND idempotency_key=$2 AND operation='CONNECTION_REQUEST' AND expires_at>now()`,[principal.deviceId,idem]);
      if(prior.rows[0]){const r=await pool.query('SELECT id,status,expires_at FROM connection_request WHERE id=$1',[prior.rows[0].resource_id]); if(r.rows[0]) return json(res,200,{id:r.rows[0].id,status:r.rows[0].status,expiresAt:r.rows[0].expires_at});}}
    const device=await pool.query(`SELECT id FROM portal_device WHERE place_id=$1 AND revoked_at IS NULL ORDER BY last_seen_at DESC NULLS LAST, created_at LIMIT 1`,[receiverPlaceId]);
    if(!device.rows[0]) throw new ApiError(404,'PORTAL_NOT_FOUND','Portal not found'); const receiverDeviceId=device.rows[0].id;
    if(!await isOnline(receiverPlaceId)) throw new ApiError(409,'PORTAL_OFFLINE','This Portal is currently unavailable');
    if(await activeSession(principal.deviceId)||await activeSession(receiverDeviceId)) throw new ApiError(409,'PORTAL_BUSY','One of the Portals is already connected');
    const rid=randomUUID(); const expires=new Date(Date.now()+config.requestTimeoutSeconds*1000);
    await pool.query(`INSERT INTO connection_request(id,caller_device_id,caller_place_id,receiver_device_id,receiver_place_id,status,expires_at) VALUES($1,$2,$3,$4,$5,'PENDING',$6)`,[rid,principal.deviceId,principal.placeId,receiverDeviceId,receiverPlaceId,expires]);
    if(idem) await pool.query(`INSERT INTO api_idempotency(id,device_id,idempotency_key,operation,resource_id,expires_at) VALUES($1,$2,$3,'CONNECTION_REQUEST',$4,now()+interval '10 minutes') ON CONFLICT DO NOTHING`,[randomUUID(),principal.deviceId,idem,rid]);
    const caller=await placeSafe(principal.placeId); const receiver=await placeSafe(receiverPlaceId);
    const trust=await pool.query('SELECT auto_accept FROM trusted_peer WHERE owner_device_id=$1 AND trusted_place_id=$2',[receiverDeviceId,principal.placeId]);
    const autoAccept=trust.rows[0]?.auto_accept===true;
    emit(receiverDeviceId,'CONNECTION_REQUESTED',{requestId:rid,callerPlace:caller,receiverPlace:receiver,expiresAt:expires.toISOString(),...(autoAccept?{autoAcceptInSeconds:config.autoAcceptCountdownSeconds}:{})});
    if(!isRealtimeConnected(receiverDeviceId)) await sendIncomingPush(receiverDeviceId,caller.name,rid);
    await audit('CONNECTION_REQUESTED',principal.deviceId,principal.placeId,{requestId:rid});
    if(autoAccept) setTimeout(()=>acceptRequest(rid,receiverDeviceId).catch(()=>undefined),config.autoAcceptCountdownSeconds*1000);
    return json(res,201,{id:rid,status:'PENDING',expiresAt:expires.toISOString()});
  }
  const requestGet=p.match(/^\/api\/v1\/connections\/requests\/([^/]+)$/);
  if(method==='GET'&&requestGet){const q=await pool.query('SELECT * FROM connection_request WHERE id=$1',[requestGet[1]]);const r=q.rows[0];if(!r)throw new ApiError(404,'REQUEST_NOT_FOUND','Connection request not found');if(r.caller_device_id!==principal.deviceId&&r.receiver_device_id!==principal.deviceId)throw new ApiError(403,'REQUEST_FORBIDDEN','Not part of this request');const caller=await placeSafe(r.caller_place_id);const receiver=await placeSafe(r.receiver_place_id);return json(res,200,{requestId:r.id,status:r.status,callerPlace:caller,receiverPlace:receiver,expiresAt:r.expires_at});}
  const action=p.match(/^\/api\/v1\/connections\/requests\/([^/]+)\/(accept|decline|cancel)$/);
  if(method==='POST'&&action){const requestId=action[1]!, op=action[2]!;
    if(op==='accept') return json(res,200,await acceptRequest(requestId,principal.deviceId));
    const qr=await pool.query('SELECT * FROM connection_request WHERE id=$1',[requestId]); const r=qr.rows[0]; if(!r) throw new ApiError(404,'REQUEST_NOT_FOUND','Connection request not found');
    if(op==='decline'&&r.receiver_device_id!==principal.deviceId) throw new ApiError(403,'REQUEST_FORBIDDEN','Not the receiver');
    if(op==='cancel'&&r.caller_device_id!==principal.deviceId&&r.receiver_device_id!==principal.deviceId) throw new ApiError(403,'REQUEST_FORBIDDEN','Not part of this request');
    if(r.status!=='PENDING') return json(res,200,{id:r.id,status:r.status,expiresAt:r.expires_at});
    const status=op==='decline'?'DECLINED':'CANCELLED'; await pool.query('UPDATE connection_request SET status=$1,responded_at=now() WHERE id=$2 AND status=\'PENDING\'',[status,r.id]);
    emit(r.caller_device_id,status==='DECLINED'?'CONNECTION_DECLINED':'CONNECTION_CANCELLED',{requestId:r.id}); emit(r.receiver_device_id,status==='DECLINED'?'CONNECTION_DECLINED':'CONNECTION_CANCELLED',{requestId:r.id});
    await audit(`CONNECTION_${status}`,principal.deviceId,principal.placeId,{requestId:r.id}); return json(res,200,{id:r.id,status,expiresAt:r.expires_at});
  }
  if(method==='GET'&&p==='/api/v1/sessions/recent'){
    const q=await pool.query(`SELECT s.*, cp.name AS caller_name, rp.name AS receiver_name FROM portal_session s JOIN portal_place cp ON cp.id=s.caller_place_id JOIN portal_place rp ON rp.id=s.receiver_place_id WHERE s.caller_device_id=$1 OR s.receiver_device_id=$1 ORDER BY s.created_at DESC LIMIT 50`,[principal.deviceId]);
    return json(res,200,q.rows.map(sessionJson));
  }
  const sessionMatch=p.match(/^\/api\/v1\/sessions\/([^/]+)(?:\/(credentials|started|end))?$/);
  if(sessionMatch){const sid=sessionMatch[1]!, op=sessionMatch[2]; const q=await pool.query('SELECT * FROM portal_session WHERE id=$1',[sid]); const s=q.rows[0];
    if(!s) throw new ApiError(404,'SESSION_NOT_FOUND','Portal session not found'); if(s.caller_device_id!==principal.deviceId&&s.receiver_device_id!==principal.deviceId) throw new ApiError(403,'SESSION_FORBIDDEN','This device does not belong to the session');
    if(method==='GET'&&!op) return json(res,200,sessionJson(s));
    if(method==='POST'&&op==='credentials'){if(['ENDED','FAILED'].includes(s.status)) throw new ApiError(409,'SESSION_NOT_ACTIVE','Session is no longer active'); const placeId=principal.placeId!;
      return json(res,200,{sessionId:s.id,serverUrl:config.liveKitPublicUrl,participantToken:await participantToken(s.room_name,principal.deviceId,placeId),roomName:s.room_name});}
    if(method==='POST'&&op==='started'){if(['CONNECTING','RECONNECTING'].includes(s.status)){await pool.query(`UPDATE portal_session SET status='ACTIVE',started_at=COALESCE(started_at,now()) WHERE id=$1`,[sid]); emit(s.caller_device_id,'SESSION_STARTED',{sessionId:sid});emit(s.receiver_device_id,'SESSION_STARTED',{sessionId:sid});await audit('SESSION_STARTED',principal.deviceId,principal.placeId,{sessionId:sid});} return json(res,204);}
    if(method==='POST'&&op==='end'){const b=await body(req);const reason=text(b.reason,80)??'USER_ENDED';if(!['ENDED','FAILED'].includes(s.status)){await pool.query(`UPDATE portal_session SET status='ENDED',ended_at=now(),end_reason=$2 WHERE id=$1`,[sid,reason]);emit(s.caller_device_id,'SESSION_ENDED',{sessionId:sid,reason});emit(s.receiver_device_id,'SESSION_ENDED',{sessionId:sid,reason});await audit('SESSION_ENDED',principal.deviceId,principal.placeId,{sessionId:sid,reason});}return json(res,200,sessionJson((await pool.query('SELECT * FROM portal_session WHERE id=$1',[sid])).rows[0]));}
  }
  if(method==='GET'&&p==='/api/v1/trusted'){
    const q=await pool.query(`SELECT t.id,t.trusted_place_id,t.auto_accept,p.name,p.public_code FROM trusted_peer t JOIN portal_place p ON p.id=t.trusted_place_id WHERE t.owner_device_id=$1 ORDER BY p.name`,[principal.deviceId]);
    return json(res,200,q.rows.map(r=>({id:r.id,trustedPlaceId:r.trusted_place_id,name:r.name,publicCode:r.public_code,autoAccept:r.auto_accept})));
  }
  if(method==='POST'&&p==='/api/v1/trusted'){const b=await body(req);const placeId=text(b.trustedPlaceId,64,true)!;if(placeId===principal.placeId)throw new ApiError(400,'CANNOT_TRUST_SELF','Cannot trust your own Portal');
    const q=await pool.query(`INSERT INTO trusted_peer(id,owner_device_id,trusted_place_id,auto_accept) VALUES($1,$2,$3,$4) ON CONFLICT(owner_device_id,trusted_place_id) DO UPDATE SET auto_accept=EXCLUDED.auto_accept RETURNING *`,[randomUUID(),principal.deviceId,placeId,Boolean(b.autoAccept)]); await audit('TRUSTED_PEER_ADDED',principal.deviceId,principal.placeId,{trustedPlaceId:placeId}); emit(principal.deviceId,'TRUST_UPDATED',{}); return json(res,201,q.rows[0]);}
  const trustMatch=p.match(/^\/api\/v1\/trusted\/([^/]+)$/); if(trustMatch&&method==='PATCH'){const b=await body(req);const q=await pool.query('UPDATE trusted_peer SET auto_accept=$1 WHERE id=$2 AND owner_device_id=$3 RETURNING *',[Boolean(b.autoAccept),trustMatch[1],principal.deviceId]);if(!q.rows[0])throw new ApiError(404,'TRUST_NOT_FOUND','Trusted Portal not found');emit(principal.deviceId,'TRUST_UPDATED',{});return json(res,200,q.rows[0]);}
  if(trustMatch&&method==='DELETE'){const q=await pool.query('DELETE FROM trusted_peer WHERE id=$1 AND owner_device_id=$2 RETURNING trusted_place_id',[trustMatch[1],principal.deviceId]);if(!q.rows[0])throw new ApiError(404,'TRUST_NOT_FOUND','Trusted Portal not found');await audit('TRUSTED_PEER_REMOVED',principal.deviceId,principal.placeId,{trustedPlaceId:q.rows[0].trusted_place_id});emit(principal.deviceId,'TRUST_UPDATED',{});return json(res,204);}
  throw new ApiError(404,'NOT_FOUND','Endpoint not found');
}
function sessionJson(s:any){return{id:s.id,roomName:s.room_name,status:s.status,callerPlaceId:s.caller_place_id,receiverPlaceId:s.receiver_place_id,...(s.caller_name?{callerPlaceName:s.caller_name}:{}),...(s.receiver_name?{receiverPlaceName:s.receiver_name}:{}),createdAt:s.created_at,startedAt:s.started_at,endedAt:s.ended_at,endReason:s.end_reason};}

export function createApp(){
  const server=http.createServer(async(req,res)=>{try{await route(req,res);}catch(e:any){const err=e instanceof ApiError?e:new ApiError(500,'INTERNAL_ERROR','Portal service encountered an unexpected error');if(!(e instanceof ApiError))console.error(e);json(res,err.status,{code:err.code,message:err.message});}});
  attachRealtime(server);
  const expiry=setInterval(async()=>{try{const q=await pool.query(`UPDATE connection_request SET status='EXPIRED',responded_at=now() WHERE status='PENDING' AND expires_at<=now() RETURNING *`);for(const r of q.rows){emit(r.caller_device_id,'CONNECTION_EXPIRED',{requestId:r.id});emit(r.receiver_device_id,'CONNECTION_EXPIRED',{requestId:r.id});}}catch(e){console.error('expiration sweep failed',e);}},3000);
  server.on('close',()=>clearInterval(expiry)); return server;
}
