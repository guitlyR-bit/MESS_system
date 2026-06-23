import { Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';

type ScreenPlaceholderProps = {
  title: string;
  description: string;
};

export function ScreenPlaceholder({ title, description }: ScreenPlaceholderProps) {
  return (
    <View className="flex-1 bg-gray-50 px-4 pt-6">
      <Card>
        <Text className="text-2xl font-bold text-tennis-800">{title}</Text>
        <Text className="mt-2 text-base text-gray-600">{description}</Text>
      </Card>
    </View>
  );
}
