import { useCallback, useState } from 'react';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Body, Button, Loading, colors } from '@/components/ui';
import { portalCodeFromScan } from '@/lib/portalCode';

export default function Scan() {
  const [permission, requestPermission] = useCameraPermissions();
  const [locked, setLocked] = useState(false);
  const [message, setMessage] = useState('Point the camera at the other Portal screen.');

  const handleScan = useCallback(({ data }: { data: string }) => {
    if (locked) return;
    const code = portalCodeFromScan(data);
    if (!code) {
      setMessage('That QR is not a Portal code.');
      return;
    }
    setLocked(true);
    setMessage('Opening Portal...');
    router.replace({ pathname: '/portal/[code]', params: { code } });
  }, [locked]);

  if (!permission) return <Loading />;
  if (!permission.granted) {
    return <View style={s.center}>
      <Text style={s.title}>Camera access</Text>
      <Body muted>Camera access is required to scan Portal QR codes.</Body>
      <Button title="Allow Camera" onPress={() => void requestPermission()} />
      <Button title="Enter Code Instead" kind="secondary" onPress={() => router.replace('/connect')} />
    </View>;
  }

  return <View style={s.root}>
    <CameraView
      style={StyleSheet.absoluteFill}
      barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
      onBarcodeScanned={locked ? undefined : handleScan}
    />
    <View pointerEvents="none" style={s.frame} />
    <View style={s.overlay}>
      <Text style={s.title}>Scan Portal QR</Text>
      <Text style={s.text}>{message}</Text>
      {locked ? <Text style={s.locked}>Resolving secure link</Text> : null}
    </View>
  </View>;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  frame: { position: 'absolute', left: 42, right: 42, top: '24%', aspectRatio: 1, borderRadius: 8, borderWidth: 2, borderColor: colors.accent },
  overlay: { position: 'absolute', left: 16, right: 16, bottom: 28, backgroundColor: colors.blackGlass, borderWidth: 1, borderColor: '#FFFFFF22', padding: 16, borderRadius: 8, gap: 6 },
  center: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', padding: 24, gap: 16 },
  title: { color: '#fff', fontSize: 22, lineHeight: 27, fontWeight: '900' },
  text: { color: '#fff', fontSize: 15, lineHeight: 21 },
  locked: { color: colors.accent, fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
});
