import type { RealtimeEnvelope } from '@portal/contracts';
import { WS_URL } from './config';
import type { Identity } from './identity';
import { reconnectDelayMs } from './reconnectPolicy';

export class RealtimeClient {
  private ws?: WebSocket; private stopped=false; private attempt=0; private timer?: ReturnType<typeof setTimeout>;
  constructor(private identity:Identity,private onEvent:(e:RealtimeEnvelope)=>void,private onStatus:(online:boolean)=>void){}
  start(){this.stopped=false;this.open();}
  stop(){this.stopped=true;if(this.timer)clearTimeout(this.timer);this.ws?.close();}
  private open(){
    if(this.stopped||!this.identity.deviceId)return;
    try{
      const Ctor=WebSocket as any;
      const ws=new Ctor(`${WS_URL}/api/v1/realtime`,[],{headers:{Authorization:`PortalDevice ${this.identity.deviceId}:${this.identity.deviceSecret}`}}) as WebSocket;this.ws=ws;
      ws.onopen=()=>{this.attempt=0;this.onStatus(true);ws.send(JSON.stringify({type:'PING'}));};
      ws.onmessage=(m)=>{try{this.onEvent(JSON.parse(String(m.data)));}catch{}};
      ws.onerror=()=>undefined;
      ws.onclose=()=>{this.onStatus(false);if(!this.stopped)this.schedule();};
    }catch{this.schedule();}
  }
  private schedule(){this.timer=setTimeout(()=>this.open(),reconnectDelayMs(this.attempt++));}
}
