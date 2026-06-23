import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { colors } from '@/lib/theme';
import { ActionTile } from '@/components/ui/ActionTile';

const W = colors.warm;

export default function CoachProfileScreen() {
  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        <View style={[s.banner, { backgroundColor: W.rose }]}>
          <View style={s.avatarBox}>
            <Text style={s.avatarText}>T</Text>
          </View>
          <View style={s.bannerInfo}>
            <Text style={s.bannerName}>Trenér</Text>
            <Text style={s.bannerEmail}>trener@email.cz</Text>
          </View>
        </View>

        <View style={s.actions}>
          <ActionTile label="Osobní údaje"    description="Jméno, certifikace, kontakt"   accent={W.rose}  />
          <ActionTile label="Certifikace"     description="Trenérské licence a vzdělání"  accent={W.pink}  badge="BRZY" />
          <ActionTile label="Moje hodnocení"  description="Zpětná vazba od svěřenců"      accent={W.red}   badge="BRZY" />
          <ActionTile label="Nastavení"       description="Notifikace a předvolby"        accent={W.amber} />
        </View>

        <TouchableOpacity onPress={() => router.replace('/')} activeOpacity={0.85} style={s.logoutBtn}>
          <Text style={s.logoutText}>ODHLÁSIT SE</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: colors.bgAlt },
  scroll:     { flexGrow: 1 },
  banner:     { flexDirection: 'row', alignItems: 'center', padding: 24, gap: 16 },
  avatarBox:  { width: 64, height: 64, backgroundColor: 'rgba(0,0,0,0.18)', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 28, fontWeight: '900', color: '#fff' },
  bannerInfo: { gap: 3 },
  bannerName: { fontSize: 20, fontWeight: '900', color: '#fff' },
  bannerEmail:{ fontSize: 13, color: 'rgba(255,255,255,0.75)' },
  actions:    { marginTop: 16 },
  logoutBtn:  { backgroundColor: '#111111', height: 56, justifyContent: 'center', alignItems: 'center', margin: 16 },
  logoutText: { color: '#fff', fontSize: 13, fontWeight: '900', letterSpacing: 2 },
});
