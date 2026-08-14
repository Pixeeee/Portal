import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps, type ViewStyle } from 'react-native';

export const colors = {
  bg: '#111416',
  surface: '#181D21',
  surface2: '#20272C',
  panel: '#181D21',
  line: '#30383F',
  lineStrong: '#48515A',
  text: '#F4F7F8',
  muted: '#9AA7AE',
  accent: '#5DE0D0',
  accentText: '#06201E',
  live: '#42D98C',
  warning: '#EFC95C',
  danger: '#F06464',
  offline: '#77828A',
  blackGlass: 'rgba(8,10,12,0.74)',
};

type ButtonKind = 'primary' | 'secondary' | 'danger' | 'ghost';
type StatusTone = 'online' | 'offline' | 'busy' | 'connecting' | 'live' | 'reconnecting' | 'ended';

function toneColor(tone: StatusTone) {
  if (tone === 'online' || tone === 'live') return colors.live;
  if (tone === 'busy' || tone === 'connecting' || tone === 'reconnecting') return tone === 'connecting' ? colors.accent : colors.warning;
  if (tone === 'ended') return colors.danger;
  return colors.offline;
}

export function Screen({ children, scroll = true, padded = true }: { children: React.ReactNode; scroll?: boolean; padded?: boolean }) {
  if (scroll) return <ScrollView style={s.screen} contentContainerStyle={[s.content, !padded && s.noPad]}>{children}</ScrollView>;
  return <View style={[s.screen, padded && s.content]}>{children}</View>;
}

export function Header({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  return <View style={s.header}><View style={s.headerText}><Text numberOfLines={1} style={s.headerTitle}>{title}</Text>{subtitle ? <Text numberOfLines={1} style={s.headerSub}>{subtitle}</Text> : null}</View>{right}</View>;
}

export function Title({ children, compact = false }: { children: React.ReactNode; compact?: boolean }) {
  return <Text style={[s.title, compact && s.titleCompact]}>{children}</Text>;
}

export function Label({ children }: { children: React.ReactNode }) {
  return <Text style={s.label}>{children}</Text>;
}

export function Body({ children, muted = false, center = false }: { children: React.ReactNode; muted?: boolean; center?: boolean }) {
  return <Text style={[s.body, muted && s.muted, center && s.centerText]}>{children}</Text>;
}

export function Input(props: TextInputProps) {
  return <TextInput placeholderTextColor={colors.muted} {...props} style={[s.input, props.style]} />;
}

export function CodeInput(props: TextInputProps) {
  return <TextInput placeholderTextColor={colors.muted} autoCapitalize="characters" {...props} style={[s.input, s.codeInput, props.style]} />;
}

export function Button({ title, onPress, disabled = false, kind = 'primary' }: { title: string; onPress: () => void; disabled?: boolean; kind?: ButtonKind }) {
  return <Pressable disabled={disabled} onPress={onPress} style={({ pressed }) => [s.button, kind === 'secondary' && s.secondary, kind === 'danger' && s.danger, kind === 'ghost' && s.ghost, disabled && s.disabled, pressed && s.pressed]}><Text style={[s.buttonText, kind === 'primary' ? s.buttonPrimaryText : s.buttonLightText]}>{title}</Text></Pressable>;
}

export function IconCircle({ label, onPress, tone = 'neutral', active = false, size = 56 }: { label: string; onPress?: () => void; tone?: 'neutral' | 'danger' | 'accept'; active?: boolean; size?: number }) {
  const danger = tone === 'danger';
  const accept = tone === 'accept';
  return <Pressable accessibilityLabel={label} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={onPress} style={({ pressed }) => [s.iconCircle, { width: size, height: size, borderRadius: size / 2 }, active && s.iconActive, danger && s.iconDanger, accept && s.iconAccept, pressed && s.pressed]}><Text style={[s.iconCircleText, (danger || accept || active) && s.iconCircleTextDark]}>{label}</Text></Pressable>;
}

export function Status({ online, label }: { online: boolean; label?: string }) {
  return <View style={s.status}><View style={[s.dot, { backgroundColor: online ? colors.live : colors.offline }]} /><Text style={s.statusText}>{label ?? (online ? 'ONLINE' : 'OFFLINE')}</Text></View>;
}

export function StatusPill({ tone, label }: { tone: StatusTone; label?: string }) {
  const c = toneColor(tone);
  return <View style={[s.statusPill, { borderColor: `${c}55`, backgroundColor: `${c}18` }]}><View style={[s.dot, { backgroundColor: c }]} /><Text style={[s.statusPillText, { color: c }]}>{label ?? tone.toUpperCase()}</Text></View>;
}

export function Divider() { return <View style={s.divider} />; }

export function Loading({ label = 'Loading...' }: { label?: string }) {
  return <View style={s.loading}><ActivityIndicator color={colors.accent} /><Body muted center>{label}</Body></View>;
}

export function Panel({ children, style }: { children: React.ReactNode; style?: ViewStyle | ViewStyle[] }) {
  return <View style={[s.panel, style]}>{children}</View>;
}

export function Card({ children }: { children: React.ReactNode }) {
  return <Panel>{children}</Panel>;
}

export function SectionLabel({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return <View style={s.sectionLabel}><Label>{children}</Label>{right}</View>;
}

export function QuickAction({ label, hint, onPress, glyph }: { label: string; hint: string; onPress: () => void; glyph: string }) {
  return <Pressable onPress={onPress} style={({ pressed }) => [s.quickAction, pressed && s.pressed]}><Text style={s.quickGlyph}>{glyph}</Text><Text style={s.quickTitle}>{label}</Text><Text style={s.quickHint}>{hint}</Text></Pressable>;
}

export function ListRow({ title, meta, status, onPress, trailing }: { title: string; meta?: React.ReactNode; status?: StatusTone; onPress?: () => void; trailing?: React.ReactNode }) {
  const content = <View style={s.rowInner}><View style={s.rowText}><View style={s.rowTitleLine}><Text numberOfLines={1} style={s.rowTitle}>{title}</Text>{status ? <View style={[s.dot, { backgroundColor: toneColor(status) }]} /> : null}</View>{meta ? typeof meta === 'string' ? <Text numberOfLines={1} style={s.rowMeta}>{meta}</Text> : meta : null}</View>{trailing ?? <Text style={s.chevron}>›</Text>}</View>;
  if (onPress) return <Pressable onPress={onPress} style={({ pressed }) => [s.row, pressed && s.pressed]}>{content}</Pressable>;
  return <View style={s.row}>{content}</View>;
}

export function SettingRow({ label, hint, value, control }: { label: string; hint?: string; value?: string; control?: React.ReactNode }) {
  return <View style={s.settingRow}><View style={s.rowText}><Text style={s.settingTitle}>{label}</Text>{hint ? <Text style={s.rowMeta}>{hint}</Text> : null}</View>{value ? <Text style={s.settingValue}>{value}</Text> : null}{control}</View>;
}

export function PortalMark({ size = 112, live = false }: { size?: number; live?: boolean }) {
  const core = live ? colors.live : colors.accent;
  return <View style={[s.mark, { width: size, height: size, borderRadius: size / 2 }]}><View style={[s.markRing, { inset: size * 0.1, borderRadius: size / 2, borderColor: `${core}88` }]} /><View style={[s.markRing, { inset: size * 0.24, borderRadius: size / 2, borderColor: `${core}44` }]} /><View style={[s.markRing, { inset: size * 0.38, borderRadius: size / 2, borderColor: `${core}BB` }]} /><View style={[s.markCore, { width: size * 0.12, height: size * 0.12, borderRadius: size * 0.06, backgroundColor: core }]} /></View>;
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return <View style={s.empty}><PortalMark size={58} /><Text style={s.emptyTitle}>{title}</Text><Body muted center>{body}</Body>{action ? <View style={s.emptyAction}>{action}</View> : null}</View>;
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 88, gap: 14 },
  noPad: { padding: 0, paddingBottom: 0 },
  header: { minHeight: 58, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.line, backgroundColor: colors.bg, flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerText: { flex: 1, minWidth: 0 },
  headerTitle: { color: colors.text, fontSize: 17, lineHeight: 21, fontWeight: '800' },
  headerSub: { color: colors.muted, fontSize: 12, lineHeight: 16 },
  title: { color: colors.text, fontSize: 32, lineHeight: 36, fontWeight: '900', letterSpacing: 0 },
  titleCompact: { fontSize: 22, lineHeight: 27 },
  label: { color: colors.muted, fontSize: 11, lineHeight: 16, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
  body: { color: colors.text, fontSize: 15, lineHeight: 22 },
  muted: { color: colors.muted },
  centerText: { textAlign: 'center' },
  input: { minHeight: 50, borderWidth: 1, borderColor: colors.line, borderRadius: 8, color: colors.text, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, backgroundColor: colors.surface2 },
  codeInput: { textAlign: 'center', fontSize: 22, letterSpacing: 3, fontWeight: '800' },
  button: { backgroundColor: colors.accent, minHeight: 52, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  secondary: { backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.lineStrong },
  danger: { backgroundColor: colors.danger },
  ghost: { backgroundColor: 'transparent' },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.76 },
  buttonText: { fontWeight: '900', fontSize: 14 },
  buttonPrimaryText: { color: colors.accentText },
  buttonLightText: { color: colors.text },
  status: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 7, height: 7, borderRadius: 5 },
  statusText: { color: colors.text, fontSize: 12, fontWeight: '900', letterSpacing: 0.7 },
  statusPill: { minHeight: 28, borderRadius: 999, borderWidth: 1, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 7 },
  statusPillText: { fontSize: 11, fontWeight: '900' },
  divider: { height: 1, backgroundColor: colors.line, marginVertical: 4 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24, backgroundColor: colors.bg },
  panel: { backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.line, borderRadius: 8, padding: 14, gap: 10, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 2 },
  sectionLabel: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, paddingHorizontal: 2 },
  quickAction: { flex: 1, minHeight: 118, borderWidth: 1, borderColor: colors.line, borderRadius: 8, backgroundColor: colors.panel, padding: 13, gap: 7, justifyContent: 'center' },
  quickGlyph: { color: colors.accent, fontSize: 23, fontWeight: '900' },
  quickTitle: { color: colors.text, fontSize: 14, fontWeight: '900' },
  quickHint: { color: colors.muted, fontSize: 11, lineHeight: 15 },
  row: { borderBottomWidth: 1, borderBottomColor: colors.line },
  rowInner: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 8, paddingVertical: 10 },
  rowText: { flex: 1, minWidth: 0, gap: 3 },
  rowTitleLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowTitle: { flex: 1, color: colors.text, fontSize: 14, fontWeight: '800' },
  rowMeta: { color: colors.muted, fontSize: 12, lineHeight: 17 },
  chevron: { color: colors.muted, fontSize: 28, lineHeight: 30 },
  settingRow: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: colors.line, paddingVertical: 10 },
  settingTitle: { color: colors.text, fontSize: 14, fontWeight: '700' },
  settingValue: { color: colors.muted, fontSize: 12, fontWeight: '800' },
  iconCircle: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.lineStrong, backgroundColor: colors.surface2 },
  iconActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  iconDanger: { backgroundColor: colors.danger, borderColor: colors.danger },
  iconAccept: { backgroundColor: colors.live, borderColor: colors.live },
  iconCircleText: { color: colors.text, fontSize: 10, fontWeight: '900', textAlign: 'center', paddingHorizontal: 4 },
  iconCircleTextDark: { color: '#08100D' },
  mark: { alignItems: 'center', justifyContent: 'center', backgroundColor: `${colors.accent}12` },
  markRing: { position: 'absolute', borderWidth: 1 },
  markCore: { position: 'absolute' },
  empty: { alignItems: 'center', justifyContent: 'center', padding: 28, gap: 12 },
  emptyTitle: { color: colors.text, fontSize: 16, fontWeight: '900' },
  emptyAction: { alignSelf: 'stretch', marginTop: 6 },
});
