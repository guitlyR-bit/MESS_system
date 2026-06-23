import {
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { colors } from '@/lib/theme';
import { Input } from '@/components/ui/Input';
import type { UserRole } from '../index';

const ROLE_CONFIG = {
  player: { label: 'HRÁČ',   accent: colors.player.accent, textOnAccent: '#FFF', homeRoute: '/(player)/home' },
  coach:  { label: 'TRENÉR', accent: colors.coach.accent,  textOnAccent: '#FFF', homeRoute: '/(coach)/home'  },
  club:   { label: 'KLUB',   accent: colors.club.accent,   textOnAccent: '#FFF', homeRoute: '/(club)/home'   },
} as const;

export default function LoginScreen() {
  const { role = 'player' } = useLocalSearchParams<{ role: UserRole }>();
  const cfg = ROLE_CONFIG[role as UserRole] ?? ROLE_CONFIG.player;

  function handleLogin() {
    router.replace(cfg.homeRoute as never);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Barevný banner nahoře */}
        <View style={[styles.banner, { backgroundColor: cfg.accent }]}>
          <Text style={[styles.bannerRole, { color: cfg.textOnAccent }]}>
            {cfg.label}
          </Text>
          <Text style={[styles.bannerTitle, { color: cfg.textOnAccent, opacity: 0.75 }]}>
            Přihlášení
          </Text>
        </View>

        {/* Formulář */}
        <ScrollView
          contentContainerStyle={styles.form}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Input
            label="E-MAIL"
            placeholder="vas@email.cz"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            accentColor={cfg.accent}
          />
          <Input
            label="HESLO"
            placeholder="Vaše heslo"
            secureTextEntry
            autoComplete="password"
            accentColor={cfg.accent}
          />

          {/* Velké POS tlačítko přihlášení */}
          <TouchableOpacity
            onPress={handleLogin}
            activeOpacity={0.88}
            style={[styles.loginBtn, { backgroundColor: cfg.accent }]}
          >
            <Text style={[styles.loginBtnText, { color: cfg.textOnAccent }]}>
              PŘIHLÁSIT SE
            </Text>
          </TouchableOpacity>

          {/* Odkaz na registraci */}
          <TouchableOpacity
            style={styles.registerBtn}
            onPress={() => router.push({ pathname: '/(auth)/register', params: { role } })}
          >
            <Text style={styles.registerBtnText}>Nemáte účet? Registrovat se →</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  banner: {
    paddingHorizontal: 28,
    paddingTop: 32,
    paddingBottom: 28,
    gap: 4,
  },
  bannerRole: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 2,
  },
  bannerTitle: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  form: {
    padding: 24,
    gap: 16,
    maxWidth: 480,
    alignSelf: 'center',
    width: '100%',
  },
  loginBtn: {
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  loginBtnText: {
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 2,
  },
  registerBtn: {
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerBtnText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textMuted,
  },
});
