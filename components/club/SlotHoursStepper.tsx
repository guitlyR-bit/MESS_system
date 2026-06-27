import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { DayHours } from '@/types/database';
import { slotToTime, slotEndTime, SLOT_COUNT } from '@/lib/mockData';
import { clampDayHours } from '@/lib/clubSchedule';
import { colors } from '@/lib/theme';

const W = colors.warm;

export function SlotHoursStepper({
  hours,
  onChange,
  accent = W.amber,
}: {
  hours: DayHours;
  onChange: (h: DayHours) => void;
  accent?: string;
}) {
  const setOpening = (slot: number) =>
    onChange(clampDayHours({ ...hours, openingSlot: slot }));
  const setClosing = (slot: number) =>
    onChange(clampDayHours({ ...hours, closingSlot: slot }));

  return (
    <View style={st.row}>
      <View style={st.col}>
        <Text style={st.label}>OTEVÍRÁ</Text>
        <View style={st.stepper}>
          <TouchableOpacity
            onPress={() => setOpening(Math.max(0, hours.openingSlot - 1))}
            style={[st.btn, { backgroundColor: accent }]}
          >
            <Text style={st.btnText}>−</Text>
          </TouchableOpacity>
          <Text style={st.value}>{slotToTime(hours.openingSlot)}</Text>
          <TouchableOpacity
            onPress={() => setOpening(Math.min(hours.closingSlot - 1, hours.openingSlot + 1))}
            style={[st.btn, { backgroundColor: accent }]}
          >
            <Text style={st.btnText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={st.col}>
        <Text style={st.label}>ZAVÍRÁ</Text>
        <View style={st.stepper}>
          <TouchableOpacity
            onPress={() => setClosing(Math.max(hours.openingSlot + 1, hours.closingSlot - 1))}
            style={[st.btn, { backgroundColor: accent }]}
          >
            <Text style={st.btnText}>−</Text>
          </TouchableOpacity>
          <Text style={st.value}>{slotEndTime(hours.closingSlot)}</Text>
          <TouchableOpacity
            onPress={() => setClosing(Math.min(SLOT_COUNT - 1, hours.closingSlot + 1))}
            style={[st.btn, { backgroundColor: accent }]}
          >
            <Text style={st.btnText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12 },
  col: { flex: 1 },
  label: {
    fontSize: 9, fontWeight: '800', color: colors.textMuted,
    letterSpacing: 1, marginBottom: 6,
  },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btn: {
    width: 32, height: 32, alignItems: 'center', justifyContent: 'center',
  },
  btnText: { fontSize: 18, fontWeight: '900', color: '#fff' },
  value: { fontSize: 15, fontWeight: '900', color: colors.textPrimary, minWidth: 52, textAlign: 'center' },
});
