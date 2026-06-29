import { View, Text, TextInput, StyleSheet } from 'react-native';
import type { Club } from '@/types/database';
import { colors } from '@/lib/theme';
import { ClubAmenityCheckRow } from '@/components/club/ClubAmenityCheckRow';
import { buildClubAmenitiesSummary } from '@/lib/clubAmenities';

const A = colors.club.accent;
const PROFILE_DESC_MAX = 280;

export function ClubProfileExtrasSection({
  profile,
  updateProfile,
}: {
  profile: Club;
  updateProfile: (updates: Partial<Club>) => void;
}) {
  const amenities = buildClubAmenitiesSummary(profile);
  const descLength = profile.description?.length ?? 0;

  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>POPIS PROFILU</Text>
      <Text style={s.sectionHint}>
        Krátký text, který hráči uvidí pod názvem klubu (max. {PROFILE_DESC_MAX} znaků).
      </Text>
      <TextInput
        style={s.textArea}
        value={profile.description ?? ''}
        onChangeText={(text) => updateProfile({
          description: text.slice(0, PROFILE_DESC_MAX),
        })}
        placeholder="Např. Tenisový klub s venkovními kurty a přátelskou atmosférou…"
        placeholderTextColor={colors.textDisabled}
        multiline
        textAlignVertical="top"
      />
      <Text style={s.charCount}>{descLength}/{PROFILE_DESC_MAX}</Text>

      <Text style={[s.sectionTitle, s.sectionTitleSpaced]}>PLATBA A PŘÍSTUP</Text>
      <ClubAmenityCheckRow
        label="Platba hotově"
        hint="Hráči mohou zaplatit na místě v hotovosti."
        checked={profile.accepts_cash ?? false}
        onToggle={(accepts_cash) => updateProfile({ accepts_cash })}
      />
      <ClubAmenityCheckRow
        label="Platba kartou"
        hint="Platba debetní nebo kreditní kartou."
        checked={profile.accepts_card ?? false}
        onToggle={(accepts_card) => updateProfile({ accepts_card })}
      />
      <ClubAmenityCheckRow
        label="Multisport karty"
        hint="Klub akceptuje benefity Multisport."
        checked={profile.accepts_multisport ?? false}
        onToggle={(accepts_multisport) => updateProfile({ accepts_multisport })}
      />
      <ClubAmenityCheckRow
        label="Psi v areálu"
        hint="Zda mohou návštěvníci přijít se psem."
        checked={profile.allows_dogs ?? false}
        onToggle={(allows_dogs) => updateProfile({ allows_dogs })}
      />

      <Text style={[s.sectionTitle, s.sectionTitleSpaced]}>JÍDLO A PITÍ</Text>
      <ClubAmenityCheckRow
        label="Pití a občerstvení"
        hint="V klubu je k dispozici pití nebo občerstvení."
        checked={profile.offers_food_drinks ?? false}
        onToggle={(offers_food_drinks) => updateProfile({
          offers_food_drinks,
          food_drinks_description: offers_food_drinks ? profile.food_drinks_description : null,
        })}
      />
      {profile.offers_food_drinks && (
        <View style={s.conditionalBlock}>
          <Text style={s.fieldLabel}>CO JE K DISPOZICI</Text>
          <TextInput
            style={s.textArea}
            value={profile.food_drinks_description ?? ''}
            onChangeText={(food_drinks_description) => updateProfile({ food_drinks_description })}
            placeholder="Např. Automat s pitím, káva v recepci, malý bufet s bagety…"
            placeholderTextColor={colors.textDisabled}
            multiline
            textAlignVertical="top"
          />
        </View>
      )}

      <Text style={[s.sectionTitle, s.sectionTitleSpaced]}>VYBAVENÍ A SLUŽBY</Text>
      <ClubAmenityCheckRow
        label="Zapůjčení vybavení"
        hint="Rakety, košíčky, pádla a podobné vybavení na půjčení."
        checked={profile.offers_equipment_rental ?? false}
        onToggle={(offers_equipment_rental) => updateProfile({
          offers_equipment_rental,
          equipment_rental_description: offers_equipment_rental
            ? profile.equipment_rental_description
            : null,
        })}
      />
      {profile.offers_equipment_rental && (
        <View style={s.conditionalBlock}>
          <Text style={s.fieldLabel}>CO LZE ZAPŮJČIT</Text>
          <TextInput
            style={s.textArea}
            value={profile.equipment_rental_description ?? ''}
            onChangeText={(equipment_rental_description) => updateProfile({ equipment_rental_description })}
            placeholder="Např. Tenisové rakety, košíčky, badmintonové rakety…"
            placeholderTextColor={colors.textDisabled}
            multiline
            textAlignVertical="top"
          />
        </View>
      )}
      <ClubAmenityCheckRow
        label="Prodej sportovního vybavení"
        hint="Možnost zakoupit vybavení pro daný sport na místě."
        checked={profile.sells_sport_equipment ?? false}
        onToggle={(sells_sport_equipment) => updateProfile({ sells_sport_equipment })}
      />
      <ClubAmenityCheckRow
        label="Prodej sportovního oblečení"
        hint="Možnost koupit oblečení v klubu nebo jeho prodejně."
        checked={profile.sells_clothing ?? false}
        onToggle={(sells_clothing) => updateProfile({ sells_clothing })}
      />
      <View style={s.conditionalBlock}>
        <Text style={s.fieldLabel}>DALŠÍ SLUŽBY (VOLITELNĚ)</Text>
        <TextInput
          style={s.textArea}
          value={profile.services_description ?? ''}
          onChangeText={(services_description) => updateProfile({ services_description })}
          placeholder="Např. Masáže, fyzioterapeut, trenérské služby…"
          placeholderTextColor={colors.textDisabled}
          multiline
          textAlignVertical="top"
        />
      </View>

      {amenities.hasAny && (
        <View style={s.generatedBox}>
          <Text style={s.generatedTitle}>VYGENEROVANÝ POPIS PRO HRÁČE</Text>
          {amenities.paymentLabel && (
            <Text style={s.generatedLine}>{amenities.paymentLabel}</Text>
          )}
          {amenities.dogsLabel && (
            <Text style={s.generatedLine}>{amenities.dogsLabel}</Text>
          )}
          {amenities.foodDrinksText && (
            <Text style={s.generatedLine}>{amenities.foodDrinksText}</Text>
          )}
          {amenities.rentalText && (
            <Text style={s.generatedLine}>{amenities.rentalText}</Text>
          )}
          {amenities.serviceLines.map(line => (
            <Text key={line} style={s.generatedLine}>{line}</Text>
          ))}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  section: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
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
    marginBottom: 4,
  },
  sectionTitleSpaced: { marginTop: 8 },
  sectionHint: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 18,
    marginBottom: 8,
  },
  textArea: {
    minHeight: 88,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.textPrimary,
    backgroundColor: colors.bgAlt,
    lineHeight: 22,
  },
  charCount: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    marginTop: 6,
    marginBottom: 4,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 1,
    marginBottom: 6,
  },
  conditionalBlock: { marginBottom: 8 },
  generatedBox: {
    marginTop: 16,
    padding: 12,
    backgroundColor: colors.club.accentFade,
    borderWidth: 1,
    borderColor: colors.border,
  },
  generatedTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: A,
    letterSpacing: 1,
    marginBottom: 8,
  },
  generatedLine: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
});
