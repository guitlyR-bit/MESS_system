import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/lib/theme';
import { StatTile } from '@/components/ui/StatTile';
import { ActionTile } from '@/components/ui/ActionTile';

const W = colors.warm;

export default function CoachPlayersScreen() {
  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        <View style={s.statGrid}>
          <View style={s.row}>
            <StatTile label="Aktivní" value="0" sub="svěřenců"   accent={W.rose} />
            <StatTile label="Celkem"  value="0" sub="v historii" accent={W.pink} />
          </View>
        </View>

        <View style={s.actions}>
          <ActionTile label="Přidat svěřence"   description="Pozvat hráče do skupiny"   accent={W.rose}  badge="BRZY" />
          <ActionTile label="Skupiny"           description="Tréninkové skupiny a úrovně" accent={W.pink} badge="BRZY" />
          <ActionTile label="Pokrok svěřenců"   description="Statistiky a hodnocení"    accent={W.red}   />
        </View>

        <View style={s.placeholder}>
          <Text style={s.placeholderTitle}>Žádní svěřenci</Text>
          <Text style={s.placeholderSub}>Přidaní svěřenci se zobrazí zde</Text>
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
