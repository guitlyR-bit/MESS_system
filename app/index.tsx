import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { colors } from '@/lib/theme';

export type UserRole = 'player' | 'coach' | 'club';

const ROLES = [
  {
    id: 'player' as UserRole,
    label: 'HRÁČ',
    sub: 'Rezervace · Turnaje · Výsledky',
    bg: colors.player.accent,
    textColor: '#FFFFFF',
  },
  {
    id: 'coach' as UserRole,
    label: 'TRENÉR',
    sub: 'Svěřenci · Tréninky · Pokrok',
    bg: colors.coach.accent,
    textColor: '#FFFFFF',
  },
  {
    id: 'club' as UserRole,
    label: 'KLUB',
    sub: 'Sportoviště · Rezervace · Členové',
    bg: colors.club.accent,
    textColor: '#111111',
  },
] as const;

export default function RoleSelectScreen() {
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar style="light" />

      {/* ── Hlavička ──────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Text style={styles.headerLogo}>MESS</Text>
        <Text style={styles.headerSub}>Multifunkční Elektronický Sportovní Systém</Text>
      </View>

      {/* ── Dlaždice ──────────────────────────────────────────────────── */}
      <View style={[styles.tiles, isWide && styles.tilesWide]}>
        {ROLES.map((role, i) => (
          <TouchableOpacity
            key={role.id}
            activeOpacity={0.88}
            style={[
              styles.tile,
              { backgroundColor: role.bg },
              isWide && styles.tileWide,
              // Na mobilu přidat pravý border mezi dlaždicemi
              !isWide && i < ROLES.length - 1 && styles.tileBorderBottom,
              // Na desktopu border vpravo
              isWide && i < ROLES.length - 1 && styles.tileBorderRight,
            ]}
            onPress={() =>
              router.push({ pathname: '/(auth)/login', params: { role: role.id } })
            }
          >
            <Text style={[styles.tileLabel, { color: role.textColor }]}>
              {role.label}
            </Text>
            <Text style={[styles.tileSub, { color: role.textColor, opacity: 0.72 }]}>
              {role.sub}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#111111',
  },

  // Hlavička — tmavý pruh
  header: {
    backgroundColor: '#111111',
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 2,
  },
  headerLogo: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 11,
    color: '#888888',
    fontWeight: '500',
    letterSpacing: 0.3,
  },

  // Dlaždice — mobil: svislé
  tiles: {
    flex: 1,
    flexDirection: 'column',
  },
  // Dlaždice — desktop/tablet: vodorovné
  tilesWide: {
    flexDirection: 'row',
  },
  tile: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingHorizontal: 32,
    paddingVertical: 24,
    gap: 6,
  },
  tileWide: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  tileBorderBottom: {
    borderBottomWidth: 3,
    borderBottomColor: '#111111',
  },
  tileBorderRight: {
    borderRightWidth: 3,
    borderRightColor: '#111111',
  },
  tileLabel: {
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  tileSub: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
});
