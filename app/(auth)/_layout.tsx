import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#0F1923' },
        headerTintColor: '#FFFFFF',
        headerBackTitle: 'Zpět',
        contentStyle: { backgroundColor: '#0F1923' },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="login" options={{ title: 'Přihlášení' }} />
      <Stack.Screen name="register" options={{ title: 'Registrace' }} />
    </Stack>
  );
}
