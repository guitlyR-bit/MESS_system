import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/lib/theme';
import { StatTile } from '@/components/ui/StatTile';
import { ActionTile } from '@/components/ui/ActionTile';

const A = colors.player.accent;
const AF = colors.player.accentFade;

export default function PlayerMatchesScreen() {
  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        <View style={s.row}>
          <StatTile label="Výhry" value="0"  sub="celkem" accent={A} accentFade={AF} />
          <View style={s.divider} />
          <StatTile label="Prohry" value="0" sub="celkem" accent={A} accentFade={AF} />
        </View>
        <View style={[s.row, s.rowBorderTop]}>
          <StatTile label="Win rate" value="—" sub="%" accent={A} accentFade={AF} />
          <View style={s.divider} />
          <StatTile label="ELO" value="—" sub="body" accent={A} accentFade={AF} />
        </View>

        <View style={s.sectionGap} />

        <ActionTile label="Zaznamenat zápas" description="Přidat výsledek ručně" accent={A} badge="BRZY" />
        <ActionTile label="Historie zápasů"  description="Všechny odehrané zápasy" accent={A} />
        <ActionTile label="Turnajové zápasy" description="Výsledky z turnajů" accent={A} />

        <View style={s.sectionGap} />

        <View style={s.placeholder}>
          <Text style={s.placeholderTitle}>Zatím žádné zápasy</Text>
          <Text style={s.placeholderSub}>Odehrané zápasy a statistiky se zobrazí zde</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: colors.bg },
  scroll:       { flexGrow: 1 },
  row:          { flexDirection: 'row' },
  rowBorderTop: { borderTopWidth: 3, borderTopColor: '#111111' },
  divider:      { width: 3, backgroundColor: '#111111' },
  sectionGap:   { height: 3, backgroundColor: '#111111' },
  placeholder:  { backgroundColor: colors.surface, padding: 24, borderWidth: 1, borderColor: colors.border, margin: 16, gap: 6 },
  placeholderTitle: { fontSize: 16, fontWeight: '800', color: colors.textPrimary },
  placeholderSub:   { fontSize: 13, color: colors.textMuted },
});
