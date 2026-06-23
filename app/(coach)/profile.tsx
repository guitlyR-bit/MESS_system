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
  actions:  { marginTop: 8 },
  logoutBtn:  { backgroundColor: '#111111', height: 56, justifyContent: 'center', alignItems: 'center', margin: 16 },
  logoutText: { color: '#fff', fontSize: 13, fontWeight: '900', letterSpacing: 2 },
});
