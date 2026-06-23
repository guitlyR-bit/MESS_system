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
  { label: string; emoji: string; accent: string }
> = {
  player: { label: 'Hráč', emoji: '🎾', accent: '#2D9148' },
  coach: { label: 'Trenér', emoji: '📋', accent: '#2980B9' },
  club: { label: 'Klub', emoji: '🏟️', accent: '#D4A017' },
};

const FIELDS = [
  {
    key: 'name',
    label: 'Jméno a příjmení',
    placeholder: 'Jan Novák',
    secure: false,
    keyboard: 'default' as const,
  },
  {
    key: 'email',
    label: 'E-mail',
    placeholder: 'jan@email.cz',
    secure: false,
    keyboard: 'email-address' as const,
  },
  {
    key: 'password',
    label: 'Heslo',
    placeholder: '••••••••',
    secure: true,
    keyboard: 'default' as const,
  },
  {
    key: 'confirm',
    label: 'Potvrzení hesla',
    placeholder: '••••••••',
    secure: true,
    keyboard: 'default' as const,
  },
];

export default function RegisterScreen() {
  const { role = 'player' } = useLocalSearchParams<{ role: UserRole }>();
  const cfg = ROLE_CONFIG[role] ?? ROLE_CONFIG.player;

  function handleRegister() {
    // TODO: Supabase auth.signUp()
    router.back();
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0F1923' }} edges={['bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingVertical: 32,
            maxWidth: 480,
            alignSelf: 'center',
            width: '100%',
          }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Role indicator */}
          <View style={{ alignItems: 'center', marginBottom: 36 }}>
            <Text style={{ fontSize: 48 }}>{cfg.emoji}</Text>
            <Text
              style={{
                color: '#FFFFFF',
                fontSize: 24,
                fontWeight: '700',
                marginTop: 12,
              }}
            >
              Registrace
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

          {/* Form fields */}
          <View style={{ gap: 16 }}>
            {FIELDS.map((field) => (
              <View key={field.key}>
                <Text
                  style={{
                    color: '#9CA3AF',
                    fontSize: 13,
                    fontWeight: '600',
                    marginBottom: 8,
                  }}
                >
                  {field.label}
                </Text>
                <TextInput
                  placeholder={field.placeholder}
                  placeholderTextColor="#4A5568"
                  secureTextEntry={field.secure}
                  keyboardType={field.keyboard}
                  autoCapitalize={
                    field.key === 'name' ? 'words' : 'none'
                  }
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
            ))}

            <TouchableOpacity
              onPress={handleRegister}
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
                Vytvořit účet
              </Text>
            </TouchableOpacity>
          </View>

          {/* Login link */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'center',
              marginTop: 24,
            }}
          >
            <Text style={{ color: '#6B7280' }}>Máte účet? </Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={{ color: cfg.accent, fontWeight: '700' }}>
                Přihlásit se
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
