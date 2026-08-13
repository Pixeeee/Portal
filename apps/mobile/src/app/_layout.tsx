import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { PortalProvider } from '@/state/PortalProvider';
import { colors } from '@/components/ui';

export default function RootLayout(){return <PortalProvider><StatusBar style="light"/><Stack screenOptions={{headerStyle:{backgroundColor:colors.bg},headerTintColor:colors.text,contentStyle:{backgroundColor:colors.bg},headerShadowVisible:false}}><Stack.Screen name="index" options={{headerShown:false}}/><Stack.Screen name="onboarding" options={{headerShown:false}}/><Stack.Screen name="(tabs)" options={{headerShown:false}}/><Stack.Screen name="live/[sessionId]" options={{headerShown:false,gestureEnabled:false}}/></Stack></PortalProvider>}
