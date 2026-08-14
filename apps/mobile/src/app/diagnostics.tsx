import { useEffect, useState } from 'react';
import * as Application from 'expo-application';
import * as Device from 'expo-device';
import * as Network from 'expo-network';
import { Body, Header, Loading, Panel, Screen, SectionLabel, SettingRow, StatusPill } from '@/components/ui';
import { usePortal } from '@/state/PortalProvider';

export default function Diagnostics() {
  const { api, realtimeOnline } = usePortal();
  const [d, setD] = useState<any>(null);
  const [internet, setInternet] = useState(false);
  useEffect(() => { void Network.getNetworkStateAsync().then(n => setInternet(Boolean(n.isConnected))); if (api) void api.diagnostics().then(setD).catch(() => setD({ backend: false, database: false, redis: false, liveKit: false })); }, [api]);
  if (!d) return <Loading />;
  return <Screen>
    <Header title="Diagnostics" subtitle="Link and media health" />
    <SectionLabel>Services</SectionLabel>
    <Panel>
      <SettingRow label="Backend API" control={<StatusPill tone={d.backend ? 'online' : 'offline'} label={d.backend ? 'Connected' : 'Down'} />} />
      <SettingRow label="Realtime channel" control={<StatusPill tone={realtimeOnline ? 'online' : 'offline'} label={realtimeOnline ? 'Connected' : 'Down'} />} />
      <SettingRow label="Internet" control={<StatusPill tone={internet ? 'online' : 'offline'} label={internet ? 'Online' : 'Offline'} />} />
      <SettingRow label="LiveKit" control={<StatusPill tone={d.liveKit ? 'online' : 'offline'} label={d.liveKit ? 'Reachable' : 'Down'} />} />
      <SettingRow label="Latency" value={`${d.latencyMs ?? '-'} ms`} />
    </Panel>
    <SectionLabel>Device</SectionLabel>
    <Panel>
      <SettingRow label="App version" value={Application.nativeApplicationVersion || '1.0.0'} />
      <SettingRow label="Device" value={`${Device.manufacturer || ''} ${Device.modelName || ''}`.trim() || 'Android'} />
      <SettingRow label="OS" value={`${Device.osName || 'Android'} ${Device.osVersion || ''}`.trim()} />
    </Panel>
    <Body muted>Diagnostics are safe to show. They do not expose API secrets or LiveKit credentials.</Body>
  </Screen>;
}
