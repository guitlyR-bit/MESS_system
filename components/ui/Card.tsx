import { View, ViewProps } from 'react-native';
import { ReactNode } from 'react';
import { colors } from '@/lib/theme';

type Variant = 'default' | 'accent' | 'flat';
type Padding  = 'none' | 'sm' | 'md' | 'lg';

interface CardProps extends ViewProps {
  children: ReactNode;
  variant?: Variant;
  padding?: Padding;
  accentColor?: string;
  backgroundColor?: string;
}

const PADDING = { none: 0, sm: 12, md: 16, lg: 24 };

export function Card({
  children,
  variant = 'default',
  padding = 'md',
  accentColor,
  backgroundColor,
  style,
  ...props
}: CardProps) {
  return (
    <View
      style={[
        {
          backgroundColor: backgroundColor ?? colors.surface,
          padding: PADDING[padding],
          borderWidth: variant === 'flat' ? 0 : 1,
          borderColor: colors.border,
          overflow: 'hidden',
        },
        style,
      ]}
      {...props}
    >
      {variant === 'accent' && accentColor && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            width: 4,
            backgroundColor: accentColor,
          }}
        />
      )}
      {children}
    </View>
  );
}
