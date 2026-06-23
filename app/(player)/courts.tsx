import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/lib/theme';
import { ActionTile } from '@/components/ui/ActionTile';
import { StatTile } from '@/components/ui/StatTile';

const A = colors.player.accent;
const AF = colors.player.accentFade;

export default function PlayerCourtsScreen() {
  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        <View style={s.row}>
          <StatTile label="Dostupné" value="0" sub="právě teď" accent={A} accentFade={AF} />
          <View style={s.divider} />
          <StatTile label="V okolí" value="0" sub="klubů" accent={A} accentFade={AF} />
        </View>

        <View style={s.sectionGap} />

        <ActionTile label="Hledat kurt" description="Podle místa, data a povrchu" accent={A} badge="BRZY" />
        <ActionTile label="Kurty v okolí" description="Mapa a geolokace" accent={A} badge="BRZY" />
        <ActionTile label="Oblíbené kurty" description="Uložené lokace" accent={A} badge="BRZY" />

        <View style={s.sectionGap} />

        <View style={s.placeholder}>
          <Text style={s.placeholderTitle}>Rezervace kurtů</Text>
          <Text style={s.placeholderSub}>Připravuje se · Filtry, dostupnost a online platba</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: colors.bg },
  scroll:      { flexGrow: 1 },
  row:         { flexDirection: 'row' },
  divider:     { width: 3, backgroundColor: '#111111' },
  sectionGap:  { height: 3, backgroundColor: '#111111' },
  placeholder: { backgroundColor: colors.surface, padding: 24, borderWidth: 1, borderColor: colors.border, margin: 16, gap: 6 },
  placeholderTitle: { fontSize: 16, fontWeight: '800', color: colors.textPrimary },
  placeholderSub:   { fontSize: 13, color: colors.textMuted },
});
