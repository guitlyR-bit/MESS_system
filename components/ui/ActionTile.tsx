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
      activeOpacity={0.82}
      style={[
        {
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          borderLeftWidth: 4,
          borderLeftColor: accent,
          paddingVertical: 16,
          paddingRight: 18,
          paddingLeft: 18,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        },
        style,
      ]}
    >
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={{ fontSize: 15, fontWeight: '800', color: colors.textPrimary }}>
          {label}
        </Text>
        {description && (
          <Text style={{ fontSize: 12, color: colors.textMuted }}>{description}</Text>
        )}
      </View>
      {badge ? (
        <View style={{ backgroundColor: accent, paddingHorizontal: 9, paddingVertical: 3 }}>
          <Text style={{ color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 0.8 }}>{badge}</Text>
        </View>
      ) : (
        <Text style={{ fontSize: 18, color: colors.borderStrong }}>›</Text>
      )}
    </TouchableOpacity>
  );
}
