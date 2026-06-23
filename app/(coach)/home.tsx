import { View, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/lib/theme';
import { StatTile } from '@/components/ui/StatTile';
import { ActionTile } from '@/components/ui/ActionTile';

const W = colors.warm;

export default function CoachHomeScreen() {
  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        <View style={s.statGrid}>
          <View style={s.row}>
            <StatTile label="Svěřenci"  value="0" sub="aktivních"    accent={W.rose}  />
            <StatTile label="Tréninky"  value="0" sub="tento týden"  accent={W.pink}  />
          </View>
          <View style={s.row}>
            <StatTile label="Hodiny"    value="0" sub="odpracováno"  accent={W.red}   />
            <StatTile label="Hodnocení" value="—" sub="průměr"       accent={W.amber} />
          </View>
        </View>

        <View style={s.actions}>
          <ActionTile label="Naplánovat trénink" description="Přidat tréninkovou jednotku" accent={W.rose}  badge="BRZY" />
          <ActionTile label="Moji svěřenci"      description="Přehled a pokrok"            accent={W.pink}  />
          <ActionTile label="Tréninkový plán"    description="Týdenní a měsíční rozvrh"    accent={W.red}   />
          <ActionTile label="Zprávy"             description="Komunikace se svěřenci"      accent={W.amber} badge="BRZY" />
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:     { flex: 1, backgroundColor: colors.bgAlt },
  scroll:   { flexGrow: 1 },
  statGrid: { backgroundColor: colors.bgAlt, padding: 4, gap: 4 },
  row:      { flexDirection: 'row', gap: 4 },
  actions:  { marginTop: 16 },
});
