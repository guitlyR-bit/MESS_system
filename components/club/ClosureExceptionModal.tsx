import { useState, useEffect, useMemo } from 'react';
import {
  View, Text, Modal, ScrollView, TouchableOpacity, TouchableWithoutFeedback,
  TextInput, StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ClubBooking, ClubClosurePeriod, ClubSettings, DayHours, DayHoursPartialOverride } from '@/types/database';
import { colors } from '@/lib/theme';
import { localDateKey } from '@/lib/mockData';
import {
  buildPartialDayHoursOverride,
  clampDayHours,
  enumerateDateKeys,
  formatDayHours,
  formatBookingConflictMessage,
  getBookingConflictsForClosurePeriod,
  getBookingConflictsForDayHoursChange,
  getDayHoursForDate,
  getScheduledDayHours,
} from '@/lib/clubSchedule';
import { fmtDateKey } from '@/lib/clubClosure';
import { SlotHoursStepper } from '@/components/club/SlotHoursStepper';
import { getCategoryById, settingsWithCategorySchedule } from '@/lib/clubCategories';
import { getDayHoursForCourt } from '@/lib/clubSchedule';

const W = colors.warm;

const MONTH_NAMES = [
  'Leden', 'Únor', 'Březen', 'Duben', 'Květen', 'Červen',
  'Červenec', 'Srpen', 'Září', 'Říjen', 'Listopad', 'Prosinec',
];
const DAY_ABBR = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];

type ActionType = 'closure' | 'hours';
type CourtClosureMode = 'full' | 'partial';
type ScopeType = 'club' | string;

function getMonday(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return d;
}

export function ClosureExceptionModal({
  visible,
  settings,
  bookings,
  onClose,
  onAddClosure,
  onApplyDayOverrides,
  onApplyCategoryDayOverrides,
  fixedCourtId,
  fixedCourtName,
}: {
  visible: boolean;
  settings: ClubSettings;
  bookings: ClubBooking[];
  onClose: () => void;
  onAddClosure: (period: Omit<ClubClosurePeriod, 'id'>) => void;
  onApplyDayOverrides: (entries: Record<string, DayHoursPartialOverride | null>) => void;
  onApplyCategoryDayOverrides?: (
    categoryId: string,
    entries: Record<string, DayHoursPartialOverride | null>,
  ) => void;
  fixedCourtId?: string;
  fixedCourtName?: string;
}) {
  const [actionType, setActionType] = useState<ActionType>('closure');
  const [scope, setScope] = useState<ScopeType>('club');
  const [dispMonth, setDispMonth] = useState(0);
  const [dispYear, setDispYear] = useState(() => new Date().getFullYear());
  const [draftFrom, setDraftFrom] = useState<string | null>(null);
  const [draftTo, setDraftTo] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [hours, setHours] = useState<DayHours>(() => ({
    openingSlot: settings.openingSlot,
    closingSlot: settings.closingSlot,
  }));
  const [courtClosureMode, setCourtClosureMode] = useState<CourtClosureMode>('full');
  const [closedRange, setClosedRange] = useState<DayHours>(() => ({
    openingSlot: settings.openingSlot + 4,
    closingSlot: settings.openingSlot + 8,
  }));
  const [saveError, setSaveError] = useState<string | null>(null);

  const courtOnly = !!fixedCourtId;

  useEffect(() => {
    if (!visible) return;
    const now = new Date();
    setDispMonth(now.getMonth());
    setDispYear(now.getFullYear());
    setDraftFrom(null);
    setDraftTo(null);
    setNote('');
    setActionType('closure');
    setCourtClosureMode('full');
    setScope(fixedCourtId ?? 'club');
    setSaveError(null);
    setHours({
      openingSlot: settings.openingSlot,
      closingSlot: settings.closingSlot,
    });
    setClosedRange({
      openingSlot: settings.openingSlot + 4,
      closingSlot: settings.openingSlot + 8,
    });
  }, [visible, settings.openingSlot, settings.closingSlot, fixedCourtId]);

  const bounds = useMemo(() => {
    if (!draftFrom) return null;
    const to = draftTo ?? draftFrom;
    return draftFrom <= to
      ? { from: draftFrom, to }
      : { from: to, to: draftFrom };
  }, [draftFrom, draftTo]);

  const categoryId = courtOnly ? undefined : (scope === 'club' ? undefined : scope);
  const courtId = courtOnly ? fixedCourtId : undefined;
  const scopedSettings = categoryId
    ? settingsWithCategorySchedule(settings, categoryId)
    : settings;

  const referenceDateKey = bounds?.from ?? null;
  const baseHours = useMemo(
    () => (referenceDateKey ? getScheduledDayHours(referenceDateKey, scopedSettings) : null),
    [referenceDateKey, scopedSettings],
  );

  useEffect(() => {
    if (!referenceDateKey) return;
    if (categoryId) {
      const catPartial = settings.categoryDayOverrides?.[categoryId]?.[referenceDateKey];
      const scheduled = getScheduledDayHours(referenceDateKey, scopedSettings);
      setHours({
        openingSlot: catPartial?.openingSlot ?? scheduled.openingSlot,
        closingSlot: catPartial?.closingSlot ?? scheduled.closingSlot,
      });
    } else {
      setHours(getDayHoursForDate(referenceDateKey, settings));
    }
    if (courtOnly && fixedCourtId) {
      const dayHours = getDayHoursForCourt(fixedCourtId, referenceDateKey, settings);
      const mid = Math.min(
        dayHours.closingSlot,
        dayHours.openingSlot + Math.floor((dayHours.closingSlot - dayHours.openingSlot) / 2),
      );
      setClosedRange(clampDayHours({
        openingSlot: dayHours.openingSlot + 2,
        closingSlot: Math.max(dayHours.openingSlot + 3, mid),
      }));
    }
    setSaveError(null);
  }, [referenceDateKey, settings, categoryId, scopedSettings, courtOnly, fixedCourtId]);

  const rows = useMemo(() => {
    const first = new Date(dispYear, dispMonth, 1);
    const start = getMonday(first);
    const all = Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d;
    });
    const result: Date[][] = [];
    for (let i = 0; i < 42; i += 7) result.push(all.slice(i, i + 7));
    return result;
  }, [dispYear, dispMonth]);

  function isInRange(key: string): boolean {
    if (!bounds) return false;
    return key >= bounds.from && key <= bounds.to;
  }

  function handleDayPress(date: Date) {
    const key = localDateKey(date);
    setSaveError(null);
    if (!draftFrom || draftTo) {
      setDraftFrom(key);
      setDraftTo(null);
    } else if (key < draftFrom) {
      setDraftTo(draftFrom);
      setDraftFrom(key);
    } else {
      setDraftTo(key);
    }
  }

  function handleSave() {
    if (!bounds) return;
    setSaveError(null);

    if (actionType === 'closure') {
      const partial = courtOnly && courtClosureMode === 'partial';
      const range = partial ? clampDayHours(closedRange) : undefined;
      const conflicts = getBookingConflictsForClosurePeriod(
        bounds.from, bounds.to, bookings, settings,
        courtId
          ? {
            courtId,
            ...(range ? { closedFromSlot: range.openingSlot, closedToSlot: range.closingSlot } : {}),
          }
          : categoryId ? { categoryId } : undefined,
      );
      if (conflicts.length > 0) {
        setSaveError(formatBookingConflictMessage(conflicts));
        return;
      }
      onAddClosure({
        fromDate: bounds.from,
        toDate: bounds.to,
        note: note.trim() || undefined,
        ...(courtId ? { courtId } : categoryId ? { categoryId } : {}),
        ...(range ? { closedFromSlot: range.openingSlot, closedToSlot: range.closingSlot } : {}),
      });
      onClose();
      return;
    }

    if (!baseHours) return;
    const partial = buildPartialDayHoursOverride(baseHours, clampDayHours(hours));
    if (!partial) {
      setSaveError('Zvolte jinou otevírací nebo zavírací dobu než výchozí rozvrh.');
      return;
    }

    const dateKeys = enumerateDateKeys(bounds.from, bounds.to);
    const perDayPartials: Record<string, DayHoursPartialOverride> = {};
    for (const dateKey of dateKeys) {
      const dayBase = getScheduledDayHours(dateKey, scopedSettings);
      const dayPartial = buildPartialDayHoursOverride(dayBase, clampDayHours(hours));
      if (dayPartial) perDayPartials[dateKey] = dayPartial;
    }

    if (Object.keys(perDayPartials).length === 0) {
      setSaveError('Ve zvoleném období není co měnit — provozní doba odpovídá výchozímu rozvrhu.');
      return;
    }

    const allConflicts = new Map<string, ClubBooking>();
    for (const dateKey of dateKeys) {
      const dayPartial = perDayPartials[dateKey];
      if (!dayPartial) continue;
      for (const b of getBookingConflictsForDayHoursChange(
        dateKey, dateKey, dayPartial, bookings, settings, { categoryId },
      )) {
        allConflicts.set(b.id, b);
      }
    }
    if (allConflicts.size > 0) {
      setSaveError(formatBookingConflictMessage([...allConflicts.values()]));
      return;
    }

    const entries: Record<string, DayHoursPartialOverride | null> = {};
    for (const dateKey of dateKeys) {
      entries[dateKey] = perDayPartials[dateKey] ?? null;
    }
    if (categoryId && onApplyCategoryDayOverrides) {
      onApplyCategoryDayOverrides(categoryId, entries);
    } else {
      onApplyDayOverrides(entries);
    }
    onClose();
  }

  const goPrev = () => {
    if (dispMonth === 0) { setDispMonth(11); setDispYear(y => y - 1); }
    else setDispMonth(m => m - 1);
  };
  const goNext = () => {
    if (dispMonth === 11) { setDispMonth(0); setDispYear(y => y + 1); }
    else setDispMonth(m => m + 1);
  };

  const saveLabel = actionType === 'closure' ? 'PŘIDAT UZAVŘENÍ' : 'ULOŽIT VÝJIMKU';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={st.overlay}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={st.sheet}>
              <View style={st.topBar} />
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View style={st.header}>
                  <TouchableOpacity onPress={goPrev} style={st.navBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="chevron-back" size={20} color={W.orange} />
                  </TouchableOpacity>
                  <Text style={st.monthLabel}>
                    {MONTH_NAMES[dispMonth]} {dispYear}
                  </Text>
                  <TouchableOpacity onPress={goNext} style={st.navBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="chevron-forward" size={20} color={W.orange} />
                  </TouchableOpacity>
                </View>

                <View style={st.body}>
                  {!courtOnly && (
                    <>
                      <Text style={st.typeLabel}>TYP AKCE</Text>
                      <View style={st.typeRow}>
                        <TouchableOpacity
                          onPress={() => { setActionType('closure'); setSaveError(null); }}
                          style={[st.typeChip, actionType === 'closure' && st.typeChipActive]}
                          activeOpacity={0.8}
                        >
                          <Ionicons
                            name="lock-closed-outline"
                            size={14}
                            color={actionType === 'closure' ? '#fff' : W.red}
                          />
                          <Text style={[st.typeChipText, actionType === 'closure' && st.typeChipTextActive]}>
                            Kompletně uzavřeno
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => { setActionType('hours'); setSaveError(null); }}
                          style={[st.typeChip, actionType === 'hours' && st.typeChipHoursActive]}
                          activeOpacity={0.8}
                        >
                          <Ionicons
                            name="time-outline"
                            size={14}
                            color={actionType === 'hours' ? '#fff' : W.orange}
                          />
                          <Text style={[st.typeChipText, actionType === 'hours' && st.typeChipTextActive]}>
                            Upravit otevírací dobu
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}

                  {courtOnly ? (
                    <>
                      <Text style={st.typeLabel}>TYP AKCE</Text>
                      <View style={st.typeRow}>
                        <TouchableOpacity
                          onPress={() => { setCourtClosureMode('full'); setSaveError(null); }}
                          style={[st.typeChip, courtClosureMode === 'full' && st.typeChipActive]}
                          activeOpacity={0.8}
                        >
                          <Ionicons
                            name="lock-closed-outline"
                            size={14}
                            color={courtClosureMode === 'full' ? '#fff' : W.red}
                          />
                          <Text style={[st.typeChipText, courtClosureMode === 'full' && st.typeChipTextActive]}>
                            Kompletně uzavřeno
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => { setCourtClosureMode('partial'); setSaveError(null); }}
                          style={[st.typeChip, courtClosureMode === 'partial' && st.typeChipHoursActive]}
                          activeOpacity={0.8}
                        >
                          <Ionicons
                            name="time-outline"
                            size={14}
                            color={courtClosureMode === 'partial' ? '#fff' : W.orange}
                          />
                          <Text style={[st.typeChipText, courtClosureMode === 'partial' && st.typeChipTextActive]}>
                            Uzavřeno v časovém úseku
                          </Text>
                        </TouchableOpacity>
                      </View>
                      <Text style={st.hint}>
                        Platí pro kurt „{fixedCourtName ?? fixedCourtId}".
                        {courtClosureMode === 'partial' && bounds && bounds.from !== bounds.to
                          ? ' Stejný časový úsek platí pro každý den v rozsahu.'
                          : ''}
                      </Text>
                    </>
                  ) : (
                    <>
                      <Text style={st.typeLabel}>ROZSAH</Text>
                      <View style={st.typeRow}>
                        <TouchableOpacity
                          onPress={() => { setScope('club'); setSaveError(null); }}
                          style={[st.typeChip, scope === 'club' && st.typeChipHoursActive]}
                          activeOpacity={0.8}
                        >
                          <Ionicons
                            name="business-outline"
                            size={14}
                            color={scope === 'club' ? '#fff' : W.orange}
                          />
                          <Text style={[st.typeChipText, scope === 'club' && st.typeChipTextActive]}>
                            Celý klub
                          </Text>
                        </TouchableOpacity>
                        {settings.categories.map(cat => (
                          <TouchableOpacity
                            key={cat.id}
                            onPress={() => { setScope(cat.id); setSaveError(null); }}
                            style={[st.typeChip, scope === cat.id && st.typeChipHoursActive]}
                            activeOpacity={0.8}
                          >
                            <Ionicons
                              name="layers-outline"
                              size={14}
                              color={scope === cat.id ? '#fff' : '#6366F1'}
                            />
                            <Text style={[st.typeChipText, scope === cat.id && st.typeChipTextActive]}>
                              {cat.name}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                      {categoryId && (
                        <Text style={st.hint}>
                          Platí pro {getCategoryById(settings, categoryId)?.court_ids.length ?? 0} kurtů
                          v kategorii „{getCategoryById(settings, categoryId)?.name}".
                        </Text>
                      )}
                    </>
                  )}

                  <Text style={st.hint}>
                    {bounds
                      ? `Termín: ${fmtDateKey(bounds.from)}${bounds.from !== bounds.to ? ` – ${fmtDateKey(bounds.to)}` : ''}`
                      : actionType === 'closure'
                        ? courtOnly && courtClosureMode === 'partial'
                          ? 'Vyberte den nebo rozsah dat (od–do)'
                          : 'Vyberte první den, pak poslední den uzavření'
                        : 'Vyberte den nebo rozsah dat (od–do)'}
                  </Text>

                  <View style={st.dayLabelsRow}>
                    {DAY_ABBR.map(label => (
                      <View key={label} style={st.dayLabelCell}>
                        <Text style={st.dayLabelText}>{label}</Text>
                      </View>
                    ))}
                  </View>

                  {rows.map((row, ri) => (
                    <View key={ri} style={st.gridRow}>
                      {row.map((date, ci) => {
                        const key = localDateKey(date);
                        const inMonth = date.getMonth() === dispMonth;
                        const inRange = isInRange(key);
                        const isStart = bounds && key === bounds.from;
                        const isEnd = bounds && key === bounds.to;
                        return (
                          <TouchableOpacity
                            key={ci}
                            onPress={() => handleDayPress(date)}
                            activeOpacity={0.65}
                            style={[
                              st.dayCell,
                              inRange && st.dayCellActive,
                              isStart && st.rangeStart,
                              isEnd && st.rangeEnd,
                            ]}
                          >
                            <Text style={[
                              st.dayNum,
                              !inMonth && st.dayNumFaded,
                              inRange && st.dayNumActive,
                            ]}>
                              {date.getDate()}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ))}

                  {actionType === 'closure' && courtOnly && courtClosureMode === 'partial' && bounds && (
                    <>
                      <Text style={st.fieldLabel}>UZAVŘENÝ ČASOVÝ ÚSEK</Text>
                      <Text style={st.fieldSub}>{formatDayHours(closedRange)}</Text>
                      <SlotHoursStepper
                        hours={closedRange}
                        onChange={setClosedRange}
                        accent={W.red}
                        openLabel="OD"
                        closeLabel="DO"
                      />
                    </>
                  )}

                  {actionType === 'closure' && (
                    <>
                      <Text style={st.fieldLabel}>VLASTNÍ POZNÁMKA</Text>
                      <Text style={st.fieldHint}>
                        Text zobrazený hráčům v termínu uzavření (volitelné)
                      </Text>
                      <TextInput
                        style={st.noteInput}
                        placeholder="Např. rekonstrukce kurtů, svátek klubu…"
                        placeholderTextColor={colors.textDisabled}
                        value={note}
                        onChangeText={setNote}
                        multiline
                      />
                    </>
                  )}

                  {actionType === 'hours' && bounds && baseHours && (
                    <>
                      <View style={st.refBox}>
                        <Ionicons name="time-outline" size={16} color={colors.textMuted} />
                        <View style={{ flex: 1 }}>
                          <Text style={st.refLabel}>VÝCHOZÍ PRO {fmtDateKey(bounds.from)}</Text>
                          <Text style={st.refValue}>{formatDayHours(baseHours)}</Text>
                          {bounds.from !== bounds.to && (
                            <Text style={st.refSub}>
                              Stejná úprava se aplikuje na každý den v rozsahu.
                            </Text>
                          )}
                        </View>
                      </View>
                      <Text style={st.fieldLabel}>NOVÁ PROVOZNÍ DOBA</Text>
                      <Text style={st.fieldSub}>{formatDayHours(hours)}</Text>
                      <SlotHoursStepper hours={hours} onChange={setHours} accent={W.orange} />
                    </>
                  )}

                  {saveError && (
                    <View style={st.errorBox}>
                      <Ionicons name="alert-circle" size={16} color={W.red} />
                      <Text style={st.errorText}>{saveError}</Text>
                    </View>
                  )}
                </View>
              </ScrollView>

              <View style={st.footer}>
                <TouchableOpacity onPress={onClose} style={st.cancelBtn}>
                  <Text style={st.cancelText}>ZRUŠIT</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSave}
                  disabled={!bounds}
                  style={[st.saveBtn, !bounds && { opacity: 0.4 }]}
                >
                  <Text style={st.saveText}>{saveLabel}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const st = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  sheet: {
    backgroundColor: colors.surface,
    width: '100%',
    maxWidth: 360,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  topBar: { height: 4, backgroundColor: W.orange },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  navBtn: { padding: 4 },
  monthLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: 0.3,
  },
  body: { padding: 16, gap: 10 },
  typeLabel: {
    fontSize: 9, fontWeight: '800', color: colors.textMuted, letterSpacing: 1,
  },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgAlt,
  },
  typeChipActive: { backgroundColor: W.red, borderColor: W.red },
  typeChipHoursActive: { backgroundColor: W.orange, borderColor: W.orange },
  typeChipText: { fontSize: 11, fontWeight: '800', color: colors.textSecondary },
  typeChipTextActive: { color: '#fff' },
  hint: { fontSize: 12, color: colors.textMuted, lineHeight: 18 },
  dayLabelsRow: { flexDirection: 'row', paddingTop: 4 },
  dayLabelCell: { flex: 1, alignItems: 'center' },
  dayLabelText: {
    fontSize: 10, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.8,
  },
  gridRow: { flexDirection: 'row' },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCellActive: { backgroundColor: 'rgba(249,115,22,0.25)' },
  rangeStart: { borderTopLeftRadius: 6, borderBottomLeftRadius: 6 },
  rangeEnd: { borderTopRightRadius: 6, borderBottomRightRadius: 6 },
  dayNum: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  dayNumFaded: { color: colors.textDisabled },
  dayNumActive: { fontWeight: '900', color: W.orange },
  fieldLabel: {
    fontSize: 9, fontWeight: '800', color: colors.textMuted, letterSpacing: 1, marginTop: 4,
  },
  fieldHint: { fontSize: 11, color: colors.textMuted, lineHeight: 16 },
  fieldSub: { fontSize: 12, color: colors.textSecondary },
  noteInput: {
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    fontSize: 14,
    color: colors.textPrimary,
    minHeight: 72,
    textAlignVertical: 'top',
    backgroundColor: colors.bgAlt,
  },
  refBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
  refSub: { fontSize: 11, color: colors.textMuted, marginTop: 4, lineHeight: 16 },
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
