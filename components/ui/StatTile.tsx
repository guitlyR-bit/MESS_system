import { View, Text, ViewStyle } from 'react-native';
import { colors } from '@/lib/theme';

interface StatTileProps {
  label: string;
  value: string | number;
  sub?: string;
  accent: string;
  style?: ViewStyle;
}

export function StatTile({ label, value, sub, accent, style }: StatTileProps) {
  return (
    <View
      style={[
        {
          flex: 1,
          backgroundColor: colors.surface,
          padding: 16,
          gap: 3,
          // Barevný horní pruh místo tlustých okrajů
          borderTopWidth: 4,
          borderTopColor: accent,
        },
        style,
      ]}
    >
      <Text style={{ fontSize: 10, fontWeight: '800', color: accent, letterSpacing: 1.2, textTransform: 'uppercase' }}>
        {label}
      </Text>
      <Text style={{ fontSize: 34, fontWeight: '900', color: colors.textPrimary, lineHeight: 40 }}>
        {value}
      </Text>
      {sub && (
        <Text style={{ fontSize: 11, color: colors.textMuted, fontWeight: '500' }}>{sub}</Text>
      )}
    </View>
  );
}
