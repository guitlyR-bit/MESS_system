import { View, ViewProps } from 'react-native';
import { ReactNode } from 'react';

interface CardProps extends ViewProps {
  children: ReactNode;
  variant?: 'default' | 'outlined' | 'elevated';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const PADDING = { none: 0, sm: 12, md: 16, lg: 24 };

export function Card({
  children,
  variant = 'default',
  padding = 'md',
  style,
  ...props
}: CardProps) {
  return (
    <View
      style={[
        {
          backgroundColor: '#1A2634',
          borderRadius: 16,
          padding: PADDING[padding],
          ...(variant === 'outlined' && {
            borderWidth: 1,
            borderColor: '#2D3748',
          }),
          ...(variant === 'elevated' && {
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 5,
          }),
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}
