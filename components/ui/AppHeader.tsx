import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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

const BG = '#2D2D2D';

export function AppHeader({
  userName = 'Uživatel',
  roleLabel,
  currentRole,
  accent,
}: AppHeaderProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  function switchRole(route: string) {
    setDropdownOpen(false);
    router.replace(route as never);
  }

  function handleLogout() {
    // TODO: supabase.auth.signOut()
    router.replace('/');
  }

  return (
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

          {/* Rozbalovací nabídka */}
          <View>
            <TouchableOpacity
              onPress={() => setDropdownOpen(v => !v)}
              activeOpacity={0.75}
              style={s.roleBtn}
            >
              <Text style={s.roleBtnText}>ROLE</Text>
              <Text style={[s.roleBtnChevron, dropdownOpen && s.roleBtnChevronOpen]}>▾</Text>
            </TouchableOpacity>

            {/* Dropdown panel */}
            {dropdownOpen && (
              <View style={s.dropdown}>
                {ROLES.map((role) => {
                  const isActive = role.id === currentRole;
                  return (
                    <TouchableOpacity
                      key={role.id}
                      onPress={() => switchRole(role.route)}
                      activeOpacity={0.8}
                      style={[s.dropdownItem, isActive && s.dropdownItemActive]}
                    >
                      <View style={[s.dropdownDot, { backgroundColor: role.accent }]} />
                      <Text style={[s.dropdownLabel, isActive && { color: role.accent }]}>
                        {role.label}
                      </Text>
                      {isActive && <Text style={[s.dropdownCheck, { color: role.accent }]}>✓</Text>}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>

          {/* Odhlášení */}
          <TouchableOpacity
            onPress={handleLogout}
            activeOpacity={0.75}
            style={s.logoutBtn}
          >
            <Text style={s.logoutBtnText}>⏻</Text>
          </TouchableOpacity>

        </View>
      </View>

      {/* Overlay pro zavření dropdownu kliknutím mimo */}
      {dropdownOpen && (
        <Pressable
          style={StyleSheet.absoluteFillObject}
          onPress={() => setDropdownOpen(false)}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: BG,
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
    flex: 1,
    minWidth: 0,
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
    zIndex: 100,
  },

  // Tlačítko ROLE
  roleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#3D3D3D',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 2,
  },
  roleBtnText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  roleBtnChevron: {
    color: '#AAAAAA',
    fontSize: 11,
  },
  roleBtnChevronOpen: {
    transform: [{ rotate: '180deg' }],
  },

  // Dropdown
  dropdown: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: 6,
    backgroundColor: '#222222',
    minWidth: 160,
    zIndex: 200,
    borderWidth: 1,
    borderColor: '#3D3D3D',
    // Stín
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  dropdownItemActive: {
    backgroundColor: '#2D2D2D',
  },
  dropdownDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  dropdownLabel: {
    flex: 1,
    color: '#DDDDDD',
    fontSize: 14,
    fontWeight: '700',
  },
  dropdownCheck: {
    fontSize: 13,
    fontWeight: '900',
  },

  // Odhlášení
  logoutBtn: {
    backgroundColor: '#3D3D3D',
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 2,
  },
  logoutBtnText: {
    fontSize: 15,
    color: '#AAAAAA',
  },
});
