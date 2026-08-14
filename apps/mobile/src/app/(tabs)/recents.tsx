import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Body, EmptyState, Header, ListRow, Panel, Screen } from '@/components/ui';
import { listRecents } from '@/lib/localDb';

export default function Recents() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => { void listRecents().then(setRows); }, []);
  return <Screen>
    <Header title="Recents" subtitle="Recently resolved Portal places" />
    {rows.length === 0 ? <EmptyState title="No recent Portals" body="Places appear here after you resolve a QR code or public Portal code." /> : <Panel style={{ paddingVertical: 0 }}>{rows.map(r => <ListRow key={r.place_id} title={r.name} meta={`${r.public_code} · ${new Date(r.last_connected_at).toLocaleString()}`} status="online" onPress={() => router.push({ pathname: '/portal/[code]', params: { code: r.public_code } })} />)}</Panel>}
    <Body muted>Recents are stored only on this device.</Body>
  </Screen>;
}
