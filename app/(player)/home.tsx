import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/lib/theme';
import { StatTile } from '@/components/ui/StatTile';
import { BookingEditModal } from '@/components/ui/BookingEditModal';
import { useBookings } from '@/hooks/useBookings';
import { fmtDay, SPORT_LABELS, slotToTime } from '@/lib/mockData';
import type { BookingWithCourt } from '@/types/database';

const W = colors.warm;

const SPORT_COLORS: Record<string, string> = {
  tennis: W.orange, badminton: W.rose, squash: W.red,
  padel: W.amber, volleyball: W.yellow,
};

export default function PlayerHomeScreen() {
  const {
    upcomingBookings, activeBookings,
    cancelBooking, editBooking, getBookedSlotsExcluding,
  } = useBookings();

  const [editingBooking, setEditingBooking] = useState<BookingWithCourt | null>(null);

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Statistiky */}
        <View style={s.statGrid}>
          <View style={s.row}>
            <StatTile label="Rezervace"    value={activeBookings.length}   sub="celkem aktivních" accent={W.orange} />
            <StatTile label="Nadcházející" value={upcomingBookings.length} sub="čeká na mě"        accent={W.amber} />
          </View>
        </View>

        {/* Nadcházející rezervace */}
        <Text style={s.sectionTitle}>NADCHÁZEJÍCÍ REZERVACE</Text>

        {upcomingBookings.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyTitle}>Žádné nadcházející rezervace</Text>
            <Text style={s.emptySub}>Přejděte na záložku Rezervovat a vyberte termín</Text>
          </View>
        ) : (
          upcomingBookings.slice(0, 5).map(booking => (
            <BookingCard
              key={booking.id}
              booking={booking}
              onEdit={() => setEditingBooking(booking)}
              onCancel={cancelBooking}
            />
          ))
        )}

      </ScrollView>

      {/* Modal editace */}
      <BookingEditModal
        booking={editingBooking}
        visible={editingBooking !== null}
        onClose={() => setEditingBooking(null)}
        onCancel={(id) => { cancelBooking(id); setEditingBooking(null); }}
        onEdit={(id, params) => { editBooking(id, params); setEditingBooking(null); }}
        getBookedSlotsExcluding={getBookedSlotsExcluding}
      />
    </SafeAreaView>
  );
}

// ─── Karta rezervace ──────────────────────────────────────────────────────────

function BookingCard({ booking, onEdit, onCancel }: {
  booking: BookingWithCourt;
  onEdit: () => void;
  onCancel: (id: string) => void;
}) {
  const accent  = SPORT_COLORS[booking.court_sport] ?? W.orange;
  const start   = new Date(booking.starts_at);
  const end     = new Date(booking.ends_at);
  const fmt     = fmtDay(start);

  const startH = start.getHours();
  const startM = start.getMinutes();
  const endH   = end.getHours();
  const endM   = end.getMinutes();
  const timeStr = `${String(startH).padStart(2,'0')}:${String(startM).padStart(2,'0')} – ${String(endH).padStart(2,'0')}:${String(endM).padStart(2,'0')}`;

  return (
    <View style={[s.card, { borderLeftColor: accent }]}>
      <View style={s.cardMain}>
        {/* Datum */}
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
          <Text style={s.cardTime}>{timeStr} · {booking.price} Kč</Text>
        </View>
      </View>

      {/* Akce */}
      <View style={s.cardActions}>
        <TouchableOpacity onPress={onEdit} style={s.editBtn} activeOpacity={0.8}>
          <Text style={[s.editBtnText, { color: accent }]}>UPRAVIT</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onCancel(booking.id)} style={s.cancelBtn} activeOpacity={0.8}>
          <Text style={s.cancelBtnText}>ZRUŠIT</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Styly ────────────────────────────────────────────────────────────────────

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
    paddingTop: 14, paddingHorizontal: 16, paddingBottom: 12,
  },
  cardMain:    { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  cardDateBox: { width: 52, alignItems: 'center', paddingVertical: 8 },
  cardDateNum:   { fontSize: 22, fontWeight: '900', color: '#fff', lineHeight: 26 },
  cardDateMonth: { fontSize: 11, color: 'rgba(255,255,255,0.8)' },
  cardDateDay:   { fontSize: 9, fontWeight: '800', color: 'rgba(255,255,255,0.7)', letterSpacing: 1 },
  cardInfo:  { flex: 1, gap: 3 },
  sportTag:  { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2 },
  sportTagText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  cardName:  { fontSize: 15, fontWeight: '800', color: colors.textPrimary },
  cardClub:  { fontSize: 12, color: colors.textMuted },
  cardTime:  { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },

  // Akční tlačítka
  cardActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 12 },
  editBtn: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderWidth: 1, borderColor: colors.border,
  },
  editBtnText:   { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  cancelBtn: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderWidth: 1, borderColor: colors.error,
  },
  cancelBtnText: { fontSize: 10, fontWeight: '900', color: colors.error, letterSpacing: 1 },
});
