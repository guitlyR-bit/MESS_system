import { View, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/lib/theme';
import { StatTile } from '@/components/ui/StatTile';
import { ActionTile } from '@/components/ui/ActionTile';

const A = colors.coach.accent;
const AF = colors.coach.accentFade;

export default function CoachHomeScreen() {
  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        <View style={s.row}>
          <StatTile label="Svěřenci" value="0"  sub="aktivních" accent={A} accentFade={AF} />
          <View style={s.divider} />
          <StatTile label="Tréninky" value="0"  sub="tento týden" accent={A} accentFade={AF} />
        </View>
        <View style={[s.row, s.rowBorderTop]}>
          <StatTile label="Hodiny" value="0"    sub="odpracováno" accent={A} accentFade={AF} />
          <View style={s.divider} />
          <StatTile label="Hodnocení" value="—" sub="průměr" accent={A} accentFade={AF} />
        </View>

        <View style={s.sectionGap} />

        <ActionTile label="Naplánovat trénink"  description="Přidat tréninkovou jednotku" accent={A} badge="BRZY" />
        <ActionTile label="Moji svěřenci"       description="Přehled a pokrok" accent={A} />
        <ActionTile label="Tréninkový plán"     description="Týdenní a měsíční rozvrh" accent={A} />
        <ActionTile label="Zprávy"              description="Komunikace se svěřenci" accent={A} badge="BRZY" />

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
});
