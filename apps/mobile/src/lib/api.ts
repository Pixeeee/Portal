import type { ConnectionRequestResponse, CreatePlaceRequest, PortalPlace, SessionCredentials, SessionResponse, TrustedPlace } from '@portal/contracts';
import { API_URL } from './config';
import type { Identity } from './identity';

export class PortalApiError extends Error { constructor(public status:number, public code:string, message:string){super(message);} }
export class PortalApi {
  constructor(private identity: Identity) {}
  setIdentity(identity: Identity) { this.identity = identity; }
  private auth() {
    if (!this.identity.deviceId) throw new Error('Device has not bootstrapped');
    return `PortalDevice ${this.identity.deviceId}:${this.identity.deviceSecret}`;
  }
  async request<T>(path:string, init:RequestInit={}, auth=true):Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    let response: Response;
    try {
      response=await fetch(`${API_URL}${path}`,{...init,signal:controller.signal,headers:{'content-type':'application/json',...(auth?{Authorization:this.auth()}:{}),...(init.headers||{})}});
    } catch (error: any) {
      if (error?.name === 'AbortError') throw new PortalApiError(408, 'REQUEST_TIMEOUT', 'Portal service did not respond. Check staging health and try again.');
      throw new PortalApiError(0, 'NETWORK_ERROR', error?.message || 'Unable to reach Portal service.');
    } finally {
      clearTimeout(timeout);
    }
    if(!response.ok){let e:any={};try{e=await response.json();}catch{}throw new PortalApiError(response.status,e.code||'HTTP_ERROR',e.message||`Request failed (${response.status})`);}
    if(response.status===204)return undefined as T; return response.json() as Promise<T>;
  }
  bootstrap(body:unknown){return this.request<{deviceId:string;placeId:string|null}>('/api/v1/devices/bootstrap',{method:'POST',body:JSON.stringify(body)},false);}
  me(){return this.request<PortalPlace>('/api/v1/places/me');}
  createPlace(body:CreatePlaceRequest){return this.request<PortalPlace>('/api/v1/places',{method:'POST',body:JSON.stringify(body)});}
  updatePlace(body:Partial<CreatePlaceRequest>){return this.request<PortalPlace>('/api/v1/places/me',{method:'PATCH',body:JSON.stringify(body)});}
  resolve(code:string){return this.request<PortalPlace>(`/api/v1/places/resolve/${encodeURIComponent(code)}`);}
  connect(receiverPlaceId:string){return this.request<ConnectionRequestResponse>('/api/v1/connections/requests',{method:'POST',headers:{'Idempotency-Key':cryptoId()},body:JSON.stringify({receiverPlaceId})});}
  connectionRequest(id:string){return this.request<any>(`/api/v1/connections/requests/${id}`);}
  requestAction(id:string,action:'accept'|'decline'|'cancel'){return this.request<any>(`/api/v1/connections/requests/${id}/${action}`,{method:'POST',body:'{}'});}
  session(id:string){return this.request<SessionResponse>(`/api/v1/sessions/${id}`);}
  credentials(id:string){return this.request<SessionCredentials>(`/api/v1/sessions/${id}/credentials`,{method:'POST',body:'{}'});}
  sessionStarted(id:string){return this.request<void>(`/api/v1/sessions/${id}/started`,{method:'POST',body:'{}'});}
  endSession(id:string,reason='USER_ENDED'){return this.request<SessionResponse>(`/api/v1/sessions/${id}/end`,{method:'POST',body:JSON.stringify({reason})});}
  history(){return this.request<SessionResponse[]>('/api/v1/sessions/recent');}
  trusted(){return this.request<TrustedPlace[]>('/api/v1/trusted');}
  addTrusted(trustedPlaceId:string,autoAccept:boolean){return this.request('/api/v1/trusted',{method:'POST',body:JSON.stringify({trustedPlaceId,autoAccept})});}
  updateTrusted(id:string,autoAccept:boolean){return this.request(`/api/v1/trusted/${id}`,{method:'PATCH',body:JSON.stringify({autoAccept})});}
  deleteTrusted(id:string){return this.request<void>(`/api/v1/trusted/${id}`,{method:'DELETE'});}
  pushToken(token:string){return this.request<void>('/api/v1/devices/push-token',{method:'POST',body:JSON.stringify({token})});}
  diagnostics(){return this.request<any>('/api/v1/diagnostics');}
  revokeSelf(){return this.request<void>('/api/v1/devices/revoke-self',{method:'POST',body:'{}'});}
}
function cryptoId(){return `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;}
