import { View, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/lib/theme';
import { StatTile } from '@/components/ui/StatTile';
import { ActionTile } from '@/components/ui/ActionTile';

const A = colors.club.accent;
const AF = colors.club.accentFade;

export default function ClubHomeScreen() {
  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        <View style={s.row}>
          <StatTile label="Sportoviště" value="0" sub="celkem" accent={A} accentFade={AF} />
          <View style={s.divider} />
          <StatTile label="Rezervace"   value="0" sub="dnes" accent={A} accentFade={AF} />
        </View>
        <View style={[s.row, s.rowBorderTop]}>
          <StatTile label="Členové"  value="0" sub="aktivních" accent={A} accentFade={AF} />
          <View style={s.divider} />
          <StatTile label="Příjmy"   value="—" sub="tento měsíc" accent={A} accentFade={AF} />
        </View>

        <View style={s.sectionGap} />

        <ActionTile label="Správa rezervací"   description="Přehled a schvalování" accent={A} />
        <ActionTile label="Sportoviště"        description="Kurty, hřiště, haly" accent={A} />
        <ActionTile label="Členové klubu"      description="Registrace a správa" accent={A} />
        <ActionTile label="Přehled příjmů"     description="Platby a faktury" accent={A} badge="BRZY" />

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
