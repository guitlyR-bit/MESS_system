import * as ImagePicker from 'expo-image-picker';
import { Platform, Alert } from 'react-native';

export async function pickClubImage(aspect: [number, number] = [1, 1]): Promise<string | null> {
  if (Platform.OS !== 'web') {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        'Přístup ke galerii',
        'Pro nahrání fotografie povolte přístup ke galerii v nastavení zařízení.',
      );
      return null;
    }
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect,
    quality: 0.85,
  });

  if (result.canceled || !result.assets[0]) return null;
  return result.assets[0].uri;
}
