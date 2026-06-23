import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/lib/theme';
import { StatTile } from '@/components/ui/StatTile';
import { ActionTile } from '@/components/ui/ActionTile';

const A = colors.club.accent;
const AF = colors.club.accentFade;

export default function ClubMembersScreen() {
  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        <View style={s.row}>
          <StatTile label="Aktivní" value="0"  sub="členů" accent={A} accentFade={AF} />
          <View style={s.divider} />
          <StatTile label="Čekající" value="0" sub="žádostí" accent={A} accentFade={AF} />
        </View>

        <View style={s.sectionGap} />

        <ActionTile label="Přidat člena"     description="Pozvat nebo zaregistrovat" accent={A} badge="BRZY" />
        <ActionTile label="Žádosti o členství" description="Schvalování přihlášek" accent={A} />
        <ActionTile label="Členské kategorie" description="Typy a poplatky" accent={A} badge="BRZY" />
        <ActionTile label="Export členů"      description="Přehled do CSV/PDF" accent={A} badge="BRZY" />

        <View style={s.sectionGap} />

        <View style={s.placeholder}>
          <Text style={s.placeholderTitle}>Žádní členové</Text>
          <Text style={s.placeholderSub}>Registrovaní členové se zobrazí zde</Text>
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
