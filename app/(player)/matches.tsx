import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/lib/theme';
import { StatTile } from '@/components/ui/StatTile';
import { ActionTile } from '@/components/ui/ActionTile';

const W = colors.warm;

export default function PlayerMatchesScreen() {
  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        <View style={s.statGrid}>
          <View style={s.row}>
            <StatTile label="Výhry"   value="0"  sub="celkem"  accent={W.orange} />
            <StatTile label="Prohry"  value="0"  sub="celkem"  accent={W.rose}   />
          </View>
          <View style={s.row}>
            <StatTile label="Win rate" value="—" sub="%"        accent={W.amber}  />
            <StatTile label="ELO"      value="—" sub="body"     accent={W.yellow} />
          </View>
        </View>

        <View style={s.actions}>
          <ActionTile label="Zaznamenat zápas"  description="Přidat výsledek ručně"     accent={W.orange} badge="BRZY" />
          <ActionTile label="Historie zápasů"   description="Všechny odehrané zápasy"   accent={W.rose}   />
          <ActionTile label="Turnajové zápasy"  description="Výsledky z turnajů"        accent={W.amber}  />
        </View>

        <View style={s.placeholder}>
          <Text style={s.placeholderTitle}>Zatím žádné zápasy</Text>
          <Text style={s.placeholderSub}>Odehrané zápasy a statistiky se zobrazí zde</Text>
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
