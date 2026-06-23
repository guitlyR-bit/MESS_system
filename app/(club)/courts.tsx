import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/lib/theme';
import { StatTile } from '@/components/ui/StatTile';
import { ActionTile } from '@/components/ui/ActionTile';
import { MOCK_COURTS, MOCK_MY_BOOKINGS, fmtHour, fmtDay, SPORT_LABELS, SURFACE_LABELS } from '@/lib/mockData';

const W = colors.warm;

const SPORT_COLORS: Record<string, string> = {
  tennis: W.yellow, badminton: W.amber, squash: W.orange,
  padel: W.rose, volleyball: W.pink,
};

// Filtrujeme jen kurty tohoto klubu (mock: club_id === 'club1')
const MY_COURTS = MOCK_COURTS.filter(c => c.club_id === 'club1');
const MY_BOOKINGS = MOCK_MY_BOOKINGS; // v reálné verzi přijdou ze Supabase

type Tab = 'courts' | 'bookings';

export default function ClubCourtsScreen() {
  const [tab, setTab] = useState<Tab>('courts');

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      {/* Přepínač záložek */}
      <View style={s.tabBar}>
        <TouchableOpacity
          onPress={() => setTab('courts')}
          style={[s.tabBtn, tab === 'courts' && s.tabBtnActive]}
        >
          <Text style={[s.tabBtnText, tab === 'courts' && s.tabBtnTextActive]}>
            SPORTOVIŠTĚ
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setTab('bookings')}
          style={[s.tabBtn, tab === 'bookings' && s.tabBtnActive]}
        >
          <Text style={[s.tabBtnText, tab === 'bookings' && s.tabBtnTextActive]}>
            REZERVACE
          </Text>
        </TouchableOpacity>
      </View>

      {tab === 'courts' ? <CourtsTab /> : <BookingsTab />}
    </SafeAreaView>
  );
}

// ─── Záložka Sportoviště ───────────────────────────────────────────────────────

function CourtsTab() {
  return (
    <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

      <View style={s.statGrid}>
        <View style={s.row}>
          <StatTile label="Celkem" value={MY_COURTS.length} sub="sportovišť" accent={W.yellow} />
          <StatTile label="Aktivní" value={MY_COURTS.filter(c => c.is_active).length} sub="v provozu" accent={W.amber} />
        </View>
      </View>

      <View style={s.sectionHeader}>
        <Text style={s.sectionTitle}>MOJE SPORTOVIŠTĚ</Text>
        <TouchableOpacity style={[s.addBtn, { backgroundColor: W.yellow }]}>
          <Text style={s.addBtnText}>+ PŘIDAT</Text>
        </TouchableOpacity>
      </View>

      {MY_COURTS.map(court => {
        const accent = SPORT_COLORS[court.sport] ?? W.yellow;
        return (
          <TouchableOpacity key={court.id} activeOpacity={0.82} style={s.courtRow}>
            <View style={[s.courtAccent, { backgroundColor: accent }]} />
            <View style={s.courtInfo}>
              <View style={s.courtInfoRow}>
                <Text style={s.courtName}>{court.name}</Text>
                <View style={[s.statusBadge, court.is_active ? s.statusActive : s.statusInactive]}>
                  <Text style={s.statusText}>{court.is_active ? 'AKTIVNÍ' : 'NEAKTIVNÍ'}</Text>
                </View>
              </View>
              <Text style={s.courtMeta}>
                {SPORT_LABELS[court.sport]} · {SURFACE_LABELS[court.surface]} · {court.is_indoor ? 'Hala' : 'Venkovní'}
              </Text>
              <Text style={s.courtPrice}>{court.price_per_hour} Kč/hod · max {court.capacity} hráčů</Text>
            </View>
            <Text style={s.chevron}>›</Text>
          </TouchableOpacity>
        );
      })}

      <View style={s.gap} />
      <ActionTile label="Ceník a sazby"      description="Editace cen a slev"            accent={W.yellow} badge="BRZY" />
      <ActionTile label="Otevírací doby"     description="Nastavení dostupnosti"         accent={W.amber}  badge="BRZY" />
      <ActionTile label="Uzavírky a výluky"  description="Blokování termínů"             accent={W.orange} badge="BRZY" />

    </ScrollView>
  );
}

// ─── Záložka Rezervace ────────────────────────────────────────────────────────

function BookingsTab() {
  return (
    <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

      <View style={s.statGrid}>
        <View style={s.row}>
          <StatTile label="Dnes" value={0} sub="rezervací"        accent={W.yellow} />
          <StatTile label="Čeká" value={MY_BOOKINGS.length} sub="nadcházejících" accent={W.amber}  />
        </View>
      </View>

      <Text style={s.sectionTitle}>NADCHÁZEJÍCÍ REZERVACE</Text>

      {MY_BOOKINGS.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyTitle}>Žádné rezervace</Text>
          <Text style={s.emptySub}>Rezervace hráčů se zobrazí zde</Text>
        </View>
      ) : (
        MY_BOOKINGS.map(booking => {
          const accent = SPORT_COLORS[booking.court_sport] ?? W.yellow;
          const start  = new Date(booking.starts_at);
          const fmt    = fmtDay(start);
          const hour   = start.getHours();
          return (
            <View key={booking.id} style={[s.bookingRow, { borderLeftColor: accent }]}>
              <View style={[s.bookingDate, { backgroundColor: accent }]}>
                <Text style={s.bookingDateNum}>{fmt.num}</Text>
                <Text style={s.bookingDateDay}>{fmt.short}</Text>
              </View>
              <View style={s.bookingInfo}>
                <Text style={s.bookingCourt}>{booking.court_name}</Text>
                <Text style={s.bookingTime}>{fmtHour(hour)} – {fmtHour(hour + 1)}</Text>
                <Text style={s.bookingPlayer}>Hráč ID: {booking.player_id}</Text>
              </View>
              <View style={s.bookingRight}>
                <Text style={s.bookingPrice}>{booking.price} Kč</Text>
                <View style={s.confirmedBadge}>
                  <Text style={s.confirmedText}>✓ Potvrzeno</Text>
                </View>
              </View>
            </View>
          );
        })
      )}

      <View style={s.gap} />
      <ActionTile label="Export rezervací" description="CSV nebo tisk přehledu" accent={W.yellow} badge="BRZY" />

    </ScrollView>
  );
}

const s = StyleSheet.create({
  safe:  { flex: 1, backgroundColor: colors.bgAlt },
  scroll: { flexGrow: 1 },

  // Přepínač záložek
  tabBar: { flexDirection: 'row', backgroundColor: '#111111', borderBottomWidth: 0 },
  tabBtn: { flex: 1, height: 46, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 3, borderBottomColor: 'transparent' },
  tabBtnActive: { borderBottomColor: W.yellow },
  tabBtnText: { fontSize: 11, fontWeight: '800', color: '#666', letterSpacing: 1 },
  tabBtnTextActive: { color: W.yellow },

  // Statistiky
  statGrid: { backgroundColor: colors.bgAlt, padding: 4, gap: 4 },
  row:      { flexDirection: 'row', gap: 4 },

  // Sekce header
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  sectionTitle: { fontSize: 10, fontWeight: '900', color: colors.textMuted, letterSpacing: 1.5, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  addBtn: { paddingHorizontal: 12, paddingVertical: 6 },
  addBtnText: { fontSize: 10, fontWeight: '900', color: '#111', letterSpacing: 1 },

  // Řádek kurtu
  courtRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  courtAccent: { width: 4, alignSelf: 'stretch' },
  courtInfo: { flex: 1, padding: 14, gap: 3 },
  courtInfoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  courtName: { fontSize: 15, fontWeight: '800', color: colors.textPrimary },
  courtMeta: { fontSize: 12, color: colors.textMuted },
  courtPrice: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3 },
  statusActive: { backgroundColor: '#DCFCE7' },
  statusInactive: { backgroundColor: '#FEE2E2' },
  statusText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.8, color: colors.textPrimary },
  chevron: { paddingRight: 14, fontSize: 18, color: colors.borderStrong },

  // Rezervace
  bookingRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderLeftWidth: 4, borderBottomWidth: 1, borderBottomColor: colors.border },
  bookingDate: { width: 52, alignItems: 'center', alignSelf: 'stretch', justifyContent: 'center', gap: 2 },
  bookingDateNum: { fontSize: 20, fontWeight: '900', color: '#fff' },
  bookingDateDay: { fontSize: 9, fontWeight: '800', color: 'rgba(255,255,255,0.75)', letterSpacing: 1 },
  bookingInfo: { flex: 1, padding: 14, gap: 3 },
  bookingCourt: { fontSize: 14, fontWeight: '800', color: colors.textPrimary },
  bookingTime:  { fontSize: 12, color: colors.textMuted },
  bookingPlayer: { fontSize: 11, color: colors.textDisabled },
  bookingRight: { paddingRight: 14, alignItems: 'flex-end', gap: 4 },
  bookingPrice: { fontSize: 15, fontWeight: '900', color: colors.textPrimary },
  confirmedBadge: { backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 3 },
  confirmedText: { fontSize: 10, fontWeight: '800', color: '#15803D' },

  // Empty state
  empty: { backgroundColor: colors.surface, padding: 24, margin: 16, borderLeftWidth: 4, borderLeftColor: colors.border, gap: 6 },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: colors.textPrimary },
  emptySub: { fontSize: 13, color: colors.textMuted },

  gap: { height: 3, backgroundColor: '#111111', marginTop: 16 },
});
