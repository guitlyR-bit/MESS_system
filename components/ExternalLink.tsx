import { Link } from 'expo-router';
import { Linking } from 'react-native';
import type { ComponentProps } from 'react';
import { Platform } from 'react-native';

export function ExternalLink(props: Omit<ComponentProps<typeof Link>, 'href'> & { href: string }) {
  return (
    <Link
      target="_blank"
      {...props}
      href={props.href}
      onPress={(e) => {
        if (Platform.OS !== 'web') {
          e.preventDefault();
          Linking.openURL(props.href as string);
        }
      }}
    />
  );
}
