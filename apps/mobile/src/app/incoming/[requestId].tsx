import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Body, Button, Panel, PortalMark, Screen, StatusPill, Title, colors } from '@/components/ui';
import { usePortal } from '@/state/PortalProvider';

export default function Incoming() {
  const { requestId } = useLocalSearchParams<{ requestId: string }>();
  const { incoming, api, setIncoming } = usePortal();
  const [fallback, setFallback] = useState<any>(null);
  const request = incoming ?? fallback;
  const [busy, setBusy] = useState(false);
  const [seconds, setSeconds] = useState<number>(request?.autoAcceptInSeconds ?? 0);
  useEffect(() => { if (!incoming && api && requestId) void api.connectionRequest(requestId).then(setFallback).catch(() => undefined); }, [incoming, api, requestId]);
  useEffect(() => { setSeconds(request?.autoAcceptInSeconds ?? 0); }, [request?.autoAcceptInSeconds]);
  useEffect(() => { if (seconds <= 0) return; const t = setInterval(() => setSeconds(s => Math.max(0, s - 1)), 1000); return () => clearInterval(t); }, [seconds]);
  async function action(kind: 'accept' | 'decline' | 'cancel') {
    if (!api) return;
    setBusy(true);
    try { await api.requestAction(requestId, kind); if (kind !== 'accept') { setIncoming(null); router.replace('/(tabs)'); } }
    catch { setBusy(false); }
  }
  return <Screen scroll={false} padded={false}>
    <View style={s.stage}>
      <View style={s.top}>
        <Text style={s.kicker}>Incoming portal request</Text>
        <PortalMark size={156} live />
        <Title compact>{request?.callerPlace.name || 'Another Portal'}</Title>
        <Body muted center>{request?.callerPlace.location || request?.callerPlace.publicCode || 'Place requesting a live window'}</Body>
        <View style={s.pills}><StatusPill tone="connecting" label={request?.autoAcceptInSeconds ? `Auto accept in ${seconds}s` : 'Ringing'} /></View>
      </View>
      <Panel style={s.bottom}>
        <Body muted center>{request?.autoAcceptInSeconds ? 'Trusted Portal. Cancel to prevent camera activation.' : 'Accept only when you are ready to open this place.'}</Body>
        <View style={s.actions}>
          <Button title={request?.autoAcceptInSeconds ? 'Cancel' : 'Decline'} kind="danger" disabled={busy} onPress={() => void action(request?.autoAcceptInSeconds ? 'cancel' : 'decline')} />
          <Button title={busy ? 'Working...' : 'Accept'} disabled={busy} onPress={() => void action('accept')} />
        </View>
      </Panel>
    </View>
  </Screen>;
}

const s = StyleSheet.create({
  stage: { flex: 1, backgroundColor: colors.bg, justifyContent: 'space-between', padding: 22, paddingTop: 58 },
  top: { alignItems: 'center', gap: 14 },
  kicker: { color: colors.muted, fontSize: 11, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' },
  pills: { marginTop: 4 },
  bottom: { gap: 14 },
  actions: { flexDirection: 'row', gap: 12 },
});
