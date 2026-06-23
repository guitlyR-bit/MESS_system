import { Tabs } from 'expo-router';
import { Text } from 'react-native';

function Icon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return (
    <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.45 }}>{emoji}</Text>
  );
}

export default function ClubLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: '#0F1923',
          borderTopColor: '#1A2634',
          borderTopWidth: 1,
          height: 62,
          paddingBottom: 10,
        },
        tabBarActiveTintColor: '#D4A017',
        tabBarInactiveTintColor: '#4A5568',
        headerStyle: { backgroundColor: '#0F1923' },
        headerTintColor: '#FFFFFF',
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Domů',
          tabBarIcon: ({ focused }) => <Icon emoji="🏠" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="courts"
        options={{
          title: 'Kurty',
          tabBarIcon: ({ focused }) => <Icon emoji="🎾" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="members"
        options={{
          title: 'Členové',
          tabBarIcon: ({ focused }) => <Icon emoji="👥" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ focused }) => <Icon emoji="🏟️" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
