import { Alert, Switch } from 'react-native';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Body, Button, Header, Panel, Screen, SectionLabel, SettingRow, StatusPill, colors } from '@/components/ui';
import { usePortal } from '@/state/PortalProvider';
import { getMediaPreferences, setMediaPreference, type PortalMediaPreferences } from '@/lib/localDb';

const rows: Array<[keyof PortalMediaPreferences, string, string]> = [
  ['cameraEnabled', 'Camera', 'Publish camera when a Portal session starts'],
  ['microphoneEnabled', 'Microphone', 'Publish microphone when a Portal session starts'],
  ['speakerEnabled', 'Speaker', 'Prefer speaker output for live Portal audio'],
  ['showLocalPreview', 'Self view', 'Show your own preview during a call'],
];

export default function Settings() {
  const { place, realtimeOnline, resetPortal } = usePortal();
  const [prefs, setPrefs] = useState<PortalMediaPreferences | null>(null);
  useEffect(() => { void getMediaPreferences().then(setPrefs); }, []);
  async function toggle(key: keyof PortalMediaPreferences, value: boolean) { if (!prefs) return; setPrefs({ ...prefs, [key]: value }); await setMediaPreference(key, value); }
  return <Screen>
    <Header title={place?.name || 'Portal'} subtitle="Settings" right={<StatusPill tone={realtimeOnline ? 'online' : 'offline'} label={realtimeOnline ? 'Realtime' : 'Offline'} />} />
    <Panel><Body muted>Portal code</Body><Body>{place?.publicCode || 'Unregistered'}</Body></Panel>
    <Button title="Edit Portal" kind="secondary" onPress={() => router.push('/edit-portal')} />
    <Button title="Show QR Code" kind="secondary" onPress={() => router.push('/qr')} />
    {prefs ? <><SectionLabel>Media defaults</SectionLabel><Panel>{rows.map(([key, title, desc]) => <SettingRow key={key} label={title} hint={desc} control={<Switch value={prefs[key]} onValueChange={v => void toggle(key, v)} trackColor={{ false: colors.line, true: colors.accent }} thumbColor={prefs[key] ? colors.accentText : colors.muted} />} />)}</Panel></> : null}
    <SectionLabel>Operations</SectionLabel>
    <Button title="Trusted Places" kind="secondary" onPress={() => router.push('/trusted')} />
    <Button title="Network Diagnostics" kind="secondary" onPress={() => router.push('/diagnostics')} />
    <Button title="About" kind="secondary" onPress={() => Alert.alert('Portal', 'Internal place-to-place live video portal\nExpo Router / TypeScript\nVersion 1.0.0')} />
    <Button title="Reset Portal" kind="danger" onPress={() => Alert.alert('Reset this Portal?', 'This revokes this installation and removes its local credentials. A new Portal registration will be required.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Reset', style: 'destructive', onPress: () => void resetPortal() }])} />
  </Screen>;
}
