import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/lib/theme';

export function ClubAmenityCheckRow({
  label,
  hint,
  checked,
  onToggle,
  accentColor = colors.club.accent,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onToggle: (value: boolean) => void;
  accentColor?: string;
}) {
  return (
    <TouchableOpacity
      onPress={() => onToggle(!checked)}
      style={s.row}
      activeOpacity={0.75}
    >
      <View style={[s.box, checked && { backgroundColor: accentColor, borderColor: accentColor }]}>
        {checked ? <Ionicons name="checkmark" size={15} color="#fff" /> : null}
      </View>
      <View style={s.textWrap}>
        <Text style={s.label}>{label}</Text>
        {hint ? <Text style={s.hint}>{hint}</Text> : null}
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  box: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    backgroundColor: colors.bgAlt,
  },
  boxChecked: {
    backgroundColor: colors.club.accent,
    borderColor: colors.club.accent,
  },
  textWrap: { flex: 1 },
  label: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  hint: { fontSize: 12, color: colors.textMuted, marginTop: 3, lineHeight: 17 },
});
