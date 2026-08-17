import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Camera } from 'expo-camera';
import { useKeepAwake } from 'expo-keep-awake';
import { AudioSession, LiveKitRoom, VideoTrack, isTrackReference, useRoomContext, useTracks } from '@livekit/react-native';
import { ConnectionState, Track, VideoPresets } from 'livekit-client';
import type { SessionCredentials } from '@portal/contracts';
import { usePortal } from '@/state/PortalProvider';
import { Body, Button, Loading, StatusPill, colors } from '@/components/ui';
import { getMediaPreferences, setMediaPreference, type PortalMediaPreferences } from '@/lib/localDb';

export default function LiveRoute() {
  useKeepAwake();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const { api } = usePortal();
  const [credentials, setCredentials] = useState<SessionCredentials | null>(null);
  const [prefs, setPrefs] = useState<PortalMediaPreferences | null>(null);
  const [permission, setPermission] = useState<'checking' | 'granted'>('checking');
  const [mediaWarning, setMediaWarning] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { void getMediaPreferences().then(setPrefs); }, []);
  useEffect(() => { if (!prefs) return; void (async () => {
    const [cam, mic] = await Promise.all([
      prefs.cameraEnabled ? Camera.requestCameraPermissionsAsync() : Promise.resolve({ granted: true }),
      prefs.microphoneEnabled ? Camera.requestMicrophonePermissionsAsync() : Promise.resolve({ granted: true }),
    ]);
    const nextPrefs = {
      ...prefs,
      cameraEnabled: prefs.cameraEnabled && cam.granted,
      microphoneEnabled: prefs.microphoneEnabled && mic.granted,
    };
    if (!cam.granted || !mic.granted) {
      setMediaWarning('Local camera or microphone is off because permission was not granted. You can still join and receive the remote Portal.');
      setPrefs(nextPrefs);
    }
    setPermission('granted');
  })(); }, [prefs?.cameraEnabled, prefs?.microphoneEnabled]);
  const loadCredentials = async () => {
    if (!api || !sessionId) return;
    setError('');
    setCredentials(null);
    try { setCredentials(await api.credentials(sessionId)); }
    catch (e: any) { setError(e.message || 'Unable to get media credentials.'); }
  };
  useEffect(() => { if (permission === 'granted' && api && sessionId) void loadCredentials(); }, [permission, api, sessionId]);
  useEffect(() => { if (permission !== 'granted' || !prefs) return; void AudioSession.startAudioSession().then(async () => { try { await (AudioSession as any).selectAudioOutput(prefs.speakerEnabled ? 'force_speaker' : 'force_earpiece'); } catch {} }); return () => { void AudioSession.stopAudioSession(); }; }, [permission, prefs]);

  if (permission === 'checking' || !prefs) return <Loading label="Checking camera and microphone..." />;
  if (error) return <View style={s.center}><Text style={s.title}>Unable to start Portal</Text><Body>{error}</Body><Button title="Retry" onPress={() => void loadCredentials()} /><Button title="Go Home" kind="secondary" onPress={() => router.replace('/(tabs)')} /></View>;
  if (!credentials) return <Loading label="Preparing secure media session..." />;

  return <LiveKitRoom
    serverUrl={credentials.serverUrl}
    token={credentials.participantToken}
    connect
    audio={prefs.microphoneEnabled}
    video={prefs.cameraEnabled ? { resolution: VideoPresets.h360.resolution, facingMode: 'user' } : false}
    options={{ adaptiveStream: { pixelDensity: 'screen', pauseVideoInBackground: true }, dynacast: true, videoCaptureDefaults: { resolution: VideoPresets.h360.resolution } }}
    connectOptions={{ websocketTimeout: 20_000, peerConnectionTimeout: 25_000, maxRetries: 2 }}
    onConnected={() => void api?.sessionStarted(sessionId)}
    onError={(e) => setError(e.message)}>
    <RoomContent sessionId={sessionId} initialPrefs={prefs} mediaWarning={mediaWarning} />
  </LiveKitRoom>;
}

function RoomContent({ sessionId, initialPrefs, mediaWarning }: { sessionId: string; initialPrefs: PortalMediaPreferences; mediaWarning: string }) {
  const { api } = usePortal();
  const room = useRoomContext();
  const tracks = useTracks([Track.Source.Camera]);
  const [controls, setControls] = useState(true);
  const [mic, setMic] = useState(initialPrefs.microphoneEnabled);
  const [camera, setCamera] = useState(initialPrefs.cameraEnabled);
  const [front, setFront] = useState(true);
  const [speaker, setSpeaker] = useState(initialPrefs.speakerEnabled);
  const [selfView, setSelfView] = useState(initialPrefs.showLocalPreview);
  const [ending, setEnding] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remote = useMemo(() => tracks.find(t => isTrackReference(t) && !t.participant.isLocal), [tracks]);
  const local = useMemo(() => tracks.find(t => isTrackReference(t) && t.participant.isLocal), [tracks]);

  const show = () => { setControls(true); if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => setControls(false), 3000); };
  useEffect(() => { show(); return () => { if (timer.current) clearTimeout(timer.current); }; }, []);
  useEffect(() => { if (room.state !== ConnectionState.Connected) return; const i = setInterval(() => setSeconds(s => s + 1), 1000); return () => clearInterval(i); }, [room.state]);
  async function toggleMic() { const next = !mic; await room.localParticipant.setMicrophoneEnabled(next); setMic(next); show(); }
  async function toggleCamera() { const next = !camera; await room.localParticipant.setCameraEnabled(next, { resolution: VideoPresets.h360.resolution }); setCamera(next); show(); }
  async function toggleSelfView() { const next = !selfView; setSelfView(next); await setMediaPreference('showLocalPreview', next); show(); }
  async function switchCamera() { if (!camera) return show(); const publication = room.localParticipant.getTrackPublication(Track.Source.Camera); const track = publication?.track as any; if (track?.restartTrack) { const next = !front; await track.restartTrack({ facingMode: next ? 'user' : 'environment', resolution: VideoPresets.h360.resolution }); setFront(next); } show(); }
  async function toggleSpeaker() { const next = !speaker; try { await (AudioSession as any).selectAudioOutput(next ? 'force_speaker' : 'force_earpiece'); } catch {} setSpeaker(next); show(); }
  async function end() { if (ending) return; setEnding(true); try { await api?.endSession(sessionId); } finally { room.disconnect(); router.replace('/(tabs)'); } }
  const connecting = room.state !== ConnectionState.Connected;
  const remoteQuality = remote && isTrackReference(remote) ? String((remote.participant as any).connectionQuality ?? 'unknown').replace('excellent', 'Excellent').replace('good', 'Good').replace('poor', 'Poor').replace('lost', 'Poor') : 'Waiting';
  const clock = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  const statusTone = room.state === ConnectionState.Reconnecting ? 'reconnecting' : connecting ? 'connecting' : 'live';

  return <Pressable style={s.live} onPress={show}>
    {remote && isTrackReference(remote) ? <VideoTrack trackRef={remote} style={StyleSheet.absoluteFill} objectFit="cover" /> : <View style={[StyleSheet.absoluteFill, s.wait]}><Text style={s.waitText}>{connecting ? 'Connecting media...' : 'Waiting for remote video...'}</Text></View>}
    {controls ? <View style={s.topBar}>
      <View style={s.placeBadge}><Text style={s.placeTitle}>Live Portal</Text><Text style={s.placeMeta}>{clock} · {remoteQuality}</Text></View>
      <StatusPill tone={statusTone} label={room.state === ConnectionState.Reconnecting ? 'Reconnecting' : connecting ? 'Connecting' : 'Live'} />
    </View> : null}
    {room.state === ConnectionState.Reconnecting ? <View style={s.notice}><Text style={s.noticeText}>Connection unstable - holding the window open and retrying.</Text></View> : null}
    {mediaWarning && controls ? <View style={[s.notice, s.permissionNotice]}><Text style={s.noticeText}>{mediaWarning}</Text></View> : null}
    {selfView && local && isTrackReference(local) && camera ? <View style={s.preview}><VideoTrack trackRef={local} style={StyleSheet.absoluteFill} mirror={front} objectFit="cover" /><Text style={s.you}>SELF</Text></View> : null}
    {controls ? <View style={s.controls}>
      <View style={s.controlRow}><Control label={mic ? 'Mute' : 'Unmute'} active={!mic} onPress={() => void toggleMic()} /><Control label={camera ? 'Camera' : 'Cam Off'} active={!camera} onPress={() => void toggleCamera()} /><Control label="Switch" onPress={() => void switchCamera()} /><Control label={speaker ? 'Speaker' : 'Earpiece'} active={speaker} onPress={() => void toggleSpeaker()} /><Control label={ending ? 'Ending' : 'End'} danger onPress={() => void end()} /></View>
      <Pressable onPress={() => void toggleSelfView()} style={s.selfToggle}><Text style={s.selfToggleText}>Self view {selfView ? 'on' : 'off'}</Text></Pressable>
    </View> : null}
  </Pressable>;
}

function Control({ label, onPress, danger = false, active = false }: { label: string; onPress: () => void; danger?: boolean; active?: boolean }) {
  return <Pressable onPress={onPress} style={({ pressed }) => [s.control, active && s.controlActive, danger && s.controlDanger, pressed && { opacity: 0.75 }]}><Text style={[s.controlText, (active || danger) && s.controlTextDark]} numberOfLines={1}>{label}</Text></Pressable>;
}

const s = StyleSheet.create({
  live: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', padding: 24, gap: 18 },
  title: { color: colors.text, fontSize: 28, fontWeight: '900' },
  wait: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#0E1215' },
  waitText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  topBar: { position: 'absolute', left: 14, right: 14, top: 38, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  placeBadge: { flex: 1, backgroundColor: colors.blackGlass, borderWidth: 1, borderColor: '#FFFFFF22', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
  placeTitle: { color: '#fff', fontWeight: '900', fontSize: 14 },
  placeMeta: { color: colors.muted, fontSize: 11, marginTop: 3, fontWeight: '700' },
  notice: { position: 'absolute', top: 108, left: 16, right: 16, padding: 11, borderRadius: 8, borderWidth: 1, borderColor: `${colors.warning}66`, backgroundColor: `${colors.warning}22` },
  permissionNotice: { top: 154 },
  noticeText: { color: colors.warning, fontSize: 12, fontWeight: '800' },
  preview: { position: 'absolute', right: 16, bottom: 142, width: 96, height: 136, borderRadius: 8, overflow: 'hidden', backgroundColor: '#222', borderWidth: 1, borderColor: '#FFFFFF44' },
  you: { position: 'absolute', top: 7, left: 7, color: '#fff', fontWeight: '900', fontSize: 9, backgroundColor: '#0009', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4 },
  controls: { position: 'absolute', left: 12, right: 12, bottom: 22, borderRadius: 18, borderWidth: 1, borderColor: '#FFFFFF22', backgroundColor: colors.blackGlass, padding: 12, gap: 12 },
  controlRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 7 },
  control: { flex: 1, minHeight: 52, borderRadius: 999, borderWidth: 1, borderColor: '#FFFFFF33', backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  controlActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  controlDanger: { backgroundColor: colors.danger, borderColor: colors.danger },
  controlText: { color: colors.text, fontWeight: '900', fontSize: 10 },
  controlTextDark: { color: '#08100D' },
  selfToggle: { borderTopWidth: 1, borderTopColor: '#FFFFFF22', paddingTop: 11, alignItems: 'center' },
  selfToggleText: { color: colors.muted, fontSize: 12, fontWeight: '900' },
});
