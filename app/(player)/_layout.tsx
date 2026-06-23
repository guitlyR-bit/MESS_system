import { View } from 'react-native';
import { Tabs } from 'expo-router';
import { colors } from '@/lib/theme';
import { AppHeader } from '@/components/ui/AppHeader';

const A = colors.player.accent;

export default function PlayerLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bgAlt }}>
      <AppHeader roleLabel="Hráč" accent={A} userName="Jan Novák" />
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
        <Tabs.Screen name="home"    options={{ tabBarLabel: 'DOMŮ'   }} />
        <Tabs.Screen name="courts"  options={{ tabBarLabel: 'KURTY'  }} />
        <Tabs.Screen name="matches" options={{ tabBarLabel: 'ZÁPASY' }} />
        <Tabs.Screen name="profile" options={{ tabBarLabel: 'PROFIL' }} />
      </Tabs>
    </View>
  );
}
