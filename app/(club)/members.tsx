import { Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@/components/ui/Card';

export default function ClubMembersScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0F1923' }} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        <Text style={{ color: '#FFFFFF', fontSize: 26, fontWeight: '700', marginBottom: 8 }}>
          Členové
        </Text>

        <Card>
          <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600', marginBottom: 8 }}>
            👥 Seznam členů
          </Text>
          <Text style={{ color: '#4A5568', fontSize: 14 }}>Zatím žádní registrovaní členové</Text>
        </Card>

        <Card>
          <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600', marginBottom: 8 }}>
            📨 Pozvánky
          </Text>
          <Text style={{ color: '#4A5568', fontSize: 14 }}>
            Správa členství a pozvánek – připravuje se
          </Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
