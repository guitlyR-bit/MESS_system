import { Link } from 'expo-router';
import { Text, View } from 'react-native';

import { ScreenPlaceholder } from '@/components/ScreenPlaceholder';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function ProfileScreen() {
  return (
    <View className="flex-1 bg-gray-50">
      <ScreenPlaceholder
        title="Profil"
        description="Profil hráče, úroveň hry a nastavení účtu."
      />
      <View className="px-4 pb-8">
        <Card className="mt-4">
          <Text className="mb-3 text-sm text-gray-600">Účet (placeholder)</Text>
          <Link href="/(auth)/login" asChild>
            <Button title="Přihlásit se" variant="secondary" />
          </Link>
        </Card>
      </View>
    </View>
  );
}
