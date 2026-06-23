import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@/components/ui/Card';

export default function CoachHomeScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0F1923' }} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        <View style={{ marginBottom: 8 }}>
          <Text style={{ color: '#6B7280', fontSize: 14 }}>Vítejte zpět 📋</Text>
          <Text style={{ color: '#FFFFFF', fontSize: 26, fontWeight: '700', marginTop: 4 }}>
            Přehled trenéra
          </Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Card style={{ flex: 1 }}>
            <Text style={{ color: '#6B7280', fontSize: 12 }}>Svěřenci</Text>
            <Text style={{ color: '#2980B9', fontSize: 28, fontWeight: '800', marginTop: 4 }}>
              0
            </Text>
          </Card>
          <Card style={{ flex: 1 }}>
            <Text style={{ color: '#6B7280', fontSize: 12 }}>Tréninky</Text>
            <Text style={{ color: '#2980B9', fontSize: 28, fontWeight: '800', marginTop: 4 }}>
              0
            </Text>
            <Text style={{ color: '#4A5568', fontSize: 11, marginTop: 2 }}>tento týden</Text>
          </Card>
        </View>

        <Card>
          <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600', marginBottom: 8 }}>
            Dnešní program
          </Text>
          <Text style={{ color: '#4A5568', fontSize: 14 }}>Žádné tréninky naplánované</Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
