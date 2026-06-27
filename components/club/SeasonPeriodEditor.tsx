import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { SeasonPeriod } from '@/types/database';
import { colors } from '@/lib/theme';
import { formatSeasonPeriod } from '@/lib/clubSeason';
import { formatMMDD } from '@/components/club/MonthDayPicker';
import { MonthDayPickerModal } from '@/components/club/MonthDayPickerModal';

export function SeasonPeriodEditor({
  label,
  period,
  accent,
  onChange,
}: {
  label: string;
  period: SeasonPeriod;
  accent: string;
  onChange: (period: SeasonPeriod) => void;
}) {
  const [pickerField, setPickerField] = useState<'fromMMDD' | 'toMMDD' | null>(null);

  function patch(field: 'fromMMDD' | 'toMMDD', mmdd: string) {
    onChange({ ...period, [field]: mmdd });
  }

  function renderDateRow(field: 'fromMMDD' | 'toMMDD', title: string) {
    return (
      <TouchableOpacity
        style={s.dateHeader}
        onPress={() => setPickerField(field)}
        activeOpacity={0.7}
      >
        <View style={[s.dateBadge, { backgroundColor: accent }]}>
          <Text style={s.dateBadgeText}>{title}</Text>
        </View>
        <Text style={s.dateValue}>{formatMMDD(period[field])}</Text>
        <Ionicons name="calendar-outline" size={18} color={accent} />
      </TouchableOpacity>
    );
  }

  return (
    <View style={s.wrap}>
      <Text style={s.label}>{label}</Text>
      <Text style={s.summary}>{formatSeasonPeriod(period)}</Text>
      {renderDateRow('fromMMDD', 'OD')}
      {renderDateRow('toMMDD', 'DO')}

      <MonthDayPickerModal
        visible={pickerField === 'fromMMDD'}
        title={`${label} — začátek`}
        valueMMDD={period.fromMMDD}
        accent={accent}
        onClose={() => setPickerField(null)}
        onSelect={(mmdd) => patch('fromMMDD', mmdd)}
      />
      <MonthDayPickerModal
        visible={pickerField === 'toMMDD'}
        title={`${label} — konec`}
        valueMMDD={period.toMMDD}
        accent={accent}
        onClose={() => setPickerField(null)}
        onSelect={(mmdd) => patch('toMMDD', mmdd)}
      />
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { marginTop: 12, padding: 12, backgroundColor: colors.bgAlt, borderWidth: 1, borderColor: colors.border },
  label: { fontSize: 12, fontWeight: '900', color: colors.textPrimary, letterSpacing: 0.5 },
  summary: { fontSize: 11, color: colors.textMuted, marginTop: 4, marginBottom: 8 },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    marginTop: 6,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateBadge: { paddingHorizontal: 8, paddingVertical: 4 },
  dateBadgeText: { fontSize: 10, fontWeight: '900', color: '#fff', letterSpacing: 1 },
  dateValue: { flex: 1, fontSize: 15, fontWeight: '800', color: colors.textPrimary },
});
