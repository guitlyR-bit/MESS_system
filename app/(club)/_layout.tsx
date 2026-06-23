import { Tabs } from 'expo-router';
import { colors } from '@/lib/theme';

const A = colors.club.accent;

export default function ClubLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: '#111111',
          borderTopWidth: 0,
          height: 64,
          paddingBottom: 8,
          paddingTop: 4,
        },
        tabBarActiveTintColor: A,
        tabBarInactiveTintColor: '#666666',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
        headerStyle: { backgroundColor: A },
        headerTintColor: '#111111',
        headerTitleStyle: { fontWeight: '900', fontSize: 16, letterSpacing: 0.5 },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen name="home"    options={{ title: 'Domů',        tabBarLabel: 'DOMŮ'        }} />
      <Tabs.Screen name="courts"  options={{ title: 'Sportoviště', tabBarLabel: 'SPORTOVIŠTĚ' }} />
      <Tabs.Screen name="members" options={{ title: 'Členové',     tabBarLabel: 'ČLENOVÉ'     }} />
      <Tabs.Screen name="profile" options={{ title: 'Profil',      tabBarLabel: 'PROFIL'      }} />
    </Tabs>
  );
}
