import { View } from 'react-native';
import { Tabs } from 'expo-router';
import { colors } from '@/lib/theme';
import { AppHeader } from '@/components/ui/AppHeader';

const A = colors.coach.accent;

export default function CoachLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bgAlt }}>
      <AppHeader roleLabel="Trenér" currentRole="coach" accent={A} userName="Marie Trenérová" />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#111111',
            borderTopWidth: 0,
            height: 64,
            paddingBottom: 8,
            paddingTop: 4,
          },
          tabBarActiveTintColor: A,
          tabBarInactiveTintColor: '#666666',
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '800',
            letterSpacing: 0.5,
            textTransform: 'uppercase',
          },
        }}
      >
        <Tabs.Screen name="home"     options={{ tabBarLabel: 'DOMŮ'     }} />
        <Tabs.Screen name="schedule" options={{ tabBarLabel: 'PLÁN'     }} />
        <Tabs.Screen name="players"  options={{ tabBarLabel: 'SVĚŘENCI' }} />
        <Tabs.Screen name="profile"  options={{ tabBarLabel: 'PROFIL'   }} />
      </Tabs>
    </View>
  );
}
