import { useEffect,useMemo,useRef,useState } from 'react';
import { Pressable,StyleSheet,Text,View } from 'react-native';
import { useLocalSearchParams,router } from 'expo-router';
import { Camera } from 'expo-camera';
import { useKeepAwake } from 'expo-keep-awake';
import { AudioSession,LiveKitRoom,VideoTrack,isTrackReference,useRoomContext,useTracks } from '@livekit/react-native';
import { ConnectionState,Track } from 'livekit-client';
import type { SessionCredentials } from '@portal/contracts';
import { usePortal } from '@/state/PortalProvider';
import { colors,Button,Body,Loading } from '@/components/ui';
import { getMediaPreferences, type PortalMediaPreferences } from '@/lib/localDb';

export default function LiveRoute(){
  useKeepAwake();
  const {sessionId}=useLocalSearchParams<{sessionId:string}>();
  const {api}=usePortal();
  const [credentials,setCredentials]=useState<SessionCredentials|null>(null);
  const [prefs,setPrefs]=useState<PortalMediaPreferences|null>(null);
  const [permission,setPermission]=useState<'checking'|'granted'|'denied'>('checking');
  const [error,setError]=useState('');

  useEffect(()=>{void getMediaPreferences().then(setPrefs)},[]);
  useEffect(()=>{void (async()=>{
    const [cam,mic]=await Promise.all([Camera.requestCameraPermissionsAsync(),Camera.requestMicrophonePermissionsAsync()]);
    setPermission(cam.granted&&mic.granted?'granted':'denied');
  })()},[]);
  useEffect(()=>{if(permission==='granted'&&api&&sessionId)void api.credentials(sessionId).then(setCredentials).catch(e=>setError(e.message))},[permission,api,sessionId]);
  useEffect(()=>{if(permission!=='granted'||!prefs)return;void AudioSession.startAudioSession().then(async()=>{try{await (AudioSession as any).selectAudioOutput(prefs.speakerEnabled?'force_speaker':'force_earpiece')}catch{}});return()=>{void AudioSession.stopAudioSession()}},[permission,prefs]);

  if(permission==='checking'||!prefs)return <Loading label="Checking camera and microphone…"/>;
  if(permission==='denied')return <View style={s.center}><Text style={s.title}>Camera and microphone are required.</Text><Body muted>Portal never activates the camera silently. Grant both permissions in system settings, then reopen the session.</Body><Button title="Go Home" onPress={()=>router.replace('/(tabs)')}/></View>;
  if(error)return <View style={s.center}><Text style={s.title}>Unable to start Portal</Text><Body>{error}</Body><Button title="Go Home" onPress={()=>router.replace('/(tabs)')}/></View>;
  if(!credentials)return <Loading label="Preparing secure media session…"/>;

  return <LiveKitRoom
    serverUrl={credentials.serverUrl}
    token={credentials.participantToken}
    connect
    audio={prefs.microphoneEnabled}
    video={prefs.cameraEnabled}
    options={{adaptiveStream:{pixelDensity:'screen'},dynacast:true}}
    onConnected={()=>void api?.sessionStarted(sessionId)}
    onError={(e)=>setError(e.message)}>
      <RoomContent sessionId={sessionId} initialPrefs={prefs}/>
    </LiveKitRoom>;
}

function RoomContent({sessionId,initialPrefs}:{sessionId:string;initialPrefs:PortalMediaPreferences}){
  const {api}=usePortal();
  const room=useRoomContext();
  const tracks=useTracks([Track.Source.Camera]);
  const [controls,setControls]=useState(true);
  const [mic,setMic]=useState(initialPrefs.microphoneEnabled);
  const [camera,setCamera]=useState(initialPrefs.cameraEnabled);
  const [front,setFront]=useState(true);
  const [speaker,setSpeaker]=useState(initialPrefs.speakerEnabled);
  const [ending,setEnding]=useState(false);
  const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const remote=useMemo(()=>tracks.find(t=>isTrackReference(t)&&!t.participant.isLocal),[tracks]);
  const local=useMemo(()=>tracks.find(t=>isTrackReference(t)&&t.participant.isLocal),[tracks]);

  const show=()=>{setControls(true);if(timer.current)clearTimeout(timer.current);timer.current=setTimeout(()=>setControls(false),3000)};
  useEffect(()=>{show();return()=>{if(timer.current)clearTimeout(timer.current)}},[]);
  async function toggleMic(){const next=!mic;await room.localParticipant.setMicrophoneEnabled(next);setMic(next);show()}
  async function toggleCamera(){const next=!camera;await room.localParticipant.setCameraEnabled(next);setCamera(next);show()}
  async function switchCamera(){const publication=room.localParticipant.getTrackPublication(Track.Source.Camera);const track=publication?.track as any;if(track?.restartTrack){const next=!front;await track.restartTrack({facingMode:next?'user':'environment'});setFront(next)}show()}
  async function toggleSpeaker(){const next=!speaker;try{await (AudioSession as any).selectAudioOutput(next?'force_speaker':'force_earpiece')}catch{}setSpeaker(next);show()}
  async function end(){if(ending)return;setEnding(true);try{await api?.endSession(sessionId)}finally{room.disconnect();router.replace('/(tabs)')}}
  const connecting=room.state!==ConnectionState.Connected;
  const remoteQuality=remote&&isTrackReference(remote)?String((remote.participant as any).connectionQuality??'unknown').replace('excellent','Excellent').replace('good','Good').replace('poor','Poor').replace('lost','Poor'):'—';

  return <Pressable style={s.live} onPress={show}>
    {remote&&isTrackReference(remote)?<VideoTrack trackRef={remote} style={StyleSheet.absoluteFill} objectFit="cover"/>:<View style={[StyleSheet.absoluteFill,s.wait]}><Text style={s.waitText}>{connecting?'Connecting media…':'Waiting for remote video…'}</Text></View>}
    <View style={s.liveBadge}><View style={s.redDot}/><Text style={s.liveText}>{room.state===ConnectionState.Reconnecting?'RECONNECTING':'LIVE'}</Text><Text style={s.quality}>{remoteQuality}</Text></View>
    {initialPrefs.showLocalPreview&&local&&isTrackReference(local)&&camera?<View style={s.preview}><VideoTrack trackRef={local} style={StyleSheet.absoluteFill} mirror={front} objectFit="cover"/><Text style={s.you}>YOU</Text></View>:null}
    {controls?<View style={s.controls}><Control label={mic?'Mute':'Unmute'} onPress={()=>void toggleMic()}/><Control label={camera?'Camera Off':'Camera On'} onPress={()=>void toggleCamera()}/><Control label="Switch" onPress={()=>void switchCamera()}/><Control label={speaker?'Speaker':'Earpiece'} onPress={()=>void toggleSpeaker()}/><Control label={ending?'Ending…':'End'} danger onPress={()=>void end()}/></View>:null}
  </Pressable>;
}
function Control({label,onPress,danger=false}:{label:string;onPress:()=>void;danger?:boolean}){return <Pressable onPress={onPress} style={[s.control,danger&&s.controlDanger]}><Text style={s.controlText}>{label}</Text></Pressable>}
const s=StyleSheet.create({live:{flex:1,backgroundColor:'#000'},center:{flex:1,backgroundColor:colors.bg,justifyContent:'center',padding:24,gap:18},title:{color:colors.text,fontSize:30,fontWeight:'800'},wait:{alignItems:'center',justifyContent:'center',backgroundColor:'#090A0C'},waitText:{color:'#fff',fontSize:18},liveBadge:{position:'absolute',top:42,left:22,flexDirection:'row',alignItems:'center',gap:8,backgroundColor:'#0009',paddingHorizontal:12,paddingVertical:8,borderRadius:20},redDot:{width:9,height:9,borderRadius:10,backgroundColor:'#FF4D4D'},liveText:{color:'#fff',fontWeight:'900',fontSize:12,letterSpacing:1},quality:{color:'#D5D9DE',fontSize:11},preview:{position:'absolute',right:18,top:42,width:120,height:170,borderRadius:16,overflow:'hidden',backgroundColor:'#222',borderWidth:1,borderColor:'#FFFFFF33'},you:{position:'absolute',bottom:8,left:8,color:'#fff',fontWeight:'800',fontSize:10,backgroundColor:'#0008',paddingHorizontal:6,paddingVertical:3,borderRadius:8},controls:{position:'absolute',left:16,right:16,bottom:28,flexDirection:'row',gap:8,justifyContent:'center',flexWrap:'wrap'},control:{backgroundColor:'#111D',borderWidth:1,borderColor:'#FFFFFF33',paddingHorizontal:14,paddingVertical:13,borderRadius:16,minWidth:72,alignItems:'center'},controlDanger:{backgroundColor:'#7A1F1FCC'},controlText:{color:'#fff',fontWeight:'800',fontSize:12}});
