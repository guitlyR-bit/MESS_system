import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { SeasonPeriod } from '@/types/database';
import { colors } from '@/lib/theme';
import { formatSeasonPeriod } from '@/lib/clubSeason';
import { MonthDayPicker, formatMMDD } from '@/components/club/MonthDayPicker';

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
  const [expandedField, setExpandedField] = useState<'fromMMDD' | 'toMMDD' | null>(null);

  function toggleField(field: 'fromMMDD' | 'toMMDD') {
    setExpandedField(prev => prev === field ? null : field);
  }

  function patch(field: 'fromMMDD' | 'toMMDD', mmdd: string) {
    onChange({ ...period, [field]: mmdd });
    setExpandedField(null);
  }

  function renderExpandableRow(field: 'fromMMDD' | 'toMMDD', title: string) {
    const expanded = expandedField === field;
    return (
      <View style={s.dateSection}>
        <TouchableOpacity
          style={s.dateHeader}
          onPress={() => toggleField(field)}
          activeOpacity={0.7}
        >
          <View style={[s.dateBadge, { backgroundColor: accent }]}>
            <Text style={s.dateBadgeText}>{title}</Text>
          </View>
          <Text style={s.dateValue}>{formatMMDD(period[field])}</Text>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={colors.textMuted}
          />
        </TouchableOpacity>
        {expanded && (
          <MonthDayPicker
            valueMMDD={period[field]}
            accent={accent}
            onSelect={(mmdd) => patch(field, mmdd)}
          />
        )}
      </View>
    );
  }

  return (
    <View style={s.wrap}>
      <Text style={s.label}>{label}</Text>
      <Text style={s.summary}>{formatSeasonPeriod(period)}</Text>
      {renderExpandableRow('fromMMDD', 'OD')}
      {renderExpandableRow('toMMDD', 'DO')}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { marginTop: 12, padding: 12, backgroundColor: colors.bgAlt, borderWidth: 1, borderColor: colors.border },
  label: { fontSize: 12, fontWeight: '900', color: colors.textPrimary, letterSpacing: 0.5 },
  summary: { fontSize: 11, color: colors.textMuted, marginTop: 4, marginBottom: 8 },
  dateSection: { marginTop: 8 },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateBadge: { paddingHorizontal: 8, paddingVertical: 4 },
  dateBadgeText: { fontSize: 10, fontWeight: '900', color: '#fff', letterSpacing: 1 },
  dateValue: { flex: 1, fontSize: 15, fontWeight: '800', color: colors.textPrimary },
});
