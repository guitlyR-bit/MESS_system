import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/lib/theme';
import { useClubSettings } from '@/hooks/useClubSettings';
import { buildClubOpeningHoursProfile } from '@/lib/clubProfileHours';

const A = colors.club.accent;

export function ClubOpeningHoursSection() {
  const settings = useClubSettings();
  const hours = buildClubOpeningHoursProfile(settings);

  return (
    <View style={s.wrap}>
      <Text style={s.sectionTitle}>PROVOZNÍ DOBA</Text>
      <Text style={s.sectionHint}>
        Aktuální údaje z rezervačního systému (záložka Sportoviště → Nastavení).
      </Text>

      {hours.seasonLabel && (
        <View style={s.seasonBadge}>
          <Ionicons name="sunny-outline" size={14} color={A} />
          <Text style={s.seasonBadgeText}>Sezóna: {hours.seasonLabel}</Text>
        </View>
      )}

      {hours.holidayToday && (
        <Text style={s.holidayNote}>Státní svátek: {hours.holidayToday}</Text>
      )}

      {hours.hasExtraordinary && (
        <View style={s.extraordinaryBox}>
          <Text style={s.extraordinaryTitle}>MIMOŘÁDNÁ ZMĚNA OTEVÍRACÍ DOBY</Text>
          {hours.extraordinary.map(entry => (
            <View key={entry.id} style={s.extraordinaryRow}>
              <View style={s.extraordinaryIcon}>
                <Ionicons name="alert-circle" size={16} color={colors.warm.red} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.extraordinaryDate}>{entry.dateLabel}</Text>
                <Text style={s.extraordinaryHours}>{entry.hoursLabel}</Text>
                {entry.baselineLabel ? (
                  <Text style={s.extraordinaryBaseline}>{entry.baselineLabel}</Text>
                ) : null}
                {entry.detail ? (
                  <Text style={s.extraordinaryDetail}>{entry.detail}</Text>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      )}

      <Text style={s.openingLabel}>AKTUÁLNÍ PROVOZ</Text>
      <View style={s.todayRow}>
        <Text style={s.todayLabel}>{hours.todayLabel}</Text>
        <Text style={s.todayHours}>{hours.todayHoursLabel}</Text>
      </View>

      <Text style={[s.openingLabel, { marginTop: 14 }]}>ROZVRH PROVOZU</Text>
      {hours.scheduleLines.map(line => (
        <Text key={line} style={s.scheduleLine}>{line}</Text>
      ))}
      <Text style={s.scheduleLine}>Svátky: {hours.holidayTreatment}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: colors.textMuted,
    letterSpacing: 1.5,
  },
  sectionHint: {
    fontSize: 11,
    color: colors.textMuted,
    lineHeight: 16,
    marginTop: 4,
    marginBottom: 10,
  },
  seasonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.club.accentFade,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  seasonBadgeText: { fontSize: 11, fontWeight: '800', color: A },
  holidayNote: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B45309',
    marginBottom: 8,
  },
  extraordinaryBox: {
    marginBottom: 14,
    padding: 12,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  extraordinaryTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.warm.red,
    letterSpacing: 1,
    marginBottom: 10,
  },
  extraordinaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  extraordinaryIcon: { paddingTop: 2 },
  extraordinaryDate: { fontSize: 12, fontWeight: '800', color: colors.textPrimary },
  extraordinaryHours: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.warm.red,
    marginTop: 2,
  },
  extraordinaryBaseline: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  extraordinaryDetail: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 17,
  },
  openingLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 1,
    marginBottom: 6,
  },
  todayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: colors.bgAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  todayLabel: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, flex: 1 },
  todayHours: { fontSize: 15, fontWeight: '900', color: colors.textPrimary },
  scheduleLine: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 20,
    fontWeight: '600',
  },
});
