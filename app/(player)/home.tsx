import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/lib/theme';
import { StatTile } from '@/components/ui/StatTile';
import { useBookings } from '@/hooks/useBookings';
import { fmtHour, fmtDay, SPORT_LABELS } from '@/lib/mockData';
import type { BookingWithCourt } from '@/types/database';

const W = colors.warm;

const SPORT_COLORS: Record<string, string> = {
  tennis: W.orange, badminton: W.rose, squash: W.red,
  padel: W.amber, volleyball: W.yellow,
};

export default function PlayerHomeScreen() {
  const { upcomingBookings, activeBookings, cancelBooking } = useBookings();

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Statistiky */}
        <View style={s.statGrid}>
          <View style={s.row}>
            <StatTile label="Rezervace" value={activeBookings.length} sub="celkem aktivních" accent={W.orange} />
            <StatTile label="Nadcházející" value={upcomingBookings.length} sub="čeká na mě" accent={W.amber} />
          </View>
        </View>

        {/* Nadcházející rezervace */}
        <Text style={s.sectionTitle}>NADCHÁZEJÍCÍ REZERVACE</Text>

        {upcomingBookings.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyTitle}>Žádné nadcházející rezervace</Text>
            <Text style={s.emptySub}>Přejděte na záložku Kurty a rezervujte termín</Text>
          </View>
        ) : (
          upcomingBookings.slice(0, 5).map(booking => (
            <BookingCard key={booking.id} booking={booking} onCancel={cancelBooking} />
          ))
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

function BookingCard({ booking, onCancel }: {
  booking: BookingWithCourt;
  onCancel: (id: string) => void;
}) {
  const accent = SPORT_COLORS[booking.court_sport] ?? W.orange;
  const start = new Date(booking.starts_at);
  const fmt = fmtDay(start);
  const hour = start.getHours();

  return (
    <View style={[s.card, { borderLeftColor: accent }]}>
      <View style={s.cardMain}>
        {/* Datum + čas */}
        <View style={[s.cardDateBox, { backgroundColor: accent }]}>
          <Text style={s.cardDateNum}>{fmt.num}</Text>
          <Text style={s.cardDateMonth}>{fmt.month}</Text>
          <Text style={s.cardDateDay}>{fmt.short}</Text>
        </View>

        {/* Info */}
        <View style={s.cardInfo}>
          <View style={[s.sportTag, { backgroundColor: accent + '22' }]}>
            <Text style={[s.sportTagText, { color: accent }]}>
              {SPORT_LABELS[booking.court_sport] ?? booking.court_sport}
            </Text>
          </View>
          <Text style={s.cardName}>{booking.court_name}</Text>
          <Text style={s.cardClub}>{booking.club_name}</Text>
          <Text style={s.cardTime}>{fmtHour(hour)} – {fmtHour(hour + 1)} · {booking.price} Kč</Text>
        </View>
      </View>

      {/* Akce */}
      <TouchableOpacity
        onPress={() => onCancel(booking.id)}
        style={s.cancelBtn}
        activeOpacity={0.8}
      >
        <Text style={s.cancelBtnText}>ZRUŠIT</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: colors.bgAlt },
  scroll:  { flexGrow: 1 },
  statGrid: { backgroundColor: colors.bgAlt, padding: 4, gap: 4 },
  row:     { flexDirection: 'row', gap: 4 },

  sectionTitle: {
    fontSize: 10, fontWeight: '900', color: colors.textMuted,
    letterSpacing: 1.5, paddingHorizontal: 16, paddingTop: 20, paddingBottom: 8,
  },
  empty: {
    backgroundColor: colors.surface, padding: 24, margin: 16,
    borderLeftWidth: 4, borderLeftColor: colors.border, gap: 6,
  },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: colors.textPrimary },
  emptySub:   { fontSize: 13, color: colors.textMuted },

  // Karta rezervace
  card: {
    backgroundColor: colors.surface, borderLeftWidth: 4,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    paddingVertical: 14, paddingHorizontal: 16,
  },
  cardMain: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  cardDateBox: { width: 52, alignItems: 'center', paddingVertical: 8 },
  cardDateNum:   { fontSize: 22, fontWeight: '900', color: '#fff', lineHeight: 26 },
  cardDateMonth: { fontSize: 11, color: 'rgba(255,255,255,0.8)' },
  cardDateDay:   { fontSize: 9, fontWeight: '800', color: 'rgba(255,255,255,0.7)', letterSpacing: 1 },
  cardInfo: { flex: 1, gap: 3 },
  sportTag: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2 },
  sportTagText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  cardName: { fontSize: 15, fontWeight: '800', color: colors.textPrimary },
  cardClub: { fontSize: 12, color: colors.textMuted },
  cardTime: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
  cancelBtn: {
    marginTop: 12, alignSelf: 'flex-end',
    paddingHorizontal: 14, paddingVertical: 6,
    borderWidth: 1, borderColor: colors.error,
  },
  cancelBtnText: { fontSize: 10, fontWeight: '900', color: colors.error, letterSpacing: 1 },
});
