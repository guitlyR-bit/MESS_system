import { Modal, View, TouchableOpacity, Text, StyleSheet, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Club, ClubSettings } from '@/types/database';
import { colors } from '@/lib/theme';
import { ClubProfilePreview } from '@/components/club/ClubProfilePreview';

export function ClubProfilePreviewModal({
  visible,
  profile,
  settings,
  onClose,
}: {
  visible: boolean;
  profile: Club;
  settings?: ClubSettings;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={s.safe}>
        <View style={s.header}>
          <Text style={s.headerTitle}>Náhled profilu</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={26} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <ClubProfilePreview profile={profile} settings={settings} />
      </SafeAreaView>
    </Modal>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgAlt },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderColor: colors.border,
  },
  headerTitle: { fontSize: 16, fontWeight: '900', color: colors.textPrimary },
});
