import { Link } from 'expo-router';
import { Text, View } from 'react-native';

import { ScreenPlaceholder } from '@/components/ScreenPlaceholder';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function HomeScreen() {
  return (
    <View className="flex-1 bg-gray-50">
      <ScreenPlaceholder
        title="Domů"
        description="Vítejte na tenisové platformě. Rezervace kurtů, zápasy a profil hráče — brzy."
      />
      <View className="px-4 pb-8">
        <Card className="mt-4">
          <Text className="mb-3 text-sm text-gray-600">Rychlé akce (placeholder)</Text>
          <Link href="/(auth)/login" asChild>
            <Button title="Přihlásit se" className="mb-2" />
          </Link>
          <Link href="/club" asChild>
            <Button title="Správa klubu" variant="outline" />
          </Link>
        </Card>
      </View>
    </View>
  );
}
