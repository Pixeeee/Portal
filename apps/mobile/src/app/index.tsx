import { Redirect } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { usePortal } from '@/state/PortalProvider';
import { colors, Loading, Button } from '@/components/ui';
export default function Index(){const {state,error,bootstrap}=usePortal();if(state==='NEEDS_PLACE')return <Redirect href="/onboarding"/>;if(['READY','CONNECTING_CONTROL_CHANNEL','OFFLINE'].includes(state))return <Redirect href="/(tabs)"/>;if(state==='ERROR')return <View style={s.wrap}><Text style={s.title}>Portal could not start.</Text><Text style={s.error}>{error}</Text><Button title="Retry" onPress={()=>void bootstrap()}/></View>;return <Loading label="Starting Portal…"/>}const s=StyleSheet.create({wrap:{flex:1,backgroundColor:colors.bg,padding:28,justifyContent:'center',gap:18},title:{color:colors.text,fontSize:30,fontWeight:'800'},error:{color:colors.muted,fontSize:16}});
