import { Alert, Switch, View } from 'react-native';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Screen,Title,Label,Body,Button,Card,Status,colors } from '@/components/ui';
import { usePortal } from '@/state/PortalProvider';
import { getMediaPreferences, setMediaPreference, type PortalMediaPreferences } from '@/lib/localDb';

const rows: Array<[keyof PortalMediaPreferences,string,string]> = [
  ['cameraEnabled','Camera','Publish camera when a Portal session starts'],
  ['microphoneEnabled','Microphone','Publish microphone when a Portal session starts'],
  ['speakerEnabled','Speaker','Prefer speaker output for live Portal audio'],
  ['showLocalPreview','Local Preview','Show the small YOU preview during a call'],
];

export default function Settings(){
  const {place,realtimeOnline,resetPortal}=usePortal();
  const [prefs,setPrefs]=useState<PortalMediaPreferences|null>(null);
  useEffect(()=>{void getMediaPreferences().then(setPrefs)},[]);
  async function toggle(key:keyof PortalMediaPreferences,value:boolean){if(!prefs)return;setPrefs({...prefs,[key]:value});await setMediaPreference(key,value)}
  return <Screen>
    <Label>Settings</Label><Title>{place?.name||'Portal'}</Title>
    <Card><Status online={realtimeOnline} label={realtimeOnline?'REALTIME CONNECTED':'REALTIME DISCONNECTED'}/><Body muted>{place?.publicCode}</Body></Card>
    <Button title="Edit Portal" kind="secondary" onPress={()=>router.push('/edit-portal')}/>
    <Button title="Show QR Code" kind="secondary" onPress={()=>router.push('/qr')}/>
    {prefs?<Card><Label>Media defaults</Label>{rows.map(([key,title,desc])=><View key={key} style={{flexDirection:'row',alignItems:'center',gap:12,paddingVertical:7}}><View style={{flex:1,gap:2}}><Body>{title}</Body><Body muted>{desc}</Body></View><Switch value={prefs[key]} onValueChange={v=>void toggle(key,v)} trackColor={{false:colors.line,true:colors.accent}}/></View>)}</Card>:null}
    <Button title="Trusted Places" kind="secondary" onPress={()=>router.push('/trusted')}/>
    <Button title="Network Diagnostics" kind="secondary" onPress={()=>router.push('/diagnostics')}/>
    <Button title="About" kind="secondary" onPress={()=>Alert.alert('Portal','Internal place-to-place live video portal\nExpo Router / TypeScript\nVersion 1.0.0')}/>
    <Button title="Reset Portal" kind="danger" onPress={()=>Alert.alert('Reset this Portal?','This revokes this installation and removes its local credentials. A new Portal registration will be required.',[{text:'Cancel',style:'cancel'},{text:'Reset',style:'destructive',onPress:()=>void resetPortal()}])}/>
  </Screen>
}
