import {
  View, Text, Image, ScrollView, TouchableOpacity, StyleSheet, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Club } from '@/types/database';
import type { ClubSettings } from '@/types/database';
import { colors } from '@/lib/theme';
import { buildClubProfilePreviewModel } from '@/lib/clubProfilePreview';
import { formatCoordinates } from '@/lib/clubMaps';
import { resolveClubProfileTheme } from '@/lib/clubProfileTheme';

import type { ComponentProps } from 'react';

function ContactRow({
  icon,
  label,
  value,
  onPress,
  accent,
}: {
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
  onPress?: () => void;
  accent: string;
}) {
  const content = (
    <View style={s.contactRow}>
      <Ionicons name={icon} size={18} color={accent} />
      <View style={{ flex: 1 }}>
        <Text style={s.contactLabel}>{label}</Text>
        <Text style={[s.contactValue, onPress && { color: accent }]}>{value}</Text>
      </View>
      {onPress && <Ionicons name="open-outline" size={16} color={colors.textMuted} />}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }
  return content;
}

function AmenityChip({
  icon,
  text,
  accent,
}: {
  icon: ComponentProps<typeof Ionicons>['name'];
  text: string;
  accent: string;
}) {
  return (
    <View style={s.chip}>
      <Ionicons name={icon} size={16} color={accent} />
      <Text style={s.chipText}>{text}</Text>
    </View>
  );
}

export function ClubProfilePreview({
  profile,
  settings,
}: {
  profile: Club;
  settings?: ClubSettings;
}) {
  const model = buildClubProfilePreviewModel(profile, settings);
  const { accent, accentFade } = resolveClubProfileTheme(profile);

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={s.previewBadge}>
        <Text style={s.previewBadgeText}>NÁHLED — JAK PROFIL VIDÍ HRÁČI</Text>
      </View>

      <View style={s.hero}>
        {profile.cover_image_url ? (
          <Image source={{ uri: profile.cover_image_url }} style={s.cover} resizeMode="cover" />
        ) : (
          <View style={s.coverPlaceholder}>
            <Ionicons name="image-outline" size={36} color={colors.textMuted} />
          </View>
        )}
        <View style={[s.logoWrap, { backgroundColor: accentFade }]}>
          {profile.logo_url ? (
            <Image source={{ uri: profile.logo_url }} style={s.logo} resizeMode="cover" />
          ) : (
            <View style={s.logoPlaceholder}>
              <Ionicons name="tennisball" size={28} color={accent} />
            </View>
          )}
        </View>
      </View>

      <View style={s.body}>
        <Text style={s.clubName}>{profile.name}</Text>
        {profile.description ? (
          <Text style={s.description}>{profile.description}</Text>
        ) : null}

        {model.amenities.hasAny && (
          <>
            <Text style={s.blockTitle}>PLATBA A VYBAVENÍ</Text>
            {model.amenities.paymentLabel && (
              <AmenityChip icon="card-outline" text={model.amenities.paymentLabel} accent={accent} />
            )}
            {model.amenities.multisportCoverageLabel && (
              <AmenityChip icon="fitness-outline" text={model.amenities.multisportCoverageLabel} accent={accent} />
            )}
            {model.amenities.benefitCardsLabel && (
              <AmenityChip icon="wallet-outline" text={model.amenities.benefitCardsLabel} accent={accent} />
            )}
            {model.amenities.dogsLabel && (
              <AmenityChip
                icon={profile.allows_dogs ? 'paw-outline' : 'paw'}
                text={model.amenities.dogsLabel}
                accent={accent}
              />
            )}
            {model.amenities.foodDrinksText && (
              <View style={s.infoBlock}>
                <View style={s.infoBlockHeader}>
                  <Ionicons name="cafe-outline" size={18} color={accent} />
                  <Text style={s.infoBlockTitle}>Jídlo a pití</Text>
                </View>
                <Text style={s.infoBlockText}>{model.amenities.foodDrinksText}</Text>
              </View>
            )}
            {model.amenities.rentalText && (
              <View style={s.infoBlock}>
                <View style={s.infoBlockHeader}>
                  <Ionicons name="tennisball-outline" size={18} color={accent} />
                  <Text style={s.infoBlockTitle}>Zapůjčení vybavení</Text>
                </View>
                <Text style={s.infoBlockText}>{model.amenities.rentalText}</Text>
              </View>
            )}
            {model.amenities.serviceLines.length > 0 && (
              <View style={s.infoBlock}>
                <View style={s.infoBlockHeader}>
                  <Ionicons name="storefront-outline" size={18} color={accent} />
                  <Text style={s.infoBlockTitle}>Další služby</Text>
                </View>
                {model.amenities.serviceLines.map(line => (
                  <Text key={line} style={s.infoBlockText}>{line}</Text>
                ))}
              </View>
            )}
          </>
        )}

        {model.pricing?.hasPricing && (
          <>
            <Text style={s.blockTitle}>CENÍK</Text>
            {model.pricing.seasonLabel && (
              <Text style={s.hoursMeta}>Sezóna: {model.pricing.seasonLabel}</Text>
            )}
            {model.pricing.priceRangeLabel && (
              <View style={s.priceRangeBox}>
                <Text style={s.priceRangeLabel}>Rozsah cen</Text>
                <Text style={s.priceRangeValue}>{model.pricing.priceRangeLabel}</Text>
              </View>
            )}
            {model.pricing.lines.map(line => (
              <View
                key={line.id}
                style={[s.priceRow, !line.isEffective && s.priceRowDimmed]}
              >
                <View style={[s.priceColorBar, { backgroundColor: line.color }]} />
                <View style={s.priceContent}>
                  <View style={s.priceTitleRow}>
                    <Text style={s.priceName}>{line.name}</Text>
                    <Text style={[s.priceAmount, { color: accent }]}>{line.priceLabel}</Text>
                  </View>
                  <Text style={s.priceMeta}>{line.summary}</Text>
                </View>
              </View>
            ))}
          </>
        )}

        <View style={s.addressCard}>
          <Ionicons name="location-outline" size={18} color={accent} />
          <Text style={s.addressText}>{model.addressLine}</Text>
        </View>

        <TouchableOpacity
          style={[s.mapsBtn, { backgroundColor: accent }]}
          onPress={() => Linking.openURL(model.mapsUrl)}
          activeOpacity={0.85}
        >
          <Ionicons name="map" size={18} color="#fff" />
          <Text style={s.mapsBtnText}>Otevřít v Google Maps</Text>
        </TouchableOpacity>
        <Text style={s.coordsHint}>
          Souřadnice: {formatCoordinates(profile.latitude, profile.longitude)}
        </Text>

        <Text style={s.blockTitle}>KONTAKT</Text>
        {profile.manager_name ? (
          <ContactRow
            icon="person-outline"
            label="Odpovědný vedoucí"
            value={profile.manager_name}
            accent={accent}
          />
        ) : null}
        {profile.phone ? (
          <ContactRow icon="call-outline" label="Telefon" value={profile.phone} accent={accent} />
        ) : null}
        {profile.email ? (
          <ContactRow
            icon="mail-outline"
            label="E-mail"
            value={profile.email}
            onPress={() => Linking.openURL(`mailto:${profile.email}`)}
            accent={accent}
          />
        ) : null}
        {model.websiteUrl ? (
          <ContactRow
            icon="globe-outline"
            label="Web"
            value={profile.website ?? model.websiteUrl}
            onPress={() => Linking.openURL(model.websiteUrl!)}
            accent={accent}
          />
        ) : null}
        {profile.instagram ? (
          <ContactRow
            icon="logo-instagram"
            label="Instagram"
            value={`@${profile.instagram.replace(/^@/, '')}`}
            onPress={() => model.instagramUrl && Linking.openURL(model.instagramUrl)}
            accent={accent}
          />
        ) : null}

        {model.hours && (
          <>
            <Text style={s.blockTitle}>PROVOZNÍ DOBA</Text>
            {model.hours.seasonLabel && (
              <Text style={s.hoursMeta}>Sezóna: {model.hours.seasonLabel}</Text>
            )}
            {model.hours.hasExtraordinary && (
              <View style={s.extraordinaryBox}>
                <Text style={s.extraordinaryTitle}>Mimořádná změna otevírací doby</Text>
                {model.hours.extraordinary.map(entry => (
                  <View key={entry.id} style={s.extraordinaryRow}>
                    <Text style={s.extraordinaryDate}>{entry.dateLabel}</Text>
                    <Text style={s.extraordinaryHours}>{entry.hoursLabel}</Text>
                    {entry.baselineLabel ? (
                      <Text style={s.extraordinaryBaseline}>{entry.baselineLabel}</Text>
                    ) : null}
                  </View>
                ))}
              </View>
            )}
            <View style={s.todayBox}>
              <Text style={s.todayLabel}>{model.hours.todayLabel}</Text>
              <Text style={s.todayHours}>{model.hours.todayHoursLabel}</Text>
            </View>
            {model.hours.scheduleLines.map(line => (
              <Text key={line} style={s.scheduleLine}>{line}</Text>
            ))}
            <Text style={s.scheduleLine}>Svátky: {model.hours.holidayTreatment}</Text>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bgAlt },
  scrollContent: { paddingBottom: 24 },
  previewBadge: {
    backgroundColor: '#111',
    paddingVertical: 8,
    alignItems: 'center',
  },
  previewBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 1.2,
  },
  hero: { height: 180, backgroundColor: colors.surface, position: 'relative' },
  cover: { width: '100%', height: '100%' },
  coverPlaceholder: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.bgAlt,
  },
  logoWrap: {
    position: 'absolute', left: 16, bottom: -32,
    width: 72, height: 72, borderRadius: 36,
    borderWidth: 3, borderColor: colors.surface,
    overflow: 'hidden',
  },
  logo: { width: '100%', height: '100%' },
  logoPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: 16, paddingTop: 44 },
  clubName: { fontSize: 22, fontWeight: '900', color: colors.textPrimary },
  description: {
    fontSize: 13, color: colors.textSecondary, lineHeight: 20, marginTop: 8,
  },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 8, paddingHorizontal: 10,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    marginBottom: 6,
  },
  chipText: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.textSecondary, lineHeight: 18 },
  infoBlock: {
    marginBottom: 8, padding: 12,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
  },
  infoBlockHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  infoBlockTitle: { fontSize: 12, fontWeight: '900', color: colors.textPrimary, letterSpacing: 0.5 },
  infoBlockText: { fontSize: 13, color: colors.textSecondary, lineHeight: 20, fontWeight: '600' },
  addressCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    marginTop: 16, padding: 12,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
  },
  addressText: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.textPrimary, lineHeight: 20 },
  priceRangeBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  priceRangeLabel: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
  priceRangeValue: { fontSize: 15, fontWeight: '900', color: colors.textPrimary },
  priceRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 6,
    backgroundColor: colors.surface,
  },
  priceRowDimmed: { opacity: 0.55 },
  priceColorBar: { width: 4, alignSelf: 'stretch', minHeight: 48 },
  priceContent: { flex: 1, padding: 10 },
  priceTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  priceName: { flex: 1, fontSize: 13, fontWeight: '800', color: colors.textPrimary },
  priceAmount: { fontSize: 13, fontWeight: '900' },
  priceMeta: { fontSize: 11, color: colors.textMuted, marginTop: 4, lineHeight: 16, fontWeight: '600' },
  mapsBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: 12, paddingVertical: 12,
  },
  mapsBtnText: { fontSize: 13, fontWeight: '900', color: '#fff', letterSpacing: 0.5 },
  coordsHint: {
    fontSize: 11, color: colors.textMuted, marginTop: 8, textAlign: 'center',
  },
  blockTitle: {
    fontSize: 11, fontWeight: '900', color: colors.textMuted,
    letterSpacing: 1.2, marginTop: 20, marginBottom: 8,
  },
  contactRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  contactLabel: { fontSize: 10, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.8 },
  contactValue: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, marginTop: 2 },
  hoursMeta: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, marginBottom: 8 },
  extraordinaryBox: {
    padding: 10, marginBottom: 10,
    backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA',
  },
  extraordinaryTitle: {
    fontSize: 10, fontWeight: '900', color: colors.warm.red, letterSpacing: 0.8, marginBottom: 6,
  },
  extraordinaryRow: { marginTop: 6 },
  extraordinaryDate: { fontSize: 12, fontWeight: '800', color: colors.textPrimary },
  extraordinaryHours: { fontSize: 13, fontWeight: '900', color: colors.warm.red },
  extraordinaryBaseline: { fontSize: 11, color: colors.textMuted },
  todayBox: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 12, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border, marginBottom: 8,
  },
  todayLabel: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
  todayHours: { fontSize: 15, fontWeight: '900', color: colors.textPrimary },
  scheduleLine: { fontSize: 12, color: colors.textSecondary, lineHeight: 20, fontWeight: '600' },
});
