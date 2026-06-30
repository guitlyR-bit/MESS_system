import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Club } from '@/types/database';
import { colors } from '@/lib/theme';
import {
  CLUB_PROFILE_COLOR_OPTIONS,
  resolveClubProfileTheme,
} from '@/lib/clubProfileTheme';

export function ClubProfileColorSection({
  profile,
  updateProfile,
}: {
  profile: Club;
  updateProfile: (updates: Partial<Club>) => void;
}) {
  const theme = resolveClubProfileTheme(profile);
  const selected = profile.profile_accent_color?.toUpperCase() ?? colors.club.accent.toUpperCase();

  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>BARVA PROFILU</Text>
      <Text style={s.sectionHint}>
        Akcentní barva ve veřejném profilu klubu — tlačítka, ikony a zvýraznění.
      </Text>

      <View style={s.previewRow}>
        <View style={[s.previewSwatch, { backgroundColor: theme.accent }]}>
          <Ionicons name="tennisball" size={22} color="#fff" />
        </View>
        <View style={[s.previewChip, { backgroundColor: theme.accentFade, borderColor: theme.accent }]}>
          <Text style={[s.previewChipText, { color: theme.accent }]}>Ukázka barvy</Text>
        </View>
      </View>

      <View style={s.grid}>
        {CLUB_PROFILE_COLOR_OPTIONS.map(option => {
          const active = selected === option.hex.toUpperCase();
          return (
            <TouchableOpacity
              key={option.hex}
              onPress={() => updateProfile({ profile_accent_color: option.hex })}
              style={[s.colorBtn, active && { borderColor: option.hex }]}
              activeOpacity={0.85}
            >
              <View style={[s.colorDot, { backgroundColor: option.hex }]}>
                {active ? <Ionicons name="checkmark" size={16} color="#fff" /> : null}
              </View>
              <Text style={[s.colorLabel, active && { color: colors.textPrimary }]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  section: {
    marginTop: 40,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
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
  sectionHint: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 18,
    marginBottom: 12,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  previewSwatch: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1.5,
  },
  previewChipText: { fontSize: 12, fontWeight: '900', letterSpacing: 0.3 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  colorBtn: {
    width: '31%',
    minWidth: 96,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.bgAlt,
  },
  colorDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  colorLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textMuted,
    textAlign: 'center',
  },
});
