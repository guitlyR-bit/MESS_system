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
  player: { label: 'HRÁČ',   accent: colors.player.accent, textOnAccent: '#FFF' },
  coach:  { label: 'TRENÉR', accent: colors.coach.accent,  textOnAccent: '#FFF' },
  club:   { label: 'KLUB',   accent: colors.club.accent,   textOnAccent: '#111' },
} as const;

export default function RegisterScreen() {
  const { role = 'player' } = useLocalSearchParams<{ role: UserRole }>();
  const cfg = ROLE_CONFIG[role as UserRole] ?? ROLE_CONFIG.player;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[styles.banner, { backgroundColor: cfg.accent }]}>
          <Text style={[styles.bannerRole, { color: cfg.textOnAccent }]}>
            {cfg.label}
          </Text>
          <Text style={[styles.bannerTitle, { color: cfg.textOnAccent, opacity: 0.75 }]}>
            Registrace
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.form}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Input
            label="CELÉ JMÉNO"
            placeholder="Jan Novák"
            autoCapitalize="words"
            autoComplete="name"
            accentColor={cfg.accent}
          />
          <Input
            label="E-MAIL"
            placeholder="jan@email.cz"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            accentColor={cfg.accent}
          />
          <Input
            label="HESLO"
            placeholder="Minimálně 8 znaků"
            secureTextEntry
            accentColor={cfg.accent}
          />
          <Input
            label="POTVRZENÍ HESLA"
            placeholder="Zopakujte heslo"
            secureTextEntry
            accentColor={cfg.accent}
          />

          <TouchableOpacity
            activeOpacity={0.88}
            style={[styles.submitBtn, { backgroundColor: cfg.accent }]}
          >
            <Text style={[styles.submitBtnText, { color: cfg.textOnAccent }]}>
              VYTVOŘIT ÚČET
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
          >
            <Text style={styles.backBtnText}>← Zpět na přihlášení</Text>
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
  submitBtn: {
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 2,
  },
  backBtn: {
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textMuted,
  },
});
