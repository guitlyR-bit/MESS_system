import { TouchableOpacity, Text, ActivityIndicator, ViewStyle } from 'react-native';

interface ButtonProps {
  onPress?: () => void;
  label: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  color?: string;
  style?: ViewStyle;
}

const VARIANTS = {
  primary: { bg: '#2D9148', text: '#FFFFFF', border: 'transparent' },
  secondary: { bg: '#1A2634', text: '#FFFFFF', border: '#2D3748' },
  outline: { bg: 'transparent', text: '#2D9148', border: '#2D9148' },
  danger: { bg: 'transparent', text: '#EF4444', border: '#EF444433' },
};

const SIZES = {
  sm: { ph: 12, pv: 8, fs: 13, radius: 8 },
  md: { ph: 20, pv: 14, fs: 15, radius: 12 },
  lg: { ph: 24, pv: 16, fs: 17, radius: 14 },
};

export function Button({
  onPress,
  label,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  color,
  style,
}: ButtonProps) {
  const v = VARIANTS[variant];
  const s = SIZES[size];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[
        {
          backgroundColor: color ?? v.bg,
          paddingHorizontal: s.ph,
          paddingVertical: s.pv,
          borderRadius: s.radius,
          borderWidth: v.border !== 'transparent' ? 1 : 0,
          borderColor: v.border,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={v.text} />
      ) : (
        <Text style={{ color: v.text, fontSize: s.fs, fontWeight: '700' }}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}
