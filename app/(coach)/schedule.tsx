import { Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@/components/ui/Card';

export default function CoachScheduleScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0F1923' }} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        <Text style={{ color: '#FFFFFF', fontSize: 26, fontWeight: '700', marginBottom: 8 }}>
          Rozvrh
        </Text>

        <Card>
          <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600', marginBottom: 8 }}>
            📅 Týdenní přehled
          </Text>
          <Text style={{ color: '#4A5568', fontSize: 14 }}>
            Kalendář tréninků – připravuje se
          </Text>
        </Card>

        <Card>
          <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600', marginBottom: 8 }}>
            ➕ Nový trénink
          </Text>
          <Text style={{ color: '#4A5568', fontSize: 14 }}>
            Plánování tréninků – připravuje se
          </Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
