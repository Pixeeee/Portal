import { useState } from 'react';
import { router } from 'expo-router';
import { Body, Button, Input, Label, Panel, PortalMark, Screen, SectionLabel, Title } from '@/components/ui';
import { usePortal } from '@/state/PortalProvider';

export default function Onboarding() {
  const { createPlace } = usePortal();
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit() {
    if (!name.trim()) return;
    setBusy(true); setError('');
    try { await createPlace({ name: name.trim(), location: location.trim() || undefined, description: description.trim() || undefined }); router.replace('/(tabs)'); }
    catch (e: any) { setError(e.message); }
    finally { setBusy(false); }
  }
  return <Screen>
    <PortalMark size={104} />
    <Label>Portal setup</Label>
    <Title>Create a place</Title>
    <Body muted>A Portal place represents a physical location: a lobby, dock, office, store, or control room. It is not a personal account.</Body>
    <SectionLabel>Place identity</SectionLabel>
    <Panel>
      <Label>Place name *</Label>
      <Input value={name} onChangeText={setName} placeholder="Warehouse 4 - Dock B" maxLength={120} />
      <Label>Location</Label>
      <Input value={location} onChangeText={setLocation} placeholder="Cebu, PH" maxLength={160} />
      <Label>Description</Label>
      <Input value={description} onChangeText={setDescription} placeholder="Farm Operations" maxLength={1000} multiline />
    </Panel>
    {error ? <Body>{error}</Body> : null}
    <Button title={busy ? 'Creating...' : 'Create Portal'} disabled={busy || !name.trim()} onPress={() => void submit()} />
    <Body muted center>Camera and microphone permissions are requested on your first call.</Body>
  </Screen>;
}
