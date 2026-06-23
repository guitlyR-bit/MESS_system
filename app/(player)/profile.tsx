import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { colors } from '@/lib/theme';
import { ActionTile } from '@/components/ui/ActionTile';

const A = colors.player.accent;

export default function PlayerProfileScreen() {
  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Avatar banner */}
        <View style={[s.banner, { backgroundColor: A }]}>
          <View style={s.avatarBox}>
            <Text style={s.avatarText}>H</Text>
          </View>
          <View style={s.bannerText}>
            <Text style={s.bannerName}>Hráč</Text>
            <Text style={s.bannerEmail}>hrac@email.cz</Text>
          </View>
        </View>

        <View style={s.sectionGap} />

        <ActionTile label="Osobní údaje"    description="Jméno, datum narození, kontakt" accent={A} />
        <ActionTile label="Změnit heslo"    description="Zabezpečení účtu" accent={A} />
        <ActionTile label="Moje statistiky" description="Výkonnostní přehled" accent={A} badge="BRZY" />
        <ActionTile label="Nastavení"       description="Notifikace a předvolby" accent={A} />

        <View style={s.sectionGap} />

        <TouchableOpacity onPress={() => router.replace('/')} activeOpacity={0.85} style={s.logoutBtn}>
          <Text style={s.logoutText}>ODHLÁSIT SE</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: colors.bg },
  scroll:  { flexGrow: 1 },
  banner:  { flexDirection: 'row', alignItems: 'center', padding: 24, gap: 16 },
  avatarBox: {
    width: 64, height: 64,
    backgroundColor: 'rgba(0,0,0,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText:  { fontSize: 28, fontWeight: '900', color: '#fff' },
  bannerText:  { gap: 3 },
  bannerName:  { fontSize: 20, fontWeight: '900', color: '#fff' },
  bannerEmail: { fontSize: 13, color: 'rgba(255,255,255,0.75)' },
  sectionGap:  { height: 3, backgroundColor: '#111111' },
  logoutBtn:   { backgroundColor: '#111111', height: 56, justifyContent: 'center', alignItems: 'center', margin: 16 },
  logoutText:  { color: '#fff', fontSize: 13, fontWeight: '900', letterSpacing: 2 },
});
