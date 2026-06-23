import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@/components/ui/Card';

export default function PlayerHomeScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0F1923' }} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        {/* Greeting */}
        <View style={{ marginBottom: 8 }}>
          <Text style={{ color: '#6B7280', fontSize: 14 }}>Dobré ráno 👋</Text>
          <Text style={{ color: '#FFFFFF', fontSize: 26, fontWeight: '700', marginTop: 4 }}>
            Domů
          </Text>
        </View>

        {/* Quick stats */}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Card style={{ flex: 1 }}>
            <Text style={{ color: '#6B7280', fontSize: 12 }}>Rezervace</Text>
            <Text style={{ color: '#2D9148', fontSize: 28, fontWeight: '800', marginTop: 4 }}>
              0
            </Text>
            <Text style={{ color: '#4A5568', fontSize: 11, marginTop: 2 }}>tento týden</Text>
          </Card>
          <Card style={{ flex: 1 }}>
            <Text style={{ color: '#6B7280', fontSize: 12 }}>Zápasy</Text>
            <Text style={{ color: '#2D9148', fontSize: 28, fontWeight: '800', marginTop: 4 }}>
              0
            </Text>
            <Text style={{ color: '#4A5568', fontSize: 11, marginTop: 2 }}>odehráno</Text>
          </Card>
        </View>

        <Card>
          <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600', marginBottom: 8 }}>
            Nadcházející rezervace
          </Text>
          <Text style={{ color: '#4A5568', fontSize: 14 }}>Žádné nadcházející rezervace</Text>
        </Card>

        <Card>
          <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600', marginBottom: 8 }}>
            Poslední výsledky
          </Text>
          <Text style={{ color: '#4A5568', fontSize: 14 }}>Zatím žádné odehrané zápasy</Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
