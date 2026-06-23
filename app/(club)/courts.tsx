import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/lib/theme';
import { StatTile } from '@/components/ui/StatTile';
import { ActionTile } from '@/components/ui/ActionTile';

const W = colors.warm;

export default function ClubCourtsScreen() {
  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        <View style={s.statGrid}>
          <View style={s.row}>
            <StatTile label="Celkem"    value="0" sub="sportovišť"  accent={W.yellow} />
            <StatTile label="Dostupné"  value="0" sub="právě teď"   accent={W.amber}  />
          </View>
        </View>

        <View style={s.actions}>
          <ActionTile label="Přidat sportoviště"  description="Nový kurt, hřiště nebo hala"  accent={W.yellow} badge="BRZY" />
          <ActionTile label="Správa rezervací"    description="Schvalování a blokování"      accent={W.amber}  />
          <ActionTile label="Ceník"               description="Sazby a slevy"                accent={W.orange} badge="BRZY" />
          <ActionTile label="Časový rozvrh"       description="Otevírací doby a výluky"      accent={W.rose}   badge="BRZY" />
        </View>

        <View style={s.placeholder}>
          <Text style={s.placeholderTitle}>Žádná sportoviště</Text>
          <Text style={s.placeholderSub}>Přidejte první sportoviště vašeho klubu</Text>
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
