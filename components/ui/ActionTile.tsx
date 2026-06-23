import { TouchableOpacity, View, Text, ViewStyle } from 'react-native';
import { colors } from '@/lib/theme';

interface ActionTileProps {
  label: string;
  description?: string;
  accent: string;
  onPress?: () => void;
  badge?: string;
  style?: ViewStyle;
}

export function ActionTile({ label, description, accent, onPress, badge, style }: ActionTileProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[
        {
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          borderLeftWidth: 5,
          borderLeftColor: accent,
          padding: 18,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        },
        style,
      ]}
    >
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={{ fontSize: 15, fontWeight: '800', color: colors.textPrimary, letterSpacing: 0.2 }}>
          {label}
        </Text>
        {description && (
          <Text style={{ fontSize: 12, color: colors.textMuted }}>{description}</Text>
        )}
      </View>
      {badge ? (
        <View style={{ backgroundColor: accent, paddingHorizontal: 10, paddingVertical: 4 }}>
          <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>{badge}</Text>
        </View>
      ) : (
        <Text style={{ fontSize: 20, color: colors.textMuted, fontWeight: '700' }}>›</Text>
      )}
    </TouchableOpacity>
  );
}
