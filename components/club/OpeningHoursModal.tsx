import { useState, useEffect } from 'react';
import {
  View, Text, Modal, ScrollView, TouchableOpacity,
  Switch, StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ClubSettings, OpeningSchedule, WeekdayIndex, DayHours, HolidayTreatment } from '@/types/database';
import { colors } from '@/lib/theme';
import {
  formatDayHours, WEEKDAY_NAMES, clampDayHours,
} from '@/lib/clubSchedule';
import {
  getUpcomingCzechHolidays, fmtHolidayDate, holidayTreatmentLabel,
} from '@/lib/czechHolidays';
import { SlotHoursStepper } from '@/components/club/SlotHoursStepper';

const W = colors.warm;

export function OpeningHoursModal({
  visible,
  settings,
  onSave,
  onClose,
}: {
  visible: boolean;
  settings: ClubSettings;
  onSave: (schedule: OpeningSchedule, holidayTreatment: HolidayTreatment) => void;
  onClose: () => void;
}) {
  const [schedule, setSchedule] = useState<OpeningSchedule>(settings.openingSchedule);
  const [holidayTreatment, setHolidayTreatment] = useState<HolidayTreatment>(settings.holidayTreatment);
  const [useWeekday, setUseWeekday] = useState(!!settings.openingSchedule.weekday);
  const [useWeekend, setUseWeekend] = useState(!!settings.openingSchedule.weekend);
  const [expandedDay, setExpandedDay] = useState<WeekdayIndex | null>(null);

  const upcomingHolidays = getUpcomingCzechHolidays(6);

  useEffect(() => {
    if (visible) {
      setSchedule({
        ...settings.openingSchedule,
        byDay: { ...settings.openingSchedule.byDay },
        dateOverrides: settings.openingSchedule.dateOverrides?.map(o => ({
          ...o, hours: { ...o.hours },
        })) ?? [],
      });
      setHolidayTreatment(settings.holidayTreatment);
      setUseWeekday(!!settings.openingSchedule.weekday);
      setUseWeekend(!!settings.openingSchedule.weekend);
      setExpandedDay(null);
    }
  }, [visible, settings]);

  function setDefault(hours: DayHours) {
    setSchedule(s => ({ ...s, default: clampDayHours(hours) }));
  }

  function setWeekday(hours: DayHours) {
    setSchedule(s => ({ ...s, weekday: clampDayHours(hours) }));
  }

  function setWeekend(hours: DayHours) {
    setSchedule(s => ({ ...s, weekend: clampDayHours(hours) }));
  }

  function setDayHours(day: WeekdayIndex, hours: DayHours) {
    setSchedule(s => ({
      ...s,
      byDay: { ...s.byDay, [day]: clampDayHours(hours) },
    }));
  }

  function removeDayOverride(day: WeekdayIndex) {
    setSchedule(s => {
      const byDay = { ...s.byDay };
      delete byDay[day];
      return { ...s, byDay };
    });
    setExpandedDay(null);
  }

  function handleSave() {
    const next: OpeningSchedule = {
      ...schedule,
      default: clampDayHours(schedule.default),
      weekday: useWeekday ? clampDayHours(schedule.weekday ?? schedule.default) : undefined,
      weekend: useWeekend ? clampDayHours(schedule.weekend ?? schedule.default) : undefined,
    };
    onSave(next, holidayTreatment);
    onClose();
  }

  const weekdayHours = schedule.weekday ?? schedule.default;
  const weekendHours = schedule.weekend ?? schedule.default;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.sheet}>
          <View style={s.handle} />
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={[s.bar, { backgroundColor: W.amber }]} />
            <View style={s.body}>
              <Text style={s.title}>PROVOZNÍ DOBA</Text>
              <Text style={s.sub}>
                Nastavte otevírací dobu pro pracovní dny, víkend a jednotlivé dny v týdnu.
              </Text>

              <View style={s.section}>
                <Text style={s.sectionTitle}>VÝCHOZÍ</Text>
                <Text style={s.sectionSub}>{formatDayHours(schedule.default)}</Text>
                <SlotHoursStepper hours={schedule.default} onChange={setDefault} accent={W.amber} />
              </View>

              <View style={s.section}>
                <View style={s.switchRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.sectionTitle}>PRACOVNÍ DNY (Po–Pá)</Text>
                    <Text style={s.sectionSub}>
                      {useWeekday ? formatDayHours(weekdayHours) : 'Stejné jako výchozí'}
                    </Text>
                  </View>
                  <Switch
                    value={useWeekday}
                    onValueChange={setUseWeekday}
                    trackColor={{ false: colors.border, true: W.amber }}
                    thumbColor="#fff"
                  />
                </View>
                {useWeekday && (
                  <SlotHoursStepper hours={weekdayHours} onChange={setWeekday} accent={W.amber} />
                )}
              </View>

              <View style={s.section}>
                <View style={s.switchRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.sectionTitle}>VÍKEND (So–Ne)</Text>
                    <Text style={s.sectionSub}>
                      {useWeekend ? formatDayHours(weekendHours) : 'Stejné jako výchozí'}
                    </Text>
                  </View>
                  <Switch
                    value={useWeekend}
                    onValueChange={setUseWeekend}
                    trackColor={{ false: colors.border, true: W.amber }}
                    thumbColor="#fff"
                  />
                </View>
                {useWeekend && (
                  <SlotHoursStepper hours={weekendHours} onChange={setWeekend} accent={W.amber} />
                )}
              </View>

              <View style={s.section}>
                <Text style={s.sectionTitle}>JEDNOTLIVÉ DNY</Text>
                {( [0, 1, 2, 3, 4, 5, 6] as WeekdayIndex[]).map(day => {
                  const custom = schedule.byDay?.[day];
                  const isOpen = expandedDay === day;
                  return (
                    <View key={day} style={s.dayRow}>
                      <TouchableOpacity
                        style={s.dayRowHeader}
                        onPress={() => setExpandedDay(isOpen ? null : day)}
                        activeOpacity={0.7}
                      >
                        <Text style={s.dayName}>{WEEKDAY_NAMES[day]}</Text>
                        <Text style={s.dayHours}>
                          {custom ? formatDayHours(custom) : 'Podle skupiny'}
                        </Text>
                        <Ionicons
                          name={isOpen ? 'chevron-up' : 'chevron-down'}
                          size={18}
                          color={colors.textMuted}
                        />
                      </TouchableOpacity>
                      {isOpen && (
                        <View style={s.dayExpand}>
                          <SlotHoursStepper
                            hours={custom ?? schedule.default}
                            onChange={h => setDayHours(day, h)}
                            accent={W.orange}
                          />
                          {custom && (
                            <TouchableOpacity onPress={() => removeDayOverride(day)} style={s.removeDayBtn}>
                              <Text style={s.removeDayText}>Odstranit vlastní dobu</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>

              {/* Státní svátky — automatické rozpoznání */}
              <View style={s.section}>
                <View style={s.holidayInfoRow}>
                  <Ionicons name="information-circle" size={18} color={W.amber} />
                  <Text style={s.holidayInfoText}>
                    Státní svátky ČR rozpoznává systém automaticky. Vyberte, zda se v tyto dny
                    použije provozní doba pracovních dnů nebo víkendu.
                  </Text>
                </View>
                <Text style={s.sectionTitle}>STÁTNÍ SVÁTKY</Text>
                <Text style={s.sectionSub}>
                  Aktuálně: {holidayTreatmentLabel(holidayTreatment)}
                </Text>
                <View style={s.treatmentRow}>
                  {(['weekday', 'weekend'] as HolidayTreatment[]).map(t => {
                    const sel = holidayTreatment === t;
                    return (
                      <TouchableOpacity
                        key={t}
                        onPress={() => setHolidayTreatment(t)}
                        style={[s.treatmentChip, sel && s.treatmentChipActive]}
                      >
                        <Text style={[s.treatmentChipText, sel && s.treatmentChipTextActive]}>
                          {t === 'weekday' ? 'Jako pracovní den' : 'Jako víkend'}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {upcomingHolidays.length > 0 && (
                  <View style={s.upcomingBox}>
                    <Text style={s.upcomingTitle}>Nadcházející svátky</Text>
                    {upcomingHolidays.map(h => (
                      <View key={h.dateKey} style={s.upcomingRow}>
                        <Text style={s.upcomingDate}>{fmtHolidayDate(h.dateKey)}</Text>
                        <Text style={s.upcomingName}>{h.name}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
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
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.surface, maxHeight: '92%' },
  handle: { width: 40, height: 4, backgroundColor: colors.border, alignSelf: 'center', marginTop: 8 },
  bar: { height: 4 },
  body: { padding: 20, gap: 4 },
  title: { fontSize: 16, fontWeight: '900', color: colors.textPrimary, letterSpacing: 1 },
  sub: { fontSize: 12, color: colors.textMuted, lineHeight: 18, marginBottom: 8 },
  section: {
    marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.border, gap: 10,
  },
  sectionTitle: { fontSize: 11, fontWeight: '900', color: colors.textPrimary, letterSpacing: 0.8 },
  sectionSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dayRow: { borderWidth: 1, borderColor: colors.border, marginTop: 6 },
  dayRowHeader: {
    flexDirection: 'row', alignItems: 'center', padding: 12, gap: 8,
  },
  dayName: { fontSize: 13, fontWeight: '800', color: colors.textPrimary, flex: 1 },
  dayHours: { fontSize: 12, color: colors.textMuted },
  dayExpand: { padding: 12, paddingTop: 0, gap: 8 },
  removeDayBtn: { alignSelf: 'flex-start', paddingVertical: 6 },
  removeDayText: { fontSize: 12, fontWeight: '700', color: W.red },
  holidayInfoRow: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start',
    padding: 10, backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A',
  },
  holidayInfoText: { flex: 1, fontSize: 12, color: colors.textSecondary, lineHeight: 18 },
  treatmentRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  treatmentChip: {
    paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.bgAlt,
  },
  treatmentChipActive: { borderColor: W.amber, backgroundColor: W.amber },
  treatmentChipText: { fontSize: 12, fontWeight: '800', color: colors.textSecondary },
  treatmentChipTextActive: { color: '#fff' },
  upcomingBox: {
    marginTop: 4, padding: 10, backgroundColor: colors.bgAlt,
    borderWidth: 1, borderColor: colors.border, gap: 6,
  },
  upcomingTitle: {
    fontSize: 10, fontWeight: '900', color: colors.textMuted, letterSpacing: 1, marginBottom: 2,
  },
  upcomingRow: { flexDirection: 'row', gap: 10, alignItems: 'baseline' },
  upcomingDate: { fontSize: 12, fontWeight: '800', color: colors.textPrimary, minWidth: 72 },
  upcomingName: { flex: 1, fontSize: 12, color: colors.textSecondary },
  footer: {
    flexDirection: 'row', gap: 10, padding: 16,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  cancelBtn: {
    flex: 1, paddingVertical: 14, alignItems: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  cancelText: { fontSize: 12, fontWeight: '800', color: colors.textMuted },
  saveBtn: { flex: 1, paddingVertical: 14, alignItems: 'center', backgroundColor: W.amber },
  saveText: { fontSize: 12, fontWeight: '900', color: '#fff', letterSpacing: 1 },
});
