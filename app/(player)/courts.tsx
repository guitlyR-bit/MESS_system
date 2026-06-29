import { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/lib/theme';
import { useBookings } from '@/hooks/useBookings';
import { useClubSettings } from '@/hooks/useClubSettings';
import {
  MOCK_COURTS,
  MOCK_VENUES,
  getNext14Days,
  ALL_SLOTS,
  slotToTime,
  slotEndTime,
  slotDuration,
  fmtDay,
  localDateKey,
  SPORT_LABELS,
  SURFACE_LABELS,
  type Venue,
} from '@/lib/mockData';
import {
  isDateFullyClosed,
  getClosureMessageForDate,
  getClosureTitleForDate,
  isSlotBookableForCourt,
  getOpeningSlotForCourt,
  getEffectiveClosingSlotForCourt,
} from '@/lib/clubClosure';
import { calculateSlotsPrice } from '@/lib/clubSchedule';
import { mergeSettingsForDate, isCourtSeasonallyClosed } from '@/lib/clubSeason';
import {
  getCzechHoliday, holidayTreatmentLabel,
} from '@/lib/czechHolidays';
import type { CourtWithClub, ClubSettings } from '@/types/database';

type ScreenView = 'venues' | 'courts' | 'slots' | 'confirm';
const W = colors.warm;

const SPORT_COLORS: Record<string, string> = {
  tennis: W.orange, badminton: W.rose, squash: W.red,
  padel: W.amber, volleyball: W.yellow, basketball: W.orange, football: W.pink,
};

// ─── Hlavní koordinátor ───────────────────────────────────────────────────────

export default function PlayerCourtsScreen() {
  const [view, setView]                   = useState<ScreenView>('venues');
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [selectedCourt, setSelectedCourt] = useState<CourtWithClub | null>(null);
  const [selectedDate, setSelectedDate]   = useState<Date>(new Date());
  const [selectedSlots, setSelectedSlots] = useState<number[]>([]);
  const [sportFilter, setSportFilter]     = useState<string>('all');
  const [search, setSearch]               = useState('');

  const { createBooking, getBookedSlots } = useBookings();
  const clubSettings = useClubSettings();

  function openVenue(venue: Venue) {
    setSelectedVenue(venue);
    setSelectedCourt(null);
    setSelectedSlots([]);
    setView('courts');
  }

  function openCourt(court: CourtWithClub) {
    setSelectedCourt(court);
    setSelectedDate(new Date());
    setSelectedSlots([]);
    setView('slots');
  }

  function handleBook() {
    if (!selectedCourt || selectedSlots.length === 0) return;
    const dateKey = localDateKey(selectedDate);
    const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
    if (isDateFullyClosed(dateKey, clubSettings)) return;
    if (isCourtSeasonallyClosed(selectedCourt.id, dateKey, clubSettings)) return;
    if (selectedSlots.some(s => !isSlotBookableForCourt(
      s, selectedCourt.id, dateKey, clubSettings, nowMinutes,
    ))) return;
    createBooking({
      courtId:    selectedCourt.id,
      courtName:  selectedCourt.name,
      courtSport: selectedCourt.sport,
      clubName:   selectedCourt.club_name,
      clubCity:   selectedCourt.club_city,
      date:       dateKey,
      slots:      selectedSlots,
      price:      Math.round(calculateSlotsPrice(
        selectedCourt.id, dateKey, selectedSlots, selectedCourt.price_per_hour, clubSettings,
        selectedCourt.sport,
      )),
    });
    setView('confirm');
  }

  // ── Confirm ─────────────────────────────────────────────────────────────────
  if (view === 'confirm' && selectedCourt && selectedSlots.length > 0) {
    return (
      <ConfirmView
        court={selectedCourt}
        date={selectedDate}
        slots={selectedSlots}
        clubSettings={clubSettings}
        onClose={() => { setView('venues'); setSelectedVenue(null); setSelectedCourt(null); setSelectedSlots([]); }}
        onNewBooking={() => { setSelectedSlots([]); setView('slots'); }}
      />
    );
  }

  // ── Výběr slotů ─────────────────────────────────────────────────────────────
  if (view === 'slots' && selectedCourt) {
    const dateKey   = localDateKey(selectedDate);
    const bookedNow = getBookedSlots(selectedCourt.id, dateKey);
    return (
      <SlotsView
        court={selectedCourt}
        selectedDate={selectedDate}
        selectedSlots={selectedSlots}
        bookedSlots={bookedNow}
        onBack={() => { setSelectedSlots([]); setView('courts'); }}
        onSelectDate={(d) => { setSelectedDate(d); setSelectedSlots([]); }}
        onSlotsChange={setSelectedSlots}
        onBook={handleBook}
      />
    );
  }

  // ── Kurty na sportovišti ─────────────────────────────────────────────────────
  if (view === 'courts' && selectedVenue) {
    const venueCourts = MOCK_COURTS.filter(c => c.club_id === selectedVenue.id);
    return (
      <CourtsView
        venue={selectedVenue}
        courts={venueCourts}
        onBack={() => setView('venues')}
        onSelectCourt={openCourt}
      />
    );
  }

  // ── Seznam sportovišť ────────────────────────────────────────────────────────
  return (
    <VenuesView
      search={search}
      onSearchChange={setSearch}
      sportFilter={sportFilter}
      onSportFilter={setSportFilter}
      onSelectVenue={openVenue}
    />
  );
}

// ─── 1. Seznam sportovišť ─────────────────────────────────────────────────────

function VenuesView({ search, onSearchChange, sportFilter, onSportFilter, onSelectVenue }: {
  search: string;
  onSearchChange: (v: string) => void;
  sportFilter: string;
  onSportFilter: (v: string) => void;
  onSelectVenue: (v: Venue) => void;
}) {
  const allSports = Array.from(new Set(MOCK_VENUES.flatMap(v => v.sports)));

  const filtered = MOCK_VENUES.filter(v => {
    const matchesSport  = sportFilter === 'all' || v.sports.includes(sportFilter as any);
    const matchesSearch = search === '' ||
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.city.toLowerCase().includes(search.toLowerCase());
    return matchesSport && matchesSearch;
  });

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      {/* Vyhledávání */}
      <View style={s.searchBar}>
        <TextInput
          style={s.searchInput}
          placeholder="Hledat sportoviště nebo město..."
          placeholderTextColor={colors.textDisabled}
          value={search}
          onChangeText={onSearchChange}
        />
      </View>

      {/* Filtry sportu */}
      <View style={s.filtersWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.filtersContent}>
          {['all', ...allSports].map(sp => (
            <TouchableOpacity
              key={sp}
              onPress={() => onSportFilter(sp)}
              style={[s.filterChip, sportFilter === sp && s.filterChipActive]}
            >
              <Text style={[s.filterChipText, sportFilter === sp && s.filterChipTextActive]}
                numberOfLines={1}>
                {sp === 'all' ? 'Vše' : SPORT_LABELS[sp] ?? sp}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={s.resultCount}>
        <Text style={s.resultCountText}>{filtered.length} sportovišť</Text>
      </View>

      <ScrollView contentContainerStyle={s.list} showsVerticalScrollIndicator={false}>
        {filtered.map(venue => (
          <VenueCard key={venue.id} venue={venue} onPress={() => onSelectVenue(venue)} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

// Karta sportoviště
function VenueCard({ venue, onPress }: { venue: Venue; onPress: () => void }) {
  const primarySport = venue.sports[0];
  const accent       = SPORT_COLORS[primarySport] ?? W.orange;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.82} style={s.venueCard}>
      <View style={[s.venueCardBar, { backgroundColor: accent }]} />
      <View style={s.venueCardBody}>
        <View style={s.venueCardLeft}>
          {/* Sport tagy */}
          <View style={s.tagRow}>
            {venue.sports.map(sp => (
              <View key={sp} style={[s.sportBadge, { backgroundColor: (SPORT_COLORS[sp] ?? W.orange) + '22' }]}>
                <Text style={[s.sportBadgeText, { color: SPORT_COLORS[sp] ?? W.orange }]}>
                  {SPORT_LABELS[sp] ?? sp}
                </Text>
              </View>
            ))}
          </View>
          <Text style={s.venueName}>{venue.name}</Text>
          <Text style={s.venueAddress}>{venue.address}, {venue.city}</Text>
          <Text style={s.venueMeta}>
            {venue.courtCount} {venue.courtCount === 1 ? 'kurt' : venue.courtCount < 5 ? 'kurty' : 'kurtů'}
            {' · '}
            {venue.priceFrom === venue.priceTo
              ? `${venue.priceFrom} Kč/hod`
              : `${venue.priceFrom}–${venue.priceTo} Kč/hod`}
          </Text>
        </View>
        <View style={s.venueCardRight}>
          <View style={[s.availBadge, venue.availableToday > 0 ? s.availGreen : s.availRed]}>
            <Text style={s.availNum}>{venue.availableToday}</Text>
            <Text style={s.availLabel}>volných{'\n'}dnes</Text>
          </View>
          <Text style={s.chevronLg}>›</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── 2. Kurty na sportovišti ──────────────────────────────────────────────────

function CourtsView({ venue, courts, onBack, onSelectCourt }: {
  venue: Venue;
  courts: CourtWithClub[];
  onBack: () => void;
  onSelectCourt: (c: CourtWithClub) => void;
}) {
  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      {/* Záhlaví sportoviště */}
      <View style={s.levelHeader}>
        <TouchableOpacity onPress={onBack} style={s.backBtn}>
          <Text style={s.backBtnText}>← Zpět</Text>
        </TouchableOpacity>
        <Text style={s.levelTitle}>{venue.name}</Text>
        <Text style={s.levelSub}>{venue.address}, {venue.city}</Text>
      </View>

      <ScrollView contentContainerStyle={s.list} showsVerticalScrollIndicator={false}>
        <View style={s.resultCount}>
          <Text style={s.resultCountText}>
            {courts.length} {courts.length === 1 ? 'kurt' : courts.length < 5 ? 'kurty' : 'kurtů'}
          </Text>
        </View>

        {courts.map(court => {
          const accent = SPORT_COLORS[court.sport] ?? W.orange;
          return (
            <TouchableOpacity
              key={court.id}
              onPress={() => onSelectCourt(court)}
              activeOpacity={0.82}
              style={s.courtCard}
            >
              <View style={[s.courtCardBar, { backgroundColor: accent }]} />
              <View style={s.courtCardBody}>
                <View style={s.courtCardLeft}>
                  <View style={s.tagRow}>
                    <View style={[s.sportBadge, { backgroundColor: accent + '22' }]}>
                      <Text style={[s.sportBadgeText, { color: accent }]}>
                        {SPORT_LABELS[court.sport]}
                      </Text>
                    </View>
                    {court.is_indoor && (
                      <View style={s.indoorBadge}>
                        <Text style={s.indoorBadgeText}>HALA</Text>
                      </View>
                    )}
                  </View>
                  <Text style={s.courtName}>{court.name}</Text>
                  <Text style={s.courtMeta}>
                    {SURFACE_LABELS[court.surface]} · max {court.capacity} hráčů
                  </Text>
                </View>
                <View style={s.courtCardRight}>
                  <Text style={s.courtPrice}>{court.price_per_hour} Kč</Text>
                  <Text style={s.courtPriceLabel}>/ hodina</Text>
                  <View style={[s.availBadge, court.available_today > 0 ? s.availGreen : s.availRed]}>
                    <Text style={s.availNum}>{court.available_today}</Text>
                    <Text style={s.availLabel}>volných{'\n'}dnes</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── 3. Výběr slotů ───────────────────────────────────────────────────────────

function SlotsView({
  court, selectedDate, selectedSlots, bookedSlots,
  onBack, onSelectDate, onSlotsChange, onBook,
}: {
  court: CourtWithClub;
  selectedDate: Date;
  selectedSlots: number[];
  bookedSlots: number[];
  onBack: () => void;
  onSelectDate: (d: Date) => void;
  onSlotsChange: (slots: number[]) => void;
  onBook: () => void;
}) {
  const clubSettings = useClubSettings();
  const days       = getNext14Days();
  const dateKey    = localDateKey(selectedDate);
  const todayKey   = localDateKey();
  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
  const sportColor = SPORT_COLORS[court.sport] ?? W.orange;
  const selMin     = selectedSlots.length > 0 ? Math.min(...selectedSlots) : -1;
  const selMax     = selectedSlots.length > 0 ? Math.max(...selectedSlots) : -1;

  const dateSettings = mergeSettingsForDate(clubSettings, dateKey);
  const seasonClosed = isCourtSeasonallyClosed(court.id, dateKey, clubSettings);

  const dateFullyClosed = isDateFullyClosed(dateKey, dateSettings) || seasonClosed;
  const closureTitle = seasonClosed
    ? 'Kurt je v této sezóně uzavřen'
    : getClosureTitleForDate(dateKey, dateSettings);
  const closureMessage = seasonClosed
    ? undefined
    : getClosureMessageForDate(dateKey, dateSettings);
  const earlyCloseToday = dateKey === todayKey && dateSettings.earlyCloseEnabled;
  const showClosureBanner = dateFullyClosed || earlyCloseToday;
  const publicHoliday = getCzechHoliday(dateKey);

  const displaySlots = ALL_SLOTS.filter(
    idx => idx >= getOpeningSlotForCourt(court.id, dateKey, clubSettings)
      && idx <= getEffectiveClosingSlotForCourt(court.id, dateKey, clubSettings),
  );

  function slotAvailable(idx: number): boolean {
    return isSlotBookableForCourt(idx, court.id, dateKey, clubSettings, nowMinutes)
      && !bookedSlots.includes(idx);
  }

  function handleSlotPress(idx: number) {
    if (!slotAvailable(idx)) return;
    if (selectedSlots.length === 0) { onSlotsChange([idx]); return; }

    if (idx === selMin && selectedSlots.length > 1) {
      onSlotsChange(selectedSlots.filter(s => s !== selMin)); return;
    }
    if (idx === selMax) {
      onSlotsChange(selectedSlots.filter(s => s !== selMax)); return;
    }
    if (idx === selMax + 1 && slotAvailable(idx)) {
      onSlotsChange([...selectedSlots, idx]); return;
    }
    if (idx === selMin - 1 && slotAvailable(idx)) {
      onSlotsChange([idx, ...selectedSlots]); return;
    }
    onSlotsChange([idx]);
  }

  const totalPrice   = Math.round(calculateSlotsPrice(
    court.id, dateKey, selectedSlots, court.price_per_hour, clubSettings, court.sport,
  ));
  const duration     = slotDuration(selectedSlots.length);
  const bookingLabel = selectedSlots.length > 0
    ? `${slotToTime(selMin)} – ${slotEndTime(selMax)}` : '';

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <View style={[s.levelHeader, { borderLeftColor: sportColor }]}>
        <TouchableOpacity onPress={onBack} style={s.backBtn}>
          <Text style={s.backBtnText}>← {court.club_name}</Text>
        </TouchableOpacity>
        <Text style={s.levelTitle}>{court.name}</Text>
        <Text style={s.levelSub}>
          {SURFACE_LABELS[court.surface]} · {court.price_per_hour} Kč/hod
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Výběr dne */}
        <Text style={s.sectionTitle}>VYBERTE DEN</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.dayScroll}>
          {days.map((day, i) => {
            const fmt        = fmtDay(day);
            const dayKey     = localDateKey(day);
            const isSelected = dayKey === dateKey;
            const isHoliday  = !!getCzechHoliday(dayKey);
            return (
              <TouchableOpacity
                key={i}
                onPress={() => onSelectDate(day)}
                style={[
                  s.dayChip,
                  isSelected && { backgroundColor: sportColor },
                  isHoliday && !isSelected && s.dayChipHoliday,
                ]}
              >
                <Text style={[s.dayChipWeekday, isSelected && { color: '#fff' }]}>
                  {i === 0 ? 'DNES' : fmt.short}
                </Text>
                <Text style={[s.dayChipNum, isSelected && { color: '#fff' }]}>{fmt.num}</Text>
                <Text style={[s.dayChipMonth, isSelected && { color: 'rgba(255,255,255,0.7)' }]}>
                  {fmt.month}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {publicHoliday && !dateFullyClosed && (
          <View style={s.holidayBanner}>
            <Text style={s.holidayBannerTitle}>Státní svátek — {publicHoliday.name}</Text>
            <Text style={s.holidayBannerText}>
              Provoz a ceny {holidayTreatmentLabel(clubSettings.holidayTreatment)}.
            </Text>
          </View>
        )}

        {showClosureBanner && (
          <View style={s.closureBanner}>
            <Text style={s.closureBannerTitle}>{closureTitle}</Text>
            {closureMessage ? (
              <Text style={s.closureBannerText}>{closureMessage}</Text>
            ) : null}
          </View>
        )}

        {/* Sloty */}
        <View style={s.slotHintRow}>
          <Text style={s.sectionTitle}>VOLNÉ TERMÍNY</Text>
          {!dateFullyClosed && (
            <Text style={s.slotHint}>Klikněte na blok, sousedním rozšiřte výběr</Text>
          )}
        </View>

        {dateFullyClosed ? (
          <View style={s.closureOnlyBox}>
            <Text style={s.closureOnlyText}>V tento den nelze vytvořit rezervaci.</Text>
          </View>
        ) : (
        <View style={s.slotGrid}>
          {displaySlots.map(idx => {
            const isBooked   = bookedSlots.includes(idx);
            const isClosed   = !isSlotBookableForCourt(idx, court.id, dateKey, clubSettings, nowMinutes);
            const isSelected = selectedSlots.includes(idx);
            const isFirst    = idx === selMin;
            const isLast     = idx === selMax;
            const disabled   = isBooked || isClosed;
            return (
              <TouchableOpacity
                key={idx}
                disabled={disabled}
                onPress={() => handleSlotPress(idx)}
                style={[
                  s.slot,
                  isClosed   && s.slotClosed,
                  isBooked   && s.slotBooked,
                  isSelected && { backgroundColor: sportColor, borderColor: sportColor },
                  isSelected && isFirst && s.slotFirst,
                  isSelected && isLast  && s.slotLast,
                ]}
              >
                <Text style={[
                  s.slotTime,
                  isClosed   && s.slotTextClosed,
                  isBooked   && s.slotTextBooked,
                  isSelected && s.slotTextSelected,
                ]}>
                  {slotToTime(idx)}
                </Text>
                {isClosed && !isBooked && <Text style={s.slotSubClosed}>uzavřeno</Text>}
                {isBooked && <Text style={s.slotSubBooked}>obsazeno</Text>}
                {!isBooked && !isClosed && !isSelected && <Text style={s.slotSub}>30 min</Text>}
                {isSelected && isLast && (
                  <Text style={[s.slotSub, { color: 'rgba(255,255,255,0.8)' }]}>
                    {isFirst ? '30 min' : 'konec'}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
        )}

        {/* Souhrn + rezervační tlačítko */}
        {selectedSlots.length > 0 && (
          <View style={s.bookBtnWrap}>
            <View style={[s.bookSummary, { borderColor: sportColor }]}>
              <View style={s.bookSummaryItem}>
                <Text style={s.bookSummaryLabel}>ČAS</Text>
                <Text style={s.bookSummaryValue}>{bookingLabel}</Text>
              </View>
              <View style={s.bookSummaryDivider} />
              <View style={s.bookSummaryItem}>
                <Text style={s.bookSummaryLabel}>TRVÁNÍ</Text>
                <Text style={s.bookSummaryValue}>{duration}</Text>
              </View>
              <View style={s.bookSummaryDivider} />
              <View style={s.bookSummaryItem}>
                <Text style={s.bookSummaryLabel}>CENA</Text>
                <Text style={[s.bookSummaryValue, { color: sportColor }]}>{totalPrice} Kč</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onBook} activeOpacity={0.88}
              style={[s.bookBtn, { backgroundColor: sportColor }]}>
              <Text style={s.bookBtnText}>REZERVOVAT</Text>
              <Text style={s.bookBtnDetail}>{bookingLabel} · {totalPrice} Kč</Text>
            </TouchableOpacity>
          </View>
        )}
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── 4. Potvrzení ─────────────────────────────────────────────────────────────

function ConfirmView({ court, date, slots, clubSettings, onClose, onNewBooking }: {
  court: CourtWithClub; date: Date; slots: number[];
  clubSettings: ClubSettings;
  onClose: () => void; onNewBooking: () => void;
}) {
  const sportColor = SPORT_COLORS[court.sport] ?? W.orange;
  const fmt        = fmtDay(date);
  const selMin     = Math.min(...slots);
  const selMax     = Math.max(...slots);
  const totalPrice = Math.round(calculateSlotsPrice(
    court.id, localDateKey(date), slots, court.price_per_hour, clubSettings, court.sport,
  ));

  return (
    <SafeAreaView style={[s.safe, { justifyContent: 'center' }]} edges={['bottom']}>
      <View style={s.confirmBox}>
        <View style={[s.confirmBar, { backgroundColor: sportColor }]} />
        <View style={s.confirmContent}>
          <Text style={s.confirmCheck}>✓</Text>
          <Text style={s.confirmTitle}>Rezervace potvrzena</Text>
          <View style={s.confirmDetail}>
            <ConfirmRow label="Sportoviště" value={court.club_name} />
            <ConfirmRow label="Kurt"        value={court.name} />
            <ConfirmRow label="Datum"       value={`${fmt.short} ${fmt.num}.${fmt.month}`} />
            <ConfirmRow label="Čas"         value={`${slotToTime(selMin)} – ${slotEndTime(selMax)}`} />
            <ConfirmRow label="Trvání"      value={slotDuration(slots.length)} />
            <ConfirmRow label="Cena"        value={`${totalPrice} Kč`} accent={sportColor} />
          </View>
          <TouchableOpacity onPress={onNewBooking} activeOpacity={0.85}
            style={[s.confirmBtnPrimary, { backgroundColor: sportColor }]}>
            <Text style={s.confirmBtnPrimaryText}>PŘIDAT DALŠÍ REZERVACI</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} activeOpacity={0.85} style={s.confirmBtnSecondary}>
            <Text style={s.confirmBtnSecondaryText}>Zpět na sportoviště</Text>
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

// ─── Styly ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgAlt },

  // Vyhledávání
  searchBar: { backgroundColor: colors.surface, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  searchInput: { height: 44, backgroundColor: colors.bgAlt, paddingHorizontal: 14, fontSize: 15, color: colors.textPrimary, borderWidth: 1, borderColor: colors.border },

  // Filtry
  filtersWrap: { height: 52, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border, justifyContent: 'center' },
  filtersContent: { paddingHorizontal: 14, gap: 8, flexDirection: 'row', alignItems: 'center' },
  filterChip: { height: 32, paddingHorizontal: 14, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bgAlt, borderWidth: 1, borderColor: colors.border },
  filterChipActive: { backgroundColor: colors.textPrimary, borderColor: colors.textPrimary },
  filterChipText: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
  filterChipTextActive: { color: '#fff' },

  // Počet výsledků
  resultCount: { paddingHorizontal: 16, paddingVertical: 10 },
  resultCountText: { fontSize: 11, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.5, textTransform: 'uppercase' },

  list: { paddingBottom: 16 },

  // Záhlaví úrovně (kurty / sloty)
  levelHeader: { backgroundColor: colors.surface, padding: 16, borderLeftWidth: 4, borderLeftColor: colors.border, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 4 },
  backBtn: { marginBottom: 6 },
  backBtnText: { fontSize: 13, fontWeight: '700', color: colors.textMuted },
  levelTitle: { fontSize: 20, fontWeight: '900', color: colors.textPrimary },
  levelSub: { fontSize: 13, color: colors.textMuted },

  // Karta sportoviště
  venueCard: { backgroundColor: colors.surface, marginBottom: 3, overflow: 'hidden' },
  venueCardBar: { height: 4 },
  venueCardBody: { flexDirection: 'row', padding: 16, gap: 12, alignItems: 'center' },
  venueCardLeft: { flex: 1, gap: 5 },
  venueCardRight: { alignItems: 'center', gap: 8 },
  tagRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  sportBadge: { paddingHorizontal: 8, paddingVertical: 3 },
  sportBadgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  indoorBadge: { paddingHorizontal: 8, paddingVertical: 3, backgroundColor: '#E5E7EB' },
  indoorBadgeText: { fontSize: 10, fontWeight: '800', color: colors.textSecondary },
  venueName: { fontSize: 17, fontWeight: '900', color: colors.textPrimary },
  venueAddress: { fontSize: 12, color: colors.textMuted },
  venueMeta: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
  availBadge: { alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6 },
  availGreen: { backgroundColor: '#DCFCE7' },
  availRed: { backgroundColor: '#FEE2E2' },
  availNum: { fontSize: 18, fontWeight: '900', color: colors.textPrimary },
  availLabel: { fontSize: 9, color: colors.textSecondary, textAlign: 'center', lineHeight: 12 },
  chevronLg: { fontSize: 22, color: colors.borderStrong },

  // Karta kurtu
  courtCard: { backgroundColor: colors.surface, marginBottom: 3, overflow: 'hidden' },
  courtCardBar: { height: 4 },
  courtCardBody: { flexDirection: 'row', padding: 16, gap: 12 },
  courtCardLeft: { flex: 1, gap: 4 },
  courtCardRight: { alignItems: 'flex-end', gap: 4 },
  courtName: { fontSize: 16, fontWeight: '800', color: colors.textPrimary },
  courtMeta: { fontSize: 12, color: colors.textMuted },
  courtPrice: { fontSize: 20, fontWeight: '900', color: colors.textPrimary },
  courtPriceLabel: { fontSize: 11, color: colors.textMuted },

  // Sekce
  sectionTitle: { fontSize: 10, fontWeight: '900', color: colors.textMuted, letterSpacing: 1.5, paddingHorizontal: 16, paddingTop: 20, paddingBottom: 10 },
  slotHintRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingRight: 16 },
  slotHint: { fontSize: 10, color: colors.textDisabled, fontStyle: 'italic' },

  // Výběr dne
  dayScroll: { paddingHorizontal: 14, paddingBottom: 4, gap: 8 },
  dayChip: { alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, minWidth: 56 },
  dayChipHoliday: { borderColor: W.amber, backgroundColor: '#FFFBEB' },
  dayChipWeekday: { fontSize: 9, fontWeight: '800', color: colors.textMuted, letterSpacing: 1 },
  dayChipNum: { fontSize: 20, fontWeight: '900', color: colors.textPrimary, lineHeight: 26 },
  dayChipMonth: { fontSize: 10, color: colors.textMuted },

  // Sloty
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 14, gap: 4 },
  slot: { width: '23%', flexGrow: 1, alignItems: 'center', paddingVertical: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, gap: 1 },
  slotFirst: { borderTopLeftRadius: 4, borderBottomLeftRadius: 4 },
  slotLast:  { borderTopRightRadius: 4, borderBottomRightRadius: 4 },
  slotBooked: { backgroundColor: colors.bgAlt, borderColor: colors.border },
  slotClosed: { backgroundColor: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.25)' },
  slotTime: { fontSize: 13, fontWeight: '800', color: colors.textPrimary },
  slotTextBooked: { color: colors.textDisabled },
  slotTextClosed: { color: colors.textDisabled },
  slotTextSelected: { color: '#fff' },
  slotSub: { fontSize: 9, color: colors.textMuted },
  slotSubBooked: { fontSize: 9, color: colors.textDisabled },
  slotSubClosed: { fontSize: 9, color: 'rgba(185,28,28,0.75)', fontWeight: '800' },

  closureBanner: {
    marginHorizontal: 16, marginTop: 4, marginBottom: 8, padding: 12,
    backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#FECACA', gap: 4,
  },
  closureBannerTitle: { fontSize: 13, fontWeight: '900', color: W.red },
  closureBannerText: { fontSize: 12, color: colors.textSecondary, lineHeight: 18 },
  holidayBanner: {
    marginHorizontal: 16, marginTop: 4, marginBottom: 8, padding: 12,
    backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A', gap: 4,
  },
  holidayBannerTitle: { fontSize: 13, fontWeight: '900', color: '#B45309' },
  holidayBannerText: { fontSize: 12, color: colors.textSecondary, lineHeight: 18 },
  closureOnlyBox: {
    marginHorizontal: 16, padding: 20, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center',
  },
  closureOnlyText: { fontSize: 13, fontWeight: '700', color: colors.textMuted },

  // Souhrn + tlačítko
  bookBtnWrap: { padding: 16, paddingTop: 20, gap: 10 },
  bookSummary: { flexDirection: 'row', borderWidth: 2, backgroundColor: colors.surface },
  bookSummaryItem: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  bookSummaryLabel: { fontSize: 9, fontWeight: '800', color: colors.textMuted, letterSpacing: 1 },
  bookSummaryValue: { fontSize: 14, fontWeight: '900', color: colors.textPrimary, marginTop: 2 },
  bookSummaryDivider: { width: 1, backgroundColor: colors.border },
  bookBtn: { height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
  bookBtnText: { fontSize: 13, fontWeight: '900', color: '#fff', letterSpacing: 1.5 },
  bookBtnDetail: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.85)' },

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
