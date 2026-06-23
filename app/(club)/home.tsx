import { View, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/lib/theme';
import { StatTile } from '@/components/ui/StatTile';
import { ActionTile } from '@/components/ui/ActionTile';

const W = colors.warm;

export default function ClubHomeScreen() {
  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        <View style={s.statGrid}>
          <View style={s.row}>
            <StatTile label="Sportoviště" value="0" sub="celkem"       accent={W.yellow} />
            <StatTile label="Rezervace"   value="0" sub="dnes"         accent={W.amber}  />
          </View>
          <View style={s.row}>
            <StatTile label="Členové"     value="0" sub="aktivních"    accent={W.orange} />
            <StatTile label="Příjmy"      value="—" sub="tento měsíc"  accent={W.rose}   />
          </View>
        </View>

        <View style={s.actions}>
          <ActionTile label="Správa rezervací"  description="Přehled a schvalování"  accent={W.yellow} />
          <ActionTile label="Sportoviště"       description="Kurty, hřiště, haly"    accent={W.amber}  />
          <ActionTile label="Členové klubu"     description="Registrace a správa"    accent={W.orange} />
          <ActionTile label="Přehled příjmů"   description="Platby a faktury"       accent={W.rose}   badge="BRZY" />
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
