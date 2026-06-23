import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import type { UserRole } from '../index';

const ROLE_CONFIG: Record<
  string,
  { label: string; emoji: string; accent: string; homeRoute: string }
> = {
  player: {
    label: 'Hráč',
    emoji: '🎾',
    accent: '#2D9148',
    homeRoute: '/(player)/home',
  },
  coach: {
    label: 'Trenér',
    emoji: '📋',
    accent: '#2980B9',
    homeRoute: '/(coach)/home',
  },
  club: {
    label: 'Klub',
    emoji: '🏟️',
    accent: '#D4A017',
    homeRoute: '/(club)/home',
  },
};

export default function LoginScreen() {
  const { role = 'player' } = useLocalSearchParams<{ role: UserRole }>();
  const cfg = ROLE_CONFIG[role] ?? ROLE_CONFIG.player;

  function handleLogin() {
    // TODO: Supabase auth.signInWithPassword()
    router.replace(cfg.homeRoute as never);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0F1923' }} edges={['bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 24,
            justifyContent: 'center',
            maxWidth: 480,
            alignSelf: 'center',
            width: '100%',
          }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Role indicator */}
          <View style={{ alignItems: 'center', marginBottom: 40 }}>
            <Text style={{ fontSize: 52 }}>{cfg.emoji}</Text>
            <Text
              style={{
                color: '#FFFFFF',
                fontSize: 26,
                fontWeight: '700',
                marginTop: 14,
              }}
            >
              Přihlásit se
            </Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                marginTop: 6,
              }}
            >
              <Text style={{ color: '#6B7280', fontSize: 14 }}>jako</Text>
              <View
                style={{
                  backgroundColor: cfg.accent + '22',
                  borderRadius: 8,
                  paddingHorizontal: 10,
                  paddingVertical: 3,
                  borderWidth: 1,
                  borderColor: cfg.accent + '55',
                }}
              >
                <Text
                  style={{ color: cfg.accent, fontSize: 13, fontWeight: '700' }}
                >
                  {cfg.label}
                </Text>
              </View>
            </View>
          </View>

          {/* Form */}
          <View style={{ gap: 16 }}>
            <View>
              <Text
                style={{
                  color: '#9CA3AF',
                  fontSize: 13,
                  fontWeight: '600',
                  marginBottom: 8,
                }}
              >
                E-mail
              </Text>
              <TextInput
                placeholder="vas@email.cz"
                placeholderTextColor="#4A5568"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                style={{
                  backgroundColor: '#1A2634',
                  borderWidth: 1,
                  borderColor: '#2D3748',
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  color: '#FFFFFF',
                  fontSize: 16,
                }}
              />
            </View>

            <View>
              <Text
                style={{
                  color: '#9CA3AF',
                  fontSize: 13,
                  fontWeight: '600',
                  marginBottom: 8,
                }}
              >
                Heslo
              </Text>
              <TextInput
                placeholder="••••••••"
                placeholderTextColor="#4A5568"
                secureTextEntry
                autoComplete="password"
                style={{
                  backgroundColor: '#1A2634',
                  borderWidth: 1,
                  borderColor: '#2D3748',
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  color: '#FFFFFF',
                  fontSize: 16,
                }}
              />
            </View>

            <TouchableOpacity
              onPress={handleLogin}
              activeOpacity={0.8}
              style={{
                backgroundColor: cfg.accent,
                borderRadius: 12,
                paddingVertical: 16,
                alignItems: 'center',
                marginTop: 8,
              }}
            >
              <Text
                style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}
              >
                Přihlásit se
              </Text>
            </TouchableOpacity>
          </View>

          {/* Register link */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'center',
              marginTop: 24,
            }}
          >
            <Text style={{ color: '#6B7280' }}>Nemáte účet? </Text>
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: '/(auth)/register',
                  params: { role },
                })
              }
            >
              <Text style={{ color: cfg.accent, fontWeight: '700' }}>
                Registrovat se
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
