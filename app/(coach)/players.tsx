import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/lib/theme';
import { StatTile } from '@/components/ui/StatTile';
import { ActionTile } from '@/components/ui/ActionTile';

const A = colors.coach.accent;
const AF = colors.coach.accentFade;

export default function CoachPlayersScreen() {
  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        <View style={s.row}>
          <StatTile label="Aktivní" value="0"   sub="svěřenců" accent={A} accentFade={AF} />
          <View style={s.divider} />
          <StatTile label="Celkem"  value="0"   sub="v historii" accent={A} accentFade={AF} />
        </View>

        <View style={s.sectionGap} />

        <ActionTile label="Přidat svěřence"    description="Pozvat hráče do skupiny" accent={A} badge="BRZY" />
        <ActionTile label="Skupiny"            description="Tréninkové skupiny a úrovně" accent={A} badge="BRZY" />
        <ActionTile label="Pokrok svěřenců"    description="Statistiky a hodnocení" accent={A} />

        <View style={s.sectionGap} />

        <View style={s.placeholder}>
          <Text style={s.placeholderTitle}>Žádní svěřenci</Text>
          <Text style={s.placeholderSub}>Přidaní svěřenci se zobrazí zde</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: colors.bg },
  scroll:       { flexGrow: 1 },
  row:          { flexDirection: 'row' },
  divider:      { width: 3, backgroundColor: '#111111' },
  sectionGap:   { height: 3, backgroundColor: '#111111' },
  placeholder:  { backgroundColor: colors.surface, padding: 24, borderWidth: 1, borderColor: colors.border, margin: 16, gap: 6 },
  placeholderTitle: { fontSize: 16, fontWeight: '800', color: colors.textPrimary },
  placeholderSub:   { fontSize: 13, color: colors.textMuted },
});
