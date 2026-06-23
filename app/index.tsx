import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';

export type UserRole = 'player' | 'coach' | 'club';

interface RoleOption {
  id: UserRole;
  emoji: string;
  label: string;
  sublabel: string;
  description: string;
  gradient: readonly [string, string];
  accent: string;
}

const ROLES: RoleOption[] = [
  {
    id: 'player',
    emoji: '🎾',
    label: 'Hráč',
    sublabel: 'PLAYER',
    description: 'Rezervuj kurty, sleduj výsledky a turnaje',
    gradient: ['#1A3A2A', '#0D1F16'] as const,
    accent: '#2D9148',
  },
  {
    id: 'coach',
    emoji: '📋',
    label: 'Trenér',
    sublabel: 'COACH',
    description: 'Spravuj svěřence, tréninky a rozvrhy',
    gradient: ['#1A2A3A', '#0D1823'] as const,
    accent: '#2980B9',
  },
  {
    id: 'club',
    emoji: '🏟️',
    label: 'Klub',
    sublabel: 'CLUB',
    description: 'Spravuj kurty, členy a rezervace',
    gradient: ['#3A2A1A', '#23180D'] as const,
    accent: '#D4A017',
  },
];

export default function RoleSelectScreen() {
  const { width } = useWindowDimensions();
  // On wide screens (web/tablet) cards can sit in a row
  const isWide = width >= 768;

  function handleSelect(role: UserRole) {
    router.push({ pathname: '/(auth)/login', params: { role } });
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0F1923' }}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: isWide ? 48 : 24,
          maxWidth: 640,
          alignSelf: 'center',
          width: '100%',
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Brand ── */}
        <View style={{ alignItems: 'center', marginTop: 64, marginBottom: 48 }}>
          <Text
            style={{
              fontSize: 64,
              fontWeight: '900',
              letterSpacing: 16,
              color: '#FFFFFF',
              lineHeight: 72,
            }}
          >
            M<Text style={{ color: '#2D9148' }}>E</Text>SS
          </Text>
          <Text
            style={{
              color: '#4A5568',
              fontSize: 11,
              letterSpacing: 5,
              textTransform: 'uppercase',
              marginTop: 6,
            }}
          >
            Tennis Management System
          </Text>
          {/* Decorative bar */}
          <View style={{ flexDirection: 'row', gap: 4, marginTop: 16 }}>
            <View
              style={{ height: 3, width: 32, backgroundColor: '#2D9148', borderRadius: 4 }}
            />
            <View
              style={{ height: 3, width: 12, backgroundColor: '#2D914866', borderRadius: 4 }}
            />
            <View
              style={{ height: 3, width: 6, backgroundColor: '#2D914833', borderRadius: 4 }}
            />
          </View>
        </View>

        {/* ── Prompt ── */}
        <Text
          style={{ color: '#FFFFFF', fontSize: 24, fontWeight: '700', marginBottom: 4 }}
        >
          Kdo jste?
        </Text>
        <Text style={{ color: '#6B7280', fontSize: 14, marginBottom: 28 }}>
          Zvolte roli pro přístup do systému MESS
        </Text>

        {/* ── Role cards ── */}
        <View style={{ gap: 12 }}>
          {ROLES.map((role) => (
            <TouchableOpacity
              key={role.id}
              onPress={() => handleSelect(role.id)}
              activeOpacity={0.75}
            >
              <LinearGradient
                colors={role.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: role.accent + '55',
                  padding: 20,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                {/* Icon bubble */}
                <View
                  style={{
                    width: 58,
                    height: 58,
                    borderRadius: 15,
                    backgroundColor: role.accent + '22',
                    borderWidth: 1,
                    borderColor: role.accent + '44',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 16,
                  }}
                >
                  <Text style={{ fontSize: 26 }}>{role.emoji}</Text>
                </View>

                {/* Text */}
                <View style={{ flex: 1 }}>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                      marginBottom: 4,
                    }}
                  >
                    <Text
                      style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '700' }}
                    >
                      {role.label}
                    </Text>
                    <View
                      style={{
                        backgroundColor: role.accent + '22',
                        borderRadius: 6,
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderWidth: 1,
                        borderColor: role.accent + '44',
                      }}
                    >
                      <Text
                        style={{
                          color: role.accent,
                          fontSize: 9,
                          fontWeight: '800',
                          letterSpacing: 1.5,
                        }}
                      >
                        {role.sublabel}
                      </Text>
                    </View>
                  </View>
                  <Text style={{ color: '#9CA3AF', fontSize: 13, lineHeight: 18 }}>
                    {role.description}
                  </Text>
                </View>

                {/* Arrow */}
                <Text style={{ color: role.accent, fontSize: 22, marginLeft: 8 }}>›</Text>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Footer ── */}
        <View style={{ alignItems: 'center', marginTop: 48, marginBottom: 32 }}>
          <Text style={{ color: '#2D3748', fontSize: 11 }}>
            MESS v0.1.0 · Česká tenisová platforma
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
