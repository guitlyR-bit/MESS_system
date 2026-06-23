import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Card } from '@/components/ui/Card';

export default function PlayerProfileScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0F1923' }} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        {/* Avatar */}
        <View style={{ alignItems: 'center', marginBottom: 8 }}>
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: '#2D9148',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 12,
            }}
          >
            <Text style={{ fontSize: 36 }}>👤</Text>
          </View>
          <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '700' }}>
            Hráč
          </Text>
          <Text style={{ color: '#6B7280', fontSize: 14 }}>hrac@email.cz</Text>
        </View>

        <Card>
          <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600', marginBottom: 12 }}>
            Osobní údaje
          </Text>
          <Text style={{ color: '#4A5568', fontSize: 14 }}>
            Editace profilu – připravuje se
          </Text>
        </Card>

        <Card>
          <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600', marginBottom: 8 }}>
            Moje statistiky
          </Text>
          <Text style={{ color: '#4A5568', fontSize: 14 }}>
            Výkonnostní přehled – připravuje se
          </Text>
        </Card>

        <TouchableOpacity
          onPress={() => router.replace('/')}
          style={{
            backgroundColor: '#1A2634',
            borderRadius: 12,
            paddingVertical: 14,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: '#EF444433',
          }}
        >
          <Text style={{ color: '#EF4444', fontWeight: '600' }}>Odhlásit se</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
