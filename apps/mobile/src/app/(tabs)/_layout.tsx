import { Tabs } from 'expo-router';
import { colors } from '@/components/ui';

export default function TabsLayout() {
  return <Tabs screenOptions={{
    headerShown: false,
    tabBarStyle: { backgroundColor: colors.bg, borderTopColor: colors.line, minHeight: 66, paddingBottom: 8, paddingTop: 8 },
    tabBarActiveTintColor: colors.accent,
    tabBarInactiveTintColor: colors.muted,
    tabBarLabelStyle: { fontSize: 11, fontWeight: '800' },
  }}>
    <Tabs.Screen name="index" options={{ title: 'Portal' }} />
    <Tabs.Screen name="recents" options={{ title: 'Recents' }} />
    <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
  </Tabs>;
}
