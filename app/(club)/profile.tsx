import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { colors } from '@/lib/theme';
import { ActionTile } from '@/components/ui/ActionTile';

const A = colors.club.accent;

export default function ClubProfileScreen() {
  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        <View style={[s.banner, { backgroundColor: A }]}>
          <View style={s.avatarBox}>
            <Text style={s.avatarText}>K</Text>
          </View>
          <View style={s.bannerText}>
            <Text style={[s.bannerName, { color: '#111' }]}>Klub</Text>
            <Text style={[s.bannerEmail, { color: 'rgba(0,0,0,0.55)' }]}>klub@email.cz</Text>
          </View>
        </View>

        <View style={s.sectionGap} />

        <ActionTile label="Informace o klubu"  description="Název, adresa, kontakt" accent={A} />
        <ActionTile label="Logo a fotky"       description="Vizuální prezentace klubu" accent={A} badge="BRZY" />
        <ActionTile label="Fakturační údaje"   description="IČO, bankovní spojení" accent={A} badge="BRZY" />
        <ActionTile label="Nastavení"          description="Notifikace a oprávnění" accent={A} />

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
  avatarBox: { width: 64, height: 64, backgroundColor: 'rgba(0,0,0,0.15)', alignItems: 'center', justifyContent: 'center' },
  avatarText:  { fontSize: 28, fontWeight: '900', color: '#111' },
  bannerText:  { gap: 3 },
  bannerName:  { fontSize: 20, fontWeight: '900' },
  bannerEmail: { fontSize: 13 },
  sectionGap:  { height: 3, backgroundColor: '#111111' },
  logoutBtn:   { backgroundColor: '#111111', height: 56, justifyContent: 'center', alignItems: 'center', margin: 16 },
  logoutText:  { color: '#fff', fontSize: 13, fontWeight: '900', letterSpacing: 2 },
});
