import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';
import * as Application from 'expo-application';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import type { ConnectionRequestedPayload, PortalPlace, PortalState, RealtimeEnvelope } from '@portal/contracts';
import { PortalApi, PortalApiError } from '@/lib/api';
import { loadOrCreateIdentity, saveDeviceId, resetIdentity, type Identity } from '@/lib/identity';
import { RealtimeClient } from '@/lib/realtime';
import { clearLocalDb } from '@/lib/localDb';

Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner:true, shouldShowList:true, shouldPlaySound:true, shouldSetBadge:false }) });

type Ctx = {
  state: PortalState; error: string | null; identity: Identity | null; place: PortalPlace | null;
  realtimeOnline: boolean; incoming: ConnectionRequestedPayload | null; api: PortalApi | null;
  bootstrap(): Promise<void>; createPlace(input:{name:string;location?:string;description?:string}):Promise<PortalPlace>;
  refreshPlace():Promise<void>; setIncoming(v:ConnectionRequestedPayload|null):void; resetPortal():Promise<void>;
};
const PortalContext=createContext<Ctx|null>(null);
export function usePortal(){const c=useContext(PortalContext);if(!c)throw new Error('usePortal must be inside PortalProvider');return c;}

export function PortalProvider({children}:{children:React.ReactNode}){
  const router=useRouter(); const [state,setState]=useState<PortalState>('UNINITIALIZED'); const [error,setError]=useState<string|null>(null);
  const [identity,setIdentity]=useState<Identity|null>(null); const [place,setPlace]=useState<PortalPlace|null>(null); const [realtimeOnline,setRealtimeOnline]=useState(false);
  const [incoming,setIncoming]=useState<ConnectionRequestedPayload|null>(null); const realtime=useRef<RealtimeClient|null>(null); const api=useMemo(()=>identity?new PortalApi(identity):null,[identity]);

  const handleRealtime=useCallback((event:RealtimeEnvelope)=>{
    if(event.type==='CONNECTION_REQUESTED'){
      const payload=event.payload as ConnectionRequestedPayload; setIncoming(payload); setState('INCOMING_REQUEST'); router.push({pathname:'/incoming/[requestId]',params:{requestId:payload.requestId}});
    } else if(event.type==='SESSION_READY'){
      const payload=event.payload as any; setState('PREPARING_SESSION'); router.replace({pathname:'/live/[sessionId]',params:{sessionId:payload.sessionId}});
    } else if(['CONNECTION_DECLINED','CONNECTION_CANCELLED','CONNECTION_EXPIRED','CONNECTION_BUSY'].includes(event.type)){
      setState('READY'); router.replace('/(tabs)');
    } else if(event.type==='SESSION_ENDED'){
      setState('READY'); router.replace('/(tabs)');
    } else if(event.type==='PEER_DISCONNECTED'){setState('RECONNECTING');}
  },[router]);

  const connectRealtime=useCallback((id:Identity)=>{realtime.current?.stop();const c=new RealtimeClient(id,handleRealtime,(online)=>{setRealtimeOnline(online);setState(s=>online?(s==='CONNECTING_CONTROL_CHANNEL'||s==='OFFLINE'?'READY':s):(s==='LIVE'||s==='CONNECTING_MEDIA'?s:'OFFLINE'));});realtime.current=c;c.start();},[handleRealtime]);

  const registerNotifications=useCallback(async(currentApi:PortalApi)=>{
    try{
      if(Platform.OS==='android') await Notifications.setNotificationChannelAsync('portal-calls',{name:'Portal calls',importance:Notifications.AndroidImportance.MAX,sound:'default'});
      const perms=await Notifications.getPermissionsAsync(); let granted=perms.granted;
      if(!granted) granted=(await Notifications.requestPermissionsAsync()).granted;
      const projectId=Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;
      if(granted&&projectId){const token=(await Notifications.getExpoPushTokenAsync({projectId})).data;await currentApi.pushToken(token);}
    }catch{/* push is fallback; realtime stays primary */}
  },[]);

  const bootstrap=useCallback(async()=>{
    setError(null);setState('BOOTSTRAPPING');
    try{
      let id=await loadOrCreateIdentity(); const tempApi=new PortalApi(id);
      const result=await tempApi.bootstrap({installationId:id.installationId,deviceSecret:id.deviceSecret,deviceName:Device.deviceName??undefined,manufacturer:Device.manufacturer??undefined,model:Device.modelName??undefined,androidVersion:Device.osVersion??undefined,appVersion:Application.nativeApplicationVersion??'1.0.0'});
      if(id.deviceId!==result.deviceId){await saveDeviceId(result.deviceId);id={...id,deviceId:result.deviceId};}
      setIdentity(id);const currentApi=new PortalApi(id);
      try{const p=await currentApi.me();setPlace(p);setState('CONNECTING_CONTROL_CHANNEL');connectRealtime(id);void registerNotifications(currentApi);}
      catch(e){if(e instanceof PortalApiError&&e.status===404){setPlace(null);setState('NEEDS_PLACE');}else throw e;}
    }catch(e:any){setError(e?.message||'Unable to start Portal.');setState('ERROR');}
  },[connectRealtime,registerNotifications]);

  useEffect(()=>{void bootstrap();return()=>realtime.current?.stop();},[bootstrap]);
  useEffect(()=>{const sub=Notifications.addNotificationResponseReceivedListener((r)=>{const url=r.notification.request.content.data?.url;if(typeof url==='string')router.push(url as any);});return()=>sub.remove();},[router]);

  const createPlace=useCallback(async(input:{name:string;location?:string;description?:string})=>{if(!api||!identity)throw new Error('Portal not bootstrapped');const p=await api.createPlace(input);setPlace(p);setState('CONNECTING_CONTROL_CHANNEL');connectRealtime(identity);return p;},[api,identity,connectRealtime]);
  const refreshPlace=useCallback(async()=>{if(api){const p=await api.me();setPlace(p);}},[api]);
  const resetPortal=useCallback(async()=>{try{await api?.revokeSelf();}catch{} realtime.current?.stop();await clearLocalDb();await resetIdentity();setIdentity(null);setPlace(null);setIncoming(null);setState('UNINITIALIZED');await bootstrap();},[api,bootstrap]);
  const value=useMemo<Ctx>(()=>({state,error,identity,place,realtimeOnline,incoming,api,bootstrap,createPlace,refreshPlace,setIncoming,resetPortal}),[state,error,identity,place,realtimeOnline,incoming,api,bootstrap,createPlace,refreshPlace,resetPortal]);
  return <PortalContext.Provider value={value}>{children}</PortalContext.Provider>;
}
