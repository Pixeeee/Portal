import { Tabs } from 'expo-router';
import { colors } from '@/components/ui';
export default function TabsLayout(){return <Tabs screenOptions={{headerStyle:{backgroundColor:colors.bg},headerTintColor:colors.text,headerShadowVisible:false,tabBarStyle:{backgroundColor:colors.panel,borderTopColor:colors.line},tabBarActiveTintColor:colors.accent,tabBarInactiveTintColor:colors.muted}}><Tabs.Screen name="index" options={{title:'Home'}}/><Tabs.Screen name="recents" options={{title:'Recents'}}/><Tabs.Screen name="settings" options={{title:'Settings'}}/></Tabs>}
