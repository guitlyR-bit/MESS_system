import { Modal, View, Text, TouchableOpacity, TouchableWithoutFeedback, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/lib/theme';
import { MonthDayPicker } from '@/components/club/MonthDayPicker';

export function MonthDayPickerModal({
  visible,
  title,
  valueMMDD,
  accent,
  onClose,
  onSelect,
}: {
  visible: boolean;
  title: string;
  valueMMDD: string;
  accent: string;
  onClose: () => void;
  onSelect: (mmdd: string) => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={s.overlay}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={s.sheet}>
              <View style={[s.topBar, { backgroundColor: accent }]} />
              <View style={s.header}>
                <Text style={s.title}>{title}</Text>
                <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close" size={22} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
              <MonthDayPicker
                compact
                valueMMDD={valueMMDD}
                accent={accent}
                onSelect={(mmdd) => {
                  onSelect(mmdd);
                  onClose();
                }}
              />
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  sheet: {
    width: '100%',
    maxWidth: 280,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  topBar: { height: 3 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { fontSize: 13, fontWeight: '900', color: colors.textPrimary, letterSpacing: 0.5 },
});
