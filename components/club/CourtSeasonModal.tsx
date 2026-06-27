import { useState, useEffect, useMemo } from 'react';
import {
  View, Text, Modal, ScrollView, TouchableOpacity, Switch, StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ClubSettings, CourtWithClub, CourtSeasonSettings, SeasonId } from '@/types/database';
import { colors } from '@/lib/theme';
import {
  SEASON_LABELS, defaultCourtSeasonSettings, formatSeasonProfileSummary,
  cloneCourtSeasonSettings,
} from '@/lib/clubSeason';
import { OpeningHoursModal } from '@/components/club/OpeningHoursModal';
import { CourtPricingModal } from '@/components/club/CourtPricingModal';

const W = colors.warm;

export function CourtSeasonModal({
  visible,
  court,
  settings,
  onClose,
  onSave,
}: {
  visible: boolean;
  court: CourtWithClub;
  settings: ClubSettings;
  onClose: () => void;
  onSave: (cfg: CourtSeasonSettings) => void;
}) {
  const [cfg, setCfg] = useState<CourtSeasonSettings>(() => defaultCourtSeasonSettings(settings));
  const [openingSeason, setOpeningSeason] = useState<SeasonId | null>(null);
  const [pricingSeason, setPricingSeason] = useState<SeasonId | null>(null);

  useEffect(() => {
    if (visible) {
      const existing = settings.courtSeasonSettings[court.id];
      setCfg(existing ? cloneCourtSeasonSettings(existing) : defaultCourtSeasonSettings(settings));
      setOpeningSeason(null);
      setPricingSeason(null);
    }
  }, [visible, court.id, settings]);

  const openingSettings = useMemo((): ClubSettings | null => {
    if (!openingSeason || !cfg.seasonPresets) return null;
    const profile = cfg.seasonPresets[openingSeason];
    return {
      ...settings,
      openingSchedule: profile.openingSchedule,
      holidayTreatment: profile.holidayTreatment,
      openingSlot: profile.openingSchedule.default.openingSlot,
      closingSlot: profile.openingSchedule.default.closingSlot,
    };
  }, [openingSeason, cfg, settings]);

  const pricingSettings = useMemo((): ClubSettings | null => {
    if (!pricingSeason || !cfg.seasonPresets) return null;
    const profile = cfg.seasonPresets[pricingSeason];
    return { ...settings, pricing: profile.pricing };
  }, [pricingSeason, cfg, settings]);

  function patch(partial: Partial<CourtSeasonSettings>) {
    setCfg(prev => ({ ...prev, ...partial }));
  }

  function saveProfileField(
    season: SeasonId,
    field: 'openingSchedule' | 'pricing' | 'holidayTreatment',
    value: unknown,
  ) {
    if (!cfg.seasonPresets) return;
    const presets = cfg.seasonPresets;
    const profile = presets[season];
    if (field === 'openingSchedule') {
      const schedule = value as typeof profile.openingSchedule;
      patch({
        seasonPresets: {
          ...presets,
          [season]: {
            ...profile,
            openingSchedule: schedule,
          },
        },
      });
    } else if (field === 'holidayTreatment') {
      patch({
        seasonPresets: {
          ...presets,
          [season]: { ...profile, holidayTreatment: value as typeof profile.holidayTreatment },
        },
      });
    } else {
      patch({
        seasonPresets: {
          ...presets,
          [season]: { ...profile, pricing: value as typeof profile.pricing },
        },
      });
    }
  }

  const statusLine = cfg.closedInSummer && cfg.closedInWinter
    ? 'Uzavřeno celoročně'
    : cfg.closedInSummer
      ? 'Uzavřeno v létě'
      : cfg.closedInWinter
        ? 'Uzavřeno v zimě'
        : cfg.useCustomProfiles
          ? 'Vlastní sezónní profily'
          : 'Dědí klubové nastavení';

  return (
    <>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <View style={s.overlay}>
          <View style={s.sheet}>
            <View style={s.handle} />
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={[s.bar, { backgroundColor: '#0EA5E9' }]} />
              <View style={s.body}>
                <Text style={s.title}>SEZÓNA — {court.name.toUpperCase()}</Text>
                <Text style={s.sub}>{statusLine}</Text>

                <View style={s.switchRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.switchTitle}>Uzavřeno v létě</Text>
                    <Text style={s.switchSub}>Kurt není k rezervaci v letní sezóně</Text>
                  </View>
                  <Switch
                    value={cfg.closedInSummer}
                    onValueChange={(v) => patch({ closedInSummer: v })}
                    trackColor={{ false: colors.border, true: '#F59E0B' }}
                    thumbColor="#fff"
                  />
                </View>

                <View style={s.switchRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.switchTitle}>Uzavřeno v zimě</Text>
                    <Text style={s.switchSub}>Kurt není k rezervaci v zimní sezóně</Text>
                  </View>
                  <Switch
                    value={cfg.closedInWinter}
                    onValueChange={(v) => patch({ closedInWinter: v })}
                    trackColor={{ false: colors.border, true: '#6366F1' }}
                    thumbColor="#fff"
                  />
                </View>

                <View style={s.switchRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.switchTitle}>Vlastní provoz a ceník</Text>
                    <Text style={s.switchSub}>
                      Oddělená provozní doba a ceny pro léto/zimu jen pro tento kurt
                    </Text>
                  </View>
                  <Switch
                    value={cfg.useCustomProfiles}
                    onValueChange={(v) => patch({
                      useCustomProfiles: v,
                      seasonPresets: v
                        ? (cfg.seasonPresets ?? defaultCourtSeasonSettings(settings).seasonPresets)
                        : cfg.seasonPresets,
                    })}
                    trackColor={{ false: colors.border, true: '#0EA5E9' }}
                    thumbColor="#fff"
                  />
                </View>

                {cfg.useCustomProfiles && cfg.seasonPresets && (
                  <View style={s.profileBlock}>
                    {(['summer', 'winter'] as SeasonId[]).map(season => (
                      <View key={season} style={s.profileCard}>
                        <View style={s.profileHeader}>
                          <Ionicons
                            name={season === 'summer' ? 'sunny' : 'snow'}
                            size={18}
                            color={season === 'summer' ? '#F59E0B' : '#6366F1'}
                          />
                          <Text style={s.profileTitle}>{SEASON_LABELS[season]}</Text>
                        </View>
                        <Text style={s.profileSummary}>
                          {formatSeasonProfileSummary(cfg.seasonPresets![season])}
                        </Text>
                        <View style={s.profileActions}>
                          <TouchableOpacity
                            style={s.profileBtn}
                            onPress={() => setOpeningSeason(season)}
                          >
                            <Ionicons name="time-outline" size={14} color={W.amber} />
                            <Text style={[s.profileBtnText, { color: W.amber }]}>Provoz</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={s.profileBtn}
                            onPress={() => setPricingSeason(season)}
                          >
                            <Ionicons name="pricetag-outline" size={14} color={W.orange} />
                            <Text style={s.profileBtnText}>Ceník</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </ScrollView>

            <View style={s.actions}>
              <TouchableOpacity style={s.cancelBtn} onPress={onClose}>
                <Text style={s.cancelText}>ZRUŠIT</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.saveBtn} onPress={() => onSave(cfg)}>
                <Text style={s.saveText}>ULOŽIT</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {openingSettings && openingSeason && (
        <OpeningHoursModal
          visible
          settings={openingSettings}
          onClose={() => setOpeningSeason(null)}
          onSave={(schedule, holidayTreatment) => {
            saveProfileField(openingSeason, 'openingSchedule', schedule);
            saveProfileField(openingSeason, 'holidayTreatment', holidayTreatment);
            setOpeningSeason(null);
          }}
        />
      )}

      {pricingSettings && pricingSeason && (
        <CourtPricingModal
          visible
          courts={[court]}
          settings={pricingSettings}
          initialCourtId={court.id}
          onClose={() => setPricingSeason(null)}
          onSave={(pricing) => {
            saveProfileField(pricingSeason, 'pricing', pricing);
            setPricingSeason(null);
          }}
        />
      )}
    </>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '92%', backgroundColor: colors.surface, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginTop: 8 },
  bar: { height: 4 },
  body: { padding: 16, gap: 4 },
  title: { fontSize: 16, fontWeight: '900', color: colors.textPrimary, letterSpacing: 1 },
  sub: { fontSize: 12, color: colors.textMuted, marginBottom: 12, lineHeight: 18 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  switchTitle: { fontSize: 13, fontWeight: '800', color: colors.textPrimary },
  switchSub: { fontSize: 11, color: colors.textMuted, marginTop: 2, lineHeight: 16 },
  profileBlock: { marginTop: 12, gap: 10 },
  profileCard: { padding: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bgAlt },
  profileHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  profileTitle: { fontSize: 13, fontWeight: '900', color: colors.textPrimary },
  profileSummary: { fontSize: 11, color: colors.textMuted, lineHeight: 16 },
  profileActions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  profileBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 10, borderWidth: 1, borderColor: colors.border },
  profileBtnText: { fontSize: 11, fontWeight: '800', color: W.orange },
  actions: { flexDirection: 'row', gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: colors.border },
  cancelBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  cancelText: { fontSize: 12, fontWeight: '800', color: colors.textMuted },
  saveBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', backgroundColor: '#0EA5E9' },
  saveText: { fontSize: 12, fontWeight: '900', color: '#fff', letterSpacing: 0.5 },
});
