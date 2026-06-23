import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { colors } from '@/lib/theme';
import { ActionTile } from '@/components/ui/ActionTile';

const W = colors.warm;

export default function ClubProfileScreen() {
  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        <View style={s.actions}>
          <ActionTile label="Informace o klubu"  description="Název, adresa, kontakt"      accent={W.yellow} />
          <ActionTile label="Logo a fotky"       description="Vizuální prezentace klubu"   accent={W.amber}  badge="BRZY" />
          <ActionTile label="Fakturační údaje"   description="IČO, bankovní spojení"       accent={W.orange} badge="BRZY" />
          <ActionTile label="Nastavení"          description="Notifikace a oprávnění"      accent={W.rose}   />
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
