import { useState, useEffect, useMemo } from 'react';
import {
  View, Text, Modal, ScrollView, TouchableOpacity,
  StyleSheet, TextInput, Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type {
  ClubSettings, PricingCategory, PricingDayScope, PricingSeasonScope,
  PricingSport, CourtWithClub,
} from '@/types/database';
import { colors } from '@/lib/theme';
import { SlotHoursStepper } from '@/components/club/SlotHoursStepper';
import { CATEGORY_COLORS } from '@/lib/mockData';
import { resolveCategoryColorHex } from '@/lib/clubCategories';
import {
  PRICING_SPORT_OPTIONS,
  PRICING_DAY_SCOPE_OPTIONS,
  PRICING_SEASON_OPTIONS,
  PRICING_WEEKDAY_LABELS,
  defaultCustomWeekdays,
  defaultPricingCategoryColor,
} from '@/lib/pricing';

const W = colors.warm;

function emptyCategory(settings: ClubSettings): PricingCategory {
  const def = settings.openingSchedule.default;
  return {
    id: `pc_${Date.now()}`,
    name: '',
    color: defaultPricingCategoryColor(settings.pricingCategories ?? []),
    sport: 'all',
    price_per_hour: 250,
    all_day: true,
    time_from_slot: def.openingSlot,
    time_to_slot: def.closingSlot,
    day_scope: 'weekdays',
    weekdays: defaultCustomWeekdays(),
    season_scope: 'year_round',
    court_ids: [],
    is_active: true,
    sort_order: (settings.pricingCategories?.length ?? 0) + 1,
  };
}

export function PricingCategoryModal({
  visible,
  category,
  settings,
  courts,
  onSave,
  onDelete,
  onClose,
}: {
  visible: boolean;
  category: PricingCategory | null;
  settings: ClubSettings;
  courts: CourtWithClub[];
  onSave: (category: PricingCategory) => void;
  onDelete?: (categoryId: string) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<PricingCategory>(() => emptyCategory(settings));

  useEffect(() => {
    if (visible) {
      setDraft(category
        ? {
          ...category,
          color: category.color
            ? resolveCategoryColorHex(category.color)
            : defaultPricingCategoryColor(settings.pricingCategories ?? []),
          court_ids: [...category.court_ids],
          weekdays: category.weekdays ? [...category.weekdays] : defaultCustomWeekdays(),
        }
        : emptyCategory(settings),
      );
    }
  }, [visible, category, settings]);

  const accent = resolveCategoryColorHex(draft.color);
  const timeHours = useMemo(() => ({
    openingSlot: draft.time_from_slot ?? settings.openingSchedule.default.openingSlot,
    closingSlot: draft.time_to_slot ?? settings.openingSchedule.default.closingSlot,
  }), [draft.time_from_slot, draft.time_to_slot, settings.openingSchedule.default]);

  const assignableCourts = useMemo(() => {
    if (draft.sport === 'all') return courts;
    return courts.filter(c => c.sport === draft.sport);
  }, [courts, draft.sport]);

  function patch(partial: Partial<PricingCategory>) {
    setDraft(prev => ({ ...prev, ...partial }));
  }

  function toggleCourt(courtId: string) {
    setDraft(prev => ({
      ...prev,
      court_ids: prev.court_ids.includes(courtId)
        ? prev.court_ids.filter(id => id !== courtId)
        : [...prev.court_ids, courtId],
    }));
  }

  function toggleWeekday(idx: number) {
    const days = [...(draft.weekdays ?? defaultCustomWeekdays())];
    while (days.length < 7) days.push(false);
    days[idx] = !days[idx];
    patch({ weekdays: days });
  }

  function handleSave() {
    const trimmed = draft.name.trim();
    if (!trimmed) return;
    onSave({ ...draft, name: trimmed });
    onClose();
  }

  function handleDelete() {
    if (category && onDelete) {
      onDelete(category.id);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.sheet}>
          <View style={s.handle} />
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={[s.bar, { backgroundColor: accent }]} />
            <View style={s.body}>
              <Text style={s.title}>
                {category ? 'UPRAVIT CENOVOU KATEGORII' : 'NOVÁ CENOVÁ KATEGORIE'}
              </Text>

              <Text style={s.label}>NÁZEV</Text>
              <TextInput
                style={s.textInput}
                value={draft.name}
                onChangeText={t => patch({ name: t })}
                placeholder="např. Víkendové dopoledne"
                placeholderTextColor={colors.textDisabled}
              />

              <Text style={s.label}>BARVA KATEGORIE</Text>
              <View style={s.colorRow}>
                {CATEGORY_COLORS.map(preset => {
                  const sel = resolveCategoryColorHex(draft.color) === preset.hex;
                  return (
                    <TouchableOpacity
                      key={preset.id}
                      onPress={() => patch({ color: preset.hex })}
                      style={[s.colorChip, { backgroundColor: preset.hex }, sel && s.colorChipSel]}
                      activeOpacity={0.8}
                      accessibilityLabel={preset.label}
                    >
                      {sel && <Ionicons name="checkmark" size={16} color="#fff" />}
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={s.label}>SPORT</Text>
              <View style={s.chipRow}>
                {PRICING_SPORT_OPTIONS.map(opt => {
                  const sel = draft.sport === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      onPress={() => patch({ sport: opt.value as PricingSport })}
                      style={[s.chip, sel && { backgroundColor: accent, borderColor: accent }]}
                    >
                      <Text style={[s.chipText, sel && { color: '#fff' }]}>{opt.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={s.label}>CENA (KČ/HOD)</Text>
              <TextInput
                style={s.priceInput}
                keyboardType="number-pad"
                value={String(draft.price_per_hour)}
                onChangeText={t => patch({
                  price_per_hour: Number(t.replace(/\D/g, '')) || 0,
                })}
              />

              <View style={s.switchRow}>
                <Text style={s.switchLabel}>Celý den</Text>
                <Switch
                  value={draft.all_day}
                  onValueChange={v => patch({ all_day: v })}
                  trackColor={{ true: accent }}
                  thumbColor="#fff"
                />
              </View>

              {!draft.all_day && (
                <>
                  <Text style={s.label}>ČASOVÉ ROZMEZÍ</Text>
                  <SlotHoursStepper
                    hours={timeHours}
                    onChange={h => patch({
                      time_from_slot: h.openingSlot,
                      time_to_slot: h.closingSlot,
                    })}
                    accent={accent}
                    openLabel="OD"
                    closeLabel="DO"
                  />
                </>
              )}

              <Text style={s.label}>DNY</Text>
              <View style={s.chipRow}>
                {PRICING_DAY_SCOPE_OPTIONS.map(opt => {
                  const sel = draft.day_scope === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      onPress={() => patch({
                        day_scope: opt.value as PricingDayScope,
                        weekdays: opt.value === 'custom'
                          ? (draft.weekdays ?? defaultCustomWeekdays())
                          : draft.weekdays,
                      })}
                      style={[s.chip, sel && { backgroundColor: accent, borderColor: accent }]}
                    >
                      <Text style={[s.chipText, sel && { color: '#fff' }]}>{opt.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {draft.day_scope === 'custom' && (
                <View style={s.weekdayRow}>
                  {PRICING_WEEKDAY_LABELS.map((label, idx) => {
                    const on = draft.weekdays?.[idx] ?? false;
                    return (
                      <TouchableOpacity
                        key={label}
                        onPress={() => toggleWeekday(idx)}
                        style={[s.weekdayChip, on && { backgroundColor: accent, borderColor: accent }]}
                      >
                        <Text style={[s.weekdayText, on && { color: '#fff' }]}>{label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {settings.seasonalModeEnabled ? (
                <>
                  <Text style={s.label}>SEZÓNA</Text>
                  <View style={s.chipRow}>
                    {PRICING_SEASON_OPTIONS.map(opt => {
                      const sel = draft.season_scope === opt.value;
                      return (
                        <TouchableOpacity
                          key={opt.value}
                          onPress={() => patch({ season_scope: opt.value as PricingSeasonScope })}
                          style={[s.chip, sel && { backgroundColor: accent, borderColor: accent }]}
                        >
                          <Text style={[s.chipText, sel && { color: '#fff' }]}>{opt.label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              ) : (
                <Text style={s.hint}>Sezóna: celoročně (sezónní režim je vypnutý)</Text>
              )}

              <View style={[s.switchRow, { marginTop: 12 }]}>
                <Text style={s.switchLabel}>Aktivní</Text>
                <Switch
                  value={draft.is_active}
                  onValueChange={v => patch({ is_active: v })}
                  trackColor={{ true: accent }}
                  thumbColor="#fff"
                />
              </View>

              <Text style={s.label}>KURTY</Text>
              {assignableCourts.length === 0 ? (
                <Text style={s.hint}>Žádné kurty pro zvolený sport.</Text>
              ) : (
                assignableCourts.map(court => {
                  const checked = draft.court_ids.includes(court.id);
                  return (
                    <TouchableOpacity
                      key={court.id}
                      onPress={() => toggleCourt(court.id)}
                      style={s.courtRow}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={checked ? 'checkbox' : 'square-outline'}
                        size={20}
                        color={checked ? accent : colors.textMuted}
                      />
                      <Text style={s.courtRowText}>{court.name}</Text>
                    </TouchableOpacity>
                  );
                })
              )}

              {category && onDelete && (
                <TouchableOpacity onPress={handleDelete} style={s.deleteBtn}>
                  <Ionicons name="trash-outline" size={16} color={W.red} />
                  <Text style={s.deleteText}>Smazat kategorii</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>

          <View style={s.footer}>
            <TouchableOpacity onPress={onClose} style={s.cancelBtn}>
              <Text style={s.cancelText}>ZRUŠIT</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSave}
              style={[s.saveBtn, { backgroundColor: accent }]}
              disabled={!draft.name.trim()}
            >
              <Text style={s.saveText}>ULOŽIT</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.surface, maxHeight: '92%' },
  handle: { width: 40, height: 4, backgroundColor: colors.border, alignSelf: 'center', marginTop: 8 },
  bar: { height: 4 },
  body: { padding: 20 },
  title: { fontSize: 16, fontWeight: '900', color: colors.textPrimary, letterSpacing: 1 },
  label: {
    fontSize: 9, fontWeight: '800', color: colors.textMuted,
    letterSpacing: 1, marginTop: 12, marginBottom: 6,
  },
  textInput: {
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bgAlt,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontWeight: '700',
    color: colors.textPrimary,
  },
  priceInput: {
    width: 100, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bgAlt,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, fontWeight: '900',
    color: colors.textPrimary, textAlign: 'center',
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bgAlt,
  },
  chipText: { fontSize: 11, fontWeight: '800', color: colors.textSecondary },
  colorRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 4,
  },
  colorChip: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'transparent',
  },
  colorChipSel: {
    borderColor: colors.textPrimary,
  },
  switchRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 12, paddingVertical: 8,
  },
  switchLabel: { fontSize: 13, fontWeight: '800', color: colors.textPrimary },
  weekdayRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  weekdayChip: {
    width: 36, height: 36, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bgAlt,
  },
  weekdayText: { fontSize: 11, fontWeight: '800', color: colors.textSecondary },
  courtRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  courtRowText: { fontSize: 13, fontWeight: '700', color: colors.textPrimary },
  hint: { fontSize: 11, color: colors.textMuted, fontStyle: 'italic', marginTop: 4 },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 20, paddingVertical: 12, justifyContent: 'center',
    borderWidth: 1, borderColor: W.red,
  },
  deleteText: { fontSize: 12, fontWeight: '800', color: W.red },
  footer: {
    flexDirection: 'row', gap: 10, padding: 16,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  cancelBtn: {
    flex: 1, paddingVertical: 14, alignItems: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  cancelText: { fontSize: 12, fontWeight: '800', color: colors.textMuted },
  saveBtn: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  saveText: { fontSize: 12, fontWeight: '900', color: '#fff', letterSpacing: 1 },
});
