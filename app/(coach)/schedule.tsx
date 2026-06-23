import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/lib/theme';
import { StatTile } from '@/components/ui/StatTile';
import { ActionTile } from '@/components/ui/ActionTile';

const W = colors.warm;

export default function CoachScheduleScreen() {
  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        <View style={s.statGrid}>
          <View style={s.row}>
            <StatTile label="Dnes"        value="0" sub="tréninků"  accent={W.rose} />
            <StatTile label="Tento týden" value="0" sub="tréninků"  accent={W.red}  />
          </View>
        </View>

        <View style={s.actions}>
          <ActionTile label="Přidat trénink"    description="Nová tréninková jednotka"    accent={W.rose}  badge="BRZY" />
          <ActionTile label="Dnešní program"    description="Rozvrh na dnešek"            accent={W.pink}  />
          <ActionTile label="Týdenní přehled"   description="Po–Ne, všichni svěřenci"     accent={W.red}   />
          <ActionTile label="Šablony tréninků"  description="Uložené tréninkové plány"    accent={W.amber} badge="BRZY" />
        </View>

        <View style={s.placeholder}>
          <Text style={s.placeholderTitle}>Žádné tréninky dnes</Text>
          <Text style={s.placeholderSub}>Naplánované tréninky se zobrazí zde</Text>
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
