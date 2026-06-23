import { View, Text, ViewStyle } from 'react-native';
import { colors } from '@/lib/theme';

interface StatTileProps {
  label: string;
  value: string | number;
  sub?: string;
  accent: string;
  accentFade: string;
  style?: ViewStyle;
}

export function StatTile({ label, value, sub, accent, accentFade, style }: StatTileProps) {
  return (
    <View
      style={[
        {
          flex: 1,
          backgroundColor: accentFade,
          borderWidth: 1,
          borderColor: accent + '44',
          padding: 16,
          gap: 2,
        },
        style,
      ]}
    >
      <Text style={{ fontSize: 11, fontWeight: '700', color: accent, letterSpacing: 1, textTransform: 'uppercase' }}>
        {label}
      </Text>
      <Text style={{ fontSize: 32, fontWeight: '900', color: colors.textPrimary, lineHeight: 38 }}>
        {value}
      </Text>
      {sub && (
        <Text style={{ fontSize: 11, color: colors.textMuted, fontWeight: '500' }}>{sub}</Text>
      )}
    </View>
  );
}
