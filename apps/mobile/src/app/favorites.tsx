import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Body, Button, EmptyState, Header, ListRow, Panel, Screen } from '@/components/ui';
import { listFavorites, removeFavorite } from '@/lib/localDb';

export default function Favorites() {
  const [rows, setRows] = useState<any[]>([]);
  const load = () => void listFavorites().then(setRows);
  useEffect(load, []);
  return <Screen>
    <Header title="Favorites" subtitle="Pinned places" />
    {rows.length === 0 ? <EmptyState title="No favorites yet" body="Favorite a Portal after resolving its code to keep it close." /> : <Panel style={{ paddingVertical: 0 }}>{rows.map(r => <ListRow key={r.place_id} title={r.name} meta={r.public_code} onPress={() => router.push({ pathname: '/portal/[code]', params: { code: r.public_code } })} trailing={<Button title="Remove" kind="ghost" onPress={() => void removeFavorite(r.place_id).then(load)} />} />)}</Panel>}
    <Body muted>Favorites are local to this Android device.</Body>
  </Screen>;
}
