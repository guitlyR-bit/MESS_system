import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/lib/theme';
import { useClubSettings } from '@/hooks/useClubSettings';
import { useClubProfile } from '@/hooks/useClubProfile';
import { buildClubPricingProfile } from '@/lib/clubProfilePricing';
import { resolveClubProfileTheme } from '@/lib/clubProfileTheme';

export function ClubProfilePricingSection() {
  const settings = useClubSettings();
  const { profile } = useClubProfile();
  const pricing = buildClubPricingProfile(settings);
  const { accent } = resolveClubProfileTheme(profile);

  return (
    <View style={s.wrap}>
      <Text style={s.sectionTitle}>CENÍK</Text>
      <Text style={s.sectionHint}>
        Aktuální ceník z rezervačního systému (záložka Sportoviště → Nastavení → Ceník).
      </Text>

      {pricing.seasonLabel && (
        <View style={[s.seasonBadge, { backgroundColor: resolveClubProfileTheme(profile).accentFade }]}>
          <Ionicons name="pricetag-outline" size={14} color={accent} />
          <Text style={[s.seasonBadgeText, { color: accent }]}>
            Sezóna: {pricing.seasonLabel}
          </Text>
        </View>
      )}

      {pricing.priceRangeLabel && (
        <View style={s.rangeRow}>
          <Text style={s.rangeLabel}>Aktuální rozsah cen</Text>
          <Text style={s.rangeValue}>{pricing.priceRangeLabel}</Text>
        </View>
      )}

      {!pricing.hasPricing && (
        <Text style={s.emptyText}>Ceník zatím není nastaven.</Text>
      )}

      {pricing.lines.map(line => (
        <View
          key={line.id}
          style={[s.priceRow, !line.isEffective && s.priceRowDimmed]}
        >
          <View style={[s.colorBar, { backgroundColor: line.color }]} />
          <View style={s.priceContent}>
            <View style={s.priceTitleRow}>
              <Text style={s.priceName}>{line.name}</Text>
              <Text style={[s.priceAmount, { color: accent }]}>{line.priceLabel}</Text>
            </View>
            <Text style={s.priceMeta}>{line.summary}</Text>
            {!line.isEffective && (
              <Text style={s.inactiveNote}>Mimo aktuální sezónu nebo období</Text>
            )}
          </View>
        </View>
      ))}
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
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
  },
  seasonBadgeText: { fontSize: 11, fontWeight: '800' },
  rangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: colors.bgAlt,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
  },
  rangeLabel: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
  rangeValue: { fontSize: 15, fontWeight: '900', color: colors.textPrimary },
  emptyText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  priceRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
    backgroundColor: colors.bgAlt,
  },
  priceRowDimmed: { opacity: 0.55 },
  colorBar: { width: 4, alignSelf: 'stretch', minHeight: 52 },
  priceContent: { flex: 1, padding: 10 },
  priceTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  priceName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  priceAmount: { fontSize: 13, fontWeight: '900' },
  priceMeta: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
    lineHeight: 16,
    fontWeight: '600',
  },
  inactiveNote: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.warm.amber,
    marginTop: 4,
  },
});
