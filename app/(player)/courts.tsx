import { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, StyleSheet, useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/lib/theme';
import { useBookings } from '@/hooks/useBookings';
import {
  MOCK_COURTS,
  getNext14Days,
  ALL_HOURS,
  fmtHour,
  fmtDay,
  todayStr,
  SPORT_LABELS,
  SURFACE_LABELS,
} from '@/lib/mockData';
import type { CourtWithClub } from '@/types/database';

type View = 'list' | 'detail' | 'confirm';
const W = colors.warm;

// ─── Hlavní obrazovka ─────────────────────────────────────────────────────────

export default function PlayerCourtsScreen() {
  const [view, setView] = useState<View>('list');
  const [selectedCourt, setSelectedCourt] = useState<CourtWithClub | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedHour, setSelectedHour] = useState<number | null>(null);
  const [sportFilter, setSportFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [confirmedBookingId, setConfirmedBookingId] = useState<string | null>(null);

  const { createBooking, getBookedHours, cancelBooking, bookings } = useBookings();

  function openDetail(court: CourtWithClub) {
    setSelectedCourt(court);
    setSelectedDate(new Date());
    setSelectedHour(null);
    setView('detail');
  }

  function handleBook() {
    if (!selectedCourt || selectedHour === null) return;
    const b = createBooking({
      courtId:    selectedCourt.id,
      courtName:  selectedCourt.name,
      courtSport: selectedCourt.sport,
      clubName:   selectedCourt.club_name,
      clubCity:   selectedCourt.club_city,
      date:       todayStr(dayOffset()),
      hour:       selectedHour,
      price:      selectedCourt.price_per_hour,
    });
    setConfirmedBookingId(b.id);
    setView('confirm');
  }

  function dayOffset() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sel = new Date(selectedDate);
    sel.setHours(0, 0, 0, 0);
    return Math.round((sel.getTime() - today.getTime()) / 86400000);
  }

  if (view === 'confirm' && selectedCourt && selectedHour !== null) {
    return (
      <ConfirmView
        court={selectedCourt}
        date={selectedDate}
        hour={selectedHour}
        onClose={() => { setView('list'); setSelectedCourt(null); }}
        onNewBooking={() => { setSelectedHour(null); setView('detail'); }}
      />
    );
  }

  if (view === 'detail' && selectedCourt) {
    return (
      <DetailView
        court={selectedCourt}
        selectedDate={selectedDate}
        selectedHour={selectedHour}
        onBack={() => setView('list')}
        onSelectDate={setSelectedDate}
        onSelectHour={setSelectedHour}
        onBook={handleBook}
        getBookedHours={getBookedHours}
        dateOffset={dayOffset()}
      />
    );
  }

  return (
    <ListView
      search={search}
      onSearchChange={setSearch}
      sportFilter={sportFilter}
      onSportFilter={setSportFilter}
      onSelectCourt={openDetail}
    />
  );
}

// ─── 1. Seznam kurtů ──────────────────────────────────────────────────────────

function ListView({ search, onSearchChange, sportFilter, onSportFilter, onSelectCourt }: {
  search: string;
  onSearchChange: (v: string) => void;
  sportFilter: string;
  onSportFilter: (v: string) => void;
  onSelectCourt: (c: CourtWithClub) => void;
}) {
  const sports = ['all', ...Array.from(new Set(MOCK_COURTS.map(c => c.sport)))];

  const filtered = MOCK_COURTS.filter(c => {
    const matchesSport = sportFilter === 'all' || c.sport === sportFilter;
    const matchesSearch = search === '' ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.club_name.toLowerCase().includes(search.toLowerCase()) ||
      c.club_city.toLowerCase().includes(search.toLowerCase());
    return matchesSport && matchesSearch;
  });

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      {/* Vyhledávání */}
      <View style={s.searchBar}>
        <TextInput
          style={s.searchInput}
          placeholder="Hledat sportoviště nebo klub..."
          placeholderTextColor={colors.textDisabled}
          value={search}
          onChangeText={onSearchChange}
        />
      </View>

      {/* Sport filtry */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filters}
        contentContainerStyle={s.filtersContent}>
        {sports.map(sp => (
          <TouchableOpacity
            key={sp}
            onPress={() => onSportFilter(sp)}
            style={[s.filterChip, sportFilter === sp && s.filterChipActive]}
          >
            <Text style={[s.filterChipText, sportFilter === sp && s.filterChipTextActive]}>
              {sp === 'all' ? 'Vše' : SPORT_LABELS[sp] ?? sp}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Počet výsledků */}
      <View style={s.resultCount}>
        <Text style={s.resultCountText}>{filtered.length} sportovišť</Text>
      </View>

      {/* Seznam */}
      <ScrollView contentContainerStyle={s.list} showsVerticalScrollIndicator={false}>
        {filtered.map(court => (
          <CourtCard key={court.id} court={court} onPress={() => onSelectCourt(court)} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Karta kurtu ──────────────────────────────────────────────────────────────

function CourtCard({ court, onPress }: { court: CourtWithClub; onPress: () => void }) {
  const sportColor = SPORT_COLORS[court.sport] ?? W.orange;
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.82} style={s.courtCard}>
      {/* Barevný pruh nahoře */}
      <View style={[s.courtCardBar, { backgroundColor: sportColor }]} />
      <View style={s.courtCardBody}>
        <View style={s.courtCardLeft}>
          <View style={s.courtCardRow}>
            <View style={[s.sportBadge, { backgroundColor: sportColor + '22' }]}>
              <Text style={[s.sportBadgeText, { color: sportColor }]}>
                {SPORT_LABELS[court.sport] ?? court.sport}
              </Text>
            </View>
            {court.is_indoor && (
              <View style={s.indoorBadge}>
                <Text style={s.indoorBadgeText}>HALA</Text>
              </View>
            )}
          </View>
          <Text style={s.courtName}>{court.name}</Text>
          <Text style={s.clubName}>{court.club_name} · {court.club_city}</Text>
          <Text style={s.surface}>{SURFACE_LABELS[court.surface] ?? court.surface}</Text>
        </View>
        <View style={s.courtCardRight}>
          <Text style={s.price}>{court.price_per_hour} Kč</Text>
          <Text style={s.priceLabel}>/ hodina</Text>
          <View style={[s.availBadge, court.available_today > 0 ? s.availGreen : s.availRed]}>
            <Text style={s.availText}>
              {court.available_today > 0 ? `${court.available_today} volných` : 'Obsazeno'}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── 2. Detail kurtu + výběr datumu a slotu ───────────────────────────────────

function DetailView({
  court, selectedDate, selectedHour, onBack,
  onSelectDate, onSelectHour, onBook, getBookedHours, dateOffset,
}: {
  court: CourtWithClub;
  selectedDate: Date;
  selectedHour: number | null;
  onBack: () => void;
  onSelectDate: (d: Date) => void;
  onSelectHour: (h: number) => void;
  onBook: () => void;
  getBookedHours: (id: string, date: string) => number[];
  dateOffset: number;
}) {
  const days = getNext14Days();
  const dateKey = selectedDate.toISOString().slice(0, 10);
  const booked = getBookedHours(court.id, dateKey);
  const sportColor = SPORT_COLORS[court.sport] ?? W.orange;

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      {/* Záhlaví detailu */}
      <View style={[s.detailHeader, { borderLeftColor: sportColor }]}>
        <TouchableOpacity onPress={onBack} style={s.backBtn}>
          <Text style={s.backBtnText}>← Zpět</Text>
        </TouchableOpacity>
        <Text style={s.detailName}>{court.name}</Text>
        <Text style={s.detailSub}>
          {court.club_name} · {SURFACE_LABELS[court.surface]} · {court.price_per_hour} Kč/hod
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Výběr dne */}
        <Text style={s.sectionTitle}>VYBERTE DEN</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.dayScroll}>
          {days.map((day, i) => {
            const fmt = fmtDay(day);
            const isSelected = day.toISOString().slice(0, 10) === dateKey;
            const isToday = i === 0;
            return (
              <TouchableOpacity
                key={i}
                onPress={() => { onSelectDate(day); onSelectHour(null as any); }}
                style={[s.dayChip, isSelected && { backgroundColor: sportColor }]}
              >
                <Text style={[s.dayChipWeekday, isSelected && { color: '#fff' }]}>
                  {isToday ? 'DNES' : fmt.short}
                </Text>
                <Text style={[s.dayChipNum, isSelected && { color: '#fff' }]}>
                  {fmt.num}
                </Text>
                <Text style={[s.dayChipMonth, isSelected && { color: 'rgba(255,255,255,0.7)' }]}>
                  {fmt.month}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Časové sloty */}
        <Text style={s.sectionTitle}>DOSTUPNÉ TERMÍNY</Text>
        <View style={s.slotGrid}>
          {ALL_HOURS.map(hour => {
            const isBooked   = booked.includes(hour);
            const isSelected = selectedHour === hour;
            return (
              <TouchableOpacity
                key={hour}
                disabled={isBooked}
                onPress={() => onSelectHour(isSelected ? null as any : hour)}
                style={[
                  s.slot,
                  isBooked   && s.slotBooked,
                  isSelected && { backgroundColor: sportColor, borderColor: sportColor },
                ]}
              >
                <Text style={[
                  s.slotText,
                  isBooked   && s.slotTextBooked,
                  isSelected && s.slotTextSelected,
                ]}>
                  {fmtHour(hour)}
                </Text>
                {isBooked && <Text style={s.slotSubBooked}>obsazeno</Text>}
                {!isBooked && !isSelected && <Text style={s.slotSub}>{court.price_per_hour} Kč</Text>}
                {isSelected && <Text style={[s.slotSub, { color: '#fff' }]}>vybráno</Text>}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Tlačítko rezervace */}
        {selectedHour !== null && (
          <View style={s.bookBtnWrap}>
            <TouchableOpacity
              onPress={onBook}
              activeOpacity={0.88}
              style={[s.bookBtn, { backgroundColor: sportColor }]}
            >
              <Text style={s.bookBtnText}>
                REZERVOVAT {fmtHour(selectedHour)}–{fmtHour(selectedHour + 1)}
              </Text>
              <Text style={s.bookBtnPrice}>{court.price_per_hour} Kč</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── 3. Potvrzení rezervace ───────────────────────────────────────────────────

function ConfirmView({ court, date, hour, onClose, onNewBooking }: {
  court: CourtWithClub;
  date: Date;
  hour: number;
  onClose: () => void;
  onNewBooking: () => void;
}) {
  const sportColor = SPORT_COLORS[court.sport] ?? W.orange;
  const fmt = fmtDay(date);

  return (
    <SafeAreaView style={[s.safe, { justifyContent: 'center' }]} edges={['bottom']}>
      <View style={s.confirmBox}>
        {/* Barevný pruh */}
        <View style={[s.confirmBar, { backgroundColor: sportColor }]} />

        <View style={s.confirmContent}>
          <Text style={s.confirmCheck}>✓</Text>
          <Text style={s.confirmTitle}>Rezervace potvrzena</Text>

          <View style={s.confirmDetail}>
            <ConfirmRow label="Sportoviště" value={court.name} />
            <ConfirmRow label="Klub"        value={`${court.club_name}, ${court.club_city}`} />
            <ConfirmRow label="Datum"       value={`${fmt.short} ${fmt.num}.${fmt.month}`} />
            <ConfirmRow label="Čas"         value={`${fmtHour(hour)} – ${fmtHour(hour + 1)}`} />
            <ConfirmRow label="Cena"        value={`${court.price_per_hour} Kč`} accent={sportColor} />
          </View>

          <TouchableOpacity onPress={onNewBooking} activeOpacity={0.85}
            style={[s.confirmBtnPrimary, { backgroundColor: sportColor }]}>
            <Text style={s.confirmBtnPrimaryText}>PŘIDAT DALŠÍ REZERVACI</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} activeOpacity={0.85} style={s.confirmBtnSecondary}>
            <Text style={s.confirmBtnSecondaryText}>Zpět na seznam</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

function ConfirmRow({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <View style={s.confirmRow}>
      <Text style={s.confirmRowLabel}>{label}</Text>
      <Text style={[s.confirmRowValue, accent ? { color: accent, fontWeight: '800' } : {}]}>
        {value}
      </Text>
    </View>
  );
}

// ─── Barvy sportů ──────────────────────────────────────────────────────────────

const SPORT_COLORS: Record<string, string> = {
  tennis:     W.orange,
  badminton:  W.rose,
  squash:     W.red,
  padel:      W.amber,
  volleyball: W.yellow,
  basketball: W.orange,
  football:   W.pink,
};

// ─── Styly ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgAlt },

  // Vyhledávání
  searchBar: { backgroundColor: colors.surface, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  searchInput: { height: 44, backgroundColor: colors.bgAlt, paddingHorizontal: 14, fontSize: 15, color: colors.textPrimary, borderWidth: 1, borderColor: colors.border },

  // Filtry
  filters: { backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  filtersContent: { paddingHorizontal: 14, paddingVertical: 10, gap: 8, flexDirection: 'row' },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, backgroundColor: colors.bgAlt, borderWidth: 1, borderColor: colors.border },
  filterChipActive: { backgroundColor: colors.textPrimary, borderColor: colors.textPrimary },
  filterChipText: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
  filterChipTextActive: { color: '#fff' },

  // Počet výsledků
  resultCount: { paddingHorizontal: 16, paddingVertical: 10 },
  resultCountText: { fontSize: 11, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.5, textTransform: 'uppercase' },

  // Seznam
  list: { paddingBottom: 16 },

  // Karta kurtu
  courtCard: { backgroundColor: colors.surface, marginHorizontal: 0, marginBottom: 3, overflow: 'hidden' },
  courtCardBar: { height: 4 },
  courtCardBody: { flexDirection: 'row', padding: 16, gap: 12 },
  courtCardLeft: { flex: 1, gap: 4 },
  courtCardRight: { alignItems: 'flex-end', gap: 4 },
  courtCardRow: { flexDirection: 'row', gap: 6 },
  sportBadge: { paddingHorizontal: 8, paddingVertical: 3 },
  sportBadgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  indoorBadge: { paddingHorizontal: 8, paddingVertical: 3, backgroundColor: '#E5E7EB' },
  indoorBadgeText: { fontSize: 10, fontWeight: '800', color: colors.textSecondary },
  courtName: { fontSize: 16, fontWeight: '800', color: colors.textPrimary },
  clubName: { fontSize: 12, color: colors.textMuted },
  surface: { fontSize: 11, color: colors.textDisabled, fontWeight: '500' },
  price: { fontSize: 20, fontWeight: '900', color: colors.textPrimary },
  priceLabel: { fontSize: 11, color: colors.textMuted },
  availBadge: { paddingHorizontal: 8, paddingVertical: 4, marginTop: 4 },
  availGreen: { backgroundColor: '#DCFCE7' },
  availRed: { backgroundColor: '#FEE2E2' },
  availText: { fontSize: 10, fontWeight: '800', color: colors.textPrimary },

  // Detail
  detailHeader: { backgroundColor: colors.surface, padding: 16, borderLeftWidth: 4, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 4 },
  backBtn: { marginBottom: 8 },
  backBtnText: { fontSize: 13, fontWeight: '700', color: colors.textMuted },
  detailName: { fontSize: 20, fontWeight: '900', color: colors.textPrimary },
  detailSub: { fontSize: 13, color: colors.textMuted },

  // Sekce
  sectionTitle: { fontSize: 10, fontWeight: '900', color: colors.textMuted, letterSpacing: 1.5, paddingHorizontal: 16, paddingTop: 20, paddingBottom: 10 },

  // Výběr dne
  dayScroll: { paddingHorizontal: 14, paddingBottom: 4, gap: 8 },
  dayChip: { alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, minWidth: 56 },
  dayChipWeekday: { fontSize: 9, fontWeight: '800', color: colors.textMuted, letterSpacing: 1 },
  dayChipNum: { fontSize: 20, fontWeight: '900', color: colors.textPrimary, lineHeight: 26 },
  dayChipMonth: { fontSize: 10, color: colors.textMuted },

  // Časové sloty
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 14, gap: 8 },
  slot: { width: '30%', flexGrow: 1, alignItems: 'center', paddingVertical: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, gap: 2 },
  slotBooked: { backgroundColor: colors.bgAlt, borderColor: colors.border },
  slotText: { fontSize: 15, fontWeight: '800', color: colors.textPrimary },
  slotTextBooked: { color: colors.textDisabled },
  slotTextSelected: { color: '#fff' },
  slotSub: { fontSize: 10, color: colors.textMuted },
  slotSubBooked: { fontSize: 10, color: colors.textDisabled },

  // Tlačítko rezervace
  bookBtnWrap: { padding: 16, paddingTop: 24 },
  bookBtn: { height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24 },
  bookBtnText: { fontSize: 14, fontWeight: '900', color: '#fff', letterSpacing: 1 },
  bookBtnPrice: { fontSize: 18, fontWeight: '900', color: 'rgba(255,255,255,0.9)' },

  // Potvrzení
  confirmBox: { margin: 16, backgroundColor: colors.surface, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  confirmBar: { height: 6 },
  confirmContent: { padding: 24, gap: 8 },
  confirmCheck: { fontSize: 40, textAlign: 'center', marginBottom: 4 },
  confirmTitle: { fontSize: 22, fontWeight: '900', color: colors.textPrimary, textAlign: 'center', marginBottom: 8 },
  confirmDetail: { backgroundColor: colors.bgAlt, padding: 16, gap: 10, marginVertical: 8 },
  confirmRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  confirmRowLabel: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  confirmRowValue: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  confirmBtnPrimary: { height: 56, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  confirmBtnPrimaryText: { fontSize: 13, fontWeight: '900', color: '#fff', letterSpacing: 1.5 },
  confirmBtnSecondary: { height: 48, alignItems: 'center', justifyContent: 'center' },
  confirmBtnSecondaryText: { fontSize: 14, color: colors.textMuted, fontWeight: '600' },
});
