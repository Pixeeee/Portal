import { useEffect, useState } from 'react';
import type { TrustedPlace } from '@portal/contracts';
import { Body, Button, EmptyState, Header, Panel, Screen, SectionLabel, SettingRow } from '@/components/ui';
import { usePortal } from '@/state/PortalProvider';

export default function Trusted() {
  const { api } = usePortal();
  const [rows, setRows] = useState<TrustedPlace[]>([]);
  const load = () => { if (!api) return; void api.trusted().then(setRows); };
  useEffect(() => { load(); }, [api]);
  return <Screen>
    <Header title="Trusted Places" subtitle="One-way auto-answer rules" />
    <Body muted>Trusted places can auto-accept after a short countdown. Camera activation is still visible before the session starts.</Body>
    {rows.length === 0 ? <EmptyState title="No trusted Portals" body="Trust a Portal from its profile when it should be allowed to open quickly." /> : rows.map(r => <Panel key={r.id}>
      <SectionLabel>{r.name}</SectionLabel>
      <SettingRow label="Portal code" value={r.publicCode} />
      <Button title={r.autoAccept ? 'Auto Accept: ON' : 'Auto Accept: OFF'} kind="secondary" onPress={() => void api?.updateTrusted(r.id, !r.autoAccept).then(load)} />
      <Button title="Remove Trust" kind="danger" onPress={() => void api?.deleteTrusted(r.id).then(load)} />
    </Panel>)}
  </Screen>;
}
