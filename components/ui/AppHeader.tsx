import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { colors } from '@/lib/theme';

interface AppHeaderProps {
  userName?: string;
  roleLabel: string;
  accent: string;
}

export function AppHeader({ userName = 'Uživatel', roleLabel, accent }: AppHeaderProps) {
  function handleSwitchRole() {
    router.replace('/');
  }

  function handleLogout() {
    // TODO: supabase.auth.signOut()
    router.replace('/');
  }

  return (
    <SafeAreaView edges={['top']} style={{ backgroundColor: colors.surface }}>
      <View style={s.bar}>

        {/* Levá část — role badge + jméno */}
        <View style={s.left}>
          <View style={[s.roleDot, { backgroundColor: accent }]} />
          <View style={s.textGroup}>
            <Text style={[s.roleLabel, { color: accent }]}>{roleLabel.toUpperCase()}</Text>
            <Text style={s.userName} numberOfLines={1}>{userName}</Text>
          </View>
        </View>

        {/* Pravá část — přepínač rolí + odhlášení */}
        <View style={s.right}>
          <TouchableOpacity
            onPress={handleSwitchRole}
            activeOpacity={0.75}
            style={[s.btn, { borderColor: accent + '55' }]}
          >
            <Text style={[s.btnText, { color: accent }]}>ZMĚNIT ROLI</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleLogout}
            activeOpacity={0.75}
            style={[s.btnIcon, { borderColor: colors.border }]}
          >
            <Text style={s.btnIconText}>⏻</Text>
          </TouchableOpacity>
        </View>

      </View>

      {/* Barevný spodní pruh — jemný náznak barvy role */}
      <View style={[s.accentBar, { backgroundColor: accent }]} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    gap: 12,
  },

  // Levá část
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  roleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  textGroup: {
    gap: 1,
    minWidth: 0,
    flex: 1,
  },
  roleLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  userName: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },

  // Pravá část — tlačítka
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  btn: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 2,
  },
  btnText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  btnIcon: {
    borderWidth: 1,
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 2,
  },
  btnIconText: {
    fontSize: 15,
    color: colors.textSecondary,
  },

  // Spodní barevný pruh
  accentBar: {
    height: 3,
  },
});
