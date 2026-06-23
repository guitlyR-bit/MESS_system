import { View, Text, TextInput, TextInputProps, ViewStyle } from 'react-native';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  containerStyle?: ViewStyle;
}

export function Input({ label, error, hint, containerStyle, style, ...props }: InputProps) {
  return (
    <View style={containerStyle}>
      {label && (
        <Text
          style={{
            color: '#9CA3AF',
            fontSize: 13,
            fontWeight: '600',
            marginBottom: 8,
          }}
        >
          {label}
        </Text>
      )}
      <TextInput
        placeholderTextColor="#4A5568"
        style={[
          {
            backgroundColor: '#1A2634',
            borderWidth: 1,
            borderColor: error ? '#EF4444' : '#2D3748',
            borderRadius: 12,
            paddingHorizontal: 16,
            paddingVertical: 14,
            color: '#FFFFFF',
            fontSize: 16,
          },
          style,
        ]}
        {...props}
      />
      {error ? (
        <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 5 }}>{error}</Text>
      ) : hint ? (
        <Text style={{ color: '#6B7280', fontSize: 12, marginTop: 5 }}>{hint}</Text>
      ) : null}
    </View>
  );
}
