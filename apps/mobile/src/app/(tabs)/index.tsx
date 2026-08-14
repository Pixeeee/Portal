import { router } from 'expo-router';
import { View } from 'react-native';
import { Body, Button, Header, ListRow, Panel, PortalMark, QuickAction, Screen, SectionLabel, StatusPill, Title, colors } from '@/components/ui';
import { usePortal } from '@/state/PortalProvider';

export default function Home() {
  const { place, realtimeOnline } = usePortal();
  if (!place) return null;
  return <Screen>
    <Header title="Portal" subtitle={place.location || 'Place-to-place live link'} right={<StatusPill tone={realtimeOnline ? 'online' : 'offline'} label={realtimeOnline ? 'Online' : 'Offline'} />} />
    <Panel>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <Body muted>This place</Body>
          <Title compact>{place.name}</Title>
          <Body muted>{place.location || 'No location set'}</Body>
        </View>
        <PortalMark size={64} live={realtimeOnline} />
      </View>
      <Panel style={{ backgroundColor: colors.surface2, shadowOpacity: 0, elevation: 0 }}>
        <Body muted>Portal code</Body>
        <Title compact>{place.publicCode}</Title>
        <Button title="Show QR" kind="secondary" onPress={() => router.push('/qr')} />
      </Panel>
    </Panel>
    <SectionLabel>Quick actions</SectionLabel>
    <View style={{ flexDirection: 'row', gap: 12 }}>
      <QuickAction glyph="SCAN" label="Scan QR" hint="Pair with a place nearby" onPress={() => router.push('/scan')} />
      <QuickAction glyph="CODE" label="Enter code" hint="Open a known portal" onPress={() => router.push('/connect')} />
    </View>
    <View style={{ flexDirection: 'row', gap: 12 }}>
      <QuickAction glyph="TRUST" label="Trusted" hint="Auto-accept list" onPress={() => router.push('/trusted')} />
      <QuickAction glyph="LINK" label="Diagnostics" hint="Network and media health" onPress={() => router.push('/diagnostics')} />
    </View>
    <SectionLabel>Places</SectionLabel>
    <Panel style={{ paddingVertical: 0 }}>
      <ListRow title="Favorites" meta="Pinned places for quick access" onPress={() => router.push('/favorites')} />
      <ListRow title="Recents" meta="Recently resolved portal codes" onPress={() => router.push('/(tabs)/recents')} />
      <ListRow title="Session History" meta="Completed and missed portal sessions" onPress={() => router.push('/history')} />
    </Panel>
    <SectionLabel>Link status</SectionLabel>
    <Panel>
      <StatusPill tone={realtimeOnline ? 'live' : 'offline'} label={realtimeOnline ? 'Signalling connected' : 'Control channel offline'} />
      <Body muted>{realtimeOnline ? 'Ready to receive requests and negotiate media.' : 'Calls need the realtime channel to reconnect first.'}</Body>
    </Panel>
  </Screen>;
}
