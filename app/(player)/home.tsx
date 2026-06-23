import { View, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/lib/theme';
import { StatTile } from '@/components/ui/StatTile';
import { ActionTile } from '@/components/ui/ActionTile';

const W = colors.warm;

export default function PlayerHomeScreen() {
  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        <View style={s.statGrid}>
          <View style={s.row}>
            <StatTile label="Rezervace" value="0" sub="tento týden"  accent={W.orange} />
            <StatTile label="Zápasy"    value="0" sub="odehráno"     accent={W.amber}  />
          </View>
          <View style={s.row}>
            <StatTile label="Turnaje"   value="0" sub="přihlášeno"   accent={W.rose}   />
            <StatTile label="Ranking"   value="—" sub="ELO body"     accent={W.yellow} />
          </View>
        </View>

        <View style={s.actions}>
          <ActionTile label="Rezervovat kurt"   description="Dostupné termíny v okolí"  accent={W.orange} badge="NOVÁ" />
          <ActionTile label="Moje rezervace"    description="Nadcházející i minulé"      accent={W.amber}  />
          <ActionTile label="Výsledky zápasů"   description="Historie a skóre"           accent={W.rose}   />
          <ActionTile label="Turnaje"           description="Přihlašování a výsledky"    accent={W.yellow} />
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
