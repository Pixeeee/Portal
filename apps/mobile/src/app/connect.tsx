import { useState } from 'react';
import { router } from 'expo-router';
import { isPortalCode, normalizePortalCode } from '@portal/contracts';
import { Body, Button, CodeInput, Header, Panel, QuickAction, Screen, SectionLabel } from '@/components/ui';
import { usePortal } from '@/state/PortalProvider';
import { View } from 'react-native';

export default function Connect() {
  const { api } = usePortal();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function find() {
    const c = normalizePortalCode(code);
    if (!isPortalCode(c)) { setError('Enter a valid Portal code such as A7PK-92LX.'); return; }
    setBusy(true); setError('');
    try { await api!.resolve(c); router.push({ pathname: '/portal/[code]', params: { code: c } }); }
    catch (e: any) { setError(e.message); }
    finally { setBusy(false); }
  }
  return <Screen>
    <Header title="Connect" subtitle="Open a window into another place" />
    <SectionLabel>Enter portal code</SectionLabel>
    <Panel>
      <CodeInput value={code} onChangeText={setCode} placeholder="A7PK-92LX" maxLength={9} />
      <Body muted>Portal never dials automatically. You always review the place before opening a live session.</Body>
      {error ? <Body>{error}</Body> : null}
      <Button title={busy ? 'Finding...' : 'Look up place'} disabled={busy} onPress={() => void find()} />
    </Panel>
    <SectionLabel>Or pair by QR</SectionLabel>
    <View style={{ flexDirection: 'row', gap: 12 }}>
      <QuickAction glyph="SCAN" label="Scan code" hint="Point at another Portal screen" onPress={() => router.push('/scan')} />
      <QuickAction glyph="QR" label="Your QR" hint="Let others reach this place" onPress={() => router.push('/qr')} />
    </View>
  </Screen>;
}
