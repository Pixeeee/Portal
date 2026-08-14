import { useEffect, useState } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Body, Button, Panel, PortalMark, Screen, StatusPill, Title, colors } from '@/components/ui';
import { usePortal } from '@/state/PortalProvider';

export default function Outgoing() {
  const { requestId, name } = useLocalSearchParams<{ requestId: string; name?: string }>();
  const { api, state } = usePortal();
  const [stage, setStage] = useState(0);
  useEffect(() => { const t = setTimeout(() => setStage(1), 2200); return () => clearTimeout(t); }, []);
  async function cancel() { try { await api?.requestAction(requestId, 'cancel'); } finally { router.replace('/(tabs)'); } }
  const label = state === 'RECONNECTING' ? 'Reconnecting control' : stage === 0 ? 'Negotiating link' : 'Ringing destination';
  const detail = state === 'RECONNECTING' ? 'Control channel is reconnecting...' : stage === 0 ? 'Preparing room and media credentials.' : 'Waiting for the place to accept.';
  return <Screen scroll={false} padded={false}>
    <View style={s.stage}>
      <View style={s.top}>
        <Text style={s.kicker}>Outgoing</Text>
        <PortalMark size={148} />
        <Title compact>{name || 'Portal'}</Title>
        <StatusPill tone="connecting" label={label} />
        <Body muted center>{detail}</Body>
      </View>
      <Panel style={s.bottom}>
        <Body muted center>Requests expire automatically after 30 seconds.</Body>
        <Button title="Cancel request" kind="danger" onPress={() => void cancel()} />
      </Panel>
    </View>
  </Screen>;
}

const s = StyleSheet.create({
  stage: { flex: 1, backgroundColor: colors.bg, justifyContent: 'space-between', padding: 22, paddingTop: 58 },
  top: { alignItems: 'center', gap: 14 },
  kicker: { color: colors.muted, fontSize: 11, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' },
  bottom: { gap: 14 },
});
