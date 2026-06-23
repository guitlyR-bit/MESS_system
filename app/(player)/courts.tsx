import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@/components/ui/Card';

export default function PlayerCourtsScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0F1923' }} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        <Text style={{ color: '#FFFFFF', fontSize: 26, fontWeight: '700', marginBottom: 8 }}>
          Kurty
        </Text>
        <Text style={{ color: '#6B7280', fontSize: 14, marginBottom: 8 }}>
          Dostupné kurty k rezervaci
        </Text>

        <Card>
          <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600', marginBottom: 8 }}>
            🔍 Hledat kurty
          </Text>
          <Text style={{ color: '#4A5568', fontSize: 14 }}>
            Filtrování a rezervace kurtů – připravuje se
          </Text>
        </Card>

        <Card>
          <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600', marginBottom: 8 }}>
            📍 Kurty v okolí
          </Text>
          <Text style={{ color: '#4A5568', fontSize: 14 }}>
            Geolokace a mapa kurtů – připravuje se
          </Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
