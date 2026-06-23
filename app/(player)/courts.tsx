import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/lib/theme';
import { StatTile } from '@/components/ui/StatTile';
import { ActionTile } from '@/components/ui/ActionTile';

const W = colors.warm;

export default function PlayerCourtsScreen() {
  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        <View style={s.statGrid}>
          <View style={s.row}>
            <StatTile label="Dostupné" value="0" sub="právě teď" accent={W.orange} />
            <StatTile label="V okolí"  value="0" sub="klubů"     accent={W.amber}  />
          </View>
        </View>

        <View style={s.actions}>
          <ActionTile label="Hledat kurt"     description="Podle místa, data a povrchu" accent={W.orange} badge="BRZY" />
          <ActionTile label="Kurty v okolí"   description="Mapa a geolokace"            accent={W.amber}  badge="BRZY" />
          <ActionTile label="Oblíbené kurty"  description="Uložené lokace"              accent={W.yellow} badge="BRZY" />
        </View>

        <View style={s.placeholder}>
          <Text style={s.placeholderTitle}>Rezervace kurtů</Text>
          <Text style={s.placeholderSub}>Připravuje se · Filtry, dostupnost a online platba</Text>
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
