import { Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@/components/ui/Card';

export default function ClubCourtsScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0F1923' }} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        <Text style={{ color: '#FFFFFF', fontSize: 26, fontWeight: '700', marginBottom: 8 }}>
          Správa kurtů
        </Text>

        <Card>
          <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600', marginBottom: 8 }}>
            🎾 Přehled kurtů
          </Text>
          <Text style={{ color: '#4A5568', fontSize: 14 }}>Zatím žádné kurty přidány</Text>
        </Card>

        <Card>
          <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600', marginBottom: 8 }}>
            ➕ Přidat kurt
          </Text>
          <Text style={{ color: '#4A5568', fontSize: 14 }}>
            Správa kurtů a ceníků – připravuje se
          </Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
