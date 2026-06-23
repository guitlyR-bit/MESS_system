import { TouchableOpacity, Text, ActivityIndicator, ViewStyle } from 'react-native';
import { ReactNode } from 'react';
import { colors } from '@/lib/theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size    = 'sm' | 'md' | 'lg';

interface ButtonProps {
  onPress?: () => void;
  label: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  color?: string;
  textColor?: string;
  fullWidth?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  style?: ViewStyle;
}

const SIZES = {
  sm: { height: 40, fontSize: 12, px: 16 },
  md: { height: 52, fontSize: 14, px: 20 },
  lg: { height: 64, fontSize: 15, px: 24 },
};

export function Button({
  onPress,
  label,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  color,
  textColor,
  fullWidth = false,
  iconLeft,
  iconRight,
  style,
}: ButtonProps) {
  const s = SIZES[size];

  const bgColor =
    color ??
    (variant === 'primary'   ? colors.black
   : variant === 'secondary' ? colors.surfaceAlt
   : variant === 'danger'    ? colors.error
   : 'transparent');

  const labelColor =
    textColor ??
    (variant === 'secondary' ? colors.textPrimary
   : variant === 'ghost'     ? colors.textSecondary
   : '#FFFFFF');

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
      style={[
        {
          backgroundColor: bgColor,
          height: s.height,
          paddingHorizontal: s.px,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          opacity: disabled ? 0.4 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={labelColor} />
      ) : (
        <>
          {iconLeft}
          <Text
            style={{
              color: labelColor,
              fontSize: s.fontSize,
              fontWeight: '900',
              letterSpacing: 1.5,
              textTransform: 'uppercase',
            }}
          >
            {label}
          </Text>
          {iconRight}
        </>
      )}
    </TouchableOpacity>
  );
}
