/**
 * Správce klubu — přehled rezervací, správa kurtů, nastavení
 *
 * Tab PŘEHLED  — časová osa všech kurtů; přetažením slot přesunete rezervaci
 * Tab KURTY    — kategorie kurtů, přiřazení, editace detailů kurtů
 * Tab NASTAVENÍ — provozní doba, ceník a uzavření per kategorie (+ globální fallback)
 */

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TouchableWithoutFeedback,
  StyleSheet, PanResponder, Modal, TextInput, Switch, Animated, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import DraggableFlatList, { ScaleDecorator, type RenderItemParams } from 'react-native-draggable-flatlist';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/lib/theme';
import { useClubBookings, snapshotBookingPosition, type OriginalBookingPosition } from '@/hooks/useClubBookings';
import {
  ALL_SLOTS, slotToTime, slotEndTime, slotPrice, fmtDay, localDateKey,
  SPORT_LABELS, SURFACE_LABELS, SLOT_COUNT, SLOT_START_HOUR,
  MOCK_REGISTERED_PLAYERS, registeredPlayerFullName, slotDuration,
} from '@/lib/mockData';
import type { RegisteredPlayer } from '@/lib/mockData';
import type { ClubBooking, CourtWithClub, CourtSurface, SportType, PaymentStatus, ClubClosurePeriod, ClubSettings, DayHoursPartialOverride, CourtCategory } from '@/types/database';
import {
  getEffectiveClosingSlot,
  getOpeningSlotForDate,
  isDateFullyClosed,
  getClosureMessageForDate,
  getClosureTitleForDate,
  isSlotBookableForCourt,
  getEffectiveClosingSlotForCourt,
  isCourtDateFullyClosed,
  fmtDateKey,
  getCourtClosurePeriods,
  findCourtPartialClosuresForDate,
  formatCourtClosureType,
  canApplyEarlyClose,
  formatEarlyCloseConflict,
  findValidEarlyCloseSlot,
  defaultEarlyCloseSlot,
} from '@/lib/clubClosure';
import { formatDayHours, calculateSlotsPrice, getDayHoursForDate, getDayHoursForCourt, hasDayHoursOverride, hasCategoryDayHoursOverride, getBookingConflictsForClearingDayOverride, formatBookingConflictMessage } from '@/lib/clubSchedule';
import {
  formatSeasonDates,
  resolveCategoryColorHex,
  defaultCategoryColor,
  getCategoryForCourt,
  filterCourtsByActiveSeason,
  getActiveCalendarSeason,
  getUncategorizedCourts,
  getCategoryById,
  courtsInCategory,
  getCategorySeasonLabel,
  filterCategoriesBySeason,
  getCategoryOpeningSchedule,
  isCourtClosedByCalendarSeason,
  isSeasonClosed,
  getSeasonById,
  findFutureBookingsForClosedSeason,
} from '@/lib/clubCategories';
import {
  getCzechHoliday, getCzechHolidaysInRange, holidayTreatmentLabel,
} from '@/lib/czechHolidays';
import {
  SEASON_IDS, SEASON_LABELS, formatSeasonProfileSummary,
  patchForEnableSeasonalMode, patchForDisableSeasonalMode, patchForSwitchSeason,
  mergeSettingsForDate, getEffectiveSeasonId, isCourtSeasonallyClosed,
} from '@/lib/clubSeason';
import { OpeningHoursModal } from '@/components/club/OpeningHoursModal';
import { CourtPricingModal } from '@/components/club/CourtPricingModal';
import { SeasonPeriodEditor } from '@/components/club/SeasonPeriodEditor';
import { ClosureExceptionModal } from '@/components/club/ClosureExceptionModal';
import { DayHoursOverrideModal } from '@/components/club/DayHoursOverrideModal';
import { CourtCategoryEditModal } from '@/components/club/CourtCategoryEditModal';

/** Konec vizuálního bloku na časové ose (stejná geometrie jako render) */
function bookingDisplayEndMinutes(booking: ClubBooking): number {
  const slotMin = Math.min(...booking.slots);
  return SLOT_START_HOUR * 60 + (slotMin + booking.slots.length) * 30;
}

/** Zda rezervace už proběhla (minulý den v kalendáři, nebo dnes po konci zobrazeného bloku) */
function isBookingPast(
  booking: ClubBooking,
  viewedDateKey: string,
  todayKey: string,
  now: Date,
): boolean {
  if (viewedDateKey < todayKey) return true;
  if (viewedDateKey > todayKey) return false;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return bookingDisplayEndMinutes(booking) <= nowMinutes;
}

/** Zda začátek slotu na dnešním dni už proběhl (nelze přetáhnout za časovou linku) */
function isSlotStartInPastOnToday(
  slotStart: number,
  viewedDateKey: string,
  todayKey: string,
  nowMinutes: number,
): boolean {
  if (viewedDateKey !== todayKey) return false;
  const startMinutes = SLOT_START_HOUR * 60 + slotStart * 30;
  return startMinutes < nowMinutes;
}

/** Volný slot lze rezervovat — na dnešním dni jen pokud konec slotu je po aktuálním čase (aktuální slot zůstává otevřený) */
function isSlotOpenForNewBooking(
  slotIdx: number,
  viewedDateKey: string,
  todayKey: string,
  nowMinutes: number,
): boolean {
  if (viewedDateKey !== todayKey) return true;
  const slotEndMinutes = SLOT_START_HOUR * 60 + (slotIdx + 1) * 30;
  return slotEndMinutes > nowMinutes;
}

/** Zda se aktuální pozice liší od uložené pro undo */
function bookingPositionDiffers(
  booking: ClubBooking,
  original: OriginalBookingPosition,
): boolean {
  if (booking.court_id !== original.court_id || booking.date !== original.date) return true;
  if (booking.slots.length !== original.slots.length) return true;
  return booking.slots.some((s, i) => s !== original.slots[i]);
}

/** Popis původní pozice pro undo tlačítko */
function formatOriginalPosition(
  original: OriginalBookingPosition,
  courts: CourtWithClub[],
): string {
  const court = courts.find(c => c.id === original.court_id);
  const slotMin = Math.min(...original.slots);
  const slotMax = Math.max(...original.slots);
  const dateObj = new Date(original.date + 'T12:00:00');
  const fmt = fmtDay(dateObj);
  return `${fmt.short} ${fmt.num}. ${fmt.month} · ${court?.name ?? original.court_id} · ${slotToTime(slotMin)}–${slotEndTime(slotMax)}`;
}

// ─── Konstanty časové osy ─────────────────────────────────────────────────────

const SLOT_W      = 72;   // px / 30 min slot
const ROW_H       = 72;   // px / řada kurtu
const COL_W       = 92;   // px pro sloupec s názvem kurtu
const HEADER_H    = 38;   // px výška řádku s časem
const SCROLLBAR_H = 10;   // px rezervovaný prostor pod gridem pro horizontální scrollbar

// ─── Barvy platebního stavu ───────────────────────────────────────────────────

const PAYMENT_BG: Record<string, string> = {
  paid:        '#16A34A',
  pay_on_site: '#D97706',
  pending:     '#EF4444',
};
const PAYMENT_LABEL: Record<string, string> = {
  paid:        'Zaplaceno',
  pay_on_site: 'Platba na místě',
  pending:     'Nezaplaceno',
};
const PAST_BOOKING_BG = '#6B7280';

const W = colors.warm;
const SPORT_COLORS: Record<string, string> = {
  tennis: W.orange, badminton: W.rose, squash: W.red,
  padel: W.amber, volleyball: W.yellow,
};

// ─── Týdenní pomocné funkce ───────────────────────────────────────────────────

/** Vrátí pondělí týdne, do kterého patří datum `date` */
function getMonday(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0 = Ne, 1 = Po, …
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return d;
}

/** Vrátí 7 dní (Po–Ne) pro týden posunutý o `weekOffset` od aktuálního */
function getWeekDays(weekOffset: number): Date[] {
  const monday = getMonday(new Date());
  monday.setDate(monday.getDate() + weekOffset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return d;
  });
}

/** Formátuje datum jako „16. 6." */
function fmtShortDate(d: Date): string {
  return `${d.getDate()}. ${d.getMonth() + 1}.`;
}

// ─── Kalendářové konstanty a pomocníci ───────────────────────────────────────

const MONTH_NAMES = [
  'Leden', 'Únor', 'Březen', 'Duben', 'Květen', 'Červen',
  'Červenec', 'Srpen', 'Září', 'Říjen', 'Listopad', 'Prosinec',
];
const DAY_ABBR = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];

/** Vrátí weekOffset vybraného dne relativně k aktuálnímu pondělí */
function getWeekOffsetForDate(date: Date): number {
  const todayMon = getMonday(new Date());
  const dayMon   = getMonday(date);
  const msA = Date.UTC(todayMon.getFullYear(), todayMon.getMonth(), todayMon.getDate());
  const msB = Date.UTC(dayMon.getFullYear(),   dayMon.getMonth(),   dayMon.getDate());
  return Math.round((msB - msA) / (7 * 24 * 60 * 60 * 1000));
}

// ─── Hlavní obrazovka ─────────────────────────────────────────────────────────

export default function ClubCourtsScreen() {
  const [tab, setTab] = useState<'timeline' | 'courts' | 'settings'>('timeline');
  const hook = useClubBookings();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={s.safe} edges={['bottom']}>
      {/* Tab bar */}
      <View style={s.tabs}>
        {(['timeline', 'courts', 'settings'] as const).map(t => (
          <TouchableOpacity key={t} onPress={() => setTab(t)}
            style={[s.tab, tab === t && s.tabActive]}>
            <Text style={[s.tabText, tab === t && s.tabTextActive]}>
              {t === 'timeline' ? 'PŘEHLED' : t === 'courts' ? 'KURTY' : 'NASTAVENÍ'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'timeline'  && <TimelineTab  hook={hook} />}
      {tab === 'courts'    && <CourtsTab    hook={hook} />}
      {tab === 'settings'  && <SettingsTab  hook={hook} />}
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: PŘEHLED — časová osa s drag & drop
// ═══════════════════════════════════════════════════════════════════════════════

/** Červeně podbarvená uzavřená zóna se zachovanou mřížkou slotů */
function ClosedZoneOverlay({
  left, width, height, top, showLabel = true, label = 'ZAVŘENO',
}: {
  left: number; width: number; height: number; top: number; showLabel?: boolean; label?: string;
}) {
  if (width <= 0) return null;
  const slotCount = Math.max(1, Math.ceil(width / SLOT_W));
  return (
    <View style={[s.closedZone, { left, top, width, height }]} pointerEvents="none">
      {Array.from({ length: slotCount }, (_, i) => (
        <View key={i} style={[s.closedZoneGridV, { left: i * SLOT_W }]} />
      ))}
      {showLabel && (
        <View style={s.closedZoneLabelWrap}>
          <Text style={s.closedZoneLabel}>{label}</Text>
        </View>
      )}
    </View>
  );
}

function TimelineTab({ hook }: { hook: ReturnType<typeof useClubBookings> }) {
  const {
    courts, bookings, getBookingsForDate, moveBooking, revertBookingMove, updateBooking, createBooking,
    changeBookingDate, changeBookingDuration, settings,
  } = hook;
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedBooking, setSelectedBooking] = useState<ClubBooking | null>(null);
  const [createDraft, setCreateDraft] = useState<{ courtId: string; slotIdx: number } | null>(null);
  const [hoveredSlotKey, setHoveredSlotKey] = useState<string | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [noteTooltip, setNoteTooltip] = useState<string | null>(null);
  const [hoveredUnpaidAlertId, setHoveredUnpaidAlertId] = useState<string | null>(null);
  const [pendingUndo, setPendingUndo] = useState<Record<string, OriginalBookingPosition>>({});
  const [revertError, setRevertError] = useState<string | null>(null);

  const bookingsRef = useRef(bookings);
  bookingsRef.current = bookings;

  const capturePositionUndo = useCallback((bookingId: string) => {
    const b = bookingsRef.current.find(x => x.id === bookingId);
    if (!b) return;
    setPendingUndo(prev => ({
      ...prev,
      [bookingId]: snapshotBookingPosition(b),
    }));
  }, []);

  const clearPositionUndo = useCallback((bookingId: string) => {
    setPendingUndo(prev => {
      if (!prev[bookingId]) return prev;
      const next = { ...prev };
      delete next[bookingId];
      return next;
    });
  }, []);

  // Aktuální čas — aktualizuje se každou minutu (pro linku a zešednutí)
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const todayKey = localDateKey(now);
  const days     = useMemo(() => getWeekDays(weekOffset), [weekOffset]);
  const dateKey  = localDateKey(selectedDate);

  const visibleCourts = useMemo(
    () => filterCourtsByActiveSeason(courts, settings, dateKey),
    [courts, settings, dateKey],
  );
  const activeCalendarSeason = useMemo(
    () => getActiveCalendarSeason(settings.seasons ?? [], dateKey),
    [settings.seasons, dateKey],
  );

  const handleRevertFromGrid = useCallback((
    bookingId: string,
    origin: OriginalBookingPosition,
  ) => {
    setRevertError(null);
    const result = revertBookingMove(bookingId, origin);
    if (result.ok) {
      clearPositionUndo(bookingId);
      if (result.booking.date !== dateKey) {
        const [y, m, d] = result.booking.date.split('-').map(Number);
        const picked = new Date(y, m - 1, d, 12, 0, 0);
        setSelectedDate(picked);
        setWeekOffset(getWeekOffsetForDate(picked));
      }
    } else {
      Alert.alert('Nelze vrátit', result.error);
    }
  }, [revertBookingMove, clearPositionUndo, dateKey]);

  const handlePrevWeek = useCallback(() => {
    const newOffset = weekOffset - 1;
    const newDays   = getWeekDays(newOffset);
    const newKeys   = newDays.map(d => localDateKey(d));
    setWeekOffset(newOffset);
    if (!newKeys.includes(dateKey)) setSelectedDate(newDays[6]);
  }, [weekOffset, dateKey]);

  const handleNextWeek = useCallback(() => {
    const newOffset = weekOffset + 1;
    const newDays   = getWeekDays(newOffset);
    const newKeys   = newDays.map(d => localDateKey(d));
    setWeekOffset(newOffset);
    if (!newKeys.includes(dateKey)) setSelectedDate(newDays[0]);
  }, [weekOffset, dateKey]);

  const handleSelectWeek = useCallback((offset: number) => {
    const newDays = getWeekDays(offset);
    const newKeys = newDays.map(d => localDateKey(d));
    setWeekOffset(offset);
    if (!newKeys.includes(dateKey)) setSelectedDate(newDays[0]);
  }, [dateKey]);

  const handleGoToday = useCallback(() => {
    setWeekOffset(0);
    setSelectedDate(new Date());
  }, []);

  const isViewingToday = dateKey === todayKey;
  const dayBooks  = getBookingsForDate(dateKey);

  const dateSettings = useMemo(
    () => mergeSettingsForDate(settings, dateKey),
    [settings, dateKey],
  );
  const effectiveSeasonId = getEffectiveSeasonId(dateKey, settings);

  const effectiveClosingSlot = getEffectiveClosingSlot(dateKey, dateSettings);
  const openingSlotForDay = getOpeningSlotForDate(dateKey, dateSettings);
  const dayHours = getDayHoursForDate(dateKey, dateSettings);
  const dayClosingSlot = dayHours.closingSlot;
  const dayHasHoursOverride = hasDayHoursOverride(dateKey, dateSettings);
  const dayOverrideKeys = useMemo(
    () => Object.keys(settings.dayOverrides ?? {}),
    [settings.dayOverrides],
  );
  const dateFullyClosed = isDateFullyClosed(dateKey, dateSettings);
  const earlyCloseToday = dateKey === todayKey && dateSettings.earlyCloseEnabled;
  const showEarlyCloseZone = earlyCloseToday
    && dateSettings.earlyCloseSlot <= dayClosingSlot;
  const closureTitle = getClosureTitleForDate(dateKey, dateSettings);
  const closureMessage = getClosureMessageForDate(dateKey, dateSettings);
  const showClosureBanner = dateFullyClosed || earlyCloseToday;
  const publicHoliday = getCzechHoliday(dateKey);
  const weekHolidayKeys = useMemo(
    () => getCzechHolidaysInRange(localDateKey(days[0]), localDateKey(days[6])).map(h => h.dateKey),
    [days],
  );

  // Mapa obsazených slotů per kurt — pro vykreslení volných buněk
  const occupiedByCourt = useMemo(() => {
    const map: Record<string, Set<number>> = {};
    visibleCourts.forEach(c => { map[c.id] = new Set(); });
    dayBooks.forEach(b => {
      b.slots.forEach(s => map[b.court_id]?.add(s));
    });
    return map;
  }, [dayBooks, visibleCourts]);

  // Sloty viditelné — při předčasném uzavření zobrazíme i uzavřenou zónu
  const visibleEndSlot = showEarlyCloseZone
    ? dayClosingSlot + 2
    : effectiveClosingSlot + 2;
  const visibleSlots = ALL_SLOTS.slice(openingSlotForDay, visibleEndSlot);

  // Synchronizace horizontálního scrollu — Animated.Value posouvá záhlaví bez re-renderu
  const scrollXAnim      = useRef(new Animated.Value(0)).current;
  const contentScrollRef = useRef<ScrollView>(null);
  const scrollXRef       = useRef(0);
  const [scrollEnabled, setScrollEnabled] = useState(true);

  // Stav přetahování (X + Y)
  const [draggingId, setDraggingId]   = useState<string | null>(null);
  const [dragOffsetX, setDragOffsetX] = useState(0);
  const [dragOffsetY, setDragOffsetY] = useState(0);
  const moveBookingRef = useRef(moveBooking);
  moveBookingRef.current = moveBooking;

  // Ref na aktuální pozice bookingů — aktualizuje se bez re-renderu
  const bookingInfoRef = useRef<Record<string, {
    slotMin: number; slotCount: number; courtId: string; courtIdx: number;
  }>>({});
  dayBooks.forEach(b => {
    const cIdx = visibleCourts.findIndex(c => c.id === b.court_id);
    bookingInfoRef.current[b.id] = {
      slotMin:   Math.min(...b.slots),
      slotCount: b.slots.length,
      courtId:   b.court_id,
      courtIdx:  cIdx,
    };
  });

  // Ref na čerstvá data dayBooks — PanResponder closure by jinak viděl stará data
  const dayBooksRef = useRef(dayBooks);
  dayBooksRef.current = dayBooks;

  // Set ID rezervací, které právě dokončily drag — blokuje onPress v TouchableOpacity
  const justDraggedRef = useRef<Set<string>>(new Set());

  const nowMinutes     = now.getHours() * 60 + now.getMinutes();

  // Drag PanResponder — jen u aktivních rezervací; proběhlé nelze posouvat
  const bookingIds = dayBooks.map(b => b.id).join(',');
  const panResponders = useMemo(() => {
    const map: Record<string, ReturnType<typeof PanResponder.create>> = {};

    dayBooks.forEach(booking => {
      if (isBookingPast(booking, dateKey, todayKey, now)) return;

      map[booking.id] = PanResponder.create({
        // Zachytíme gesture AŽ při pohybu — ScrollView tak může fungovat v prázdných oblastech
        onMoveShouldSetPanResponder:        (_, gs) => Math.hypot(gs.dx, gs.dy) > 6,
        onMoveShouldSetPanResponderCapture: (_, gs) => Math.hypot(gs.dx, gs.dy) > 6,

        onPanResponderGrant: () => {
          setScrollEnabled(false);
          justDraggedRef.current.add(booking.id);
        },

        onPanResponderMove: (_, gs) => {
          setDraggingId(booking.id);
          setDragOffsetX(gs.dx);
          setDragOffsetY(gs.dy);
        },

        onPanResponderRelease: (_, gs) => {
          setScrollEnabled(true);
          if (isBookingPast(booking, dateKey, todayKey, now)) {
            setDraggingId(null);
            setDragOffsetX(0);
            setDragOffsetY(0);
            return;
          }
          const info = bookingInfoRef.current[booking.id];
          if (info) {
            const slotDelta   = Math.round(gs.dx / SLOT_W);
            const newStart    = Math.max(0, Math.min(SLOT_COUNT - info.slotCount, info.slotMin + slotDelta));
            const rowDelta    = Math.round(gs.dy / ROW_H);
            const newCourtIdx = Math.max(0, Math.min(visibleCourts.length - 1, info.courtIdx + rowDelta));
            const newCourtId  = visibleCourts[newCourtIdx]?.id ?? info.courtId;
            const newSlots    = Array.from({ length: info.slotCount }, (_, i) => newStart + i);
            // Použijeme ref pro čerstvá data — zamezí stale closure
            const others   = dayBooksRef.current.filter(b => b.id !== booking.id && b.court_id === newCourtId);
            const conflict = newSlots.some(s => others.some(ob => ob.slots.includes(s)));
            const inPast   = isSlotStartInPastOnToday(newStart, dateKey, todayKey, nowMinutes);
            const inClosed   = dateFullyClosed
              || newSlots.some(s => !isSlotBookableForCourt(
                s, newCourtId, dateKey, settings, nowMinutes,
              ));
            // Při konfliktu, v minulosti nebo v uzavřeném čase se neprovede žádná akce
            if (!conflict && !inPast && !inClosed) {
              const moved = newStart !== info.slotMin || newCourtId !== info.courtId;
              if (moved) {
                const fresh = bookingsRef.current.find(b => b.id === booking.id);
                if (fresh) {
                  setPendingUndo(prev => ({
                    ...prev,
                    [booking.id]: snapshotBookingPosition(fresh),
                  }));
                }
                moveBookingRef.current(booking.id, newStart, newCourtId);
              }
            }
          }
          setDraggingId(null);
          setDragOffsetX(0);
          setDragOffsetY(0);
        },

        onPanResponderTerminate: () => {
          setScrollEnabled(true);
          setDraggingId(null);
          setDragOffsetX(0);
          setDragOffsetY(0);
          justDraggedRef.current.delete(booking.id);
        },
      });
    });
    return map;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingIds, visibleCourts, dateKey, todayKey, nowMinutes, dateFullyClosed, settings]);

  const timelineWidth = visibleSlots.length * SLOT_W;
  const timelineH = HEADER_H + visibleCourts.length * ROW_H + SCROLLBAR_H;

  // Pozice linky aktuálního času (px od začátku viditelné oblasti)
  const openingMinutes = SLOT_START_HOUR * 60 + openingSlotForDay * 30;
  const nowLineX       = (nowMinutes - openingMinutes) / 30 * SLOT_W;
  const nowLabel       = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const showNowLine    = isViewingToday && nowLineX >= 0 && nowLineX <= timelineWidth;

  return (
    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled">
      {/* Týdenní navigace */}
      <View style={s.weekNav}>
        <TouchableOpacity onPress={handlePrevWeek} style={s.weekNavArrow} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-back" size={20} color={W.orange} />
        </TouchableOpacity>
        <TouchableOpacity
          style={s.weekNavLabel}
          onPress={() => setCalendarVisible(true)}
          hitSlop={{ top: 4, bottom: 4, left: 0, right: 0 }}
          activeOpacity={0.7}
        >
          <Text style={s.weekNavText}>
            {fmtShortDate(days[0])} – {fmtShortDate(days[6])}
          </Text>
          {weekOffset === 0 ? (
            <View style={s.weekNavBadge}>
              <Text style={s.weekNavBadgeText}>TENTO TÝDEN</Text>
            </View>
          ) : (
            <Ionicons name="calendar-outline" size={13} color={W.orange} style={{ marginLeft: 4 }} />
          )}
          {settings.seasonalModeEnabled && (
            <View style={[s.weekNavBadge, { backgroundColor: effectiveSeasonId === 'summer' ? '#F59E0B' : '#6366F1' }]}>
              <Text style={s.weekNavBadgeText}>{SEASON_LABELS[effectiveSeasonId].toUpperCase()}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity onPress={handleNextWeek} style={s.weekNavArrow} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-forward" size={20} color={W.orange} />
        </TouchableOpacity>
      </View>

      {/* Výběr dne */}
      <View style={[s.datePicker, { flexDirection: 'row', alignItems: 'center' }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          style={{ flex: 1 }}
          contentContainerStyle={s.datePickerContent}>
          {days.map((day, i) => {
            const fmt    = fmtDay(day);
            const dayKey = localDateKey(day);
            const isSel  = dayKey === dateKey;
            const isToday = dayKey === todayKey;
            const isHoliday = weekHolidayKeys.includes(dayKey);
            const hasOverride = dayOverrideKeys.includes(dayKey);
            return (
              <TouchableOpacity key={i} onPress={() => setSelectedDate(day)}
                style={[s.dayChip, isSel && s.dayChipActive, isHoliday && !isSel && s.dayChipHoliday]}>
                <Text style={[s.dayChipWD, isSel && { color: '#fff' }]}>
                  {isToday ? 'DNES' : fmt.short}
                </Text>
                <Text style={[s.dayChipNum, isSel && { color: '#fff' }]}>{fmt.num}</Text>
                <Text style={[s.dayChipMonth, isSel && { color: 'rgba(255,255,255,0.7)' }]}>
                  {fmt.month}
                </Text>
                {isHoliday && (
                  <View style={[s.holidayDot, isSel && { backgroundColor: '#fff' }]} />
                )}
                {hasOverride && (
                  <View style={[s.overrideDot, isSel && s.overrideDotActive]} />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        {!isViewingToday && (
          <TouchableOpacity
            onPress={handleGoToday}
            style={s.todayBtn}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
            activeOpacity={0.7}
          >
            <Text style={s.todayBtnText}>DNES</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Provozní doba vybraného dne */}
      {!dateFullyClosed && (
        <View style={s.dayHoursBar}>
          <View style={s.dayHoursInfo}>
            <Ionicons name="time-outline" size={15} color={dayHasHoursOverride ? W.orange : colors.textMuted} />
            <Text style={[s.dayHoursText, dayHasHoursOverride && { color: W.orange }]}>
              {formatDayHours(dayHours)}
            </Text>
            {dayHasHoursOverride && (
              <View style={s.dayHoursBadge}>
                <Text style={s.dayHoursBadgeText}>ÚPRAVA</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Legenda platebního stavu */}
      <View style={s.legend}>
        {(Object.keys(PAYMENT_BG) as (keyof typeof PAYMENT_BG)[]).map(k => (
          <View key={k} style={s.legendItem}>
            <View style={[s.legendDot, { backgroundColor: PAYMENT_BG[k] }]} />
            <Text style={s.legendText}>{PAYMENT_LABEL[k]}</Text>
          </View>
        ))}
        <View style={s.legendItem}>
          <View style={[s.legendDot, { backgroundColor: PAST_BOOKING_BG }]} />
          <Text style={s.legendText}>Proběhlá</Text>
        </View>
        <Text style={s.legendCount}>{dayBooks.length} rezervací</Text>
      </View>

      {showClosureBanner && (
        <View style={s.closureBanner}>
          <Ionicons name="lock-closed" size={18} color={W.red} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={s.closureBannerTitle}>{closureTitle}</Text>
            {closureMessage ? (
              <Text style={s.closureBannerText}>{closureMessage}</Text>
            ) : null}
          </View>
        </View>
      )}

      {publicHoliday && !dateFullyClosed && (
        <View style={s.holidayBanner}>
          <Ionicons name="flag" size={18} color={W.amber} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={s.holidayBannerTitle}>Státní svátek — {publicHoliday.name}</Text>
            <Text style={s.holidayBannerText}>
              Provoz a ceny {holidayTreatmentLabel(settings.holidayTreatment)}.
            </Text>
          </View>
        </View>
      )}

      {settings.seasonalModeEnabled && activeCalendarSeason?.is_closed && (
        <View style={s.seasonClosedBanner}>
          <Ionicons name="lock-closed" size={18} color={W.red} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={s.seasonClosedBannerTitle}>Sezóna je uzavřena</Text>
            <Text style={s.seasonClosedBannerText}>
              {activeCalendarSeason.name} ({formatSeasonDates(activeCalendarSeason)}) — rezervace na kurty této sezóny nejsou k dispozici.
            </Text>
          </View>
        </View>
      )}

      {settings.seasonalModeEnabled && visibleCourts.length === 0 && courts.length > 0 && !activeCalendarSeason?.is_closed && (
        <View style={s.seasonFilterBanner}>
          <Ionicons name="calendar-outline" size={18} color={W.amber} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={s.seasonFilterBannerTitle}>Žádné kurty pro aktivní sezónu</Text>
            <Text style={s.seasonFilterBannerText}>
              {activeCalendarSeason
                ? `Pro ${fmtDateKey(dateKey)} platí „${activeCalendarSeason.name}" — v mřížce jsou jen kurty z kategorií této sezóny.`
                : 'Pro tento den není definovaná kalendářní sezóna — kurty bez sezóny se nezobrazují.'}
            </Text>
          </View>
        </View>
      )}

      {/* Časová osa */}
      <View style={[s.timelineWrapper, { height: timelineH }]}>

        {/* Pevný levý sloupec — názvy kurtů */}
        <View style={s.courtNamesCol}>
          <View style={[s.cornerCell]} />
          {visibleCourts.map(court => {
            const cat = getCategoryForCourt(court.id, settings);
            const accent = cat
              ? resolveCategoryColorHex(cat.color)
              : (SPORT_COLORS[court.sport] ?? W.orange);
            return (
              <View key={court.id} style={[s.courtNameCell, { borderLeftColor: accent }]}>
                <View style={[s.courtCategoryDot, { backgroundColor: accent }]} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={1} style={s.courtNameText}>{court.name}</Text>
                  <Text numberOfLines={1} style={s.courtSportText}>
                    {SPORT_LABELS[court.sport]}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Pravá scrollovatelná část */}
        <View style={{ flex: 1, overflow: 'hidden' }}>

          {/* Záhlaví s časem — View místo ScrollView, žádný nativní scrollbar prohlížeče */}
          <View style={{ height: HEADER_H, overflow: 'hidden' }}>
            <Animated.View style={{
              width: timelineWidth, flexDirection: 'row', height: HEADER_H,
              transform: [{ translateX: Animated.multiply(scrollXAnim, -1) }],
            }}>
              {visibleSlots.map((idx) => (
                <View key={idx} style={s.timeHeaderCell}>
                  {idx % 2 === 0 && (
                    <Text style={s.timeHeaderText}>{slotToTime(idx)}</Text>
                  )}
                </View>
              ))}
            </Animated.View>
          </View>

          {/* Mřížka + rezervace */}
          <ScrollView
            horizontal
            ref={contentScrollRef}
            scrollEnabled={scrollEnabled}
            style={{ height: visibleCourts.length * ROW_H + SCROLLBAR_H }}
            showsHorizontalScrollIndicator
            onScroll={e => {
              const x = e.nativeEvent.contentOffset.x;
              scrollXRef.current = x;
              scrollXAnim.setValue(x);
            }}
            scrollEventThrottle={16}
          >
            <View style={{ width: timelineWidth, height: visibleCourts.length * ROW_H, position: 'relative' }}>

              {/* Pozadí řad kurtů — střídavé pruhy */}
              {visibleCourts.map((_, i) => (
                <View key={`bg-${i}`} style={{
                  position: 'absolute', top: i * ROW_H, left: 0, right: 0, height: ROW_H,
                  backgroundColor: i % 2 === 0 ? colors.surface : colors.bgAlt,
                }} />
              ))}

              {/* Pozadí mřížky — svislé čáry po hodinách */}
              {visibleSlots.filter(i => i % 2 === 0).map((idx, pos) => (
                <View key={idx} style={[s.gridVLine, { left: pos * 2 * SLOT_W }]} />
              ))}

              {/* Pozadí mřížky — vodorovné čáry (kurty) */}
              {visibleCourts.map((_, i) => (
                <View key={i} style={[s.gridHLine, { top: (i + 1) * ROW_H - 1 }]} />
              ))}

              {/* Zatmavení minulosti na dnešním dni */}
              {showNowLine && nowLineX > 0 && (
                <View style={{
                  position: 'absolute', top: 0, left: 0, width: nowLineX,
                  height: visibleCourts.length * ROW_H, backgroundColor: 'rgba(0,0,0,0.05)', zIndex: 0,
                }} />
              )}

              {/* Drop target — přesná pozice a velikost cílového slotu */}
              {draggingId && (() => {
                const info = bookingInfoRef.current[draggingId];
                if (!info) return null;
                const rowDelta    = Math.round(dragOffsetY / ROW_H);
                const slotDelta   = Math.round(dragOffsetX / SLOT_W);
                const targetRow   = Math.max(0, Math.min(visibleCourts.length - 1, info.courtIdx + rowDelta));
                const targetSlot  = Math.max(0, Math.min(SLOT_COUNT - info.slotCount, info.slotMin + slotDelta));
                const posInVis    = targetSlot - openingSlotForDay;
                // Barva dle konfliktu
                const othersOnTarget = dayBooks.filter(b =>
                  b.id !== draggingId && b.court_id === visibleCourts[targetRow]?.id
                );
                const newSlots = Array.from({ length: info.slotCount }, (_, i) => targetSlot + i);
                const hasConflict = newSlots.some(s => othersOnTarget.some(ob => ob.slots.includes(s)));
                const inPast = isSlotStartInPastOnToday(targetSlot, dateKey, todayKey, nowMinutes);
                const inClosed = dateFullyClosed
                  || newSlots.some(s => !isSlotBookableForCourt(
                    s, visibleCourts[targetRow]?.id ?? '', dateKey, settings, nowMinutes,
                  ));
                const isInvalid = hasConflict || inPast || inClosed;
                return (
                  <View style={[s.dropTarget, {
                    top:    targetRow * ROW_H + 3,
                    left:   posInVis * SLOT_W + 2,
                    width:  info.slotCount * SLOT_W - 4,
                    height: ROW_H - 6,
                    borderColor: isInvalid ? '#EF4444' : 'rgba(99,102,241,0.6)',
                    backgroundColor: isInvalid ? 'rgba(239,68,68,0.12)' : 'rgba(99,102,241,0.1)',
                  }]} />
                );
              })()}

              {/* Uzavřené zóny — červené podbarvení se slotovou mřížkou */}
              {dateFullyClosed && visibleCourts.map((_, ci) => (
                <ClosedZoneOverlay
                  key={`fullclose-${ci}`}
                  left={0}
                  width={timelineWidth}
                  height={ROW_H - 1}
                  top={ci * ROW_H}
                />
              ))}

              {!dateFullyClosed && visibleCourts.map((court, ci) => {
                if (isCourtDateFullyClosed(court.id, dateKey, settings)) {
                  return (
                    <ClosedZoneOverlay
                      key={`catclose-${court.id}`}
                      left={0}
                      width={timelineWidth}
                      height={ROW_H - 1}
                      top={ci * ROW_H}
                    />
                  );
                }
                if (isCourtClosedByCalendarSeason(court.id, dateKey, settings)) {
                  return (
                    <ClosedZoneOverlay
                      key={`cal-season-${court.id}`}
                      left={0}
                      width={timelineWidth}
                      height={ROW_H - 1}
                      top={ci * ROW_H}
                      label="SEZÓNA UZAVŘENA"
                    />
                  );
                }
                if (isCourtSeasonallyClosed(court.id, dateKey, settings)) {
                  return (
                    <ClosedZoneOverlay
                      key={`season-${court.id}`}
                      left={0}
                      width={timelineWidth}
                      height={ROW_H - 1}
                      top={ci * ROW_H}
                      label="SEZÓNNĚ UZAVŘENO"
                    />
                  );
                }

                const courtHours = getDayHoursForCourt(court.id, dateKey, settings);
                const courtOpening = courtHours.openingSlot;
                const courtClosing = courtHours.closingSlot;
                const courtEffectiveClosing = getEffectiveClosingSlotForCourt(court.id, dateKey, settings);
                const courtEarlyClose = dateKey === todayKey && dateSettings.earlyCloseEnabled
                  && dateSettings.earlyCloseSlot <= courtClosing;
                const beforeOpenWidth = Math.max(0, (courtOpening - openingSlotForDay) * SLOT_W);

                return (
                  <React.Fragment key={`zones-${court.id}`}>
                    {beforeOpenWidth > 0 && (
                      <ClosedZoneOverlay
                        left={0}
                        width={beforeOpenWidth}
                        height={ROW_H - 1}
                        top={ci * ROW_H}
                        showLabel={false}
                      />
                    )}
                    {courtEarlyClose && (
                      <ClosedZoneOverlay
                        left={(dateSettings.earlyCloseSlot - openingSlotForDay) * SLOT_W}
                        width={(courtClosing - dateSettings.earlyCloseSlot + 1) * SLOT_W}
                        height={ROW_H - 1}
                        top={ci * ROW_H}
                      />
                    )}
                    {findCourtPartialClosuresForDate(court.id, dateKey, settings).map(period => (
                      <ClosedZoneOverlay
                        key={`partial-${court.id}-${period.id}`}
                        left={(period.closedFromSlot! - openingSlotForDay) * SLOT_W}
                        width={(period.closedToSlot! - period.closedFromSlot! + 1) * SLOT_W}
                        height={ROW_H - 1}
                        top={ci * ROW_H}
                        showLabel={false}
                      />
                    ))}
                    {(() => {
                      const afterCloseLeft = (courtClosing - openingSlotForDay + 1) * SLOT_W;
                      if (afterCloseLeft < timelineWidth) {
                        return (
                          <ClosedZoneOverlay
                            left={afterCloseLeft}
                            width={timelineWidth - afterCloseLeft}
                            height={ROW_H - 1}
                            top={ci * ROW_H}
                            showLabel={false}
                          />
                        );
                      }
                      if (!courtEarlyClose) {
                        const closingPos = (courtEffectiveClosing - openingSlotForDay + 1) * SLOT_W;
                        if (closingPos < timelineWidth && closingPos > 0) {
                          return (
                            <ClosedZoneOverlay
                              left={closingPos}
                              width={timelineWidth - closingPos}
                              height={ROW_H - 1}
                              top={ci * ROW_H}
                              showLabel={false}
                            />
                          );
                        }
                      }
                      return null;
                    })()}
                  </React.Fragment>
                );
              })}

              {/* Volné sloty — hover + ikona pro novou rezervaci */}
              {!dateFullyClosed && visibleCourts.map((court, ci) =>
                visibleSlots
                  .filter(idx => idx <= getEffectiveClosingSlotForCourt(court.id, dateKey, settings))
                  .filter(idx => !occupiedByCourt[court.id]?.has(idx))
                  .filter(idx => isSlotBookableForCourt(idx, court.id, dateKey, settings, nowMinutes))
                  .map(slotIdx => {
                    const slotKey = `${court.id}-${slotIdx}`;
                    const isHovered = hoveredSlotKey === slotKey;
                    const posInVisible = slotIdx - openingSlotForDay;
                    const showIcon = Platform.OS !== 'web' || isHovered;
                    const webHoverProps = Platform.OS === 'web'
                      ? {
                          onMouseEnter: () => setHoveredSlotKey(slotKey),
                          onMouseLeave: () => setHoveredSlotKey(k => k === slotKey ? null : k),
                        } as Record<string, unknown>
                      : {};
                    return (
                      <View
                        key={`free-${slotKey}`}
                        style={[s.freeSlotCell, {
                          left: posInVisible * SLOT_W,
                          top:  ci * ROW_H,
                          width: SLOT_W,
                          height: ROW_H,
                        }]}
                        {...webHoverProps}
                      >
                        <TouchableOpacity
                          style={s.freeSlotBtn}
                          activeOpacity={0.7}
                          onPress={() => setCreateDraft({ courtId: court.id, slotIdx })}
                          hitSlop={{ top: 4, bottom: 4, left: 2, right: 2 }}
                        >
                          <Ionicons
                            name="add-circle-outline"
                            size={22}
                            color="#6B7280"
                            style={{ opacity: showIcon ? (Platform.OS === 'web' ? 1 : 0.4) : 0 }}
                          />
                        </TouchableOpacity>
                      </View>
                    );
                  })
              )}

              {/* Rezervační bloky */}
              {dayBooks.map(booking => {
                const courtIdx = visibleCourts.findIndex(c => c.id === booking.court_id);
                if (courtIdx === -1) return null;

                const slotMin    = Math.min(...booking.slots);
                const slotCount  = booking.slots.length;
                const isDragging = draggingId === booking.id;

                const posInVisible = slotMin - openingSlotForDay;
                const rawLeft      = posInVisible * SLOT_W;
                const displayLeft  = rawLeft + (isDragging ? dragOffsetX : 0);
                const displayTop   = courtIdx * ROW_H + (isDragging ? dragOffsetY : 0);
                // Zešednutí: minulý den, nebo dnes po konci slotu
                const isPast   = isBookingPast(booking, dateKey, todayKey, now);
                const bgColor  = isPast ? PAST_BOOKING_BG : (PAYMENT_BG[booking.payment_status] ?? '#94A3B8');
                const showUnpaidAlert = isPast && booking.payment_status === 'pending';
                const undoOrigin = pendingUndo[booking.id];
                const hasUndo = !isPast && undoOrigin && bookingPositionDiffers(booking, undoOrigin);
                const showNoteIcon = !!booking.note;
                const iconColWidth = showUnpaidAlert ? 24 : hasUndo ? 16 : showNoteIcon ? 14 : 0;
                const hasBookingIcons = iconColWidth > 0;
                const textPadRight = hasBookingIcons ? iconColWidth + 7 : 0;

                return (
                  <View
                    key={booking.id}
                    style={[
                      s.bookingBlock,
                      {
                        left:      displayLeft + 2,
                        top:       displayTop + 4,
                        width:     slotCount * SLOT_W - 4,
                        height:    ROW_H - 8,
                        opacity:   isDragging ? 0.82 : (isPast ? 0.88 : 1),
                        zIndex:    isDragging ? 20 : 1,
                        elevation: isDragging ? 8 : 2,
                        backgroundColor: bgColor,
                        ...(Platform.OS === 'web' && isPast ? { cursor: 'default' } as object : {}),
                      },
                    ]}
                    {...(isPast ? {} : panResponders[booking.id]?.panHandlers ?? {})}
                  >
                    {/* TouchableOpacity pro tap→detail; po dragu ignoruje onPress díky justDraggedRef */}
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => {
                        if (justDraggedRef.current.has(booking.id)) {
                          justDraggedRef.current.delete(booking.id);
                          return;
                        }
                        setRevertError(null);
                        setSelectedBooking(booking);
                      }}
                      style={[s.bookingInner, { backgroundColor: bgColor }]}
                    >
                      <View style={[s.bookingTextCol, hasBookingIcons && { paddingRight: textPadRight }]}>
                        <Text numberOfLines={1} style={s.bookingName}>
                          {booking.player_name}
                        </Text>
                        <Text numberOfLines={1} style={s.bookingMeta}>
                          {slotToTime(slotMin)}–{slotEndTime(Math.max(...booking.slots))}
                          {slotCount >= 2 ? ` · ${booking.price} Kč` : ''}
                        </Text>
                      </View>
                    </TouchableOpacity>
                    {hasBookingIcons && (
                      <View style={s.bookingIconsCol} pointerEvents="box-none">
                        {showNoteIcon && (
                          <TouchableOpacity
                            onPress={(e) => {
                              if (Platform.OS === 'web') {
                                (e as unknown as { stopPropagation?: () => void }).stopPropagation?.();
                              }
                              setNoteTooltip(booking.note!);
                            }}
                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                          >
                            <Ionicons name="information-circle" size={14} color="rgba(255,255,255,0.92)" />
                          </TouchableOpacity>
                        )}
                        {hasUndo && undoOrigin && (
                          <TouchableOpacity
                            style={s.undoHintBadge}
                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                            onPress={(e) => {
                              if (Platform.OS === 'web') {
                                (e as unknown as { stopPropagation?: () => void }).stopPropagation?.();
                              }
                              handleRevertFromGrid(booking.id, undoOrigin);
                            }}
                            accessibilityLabel="Vrátit na původní místo"
                          >
                            <Ionicons name="arrow-undo" size={11} color="rgba(255,255,255,0.95)" />
                          </TouchableOpacity>
                        )}
                        {showUnpaidAlert && (
                          <UnpaidAlertIcon
                            hovered={hoveredUnpaidAlertId === booking.id}
                            onHoverIn={() => setHoveredUnpaidAlertId(booking.id)}
                            onHoverOut={() => setHoveredUnpaidAlertId(id => id === booking.id ? null : id)}
                          />
                        )}
                      </View>
                    )}
                  </View>
                );
              })}

              {/* Linka aktuálního času */}
              {showNowLine && (
                <>
                  <View style={[s.nowLine, { left: nowLineX }]} />
                  <View style={[s.nowBubble, { left: Math.max(2, nowLineX - 18) }]}>
                    <Text style={s.nowBubbleText}>{nowLabel}</Text>
                  </View>
                </>
              )}
            </View>
          </ScrollView>
        </View>
      </View>

      <Text style={s.dragHint}>
        Táhněte aktivní rezervaci pro přesunutí · nelze do minulosti · klepněte pro detail
      </Text>

      {/* Výběr týdne — kalendář */}
      <WeekPickerModal
        visible={calendarVisible}
        weekOffset={weekOffset}
        onSelectWeek={handleSelectWeek}
        onClose={() => setCalendarVisible(false)}
        maxBookingDaysAhead={settings.maxBookingDaysAhead}
        dayOverrideKeys={dayOverrideKeys}
      />

      {/* Detail rezervace */}
      {selectedBooking && (
        <BookingDetailModal
          booking={selectedBooking}
          court={courts.find(c => c.id === selectedBooking.court_id) ?? null}
          maxBookingDaysAhead={settings.maxBookingDaysAhead}
          minBookingDurationMinutes={settings.minBookingDurationMinutes}
          closingSlot={effectiveClosingSlot}
          occupiedSlots={(() => {
            const set = new Set<number>();
            bookings
              .filter(b =>
                b.id !== selectedBooking.id
                && b.date === selectedBooking.date
                && b.court_id === selectedBooking.court_id
                && b.status !== 'cancelled'
              )
              .forEach(b => b.slots.forEach(s => set.add(s)));
            return set;
          })()}
          onClose={() => {
            setRevertError(null);
            setSelectedBooking(null);
          }}
          undoPosition={(() => {
            const origin = pendingUndo[selectedBooking.id];
            if (!origin) return null;
            if (!bookingPositionDiffers(selectedBooking, origin)) return null;
            return origin;
          })()}
          undoLabel={(() => {
            const origin = pendingUndo[selectedBooking.id];
            return origin ? formatOriginalPosition(origin, courts) : '';
          })()}
          revertError={revertError}
          onRevert={() => {
            const origin = pendingUndo[selectedBooking.id];
            if (!origin) return;
            setRevertError(null);
            const result = revertBookingMove(selectedBooking.id, origin);
            if (result.ok) {
              clearPositionUndo(selectedBooking.id);
              setSelectedBooking(result.booking);
              if (result.booking.date !== dateKey) {
                const [y, m, d] = result.booking.date.split('-').map(Number);
                const picked = new Date(y, m - 1, d, 12, 0, 0);
                setSelectedDate(picked);
                setWeekOffset(getWeekOffsetForDate(picked));
              }
            } else {
              setRevertError(result.error);
            }
          }}
          onUpdatePayment={(status) => {
            updateBooking(selectedBooking.id, { payment_status: status });
            setSelectedBooking(prev => prev ? { ...prev, payment_status: status } : null);
          }}
          onChangeDate={(newDate) => {
            if (newDate !== selectedBooking.date) capturePositionUndo(selectedBooking.id);
            const result = changeBookingDate(selectedBooking.id, newDate);
            if (result.ok) {
              setSelectedBooking(result.booking);
              if (newDate !== dateKey) {
                const [y, m, d] = newDate.split('-').map(Number);
                const picked = new Date(y, m - 1, d, 12, 0, 0);
                setSelectedDate(picked);
                setWeekOffset(getWeekOffsetForDate(picked));
              }
            }
            return result;
          }}
          onChangeDuration={(durationMinutes) => {
            if (durationMinutes !== selectedBooking.slots.length * 30) {
              capturePositionUndo(selectedBooking.id);
            }
            const result = changeBookingDuration(selectedBooking.id, durationMinutes);
            if (result.ok) setSelectedBooking(result.booking);
            return result;
          }}
          onUpdateNote={(note) => {
            updateBooking(selectedBooking.id, note ? { note } : { note: '' });
            setSelectedBooking(prev => {
              if (!prev) return null;
              if (note) return { ...prev, note };
              const { note: _removed, ...rest } = prev;
              return rest;
            });
          }}
          onCancel={() => {
            updateBooking(selectedBooking.id, { status: 'cancelled' });
            clearPositionUndo(selectedBooking.id);
            setSelectedBooking(null);
          }}
        />
      )}

      {/* Nová rezervace ze volného slotu */}
      {createDraft && (
        <ClubBookingCreateModal
          court={courts.find(c => c.id === createDraft.courtId) ?? null}
          date={selectedDate}
          slotIdx={createDraft.slotIdx}
          closingSlot={effectiveClosingSlot}
          settings={settings}
          occupiedSlots={occupiedByCourt[createDraft.courtId] ?? new Set()}
          onClose={() => setCreateDraft(null)}
          onSave={(params) => {
            const created = createBooking(params);
            if (created) setCreateDraft(null);
          }}
        />
      )}

      {/* Tooltip poznámky */}
      {noteTooltip !== null && (
        <NoteTooltipModal note={noteTooltip} onClose={() => setNoteTooltip(null)} />
      )}
    </ScrollView>
  );
}

// ─── Nezaplacená proběhlá rezervace — vykřičník za textem ───────────────────

function UnpaidAlertIcon({
  hovered,
  onHoverIn,
  onHoverOut,
}: {
  hovered: boolean;
  onHoverIn: () => void;
  onHoverOut: () => void;
}) {
  const webHoverProps = Platform.OS === 'web'
    ? { onMouseEnter: onHoverIn, onMouseLeave: onHoverOut } as Record<string, unknown>
    : {};
  return (
    <View style={s.unpaidAlertIconWrap} {...webHoverProps}>
      {Platform.OS === 'web' && hovered && (
        <View style={s.unpaidAlertTooltip}>
          <Text style={s.unpaidAlertTooltipText}>Nezaplaceno</Text>
        </View>
      )}
      <Ionicons name="alert-circle" size={24} color="#EF4444" />
    </View>
  );
}

// ─── Tooltip poznámky rezervace ──────────────────────────────────────────────

function NoteTooltipModal({ note, onClose }: { note: string; onClose: () => void }) {
  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={nt.overlay}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={nt.box}>
              <View style={nt.header}>
                <Ionicons name="information-circle" size={18} color={W.orange} />
                <Text style={nt.label}>POZNÁMKA</Text>
                <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close" size={16} color="rgba(255,255,255,0.5)" />
                </TouchableOpacity>
              </View>
              <Text style={nt.text}>{note}</Text>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const nt = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  box: {
    backgroundColor: '#1C1C1E',
    borderRadius: 10,
    padding: 16,
    width: '100%',
    maxWidth: 320,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    flex: 1,
    fontSize: 10,
    fontWeight: '900',
    color: W.orange,
    letterSpacing: 1.2,
  },
  text: {
    fontSize: 14,
    color: '#F5F5F5',
    lineHeight: 21,
    fontWeight: '500',
  },
});

// ─── Kalendářový výběr jednoho dne (detail rezervace) ─────────────────────────

function DayPickerModal({ visible, selectedDateKey, onSelectDate, onClose, maxBookingDaysAhead }: {
  visible: boolean;
  selectedDateKey: string;
  onSelectDate: (dateKey: string) => void;
  onClose: () => void;
  maxBookingDaysAhead: number;
}) {
  const [dispMonth, setDispMonth] = useState(0);
  const [dispYear,  setDispYear]  = useState(() => new Date().getFullYear());

  useEffect(() => {
    if (visible && selectedDateKey) {
      const [y, m] = selectedDateKey.split('-').map(Number);
      setDispMonth(m - 1);
      setDispYear(y);
    }
  }, [visible, selectedDateKey]);

  const todayKey = localDateKey();
  const bookingDeadline = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + maxBookingDaysAhead);
    return d;
  }, [maxBookingDaysAhead]);

  const rows = useMemo(() => {
    const first = new Date(dispYear, dispMonth, 1);
    const start = getMonday(first);
    const all   = Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d;
    });
    const result: Date[][] = [];
    for (let i = 0; i < 42; i += 7) result.push(all.slice(i, i + 7));
    return result;
  }, [dispYear, dispMonth]);

  const goPrev = () => {
    if (dispMonth === 0) { setDispMonth(11); setDispYear(y => y - 1); }
    else setDispMonth(m => m - 1);
  };
  const goNext = () => {
    if (dispMonth === 11) { setDispMonth(0); setDispYear(y => y + 1); }
    else setDispMonth(m => m + 1);
  };

  function handleDayPress(date: Date) {
    const key = localDateKey(date);
    const dateNorm = new Date(date);
    dateNorm.setHours(0, 0, 0, 0);
    if (key < todayKey || dateNorm > bookingDeadline) return;
    onSelectDate(key);
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={cal.overlay}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={cal.sheet}>
              <View style={cal.topBar} />
              <View style={cal.header}>
                <TouchableOpacity onPress={goPrev} style={cal.navBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="chevron-back" size={20} color={W.orange} />
                </TouchableOpacity>
                <Text style={cal.monthLabel}>
                  {MONTH_NAMES[dispMonth]} {dispYear}
                </Text>
                <TouchableOpacity onPress={goNext} style={cal.navBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="chevron-forward" size={20} color={W.orange} />
                </TouchableOpacity>
              </View>
              <View style={cal.dayLabelsRow}>
                {DAY_ABBR.map(label => (
                  <View key={label} style={cal.dayLabelCell}>
                    <Text style={cal.dayLabelText}>{label}</Text>
                  </View>
                ))}
              </View>
              {rows.map((row, ri) => (
                <View key={ri} style={cal.gridRow}>
                  {row.map((date, ci) => {
                    const key      = localDateKey(date);
                    const inMonth  = date.getMonth() === dispMonth;
                    const isSel    = key === selectedDateKey;
                    const isToday  = key === todayKey;
                    const dateNorm = new Date(date);
                    dateNorm.setHours(0, 0, 0, 0);
                    const isPast   = key < todayKey;
                    const isBeyond = dateNorm > bookingDeadline;
                    const disabled = isPast || isBeyond;
                    return (
                      <TouchableOpacity
                        key={ci}
                        onPress={() => handleDayPress(date)}
                        disabled={disabled}
                        activeOpacity={0.65}
                        style={[cal.dayCell, isSel && cal.dayCellActive]}
                      >
                        <Text style={[
                          cal.dayNum,
                          !inMonth && cal.dayNumFaded,
                          disabled && inMonth && cal.dayNumBeyond,
                          isSel && cal.dayNumActive,
                        ]}>
                          {date.getDate()}
                        </Text>
                        {isBeyond && inMonth && !isSel && (
                          <Ionicons name="lock-closed-outline" size={7} color={colors.textDisabled} style={cal.beyondIcon} />
                        )}
                        {isToday && !isSel && (
                          <View style={cal.todayDot} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
              <TouchableOpacity onPress={onClose} style={cal.footer}>
                <Text style={cal.footerText}>ZAVŘÍT</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

// ─── Kalendářový výběr týdne ─────────────────────────────────────────────────

function WeekPickerModal({ visible, weekOffset, onSelectWeek, onClose, maxBookingDaysAhead, dayOverrideKeys }: {
  visible: boolean;
  weekOffset: number;
  onSelectWeek: (offset: number) => void;
  onClose: () => void;
  maxBookingDaysAhead: number;
  dayOverrideKeys?: string[];
}) {
  const [dispMonth, setDispMonth] = useState(0);
  const [dispYear,  setDispYear]  = useState(() => new Date().getFullYear());

  // Při otevření přeskočíme na měsíc aktuálně vybraného týdne
  useEffect(() => {
    if (visible) {
      const d = getWeekDays(weekOffset)[0];
      setDispMonth(d.getMonth());
      setDispYear(d.getFullYear());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const selectedWeekKeys = useMemo(
    () => getWeekDays(weekOffset).map(d => localDateKey(d)),
    [weekOffset],
  );
  const todayKey = localDateKey();

  // Poslední dostupný den pro rezervaci (inclusive)
  const bookingDeadline = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + maxBookingDaysAhead);
    return d;
  }, [maxBookingDaysAhead]);

  // Mřížka: 6 řádků × 7 sloupců, začíná pondělím týdne obsahujícím 1. den měsíce
  const rows = useMemo(() => {
    const first = new Date(dispYear, dispMonth, 1);
    const start = getMonday(first);
    const all   = Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d;
    });
    const result: Date[][] = [];
    for (let i = 0; i < 42; i += 7) result.push(all.slice(i, i + 7));
    return result;
  }, [dispYear, dispMonth]);

  const goPrev = () => {
    if (dispMonth === 0) { setDispMonth(11); setDispYear(y => y - 1); }
    else setDispMonth(m => m - 1);
  };
  const goNext = () => {
    if (dispMonth === 11) { setDispMonth(0); setDispYear(y => y + 1); }
    else setDispMonth(m => m + 1);
  };

  const handleDayPress = (date: Date) => {
    onSelectWeek(getWeekOffsetForDate(date));
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={cal.overlay}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={cal.sheet}>
              {/* Oranžový pruh */}
              <View style={cal.topBar} />

              {/* Záhlaví: šipky + název měsíce */}
              <View style={cal.header}>
                <TouchableOpacity onPress={goPrev} style={cal.navBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="chevron-back" size={20} color={W.orange} />
                </TouchableOpacity>
                <Text style={cal.monthLabel}>
                  {MONTH_NAMES[dispMonth]} {dispYear}
                </Text>
                <TouchableOpacity onPress={goNext} style={cal.navBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="chevron-forward" size={20} color={W.orange} />
                </TouchableOpacity>
              </View>

              {/* Popisky dní (Po–Ne) */}
              <View style={cal.dayLabelsRow}>
                {DAY_ABBR.map(label => (
                  <View key={label} style={cal.dayLabelCell}>
                    <Text style={cal.dayLabelText}>{label}</Text>
                  </View>
                ))}
              </View>

              {/* Mřížka dní — řádek = týden */}
              {rows.map((row, ri) => {
                const mondayKey = localDateKey(row[0]);
                const isSelRow  = selectedWeekKeys.includes(mondayKey);
                return (
                  <View key={ri} style={[cal.gridRow, isSelRow && cal.gridRowSelected]}>
                    {row.map((date, ci) => {
                      const key      = localDateKey(date);
                      const inMonth  = date.getMonth() === dispMonth;
                      const isSel    = selectedWeekKeys.includes(key);
                      const isToday  = key === todayKey;
                      const isFirst  = ci === 0;
                      const isLast   = ci === 6;
                      const dateNorm = new Date(date); dateNorm.setHours(0, 0, 0, 0);
                      const isBeyond = dateNorm > bookingDeadline;
                      const hasOverride = dayOverrideKeys?.includes(key);
                      return (
                        <TouchableOpacity
                          key={ci}
                          onPress={() => handleDayPress(date)}
                          activeOpacity={0.65}
                          style={[
                            cal.dayCell,
                            isSelRow && isFirst && cal.dayCellLeft,
                            isSelRow && isLast  && cal.dayCellRight,
                          ]}
                        >
                          <Text style={[
                            cal.dayNum,
                            !inMonth && cal.dayNumFaded,
                            isBeyond && inMonth && cal.dayNumBeyond,
                            isSel && inMonth && cal.dayNumSelected,
                          ]}>
                            {date.getDate()}
                          </Text>
                          {isBeyond && inMonth && !isSel && (
                            <Ionicons name="lock-closed-outline" size={7} color={colors.textDisabled} style={cal.beyondIcon} />
                          )}
                          {hasOverride && inMonth && (
                            <View style={[cal.overrideDot, isSel && cal.overrideDotSel]} />
                          )}
                          {isToday && (
                            <View style={[cal.todayDot, isSel && cal.todayDotSel]} />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                );
              })}

              {/* Patička */}
              <TouchableOpacity onPress={onClose} style={cal.footer}>
                <Text style={cal.footerText}>ZAVŘÍT</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

// ─── Nová rezervace (správce klubu) ──────────────────────────────────────────

const DURATION_OPTIONS = [30, 60, 90, 120, 150, 180] as const;

function slotsForDuration(startSlot: number, durationMinutes: number): number[] {
  const count = durationMinutes / 30;
  return Array.from({ length: count }, (_, i) => startSlot + i);
}

function isDurationValid(
  durationMinutes: number,
  startSlot: number,
  closingSlot: number,
  occupied: Set<number>,
): boolean {
  const slots = slotsForDuration(startSlot, durationMinutes);
  if (Math.max(...slots) > closingSlot) return false;
  return !slots.some(s => occupied.has(s));
}

type PlayerInputMode = 'registered' | 'manual';

const PLAYER_RESULT_ROW_H = 52;
const PLAYER_RESULTS_MAX_VISIBLE = 5;

function filterRegisteredPlayers(players: RegisteredPlayer[], query: string): RegisteredPlayer[] {
  const q = query.trim().toLowerCase();
  if (!q) return players;
  return players.filter(p =>
    p.first_name.toLowerCase().includes(q) ||
    p.last_name.toLowerCase().includes(q) ||
    p.email.toLowerCase().includes(q),
  );
}

function ClubBookingCreateModal({ court, date, slotIdx, closingSlot, settings, occupiedSlots, onClose, onSave }: {
  court: CourtWithClub | null;
  date: Date;
  slotIdx: number;
  closingSlot: number;
  settings: ClubSettings;
  occupiedSlots: Set<number>;
  onClose: () => void;
  onSave: (params: {
    courtId: string;
    playerName: string;
    date: string;
    slots: number[];
    price: number;
    paymentStatus: PaymentStatus;
    note?: string;
  }) => void;
}) {
  const [durationMinutes, setDurationMinutes] = useState(settings.minBookingDurationMinutes);
  const [playerMode, setPlayerMode]           = useState<PlayerInputMode>('registered');
  const [playerSearch, setPlayerSearch]       = useState('');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [manualName, setManualName]           = useState('');
  const [paymentStatus, setPaymentStatus]     = useState<PaymentStatus>('pay_on_site');
  const [note, setNote]                       = useState('');
  const [error, setError]                     = useState<string | null>(null);

  const filteredPlayers = useMemo(
    () => filterRegisteredPlayers(MOCK_REGISTERED_PLAYERS, playerSearch),
    [playerSearch],
  );
  const selectedPlayer = useMemo(
    () => MOCK_REGISTERED_PLAYERS.find(p => p.id === selectedPlayerId) ?? null,
    [selectedPlayerId],
  );

  if (!court) return null;

  const courtData = court;
  const accent   = SPORT_COLORS[courtData.sport] ?? W.orange;
  const dateKey  = localDateKey(date);
  const fmt      = fmtDay(date);
  const slots    = slotsForDuration(slotIdx, durationMinutes);
  const slotMax  = Math.max(...slots);
  const price    = Math.round(calculateSlotsPrice(
    courtData.id, dateKey, slots, courtData.price_per_hour, settings,
  ));
  const durationValid = isDurationValid(durationMinutes, slotIdx, closingSlot, occupiedSlots);
  const playerValid = playerMode === 'manual'
    ? manualName.trim().length > 0
    : selectedPlayerId !== null;
  const canSave = durationValid && playerValid;

  function handleSave() {
    const now = new Date();
    if (!isSlotOpenForNewBooking(slotIdx, dateKey, localDateKey(now), now.getHours() * 60 + now.getMinutes())) {
      setError('Tento čas už proběhl — vyberte budoucí slot.');
      return;
    }
    if (!durationValid) {
      setError('Vybraná délka přesahuje provozní dobu nebo koliduje s jinou rezervací.');
      return;
    }
    let name = '';
    if (playerMode === 'registered') {
      const player = MOCK_REGISTERED_PLAYERS.find(p => p.id === selectedPlayerId);
      name = player ? registeredPlayerFullName(player) : '';
      if (!name) {
        setError('Vyberte registrovaného hráče ze seznamu.');
        return;
      }
    } else {
      name = manualName.trim();
      if (!name) {
        setError('Zadejte jméno hráče.');
        return;
      }
    }
    setError(null);
    onSave({
      courtId:       courtData.id,
      playerName:    name,
      date:          dateKey,
      slots,
      price,
      paymentStatus,
      note:          note.trim() || undefined,
    });
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.detailOverlay}>
        <View style={s.detailSheet}>
          <View style={s.modalHandle} />

          <View style={[s.detailHeader, { backgroundColor: accent }]}>
            <View style={{ flex: 1 }}>
              <Text style={s.detailPayBadgeText}>NOVÁ REZERVACE</Text>
              <Text style={s.detailPlayerName}>{courtData.name}</Text>
              <Text style={[s.detailPayBadgeText, { marginTop: 4, opacity: 0.85 }]}>
                {fmt.short} {fmt.num}. {fmt.month} · {slotToTime(slotIdx)}–{slotEndTime(slotMax)} · {price} Kč
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={s.detailCloseBtn}>
              <Ionicons name="close" size={22} color="rgba(255,255,255,0.85)" />
            </TouchableOpacity>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled">
            <View style={s.detailRows}>
              <Text style={s.fieldLabel}>DÉLKA REZERVACE</Text>
              <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 6 }}>
                Minimální doba: {settings.minBookingDurationMinutes} min
              </Text>
              <View style={s.chipRow}>
                {DURATION_OPTIONS.map(mins => {
                  const belowMin = mins < settings.minBookingDurationMinutes;
                  const valid = !belowMin && isDurationValid(mins, slotIdx, closingSlot, occupiedSlots);
                  const selected = durationMinutes === mins;
                  return (
                    <TouchableOpacity
                      key={mins}
                      disabled={!valid}
                      onPress={() => { setDurationMinutes(mins); setError(null); }}
                      style={[
                        s.chip,
                        selected && { backgroundColor: accent, borderColor: 'transparent' },
                        !valid && { opacity: 0.35 },
                      ]}
                    >
                      <Text style={[s.chipText, selected && { color: '#fff' }]}>
                        {slotDuration(mins / 30)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {!durationValid && (
                <Text style={{ fontSize: 12, color: colors.error, marginTop: 4 }}>
                  Vybraná délka přesahuje provozní dobu nebo koliduje s jinou rezervací.
                </Text>
              )}

              <Text style={[s.fieldLabel, { marginTop: 16 }]}>HRÁČ</Text>
              <View style={s.chipRow}>
                <TouchableOpacity
                  onPress={() => { setPlayerMode('registered'); setError(null); }}
                  style={[
                    s.chip,
                    playerMode === 'registered' && { backgroundColor: W.orange, borderColor: 'transparent' },
                  ]}
                >
                  <Text style={[s.chipText, playerMode === 'registered' && { color: '#fff' }]}>
                    Registrovaný uživatel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => { setPlayerMode('manual'); setError(null); }}
                  style={[
                    s.chip,
                    playerMode === 'manual' && { backgroundColor: W.orange, borderColor: 'transparent' },
                  ]}
                >
                  <Text style={[s.chipText, playerMode === 'manual' && { color: '#fff' }]}>
                    Ručně zadat jméno
                  </Text>
                </TouchableOpacity>
              </View>

              {playerMode === 'registered' ? (
                <View style={{ marginTop: 4 }}>
                  <TextInput
                    style={s.fieldInput}
                    value={playerSearch}
                    onChangeText={text => { setPlayerSearch(text); setError(null); }}
                    placeholder="Hledat podle jména, příjmení nebo e-mailu…"
                    placeholderTextColor={colors.textDisabled}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />

                  {selectedPlayer && (
                    <View style={[s.chipRow, { marginTop: 8 }]}>
                      <View style={[s.chip, s.playerSelectedChip]}>
                        <Text style={[s.chipText, { color: '#fff' }]}>
                          {registeredPlayerFullName(selectedPlayer)}
                        </Text>
                        <TouchableOpacity
                          onPress={() => { setSelectedPlayerId(null); setError(null); }}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons name="close-circle" size={16} color="rgba(255,255,255,0.85)" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  {filteredPlayers.length === 0 ? (
                    playerSearch.trim().length > 0 && (
                      <Text style={s.playerSearchEmpty}>Žádný uživatel nenalezen</Text>
                    )
                  ) : (
                    <ScrollView
                      style={[
                        s.playerResultsList,
                        { maxHeight: PLAYER_RESULT_ROW_H * PLAYER_RESULTS_MAX_VISIBLE },
                      ]}
                      keyboardShouldPersistTaps="handled"
                      nestedScrollEnabled
                    >
                      {filteredPlayers.map(p => {
                        const isSelected = selectedPlayerId === p.id;
                        return (
                          <TouchableOpacity
                            key={p.id}
                            onPress={() => { setSelectedPlayerId(p.id); setError(null); }}
                            style={[
                              s.playerResultRow,
                              isSelected && s.playerResultRowSelected,
                            ]}
                          >
                            <Text style={[
                              s.playerResultName,
                              isSelected && s.playerResultNameSelected,
                            ]}>
                              {registeredPlayerFullName(p)}
                            </Text>
                            <Text style={[
                              s.playerResultEmail,
                              isSelected && s.playerResultEmailSelected,
                            ]}>
                              {p.email}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  )}
                </View>
              ) : (
                <TextInput
                  style={s.fieldInput}
                  value={manualName}
                  onChangeText={setManualName}
                  placeholder="Jan Novák"
                  placeholderTextColor={colors.textDisabled}
                  autoFocus={Platform.OS === 'web'}
                />
              )}
              {error && <Text style={{ fontSize: 12, color: colors.error, marginTop: 4 }}>{error}</Text>}

              <Text style={[s.fieldLabel, { marginTop: 16 }]}>PLATEBNÍ STAV</Text>
              <View style={s.detailPayRow}>
                {(Object.keys(PAYMENT_BG) as PaymentStatus[]).map(k => (
                  <TouchableOpacity
                    key={k}
                    onPress={() => setPaymentStatus(k)}
                    style={[
                      s.detailPayChip,
                      { borderColor: PAYMENT_BG[k] },
                      paymentStatus === k && { backgroundColor: PAYMENT_BG[k] },
                    ]}
                  >
                    <Text style={[
                      s.detailPayChipText,
                      paymentStatus === k ? { color: '#fff' } : { color: PAYMENT_BG[k] },
                    ]}>
                      {PAYMENT_LABEL[k]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[s.fieldLabel, { marginTop: 16 }]}>POZNÁMKA (VOLITELNÉ)</Text>
              <TextInput
                style={[s.fieldInput, { minHeight: 72, textAlignVertical: 'top' }]}
                value={note}
                onChangeText={setNote}
                placeholder="Poznámka k rezervaci…"
                placeholderTextColor={colors.textDisabled}
                multiline
                numberOfLines={3}
              />
            </View>

            <TouchableOpacity
              onPress={handleSave}
              disabled={!canSave}
              style={[
                s.saveBtn,
                { backgroundColor: accent, marginHorizontal: 16, marginTop: 8 },
                !canSave && { opacity: 0.5 },
              ]}
            >
              <Text style={s.saveBtnText}>VYTVOŘIT REZERVACI</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={s.cancelModalBtn}>
              <Text style={s.cancelModalText}>Zrušit</Text>
            </TouchableOpacity>
            <View style={{ height: 24 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── Detail rezervace (popup) ─────────────────────────────────────────────────

function BookingDetailModal({ booking, court, maxBookingDaysAhead, minBookingDurationMinutes, closingSlot, occupiedSlots, undoPosition, undoLabel, revertError, onClose, onUpdatePayment, onChangeDate, onChangeDuration, onUpdateNote, onRevert, onCancel }: {
  booking: ClubBooking;
  court: CourtWithClub | null;
  maxBookingDaysAhead: number;
  minBookingDurationMinutes: number;
  closingSlot: number;
  occupiedSlots: Set<number>;
  undoPosition: OriginalBookingPosition | null;
  undoLabel: string;
  revertError: string | null;
  onClose: () => void;
  onUpdatePayment: (status: 'paid' | 'pay_on_site' | 'pending') => void;
  onChangeDate: (newDate: string) => { ok: true; booking: ClubBooking } | { ok: false; error: string };
  onChangeDuration: (durationMinutes: number) => { ok: true; booking: ClubBooking } | { ok: false; error: string };
  onUpdateNote: (note: string | undefined) => void;
  onRevert: () => void;
  onCancel: () => void;
}) {
  const [confirmCancel, setConfirmCancel]   = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [dateError, setDateError]           = useState<string | null>(null);
  const [durationError, setDurationError]   = useState<string | null>(null);
  const [noteText, setNoteText]             = useState(booking.note ?? '');
  const accent    = SPORT_COLORS[court?.sport ?? 'tennis'] ?? W.orange;
  const slotMin   = Math.min(...booking.slots);
  const slotMax   = Math.max(...booking.slots);
  const now        = new Date();
  const todayKey   = localDateKey(now);
  const isPast     = isBookingPast(booking, booking.date, todayKey, now);
  const bgColor    = isPast ? PAST_BOOKING_BG : PAYMENT_BG[booking.payment_status];
  const currentDuration = booking.slots.length * 30;

  const dateObj = new Date(booking.date + 'T12:00:00');
  const fmt     = fmtDay(dateObj);
  const savedNote = booking.note ?? '';
  const noteDirty = noteText.trim() !== savedNote.trim();

  useEffect(() => {
    setNoteText(booking.note ?? '');
  }, [booking.id, booking.note]);

  function handleDateSelect(dayKey: string) {
    if (dayKey === booking.date) {
      setDateError(null);
      return;
    }
    const result = onChangeDate(dayKey);
    if (result.ok) setDateError(null);
    else setDateError(result.error);
  }

  function handleDurationPick(mins: number) {
    if (mins === currentDuration) {
      setDurationError(null);
      return;
    }
    const result = onChangeDuration(mins);
    if (result.ok) setDurationError(null);
    else setDurationError(result.error);
  }

  function handleSaveNote() {
    const trimmed = noteText.trim();
    onUpdateNote(trimmed || undefined);
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.detailOverlay}>
        <View style={s.detailSheet}>
          <View style={s.modalHandle} />

          {/* Hlavička — barva platby */}
          <View style={[s.detailHeader, { backgroundColor: bgColor }]}>
            <View style={{ flex: 1 }}>
              <View style={s.detailPayBadge}>
                <Text style={s.detailPayBadgeText}>
                  {isPast ? 'Proběhlá' : PAYMENT_LABEL[booking.payment_status]}
                </Text>
              </View>
              <Text style={s.detailPlayerName}>{booking.player_name}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={s.detailCloseBtn}>
              <Ionicons name="close" size={22} color="rgba(255,255,255,0.85)" />
            </TouchableOpacity>
          </View>

          <ScrollView>
            {/* Info řádky */}
            <View style={s.detailRows}>
              {!isPast ? (
                <TouchableOpacity
                  style={s.detailRowTouchable}
                  onPress={() => setDatePickerVisible(true)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="calendar-outline" size={16} color={colors.textMuted} style={{ width: 22 }} />
                  <Text style={s.detailRowLabel}>Datum</Text>
                  <Text style={s.detailRowValue}>
                    {fmt.short} {fmt.num}. {fmt.month} {dateObj.getFullYear()}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              ) : (
                <DetailRow icon="calendar-outline" label="Datum"
                  value={`${fmt.short} ${fmt.num}. ${fmt.month} ${dateObj.getFullYear()}`} />
              )}
              <DetailRow icon="time-outline" label="Čas"
                value={`${slotToTime(slotMin)} – ${slotEndTime(slotMax)}`} />
              {!isPast ? (
                <>
                  <Text style={[s.fieldLabel, { marginTop: 8, marginBottom: 0 }]}>TRVÁNÍ</Text>
                  <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 4 }}>
                    Minimální doba: {minBookingDurationMinutes} min
                  </Text>
                  <View style={[s.chipRow, { marginTop: 8 }]}>
                    {DURATION_OPTIONS.map(mins => {
                      const belowMin = mins < minBookingDurationMinutes;
                      const valid = !belowMin && isDurationValid(mins, slotMin, closingSlot, occupiedSlots);
                      const selected = currentDuration === mins;
                      return (
                        <TouchableOpacity
                          key={mins}
                          disabled={!valid}
                          onPress={() => handleDurationPick(mins)}
                          style={[
                            s.chip,
                            selected && { backgroundColor: accent, borderColor: 'transparent' },
                            !valid && { opacity: 0.35 },
                          ]}
                        >
                          <Text style={[s.chipText, selected && { color: '#fff' }]}>
                            {slotDuration(mins / 30)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  {durationError && (
                    <Text style={s.detailDateError}>{durationError}</Text>
                  )}
                </>
              ) : (
                <DetailRow icon="hourglass-outline" label="Trvání"
                  value={`${booking.slots.length * 30} min`} />
              )}
              <DetailRow icon="location-outline" label="Kurt"
                value={court?.name ?? booking.court_id} />
              <DetailRow icon="cash-outline" label="Cena"
                value={`${booking.price} Kč`} accent={accent} />
              {dateError && (
                <Text style={s.detailDateError}>{dateError}</Text>
              )}
            </View>

            {/* Vrátit přesunutou rezervaci na původní místo */}
            {!isPast && undoPosition && (
              <View style={s.detailUndoSection}>
                <TouchableOpacity onPress={onRevert} style={s.detailUndoBtn} activeOpacity={0.75}>
                  <Ionicons name="arrow-undo" size={18} color={W.orange} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={s.detailUndoTitle}>Vrátit na původní místo</Text>
                    <Text style={s.detailUndoSub} numberOfLines={2}>{undoLabel}</Text>
                  </View>
                </TouchableOpacity>
                {revertError && (
                  <Text style={s.detailDateError}>{revertError}</Text>
                )}
              </View>
            )}

            {/* Poznámka */}
            {!isPast ? (
              <View style={s.detailNoteSection}>
                <Text style={s.detailSectionLabel}>POZNÁMKA</Text>
                <TextInput
                  style={[s.fieldInput, s.detailNoteInput]}
                  value={noteText}
                  onChangeText={setNoteText}
                  placeholder="Poznámka k rezervaci…"
                  placeholderTextColor={colors.textDisabled}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
                {noteDirty && (
                  <TouchableOpacity
                    onPress={handleSaveNote}
                    style={[s.detailNoteSaveBtn, { backgroundColor: accent }]}
                  >
                    <Text style={s.detailNoteSaveText}>ULOŽIT POZNÁMKU</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : booking.note ? (
              <View style={s.detailNoteSection}>
                <Text style={s.detailSectionLabel}>POZNÁMKA</Text>
                <View style={s.detailNoteReadonly}>
                  <Text style={s.detailNoteText}>{booking.note}</Text>
                </View>
              </View>
            ) : null}

            {/* Platební stav — u proběhlých lze měnit jen platbu */}
            <Text style={s.detailSectionLabel}>PLATEBNÍ STAV</Text>
            <View style={s.detailPayRow}>
              {(Object.keys(PAYMENT_BG) as (keyof typeof PAYMENT_BG)[]).map(k => (
                <TouchableOpacity
                  key={k}
                  onPress={() => onUpdatePayment(k as PaymentStatus)}
                  style={[
                    s.detailPayChip,
                    { borderColor: PAYMENT_BG[k] },
                    booking.payment_status === k && { backgroundColor: PAYMENT_BG[k] },
                  ]}
                >
                  <Text style={[
                    s.detailPayChipText,
                    booking.payment_status === k ? { color: '#fff' } : { color: PAYMENT_BG[k] },
                  ]}>
                    {PAYMENT_LABEL[k]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {isPast ? (
              <View style={s.detailPastNotice}>
                <Ionicons name="lock-closed-outline" size={16} color={colors.textMuted} />
                <Text style={s.detailPastNoticeText}>
                  Proběhlá rezervace — lze upravit jen platební stav
                </Text>
              </View>
            ) : !confirmCancel ? (
              <TouchableOpacity onPress={() => setConfirmCancel(true)} style={s.detailCancelBtn}>
                <Ionicons name="trash-outline" size={16} color={colors.error} />
                <Text style={s.detailCancelText}>Zrušit rezervaci</Text>
              </TouchableOpacity>
            ) : (
              <View style={s.detailConfirmCancel}>
                <Text style={s.detailConfirmText}>Opravdu zrušit rezervaci?</Text>
                <View style={s.detailConfirmBtns}>
                  <TouchableOpacity onPress={() => setConfirmCancel(false)} style={s.detailConfirmNo}>
                    <Text style={s.detailConfirmNoText}>Ne</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={onCancel} style={s.detailConfirmYes}>
                    <Text style={s.detailConfirmYesText}>ANO, ZRUŠIT</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            <View style={{ height: 24 }} />
          </ScrollView>
        </View>
      </View>

      <DayPickerModal
        visible={datePickerVisible}
        selectedDateKey={booking.date}
        maxBookingDaysAhead={maxBookingDaysAhead}
        onSelectDate={handleDateSelect}
        onClose={() => setDatePickerVisible(false)}
      />
    </Modal>
  );
}

function DetailRow({ icon, label, value, accent }: {
  icon: string; label: string; value: string; accent?: string;
}) {
  return (
    <View style={s.detailRow}>
      <Ionicons name={icon as any} size={16} color={colors.textMuted} style={{ width: 22 }} />
      <Text style={s.detailRowLabel}>{label}</Text>
      <Text style={[s.detailRowValue, accent ? { color: accent, fontWeight: '800' } : {}]}>
        {value}
      </Text>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: KURTY — kategorie a přiřazení kurtů
// ═══════════════════════════════════════════════════════════════════════════════

function CourtListItem({
  court,
  onEdit,
  onAssign,
  showAssign,
  categoryColor,
  drag,
  isDragging,
}: {
  court: CourtWithClub;
  onEdit: () => void;
  onAssign?: () => void;
  showAssign?: boolean;
  categoryColor?: string;
  drag?: () => void;
  isDragging?: boolean;
}) {
  const accent = categoryColor ?? (SPORT_COLORS[court.sport] ?? W.orange);
  return (
    <View style={[s.courtRow, isDragging && s.draggingRow]}>
      {drag && (
        <TouchableOpacity
          onLongPress={drag}
          delayLongPress={120}
          style={s.dragHandleCourt}
          accessibilityLabel="Přesunout kurt"
        >
          <Ionicons name="reorder-three" size={20} color={colors.textMuted} />
        </TouchableOpacity>
      )}
      <View style={[s.courtRowBar, { backgroundColor: accent }]} />
      <View style={s.courtRowInfo}>
        <Text style={s.courtRowName}>{court.name}</Text>
        <Text style={s.courtRowMeta}>
          {SPORT_LABELS[court.sport]} · {SURFACE_LABELS[court.surface]}
          {' · '}{court.is_indoor ? 'Hala' : 'Venkovní'}
          {' · '}max {court.capacity} hráčů
        </Text>
        <Text style={s.courtRowClub}>{court.club_name}, {court.club_city}</Text>
      </View>
      {showAssign && onAssign && (
        <TouchableOpacity onPress={onAssign} style={s.editIconBtn}>
          <Ionicons name="folder-open-outline" size={20} color="#6366F1" />
        </TouchableOpacity>
      )}
      <TouchableOpacity onPress={onEdit} style={s.editIconBtn}>
        <Ionicons name="create-outline" size={20} color={colors.textSecondary} />
      </TouchableOpacity>
    </View>
  );
}

function CourtsTab({ hook }: { hook: ReturnType<typeof useClubBookings> }) {
  const {
    courts, updateCourt, createCourt, settings, saveCategory, deleteCategory,
    bookings, updateSettings,
    reorderCategories, reorderCourtsInCategory, reorderUncategorizedCourts,
  } = hook;
  const [editingCourt, setEditingCourt] = useState<CourtWithClub | null>(null);
  const [creatingCourt, setCreatingCourt] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CourtCategory | null>(null);
  const [assignCourt, setAssignCourt] = useState<CourtWithClub | null>(null);

  const uncategorized = useMemo(
    () => getUncategorizedCourts(courts, settings),
    [courts, settings.categories, settings.uncategorizedCourtOrder],
  );

  function openNewCategory() {
    setEditingCategory(null);
    setCategoryModalVisible(true);
  }

  function openEditCategory(cat: CourtCategory) {
    setEditingCategory(cat);
    setCategoryModalVisible(true);
  }

  function confirmDeleteCategory(cat: CourtCategory) {
    Alert.alert(
      'Smazat kategorii',
      `Opravdu smazat „${cat.name}"? Kurty zůstanou nezařazené.`,
      [
        { text: 'Zrušit', style: 'cancel' },
        { text: 'Smazat', style: 'destructive', onPress: () => deleteCategory(cat.id) },
      ],
    );
  }

  function handleAssignToCategory(categoryId: string) {
    if (!assignCourt) return;
    const cat = getCategoryById(settings, categoryId);
    if (!cat) return;
    saveCategory({
      ...cat,
      court_ids: [...cat.court_ids, assignCourt.id],
    });
    setAssignCourt(null);
  }

  const renderCategory = useCallback(({ item: cat, drag, isActive }: RenderItemParams<CourtCategory>) => {
    const catCourts = courtsInCategory(courts, cat.id, settings);
    const seasonName = getCategorySeasonLabel(settings, cat.season_id);
    const seasonClosed = settings.seasonalModeEnabled
      && isSeasonClosed(getSeasonById(settings, cat.season_id ?? ''));
    const catColor = resolveCategoryColorHex(cat.color);
    return (
      <ScaleDecorator>
        <View style={[s.categoryBlock, isActive && s.draggingBlock]}>
          <View style={s.categoryHeader}>
            <View style={[s.categoryHeaderBar, { backgroundColor: catColor }]} />
            <View style={s.categoryHeaderBody}>
              <TouchableOpacity
                onLongPress={drag}
                delayLongPress={120}
                style={s.dragHandle}
                accessibilityLabel="Přesunout kategorii"
              >
                <Ionicons name="reorder-three" size={22} color={colors.textMuted} />
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <View style={s.categoryTitleRow}>
                  <Text style={s.categoryTitle}>{cat.name}</Text>
                  {seasonClosed && (
                    <View style={s.closedSeasonBadge}>
                      <Text style={s.closedSeasonBadgeText}>ZAVŘENO</Text>
                    </View>
                  )}
                </View>
                <Text style={s.categoryMeta}>
                  {catCourts.length} {catCourts.length === 1 ? 'kurt' : catCourts.length < 5 ? 'kurty' : 'kurtů'}
                  {seasonName ? ` · ${seasonName}` : ''}
                </Text>
              </View>
              <TouchableOpacity onPress={() => openEditCategory(cat)} style={s.categoryActionBtn}>
                <Ionicons name="create-outline" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => confirmDeleteCategory(cat)} style={s.categoryActionBtn}>
                <Ionicons name="trash-outline" size={18} color={W.red} />
              </TouchableOpacity>
            </View>
          </View>
          {catCourts.length === 0 ? (
            <Text style={s.emptyCategoryHint}>Žádné kurty — upravte kategorii a přiřaďte je.</Text>
          ) : (
            <DraggableFlatList
              data={catCourts}
              keyExtractor={court => court.id}
              scrollEnabled={false}
              activationDistance={8}
              onDragEnd={({ from, to }) => {
                if (from !== to) reorderCourtsInCategory(cat.id, from, to);
              }}
              renderItem={({ item: court, drag: courtDrag, isActive: courtActive }) => (
                <ScaleDecorator>
                  <CourtListItem
                    court={court}
                    categoryColor={catColor}
                    drag={courtDrag}
                    isDragging={courtActive}
                    onEdit={() => setEditingCourt(court)}
                  />
                </ScaleDecorator>
              )}
            />
          )}
        </View>
      </ScaleDecorator>
    );
  }, [courts, settings, reorderCourtsInCategory]);

  return (
    <ScrollView contentContainerStyle={s.courtList}>
      <View style={s.courtsTabHeader}>
        <Text style={s.sectionTitle}>KURTY A KATEGORIE</Text>
        <View style={s.courtsTabHeaderActions}>
          <TouchableOpacity onPress={() => setCreatingCourt(true)} style={s.addCourtBtn} activeOpacity={0.8}>
            <Ionicons name="add-circle-outline" size={16} color={W.orange} />
            <Text style={s.addCourtBtnText}>Nový kurt</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={openNewCategory} style={s.addCategoryBtn} activeOpacity={0.8}>
            <Ionicons name="add-circle-outline" size={16} color="#6366F1" />
            <Text style={s.addCategoryBtnText}>Nová kategorie</Text>
          </TouchableOpacity>
        </View>
      </View>
      <Text style={s.courtsTabHint}>
        {settings.seasonalModeEnabled
          ? 'Seskupte kurty do kategorií podle sezóny. Provozní dobu, ceník a uzavření nastavíte v záložce Nastavení.'
          : 'Seskupte kurty do kategorií. Provozní dobu, ceník a uzavření nastavíte v záložce Nastavení.'}
      </Text>
      <Text style={s.reorderHint}>
        Pořadí kategorií a kurtů přetáhněte ikonou ≡ — projeví se i v záložce Přehled.
      </Text>

      {settings.categories.length > 0 && (
        <DraggableFlatList
          data={settings.categories}
          keyExtractor={cat => cat.id}
          scrollEnabled={false}
          activationDistance={8}
          onDragEnd={({ from, to }) => {
            if (from !== to) reorderCategories(from, to);
          }}
          renderItem={renderCategory}
        />
      )}

      {settings.categories.length === 0 && (
        <Text style={s.emptyCategoryHint}>Zatím nemáte žádné kategorie. Vytvořte první tlačítkem výše.</Text>
      )}

      {uncategorized.length > 0 && (
        <View style={s.categoryBlock}>
          <View style={s.categoryHeader}>
            <View style={[s.categoryHeaderBar, { backgroundColor: colors.textMuted }]} />
            <View style={s.categoryHeaderBody}>
              <View style={{ flex: 1 }}>
                <Text style={s.categoryTitle}>Bez kategorie</Text>
                <Text style={s.categoryMeta}>
                  {uncategorized.length} {uncategorized.length === 1 ? 'kurt' : uncategorized.length < 5 ? 'kurty' : 'kurtů'}
                  {' · '}používají globální nastavení klubu
                </Text>
              </View>
            </View>
          </View>
          <DraggableFlatList
            data={uncategorized}
            keyExtractor={court => court.id}
            scrollEnabled={false}
            activationDistance={8}
            onDragEnd={({ from, to }) => {
              if (from !== to) reorderUncategorizedCourts(from, to);
            }}
            renderItem={({ item: court, drag, isActive }) => (
              <ScaleDecorator>
                <CourtListItem
                  court={court}
                  drag={drag}
                  isDragging={isActive}
                  showAssign
                  onEdit={() => setEditingCourt(court)}
                  onAssign={() => setAssignCourt(court)}
                />
              </ScaleDecorator>
            )}
          />
        </View>
      )}

      <CourtCategoryEditModal
        visible={categoryModalVisible}
        category={editingCategory}
        courts={courts}
        allCategories={settings.categories}
        seasons={settings.seasons ?? []}
        seasonalModeEnabled={settings.seasonalModeEnabled}
        onClose={() => { setCategoryModalVisible(false); setEditingCategory(null); }}
        onSave={(cat) => { saveCategory(cat); setCategoryModalVisible(false); setEditingCategory(null); }}
      />

      {assignCourt && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setAssignCourt(null)}>
          <TouchableOpacity style={s.assignOverlay} activeOpacity={1} onPress={() => setAssignCourt(null)}>
            <View style={s.assignSheet}>
              <Text style={s.assignTitle}>PŘIŘADIT KURT</Text>
              <Text style={s.assignSub}>{assignCourt.name}</Text>
              {settings.categories.length === 0 ? (
                <Text style={s.assignEmpty}>Nejdříve vytvořte kategorii.</Text>
              ) : (
                settings.categories.map(cat => (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => handleAssignToCategory(cat.id)}
                    style={s.assignRow}
                    activeOpacity={0.7}
                  >
                    <View style={[s.assignColorDot, { backgroundColor: resolveCategoryColorHex(cat.color) }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={s.assignRowName}>{cat.name}</Text>
                      {settings.seasonalModeEnabled && cat.season_id && (
                        <Text style={s.assignRowMeta}>{getCategorySeasonLabel(settings, cat.season_id)}</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                ))
              )}
              <TouchableOpacity onPress={() => setAssignCourt(null)} style={s.assignCancel}>
                <Text style={s.assignCancelText}>Zrušit</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {creatingCourt && (
        <CourtEditModal
          isCreate
          categories={settings.categories}
          settings={settings}
          bookings={bookings}
          updateSettings={updateSettings}
          onSave={(data) => {
            createCourt(data);
            setCreatingCourt(false);
          }}
          onClose={() => setCreatingCourt(false)}
        />
      )}

      {editingCourt && (
        <CourtEditModal
          court={editingCourt}
          uncategorized={!editingCourt.category_id && !settings.categories.some(c => c.court_ids.includes(editingCourt.id))}
          settings={settings}
          bookings={bookings}
          updateSettings={updateSettings}
          onSave={(updates) => {
            updateCourt(editingCourt.id, {
              name: updates.name,
              sport: updates.sport,
              surface: updates.surface,
              is_indoor: updates.is_indoor,
              capacity: updates.capacity,
            });
            setEditingCourt(null);
          }}
          onClose={() => setEditingCourt(null)}
        />
      )}
    </ScrollView>
  );
}

// ─── Editační modal kurtu ─────────────────────────────────────────────────────

const SURFACES: { value: CourtSurface; label: string }[] = [
  { value: 'clay',    label: 'Antuka' },
  { value: 'hard',    label: 'Tvrdý' },
  { value: 'grass',   label: 'Tráva' },
  { value: 'carpet',  label: 'Koberec' },
  { value: 'indoor',  label: 'Hala' },
];
const SPORTS: { value: SportType; label: string }[] = [
  { value: 'tennis',     label: 'Tenis' },
  { value: 'badminton',  label: 'Badminton' },
  { value: 'squash',     label: 'Squash' },
  { value: 'padel',      label: 'Padel' },
  { value: 'volleyball', label: 'Volejbal' },
];

function CourtEditModal({
  court,
  isCreate = false,
  categories = [],
  uncategorized,
  settings,
  bookings,
  updateSettings,
  onSave,
  onClose,
}: {
  court?: CourtWithClub;
  isCreate?: boolean;
  categories?: CourtCategory[];
  uncategorized?: boolean;
  settings: ClubSettings;
  bookings: ClubBooking[];
  updateSettings: (updates: Partial<ClubSettings>) => void;
  onSave: (data: {
    name: string;
    sport: SportType;
    surface: CourtSurface;
    is_indoor: boolean;
    capacity: number;
    categoryId?: string | null;
  }) => void;
  onClose: () => void;
}) {
  const [name,     setName]     = useState(court?.name ?? '');
  const [sport,    setSport]    = useState<SportType>(court?.sport ?? 'tennis');
  const [surface,  setSurface]  = useState<CourtSurface>(court?.surface ?? 'clay');
  const [isIndoor, setIsIndoor] = useState(court?.is_indoor ?? false);
  const [capacity, setCapacity] = useState(court?.capacity ?? 4);
  const [categoryId, setCategoryId] = useState<string | null>(
    isCreate ? null : (court?.category_id ?? null),
  );
  const [closureModalVisible, setClosureModalVisible] = useState(false);

  const courtClosures = useMemo(
    () => (court ? getCourtClosurePeriods(court.id, settings) : []),
    [court, settings.closurePeriods],
  );

  const selectedCategory = categoryId ? getCategoryById(settings, categoryId) : undefined;
  const accent = isCreate && selectedCategory
    ? resolveCategoryColorHex(selectedCategory.color)
    : (SPORT_COLORS[sport] ?? W.orange);

  const nameValid = name.trim().length > 0;

  function handleCategorySelect(id: string | null) {
    setCategoryId(id);
  }

  function handleSave() {
    if (!nameValid) {
      Alert.alert('Chybí název', 'Zadejte název kurtu.');
      return;
    }
    onSave({
      name: name.trim(),
      sport,
      surface,
      is_indoor: isIndoor,
      capacity,
      ...(isCreate ? { categoryId } : {}),
    });
  }

  function addCourtClosure(period: Omit<ClubClosurePeriod, 'id'>) {
    updateSettings({
      closurePeriods: [...settings.closurePeriods, { ...period, id: `closure_${Date.now()}` }],
    });
  }

  function removeCourtClosure(id: string) {
    updateSettings({
      closurePeriods: settings.closurePeriods.filter(p => p.id !== id),
    });
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.modalOverlay}>
        <View style={s.modalSheet}>
          <View style={s.modalHandle} />
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={[s.modalBar, { backgroundColor: accent }]} />
            <View style={s.modalBody}>
              <Text style={s.modalTitle}>{isCreate ? 'NOVÝ KURT' : 'UPRAVIT KURT'}</Text>
              {!isCreate && uncategorized && (
                <View style={s.uncategorizedBanner}>
                  <Ionicons name="information-circle" size={16} color="#6366F1" />
                  <Text style={s.uncategorizedBannerText}>
                    Kurt není v žádné kategorii — provoz a ceník berou globální nastavení klubu.
                    Přiřaďte kategorii v záložce Kurty.
                  </Text>
                </View>
              )}

              <Text style={s.fieldLabel}>NÁZEV KURTU</Text>
              <TextInput
                style={[s.fieldInput, !nameValid && name.length > 0 && s.fieldInputError]}
                value={name}
                onChangeText={setName}
                placeholder="Název kurtu"
                placeholderTextColor={colors.textDisabled}
                autoFocus={isCreate}
              />

              {isCreate && (
                <>
                  <Text style={s.fieldLabel}>KATEGORIE (VOLITELNÉ)</Text>
                  <Text style={s.courtCreateCategoryHint}>
                    Barva kurtu se odvodí z vybrané kategorie. Bez kategorie platí globální nastavení klubu.
                  </Text>
                  <View style={s.chipRow}>
                    <TouchableOpacity
                      onPress={() => handleCategorySelect(null)}
                      style={[s.chip, categoryId === null && { backgroundColor: accent, borderColor: 'transparent' }]}
                    >
                      <Text style={[s.chipText, categoryId === null && { color: '#fff' }]}>
                        Bez kategorie
                      </Text>
                    </TouchableOpacity>
                    {categories.map(cat => {
                      const catColor = resolveCategoryColorHex(cat.color);
                      const selected = categoryId === cat.id;
                      return (
                        <TouchableOpacity
                          key={cat.id}
                          onPress={() => handleCategorySelect(cat.id)}
                          style={[
                            s.chip,
                            selected && { backgroundColor: catColor, borderColor: 'transparent' },
                          ]}
                        >
                          <Text style={[s.chipText, selected && { color: '#fff' }]}>
                            {cat.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              )}

              <Text style={s.fieldLabel}>SPORT</Text>
              <View style={s.chipRow}>
                {SPORTS.map(sp => (
                  <TouchableOpacity key={sp.value} onPress={() => setSport(sp.value)}
                    style={[s.chip, sport === sp.value && { backgroundColor: SPORT_COLORS[sp.value] ?? W.orange, borderColor: 'transparent' }]}>
                    <Text style={[s.chipText, sport === sp.value && { color: '#fff' }]}>
                      {sp.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={s.fieldLabel}>POVRCH</Text>
              <View style={s.chipRow}>
                {SURFACES.map(sf => (
                  <TouchableOpacity key={sf.value} onPress={() => setSurface(sf.value)}
                    style={[s.chip, surface === sf.value && { backgroundColor: accent, borderColor: 'transparent' }]}>
                    <Text style={[s.chipText, surface === sf.value && { color: '#fff' }]}>
                      {sf.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={s.switchRow}>
                <Text style={s.switchLabel}>Krytý kurt (hala)</Text>
                <Switch
                  value={isIndoor}
                  onValueChange={setIsIndoor}
                  trackColor={{ true: accent }}
                  thumbColor="#fff"
                />
              </View>

              <Text style={s.fieldLabel}>MAX. POČET HRÁČŮ</Text>
              <View style={s.stepperRow}>
                <TouchableOpacity onPress={() => setCapacity(c => Math.max(1, c - 1))}
                  style={[s.stepperBtn, { backgroundColor: accent }]}>
                  <Text style={s.stepperBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={s.stepperValue}>{capacity}</Text>
                <TouchableOpacity onPress={() => setCapacity(c => c + 1)}
                  style={[s.stepperBtn, { backgroundColor: accent }]}>
                  <Text style={s.stepperBtnText}>+</Text>
                </TouchableOpacity>
              </View>

              {!isCreate && (
              <View style={s.courtClosureSection}>
                <Text style={s.fieldLabel}>DOČASNÉ UZAVŘENÍ</Text>
                <Text style={s.courtClosureHint}>
                  Kurt bude v zvoleném období nedostupný pro rezervace. Ostatní kurty zůstanou otevřené.
                </Text>
                {courtClosures.length > 0 && (
                  <View style={s.closurePeriodList}>
                    {courtClosures.map(p => (
                      <View key={p.id} style={s.closurePeriodRow}>
                        <View style={{ flex: 1 }}>
                          <View style={s.exceptionTypeRow}>
                            <Ionicons name="lock-closed" size={14} color={W.red} />
                            <Text style={s.closurePeriodDates}>
                              {fmtDateKey(p.fromDate)}{p.fromDate !== p.toDate ? ` · ${fmtDateKey(p.toDate)}` : ''}
                              {' · '}{formatCourtClosureType(p)}
                            </Text>
                          </View>
                          {p.note ? (
                            <Text style={s.courtClosureNote}>{p.note}</Text>
                          ) : null}
                        </View>
                        <TouchableOpacity
                          onPress={() => removeCourtClosure(p.id)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons name="trash-outline" size={18} color={W.red} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
                <TouchableOpacity
                  onPress={() => setClosureModalVisible(true)}
                  style={[s.closureAddBtn, { borderColor: W.red }]}
                  activeOpacity={0.8}
                >
                  <Ionicons name="lock-closed-outline" size={16} color={W.red} />
                  <Text style={[s.closureAddBtnText, { color: W.red }]}>Uzavřít kurt</Text>
                </TouchableOpacity>
              </View>
              )}

              <TouchableOpacity
                onPress={handleSave}
                style={[
                  s.saveBtn,
                  { backgroundColor: accent },
                  !nameValid && s.saveBtnDisabled,
                ]}
                disabled={!nameValid}
              >
                <Text style={s.saveBtnText}>
                  {isCreate ? 'VYTVOŘIT KURT' : 'ULOŽIT ZMĚNY'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} style={s.cancelModalBtn}>
                <Text style={s.cancelModalText}>Zrušit</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>

      {!isCreate && court && (
      <ClosureExceptionModal
        visible={closureModalVisible}
        settings={settings}
        bookings={bookings}
        onClose={() => setClosureModalVisible(false)}
        onAddClosure={addCourtClosure}
        onApplyDayOverrides={() => {}}
        fixedCourtId={court.id}
        fixedCourtName={court.name}
      />
      )}
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: NASTAVENÍ
// ═══════════════════════════════════════════════════════════════════════════════

const LOCK_OPTIONS = [0, 1, 2, 4, 8, 12, 24, 48, 72];
const MIN_DURATION_OPTIONS = [30, 60, 90, 120, 150, 180] as const;
const SLOT_OPTIONS = ALL_SLOTS; // 0–29

function SettingsTab({ hook }: { hook: ReturnType<typeof useClubBookings> }) {
  const {
    settings, updateSettings, updateSeason, courts, bookings,
    setDayOverride, clearDayOverride, setCategoryDayOverride, clearCategoryDayOverride,
    updateCategoryPricing, updateCategoryOpeningSchedule,
  } = hook;
  const [closureModalVisible, setClosureModalVisible] = useState(false);
  const [closuresExpanded, setClosuresExpanded] = useState(false);
  const [editDayOverrideKey, setEditDayOverrideKey] = useState<string | null>(null);
  const [editCategoryOverride, setEditCategoryOverride] = useState<{ categoryId: string; dateKey: string } | null>(null);
  const [openingModalVisible, setOpeningModalVisible] = useState(false);
  const [openingCategoryId, setOpeningCategoryId] = useState<string | null>(null);
  const [pricingModalVisible, setPricingModalVisible] = useState(false);
  const [pricingCategoryId, setPricingCategoryId] = useState<string | null>(null);
  const [earlyCloseError, setEarlyCloseError] = useState<string | null>(null);
  const [seasonFilter, setSeasonFilter] = useState<string | null>(() =>
    getActiveCalendarSeason(hook.settings.seasons ?? [], localDateKey())?.id ?? null,
  );

  const todayKey = localDateKey();
  const todayHours = getDayHoursForDate(todayKey, settings);
  const uncategorized = useMemo(
    () => getUncategorizedCourts(courts, settings),
    [courts, settings.categories],
  );
  const filteredCategories = useMemo(
    () => settings.seasonalModeEnabled
      ? filterCategoriesBySeason(settings.categories, seasonFilter)
      : settings.categories,
    [settings.categories, settings.seasonalModeEnabled, seasonFilter],
  );
  const selectedFilterSeason = useMemo(
    () => (seasonFilter ? settings.seasons?.find(s => s.id === seasonFilter) : undefined),
    [settings.seasons, seasonFilter],
  );

  const dayOverrideKeys = useMemo(
    () => Object.keys(settings.dayOverrides ?? {})
      .filter(k => hasDayHoursOverride(k, settings))
      .sort(),
    [settings],
  );

  const categoryOverrideEntries = useMemo(() => {
    const entries: { categoryId: string; dateKey: string }[] = [];
    for (const [categoryId, dates] of Object.entries(settings.categoryDayOverrides ?? {})) {
      for (const dateKey of Object.keys(dates)) {
        if (hasCategoryDayHoursOverride(categoryId, dateKey, settings)) {
          entries.push({ categoryId, dateKey });
        }
      }
    }
    return entries.sort((a, b) => a.dateKey.localeCompare(b.dateKey));
  }, [settings]);

  const clubAndCategoryClosures = useMemo(
    () => settings.closurePeriods.filter(p => !p.courtId),
    [settings.closurePeriods],
  );

  function trySetSeasonClosed(seasonId: string, isClosed: boolean) {
    if (!isClosed) {
      updateSeason(seasonId, { is_closed: false });
      return;
    }
    const conflicts = findFutureBookingsForClosedSeason(bookings, settings, seasonId);
    if (conflicts.length > 0) {
      Alert.alert(
        'Existující rezervace',
        `${conflicts.length} budoucích potvrzených rezervací v období této sezóny. Opravdu označit sezónu jako uzavřenou?`,
        [
          { text: 'Zrušit', style: 'cancel' },
          {
            text: 'Uzavřít sezónu',
            style: 'destructive',
            onPress: () => updateSeason(seasonId, { is_closed: true }),
          },
        ],
      );
      return;
    }
    updateSeason(seasonId, { is_closed: true });
  }

  function tryApplyEarlyClose(updates: {
    earlyCloseEnabled?: boolean;
    earlyCloseSlot?: number;
    earlyCloseNote?: string;
  }) {
    if (updates.earlyCloseEnabled === false && settings.earlyCloseEnabled) {
      setEarlyCloseError(null);
      updateSettings({
        earlyCloseEnabled: false,
        earlyCloseSlot: defaultEarlyCloseSlot(todayKey, settings),
      });
      return;
    }

    if (
      updates.earlyCloseNote !== undefined
      && updates.earlyCloseEnabled === undefined
      && updates.earlyCloseSlot === undefined
    ) {
      setEarlyCloseError(null);
      updateSettings(updates);
      return;
    }

    const nextEnabled = updates.earlyCloseEnabled ?? settings.earlyCloseEnabled;
    let nextSlot = updates.earlyCloseSlot ?? settings.earlyCloseSlot;

    if (updates.earlyCloseEnabled === true && !settings.earlyCloseEnabled) {
      const valid = findValidEarlyCloseSlot(bookings, settings, nextSlot);
      if (valid === null) {
        setEarlyCloseError('Nelze zapnout — všechny sloty od zavírací doby mají rezervace.');
        return;
      }
      nextSlot = valid;
    }

    if (nextEnabled) {
      const check = canApplyEarlyClose(bookings, settings, nextSlot);
      if (!check.ok) {
        setEarlyCloseError(formatEarlyCloseConflict(check.booking));
        if (updates.earlyCloseEnabled && !settings.earlyCloseEnabled) return;
        if (updates.earlyCloseSlot !== undefined) return;
      }
    }

    setEarlyCloseError(null);
    updateSettings({
      ...updates,
      ...(updates.earlyCloseSlot !== undefined || updates.earlyCloseEnabled === true
        ? { earlyCloseSlot: nextSlot }
        : {}),
    });
  }

  function addClosurePeriod(period: Omit<ClubClosurePeriod, 'id'>) {
    const id = `closure_${Date.now()}`;
    updateSettings({
      closurePeriods: [...settings.closurePeriods, { ...period, id }],
    });
  }

  function removeClosurePeriod(id: string) {
    updateSettings({
      closurePeriods: settings.closurePeriods.filter(p => p.id !== id),
    });
  }

  function updateClosurePeriod(id: string, updates: Partial<ClubClosurePeriod>) {
    updateSettings({
      closurePeriods: settings.closurePeriods.map(p => {
        if (p.id !== id) return p;
        const next = { ...p, ...updates };
        if ('note' in updates) {
          const trimmed = updates.note?.trim();
          if (trimmed) next.note = trimmed;
          else delete next.note;
        }
        return next;
      }),
    });
  }

  function applyDayOverrides(entries: Record<string, DayHoursPartialOverride | null>) {
    const next = { ...(settings.dayOverrides ?? {}) };
    for (const [key, val] of Object.entries(entries)) {
      if (val === null) delete next[key];
      else next[key] = val;
    }
    updateSettings({ dayOverrides: next });
  }

  function tryClearDayOverride(dateKey: string) {
    const conflicts = getBookingConflictsForClearingDayOverride(dateKey, bookings, settings);
    if (conflicts.length > 0) {
      Alert.alert('Nelze smazat výjimku', formatBookingConflictMessage(conflicts));
      return;
    }
    clearDayOverride(dateKey);
  }

  function applyCategoryDayOverrides(
    categoryId: string,
    entries: Record<string, DayHoursPartialOverride | null>,
  ) {
    const current = settings.categoryDayOverrides?.[categoryId] ?? {};
    const next = { ...current };
    for (const [key, val] of Object.entries(entries)) {
      if (val === null) delete next[key];
      else next[key] = val;
    }
    updateSettings({
      categoryDayOverrides: {
        ...settings.categoryDayOverrides,
        [categoryId]: next,
      },
    });
  }

  function tryClearCategoryDayOverride(categoryId: string, dateKey: string) {
    const conflicts = getBookingConflictsForClearingDayOverride(
      dateKey, bookings, settings, { categoryId },
    );
    if (conflicts.length > 0) {
      Alert.alert('Nelze smazat výjimku', formatBookingConflictMessage(conflicts));
      return;
    }
    clearCategoryDayOverride(categoryId, dateKey);
  }

  return (
    <ScrollView contentContainerStyle={s.settingsList}>
      <Text style={s.sectionTitle}>NASTAVENÍ KLUBU</Text>

      {/* Předčasné uzavření dnes */}
      <View style={s.settingCard}>
        <View style={[s.settingCardBar, { backgroundColor: W.red }]} />
        <View style={s.settingCardBody}>
          <View style={s.settingSwitchRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.settingCardTitle}>Předčasné uzavření dnes</Text>
              <Text style={s.settingCardSub}>
                Od zvoleného času se dnes uzavírá před běžnou zavírací dobou.
                {' '}Nelze uzavřít, pokud v tomto čase už existuje rezervace.
              </Text>
            </View>
            <Switch
              value={settings.earlyCloseEnabled}
              onValueChange={(v) => tryApplyEarlyClose({ earlyCloseEnabled: v })}
              trackColor={{ false: colors.border, true: W.red }}
              thumbColor="#fff"
            />
          </View>
          {settings.earlyCloseEnabled && (
            <>
              <Text style={s.openingLabel}>UZAVŘENO OD</Text>
              <View style={s.stepperRow}>
                <TouchableOpacity
                  onPress={() => tryApplyEarlyClose({
                    earlyCloseSlot: Math.max(todayHours.openingSlot + 1, settings.earlyCloseSlot - 1),
                  })}
                  style={[s.stepperBtn, { backgroundColor: W.red }]}>
                  <Text style={s.stepperBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={s.stepperValue}>{slotToTime(settings.earlyCloseSlot)}</Text>
                <TouchableOpacity
                  onPress={() => tryApplyEarlyClose({
                    earlyCloseSlot: Math.min(todayHours.closingSlot + 1, settings.earlyCloseSlot + 1),
                  })}
                  style={[s.stepperBtn, { backgroundColor: W.red }]}>
                  <Text style={s.stepperBtnText}>+</Text>
                </TouchableOpacity>
              </View>
              {earlyCloseError && (
                <Text style={s.earlyCloseError}>{earlyCloseError}</Text>
              )}
              <TextInput
                style={s.closureNoteInput}
                placeholder="Poznámka pro hráče (důvod uzavření)"
                placeholderTextColor={colors.textDisabled}
                value={settings.earlyCloseNote ?? ''}
                onChangeText={(t) => tryApplyEarlyClose({ earlyCloseNote: t })}
                multiline
              />
            </>
          )}
          {!settings.earlyCloseEnabled && earlyCloseError && (
            <Text style={s.earlyCloseError}>{earlyCloseError}</Text>
          )}
        </View>
      </View>

      {/* Uzavření v termínu */}
      <View style={s.settingCard}>
        <View style={[s.settingCardBar, { backgroundColor: '#6B7280' }]} />
        <View style={s.settingCardBody}>
          <TouchableOpacity
            onPress={() => setClosuresExpanded(v => !v)}
            style={s.closureExpandHeader}
            activeOpacity={0.7}
          >
            <View style={{ flex: 1 }}>
              <Text style={s.settingCardTitle}>Uzavření a výjimky</Text>
              <Text style={s.settingCardSub}>
                Kompletní uzavření klubu nebo úprava otevírací doby pro konkrétní den či období.
              </Text>
            </View>
            <Ionicons
              name={closuresExpanded ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={colors.textMuted}
            />
          </TouchableOpacity>
          {closuresExpanded && (
            <>
              {clubAndCategoryClosures.length > 0 && (
                <View style={s.closurePeriodList}>
                  <Text style={s.openingLabel}>UZAVŘENÉ TERMÍNY</Text>
                  {clubAndCategoryClosures.map(p => (
                    <View key={p.id} style={s.closurePeriodRow}>
                      <View style={{ flex: 1 }}>
                        <View style={s.exceptionTypeRow}>
                          <Ionicons name="lock-closed" size={14} color={W.red} />
                          <Text style={s.closurePeriodDates}>
                            {fmtDateKey(p.fromDate)}{p.fromDate !== p.toDate ? ` – ${fmtDateKey(p.toDate)}` : ''}
                            {p.categoryId
                              ? ` · ${getCategoryById(settings, p.categoryId)?.name ?? 'Kategorie'}`
                              : ' · Celý klub'}
                          </Text>
                        </View>
                        <TextInput
                          style={s.closurePeriodNoteInput}
                          placeholder="Vlastní poznámka pro hráče (volitelné)"
                          placeholderTextColor={colors.textDisabled}
                          value={p.note ?? ''}
                          onChangeText={(t) => updateClosurePeriod(p.id, { note: t })}
                          multiline
                        />
                      </View>
                      <TouchableOpacity
                        onPress={() => removeClosurePeriod(p.id)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="trash-outline" size={18} color={W.red} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
              {categoryOverrideEntries.length > 0 && (
                <View style={s.closurePeriodList}>
                  <Text style={s.openingLabel}>VÝJIMKY PRO KATEGORIE</Text>
                  {categoryOverrideEntries.map(({ categoryId, dateKey }) => (
                    <View key={`${categoryId}-${dateKey}`} style={s.closurePeriodRow}>
                      <TouchableOpacity
                        style={{ flex: 1 }}
                        onPress={() => setEditCategoryOverride({ categoryId, dateKey })}
                        activeOpacity={0.7}
                      >
                        <View style={s.exceptionTypeRow}>
                          <Ionicons name="layers-outline" size={14} color="#6366F1" />
                          <Text style={s.closurePeriodDates}>
                            {fmtDateKey(dateKey)} · {getCategoryById(settings, categoryId)?.name}
                          </Text>
                        </View>
                        <Text style={s.dayOverrideHours}>
                          {formatDayHours(getDayHoursForCourt(
                            getCategoryById(settings, categoryId)?.court_ids[0] ?? '',
                            dateKey,
                            settings,
                          ))}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => tryClearCategoryDayOverride(categoryId, dateKey)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="trash-outline" size={18} color={W.red} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
              {dayOverrideKeys.length > 0 && (
                <View style={s.closurePeriodList}>
                  <Text style={s.openingLabel}>VÝJIMKY PROVOZNÍ DOBY</Text>
                  {dayOverrideKeys.map(dateKey => (
                    <View key={dateKey} style={s.closurePeriodRow}>
                      <TouchableOpacity
                        style={{ flex: 1 }}
                        onPress={() => setEditDayOverrideKey(dateKey)}
                        activeOpacity={0.7}
                      >
                        <View style={s.exceptionTypeRow}>
                          <Ionicons name="time-outline" size={14} color={W.orange} />
                          <Text style={s.closurePeriodDates}>{fmtDateKey(dateKey)}</Text>
                        </View>
                        <Text style={s.dayOverrideHours}>
                          {formatDayHours(getDayHoursForDate(dateKey, settings))}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => tryClearDayOverride(dateKey)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="trash-outline" size={18} color={W.red} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
              <TouchableOpacity
                onPress={() => setClosureModalVisible(true)}
                style={s.closureAddBtn}
                activeOpacity={0.8}
              >
                <Ionicons name="calendar-outline" size={16} color={W.orange} />
                <Text style={s.closureAddBtnText}>Přidat uzavření nebo výjimku</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      <ClosureExceptionModal
        visible={closureModalVisible}
        settings={settings}
        bookings={bookings}
        onClose={() => setClosureModalVisible(false)}
        onAddClosure={addClosurePeriod}
        onApplyDayOverrides={applyDayOverrides}
        onApplyCategoryDayOverrides={applyCategoryDayOverrides}
      />

      {editDayOverrideKey && (
        <DayHoursOverrideModal
          visible={!!editDayOverrideKey}
          dateKey={editDayOverrideKey}
          settings={settings}
          bookings={bookings}
          onClose={() => setEditDayOverrideKey(null)}
          onSave={(partial) => {
            if (partial) setDayOverride(editDayOverrideKey, partial);
            else clearDayOverride(editDayOverrideKey);
          }}
        />
      )}

      {editCategoryOverride && (
        <DayHoursOverrideModal
          visible
          dateKey={editCategoryOverride.dateKey}
          categoryId={editCategoryOverride.categoryId}
          settings={settings}
          bookings={bookings}
          onClose={() => setEditCategoryOverride(null)}
          onSave={(partial) => {
            const { categoryId, dateKey } = editCategoryOverride;
            if (partial) setCategoryDayOverride(categoryId, dateKey, partial);
            else clearCategoryDayOverride(categoryId, dateKey);
          }}
        />
      )}

      <Text style={s.sectionTitle}>REZERVACE A ÚPRAVY HRÁČE</Text>

      {/* Editační zámek */}
      <View style={s.settingCard}>
        <View style={[s.settingCardBar, { backgroundColor: W.orange }]} />
        <View style={s.settingCardBody}>
          <Text style={s.settingCardTitle}>Editační zámek hráče</Text>
          <Text style={s.settingCardSub}>
            Hráč nemůže upravit rezervaci méně než{' '}
            <Text style={{ fontWeight: '900' }}>{settings.editLockHours} hodin</Text>
            {' '}před jejím začátkem.
          </Text>
          <View style={s.stepperRow}>
            <TouchableOpacity
              onPress={() => {
                const idx = LOCK_OPTIONS.indexOf(settings.editLockHours);
                if (idx > 0) updateSettings({ editLockHours: LOCK_OPTIONS[idx - 1] });
              }}
              style={[s.stepperBtn, { backgroundColor: W.orange }]}>
              <Text style={s.stepperBtnText}>−</Text>
            </TouchableOpacity>
            <Text style={s.stepperValue}>{settings.editLockHours} h</Text>
            <TouchableOpacity
              onPress={() => {
                const idx = LOCK_OPTIONS.indexOf(settings.editLockHours);
                if (idx < LOCK_OPTIONS.length - 1) updateSettings({ editLockHours: LOCK_OPTIONS[idx + 1] });
              }}
              style={[s.stepperBtn, { backgroundColor: W.orange }]}>
              <Text style={s.stepperBtnText}>+</Text>
            </TouchableOpacity>
          </View>
          <View style={s.lockOptionsRow}>
            {LOCK_OPTIONS.map(h => (
              <TouchableOpacity key={h} onPress={() => updateSettings({ editLockHours: h })}
                style={[s.lockChip, settings.editLockHours === h && { backgroundColor: W.orange }]}>
                <Text style={[s.lockChipText, settings.editLockHours === h && { color: '#fff' }]}>
                  {h === 0 ? 'Vždy' : `${h}h`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Rezervace dopředu */}
      <View style={s.settingCard}>
        <View style={[s.settingCardBar, { backgroundColor: colors.success }]} />
        <View style={s.settingCardBody}>
          <Text style={s.settingCardTitle}>Rezervace dopředu</Text>
          <Text style={s.settingCardSub}>
            Hráč může rezervovat nejvýše{' '}
            <Text style={{ fontWeight: '900' }}>{settings.maxBookingDaysAhead} dní</Text>
            {' '}dopředu.
          </Text>
          <View style={s.stepperRow}>
            <TouchableOpacity
              onPress={() => updateSettings({ maxBookingDaysAhead: Math.max(1, settings.maxBookingDaysAhead - 1) })}
              style={[s.stepperBtn, { backgroundColor: colors.success }]}>
              <Text style={s.stepperBtnText}>−</Text>
            </TouchableOpacity>
            <Text style={s.stepperValue}>{settings.maxBookingDaysAhead} d</Text>
            <TouchableOpacity
              onPress={() => updateSettings({ maxBookingDaysAhead: Math.min(365, settings.maxBookingDaysAhead + 1) })}
              style={[s.stepperBtn, { backgroundColor: colors.success }]}>
              <Text style={s.stepperBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Minimální doba rezervace */}
      <View style={s.settingCard}>
        <View style={[s.settingCardBar, { backgroundColor: W.amber }]} />
        <View style={s.settingCardBody}>
          <Text style={s.settingCardTitle}>Minimální doba rezervace</Text>
          <Text style={s.settingCardSub}>
            Rezervace musí trvat alespoň{' '}
            <Text style={{ fontWeight: '900' }}>{settings.minBookingDurationMinutes} min</Text>.
          </Text>
          <View style={s.stepperRow}>
            <TouchableOpacity
              onPress={() => {
                const idx = MIN_DURATION_OPTIONS.indexOf(
                  settings.minBookingDurationMinutes as typeof MIN_DURATION_OPTIONS[number],
                );
                const safeIdx = idx >= 0 ? idx : MIN_DURATION_OPTIONS.indexOf(60);
                if (safeIdx > 0) updateSettings({ minBookingDurationMinutes: MIN_DURATION_OPTIONS[safeIdx - 1] });
              }}
              style={[s.stepperBtn, { backgroundColor: W.amber }]}>
              <Text style={s.stepperBtnText}>−</Text>
            </TouchableOpacity>
            <Text style={s.stepperValue}>{settings.minBookingDurationMinutes} min</Text>
            <TouchableOpacity
              onPress={() => {
                const idx = MIN_DURATION_OPTIONS.indexOf(
                  settings.minBookingDurationMinutes as typeof MIN_DURATION_OPTIONS[number],
                );
                const safeIdx = idx >= 0 ? idx : MIN_DURATION_OPTIONS.indexOf(60);
                if (safeIdx < MIN_DURATION_OPTIONS.length - 1) {
                  updateSettings({ minBookingDurationMinutes: MIN_DURATION_OPTIONS[safeIdx + 1] });
                }
              }}
              style={[s.stepperBtn, { backgroundColor: W.amber }]}>
              <Text style={s.stepperBtnText}>+</Text>
            </TouchableOpacity>
          </View>
          <View style={s.lockOptionsRow}>
            {MIN_DURATION_OPTIONS.map(mins => (
              <TouchableOpacity
                key={mins}
                onPress={() => updateSettings({ minBookingDurationMinutes: mins })}
                style={[s.lockChip, settings.minBookingDurationMinutes === mins && { backgroundColor: W.amber }]}>
                <Text style={[s.lockChipText, settings.minBookingDurationMinutes === mins && { color: '#fff' }]}>
                  {mins}m
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Sezónnost */}
      <View style={s.settingCard}>
        <View style={[s.settingCardBar, { backgroundColor: '#0EA5E9' }]} />
        <View style={s.settingCardBody}>
          <View style={s.settingSwitchRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.settingCardTitle}>Sezónní režim</Text>
              <Text style={s.settingCardSub}>
                Oddělená provozní doba a ceník pro léto/zimu, období podle data
                a sezónní nastavení jednotlivých kurtů.
              </Text>
            </View>
            <Switch
              value={settings.seasonalModeEnabled}
              onValueChange={(v) => updateSettings(
                v ? patchForEnableSeasonalMode(settings) : patchForDisableSeasonalMode(settings),
              )}
              trackColor={{ false: colors.border, true: '#0EA5E9' }}
              thumbColor="#fff"
            />
          </View>

          {settings.seasonalModeEnabled && (
            <>
              <View style={s.settingSwitchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.settingCardTitle}>Automaticky podle data</Text>
                  <Text style={s.settingCardSub}>
                    Sezóna se přepíná sama podle období níže (bez ručního přepínače).
                  </Text>
                </View>
                <Switch
                  value={settings.autoSeasonByDate}
                  onValueChange={(v) => updateSettings({ autoSeasonByDate: v })}
                  trackColor={{ false: colors.border, true: '#0EA5E9' }}
                  thumbColor="#fff"
                />
              </View>

              <SeasonPeriodEditor
                label="LÉTO"
                accent="#F59E0B"
                period={settings.seasonPeriods.summer}
                onChange={(summer) => updateSettings({
                  seasonPeriods: { ...settings.seasonPeriods, summer },
                })}
              />
              <SeasonPeriodEditor
                label="ZIMA"
                accent="#6366F1"
                period={settings.seasonPeriods.winter}
                onChange={(winter) => updateSettings({
                  seasonPeriods: { ...settings.seasonPeriods, winter },
                })}
              />

              {!settings.autoSeasonByDate && (
                <>
                  <Text style={s.openingLabel}>AKTIVNÍ SEZÓNA</Text>
                  <View style={s.seasonRow}>
                    {SEASON_IDS.map(id => {
                      const active = settings.activeSeason === id;
                      const profile = settings.seasonPresets[id];
                      return (
                        <TouchableOpacity
                          key={id}
                          onPress={() => updateSettings(patchForSwitchSeason(settings, id))}
                          activeOpacity={0.85}
                          style={[s.seasonChip, active && s.seasonChipActive]}
                        >
                          <Ionicons
                            name={id === 'summer' ? 'sunny' : 'snow'}
                            size={22}
                            color={active ? '#fff' : (id === 'summer' ? '#F59E0B' : '#6366F1')}
                          />
                          <Text style={[s.seasonChipTitle, active && s.seasonChipTitleActive]}>
                            {SEASON_LABELS[id]}
                          </Text>
                          {active && (
                            <Text style={s.seasonChipActiveLabel}>AKTIVNÍ</Text>
                          )}
                          <Text style={[s.seasonChipSub, active && s.seasonChipSubActive]}>
                            {formatSeasonProfileSummary(profile)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              )}

              {settings.autoSeasonByDate && (
                <Text style={s.seasonHint}>
                  Dnes platí sezóna{' '}
                  <Text style={{ fontWeight: '900' }}>
                    {SEASON_LABELS[getEffectiveSeasonId(todayKey, settings)]}
                  </Text>
                  . Provoz a ceník níže upravujete pro obě sezóny v presetech klubu.
                </Text>
              )}

              {!settings.autoSeasonByDate && (
                <Text style={s.seasonHint}>
                  Provozní dobu a ceník níže upravujete pro sezónu{' '}
                  <Text style={{ fontWeight: '900' }}>{SEASON_LABELS[settings.activeSeason]}</Text>.
                  Parametry kategorií nastavíte v sekci níže.
                </Text>
              )}

              {(settings.seasons?.length ?? 0) > 0 && (
                <>
                  <Text style={[s.openingLabel, { marginTop: 12 }]}>KALENDÁŘNÍ SEZÓNY</Text>
                  <Text style={s.settingCardSub}>
                    Kurty v kategoriích přiřazených k sezóně nelze rezervovat, pokud je sezóna uzavřena.
                  </Text>
                  {settings.seasons.map(season => (
                    <View key={season.id} style={s.calendarSeasonRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.closurePeriodDates}>{season.name}</Text>
                        <Text style={s.dayOverrideHours}>{formatSeasonDates(season)}</Text>
                        {season.is_closed && (
                          <Text style={s.calendarSeasonClosedHint}>Sezóna uzavřena</Text>
                        )}
                      </View>
                      <View style={s.calendarSeasonSwitch}>
                        <Text style={s.calendarSeasonSwitchLabel}>Zavřeno</Text>
                        <Switch
                          value={season.is_closed === true}
                          onValueChange={(v) => trySetSeasonClosed(season.id, v)}
                          trackColor={{ false: colors.border, true: W.red }}
                          thumbColor="#fff"
                        />
                      </View>
                    </View>
                  ))}
                </>
              )}
            </>
          )}
        </View>
      </View>

      {/* Provoz a ceník kategorií */}
      <View style={s.settingCard}>
        <View style={[s.settingCardBar, { backgroundColor: '#6366F1' }]} />
        <View style={s.settingCardBody}>
          <Text style={s.settingCardTitle}>Provoz a ceník kategorií</Text>
          <Text style={s.settingCardSub}>
            Parametry nastavujete pro kategorie — kurty v nich dědí provozní dobu a ceník.
            Globální výchozí rozvrh platí jako fallback.
          </Text>

          {settings.seasonalModeEnabled && (settings.seasons?.length ?? 0) > 0 && (
            <>
              <Text style={s.openingLabel}>FILTR SEZÓNY</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.seasonFilterScroll}>
                <TouchableOpacity
                  onPress={() => setSeasonFilter(null)}
                  style={[s.seasonFilterChip, seasonFilter === null && s.seasonFilterChipActive]}
                >
                  <Text style={[s.seasonFilterText, seasonFilter === null && s.seasonFilterTextActive]}>
                    Všechny
                  </Text>
                </TouchableOpacity>
                {settings.seasons.map(season => {
                  const sel = seasonFilter === season.id;
                  const closed = isSeasonClosed(season);
                  return (
                    <TouchableOpacity
                      key={season.id}
                      onPress={() => setSeasonFilter(season.id)}
                      style={[
                        s.seasonFilterChip,
                        sel && s.seasonFilterChipActive,
                        closed && s.seasonFilterChipClosed,
                      ]}
                    >
                      <Text style={[
                        s.seasonFilterText,
                        sel && s.seasonFilterTextActive,
                        closed && !sel && s.seasonFilterTextClosed,
                      ]}>
                        {season.name}{closed ? ' · ZAVŘENO' : ''}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </>
          )}

          <Text style={s.openingLabel}>GLOBÁLNÍ VÝCHOZÍ PROVOZ</Text>
          <Text style={s.settingCardSub}>
            {formatDayHours(settings.openingSchedule.default)}
            {settings.openingSchedule.weekday
              ? ` · Po–Pá: ${formatDayHours(settings.openingSchedule.weekday)}` : ''}
            {settings.openingSchedule.weekend
              ? ` · So–Ne: ${formatDayHours(settings.openingSchedule.weekend)}` : ''}
          </Text>
          <TouchableOpacity
            onPress={() => { setOpeningCategoryId(null); setOpeningModalVisible(true); }}
            style={s.closureAddBtn}
            activeOpacity={0.8}
          >
            <Ionicons name="time-outline" size={16} color={W.amber} />
            <Text style={[s.closureAddBtnText, { color: W.amber }]}>Upravit provozní dobu</Text>
          </TouchableOpacity>

          {settings.seasonalModeEnabled && selectedFilterSeason && (
            <Text style={[s.seasonHint, { marginTop: 8, color: colors.textSecondary }]}>
              Upravujete provozní dobu pro sezónu: {selectedFilterSeason.name}
            </Text>
          )}

          {filteredCategories.length > 0 && (
            <>
              <Text style={[s.openingLabel, { marginTop: 12 }]}>KATEGORIE</Text>
              {filteredCategories.map(cat => {
                const catCourts = courtsInCategory(courts, cat.id, settings);
                const hasCustomSchedule = !!settings.categoryOpeningSchedule?.[cat.id];
                const schedule = getCategoryOpeningSchedule(settings, cat.id);
                const pricingRules = settings.categoryPricing?.[cat.id]?.rules.length ?? 0;
                const seasonName = getCategorySeasonLabel(settings, cat.season_id);
                return (
                  <View key={cat.id} style={s.categorySettingsRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.closurePeriodDates}>{cat.name}</Text>
                      <Text style={s.dayOverrideHours}>
                        {catCourts.length} {catCourts.length === 1 ? 'kurt' : catCourts.length < 5 ? 'kurty' : 'kurtů'}
                        {seasonName ? ` · ${seasonName}` : ''}
                      </Text>
                      <Text style={s.dayOverrideHours}>
                        Provoz: {hasCustomSchedule
                          ? formatDayHours(schedule.default)
                          : 'Globální výchozí'}
                        {' · '}Ceník: {pricingRules > 0 ? `${pricingRules} pravidel` : 'Nenastaveno'}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => { setOpeningCategoryId(cat.id); setOpeningModalVisible(true); }}
                      style={s.categorySettingsBtn}
                    >
                      <Ionicons name="time-outline" size={18} color={W.amber} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => { setPricingCategoryId(cat.id); setPricingModalVisible(true); }}
                      style={s.categorySettingsBtn}
                    >
                      <Ionicons name="pricetag-outline" size={18} color={W.orange} />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </>
          )}

          {settings.seasonalModeEnabled && filteredCategories.length === 0 && settings.categories.length > 0 && (
            <Text style={s.emptyCategoryHint}>Pro zvolenou sezónu nejsou žádné kategorie.</Text>
          )}

          {settings.categories.length === 0 && (
            <Text style={s.emptyCategoryHint}>
              Zatím nemáte kategorie — vytvořte je v záložce Kurty.
            </Text>
          )}

          {uncategorized.length > 0 && (
            <View style={s.uncategorizedWarning}>
              <Ionicons name="warning-outline" size={16} color={W.amber} />
              <View style={{ flex: 1 }}>
                <Text style={s.uncategorizedWarningTitle}>Nezařazené kurty</Text>
                <Text style={s.uncategorizedWarningText}>
                  {uncategorized.map(c => c.name).join(', ')} — používají globální nastavení.
                  Přiřaďte kategorii v záložce Kurty.
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>

      <OpeningHoursModal
        visible={openingModalVisible}
        settings={settings}
        categoryId={openingCategoryId ?? undefined}
        categoryName={openingCategoryId ? getCategoryById(settings, openingCategoryId)?.name : undefined}
        onClose={() => { setOpeningModalVisible(false); setOpeningCategoryId(null); }}
        onSave={(schedule, holidayTreatment) => {
          if (openingCategoryId) {
            updateCategoryOpeningSchedule(openingCategoryId, schedule);
          } else {
            updateSettings({
              openingSchedule: schedule,
              holidayTreatment,
              openingSlot: schedule.default.openingSlot,
              closingSlot: schedule.default.closingSlot,
            });
          }
          setOpeningModalVisible(false);
          setOpeningCategoryId(null);
        }}
      />

      <CourtPricingModal
        visible={pricingModalVisible}
        courts={courts}
        settings={settings}
        initialCategoryId={pricingCategoryId ?? undefined}
        categoryOnly
        onClose={() => { setPricingModalVisible(false); setPricingCategoryId(null); }}
        onSave={(pricing) => updateSettings({ pricing })}
        onSaveCategory={updateCategoryPricing}
      />

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

// ─── Styly ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgAlt },

  // Tab bar
  tabs: { flexDirection: 'row', backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 13, borderBottomWidth: 3, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: W.orange },
  tabText: { fontSize: 11, fontWeight: '800', color: colors.textMuted, letterSpacing: 1 },
  tabTextActive: { color: colors.textPrimary },

  // Week navigation bar
  weekNav: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border, paddingHorizontal: 4 },
  weekNavArrow: { padding: 12 },
  weekNavLabel: { flex: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, paddingVertical: 10 },
  weekNavText: { fontSize: 14, fontWeight: '800', color: colors.textPrimary, letterSpacing: 0.3 },
  weekNavBadge: { backgroundColor: W.orange, paddingHorizontal: 7, paddingVertical: 2 },
  weekNavBadgeText: { fontSize: 9, fontWeight: '900', color: '#fff', letterSpacing: 1 },
  todayBtn: { paddingHorizontal: 9, paddingVertical: 6, borderWidth: 1.5, borderColor: W.orange, marginHorizontal: 8, alignSelf: 'center' },
  todayBtnText: { fontSize: 9, fontWeight: '900', color: W.orange, letterSpacing: 1 },

  // Date picker
  datePicker: { backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  datePickerContent: { paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  dayChip: { alignItems: 'center', paddingHorizontal: 12, paddingVertical: 7, backgroundColor: colors.bgAlt, borderWidth: 1, borderColor: colors.border, minWidth: 50 },
  dayChipActive: { backgroundColor: W.orange, borderColor: W.orange },
  dayChipHoliday: { borderColor: W.amber, backgroundColor: '#FFFBEB' },
  holidayDot: {
    position: 'absolute', top: 4, right: 4,
    width: 6, height: 6, borderRadius: 3, backgroundColor: W.amber,
  },
  overrideDot: {
    position: 'absolute', bottom: 4, left: 4,
    width: 6, height: 6, borderRadius: 3, backgroundColor: W.orange,
  },
  overrideDotActive: { backgroundColor: '#fff' },
  dayHoursBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 8,
  },
  dayHoursInfo: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  dayHoursText: { fontSize: 13, fontWeight: '800', color: colors.textPrimary },
  dayHoursBadge: {
    backgroundColor: 'rgba(249,115,22,0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  dayHoursBadgeText: { fontSize: 8, fontWeight: '900', color: W.orange, letterSpacing: 0.8 },
  exceptionTypeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dayOverrideHours: { fontSize: 12, color: colors.textMuted, marginTop: 2, marginLeft: 20 },
  dayChipWD:    { fontSize: 9,  fontWeight: '800', color: colors.textMuted, letterSpacing: 1 },
  dayChipNum:   { fontSize: 17, fontWeight: '900', color: colors.textPrimary, lineHeight: 22 },
  dayChipMonth: { fontSize: 9,  color: colors.textMuted },

  // Legenda
  legend: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.surface, gap: 12, borderBottomWidth: 1, borderBottomColor: colors.border, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 10, height: 10 },
  legendText: { fontSize: 11, color: colors.textSecondary, fontWeight: '600' },
  legendCount: { marginLeft: 'auto', fontSize: 11, fontWeight: '700', color: colors.textMuted },

  // Timeline wrapper
  timelineWrapper: { flexDirection: 'row' },

  // Pevný sloupec s kurty
  courtNamesCol: { width: COL_W, backgroundColor: colors.surface, borderRightWidth: 1, borderRightColor: colors.border, zIndex: 5 },
  cornerCell: { height: HEADER_H, borderBottomWidth: 1, borderBottomColor: colors.border },
  courtNameCell: {
    height: ROW_H, flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingLeft: 6, paddingRight: 4, borderBottomWidth: 1, borderBottomColor: colors.border,
    borderLeftWidth: 3, borderLeftColor: 'transparent',
  },
  courtCategoryDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  courtNameText: { fontSize: 12, fontWeight: '800', color: colors.textPrimary },
  courtSportText: { fontSize: 10, color: colors.textMuted, marginTop: 2 },

  // Záhlaví s časem
  timeHeaderCell: { width: SLOT_W, height: HEADER_H, justifyContent: 'center', alignItems: 'flex-start', paddingLeft: 4, borderRightWidth: 1, borderRightColor: colors.border, borderBottomWidth: 1, borderBottomColor: colors.border },
  timeHeaderText: { fontSize: 10, fontWeight: '700', color: colors.textMuted },

  // Mřížka
  gridVLine:    { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: colors.border },
  gridHLine:    { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: colors.border },
  closedOverlay: { position: 'absolute', backgroundColor: 'rgba(0,0,0,0.04)' },
  closedZone: {
    position: 'absolute',
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(239,68,68,0.22)',
    zIndex: 1,
    overflow: 'hidden',
  },
  closedZoneGridV: {
    position: 'absolute', top: 0, bottom: 0, width: 1,
    backgroundColor: 'rgba(239,68,68,0.18)',
  },
  closedZoneLabelWrap: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closedZoneLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: 'rgba(185,28,28,0.8)',
    letterSpacing: 2,
  },
  earlyCloseError: {
    fontSize: 12,
    fontWeight: '700',
    color: W.red,
    marginTop: 8,
    lineHeight: 18,
  },
  fullCloseOverlay: { position: 'absolute', left: 0, right: 0, backgroundColor: 'rgba(107,114,128,0.15)', zIndex: 2 },

  closureBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    backgroundColor: '#FEE2E2', borderBottomWidth: 1, borderBottomColor: '#FECACA',
  },
  closureBannerTitle: { fontSize: 13, fontWeight: '900', color: W.red },
  closureBannerText: { fontSize: 12, color: colors.textSecondary, lineHeight: 18 },

  holidayBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    backgroundColor: '#FFFBEB', borderBottomWidth: 1, borderBottomColor: '#FDE68A',
  },
  holidayBannerTitle: { fontSize: 13, fontWeight: '900', color: '#B45309' },
  holidayBannerText: { fontSize: 12, color: colors.textSecondary, lineHeight: 18 },

  seasonFilterBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    backgroundColor: '#FFFBEB', borderBottomWidth: 1, borderBottomColor: '#FDE68A',
  },
  seasonFilterBannerTitle: { fontSize: 13, fontWeight: '900', color: '#B45309' },
  seasonFilterBannerText: { fontSize: 12, color: colors.textSecondary, lineHeight: 18 },

  seasonClosedBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    backgroundColor: '#FEF2F2', borderBottomWidth: 1, borderBottomColor: '#FECACA',
  },
  seasonClosedBannerTitle: { fontSize: 13, fontWeight: '900', color: W.red },
  seasonClosedBannerText: { fontSize: 12, color: colors.textSecondary, lineHeight: 18 },

  calendarSeasonRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  calendarSeasonSwitch: { alignItems: 'center', gap: 4 },
  calendarSeasonSwitchLabel: { fontSize: 9, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.8 },
  calendarSeasonClosedHint: { fontSize: 11, fontWeight: '800', color: W.red, marginTop: 4 },

  categoryTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  closedSeasonBadge: {
    backgroundColor: '#FEE2E2', paddingHorizontal: 6, paddingVertical: 2,
    borderWidth: 1, borderColor: '#FECACA',
  },
  closedSeasonBadgeText: { fontSize: 8, fontWeight: '900', color: W.red, letterSpacing: 0.8 },

  seasonHint: {
    fontSize: 11, color: colors.textMuted, lineHeight: 17, marginTop: 4,
  },
  seasonRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  seasonChip: {
    flex: 1, padding: 12, borderWidth: 1.5, borderColor: colors.border,
    backgroundColor: colors.bgAlt, alignItems: 'center', gap: 4,
  },
  seasonChipActive: { borderColor: '#0EA5E9', backgroundColor: '#0EA5E9' },
  seasonChipTitle: { fontSize: 14, fontWeight: '900', color: colors.textPrimary },
  seasonChipTitleActive: { color: '#fff' },
  seasonChipActiveLabel: {
    fontSize: 8, fontWeight: '900', color: 'rgba(255,255,255,0.9)', letterSpacing: 1,
  },
  seasonChipSub: {
    fontSize: 10, color: colors.textMuted, textAlign: 'center', lineHeight: 14,
  },
  seasonChipSubActive: { color: 'rgba(255,255,255,0.85)' },

  settingSwitchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  closureExpandHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  closurePeriodList: { marginTop: 12, gap: 8 },
  closurePeriodRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 10, backgroundColor: colors.bgAlt, borderWidth: 1, borderColor: colors.border,
  },
  closurePeriodDates: { fontSize: 13, fontWeight: '800', color: colors.textPrimary },
  closurePeriodNote: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  closurePeriodNoteInput: {
    marginTop: 8,
    minHeight: 44,
    padding: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 12,
    color: colors.textPrimary,
    textAlignVertical: 'top',
  },
  closureNoteFieldLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.textMuted,
    letterSpacing: 1,
    marginTop: 12,
    marginBottom: 4,
  },
  closureNoteFieldHint: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 8,
    lineHeight: 16,
  },
  closureAddBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 12, paddingVertical: 12, paddingHorizontal: 14,
    borderWidth: 1.5, borderColor: W.orange, alignSelf: 'flex-start',
  },
  closureAddBtnText: { fontSize: 12, fontWeight: '800', color: W.orange, letterSpacing: 0.5 },
  courtClosureSection: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 8,
  },
  courtClosureHint: { fontSize: 12, color: colors.textMuted, lineHeight: 18 },
  courtClosureNote: { fontSize: 12, color: colors.textMuted, marginTop: 4, lineHeight: 16 },
  closureNoteInput: {
    marginTop: 12, minHeight: 56, padding: 12,
    backgroundColor: colors.bgAlt, borderWidth: 1, borderColor: colors.border,
    fontSize: 13, color: colors.textPrimary, textAlignVertical: 'top',
  },
  closureModalHint: {
    fontSize: 12, fontWeight: '700', color: colors.textSecondary,
    textAlign: 'center', paddingHorizontal: 16, paddingBottom: 8,
  },
  closureRangeStart: { borderTopLeftRadius: 6, borderBottomLeftRadius: 6 },
  closureRangeEnd: { borderTopRightRadius: 6, borderBottomRightRadius: 6 },
  closureModalActions: {
    flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16,
  },
  closureModalCancel: {
    flex: 1, paddingVertical: 12, alignItems: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  closureModalCancelText: { fontSize: 12, fontWeight: '800', color: colors.textMuted },
  closureModalAdd: {
    flex: 1, paddingVertical: 12, alignItems: 'center', backgroundColor: W.orange,
  },
  closureModalAddText: { fontSize: 12, fontWeight: '900', color: '#fff', letterSpacing: 0.5 },
  freeSlotCell:  { position: 'absolute', zIndex: 0, justifyContent: 'center', alignItems: 'center' },
  freeSlotBtn:   { flex: 1, width: '100%', justifyContent: 'center', alignItems: 'center' },
  dropTarget:   { position: 'absolute', backgroundColor: 'rgba(99,102,241,0.12)', borderWidth: 2, borderColor: 'rgba(99,102,241,0.4)', borderStyle: 'dashed' },

  // Rezervační blok
  bookingBlock: { position: 'absolute', overflow: 'visible' },
  bookingInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 5,
  },
  bookingTextCol: { flex: 1, minWidth: 0 },
  bookingName:  { fontSize: 11, fontWeight: '800', color: '#fff', lineHeight: 15 },
  bookingMeta:  { fontSize: 9,  color: 'rgba(255,255,255,0.85)', marginTop: 1 },
  unpaidAlertIconWrap: {
    position: 'relative',
    flexShrink: 0,
    marginLeft: 4,
    alignItems: 'center',
    ...(Platform.OS === 'web' ? { cursor: 'default' } as object : {}),
  },
  unpaidAlertTooltip: {
    position: 'absolute',
    bottom: '100%',
    marginBottom: 6,
    backgroundColor: '#1C1C1E',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    minWidth: 80,
    alignItems: 'center',
    zIndex: 20,
  },
  unpaidAlertTooltipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
    ...(Platform.OS === 'web' ? { whiteSpace: 'nowrap' } as object : {}),
  },
  bookingIconsCol: {
    position: 'absolute',
    top: 3,
    right: 3,
    zIndex: 10,
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
  },

  // Linka aktuálního času
  nowLine:       { position: 'absolute', top: 0, bottom: 0, width: 2, backgroundColor: '#EF4444', zIndex: 15, shadowColor: '#EF4444', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 3 },
  nowBubble:     { position: 'absolute', top: 2, backgroundColor: '#EF4444', paddingHorizontal: 4, paddingVertical: 2, zIndex: 16 },
  nowBubbleText: { fontSize: 9, fontWeight: '900', color: '#fff', letterSpacing: 0.5 },

  dragHint: { fontSize: 10, color: colors.textDisabled, textAlign: 'center', paddingVertical: 6, fontStyle: 'italic' },
  reorderHint: {
    fontSize: 10, color: colors.textDisabled, fontStyle: 'italic',
    paddingHorizontal: 16, paddingBottom: 10,
  },
  dragHandle: { paddingVertical: 4, paddingRight: 6 },
  dragHandleCourt: { paddingHorizontal: 8, paddingVertical: 14, justifyContent: 'center' },
  draggingBlock: {
    opacity: 0.92,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 8,
    elevation: 6,
  },
  draggingRow: {
    opacity: 0.88,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 4,
  },

  // Správa kurtů
  courtList: { paddingBottom: 24 },
  sectionTitle: { fontSize: 10, fontWeight: '900', color: colors.textMuted, letterSpacing: 1.5, paddingHorizontal: 16, paddingTop: 20, paddingBottom: 10 },
  courtRow: { flexDirection: 'row', backgroundColor: colors.surface, marginBottom: 3, alignItems: 'center' },
  courtRowBar: { width: 4, alignSelf: 'stretch' },
  courtRowInfo: { flex: 1, paddingHorizontal: 14, paddingVertical: 14, gap: 3 },
  courtRowName: { fontSize: 15, fontWeight: '800', color: colors.textPrimary },
  courtRowMeta: { fontSize: 12, color: colors.textSecondary },
  courtRowClub: { fontSize: 11, color: colors.textMuted },
  editIconBtn: { padding: 16 },
  courtsTabHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingRight: 16,
  },
  courtsTabHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  addCourtBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderColor: W.orange, backgroundColor: 'rgba(249,115,22,0.08)',
  },
  addCourtBtnText: { fontSize: 10, fontWeight: '800', color: W.orange, letterSpacing: 0.5 },
  addCategoryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderColor: '#6366F1', backgroundColor: 'rgba(99,102,241,0.08)',
  },
  addCategoryBtnText: { fontSize: 10, fontWeight: '800', color: '#6366F1', letterSpacing: 0.5 },
  courtsTabHint: {
    fontSize: 12, color: colors.textMuted, lineHeight: 18,
    paddingHorizontal: 16, paddingBottom: 8,
  },
  categoryBlock: { marginBottom: 12 },
  categoryHeader: { flexDirection: 'row', backgroundColor: colors.surface, marginBottom: 2 },
  categoryHeaderBar: { width: 4 },
  categoryHeaderBody: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 12, gap: 4,
  },
  categoryTitle: { fontSize: 14, fontWeight: '900', color: colors.textPrimary },
  categoryMeta: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  categoryActionBtn: { padding: 8 },
  emptyCategoryHint: {
    fontSize: 12, color: colors.textMuted, fontStyle: 'italic',
    paddingHorizontal: 16, paddingVertical: 8,
  },
  assignOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', padding: 24,
  },
  assignSheet: {
    backgroundColor: colors.surface, padding: 20,
    borderWidth: 1, borderColor: colors.border,
  },
  assignTitle: { fontSize: 12, fontWeight: '900', color: colors.textPrimary, letterSpacing: 1 },
  assignSub: { fontSize: 14, fontWeight: '800', color: colors.textPrimary, marginTop: 4, marginBottom: 12 },
  assignEmpty: { fontSize: 12, color: colors.textMuted, marginBottom: 12 },
  assignRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 12, paddingHorizontal: 12, marginBottom: 6,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bgAlt,
  },
  assignColorDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  assignRowName: { fontSize: 13, fontWeight: '800', color: colors.textPrimary },
  assignRowMeta: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  assignCancel: { marginTop: 8, alignItems: 'center', paddingVertical: 10 },
  assignCancelText: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
  uncategorizedBanner: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start',
    padding: 10, marginBottom: 8, backgroundColor: 'rgba(99,102,241,0.08)',
    borderWidth: 1, borderColor: 'rgba(99,102,241,0.25)',
  },
  uncategorizedBannerText: { flex: 1, fontSize: 11, color: colors.textSecondary, lineHeight: 16 },
  courtCreateCategoryHint: {
    fontSize: 11, color: colors.textMuted, lineHeight: 16, marginBottom: 8,
  },
  fieldInputError: { borderColor: W.red },
  saveBtnDisabled: { opacity: 0.45 },
  seasonFilterScroll: { marginBottom: 8 },
  seasonFilterChip: {
    paddingHorizontal: 12, paddingVertical: 8, marginRight: 8,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bgAlt,
  },
  seasonFilterChipActive: { borderColor: '#6366F1', backgroundColor: 'rgba(99,102,241,0.1)' },
  seasonFilterChipClosed: { borderColor: '#FECACA', backgroundColor: '#FEF2F2' },
  seasonFilterText: { fontSize: 11, fontWeight: '800', color: colors.textSecondary },
  seasonFilterTextActive: { color: '#6366F1' },
  seasonFilterTextClosed: { color: W.red },
  categorySettingsRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  categorySettingsBtn: { padding: 10 },
  uncategorizedWarning: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start',
    marginTop: 12, padding: 10, backgroundColor: '#FFFBEB',
    borderWidth: 1, borderColor: '#FDE68A',
  },
  uncategorizedWarningTitle: { fontSize: 12, fontWeight: '800', color: colors.textPrimary },
  uncategorizedWarningText: { fontSize: 11, color: colors.textSecondary, marginTop: 2, lineHeight: 16 },

  // Modal editace kurtu
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: colors.surface, maxHeight: '90%' },
  modalHandle: { width: 40, height: 4, backgroundColor: colors.border, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  modalBar: { height: 5 },
  modalBody: { padding: 20, gap: 6 },
  modalTitle: { fontSize: 12, fontWeight: '900', color: colors.textPrimary, letterSpacing: 1.5, marginBottom: 10 },
  fieldLabel: { fontSize: 10, fontWeight: '800', color: colors.textMuted, letterSpacing: 1, marginTop: 12 },
  fieldInput: { height: 48, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, fontSize: 15, color: colors.textPrimary, marginTop: 6 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bgAlt },
  chipText: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
  playerSelectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#16A34A',
    borderColor: 'transparent',
  },
  playerResultsList: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgAlt,
  },
  playerResultRow: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    minHeight: PLAYER_RESULT_ROW_H,
    justifyContent: 'center',
  },
  playerResultRowSelected: {
    backgroundColor: 'rgba(22,163,74,0.15)',
    borderLeftWidth: 3,
    borderLeftColor: '#16A34A',
  },
  playerResultName: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  playerResultNameSelected: { color: '#16A34A' },
  playerResultEmail: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  playerResultEmailSelected: { color: 'rgba(22,163,74,0.85)' },
  playerSearchEmpty: { fontSize: 13, color: colors.textMuted, marginTop: 10, fontStyle: 'italic' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  switchLabel: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 10 },
  stepperBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  stepperBtnText: { fontSize: 20, color: '#fff', fontWeight: '900', lineHeight: 24 },
  stepperValue: { fontSize: 18, fontWeight: '900', color: colors.textPrimary, minWidth: 64, textAlign: 'center' },
  saveBtn: { height: 56, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  saveBtnText: { fontSize: 13, fontWeight: '900', color: '#fff', letterSpacing: 1.5 },
  cancelModalBtn: { height: 48, alignItems: 'center', justifyContent: 'center' },
  cancelModalText: { fontSize: 14, color: colors.textMuted },

  // Nastavení
  settingsList: { padding: 0, paddingBottom: 32 },
  settingCard: { backgroundColor: colors.surface, marginBottom: 3, flexDirection: 'row', overflow: 'hidden' },
  settingCardBar: { width: 4 },
  settingCardBody: { flex: 1, padding: 16, gap: 6 },
  settingCardTitle: { fontSize: 15, fontWeight: '800', color: colors.textPrimary },
  settingCardSub: { fontSize: 12, color: colors.textMuted, lineHeight: 18 },
  lockOptionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  lockChip: { paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bgAlt },
  lockChipText: { fontSize: 11, fontWeight: '700', color: colors.textSecondary },
  openingRow: { flexDirection: 'row', gap: 24, marginTop: 8 },
  openingCol: { flex: 1 },
  openingLabel: { fontSize: 9, fontWeight: '800', color: colors.textMuted, letterSpacing: 1, marginBottom: 4 },

  // Detail rezervace (popup)
  detailOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  detailSheet: { backgroundColor: colors.surface, maxHeight: '80%' },
  detailHeader: { flexDirection: 'row', alignItems: 'flex-start', padding: 20, gap: 12 },
  detailPayBadge: { backgroundColor: 'rgba(255,255,255,0.25)', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, marginBottom: 8 },
  detailPayBadgeText: { fontSize: 10, fontWeight: '800', color: '#fff', letterSpacing: 0.8 },
  detailPlayerName: { fontSize: 22, fontWeight: '900', color: '#fff' },
  detailCloseBtn: { padding: 4, marginTop: -4 },
  detailRows: { paddingHorizontal: 16, paddingTop: 16, gap: 12 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  detailRowTouchable: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 4, marginBottom: 4,
  },
  detailRowLabel: { fontSize: 13, color: colors.textMuted, width: 64 },
  detailRowValue: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, flex: 1 },
  detailSectionLabel: { fontSize: 10, fontWeight: '900', color: colors.textMuted, letterSpacing: 1.5, paddingHorizontal: 16, paddingTop: 20, paddingBottom: 10 },
  detailPayRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, flexWrap: 'wrap' },
  detailPayChip: { paddingHorizontal: 12, paddingVertical: 8, borderWidth: 2 },
  detailPayChipText: { fontSize: 11, fontWeight: '800' },
  detailNoteRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingTop: 4 },
  detailNoteSection: { paddingHorizontal: 16, paddingBottom: 8 },
  detailNoteInput: { minHeight: 72, marginTop: 4 },
  detailNoteReadonly: {
    marginTop: 4, padding: 12, backgroundColor: colors.bgAlt,
    borderWidth: 1, borderColor: colors.border,
  },
  detailNoteSaveBtn: {
    marginTop: 10, height: 44, alignItems: 'center', justifyContent: 'center',
  },
  detailNoteSaveText: {
    fontSize: 12, fontWeight: '900', color: '#fff', letterSpacing: 1,
  },
  detailNoteText: { flex: 1, fontSize: 13, color: colors.textSecondary, lineHeight: 19, fontStyle: 'italic' },
  detailCancelBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, margin: 16, marginTop: 20, padding: 14, borderWidth: 1, borderColor: colors.error },
  detailUndoSection: { marginHorizontal: 16, marginTop: 16, gap: 8 },
  detailUndoBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderWidth: 1, borderColor: W.orange,
    backgroundColor: 'rgba(234,88,12,0.08)',
  },
  detailUndoTitle: { fontSize: 14, fontWeight: '800', color: W.orange },
  detailUndoSub: { fontSize: 12, color: colors.textMuted, lineHeight: 16 },
  undoHintBadge: {
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center', justifyContent: 'center',
  },
  detailCancelText: { fontSize: 13, fontWeight: '700', color: colors.error },
  detailConfirmCancel: { margin: 16, marginTop: 20, padding: 16, backgroundColor: '#FEE2E2', gap: 12 },
  detailConfirmText: { fontSize: 14, fontWeight: '700', color: colors.error },
  detailConfirmBtns: { flexDirection: 'row', gap: 10 },
  detailConfirmNo: { flex: 1, height: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  detailConfirmNoText: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
  detailConfirmYes: { flex: 2, height: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.error },
  detailConfirmYesText: { fontSize: 12, fontWeight: '900', color: '#fff', letterSpacing: 1 },
  detailPastNotice: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginTop: 20, padding: 14,
    backgroundColor: colors.bgAlt, borderWidth: 1, borderColor: colors.border,
  },
  detailPastNoticeText: { fontSize: 13, color: colors.textMuted, fontWeight: '600', flex: 1 },
  detailDateHint: { fontSize: 11, color: colors.textMuted, paddingHorizontal: 16, marginBottom: 8 },
  detailDatePickerContent: { paddingHorizontal: 16, gap: 8, paddingBottom: 4 },
  detailDayChip: {
    alignItems: 'center', paddingHorizontal: 12, paddingVertical: 7,
    backgroundColor: colors.bgAlt, borderWidth: 1, borderColor: colors.border, minWidth: 50,
  },
  detailDayChipActive: { backgroundColor: W.orange, borderColor: W.orange },
  detailDayChipWD:    { fontSize: 9,  fontWeight: '800', color: colors.textMuted, letterSpacing: 1 },
  detailDayChipNum:   { fontSize: 17, fontWeight: '900', color: colors.textPrimary, lineHeight: 22 },
  detailDayChipMonth: { fontSize: 9,  color: colors.textMuted },
  detailDateError: {
    fontSize: 12, color: colors.error, fontWeight: '600',
    paddingHorizontal: 16, paddingTop: 8,
  },
});

// ─── Styly kalendáře ──────────────────────────────────────────────────────────

const cal = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  sheet: {
    backgroundColor: colors.surface,
    width: '100%',
    maxWidth: 360,
    overflow: 'hidden',
  },
  topBar: {
    height: 4,
    backgroundColor: W.orange,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  navBtn: { padding: 4 },
  monthLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: 0.3,
  },
  dayLabelsRow: {
    flexDirection: 'row',
    paddingTop: 10,
    paddingBottom: 4,
  },
  dayLabelCell: {
    flex: 1,
    alignItems: 'center',
  },
  dayLabelText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.8,
  },
  gridRow: {
    flexDirection: 'row',
  },
  gridRowSelected: {
    backgroundColor: 'rgba(249,115,22,0.12)',
  },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCellActive: {
    backgroundColor: W.orange,
    borderRadius: 6,
  },
  dayCellLeft: {
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
  },
  dayCellRight: {
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
  },
  dayNum: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  dayNumFaded: {
    color: colors.textDisabled,
  },
  dayNumBeyond: {
    color: colors.textDisabled,
    opacity: 0.6,
  },
  beyondIcon: {
    position: 'absolute',
    bottom: 3,
  },
  dayNumSelected: {
    color: W.orange,
    fontWeight: '900',
  },
  dayNumActive: {
    color: '#fff',
    fontWeight: '900',
  },
  todayDot: {
    position: 'absolute',
    bottom: 5,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.textMuted,
  },
  todayDotSel: {
    backgroundColor: W.orange,
  },
  overrideDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: W.orange,
  },
  overrideDotSel: {
    backgroundColor: '#fff',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 13,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: 4,
  },
  footerText: {
    fontSize: 11,
    fontWeight: '900',
    color: colors.textMuted,
    letterSpacing: 1.5,
  },
});
