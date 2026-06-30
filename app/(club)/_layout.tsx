import { View } from 'react-native';
import { Tabs } from 'expo-router';
import { colors } from '@/lib/theme';
import { AppHeader } from '@/components/ui/AppHeader';
import { useClubProfile } from '@/hooks/useClubProfile';
import { resolveClubProfileTheme } from '@/lib/clubProfileTheme';

export default function ClubLayout() {
  const { profile } = useClubProfile();
  const { accent } = resolveClubProfileTheme(profile);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgAlt }}>
      <AppHeader roleLabel="Klub" currentRole="club" accent={accent} userName={profile.name} />
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
          tabBarActiveTintColor: accent,
          tabBarInactiveTintColor: '#666666',
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '800',
            letterSpacing: 0.5,
            textTransform: 'uppercase',
          },
        }}
      >
        <Tabs.Screen name="home"    options={{ tabBarLabel: 'DOMŮ'        }} />
        <Tabs.Screen name="courts"  options={{ tabBarLabel: 'SPORTOVIŠTĚ' }} />
        <Tabs.Screen name="members" options={{ tabBarLabel: 'ČLENOVÉ'     }} />
        <Tabs.Screen name="profile" options={{ tabBarLabel: 'PROFIL'      }} />
      </Tabs>
    </View>
  );
}
