import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@/components/ui/Card';

export default function PlayerMatchesScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0F1923' }} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        <Text style={{ color: '#FFFFFF', fontSize: 26, fontWeight: '700', marginBottom: 8 }}>
          Zápasy
        </Text>

        <Card>
          <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600', marginBottom: 8 }}>
            📅 Naplánované zápasy
          </Text>
          <Text style={{ color: '#4A5568', fontSize: 14 }}>
            Žádné naplánované zápasy
          </Text>
        </Card>

        <Card>
          <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600', marginBottom: 8 }}>
            🏆 Výsledky a statistiky
          </Text>
          <Text style={{ color: '#4A5568', fontSize: 14 }}>
            Skóre, výhry a prohry – připravuje se
          </Text>
        </Card>

        <Card>
          <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600', marginBottom: 8 }}>
            🎯 Turnaje
          </Text>
          <Text style={{ color: '#4A5568', fontSize: 14 }}>
            Přehled turnajů a přihlašování – připravuje se
          </Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
