import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Image, Linking, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/lib/theme';
import { ActionTile } from '@/components/ui/ActionTile';
import { useClubProfile } from '@/hooks/useClubProfile';
import { useClubSettings } from '@/hooks/useClubSettings';
import { pickClubImage } from '@/lib/pickClubImage';
import { buildGoogleMapsUrl, formatClubAddressLine, formatCoordinates } from '@/lib/clubMaps';
import { geocodeAddress } from '@/lib/geocodeAddress';
import { ClubOpeningHoursSection } from '@/components/club/ClubOpeningHoursSection';
import { ClubProfileExtrasSection } from '@/components/club/ClubProfileExtrasSection';
import { ClubProfileColorSection } from '@/components/club/ClubProfileColorSection';
import { ClubProfilePricingSection } from '@/components/club/ClubProfilePricingSection';
import { ClubProfilePreviewModal } from '@/components/club/ClubProfilePreviewModal';
import { resolveClubProfileTheme } from '@/lib/clubProfileTheme';

const W = colors.warm;
const GEOCODE_MIN_LENGTH = 5;
const GEOCODE_DEBOUNCE_MS = 900;

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoCapitalize,
  prefix,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'url' | 'decimal-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words';
  prefix?: string;
}) {
  return (
    <View style={s.fieldWrap}>
      <Text style={s.fieldLabel}>{label}</Text>
      <View style={s.fieldInputRow}>
        {prefix ? <Text style={s.fieldPrefix}>{prefix}</Text> : null}
        <TextInput
          style={[s.fieldInput, prefix && s.fieldInputWithPrefix]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textDisabled}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize ?? 'sentences'}
          autoCorrect={false}
        />
      </View>
    </View>
  );
}

export default function ClubProfileScreen() {
  const { profile, updateProfile } = useClubProfile();
  const settings = useClubSettings();
  const { accent } = resolveClubProfileTheme(profile);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [mapQuery, setMapQuery] = useState(() => formatClubAddressLine(profile));
  const [geocodeLoading, setGeocodeLoading] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);
  const [geocodeSuccess, setGeocodeSuccess] = useState<string | null>(null);
  const lastGeocodedQueryRef = useRef('');
  const geocodeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipAutoGeocodeRef = useRef(true);

  useEffect(() => {
    setMapQuery(formatClubAddressLine(profile));
  }, [profile.address, profile.city, profile.country]);

  useEffect(() => {
    if (skipAutoGeocodeRef.current) {
      skipAutoGeocodeRef.current = false;
      if (profile.latitude != null && profile.longitude != null) {
        lastGeocodedQueryRef.current = formatClubAddressLine(profile).trim();
      }
    }
  }, [profile.latitude, profile.longitude, profile.address, profile.city, profile.country]);

  const runGeocode = useCallback(async (query: string, force = false) => {
    const trimmed = query.trim();
    if (trimmed.length < GEOCODE_MIN_LENGTH) return;
    if (!force && trimmed === lastGeocodedQueryRef.current) return;

    setGeocodeLoading(true);
    setGeocodeError(null);
    if (!force) setGeocodeSuccess(null);
    try {
      const result = await geocodeAddress(trimmed);
      if (!result) {
        setGeocodeError('Adresa nenalezena. Upřesněte text a zkuste znovu.');
        return;
      }
      updateProfile({ latitude: result.latitude, longitude: result.longitude });
      lastGeocodedQueryRef.current = trimmed;
      setGeocodeSuccess(`Souřadnice načteny (${result.latitude.toFixed(5)}, ${result.longitude.toFixed(5)})`);
    } catch (err) {
      setGeocodeError(err instanceof Error ? err.message : 'Vyhledání adresy selhalo.');
    } finally {
      setGeocodeLoading(false);
    }
  }, [updateProfile]);

  useEffect(() => {
    const trimmed = mapQuery.trim();
    if (trimmed.length < GEOCODE_MIN_LENGTH) return;
    if (trimmed === lastGeocodedQueryRef.current) return;

    if (geocodeTimerRef.current) clearTimeout(geocodeTimerRef.current);
    geocodeTimerRef.current = setTimeout(() => {
      runGeocode(trimmed);
    }, GEOCODE_DEBOUNCE_MS);

    return () => {
      if (geocodeTimerRef.current) clearTimeout(geocodeTimerRef.current);
    };
  }, [mapQuery, runGeocode]);

  async function handlePickLogo() {
    const uri = await pickClubImage([1, 1]);
    if (uri) updateProfile({ logo_url: uri });
  }

  async function handlePickCover() {
    const uri = await pickClubImage([16, 9]);
    if (uri) updateProfile({ cover_image_url: uri });
  }

  function openGoogleMaps() {
    Linking.openURL(buildGoogleMapsUrl(profile));
  }

  function handleGeocodeFromAddress() {
    runGeocode(mapQuery, true);
  }

  function applyMapQueryToProfileFields() {
    const parts = mapQuery.split(',').map(p => p.trim()).filter(Boolean);
    if (parts.length >= 3) {
      updateProfile({
        address: parts[0],
        city: parts[1],
        country: parts.slice(2).join(', '),
      });
    } else if (parts.length === 2) {
      updateProfile({ address: parts[0], city: parts[1] });
    } else if (parts.length === 1) {
      updateProfile({ address: parts[0] });
    }
  }

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        <TouchableOpacity
          onPress={() => setPreviewVisible(true)}
          style={s.previewBtn}
          activeOpacity={0.85}
        >
          <Ionicons name="eye-outline" size={18} color="#fff" />
          <Text style={s.previewBtnText}>NÁHLED PROFILU</Text>
        </TouchableOpacity>

        {/* Úvodní fotografie + logo */}
        <View style={s.visualSection}>
          <TouchableOpacity onPress={handlePickCover} activeOpacity={0.9} style={s.coverTouch}>
            {profile.cover_image_url ? (
              <Image source={{ uri: profile.cover_image_url }} style={s.coverImage} resizeMode="cover" />
            ) : (
              <View style={s.coverPlaceholder}>
                <Ionicons name="image-outline" size={32} color={colors.textMuted} />
                <Text style={s.coverPlaceholderText}>Úvodní fotografie profilu</Text>
              </View>
            )}
            <View style={s.coverEditBadge}>
              <Ionicons name="camera" size={14} color="#fff" />
              <Text style={s.coverEditText}>ZMĚNIT</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity onPress={handlePickLogo} activeOpacity={0.85} style={s.logoTouch}>
            {profile.logo_url ? (
              <Image source={{ uri: profile.logo_url }} style={s.logoImage} resizeMode="cover" />
            ) : (
              <View style={s.logoPlaceholder}>
                <Ionicons name="tennisball-outline" size={28} color={accent} />
              </View>
            )}
            <View style={[s.logoEditRing, { backgroundColor: accent }]}>
              <Ionicons name="camera" size={12} color="#fff" />
            </View>
          </TouchableOpacity>
        </View>

        <ClubProfileColorSection profile={profile} updateProfile={updateProfile} />

        <View style={s.formSection}>
          <Text style={s.sectionTitle}>OBECNÉ ÚDAJE</Text>
          <Field
            label="NÁZEV KLUBU"
            value={profile.name}
            onChangeText={(name) => updateProfile({ name })}
            placeholder="Název klubu"
          />
          <Field
            label="ADRESA"
            value={profile.address}
            onChangeText={(address) => updateProfile({ address })}
            placeholder="Ulice a číslo"
          />
          <View style={s.rowFields}>
            <View style={s.rowField}>
              <Field
                label="MĚSTO"
                value={profile.city}
                onChangeText={(city) => updateProfile({ city })}
                placeholder="Praha"
              />
            </View>
            <View style={s.rowField}>
              <Field
                label="ZEMĚ"
                value={profile.country}
                onChangeText={(country) => updateProfile({ country })}
                placeholder="Česko"
              />
            </View>
          </View>
        </View>

        <ClubProfileExtrasSection profile={profile} updateProfile={updateProfile} />

        <View style={s.formSection}>
          <Text style={s.sectionTitle}>KONTAKT A WEB</Text>
          <Field
            label="ODPOVĚDNÝ VEDOUCÍ / SPRÁVCE"
            value={profile.manager_name ?? ''}
            onChangeText={(manager_name) => updateProfile({ manager_name })}
            placeholder="Jméno a příjmení"
            autoCapitalize="words"
          />
          <Field
            label="E-MAIL"
            value={profile.email ?? ''}
            onChangeText={(email) => updateProfile({ email })}
            placeholder="info@klub.cz"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Field
            label="TELEFON"
            value={profile.phone ?? ''}
            onChangeText={(phone) => updateProfile({ phone })}
            placeholder="+420 …"
            keyboardType="phone-pad"
          />
          <Field
            label="WEB"
            value={profile.website ?? ''}
            onChangeText={(website) => updateProfile({ website })}
            placeholder="https://www.klub.cz"
            keyboardType="url"
            autoCapitalize="none"
          />
          <Field
            label="INSTAGRAM"
            value={profile.instagram ?? ''}
            onChangeText={(instagram) => updateProfile({ instagram: instagram.replace(/^@/, '') })}
            placeholder="uzivatel"
            autoCapitalize="none"
            prefix="@"
          />
        </View>

        <View style={s.formSection}>
          <Text style={s.sectionTitle}>POLOHA — GOOGLE MAPY</Text>
          <Text style={s.sectionHint}>
            Zadejte adresu do řádku níže — po krátké pauze systém automaticky načte souřadnice pro odkaz v Google Maps.
          </Text>

          <Text style={s.fieldLabel}>ADRESA PRO MAPY</Text>
          <TextInput
            style={s.mapQueryInput}
            value={mapQuery}
            onChangeText={setMapQuery}
            placeholder="Ulice, město, země"
            placeholderTextColor={colors.textDisabled}
            autoCorrect={false}
          />

          <View style={s.mapActions}>
            <TouchableOpacity
              onPress={handleGeocodeFromAddress}
              style={[s.geocodeBtn, { backgroundColor: accent }, geocodeLoading && s.geocodeBtnDisabled]}
              disabled={geocodeLoading}
              activeOpacity={0.85}
            >
              {geocodeLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="search" size={16} color="#fff" />
              )}
              <Text style={s.geocodeBtnText}>Vyhledat znovu</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={applyMapQueryToProfileFields}
              style={s.applyAddressBtn}
              activeOpacity={0.85}
            >
              <Text style={s.applyAddressBtnText}>Použít jako adresu klubu</Text>
            </TouchableOpacity>
          </View>

          {geocodeError && <Text style={s.geocodeError}>{geocodeError}</Text>}
          {geocodeSuccess && <Text style={s.geocodeSuccess}>{geocodeSuccess}</Text>}

          <Text style={s.coordsSummary}>
            Souřadnice: {formatCoordinates(profile.latitude, profile.longitude)}
          </Text>

          <TouchableOpacity onPress={openGoogleMaps} style={[s.mapsBtn, { borderColor: accent }]} activeOpacity={0.85}>
            <Ionicons name="map-outline" size={18} color={accent} />
            <Text style={[s.mapsBtnText, { color: accent }]}>Otevřít v Google Maps</Text>
          </TouchableOpacity>

          {(profile.latitude != null || profile.longitude != null) && (
            <TouchableOpacity
              onPress={() => {
                updateProfile({ latitude: null, longitude: null });
                setGeocodeSuccess(null);
              }}
              style={s.clearCoordsBtn}
            >
              <Text style={s.clearCoordsText}>Smazat souřadnice</Text>
            </TouchableOpacity>
          )}
        </View>

        <ClubProfilePricingSection />

        <ClubOpeningHoursSection />

        <View style={s.actions}>
          <ActionTile label="Fakturační údaje" description="IČO, bankovní spojení" accent={W.orange} badge="BRZY" />
          <ActionTile label="Nastavení účtu" description="Notifikace a oprávnění" accent={W.rose} badge="BRZY" />
        </View>

        <TouchableOpacity onPress={() => router.replace('/')} activeOpacity={0.85} style={s.logoutBtn}>
          <Text style={s.logoutText}>ODHLÁSIT SE</Text>
        </TouchableOpacity>

      </ScrollView>

      <ClubProfilePreviewModal
        visible={previewVisible}
        profile={profile}
        settings={settings}
        onClose={() => setPreviewVisible(false)}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgAlt },
  scroll: { flexGrow: 1, paddingBottom: 24 },

  previewBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginHorizontal: 16, marginTop: 12, marginBottom: 4,
    paddingVertical: 12, backgroundColor: '#111',
  },
  previewBtnText: { fontSize: 12, fontWeight: '900', color: '#fff', letterSpacing: 1 },

  visualSection: { backgroundColor: colors.surface, marginBottom: 8 },
  coverTouch: { height: 160, backgroundColor: colors.bgAlt, position: 'relative' },
  coverImage: { width: '100%', height: '100%' },
  coverPlaceholder: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  coverPlaceholderText: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
  coverEditBadge: {
    position: 'absolute', bottom: 10, right: 10,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 10, paddingVertical: 6,
  },
  coverEditText: { fontSize: 10, fontWeight: '900', color: '#fff', letterSpacing: 1 },

  logoTouch: {
    position: 'absolute', left: 16, bottom: -28,
    width: 88, height: 88, borderRadius: 44,
    borderWidth: 3, borderColor: colors.surface,
    backgroundColor: colors.bgAlt,
    overflow: 'hidden',
  },
  logoImage: { width: '100%', height: '100%' },
  logoPlaceholder: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.club.accentFade,
  },
  logoEditRing: {
    position: 'absolute', bottom: 4, right: 4,
    width: 24, height: 24, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },

  formSection: {
    marginTop: 40,
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 11, fontWeight: '900', color: colors.textMuted,
    letterSpacing: 1.5, marginBottom: 4,
  },
  sectionHint: {
    fontSize: 12, color: colors.textMuted, lineHeight: 18, marginBottom: 8,
  },

  fieldWrap: { marginBottom: 4 },
  fieldLabel: {
    fontSize: 10, fontWeight: '800', color: colors.textMuted,
    letterSpacing: 1, marginTop: 10,
  },
  fieldInputRow: { flexDirection: 'row', alignItems: 'center' },
  fieldPrefix: {
    marginTop: 6, marginRight: 4,
    fontSize: 15, fontWeight: '800', color: colors.textSecondary,
  },
  fieldInput: {
    flex: 1, height: 48, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 14, fontSize: 15, color: colors.textPrimary, marginTop: 6,
    backgroundColor: colors.bgAlt,
  },
  fieldInputWithPrefix: { paddingLeft: 8 },

  rowFields: { flexDirection: 'row', gap: 10 },
  rowField: { flex: 1 },

  mapQueryInput: {
    height: 48, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 14, fontSize: 15, color: colors.textPrimary,
    backgroundColor: colors.bgAlt, marginTop: 6,
  },
  mapActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  geocodeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 12, paddingHorizontal: 14,
  },
  geocodeBtnDisabled: { opacity: 0.7 },
  geocodeBtnText: { fontSize: 12, fontWeight: '900', color: '#fff', letterSpacing: 0.3 },
  applyAddressBtn: {
    paddingVertical: 12, paddingHorizontal: 14,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bgAlt,
  },
  applyAddressBtnText: { fontSize: 12, fontWeight: '800', color: colors.textSecondary },

  geocodeError: { fontSize: 12, fontWeight: '700', color: W.red, marginTop: 10 },
  geocodeSuccess: { fontSize: 12, fontWeight: '700', color: colors.success, marginTop: 10 },

  coordsSummary: {
    fontSize: 11, fontWeight: '700', color: colors.textMuted, marginTop: 12,
  },
  mapsBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 12, paddingVertical: 12, paddingHorizontal: 14,
    borderWidth: 1.5, alignSelf: 'flex-start',
  },
  mapsBtnText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.3 },
  clearCoordsBtn: { marginTop: 10, paddingVertical: 8 },
  clearCoordsText: { fontSize: 12, fontWeight: '700', color: colors.textMuted },

  actions: { marginTop: 16 },
  logoutBtn: {
    backgroundColor: '#111111', height: 56,
    justifyContent: 'center', alignItems: 'center', margin: 16,
  },
  logoutText: { color: '#fff', fontSize: 13, fontWeight: '900', letterSpacing: 2 },
});
