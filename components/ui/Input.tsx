import { View, Text, TextInput, TextInputProps, ViewStyle } from 'react-native';
import { ReactNode, useState } from 'react';
import { colors } from '@/lib/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  containerStyle?: ViewStyle;
  accentColor?: string;
}

export function Input({
  label,
  error,
  hint,
  iconLeft,
  iconRight,
  containerStyle,
  style,
  accentColor = colors.black,
  ...props
}: InputProps) {
  const [focused, setFocused] = useState(false);

  const borderColor = error ? colors.error : focused ? accentColor : colors.borderStrong;
  const borderWidth = focused || error ? 2 : 1;

  return (
    <View style={containerStyle}>
      {label && (
        <Text
          style={{
            fontSize: 11,
            fontWeight: '800',
            color: colors.textPrimary,
            marginBottom: 8,
            letterSpacing: 1.5,
          }}
        >
          {label}
        </Text>
      )}

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.surface,
          borderWidth,
          borderColor,
          minHeight: 56,
          paddingHorizontal: 16,
        }}
      >
        {iconLeft && <View style={{ marginRight: 10 }}>{iconLeft}</View>}
        <TextInput
          placeholderTextColor={colors.textDisabled}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[
            {
              flex: 1,
              color: colors.textPrimary,
              fontSize: 16,
              fontWeight: '500',
              paddingVertical: 14,
            },
            style,
          ]}
          {...props}
        />
        {iconRight && <View style={{ marginLeft: 10 }}>{iconRight}</View>}
      </View>

      {error ? (
        <Text
          style={{
            color: colors.error,
            fontSize: 11,
            marginTop: 6,
            fontWeight: '700',
            letterSpacing: 0.5,
            textTransform: 'uppercase',
          }}
        >
          {error}
        </Text>
      ) : hint ? (
        <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 6 }}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}
