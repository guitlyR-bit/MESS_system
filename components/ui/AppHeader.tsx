import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
  StyleSheet,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { colors } from '@/lib/theme';

type UserRole = 'player' | 'coach' | 'club';

interface AppHeaderProps {
  userName?: string;
  roleLabel: string;
  currentRole: UserRole;
  accent: string;
}

const ROLES: { id: UserRole; label: string; accent: string; route: string }[] = [
  { id: 'player', label: 'Hráč',   accent: colors.warm.orange, route: '/(player)/home' },
  { id: 'coach',  label: 'Trenér', accent: colors.warm.rose,   route: '/(coach)/home'  },
  { id: 'club',   label: 'Klub',   accent: colors.warm.yellow, route: '/(club)/home'   },
];

const BG       = '#2D2D2D';
const BAR_H    = 56; // výška pruhu pod safe area

export function AppHeader({
  userName = 'Uživatel',
  roleLabel,
  currentRole,
  accent,
}: AppHeaderProps) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);

  // Dropdown se zobrazí těsně pod záhlavím
  const dropdownTop = insets.top + BAR_H;

  function switchRole(route: string) {
    setOpen(false);
    router.replace(route as never);
  }

  function handleLogout() {
    setOpen(false);
    router.replace('/');
  }

  return (
    <>
      <SafeAreaView edges={['top']} style={{ backgroundColor: BG }}>
        <View style={s.bar}>

          {/* Levá část — role indikátor + jméno */}
          <View style={s.left}>
            <View style={[s.roleDot, { backgroundColor: accent }]} />
            <View style={s.textGroup}>
              <Text style={[s.roleLabel, { color: accent }]}>{roleLabel.toUpperCase()}</Text>
              <Text style={s.userName} numberOfLines={1}>{userName}</Text>
            </View>
          </View>

          {/* Pravá část */}
          <View style={s.right}>
            <TouchableOpacity
              onPress={() => setOpen(v => !v)}
              activeOpacity={0.75}
              style={[s.roleBtn, open && s.roleBtnActive]}
            >
              <Text style={s.roleBtnText}>ROLE</Text>
              <Text style={[s.chevron, open && s.chevronUp]}>▾</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleLogout}
              activeOpacity={0.75}
              style={s.logoutBtn}
            >
              <Text style={s.logoutIcon}>⏻</Text>
            </TouchableOpacity>
          </View>

        </View>
      </SafeAreaView>

      {/* Dropdown jako Modal — renderuje se nad vším */}
      <Modal
        visible={open}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setOpen(false)}
      >
        {/* Průhledný overlay — klik mimo zavře */}
        <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setOpen(false)} />

        {/* Obsah dropdownu */}
        <View style={[s.dropdown, { top: dropdownTop }]} pointerEvents="box-none">
          {ROLES.map((role, i) => {
            const isActive = role.id === currentRole;
            return (
              <TouchableOpacity
                key={role.id}
                onPress={() => switchRole(role.route)}
                activeOpacity={0.8}
                style={[
                  s.item,
                  i < ROLES.length - 1 && s.itemBorder,
                  isActive && s.itemActive,
                ]}
              >
                <View style={[s.itemDot, { backgroundColor: role.accent }]} />
                <Text style={[s.itemLabel, isActive && { color: role.accent }]}>
                  {role.label}
                </Text>
                {isActive && (
                  <Text style={[s.itemCheck, { color: role.accent }]}>✓</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  bar: {
    height: BAR_H,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 12,
  },

  // Levá část
  left: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
  },
  roleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  textGroup: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  roleLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  userName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },

  // Pravá část
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  roleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#3D3D3D',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 2,
  },
  roleBtnActive: {
    backgroundColor: '#4D4D4D',
  },
  roleBtnText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  chevron: {
    color: '#AAAAAA',
    fontSize: 11,
  },
  chevronUp: {
    transform: [{ rotate: '180deg' }],
  },
  logoutBtn: {
    backgroundColor: '#3D3D3D',
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 2,
  },
  logoutIcon: {
    fontSize: 15,
    color: '#AAAAAA',
  },

  // Dropdown
  dropdown: {
    position: 'absolute',
    right: 16,
    backgroundColor: '#222222',
    minWidth: 170,
    borderWidth: 1,
    borderColor: '#3D3D3D',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 16,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  itemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  itemActive: {
    backgroundColor: '#2D2D2D',
  },
  itemDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    flexShrink: 0,
  },
  itemLabel: {
    flex: 1,
    color: '#DDDDDD',
    fontSize: 14,
    fontWeight: '700',
  },
  itemCheck: {
    fontSize: 13,
    fontWeight: '900',
  },
});
