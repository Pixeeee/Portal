import { StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { portalQrPayload } from '@portal/contracts';
import { usePortal } from '@/state/PortalProvider';
import { Body, Header, Panel, Screen, Title, colors } from '@/components/ui';

export default function QR() {
  const { place } = usePortal();
  if (!place) return null;
  return <Screen>
    <Header title="Your QR" subtitle={place.name} />
    <Panel style={{ alignItems: 'center', gap: 18 }}>
      <View style={s.qr}><QRCode value={portalQrPayload(place.publicCode)} size={250} /></View>
      <Title compact>{place.publicCode}</Title>
      <Body muted center>Scanning resolves this Portal first. It does not automatically open the camera or start a call.</Body>
    </Panel>
  </Screen>;
}

const s = StyleSheet.create({
  qr: { backgroundColor: '#fff', padding: 18, borderRadius: 8, alignSelf: 'center' },
  code: { color: colors.text, textAlign: 'center', fontSize: 28, fontWeight: '900', letterSpacing: 2 },
});
