import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@/components/ui/Card';

export default function ClubHomeScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0F1923' }} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        <View style={{ marginBottom: 8 }}>
          <Text style={{ color: '#6B7280', fontSize: 14 }}>Správa klubu 🏟️</Text>
          <Text style={{ color: '#FFFFFF', fontSize: 26, fontWeight: '700', marginTop: 4 }}>
            Přehled klubu
          </Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Card style={{ flex: 1 }}>
            <Text style={{ color: '#6B7280', fontSize: 12 }}>Kurty</Text>
            <Text style={{ color: '#D4A017', fontSize: 28, fontWeight: '800', marginTop: 4 }}>
              0
            </Text>
          </Card>
          <Card style={{ flex: 1 }}>
            <Text style={{ color: '#6B7280', fontSize: 12 }}>Členové</Text>
            <Text style={{ color: '#D4A017', fontSize: 28, fontWeight: '800', marginTop: 4 }}>
              0
            </Text>
          </Card>
          <Card style={{ flex: 1 }}>
            <Text style={{ color: '#6B7280', fontSize: 12 }}>Rezervace</Text>
            <Text style={{ color: '#D4A017', fontSize: 28, fontWeight: '800', marginTop: 4 }}>
              0
            </Text>
            <Text style={{ color: '#4A5568', fontSize: 11, marginTop: 2 }}>dnes</Text>
          </Card>
        </View>

        <Card>
          <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600', marginBottom: 8 }}>
            Dnešní rezervace
          </Text>
          <Text style={{ color: '#4A5568', fontSize: 14 }}>Žádné rezervace na dnes</Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
