import { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/lib/theme';

const MONTH_NAMES = [
  'Leden', 'Únor', 'Březen', 'Duben', 'Květen', 'Červen',
  'Červenec', 'Srpen', 'Září', 'Říjen', 'Listopad', 'Prosinec',
];
const DAY_ABBR = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function parseMMDD(mmdd: string): { month: number; day: number } {
  const [m, d] = mmdd.split('-').map(Number);
  return { month: m, day: d };
}

function toMMDD(month: number, day: number): string {
  return `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function formatMMDD(mmdd: string): string {
  const { month, day } = parseMMDD(mmdd);
  return `${day}. ${month}.`;
}

export function MonthDayPicker({
  valueMMDD,
  accent,
  onSelect,
  compact = false,
}: {
  valueMMDD: string;
  accent: string;
  onSelect: (mmdd: string) => void;
  compact?: boolean;
}) {
  const initial = parseMMDD(valueMMDD);
  const [dispMonth, setDispMonth] = useState(initial.month - 1);
  const [dispYear, setDispYear] = useState(() => new Date().getFullYear());

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

  const goPrev = () => {
    if (dispMonth === 0) { setDispMonth(11); setDispYear(y => y - 1); }
    else setDispMonth(m => m - 1);
  };
  const goNext = () => {
    if (dispMonth === 11) { setDispMonth(0); setDispYear(y => y + 1); }
    else setDispMonth(m => m + 1);
  };

  function handleDayPress(date: Date) {
    onSelect(toMMDD(date.getMonth() + 1, date.getDate()));
  }

  function isSelected(date: Date): boolean {
    const mmdd = toMMDD(date.getMonth() + 1, date.getDate());
    return mmdd === valueMMDD;
  }

  return (
    <View style={[s.wrap, compact && s.wrapCompact]}>
      <View style={s.header}>
        <TouchableOpacity onPress={goPrev} style={s.navBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-back" size={compact ? 16 : 18} color={accent} />
        </TouchableOpacity>
        <Text style={[s.monthLabel, compact && s.monthLabelCompact]}>{MONTH_NAMES[dispMonth]}</Text>
        <TouchableOpacity onPress={goNext} style={s.navBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-forward" size={compact ? 16 : 18} color={accent} />
        </TouchableOpacity>
      </View>
      {!compact && (
        <Text style={s.hint}>Vybráno: {formatMMDD(valueMMDD)} · platí každoročně</Text>
      )}
      <View style={s.dayLabelsRow}>
        {DAY_ABBR.map(label => (
          <View key={label} style={s.dayLabelCell}>
            <Text style={[s.dayLabelText, compact && s.dayLabelTextCompact]}>{label}</Text>
          </View>
        ))}
      </View>
      {rows.map((row, ri) => (
        <View key={ri} style={s.gridRow}>
          {row.map((date, ci) => {
            const inMonth = date.getMonth() === dispMonth;
            const selected = isSelected(date);
            return (
              <TouchableOpacity
                key={ci}
                onPress={() => handleDayPress(date)}
                activeOpacity={0.65}
                style={[
                  s.dayCell,
                  compact && s.dayCellCompact,
                  selected && { backgroundColor: accent, borderRadius: 4 },
                ]}
              >
                <Text style={[
                  s.dayNum,
                  compact && s.dayNumCompact,
                  !inMonth && s.dayNumFaded,
                  selected && s.dayNumActive,
                ]}>
                  {date.getDate()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
      {compact && (
        <Text style={s.hintCompact}>Vybráno: {formatMMDD(valueMMDD)}</Text>
      )}
    </View>
  );
}

export { formatMMDD, toMMDD, parseMMDD };

const s = StyleSheet.create({
  wrap: {
    marginTop: 8,
    padding: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  wrapCompact: {
    marginTop: 0,
    padding: 8,
    borderWidth: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  navBtn: { padding: 4 },
  monthLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  monthLabelCompact: { fontSize: 12 },
  hint: {
    fontSize: 10,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: 8,
    lineHeight: 14,
  },
  hintCompact: {
    fontSize: 10,
    color: colors.textMuted,
    textAlign: 'center',
    paddingTop: 6,
    fontWeight: '700',
  },
  dayLabelsRow: { flexDirection: 'row', paddingBottom: 4 },
  dayLabelCell: { flex: 1, alignItems: 'center' },
  dayLabelText: { fontSize: 9, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.5 },
  dayLabelTextCompact: { fontSize: 8 },
  gridRow: { flexDirection: 'row' },
  dayCell: { flex: 1, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  dayCellCompact: { aspectRatio: undefined, height: 28 },
  dayNum: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  dayNumCompact: { fontSize: 11 },
  dayNumFaded: { color: colors.textDisabled },
  dayNumActive: { color: '#fff', fontWeight: '900' },
});
