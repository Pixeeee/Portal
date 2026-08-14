import { Redirect } from 'expo-router';
import { Image, StyleSheet, Text, View } from 'react-native';
import { usePortal } from '@/state/PortalProvider';
import { Button, Loading, PortalMark, colors } from '@/components/ui';

export default function Index() {
  const { state, error, bootstrap } = usePortal();
  if (state === 'NEEDS_PLACE') return <Redirect href="/onboarding" />;
  if (['READY', 'CONNECTING_CONTROL_CHANNEL', 'OFFLINE'].includes(state)) return <Redirect href="/(tabs)" />;
  if (state === 'ERROR') return <View style={s.wrap}><PortalMark size={112} /><Text style={s.title}>Portal could not start.</Text><Text style={s.error}>{error}</Text><Button title="Retry" onPress={() => void bootstrap()} /></View>;
  return <View style={s.wrap}><Image source={require('../../assets/portal-transparent.gif')} style={s.gif} resizeMode="contain" /><Text style={s.brand}>Portal</Text><Text style={s.kicker}>Establishing place link</Text><Loading label="Starting Portal..." /></View>;
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg, padding: 28, justifyContent: 'center', alignItems: 'center', gap: 18 },
  gif: { width: 220, height: 220 },
  brand: { color: colors.text, fontSize: 28, fontWeight: '900' },
  kicker: { color: colors.muted, fontSize: 11, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' },
  title: { color: colors.text, fontSize: 28, fontWeight: '900', textAlign: 'center' },
  error: { color: colors.muted, fontSize: 15, textAlign: 'center', lineHeight: 21 },
});
