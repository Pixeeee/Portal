import { randomBytes, randomUUID } from 'node:crypto';
import WebSocket from 'ws';

const API=(process.env.PORTAL_API_URL||'http://localhost:8080').replace(/\/$/,'');
const WS=API.replace(/^http/,'ws');
const secret=()=>randomBytes(32).toString('base64');
async function req(path,{method='GET',body,identity,headers={}}={}){
  const r=await fetch(API+path,{method,headers:{'content-type':'application/json',...(identity?{authorization:`PortalDevice ${identity.deviceId}:${identity.deviceSecret}`}:{}) ,...headers},body:body===undefined?undefined:JSON.stringify(body)});
  const text=await r.text();const data=text?JSON.parse(text):undefined;
  if(!r.ok)throw new Error(`${method} ${path}: ${r.status} ${text}`);return data;
}
async function device(name){
  const installationId=randomUUID(),deviceSecret=secret();
  const boot=await req('/api/v1/devices/bootstrap',{method:'POST',body:{installationId,deviceSecret,deviceName:`integration-${name}`,manufacturer:'CI',model:'Node',androidVersion:'test',appVersion:'1.0.0'}});
  const identity={deviceId:boot.deviceId,deviceSecret};
  const place=await req('/api/v1/places',{method:'POST',identity,body:{name}});
  return {identity,place};
}
function realtime(identity){
  const ws=new WebSocket(`${WS}/api/v1/realtime`,{headers:{authorization:`PortalDevice ${identity.deviceId}:${identity.deviceSecret}`}});
  const queue=[];const waiters=[];
  ws.on('message',raw=>{const e=JSON.parse(String(raw));const i=waiters.findIndex(w=>w.type===e.type);if(i>=0){const [w]=waiters.splice(i,1);w.resolve(e)}else queue.push(e)});
  const wait=type=>{const found=queue.findIndex(e=>e.type===type);if(found>=0)return Promise.resolve(queue.splice(found,1)[0]);return new Promise((resolve,reject)=>{const w={type,resolve};waiters.push(w);setTimeout(()=>{const i=waiters.indexOf(w);if(i>=0)waiters.splice(i,1);reject(new Error(`timeout waiting for ${type}`))},10000)})};
  return {ws,wait};
}

const a=await device(`Head Office ${Date.now()}`);const b=await device(`Davao Farm ${Date.now()}`);
const aw=realtime(a.identity),bw=realtime(b.identity);await Promise.all([aw.wait('HELLO'),bw.wait('HELLO')]);
const resolved=await req(`/api/v1/places/resolve/${b.place.publicCode}`,{identity:a.identity});if(resolved.id!==b.place.id)throw new Error('resolve mismatch');
const connection=await req('/api/v1/connections/requests',{method:'POST',identity:a.identity,headers:{'idempotency-key':randomUUID()},body:{receiverPlaceId:b.place.id}});
const incoming=await bw.wait('CONNECTION_REQUESTED');if(incoming.payload.requestId!==connection.id)throw new Error('request mismatch');
await req(`/api/v1/connections/requests/${connection.id}/accept`,{method:'POST',identity:b.identity,body:{}});
const [ar,br]=await Promise.all([aw.wait('SESSION_READY'),bw.wait('SESSION_READY')]);if(ar.payload.sessionId!==br.payload.sessionId)throw new Error('session mismatch');
const [ac,bc]=await Promise.all([req(`/api/v1/sessions/${ar.payload.sessionId}/credentials`,{method:'POST',identity:a.identity,body:{}}),req(`/api/v1/sessions/${br.payload.sessionId}/credentials`,{method:'POST',identity:b.identity,body:{}})]);if(ac.roomName!==bc.roomName)throw new Error('credential room mismatch');
await req(`/api/v1/sessions/${ar.payload.sessionId}/started`,{method:'POST',identity:a.identity,body:{}});await req(`/api/v1/sessions/${ar.payload.sessionId}/end`,{method:'POST',identity:a.identity,body:{reason:'INTEGRATION_TEST'}});await Promise.all([aw.wait('SESSION_ENDED'),bw.wait('SESSION_ENDED')]);
aw.ws.close();bw.ws.close();console.log('PASS: two-device control-plane integration scenario');
