import { useState, useEffect, useMemo } from 'react';
import {
  View, Text, Modal, ScrollView, TouchableOpacity, StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ClubBooking, ClubSettings, DayHours, DayHoursPartialOverride } from '@/types/database';
import { colors } from '@/lib/theme';
import {
  formatDayHours, getScheduledDayHours, getDayHoursForDate, clampDayHours,
  buildPartialDayHoursOverride,
  getBookingConflictsForDayHoursChange,
  formatBookingConflictMessage,
  getBookingConflictsForClearingDayOverride,
} from '@/lib/clubSchedule';
import { fmtDateKey } from '@/lib/clubClosure';
import { SlotHoursStepper } from '@/components/club/SlotHoursStepper';
import { settingsWithCategorySchedule, getCategoryById } from '@/lib/clubCategories';

const W = colors.warm;

export function DayHoursOverrideModal({
  visible,
  dateKey,
  categoryId,
  settings,
  bookings,
  onSave,
  onClose,
}: {
  visible: boolean;
  dateKey: string;
  categoryId?: string;
  settings: ClubSettings;
  bookings?: ClubBooking[];
  onSave: (partial: DayHoursPartialOverride | null) => void;
  onClose: () => void;
}) {
  const scopedSettings = categoryId
    ? settingsWithCategorySchedule(settings, categoryId)
    : settings;

  const baseHours = useMemo(
    () => getScheduledDayHours(dateKey, scopedSettings),
    [dateKey, scopedSettings],
  );
  const currentEffective = useMemo(() => {
    if (categoryId) {
      const catPartial = settings.categoryDayOverrides?.[categoryId]?.[dateKey];
      return {
        openingSlot: catPartial?.openingSlot ?? baseHours.openingSlot,
        closingSlot: catPartial?.closingSlot ?? baseHours.closingSlot,
      };
    }
    return getDayHoursForDate(dateKey, settings);
  }, [dateKey, settings, categoryId, baseHours]);

  const [hours, setHours] = useState<DayHours>(currentEffective);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setHours(getDayHoursForDate(dateKey, settings));
      setSaveError(null);
    }
  }, [visible, dateKey, settings]);

  const hasChanges = buildPartialDayHoursOverride(baseHours, hours) !== null;
  const hasExisting = categoryId
    ? !!settings.categoryDayOverrides?.[categoryId]?.[dateKey]
    : !!settings.dayOverrides?.[dateKey];

  function handleSave() {
    setSaveError(null);
    const partial = buildPartialDayHoursOverride(baseHours, clampDayHours(hours));
    if (partial && bookings) {
      const conflicts = getBookingConflictsForDayHoursChange(
        dateKey, dateKey, partial, bookings, settings, { categoryId },
      );
      if (conflicts.length > 0) {
        setSaveError(formatBookingConflictMessage(conflicts));
        return;
      }
    }
    onSave(partial);
    onClose();
  }

  function handleReset() {
    setSaveError(null);
    if (bookings) {
      const conflicts = getBookingConflictsForClearingDayOverride(
        dateKey, bookings, settings, { categoryId },
      );
      if (conflicts.length > 0) {
        setSaveError(formatBookingConflictMessage(conflicts));
        return;
      }
    }
    setHours(baseHours);
    onSave(null);
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.sheet}>
          <View style={s.handle} />
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={[s.bar, { backgroundColor: W.orange }]} />
            <View style={s.body}>
              <Text style={s.title}>PROVOZNÍ DOBA DNE</Text>
              <Text style={s.sub}>
                {fmtDateKey(dateKey)}
                {categoryId
                  ? ` · kategorie „${getCategoryById(settings, categoryId)?.name}"`
                  : ' — úprava jen pro tento den'}
                {!categoryId && '. Nemusíte měnit otevření i zavření najednou.'}
              </Text>

              <View style={s.refBox}>
                <Ionicons name="time-outline" size={16} color={colors.textMuted} />
                <View style={{ flex: 1 }}>
                  <Text style={s.refLabel}>VÝCHOZÍ PRO TENTO DEN</Text>
                  <Text style={s.refValue}>{formatDayHours(baseHours)}</Text>
                </View>
              </View>

              <View style={s.section}>
                <Text style={s.sectionTitle}>ÚPRAVA PRO TENTO DEN</Text>
                <Text style={s.sectionSub}>{formatDayHours(hours)}</Text>
                <SlotHoursStepper
                  hours={hours}
                  onChange={setHours}
                  accent={W.orange}
                />
              </View>

              {(hasExisting || hasChanges) && (
                <TouchableOpacity onPress={handleReset} style={s.resetBtn} activeOpacity={0.7}>
                  <Ionicons name="refresh" size={16} color={colors.textMuted} />
                  <Text style={s.resetText}>Použít výchozí</Text>
                </TouchableOpacity>
              )}

              {saveError && (
                <View style={s.errorBox}>
                  <Ionicons name="alert-circle" size={16} color={W.red} />
                  <Text style={s.errorText}>{saveError}</Text>
                </View>
              )}
            </View>
          </ScrollView>

          <View style={s.footer}>
            <TouchableOpacity onPress={onClose} style={s.cancelBtn}>
              <Text style={s.cancelText}>ZRUŠIT</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSave} style={s.saveBtn}>
              <Text style={s.saveText}>ULOŽIT</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    maxHeight: '85%',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: 'hidden',
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginTop: 8,
  },
  bar: { height: 4 },
  body: { padding: 20, gap: 14 },
  title: {
    fontSize: 13, fontWeight: '900', color: colors.textPrimary, letterSpacing: 1.2,
  },
  sub: { fontSize: 12, color: colors.textMuted, lineHeight: 18 },
  refBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    backgroundColor: colors.bgAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  refLabel: {
    fontSize: 9, fontWeight: '800', color: colors.textMuted, letterSpacing: 1,
  },
  refValue: {
    fontSize: 15, fontWeight: '800', color: colors.textPrimary, marginTop: 2,
  },
  section: { gap: 6 },
  sectionTitle: {
    fontSize: 9, fontWeight: '800', color: colors.textMuted, letterSpacing: 1,
  },
  sectionSub: { fontSize: 12, color: colors.textSecondary, marginBottom: 4 },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  resetText: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 10,
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.25)',
  },
  errorText: { flex: 1, fontSize: 12, color: W.red, lineHeight: 18, fontWeight: '600' },
  footer: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  cancelBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 16,
    borderRightWidth: 1, borderRightColor: colors.border,
  },
  cancelText: { fontSize: 12, fontWeight: '800', color: colors.textMuted, letterSpacing: 1 },
  saveBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 16,
    backgroundColor: W.orange,
  },
  saveText: { fontSize: 12, fontWeight: '900', color: '#fff', letterSpacing: 1 },
});
