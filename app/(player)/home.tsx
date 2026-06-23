import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/lib/theme';
import { StatTile } from '@/components/ui/StatTile';
import { ActionTile } from '@/components/ui/ActionTile';

const A = colors.player.accent;
const AF = colors.player.accentFade;

export default function PlayerHomeScreen() {
  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Statistiky */}
        <View style={s.row}>
          <StatTile label="Rezervace" value="0" sub="tento týden" accent={A} accentFade={AF} />
          <View style={s.divider} />
          <StatTile label="Zápasy" value="0" sub="odehráno" accent={A} accentFade={AF} />
        </View>
        <View style={[s.row, s.rowBorderTop]}>
          <StatTile label="Turnaje" value="0" sub="přihlášeno" accent={A} accentFade={AF} />
          <View style={s.divider} />
          <StatTile label="Ranking" value="—" sub="ELO body" accent={A} accentFade={AF} />
        </View>

        <View style={s.sectionGap} />

        {/* Akce */}
        <ActionTile
          label="Rezervovat kurt"
          description="Dostupné termíny v okolí"
          accent={A}
          badge="NOVÁ"
        />
        <ActionTile
          label="Moje rezervace"
          description="Nadcházející i minulé"
          accent={A}
        />
        <ActionTile
          label="Výsledky zápasů"
          description="Historie a skóre"
          accent={A}
        />
        <ActionTile
          label="Turnaje"
          description="Přihlašování a výsledky"
          accent={A}
        />

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: colors.bg },
  scroll:     { flexGrow: 1 },
  row:        { flexDirection: 'row' },
  rowBorderTop: { borderTopWidth: 3, borderTopColor: '#111111' },
  divider:    { width: 3, backgroundColor: '#111111' },
  sectionGap: { height: 3, backgroundColor: '#111111' },
});
