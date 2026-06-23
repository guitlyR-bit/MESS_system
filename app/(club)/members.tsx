import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/lib/theme';
import { StatTile } from '@/components/ui/StatTile';
import { ActionTile } from '@/components/ui/ActionTile';

const W = colors.warm;

export default function ClubMembersScreen() {
  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        <View style={s.statGrid}>
          <View style={s.row}>
            <StatTile label="Aktivní"   value="0" sub="členů"    accent={W.yellow} />
            <StatTile label="Čekající"  value="0" sub="žádostí"  accent={W.orange} />
          </View>
        </View>

        <View style={s.actions}>
          <ActionTile label="Přidat člena"        description="Pozvat nebo zaregistrovat"  accent={W.yellow} badge="BRZY" />
          <ActionTile label="Žádosti o členství"  description="Schvalování přihlášek"      accent={W.amber}  />
          <ActionTile label="Členské kategorie"   description="Typy a poplatky"            accent={W.orange} badge="BRZY" />
          <ActionTile label="Export členů"        description="Přehled do CSV/PDF"         accent={W.rose}   badge="BRZY" />
        </View>

        <View style={s.placeholder}>
          <Text style={s.placeholderTitle}>Žádní členové</Text>
          <Text style={s.placeholderSub}>Registrovaní členové se zobrazí zde</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: colors.bgAlt },
  scroll:       { flexGrow: 1 },
  statGrid:     { backgroundColor: colors.bgAlt, padding: 4, gap: 4 },
  row:          { flexDirection: 'row', gap: 4 },
  actions:      { marginTop: 16 },
  placeholder:  { backgroundColor: colors.surface, padding: 24, margin: 16, gap: 6, borderLeftWidth: 4, borderLeftColor: colors.border },
  placeholderTitle: { fontSize: 15, fontWeight: '800', color: colors.textPrimary },
  placeholderSub:   { fontSize: 13, color: colors.textMuted },
});
