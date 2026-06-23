import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/lib/theme';
import { StatTile } from '@/components/ui/StatTile';
import { ActionTile } from '@/components/ui/ActionTile';

const A = colors.coach.accent;
const AF = colors.coach.accentFade;

export default function CoachScheduleScreen() {
  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        <View style={s.row}>
          <StatTile label="Dnes" value="0"    sub="tréninků" accent={A} accentFade={AF} />
          <View style={s.divider} />
          <StatTile label="Tento týden" value="0" sub="tréninků" accent={A} accentFade={AF} />
        </View>

        <View style={s.sectionGap} />

        <ActionTile label="Přidat trénink"   description="Nová tréninková jednotka" accent={A} badge="BRZY" />
        <ActionTile label="Dnešní program"   description="Rozvrh na dnešek" accent={A} />
        <ActionTile label="Týdenní přehled"  description="Po–Ne, všichni svěřenci" accent={A} />
        <ActionTile label="Šablony tréninků" description="Uložené tréninkové plány" accent={A} badge="BRZY" />

        <View style={s.sectionGap} />

        <View style={s.placeholder}>
          <Text style={s.placeholderTitle}>Žádné tréninky dnes</Text>
          <Text style={s.placeholderSub}>Naplánované tréninky se zobrazí zde</Text>
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
