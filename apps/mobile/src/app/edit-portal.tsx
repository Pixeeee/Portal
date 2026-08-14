import { useState } from 'react';
import { router } from 'expo-router';
import { Body, Button, Header, Input, Label, Panel, Screen } from '@/components/ui';
import { usePortal } from '@/state/PortalProvider';

export default function EditPortal() {
  const { place, api, refreshPlace } = usePortal();
  const [name, setName] = useState(place?.name || '');
  const [location, setLocation] = useState(place?.location || '');
  const [description, setDescription] = useState(place?.description || '');
  const [busy, setBusy] = useState(false);
  async function save() { if (!api || !name.trim()) return; setBusy(true); await api.updatePlace({ name: name.trim(), location: location.trim(), description: description.trim() }); await refreshPlace(); router.back(); }
  return <Screen>
    <Header title="Edit Portal" subtitle="Place identity" />
    <Panel>
      <Label>Place name</Label><Input value={name} onChangeText={setName} />
      <Label>Location</Label><Input value={location} onChangeText={setLocation} />
      <Label>Description</Label><Input multiline value={description} onChangeText={setDescription} />
    </Panel>
    <Body muted>The public code stays the same when you rename a Portal.</Body>
    <Button title={busy ? 'Saving...' : 'Save'} disabled={busy || !name.trim()} onPress={() => void save()} />
  </Screen>;
}
