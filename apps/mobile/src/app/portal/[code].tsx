import { useEffect, useState } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import type { PortalPlace } from '@portal/contracts';
import { Body, Button, Header, Loading, Panel, PortalMark, Screen, SectionLabel, SettingRow, StatusPill, Title } from '@/components/ui';
import { usePortal } from '@/state/PortalProvider';
import { addFavorite, addRecent } from '@/lib/localDb';

export default function PortalProfile() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const { api, place } = usePortal();
  const [remote, setRemote] = useState<PortalPlace | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (code && api) void api.resolve(code).then(setRemote).catch(e => setError(e.message)); }, [code, api]);
  if (!remote && !error) return <Loading label="Resolving Portal..." />;
  if (error && !remote) return <Screen><Header title="Portal unavailable" /><Body>{error}</Body></Screen>;
  async function connect() {
    if (!remote || !api) return;
    setBusy(true); setError('');
    try { const r = await api.connect(remote.id); await addRecent(remote); router.push({ pathname: '/outgoing/[requestId]', params: { requestId: r.id, name: remote.name } }); }
    catch (e: any) { setError(e.message); setBusy(false); }
  }
  const samePlace = place?.id === remote!.id;
  return <Screen>
    <Header title={remote!.name} subtitle={remote!.location || 'Portal place'} right={<StatusPill tone={remote!.online ? 'online' : 'offline'} label={remote!.online ? 'Online' : 'Offline'} />} />
    <Panel style={{ alignItems: 'center' }}>
      <PortalMark size={112} live={remote!.online} />
      <Title compact>{remote!.name}</Title>
      <Body muted center>{remote!.location || 'No location listed'}</Body>
    </Panel>
    <SectionLabel>Identity</SectionLabel>
    <Panel>
      <SettingRow label="Portal code" value={remote!.publicCode} />
      <SettingRow label="Availability" value={remote!.online ? 'Online' : 'Offline'} />
    </Panel>
    {samePlace ? <Body center>This is your Portal.</Body> : <Panel>
      <Button title={busy ? 'Requesting...' : remote!.online ? 'Open portal' : 'Unavailable'} disabled={busy || !remote!.online} onPress={() => void connect()} />
      <Button title="Add to Favorites" kind="secondary" onPress={() => void addFavorite(remote!)} />
      <Button title="Trust this Portal" kind="secondary" onPress={() => void api?.addTrusted(remote!.id, false)} />
    </Panel>}
    {!remote!.online ? <Body muted>This Portal is currently unavailable. Calls will not ring until it reconnects.</Body> : null}
    {error ? <Body>{error}</Body> : null}
  </Screen>;
}
